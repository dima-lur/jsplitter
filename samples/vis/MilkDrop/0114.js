// MilkDrop 0114 — wandering dotted spiral with multi-sampled feedback
//
// The preset has no custom waves or shapes. Its visible layers are:
//   shader   - the additive dotted built-in mode-1 waveform and dark center;
//   feedback - the 48x36 mesh transform followed by the custom warp shader;
//   post     - the preset's identity custom composite.
// 30 FPS is the reference. TARGET_FPS advances both history and repaint.
// Higher rates use smaller history steps and distribute full-strength dots
// across more frames, preserving their emission rate and individual brightness.
// The nonlinear feedback remains an approximation of the 30-FPS appearance.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0114"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    const shader = `
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RightPCM : register(t1);
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

float PointCoverage(float2 p, float2 pointPosition, float halfSize, int pointIndex) {
    const float dotDensity = saturate(frameStep * 0.5);
    if (dotDensity < 1.0) {
        // A rotating subset preserves the 30-Hz dot rate without dimming dots.
        // Offset each point's phase to spread selection thresholds evenly.
        float rank = frac((float(pointIndex) + 0.5) * 0.61803398875);
        float phase = frac(frac(time) * 30.0);
        if (frac(rank + phase) >= dotDensity) return 0.0;
    }
    float2 distance = abs(p - pointPosition);
    return all(distance <= halfSize) ? 1.0 : 0.0;
}

float2 ReadWavePoint(int vertex, int sourceStart, float2 size,
                     float2 waveCenter, inout float leftSmooth,
                     inout float rightSmooth) {
    // MilkDrop scales and recursively smooths the 576 PCM samples before
    // mode 1 reads right[i] and left[i+32].
    const float waveScale = 3.436;
    const float smoothing = 0.540;
    float leftRaw = clamp(LeftPCM.Load(
        int3(sourceStart + vertex + 32, 0, 0)).r, -1.0, 1.0);
    float rightRaw = clamp(RightPCM.Load(
        int3(sourceStart + vertex, 0, 0)).r, -1.0, 1.0);
    leftSmooth = leftRaw * waveScale * (1.0 - smoothing) +
                 leftSmooth * smoothing;
    rightSmooth = vertex == 0
        ? rightRaw * waveScale
        : rightRaw * waveScale * (1.0 - smoothing) +
          rightSmooth * smoothing;

    float radius = 0.53 + 0.43 * rightSmooth - 0.4;
    float angle = leftSmooth * 1.57 + time * 2.3;
    float radiusPixels = 0.5 * min(size.x, size.y) * radius;
    return waveCenter + radiusPixels * float2(cos(angle), sin(angle));
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;

    float motionTime = time * 6.0;
    float2 waveCenter = size * float2(
        0.5 + 0.3 * (0.6 * sin(0.374 * motionTime) +
                     0.4 * sin(0.294 * motionTime)),
        0.5 + 0.3 * (0.6 * sin(0.393 * motionTime) +
                     0.4 * sin(0.223 * motionTime)));

    float coverage = 0.0;
    int count = (int)pointCount;
    int usable = min(count, 576);
    int vertexCount = min(240, usable - 32);
    if (vertexCount >= 3 &&
        length(p - waveCenter) <= 1.1 * min(size.x, size.y)) {
        int sourceStart = max(count - usable, 0);
        const float waveScale = 3.436;
        const float smoothing = 0.540;

        // Prime the left-channel recurrence through sample 31 so the first
        // visible point reads the correctly smoothed left[32].
        float leftRaw = clamp(
            LeftPCM.Load(int3(sourceStart, 0, 0)).r, -1.0, 1.0);
        float leftSmooth = leftRaw * waveScale;
        [loop]
        for (int primeIndex = 1; primeIndex < 32; ++primeIndex) {
            leftRaw = clamp(LeftPCM.Load(
                int3(sourceStart + primeIndex, 0, 0)).r, -1.0, 1.0);
            leftSmooth = leftRaw * waveScale * (1.0 - smoothing) +
                         leftSmooth * smoothing;
        }

        float rightSmooth = 0.0;
        float2 below = ReadWavePoint(
            0, sourceStart, size, waveCenter, leftSmooth, rightSmooth);
        float2 a = below;
        float2 b = ReadWavePoint(
            1, sourceStart, size, waveCenter, leftSmooth, rightSmooth);
        float dotHalfSize = size.x >= 512.0 ? 1.0 : 0.5;

        // SmoothWave emits each raw point followed by an interpolated point.
        // bWaveDots then draws that 479-point list as 2x2 additive dots when
        // the render texture is at least 512 pixels wide.
        [loop]
        for (int vertex = 2; vertex < 240; ++vertex) {
            if (vertex >= vertexCount) break;
            float2 c = ReadWavePoint(
                vertex, sourceStart, size, waveCenter,
                leftSmooth, rightSmooth);
            float2 midpoint = (-0.15 * below + 1.15 * a +
                                1.15 * b - 0.15 * c) * 0.5;
            int pointIndex = 2 * (vertex - 2);
            coverage += PointCoverage(p, a, dotHalfSize, pointIndex);
            coverage += PointCoverage(p, midpoint, dotHalfSize, pointIndex + 1);
            below = a;
            a = b;
            b = c;
        }

        float2 lastMidpoint = (-0.15 * below + 1.15 * a +
                                1.15 * b - 0.15 * b) * 0.5;
        int lastPointIndex = 2 * (vertexCount - 2);
        coverage += PointCoverage(p, a, dotHalfSize, lastPointIndex);
        coverage += PointCoverage(p, lastMidpoint, dotHalfSize, lastPointIndex + 1);
        coverage += PointCoverage(p, b, dotHalfSize, lastPointIndex + 2);
    }

    float3 presetColor = saturate(float3(
        0.5 + 0.65 * (0.6 * sin(1.437 * time) +
                      0.4 * sin(0.970 * time)),
        0.5 + 0.65 * (0.6 * sin(1.344 * time) +
                      0.4 * sin(0.841 * time)),
        0.5 + 0.65 * (0.6 * sin(1.251 * time) +
                      0.4 * sin(1.055 * time))));
    float colorMaximum = max(max(presetColor.r, presetColor.g), presetColor.b);
    if (colorMaximum > 0.01) presetColor /= colorMaximum;
    presetColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;

    float relativeVolume = (
        RelativeBands.Load(int3(0, 0, 0)).r +
        RelativeBands.Load(int3(1, 0, 0)).r +
        RelativeBands.Load(int3(2, 0, 0)).r) * 0.333;
    float waveAlpha = saturate(
        0.220 * 1.25 * (relativeVolume - 0.970) / (1.800 - 0.970));
    if (waveAlpha < 0.004) waveAlpha = 0.0;
    waveAlpha = floor(waveAlpha * 255.0 + 0.5) / 255.0;

    // foo_vis_milk2 0.10.0 uses RGB and rounded 8-bit vertex colors.
    // Additive drawing is represented by RGB with zero alpha.
    float3 additiveWave = presetColor * coverage * waveAlpha;

    // DrawSprites applies bDarkenCenter after the additive waveform. The
    // triangle fan forms a small diamond with 3/32 opacity at its center.
    float radiusPixels = 0.025 * min(size.x, size.y);
    float diamond = saturate(1.0 -
        (abs(p.x - 0.5 * size.x) + abs(p.y - 0.5 * size.y)) /
        max(radiusPixels, 1.0));
    float darkAlpha30 = diamond * (3.0 / 32.0);
    float darkAlpha = darkAlpha30; // No pow() at the 30-Hz reference.
    [branch]
    if (frameStep < 2.0)
        darkAlpha = 1.0 - pow(1.0 - darkAlpha30, frameStep * 0.5);

    // One source-over operation reproduces the additive dots followed by the
    // black dark-center overlay: C + history*(1-A).
    return float4(additiveWave * (1.0 - darkAlpha), darkAlpha);
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
    float mathX = 0.5 + vertexPos.x * aspect.x * 0.5;
    float mathY = 0.5 - vertexPos.y * aspect.y * 0.5;

    float zoom = 1.01035 + 0.01 * (
        0.6 * sin(0.3131 * time + 2.0) +
        0.4 * sin(-0.479 * time + 4.0));
    float rotation = 0.01 * (
        0.60 * sin(0.181 * time) + 0.09 * sin(-0.279 * time));
    float zoomStep = pow(max(zoom, 0.0001), step30);
    float rotationStep = rotation * step30;

    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5 / zoomStep,
        0.5 - vertexPos.y * aspect.y * 0.5 / zoomStep);

    float warpTime = time * 1.348;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    const float warpScaleInverse = 1.0 / 1.160;
    float warpAmount = 0.08979 * 0.0035 * step30;
    float uDelta = sin(warpTime * 0.333 + warpScaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - warpScaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - warpScaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + warpScaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += warpAmount * float2(uDelta, vDelta);

    float sineRotation;
    float cosineRotation;
    sincos(rotationStep, sineRotation, cosineRotation);
    float2 centered = uv - 0.5;
    uv = float2(cosineRotation * centered.x - sineRotation * centered.y,
                sineRotation * centered.x + cosineRotation * centered.y) + 0.5;

    // The preset's base dx/dy are zero; its per-pixel equations add two
    // independent ripples measured in source texels.
    float dx = (2.0 * cos(mathY * 29.37 - time * 1.9) +
                1.5 * cos(mathY * 77.55 - time * 2.1)) / size.x;
    float dy = (2.0 * cos(mathX * 33.21 - time * 1.7) +
                1.5 * cos(mathX * 78.32 - time * 2.4)) / size.y;
    uv -= float2(dx, dy) * step30;

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

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * 0.5, 0.0005);
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 texelUv = input.texelSpacePos.xy;
    float2 meshUv = MeshUV(uvOriginal, size, step30);
    float2 uv = texelUv + (meshUv - uvOriginal);

    // The custom warp keeps the brightest history sample at six evenly
    // spaced positions from the original coordinate to the mesh coordinate.
    float3 result = HistoryWrap(texelUv);
    result = max(result, HistoryWrap(lerp(texelUv, uv, 0.2)));
    result = max(result, HistoryWrap(lerp(texelUv, uv, 0.4)));
    result = max(result, HistoryWrap(lerp(texelUv, uv, 0.6)));
    result = max(result, HistoryWrap(lerp(texelUv, uv, 0.8)));
    result = max(result, HistoryWrap(uv));
    // The history is 8-bit: fractional per-frame fade can round away or grow.
    // Distribute whole levels over time; at 30/60/120 FPS the correction is zero.
    float fadeLevels = 4.0 * step30;
    float fadePhase = frac(frac(time) * 120.0 + 0.381966);
    float fadeCorrection = floor(fadeLevels + fadePhase) - fadeLevels;
    result -= 0.016 * step30 + fadeCorrection / 255.0;
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

float4 main(PSInput input) : SV_Target {
    return float4(Frame.SampleLevel(
        Filter, input.texelSpacePos.xy, 0.0).rgb, 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0114",
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
