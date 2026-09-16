'use strict';

// Worker sample 2: Playlist Statistics
// Demonstrates: cloning FbMetadbHandleList, bulk metadata/file-info aggregation in Main/Worker,
// and presenting the result in an interactive panel UI.
// Media Library is exposed alongside playlists so larger real-world batches are easy to test.
// Why a Worker: one metadata batch crosses the realm boundary instead of keeping the panel
// thread busy while every handle and FbFileInfo object is inspected. Engine switches between
// Main and Worker for a direct A/B comparison of the same analysis.

window.DrawMode = 0;
window.DlgCode = 0x0004;

const DT_LEFT = 0x0000;
const DT_CENTER = 0x0001;
const DT_RIGHT = 0x0002;
const DT_VCENTER = 0x0004;
const DT_SINGLELINE = 0x0020;
const DT_NOPREFIX = 0x0800;
const DT_END_ELLIPSIS = 0x8000;

const VK_PRIOR = 0x21;
const VK_NEXT = 0x22;
const VK_END = 0x23;
const VK_HOME = 0x24;
const VK_UP = 0x26;
const VK_DOWN = 0x28;

const FONT = gdi.Font('Segoe UI', 13);
const FONT_BOLD = gdi.Font('Segoe UI', 13, 1);
const FONT_TITLE = gdi.Font('Segoe UI', 18, 1);
const ROW_HEIGHT = 30;
const PADDING = 14;

const COLOUR_BG = 0xFF101318;
const COLOUR_SIDEBAR = 0xFF171B22;
const COLOUR_SELECTED = 0xFF2B3440;
const COLOUR_HOVER = 0xFF222A34;
const COLOUR_TEXT = 0xFFE8EDF2;
const COLOUR_DIM = 0xFF9AA6B2;
const COLOUR_ACCENT = 0xFF4FA3F7;
const COLOUR_BAR = 0xFF25394C;
const COLOUR_DIVIDER = 0xFF2A313A;

let engine = 'worker';
let sources = [];
let selectedSource = -1;
let hoverSource = -1;
let scrollOffset = 0;
let requestId = 0;
let pendingRequestId = 0;
let pendingStarted = 0;
let stats = null;
let loading = false;

function cleanValue(value) {
    const text = String(value == null ? '' : value).trim();
    return text || '(unknown)';
}

function normaliseFieldName(name) {
    return String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function addCount(counts, value) {
    const key = cleanValue(value);
    counts.set(key, (counts.get(key) || 0) + 1);
}

function addNamedCount(counts, key, name) {
    const old = counts.get(key);
    if (old) {
        old.count++;
    } else {
        counts.set(key, { name, count: 1 });
    }
}

function topEntries(counts, limit) {
    return Array.from(counts.entries())
        .map(entry => ({ name: entry[0], count: entry[1] }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, limit);
}

function topNamedEntries(counts, limit) {
    return Array.from(counts.values())
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, limit);
}

function knownCount(counts) {
    return counts.size - (counts.has('(unknown)') ? 1 : 0);
}

function extractYear(value) {
    const match = String(value || '').match(/\d{4}/);
    return match ? match[0] : '(unknown)';
}

function normaliseSampleRate(value) {
    const text = cleanValue(value);
    if (text === '(unknown)') return text;

    let rate = parseFloat(text.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(rate) || rate <= 0) return text;
    if (/khz/i.test(text)) rate *= 1000;

    if (rate >= 1000) {
        const khz = rate / 1000;
        return `${Number.isInteger(khz) ? khz.toFixed(0) : khz.toFixed(1)} kHz`;
    }
    return `${Math.round(rate)} Hz`;
}

function analyseHandles(handles) {
    const artistCounts = new Map();
    const albumCounts = new Map();
    const genreCounts = new Map();
    const yearCounts = new Map();
    const codecCounts = new Map();
    const sampleRateCounts = new Map();

    let totalSeconds = 0;
    let totalBytes = 0;
    let bitrateTotal = 0;
    let bitrateCount = 0;

    const items = handles.Convert();

    for (const handle of items) {
        const length = Number(handle.Length);
        if (Number.isFinite(length) && length > 0) totalSeconds += length;

        const fileSize = Number(handle.FileSize);
        if (Number.isFinite(fileSize) && fileSize > 0) totalBytes += fileSize;

        const trackArtists = [];
        const albumArtists = [];
        const genres = [];
        let album = '';
        let date = '';
        let codec = '';
        let sampleRate = '';
        let bitrate = NaN;

        const info = handle.GetFileInfo();
        if (info) {
            for (let i = 0; i < info.MetaCount; ++i) {
                const name = normaliseFieldName(info.MetaName(i));
                const valueCount = info.MetaValueCount(i);

                for (let j = 0; j < valueCount; ++j) {
                    const value = cleanValue(info.MetaValue(i, j));
                    if (value === '(unknown)') continue;

                    if (name === 'ARTIST') trackArtists.push(value);
                    else if (name === 'ALBUMARTIST') albumArtists.push(value);
                    else if (name === 'ALBUM' && !album) album = value;
                    else if (name === 'GENRE') genres.push(value);
                    else if ((name === 'DATE' || name === 'YEAR') && !date) date = value;
                }
            }

            for (let i = 0; i < info.InfoCount; ++i) {
                const name = normaliseFieldName(info.InfoName(i));
                const value = cleanValue(info.InfoValue(i));

                if (name === 'CODEC' && !codec) codec = value;
                else if (name === 'SAMPLERATE' && !sampleRate) sampleRate = value;
                else if (name === 'BITRATE' && !Number.isFinite(bitrate)) {
                    const parsed = parseFloat(value);
                    if (Number.isFinite(parsed) && parsed > 0) bitrate = parsed;
                }
            }
        }

        if (trackArtists.length) {
            for (const artist of new Set(trackArtists)) addCount(artistCounts, artist);
        } else {
            addCount(artistCounts, '(unknown)');
        }

        const albumOwner = albumArtists[0] || trackArtists[0] || '(unknown)';
        if (album) {
            const albumKey = `${albumOwner}\u0000${album}`;
            const albumLabel = albumOwner === '(unknown)' ? album : `${album} — ${albumOwner}`;
            addNamedCount(albumCounts, albumKey, albumLabel);
        } else {
            addNamedCount(albumCounts, '(unknown)', '(unknown)');
        }

        if (genres.length) {
            for (const genre of new Set(genres)) addCount(genreCounts, genre);
        } else {
            addCount(genreCounts, '(unknown)');
        }

        addCount(yearCounts, extractYear(date));
        addCount(codecCounts, codec || '(unknown)');
        addCount(sampleRateCounts, normaliseSampleRate(sampleRate));

        if (Number.isFinite(bitrate)) {
            bitrateTotal += bitrate;
            bitrateCount++;
        }
    }

    let averageBitrate = bitrateCount ? bitrateTotal / bitrateCount : 0;
    if (!averageBitrate && totalSeconds > 0 && totalBytes > 0) {
        averageBitrate = totalBytes * 8 / totalSeconds / 1000;
    }

    return {
        tracks: handles.Count,
        totalSeconds,
        totalBytes,
        uniqueArtists: knownCount(artistCounts),
        uniqueAlbums: albumCounts.size - (albumCounts.has('(unknown)') ? 1 : 0),
        uniqueGenres: knownCount(genreCounts),
        averageBitrate,
        topArtists: topEntries(artistCounts, 8),
        topAlbums: topNamedEntries(albumCounts, 8),
        topGenres: topEntries(genreCounts, 8),
        topYears: topEntries(yearCounts, 8),
        codecs: topEntries(codecCounts, 8),
        sampleRates: topEntries(sampleRateCounts, 8)
    };
}

const workerSource = `'use strict';\n\n${cleanValue.toString()}\n\n${normaliseFieldName.toString()}\n\n${addCount.toString()}\n\n${addNamedCount.toString()}\n\n${topEntries.toString()}\n\n${topNamedEntries.toString()}\n\n${knownCount.toString()}\n\n${extractYear.toString()}\n\n${normaliseSampleRate.toString()}\n\n${analyseHandles.toString()}\n\nonmessage = function (event) {\n    const started = performance.now();\n    const result = analyseHandles(event.data.handles);\n    result.requestId = event.data.requestId;\n    result.calcElapsed = performance.now() - started;\n    postMessage(result);\n};`;

const worker = new Worker(workerSource, 'playlist-statistics');

worker.onmessage = function (event) {
    if (event.data.requestId !== pendingRequestId || engine !== 'worker') return;
    stats = event.data;
    stats.totalElapsed = performance.now() - pendingStarted;
    loading = false;
    window.Repaint();
};

worker.onerror = function (event) {
    loading = false;
    console.log(`Worker error: ${event.message}`);
    window.Repaint();
};

function sidebarWidth() {
    return Math.max(180, Math.min(320, Math.round(window.Width * 0.32)));
}

function visibleRows() {
    return Math.max(1, Math.floor(window.Height / ROW_HEIGHT));
}

function clampScroll() {
    const maxOffset = Math.max(0, sources.length - visibleRows());
    scrollOffset = Math.max(0, Math.min(maxOffset, scrollOffset));
}

function ensureSelectedVisible() {
    if (selectedSource < scrollOffset) {
        scrollOffset = selectedSource;
    } else {
        const rows = visibleRows();
        if (selectedSource >= scrollOffset + rows) {
            scrollOffset = selectedSource - rows + 1;
        }
    }
    clampScroll();
}

function selectSource(index) {
    if (!sources.length) return;
    index = Math.max(0, Math.min(sources.length - 1, index));
    if (index === selectedSource) return;

    selectedSource = index;
    ensureSelectedVisible();
    analyseSelectedSource();
}

function sourceKey(source) {
    return source && source.library ? 'library' : source ? 'playlist:' + source.name : '';
}

function refreshSources() {
    const previousKey = selectedSource >= 0 && selectedSource < sources.length
        ? sourceKey(sources[selectedSource])
        : '';

    sources = [{ library: true, index: -1, name: 'Media Library' }];
    for (let i = 0; i < plman.PlaylistCount; ++i) {
        sources.push({ library: false, index: i, name: plman.GetPlaylistName(i) });
    }

    let next = -1;
    if (previousKey) next = sources.findIndex(item => sourceKey(item) === previousKey);
    if (next < 0 && plman.ActivePlaylist >= 0 && plman.ActivePlaylist < plman.PlaylistCount) {
        next = plman.ActivePlaylist + 1;
    }
    if (next < 0) next = 0;

    selectedSource = next;
    clampScroll();
    analyseSelectedSource();
}

function getSelectedHandles() {
    if (selectedSource < 0 || selectedSource >= sources.length) return null;
    const source = sources[selectedSource];
    return source.library ? fb.GetLibraryItems() : plman.GetPlaylistItems(source.index);
}

function analyseSelectedSource() {
    const handles = getSelectedHandles();
    if (!handles) return;

    const id = ++requestId;
    pendingRequestId = id;
    pendingStarted = performance.now();
    stats = null;
    loading = true;
    window.Repaint();

    if (engine === 'worker') {
        // FbMetadbHandleList is CLONEABLE. The panel keeps its own usable list.
        worker.postMessage({ requestId: id, handles });
        return;
    }

    // Defer one task so the panel can present the loading state before the synchronous baseline.
    const started = pendingStarted;
    setTimeout(() => {
        if (id !== pendingRequestId || engine !== 'main') return;
        const calcStarted = performance.now();
        const result = analyseHandles(handles);
        result.requestId = id;
        result.calcElapsed = performance.now() - calcStarted;
        result.totalElapsed = performance.now() - started;
        stats = result;
        loading = false;
        window.Repaint();
    }, 0);
}

function formatDuration(totalSeconds) {
    let seconds = Math.max(0, Math.round(totalSeconds || 0));
    const hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;
    const minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;
    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatBytes(bytes) {
    let value = Math.max(0, Number(bytes) || 0);
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit++;
    }
    const digits = value >= 100 || unit === 0 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(digits)} ${units[unit]}`;
}

function formatCount(value) {
    return Math.max(0, Number(value) || 0).toLocaleString();
}

function engineRects() {
    const y = 10;
    const x = Math.max(sidebarWidth() + PADDING, window.Width - 174);
    return {
        label: { x, y, w: 46, h: 26 },
        main: { x: x + 48, y, w: 48, h: 26 },
        worker: { x: x + 100, y, w: 60, h: 26 }
    };
}

function contains(rect, x, y) {
    return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

function drawChoice(gr, rect, text, selected) {
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h, selected ? 0xFF355D7A : 0xFF20262E);
    gr.GdiDrawText(text, FONT, selected ? 0xFFFFFFFF : 0xFFB7C1CB,
        rect.x, rect.y, rect.w, rect.h, DT_CENTER | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
}

function drawEntryList(gr, title, entries, x, y, w, maxRows) {
    gr.GdiDrawText(title, FONT_BOLD, COLOUR_TEXT, x, y, w, 24, DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    y += 26;

    const shown = entries.slice(0, maxRows);
    const maxCount = shown.length ? Math.max(...shown.map(entry => entry.count)) : 1;

    for (const entry of shown) {
        const barWidth = Math.max(2, (w - 54) * entry.count / maxCount);
        gr.FillSolidRect(x, y + 4, barWidth, 18, COLOUR_BAR);
        gr.GdiDrawText(entry.name, FONT, COLOUR_TEXT, x + 6, y, Math.max(1, w - 58), 26,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
        gr.GdiDrawText(String(entry.count), FONT, COLOUR_DIM, x + w - 48, y, 48, 26,
            DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
        y += 27;
    }
}

function on_paint(gr) {
    const sw = sidebarWidth();
    gr.FillSolidRect(0, 0, window.Width, window.Height, COLOUR_BG);
    gr.FillSolidRect(0, 0, sw, window.Height, COLOUR_SIDEBAR);
    gr.FillSolidRect(sw - 1, 0, 1, window.Height, COLOUR_DIVIDER);

    for (let row = 0; row < visibleRows(); ++row) {
        const listIndex = scrollOffset + row;
        if (listIndex >= sources.length) break;
        const y = row * ROW_HEIGHT;

        if (listIndex === selectedSource) {
            gr.FillSolidRect(0, y, sw - 1, ROW_HEIGHT, COLOUR_SELECTED);
            gr.FillSolidRect(0, y, 3, ROW_HEIGHT, COLOUR_ACCENT);
        } else if (listIndex === hoverSource) {
            gr.FillSolidRect(0, y, sw - 1, ROW_HEIGHT, COLOUR_HOVER);
        }

        gr.GdiDrawText(sources[listIndex].name, sources[listIndex].library ? FONT_BOLD : FONT, COLOUR_TEXT,
            10, y, sw - 20, ROW_HEIGHT,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);

        if (listIndex === 0 && scrollOffset === 0) {
            gr.FillSolidRect(10, ROW_HEIGHT - 1, Math.max(1, sw - 20), 1, COLOUR_DIVIDER);
        }
    }

    const x = sw + PADDING;
    const w = Math.max(1, window.Width - x - PADDING);
    let y = PADDING;

    if (selectedSource < 0 || selectedSource >= sources.length) return;

    const engineUi = engineRects();
    const titleRight = Math.max(x + 1, engineUi.label.x - 10);
    gr.GdiDrawText('Statistics', FONT_TITLE, COLOUR_TEXT, x, y,
        Math.max(1, titleRight - x), 34,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);

    gr.GdiDrawText('Engine:', FONT, COLOUR_DIM,
        engineUi.label.x, engineUi.label.y, engineUi.label.w, engineUi.label.h,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    drawChoice(gr, engineUi.main, 'Main', engine === 'main');
    drawChoice(gr, engineUi.worker, 'Worker', engine === 'worker');
    y += 42;

    if (loading) {
        gr.GdiDrawText(`Calculating in ${engine === 'worker' ? 'Worker' : 'Main'}…`, FONT, COLOUR_DIM, x, y, w, 28,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
        return;
    }

    if (!stats) return;

    gr.GdiDrawText(`${engine === 'worker' ? 'Worker' : 'Main'}  •  calc ${stats.calcElapsed.toFixed(1)} ms  •  total ${stats.totalElapsed.toFixed(1)} ms`,
        FONT, COLOUR_DIM, x, y, w, 24,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    y += 28;

    gr.GdiDrawText(`Tracks  ${formatCount(stats.tracks)}`, FONT_BOLD, COLOUR_TEXT, x, y, w / 2, 26,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    gr.GdiDrawText(`Duration  ${formatDuration(stats.totalSeconds)}`, FONT_BOLD, COLOUR_TEXT, x + w / 2, y, w / 2, 26,
        DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    y += 26;

    gr.GdiDrawText(`Size  ${formatBytes(stats.totalBytes)}`, FONT_BOLD, COLOUR_TEXT, x, y, w / 2, 26,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    gr.GdiDrawText(`Avg bitrate  ${Math.round(stats.averageBitrate || 0)} kbps`, FONT_BOLD, COLOUR_TEXT, x + w / 2, y, w / 2, 26,
        DT_RIGHT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);
    y += 30;

    gr.GdiDrawText(`Artists  ${formatCount(stats.uniqueArtists)}  •  Albums  ${formatCount(stats.uniqueAlbums)}  •  Genres  ${formatCount(stats.uniqueGenres)}`,
        FONT, COLOUR_DIM, x, y, w, 24,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
    y += 34;

    const sections = [
        { title: 'Top artists', entries: stats.topArtists },
        { title: 'Top albums', entries: stats.topAlbums },
        { title: 'Genres', entries: stats.topGenres },
        { title: 'Years', entries: stats.topYears },
        { title: 'Codecs', entries: stats.codecs },
        { title: 'Sample rates', entries: stats.sampleRates }
    ];

    const columns = w >= 560 ? 2 : 1;
    const sectionRows = Math.ceil(sections.length / columns);
    const gapX = 18;
    const gapY = 10;
    const columnWidth = columns === 2 ? (w - gapX) / 2 : w;
    const available = Math.max(60, window.Height - y - PADDING);
    const rowsPerSection = Math.max(1, Math.min(5,
        Math.floor((available / sectionRows - 26 - gapY) / 27)));
    const sectionHeight = 26 + rowsPerSection * 27 + gapY;

    for (let i = 0; i < sections.length; ++i) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        drawEntryList(gr, sections[i].title, sections[i].entries,
            x + column * (columnWidth + gapX), y + row * sectionHeight,
            columnWidth, rowsPerSection);
    }
}

function on_mouse_move(x, y) {
    const sw = sidebarWidth();
    const oldHover = hoverSource;
    hoverSource = -1;

    if (x >= 0 && x < sw && y >= 0 && y < window.Height) {
        const row = Math.floor(y / ROW_HEIGHT);
        const index = scrollOffset + row;
        if (index >= 0 && index < sources.length) hoverSource = index;
    }

    if (hoverSource !== oldHover) window.Repaint();
}

function on_mouse_leave() {
    if (hoverSource !== -1) {
        hoverSource = -1;
        window.Repaint();
    }
}

function on_mouse_lbtn_up(x, y) {
    const engineUi = engineRects();
    let nextEngine = engine;
    if (contains(engineUi.main, x, y)) nextEngine = 'main';
    else if (contains(engineUi.worker, x, y)) nextEngine = 'worker';

    if (nextEngine !== engine) {
        engine = nextEngine;
        analyseSelectedSource();
        return;
    }

    const sw = sidebarWidth();
    if (x < 0 || x >= sw || y < 0 || y >= window.Height) return;

    const index = scrollOffset + Math.floor(y / ROW_HEIGHT);
    if (index < 0 || index >= sources.length) return;

    selectSource(index);
}

function on_key_down(vkey) {
    if (!sources.length) return;

    let next = selectedSource < 0 ? 0 : selectedSource;
    const page = Math.max(1, visibleRows() - 1);

    switch (vkey) {
        case VK_UP:
            next--;
            break;
        case VK_DOWN:
            next++;
            break;
        case VK_HOME:
            next = 0;
            break;
        case VK_END:
            next = sources.length - 1;
            break;
        case VK_PRIOR:
            next -= page;
            break;
        case VK_NEXT:
            next += page;
            break;
        default:
            return;
    }

    selectSource(next);
}

function on_mouse_wheel(step) {
    if (!sources.length) return;
    const oldOffset = scrollOffset;
    scrollOffset -= step * 3;
    clampScroll();
    if (scrollOffset !== oldOffset) window.Repaint();
}

function on_size() {
    clampScroll();
    window.Repaint();
}

function on_playlists_changed() {
    refreshSources();
}

function on_playlist_items_added(playlistIndex) {
    const source = sources[selectedSource];
    if (source && !source.library && source.index === playlistIndex) analyseSelectedSource();
}

function on_playlist_items_removed(playlistIndex) {
    const source = sources[selectedSource];
    if (source && !source.library && source.index === playlistIndex) analyseSelectedSource();
}

function on_playlist_items_reordered(playlistIndex) {
    const source = sources[selectedSource];
    if (source && !source.library && source.index === playlistIndex) analyseSelectedSource();
}

function on_library_items_added() {
    const source = sources[selectedSource];
    if (source && source.library) analyseSelectedSource();
}

function on_library_items_removed() {
    const source = sources[selectedSource];
    if (source && source.library) analyseSelectedSource();
}

function on_library_items_changed() {
    const source = sources[selectedSource];
    if (source && source.library) analyseSelectedSource();
}

refreshSources();
