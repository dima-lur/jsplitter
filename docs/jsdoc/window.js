/**
 * Functions for working with the current JSplitter panel and accessing it's properties.
 *
 * @namespace
 */
let window = {
    /**
     * Indicates which keys should be processed by the panel.<br>
     * See {@link https://docs.microsoft.com/en-us/windows/desktop/dlgbox/wm-getdlgcode} for more info.
     *
     * @return {number} See {@link module:Flags Flags} for flags like {@link module:Flags.DLGC_WANTARROWS DLGC_WANTARROWS}
     *
     * @example
     * window.DlgCode = DLGC_WANTALLKEYS;
     */
    DlgCode: undefined, // (uint) (read, write)

    /**
     * Window DPI. This value never changes while foobar2000 is running. If you change DPI settings, you must restart the application.
     *
     * @type {number}
     * @readonly
     */
    DPI: undefined, // (read) (uint)
    
    /**
     * Set whether the JSplitter panel should be cleared with background color before raising {@link module:Callbacks.on_paint on_paint} callback.<br>
     * Default value: true.
     * @type {boolean}
     * @example
     * "use strict";
     * window.DrawMode = 0;
     * window.EraseOnRepaint = false;
     * 
     * let ww = 0;
     * let wh = 0;
     * 
     * const alphabet = 'г‚ўг‚Ўг‚«г‚µг‚їгѓЉгѓЏгѓћгѓ¤гѓЈгѓ©гѓЇг‚¬г‚¶гѓЂгѓђгѓ‘г‚¤г‚Јг‚­г‚·гѓЃгѓ‹гѓ’гѓџгѓЄгѓ°г‚®г‚ёгѓ‚гѓ“гѓ”г‚¦г‚Ґг‚Їг‚№гѓ„гѓЊгѓ•гѓ гѓ¦гѓҐгѓ«г‚°г‚єгѓ–гѓ…гѓ—г‚Ёг‚§г‚±г‚»гѓ†гѓЌгѓ�гѓЎгѓ¬гѓ±г‚Іг‚јгѓ‡гѓ™гѓљг‚Єг‚©г‚іг‚Ѕгѓ€гѓЋгѓ›гѓўгѓЁгѓ§гѓ­гѓІг‚ґг‚ѕгѓ‰гѓњгѓќгѓґгѓѓгѓіABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
     * const fontSize = 16;
     * const font = gdi.Font("Consolas", fontSize, 1);
     * const drops = [];
     * 
     * function on_size(width, height) {
     *     ww = width;
     *     wh = height;
     *     if(ww > 0 && wh > 0) {
     *         const columns = Math.floor(ww / fontSize);
     *         drops.length = columns;
     *         for (let i = 0; i < columns; i++) if (isNaN(drops[i])) drops[i] = 0;
     *     }
     * }
     * 
     * function on_paint(gr) {
     *     gr.FillSolidRect(0, 0, ww, wh, 0x0D000000);
     * 
     *     for (let i = 0; i < drops.length; i++) {
     *     const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));
     *     const x = i * fontSize;
     *     const y = drops[i] * fontSize;
     * 
     *     gr.GdiDrawText(text, font, 0xFF00FF00, x, y, fontSize, fontSize * 4 / 3);
     * 
     *     if (y > wh && Math.random() > 0.975)
     *         drops[i] = 0;
     *     else
     *         drops[i]++;
     *     }	
     * }
     * 
     * window.SetInterval(() => { window.Repaint(); }, 50);
     */
    EraseOnRepaint: true, // (read, write)

    /**
     * Current graphics rendering mode.<br>
     * 0 (default) - GDI+<br>
     * 1 - Direct2D<br>
     * <b>IMPORTANT</b>: After switching the rendering mode, all drawing objects created for the other mode will be unavailable for use in the current mode.<br>
     * Therefore, the developer should create all drawing objects only after changing the mode.<br>
     * Ideally, the mode change should be made in the VERY first line of the main script to avoid accidentally creating objects of the wrong type.<br>
     * Also, calling any of d2d.* methods for creating objects like fonts, bitmaps or effects, will cause a script crash until the {@link window.DrawMode DrawMode} is set to 1 at least once (in this case, the resources required for D2D operation are initialized).
     * D2D rendering may differ from GDI and methods for both backends can not be expected to be 100% pixel equivalent.
     * @type {number}
     */
    DrawMode: 0, // (read, write)

    /**
     * Window handle
     *
     * @type {number}
     * @readonly
     */
    ID: undefined, // (read) (uintptr_t)

    /**
     * You need this to determine which GetFontXXX and GetColourXXX methods to use, assuming you want to support both interfaces.<br>
     * See {@link module:Flags.UIInstanceType UIInstanceType}<br>
     * 0 - if using Columns UI<br>
     * 1 - if using default UI.
     *
     * @type {number}
     * @readonly
     */
    InstanceType: undefined, // (uint)

    /**
     * Indicates whether this JSplitter panel is hosted as a toolbar item in Columns UI.<br>
     * This property is only meaningful when using Columns UI: it is true for a toolbar panel and false for a regular panel.
     * 
     * It is always false in Default User Interface.
     *
     * @type {boolean}
     * @readonly
     */
    IsToolbar: undefined, // (boolean) (read)

    /**
     * Indicates whether this JSplitter panel currently has keyboard focus.
     * This reflects the same focus state reported by {@link on_focus}: it is true only while the panel window itself owns keyboard focus.
     *
     * @type {boolean}
     * @readonly
     */
    IsFocused: undefined, // (boolean) (read)

    /**
     * Only useful within Panel Stack Splitter (Columns UI component)<br>
     * Depends on setting inside Spider Monkey Panel Configuration window. You generally use it to determine
     * whether or not to draw a background.
     *
     * @type {boolean}
     * @readonly
     */
    IsTransparent: undefined, // (boolean) (read)

    /**
     * @type {boolean}
     * @readonly
     */
    IsVisible: undefined, // (boolean) (read)

    /**
    * Memory statistics for one Worker created by the current panel.
    *
    * Related GC settings are under <b>Advanced &gt; JSplitter &gt; Performance: restart is required &gt; GC</b>.
    *
    * @typedef {Object} JsWorkerMemoryStats
    * @property {string} Name
    *    The Worker's immutable constructor name, identical to Worker-global <b>self.name</b>. The value is an empty string if no name was supplied. The same identity is used by unhandled Worker exception diagnostics, where an empty name is displayed as <b>&lt;unnamed&gt;</b>.
    * @property {number} HeapUsage
    *    SpiderMonkey heap usage of this Worker (in bytes). The per-Worker heap limit is configured by
    *    <b>Worker maximum heap size (in MB, per Worker)</b>; see {@link JsMemoryStats.WorkerHeapLimit JsMemoryStats.WorkerHeapLimit}.
    *    Automatic GC based on heap growth is controlled by <b>Heap growth before GC (in MB)</b>.
    * @property {number} ExternalUsage
    *    Tracked native/external memory retained by this Worker (in bytes). This is an accounting estimate,
    *    not process working set or physical RAM/VRAM residency. Automatic GC based on external-memory growth is
    *    controlled by <b>External memory growth before GC (in MB)</b>.
    */

    /**
    * Return value of {@link window.JsMemoryStats}.<br>
    * <br>
    * Panel scripts run on the main thread and share one SpiderMonkey heap. Per-panel heap usage is therefore
    * not available. Native/external memory is tracked separately for the current panel. Each Worker has its own
    * SpiderMonkey context and is reported separately in {@link JsMemoryStats.Workers Workers}.<br>
    * <br>
    * Related GC settings are under <b>Advanced &gt; JSplitter &gt; Performance: restart is required &gt; GC</b>.
    *
    * @typedef {Object} JsMemoryStats
    * @property {number} MainThreadHeapUsage
    *    SpiderMonkey heap usage shared by all JSplitter panel scripts running on the main thread (in bytes).
    *    The maximum is configured by <b>Main thread maximum heap size (in MB)</b>; see {@link JsMemoryStats.MainThreadHeapLimit MainThreadHeapLimit}.
    *    Automatic GC based on heap growth is controlled by <b>Heap growth before GC (in MB)</b>.
    * @property {number} MainThreadHeapLimit
    *    Maximum SpiderMonkey heap size for main-thread panel scripts (in bytes). External memory does not count
    *    toward this limit. This value reflects <b>Main thread maximum heap size (in MB)</b>.
    * @property {number} WorkerHeapLimit
    *    <span id="JsMemoryStats-WorkerHeapLimit"></span>Maximum SpiderMonkey heap size for each Worker (in bytes).
    *    The limit is shared as one setting value by all Workers, but applies independently to each Worker.
    *    This value reflects <b>Worker maximum heap size (in MB, per Worker)</b>.
    * @property {number} CurrentPanelExternalUsage
    *    Tracked native/external memory retained by the current panel (in bytes). This is an accounting estimate,
    *    not process working set or physical RAM/VRAM residency. Automatic GC based on external-memory growth is
    *    controlled by <b>External memory growth before GC (in MB)</b>.
    * @property {JsWorkerMemoryStats[]} Workers
    *    <span id="JsMemoryStats-Workers"></span>Memory snapshots for Workers created by the current panel. Worker snapshots are published by each Worker
    *    thread without blocking the panel and may lag while a Worker is executing a long-running task.
    */
    /**
     * SpiderMonkey heap and native/external memory statistics.
     * See {@link JsMemoryStats} for the returned object properties.
     *
     * @type {JsMemoryStats}
     * @readonly
     */
    JsMemoryStats: undefined,

    /**
     * @type {number}
     * @readonly
     */
    Height: undefined, // (uint) (read)

    /**
     * Returns the title of the nearest named container hosting the panel.
     *
     * @type {string}
     * @readonly
     */
    HostWindowTitle: undefined, // (string) (read)

    /**
     * {@link window.MaxHeight MaxHeight}, {@link window.MaxWidth MaxWidth}, {@link window.MinHeight MinHeight} and {@link window.MinWidth MinWidth} can be used to lock the panel size.<br>
     * Do not use if panels are contained within Panel Stack Splitter (Columns UI component) or JSplitter itself
     *
     * @type {number}
     */
    MaxHeight: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight MaxHeight}.
     *
     * @type {number}
     */
    MaxWidth: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight MaxHeight}.
     *
     * @type {number}
     */
    MinHeight: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight MaxHeight}.
     *
     * @type {number}
     */
    MinWidth: undefined, // (uint) (read, write)

    /**
     * Returns the panel name set in {@link window.ShowConfigureV2 ShowConfigureV2}.
     *
     * @type {string}
     * @readonly
     */
    Name: undefined, // (string) (read)

    /**
     * Return value of {@link window.ScriptInfo}.<br>
     * {@link ScriptInfo.PackageId PackageId} is only present when the panel script is an SMP package.
     *
     * {@link ScriptInfo.Path Path} is always present. It contains the full native filesystem path of the panel's main script: the selected file for a File script, the sample file in the component folder for a Sample script, or the actual entry file for a package (main.js for an SMP package). For a script stored in panel memory, it is an empty string. This is a filesystem path, not a file URL.
     * The value always identifies the main script, including when read from an included file or an imported module. Relative filesystem paths used by supported methods are resolved from the calling file as described in {@link utils.ReadTextFile}; they do not necessarily use the directory of {@link ScriptInfo.Path Path}.
     *
    * @typedef {Object} ScriptInfo
    * @property {string} Name
    * @property {string} Path Full native filesystem path of the main script, or an empty string for an in-memory script.
    * @property {string} [Author]
    * @property {string} [Version]
    * @property {string} [PackageId]
    */

    /**
     * Information about the panel's main script. The {@link ScriptInfo.Path Path} property contains its full native filesystem path, or an empty string for an in-memory script. See {@link ScriptInfo} for all properties and source types.
     *
     * @type {ScriptInfo}
     * @readonly
     */
    ScriptInfo: undefined,

    /**
     * Get associated tooltip object.
     *
     * @type {FbTooltip}
     * @readonly
     */
    Tooltip: undefined,

    /**
     * @type {number}
     * @readonly
     */
    Width: undefined, // (uint) (read)

    /**
     * Clears all current panel properties set by {@link window.SetProperty SetProperty}, {@link window.SetProperties SetProperties} or {@link window.ImportProperties ImportProperties}
     *
     * @param {boolean=} [reload_panel=false] If true, reloads panel script after clearing
     */
    ClearProperties: function (reload_panel) { }, // (void)

    /**
     * See {@link clearTimeout}.
     *
     * @param {number} timerID
     */
    ClearTimeout: function (timerID) { }, // (void)

    /**
     * See {@link clearInterval}.
     *
     * @param {number} timerID
     */
    ClearInterval: function (timerID) { }, // (void)

    /**
     * Setups panel and script information and available features.<br>
     * Can be called only once, so it's better to define it
     * directly in the panel Configure menu.<br>
     * <br>
     * Deprecated: use {@link window.DefineScript DefineScript} instead.
     * Panel name can be changed via {@link window.ShowConfigureV2 ShowConfigureV2}.
     *
     * @throws {Error} If called for a package script, called more than once, or <b>options</b> / <b>options.features</b> is not an object.
     * @deprecated
     *
     * @param {string} name Script name and panel name
     * @param {object=} [options={}]
     * @param {string=} [options.author=''] Script author
     * @param {string=} [options.version=''] Script version
     * @param {object=} [options.features=undefined] Additional script features
     * @param {boolean=} [options.features.drag_n_drop=false] Indicates if drag_n_drop functionality should be enabled
     */
    DefinePanel: function (name, options) { }, // (void)

    /**
     * Setup the script information.<br>
     * Can be called only once for the whole panel.
     * 
     * @param {string} name Script name
     * @param {object=} [options={}]
     * @param {string=} [options.author=''] Script author
     * @param {string=} [options.version=''] Script version
     * @param {object=} [options.features=undefined] Additional script features
     * @param {boolean=} [options.features.drag_n_drop=false] Indicates if drag_n_drop functionality should be enabled
     * @param {boolean=} [options.features.grab_focus=true] Indicates if panel should grab mouse focus
     * @throws {Error} If called for a package script, called more than once, or <b>options</b> / <b>options.features</b> is not an object.
     */
    DefineScript: function (name, options) { }, // (void)

     /**
     * Open the current panel script in the default text editor.<br>
     * Default text editor can be changed via <b>Edit</b> button on the main tab of {@link window.ShowConfigureV2 ShowConfigureV2}.
     */
    EditScript: function () { },

    /**
     * Exports all current panel properties set by {@link window.SetProperty SetProperty} to file
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} fileName
     * @return {boolean} If false, then an error occurred during export
     */
    ExportProperties: function (fileName) { },

    /**
     * @return {MenuObject}
     *
     * @sourceFile ../../component/samples/basic/MainMenuManager All-In-One.js
     */
    CreatePopupMenu: function () { }, // (MenuObject)

    /**
     * @param {string} class_id {@link https://docs.microsoft.com/en-us/windows/win32/controls/parts-and-states}
     * @return {ThemeManager}
     *
     * @sourceFile ../../component/samples/basic/SimpleThemedButton.js
     */
    CreateThemeManager: function (class_id) { }, // (ThemeManager)

    /**
     * Note: a single panel can have only a single tooltip object.
     * Creating a new tooltip will replace the previous one.<br>
     * <br>
     * Deprecated: use {@link window.Tooltip Tooltip} and {@link FbTooltip#SetFont SetFont} instead.
     *
     * @deprecated
     * 
     * @param {string=} [font_name='Segoe UI']
     * @param {number=} [font_size_px=12]
     * @param {number=} [font_style=0] See {@link module:Flags.FontStyle FontStyle} flags
     * @return {FbTooltip}
     */
    CreateTooltip: function (font_name, font_size_px, font_style) { }, // (FbTooltip) [font_name][, font_size_px][, font_style]

    /**
     * @param {number} type See {@link module:Flags.ColourTypeCUI ColourTypeCUI} enum
     * @param {string=} client_guid Client GUID
     * @return {number} returns black colour if the requested one is not available.
     * @throws {Error} If the panel is not running under Columns UI.
     */
    GetColourCUI: function (type, client_guid) { }, // (uint) [, client_guid]

    /**
     * @param {number} type See {@link module:Flags.ColourTypeDUI ColourTypeDUI} enum
     * @return {number} returns black colour if the requested one is not available.
     * @throws {Error} If the panel is not running under Default UI.
     */
    GetColourDUI: function (type) { }, // (uint)

    /**
     * Note: see the example in {@link window.GetFontDUI GetFontDUI}.
     *
     * @param {number} type See {@link module:Flags.FontTypeCUI FontTypeCUI} enum
     * @param {string=} client_guid Client GUID
     * @return {?GdiFont} returns null if the requested font was not found.
     * @throws {Error} If the panel is not running under Columns UI.
     */
    GetFontCUI: function (type, client_guid) { }, // (GdiFont) [, client_guid]

    /**
     * @param {number} type See {@link module:Flags.FontTypeDUI FontTypeDUI} enum
     * @return {?GdiFont} returns null if the requested font was not found.
     *
     * @throws {Error} If the panel is not running under Default UI.
     * @example
     * // To avoid errors when trying to use the font or access its properties, you
     * // should use code something like this...
     * let font = window.GetFontDUI(0);
     * if (!font) {
     *    console.log("Unable to determine your default font. Using Segoe UI instead.");
     *    font = gdi.Font("Segoe UI", 12);
     * }
     */
    GetFontDUI: function (type) { }, // (GdiFont)

    /**
     * Get all current panel properties set by {@link window.SetProperty SetProperty}, {@link window.SetProperties SetProperties} or {@link window.ImportProperties ImportProperties}
     *
     * @return {Map} Map of panel properties
     * @example
     * const props = window.GetProperties();
     * for(const [key, value] of props) console.log(`Key = ${key}, Value = ${value}`);
     */
    GetProperties: function () { },

    /**
     * Get value of property.<br>
     * If property does not exist and default_val is not undefined and not null,
     * it will be created with the value of default_val.<br>
     * <br>
     * Note: leading and trailing whitespace are removed from property name.
     *
     * @param {string} name
     * @param {*=} default_val
     * @return {*}
     */
    GetProperty: function (name, default_val) { }, // (VARIANT) [, default_val]

    /**
     * Imports panel properties from file and (optionally) reloads the panel script<br>
     * DOES clear all existing panel properties.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} fileName
     * @param {boolean=} [reload_panel=false] If true, reloads panel script
     * @return {boolean} If false, then an error occurred during import. Also, if an error occurs during import, the panel does not reload.
     */
    ImportProperties: function (fileName, reload_panel) { },

    /**
     * This will <b>synchronously</b> trigger {@link module:Callbacks.on_notify_data on_notify_data}(name, info) in other panels.<br>
     * <b>!!! Beware !!!</b>: data passed via <b>info</b> argument must NOT be used or modified in the source panel after invoking this method.
     * <div class="doc-note warning">
     * <b>Legacy compatibility API</b><br>Existing scripts can keep using {@link window.NotifyOthers NotifyOthers} unchanged. For new asynchronous structured-clone messaging between panels and Workers, prefer {@link BroadcastChannel}.<br></div>
     *
     * @param {string} name
     * @param {*} info
     * 
     * @example
     * let data = { 
     *    // some data
     * };
     * window.NotifyOthers('have_some_data', data);
     * 
     * data = null; // stop using the object immediately
     * // AddSomeAdditionalValues(data); // don't try to modify it, since it will affect the object in the other panel as well
     */
    NotifyOthers: function (name, info) { }, // (void)

    /**
     * Reloads panel.
     * @param {boolean=} [clear_properties=false] If true, all panel properties will be cleared before reload
     */
    Reload: function (clear_properties) { }, // (void)

    /**
     * Performance note: don't force the repaint unless it's really necessary -
     * repaint calls might be grouped up when *not forced* which will turn them into a single repaint call,
     * thus reducing the amount of {@link module:Callbacks.on_paint on_paint} calls.
     *
     * @param {boolean=} [force=false] If true, will repaint immediately, otherwise a repaint task will be *scheduled*.
     */
    Repaint: function (force) { }, // (void) [force]

    /**
     * Repaints a part of the screen.<br>
     * Use this instead of {@link window.Repaint Repaint} on frequently updated areas
     * such as time, bitrate, seekbar, etc.<br>
     * <br>
     * Performance note: see Performance note in {@link window.Repaint Repaint}.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {boolean=} [force=false] If true, will repaint immediately, otherwise a repaint task will be *scheduled*.
     */
    RepaintRect: function (x, y, w, h, force) { }, // (void) [force]

    /**
     * This would usually be used inside the {@link module:Callbacks.on_mouse_move on_mouse_move} callback.<br>
     * Use -1 if you want to hide the cursor.
     *
     * @param {number} id See {@link module:Flags Flags} for flags like {@link module:Flags.IDC_ARROW IDC_ARROW}
     */
    SetCursor: function (id) { }, // (void)

    /**
     * Sets the text insertion point used to position system IME UI for a custom-drawn text field.
     * Coordinates are in panel client pixels. The component does not track or move the insertion
     * point automatically; call this again whenever your script moves its caret.<br>
     * <br>
     * This method does not create or draw a system caret. It only supplies the current insertion
     * position to the IME so handwriting/candidate UI can be placed near the field.
     *
     * @sourceFile ../../component/samples/basic/IME Input.js
     * @param {number} x Insertion-point x-coordinate.
     * @param {number} y Insertion-point y-coordinate.
     */
    SetImePosition: function (x, y) { }, // (void)

    /**
     * See {@link setInterval}.
     *
     * @param {function()} func
     * @param {number} delay
     *
     * @return {number}
     * @throws {Error} If <b>func</b> is not callable or <b>delay</b> is zero.
     */
    SetInterval: function (func, delay) { }, // (uint)

    /**
     * Set panel properties from input map and (optionally) reloads the panel script<br>
     * Does NOT clear existing properties before setting.
     *
     * @param {Map} values Map of values to set
     * @param {reload_panel=} [reload_panel=false] If true, reloads panel script after setting
     * 
     * @example
     * const values = new Map([["First value", 1], ["Second value", 2], ["Third value", 3]]);
     * window.SetProperties(values);
     */
    SetProperties: function (values, reload_panel) { }, // (void)

    /**
     * Set property value.<br>
     * Property will be removed, if val is undefined or null.<br>
     * <br>
     * Property values are saved per panel instance and are remembered between foobar2000 restarts.<br>
     * <br>
     * Note: leading and trailing whitespace are removed from property name.
     *
     * @param {string} name
     * @param {*=} val
     */
    SetProperty: function (name, val) { }, // (void)

    /**
     * Sets panel shortcut filter.<br>
     *
     * @param {boolean=} [enabled=true] If true filter is enabled. Suppresses player shortcuts depending on the following two parameters
     * @param {boolean=} [type_only=true] If true suppresses only shortcuts that identified as user input (keyboard_shortcut_manager::is_typing_message from SDK used). If false ALL shortcuts are disabled for panel
     * @param {boolean=} [suppress_children=false] If true suppresses also shortcuts for all JSplitter's children. Takes into account the parameter type_only only for DUI. For CUI alwas disables ALL shortcuts
     */
    SetShortcutFilter: function (enabled, type_only, suppress_children) { }, // (uint)

    /**
     * See {@link setTimeout}.
     *
     * @param {function()} func
     * @param {number} delay
     *
     * @return {number}
     * @throws {Error} If <b>func</b> is not callable.
     */
    SetTimeout: function (func, delay) { }, // (uint)

    /**
     * Show configuration window of current panel.
     * <br>
     * Deprecated: use {@link window.ShowConfigureV2 ShowConfigureV2} to configure panel and {@link window.EditScript EditScript} to edit script.
     *
     * @deprecated
     * 
     * @method
     */
    ShowConfigure: function () { }, // (void)

    /**
     * Show configuration window of current panel
     * @method
     */
    ShowConfigureV2: function () { }, // (void)

    /**
     * Show chidren panel list dialog for current panel
     * @method
     */
    ShowPanelList: function () { }, // (void)

    /**
     * Show properties window of current panel
     * @method
     */
    ShowProperties: function () { }, // (void)

    // JSplitter interface

    /**
     * Get an object for accessing the panel by the caption text. The first panel that matches the argument in text will be returned. The panel text is specified in the caption. By default, it has the value of the panel plugin name, but it can be changed either directly in the window title (Show coords -> Click in caption text) or in the Columns UI placer (Use custom title) or in 'Panel list' (right click on JSplitter window)
     * @param {string} caption
     * @return {PanelObject}
     * @throws {Error} If no child panel exists with the specified name.
     */
    GetPanel: function (caption) { }, // (PanelObject)

    /**
     * Get child panels count in JSplitter
     * @return {number}
     */
    GetPanelCount: function () { }, // (uint)

    /**
     * Get an object for accessing the panel by index. the order depends on the position in the window stack: the bottommost window will have index 0.
     * @param {number} index
     * @return {PanelObject}
     * @throws {Error} If no child panel exists at <b>index</b>.
     */
    GetPanelByIndex: function (index) { }, // (PanelObject)

    /**
     * Creates a button in the splitter. 
     * The button will be created in the root of the window and will be placed at the coordinates (x, y). 
     * The function is also passed images to set the appearance of the button. 
     * The number of states the button can take will depend on the number of images passed to the function. 
     * hover_images - button images displayed when the mouse cursor hovers over the button. 
     * The function is flexible enough to create different types of buttons
     * @param {string} x
     * @param {string} y
     * @param {*} images // null, string or Array<string>
     * @param {*=} [hover_images=null] // null, string or Array<string>
     * @return {ButtonObject}
     * @example
     * var path = fb.FoobarPath + "themes\\lur\\black\\bio.png";
     * var hpath = fb.FoobarPath + "themes\\lur\\black\\bio_on.png";
     * // Creates a regular button with the bio.png image, which changes to bio_on.png when the mouse cursor hovers over the button
     * var a = window.CreateButton(0, 0, path, hpath);
     * // Creates a checkbox button. The normal state is bio.png, pressed (checkbox checked) - bio_on.png. 
     * // Note that there are no images for hovering over. 
     * // Usually, checkboxes do not need them, but you can set them if you want.
     * var b = window.CreateButton(0, 0, [path, hpath], null);
     * // You can create a button with three (or more) states. They will switch cyclically when pressed.
     * // The current state of the button can be obtained using the State property of the button (see ButtonObject class). 
     * var c = window.CreateButton(0, 0, [path1, path2, path3], [path1_on, path2_on, path3_on]);
     */
    CreateButton: function (x, y, images, hover_images) { }, // (ButtonObject)

    /**
     * Get a button by its {@link ButtonObject#ID ID}
     * @param {number} id
     * @return {ButtonObject}
     */
    GetButton: function (id) { }, // (ButtonObject)

    /**
     * Creates a group of radio buttons. Takes an array of buttons as an argument. 
     * Each button must have at least two states, otherwise the function will fail.
     * @param {Array<ButtonObject>} buttons
     * @throws {Error} If <b>buttons</b> contains an invalid button object.
     * @example
     * var a = window.CreateButton(0 , 0, [path, hpath], null);
     * var b = window.CreateButton(30 ,0 , [path, hpath], null);
     * var c = window.CreateButton(60 ,0 , [path, hpath], null);
     * window.RadioButtons([a, b, c]);
     * // Now when you click on one button (state 1), the other will be switch to state 0 and vice versa.
     */
    RadioButtons: function (buttons) { }, // (void)

    /**
     * Removes a button
     * @param {ButtonObject} button
     */
    RemoveButton: function (button) { }, // (void)

    /**
     * Switches the mouse cursor for all buttons either to the hand or to the arrow. 
     * This property also affects all subsequently created buttons. 
     * This property can be changed individually for each button (see {@link ButtonObject} class).
     *
     * @type {boolean}
     */
     HandOnButtons: false, // (boolean) (read, write)

    /**
     * Enables tracking of the mouse cursor entering/exiting the panel area. By default = false.<br>
     * The following functions are used to handle events:<br>
     * {@link module:Callbacks.on_panel_mouse_enter on_panel_mouse_enter}(name) - cursor entering the panel area, name is the panel name<br>
     * {@link module:Callbacks.on_panel_mouse_leave on_panel_mouse_leave}(name) - cursor leaving the panel area, name is the panel name
     *
     * @type {boolean}
     */
     TrackMouseEnterLeaveOnPanels: false, // (boolean) (read, write)

    /**
     * Enables tracking of the mouse cursor position within the panel area.<br>
     * By default = false . The following function is used to handle the event:<br>
     * {@link module:Callbacks.on_panel_mouse_move on_panel_mouse_move}(name, x, y, mask): the event of moving the cursor within the panel area, name is the name of the panel, x, y are the coordinates of the point on the panel.
     *
     * @type {boolean}
     */
     TrackMouseMoveOnPanels: false, // (boolean) (read, write)

 };

