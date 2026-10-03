/**
 * JSplitter exposes the standard <b>WebAssembly</b> global in both panels and
 * {@link Worker Workers}. WebAssembly modules built from C, C++, Rust or other
 * supported languages can run directly in SpiderMonkey without additional native
 * support from JSplitter.
 *
 * <h2>Loading a module</h2>
 * The simplest approach is to read a local <b>.wasm</b> file as bytes with
 * {@link utils.ReadBinaryFile}, then create a module and an instance:
 *
 * ```js
 * const bytes = utils.ReadBinaryFile('algorithm.wasm');
 * if (!bytes) throw new Error('Cannot read WASM module');
 *
 * const module = new WebAssembly.Module(bytes);
 * const instance = new WebAssembly.Instance(module);
 * // Call instance.exports.someFunction(...)
 * ```
 *
 * For CPU-intensive tasks, consider running WebAssembly in a {@link Worker}
 * to keep the panel responsive.
 *
 * <h2>Ready-to-run example: album-art filters</h2>
 * The <b>samples/wasm</b> folder contains a practical example of Sobel edge
 * detection, implemented in C and compiled to a standalone WASM module.
 * It loads the playing or focused track's cover using {@link utils.GetAlbumArtV2}.
 * When no artwork is available, it displays a generated test image instead.
 * GDI shows the original and filtered artwork side by side.
 *
 * <b>To run:</b> select <b>Script → File</b> in a JSplitter panel and choose
 * <b>samples/wasm/WebAssembly Image Filters.js</b>. Do not move this file
 * separately from its Worker or WASM dependencies. The script is ready to run
 * from the distributed samples directory; no build step or additional runtime
 * is necessary. A panel of roughly <b>650 × 350</b> pixels works well.
 *
 * <ul>
 * <li><b>Left click:</b> switch between Pencil, Neon and Ink modes.</li>
 * <li><b>Mouse wheel:</b> adjust edge-detection threshold.</li>
 * <li><b>Right click:</b> refresh the selected or playing track's cover.</li>
 * </ul>
 *
 * <h2>How the example works</h2>
 * <ol>
 * <li>The panel obtains an image and extracts RGBA pixels using
 * {@link GdiBitmap.GetPixelData}, then transfers their buffer to a
 * file-backed {@link Worker} via {@link Worker#postMessage}.</li>
 * <li>The Worker reads <b>album_art_filters.wasm</b> with
 * {@link utils.ReadBinaryFile}, then constructs its <b>WebAssembly.Module</b>
 * and <b>WebAssembly.Instance</b> once.</li>
 * <li>The Worker copies image pixels into the module's exported
 * <b>WebAssembly.Memory</b>. The native <b>filter</b> function reads that
 * region and writes processed RGBA pixels into another region.</li>
 * <li>The output is copied out of WASM memory and sent back to the panel,
 * which creates an image via {@link gdi.CreateImageFromPixelData}.</li>
 * <li>Changing the mode or threshold reuses the existing instance and source
 * pixels in the Worker. Only small parameters need to be sent again.</li>
 * </ol>
 *
 * <h2>Memory and data exchange</h2>
 * Compiled code uses offsets into linear <b>WebAssembly.Memory</b>, not direct
 * pointers to arbitrary JavaScript objects. This example obtains the beginning
 * of usable memory from the exported <b>__heap_base</b> global and reserves
 * two aligned RGBA buffers. It grows the memory when required and recreates
 * typed-array views after growth. To transfer the result back, it first copies
 * the output into a separate JavaScript <b>Uint8Array</b>, leaving WASM memory
 * owned by the Worker.
 *
 * <h2>Included files</h2>
 * <ul>
 * <li><b>WebAssembly Image Filters.js</b> — GDI panel and controls.</li>
 * <li><b>WebAssembly Image Filters.worker.js</b> — Worker and WASM integration.</li>
 * <li><b>album_art_filters.wasm</b> — ready-to-run standalone module.</li>
 * <li><b>source/album_art_filters.c</b> — original C implementation.</li>
 * <li><b>README.md</b> — optional Clang build command.</li>
 * </ul>
 *
 * <h2>Limitations</h2>
 * WebAssembly is not automatically a browser or operating-system runtime.
 * Modules built for WASI, Emscripten, Node.js, the DOM, network access, or
 * multi-threading may require additional imports, JavaScript support, or APIs
 * that JSplitter does not provide. WebAssembly also does not guarantee a
 * performance improvement over JavaScript or native code. The timer displayed
 * by this example includes the WASM function call and copying of its output
 * buffer, not full end-to-end rendering or image loading.
 *
 * The example limits image dimensions to 384 pixels per side to bound memory
 * and CPU cost, including on 32-bit foobar2000. Only use WASM modules whose
 * behavior and resource requirements you trust.
 *
 * <h2>Building the WASM module (optional)</h2>
 * The prebuilt <b>album_art_filters.wasm</b> is included and runs without a build step. To rebuild it after editing <b>source/album_art_filters.c</b>, install Clang with WebAssembly (wasm32) support and <b>wasm-ld</b>. Run the following from <b>component/samples/wasm</b>:
 *
 * ```sh
 * clang --target=wasm32-unknown-unknown -O3 -nostdlib \
 *   -Wl,--no-entry -Wl,--export=filter -Wl,--export-memory \
 *   -Wl,--export=__heap_base -Wl,--initial-memory=131072 \
 *   -o album_art_filters.wasm source/album_art_filters.c
 * ```
 *
 * On Windows, enter the command on a single line, removing the backslashes used for line continuation. The command writes <b>album_art_filters.wasm</b> next to the Worker script. The <b>-nostdlib</b> and <b>--no-entry</b> options avoid a C runtime entry point; the linker exports the <b>filter</b> function, linear memory and <b>__heap_base</b> needed by the Worker.
 * This is a build-time step outside JSplitter. The panel and Worker simply load the already-built module.
 *
 * @module WebAssembly
 * @sourceFile ../../component/samples/wasm/WebAssembly Image Filters.js
 * @sourceFile ../../component/samples/wasm/WebAssembly Image Filters.worker.js
 */
