/**
 * PCM channel entry contained in {@link AudioFormat}.
 *
 * @typedef {Object} AudioChannelInfo
 * @property {number} Index
 *    Zero-based position of the channel in interleaved PCM samples. This value can be passed directly to visualization channel properties.
 * @property {number} Flag
 *    Speaker-position bit from {@link AudioFormat.ChannelConfig ChannelConfig}. Combining the flags of all channel entries produces the format's channel mask.
 * @property {Array<string>} Names
 *    Known lower-case names for this speaker position. The first value is the canonical full name; subsequent values are short or familiar aliases. The array is empty for an unknown channel flag.
 *    <table>
 *    <thead><tr><th>Canonical name</th><th>Aliases</th></tr></thead>
 *    <tbody>
 *    <tr><td><b>front-left</b></td><td><b>fl</b>, <b>left</b></td></tr>
 *    <tr><td><b>front-right</b></td><td><b>fr</b>, <b>right</b></td></tr>
 *    <tr><td><b>front-center</b></td><td><b>fc</b>, <b>center</b></td></tr>
 *    <tr><td><b>low-frequency-effects</b></td><td><b>lfe</b></td></tr>
 *    <tr><td><b>back-left</b></td><td><b>bl</b>, <b>rear-left</b></td></tr>
 *    <tr><td><b>back-right</b></td><td><b>br</b>, <b>rear-right</b></td></tr>
 *    <tr><td><b>front-center-left</b></td><td><b>fcl</b></td></tr>
 *    <tr><td><b>front-center-right</b></td><td><b>fcr</b></td></tr>
 *    <tr><td><b>back-center</b></td><td><b>bc</b>, <b>rear-center</b></td></tr>
 *    <tr><td><b>side-left</b></td><td><b>sl</b></td></tr>
 *    <tr><td><b>side-right</b></td><td><b>sr</b></td></tr>
 *    <tr><td><b>top-center</b></td><td><b>tc</b></td></tr>
 *    <tr><td><b>top-front-left</b></td><td><b>tfl</b></td></tr>
 *    <tr><td><b>top-front-center</b></td><td><b>tfc</b></td></tr>
 *    <tr><td><b>top-front-right</b></td><td><b>tfr</b></td></tr>
 *    <tr><td><b>top-back-left</b></td><td><b>tbl</b></td></tr>
 *    <tr><td><b>top-back-center</b></td><td><b>tbc</b></td></tr>
 *    <tr><td><b>top-back-right</b></td><td><b>tbr</b></td></tr>
 *    </tbody>
 *    </table>
 */

/**
 * Current visualization PCM-format snapshot returned by {@link vis.AudioFormat}.
 * It describes the post-processing stream received by visualizations and can therefore differ from the source file's format.
 *
 * @typedef {Object} AudioFormat
 * @property {number} SampleRate
 *    PCM sample rate in hertz.
 * @property {number} ChannelCount
 *    Number of interleaved PCM channels.
 * @property {number} ChannelConfig
 *    foobar2000 channel-mask value describing the speaker positions in the stream.
 * @property {Array<AudioChannelInfo>} Channels
 *    Channel entries ordered by PCM index. The array contains {@link AudioFormat.ChannelCount ChannelCount} entries.
 */

/**
 * Snapshot of the process-wide native HLSL-to-DXBC LRU cache returned by
 * {@link vis.ShaderCacheStats}. Counts cover automatic HLSL compilation performed
 * by {@link vis.CreateAsync}; {@link d2d.Compile}, {@link d2d.CompileAsync} and
 * supplied DXBC are excluded. {@link ShaderCacheStats.Hits Hits},
 * {@link ShaderCacheStats.Misses Misses} and {@link ShaderCacheStats.Evictions Evictions}
 * accumulate during the process lifetime.
 *
 * @typedef {Object} ShaderCacheStats
 * @property {number} Entries Number of cached compiled HLSL programs.
 * @property {number} Bytes Approximate CPU bytes retained for source/profile strings and DXBC buffers; excludes GPU memory and container overhead.
 * @property {number} Hits Requests served by a cached HLSL compilation result.
 * @property {number} Misses Cache lookups that did not find the requested HLSL program; concurrent requests can both miss.
 * @property {number} Evictions Entries removed when limits are exceeded or reduced.
 */

/**
 * Shader program accepted by {@link vis.CreateAsync} in any renderer stage.
 * A string must contain non-empty HLSL with entry point <b>main</b>.
 * Bytecode must be valid DXBC for <b>ps_4_0</b>, <b>ps_4_1</b> or <b>ps_5_0</b>,
 * in a non-empty, non-shared buffer that has not been detached.
 * The GPU must support the chosen shader profile. Every program must follow
 * the source or image-pass input layout described in {@link module:Visualizations Visualization API}.
 * @typedef {string|Uint8Array|ArrayBuffer} VisualizationShaderCode
 */

/**
 * Optional object form for a <b>feedback</b> or <b>post</b> image pass.
 * A pass may also be supplied directly as {@link VisualizationShaderCode}
 * when no image files are needed. The main {@link VisualizationShaderRenderer.shader shader} stage does not use this object form.
 * @typedef {Object} VisualizationImagePass
 * @property {VisualizationShaderCode} shader Program that processes the preceding RGBA image at <b>t0</b> with sampler <b>s0</b>.
 * @property {Array<string>} [textures] One to three non-empty image-file paths, bound in order at <b>t1–t3</b> with samplers <b>s1–s3</b>.
 *    Omit this property, or pass null, when no files are needed; an empty array is not accepted.
 *    Paths use the usual script image-path resolution. Files are loaded during asynchronous creation
 *    and retained as decoded image data. After a graphics-device reset, GPU textures are recreated from that data;
 *    files are not read again. To load changed file contents, create a new visualization. Each pass sees only its own images.
 */

/**
 * Renderer configuration for {@link vis.CreateAsync}. Source analysis settings
 * belong in the second argument. Shader output uses premultiplied RGBA.
 * @typedef {Object} VisualizationShaderRenderer
 * @property {VisualizationShaderCode} shader Required program that draws from the selected native audio source.
 * @property {VisualizationShaderCode|VisualizationImagePass} [feedback] One image pass transforming previous history before the current source is composited over it. Omit or pass null to disable feedback.
 * @property {VisualizationShaderCode|VisualizationImagePass|Array<VisualizationShaderCode|VisualizationImagePass>} [post]
 *    One image pass or an array of 1–4 passes, executed in order after the current image is complete.
 *    Each reads the preceding image. Omit or pass null to disable post-processing.
 * @property {number} [feedbackIntervalMs=0] Feedback-history interval: 0 for every {@link Visualization#Draw Draw}, or a finite number from 1 to 1000 milliseconds.
 *    A positive value requires {@link VisualizationShaderRenderer.feedback feedback}. Change it later through {@link Visualization#FeedbackIntervalMs FeedbackIntervalMs}.
 *    This setting does not create a timer; missed intervals are skipped and post passes still run on each draw.
 * @property {boolean} [feedbackTransparent=false] Start and composite history over transparent black instead of opaque black, retaining shader alpha. A true value requires {@link VisualizationShaderRenderer.feedback feedback}.
 * @property {boolean} [stopOnPause=false] Freeze the last completed image, including post effects, while playback is paused.
 *    A frozen image is scaled on resize without reprocessing. When false, shaders continue to run using retained audio data.
 *    This setting does not stop native audio analysis or schedule panel repaints.
 */

/**
 * Creates visualizations and manages the per-panel native audio analysis service.<br>
 * For a guided introduction, see {@link module:Visualizations Visualization API}.
 * @namespace
 */
let vis = {
    /**
     * Native audio analysis update interval, in milliseconds.<br>
     * Default: <b>16</b>. Accepts unsigned integer milliseconds from 1 to 4,294,967,295.
     * This changes the cadence of the shared audio engine, not the panel repaint
     * interval or shader feedback cadence.
     * @type {number}
     */
    UpdateIntervalMs: 16,

    /**
     * Returns a fresh snapshot of the PCM format currently received by the
     * panel's visualization engine, or <b>null</b> when there is no current
     * audio stream. See {@link AudioFormat} for the returned object properties.<br>
     * Channel names can be passed to visualization <b>Channel</b>,
     * <b>LeftChannel</b>, and <b>RightChannel</b> properties.<br>
     * Paused playback retains the last format. The property is <b>null</b> when
     * the engine has no current format, including stopped playback or before the
     * first audio chunk. Reading it does not create or start the visualization engine.
     * <p><b>Example:</b></p>
     * ```js
     * const format = vis.AudioFormat;
     * if (format) {
     *     for (const channel of format.Channels) {
     *         console.log(channel.Index + ": " + channel.Names.join(", "));
     *     }
     * }
     * ```
     * @type {?AudioFormat}
     * @readonly
     * @sourceFile ../../component/samples/vis/Builtin - Channel Explorer.js
     */
    AudioFormat: undefined,

    /**
     * HLSL compiler profile used by subsequent {@link vis.CreateAsync CreateAsync} calls in this panel.
     * Default: <b>"ps_4_0"</b>. Allowed: <b>"ps_4_0"</b>, <b>"ps_4_1"</b>, <b>"ps_5_0"</b>.
     * Each call captures the profile for all its HLSL stages. Changing it does not
     * alter pending compilations, existing visualizations or supplied DXBC.
     * The chosen profile must be supported by the GPU. This property does not
     * change the defaults of {@link d2d.Compile} or {@link d2d.CompileAsync}.
     * @type {string}
     * @see vis.ShaderFlags
     */
    ShaderTarget: "ps_4_0",

    /**
     * HLSL compiler flags used by subsequent {@link vis.CreateAsync CreateAsync} calls in this panel.
     * Default: <b>0x8008</b>, combining optimization level 3 and row-major matrix packing.
     * Accepts an unsigned 32-bit bitmask; see {@link module:Flags.D2DCompileFlags D2DCompileFlags}.
     * The mask is forwarded unchanged to the compiler for every HLSL stage in the call.
     * Like {@link vis.ShaderTarget ShaderTarget}, it is captured at creation time and does not affect supplied DXBC
     * or the separate defaults of {@link d2d.Compile} and {@link d2d.CompileAsync}.
     * Target and flags are part of the native shader-cache key.
     * @type {number}
     * @see vis.ShaderTarget
     */
    ShaderFlags: 0x8008,

    /**
     * Maximum number of HLSL-to-DXBC programs retained in the shared native
     * LRU cache. Default: <b>128</b>; allowed range: <b>0–4096</b>.
     * The limit applies across all JSplitter panels and takes effect immediately.
     * Set to zero to disable this cache. Changing the value can evict entries,
     * but does not interrupt shader visualizations that are already running.
     * This setting is not persisted across foobar2000 restarts.
     * @type {number}
     * @see vis.ShaderCacheMaxBytes
     * @see vis.ShaderCacheStats
     */
    ShaderCacheMaxEntries: 128,

    /**
     * Approximate CPU-memory limit for retained HLSL source/profile strings
     * and compiled DXBC in the shared native LRU cache, in <b>bytes</b>.
     * Default: <b>16777216</b> (16 MiB); allowed range: <b>0–1073741824</b>
     * (1 GiB). Both the byte limit and {@link vis.ShaderCacheMaxEntries ShaderCacheMaxEntries}
     * must be satisfied; zero in either property disables caching.
     * Changes take effect immediately and are not persisted across restarts.
     * Does not include GPU memory.
     * @type {number}
     * @see vis.ShaderCacheStats
     */
    ShaderCacheMaxBytes: 16777216,

    /**
     * Snapshot of five statistics from the process-wide HLSL compilation cache.
     * Each read creates a new object; the numbers are not live-updating
     * properties. See {@link ShaderCacheStats} for its five fields. Read the
     * limits separately via {@link vis.ShaderCacheMaxEntries ShaderCacheMaxEntries} and
     * {@link vis.ShaderCacheMaxBytes ShaderCacheMaxBytes}.
     * {@link d2d.Compile} and {@link d2d.CompileAsync} do not populate
     * this cache; shader HLSL compiled by {@link vis.CreateAsync CreateAsync} does.
     * <p><b>Example:</b></p>
     * ```js
     * const s = vis.ShaderCacheStats;
     * console.log(`${s.Entries}/${vis.ShaderCacheMaxEntries} shaders, ` +
     *     `${(s.Bytes / 1048576).toFixed(2)} MiB; ` +
     *     `${s.Hits} hits, ${s.Misses} misses, ${s.Evictions} evictions`);
     * ```
     * @type {ShaderCacheStats}
     * @readonly
     */
    ShaderCacheStats: undefined,

    /**
     * Creates a visualization with a built-in renderer or JavaScript drawing callback synchronously.<br>
     * <b>source_id</b> selects one of six native audio sources. Use a numeric
     * source ID (0–5) or a named constant from {@link module:Flags.VisSourceType VisSourceType}
     * after loading <b>docs/Flags.js</b> with {@link include}.
     * Omitted, null or undefined <b>source_params</b> and <b>renderer</b> use the defaults.
     * When a source snapshot is available, a callback receives <b>(gr, x, y, width, height, data)</b> when
     * {@link Visualization#Draw Draw} is called; native analysis still prepares its data.
     * See {@link module:Visualizations Visualization API} for source settings,
     * built-in renderer settings and callback data. Use {@link vis.CreateAsync CreateAsync} for HLSL/DXBC renderers.
     * <p><b>Example:</b></p>
     * ```js
     * include('docs/Flags.js');
     * const waveform = vis.Create(VisSourceType.Waveform);
     * const envelope = vis.Create(VisSourceType.Waveform, { points: 256 }, { style: "envelope" });
     * ```
     * @param {number} source_id Numeric audio source ID (0-5). See {@link module:Flags.VisSourceType VisSourceType}
     * @param {Object} [source_params] Initial native source analysis settings or null.
     * @param {Object|function} [renderer] Built-in display settings or JS drawing callback.
     * @returns {Visualization}
     * @sourceFile ../../component/samples/vis/Builtin - Waveform.js
     * @sourceFile ../../component/samples/vis/Builtin - Spectrum.js
     * @sourceFile ../../component/samples/vis/Builtin - Peak Meter.js
     * @sourceFile ../../component/samples/vis/Builtin - VU Meter.js
     * @sourceFile ../../component/samples/vis/Builtin - Spectrogram.js
     * @sourceFile ../../component/samples/vis/Builtin - Vectorscope.js
     * @sourceFile ../../component/samples/vis/Builtin - Interactive Showcase.js
     * @sourceFile ../../component/samples/vis/JS - Waveform.js
     * @sourceFile ../../component/samples/vis/JS - Spectrum.js
     * @sourceFile ../../component/samples/vis/JS - Peak Meter.js
     * @sourceFile ../../component/samples/vis/JS - VU Meter.js
     * @sourceFile ../../component/samples/vis/JS - Spectrogram.js
     * @sourceFile ../../component/samples/vis/JS - Vectorscope.js
     */
    Create: function (source_id, source_params, renderer) { },

    /**
     * Creates a shader visualization and returns a Promise resolving to it.
     * Requires a {@link VisualizationShaderRenderer}; built-in settings and JavaScript
     * drawing callbacks use {@link vis.Create Create} instead.
     * <p>HLSL stages are compiled off the UI thread using the current
     * {@link vis.ShaderTarget ShaderTarget} and {@link vis.ShaderFlags ShaderFlags} and
     * can be reused through the shared shader cache. Precompiled DXBC bypasses HLSL
     * compilation. Configuration, compilation and creation failures reject the Promise.</p>
     * <p>Draw only after the Promise resolves, with {@link window.DrawMode} set to 1
     * (Direct2D). Creation does not schedule repaints. Source runtime properties remain
     * available; shader programs and pipeline structure are fixed at creation time, while
     * {@link Visualization#FeedbackIntervalMs FeedbackIntervalMs} remains adjustable.</p>
     * <p><b>Example:</b></p>
     * ```js
     * include('docs/Flags.js');
     * window.DrawMode = 1;
     * let visual = null;
     * // 'hlsl' contains a complete source shader; see the linked examples.
     * vis.CreateAsync(VisSourceType.Waveform, null, { shader: hlsl })
     *     .then(v => { visual = v; window.Repaint(); })
     *     .catch(e => console.log("Visualization creation failed: " + e));
     * ```
     * @param {number} source_id Numeric audio source ID (0–5). See {@link module:Flags.VisSourceType VisSourceType}
     * @param {Object} source_params Initial native source analysis settings, or null/undefined to use defaults.
     * @param {VisualizationShaderRenderer} renderer Shader pipeline configuration.
     * @returns {Promise<Visualization>}
     * @sourceFile ../../component/samples/vis/Shader - Waveform.js
     * @sourceFile ../../component/samples/vis/Shader - Spectrum.js
     * @sourceFile ../../component/samples/vis/Shader - Peak Meter.js
     * @sourceFile ../../component/samples/vis/Shader - VU Meter.js
     * @sourceFile ../../component/samples/vis/Shader - Spectrogram.js
     * @sourceFile ../../component/samples/vis/Shader - Vectorscope.js
     * @sourceFile ../../component/samples/vis/Shader - Image Post.js
     * @sourceFile ../../component/samples/vis/Shader - Feedback and Two Posts.js
     * @sourceFile ../../component/samples/vis/Shader - MilkDrop 0101.js
     * @sourceFile ../../component/samples/vis/Shader - MilkDrop ALL.js
     */
    CreateAsync: function (source_id, source_params, renderer) { }
};

/**
 * Visualization object returned by {@link vis.Create} and {@link vis.CreateAsync}.
 * This is a documentation-only instance description, not a constructor exposed by
 * the {@link vis} namespace. A visualization retains its native audio subscription while alive.<br>
 * Source runtime properties are exposed directly on this object; built-in renderers
 * add their renderer properties to the same object. Shader visualizations expose
 * {@link Visualization#FeedbackIntervalMs FeedbackIntervalMs} and
 * {@link Visualization#InjectFeedback InjectFeedback}. See
 * {@link module:Visualizations Visualization API} for the complete property tables.
 * @hideconstructor
 */
class Visualization {
    /**
     * Draws this visualization within the specified rectangle. Call from
     * {@link module:Callbacks.on_paint on_paint} using the current graphics context.
     * The method does not change {@link vis.UpdateIntervalMs} or schedule another repaint.
     * With shader feedback enabled, it also advances history when a step is due.<br>
     * Built-in and JavaScript callback renderers support GDI and Direct2D; shader
     * renderers created with {@link vis.CreateAsync CreateAsync} require Direct2D.
     * @param {D2DGraphics|GdiGraphics} gr Current drawing context.
     * @param {number} x Left edge in panel pixels.
     * @param {number} y Top edge in panel pixels.
     * @param {number} width Destination width in pixels.
     * @param {number} height Destination height in pixels.
     */
    Draw(gr, x, y, width, height) { }

    /**
     * Queues a {@link D2DBitmap} for the next actual feedback-history update of
     * a shader visualization. The image is alpha-composited after the feedback and
     * source passes and before history is saved; post passes run afterwards. The
     * injection is one-shot and does not force a repaint or an early history update.
     *
     * The bitmap is copied on the GPU when this method is called and may then be
     * modified or released. If several injections are queued before the next history
     * update, only the latest is retained. The bitmap must use the same Direct2D device
     * as the visualization and is scaled to the history area. Maximum size: <b>4096 px</b>
     * per side and <b>4194304 pixels</b> total. A graphics-device reset can discard a
     * pending injection. Available only when the shader visualization has a
     * <b>feedback</b> pass.
     * <p><b>Example:</b></p>
     * ```js
     * // 'visual' is a shader visualization created with a feedback pass.
     * const image = d2d.CreateImage(512, 128);
     * const g = image.GetGraphics();
     * try {
     *     g.DrawString('Next track', d2d.Font('Segoe UI', 28),
     *         0xffffffff, 10, 20, 492, 70);
     * } finally {
     *     image.ReleaseGraphics(g);
     * }
     * visual.InjectFeedback(image); // One next history step, not every Draw().
     * ```
     * @param {D2DBitmap} bitmap Direct2D bitmap with the image to add to history, normally on a transparent background.
     * @returns {void}
     * @throws {Error} If feedback is absent, the bitmap is invalid, exceeds the feedback limits or uses an incompatible Direct2D device.
     * @sourceFile ../../component/samples/vis/Shader - MilkDrop ALL.js
     */
    InjectFeedback(bitmap) { }

    /**
     * Shader feedback interval in milliseconds. Use 0 to advance history on every
     * {@link Visualization#Draw Draw}, or a finite number from 1 to 1000 for a fixed
     * cadence; fractional values are supported. Positive values require a feedback
     * pass. Without feedback, the property reads 0 and accepts only 0.
     *
     * Changing the value preserves history and other visualization state. The next
     * eligible {@link Visualization#Draw Draw} uses the new cadence; assigning the same
     * value leaves the current schedule intact. This property does not create a timer
     * or request a repaint, and missed history steps are skipped. See
     * {@link module:Visualizations Visualization API} for shader timing details.
     * ```js
     * // visual already has a feedback pass; keep requesting panel repaints.
     * visual.FeedbackIntervalMs = 1000 / 120; // Fixed 120-Hz history step.
     * const interval = visual.FeedbackIntervalMs;
     * visual.FeedbackIntervalMs = 0;          // History advances on each Draw.
     * ```
     * @type {number}
     * @throws {Error} If the value is not a finite number equal to 0 or within
     * 1..1000, or a positive value is assigned without a feedback pass.
     */
    FeedbackIntervalMs = 0;

    /**
     * Numeric native source type used to create this visualization. See {@link module:Flags.VisSourceType VisSourceType}
     * @type {number}
     * @readonly
     */
    SourceType = undefined;

    /**
     * Renderer family: built-in, JavaScript callback, or shader. See {@link module:Flags.VisRendererType VisRendererType}
     * @type {number}
     * @readonly
     */
    RendererType = undefined;

    /**
     * Diagnostic information about this visualization and its native audio
     * engine, including source and feedback statistics when applicable.
     * @type {string}
     * @readonly
     */
    DebugInfo = undefined;
}
