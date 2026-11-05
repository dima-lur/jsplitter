include('docs/Flags.js');
window.DrawMode = 1;
// JSplitter vis sample: Waveform | custom HLSL.
// Source: recent PCM waveform; render options affect only the presentation.
// t0 = R32F recent signed waveform points (-1..1), one texel per point.
// b0 = float2 Draw size, float elapsed time, float pointCount.
// The shader reproduces the built-in renderer default: a 1 px antialiased
// waveform line in the current UI text color, with no glow.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

function hlslColor(argb) {
    argb >>>= 0;
    return [
        ((argb >>> 16) & 0xff) / 255,
        ((argb >>> 8) & 0xff) / 255,
        (argb & 0xff) / 255,
        ((argb >>> 24) & 0xff) / 255
    ].map(value => value.toFixed(8)).join(', ');
}

const shader = `
Texture2D<float> Waveform : register(t0);

cbuffer VisConstants : register(b0)
{
    float2 viewportSize;
    float time;
    float pointCount;
};

struct VS_OUTPUT
{
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

static const float4 WaveformColor = float4(${hlslColor(textColor)});

float ReadWaveform(int index)
{
    int count = max(1, (int)pointCount);
    index = clamp(index, 0, count - 1);
    return clamp(Waveform.Load(int3(index, 0, 0)).r, -1.0, 1.0);
}

float2 PointForIndex(int index)
{
    int count = max(2, (int)pointCount);
    float t = (float)index / max((float)(count - 1), 1.0);
    float value = ReadWaveform(index);
    return float2(t * viewportSize.x,
        viewportSize.y * 0.5 - value * viewportSize.y * 0.5);
}

float DistanceToSegment(float2 p, float2 a, float2 b)
{
    float2 ab = b - a;
    float len2 = max(dot(ab, ab), 1e-6);
    float t = saturate(dot(p - a, ab) / len2);
    return length(p - (a + ab * t));
}

float4 main(VS_OUTPUT input) : SV_Target
{
    int count = max(0, (int)pointCount);
    if (count < 2) return float4(0.0, 0.0, 0.0, 0.0);

    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float position = saturate(p.x / size.x) * (count - 1);
    int centerSegment = (int)floor(position);

    // Match the built-in line renderer: search enough neighbouring segments
    // for steep transitions, then antialias a geometric 1 px polyline stroke.
    float pointSpacing = size.x / max((float)(count - 1), 1.0);
    float halfLine = 0.5;
    float searchPixels = halfLine + 1.5;
    int reach = (int)min(ceil(searchPixels / max(pointSpacing, 0.25)) + 1.0, 16.0);

    float dist = 1e20;
    [loop]
    for (int offset = -16; offset <= 16; ++offset)
    {
        if (abs(offset) > reach) continue;

        int segment = centerSegment + offset;
        if (segment < 0 || segment >= count - 1) continue;
        dist = min(dist, DistanceToSegment(p,
            PointForIndex(segment), PointForIndex(segment + 1)));
    }

    const float aaWidth = 0.80;
    float coverage = 1.0 - smoothstep(halfLine - aaWidth * 0.5,
                                      halfLine + aaWidth * 0.5,
                                      dist);
    float alpha = WaveformColor.a * coverage;
    return float4(WaveformColor.rgb * alpha, alpha);
}`;

const source = {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    points: "auto", // Default: "auto"; allowed: integer 16..4096 or "auto".
    durationMs: 300, // Default: 300 ms; allowed: integer 20..2000 ms.
    smoothing: 0 // Default: 0; allowed: 0..1.
};

let visual = null;
vis.CreateAsync(VisSourceType.Waveform, source, { shader })
    .then(value => {
        visual = value;
        window.Repaint();
    })
    .catch(error => console.log("Waveform HLSL: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (visual && w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
