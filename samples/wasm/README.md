# WebAssembly album-art filters

Select **WebAssembly Image Filters.js** via **Script → File** in a JSplitter panel.
The **.worker.js** and **.wasm** dependencies must remain beside it. They are
already included in this folder. The example runs without playback and shows a
procedurally generated fallback if there is no cover art. Use a panel roughly
650 × 350 or larger for side-by-side viewing.

- **Left click:** Pencil / Neon / Ink filter modes.
- **Mouse wheel:** edge-detection threshold.
- **Right click:** reload playing or focused track's cover.

The filter is written in C (see `source/album_art_filters.c`) and compiled to
WebAssembly without imports, libc, Emscripten or WASI. The original image is
retained inside the Worker's WebAssembly memory so parameter changes do not
transfer album art again.

To rebuild with Clang with a wasm32 backend and wasm-ld, run this command from
`samples/wasm` (single line for Windows):

```sh
clang --target=wasm32-unknown-unknown -O3 -nostdlib \
  -Wl,--no-entry -Wl,--export=filter -Wl,--export-memory \
  -Wl,--export=__heap_base -Wl,--initial-memory=131072 \
  -o album_art_filters.wasm source/album_art_filters.c
```

The binary is prebuilt. Rebuilding is not necessary to run the sample.
