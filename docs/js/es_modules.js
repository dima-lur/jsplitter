/**
 * ECMAScript modules can be used as panel scripts by selecting an <b>.mjs</b> file in <b>Script → File</b>.<br>
 * A top-level <b>.mjs</b> file is compiled and evaluated as an ES module. Top-level <b>.js</b> files remain regular scripts, so existing scripts are not affected.
 *
 * <h2>Imports</h2>
 * Module scripts use standard static <b>import</b> / <b>export</b> syntax. In simple terms, <b>export</b> makes a value available to other modules and <b>import</b> brings that value into the current module.
 *
 * There are two common forms. A <b>default export</b> is imported without braces:
 *
 * ```mjs
 * // message.js
 * export default function createMessage(text) {
 *     return 'Hello, ' + text;
 * }
 *
 * // Main module
 * import createMessage from './es_modules/message.js';
 * ```
 *
 * A module may have one default export. The importing module chooses the local name, so this would also be valid:
 *
 * ```mjs
 * import makeMessage from './es_modules/message.js';
 * ```
 *
 * A <b>named export</b> is imported with braces, and its name normally has to match the exported name:
 *
 * ```mjs
 * // math.mjs
 * export function add(a, b) {
 *     return a + b;
 * }
 *
 * export function subtract(a, b) {
 *     return a - b;
 * }
 *
 * // Main module
 * import { add, subtract } from './es_modules/math.mjs';
 * ```
 *
 * Named imports can be renamed locally with <b>as</b>:
 *
 * ```mjs
 * import { add as sum } from './es_modules/math.mjs';
 * ```
 *
 * A module can contain both a default export and named exports. They can then be imported together:
 *
 * ```mjs
 * import createMessage, { helperUrl } from './es_modules/message.js';
 * ```
 *
 * For relative paths, <b>./</b> means "from the directory containing the current module", while <b>../</b> means "one directory above". For example, if <b>main.mjs</b> is in <b>scripts/</b>, then:
 *
 * ```mjs
 * import { add } from './es_modules/math.mjs';
 * ```
 *
 * resolves to <b>scripts/es_modules/math.mjs</b>. Relative imports are always resolved relative to the file containing that particular <b>import</b>, including imports inside imported modules.
 *
 * Relative module dependencies may use either <b>.js</b> or <b>.mjs</b>. An imported file is compiled as a module regardless of which of these two extensions it uses.
 *
 * Nested and cyclic dependencies are supported. A resolved module file has one module instance within the panel realm, so importing the same resolved file through different relative paths does not evaluate it as separate modules.
 *
 * <h2>Module scope and JSplitter callbacks</h2>
 * ES modules have module scope. Top-level declarations do <b>not</b> become properties of the global object.<br>
 * JSplitter panel callbacks therefore need to be explicitly published on <b>globalThis</b>:
 *
 * ```mjs
 * // This is module-local and is not a JSplitter callback:
 * function on_paint(gr) {
 * }
 *
 * // Publish the callback explicitly:
 * globalThis.on_paint = function (gr) {
 *     gr.WriteText('Hello from an ES module', font, 0xffeeeeee, 10, 10, 400, 30);
 * };
 * ```
 *
 * Ordinary module-local variables and functions should stay module-local. Only callback entry points that JSplitter needs to discover have to be assigned to <b>globalThis</b>.
 *
 * <h2>import.meta</h2>
 * <b>import.meta.url</b> is available and contains the module's <b>file://</b> URL:
 *
 * ```mjs
 * console.log(import.meta.url);
 * ```
 *
 * <h2>include()</h2>
 * {@link include include()} is not available while executing an ES module. Use static <b>import</b> statements instead.
 *
 * <h2>Error handling</h2>
 * Module loading, parsing and evaluation errors are reported through the normal JSplitter script error path. This includes a missing imported file, a syntax error in a dependency, or an exception thrown while a dependency is being evaluated.
 *
 * <h2>Current documented scope</h2>
 * The documented ES-module feature covers <b>.mjs</b> panel File scripts and local static imports. Dynamic <b>import()</b>, import maps, network modules and bare/package module specifiers are not part of the documented public contract.
 *
 * @module ESModules
 * @sourceFile ../../component/samples/basic/ES Modules.mjs
 */
