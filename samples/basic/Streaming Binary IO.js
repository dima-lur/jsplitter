// Streaming binary I/O with a reusable Uint8Array buffer.
// Read() fills the supplied buffer instead of allocating a new typed array for each chunk.
// The complete copy operation runs in a temporary Worker so the panel UI remains responsive.

const sourcePath = `${fb.ProfilePath}streaming-source.bin`;
const copyPath = `${fb.ProfilePath}streaming-copy.bin`;

async function copyFile() {
    try {
        const bytesCopied = await Worker.RunAsync((sourcePath, copyPath) => {
            const buffer = new Uint8Array(1024 * 1024);

            const reader = utils.OpenBinaryReader(sourcePath);
            if (!reader) {
                throw new Error(`Unable to open: ${sourcePath}`);
            }

            const writer = utils.OpenBinaryWriter(copyPath);
            if (!writer) {
                reader.Close();
                throw new Error(`Unable to create: ${copyPath}`);
            }

            try {
                while (!reader.EOF) {
                    const bytesRead = reader.Read(buffer);
                    if (!bytesRead) {
                        break;
                    }

                    // Only the first bytesRead bytes contain newly read data.
                    if (!writer.Write(buffer, 0, bytesRead)) {
                        throw new Error('Write failed');
                    }
                }

                if (!writer.Flush()) {
                    throw new Error('Flush failed');
                }

                return writer.Position;
            }
            finally {
                reader.Close();
                writer.Close();
            }
        }, sourcePath, copyPath);

        console.log(`Copied ${bytesCopied} bytes`);
    }
    catch (error) {
        console.log(`Copy failed: ${error.name}: ${error.message}`);
    }
}

copyFile();
