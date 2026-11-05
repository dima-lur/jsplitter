include('docs/Flags.js');

// JSplitter vis sample: Vectorscope | built-in (GDI or Direct2D).
// Source: stereo PCM phase relationship; render options affect only the presentation.
// JSplitter vis: Vectorscope — all source and render options at their defaults.
// The source reads stereo PCM samples; the renderer displays their L/R
// relationship as a goniometer. Rendering does not change the source data.

vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

// Use the current DUI/CUI theme colors for the trace and background.
// InstanceType: 1 = DUI, 0 = CUI; color 0 = text, 1 = background.
const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);

const vectorscope = vis.Create(VisSourceType.Vectorscope, {
        // PCM indices or channel names used as left and right inputs.

        leftChannel: 0, // Default: 0; also accepts a vis.AudioFormat channel name; "mix" is invalid.
        rightChannel: 1, // Default: 1; also accepts a vis.AudioFormat channel name; "mix" is invalid.

        // Recent PCM analysis window in milliseconds.

        durationMs: 40, // Default: 40; allowed: integer 10..500 ms.

        // Number of successive PCM sample pairs in each snapshot.

        points: 1024 // Default: 1024; allowed: integer 32..8192.
    }, {
        // Trace color in ARGB format.
        color: textColor, // Default: UI text color; allowed: ARGB uint32, 0x00000000..0xFFFFFFFF.

        // "lines"  — connect consecutive PCM pairs with a smooth path.
        // "points" — plot samples with an accumulated fading trace.
        mode: "points", // Default: "points"; allowed: "points" or "lines".

        // Overall amplitude multiplier; affects drawing only.
        scale: 1, // Default: 1; allowed: 0 < value <= 16.

        // true  — scale X and Y independently to the draw area's aspect ratio.
        // false — preserve the geometric proportions using the shorter side.
        aspectScale: true, // Default: true; allowed: true or false.

        // Point diameter in pixels, used in "points" mode.
        pointSize: 1, // Default: 1; allowed: 1..16 px.

        // Line width in pixels, used in "lines" mode.
        lineWidth: 1, // Default: 1; allowed: 0 < value <= 16 px.

        // Optional soft halo around points or lines.
        glowStrength: 0.4, // Default: 0.4; allowed: 0..1.

        // Glow radius in pixels.
        glowRadius: 4, // Default: 4; allowed: 0..32 px.

        // How long the trace persists before fading away.
        persistenceMs: 300 // Default: 300; allowed: integer 1..2000 ms.
    });

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) vectorscope.Draw(gr, 0, 0, w, h);
}

// Repaint independently of audio updates; the renderer uses the latest
// published snapshot and handles persistence between snapshots.
setInterval(() => window.Repaint(), 33);
