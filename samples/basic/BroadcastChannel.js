'use strict';

window.DefineScript('BroadcastChannel demo', {
    author: 'LUR',
    features: { drag_n_drop: true }
});
include('docs/Flags.js');
include('docs/Helpers.js');

/*
    HOW TO USE THIS SAMPLE
    ----------------------
    1. Add this same script to two (or more) JSplitter panels.
    2. Click the upper area in one panel to broadcast a simple structured message.
    3. Drop one or more tracks into the lower area to broadcast an FbMetadbHandleList.
       Every panel in the channel displays metadata for the first track and loads its
       artwork locally from the cloned handle. The sender updates its own view directly,
       because a BroadcastChannel never receives its own messages.
    4. Change CHANNEL_NAME in all copies if you want a separate group.

    BroadcastChannel is asynchronous and uses structured clone, so receivers get
    their own copy of the message data and host wrappers. It has no transfer list:
    broadcast messages clone data and never detach the sender's objects. Use
    Worker.postMessage() when ownership of a transferable resource should move to
    one specific Worker.
*/

const CHANNEL_NAME = 'jsplitter.broadcast-channel.demo';
const INSTANCE_ID = Math.random().toString(36).slice(2, 8);

const DROP_EFFECT = Object.freeze({
    none: 0,
    copy: 1,
    link: 4
});

const titleFont = gdi.Font('Segoe UI', 15, 1);
const headingFont = gdi.Font('Segoe UI', 12, 1);
const textFont = gdi.Font('Segoe UI', 11, 0);

const tfArtist = fb.TitleFormat('$if2(%artist%,(unknown artist))');
const tfTitle = fb.TitleFormat('$if2(%title%,%filename%)');
const tfAlbum = fb.TitleFormat("$if2(%album%,(no album)) $if2('('%date%')',)");

const channel = new BroadcastChannel(CHANNEL_NAME);
let sentCount = 0;
let receivedCount = 0;
let statusText = 'Open this sample in another JSplitter panel.';
let dragOverDropZone = false;

let currentHandles = null;
let currentTrack = null;
let currentArtwork = null;
let currentArtist = '';
let currentTitle = '';
let currentAlbum = '';
let currentTrackCount = 0;
let currentSourceText = 'Drop one or more tracks here.';
let artworkGeneration = 0;

function layout() {
    const w = window.Width;
    const h = window.Height;
    const margin = 16;
    const clickY = 48;
    const clickH = 92;
    const gap = 12;
    const dropY = clickY + clickH + gap;

    return {
        click: {
            x: margin,
            y: clickY,
            w: Math.max(0, w - margin * 2),
            h: clickH
        },
        drop: {
            x: margin,
            y: dropY,
            w: Math.max(0, w - margin * 2),
            h: Math.max(0, h - dropY - margin)
        }
    };
}

function contains(rect, x, y) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
}

function chooseDropEffect(action, accepted) {
    if (!accepted) {
        action.Effect = DROP_EFFECT.none;
        return;
    }

    const allowed = action.Effect;
    if (allowed & DROP_EFFECT.copy) {
        action.Effect = DROP_EFFECT.copy;
    } else if (allowed & DROP_EFFECT.link) {
        action.Effect = DROP_EFFECT.link;
    } else {
        action.Effect = DROP_EFFECT.none;
    }
}

function readTrackInfo(handle) {
    currentArtist = tfArtist.EvalWithMetadb(handle);
    currentTitle = tfTitle.EvalWithMetadb(handle);
    currentAlbum = tfAlbum.EvalWithMetadb(handle);
}

function showTracks(handles, sourceText) {
    if (!handles || !handles.Count) {
        return;
    }

    currentHandles = handles;
    currentTrack = handles[0];
    currentTrackCount = handles.Count;
    currentSourceText = sourceText;
    currentArtwork = null;
    readTrackInfo(currentTrack);

    const generation = ++artworkGeneration;
    window.Repaint();

    utils.GetAlbumArtAsyncV2(0, currentTrack, AlbumArtId.front, true, false, false).then(function (result) {
        if (generation !== artworkGeneration) {
            return;
        }

        currentArtwork = result && result.image ? result.image : null;
        window.Repaint();
    }, function (error) {
        if (generation !== artworkGeneration) {
            return;
        }

        currentArtwork = null;
        console.log('BroadcastChannel demo ARTWORK ERROR', String(error));
        window.Repaint();
    });
}

function broadcastHello() {
    sentCount++;

    const message = {
        demo: 'jsplitter-broadcast-channel',
        kind: 'hello',
        from: INSTANCE_ID,
        sequence: sentCount,
        text: 'Hello from another JSplitter panel',
        sentAt: Date.now()
    };

    channel.postMessage(message);
    statusText = `Sent message #${sentCount}.`;

    console.log('BroadcastChannel demo SEND', {
        channel: channel.name,
        thisPanel: INSTANCE_ID,
        message: message
    });

    window.Repaint();
}

function broadcastTracks(handles) {
    sentCount++;

    showTracks(
        handles,
        `Dropped locally and broadcast as message #${sentCount}.`
    );

    const message = {
        demo: 'jsplitter-broadcast-channel',
        kind: 'tracks',
        from: INSTANCE_ID,
        sequence: sentCount,
        handles: handles
    };

    channel.postMessage(message);
    statusText = `Broadcast ${handles.Count} track${handles.Count === 1 ? '' : 's'} as message #${sentCount}.`;

    console.log('BroadcastChannel demo SEND TRACKS', {
        channel: channel.name,
        thisPanel: INSTANCE_ID,
        sequence: sentCount,
        count: handles.Count
    });

    window.Repaint();
}

channel.onmessage = function (event) {
    const message = event.data;
    if (!message || message.demo !== 'jsplitter-broadcast-channel') {
        return;
    }

    receivedCount++;

    if (message.kind === 'tracks' && message.handles && message.handles.Count) {
        showTracks(
            message.handles,
            `Received ${message.handles.Count} track${message.handles.Count === 1 ? '' : 's'} from panel ${message.from}.`
        );
        statusText = `Received track message #${message.sequence} from panel ${message.from}.`;
    } else {
        statusText = `Received message #${message.sequence} from panel ${message.from}: ${message.text}`;
    }

    console.log('BroadcastChannel demo RECEIVE', {
        channel: channel.name,
        thisPanel: INSTANCE_ID,
        message: message
    });

    window.Repaint();
};

channel.onmessageerror = function (event) {
    statusText = 'Could not reconstruct an incoming message: ' +
        (event.errorMessage || '(no diagnostic text)');
    console.log('BroadcastChannel demo MESSAGEERROR', statusText);
    window.Repaint();
};

function drawArtwork(gr, image, x, y, size) {
    if (!image || size <= 0) {
        gr.FillSolidRect(x, y, size, size, RGB(224, 224, 224));
        gr.DrawRect(x, y, size, size, 1, RGB(185, 185, 185));
        gr.GdiDrawText(
            'No artwork',
            textFont,
            RGB(110, 110, 110),
            x + 6, y + 6, Math.max(0, size - 12), Math.max(0, size - 12),
            DT_CENTER | DT_VCENTER | DT_WORDBREAK | DT_NOPREFIX
        );
        return;
    }

    let sx = 0;
    let sy = 0;
    let sw = image.Width;
    let sh = image.Height;

    if (sw > sh) {
        sx = Math.floor((sw - sh) / 2);
        sw = sh;
    } else if (sh > sw) {
        sy = Math.floor((sh - sw) / 2);
        sh = sw;
    }

    gr.DrawImage(image, x, y, size, size, sx, sy, sw, sh);
}

function on_mouse_lbtn_up(x, y) {
    const areas = layout();
    if (contains(areas.click, x, y)) {
        broadcastHello();
    }
}

function on_drag_enter(action, x, y) {
    const inside = contains(layout().drop, x, y);
    dragOverDropZone = inside;
    chooseDropEffect(action, inside);
    window.Repaint();
}

function on_drag_over(action, x, y) {
    const inside = contains(layout().drop, x, y);
    if (inside !== dragOverDropZone) {
        dragOverDropZone = inside;
        window.Repaint();
    }
    chooseDropEffect(action, inside);
}

function on_drag_leave() {
    if (dragOverDropZone) {
        dragOverDropZone = false;
        window.Repaint();
    }
}

function on_drag_drop(action, x, y) {
    const inside = contains(layout().drop, x, y);
    const handles = inside ? action.Handles : null;
    const accepted = !!(handles && handles.Count);

    dragOverDropZone = false;
    chooseDropEffect(action, accepted);

    if (accepted) {
        broadcastTracks(handles);
    } else {
        statusText = inside
            ? 'The dropped data did not contain any track handles.'
            : 'Drop cancelled.';
        window.Repaint();
    }
}

function on_paint(gr) {
    const w = window.Width;
    const h = window.Height;
    const areas = layout();

    const background = RGB(245, 245, 245);
    const card = RGB(255, 255, 255);
    const border = RGB(190, 190, 190);
    const text = RGB(55, 55, 55);
    const secondary = RGB(105, 105, 105);
    const accent = RGB(70, 125, 190);

    gr.FillSolidRect(0, 0, w, h, background);

    gr.GdiDrawText(
        'BroadcastChannel demo',
        titleFont,
        RGB(35, 35, 35),
        16, 12, Math.max(0, w - 32), 28,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX
    );

    // Upper click area: the original simple structured-message demo.
    gr.FillSolidRect(areas.click.x, areas.click.y, areas.click.w, areas.click.h, card);
    gr.DrawRect(areas.click.x, areas.click.y, areas.click.w, areas.click.h, 1, border);
    gr.GdiDrawText(
        'CLICK TO BROADCAST',
        headingFont,
        accent,
        areas.click.x + 12, areas.click.y + 8, Math.max(0, areas.click.w - 24), 22,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX
    );

    const topText =
        `Channel: ${CHANNEL_NAME}\n` +
        `This panel: ${INSTANCE_ID}    Sent: ${sentCount}    Received: ${receivedCount}\n` +
        statusText;

    gr.GdiDrawText(
        topText,
        textFont,
        text,
        areas.click.x + 12, areas.click.y + 32,
        Math.max(0, areas.click.w - 24), Math.max(0, areas.click.h - 40),
        DT_LEFT | DT_TOP | DT_WORDBREAK | DT_NOPREFIX
    );

    // Lower drop area: broadcasts real foobar2000 track handles.
    const dropFill = dragOverDropZone ? RGB(235, 243, 252) : card;
    const dropBorder = dragOverDropZone ? accent : border;
    gr.FillSolidRect(areas.drop.x, areas.drop.y, areas.drop.w, areas.drop.h, dropFill);
    gr.DrawRect(areas.drop.x, areas.drop.y, areas.drop.w, areas.drop.h, dragOverDropZone ? 2 : 1, dropBorder);

    gr.GdiDrawText(
        dragOverDropZone ? 'DROP TRACKS' : 'TRACK BROADCAST',
        headingFont,
        dragOverDropZone ? accent : text,
        areas.drop.x + 12, areas.drop.y + 8, Math.max(0, areas.drop.w - 24), 22,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_NOPREFIX
    );

    const contentY = areas.drop.y + 38;
    const contentH = Math.max(0, areas.drop.h - 50);

    if (!currentTrack) {
        gr.GdiDrawText(
            'Drop one or more tracks here.\n\n' +
            'The complete FbMetadbHandleList is sent through BroadcastChannel.\n' +
            'Every subscribed panel reads the first track metadata and loads its artwork locally.',
            textFont,
            secondary,
            areas.drop.x + 16, contentY,
            Math.max(0, areas.drop.w - 32), contentH,
            DT_CENTER | DT_VCENTER | DT_WORDBREAK | DT_NOPREFIX
        );
        return;
    }

    const artSize = Math.max(0, Math.min(150, contentH, Math.floor(areas.drop.w * 0.36)));
    const artX = areas.drop.x + 14;
    const artY = contentY + Math.max(0, Math.floor((contentH - artSize) / 2));
    drawArtwork(gr, currentArtwork, artX, artY, artSize);

    const infoX = artX + artSize + 16;
    const infoW = Math.max(0, areas.drop.x + areas.drop.w - 14 - infoX);
    const infoY = contentY + 4;

    const trackCountLine = currentTrackCount > 1
        ? `${currentTrackCount} tracks received — showing the first track`
        : '1 track';

    const info =
        `${currentArtist}\n` +
        `${currentTitle}\n` +
        `${currentAlbum}\n\n` +
        `${trackCountLine}\n` +
        currentSourceText;

    gr.GdiDrawText(
        info,
        textFont,
        text,
        infoX, infoY, infoW, Math.max(0, contentH - 8),
        DT_LEFT | DT_TOP | DT_WORDBREAK | DT_NOPREFIX
    );
}

function on_script_unload() {
    // Panel reload/unload would clean the channel up automatically, but explicit
    // close() is the right pattern when a live script is simply done using it.
    channel.close();
}
