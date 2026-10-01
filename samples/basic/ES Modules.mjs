/*
    ES MODULE SAMPLE
    ----------------

    This file is selected through Script -> File (or Script -> Sample) and has
    the .mjs extension, so JSplitter evaluates it as an ES module.

    message.js deliberately has a .js extension. Because it is imported from a
    module, it is still compiled as an ES module. message.js then imports
    math.mjs, demonstrating a nested module dependency.

    Important: top-level declarations in an ES module are module-scoped.
    JSplitter callbacks therefore have to be exposed through globalThis.
*/

'use strict';

import createMessage, { helperUrl } from './es_modules/message.js';

window.DefineScript('ES Modules', {
    author: 'JSplitter',
    version: '1.0'
});

const titleFont = gdi.Font('Segoe UI', 16, 1);
const textFont = gdi.Font('Segoe UI', 11, 0);

const mainUrl = import.meta.url;
const message = createMessage('JSplitter');

let width = 0;
let height = 0;

globalThis.on_size = function () {
    width = window.Width;
    height = window.Height;
};

globalThis.on_paint = function (gr) {
    gr.FillSolidRect(0, 0, width, height, 0xff202124);

    gr.GdiDrawText(
        'ES Modules',
        titleFont,
        0xfff1f3f4,
        16,
        14,
        Math.max(0, width - 32),
        32
    );

    gr.GdiDrawText(
        message,
        textFont,
        0xffd7dadc,
        16,
        56,
        Math.max(0, width - 32),
        24
    );

    gr.GdiDrawText(
        'main:   ' + mainUrl + '\n' +
        'helper: ' + helperUrl + '\n\n' +
        'The panel callbacks are assigned through globalThis.',
        textFont,
        0xffbdc1c6,
        16,
        92,
        Math.max(0, width - 32),
        Math.max(0, height - 108)
    );
};

console.log('ES Modules sample loaded', {
    mainUrl: mainUrl,
    helperUrl: helperUrl,
    message: message
});
