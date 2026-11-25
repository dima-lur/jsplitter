window.DefineScript('fb.Window - Interactive Sample', { author: 'JSplitter' });
include('docs/Flags.js');

// Interactive sample of the main-window API. Nothing changes the frame or hides UI
// until the corresponding button is pressed. The painted header is draggable
// through MoveStart, regardless of where this JSplitter panel is placed.
// SetPseudoCaption is a separate optional example: its coordinates belong to
// the MAIN foobar2000 window, not to this panel.

const host = fb.Window;
const DT_BUTTON = DT_CENTER | DT_VCENTER | DT_SINGLELINE;
const DT_LINE = DT_VCENTER | DT_SINGLELINE;
const HEADER_HEIGHT = 64;
const COLORS = {
    bg: 0xff1d232b, header: 0xff283341, border: 0xff374353,
    text: 0xffedf3fa, subtle: 0xffb1becc, accent: 0xff9fd5e4,
    button: 0xff364557, active: 0xff287f90, disabled: 0xff2b323c,
    max: 0xff2f779d, close: 0xff9e4747
};
const titleFont = gdi.Font('Segoe UI', 15, 1);
const sectionFont = gdi.Font('Segoe UI', 11, 1);
const textFont = gdi.Font('Segoe UI', 11, 0);
const buttonFont = gdi.Font('Segoe UI', 11, 0);

const frameNames = ['Default', 'NoCaption', 'NoBorder'];
const buttons = [];
const groups = [];
let snapEnabled = false;
let pseudoEnabled = false;
let pressed = '';
let message = 'Select NoCaption or NoBorder to try Snap Layouts (Windows 11).';
let contentBottom = 0;

function isDUI() {
    // MainMenuHidden/StatusBarHidden are not available in Columns UI.
    try {
        void host.MainMenuHidden;
        return true;
    } catch (_) {
        return false;
    }
}

function addButton(id, text, x, y, w, h = 36) {
    buttons.push({ id, text, x, y, w, h });
}

function buttonById(id) {
    return buttons.find(b => b.id === id);
}

function inside(b, x, y) {
    return x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
}

function hitButton(x, y) {
    return buttons.find(b => inside(b, x, y)) || null;
}

function buttonEnabled(id) {
    if (id === 'menu' || id === 'status') return isDUI();
    if (id === 'moveLeft' || id === 'moveRight')
        return !host.Fullscreen && !host.IsMaximized && !host.IsMinimized;
    if (id === 'pseudo' || id === 'snap')
        return !host.Fullscreen && host.FrameStyle !== FrameStyle.Default;
    return true;
}

function buttonSelected(id) {
    switch (id) {
        case 'default': return host.FrameStyle === FrameStyle.Default;
        case 'caption': return host.FrameStyle === FrameStyle.NoCaption;
        case 'border': return host.FrameStyle === FrameStyle.NoBorder;
        case 'full': return host.Fullscreen;
        case 'pseudo': return pseudoEnabled;
        case 'snap': return snapEnabled;
        case 'menu': return isDUI() && host.MainMenuHidden;
        case 'status': return isDUI() && host.StatusBarHidden;
        case 'minSize': return host.MinSize;
        case 'maxSize': return host.MaxSize;
    }
    return false;
}

function buttonText(b) {
    switch (b.id) {
        case 'max': return host.IsMaximized ? 'Restore' : 'Max';
        case 'full': return host.Fullscreen ? 'Exit fullscreen' : 'Fullscreen';
        case 'menu': return !isDUI() ? 'Menu (DUI only)' :
            (host.MainMenuHidden ? 'Show menu' : 'Hide menu');
        case 'status': return !isDUI() ? 'Status (DUI only)' :
            (host.StatusBarHidden ? 'Show status bar' : 'Hide status bar');
        case 'pseudo': return pseudoEnabled ? 'Window drag zone: ON' : 'Window drag zone: OFF';
        case 'snap': return snapEnabled ? 'Snap area: ON' : 'Snap area: OFF';
        case 'minSize': return host.MinSize ? 'Min 550x360: ON' : 'Min 550x360';
        case 'maxSize': return host.MaxSize ? 'Max 1400x800: ON' : 'Max 1400x800';
        default: return b.text;
    }
}

function layoutGroup(title, hint, items, y) {
    groups.push({ title, hint, y });
    y += 43;
    let x = 18;
    const right = Math.max(110, window.Width - 18);
    for (const item of items) {
        const w = Math.min(item.w, Math.max(92, window.Width - 36));
        if (x > 18 && x + w > right) {
            x = 18;
            y += 46;
        }
        addButton(item.id, item.text, x, y, w);
        x += w + 9;
    }
    return y + 51;
}

function layout() {
    buttons.length = 0;
    groups.length = 0;
    const titleX = Math.max(8, window.Width - 3 * 65 - 10);
    addButton('min', 'Min', titleX, 14, 60, 36);
    addButton('max', 'Max', titleX + 65, 14, 60, 36);
    addButton('close', 'Close', titleX + 130, 14, 60, 36);

    let y = 76;
    y = layoutGroup('FRAME STYLE', 'Choose how Windows draws the main window.', [
        { id: 'default', text: 'Default', w: 115 },
        { id: 'caption', text: 'NoCaption', w: 115 },
        { id: 'border', text: 'NoBorder', w: 115 },
        { id: 'full', text: 'Fullscreen', w: 135 }
    ], y);
    y = layoutGroup('MENU AND STATUS BAR', 'These switches are available in Default UI (DUI) only.', [
        { id: 'menu', text: 'Hide menu', w: 155 },
        { id: 'status', text: 'Hide status bar', w: 155 }
    ], y);
    y = layoutGroup('DRAGGING AND SNAP',
        'Select NoCaption or NoBorder to enable the window drag zone and Snap area.', [
        { id: 'pseudo', text: 'Window drag zone: OFF', w: 190 },
        { id: 'snap', text: 'Snap area: OFF', w: 150 }
    ], y);
    y = layoutGroup('SIZE AND POSITION', 'Set fixed limits or move the main window 40 pixels left/right.', [
        { id: 'minSize', text: 'Min 550x360', w: 144 },
        { id: 'maxSize', text: 'Max 1400x800', w: 158 },
        { id: 'resetLimits', text: 'Clear limits', w: 120 },
        { id: 'moveLeft', text: 'Move -40', w: 110 },
        { id: 'moveRight', text: 'Move +40', w: 110 }
    ], y);
    contentBottom = y;
}

function updateSnapArea() {
    // Panel-local coordinates; JSplitter tracks panel movement internally.
    const b = buttonById('max');
    if (b && snapEnabled && buttonEnabled('snap'))
        host.SetMaximizeButtonArea(b.x, b.y, b.w, b.h);
}

function updatePseudoCaption() {
    if (!pseudoEnabled) return;
    // Unlike SetMaximizeButtonArea, coordinates are relative to the MAIN window.
    host.SetPseudoCaption(0, 0, window.Width, 25, true);
}

function setMessage(value) {
    message = value;
    console.log('[fb.Window sample] ' + value);
    window.Repaint();
}

function toggleMinSize() {
    if (host.MinSize) host.MinSize = false;
    else {
        host.MinWidth = 550;
        host.MinHeight = 360;
        host.MinSize = true;
    }
}

function toggleMaxSize() {
    if (host.MaxSize) host.MaxSize = false;
    else {
        host.MaxWidth = 1400;
        host.MaxHeight = 800;
        host.MaxSize = true;
    }
}

function togglePseudoCaption() {
    pseudoEnabled = !pseudoEnabled;
    if (pseudoEnabled) updatePseudoCaption();
    else host.ClearPseudoCaption();
}

function activate(id) {
    if (!buttonEnabled(id)) return;
    try {
        switch (id) {
            case 'min': host.Minimize(); return;
            case 'max':
                if (host.IsMaximized) host.Restore();
                else host.Maximize();
                break;
            case 'close': host.Close(); return;
            case 'default':
            case 'caption':
            case 'border': {
                const style = id === 'default' ? FrameStyle.Default :
                    id === 'caption' ? FrameStyle.NoCaption : FrameStyle.NoBorder;
                if (style === FrameStyle.Default) {
                    if (pseudoEnabled) {
                        host.ClearPseudoCaption();
                        pseudoEnabled = false;
                    }
                    if (snapEnabled) {
                        host.ClearMaximizeButtonArea();
                        snapEnabled = false;
                    }
                }
                host.FrameStyle = style;
                break;
            }
            case 'full': host.Fullscreen = !host.Fullscreen; break;
            case 'menu': host.MainMenuHidden = !host.MainMenuHidden; break;
            case 'status': host.StatusBarHidden = !host.StatusBarHidden; break;
            case 'pseudo': togglePseudoCaption(); break;
            case 'snap':
                snapEnabled = !snapEnabled;
                if (snapEnabled) updateSnapArea();
                else host.ClearMaximizeButtonArea();
                break;
            case 'minSize': toggleMinSize(); break;
            case 'maxSize': toggleMaxSize(); break;
            case 'resetLimits':
                host.MinSize = false;
                host.MaxSize = false;
                host.MinWidth = host.MinHeight = 0;
                host.MaxWidth = host.MaxHeight = 0;
                break;
            case 'moveLeft': host.Move(host.X - 40, host.Y, host.Width, host.Height); break;
            case 'moveRight': host.Move(host.X + 40, host.Y, host.Width, host.Height); break;
        }
        setMessage(buttonText(buttonById(id)) + ' — applied');
    } catch (error) {
        setMessage('Error: ' + error.message);
    }
}

function drawButton(gr, b) {
    const enabled = buttonEnabled(b.id);
    const selected = buttonSelected(b.id);
    let fill = !enabled ? COLORS.disabled : selected ? COLORS.active : COLORS.button;
    if (enabled && b.id === 'max') fill = COLORS.max;
    if (enabled && b.id === 'close') fill = COLORS.close;
    gr.FillSolidRect(b.x, b.y, b.w, b.h, fill);
    gr.GdiDrawText(buttonText(b), buttonFont, enabled ? COLORS.text : COLORS.subtle,
        b.x, b.y, b.w, b.h, DT_BUTTON);
}

function on_size() {
    layout();
    updateSnapArea();
    updatePseudoCaption();
    window.Repaint();
}

function on_paint(gr) {
    const w = window.Width;
    const h = window.Height;
    gr.FillSolidRect(0, 0, w, h, COLORS.bg);
    gr.FillSolidRect(0, 0, w, HEADER_HEIGHT, COLORS.header);
    const minButton = buttonById('min');
    const leftWidth = minButton ? Math.max(8, minButton.x - 30) : w - 36;
    gr.GdiDrawText('fb.Window', titleFont, COLORS.text,
        18, 5, leftWidth, 32, DT_LINE);
    gr.GdiDrawText('Drag this header to move the window (MoveStart)', textFont,
        COLORS.accent, 18, 34, leftWidth, 22, DT_LINE);

    for (const group of groups) {
        gr.FillSolidRect(18, group.y - 6, Math.max(1, w - 36), 1, COLORS.border);
        gr.GdiDrawText(group.title, sectionFont, COLORS.accent,
            18, group.y, Math.max(20, w - 36), 22, DT_LINE);
        gr.GdiDrawText(group.hint, textFont, COLORS.subtle,
            18, group.y + 20, Math.max(20, w - 36), 22, DT_LINE);
    }
    for (const b of buttons) drawButton(gr, b);

    if (contentBottom + 18 < h) {
        const mode = frameNames[host.FrameStyle] || String(host.FrameStyle);
        const state = host.Fullscreen ? 'Fullscreen' : host.IsMaximized ? 'Maximized' :
            host.IsMinimized ? 'Minimized' : 'Normal';
        gr.FillSolidRect(0, contentBottom + 5, w, 1, COLORS.border);
        gr.GdiDrawText(`Main window  ${host.Width}x${host.Height}  at (${host.X}, ${host.Y})  |  ${mode} / ${state}`,
            textFont, COLORS.text, 18, contentBottom + 11, Math.max(10, w - 36), 25, DT_LINE);
        if (contentBottom + 55 < h) {
            gr.GdiDrawText(message, textFont, COLORS.subtle,
                18, contentBottom + 36, Math.max(10, w - 36), 25, DT_LINE);
        }
    }
}

function on_mouse_lbtn_down(x, y) {
    const b = hitButton(x, y);
    pressed = b && buttonEnabled(b.id) ? b.id : '';
    if (!b && y >= 0 && y < HEADER_HEIGHT && !host.Fullscreen) {
        // Mouse-down on the visibly painted header starts a native move loop.
        try { host.MoveStart(); }
        catch (error) { setMessage('MoveStart: ' + error.message); }
    }
}

function on_mouse_lbtn_up(x, y) {
    const b = hitButton(x, y);
    const id = b && buttonEnabled(b.id) ? b.id : '';
    // Snap Layouts may relay the Max button release without a script-visible down.
    const clicked = id && (id === 'max' || id === pressed);
    pressed = '';
    if (clicked) activate(id);
}

function on_mouse_lbtn_dblclk(x, y) {
    if (y < 0 || y >= HEADER_HEIGHT || hitButton(x, y) || host.Fullscreen) return;
    try {
        if (host.IsMaximized) host.Restore();
        else host.Maximize();
    } catch (error) {
        setMessage('Maximize/Restore: ' + error.message);
    }
}

function on_mouse_leave() {
    pressed = '';
}

// Also refresh if the main-window state changes outside this panel.
const refreshTimer = window.SetInterval(() => window.Repaint(), 1000);
function on_script_unload() {
    window.ClearInterval(refreshTimer);
    // Per-panel registrations are released automatically. Numeric size bounds
    // persist until reset with Clear limits.
}

on_size();
