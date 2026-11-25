/**
 * Object returned by {@link fb.GetAudioChunk}
 * @hideconstructor
 * @worker
 * @cloneable
 * @transferable
 */
class FbAudioChunk {
    /**
     * Copies the chunk's interleaved PCM samples into an existing <b>Float32Array</b> without allocating a new JavaScript sample array.
     * The destination must have room for at least <b>SampleCount * ChannelCount</b> values.
     * This is useful for real-time visualizations that reuse the same buffer on every update; the legacy {@link FbAudioChunk#Data Data} property remains unchanged for compatibility.
     *
     * @param {Float32Array} destination Destination buffer.
     * @return {number} Number of scalar PCM samples copied.
     * @throws {Error} If <b>destination</b> is not a <b>Float32Array</b> or is too small.
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
     * If you want to compare them physically, use the {@link FbMetadbHandle#RawPath RawPath} property.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. URLs and foobar2000 URI paths are passed through unchanged.
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
     * Embeds covers of the specified type from exisiting {@link GdiBitmap GdiBitmap} or {@link D2DBitmap D2DBitmap} object. Supports JPEG, WEBP and PNG codecs for encoding image before embedding.<br>
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
     * @return {number} total size in bytes. For display purposes, consider using {@link utils.FormatFileSize} on the result.
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
     * under <b>Utilities</b> except there are no prompts.
     * @worker
     * @mainthread
     */
    this.OptimiseFileLayout = function (minimise) { }; // (void)

    /**
     * @param {FbTitleFormat} tfo An instance of {@link FbTitleFormat FbTitleFormat}.
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
     * Saves the handle list as a playlist. The output format is selected by foobar2000 from the filename extension.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. URLs and foobar2000 URI paths are passed through unchanged.
     *
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
 * try caching {@link FbTitleFormat FbTitleFormat} object (by storing it somewhere),
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
     * {@link FbTitleFormat#EvalWithMetadb EvalWithMetadb}(fb.GetNowplaying()) will not give the results you want.
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
     * Evaluates this title formatting expression for an item in the active playlist.
     * Use this method to access playlist-specific fields such as <b>%list_index%</b>, <b>%list_total%</b> and <b>%isplaying%</b>.
     *
     * @param {number} playlistItemIndex Zero-based item index in the active playlist.
     * @return {string}
     * @throws {Error} If there is no active playlist or <b>playlistItemIndex</b> is invalid.
     * @worker
     * @mainthread
     */
    this.EvalActivePlaylistItem = function (playlistItemIndex) { };

    /**
     * Evaluates this title formatting expression for an item in a specific playlist.
     * Use this method to access playlist-specific fields such as <b>%list_index%</b>, <b>%list_total%</b> and <b>%isplaying%</b>.
     *
     * @param {number} playlistIndex Zero-based playlist index.
     * @param {number} playlistItemIndex Zero-based item index in the playlist.
     * @return {string}
     * @throws {Error} If <b>playlistIndex</b> or <b>playlistItemIndex</b> is invalid.
     * @worker
     * @mainthread
     */
    this.EvalPlaylistItem = function (playlistIndex, playlistItemIndex) { };

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

