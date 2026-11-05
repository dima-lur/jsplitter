include('docs/Flags.js');

// JSplitter vis sample: Vectorscope | JavaScript callback.
// Source: stereo PCM phase relationship; render options affect only the presentation.
// JSplitter vis: Vectorscope rendered in JavaScript (works with either GDI or Direct2D).
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const textColor = window.InstanceType === 1
    ? window.GetColourDUI(0) : window.GetColourCUI(0);
const backgroundColor = window.InstanceType === 1
    ? window.GetColourDUI(1) : window.GetColourCUI(1);
const axisColor = (textColor & 0x00ffffff) | 0x40000000;

// Callback data (two equally sized Float32Array buffers):
//   data.left:  PCM amplitudes for the selected left channel (-1..1).
//   data.right: PCM amplitudes for the selected right channel (-1..1).
// left[i] and right[i] form one stereo frame; adjacent indices are
// consecutive frames. The figure uses (L-R)/2 for X and (L+R)/2 for Y.
// JSplitter owns both arrays and replaces them when Points changes.
const vectorscope = vis.Create(VisSourceType.Vectorscope, {
    
    leftChannel: 0, // Default: 0; also accepts a vis.AudioFormat channel name; "mix" is invalid.
    rightChannel: 1, // Default: 1; also accepts a vis.AudioFormat channel name; "mix" is invalid.
    durationMs: 40, // Default: 40 ms; allowed: integer 10..500 ms.
    points: 1024 // Default: 1024 sequential stereo pairs; allowed: integer 32..8192.
},  (gr, x, y, w, h, data) => {
    const { left, right } = data;
    const n = left.length;
    if (n < 2) return;
    const cx = x + w / 2, cy = y + h / 2;
    const rx = Math.max(0, w / 2 - 2), ry = Math.max(0, h / 2 - 2);

    // Axes: mono (vertical) and anti-phase (horizontal).
    gr.DrawLine(cx, y, cx, y + h, 1, axisColor);
    gr.DrawLine(x, cy, x + w, cy, 1, axisColor);

    // Connect only adjacent stereo PCM frames (no decimation).
    for (let i = 1; i < n; ++i) {
        const x0 = cx + (left[i - 1] - right[i - 1]) * rx * 0.5;
        const y0 = cy - (left[i - 1] + right[i - 1]) * ry * 0.5;
        const x1 = cx + (left[i] - right[i]) * rx * 0.5;
        const y1 = cy - (left[i] + right[i]) * ry * 0.5;
        gr.DrawLine(x0, y0, x1, y1, 1, textColor);
    }
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) vectorscope.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 33);
