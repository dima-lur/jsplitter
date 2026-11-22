/**
 * Controls the main foobar2000 application window.
 * 
 * <b>Global state:</b> every JSplitter panel accesses the same native foobar2000 window through {@link fb.Window}.
 * Window geometry {@link FbWindow#X X}, {@link FbWindow#Y Y}, {@link FbWindow#Width Width}, {@link FbWindow#Height Height}, the numeric {@link FbWindow#MinWidth MinWidth}, {@link FbWindow#MinHeight MinHeight}, {@link FbWindow#MaxWidth MaxWidth}, {@link FbWindow#MaxHeight MaxHeight} are global host state.
 * These numeric values are not automatically restored when a panel reloads or unloads.
 * 
 * Window UI settings such as {@link FbWindow#FrameStyle FrameStyle},
 * {@link FbWindow#Fullscreen Fullscreen},
 * {@link FbWindow#MainMenuHidden MainMenuHidden},
 * {@link FbWindow#StatusBarHidden StatusBarHidden},
 * {@link FbWindow#MinSize MinSize},
 * {@link FbWindow#MaxSize MaxSize}, pseudo-caption settings defined by {@link FbWindow#SetPseudoCaption SetPseudoCaption}, and the custom maximize-button area defined by {@link FbWindow#SetMaximizeButtonArea SetMaximizeButtonArea} are tracked per panel. The most recent explicit assignment made by any live panel becomes the effective global value.
 * When that panel reloads or unloads, its request is removed and the previous request from another
 * live panel, if any, becomes effective again.
 *
 * If no panel has a request, {@link FbWindow#FrameStyle FrameStyle} defaults to
 * {@link module:Flags.FrameStyle FrameStyle.Default}, and the boolean settings default to <b>false</b>.
 * 
 * So getters return the effective global value, not the last value assigned by the current panel.
 *
 * If both minimum and maximum limits are enabled for the same axis, keep the nonzero minimum less than or equal to the nonzero maximum. Contradictory limits are not a supported configuration.
 * <div class="doc-note warning">
 * <b>WARNING!</b><br>
 * Most methods described here, except for basic window positioning and resizing, are incompatible with plugins that provide similar functionality, such as
 * {@link https://github.com/The-Wizardium/UI-Wizard foo_ui_wizard},
 * {@link https://github.com/ttsping/foo_openhacks foo_openhacks}, or
 * {@link https://foobar2000.club/forum/viewtopic.php?t=1911 foo_ui_hacks}.
 *
 * If you intend to use these methods, uninstall such components first. Running them together may cause conflicting behavior and is not a supported configuration.
 * </div>
 * <b>Interactive sample:</b> <b>samples/basic/FbWindow.js</b> demonstrates frame styles, custom minimize/maximize/close buttons, Windows 11 Snap Layouts, pseudo-caption dragging, fullscreen, window geometry, size limits, and DUI-only menu/status-bar visibility.
 *
 * @hideconstructor
 * @sourceFile ../../component/samples/basic/FbWindow.js
 *
 * @example <caption>Borderless window with size limits</caption>
 * fb.Window.MinWidth = 500;
 * fb.Window.MinHeight = 300;
 * fb.Window.MinSize = true;
 *
 * fb.Window.MaxWidth = 1600;
 * fb.Window.MaxHeight = 1000;
 * fb.Window.MaxSize = true;
 *
 * fb.Window.FrameStyle = FrameStyle.NoBorder;
 *
 * @example <caption>Window mode state is shared between panels</caption>
 * // Panel A:
 * fb.Window.FrameStyle = FrameStyle.NoBorder;
 *
 * // Panel B, executed later:
 * fb.Window.FrameStyle = FrameStyle.Default;
 * // FrameStyle.Default is now effective globally. If Panel B unloads or reloads without this line (e.g. commented),
 * // Panel A's still-live FrameStyle.NoBorder request becomes effective again.
 */
function FbWindow() {
    /**
     * X coordinate of the outer main-window rectangle in screen coordinates.
     *
     * Sample buttons: <b>Move -40</b> / <b>Move +40</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.X = 0;

    /**
     * Y coordinate of the outer main-window rectangle in screen coordinates.
     *
     * Sample display: window position in the bottom status line.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.Y = 0;

    /**
     * Width of the outer main-window rectangle, including the non-client frame when present.
     *
     * Sample display: window size in the bottom status line.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.Width = 0;

    /**
     * Height of the outer main-window rectangle, including the non-client frame when present.
     *
     * Sample display: window size in the bottom status line.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.Height = 0;

    /**
     * Controls the native frame style of the main window.
     * <br><br>
     * Use {@link module:Flags.FrameStyle FrameStyle}:
     * <ul>
     * <li>{@link module:Flags.FrameStyle FrameStyle.Default} - use the normal foobar2000 window frame.</li>
     * <li>{@link module:Flags.FrameStyle FrameStyle.NoCaption} - remove the caption while keeping the native resizable frame. Windows continues to handle resizing, including the thin top resize grip.</li>
     * <li>{@link module:Flags.FrameStyle FrameStyle.NoBorder} - remove both the caption and resizable frame. JSplitter restores edge/corner resizing itself.</li>
     * </ul>
     * In <b>No border</b> mode with Default User Interface, a visible native status bar owns its bottom-right size grip. That grip may interfere with resizing from the bottom-right corner; hiding the status bar avoids this limitation.
     *
     * Sample buttons: <b>Default</b>, <b>NoCaption</b>, <b>NoBorder</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {FrameStyle}
     * @throws {Error} If the value is not a valid {@link module:Flags.FrameStyle FrameStyle} value.
     */
    this.FrameStyle = FrameStyle.Default;

    /**
     * Enables fullscreen mode on the monitor containing the main window. The window covers the full monitor area, including the taskbar.
     * 
     * The previous window placement is restored when fullscreen is disabled, then the current effective {@link FbWindow#FrameStyle FrameStyle} is reapplied.
     * Minimum and maximum size limits do not clamp the window while fullscreen is active.
     * 
     * If fullscreen is changed while a modal JSplitter/foobar2000 dialog is open, the native transition is deferred until the modal dialog closes. The property still reports the current effective requested state during that time.
     * 
     * Sample button: <b>Fullscreen</b> / <b>Exit fullscreen</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     */
    this.Fullscreen = false;

    /**
     * Hides the foobar2000 main menu bar.
     * <br><br>
     * Available only with Default User Interface (DUI). Reading or writing this property with Columns UI throws an error.
     *
     * Sample button: <b>Hide menu</b> / <b>Show menu</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     * @throws {Error} When Columns UI is active.
     */
    this.MainMenuHidden = false;

    /**
     * Hides the foobar2000 status bar.
     * <br><br>
     * Available only with Default User Interface (DUI). Reading or writing this property with Columns UI throws an error.
     *
     * Sample button: <b>Hide status bar</b> / <b>Show status bar</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     * @throws {Error} When Columns UI is active.
     */
    this.StatusBarHidden = false;

    /**
     * Enables the minimum main-window size defined by {@link FbWindow#MinWidth MinWidth} and {@link FbWindow#MinHeight MinHeight}.
     * Setting this property to <b>true</b> immediately clamps the current window size when needed. Changing an active minimum width or height also clamps the current size immediately.
     * A limit value of 0 means that the corresponding axis is not constrained.
     *
     * Sample buttons: <b>Min 550x360</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     */
    this.MinSize = false;

    /**
     * Minimum width of the outer main-window rectangle when {@link FbWindow#MinSize MinSize} is enabled.
     * A value of 0 disables the minimum-width constraint while leaving the minimum-height constraint independent.
     *
     * Sample buttons: <b>Min 550x360</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.MinWidth = 0;

    /**
     * Minimum height of the outer main-window rectangle when {@link FbWindow#MinSize MinSize} is enabled.
     * A value of <b>0</b> disables the minimum-height constraint while leaving the minimum-width constraint independent.
     *
     * Sample buttons: <b>Min 550x360</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.MinHeight = 0;

    /**
     * Enables the maximum main-window size defined by {@link FbWindow#MaxWidth MaxWidth} and {@link FbWindow#MaxHeight MaxHeight}.
     * Setting this property to <b>true</b> immediately clamps the current window size when needed. Changing an active maximum width or height also clamps the current size immediately.
     * A limit value of <b>0</b> means that the corresponding axis is not constrained.
     *
     * Sample buttons: <b>Max 1400x800</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     */
    this.MaxSize = false;

    /**
     * Maximum width of the outer main-window rectangle when {@link FbWindow#MaxSize MaxSize} is enabled.
     * A value of <b>0</b> disables the maximum-width constraint while leaving the maximum-height constraint independent.
     *
     * Sample buttons: <b>Max 1400x800</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.MaxWidth = 0;

    /**
     * Maximum height of the outer main-window rectangle when {@link FbWindow#MaxSize MaxSize} is enabled.
     * A value of <b>0</b> disables the maximum-height constraint while leaving the maximum-width constraint independent.
     *
     * Sample buttons: <b>Max 1400x800</b> and <b>Clear limits</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {number}
     */
    this.MaxHeight = 0;

    /**
     * Moves and resizes the main foobar2000 window in one operation.
     * The arguments describe the outer window rectangle in screen coordinates.
     *
     * Sample buttons: <b>Move -40</b> / <b>Move +40</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @param {number} x X coordinate in screen coordinates.
     * @param {number} y Y coordinate in screen coordinates.
     * @param {number} width Outer window width.
     * @param {number} height Outer window height.
     */
    this.Move = function (x, y, width, height) { };

    /**
     * <b>true</b> when the main foobar2000 window is currently minimized.
     *
     * This property is read-only and reports the actual native window state.
     *
     * Sample button: <b>Min</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     * @readonly
     */
    this.IsMinimized = false;

    /**
     * <b>true</b> when the main foobar2000 window is currently maximized.
     *
     * This property is read-only and reports the actual native window state.
     *
     * Sample button: <b>Max</b> / <b>Restore</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @type {boolean}
     * @readonly
     */
    this.IsMaximized = false;

    /**
     * Minimizes the main foobar2000 window using the normal native Windows system command.
     *
     * The command is posted asynchronously, so {@link FbWindow#IsMinimized IsMinimized} may change after the current JavaScript callback returns.
     *
     * Sample button: <b>Min</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @example
     * fb.Window.Minimize();
     */
    this.Minimize = function () { };

    /**
     * Maximizes the main foobar2000 window using the normal native Windows system command.
     *
     * The command is posted asynchronously, so {@link FbWindow#IsMaximized IsMaximized} may change after the current JavaScript callback returns.
     *
     * Sample button: <b>Max</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @example
     * if (!fb.Window.IsMaximized) {
     *     fb.Window.Maximize();
     * }
     */
    this.Maximize = function () { };

    /**
     * Restores the main foobar2000 window from a minimized or maximized state to its normal state using the native Windows system command.
     *
     * The command is posted asynchronously.
     *
     * Sample button: <b>Restore</b> (the <b>Max</b> button when maximized).
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @example
     * if (fb.Window.IsMinimized || fb.Window.IsMaximized) {
     *     fb.Window.Restore();
     * }
     */
    this.Restore = function () { };

    /**
     * Requests the main foobar2000 window to close using the normal native Windows system command.
     * This follows the same close path as closing the application window normally, rather than terminating the process directly.
     *
     * The command is posted asynchronously.
      *
     * Sample button: <b>Close</b>.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
    */
    this.Close = function () { };

    /**
     * Starts the native Windows move operation for the main foobar2000 window, as if the user had started dragging its caption.
     * This is useful when the script needs to decide dynamically whether a mouse action should start moving the window. For a fixed draggable area use {@link FbWindow#SetPseudoCaption SetPseudoCaption}.
     * The move loop is started asynchronously, so the JavaScript callback is not kept running for the duration of the drag.
     *
     * Sample action: drag the painted header above the controls.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @example
     * function on_mouse_lbtn_down(x, y) {
     *     if (y < 30) {
     *         fb.Window.MoveStart();
     *     }
     * }
     */
    this.MoveStart = function () { };

    /**
     * Defines a rectangular pseudo-caption area for the main foobar2000 window. Pressing the left mouse button inside this area starts the native Windows move operation, including when the pointer is over a child window such as a JSplitter panel.
     * This provides a persistent alternative to calling {@link FbWindow#MoveStart MoveStart} from a mouse callback and is especially useful with {@link FbWindow#FrameStyle FrameStyle} set to {@link module:Flags.FrameStyle FrameStyle.NoCaption} or {@link module:Flags.FrameStyle FrameStyle.NoBorder}.
     *
     * The coordinates are pixel offsets from the top-left corner of the outer main-window rectangle. The rectangle, activation request, and <b>maximize_on_dblclk</b> option belong to the current panel. The most recent explicit request made by any live panel becomes effective globally. Calling this method again replaces that panel's rectangle and option and enables its request. When the panel reloads or unloads, its request and settings are removed; the previous live panel's request becomes effective again with its own rectangle and option.
     *
     * With <b>maximize_on_dblclk</b> set to <b>true</b>, a left-button double-click inside the area automatically maximizes a normal window or restores a maximized window, using the same native commands as {@link FbWindow#Maximize Maximize} and {@link FbWindow#Restore Restore}. The handled double-click is consumed and is not delivered to the underlying panel's {@link module:Callbacks.on_mouse_lbtn_dblclk on_mouse_lbtn_dblclk} callback. The default is <b>false</b>, which preserves script-defined double-click handling.
     *
     * With {@link module:Flags.FrameStyle FrameStyle.NoBorder}, resize edges take precedence over both dragging and automatic double-click handling. Dragging is inactive while the main window is fullscreen or maximized. Automatic maximize/restore is inactive in fullscreen mode. A left click used to start dragging is consumed, so interactive controls should not be placed inside the rectangle.
     *
     * To disable the current panel's request, use {@link FbWindow#ClearPseudoCaption ClearPseudoCaption}.
     *
     * Sample button: <b>Window drag zone</b> (OFF / ON).
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @param {number} x Horizontal offset from the left edge of the outer main-window rectangle.
     * @param {number} y Vertical offset from the top edge of the outer main-window rectangle.
     * @param {number} width Width of the pseudo-caption rectangle. Must be greater than 0.
     * @param {number} height Height of the pseudo-caption rectangle. Must be greater than 0.
     * @param {boolean=} [maximize_on_dblclk=false] Enable automatic maximize/restore on a left-button double-click inside the area.
     * @throws {Error} If <b>width</b> or <b>height</b> is not greater than 0.
     *
     * @example
     * fb.Window.FrameStyle = FrameStyle.NoBorder;
     * fb.Window.SetPseudoCaption(8, 8, 400, 32, true);
     */
    this.SetPseudoCaption = function (x, y, width, height, maximize_on_dblclk) { };

    /**
     * Disables the current panel's pseudo-caption request previously enabled by {@link FbWindow#SetPseudoCaption SetPseudoCaption}. The most recent explicit request now disables the effective global pseudo-caption. Calling {@link FbWindow#SetPseudoCaption SetPseudoCaption} enables it again.
     * The request and its stored settings are removed automatically when the panel reloads or unloads. The previous live panel's request, if any, then becomes effective again with its own rectangle and double-click option.
      *
     * Sample button: <b>Window drag zone: ON</b> (switches it off).
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
    */
    this.ClearPseudoCaption = function () { };

    /**
     * Registers a rectangular hit-test area for a script-drawn maximize/restore button. On <b>Windows 11</b>, hovering over this area can open the native <b>Snap Layouts</b> menu in {@link module:Flags.FrameStyle FrameStyle.NoCaption} and {@link module:Flags.FrameStyle FrameStyle.NoBorder} modes.
     *
     * The coordinates are pixels relative to the <b>current JSplitter panel's client area</b>, unlike the outer-window coordinates used by {@link FbWindow#SetPseudoCaption SetPseudoCaption}. The active area follows the panel when CUI/DUI changes its position and is suspended while the panel or a parent container is hidden. If the button moves inside the panel (for example, after a layout change in {@link module:Callbacks.on_size on_size}), call this method again with its new rectangle.
     *
     * This method only registers the area: it does <b>not</b> draw the button or maximize/restore the window. Draw the button in the script and handle its click with {@link module:Callbacks.on_mouse_lbtn_up on_mouse_lbtn_up}, calling {@link FbWindow#Maximize Maximize} or {@link FbWindow#Restore Restore} as appropriate. Mouse callbacks continue to work over the registered area.
     *
     * In {@link module:Flags.FrameStyle FrameStyle.Default}, the normal Windows caption buttons are preserved; the script-drawn button can still handle clicks, but does not provide Snap Layouts. On Windows 10 and earlier, the method can be called, but no Snap Layouts overlay is created. The overlay is also inactive while the main window is fullscreen.
     *
     * The rectangle and enabled state belong to the current panel. Calling this method again updates its rectangle and makes its request the most recent. The most recent explicit request from any live panel controls the shared main window. {@link FbWindow#ClearMaximizeButtonArea ClearMaximizeButtonArea} is also an explicit request and disables the effective area even when another panel previously registered one. When a panel reloads or unloads, its request is removed and the previous live panel's request, if any, becomes effective again.
     * 
     * Sample button: <b>Snap area</b> (OFF / ON); hover over <b>Max</b> to test Snap Layouts.
     *
     * @param {number} x Left edge of the rectangle in current-panel client coordinates.
     * @param {number} y Top edge of the rectangle in current-panel client coordinates.
     * @param {number} width Width of the rectangle. Must be greater than 0.
     * @param {number} height Height of the rectangle. Must be greater than 0.
     * @throws {Error} If <b>width</b> or <b>height</b> is not greater than 0.
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
     *
     * @example <caption>Register the rectangle of a script-drawn maximize button</caption>
     * // The button must also be drawn and handled by the script.
     * fb.Window.SetMaximizeButtonArea(100, 8, 72, 30);
     */
    this.SetMaximizeButtonArea = function (x, y, width, height) { };

    /**
     * Disables the current panel's maximize-button area previously registered by {@link FbWindow#SetMaximizeButtonArea SetMaximizeButtonArea}. This is an explicit global disable request, so another panel's earlier registration does not become active just because this method was called. Call {@link FbWindow#SetMaximizeButtonArea SetMaximizeButtonArea} to enable the area again.
     *
     * When the current panel reloads or unloads, its request and stored rectangle are removed. The previous live panel's request, if any, then becomes effective again.
      *
     * Sample button: <b>Snap area: ON</b> (switches it off).
     *
     * @sourceFile ../../component/samples/basic/FbWindow.js
    */
    this.ClearMaximizeButtonArea = function () { };
}

