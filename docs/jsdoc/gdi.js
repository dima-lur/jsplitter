/**
 * {@link window.DrawMode DrawMode}-aware graphics facade. With {@link window.DrawMode} set to <b>0</b> its resource factories use GDI+; with {@link window.DrawMode} set to <b>1</b> they create the corresponding Direct2D resources instead. A Worker uses the {@link window.DrawMode DrawMode} captured when that Worker is created, so the same <b>gdi.*</b> calls match the parent panel graphics backend.
 *
 * @namespace
 * @worker
 */
let gdi = {

    /**
     * Creates a drawing brush of the specified type. The meaning of the brush's input parameters depends on its type.<br>
     * For type == {@link module:Flags.BrushType BrushType.Solid}:<br>
     * - param1: brush colour in ARGB<br>
     * For type == {@link module:Flags.BrushType BrushType.LinearGradient}:<br>
     * - param1: start point coords of linear gradient in form of Array(2) (for ex.: [0, 0])<br>
     * - param2: end point coords of linear gradient in form of Array(2) (for ex.: [100, 0])<br>
     * - param3: gradient stops specified as an array with alternating position and color values for each stop (for ex.: [0.0, 0xFF000000, 0.5, 0xFFFF0000, 1.0, 0xFFFFFFFF])<br>
     * - param4: wrap mode responsible for how the gradient is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}. Default is {@link module:Flags.BrushWrapMode BrushWrapMode.Tile}<br>
     * For type == {@link module:Flags.BrushType BrushType.RadialGradient}:<br>
     * - param1: center point coords of radial gradient in form of Array(2) (for ex.: [50, 50])<br>
     * - param2: radius values for X and Y axes in form of Array(2) (for ex.: [50, 50])<br>
     * - param3: gradient stops specified as an array with alternating position and color values for each stop (for ex.: [0.0, 0xFF000000, 0.5, 0xFFFF0000, 1.0, 0xFFFFFFFF])<br>
     * - param4: wrap mode responsible for how the gradient is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}. Default is {@link module:Flags.BrushWrapMode BrushWrapMode.Tile}<br>
     * For type == {@link module:Flags.BrushType BrushType.Bitmap}:<br>
     * - param1: {@link GdiBitmap GdiBitmap} object used for drawing by brush<br>
     * - param2: wrap mode responsible for how the image is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}
     * 
     * @param {BrushType} type
     * @param {*} param1
     * @param {*=} [param2=undefined]
     * @param {*=} [param3=undefined]
     * @param {*=} [param4=undefined]
     * @return {GdiBrush} Brush object used in Draw/Fill methods
     * 
     * @throws {Error} If the brush parameters are invalid, including malformed points, radius values, gradient stops, or bitmap input.
     * @sourceFile ../../component/samples/basic/Brushes.js
     * @worker
     */
    Brush: function (type, param1, param2, param3, param4) { }, // (GdiBrush)

    /**
     * @param {number} w
     * @param {number} h
     * @return {GdiBitmap}
     * @worker
     */
    CreateImage: function (w, h) { }, // (GdiBitmap)

    /**
     * Create {@link GdiBitmap GdiBitmap} from raw pixel data in memory.
     *
     * @param {Uint8Array} pixelData Raw pixel bytes
     * @param {number} width Image width in pixels
     * @param {number} height Image height in pixels
     * @param {string} [format="bgra32"] Pixel format string (default: "bgra32")
     * Supported formats:<br>
     *   "bgra32"  32bpp BGRA<br>
     *   "rgba32"  32bpp RGBA<br>
     *   "bgr24"   24bpp BGR<br>
     *   "rgb24"   24bpp RGB<br>
     * @returns {GdiBitmap} null if was an error (for example pixelData array length is not suitable for the specified parameters)
     * 
     * @throws {Error} If <b>data</b> is not a non-empty <b>Uint8Array</b>.
     * @sourceFile ../../component/samples/basic/CreateImageFromPixelData.js
     * @worker
     */
    CreateImageFromPixelData: function(pixelData, width, height, format = "bgra32") { }, // (GdiBitmap)

    /**
     * Performance note: avoid using inside {@link module:Callbacks.on_paint on_paint}.<br>
     * Performance note II: try caching and reusing {@link GdiFont} objects,
     * since the maximum amount of such objects is hard-limited by Windows.
     * {@link GdiFont} creation will fail after reaching this limit.
     *
     * @param {string} name
     * @param {number} size_px See {@link module:Helpers.Point2Pixel Point2Pixel} function for conversions
     * @param {number=} [style=0] See {@link module:Flags.FontStyle FontStyle} flags
     * @return {?GdiFont} null, if font is not present.
     * @worker
     */
    Font: function (name, size_px, style) { }, // (GdiFont) [, style]

    /**
     * Load image from file.<br>
     * <br>
     * Performance note: consider using {@link gdi.LoadImageAsync LoadImageAsync} or {@link gdi.LoadImageAsyncV2 LoadImageAsyncV2} if there are a lot of images to load
     * or if the image is big.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {?GdiBitmap} null, if image failed to load.
     *
     * @example
     * let img = gdi.Image('e:\\images folder\\my_image.png');
     * @worker
     */
    Image: function (path) { }, // (GdiBitmap)

    /**
     * Load image from file asynchronously.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} window_id unused
     * @param {string} path
     * @return {number} a unique id, which is used in {@link module:Callbacks.on_load_image_done on_load_image_done}.
     *
     * @throws {Error} If the panel host is unavailable or foobar2000 is not fully initialized.
     * @sourceFile ../../component/samples/basic/LoadImageAsync.js
     * @worker
     */
    LoadImageAsync: function (window_id, path) { }, // (uint)

    /**
     * Load image from file asynchronously.
     * Returns a <b>Promise</b> object, which will be resolved when image loading is done.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} window_id unused
     * @param {string} path
     * @return {Promise.<?GdiBitmap>}
     *
     * @throws {Error} If the panel host is unavailable or foobar2000 is not fully initialized.
     * @sourceFile ../../component/samples/basic/LoadImageAsyncV2.js
     * @worker
     */
    LoadImageAsyncV2: function (window_id, path) { },

    /**
     * Loads rasterized image from SVG file or XML string
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. Raw SVG/XML strings are used as-is.
     *
     * @param {string} path_or_xml string containing SVG file path or raw XML
     * @param {number=} [max_width=0] If specified rasterizes with width = max_width and height according to the proportions, otherwise uses "width" and "height" attributes in SVG header if exist
     * @return {?GdiBitmap} Rasterized bitmap, null in case of error
     * 
     * @example
     * const svg_file = fb.ComponentPath + 'samples\\svg\\android.svg';
     * 
     * const original = gdi.LoadSVG(svg_file);
     * const large = gdi.LoadSVG(svg_file, 512); // set optional max_width
     * 
     * function on_paint(gr) {
     *     gr.DrawImage(original, 0, 0, original.Width, original.Height, 0, 0, original.Width, original.Height);
     *     gr.DrawImage(large, original.Width, 0, large.Width, large.Height, 0, 0, large.Width, large.Height);
     * }
     * @worker
     */
    LoadSVG: function (path_or_xml, max_width) { }
};

