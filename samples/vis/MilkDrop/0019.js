// MilkDrop 0019 — red seed in an inverted noise field
//
// Original: original/0019.milk. The built-in mode-5 wave has alpha .001,
// below the modern native renderer's .004 cutoff, so it is intentionally not
// drawn. The visible source is the large translucent 63-sided red shape.
// Feedback reproduces the 48x36 built-in warp mesh, the five-octave wrapping
// noise volume, Blur1 subtraction and the preset's custom luminance injection.
//
// foo_vis_milk2 supplies noisevol_hq and noise_lq as stock random textures.
// This self-contained port uses procedural wrapping noise with the same
// lattice and byte distributions rather than those particular random textures.
// q1 is periodic for every sampled octave and is packed modulo one in a hidden
// texel. Above 30 FPS, stochastic shape coverage preserves weak color deposits,
// sqrt(dt) preserves frame-noise variance, and sharper history reconstruction
// limits repeated resampling blur. These are cadence approximations; the native
// 30-FPS calculations remain unchanged.

// Loaded by Shader - MilkDrop.js; no panel callbacks or timers here.
MilkDropPresets["0019"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    const shader = `
Texture2D<float> RelativeBands : register(t2);

cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
    float frameStep;
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}

float TemporalAlpha(float alpha30, float step30) {
    return 1.0 - pow(saturate(1.0 - alpha30), step30);
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 16) {
        if (pixel.x < 6) {
            float band = max(RelativeBands.Load(int3(pixel.x, 0, 0)).r, 0.0);
            return float4(PackPositive(band), 1.0);
        }
        // Preserve q1 and the state marker written by feedback.
        return float4(0.0, 0.0, 0.0, 0.0);
    }

    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 center = size * .5;
    float radius = 2.66549 * .5 * min(size.x, size.y);
    float radial = length(input.sceneSpacePos.xy - center) / radius;
    if (radial >= 1.0) return float4(0.0, 0.0, 0.0, 0.0);

    // Native shape colors and alpha pass through UNORM8 vertex conversion.
    float3 inner = float3(77.0, 0.0, 0.0) / 255.0;
    float3 outer = float3(128.0, 0.0, 0.0) / 255.0;
    float alpha30 = (8.0 / 255.0) * (1.0 - radial);
    float step30 = max(frameStep * .5, .0005);
    float alpha = TemporalAlpha(alpha30, step30);
    // Preserve native-strength deposits when their shortened premultiplied
    // contribution would disappear in UNORM8. Coverage, not deposit strength,
    // changes with cadence. p * alpha30 equals the desired per-step alpha,
    // so both mean emission and mean transmittance retain their time scale.
    if (step30 < 1.0 && alpha30 > 0.0) {
        uint tick = (uint)floor(time * (60.0 / max(frameStep, .001)));
        uint hash = (uint)pixel.x * 1973u + (uint)pixel.y * 9277u + tick * 26699u;
        hash = (hash ^ 61u) ^ (hash >> 16);
        hash *= 9u;
        hash ^= hash >> 4;
        hash *= 0x27d4eb2du;
        hash ^= hash >> 15;
        float coverage = (float)(hash & 0x00ffffffu) / 16777216.0;
        alpha = coverage < alpha / alpha30 ? alpha30 : 0.0;
    }
    float3 color = lerp(inner, outer, radial);
    // Shader feedback targets use D2D's premultiplied-alpha convention.
    // Native MilkDrop blends this shape as color * alpha; returning straight
    // RGB here would inject an almost opaque red contribution every frame.
    return float4(color * alpha, alpha);
}`;

    const feedbackShader = `
Texture2D Previous : register(t0);

cbuffer FeedbackConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};

struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

static const float3 STATE_MAGIC = float3(.1725, .5333, .9137);

float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}

float UnpackUnit(float3 packed) {
    return dot(packed, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float UnpackPositive(float3 packed) {
    float value = min(UnpackUnit(packed), .99999);
    return value / max(1.0 - value, .00001);
}

float4 State(int pixel) {
    return Previous.Load(int3(pixel, 0, 0));
}

float Audio(int band) {
    return UnpackPositive(State(band).rgb);
}

bool IsControlPixel(int2 pixel) {
    return pixel.y == 0 && pixel.x >= 0 && pixel.x < 16;
}

float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    if (IsControlPixel(pixel)) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float3 HistoryClamp(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = saturate(uv) * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
                      HistoryTexel(base + int2(1, 0), dimensions), f.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
                         HistoryTexel(base + int2(1, 1), dimensions), f.x);
    return lerp(top, bottom, f.y);
}

float3 CubicHistory(float3 a, float3 b, float3 c, float3 d, float t) {
    return b + .5 * t * (c - a + t * (2.0*a - 5.0*b + 4.0*c - d +
        t * (3.0*(b-c) + d-a)));
}

float3 HistoryCubicRow(int2 base, int row, int2 size, float f) {
    return CubicHistory(HistoryTexel(base + int2(-1, row), size),
        HistoryTexel(base + int2(0, row), size),
        HistoryTexel(base + int2(1, row), size),
        HistoryTexel(base + int2(2, row), size), f);
}

float3 HistoryCadence(float2 uv, float2 size, float step30) {
    float3 bilinear = HistoryClamp(uv, size);
    if (step30 >= 1.0) return bilinear;
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = saturate(uv) * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 cubic = CubicHistory(
        HistoryCubicRow(base, -1, dimensions, f.x),
        HistoryCubicRow(base, 0, dimensions, f.x),
        HistoryCubicRow(base, 1, dimensions, f.x),
        HistoryCubicRow(base, 2, dimensions, f.x), f.y);
    // As in 0246/0282, reduce repeated bilinear diffusion at shorter steps.
    // Only recursive transport uses this reconstruction; Blur1 stays blurred.
    return saturate(lerp(bilinear, cubic, 1.0 - step30));
}

float3 HashVolume(float3 p) {
    p -= floor(p / 8.0) * 8.0;
    float3 random = frac(sin(float3(
        dot(p, float3(127.1, 311.7, 74.7)),
        dot(p, float3(269.5, 183.3, 246.1)),
        dot(p, float3(113.5, 271.9, 124.6)))) * 43758.5453123);

    // noisevol_hq is not ordinary normalized value noise. MilkDrop seeds the
    // coarse 8^3 lattice with (random % 216) + 108 and stores the result in an
    // RGBA8 volume. Values above 255 wrap in the byte texture, leaving a
    // deliberately split dark/light distribution before cubic interpolation.
    return fmod(floor(random * 216.0) + 108.0, 256.0) / 255.0;
}

float3 NoiseVolume(float3 uvw) {
    float3 p = frac(uvw) * 8.0;
    float3 cell = floor(p);
    float3 f = frac(p);
    f = f * f * (3.0 - 2.0 * f);

    float3 n000 = HashVolume(cell);
    float3 n100 = HashVolume(cell + float3(1, 0, 0));
    float3 n010 = HashVolume(cell + float3(0, 1, 0));
    float3 n110 = HashVolume(cell + float3(1, 1, 0));
    float3 n001 = HashVolume(cell + float3(0, 0, 1));
    float3 n101 = HashVolume(cell + float3(1, 0, 1));
    float3 n011 = HashVolume(cell + float3(0, 1, 1));
    float3 n111 = HashVolume(cell + float3(1, 1, 1));
    float3 n00 = lerp(n000, n100, f.x);
    float3 n10 = lerp(n010, n110, f.x);
    float3 n01 = lerp(n001, n101, f.x);
    float3 n11 = lerp(n011, n111, f.x);
    return lerp(lerp(n00, n10, f.y), lerp(n01, n11, f.y), f.z);
}

float3 HashNoiseTexel(float2 p) {
    p -= floor(p / 256.0) * 256.0;
    float3 random = frac(sin(float3(
        dot(p, float2(127.1, 311.7)),
        dot(p, float2(269.5, 183.3)),
        dot(p, float2(419.2, 371.9)))) * 43758.5453123);
    // noise_lq is an RGBA8 texture seeded with byte-valued random noise.
    return floor(random * 256.0) / 255.0;
}

float2 FrameNoiseOffset(float frameIndex) {
    return frac(sin(frameIndex * float2(12.9898, 78.233) +
                    float2(37.719, 11.135)) * 43758.5453123) * 256.0;
}

float3 NoiseTexture(float2 uvOriginal, float2 size, float frameIndex) {
    // Native expression:
    // uv_orig * texsize.xy * texsize_noise_lq.zw + rand_frame.xy.
    // Converting the normalized sampler coordinate back to its 256x256 texel
    // lattice leaves screen-pixel position plus a random frame translation.
    float2 texel = uvOriginal * size + FrameNoiseOffset(frameIndex) - .5;
    float2 base = floor(texel);
    float2 f = frac(texel);
    float3 n00 = HashNoiseTexel(base);
    float3 n10 = HashNoiseTexel(base + float2(1, 0));
    float3 n01 = HashNoiseTexel(base + float2(0, 1));
    float3 n11 = HashNoiseTexel(base + float2(1, 1));
    return lerp(lerp(n00, n10, f.x), lerp(n01, n11, f.x), f.y);
}

float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float weightDivisor = .027322404;
    float2 alignedUv = uv + 1.0 / size;
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 offset = float2(offsets[i] / size.x, 0.0);
        value += (HistoryClamp(alignedUv + offset, size) +
                  HistoryClamp(alignedUv - offset, size)) * weights[i];
    }
    return value * weightDivisor;
}

float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(.901408451, 2.487804878);
    const float weightDivisor = .027322404;
    float2 alignedUv = uv + float2(2.0 / size.x, 0.0);
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 offset = float2(0.0, offsets[i] * 2.0 / size.y);
        value += (Blur1Horizontal(alignedUv + offset, size) +
                  Blur1Horizontal(alignedUv - offset, size)) * weights[i];
    }
    value *= weightDivisor;
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float3 PolarAtVertex(float2 uv, float2 aspect) {
    float2 vertex = float2(2.0 * uv.x - 1.0,
                            1.0 - 2.0 * uv.y) * aspect;
    return float3(uv, length(vertex));
}

float3 WarpVertex(float2 uvOriginal, float2 size, float volume,
                  float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(2.0 * uvOriginal.x - 1.0,
                            1.0 - 2.0 * uvOriginal.y);
    float zoom = pow(max(.9998 + .015 * volume, .0001), step30);
    float2 stretch = float2(pow(.9998, step30), 1.0);
    // The native path applies aspect before zoom/stretch and removes it again
    // after warp. With this preset's neutral centre/rotation/translation that
    // reduces to the expression below.
    float2 uv = .5 + (uvOriginal - .5) / (zoom * stretch);

    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 + 7.0),
        10.54 + 3.0 * cos(time * 1.233 + 3.0),
        11.49 + 4.0 * cos(time * .933 + 5.0));
    const float scaleInverse = 1.0 / 1.331;
    float u = sin(time * .333 + scaleInverse *
                  (vertex.x * factors.x - vertex.y * factors.w));
    u += cos(time * .753 - scaleInverse *
             (vertex.x * factors.y - vertex.y * factors.z));
    float v = cos(time * .375 - scaleInverse *
                  (vertex.x * factors.z + vertex.y * factors.y));
    v += sin(time * .825 + scaleInverse *
             (vertex.x * factors.x + vertex.y * factors.w));
    uv += .01 * .0035 * step30 * float2(u / aspect.x, v / aspect.y);
    // D3D9-compatible MilkDrop mesh coordinates include the final half-texel
    // translation before the custom warp shader receives uv. It is part of
    // each reference history step: split it too, otherwise higher FPS adds
    // extra drift and repeated half-pixel smoothing.
    uv += .5 * step30 / size;
    return float3(uv, PolarAtVertex(uvOriginal, aspect).z);
}

float3 MeshData(float2 uvOriginal, float2 size, float volume,
                float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1, 0)) / grid;
    float2 c01 = (cell + float2(0, 1)) / grid;
    float2 c11 = (cell + float2(1, 1)) / grid;
    bool lower = f.x + f.y <= 1.0;
    float2 aCorner = lower ? c00 : c10;
    float2 bCorner = lower ? c10 : c01;
    float2 cCorner = lower ? c01 : c11;
    float3 weight = lower
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float3 a = WarpVertex(aCorner, size, volume, step30);
    float3 b = WarpVertex(bCorner, size, volume, step30);
    float3 c = WarpVertex(cCorner, size, volume, step30);
    return weight.x * a + weight.y * b + weight.z * c;
}

float Luminance(float3 color) {
    return dot(color, float3(.32, .49, .29));
}

// Recover sub-code decay in UNORM8 history at arbitrary frame rates.
// Thresholds are in the post-decay value space. Preserve the quantization
// floor of the native 30-Hz operation; correct only the additional stall band.
float3 DitherDecay(float3 value, float retention, float subtraction,
                   float nativeRetention, float nativeSubtraction, float2 pixel) {
    if (frameStep >= 2.0) return value;
    const float halfCode = .5 / 255.0;
    float loss = max(1.0-retention,0.0);
    float nativeLoss = max(1.0-nativeRetention,0.0);
    float ceiling = loss > 1e-7
        ? max(0.0,(halfCode*retention-subtraction)/max(loss,1e-7))
        : (subtraction < halfCode ? 1.0 : 0.0);
    float nativeFloor = nativeLoss > 1e-7
        ? max(0.0,(halfCode*nativeRetention-nativeSubtraction)/max(nativeLoss,1e-7))
        : (nativeSubtraction < halfCode ? 1.0 : 0.0);
    if (ceiling <= nativeFloor) return value;
    float3 aboveNative = nativeFloor > 0
        ? smoothstep(nativeFloor,nativeFloor+1.0/255.0,value) : 1.0;
    float3 vulnerable = aboveNative * (1.0-smoothstep(
        ceiling,ceiling+max(ceiling*.35,1.0/255.0),value));
    float tick = floor(time*(60.0/max(frameStep,.001)));
    float3 noise = frac(sin(float3(
        dot(floor(pixel),float2(12.9898,78.233))+tick*19.193,
        dot(floor(pixel),float2(39.346,11.135))+tick*47.853,
        dot(floor(pixel),float2(73.156,52.235))+tick*83.155))*43758.5453);
    return value+(noise-.5)*vulnerable/255.0;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * .5, .0005);
    bool initialized = distance(State(15).rgb, STATE_MAGIC) < .02;
    float bass = initialized ? Audio(0) : 0.0;
    float mid = initialized ? Audio(1) : 0.0;
    float treb = initialized ? Audio(2) : 0.0;
    float volume = (bass + mid + treb) * .25;
    float q1 = initialized ? UnpackUnit(State(6).rgb) : 0.0;
    q1 = frac(q1 + volume * .01 * step30);

    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 16) {
        if (pixel.x == 6) return float4(PackUnit(q1), 1.0);
        if (pixel.x == 15) return float4(STATE_MAGIC, 1.0);
        return float4(0.0, 0.0, 0.0, 1.0);
    }

    float2 uvOriginal = input.texelSpacePos.xy;
    float3 mesh = MeshData(uvOriginal, size, volume, step30);
    float2 uv = mesh.xy;
    float radial = mesh.z;

    float3 position = float3(uv, q1);
    float3 randomColor = 0.0;
    float frequency = 1.0;
    float amplitude = 1.0;
    // Keep the five source octaves in a runtime loop. Expanding five copies
    // of the same trilinear lattice does not change a pixel, but makes FXC
    // spend substantially longer optimizing a much larger instruction tree.
    [loop]
    for (int octave = 0; octave < 5; ++octave) {
        randomColor += NoiseVolume(position * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= .5;
    }
    randomColor = randomColor * randomColor * randomColor;
    randomColor -= Blur1(uv, size);
    randomColor *= volume;

    float radialScale = 1.0 - randomColor.x * .05 * step30;
    float2 recursiveUv = .5 + (uv - .5) * radialScale;
    float3 color = HistoryCadence(recursiveUv, size, step30);

    float frameIndex = floor(time * (60.0 / max(frameStep, .001)));
    float3 frameNoise = NoiseTexture(uvOriginal, size, frameIndex);
    float3 noise2 = frameNoise + lerp(randomColor * 2.0, 2.0, radial);
    float injection = .5 * Luminance(cross(1.0 - color, noise2));
    if (step30 < 1.0) {
        // Only the independent frame noise scales with sqrt(dt): scaling it
        // with dt would reduce its variance per second as FPS increases.
        // The slowly varying volume field remains a time-scaled drift.
        float3 meanNoise = .5 + lerp(randomColor * 2.0, 2.0, radial);
        float drift = .5 * Luminance(cross(1.0 - color, meanNoise));
        float fluctuation = .5 * Luminance(cross(1.0 - color,
            frameNoise - .5));
        injection = drift * step30 + fluctuation * sqrt(step30);
    } else {
        injection *= step30;
    }
    color = (color + injection) * pow(.98, step30);
    color=DitherDecay(color,pow(.98,step30),0,.98,0,input.sceneSpacePos.xy);
    return float4(color, 1.0);
}`;

    const postShader = `
Texture2D Frame : register(t0);
SamplerState Filter : register(s0);

cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};

struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 16)
        uv.y = 1.5 / size.y;
    float3 color = Frame.SampleLevel(Filter, uv, 0.0).rgb;
    color = (1.0 - color) * 1.14;
    color *= color;
    return float4(saturate(color), 1.0);
}`;

    return {
        name: "0019",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: feedbackShader,
            post: postShader
        }
    };
};
