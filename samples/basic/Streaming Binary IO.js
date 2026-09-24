// Streaming binary I/O with a reusable Uint8Array buffer.
// Read() fills the supplied buffer instead of allocating a new typed array for each chunk.

const sourcePath = `${fb.ProfilePath}streaming-source.bin`;
const copyPath = `${fb.ProfilePath}streaming-copy.bin`;
const buffer = new Uint8Array(1024 * 1024);

const reader = utils.OpenBinaryReader(sourcePath);
if (!reader) {
    console.log(`Unable to open: ${sourcePath}`);
} else {
    const writer = utils.OpenBinaryWriter(copyPath);
    if (!writer) {
        reader.Close();
        console.log(`Unable to create: ${copyPath}`);
    } else {
        try {
            while (!reader.EOF) {
                const bytesRead = reader.Read(buffer);
                if (!bytesRead) break;

                // Only the first bytesRead bytes contain newly read data.
                if (!writer.Write(buffer, 0, bytesRead)) {
                    console.log('Write failed');
                    break;
                }
            }

            writer.Flush();
            console.log(`Copied ${writer.Position} bytes`);
        } finally {
            reader.Close();
            writer.Close();
        }
    }
}
