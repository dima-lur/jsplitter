'use strict';

// Worker sample 3: Fractal Renderer
// Demonstrates: CPU-bound Worker work, stable local pan/zoom preview,
// settled-view rendering, stale-frame rejection and transferable bitmap frames.
// The in-panel Renderer switch recreates the Worker so the same gdi.* facade can be
// compared in GDI+ and Direct2D modes.
let drawMode = 1;
window.DrawMode = drawMode;

const DT_LEFT = 0x0000;
const DT_CENTER = 0x0001;
const DT_VCENTER = 0x0004;
const DT_SINGLELINE = 0x0020;
const DT_NOPREFIX = 0x0800;

const VIEW_DEBOUNCE_MS = 80;
const MAX_ITERATIONS = 220;
const PREVIEW_INTERPOLATION = 2; // InterpolationMode.HighQuality
let INFO_FONT = gdi.Font('Segoe UI', 13);
let switchingRenderer = false;
const DEFAULT_VIEW = { centerX: -0.65, centerY: 0.0, scale: 2.8 };

let frame = null;
let frameView = null;
let previewFrame = null;
let previewView = null;
let previewActive = false;
let view = { ...DEFAULT_VIEW };
let viewId = 0;
let viewDirty = true;
let mouseX = 0;
let mouseY = 0;
let drag = null;
let wheelActive = false;
let sendTimer = 0;

const workerSource = String.raw`
'use strict';

function getPalette(maxIterations) {
    const palette = new Uint32Array(maxIterations + 1);
    for (let iteration = 0; iteration < maxIterations; ++iteration) {
        const t = iteration / maxIterations;
        const r = Math.floor(255 * Math.min(1, 9 * (1 - t) * t * t * t));
        const g = Math.floor(255 * Math.min(1, 15 * (1 - t) * (1 - t) * t * t));
        const b = Math.floor(255 * Math.min(1, 8.5 * (1 - t) * (1 - t) * (1 - t) * t));
        palette[iteration] = (0xFF000000 | (r << 16) | (g << 8) | b) >>> 0;
    }
    palette[maxIterations] = 0xFF0C0808;
    return palette;
}

const palettes = new Map();

function paletteFor(maxIterations) {
    let palette = palettes.get(maxIterations);
    if (!palette) {
        palette = getPalette(maxIterations);
        palettes.set(maxIterations, palette);
    }
    return palette;
}

function createRenderJob(width, height, centerX, centerY, scale, maxIterations) {
    const pixels = new Uint8Array(width * height * 4);
    return {
        width,
        height,
        centerX,
        centerY,
        scale,
        maxIterations,
        pixels,
        pixel32: new Uint32Array(pixels.buffer),
        palette: paletteFor(maxIterations),
        xStep: scale * (width / Math.max(1, height)) / width,
        yStep: scale / height,
        left: centerX - scale * (width / Math.max(1, height)) * 0.5,
        top: centerY - scale * 0.5,
        y: 0
    };
}

function renderRow(job, y) {
    const cy = job.top + y * job.yStep;
    const row = y * job.width;

    for (let x = 0; x < job.width; ++x) {
        const cx = job.left + x * job.xStep;
        const xm = cx - 0.25;
        const q = xm * xm + cy * cy;
        let iteration = job.maxIterations;

        // Main cardioid and period-2 bulb are known to be inside the set.
        if (q * (q + xm) > 0.25 * cy * cy && (cx + 1) * (cx + 1) + cy * cy > 0.0625) {
            let zx = 0;
            let zy = 0;
            let zx2 = 0;
            let zy2 = 0;
            iteration = 0;

            while (zx2 + zy2 <= 4 && iteration < job.maxIterations) {
                zy = 2 * zx * zy + cy;
                zx = zx2 - zy2 + cx;
                zx2 = zx * zx;
                zy2 = zy * zy;
                ++iteration;
            }
        }

        job.pixel32[row + x] = job.palette[iteration];
    }
}

function finishBitmap(job) {
    // In DrawMode 0 this is a GdiBitmap; in DrawMode 1 the same gdi.* call
    // is routed to the Worker's Direct2D backend and returns a D2DBitmap.
    return gdi.CreateImageFromPixelData(job.pixels, job.width, job.height, 'bgra32');
}

function renderBitmap(width, height, centerX, centerY, scale, maxIterations) {
    const job = createRenderJob(width, height, centerX, centerY, scale, maxIterations);
    for (; job.y < job.height; ++job.y) renderRow(job, job.y);
    return finishBitmap(job);
}

onmessage = function (event) {
    const current = event.data;
    const bitmap = renderBitmap(
        current.width,
        current.height,
        current.centerX,
        current.centerY,
        current.scale,
        current.maxIterations
    );

    if (bitmap) {
        postMessage({
            viewId: current.viewId,
            width: current.width,
            height: current.height,
            centerX: current.centerX,
            centerY: current.centerY,
            scale: current.scale,
            bitmap
        }, [bitmap]);
    }
};
`;

let worker = null;

function startWorker() {
    switchingRenderer = true;
    if (worker) worker.terminate();

    frame = null;
    frameView = null;
    previewFrame = null;
    previewView = null;
    previewActive = false;
    wheelActive = false;
    if (sendTimer) {
        clearTimeout(sendTimer);
        sendTimer = 0;
    }

    try {
        window.DrawMode = drawMode;
        INFO_FONT = gdi.Font('Segoe UI', 13);
    } finally {
        switchingRenderer = false;
    }

    const currentWorker = new Worker(workerSource, 'fractal-renderer');
    worker = currentWorker;

    currentWorker.onmessage = function (event) {
        const data = event.data;
        if (worker !== currentWorker || data.viewId !== viewId || drag || wheelActive) return;

        frame = data.bitmap;
        frameView = {
            width: data.width,
            height: data.height,
            centerX: data.centerX,
            centerY: data.centerY,
            scale: data.scale
        };
        previewFrame = null;
        previewView = null;
        previewActive = false;
        window.Repaint();
    };

    currentWorker.onerror = function (event) {
        if (worker === currentWorker) console.log(`Worker error: ${event.message}`);
    };

    invalidateView();
    sendView();
    window.Repaint();
}

function invalidateView() {
    ++viewId;
    viewDirty = true;
}

function sendView() {
    sendTimer = 0;
    if (!viewDirty || window.Width <= 0 || window.Height <= 0 || !worker) return;

    viewDirty = false;
    worker.postMessage({
        type: 'render',
        viewId,
        width: window.Width,
        height: window.Height,
        centerX: view.centerX,
        centerY: view.centerY,
        scale: view.scale,
        maxIterations: MAX_ITERATIONS
    });
}

function queueView() {
    if (sendTimer) clearTimeout(sendTimer);
    sendTimer = setTimeout(function () {
        sendTimer = 0;
        wheelActive = false;
        if (!drag) sendView();
    }, VIEW_DEBOUNCE_MS);
}

function flushView() {
    if (sendTimer) {
        clearTimeout(sendTimer);
        sendTimer = 0;
    }
    wheelActive = false;
    sendView();
}

function screenToWorld(x, y, currentView = view) {
    const width = Math.max(1, window.Width);
    const height = Math.max(1, window.Height);
    const aspect = width / height;
    return {
        x: currentView.centerX + (x / width - 0.5) * currentView.scale * aspect,
        y: currentView.centerY + (y / height - 0.5) * currentView.scale
    };
}

function frameSlice(sourceView) {
    if (!sourceView || window.Width <= 0 || window.Height <= 0) return null;

    const viewAspect = window.Width / window.Height;
    const viewWorldW = view.scale * viewAspect;
    const viewLeft = view.centerX - viewWorldW * 0.5;
    const viewTop = view.centerY - view.scale * 0.5;
    const viewRight = viewLeft + viewWorldW;
    const viewBottom = viewTop + view.scale;

    const frameAspect = sourceView.width / Math.max(1, sourceView.height);
    const frameWorldW = sourceView.scale * frameAspect;
    const frameLeft = sourceView.centerX - frameWorldW * 0.5;
    const frameTop = sourceView.centerY - sourceView.scale * 0.5;
    const frameRight = frameLeft + frameWorldW;
    const frameBottom = frameTop + sourceView.scale;

    const left = Math.max(viewLeft, frameLeft);
    const top = Math.max(viewTop, frameTop);
    const right = Math.min(viewRight, frameRight);
    const bottom = Math.min(viewBottom, frameBottom);
    if (right <= left || bottom <= top) return null;

    return {
        sx: (left - frameLeft) / frameWorldW * sourceView.width,
        sy: (top - frameTop) / sourceView.scale * sourceView.height,
        sw: (right - left) / frameWorldW * sourceView.width,
        sh: (bottom - top) / sourceView.scale * sourceView.height,
        dx: (left - viewLeft) / viewWorldW * window.Width,
        dy: (top - viewTop) / view.scale * window.Height,
        dw: (right - left) / viewWorldW * window.Width,
        dh: (bottom - top) / view.scale * window.Height
    };
}

function beginPreview() {
    if (previewActive) return;
    previewFrame = frame;
    previewView = frameView;
    previewActive = !!previewFrame;
}

function on_size() {
    beginPreview();
    invalidateView();
    window.Repaint();
    queueView();
}

function on_mouse_move(x, y) {
    mouseX = x;
    mouseY = y;

    if (!drag || window.Width <= 0 || window.Height <= 0) return;

    const aspect = window.Width / Math.max(1, window.Height);
    view.centerX = drag.centerX - (x - drag.x) / window.Width * drag.scale * aspect;
    view.centerY = drag.centerY - (y - drag.y) / window.Height * drag.scale;

    invalidateView();

    // Interaction is immediate and uses one stable completed bitmap for the
    // entire drag. The Worker is not fed intermediate drag positions.
    window.Repaint();
}

const RENDERER_GDI = { x: 82, y: 8, w: 46, h: 26 };
const RENDERER_D2D = { x: 132, y: 8, w: 52, h: 26 };

function contains(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function on_mouse_lbtn_down(x, y) {
    if (contains(RENDERER_GDI, x, y) || contains(RENDERER_D2D, x, y)) return;

    mouseX = x;
    mouseY = y;
    beginPreview();
    drag = {
        x,
        y,
        centerX: view.centerX,
        centerY: view.centerY,
        scale: view.scale
    };
}

function on_mouse_lbtn_up(x, y) {
    if (contains(RENDERER_GDI, x, y) || contains(RENDERER_D2D, x, y)) {
        const nextMode = contains(RENDERER_D2D, x, y) ? 1 : 0;
        drag = null;
        if (nextMode !== drawMode) {
            if (sendTimer) {
                clearTimeout(sendTimer);
                sendTimer = 0;
            }
            drawMode = nextMode;
            startWorker();
        }
        return;
    }

    if (!drag) return;
    drag = null;
    if (viewDirty) flushView();
}

function on_mouse_wheel(step) {
    if (window.Width <= 0 || window.Height <= 0 || !step) return;

    if (!wheelActive) beginPreview();

    const before = screenToWorld(mouseX, mouseY);
    const factor = Math.pow(0.82, step);
    view.scale = Math.max(1e-12, Math.min(4.0, view.scale * factor));
    const after = screenToWorld(mouseX, mouseY);
    view.centerX += before.x - after.x;
    view.centerY += before.y - after.y;

    wheelActive = true;
    invalidateView();

    // Zoom one stable completed frame locally for the whole wheel burst.
    // Only the final viewport is rendered after the burst settles.
    window.Repaint();
    queueView();
}

function on_mouse_rbtn_up() {
    beginPreview();
    view = { ...DEFAULT_VIEW };
    drag = null;
    wheelActive = false;
    invalidateView();
    window.Repaint();
    flushView();
    return true;
}

function drawChoice(gr, rect, text, selected) {
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h, selected ? 0xFF355D7A : 0xFF20262E);
    gr.DrawText(text, INFO_FONT, selected ? 0xFFFFFFFF : 0xFFB7C1CB,
        rect.x, rect.y, rect.w, rect.h, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, 0xFF101014);
    if (switchingRenderer) return;
    const shownFrame = previewActive && previewFrame ? previewFrame : frame;
    const shownView = previewActive && previewFrame ? previewView : frameView;
    if (shownFrame) {
        const slice = frameSlice(shownView);
        if (slice) {
            gr.SetInterpolationMode(PREVIEW_INTERPOLATION);
            gr.DrawImage(shownFrame, slice.dx, slice.dy, slice.dw, slice.dh, slice.sx, slice.sy, slice.sw, slice.sh);
        }
    }

    gr.FillSolidRect(8, 8, Math.max(1, Math.min(window.Width - 16, 520)), 26, 0xC0101318);
    gr.DrawText('Renderer:', INFO_FONT, 0xFFB7C1CB, 14, 8, 66, 26,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, RENDERER_GDI, 'GDI', drawMode === 0);
    drawChoice(gr, RENDERER_D2D, 'D2D', drawMode === 1);
    gr.DrawText('Wheel: zoom   Drag: pan   Right click: reset', INFO_FONT, 0xFFE8EDF2,
        196, 8, Math.max(1, window.Width - 210), 26, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

startWorker();
