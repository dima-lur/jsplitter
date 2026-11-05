include('docs/Flags.js');

// JSplitter vis sample: VU Meter | JavaScript callback.
// Source: VU detector and ballistic response; presentation below mirrors
// the built-in renderer defaults while keeping the held-peak data accessible.
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

// Built-in renderer defaults reproduced by this callback.
const showPeak = false;
const peakSize = 1;

// Callback data (one channel or mix, both Float32Array(1)):
//   data.levels: normalized VU reading (0..1 over minVu..maxVu).
//   data.peaks:  normalized held peak position (0..1 on the same scale).
// JSplitter owns and reuses both buffers.
const meter = vis.Create(VisSourceType.VUMeter, {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    referenceDbfs: -18, // Default: -18 dBFS for 0 VU; allowed: -96..0 dBFS.
    minVu: -20, // Default: -20 VU; allowed: -160 <= value < maxVu.
    maxVu: 3, // Default: +3 VU; allowed: minVu < value <= +24.
    attackMs: 300, // Default: 300 ms; allowed: >= 0 ms.
    releaseMs: 300, // Default: 300 ms; allowed: >= 0 ms.
    peakHoldMs: 500, // Default: 500 ms; allowed: >= 0 ms.
    peakGravity: 3 // Default: 3; allowed: >= 0.
}, (gr, x, y, w, h, data) => {
    const level = Math.max(0, Math.min(1, data.levels[0]));
    const peak = Math.max(0, Math.min(1, data.peaks[0]));

    // Continuous built-in default: one full-height bar over the complete width.
    gr.FillSolidRect(x, y, level * w, h, textColor);

    // VU's built-in default is showPeak=false. Keep the code here so the
    // callback demonstrates the held-peak buffer without changing the default look.
    if (showPeak) {
        const holdEnd = peak * w;
        if (holdEnd >= 1) {
            const markerLeft = Math.max(0, holdEnd - peakSize * 0.5);
            const markerRight = Math.min(w, holdEnd + peakSize * 0.5);
            if (markerLeft < markerRight)
                gr.FillSolidRect(x + markerLeft, y, markerRight - markerLeft, h, textColor);
        }
    }
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) meter.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
