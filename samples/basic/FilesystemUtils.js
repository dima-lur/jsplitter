"use strict";

window.DefineScript("Filesystem Utils");

include("docs/Flags.js");
include("docs/Helpers.js");

/*
 * Filesystem utilities sample
 *
 * Demonstrates:
 *   - utils.GetDrives()
 *   - utils.GetDriveInfo()
 *   - utils.GetShortPath()
 *   - utils.GetFolderSize()
 *   - utils.GetFolderSizeAsync()
 */

const sampleDir = fb.ProfilePath + "filesystem-utils-sample\\";
const sampleFile = sampleDir + "sample.txt";

const fontTitle = gdi.Font("Segoe UI", 18, 1);
const fontSection = gdi.Font("Segoe UI", 13, 1);
const fontNormal = gdi.Font("Segoe UI", 12);
const fontMono = gdi.Font("Consolas", 11);

const colors = {
    background: RGB(28, 28, 28),
    surface: RGB(38, 38, 38),
    text: RGB(235, 235, 235),
    muted: RGB(170, 170, 170),
    accent: RGB(110, 175, 235),
    success: RGB(125, 205, 145),
    error: RGB(235, 125, 125),
    border: RGB(60, 60, 60)
};

const driveTypeNames = [
    "Unknown",
    "Removable",
    "Fixed",
    "Network",
    "CD-ROM",
    "RAM Disk"
];

let ww = 0;
let wh = 0;
let folderSizeTaskId = 0;
let folderSizeSync = 0;
let folderSizeAsync = null;
let folderSizeAsyncError = "";
let shortPath = "";
let drives = [];

function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return "n/a";

    const units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let size = value;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        ++unit;
    }

    const digits = unit === 0 ? 0 : size >= 100 ? 0 : size >= 10 ? 1 : 2;
    return size.toFixed(digits) + " " + units[unit];
}

function driveTypeName(type) {
    return driveTypeNames[type] || "Unknown";
}

function initializeSample() {
    utils.CreateFolder(sampleDir);
    utils.WriteTextFile(sampleFile, "12345678", false);

    drives = utils.GetDrives()
        .map((root) => utils.GetDriveInfo(root))
        .filter((info) => !!info);

    shortPath = utils.GetShortPath(sampleDir);
    folderSizeSync = utils.GetFolderSize(sampleDir);
    folderSizeTaskId = utils.GetFolderSizeAsync(sampleDir);
}

function drawText(gr, text, font, color, x, y, w, h, flags) {
    gr.GdiDrawText(text, font, color, x, y, w, h, flags | DT_NOPREFIX);
}

function drawLabelValue(gr, label, value, x, y, w, valueColor) {
    const labelWidth = 112;
    drawText(gr, label, fontNormal, colors.muted, x, y, labelWidth, 22, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    drawText(gr, value, fontNormal, valueColor || colors.text, x + labelWidth, y, w - labelWidth, 22, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
}

function on_size() {
    ww = window.Width;
    wh = window.Height;
}

function on_paint(gr) {
    gr.FillSolidRect(0, 0, ww, wh, colors.background);

    const margin = 20;
    const contentWidth = Math.max(0, ww - margin * 2);
    let y = 18;

    drawText(gr, "Filesystem utilities", fontTitle, colors.text, margin, y, contentWidth, 30, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += 40;

    drawText(gr, "Logical drives", fontSection, colors.accent, margin, y, contentWidth, 24, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += 30;

    for (const info of drives) {
        const cardHeight = 106;
        gr.FillSolidRect(margin, y, contentWidth, cardHeight, colors.surface);
        gr.DrawRect(margin, y, contentWidth - 1, cardHeight - 1, 1, colors.border);

        const innerX = margin + 12;
        const innerW = Math.max(0, contentWidth - 24);
        const label = info.VolumeName
            ? info.Root + "  —  " + info.VolumeName
            : info.Root;

        drawText(gr, label, fontSection, colors.text, innerX, y + 8, innerW, 22, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
        drawText(
            gr,
            driveTypeName(info.DriveType) + (info.FileSystem ? "  •  " + info.FileSystem : "") + (info.IsReady ? "" : "  •  Not ready"),
            fontNormal,
            info.IsReady ? colors.muted : colors.error,
            innerX,
            y + 31,
            innerW,
            20,
            DT_LEFT | DT_VCENTER | DT_SINGLELINE
        );

        drawLabelValue(gr, "Total", formatBytes(info.TotalSize), innerX, y + 55, innerW);
        drawLabelValue(gr, "Free / available", formatBytes(info.FreeSpace) + " / " + formatBytes(info.AvailableSpace), innerX, y + 77, innerW);

        y += cardHeight + 10;
    }

    y += 4;
    drawText(gr, "Path and folder size", fontSection, colors.accent, margin, y, contentWidth, 24, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    y += 30;

    gr.FillSolidRect(margin, y, contentWidth, 118, colors.surface);
    gr.DrawRect(margin, y, contentWidth - 1, 117, 1, colors.border);

    const innerX = margin + 12;
    const innerW = Math.max(0, contentWidth - 24);

    drawText(gr, "Short path", fontNormal, colors.muted, innerX, y + 8, innerW, 20, DT_LEFT | DT_VCENTER | DT_SINGLELINE);
    drawText(gr, shortPath || "Unavailable", fontMono, shortPath ? colors.text : colors.error, innerX, y + 30, innerW, 22, DT_LEFT | DT_VCENTER | DT_SINGLELINE);

    drawLabelValue(gr, "Synchronous", formatBytes(folderSizeSync), innerX, y + 58, innerW);

    let asyncText = "Calculating…  (task " + folderSizeTaskId + ")";
    let asyncColor = colors.muted;

    if (folderSizeAsync !== null) {
        asyncText = formatBytes(folderSizeAsync);
        asyncColor = colors.success;
    }
    else if (folderSizeAsyncError) {
        asyncText = folderSizeAsyncError;
        asyncColor = colors.error;
    }

    drawLabelValue(gr, "Asynchronous", asyncText, innerX, y + 82, innerW, asyncColor);
}

function on_get_folder_size_done(task_id, success, size, error_text) {
    if (task_id !== folderSizeTaskId) return;

    if (success) {
        folderSizeAsync = size;
    }
    else {
        folderSizeAsyncError = error_text || "Failed";
    }

    utils.RemovePath(sampleDir);
    window.Repaint();
}

function on_script_unload() {
    utils.RemovePath(sampleDir);
}

initializeSample();
