/**
 * Runs JavaScript in a separate JSplitter Worker realm and Worker thread.<br>
 * JSplitter Workers use a Web-Worker-inspired programming model, but this page describes the actual JSplitter behaviour and should be treated as the primary guide. A Worker has its own global scope and event loop, communicates with its parent panel through structured-clone messages, and has no direct access to the panel UI.
 *
 * <h2>Why use a Worker?</h2>
 * A panel script shares its thread with panel/UI work. Expensive JavaScript, large metadata aggregation, image processing, or repeated frame preparation performed there can make the interface less responsive. A Worker moves suitable work to another thread and lets the panel remain focused on interaction and presentation.
 *
 * <div class="doc-article-diagram">Panel realm                         Worker realm
 * UI / callbacks                       own JS realm + event loop
 *     |                                      |
 *     | new Worker(source / { file })                   |
 *     |------------------------------------->|
 *     |                                      | script starts
 *     | postMessage(data)                    |
 *     |------------------------------------->| process / render / I/O
 *     |                                      |
 *     |                  postMessage(result) |
 *     |<-------------------------------------|
 *     | repaint / present result             |
 *     |                                      |
 *     | terminate()              close() ----|</div>
 *
 * <h2>Creating a Worker</h2>
 * The {@link Worker} constructor has two explicit startup forms:
 *
 * <ul class="doc-article-list">
 * <li><b><code>new Worker(source[, name])</code></b> — evaluates JavaScript <b><code>source</code></b> text supplied by the panel script.</li>
 * <li><b><code>new Worker({ file: 'path/to/worker.js' }[, name])</code></b> — reads and evaluates a JavaScript file.</li>
 * </ul>
 *
 * In the file-backed form, <b><code>file</code></b> may be an absolute or relative path. Relative paths use the caller/package/component search roots, and the resolved file becomes the Worker's startup script origin. 
 * 
 * The optional second <b><code>name</code></b> argument has the same meaning in both startup forms: it is the Worker's immutable identity for its lifetime. Supply it when the Worker is created; inside the Worker the same value is exposed through read-only {@link WorkerGlobalScope#name self.name}. JSplitter also uses this exact name in {@link window.JsMemoryStats} (<b><code>Workers[].Name</code></b>) and as the first diagnostic metadata line of every unhandled Worker exception (see below). Giving long-lived or multiple concurrent Workers short descriptive names therefore makes both memory inspection and failures much easier to identify.
 *
 * Here are the examples of Worker creation:
 *
 * ```js
 * const inlineWorker = new Worker(`
 *     include('workers/main.js');
 * `,
 * 'inline-worker');
 *
 * const fileWorker = new Worker(
 *     { file: 'workers/main.js' },
 *     'file-worker'
 * );
 * ```
 *
 * This also means an inline Worker based on source text can be any piece of executable JavaScript code or only a tiny bootstrap that {@link include include()}s ordinary files, while a file-backed Worker can start from the same file directly. Relative paths are resolved from the currently executing script file first when one exists, so a file-backed <b><code>workers/main.js</code></b> can <b><code>include('./helpers.js')</code></b>; otherwise the Worker's inherited script/package roots and component path are used.
 *
 * Source text passed to {@link Worker} is ordinary JavaScript. JSplitter evaluates it in a new Worker realm running on its own thread:
 *
 * ```js
 * const worker = new Worker(`
 *     const value = 21 * 2;
 *     console.log('Worker result: ' + value);
 * `, 'example-worker');
 * ```
 *
 * The code inside the string runs in the Worker, not in the panel. It can use the APIs available to Worker code just as ordinary panel JavaScript can use panel APIs.
 *
 * This example is intentionally not very useful: it performs one calculation and does not communicate with the panel. The next section explains an important consequence of this execution model: the Worker remains alive even after that startup code reaches its end. Later sections show how messaging turns it into a useful long-lived Worker.
 *
 * <h2>Worker lifetime and the event loop</h2>
 * Reaching the end of the Worker's initial source does <b>not</b> mean that the Worker has finished. In the example above, execution reaches the end immediately after <b><code>console.log()</code></b>, but the Worker itself remains alive. JSplitter keeps it running in its event loop. In this documentation, <b>event loop</b> simply means the Worker waits for the next unit of work and dispatches it when it arrives: a message from the panel, a timer, a Worker-capable asynchronous host completion, observer delivery, or Promise work associated with a task. When there is nothing to do, the Worker waits; it does not repeatedly execute the initial source and it does not need a user-written loop.
 *
 * This also means that processing one message does not end the Worker. The same Worker can receive many later messages through the same {@link WorkerGlobalScope#onmessage onmessage} handler with one {@link MessageEvent} parameter. If the panel stays loaded and keeps the Worker alive, and neither side closes it, the Worker remains alive waiting for more work. It is therefore important to end Workers that are no longer needed rather than assuming that returning from the startup script or from a message handler stops them.
 *
 * There are two normal ways to end a Worker:
 *
 * <ul class="doc-article-list">
 * <li>The parent panel calls {@link Worker#terminate terminate()} when it decides that the Worker is no longer needed.</li>
 * <li>Worker code calls Worker-global {@link WorkerGlobalScope#close close()} when the Worker itself knows that its work is finished. New work is no longer accepted, the current task is allowed to finish, and then the event loop exits.</li>
 * </ul>
 *
 * Next example shows typical <b>worker <-> panel</b> messaging:
 * ```js
 * const worker = new Worker(`
 * onmessage = function (event) {
 *     if (event.data === 'stop') {
 *         // WORKER: the Worker decides that it has finished.
 *         postMessage('finished');
 *         close();
 *         return;
 *     }
 * 
 *     postMessage('processed: ' + event.data);
 * };
 * `);
 * 
 * // PANEL: receives messages sent by postMessage() inside the Worker here
 * worker.onmessage = function (event) {
 *     console.log('Worker says: ' + event.data);
 * };
 * 
 * // PANEL: sends message to worker
 * worker.postMessage('hello');
 * // -> Worker says: processed: hello
 * 
 * // If Worker is no longer needed then:
 * 
 * // Option A: ask the Worker to finish through its own message protocol
 * worker.postMessage('stop');
 * // -> Worker says: finished
 * 
 * // Option B: stop Worker directly from the outside instead.
 * // Calling terminate() here is also safe, after the Worker has already called close()
 * // worker.terminate();
 * ```
 *
 * JSplitter automatically terminates all Workers still owned by a panel when that panel is unloaded, so explicit cleanup is not required merely for panel teardown. Explicit {@link Worker#terminate terminate()} is for ending a Worker <b>earlier</b>, while the panel continues to live. Conversely, while the panel remains loaded, a Worker that is still kept alive and is never closed or terminated will remain waiting in its event loop and will continue to hold its Worker realm and associated resources.
 *
 * <div class="doc-note warning"><b>Do not treat a Worker created with <code>new Worker(...)</code> as a one-shot function call.</b><br>
 * If the panel keeps an ordinary Worker alive after its useful work is finished, returning from the Worker source or from its last message handler does not dispose it. Call {@link Worker#terminate terminate()} when the panel is done with it, design the Worker protocol so Worker-global {@link WorkerGlobalScope#close close()} is called when the Worker knows it is finished, or use {@link Worker.RunAsync Worker.RunAsync()} when the task is naturally one-shot.</div>
 *
 * <h2>Handling Worker errors</h2>
 * 
 * An exception that is <strong>not caught by Worker code</strong> and escapes Worker startup code, a Worker message handler, a timer callback, or another Worker task is reported as an {@link ErrorEvent}. A normal <code>try...catch</code> handles the exception locally and prevents this error-reporting path from being used.
 * 
 * For uncaught exceptions, Worker-local handling comes first: if Worker-global {@link WorkerGlobalScope#onerror onerror} or an <strong><code>error</code></strong> listener is installed, the error is handled there and is not forwarded to the parent. Otherwise it is forwarded to the parent side, where {@link Worker#onerror Worker.onerror} or an <strong><code>error</code></strong> listener can handle it.
 * 
 * ```js
 * worker.onerror = function (event) {
 *     console.log('Worker error: ' + event.message);
 *     console.log('Source: ' + event.filename);
 *     console.log('Location: ' + event.lineno + ':' + event.colno);
 * };
 * ```
 *
 * If the error reaches the parent and no parent error handler is installed, JSplitter shows the normal panel-script error UI. A named inline Worker can produce a diagnostic like this:
 *
 * ```text
 * z is not defined
 *
 * Worker: spectrum-renderer
 * File: worker.js
 * Line: 42, Column: 5
 * Stack trace:
 *   scheduleNext@worker.js:42:5
 *   onmessage@worker.js:68:3
 * ```
 *
 * Read it from top to bottom:
 *
 * <ul class="doc-article-list">
 * <li><b>Error message</b> — <b><code>z is not defined</code></b> is the exception text.</li>
 * <li><b><code>Worker:</code></b> — the immutable Worker name supplied at construction time. An unnamed Worker shows <b><code>&lt;unnamed&gt;</code></b>.</li>
 * <li><b><code>File:</code></b> — the Worker source name. Inline Workers use <b><code>worker.js</code></b>; file-backed Workers use the startup script basename.</li>
 * <li><b><code>Line / Column:</code></b> — the original location of the exception in Worker code.</li>
 * <li><b><code>Stack trace:</code></b> — the original Worker call chain when SpiderMonkey provides it.</li>
 * </ul>
 *
 * The resolved full path of a file-backed Worker is retained internally for relative file resolution, but diagnostics intentionally use the script basename to match ordinary panel-script diagnostics.
 *
 * A parent-side error handler can also deliberately turn a Worker failure into a normal panel-script exception by throwing. The <b><code>event</code></b> parameter below is the incoming {@link ErrorEvent}, so the original Worker location is available directly on that object:
 *
 * ```js
 * worker.onerror = function (event) {
 *     console.log('Original Worker location: ' +
 *         event.filename + ':' + event.lineno + ':' + event.colno);
 *
 *     throw new Error('Worker failed: ' + event.message);
 * };
 * ```
 *
 * <h2>Sending structured data</h2>
 * Messages are not limited to strings. {@link Worker#postMessage Worker.postMessage()} and Worker-global {@link WorkerGlobalScope#postMessage postMessage()} use structured-clone semantics: the sender serializes the value and the receiver reconstructs its own independent value. The two realms do not share the same JavaScript object.
 *
 * ```js
 * const worker = new Worker(`
 * onmessage = function (event) {
 *     const request = event.data;
 *
 *     if (request.command === 'sum') {
 *         const total = request.values.reduce((a, b) => a + b, 0);
 *
 *         // WORKER: send a structured result object back to the panel.
 *         postMessage({
 *             command: 'sum-result',
 *             total: total
 *         });
 *     }
 * };
 * `);
 *
 * worker.onmessage = function (event) {
 *     console.log(event.data.command); // sum-result
 *     console.log(event.data.total);   // 10
 *
 *     // PANEL: this one-shot example has its result, so it no longer needs
 *     // the Worker to remain alive waiting for more messages.
 *     worker.terminate();
 * };
 *
 * // PANEL: the object and nested array are cloned for the Worker.
 * worker.postMessage({
 *     command: 'sum',
 *     values: [1, 2, 3, 4]
 * });
 * ```
 *
 * Ordinary JavaScript objects, arrays, maps, sets, typed arrays, ArrayBuffers and other supported structured-clone values can be sent this way. Selected JSplitter host wrappers can also cross the message boundary; the exact types and their ownership rules are listed later under <b>Host objects in messages</b>.
 *
 * <h2>Broadcasting between panels and Workers</h2>
 * {@link Worker#postMessage Worker.postMessage()} is a direct channel between one panel and one specific Worker. When several independent panels and/or Workers should publish and receive messages by a shared name, use {@link BroadcastChannel} instead. BroadcastChannel uses asynchronous structured-clone delivery and does not require the sender to keep references to every receiver.
 *
 * ```js
 * const channel = new BroadcastChannel('playback-state');
 * channel.onmessage = event => console.log(event.data);
 * channel.postMessage({ playing: true, track: 12 });
 * ```
 *
 * The same constructor and handlers are available in panel and Worker realms. One important difference from direct Worker messaging is ownership: <b>BroadcastChannel has no transfer list and never detaches the sender's objects.</b> Values are structured-cloned for its receivers. A broadcast can fan out to several independent destinations, so there is no single receiver that could take ownership of a transferred resource.
 *
 * ```js
 * // Broadcast: cloned for listeners; bitmap stays usable here.
 * channel.postMessage({ bitmap: bitmap });
 *
 * // Direct Worker message: ownership can be moved to this one Worker.
 * worker.postMessage({ bitmap: bitmap }, [bitmap]);
 * // bitmap is detached after a successful transfer.
 * ```
 *
 * If you need publish/subscribe delivery, use {@link BroadcastChannel}. If you need to move a large transferable resource to one known Worker without retaining a usable source object, use the transfer-list form described below. See {@link BroadcastChannel} and its linked sample for the complete broadcast usage guide.
 *
 * <h2>Transferring ownership</h2>
 * A transferable value uses the same message channel but a different ownership model.
 * Normal structured clone leaves the source usable and creates a representation for the receiver.
 * Transfer instead <b>moves ownership</b> of the underlying resource without cloning.
 * After a successful transfer, the source wrapper is detached and <b>must not be used</b> again
 * by the sender.
 *
 * The syntax difference is the <b>transfer list</b> passed as the second argument.
 * The transfer list is separate from the message payload. It identifies transferable objects
 * contained anywhere in the payload that should have their ownership moved instead of being cloned.
 *
 * ```js
 * // Clone: both objects remain usable in the panel.
 * worker.postMessage({
 *     bitmap: bitmap,
 *     chunk: audioChunk
 * });
 *
 * // Transfer: the message payload is still the first argument.
 * // The transfer list only specifies which transferable objects inside that
 * // payload move to the Worker instead of being cloned.
 * worker.postMessage(
 *     {
 *         bitmap: bitmap,
 *         chunk: audioChunk,
 *         values: [1, 2, 3, 4]
 *     },
 *     [bitmap, audioChunk]
 * );
 *
 * // After a successful transfer, bitmap and audioChunk are detached in the
 * // panel. Other values in the message, such as "values", are cloned normally.
 * ```
 *
 * Transfers are atomic with respect to the transfer list. A call to <b><code>postMessage(value, transferList)</code></b> either transfers every transferable object
 * in the list or transfers none of them.
 *
 * If the message cannot be serialized, or any object in the transfer list cannot be transferred,
 * {@link Worker#postMessage postMessage()} fails <b>synchronously by throwing an exception in the sender</b>.
 * The message is not queued, all source objects remain usable, and no object in the transfer list is detached.
 *
 * After {@link Worker#postMessage postMessage()} successfully serializes the message and commits the transfer,
 * all objects listed in the transfer list are detached in the sender.
 *
 * A message is delivered only after sender-side serialization and transfer have completed successfully.
 * If the receiving realm then cannot reconstruct one of the message values, that endpoint receives a
 * {@link Worker#onmessageerror messageerror} event and remains usable for later messages. This is a
 * receiver-side delivery failure and is therefore separate from a synchronous exception thrown by
 * <code>postMessage()</code> in the sender. A completed transfer is <b>not rolled back</b>, and transferred
 * source objects remain detached.
 *
 * JSplitter adds two diagnostic fields to that {@link MessageEvent}:
 * {@link MessageEvent#errorMessage errorMessage} tells you why reconstruction failed, while
 * {@link MessageEvent#direction direction} tells you whether the failed delivery was
 * <b>panel-to-worker</b> or <b>worker-to-panel</b>. The original payload is not available because
 * reconstruction did not complete, so {@link MessageEvent#data data} is <b>undefined</b>.
 *
 * ```js
 * worker.onmessageerror = function (event) {
 *     // PANEL: a Worker result reached this panel but could not be reconstructed.
 *     console.log('Failed direction: ' + event.direction);
 *     console.log('Reason: ' + event.errorMessage);
 * };
 * ```
 *
 * Inside a Worker, Worker-global {@link WorkerGlobalScope#onmessageerror onmessageerror} exposes
 * the same fields; its direction is <b>panel-to-worker</b>. This is a delivery/structured-clone
 * failure, not an uncaught Worker exception, so it is separate from
 * {@link Worker#onerror onerror}.
 *
 * <h2>Host objects in messages</h2>
 * The examples above cover normal structured data and transfer syntax. JSplitter also defines explicit messaging rules for its native host wrappers. The lists below are the reference for which wrappers may cross between the panel and Worker realms.
 *
 * <b>Cloneable host objects.</b> Sending one of these without a transfer list leaves the source object usable in the sender and creates an independent representation for the receiving realm.
 * <details class="doc-capability-list"><summary><b>Cloneable host objects</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link FbMetadbHandle}</li>
 * <li>{@link FbMetadbHandleList}</li>
 * <li>{@link FbFileInfo}</li>
 * <li>{@link FbTitleFormat}</li>
 * <li>{@link FbPlaybackQueueItem}</li>
 * <li>{@link FbPlayingItemLocation}</li>
 * <li>{@link FbAudioChunk}</li>
 * <li>{@link DriveInfo}</li>
 * <li>{@link RunResult}</li>
 * <li>{@link GdiGraphics.MeasureStringInfo GDI MeasureStringInfo}</li>
 * <li>{@link D2DGraphics.MeasureStringInfo D2D MeasureStringInfo}</li>
 * <li>{@link D2DCompileInfo}</li>
 * <li>{@link GdiBitmap}</li>
 * <li>{@link GdiFont}</li>
 * <li>{@link GdiBrush}</li>
 * <li>{@link D2DBitmap}</li>
 * <li>{@link D2DFont}</li>
 * <li>{@link D2DBrush}</li>
 * <li>{@link D2DStrokeStyle}</li>
 * </ul>
 * </details>
 *
 * <b>Transferable host objects.</b> These are the JSplitter host wrappers that support the transfer-list ownership model demonstrated above. After a successful transfer the source wrapper is detached and no longer usable on the sender side; if serialization itself fails, the transfer is rolled back and the source remains usable.
 * 
 * Transfer support is intentionally limited to objects that own a significant dynamic resource whose ownership can be moved efficiently and unambiguously between realms. Smaller value-like objects are simply cloned, while shared or realm-bound resources are not made transferable.
 * 
 * <details class="doc-capability-list"><summary><b>Transferable host objects</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link FbAudioChunk}</li>
 * <li>{@link GdiBitmap}</li>
 * <li>{@link D2DBitmap}</li>
 * </ul>
 * <p>All three types are also cloneable. Choose ordinary cloning when both realms still need a usable object. Transfer moves bitmap pixel storage or the {@link FbAudioChunk} sample buffer to the receiving realm without keeping a usable source wrapper.</p>
 * </details>
 *
 * <b>Realm-local host objects.</b> Other wrappers represent live services, graphics state or resources whose meaning is tied to the realm that created them. They can be used normally inside that realm, including inside a Worker when the relevant API is available there, but they cannot cross a structured-clone message boundary. Attempting to post one fails serialization rather than silently sharing the native object.
 *
 * <details class="doc-capability-list"><summary><b>Realm-local host objects</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link FbProfiler}</li>
 * <li>{@link FbUiSelectionHolder}</li>
 * <li>{@link FbPlaylistRecycler}</li>
 * <li>{@link HtmlDocument}</li>
 * <li>{@link HtmlNode}</li>
 * <li>{@link GdiRawBitmap}</li>
 * <li>{@link GdiGraphics}</li>
 * <li>{@link D2DGraphics}</li>
 * <li>{@link D2DEffect}</li>
 * </ul>
 * <p>{@link MainMenuManager} and {@link ContextMenuManager} are additionally panel-only because their factories are not exposed in Workers.</p>
 * </details>
 *
 * <h2>Panel realm versus Worker realm</h2>
 * A Worker is not another panel. It has no panel HWND, no {@link window} object, no panel graphics render target, and no panel UI/input callbacks such as {@link module:Callbacks.on_paint on_paint}, {@link module:Callbacks.on_key_down on_key_down} or {@link module:Callbacks.on_mouse_move on_mouse_move}. This does not mean Worker code has no callbacks at all: message/event handlers and completion callbacks belonging to Worker-capable asynchronous host APIs remain available where documented. A Worker has its own {@link fb}, {@link plman}, {@link utils}, {@link gdi}, {@link console} and {@link performance} namespace objects. When Direct2D is initialized before the Worker is created, {@link d2d} is available as well.
 * <div class="doc-note warning"><b>Direct2D versions earlier than 1.1 are not supported in the Worker.</b><br>
 * Minimum OS requirements: Windows 8+ or Windows 7 Service Pack 1 with the Platform Update for Windows 7 installed.</b><br></div>
 * 
 * These APIs are exposed in the Worker realm, but this does not mean that every operation runs on the Worker thread: methods marked <strong>MAIN THREAD</strong> cross to the main thread internally but, for example, GDI and Direct2D resources can be created and used by the Worker for offscreen rendering in its own thread.
 *
 * The Worker environment implements the JSplitter subset of familiar Worker primitives: {@link EventTarget}, {@link Event}, {@link MessageEvent}, {@link ErrorEvent}, {@link PromiseRejectionEvent}, {@link WorkerGlobalScope}, timers and promises. The local JSplitter interface pages describe the supported surface and behaviour.
 *
 * <h2>Worker API coverage</h2>
 * Most useful non-UI JSplitter API is available inside a Worker. Namespaces marked <b>mostly available</b> below expose the large majority of their normal surface; the relatively small set of exclusions is listed separately in <b>APIs intentionally unavailable in Workers</b>.
 *
 * <ul class="doc-article-list">
 * <li><b>Core Worker environment</b> — messaging, events, timers, promises, {@link include include()} are available.</li>
 * <li>{@link fb} — <b>mostly available</b>. Playback, library/selection data, title formatting, DSP/output state and most non-modal host operations are exposed.</li>
 * <li>{@link plman} — <b>mostly available</b>. Playlist manipulation, playback queue, sorting, undo/redo and the playlist recycler are exposed.</li>
 * <li>{@link utils} — <b>mostly available</b>. Filesystem, hashing, text/binary/INI, package/system information, HTML parsing, drives, image/album-art loading, process, HTTP and download helpers are exposed.</li>
 * <li>{@link gdi} — <b>fully available</b> as a DrawMode-aware Worker namespace. In GDI mode its factories create GDI+ resources; when the Worker is created from a Direct2D panel, the same <b><code>gdi.*</code></b> factories route to the Worker Direct2D backend and create the corresponding D2D resources.</li>
 * <li>{@link d2d} — <b>fully available</b> as a Worker namespace when Direct2D is initialized before Worker creation, including effects, compile support and Worker-local offscreen rendering. Set {@link window.DrawMode} to <b>1</b> in the panel <b>before</b> creating a Worker that needs Direct2D.</li>
 * <li>{@link console} — <b>fully available</b> inside a Worker.</li>
 * <li>{@link performance} — <b>fully available</b> inside a Worker.</li>
 * </ul>
 *
 * <h2>APIs intentionally unavailable in Workers</h2>
 * <b>Panel and browser globals.</b> The panel {@link window} namespace, panel UI/input callbacks such as {@link module:Callbacks.on_paint on_paint}, {@link module:Callbacks.on_key_down on_key_down} and {@link module:Callbacks.on_mouse_move on_mouse_move}, tooltips, theme/HWND services and the panel graphics render target are not Worker concepts. In particular, the panel-provided {@link GdiGraphics} or {@link D2DGraphics} graphics context passed to UI painting callbacks is not available to Worker code. Also panel-only compatibility globals such as {@link ActiveXObject} and {@link Enumerator}, and nested {@link Worker} creation are also unavailable.
 *
 * The mostly available namespaces listed above also omit a small number of operations that are modal, interactive, tied to live panel UI state, or otherwise unsuitable for a Worker:
 *
 * <details class="doc-capability-list"><summary><b>fb</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link fb.AddDirectory}</li>
 * <li>{@link fb.AddFiles}</li>
 * <li>{@link fb.CreateContextMenuManager}</li>
 * <li>{@link fb.CreateMainMenuManager}</li>
 * <li>{@link fb.DoDragDrop}</li>
 * <li>{@link fb.LoadPlaylist}</li>
 * <li>{@link fb.RunContextCommand}</li>
 * <li>{@link fb.RunContextCommandWithMetadb}</li>
 * <li>{@link fb.RunMainMenuCommand}</li>
 * <li>{@link fb.SavePlaylist}</li>
 * </ul>
 * </details>
 *
 * <details class="doc-capability-list"><summary><b>plman</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link plman.ShowAutoPlaylistUI}</li>
 * <li>{@link plman.ShowPlaylistLockUI}</li>
 * </ul>
 * </details>
 *
 * <details class="doc-capability-list"><summary><b>utils</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link utils.ColourPicker}</li>
 * <li>{@link utils.EditTextFile}</li>
 * <li>{@link utils.FilePicker}</li>
 * <li>{@link utils.FolderPicker}</li>
 * <li>{@link utils.FontPicker}</li>
 * <li>{@link utils.InputBox}</li>
 * <li>{@link utils.MessageBox}</li>
 * <li>{@link utils.ShowHtmlDialog}</li>
 * </ul>
 * </details>
 *
 * <h2>Main-thread host operations</h2>
 * Many APIs are callable from Worker code but ultimately use foobar2000 services that can only execute on the main thread (this is a foobar2000 SDK requirement). When the Worker calls one of these APIs, it waits synchronously until that host operation finishes. Occasional calls are fine; a tight loop of them defeats much of the reason for moving work to a Worker.
 *
 * <div class="doc-article-diagram">GOOD
 * panel:  send one useful batch
 *                    |
 *                    v
 * worker: process / aggregate / render
 *                    |
 *                    v
 * panel:  receive compact result
 *
 * POOR
 * worker: main thread -> main thread -> main thread -> ...</div>
 *
 * <div class="doc-note warning"><b>Avoid building a Worker around repeated main-thread calls.</b><br>
 * If most of a Worker consists of frequent synchronous host calls, moving that code to a Worker will usually provide no performance benefit and can make it slower because of repeated cross-thread synchronization. If the main thread is busy, the Worker waits too.</div>
 *
 * The lists below show the Worker-accessible API that uses this synchronous main-thread bridge:
 *
 * <details class="doc-capability-list"><summary><b>plman</b></summary>
 * <p><b>EVERY</b> Worker-exposed {@link plman} function is main-thread bridged. These live properties also have main-thread accessors:</p>
 * <ul class="doc-api-link-list">
 * <li>{@link plman.ActivePlaylist}</li>
 * <li>{@link plman.PlaybackOrder}</li>
 * <li>{@link plman.PlayingPlaylist}</li>
 * <li>{@link plman.PlaylistCount}</li>
 * </ul>
 * <p>Reading {@link plman.PlaylistRecycler} itself only obtains the Worker-local {@link FbPlaylistRecycler} wrapper; its operations are main-thread bridged.</p>
 * </details>
 *
 * <details class="doc-capability-list"><summary><b>fb</b></summary>
 * <h4>Functions</h4>
 * <ul class="doc-api-link-list">
 * <li>{@link fb.AcquireUiSelectionHolder}</li>
 * <li>{@link fb.AddLocationsAsync}</li>
 * <li>{@link fb.CheckClipboardContents}</li>
 * <li>{@link fb.ClearPlaylist}</li>
 * <li>{@link fb.CopyHandleListToClipboard}</li>
 * <li>{@link fb.Exit}</li>
 * <li>{@link fb.EnumerateMainMenuCommands}</li>
 * <li>{@link fb.GetActiveDSPs}</li>
 * <li>{@link fb.GetClipboardContents}</li>
 * <li>{@link fb.GetDSPPresets}</li>
 * <li>{@link fb.GetFocusItem}</li>
 * <li>{@link fb.GetLibraryItems}</li>
 * <li>{@link fb.GetLibraryRelativePath}</li>
 * <li>{@link fb.GetLibraryRoots}</li>
 * <li>{@link fb.GetNowPlaying}</li>
 * <li>{@link fb.GetSelection}</li>
 * <li>{@link fb.GetSelections}</li>
 * <li>{@link fb.GetSelectionType}</li>
 * <li>{@link fb.IsLibraryEnabled}</li>
 * <li>{@link fb.IsMainMenuCommandChecked}</li>
 * <li>{@link fb.IsMetadbInMediaLibrary}</li>
 * <li>{@link fb.Next}</li>
 * <li>{@link fb.Pause}</li>
 * <li>{@link fb.Play}</li>
 * <li>{@link fb.PlayOrPause}</li>
 * <li>{@link fb.Prev}</li>
 * <li>{@link fb.Random}</li>
 * <li>{@link fb.RegisterMainMenuCommand}</li>
 * <li>{@link fb.Restart}</li>
 * <li>{@link fb.SetDSPPreset}</li>
 * <li>{@link fb.SetOutputDevice}</li>
 * <li>{@link fb.ShowConsole}</li>
 * <li>{@link fb.ShowLibrarySearchUI}</li>
 * <li>{@link fb.ShowPictureViewer}</li>
 * <li>{@link fb.ShowPlaylistSearchUI}</li>
 * <li>{@link fb.ShowPreferences}</li>
 * <li>{@link fb.Stop}</li>
 * <li>{@link fb.UnregisterMainMenuCommand}</li>
 * <li>{@link fb.VolumeDown}</li>
 * <li>{@link fb.VolumeMute}</li>
 * <li>{@link fb.VolumeUp}</li>
 * </ul>
 * <h4>Properties</h4>
 * <ul class="doc-api-link-list">
 * <li>{@link fb.AlwaysOnTop}</li>
 * <li>{@link fb.CursorFollowPlayback}</li>
 * <li>{@link fb.CustomVolume}</li>
 * <li>{@link fb.IsPaused}</li>
 * <li>{@link fb.IsPlaying}</li>
 * <li>{@link fb.PlaybackFollowCursor}</li>
 * <li>{@link fb.PlaybackLength}</li>
 * <li>{@link fb.PlaybackTime}</li>
 * <li>{@link fb.ReplaygainMode}</li>
 * <li>{@link fb.StopAfterCurrent}</li>
 * <li>{@link fb.Volume}</li>
 * </ul>
 * </details>
 *
 * <details class="doc-capability-list"><summary><b>utils / console</b></summary>
 * <h4>utils</h4>
 * <ul class="doc-api-link-list">
 * <li>{@link utils.CheckComponent}</li>
 * <li>{@link utils.GetClipboardText}</li>
 * <li>{@link utils.GetPackageInfo}</li>
 * <li>{@link utils.GetPackagePath}</li>
 * <li>{@link utils.RecyclePath}</li>
 * <li>{@link utils.Run}</li>
 * <li>{@link utils.SetClipboardText}</li>
 * </ul>
 * <h4>console</h4>
 * <ul class="doc-api-link-list">
 * <li>{@link console.GetLines}</li>
 * <li>{@link console.ClearBacklog}</li>
 * </ul>
 * <p>The console methods above use the foobar2000 main-thread console manager on foobar2000 2.0 and newer; the legacy JSplitter-owned console backlog path is thread-safe and direct.</p>
 * </details>
 *
 * <details class="doc-capability-list"><summary><b>Host wrapper methods</b></summary>
 * <ul class="doc-api-link-list">
 * <li>{@link FbMetadbHandle#RefreshStats}</li>
 * <li>{@link FbMetadbHandleList#GetLibraryRelativePaths}</li>
 * <li>{@link FbMetadbHandleList#OptimiseFileLayout}</li>
 * <li>{@link FbMetadbHandleList#OrderByRelativePath}</li>
 * <li>{@link FbMetadbHandleList#RefreshStats}</li>
 * <li>{@link FbMetadbHandleList#RemoveAttachedImage}</li>
 * <li>{@link FbMetadbHandleList#RemoveAttachedImages}</li>
 * <li>{@link FbMetadbHandleList#UpdateFileInfoFromJSON}</li>
 * <li>{@link FbTitleFormat#Eval}</li>
 * <li>{@link FbUiSelectionHolder#SetSelection}</li>
 * <li>{@link FbUiSelectionHolder#SetPlaylistSelectionTracking}</li>
 * <li>{@link FbUiSelectionHolder#SetPlaylistTracking}</li>
 * <li>{@link FbPlaylistRecycler#Count}</li>
 * <li>{@link FbPlaylistRecycler#GetName}</li>
 * <li>{@link FbPlaylistRecycler#GetContent}</li>
 * <li>{@link FbPlaylistRecycler#Purge}</li>
 * <li>{@link FbPlaylistRecycler#Restore}</li>
 * </ul>
 * </details>
 *
 * A small note on {@link fb.GetAudioChunk fb.GetAudioChunk}: it's normally accesses the visualisation stream directly from the Worker but its first use may briefly synchronize with the main thread while that stream is initialized.
 *
 * A Worker waiting for a bridge call can normally be terminated cleanly. Once a main-thread callback has already begun executing, however, it cannot be interrupted halfway through; that in-progress host operation must return before it can be fully unwound. Blocking or modal host APIs are therefore deliberately excluded from the Worker surface.
 *
 * <h2>Capability badges and terms</h2>
 * The detailed API pages use four local badges for the concepts introduced above:
 *
 * <ul class="doc-article-list">
 * <li><span class="flag capability worker">WORKER</span> — this API item is available from Worker code. Absence of this badge means the item is not part of the documented Worker surface.</li>
 * <li><span class="flag capability main-thread">MAIN THREAD</span> — as described in <b>Main-thread host operations</b> above, the item is callable from a Worker but its foobar2000 host operation executes synchronously on the main thread. The Worker waits for that operation to return, so repeated calls should be avoided in hot Worker loops.</li>
 * <li><span class="flag capability cloneable">CLONEABLE</span> — instances of this host type can be sent through {@link Worker#postMessage postMessage()} using structured clone while the source remains usable.</li>
 * <li><span class="flag capability transferable">TRANSFERABLE</span> — instances can additionally be placed in the transfer list so ownership moves to the receiver; after a successful transfer the source wrapper is detached and no longer usable on the sender side.</li>
 * </ul>
 *
 * <h2>One-shot work with Worker.RunAsync()</h2>
 * When work naturally has one input and one result, {@link Worker.RunAsync Worker.RunAsync()} avoids building a message protocol around a short-lived Worker. Each call creates a normal temporary Worker realm and Worker thread with the same Worker-side API surface as {@link Worker} code. The callback arguments are structured-cloned into that realm, and the callback's return value (or the resolved value of its Promise) is structured-cloned back to the panel. The temporary Worker is terminated automatically after success or failure.
 *
 * Both synchronous and asynchronous callbacks are supported:
 *
 * ```js
 * const result = await Worker.RunAsync(
 *     async (arg1, arg2) => {
 *         // Runs in a separate Worker realm/thread.
 *         return arg1 + arg2;
 *     },
 *     20,
 *     22
 * );
 *
 * console.log(result); // 42
 * ```
 *
 * The callback is recreated from its JavaScript source in the Worker realm. Although the call syntax looks like an ordinary local callback, it therefore does <b>not</b> capture lexical variables from the panel. This is incorrect:
 *
 * ```js
 * const factor = 10;
 *
 * // Wrong: factor exists only in the panel realm.
 * const result = await Worker.RunAsync(
 *     value => value * factor,
 *     5
 * );
 * // Rejects with ReferenceError: factor is not defined
 * ```
 *
 * Pass every required value explicitly as an argument instead:
 *
 * ```js
 * const factor = 10;
 *
 * // Correct: factor crosses the realm boundary through structured clone.
 * const result = await Worker.RunAsync(
 *     (value, factor) => value * factor,
 *     5,
 *     factor
 * );
 * ```
 *
 * User-defined normal, arrow and <b><code>async</code></b> functions are supported. Native and bound functions cannot be recreated from source and are rejected. If the callback throws, returns a rejected Promise, or an argument/result cannot be structured-cloned, the Promise returned by <b><code>RunAsync()</code></b> rejects, so ordinary <b><code>try...catch</code></b> around <b><code>await</code></b> can handle the failure. Relative {@link include include()} calls inside the callback keep the caller's script/package roots.
 *
 * <b><code>RunAsync()</code></b> currently uses structured clone only and has no transfer-list parameter. Use an ordinary long-lived {@link Worker} with {@link Worker#postMessage postMessage()} when explicit ownership transfer, repeated requests, persistent Worker state, or a custom message protocol is required. Each <b><code>RunAsync()</code></b> call creates a fresh full Worker, so it is intended for reasonably coarse one-shot jobs rather than tiny operations in a hot loop.
 *
 * Streaming text I/O is a practical RunAsync() example for larger or longer-running file operations: the work can be performed in a Worker while the panel remains responsive. 
 *
 * ```js
 * const summary = await Worker.RunAsync((input, output) => {
 *     const reader = utils.OpenTextReader(input);
 *     if (!reader) throw new Error('Unable to open input file');
 *
 *     const writer = utils.OpenTextWriter(output, false);
 *     if (!writer) {
 *         reader.Close();
 *         throw new Error('Unable to create output file');
 *     }
 *
 *     let lines = 0;
 *     try {
 *         for (;;) {
 *             const line = reader.ReadLine();
 *             if (line === null) break;
 *             writer.WriteLine(line);
 *             ++lines;
 *         }
 *     } finally {
 *         reader.Close();
 *         writer.Close();
 *     }
 *
 *     return { lines };
 * }, inputPath, outputPath);
 * ```
 *
 * <h2>Samples</h2>
 * The samples are intentionally ordered. Start with lifecycle/messaging, then move through batch data processing, CPU-bound work, asynchronous image processing and finally a real-time audio/render pipeline.
 *
 * <b>1. Basic Messaging.</b> The smallest complete lifecycle example: create a named inline Worker, send a structured object, receive a result, install parent/Worker <b><code>messageerror</code></b> diagnostics and a parent error handler, then let the Worker finish with Worker-global {@link WorkerGlobalScope#close close()}. The unload handler also shows that parent {@link Worker#terminate terminate()} is safe during panel teardown.
 *
 * ```js
 * // PANEL: create and immediately start a named Worker from prepared source text.
 * const worker = new Worker(source, 'basic-messaging');
 *
 * // PANEL: values sent by Worker-global postMessage(...) arrive here as event.data.
 * worker.onmessage = event => console.log(event.data);
 *
 * // PANEL: send one object to this Worker. JSplitter structured-clones it before
 * // the Worker's onmessage handler receives its own reconstructed copy.
 * worker.postMessage({ values: [1, 2, 3, 4] });
 * ```
 *
 * <b>2. Playlist Statistics.</b> Presents Media Library and the existing playlists as an interactive source list. The panel obtains one {@link FbMetadbHandleList}, then the <b>Main / Worker</b> switch runs the same metadata and {@link FbFileInfo} aggregation either synchronously in the panel realm or on the cloned list in the Worker. The detail view reports calculation and end-to-end time, making the responsiveness/overhead trade-off visible on large real-world batches.
 *
 * ```js
 * // Panel: obtain one source batch. Media Library uses fb.GetLibraryItems();
 * // playlists use plman.GetPlaylistItems(...).
 * const handles = source.library ? fb.GetLibraryItems() : plman.GetPlaylistItems(source.index);
 *
 * // Worker mode: clone the complete list once and aggregate it off the panel thread.
 * worker.postMessage({ requestId, handles });
 *
 * // Main mode runs the same analyseHandles(handles) function in the panel realm.
 * ```
 *
 * <b>3. Fractal Renderer.</b> Demonstrates a CPU-bound render job that belongs entirely in a Worker. Pan and zoom reuse one completed frame locally for immediate feedback; drag sends one final viewport on release, while wheel and resize bursts are coalesced for 80 ms. The Worker renders only the settled viewport, transfers the completed bitmap, and stale results are rejected by view id. The <b>GDI / D2D</b> switch recreates the Worker so the same <b><code>gdi.*</code></b> facade can be compared in both rendering modes.
 *
 * <b>4. Playlist Album Gallery.</b> A practical artwork-loading A/B test. <b>Main / Worker</b> runs the same visible-cover pipeline either in the panel or in the Worker. In Worker mode the panel sends one cloneable {@link FbMetadbHandleList}; the Worker deduplicates it into albums, loads artwork with {@link utils.GetAlbumArtAsyncV2 GetAlbumArtAsyncV2}, resizes each image and transfers completed bitmaps back individually. Only the covers that fit in the current viewport are requested, changing cover size intentionally reloads them, and the sample has no artwork cache. <b>Concurrency</b> controls how many artwork requests may be in flight, while <b>GDI / D2D</b> selects the rendering backend. Targeted <b><code>RepaintRect</code></b> updates and timing counters make first display, loading, delivery and paint cost visible.
 *
 * <b>5. Spectrum Analyzer.</b> The real-time A/B test. <b>Main / Worker</b> runs the same audio-read, FFT and offscreen-render pipeline on either thread. Both paths allow only one completed frame at a time; the next frame starts only after the previous bitmap reaches <b><code>on_paint</code></b>, so the counters measure work that can actually be presented. Additional switches select <b>GDI / D2D</b>, FFT size, and either a <b>120 FPS</b> limiter or <b>Max</b> mode. The overlay reports frame/paint rate plus audio, FFT, render and total processing time. <b>Max</b> is useful for exposing fixed per-frame overhead, but the sample is not intended as a general GDI-versus-D2D benchmark.
 *
 * ```js
 * // Worker: read a short audio window and turn it into spectrum data.
 * const chunk = fb.GetAudioChunk(0.06, -0.03);
 * analyse(chunk);
 *
 * // Render a complete offscreen frame, then transfer its ownership to the panel.
 * const frame = renderSpectrum();
 * postMessage({ bitmap: frame, timing }, [frame]);
 * // frame is detached here after a successful transfer and must not be reused.
 *
 * // Panel: keep one completed frame and request presentation. Do not acknowledge
 * // it yet: the Worker remains paused until this exact frame reaches on_paint.
 * worker.onmessage = function (event) {
 *     frame = event.data.bitmap;
 *     window.Repaint();
 * };
 *
 * function on_paint(gr) {
 *     gr.DrawImage(frame, 0, 0, window.Width, window.Height, 0, 0, frame.Width, frame.Height);
 *     worker.postMessage({ type: 'next' });
 * }
 * ```
 *
 * @constructor
 * @signature Worker(source[, name])
 * @signature Worker({ file }[, name])
 * @param {(string|Object)} source JavaScript source text, or a file descriptor object such as <code>{ file: 'workers/main.js' }</code>.
 * @param {string=} [name=""] Optional immutable Worker identity exposed through read-only Worker-global {@link WorkerGlobalScope#name name}, reported by {@link window.JsMemoryStats}, and shown in unhandled Worker exception diagnostics.
 * @throws {Error} If the arguments are invalid, a file-backed Worker cannot resolve or read its startup file, or the Worker cannot be created or started.
 * 
 * @sourceFile ../../component/samples/worker/01. Basic Messaging.js
 * @sourceFile ../../component/samples/worker/02. Playlist Statistics.js
 * @sourceFile ../../component/samples/worker/03. Fractal Renderer.js
 * @sourceFile ../../component/samples/worker/04. Playlist Album Gallery.js
 * @sourceFile ../../component/samples/worker/05. Spectrum Analyzer.js
 */
function Worker(source, name) {
    /**
     * Runs a user-defined JavaScript callback once in a temporary Worker and returns a Promise for its result.<br>
     * A fresh full Worker realm/thread is created for every call. Arguments are structured-cloned into the Worker; a synchronous return value or the resolved value of an asynchronous callback is structured-cloned back. The temporary Worker is terminated automatically when the operation settles.<br>
     * The callback is recreated from its source and does not capture lexical variables from the caller. Pass required values explicitly through <code>args</code>. Native and bound functions are not supported. Relative {@link include include()} calls keep the caller's script/package roots.<br>
     * This API does not currently expose a transfer list. For repeated requests, persistent Worker state, or explicit ownership transfer, use a normal {@link Worker} and {@link Worker#postMessage postMessage()}.
     *
     * @static
     * @param {function()} callback User-defined JavaScript function to execute in the temporary Worker. The function may return a value or a Promise.
     * @param {...*} args Values passed to <code>callback</code> through structured clone.
     * @return {Promise.<*>} Promise resolved with the structured-cloned callback result. It rejects if the callback throws or rejects, the callback cannot be recreated, Worker startup fails, or an argument/result cannot be structured-cloned.
     * @throws {Error} If <code>callback</code> is not callable or the RunAsync helper itself cannot be initialized.
     *
     * @example
     * const result = await Worker.RunAsync(
     *     async (a, b) => {
     *         return a + b;
     *     },
     *     20,
     *     22
     * );
     * console.log(result); // 42
     *
     * @sourceFile ../../component/samples/basic/Streaming Text IO.js
     */
    this.RunAsync = function (callback, ...args) { };

    /**
     * Receives messages sent from the Worker through Worker-global {@link WorkerGlobalScope#postMessage postMessage()}.
     *
     * @type {?WorkerMessageCallback}
     */
    this.onmessage = null;

    /**
     * Receives uncaught Worker errors reported to the parent endpoint as an {@link ErrorEvent}.
     * The callback argument exposes the error text through {@link ErrorEvent#message message} and the original Worker source location through {@link ErrorEvent#filename filename}, {@link ErrorEvent#lineno lineno} and {@link ErrorEvent#colno colno}.
     * If no parent error handler exists, the Worker error is promoted to the normal panel-script error UI/failure path. Throwing from this handler likewise propagates as a normal panel script exception, whose stack begins in the parent handler.
     *
     * @type {?WorkerErrorCallback}
     */
    this.onerror = null;

    /**
     * Receives a {@link MessageEvent} when a serialized message cannot be reconstructed by the parent endpoint.
     * {@link MessageEvent#errorMessage errorMessage} contains the reconstruction failure and {@link MessageEvent#direction direction} is <b>worker-to-panel</b>.
     *
     * @type {?WorkerMessageCallback}
     */
    this.onmessageerror = null;

    /**
     * Serializes and sends a value to the Worker. Sender-side serialization and transfer-list validation are synchronous; successful delivery to the Worker is asynchronous.
     *
     * @param {*} data Value to send.
     * @param {(Array<*>|Object)=} [transfer] Transfer list, either directly as an array or as an object containing <code>{ transfer: [...] }</code>.
     * @throws {Error} If the required data argument is omitted, the value cannot be structured-cloned, or the transfer list is invalid or cannot be committed. No message is queued and transferable source objects remain usable when this happens.
     */
    this.postMessage = function (data, transfer) { };

    /**
     * Stops this Worker from the parent panel and releases pending Worker-side state.
     * Use this when the panel no longer needs the Worker; Workers are terminated automatically when their parent panel is unloaded.
     * A main-thread host callback that has already begun executing cannot be interrupted halfway through.
     */
    this.terminate = function () { };
}

/**
 * Base event target used by Worker objects, Worker global scopes and {@link BroadcastChannel} objects.
 *
 * @constructor
 * @worker
 */
function EventTarget() {
    /**
     * Registers an event listener.
     * @param {string} type
     * @param {(function|Object)} callback Function or object with a <code>handleEvent()</code> method.
     * @param {(boolean|Object)=} [options]
     * @worker
     */
    this.addEventListener = function (type, callback, options) { };

    /**
     * Removes a matching event listener.
     * @param {string} type
     * @param {(function|Object)} callback
     * @param {(boolean|Object)=} [options]
     * @worker
     */
    this.removeEventListener = function (type, callback, options) { };

    /**
     * Dispatches an event to registered listeners.
     * @param {Event} event
     * @return {boolean} false when a cancelable event was canceled, otherwise true.
     * @worker
     */
    this.dispatchEvent = function (event) { };
}

/**
 * Standard-style event object used by the Worker event system.
 *
 * @constructor
 * @worker
 * @param {string} type
 * @param {Object=} [options]
 */
function Event(type, options) {
    /**
     * Event type supplied when the event was created, for example <code>message</code> or <code>error</code>.
     * @type {string}
     * @readonly
     * @worker
     */
    this.type = "";

    /**
     * Event target on which the event was originally dispatched. It is <code>null</code> before dispatch.
     * @type {?EventTarget}
     * @readonly
     * @worker
     */
    this.target = null;

    /**
     * Event target whose listener is currently being invoked. It is <code>null</code> outside listener dispatch.
     * @type {?EventTarget}
     * @readonly
     * @worker
     */
    this.currentTarget = null;

    /**
     * <code>true</code> when {@link Event#preventDefault preventDefault()} successfully canceled the event's default action.
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.defaultPrevented = false;

    /**
     * Whether {@link Event#preventDefault preventDefault()} can cancel this event.
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.cancelable = false;

    /**
     * Whether the event participates in bubbling through an event-target hierarchy.
     * @type {boolean}
     * @readonly
     * @worker
     */
    this.bubbles = false;

    /** @worker */
    this.preventDefault = function () { };
    /** @worker */
    this.stopPropagation = function () { };
    /** @worker */
    this.stopImmediatePropagation = function () { };
}

/**
 * Event carrying a structured-clone message payload. Used by direct Worker messaging and {@link BroadcastChannel} in both panel and Worker realms.
 *
 * @constructor
 * @worker
 * @param {string} type
 * @param {Object=} [options]
 */
function MessageEvent(type, options) {
    /**
     * Structured-clone payload carried by a <code>message</code> event.
     * @type {*}
     * @readonly
     * @worker
     */
    this.data = undefined;

    /**
     * Message origin. JSplitter Worker and BroadcastChannel messages use an empty string because they are not URL-origin messages.
     * @type {string}
     * @readonly
     * @worker
     */
    this.origin = "";

    /**
     * Last event identifier. JSplitter Worker messages do not use event-stream IDs, so this is an empty string.
     * @type {string}
     * @readonly
     * @worker
     */
    this.lastEventId = "";

    /**
     * Message source endpoint. JSplitter Worker and BroadcastChannel messages do not expose a MessagePort-style source, so this is <code>null</code>.
     * @type {*}
     * @readonly
     * @worker
     */
    this.source = null;

    /**
     * Transferred message ports. JSplitter does not expose MessagePort objects, so this array is empty. Trusted JSplitter messaging events expose it as an empty frozen array.
     * @type {Array}
     * @readonly
     * @worker
     */
    this.ports = [];

    /**
     * JSplitter reconstruction diagnostic for a <b>messageerror</b> event.
     * It contains the structured-clone read failure reported by the receiving endpoint and is an empty string for an ordinary <b>message</b> event.
     * @type {string}
     * @readonly
     * @worker
     */
    this.errorMessage = "";

    /**
     * Direction of a JSplitter message: <b>panel-to-worker</b>, <b>worker-to-panel</b>, or <b>broadcast</b> for {@link BroadcastChannel}.
     * Manually constructed MessageEvent objects use an empty string unless a direction is supplied explicitly.
     * @type {string}
     * @readonly
     * @worker
     */
    this.direction = "";
}

/**
 * Event carrying an uncaught Worker error. Trusted Worker error events dispatched by JSplitter are non-cancelable because handler presence itself determines whether the error is handled.
 *
 * @constructor
 * @worker
 * @param {string} type
 * @param {Object=} [options]
 */
function ErrorEvent(type, options) {
    /**
     * Human-readable error message reported by the failing Worker script or callback.
     * @type {string}
     * @readonly
     * @worker
     */
    this.message = "";

    /**
     * Script filename associated with the error when one is available. File-backed Workers report the basename, matching panel-script diagnostics.
     * @type {string}
     * @readonly
     * @worker
     */
    this.filename = "";

    /**
     * One-based source line associated with the error, or <code>0</code> when unavailable.
     * @type {number}
     * @readonly
     * @worker
     */
    this.lineno = 0;

    /**
     * Source column associated with the error, or <code>0</code> when unavailable.
     * @type {number}
     * @readonly
     * @worker
     */
    this.colno = 0;

    /**
     * Original thrown JavaScript value when it can be exposed to the receiving realm.
     * @type {*}
     * @readonly
     * @worker
     */
    this.error = undefined;
}

/**
 * Event used for unhandled and later-handled Worker Promise rejections.
 *
 * @constructor
 * @worker
 * @param {string} type
 * @param {Object} options
 */
function PromiseRejectionEvent(type, options) {
    /**
     * Promise whose rejection triggered this event.
     * @type {Promise}
     * @readonly
     * @worker
     */
    this.promise = undefined;

    /**
     * Rejection reason associated with {@link PromiseRejectionEvent#promise promise}.
     * @type {*}
     * @readonly
     * @worker
     */
    this.reason = undefined;
}

/**
 * Global object available inside every JSplitter Worker.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function WorkerGlobalScope() {
    /**
     * The Worker global object itself.
     * @type {WorkerGlobalScope}
     * @readonly
     * @worker
     */
    this.self = undefined;

    /**
     * Immutable Worker identity supplied through the Worker constructor. The value is fixed for the Worker's lifetime.
     * JSplitter reports the same name in {@link window.JsMemoryStats} and in unhandled Worker exception diagnostics. If no name was supplied this value is an empty string; diagnostics display it as <code>&lt;unnamed&gt;</code>.
     * @type {string}
     * @readonly
     * @worker
     */
    this.name = "";

    /**
     * Serializes and sends a value from the Worker to its parent. Sender-side serialization and transfer-list validation are synchronous; successful delivery to the parent is asynchronous.
     *
     * @param {*} data Value to send.
     * @param {(Array<*>|Object)=} [transfer] Transfer list, either directly as an array or as an object containing <code>{ transfer: [...] }</code>.
     * @throws {Error} If the required data argument is omitted, the value cannot be structured-cloned, or the transfer list is invalid or cannot be committed. No message is queued and transferable source objects remain usable when this happens.
     * @worker
     */
    this.postMessage = function (data, transfer) { };

    /**
     * Requests Worker shutdown from inside the Worker after the current task completes.
     * Use this when Worker code itself knows that no more event-loop work is needed.
     *
     * @worker
     */
    this.close = function () { };

    /**
     * Receives messages sent by the parent through {@link Worker#postMessage Worker.postMessage()}.
     * @type {?WorkerMessageCallback}
     * @worker
     */
    this.onmessage = null;

    /**
     * Receives a {@link MessageEvent} when a serialized parent message cannot be reconstructed by the Worker.
     * {@link MessageEvent#errorMessage errorMessage} contains the reconstruction failure and {@link MessageEvent#direction direction} is <b>panel-to-worker</b>.
     * @type {?WorkerMessageCallback}
     * @worker
     */
    this.onmessageerror = null;

    /**
     * Global error handler for uncaught Worker task exceptions. The callback receives an {@link ErrorEvent} with the error text and Worker source location. When this handler or a Worker-global <b><code>error</code></b> listener is installed, the error is handled locally and is not forwarded to the parent Worker.
     * @type {?WorkerErrorCallback}
     * @worker
     */
    this.onerror = null;

    /**
     * Handler for newly unhandled Promise rejections.
     * @type {?WorkerPromiseRejectionCallback}
     * @worker
     */
    this.onunhandledrejection = null;

    /**
     * Handler for Promise rejections that later become handled.
     * @type {?WorkerPromiseRejectionCallback}
     * @worker
     */
    this.onrejectionhandled = null;

    /**
     * Worker-local performance timeline.
     * @type {Object}
     * @readonly
     * @worker
     */
    this.performance = undefined;
}

/**
 * Callback used for Worker <code>message</code> and <code>messageerror</code> handlers.
 *
 * @callback WorkerMessageCallback
 * @param {MessageEvent} event
 * @return {void}
 * @worker
 */

/**
 * Callback used for Worker error handlers.
 *
 * @callback WorkerErrorCallback
 * @param {ErrorEvent} event
 * @return {void}
 * @worker
 */

/**
 * Callback used for Worker Promise rejection handlers.
 *
 * @callback WorkerPromiseRejectionCallback
 * @param {PromiseRejectionEvent} event
 * @return {void}
 * @worker
 */
