include('docs/Flags.js');

// JSplitter vis sample: Spectrum | JavaScript callback.
// Source: FFT frequency bands and held peaks; render options affect only the presentation.
// JSplitter vis: Spectrum rendered in JavaScript (works with either GDI or Direct2D).
// The callback below reproduces the built-in renderer defaults: automatic
// integer-pixel bar widths, 1 px gaps, UI text color and 1 px peak markers.
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

// Callback data (one value per frequency band):
//   data.levels: Float32Array(Bands) - current band levels, normalized to 0..1.
//   data.peaks:  Float32Array(Bands) - held band peaks, normalized to 0..1.
// JSplitter owns both arrays, reuses them between frames and replaces them
// when Bands changes. Always read the arrays from the current callback data.
const spectrum = vis.Create(VisSourceType.Spectrum, {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    fftSize: 4096, // Default: 4096; allowed: power of two, 256..16384.
    bands: 64, // Default: 64; allowed: integer 4..4096.
    minFrequency: 40, // Default: 40 Hz; allowed: 0 < value < maxFrequency.
    maxFrequency: 23000, // Default: 23000 Hz; allowed: value > minFrequency. clamped to Nyquist.
    minDb: -72, // Default: -72 dB; allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dB; allowed: minDb < value <= +24.
    attackMs: 18, // Default: 18 ms; allowed: >= 0 ms.
    releaseMs: 120, // Default: 120 ms; allowed: >= 0 ms.
    peakHoldMs: 150, // Default: 150 ms; allowed: >= 0 ms.
    peakGravity: 3, // Default: 3; allowed: >= 0.
    gain: 1 // Default: 1; allowed: > 0.
}, (gr, x, y, w, h, data) => {
    const { levels, peaks } = data;
    if (!levels.length || peaks.length !== levels.length) return;

    // Match the built-in renderer's default integer-pixel layout exactly.
    const width = Math.max(0, Math.floor(w));
    const height = Math.max(0, Math.floor(h));
    if (!width || !height) return;

    const gap = 1;
    const fitCount = Math.floor((width + gap) / (1 + gap));
    const barCount = Math.min(levels.length, fitCount);
    if (!barCount) return;

    const totalGap = gap * (barCount - 1);
    const barArea = Math.max(0, width - totalGap);
    const clipped = barCount < levels.length;
    const baseWidth = clipped ? 1 : Math.floor(barArea / barCount);
    const remainder = clipped ? 0 : barArea % barCount;
    const alternatingExtraCount = Math.floor(barCount / 2);
    const alternateWidth = alternatingExtraCount > 0 && remainder >= alternatingExtraCount;

    let barX = Math.round(x);
    const top = Math.round(y);
    for (let i = 0; i < barCount; ++i) {
        const barWidth = baseWidth + (alternateWidth && (i & 1) ? 1 : 0);
        const level = Math.max(0, Math.min(1, levels[i]));
        const peak = Math.max(0, Math.min(1, peaks[i]));

        const barRise = level * height;
        if (barRise > 0 && barWidth > 0) {
            const topRow = Math.max(0, Math.min(height, Math.floor(height - barRise + 0.5)));
            if (topRow < height)
                gr.FillSolidRect(barX, top + topRow, barWidth, height - topRow, textColor);
        }

        const peakRise = peak * height;
        if (peakRise >= 1 && barWidth > 0) {
            const peakRow = Math.floor(height - peakRise);
            if (peakRow >= 0 && peakRow < height)
                gr.FillSolidRect(barX, top + peakRow, barWidth, 1, textColor);
        }

        barX += barWidth + gap;
    }
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) spectrum.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
