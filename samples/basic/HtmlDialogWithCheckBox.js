window.DefineScript('ShowHtmlDialog sample', { author: 'TheQwertiest / LUR' });

include(`${fb.ComponentPath}docs/Flags.js`);
include(`${fb.ComponentPath}docs/Helpers.js`);

const htmlCode = utils.ReadTextFile(
    `${fb.ComponentPath}samples/basic/html/PopupWithCheckBox.html`
);

let ww = 0;
let wh = 0;
let text = 'Click to open ShowHtmlDialog';
const font = gdi.Font('Segoe UI Semibold', 11);

function on_paint(gr) {
    gr.SetTextRenderingHint(TextRenderingHint.ClearTypeGridFit);
    gr.DrawString(
        text,
        font,
        0xFF202020,
        0,
        0,
        ww,
        wh,
        StringFormat(StringAlignment.Center, StringAlignment.Center)
    );
}

function on_size(w, h) {
    ww = w;
    wh = h;
}

function on_mouse_lbtn_up() {
    utils.ShowHtmlDialog(0, htmlCode, {
        width: 460,
        height: 290,
        data: [
            'ShowHtmlDialog sample',
            'Pass data to HTML and call panel JavaScript back.',
            'Hello from panel JavaScript',
            'Remember this choice',
            show_native_dialog,
            dialog_closed
        ]
    });
}

function show_native_dialog(dialogWindow) {
    utils.MessageBox(
        'window.external.dialogWindow was passed back to panel JavaScript and used as the owner of this MessageBox.',
        'Owned native dialog',
        MessageBoxButtons.OK,
        MessageBoxIcon.Information,
        MessageBoxDefaultButton.Button1,
        '',
        dialogWindow
    );
}

function dialog_closed(status, value, checked) {
    text =
        `Result: ${status}\n` +
        `Text: ${value}\n` +
        `Checked: ${checked}\n\n` +
        'Click to open ShowHtmlDialog again';

    window.Repaint();
}
