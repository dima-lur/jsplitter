/**
 * Audio-stream descriptor returned by {@link fb.GetAudioStreams}.
 *
 * @typedef {Object} AudioStreamInfo
 * @property {number} index
 *    Zero-based stream index used by {@link fb.SetAudioStream}.
 * @property {FbFileInfo} info
 *    Full metadata and technical information reported by the input decoder for this stream.
 * @property {boolean} default
 *    True when this is the input decoder's default stream.
 * @property {boolean} selected
 *    True when this is the effective selected stream. A saved user preference takes precedence over the decoder default.
 */

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
     * @sourceFile ../../component/samples/basic/FbWindow.js
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
     * It will return a value of -1 when using a normal device and that also indicates that {@link fb.Volume Volume} is writable.<br>
     * When a custom volume control is active, you can not use {@link fb.Volume Volume} and must use {@link fb.VolumeUp VolumeUp} / {@link fb.VolumeDown VolumeDown} / {@link fb.VolumeMute VolumeMute}.
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
     * @throws {Error} If the assigned value is not a valid replay gain mode.
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
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. URLs and foobar2000 URI paths are passed through unchanged. Each filesystem location is resolved before the asynchronous operation starts.
     *
     * @param {Array<string>} locations must be an array of strings and it can contain file paths, playlists or urls.
     * @return {number} task id (see first parameter of {@link module:Callbacks.on_locations_added on_locations_added})
     * 
     * @throws {Error} If called before foobar2000 is fully initialized.
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
     * with {@link fb.GetClipboardContents GetClipboardContents}.
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
     * @throws {Error} If <b>handle_list</b> is null.
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
     *      use only {@link fb.DoDragDrop DoDragDrop}(handles, DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
     * - If you need only to receive drop to your panel with copy:
     *      handle <b>on_drop_*()</b> callbacks, while setting action.effect argument to (DROPEFFECT_COPY | DROPEFFECT_LINK).<br>
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
     * Note: due to the asynchronous nature of event handling, {@link fb.DoDragDrop DoDragDrop} might exit before {@link module:Callbacks.on_drag_drop on_drag_drop} callback is triggered
     * when dropping data on the same panel as the one that had a call to {@link fb.DoDragDrop DoDragDrop}.<br>
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
     * @throws {Error} If <b>handle_list</b> is null, <b>options</b> is not an object, or the panel host is not fully initialized.
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
     * <b>FullPath</b>: string, the same full path you'd supply to {@link fb.RunMainMenuCommand RunMainMenuCommand}<br>
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
     * Returns the audio streams exposed by the input decoder for <b>handle</b> as array of {@link AudioStreamInfo} objects.<br>
     * Returns an empty array when the file's input decoder does not expose stream information.
     * Related methods: {@link fb.SetAudioStream SetAudioStream}.
     *
     * @param {FbMetadbHandle} handle
     * @return {Array<AudioStreamInfo>}
     *
     * @throws {Error} If <b>handle</b> is null or foobar2000&apos;s input stream selector is unavailable.
     * @example
     * const handle = fb.GetFocusItem();
     * if (handle) {
     *     const streams = fb.GetAudioStreams(handle);
     *     for (const stream of streams) {
     *         console.log(`#${stream.index}: default=${stream.default}, selected=${stream.selected}`);
     *         for (let i = 0; i < stream.info.InfoCount; ++i) {
     *             console.log(`  ${stream.info.InfoName(i)}=${stream.info.InfoValue(i)}`);
     *         }
     *     }
     * }
     * @sourceFile ../../component/samples/basic/Audio Stream Selector.js
     * @worker
     */
    GetAudioStreams: function (handle) { },
    
    /**
     * Returns PCM data from the foobar2000 visualisation stream.<br>
     * The stream is created lazily. A negative <b>offset</b> requests data before the current visualisation time; JSplitter automatically maintains the native backlog required for that offset. The first stream initialization may briefly synchronize with the foobar2000 main thread.<br>
     * For repeated real-time processing, prefer {@link fb.GetAudioChunkTo GetAudioChunkTo} to write directly into a reusable <b>Float32Array</b> without creating a transient {@link FbAudioChunk}. {@link FbAudioChunk#CopyDataTo CopyDataTo} remains useful when a chunk object is already required, while {@link FbAudioChunk#Data Data} preserves its legacy allocating <b>Array</b> behaviour for compatibility.
     *
     * @param {number} requested_length 
     * @param {number=} [offset=0] 
     * @return {FbAudioChunk}
     * 
     * @throws {Error} If the foobar2000 visualisation stream cannot be created.
     * @sourceFile ../../component/samples/complete/js/vu_meter.js
     * @worker
     */
    GetAudioChunk: function (requested_length, offset) { },

    /**
     * Writes interleaved PCM samples from the foobar2000 visualisation stream directly into an existing <b>Float32Array</b>.
     * Unlike {@link fb.GetAudioChunk GetAudioChunk}, this method does not create an {@link FbAudioChunk}; after the first sufficiently large native scratch buffer has been established, repeated calls can reuse both the native scratch storage and the JavaScript destination buffer.<br>
     * A negative <b>offset</b> has the same backlog semantics as {@link fb.GetAudioChunk GetAudioChunk}. If <b>info</b> is supplied, it is updated in place with <b>SampleCount</b>, <b>ChannelCount</b>, <b>SampleRate</b> and <b>ChannelConfig</b>.
     *
     * @param {Float32Array} destination Destination buffer. It must have room for all interleaved PCM sample values.
     * @param {number} requested_length
     * @param {number=} [offset=0]
     * @param {Object=} info Reusable metadata object updated in place.
     * @return {number} Number of scalar PCM samples written, or 0 when no chunk is currently available.
     * @throws {Error} If the foobar2000 visualisation stream cannot be created, <b>destination</b> is not a <b>Float32Array</b> or is too small, or <b>info</b> is not an object.
     * @worker
     */
    GetAudioChunkTo: function (destination, requested_length, offset, info) { },

    /**
     * Note: clipboard contents can be handles copied to the clipboard in other components,
     * from {@link fb.CopyHandleListToClipboard CopyHandleListToClipboard} or a file selection, from Windows Explorer and etc.<br>
     * <br>
     * Performance note: validate clipboard content with {@link fb.CheckClipboardContents CheckClipboardContents} before calling this method.
     *
     * @param {number=} [window_id=0] unused
     * @return {FbMetadbHandleList}
     *
     * @throws {Error} If called before foobar2000 is fully initialized.
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
     * Related methods: {@link fb.SetDSPPreset SetDSPPreset}.
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
     * @throws {Error} If <b>handle</b> is null.
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
     * Related methods: {@link fb.SetOutputDevice SetOutputDevice}.
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
     * @throws {Error} If <b>handles</b> is null or the query cannot be parsed or processed.
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
     * Works like {@link fb.GetSelection GetSelection}, but returns a handle list.<br>
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
     * Performance note: don't use in {@link module:Callbacks.on_paint on_paint}.
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
     * @throws {Error} If <b>handle</b> is null.
     * @example
     * let np = fb.GetNowplaying();
     * console.log(fb.IsMetadbInMediaLibrary(np)); // If false, playing track is not in Media Library.
     * @worker
     * @mainthread
     */
    IsMetadbInMediaLibrary: function (handle) { }, // (boolean)

    /**
     * Loads playlist from file. Equivalent to <b>File</b>><b>Load Playlist...</b>.
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
     * Related methods: {@link fb.UnregisterMainMenuCommand UnregisterMainMenuCommand}<br>
     * Related callbacks: {@link module:Callbacks.on_main_menu_dynamic on_main_menu_dynamic}
     * 
     * @param {number} id
     * @param {string} name
     * @param {string=} [description='']
     * @throws {Error} If the panel host is not fully initialized, the command id is already registered, or the command cannot be registered.
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
     * @param {number=} flags Same flags as {@link fb.RunContextCommand RunContextCommand}
     * @return {boolean}
     * @throws {Error} If <b>handle_or_handle_list</b> is not an {@link FbMetadbHandle FbMetadbHandle} or {@link FbMetadbHandleList FbMetadbHandleList} object.
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
     * Related methods: {@link fb.GetDSPPresets GetDSPPresets}.
     *
     * @param {number} idx
     *
     * @throws {Error} If <b>idx</b> is out of bounds.
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
     * Selects an audio stream for <b>handle</b> and stores it as the user's stream preference.<br>
     * <b>Available only in foobar2000 v2.0 and above</b>. Throws an {@link Error} when API is unavailable, the file does not support stream selection, or <b>index</b> is out of bounds.<br>
     * If the file is currently playing and the effective selection changes, playback is restarted so the new stream is applied immediately.<br>
     * <br>
     * Related methods: {@link fb.GetAudioStreams GetAudioStreams}.
     *
     * @param {FbMetadbHandle} handle
     * @param {number} index Zero-based stream index returned by {@link fb.GetAudioStreams GetAudioStreams}.
     * @throws {Error} If <b>handle</b> is null, foobar2000 2.0 stream selection is unavailable, the file does not support audio stream selection, or <b>index</b> is out of bounds.
     * @example
     * const handle = fb.GetFocusItem();
     * if (handle) {
     *     const streams = fb.GetAudioStreams(handle);
     *     if (streams.length > 1) {
     *         fb.SetAudioStream(handle, streams[1].index);
     *     }
     * }
     * @worker
     * @mainthread
     */
    SetAudioStream: function (handle, index) { }, // (void)

    /**
     * Available only in foobar2000 v1.4 and above. Throws a script error on v1.3.<br>
     * <br>
     * Related methods: {@link fb.GetOutputDevices GetOutputDevices}.
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
     * Opens the image viewer built in to <b>foobar2000</b>. Pass an image file path, or an {@link FbMetadbHandle}; with a handle, {@link module:Flags.AlbumArtId AlbumArtId} defaults to {@link AlbumArtId.front AlbumArtId.front}. Album art is resolved by foobar2000 and may be embedded or external.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. This applies to the image-file argument; track handles use foobar2000 artwork lookup.
     *
     * @param {(string|FbMetadbHandle)} image_path_or_handle Image file path or track handle.
     * @param {AlbumArtId=} [art_id=AlbumArtId.front] Album art type. Used only when the first argument is an {@link FbMetadbHandle}.
     * @throws {Error} If the track handle is invalid, the foobar2000 image viewer API is unavailable, or an image file path cannot be read.
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
     * try caching {@link FbTitleFormat FbTitleFormat} object (by storing it somewhere),
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
     * Related methods: {@link fb.RegisterMainMenuCommand RegisterMainMenuCommand}
     *
     * @param {number} id
     * @throws {Error} If the panel host is not fully initialized or <b>id</b> is not a registered dynamic main-menu command.
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

