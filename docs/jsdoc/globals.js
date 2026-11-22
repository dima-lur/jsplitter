/**
 * @typedef {number} float
 */

/**
 * Evaluates JavaScript from a file in the current panel or Worker realm.<br>
 * Evaluates the text loaded by {@link utils.ReadTextFile} and provides additional features:<br>
 * - Has <b>include guards</b> - a file is evaluated only once per realm unless <b>always_evaluate</b> is used.<br>
 * - Panel-side includes also use compiled-script caching; Worker includes keep their own per-Worker include guard.<br>
 * - Has better error reporting.<br>
 * <br>
 * Relative filesystem paths are resolved as described in {@link utils.ReadTextFile}. The currently executing script file is tried first when available.<br>
 * For a file-backed Worker, this makes its own directory the natural root for nested relative {@link include} calls.<br>
 * Configured panel/package script roots are then considered where applicable.<br>
 * {@link fb.ComponentPath} is the final fallback.
 * @worker
 * @param {string} path Absolute or relative path to JavaScript file.
 * @param {object=} [options=undefined]
 * @param {boolean=} [options.always_evaluate=false] If true, evaluates the script even if it was included before.
 *
 * @example <caption>Include some JS file</caption>
 * include('samples/complete/properties.js')
 */
function include(path, options) { }

/**
 *
 * @param {number} timerID
 * @worker
 */
function clearTimeout(timerID) { } // (void)

/**
 *
 * @param {number} timerID
 * @worker
 */
function clearInterval(timerID) { } // (void)

/**
 *
 * @param {function()} func
 * @param {number} delay
 * @param {...*} func_args
 * @return {number}
 * @worker
 */
function setInterval(func, delay, ...func_args) { } // (uint)

/**
 * 
 * @sourceFile ../../component/samples/basic/Timer.js
 * 
 * @param {function()} func
 * @param {number} delay
 * @param {...*} func_args
 * @return {number}
 * 
 * @worker
 */
function setTimeout(func, delay, ...func_args) { } // (uint)

/**
 * Standard JavaScript error object thrown by JSplitter API methods.
 * Catch it with a regular JavaScript <b>try...catch</b> statement.
 *
 * @typedef {Object} Error
 * @property {string} name Error type name.
 * @property {string} message Human-readable error message.
 * @property {string=} stack JavaScript stack trace when available.
 */
