'use strict';

// Worker sample 1: Basic Messaging
// Demonstrates: Worker lifecycle, structured-clone messages, message/error handlers and shutdown.
// Why a Worker: this is the smallest complete pattern used by the larger samples.

const workerSource = String.raw`
'use strict';

onmessage = function (event) {
    const values = event.data.values;
    const doubled = values.map(value => value * 2);

    postMessage({
        input: values,
        output: doubled,
        workerName: self.name
    });

    // The current message task is allowed to finish, then this Worker exits.
    close();
};

onmessageerror = function (event) {
    console.log('Worker could not reconstruct an incoming message.');
    console.log('Direction: ' + event.direction);
    console.log('Reason: ' + (event.errorMessage || '(no diagnostic text)'));
};
`;

const worker = new Worker(workerSource, 'basic-messaging');

worker.onmessage = function (event) {
    console.log(JSON.stringify(event.data));
};

worker.onmessageerror = function (event) {
    console.log('Panel could not reconstruct a Worker message.');
    console.log(`Direction: ${event.direction}`);
    console.log(`Reason: ${event.errorMessage || '(no diagnostic text)'}`);
};

worker.onerror = function (event) {
    console.log(`Worker error: ${event.message}`);
};

worker.postMessage({ values: [1, 2, 3, 4] });

function on_script_unload() {
    // Explicit termination is optional on panel unload: JSplitter automatically
    // terminates Workers still owned by the panel. Calling terminate() here is also
    // safe, including after this sample Worker has already called close().
    worker.terminate();
}
