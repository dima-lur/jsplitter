// MilkDrop 0119 — articulated ribbons in animated monochrome noise
//
// Ported from vis/milkdrop/0119.milk and the corresponding foo_vis_milk2
// rendering paths. Four procedural custom waves form two articulated arms:
// two normal-blended SmoothWave line strips and two additive dotted strips.
//
// The source pass evaluates the preset's instantaneous audio expression for
// q1 and stores it in one private history pixel. The feedback pass applies the
// 48 x 36 MilkDrop mesh, the custom random-noise warp and the four waves. That
// pixel is excluded from history filtering and from the final image.
//
// The original preset is evaluated at approximately 30 Hz. Mesh motion and
// geometry opacity are normalized to that cadence while TARGET_FPS controls
// evaluation frequency. The custom comp shader adds edge-darkened Blur1 and
// applies its RGB power palette.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0119"] = function (TARGET_FPS) {

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
    float frameStep; // 60-Hz units, matched to feedback history cadence.
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

    if (p.y < 1.0 && p.x < 1.0) {
        float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
        float mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0.0);
        float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
        float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
        float midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0.0);
        float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);
        float weighted = 1.0 + 1.2 * bass + 0.4 * bassAtt +
                         0.1 * (treb + trebAtt + mid + midAtt);
        float q1 = 0.05 * pow(weighted, 6.0) * (frameStep / 60.0);
        return float4(PackPositive(q1), 1.0);
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

float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float DecodePositive(float3 encoded) {
    float unit = min(UnpackUnitFloat(encoded), 0.99999);
    return unit / max(1.0 - unit, 0.00001);
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
    if (pixel.y == 0 && pixel.x < 1) return 0.0;
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

float3 HistoryWrap(float2 uv, float2 size) {
    return SampleHistory(uv, size, true);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float q1,
                    float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);

    float radius = length(vertexPos * aspect);
    float zoom = max(0.99752 + radius * 0.1 * q1, 0.05);
    float zoomExponent = pow(0.99983, radius * 2.0 - 1.0);
    float zoomed = pow(zoom, zoomExponent);
    float zoomStep = pow(zoomed, step30);
    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5 / zoomStep,
        0.5 - vertexPos.y * aspect.y * 0.5 / zoomStep);

    // Built-in mesh warp: speed=1, scale=2.853, amount=.01565.
    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 +  7.0),
        10.54 + 3.0 * cos(time * 1.233 +  3.0),
        11.49 + 4.0 * cos(time * 0.933 +  5.0));
    float2 scaledVertex = vertexPos * (1.0 / 2.853);
    float amount = 0.01565 * 0.0035 * step30;
    float uDelta = sin(time * 0.333 +
        scaledVertex.x * factors.x - scaledVertex.y * factors.w);
    uDelta += cos(time * 0.753 -
        scaledVertex.x * factors.y + scaledVertex.y * factors.z);
    float vDelta = cos(time * 0.375 -
        scaledVertex.x * factors.z - scaledVertex.y * factors.y);
    vDelta += sin(time * 0.825 +
        scaledVertex.x * factors.x + scaledVertex.y * factors.w);
    uv += amount * float2(uDelta, vDelta);
    return 0.5 + (uv - 0.5) / aspect;
}

float2 MeshUV(float2 uvOriginal, float2 size, float q1, float step30) {
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
    float2 a = WarpVertexUV(cornerA, size, q1, step30);
    float2 b = WarpVertexUV(cornerB, size, q1, step30);
    float2 c = WarpVertexUV(cornerC, size, q1, step30);
    return weight.x * a + weight.y * b + weight.z * c;
}

float MeshRadius(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;
    float radius00 = length((corner00 * 2.0 - 1.0) * aspect);
    float radius10 = length((corner10 * 2.0 - 1.0) * aspect);
    float radius01 = length((corner01 * 2.0 - 1.0) * aspect);
    float radius11 = length((corner11 * 2.0 - 1.0) * aspect);

    if (f.x + f.y <= 1.0)
        return (1.0 - f.x - f.y) * radius00 +
               f.x * radius10 + f.y * radius01;
    return (1.0 - f.y) * radius10 + (1.0 - f.x) * radius01 +
           (f.x + f.y - 1.0) * radius11;
}

float3 HistoryPointWrap(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 wrapped = frac(uv);
    int2 pixel = min(int2(floor(wrapped * size)), dimensions - 1);
    if (pixel.x == 0 && pixel.y == 0) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float4 NoiseTexel(int2 pixel) {
    float2 p = fmod(float2(pixel) + 256.0, 256.0);
    float4 phase = float4(
        dot(p, float2(127.1, 311.7)),
        dot(p, float2(269.5, 183.3)),
        dot(p, float2(419.2, 371.9)),
        dot(p, float2(112.7, 257.4)));
    return frac(sin(phase) * 43758.5453123);
}

float4 NoiseLq(float2 uv) {
    // sampler_noise_lq is a fixed 256 x 256 RGBA8 random texture. Its
    // unsuffixed sampler is bilinear and wraps.
    float2 texel = frac(uv) * 256.0 - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float4 top = lerp(NoiseTexel(base), NoiseTexel(base + int2(1, 0)),
                      fraction.x);
    float4 bottom = lerp(NoiseTexel(base + int2(0, 1)),
                         NoiseTexel(base + int2(1, 1)), fraction.x);
    return lerp(top, bottom, fraction.y);
}

float2 RandomFrameOffset() {
    float frame = floor(max(time, 0.0) * (60.0 / frameStep));
    return frac(sin(frame * float2(12.9898, 78.233) +
                    float2(37.719, 19.913)) * 43758.5453123);
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

    angle = 3.14 + sin(tm * 2.0 - 0.5) * 1.5;
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

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 uvOriginal = p / size;
    float2 baseUv = input.texelSpacePos.xy;
    float step30 = max(frameStep * 0.5, 0.0005);

    float q1 = DecodePositive(Previous.Load(int3(0, 0, 0)).rgb);
    // The source transports the original per-frame expression, including
    // its 1/fps factor. Here q1 is an instantaneous pose/zoom parameter, not
    // an accumulated clock. Recover its 30-Hz value before using it in the
    // arms and mesh; MeshUV already scales motion by step30 separately.
    if (step30 < 1.0) q1 /= step30;
    if (p.x < 1.0 && p.y < 1.0)
        return float4(0.0, 0.0, 0.0, 0.0);

    float2 meshUv = MeshUV(uvOriginal, size, q1, step30);
    float2 uv = baseUv + (meshUv - uvOriginal);

    // Custom warp shader. sampler_noise_lq is bilinear-wrap; sampler_pw_main
    // is point-wrap. rand_frame supplies a fresh texture offset every frame.
    float2 noiseUv = RandomFrameOffset() + uv * size / 256.0;
    float4 noise = NoiseLq(noiseUv) * 2.0 - 1.0;
    float3 history = HistoryPointWrap(uv + noise.zw * 0.5 / size, size);
    float radius = MeshRadius(uvOriginal, size);
    float3 warped = history + (0.59 - 0.1 * radius) * noise.xyz;
    warped = saturate((warped - 0.5) * 3.0 + 0.25);
    warped.yz = warped.xx;

    // A fractional feedback step blends the nonlinear custom pass with its
    // input; at 30 Hz step30 is one and the preset body is reproduced exactly.
    float3 result = lerp(history, warped, saturate(step30));

    // Draw order from foo_vis_milk2: wave 0, wave 1, additive waves 2 and 3.

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
    return pixel.x < 1.5 && pixel.y < 1.5;
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

    // b1ed=.250. Only the first vertical blur pass applies edge darkening.
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.75 + 0.25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    if (input.sceneSpacePos.x < 1.5 && input.sceneSpacePos.y < 1.5)
        return float4(0.0, 0.0, 0.0, 1.0);

    float2 uv = input.texelSpacePos.xy;
    float3 result = FrameClamp(uv, size) + Blur1(uv, size) * 0.4;
    result = pow(max(result, 0.0), float3(0.5, 0.8, 1.7));
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0119",
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
