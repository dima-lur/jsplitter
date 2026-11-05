include('docs/Flags.js');
window.DrawMode = 1;
// Demonstrates an image-shader chain over the native waveform source.
// Click to switch between source-only rendering, accumulated feedback,
// glow post-processing and a second color/vignette post pass.
// The feedback and post shaders sample images from t0/s0, not audio PCM.
// Re-creating the visualization when switching modes resets its history.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const sourceShader = `
Texture2D<float> Waveform : register(t0);
cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
};
struct PSInput { float4 clipSpacePos:SV_POSITION; float4 sceneSpacePos:SCENE_POS; };
float4 main(PSInput p) : SV_Target {
    float2 sz = max(viewportSize, float2(1.0, 1.0));
    int count = max(1, (int)pointCount);
    int index = clamp((int)(p.sceneSpacePos.x / sz.x * count), 0, count - 1);
    float value = Waveform.Load(int3(index, 0, 0)).r;
    float targetY = (1.0 - value) * 0.5 * sz.y;
    float opacity = (1.0 - smoothstep(0.2, 1.8,
        abs(p.sceneSpacePos.y - targetY))) * saturate(abs(value) * 8.0);
    return float4(0.10, 0.85, 0.72, 1.0) * opacity; // Premultiplied; no silence floor.
}`;

const feedbackShader = `
Texture2D Previous : register(t0);
SamplerState InputSampler : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos:SV_POSITION;
    float4 sceneSpacePos:SCENE_POS;
    float4 texelSpacePos:TEXEL_POS;
};
float4 main(PSInput p) : SV_Target {
    float2 px = 1.0 / max(viewportSize, float2(1.0, 1.0));
    float2 uv = p.texelSpacePos.xy - float2(0.0, 0.7) * px * frameStep;
    if (any(uv < 0.0) || any(uv > 1.0)) return float4(0, 0, 0, 1);
    float3 prev = Previous.SampleLevel(InputSampler, uv, 0.0).rgb;
    return float4(prev * pow(0.94, frameStep), 1.0);
}`;

const glowShader = `
Texture2D Frame : register(t0);
SamplerState InputSampler : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos:SV_POSITION;
    float4 sceneSpacePos:SCENE_POS;
    float4 texelSpacePos:TEXEL_POS;
};
float4 main(PSInput p) : SV_Target {
    float2 uv = p.texelSpacePos.xy;
    float2 px = 2.0 / max(viewportSize, float2(1.0, 1.0));
    float3 core = Frame.SampleLevel(InputSampler, uv, 0.0).rgb;
    float3 halo = (
        Frame.SampleLevel(InputSampler, uv + float2(px.x, 0), 0).rgb +
        Frame.SampleLevel(InputSampler, uv - float2(px.x, 0), 0).rgb +
        Frame.SampleLevel(InputSampler, uv + float2(0, px.y), 0).rgb +
        Frame.SampleLevel(InputSampler, uv - float2(0, px.y), 0).rgb +
        Frame.SampleLevel(InputSampler, uv + px, 0).rgb +
        Frame.SampleLevel(InputSampler, uv - px, 0).rgb +
        Frame.SampleLevel(InputSampler, uv + float2(px.x, -px.y), 0).rgb +
        Frame.SampleLevel(InputSampler, uv + float2(-px.x, px.y), 0).rgb
    ) * 0.125;
    return float4(saturate(max(core, halo * 1.7)), 1.0);
}`;

const colorShader = `
Texture2D Frame : register(t0);
SamplerState InputSampler : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos:SV_POSITION;
    float4 sceneSpacePos:SCENE_POS;
    float4 texelSpacePos:TEXEL_POS;
};
float4 main(PSInput p) : SV_Target {
    float3 rgb = Frame.SampleLevel(InputSampler, p.texelSpacePos.xy, 0.0).rgb;
    float intensity = max(rgb.r, max(rgb.g, rgb.b));
    float2 q = (p.sceneSpacePos.xy - 0.5 * viewportSize) /
        max(viewportSize, float2(1.0, 1.0));
    float vignette = 1.0 - 0.55 * saturate(dot(q, q) * 2.0);
    return float4(saturate(float3(1.0, 0.20, 0.68) * intensity * vignette), 1.0);
}`;

const labels = [
    "0: source only (cyan)",
    "1: source + feedback (trails)",
    "2: feedback + glow (wide halos)",
    "3: feedback + glow + color (magenta)"
];
const font = d2d.Font("Segoe UI", 14);
let stage = 3;
let visual = null;
let requestId = 0;

function rebuild() {
    const currentRequest = ++requestId;
    const render = { shader: sourceShader };
    if (stage >= 1) render.feedback = feedbackShader;
    if (stage >= 2) render.post = stage === 2 ? glowShader : [glowShader, colorShader];
    vis.CreateAsync(VisSourceType.Waveform, null, render)
        .then(value => {
            if (currentRequest !== requestId) return;
            visual = value;
            window.Repaint();
        })
        .catch(error => console.log("Shader chain: " + error));
}
rebuild();

function on_mouse_lbtn_up() {
    stage = (stage + 1) % labels.length;
    visual = null;
    rebuild();
}

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, 0xff000000);
    if (visual && w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
    gr.DrawString(labels[stage] + "  |  click to switch", font, 0xffbdbdbd,
        10, 8, Math.max(w - 20, 0), 25);
}
setInterval(() => window.Repaint(), 33);
