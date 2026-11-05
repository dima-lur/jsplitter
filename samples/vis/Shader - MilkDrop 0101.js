include('docs/Flags.js');
// MilkDrop 0101 — smoothed PCM spiral with feathered feedback
//
// The preset uses no custom waves or shapes. Its visible layers are:
//   shader   - MilkDrop's built-in mode-1 waveform;
//   feedback - the 48x36 mesh transform and three-sample feather trail;
//   post     - a shifted, channel-swapped copy combined with the history.
// History advances on every Draw; frameStep follows the measured draw interval.
// Transforms, feathering, decay and source opacity use the original 30-Hz cadence.
const TARGET_FPS = 60; // Recommended values: 30, 60 or 120.
// Requires the source b0 frameStep constant supported by current JSplitter builds.
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

window.DrawMode = 1;
vis.UpdateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

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
    float frameStep; // 60-Hz units; the same measured draw interval as feedback.
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

float2 WavePoint(float left, float right, float2 size) {
    // nWaveMode=1. BuildWaves has already applied fWaveScale and the preset's
    // forward smoothing before these values reach the mode-specific formula.
    float radius = 0.53 + 0.43 * right - 0.28;
    float angle = left * 1.57 + time * 2.3;
    float radiusPixels = 0.5 * min(size.x, size.y) * radius;
    return 0.5 * size + radiusPixels * float2(cos(angle), sin(angle));
}

float2 ReadWavePoint(int vertex, int sourceStart, inout float leftSmooth,
                     inout float rightSmooth, float2 size) {
    const float waveScale = 3.586525;
    const float smoothing = 0.9;
    float leftRaw = clamp(LeftPCM.Load(int3(sourceStart + vertex + 32, 0, 0)).r,
                          -1.0, 1.0);
    float rightRaw = clamp(RightPCM.Load(int3(sourceStart + vertex, 0, 0)).r,
                           -1.0, 1.0);
    leftSmooth = leftRaw * waveScale * (1.0 - smoothing) +
                 leftSmooth * smoothing;
    rightSmooth = vertex == 0
        ? rightRaw * waveScale
        : rightRaw * waveScale * (1.0 - smoothing) +
          rightSmooth * smoothing;
    return WavePoint(leftSmooth, rightSmooth, size);
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    int count = (int)pointCount;
    int usable = min(count, 576);
    int vertexCount = min(240, usable - 32);
    if (vertexCount < 3) return float4(0.0, 0.0, 0.0, 0.0);

    float2 p = input.sceneSpacePos.xy;
    if (length(p - 0.5 * size) > 0.96 * min(size.x, size.y))
        return float4(0.0, 0.0, 0.0, 0.0);

    int sourceStart = max(count - usable, 0);
    const float waveScale = 3.586525;
    const float smoothing = 0.9;

    // BuildWaves smooths the complete left channel from sample zero. Mode 1
    // reads it 32 samples ahead of the right channel, so prime that recurrence
    // before walking the visible vertices.
    float leftRaw = clamp(LeftPCM.Load(int3(sourceStart, 0, 0)).r, -1.0, 1.0);
    float leftSmooth = leftRaw * waveScale;
    [loop]
    for (int primeIndex = 1; primeIndex < 32; ++primeIndex) {
        leftRaw = clamp(LeftPCM.Load(int3(sourceStart + primeIndex, 0, 0)).r,
                        -1.0, 1.0);
        leftSmooth = leftRaw * waveScale * (1.0 - smoothing) +
                     leftSmooth * smoothing;
    }

    float rightSmooth = 0.0;
    float2 below = ReadWavePoint(0, sourceStart, leftSmooth, rightSmooth, size);
    float2 a = below;
    float2 b = ReadWavePoint(1, sourceStart, leftSmooth, rightSmooth, size);
    float nearest = 1e6;

    // MilkDrop's SmoothWave inserts one four-point interpolated vertex between
    // every pair, expanding 240 raw points to 479 line-strip vertices.
    [loop]
    for (int vertex = 2; vertex < 240; ++vertex) {
        if (vertex >= vertexCount) break;
        float2 c = ReadWavePoint(vertex, sourceStart, leftSmooth, rightSmooth,
                                 size);
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

    float coverage = 1.0 - smoothstep(0.15, 1.25, nearest);

    float3 presetColor = float3(
        0.7 + 0.2 * (0.9 * sin(2.753 * time) +
                     0.4 * sin(2.315 * time + 1.0)),
        0.65 + 0.1 * (0.9 * sin(3.183 * time + 3.0) +
                      0.4 * sin(2.006 * time + 4.0)),
        0.7 + 0.1 * (0.9 * sin(2.393 * time + 5.0) +
                     0.4 * sin(2.733 * time + 2.0)));
    presetColor = saturate(presetColor);
    presetColor /= max(max(presetColor.r, presetColor.g),
                       max(presetColor.b, 1e-4));

    // Modern MilkDrop 0.10.0 DrawWave stores RGB in normal order and rounds
    // each vertex component to the nearest 8-bit normalized value.
    // t2: bass/mid/treb followed by bass_att/mid_att/treb_att.
    float3 visibleColor = floor(saturate(presetColor) * 255.0 + 0.5) / 255.0;
    float relativeVolume = (
        RelativeBands.Load(int3(0, 0, 0)).r +
        RelativeBands.Load(int3(1, 0, 0)).r +
        RelativeBands.Load(int3(2, 0, 0)).r) * 0.333;
    float waveAlpha = saturate(
        1.200006 * 1.25 * (relativeVolume - 0.97) / (1.67 - 0.97));
    // The native visibility test precedes UNORM8 quantization.
    if (waveAlpha < 0.004) waveAlpha = 0.0;
    waveAlpha = floor(waveAlpha * 255.0 + 0.5) / 255.0;
    // This source image is accumulated once per feedback step. Convert its
    // 30-Hz opacity so 60/120-Hz operation does not inject extra brightness.
    float alpha30 = coverage * waveAlpha;
    float alpha = alpha30; // Fast path at 30 FPS (frameStep == 2).
    [branch]
    if (frameStep < 1.5)
        alpha = 1.0 - pow(saturate(1.0 - alpha30), frameStep * 0.5);
    return float4(visibleColor * alpha, alpha);
}`;

const warpShader = `
Texture2D Previous : register(t0);
SamplerState PreviousSampler : register(s0);

cbuffer WarpConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

float3 HistoryWrapped(float2 uv) {
    return Previous.SampleLevel(PreviousSampler, frac(uv), 0.0).rgb;
}

float2 WarpVertexUV(float2 uvOriginal, float2 size) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);
    // frameStep is expressed in 60-Hz frames. Convert it to the amount of one
    // original 30-Hz preset step represented by this feedback update.
    float step30 = max(frameStep * 0.5, 0.0005);

    float zoom = 1.065 + 0.013 * (
        0.6 * sin(0.339 * time) + 0.4 * sin(0.276 * time));
    float rotation = 0.020 * (
        0.6 * sin(0.381 * time) + 0.4 * sin(0.579 * time));
    rotation += 0.020 * (sin(2.134 * time) +
                          sin(1.7134 * time) + sin(2.834 * time));
    float cx = 0.5 + 0.003 * (
        0.6 * sin(0.471 * time) + 0.4 * sin(0.297 * time));
    float cy = 0.5 + 0.003 * (
        0.6 * sin(0.379 * time) + 0.4 * sin(0.351 * time));
    float dx = 0.002 * (
        0.6 * sin(0.234 * time) + 0.4 * sin(0.277 * time));
    dx += 0.0025 * (sin(1.134 * time) +
                    sin(0.7134 * time) + sin(2.334 * time));
    float dy = 0.0025 * (sin(1.8834 * time) +
                         sin(1.0144 * time) + sin(1.334 * time));
    float zoomStep = pow(max(zoom, 0.0001), step30);
    float rotationStep = rotation * step30;

    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5 / zoomStep,
        0.5 - vertexPos.y * aspect.y * 0.5 / zoomStep);

    float warpTime = time;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    float warpAmount = 0.014587 * 0.0035;
    float uDelta = sin(warpTime * 0.333 +
        vertexPos.x * factors.x - vertexPos.y * factors.w);
    uDelta += cos(warpTime * 0.753 -
        vertexPos.x * factors.y + vertexPos.y * factors.z);
    float vDelta = cos(warpTime * 0.375 -
        vertexPos.x * factors.z - vertexPos.y * factors.y);
    vDelta += sin(warpTime * 0.825 +
        vertexPos.x * factors.x + vertexPos.y * factors.w);
    uv += warpAmount * step30 * float2(uDelta, vDelta);

    float sineRotation = sin(rotationStep);
    float cosineRotation = cos(rotationStep);
    float2 centered = uv - float2(cx, cy);
    uv = float2(cosineRotation * centered.x - sineRotation * centered.y,
                sineRotation * centered.x + cosineRotation * centered.y) +
         float2(cx, cy);
    uv -= float2(dx, dy) * step30;
    return 0.5 + (uv - 0.5) / aspect;
}

float2 MeshUV(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    float2 result = float2(0.0, 0.0);
    if (f.x + f.y <= 1.0) {
        float2 a = WarpVertexUV(corner00, size);
        float2 b = WarpVertexUV(corner10, size);
        float2 c = WarpVertexUV(corner01, size);
        result = (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    } else {
        float2 a = WarpVertexUV(corner10, size);
        float2 b = WarpVertexUV(corner01, size);
        float2 c = WarpVertexUV(corner11, size);
        result = (1.0 - f.y) * a + (1.0 - f.x) * b +
                 (f.x + f.y - 1.0) * c;
    }
    return result;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 warped = MeshUV(uvOriginal, size);
    float2 uv = input.texelSpacePos.xy + (warped - uvOriginal);

    // Custom warp: keep the brightest of the main sample and two nearby zoomed
    // samples. Scale their displacement because this dilation accumulates in
    // history just like the geometric warp. sampler_main is bilinear-wrap.
    float step30 = max(frameStep * 0.5, 0.0005);
    float feather = 8.0 * length(1.0 / size) * step30;
    float3 result = HistoryWrapped(uv);
    result = max(result, HistoryWrapped((uv - 0.5) * (1.0 - feather) + 0.5));
    result = max(result, HistoryWrapped((uv - 0.5) * (1.0 + feather) + 0.5));

    result -= 0.034 * step30;
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
    float2 uv = input.texelSpacePos.xy;
    float3 result = Frame.SampleLevel(Filter, uv, 0.0).rgb;
    const float scale = 0.9;
    float2 shift = 0.05 * scale * float2(
        cos(uv.y / scale * 27.0 * 0.5),
        sin(uv.x / scale * 39.0 * 0.5));
    // sampler_fc_main is bilinear-clamp; the custom comp reverses RGB on only
    // this shifted copy before selecting the brighter channel values.
    float3 shifted = Frame.SampleLevel(Filter, saturate(uv + shift), 0.0).zyx;
    return float4(max(result, shifted), 1.0);
}`;

let visual = null;
vis.CreateAsync(VisSourceType.Vectorscope, source, {
    shader,
    feedback: warpShader,
    post: compShader
})
    .then(value => { visual = value; window.Repaint(); })
    .catch(error => console.log("MilkDrop 0101: " + error));

function on_paint(gr) {
    const w = window.Width, h = window.Height;
    gr.FillSolidRect(0, 0, w, h, 0xff000000);
    if (visual && w > 0 && h > 0) visual.Draw(gr, 0, 0, w, h);
}

setInterval(() => window.Repaint(), FRAME_INTERVAL_MS);
