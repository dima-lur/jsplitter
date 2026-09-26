/**
 * @typedef {number} float
 */

/**
 * Evaluates JavaScript from a file in the current panel or Worker realm.<br>
 * Similar to `eval({@link utils.ReadTextFile}(path))`, but provides more features:<br>
 * - Has `include guards` - a file is evaluated only once per realm unless `always_evaluate` is used.<br>
 * - Panel-side includes also use compiled-script caching; Worker includes keep their own per-Worker include guard.<br>
 * - Has better error reporting.<br>
 * <br>
 * Relative paths are resolved from the currently executing script file first when available.<br>
 * For a file-backed Worker, this makes its own directory the natural root for nested relative `include()` calls.<br>
 * Configured panel/package script roots are then considered where applicable.<br>
 * `${fb.ComponentPath}` is the final fallback.
 * @worker
 * @param {string} path Absolute or relative path to JavaScript file.
 * @param {object=} [options=undefined]
 * @param {boolean=} [options.always_evaluate=false] If true, evaluates the script even if it was included before.
 *
 * @example <caption>Include some JS file</caption>
 * include('samples/complete/properties.js')
 */
function include(path, options) { }

/**
 *
 * @param {number} timerID
 * @worker
 */
function clearTimeout(timerID) { } // (void)

/**
 *
 * @param {number} timerID
 * @worker
 */
function clearInterval(timerID) { } // (void)

/**
 *
 * @param {function()} func
 * @param {number} delay
 * @param {...*} func_args
 * @return {number}
 * @worker
 */
function setInterval(func, delay, ...func_args) { } // (uint)

/**
 * 
 * @sourceFile ../../component/samples/basic/Timer.js
 * 
 * @param {function()} func
 * @param {number} delay
 * @param {...*} func_args
 * @return {number}
 * 
 * @worker
 */
function setTimeout(func, delay, ...func_args) { } // (uint)

/**
 * Load ActiveX object.
 *
 * @constructor
 * @param {string} name
 *
 * @example
 * const xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
 */
function ActiveXObject(name) {

    /**
     * Creates an `ActiveXObject` that contains an object of type (VT_ARRAY|SOME_TYPE).
     *
     * @static
     * 
     * @param {Array<*>} arr An array that contains elements of primitive type.
     * @param {number} element_variant_type A variant type of array elements.
     *
     * @return {ActiveXObject}
     * 
     * @example
     * let filename = 'x:\\file.bin';
     * let bin_data = [0x01, 0x00, 0x00, 0x02]
     * let com_bin_data = ActiveXObject.ActiveX_CreateArray(bin_data, 0x11) // VT_UI1
     * 
     * let stm = new ActiveXObject('ADODB.Stream');
     * 
     * stm.Open();
     * stm.Type = 1; //adTypeBinary
     * stm.Write(com_bin_data);
     * stm.SaveToFile(filename, 2);
     * stm.Close();
     */
    this.ActiveX_CreateArray = function (arr, element_variant_type) { };

    /**
     * Emulates COM's weird behaviour of property accessors.
     *
     * @param {number|string} prop_name Name of the property or it's numeric index
     * @return {*}
     *
     * @example
     * some_activex.ActiveX_Get('property_name', 'additional_info').DoSmth();
     * // in COM:
     * // some_activex.Item('property_name', 'additional_info').DoSmth();
     */
    this.ActiveX_Get = function (prop_name) { };

    /**
     * Emulates COM's weird behaviour of property accessors.
     *
     * @param {number|string} prop_name Name of the property or it's numeric index
     *
     * @example
     * some_activex.ActiveX_Set('property_name', 'new_value', 'additional_info');
     * // in COM:
     * // some_activex.Item('property_name', 'additional_info') = "new_value";
     */
    this.ActiveX_Set = function (prop_name) { };
}

/**
 * Deprecated: use `for ... of` loop instead.
 * 
 * @deprecated
 * 
 * @constructor
 * @param {ActiveXObject} active_x_object Any ActiveX collection object.
 * 
 * @example
     * let e = new Enumerator(active_x_object);
     * for (e.moveFirst(); !e.atEnd(); e.moveNext()) {
     *   console.log(e.item());
     * }
 */
function Enumerator(active_x_object) {

    /**
     * Returns a boolean value indicating if the enumerator has reached the end of the collection.
     *
     * @return {boolean}
     */
    this.atEnd = function () { };

    /**
     * Returns the item at the current enumerator position.
     *
     * @return {*}
     */
    this.item = function () { };

    /**
     * Resets enumerator position to the first item.
     *
     * @method
     */
    this.moveFirst = function () { };

    /**
     * Moves enumerator position to the next item.
     *
     * @method
     */
    this.moveNext = function () { };
}

/**
 * @namespace
 * @worker
 */
let console = {
    /**
     *
     * @param {...*} var_args
     * @worker
     */
    log: function (...var_args) { }, // (void)

    /**
     * Returns array of console log lines
     *  
     * @param {boolean=} [with_timestamp=false] To return console lines with timestamps or not
     * @return {Array<string>} 
     * @worker
     * @mainthread
     */
    GetLines: function (with_timestamp) { },

    /**
     * Clears console backlog<br>
     * NOTE: Limitation of foobar2000 versions < 2.0: clears only JSplitter's internal backlog.
     * 
     * @worker
     * @mainthread
     */
    ClearBacklog: function () { },
};

/**
 * Controls the main foobar2000 application window.
 * 
 * <b>Global state:</b> every JSplitter panel accesses the same native foobar2000 window through {@link fb.Window}</code>.
 * Window geometry {@link FbWindow#X X}, {@link FbWindow#Y Y}, {@link FbWindow#Width Width}, {@link FbWindow#Height Height}, the numeric {@link FbWindow#MinWidth MinWidth}, {@link FbWindow#MinHeight MinHeight}, {@link FbWindow#MaxWidth MaxWidth}, {@link FbWindow#MaxHeight MaxHeight}, and the numeric pseudo-caption rectangle defined by {@link FbWindow#SetPseudoCaption SetPseudoCaption} are global host state.
 * These numeric values are not automatically restored when a panel reloads or unloads. The pseudo-caption active state itself is tracked per panel, like {@link FbWindow#MinSize MinSize} and {@link FbWindow#MaxSize MaxSize}: unloading or reloading a panel removes its request, while the last rectangle coordinates remain stored globally.
 * 
 * Window modes such as {@link FbWindow#FrameStyle FrameStyle}, {@link FbWindow#Fullscreen Fullscreen}, {@link FbWindow#MainMenuHidden MainMenuHidden}, {@link FbWindow#StatusBarHidden StatusBarHidden}, {@link FbWindow#MinSize MinSize}, {@link FbWindow#MaxSize MaxSize}, and pseudo-caption activation are tracked per panel. 
 * The most recent explicit assignment made by any live panel becomes the effective global value. When that panel reloads or unloads, its request is removed and the previous request from another live panel, if any, becomes effective again. 
 * If no panel has a request, {@link FbWindow#FrameStyle FrameStyle} defaults to {@link module:Flags.FrameStyle FrameStyle.Default} and the boolean modes default to <b>false</b>.
 * 
 * So getters return the effective global value, not the last value assigned by the current panel.
 *
 * If both minimum and maximum limits are enabled for the same axis, keep the nonzero minimum less than or equal to the nonzero maximum. Contradictory limits are not a supported configuration.
 * <div class="doc-note warning"> 
 * <b>WARNING!</b><br>
 * Using the most methods described here (beyond simply changing the window's position and size) is incompatible with plugins that provide similar functionality, e.g. {@link https://github.com/The-Wizardium/UI-Wizard foo_ui_wizard}, {@link https://github.com/ttsping/foo_openhacks foo_openhacks} or {@link https://foobar2000.club/forum/viewtopic.php?t=1911 foo_ui_hacks}.
 * Therefore, if you intend to make active use of these methods, it is strongly recommended to uninstall the specified components.
 * </div>
 * <div class="doc-note warning"> 
 * <b>Legacy geometry API:</b> {@link window.FoobarWindowX}, {@link window.FoobarWindowY}, {@link window.FoobarWindowWidth}, {@link window.FoobarWindowHeight} and {@link window.MoveFoobarWindow} are deprecated compatibility APIs and will be removed in a future release. New code should use {@link fb.Window} geometry properties and {@link FbWindow#Move Move()} instead.
 * </div>
 *
 * @hideconstructor
 *
 * @example <caption>Borderless window with size limits</caption>
 * fb.Window.MinWidth = 500;
 * fb.Window.MinHeight = 300;
 * fb.Window.MinSize = true;
 *
 * fb.Window.MaxWidth = 1600;
 * fb.Window.MaxHeight = 1000;
 * fb.Window.MaxSize = true;
 *
 * fb.Window.FrameStyle = FrameStyle.NoBorder;
 *
 * @example <caption>Window mode state is shared between panels</caption>
 * // Panel A:
 * fb.Window.FrameStyle = FrameStyle.NoBorder;
 *
 * // Panel B, executed later:
 * fb.Window.FrameStyle = FrameStyle.Default;
 * // FrameStyle.Default is now effective globally. If Panel B reloads or unloads,
 * // Panel A's still-live FrameStyle.NoBorder request becomes effective again.
 */
function FbWindow() {
    /**
     * X coordinate of the outer main-window rectangle in screen coordinates.
     *
     * @type {number}
     */
    this.X = 0;

    /**
     * Y coordinate of the outer main-window rectangle in screen coordinates.
     *
     * @type {number}
     */
    this.Y = 0;

    /**
     * Width of the outer main-window rectangle, including the non-client frame when present.
     *
     * @type {number}
     */
    this.Width = 0;

    /**
     * Height of the outer main-window rectangle, including the non-client frame when present.
     *
     * @type {number}
     */
    this.Height = 0;

    /**
     * Controls the native frame style of the main window.
     * <br><br>
     * Use {@link module:Flags.FrameStyle FrameStyle}:
     * <ul>
     * <li>{@link module:Flags.FrameStyle FrameStyle.Default} - use the normal foobar2000 window frame.</li>
     * <li>{@link module:Flags.FrameStyle FrameStyle.NoCaption} - remove the caption while keeping the native resizable frame. Windows continues to handle resizing, including the thin top resize grip.</li>
     * <li>{@link module:Flags.FrameStyle FrameStyle.NoBorder} - remove both the caption and resizable frame. JSplitter restores edge/corner resizing itself.</li>
     * </ul>
     * In <b>No border</b> mode with Default User Interface, a visible native status bar owns its bottom-right size grip. That grip may interfere with resizing from the bottom-right corner; hiding the status bar avoids this limitation.
     *
     * @type {FrameStyle}
     * @throws {Error} If the value is not a valid {@link module:Flags.FrameStyle FrameStyle} value.
     */
    this.FrameStyle = FrameStyle.Default;

    /**
     * Enables fullscreen mode on the monitor containing the main window. The window covers the full monitor area, including the taskbar.
     * 
     * The previous window placement is restored when fullscreen is disabled, then the current effective {@link FbWindow#FrameStyle FrameStyle} is reapplied.
     * Minimum and maximum size limits do not clamp the window while fullscreen is active.
     * 
     * If fullscreen is changed while a modal JSplitter/foobar2000 dialog is open, the native transition is deferred until the modal dialog closes. The property still reports the current effective requested state during that time.
     *
     * @type {boolean}
     */
    this.Fullscreen = false;

    /**
     * Hides the foobar2000 main menu bar.
     * <br><br>
     * Available only with Default User Interface (DUI). Reading or writing this property with Columns UI throws an error.
     *
     * @type {boolean}
     * @throws {Error} When Columns UI is active.
     */
    this.MainMenuHidden = false;

    /**
     * Hides the foobar2000 status bar.
     * <br><br>
     * Available only with Default User Interface (DUI). Reading or writing this property with Columns UI throws an error.
     *
     * @type {boolean}
     * @throws {Error} When Columns UI is active.
     */
    this.StatusBarHidden = false;

    /**
     * Enables the minimum main-window size defined by {@link FbWindow#MinWidth MinWidth} and {@link FbWindow#MinHeight MinHeight}.
     * Setting this property to <code>true</code> immediately clamps the current window size when needed. Changing an active minimum width or height also clamps the current size immediately.
     * A limit value of 0 means that the corresponding axis is not constrained.
     *
     * @type {boolean}
     */
    this.MinSize = false;

    /**
     * Minimum width of the outer main-window rectangle when {@link FbWindow#MinSize MinSize} is enabled.
     * A value of 0 disables the minimum-width constraint while leaving the minimum-height constraint independent.
     *
     * @type {number}
     */
    this.MinWidth = 0;

    /**
     * Minimum height of the outer main-window rectangle when {@link FbWindow#MinSize MinSize} is enabled.
     * A value of <b>0</b> disables the minimum-height constraint while leaving the minimum-width constraint independent.
     *
     * @type {number}
     */
    this.MinHeight = 0;

    /**
     * Enables the maximum main-window size defined by {@link FbWindow#MaxWidth MaxWidth} and {@link FbWindow#MaxHeight MaxHeight}.
     * Setting this property to <b>true</b> immediately clamps the current window size when needed. Changing an active maximum width or height also clamps the current size immediately.
     * A limit value of <b>0</b> means that the corresponding axis is not constrained.
     *
     * @type {boolean}
     */
    this.MaxSize = false;

    /**
     * Maximum width of the outer main-window rectangle when {@link FbWindow#MaxSize MaxSize} is enabled.
     * A value of <b>0</b> disables the maximum-width constraint while leaving the maximum-height constraint independent.
     *
     * @type {number}
     */
    this.MaxWidth = 0;

    /**
     * Maximum height of the outer main-window rectangle when {@link FbWindow#MaxSize MaxSize} is enabled.
     * A value of <b>0</b> disables the maximum-height constraint while leaving the maximum-width constraint independent.
     *
     * @type {number}
     */
    this.MaxHeight = 0;

    /**
     * Moves and resizes the main foobar2000 window in one operation.
     * The arguments describe the outer window rectangle in screen coordinates.
     * If called during early startup, the requested geometry is retained and applied when the main window becomes available.
     *
     * @param {number} x X coordinate in screen coordinates.
     * @param {number} y Y coordinate in screen coordinates.
     * @param {number} width Outer window width.
     * @param {number} height Outer window height.
     */
    this.Move = function (x, y, width, height) { };

    /**
     * Starts the native Windows move operation for the main foobar2000 window, as if the user had started dragging its caption.
     * This is useful when the script needs to decide dynamically whether a mouse action should start moving the window. For a fixed draggable area, {@link FbWindow#SetPseudoCaption SetPseudoCaption} is usually simpler.
     * The move loop is started asynchronously, so the JavaScript callback is not kept running for the duration of the drag.
     *
     * @example
     * function on_mouse_lbtn_down(x, y) {
     *     if (y < 30) {
     *         fb.Window.MoveStart();
     *     }
     * }
     */
    this.MoveStart = function () { };

    /**
     * Defines a rectangular pseudo-caption area for the main foobar2000 window. Pressing the left mouse button anywhere inside this area starts the native Windows move operation, including when the pointer is over a child window such as a JSplitter panel.
     * This provides a persistent alternative to calling {@link FbWindow#MoveStart MoveStart} from a mouse callback and is especially useful with {@link FbWindow#FrameStyle FrameStyle} set to {@link module:Flags.FrameStyle FrameStyle.NoCaption} or {@link module:Flags.FrameStyle FrameStyle.NoBorder}.
     * 
     * The coordinates are pixel offsets from the top-left corner of the outer main-window rectangle. Calling this method again replaces the stored global rectangle and enables pseudo-caption for the current panel. The rectangle values remain stored globally, but the active request belongs to the panel and is automatically removed when that panel reloads or unloads. If another live panel has an active pseudo-caption request, it becomes effective again using the current stored rectangle.
     * 
     * With {@link module:Flags.FrameStyle FrameStyle.NoBorder}, resize edges take precedence over the pseudo-caption area. The pseudo-caption does not start a move operation while the main window is fullscreen or maximized. A left click inside the rectangle is consumed for window dragging, so interactive controls should not be placed inside it.
     *
     * @param {number} x Horizontal offset from the left edge of the outer main-window rectangle.
     * @param {number} y Vertical offset from the top edge of the outer main-window rectangle.
     * @param {number} width Width of the pseudo-caption rectangle. Must be greater than 0.
     * @param {number} height Height of the pseudo-caption rectangle. Must be greater than 0.
     * @throws {Error} If <code>width</code> or <code>height</code> is not greater than 0.
     *
     * @example
     * fb.Window.FrameStyle = FrameStyle.NoBorder;
     * fb.Window.SetPseudoCaption(8, 8, 400, 32);
     */
    this.SetPseudoCaption = function (x, y, width, height) { };

    /**
     * Removes the current panel's pseudo-caption request previously enabled by {@link FbWindow#SetPseudoCaption SetPseudoCaption}.
     * The stored rectangle coordinates are not cleared. The request is also removed automatically when the panel reloads or unloads; if another live panel has an active request, pseudo-caption remains enabled for that panel.
     */
    this.ClearPseudoCaption = function () { };
}

/**
 * Functions for controlling foobar2000 and accessing it's data.
 *
 * @namespace
 * @worker
 */
let fb = {
    /**
     * @type {boolean}
     *
     * @example
     * fb.AlwaysOnTop = !fb.AlwaysOnTop; // Toggles the current value.
     * @worker
     * @mainthread
     */
    AlwaysOnTop: undefined, //(boolean) (read, write)

    /**
     * Access to the main foobar2000 application window.
     * See {@link FbWindow} for global state, multi-panel ownership and UI-specific behavior.
     *
     * @type {FbWindow}
     * @readonly
     */
    Window: undefined, // (FbWindow) (read)

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(fb.ComponentPath); // C:\Users\User\AppData\Roaming\foobar2000\user-components\foo_uie_jsplitter\
     * @worker
     */
    ComponentPath: undefined, // (string) (read)

    /**
     * @type {boolean}
     * @worker
     * @mainthread
     */
    CursorFollowPlayback: undefined, // (boolean) (read, write)

    /** 
     * It can be used for displaying the volume from UPnP devices.<br>
     * It will return a value of -1 when using a normal device and that also indicates that fb.Volume is writable.<br>
     * When a custom volume control is active, you can not use fb.Volume and must use fb.VolumeUp() / fb.VolumeDown() / fb.VolumeMute().
     * @type {boolean}
     * @readonly
     * @worker
     * @mainthread
     */
    CustomVolume: undefined, // (int) (read)

    /**
     * @type {string}
     * @readonly
     * @worker
     */
    FoobarPath: undefined, // (string) (read)

    /**
     * @type {boolean}
     * @readonly
     * @worker
     * @mainthread
     */
    IsPaused: undefined, // (boolean) (read)

    /**
     * @type {boolean}
     * @readonly
     * @worker
     * @mainthread
     */
    IsPlaying: undefined, // (boolean) (read)

    /**
     * @type {boolean}
     * @worker
     * @mainthread
     */
    PlaybackFollowCursor: undefined, // (boolean) (read, write)

    /**
     * @type {float}
     * @readonly
     *
     * @example
     * console.log(fb.PlaybackLength); // 322.843414966166
     *
     * @example
     * console.log(Math.round(fb.PlaybackLength)); // 323
     * @worker
     * @mainthread
     */
    PlaybackLength: undefined, // (double) (read)

    /**
     * @type {float}
     *
     * @example
     * fb.PlaybackTime = 60; // Jumps to the 1 minute mark.
     * @worker
     * @mainthread
     */
    PlaybackTime: undefined, // (double) (read, write)

    /**
     * @type {string}
     * @readonly
     * @worker
     */
    ProfilePath: undefined, // (string) (read)

    /**
     * 0 - None<br>
     * 1 - Track<br>
     * 2 - Album<br>
     * 3 - Track/Album by Playback Order (only available in foobar2000 v1.3.8 and later)
     * See {@link module:Flags.ReplayGainMode ReplayGainMode} enum
     *
     * @type {number}
     * @worker
     * @mainthread
     */
    ReplaygainMode: undefined, // (uint) (read, write)

    /**
     * @type {boolean}
     *
     * @example
     * fb.StopAfterCurrent = !fb.StopAfterCurrent; // Toggles the current value.
     * @worker
     * @mainthread
     */
    StopAfterCurrent: undefined, // (boolean) (read, write)

    /**
    * @type {string}
    * @readonly
    *
    * @example
    * console.log(fb.Version)
    * // 1.4.1
     * @worker
    */
    Version: undefined,

    /**
     * @type {float}
     *
     * @example
     * fb.Volume = 0; // Sets the volume to max. -100 is the minimum.
     * @worker
     * @mainthread
     */
    Volume: undefined, // (float) (read, write),

    /**
     * @return {FbUiSelectionHolder}
     * @worker
     * @mainthread
     */
    AcquireUiSelectionHolder: function () { }, // (FbUiSelectionHolder)

    /** @method */
    AddDirectory: function () { }, // (void)

    /** @method */
    AddFiles: function () { }, // (void)

    /**
     * Converts one or more paths to a list of metadb_handles.<br>
     * The function returns immediately; specified callback {@link module:Callbacks.on_locations_added on_locations_added} receives results when the operation has completed.
     * @param {Array<string>} locations must be an array of strings and it can contain file paths, playlists or urls.
     * @return {number} task id (see first parameter of {@link module:Callbacks.on_locations_added on_locations_added})
     * 
     * @example
     * function on_mouse_lbtn_dblclk() {
     *     var files = ["z:\\1.mp3", "z:\\2.flac"];
     *     var task_id = fb.AddLocationsAsync(files);
     *     console.log("got task_id", task_id);
     * }
     *
     * function on_locations_added(task_id, handle_list) {
     *     console.log("callback task_id", task_id);
     *     console.log(handle_list.Count);
     * }
     * @worker
     * @mainthread
     */
    AddLocationsAsync: function (locations) { }, // (uint)

    /**
     * Checks Clipboard contents are handles or a file selection from Windows Explorer. Use in conjunction
     * with {@link fb.GetClipboardContents}.
     *
     * @return {boolean}
     * @worker
     * @mainthread
     */
    CheckClipboardContents: function () { }, // (boolean)

    /**
     * Clears active playlist.<br>
     * If you wish to clear a specific playlist, use {@link plman.ClearPlaylist}(playlistIndex).
     * @worker
     * @mainthread
     */
    ClearPlaylist: function () { }, // (void)

    /**
     * Note: items can then be pasted in other playlist viewers or in Windows Explorer as files.
     *
     * @param {FbMetadbHandleList} handle_list
     * @return {boolean}
     *
     * @example <caption>Copy playlist items</caption>
     * let handle_list = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     * fb.CopyHandleListToClipboard(handle_list);
     *
     * @example <caption>Cut playlist items</caption>
     * let ap = plman.ActivePlaylist;
     * if (!plman.GetPlaylistLockedActions(ap).includes('RemoveItems')) {
     *    let handle_list = plman.GetPlaylistSelectedItems(ap);
     *    if (fb.CopyHandleListToClipboard(handle_list)) {
     *        plman.UndoBackup(ap);
     *        plman.RemovePlaylistSelection(ap);
     *    }
     *  }
     * @worker
     * @mainthread
     */
    CopyHandleListToClipboard: function (handle_list) { }, // (boolean)

    /**
     * @sourceFile ../../component/samples/basic/MainMenuManager All-In-One.js
     * 
     * @return {ContextMenuManager}
     */
    CreateContextMenuManager: function () { }, // (ContextMenuManager)

    /**
     * Returns an empty handle list.<br>
     * Deprecated: use {@link FbMetadbHandleList} constructor instead.
     *
     * @deprecated
     * 
     * @return {FbMetadbHandleList}
     * @worker
     */
    CreateHandleList: function () { }, // (FbMetadbHandleList)

    /**
     * @sourceFile ../../component/samples/basic/MainMenuManager All-In-One.js
     * 
     * @return {MainMenuManager}
     */
    CreateMainMenuManager: function () { }, // (MainMenuManager)

    /**
     * @param {string=} [name=''] Will be shown in console when used with {@link FbProfiler#Print Print} method.
     * @return {FbProfiler}
     * @worker
     */
    CreateProfiler: function (name) { }, // (FbProfiler) [name]

    /**
     * Invokes drag-n-drop operation (see {@link https://docs.microsoft.com/en-us/windows/win32/api/ole2/nf-ole2-dodragdrop}).<br>
     * <br>
     * Quick tips:<br>
     * - If you need only to drag from your panel with copy (i.e. without physically moving them):
     *      use only fb.DoDragDrop(handles, DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
     * - If you need only to receive drop to your panel with copy:
     *      handle `on_drop_*()` callbacks, while setting action.effect argument to (DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
     * <br>
     * Full drag-n-drop interface description:<br>
     * - Drag-n-drop interface is based on Microsoft IDropSource and IDropTarget interfaces, so a lot of info (including examples) could be gathered from MSDN (IDropSource, IDropTarget, DoDragDrop, DROPEFFECT).<br>
     * - Drag operation is started with DoDragDrop (whether it is called by your panel, or externally) with okEffects argument supplied.<br>
     * - DoDragDrop blocks code execution until the drag operation is finished (callbacks will be called properly though). It returns effect from Action.Effect from on_drag_drop after completion.<br>
     * - (Spider Monkey Panel specific) Drag operation is canceled when any mouse button is pressed.<br>
     * - (Spider Monkey Panel specific) All mouse callbacks are suppressed during drag operation (including on_mouse_lbtn_up, but excluding on_mouse_mbtn_up and on_mouse_rbtn_up).<br>
     * - Every drag callback receives Action argument. Action.Effect contains okEffects from DoDragDrop call. Action.Effect should be changed to the desired effect in the callback.
     *   If the returned Action.Effect was not in okEffects or is equal to DROPEFFECT_NONE (=== 0), then drop will be denied:
     *   cursor icon will be changed, on_drag_drop won't be called after releasing lmbtn, on_drag_leave will be called instead.<br>
     * - DROPEFFECT_LINK should be used as fallback in case effect argument does not have DROPEFFECT_COPY (===1), since some external drops only allow DROPEFFECT_LINK effect.<br>
     * - Changing effect on key modifiers is nice (to be in line with native Windows behaviour): see the example below.<br>
     * <br>
     * Note: due to the asynchronous nature of event handling, `fb.DoDragDrop()` might exit before `on_drag_drop` callback is triggered
     * when dropping data on the same panel as the one that had a call to `fb.DoDragDrop()`.<br>
     * <br>
     * Related callbacks: {@link module:Callbacks.on_drag_enter on_drag_enter}, {@link module:Callbacks.on_drag_drop on_drag_drop},
     * {@link module:Callbacks.on_drag_over on_drag_over}, {@link module:Callbacks.on_drag_leave on_drag_leave}
     * 
     * @param {number} window_id unused
     * @param {FbMetadbHandleList} handle_list
     * @param {number} effect Allowed effects.
     * @param {object=} [options=undefined] Customization options for the data displayed in the drag window.
     * @param {boolean=} [options.show_text=true] If true, will add track count text.
     * @param {boolean=} [options.use_album_art=true] If true, will use album art of the focused item from dragged tracks (if available)
     * @param {boolean=} [options.use_theming=true] If true, will use Windows drag window style. Album art and custom image are resized to fit when Windows style is active.
     * @param {GdiBitmap=} [options.custom_image=undefined] (or {@link D2DBitmap} if {@link window.DrawMode} == 1). Custom dragging image. Will be also displayed if use_album_art is true, but there is no album art available.
     * @return {number} Effect that was returned in {@link module:Callbacks.on_drag_drop on_drag_drop}.
     *
     * @sourceFile ../../component/samples/basic/DragnDrop.js
     */
    DoDragDrop: function (window_id, handle_list, effect, options) { }, // (uint),

    /**
     * @method
     * @worker
     * @mainthread
     */
    Exit: function () { }, // (void)

    /**
     * For future development purposes (e.g. verbose console output)
     * 
     * @method
     * @worker
     */
    EnableAdvancedLogging: function () { }, 

    /**
     * Returns all main menu items recursivley.<br>
     * It is a JSON array in string form so you need to use JSON.parse on the result.<br>
     * Every item of the array is object with the following properties:<br>
     * <b>Checked</b>: boolean<br>
     * <b>Disabled</b>: boolean<br>
     * <b>FullPath</b>: string, the same full path you'd supply to fb.RunMainMenuCommand<br>
     * <b>HiddenByDefault</b>: boolean<br>
     * <b>Radio</b>: boolean<br>
     * <b>Type</b>: string ("Fixed" or "Dynamic")<br>
     * <b>Visible</b>: boolean<br>
     * 
     * @return {string} 
     * 
     * @example
     * const menuCommands = JSON.parse(fb.EnumerateMainMenuCommands());
     * 
     * // list all checked commands in the console
     * menuCommands
     *     .filter(command => command.Checked)
     *     .forEach(({ FullPath }) => console.log(FullPath));
     * @worker
     * @mainthread
     */
    EnumerateMainMenuCommands: function () { }, 

    /**
     * Returns array of active DSPs names.
     * 
     * @return {Array<string>} 
     * @worker
     * @mainthread
     */
    GetActiveDSPs: function () { }, 
    
    /**
     * Returns PCM data from the foobar2000 visualisation stream.<br>
     * The stream is created lazily. A negative <code>offset</code> requests data before the current visualisation time; JSplitter automatically maintains the native backlog required for that offset. The first stream initialization may briefly synchronize with the foobar2000 main thread.<br>
     * For repeated real-time processing, prefer {@link fb.GetAudioChunkTo} to write directly into a reusable <code>Float32Array</code> without creating a transient {@link FbAudioChunk}. {@link FbAudioChunk#CopyDataTo CopyDataTo()} remains useful when a chunk object is already required, while {@link FbAudioChunk#Data Data} preserves its legacy allocating <code>Array</code> behaviour for compatibility.
     *
     * @param {number} requested_length 
     * @param {number=} [offset=0] 
     * @return {FbAudioChunk}
     * 
     * @sourceFile ../../component/samples/complete/js/vu_meter.js
     * @worker
     */
    GetAudioChunk: function (requested_length, offset) { },

    /**
     * Writes interleaved PCM samples from the foobar2000 visualisation stream directly into an existing <code>Float32Array</code>.
     * Unlike {@link fb.GetAudioChunk}, this method does not create an {@link FbAudioChunk}; after the first sufficiently large native scratch buffer has been established, repeated calls can reuse both the native scratch storage and the JavaScript destination buffer.<br>
     * A negative <code>offset</code> has the same backlog semantics as {@link fb.GetAudioChunk}. If <code>info</code> is supplied, it is updated in place with <code>SampleCount</code>, <code>ChannelCount</code>, <code>SampleRate</code> and <code>ChannelConfig</code>.
     *
     * @param {Float32Array} destination Destination buffer. It must have room for all interleaved PCM sample values.
     * @param {number} requested_length
     * @param {number=} [offset=0]
     * @param {Object=} info Reusable metadata object updated in place.
     * @return {number} Number of scalar PCM samples written, or 0 when no chunk is currently available.
     * @throws {Error} If <code>destination</code> is not a <code>Float32Array</code>, is too small, or <code>info</code> is not an object.
     * @worker
     */
    GetAudioChunkTo: function (destination, requested_length, offset, info) { },

    /**
     * Note: clipboard contents can be handles copied to the clipboard in other components,
     * from {@link fb.CopyHandleListToClipboard} or a file selection, from Windows Explorer and etc.<br>
     * <br>
     * Performance note: validate clipboard content with {@link fb.CheckClipboardContents} before calling this method.
     *
     * @param {number=} [window_id=0] unused
     * @return {FbMetadbHandleList}
     *
     * @example
     * function on_mouse_rbtn_up(x, y) {
     *    let ap = plman.ActivePlaylist;
     *    let menu = window.CreatePopupMenu();
     *    menu.AppendMenuItem(!plman.GetPlaylistLockedActions(ap).includes('AddItems') && fb.CheckClipboardContents() ? MF_STRING : MF_GRAYED, 1, "Paste"); // see Flags.js for MF_* definitions
     *    let idx = menu.TrackPopupMenu(x, y);
     *    if (idx == 1) {
     *        let handle_list  = fb.GetClipboardContents();
     *        plman.InsertPlaylistItems(ap, plman.PlaylistItemCount(ap), handle_list );
     *    }
     *    return true;
     * }
     * @worker
     * @mainthread
     */
    GetClipboardContents: function (window_id) { }, // (FbMetadbHandleList)

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3. * <br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.
     * <br>
     * Related methods: {@link fb.SetDSPPreset}.
     * 
     * @return {string}
     *
     * @example
     * let str = fb.GetDSPPresets();
     * let arr = JSON.parse(str);
     * console.log(JSON.stringify(arr, null, 4));
     * // [
     * //     {
     * //         "active": false,
     * //         "name": "High Filter"
     * //     },
     * //     {
     * //         "active": true,
     * //         "name": "R128 Compressor"
     * //     },
     * //     {
     * //         "active": false,
     * //         "name": "7.1 upmix"
     * //     }
     * // ]
     * @worker
     * @mainthread
     */
    GetDSPPresets: function () { },

    /**
     * @param {boolean=} [force=true] When true, it will use the first item of the active playlist if it is unable to get the focus item.
     * @return {FbMetadbHandle}
     * @worker
     * @mainthread
     */
    GetFocusItem: function (force) { }, // (FbMetadbHandle) [force]

    /**
     * Returns all Media Library items as a handle list.
     *
     * @return {FbMetadbHandleList}
     * @worker
     * @mainthread
     */
    GetLibraryItems: function () { }, // (FbMetadbHandleList)

    /**
     * Note: do not use this while looping through a handle list. Use {@link FbMetadbHandleList#GetLibraryRelativePaths GetLibraryRelativePaths} instead. <br>
     * <br>
     * Returns an empty string when used on track not in Media Library
     *
     * @param {FbMetadbHandle} handle
     * @return {string}
     *
     * @example
     * // The foobar2000 Media Library is configured to watch "D:\Music" and the
     * // path of the now playing item is "D:\Music\Albums\Artist\Some Album\Some Song.flac"
     * let handle = fb.GetNowPlaying();
     * console.log(fb.GetLibraryRelativePath(handle)); // Albums\Artist\Some Album\Some Song.flac*
     * @worker
     * @mainthread
     */
    GetLibraryRelativePath: function (handle) { }, // (string)

    /**
     * Returns unique Media Library root paths inferred from the current Media Library contents.<br>
     * Each root is reconstructed from the absolute path and library-relative path of a library item.<br>
     * Configured library folders that contain no library items cannot be returned.
     *
     * @return {Array<string>} Media Library root paths
     * @worker
     * @mainthread
     */
    GetLibraryRoots: function () { },

    /**
     * Get handle of the now playing track.
     *
     * @return {?FbMetadbHandle} null, if nothing is being played.
     * @worker
     * @mainthread
     */
    GetNowPlaying: function () { }, // (FbMetadbHandle)

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3. * <br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.
     * <br>
     * Related methods: {@link fb.SetOutputDevice}.
     * 
     * @return {string}
     *
     * @example
     * let str = fb.GetOutputDevices();
     * let arr = JSON.parse(str);
     * console.log(JSON.stringify(arr, null, 4));
     * // [
     * //     {
     * //         "active": false,
     * //         "device_id": "{5243F9AD-C84F-4723-8194-0788FC021BCC}",
     * //         "name": "Null Output",
     * //         "output_id": "{EEEB07DE-C2C8-44C2-985C-C85856D96DA1}"
     * //     },
     * //     {
     * //         "active": true,
     * //         "device_id": "{00000000-0000-0000-0000-000000000000}",
     * //         "name": "Primary Sound Driver",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{1C4EC038-97DB-48E7-9C9A-05FDED46847B}",
     * //         "name": "Speakers (Sound Blaster Z)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{41B86272-3D6C-4A5A-8907-4FE7EBE39E7E}",
     * //         "name": "SPDIF-Out (Sound Blaster Z)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     },
     * //     {
     * //         "active": false,
     * //         "device_id": "{9CDC0FAE-2870-4AFA-8287-E86099D69076}",
     * //         "name": "3 - BenQ BL3200 (AMD High Definition Audio Device)",
     * //         "output_id": "{D41D2423-FBB0-4635-B233-7054F79814AB}"
     * //     }
     * // ]
     * // Normally, one item in the array has "active" set to true,
     * // indicating the currently configured output device.
     * // If the configured output device is unavailable, the array
     * // may contain no active item.
     * @worker
     */
    GetOutputDevices: function () { }, // (string)

    /**
     * Note: use try/catch to handle invalid queries. An empty handle list will be returned if the query
     * is valid but there are no results.
     *
     * @param {FbMetadbHandleList} handle_list
     * @param {string} query
     * @return {FbMetadbHandleList} Unsorted results.
     *
     * @example
     * let a = fb.GetQueryItems(plman.GetPlaylistItems(plman.ActivePlaylist), "rating IS 5");
     *
     * @example
     * let b = fb.GetQueryItems(fb.GetLibraryItems(), "rating IS 5");
     * @worker
     */
    GetQueryItems: function (handle_list, query) { }, // (FbMetadbHandleList)

    /**
     * Gets now playing or selected item according to settings in "File>Preferences>Display>Selection viewers".
     *
     * @return {?FbMetadbHandle}
     * @worker
     * @mainthread
     */
    GetSelection: function () { }, // (FbMetadbHandle)

    /**
     * Works like {@link fb.GetSelection}, but returns a handle list.<br>
     *
     * @param {number=} [flags=0] 1 - no now playing
     * @return {FbMetadbHandleList}
     * @worker
     * @mainthread
     */
    GetSelections: function (flags) { }, // (FbMetadbHandleList) //[flags]

    /**
     * Retrieves what the selection type is.
     *
     * @return {number} see {@link module:Flags.SelectionType SelectionType} enum<br>
     *     0 - undefined (no item)<br>
     *     1 - active_playlist_selection<br>
     *     2 - caller_active_playlist<br>
     *     3 - playlist_manager<br>
     *     4 - now_playing<br>
     *     5 - keyboard_shortcut_list<br>
     *     6 - media_library_viewer
     * @worker
     * @mainthread
     */
    GetSelectionType: function () { }, // (uint)

    /**
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsLibraryEnabled: function () { }, // (boolean)

    /**
     * Returns true if the library has already been initialized by this time
     * 
     * @return {boolean}
     * @worker
     */
    IsLibraryInitialised: function () { }, // (boolean)
    
    /**
     * Performance note: don't use in `on_paint`.
     *
     * @param {string} command Path to main menu item
     * @return {boolean} true, if the item is checked.
     *
     * @example
     * fb.RunMainMenuCommand("Playback/Scrobble Tracks"); // available with foo_scrobble
     * @worker
     * @mainthread
     */
    IsMainMenuCommandChecked: function (command) { }, // (boolean)

    /**
     * @param {FbMetadbHandle} handle
     * @return {boolean}
     *
     * @example
     * let np = fb.GetNowplaying();
     * console.log(fb.IsMetadbInMediaLibrary(np)); // If false, playing track is not in Media Library.
     * @worker
     * @mainthread
     */
    IsMetadbInMediaLibrary: function (handle) { }, // (boolean)

    /**
     * Loads playlist from file. Equivalent to `File`>`Load Playlist...`.
     *
     * @method
     */
    LoadPlaylist: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Next: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Pause: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Play: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    PlayOrPause: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Prev: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Random: function () { }, // (void)

    /**
     * Registers a main menu item that will be displayed under <b>main menu</b> > <b>File</b> > <b>JSplitter</b> > <b>Script commands</b> > <b>{Current panel name}</b>.<br>
     * Being main menu item means you can bind it to global keyboard shortcuts, standard toolbar buttons, panel stack splitter buttons and etc.<br>
     * Execution of the correspoding menu item will trigger {@link module:Callbacks.on_main_menu_dynamic on_main_menu_dynamic} callback.<br>
     * <br>
     * Note: JSplitter uses a combination of panel name and command id to identify and bind the command. Hence all corresponding binds will fail
     * if the id or the panel name is changed. This also means that collision WILL occur if there are two panels with the same name.<br>
     * <br>
     * Related methods: {@link fb.UnregisterMainMenuCommand}<br>
     * Related callbacks: {@link module:Callbacks.on_main_menu_dynamic on_main_menu_dynamic}
     * 
     * @param {number} id
     * @param {string} name
     * @param {string=} [description='']
     * @worker
     * @mainthread
     */
    RegisterMainMenuCommand: function (id, name, description) { },

    /**
     * @method
     * @worker
     * @mainthread
     */
    Restart: function () { }, // (void)

    /**
     * Shows context menu for currently played track.
     *
     * @param {string} command
     * @param {number=} [flags=0]
     *     0 - default (depends on whether SHIFT key is pressed, flag_view_reduced or flag_view_full is selected)<br>
     *     4 - flag_view_reduced<br>
     *     8 - flag_view_full. This can be useful if you need to run context commands the user may have hidden
     *         using File>Preferences>Display>Context Menu<br>
     * @return {boolean}
     *
     * @example
     * fb.RunContextCommand("Properties");
     */
    RunContextCommand: function (command, flags) { }, // (boolean) [, flags]

    /**
     * Shows context menu for supplied tracks.
     *
     * @param {string} command
     * @param {FbMetadbHandle|FbMetadbHandleList} handle_or_handle_list Handles on which to apply context menu
     * @param {number=} flags Same flags as {@link fb.RunContextCommand}
     * @return {boolean}
     */
    RunContextCommandWithMetadb: function (command, handle_or_handle_list, flags) { }, // (boolean) [, flags]

    /**
     * @param {string} command
     * @return {boolean}
     *
     * @example
     * fb.RunMainMenuCommand("File/Add Location...");
     */
    RunMainMenuCommand: function (command) { }, // (boolean)

    /** @method */
    SavePlaylist: function () { }, // (void)

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3.<br>
     * <br>
     * Related methods: {@link fb.GetDSPPresets}.
     *
     * @param {number} idx
     *
     * @example
     * let str = fb.GetDSPPresets();
     * let arr = JSON.parse(str);
     * let idx; // find the required DSP from `arr` and assign it to `idx`
     * fb.SetDSPPreset(idx);
     * @worker
     * @mainthread
     */
    SetDSPPreset: function (idx) { }, // (void)

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3.<br>
     * <br>
     * Related methods: {@link fb.GetOutputDevices}.
     *
     * @param {string} output
     * @param {string} device
     *
     * @example
     * // To actually change device, you'll need the device_id and output_id
     * // and use them with fb.SetOutputDevice.
     * let str = fb.GetOutputDevices();
     * let arr = JSON.parse(str);
     * // Assuming same list from above, switch output to the last device.
     * fb.SetOutputDevice(arr[4].output_id, arr[4].device_id);
     * @worker
     * @mainthread
     */
    SetOutputDevice: function (output, device) { }, // (void)

    /**
     * Shows foobar2000 console window or close it (if show=false).
     *
     * @param {boolean=} [show=true]
     * @worker
     * @mainthread
     */
    ShowConsole: function (show) { }, // (void)

    /**
     * Opens the Library>Search window populated with the query you set.
     *
     * @param {string} query
     * @worker
     * @mainthread
     */
    ShowLibrarySearchUI: function (query) { }, // (void)

    /**
     * Opens the image viewer built in to `foobar2000`. Pass an image file path, or an {@link FbMetadbHandle}; with a handle, {@link module:Flags.AlbumArtId AlbumArtId} defaults to `AlbumArtId.front`. Album art is resolved by foobar2000 and may be embedded or external.
     * @param {(string|FbMetadbHandle)} image_path_or_handle Image file path or track handle.
     * @param {AlbumArtId=} [art_id=AlbumArtId.front] Album art type. Used only when the first argument is an {@link FbMetadbHandle}.
     * @worker
     * @mainthread
     */
    ShowPictureViewer(image_path_or_handle, art_id) { }, // (void) [, art_id]

    /**
     * Opens the "Playlist Search" window
     * @worker
     * @mainthread
     */
    ShowPlaylistSearchUI: function () { }, // (void)

    /**
     * @param {string} message
     * @param {string=} [title='JSplitter']
     * @worker
     * @mainthread
     */
    ShowPopupMessage: function (message, title) { }, // (void) [, title]

    /**
     * @method
     * @worker
     * @mainthread
     */
    ShowPreferences: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    Stop: function () { }, // (void)

    /**
     * Performance note: if you use the same query frequently,
     * try caching FbTitleFormat object (by storing it somewhere),
     * instead of creating it every time.
     *
     * @param {string} expression
     * @return {FbTitleFormat}
     * @worker
     */
    TitleFormat: function (expression) { }, // (FbTitleFormat)

    /**
     * Unregisters a main menu item.<br>
     * <br>
     * Related methods: {@link fb.RegisterMainMenuCommand}
     *
     * @param {number} id
     * @worker
     * @mainthread
     */
    UnregisterMainMenuCommand: function (id, name, description) { },

    /**
     * @method
     * @worker
     * @mainthread
     */
    VolumeDown: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    VolumeMute: function () { }, // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    VolumeUp: function () { }, // (void)
};

/**
 * DrawMode-aware graphics facade. With <code>window.DrawMode == 0</code> its resource factories use GDI+; with <code>window.DrawMode == 1</code> they create the corresponding Direct2D resources instead. A Worker uses the DrawMode captured when that Worker is created, so the same <code>gdi.*</code> calls match the parent panel graphics backend.
 *
 * @namespace
 * @worker
 */
let gdi = {

    /**
     * Creates a drawing brush of the specified type. The meaning of the brush's input parameters depends on its type.<br>
     * For type == {@link module:Flags.BrushType BrushType.Solid}:<br>
     * - param1: brush colour in ARGB<br>
     * For type == {@link module:Flags.BrushType BrushType.LinearGradient}:<br>
     * - param1: start point coords of linear gradient in form of Array(2) (for ex.: [0, 0])<br>
     * - param2: end point coords of linear gradient in form of Array(2) (for ex.: [100, 0])<br>
     * - param3: gradient stops specified as an array with alternating position and color values for each stop (for ex.: [0.0, 0xFF000000, 0.5, 0xFFFF0000, 1.0, 0xFFFFFFFF])<br>
     * - param4: wrap mode responsible for how the gradient is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}. Default is {@link module:Flags.BrushWrapMode BrushWrapMode.Tile}<br>
     * For type == {@link module:Flags.BrushType BrushType.RadialGradient}:<br>
     * - param1: center point coords of radial gradient in form of Array(2) (for ex.: [50, 50])<br>
     * - param2: radius values for X and Y axes in form of Array(2) (for ex.: [50, 50])<br>
     * - param3: gradient stops specified as an array with alternating position and color values for each stop (for ex.: [0.0, 0xFF000000, 0.5, 0xFFFF0000, 1.0, 0xFFFFFFFF])<br>
     * - param4: wrap mode responsible for how the gradient is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}. Default is {@link module:Flags.BrushWrapMode BrushWrapMode.Tile}<br>
     * For type == {@link module:Flags.BrushType BrushType.Bitmap}:<br>
     * - param1: GdiBitmap object used for drawing by brush<br>
     * - param2: wrap mode responsible for how the image is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}
     * 
     * @param {BrushType} type
     * @param {*} param1
     * @param {*=} [param2=undefined]
     * @param {*=} [param3=undefined]
     * @param {*=} [param4=undefined]
     * @return {GdiBrush} Brush object used in Draw/Fill methods
     * 
     * @sourceFile ../../component/samples/basic/Brushes.js
     * @worker
     */
    Brush: function (type, param1, param2, param3, param4) { }, // (GdiBrush)

    /**
     * @param {number} w
     * @param {number} h
     * @return {GdiBitmap}
     * @worker
     */
    CreateImage: function (w, h) { }, // (GdiBitmap)

    /**
     * Create GdiBitmap from raw pixel data in memory.
     *
     * @param {Uint8Array} pixelData Raw pixel bytes
     * @param {number} width Image width in pixels
     * @param {number} height Image height in pixels
     * @param {string} [format="bgra32"] Pixel format string (default: "bgra32")
     * Supported formats:<br>
     *   "bgra32"  32bpp BGRA<br>
     *   "rgba32"  32bpp RGBA<br>
     *   "bgr24"   24bpp BGR<br>
     *   "rgb24"   24bpp RGB<br>
     * @returns {GdiBitmap} null if was an error (for example pixelData array length is not suitable for the specified parameters)
     * 
     * @sourceFile ../../component/samples/basic/CreateImageFromPixelData.js
     * @worker
     */
    CreateImageFromPixelData: function(pixelData, width, height, format = "bgra32") { }, // (GdiBitmap)

    /**
     * Performance note: avoid using inside `on_paint`.<br>
     * Performance note II: try caching and reusing `GdiFont` objects,
     * since the maximum amount of such objects is hard-limited by Windows.
     * `GdiFont` creation will fail after reaching this limit.
     *
     * @param {string} name
     * @param {number} size_px See {@link module:Helpers.Point2Pixel Point2Pixel} function for conversions
     * @param {number=} [style=0] See {@link module:Flags.FontStyle FontStyle} flags
     * @return {?GdiFont} null, if font is not present.
     * @worker
     */
    Font: function (name, size_px, style) { }, // (GdiFont) [, style]

    /**
     * Load image from file.<br>
     * <br>
     * Performance note: consider using {@link gdi.LoadImageAsync} or {@link gdi.LoadImageAsyncV2} if there are a lot of images to load
     * or if the image is big.
     *
     * @param {string} path
     * @return {?GdiBitmap} null, if image failed to load.
     *
     * @example
     * let img = gdi.Image('e:\\images folder\\my_image.png');
     * @worker
     */
    Image: function (path) { }, // (GdiBitmap)

    /**
     * Load image from file asynchronously.
     *
     * @param {number} window_id unused
     * @param {string} path
     * @return {number} a unique id, which is used in {@link module:Callbacks.on_load_image_done on_load_image_done}.
     *
     * @sourceFile ../../component/samples/basic/LoadImageAsync.js
     * @worker
     */
    LoadImageAsync: function (window_id, path) { }, // (uint)

    /**
     * Load image from file asynchronously.
     * Returns a `Promise` object, which will be resolved when image loading is done.
     *
     * @param {number} window_id unused
     * @param {string} path
     * @return {Promise.<?GdiBitmap>}
     *
     * @sourceFile ../../component/samples/basic/LoadImageAsyncV2.js
     * @worker
     */
    LoadImageAsyncV2: function (window_id, path) { },

    /**
     * Loads rasterized image from SVG file or XML string
     *
     * @param {string} path_or_xml string containing SVG file path or raw XML
     * @param {number=} [max_width=0] If specified rasterizes with width = max_width and height according to the proportions, otherwise uses "width" and "height" attributes in SVG header if exist
     * @return {?GdiBitmap} Rasterized bitmap, null in case of error
     * 
     * @example
     * const svg_file = fb.ComponentPath + 'samples\\svg\\android.svg';
     * 
     * const original = gdi.LoadSVG(svg_file);
     * const large = gdi.LoadSVG(svg_file, 512); // set optional max_width
     * 
     * function on_paint(gr) {
     *     gr.DrawImage(original, 0, 0, original.Width, original.Height, 0, 0, original.Width, original.Height);
     *     gr.DrawImage(large, original.Width, 0, large.Width, large.Height, 0, 0, large.Width, large.Height);
     * }
     * @worker
     */
    LoadSVG: function (path_or_xml, max_width) { }
};

/**
 * Functions for managing foobar2000 playlists.
 *
 * @namespace
 * @worker
 */
let plman = {

    /**
     * -1 if there is no active playlist.
     *
     * @type {number}
     *
     * @example
     * console.log(plman.ActivePlaylist);
     *
     * @example
     * plman.ActivePlaylist = 1; // Switches to 2nd playlist.
     * @worker
     * @mainthread
     */
    ActivePlaylist: undefined, // (int) (read, write)

    /**
     * See {@link module:Flags.PlaybackOrder PlaybackOrder} enum
     * 0 - Default<br>
     * 1 - Repeat (Playlist)<br>
     * 2 - Repeat (Track)<br>
     * 3 - Random<br>
     * 4 - Shuffle (tracks)<br>
     * 5 - Shuffle (albums)<br>
     * 6 - Shuffle (folders)
     *
     * @type {number}
     * @worker
     * @mainthread
     */
    PlaybackOrder: undefined, // (uint) (read, write)


    /**
     * -1 if there is no playing playlist.
     *
     * @type {number}
     *
     * @example
     * console.log(plman.PlayingPlaylist);
     * @worker
     * @mainthread
     */
    PlayingPlaylist: undefined, // (int) (read, write)

    /**
     * @type {number}
     * @readonly
     * @worker
     * @mainthread
     */
    PlaylistCount: undefined, // (uint) (read)

    /**
     * A Recycle Bin for playlists.
     *
     * @type {FbPlaylistRecycler}
     * @readonly
     * @worker
     */
    PlaylistRecycler: undefined, // (FbPlaylistRecycler) (read)

    /**
     * This operation is asynchronous and may take some time to complete if it's a large array.
     *
     * @param {number} playlistIndex
     * @param {Array<string>} paths An array of files/URLs
     * @param {boolean=} [select=false]
     *        If true, the active playlist will be set to the playlistIndex, the items will
     *        be selected and focus will be set to the first new item.
     *
     * @example
     * plman.AddLocations(plman.ActivePlaylist, ["e:\\1.mp3"]);
     * // This operation is asynchronous, so any code in your script directly
     * // after this line will run immediately without waiting for the job to finish.
     * @worker
     * @mainthread
     */
    AddLocations: function (playlistIndex, paths, select) { }, // (void) [, select]

    /**
     * @param {number} playlistIndex
     *
     * @example
     * plman.ClearPlaylist(plman.PlayingPlaylist);
     * @worker
     * @mainthread
     */
    ClearPlaylist: function (playlistIndex) { }, // (void)

    /**
     * @param {number} playlistIndex
     *
     * @example
     * plman.ClearPlaylistSelection(plman.ActivePlaylist);
     * @worker
     * @mainthread
     */
    ClearPlaylistSelection: function (playlistIndex) { }, // (void)

    /**
     * @param {number} playlistIndex
     * @param {string} name Name for the new autoplaylist.
     * @param {string} query Title formatting pattern for forming the playlist content.
     * @param {string=} [sort=''] Title formatting pattern for sorting.
     * @param {number=} [flags=0] 1 - when set, will keep the autoplaylist sorted and prevent user from reordering it.
     * @return {number} Index of the created playlist.
     * @worker
     * @mainthread
     */
    CreateAutoPlaylist: function (playlistIndex, name, query, sort, flags) { }, // (uint) [, sort][, flags]

    /**
     * @param {number} playlistIndex
     * @param {string} name
     * @return {number} Index of the created playlist.
     *
     * @example
     * // Creates a new playlist named "New playlist", which is put at the beginning of the current playlists.
     * plman.CreatePlaylist(0, '');
     *
     * @example
     * // Create a new playlist named "my favourites", which is put at the end.
     * plman.CreatePlaylist(plman.PlaylistCount, 'my favourites');
     * @worker
     * @mainthread
     */
    CreatePlaylist: function (playlistIndex, name) { }, // (uint)

    /**
     * Note: the duplicated playlist gets inserted directly after the source playlistIndex.<br>
     * It only duplicates playlist content, not the properties of the playlist (e.g. Autoplaylist).
     *
     * @param {number} playlistIndex
     * @param {?string=} [name] A name for the new playlist. If the name is "" or undefined, the name of the source playlist will be used.
     * @return {number} Index of the created playlist.
     * @worker
     * @mainthread
     */
    DuplicatePlaylist: function (playlistIndex, name) { }, // (uint)

    /**
     * Signals playlist viewers to display the track (e.g. by scrolling to it's position).
     *
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @worker
     * @mainthread
     */
    EnsurePlaylistItemVisible: function (playlistIndex, playlistItemIndex) { }, // (void)

    /**
     * Starts playback by executing default doubleclick/enter action unless overridden by a lock to do something else.
     *
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {boolean} -1 on failure.
     * @worker
     * @mainthread
     */
    ExecutePlaylistDefaultAction: function (playlistIndex, playlistItemIndex) { }, // (boolean)

    /**
     * Returns playlist index of the named playlist or creates a new one, if not found.<br>
     * If a new playlist is created, the playlist index of that will be returned.
     *
     * @param {string} name
     * @param {boolean} unlocked If true, locked playlists are ignored when looking for existing playlists.
     *                           If false, the playlistIndex of any playlist with the matching name will be returned.
     * @return {number} Index of the found or created playlist.
     * @worker
     * @mainthread
     */
    FindOrCreatePlaylist: function (name, unlocked) { }, // (uint)

    /**
     * @param {string} name Case insensitive.
     * @return {number} Index of the found playlist on success, -1 on failure.
     * @worker
     * @mainthread
     */
    FindPlaylist: function (name) { }, // (int)

    /**
    * @param {number} playlistIndex
    * @return {string}
    *
    * @example
    * console.log(plman.GetGUID(plman.ActivePlaylist));
     * @worker
     * @mainthread
    */
    GetGUID: function (playlistIndex) { }, // (string)

    /**
     * @param {string} guid String representing GUID.
     * @return {number} Index of the found playlist on success, -1 on failure.
     * @worker
     * @mainthread
     */
    FindByGUID: function (guid) { }, // (int)

    /**
     * Retrieves playlist position of currently playing item.<br>
     * On failure, the property {@link FbPlayingItemLocation#IsValid FbPlayingItemLocation.IsValid} will be set to false.
     *
     * @return {FbPlayingItemLocation}
     * @worker
     * @mainthread
     */
    GetPlayingItemLocation: function () { }, // (FbPlayingItemLocation)

    /**
     * @param {number} playlistIndex
     * @return {number} Returns -1 if nothing is selected
     *
     * @example
     * let focus_item_index = plman.GetPlaylistFocusItemIndex(plman.ActivePlaylist); // 0 would be the first item
     * @worker
     * @mainthread
     */
    GetPlaylistFocusItemIndex: function (playlistIndex) { }, // (int)

    /**
     * @param {number} playlistIndex
     * @return {FbMetadbHandleList}
     *
     * @example
     * let handle_list = plman.GetPlaylistItems(plman.PlayingPlaylist);
     * @worker
     * @mainthread
     */
    GetPlaylistItems: function (playlistIndex) { }, // (FbMetadbHandleList)

    /**
     * Returns the list of blocked actions
     * 
     * @param {number} playlistIndex
     * @return {Array<string>} May contain the following:<br>
     *   - 'AddItems'<br>
     *   - 'RemoveItems'<br>
     *   - 'ReorderItems'<br>
     *   - 'ReplaceItems'<br>
     *   - 'RenamePlaylist'<br>
     *   - 'RemovePlaylist'<br>
     *   - 'ExecuteDefaultAction'
     * @worker
     * @mainthread
     */
    GetPlaylistLockedActions: function (playlistIndex) { },

    /**
     * @param {number} playlistIndex
     * @return {?string} name of lock owner if there is a lock, null otherwise
     * @worker
     * @mainthread
     */
    GetPlaylistLockName: function (playlistIndex) { },

    /**
     * @param {number} playlistIndex
     * @return {string}
     *
     * @example
     * console.log(plman.GetPlaylistName(plman.ActivePlaylist));
     * @worker
     * @mainthread
     */
    GetPlaylistName: function (playlistIndex) { }, // (string)

    /**
     * @param {number} playlistIndex
     * @return {Array<number>}
     *
     * @example
     * let selected_indexes = plman.GetPlaylistSelectedIndexes(plman.ActivePlaylist);
     * @worker
     * @mainthread
     */
    GetPlaylistSelectedIndexes: function (playlistIndex) { }, // (FbMetadbHandleList)

    /**
     * @param {number} playlistIndex
     * @return {FbMetadbHandleList}
     *
     * @example
     * let selected_items = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     * @worker
     * @mainthread
     */
    GetPlaylistSelectedItems: function (playlistIndex) { }, // (FbMetadbHandleList)

    /**
     * @param {number} playlistIndex
     * @param {number} base Position in playlist
     * @param {FbMetadbHandleList} handle_list Items to insert
     * @param {boolean=} [select=false] If true then inserted items will be selected
     *
     * @example <caption>Add all library tracks to the beginning of playlist.</caption>
     * let ap = plman.ActivePlaylist;
     * plman.InsertPlaylistItems(ap, 0, fb.GetLibraryItems());
     *
     * @example <caption>Add all library tracks to end of playlist.</caption>
     * let ap = plman.ActivePlaylist;
     * plman.InsertPlaylistItems(ap, plman.PlaylistItemCount(ap), fb.GetLibraryItems());
     * @worker
     * @mainthread
     */
    InsertPlaylistItems: function (playlistIndex, base, handle_list, select) { }, // (void) [, select]

    /**
     * Same as {@link plman.InsertPlaylistItems} except any duplicates contained in handle_list are removed.
     *
     * @param {number} playlistIndex
     * @param {number} base Position in playlist
     * @param {FbMetadbHandleList} handle_list Items to insert
     * @param {boolean=} [select=false] If true then inserted items will be selected
     * @worker
     * @mainthread
     */
    InsertPlaylistItemsFilter: function (playlistIndex, base, handle_list, select) { }, // (void) select = false

    /**
     * @param {number} playlistIndex
     * @worker
     * @mainthread
     */
    InvertSelection: function (playlistIndex) { },
    
    /**
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsAutoPlaylist: function (playlistIndex) { }, // (boolean)

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsPlaylistItemSelected: function (playlistIndex, playlistItemIndex) { }, // (boolean)

    /**
     * Note: returns true, if the playlist is an autoplaylist. To determine if a playlist is not an autoplaylist,
     * but locked with something like `foo_utils` or `foo_playlist_attributes`, use with conjunction of {@link plman.IsAutoPlaylist}.
     * <br>
     * Deprecated: use {@link plman.GetPlaylistLockedActions}.
     *
     * @deprecated
     * 
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsPlaylistLocked: function (playlistIndex) { }, // (boolean)

    /**
     * Returns whether a redo restore point is available for specified playlist.
     * <br>
     * Related methods: {@link plman.IsUndoAvailable}, {@link plman.Redo}, {@link plman.Undo}, {@link plman.UndoBackup}
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsRedoAvailable: function (playlistIndex) { }, // (void)

    /**
     * Returns whether an undo restore point is available for specified playlist.
     * <br>
     * Related methods: {@link plman.IsRedoAvailable}, {@link plman.Redo}, {@link plman.Undo}, {@link plman.UndoBackup}
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    IsUndoAvailable: function (playlistIndex) { }, // (void)

    /**
     * @param {number} from
     * @param {number} to
     * @return {boolean}
     * @worker
     * @mainthread
     */
    MovePlaylist: function (from, to) { }, // (boolean)

    /**
     * @param {number} playlistIndex
     * @param {number} delta
     * @return {boolean}
     *
     * @example
     * // Moves selected items to end of playlist.
     * plman.MovePlaylistSelection(plman.ActivePlaylist, plman.PlaylistItemCount(plman.ActivePlaylist));
     * @worker
     * @mainthread
     */
    MovePlaylistSelection: function (playlistIndex, delta) { }, // (boolean)

    /**
     * Unlike {@link plman.MovePlaylistSelection}, this has full support for non-contiguous selections and all you have to do is supply the new position index.
     * 
     * @param {number} playlistIndex
     * @param {number} new_pos
     * @worker
     * @mainthread
     */
    MovePlaylistSelectionV2: function (playlistIndex, new_pos) { }, 

    /**
     * @param {number} playlistIndex
     * @return {number}
     *
     * @example
     * console.log(plman.PlaylistItemCount(plman.PlayingPlaylist)); // 12
     * @worker
     * @mainthread
     */
    PlaylistItemCount: function (playlistIndex) { }, // (uint) (read)

    /**
     * Reverts specified playlist to the next redo restore point and generates an undo restore point.<br>
     * Note: revert operation may be not applied if the corresponding action is locked.
     * Use {@link plman.GetPlaylistLockedActions} to check if there are any locks present.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable}, {@link plman.IsUndoAvailable}, {@link plman.Undo}, {@link plman.UndoBackup}
     *
     * @param {number} playlistIndex
     * @worker
     * @mainthread
     */
    Redo: function (playlistIndex) { }, // (void)

    /**
     * Removes the specified playlist.<br>
     * Note: if removing the active playlist, no playlist will be active after using this. You'll
     * need to set it manually or use {@link plman.RemovePlaylistSwitch} instead.
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    RemovePlaylist: function (playlistIndex) { }, // (boolean)

    /**
     * @param {number} playlistIndex
     * @param {boolean=} [crop=false] If true, then removes items that are NOT selected.
     *
     * @example <Remove selected items from playlist>
     * plman.RemovePlaylistSelection(plman.ActivePlaylist);
     *
     * @example <Remove items that are NOT selected>
     * plman.RemovePlaylistSelection(plman.ActivePlaylist, true);
     * @worker
     * @mainthread
     */
    RemovePlaylistSelection: function (playlistIndex, crop) { }, // (void) [, crop]

    /**
     * Removes the specified playlist.<br>
     * This automatically sets another playlist as active if removing the active playlist.
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @worker
     * @mainthread
     */
    RemovePlaylistSwitch: function (playlistIndex) { }, // (boolean)

    /**
     * @param {number} playlistIndex
     * @param {string} name
     * @return {boolean}
     * @worker
     * @mainthread
     */
    RenamePlaylist: function (playlistIndex, name) { }, // (boolean)

    /**
     * Reorders all items in the specified playlist according to the supplied permutation.<br>
     * The <b>order</b> array must contain exactly one entry for each playlist item. Each value specifies the old item index that should appear at the corresponding new position.<br>
     * The array must:<br>
     * - have the same length as the playlist item count<br>
     * - contain only valid item indices<br>
     * - contain each item index exactly once<br>

     * @param {number} playlistIndex zero-based playlist index
     * @param {Array<number>} order permutation describing the new playlist item order
     * @returns {boolean} <b>true</b> if the playlist was reordered successfully
     * @throws {Error} If playlistIndex is invalid or order is not a valid permutation
     * 
     * @example
     * // Changes the order from [A, B, C] to [C, A, B]
     * const success = ReorderPlaylistItems(0, [2, 0, 1])
     * @worker
     * @mainthread
     */
    ReorderPlaylistItems: function(playlistIndex, order) { }, // (boolean)

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @param {FbMetadbHandle|FbMetadbHandleList} handle_or_handles
     * @worker
     * @mainthread
     */
    ReplacePlaylistItem: function (playlistIndex, playlistItemIndex, handle_or_handles) { },

    /**
     * This selects playlist items in a similar manner to the foobar2000 native playlist search.
     * 
     * @param {number} playlistIndex
     * @param {string} query
     * @return {Array<number>} Array of selected indexes
     * @worker
     * @mainthread
     */
    SelectQueryItems: function (playlistIndex, query) { }, 

    /**
     * Workaround so you can use the Edit menu or run {@link fb.RunMainMenuCommand}("Edit/Something...")
     * when your panel has focus and a dedicated playlist viewer doesn't.
     *
     * @example
     * plman.SetActivePlaylistContext(); // once on startup
     *
     * function on_focus(is_focused) {
     *    if (is_focused) {
     *        plman.SetActivePlaylistContext(); // When the panel gets focus but not on every click
     *    }
     * }
     * @worker
     * @mainthread
     */
    SetActivePlaylistContext: function () { }, // (void)

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     *
     * @example
     * plman.SetPlaylistFocusItem(plman.ActivePlaylist, 0);
     * @worker
     * @mainthread
     */
    SetPlaylistFocusItem: function (playlistIndex, playlistItemIndex) { }, // (void)

    /**
     * @param {number} playlistIndex
     * @param {FbMetadbHandle} handle
     *
     * @example
     * let ap = plman.ActivePlaylist;
     * let handle = plman.GetPlaylistItems(ap)[1]; // 2nd item in playlist
     * plman.SetPlaylistFocusItemByHandle(ap, handle);
     * @worker
     * @mainthread
     */
    SetPlaylistFocusItemByHandle: function (playlistIndex, handle) { }, // (void)

    /**
     * Blocks requested actions.<br>
     * Note: the lock can be changed only if there is no lock or if it's owned by `foo_uie_jsplitter`.
     * The owner of the lock can be checked via {@link plman.GetPlaylistLockName}.
     * 
     * @param {number} playlistIndex
     * @param {Array<string>} lockedActions May contain the following:<br>
     *   - 'AddItems'<br>
     *   - 'RemoveItems'<br>
     *   - 'ReorderItems'<br>
     *   - 'ReplaceItems'<br>
     *   - 'RenamePlaylist'<br>
     *   - 'RemovePlaylist'<br>
     *   - 'ExecuteDefaultAction'
     * @worker
     * @mainthread
    */
    SetPlaylistLockedActions: function (playlistIndex, lockedActions) { },

    /**
     * @param {number} playlistIndex
     * @param {Array<number>} affectedItems An array of item indexes.
     * @param {boolean} state
     *
     * @example
     * // Selects first, third and fifth tracks in playlist. This does not affect other selected items.
     * plman.SetPlaylistSelection(plman.ActivePlaylist, [0, 2, 4], true);
     * @worker
     * @mainthread
     */
    SetPlaylistSelection: function (playlistIndex, affectedItems, state) { }, // (void)

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @param {boolean} state
     *
     * @example
     * // Deselects first playlist item. Only works when it is already selected!
     * plman.SetPlaylistSelectionSingle(plman.ActivePlaylist, 0, false);
     *
     * @example
     * let ap = plman.ActivePlaylist;
     * // Selects last item in playlist. This does not affect other selected items.
     * plman.SetPlaylistSelectionSingle(ap, plman.PlaylistItemCount(ap) - 1, true);
     * @worker
     * @mainthread
     */
    SetPlaylistSelectionSingle: function (playlistIndex, playlistItemIndex, state) { }, // (void)

    /**
     * Shows popup window letting you edit certain autoplaylist properties.<br>
     * Before using, check if your playlist is an autoplaylist by using {@link plman.IsAutoPlaylist};
     *
     * @param {number} playlistIndex
     * @return {boolean}
     *
     * @example
     * fb.ShowAutoPlaylistUI(plman.ActivePlaylist);
     */
    ShowAutoPlaylistUI: function (playlistIndex) { }, // (boolean)

    /**
     * Shows popup window letting you set various locks on playlist with specified index
     *
     * @param {number} playlistIndex
     * @param {number} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     *
     * @example
     * fb.ShowPlaylistLockUI(plman.ActivePlaylist);
     */
    ShowPlaylistLockUI: function (playlistIndex, window_id) { },

    /**
     * @param {number} playlistIndex Index of playlist to alter.
     * @param {string} pattern Title formatting pattern to sort by. Set to "" to randomise the order of items.
     * @param {boolean=} [selected_items_only=false]
     * @return {boolean} true on success, false on failure (playlist locked etc).
     * @worker
     * @mainthread
     */
    SortByFormat: function (playlistIndex, pattern, selected_items_only) { }, // (boolean) [, selected_items_only]

    /**
     * @param {number} playlistIndex Index of playlist to alter.
     * @param {string} pattern Title formatting pattern to sort by.
     * @param {number=} [direction=1]
     *     1 - ascending<br>
     *     -1 - descending<br>
     * @return {boolean}
     * @worker
     * @mainthread
     */
    SortByFormatV2: function (playlistIndex, pattern, direction) { }, // (boolean) [, direction]

    /**
     * @param {number=} [direction=1]
     *     1 - ascending<br>
     *     -1 - descending<br>
     * @worker
     * @mainthread
     */
    SortPlaylistsByName: function (direction) { }, //(void)

    /**
     * Reverts specified playlist to the last undo restore point and generates a redo restore point.<br>
     * Note: revert operation may be not applied if the corresponding action is locked.
     * Use {@link plman.GetPlaylistLockedActions} to check if there are any locks present.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable}, {@link plman.IsUndoAvailable}, {@link plman.Redo}, {@link plman.UndoBackup}
     *
     * @param {number} playlistIndex
     * @worker
     * @mainthread
     */
    Undo: function (playlistIndex) { }, // (void)

    /**
     * Creates an undo restore point for the specified playlist. This will enable `Edit`>`Undo` menu item after calling other {@link plman} methods that change playlist content.<br>
     * Note: this method should be called before performing modification to the playlist.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable}, {@link plman.IsUndoAvailable}, {@link plman.Redo}, {@link plman.Undo}
     * 
     * @param {number} playlistIndex
     * @worker
     * @mainthread
     */
    UndoBackup: function (playlistIndex) { }, // (void)

    /**
     * @param {FbMetadbHandle} handle
     * @worker
     * @mainthread
     */
    AddItemToPlaybackQueue: function (handle) { }, // (void)

    /**
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @worker
     * @mainthread
     */
    AddPlaylistItemToPlaybackQueue: function (playlistIndex, playlistItemIndex) { }, // (void)

    /**
     * @param {FbMetadbHandle} handle
     * @param {number} playlistIndex
     * @param {number} playlistItemIndex
     * @return {number} Returns position in queue on success, -1 if track is not in queue.
     * @worker
     * @mainthread
     */
    FindPlaybackQueueItemIndex: function (handle, playlistIndex, playlistItemIndex) { }, // (int)

    /**
     * @method
     * @worker
     * @mainthread
     */
    FlushPlaybackQueue: function () { }, // (void)

    /**
     * @return {Array<FbPlaybackQueueItem>}
     *
     * @example
     * let contents = plman.GetPlaybackQueueContents();
     * if (contents.length) {
     *     // access properties of first item
     *     console.log(contents[0].PlaylistIndex, contents[0].PlaylistItemIndex);
     * }
     * @worker
     * @mainthread
     */
    GetPlaybackQueueContents: function () { }, // (Array)

    /**
     * @return {FbMetadbHandleList}
     *
     * @example
     * let handles = plman.GetPlaybackQueueHandles();
     * if (handles.Count > 0) {
     *    // use "Count" to determine if Playback Queue is active.
     * }
     * @worker
     * @mainthread
     */
    GetPlaybackQueueHandles: function () { }, // ((FbMetadbHandleList))

    /**
     * @param {number} index
     * @worker
     * @mainthread
     */
    RemoveItemFromPlaybackQueue: function (index) { }, // (void)

    /**
     * @param {Array<number>} affectedItems Array like [1, 3, 5]
     * @worker
     * @mainthread
     */
    RemoveItemsFromPlaybackQueue: function (affectedItems) { }, // (void)
};

/**
 * Physical-memory information returned in {@link utils.SystemInfo}.
 *
 * @typedef {Object} SystemMemoryInfo
 * @property {number} Total
 *    Total physical memory visible to Windows, in bytes. This can be lower than the installed RAM amount because hardware-reserved memory is not included.
 * @property {number} Available
 *    Physical memory currently available to the system, in bytes. This is Windows' available-memory value and includes reclaimable standby/cache memory; it is more useful for capacity decisions than strictly free pages.
 * @property {number} Process
 *    Private working set of the foobar2000 process, in bytes. This corresponds closely to the <b>Memory (active private working set)</b> value shown for foobar2000 in Windows Task Manager.
 */

/**
 * Dedicated/local video-memory information returned in {@link utils.SystemInfo}.
 *
 * The selected adapter is the adapter on which the foobar2000 process currently has the highest local video-memory usage.
 * If the process has no local video-memory usage yet, the adapter with the largest dedicated-memory size is selected instead.
 *
 * @typedef {Object} SystemVideoMemoryInfo
 * @property {string} Adapter
 *    Display name of the selected graphics adapter.
 * @property {number|null} Total
 *    Dedicated video-memory size of the selected adapter, in bytes. On 32-bit builds JSplitter avoids returning a truncated 32-bit value; if a safe 64-bit total cannot be obtained, this field is null.
 * @property {number} ProcessBudget
 *    Current local video-memory budget assigned to the foobar2000 process by Windows, in bytes. The budget is dynamic and is not a fixed hardware limit.
 * @property {number} Process
 *    Current local video-memory usage attributed to the foobar2000 process, in bytes.
 */

/**
 * System-information snapshot returned by {@link utils.SystemInfo}.
 *
 * @typedef {Object} SystemInfo
 * @property {string} OS
 *    Human-readable Windows product name including the edition when available, for example <code>Windows 11 Home</code> or <code>Windows 11 Pro</code>.
 * @property {number} Build
 *    Windows NT build number.
 * @property {boolean} IsOS64Bit
 *    True when the operating system architecture is 64-bit. This describes Windows itself, not the foobar2000 process architecture.
 * @property {SystemMemoryInfo} RAM
 *    Physical-memory and foobar2000 private-working-set information.
 * @property {SystemVideoMemoryInfo|null} VRAM
 *    Dedicated/local video-memory information for the selected graphics adapter, or null when the required video-memory query interface is unavailable.
 */

/**
 * Various utility functions.
 *
 * @namespace
 * @worker
 */
let utils = {

    /**
     * A string corresponding to the version.
     *
     * Component uses semantic versioning (see {@link https://semver.org}).
     *
     * @type {string}
     *
     * @example
     * function is_compatible(requiredVersionStr) {
     *     let requiredVersion = requiredVersionStr.split('.');
     *     let currentVersion = utils.Version.split('.'); // e.g. 0.1.0-alpha.2
     *     if (currentVersion.length > 3) {
     *         currentVersion.length = 3; // We need only numbers
     *     }
     *
     *     for(let i = 0; i< currentVersion.length; ++i) {
     *       if (currentVersion[i] != requiredVersion[i]) {
     *           return currentVersion[i] > requiredVersion[i];
     *       }
     *     }
     *
     *     return true;
     * }
     *
     * let requiredVersionStr = '1.0.0';
     * if (!is_compatible(requiredVersionStr)) {
     *     fb.ShowPopupMessage(`This script requires v${requiredVersionStr}. Current component version is v${utils.Version}.`);
     * }
     * @worker
     */
    Version: undefined, // (string) (read)

    /**
     * Allowing scripts to detect whether the high-resolution timer backend is actually active and adapt scheduling/yield strategies accordingly.
     * 
     * The value is derived from the <b>Advanced Preferences → Performance → Use high-resolution timers</b> setting, but reports the effective runtime state, not merely the checkbox: it returns true only when the option is enabled and the current Windows version actually supports high-resolution waitable timers; otherwise it returns false.
     *
     * @type {boolean}
     * @worker
     */
    HighResolutionTimersEnabled: undefined, // (bool) (read)

    /**
     * Indicates whether the current foobar2000 process architecture is 64-bit.
     * This does not describe the operating system architecture; use {@link utils.IsOS64Bit} for that.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    Is64Bit: undefined, // (bool) (read)

    /**
     * Indicates whether the operating system architecture is 64-bit.
     * Unlike {@link utils.Is64Bit}, this value describes Windows itself and remains true when 32-bit foobar2000 runs on 64-bit Windows.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    IsOS64Bit: undefined, // (bool) (read)

    /**
     * Returns a fresh snapshot of operating-system, physical-memory and dedicated/local video-memory information.
     * All memory values are reported in bytes. See {@link SystemInfo} for the returned object properties.
     *
     * @type {SystemInfo}
     * @readonly
     * @worker
     *
     * @example
     * const info = utils.SystemInfo;
     * console.log(`${info.OS} (build ${info.Build})`);
     * console.log(`RAM: ${utils.FormatFileSize(info.RAM.Process)} used by foobar2000`);
     * if (info.VRAM) {
     *     console.log(`${info.VRAM.Adapter}: ${utils.FormatFileSize(info.VRAM.Process)} VRAM used`);
     * }
     */
    SystemInfo: undefined,
    
    /**
     * Checks the availability of foobar2000 component.
     *
     * @param {string} name
     * @param {boolean=} [is_dll=true] If true, method checks filename as well as the internal name.
     * @return {boolean}
     *
     * @example
     * console.log(utils.CheckComponent("foo_playcount", true));
     * @worker
     * @mainthread
     */
    CheckComponent: function (name, is_dll) { }, //(boolean)

    /**
     * Checks whether a font family is available to the current foobar2000 process.
     * This includes system-installed fonts and fonts loaded with {@link utils.LoadFont}.<br>     
     *
     * @param {string} name Font family name. Can be either in English or the localised name in your OS.
     * @return {boolean}
     * @worker
     */
    CheckFont: function (name) { }, // (boolean)

    /**
     * Opens system colour picker dialog window (with some additional controls).
     * <ul>
     * <li><b>HEX</b>: RRGGBB color value
     * <li><b>Alpha</b>: alpha component
     * <li><b>Copy ARGB</b>: button for copying the current color value in 0xAARRGGBB format
     * </ul>
     *
     * @param {number} window_id Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @param {number} default_colour Color in ARGB format
     * @return {number} Chosen color in ARGB format or default_colour if cancelled
     */
    ColourPicker: function (window_id, default_colour) { },

    /**
     * Converts string from UTF-8 to ASCII.
     *
     * @param {string} str
     * @return {string}
     * @worker
     */
    ConvertToAscii: function (str) { },

    /**
     * Copies a file.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} from
     * @param {string} to
     * @param {boolean} [overwrite=true]
     * @return {boolean}
     * @worker
     */
    CopyFile: function (from, to, overwrite) { },

    /**
     * Copies a folder.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} from
     * @param {string} to
     * @param {boolean} [overwrite=true]
     * @param {boolean} [recur=true]
     * @return {boolean}
     * @worker
     */
    CopyFolder: function (from, to, overwrite, recur) { },

    /**
     * Creates a folder.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {boolean}
     * @worker
     */
    CreateFolder: function (path) { }, // (uint)

    /**
     * Calculates CRC32 value for string
     *
     * @param {string} str input string
     * @return {number} CRC32 value for input string. If string is empty returns 0
     * @worker
     */
    CRC32: function (str) { }, // (uint)

    /**
     * Calculates CRC32 value for file content
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path input file path
     * @return {number} CRC32 value for input file content. If it was an error while reading file or file is empty returns 0
     * @worker
     */
    CRC32FromFile: function (path) { }, // (uint)

    /**
     * Detect the codepage of the file.<br>
     * Note: detection algorithm is probability based (unless there is a UTF BOM),
     * i.e. even though the returned codepage is the most likely one, 
     * there's no 100% guarantee it's the correct one.
     * 
     * Performance note: detection algorithm is quite slow, so results should be cached as much as possible.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} path Path to file
     * @return {number} Codepage number on success, 0 if codepage detection failed
     * @worker
     */

    DetectCharset: function (path) { },

    /**
     * Downloads file from specified URL to save file path.
     * Result of asyncronous operation can be found in callback {@link module:Callbacks.on_download_file_done on_download_file_done}
     * 
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} url File URL
     * @param {string} path Save file path
     * 
     * @example
     * utils.DownloadFileAsync("https://lastfm.freetls.fastly.net/i/u/770x0/0be145cbf80930684d41ad524fe53768.jpg", "z:\\blah.jpg");
     * 
     * function on_download_file_done(path, success, error_text) {
	 *     console.log(path, success, error_text);
     * }
     * 
     * @worker
     */
    DownloadFileAsync: function (url, path) { },

    /**
     * Does HTTP request of specified type to URL
     * with optional user headers and post data
     *
     * @param {number} type Use 0 for GET, 1 for POST.
     * @param {number} url
     * @param {string=} [user_agent_or_headers=""] can be a string specifying the user agent, or a stringified JSON object specifying user HTTP request headers (see examples)
     * @param {string=} [post_data=""] This is ignored for GET requests and can be omitted. It is required for POST requests. It could be form data or a stringified JSON object/array.
     * @return {number} a unique task_id which is used as the first argument in the {@link module:Callbacks.on_http_request_done on_http_request_done} callback.<br>
     * When making a POST request, you should set a Content-Type header. Valid values could be application/json or application/x-www-form-urlencoded.
     * 
     * @sourceFile ../../component/samples/complete/js/thumbs.js
     * @sourceFile ../../component/samples/complete/js/list.js
     * 
     * @example
     * let headers = JSON.stringify({
     *   'User-Agent' : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
     *   'Referer' : 'https://www.last.fm',
     * });
     * let url = 'https://www.last.fm/music/Madonna/+images';
     * let task_id = utils.HTTPRequestAsync(0, url, headers);
     * 
     * function on_http_request_done(task_id, success, response_text, status, content_type)
     * {
     *   console.log("status = ", status, "response_text = ", response_text);
     * }
     * 
     * @worker
     */
    HTTPRequestAsync: function (type, url, user_agent_or_headers, post_data) { },

    /**
     * Edit a text file with the default text editor. <br>
     * Default text editor can be changed via `Edit` button on the main tab of {@link window.ShowConfigureV2}.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} path Path to file
     */
    EditTextFile: function (path) { }, // (uint)

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} path Path to file
     * @return {boolean} true, if file exists.
     * @worker
     */
    FileExists: function (path) { },

    /**
     * Opens system file picker dialog window
     *
     * Relative <code>defaultPath</code> values are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string=} [title=undefined] Title of dialog. If empty it will be the title by system default
     * @param {string=} [default_path=undefined] Default file path to choose. If only path without file name is specified it will open specified folder
     * @param {string=} [filter=undefined] Files filter in form (for ex.): "Image files (*.jpg;*.png;*.bmp)|*.jpg;*.png;*.bmp|All files (*.*)|*.*"
     * @param {string=} [mode=0] File dialog mode. 0 - open, 1 - save
     * @param {number} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {string} Chosen file path. If dialog is cancelled returns empty string
     */
    FilePicker: function (title, default_path, filter, mode, window_id) { },

    /**
     * Various utility functions for working with file.<br>
     * <br>
     * Deprecated: use {@link utils.DetectCharset}, {@link utils.FileExists}, {@link utils.GetFileSize},
     * {@link utils.IsDirectory}, {@link utils.IsFile} and {@link utils.SplitFilePath} instead.
     *
     * @deprecated
     * 
     * For modes that access the filesystem, relative paths are resolved as described in {@link utils.ReadTextFile}; <code>split</code> remains purely lexical.
     *
     * @param {string} path
     * @param {string} mode
     *     "chardet" - Detects the codepage of the given file. Returns a corresponding codepage number on success, 0 if codepage detection failed.<br>
     *     "e" - If file path exists, returns true.<br>
     *     "s" - Retrieves file size, in bytes.<br>
     *     "d" - If path is a directory, returns true.<br>
     *     "split" - Returns an array of [directory, filename, filename_extension].
     * @return {*}
     *
     * @example
     * let arr = utils.FileTest("D:\\Somedir\\Somefile.txt", "split");
     * // arr[0] <= "D:\\Somedir\\" (always includes backslash at the end)
     * // arr[1] <= "Somefile"
     * // arr[2] <= ".txt"
     * @worker
     */
    FileTest: function (path, mode) { }, // (VARIANT)

    /**
     * Opens system folder picker dialog window
     *
     * Relative <code>defaultPath</code> values are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string=} [title=undefined] Title of dialog. If empty it will be the title by system default
     * @param {string=} [default_path=undefined] Default folder path to choose
     * @param {number=} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {string} Chosen folder path. If dialog is cancelled returns empty string
     */
    FolderPicker: function (title, default_path, window_id) { },

    /**
     * Opens system font picker dialog window (with pixel size field extension).
     *
     * @param {GdiFont=} [default_font=undefined] (or D2DFont if window.DrawMode=1) If specified, it will be selected in the dialog, otherwise the default system message font will be selected
     * @param {number=} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {?GdiFont} (or D2DFont if window.DrawMode=1) Chosen font or default_font if cancelled (if default_font is undefined returns null)
     *
     * @sourceFile ../../component/samples/basic/FontPicker.js
     */
    FontPicker: function (default_font, window_id) { },

    /**
     * @param {number} seconds
     * @return {string}
     *
     * @example
     * console.log(utils.FormatDuration(plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalDuration())); // 1wk 1d 17:25:30
     * @worker
     */
    FormatDuration: function (seconds) { }, // (string)

    /**
     * @param {number} bytes
     * @return {string}
     *
     * @example
     * console.log(utils.FormatFileSize(plman.GetPlaylistItems(plman.ActivePlaylist).CalcTotalSize())); // 7.9 GB
     * @worker
     */
    FormatFileSize: function (bytes) { }, // (string)

    /**
     * Load art image for the track asynchronously.<br>
     *
     * @param {number} window_id unused
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @param {boolean=} [need_stub=true]
     * @param {boolean=} [only_embed=false]
     * @param {boolean=} [no_load=false]  If true, "image" parameter will be null in {@link module:Callbacks.on_get_album_art_done on_get_album_art_done} callback.
     *
     * @sourceFile ../../component/samples/basic/GetAlbumArtAsync.js
     * @worker
     */
    GetAlbumArtAsync: function (window_id, handle, art_id, need_stub, only_embed, no_load) { },

    /**
     * @typedef {Object} ArtPromiseResult
     * @property {?GdiBitmap} image (or {@link D2DBitmap} if {@link window.DrawMode} == 1). Null on failure
     * @property {string} path path to image file (or track file if image is embedded)
     */

    /**
     * Load art image for the track asynchronously.<br>
     * Returns a `Promise` object, which will be resolved when art loading is done.
     *
     * @param {number} window_id unused
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @param {boolean=} [need_stub=true] If true, will return a stub image from `Preferences`>`Display`>`Stub image path` when there is no art image available.
     * @param {boolean=} [only_embed=false] If true, will only try to load the embedded image.
     * @param {boolean=} [no_load=false] If true, then no art loading will be performed and only path to art will be returned in {@link ArtPromiseResult}.
     * @return {Promise.<ArtPromiseResult>}
     *
     * @sourceFile ../../component/samples/basic/GetAlbumArtAsyncV2.js
     * @worker
     */
    GetAlbumArtAsyncV2: function (window_id, handle, art_id, need_stub, only_embed, no_load) { },

    /**
     * Load embedded art image for the track.<br>
     * <br>
     * Performance note: consider using {@link utils.GetAlbumArtAsync} or {@link utils.GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * @param {string} rawpath Path to track file
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @return {GdiBitmap} (or {@link D2DBitmap} if {@link window.DrawMode} == 1) 
     *
     * @example
     * let img = utils.GetAlbumArtEmbedded(fb.GetNowPlaying().RawPath, 0);
     * @worker
     */
    GetAlbumArtEmbedded: function (rawpath, art_id) { },

    /**
     * Load art image for the track.<br>
     * <br>
     * Performance note: consider using {@link utils.GetAlbumArtAsync} or {@link utils.GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @param {boolean=} [need_stub=true]
     * @return {GdiBitmap} (or {@link D2DBitmap} if {@link window.DrawMode} == 1)
     *
     * @sourceFile ../../component/samples/basic/GetAlbumArtV2.js
     * @worker
     */
    GetAlbumArtV2: function (handle, art_id, need_stub) { },

    /**
     * @return {string} Returns an empty string if clipboard contents are not text.
     * @worker
     * @mainthread
     */
    GetClipboardText: function () { },

    /**
     * Returns string code for display country flag with {@link https://github.com/mozilla/twemoji-colr "Twemoji Mozilla"} font<br>
     * <b>ATTENTION!</b> Country flags are displayed correctly only in Direct2D draw mode ({@link window.DrawMode} == 1); GDI+ does not render "Twemoji Mozilla" color glyphs.
     * @param {string} country_or_code Case is not important. You can supply the code or full name. A few examples (full list see in the EXAMPLE file):<br>
     * "by" "Belarus"<br>
     * "gb" "United Kingdom"<br>
     * "cn" "China"<br>
     * @return {string} Country string code 
     * @sourceFile ../../component/docs/countries.json
     * @worker
     */
    GetCountryFlag: function (country_or_code) { },

    /**
     * Returns information about a logical drive or volume containing the supplied path.<br>
     * The method also works with drive roots returned by {@link utils.GetDrives}.<br>
     * Unready removable/CD drives still return an object with <code>IsReady == false</code> when the drive itself exists.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Drive root or path on the drive
     * @return {?DriveInfo} Drive information, or null if the path cannot be resolved to a drive
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetDriveInfo: function (path) { },

    /**
     * Returns logical drive roots known to Windows, including mapped network drives and removable drives.<br>
     * A returned removable/CD drive may not currently be ready; use {@link utils.GetDriveInfo} to query its state.
     *
     * @return {Array<string>} Drive root paths, for example <code>["C:\\", "D:\\"]</code>
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetDrives: function () { },

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {number} File size, in bytes
     * @worker
     */
    GetFileSize: function (path) { },

    /**
     * Calculates the total size of files contained in a directory and its subdirectories.<br>
     * Directory reparse points are not followed. Entries that cannot be accessed are skipped.<br>
     * This is a synchronous operation and may take time for large directory trees.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Directory path
     * @return {number} Total size in bytes, or 0 if the path is not a directory
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetFolderSize: function (path) { },

    /**
     * Calculates the total size of files contained in a directory and its subdirectories asynchronously.<br>
     * For synchronous calculation, use {@link utils.GetFolderSize utils.GetFolderSize}.<br>
     * Directory reparse points are not followed. Entries that cannot be accessed are skipped.<br>
     * The method returns a task id immediately, and the result is delivered later to {@link module:Callbacks.on_get_folder_size_done on_get_folder_size_done}.<br>
     * Use the returned task id to match the result with the original call.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Directory path
     * @return {number} Task id of the asynchronous operation
     *
     * @throws
     * Throws if called before foobar2000 is fully initialized or if the worker thread could not be started.<br>
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetFolderSizeAsync: function (path) { },

    /**
     * Gets "last modified" attribute for file
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {number} UNIX-time (seconds)
     * @worker
     */
    GetLastModified: function (path) { },

    /**
     * Converts an existing path to its Windows short (8.3) form.<br>
     * Returns an empty string if the path does not exist, the conversion fails, or short-name generation is unavailable for the path.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path File or directory path
     * @return {string} Short path or an empty string on failure
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetShortPath: function (path) { },

    /**
     * Note: returned directories are not guaranteed to exist.
     * 
     * @typedef {Object} JsPackageDirs
     * @property {string} Root Root directory of the package
     * @property {string} Assets Directory inside package folder that contains assets
     * @property {string} Scripts Directory inside package folder that contains scripts
     * @property {string} Storage Persistent and unique directory inside foobar2000 profile folder that can be used to store runtime data (e.g. cache)
     */

    /**
     * Return value of {@link utils.GetPackageInfo}.<br>
     *
     * @typedef {Object} JsPackageInfo
     * @property {string} Version Package version
     * @property {JsPackageDirs} Directories Package directories
     */

    /**
     * Get information about a package with the specified id.<br>
     * 
     * @param {string} package_id Can be obtained by {@link window.ScriptInfo}
     * @return {?JsPackageInfo} null if not found, package information otherwise
     * @worker
     * @mainthread
     */
    GetPackageInfo: function (package_id) { },

    /**
     * Get path to a package directory with the specified id.<br>
     * Throws exception if package is not found. <br>
     * <br>
     * Deprecated: use {@link utils.GetPackageInfo} instead.
     * 
     * @deprecated
     * 
     * @param {string} package_id Can be obtained by {@link window.ScriptInfo}
     * @return {string}
     * @worker
     * @mainthread
     */
    GetPackagePath: function (package_id) { },

    /**
     * @param {number} index {@link https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getsyscolor}
     * @return {number} 0 if failed
     *
     * @example
     * let splitter_colour = utils.GetSysColour(15);
     * @worker
     */
    GetSysColour: function (index) { }, // (uint)

    /**
     * @param {number} index {@link https://docs.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getsyscolor}
     * @return {number} 0 if failed
     * @worker
     */
    GetSystemMetrics: function (index) { }, // (int)

    /**
     * Decodes an audio track asynchronously and returns a fixed-size waveform amplitude envelope.<br>
     * Each element of the returned <code>Float32Array</code> is a linear amplitude value in the range 0.0..1.0 for the corresponding part of the requested time range.<br>
     * Each output point represents one time interval. The interval is divided into up to 8 local windows; for each non-empty window, the peak absolute sample value across all channels is measured, and those local peaks are averaged to produce the output value. This preserves short transients while avoiding the dense appearance produced by taking a single maximum peak over the entire output interval.<br>
     * Values are not normalized to the loudest point of the track, so their amplitudes remain relative to the decoded audio signal.<br>
     * Decoding uses one sequential decoder pass. Decoded PCM data is not exposed to JavaScript.<br>
     * <br>
     * If <code>on_progress</code> is supplied, finalized contiguous ranges of the output envelope are delivered while decoding is still in progress. The callback receives a <code>Float32Array</code> containing the new values and the zero-based output index where that range begins. Progress chunk size and delivery frequency are implementation details and must not be relied on.<br>
     * <b>For waveform UIs that should appear while decoding, this progressive form is the recommended approach.</b> Use one <code>GetWaveformAsync()</code> call for the whole requested range instead of splitting the track into repeated range calls. One decoder remains open for the sequential pass, avoiding repeated open/seek/decode overhead. For visually smooth rendering, store progress chunks immediately but animate a separate visible front toward the loaded front rather than exposing the native chunk boundaries directly.<br>
     * Return <code>false</code> from <code>on_progress</code> to cancel the native decode. This is recommended when a progressive request becomes obsolete, for example after the focused or playing track changes. Cancellation rejects the returned Promise. Any other return value continues decoding.<br>
     * The Promise still resolves with the complete <code>Float32Array</code> when decoding finishes normally, whether or not a progress callback is used.<br>
     * <br>
     * If <code>duration</code> is 0, the requested range extends from <code>start</code> to the end of the track. If the track length cannot be determined, a non-zero duration must be specified.<br>
     * A range that extends past a known track end is clipped. If <code>start</code> is at or beyond the known track end, a zero-filled array is returned.<br>
     * Decoder or input-opening failures reject the returned Promise.
     *
     * @param {FbMetadbHandle} handle Track to decode.
     * @param {number=} [points=2048] Number of output points. Valid range: 1..65536.
     * @param {number=} [start=0] Start position in seconds. Must be finite and non-negative.
     * @param {number=} [duration=0] Duration in seconds. Must be finite and non-negative. 0 means from <code>start</code> to the end of the track.
     * @param {function(Float32Array, number)=} on_progress Optional progress callback. Receives <code>(values, start_index)</code>. Return <code>false</code> to cancel decoding.
     * @return {Promise.<Float32Array>} Promise resolved with exactly <code>points</code> linear amplitude values.
     *
     * @throws
     * Throws synchronously if <code>handle</code> is null, if <code>points</code>, <code>start</code>, or <code>duration</code> is invalid, or if <code>on_progress</code> is not a function, null, or undefined.
     *
     * @example <caption>Decode a complete waveform</caption>
     * const handle = fb.GetNowPlaying();
     * if (handle) {
     *     utils.GetWaveformAsync(handle, 2048)
     *         .then(waveform => {
     *             console.log(`Decoded ${waveform.length} waveform points`);
     *         })
     *         .catch(e => console.log(`GetWaveformAsync failed: ${e}`));
     * }
     *
     * @example <caption>Recommended progressive UI pattern</caption>
     * let requestId = 0;
     * let waveform = null;
     * let loaded = 0;
     * let visible = 0;
     * let producerRate = 0;
     * let lastFrame = 0;
     *
     * const revealTimer = setInterval(() => {
     *     if (!waveform || producerRate <= 0) return;
     *
     *     const now = performance.now();
     *     const dt = lastFrame ? now - lastFrame : 0;
     *     lastFrame = now;
     *
     *     // Smoothly follow what the decoder has really produced. Do not predict
     *     // completion time from track duration and do not draw chunk boundaries directly.
     *     visible = Math.min(loaded, visible + producerRate * dt);
     *     window.Repaint();
     * }, 16);
     *
     * async function loadFocusedWaveform() {
     *     const id = ++requestId;
     *     const handle = fb.GetFocusItem();
     *     if (!handle) return;
     *
     *     const points = 2048;
     *     const started = performance.now();
     *     waveform = new Float32Array(points);
     *     loaded = 0;
     *     visible = 0;
     *     producerRate = 0;
     *     lastFrame = 0;
     *
     *     try {
     *         const complete = await utils.GetWaveformAsync(handle, points, 0, 0, (values, start) => {
     *             if (id !== requestId) return false; // cancel the obsolete native decode
     *
     *             waveform.set(values, start);
     *             loaded = Math.max(loaded, start + values.length);
     *
     *             const elapsed = performance.now() - started;
     *             if (elapsed > 0) producerRate = loaded / elapsed;
     *             return true;
     *         });
     *
     *         if (id !== requestId) return;
     *         waveform = complete;
     *         loaded = complete.length;
     *     } catch (e) {
     *         if (id === requestId) console.log(`GetWaveformAsync failed: ${e}`);
     *     }
     * }
     *
     * // See "Focus Track Waveform.js" for a complete rendering example.
     *
     * @worker
     * @sourceFile ../../component/samples/basic/Focus Track Waveform.js
     */
    GetWaveformAsync: function (handle, points, start, duration, on_progress) { },

    /**
     * Retrieves filepaths that match the supplied pattern.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} pattern For the path, you can use the * and ? wildcards for any intermediate directory and for the file name.
     * @param {number=} [exc_mask=0x10] Mask to exclude files. Default is {@link module:Flags.FILE_ATTRIBUTE_DIRECTORY FILE_ATTRIBUTE_DIRECTORY}. See flags like {@link module:Flags.FILE_ATTRIBUTE_NORMAL FILE_ATTRIBUTE_NORMAL} etc.
     * @param {number=} [inc_mask=0xffffffff] Mask to include files
     * @return {Array<string>}
     *
     * @example
     * let arr = utils.Glob("C:\\*.*");
     * let arr2 = utils.Glob(fb.ProfilePath + 'image*\\album?\\*.jpg');
     * @worker
     */
    Glob: function (pattern, exc_mask, inc_mask) { }, // (Array) [, exc_mask][, inc_mask]

    /**
     * @param {number} window_id Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @param {string} prompt
     * @param {string} caption
     * @param {string=} [default_val='']
     * @param {boolean=} [error_on_cancel=false] If set to true, use try/catch like Example2.
     * @param {string=} [help_text=''] If not empty, a Help button will show in the dialog. If <b>help_text</b> begins with "http://" or "https://", it will launch a web browser otherwise it will open a popup window containing the text
     * @return {string}
     *
     * @example
     * // With "error_on_cancel" not set (or set to false), cancelling the dialog will return "default_val".
     * let username = utils.InputBox(0, "Enter your username", "Spider Monkey Panel", "");
     *
     * @example
     * // Using Example1, you can't tell if OK or Cancel was pressed if the return value is the same
     * // as "default_val". If you need to know, set "error_on_cancel" to true which throws a script error
     * // when Cancel is pressed.
     * let username = "";
     * try {
     *    username = utils.InputBox(0, "Enter your username", "Spider Monkey Panel", "", true);
     *    // OK was pressed.
     * } catch(e) {
     *     // Dialog was closed by pressing Esc, Cancel or the Close button.
     * }
     */
    InputBox: function (window_id, prompt, caption, default_val, error_on_cancel, help_text) { }, // (string)

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {boolean} true, if location exists and it's a directory
     * @worker
     */
    IsDirectory: function (path) { },

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {boolean} true, if location exists and it's a file
     * @worker
     */
    IsFile: function (path) { },

    /**
     * @param {number} vkey See {@link https://docs.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes}.<br>
     * Some are defined in {@link module:Flags Flags}, like {@link module:Flags.VK_LEFT VK_LEFT}
     * @return {boolean}
     * @worker
     */
    IsKeyPressed: function (vkey) { }, // (boolean)

    /**
     * Loads a font file for private use by the current foobar2000 process.
     * The font is not installed in Windows and is not made available to other processes.
     * 
     * After a successful call the font becomes available to the foobar2000 process. It can be used by {@link gdi.Font} and {@link d2d.Font} and is visible to other JSplitter panels and Workers.
     * The font is registered privately for the foobar2000 process rather than for JSplitter alone. As a result, it may also become available to native foobar2000 UI and other components that use the Windows font APIs, depending on when they enumerate or create their fonts.
     *
     * Relative paths are resolved from the file containing the <b>LoadFont</b> call. 
     * For the main script, they are relative to the main script directory; when called from an included script or a file-backed Worker, they are relative to that file.
     * Absolute paths are used as-is.
     *
     * The file is registered once by its normalised absolute path. Calling <b>LoadFont</b> again with the
     * same file returns <b>true</b> without registering it again. Loaded fonts remain available for the
     * lifetime of the foobar2000 process; there is no corresponding unload operation.
     *
     * A font may expose different legacy/GDI and typographic/DirectWrite family names. 
     * {@link utils.CheckFont} can be used to verify a family name after loading, while {@link utils.ListFonts} shows the names reported by the GDI and DirectWrite backends.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Path to a font file, typically a `.ttf` or `.otf` file.
     * @return {boolean} `true` if the font is already loaded or was loaded successfully; `false` if the
     * file does not exist, cannot be read as a font, contains no usable family, or cannot be registered.
     * @worker
     *
     * @example
     * if (utils.LoadFont('fonts/Rain Tungsten Medium.ttf')) {
     *     const gdiFont = gdi.Font('Rain Tungsten Medium', 16);
     *     ...
     * }
     */
    LoadFont: function (path) { },

    /**
     * Gets an array of available font family names. Fonts loaded with {@link utils.LoadFont} are included.
     * GDI and DirectWrite can expose different family names for the same font file.
     * @param {number} [mode=0] 0 - Auto, 1 - GDI fonts, 2 - DirectWrite fonts
     * @return {Array<string>} array of font family names
     * @worker
     */
    ListFonts: function (mode) { },
    
    /**
     * See {@link https://docs.microsoft.com/en-us/windows/desktop/api/winnls/nf-winnls-lcmapstringa}.
     * @param {string} text
     * @param {string} lcid
     * @param {number} flags defined in {@link module:Flags Flags}, like {@link module:Flags.LCMAP_LOWERCASE LCMAP_LOWERCASE}
     * @return {string}
     * @worker
     */
    MapString: function (text, lcid, flags) { }, // (string)

    /**
     * Calculates MD5 for string
     *
     * @param {string} str input string
     * @return {string} MD5 value for input in hex format string. If input string is empty returns "d41d8cd98f00b204e9800998ecf8427e"
     * @worker
     */
    MD5: function (str) { }, // (uint)

    /**
     * Calculates MD5 value for file content
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path input file path
     * @return {string} MD5 value for input file content in hex format string. If it was an error while reading file returns empty string. If file is empty returns "d41d8cd98f00b204e9800998ecf8427e"
     * @worker
     */
    MD5FromFile: function (path) { }, // (uint)

    /**
     * Shows system message box with specified parameters<br>
     * 
     * @param {string} msg
     * @param {string=} [title="JSplitter"]
     * @param {MessageBoxButtons=} [buttons=MessageBoxButtons.OK] See {@link module:Flags.MessageBoxButtons MessageBoxButtons}
     * @param {MessageBoxIcon=} [icon=MessageBoxIcon.Information] See {@link module:Flags.MessageBoxIcon MessageBoxIcon}
     * @param {MessageBoxDefaultButton=} [default_button=MessageBoxDefaultButton.Button1] See {@link module:Flags.MessageBoxDefaultButton MessageBoxDefaultButton}
     * @param {string=} [help_text=""] If not empty, a Help button will show in the dialog. If <b>help_text</b> begins with "http://" or "https://", it will launch a web browser otherwise it will open a popup window containing the text
     * @param {number=} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {number} Result of message box. See {@link module:Flags.DialogResult DialogResult}
     */
    MessageBox: function (msg, title, buttons, icon, default_button, help_text, window_id) { }, // (string)

    /**
     * Parses an HTML string and returns a lightweight DOM-like document.<br>
     *<br>
     * This parser is backed by the native HTML parser. It does not use ActiveX, MSHTML, a browser engine, or external resource loading.<br>
     *<br>
     * Notes:<br>
     * - The input must be HTML text, not a file path.<br>
     * - The returned API is DOM-like, but it is not a full browser DOM.<br>
     * - CSS, layout, visibility, scripts, network loading, and browser events are not processed.<br>
     * - <b>innerText</b> is currently an alias of <b>textContent</b>.<br>
     * - The method returns null if the document could not be created.<br>
     *
     * @param {string} html HTML source text.
     * @return {?HtmlDocument} Parsed document, or null on failure.
     *
     * @example
     * const doc = utils.ParseHtml("<html><body><p>Hello <b>world</b></p></body></html>");
     * if (doc) console.log(doc.body.textContent); // "Hello world"
     * 
     * @sourceFile ../../component/samples/basic/ParseHtml.js
     * @worker
     */
    ParseHtml: function (html) { },

    /**
     * Check if the supplied string matches the pattern.<br>
     * Using Microsoft MS-DOS wildcards match type. eg "*.txt", "abc?.tx?"
     *
     * @param {string} pattern
     * @param {string} str
     * @return {boolean}
     * @worker
     */
    PathWildcardMatch: function (pattern, str) { }, // (boolean)

    /**
     * Opens a binary file for incremental reading into a caller-provided <code>Uint8Array</code>.<br>
     * The buffer is reused by the caller, so repeated reads do not allocate a new typed array for every chunk.
     * This is intended for large files or other cases where whole-file {@link utils.ReadBinaryFile} would be inefficient.<br>
     * Reading is synchronous. For one-shot large-file processing, use the reader inside {@link Worker.RunAsync}; for persistent pipelines, use it from a {@link Worker}. Both approaches keep blocking file I/O off the panel UI thread.<br>
     * Ordinary read failures are reported through <code>Read()</code> and <code>EOF</code>; they are not thrown as exceptions.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename File to open.
     * @return {?BinaryReader} Open streaming reader, or <code>null</code> if the reader could not be created. Ordinary file open/setup failures are reported as <code>null</code>, not exceptions.
     *
     * @example
     * const reader = utils.OpenBinaryReader('E:\\large-file.bin');
     * if (!reader) return;
     *
     * const buffer = new Uint8Array(1024 * 1024);
     * for (;;) {
     *     const bytesRead = reader.Read(buffer);
     *     if (!bytesRead) {
     *         if (!reader.EOF) console.log('Read failed');
     *         break;
     *     }
     *
     *     // Process buffer[0 .. bytesRead).
     * }
     * reader.Close();
     *
     * @sourceFile ../../component/samples/basic/Streaming Binary IO.js
     * @worker
     */
    OpenBinaryReader: function (filename) { },

    /**
     * Opens a binary file for incremental writing from a caller-provided <code>Uint8Array</code>.<br>
     * The file is created or truncated when opened. The parent folder must already exist.<br>
     * Reusing the same typed array avoids allocating temporary buffers for every chunk.<br>
     * Write, flush, and close failures are reported through boolean return values. Writing is synchronous. For long-running processing, use the writer from a {@link Worker} to avoid blocking the panel UI.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename File to create or overwrite.
     * @return {?BinaryWriter} Open streaming writer, or <code>null</code> if the writer could not be created. Ordinary file creation/open failures are reported as <code>null</code>, not exceptions.
     *
     * @example
     * const writer = utils.OpenBinaryWriter('E:\\large-file.bin');
     * if (!writer) return;
     *
     * const buffer = new Uint8Array(1024 * 1024);
     * // Fill buffer...
     * if (!writer.Write(buffer)) console.log('Write failed');
     * if (!writer.Close()) console.log('Close failed');
     *
     * @sourceFile ../../component/samples/basic/Streaming Binary IO.js
     * @worker
     */
    OpenBinaryWriter: function (filename) { },

    /**
     * Opens or creates a SQLite database for synchronous read/write access.<br>
     * This is an optional host capability. <code>utils.OpenDatabase</code> is defined only when the SQLite library already loaded by foobar2000 exposes the required API. Scripts that need to support hosts without compatible SQLite can feature-detect it with <code>typeof utils.OpenDatabase === 'function'</code>.<br>
     * The special filename <code>:memory:</code> creates an in-memory SQLite database and is not path-resolved. The parent folder of a file-backed database must already exist.<br>
     * Database work is synchronous, so large imports or expensive queries should be run from a {@link Worker} to avoid blocking the panel UI thread.<br>
     * SQL values should be passed through the optional parameter array instead of being concatenated into the SQL text. Supported parameter types are <code>null</code>, boolean, number, string, <code>ArrayBuffer</code>, and typed-array views.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename Absolute or script-relative database filename, or <code>:memory:</code>.
     * @return {?SQLiteDatabase} Open database handle, or <code>null</code> if the database could not be opened or created. Ordinary open/create failures are reported as <code>null</code>, matching the other <code>Open*</code> resource factories. SQL and database-operation errors after a successful open are reported as exceptions.
     *
     * @example
     * const db = utils.OpenDatabase('example.db');
     * if (!db) {
     *     console.log('Unable to open database');
     *     return;
     * }
     *
     * try {
     *     db.Exec('CREATE TABLE IF NOT EXISTS settings (name TEXT PRIMARY KEY, value TEXT)');
     *     db.Exec('INSERT OR REPLACE INTO settings(name, value) VALUES (?, ?)', ['theme', 'dark']);
     *
     *     const rows = db.Query('SELECT value FROM settings WHERE name = ?', ['theme']);
     *     console.log(rows.length ? rows[0].value : 'not found');
     * } finally {
     *     db.Close();
     * }
     *
     * @sourceFile ../../component/samples/basic/SQLite Playback History.js
     * @worker
     */
    OpenDatabase: function (filename) { },

    /**
     * Opens a text file for incremental, line-by-line reading.<br>
     * Unlike {@link utils.ReadTextFile}, the whole file is not materialized as one JavaScript string. This makes it suitable for processing large text files incrementally, one line at a time, without requiring the entire file contents to fit in the JavaScript heap.<br>
     * {@link TextReader#ReadLine ReadLine} removes the line terminator. A return value of <b>null</b> means that no next line could be returned; in that case, {@link TextReader#EOF EOF} is <b>true</b> for a clean end of file and <b>false</b> for a read or decoding failure.
     * UTF-16LE/BE and UTF-32LE/BE are supported with codepages 1200/1201 and 12000/12001 respectively.<br>
     * Pass codepage 0 to use automatic charset detection, matching {@link utils.ReadTextFile}.<br>
     * Reading is synchronous. For long-running processing, use the reader from a {@link Worker} to avoid blocking the panel UI.<br>
     * Ordinary read and decoding failures are reported through {@link TextReader#ReadLine ReadLine} and {@link TextReader#EOF EOF}; they are not thrown as exceptions.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename File to open.
     * @param {number=} [codepage=65001] Windows codepage used to decode each line. UTF-16LE/BE use 1200/1201, UTF-32LE/BE use 12000/12001, and 0 enables automatic detection. See Codepages.js.
     * @return {?TextReader} Open streaming reader, or <code>null</code> if the reader could not be created.
     * This includes invalid or unsupported codepages, an empty filename, and ordinary file open failures.
     *
     * @example
     * const reader = utils.OpenTextReader('E:\\large-file.txt');
     * if (!reader) {
     *     console.log('Unable to open file');
     *     return;
     * }
     *
     * for (;;) {
     *     const line = reader.ReadLine();
     *     if (line === null) {
     *         if (!reader.EOF) console.log('Read or decoding failed');
     *         break;
     *     }
     *     console.log(line);
     * }
     * reader.Close();
     *
     * @sourceFile ../../component/samples/basic/Streaming Text IO.js
     * @worker
     */
    OpenTextReader: function (filename, codepage) { },

    /**
     * Performance note: supply codepage argument if it is known, since codepage detection might take some time.<br>
     * UTF-8, UTF-16LE/BE, UTF-32LE/BE, and supported Windows codepages use the same decoding rules as {@link utils.OpenTextReader}. A matching BOM is removed for UTF encodings.<br>
     * For large line-oriented files, consider {@link utils.OpenTextReader}; it avoids creating one JavaScript string containing the entire file.
     *
     * Filesystem path resolution: absolute paths are used as-is. Relative paths are resolved against the file containing the current call. For the main script this is the main script directory; for an included script or a file-backed Worker it is that script's own directory. If there is no file-backed caller, the existing host fallback is used (the Worker's relative-path root, or the component directory for an in-memory panel script).
     *
     * @param {string} filename
     * @param {number=} [codepage=65001] See Codepages.js. UTF-16LE/BE use 1200/1201, UTF-32LE/BE use 12000/12001. If codepage is 0, automatic detection is performed.
     * @return {string} Decoded file contents, or an empty string if the file could not be read or decoded.
     *
     * @example
     * let text = utils.ReadTextFile("E:\\some text file.txt");
     * @worker
     */
    ReadTextFile: function (filename, codepage) { }, // (string) [,codepage]

    /**
     * Returns a string. Will be empty if path doesn't exist or there was an error opening it.<br>
     * For UTF8 files with or without BOM. If you're unsure about the file encoding, continue to use {@link utils.ReadTextFile}
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {string}
     * @worker
     */
    ReadUTF8: function(path) { },

    /**
     * Moves a file or directory to the Recycle Bin.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path path to a file or directory
     * @returns {boolean} true on success, false otherwise
     * @worker
     * @mainthread
     */
    RecyclePath: function(path) { }, // (boolean)

    /**
     * Returns a number to indicate how many files/folders were removed.<br>
     * May be 0 if the path did not exist or -1 if some other internal error occurred.
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {number}
     * @worker
     */
    RemovePath: function(path) { },

    /**
     * Renames file or folder path.
     * 
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} from
     * @param {string} to
     * @return {boolean}
     * @worker
     */
    RenamePath: function(from, to) { },

    /**
     * Uses the same modern unicode replacements as the foobar2000 converter/file operations.
     * 
     * @param {string} str
     * @param {boolean} [strip_trailing_periods=false] Set to true if str is a folder name.
     * @return {boolean}
     * @worker
     */
    ReplaceIllegalChars(str, strip_trailing_periods) { },
    
    /**
     * Read a file as raw binary.<br>
     * For large files, consider {@link utils.OpenBinaryReader}; it reads incrementally into a reusable caller-provided buffer instead of allocating one typed array for the whole file.
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Absolute file path
     * @returns {Uint8Array} File bytes, or null if was an error
     * 
     * @sourceFile ../../component/samples/basic/CreateImageFromPixelData.js
     * @worker
     */
    ReadBinaryFile: function(path) { },

    /**
     * Note: this only returns up to 255 characters per value.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename
     * @param {string} section
     * @param {string} key
     * @param {string=} [default_val]
     * @return {string}
     *
     * @example
     * let username = utils.ReadINI("e:\\my_file.ini", "Last.fm", "username");
     * @worker
     */
    ReadINI: function (filename, section, key, default_val) { }, // (string) [, default_val]
    
    /**
     * Runs a file, executable, URL, or document through the Windows shell.<br>
     * This method uses ShellExecuteEx, so it supports shell verbs, file associations, URLs, and elevation through "runas".<br>
     * Unlike {@link utils.RunCmdAsync RunCmdAsync}, this method does not capture stdout or stderr and does not provide timeout handling.<br>
     * If wait is true, the call blocks until the launched process exits, when a process handle is available.<br>
     * Relative <code>working_dir</code> values are resolved as described in {@link utils.ReadTextFile}. The <code>target</code> argument is not path-resolved.<br>
     *
     * @param {string} target
     * File, executable, URL, or document to run/open.<br>
     * If this value is empty, the method returns a RunResult with OK=false and Win32Error=ERROR_INVALID_PARAMETER.<br>
     *
     * @param {string|string[]} [args]
     * Command line arguments.<br>
     * If a string is passed, it is appended as-is.<br>
     * If an array is passed, each item is quoted automatically when needed.<br>
     * For documents, URLs, or shell verbs that do not use parameters, this can be omitted.<br>
     * For complex cmd.exe commands using shell syntax such as redirection, pipes, &, or &&, a string is usually more appropriate.<br>
     *
     * @param {string} [working_dir=""]
     * Working directory for the process.<br>
     * Pass an empty string to use the default working directory.<br>
     *
     * @param {string} [verb=""]
     * Shell verb to use.<br>
     * Pass an empty string to use the default verb.<br>
     * Common values are "open", "edit", "print", and "runas".<br>
     * Use "runas" to request elevation through UAC.<br>
     *
     * @param {number} [show=ShowWindow.Hide]
     * Requested window display mode.<br>
     * Use one of the ShowWindow values, for example ShowWindow.Hide or ShowWindow.Show.<br>
     * The target application or shell handler may ignore this value.<br>
     *
     * @param {boolean} [wait=false]
     * Whether to wait for the launched process to exit.<br>
     * If false, OK means that ShellExecuteEx accepted the request.<br>
     * If true, the method waits for the launched process to exit when a process handle is available, and then fills ExitCode.<br>
     * When wait=true and a process exit code is available, OK is true only if the process exits with code 0.<br>
     * A non-zero process exit code is reported as OK=false, with Win32Error usually remaining 0.<br>
     * If wait=true but no process handle is available, OK=false and Win32Error=ERROR_INVALID_HANDLE.<br>
     * Be careful: wait=true blocks the current script until the process exits and has no timeout.<br>
     * Use RunCmdAsync if you need asynchronous completion, stdout/stderr capture, or timeout handling.<br>
     *
     * @returns {RunResult}
     * Result object.<br>
     *
     * @example
     * // Open a URL with the default browser.
     * const result = utils.Run("https://www.foobar2000.org");
     *
     * console.log(result.OK);
     * console.log(result.Win32Error);
     * console.log(result.ShellCode);
     *
     * @example
     * // Run a command and wait for its exit code.
     * const result = utils.Run(
     *     "cmd.exe",
     *     '/c "exit /b 7"',
     *     "",
     *     "",
     *     ShowWindow.Hide,
     *     true
     * );
     *
     * console.log(result.OK);        // false: process exited with a non-zero code
     * console.log(result.ExitCode);  // 7: process exit code
     * console.log(result.Win32Error); // 0: process was started successfully
     *
     * @example
     * // Run elevated.
     * const result = utils.Run(
     *     "notepad.exe",
     *     undefined,
     *     "",
     *     "runas",
     *     ShowWindow.Show,
     *     false
     * );
     * @worker
     * @mainthread
     */
    Run(target, args, working_dir, verb, show, wait) { },

     /**
     * Runs an external process asynchronously.<br>
     * Standard output and standard error are captured separately.<br>
     * The method returns a task id immediately, and the result is delivered later to on_run_cmd_async_done.<br>
     * Completion callbacks may arrive in a different order than the RunCmdAsync calls were made.<br>
     * Use the returned task id to match the result with the original RunCmdAsync call.<br>
     * If the process does not finish before timeout_ms, the whole process tree is terminated.<br>
     * Pass 0 as timeout_ms to wait indefinitely.<br>
     * Relative <code>working_dir</code> values are resolved as described in {@link utils.ReadTextFile}. The <code>app</code> argument is not path-resolved.<br>
     *
     * @param {string} app
     * Full path or executable name to run.<br>
     * If this value is empty, the callback receives success=false and stderr contains an error message.<br>
     *
     * @param {string|string[]} [args]
     * Command line arguments.<br>
     * If a string is passed, it is appended to the command line as-is.<br>
     * If an array is passed, each item is quoted automatically when needed.<br>
     *
     * @param {string} [working_dir=""]
     * Working directory for the process.<br>
     *
     * @param {number} [show=ShowWindow.Hide]
     * Window display mode.<br>
     *
     * @param {number} [timeout_ms=0]
     * Maximum time to wait for the process, in milliseconds.<br>
     * Pass 0 to wait indefinitely.<br>
     * On timeout, the callback receives success=false, exit_code=0xFFFFFFFF, and stderr contains a timeout message.<br>
     *
     * @returns {number}
     * Task id of the asynchronous operation.<br>
     *
     * @throws
     * Throws if called before foobar2000 is fully initialized, if args is invalid, or if the worker thread could not be started.<br>
      * @worker
     */
    RunCmdAsync(app, args, working_dir, show, timeout_ms) { },

    /**
     * @param {string} text
     * @worker
     * @mainthread
     */
    SetClipboardText: function (text) { },

    /**
     * Calculates SHA1 for string
     *
     * @param {string} str input string
     * @return {string} SHA1 value for input in hex format string. If input string is empty returns "da39a3ee5e6b4b0d3255bfef95601890afd80709"
     * @worker
     */
    SHA1: function (str) { }, // (uint)

    /**
     * Calculates SHA1 value for file content
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path input file path
     * @return {string} SHA1 value for input file content in hex format string. If it was an error while reading file returns empty string. If file is empty returns "da39a3ee5e6b4b0d3255bfef95601890afd80709"
     * @worker
     */
    SHA1FromFile: function (path) { }, // (uint)
    
    /**
     * Displays an html dialog, rendered by IE engine.<br>
     * Utilizes the latest non-Edge IE that you have on your system.<br>
     * Dialog is modal (blocks input to the parent window while open).<br>
     * <br>
     * Html code and JavaScript executed inside the dialog must be IE compatible
     * (see {@link https://www.w3schools.com/js/js_versions.asp}).<br>
     * <br>
     * <code>options.data</code> is exposed inside the html dialog through
     * <code>window.external.dialogArguments</code>. The bridge supports the following values:
     * <ul>
     *   <li>Basic types: number, string, boolean, null, undefined</li>
     *   <li>
     *     Arrays: call <code>window.external.dialogArguments.toArray()</code> inside html to obtain
     *     a JavaScript array. Each element has the same type limitations as <code>options.data</code>.
     *   </li>
     *   <li>
     *     Functions: callable from html as callbacks into panel JavaScript. A callback may have a
     *     maximum of 7 arguments, and each argument has the same type limitations as <code>options.data</code>.
     *   </li>
     *   <li>
     *     Objects are not transferred directly. Serialize them with <code>JSON.stringify()</code> before
     *     passing them and restore them with <code>JSON.parse()</code> inside html.
     *   </li>
     * </ul>
     * JSplitter objects such as <code>FbMetadbHandle</code>, <code>GdiBitmap</code> and <code>D2DBitmap</code>
     * cannot be passed through this bridge.<br>
     * <br>
     * The following properties are available through <code>window.external</code> inside the html dialog:<br>
     * <ul>
     *   <li><code>dialogArguments</code> - read-only value containing <code>options.data</code></li>
     *   <li>
     *     <code>dialogWindow</code> - read-only native window handle (HWND) of the html dialog, represented as a number.<br>
     *     It can be passed as <code>window_id</code> to JSplitter modal dialog functions to make the html dialog their owner, e.g.<br>
     *     {@link utils.ColourPicker}<br>
     *     {@link utils.FontPicker}<br>
     *     {@link utils.InputBox}<br>
     *     {@link plman.ShowPlaylistLockUI}<br>
     *     {@link utils.FilePicker}<br>
     *     {@link utils.FolderPicker}<br>
     *     {@link utils.MessageBox}<br>
     *     {@link utils.ShowHtmlDialog}<br>
     *     The handle is valid only while the html dialog exists.
     *   </li>
     * </ul>
     *
     * @param {number} window_id native window handle (HWND) to use as the dialog owner; pass 0 to use the default foobar2000 window
     * @param {string} code_or_path Html code or file path. File path must begin with <code>file://</code> prefix.
     * @param {object=} [options=undefined]
     * @param {number=} [options.width=250] Window width
     * @param {number=} [options.height=100] Window height
     * @param {number=} [options.x=0] Window horizontal position relative to desktop
     * @param {number=} [options.y=0] Window vertical position relative to desktop
     * @param {boolean=} [options.center=true] If true and if options.x and options.y are not set, will center window relative to fb2k position.
     * @param {boolean=} [options.context_menu=false] If true, will enable right-click context menu.
     * @param {boolean=} [options.resizable=false] If true, will allow to resize the window.
     * @param {boolean=} [options.selection=false] If true, will allow to select everything (label texts, buttons and etc).
     * @param {boolean=} [options.scroll=false] If true, will display scrollbars.
     * @param {*=} [options.data=undefined] Read-only data exposed through <code>window.external.dialogArguments</code>. For multiple values, pass an array and call <code>.toArray()</code> inside html. Has type limitations described above.
     *
     * @sourceFile ../../component/samples/basic/HtmlDialogWithCheckBox.js
     *
     * @example <caption>Dialog from file</caption>
     * utils.ShowHtmlDialog(0, `file://${fb.ComponentPath}samples/basic/html/PopupWithCheckBox.html`);
     */
    ShowHtmlDialog: function (window_id, code_or_path, options) { },

    /**
     * @param {string} path
     * @return {Array<string>} An array of [directory, filename, filename_extension]
     *
     * @example
     * let arr = utils.SplitFilePath('D:\\Somedir\\Somefile.txt');
     * // arr[0] <= 'D:\\Somedir\\' (always includes backslash at the end)
     * // arr[1] <= 'Somefile'
     * // arr[2] <= '.txt'
     * @worker
     */
    SplitFilePath: function (path) { }, // (boolean)

    /**
     * Write raw binary data to a file.<br>
     * For large output, consider {@link utils.OpenBinaryWriter}; it writes incrementally from a reusable caller-provided buffer.
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Absolute file path
     * @param {Uint8Array} data Bytes to write
     * @returns {boolean} true on success
     * @example
     * const img = gdi.Image(`${fb.ComponentPath}\\samples\\d2d\\images\\Field.jpg`);
     * 
     * let imgPixelData = img.GetPixelData();
     * 
     * utils.WriteBinaryFile("D:\\Field.bin", imgPixelData);
     * 
     * let rData = utils.ReadBinaryFile("D:\\Field.bin");
     * 
     * let rImg = gdi.CreateImageFromPixelData(rData, 2208, 1242);
     * 
     * function on_paint(gr) {
     *     gr.DrawImage(rImg, 0, 0, img.Width, img.Height, 0, 0, img.Width, img.Height);
     * }
     * @worker
     */
    WriteBinaryFile: function(path, data) { },

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename
     * @param {string} section
     * @param {string} key
     * @param {string} val
     * @return {boolean}
     *
     * @example
     * utils.WriteINI("e:\\my_file.ini", "Last.fm", "username", "Bob");
     * @worker
     */
    WriteINI: function (filename, section, key, val) { }, // (boolean)

    /**
     * Opens a text file for incremental writing.<br>
     * The file is created or truncated when opened. The parent folder must already exist.<br>
     * UTF-8 is used by default. UTF-16LE (1200), UTF-16BE (1201), UTF-32LE (12000), UTF-32BE (12001), and other valid Windows codepages are also supported.<br>
     * If <code>write_bom</code> is true, the matching BOM is written for UTF-8, UTF-16, and UTF-32. Other Windows codepages do not have a BOM and ignore this option.<br>
     * Use <code>Write()</code> to append text without a line terminator or <code>WriteLine()</code> to append text followed by CRLF. Encoding and I/O failures are reported through boolean return values. This avoids building one large JavaScript string before writing a large file.<br>
     * Writing is synchronous. For one-shot large-file generation, use the writer inside {@link Worker.RunAsync}; for persistent pipelines, use it from a {@link Worker}. Both approaches keep blocking file I/O off the panel UI thread.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename File to create or overwrite.
     * @param {boolean=} [write_bom=true] If true, writes a BOM for UTF-8/UTF-16/UTF-32.
     * @param {number=} [codepage=65001] Output Windows codepage. Codepage 0 is not valid for writing. See Codepages.js.
     * @return {?TextWriter} Open streaming writer, or <code>null</code> if the writer could not be created.
     * This includes an empty filename, an invalid codepage, and ordinary file creation/open failures.
     *
     * @example
     * const writer = utils.OpenTextWriter('E:\\large-file.txt', false);
     * if (!writer) {
     *     console.log('Unable to create file');
     *     return;
     * }
     *
     * for (let i = 0; i < 100000; ++i) {
     *     if (!writer.WriteLine(JSON.stringify({ id: i, value: `item ${i}` }))) {
     *         console.log('Write failed');
     *         break;
     *     }
     * }
     * if (!writer.Close()) console.log('Close failed');
     *
     * @sourceFile ../../component/samples/basic/Streaming Text IO.js
     * @worker
     */
    OpenTextWriter: function (filename, write_bom, codepage) { },

    /**
     * Note: the parent folder must already exist.<br>
     * UTF-8 is used by default, matching {@link utils.OpenTextWriter}. UTF-16LE (1200), UTF-16BE (1201), UTF-32LE (12000), UTF-32BE (12001), and other valid Windows codepages are also supported.<br>
     * If <code>write_bom</code> is true, the matching BOM is written for UTF-8, UTF-16, and UTF-32. Other Windows codepages do not have a BOM and ignore this option.<br>
     * For large output, consider {@link utils.OpenTextWriter}; it writes incrementally and does not require one large JavaScript string containing the entire file.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} filename
     * @param {string} content
     * @param {boolean=} [write_bom=true]
     * @param {number=} [codepage=65001] Output Windows codepage. Codepage 0 is not valid for writing. See Codepages.js.
     * @return {boolean} true on success, false otherwise.
     *
     * @example <caption>Default UTF-8 with BOM</caption>
     * utils.WriteTextFile("z:\\1.txt", "test");
     *
     * @example <caption>UTF-8 without BOM</caption>
     * utils.WriteTextFile("z:\\2.txt", "test", false);
     *
     * @example <caption>UTF-16LE with BOM</caption>
     * utils.WriteTextFile("z:\\3.txt", "test", true, 1200);
     * @worker
     */
    WriteTextFile: function (filename, content, write_bom, codepage) { }, //(boolean)
};


/**
 * Streaming binary reader returned by {@link utils.OpenBinaryReader}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function BinaryReader() {

    /**
     * Reads bytes into an existing <code>Uint8Array</code> without allocating a new buffer.<br>
     * If <code>offset</code> is omitted, reading starts at index 0. If <code>count</code> is omitted, bytes are read up to the end of the buffer.<br>
     * An explicitly supplied <code>offset + count</code> must fit inside the buffer.
     *
     * @param {Uint8Array} buffer Destination buffer.
     * @param {number=} [offset=0] Destination offset in bytes.
     * @param {number=} count Maximum number of bytes to read. Defaults to the remaining buffer size.
     * @return {number} Number of bytes actually read. A nonzero request returning 0 means that no bytes were read: {@link BinaryReader#EOF EOF} is <code>true</code> at clean end of file and <code>false</code> if the read could not be performed. A zero-length request also returns 0.
     * @throws Throws only if the reader is closed.
     * @worker
     */
    this.Read = function (buffer, offset, count) { };

    /**
     * Closes the file. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true if the reader is closed successfully; false if closing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * File size in bytes as observed when the reader was opened.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Length = 0;

    /**
     * Number of bytes successfully read from the file.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Position = 0;

    /**
     * Indicates that the current read position has reached the file length recorded when the reader was opened.<br>
     * This property does not report a closed reader or a read failure. Use the return value of {@link BinaryReader#Read Read()} to drive the read loop; <code>EOF</code> is status information used to distinguish a clean end of file from a failed read.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.EOF = false;

    /**
     * Indicates whether the reader has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * Streaming binary writer returned by {@link utils.OpenBinaryWriter}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function BinaryWriter() {

    /**
     * Writes bytes from an existing <code>Uint8Array</code> without creating a temporary typed array.<br>
     * If <code>offset</code> is omitted, writing starts at index 0. If <code>count</code> is omitted, bytes are written up to the end of the buffer.<br>
     * An explicitly supplied <code>offset + count</code> must fit inside the buffer.
     *
     * @param {Uint8Array} buffer Source buffer.
     * @param {number=} [offset=0] Source offset in bytes.
     * @param {number=} count Number of bytes to write. Defaults to the remaining buffer size.
     * @return {boolean} true on success; false if the buffer/range is invalid or the write fails.
     * @throws Throws only if the writer is closed.
     * @worker
     */
    this.Write = function (buffer, offset, count) { };

    /**
     * Flushes buffered output to the file.
     *
     * @return {boolean} true on success; false if flushing fails.
     * @throws Throws only if the writer is closed.
     * @worker
     */
    this.Flush = function () { };

    /**
     * Closes the file. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true if the writer is closed successfully; false if closing/flushing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Number of bytes successfully written to the file.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Position = 0;

    /**
     * Indicates whether the writer has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * SQLite database returned by {@link utils.OpenDatabase}.<br>
 * All operations are synchronous. Use a {@link Worker} for large imports, maintenance, or expensive queries when blocking the panel UI would be undesirable.<br>
 * Parameter arrays are positional and must contain exactly as many values as the SQL statement requires. Booleans are stored as SQLite integers 0/1. Query results map SQLite NULL to <code>null</code>, INTEGER/REAL to number, TEXT to string, and BLOB to <code>Uint8Array</code>.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function SQLiteDatabase() {

    /**
     * Closes the database. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true after the database has been closed.
     * @worker
     */
    this.Close = function () { };

    /**
     * Starts a deferred transaction.
     *
     * @example
     * db.Exec('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT)');
     * db.Begin();
     * try {
     *     db.Exec('INSERT INTO items(name) VALUES (?)', ['Alpha']);
     *     db.Exec('INSERT INTO items(name) VALUES (?)', ['Beta']);
     *     db.Commit();
     * } catch (e) {
     *     db.Rollback();
     *     throw e;
     * }
     * @worker
     */
    this.Begin = function () { };

    /**
     * Commits the current transaction.
     *
     * @worker
     */
    this.Commit = function () { };

    /**
     * Rolls back the current transaction.
     *
     * @worker
     */
    this.Rollback = function () { };

    /**
     * Executes one or more SQL statements. Result rows, if any, are discarded.<br>
     * When multiple statements are supplied, parameter values are consumed in SQLite parameter-index order across the statements. The total parameter count must match exactly.
     *
     * @param {string} sql SQL text to execute.
     * @param {Array<*>=} [parameters] Positional parameter values. Supported element types: <code>null</code>, boolean, number, string, <code>ArrayBuffer</code>, and typed-array views.
     * @throws Throws on SQL, binding, or database errors, or when the database is closed.
     *
     * @example
     * db.Exec(
     *     'CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT);' +
     *     'INSERT INTO items(name) VALUES (?);',
     *     ['Example']
     * );
     * @worker
     */
    this.Exec = function (sql, parameters) { };

    /**
     * Executes exactly one SQL statement and returns all rows as plain JavaScript objects keyed by column name.<br>
     * SQLite NULL becomes <code>null</code>, INTEGER/REAL become number, TEXT becomes string, and BLOB becomes <code>Uint8Array</code>. The query must produce unique column names; use SQL aliases when selecting duplicate names.
     *
     * @param {string} sql SQL query to execute.
     * @param {Array<*>=} [parameters] Positional parameter values. Supported element types: <code>null</code>, boolean, number, string, <code>ArrayBuffer</code>, and typed-array views.
     * @return {Array<Object>} Query rows. Returns an empty array when the query produces no rows.
     * @throws Throws on SQL, binding, or database errors, when multiple SQL statements are supplied, or when the database is closed.
     *
     * @example
     * const rows = db.Query(
     *     'SELECT artist, COUNT(*) AS plays FROM history WHERE played_at >= ? GROUP BY artist ORDER BY plays DESC',
     *     [Date.now() - 30 * 24 * 60 * 60 * 1000]
     * );
     * for (const row of rows) {
     *     console.log(`${row.artist}: ${row.plays}`);
     * }
     * @worker
     */
    this.Query = function (sql, parameters) { };

    /**
     * Prepares exactly one SQL statement for repeated execution.
     *
     * @param {string} sql SQL statement to prepare.
     * @return {SQLiteStatement} Prepared statement.
     * @throws Throws if the SQL cannot be prepared, if more than one statement is supplied, or when the database is closed.
     *
     * @example
     * const insert = db.Prepare('INSERT INTO items(name, score) VALUES (?, ?)');
     * try {
     *     insert.Run(['Alpha', 10]);
     *     insert.Run(['Beta', 20]);
     * } finally {
     *     insert.Close();
     * }
     * @worker
     */
    this.Prepare = function (sql) { };

    /**
     * Indicates whether the database is open.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsOpen = false;
}

/**
 * Prepared SQLite statement returned by {@link SQLiteDatabase#Prepare}.<br>
 * <code>Run()</code> and <code>Query()</code> automatically reset the statement and clear all parameter bindings before returning, so the same statement can be reused immediately with a new parameter array.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function SQLiteStatement() {

    /**
     * Closes the prepared statement. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true after the statement has been closed.
     * @worker
     */
    this.Close = function () { };

    /**
     * Executes the prepared statement and discards any result rows. The statement is reset and its bindings are cleared before returning.
     *
     * @param {Array<*>=} [parameters] Positional parameter values. The count must match the prepared statement exactly.
     * @throws Throws on binding or execution errors, or when the statement is closed.
     * @worker
     */
    this.Run = function (parameters) { };

    /**
     * Executes the prepared statement and returns all result rows. The statement is reset and its bindings are cleared before returning.
     *
     * @param {Array<*>=} [parameters] Positional parameter values. The count must match the prepared statement exactly.
     * @return {Array<Object>} Query rows as plain JavaScript objects.
     * @throws Throws on binding or execution errors, or when the statement is closed.
     * @worker
     */
    this.Query = function (parameters) { };

    /**
     * Explicitly resets the statement and clears its current parameter bindings.<br>
     * This is normally unnecessary after {@link SQLiteStatement#Run Run()} or {@link SQLiteStatement#Query Query()}, because both methods do it automatically.
     *
     * @throws Throws when the statement is closed.
     * @worker
     */
    this.Reset = function () { };

    /**
     * Indicates whether the prepared statement is open.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsOpen = false;
}

/**
 * Streaming text reader returned by {@link utils.OpenTextReader}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function TextReader() {

    /**
     * Reads the next line and removes its line terminator.
     *
     * @return {?string} The next decoded line, or <code>null</code> when no line can be returned. When <code>null</code> is returned, {@link TextReader#EOF EOF} is <code>true</code> for clean end of file and <code>false</code> for a read or decoding failure.
     * @throws Throws only if the reader is closed.
     * @worker
     */
    this.ReadLine = function () { };

    /**
     * Closes the file. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true if the reader is closed successfully; false if closing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Indicates that a clean end of file has been observed while reading.<br>
     * This property does not report a closed reader or a read/decoding failure. Do not use it as a pre-read loop condition; use the return value of {@link TextReader#ReadLine ReadLine()} to drive the loop, then inspect <code>EOF</code> when <code>ReadLine()</code> returns <code>null</code>.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.EOF = false;

    /**
     * Indicates whether the reader has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}

/**
 * Streaming text writer returned by {@link utils.OpenTextWriter}.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function TextWriter() {

    /**
     * Writes text at the current file position without adding a line terminator.
     *
     * @param {string} content Text to write.
     * @return {boolean} true on success; false if the text cannot be encoded in the selected codepage or the write fails.
     * @throws Throws only if the writer is closed.
     * @worker
     */
    this.Write = function (content) { };

    /**
     * Writes text followed by a CRLF line terminator.
     *
     * @param {string} content Text to write.
     * @return {boolean} true on success; false if the text cannot be encoded in the selected codepage or the write fails.
     * @throws Throws only if the writer is closed.
     * @worker
     */
    this.WriteLine = function (content) { };

    /**
     * Flushes buffered output to the file.
     *
     * @return {boolean} true on success; false if flushing fails.
     * @throws Throws only if the writer is closed.
     * @worker
     */
    this.Flush = function () { };

    /**
     * Closes the file. Calling <code>Close()</code> more than once is allowed.
     *
     * @return {boolean} true if the writer is closed successfully; false if closing/flushing the file fails. Calling it again after a successful close returns true.
     * @worker
     */
    this.Close = function () { };

    /**
     * Indicates whether the writer has been closed.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.Closed = false;
}


/**
 * Object returned by {@link utils.GetDriveInfo}.<br>
 * Property names and semantics follow the Microsoft Scripting Runtime <code>Drive</code> object where applicable.
 *
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function DriveInfo() {

    /**
     * Drive path, for example <code>C:</code>. For a mapped network drive this is still the mapped drive path.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.Path = "";

    /**
     * Root folder path, for example <code>C:\</code>.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.RootFolder = "";

    /**
     * Drive letter without the colon, or an empty string when the volume has no drive letter.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.DriveLetter = "";

    /**
     * Drive type.<br>
     * Values are compatible with <code>Scripting.FileSystemObject</code>:<br>
     * 0 - unknown, 1 - removable, 2 - fixed, 3 - network, 4 - CD-ROM, 5 - RAM disk.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.DriveType = 0;

    /**
     * true if volume or space information can be queried.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsReady = false;

    /**
     * Volume label, or an empty string if unavailable. Writable for ready volumes.
     *
     * @type {string}
     * @worker
     */
    this.VolumeName = "";

    /**
     * File system name, or an empty string if unavailable.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.FileSystem = "";

    /**
     * Volume serial number, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.SerialNumber = 0;

    /**
     * Share name for a network drive, or an empty string for a local drive or when unavailable.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    this.ShareName = "";

    /**
     * Total size in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.TotalSize = 0;

    /**
     * Total free space in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.FreeSpace = 0;

    /**
     * Free space available to the current user in bytes, or 0 if unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.AvailableSpace = 0;
}

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
     * Set whether the JSplitter panel should be cleared with background color before raising <b>on_paint</b> callback.<br>
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
     * const alphabet = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
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
     * Also, calling any of d2d.* methods for creating objects like fonts, bitmaps or effects, will cause a script crash until the DrawMode is set to 1 at least once (in this case, the resources required for D2D operation are initialized).
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
    *    The Worker's immutable constructor name, identical to Worker-global <code>self.name</code>. The value is an empty string if no name was supplied. The same identity is used by unhandled Worker exception diagnostics, where an empty name is displayed as <code>&lt;unnamed&gt;</code>.
    * @property {number} HeapUsage
    *    SpiderMonkey heap usage of this Worker (in bytes). The per-Worker heap limit is configured by
    *    <b>Worker maximum heap size (in MB, per Worker)</b>; see <a href="globals.html#JsMemoryStats-WorkerHeapLimit"><code>JsMemoryStats.WorkerHeapLimit</code></a>.
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
    * SpiderMonkey context and is reported separately in <a href="globals.html#JsMemoryStats-Workers"><code>JsMemoryStats.Workers</code></a>.<br>
    * <br>
    * Related GC settings are under <b>Advanced &gt; JSplitter &gt; Performance: restart is required &gt; GC</b>.
    *
    * @typedef {Object} JsMemoryStats
    * @property {number} MainThreadHeapUsage
    *    SpiderMonkey heap usage shared by all JSplitter panel scripts running on the main thread (in bytes).
    *    The maximum is configured by <b>Main thread maximum heap size (in MB)</b>; see <code>MainThreadHeapLimit</code>.
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
     * {@link window.MaxHeight}, {@link window.MaxWidth}, {@link window.MinHeight} and {@link window.MinWidth} can be used to lock the panel size.<br>
     * Do not use if panels are contained within Panel Stack Splitter (Columns UI component) or JSplitter itself
     *
     * @type {number}
     */
    MaxHeight: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MaxWidth: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MinHeight: undefined, // (uint) (read, write)

    /**
     * See {@link window.MaxHeight}.
     *
     * @type {number}
     */
    MinWidth: undefined, // (uint) (read, write)

    /**
     * Returns the panel name set in {@link window.ShowConfigureV2}.
     *
     * @type {string}
     * @readonly
     */
    Name: undefined, // (string) (read)

    /**
    * Return value of {@link window.ScriptInfo}.<br>
    * Note: package_id is only present when the panel script is a package.
    * 
    * @typedef {Object} ScriptInfo
    * @property {string} Name
    * @property {string} [Author]
    * @property {string} [Version]
    * @property {string} [PackageId]
    */

    /**
     * Information about the panel script.
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
     * Clears all current panel properties set by {@link window.SetProperty}, {@link window.SetProperties} or {@link window.ImportProperties}
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
     * Deprecated: use {@link window.DefineScript} instead.
     * Panel name can be changed via {@link window.ShowConfigureV2}.
     *
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
     */
    DefineScript: function (name, options) { }, // (void)

     /**
     * Open the current panel script in the default text editor.<br>
     * Default text editor can be changed via `Edit` button on the main tab of {@link window.ShowConfigureV2}.
     */
    EditScript: function () { },

    /**
     * Exports all current panel properties set by {@link window.SetProperty} to file
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
     * Deprecated: use {@link window.Tooltip} and {@link FbTooltip#SetFont SetFont} instead.
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
     */
    GetColourCUI: function (type, client_guid) { }, // (uint) [, client_guid]

    /**
     * @param {number} type See {@link module:Flags.ColourTypeDUI ColourTypeDUI} enum
     * @return {number} returns black colour if the requested one is not available.
     */
    GetColourDUI: function (type) { }, // (uint)

    /**
     * Note: see the example in {@link window.GetFontDUI}.
     *
     * @param {number} type See {@link module:Flags.FontTypeCUI FontTypeCUI} enum
     * @param {string=} client_guid Client GUID
     * @return {?GdiFont} returns null if the requested font was not found.
     */
    GetFontCUI: function (type, client_guid) { }, // (GdiFont) [, client_guid]

    /**
     * @param {number} type See {@link module:Flags.FontTypeDUI FontTypeDUI} enum
     * @return {?GdiFont} returns null if the requested font was not found.
     *
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
     * Get all current panel properties set by {@link window.SetProperty}, {@link window.SetProperties} or {@link window.ImportProperties}
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
     * @param {string} fileName
     * @param {boolean=} [reload_panel=false] If true, reloads panel script
     * @return {boolean} If false, then an error occurred during import. Also, if an error occurs during import, the panel does not reload.
     */
    ImportProperties: function (fileName, reload_panel) { },

    /**
     * This will <b>synchronously</b> trigger {@link module:Callbacks.on_notify_data on_notify_data}(name, info) in other panels.<br>
     * <b>!!! Beware !!!</b>: data passed via `info` argument must NOT be used or modified in the source panel after invoking this method.
     * <div class="doc-note warning">
     * <b>Legacy compatibility API</b><br>Existing scripts can keep using NotifyOthers unchanged. For new asynchronous structured-clone messaging between panels and Workers, prefer {@link BroadcastChannel}.<br></div>
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
     * Use this instead of {@link window.Repaint} on frequently updated areas
     * such as time, bitrate, seekbar, etc.<br>
     * <br>
     * Performance note: see Performance note in {@link window.Repaint}.
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
     * See {@link setInterval}.
     *
     * @param {function()} func
     * @param {number} delay
     *
     * @return {number}
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
     */
    SetTimeout: function (func, delay) { }, // (uint)

    /**
     * Show configuration window of current panel.
     * <br>
     * Deprecated: use {@link window.ShowConfigureV2} to configure panel and {@link window.EditScript} to edit script.
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
     * Deprecated compatibility API. It will be removed in a future release. Use {@link FbWindow#Move fb.Window.Move} for new code.
     *
     * @deprecated
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     */
    MoveFoobarWindow: function (x, y, width, height) { }, // (void)

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

     /**
     * Deprecated compatibility API. It will be removed in a future release. Use {@link FbWindow#X fb.Window.X} for new code.
     *
     * @deprecated
     * @type {number}
     */
    FoobarWindowX: 0, // (int) (read, write)

    /**
     * Deprecated compatibility API. It will be removed in a future release. Use {@link FbWindow#Y fb.Window.Y} for new code.
     *
     * @deprecated
     * @type {number}
     */
    FoobarWindowY: 0, // (int) (read, write)

    /**
     * Deprecated compatibility API. It will be removed in a future release. Use {@link FbWindow#Width fb.Window.Width} for new code.
     *
     * @deprecated
     * @type {number}
     */
    FoobarWindowWidth: 0, // (int) (read, write)

    /**
     * Deprecated compatibility API. It will be removed in a future release. Use {@link FbWindow#Height fb.Window.Height} for new code.
     *
     * @deprecated
     * @type {number}
     */
    FoobarWindowHeight: 0, // (int) (read, write)    
};

/**
 * Object returned by {@link fb.GetAudioChunk}
 * @hideconstructor
 * @worker
 * @cloneable
 * @transferable
 */
class FbAudioChunk {
    /**
     * Copies the chunk's interleaved PCM samples into an existing <code>Float32Array</code> without allocating a new JavaScript sample array.
     * The destination must have room for at least <code>SampleCount * ChannelCount</code> values.
     * This is useful for real-time visualizations that reuse the same buffer on every update; the legacy {@link FbAudioChunk#Data Data} property remains unchanged for compatibility.
     *
     * @param {Float32Array} destination Destination buffer.
     * @return {number} Number of scalar PCM samples copied.
     * @throws {Error} If <code>destination</code> is not a <code>Float32Array</code> or is too small.
     * @worker
     */
    CopyDataTo(destination) {}
        
     /**
     * @type {Array<float>}
     * @readonly
      * @worker
     */
    Data = 0; // (Array<string>) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    ChannelConfig = 0; // (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    ChannelCount = 0; // (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    SampleRate = 0; // (uint) (read)    

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    SampleCount = 0; // (uisize_tnt) (read)   
}

/**
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function FbMetadbHandle() {
    /**
     * @type {string}
     * @readonly
     *
     * @example
     * let handle = fb.GetFocusItem();
     * console.log(handle.Path); // D:\SomeSong.flac
     * @worker
     */
    this.Path = undefined; // (string) (read)

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(handle.RawPath); // file://D:\SomeSong.flac
     * @worker
     */
    this.RawPath = undefined; // (string) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.SubSong = undefined; // (uint) (read)

    /**
     * -1 if size is unavailable.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.FileSize = undefined; // (LONGLONG) (read)

    /**
     * @type {float}
     * @readonly
     * @worker
     */
    this.Length = undefined; // (double) (read)

    /**
     * @param {number} playcount Use 0 to clear
     * @worker
     */
    this.SetPlaycount = function (playcount) { }; // (void)

    /**
     * @param {number} loved Use 0 to clear
     * @worker
     */
    this.SetLoved = function (loved) { }; // (void)

    /**
     * @param {string} first_played Use "" to clear
     * @worker
     */
    this.SetFirstPlayed = function (first_played) { }; // (void)

    /**
     * @param {string} last_played Use "" to clear
     * @worker
     */
    this.SetLastPlayed = function (last_played) { }; // (void)

    /**
     * @param {number} rating Use 0 to clear
     * @worker
     */
    this.SetRating = function (rating) { }; // (void)

    /**
     * @method
     * @worker
     */
    this.ClearStats = function () { }; // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    this.RefreshStats = function () { }; // (void)

    /**
     * Compare two {@link FbMetadbHandle} instances, pointer only.<br>
     * If you want to compare them physically, use the {@link FbMetadbHandle#RawPath} property.
     *
     * @param {FbMetadbHandle} handle
     * @return {boolean}
     *
     * @example
     * handle.Compare(handle2);
     * @worker
     */
    this.Compare = function (handle) { }; // (boolean)

    /**
     * @param {boolean} [want_full_info=false] This enables full retrieval of tags that have been blocked with [b][url=https://www.foobar2000.org/LargeFieldsConfig-v2]LargeFieldsConfig-v2[/url][/b] in the latest foobar2000 2.26 previews.
     * @return {?FbFileInfo} null if file info is not available.
     * @worker
     */
    this.GetFileInfo = function (want_full_info) { }; // (FbFileInfo)
}

/**
 * Object returned by {@link FbMetadbHandle#GetFileInfo GetFileInfo}
 * @hideconstructor
 * @worker
 * @cloneable
 */
class FbFileInfo {
    /**
     * @type {number}
     * @readonly
     *
     * @example
     * let handle = fb.GetFocusItem();
     * let file_info = handle.GetFileInfo();
     * if (file_info) {
     *     console.log(file_info.MetaCount); // 11
     * }
     * @worker
     */
    MetaCount = undefined; // (read)

    /**
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(file_info.InfoCount); // 9
     * @worker
     */
    InfoCount = undefined; // (read)

    /**
     * @param {string} name
     * @return {number} -1 if not found
     * @worker
     */
    InfoFind = function (name) { }; //

    /**
     * @param {number} idx
     * @return {string}
     * @worker
     */
    InfoName = function (idx) { }; //

    /**
     * @param {number} idx
     * @return {string}
     * @worker
     */
    InfoValue = function (idx) { }; //

    /**
     * @param {string} name
     * @return {number} -1 if not found
     * @worker
     */
    MetaFind = function (name) { }; //

    /**
     * Note: the case of the tag name returned can be different depending on tag type,
     * so using toLowerCase() or toUpperCase() on the result is recommended
     *
     * @param {number} idx
     * @return {string}
     *
     * @example
     * for (let i = 0; i < f.MetaCount; ++i) {
     *      console.log(file_info.MetaName(i).toUpperCase());
     * }
     * @worker
     */
    MetaName = function (idx) { }; //

    /**
     * @param {number} idx
     * @param {number} value_idx Used for iterating through multi-value tags.
     * @return {string}
     * @worker
     */
    MetaValue = function (idx, value_idx) { }; //

    /**
     * The number of values contained in a meta tag.
     *
     * @param {number} idx
     * @return {number}
     * @worker
     */
    MetaValueCount = function (idx) { }; //
}

/**
 * Handle list elements can be accessed with array accessor, e.g. handle_list[i]
 *
 * @constructor
 * @param {FbMetadbHandleList | FbMetadbHandle | Array<FbMetadbHandle> | null | undefined} [arg]
 * @worker
 * @cloneable
 */
function FbMetadbHandleList(arg) {
    /**
     * @type {number}
     * @readonly
     *
     * @example
    *  let handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
     * console.log(handle_list.Count);
     * @worker
     */
    this.Count = undefined; // (uint) (read)

    /**
     * @param {FbMetadbHandle} handle
     * @return {number}
     *
     * @example
     * handle_list.Add(fb.GetNowPlaying());
     * @worker
     */
    this.Add = function (handle) { }; // (uint)

    /**
     * @param {FbMetadbHandleList} handle_list
     *
     * @example
     * handle_list.AddRange(fb.GetLibraryItems());
     * @worker
     */
    this.AddRange = function (handle_list) { }; // (void)

    /**
     * Embeds covers of the specified type, loaded from the specified file, into media files<br>
     * Any existing artwork of the specified type will be overwritten!<br>
     * Embedding covers is an asynchronous operation, so its result is not controlled here in any way. However, all the work of the method up to this point (reading file, creating art data) will return false in case of an error.
     *
     * @param {string} image_path path to an existing image
     * @param {AlbumArtId=} [art_id=AlbumArtId.front] See {@link module:Flags.AlbumArtId AlbumArtId}
     * @return {boolean} Returns false if any error occurred before the embedding started, otherwise true
     * 
     * @example
     * include(`${fb.ComponentPath}docs\\Flags.js`);
     * 
     * const handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
     * if (handle_list.Count > 0) {
     *    const img_path = 'C:\\path\\to\\image.jpg';
     *    handle_list.AttachImage(img_path, AlbumArtId.front);
     * }
     *
     * @example
     * include(`${fb.ComponentPath}docs\\Flags.js`);
     * 
     * // since there is no handle method, do this for a single item
     * const handle_list = new FbMetadbHandleList(fb.GetFocusItem());
     * const img_path = "C:\\path\\to\\image.jpg";
     * handle_list.AttachImage(img_path, AlbumArtId.front);
     * @worker
     */
    this.AttachImage = function (image_path, art_id) { }; //(bool)

    /**
     * Embeds covers of the specified type from exisiting GdiBitmap or D2DBitmap object. Supports JPEG, WEBP and PNG codecs for encoding image before embedding.<br>
     * Any existing artwork of the specified type will be overwritten!<br>
     * Embedding covers is an asynchronous operation, so its result is not controlled here in any way. However, all the work of the method up to this point (encoding, creating art data) will return false in case of an error.
     * 
     * @param {GdiBitmap} image (or {@link D2DBitmap} if {@link window.DrawMode} == 1). Image to attach
     * @param {AlbumArtId=} [art_id=AlbumArtId.front] See {@link module:Flags.AlbumArtId AlbumArtId}
     * @param {AttachImage2Codec=} [codec=AttachImage2Codec.Jpeg] See {@link module:Flags.AttachImage2Codec AttachImage2Codec}
     * @param {float=} [quality=70.0] <b>NOTE</b>: For WebP quality 100 means lossless WebP; values below 100 use lossy WebP. For PNG quality is ignored because PNG codec is always lossless. 
     * @return {boolean} Returns false if any error occurred before the embedding started, otherwise true
     * 
     * @example
     * include(`${fb.ComponentPath}docs\\Flags.js`);
     * 
     * const handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
     * if (handle_list.Count > 0) {
     *    const img = gdi.Image("C:\\path\\to\\image.jpg");
     *    handle_list.AttachImage2(img, AlbumArtId.front, AttachImage2Codec.WebP, 60);
     * }
     *
     * @example
     * * include(`${fb.ComponentPath}docs\\Flags.js`);
     * 
     * // since there is no handle method, do this for a single item
     * const handle_list = new FbMetadbHandleList(fb.GetFocusItem());
     * const img = gdi.Image("C:\\path\\to\\image.jpg");
     * handle_list.AttachImage2(img, AlbumArtId.front, AttachImage2Codec.WebP, 60);
     * @worker
     */
    this.AttachImage2 = function (image, art_id, codec, quality) { }; //(bool)

    /**
     * Faster than {@link FbMetadbHandleList#Find Find}.
     *
     * @param {FbMetadbHandle} handle Must be sorted with {@link FbMetadbHandleList#Sort Sort}.
     * @return {number} -1 on failure.
     * @worker
     */
    this.BSearch = function (handle) { }; // (uint)

    /**
     * @return {float} total duration in seconds. For display purposes, consider using {@link utils.FormatDuration} on the result.
     * @worker
     */
    this.CalcTotalDuration = function () { }; // (double)

    /**
     * @return {number} total size in bytes. For display purposes, consider using utils.FormatFileSize() on the result.
     * @worker
     */
    this.CalcTotalSize = function () { }; // (LONGLONG)

    /**
     * @return {FbMetadbHandleList}
     *
     * @example
     * let handle_list2 = handle_list.Clone();
     * @worker
     */
    this.Clone = function () { }; // (FbMetadbHandleList)

    /**
     * Converts {@link FbMetadbHandleList} to an array of {@link FbMetadbHandle}.<br>
     * Use this instead of looping through {@link FbMetadbHandleList}, if the playlist is big
     * or if you need to loop multiple times.<br>
     *
     * @return {Array<FbMetadbHandle>}
     *
     * @example
     * let playlist_items_array = plman.GetPlaylistItems(plman.ActivePlaylist).Convert();
     * for (let i = 0; i < playlist_items_array.length; ++i) {
     *    // do something with playlist_items_array[i] which is your handle
     * }
     * @worker
     */
    this.Convert = function () { }; // (Array)

    /**
     * Performance note: if sorted with {@link FbMetadbHandleList#Sort Sort}, use {@link FbMetadbHandleList#BSearch BSearch} instead.
     *
     * @param {FbMetadbHandle} handle
     * @return {number} index in the handle list on success, -1 if not found
     * @worker
     */
    this.Find = function (handle) { }; // (int)

    /**
     * See {@link fb.GetLibraryRelativePath}.<br>
     * <br>
     * This should be faster than looping a handle list manually and using the aforementioned method.
     *
     * @return {Array<string>}
     *
     * @example
     * let handle_list = fb.GetLibraryItems();
     * handle_list.OrderByRelativePath();
     * let relative_paths = handle_list.GetLibraryRelativePaths();
     * @worker
     * @mainthread
     */
    this.GetLibraryRelativePaths = function () { }; // (Array)

    /**
     * Provides all the information viewable on the Details tab in the main Properties dialog. This can be technical/location info as well as database fields from 3rd party components if present.<br>
     * This returns a JSON object in string form so you need to use JSON.parse on the result.<br>
     *
     * @return {string}
     *
     * @example
     * const handle_list = plman.GetPlaylistItems(plman.ActivePlaylist);
     * const str = handle_list.GetOtherInfo();
     * console.log(str);
     * @worker
     */
    this.GetOtherInfo = function () { }; // (string)

    /**
     * @param {number} index
     * @param {FbMetadbHandle} handle
     *
     * @example
     * // This inserts at the end of the handle list.
     * handle_list.Insert(handle_list.Count, fb.GetNowPlaying());
     * @worker
     */
    this.Insert = function (index, handle) { }; // (void)

    /**
     * @param {number} index
     * @param {FbMetadbHandleList} handle_list
     * @worker
     */
    this.InsertRange = function (index, handle_list) { }; // (void)

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort} before using.
     *
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeDifference(two);
     * // "one" now only contains handles that were unique to "one".
     * // Anything that also existed in "two" will have been removed.
     * @worker
     */
    this.MakeDifference = function (handle_list) { }; // (void)

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort Sort} before using.
     *
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeIntersection(two);
     * // "one" now only contains handles that were in BOTH "one" AND "two"
     * @worker
     */
    this.MakeIntersection = function (handle_list) { }; // (void)

    /**
     * Note: sort with {@link FbMetadbHandleList#Sort Sort} before using.
     *
     * @param {FbMetadbHandleList} handle_list Sorted handle list.
     *
     * @example
     * let one = plman.GetPlaylistItems(0);
     * one.Sort();
     *
     * let two = plman.GetPlaylistItems(1);
     * two.Sort();
     *
     * one.MakeUnion(two);
     * // "one" now contains all handles from "one" AND "two" with any duplicates removed
     * @worker
     */
    this.MakeUnion = function (handle_list) { }; // (void)

    /**
     * @param {boolean} minimise
     *
     * This provides the same functionality as the native context menu items
     * under `Utilities` except there are no prompts.
     * @worker
     * @mainthread
     */
    this.OptimiseFileLayout = function (minimise) { }; // (void)

    /**
     * @param {FbTitleFormat} tfo An instance of FbTitleFormat.
     * @param {number} direction > 0 - ascending.
     *
     * @example
     * let handle_list = fb.GetLibraryItems();
     * let tfo = fb.TitleFormat("%album artist%|%date%|%album%|%discnumber%|%tracknumber%");
     * handle_list.OrderByFormat(tfo, 1);
     * @worker
     */
    this.OrderByFormat = function (tfo, direction) { }; // (void)

    /**
     * Note: this method should only be used on a handle list containing items that are monitored as part of the Media Library.
     *
     * @method
     * @worker
     */
    this.OrderByPath = function () { }; // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    this.OrderByRelativePath = function () { }; // (void)

    /**
     * @method
     * @worker
     * @mainthread
     */
    this.RefreshStats = function () { }; // (void)

    /**
     * @param {FbMetadbHandle} handle
     * @worker
     */
    this.Remove = function (handle) { }; // (void)

    /**
     * @method
     * @worker
     */
    this.RemoveAll = function () { }; // (void)

    /**
     * Note: a progress dialog will be shown for larger file selections.
     *
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId}
     * @worker
     * @mainthread
     */
    this.RemoveAttachedImage = function (art_id) { }; // (void)

    /**
     * Removes all attached images.
     *
     * Note: a progress dialog will be shown for larger file selections.
     * @worker
     * @mainthread
     */
    this.RemoveAttachedImages = function () { }; // (void)

    /**
     * @param {number} idx
     *
     * @example
     * handle_list.RemoveById(0);
     * @worker
     */
    this.RemoveById = function (idx) { }; // (void)

    /**
     * @param {number} from
     * @param {number} num
     *
     * @example
     * handle_list.RemoveRange(10, 20);
     * @worker
     */
    this.RemoveRange = function (from, num) { }; // (void)

    /**
     * Reverses the order of the items in the handle list.
     * @worker
     */
    this.Reverse = function() { },

    /**
     * Randomly shuffles the items in the handle list.
     * @worker
     */
    this.Shuffle = function() { },

    /**
     * @param {string} path
     *
     * @worker
     */
    this.SaveAs = function (path) { }; // (void)

    /**
     * Remove duplicates and optimise for other handle list operations
     *
     * @method
     * @worker
     */
    this.Sort = function () { }; // (void)

    /**
     * Updated metadb tags with new values.
     *
     * @param {string} str JSON string, which contains an object (applies same values to every track)
     *                     or an array of objects (one object per track).
     *
     * @example
     * // assume we've selected one album
     * let handles = plman.GetPlaylistSelectedItems(plman.ActivePlaylist);
     *
     * let arr = [];
     * for (let i = 0; i < handles.Count; ++i) {
     *     // each element of the array must be an object of key names/values, indicated by the curly braces
     *     arr.push({
     *         'tracknumber' : i + 1, // independent values per track
     *         'totaltracks' : handles.Count,
     *         'album' : 'Greatest Hits', // a simple string for a single value
     *         'genre' : ['Rock', 'Hard Rock'], // we can use an array here for multiple value tags
     *         'bad_tag' : '' // blank values will clear any existing tags.
     *     });
     * }
     *
     * handles.UpdateFileInfoFromJSON(JSON.stringify(arr));
     * @worker
     * @mainthread
     */
    this.UpdateFileInfoFromJSON = function (str) { }; // (void)
}

/**
 * A Recycle Bin for playlists.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function FbPlaylistRecycler() {

    /**
     * @type {number}
     * @readonly
     * @worker
     * @mainthread
     */
    this.Count = undefined; // (uint) (read)

    /**
     * @param {number} index
     * @return {string}
     * @worker
     * @mainthread
     */
    this.GetName = function (index) { }; // (string) (read)

    /**
     * @param {number} index
     * @return {FbMetadbHandleList}
     * @worker
     * @mainthread
     */
    this.GetContent = function (index) { }; // (FbMetadbHandleList) (read)

    /**
     * @param {number} affectedItems array like [1, 3, 5]
     * @worker
     * @mainthread
     */
    this.Purge = function (affectedItems) { }; // (void)

    /**
     * @param {number} index
     * @worker
     * @mainthread
     */
    this.Restore = function (index) { }; // (void)
}

/**
 * @constructor
 * @hideconstructor
 *
 * @example
 * let playing_item_location = plman.GetPlayingItemLocation();
 * if (playing_item_location.IsValid) {
 *     console.log(playing_item_location.PlaylistIndex);
 *     console.log(playing_item_location.PlaylistItemIndex);
 * }
 * @worker
 * @cloneable
 */
function FbPlayingItemLocation() {

    /**
     * False if foobar2000 isn't playing or if the playing track
	 * has since been removed from the playlist it was on when playback was started.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.IsValid = undefined; // (boolean) (read)

    /**
     * -1 if item is not in a playlist
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.PlaylistIndex = undefined; // (int) (read)

    /**
     * -1 if item is not in a playlist
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.PlaylistItemIndex = undefined; // (int) (read)
}

/**
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function FbPlaybackQueueItem() {

    /**
     * @type {FbMetadbHandle}
     * @readonly
     * @worker
     */
    this.Handle = undefined; // (FbMetadbHandle) (read)

    /**
     * -1 if item is not in a playlist
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.PlaylistIndex = undefined; // (int) (read)

    /**
     * -1 if item is not in a playlist
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.PlaylistItemIndex = undefined; // (int) (read)
}

/**
 * @constructor
 * @param {string} name
 *
 * @example
 * let test = new FbProfiler('test');
 * // do something time consuming
 * console.log(test.Time); // Outputs bare time in ms like "789"
 * test.Print(); // Outputs component name/version/assigned name like "Spider Monkey Panel v1.0.0: profiler (test): 789 ms"
 * @worker
 */
function FbProfiler(name) {

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Time = undefined; // (uint) // milliseconds

    /**
     * @method
     * @worker
     */
    this.Reset = function () { }; // (void)

    /**
     * @param {string=} [additionalMsg=''] string that will be prepended to the measured time
     * @param {boolean=} [printComponentInfo=true]
     *
     * @example
     * let test = new FbProfiler('Group #1');
     * // Do smth #1
     * test.Print('\nTask #1:', false);
     * // Do smth #2
     * test.Print('\nTask #2:', false);
     * // Do smth
     * test.Print();
     * // Output:
     * // profiler (Group #1):
     * // Task #1: 789 ms"
     * // profiler (Group #1):
     * // Task #2: 1530 ms"
     * // Spider Monkey Panel v1.0.0: profiler (Group #1): 3541 ms"
     * @worker
     */
    this.Print = function (additionalMsg, printComponentInfo) { }; // (void)
}

/**
 * Performance note: if you use the same query frequently,
 * try caching FbTitleFormat object (by storing it somewhere),
 * instead of creating it every time.
 *
 * @constructor
 * @param {string} expression
 * @worker
 * @cloneable
 */
function FbTitleFormat(expression) {
    /**
     * Always use Eval when you want dynamic info such as %playback_time%, %bitrate% etc.<br>
     * {@link FbTitleFormat#EvalWithMetadb}(fb.GetNowplaying()) will not give the results you want.
     *
     * @param {boolean=} [force=false] If true, you can process text that doesn't contain
     *     title formatting even when foobar2000 isn't playing. When playing, you
     *     should always get a result.
     * @return {string}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * console.log(tfo.Eval());
     * @worker
     * @mainthread
     */
    this.Eval = function (force) { }; // [force]

    /**
     * @param {FbMetadbHandle} handle
     * @param {boolean} [want_full_info=false] This enables full retrieval of tags that have been blocked with [b][url=https://www.foobar2000.org/LargeFieldsConfig-v2]LargeFieldsConfig-v2[/url][/b] in the latest foobar2000 2.26 previews.
     * @return {string}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * console.log(tfo.EvalWithMetadb(fb.GetFocusItem()));
     * @worker
     */
    this.EvalWithMetadb = function (handle, want_full_info) { }; //

    /**
     * @param {FbMetadbHandleList} handle_list
     * @return {Array<string>}
     *
     * @example
     * let tfo = fb.TitleFormat("%artist%");
     * let handle_list = fb.GetLibraryItems();
     * let artists = tfo.EvalWithMetadbs(handle_list);
     * console.log(handle_list.Count === artists.length); // should always be true!
     * @worker
     */
    this.EvalWithMetadbs = function (handle_list) { }; //(Array)
}

/**
 * @constructor
 * @hideconstructor
 */
function FbTooltip() {
    /**
     * Note: this also updates text on the active tooltip
     * i.e. there is no need to manually cycle Deactivate()/Activate()
     * to update text.
     * 
     * @type {string}
     *
     * @example
     * let tooltip = window.Tooltip;
     * tooltip.Text = "Whoop";
     */
    this.Text = undefined; // (string) (read, write)

    /** @type {boolean} */
    this.TrackActivate = undefined; // (boolean) (write)

    /**
     * Note: only do this when text has changed, otherwise it will flicker.
     *
     * @method
     *
     * @example
     * let text = "...";
     * if (tooltip.Text != text) {
     *    tooltip.Text = text;
     *    tooltip.Activate();
     * }
     */
    this.Activate = function () { }; // (void)

    /** @method */
    this.Deactivate = function () { }; // (void)

    /**
     * @param {number} type
     * @return {number}
     */
    this.GetDelayTime = function (type) { }; // (uint)

    /**
     * @param {number} type See {@link module:Flags} > Used in {@link FbTooltip#GetDelayTime GetDelayTime} and {@link FbTooltip#SetDelayTime SetDelayTime}
     * @param {number} time
     */
    this.SetDelayTime = function (type, time) { }; // (void)

    /**
     * @param {string} font_name
     * @param {number=} [font_size_px=12]
     * @param {number=} [font_style=0] See {@link module:Flags.FontStyle FontStyle} flags
     */
    this.SetFont = function (font_name, font_size_px, font_style) { };

    /**
     * Use if you want multi-line tooltips.<br>
     * Use \n as a new line separator.
     *
     * @param {number} width
     *
     * @example
     * tooltip.SetMaxWidth(800);
     * tooltip.Text = "Line1\nLine2";
     */
    this.SetMaxWidth = function (width) { }; // (void)

    /**
     * Note: check that x, y positions have changed from the last invocation, otherwise it will flicker.<br>
     * Note 2: ensure that the tooltip does not overlap the mouse pointer, otherwise it will glitch out.
     *
     * @param {number} x
     * @param {number} y
     */
    this.TrackPosition = function (x, y) { }; // (void)
}

/**
 * This is typically used to update the selection used by the default UI artwork panel
 * or any other panel that makes use of the preferences under
 * File > Preferences > Display > Selection viewers. Use in conjunction with the {@link module:Callbacks.on_focus on_focus}
 * callback.
 *
 * @constructor
 * @hideconstructor
 *
 * @example <caption>For playlist viewers</caption>
 * let selection_holder = fb.AcquireUiSelectionHolder();
 * selection_holder.SetPlaylistSelectionTracking();
 *
 * function on_focus(is_focused) {
 *     if (is_focused) { // Updates the selection when panel regains focus
 *         selection_holder.SetPlaylistSelectionTracking();
 *     }
 * }
 *
 * @example <caption>For library viewers</caption>
 * let selection_holder = fb.AcquireUiSelectionHolder();
 * let handle_list = null;
 *
 * function on_mouse_lbtn_up(x, y) { // Presumably going to select something here...
 *    handle_list = ...;
 *    selection_holder.SetSelection(handle_list);
 * }
 *
 * function on_focus(is_focused) {
 *    if (is_focused) { // Updates the selection when panel regains focus
 *        if (handle_list && handle_list.Count)
 *            selection_holder.SetSelection(handle_list);
 *    }
 * }
 * @worker
 */
function FbUiSelectionHolder() {

    /**
     * Sets the selected items.
     *
     * @param {FbMetadbHandleList} handle_list
     * 
     * @param {number} [type=0] Selection type. Possible values:<br>
     *     0 - default, undefined<br>
     *     1 - active_playlist_selection<br>
     *     2 - caller_active_playlist<br>
     *     3 - playlist_manager<br>
     *     4 - now_playing<br>
     *     5 - keyboard_shortcut_list<br>
     *     6 - media_library_viewer
     * 
     * @worker
     * @mainthread
     */
    this.SetSelection = function (handle_list, type) { }; // (void)

    /**
     * Sets selected items to playlist selection and enables tracking.<br>
     * When the playlist selection changes, the stored selection is automatically
     * updated. Tracking ends when a set method is called on any ui_selection_holder
     * or when the last reference to this ui_selection_holder is released.
     * @worker
     * @mainthread
     */
    this.SetPlaylistSelectionTracking = function () { }; // (void)

    /**
     * Sets selected items to playlist contents and enables tracking.<br>
     * When the playlist selection changes, the stored selection is automatically
     * updated. Tracking ends when a set method is called on any ui_selection_holder
     * or when the last reference to this ui_selection_holder is released.
     * @worker
     * @mainthread
     */
    this.SetPlaylistTracking = function () { }; // (void)
}

/**
 * @constructor
 * @param {GdiBitmap} arg
 * @worker
 * @cloneable
 * @transferable
 */
function GdiBitmap(arg) {

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = undefined;// (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = undefined;// (uint) (read)

    /**
     * @param {number} alpha Valid values 0-255.
     * @return {GdiBitmap}
     * @worker
     */
    this.ApplyAlpha = function (alpha) { }; // (GdiBitmap)

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {GdiBitmap} img
     *
     * @sourceFile ../../component/samples/basic/ApplyMask.js
     * @worker
     */
    this.ApplyMask = function (img) { }; // (boolean)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @return {GdiBitmap}
     * @worker
     */
    this.Clone = function (x, y, w, h) { }; // (GdiBitmap)

    /**
     * Create a DDB bitmap from GdiBitmap, which is used in {@link GdiGraphics#GdiDrawBitmap GdiDrawBitmap}
     *
     * @return {GdiRawBitmap}
     * @worker
     */
    this.CreateRawBitmap = function () { }; // (GdiRawBitmap)

    /**
     * Returns up to max_count representative colours found in the image.<br>
     * This is a legacy colour extraction method. For colour frequency information and
     * more advanced clustering, use {@link GdiBitmap#GetColourSchemeJSON GetColourSchemeJSON}
     * or {@link GdiBitmap#GetColourSchemeJSONV2 GetColourSchemeJSONV2}.
     *
     * @param {number} max_count maximum number of colours to return
     * @return {Array<number>}
     * @worker
     */
    this.GetColourScheme = function (max_count) { }; // (Array)

    /**
     * Extracts representative colours from the image using K-means clustering in the RGB colour space.<br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.<br>
     * Each entry contains a colour and its relative frequency in the clustered image.<br>
     * Uses a different method for calculating colours than {@link GdiBitmap#GetColourScheme GetColourScheme}.<br>
     * Image is automatically resized during processing for performance reasons so there's no
     * need to resize before calling the method.
     *
     * @param {number} max_count maximum number of colours to return
     * @return {string}
     *
     * @example
     * // See docs\Helpers.js for "toRGB" function.
     * img = ... // use utils.GetAlbumArtV2 / gdi.Image / etc
     * colours = JSON.parse(img.GetColourSchemeJSON(5));
     * console.log(colours[0].col); // 4290772992
     * console.log(colours[0].freq); // 0.34
     * console.log(toRGB(colours[0].col)); // [192, 0, 0]
     * @worker
     */
    this.GetColourSchemeJSON = function (max_count) { }; // (string)

    /**
     * Extracts representative colours from the image using K-means++ clustering in the Oklab colour space.<br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.<br>
     * Each entry contains a colour and its relative frequency in the clustered image.<br>
     * K-means++ initialization improves the distribution of the initial cluster centres, while Oklab
     * provides a perceptually more uniform distance metric than RGB.<br>
     * The optional min_chroma parameter limits the initial cluster centre selection to pixels with at
     * least the specified Oklab chroma. It does not filter pixels or colours from the clustering result.
     *
     * @param {number} max_count maximum number of colours to return
     * @param {number} [min_chroma=0.0] minimum Oklab chroma for pixels used as initial cluster centres
     * @return {string}
     *
     * @example
     * // See docs\Helpers.js for "toRGB" function.
     * img = ... // use utils.GetAlbumArtV2 / gdi.Image / etc
     * colours = JSON.parse(img.GetColourSchemeJSONV2(10, 0.02));
     * console.log(colours[0].col); // 4290772992
     * console.log(colours[0].freq); // 0.34
     * console.log(toRGB(colours[0].col)); // [192, 0, 0]
     * @worker
     */
    this.GetColourSchemeJSONV2 = function (max_count, min_chroma) { }; // (string)

    /**
     * Builds an image-derived UI colour scheme for styling interface surfaces, text and interaction states from the bitmap.<br>
     * <br>
     * The image is analysed in <b>OKLab</b> using the same weighted <b>K-means++</b> palette extraction as {@link GdiBitmap#GetColourSchemeJSONV2 GetColourSchemeJSONV2}</b>.<br>
     * The palette stage uses <b>paletteSize</b> centroids, after which colours are assigned to five semantic UI roles:<br>
     * <b>Background</b>, <b>Text</b>, <b>Playing background</b>, <b>Focus frame</b> and <b>Selection background</b>.<br>
     * <br>
     * The returned colours are unsigned 32-bit <b>ARGB</b> values.<br>
     * <b>Background</b> and <b>Text</b> are opaque.<br>
     * State colours may contain alpha and are intended to be composited over <b>Background</b>.<br>
     * <b>playingBackgroundColor</b> contains the Playing accent RGB together with the recommended alpha for a background highlight.<br>
     * The same RGB channels can also be used at full opacity for a solid Playing indicator.<br>
     * <br>
     * * The algorithm favours a representative image colour family for <b>Background</b>, prefers light body text unless the selected surface requires dark text, and uses independent image colour families for interaction/state accents when suitable candidates are available.<br>
     * <br>
     * Returns an empty object <b>{}</b> if a colour scheme cannot be generated.<br>
     * 
     * @param {number} [paletteSize=15] <b>Palette size.</b> Number of <b>K-means++</b> colour centroids used as the input palette.<br>
     * @returns {string} <b>JSON object string.</b> Contains <b>backgroundColor</b>, <b>textColor</b>, <b>playingBackgroundColor</b>, <b>focusFrameColor</b> and <b>selectionBackgroundColor</b>.<br>
     *
     * @example
     * const colours = JSON.parse(image.GetThemeColourSchemeJSON());
     *
     * if (Object.keys(colours).length) {
     *     const playingIndicatorColor =
     *         0xFF000000 | (colours.playingBackgroundColor & 0x00FFFFFF);
     *
     *     console.log(colours.backgroundColor);
     *     console.log(colours.textColor);
     *     console.log(colours.playingBackgroundColor);
     *     console.log(playingIndicatorColor);
     *     console.log(colours.focusFrameColor);
     *     console.log(colours.selectionBackgroundColor);
     * }
     * 
     * @sourceFile ../../component/samples/complete/theme colour scheme.js
     * @worker
     */
    this.GetThemeColourSchemeJSON = function (paletteSize) { }; // (string)
    
    /**
     * Note: don't forget to use {@link GdiBitmap#ReleaseGraphics ReleaseGraphics} after work on GdiGraphics is done!
     *
     * @return {GdiGraphics}
     * @worker
     */
    this.GetGraphics = function () { };

    /**
     * Extract raw pixels from bitmap as a byte array in specified pixel format
     *
     * @param {string} [format="bgra32"] Pixel format string (default: "bgra32")
     * Supported formats:<br>
     *   "bgra32"  32bpp BGRA<br>
     *   "rgba32"  32bpp RGBA<br>
     *   "bgr24"   24bpp BGR<br>
     *   "rgb24"   24bpp RGB<br>
     * @returns {Uint8Array} null if was an error (for example, bitmap in unsupported format or unsupported format specified)
     * @example
     * const img = gdi.Image(`${fb.ComponentPath}\\samples\\d2d\\images\\Field.jpg`);
     * 
     * let imgPixelData = img.GetPixelData();
     * 
     * utils.WriteBinaryFile("D:\\Field.bin", imgPixelData);
     * 
     * let rData = utils.ReadBinaryFile("D:\\Field.bin");
     * 
     * let rImg = gdi.CreateImageFromPixelData(rData, 2208, 1242);
     * 
     * function on_paint(gr) {
     *     gr.DrawImage(rImg, 0, 0, img.Width, img.Height, 0, 0, img.Width, img.Height);
     * }
     * @worker
     */
    this.GetPixelData = function(format) { };

    /**
     * Inverts the colours in a bitmap, to create a negative image.
     * i.e. White becomes black, black becomes white, etc.
     * @return {GdiBitmap}
     * @worker
     */
    this.InvertColours = function () { }; // (GdiBitmap)

    /**
     * @param {GdiGraphics} gr
     * @worker
     */
    this.ReleaseGraphics = function (gr) { }; // (GdiGraphics)

    /**
     * @param {number} w
     * @param {number} h
     * @param {number=} [mode=0] See {@link module:Flags.AlbumArtId InterpolationMode}
     * @return {GdiBitmap}
     * @worker
     */
    this.Resize = function (w, h, mode) { }; // (GdiBitmap) [, mode]

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {number} mode See {@link module:Flags.AlbumArtId RotateFlipType}
     * @worker
     */
    this.RotateFlip = function (mode) { }; // (void)

    /**
     * @param {string} path Full path including file extension. The parent folder must already exist.
     * @param {string=} [format='image/png']
     *      "image/png"<br>
     *      "image/bmp"<br>
     *      "image/jpeg"<br>
     *      "image/gif"<br>
     *      "image/tiff"
     * @return {boolean}
     *
     * @example
     * let img = utils.GetAlbumArtEmbedded(fb.GetFocusItem().RawPath, 0);
     * if (img) {
     *     img.SaveAs("D:\\export.jpg", "image/jpeg");
     * }
     * @worker
     */
    this.SaveAs = function (path, format) { }; // (boolean) [, format]

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {number} radius Valid values 2-254.
     *
     * @example <caption>Blur image<caption>
     * // `samples/basic/StackBlur (image).js`
     *
     * @example <caption>Blur text<caption>
     * // `samples/basic/StackBlur (text).js`
     * @worker
     */
    this.StackBlur = function (radius) { }; // (void)
}

/**
 * Constructor may fail if font is not present.<br>
 *
 * Performance note: try caching and reusing `GdiFont` objects,
 * since the maximum amount of such objects is hard-limited by Windows.
 * `GdiFont` creation will fail after reaching this limit.
 * @cloneable
 * @constructor
 * @param {string} name
 * @param {number} size_px See {@link module:Helpers.Point2Pixel Point2Pixel} function for conversions
 * @param {number=} [style=0] See {@link module:Flags.FontStyle FontStyle} flags
 * @worker
 */
function GdiFont(name, size_px, style) {
    /**
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(my_font.Height); // 15
     * @worker
     */
    this.Height = undefined;//    (uint)(read)

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(my_font.Name); // Segoe UI
     * @worker
     */
    this.Name = undefined;//    (string)(read)

    /**
     * @type {float}
     * @readonly
     *
     * @example
     * console.log(my_font.Size); // 12
     * @worker
     */
    this.Size = undefined;//    (float)(read)

    /**
     * See {@link module:Flags.FontStyle FontStyle} flags for value interpretation.
     *
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(my_font.Style);
     * @worker
     */
    this.Style = undefined;//    (uint)(read)

    /**
     * Font weight. Common values follow Win32 font weights, for example 400 for normal and 700 for bold.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Weight = undefined;
}

/**
 * Object used for drawing as alternative for simple colour.<br>
 * Can also be used to reuse brushes for drawing instead of creating them every time for any primitive drawing operation (if just a color is specified in the Draw/Fill methods, a brush is always created).<br>
 * Created by {@link gdi.Brush}
 * @constructor
 * @param {GdiBrush} arg
 * @cloneable
 * @sourceFile ../../component/samples/basic/Brushes.js
 * @worker
 */
function GdiBrush(arg) {

    /**
     * Brush type.<br>
     * See {@link module:Flags.BrushType BrushType}
     * @type {BrushType}
     * @readonly
     * @worker
     */
    this.Type = undefined;// (uint) (read)

    /**
     * Wrap mode responsible for how the brush gradient or image is repeated when drawing<br>
     * See {@link module:Flags.BrushWrapMode BrushWrapMode}
     * @type {BrushWrapMode} 
     * @readonly
     * @worker
     */
    this.WrapMode = undefined;// (uint) (read, write)

    /**
     * Applies translation matrix to the current GdiBrush matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-translation(d2d1_size_f)}
     *
     * @param {number} dx
     * @param {number} dy
     * @worker
     */
    this.Translate = function(dx, dy) {}

    /**
     * Applies rotation matrix to the current GdiBrush matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-rotation}
     *
     * @param {float} angle Angle of rotation in degrees
     * @param {number=} [cx=0] Rotation center point x coord
     * @param {number=} [cy=0] Rotation center point y coord
     * @worker
     */
    this.Rotate = function(angle, cx, cy) {}

    /**
     * Applies scale matrix to the current GdiBrush matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-scale(d2d1_size_f_d2d1_point_2f)}
     *
     * @param {float} sx The x-axis scale factor
     * @param {float=} [sy=0] The y-axis scale factor. If zero sx will be used as sy
     * @param {number=} [cx=0] Scale center point x coord
     * @param {number=} [cy=0] Scale center point y coord
     * @worker
     */
    this.Scale = function(sz, sy, cx, cy) {}
    
    /**
     * Applies skew matrix to the current GdiBrush matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-skew}
     *
     * @param {float} angleX The x-axis skew angle, which is measured in degrees counterclockwise from the y-axis.
     * @param {float} angleY The y-axis skew angle, which is measured in degrees clockwise from the x-axis.
     * @param {number=} [cx=0] Skew center point x coord
     * @param {number=} [cy=0] Skew center point y coord
     * @worker
     */
    this.Skew = function(angleX, angleY, cx, cy) {}

    /**
     * Saves current GdiBrush matrix in internal stack. To restore the matrix use {@link GdiGraphics#PopTransform PopTransform}.
     * @worker
     */
    this.PushTransform = function() {}

    /**
     * Restores GdiBrush matrix from internal stack pushed previously by {@link GdiGraphics#PushTransform PushTransform}.
     * @worker
     */
    this.PopTransform = function() {}

    /**
     * Gets GdiBrush current transformation matrix of 3x2 size (Float32Array(6))<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @return {Float32Array}
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.GetTransform = function() {}

    /**
     * Replaces the current GdiBrush matrix with specified transformation matrix of 3x2 size.<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.SetTransform = function(matrix) {}

    /**
     * Resets current GdiBrush matrix to original identity matrix.
     * @worker
     */
    this.ResetTransform = function () {}

    /**
     * Applies specified transformation matrix of 3x2 size to the current GdiBrush matrix.<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.ApplyTransform = function(matrix) {}    
}

/**
 * Typically used inside `on_paint`.<br>
 *
 * Note: there are many different ways to get colours:
 * window.GetColourDUI/window.GetColourCUI,
 * RGB function from Helpers.js, utils.ColourPicker and
 * etc.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function GdiGraphics() {
    /**
     * Calculates text height for {@link GdiGraphics#GdiDrawText GdiDrawText}.<br>
     * Note: this will only calculate the text height of one line.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @return {number}
     * @worker
     */
    this.CalcTextHeight = function (str, font) { }; // (uint)

    /**
     * Calculates text width for {@link GdiGraphics#GdiDrawText GdiDrawText}.
     * 
     * Note: When the str contains a kerning pair that is found in the specified 
     * font, the return value will be larger than the actual drawn width of the
     * text. If accurate values are required, set use_exact to true.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {boolean=} [use_exact=false] Uses a slower, but more accurate method of calculating text width which accounts for kerning pairs.  
     * @return {number}
     * @worker
     */
    this.CalcTextWidth = function (str, font, use_exact) { }; // (uint)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawEllipse = function (x, y, w, h, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {GdiBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {float=} [angle=0]
     * @param {number=} [alpha=255] Valid values 0-255.
     * @worker
     */
    this.DrawImage = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, angle, alpha) { }; // (void) [, angle][, alpha]

    /**
     * Compatibility alias of {@link GdiGraphics#DrawImage DrawImage}.
     *
     * @param {GdiBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @worker
     */
    this.DrawBitmap = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) { };

    /**
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawLine = function (x1, y1, x2, y2, line_width, colour_or_brush) { }; // (void)

    /**
     * Draws a connected sequence of lines.
     *
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} line_width
     * @param {Array<number>} points array of connected points [x1, y1, x2, y2, ...]
     * @worker
     */
    this.DrawLines = function (colour_or_brush, line_width, points) { };

    /**
     * Draws a connected sequence of lines with connection of last and first points (unlike {@link GdiGraphics#DrawLines DrawLines}).
     * 
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} line_width
     * @param {Array<number>} points array of connected points [x1, y1, x2, y2, ...]
     * @worker
     */
    this.DrawPolygon = function (colour_or_brush, line_width, points) { }; // (void)

    /**
     * Should be only used when {@link GdiGraphics#GdiDrawText GdiDrawText} is not applicable.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See {@link module:Flags.StringFormatFlags StringFormatFlags} flags
     * @worker
     */
    this.DrawString = function (str, font, colour_or_brush, x, y, w, h, flags) { }; // (void) [, flags]

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawRect = function (x, y, w, h, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawRoundRect = function (x, y, w, h, arc_width, arc_height, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} max_width
     * @return {Array<Array>}
     *    index | meaning <br>
     *    [0] text line 1 <br>
     *    [1] width of text line 1 (in pixel) <br>
     *    [2] text line 2 <br>
     *    [3] width of text line 2 (in pixel) <br>
     *    ... <br>
     *    [2n + 2] text line n <br>
     *    [2n + 3] width of text line n (px)
     * @worker
     */
    this.EstimateLineWrap = function (str, font, max_width) { }; // (Array)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillEllipse = function (x, y, w, h, colour_or_brush) { }; // (void)

    /**
     * Note: this may appear buggy depending on rectangle size. The easiest fix is
     * to adjust the "angle" by a degree or two.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {float} angle
     * @param {number} colour1
     * @param {number} colour2
     * @param {float} [focus=1.0] Specify where the centred colour will be at its highest intensity. Valid values between 0 and 1.
     * @worker
     */
    this.FillGradRect = function (x, y, w, h, angle, colour1, colour2, focus) { }; // (void) [, focus]

    /**
     * Fills rect with gradient in arbitrary quantity of stops.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {float} angle
     * @param {Array} stops Specifies gradient stops in form of [pos0, argb0, ..., posN, argbN]
     * @example
     * dgr.FillGradRectV2(10, 10, 200, 100, 0, [0.0, 0xFF0000FF, 0.5, 0xFFFF0000, 1.0, 0xFF000000]);
     * @worker
     */
    this.FillGradRectV2 = function (x, y, w, h, angle, stops) { };

    /**
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} fillmode 0 alternate, 1 winding.
     * @param {Array<Array<number>>} points
     * @worker
     */
    this.FillPolygon = function (colour_or_brush, fillmode, points) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillRoundRect = function (x, y, w, h, arc_width, arc_height, colour_or_brush) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillSolidRect = function (x, y, w, h, colour_or_brush) { }; // (void)

    /**
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {number=} [alpha=255] Valid values 0-255.
     * @worker
     */
    this.GdiAlphaBlend = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, alpha) { }; // (void) [, alpha]

    /**
     * Always faster than {@link GdiGraphics#DrawImage DrawImage}, does not support alpha channel.
     *
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @worker
     */
    this.GdiDrawBitmap = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) { }; // (void)

    /**
     * Provides faster and better rendering than {@link GdiGraphics#DrawString DrawString}.<br>
     * <br>
     * Do not use this to draw text on transparent background or
     * with GdiGraphics other than the one passed in {@link module:Callbacks.on_paint on_paint} callback:
     * this will result in visual artifacts caused by ClearType hinting.<br>
     * Use {@link GdiGraphics#DrawString DrawString} instead in such cases.<br>
     * <br>
     * To calculate text dimensions use {@link GdiGraphics#CalcTextHeight CalcTextHeight}, {@link GdiGraphics#CalcTextWidth CalcTextWidth}.<br>
     * <br>
     * Note: uses special rules for `&` character by default, which consumes the `&` and causes the next character to be underscored.
     * This behaviour can be changed (or disabled) via `format` parameter.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [format=0] See flags like {@link module:Flags.DT_LEFT DT_LEFT}
     * @worker
     */
    this.GdiDrawText = function (str, font, colour, x, y, w, h, format) { };

    /**
     * Alias of {@link GdiGraphics#GdiDrawText GdiDrawText}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [format=0]
     * @worker
     */
    this.DrawText = function (str, font, colour, x, y, w, h, format) { };

    /**
     * Calculates text dimensions for {@link GdiGraphics#DrawString DrawString}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See {@link module:Flags.StringFormatFlags StringFormatFlags} flags
     * @return {MeasureStringInfo}
     * @worker
     */
    this.MeasureString = function (str, font, x, y, w, h, flags) { }; // (MeasureStringInfo) [, flags]

     /**
     * Pushes a rectangular clipping region onto the clip stack.<br>
     * The new clipping region is intersected with the current clipping region.<br>
     * Calls may be nested and should be paired with {@link GdiGraphics#PopClip PopClip}.<br>
     * The current transform and other graphics state are not affected.
     *
     * @param {number} x left coordinate of the clipping rectangle
     * @param {number} y top coordinate of the clipping rectangle
     * @param {number} width width of the clipping rectangle
     * @param {number} height height of the clipping rectangle
      * @worker
     */
    this.PushClip = function(x, y, width, height) { };

    /**
     * Restores the clipping region that was active before the matching {@link GdiGraphics#PushClip PushClip} call.<br>
     * Does nothing if the clip stack is empty.<br>
     * The current transform and other graphics state are not affected.
     * @worker
     */
    this.PopClip = function() { };

    /**
     * Applies translation matrix to the current GdiGraphics matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-translation(d2d1_size_f)}
     *
     * @param {number} dx
     * @param {number} dy
     * @worker
     */
    this.Translate = function(dx, dy) {}

    /**
     * Applies rotation matrix to the current GdiGraphics matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-rotation}
     *
     * @param {float} angle Angle of rotation in degrees
     * @param {number=} [cx=0] Rotation center point x coord
     * @param {number=} [cy=0] Rotation center point y coord
     * @worker
     */
    this.Rotate = function(angle, cx, cy) {}

    /**
     * Applies scale matrix to the current GdiGraphics matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-scale(d2d1_size_f_d2d1_point_2f)}
     *
     * @param {float} sx The x-axis scale factor
     * @param {float=} [sy=0] The y-axis scale factor. If zero sx will be used as sy
     * @param {number=} [cx=0] Scale center point x coord
     * @param {number=} [cy=0] Scale center point y coord
     * @worker
     */
    this.Scale = function(sz, sy, cx, cy) {}
    
    /**
     * Applies skew matrix to the current GdiGraphics matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-skew}
     *
     * @param {float} angleX The x-axis skew angle, which is measured in degrees counterclockwise from the y-axis.
     * @param {float} angleY The y-axis skew angle, which is measured in degrees clockwise from the x-axis.
     * @param {number=} [cx=0] Skew center point x coord
     * @param {number=} [cy=0] Skew center point y coord
     * @worker
     */
    this.Skew = function(angleX, angleY, cx, cy) {}

    /**
     * Saves current GdiGraphics matrix in internal stack. To restore the matrix use {@link GdiGraphics#PopTransform PopTransform}.
     * @worker
     */
    this.PushTransform = function() {}

    /**
     * Restores current GdiGraphics matrix from internal stack pushed previously by {@link GdiGraphics#PushTransform PushTransform}.
     * @worker
     */
    this.PopTransform = function() {}

    /**
     * Gets GdiGraphics current transformation matrix of 3x2 size (Float32Array(6))
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @return {Float32Array}
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.GetTransform = function() {}

    /**
     * Replaces the current GdiGraphics matrix with specified transformation matrix of 3x2 size.<br>
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.SetTransform = function(matrix) {}

    /**
     * Resets current GdiGraphics matrix to original identity matrix.
     * @worker
     */
    this.ResetTransform = function () {}

    /**
     * Applies specified transformation matrix of 3x2 size to the current GdiGraphics matrix.<br>
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.ApplyTransform = function(matrix) {}

    /**
     * @constructor
     * @hideconstructor
     *
     * @example
     * include(`${fb.ComponentPath}docs\\Flags.js`);
     * include(`${fb.ComponentPath}docs\\Helpers.js`);
     *
     * let sf = StringFormat(StringAlignment.Near, StringAlignment.Near);
     * let text = utils.ReadTextFile("z:\\info.txt");
     * let font = window.GetFontDUI(0);
     *
     * function on_paint(gr) {
     *     gr.DrawString(text, font, RGB(255, 0, 0), 0, 0, window.Width, window.Height, sf);
     *     let temp = gr.MeasureString(text, font, 0, 0, window.Width, 10000, sf);
     *     // If we want to calculate height, we must set the height to be far larger than what
     *     // the text could possibly be.
     *
     *     console.log(temp.Height); // 2761.2421875 // far larger than my panel height!
     *     console.log(temp.Chars); // 7967
     * }
     * @worker
     * @cloneable
     */
    function MeasureStringInfo() {

        /**
         * @type {number}
         * @readonly
         * @worker
         */
        this.Chars = undefined; // (uint) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Height = undefined; // (float) (read)

        /**
         * @type {number}
         * @readonly
         * @worker
         */
        this.Lines = undefined; // (uint) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.X = undefined; // (float) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Y = undefined; // (float) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Width = undefined; // (float) (read)
    }

    /**
     * @param {number=} [mode=0] See {@link module:Flags.InterpolationMode InterpolationMode} enum
     * @worker
     */
    this.SetInterpolationMode = function (mode) { }; // (void)

    /**
     * @param {number=} [mode=0] See {@link module:Flags.SmoothingMode SmoothingMode} enum
     * @worker
     */
    this.SetSmoothingMode = function (mode) { }; // (void)

    /**
     * @param {number=} [mode=0] See {@link module:Flags.TextRenderingHint TextRenderingHint} enum
     * @worker
     */
    this.SetTextRenderingHint = function (mode) { }; // (void)

    /**
     * Currect width of device context surface.
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = 640;
    /**
     * Currect height of device context surface.
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = 480;
}

/**
 * @constructor
 * @hideconstructor
 * @worker
 */
function GdiRawBitmap() {

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = undefined; // (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = undefined; // (uint) (read)
}

/**
 * @constructor
 * @hideconstructor
 */
function DropTargetAction() {

    /** @type {number} */
    this.Base = undefined; // (write)

    /**
     * See {@link https://docs.microsoft.com/en-us/windows/win32/com/dropeffect-constants}
     *
     * @type {number}
     */
    this.Effect = undefined; //(read, write)

    /**
     * Active playlist.<br>
     * -1 by default.<br>
     * <br>
     * Note: property is write-only.
     *
     * @type {number}
     */
    this.Playlist = undefined; // (write)

    /**
     * The tooltip text that is displayed during dragging.<br>
     * If the property is not modified, then default tooltip text will be used.
     * <br>
     * Note: property is write-only.
     *
     * @type {string}
     */
    this.Text = undefined; // (write)

    /**
     * Note: property is write-only.
     *
     * @type {boolean}
     */
    this.ToSelect = undefined; // (boolean) (write)

    /**
     * True, if the drag session was started by {@link fb.DoDragDrop}.
     * False, otherwise.
     * 
     * @type {boolean}
     * @readonly
     */
    this.IsInternal = undefined;
}

/**
 * @constructor
 * @hideconstructor
 */
function ContextMenuManager() {
    /**
     * @param {MenuObject} menu_obj
     * @param {number} base_id
     * @param {number=} [max_id=-1]
     */
    this.BuildMenu = function (menu_obj, base_id, max_id) { }; // (void)

    /**
     * @param {number} id
     * @return {boolean}
     */
    this.ExecuteByID = function (id) { }; // (boolean)

    /**
     * Initializes context menu by supplied tracks.
     *
     * @param {FbMetadbHandleList} handle_list
     */
    this.InitContext = function (handle_list) { }; // (void)

    /**
     * Shows playlist specific options that aren't available when passing a
     * handle list to {@link ContextMenuManager#InitContext InitContext}.
     */
    this.InitContextPlaylist = function () { }; // (void)

    /**
     * Initializes context menu by currently played track.
     *
     * @method
     */
    this.InitNowPlaying = function () { }; // (void)
}

/**
 * @constructor
 * @hideconstructor
 */
function MainMenuManager() {
    /**
     * @param {MenuObject} menu_obj
     * @param {number} base_id
     * @param {number} count
     */
    this.BuildMenu = function (menu_obj, base_id, count) { }; // (void)

    /**
     * @param {number} id
     * @return {boolean}
     */
    this.ExecuteByID = function (id) { }; // (boolean)

    /**
     * @param {string} root_name Must be one of the following: 'file', 'view', 'edit', 'playback', 'library', 'help'
     */
    this.Init = function (root_name) { }; // (void)
}

/**
 * @constructor
 * @hideconstructor
 */
function MenuObject() {

    /**
     * @param {number} flags See flags like {@link module:Flags.MF_SEPARATOR MF_SEPARATOR}
     * @param {number} item_id Integer greater than 0. Each menu item needs a unique id.
     * @param {string} text
     */
    this.AppendMenuItem = function (flags, item_id, text) { }; // (void)

    /** @method */
    this.AppendMenuSeparator = function () { }; // (void)

    /**
     * @param {MenuObject} parent_menu
     * @param {number} flags See flags like {@link module:Flags.MF_SEPARATOR MF_SEPARATOR}
     * @param {string} text
     */
    this.AppendTo = function (parent_menu, flags, text) { }; // (void)

    /**
     * @param {number} item_id
     * @param {boolean} check
     */
    this.CheckMenuItem = function (item_id, check) { }; // (void)

    /**
     * @param {number} first_item_id
     * @param {number} last_item_id
     * @param {number} selected_item_id
     */
    this.CheckMenuRadioItem = function (first_item_id, last_item_id, selected_item_id) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number=} [flags=0] See flags like {@link module:Flags.TPM_LEFTALIGN TPM_LEFTALIGN}
     * @return {number}
     */
    this.TrackPopupMenu = function (x, y, flags) { }; // (uint) [, flags]
}

/**
 * @constructor
 * @hideconstructor
 */
function ThemeManager() {
    /**
     * @param {GdiGraphics} gr
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [clip_x=0]
     * @param {number=} [clip_y=0]
     * @param {number=} [clip_w=0]
     * @param {number=} [clip_h=0]
     */
    this.DrawThemeBackground = function (gr, x, y, w, h, clip_x, clip_y, clip_w, clip_h) { }; // (void) [, clip_x][, clip_y][, clip_w][, clip_h]

    /**
     * @param {number} partid
     * @return {boolean}
     */
    this.IsThemePartDefined = function (partid) { }; // (boolean)

    /**
     * See {@link https://docs.microsoft.com/en-us/windows/win32/controls/parts-and-states}
     *
     * @param {number} partid
     * @param {number=} [stateid=0]
     */
    this.SetPartAndStateID = function (partid, stateid) { }; // (void)
}

/**
 * Object returned by {@link utils.Run}.<br>
 *
 * @constructor
 * @hideconstructor
 * @worker
 * @cloneable
 */
function RunResult() {

    /**
     * High-level operation result.<br>
     * If wait=false, true means that ShellExecuteEx accepted the shell request.<br>
     * If wait=true and a process exit code is available, true means that the process exited with code 0.<br>
     * A non-zero process exit code is reported as OK=false, while Win32Error usually remains 0.<br>
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.OK = false;

    /**
     * Process exit code.<br>
     * This value is meaningful when wait=true and the launched process handle was available.<br>
     * If wait=false, this value is usually 0.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.ExitCode = 0;

    /**
     * Win32 error code returned by GetLastError, or an internally assigned Win32 error code.<br>
     * This is 0 on success.<br>
     * If OK=false and Win32Error is 0, the process was usually started successfully but returned a non-zero ExitCode.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Win32Error = 0;

    /**
     * Native ShellExecuteEx result code.<br>
     * Values greater than 32 usually indicate a successful shell-level operation.<br>
     * Values less than or equal to 32 indicate a shell-level error, such as file not found, access denied, no association, or invalid executable format.<br>
     * This value describes the shell operation itself, not the launched process exit code.<br>
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.ShellCode = 0;
}

/**
 * Object returned by {@link utils.ParseHtml}<br>
 *<br>
 * Lightweight DOM-like HTML document backed by the native HTML parser.<br>
 *<br>
 * Notes:<br>
 * - This is not a full browser DOM.<br>
 * - Scripts, CSS, layout, external resources and browser events are not processed.<br>
 * - <b>innerText</b> is currently an alias of <b>textContent</b>.<br>
 *
 * @hideconstructor
 * @worker
 */
class HtmlDocument {
    /**
     * Root document element, usually the &lt;html&gt; element.<br>
     * Alias of {@link HtmlDocument#documentElement documentElement}.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body>Hello</body></html>");
     * if (doc) console.log(doc.root.tagName); // "html"
     * @worker
     */
    root = undefined; // (read)

    /**
     * Root document element, usually the &lt;html&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body>Hello</body></html>");
     * if (doc) console.log(doc.documentElement.tagName); // "html"
     * @worker
     */
    documentElement = undefined; // (read)

    /**
     * The document &lt;head&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><head><title>Test</title></head></html>");
     * if (doc && doc.head) console.log(doc.head.innerHTML); // "<title>Test</title>"
     * @worker
     */
    head = undefined; // (read)

    /**
     * The document &lt;body&gt; element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello</p></body></html>");
     * if (doc && doc.body) console.log(doc.body.innerHTML); // "<p>Hello</p>"
     * @worker
     */
    body = undefined; // (read)

    /**
     * Text content of the document body.<br>
     * If the document has no body, this falls back to the root element text.<br>
     * Whitespace is returned as it exists in the parsed text nodes.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello <b>world</b></p></body></html>");
     * if (doc) console.log(doc.textContent); // "Hello world"
     * @worker
     */
    textContent = undefined; // (read)

    /**
     * Alias of {@link HtmlDocument#textContent textContent}.<br>
     * Since this parser has no browser layout engine, <b>innerText</b> does not emulate CSS visibility, rendered line wrapping, or layout-dependent text extraction.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    innerText = undefined; // (read)

    /**
     * Serialized HTML markup inside the document body.<br>
     * If the document has no body, this falls back to the root element.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello <b>world</b></p></body></html>");
     * if (doc) console.log(doc.innerHTML); // "<p>Hello <b>world</b></p>"
     * @worker
     */
    innerHTML = undefined; // (read)

    /**
     * Serialized outer HTML of the root element.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p>Hello</p></body></html>");
     * if (doc) console.log(doc.outerHTML); // "<html><head></head><body><p>Hello</p></body></html>"
     * @worker
     */
    outerHTML = undefined; // (read)

    /**
     * Returns the first element matching a CSS selector.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {?HtmlNode} First matching node, or `null` if nothing matches.
     *
     * @example
     * let doc = utils.ParseHtml("<html><body><p class='name'>Test Artist</p></body></html>");
     * let node = doc ? doc.querySelector(".name") : null;
     * if (node) console.log(node.textContent); // "Test Artist"
     * @worker
     */
    querySelector = function (selector) { }; //

    /**
     * Returns all elements matching a CSS selector.<br>
     * The returned value is a regular JavaScript array.
     *
     * @method
     * @param {string} selector CSS selector.
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * let doc = utils.ParseHtml("<ul><li class='album'>A</li><li class='album'>B</li></ul>");
     * let albums = doc ? doc.querySelectorAll(".album") : [];
     * console.log(albums.length); // 2
     * @worker
     */
    querySelectorAll = function (selector) { }; //

    /**
     * Returns all descendant elements with the specified tag name.<br>
     * Use "*" to return all descendant elements.
     * 
     * @method
     * @param {string} tagName Tag name, for example "a", "div", "section" or "*".
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<p><a href='https://example.com'>Link</a></p>");
     * const links = doc ? doc.getElementsByTagName("a") : [];
     * console.log(links.length); // 1
     * @worker
     */
    getElementsByTagName = function (tagName) { }; //
}

/**
 * Lightweight DOM-like HTML node.<br>
 *<br>
 * HtmlNode can represent an element node, text node, comment node, or another parsed DOM node type. Some operations, such as attributes and class checks, only make sense for element nodes.<br>
 * <b>NOTE</b>: HtmlNode objects keep the underlying native document alive while they exist.
 *
 * @hideconstructor
 * @worker
 */
class HtmlNode {
    /**
     * Whether this node is an element node.<br>
     * Element nodes are tags such as &lt;div&gt;, &lt;a&gt;, &lt;p&gt;, &lt;body&gt;.<br>
     * Text nodes and comments are not element nodes.
     *
     * @type {boolean}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc ? doc.querySelector("p") : null;
     * if (p) {
     *     console.log(p.isElement); // true
     *     console.log(p.firstChild ? p.firstChild.isElement : null); // false
     * }
     * @worker
     */
    isElement = undefined; // (read)

    /**
     * Lowercase tag name for element nodes.<br>
     * For non-element nodes, this is an empty string.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<BODY><P>Hello</P></BODY>");
     * if (doc) console.log(doc.body.tagName); // "body"
     * @worker
     */
    tagName = undefined; // (read)

    /**
     * Value of the <b>class</b> attribute.<br>
     * For non-element nodes, or elements without a class attribute, this is an empty string.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p class='album featured'>Title</p>");
     * if (doc) {
     *     const p = doc.querySelector("p");
     *     console.log(p.className); // "album featured"
     * }
     * @worker
     */
    className = undefined; // (read)

    /**
     * Text content of this node and its descendants.<br>
     * Whitespace is returned as it exists in parsed text nodes.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * if (doc) {
     *     const p = doc.querySelector("p");
     *     console.log(p ? p.textContent : null); // "Hello world"
     * }
     * @worker
     */
    textContent = undefined; // (read)

    /**
     * Alias of {@link HtmlNode#textContent textContent}.<br>
     * Since this parser has no browser layout engine, <b>innerText</b> does not emulate CSS visibility, rendered line wrapping, or layout-dependent text extraction.
     *
     * @type {string}
     * @readonly
     * @worker
     */
    innerText = undefined; // (read)

    /**
     * Serialized HTML markup inside this node.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.innerHTML); // "Hello <b>world</b>"
     * @worker
     */
    innerHTML = undefined; // (read)

    /**
     * Serialized HTML markup of this node itself.
     *
     * @type {string}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.outerHTML); // "<p>Hello <b>world</b></p>"
     * @worker
     */
    outerHTML = undefined; // (read)

    /**
     * First child node.<br>
     * <b>Important</b>: this can be a text node or comment, not necessarily an element.<br>
     * Whitespace-only text nodes are preserved. Use JSON.stringify(node.textContent) while debugging if you need to see line breaks, tabs, and spaces explicitly.
     *
     * Use {@link HtmlNode#children children}[0] or {@link HtmlNode#querySelector querySelector}
     * when you need an element.
     *
     * @type {?HtmlNode}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<li>text before link <a href='https://example.com'>Link</a></li>");
     * const li = doc.querySelector("li");
     *
     * console.log(JSON.stringify(li.firstChild.textContent)); // "text before link "
     *
     * const a = li.querySelector("a");
     * console.log(a.getAttribute("href")); // "https://example.com"
     * @worker
     */
    firstChild = undefined; // (read)

    /**
     * All child nodes, including element nodes, text nodes and comments.
     *
     * @type {Array<HtmlNode>}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.childNodes.length); // 2
     * @worker
     */
    childNodes = undefined; // (read)

    /**
     * Child element nodes only.<br>
     * Text nodes and comments are skipped.
     *
     * @type {Array<HtmlNode>}
     * @readonly
     *
     * @example
     * const doc = utils.ParseHtml("<p>Hello <b>world</b></p>");
     * const p = doc.querySelector("p");
     * console.log(p.children.length); // 1
     * console.log(p.children[0].tagName); // "b"
     * @worker
     */
    children = undefined; // (read)

    /**
     * Returns an attribute value.<br>
     * For missing attributes or non-element nodes, returns an empty string.
     * 
     * @method
     * @param {string} name Attribute name.
     * @return {string} Attribute value, or empty string.
     *
     * @example
     * const doc = utils.ParseHtml("<a href='https://example.com'>Link</a>");
     * const a = doc.querySelector("a");
     * console.log(a.getAttribute("href")); // "https://example.com"
     * @worker
     */
    getAttribute = function (name) { }; //

    /**
     * Checks whether an element has an attribute.<br>
     * For non-element nodes, returns false.
     * 
     * @method
     * @param {string} name Attribute name.
     * @return {boolean}
     *
     * @example
     * const doc = utils.ParseHtml("<a href='https://example.com'>Link</a>");
     * const a = doc.querySelector("a");
     * console.log(a.hasAttribute("href")); // true
     * console.log(a.hasAttribute("title")); // false
     * @worker
     */
    hasAttribute = function (name) { }; //

    /**
     * Checks whether the element has a CSS class token.<br>
     * This checks class tokens, not arbitrary substrings.<br>
     * For example, <b>hasClass("album")</b> matches <b>class="album featured"</b>, but not <b>class="album-list"</b>.<br>
     * For non-element nodes, returns false.<br>
     * 
     * @method
     * @param {string} className Class token to check.
     * @return {boolean}
     *
     * @example
     * const doc = utils.ParseHtml("<li class='album featured'>Title</li>");
     * const li = doc.querySelector("li");
     *
     * console.log(li.hasClass("album")); // true
     * console.log(li.hasClass("featured")); // true
     * console.log(li.hasClass("album-list")); // false
     * @worker
     */
    hasClass = function (className) { }; //

    /**
     * Returns the first descendant element matching a CSS selector.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {?HtmlNode} First matching node, or `null` if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<li>text <a href='https://example.com'>Link</a></li>");
     * const li = doc.querySelector("li");
     * const a = li.querySelector("a[href]");
     *
     * if (a) {
     *     console.log(a.getAttribute("href")); // "https://example.com"
     * }
     * @worker
     */
    querySelector = function (selector) { }; //

    /**
     * Returns all descendant elements matching a CSS selector.<br>
     * The returned value is a regular JavaScript array.
     * 
     * @method
     * @param {string} selector CSS selector.
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<ul><li class='album'>A</li><li class='album featured'>B</li></ul>");
     * const list = doc.querySelector("ul");
     * const albums = list.querySelectorAll(".album");
     *
     * console.log(albums.length); // 2
     * @worker
     */
    querySelectorAll = function (selector) { }; //

    /**
     * Returns all descendant elements with the specified tag name.<br>
     * Use "*" to return all descendant elements.
     * 
     * @method
     * @param {string} tagName Tag name, for example "a", "div", "section" or "*".
     * @return {Array<HtmlNode>} Array of matching nodes. Empty array if nothing matches.
     *
     * @example
     * const doc = utils.ParseHtml("<p><a href='https://example.com'>One</a><a href='/two'>Two</a></p>");
     * const p = doc.querySelector("p");
     * const links = p.getElementsByTagName("a");
     *
     * console.log(links.length); // 2
     * @worker
     */
    getElementsByTagName = function (tagName) { }; //
}
