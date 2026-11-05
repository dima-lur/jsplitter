include('docs/Flags.js');
window.DrawMode = 1;
// JSplitter vis sample: Vectorscope | HLSL shader pipeline.
// An open, pixel-shader approximation of the built-in phosphor vectorscope.
// No native compute shader or private GPU buffers are used.
//
// Pipeline:
//   shader   - stereo PCM -> round pixel hits + radial glow, accumulated
//              with the built-in CPU formulas within the current PCM frame.
//   feedback - previous image -> time-based persistence (300 ms).
//   post     - saved intensity -> DUI/CUI text color for display.
//
// The public shader interface exposes ps_4_0 image passes, not D3D11
// compute/structured buffers. Every source-shader pixel must search PCM
// samples, so this example bounds the search to 256 distributed stereo pairs
// from the native source's default 1024. At larger panel sizes this can be
// significantly more expensive than the built-in CPU or compute renderer.
// The feedback history is one 8-bit premultiplied image; unlike the native
// compute implementation it cannot separately retain full-precision core
// and glow intensities. Pause/new-source-revision behavior can also differ.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Built-in defaults for the visible shape: pointSize=1, scale=1,
// aspectScale=true, glowStrength=0.4, glowRadius=4, persistenceMs=300.
// These are constants inside the HLSL demonstration, not new API options.
const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

// Convert the theme's ARGB value into compile-time HLSL literals.
const colorComponent = shift => (((textColor >>> shift) & 255) / 255).toFixed(6);
const tint = `float3(${colorComponent(16)}, ${colorComponent(8)}, ${colorComponent(0)})`;
const themeAlpha = colorComponent(24);

// Source pass: texture t0 = left PCM, t1 = right PCM (paired R32F rows).
// Constants b0 = Draw width, height, effect time, available stereo pairs.
// CPU-style core and radial halo are combined into premultiplied coverage
// for a single PCM window; source-over blending accumulates the windows.
const sourceShader = `
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RightPCM : register(t1);
cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
};
struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 pixel = floor(input.sceneSpacePos.xy);
    float2 center = size * 0.5;

    // Corresponds to the built-in Vectorscope's default render settings.
    const float pointSize = 1.0;
    const float glowRadius = 4.0;
    const float glowStrength = 0.4;
    const float scale = 1.0;
    float margin = max(1.0, pointSize * 0.5 + glowRadius + 1.0);
    float2 radius = max(float2(0.0, 0.0), center - margin);
    int splat = max(0, (int)ceil(pointSize * 0.5) - 1);

    int count = max(0, (int)pointCount);
    int plotted = min(count, 256); // Bounded per-pixel cost, not source.points.
    float core = 0.0;
    float glow = 0.0;
    [loop]
    for (int i = 0; i < plotted; ++i) {
        int index = min(count - 1, (int)floor(
            ((float)i + 0.5) * (float)count / (float)plotted));
        float l = LeftPCM.Load(int3(index, 0, 0)).r;
        float r = RightPCM.Load(int3(index, 0, 0)).r;
        float2 spot = center + 0.5 * float2(l - r, -(l + r)) * radius * scale;
        float2 delta = pixel - floor(spot + 0.5);
        if (abs(delta.x) <= splat && abs(delta.y) <= splat)
            core += 0.55 * (1.0 - core);
        float d2 = dot(delta, delta) / (glowRadius * glowRadius);
        if (d2 < 1.0) {
            float weight = 1.0 - d2;
            float contribution = 0.22 * glowStrength * weight * weight;
            glow += contribution * (1.0 - glow);
        }
    }
    float coverage = saturate(core + glow * (1.0 - core));
    return float4(coverage, coverage, coverage, coverage);
}`;

// Feedback pass: previous image (t0/s0), one step per Draw().
// frameStep is measured in 60-Hz frames; exp(-3*dt/300ms) matches the
// built-in's persistence equation. The tiny subtraction prevents 8-bit
// history from retaining nearly invisible pixels forever after quantization.
const feedbackShader = `
Texture2D Previous : register(t0);
SamplerState PreviousSampler : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};
float4 main(PSInput input) : SV_Target {
    float4 previous = Previous.SampleLevel(PreviousSampler,
                                          input.texelSpacePos.xy, 0.0);
    float fade = exp(-3.0 * (frameStep * (1000.0 / 60.0)) / 300.0);
    // The native history bitmap is cleared to opaque black: alpha is always 1.
    // Luminance (RGB), not alpha, carries the accumulated signal.
    float coverage = max(0.0, previous.r * fade -
                        (0.5 / 255.0) * saturate(frameStep));
    return float4(coverage, coverage, coverage, coverage);
}`;

// Post pass: tint the saved grayscale intensity without changing history.
// RGB is premultiplied by alpha, as required by the shader image pipeline.
const postShader = `
Texture2D History : register(t0);
SamplerState HistorySampler : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};
float4 main(PSInput input) : SV_Target {
    float4 previous = History.SampleLevel(HistorySampler,
                                         input.texelSpacePos.xy, 0.0);
    // Read history luminance, since the history bitmap is opaque.
    float opacity = saturate(previous.r * ${themeAlpha});
    float3 color = ${tint};
    return float4(color * opacity, opacity);
}`;

// Native vectorscope source settings are all at their API defaults.
const source = {
    leftChannel: 0, // Default: 0; also accepts a vis.AudioFormat channel name; "mix" is invalid.
    rightChannel: 1, // Default: 1; also accepts a vis.AudioFormat channel name; "mix" is invalid.
    durationMs: 40, // Default: 40; allowed: integer 10..500 ms.
    points: 1024 // Default: 1024; allowed: integer 32..8192.
};

let vectorscope = null;
vis.CreateAsync(VisSourceType.Vectorscope, source, {
    shader: sourceShader,
    feedback: feedbackShader,
    post: postShader,
    stopOnPause: true // Default: false; allowed: true or false. Freeze the accumulated vectorscope image on pause.
})
    .then(value => {
        vectorscope = value;
        window.Repaint();
    })
    .catch(error => console.log("Vectorscope shader pipeline failed: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (vectorscope && w > 0 && h > 0)
        vectorscope.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
