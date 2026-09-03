"use strict";

const PALETTE_SIZE = 15;

const VK_RETURN = 0x0D;
const VK_UP = 0x26;
const VK_DOWN = 0x28;

const DT_LEFT = 0x00000000;
const DT_CENTER = 0x00000001;
const DT_VCENTER = 0x00000004;
const DT_SINGLELINE = 0x00000020;

const FONT = gdi.Font('Segoe UI', 14, 0);
const FONT_BOLD = gdi.Font('Segoe UI Semibold', 14, 0) || FONT;
const SMALL_FONT = gdi.Font('Segoe UI', 12, 0) || FONT;
const FALLBACK_BACKGROUND = 0xFF181818;
const FALLBACK_TEXT = 0xFFE8E8E8;
const ROWS = [
    ['Sample Artist', 'Prelude'],
    ['Sample Artist', 'Nocturne'],
    ['Sample Artist', 'Intermezzo'],
    ['Sample Artist', 'Adagio'],
    ['Sample Artist', 'Allegro'],
    ['Sample Artist', 'Finale'],
    ['Sample Artist', 'Encore']
];

let artwork = null;
let scheme = null;
let requestId = 0;
let selectedRow = 3;
let focusedRow = 3;
let playingRow = 1;

function focusedTrack() {
    const playlist = plman.ActivePlaylist;
    const index = plman.GetPlaylistFocusItemIndex(playlist);
    if (index < 0) return fb.GetNowPlaying();

    const items = plman.GetPlaylistItems(playlist).Convert();
    return items[index] || fb.GetNowPlaying();
}

function loadArtwork() {
    const handle = focusedTrack();
    const id = ++requestId;

    artwork = null;
    scheme = null;
    window.Repaint();

    if (!handle) return;

    utils.GetAlbumArtAsyncV2(window.ID, handle, 0, true).then(result => {
        if (id !== requestId) return;
        artwork = result ? result.image : null;
        scheme = artwork ? JSON.parse(artwork.GetThemeColourSchemeJSON(PALETTE_SIZE)) : null;
        window.Repaint();
    }).catch(() => {
        if (id !== requestId) return;
        artwork = null;
        scheme = null;
        window.Repaint();
    });
}

function colours() {
    return scheme || {
        backgroundColor: FALLBACK_BACKGROUND,
        textColor: FALLBACK_TEXT,
        playingBackgroundColor: 0x383A6C55,
        focusFrameColor: FALLBACK_TEXT,
        selectionBackgroundColor: 0x665A5A5A
    };
}

// playingBackgroundColor contains the Playing accent RGB together with the
// recommended alpha for the row highlight. Reuse the same RGB at full opacity
// when a solid Playing indicator is needed.
function opaque(color) {
    return 0xFF000000 | (color & 0x00FFFFFF);
}

// Same muted text treatment used by Materialize Playlist: preserve the selected
// Text RGB and reduce only its alpha.
function mutedText(color, strength = 0.40) {
    const sourceAlpha = (color >>> 24) & 0xFF;
    const alpha = Math.max(0, Math.min(255, Math.round(sourceAlpha * strength)));
    return (alpha << 24) | (color & 0x00FFFFFF);
}

function layout() {
    const w = window.Width;
    const h = window.Height;
    const margin = 24;
    const gap = 28;
    const legendH = 128;
    const coverSize = Math.max(1, Math.min(h - margin * 2, Math.floor(w * 0.42)));
    const listX = margin + coverSize + gap;
    const listW = Math.max(0, w - listX - margin);
    const rowAreaH = Math.max(0, h - margin * 2 - legendH - 18);
    const rowH = Math.max(30, Math.min(48, Math.floor(rowAreaH / ROWS.length)));
    const listH = rowH * ROWS.length;
    const blockH = listH + 18 + legendH;
    const listY = Math.floor((h - blockH) / 2);
    const legendY = listY + listH + 18;
    return { margin, coverSize, listX, listY, listW, rowH, legendY, legendH };
}

function fillFrame(gr, x, y, w, h, thickness, color) {
    gr.FillSolidRect(x, y, w, thickness, color);
    gr.FillSolidRect(x, y + h - thickness, w, thickness, color);
    gr.FillSolidRect(x, y, thickness, h, color);
    gr.FillSolidRect(x + w - thickness, y, thickness, h, color);
}

function drawArtwork(gr, x, y, size, frameColor) {
    if (!artwork) return;

    const scale = Math.min(size / artwork.Width, size / artwork.Height);
    const dw = Math.max(1, Math.round(artwork.Width * scale));
    const dh = Math.max(1, Math.round(artwork.Height * scale));
    const dx = Math.round(x + (size - dw) / 2);
    const dy = Math.round(y + (size - dh) / 2);

    gr.DrawImage(artwork, dx, dy, dw, dh, 0, 0, artwork.Width, artwork.Height, 0, 255);
    fillFrame(gr, dx, dy, dw, dh, 1, frameColor);
}

function drawLegendSwatch(gr, x, y, c, kind, muted) {
    const sw = 48;
    const sh = 16;

    gr.FillSolidRect(x, y, sw, sh, c.backgroundColor);

    if (kind === 'background') {
        fillFrame(gr, x, y, sw, sh, 1, muted);
    } else if (kind === 'text') {
        fillFrame(gr, x, y, sw, sh, 1, muted);
        gr.DrawText('Aa', FONT_BOLD, c.textColor, x + 8, y - 1, sw - 16, sh + 2,
            DT_CENTER | DT_VCENTER | DT_SINGLELINE);
    } else if (kind === 'playing') {
        gr.FillSolidRect(x, y, sw, sh, c.playingBackgroundColor);
        gr.FillSolidRect(x, y, 5, sh, opaque(c.playingBackgroundColor));
    } else if (kind === 'focus') {
        fillFrame(gr, x, y, sw, sh, 2, c.focusFrameColor);
    } else if (kind === 'selection') {
        gr.FillSolidRect(x, y, sw, sh, c.selectionBackgroundColor);
    }
}

function drawLegend(gr, x, y, w, c) {
    const muted = mutedText(c.textColor);
    const titleH = 18;
    const rowH = 22;
    const labelX = x + 60;
    const items = [
        ['background', 'Background'],
        ['text', 'Text'],
        ['playing', 'Playing background + accent'],
        ['focus', 'Focus'],
        ['selection', 'Selection']
    ];

    gr.DrawText('Legend', FONT_BOLD, c.textColor, x, y, w, titleH,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE);

    for (let i = 0; i < items.length; i++) {
        const iy = y + titleH + i * rowH;
        drawLegendSwatch(gr, x, iy + 3, c, items[i][0], muted);
        gr.DrawText(items[i][1], SMALL_FONT, c.textColor,
            labelX, iy + 2, Math.max(0, w - 60), rowH,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    }
}

function on_paint(gr) {
    const c = colours();
    const l = layout();
    const muted = mutedText(c.textColor);

    gr.FillSolidRect(0, 0, window.Width, window.Height, c.backgroundColor);
    drawArtwork(gr, l.margin, Math.floor((window.Height - l.coverSize) / 2), l.coverSize, muted);

    const artistW = Math.floor(l.listW * 0.38);
    const numberW = 34;
    const playingIndicatorW = 6;

    for (let i = 0; i < ROWS.length; i++) {
        const y = l.listY + i * l.rowH;

        if (i === playingRow) {
            gr.FillSolidRect(l.listX, y, l.listW, l.rowH, c.playingBackgroundColor);
            gr.FillSolidRect(l.listX, y, playingIndicatorW, l.rowH,
                opaque(c.playingBackgroundColor));
        }
        if (i === selectedRow) {
            gr.FillSolidRect(l.listX, y, l.listW, l.rowH, c.selectionBackgroundColor);
        }

        gr.DrawText(String(i + 1).padStart(2, '0'), FONT, c.textColor,
            l.listX + playingIndicatorW + 10, y, numberW - 8, l.rowH,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        gr.DrawText(ROWS[i][0], i === playingRow ? FONT_BOLD : FONT, c.textColor,
            l.listX + playingIndicatorW + numberW, y,
            Math.max(0, artistW - numberW), l.rowH,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        gr.DrawText(ROWS[i][1], i === playingRow ? FONT_BOLD : FONT, c.textColor,
            l.listX + playingIndicatorW + artistW + 12, y,
            Math.max(0, l.listW - artistW - 22 - playingIndicatorW), l.rowH,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE);

        if (i === focusedRow) {
            fillFrame(gr, l.listX, y, l.listW, l.rowH, 2, c.focusFrameColor);
        }
    }

    drawLegend(gr, l.listX, l.legendY, l.listW, c);
}

function rowAt(x, y) {
    const l = layout();
    if (x < l.listX || x >= l.listX + l.listW || y < l.listY) return -1;
    const row = Math.floor((y - l.listY) / l.rowH);
    return row >= 0 && row < ROWS.length ? row : -1;
}

function on_mouse_lbtn_down(x, y) {
    const row = rowAt(x, y);
    if (row < 0) return;
    selectedRow = row;
    focusedRow = row;
    window.Repaint();
}

function on_mouse_lbtn_dblclk(x, y) {
    const row = rowAt(x, y);
    if (row < 0) return;
    selectedRow = row;
    focusedRow = row;
    playingRow = row;
    window.Repaint();
}

function on_key_down(vkey) {
    if (vkey === VK_UP) {
        focusedRow = Math.max(0, focusedRow - 1);
        selectedRow = focusedRow;
        window.Repaint();
    } else if (vkey === VK_DOWN) {
        focusedRow = Math.min(ROWS.length - 1, focusedRow + 1);
        selectedRow = focusedRow;
        window.Repaint();
    } else if (vkey === VK_RETURN) {
        playingRow = focusedRow;
        window.Repaint();
    }
}

function on_item_focus_change() {
    loadArtwork();
}

function on_playlist_switch() {
    loadArtwork();
}

function on_playback_new_track() {
    if (plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist) < 0) loadArtwork();
}

loadArtwork();
