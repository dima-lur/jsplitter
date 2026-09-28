window.DefineScript('Audio Stream Selector');

// Visual selector for audio streams exposed by the input decoder.
// The panel follows the focused playlist item. Click a stream card to select it.
// If the focused item is currently playing, SetAudioStream() restarts playback
// automatically when the effective stream changes.

include("docs/Helpers.js");

const MARGIN = 12;
const HEADER_HEIGHT = 34;
const CARD_GAP = 8;
const CARD_PADDING = 10;
const CARD_HEADER_HEIGHT = 24;
const INFO_LINE_HEIGHT = 17;
const SCROLL_STEP = 48;

const BG = RGB(24, 24, 24);
const CARD = RGB(38, 38, 38);
const CARD_HOVER = RGB(46, 46, 46);
const CARD_SELECTED = RGB(53, 70, 43);
const BORDER = RGB(70, 70, 70);
const BORDER_SELECTED = RGB(126, 170, 85);
const TEXT = RGB(230, 230, 230);
const TEXT_DIM = RGB(165, 165, 165);
const TEXT_ACCENT = RGB(190, 220, 145);
const ERROR = RGB(235, 125, 125);

const fontTitle = gdi.Font('Segoe UI', 15, 1);
const fontHeader = gdi.Font('Segoe UI', 13, 1);
const fontText = gdi.Font('Segoe UI', 12);
const fontSmall = gdi.Font('Segoe UI', 11);
const tfTitle = fb.TitleFormat('%title%[ - %artist%]');

let handle = null;
let streams = [];
let rows = [];
let hoverIndex = -1;
let scrollY = 0;
let contentHeight = 0;
let errorText = '';

function clampScroll() {
    const viewport = Math.max(0, window.Height - HEADER_HEIGHT - MARGIN);
    const maxScroll = Math.max(0, contentHeight - viewport);
    scrollY = Math.max(0, Math.min(scrollY, maxScroll));
}

function streamCardHeight(stream) {
    return CARD_PADDING * 2 + CARD_HEADER_HEIGHT + stream.info.InfoCount * INFO_LINE_HEIGHT;
}

function rebuildRows() {
    rows = [];
    let y = HEADER_HEIGHT + MARGIN;

    for (const stream of streams) {
        const height = streamCardHeight(stream);
        rows.push({ index: stream.index, y, height });
        y += height + CARD_GAP;
    }

    contentHeight = Math.max(0, y - (HEADER_HEIGHT + MARGIN));
    clampScroll();
}

function refresh() {
    handle = fb.GetFocusItem();
    streams = [];
    errorText = '';
    hoverIndex = -1;
    scrollY = 0;

    if (handle) {
        try {
            streams = fb.GetAudioStreams(handle);
        }
        catch (e) {
            errorText = e instanceof Error ? e.message : String(e);
        }
    }

    rebuildRows();
    window.Repaint();
}

function refreshStreamsOnly() {
    if (!handle) return;

    try {
        streams = fb.GetAudioStreams(handle);
        errorText = '';
    }
    catch (e) {
        streams = [];
        errorText = e instanceof Error ? e.message : String(e);
    }

    rebuildRows();
    window.Repaint();
}

function getRowAt(x, y) {
    if (x < MARGIN || x >= window.Width - MARGIN) return null;

    const contentY = y + scrollY;
    for (const row of rows) {
        if (contentY >= row.y && contentY < row.y + row.height) {
            return row;
        }
    }
    return null;
}

function drawHeader(gr) {
    const title = handle ? tfTitle.EvalWithMetadb(handle) : 'No focused item';
    gr.GdiDrawText(title, fontTitle, TEXT, MARGIN, 7, Math.max(0, window.Width - MARGIN * 2), 24, 0x00000020 | 0x00008000);
}

function drawMessage(gr, text, colour) {
    gr.GdiDrawText(text, fontText, colour, MARGIN, HEADER_HEIGHT + MARGIN,
        Math.max(0, window.Width - MARGIN * 2), Math.max(0, window.Height - HEADER_HEIGHT - MARGIN * 2),
        0x00000010);
}

function drawStream(gr, stream, row) {
    const x = MARGIN;
    const y = row.y - scrollY;
    const w = Math.max(0, window.Width - MARGIN * 2);
    const h = row.height;

    if (y + h < HEADER_HEIGHT || y > window.Height) return;

    const hovered = hoverIndex === stream.index;
    const fill = stream.selected ? CARD_SELECTED : (hovered ? CARD_HOVER : CARD);
    const border = stream.selected ? BORDER_SELECTED : BORDER;

    gr.FillSolidRect(x, y, w, h, fill);
    gr.DrawRect(x, y, w - 1, h - 1, 1, border);

    let flags = [];
    if (stream.selected) flags.push('selected');
    if (stream.default) flags.push('default');

    const heading = `Stream ${stream.index}${flags.length ? `  [${flags.join(', ')}]` : ''}`;
    gr.GdiDrawText(heading, fontHeader, stream.selected ? TEXT_ACCENT : TEXT,
        x + CARD_PADDING, y + CARD_PADDING, Math.max(0, w - CARD_PADDING * 2), CARD_HEADER_HEIGHT,
        0x00000020 | 0x00008000);

    let infoY = y + CARD_PADDING + CARD_HEADER_HEIGHT;
    for (let i = 0; i < stream.info.InfoCount; ++i) {
        const name = stream.info.InfoName(i);
        const value = stream.info.InfoValue(i);
        gr.GdiDrawText(`${name}: ${value}`, fontSmall, TEXT_DIM,
            x + CARD_PADDING, infoY, Math.max(0, w - CARD_PADDING * 2), INFO_LINE_HEIGHT,
            0x00000020 | 0x00008000);
        infoY += INFO_LINE_HEIGHT;
    }
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, BG);
    drawHeader(gr);

    if (!handle) {
        drawMessage(gr, 'Focus a playlist item to inspect its audio streams.', TEXT_DIM);
        return;
    }

    if (errorText) {
        drawMessage(gr, `GetAudioStreams failed:\n${errorText}`, ERROR);
        return;
    }

    if (!streams.length) {
        drawMessage(gr, 'The input decoder does not expose selectable audio streams for this file.', TEXT_DIM);
        return;
    }

    for (let i = 0; i < streams.length; ++i) {
        drawStream(gr, streams[i], rows[i]);
    }
}

function on_mouse_move(x, y) {
    const row = getRowAt(x, y);
    const next = row ? row.index : -1;
    if (next !== hoverIndex) {
        hoverIndex = next;
        window.Repaint();
    }
}

function on_mouse_leave() {
    if (hoverIndex !== -1) {
        hoverIndex = -1;
        window.Repaint();
    }
}

function on_mouse_lbtn_up(x, y) {
    const row = getRowAt(x, y);
    if (!row || !handle) return;

    const stream = streams.find(item => item.index === row.index);
    if (!stream || stream.selected) return;

    try {
        fb.SetAudioStream(handle, stream.index);
        refreshStreamsOnly();
    }
    catch (e) {
        errorText = e instanceof Error ? e.message : String(e);
        window.Repaint();
    }
}

function on_mouse_wheel(step) {
    scrollY -= step * SCROLL_STEP;
    clampScroll();
    window.Repaint();
}

function on_size() {
    clampScroll();
}

function on_item_focus_change() {
    refresh();
}

function on_playlist_switch() {
    refresh();
}

refresh();
