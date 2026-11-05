// MilkDrop 0325 — mirrored white PCM filament with recursive worms
//
// Ported from vis/milkdrop/0325.milk and foo_vis_milk2. The preset has no
// active custom waves or shapes. Its only fresh geometry is MilkDrop's native
// additive/thick wave mode 6: a volume-gated PCM line, passed through
// SmoothWave and drawn four times at one-pixel offsets.
//
// The custom warp samples the previous frame at frac(uv*2), uses its green
// channel to create the white worm field, then applies its own .88 decay. The
// large beat-detection block writes q8 and an otherwise unused q1; the shader
// reads q28, which remains zero, so that state is intentionally absent here.
// Source intensity and recursive coefficients are normalized to the original
// 30-Hz cadence using the measured frameStep.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0325"] = function (TARGET_FPS) {

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

float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float along = saturate(dot(p - a, ab) /
        max(dot(ab, ab), 1e-5));
    return length(p - a - ab * along);
}

float2 RawWavePoint(int vertex, int vertexCount, int sourceStart,
                    int sampleOffset, int count, float2 size) {
    int sampleIndex = min(count - 1,
        sourceStart + sampleOffset + vertex);
    float pcm = clamp(LeftPCM.Load(int3(sampleIndex, 0, 0)).r,
                      -1.0, 1.0) * 0.535;

    // mode 6 with wave_mystery=0 and wave_x=.519. The renderer reverses Y
    // after building the NDC line; convert that final position to top-down
    // pixel coordinates here.
    float xNdc = -1.1 + 2.2 * (float)vertex / (float)vertexCount;
    float yBeforeReverse = 0.038 + 0.25 * pcm;
    return float2((xNdc + 1.0) * 0.5 * size.x,
                  (1.0 + yBeforeReverse) * 0.5 * size.y);
}

float2 SmoothMidpoint(int vertex, int vertexCount, int sourceStart,
                      int sampleOffset, int count, float2 size) {
    int below = max(vertex - 1, 0);
    int above = min(vertex + 1, vertexCount - 1);
    int above2 = min(vertex + 2, vertexCount - 1);
    float2 p0 = RawWavePoint(below, vertexCount, sourceStart,
        sampleOffset, count, size);
    float2 p1 = RawWavePoint(vertex, vertexCount, sourceStart,
        sampleOffset, count, size);
    float2 p2 = RawWavePoint(above, vertexCount, sourceStart,
        sampleOffset, count, size);
    float2 p3 = RawWavePoint(above2, vertexCount, sourceStart,
        sampleOffset, count, size);
    return (-0.15 * p0 + 1.15 * p1 +
            1.15 * p2 - 0.15 * p3) * 0.5;
}

void AddSegmentDistances(float2 p, float2 a, float2 b,
                         inout float4 nearest) {
    // bWaveThick performs four additive draws. The source mutates its vertex
    // list between draws, producing these four one-pixel offsets.
    nearest.x = min(nearest.x, SegmentDistance(p, a, b));
    nearest.y = min(nearest.y, SegmentDistance(
        p, a + float2(1.0, 0.0), b + float2(1.0, 0.0)));
    nearest.z = min(nearest.z, SegmentDistance(
        p, a + float2(1.0, -1.0), b + float2(1.0, -1.0)));
    nearest.w = min(nearest.w, SegmentDistance(
        p, a + float2(0.0, -1.0), b + float2(0.0, -1.0)));
}

float WaveCoverage(float2 p, float2 size, int count) {
    int usable = min(count, 576);
    if (usable < 4) return 0.0;
    int sourceStart = max(count - usable, 0);
    int availableWaveSamples = min(usable, 480);
    int vertexCount = min(240, max(2, (int)floor(size.x / 3.0)));
    vertexCount = min(vertexCount, availableWaveSamples);
    int sampleOffset = max((availableWaveSamples - vertexCount) >> 1, 0);

    float4 nearest = 1e6;
    [loop]
    for (int vertex = 0; vertex < 239; ++vertex) {
        if (vertex >= vertexCount - 1) break;
        float2 current = RawWavePoint(vertex, vertexCount, sourceStart,
            sampleOffset, count, size);
        float2 midpoint = SmoothMidpoint(vertex, vertexCount, sourceStart,
            sampleOffset, count, size);
        float2 next = RawWavePoint(vertex + 1, vertexCount, sourceStart,
            sampleOffset, count, size);
        AddSegmentDistances(p, current, midpoint, nearest);
        AddSegmentDistances(p, midpoint, next, nearest);
    }

    float4 coverage = 1.0 - smoothstep(0.35, 1.15, nearest);
    return dot(coverage, 1.0);
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    int count = (int)pointCount;
    if (count < 4) return float4(0.0, 0.0, 0.0, 0.0);

    float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
    float mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0.0);
    float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
    float relativeVolume = (bass + mid + treb) * 0.333;
    float waveAlpha = saturate(4.1 *
        (relativeVolume - 0.75) / (1.30 - 0.75));
    if (waveAlpha < 0.004)
        return float4(0.0, 0.0, 0.0, 0.0);

    float contribution = WaveCoverage(p, size, count) * waveAlpha *
                         (frameStep * 0.5);
    // MaximizeWaveColor turns (.65,.65,.65) into white. Alpha stays zero so
    // this RGB contribution is added to feedback like MilkDrop's additive
    // native wave instead of dimming the recursive image beneath it.
    return float4(saturate(contribution).xxx, 0.0);
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

float3 HistoryWrap(float2 uv) {
    return Previous.SampleLevel(PreviousSampler, frac(uv), 0.0).rgb;
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);

    float zoom = pow(1.002, step30);
    float2 uv = 0.5 + (uvOriginal - 0.5) / zoom;

    // per_frame sets warp=.3; speed and scale come from the preset header.
    float warpTime = time * 0.037;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    float amount = 0.3 * 0.0035 * step30;
    const float scaleInverse = 1.0 / 0.015;
    float uDelta = sin(warpTime * 0.333 + scaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - scaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - scaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + scaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += amount * float2(uDelta / aspect.x, vDelta / aspect.y);
    return uv;
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

    float2 result = 0.0;
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
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 baseUv = input.texelSpacePos.xy;
    float step30 = max(frameStep * 0.5, 0.0005);

    float2 meshUv = MeshUV(uvOriginal, size, step30);
    float2 uv = baseUv + (meshUv - uvOriginal);

    // q28 is never assigned and therefore remains zero. Despite its name,
    // noise is GetPixel(frac(uv*2)): another sample of the recursive frame.
    float3 noise = HistoryWrap(uv * 2.0);
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float radius = length((uvOriginal - 0.5) * aspect) * 2.0;
    float2 uv6 = uv * radius * noise.xy;
    float worms = uv6.y > 0.2
        ? saturate(0.02 / sqrt(uv6.y - 0.2)) : 0.0;

    // frac(uv*2) deliberately repeats the central wave around one-quarter
    // and three-quarters of the image height. The original preset keeps those
    // faint peripheral worms; suppress only that duplicated contribution while
    // leaving the central PCM line and the ordinary recursive image untouched.
    float centralWormMask = 1.0 - smoothstep(
        0.18, 0.22, abs(uvOriginal.y - 0.5));
    worms *= centralWormMask;

    float3 crisp = HistoryWrap(uv);
    float decay = pow(0.88, step30);
    float3 perStep = 0.176 * worms - 0.02;
    float3 result = crisp * decay + perStep / (1.0 - 0.88) *
                    (1.0 - decay);
    if(perStep.x<0) result=DitherDecay(result,decay,-perStep.x/.12*(1-decay),.88,-perStep.x,input.sceneSpacePos.xy);
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
    return value * (0.7 + 0.3 *
        saturate(sqrt(max(edge, 0.0)) * 5.0));
}

float3 Blur3(float2 uv, float2 size) {
    // MilkDrop exposes Blur3 after six downsampled separable passes. The
    // public post stage has only the completed frame, so use the same compact
    // broad approximation already validated by the 0329 port.
    float2 axis = 52.0 / size;
    float2 diagonal = 38.0 / size;
    float3 value = FrameClamp(uv) * 0.20;
    value += FrameClamp(uv + float2( axis.x, 0.0)) * 0.12;
    value += FrameClamp(uv + float2(-axis.x, 0.0)) * 0.12;
    value += FrameClamp(uv + float2(0.0,  axis.y)) * 0.12;
    value += FrameClamp(uv + float2(0.0, -axis.y)) * 0.12;
    value += FrameClamp(uv + float2( diagonal.x,  diagonal.y)) * 0.08;
    value += FrameClamp(uv + float2(-diagonal.x,  diagonal.y)) * 0.08;
    value += FrameClamp(uv + float2( diagonal.x, -diagonal.y)) * 0.08;
    value += FrameClamp(uv + float2(-diagonal.x, -diagonal.y)) * 0.08;
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    return value * (0.7 + 0.3 *
        saturate(sqrt(max(edge, 0.0)) * 5.0));
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float2 mirrorUv = float2(1.0 - uv.x, uv.y);
    float3 mainSample = FrameClamp(uv);
    float3 mirrorSample = FrameClamp(mirrorUv);
    float3 blur1 = Blur1(uv, size);
    float3 blur1Mirror = Blur1(mirrorUv, size);
    float3 blur3 = Blur3(uv, size);
    float3 blur3Mirror = Blur3(mirrorUv, size);

    float3 result = mainSample.xxx + mirrorSample.xxx;
    float3 blurs = blur1.xxx + blur3.xxx +
                   blur1Mirror.xxx + blur3Mirror.xxx;
    float2 uv3 = (uv - 0.5) * (1.0 - blur1.zz) + 0.5;
    result += saturate(sqrt(max(FrameClamp(uv3).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result += saturate(sqrt(max(Blur1(uv3, size).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result = lerp(blurs, result, result);

    float3 roamCos = 0.5 + 0.5 * cos(
        time * float3(0.329, 1.293, 5.070) +
        float3(1.2, 3.9, 2.5));
    result = pow(max(result, 0.0), 0.8 + 4.0 * roamCos);

    float greenSum = FrameClamp(float2(uv.x, 1.0 - uv.y)).g +
                     FrameClamp(1.0 - uv).g;
    result += pow(max(greenSum, 0.0), float3(0.6, 0.95, 5.0));
    result = 1.0 - exp(-2.0 * result);
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0325",
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
