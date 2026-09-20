/**
 * Callback used by {@link BroadcastChannel#onmessage onmessage} and {@link BroadcastChannel#onmessageerror onmessageerror}.
 * @callback BroadcastChannelMessageCallback
 * @param {MessageEvent} event Broadcast message or reconstruction-error event.
 * @return {void}
 * @worker
 */

/**
 * Named asynchronous messaging channel shared by JSplitter panel and Worker realms.<br>
 *
 * <b>BroadcastChannel</b> is the recommended API for new many-to-many communication between independent JSplitter panels and Workers. Every open channel with the same name participates in the same process-wide JSplitter namespace. A sender publishes a value with {@link BroadcastChannel#postMessage postMessage()}, and every other currently open channel with that name receives a {@link MessageEvent}. The sending channel itself does not receive its own message.<br>
 *
 * Unlike {@link Worker#postMessage Worker.postMessage()}, which addresses one specific Worker owned by one panel, BroadcastChannel is intentionally decoupled: the sender does not need to know which panels or Workers are listening. 
 * <div class="doc-note warning">
 *     <b>For new code, prefer BroadcastChannel over <code>window.NotifyOthers()</code>.</b><br>
 *     The legacy <code>window.NotifyOthers()</code> mechanism is synchronous and exposes the same live JavaScript value to other panels. This tightly couples the sender and receivers: changes made to a shared object can be visible across panels, and notification handling can directly affect the sender's execution.<br>
 *     <code>BroadcastChannel</code> avoids these limitations by delivering messages asynchronously and using structured clone, so each recipient receives its own independent copy of the transmitted data.<br>
 *     <code>window.NotifyOthers()</code> remains available for compatibility with existing scripts.
 * </div>
 * <h2>Quick start</h2>
 * 
 * Create two JSplitter panels.
 * 
 * In the first panel, create a channel and wait for messages:
 * 
 * ```js
 * const channel = new BroadcastChannel('my-script-state');
 * 
 * channel.onmessage = function (event) {
 *     console.log('Panel A received:', event.data);
 * };
 * ```
 * Then run this code in the second panel:
 * ```js
 * const channel = new BroadcastChannel('my-script-state');
 * 
 * channel.postMessage({
 *     type: 'selection-changed',
 *     playlist: 3,
 *     index: 34
 * });
 * ```
 * The other panel receives an independent structured-clone copy of the object. The sending <b>channel object</b> does not receive its own post. If the same realm (panel or worker) creates a second BroadcastChannel with the same name, that second channel is a separate receiver and can receive the message.
 *
 * <h2>Panel and Worker use the same API</h2>
 * BroadcastChannel is also available inside Workers. This makes it useful when a Worker should publish state to panels or to other Workers without routing every message through its parent Worker object.
 *
 * ```js
 * // PANEL
 * const channel = new BroadcastChannel('analysis-results');
 * channel.onmessage = event => {
 *     console.log('Result:', event.data);
 * };
 *
 * const worker = new Worker(`
 *     const channel = new BroadcastChannel('analysis-results');
 *
 *     channel.postMessage({
 *         type: 'ready',
 *         worker: self.name
 *     });
 * `, 'analyser');
 * ```
 *
 * Use direct {@link Worker#postMessage Worker.postMessage()} when the message belongs to one known parent/Worker pair. Use BroadcastChannel when the relationship is naturally publish/subscribe or when several panels and/or Workers may participate.
 *
 * <h2>Channel names and scope</h2>
 * The constructor name is converted to a string. Use a stable, sufficiently specific name such as <b><code>my.package.playback-state</code></b> to avoid accidental collisions with unrelated scripts. Symbols cannot be converted to a channel name and throw a TypeError.<br>
 *
 * JSplitter does not have browser origins or storage partitions. All live JSplitter panel and Worker realms inside the same foobar2000 process share one BroadcastChannel namespace. Channels do not cross process boundaries and are not persistent; closing foobar2000 destroys the namespace.
 *
 * <h2>Messages and structured clone</h2>
 * {@link BroadcastChannel#postMessage postMessage()} uses the same structured-clone infrastructure as Worker messaging. Ordinary supported JavaScript values are copied, and supported JSplitter host wrappers can be reconstructed in the destination realm. See the <b>Host objects in messages</b> section of {@link Worker} for the current cloneable host-object list.<br>
 *
 * <h2>No ownership transfer</h2>
 * BroadcastChannel has <b>no transfer-list argument</b>. Its <code>postMessage()</code> accepts the message value only. This is different from direct {@link Worker#postMessage Worker.postMessage()} and Worker-global {@link WorkerGlobalScope#postMessage postMessage()}, where a second transfer-list argument can move ownership of selected transferable objects to one specific destination.<br>
 *
 * A broadcast may have zero, one, or many receivers. There is no single receiver that can take ownership of a transferred resource, so BroadcastChannel always uses clone semantics. If a host object is cloneable, every receiver gets its own reconstructed representation and the sender's source object remains usable. No object is detached by BroadcastChannel.<br>
 *
 * ```js
 * // BroadcastChannel: clone. The sender keeps a usable bitmap.
 * const channel = new BroadcastChannel('artwork');
 * channel.postMessage({ bitmap: bitmap });
 * // bitmap is still usable here
 *
 * // Direct Worker messaging: transfer ownership to one Worker.
 * worker.postMessage({ bitmap: bitmap }, [bitmap]);
 * // bitmap is detached here after a successful transfer
 * ```
 *
 * Use BroadcastChannel when several independent panels and/or Workers should receive cloned data by channel name. Use direct Worker messaging when one known destination should take ownership of a transferable resource. See <b>Transferring ownership</b> in {@link Worker} for the transfer model and the current transferable host-object list.<br>
 *
 * Serialization is performed synchronously by {@link BroadcastChannel#postMessage postMessage()}. Before delivering the message, JSplitter first serializes it for all current receivers. If serialization fails for any receiver, postMessage() throws and no message is delivered, preventing a partial broadcast.
 * 
 * Serialization is also performed when there are no receivers. This matches the Web API behaviour, where posting a value that cannot be cloned can still throw even if nobody is listening.
 *
 * <div class="doc-note warning"><b>JSplitter implementation note:</b><br>
 * JSplitter currently performs an independent structured serialization for each receiver because some native host-object snapshots are destination-owned. Consequently, side-effectful getters or Proxy traps in the value being serialized can run once per receiver. Avoid side effects in values passed to <code>postMessage()</code>.</div>
 *
 * <h2>Receiving messages</h2>
 * Use {@link BroadcastChannel#onmessage onmessage} or the inherited {@link EventTarget#addEventListener addEventListener('message', ...)} API. Delivery is asynchronous. Messages posted sequentially by one sender are queued in the same order for a given receiver.
 *
 * Trusted BroadcastChannel <b>message</b> events are {@link MessageEvent} objects. In JSplitter they use:
 * <ul class="doc-article-list">
 * <li><b><code>event.data</code></b> — the reconstructed payload.</li>
 * <li><b><code>event.origin</code></b> — empty string.</li>
 * <li><b><code>event.source</code></b> — <code>null</code>.</li>
 * <li><b><code>event.ports</code></b> — empty frozen array.</li>
 * <li><b><code>event.direction</code></b> — <code>"broadcast"</code>.</li>
 * </ul>
 *
 * If a receiver cannot reconstruct a serialized value, its {@link BroadcastChannel#onmessageerror onmessageerror} handler receives a MessageEvent whose <b><code>data</code></b> is <code>null</code>, <b><code>direction</code></b> is <code>"broadcast"</code>, and {@link MessageEvent#errorMessage errorMessage} contains a JSplitter diagnostic string.
 *
 * <h2>Lifetime and close()</h2>
 * Call {@link BroadcastChannel#close close()} when a BroadcastChannel instance is no longer needed. This disconnects only that instance from the named channel: it can no longer send or receive messages, while other instances with the same name continue to work normally. Closing is idempotent. A queued delivery is ignored if the destination instance is closed before it runs.
 *
 * JSplitter automatically cleans up channels when a panel script is reloaded/unloaded or when a Worker terminates. An open channel with a <b>message</b> or <b>messageerror</b> listener is kept alive while its realm lives, matching the useful lifetime behaviour of the Web API; closing the channel releases that listener root. An unreachable open channel with no message listeners may be garbage-collected and removed automatically.
 *
 * For the browser API model, see {@link https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts HTML Living Standard: BroadcastChannel}.
 *
 * @constructor
 * @signature BroadcastChannel(name)
 * @param {*} name Required channel name. The value is converted to a string; Symbol values throw TypeError.
 * @throws {TypeError} If no name is supplied, if the constructor is called without <code>new</code>, or if the name cannot be converted to a string.
 * @sourceFile ../../component/samples/basic/BroadcastChannel.js
 * @worker
 */
function BroadcastChannel(name) {
    /**
     * Channel name after string conversion.
     * @type {string}
     * @readonly
     * @worker
     */
    this.name = '';

    /**
     * Handler invoked asynchronously for successfully reconstructed broadcast messages.
     * The callback receives a {@link MessageEvent} whose {@link MessageEvent#data data} contains the cloned payload and whose {@link MessageEvent#direction direction} is <code>"broadcast"</code>.
     * @type {?BroadcastChannelMessageCallback}
     * @worker
     */
    this.onmessage = null;

    /**
     * Handler invoked when this receiver cannot reconstruct an incoming broadcast message.
     * The callback receives a {@link MessageEvent} with <code>data === null</code>, <code>direction === "broadcast"</code>, and a JSplitter diagnostic in {@link MessageEvent#errorMessage errorMessage}.
     * @type {?BroadcastChannelMessageCallback}
     * @worker
     */
    this.onmessageerror = null;

    /**
     * Serializes and asynchronously broadcasts a value to every other currently open BroadcastChannel with the same {@link BroadcastChannel#name name}. The sending channel itself is excluded.<br>
     *
     * There is no transfer-list argument and BroadcastChannel never transfers ownership. Cloneable values are reconstructed for receivers while the sender's source value remains usable. Use direct Worker messaging when transferable ownership semantics are required. Clone errors are reported synchronously and no destination receives the message if serialization fails for any current destination.
     *
     * @param {*} message Value to broadcast. An explicit <code>undefined</code> is valid; omitting the argument is not.
     * @throws {TypeError} If the message argument is omitted.
     * @throws {Error} If the channel is already closed or the value cannot be structured-cloned.
     * @worker
     */
    this.postMessage = function (message) { };

    /**
     * Closes this channel object and releases its native endpoint. Future incoming messages are ignored and {@link BroadcastChannel#postMessage postMessage()} can no longer be used on it.<br>
     * Calling <code>close()</code> more than once is safe.
     * @worker
     */
    this.close = function () { };
}
