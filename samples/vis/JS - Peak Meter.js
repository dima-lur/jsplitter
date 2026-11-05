include('docs/Flags.js');

// JSplitter vis sample: Peak Meter | JavaScript callback.
// Source: sample peaks, peak hold and clipping; presentation below mirrors
// the built-in renderer defaults while keeping the source data accessible.
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);
const clipColor = 0xffff3030;

// Built-in renderer defaults reproduced by this callback.
const showPeak = true;
const peakSize = 1;
const showClip = false;
const clipWidth = 4;

// Callback data (one channel or mix, all Float32Array(1)):
//   data.levels:  normalized current level (0..1 on the minDb..maxDb scale).
//   data.peaks:   normalized held peak position (0..1 on the same scale).
//   data.clipped: clip indicator, 1 while clipping is detected/held, else 0.
// JSplitter owns and reuses these buffers.
const meter = vis.Create(VisSourceType.PeakMeter, {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    minDb: -60, // Default: -60 dBFS; allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dBFS; allowed: minDb < value <= +24.
    attackMs: 0, // Default: 0 ms; allowed: >= 0 ms.
    releaseMs: 150, // Default: 150 ms; allowed: >= 0 ms.
    peakHoldMs: 500, // Default: 500 ms; allowed: >= 0 ms.
    peakGravity: 3, // Default: 3; allowed: >= 0.
    clipHoldMs: 1000 // Default: 1000 ms; allowed: integer 0..60000 ms.
}, (gr, x, y, w, h, data) => {
    const level = Math.max(0, Math.min(1, data.levels[0]));
    const peak = Math.max(0, Math.min(1, data.peaks[0]));
    const clipped = data.clipped[0] !== 0;

    // Continuous built-in default: one full-height bar over the complete width.
    gr.FillSolidRect(x, y, level * w, h, textColor);

    if (showPeak) {
        const holdEnd = peak * w;
        if (holdEnd >= 1) {
            const markerLeft = Math.max(0, holdEnd - peakSize * 0.5);
            const markerRight = Math.min(w, holdEnd + peakSize * 0.5);
            if (markerLeft < markerRight)
                gr.FillSolidRect(x + markerLeft, y, markerRight - markerLeft, h, textColor);
        }
    }

    // showClip is false by default, matching the built-in renderer. Enabling it
    // overlays the rightmost clipWidth pixels; no separate track or gap is used.
    if (showClip && clipped)
        gr.FillSolidRect(x + Math.max(0, w - clipWidth), y, Math.min(w, clipWidth), h, clipColor);
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) meter.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
