// MilkDrop 0110 — wandering audio spiral in a rippling feedback field
//
// The preset has no custom waves or shapes. Its visible layers are:
//   shader   - the additive built-in mode-1 waveform and dark center;
//   feedback - the 48x36 mesh transform followed by the custom warp shader;
//   post     - the completed frame mixed with MilkDrop's first blur level.
// TARGET_FPS controls history updates and repaint. Recursive
// displacement, retention, subtraction and source injection are normalized to
// the preset's original 30-Hz cadence.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0110"] = function (TARGET_FPS) {

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

float DistanceToSegment(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * t);
}

float2 WavePoint(int vertex, int sourceStart, float2 size,
                 float2 waveCenter) {
    // BuildWaves scales normalized PCM by fWaveScale before mode 1 reads the
    // right channel at i and the left channel 32 samples ahead.
    const float waveScale = 1.085;
    float left = clamp(LeftPCM.Load(
        int3(sourceStart + vertex + 32, 0, 0)).r, -1.0, 1.0) * waveScale;
    float right = clamp(RightPCM.Load(
        int3(sourceStart + vertex, 0, 0)).r, -1.0, 1.0) * waveScale;
    float radius = 0.53 + 0.43 * right - 0.4;
    float angle = left * 1.57 + time * 2.3;
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
        length(p - waveCenter) <= 0.31 * min(size.x, size.y)) {
        int sourceStart = max(count - usable, 0);
        float2 below = WavePoint(0, sourceStart, size, waveCenter);
        float2 a = below;
        float2 b = WavePoint(1, sourceStart, size, waveCenter);
        float nearest = 1e6;

        // SmoothWave inserts one four-point interpolated vertex between each
        // pair of the 240 raw mode-1 vertices.
        [loop]
        for (int vertex = 2; vertex < 240; ++vertex) {
            if (vertex >= vertexCount) break;
            float2 c = WavePoint(vertex, sourceStart, size, waveCenter);
            float2 midpoint = (-0.15 * below + 1.15 * a +
                                1.15 * b - 0.15 * c) * 0.5;
            nearest = min(nearest, DistanceToSegment(p, a, midpoint));
            nearest = min(nearest, DistanceToSegment(p, midpoint, b));
            below = a;
            a = b;
            b = c;
        }

        float2 lastMidpoint = (-0.15 * below + 1.15 * a +
                                1.15 * b - 0.15 * b) * 0.5;
        nearest = min(nearest, DistanceToSegment(p, a, lastMidpoint));
        nearest = min(nearest, DistanceToSegment(p, lastMidpoint, b));
        coverage = 1.0 - smoothstep(0.15, 1.25, nearest);
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

    float relativeVolume = (
        RelativeBands.Load(int3(0, 0, 0)).r +
        RelativeBands.Load(int3(1, 0, 0)).r +
        RelativeBands.Load(int3(2, 0, 0)).r) * 0.333;
    float waveAlpha = saturate(
        1.193 * 1.25 * (relativeVolume - 0.97) / (1.95 - 0.97));
    if (waveAlpha < 0.004) waveAlpha = 0.0;
    // Modern DrawWave quantizes RGBA after the visibility test.
    waveAlpha = floor(waveAlpha * 255.0 + 0.5) / 255.0;
    presetColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;

    // Modern foo_vis_milk2 0.10 uses RGB channel order.
    // Additive drawing is represented by premultiplied RGB with zero alpha.
    // Scale its injected energy linearly when the feedback cadence changes.
    float3 additiveWave = presetColor.rgb * coverage * waveAlpha *
                          (frameStep * 0.5);

    // DrawSprites applies bDarkenCenter after the additive waveform. The
    // triangle fan forms a small diamond with 3/32 opacity at its center.
    float radiusPixels = 0.025 * min(size.x, size.y);
    float diamond = saturate(1.0 -
        (abs(p.x - 0.5 * size.x) + abs(p.y - 0.5 * size.y)) /
        max(radiusPixels, 1.0));
    float darkAlpha30 = diamond * (3.0 / 32.0);
    float darkAlpha = darkAlpha30; // Fast path at the 30-Hz reference.
    [branch]
    if (frameStep < 2.0)
        darkAlpha = 1.0 - pow(saturate(1.0 - darkAlpha30), frameStep * 0.5);

    // One source-over operation now reproduces additiveWave followed by the
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

    float zoom = 1.002 + 0.025 * (
        0.6 * sin(0.3131 * time + 2.0) +
        0.4 * sin(-0.479 * time + 4.0));
    float rotation = 0.02 * (
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
    float warpAmount = 0.11951 * 0.0035 * step30;
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

    // The per-pixel equations reset dx/dy, then add two independent ripples
    // measured in source texels.
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
    float step30 = max(frameStep * 0.5, 0.0005);
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 texelUv = input.texelSpacePos.xy;
    float2 meshUv = MeshUV(uvOriginal, size, step30);
    float2 uv = texelUv + (meshUv - uvOriginal);

    // The custom warp offsets the mesh result with two high-frequency cosine
    // fields. sampler_fw_main and GetPixel are both bilinear-wrap here.
    const float frequencyScale = 1.12;
    float2 dxy;
    dxy.x = cos(texelUv.y * 138.0 * frequencyScale - time) +
            cos(texelUv.y * 368.0 * frequencyScale - time * 5.0);
    dxy.y = cos(texelUv.x * 138.0 * frequencyScale - time) +
            cos(texelUv.x * 368.0 * frequencyScale - time * 5.0) + 0.15;
    float2 shiftedUv = uv + dxy / size * step30;

    float3 warped = HistoryWrap(shiftedUv);
    float backupRetention = pow(0.8, step30);
    float3 original = HistoryWrap(texelUv) * backupRetention;
    float3 result = max(warped, original) - 0.004 * step30;

    result=DitherDecay(result,1.0,.004*step30,1.0,.004,input.sceneSpacePos.xy);

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

// blur1_ps.fx and blur2_ps.fx combine the source's 8/4-tap kernels into
// these bilinear 4/2-tap passes. b1ed=.25 affects this first blur level.
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
    float3 result = FrameClamp(uv) * 0.8 + Blur1(uv, size) * 0.7;
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0110",
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
