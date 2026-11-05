/**
 * <p>JSplitter provides a visualization API built around reusable audio sources and renderers. A <b>source</b> prepares audio measurements; a <b>renderer</b> turns them into a picture. Six native sources are available: Waveform, Spectrum, Peak Meter, VU Meter, Spectrogram, and Vectorscope. Each source can use its built-in renderer or provide data to a custom JavaScript or shader renderer.</p>
 * <p>This article covers both approaches: it starts with the built-in visualizations and their settings, then explains how the same sources can be used with custom renderers.</p>
 * <h2>How the analysis engine works</h2>
 * <p>Each panel has one native analysis engine shared by its visualizations. It starts with the first visualization, stops after the last one is released, and performs audio analysis on a dedicated thread.</p>
 * <p>Active sources request only the measurements they need, and compatible analysis work is reused automatically. {@link vis.UpdateIntervalMs} controls the requested analysis cadence; the default is <b>16 ms</b>. Panel repainting is independent: scripts request repaints and {@link Visualization#Draw Draw} renders the latest available snapshot.</p>
 * <h2>Creating your first visualization</h2>
 * <p>Start playback and run this complete script in a panel. It creates one waveform, draws it in the paint callback and requests regular repaints:</p>
 * ```js
 * include('docs/Flags.js');
 * // Create a waveform visualization with default settings and built-in renderer.
 * const waveform = vis.Create(VisSourceType.Waveform);
 *
 * // Match the background as well, so theme-colored content remains visible.
 * const backgroundColor = window.InstanceType === UIInstanceType.DefaultUI ?
 *     window.GetColourDUI(ColourTypeDUI.background) : window.GetColourCUI(ColourTypeCUI.background);
 *
 * function on_paint(gr) {
 *     const w = window.Width, h = window.Height;
 *     gr.FillSolidRect(0, 0, w, h, backgroundColor);
 *     if (w > 0 && h > 0) waveform.Draw(gr, 0, 0, w, h);
 * }
 *
 * setInterval(() => window.Repaint(), 33); // Request roughly 30 FPS presentation.
 * ```
 * <p>{@link include include} loads the named constants used by the script. {@link module:Callbacks.on_paint on_paint} paints the panel, {@link Visualization#Draw Draw} draws the latest visualization snapshot inside the specified rectangle, and the timer requests another paint with {@link window.Repaint Repaint}. A visualization does not clear the panel, so draw the background before calling {@link Visualization#Draw Draw}. The built-in renderer uses the active UI text color by default; the example therefore uses the matching DUI/CUI background color.</p>
 * <h2>Sources and renderers</h2>
 * <p>Audio reaches the engine as <b>PCM</b> (Pulse-Code Modulation): successive amplitude samples for each channel.</p>
 * <p>{@link vis.Create vis.Create} creates a visualization from one of JSplitter's native audio sources.</p>
 *
 * ```text
 * Create(source_id[, source_params, renderer])
 * ```
 *
 * <p><b>source_id</b> selects which audio source to use. It is a numeric source ID from 0 to 5; for readability, use the corresponding {@link module:Flags.VisSourceType VisSourceType} constants.</p>
 * <p><b>source_params</b> configures the source analysis. Available settings depend on the selected source and are listed with each visualization below. Omit the argument, or pass null or undefined, to use the source defaults.</p>
 * ```js
 * const spectrum = vis.Create(VisSourceType.Spectrum, { fftSize: 2048 });
 * ```
 * <p><b>renderer</b> controls how the source data is displayed. With {@link vis.Create Create}, pass either a built-in renderer settings object or a JavaScript drawing callback. Omit the argument, or pass null or undefined, to use the default built-in renderer.</p>
 * ```js
 * const waveform = vis.Create(VisSourceType.Waveform, null, { style: "line", lineWidth: 2 });
 * ```
 * <p>The returned {@link Visualization} object has {@link Visualization#Draw Draw}, which draws inside the specified rectangle in panel pixels. The visualization does not schedule repaints by itself, so the script requests them with {@link window.Repaint window.Repaint}. Create the visualization once, outside {@link module:Callbacks.on_paint on_paint}.</p>
 * <div class="doc-note"><b>Built-in renderers support both GDI and Direct2D.</b> They draw through the graphics context passed to {@link Visualization#Draw Draw}. JavaScript callback renderers likewise use the panel's current GDI or Direct2D context. Only shader renderers created with {@link vis.CreateAsync CreateAsync} require Direct2D ({@link window.DrawMode} = 1).</div>
 * <h3>Changing settings at runtime</h3>
 * <p>The returned {@link Visualization} object exposes settings that can be inspected and changed at runtime. The tables below pair creation settings with their corresponding runtime properties. Unless noted otherwise, exposed settings are readable and writable.</p>
 * <p>Source and renderer settings are exposed on the same visualization object. Source properties remain available with every renderer type. Built-in renderer properties are exposed only by built-in visualizations; JavaScript callbacks perform their own drawing, while shader visualizations expose only their shader-specific renderer properties.</p>
 * ```js
 * const waveform = vis.Create(VisSourceType.Waveform, { points: 256 }, { style: "envelope" });
 * waveform.Points = 512;
 * waveform.Style = "line";
 * ```
 * <p>Creation settings use lower camel case, such as <b>fftSize</b>; the corresponding runtime properties use JSplitter property naming, such as <b>FftSize</b>. Changing a runtime property updates the running visualization.</p>
 * <p>On the returned visualization object, {@link Visualization#SourceType SourceType}, {@link Visualization#RendererType RendererType}, and {@link Visualization#DebugInfo DebugInfo} are read-only.</p>
 * <h3>Selecting source channels</h3>
 * <p>Waveform, Spectrum, Peak Meter, VU Meter, and Spectrogram use <b>channel</b> to select the audio input. Vectorscope uses <b>leftChannel</b> and <b>rightChannel</b> instead.</p>
 * <p>A channel selector accepts a channel name or PCM index:</p>
 * ```js
 * const left = vis.Create(VisSourceType.Waveform, { channel: "left" });
 * const second = vis.Create(VisSourceType.Waveform, { channel: 1 });
 * ```
 * <p>The same selector can be changed later through <b>Channel</b>:</p>
 * ```js
 * left.Channel = "right";
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:28%"><col style="width:72%"></colgroup>
 * <thead><tr><th>Selector</th><th>Meaning</th></tr></thead>
 * <tbody>
 * <tr><td><b>"mix"</b></td><td>Mix all available channels to mono. This is the default.</td></tr>
 * <tr><td>Channel name</td><td>Select a speaker position such as <b>"left"</b>, <b>"right"</b>, or <b>"rear-left"</b>.</td></tr>
 * <tr><td>Non-negative integer</td><td>Select a fixed PCM channel index.</td></tr>
 * </tbody></table>
 * <p>To inspect the channels available in the current stream, use {@link vis.AudioFormat}. Its {@link AudioFormat.Channels Channels} array lists them in PCM index order with their known names:</p>
 * ```js
 * const format = vis.AudioFormat;
 * if (format) {
 *     for (const channel of format.Channels) {
 *         console.log(channel.Index, channel.Names);
 *     }
 * }
 * ```
 * <p>{@link vis.AudioFormat} describes the current post-processing PCM stream, so it may differ from the source file after DSP, downmixing, or upmixing. It is <b>null</b> when no current audio format is available. See {@link AudioFormat} for the complete object.</p>
 * <p>Vectorscope uses two selectors instead: <b>leftChannel</b> and <b>rightChannel</b> at creation time, and <b>LeftChannel</b> and <b>RightChannel</b> at runtime. They accept channel names or PCM indices, but not <b>"mix"</b>:</p>
 * ```js
 * const vectorscope = vis.Create(VisSourceType.Vectorscope, {
 *     leftChannel: "left",
 *     rightChannel: "right"
 * });
 * ```
 * <h2>Built-in visualizations</h2>
 * <p>JSplitter provides a built-in renderer for each native visualization source. The sections below show creation examples, screenshots, and the corresponding source and renderer settings.</p>
 * <p><b>Interactive showcase:</b> <a href="source-samples-vis-Builtin---Interactive-Showcase.js.html">Builtin - Interactive Showcase.js</a> places all six built-in visualization types in one live grid.</p>
 * <p>Colors in JavaScript settings use <b>0xAARRGGBB</b>. Where a renderer default is described as <b>UI text color</b>, it is initialized from the current DUI/CUI text color when the visualization is created.</p>
 * <h3>Waveform</h3>
 * <p>A waveform displays the recent audio signal as amplitude over time. Its center line represents zero amplitude, with positive and negative excursions on either side. A line trace reveals the oscillations; an envelope makes the signal’s minimum and maximum excursions easier to see at high sample densities.</p>
 * ```js
 * const waveform = vis.Create(
 *     VisSourceType.Waveform,
 *     { points: 384, durationMs: 220, smoothing: 0.25 },
 *     { style: "line", color: 0xff63a4ff, gain: 1.35, glowStrength: 0.5, glowRadius: 4 }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/waveform.png" alt="Waveform: amplitude variations over a PCM window." loading="lazy"><figcaption>Waveform: amplitude variations over a PCM window.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.Waveform}</h4>
 * <p>The Waveform source prepares either a resampled center trace or a min/max envelope. The built-in line renderer and shader renderer use the center trace; the built-in envelope renderer uses the min/max data. A JavaScript callback receives all three arrays.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>channel</b></td>
 * <td><b>Channel</b></td>
 * <td>"mix"</td>
 * <td><b>"mix"</b>, channel name, or non-negative PCM index</td>
 * <td>Select the audio input using the channel selector described above. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>points</b></td>
 * <td><b>Points</b></td>
 * <td>"auto"</td>
 * <td>Integer 16–4096 or "auto"</td>
 * <td>Resolution of the returned waveform. Automatic mode follows drawing width; a fixed count does not.</td>
 * </tr>
 * <tr>
 * <td><b>durationMs</b></td>
 * <td><b>DurationMs</b></td>
 * <td>300</td>
 * <td>Integer 20–2000 ms</td>
 * <td>How much of the recent PCM signal to show, in milliseconds. Short windows reveal individual oscillations; longer ones show more of the recent signal.</td>
 * </tr>
 * <tr>
 * <td><b>smoothing</b></td>
 * <td><b>Smoothing</b></td>
 * <td>0</td>
 * <td>Finite number 0–1</td>
 * <td>Spatial smoothing applied to the generated waveform. Zero preserves the unsmoothed shape; larger values soften abrupt variations.</td>
 * </tr>
 * <tr>
 * <td><b>circular</b></td>
 * <td><b>Circular</b> (shader only)</td>
 * <td>false</td>
 * <td>true or false</td>
 * <td>Requests periodic/closed waveform sampling for custom renderers. It is honored at creation time by JavaScript callbacks and shader renderers; only shader visualizations expose it as a runtime property. The built-in waveform renderer ignores it.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p><b>Runtime-only:</b> <b>ActualPoints</b> is read-only and reports the effective waveform point count. When <b>Points</b> is "auto", this value follows the current drawing width; with a fixed <b>Points</b> value, it reports that fixed count.</p>
 * <h4>Built-in renderer</h4>
 * <p>The built-in renderer draws either the central trace or the min/max envelope. It can also change the displayed amplitude, stroke width and glow without changing PCM data.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>style</b></td>
 * <td><b>Style</b></td>
 * <td>"line"</td>
 * <td>"line" or "envelope"</td>
 * <td>"line" draws the central sample trace; "envelope" shows each interval’s minimum and maximum as vertical strokes.</td>
 * </tr>
 * <tr>
 * <td><b>color</b></td>
 * <td><b>Color</b></td>
 * <td>UI text color</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>Color used for drawing, in ARGB format; does not change native audio analysis.</td>
 * </tr>
 * <tr>
 * <td><b>gain</b></td>
 * <td><b>Gain</b></td>
 * <td>1</td>
 * <td>Finite number: 0 &lt; value ≤ 16</td>
 * <td>Visual amplitude multiplier; the raw PCM data is unchanged.</td>
 * </tr>
 * <tr>
 * <td><b>lineWidth</b></td>
 * <td><b>LineWidth</b></td>
 * <td>1</td>
 * <td>Finite number: 0 &lt; value ≤ 16 px</td>
 * <td>Thickness of the trace, in pixels.</td>
 * </tr>
 * <tr>
 * <td><b>glowStrength</b></td>
 * <td><b>GlowStrength</b></td>
 * <td>0</td>
 * <td>Finite number: 0–1</td>
 * <td>Controls the intensity of the soft glow; zero disables it.</td>
 * </tr>
 * <tr>
 * <td><b>glowRadius</b></td>
 * <td><b>GlowRadius</b></td>
 * <td>0</td>
 * <td>Finite number: 0–32 px</td>
 * <td>Radius of the optional glow, in pixels.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p><b>Sample:</b> <a href="source-samples-vis-Builtin---Waveform.js.html">Builtin - Waveform.js</a>.</p>
 * <h3>Spectrum</h3>
 * <p>A spectrum shows how strongly different frequency regions are present in the current audio. Each vertical band represents a range of frequencies; its height indicates the current magnitude, while an optional marker shows a recently held peak. It is useful for observing the distribution of bass, midrange and treble over time.</p>
 * ```js
 * const spectrum = vis.Create(
 *     VisSourceType.Spectrum,
 *     { fftSize: 4096, bands: 96, maxFrequency: 20000, minDb: -78, peakHoldMs: 180 },
 *     {
 *         colorMode: "gradient", gap: 1,
 *         ranges: [
 *             { to: -36, color: 0xff63a4ff },
 *             { to: -18, color: 0xff63d471 },
 *             { to: -6,  color: 0xffffd166 },
 *             { to: 0,   color: 0xffff5d73 }
 *         ]
 *     }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/spectrum.png" alt="Spectrum: levels and held peaks across frequency bands." loading="lazy"><figcaption>Spectrum: levels and held peaks across frequency bands.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.Spectrum}</h4>
 * <p>The Spectrum source groups FFT data into frequency bands, then applies gain, dB normalization, smoothing, and peak hold. Current levels and peaks are normalized to 0–1; they are <b>not</b> calibrated peak-dBFS measurements.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>channel</b></td>
 * <td><b>Channel</b></td>
 * <td>"mix"</td>
 * <td><b>"mix"</b>, channel name, or non-negative PCM index</td>
 * <td>Select the audio input using the channel selector described above. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>fftSize</b></td>
 * <td><b>FftSize</b></td>
 * <td>4096</td>
 * <td>Power of two: 256–16384</td>
 * <td>Number of PCM samples in each Fourier-transform window. Larger windows distinguish nearby frequencies more precisely but respond less quickly to changes.</td>
 * </tr>
 * <tr>
 * <td><b>bands</b></td>
 * <td><b>Bands</b></td>
 * <td>64</td>
 * <td>Integer 4–4096</td>
 * <td>Number of frequency-band values produced by the source. With automatic bar width, the built-in renderer draws up to this many bars, limited by the available width. With a fixed bar width, the source data may be resampled to match the renderer geometry.</td>
 * </tr>
 * <tr>
 * <td><b>minFrequency</b></td>
 * <td><b>MinFrequency</b></td>
 * <td>40</td>
 * <td>Finite Hz: 0 &lt; value &lt; maxFrequency</td>
 * <td>Lower boundary of the requested frequency range, in hertz.</td>
 * </tr>
 * <tr>
 * <td><b>maxFrequency</b></td>
 * <td><b>MaxFrequency</b></td>
 * <td>23000</td>
 * <td>Finite Hz: value &gt; minFrequency</td>
 * <td>Upper boundary of the requested frequency range, in hertz. The effective range is clamped to frequencies representable by the current sample rate and FFT configuration.</td>
 * </tr>
 * <tr>
 * <td><b>minDb</b></td>
 * <td><b>MinDb</b></td>
 * <td>-72</td>
 * <td>Finite dB: −160 ≤ value &lt; maxDb</td>
 * <td>Low end of the FFT magnitude-to-display conversion. It is a relative FFT dB scale, not a calibrated peak dBFS measurement.</td>
 * </tr>
 * <tr>
 * <td><b>maxDb</b></td>
 * <td><b>MaxDb</b></td>
 * <td>0</td>
 * <td>Finite dB: minDb &lt; value ≤ +24</td>
 * <td>Upper reference of the FFT magnitude-to-display conversion. The normalized source values are capped at 0.98.</td>
 * </tr>
 * <tr>
 * <td><b>gain</b></td>
 * <td><b>Gain</b></td>
 * <td>1</td>
 * <td>Finite number &gt; 0</td>
 * <td>Multiplier applied to FFT amplitudes before their conversion into decibels; affects the data reported by the source.</td>
 * </tr>
 * <tr>
 * <td><b>attackMs</b></td>
 * <td><b>AttackMs</b></td>
 * <td>18</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level rises; smaller values react faster.</td>
 * </tr>
 * <tr>
 * <td><b>releaseMs</b></td>
 * <td><b>ReleaseMs</b></td>
 * <td>120</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level falls; larger values decay more slowly.</td>
 * </tr>
 * <tr>
 * <td><b>peakHoldMs</b></td>
 * <td><b>PeakHoldMs</b></td>
 * <td>150</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Time for which a detected peak remains held before descending.</td>
 * </tr>
 * <tr>
 * <td><b>peakGravity</b></td>
 * <td><b>PeakGravity</b></td>
 * <td>3</td>
 * <td>Finite number ≥ 0</td>
 * <td>Acceleration applied to a held peak as it falls after the hold period.</td>
 * </tr>
 * </tbody>
 * </table>
 * <h4>Built-in renderer</h4>
 * <p>The built-in renderer turns analyzed bands into bars, colors them according to the chosen dB zones, and optionally draws peak markers. Bar spacing and segment geometry do not change the underlying analysis.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>barWidth</b></td>
 * <td><b>BarWidth</b></td>
 * <td>0</td>
 * <td>Integer 0–64 px (0 = automatic)</td>
 * <td>Zero sizes bars automatically to the draw width; a positive value fixes their width in pixels. Source band count is unchanged.</td>
 * </tr>
 * <tr>
 * <td><b>gap</b></td>
 * <td><b>Gap</b></td>
 * <td>1</td>
 * <td>Integer 0–64 px</td>
 * <td>Horizontal spacing between bars.</td>
 * </tr>
 * <tr>
 * <td><b>ranges</b></td>
 * <td><b>Ranges</b></td>
 * <td>Entire dB range in UI text color</td>
 * <td>1–256 {to, color} entries; increasing to in −160…+24; 32-bit ARGB colors</td>
 * <td>Color zones specified by to thresholds in dB of the source scale. Entries must be strictly increasing. The final entry may cover the upper part of the source range.</td>
 * </tr>
 * <tr>
 * <td><b>colorMode</b></td>
 * <td><b>ColorMode</b></td>
 * <td>"gradient"</td>
 * <td>"gradient" or "discrete"</td>
 * <td>Controls smooth color blending versus separate, LED-like color zones; independent of segment spacing.</td>
 * </tr>
 * <tr>
 * <td><b>segmentSize</b></td>
 * <td><b>SegmentSize</b></td>
 * <td>6</td>
 * <td>Integer 0–1024 px (0 = automatic)</td>
 * <td>Height of a vertical segment, in pixels. Zero requests automatic sizing for segmented geometry.</td>
 * </tr>
 * <tr>
 * <td><b>segmentGap</b></td>
 * <td><b>SegmentGap</b></td>
 * <td>0</td>
 * <td>Integer 0–64 px</td>
 * <td>Spacing between vertical segments, in pixels. Zero produces a continuous shape.</td>
 * </tr>
 * <tr>
 * <td><b>showPeak</b></td>
 * <td><b>ShowPeak</b></td>
 * <td>true</td>
 * <td>true or false</td>
 * <td>Choose whether the built-in renderer draws the held peak marker.</td>
 * </tr>
 * <tr>
 * <td><b>peakColor</b></td>
 * <td><b>PeakColor</b></td>
 * <td>UI text color</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>ARGB color of the held peak marker; default follows the UI text color.</td>
 * </tr>
 * <tr>
 * <td><b>peakSize</b></td>
 * <td><b>PeakSize</b></td>
 * <td>1</td>
 * <td>Integer 1–64 px</td>
 * <td>Thickness of the held peak marker in gradient mode. In discrete mode, the peak aligns to a full segment.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p>This Spectrum uses three distinct color zones:</p>
 * ```js
 * const spectrum = vis.Create(VisSourceType.Spectrum, { bands: 32 }, {
 *     colorMode: "discrete",
 *     ranges: [
 *         { to: -18, color: 0xff66cc88 },
 *         { to: -6,  color: 0xffffcc55 },
 *         { to: 0,   color: 0xffff6655 }
 *     ],
 *     segmentSize: 6,
 *     segmentGap: 1
 * });
 * ```
 * <p>Each <b>to</b> is an upper threshold on the source's dB scale: green through −18 dB, yellow through −6 dB and red above that up to 0 dB. Thresholds must increase. <b>colorMode</b> selects distinct zones or a gradient; <b>segmentGap</b> independently introduces gaps in the bar geometry.</p>
 * <p><b>Runtime-only:</b> <b>ActualBars</b> is read-only and reports the number of bars selected by the built-in renderer for the current drawing width.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Builtin---Spectrum.js.html">Builtin - Spectrum.js</a>.</p>
 * <h3>Peak Meter</h3>
 * <p>A peak meter follows the strongest instantaneous amplitude of the selected audio channel. A filled bar indicates the current level, an optional held marker shows a recent maximum, and a separate indicator can report clipping. It is suited to checking transient levels and overloads.</p>
 * ```js
 * const peakMeter = vis.Create(
 *     VisSourceType.PeakMeter,
 *     { channel: "left", minDb: -60, maxDb: 0, releaseMs: 150 },
 *     {
 *         colorMode: "gradient",
 *         ranges: [
 *             { to: -18, color: 0xff63d471 },
 *             { to: -6,  color: 0xffffd166 },
 *             { to: 0,   color: 0xffff5d73 }
 *         ]
 *     }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/peak-meter.png" alt="Peak Meter: instantaneous level and held peak." loading="lazy"><figcaption>Peak Meter: instantaneous level and held peak.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.PeakMeter}</h4>
 * <p>The Peak Meter source applies attack/release behavior, retains the recent maximum, and tracks clipping. The renderer only decides which of these values to show.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>channel</b></td>
 * <td><b>Channel</b></td>
 * <td>"mix"</td>
 * <td><b>"mix"</b>, channel name, or non-negative PCM index</td>
 * <td>Select the audio input using the channel selector described above. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>minDb</b></td>
 * <td><b>MinDb</b></td>
 * <td>-60</td>
 * <td>Finite dB: −160 ≤ value &lt; maxDb</td>
 * <td>Lower end of the peak meter scale, in dBFS.</td>
 * </tr>
 * <tr>
 * <td><b>maxDb</b></td>
 * <td><b>MaxDb</b></td>
 * <td>0</td>
 * <td>Finite dB: minDb &lt; value ≤ +24</td>
 * <td>Upper end of the peak meter scale, in dBFS.</td>
 * </tr>
 * <tr>
 * <td><b>attackMs</b></td>
 * <td><b>AttackMs</b></td>
 * <td>0</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level rises; smaller values react faster.</td>
 * </tr>
 * <tr>
 * <td><b>releaseMs</b></td>
 * <td><b>ReleaseMs</b></td>
 * <td>150</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level falls; larger values decay more slowly.</td>
 * </tr>
 * <tr>
 * <td><b>peakHoldMs</b></td>
 * <td><b>PeakHoldMs</b></td>
 * <td>500</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Time for which a detected peak remains held before descending.</td>
 * </tr>
 * <tr>
 * <td><b>peakGravity</b></td>
 * <td><b>PeakGravity</b></td>
 * <td>3</td>
 * <td>Finite number ≥ 0</td>
 * <td>Acceleration applied to a held peak as it falls after the hold period.</td>
 * </tr>
 * <tr>
 * <td><b>clipHoldMs</b></td>
 * <td><b>ClipHoldMs</b></td>
 * <td>1000</td>
 * <td>Integer 0–60000 ms</td>
 * <td>How long the clipping flag stays active after detection; it is a source property even if the renderer hides the indicator.</td>
 * </tr>
 * </tbody>
 * </table>
 * <h3>VU Meter</h3>
 * <p>A VU meter provides a slower indication of program level rather than following the signal's instantaneous highest sample. Its detector and response resemble a traditional VU instrument, so it moves more steadily than a peak meter. The reading is shown relative to a configurable 0 VU reference.</p>
 * ```js
 * const vuMeter = vis.Create(
 *     VisSourceType.VUMeter,
 *     { channel: "left", referenceDbfs: -18, minVu: -20, maxVu: 3 },
 *     {
 *         colorMode: "gradient",
 *         ranges: [
 *             { to: -10, color: 0xff63d471 },
 *             { to: 0,   color: 0xffffd166 },
 *             { to: 3,   color: 0xffff5d73 }
 *         ]
 *     }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/vu-meter.png" alt="VU Meter: a slower response to program level." loading="lazy"><figcaption>VU Meter: a slower response to program level.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.VUMeter}</h4>
 * <p>The VU Meter source applies a VU detector and configurable response behavior. At the default calibration, a sine whose peak is −18 dBFS reads 0 VU; this is not an instantaneous sample-peak reading.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>channel</b></td>
 * <td><b>Channel</b></td>
 * <td>"mix"</td>
 * <td><b>"mix"</b>, channel name, or non-negative PCM index</td>
 * <td>Select the audio input using the channel selector described above. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>referenceDbfs</b></td>
 * <td><b>ReferenceDbfs</b></td>
 * <td>-18</td>
 * <td>Finite number −96…0 dBFS</td>
 * <td>Peak dBFS level of a reference sine wave giving 0 VU; −18 dBFS by default.</td>
 * </tr>
 * <tr>
 * <td><b>minVu</b></td>
 * <td><b>MinVu</b></td>
 * <td>-20</td>
 * <td>Finite VU: −160 ≤ value &lt; maxVu</td>
 * <td>Lower end of the displayed VU scale, where normalized level 0 occurs.</td>
 * </tr>
 * <tr>
 * <td><b>maxVu</b></td>
 * <td><b>MaxVu</b></td>
 * <td>3</td>
 * <td>Finite VU: minVu &lt; value ≤ +24</td>
 * <td>Upper end of the displayed VU scale, where normalized level 1 occurs.</td>
 * </tr>
 * <tr>
 * <td><b>attackMs</b></td>
 * <td><b>AttackMs</b></td>
 * <td>300</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level rises; smaller values react faster.</td>
 * </tr>
 * <tr>
 * <td><b>releaseMs</b></td>
 * <td><b>ReleaseMs</b></td>
 * <td>300</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Response time when the measured level falls; larger values decay more slowly.</td>
 * </tr>
 * <tr>
 * <td><b>peakHoldMs</b></td>
 * <td><b>PeakHoldMs</b></td>
 * <td>500</td>
 * <td>Finite number ≥ 0 ms</td>
 * <td>Time for which a detected peak remains held before descending.</td>
 * </tr>
 * <tr>
 * <td><b>peakGravity</b></td>
 * <td><b>PeakGravity</b></td>
 * <td>3</td>
 * <td>Finite number ≥ 0</td>
 * <td>Acceleration applied to a held peak as it falls after the hold period.</td>
 * </tr>
 * </tbody>
 * </table>
 * <h4>Built-in renderer — Peak Meter and VU Meter</h4>
 * <p>Peak Meter and VU Meter share the same horizontal bar renderer. It maps the source reading to a bar, optionally draws a held marker, and interprets color thresholds in the source's own scale. Peak Meter additionally supports a clipping indicator.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>ranges</b></td>
 * <td><b>Ranges</b></td>
 * <td>UI text color to the source maximum</td>
 * <td>1–256 {to, color} entries; increasing to in −160…+24; 32-bit ARGB colors</td>
 * <td>Color zones specified by ordered <b>to</b> thresholds in the source scale: dBFS for Peak Meter and VU for VU Meter.</td>
 * </tr>
 * <tr>
 * <td><b>colorMode</b></td>
 * <td><b>ColorMode</b></td>
 * <td>"gradient"</td>
 * <td>"gradient" or "discrete"</td>
 * <td>Controls smooth color blending versus separate, LED-like color zones; independent of segment spacing.</td>
 * </tr>
 * <tr>
 * <td><b>segmentSize</b></td>
 * <td><b>SegmentSize</b></td>
 * <td>6</td>
 * <td>Integer 0–1024 px (0 = automatic)</td>
 * <td>Width of a segment along the horizontal level axis, in pixels. Zero requests automatic sizing for segmented geometry.</td>
 * </tr>
 * <tr>
 * <td><b>segmentGap</b></td>
 * <td><b>SegmentGap</b></td>
 * <td>0</td>
 * <td>Integer 0–64 px</td>
 * <td>Horizontal spacing between segments, in pixels. Zero produces a continuous bar.</td>
 * </tr>
 * <tr>
 * <td><b>peakColor</b></td>
 * <td><b>PeakColor</b></td>
 * <td>UI text color</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>ARGB color of the held peak marker; default follows the UI text color.</td>
 * </tr>
 * <tr>
 * <td><b>peakSize</b></td>
 * <td><b>PeakSize</b></td>
 * <td>1</td>
 * <td>Finite number: 0 &lt; value ≤ 64 px</td>
 * <td>Thickness of the held peak marker in gradient mode. In discrete mode, the peak aligns to a full segment.</td>
 * </tr>
 * <tr>
 * <td><b>showPeak</b></td>
 * <td><b>ShowPeak</b></td>
 * <td>Peak Meter: true<br>VU Meter: false</td>
 * <td>true or false</td>
 * <td>Choose whether the built-in renderer draws the held peak marker.</td>
 * </tr>
 * <tr>
 * <td><b>showClip</b></td>
 * <td><b>ShowClip</b></td>
 * <td>false</td>
 * <td>Peak Meter only; true or false</td>
 * <td>Enables a separate visual clipping indicator; the clipping state itself comes from the Peak Meter source.</td>
 * </tr>
 * <tr>
 * <td><b>clipWidth</b></td>
 * <td><b>ClipWidth</b></td>
 * <td>4</td>
 * <td>Peak Meter only; finite number: 0 &lt; value ≤ 64 px</td>
 * <td>Width of the clipping indicator, in pixels.</td>
 * </tr>
 * <tr>
 * <td><b>clipColor</b></td>
 * <td><b>ClipColor</b></td>
 * <td>0xffff3030</td>
 * <td>Peak Meter only; 32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>ARGB color of the clipping indicator.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p>The same <b>ranges</b> syntax used by Spectrum applies here, but the thresholds use the selected meter's units. For example, create a VU meter with green through its 0 VU reference and red above it:</p>
 * ```js
 * const meter = vis.Create(VisSourceType.VUMeter, null, {
 *     colorMode: "discrete",
 *     ranges: [
 *         { to: 0, color: 0xff66cc88 },
 *         { to: 3, color: 0xffff6655 }
 *     ]
 * });
 * ```
 * <p><b>Samples:</b> <a href="source-samples-vis-Builtin---Peak-Meter.js.html">Builtin - Peak Meter.js</a>; <a href="source-samples-vis-Builtin---VU-Meter.js.html">Builtin - VU Meter.js</a>.</p>
 * <h3>Spectrogram</h3>
 * <p>A spectrogram shows how audio frequency content changes over time. Frequency is one axis, time is the other, and brightness or color encodes spectral intensity. Harmonics appear as repeated bands and short events as localized patterns, making it useful for examining evolving sound.</p>
 * ```js
 * const spectrogram = vis.Create(
 *     VisSourceType.Spectrogram,
 *     {
 *         fftSize: 4096, columnIntervalMs: 16,
 *         minFrequency: 40, maxFrequency: 20000, minDb: -84, scale: "log"
 *     },
 *     { style: "scrolling", palette: "inferno" }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/spectrogram.png" alt="Spectrogram: frequency content over time." loading="lazy"><figcaption>Spectrogram: frequency content over time.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.Spectrogram}</h4>
 * <p>The Spectrogram source accumulates FFT magnitudes as a time history. Frequency range, scale, gain, and dB limits determine how that history is interpreted for display.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>channel</b></td>
 * <td><b>Channel</b></td>
 * <td>"mix"</td>
 * <td><b>"mix"</b>, channel name, or non-negative PCM index</td>
 * <td>Select the audio input using the channel selector described above. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>fftSize</b></td>
 * <td><b>FftSize</b></td>
 * <td>4096</td>
 * <td>Power of two: 256–16384</td>
 * <td>Number of samples used in each frequency transform. Higher values improve frequency resolution but spread short events over a longer window.</td>
 * </tr>
 * <tr>
 * <td><b>columnIntervalMs</b></td>
 * <td><b>ColumnIntervalMs</b></td>
 * <td>16</td>
 * <td>Integer 8–250 ms</td>
 * <td>How frequently the source obtains a new spectral-history column. Smaller intervals describe changing sound with finer temporal detail.</td>
 * </tr>
 * <tr>
 * <td><b>minFrequency</b></td>
 * <td><b>MinFrequency</b></td>
 * <td>50</td>
 * <td>Finite Hz: 0 &lt; value &lt; maxFrequency</td>
 * <td>Lower boundary of the requested frequency range, in hertz.</td>
 * </tr>
 * <tr>
 * <td><b>maxFrequency</b></td>
 * <td><b>MaxFrequency</b></td>
 * <td>20000</td>
 * <td>Finite Hz: value &gt; minFrequency</td>
 * <td>Upper boundary of the requested frequency range, in hertz. The effective range is clamped to frequencies representable by the current sample rate and FFT configuration.</td>
 * </tr>
 * <tr>
 * <td><b>scale</b></td>
 * <td><b>Scale</b></td>
 * <td>"log"</td>
 * <td>"log" or "linear"</td>
 * <td>Maps the frequency axis. Logarithmic allocates more space to low frequencies; linear uses equal spacing per hertz.</td>
 * </tr>
 * <tr>
 * <td><b>minDb</b></td>
 * <td><b>MinDb</b></td>
 * <td>-78</td>
 * <td>Finite dB: −160 ≤ value &lt; maxDb</td>
 * <td>Low end of the spectrogram intensity scale; lower magnitudes are suppressed.</td>
 * </tr>
 * <tr>
 * <td><b>maxDb</b></td>
 * <td><b>MaxDb</b></td>
 * <td>0</td>
 * <td>Finite dB: minDb &lt; value ≤ +24</td>
 * <td>High end of the spectrogram intensity scale; larger magnitudes become fully saturated.</td>
 * </tr>
 * <tr>
 * <td><b>gain</b></td>
 * <td><b>Gain</b></td>
 * <td>1</td>
 * <td>Finite number &gt; 0</td>
 * <td>Multiplier applied to FFT magnitudes before converting them to decibels and display intensity.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p><b>Runtime-only:</b> <b>Columns</b> is read-only and reports the current retained spectrogram-history capacity in columns.</p>
 * <h4>Built-in renderer</h4>
 * <p>The built-in renderer maps the prepared history to a scrolling or stationary display and chooses its palette. Brightness is already determined by the source's frequency and dB configuration.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>style</b></td>
 * <td><b>Style</b></td>
 * <td>"scrolling"</td>
 * <td>"scrolling" or "stationary"</td>
 * <td>Controls whether history scrolls continuously or is written from left to right in repeating stationary sweeps. A new stationary sweep overwrites the current image from the left while retaining only the untouched part of the immediately previous sweep.</td>
 * </tr>
 * <tr>
 * <td><b>palette</b></td>
 * <td><b>Palette</b></td>
 * <td>"grayscale"</td>
 * <td>"grayscale" or "inferno"</td>
 * <td>Selects a theme-independent grayscale palette or a multicolor intensity palette.</td>
 * </tr>
 * <tr>
 * <td><b>color</b></td>
 * <td><b>Color</b></td>
 * <td>0xffc2c2c2</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>Foreground color used by the grayscale palette, in ARGB format; ignored by the inferno palette.</td>
 * </tr>
 * <tr>
 * <td><b>backgroundColor</b></td>
 * <td><b>BackgroundColor</b></td>
 * <td>0xff202020</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>Background color used by the grayscale palette, in ARGB format; ignored by the inferno palette.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p>In stationary mode, each wrap retains only the current and immediately previous sweep; older data is discarded. Resizing preserves retained history, so narrowing can hide columns that reappear when widened, but discarded sweeps cannot be restored. Scrolling mode likewise keeps its retained columns across viewport size changes.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Builtin---Spectrogram.js.html">Builtin - Spectrogram.js</a>.</p>
 * <h3>Vectorscope</h3>
 * <p>A vectorscope displays the relationship between the left and right channels of a stereo signal. Paired PCM samples form points or a connected trace in a two-dimensional field. The resulting shape helps illustrate channel similarity, stereo width and phase relationship.</p>
 * ```js
 * const vectorscope = vis.Create(
 *     VisSourceType.Vectorscope,
 *     { leftChannel: "left", rightChannel: "right", points: 1024, durationMs: 40 },
 *     {
 *         mode: "points", color: 0xff55d6d9, pointSize: 1.5,
 *         glowStrength: 0.25, glowRadius: 3, persistenceMs: 300
 *     }
 * );
 * ```
 * <figure class="vis-figure"><img src="assets/vis/vectorscope.png" alt="Vectorscope: the relationship between stereo channels." loading="lazy"><figcaption>Vectorscope: the relationship between stereo channels.</figcaption></figure>
 * <h4>Source — {@link module:Flags.VisSourceType VisSourceType.Vectorscope}</h4>
 * <p>The Vectorscope source extracts synchronized samples from two channels. For a pair (L, R), the conventional plot uses x = (L − R) / 2 and y = (L + R) / 2: equal-channel samples lie on the vertical axis, while opposite-polarity samples extend horizontally.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>leftChannel</b></td>
 * <td><b>LeftChannel</b></td>
 * <td>0</td>
 * <td>Channel name or PCM index 0–31; <b>"mix"</b> is not accepted</td>
 * <td>Select the left input. An unavailable channel produces silence.</td>
 * </tr>
 * <tr>
 * <td><b>rightChannel</b></td>
 * <td><b>RightChannel</b></td>
 * <td>1</td>
 * <td>Channel name or PCM index 0–31; <b>"mix"</b> is not accepted</td>
 * <td>Select the right input. If it is unavailable, the source reuses the selected left value; with the default 0/1 selection, mono input becomes L = R.</td>
 * </tr>
 * <tr>
 * <td><b>durationMs</b></td>
 * <td><b>DurationMs</b></td>
 * <td>40</td>
 * <td>Integer 10–500 ms</td>
 * <td>Duration of the recent stereo PCM window in milliseconds. A longer window retains more successive sample pairs.</td>
 * </tr>
 * <tr>
 * <td><b>points</b></td>
 * <td><b>Points</b></td>
 * <td>1024</td>
 * <td>Integer 32–8192</td>
 * <td>Maximum count of synchronized stereo sample pairs made available for drawing.</td>
 * </tr>
 * <tr>
 * <td><b>relativeBandAnalysis</b></td>
 * <td><b>RelativeBandAnalysis</b> (read-only)</td>
 * <td>false</td>
 * <td>true or false</td>
 * <td>Enable relative bass, mid, and treble controls for custom JavaScript or shader renderers. The built-in Vectorscope renderer ignores them. This option is chosen at creation time; <b>RelativeBandAnalysis</b> reports the choice.</td>
 * </tr>
 * </tbody>
 * </table>
 * <h4>Built-in renderer</h4>
 * <p>The built-in renderer converts stereo sample pairs into points or connected lines, with optional glow and persistence. It controls the drawing geometry rather than altering the selected PCM channels.</p>
 * <table class="vis-settings vis-settings-four" style="table-layout:fixed;width:100%"><colgroup><col style="width:22%"><col style="width:22%"><col style="width:12%"><col style="width:20%"><col style="width:24%"></colgroup>
 * <thead>
 * <tr>
 * <th>Setting</th>
 * <th>Runtime property</th>
 * <th>Default</th>
 * <th>Allowed values</th>
 * <th>Description</th>
 * </tr>
 * </thead>
 * <tbody>
 * <tr>
 * <td><b>color</b></td>
 * <td><b>Color</b></td>
 * <td>UI text color</td>
 * <td>32-bit ARGB integer (0x00000000–0xFFFFFFFF)</td>
 * <td>Color used for drawing, in ARGB format; does not change native audio analysis.</td>
 * </tr>
 * <tr>
 * <td><b>mode</b></td>
 * <td><b>Mode</b></td>
 * <td>"points"</td>
 * <td>"points" or "lines"</td>
 * <td>"points" draws fading PCM points; "lines" connects successive pairs into a trace.</td>
 * </tr>
 * <tr>
 * <td><b>scale</b></td>
 * <td><b>Scale</b></td>
 * <td>1</td>
 * <td>Finite number: 0 &lt; value ≤ 16</td>
 * <td>Changes only the displayed amplitude; the PCM source is unchanged.</td>
 * </tr>
 * <tr>
 * <td><b>aspectScale</b></td>
 * <td><b>AspectScale</b></td>
 * <td>true</td>
 * <td>true or false</td>
 * <td>When true, use the entire rectangle in each direction. When false, use the shorter dimension to preserve the aspect of the stereo figure.</td>
 * </tr>
 * <tr>
 * <td><b>pointSize</b></td>
 * <td><b>PointSize</b></td>
 * <td>1</td>
 * <td>Finite number 1–16 px</td>
 * <td>Diameter of plotted points, in pixels.</td>
 * </tr>
 * <tr>
 * <td><b>lineWidth</b></td>
 * <td><b>LineWidth</b></td>
 * <td>1</td>
 * <td>Finite number: 0 &lt; value ≤ 16 px</td>
 * <td>Thickness of the trace, in pixels.</td>
 * </tr>
 * <tr>
 * <td><b>glowStrength</b></td>
 * <td><b>GlowStrength</b></td>
 * <td>0.4</td>
 * <td>Finite number: 0–1</td>
 * <td>Controls the intensity of the soft glow; zero disables it.</td>
 * </tr>
 * <tr>
 * <td><b>glowRadius</b></td>
 * <td><b>GlowRadius</b></td>
 * <td>4</td>
 * <td>Finite number: 0–32 px</td>
 * <td>Radius of the optional glow, in pixels.</td>
 * </tr>
 * <tr>
 * <td><b>persistenceMs</b></td>
 * <td><b>PersistenceMs</b></td>
 * <td>300</td>
 * <td>Integer 1–2000 ms</td>
 * <td>Approximate time in milliseconds over which older strokes fade.</td>
 * </tr>
 * </tbody>
 * </table>
 * <p><b>Sample:</b> <a href="source-samples-vis-Builtin---Vectorscope.js.html">Builtin - Vectorscope.js</a>.</p>
 * <h2>Custom JavaScript renderers</h2>
 * <p>To use a custom JavaScript renderer, pass the renderer callback as the third argument to {@link vis.Create Create}, instead of a built-in renderer settings object. When a source snapshot is available, the callback runs when your script calls {@link Visualization#Draw Draw}. It receives the drawing context <b>gr</b>, the drawing rectangle <b>x, y, w, h</b>, and a <b>data</b> object containing the source's current measurements.</p>
 * <p>Numeric source data is passed to JavaScript renderer callbacks through reusable typed arrays such as <b>Float32Array</b>. Source-specific scalar metadata may also be present.</p>
 * ```js
 * include('docs/Flags.js');
 * const visual = vis.Create(VisSourceType.PeakMeter, null, (gr, x, y, w, h, data) => {
 *     const level = data.levels[0];
 *     gr.FillSolidRect(x, y, level * w, h, 0xff66ccaa);
 * });
 *
 * function on_paint(gr) {
 *     const w = window.Width, h = window.Height;
 *     gr.FillSolidRect(0, 0, w, h, 0xff101010);
 *     if (w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
 * }
 * setInterval(() => window.Repaint(), 33);
 * ```
 * <p>Peak Meter provides one normalized level in <b>data.levels</b>; read it as <b>data.levels[0]</b> and multiply it by the rectangle width to obtain the bar width. The source already handles measurement and smoothing.</p>
 * <p>This is a complete script. JavaScript callback renderers can use both {@link GdiGraphics GDI} and {@link D2DGraphics Direct2D} drawing methods appropriate to the current graphics context. The callback runs on the drawing thread, not on the audio-analysis thread.</p>
 * <p>Passing a callback replaces only the renderer. The selected native source is still the same source described above, so its <b>source runtime properties</b> remain available on the returned object. For example, a custom Spectrum callback can still read or change <b>Bands</b>, <b>FftSize</b>, and the other Spectrum source properties. Built-in renderer properties such as <b>ColorMode</b> or <b>Gap</b> do not apply because the callback performs the drawing itself.</p>
 * <p>Values that conceptually represent a single number or boolean state still use one-element typed arrays—for example, the Peak Meter clipping flag is read as <b>data.clipped[0]</b>. Spectrogram also exposes scalar metadata describing its history ring.</p>
 * <p><b>Data lifetime:</b> the visualization owns and reuses these buffers. Their contents are refreshed before a drawing callback when new analysis data is available; a source-size change can replace a buffer. Treat them as the current source state rather than permanent snapshots. Read the values you need during the callback; if you need to preserve a particular frame for later use, copy the relevant data into your own storage.</p>
 * <p>The sections below describe the callback data for each source. Unless marked as a complete script, each snippet replaces only the renderer callback body shown above. Source settings remain in the second argument; analyzed data is provided through <b>data</b>.</p>
 * <h3>Waveform data</h3>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>line</b></td><td>Float32Array</td><td>Resampled center trace, with signed amplitudes approximately from −1 to 1.</td></tr>
 * <tr><td><b>min</b></td><td>Float32Array</td><td>Minimum PCM amplitude observed in each corresponding interval.</td></tr>
 * <tr><td><b>max</b></td><td>Float32Array</td><td>Maximum PCM amplitude observed in each corresponding interval.</td></tr>
 * </tbody></table>
 * <p>The three arrays have the same length. The min/max envelope retains excursions that a single resampled point might miss, especially at narrow display widths. The following callback draws the center trace: sample index selects X; amplitude +1 maps to the top, 0 to the center and −1 to the bottom.</p>
 * ```js
 * const { line } = data;
 * if (line.length < 2) return;
 * const amplitudeY = value => y + (1 - value) * h / 2;
 * for (let i = 1; i < line.length; ++i) {
 *     const x0 = x + (i - 1) * w / (line.length - 1);
 *     const x1 = x + i * w / (line.length - 1);
 *     gr.DrawLine(x0, amplitudeY(line[i - 1]),
 *                 x1, amplitudeY(line[i]), 1, 0xff66ccaa);
 * }
 * ```
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---Waveform.js.html">JS - Waveform.js</a> — draws both the resampled line and its min/max envelope.</p>
 * <h3>Spectrum data</h3>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>levels</b></td><td>Float32Array</td><td>Current normalized magnitude for each frequency band. The array length is <b>bands</b>.</td></tr>
 * <tr><td><b>peaks</b></td><td>Float32Array</td><td>Held peak for each corresponding frequency band. The array length is <b>bands</b>.</td></tr>
 * </tbody></table>
 * <p>Both arrays use the source's <b>minDb</b>/<b>maxDb</b> range on a normalized 0–1 scale; levels and peaks are capped at 0.98. The same index refers to the same frequency band in both arrays.</p>
 * ```js
 * const { levels, peaks } = data;
 * if (!levels.length) return;
 * const bandWidth = w / levels.length;
 * for (let i = 0; i < levels.length; ++i) {
 *     const left = x + i * bandWidth;
 *     const height = levels[i] * h;
 *     const peakY = y + (1 - peaks[i]) * h;
 *     gr.FillSolidRect(left, y + h - height, bandWidth, height, 0xff66ccaa);
 *     gr.DrawLine(left, peakY, left + bandWidth, peakY, 1, 0xffffffff);
 * }
 * ```
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---Spectrum.js.html">JS - Spectrum.js</a> — draws both levels and held peaks.</p>
 * <h3>Peak Meter data</h3>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>levels</b></td><td>Float32Array(1)</td><td>Current level, normalized to 0–1 over the configured <b>minDb</b>/<b>maxDb</b> range.</td></tr>
 * <tr><td><b>peaks</b></td><td>Float32Array(1)</td><td>Held maximum on the same normalized meter scale.</td></tr>
 * <tr><td><b>clipped</b></td><td>Float32Array(1)</td><td>Numeric clipping flag: element 0 is 1 while clipping is detected or retained by <b>clipHoldMs</b>, otherwise 0.</td></tr>
 * </tbody></table>
 * <p>Read element 0 from each array. The clipping flag is separate from the meter scale and should be treated as an on/off state.</p>
 * ```js
 * const level = data.levels[0];    // 0..1, current bar position.
 * const peak = data.peaks[0];      // 0..1, held marker.
 * const clipping = data.clipped[0] !== 0;
 * gr.FillSolidRect(x, y, level * w, h, clipping ? 0xffff6655 : 0xff66ccaa);
 * const peakX = x + peak * (w - 1);
 * gr.DrawLine(peakX, y, peakX, y + h, 1, 0xffffffff);
 * ```
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---Peak-Meter.js.html">JS - Peak Meter.js</a> — shows the level, held peak and clipping lamp.</p>
 * <h3>VU Meter data</h3>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>levels</b></td><td>Float32Array(1)</td><td>Current VU position, normalized to 0–1 over the source's <b>minVu</b>/<b>maxVu</b> scale.</td></tr>
 * <tr><td><b>peaks</b></td><td>Float32Array(1)</td><td>Held VU marker on the same normalized scale.</td></tr>
 * </tbody></table>
 * <p>Unlike the Peak Meter, these values describe the slower VU measurement rather than a peak-based dBFS level, and there is no clipping field. To draw a 0 VU reference mark, map zero with (0 - minVu) / (maxVu - minVu); the current reading is already normalized.</p>
 * ```js
 * const vu = data.levels[0];
 * const held = data.peaks[0];
 * const minVu = -20, maxVu = 3; // Source defaults; use your configured range.
 * const zeroVu = (0 - minVu) / (maxVu - minVu);
 * gr.FillSolidRect(x, y, vu * w, h, 0xff66ccaa);
 * const zeroX = x + zeroVu * (w - 1);
 * const heldX = x + held * (w - 1);
 * gr.DrawLine(zeroX, y, zeroX, y + h, 1, 0xff888888);
 * gr.DrawLine(heldX, y, heldX, y + h, 1, 0xffffffff);
 * ```
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---VU-Meter.js.html">JS - VU Meter.js</a> — uses both VU values.</p>
 * <h3>Spectrogram data</h3>
 * <p>Unlike the other sources, the spectrogram supplies a <b>history of FFT columns</b>, not merely one recent set of values. That history is kept in a circular buffer: older physical slots are reused as new audio arrives. The callback reports the data plus the information needed to reconstruct its chronological order.</p>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>columns</b></td><td>Float32Array</td><td>Linear FFT magnitudes, stored column-major: one entire spectrum per physical history slot.</td></tr>
 * <tr><td><b>fftBins</b></td><td>number</td><td>Number of FFT magnitude values in each column.</td></tr>
 * <tr><td><b>sampleRate</b></td><td>number</td><td>Current audio sample rate in Hz, needed to turn bin positions into frequencies.</td></tr>
 * <tr><td><b>capacityColumns</b></td><td>number</td><td>Total number of physical column slots allocated in the history ring.</td></tr>
 * <tr><td><b>validColumns</b></td><td>number</td><td>Number of populated slots, from zero up to <b>capacityColumns</b>.</td></tr>
 * <tr><td><b>nextColumn</b></td><td>number</td><td>Physical slot where the next FFT column will be written; <b>not</b> the newest column.</td></tr>
 * <tr><td><b>full</b></td><td>boolean</td><td>Signals that the retained history has been rebuilt and a cached display may need a complete redraw.</td></tr>
 * </tbody></table>
 * <p>An FFT <b>bin</b> is one frequency measurement. The bins run from zero frequency to half the sample rate (the <b>Nyquist frequency</b>); adjacent bins are separated by <b>sampleRate / (2 × (fftBins − 1))</b> hertz.</p>
 * <p>Read a magnitude using <b>columns[column * fftBins + bin]</b>. While the ring is not full, populated columns begin at physical slot 0. Once full, the oldest physical column is at <b>nextColumn</b> and the newest is <b>(nextColumn - 1 + capacityColumns) % capacityColumns</b>. Use <b>validColumns</b> when deciding how much history to show; do not assume unpopulated slots contain valid audio.</p>
 * <p>Start with a history of one frequency: this callback plots the FFT bin nearest 1000 Hz from oldest to newest. Convert its linear magnitude to decibels with <b>20 × log10(magnitude)</b>, then map the configured dB range to 0–1. The small positive floor avoids taking the logarithm of zero. Use your source settings if they differ from the defaults shown.</p>
 * ```js
 * const { columns, fftBins, sampleRate, capacityColumns, validColumns, nextColumn } = data;
 * if (!validColumns || fftBins < 2 || sampleRate <= 0) return;
 * // One FFT bin near 1000 Hz; fftBins includes zero and the Nyquist bin.
 * const bin = Math.min(fftBins - 1, Math.round(1000 * 2 * (fftBins - 1) / sampleRate));
 * const minDb = -78, maxDb = 0, gain = 1; // Source defaults.
 * const oldest = validColumns < capacityColumns ? 0 : nextColumn;
 * const columnWidth = w / validColumns;
 * for (let n = 0; n < validColumns; ++n) {
 *     const slot = (oldest + n) % capacityColumns;
 *     const magnitude = columns[slot * fftBins + bin] * gain;
 *     const db = 20 * Math.log10(Math.max(magnitude, 1e-12));
 *     const level = Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
 *     const height = level * h;
 *     gr.FillSolidRect(x + n * columnWidth, y + h - height,
 *                      columnWidth, height, 0xff66ccaa);
 * }
 * ```
 * <p>This example redraws the available history and stretches it across the rectangle. A full spectrogram repeats the magnitude-to-intensity conversion for multiple frequencies and maps intensity to color. The linked sample adds a frequency scale, a fixed scrolling speed, and a cached bitmap updated only for new columns.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---Spectrogram.js.html">JS - Spectrogram.js</a> — implements the ring mapping, palette, offscreen image and incremental updates.</p>
 * <h3>Vectorscope data</h3>
 * <p><b>left</b> and <b>right</b> describe the stereo waveform used to draw the vectorscope trace. Optional <b>relativeBands</b> serves a different purpose: it gives a custom renderer simple signals with which to animate color, size, glow, zoom, or other effect parameters in response to the music. It follows changes within three broad frequency regions relative to their usual levels, rather than reporting absolute volume.</p>
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:24%"><col style="width:23%"><col style="width:53%"></colgroup><thead><tr><th>Field</th><th>Type</th><th>Meaning</th></tr></thead><tbody>
 * <tr><td><b>left</b></td><td>Float32Array</td><td>Signed PCM samples from the selected left channel, approximately −1 to 1.</td></tr>
 * <tr><td><b>right</b></td><td>Float32Array</td><td>Signed PCM samples from the selected right channel, approximately −1 to 1.</td></tr>
 * <tr><td><b>relativeBands</b></td><td>Float32Array(6), when enabled</td><td>Music-reactive controls in the order <b>bass</b>, <b>mid</b>, <b>treb</b>, <b>bass_att</b>, <b>mid_att</b>, <b>treb_att</b>. Values are non-negative ratios relative to each band's long-term level; 1 represents its usual activity. See <b>Optional relative band controls</b> below.</td></tr>
 * </tbody></table>
 * <p>The <b>left</b> and <b>right</b> arrays have equal length, and their entries at index <b>i</b> belong to the same stereo audio frame. The example draws one point per pair around the rectangle center. Positive vertical amplitude moves upward, so subtract it from the center Y coordinate. Connect adjacent pairs only if you intend to show a continuous trace.</p>
 * ```js
 * const { left, right } = data;
 * const radius = Math.max(0, Math.min(w, h) / 2 - 1);
 * for (let i = 0; i < left.length; ++i) {
 *     const sx = (left[i] - right[i]) / 2;
 *     const sy = (left[i] + right[i]) / 2;
 *     const px = x + w / 2 + sx * radius;
 *     const py = y + h / 2 - sy * radius;
 *     gr.FillSolidRect(px, py, 1, 1, 0xff66ccaa);
 * }
 * ```
 * <p><b>Sample:</b> <a href="source-samples-vis-JS---Vectorscope.js.html">JS - Vectorscope.js</a> — visualizes the paired channels and their stereo axes.</p>
 * <h4>Optional relative band controls</h4>
 * <p>Set <b>relativeBandAnalysis: true</b> in the Vectorscope source settings to obtain <b>relativeBands</b>. The engine analyzes the two selected channels separately and combines their frequency magnitudes, so opposite-polarity stereo signals do not cancel out as they could in a mono mix. It also maintains the reference levels and attack/release smoothing; your renderer can use the resulting controls directly.</p>
 * <table class="vis-settings"><thead><tr><th>Control</th><th>Approximate frequency range</th><th>Smoothed control</th></tr></thead><tbody>
 * <tr><td><b>bass</b></td><td>0–200 Hz</td><td><b>bass_att</b></td></tr>
 * <tr><td><b>mid</b></td><td>200–4000 Hz</td><td><b>mid_att</b></td></tr>
 * <tr><td><b>treb</b></td><td>4000–20000 Hz</td><td><b>treb_att</b></td></tr>
 * </tbody></table>
 * <p>A value of 1 is the band's usual level; values above 1 indicate stronger activity. Sustained activity gradually becomes part of that reference, so a band held at a consistently high absolute level tends back toward 1 instead of remaining permanently above it. These are relative controls, not dBFS readings or beat-detection events. The reference adapts quickly for about 1.67 seconds after a reset, then more slowly. Very quiet input uses the neutral value 1, so it should not be interpreted as an absolute silence detector.</p>
 * <p>Keep <b>durationMs</b> separate from {@link vis.UpdateIntervalMs}: the former selects the PCM window, while the latter requests how often analysis runs. Changing the window can change the timing of the band response. Sources with the same selected channel pair and duration share the reference history. Stopped playback resets it; on pause, the retained PCM is still analyzed and the relative values can continue to change.</p>
 * <p>This complete JavaScript example draws three horizontal bars: bass, mid and treble from top to bottom. Each colored bar follows the immediate value; a white marker follows its smoothed counterpart, and a short gray tick marks the reference level 1. The callback uses only <b>relativeBands</b>, so it does not need to draw the stereo PCM trace.</p>
 * ```js
 * include('docs/Flags.js');
 *
 * const colors = [0xffff7766, 0xff77cc88, 0xff77aaff];
 * const bandsView = vis.Create(VisSourceType.Vectorscope, {
 *     relativeBandAnalysis: true
 * }, (gr, x, y, w, h, data) => {
 *     const bands = data.relativeBands;
 *     const rowHeight = h / 3;
 *     for (let i = 0; i < 3; ++i) {
 *         const top = y + (i + 0.15) * rowHeight;
 *         const height = rowHeight * 0.7;
 *         // Display 0..2: the usual level (1) is halfway across.
 *         const current = Math.min(bands[i], 2) / 2;
 *         const smoothed = Math.min(bands[i + 3], 2) / 2;
 *         gr.FillSolidRect(x, top, current * w, height, colors[i]);
 *         const referenceX = Math.round(x + w / 2);
 *         gr.DrawLine(referenceX, top + height - 5, referenceX, top + height,
 *                     1, 0xff888888); // Reference level: 1.
 *         const markerX = Math.round(x + smoothed * (w - 1));
 *         gr.DrawLine(markerX, top, markerX, top + height, 1, 0xffffffff);
 *     }
 * });
 *
 * function on_paint(gr) {
 *     const w = window.Width, h = window.Height;
 *     gr.FillSolidRect(0, 0, w, h, 0xff101010);
 *     if (w > 0 && h > 0) bandsView.Draw(gr, 0, 0, w, h);
 * }
 * setInterval(() => window.Repaint(), 33);
 * ```
 * <p>Indices 0–2 select <b>bass</b>, <b>mid</b> and <b>treb</b>; adding 3 selects the matching <b>_att</b> value. The display caps values at 2 only to keep the drawing inside the rectangle; the source data remains unchanged and may exceed 2. During playback, compare the colored bar with the white marker to see the smoothing. You can use the same values to control a shape's size or color instead of drawing bars.</p>
 * <p>JavaScript callbacks are useful for custom layouts, labels and geometry using familiar drawing operations. For effects that calculate a color for every pixel, a shader is another way to render the same native source.</p>
 * <h2>Custom HLSL renderers</h2>
 * <p>Use a custom HLSL renderer when you want to implement the visualization as a pixel shader. The native source still captures and analyzes the audio; your shader receives prepared source data and produces the pixels drawn by {@link Visualization#Draw Draw}.</p>
 * <p>Create it with {@link vis.CreateAsync vis.CreateAsync}. The third argument is a renderer object containing <b>shader</b>, in place of built-in renderer settings. Shader visualizations require {@link window.DrawMode} set to 1 (Direct2D). The returned object is a normal {@link Visualization}: source runtime properties remain available, while the shader defines the appearance.</p>
 * <p>The examples below build a Peak Meter shader from one analyzed audio value, then extend it with image passes.</p>
 * <h3>1. Create a visualization that fills its rectangle</h3>
 * <p>Start with a shader that ignores the audio and returns the same color for every pixel. The Peak Meter source is already selected here; its level will be used in step 3.</p>
 * ```js
 * include('docs/Flags.js');
 * window.DrawMode = 1; // Shader visualizations require Direct2D.
 *
 * const shader = `
 * float4 main() : SV_Target {
 *     return float4(0.4, 0.9, 0.6, 1.0);
 * }`;
 *
 * let visual = null;
 * vis.CreateAsync(VisSourceType.PeakMeter, null, { shader })
 *     .then(v => { visual = v; window.Repaint(); })
 *     .catch(e => console.log("Visualization creation failed: " + e));
 *
 * function on_paint(gr) {
 *     const w = window.Width, h = window.Height;
 *     gr.FillSolidRect(0, 0, w, h, 0xff101010);
 *     if (visual && w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
 * }
 * setInterval(() => window.Repaint(), 33); // Request roughly 30 FPS presentation.
 * ```
 * <p>The HLSL entry point is <b>main</b>. It returns a <b>float4</b> containing red, green, blue and alpha values; <b>SV_Target</b> marks that value as the output pixel color. Here every pixel receives the same opaque color.</p>
 * <p>The JavaScript string <b>shader</b> contains the GPU program, and <b>{ shader }</b> is shorthand for a renderer object whose <b>shader</b> property contains that string. {@link vis.CreateAsync CreateAsync} compiles the shader off the panel UI thread and resolves to the visualization when it is ready. The repaint timer and {@link Visualization#Draw Draw} work the same way as with other visualizations.</p>
 * <p>For the next two steps, keep this JavaScript setup and replace only the HLSL inside the <b>shader</b> string, then reload the script.</p>
 * <h3>2. Give each pixel a position</h3>
 * <p>Next, use the current pixel position and the drawing size to produce a horizontal gradient.</p>
 * ```hlsl
 * cbuffer Params : register(b0) {
 *     float2 viewportSize;
 * };
 * struct PS {
 *     float4 clipSpacePos : SV_POSITION;
 *     float4 sceneSpacePos : SCENE_POS;
 * };
 * float4 main(PS p) : SV_Target {
 *     float x = p.sceneSpacePos.x / max(viewportSize.x, 1.0);
 *     return float4(x, 0.4, 0.2, 1.0);
 * }
 * ```
 * <p>The red component now increases from left to right. <b>sceneSpacePos.xy</b> is the local pixel position supplied to <b>main</b>; X increases rightward and Y downward. <b>viewportSize</b> is the drawing width and height supplied through the constant buffer at <b>b0</b>. Dividing X by the width gives a relative position from about 0 to 1.</p>
 * <p>A <b>constant buffer</b> is a group of values supplied by the host. <b>register(b0)</b> selects its binding slot; nothing is passed explicitly from JavaScript. <b>SCENE_POS</b> identifies the local-position input. <b>SV_POSITION</b> is also part of the shader input layout but is not used here.</p>
 * <p>This example declares only the first two floats of <b>b0</b>. The complete layout is listed in <b>Source shader input reference</b>.</p>
 * <h3>3. Read one audio value</h3>
 * <p>Now use the Peak Meter source data to turn the rectangle into a level meter.</p>
 * ```hlsl
 * Texture2D<float> Level : register(t0);
 * cbuffer Params : register(b0) {
 *     float2 viewportSize;
 * };
 * struct PS {
 *     float4 clipSpacePos : SV_POSITION;
 *     float4 sceneSpacePos : SCENE_POS;
 * };
 * float4 main(PS p) : SV_Target {
 *     float level = Level.Load(int3(0, 0, 0));
 *     float alpha = p.sceneSpacePos.x < level * viewportSize.x ? 1.0 : 0.0;
 *     return float4(0.4 * alpha, 0.9 * alpha, 0.6 * alpha, alpha);
 * }
 * ```
 * <p>The Peak Meter source publishes its normalized level from 0 to 1 through a texture bound at <b>t0</b>. <b>Texture2D&lt;float&gt;</b> declares a texture containing floating-point values, and <b>Load(int3(0, 0, 0))</b> reads its first value. The source already performs level detection and smoothing; the shader only turns that value into a bar width.</p>
 * <p>During playback, the green bar follows the current level. Pixels outside it return transparent black, revealing the background drawn by {@link module:Callbacks.on_paint on_paint}. Shader output uses <b>premultiplied RGBA</b>: multiply RGB by alpha whenever the output is transparent or partially transparent.</p>
 * <p>The three input mechanisms now have distinct roles: <b>b0</b> provides values shared by the draw, <b>SCENE_POS</b> identifies the current pixel, and <b>t0</b> supplies analyzed audio. Their HLSL names can change, but their bindings and layouts must match the selected source.</p>
 * <p>Other sources use the same creation and drawing setup with different texture layouts; see <b>Source shader input reference</b>. The following sections add image passes to this Peak Meter.</p>
 * <h2>Shader pipeline</h2>
 * <p>A single source shader is enough for many effects. To process its finished image, add <b>post</b>; to carry part of an image into later frames, add <b>feedback</b>. Each additional shader execution is called a <b>pass</b>. Both options work with all six sources, and you can use either one or both.</p>
 * <p>JSplitter connects the passes, creates the intermediate images, composites the source and maintains feedback history. You supply the shaders and their configuration; there is no need to copy the screen into a bitmap on every paint or maintain a pair of history images in JavaScript.</p>
 * <figure class="vis-figure vis-diagram"><img src="assets/vis/pipeline.svg" alt="Rendering flow: audio source to main shader; previous saved history through feedback; compositing; history saved for the next frame; post passes to the screen"><figcaption>The saved history feeds the next feedback step. Post-processing changes only the displayed image.</figcaption></figure>
 * <h3>Adding a post pass</h3>
 * <p>A <b>post</b> shader reads the completed image at <b>t0</b>. Its input is RGBA pixels, rather than the audio values used by the main shader. Declare <b>Texture2D</b> for that image and a <b>SamplerState</b> at <b>s0</b> for filtered reads. The additional <b>TEXEL_POS</b> input provides coordinates for sampling the image. The following example swaps red and blue while keeping transparency unchanged.</p>
 * <p>Keep the Peak Meter <b>shader</b> from step 3 and replace its creation call with:</p>
 * ```js
 * const colorPost = `
 * Texture2D InputImage : register(t0);
 * SamplerState InputSampler : register(s0);
 * struct PSInput {
 *     float4 clipSpacePos : SV_POSITION;
 *     float4 sceneSpacePos : SCENE_POS;
 *     float4 texelSpacePos : TEXEL_POS;
 * };
 * float4 main(PSInput p) : SV_Target {
 *     float4 color = InputImage.SampleLevel(InputSampler, p.texelSpacePos.xy, 0);
 *     return float4(color.b, color.g, color.r, color.a);
 * }`;
 *
 * vis.CreateAsync(VisSourceType.PeakMeter, null, {
 *     shader,
 *     post: colorPost
 * })
 *     .then(v => { visual = v; window.Repaint(); })
 *     .catch(e => console.log("Visualization creation failed: " + e));
 * ```
 * <p><b>SampleLevel()</b> samples the image through <b>s0</b>; <b>texelSpacePos.xy</b> provides the corresponding input texture coordinates. Unlike an audio-texture <b>Load()</b>, this can interpolate between neighboring pixels. Returning the sampled color unchanged makes an image pass do nothing; here, only the output color channels change.</p>
 * <p><b>post</b> accepts one pass or an array of one to four passes. They run in array order, and each reads the preceding pass's output. A post pass cannot read the original source or an earlier pass separately unless that information is carried through its input image.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Image-Post.js.html">Shader - Image Post.js</a> demonstrates a complete visualization with an independent post effect.</p>
 * <h3>Adding feedback</h3>
 * <p><b>feedback</b> reads the previously saved history at <b>t0</b>. It can fade, move or distort that image. JSplitter then draws the current source image over the result and saves the combined image as the next history. Post-processing, if present, runs after that save and never returns to the loop.</p>
 * <p>For simple fading trails, sample history and reduce its brightness. This pass also reads <b>frameStep</b> from <b>b0</b>: one history step in 60-Hz units, approximately 1 at 60 updates per second and 2 at 30. Using it in the exponent makes the fade account for elapsed time. The preceding <b>viewportSize</b> and <b>time</b> fields keep <b>frameStep</b> at the required fourth-float position, even though this shader does not use them.</p>
 * ```js
 * const fadeFeedback = `
 * Texture2D InputImage : register(t0);
 * SamplerState InputSampler : register(s0);
 * cbuffer ImageConstants : register(b0) {
 *     float2 viewportSize;
 *     float time;
 *     float frameStep;
 * };
 * struct PSInput {
 *     float4 clipSpacePos : SV_POSITION;
 *     float4 sceneSpacePos : SCENE_POS;
 *     float4 texelSpacePos : TEXEL_POS;
 * };
 * float4 main(PSInput p) : SV_Target {
 *     float4 history = InputImage.SampleLevel(InputSampler, p.texelSpacePos.xy, 0);
 *     history.rgb *= pow(0.96, frameStep);
 *     return history;
 * }`;
 * ```
 * <p>Use <b>fadeFeedback</b> as <b>feedback</b> in the creation call. This keeps 96% of the history color per 60 Hz time unit, gradually darkening older traces. The current meter bar is added by the engine after the fade; you do not draw it again in the feedback shader.</p>
 * ```js
 * // Use this renderer object in the preceding creation call:
 * const renderer = {
 *     shader,
 *     feedback: fadeFeedback,
 *     post: colorPost
 * };
 * ```
 * <p><b>Source transparency matters:</b> an opaque source covers the transformed history. The meter shader from step 3 returns transparent pixels outside the bar, so older, fading levels remain visible when the current level falls. The source is composited over history using its alpha; it is not automatically added to the previous RGB values.</p>
 * <p>Each visualization owns its own history, initially black. By default that background is opaque. Set <b>feedbackTransparent: true</b> to start with transparent black and retain meaningful alpha in the accumulated image, for example when the visualization should reveal the panel beneath it. In every pass, return <b>premultiplied RGBA</b>: when you change alpha, keep RGB multiplied by that alpha too.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Feedback-and-Two-Posts.js.html">Shader - Feedback and Two Posts.js</a> combines a history effect with two ordered post passes.</p>
 * <h3>Feedback update rate</h3>
 * <p>By default, every {@link Visualization#Draw Draw} call advances feedback history once. Set <b>feedbackIntervalMs</b> to request a different history cadence. The source and feedback then advance together only when a history step is due; between steps, the last completed history is shown through the post passes.</p>
 * ```js
 * // Add this property to a renderer that already has a feedback pass:
 * const renderer = {
 *     shader,
 *     feedback: fadeFeedback,
 *     post: colorPost,
 *     feedbackIntervalMs: 1000 / 30 // Request about 30 history steps per second.
 * };
 * ```
 * <p>This setting does not create a timer. A history step can run only when the script calls {@link Visualization#Draw Draw}; repaint often enough to support the requested cadence. Missed steps are skipped rather than replayed with old audio. Post shaders can still animate on every repaint even when history is unchanged.</p>
 * <p><b>time</b> describes the animation clock, while <b>frameStep</b> describes one rendering step. For per-draw feedback and all post passes, <b>frameStep</b> is the elapsed draw interval multiplied by 60, clamped to 0.001–6. With a positive <b>feedbackIntervalMs</b>, feedback and the non-spectrogram source shader instead receive the configured interval multiplied by 0.06, clamped to 0.001–60. Spectrogram's main shader has its own constant layout and no <b>frameStep</b> field.</p>
 * <p>To turn a rate expressed per second into a per-step change, multiply it by <b>frameStep / 60</b>. For a time-scaled formula designed around 30 FPS, use <b>frameStep / 2</b> as the step multiplier. The fading example uses an exponential factor so the intended fade rate follows step time.</p>
 * <p>This does not make every effect independent of FPS: repeated resampling, source opacity, and nonlinear operations can still change the accumulated image. Increasing only the repaint rate does not increase a separately limited history rate.</p>
 * <p>Change {@link Visualization#FeedbackIntervalMs FeedbackIntervalMs} on an existing shader visualization to adjust this cadence without recompiling or clearing history. The next eligible {@link Visualization#Draw Draw} starts the new schedule. It accepts 0 or a finite number from 1 to 1000 milliseconds, including fractional values; a positive value requires a feedback pass. Assigning the same value keeps the schedule intact; assigning 0 returns to one history step per draw. Audio analysis and the animation clock are preserved. The setter neither requests a repaint nor bypasses pause or resize freezes.</p>
 * ```js
 * visual.FeedbackIntervalMs = 1000 / 120; // Fixed history step at 120 FPS.
 * const interval = visual.FeedbackIntervalMs; // Read the current setting.
 * visual.FeedbackIntervalMs = 0;              // Return to per-Draw history.
 * // The repaint timer is separate; keep it fast enough for the desired cadence.
 * ```
 * <h3>The image-pass interface</h3>
 * <p>Feedback and post shaders use the same image interface, shown in full in <b>fadeFeedback</b>. Declare the inputs needed by your shader; <b>colorPost</b> does not need the constant buffer. Their bindings have different meanings from the main source shader's bindings:</p>
 * <table class="vis-settings"><thead><tr><th>Input</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0 / s0</b></td><td>The image being processed and its sampler. Feedback receives previous history; the first post receives the completed current image; later posts receive the preceding post output.</td></tr>
 * <tr><td><b>b0: float2 viewportSize</b></td><td>Current output width and height in pixels.</td></tr>
 * <tr><td><b>b0: float time</b></td><td>Animation time in seconds since the first usable draw; it restarts when the underlying Direct2D device changes.</td></tr>
 * <tr><td><b>b0: float frameStep</b></td><td>Time step in 60 Hz frame units. Here it is the fourth float, in place of the source shader's element count.</td></tr>
 * <tr><td><b>sceneSpacePos.xy</b></td><td>Local output pixel position; divide by <b>viewportSize</b> for a logical position in the drawing rectangle.</td></tr>
 * <tr><td><b>texelSpacePos.xy</b></td><td>Coordinates for sampling the preceding image. Use these for a direct image read.</td></tr>
 * <tr><td><b>t1–t3 / s1–s3</b></td><td>Optional image files attached to this pass, described below. These are not the main shader's audio textures.</td></tr>
 * </tbody></table>
 * <p>Image passes do not receive the source's audio textures or arbitrary JavaScript uniforms. Keep audio-driven drawing in the main shader, or encode information needed by later passes in the image it produces.</p>
 * <div class="doc-note"><b>When changing sample coordinates:</b> logical output coordinates and input texture coordinates need not cover the same 0–1 range. In a chain, an input image may occupy only part of its backing texture. Use <b>texelSpacePos</b> for input sampling and map any logical offsets into that coordinate space; do not assume that replacing it with <b>sceneSpacePos / viewportSize</b> always reads the same pixel.</div>
 * <h3>Adding image files to a pass</h3>
 * <p>To use a noise texture, mask or other image alongside history, replace that pass's HLSL string with an object containing <b>shader</b> and <b>textures</b>. The preceding image remains at <b>t0</b>; one to three files bind in array order at <b>t1</b> through <b>t3</b>, with matching samplers at <b>s1</b> through <b>s3</b>.</p>
 * <p>This example applies a grayscale opacity mask after the earlier color post effect. Supply an existing mask file and adjust the path: white keeps the image, black makes it transparent. The shader stretches the mask over the drawing rectangle using local output coordinates, while reading the preceding image with its own texture coordinates. Multiplying all four color components preserves premultiplied alpha.</p>
 * ```js
 * const texturedPost = `
 * Texture2D InputImage : register(t0);
 * SamplerState InputSampler : register(s0);
 * Texture2D Mask : register(t1);
 * SamplerState MaskSampler : register(s1);
 * cbuffer ImageConstants : register(b0) {
 *     float2 viewportSize;
 * };
 * struct PSInput {
 *     float4 clipSpacePos : SV_POSITION;
 *     float4 sceneSpacePos : SCENE_POS;
 *     float4 texelSpacePos : TEXEL_POS;
 * };
 * float4 main(PSInput p) : SV_Target {
 *     float4 color = InputImage.SampleLevel(InputSampler, p.texelSpacePos.xy, 0);
 *     float2 maskUV = p.sceneSpacePos.xy / max(viewportSize, 1.0);
 *     float opacity = Mask.SampleLevel(MaskSampler, saturate(maskUV), 0).r;
 *     return color * opacity;
 * }`;
 * // Use this renderer object in the earlier CreateAsync call.
 * const renderer = {
 *     shader,
 *     feedback: fadeFeedback,
 *     post: [colorPost, {
 *         shader: texturedPost,
 *         textures: ["images/mask.png"] // Supply an existing image file.
 *     }]
 * };
 * ```
 * <p>The object form is available for <b>feedback</b> and for each <b>post</b> pass. Attach an image to the pass that samples it: textures are not shared automatically between passes, and the main <b>shader</b> uses its source-defined audio bindings.</p>
 * <p>Paths follow the usual script image-path rules. JSplitter reads and decodes the files during asynchronous creation and retains those pixels. If the graphics device is recreated, its textures are uploaded again from the retained data without rereading the files. Create a new visualization to load changed image files. During rendering they are fixed inputs, not additional history images. Define wrapping explicitly in HLSL, for example by applying <b>frac()</b> to the coordinates used for an auxiliary texture.</p>
 * <h3>Shader renderer settings</h3>
 * <p>The third argument to {@link vis.CreateAsync CreateAsync} accepts the following shader renderer settings. See {@link VisualizationShaderRenderer} for the complete reference.</p>
 * <table class="vis-settings"><thead><tr><th>Setting</th><th>Runtime</th><th>Default</th><th>Description</th></tr></thead><tbody>
 * <tr><td><b>shader</b></td><td>—</td><td>Required</td><td>Non-empty HLSL text or compiled DXBC. Generates the source image.</td></tr>
 * <tr><td><b>feedback</b></td><td>—</td><td>Omitted</td><td>One image pass, or null to omit it. Transforms saved history before the source is composited.</td></tr>
 * <tr><td><b>post</b></td><td>—</td><td>Omitted</td><td>One image pass, an array of 1–4 passes, or null. Processes only the displayed result.</td></tr>
 * <tr><td><b>feedbackIntervalMs</b></td><td>{@link Visualization#FeedbackIntervalMs FeedbackIntervalMs}</td><td>0</td><td>0 for every draw, or a finite number from 1 to 1000 ms, including fractional values. A positive value requires feedback.</td></tr>
 * <tr><td><b>feedbackTransparent</b></td><td>—</td><td>false</td><td>Use transparent history instead of an opaque black background; true requires feedback.</td></tr>
 * <tr><td><b>stopOnPause</b></td><td>—</td><td>false</td><td>Freeze the completed image, including post effects, when playback is paused.</td></tr>
 * </tbody></table>
 * <p>An image pass may be a direct HLSL/DXBC value or a {@link VisualizationImagePass} object with <b>shader</b> and optional <b>textures</b>. HLSL and DXBC can be mixed within a pipeline; compilation options are covered at the end of this article.</p>
 * <h3>Pause, resizing and history lifetime</h3>
 * <p>With the default <b>stopOnPause: false</b>, shaders continue to run on pause using the source's retained audio data; feedback can keep evolving. Set it to true to display the last completed image until playback resumes. This freezes rendering, not native audio analysis. In either case, the script remains responsible for requesting repaints.</p>
 * <p>For a visualization with feedback, while the drawing size is changing JSplitter temporarily scales a snapshot of the last completed image. Once the size settles, it resizes the saved history once and resumes the pipeline. Without feedback, an active source/post pipeline renders directly at the new size. A paused, frozen image is simply scaled without reprocessing it.</p>
 * <p>Feedback supports drawing areas up to <b>4096 pixels per side</b> and <b>4,194,304 pixels in total</b>. History belongs to the visualization instance; creating another instance starts a new history, and a graphics-device change resets it. Switching between panel and bitmap graphics on the same Direct2D device preserves history.</p>
 * <p>If a Waveform or Vectorscope source temporarily has no PCM, its source image is not added to feedback. Existing history can still advance through feedback and post, which lets trails continue between tracks. This is separate from the paused-playback behavior above.</p>
 * <h3>Injecting a bitmap into feedback history</h3>
 * <p>Use {@link Visualization#InjectFeedback InjectFeedback} when an image should become part of recursive feedback rather than a normal overlay. The visualization must have a <b>feedback</b> pass.</p>
 * ```js
 * // 'visual' was created with vis.CreateAsync() and feedback enabled.
 * const w = 640, h = 128;
 * const bitmap = d2d.CreateImage(w, h);
 * const bg = bitmap.GetGraphics();
 * try {
 *     bg.DrawString('Now playing', d2d.Font('Segoe UI', 30),
 *         0xffffffff, 20, 20, w - 40, 64);
 * } finally {
 *     bitmap.ReleaseGraphics(bg);
 * }
 * visual.InjectFeedback(bitmap);
 * ```
 * <p>{@link Visualization#InjectFeedback InjectFeedback} copies the bitmap to the GPU and queues it for the next feedback-history update. At that update, JSplitter processes the previous history through the feedback pass, composites the current source image, then alpha-composites the injected bitmap and saves the result. Any post pass runs afterwards for presentation.</p>
 * <p>If <b>feedbackIntervalMs</b> postpones the next history update, the bitmap remains pending until that update occurs. Calling {@link Visualization#InjectFeedback InjectFeedback} again before then replaces the pending bitmap. The method does not request a repaint or force an early history update.</p>
 * <p>The argument must be a {@link D2DBitmap} on the <b>same D2D device</b> as the visualization; GDI bitmaps are not accepted. The dimensions must not exceed <b>4096 pixels</b> per side or <b>4,194,304 pixels</b> in total. Injected images are scaled to the feedback surface, so use a suitable aspect ratio. To draw graphics that must stay outside feedback history, draw them after {@link Visualization#Draw visual.Draw} in {@link module:Callbacks.on_paint on_paint}.</p>
 * <p><b>Preset hand-off:</b> <a href="source-samples-vis-Shader---MilkDrop-ALL.js.html">Shader - MilkDrop ALL.js</a> captures the outgoing preset into an offscreen D2D bitmap and injects it once into the incoming preset. The incoming feedback shader then controls how that image is distorted and faded; no second visualization is kept running for a screen-space crossfade.</p>
 * <h3>Complete MilkDrop example and preset browser</h3>
 * <p><b>Standalone sample:</b> <a href="source-samples-vis-Shader---MilkDrop-0101.js.html">Shader - MilkDrop 0101.js</a> contains a complete, runnable port in a single file. It defines the Vectorscope source settings and all three HLSL stages (<b>shader</b>, <b>feedback</b> and <b>post</b>) before passing them directly to {@link vis.CreateAsync CreateAsync}. It is a good starting point for studying or modifying the full pipeline without loading separate preset files.</p>
 * <p><b>Preset browser:</b> <a href="source-samples-vis-Shader---MilkDrop-ALL.js.html">Shader - MilkDrop ALL.js</a> discovers readable JavaScript preset files in <b>samples/vis/MilkDrop</b>, including 0101. Each numbered file contains commented HLSL strings and a factory that returns its source settings and renderer object for the selected FPS. The browser offers 30, 60 and 120 FPS buttons and accepts integer targets from 30 to 1000; these are repaint requests, not a guaranteed rendering rate. Add another four-digit <b>.js</b> file and reload the panel to make it available.</p>
 * <p>The browser loads trusted preset files through {@link include include}, compiles their shaders with {@link vis.CreateAsync CreateAsync}, hands the outgoing frame to the incoming feedback via {@link Visualization#InjectFeedback InjectFeedback}, and displays live native cache statistics.</p>
 * <p>Changing FPS preserves the active visualization and its history. Most presets advance history on every draw; a preset that opts into fixed cadence through <b>feedbackIntervalMs</b>, such as 0176, has its factory interval re-evaluated and applied through {@link Visualization#FeedbackIntervalMs FeedbackIntervalMs}. Audio analysis cadence and the PCM window remain separate from display FPS. Both samples use the public visualization API and need no MilkDrop-specific native API.</p>
 * <h2>Source shader input reference</h2>
 * <p>The main <b>shader</b> receives the selected source's analysis data through textures <b>t0</b>..<b>t2</b> and its drawing constants through <b>b0</b>. The snippets below show the smallest useful reads for each source; the linked samples contain complete shaders.</p>
 * <p>For non-spectrogram sources, <b>b0</b> starts with this layout:</p>
 * ```hlsl
 * cbuffer VisConstants : register(b0) {
 *     float2 viewportSize;
 *     float time;
 *     float sourceCount;
 *     float frameStep;
 * };
 * ```
 * <p>The fourth float is the number of source elements. Name it <b>pointCount</b> or <b>bandCount</b> when that makes the shader clearer. <b>frameStep</b> is optional and uses 60 Hz frame units. The field names are yours to choose; the order and types are not.</p>
 * <p>Audio textures use <b>R32F</b>, so declare them as <b>Texture2D&lt;float&gt;</b> and read exact values with <b>Load()</b>:</p>
 * ```hlsl
 * Texture2D<float> Input : register(t0);
 * float value = Input.Load(int3(i, 0, 0)).r;
 * ```
 * <p>For one-row textures, index <b>i</b> selects the source element and the final zero selects mip level 0. No sampler is needed for these reads. <b>sceneSpacePos.xy</b> is the current pixel position inside the rectangle passed to {@link Visualization#Draw Draw}.</p>
 *
 * <h3>Waveform</h3>
 * <p><b>t0</b> contains the recent waveform as signed PCM values. A horizontal pixel can select one source sample like this:</p>
 * ```hlsl
 * Texture2D<float> Samples : register(t0);
 * int count = max((int)pointCount, 1);
 * int i = clamp((int)(input.sceneSpacePos.x / max(viewportSize.x, 1.0) * count), 0, count - 1);
 * float amplitude = Samples.Load(int3(i, 0, 0)).r;
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>pointCount × 1 R32F</td><td>Signed resampled waveform values, approximately −1 to 1.</td></tr>
 * <tr><td><b>b0 count</b></td><td>pointCount</td><td>Number of valid waveform samples.</td></tr>
 * </tbody></table>
 * <p>Map +1 to the top, 0 to the center and −1 to the bottom. The shader texture contains the center trace only; the min/max envelope exposed to JavaScript callbacks is not uploaded to HLSL.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Waveform.js.html">Shader - Waveform.js</a>.</p>
 *
 * <h3>Spectrum</h3>
 * <p><b>t0</b> and <b>t1</b> use the same band index:</p>
 * ```hlsl
 * Texture2D<float> Levels : register(t0);
 * Texture2D<float> Peaks  : register(t1);
 * float level = Levels.Load(int3(i, 0, 0)).r;
 * float peak  = Peaks.Load(int3(i, 0, 0)).r;
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>bandCount × 1 R32F</td><td>Current normalized FFT-band levels.</td></tr>
 * <tr><td><b>t1</b></td><td>bandCount × 1 R32F</td><td>Held peaks for the same bands.</td></tr>
 * <tr><td><b>b0 count</b></td><td>bandCount</td><td>Number of valid bands in both textures.</td></tr>
 * </tbody></table>
 * <p>Values use the source's <b>minDb</b>/<b>maxDb</b> range on a normalized 0–1 scale and are capped at 0.98. Source frequency settings define what each band represents; the shader decides only how to place those bands on screen.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Spectrum.js.html">Shader - Spectrum.js</a>.</p>
 *
 * <h3>Peak Meter</h3>
 * <p>The meter exposes its current level, held peak and clipping state as three 1×1 textures:</p>
 * ```hlsl
 * Texture2D<float> Level : register(t0);
 * Texture2D<float> Peak  : register(t1);
 * Texture2D<float> Clip  : register(t2);
 * float level = Level.Load(int3(0, 0, 0)).r;
 * float peak  = Peak.Load(int3(0, 0, 0)).r;
 * bool clipped = Clip.Load(int3(0, 0, 0)).r != 0.0;
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>1 × 1 R32F</td><td>Current normalized level, 0–1.</td></tr>
 * <tr><td><b>t1</b></td><td>1 × 1 R32F</td><td>Held peak position, 0–1.</td></tr>
 * <tr><td><b>t2</b></td><td>1 × 1 R32F</td><td>Numeric clipping flag: 0 or 1.</td></tr>
 * <tr><td><b>b0 count</b></td><td>sourceCount = 1</td><td>Single meter value set.</td></tr>
 * </tbody></table>
 * <p>The source already applies its attack/release, peak hold and clipping hold behavior. The shader only renders the resulting values.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Peak-Meter.js.html">Shader - Peak Meter.js</a>.</p>
 *
 * <h3>VU Meter</h3>
 * <p>VU Meter uses the same first two slots for its current and held readings:</p>
 * ```hlsl
 * Texture2D<float> VU   : register(t0);
 * Texture2D<float> Hold : register(t1);
 * float current = VU.Load(int3(0, 0, 0)).r;
 * float marker  = Hold.Load(int3(0, 0, 0)).r;
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>1 × 1 R32F</td><td>Current normalized VU reading over the configured <b>minVu</b>..<b>maxVu</b> range.</td></tr>
 * <tr><td><b>t1</b></td><td>1 × 1 R32F</td><td>Held VU marker on the same normalized scale.</td></tr>
 * <tr><td><b>t2</b></td><td>1 × 1 R32F</td><td>Reserved auxiliary slot containing zero; VU Meter does not expose clipping.</td></tr>
 * <tr><td><b>b0 count</b></td><td>sourceCount = 1</td><td>Single meter value set.</td></tr>
 * </tbody></table>
 * <p>The source performs the VU measurement and smoothing. A 0 VU reference tick is a display convention, not another input value.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---VU-Meter.js.html">Shader - VU Meter.js</a>.</p>
 *
 * <h3>Spectrogram</h3>
 * <p>Spectrogram is the exception to the one-row texture layout. <b>t0</b> is a 2D circular history: X is time and Y is frequency, with high frequencies at the top. The shader receives the ring position in an extended <b>b0</b>:</p>
 * ```hlsl
 * Texture2D<float> History : register(t0);
 * cbuffer VisConstants : register(b0) {
 *     float2 viewportSize;
 *     float time;
 *     float sourceCount;      // 1
 *     float textureWidth;
 *     float textureHeight;
 *     float nextColumn;       // Next physical write slot.
 *     float validColumns;
 *     float scrollPixels;
 *     float reserved0;
 *     float reserved1;
 *     float reserved2;
 *     float4 reservedColor;
 * };
 * ```
 * <p>For a full ring, display column <b>x</b> maps to the physical texture by wrapping from <b>nextColumn</b>:</p>
 * ```hlsl
 * int width = max((int)textureWidth, 1);
 * int height = max((int)textureHeight, 1);
 * int x = clamp((int)(input.sceneSpacePos.x / max(viewportSize.x, 1.0) * width), 0, width - 1);
 * int row = clamp((int)(input.sceneSpacePos.y / max(viewportSize.y, 1.0) * height), 0, height - 1);
 * int physicalX = ((int)nextColumn + x) % width;
 * float level = History.Load(int3(physicalX, row, 0)).r;
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>2D R32F history texture</td><td>Circular timeline of normalized spectral intensities. Columns are time slots; rows are frequency cells.</td></tr>
 * <tr><td><b>b0</b></td><td>16 floats</td><td>Viewport, time, texture dimensions, ring position, valid-column count and fractional scroll position.</td></tr>
 * </tbody></table>
 * <p>Texture values are already normalized: 0 corresponds to <b>minDb</b> and 1 to <b>maxDb</b>. Before the ring fills, only <b>validColumns</b> slots contain history; the complete sample handles the partial-ring case and <b>scrollPixels</b> for smooth scrolling. One display-history column represents 20 ms on the fixed 50 px/s display timeline, independently of the source's <b>columnIntervalMs</b>.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Spectrogram.js.html">Shader - Spectrogram.js</a>.</p>
 *
 * <h3>Vectorscope</h3>
 * <p><b>t0</b> and <b>t1</b> contain synchronized left/right PCM samples. Read the same index from both, then convert the pair to vectorscope coordinates:</p>
 * ```hlsl
 * Texture2D<float> Left  : register(t0);
 * Texture2D<float> Right : register(t1);
 * float L = Left.Load(int3(i, 0, 0)).r;
 * float R = Right.Load(int3(i, 0, 0)).r;
 * float2 xy = float2((L - R) * 0.5, (L + R) * 0.5);
 * ```
 * <table class="vis-settings" style="table-layout:fixed;width:100%"><colgroup><col style="width:20%"><col style="width:26%"><col style="width:54%"></colgroup><thead><tr><th>Input</th><th>Layout</th><th>Contents</th></tr></thead><tbody>
 * <tr><td><b>t0</b></td><td>pointCount × 1 R32F</td><td>Signed PCM samples from the selected left channel, approximately −1 to 1.</td></tr>
 * <tr><td><b>t1</b></td><td>pointCount × 1 R32F</td><td>Corresponding samples from the selected right channel.</td></tr>
 * <tr><td><b>t2</b></td><td>9 × 1 R32F when enabled</td><td>Relative and absolute bass/mid/treble analysis; see below.</td></tr>
 * <tr><td><b>b0 count</b></td><td>pointCount</td><td>Number of synchronized stereo sample pairs.</td></tr>
 * </tbody></table>
 * <p>With <b>relativeBandAnalysis: true</b>, <b>t2</b> is also bound:</p>
 * ```hlsl
 * Texture2D<float> Bands : register(t2);
 * float bass = Bands.Load(int3(0, 0, 0)).r;
 * float mid  = Bands.Load(int3(1, 0, 0)).r;
 * float treb = Bands.Load(int3(2, 0, 0)).r;
 * float bassAtt = Bands.Load(int3(3, 0, 0)).r;
 * ```
 * <p>Indices 0–2 are the immediate <b>bass</b>, <b>mid</b> and <b>treb</b> levels relative to their long-term averages; 3–5 are the attack/release-smoothed versions. A value of 1 matches the adaptive long-term reference level, and the relative values are not clamped to 0–1. Indices 6–8 contain the corresponding immediate absolute magnitude sums. This option belongs to the Vectorscope source settings, not the shader renderer.</p>
 * <p>A pixel shader that plots many PCM points may be considerably more expensive than the built-in Vectorscope renderer because each output pixel can examine multiple source samples.</p>
 * <p><b>Sample:</b> <a href="source-samples-vis-Shader---Vectorscope.js.html">Shader - Vectorscope.js</a>.</p>
 * <h2>Compilation and shader reuse</h2>
 * <p>For normal use, pass HLSL directly to {@link vis.CreateAsync CreateAsync}. JSplitter compiles each HLSL stage asynchronously and caches the resulting DXBC; no explicit compilation is required.</p>
 * <h3>Automatic compilation and shader cache</h3>
 * <p>{@link vis.ShaderTarget} selects the shader profile used by {@link vis.CreateAsync CreateAsync}, and {@link vis.ShaderFlags} selects the compiler flags. The defaults are <b>ps_4_0</b> and <b>0x8008</b> (optimization level 3 with row-major matrix packing). Each creation call captures these settings for all of its HLSL stages; later changes affect only subsequent calls.</p>
 * <p>Compiled HLSL is stored in a process-wide, in-memory <b>LRU cache</b> shared by JSplitter panels. Cache entries are keyed by the exact HLSL source text, shader profile and compiler flags. Each stage is looked up separately, so identical HLSL can reuse the same entry across stages and panels. The cache is discarded when foobar2000 exits.</p>
 * <p>{@link vis.ShaderCacheMaxEntries} (default <b>128</b>, allowed 0–4096) and {@link vis.ShaderCacheMaxBytes} (default <b>16 MiB</b>, allowed 0–1 GiB) limit the cache independently. Setting either limit to zero disables caching; lowering a limit immediately evicts least-recently-used entries as needed. The limits are process-wide and are not saved across restarts. {@link vis.ShaderCacheMaxBytes} measures approximate CPU memory retained for source text, profiles and bytecode, not GPU memory.</p>
 * <p>{@link vis.ShaderCacheStats} returns a fresh {@link ShaderCacheStats} snapshot:</p>
 * ```js
 * const { Entries, Bytes, Hits, Misses, Evictions } = vis.ShaderCacheStats;
 * console.log(`HLSL cache: ${Entries}/${vis.ShaderCacheMaxEntries} entries, ` +
 *     `${Bytes}/${vis.ShaderCacheMaxBytes} bytes; ${Hits} hits, ` +
 *     `${Misses} misses, ${Evictions} evictions`);
 * ```
 * <p>The cache is used only by automatic HLSL compilation in {@link vis.CreateAsync CreateAsync}. Precompiled DXBC bypasses it, and {@link d2d.Compile} / {@link d2d.CompileAsync} do not use it and compile on every call. {@link vis.ShaderCacheStats} therefore reports only automatic {@link vis.CreateAsync CreateAsync} compilation. Cache limits affect future reuse only; visualizations that are already running are unchanged.</p>
 * <h3>Explicit compilation and DXBC reuse</h3>
 * <p>Use {@link d2d.CompileAsync d2d.CompileAsync} when you want to compile HLSL explicitly and keep the resulting DXBC for reuse. It returns the same {@link D2DCompileInfo} result as synchronous {@link d2d.Compile d2d.Compile}, but runs without blocking the calling JavaScript thread. Both methods default to entry point <b>main</b> and profile <b>ps_4_0</b>, and take their own profile and flags arguments.</p>
 * ```js
 * async function createCompiledMeter(hlsl) {
 *     const compiled = await d2d.CompileAsync(hlsl);
 *     if (compiled.Error) throw new Error(compiled.Error);
 *
 *     return vis.CreateAsync(VisSourceType.PeakMeter, null, {
 *         shader: compiled.Code
 *     });
 * }
 * ```
 * <p>{@link vis.CreateAsync CreateAsync} accepts precompiled DXBC as a Uint8Array or ArrayBuffer anywhere an HLSL shader stage is accepted, so HLSL and DXBC stages can be mixed in the same pipeline. Supported bytecode profiles are <b>ps_4_0</b>, <b>ps_4_1</b> and <b>ps_5_0</b>; the selected profile must be supported by the GPU and the shader must follow the same source or image-pass input contract as HLSL.</p>
 * <p>An HLSL compiler error from {@link d2d.CompileAsync d2d.CompileAsync} is returned in {@link D2DCompileInfo#Error D2DCompileInfo.Error}; other setup or task failures can reject the Promise. Synchronous {@link d2d.Compile d2d.Compile} is also available, but a large compilation can block the UI. Compatible DXBC produced by an external HLSL compiler can be used in the same way.</p>
 * <p>The runnable visualization samples are in component/samples/vis and are available through the <b>vis</b> sample category in the panel configurator. The links in this article open their corresponding source files in the generated API documentation.</p>
 * @module Visualizations
 */
