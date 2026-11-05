include('docs/Flags.js');

// JSplitter vis sample: Waveform | JavaScript callback.
// Source: recent PCM waveform; render options affect only the presentation.
// JSplitter vis: Waveform rendered in JavaScript (works with either GDI or Direct2D).
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);
const envelopeColor = (textColor & 0x00ffffff) | 0x60000000;
let envelopePoints = [];

// Callback data (three equally sized buffers of PCM amplitudes, -1..1):
//   data.line: Float32Array - resampled waveform for drawing a continuous line.
//   data.min:  Float32Array - minimum PCM value within each time interval.
//   data.max:  Float32Array - maximum PCM value within each time interval.
// min/max form an envelope that preserves short peaks missed by resampling.
// JSplitter owns these arrays and resizes them automatically with Points.
const waveform = vis.Create(VisSourceType.Waveform, {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    points: "auto", // Default: "auto" (~2 points per 3 px); allowed: integer 16..4096 or "auto".
    durationMs: 300, // Default: 300 ms; allowed: integer 20..2000 ms.
    smoothing: 0 // Default: 0; allowed: 0..1.
}, (gr, x, y, w, h, data) => {
    const { line, min, max } = data;
    const n = line.length;
    if (n < 2) return;

    const mid = y + h * 0.5;
    const radius = h * 0.5;
    const step = w / (n - 1);

    // Ordinary drawing is not antialiased by default in either GDI or D2D.
    gr.SetSmoothingMode(SmoothingMode.AntiAlias);

    // Draw the full min/max envelope as a translucent filled region. The
    // central waveform below remains visible and demonstrates data.line too.
    envelopePoints.length = n * 4;
    for (let i = 0; i < n; ++i) {
        const px = x + i * step;
        envelopePoints[i * 2] = px;
        envelopePoints[i * 2 + 1] = mid - Math.max(-1, Math.min(1, max[i])) * radius;

        const reverse = n * 2 + (n - 1 - i) * 2;
        envelopePoints[reverse] = px;
        envelopePoints[reverse + 1] = mid - Math.max(-1, Math.min(1, min[i])) * radius;
    }
    gr.FillPolygon(envelopeColor, 1, envelopePoints);

    // The central waveform line is independent of the envelope.
    for (let i = 1; i < n; ++i) {
        const x0 = x + (i - 1) * step, x1 = x + i * step;
        const y0 = mid - Math.max(-1, Math.min(1, line[i - 1])) * radius;
        const y1 = mid - Math.max(-1, Math.min(1, line[i])) * radius;
        gr.DrawLine(x0, y0, x1, y1, 1, textColor);
    }

    gr.SetSmoothingMode(SmoothingMode.Default);
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) waveform.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
