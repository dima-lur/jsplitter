include('docs/Flags.js');
window.DrawMode = 1;
// JSplitter vis sample: Spectrum | custom HLSL.
// Source: FFT frequency bands and held peaks; render options affect only the presentation.
// Native SpectrumSource supplies already normalized levels and held peaks.
// t0 = levels, t1 = peaks: R32F, one texel per frequency band (0..1).
// b0 = float2 Draw size, float elapsed time, float sourceCount.
// The shader reproduces the built-in renderer defaults: automatic integer-pixel
// bar widths, 1 px gaps, UI text color and 1 px peak markers.

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
Texture2D<float> Levels : register(t0);
Texture2D<float> Peaks  : register(t1);

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

static const float4 SpectrumColor = float4(${hlslColor(textColor)});
static const int Gap = 1;

int VisibleBarCount(int widthPixels, int count)
{
    // Built-in default: barWidth=0, gap=1. Preserve the gap and clip excess
    // source bands on the right if even 1 px bars cannot all fit.
    int fitCount = (widthPixels + Gap) / (1 + Gap);
    return min(count, fitCount);
}

int BaseBarWidth(int widthPixels, int count, int visible)
{
    if (visible <= 0) return 0;
    if (visible < count) return 1;
    int barArea = max(0, widthPixels - Gap * (visible - 1));
    return barArea / visible;
}

bool AlternateBarWidth(int widthPixels, int count, int visible)
{
    if (visible <= 0 || visible < count) return false;
    int barArea = max(0, widthPixels - Gap * (visible - 1));
    int remainder = barArea % visible;
    int extraCount = visible / 2;
    return extraCount > 0 && remainder >= extraCount;
}

int BarLeft(int index, int baseWidth, bool alternate)
{
    int extraBefore = alternate ? index / 2 : 0;
    return index * (baseWidth + Gap) + extraBefore;
}

int BarWidth(int index, int baseWidth, bool alternate)
{
    return baseWidth + (alternate && (index & 1) != 0 ? 1 : 0);
}

int ReadBarIndex(int x, int count, int baseWidth, bool alternate)
{
    int lo = 0;
    int hi = count;
    [loop]
    for (int step = 0; step < 16 && lo < hi; ++step)
    {
        int mid = lo + (hi - lo) / 2;
        if (BarLeft(mid, baseWidth, alternate) <= x)
            lo = mid + 1;
        else
            hi = mid;
    }

    int index = lo - 1;
    if (index < 0 || index >= count) return -1;
    int left = BarLeft(index, baseWidth, alternate);
    return x >= left && x < left + BarWidth(index, baseWidth, alternate) ? index : -1;
}

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
    int widthPixels = max(1, (int)floor(viewportSize.x));
    int heightPixels = max(1, (int)floor(viewportSize.y));
    int count = max(0, (int)sourceCount);
    int visible = VisibleBarCount(widthPixels, count);
    if (visible <= 0) return float4(0.0, 0.0, 0.0, 0.0);

    int baseWidth = BaseBarWidth(widthPixels, count, visible);
    bool alternate = AlternateBarWidth(widthPixels, count, visible);
    int pixelX = (int)floor(input.sceneSpacePos.x);
    int index = ReadBarIndex(pixelX, visible, baseWidth, alternate);
    if (index < 0) return float4(0.0, 0.0, 0.0, 0.0);

    float level = saturate(Levels.Load(int3(index, 0, 0)).r);
    float peak = saturate(Peaks.Load(int3(index, 0, 0)).r);
    float barRise = level * viewportSize.y;
    float peakRise = peak * viewportSize.y;
    int pixelRow = (int)floor(input.sceneSpacePos.y);

    float barCoverage = 0.0;
    if (barRise > 0.0)
    {
        int topRow = (int)floor(viewportSize.y - barRise + 0.5);
        if (pixelRow >= topRow)
            barCoverage = 1.0;
    }

    float peakCoverage = 0.0;
    if (peakRise >= 1.0)
    {
        int peakRow = (int)floor(viewportSize.y - peakRise);
        if (pixelRow == peakRow)
            peakCoverage = 1.0;
    }

    float4 barPixel = Premultiply(SpectrumColor, barCoverage);
    float4 peakPixel = Premultiply(SpectrumColor, peakCoverage);
    return CompositeOver(peakPixel, barPixel);
}
`;

const source = {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    fftSize: 4096, // Default: 4096; allowed: power of two, 256..16384.
    bands: 64, // Default: 64; allowed: integer 4..4096.
    minFrequency: 40, // Default: 40 Hz; allowed: 0 < value < maxFrequency.
    maxFrequency: 23000, // Default: 23000 Hz (clamped to Nyquist); allowed: value > minFrequency.
    minDb: -72, // Default: -72 dB; allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dB; allowed: minDb < value <= +24.
    gain: 1, // Default: 1; allowed: > 0.
    attackMs: 18, // Default: 18 ms; allowed: >= 0 ms.
    releaseMs: 120, // Default: 120 ms; allowed: >= 0 ms.
    peakHoldMs: 150, // Default: 150 ms; allowed: >= 0 ms.
    peakGravity: 3 // Default: 3; allowed: >= 0.
};

let visual = null;
vis.CreateAsync(VisSourceType.Spectrum, source, { shader })
    .then(value => {
        visual = value;
        window.Repaint();
    })
    .catch(error => console.log("Spectrum HLSL: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (visual && w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
