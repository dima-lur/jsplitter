include('docs/Flags.js');
window.DrawMode = 1;
// JSplitter vis sample: Peak Meter | custom HLSL.
// Source: sample peaks, peak hold and clipping. The shader reproduces the
// built-in renderer defaults: full-height theme-colored bar, 1 px held peak,
// and no clip indicator unless ShowClip is changed from its default false.
// HLSL is compiled off the UI thread; painting starts after CreateAsync resolves.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);
const clipColor = 0xffff3030;

function hlslColor(argb) {
    argb >>>= 0;
    return [
        ((argb >>> 16) & 0xff) / 255,
        ((argb >>> 8) & 0xff) / 255,
        (argb & 0xff) / 255,
        ((argb >>> 24) & 0xff) / 255
    ].map(value => value.toFixed(8)).join(', ');
}

const peakMeterShader = `
Texture2D<float> LevelTexture : register(t0);
Texture2D<float> PeakTexture  : register(t1);
Texture2D<float> ClipTexture  : register(t2);

cbuffer VisConstants : register(b0)
{
    float2 viewportSize;
    float time;
    float sourceCount;
};

struct VS_OUTPUT
{
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

static const float4 MeterColor = float4(${hlslColor(textColor)});
static const float4 ClipColor = float4(${hlslColor(clipColor)});
static const float PeakSize = 1.0;
static const float ShowPeak = 1.0;
static const float ShowClip = 0.0;
static const float ClipWidth = 4.0;

float4 Premultiply(float4 color, float coverage)
{
    float alpha = color.a * saturate(coverage);
    return float4(color.rgb * alpha, alpha);
}

float4 CompositeOver(float4 foreground, float4 background)
{
    return foreground + background * (1.0 - foreground.a);
}

float4 main(VS_OUTPUT input) : SV_Target
{
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float levelEnd = saturate(LevelTexture.Load(int3(0, 0, 0)).r) * size.x;
    float holdEnd = saturate(PeakTexture.Load(int3(0, 0, 0)).r) * size.x;
    float clipped = ClipTexture.Load(int3(0, 0, 0)).r;

    float barCoverage = levelEnd > 0.0 && p.x >= 0.0 && p.x < levelEnd ? 1.0 : 0.0;
    float holdCoverage = 0.0;
    if (ShowPeak > 0.5 && holdEnd >= 1.0)
    {
        float markerLeft = max(0.0, holdEnd - PeakSize * 0.5);
        float markerRight = min(size.x, holdEnd + PeakSize * 0.5);
        if (markerLeft < markerRight && p.x >= markerLeft && p.x < markerRight)
            holdCoverage = 1.0;
    }

    float clipCoverage = 0.0;
    if (ShowClip > 0.5 && clipped >= 0.5 && p.x >= max(0.0, size.x - ClipWidth))
        clipCoverage = 1.0;

    float4 barPixel = Premultiply(MeterColor, barCoverage);
    float4 holdPixel = Premultiply(MeterColor, holdCoverage);
    float4 clipPixel = Premultiply(ClipColor, clipCoverage);
    return CompositeOver(clipPixel, CompositeOver(holdPixel, barPixel));
}
`;

const source = {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    minDb: -60, // Default: -60 dBFS; allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dBFS; allowed: minDb < value <= +24.
    attackMs: 0, // Default: 0 ms; allowed: >= 0 ms.
    releaseMs: 150, // Default: 150 ms; allowed: >= 0 ms.
    peakHoldMs: 500, // Default: 500 ms; allowed: >= 0 ms.
    peakGravity: 3, // Default: 3; allowed: >= 0.
    clipHoldMs: 1000 // Default: 1000 ms; allowed: integer 0..60000 ms.
};

let meter = null;
vis.CreateAsync(VisSourceType.PeakMeter, source, { shader: peakMeterShader })
    .then(visualization => {
        meter = visualization;
        window.Repaint();
    })
    .catch(error => console.log("Peak Meter shader compilation failed: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (meter && w > 0 && h > 0) meter.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
