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
 *    Human-readable Windows product name including the edition when available, for example <b>Windows 11 Home</b> or <b>Windows 11 Pro</b>.
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
     * The value is derived from the <b>Advanced Preferences в†’ Performance в†’ Use high-resolution timers</b> setting, but reports the effective runtime state, not merely the checkbox: it returns true only when the option is enabled and the current Windows version actually supports high-resolution waitable timers; otherwise it returns false.
     *
     * @type {boolean}
     * @worker
     */
    HighResolutionTimersEnabled: undefined, // (bool) (read)

    /**
     * Indicates whether the current foobar2000 process architecture is 64-bit.
     * This does not describe the operating system architecture; use {@link utils.IsOS64Bit IsOS64Bit} for that.
     *
     * @type {boolean}
     * @readonly
     * @worker
     */
    Is64Bit: undefined, // (bool) (read)

    /**
     * Indicates whether the operating system architecture is 64-bit.
     * Unlike {@link utils.Is64Bit Is64Bit}, this value describes Windows itself and remains true when 32-bit foobar2000 runs on 64-bit Windows.
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
     * Checks whether a font name exists in the selected graphics backend, including fonts
     * loaded with {@link utils.LoadFont LoadFont}. Uses exact, case-insensitive matching;
     * a substituted font or partial name does not count as a match.<br>
     * In Direct2D mode, also recognizes localized names, Win32 and typographic family
     * names, and full font names. These aliases need not appear in {@link utils.ListFonts ListFonts}.
     *
     * @param {string} name Font family or supported font name.
     * @param {number} [mode=0] 0 - Auto (current panel backend), 1 - GDI, 2 - Direct2D.
     * @return {boolean} True if the requested name is found, false otherwise.
     * @throws {Error} If font enumeration fails or Direct2D font resources are unavailable.
     * @worker
     *
     * @example
     * utils.CheckFont('Arial');    // Current backend.
     * utils.CheckFont('Arial', 1); // GDI.
     * utils.CheckFont('Arial', 2); // Direct2D.
     */
    CheckFont: function (name, mode) { }, // (boolean)

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
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} url File URL
     * @param {string} path Save file path
     * 
     * @throws {Error} If called from a panel before foobar2000 is fully initialized.
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
     * @throws {Error} If called from a panel before foobar2000 is fully initialized.
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
     * Default text editor can be changed via <b>Edit</b> button on the main tab of {@link window.ShowConfigureV2}.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {number} path Path to file
     * @throws {Error} If called before foobar2000 is fully initialized.
     */
    EditTextFile: function (path) { }, // (uint)

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {number} path Path to file
     * @return {boolean} true, if file exists.
     * @worker
     */
    FileExists: function (path) { },

    /**
     * Opens system file picker dialog window
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string=} [title=undefined] Title of dialog. If empty it will be the title by system default
     * @param {string=} [default_path=undefined] Default file path to choose. If only path without file name is specified it will open specified folder
     * @param {string=} [filter=undefined] Files filter in form (for ex.): "Image files (*.jpg;*.png;*.bmp)|*.jpg;*.png;*.bmp|All files (*.*)|*.*"
     * @param {string=} [mode=0] File dialog mode. 0 - open, 1 - save
     * @param {number} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {string} Chosen file path. If dialog is cancelled returns empty string
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized.
     */
    FilePicker: function (title, default_path, filter, mode, window_id) { },

    /**
     * Various utility functions for working with file.<br>
     * <br>
     * Deprecated: use {@link utils.DetectCharset DetectCharset}, {@link utils.FileExists FileExists}, {@link utils.GetFileSize GetFileSize},
     * {@link utils.IsDirectory IsDirectory}, {@link utils.IsFile IsFile} and {@link utils.SplitFilePath SplitFilePath} instead.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}. This applies only to modes that access the filesystem; <b>split</b> only splits the supplied path string.
     *
     * @throws {Error} If <b>mode</b> is not one of the supported values.
     * @deprecated
     * 
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string=} [title=undefined] Title of dialog. If empty it will be the title by system default
     * @param {string=} [default_path=undefined] Default folder path to choose
     * @param {number=} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {string} Chosen folder path. If dialog is cancelled returns empty string
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized.
     */
    FolderPicker: function (title, default_path, window_id) { },

    /**
     * Opens system font picker dialog window (with pixel size field extension).
     *
     * @param {GdiFont=} [default_font=undefined] (or {@link D2DFont D2DFont} if {@link window.DrawMode window.DrawMode}=1) If specified, it will be selected in the dialog, otherwise the default system message font will be selected
     * @param {number=} [window_id=0] Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @return {?GdiFont} (or {@link D2DFont D2DFont} if {@link window.DrawMode window.DrawMode}=1) Chosen font or default_font if cancelled (if default_font is undefined returns null)
     *
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized, or <b>default_font</b> is not compatible with the current draw mode.
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
     * @throws {Error} If <b>handle</b> is null or the panel host is not fully initialized.
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
     * Returns a <b>Promise</b> object, which will be resolved when art loading is done.
     *
     * @param {number} window_id unused
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @param {boolean=} [need_stub=true] If true, will return a stub image from <b>Preferences</b>><b>Display</b>><b>Stub image path</b> when there is no art image available.
     * @param {boolean=} [only_embed=false] If true, will only try to load the embedded image.
     * @param {boolean=} [no_load=false] If true, then no art loading will be performed and only path to art will be returned in {@link ArtPromiseResult}.
     * @return {Promise.<ArtPromiseResult>}
     *
     * @throws {Error} If <b>handle</b> is null, the panel host is not fully initialized, or Worker promise setup fails.
     * @sourceFile ../../component/samples/basic/GetAlbumArtAsyncV2.js
     * @worker
     */
    GetAlbumArtAsyncV2: function (window_id, handle, art_id, need_stub, only_embed, no_load) { },

    /**
     * Load embedded art image for the track.<br>
     * <br>
     * Performance note: consider using {@link utils.GetAlbumArtAsync GetAlbumArtAsync} or {@link utils.GetAlbumArtAsyncV2 GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}. URLs and foobar2000 URI paths are passed through unchanged.
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
     * Performance note: consider using {@link utils.GetAlbumArtAsync GetAlbumArtAsync} or {@link utils.GetAlbumArtAsyncV2 GetAlbumArtAsyncV2} if there are a lot of images to load.
     *
     * @param {FbMetadbHandle} handle
     * @param {number=} [art_id=0] See {@link module:Flags.AlbumArtId AlbumArtId} enum
     * @param {boolean=} [need_stub=true]
     * @return {GdiBitmap} (or {@link D2DBitmap} if {@link window.DrawMode} == 1)
     *
     * @throws {Error} If <b>handle</b> is null.
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
     * @param {string} country_or_code Case is not important. You can supply an ISO alpha-2 code, an ISO alpha-3 code, a full name or a supported alias. A few examples (full list see in the EXAMPLE file):<br>
     * "by" "BLR" "Belarus"<br>
     * "gb" "GBR" "United Kingdom"<br>
     * "kp" "PRK" "North Korea"<br>
     * @return {string} Country string code 
     * @sourceFile ../../component/docs/countries.json
     * @worker
     */
    GetCountryFlag: function (country_or_code) { },

    /**
     * Returns information about a logical drive or volume containing the supplied path.<br>
     * The method also works with drive roots returned by {@link utils.GetDrives GetDrives}.<br>
     * Unready removable/CD drives still return an object with <b>IsReady == false</b> when the drive itself exists.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * A returned removable/CD drive may not currently be ready; use {@link utils.GetDriveInfo GetDriveInfo} to query its state.
     *
     * @return {Array<string>} Drive root paths, for example <b>["C:\\", "D:\\"]</b>
     * 
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetDrives: function () { },

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * For synchronous calculation, use {@link utils.GetFolderSize GetFolderSize}.<br>
     * Directory reparse points are not followed. Entries that cannot be accessed are skipped.<br>
     * The method returns a task id immediately, and the result is delivered later to {@link module:Callbacks.on_get_folder_size_done on_get_folder_size_done}.<br>
     * Use the returned task id to match the result with the original call.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path Directory path
     * @return {number} Task id of the asynchronous operation
     *
     * @throws {Error} If called from a panel before foobar2000 is fully initialized or the worker thread cannot be started.
     * @sourceFile ../../component/samples/basic/FilesystemUtils.js
     * @worker
     */
    GetFolderSizeAsync: function (path) { },

    /**
     * Gets "last modified" attribute for file
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Deprecated: use {@link utils.GetPackageInfo GetPackageInfo} instead.
     * 
     * @throws {Error} If no package with <b>package_id</b> exists.
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
     * @throws {Error} If <b>index</b> is not a valid system colour index.
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
     * Each element of the returned <b>Float32Array</b> is a linear amplitude value in the range 0.0..1.0 for the corresponding part of the requested time range.<br>
     * Each output point represents one time interval. The interval is divided into up to 8 local windows; for each non-empty window, the peak absolute sample value across all channels is measured, and those local peaks are averaged to produce the output value. This preserves short transients while avoiding the dense appearance produced by taking a single maximum peak over the entire output interval.<br>
     * Values are not normalized to the loudest point of the track, so their amplitudes remain relative to the decoded audio signal.<br>
     * Decoding uses one sequential decoder pass. Decoded PCM data is not exposed to JavaScript.<br>
     * <br>
     * If <b>on_progress</b> is supplied, finalized contiguous ranges of the output envelope are delivered while decoding is still in progress. The callback receives a <b>Float32Array</b> containing the new values and the zero-based output index where that range begins. Progress chunk size and delivery frequency are implementation details and must not be relied on.<br>
     * <b>For waveform UIs that should appear while decoding, this progressive form is the recommended approach.</b> Use one {@link utils.GetWaveformAsync GetWaveformAsync} call for the whole requested range instead of splitting the track into repeated range calls. One decoder remains open for the sequential pass, avoiding repeated open/seek/decode overhead. For visually smooth rendering, store progress chunks immediately but animate a separate visible front toward the loaded front rather than exposing the native chunk boundaries directly.<br>
     * Return <b>false</b> from <b>on_progress</b> to cancel the native decode. This is recommended when a progressive request becomes obsolete, for example after the focused or playing track changes. Cancellation rejects the returned Promise. Any other return value continues decoding.<br>
     * The Promise still resolves with the complete <b>Float32Array</b> when decoding finishes normally, whether or not a progress callback is used.<br>
     * <br>
     * If <b>duration</b> is 0, the requested range extends from <b>start</b> to the end of the track. If the track length cannot be determined, a non-zero duration must be specified.<br>
     * A range that extends past a known track end is clipped. If <b>start</b> is at or beyond the known track end, a zero-filled array is returned.<br>
     * Decoder or input-opening failures reject the returned Promise.
     *
     * @param {FbMetadbHandle} handle Track to decode.
     * @param {number=} [points=2048] Number of output points. Valid range: 1..65536.
     * @param {number=} [start=0] Start position in seconds. Must be finite and non-negative.
     * @param {number=} [duration=0] Duration in seconds. Must be finite and non-negative. 0 means from <b>start</b> to the end of the track.
     * @param {function(Float32Array, number)=} on_progress Optional progress callback. Receives <b>(values, start_index)</b>. Return <b>false</b> to cancel decoding.
     * @return {Promise.<Float32Array>} Promise resolved with exactly <b>points</b> linear amplitude values.
     *
     * @throws {Error} If <b>handle</b> is null; <b>points</b>, <b>start</b>, or <b>duration</b> is invalid; or <b>on_progress</b> is not a function, null, or undefined.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized, or the dialog is cancelled while <b>error_on_cancel</b> is true.
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
     * Displays a resizable dialog with a multi-line text edit area.
     *
     * @param {number} window_id Native window handle (HWND) to use as the dialog owner. Pass 0 to use the default foobar2000 window.
     * @param {string} prompt
     * @param {string} caption
     * @param {string=} [default_val='']
     * @param {boolean=} [error_on_cancel=false] If set to true, cancelling the dialog throws an error.
     * @param {string=} [help_text=''] If not empty, a Help button will show in the dialog. If <b>help_text</b> begins with "http://" or "https://", it will launch a web browser otherwise it will open a popup window containing the text.
     * @return {string}
     *
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized, or the dialog is cancelled while <b>error_on_cancel</b> is true.
     * @example
     * let text = utils.TextBox(0, "Enter text", "JSplitter", "First line\nSecond line");
     */
    TextBox: function (window_id, prompt, caption, default_val, error_on_cancel, help_text) { }, // (string)

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path
     * @return {boolean} true, if location exists and it's a directory
     * @worker
     */
    IsDirectory: function (path) { },

    /**
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Loads a font file for private use by the current foobar2000 process and returns its font family names.
     * The font is not installed in Windows and is not made available to other processes.
     *
     * After a successful call the font becomes available to the foobar2000 process. It can be used by {@link gdi.Font}
     * and {@link d2d.Font} and is visible to other JSplitter panels and Workers. Registration is process-wide,
     * so native foobar2000 UI and other components using Windows font APIs may also see the font, depending
     * on when they enumerate or create fonts.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     * Each file is registered once by its normalised absolute path. Loading the same file again returns its
     * saved family names without registering it again. Fonts remain available until foobar2000 exits;
     * there is no corresponding unload operation.
     *
     * Returns a non-empty array containing at least one font family name from the file, or — 
     * in the case of a TTC/OTC collection — all font family names present in that collection.
     * Styles and localized names are not listed separately. The returned names depend on the panel's
     * drawing mode: GDI may shorten long family names (cause of 31 character Windows font name limit), 
     * while Direct2D can return their full names.
     * Use {@link utils.CheckFont CheckFont} with the corresponding mode to check a returned name.
     *
     * <div class="doc-note">
     * In GDI mode, fonts with family names longer than 31 characters can be rendered with
     * {@link GdiGraphics#DrawString DrawString}, but not with {@link GdiGraphics#GdiDrawText GdiDrawText}.
     * Direct2D does not have this limitation.
     * </div>
     *
     * @param {string} path Path to a font file, such as <b>.ttf</b>, <b>.otf</b>, <b>.ttc</b> or <b>.otc</b>.
     * @return {Array<string>|null} A non-empty array of font family names on success, or <b>null</b> if the
     * file is missing, invalid, contains no usable families or cannot be registered.
     * @worker
     *
     * @example
     * const families = utils.LoadFont('fonts/Rain Tungsten Medium.ttf');
     * if (families) {
     *     const name = families[0];
     *     const font = gdi.Font(name, 16);
     *     console.log(name);
     * }
     */
    LoadFont: function (path) { },

    /**
     * Lists font family names available to the selected graphics backend, including fonts
     * loaded with {@link utils.LoadFont LoadFont}. GDI and Direct2D organize families differently,
     * so their lists and returned names may differ. Direct2D includes localized family names;
     * duplicate names are removed, preserving their first occurrence.<br>
     * Every returned name can be checked with {@link utils.CheckFont CheckFont} in the same mode.
     * @param {number} [mode=0] 0 - Auto (current panel backend), 1 - GDI, 2 - Direct2D.
     * @return {Array<string>} Available font family names.
     * @throws {Error} If Direct2D font resources are unavailable.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * - {@link HtmlDocument#innerText innerText} is currently an alias of {@link HtmlDocument#textContent textContent}.<br>
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
     * Opens a binary file for incremental reading into a caller-provided <b>Uint8Array</b>.<br>
     * The buffer is reused by the caller, so repeated reads do not allocate a new typed array for every chunk.
     * This is intended for large files or other cases where whole-file {@link utils.ReadBinaryFile ReadBinaryFile} would be inefficient.<br>
     * Reading is synchronous. For one-shot large-file processing, use the reader inside {@link Worker.RunAsync}; for persistent pipelines, use it from a {@link Worker}. Both approaches keep blocking file I/O off the panel UI thread.<br>
     * Ordinary read failures are reported through {@link BinaryReader#Read Read} and {@link BinaryReader#EOF EOF}>; they are not thrown as exceptions.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} filename File to open.
     * @return {?BinaryReader} Open streaming reader, or <b>null</b> if the reader could not be created. Ordinary file open/setup failures are reported as <b>null</b>, not exceptions.
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
     * Opens a binary file for incremental writing from a caller-provided <b>Uint8Array</b>.
     * The file is created or truncated when opened. The parent folder must already exist.
     * Reusing the same typed array avoids allocating temporary buffers for every chunk.
     * Write, flush, and close failures are reported through boolean return values. 
     * 
     * Writing is synchronous. For long-running processing, use the writer from a {@link Worker} to avoid blocking the panel UI.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} filename File to create or overwrite.
     * @return {?BinaryWriter} Open streaming writer, or <b>null</b> if the writer could not be created. Ordinary file creation/open failures are reported as <b>null</b>, not exceptions.
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
     * Opens or creates a SQLite database for synchronous read/write access by given filename.<br>
     * The special filename <b>:memory:</b> creates an in-memory SQLite database and is not path-resolved. The parent folder of a file-backed database must already exist.<br>
     * Database work is synchronous, so large imports or expensive queries should be run from a {@link Worker} to avoid blocking the panel UI thread.<br>
     * SQL values should be passed through the optional parameter array instead of being concatenated into the SQL text. Supported parameter types are <b>null, boolean, number, string, ArrayBuffer</b>, and typed-array views.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} filename Absolute or script-relative database filename, or <b>:memory:</b>.
     * @return {?SQLiteDatabase} Open database handle, or <b>null</b> if the database could not be opened or created. Ordinary open/create failures are reported as <b>null</b>, matching the other <b>Open*</b> resource factories. SQL and database-operation errors after a successful open are reported as exceptions.
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
     * Unlike {@link utils.ReadTextFile ReadTextFile}, the whole file is not materialized as one JavaScript string. This makes it suitable for processing large text files incrementally, one line at a time, without requiring the entire file contents to fit in the JavaScript heap.<br>
     * {@link TextReader#ReadLine ReadLine} removes the line terminator. A return value of <b>null</b> means that no next line could be returned; in that case, {@link TextReader#EOF EOF} is <b>true</b> for a clean end of file and <b>false</b> for a read or decoding failure.
     * UTF-16LE/BE and UTF-32LE/BE are supported with codepages 1200/1201 and 12000/12001 respectively.<br>
     * Pass codepage 0 to use automatic charset detection, matching {@link utils.ReadTextFile ReadTextFile}.<br>
     * Reading is synchronous. For long-running processing, use the reader from a {@link Worker} to avoid blocking the panel UI.<br>
     * Ordinary read and decoding failures are reported through {@link TextReader#ReadLine ReadLine} and {@link TextReader#EOF EOF}; they are not thrown as exceptions.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} filename File to open.
     * @param {number=} [codepage=65001] Windows codepage used to decode each line. UTF-16LE/BE use 1200/1201, UTF-32LE/BE use 12000/12001, and 0 enables automatic detection. See Codepages.js.
     * @return {?TextReader} Open streaming reader, or <b>null</b> if the reader could not be created.
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
     * UTF-8, UTF-16LE/BE, UTF-32LE/BE, and supported Windows codepages use the same decoding rules as {@link utils.OpenTextReader OpenTextReader}. A matching BOM is removed for UTF encodings.<br>
     * For large line-oriented files, consider {@link utils.OpenTextReader OpenTextReader}; it avoids creating one JavaScript string containing the entire file.
     *
     * <div class="doc-note warning">
     * <b>Filesystem path resolution:</b> absolute paths are used as-is. Relative paths are resolved against the file containing the current call. For the main script this is the main script directory; for an included script or a file-backed Worker it is that script's own directory. If there is no file-backed caller, the existing host fallback is used (the Worker's relative-path root, or the component directory for an in-memory panel script).
     * </div>
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
     * Returns a string. Will be empty if path doesn't exist or there was an error opening it.
     * 
     * For UTF8 files with or without BOM. If you're unsure about the file encoding, continue to use {@link utils.ReadTextFile ReadTextFile}
     * 
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path
     * @return {string}
     * @worker
     */
    ReadUTF8: function(path) { },

    /**
     * Moves a file or directory to the Recycle Bin.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path
     * @return {number}
     * @worker
     */
    RemovePath: function(path) { },

    /**
     * Renames file or folder path.
     * 
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * For large files, consider {@link utils.OpenBinaryReader OpenBinaryReader}; it reads incrementally into a reusable caller-provided buffer instead of allocating one typed array for the whole file.
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path Absolute or script-relative file path.
     * @returns {Uint8Array} File bytes, or null if was an error
     * 
     * @sourceFile ../../component/samples/basic/CreateImageFromPixelData.js
     * @worker
     */
    ReadBinaryFile: function(path) { },

    /**
     * Note: this only returns up to 255 characters per value.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}. This applies only to <b>working_dir</b>; <b>target</b> is not path-resolved.<br>
     *
     * @param {string} target
     * File, executable, URL, or document to run/open.<br>
     * If this value is empty, the method returns a {@link RunResult RunResult} with OK=false and Win32Error=ERROR_INVALID_PARAMETER.<br>
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
     * Use one of the {@link module:Flags.ShowWindow ShowWindow} values, for example {@link ShowWindow.Hide ShowWindow.Hide} or {@link ShowWindow.Show ShowWindow.Show}.<br>
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
     * Use {@link utils.RunCmdAsync RunCmdAsync} if you need asynchronous completion, stdout/stderr capture, or timeout handling.<br>
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
     * Completion callbacks may arrive in a different order than the {@link utils.RunCmdAsync RunCmdAsync} calls were made.<br>
     * Use the returned task id to match the result with the original {@link utils.RunCmdAsync RunCmdAsync} call.<br>
     * If the process does not finish before timeout_ms, the whole process tree is terminated.<br>
     * Pass 0 as timeout_ms to wait indefinitely.<br>
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}. This applies only to <b>working_dir</b>; <b>app</b> is not path-resolved.<br>
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
     * @throws {Error} If <b>args</b> is invalid, the panel host is not fully initialized, or the worker thread cannot be started.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * <b>options.data</b> is exposed inside the html dialog through
     * <b>window.external.dialogArguments</b>. The bridge supports the following values:
     * <ul>
     *   <li>Basic types: number, string, boolean, null, undefined</li>
     *   <li>
     *     Arrays: call <b>window.external.dialogArguments.toArray()</b> inside html to obtain
     *     a JavaScript array. Each element has the same type limitations as <b>options.data</b>.
     *   </li>
     *   <li>
     *     Functions: callable from html as callbacks into panel JavaScript. A callback may have a
     *     maximum of 7 arguments, and each argument has the same type limitations as <b>options.data</b>.
     *   </li>
     *   <li>
     *     Objects are not transferred directly. Serialize them with <b>JSON.stringify()</b> before
     *     passing them and restore them with <b>JSON.parse()</b> inside html.
     *   </li>
     * </ul>
     * JSplitter objects such as {@link FbMetadbHandle FbMetadbHandle}, {@link GdiBitmap GdiBitmap} and {@link D2DBitmap}
     * cannot be passed through this bridge.<br>
     * <br>
     * The following properties are available through <b>window.external</b> inside the html dialog:<br>
     * <ul>
     *   <li><b>dialogArguments</b> - read-only value containing <b>options.data</b></li>
     *   <li>
     *     <b>dialogWindow</b> - read-only native window handle (HWND) of the html dialog, represented as a number.<br>
     *     It can be passed as <b>window_id</b> to JSplitter modal dialog functions to make the html dialog their owner, e.g.<br>
     *     {@link utils.ColourPicker ColourPicker}<br>
     *     {@link utils.FontPicker FontPicker}<br>
     *     {@link utils.InputBox InputBox}<br>
     *     {@link utils.TextBox TextBox}<br>
     *     {@link plman.ShowPlaylistLockUI}<br>
     *     {@link utils.FilePicker FilePicker}<br>
     *     {@link utils.FolderPicker FolderPicker}<br>
     *     {@link utils.MessageBox MessageBox}<br>
     *     {@link utils.ShowHtmlDialog ShowHtmlDialog}<br>
     *     The handle is valid only while the html dialog exists.
     *   </li>
     * </ul>
     *
     * @param {number} window_id native window handle (HWND) to use as the dialog owner; pass 0 to use the default foobar2000 window
     * @param {string} code_or_path Html code or file path. File path must begin with <b>file://</b> prefix.
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
     * @param {*=} [options.data=undefined] Read-only data exposed through <b>window.external.dialogArguments</b>. For multiple values, pass an array and call <b>.toArray()</b> inside html. Has type limitations described above.
     *
     * @throws {Error} If no valid owner window is supplied and the panel host is not fully initialized, or the dialog cannot be created.
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
     * For large output, consider {@link utils.OpenBinaryWriter OpenBinaryWriter}; it writes incrementally from a reusable caller-provided buffer.
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} path Absolute or script-relative file path.
     * @param {Uint8Array} data Bytes to write
     * @returns {boolean} true on success
     * @throws {Error} If <b>data</b> is not a <b>Uint8Array</b>.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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
     * If <b>write_bom</b> is true, the matching BOM is written for UTF-8, UTF-16, and UTF-32. Other Windows codepages do not have a BOM and ignore this option.<br>
     * Use {@link TextWriter#Write Write} to append text without a line terminator or {@link TextWriter#WriteLine WriteLine} to append text followed by CRLF. Encoding and I/O failures are reported through boolean return values. This avoids building one large JavaScript string before writing a large file.<br>
     * Writing is synchronous. For one-shot large-file generation, use the writer inside {@link Worker.RunAsync}; for persistent pipelines, use it from a {@link Worker}. Both approaches keep blocking file I/O off the panel UI thread.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
     *
     * @param {string} filename File to create or overwrite.
     * @param {boolean=} [write_bom=true] If true, writes a BOM for UTF-8/UTF-16/UTF-32.
     * @param {number=} [codepage=65001] Output Windows codepage. Codepage 0 is not valid for writing. See Codepages.js.
     * @return {?TextWriter} Open streaming writer, or <b>null</b> if the writer could not be created.
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
     * UTF-8 is used by default, matching {@link utils.OpenTextWriter OpenTextWriter}. UTF-16LE (1200), UTF-16BE (1201), UTF-32LE (12000), UTF-32BE (12001), and other valid Windows codepages are also supported.<br>
     * If <b>write_bom</b> is true, the matching BOM is written for UTF-8, UTF-16, and UTF-32. Other Windows codepages do not have a BOM and ignore this option.<br>
     * For large output, consider {@link utils.OpenTextWriter OpenTextWriter}; it writes incrementally and does not require one large JavaScript string containing the entire file.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile ReadTextFile}.
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


