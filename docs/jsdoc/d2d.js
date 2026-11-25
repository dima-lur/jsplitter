/**
 * Functions for working with Direct2D graphics.
 * <div class="doc-note warning"><b>Direct2D 1.1 or later is required.</b><br>
 * Minimum OS requirements: Windows 8+ or Windows 7 Service Pack 1 with the Platform Update for Windows 7 installed.<br></div>
 *
 * @namespace
 * @worker
 */
let d2d = {

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
     * - param1: {@link D2DBitmap D2DBitmap} object used for drawing by brush<br>
     * - param2: wrap mode responsible for how the image is repeated when drawing. See {@link module:Flags.BrushWrapMode BrushWrapMode}
     * 
     * @param {BrushType} type
     * @param {*} param1
     * @param {*=} [param2=undefined]
     * @param {*=} [param3=undefined]
     * @param {*=} [param4=undefined]
     * @return {D2DBrush} Brush object used in Draw/Fill methods
     * 
     * @throws {Error} If the Direct2D host is unavailable, Direct2D resources have not been initialized, or the brush parameters are invalid.
     * @sourceFile ../../component/samples/basic/Brushes.js
     * @worker
     */
    Brush: function (type, param1, param2, param3, param4) { }, // (D2DBrush)

    /**
     * Creates a reusable Direct2D stroke style for line and outline drawing.<br>
     * The style controls start/end/dash caps, line joins, miter limit, dash pattern and dash offset.<br>
     * Performance note: create commonly used styles once and reuse them from {@link module:Callbacks.on_paint on_paint}.<br><div class="doc-note"><b>Dotted strokes:</b> when <b>dashCap</b> is omitted, {@link DashStyle.Dot DashStyle.Dot}, {@link DashStyle.DashDot DashStyle.DashDot} and {@link DashStyle.DashDotDot DashStyle.DashDotDot} automatically use {@link CapStyle.Round CapStyle.Round}. Setting <b>dashStyle</b> to {@link DashStyle.Dot DashStyle.Dot} in {@link d2d.StrokeStyle StrokeStyle} therefore matches the {@link DashStyle.Dot DashStyle.Dot} drawing-method shorthand. An explicitly supplied <b>dashCap</b> is preserved, including {@link CapStyle.Flat CapStyle.Flat}. See {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1/ne-d2d1-d2d1_dash_style Microsoft: D2D1_DASH_STYLE} and {@link https://learn.microsoft.com/en-us/windows/win32/api/d2d1/ne-d2d1-d2d1_cap_style Microsoft: D2D1_CAP_STYLE}.</div>
     *
     * @param {D2DStrokeStyleOptions=} [options={}] Stroke appearance options. Omitted properties use the defaults documented by {@link D2DStrokeStyleOptions D2DStrokeStyleOptions}.
     * @return {D2DStrokeStyle}
     * @throws {Error} If the Direct2D host is unavailable, Direct2D resources have not been initialized, or the stroke-style options are invalid.
     * @sourceFile ../../component/samples/d2d/StrokeStyle.js
     * @worker
     */
    StrokeStyle: function (options) { },

    /**
     * @param {number} w
     * @param {number} h
     * @return {D2DBitmap}
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @worker
     */
    CreateImage: function (w, h) { }, // (D2DBitmap)

    /**
     * Create {@link D2DBitmap D2DBitmap} from raw pixel data in memory.
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
     * @returns {D2DBitmap} null if was an error (for example pixelData array length is not suitable for the specified parameters)
     * 
     * @throws {Error} If the Direct2D host is unavailable, Direct2D resources have not been initialized, or <b>data</b> is not a non-empty <b>Uint8Array</b>.
     * @sourceFile ../../component/samples/basic/CreateImageFromPixelData.js
     * @worker
     */
    CreateImageFromPixelData: function(pixelData, width, height, format = "bgra32") { }, // (D2DBitmap)

    /**
     * Performance note: avoid using inside {@link module:Callbacks.on_paint on_paint}.<br>
     * Performance note II: try caching and reusing {@link D2DFont} objects,
     * since the maximum amount of such objects is hard-limited by Windows.
     * {@link D2DFont} creation will fail after reaching this limit.
     *
     * @param {string} name
     * @param {number} size_px See {@link module:Helpers.Point2Pixel Point2Pixel} function for conversions
     * @param {number=} [style=0] See {@link module:Flags.FontStyle FontStyle} flags
     * @return {?D2DFont} null, if font is not present.
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @worker
     */
    Font: function (name, size_px, style) { }, // (D2DFont) [, style]

    /**
     * Load image from file.<br>
     * <br>
     * Performance note: consider using {@link d2d.LoadImageAsync LoadImageAsync} or {@link d2d.LoadImageAsyncV2 LoadImageAsyncV2} if there are a lot of images to load
     * or if the image is big.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {string} path
     * @return {?D2DBitmap} null, if image failed to load.
     *
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @example
     * let img = d2d.Image('e:\\images folder\\my_image.png');
     * @worker
     */
    Image: function (path) { }, // (D2DBitmap)

    /**
     * Load image from file asynchronously.
     *
     * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}.
     *
     * @param {number} window_id unused
     * @param {string} path
     * @return {number} a unique id, which is used in {@link module:Callbacks.on_load_image_done on_load_image_done}.
     *
     * @throws {Error} If the panel host is unavailable, Direct2D resources have not been initialized, or foobar2000 is not fully initialized.
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
     * @return {Promise.<?D2DBitmap>}
     *
     * @throws {Error} If the panel host is unavailable, Direct2D resources have not been initialized, or foobar2000 is not fully initialized.
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
     * @return {?D2DBitmap} Rasterized bitmap, null in case of error
     * 
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @example
     * const svg_file = fb.ComponentPath + 'samples\\svg\\android.svg';
     * 
     * const original = d2d.LoadSVG(svg_file);
     * const large = d2d.LoadSVG(svg_file, 512); // set optional max_width
     * 
     * function on_paint(gr) {
     *     gr.DrawImage(original, 0, 0, original.Width, original.Height, 0, 0, original.Width, original.Height);
     *     gr.DrawImage(large, original.Width, 0, large.Width, large.Height, 0, 0, large.Width, large.Height);
     * }
     * @worker
     */
    LoadSVG: function (path_or_xml, max_width) { },

    /**
     * Creates Direct2D effect.<br>
     * @param {string} CLSID CLSID of Direct2D effect. See {@link module:Effects Effects} for effects' CLSID.
     * @return {D2DEffect}
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @worker
     */
    Effect: function (CLSID) { },

    /**
     * Compiles a Direct2D HLSL shader <b>synchronously</b>. The call blocks
     * its JavaScript thread until compilation completes; for complex shaders
     * or collections of presets, prefer {@link d2d.CompileAsync CompileAsync}. Both methods
     * use the same native HLSL compiler and result format. They compile on every call and do not
     * use the automatic shader cache exposed by {@link vis.ShaderCacheStats}.
     * @param {string} source Shader source code (ASCII HLSL code)
     * @param {string} [entryPoint="main"] The name of the shader entry point function where shader execution begins.<br>
     * @param {string} [target="ps_4_0"] A string that specifies the shader target or set of shader features to compile against.<br>
     * The shader target can be shader model 2, shader model 3, shader model 4, or shader model 5.<br>
     * For full target list see {@link https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/specifying-compiler-targets}<br>
     * Default value: "ps_4_0".
     * @param {D2DCompileFlags} [flags=0x8008] Affects compiler flags. {@link module:Flags.D2DCompileFlags D2DCompileFlags}<br>
     * For flags values see: {@link https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/d3dcompile-constants}<br>
     * <b>Default value</b>: D3DCOMPILE_OPTIMIZATION_LEVEL3 | D3DCOMPILE_PACK_MATRIX_ROW_MAJOR<br>
     * <b>Example for debug build</b>: D3DCOMPILE_DEBUG | D3DCOMPILE_SKIP_OPTIMIZATION | D3DCOMPILE_ALL_RESOURCES_BOUND | D3DCOMPILE_PACK_MATRIX_ROW_MAJOR
     * @return {D2DCompileInfo} Result of compiling shader source. HLSL compiler failures return a nonempty {@link D2DCompileInfo#Error D2DCompileInfo.Error} field; inspect it before using {@link D2DCompileInfo#Code D2DCompileInfo.Code}.
     * @throws {Error} If the Direct2D host is unavailable or Direct2D resources have not been initialized.
     * @see d2d.CompileAsync
     * @example
     * include(`${fb.ComponentPath}\\docs\\Effects.js`);
     * 
     * window.DrawMode = 1;
     * 
     * // Simple colour inversion shader
     * const shaderSource = `
     *     // Input texture (Direct2D passed it into t0)
     *     Texture2D InputTexture : register(t0);
     *     SamplerState InputSampler : register(s0);
     * 
     *     // Direct2D input data structure
     *     struct VS_OUTPUT {
     *         float4 clipSpacePos : SV_POSITION;
     *         float4 sceneSpacePos : SCENE_POS;
     *         float4 texelSpacePos : TEXEL_POS;
     *     };
     * 
     *     // Simple color inversion shader
     *     float4 main(VS_OUTPUT input) : SV_Target
     *     {
     *         // Selecting a pixel from an input image
     *         float4 color = InputTexture.Sample(InputSampler, input.texelSpacePos.xy);
     * 	
     *         // Invert RGB, keep alpha
     *         return float4((1.0 - color.rgb) * color.a, color.a);
     *     }
     * `;
     * 
     * const img = d2d.Image(`${fb.ComponentPath}\\samples\\d2d\\images\\Flowers.jpg`);
     * const effect = d2d.Effect(Effects.CustomShader.ID);
     * effect.SetInput(0, img);
     * 
     * const shaderCode = d2d.Compile(shaderSource);
     * if (shaderCode.Error !== "") 
     *     fb.ShowPopupMessage(shaderCode.Error, "Direct2D compile error!");
     * else
     *     effect.SetValue(Effects.CustomShader.ShaderCode, shaderCode.Code);
     * 
     * function on_paint(dgr) {	
     *     dgr.DrawEffect(effect, 10, 10, 0, 0, img.Width, img.Height);
     * }
     * @worker
     */
    Compile: function (source, entryPoint, target, flags) { },

    /**
     * Compiles HLSL <b>asynchronously</b> on JSplitter's shared background
     * thread pool, without blocking the panel or Worker JavaScript thread.
     * Arguments and defaults are identical to {@link d2d.Compile Compile}.
     * Returns a Promise resolving to {@link D2DCompileInfo} with a
     * <b>Uint8Array Code</b> and <b>string Error</b>.
     * An HLSL compilation error <b>resolves</b> with a nonempty {@link D2DCompileInfo#Error D2DCompileInfo.Error},
     * just like synchronous Compile(); setup or task failures <b>reject</b>
     * the Promise. This differs from {@link vis.CreateAsync}, whose shader
     * compilation failures reject its Promise.
     *
     * The produced DXBC can be reused in {@link vis.CreateAsync} or in a
     * Direct2D CustomShader effect. Explicit {@link d2d.CompileAsync CompileAsync} calls compile
     * on every call and do not use the automatic shader cache exposed by
     * {@link vis.ShaderCacheStats}; that cache is for {@link vis.CreateAsync CreateAsync} HLSL stages.
     * The method also works inside a Worker when Direct2D is available there.
     * @param {string} source Shader source code (ASCII HLSL code).
     * @param {string} [entryPoint="main"] HLSL entry point.
     * @param {string} [target="ps_4_0"] Compiler target/profile. See {@link https://learn.microsoft.com/en-us/windows/win32/direct3dhlsl/specifying-compiler-targets}.
     * @param {D2DCompileFlags} [flags=0x8008] D3DCompile flags, as for {@link d2d.Compile Compile}. See {@link module:Flags.D2DCompileFlags D2DCompileFlags}.
     * @returns {Promise<D2DCompileInfo>} Promise resolving to compiled bytecode or a compiler error.
     * @see d2d.Compile
     * @see vis.CreateAsync
     * @example
     * // HLSL stored in shaderSource; safe to run while the panel paints.
     * async function prepareShader() {
     *     const compiled = await d2d.CompileAsync(shaderSource);
     *     if (compiled.Error) throw new Error(compiled.Error);
     *     return compiled.Code; // Uint8Array: can be reused by CreateAsync().
     * }
     * @worker
     */
    CompileAsync: function (source, entryPoint, target, flags) { },
};

