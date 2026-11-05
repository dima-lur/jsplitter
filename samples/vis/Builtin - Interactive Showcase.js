include('docs/Flags.js');

// JSplitter vis: interactive built-in visualization showcase.
// Click the controls to change the analysis cadence, paint rate and GDI/D2D backend.
// Click any visualization tile to cycle a compact preset of its most visible
// source and renderer properties. Playback is never started or changed here.

const ENGINE_INTERVALS = [8, 16, 32];
const PAINT_RATES = [30, 60, 120];
const DRAW_MODES = [
    {value:0, text:'GDI'},
    {value:1, text:'D2D'}
];
const INITIAL_ENGINE_INTERVAL = vis.UpdateIntervalMs;

const COLOR = {
    background: 0xff101317,
    header:     0xff151a20,
    tile:       0xff12171c,
    tileHover:  0xff1a222b,
    border:     0xff2a333d,
    text:       0xffe7edf3,
    muted:      0xff91a0ae,
    accent:     0xff5aa9ff,
    button:     0xff232b34,
    buttonHover:0xff303b47,
    white:      0xffedf2f7,
    blue:       0xff63a4ff,
    cyan:       0xff55d6d9,
    green:      0xff63d471,
    yellow:     0xffffd166,
    orange:     0xffff9f43,
    red:        0xffff5d73,
    purple:     0xffc792ea,
    black:      0xff000000
};

let TITLE_FONT = null;
let CONTROL_FONT = null;
let LABEL_FONT = null;
let META_FONT = null;

const HEADER_H = 64;
const GRID_MARGIN = 8;
const GRID_GAP = 7;
const TILE_LABEL_H = 22;

const SPEC_RANGES_A = [
    {to:-36, color:COLOR.blue},
    {to:-18, color:COLOR.green},
    {to:-6, color:COLOR.yellow},
    {to:0, color:COLOR.red}
];
const SPEC_RANGES_B = [
    {to:-48, color:COLOR.purple},
    {to:-24, color:COLOR.cyan},
    {to:-12, color:COLOR.green},
    {to:0, color:COLOR.orange}
];
const METER_RANGES_A = [
    {to:-18, color:COLOR.green},
    {to:-6, color:COLOR.yellow},
    {to:0, color:COLOR.red}
];
const METER_RANGES_B = [
    {to:-24, color:COLOR.blue},
    {to:-9, color:COLOR.green},
    {to:-3, color:COLOR.yellow},
    {to:0, color:COLOR.red}
];
const VU_RANGES_A = [
    {to:-10, color:COLOR.green},
    {to:0, color:COLOR.yellow},
    {to:3, color:COLOR.red}
];
const VU_RANGES_B = [
    {to:-12, color:COLOR.cyan},
    {to:-3, color:COLOR.green},
    {to:0, color:COLOR.yellow},
    {to:6, color:COLOR.red}
];

function preset(name, values) {
    return {name, values};
}

function spectrum(overrides) {
    return Object.assign({
        Channel:'mix', FftSize:4096, Bands:96, BarWidth:0, Gap:1,
        SegmentSize:6, SegmentGap:0, ColorMode:'gradient',
        MinFrequency:40, MaxFrequency:20000, MinDb:-78, MaxDb:0,
        AttackMs:18, ReleaseMs:120, PeakHoldMs:180, PeakGravity:3,
        Gain:1, Ranges:SPEC_RANGES_A, ShowPeak:true,
        PeakColor:COLOR.white, PeakSize:1
    }, overrides || {});
}

function waveform(overrides) {
    return Object.assign({
        Channel:'mix', Points:'auto', DurationMs:300, Gain:1,
        LineWidth:1.25, GlowStrength:0.2, GlowRadius:3, Smoothing:0.1,
        Style:'line', Color:COLOR.cyan
    }, overrides || {});
}

function peak(overrides) {
    return Object.assign({
        Channel:'mix', MinDb:-60, MaxDb:0, AttackMs:0, ReleaseMs:150,
        PeakHoldMs:500, PeakGravity:3, Ranges:METER_RANGES_A,
        SegmentSize:6, SegmentGap:0, ColorMode:'gradient',
        PeakColor:COLOR.white, PeakSize:1, ShowPeak:true,
        ClipWidth:4, ShowClip:false, ClipHoldMs:1000, ClipColor:COLOR.red
    }, overrides || {});
}

function vu(overrides) {
    return Object.assign({
        Channel:'mix', ReferenceDbfs:-18, MinVu:-20, MaxVu:3,
        AttackMs:300, ReleaseMs:300, PeakHoldMs:150, PeakGravity:3,
        Ranges:VU_RANGES_A, SegmentSize:6, SegmentGap:0,
        ColorMode:'gradient', PeakColor:COLOR.white,
        PeakSize:1, ShowPeak:false
    }, overrides || {});
}

function spectrogram(overrides) {
    return Object.assign({
        Channel:'mix', Style:'scrolling', FftSize:4096,
        ColumnIntervalMs:16, MinFrequency:40, MaxFrequency:20000,
        MinDb:-84, MaxDb:0, Gain:1, Scale:'log', Palette:'inferno',
        Color:COLOR.white, BackgroundColor:COLOR.black
    }, overrides || {});
}

function vectorscope(overrides) {
    return Object.assign({
        DurationMs:40, Points:1024, LeftChannel:0, RightChannel:1,
        Color:COLOR.cyan, Mode:'points', Scale:1, AspectScale:true,
        PointSize:1.5, LineWidth:1, GlowStrength:0.25, GlowRadius:3,
        PersistenceMs:300
    }, overrides || {});
}

const SPECTRUM_PRESETS = [
    preset('Smooth', spectrum()),
    preset('Detail', spectrum({
        // Keep the dense preset away from a 1 px bar/gap checkerboard. Two
        // adjacent tiles with that pattern produce display-scaling moire.
        FftSize:16384, Bands:192, Gap:0, SegmentSize:5, SegmentGap:2,
        ColorMode:'discrete', MinFrequency:25, MaxFrequency:22000,
        MinDb:-96, ReleaseMs:170, PeakHoldMs:320, PeakGravity:2,
        Ranges:SPEC_RANGES_B, PeakSize:2
    })),
    preset('Bars', spectrum({
        FftSize:2048, Bands:80, BarWidth:5, Gap:2,
        SegmentSize:7, SegmentGap:3, ColorMode:'discrete',
        MinDb:-72, AttackMs:8, ReleaseMs:80, Gain:1.15,
        Ranges:SPEC_RANGES_A, ShowPeak:false
    })),
    preset('Gradient', spectrum({
        FftSize:4096, Bands:112, BarWidth:0, Gap:1,
        SegmentSize:5, SegmentGap:2, ColorMode:'gradient',
        MinFrequency:35, MaxFrequency:20000, MinDb:-84,
        AttackMs:12, ReleaseMs:130, PeakHoldMs:220, PeakGravity:3,
        Ranges:SPEC_RANGES_B, PeakSize:2
    }))
];

const WAVEFORM_PRESETS = [
    preset('Trace', waveform()),
    preset('Envelope', waveform({
        Points:512, DurationMs:500, Gain:1.25, LineWidth:2,
        GlowStrength:0.5, GlowRadius:7, Smoothing:0.4,
        Style:'envelope', Color:COLOR.purple
    })),
    preset('Fast', waveform({
        Points:192, DurationMs:80, Gain:1.4, LineWidth:1.5,
        GlowStrength:0.15, GlowRadius:2, Smoothing:0.05,
        Style:'line', Color:COLOR.green
    })),
    preset('Glow', waveform({
        Points:384, DurationMs:220, Gain:1.35, LineWidth:1,
        GlowStrength:0.5, GlowRadius:4, Smoothing:0.25,
        Style:'line', Color:COLOR.blue
    }))
];

const PEAK_PRESETS = [
    preset('Smooth', peak()),
    preset('Gradient', peak({
        MinDb:-66, ReleaseMs:180, PeakHoldMs:600, PeakGravity:2.5,
        Ranges:METER_RANGES_B, SegmentSize:6, SegmentGap:2,
        ColorMode:'gradient', PeakSize:2, ShowClip:true,
        ClipWidth:4, ClipHoldMs:1200
    })),
    preset('Discrete', peak({
        MinDb:-72, ReleaseMs:220, PeakHoldMs:750, PeakGravity:2,
        Ranges:METER_RANGES_B, SegmentSize:5, SegmentGap:2,
        ColorMode:'discrete', PeakSize:3, ShowClip:true,
        ClipWidth:5, ClipHoldMs:1500
    })),
    preset('Quick', peak({
        MinDb:-48, ReleaseMs:70, PeakHoldMs:100, PeakGravity:6,
        SegmentSize:3, SegmentGap:1, ColorMode:'discrete',
        PeakSize:1, ShowClip:true, ClipWidth:3, ClipHoldMs:400
    }))
];

const VU_PRESETS = [
    preset('Classic', vu()),
    preset('Gradient', vu({
        ReferenceDbfs:-18, MinVu:-24, MaxVu:3,
        AttackMs:260, ReleaseMs:320, PeakHoldMs:250, PeakGravity:3,
        Ranges:VU_RANGES_B, SegmentSize:6, SegmentGap:2,
        ColorMode:'gradient', PeakSize:2, ShowPeak:true
    })),
    preset('Wide', vu({
        ReferenceDbfs:-20, MinVu:-40, MaxVu:6,
        AttackMs:500, ReleaseMs:550, PeakHoldMs:500, PeakGravity:1.5,
        Ranges:VU_RANGES_B,
        SegmentSize:8, SegmentGap:0, ColorMode:'gradient',
        PeakSize:3, ShowPeak:true
    })),
    preset('Discrete', vu({
        ReferenceDbfs:-18, MinVu:-24, MaxVu:3,
        AttackMs:180, ReleaseMs:220, PeakHoldMs:100, PeakGravity:5,
        SegmentSize:5, SegmentGap:2, ColorMode:'discrete',
        PeakSize:2, ShowPeak:true
    }))
];

const SPECTROGRAM_PRESETS = [
    preset('Scroll', spectrogram()),
    preset('Stationary', spectrogram({
        Style:'stationary', FftSize:8192, ColumnIntervalMs:32,
        MinFrequency:30, MaxFrequency:18000, MinDb:-96,
        Gain:1.15, Scale:'linear', Palette:'grayscale', Color:COLOR.cyan
    })),
    preset('Fast', spectrogram({
        Style:'scrolling', FftSize:2048, ColumnIntervalMs:8,
        MinFrequency:60, MaxFrequency:16000, MinDb:-72,
        Gain:1.2, Scale:'log', Palette:'inferno'
    }))
];

const VECTORSCOPE_PRESETS = [
    preset('Points', vectorscope()),
    preset('Lines', vectorscope({
        DurationMs:80, Points:2048, Mode:'lines', Scale:1.15, LineWidth:1.5,
        GlowStrength:0.55, GlowRadius:7, PersistenceMs:700,
        Color:COLOR.purple
    })),
    preset('Wide', vectorscope({
        DurationMs:160, Points:4096, Mode:'points', Scale:1.4,
        AspectScale:false, PointSize:2.25, GlowStrength:0.5,
        GlowRadius:7, PersistenceMs:1100, Color:COLOR.orange
    }))
];

const tiles = [
    {name:'Spectrum A', type:'spectrum', source:VisSourceType.Spectrum, presets:SPECTRUM_PRESETS, index:0},
    {name:'Spectrum B', type:'spectrum', source:VisSourceType.Spectrum, presets:SPECTRUM_PRESETS, index:1},
    {name:'Waveform A', type:'waveform', source:VisSourceType.Waveform, presets:WAVEFORM_PRESETS, index:0},
    {name:'Waveform B', type:'waveform', source:VisSourceType.Waveform, presets:WAVEFORM_PRESETS, index:1},
    {name:'Peak Meter', type:'peak', source:VisSourceType.PeakMeter, presets:PEAK_PRESETS, index:0},
    {name:'VU Meter', type:'vu', source:VisSourceType.VUMeter, presets:VU_PRESETS, index:0},
    {name:'Spectrogram A', type:'spectrogram', source:VisSourceType.Spectrogram, presets:SPECTROGRAM_PRESETS, index:0},
    {name:'Spectrogram B', type:'spectrogram', source:VisSourceType.Spectrogram, presets:SPECTROGRAM_PRESETS, index:1},
    {name:'Vectorscope', type:'vectorscope', source:VisSourceType.Vectorscope, presets:VECTORSCOPE_PRESETS, index:0}
];

let engineInterval = 16;
let paintRate = 30;
let drawMode = window.DrawMode === 1 ? 1 : 0;
let paintTimer = null;
let switchingBackend = false;
let hoveredControl = -1;
let hoveredTile = -1;
let controlRects = [];
let tileRects = [];

function releaseDrawingResources() {
    TITLE_FONT = null;
    CONTROL_FONT = null;
    LABEL_FONT = null;
    META_FONT = null;

    // Visualization instances own backend-specific bitmap/history caches.
    // Drop them together with script drawing resources before DrawMode changes.
    for (const tile of tiles) {
        tile.visual = null;
        tile.visuals = null;
    }
}

function createDrawingResources() {
    // gdi.Font() follows window.DrawMode and creates GdiFont or D2DFont.
    TITLE_FONT = gdi.Font('Segoe UI', 13);
    CONTROL_FONT = gdi.Font('Segoe UI', 10);
    LABEL_FONT = gdi.Font('Segoe UI', 11);
    META_FONT = gdi.Font('Segoe UI', 9);

    // This sample has no script-owned bitmaps. Any added later must be created
    // here as well because gdi.Image/CreateImage also follow window.DrawMode.
}

function currentPreset(tile) {
    return tile.presets[tile.index];
}

function applyProperties(object, values) {
    for (const key of Object.keys(values)) object[key] = values[key];
}

function isStereoMeter(tile) {
    return tile.type === 'peak' || tile.type === 'vu';
}

function createOrUpdateTile(tile, recreate) {
    const selected = currentPreset(tile);
    if (isStereoMeter(tile)) {
        if (!tile.visuals || recreate) {
            tile.visuals = [
                vis.Create(tile.source, {}, {}),
                vis.Create(tile.source, {}, {})
            ];
        }
        for (let channel = 0; channel < tile.visuals.length; ++channel) {
            applyProperties(tile.visuals[channel], selected.values);
            tile.visuals[channel].Channel = channel;
        }
        return;
    }

    if (!tile.visual || recreate) tile.visual = vis.Create(tile.source, {}, {});
    applyProperties(tile.visual, selected.values);
}

function cycleTile(index) {
    const tile = tiles[index];
    tile.index = (tile.index + 1) % tile.presets.length;
    createOrUpdateTile(tile, false);
}

function setEngineInterval(value) {
    engineInterval = value;
    vis.UpdateIntervalMs = value;
}

function setPaintRate(value) {
    paintRate = value;
    if (paintTimer) clearInterval(paintTimer);
    paintTimer = setInterval(() => window.Repaint(), 1000 / value);
}

function setDrawMode(value) {
    value = value === 1 ? 1 : 0;
    if (value === drawMode) return;

    // DrawMode performs a synchronous repaint. Keep on_paint away from resources
    // that belong to the old backend until replacements have been created.
    switchingBackend = true;
    try {
        releaseDrawingResources();
        window.DrawMode = value;
        drawMode = window.DrawMode === 1 ? 1 : 0;
        createDrawingResources();
        for (const tile of tiles) createOrUpdateTile(tile, true);
    } finally {
        switchingBackend = false;
    }
    window.Repaint();
}

function addControl(group, value, text, x, y, w, h) {
    controlRects.push({group, value, text, x, y, w, h});
}

function updateLayout() {
    controlRects = [];
    const buttonY = 33;
    const buttonH = 23;
    const buttonW = 42;
    const buttonGap = 4;

    let x = 82;
    for (const value of ENGINE_INTERVALS) {
        addControl('engine', value, String(value), x, buttonY, buttonW, buttonH);
        x += buttonW + buttonGap;
    }
    x += 84;
    for (const value of PAINT_RATES) {
        addControl('paint', value, String(value), x, buttonY, buttonW, buttonH);
        x += buttonW + buttonGap;
    }
    x += 70;
    for (const mode of DRAW_MODES) {
        addControl('backend', mode.value, mode.text, x, buttonY, 52, buttonH);
        x += 52 + buttonGap;
    }

    tileRects = [];
    const availableW = Math.max(0, window.Width - GRID_MARGIN * 2 - GRID_GAP * 2);
    const availableH = Math.max(0, window.Height - HEADER_H - GRID_MARGIN - GRID_GAP * 2);
    const cellW = availableW / 3;
    const cellH = availableH / 3;
    for (let i = 0; i < tiles.length; ++i) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        tileRects.push({
            x:GRID_MARGIN + col * (cellW + GRID_GAP),
            y:HEADER_H + row * (cellH + GRID_GAP),
            w:cellW,
            h:cellH
        });
    }
}

function contains(rect, x, y) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}

function hitControl(x, y) {
    for (let i = 0; i < controlRects.length; ++i) {
        if (contains(controlRects[i], x, y)) return i;
    }
    return -1;
}

function hitTile(x, y) {
    for (let i = 0; i < tileRects.length; ++i) {
        if (contains(tileRects[i], x, y)) return i;
    }
    return -1;
}

function formatChannel(value) {
    return value === 'mix' ? 'mix' : 'ch ' + (Number(value) + 1);
}

function describeTile(tile) {
    const selected = currentPreset(tile);
    if (tile.type === 'vectorscope') {
        return selected.name + ' · ' + selected.values.Points + ' pts · ' +
            selected.values.DurationMs + ' ms · ' + selected.values.Mode +
            ' · trail ' + selected.values.PersistenceMs + ' ms';
    }

    const value = selected.values;
    switch (tile.type) {
        case 'spectrum':
            return selected.name + ' · FFT ' + value.FftSize + ' · ' + value.Bands +
                ' bands · ' + value.ColorMode;
        case 'waveform': {
            let points = value.Points;
            if (points === 'auto' && tile.visual) points = 'auto/' + tile.visual.ActualPoints;
            return selected.name + ' · ' + points + ' pts · ' + value.DurationMs +
                ' ms · ' + value.Style + ' · smooth ' + value.Smoothing;
        }
        case 'peak':
            return selected.name + ' · stereo · ' + value.MinDb + '..' + value.MaxDb +
                ' dB · release ' + value.ReleaseMs + ' ms · ' + value.ColorMode;
        case 'vu':
            return selected.name + ' · stereo · 0 VU=' + value.ReferenceDbfs + ' dBFS · ' +
                value.MinVu + '..+' + value.MaxVu + ' · ' + value.ColorMode;
        case 'spectrogram':
            return selected.name + ' · FFT ' + value.FftSize + ' · ' +
                value.ColumnIntervalMs + ' ms · ' + value.Scale + ' · ' + value.Palette;
    }
    return selected.name + ' · ' + formatChannel(value.Channel);
}

function drawButton(gr, rect, index) {
    const active = rect.group === 'engine' ? rect.value === engineInterval
        : rect.group === 'paint' ? rect.value === paintRate
        : rect.value === drawMode;
    const hovered = index === hoveredControl;
    const fill = active ? COLOR.accent : hovered ? COLOR.buttonHover : COLOR.button;
    const textColor = active ? COLOR.black : COLOR.text;
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h, fill);
    gr.DrawRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1,
        1, active ? COLOR.accent : COLOR.border);
    const textW = gr.CalcTextWidth(rect.text, CONTROL_FONT);
    gr.DrawString(rect.text, CONTROL_FONT, textColor,
        rect.x + (rect.w - textW) * 0.5, rect.y + 3, textW + 2, rect.h - 4);
}

function drawHeader(gr) {
    gr.FillSolidRect(0, 0, window.Width, HEADER_H, COLOR.header);
    gr.FillSolidRect(0, HEADER_H - 1, window.Width, 1, COLOR.border);
    gr.DrawString('Visualization demo', TITLE_FONT, COLOR.text,
        10, 6, Math.max(0, window.Width - 20), 22);
    gr.DrawString('Engine ms', CONTROL_FONT, COLOR.muted, 10, 37, 70, 18);
    gr.DrawString('Paint fps', CONTROL_FONT, COLOR.muted, 236, 37, 70, 18);
    gr.DrawString('Backend', CONTROL_FONT, COLOR.muted, 448, 37, 60, 18);
    gr.SetSmoothingMode(SmoothingMode.HighQuality);
    try {
        for (let i = 0; i < controlRects.length; ++i) drawButton(gr, controlRects[i], i);
    }
    finally {
        gr.SetSmoothingMode(SmoothingMode.Default);
    }

    const hintX = 640;
    if (window.Width > hintX + 120) {
        gr.DrawString('Click any tile to switch its preset', CONTROL_FONT, COLOR.muted,
            hintX, 38, window.Width - hintX - 10, 18);
    }
}

function drawTile(gr, tile, rect, index) {
    if (rect.w <= 0 || rect.h <= 0) return;
    const hovered = index === hoveredTile;
    gr.FillSolidRect(rect.x, rect.y, rect.w, rect.h,
        hovered ? COLOR.tileHover : COLOR.tile);

    const drawX = rect.x + 4;
    const drawY = rect.y + TILE_LABEL_H;
    const drawW = Math.max(0, rect.w - 8);
    const drawH = Math.max(0, rect.h - TILE_LABEL_H - 4);
    if (isStereoMeter(tile) && tile.visuals && drawW > 0 && drawH > 0) {
        const channelGap = 4;
        const firstH = Math.max(0, Math.floor((drawH - channelGap) * 0.5));
        const secondH = Math.max(0, drawH - channelGap - firstH);
        try {
            tile.visuals[0].Draw(gr, drawX, drawY, drawW, firstH);
            tile.visuals[1].Draw(gr, drawX, drawY + firstH + channelGap, drawW, secondH);
        } catch (e) {
            console.log('Visualization showcase: ' + tile.name + ': ' + e);
        }
    } else if (tile.visual && drawW > 0 && drawH > 0) {
        try {
            tile.visual.Draw(gr, drawX, drawY, drawW, drawH);
        } catch (e) {
            console.log('Visualization showcase: ' + tile.name + ': ' + e);
        }
    }

    gr.FillSolidRect(rect.x, rect.y, rect.w, TILE_LABEL_H,
        hovered ? COLOR.tileHover : COLOR.tile);
    const labelX = rect.x + 6;
    const labelY = rect.y + 2;
    gr.DrawString(tile.name, LABEL_FONT, COLOR.text,
        labelX, labelY, Math.max(0, rect.w - 12), TILE_LABEL_H - 2);
    const nameW = gr.CalcTextWidth(tile.name, LABEL_FONT);
    const metaX = labelX + nameW + 5;
    gr.DrawString('| ' + describeTile(tile), META_FONT, COLOR.muted,
        metaX, labelY + 2, Math.max(0, rect.x + rect.w - metaX - 5), TILE_LABEL_H - 4);

    gr.DrawRect(rect.x + 0.5, rect.y + 0.5, Math.max(0, rect.w - 1),
        Math.max(0, rect.h - 1), hovered ? 1.5 : 1,
        hovered ? COLOR.accent : COLOR.border);
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, COLOR.background);
    if (switchingBackend) return;
    updateLayout();
    drawHeader(gr);
    for (let i = 0; i < tiles.length; ++i) drawTile(gr, tiles[i], tileRects[i], i);
}

function on_mouse_move(x, y) {
    updateLayout();
    const nextControl = hitControl(x, y);
    const nextTile = nextControl === -1 ? hitTile(x, y) : -1;
    if (nextControl !== hoveredControl || nextTile !== hoveredTile) {
        hoveredControl = nextControl;
        hoveredTile = nextTile;
        window.Repaint();
    }
}

function on_mouse_leave() {
    if (hoveredControl !== -1 || hoveredTile !== -1) {
        hoveredControl = -1;
        hoveredTile = -1;
        window.Repaint();
    }
}

function on_mouse_lbtn_up(x, y) {
    updateLayout();
    const control = hitControl(x, y);
    if (control !== -1) {
        const selected = controlRects[control];
        if (selected.group === 'engine') setEngineInterval(selected.value);
        else if (selected.group === 'paint') setPaintRate(selected.value);
        else setDrawMode(selected.value);
        window.Repaint();
        return;
    }

    const tile = hitTile(x, y);
    if (tile !== -1) {
        cycleTile(tile);
        window.Repaint();
    }
}

function on_script_unload() {
    if (paintTimer) clearInterval(paintTimer);
    vis.UpdateIntervalMs = INITIAL_ENGINE_INTERVAL;
}

setEngineInterval(engineInterval);
createDrawingResources();
for (const tile of tiles) createOrUpdateTile(tile, true);
setPaintRate(paintRate);
