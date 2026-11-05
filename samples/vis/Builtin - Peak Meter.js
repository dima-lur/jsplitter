include('docs/Flags.js');

// JSplitter vis sample: Peak Meter | built-in (GDI or Direct2D).
// Source: sample peaks, peak hold and clipping; render options affect only the presentation.
// JSplitter vis: Peak Meter — all vis.Create options at their defaults.
// Default source is a mono mix of all input channels. For stereo, create
// two meters with channel: 0 and channel: 1 (see Peak Meter Modes.js).

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Default colors are resolved from the current DUI/CUI text color.
// InstanceType: 1 = DUI, 0 = CUI; color identifier 0 = text in both.
const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);

// Match the background as well, so theme-colored content remains visible.
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

const meter = vis.Create(VisSourceType.PeakMeter, {
        
        channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
        minDb: -60, // Default: -60 dBFS; allowed: -160 <= value < maxDb.
        maxDb: 0, // Default: 0 dBFS; allowed: minDb < value <= +24.
        attackMs: 0, // Default: 0 ms; allowed: >= 0 ms. rising level smoothing.
        releaseMs: 150, // Default: 150 ms; allowed: >= 0 ms. falling level smoothing.
        peakHoldMs: 500, // Default: 500 ms; allowed: >= 0 ms. time before marker falls.
        peakGravity: 3, // Default: 3; allowed: >= 0.
        clipHoldMs: 1000 // Default: 1000 ms; allowed: integer 0..60000 ms.
    }, {
        // 1..256 {to, color} zones; 'to' strictly increasing in -160..+24 dB.
        // Default is the DUI/CUI text color over the entire dBFS range.
        // Three-color ranges example:
        // ranges: [
        //     { to: -18, color: 0xff4caf50 },
        //     { to: -6,  color: 0xffffeb3b },
        //     { to: 0,   color: 0xfff44336 }
        // ],
        ranges: [{ to: 0, color: textColor }], // Default: UI text color to maxDb; allowed: 1..256 {to, color} entries; increasing to in -160..+24; 32-bit ARGB colors.

        segmentSize: 6, // Default: 6 px; allowed: integer 0..1024 px (0 = automatic).
        segmentGap: 0, // Default: 0; allowed: integer 0..64 px.
        colorMode: "gradient", // Default: "gradient"; allowed: "gradient" or "discrete".
        peakColor: textColor, // Default: DUI/CUI text color (ARGB); allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.
        peakSize: 1, // Default: 1 px; allowed: 0 < value <= 64 px.
        showPeak: true, // Default: true; allowed: true or false. display the held marker.
        showClip: false, // Default: false; allowed: true or false. indicator at sample peak >= 1.
        clipWidth: 4, // Default: 4 px; allowed: 0 < value <= 64 px.
        clipColor: 0xffff3030 // Default: 0xFFFF3030; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) meter.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
