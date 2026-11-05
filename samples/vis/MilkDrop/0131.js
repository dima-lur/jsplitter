// MilkDrop 0131 — blue mode-5 dots through rotating mirrored fins
//
// Source: 0131.milk. The built-in wave is a 480-point, smoothed mode-5
// additive dot pattern. Warp samples the previous frame along its displacement
// direction and fades it. The composite shader folds the entire finished
// history into 3..8 rotating angular fins (a polar kaleidoscope).
//
// The original per_frame movement/q1/monitor values are not read by any
// enabled drawing feature or by either custom shader. All custom waves,
// shapes, borders and motion vectors are invisible/disabled.
//
// rand_preset.z is a preset-lifetime random value in the original. Select
// a single fin count when include() loads this file, not on every FPS change:
// this keeps the shader text stable for the native DXBC cache.
const milkDrop0131FinCount = 3 + Math.floor(Math.random() * 5.95);

// Loaded by Shader - MilkDrop ALL.js; no panel callbacks or timers here.
MilkDropPresets["0131"] = function (TARGET_FPS) {
    const FIN_COUNT = milkDrop0131FinCount;

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

float DotCoverage(float2 p, float2 dotPosition, int pointIndex) {
    // max-based feedback follows individual peaks, not just average energy.
    // Emit each native-strength dot about 30 times per second, distributing
    // point phases across frames (as in 0114). Dimming every dot by 30/FPS
    // instead shortens its visible trail even with corrected feedback timing.
    float density = saturate(frameStep * 0.5);
    if (density < 1.0) {
        float rank = frac((float(pointIndex) + 0.5) * 0.61803398875);
        float phase = frac(frac(time) * 30.0);
        if (frac(rank + phase) >= density) return 0.0;
    }
    // bWaveDots=1 and bWaveThick=0: one native point per vertex.
    return all(abs(p - dotPosition) <= 0.55) ? 1.0 : 0.0;
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
        // MilkDrop applies its .90 one-pole smoothing to all 576 waveform
        // samples before mode 5. A 32-slot delay reproduces the i/i+32 pairs
        // without recomputing the recurrence for every rendered vertex.
        const float waveScale = 2.718;
        const float smoothing = 0.90;
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

        [loop]
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
                coverage += DotCoverage(p, current, 2 * (builtPoints - 2));
                coverage += DotCoverage(p,
                    SmoothPoint(below, current, above, dotPosition), 2 * (builtPoints - 2) + 1);
                below = current;
                current = above;
                above = dotPosition;
            }
            ++builtPoints;
        }

        coverage += DotCoverage(p, current, 2 * (builtPoints - 2));
        coverage += DotCoverage(p,
            SmoothPoint(below, current, above, above), 2 * (builtPoints - 2) + 1);
        coverage += DotCoverage(p, above, 2 * (builtPoints - 2) + 2);
    }

    float3 presetColor = float3(0.130, 0.500, 1.000);
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
        0.524 * textureAlpha * (relativeVolume - 0.750) / (0.950 - 0.750));
    if (waveAlpha < 0.004) waveAlpha = 0.0;
    // Modern DrawWave rounds the vertex's RGBA after the visibility test.
    waveAlpha = floor(waveAlpha * 255.0 + 0.5) / 255.0;
    presetColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;

    // Keep native dot strength; DotCoverage already adjusts emission density.
    // Additive dots contribute premultiplied RGB with zero alpha.
    float3 additiveWave = presetColor.rgb * coverage * waveAlpha;
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

int WrapIndex(int value, int size) {
    // The warped UV only leaves the image by a small margin; this is the
    // same single-wrap indexing used by the validated 0132 port.
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    return Previous.Load(int3(pixel, 0)).rgb;
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

// Unbiased UNORM8 rounding retains sub-code updates at high FPS. A shared
// RGB threshold avoids independent color noise; the 30-FPS path is unchanged.
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
    // This max filter is not a time-scalable linear blur. Shrinking its taps
    // and taking roots of their weights changes the recurring trail pattern.
    // Retain the whole reference operation, then scale its contribution below.
    float operationStep = max(step30, 1.0);
    float2 meshUv = MeshUV(uvOriginal, size, operationStep);
    float2 uv = texelUv + (meshUv - uvOriginal);

    // sampler_main is bilinear-wrap. The custom shader finds the mesh-motion
    // direction, samples three pixels along it and keeps the brightest trail.
    float2 delta = uv - texelUv;
    float deltaLength = length(delta);
    float2 direction = deltaLength > 1e-8 ? delta / deltaLength : 0.0;
    float2 onePixel = direction / size * operationStep;
    // Keep the bilinear helper in one compiled loop. Writing out all five
    // calls makes FXC inline and optimize the same wrap path five times.
    float2 historyUv[5] = {
        uv,
        uv - onePixel,
        uv + onePixel,
        uv + onePixel * 2.0,
        uv + onePixel * 3.0
    };
    float3 historySample[5];
    [fastopt]
    for (int sample = 0; sample < 5; ++sample) {
        historySample[sample] = HistoryWrap(historyUv[sample], size);
    }
    float3 result = historySample[0];
    result = max(result, historySample[1] * pow(0.90, operationStep));
    result = max(result, historySample[2] * pow(0.97, operationStep));
    result = max(result, historySample[3] * pow(0.97, operationStep));
    result = max(result, historySample[4] * pow(0.90, operationStep));
    float fade = pow(0.92, operationStep);
    result *= fade;

    // Advance history on every frame with a fraction of the native operation.
    // This preserves its spatial footprint without repeating 30-Hz frames.
    // It is a fractional approximation, not an exact root of nonlinear max.
    if (step30 < 1.0) {
        result = lerp(HistoryWrap(texelUv, size), result, step30);
        result = QuantizeStep(result, input.sceneSpacePos.xy, 130363u);
    }
    return float4(saturate(result), 1.0);
}`;

    const compShader = `
Texture2D Frame : register(t0);

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

static const float TWO_PI = 6.283185307179586;
static const float INV_TWO_PI = 0.159154943091895;
static const float FIN_COUNT = ${FIN_COUNT.toFixed(1)};

float2 PolarAtVertex(float2 meshUV, float2 aspect) {
    // rad/ang in MilkDrop's composite are mesh-vertex attributes, not
    // high-resolution polar coordinates recomputed independently per pixel.
    // The mesh uses Y-up. The output texture UV is Y-down.
    float2 v = float2(2.0 * meshUV.x - 1.0,
                       1.0 - 2.0 * meshUV.y) * aspect;
    float radius = length(v);
    return float2(radius, radius < 1e-6 ? 0.0 : atan2(v.y, v.x));
}

float2 MeshPolar(float2 uvOriginal, float2 size) {
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

    // atan2 has a branch cut at the negative X axis, on the center-left
    // horizontal line. Adjacent vertices there have angles near -PI/+PI.
    // Interpolating those raw values crosses angle=0, creating a false
    // horizontal streak. Locally unwrap the vertex angles of each triangle.
    // Adding 2PI does not change the final kaleidoscope when fins is integer.
    if (f.x + f.y <= 1.0) {
        float2 a = PolarAtVertex(corner00, aspect);
        float2 b = PolarAtVertex(corner10, aspect);
        float2 c = PolarAtVertex(corner01, aspect);
        b.y += TWO_PI * floor((a.y - b.y) / TWO_PI + 0.5);
        c.y += TWO_PI * floor((a.y - c.y) / TWO_PI + 0.5);
        return (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    }
    float2 a = PolarAtVertex(corner10, aspect);
    float2 b = PolarAtVertex(corner01, aspect);
    float2 c = PolarAtVertex(corner11, aspect);
    b.y += TWO_PI * floor((a.y - b.y) / TWO_PI + 0.5);
    c.y += TWO_PI * floor((a.y - c.y) / TWO_PI + 0.5);
    return (1.0 - f.y) * a + (1.0 - f.x) * b +
           (f.x + f.y - 1.0) * c;
}

int WrapIndex(int value, int size) {
    int result = value % size;
    return result < 0 ? result + size : result;
}

float3 FrameTexel(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    return Frame.Load(int3(pixel, 0)).rgb;
}

float3 FrameWrap(float2 uv, float2 size) {
    // Original sampler_main is bilinear-wrap, including across the boundary.
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(FrameTexel(base, dimensions),
                      FrameTexel(base + int2(1, 0), dimensions), fraction.x);
    float3 bottom = lerp(FrameTexel(base + int2(0, 1), dimensions),
                         FrameTexel(base + int2(1, 1), dimensions), fraction.x);
    return lerp(top, bottom, fraction.y);
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 polar = MeshPolar(uvOriginal, size);

    // The 48x36 mesh has a vertex exactly at the image center. Its radius
    // is zero, so atan2(0,0) supplies an arbitrary angular value (zero).
    // Interpolating that value across the adjacent triangles creates a
    // stationary, wedge-shaped spoke in the kaleidoscope. Use the true
    // pixel angle near this singularity, then smoothly return to the
    // original mesh-interpolated angle between one and two grid cells.
    // Keep the same 2PI phase while blending, so the negative-X branch
    // cut does not reintroduce the horizontal seam fixed previously.
    const float2 compositeGrid = float2(48.0, 36.0);
    float centerDistance = length((uvOriginal - 0.5) * compositeGrid);
    if (centerDistance < 2.0) {
        float2 aspect = min(float2(1.0, 1.0),
                            float2(size.x / size.y, size.y / size.x));
        float2 centerVector = float2(2.0 * uvOriginal.x - 1.0,
                                     1.0 - 2.0 * uvOriginal.y) * aspect;
        float exactAngle = atan2(centerVector.y, centerVector.x);
        exactAngle += TWO_PI * floor((polar.y - exactAngle) / TWO_PI + 0.5);
        polar.y = lerp(exactAngle, polar.y,
                       smoothstep(1.0, 2.0, centerDistance));
    }

    // Original composite, live branches only:
    // rad_lq = rad * length(texsize.xy) * 0.5
    // ang_lq = ang
    // ang2 = ang_lq * M_INV_PI_2 + time*.025
    // ang2 = abs(frac(ang2*fins)/fins - .5/fins)
    // uv2 = .5 + rad_lq*.8 * float2(cos,sin)(ang2*2PI)/texsize.xy
    float radiusPixels = polar.x * length(size) * 0.5 * 0.8;
    float angle = polar.y * INV_TWO_PI + time * 0.025;
    angle = frac(angle * FIN_COUNT) / FIN_COUNT;
    angle = abs(angle - 0.5 / FIN_COUNT) * TWO_PI;
    float2 uv = 0.5 + radiusPixels * float2(cos(angle), sin(angle)) / size;

    // Custom composite replaces legacy gamma; its own overbright is 1.333.
    float3 result = FrameWrap(uv, size) * 1.333;
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0131",
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
