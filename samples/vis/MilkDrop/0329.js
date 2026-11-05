// MilkDrop 0329 — mirrored articulated ribbons with dotted highlights
//
// Ported from vis/milkdrop/0329.milk and the corresponding foo_vis_milk2
// rendering paths. Four procedural custom waves form two articulated arms:
// two normal-blended SmoothWave line strips and two additive dotted strips.
// The small additive pentagon follows the same 3D joint transform.
//
// The source pass writes the current relative-band values into private history
// pixels. The feedback pass uses those values to reproduce the preset's q1
// phase accumulator and alternating one-second q3 volume-average buffers.
// Those pixels are excluded from history filtering and from the final image.
//
// The original preset is evaluated at approximately 30 Hz. Its recursive .83
// decay, tangential warp, geometry opacity and accumulators are normalized to
// that cadence while TARGET_FPS controls evaluation frequency. At 120 FPS,
// dark feedback is temporally dithered to avoid BGRA8 quantization buildup.
// The final
// composite reproduces the mirrored red-channel image,
// Blur1-driven refraction, broad Blur3 glow and channel-dependent power curve.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0329"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

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
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float3 PackUnitFloat(float value) {
    value = saturate(value);
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float3 PackPositive(float value) {
    return PackUnitFloat(max(value, 0.0) / (1.0 + max(value, 0.0)));
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 p = input.sceneSpacePos.xy;

    // The feedback image supplies private state pixels 3..5. This source pass
    // replaces pixels 0..2 with the current values used by per_frame code.
    if (p.y < 1.0 && p.x < 3.0) {
        float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
        float mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0.0);
        float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
        float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);

        if (p.x < 1.0) {
            float volume = pow(bass + mid + treb, 2.0);
            return float4(PackPositive(volume), 1.0);
        }
        if (p.x < 2.0)
            return float4(PackPositive(bass), 1.0);
        return float4(PackPositive(bassAtt), 1.0);
    }

    return float4(0.0, 0.0, 0.0, 0.0);
}`;

    const warpShader = `
Texture2D Previous : register(t0);

cbuffer FeedbackConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

static const float PI = 3.14159265359;
static const float Q_PERIOD = 62.8318530718;

float3 PackUnitFloat(float value) {
    value = frac(max(value, 0.0));
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float DecodePositive(float3 encoded) {
    float unit = min(UnpackUnitFloat(encoded), 0.99999);
    return unit / max(1.0 - unit, 0.00001);
}

float EncodeAverage(float value) {
    return saturate(log2(1.0 + max(value, 0.0)) / 8.0);
}

float DecodeAverage(float value) {
    return exp2(saturate(value) * 8.0) - 1.0;
}

int WrapIndex(int value, int size) {
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions, bool wrap) {
    if (wrap) {
        pixel.x = WrapIndex(pixel.x, dimensions.x);
        pixel.y = WrapIndex(pixel.y, dimensions.y);
    } else {
        pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    }
    if (pixel.y == 0 && pixel.x < 6) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float3 SampleHistory(float2 uv, float2 size, bool wrap) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions, wrap),
                      HistoryTexel(base + int2(1, 0), dimensions, wrap),
                      fraction.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions, wrap),
                         HistoryTexel(base + int2(1, 1), dimensions, wrap),
                         fraction.x);
    return lerp(top, bottom, fraction.y);
}

// Shorter feedback steps otherwise repeat bilinear diffusion more often.
// Use bounded Catmull-Rom for the extra fraction of samples above 30 Hz.
// Clamp to the central four texels to avoid introducing bright/dark ringing.
// This is a high-FPS port compensation, not the native sampler at 30 Hz.
float4 HistoryCubicWeights(float t) {
    float t2 = t * t;
    float t3 = t2 * t;
    return float4(-.5*t + t2 - .5*t3,
                   1.0 - 2.5*t2 + 1.5*t3,
                   .5*t + 2.0*t2 - 1.5*t3,
                  -.5*t2 + .5*t3);
}

float3 HistoryCubicRow(int2 base, int2 dimensions, float4 weights) {
    return HistoryTexel(base + int2(-1, 0), dimensions, true)*weights.x
         + HistoryTexel(base, dimensions, true)*weights.y
         + HistoryTexel(base + int2(1, 0), dimensions, true)*weights.z
         + HistoryTexel(base + int2(2, 0), dimensions, true)*weights.w;
}

float3 HistoryWrap(float2 uv, float2 size) {
    float3 bilinear = SampleHistory(uv, size, true);
    float step30 = max(frameStep * .5, .0005);
    if (step30 >= 1.0) return bilinear;

    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float4 wx = HistoryCubicWeights(fraction.x);
    float4 wy = HistoryCubicWeights(fraction.y);
    float3 cubic = HistoryCubicRow(base + int2(0, -1), dimensions, wx)*wy.x
                 + HistoryCubicRow(base, dimensions, wx)*wy.y
                 + HistoryCubicRow(base + int2(0, 1), dimensions, wx)*wy.z
                 + HistoryCubicRow(base + int2(0, 2), dimensions, wx)*wy.w;
    float3 a = HistoryTexel(base, dimensions, true);
    float3 b = HistoryTexel(base + int2(1, 0), dimensions, true);
    float3 c = HistoryTexel(base + int2(0, 1), dimensions, true);
    float3 d = HistoryTexel(base + int2(1, 1), dimensions, true);
    cubic = clamp(cubic, min(min(a, b), min(c, d)),
                         max(max(a, b), max(c, d)));
    return lerp(bilinear, cubic, 1.0 - step30);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float q3,
                    float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);

    // per_pixel_1 replaces the preset's base zoom with 1 + .01*q3.
    float zoom = max(1.0 + 0.01 * q3, 0.05);
    float2 uv = 0.5 + (uvOriginal - 0.5) / pow(zoom, step30);

    // Fixed mesh warp: speed=1, scale=1, amount=.00052.
    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 +  7.0),
        10.54 + 3.0 * cos(time * 1.233 +  3.0),
        11.49 + 4.0 * cos(time * 0.933 +  5.0));
    float amount = 0.00052 * 0.0035 * step30;
    float uDelta = sin(time * 0.333 +
        vertexPos.x * factors.x - vertexPos.y * factors.w);
    uDelta += cos(time * 0.753 -
        vertexPos.x * factors.y + vertexPos.y * factors.z);
    float vDelta = cos(time * 0.375 -
        vertexPos.x * factors.z - vertexPos.y * factors.y);
    vDelta += sin(time * 0.825 +
        vertexPos.x * factors.x + vertexPos.y * factors.w);
    uv += amount * float2(uDelta / aspect.x, vDelta / aspect.y);
    return uv;
}

float2 MeshUV(float2 uvOriginal, float2 size, float q3, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    // Select the mesh triangle before running the expensive vertex warp.
    // This keeps the original vertices, barycentric weights and winding.
    bool lowerTriangle = f.x + f.y <= 1.0;
    float2 cornerA = lowerTriangle ? corner00 : corner10;
    float2 cornerB = lowerTriangle ? corner10 : corner01;
    float2 cornerC = lowerTriangle ? corner01 : corner11;
    float3 weight = lowerTriangle
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float2 a = WarpVertexUV(cornerA, size, q3, step30);
    float2 b = WarpVertexUV(cornerB, size, q3, step30);
    float2 c = WarpVertexUV(cornerC, size, q3, step30);
    return weight.x * a + weight.y * b + weight.z * c;
}

float2 ProjectArm(float sourceY, float tm, float turnOffset) {
    // The wrist transform in this preset is deliberately overwritten before
    // it is consumed. The remaining four transforms are transcribed directly.
    float angle = tm * 8.0 + turnOffset;
    float sineAngle;
    float cosineAngle;
    sincos(angle, sineAngle, cosineAngle);
    float x = sourceY * cosineAngle;
    float y = -sourceY * sineAngle;
    float z = -0.3;

    angle = PI + sin(tm * 2.0 - 0.5) * 1.5;
    sincos(angle, sineAngle, cosineAngle);
    float nextY = y * sineAngle + z * cosineAngle;
    float nextZ = y * cosineAngle - z * sineAngle;
    y = nextY;
    z = nextZ;

    angle = -1.0 + cos(tm * 3.1 + 0.5);
    sincos(angle, sineAngle, cosineAngle);
    float nextX = x * sineAngle + y * cosineAngle;
    nextY = x * cosineAngle - y * sineAngle;
    x = nextX;
    y = nextY;

    z -= 0.35;
    angle = cos(tm * 2.3) * 1.75 - 1.05;
    sincos(angle, sineAngle, cosineAngle);
    nextX = x * sineAngle + z * cosineAngle;
    nextZ = x * cosineAngle - z * sineAngle;
    x = nextX;
    z = nextZ;

    angle = cos(tm) * 0.5 - 0.5;
    sincos(angle, sineAngle, cosineAngle);
    nextY = y * cosineAngle - z * sineAngle;
    nextZ = y * sineAngle + z * cosineAngle;
    y = nextY;
    z = nextZ + 2.0;
    return float2(x / z + 0.5, y / z * 1.3 + 0.5);
}

float2 ArmPoint(float sample, float q1, bool lower, bool firstInPair,
                float turnOffset) {
    float tm = q1 - sample * 0.2;
    float sourceY = (firstInPair ? 0.2 : 0.1) + 0.1 * sin(tm);
    if (lower)
        sourceY = -sourceY - 0.1;
    return ProjectArm(sourceY, tm, turnOffset);
}

float2 ToPixels(float2 position, float2 size) {
    float squareSize = max(size.x, size.y);
    // foo_vis_milk2 maps custom-wave y through y*-2+1; its 2D vertex
    // convention has Y=-1 at the top, so preset-space Y is inverted here.
    return 0.5 * size +
           float2(position.x - 0.5, 0.5 - position.y) * squareSize;
}

float2 SmoothPoint(float2 below, float2 current,
                   float2 above, float2 above2) {
    return (-0.15 * below + 1.15 * current +
            1.15 * above - 0.15 * above2) * 0.5;
}

float SegmentDistance(float2 p, float2 a, float2 b, out float along) {
    float2 ab = b - a;
    along = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * along);
}

void AccumulateLineSegment(float2 p, float2 a, float2 b,
                           float3 colorA, float3 colorB,
                           float alphaA, float alphaB,
                           inout float3 accumulated,
                           inout float transmittance) {
    float along;
    float distance = SegmentDistance(p, a, b, along);
    float coverage = 1.0 - smoothstep(0.15, 1.10, distance);
    float sourceAlpha = coverage * lerp(alphaA, alphaB, along);
    float inverseAlpha = 1.0 - sourceAlpha;
    accumulated = lerp(colorA, colorB, along) * sourceAlpha +
                  accumulated * inverseAlpha;
    transmittance *= inverseAlpha;
}

void LineLayers(float2 p, float2 size, float q1, float3 colorA,
                float3 colorB, out float3 upperAdd,
                out float upperTransmittance, out float3 lowerAdd,
                out float lowerTransmittance) {
    // Each source strip has 256 alternating point pairs. As in the 0218 port,
    // 96 pairs retain the complete parameter range while keeping the per-pixel
    // software rasterizer practical. SmoothWave is preserved for every edge.
    const int pairs = 96;
    float sampleA = 0.0;
    float sampleB = 1.0 / 511.0;
    float2 currentUpperA = ArmPoint(sampleA, q1, false, true, 0.0);
    float2 currentUpperB = ArmPoint(sampleB, q1, false, false, 0.0);
    float2 currentLowerA = ArmPoint(sampleA, q1, true, true, 0.0);
    float2 currentLowerB = ArmPoint(sampleB, q1, true, false, 0.0);
    float2 previousUpperB = currentUpperA;
    float2 previousLowerB = currentLowerA;
    float currentAAlpha = 0.0;
    float currentBAlpha = sampleB * sampleB;

    upperAdd = 0.0;
    lowerAdd = 0.0;
    upperTransmittance = 1.0;
    lowerTransmittance = 1.0;

    // Preserve the runtime loop while avoiding FXC O3's expensive speculative
    // optimisation of the fixed 256-pair waveform body.
    [fastopt]
    for (int pair = 0; pair < pairs - 1; ++pair) {
        float nextSampleA = (float)(pair + 1) / (float)(pairs - 1);
        float nextSampleB = min(nextSampleA + 1.0 / 511.0, 1.0);
        float2 nextUpperA = ArmPoint(nextSampleA, q1, false, true, 0.0);
        float2 nextUpperB = ArmPoint(nextSampleB, q1, false, false, 0.0);
        float2 nextLowerA = ArmPoint(nextSampleA, q1, true, true, 0.0);
        float2 nextLowerB = ArmPoint(nextSampleB, q1, true, false, 0.0);
        float nextAAlpha = nextSampleA * nextSampleA;
        float nextBAlpha = nextSampleB * nextSampleB;

        float2 upperMidA = SmoothPoint(previousUpperB, currentUpperA,
            currentUpperB, nextUpperA);
        float2 upperMidB = SmoothPoint(currentUpperA, currentUpperB,
            nextUpperA, nextUpperB);
        float2 lowerMidA = SmoothPoint(previousLowerB, currentLowerA,
            currentLowerB, nextLowerA);
        float2 lowerMidB = SmoothPoint(currentLowerA, currentLowerB,
            nextLowerA, nextLowerB);

        float2 upperApx = ToPixels(currentUpperA, size);
        float2 upperMidApx = ToPixels(upperMidA, size);
        float2 upperBpx = ToPixels(currentUpperB, size);
        float2 upperMidBpx = ToPixels(upperMidB, size);
        float2 nextUpperApx = ToPixels(nextUpperA, size);
        float2 lowerApx = ToPixels(currentLowerA, size);
        float2 lowerMidApx = ToPixels(lowerMidA, size);
        float2 lowerBpx = ToPixels(currentLowerB, size);
        float2 lowerMidBpx = ToPixels(lowerMidB, size);
        float2 nextLowerApx = ToPixels(nextLowerA, size);

        AccumulateLineSegment(p, upperApx, upperMidApx,
            colorA, colorA, currentAAlpha, currentAAlpha,
            upperAdd, upperTransmittance);
        AccumulateLineSegment(p, upperMidApx, upperBpx,
            colorA, colorB, currentAAlpha, currentBAlpha,
            upperAdd, upperTransmittance);
        AccumulateLineSegment(p, upperBpx, upperMidBpx,
            colorB, colorB, currentBAlpha, currentBAlpha,
            upperAdd, upperTransmittance);
        AccumulateLineSegment(p, upperMidBpx, nextUpperApx,
            colorB, colorA, currentBAlpha, nextAAlpha,
            upperAdd, upperTransmittance);

        AccumulateLineSegment(p, lowerApx, lowerMidApx,
            colorA, colorA, currentAAlpha, currentAAlpha,
            lowerAdd, lowerTransmittance);
        AccumulateLineSegment(p, lowerMidApx, lowerBpx,
            colorA, colorB, currentAAlpha, currentBAlpha,
            lowerAdd, lowerTransmittance);
        AccumulateLineSegment(p, lowerBpx, lowerMidBpx,
            colorB, colorB, currentBAlpha, currentBAlpha,
            lowerAdd, lowerTransmittance);
        AccumulateLineSegment(p, lowerMidBpx, nextLowerApx,
            colorB, colorA, currentBAlpha, nextAAlpha,
            lowerAdd, lowerTransmittance);

        previousUpperB = currentUpperB;
        previousLowerB = currentLowerB;
        currentUpperA = nextUpperA;
        currentUpperB = nextUpperB;
        currentLowerA = nextLowerA;
        currentLowerB = nextLowerB;
        currentAAlpha = nextAAlpha;
        currentBAlpha = nextBAlpha;
    }

    float2 finalUpperMid = SmoothPoint(previousUpperB, currentUpperA,
        currentUpperB, currentUpperB);
    float2 finalLowerMid = SmoothPoint(previousLowerB, currentLowerA,
        currentLowerB, currentLowerB);
    AccumulateLineSegment(p, ToPixels(currentUpperA, size),
        ToPixels(finalUpperMid, size), colorA, colorA,
        currentAAlpha, currentAAlpha, upperAdd, upperTransmittance);
    AccumulateLineSegment(p, ToPixels(finalUpperMid, size),
        ToPixels(currentUpperB, size), colorA, colorB,
        currentAAlpha, currentBAlpha, upperAdd, upperTransmittance);
    AccumulateLineSegment(p, ToPixels(currentLowerA, size),
        ToPixels(finalLowerMid, size), colorA, colorA,
        currentAAlpha, currentAAlpha, lowerAdd, lowerTransmittance);
    AccumulateLineSegment(p, ToPixels(finalLowerMid, size),
        ToPixels(currentLowerB, size), colorA, colorB,
        currentAAlpha, currentBAlpha, lowerAdd, lowerTransmittance);
}

float3 DottedLayers(float2 p, float2 size, float q1, float3 color) {
    // wavecode_2 and wavecode_3 are additive thick point lists. Their source
    // point size is 2 px below a 1024-wide surface and 3 px at/above it.
    const int pairs = 128;
    float halfSize = size.x >= 1024.0 ? 1.5 : 1.0;
    float t8 = floor(sin(time * 2.0) * 2.0 + 3.0);
    float3 result = 0.0;

    [fastopt]
    for (int pair = 0; pair < pairs; ++pair) {
        float sampleA = (float)pair / (float)(pairs - 1);
        float sampleB = min(sampleA + 1.0 / 511.0, 1.0);
        float tmA = q1 - sampleA * 0.2;
        float tmB = q1 - sampleB * 0.2;
        float gateA = sin(tmA * 128.0 * t8) > 0.0 ? 1.0 : 0.0;
        float gateB = sin(tmB * 128.0 * t8) > 0.0 ? 1.0 : 0.0;

        float2 upperA = ToPixels(
            ArmPoint(sampleA, q1, false, true, 1.0), size);
        float2 upperB = ToPixels(
            ArmPoint(sampleB, q1, false, false, 1.0), size);
        float2 lowerA = ToPixels(
            ArmPoint(sampleA, q1, true, true, 1.0), size);
        float2 lowerB = ToPixels(
            ArmPoint(sampleB, q1, true, false, 1.0), size);

        float coverUpperA = all(abs(p - upperA) <= halfSize) ? 1.0 : 0.0;
        float coverUpperB = all(abs(p - upperB) <= halfSize) ? 1.0 : 0.0;
        float coverLowerA = all(abs(p - lowerA) <= halfSize) ? 1.0 : 0.0;
        float coverLowerB = all(abs(p - lowerB) <= halfSize) ? 1.0 : 0.0;
        result += color * gateA * (
            sampleA * coverUpperA + sampleA * sampleA * coverLowerA);
        result += color * gateB * (
            sampleB * coverUpperB + sampleB * sampleB * coverLowerB);
    }
    return result;
}

float Cross2(float2 a, float2 b) {
    return a.x * b.y - a.y * b.x;
}

bool TriangleWeights(float2 p, float2 a, float2 b, float2 c,
                     out float3 weights) {
    float denominator = Cross2(b - a, c - a);
    if (abs(denominator) < 1e-5) {
        weights = 0.0;
        return false;
    }
    weights.y = Cross2(p - a, c - a) / denominator;
    weights.z = Cross2(b - a, p - a) / denominator;
    weights.x = 1.0 - weights.y - weights.z;
    return all(weights >= -0.0001);
}

float3 HandMarker(float2 p, float2 size, float q1) {
    float2 center = ToPixels(ProjectArm(0.1, q1, 0.0), size);
    float geometryAngle = cos(q1) * 0.5 - 0.5 + PI * 0.25;
    float aspectY = size.x > size.y ? size.y / size.x : 1.0;
    const float radius = 0.03809;

    [unroll]
    for (int side = 0; side < 5; ++side) {
        float a0 = (float)side / 5.0 * PI * 2.0 + geometryAngle;
        float a1 = (float)(side + 1) / 5.0 * PI * 2.0 + geometryAngle;
        float2 vertex0 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a0), -size.y * sin(a0));
        float2 vertex1 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a1), -size.y * sin(a1));
        float3 weights;
        if (TriangleWeights(p, center, vertex0, vertex1, weights)) {
            float3 color = weights.x * float3(1.0, 1.0, 1.0) +
                (weights.y + weights.z) * float3(0.0, 0.6, 1.0);
            return color * weights.x;
        }
    }
    return 0.0;
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

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 uvOriginal = p / size;
    float2 baseUv = input.texelSpacePos.xy;
    float step30 = max(frameStep * 0.5, 0.0005);

    float volume = DecodePositive(Previous.Load(int3(0, 0, 0)).rgb);
    float bass = DecodePositive(Previous.Load(int3(1, 0, 0)).rgb);
    float bassAtt = DecodePositive(Previous.Load(int3(2, 0, 0)).rgb);
    float4 phaseState = Previous.Load(int3(3, 0, 0));
    bool initialized = phaseState.a > 0.5;

    // per_frame_1..9. basstime is clamped to 1000 only after the first q1
    // value is published, so the first frame starts near zero and the next
    // one jumps into the preset author's chosen active range.
    float baseTime = UnpackUnitFloat(phaseState.rgb) * Q_PERIOD;
    float q1 = initialized ? baseTime + bass * 0.06 : bass * 0.06;
    float nextBaseTime = initialized
        ? baseTime + (bass + bassAtt) * 0.03 * step30
        : 1000.0 + bassAtt * 0.03 * step30;
    float nextPhase = frac(nextBaseTime / Q_PERIOD);

    // per_frame_13..40: two alternating one-second volume buffers. The active
    // buffer is cleared at a transition after receiving the boundary sample,
    // exactly matching the equation order in the preset.
    float4 state0 = Previous.Load(int3(4, 0, 0));
    float4 state1 = Previous.Load(int3(5, 0, 0));
    float average0 = DecodeAverage(state0.r);
    float average1 = DecodeAverage(state1.r);
    float count0 = saturate(state0.g) * 64.0;
    float count1 = saturate(state1.g) * 64.0;
    float previousSticky = state0.b > 0.5 ? 1.0 : 0.0;
    float sticky = fmod(floor(max(time, 0.0)), 2.0);
    bool edge = initialized && abs(sticky - previousSticky) > 0.5;

    if (sticky > 0.5) {
        average1 = (average1 * count1 + volume * step30) /
                   max(count1 + step30, step30);
        count1 = min(count1 + step30, 64.0);
        if (edge) {
            average1 = 0.0;
            count1 = 0.0;
        }
    } else {
        average0 = (average0 * count0 + volume * step30) /
                   max(count0 + step30, step30);
        count0 = min(count0 + step30, 64.0);
        if (edge) {
            average0 = 0.0;
            count0 = 0.0;
        }
    }

    float referenceAverage = sticky > 0.5 ? average0 : average1;
    float referenceCount = sticky > 0.5 ? count0 : count1;
    float q3 = referenceCount > 0.5 && referenceAverage > 1e-6
        ? volume / referenceAverage : 0.0;

    if (p.y < 1.0 && p.x < 6.0) {
        if (p.x < 3.0)
            return float4(0.0, 0.0, 0.0, 0.0);
        if (p.x < 4.0)
            return float4(PackUnitFloat(nextPhase), 1.0);
        if (p.x < 5.0)
            return float4(EncodeAverage(average0), count0 / 64.0,
                          sticky, 1.0);
        return float4(EncodeAverage(average1), count1 / 64.0,
                      0.0, 1.0);
    }

    float2 meshUv = MeshUV(uvOriginal, size, q3, step30);
    float2 uv = baseUv + (meshUv - uvOriginal);

    // Custom warp shader. sampler_main is an unsuffixed MilkDrop sampler and
    // therefore uses bilinear wrapping independently of bTexWrap at 30 Hz.
    // HistoryWrap compensates repeated filtering only for shorter steps.
    float2 screenDelta = uvOriginal - 0.5;
    float2 mathDirection = normalize(float2(screenDelta.x, -screenDelta.y) +
        float2(1e-8, 0.0));
    float2 tangent = float2(mathDirection.y, mathDirection.x);
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float angle = atan2(screenDelta.y * aspect.y,
                        screenDelta.x * aspect.x);
    float displacement = cos(angle * 20.0 - time * 7.0) * 10.0 * step30;
    uv += tangent * displacement / size;

    float3 result = HistoryWrap(uv, size);
    float decay = pow(0.83, step30);
    result = result * decay - (0.004 * 0.83 / 0.17) * (1.0 - decay);
    result=DitherDecay(result,decay,(.004*.83/.17)*(1.0-decay),.83,.004*.83,input.sceneSpacePos.xy);
    result = saturate(result);

    // Draw order from foo_vis_milk2: custom shape, wave 0, wave 1,
    // additive wave 2, additive wave 3.
    result = saturate(result + HandMarker(p, size, q1) * step30);

    float3 colorA = 0.5 + 0.5 * sin(time + float3(0.0, 2.1, 4.2));
    float3 colorB = 0.5 + 0.5 * sin(time + float3(1.1, 3.1, 5.2));
    float3 upperAdd;
    float3 lowerAdd;
    float upperTransmittance;
    float lowerTransmittance;
    LineLayers(p, size, q1, colorA, colorB, upperAdd,
        upperTransmittance, lowerAdd, lowerTransmittance);
    float upperLoss30 = 1.0 - saturate(upperTransmittance);
    float upperNextTransmittance = pow(
        saturate(upperTransmittance), step30);
    upperAdd *= upperLoss30 > 0.000001
        ? (1.0 - upperNextTransmittance) / upperLoss30 : step30;
    upperTransmittance = upperNextTransmittance;
    float lowerLoss30 = 1.0 - saturate(lowerTransmittance);
    float lowerNextTransmittance = pow(
        saturate(lowerTransmittance), step30);
    lowerAdd *= lowerLoss30 > 0.000001
        ? (1.0 - lowerNextTransmittance) / lowerLoss30 : step30;
    lowerTransmittance = lowerNextTransmittance;
    result = upperAdd + result * upperTransmittance;
    result = lowerAdd + result * lowerTransmittance;
    result += DottedLayers(p, size, q1, colorB) * step30;

    return float4(saturate(result), 1.0);
}`;

    const compShader = `
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

bool IsControlPixel(float2 uv, float2 size) {
    float2 pixel = uv * size;
    return pixel.x < 6.5 && pixel.y < 1.5;
}

float3 FrameClamp(float2 uv, float2 size) {
    uv = saturate(uv);
    if (IsControlPixel(uv, size)) return 0.0;
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}

float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(0.974358974, 2.90625,
                                  4.774193548, 6.6);
    const float weightDivisor = 0.027322404;
    float2 alignedUv = uv + 1.0 / size;
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 offset = float2(offsets[i] / size.x, 0.0);
        value += (FrameClamp(alignedUv + offset, size) +
                  FrameClamp(alignedUv - offset, size)) * weights[i];
    }
    return value * weightDivisor;
}

float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(0.901408451, 2.487804878);
    const float weightDivisor = 0.027322404;
    float2 alignedUv = uv + float2(2.0 / size.x, 0.0);
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 offset = float2(0.0, offsets[i] * 2.0 / size.y);
        value += (Blur1Horizontal(alignedUv + offset, size) +
                  Blur1Horizontal(alignedUv - offset, size)) * weights[i];
    }
    value *= weightDivisor;

    // b1ed=.300. Only the first vertical blur pass applies edge darkening.
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.7 + 0.3 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float3 Blur3(float2 uv, float2 size) {
    // MilkDrop exposes Blur3 after six successively downsampled separable
    // passes. The public post stage has one input, so evaluate a compact broad
    // nine-tap kernel over the completed frame at the equivalent scale.
    float2 axis = 52.0 / size;
    float2 diagonal = 38.0 / size;
    float3 value = FrameClamp(uv, size) * 0.20;
    value += FrameClamp(uv + float2( axis.x, 0.0), size) * 0.12;
    value += FrameClamp(uv + float2(-axis.x, 0.0), size) * 0.12;
    value += FrameClamp(uv + float2(0.0,  axis.y), size) * 0.12;
    value += FrameClamp(uv + float2(0.0, -axis.y), size) * 0.12;
    value += FrameClamp(uv + float2( diagonal.x,  diagonal.y), size) * 0.08;
    value += FrameClamp(uv + float2(-diagonal.x,  diagonal.y), size) * 0.08;
    value += FrameClamp(uv + float2( diagonal.x, -diagonal.y), size) * 0.08;
    value += FrameClamp(uv + float2(-diagonal.x, -diagonal.y), size) * 0.08;
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    return value * (0.7 + 0.3 * saturate(sqrt(max(edge, 0.0)) * 5.0));
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    if (input.sceneSpacePos.x < 6.5 && input.sceneSpacePos.y < 1.5)
        return float4(0.0, 0.0, 0.0, 1.0);

    float2 uv = input.texelSpacePos.xy;
    float2 mirrorUv = float2(1.0 - uv.x, uv.y);
    float3 mainSample = FrameClamp(uv, size);
    float3 mirrorSample = FrameClamp(mirrorUv, size);
    float3 blur1 = Blur1(uv, size);
    float3 blur1Mirror = Blur1(mirrorUv, size);
    float3 blur3 = Blur3(uv, size);
    float3 blur3Mirror = Blur3(mirrorUv, size);

    float3 result = mainSample.xxx + mirrorSample.xxx;
    float3 blurs = blur1.xxx + blur3.xxx +
                   blur1Mirror.xxx + blur3Mirror.xxx;
    float2 uv3 = (uv - 0.5) * (1.0 - blur1.zz) + 0.5;
    result += saturate(sqrt(max(FrameClamp(uv3, size).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result += saturate(sqrt(max(Blur1(uv3, size).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result = lerp(blurs, result, result);

    float3 roamCos = 0.5 + 0.5 * cos(
        time * float3(0.329, 1.293, 5.070) +
        float3(1.2, 3.9, 2.5));
    result = pow(max(result, 0.0), 0.5 + 4.0 * roamCos);

    float greenSum = FrameClamp(float2(uv.x, 1.0 - uv.y), size).g +
                     FrameClamp(1.0 - uv, size).g;
    result += pow(max(greenSum, 0.0), float3(0.6, 0.95, 5.0));
    result = 1.0 - exp(-2.0 * result);
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0329",
        sourceId: 5, // VisSourceType.Vectorscope
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader
        }
    };
};
