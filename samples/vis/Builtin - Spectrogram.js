include('docs/Flags.js');

// JSplitter vis sample: Spectrogram | built-in (GDI or Direct2D).
// Source: scrolling FFT history; render options affect only the presentation.
// JSplitter vis: STFT spectrogram with scrolling or stationary sweep.
// Time runs left to right: scrolling history or stationary sweep. Frequency bottom to top.
// Linear FFT magnitude, normalized to a bin-centred full-scale sine,
// displayed as 20*log10(amplitude); this is not a calibrated power density.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Fixed grayscale background, independent of DUI/CUI colours.
const backgroundColor = 0xFF202020;

const spectrogram = vis.Create(VisSourceType.Spectrogram, {
        
        channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
        fftSize: 4096, // Default: 4096; allowed: power of two, 256..16384.
        columnIntervalMs: 16, // Default: 16 ms; allowed: integer 8..250 ms; interval between STFT columns.
        minFrequency: 50, // Default: 50 Hz; allowed: 0 < value < maxFrequency.
        maxFrequency: 20000, // Default: 20000 Hz; allowed: value > minFrequency; clamped to Nyquist during analysis.
        scale: "log", // Default: "log"; allowed: "log" or "linear".
        minDb: -78, // Default: -78 dB; allowed: -160 <= value < maxDb.
        maxDb: 0, // Default: 0 dB; allowed: minDb < value <= +24.
        gain: 1 // Default: 1; allowed: > 0.
    }, {
        
        style: "scrolling", // Default: "scrolling"; allowed: "scrolling" or "stationary".
        palette: "grayscale" // Default: "grayscale"; allowed: "grayscale" or "inferno".
        // color: 0xFFC2C2C2,   // Default: 0xFFC2C2C2; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF; grayscale foreground.
        // backgroundColor: 0xFF202020 // Default: 0xFF202020; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF; grayscale background.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) spectrogram.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 16.6667);
