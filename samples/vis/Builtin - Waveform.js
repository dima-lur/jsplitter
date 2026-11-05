include('docs/Flags.js');

// JSplitter vis sample: Waveform | built-in (GDI or Direct2D).
// Source: recent PCM waveform; render options affect only the presentation.
// JSplitter vis: Waveform — all source and render options at their defaults.
// The source analyzes recent PCM data. The renderer only controls how that
// waveform data is drawn; it does not perform audio analysis itself.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Default colors are resolved from the current DUI/CUI text color.
// InstanceType: 1 = DUI, 0 = CUI; color identifier 0 = text in both.
const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);

// Match the background as well, so theme-colored content remains visible.
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

const waveform = vis.Create(VisSourceType.Waveform, {
        
        channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.

        // Number of waveform analysis points.
        // "auto" follows the current Draw() width (about 2 points per 3 px).
        points: "auto", // Default: "auto"; allowed: integer 16..4096 or "auto".

        // Length of the recent PCM window represented by the source.
        durationMs: 300, // Default: 300; allowed: integer 20..2000 ms.

        // Spatial smoothing applied by the waveform source before rendering.
        // 0 keeps the raw analyzed shape; 1 applies maximum smoothing.
        smoothing: 0 // Default: 0; allowed: 0..1.
    }, {
        // Rendering style:
        // "line"     — one continuous line through the waveform samples.
        // "envelope" — continuous filled min/max envelope.
        style: "line", // Default: "line"; allowed: "line" or "envelope".

        // Waveform color in ARGB format.
        color: textColor, // Default: UI text color; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.

        // Visual amplitude multiplier. This affects drawing only; it does not
        // change the waveform data produced by the source.
        gain: 1, // Default: 1; allowed: 0 < value <= 16.

        // Line/stroke width in pixels.
        lineWidth: 1, // Default: 1; allowed: 0 < value <= 16 px.

        // Optional soft glow added outside the waveform stroke.
        // glowStrength controls halo opacity: 0 disables the glow, 1 is strong.
        glowStrength: 0, // Default: 0; allowed: 0..1.

        // Glow radius in pixels outside the core stroke.
        glowRadius: 0 // Default: 0; allowed: 0..32 px.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) waveform.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
