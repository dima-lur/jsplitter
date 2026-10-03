/*
 * JSplitter WebAssembly demo: 3x3 Sobel edge detection on RGBA pixels.
 * Standalone C, no libc, WASI, browser, or JS imports.
 *
 * Call filter(srcOffset, dstOffset, width, height, threshold, mode).
 * The input and output are separate width*height*4-byte RGBA buffers in
 * WebAssembly.Memory. Mode: 0 = pencil, 1 = neon, 2 = ink.
 */
#include <stdint.h>

static inline int abs_i(int x) { return x < 0 ? -x : x; }
static inline int luminance(const uint8_t *p)
{
    return (77 * (int)p[0] + 150 * (int)p[1] + 29 * (int)p[2]) >> 8;
}
static inline int clamp8(int n) { return n < 0 ? 0 : (n > 255 ? 255 : n); }

__attribute__((visibility("default")))
int filter(uint32_t src_offset, uint32_t dst_offset, int width, int height, int threshold, int mode)
{
    const uint8_t *src = (const uint8_t *)(uintptr_t)src_offset;
    uint8_t *dst = (uint8_t *)(uintptr_t)dst_offset;
    int edge_count = 0;

    if (width < 3 || height < 3 || threshold < 0 || threshold > 2040 || mode < 0 || mode > 2)
        return -1;

    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            const int at = (y * width + x) * 4;
            int strength = 0;

            if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
                const uint8_t *top = src + ((y - 1) * width + x - 1) * 4;
                const uint8_t *mid = src + (y * width + x - 1) * 4;
                const uint8_t *bot = src + ((y + 1) * width + x - 1) * 4;
                const int a = luminance(top);
                const int b = luminance(top + 4);
                const int c = luminance(top + 8);
                const int d = luminance(mid);
                const int f = luminance(mid + 8);
                const int g = luminance(bot);
                const int h = luminance(bot + 4);
                const int i = luminance(bot + 8);
                const int gx = -a + c - 2 * d + 2 * f - g + i;
                const int gy = -a - 2 * b - c + g + 2 * h + i;
                strength = abs_i(gx) + abs_i(gy);
            }

            if (strength > threshold) ++edge_count;
            const int edge = clamp8((strength - threshold) / 2);
            if (mode == 0) {
                // White paper, dark pencil lines.
                const int ink = 255 - edge;
                dst[at] = dst[at + 1] = dst[at + 2] = (uint8_t)ink;
            } else if (mode == 1) {
                // Luminous cyan edges on a dark background.
                dst[at]     = (uint8_t)(edge / 5);
                dst[at + 1] = (uint8_t)edge;
                dst[at + 2] = (uint8_t)clamp8(edge + edge / 5);
            } else {
                // Album-art colors with dark outlines.
                const int ink = 255 - edge;
                dst[at]     = (uint8_t)((src[at] * ink) / 255);
                dst[at + 1] = (uint8_t)((src[at + 1] * ink) / 255);
                dst[at + 2] = (uint8_t)((src[at + 2] * ink) / 255);
            }
            dst[at + 3] = 255;
        }
    }
    return edge_count;
}
