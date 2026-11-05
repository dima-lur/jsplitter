include('docs/Flags.js');

// JSplitter vis sample: current PCM channel map and interactive source routing.
//
// vis.AudioFormat describes the post-processing stream received by the
// visualization engine. Click a channel card to route it to the highlighted
// Peak Meter. The active route alternates A/B after every assignment; clicking
// a meter row selects that route explicitly.
//
// Named channels use Names[0], the canonical selector. A channel whose flag is
// unknown to JSplitter has Names=[] and remains selectable by its numeric Index.

const INITIAL_UPDATE_INTERVAL = vis.UpdateIntervalMs;
vis.UpdateIntervalMs = 16;

const COLOR = {
    background: 0xff0b0e13,
    header: 0xff111722,
    panel: 0xff101620,
    card: 0xff151d29,
    cardHover: 0xff1c2837,
    border: 0xff2b3747,
    text: 0xffedf3f8,
    muted: 0xff91a0b2,
    faint: 0xff647286,
    routeA: 0xff38d6c5,
    routeB: 0xffa987ff,
    green: 0xff5bd982,
    yellow: 0xffffcf5c,
    red: 0xffff6577,
    white: 0xffffffff
};

const FONT_TITLE = gdi.Font('Segoe UI', 18, 1);
const FONT_SUBTITLE = gdi.Font('Segoe UI', 10);
const FONT_CARD = gdi.Font('Segoe UI', 11, 1);
const FONT_META = gdi.Font('Segoe UI', 9);
const FONT_LANE = gdi.Font('Segoe UI', 15, 1);

const METER_RANGES = [
    {to: -18, color: COLOR.green},
    {to: -6, color: COLOR.yellow},
    {to: 0, color: COLOR.red}
];

const meters = [
    vis.Create(VisSourceType.PeakMeter, {
        channel: 'mix', minDb: -60, maxDb: 0, attackMs: 0,
        releaseMs: 170, peakHoldMs: 500, peakGravity: 3, clipHoldMs: 1000
    }, {
        ranges: METER_RANGES,
        segmentSize: 6, segmentGap: 2, colorMode: 'gradient',
        peakColor: COLOR.white, peakSize: 2, showPeak: true,
        showClip: true, clipWidth: 4, clipColor: COLOR.red
    }),
    vis.Create(VisSourceType.PeakMeter, {
        channel: 'mix', minDb: -60, maxDb: 0, attackMs: 0,
        releaseMs: 170, peakHoldMs: 500, peakGravity: 3, clipHoldMs: 1000
    }, {
        ranges: METER_RANGES,
        segmentSize: 6, segmentGap: 2, colorMode: 'gradient',
        peakColor: COLOR.white, peakSize: 2, showPeak: true,
        showClip: true, clipWidth: 4, clipColor: COLOR.red
    })
];

let audioFormat = null;
let formatSignature = '';
let selectors = ['mix', 'mix'];
let autoSelectionDone = false;
let activeRoute = 0;
let hoveredCard = -1;
let hoveredLane = -1;
let channelRects = [];
let laneRects = [];

function hex32(value) {
    return '0x' + ('00000000' + (value >>> 0).toString(16).toUpperCase()).slice(-8);
}

function rateText(rate) {
    const khz = rate / 1000;
    return (Math.round(khz * 10) / 10).toFixed(khz % 1 ? 1 : 0) + ' kHz';
}

function selectorText(value) {
    if (value === 'mix') return 'mix';
    return typeof value === 'number' ? 'index ' + value : value;
}

function selectorCode(value) {
    return typeof value === 'string' ? 'Channel = "' + value + '"' : 'Channel = ' + value;
}

function selectorFor(channel) {
    return channel.Names && channel.Names.length ? channel.Names[0] : channel.Index;
}

function selectorMatches(channel, selector) {
    if (typeof selector === 'number') return selector === channel.Index;
    return channel.Names && channel.Names.indexOf(selector) !== -1;
}

function selectorAvailable(format, selector) {
    if (selector === 'mix') return true;
    return format.Channels.some(channel => selectorMatches(channel, selector));
}

function setRoute(slot, selector) {
    meters[slot].Channel = selector;
    // The getter demonstrates canonicalization: "left" would read back as
    // "front-left". Unknown flags retain their numeric index.
    selectors[slot] = meters[slot].Channel;
}

function defaultSelector(format, slot) {
    if (!format.Channels.length) return 'mix';
    return selectorFor(format.Channels[Math.min(slot, format.Channels.length - 1)]);
}

function reconcileRoutes(format) {
    if (!autoSelectionDone) {
        setRoute(0, defaultSelector(format, 0));
        setRoute(1, defaultSelector(format, 1));
        autoSelectionDone = true;
        return;
    }
    for (let slot = 0; slot < meters.length; ++slot) {
        if (!selectorAvailable(format, selectors[slot])) {
            setRoute(slot, defaultSelector(format, slot));
        }
    }
}

function signatureOf(format) {
    if (!format) return '';
    return [format.SampleRate, format.ChannelCount, format.ChannelConfig]
        .concat(format.Channels.map(channel =>
            channel.Index + ':' + channel.Flag + ':' + channel.Names.join(',')))
        .join('|');
}

function syncAudioFormat() {
    const next = vis.AudioFormat;
    const nextSignature = signatureOf(next);
    if (nextSignature === formatSignature && Boolean(next) === Boolean(audioFormat)) return;
    audioFormat = next;
    formatSignature = nextSignature;
    if (audioFormat) reconcileRoutes(audioFormat);
    window.Repaint();
}

function contains(rect, x, y) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}

function updateLayout() {
    const w = window.Width;
    const h = window.Height;
    const margin = 14;
    const gap = 8;
    const headerH = 94;
    const meterAreaH = Math.min(174, Math.max(118, h * 0.29));
    const metersTop = Math.max(headerH + 48, h - meterAreaH);

    laneRects = [];
    const laneGap = 9;
    const laneH = Math.max(42, (h - metersTop - margin - laneGap) / 2);
    for (let i = 0; i < 2; ++i) {
        laneRects.push({
            x: margin,
            y: metersTop + i * (laneH + laneGap),
            w: Math.max(0, w - margin * 2),
            h: laneH
        });
    }

    channelRects = [];
    if (!audioFormat || !audioFormat.Channels.length) return;

    const areaTop = headerH + 8;
    const areaBottom = metersTop - 18;
    const areaW = Math.max(0, w - margin * 2);
    const areaH = Math.max(0, areaBottom - areaTop);
    const count = audioFormat.Channels.length;
    const columns = Math.max(1, Math.min(count, Math.floor((areaW + gap) / (158 + gap))));
    const rows = Math.ceil(count / columns);
    const cardW = (areaW - gap * (columns - 1)) / columns;
    const cardH = Math.max(30, Math.min(72, (areaH - gap * (rows - 1)) / rows));

    for (let i = 0; i < count; ++i) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        channelRects.push({
            x: margin + column * (cardW + gap),
            y: areaTop + row * (cardH + gap),
            w: cardW,
            h: cardH
        });
    }
}

function hitTest(rects, x, y) {
    for (let i = 0; i < rects.length; ++i) {
        if (contains(rects[i], x, y)) return i;
    }
    return -1;
}

function selectedCard(slot) {
    if (!audioFormat) return -1;
    for (let i = 0; i < audioFormat.Channels.length; ++i) {
        if (selectorMatches(audioFormat.Channels[i], selectors[slot])) return i;
    }
    return -1;
}

function drawStatus(gr) {
    const w = window.Width;
    const state = audioFormat ? (fb.IsPaused ? 'PAUSED' : 'LIVE')
        : (fb.IsPlaying ? 'SYNCING' : 'NO STREAM');
    const stateColor = audioFormat ? (fb.IsPaused ? COLOR.yellow : COLOR.green) : COLOR.faint;
    const statusW = 86;
    const statusX = Math.max(14, w - statusW - 14);
    gr.FillSolidRect(statusX, 14, statusW, 24, COLOR.card);
    gr.DrawRect(statusX + 0.5, 14.5, statusW - 1, 23, 1, stateColor);
    const textW = gr.CalcTextWidth(state, FONT_META);
    gr.DrawString(state, FONT_META, stateColor,
        statusX + (statusW - textW) / 2, 19, textW + 2, 16);
}

function drawHeader(gr) {
    const w = window.Width;
    gr.FillSolidRect(0, 0, w, 94, COLOR.header);
    gr.FillSolidRect(0, 93, w, 1, COLOR.border);
    gr.DrawString('PCM channel explorer', FONT_TITLE, COLOR.text,
        14, 10, Math.max(0, w - 120), 28);
    drawStatus(gr);

    if (audioFormat) {
        const summary = rateText(audioFormat.SampleRate) + '  ·  ' +
            audioFormat.ChannelCount + (audioFormat.ChannelCount === 1 ? ' channel' : ' channels') +
            '  ·  ChannelConfig ' + hex32(audioFormat.ChannelConfig);
        gr.DrawString(summary, FONT_SUBTITLE, COLOR.muted,
            15, 43, Math.max(0, w - 30), 18);
        gr.DrawString('Click a PCM position to route it to the highlighted meter. Names[0] is used as the selector.',
            FONT_META, COLOR.faint, 15, 67, Math.max(0, w - 30), 17);
    } else {
        gr.DrawString('vis.AudioFormat → null', FONT_SUBTITLE, COLOR.muted,
            15, 43, Math.max(0, w - 30), 18);
        gr.DrawString('Start playback to inspect the post-processing stream.',
            FONT_META, COLOR.faint, 15, 67, Math.max(0, w - 30), 17);
    }
}

function drawRoutes(gr) {
    for (let slot = 0; slot < 2; ++slot) {
        const card = selectedCard(slot);
        if (card < 0 || !channelRects[card] || !laneRects[slot]) continue;
        const source = channelRects[card];
        const target = laneRects[slot];
        const color = slot === 0 ? COLOR.routeA : COLOR.routeB;
        const startX = source.x + source.w / 2;
        const startY = source.y + source.h;
        const bridgeY = target.y - 7 + slot * 3;
        const endX = target.x + 27;
        gr.DrawLine(startX, startY, startX, bridgeY, 2, color);
        gr.DrawLine(startX, bridgeY, endX, bridgeY, 2, color);
        gr.DrawLine(endX, bridgeY, endX, target.y, 2, color);
    }
}

function drawBadge(gr, text, x, y, color) {
    gr.FillSolidRect(x, y, 20, 18, color);
    const width = gr.CalcTextWidth(text, FONT_META);
    gr.DrawString(text, FONT_META, COLOR.background,
        x + (20 - width) / 2, y + 2, width + 2, 14);
}

function drawChannelCard(gr, channel, rect, index) {
    if (!rect || rect.w <= 2 || rect.h <= 2) return;
    const hover = index === hoveredCard;
    const selectedA = selectorMatches(channel, selectors[0]);
    const selectedB = selectorMatches(channel, selectors[1]);
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h,
        hover ? COLOR.cardHover : COLOR.card);
    gr.DrawRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1,
        1, hover ? COLOR.text : COLOR.border);
    if (selectedA) gr.DrawRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4,
        2, COLOR.routeA);
    if (selectedB) gr.DrawRect(rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10,
        2, COLOR.routeB);

    const names = channel.Names || [];
    const canonical = names.length ? names[0] : 'unknown position';
    const aliases = names.length > 1 ? names.slice(1).join(' · ') : 'index-only selector';
    const textX = rect.x + 10;
    const badgeSpace = (selectedA ? 25 : 0) + (selectedB ? 25 : 0);
    gr.DrawString('#' + channel.Index + '  ' + canonical, FONT_CARD, COLOR.text,
        textX, rect.y + 7, Math.max(0, rect.w - 20 - badgeSpace), 19);

    if (rect.h >= 52) {
        gr.DrawString(aliases, FONT_META, COLOR.muted,
            textX, rect.y + 28, Math.max(0, rect.w - 20), 16);
        gr.DrawString('Flag ' + hex32(channel.Flag), FONT_META, COLOR.faint,
            textX, rect.y + rect.h - 18, Math.max(0, rect.w - 20), 15);
    } else {
        gr.DrawString(hex32(channel.Flag), FONT_META, COLOR.faint,
            textX, rect.y + rect.h - 17, Math.max(0, rect.w - 20), 14);
    }

    let badgeX = rect.x + rect.w - 26;
    if (selectedB) {
        drawBadge(gr, 'B', badgeX, rect.y + 6, COLOR.routeB);
        badgeX -= 25;
    }
    if (selectedA) drawBadge(gr, 'A', badgeX, rect.y + 6, COLOR.routeA);
}

function drawEmptyState(gr) {
    const top = 110;
    const bottom = laneRects.length ? laneRects[0].y - 18 : window.Height - 20;
    const height = Math.max(30, bottom - top);
    const title = fb.IsPlaying ? 'Waiting for the first PCM chunk…' : 'No current audio stream';
    const width = gr.CalcTextWidth(title, FONT_CARD);
    gr.DrawString(title, FONT_CARD, COLOR.muted,
        Math.max(14, (window.Width - width) / 2), top + height / 2 - 10,
        Math.min(width + 4, Math.max(0, window.Width - 28)), 22);
}

function drawLane(gr, slot, rect) {
    if (!rect || rect.w <= 2 || rect.h <= 2) return;
    const active = slot === activeRoute;
    const color = slot === 0 ? COLOR.routeA : COLOR.routeB;
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h,
        slot === hoveredLane ? COLOR.cardHover : COLOR.panel);
    gr.DrawRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1,
        active ? 2 : 1, active ? color : COLOR.border);
    gr.FillSolidRect(rect.x + 9, rect.y + 9, 35, Math.max(20, rect.h - 18), color);
    gr.DrawString(slot === 0 ? 'A' : 'B', FONT_LANE, COLOR.background,
        rect.x + 18, rect.y + Math.max(8, (rect.h - 25) / 2), 20, 25);

    const labelX = rect.x + 55;
    const meterX = rect.x + Math.min(205, Math.max(150, rect.w * 0.42));
    const labelW = Math.max(0, meterX - labelX - 8);
    gr.DrawString(selectorText(selectors[slot]), FONT_CARD, COLOR.text,
        labelX, rect.y + 8, labelW, 20);
    gr.DrawString(selectorCode(selectors[slot]), FONT_META, active ? color : COLOR.muted,
        labelX, rect.y + 29, labelW, Math.max(14, rect.h - 33));

    const meterW = Math.max(0, rect.x + rect.w - meterX - 12);
    const meterY = rect.y + 12;
    const meterH = Math.max(0, rect.h - 24);
    if (meterW > 0 && meterH > 0)
        meters[slot].Draw(gr, meterX, meterY, meterW, meterH);
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, COLOR.background);
    updateLayout();
    drawHeader(gr);
    drawRoutes(gr);
    if (audioFormat && audioFormat.Channels.length) {
        for (let i = 0; i < audioFormat.Channels.length; ++i) {
            drawChannelCard(gr, audioFormat.Channels[i], channelRects[i], i);
        }
    } else {
        drawEmptyState(gr);
    }
    for (let i = 0; i < laneRects.length; ++i) drawLane(gr, i, laneRects[i]);
}

function on_mouse_move(x, y) {
    updateLayout();
    const nextCard = hitTest(channelRects, x, y);
    const nextLane = nextCard === -1 ? hitTest(laneRects, x, y) : -1;
    if (nextCard !== hoveredCard || nextLane !== hoveredLane) {
        hoveredCard = nextCard;
        hoveredLane = nextLane;
        window.Repaint();
    }
}

function on_mouse_leave() {
    if (hoveredCard !== -1 || hoveredLane !== -1) {
        hoveredCard = -1;
        hoveredLane = -1;
        window.Repaint();
    }
}

function on_mouse_lbtn_up(x, y) {
    updateLayout();
    const card = hitTest(channelRects, x, y);
    if (card !== -1 && audioFormat) {
        setRoute(activeRoute, selectorFor(audioFormat.Channels[card]));
        activeRoute = 1 - activeRoute;
        window.Repaint();
        return;
    }

    const lane = hitTest(laneRects, x, y);
    if (lane !== -1) {
        activeRoute = lane;
        window.Repaint();
    }
}

function on_playback_new_track() { syncAudioFormat(); }
function on_playback_pause() { syncAudioFormat(); }
function on_playback_stop() { syncAudioFormat(); }

const formatTimer = setInterval(syncAudioFormat, 200);
const paintTimer = setInterval(() => window.Repaint(), 33);

function on_script_unload() {
    clearInterval(formatTimer);
    clearInterval(paintTimer);
    vis.UpdateIntervalMs = INITIAL_UPDATE_INTERVAL;
}

syncAudioFormat();
