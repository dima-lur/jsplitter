// JSplitter WebAssembly example - Worker.
// Compiles C-generated WASM once, retains image bytes in linear memory and
// recomputes filters on requests without sending pixels back into the Worker.
// No browser fetch(), WASI, TextEncoder, or external JavaScript dependencies.

let wasm = null;
let srcOffset = 0;
let dstOffset = 0;
let width = 0;
let height = 0;
let imageRevision = 0;

function ensureMemory(requiredBytes) {
    const memory = wasm.exports.memory;
    const availableBytes = memory.buffer.byteLength;
    if (requiredBytes > availableBytes) {
        memory.grow(Math.ceil((requiredBytes - availableBytes) / 65536));
    }
}

function render(threshold, mode, requestId) {
    if (!width || !height) return;
    const start = performance.now();
    const edgeCount = wasm.exports.filter(
        srcOffset, dstOffset, width, height, threshold, mode
    );
    if (edgeCount < 0) throw new Error('Invalid Sobel filter parameters');

    const byteLength = width * height * 4;
    // Copy the WASM memory region to an independent transferable ArrayBuffer.
    // This is necessary: WASM linear memory must remain owned by this Worker.
    const pixels = new Uint8Array(byteLength);
    pixels.set(new Uint8Array(wasm.exports.memory.buffer, dstOffset, byteLength));
    const elapsedMs = performance.now() - start;
    postMessage({
        type: 'result', revision: imageRevision, requestId,
        width, height, pixels, edgeCount, elapsedMs
    }, [pixels.buffer]);
}

onmessage = function (e) {
    const m = e.data;
    try {
        if (m.type === 'load') {
            if (!m.pixels || !m.width || !m.height ||
                m.pixels.length !== m.width * m.height * 4 ||
                m.width > 2048 || m.height > 2048 || m.width < 3 || m.height < 3) {
                throw new Error('Invalid image dimensions or RGBA data');
            }
            width = m.width;
            height = m.height;
            imageRevision = m.revision;
            const byteLength = width * height * 4;
            // The toolchain exports __heap_base; it indicates the beginning of
            // unused WASM linear memory after compiled data/stack.
            const base = wasm.exports.__heap_base.value;
            srcOffset = (base + 15) & ~15;
            dstOffset = (srcOffset + byteLength + 15) & ~15;
            ensureMemory(dstOffset + byteLength);
            new Uint8Array(wasm.exports.memory.buffer, srcOffset, byteLength)
                .set(m.pixels);
            render(m.threshold, m.mode, m.requestId);
        } else if (m.type === 'filter') {
            if (m.revision === imageRevision) {
                render(m.threshold, m.mode, m.requestId);
            }
        }
    } catch (err) {
        postMessage({type: 'error', message: String(err)});
    }
};

try {
    // For a file-backed Worker the relative path is resolved relative to
    // this Worker file by JSplitter's file path resolver.
    const bytes = utils.ReadBinaryFile('album_art_filters.wasm');
    if (!bytes) throw new Error('Cannot read album_art_filters.wasm');
    const module = new WebAssembly.Module(bytes);
    wasm = new WebAssembly.Instance(module);
    postMessage({type: 'ready'});
} catch (err) {
    postMessage({type: 'error', message: 'WASM initialization: ' + err});
}
