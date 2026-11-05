include('docs/Flags.js');

// JSplitter vis sample: VU Meter | built-in (GDI or Direct2D).
// Source: VU detector and ballistic response; render options affect only the presentation.
// JSplitter vis sample: VU Meter | built-in renderer. All options use API defaults.
// Rectified-average detector + standard VU second-order ballistics (IEC 60268-17).
// For a sine wave, 0 VU corresponds to referenceDbfs (-18 dBFS by default).

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const background = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

// The meter source uses the mean-rectified detector with VU ballistics.
// A peak -18 dBFS reference sine corresponds to 0 VU after settling.
const meter = vis.Create(VisSourceType.VUMeter, {
        
        channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
        referenceDbfs: -18, // Default: -18 dBFS (peak reference sine); allowed: -96..0 dBFS.
        minVu: -20, // Default: -20 VU; allowed: -160 <= value < maxVu.
        maxVu: 3, // Default: +3 VU; allowed: minVu < value <= +24.
        attackMs: 300, // Default: 300 ms; allowed: >= 0 ms.
        releaseMs: 300, // Default: 300 ms; allowed: >= 0 ms.
        peakHoldMs: 500, // Default: 500 ms; allowed: >= 0 ms.
        peakGravity: 3 // Default: 3; allowed: >= 0.
    }, {
        
        ranges: [{ to: 3, color: textColor }], // Default: UI text color to maxVu; allowed: 1..256 {to, color} entries; increasing to in -160..+24; 32-bit ARGB colors.
        segmentSize: 6, // Default: 6 px; allowed: integer 0..1024 px (0 = automatic).
        segmentGap: 0, // Default: 0 px; allowed: integer 0..64 px.
        colorMode: "gradient", // Default: "gradient"; allowed: "gradient" or "discrete".
        showPeak: false, // Default: false; allowed: true or false.
        peakColor: textColor, // Default: UI text color; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.
        peakSize: 1 // Default: 1 px; allowed: 0 < value <= 64 px.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, background);
    if (w > 0 && h > 0) meter.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
