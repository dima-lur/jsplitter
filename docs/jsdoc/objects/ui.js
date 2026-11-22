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
     * Sets a menu item or submenu as the default item. The default item is displayed in bold.<br>
     * Calling this method again changes the default item.<br>
     * Only one item can be set as the default for each menu object.
     *
     * @param {number|MenuObject} item Menu item id or a submenu appended directly to this menu.
     * @throws {Error} If the specified menu item does not exist or the submenu does not belong directly to this menu.
     */
    this.SetDefault = function (item) { }; // (void)

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

