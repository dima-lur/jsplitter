// JSplitter WebAssembly demo: album-art Sobel filters in a real Worker.
// Installed at component/samples/wasm. Load this file via Script > File.
// Worker and WASM paths are resolved relative to their calling script.
// Use GDI mode (DrawMode = 0). No packages, Emscripten or WASI needed.
//
// LEFT CLICK: next filter (Pencil / Neon / Ink).
// MOUSE WHEEL: increase/decrease edge threshold.
// RIGHT CLICK: refresh currently playing or selected album art.
// If there is no cover, a generated example image is used automatically.

window.DefineScript('WebAssembly Image Filters');
window.DrawMode = 0;
const IMAGE_LIMIT = 384;
const MODES = ['Pencil', 'Neon', 'Ink'];
const fontTitle = gdi.Font('Segoe UI', 16, 1);
const fontBody = gdi.Font('Segoe UI', 12);
const fontSmall = gdi.Font('Segoe UI', 11);
const COLOR_BG = 0xff111820;
const COLOR_TEXT = 0xffe7edf3;
const COLOR_MUTED = 0xffaab9c6;

let worker = null;
let original = null;
let filtered = null;
let mode = 0;
let threshold = 180;
let revision = 0;
let requestId = 0;
let resultTimeMs = 0;
let edgeCount = 0;
let label = 'Loading…';
let status = 'Initializing WebAssembly…';
let loaded = false;

function createFallback() {
    // Procedural image - the example works even without playback or album art.
    const n = IMAGE_LIMIT;
    const pixels = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; ++y) {
        for (let x = 0; x < n; ++x) {
            const at = (y * n + x) * 4;
            const dx = x - n / 2;
            const dy = y - n / 2;
            const radius = Math.sqrt(dx * dx + dy * dy);
            const ring = Math.sin(radius * 0.11) > 0.25;
            const square = x > 75 && x < 310 && y > 86 && y < 295;
            const lines = Math.sin(x * 0.12 + y * 0.03) > 0.85;
            pixels[at] = square ? 245 : (ring ? 45 : 30 + x * 160 / n);
            pixels[at + 1] = square ? (lines ? 48 : 110) : (ring ? 200 : 42 + y * 120 / n);
            pixels[at + 2] = square ? (lines ? 40 : 200) : (ring ? 210 : 165);
            pixels[at + 3] = 255;
        }
    }
    return gdi.CreateImageFromPixelData(pixels, n, n, 'rgba32');
}

function loadArtwork() {
    if (!loaded) return;
    let image = null;
    let name = 'Generated example';
    try {
        const handle = fb.GetNowPlaying() || fb.GetFocusItem();
        if (handle) {
            // GDI bitmap returned by JSplitter in DrawMode 0.
            image = utils.GetAlbumArtV2(handle, 0, false);
            if (image) name = 'Album art';
        }
    } catch (e) {
        console.log('Album-art lookup: ' + e);
    }
    if (!image) image = createFallback();
    if (!image) {
        status = 'Unable to create source image';
        window.Repaint();
        return;
    }

    // Bound both the work and the transfer size; preserve the aspect ratio.
    const scale = Math.min(1, IMAGE_LIMIT / Math.max(image.Width, image.Height));
    const w = Math.max(3, Math.round(image.Width * scale));
    const h = Math.max(3, Math.round(image.Height * scale));
    original = (w === image.Width && h === image.Height) ? image : image.Resize(w, h);
    const pixels = original.GetPixelData('rgba32');
    if (!pixels || pixels.length !== w * h * 4) {
        status = 'GetPixelData(rgba32) failed';
        window.Repaint();
        return;
    }

    filtered = null;
    label = name;
    status = 'Processing…';
    ++revision;
    ++requestId;
    worker.postMessage({
        type: 'load', width: w, height: h,
        pixels, threshold, mode, revision, requestId
    }, [pixels.buffer]);
    window.Repaint();
}

function refilter() {
    if (!loaded || !original) return;
    status = 'Processing…';
    ++requestId;
    worker.postMessage({type: 'filter', threshold, mode, revision, requestId});
    window.Repaint();
}

worker = new Worker({file: 'WebAssembly Image Filters.worker.js'}, 'WASM Image Filters');
worker.onmessage = function (e) {
    const m = e.data;
    if (m.type === 'ready') {
        loaded = true;
        loadArtwork();
    } else if (m.type === 'result') {
        // Ignore stale frames after an artwork change or a newer filter request.
        if (m.revision !== revision || m.requestId !== requestId) return;
        filtered = gdi.CreateImageFromPixelData(m.pixels, m.width, m.height, 'rgba32');
        resultTimeMs = m.elapsedMs;
        edgeCount = m.edgeCount;
        status = filtered ? 'Ready' : 'Bitmap creation failed';
        window.Repaint();
    } else if (m.type === 'error') {
        status = m.message;
        console.log('WebAssembly sample: ' + status);
        window.Repaint();
    }
};
worker.onerror = function (e) {
    status = 'Worker error';
    console.log(status + ': ' + e.message);
    window.Repaint();
};

function on_paint(gr) {
    const w = window.Width;
    const h = window.Height;
    gr.FillSolidRect(0, 0, w, h, COLOR_BG);
    gr.DrawString('WebAssembly · Album Art Filters', fontTitle, COLOR_TEXT, 15, 10, w - 30, 29);
    gr.DrawString('Original', fontBody, COLOR_MUTED, 15, 47, w / 2 - 20, 22);
    gr.DrawString('WASM: ' + MODES[mode], fontBody, COLOR_MUTED, w / 2 + 8, 47, w / 2 - 20, 22);
    const contentTop = 73;
    const contentBottom = Math.max(contentTop, h - 65);
    const tileW = Math.max(0, (w - 42) / 2);
    const tileH = Math.max(0, contentBottom - contentTop);

    function paintTile(image, x) {
        if (!image || tileW < 3 || tileH < 3) return;
        const scale = Math.min(tileW / image.Width, tileH / image.Height);
        const iw = image.Width * scale;
        const ih = image.Height * scale;
        gr.DrawImage(image, x + (tileW - iw) / 2, contentTop + (tileH - ih) / 2,
            iw, ih, 0, 0, image.Width, image.Height);
    }
    paintTile(original, 15);
    paintTile(filtered, w / 2 + 6);
    const footer = Math.max(contentTop + 5, h - 54);
    gr.DrawString(label + '  ·  ' + status, fontSmall, COLOR_TEXT, 15, footer, w - 25, 18);
    gr.DrawString('Click: filter  |  Wheel: threshold (' + threshold +
        ')  |  Right-click: refresh  |  WASM: ' + resultTimeMs.toFixed(2) +
        ' ms  |  Edges: ' + edgeCount,
        fontSmall, COLOR_MUTED, 15, footer + 21, w - 25, 21);
}

function on_mouse_lbtn_up() {
    mode = (mode + 1) % MODES.length;
    refilter();
}

function on_mouse_wheel(step) {
    threshold = Math.max(0, Math.min(600, threshold + (step > 0 ? 20 : -20)));
    refilter();
}

function on_mouse_rbtn_up() {
    loadArtwork();
    return true;
}

function on_playback_new_track() { loadArtwork(); }
function on_playback_stop() { loadArtwork(); }
// The script automatically disposes the Worker when the panel unloads.
// Closing it manually is not needed here because it lives with this panel.
