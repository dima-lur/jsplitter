// MilkDrop 0116 — twin diagonal waveforms through a checker-warped field
//
// The preset has no custom waves or shapes. Its visible layers are:
//   shader   - the additive built-in mode-7 left/right waveform pair;
//   feedback - the 48x36 mesh transform and alternating-pixel custom warp;
//   post     - the absolute difference between the frame and Blur1.
// TARGET_FPS controls history updates and repaint. Above 30 FPS, retain the
// reference checker-warp footprint and apply a fraction of its complete image
// update. Shrinking its two displacements instead changes the checker mixing
// and loses the fine structure revealed by the difference-from-blur composite.
// Source emission follows the same time step; unbiased UNORM8 rounding keeps
// small updates from disappearing. The 30-FPS path remains unchanged.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0116"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: false
    };

    const shader = `
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RightPCM : register(t1);

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

float DistanceToSegment(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * t);
}

float2 ToPixels(float2 nativePoint, float2 size) {
    // DrawWave negates native Y immediately before submitting its vertices.
    return float2((nativePoint.x + 1.0) * 0.5 * size.x,
                  (1.0 - nativePoint.y) * 0.5 * size.y);
}

float2 ReadSmoothedStereo(int sample, int sourceStart,
                          inout float2 smoothed, bool first) {
    const float waveScale = 1.372;
    const float smoothing = 0.171;
    float2 raw = clamp(float2(
        LeftPCM.Load(int3(sourceStart + sample, 0, 0)).r,
        RightPCM.Load(int3(sourceStart + sample, 0, 0)).r),
        -1.0, 1.0) * waveScale;
    smoothed = first ? raw :
        raw * (1.0 - smoothing) + smoothed * smoothing;
    return smoothed;
}

void WavePoints(int vertex, float2 amplitudes, float2 edgeStart,
                float2 lineStep, float2 perpendicular, float2 size,
                out float2 leftPoint, out float2 rightPoint) {
    float2 base = edgeStart + lineStep * vertex;
    // wave_y=.45 becomes a channel separation of wave_y squared.
    const float separation = 0.2025;
    leftPoint = ToPixels(base + perpendicular *
        (0.25 * amplitudes.x + separation), size);
    rightPoint = ToPixels(base + perpendicular *
        (0.25 * amplitudes.y - separation), size);
}

float SegmentCoverage(float2 p, float2 a, float2 b) {
    return 1.0 - smoothstep(0.15, 1.25, DistanceToSegment(p, a, b));
}


// Round fractional source/transport values without a systematic UNORM8 bias.
// Use one random threshold for RGB to avoid independent colored speckles.
// Zero stays zero; this changes rounding, not the expected emitted energy.
float3 QuantizeStep(float3 value, float2 position, uint salt) {
    uint2 pixel = (uint2)floor(position);
    uint tick = (uint)floor(time * (60.0 / max(frameStep, .001)));
    uint hash = pixel.x * 1973u + pixel.y * 9277u + tick * 26699u + salt;
    hash = (hash ^ 61u) ^ (hash >> 16);
    hash *= 9u;
    hash ^= hash >> 4;
    hash *= 0x27d4eb2du;
    hash ^= hash >> 15;
    float random = (float)(hash & 0x00ffffffu) / 16777216.0;
    return floor(saturate(value) * 255.0 + random) / 255.0;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    int count = (int)pointCount;
    int usable = min(count, 576);
    int vertexCount = min(240, min(usable, (int)(size.x / 3.0)));
    if (vertexCount < 3) return float4(0.0, 0.0, 0.0, 0.0);

    int sourceStart = max(count - usable, 0);
    int sampleOffset = (usable - vertexCount) / 2;

    // Mode 7 first clips an angle-adjustable six-unit line to +/-1.1. Since
    // wave_x=.5 places it at the origin, the two clipped ends are symmetric.
    const float angle = -0.2512; // 1.57 * fWaveParam (-.160)
    float2 direction = float2(cos(angle), sin(angle));
    float halfLength = min(1.1 / max(abs(direction.x), 1e-5),
                           1.1 / max(abs(direction.y), 1e-5));
    float2 edgeStart = -direction * halfLength;
    float2 edgeEnd = direction * halfLength;
    float2 lineStep = (edgeEnd - edgeStart) / vertexCount;
    float lineAngle = atan2(lineStep.y, lineStep.x);
    float2 perpendicular = float2(cos(lineAngle + 1.57),
                                  sin(lineAngle + 1.57));

    // BuildWaves recursively smooths all 576 PCM values before the visible
    // centered subsection is selected. Prime both channels through its first
    // visible sample, then advance them once per raw waveform vertex.
    float2 smoothed = 0.0;
    [loop]
    for (int sample = 0; sample < 576; ++sample) {
        if (sample >= usable) break;
        ReadSmoothedStereo(sample, sourceStart, smoothed, sample == 0);
        if (sample >= sampleOffset) break;
    }

    float2 leftBelow, rightBelow;
    WavePoints(0, smoothed, edgeStart, lineStep, perpendicular, size,
               leftBelow, rightBelow);
    float2 leftA = leftBelow;
    float2 rightA = rightBelow;

    ReadSmoothedStereo(sampleOffset + 1, sourceStart, smoothed, false);
    float2 leftB, rightB;
    WavePoints(1, smoothed, edgeStart, lineStep, perpendicular, size,
               leftB, rightB);

    float coverage = 0.0;
    // SmoothWave processes each channel separately, inserting a four-point
    // interpolated vertex between every pair. The two strips are additive.
    [loop]
    for (int vertex = 2; vertex < 240; ++vertex) {
        if (vertex >= vertexCount) break;
        ReadSmoothedStereo(sampleOffset + vertex, sourceStart,
                           smoothed, false);
        float2 leftC, rightC;
        WavePoints(vertex, smoothed, edgeStart, lineStep, perpendicular, size,
                   leftC, rightC);
        float2 leftMid = (-0.15 * leftBelow + 1.15 * leftA +
                           1.15 * leftB - 0.15 * leftC) * 0.5;
        float2 rightMid = (-0.15 * rightBelow + 1.15 * rightA +
                            1.15 * rightB - 0.15 * rightC) * 0.5;
        coverage += SegmentCoverage(p, leftA, leftMid);
        coverage += SegmentCoverage(p, leftMid, leftB);
        coverage += SegmentCoverage(p, rightA, rightMid);
        coverage += SegmentCoverage(p, rightMid, rightB);
        leftBelow = leftA;
        leftA = leftB;
        leftB = leftC;
        rightBelow = rightA;
        rightA = rightB;
        rightB = rightC;
    }

    float2 leftLastMid = (-0.15 * leftBelow + 1.15 * leftA +
                           1.15 * leftB - 0.15 * leftB) * 0.5;
    float2 rightLastMid = (-0.15 * rightBelow + 1.15 * rightA +
                            1.15 * rightB - 0.15 * rightB) * 0.5;
    coverage += SegmentCoverage(p, leftA, leftLastMid);
    coverage += SegmentCoverage(p, leftLastMid, leftB);
    coverage += SegmentCoverage(p, rightA, rightLastMid);
    coverage += SegmentCoverage(p, rightLastMid, rightB);

    float3 presetColor = saturate(float3(
        0.860 + 0.200 * (0.60 * sin(1.517 * time) +
                         0.40 * sin(1.580 * time)),
        0.610 + 0.200 * (0.60 * sin(1.088 * time) +
                         0.40 * sin(1.076 * time)),
        0.290 + 0.200 * (0.60 * sin(1.037 * time) +
                         0.40 * sin(0.922 * time))));
    float colorMaximum = max(max(presetColor.r, presetColor.g), presetColor.b);
    if (colorMaximum > 0.01) presetColor /= colorMaximum;
    // Modern DrawWave rounds vertex RGB to UNORM8 after normalization.
    presetColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;

    // Mode 7 uses alpha 1 without volume modulation and additive blending.
    float3 additiveWave = presetColor.rgb * coverage *
                          (frameStep * 0.5);
    if (frameStep < 2.0) additiveWave = QuantizeStep(additiveWave, p, 104729u);
    return float4(additiveWave, 0.0);
}`;

    const warpShader = `
Texture2D Previous : register(t0);
SamplerState PreviousSampler : register(s0);

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

float3 HistoryWrap(float2 uv) {
    return Previous.SampleLevel(PreviousSampler, frac(uv), 0.0).rgb;
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);

    float zoomStep = pow(0.970, step30);
    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5 / zoomStep,
        0.5 - vertexPos.y * aspect.y * 0.5 / zoomStep);

    float warpTime = time * 0.556;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    const float warpScaleInverse = 1.0 / 0.451;
    float warpAmount = 2.37248 * 0.0035 * step30;
    float uDelta = sin(warpTime * 0.333 + warpScaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - warpScaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - warpScaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + warpScaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += warpAmount * float2(uDelta, vDelta);

    float rotation = -0.020 + 0.020 * (
        0.60 * sin(0.381 * time) + 0.40 * sin(0.579 * time));
    float2 rotationCenter = float2(
        0.500 + 0.110 * (0.60 * sin(0.374 * time) +
                         0.40 * sin(0.294 * time)),
        0.500 + 0.110 * (0.60 * sin(0.393 * time) +
                         0.40 * sin(0.223 * time)));
    float sineRotation;
    float cosineRotation;
    sincos(rotation * step30, sineRotation, cosineRotation);
    float2 centered = uv - rotationCenter;
    uv = float2(cosineRotation * centered.x - sineRotation * centered.y,
                sineRotation * centered.x + cosineRotation * centered.y) +
         rotationCenter;

    return 0.5 + (uv - 0.5) / aspect;
}

float2 MeshUV(float2 uvOriginal, float2 size, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    float2 result;
    if (f.x + f.y <= 1.0) {
        float2 a = WarpVertexUV(corner00, size, step30);
        float2 b = WarpVertexUV(corner10, size, step30);
        float2 c = WarpVertexUV(corner01, size, step30);
        result = (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    } else {
        float2 a = WarpVertexUV(corner10, size, step30);
        float2 b = WarpVertexUV(corner01, size, step30);
        float2 c = WarpVertexUV(corner11, size, step30);
        result = (1.0 - f.y) * a + (1.0 - f.x) * b +
                 (f.x + f.y - 1.0) * c;
    }
    return result;
}

float RadiusAtMeshVertex(float2 uv, float2 aspect) {
    float2 vertex = float2(2.0 * uv.x - 1.0, 1.0 - 2.0 * uv.y);
    return length(vertex * aspect);
}

float MeshRadius(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));

    if (f.x + f.y <= 1.0) {
        float a = RadiusAtMeshVertex(corner00, aspect);
        float b = RadiusAtMeshVertex(corner10, aspect);
        float c = RadiusAtMeshVertex(corner01, aspect);
        return (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    }
    float a = RadiusAtMeshVertex(corner10, aspect);
    float b = RadiusAtMeshVertex(corner01, aspect);
    float c = RadiusAtMeshVertex(corner11, aspect);
    return (1.0 - f.y) * a + (1.0 - f.x) * b +
           (f.x + f.y - 1.0) * c;
}

// Round fractional source/transport values without a systematic UNORM8 bias.
// Use one random threshold for RGB to avoid independent colored speckles.
// Zero stays zero; this changes rounding, not the expected emitted energy.
float3 QuantizeStep(float3 value, float2 position, uint salt) {
    uint2 pixel = (uint2)floor(position);
    uint tick = (uint)floor(time * (60.0 / max(frameStep, .001)));
    uint hash = pixel.x * 1973u + pixel.y * 9277u + tick * 26699u + salt;
    hash = (hash ^ 61u) ^ (hash >> 16);
    hash *= 9u;
    hash ^= hash >> 4;
    hash *= 0x27d4eb2du;
    hash ^= hash >> 15;
    float random = (float)(hash & 0x00ffffffu) / 16777216.0;
    return floor(saturate(value) * 255.0 + random) / 255.0;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * 0.5, 0.0005);
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 texelUv = input.texelSpacePos.xy;
    // Preserve the full reference footprint on both checker branches.
    // The fractional update below scales their contribution instead of moving
    // their sample positions toward the current pixel.
    float motionStep = max(step30, 1.0);
    float2 meshUv = MeshUV(uvOriginal, size, motionStep);
    float2 uv = texelUv + (meshUv - uvOriginal);

    // The custom warp replaces the mesh coordinate on alternating pixels with
    // a .91 center zoom. uv_orig includes MilkDrop's texel alignment.
    float customZoom = pow(0.91, motionStep);
    float2 uv2 = (texelUv - 0.5) * customZoom + 0.5;
    float2 pix = texelUv * size;
    float evenOdd = saturate(2.0 * frac(
        (pix.x + pix.y) * 0.5 + 0.25));
    uv = lerp(uv, uv2, evenOdd);

    float radius = MeshRadius(uvOriginal, size);
    float retention30 = 0.8 + 0.17 * saturate(radius * 5.0);
    // If A is the complete 30-Hz warp+decay, advance by H+s*(A(H)-H).
    // Together with the additive source scaled by s, this preserves the
    // reference stationary equation H=A(H)+source. It also scales both the
    // drift and spatial spreading of the checker operator by elapsed time.
    // Every high-FPS frame still transports history and adds fresh source.
    float nativeRetention = pow(retention30, motionStep);
    float3 result = HistoryWrap(uv) * nativeRetention;
    if (step30 < 1.0)
        result = lerp(HistoryWrap(texelUv), result, step30);
    if (step30 < 1.0) result = QuantizeStep(result, input.sceneSpacePos.xy, 130363u);
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

float3 FrameClamp(float2 uv) {
    return Frame.SampleLevel(Filter, saturate(uv), 0.0).rgb;
}

// blur1_ps.fx combines its horizontal 8-tap and vertical 4-tap kernels into
// these bilinear 4/2-tap passes. b1ed=.25 darkens the first blur at the edge.
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
        value += (FrameClamp(alignedUv + offset) +
                  FrameClamp(alignedUv - offset)) * weights[i];
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
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.75 + 0.25 *
        saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float3 result = abs(FrameClamp(uv) - Blur1(uv, size)) * 3.80;
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0116",
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
