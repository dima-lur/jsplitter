// MilkDrop preset browser. Drop a four-digit .js file into the adjacent
// MilkDrop directory, then reload this sample to discover it automatically.
// Each preset is a commented JavaScript factory returning the ordinary
// CreateAsync source/renderer objects. History normally advances on each Draw;
// presets may request a fixed feedbackIntervalMs for cadence-sensitive effects.
// Preset files are executable JavaScript: load only trusted local files.
// Presets use the component's O3 shader setting. These ports also require
// source b0 float #5 = frameStep (new source ABI), so FPS changes can reuse
// the same visualization, including its history and accumulated state.
// Compile time is CreateAsync wall time (including cache/task overhead);
// Draw CPU is the visual.Draw() call duration, not GPU execution time.
window.DrawMode = 1;

// For recieiving all keys
window.DlgCode = 0x0004;

const FPS_OPTIONS = [30, 60, 120];
// 30 Hz is the port reference; repaint requests are capped at 1000 FPS.
const MIN_FPS = 30, MAX_FPS = 1000;
const CUSTOM_FPS_Y = 99;
// D3DCompile optimization bits. O3 remains fixed now that the selector is gone.
const OPTIMIZATION_MASK = 0xC000;
const OPTIMIZATION_LEVEL3 = 0x8000;
const COMPILE_INDICATOR_DELAY_MS = 150;
// InjectFeedback accepts at most 4096x4096 and 4 Mi pixels.
const MAX_CAPTURE_SIDE = 4096;
const MAX_CAPTURE_PIXELS = 4 * 1024 * 1024;
const SIDEBAR_MAX = 228;
const SIDEBAR_MIN = 170;
const ROW_HEIGHT = 38;
const AUTO_SWITCH_INTERVAL_MS = 16000;
const TRACK_NOTICE_DURATION_MS = 2000;
const AUTO_SWITCH_BUTTON_Y = 155;
const PRESET_ORDER_BUTTON_Y = 191;
const AUTO_HIDE_PLAYLIST_BUTTON_Y = 227;
const PRESETS_LABEL_Y = 271;
const LIST_TOP = 295;
const FOOTER_HEIGHT = 182;
const PLAYLIST_ROW_HEIGHT = 32;
const PLAYLIST_MARGIN = 28;
const PLAYLIST_SCROLLBAR_WIDTH = 9;

const C = {
    background: 0xff080b10,
    sidebar:    0xff171c25,
    panel:      0xff222a35,
    hover:      0xff2b3642,
    border:     0xff394451,
    text:       0xffe5edf5,
    muted:      0xff92a3b3,
    faint:      0xff697987,
    accent:     0xffffc66d,
    accentText: 0xff1b1c1e,
    error:      0xffff857d
};

const fontTitle = gdi.Font('Segoe UI', 16);
const fontMain = gdi.Font('Segoe UI', 12);
const fontSmall = gdi.Font('Segoe UI', 10);
const fontRow = gdi.Font('Segoe UI', 12);
const fontCompile = gdi.Font('Segoe UI Semibold', 28);
const fontCompileSmall = gdi.Font('Segoe UI', 13);
const fontPlaylistTitle = gdi.Font('Segoe UI Semibold', 17);
const fontPlaylistHeader = gdi.Font('Segoe UI Semibold', 12);
const fontPlaylistRow = gdi.Font('Segoe UI', 14);
const fontTrackArtist = gdi.Font('Segoe UI Semibold', 34);
const fontTrackTitle = gdi.Font('Segoe UI', 30);

// The absolute fallback also works when a sample is pasted into the script
// editor rather than selected as a file-backed sample.
const scriptPath = window.ScriptInfo && window.ScriptInfo.Path;
const scriptDir = scriptPath
    ? scriptPath.replace(/[^\\/]+$/, '')
    : fb.ComponentPath.replace(/[\\/]+$/, '') + '\\samples\\vis\\';
const presetDir = scriptDir + 'MilkDrop\\';

// include() evaluates a preset in this panel's realm. A global registry makes
// these factories visible without evaluating the HLSL or using eval().
var MilkDropPresets = Object.create(null);

const presets = utils.Glob(presetDir + '*.js')
    .map(path => {
        const match = /(?:^|[\\/])(\d{4})\.js$/i.exec(path);
        return match ? {id: match[1], path} : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.id.localeCompare(b.id));

const oldFps = Number(window.GetProperty('MilkDrop.FPS', 60));
let fps = validFps(oldFps) ? oldFps : 60;
let fpsText = String(fps);
let fpsEditing = false;
let fpsSelectAll = false;
let fpsCaret = fpsText.length;
let fpsInputError = false;
let autoSwitchEnabled = !!window.GetProperty('MilkDrop.AutoSwitch', false);
let randomPresetOrder = !!window.GetProperty('MilkDrop.RandomOrder', false);
let autoHidePlaylist = !!window.GetProperty('MilkDrop.AutoHidePlaylist', true);
const oldId = String(window.GetProperty('MilkDrop.Preset', ''));
let currentIndex = Math.max(0, presets.findIndex(item => item.id === oldId));
let visual = null;
// The visible preset can differ from the selection while CreateAsync runs.
let visualPresetId = null;
// Re-evaluate only the cadence of an opted-in preset when display FPS changes.
let visualFeedbackCadence = null;
let status = 'idle';
let errorText = '';
let requestId = 0;
let repaintTimer = null;
let autoSwitchTimer = null;
let scrollY = 0;
let initialScrollPending = true;
let mouseX = -1;
let mouseY = -1;
let hoverTarget = '';
let draggingThumb = false;
let thumbGrab = 0;
let draggingPlaylistThumb = false;
let playlistThumbGrab = 0;
let shaderCacheSnapshot = null;
let shaderCacheSampleTime = 0;
let compilingLabel = '';
let compileStartedAt = 0;
let compileIndicatorShown = false;
let lastCompileMs = null;
let drawCpuAvgMs = null;
let paintRate = null;
let paintWindowStartedAt = performance.now();
let paintWindowFrames = 0;
let playlistVisible = false;
let playlistIndex = -1;
let playlistName = '';
let playlistRows = [];
let playlistScroll = 0;
let playlistFocusIndex = -1;
let suppressDrawingClickUntil = 0;
let trackNoticeArtist = '';
let trackNoticeTitle = '';
let trackNoticeVisible = false;
let trackNoticeTimer = null;

const playlistArtistFormat = fb.TitleFormat('$if2(%artist%,)');
const playlistTitleFormat = fb.TitleFormat('$if2(%title%,)');
const playlistLengthFormat = fb.TitleFormat('$if2(%length%,)');
const trackArtistFormat = fb.TitleFormat('$if2(%artist%,Unknown artist)');
const trackTitleFormat = fb.TitleFormat('$if2(%title%,Untitled)');

// ShaderFlags is panel-local; preserve unrelated bits and keep this sample at O3.
function setDefaultOptimizationFlags() {
    if (typeof vis.ShaderFlags !== 'number') return;
    try {
        vis.ShaderFlags = (vis.ShaderFlags & ~OPTIMIZATION_MASK) |
            OPTIMIZATION_LEVEL3;
    } catch (e) {
        // Older builds can still use their default compiler flags.
        console.log('MilkDrop optimizer: ' + String(e));
    }
}

function resetFrameMetrics() {
    drawCpuAvgMs = null;
    paintRate = null;
    paintWindowFrames = 0;
    paintWindowStartedAt = performance.now();
}

function recordDrawCpuTime(elapsedMs) {
    // Exponentially smoothed CPU time inside visual.Draw(); NOT GPU frame time.
    drawCpuAvgMs = drawCpuAvgMs === null ? elapsedMs :
        drawCpuAvgMs * 0.9 + elapsedMs * 0.1;
    ++paintWindowFrames;
    const now = performance.now();
    const interval = now - paintWindowStartedAt;
    if (interval >= 1000) {
        // Actual on_paint callback rate; not guaranteed display/GPU FPS.
        paintRate = paintWindowFrames * 1000 / interval;
        paintWindowFrames = 0;
        paintWindowStartedAt = now;
    }
}

function formatTime(ms) {
    return ms < 1000 ? ms.toFixed(1) : ms.toFixed(0);
}

// The native HLSL -> DXBC LRU is process-wide, not local to this panel.
// Its defaults are 128 entries and 16 MiB; inspect without overriding them.
function cacheStats() {
    const now = Date.now();
    if (!shaderCacheSnapshot || now - shaderCacheSampleTime >= 400) {
        shaderCacheSnapshot = vis.ShaderCacheStats;
        shaderCacheSampleTime = now;
    }
    return shaderCacheSnapshot;
}

function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
}

function layout() {
    const w = window.Width, h = window.Height;
    const side = clamp(Math.round(w * 0.31), SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, Math.max(0, w - 80)));
    const listBottom = Math.max(LIST_TOP, h - FOOTER_HEIGHT);
    return {
        sidebar: side,
        viewX: side + 1,
        viewWidth: Math.max(0, w - side - 1),
        listX: 8,
        listWidth: Math.max(0, side - 24),
        listTop: LIST_TOP,
        listHeight: Math.max(0, listBottom - LIST_TOP),
        trackX: Math.max(0, side - 11),
        trackWidth: 4
    };
}

function sidebarWideButton(r, y) {
    return {x: 10, y, w: Math.max(0, r.sidebar - 20), h: 30};
}

function autoSwitchButton(r) {
    return sidebarWideButton(r, AUTO_SWITCH_BUTTON_Y);
}

function presetOrderButton(r) {
    return sidebarWideButton(r, PRESET_ORDER_BUTTON_Y);
}

function autoHidePlaylistButton(r) {
    return sidebarWideButton(r, AUTO_HIDE_PLAYLIST_BUTTON_Y);
}

function playlistOverlayLayout(x, y, w, h) {
    if (w < 120 || h < 120) return null;
    const margin = Math.max(10, Math.min(PLAYLIST_MARGIN,
        Math.floor(w / 12), Math.floor(h / 12)));
    const boxW = Math.max(1, w - margin * 2);
    const boxH = Math.max(1, h - margin * 2);
    const pad = 16;
    const titleHeight = 43;
    const headerHeight = 28;
    const bodyY = y + margin + titleHeight + headerHeight;
    const bodyHeight = Math.max(0, boxH - titleHeight - headerHeight - 10);
    const visibleRows = Math.max(0, Math.floor(bodyHeight / PLAYLIST_ROW_HEIGHT));
    const contentWidth = Math.max(0, boxW - pad * 2);
    const lengthWidth = Math.min(72, Math.max(48, Math.floor(contentWidth * 0.12)));
    const textWidth = Math.max(0, contentWidth - lengthWidth - 24);
    const artistWidth = Math.floor(textWidth * 0.36);
    return {
        x: x + margin,
        y: y + margin,
        w: boxW,
        h: boxH,
        pad,
        titleHeight,
        headerHeight,
        bodyY,
        bodyHeight,
        visibleRows,
        artistX: x + margin + pad,
        artistWidth,
        titleX: x + margin + pad + artistWidth + 12,
        titleWidth: Math.max(0, textWidth - artistWidth - 12),
        lengthX: x + margin + boxW - pad - lengthWidth,
        lengthWidth
    };
}

function activePlaylistOverlayLayout() {
    const r = layout();
    return playlistOverlayLayout(r.viewX, 0, r.viewWidth, window.Height);
}

function playlistMaxScroll(info = activePlaylistOverlayLayout()) {
    return info ? Math.max(0, playlistRows.length - info.visibleRows) : 0;
}

function playlistScrollbar(info = activePlaylistOverlayLayout()) {
    const scrollRange = playlistMaxScroll(info);
    if (!info || !info.visibleRows || scrollRange <= 0) return null;
    const trackHeight = info.visibleRows * PLAYLIST_ROW_HEIGHT;
    const thumbHeight = Math.min(trackHeight, Math.max(24,
        trackHeight * info.visibleRows / playlistRows.length));
    const range = Math.max(0, trackHeight - thumbHeight);
    const first = clamp(playlistScroll, 0, scrollRange);
    return {
        x: info.x + info.w - PLAYLIST_SCROLLBAR_WIDTH - 5,
        y: info.bodyY,
        w: PLAYLIST_SCROLLBAR_WIDTH,
        h: trackHeight,
        thumbY: info.bodyY + range * first / scrollRange,
        thumbHeight,
        range,
        scrollRange
    };
}

function normalizePlaylistScroll(info = activePlaylistOverlayLayout()) {
    playlistScroll = clamp(Math.floor(playlistScroll), 0, playlistMaxScroll(info));
}

function refreshActivePlaylist(resetScroll = false) {
    const nextIndex = Number(plman.ActivePlaylist);
    playlistIndex = Number.isInteger(nextIndex) && nextIndex >= 0 &&
        nextIndex < plman.PlaylistCount ? nextIndex : -1;
    playlistName = playlistIndex >= 0 ? plman.GetPlaylistName(playlistIndex) : '';
    playlistRows = [];
    playlistFocusIndex = playlistIndex >= 0
        ? plman.GetPlaylistFocusItemIndex(playlistIndex)
        : -1;

    if (playlistIndex >= 0) {
        const handles = plman.GetPlaylistItems(playlistIndex);
        const artists = playlistArtistFormat.EvalWithMetadbs(handles);
        const titles = playlistTitleFormat.EvalWithMetadbs(handles);
        const lengths = playlistLengthFormat.EvalWithMetadbs(handles);
        for (let i = 0; i < handles.Count; ++i) {
            playlistRows.push({
                index: i,
                artist: artists[i] || '(unknown artist)',
                title: titles[i] || '(untitled)',
                length: lengths[i] || '—'
            });
        }
    }

    if (resetScroll) {
        const info = activePlaylistOverlayLayout();
        playlistScroll = playlistFocusIndex >= 0 && info
            ? playlistFocusIndex - Math.floor(info.visibleRows / 2)
            : 0;
    }
    normalizePlaylistScroll();
    if (playlistVisible) window.Repaint();
}

function showActivePlaylist() {
    refreshActivePlaylist(true);
    playlistVisible = true;
    window.Repaint();
}

function playlistRowAt(x, y, info = activePlaylistOverlayLayout()) {
    if (!playlistVisible || !info || x < info.x || x >= info.x + info.w ||
        y < info.bodyY || y >= info.bodyY + info.visibleRows * PLAYLIST_ROW_HEIGHT)
        return -1;
    const visibleIndex = Math.floor((y - info.bodyY) / PLAYLIST_ROW_HEIGHT);
    const index = playlistScroll + visibleIndex;
    return index >= 0 && index < playlistRows.length ? index : -1;
}

function revealPlaylistFocus(index) {
    playlistFocusIndex = Number.isInteger(index) ? index : -1;
    const info = activePlaylistOverlayLayout();
    if (playlistFocusIndex >= 0 && info && info.visibleRows > 0) {
        if (playlistFocusIndex < playlistScroll)
            playlistScroll = playlistFocusIndex;
        else if (playlistFocusIndex >= playlistScroll + info.visibleRows)
            playlistScroll = playlistFocusIndex - info.visibleRows + 1;
    }
    normalizePlaylistScroll(info);
    if (playlistVisible) window.Repaint();
}

function maxScroll(r) {
    return Math.max(0, presets.length * ROW_HEIGHT - r.listHeight);
}

function setScroll(value, r = layout()) {
    scrollY = clamp(value, 0, maxScroll(r));
    window.Repaint();
}

function scrollToSelected(r = layout()) {
    const top = currentIndex * ROW_HEIGHT;
    const bottom = top + ROW_HEIGHT;
    if (top < scrollY) scrollY = top;
    if (bottom > scrollY + r.listHeight) scrollY = bottom - r.listHeight;
    scrollY = clamp(scrollY, 0, maxScroll(r));
}

// At script startup the panel can still have a zero-sized viewport.
// Do not scroll to the saved preset until the list has a real height.
// Later resizes only clamp the existing position, preserving manual scroll.
function normalizeScroll(r = layout()) {
    if (window.Width <= 0 || window.Height <= 0 || r.listHeight <= 0) return;
    if (initialScrollPending) {
        scrollToSelected(r);
        initialScrollPending = false;
    } else {
        scrollY = clamp(scrollY, 0, maxScroll(r));
    }
}

function thumb(r) {
    const content = presets.length * ROW_HEIGHT;
    const max = maxScroll(r);
    if (!r.listHeight || !max) return null;
    const height = Math.max(22, r.listHeight * r.listHeight / content);
    const range = Math.max(0, r.listHeight - height);
    return {
        x: r.trackX,
        y: r.listTop + range * (scrollY / max),
        w: r.trackWidth,
        h: Math.min(height, r.listHeight),
        range
    };
}

function compileMessage() {
    return compilingLabel || 'Compiling preset...';
}

function drawCompileOverlay(gr, x, y, w, h, message = compileMessage()) {
    if (w <= 0 || h <= 0) return;
    const boxW = Math.min(w - 36, Math.max(240, Math.round(w * 0.48)));
    const boxH = 92;
    const boxX = x + Math.max(18, Math.floor((w - boxW) / 2));
    const boxY = y + Math.floor((h - boxH) / 2);
    gr.FillSolidRect(boxX, boxY, boxW, boxH, 0xC0101318);
    gr.DrawRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1, 1, 0xFF5B6877);
    const titleW = Math.min(boxW - 30, gr.CalcTextWidth(message, fontCompile) + 6);
    const titleX = boxX + Math.floor((boxW - titleW) / 2);
    gr.DrawString(message, fontCompile, 0xFFF2F6FA,
        titleX, boxY + 15, titleW, 34);
    const note = 'First compile may take a moment';
    const noteW = Math.min(boxW - 30, gr.CalcTextWidth(note, fontCompileSmall) + 6);
    const noteX = boxX + Math.floor((boxW - noteW) / 2);
    gr.DrawString(note, fontCompileSmall, 0xFFC2CCD5,
        noteX, boxY + 55, noteW, 20);
}

function fitText(gr, value, font, width) {
    const text = String(value || '');
    if (width <= 0) return '';
    if (gr.CalcTextWidth(text, font) <= width) return text;
    const suffix = '…';
    let lo = 0, hi = text.length;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (gr.CalcTextWidth(text.slice(0, mid) + suffix, font) <= width)
            lo = mid;
        else
            hi = mid - 1;
    }
    return text.slice(0, lo) + suffix;
}

function drawPlaylistOverlay(gr, x, y, w, h, hoveredIndex = -1) {
    const info = playlistOverlayLayout(x, y, w, h);
    if (!info) return;

    gr.FillSolidRect(info.x, info.y, info.w, info.h, 0xC8121720);
    gr.DrawRect(info.x + 0.5, info.y + 0.5, info.w - 1, info.h - 1,
        1, 0xD0758494);
    gr.FillSolidRect(info.x + 1, info.y + 1, info.w - 2,
        info.titleHeight - 1, 0xD51A222C);

    const heading = playlistIndex >= 0 && playlistName
        ? 'Active playlist — ' + playlistName
        : 'Active playlist';
    gr.DrawString(fitText(gr, heading, fontPlaylistTitle, info.w - 32),
        fontPlaylistTitle, C.text, info.x + 16, info.y + 7,
        info.w - 32, 28);

    const headerY = info.y + info.titleHeight;
    gr.FillSolidRect(info.x + 1, headerY, info.w - 2,
        info.headerHeight, 0xB8242D38);
    gr.DrawString('artist', fontPlaylistHeader, C.muted,
        info.artistX, headerY + 3, info.artistWidth, 21);
    gr.DrawString('title', fontPlaylistHeader, C.muted,
        info.titleX, headerY + 3, info.titleWidth, 21);
    gr.DrawString('length', fontPlaylistHeader, C.muted,
        info.lengthX, headerY + 3, info.lengthWidth, 21);

    if (playlistIndex < 0 || !playlistRows.length || !info.visibleRows) {
        const message = playlistIndex < 0
            ? 'No active playlist'
            : 'The active playlist is empty';
        gr.DrawString(message, fontMain, C.muted,
            info.artistX, info.bodyY + 14, info.w - info.pad * 2, 30);
        return;
    }

    const first = clamp(playlistScroll, 0,
        Math.max(0, playlistRows.length - info.visibleRows));
    gr.PushClip(info.x + 1, info.bodyY,
        info.w - 2, info.visibleRows * PLAYLIST_ROW_HEIGHT);
    try {
        const end = Math.min(playlistRows.length, first + info.visibleRows);
        for (let index = first; index < end; ++index) {
            const row = playlistRows[index];
            const rowY = info.bodyY + (index - first) * PLAYLIST_ROW_HEIGHT;
            if (index === playlistFocusIndex) {
                gr.FillSolidRect(info.x + 1, rowY, info.w - 2,
                    PLAYLIST_ROW_HEIGHT, 0xA05E4A2C);
                gr.FillSolidRect(info.x + 1, rowY, 4,
                    PLAYLIST_ROW_HEIGHT, C.accent);
            } else if (index === hoveredIndex) {
                gr.FillSolidRect(info.x + 1, rowY, info.w - 2,
                    PLAYLIST_ROW_HEIGHT, 0x80708090);
            } else if ((index - first) & 1) {
                gr.FillSolidRect(info.x + 1, rowY, info.w - 2,
                    PLAYLIST_ROW_HEIGHT, 0x241D2530);
            }
            gr.DrawString(fitText(gr, row.artist, fontPlaylistRow, info.artistWidth),
                fontPlaylistRow, C.text, info.artistX, rowY + 4,
                info.artistWidth, 24);
            gr.DrawString(fitText(gr, row.title, fontPlaylistRow, info.titleWidth),
                fontPlaylistRow, C.text, info.titleX, rowY + 4,
                info.titleWidth, 24);
            gr.DrawString(fitText(gr, row.length, fontPlaylistRow, info.lengthWidth),
                fontPlaylistRow, C.muted, info.lengthX, rowY + 4,
                info.lengthWidth, 24);
        }
    } finally {
        gr.PopClip();
    }

    const bar = playlistScrollbar(info);
    if (bar) {
        gr.FillSolidRect(bar.x, bar.y, bar.w, bar.h, 0x80323C48);
        gr.FillSolidRect(bar.x, bar.thumbY, bar.w, bar.thumbHeight,
            draggingPlaylistThumb ? C.accent : 0xE0A3B2C0);
    }
}

function drawTrackNotice(gr, x, y, w, h) {
    if (!trackNoticeVisible || w < 100 || h < 150) return;
    const maximumTextWidth = Math.max(1, w - 96);
    const artist = fitText(gr, trackNoticeArtist,
        fontTrackArtist, maximumTextWidth);
    const title = fitText(gr, trackNoticeTitle,
        fontTrackTitle, maximumTextWidth);
    const artistWidth = gr.CalcTextWidth(artist, fontTrackArtist);
    const titleWidth = gr.CalcTextWidth(title, fontTrackTitle);
    const boxWidth = Math.min(w - 48,
        Math.max(320, Math.max(artistWidth, titleWidth) + 64));
    const boxHeight = 126;
    const boxX = x + Math.floor((w - boxWidth) / 2);
    const boxY = y + Math.floor((h - boxHeight) / 2);
    gr.FillSolidRect(boxX, boxY, boxWidth, boxHeight, 0xA010151D);
    gr.DrawRect(boxX + 0.5, boxY + 0.5, boxWidth - 1, boxHeight - 1,
        1, 0xB0808D9B);
    gr.DrawString(artist, fontTrackArtist, C.text,
        boxX + (boxWidth - artistWidth) / 2, boxY + 16,
        artistWidth + 2, 45);
    gr.DrawString(title, fontTrackTitle, C.accent,
        boxX + (boxWidth - titleWidth) / 2, boxY + 69,
        titleWidth + 2, 40);
}

function validatePreset(data, id) {
    if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('Invalid preset object');
    if (data.name !== id) throw new Error('Preset name must match ' + id + '.js');
    if (data.sourceId !== 5)
        throw new Error('This collection expects Vectorscope sourceId 5');
    if (!data.source || typeof data.source !== 'object' || Array.isArray(data.source))
        throw new Error('Missing source settings');
    if (!Number.isInteger(data.updateIntervalMs) || data.updateIntervalMs < 1)
        throw new Error('Invalid updateIntervalMs');
    const variant = data.renderer;
    if (!variant || typeof variant !== 'object' || Array.isArray(variant))
        throw new Error('Missing renderer object');
    if (typeof variant.shader !== 'string' || !variant.shader.trim())
        throw new Error('Missing shader HLSL');
    const isShaderCode = value =>
        (typeof value === 'string' && !!value.trim()) ||
        (value instanceof Uint8Array && value.byteLength > 0) ||
        (value instanceof ArrayBuffer && value.byteLength > 0);
    const isImagePass = value => {
        if (isShaderCode(value)) return true;
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
            !isShaderCode(value.shader)) return false;
        return Array.isArray(value.textures) && value.textures.length >= 1 &&
            value.textures.length <= 3 &&
            value.textures.every(path => typeof path === 'string' && !!path);
    };
    if (variant.feedback !== undefined && !isImagePass(variant.feedback))
        throw new Error('Invalid feedback shader pass');
    if (variant.post !== undefined && !isImagePass(variant.post) &&
        !(Array.isArray(variant.post) && variant.post.length > 0 &&
            variant.post.every(isImagePass)))
        throw new Error('Invalid post shader pass');
    return variant;
}

// Capture the complete presented image only for seeding a newly selected
// preset. Feeding this opaque image back into the same visualization would
// recursively process the post output and disturb the entire history.
function captureOutgoingFrame(message = null) {
    const r = layout();
    const w = r.viewWidth, h = window.Height;
    if (!visual || w < 1 || h < 1) return null;

    // Fit within the GPU texture limit. In the usual case the capture is
    // full-resolution; on very large panels it is scaled down.
    const scale = Math.min(1, MAX_CAPTURE_SIDE / w, MAX_CAPTURE_SIDE / h,
        Math.sqrt(MAX_CAPTURE_PIXELS / (w * h)));
    const sw = Math.max(1, Math.floor(w * scale));
    const sh = Math.max(1, Math.floor(h * scale));
    const bitmap = d2d.CreateImage(sw, sh);
    const bg = bitmap.GetGraphics();
    try {
        bg.FillSolidRect(0, 0, sw, sh, C.background);
        visual.Draw(bg, 0, 0, sw, sh);
        if (message) drawCompileOverlay(bg, 0, 0, sw, sh, message);
    } finally {
        bitmap.ReleaseGraphics(bg);
    }
    return bitmap;
}

// Create a transparent bitmap containing only a UI overlay. InjectFeedback
// composites this bitmap once with SOURCE_OVER, so transparent pixels leave
// the existing history untouched.
function captureOverlayFrame(drawOverlay) {
    const r = layout();
    const w = r.viewWidth, h = window.Height;
    if (!visual || w < 1 || h < 1) return null;

    const scale = Math.min(1, MAX_CAPTURE_SIDE / w, MAX_CAPTURE_SIDE / h,
        Math.sqrt(MAX_CAPTURE_PIXELS / (w * h)));
    const sw = Math.max(1, Math.floor(w * scale));
    const sh = Math.max(1, Math.floor(h * scale));
    const bitmap = d2d.CreateImage(sw, sh); // New images are transparent.
    const bg = bitmap.GetGraphics();
    try {
        drawOverlay(bg, sw, sh);
    } finally {
        bitmap.ReleaseGraphics(bg);
    }
    return bitmap;
}

function capturePlaylistOverlay() {
    const hoveredPlaylistRow = playlistRowAt(mouseX, mouseY);
    return captureOverlayFrame((gr, w, h) =>
        drawPlaylistOverlay(gr, 0, 0, w, h, hoveredPlaylistRow));
}

function captureTrackNoticeOverlay() {
    return captureOverlayFrame((gr, w, h) =>
        drawTrackNotice(gr, 0, 0, w, h));
}

function injectPlaylistOverlay() {
    if (!playlistVisible) return;
    try {
        if (visual) {
            const frame = capturePlaylistOverlay();
            if (frame) visual.InjectFeedback(frame);
        }
    } catch (e) {
        // A source-only renderer may reject feedback injection; hiding the
        // overlay and continuing playback/preset selection is still safe.
        console.log('MilkDrop playlist feedback injection: ' + String(e));
    }
    playlistVisible = false;
    hoverTarget = '';
    window.Repaint();
}

function injectTrackNotice() {
    if (!trackNoticeVisible) return;
    trackNoticeTimer = null;
    try {
        if (visual) {
            const frame = captureTrackNoticeOverlay();
            if (frame) visual.InjectFeedback(frame);
        }
    } catch (e) {
        console.log('MilkDrop track feedback injection: ' + String(e));
    }
    trackNoticeVisible = false;
    window.Repaint();
}

function showTrackNotice(metadb) {
    if (!metadb) return;
    if (trackNoticeTimer !== null) clearTimeout(trackNoticeTimer);
    trackNoticeArtist = String(trackArtistFormat.EvalWithMetadb(metadb) ||
        'Unknown artist');
    trackNoticeTitle = String(trackTitleFormat.EvalWithMetadb(metadb) ||
        'Untitled');
    trackNoticeVisible = true;
    trackNoticeTimer = setTimeout(injectTrackNotice,
        TRACK_NOTICE_DURATION_MS);
    window.Repaint();
}

function activate() {
    const request = ++requestId;
    errorText = '';
    if (!presets.length) {
        visual = null;
        visualPresetId = null;
        visualFeedbackCadence = null;
        compilingLabel = '';
        status = 'empty';
        window.Repaint();
        return;
    }

    const selected = presets[currentIndex];
    const creationFps = fps;
    let data, renderer, feedbackCadence;
    try {
        // include() has a per-realm guard, while the factory itself can be
        // called again when selecting a preset without reloading its file.
        if (typeof MilkDropPresets[selected.id] !== 'function')
            include(selected.path);
        const factory = MilkDropPresets[selected.id];
        if (typeof factory !== 'function')
            throw new Error('Preset did not register ' + selected.id);
        data = factory(fps);
        renderer = validatePreset(data, selected.id);
        feedbackCadence = renderer.feedbackIntervalMs > 0
            ? targetFps => factory(targetFps).renderer.feedbackIntervalMs ?? 0
            : null;
        // Keep the outgoing preset's analysis cadence during compilation.
        if (!visual) vis.UpdateIntervalMs = data.updateIntervalMs;
    } catch (e) {
        status = 'error';
        compilingLabel = '';
        errorText = String(e);
        console.log('MilkDrop ' + selected.id + ': ' + errorText);
        window.Repaint();
        return;
    }

    compilingLabel = 'Compiling ' + selected.id + '...';
    compileStartedAt = performance.now();
    lastCompileMs = null;
    compileIndicatorShown = false;
    status = 'loading';
    window.Repaint();
    try {
        vis.CreateAsync(data.sourceId, data.source, renderer)
            .then(next => {
                if (request !== requestId) return; // Stale async compile.
                // FPS may have changed while CreateAsync was pending. Apply
                // the latest cadence before the first Draw, without recompiling.
                if (feedbackCadence && fps !== creationFps)
                    next.FeedbackIntervalMs = feedbackCadence(fps);
                // Wall time of CreateAsync: compilation, cache lookup, task
                // scheduling and Promise delivery; excludes feedback capture.
                lastCompileMs = performance.now() - compileStartedAt;

                let frame = null;
                // Only a transition to a different preset may seed history
                // with the outgoing screen. FPS changes retain the existing
                // visualization; its post output must not re-enter its history.
                if (visual && visualPresetId !== selected.id) {
                    try {
                        frame = captureOutgoingFrame(
                            compileIndicatorShown ? compilingLabel : null);
                    } catch (e) {
                        // A failed snapshot must not prevent changing presets.
                        console.log('MilkDrop capture: ' + String(e));
                    }
                }
                if (frame) {
                    try {
                        next.InjectFeedback(frame);
                    } catch (e) {
                        // Some presets cannot accept feedback injection.
                        console.log('MilkDrop feedback injection: ' + String(e));
                    }
                }

                vis.UpdateIntervalMs = data.updateIntervalMs;
                visual = next;
                visualPresetId = selected.id;
                visualFeedbackCadence = feedbackCadence;
                resetFrameMetrics();
                status = 'ready';
                compilingLabel = '';
                compileIndicatorShown = false;
                window.Repaint();
            })
            .catch(e => {
                if (request !== requestId) return;
                lastCompileMs = performance.now() - compileStartedAt;
                status = 'error';
                compilingLabel = '';
                errorText = String(e);
                console.log('MilkDrop ' + selected.id + ': ' + errorText);
                window.Repaint();
            });
    } catch (e) {
        if (request !== requestId) return;
        lastCompileMs = performance.now() - compileStartedAt;
        status = 'error';
        compilingLabel = '';
        errorText = String(e);
        console.log('MilkDrop ' + selected.id + ': ' + errorText);
        window.Repaint();
    }
}
function startRepaintTimer() {
    if (repaintTimer !== null) clearInterval(repaintTimer);
    repaintTimer = setInterval(() => window.Repaint(), 1000 / fps);
}

function nextAutomaticPresetIndex() {
    if (presets.length < 2) return currentIndex;
    if (!randomPresetOrder) return (currentIndex + 1) % presets.length;
    // Choose uniformly from every preset except the one already active.
    let index = Math.floor(Math.random() * (presets.length - 1));
    if (index >= currentIndex) ++index;
    return index;
}

function restartAutoSwitchTimer() {
    if (autoSwitchTimer !== null) {
        clearInterval(autoSwitchTimer);
        autoSwitchTimer = null;
    }
    if (autoSwitchEnabled && presets.length > 1) {
        autoSwitchTimer = setInterval(() => {
            selectPreset(nextAutomaticPresetIndex(), true);
        }, AUTO_SWITCH_INTERVAL_MS);
    }
}

function toggleAutoSwitch() {
    autoSwitchEnabled = !autoSwitchEnabled;
    window.SetProperty('MilkDrop.AutoSwitch', autoSwitchEnabled);
    restartAutoSwitchTimer();
    window.Repaint();
}

function togglePresetOrder() {
    if (!autoSwitchEnabled) return;
    randomPresetOrder = !randomPresetOrder;
    window.SetProperty('MilkDrop.RandomOrder', randomPresetOrder);
    window.Repaint();
}

function toggleAutoHidePlaylist() {
    autoHidePlaylist = !autoHidePlaylist;
    window.SetProperty('MilkDrop.AutoHidePlaylist', autoHidePlaylist);
    window.Repaint();
}

function selectFps(next) {
    if (!validFps(next)) return;
    fpsText = String(next);
    fpsCaret = fpsText.length;
    fpsEditing = fpsSelectAll = fpsInputError = false;
    window.Repaint();
    if (next === fps) return;
    fps = next;
    window.SetProperty('MilkDrop.FPS', fps);
    // Per-Draw presets use measured frameStep. Opted-in presets instead keep
    // a fixed step at their requested cadence, changed on the existing object.
    if (visual && visualFeedbackCadence) {
        try {
            visual.FeedbackIntervalMs = visualFeedbackCadence(fps);
        } catch (e) {
            status = 'error';
            errorText = String(e);
            console.log('MilkDrop feedback cadence: ' + errorText);
        }
    }
    // Preserve history, phase state and time origin in both modes.
    startRepaintTimer();
    resetFrameMetrics();
}

function selectPreset(index, automatic = false) {
    if (index < 0 || index >= presets.length || index === currentIndex) return;
    if (playlistVisible && autoHidePlaylist) injectPlaylistOverlay();
    currentIndex = index;
    window.SetProperty('MilkDrop.Preset', presets[index].id);
    scrollToSelected();
    activate();
    if (!automatic && autoSwitchEnabled) restartAutoSwitchTimer();
}

// An inline numeric field keeps fractional rates (for example 59.94).
// Enter or Apply commits; Escape restores the active rate. Preset selection
// and audio analysis retain their existing independent lifetimes/cadences.
function validFps(value) {
    return Number.isFinite(value) && value >= MIN_FPS && value <= MAX_FPS;
}

function fpsField(r) {
    return {x: 10, y: CUSTOM_FPS_Y, w: Math.max(20, r.sidebar - 80), h: 30};
}

function fpsApplyButton(r) {
    return {x: r.sidebar - 64, y: CUSTOM_FPS_Y, w: 54, h: 30};
}

function contains(rc, x, y) {
    return x >= rc.x && x < rc.x + rc.w && y >= rc.y && y < rc.y + rc.h;
}

function commitFpsInput() {
    const text = fpsText.trim().replace(',', '.');
    const next = /^\d+(?:\.\d*)?$/.test(text) ? Number(text) : NaN;
    fpsInputError = !validFps(next);
    if (fpsInputError) {
        fpsEditing = true;
        window.Repaint();
        return false;
    }
    selectFps(next);
    return true;
}

function insertFpsText(text) {
    text = String(text).trim().replace(',', '.');
    if (!/^[0-9.]*$/.test(text)) return;
    const next = fpsSelectAll ? text :
        fpsText.slice(0, fpsCaret) + text + fpsText.slice(fpsCaret);
    if (next.length > 12 || (next.match(/\./g) || []).length > 1) return;
    fpsCaret = fpsSelectAll ? text.length : fpsCaret + text.length;
    fpsText = next;
    fpsSelectAll = fpsInputError = false;
    window.Repaint();
}

function drawFpsInput(gr, r) {
    const rc = fpsField(r);
    gr.FillSolidRect(rc.x, rc.y, rc.w, rc.h, C.background);
    gr.DrawRect(rc.x + .5, rc.y + .5, rc.w - 1, rc.h - 1, 1,
        fpsInputError ? C.error : fpsEditing ? C.accent : C.border);
    gr.PushClip(rc.x + 5, rc.y + 2, rc.w - 10, rc.h - 4);
    try {
        const width = gr.CalcTextWidth(fpsText, fontMain);
        if (fpsEditing && fpsSelectAll)
            gr.FillSolidRect(rc.x + 6, rc.y + 5, Math.max(2, width), 20, C.hover);
        gr.DrawString(fpsText, fontMain, C.text, rc.x + 6, rc.y + 5, width + 5, 21);
        if (fpsEditing && !fpsSelectAll && Math.floor(Date.now() / 500) % 2 === 0) {
            const caretX = rc.x + 6 + gr.CalcTextWidth(fpsText.slice(0, fpsCaret), fontMain);
            gr.FillSolidRect(caretX, rc.y + 6, 1, 18, C.accent);
        }
    } finally { gr.PopClip(); }
    drawSidebarWideButton(gr, fpsApplyButton(r), 'Apply', false);
    gr.DrawString(fpsInputError ? 'Enter 30–1000 FPS' : 'Custom FPS · 30–1000',
        fontSmall, fpsInputError ? C.error : C.muted, 12, CUSTOM_FPS_Y + 32, r.sidebar - 24, 18);
}

function on_key_down(key) {
    if (!fpsEditing) return;
    const ctrl = utils.IsKeyPressed(0x11);
    // This field accepts only numbers. Handle both digit rows directly so it
    // also works when the host does not forward WM_CHAR to the panel. Do not
    // insert again in on_char: hosts that deliver both would duplicate digits.
    if (!ctrl && !utils.IsKeyPressed(0x12) && key >= 0x30 && key <= 0x39)
        insertFpsText(String.fromCharCode(key));
    else if (!ctrl && key >= 0x60 && key <= 0x69)
        insertFpsText(String(key - 0x60));
    else if (!ctrl && (key === 0x6E || key === 0xBE || key === 0xBC))
        insertFpsText('.');
    else if (ctrl && key === 0x41) fpsSelectAll = true;
    else if (ctrl && key === 0x56) insertFpsText(utils.GetClipboardText());
    else if (key === 0x0D || key === 0x09) { commitFpsInput(); return; }
    else if (key === 0x1B) { selectFps(fps); return; }
    else if (key === 0x08 || key === 0x2E) {
        if (fpsSelectAll) { fpsText = ''; fpsCaret = 0; }
        else if (key === 0x08 && fpsCaret > 0) {
            fpsText = fpsText.slice(0, fpsCaret - 1) + fpsText.slice(fpsCaret);
            --fpsCaret;
        } else if (key === 0x2E)
            fpsText = fpsText.slice(0, fpsCaret) + fpsText.slice(fpsCaret + 1);
        fpsSelectAll = fpsInputError = false;
    } else if (key === 0x25 || key === 0x24) {
        fpsCaret = fpsSelectAll || key === 0x24 ? 0 : Math.max(0, fpsCaret - 1);
        fpsSelectAll = false;
    } else if (key === 0x27 || key === 0x23) {
        fpsCaret = fpsSelectAll || key === 0x23 ? fpsText.length : Math.min(fpsText.length, fpsCaret + 1);
        fpsSelectAll = false;
    }
    window.Repaint();
}

function on_focus(focused) {
    if (!focused) { fpsEditing = fpsSelectAll = false; window.Repaint(); }
}

function choiceButton(r, i, y) {
    const margin = 10, gap = 5;
    const buttonWidth = (r.sidebar - margin * 2 - gap * 2) / 3;
    return {x: margin + (buttonWidth + gap) * i, y,
        w: buttonWidth, h: 30};
}

function drawChoiceButton(gr, r, i, y, label, selected) {
    const rc = choiceButton(r, i, y);
    const hover = mouseX >= rc.x && mouseX < rc.x + rc.w &&
                  mouseY >= rc.y && mouseY < rc.y + rc.h;
    gr.FillSolidRect(rc.x, rc.y, rc.w, rc.h,
        selected ? C.accent : (hover ? C.hover : C.panel));
    gr.DrawRect(rc.x + 0.5, rc.y + 0.5, rc.w - 1, rc.h - 1, 1,
        selected ? C.accent : C.border);
    const textWidth = gr.CalcTextWidth(label, fontMain);
    gr.DrawString(label, fontMain, selected ? C.accentText : C.text,
        rc.x + (rc.w - textWidth) / 2, rc.y + 5, textWidth + 2, 19);
}

function drawSidebarWideButton(gr, rc, label, selected, enabled = true) {
    const hover = enabled && mouseX >= rc.x && mouseX < rc.x + rc.w &&
        mouseY >= rc.y && mouseY < rc.y + rc.h;
    gr.FillSolidRect(rc.x, rc.y, rc.w, rc.h,
        enabled && selected ? C.accent : (hover ? C.hover : C.panel));
    gr.DrawRect(rc.x + 0.5, rc.y + 0.5, rc.w - 1, rc.h - 1, 1,
        enabled && selected ? C.accent : (enabled ? C.border : C.faint));
    const textWidth = Math.min(rc.w - 10, gr.CalcTextWidth(label, fontMain));
    gr.DrawString(label, fontMain,
        enabled && selected ? C.accentText : (enabled ? C.text : C.faint),
        rc.x + (rc.w - textWidth) / 2, rc.y + 5, textWidth + 2, 19);
}

function drawSidebar(gr, r) {
    const h = window.Height;
    gr.FillSolidRect(0, 0, r.sidebar, h, C.sidebar);
    gr.FillSolidRect(r.sidebar, 0, 1, h, C.border);
    gr.DrawString('Milkdrop ports', fontTitle, C.text, 12, 12, r.sidebar - 24, 27);
    gr.DrawString('FPS', fontSmall, C.muted, 12, 41, 50, 15);
    for (let i = 0; i < FPS_OPTIONS.length; ++i)
        drawChoiceButton(gr, r, i, 58, String(FPS_OPTIONS[i]), fps === FPS_OPTIONS[i]);
    drawFpsInput(gr, r);
    drawSidebarWideButton(gr, autoSwitchButton(r),
        'Auto presets: ' + (autoSwitchEnabled ? 'On' : 'Off'),
        autoSwitchEnabled);
    drawSidebarWideButton(gr, presetOrderButton(r),
        'Order: ' + (randomPresetOrder ? 'Random' : 'Sequential'),
        randomPresetOrder, autoSwitchEnabled);
    drawSidebarWideButton(gr, autoHidePlaylistButton(r),
        'Auto-hide playlist: ' + (autoHidePlaylist ? 'On' : 'Off'),
        autoHidePlaylist);
    gr.DrawString('PRESETS  ' + presets.length, fontSmall, C.muted,
        12, PRESETS_LABEL_Y, r.sidebar - 24, 18);

    gr.PushClip(0, r.listTop, r.sidebar, r.listHeight);
    try {
        if (!presets.length) {
            gr.DrawString('No .js presets', fontSmall, C.faint,
                12, r.listTop + 8, r.sidebar - 24, 35);
        }
        for (let i = 0; i < presets.length; ++i) {
            const y = r.listTop + i * ROW_HEIGHT - scrollY;
            if (y + ROW_HEIGHT <= r.listTop || y >= r.listTop + r.listHeight)
                continue;
            const selected = i === currentIndex;
            const hovered = mouseX >= r.listX &&
                mouseX < r.listX + r.listWidth &&
                mouseY >= Math.max(r.listTop, y) &&
                mouseY < Math.min(r.listTop + r.listHeight, y + ROW_HEIGHT);
            gr.FillSolidRect(r.listX, y, r.listWidth, ROW_HEIGHT - 2,
                selected ? C.panel : hovered ? C.hover : C.sidebar);
            if (selected) gr.FillSolidRect(r.listX, y, 3, ROW_HEIGHT - 2, C.accent);
            gr.DrawString(presets[i].id, fontRow, selected ? C.accent : C.text,
                r.listX + 13, y + 6, r.listWidth - 24, 24);
        }
        const bar = thumb(r);
        if (bar) {
            gr.FillSolidRect(bar.x, r.listTop, bar.w, r.listHeight, C.panel);
            gr.FillSolidRect(bar.x, bar.y, bar.w, bar.h, C.muted);
        }
    } finally {
        gr.PopClip();
    }

    if (h >= LIST_TOP + FOOTER_HEIGHT) {
        const y = h - FOOTER_HEIGHT;
        const stats = cacheStats();
        gr.FillSolidRect(0, y, r.sidebar, 1, C.border);
        gr.DrawString('PERFORMANCE', fontSmall, C.accent,
            11, y + 7, r.sidebar - 20, 16);
        const compiling = status === 'loading';
        const elapsed = compiling ? performance.now() - compileStartedAt : lastCompileMs;
        gr.DrawString('Compile: ' + (elapsed === null ? '—' : formatTime(elapsed) + ' ms') +
            (compiling ? '...' : ''),
            fontSmall, C.text, 11, y + 26, r.sidebar - 20, 17);
        gr.DrawString('Draw CPU: ' +
            (drawCpuAvgMs === null ? '—' : drawCpuAvgMs.toFixed(2) + ' ms'),
            fontSmall, C.text, 11, y + 44, r.sidebar - 20, 17);
        gr.DrawString('Paint: ' +
            (paintRate === null ? '—' : paintRate.toFixed(1) + ' FPS'),
            fontSmall, C.muted, 11, y + 62, r.sidebar - 20, 17);

        gr.FillSolidRect(0, y + 83, r.sidebar, 1, C.border);
        gr.DrawString('DXBC CACHE', fontSmall, C.accent,
            11, y + 90, r.sidebar - 20, 16);
        gr.DrawString('Entries: ' + stats.Entries + ' / ' + vis.ShaderCacheMaxEntries,
            fontSmall, C.text, 11, y + 109, r.sidebar - 20, 17);
        const mb = 1024 * 1024;
        gr.DrawString('Size: ' + (stats.Bytes / mb).toFixed(2) + ' / ' +
            (vis.ShaderCacheMaxBytes / mb).toFixed(1) + ' MiB',
            fontSmall, C.text, 11, y + 126, r.sidebar - 20, 17);
        gr.DrawString('Hits: ' + stats.Hits + '  Misses: ' + stats.Misses,
            fontSmall, C.muted, 11, y + 143, r.sidebar - 20, 17);
        gr.DrawString('Evictions: ' + stats.Evictions,
            fontSmall, C.muted, 11, y + 160, r.sidebar - 20, 17);
    }
}

function drawMessage(gr, r, message, color = C.muted) {
    if (r.viewWidth <= 0) return;
    const x = r.viewX + 22;
    gr.DrawString(message, fontMain, color, x,
        Math.max(12, window.Height / 2 - 11),
        Math.max(0, r.viewWidth - 44), 75);
}

function on_size() {
    normalizeScroll();
    normalizePlaylistScroll();
}

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    if (w <= 0 || h <= 0) return;
    const r = layout();
    normalizeScroll(r);
    gr.FillSolidRect(0, 0, w, h, C.background);
    if (visual && r.viewWidth > 0) {
        try {
            const drawStartedAt = performance.now();
            visual.Draw(gr, r.viewX, 0, r.viewWidth, h);
            recordDrawCpuTime(performance.now() - drawStartedAt);
        } catch (e) {
            // Report a failing visualization once, not at every paint tick.
            visual = null;
            visualPresetId = null;
            status = 'error';
            errorText = String(e);
            console.log('MilkDrop draw: ' + errorText);
        }
    }
    if (status === 'loading' && r.viewWidth > 0 &&
        performance.now() - compileStartedAt >= COMPILE_INDICATOR_DELAY_MS) {
        drawCompileOverlay(gr, r.viewX, 0, r.viewWidth, h);
        compileIndicatorShown = true;
    }
    if (status === 'empty') drawMessage(gr, r, 'Add a preset to the MilkDrop folder.');
    if (status === 'error') drawMessage(gr, r,
        'Preset error: ' + errorText, C.error);
    if (playlistVisible && r.viewWidth > 0)
        drawPlaylistOverlay(gr, r.viewX, 0, r.viewWidth, h,
            playlistRowAt(mouseX, mouseY));
    if (trackNoticeVisible && r.viewWidth > 0)
        drawTrackNotice(gr, r.viewX, 0, r.viewWidth, h);
    drawSidebar(gr, r);
}

function hoveredItem(x, y, r) {
    if (x < 0 || x >= r.sidebar) return '';
    if (contains(fpsField(r), x, y)) return 'fps-input';
    if (contains(fpsApplyButton(r), x, y)) return 'fps-apply';
    for (let i = 0; i < FPS_OPTIONS.length; ++i) {
        const rc = choiceButton(r, i, 58);
        if (x >= rc.x && x < rc.x + rc.w &&
            y >= rc.y && y < rc.y + rc.h) return 'fps:' + i;
    }
    const autoRc = autoSwitchButton(r);
    if (x >= autoRc.x && x < autoRc.x + autoRc.w &&
        y >= autoRc.y && y < autoRc.y + autoRc.h)
        return 'auto-switch';
    const orderRc = presetOrderButton(r);
    if (autoSwitchEnabled && x >= orderRc.x && x < orderRc.x + orderRc.w &&
        y >= orderRc.y && y < orderRc.y + orderRc.h)
        return 'preset-order';
    const autoHideRc = autoHidePlaylistButton(r);
    if (x >= autoHideRc.x && x < autoHideRc.x + autoHideRc.w &&
        y >= autoHideRc.y && y < autoHideRc.y + autoHideRc.h)
        return 'auto-hide-playlist';
    if (x >= r.listX && x < r.listX + r.listWidth &&
        y >= r.listTop && y < r.listTop + r.listHeight) {
        const i = Math.floor((y - r.listTop + scrollY) / ROW_HEIGHT);
        if (i >= 0 && i < presets.length) return 'preset:' + i;
    }
    return '';
}

function on_mouse_move(x, y) {
    const previousPlaylistRow = playlistRowAt(mouseX, mouseY);
    mouseX = x;
    mouseY = y;
    const r = layout();
    if (draggingPlaylistThumb) {
        const bar = playlistScrollbar();
        if (bar && bar.range > 0) {
            playlistScroll = clamp(Math.round(
                (y - bar.y - playlistThumbGrab) * bar.scrollRange / bar.range),
                0, bar.scrollRange);
            window.Repaint();
        }
    } else if (draggingThumb) {
        const bar = thumb(r);
        if (bar && bar.range > 0)
            setScroll((y - r.listTop - thumbGrab) * maxScroll(r) / bar.range, r);
    } else {
        const next = hoveredItem(x, y, r);
        const nextPlaylistRow = playlistRowAt(x, y);
        if (next !== hoverTarget || nextPlaylistRow !== previousPlaylistRow) {
            hoverTarget = next;
            window.Repaint();
        }
    }
}

function on_mouse_leave() {
    const hadPlaylistHover = playlistRowAt(mouseX, mouseY) >= 0;
    mouseX = mouseY = -1;
    if ((hoverTarget || hadPlaylistHover) &&
        !draggingThumb && !draggingPlaylistThumb) window.Repaint();
    hoverTarget = '';
}

function on_mouse_wheel(step) {
    const r = layout();
    const playlistInfo = activePlaylistOverlayLayout();
    if (playlistVisible && playlistInfo &&
        mouseX >= playlistInfo.x && mouseX < playlistInfo.x + playlistInfo.w &&
        mouseY >= playlistInfo.y && mouseY < playlistInfo.y + playlistInfo.h) {
        playlistScroll = clamp(playlistScroll - step * 3,
            0, playlistMaxScroll(playlistInfo));
        window.Repaint();
        return;
    }
    if (mouseX === -1 || mouseX <= r.sidebar)
        setScroll(scrollY - step * ROW_HEIGHT * 2, r);
}

function on_mouse_lbtn_down(x, y) {
    if (contains(fpsField(layout()), x, y)) {
        fpsSelectAll = !fpsEditing;
        fpsEditing = true;
        fpsCaret = fpsText.length;
        window.Repaint();
        return;
    }
    if (!contains(fpsApplyButton(layout()), x, y)) {
        fpsEditing = fpsSelectAll = false;
        window.Repaint();
    }
    const playlistBar = playlistVisible ? playlistScrollbar() : null;
    if (playlistBar && x >= playlistBar.x - 3 &&
        x < playlistBar.x + playlistBar.w + 3 &&
        y >= playlistBar.y && y < playlistBar.y + playlistBar.h) {
        draggingPlaylistThumb = true;
        playlistThumbGrab = y >= playlistBar.thumbY &&
            y < playlistBar.thumbY + playlistBar.thumbHeight
            ? y - playlistBar.thumbY
            : playlistBar.thumbHeight / 2;
        if (y < playlistBar.thumbY ||
            y >= playlistBar.thumbY + playlistBar.thumbHeight) {
            playlistScroll = clamp(Math.round(
                (y - playlistBar.y - playlistThumbGrab) *
                playlistBar.scrollRange / playlistBar.range),
                0, playlistBar.scrollRange);
        }
        window.Repaint();
        return;
    }
    const r = layout();
    const bar = thumb(r);
    if (!bar || x < r.trackX - 3 || x > r.trackX + r.trackWidth + 3 ||
        y < r.listTop || y >= r.listTop + r.listHeight) return;
    draggingThumb = true;
    thumbGrab = y >= bar.y && y < bar.y + bar.h ? y - bar.y : bar.h / 2;
    if (y < bar.y || y >= bar.y + bar.h)
        setScroll((y - r.listTop - thumbGrab) * maxScroll(r) / bar.range, r);
}

function on_mouse_lbtn_up(x, y) {
    if (contains(fpsField(layout()), x, y)) return;
    if (contains(fpsApplyButton(layout()), x, y)) { commitFpsInput(); return; }
    if (draggingPlaylistThumb) {
        draggingPlaylistThumb = false;
        window.Repaint();
        return;
    }
    if (draggingThumb) {
        draggingThumb = false;
        return;
    }
    const r = layout();
    if (x >= r.viewX && x < r.viewX + r.viewWidth &&
        y >= 0 && y < window.Height) {
        if (!playlistVisible && Date.now() >= suppressDrawingClickUntil)
            showActivePlaylist();
        return;
    }
    if (x < 0 || x >= r.sidebar) return;
    for (let i = 0; i < FPS_OPTIONS.length; ++i) {
        const b = choiceButton(r, i, 58);
        if (x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) {
            selectFps(FPS_OPTIONS[i]);
            return;
        }
    }
    const autoRc = autoSwitchButton(r);
    if (x >= autoRc.x && x < autoRc.x + autoRc.w &&
        y >= autoRc.y && y < autoRc.y + autoRc.h) {
        toggleAutoSwitch();
        return;
    }
    const orderRc = presetOrderButton(r);
    if (autoSwitchEnabled && x >= orderRc.x && x < orderRc.x + orderRc.w &&
        y >= orderRc.y && y < orderRc.y + orderRc.h) {
        togglePresetOrder();
        return;
    }
    const autoHideRc = autoHidePlaylistButton(r);
    if (x >= autoHideRc.x && x < autoHideRc.x + autoHideRc.w &&
        y >= autoHideRc.y && y < autoHideRc.y + autoHideRc.h) {
        toggleAutoHidePlaylist();
        return;
    }
    if (y >= r.listTop && y < r.listTop + r.listHeight &&
        x >= r.listX && x < r.listX + r.listWidth) {
        selectPreset(Math.floor((y - r.listTop + scrollY) / ROW_HEIGHT));
    }
}

function on_mouse_lbtn_dblclk(x, y) {
    const rowIndex = playlistRowAt(x, y);
    if (rowIndex < 0 || playlistIndex < 0) return;
    const activePlaylist = playlistIndex;
    const itemIndex = playlistRows[rowIndex].index;
    if (autoHidePlaylist) {
        // Windows sends the final button-up after the double-click callback.
        // Prevent that event from immediately reopening the hidden overlay.
        suppressDrawingClickUntil = Date.now() + 250;
        injectPlaylistOverlay();
    }
    if (activePlaylist >= 0 && activePlaylist < plman.PlaylistCount &&
        itemIndex >= 0 && itemIndex < plman.PlaylistItemCount(activePlaylist))
        plman.ExecutePlaylistDefaultAction(activePlaylist, itemIndex);
}

function on_playlist_switch() {
    if (playlistVisible) refreshActivePlaylist(true);
}

function on_playlists_changed() {
    if (playlistVisible) refreshActivePlaylist(true);
}

function on_playlist_items_added(index) {
    if (playlistVisible && index === playlistIndex) refreshActivePlaylist();
}

function on_playlist_items_removed(index) {
    if (playlistVisible && index === playlistIndex) refreshActivePlaylist();
}

function on_playlist_items_reordered(index) {
    if (playlistVisible && index === playlistIndex) refreshActivePlaylist();
}

function on_item_focus_change(index, from, to) {
    if (playlistVisible && index === playlistIndex)
        revealPlaylistFocus(to);
}

function on_playback_new_track(metadb) {
    if (playlistVisible && autoHidePlaylist) injectPlaylistOverlay();
    showTrackNotice(metadb);
}

// Keep the sample on the production O3 setting without exposing compiler UI.
setDefaultOptimizationFlags();
// Initial selection is scrolled into view after the panel receives its size.
startRepaintTimer();
restartAutoSwitchTimer();
activate();
