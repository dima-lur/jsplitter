// MilkDrop 0132 — explosive stereo dots through a motion-vector lattice
//
// The preset has no enabled custom waves or shapes. Its visible layers are the
// opaque 64 x 48 motion-vector lattice, the additive built-in mode-5 waveform
// rendered as thick dots, the mesh/custom feedback pass and legacy gamma.
// TARGET_FPS controls history updates and repaint.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0132"] = function (TARGET_FPS) {

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

float2 WavePoint(float left, float leftAhead, float right,
                 float rightAhead, float2 size, float2 rotation) {
    float x = right * leftAhead + left * rightAhead;
    float y = right * right - leftAhead * leftAhead;
    float2 rotated = float2(
        x * rotation.x - y * rotation.y,
        x * rotation.y + y * rotation.x);
    return 0.5 * size + 0.5 * min(size.x, size.y)
        * float2(rotated.x, -rotated.y);
}

float DotCoverage(float2 p, float2 dotPosition, float2 size) {
    float coverage = all(abs(p - dotPosition) <= 0.55) ? 1.0 : 0.0;
    if (size.x >= 512.0) {
        coverage += all(abs(p - (dotPosition + float2(1.0, 0.0))) <= 0.55)
            ? 1.0 : 0.0;
        coverage += all(abs(p - (dotPosition + float2(1.0, 1.0))) <= 0.55)
            ? 1.0 : 0.0;
        coverage += all(abs(p - (dotPosition + float2(0.0, 1.0))) <= 0.55)
            ? 1.0 : 0.0;
    }
    return coverage;
}

float2 SmoothPoint(float2 below, float2 current,
                   float2 above, float2 above2) {
    return (-0.15 * below + 1.15 * current +
            1.15 * above - 0.15 * above2) * 0.5;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;

    float rotationSine;
    float rotationCosine;
    sincos(time * 0.3, rotationSine, rotationCosine);
    float2 rotation = float2(rotationCosine, rotationSine);

    int count = (int)pointCount;
    int usable = min(count, 576);
    int vertexCount = min(480, usable - 32);
    float coverage = 0.0;
    if (vertexCount >= 3) {
        // MilkDrop applies its .75 one-pole smoothing to all 576 waveform
        // samples before mode 5. A 32-slot delay reproduces the i/i+32 pairs
        // without recomputing the recurrence for every rendered vertex.
        const float waveScale = 1.462;
        const float smoothing = 0.75;
        int sourceStart = max(count - usable, 0);
        float leftDelay[32];
        float rightDelay[32];
        float leftFiltered = clamp(LeftPCM.Load(
            int3(sourceStart, 0, 0)).r, -1.0, 1.0) * waveScale;
        float rightFiltered = clamp(RightPCM.Load(
            int3(sourceStart, 0, 0)).r, -1.0, 1.0) * waveScale;
        leftDelay[0] = leftFiltered;
        rightDelay[0] = rightFiltered;

        float2 below = 0.0;
        float2 current = 0.0;
        float2 above = 0.0;
        int builtPoints = 0;

        // FXC emits identical DXBC with fastopt, while spending less time on
        // speculative optimisation of the 512-sample smoothing recurrence.
        [fastopt]
        for (int sample = 1; sample < 512; ++sample) {
            float leftRaw = clamp(LeftPCM.Load(
                int3(sourceStart + sample, 0, 0)).r, -1.0, 1.0);
            float rightRaw = clamp(RightPCM.Load(
                int3(sourceStart + sample, 0, 0)).r, -1.0, 1.0);
            leftFiltered = leftRaw * waveScale * (1.0 - smoothing) +
                           leftFiltered * smoothing;
            rightFiltered = rightRaw * waveScale * (1.0 - smoothing) +
                            rightFiltered * smoothing;

            int slot = sample & 31;
            if (sample < 32) {
                leftDelay[slot] = leftFiltered;
                rightDelay[slot] = rightFiltered;
                continue;
            }

            int vertex = sample - 32;
            if (vertex >= vertexCount) break;
            float2 dotPosition = WavePoint(leftDelay[slot], leftFiltered,
                rightDelay[slot], rightFiltered, size, rotation);
            leftDelay[slot] = leftFiltered;
            rightDelay[slot] = rightFiltered;

            if (builtPoints == 0) {
                below = dotPosition;
                current = dotPosition;
            } else if (builtPoints == 1) {
                above = dotPosition;
            } else {
                coverage += DotCoverage(p, current, size);
                coverage += DotCoverage(p,
                    SmoothPoint(below, current, above, dotPosition), size);
                below = current;
                current = above;
                above = dotPosition;
            }
            ++builtPoints;
        }

        coverage += DotCoverage(p, current, size);
        coverage += DotCoverage(p,
            SmoothPoint(below, current, above, above), size);
        coverage += DotCoverage(p, above, size);
    }

    float3 presetColor = float3(0.7, 0.3, 0.0);
    float colorMaximum = max(max(presetColor.r, presetColor.g), presetColor.b);
    if (colorMaximum > 0.01) presetColor /= colorMaximum;

    float relativeVolume = (
        RelativeBands.Load(int3(0, 0, 0)).r +
        RelativeBands.Load(int3(1, 0, 0)).r +
        RelativeBands.Load(int3(2, 0, 0)).r) * 0.333;
    // MilkDrop's mode-5 switch attenuates only these four exact legacy
    // texture widths. Auto-exact textures of any other width retain 1.0.
    float textureAlpha = 1.0;
    if (abs(size.x - 256.0) < 0.5) textureAlpha = 0.07;
    else if (abs(size.x - 512.0) < 0.5) textureAlpha = 0.09;
    else if (abs(size.x - 1024.0) < 0.5) textureAlpha = 0.11;
    else if (abs(size.x - 2048.0) < 0.5) textureAlpha = 0.13;
    float waveAlpha = saturate(
        textureAlpha * (relativeVolume - 0.750) / (0.950 - 0.750));
    if (waveAlpha < 0.004) waveAlpha = 0.0;
    // Modern DrawWave rounds the vertex's RGBA after the visibility test.
    waveAlpha = floor(waveAlpha * 255.0 + 0.5) / 255.0;
    presetColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;

    // Additive drawing is represented by premultiplied RGB with zero alpha.
    float3 additiveWave = presetColor.rgb * coverage * waveAlpha *
                          (frameStep * 0.5);
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

float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float along = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * along);
}

float MotionVectorCoverage(float2 pixelCenter, float2 size) {
    // nMotionVectorsX/Y are exactly 64/48. With zero fractional counts and
    // zero offsets, the final column/row fail the source's <.9999 test.
    const float xDenominator = 63.25;
    const float yDenominator = 47.25;
    float xIndex = round(pixelCenter.x / size.x * xDenominator - 0.25);
    float yIndex = round(pixelCenter.y / size.y * yDenominator - 0.25);
    if (xIndex < 0.0 || xIndex > 62.0 ||
        yIndex < 0.0 || yIndex > 46.0)
        return 0.0;

    float2 start = float2(
        (xIndex + 0.25) / xDenominator * size.x,
        (yIndex + 0.25) / yDenominator * size.y);
    // mv_l=0 collapses the propagated displacement. DrawMotionVectors then
    // substitutes its minimum length: +1/textureWidth in both clip axes.
    float2 end = start + float2(1.0, size.y / size.x);
    return SegmentDistance(pixelCenter, start, end) <= 0.55 ? 1.0 : 0.0;
}

int WrapIndex(int value, int size) {
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    float3 history = Previous.Load(int3(pixel, 0)).rgb;
    float coverage = MotionVectorCoverage(float2(pixel) + 0.5,
                                          float2(dimensions));
    return lerp(history, float3(0.2, 0.3, 1.0), coverage);
}

float3 HistoryWrap(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
                      HistoryTexel(base + int2(1, 0), dimensions),
                      fraction.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
                         HistoryTexel(base + int2(1, 1), dimensions),
                         fraction.x);
    return lerp(top, bottom, fraction.y);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);
    float zoomStep = pow(0.99990, step30);

    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5 / zoomStep,
        0.5 - vertexPos.y * aspect.y * 0.5 / zoomStep);

    float warpTime = time;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    const float warpScaleInverse = 1.0;
    float warpAmount = 0.01000 * 0.0035 * step30;
    float uDelta = sin(warpTime * 0.333 + warpScaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - warpScaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - warpScaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + warpScaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += warpAmount * float2(uDelta, vDelta);

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

    // sampler_main is bilinear-wrap. The custom shader finds the mesh-motion
    // direction, samples three pixels along it and keeps the brightest trail.
    float2 delta = uv - texelUv;
    float deltaLength = length(delta);
    float2 direction = deltaLength > 1e-8 ? delta / deltaLength : 0.0;
    float2 onePixel = direction / size * step30;
    // Keep a single compiled copy of the manual bilinear history sampler.
    // Five written-out calls made FXC inline the complete path five times.
    float2 historyUv[5] = {
        uv, uv - onePixel, uv + onePixel,
        uv + onePixel * 2.0, uv + onePixel * 3.0
    };
    float3 historySample[5];
    [fastopt]
    for (int sample = 0; sample < 5; ++sample)
        historySample[sample] = HistoryWrap(historyUv[sample], size);
    float3 result = historySample[0];
    result = max(result, historySample[1] *
                         pow(0.90, step30));
    result = max(result, historySample[2] *
                         pow(0.97, step30));
    result = max(result, historySample[3] *
                         pow(0.97, step30));
    result = max(result, historySample[4] *
                         pow(0.90, step30));
    result *= pow(0.92, step30);
    result=DitherDecay(result,pow(.92,step30),0,.92,0,input.sceneSpacePos.xy);
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
    float3 result = Frame.SampleLevel(
        Filter, saturate(input.texelSpacePos.xy), 0.0).rgb;
    return float4(saturate(result * 1.7), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0132",
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
