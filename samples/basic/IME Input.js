"use strict";

window.DefineScript("IME Input", {
    author: "LUR",
    features: {grab_focus: true}
});

include("docs/Flags.js");

// Receive regular character input after the IME commits its result.
window.DlgCode = DLGC_WANTALLKEYS | DLGC_WANTCHARS;

const fontTitle = gdi.Font("Segoe UI", 18, 1);
const fontText = gdi.Font("Segoe UI", 13);
const fontSmall = gdi.Font("Segoe UI", 11);
const fontInput = gdi.Font("Segoe UI", 17);

const BG = 0xFFF7F7F7;
const TEXT = 0xFF202020;
const TEXT_DIM = 0xFF686868;
const BORDER = 0xFFB8B8B8;
const BORDER_ACTIVE = 0xFF2D72D9;
const ACCENT = 0xFF2D72D9;
const ACCENT_BG = 0xFFEAF2FF;
const WHITE = 0xFFFFFFFF;

const MARGIN = 20;
const FIELD_Y = 178;
const FIELD_H = 46;
const FIELD_PAD = 10;

let hasFocus = false;
let fieldActive = false;
let committedText = "";
let imeActive = false;
let imeText = "";
let imeCursor = 0;
let imePositionKey = "";

function fieldRect() {
    return {
        x: MARGIN,
        y: FIELD_Y,
        w: Math.max(0, window.Width - MARGIN * 2),
        h: FIELD_H
    };
}

function pointInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function syncImePosition(active, x, y) {
    const key = active ? `${x},${y}` : "off";
    if (key === imePositionKey) {
        return;
    }

    imePositionKey = key;
    if (active) {
        window.SetImePosition(x, y);
    }
}

function on_paint(gr) {
    const w = window.Width;
    const h = window.Height;
    const field = fieldRect();
    const active = hasFocus && fieldActive;

    gr.FillSolidRect(0, 0, w, h, BG);

    gr.GdiDrawText("IME / Handwriting Input", fontTitle, TEXT,
        MARGIN, 16, Math.max(0, w - MARGIN * 2), 28,
        DT_SINGLELINE | DT_NOPREFIX);

    gr.GdiDrawText(
        "Click the field below, then use an IME or Windows handwriting keyboard. " +
        "Temporary IME text is shown in blue before it is committed. The script owns the field, preview text, and caret.",
        fontText, TEXT_DIM,
        MARGIN, 50, Math.max(0, w - MARGIN * 2), 54,
        DT_WORDBREAK | DT_NOPREFIX);

    const hintY = 112;
    const hintW = Math.max(0, w - MARGIN * 2);
    gr.FillSolidRect(MARGIN, hintY, hintW, 46, ACCENT_BG);
    gr.GdiDrawText(
        "Blue underlined = temporary IME text    •    Black = committed on_char text",
        fontSmall, ACCENT,
        MARGIN + 10, hintY + 4, Math.max(0, hintW - 20), 38,
        DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);

    gr.FillSolidRect(field.x, field.y, field.w, field.h, WHITE);
    gr.DrawRect(field.x, field.y, field.w, field.h, 1, active ? BORDER_ACTIVE : BORDER);

    const textX = field.x + FIELD_PAD;
    const textY = field.y;
    const textW = Math.max(0, field.w - FIELD_PAD * 2);

    const committedWidth = gr.CalcTextWidth(committedText, fontInput, true);
    let caretX = textX + committedWidth;

    if (!committedText && !imeText) {
        gr.GdiDrawText(active ? "Write here…" : "Click here to start", fontInput, 0xFF8A8A8A,
            textX, textY, textW, field.h,
            DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX);
    }
    else {
        gr.GdiDrawText(committedText, fontInput, TEXT,
            textX, textY, textW, field.h,
            DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);

        if (imeActive) {
            const imeX = textX + committedWidth;
            const remaining = Math.max(0, field.x + field.w - FIELD_PAD - imeX);
            gr.GdiDrawText(imeText, fontInput, ACCENT,
                imeX, textY, remaining, field.h,
                DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX);

            const imeWidth = gr.CalcTextWidth(imeText, fontInput, true);
            if (imeWidth > 0) {
                gr.FillSolidRect(imeX, field.y + field.h - 8, Math.min(imeWidth, remaining), 2, ACCENT);
            }

            const beforeCursor = imeText.slice(0, imeCursor);
            caretX = imeX + gr.CalcTextWidth(beforeCursor, fontInput, true);
        }
    }

    caretX = Math.min(caretX, field.x + field.w - FIELD_PAD);

    // The script owns the visual caret. SetImePosition() only tells Windows where
    // the current insertion point is so handwriting/candidate UI can be placed nearby.
    if (active) {
        gr.FillSolidRect(caretX, field.y + 10, 1, field.h - 20, imeActive ? ACCENT : TEXT);
    }
    syncImePosition(active, caretX, field.y + field.h);

    const statusY = FIELD_Y + FIELD_H + 18;
    const fieldStatus = fieldActive ? "active" : "inactive";
    const focusStatus = hasFocus ? "focused" : "not focused";
    const imeStatus = imeActive ? "composing" : "idle";

    gr.GdiDrawText(`Field: ${fieldStatus}    Panel: ${focusStatus}    IME: ${imeStatus}`,
        fontSmall, imeActive ? ACCENT : TEXT_DIM,
        MARGIN, statusY, Math.max(0, w - MARGIN * 2), 22,
        DT_SINGLELINE | DT_NOPREFIX);

    gr.GdiDrawText(
        "During composition, on_ime_update() may replace, shorten, or clear the preview. " +
        "The script draws and moves its own caret, then calls window.SetImePosition() so Windows knows where IME UI belongs. " +
        "Committed characters arrive through on_char().",
        fontSmall, TEXT_DIM,
        MARGIN, statusY + 30, Math.max(0, w - MARGIN * 2), Math.max(0, h - statusY - 40),
        DT_WORDBREAK | DT_NOPREFIX);
}

function on_mouse_lbtn_down(x, y) {
    fieldActive = pointInRect(x, y, fieldRect());
    window.Repaint();
}

function on_focus(isFocused) {
    hasFocus = isFocused;
    window.Repaint();
}

function on_ime_start() {
    if (!fieldActive) {
        return;
    }

    imeActive = true;
    imeText = "";
    imeCursor = 0;
    window.Repaint();
}

function on_ime_update(text, cursor) {
    if (!fieldActive) {
        return;
    }

    imeActive = true;
    imeText = text;
    imeCursor = cursor;
    window.Repaint();
}

function on_ime_end() {
    imeActive = false;
    imeText = "";
    imeCursor = 0;
    window.Repaint();
}

function on_char(code) {
    if (!fieldActive) {
        return;
    }

    if (code === 8) { // Backspace outside an active IME composition.
        committedText = Array.from(committedText).slice(0, -1).join("");
        window.Repaint();
        return;
    }

    if (code < 32) { // Keep this demo as a single-line field (ignore Enter, Tab, etc.).
        return;
    }

    committedText += String.fromCharCode(code);
    window.Repaint();
}
