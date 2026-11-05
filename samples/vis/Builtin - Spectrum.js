include('docs/Flags.js');

// JSplitter vis sample: Spectrum | built-in (GDI or Direct2D).
// Source: FFT frequency bands and held peaks; render options affect only the presentation.
// JSplitter vis: Spectrum — source and built-in renderer at their defaults.
//
// source controls audio analysis and signal dynamics. It produces normalized
// spectrum levels/peaks independently of how they are drawn.
// render controls only the built-in spectrum presentation.
//
// The dB magnitude scale is relative to the FFT output; it is not a calibrated
// dBFS meter.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Default colors are resolved from the current DUI/CUI text color.
// InstanceType: 1 = DUI, 0 = CUI; color identifier 0 = text in both.
const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);

// Match the background as well, so theme-colored content remains visible.
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

const spectrum = vis.Create(VisSourceType.Spectrum, {
        
        channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.

        fftSize: 4096, // Default: 4096; allowed: power of two, 256..16384.
        bands: 64, // Default: 64; allowed: integer 4..4096.

        minFrequency: 40, // Default: 40 Hz; allowed: 0 < value < maxFrequency.
        maxFrequency: 23000, // Default: 23000 Hz; allowed: value > minFrequency.
        minDb: -72, // Default: -72 dB; allowed: -160 <= value < maxDb.
        maxDb: 0, // Default: 0 dB; allowed: minDb < value <= +24.
        gain: 1, // Default: 1; allowed: > 0.

        attackMs: 18, // Default: 18 ms; allowed: >= 0 ms.
        releaseMs: 120, // Default: 120 ms; allowed: >= 0 ms.
        peakHoldMs: 150, // Default: 150 ms; allowed: >= 0 ms.
        peakGravity: 3 // Default: 3; allowed: >= 0.
    }, {
        // 0 draws one bar per source band while they fit; excess right-side bands
        // are clipped. A non-zero value chooses as many visible bars as fit the current
        // Draw() width; source bands stay unchanged.
        barWidth: 0, // Default: 0; allowed: integer 0..64 px (0 = automatic).
        gap: 1, // Default: 1 px; allowed: integer 0..64 px.

        // 1..256 {to, color} zones; 'to' strictly increasing in -160..+24 dB.
        // Default is the DUI/CUI text color over the entire source dB range.
        // Three-color ranges example:
        // ranges: [
        //     { to: -18, color: 0xff4caf50 },
        //     { to: -6,  color: 0xffffeb3b },
        //     { to: 0,   color: 0xfff44336 }
        // ],
        ranges: [{ to: 0, color: textColor }], // Default: Entire dB range in UI text color; allowed: 1..256 {to, color} entries; increasing to in -160..+24; 32-bit ARGB colors.

        segmentSize: 6, // Default: 6 px; allowed: integer 0..1024 px (0 = automatic).
        segmentGap: 0, // Default: 0; allowed: integer 0..64 px.
        colorMode: "gradient", // Default: "gradient"; allowed: "gradient" or "discrete".
        showPeak: true, // Default: true; allowed: true or false. draw the source peak marker.
        peakColor: textColor, // Default: DUI/CUI text color (ARGB); allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.
        peakSize: 1 // Default: 1 px; allowed: integer 1..64 px.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) spectrum.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
