'use strict';

// Worker sample 4: Playlist Album Gallery
// Demonstrates: cloning playlist handles, Worker-side album deduplication, asynchronous
// artwork loading, thumbnail resizing and transferring GDI/D2D images back to a live panel UI.
// Engine switches between the panel-side baseline and the Worker pipeline so the effect on
// UI responsiveness and useful artwork concurrency can be compared directly.
// Mouse wheel changes cover size. Only the albums that fit in the current viewport are
// requested, and every settled size reloads them from scratch on purpose: this sample has
// no artwork cache. Each image is resized in the Worker so its shorter side matches the
// current cover size; panel drawing then only crops the already-small thumbnail. In Worker mode
// resize runs in the Worker; in Main mode it deliberately runs in the panel realm as a baseline.
// Images are drawn directly in on_paint as they arrive; no offscreen gallery bitmap is composed.
// Concurrency controls how many album-art
// promises may be in flight at once. Worker GDI uses the runtime's eager WIC decode path, while
// Main GDI keeps the legacy GDI+ path. The status separates first display, load, panel receive/display, and paint cost.

let engine = 'worker';
let drawMode = 1;
window.DrawMode = drawMode;

const DT_LEFT = 0x0000;
const DT_CENTER = 0x0001;
const DT_VCENTER = 0x0004;
const DT_SINGLELINE = 0x0020;
const DT_NOPREFIX = 0x0800;
const DT_END_ELLIPSIS = 0x8000;

const MARGIN = 12;
const HEADER_H = 64;
const GAP = 10;
const TEXT_H = 38;
const COVER_MIN = 72;
const COVER_MAX = 288;
const COVER_STEP = 16;
const LOAD_DEBOUNCE_MS = 70;
const CONCURRENCY_CHOICES = [4, 8, 16, 0];

let coverSize = 144;
let switchingRenderer = false;
let worker = null;
let generation = 0;
let loadRequestId = 0;
let loadTimer = 0;
let lastCapacity = 0;
let concurrency = 8;
let mainLoadToken = 0;

let playlistName = '';
let albums = [];
let images = [];
let loadState = { requestId: 0, count: 0, completed: 0, loaded: 0, firstDisplayElapsed: 0, loadElapsed: 0, receiveElapsed: 0, displayElapsed: 0, paintCount: 0, paintElapsed: 0, started: 0, active: false };

let TITLE_FONT;
let INFO_FONT;
let ALBUM_FONT;
let META_FONT;

function createFonts() {
    TITLE_FONT = gdi.Font('Segoe UI', 15, 1);
    INFO_FONT = gdi.Font('Segoe UI', 11);
    ALBUM_FONT = gdi.Font('Segoe UI', 11, 1);
    META_FONT = gdi.Font('Segoe UI', 10);
}

createFonts();

function resizeArtwork(image, size) {
    if (!image || size <= 0) return image;

    const width = image.Width;
    const height = image.Height;
    if (width <= 0 || height <= 0) return image;

    let targetWidth;
    let targetHeight;
    if (width >= height) {
        targetHeight = size;
        targetWidth = Math.max(size, Math.round(width * size / height));
    } else {
        targetWidth = size;
        targetHeight = Math.max(size, Math.round(height * size / width));
    }

    if (targetWidth === width && targetHeight === height) return image;
    return image.Resize(targetWidth, targetHeight, 2);
}

function buildAlbumsMain(handles) {
    const artists = fb.TitleFormat('$if2(%album artist%,%artist%)').EvalWithMetadbs(handles);
    const titles = fb.TitleFormat('$if2(%album%,%title%)').EvalWithMetadbs(handles);
    const years = fb.TitleFormat('$if2($year(%date%),)').EvalWithMetadbs(handles);
    const map = new Map();
    const result = [];

    for (let i = 0; i < handles.Count; ++i) {
        const artist = artists[i] || '(unknown artist)';
        const title = titles[i] || '(unknown album)';
        const year = years[i] || '';
        const key = artist + '\0' + title;

        let album = map.get(key);
        if (!album) {
            album = { artist, title, year, tracks: 0, handle: handles[i] };
            map.set(key, album);
            result.push(album);
        }
        ++album.tracks;
    }

    return result;
}

const workerSource = String.raw`
'use strict';

let currentGeneration = 0;
let activeLoadId = 0;
let albums = [];

function resizeArtwork(image, size) {
    if (!image || size <= 0) return image;

    const width = image.Width;
    const height = image.Height;
    if (width <= 0 || height <= 0) return image;

    let targetWidth;
    let targetHeight;
    if (width >= height) {
        targetHeight = size;
        targetWidth = Math.max(size, Math.round(width * size / height));
    } else {
        targetWidth = size;
        targetHeight = Math.max(size, Math.round(height * size / width));
    }

    if (targetWidth === width && targetHeight === height) return image;
    return image.Resize(targetWidth, targetHeight, 2);
}

function buildAlbums(handles) {
    const artists = fb.TitleFormat('$if2(%album artist%,%artist%)').EvalWithMetadbs(handles);
    const titles = fb.TitleFormat('$if2(%album%,%title%)').EvalWithMetadbs(handles);
    const years = fb.TitleFormat('$if2($year(%date%),)').EvalWithMetadbs(handles);
    const map = new Map();
    const result = [];

    for (let i = 0; i < handles.Count; ++i) {
        const artist = artists[i] || '(unknown artist)';
        const title = titles[i] || '(unknown album)';
        const year = years[i] || '';
        const key = artist + '\\0' + title;

        let album = map.get(key);
        if (!album) {
            album = { artist, title, year, tracks: 0, handle: handles[i] };
            map.set(key, album);
            result.push(album);
        }
        ++album.tracks;
    }

    return result;
}

function publicAlbums() {
    return albums.map(album => ({
        artist: album.artist,
        title: album.title,
        year: album.year,
        tracks: album.tracks
    }));
}

async function loadVisible(message) {
    const requestId = message.requestId;
    const generation = message.generation;
    const count = Math.min(Math.max(0, message.count | 0), albums.length);
    const requestedConcurrency = message.concurrency | 0;
    const coverSize = Math.max(1, message.coverSize | 0);
    const limit = requestedConcurrency > 0 ? Math.min(requestedConcurrency, count) : count;
    activeLoadId = requestId;
    const started = performance.now();
    let nextIndex = 0;

    async function runQueue() {
        while (generation === currentGeneration && requestId === activeLoadId) {
            const index = nextIndex++;
            if (index >= count) return;

            const album = albums[index];
            let image = null;
            try {
                const result = await utils.GetAlbumArtAsyncV2(0, album.handle, 0, false, false, false);
                if (result && result.image) image = resizeArtwork(result.image, coverSize);
            } catch (_) {
                image = null;
            }

            if (generation !== currentGeneration || requestId !== activeLoadId) return;

            const elapsed = performance.now() - started;
            if (image) {
                postMessage({ type: 'art', generation, requestId, index, elapsed, image }, [image]);
            } else {
                postMessage({ type: 'art', generation, requestId, index, elapsed, image: null });
            }
        }
    }

    const jobs = [];
    for (let i = 0; i < limit; ++i) jobs.push(runQueue());
    await Promise.all(jobs);
    if (generation !== currentGeneration || requestId !== activeLoadId) return;

    postMessage({
        type: 'complete',
        generation,
        requestId,
        elapsed: performance.now() - started
    });
}

onmessage = function (event) {
    const message = event.data;

    if (message.type === 'playlist') {
        currentGeneration = message.generation;
        activeLoadId = 0;
        albums = buildAlbums(message.handles);
        postMessage({
            type: 'catalog',
            generation: currentGeneration,
            playlistName: message.playlistName || '',
            albums: publicAlbums()
        });
        return;
    }

    if (message.type === 'cancel') {
        if (message.generation === currentGeneration) activeLoadId = 0;
        return;
    }

    if (message.type === 'load' && message.generation === currentGeneration) {
        loadVisible(message);
    }
};
`;

function engineRects() {
    const y = 7;
    const x = Math.max(8, window.Width - 342);
    return {
        label: { x, y, w: 46, h: 26 },
        main: { x: x + 48, y, w: 48, h: 26 },
        worker: { x: x + 100, y, w: 60, h: 26 }
    };
}

function rendererRects() {
    const y = 7;
    const x = Math.max(8, window.Width - 342) + 168;
    return {
        label: { x, y, w: 62, h: 26 },
        gdi: { x: x + 64, y, w: 48, h: 26 },
        d2d: { x: x + 116, y, w: 54, h: 26 }
    };
}

function concurrencyRects() {
    const y = 34;
    const x = Math.max(8, window.Width - 246);
    return {
        label: { x, y, w: 78, h: 24 },
        choices: [
            { value: 4, rect: { x: x + 80, y, w: 30, h: 24 }, text: '4' },
            { value: 8, rect: { x: x + 114, y, w: 30, h: 24 }, text: '8' },
            { value: 16, rect: { x: x + 148, y, w: 34, h: 24 }, text: '16' },
            { value: 0, rect: { x: x + 186, y, w: 48, h: 24 }, text: 'All' }
        ]
    };
}

function contains(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function drawChoice(gr, rect, text, selected) {
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h, selected ? 0xFF355D7A : 0xFF20262E);
    gr.DrawText(text, INFO_FONT, selected ? 0xFFFFFFFF : 0xFFB7C1CB,
        rect.x, rect.y, rect.w, rect.h, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

function getLayout() {
    const contentW = Math.max(1, window.Width - MARGIN * 2);
    const contentH = Math.max(1, window.Height - HEADER_H - MARGIN);
    const cellW = coverSize;
    const cellH = coverSize + TEXT_H;

    const columns = Math.max(1, Math.floor((contentW + GAP) / (cellW + GAP)));
    const rows = Math.max(1, Math.floor((contentH + GAP) / (cellH + GAP)));
    const capacity = columns * rows;
    const totalW = columns * cellW + (columns - 1) * GAP;
    const firstX = MARGIN + Math.max(0, Math.floor((contentW - totalW) * 0.5));

    return { columns, rows, capacity, firstX, top: HEADER_H, cellW, cellH };
}

function tileRect(index, layout) {
    const col = index % layout.columns;
    const row = Math.floor(index / layout.columns);
    return {
        x: layout.firstX + col * (layout.cellW + GAP),
        y: layout.top + row * (layout.cellH + GAP),
        w: layout.cellW,
        h: layout.cellH
    };
}

function drawCover(gr, image, x, y, size) {
    const srcAspect = image.Width / image.Height;
    let sx = 0;
    let sy = 0;
    let sw = image.Width;
    let sh = image.Height;

    if (srcAspect > 1) {
        sw = image.Height;
        sx = (image.Width - sw) * 0.5;
    } else if (srcAspect < 1) {
        sh = image.Width;
        sy = (image.Height - sh) * 0.5;
    }

    gr.DrawImage(image, x, y, size, size, sx, sy, sw, sh);
}

function statusText() {
    const visible = Math.min(albums.length, getLayout().capacity);
    let text = coverSize + ' px  •  visible ' + visible + '/' + albums.length;

    if (loadState.count) {
        text += '  •  ' + loadState.completed + '/' + loadState.count;
        if (loadState.firstDisplayElapsed > 0) text += '  •  first ' + loadState.firstDisplayElapsed.toFixed(0) + ' ms';
        if (loadState.loadElapsed > 0) text += '  •  load ' + loadState.loadElapsed.toFixed(0) + ' ms';
        if (loadState.receiveElapsed > 0) text += '  •  receive ' + loadState.receiveElapsed.toFixed(0) + ' ms';
        if (loadState.displayElapsed > 0) text += '  •  display ' + loadState.displayElapsed.toFixed(0) + ' ms';
        if (loadState.paintCount > 0) text += '  •  paints ' + loadState.paintCount + '/' + loadState.paintElapsed.toFixed(0) + ' ms';
    }

    return text;
}

async function loadVisibleMain(requestId, count, token) {
    const started = performance.now();
    const limit = concurrency > 0 ? Math.min(concurrency, count) : count;
    let nextIndex = 0;

    async function runQueue() {
        while (engine === 'main' && token === mainLoadToken && requestId === loadState.requestId) {
            const index = nextIndex++;
            if (index >= count) return;

            const album = albums[index];
            let image = null;
            try {
                const result = await utils.GetAlbumArtAsyncV2(0, album.handle, 0, false, false, false);
                if (result && result.image) image = resizeArtwork(result.image, coverSize);
            } catch (_) {
                image = null;
            }

            if (engine !== 'main' || token !== mainLoadToken || requestId !== loadState.requestId) return;

            ++loadState.completed;
            if (image) {
                images[index] = image;
                ++loadState.loaded;
            }

            const elapsed = performance.now() - started;
            loadState.loadElapsed = elapsed;
            if (loadState.completed >= loadState.count && loadState.receiveElapsed <= 0) {
                loadState.receiveElapsed = elapsed;
            }

            const rect = tileRect(index, getLayout());
            window.RepaintRect(rect.x, rect.y, rect.w, rect.h);
            window.RepaintRect(MARGIN, 32, Math.max(1, window.Width - 220), 20);
        }
    }

    const jobs = [];
    for (let i = 0; i < limit; ++i) jobs.push(runQueue());
    await Promise.all(jobs);

    if (engine !== 'main' || token !== mainLoadToken || requestId !== loadState.requestId) return;

    const elapsed = performance.now() - started;
    loadState.active = false;
    loadState.loadElapsed = elapsed;
    if (loadState.receiveElapsed <= 0) loadState.receiveElapsed = elapsed;
    window.RepaintRect(MARGIN, 32, Math.max(1, window.Width - 220), 20);
}

function cancelCurrentLoad() {
    ++mainLoadToken;
    if (worker) worker.postMessage({ type: 'cancel', generation });
    loadState.active = false;
}

function beginVisibleLoad() {
    loadTimer = 0;
    if (!albums.length) return;
    if (engine === 'worker' && !worker) return;

    const count = Math.min(albums.length, getLayout().capacity);
    const requestId = ++loadRequestId;
    const token = ++mainLoadToken;

    images = new Array(count).fill(null);
    loadState = { requestId, count, completed: 0, loaded: 0, firstDisplayElapsed: 0, loadElapsed: 0, receiveElapsed: 0, displayElapsed: 0, paintCount: 0, paintElapsed: 0, started: performance.now(), active: true };

    if (engine === 'worker') {
        worker.postMessage({
            type: 'load',
            generation,
            requestId,
            count,
            concurrency,
            coverSize
        });
    } else {
        loadVisibleMain(requestId, count, token);
    }
    window.Repaint();
}

function scheduleVisibleLoad(delay = LOAD_DEBOUNCE_MS) {
    if (loadTimer) clearTimeout(loadTimer);
    cancelCurrentLoad();
    loadTimer = setTimeout(beginVisibleLoad, delay);
}

function sendPlaylist() {
    if (engine === 'worker' && !worker) return;

    if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = 0;
    }
    ++mainLoadToken;

    albums = [];
    images = [];
    loadState = { requestId: 0, count: 0, completed: 0, loaded: 0, firstDisplayElapsed: 0, loadElapsed: 0, receiveElapsed: 0, displayElapsed: 0, paintCount: 0, paintElapsed: 0, started: 0, active: false };
    lastCapacity = 0;

    const playlistIndex = plman.ActivePlaylist;
    const handles = playlistIndex >= 0 ? plman.GetPlaylistItems(playlistIndex) : fb.CreateHandleList();
    playlistName = playlistIndex >= 0 ? plman.GetPlaylistName(playlistIndex) : 'No active playlist';

    ++generation;
    if (engine === 'worker') {
        worker.postMessage({
            type: 'playlist',
            generation,
            playlistName,
            handles
        });
    } else {
        albums = buildAlbumsMain(handles);
        lastCapacity = getLayout().capacity;
        beginVisibleLoad();
    }
    window.Repaint();
}

function startEngine() {
    switchingRenderer = true;
    if (loadTimer) {
        clearTimeout(loadTimer);
        loadTimer = 0;
    }
    ++mainLoadToken;
    if (worker) worker.terminate();
    worker = null;

    albums = [];
    images = [];
    loadState = { requestId: 0, count: 0, completed: 0, loaded: 0, firstDisplayElapsed: 0, loadElapsed: 0, receiveElapsed: 0, displayElapsed: 0, paintCount: 0, paintElapsed: 0, started: 0, active: false };

    try {
        window.DrawMode = drawMode;
        createFonts();
    } finally {
        switchingRenderer = false;
    }

    if (engine === 'worker') {
        const currentWorker = new Worker(workerSource, 'playlist-album-gallery');
        worker = currentWorker;

        currentWorker.onmessage = function (event) {
            if (worker !== currentWorker) return;
            const message = event.data;
            if (message.generation !== generation) return;

            if (message.type === 'catalog') {
                playlistName = message.playlistName || playlistName;
                albums = message.albums || [];
                lastCapacity = getLayout().capacity;
                beginVisibleLoad();
                window.Repaint();
                return;
            }

            if (message.type === 'art') {
                if (message.requestId !== loadState.requestId) return;
                if (message.index < 0 || message.index >= images.length) return;

                ++loadState.completed;
                if (loadState.completed >= loadState.count && loadState.receiveElapsed <= 0 && loadState.started > 0) {
                    loadState.receiveElapsed = performance.now() - loadState.started;
                }
                if (message.image) {
                    images[message.index] = message.image;
                    ++loadState.loaded;
                }
                loadState.loadElapsed = message.elapsed || loadState.loadElapsed;

                const rect = tileRect(message.index, getLayout());
                window.RepaintRect(rect.x, rect.y, rect.w, rect.h);
                window.RepaintRect(MARGIN, 32, Math.max(1, window.Width - 220), 20);
                return;
            }

            if (message.type === 'complete' && message.requestId === loadState.requestId) {
                loadState.active = false;
                loadState.loadElapsed = message.elapsed || loadState.loadElapsed;
                window.RepaintRect(MARGIN, 32, Math.max(1, window.Width - 220), 20);
            }
        };

        currentWorker.onerror = function (event) {
            if (worker === currentWorker) console.log('Worker error: ' + event.message);
        };
    }

    sendPlaylist();
}

function on_size() {
    const capacity = getLayout().capacity;
    if (capacity !== lastCapacity && albums.length) {
        lastCapacity = capacity;
        scheduleVisibleLoad(90);
    }
    window.Repaint();
}

function on_mouse_wheel(step) {
    const next = Math.max(COVER_MIN, Math.min(COVER_MAX,
        coverSize + (step > 0 ? COVER_STEP : -COVER_STEP)));
    if (next === coverSize) return;

    coverSize = next;
    lastCapacity = getLayout().capacity;
    scheduleVisibleLoad();
    window.Repaint();
}

function on_mouse_lbtn_up(x, y) {
    const engineUi = engineRects();
    let nextEngine = engine;
    if (contains(engineUi.main, x, y)) nextEngine = 'main';
    else if (contains(engineUi.worker, x, y)) nextEngine = 'worker';

    if (nextEngine !== engine) {
        engine = nextEngine;
        startEngine();
        return;
    }

    const concurrencyUi = concurrencyRects();
    for (const choice of concurrencyUi.choices) {
        if (!contains(choice.rect, x, y)) continue;
        if (choice.value === concurrency) return;
        concurrency = choice.value;
        scheduleVisibleLoad(0);
        window.Repaint();
        return;
    }

    const rects = rendererRects();
    let nextMode = drawMode;
    if (contains(rects.gdi, x, y)) {
        nextMode = 0;
    } else if (contains(rects.d2d, x, y)) {
        nextMode = 1;
    } else {
        return;
    }

    if (nextMode === drawMode) return;
    drawMode = nextMode;
    startEngine();
}

function on_playlist_switch() {
    sendPlaylist();
}

function on_playlists_changed() {
    sendPlaylist();
}

function on_playlist_items_added(playlistIndex) {
    if (playlistIndex === plman.ActivePlaylist) sendPlaylist();
}

function on_playlist_items_removed(playlistIndex) {
    if (playlistIndex === plman.ActivePlaylist) sendPlaylist();
}

function on_playlist_items_reordered(playlistIndex) {
    if (playlistIndex === plman.ActivePlaylist) sendPlaylist();
}

function on_paint(gr) {
    const trackPaint = loadState.count > 0 && loadState.started > 0 && loadState.displayElapsed <= 0;
    const paintStarted = trackPaint ? performance.now() : 0;

    gr.FillSolidRect(0, 0, window.Width, window.Height, 0xFF101318);
    if (switchingRenderer) return;

    const engineUi = engineRects();
    const rects = rendererRects();
    const concurrencyUi = concurrencyRects();
    const titleRight = Math.max(MARGIN + 80, engineUi.label.x - 10);
    const statusRight = Math.max(MARGIN + 80, concurrencyUi.label.x - 10);
    gr.DrawText('Albums', TITLE_FONT, 0xFFE8EDF2,
        MARGIN, 5, 60, 24,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    gr.DrawText('Mouse wheel: resize covers', INFO_FONT, 0xFF7E8A96,
        MARGIN + 66, 5, Math.max(1, titleRight - (MARGIN + 66)), 24,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
    gr.DrawText(statusText(), INFO_FONT, 0xFF9AA6B2,
        MARGIN, 34, Math.max(1, statusRight - MARGIN), 20,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);

    gr.DrawText('Engine:', INFO_FONT, 0xFFB7C1CB,
        engineUi.label.x, engineUi.label.y, engineUi.label.w, engineUi.label.h,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, engineUi.main, 'Main', engine === 'main');
    drawChoice(gr, engineUi.worker, 'Worker', engine === 'worker');

    gr.DrawText('Renderer:', INFO_FONT, 0xFFB7C1CB,
        rects.label.x, rects.label.y, rects.label.w, rects.label.h,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, rects.gdi, 'GDI', drawMode === 0);
    drawChoice(gr, rects.d2d, 'D2D', drawMode === 1);

    gr.DrawText('Concurrent:', INFO_FONT, 0xFFB7C1CB,
        concurrencyUi.label.x, concurrencyUi.label.y, concurrencyUi.label.w, concurrencyUi.label.h,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    for (const choice of concurrencyUi.choices) {
        drawChoice(gr, choice.rect, choice.text, choice.value === concurrency);
    }

    if (!albums.length) {
        gr.DrawText('No albums in the active playlist.', INFO_FONT, 0xFF7E8A96,
            MARGIN, HEADER_H + 8, Math.max(1, window.Width - MARGIN * 2), 28,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
        return;
    }

    gr.SetInterpolationMode(2);

    const layout = getLayout();
    const visibleCount = Math.min(albums.length, layout.capacity);
    for (let i = 0; i < visibleCount; ++i) {
        const album = albums[i];
        const rect = tileRect(i, layout);
        const image = i < images.length ? images[i] : null;

        gr.FillSolidRect(rect.x, rect.y, coverSize, coverSize, 0xFF20262E);
        if (image) {
            drawCover(gr, image, rect.x, rect.y, coverSize);
        } else {
            gr.DrawText(loadState.active ? 'Loading...' : 'No artwork', META_FONT, 0xFF72808D,
                rect.x, rect.y, coverSize, coverSize,
                DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
        }

        gr.DrawText(album.title, ALBUM_FONT, 0xFFE8EDF2,
            rect.x, rect.y + coverSize + 2, coverSize, 18,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);

        const meta = album.artist + (album.year ? '  •  ' + album.year : '');
        gr.DrawText(meta, META_FONT, 0xFF8F9BA7,
            rect.x, rect.y + coverSize + 20, coverSize, 16,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
    }

    if (trackPaint) {
        const paintedAt = performance.now();
        ++loadState.paintCount;
        loadState.paintElapsed += paintedAt - paintStarted;

        if (loadState.firstDisplayElapsed <= 0 && loadState.loaded > 0) {
            loadState.firstDisplayElapsed = paintedAt - loadState.started;
        }

        if (loadState.completed >= loadState.count && loadState.displayElapsed <= 0) {
            loadState.displayElapsed = paintedAt - loadState.started;
            window.RepaintRect(MARGIN, 32, Math.max(1, window.Width - 220), 20);
        }
    }
}

startEngine();
