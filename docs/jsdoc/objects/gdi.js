/**
 * @constructor
 * @param {GdiBitmap} arg
 * @worker
 * @cloneable
 * @transferable
 */
function GdiBitmap(arg) {

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = undefined;// (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = undefined;// (uint) (read)

    /**
     * @param {number} alpha Valid values 0-255.
     * @return {GdiBitmap}
     * @worker
     */
    this.ApplyAlpha = function (alpha) { }; // (GdiBitmap)

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {GdiBitmap} img
     *
     * @sourceFile ../../component/samples/basic/ApplyMask.js
     * @worker
     */
    this.ApplyMask = function (img) { }; // (boolean)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @return {GdiBitmap}
     * @worker
     */
    this.Clone = function (x, y, w, h) { }; // (GdiBitmap)

    /**
     * Create a DDB bitmap from {@link GdiBitmap GdiBitmap}, which is used in {@link GdiGraphics#GdiDrawBitmap GdiDrawBitmap}
     *
     * @return {GdiRawBitmap}
     * @worker
     */
    this.CreateRawBitmap = function () { }; // (GdiRawBitmap)

    /**
     * Returns up to max_count representative colours found in the image.<br>
     * This is a legacy colour extraction method. For colour frequency information and
     * more advanced clustering, use {@link GdiBitmap#GetColourSchemeJSON GetColourSchemeJSON}
     * or {@link GdiBitmap#GetColourSchemeJSONV2 GetColourSchemeJSONV2}.
     *
     * @param {number} max_count maximum number of colours to return
     * @return {Array<number>}
     * @worker
     */
    this.GetColourScheme = function (max_count) { }; // (Array)

    /**
     * Extracts representative colours from the image using K-means clustering in the RGB colour space.<br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.<br>
     * Each entry contains a colour and its relative frequency in the clustered image.<br>
     * Uses a different method for calculating colours than {@link GdiBitmap#GetColourScheme GetColourScheme}.<br>
     * Image is automatically resized during processing for performance reasons so there's no
     * need to resize before calling the method.
     *
     * @param {number} max_count maximum number of colours to return
     * @return {string}
     *
     * @example
     * // See docs\Helpers.js for "toRGB" function.
     * img = ... // use utils.GetAlbumArtV2 / gdi.Image / etc
     * colours = JSON.parse(img.GetColourSchemeJSON(5));
     * console.log(colours[0].col); // 4290772992
     * console.log(colours[0].freq); // 0.34
     * console.log(toRGB(colours[0].col)); // [192, 0, 0]
     * @worker
     */
    this.GetColourSchemeJSON = function (max_count) { }; // (string)

    /**
     * Extracts representative colours from the image using K-means++ clustering in the Oklab colour space.<br>
     * Returns a JSON array in string form so you need to use JSON.parse() on the result.<br>
     * Each entry contains a colour and its relative frequency in the clustered image.<br>
     * K-means++ initialization improves the distribution of the initial cluster centres, while Oklab
     * provides a perceptually more uniform distance metric than RGB.<br>
     * The optional min_chroma parameter limits the initial cluster centre selection to pixels with at
     * least the specified Oklab chroma. It does not filter pixels or colours from the clustering result.
     *
     * @param {number} max_count maximum number of colours to return
     * @param {number} [min_chroma=0.0] minimum Oklab chroma for pixels used as initial cluster centres
     * @return {string}
     *
     * @example
     * // See docs\Helpers.js for "toRGB" function.
     * img = ... // use utils.GetAlbumArtV2 / gdi.Image / etc
     * colours = JSON.parse(img.GetColourSchemeJSONV2(10, 0.02));
     * console.log(colours[0].col); // 4290772992
     * console.log(colours[0].freq); // 0.34
     * console.log(toRGB(colours[0].col)); // [192, 0, 0]
     * @worker
     */
    this.GetColourSchemeJSONV2 = function (max_count, min_chroma) { }; // (string)

    /**
     * Builds an image-derived UI colour scheme for styling interface surfaces, text and interaction states from the bitmap.<br>
     * <br>
     * The image is analysed in <b>OKLab</b> using the same weighted <b>K-means++</b> palette extraction as {@link GdiBitmap#GetColourSchemeJSONV2 GetColourSchemeJSONV2}.<br>
     * The palette stage uses <b>paletteSize</b> centroids, after which colours are assigned to five semantic UI roles:<br>
     * <b>Background</b>, <b>Text</b>, <b>Playing background</b>, <b>Focus frame</b> and <b>Selection background</b>.<br>
     * <br>
     * The returned colours are unsigned 32-bit <b>ARGB</b> values.<br>
     * <b>Background</b> and <b>Text</b> are opaque.<br>
     * State colours may contain alpha and are intended to be composited over <b>Background</b>.<br>
     * <b>playingBackgroundColor</b> contains the Playing accent RGB together with the recommended alpha for a background highlight.<br>
     * The same RGB channels can also be used at full opacity for a solid Playing indicator.<br>
     * <br>
     * * The algorithm favours a representative image colour family for <b>Background</b>, prefers light body text unless the selected surface requires dark text, and uses independent image colour families for interaction/state accents when suitable candidates are available.<br>
     * <br>
     * Returns an empty object <b>{}</b> if a colour scheme cannot be generated.<br>
     * 
     * @param {number} [paletteSize=15] <b>Palette size.</b> Number of <b>K-means++</b> colour centroids used as the input palette.<br>
     * @returns {string} <b>JSON object string.</b> Contains <b>backgroundColor</b>, <b>textColor</b>, <b>playingBackgroundColor</b>, <b>focusFrameColor</b> and <b>selectionBackgroundColor</b>.<br>
     *
     * @example
     * const colours = JSON.parse(image.GetThemeColourSchemeJSON());
     *
     * if (Object.keys(colours).length) {
     *     const playingIndicatorColor =
     *         0xFF000000 | (colours.playingBackgroundColor & 0x00FFFFFF);
     *
     *     console.log(colours.backgroundColor);
     *     console.log(colours.textColor);
     *     console.log(colours.playingBackgroundColor);
     *     console.log(playingIndicatorColor);
     *     console.log(colours.focusFrameColor);
     *     console.log(colours.selectionBackgroundColor);
     * }
     * 
     * @sourceFile ../../component/samples/complete/theme colour scheme.js
     * @worker
     */
    this.GetThemeColourSchemeJSON = function (paletteSize) { }; // (string)
    
    /**
     * Note: don't forget to use {@link GdiBitmap#ReleaseGraphics ReleaseGraphics} after work on {@link GdiGraphics GdiGraphics} is done!
     *
     * @return {GdiGraphics}
     * @worker
     */
    this.GetGraphics = function () { };

    /**
     * Extract raw pixels from bitmap as a byte array in specified pixel format
     *
     * @param {string} [format="bgra32"] Pixel format string (default: "bgra32")
     * Supported formats:<br>
     *   "bgra32"  32bpp BGRA<br>
     *   "rgba32"  32bpp RGBA<br>
     *   "bgr24"   24bpp BGR<br>
     *   "rgb24"   24bpp RGB<br>
     * @returns {Uint8Array} null if was an error (for example, bitmap in unsupported format or unsupported format specified)
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
    this.GetPixelData = function(format) { };

    /**
     * Inverts the colours in a bitmap, to create a negative image.
     * i.e. White becomes black, black becomes white, etc.
     * @return {GdiBitmap}
     * @worker
     */
    this.InvertColours = function () { }; // (GdiBitmap)

    /**
     * @param {GdiGraphics} gr
     * @worker
     */
    this.ReleaseGraphics = function (gr) { }; // (GdiGraphics)

    /**
     * @param {number} w
     * @param {number} h
     * @param {number=} [mode=0] See {@link module:Flags.InterpolationMode InterpolationMode}
     * @return {GdiBitmap}
     * @worker
     */
    this.Resize = function (w, h, mode) { }; // (GdiBitmap) [, mode]

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {number} mode See {@link module:Flags.RotateFlipType RotateFlipType}
     * @worker
     */
    this.RotateFlip = function (mode) { }; // (void)

    /**
     * Saves the bitmap to an image file.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path Absolute or script-relative file path including file extension. The parent folder must already exist.
     * @param {string=} [format='image/png']
     *      "image/png"<br>
     *      "image/bmp"<br>
     *      "image/jpeg"<br>
     *      "image/gif"<br>
     *      "image/tiff"
     * @return {boolean}
     *
     * @example
     * let img = utils.GetAlbumArtEmbedded(fb.GetFocusItem().RawPath, 0);
     * if (img) {
     *     img.SaveAs("D:\\export.jpg", "image/jpeg");
     * }
     * @worker
     */
    this.SaveAs = function (path, format) { }; // (boolean) [, format]

    /**
     * Changes will be saved in the current bitmap.
     *
     * @param {number} radius Valid values 2-254.
     *
     * @example <caption>Blur image</caption>
     * // `samples/basic/StackBlur (image).js`
     *
     * @example <caption>Blur text</caption>
     * // `samples/basic/StackBlur (text).js`
     * @worker
     */
    this.StackBlur = function (radius) { }; // (void)
}

/**
 * Constructor may fail if font is not present.<br>
 *
 * Performance note: try caching and reusing {@link GdiFont} objects,
 * since the maximum amount of such objects is hard-limited by Windows.
 * {@link GdiFont} creation will fail after reaching this limit.
 * @cloneable
 * @constructor
 * @param {string} name
 * @param {number} size_px See {@link module:Helpers.Point2Pixel Point2Pixel} function for conversions
 * @param {number=} [style=0] See {@link module:Flags.FontStyle FontStyle} flags
 * @worker
 */
function GdiFont(name, size_px, style) {
    /**
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(my_font.Height); // 15
     * @worker
     */
    this.Height = undefined;//    (uint)(read)

    /**
     * @type {string}
     * @readonly
     *
     * @example
     * console.log(my_font.Name); // Segoe UI
     * @worker
     */
    this.Name = undefined;//    (string)(read)

    /**
     * @type {float}
     * @readonly
     *
     * @example
     * console.log(my_font.Size); // 12
     * @worker
     */
    this.Size = undefined;//    (float)(read)

    /**
     * See {@link module:Flags.FontStyle FontStyle} flags for value interpretation.
     *
     * @type {number}
     * @readonly
     *
     * @example
     * console.log(my_font.Style);
     * @worker
     */
    this.Style = undefined;//    (uint)(read)

    /**
     * Font weight. Common values follow Win32 font weights, for example 400 for normal and 700 for bold.
     *
     * @type {number}
     * @readonly
     * @worker
     */
    this.Weight = undefined;
}

/**
 * Object used for drawing as alternative for simple colour.<br>
 * Can also be used to reuse brushes for drawing instead of creating them every time for any primitive drawing operation (if just a color is specified in the Draw/Fill methods, a brush is always created).<br>
 * Created by {@link gdi.Brush}
 * @constructor
 * @param {GdiBrush} arg
 * @cloneable
 * @sourceFile ../../component/samples/basic/Brushes.js
 * @worker
 */
function GdiBrush(arg) {

    /**
     * Brush type.<br>
     * See {@link module:Flags.BrushType BrushType}
     * @type {BrushType}
     * @readonly
     * @worker
     */
    this.Type = undefined;// (uint) (read)

    /**
     * Wrap mode responsible for how the brush gradient or image is repeated when drawing<br>
     * See {@link module:Flags.BrushWrapMode BrushWrapMode}
     * @type {BrushWrapMode} 
     * @readonly
     * @worker
     */
    this.WrapMode = undefined;// (uint) (read, write)

    /**
     * Applies translation matrix to the current {@link GdiBrush GdiBrush} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-translation(d2d1_size_f)}
     *
     * @param {number} dx
     * @param {number} dy
     * @worker
     */
    this.Translate = function(dx, dy) {}

    /**
     * Applies rotation matrix to the current {@link GdiBrush GdiBrush} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-rotation}
     *
     * @param {float} angle Angle of rotation in degrees
     * @param {number=} [cx=0] Rotation center point x coord
     * @param {number=} [cy=0] Rotation center point y coord
     * @worker
     */
    this.Rotate = function(angle, cx, cy) {}

    /**
     * Applies scale matrix to the current {@link GdiBrush GdiBrush} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-scale(d2d1_size_f_d2d1_point_2f)}
     *
     * @param {float} sx The x-axis scale factor
     * @param {float=} [sy=0] The y-axis scale factor. If zero sx will be used as sy
     * @param {number=} [cx=0] Scale center point x coord
     * @param {number=} [cy=0] Scale center point y coord
     * @worker
     */
    this.Scale = function(sz, sy, cx, cy) {}
    
    /**
     * Applies skew matrix to the current {@link GdiBrush GdiBrush} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-skew}
     *
     * @param {float} angleX The x-axis skew angle, which is measured in degrees counterclockwise from the y-axis.
     * @param {float} angleY The y-axis skew angle, which is measured in degrees clockwise from the x-axis.
     * @param {number=} [cx=0] Skew center point x coord
     * @param {number=} [cy=0] Skew center point y coord
     * @worker
     */
    this.Skew = function(angleX, angleY, cx, cy) {}

    /**
     * Saves current {@link GdiBrush GdiBrush} matrix in internal stack. To restore the matrix use {@link GdiBrush#PopTransform PopTransform}.
     * @worker
     */
    this.PushTransform = function() {}

    /**
     * Restores {@link GdiBrush GdiBrush} matrix from internal stack pushed previously by {@link GdiBrush#PushTransform PushTransform}.
     * @worker
     */
    this.PopTransform = function() {}

    /**
     * Gets {@link GdiBrush GdiBrush} current transformation matrix of 3x2 size (Float32Array(6))<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @return {Float32Array}
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.GetTransform = function() {}

    /**
     * Replaces the current {@link GdiBrush GdiBrush} matrix with specified transformation matrix of 3x2 size.<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.SetTransform = function(matrix) {}

    /**
     * Resets current {@link GdiBrush GdiBrush} matrix to original identity matrix.
     * @worker
     */
    this.ResetTransform = function () {}

    /**
     * Applies specified transformation matrix of 3x2 size to the current {@link GdiBrush GdiBrush} matrix.<br>
     * Matrix3x2 helper class from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.ApplyTransform = function(matrix) {}    
}

/**
 * Typically used inside {@link module:Callbacks.on_paint on_paint}.<br>
 *
 * Note: there are many different ways to get colours:
 * {@link window.GetColourDUI window.GetColourDUI}/{@link window.GetColourCUI window.GetColourCUI},
 * RGB function from Helpers.js, {@link utils.ColourPicker utils.ColourPicker} and
 * etc.
 *
 * @constructor
 * @hideconstructor
 * @worker
 */
function GdiGraphics() {
    /**
     * Calculates text height for {@link GdiGraphics#GdiDrawText GdiDrawText}.<br>
     * Note: this will only calculate the text height of one line.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @return {number}
     * @worker
     */
    this.CalcTextHeight = function (str, font) { }; // (uint)

    /**
     * Calculates text width for {@link GdiGraphics#GdiDrawText GdiDrawText}.
     * 
     * Note: When the str contains a kerning pair that is found in the specified 
     * font, the return value will be larger than the actual drawn width of the
     * text. If accurate values are required, set use_exact to true.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {boolean=} [use_exact=false] Uses a slower, but more accurate method of calculating text width which accounts for kerning pairs.  
     * @return {number}
     * @worker
     */
    this.CalcTextWidth = function (str, font, use_exact) { }; // (uint)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawEllipse = function (x, y, w, h, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {GdiBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {float=} [angle=0]
     * @param {number=} [alpha=255] Valid values 0-255.
     * @worker
     */
    this.DrawImage = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, angle, alpha) { }; // (void) [, angle][, alpha]

    /**
     * Compatibility alias of {@link GdiGraphics#DrawImage DrawImage}.
     *
     * @param {GdiBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @worker
     */
    this.DrawBitmap = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) { };

    /**
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawLine = function (x1, y1, x2, y2, line_width, colour_or_brush) { }; // (void)

    /**
     * Draws a connected sequence of lines.
     *
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} line_width
     * @param {Array<number>} points array of connected points [x1, y1, x2, y2, ...]
     * @worker
     */
    this.DrawLines = function (colour_or_brush, line_width, points) { };

    /**
     * Draws a connected sequence of lines with connection of last and first points (unlike {@link GdiGraphics#DrawLines DrawLines}).
     * 
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} line_width
     * @param {Array<number>} points array of connected points [x1, y1, x2, y2, ...]
     * @worker
     */
    this.DrawPolygon = function (colour_or_brush, line_width, points) { }; // (void)

    /**
     * Should be only used when {@link GdiGraphics#GdiDrawText GdiDrawText} is not applicable.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See {@link module:Flags.StringFormatFlags StringFormatFlags} flags
     * @worker
     */
    this.DrawString = function (str, font, colour_or_brush, x, y, w, h, flags) { }; // (void) [, flags]

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawRect = function (x, y, w, h, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {number} line_width
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.DrawRoundRect = function (x, y, w, h, arc_width, arc_height, line_width, colour_or_brush) { }; // (void)

    /**
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} max_width
     * @return {Array<Array>}
     *    index | meaning <br>
     *    [0] text line 1 <br>
     *    [1] width of text line 1 (in pixel) <br>
     *    [2] text line 2 <br>
     *    [3] width of text line 2 (in pixel) <br>
     *    ... <br>
     *    [2n + 2] text line n <br>
     *    [2n + 3] width of text line n (px)
     * @worker
     */
    this.EstimateLineWrap = function (str, font, max_width) { }; // (Array)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillEllipse = function (x, y, w, h, colour_or_brush) { }; // (void)

    /**
     * Note: this may appear buggy depending on rectangle size. The easiest fix is
     * to adjust the "angle" by a degree or two.
     *
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {float} angle
     * @param {number} colour1
     * @param {number} colour2
     * @param {float} [focus=1.0] Specify where the centred colour will be at its highest intensity. Valid values between 0 and 1.
     * @worker
     */
    this.FillGradRect = function (x, y, w, h, angle, colour1, colour2, focus) { }; // (void) [, focus]

    /**
     * Fills rect with gradient in arbitrary quantity of stops.
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {float} angle
     * @param {Array} stops Specifies gradient stops in form of [pos0, argb0, ..., posN, argbN]
     * @example
     * dgr.FillGradRectV2(10, 10, 200, 100, 0, [0.0, 0xFF0000FF, 0.5, 0xFFFF0000, 1.0, 0xFF000000]);
     * @worker
     */
    this.FillGradRectV2 = function (x, y, w, h, angle, stops) { };

    /**
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @param {number} fillmode 0 alternate, 1 winding.
     * @param {Array<Array<number>>} points
     * @worker
     */
    this.FillPolygon = function (colour_or_brush, fillmode, points) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number} arc_width
     * @param {number} arc_height
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillRoundRect = function (x, y, w, h, arc_width, arc_height, colour_or_brush) { }; // (void)

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {*} colour_or_brush colour ARGB or {@link GdiBrush} object
     * @worker
     */
    this.FillSolidRect = function (x, y, w, h, colour_or_brush) { }; // (void)

    /**
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @param {number=} [alpha=255] Valid values 0-255.
     * @worker
     */
    this.GdiAlphaBlend = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, alpha) { }; // (void) [, alpha]

    /**
     * Always faster than {@link GdiGraphics#DrawImage DrawImage}, does not support alpha channel.
     *
     * @param {GdiRawBitmap} img
     * @param {number} dstX
     * @param {number} dstY
     * @param {number} dstW
     * @param {number} dstH
     * @param {number} srcX
     * @param {number} srcY
     * @param {number} srcW
     * @param {number} srcH
     * @worker
     */
    this.GdiDrawBitmap = function (img, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) { }; // (void)

    /**
     * Provides faster and better rendering than {@link GdiGraphics#DrawString DrawString}.<br>
     * <br>
     * Do not use this to draw text on transparent background or
     * with {@link GdiGraphics GdiGraphics} other than the one passed in {@link module:Callbacks.on_paint on_paint} callback:
     * this will result in visual artifacts caused by ClearType hinting.<br>
     * Use {@link GdiGraphics#DrawString DrawString} instead in such cases.<br>
     * <br>
     * To calculate text dimensions use {@link GdiGraphics#CalcTextHeight CalcTextHeight}, {@link GdiGraphics#CalcTextWidth CalcTextWidth}.<br>
     * <br>
     * Note: uses special rules for <b>&</b> character by default, which consumes the <b>&</b> and causes the next character to be underscored.
     * This behaviour can be changed (or disabled) via <b>format</b> parameter.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [format=0] See flags like {@link module:Flags.DT_LEFT DT_LEFT}
     * @worker
     */
    this.GdiDrawText = function (str, font, colour, x, y, w, h, format) { };

    /**
     * Alias of {@link GdiGraphics#GdiDrawText GdiDrawText}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} colour
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [format=0]
     * @worker
     */
    this.DrawText = function (str, font, colour, x, y, w, h, format) { };

    /**
     * Calculates text dimensions for {@link GdiGraphics#DrawString DrawString}.
     *
     * @param {string} str
     * @param {GdiFont} font
     * @param {number} x
     * @param {number} y
     * @param {number} w
     * @param {number} h
     * @param {number=} [flags=0] See {@link module:Flags.StringFormatFlags StringFormatFlags} flags
     * @return {MeasureStringInfo}
     * @worker
     */
    this.MeasureString = function (str, font, x, y, w, h, flags) { }; // (MeasureStringInfo) [, flags]

     /**
     * Pushes a rectangular clipping region onto the clip stack.<br>
     * The new clipping region is intersected with the current clipping region.<br>
     * Calls may be nested and should be paired with {@link GdiGraphics#PopClip PopClip}.<br>
     * The current transform and other graphics state are not affected.
     *
     * @param {number} x left coordinate of the clipping rectangle
     * @param {number} y top coordinate of the clipping rectangle
     * @param {number} width width of the clipping rectangle
     * @param {number} height height of the clipping rectangle
      * @worker
     */
    this.PushClip = function(x, y, width, height) { };

    /**
     * Restores the clipping region that was active before the matching {@link GdiGraphics#PushClip PushClip} call.<br>
     * Does nothing if the clip stack is empty.<br>
     * The current transform and other graphics state are not affected.
     * @worker
     */
    this.PopClip = function() { };

    /**
     * Applies translation matrix to the current {@link GdiGraphics GdiGraphics} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-translation(d2d1_size_f)}
     *
     * @param {number} dx
     * @param {number} dy
     * @worker
     */
    this.Translate = function(dx, dy) {}

    /**
     * Applies rotation matrix to the current {@link GdiGraphics GdiGraphics} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-rotation}
     *
     * @param {float} angle Angle of rotation in degrees
     * @param {number=} [cx=0] Rotation center point x coord
     * @param {number=} [cy=0] Rotation center point y coord
     * @worker
     */
    this.Rotate = function(angle, cx, cy) {}

    /**
     * Applies scale matrix to the current {@link GdiGraphics GdiGraphics} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-scale(d2d1_size_f_d2d1_point_2f)}
     *
     * @param {float} sx The x-axis scale factor
     * @param {float=} [sy=0] The y-axis scale factor. If zero sx will be used as sy
     * @param {number=} [cx=0] Scale center point x coord
     * @param {number=} [cy=0] Scale center point y coord
     * @worker
     */
    this.Scale = function(sz, sy, cx, cy) {}
    
    /**
     * Applies skew matrix to the current {@link GdiGraphics GdiGraphics} matrix.<br>
     * For more information see {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1helper/nf-d2d1helper-matrix3x2f-skew}
     *
     * @param {float} angleX The x-axis skew angle, which is measured in degrees counterclockwise from the y-axis.
     * @param {float} angleY The y-axis skew angle, which is measured in degrees clockwise from the x-axis.
     * @param {number=} [cx=0] Skew center point x coord
     * @param {number=} [cy=0] Skew center point y coord
     * @worker
     */
    this.Skew = function(angleX, angleY, cx, cy) {}

    /**
     * Saves current {@link GdiGraphics GdiGraphics} matrix in internal stack. To restore the matrix use {@link GdiGraphics#PopTransform PopTransform}.
     * @worker
     */
    this.PushTransform = function() {}

    /**
     * Restores current {@link GdiGraphics GdiGraphics} matrix from internal stack pushed previously by {@link GdiGraphics#PushTransform PushTransform}.
     * @worker
     */
    this.PopTransform = function() {}

    /**
     * Gets {@link GdiGraphics GdiGraphics} current transformation matrix of 3x2 size (Float32Array(6))
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @return {Float32Array}
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.GetTransform = function() {}

    /**
     * Replaces the current {@link GdiGraphics GdiGraphics} matrix with specified transformation matrix of 3x2 size.<br>
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.SetTransform = function(matrix) {}

    /**
     * Resets current {@link GdiGraphics GdiGraphics} matrix to original identity matrix.
     * @worker
     */
    this.ResetTransform = function () {}

    /**
     * Applies specified transformation matrix of 3x2 size to the current {@link GdiGraphics GdiGraphics} matrix.<br>
     * Matrix helpers from the component/docs/Matrix.js will be useful
     * @param {Float32Array} matrix Array that presents 3x2 matrix for transformation (length = 6)
     * 
     * @sourceFile ../../component/docs/Matrix.js
     * @worker
     */
    this.ApplyTransform = function(matrix) {}

    /**
     * @constructor
     * @hideconstructor
     *
     * @example
     * include(`${fb.ComponentPath}docs\\Flags.js`);
     * include(`${fb.ComponentPath}docs\\Helpers.js`);
     *
     * let sf = StringFormat(StringAlignment.Near, StringAlignment.Near);
     * let text = utils.ReadTextFile("z:\\info.txt");
     * let font = window.GetFontDUI(0);
     *
     * function on_paint(gr) {
     *     gr.DrawString(text, font, RGB(255, 0, 0), 0, 0, window.Width, window.Height, sf);
     *     let temp = gr.MeasureString(text, font, 0, 0, window.Width, 10000, sf);
     *     // If we want to calculate height, we must set the height to be far larger than what
     *     // the text could possibly be.
     *
     *     console.log(temp.Height); // 2761.2421875 // far larger than my panel height!
     *     console.log(temp.Chars); // 7967
     * }
     * @worker
     * @cloneable
     */
    function MeasureStringInfo() {

        /**
         * @type {number}
         * @readonly
         * @worker
         */
        this.Chars = undefined; // (uint) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Height = undefined; // (float) (read)

        /**
         * @type {number}
         * @readonly
         * @worker
         */
        this.Lines = undefined; // (uint) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.X = undefined; // (float) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Y = undefined; // (float) (read)

        /**
         * @type {float}
         * @readonly
         * @worker
         */
        this.Width = undefined; // (float) (read)
    }

    /**
     * @param {number=} [mode=0] See {@link module:Flags.InterpolationMode InterpolationMode} enum
     * @worker
     */
    this.SetInterpolationMode = function (mode) { }; // (void)

    /**
     * @param {number=} [mode=0] See {@link module:Flags.SmoothingMode SmoothingMode} enum
     * @worker
     */
    this.SetSmoothingMode = function (mode) { }; // (void)

    /**
     * @param {number=} [mode=0] See {@link module:Flags.TextRenderingHint TextRenderingHint} enum
     * @worker
     */
    this.SetTextRenderingHint = function (mode) { }; // (void)

    /**
     * Currect width of device context surface.
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = 640;
    /**
     * Currect height of device context surface.
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = 480;
}

/**
 * @constructor
 * @hideconstructor
 * @worker
 */
function GdiRawBitmap() {

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Width = undefined; // (uint) (read)

    /**
     * @type {number}
     * @readonly
     * @worker
     */
    this.Height = undefined; // (uint) (read)
}

