/**
 * Performance timeline entry created by {@link performance.mark performance.mark} or {@link performance.measure performance.measure}.
 * @typedef {Object} PerformanceEntry
 *
 * @property {string} entryType
 * Entry type. JSplitter currently supports "mark" and "measure".
 * @property {string} name
 * User-defined entry name.
 * @property {number} startTime
 * Start timestamp in milliseconds relative to {@link performance.timeOrigin}.
 * @property {number} duration
 * Entry duration in milliseconds. Always 0 for marks; for measures it is <code>endTime - startTime</code> and may be negative.
 * @property {*} detail
 * Optional metadata associated with the entry. Defaults to null.<br>
 * <b>JSplitter note:</b> unlike the Web User Timing specification, <code>detail</code> is currently retained as the original JavaScript value and is not structured-cloned.
 */

/**
 * Options accepted by {@link performance.mark performance.mark}.
 * @typedef {Object} PerformanceMarkOptions
 *
 * @property {*} [detail=null]
 * Arbitrary metadata associated with the mark.<br>
 * <b>JSplitter note:</b> the value is not structured-cloned.
 * @property {number} [startTime]
 * Finite non-negative timestamp in milliseconds relative to {@link performance.timeOrigin}. Defaults to {@link performance.now performance.now}.
 */

/**
 * Options accepted by the standard options form of {@link performance.measure performance.measure}.
 * @typedef {Object} PerformanceMeasureOptions
 *
 * @property {*} [detail=null]
 * Arbitrary metadata associated with the measure.<br>
 * <b>JSplitter note:</b> the value is not structured-cloned.
 * @property {(string|number)} [start]
 * Start mark name or finite non-negative timestamp in milliseconds.
 * @property {number} [duration]
 * Finite non-negative duration in milliseconds. May be used together with <code>start</code> or <code>end</code>, but not together with both.
 * @property {(string|number)} [end]
 * End mark name or finite non-negative timestamp in milliseconds.
 */

/**
 * Options accepted by {@link PerformanceObserver.observe PerformanceObserver.observe}.
 * @typedef {Object} PerformanceObserverOptions
 *
 * @property {Array<string>} [entryTypes]
 * Entry types to observe. Unsupported types are ignored. Use either <code>entryTypes</code> or <code>type</code> for an observer, not both.
 * @property {string} [type]
 * A single entry type to observe. Unsupported types are ignored. Use either <code>type</code> or <code>entryTypes</code> for an observer, not both.
 */

/**
 * List of performance entries delivered to a {@link PerformanceObserver PerformanceObserver} callback.<br>
 * The entries in this list are ordered by {@link PerformanceEntry.startTime startTime}.
 * @constructor
 * @hideconstructor
 */
function PerformanceObserverEntryList() {

    /**
     * Returns all entries in this callback's entry list, ordered by {@link PerformanceEntry.startTime startTime}.
     * @return {Array<PerformanceEntry>}
     */
    this.getEntries = function () { };

    /**
     * Returns entries in this callback's entry list filtered by entry type and ordered by {@link PerformanceEntry.startTime startTime}.
     * @param {string} type Entry type, for example "mark" or "measure".
     * @return {Array<PerformanceEntry>}
     */
    this.getEntriesByType = function (type) { };

    /**
     * Returns entries in this callback's entry list filtered by name and, optionally, entry type. Results are ordered by {@link PerformanceEntry.startTime startTime}.
     * @param {string} name Entry name.
     * @param {string} [type] Optional entry type, for example "mark" or "measure".
     * @return {Array<PerformanceEntry>}
     */
    this.getEntriesByName = function (name, type) { };
}

/**
 * Creates a new observer for entries added to the JSplitter performance timeline.<br>
 *
 * The callback is invoked asynchronously when {@link performance.mark performance.mark} or {@link performance.measure performance.measure} records an entry whose type is currently observed. Entries created in the same event-loop burst may be delivered together in one callback.<br>
 * JSplitter currently supports only the "mark" and "measure" entry types. The Web Performance Timeline <code>buffered</code> option is not implemented.
 * @sourceFile ../../component/samples/basic/Performance.js
 * @constructor
 * @param {function} callback Callback receiving <code>(list, observer)</code>, where <code>list</code> is a {@link PerformanceObserverEntryList}.
 */
function PerformanceObserver(callback) {
    /**
     * JSplitter compatibility alias for the standard static {@link PerformanceObserver.supportedEntryTypes PerformanceObserver.supportedEntryTypes} property.<br>
     * Returns the same frozen array object as the static property.
     * @type {Array<string>}
     * @readonly
     */
    this.supportedEntryTypes = PerformanceObserver.supportedEntryTypes;

    /**
     * Registers performance entry types to observe.<br>
     *
     * Use either <code>entryTypes</code> or <code>type</code> for a given observer until {@link PerformanceObserver.disconnect disconnect} is called. Switching between the two modes throws an error.<br>
     * Repeated calls using the same mode add supported types to the observer's current set. Unsupported entry types are ignored.<br>
     * JSplitter currently supports only <code>entryTypes</code> and <code>type</code>; the Web Performance Timeline <code>buffered</code> option is not implemented.
     * @method
     * @param {PerformanceObserverOptions} options Observer options.
     * @throws {Error} If <code>options</code> is not an object or if the observer switches between <code>entryTypes</code> and <code>type</code> modes without first calling {@link PerformanceObserver.disconnect disconnect}.
     *
     * @example
     * function perfObserver(list, observer) {
     *   list.getEntries().forEach((entry) => {
     *     if (entry.entryType === "mark") {
     *       console.log(`${entry.name}'s startTime: ${entry.startTime}`);
     *     }
     *     if (entry.entryType === "measure") {
     *       console.log(`${entry.name}'s duration: ${entry.duration}`);
     *     }
     *   });
     * }
     *
     * const observer = new PerformanceObserver(perfObserver);
     * observer.observe({ entryTypes: ["mark", "measure"] });
     */
    this.observe = function (options) { };

    /**
     * Stops delivery of future performance entries, clears pending observer records, and resets the observer's registered entry types.<br>
     * The same observer may be configured again with {@link PerformanceObserver.observe observe} after disconnecting.
     * @method
     */
    this.disconnect = function () { };

    /**
     * Returns the performance entries currently waiting in the observer buffer and empties that buffer.<br>
     * Entries returned by this method will not later be delivered by the callback.
     * @method
     * @return {Array<PerformanceEntry>}
     */
    this.takeRecords = function () { };
}

/**
 * Frozen array of entry types supported by {@link PerformanceObserver PerformanceObserver}.<br>
 * JSplitter currently returns <code>["mark", "measure"]</code>. Repeated reads return the same frozen array object.
 * @type {Array<string>}
 * @readonly
 * @static
 */
PerformanceObserver.supportedEntryTypes = ["mark", "measure"];

/**
 * High-resolution timing API implementing the JSplitter subset of the Web High Resolution Time, User Timing, and Performance Timeline APIs.<br>
 * JSplitter currently records only user-created "mark" and "measure" entries; browser-specific navigation, resource, paint, and similar performance entry types are not available.<br>
 * For the corresponding Web standards, see {@link https://www.w3.org/TR/hr-time-2/ High Resolution Time}, {@link https://www.w3.org/TR/user-timing/ User Timing}, and {@link https://www.w3.org/TR/performance-timeline/ Performance Timeline}.
 * @sourceFile ../../component/samples/basic/Performance.js
 * @namespace performance
 */
let performance = {

    /**
     * Returns a monotonically increasing high-resolution timestamp in milliseconds relative to {@link performance.timeOrigin}. The value may contain a fractional part; actual resolution depends on the underlying system clock.<br>
     * Unlike <code>Date.now()</code>, this timestamp is intended for measuring elapsed time and is not affected by wall-clock adjustments.
     * @return {number}
     * @example
     * const t0 = performance.now();
     * doSomething();
     * const t1 = performance.now();
     * console.log(`Call to doSomething took ${t1 - t0} milliseconds.`);
     */
    now: function () { },

    /**
     * Creates a named {@link PerformanceEntry} with <code>entryType</code> "mark" and adds it to the performance timeline.<br>
     * Multiple marks may use the same name. All marks remain in the timeline until cleared; when a mark name is later used by {@link performance.measure performance.measure}, the most recently created matching mark is used.
     *
     * @param {string} name Mark name.
     * @param {PerformanceMarkOptions} [markOptions] Optional mark timestamp and metadata.
     * @return {PerformanceEntry} The created mark entry.
     * @throws {Error} If <code>startTime</code> is not a finite non-negative number.
     * @example
     * const beginMark = performance.mark("work-begin", {
     *   detail: { description: "Begin of some important work", id: 777 }
     * });
     *
     * doSomething();
     * performance.mark("work-end");
     *
     * const measure = performance.measure("work-duration", "work-begin", "work-end");
     * console.log(`"${beginMark.detail.description}" for id=${beginMark.detail.id} took ${measure.duration} ms`);
     *
     * performance.clearMarks();
     * performance.clearMeasures();
     */
    mark: function (name, markOptions) { },

    /**
     * Creates a named {@link PerformanceEntry} with <code>entryType</code> "measure" and adds it to the performance timeline.<br>
     *
     * Standard forms supported by JSplitter:<br>
     * <code>performance.measure(name)</code> - measures from timestamp 0 to {@link performance.now performance.now}.<br>
     * <code>performance.measure(name, startMark)</code> - measures from the most recent named start mark to now.<br>
     * <code>performance.measure(name, startMark, endMark)</code> - measures between the most recent matching named marks.<br>
     * <code>performance.measure(name, options)</code> - derives start/end times from {@link PerformanceMeasureOptions}.<br>
     * <code>performance.measure(name, {}, endMark)</code> - measures from timestamp 0 to the named end mark.<br>
     *
     * In <code>options</code>, <code>start</code> and <code>end</code> may be either mark names or finite non-negative timestamps. <code>duration</code> may be supplied with exactly one of <code>start</code> or <code>end</code>. If an explicitly named mark does not exist, an error is thrown.<br>
     * Multiple measures may use the same name. Named mark lookup always uses the most recently created matching mark.<br>
     *
     * <b>Compatibility note:</b> for historical JSplitter compatibility, a fourth <code>legacyMeasureOptions</code> argument is also accepted. This form preserves the previous JSplitter precedence rules: existing explicit <code>startMark</code>/<code>endMark</code> values take precedence, while numeric <code>start</code>, <code>end</code>, or <code>duration</code> options fill missing values. New code should prefer the standard forms above.<br>
     * For backward compatibility, an empty positional mark name (<code>""</code>) is treated as omitted rather than as a mark named with an empty string.
     *
     * @param {string} measureName Measure name.
     * @param {(string|PerformanceMeasureOptions)} [startOrMeasureOptions] Start mark name or standard measure options.
     * @param {string} [endMark] End mark name.
     * @param {Object} [legacyMeasureOptions] JSplitter legacy four-argument options object. Supports numeric <code>start</code>, <code>end</code>, <code>duration</code>, and arbitrary <code>detail</code>.
     * @return {PerformanceEntry} The created measure entry.
     * @throws {Error} If a named mark cannot be resolved, a numeric timestamp/duration is invalid, or the standard options contain an invalid combination.
     * @example
     * performance.mark("work-start");
     * doSomething();
     * performance.mark("work-end");
     *
     * const byMarks = performance.measure("work", "work-start", "work-end");
     * const byTimestamp = performance.measure("custom-range", { start: 10, duration: 25 });
     *
     * console.log(byMarks.duration);
     * console.log(byTimestamp.duration);
     */
    measure: function (measureName, startOrMeasureOptions, endMark, legacyMeasureOptions) { },

    /**
     * Returns all {@link PerformanceEntry} objects currently stored in the performance timeline, ordered by {@link PerformanceEntry.startTime startTime}.
     * @return {Array<PerformanceEntry>}
     */
    getEntries: function () { },

    /**
     * Returns timeline entries filtered by entry type and ordered by {@link PerformanceEntry.startTime startTime}.
     * @param {string} type Entry type, for example "mark" or "measure".
     * @return {Array<PerformanceEntry>}
     */
    getEntriesByType: function (type) { },

    /**
     * Returns timeline entries filtered by name and, optionally, entry type. Results are ordered by {@link PerformanceEntry.startTime startTime}.
     * @param {string} name Entry name.
     * @param {string} [type] Optional entry type, for example "mark" or "measure".
     * @return {Array<PerformanceEntry>}
     */
    getEntriesByName: function (name, type) { },

    /**
     * Removes mark entries from the performance timeline.<br>
     * If <code>name</code> is supplied, all marks with that name are removed. If omitted, all mark entries are removed. Clearing a mark also removes it from subsequent named-mark lookup by {@link performance.measure performance.measure}.
     * @param {string} [name] Mark name to clear.
     * @return {undefined}
     */
    clearMarks: function (name) { },

    /**
     * Removes measure entries from the performance timeline.<br>
     * If <code>name</code> is supplied, all measures with that name are removed. If omitted, all measure entries are removed.
     * @param {string} [name] Measure name to clear.
     * @return {undefined}
     */
    clearMeasures: function (name) { },

    /**
     * JSplitter extension that returns a human-readable dump of the current performance timeline.
     * @return {string}
     */
    toString: function () { },

    /**
     * JSplitter compatibility factory that creates a {@link PerformanceObserver PerformanceObserver}.<br>
     * New code may use the standard <code>new PerformanceObserver(callback)</code> form instead.
     * @param {function} callback Callback receiving <code>(list, observer)</code>.
     * @return {PerformanceObserver}
     */
    Observer: function (callback) { },

    /**
     * Read-only Unix timestamp in milliseconds corresponding to the origin used by this performance timeline.<br>
     * {@link performance.now performance.now} values are measured relative to this origin.
     *
     * @type {number}
     * @readonly
     */
    timeOrigin: 0.0
};
