window.DefineScript('SQLite Playback History');
include('docs/Flags.js');
include('docs/Helpers.js');

// A small persistent playback-history panel.
// The database is stored in the foobar2000 profile folder and survives restarts.
// It demonstrates schema creation, parameters, a reusable prepared statement,
// aggregate queries and explicit cleanup.

const DB_PATH = fb.ProfilePath + 'jsplitter-playback-history.db';
const RECENT_LIMIT = 12;
const TOP_ARTISTS_LIMIT = 5;
const HISTORY_LIMIT = 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

if (typeof utils.OpenDatabase !== 'function') {
    throw new Error('SQLite API is not available in this foobar2000 version.');
}

const fontTitle = gdi.Font('Segoe UI', 16, 1);
const fontText = gdi.Font('Segoe UI', 12, 0);
const fontSmall = gdi.Font('Segoe UI', 10, 0);

const tfArtist = fb.TitleFormat('$if2(%album artist%,$if2(%artist%,Unknown artist))');
const tfTitle = fb.TitleFormat('$if2(%title%,Unknown title)');
const tfAlbum = fb.TitleFormat('[%album%]');

const db = utils.OpenDatabase(DB_PATH);

db.Exec(`
    CREATE TABLE IF NOT EXISTS playback_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        played_at INTEGER NOT NULL,
        artist TEXT NOT NULL,
        title TEXT NOT NULL,
        album TEXT NOT NULL,
        path TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS playback_history_played_at
        ON playback_history(played_at DESC);
`);

const insertHistory = db.Prepare(`
    INSERT INTO playback_history(played_at, artist, title, album, path)
    VALUES (?, ?, ?, ?, ?)
`);

let recent = [];
let topArtists = [];

refreshView();

function addPlayback(metadb) {
    if (!metadb) return;

    insertHistory.Run([
        Date.now(),
        tfArtist.EvalWithMetadb(metadb),
        tfTitle.EvalWithMetadb(metadb),
        tfAlbum.EvalWithMetadb(metadb),
        metadb.Path
    ]);

    // Keep the demo database bounded without rebuilding the table.
    db.Exec(`
        DELETE FROM playback_history
        WHERE id <= (
            SELECT id
            FROM playback_history
            ORDER BY id DESC
            LIMIT 1 OFFSET ?
        )
    `, [HISTORY_LIMIT - 1]);

    refreshView();
}

function refreshView() {
    recent = db.Query(`
        SELECT played_at, artist, title, album
        FROM playback_history
        ORDER BY id DESC
        LIMIT ?
    `, [RECENT_LIMIT]);

    topArtists = db.Query(`
        SELECT artist, COUNT(*) AS plays
        FROM playback_history
        WHERE played_at >= ?
        GROUP BY artist
        ORDER BY plays DESC, artist COLLATE NOCASE
        LIMIT ?
    `, [Date.now() - THIRTY_DAYS_MS, TOP_ARTISTS_LIMIT]);

    window.Repaint();
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function drawLine(gr, text, x, y, w, h, font, colour) {
    gr.GdiDrawText(
        text,
        font,
        colour,
        x,
        y,
        w,
        h,
        DT_LEFT | DT_VCENTER | DT_SINGLELINE | DT_END_ELLIPSIS | DT_NOPREFIX
    );
}

function on_playback_new_track(metadb) {
    addPlayback(metadb);
}

function on_paint(gr) {
    const width = window.Width;
    const height = window.Height;
    const margin = 14;
    const text = RGB(230, 230, 230);
    const muted = RGB(155, 155, 155);
    const accent = RGB(110, 190, 255);

    gr.FillSolidRect(0, 0, width, height, RGB(28, 30, 34));

    let y = 10;
    drawLine(gr, 'SQLite Playback History', margin, y, width - margin * 2, 28, fontTitle, text);
    y += 32;

    drawLine(gr, 'Top artists — last 30 days', margin, y, width - margin * 2, 20, fontSmall, muted);
    y += 20;

    if (!topArtists.length) {
        drawLine(gr, 'Play a few tracks to populate the database.', margin, y, width - margin * 2, 22, fontText, muted);
        y += 28;
    } else {
        for (const row of topArtists) {
            drawLine(gr, `${row.artist}  —  ${row.plays}`, margin, y, width - margin * 2, 22, fontText, accent);
            y += 22;
        }
        y += 8;
    }

    drawLine(gr, 'Recent plays', margin, y, width - margin * 2, 20, fontSmall, muted);
    y += 22;

    for (const row of recent) {
        if (y + 38 > height) break;

        drawLine(gr, `${row.artist} — ${row.title}`, margin, y, width - margin * 2, 20, fontText, text);
        y += 19;

        const album = row.album ? ` • ${row.album}` : '';
        drawLine(gr, `${formatTime(row.played_at)}${album}`, margin, y, width - margin * 2, 17, fontSmall, muted);
        y += 23;
    }
}

function on_mouse_rbtn_up(x, y) {
    const menu = window.CreatePopupMenu();
    menu.AppendMenuItem(MF_STRING, 1, 'Clear history');

    if (menu.TrackPopupMenu(x, y) === 1) {
        db.Exec('DELETE FROM playback_history');
        refreshView();
    }
}

function on_script_unload() {
    insertHistory.Close();
    db.Close();
}
