"use strict";

/*
 * Performance / User Timing API sample
 *
 * Demonstrates:
 *   - performance.now()
 *   - performance.mark()
 *   - performance.measure()
 *   - PerformanceObserver
 *   - repeated mark/measure names
 *   - getEntriesByName()/getEntriesByType()
 *   - clearMarks()/clearMeasures()
 */

function printEntry(entry) {
    console.log(
        entry.entryType + " \"" + entry.name + "\"" +
        "  start=" + entry.startTime.toFixed(3) + " ms" +
        "  duration=" + entry.duration.toFixed(3) + " ms"
    );
}

// PerformanceObserver receives new mark/measure entries asynchronously.
const observer = new PerformanceObserver((list) => {
    console.log("\nObserver:");

    for (const entry of list.getEntries()) {
        printEntry(entry);
    }
});

console.log(
    "Supported entry types: " +
    PerformanceObserver.supportedEntryTypes.join(", ")
);

observer.observe({
    entryTypes: ["mark", "measure"]
});

function doSomeWork() {
    let value = 0;

    for (let i = 0; i < 100000; ++i) {
        value += Math.sqrt(i);
    }

    return value;
}

// The same mark names may be reused.
// measure() resolves the most recently created marks with those names.
for (let pass = 1; pass <= 3; ++pass) {
    performance.mark("work-start");

    doSomeWork();

    performance.mark("work-end");

    const measure = performance.measure(
        "work",
        "work-start",
        "work-end"
    );

    console.log(
        "Pass " + pass + ": " +
        measure.duration.toFixed(3) + " ms"
    );
}

// Measures can also be created directly from timestamps.
const customMeasure = performance.measure("custom-range", {
    start: 10,
    duration: 25
});

console.log(
    "Custom range: " +
    customMeasure.startTime.toFixed(3) + " ms -> " +
    (customMeasure.startTime + customMeasure.duration).toFixed(3) + " ms"
);

// Query previously recorded entries.
const workMeasures = performance.getEntriesByName("work", "measure");

console.log("\nRecorded work measures:");

for (const entry of workMeasures) {
    printEntry(entry);
}

// getEntriesByType() returns entries ordered by startTime.
const allMeasures = performance.getEntriesByType("measure");

console.log("\nAll measures:");

for (const entry of allMeasures) {
    printEntry(entry);
}

// performance.now() is useful when no timeline entry is needed.
const begin = performance.now();

doSomeWork();

const elapsed = performance.now() - begin;

console.log(
    "\nDirect performance.now(): " +
    elapsed.toFixed(3) + " ms"
);

// Remove entries when they are no longer needed.
// This does not affect entries already delivered to the observer.
performance.clearMarks("work-start");
performance.clearMarks("work-end");
performance.clearMeasures("work");
performance.clearMeasures("custom-range");

// Stop observing future entries.
observer.disconnect();
