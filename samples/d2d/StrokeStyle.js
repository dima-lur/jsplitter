"use strict";

window.DrawMode = 1;

include(`${fb.ComponentPath}\\docs\\Flags.js`);

const BG = 0xFFF5F6F7;
const PANEL = 0xFFFFFFFF;
const BORDER = 0xFFD7DADF;
const TEXT = 0xFF202327;
const MUTED = 0xFF737980;
const ACCENT = 0xFF3169C6;
const GUIDE = 0xFFB8BDC4;

const fontTitle = gdi.Font("Segoe UI", 22, 1);
const fontSection = gdi.Font("Segoe UI", 15, 1);
const fontLabel = gdi.Font("Segoe UI", 12, 0);
const fontSmall = gdi.Font("Segoe UI", 10, 0);

// StrokeStyle objects are device-independent resources. Create them once and
// reuse them from on_paint instead of rebuilding a style every frame.
const joinStyles = [
    ["Miter", d2d.StrokeStyle({ lineJoin: LineJoin.Miter })],
    ["Bevel", d2d.StrokeStyle({ lineJoin: LineJoin.Bevel })],
    ["Round", d2d.StrokeStyle({ lineJoin: LineJoin.Round })],
    ["Miter or bevel", d2d.StrokeStyle({ lineJoin: LineJoin.MiterOrBevel, miterLimit: 2 })]
];

const capStyles = [
    ["Flat", d2d.StrokeStyle({ startCap: CapStyle.Flat, endCap: CapStyle.Flat })],
    ["Square", d2d.StrokeStyle({ startCap: CapStyle.Square, endCap: CapStyle.Square })],
    ["Round", d2d.StrokeStyle({ startCap: CapStyle.Round, endCap: CapStyle.Round })],
    ["Triangle", d2d.StrokeStyle({ startCap: CapStyle.Triangle, endCap: CapStyle.Triangle })]
];

const dashStyles = [ // Predefined dot styles automatically use a round dash cap when dashCap is omitted.
    ["Solid", d2d.StrokeStyle({ dashStyle: DashStyle.Solid })],
    ["Dash", d2d.StrokeStyle({ dashStyle: DashStyle.Dash })],
    ["Dot", d2d.StrokeStyle({ dashStyle: DashStyle.Dot })],
    ["Dash dot", d2d.StrokeStyle({ dashStyle: DashStyle.DashDot })],
    ["Dash dot dot", d2d.StrokeStyle({ dashStyle: DashStyle.DashDotDot })],
    ["Custom 4,2,1,2", d2d.StrokeStyle({
        dashes: [4, 2, 1, 2],
        dashCap: CapStyle.Round
    })]
];

const shapeStyles = {
    rect: d2d.StrokeStyle({
        dashStyle: DashStyle.Dash,
        dashCap: CapStyle.Round
    }),
    roundRect: d2d.StrokeStyle({
        dashStyle: DashStyle.DashDot,
        lineJoin: LineJoin.Round
    }),
    ellipse: d2d.StrokeStyle({
        dashStyle: DashStyle.Dot
    }),
    polygon: d2d.StrokeStyle({
        lineJoin: LineJoin.Round,
        startCap: CapStyle.Round,
        endCap: CapStyle.Round
    })
};

let ww = 0;
let wh = 0;

function on_size(width, height) {
    ww = width;
    wh = height;
}

function card(gr, x, y, w, h) {
    gr.FillSolidRect(x, y, w, h, PANEL);
    gr.DrawRect(x, y, w, h, 1, BORDER);
}

function label(gr, text, x, y, w, h, small = false) {
    gr.DrawText(text, small ? fontSmall : fontLabel, TEXT, x, y, w, h,
        DT_CENTER | DT_VCENTER | DT_SINGLELINE);
}

function sectionTitle(gr, text, x, y, w) {
    gr.DrawText(text, fontSection, TEXT, x, y, w, 28, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
}

function drawJoinSection(gr, x, y, w, h) {
    sectionTitle(gr, "Line joins", x, y, w);
    y += 32;
    h -= 32;

    const gap = 10;
    const cw = (w - gap * (joinStyles.length - 1)) / joinStyles.length;

    for (let i = 0; i < joinStyles.length; ++i) {
        const cx = x + i * (cw + gap);
        card(gr, cx, y, cw, h);
        label(gr, joinStyles[i][0], cx, y + 5, cw, 22);

        const top = y + 37;
        const bottom = y + h - 18;
        const mid = cx + cw / 2;
        const inset = Math.max(18, cw * 0.18);
        gr.DrawLines(ACCENT, 12, [
            cx + inset, bottom,
            mid, top,
            cx + cw - inset, bottom
        ], joinStyles[i][1]);
    }
}

function drawCapSection(gr, x, y, w, h) {
    sectionTitle(gr, "Line caps", x, y, w);
    y += 32;
    h -= 32;

    const gap = 10;
    const cw = (w - gap * (capStyles.length - 1)) / capStyles.length;

    for (let i = 0; i < capStyles.length; ++i) {
        const cx = x + i * (cw + gap);
        card(gr, cx, y, cw, h);
        label(gr, capStyles[i][0], cx, y + 5, cw, 22);

        const cy = y + h * 0.63;
        const x1 = cx + Math.max(30, cw * 0.24);
        const x2 = cx + cw - Math.max(30, cw * 0.24);

        // Guides make the amount by which each cap extends past the endpoints visible.
        gr.DrawLine(x1, cy - 22, x1, cy + 22, 1, GUIDE);
        gr.DrawLine(x2, cy - 22, x2, cy + 22, 1, GUIDE);
        gr.DrawLine(x1, cy, x2, cy, 14, ACCENT, capStyles[i][1]);
    }
}

function drawDashSection(gr, x, y, w, h) {
    sectionTitle(gr, "Dash styles", x, y, w);
    y += 32;
    h -= 32;

    const cols = 3;
    const rows = 2;
    const gapX = 10;
    const gapY = 8;
    const cw = (w - gapX * (cols - 1)) / cols;
    const ch = (h - gapY * (rows - 1)) / rows;

    for (let i = 0; i < dashStyles.length; ++i) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const cx = x + col * (cw + gapX);
        const cy = y + row * (ch + gapY);
        card(gr, cx, cy, cw, ch);
        label(gr, dashStyles[i][0], cx, cy + 2, cw, 20, true);
        gr.DrawLine(cx + 16, cy + ch * 0.65, cx + cw - 16, cy + ch * 0.65,
            6, ACCENT, dashStyles[i][1]);
    }
}

function drawShapeSection(gr, x, y, w, h) {
    sectionTitle(gr, "Shapes using StrokeStyle", x, y, w);
    y += 32;
    h -= 32;

    const gap = 10;
    const cw = (w - gap * 3) / 4;

    for (let i = 0; i < 4; ++i) {
        card(gr, x + i * (cw + gap), y, cw, h);
    }

    const inset = 22;
    const sy = y + 36;
    const sh = h - 54;

    let cx = x;
    label(gr, "DrawRect", cx, y + 4, cw, 22);
    gr.DrawRect(cx + inset, sy, cw - inset * 2, sh, 5, ACCENT, shapeStyles.rect);

    cx = x + (cw + gap);
    label(gr, "DrawRoundRect", cx, y + 4, cw, 22);
    gr.DrawRoundRect(cx + inset, sy, cw - inset * 2, sh, 16, 16, 5, ACCENT, shapeStyles.roundRect);

    cx = x + 2 * (cw + gap);
    label(gr, "DrawEllipse", cx, y + 4, cw, 22);
    gr.DrawEllipse(cx + inset, sy, cw - inset * 2, sh, 5, ACCENT, shapeStyles.ellipse);

    cx = x + 3 * (cw + gap);
    label(gr, "DrawPolygon", cx, y + 4, cw, 22);
    gr.DrawPolygon(ACCENT, 7, [
        cx + cw * 0.50, sy,
        cx + cw - inset, sy + sh * 0.38,
        cx + cw * 0.72, sy + sh,
        cx + cw * 0.28, sy + sh,
        cx + inset, sy + sh * 0.38
    ], shapeStyles.polygon);
}

function on_paint(gr) {
    gr.SetSmoothingMode(2);
    gr.FillSolidRect(0, 0, ww, wh, BG);

    const margin = 18;

    // Keep the sample readable at small panel sizes: the layout may grow with the
    // panel, but it never shrinks below this canvas. If the panel is smaller, the
    // normal window clipping simply hides the part that is outside the viewport.
    const contentW = Math.max(900, ww - margin * 2);

    gr.DrawText("Direct2D StrokeStyle", fontTitle, TEXT,
        margin, 10, contentW, 34, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    gr.DrawText("Reusable caps, joins and dash patterns for DrawLine / DrawLines / DrawPolygon and shape outlines",
        fontSmall, MUTED, margin, 43, contentW, 22, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

    const top = 75;
    const bottom = 18;
    const availableH = Math.max(590, wh - top - bottom);
    const rowGap = 14;
    const row1 = Math.max(170, availableH * 0.29);
    const row2 = Math.max(170, availableH * 0.27);
    const row3 = Math.max(220, availableH - row1 - row2 - rowGap * 2);

    drawJoinSection(gr, margin, top, contentW, row1);

    const halfGap = 14;
    const halfW = (contentW - halfGap) / 2;
    const secondY = top + row1 + rowGap;
    drawCapSection(gr, margin, secondY, halfW, row2);
    drawDashSection(gr, margin + halfW + halfGap, secondY, halfW, row2);

    const thirdY = secondY + row2 + rowGap;
    drawShapeSection(gr, margin, thirdY, contentW, row3);
}
