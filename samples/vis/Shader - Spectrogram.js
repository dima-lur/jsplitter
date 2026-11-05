include('docs/Flags.js');
window.DrawMode = 1;
// JSplitter vis sample: Spectrogram | custom HLSL.
// Source: scrolling FFT history; render options affect only the presentation.
// Uses the built-in default grayscale palette and 50 px/s scrolling geometry.
// JSplitter vis shader sample: Spectrogram. All source settings are API defaults.
// The native SpectrogramSource calculates FFT using Nuttall windowing, maps
// frequencies and dB values, and retains the rolling history. JavaScript does
// not allocate or upload FFT arrays; all texture updates happen in Draw().
//
// HLSL inputs for source.type = "spectrogram":
//   t0 / s0   HistoryTexture / HistorySampler: 2D R32F texture.
//             .r = normalized spectral level, 0 at minDb and 1 at maxDb.
//             Each row represents a frequency range (top = high frequencies),
//             each column is 20 ms of displayed history (50 pixels/second).
//             Columns form a physical circular buffer, not chronological order.
//   b0         VisConstants (16 floats):
//             viewportSize.xy = Draw width/height, in pixels.
//             time = elapsed seconds since shader effect creation.
//             sourceCount = 1 (one spectrogram source).
//             textureWidth / textureHeight = t0 dimensions in pixels.
//             nextColumn = physical index where the next column will be written.
//             validColumns = number of populated columns, 0..textureWidth.
//             scrollPixels = fractional time phase for a 50 px/s scroll.
//             Remaining constants are reserved/zero for this source.
//   input.sceneSpacePos.xy = local position in Draw, in pixels.
// Mapping: full history => wrap nextColumn + screenX to textureWidth.
// partial history => blank on the left, filled data right-aligned.
// IMPORTANT: Use Load() for exact R32F texels, without filtering across the
// physical ring seam. No display history is copied to JS every frame.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const backgroundColor = 0xff202020;

const spectrogramShader = `
Texture2D<float> HistoryTexture : register(t0);
SamplerState HistorySampler : register(s0);

cbuffer VisConstants : register(b0)
{
    float2 viewportSize;  // Draw width and height in pixels.
    float time;           // Seconds since effect creation.
    float sourceCount;    // 1 for Spectrogram.
    float textureWidth;   // Width of the circular history texture.
    float textureHeight;  // Frequency rows in the texture.
    float nextColumn;     // Physical index of the next write.
    float validColumns;   // Number of columns currently filled.
    float scrollPixels;   // Fractional time phase (Nearest mode).
    float reserved0;
    float reserved1;
    float reserved2;
    float4 reservedColor;
};

struct VS_OUTPUT
{
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float4 main(VS_OUTPUT input) : SV_Target
{
    int width = max((int)textureWidth, 1);
    int height = max((int)textureHeight, 1);
    int valid = clamp((int)validColumns, 0, width);
    int next = clamp((int)nextColumn, 0, width - 1);

    float2 pos = input.sceneSpacePos.xy;
    int row = clamp((int)floor(pos.y / max(viewportSize.y, 1.0) * height), 0, height - 1);
    float screenX = pos.x / max(viewportSize.x, 1.0) * width - 0.5;
    int columnX = clamp((int)floor(screenX + max(scrollPixels, 0.0) + 0.5), 0, width - 1);

    // The left edge is empty until the history has been populated.
    if (columnX < width - valid)
        return float4(32.0 / 255.0, 32.0 / 255.0, 32.0 / 255.0, 1.0);
    // Both indices are in [0, width), so one subtraction wraps the ring.
    int wrappedX = next + columnX;
    if (wrappedX >= width) wrappedX -= width;
    int physicalX = valid < width ? columnX - (width - valid) : wrappedX;
    float level = saturate(HistoryTexture.Load(int3(physicalX, row, 0)).r);

    // Match the built-in grayscale palette byte-for-byte: 0x20 -> 0xC2.
    float shadeByte = floor(32.0 + level * (194.0 - 32.0) + 0.5);
    float shade = shadeByte / 255.0;
    return float4(shade, shade, shade, 1.0);
}
`;

const source = {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    fftSize: 4096, // Default: 4096. Power of two, 256..16384; allowed: power of two, 256..16384.
    columnIntervalMs: 16, // Default: 16 ms. FFT history publication interval; allowed: integer 8..250 ms.
    minFrequency: 50, // Default: 50 Hz; allowed: 0 < value < maxFrequency.
    maxFrequency: 20000, // Default: 20000 Hz; allowed: value > minFrequency.
    scale: "log", // Default: "log"; allowed: "log" or "linear".
    minDb: -78, // Default: -78 dB (mapped to level 0); allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dB (mapped to level 1); allowed: minDb < value <= +24.
    gain: 1 // Default: 1. Linear gain before dB conversion; allowed: > 0.
};

let spectrogram = null;
vis.CreateAsync(VisSourceType.Spectrogram, source, { shader: spectrogramShader })
    .then(visualization => {
        spectrogram = visualization;
        window.Repaint();
    })
    .catch(error => console.log("Spectrogram shader compilation failed: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (spectrogram && w > 0 && h > 0)
        spectrogram.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 16.6667);
