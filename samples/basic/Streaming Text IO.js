// JSplitter sample: Worker.RunAsync + Streaming Text I/O
//
// Demonstrates Worker.RunAsync(), utils.OpenTextReader() and
// utils.OpenTextWriter() together. TextReader/TextWriter are synchronous,
// but the complete file job runs in a temporary Worker so the panel UI stays
// responsive. The files are processed incrementally instead of being held as
// one large JavaScript string.

const sourcePath = fb.ProfilePath + 'streaming-io-source.jsonl';
const resultPath = fb.ProfilePath + 'streaming-io-filtered.txt';

async function runExample() {
    try {
        const result = await Worker.RunAsync((sourcePath, resultPath) => {
            const started = performance.now();
            const recordCount = 10000;

            // Create a JSON Lines source file incrementally.
            // false = UTF-8 without BOM.
            const sourceWriter = utils.OpenTextWriter(sourcePath, false);
            if (!sourceWriter) {
                throw new Error(`Unable to create ${sourcePath}`);
            }

            try {
                for (let i = 0; i < recordCount; ++i) {
                    if (!sourceWriter.WriteLine(JSON.stringify({
                        id: i,
                        value: `item ${i}`
                    }))) {
                        throw new Error('Failed to write the source file');
                    }
                }
            }
            finally {
                sourceWriter.Close();
            }

            // Read the source one line at a time and write a small filtered file.
            const reader = utils.OpenTextReader(sourcePath);
            if (!reader) {
                throw new Error(`Unable to open ${sourcePath}`);
            }

            const writer = utils.OpenTextWriter(resultPath, false);
            if (!writer) {
                reader.Close();
                throw new Error(`Unable to create ${resultPath}`);
            }

            let read = 0;
            let written = 0;

            try {
                for (;;) {
                    const line = reader.ReadLine();
                    if (line === null) {
                        if (!reader.EOF) {
                            throw new Error('Failed to read or decode the source file');
                        }
                        break;
                    }
                    if (!line.length) {
                        continue;
                    }

                    const item = JSON.parse(line);
                    ++read;

                    // Keep every 1000th record as a visible result.
                    if (item.id % 1000 === 0) {
                        if (!writer.WriteLine(`${item.id}\t${item.value}`)) {
                            throw new Error('Failed to write the result file');
                        }
                        ++written;
                    }
                }
            }
            finally {
                reader.Close();
                writer.Close();
            }

            return {
                read,
                written,
                elapsedMs: performance.now() - started
            };
        }, sourcePath, resultPath);

        console.log(
            `Worker.RunAsync finished: read ${result.read}, wrote ${result.written} ` +
            `records in ${result.elapsedMs.toFixed(1)} ms`
        );
        console.log(`Output: ${resultPath}`);
    }
    catch (error) {
        console.log(`Worker.RunAsync failed: ${error.name}: ${error.message}`);
    }
}

runExample();
