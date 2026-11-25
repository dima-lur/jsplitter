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
     * @throws {Error} If the assigned playlist index is out of bounds.
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
     * @throws {Error} If the assigned playback-order id is unknown.
     * @worker
     * @mainthread
     */
    PlaybackOrder: undefined, // (uint) (read, write)


    /**
     * -1 if there is no playing playlist.
     *
     * @type {number}
     *
     * @throws {Error} If the assigned playlist index is out of bounds.
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
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. URLs and foobar2000 URI paths are passed through unchanged. Each filesystem location is resolved before the asynchronous operation starts.
     *
     * @param {number} playlistIndex
     * @param {Array<string>} paths An array of files/URLs
     * @param {boolean=} [select=false]
     *        If true, the active playlist will be set to the playlistIndex, the items will
     *        be selected and focus will be set to the first new item.
     *
     * @throws {Error} If <b>playlistIndex</b> is invalid or a playlist lock prevents adding items.
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
     * @throws {Error} If foobar2000 rejects the autoplaylist query or sort expression.
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
     * @throws {Error} If <b>from</b> is out of bounds.
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
     * @return {boolean} true on success
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
    * @throws {Error} If foobar2000 is older than 2.0.
    * @example
    * console.log(plman.GetGUID(plman.ActivePlaylist));
     * @worker
     * @mainthread
    */
    GetGUID: function (playlistIndex) { }, // (string)

    /**
     * @param {string} guid String representing GUID.
     * @return {number} Index of the found playlist on success, -1 on failure.
     * @throws {Error} If foobar2000 is older than 2.0.
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
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
     * @worker
     * @mainthread
     */
    GetPlaylistLockedActions: function (playlistIndex) { },

    /**
     * @param {number} playlistIndex
     * @return {?string} name of lock owner if there is a lock, null otherwise
     * @throws {Error} If <b>playlistIndex</b> is out of bounds or the playlist lock name cannot be queried.
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
     * @throws {Error} If <b>playlistIndex</b> is invalid.
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
     * @throws {Error} If <b>handles</b> is null.
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
     * Same as {@link plman.InsertPlaylistItems InsertPlaylistItems} except any duplicates contained in handle_list are removed.
     *
     * @param {number} playlistIndex
     * @param {number} base Position in playlist
     * @param {FbMetadbHandleList} handle_list Items to insert
     * @param {boolean=} [select=false] If true then inserted items will be selected
     * @throws {Error} If <b>handles</b> is null.
     * @worker
     * @mainthread
     */
    InsertPlaylistItemsFilter: function (playlistIndex, base, handle_list, select) { }, // (void) select = false

    /**
     * @param {number} playlistIndex
     * @throws {Error} If <b>playlistIndex</b> is invalid.
     * @worker
     * @mainthread
     */
    InvertSelection: function (playlistIndex) { },
    
    /**
     * @param {number} playlistIndex
     * @return {boolean}
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
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
     * but locked with something like <b>foo_utils</b> or <b>foo_playlist_attributes</b>, use with conjunction of {@link plman.IsAutoPlaylist IsAutoPlaylist}.
     * <br>
     * Deprecated: use {@link plman.GetPlaylistLockedActions GetPlaylistLockedActions}.
     *
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
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
     * Related methods: {@link plman.IsUndoAvailable IsUndoAvailable}, {@link plman.Redo Redo}, {@link plman.Undo Undo}, {@link plman.UndoBackup UndoBackup}
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
     * @worker
     * @mainthread
     */
    IsRedoAvailable: function (playlistIndex) { }, // (void)

    /**
     * Returns whether an undo restore point is available for specified playlist.
     * <br>
     * Related methods: {@link plman.IsRedoAvailable IsRedoAvailable}, {@link plman.Redo Redo}, {@link plman.Undo Undo}, {@link plman.UndoBackup UndoBackup}
     *
     * @param {number} playlistIndex
     * @return {boolean}
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
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
     * Unlike {@link plman.MovePlaylistSelection MovePlaylistSelection}, this has full support for non-contiguous selections and all you have to do is supply the new position index.
     * 
     * @param {number} playlistIndex
     * @param {number} new_pos
     * @throws {Error} If <b>playlistIndex</b> is invalid.
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
     * Use {@link plman.GetPlaylistLockedActions GetPlaylistLockedActions} to check if there are any locks present.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable IsRedoAvailable}, {@link plman.IsUndoAvailable IsUndoAvailable}, {@link plman.Undo Undo}, {@link plman.UndoBackup UndoBackup}
     *
     * @param {number} playlistIndex
     * @throws {Error} If <b>playlistIndex</b> is out of bounds or redo is not available.
     * @worker
     * @mainthread
     */
    Redo: function (playlistIndex) { }, // (void)

    /**
     * Removes the specified playlist.<br>
     * Note: if removing the active playlist, no playlist will be active after using this. You'll
     * need to set it manually or use {@link plman.RemovePlaylistSwitch RemovePlaylistSwitch} instead.
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
     * @example <caption>Remove selected items from playlist</caption>
     * plman.RemovePlaylistSelection(plman.ActivePlaylist);
     *
     * @example <caption>Remove items that are NOT selected</caption>
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
     * @throws {Error} If <b>playlistIndex</b> is invalid or <b>order</b> is not a valid permutation of the playlist items.
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
     * @throws {Error} If <b>handle</b>, <b>playlistIndex</b>, or <b>playlistItemIndex</b> is invalid.
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
     * @throws {Error} If <b>playlistIndex</b> is invalid or the query cannot be parsed.
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
     * @throws {Error} If <b>handle</b> is null.
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
     * Note: the lock can be changed only if there is no lock or if it's owned by <b>foo_uie_jsplitter</b>.
     * The owner of the lock can be checked via {@link plman.GetPlaylistLockName GetPlaylistLockName}.
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
     * @throws {Error} If <b>lockedActions</b> is invalid, <b>playlistIndex</b> is out of bounds, the lock belongs to another component, or an action name is unknown.
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
     * Before using, check if your playlist is an autoplaylist by using {@link plman.IsAutoPlaylist IsAutoPlaylist};
     *
     * @param {number} playlistIndex
     * @return {boolean}
     *
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
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
     * @throws {Error} If <b>playlistIndex</b> is invalid or the panel host is not fully initialized.
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
     * Use {@link plman.GetPlaylistLockedActions GetPlaylistLockedActions} to check if there are any locks present.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable IsRedoAvailable}, {@link plman.IsUndoAvailable IsUndoAvailable}, {@link plman.Redo Redo}, {@link plman.UndoBackup UndoBackup}
     *
     * @param {number} playlistIndex
     * @throws {Error} If <b>playlistIndex</b> is out of bounds or undo is not available.
     * @worker
     * @mainthread
     */
    Undo: function (playlistIndex) { }, // (void)

    /**
     * Creates an undo restore point for the specified playlist. This will enable <b>Edit</b>>{@link plman.Undo Undo} menu item after calling other {@link plman} methods that change playlist content.<br>
     * Note: this method should be called before performing modification to the playlist.<br>
     * <br>
     * Related methods: {@link plman.IsRedoAvailable IsRedoAvailable}, {@link plman.IsUndoAvailable IsUndoAvailable}, {@link plman.Redo Redo}, {@link plman.Undo Undo}
     * 
     * @param {number} playlistIndex
     * @throws {Error} If <b>playlistIndex</b> is out of bounds.
     * @worker
     * @mainthread
     */
    UndoBackup: function (playlistIndex) { }, // (void)

    /**
     * @param {FbMetadbHandle} handle
     * @throws {Error} If <b>handle</b> is null.
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
     * @throws {Error} If <b>handle</b> is null.
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

