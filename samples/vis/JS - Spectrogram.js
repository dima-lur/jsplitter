include('docs/Flags.js');

// JSplitter vis sample: Spectrogram | JavaScript callback.
// Source: scrolling FFT history; render options affect only the presentation.
// JSplitter vis: a scrolling Spectrogram drawn in JavaScript (works with either GDI or Direct2D).
// The callback receives raw 16 ms FFT columns. This sample converts them to the
// same 20 ms physical display columns as the built-in renderer (50 px/s), then
// keeps those pixels in a circular offscreen bitmap.
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.

const backgroundColor = 0xff202020;
const foregroundColor = 0xffc2c2c2;
const displayMsPerPixel = 20; // 50 physical pixels per second, like the built-in renderer.

const source = {
    channel: "mix", // Default: "mix"; also accepts a vis.AudioFormat channel name or unsigned PCM index.
    fftSize: 4096, // Default: 4096; allowed: power of two, 256..16384.
    columnIntervalMs: 16, // Default: 16 ms; allowed: integer 8..250 ms.
    minFrequency: 50, // Default: 50 Hz; allowed: 0 < value < maxFrequency.
    maxFrequency: 20000, // Default: 20000 Hz; allowed: value > minFrequency; clamped to Nyquist.
    scale: "log", // Default: "log"; allowed: "log" or "linear".
    minDb: -78, // Default: -78 dBFS; allowed: -160 <= value < maxDb.
    maxDb: 0, // Default: 0 dBFS; allowed: minDb < value <= +24.
    gain: 1 // Default: 1; allowed: > 0.
};

let image = null;
let imageColumns = null;
let sourceCapacity = 0;
let imageBins = 0;
let imageRate = 0;
let rasterHeight = 0;
let displayCapacity = 0;
let displayNext = 0;
let displayValid = 0;
let phaseMs = 0;
let bestOverlapMs = 0;
let lastNext = 0;
let lastValid = 0;
let lastSourceAt = 0;
let frequencyRows = [];
let rasterPixels = new Uint32Array(0);
let candidatePixels = new Uint32Array(0);

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// A row maps to either two interpolated FFT bins (narrow frequencies) or
// a weighted average of bin powers (wide frequency bands), matching the
// built-in Spectrogram frequency rasterization.
function makeFrequencyRows(height, fftBins, sampleRate) {
    const nyquist = sampleRate * 0.5;
    const minimum = Math.min(source.minFrequency, nyquist * 0.5);
    const maximum = Math.max(minimum + 1, Math.min(source.maxFrequency, nyquist * 0.96));
    const half = fftBins - 1;
    const fftScale = 2 * half / sampleRate;
    const rows = [];

    function frequency(t) {
        return source.scale === "log"
            ? minimum * Math.pow(maximum / minimum, t)
            : minimum + (maximum - minimum) * t;
    }

    for (let y = 0; y < height; ++y) {
        const f0 = frequency(1 - (y + 1) / height);
        const f1 = frequency(1 - y / height);
        const p0 = f0 * fftScale, p1 = f1 * fftScale;
        if (p1 - p0 < 1) {
            const center = source.scale === "log" ? Math.sqrt(f0 * f1) : (f0 + f1) * 0.5;
            const pos = clamp(center * fftScale, 1, half);
            const first = Math.floor(pos);
            const fraction = pos - first;
            const sharpness = clamp(Math.log(Math.max(1, center) / 250) / Math.log(4), 0, 1);
            const smooth = fraction * fraction * (3 - 2 * fraction);
            rows.push({ first, last: Math.min(half, first + 1),
                mix: fraction + (smooth - fraction) * sharpness });
        } else {
            const first = clamp(Math.floor(Math.max(0, p0) + 0.5), 1, half);
            const last = clamp(Math.ceil(Math.max(0, p1) + 0.5), first + 1, half + 1);
            const coverage = center => clamp(Math.min(p1, center + 0.5) -
                Math.max(p0, center - 0.5), 0, 1);
            rows.push({ first, last, firstWeight: coverage(first),
                lastWeight: coverage(last - 1) });
        }
    }
    return rows;
}

function binLevel(columns, offset, row) {
    const gain = source.gain;
    const minDb = source.minDb;
    const spanDb = source.maxDb - minDb;
    let db;

    if (row.mix !== undefined) {
        const a = 20 * Math.log10(Math.max(1e-12, columns[offset + row.first] * gain));
        const b = 20 * Math.log10(Math.max(1e-12, columns[offset + row.last] * gain));
        db = a + (b - a) * row.mix;
    } else {
        let power = 0, weight = 0;
        for (let bin = row.first; bin < row.last; ++bin) {
            const w = bin === row.first ? row.firstWeight :
                bin === row.last - 1 ? row.lastWeight : 1;
            const magnitude = Math.max(0, columns[offset + bin]);
            power += w * magnitude * magnitude;
            weight += w;
        }
        db = 20 * Math.log10(Math.max(1e-12,
            Math.sqrt(power / Math.max(weight, 1e-12)) * gain));
    }
    return clamp((db - minDb) / spanDb, 0, 1);
}

function rasterizeSourceColumn(columns, offset) {
    for (let row = 0; row < rasterHeight; ++row) {
        const level = binLevel(columns, offset, frequencyRows[row]);
        const shade = 32 + Math.round(level * (194 - 32));
        rasterPixels[row] = (0xff000000 | (shade << 16) | (shade << 8) | shade) >>> 0;
    }
}

function writeDisplayColumn(bitmapGraphics, column, pixels) {
    // Merge equal vertical shades into runs. This keeps the JS example simple
    // without issuing two FillSolidRect calls for every individual pixel.
    let first = 0;
    let color = pixels[0];
    for (let row = 1; row <= rasterHeight; ++row) {
        if (row !== rasterHeight && pixels[row] === color) continue;
        const count = row - first;
        bitmapGraphics.FillSolidRect(column, first, 1, count, color);
        bitmapGraphics.FillSolidRect(column + displayCapacity, first, 1, count, color);
        if (row !== rasterHeight) {
            first = row;
            color = pixels[row];
        }
    }
}

function appendSourceColumn(bitmapGraphics, columns, offset) {
    rasterizeSourceColumn(columns, offset);

    let remaining = source.columnIntervalMs;
    while (remaining > 1e-8) {
        const take = Math.min(remaining, displayMsPerPixel - phaseMs);
        // Like the built-in display, choose one real FFT frame for each
        // finished physical pixel: the frame with the greatest time overlap.
        if (take > bestOverlapMs) {
            candidatePixels.set(rasterPixels);
            bestOverlapMs = take;
        }
        phaseMs += take;
        remaining -= take;

        if (phaseMs + 1e-7 >= displayMsPerPixel) {
            writeDisplayColumn(bitmapGraphics, displayNext, candidatePixels);
            displayNext = (displayNext + 1) % displayCapacity;
            displayValid = Math.min(displayValid + 1, displayCapacity);
            phaseMs = 0;
            bestOverlapMs = 0;
        }
    }
}

// Callback data (owned and reused by JSplitter):
//   data.columns:         Float32Array of linear FFT magnitudes, column-major.
//   data.fftBins:         Number of frequency bins per FFT column.
//   data.sampleRate:      Audio sample rate in Hz.
//   data.capacityColumns: Number of slots in the circular source history.
//   data.validColumns:    Number of filled slots (0..capacityColumns).
//   data.nextColumn:      Next source write slot (newest is nextColumn - 1, modulo capacity).
//   data.full:            The source history was rebuilt; rebuild retained display pixels.
const spectrogram = vis.Create(VisSourceType.Spectrogram, source, (gr, x, y, w, h, data) => {
    const { columns, fftBins, sampleRate, capacityColumns, validColumns, nextColumn, full } = data;
    if (!capacityColumns || !fftBins || !sampleRate || !validColumns || w <= 0 || h <= 0) return;

    const height = Math.max(1, Math.round(h));
    const neededDisplayCapacity = Math.max(Math.ceil(w) + 2,
        Math.ceil(capacityColumns * source.columnIntervalMs / displayMsPerPixel) + 2);
    const rebuild = !image || columns !== imageColumns || capacityColumns !== sourceCapacity ||
        fftBins !== imageBins || sampleRate !== imageRate || height !== rasterHeight ||
        neededDisplayCapacity > displayCapacity || validColumns < lastValid ||
        (full && (nextColumn !== lastNext || validColumns !== lastValid));

    if (rebuild) {
        rasterHeight = height;
        displayCapacity = neededDisplayCapacity;
        image = gdi.CreateImage(displayCapacity * 2, rasterHeight);
        imageColumns = columns;
        sourceCapacity = capacityColumns;
        imageBins = fftBins;
        imageRate = sampleRate;
        displayNext = 0;
        displayValid = 0;
        phaseMs = 0;
        bestOverlapMs = 0;
        frequencyRows = makeFrequencyRows(rasterHeight, fftBins, sampleRate);
        rasterPixels = new Uint32Array(rasterHeight);
        candidatePixels = new Uint32Array(rasterHeight);

        const bitmapGraphics = image.GetGraphics();
        try {
            bitmapGraphics.FillSolidRect(0, 0, displayCapacity * 2, rasterHeight, backgroundColor);
            const first = (nextColumn + capacityColumns - validColumns) % capacityColumns;
            for (let c = 0; c < validColumns; ++c) {
                const column = (first + c) % capacityColumns;
                appendSourceColumn(bitmapGraphics, columns, column * fftBins);
            }
        } finally {
            image.ReleaseGraphics(bitmapGraphics);
        }
        lastSourceAt = Date.now();
    } else {
        let count = (nextColumn + capacityColumns - lastNext) % capacityColumns;
        if (validColumns > lastValid && count === 0) count = validColumns - lastValid;
        count = Math.min(count, validColumns);

        if (count > 0) {
            const bitmapGraphics = image.GetGraphics();
            try {
                const first = (nextColumn + capacityColumns - count) % capacityColumns;
                for (let c = 0; c < count; ++c) {
                    const column = (first + c) % capacityColumns;
                    appendSourceColumn(bitmapGraphics, columns, column * fftBins);
                }
            } finally {
                image.ReleaseGraphics(bitmapGraphics);
            }
            lastSourceAt = Date.now();
        }
    }

    lastNext = nextColumn;
    lastValid = validColumns;
    if (!displayValid) return;

    const pixelWidth = Math.max(1, Math.floor(w));
    const visible = Math.min(displayValid, pixelWidth);
    const blank = pixelWidth - visible;
    const elapsedMs = lastSourceAt ? Math.min(Date.now() - lastSourceAt, source.columnIntervalMs) : 0;
    const scrollPixels = (phaseMs + elapsedMs) / displayMsPerPixel;
    const shift = Math.min(pixelWidth - 1, Math.max(0, Math.floor(scrollPixels + 0.5)));
    const firstScreenColumn = Math.max(shift, blank);
    const destinationStart = firstScreenColumn - shift;
    const dataCount = pixelWidth - firstScreenColumn;

    gr.SetInterpolationMode(InterpolationMode.NearestNeighbor);
    try {
        if (dataCount > 0) {
            const sourceStart = (displayNext + displayCapacity - pixelWidth + firstScreenColumn) % displayCapacity;
            gr.DrawImage(image, x + destinationStart, y, dataCount, rasterHeight,
                sourceStart, 0, dataCount, rasterHeight);
        }
        if (shift > 0) {
            const newest = (displayNext + displayCapacity - 1) % displayCapacity;
            gr.DrawImage(image, x + pixelWidth - shift, y, shift, rasterHeight,
                newest, 0, 1, rasterHeight);
        }
    } finally {
        gr.SetInterpolationMode(InterpolationMode.Default);
    }
});

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, backgroundColor);
    if (w > 0 && h > 0) spectrogram.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), 16.6667);
