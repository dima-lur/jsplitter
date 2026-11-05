// MilkDrop 0330 — white mode-6 waveform over a luminous lava structure.
// Original: original/0330.milk (provided by the user; retained unchanged).
//
// The preset-level per_frame program calls int(), which is not registered by
// the matching modern EEL2 build. RecompileExpressions therefore leaves its
// code handle null and none of that program runs: the random colours, shift
// state, dynamic zoom/rotation, and warp=0 assignment in the text are all
// inactive. The checked runtime consequently uses the base values below:
// zoom=1.3345, rot=0, warp=1, and maximised (.65,.65,.65) wave colour = white.
// Its separately compiled per_pixel program is valid and still replaces dy.
//
// Mode 6 is monotonic along X, so source coverage only evaluates the three
// segments surrounding a pixel's axial projection. The .63 IIR is evaluated
// over 24 terms; its omitted bounded tail is below 2.1e-5 in wave amplitude.
// This replaces a full 239-segment scan containing repeated 576-step recurrences.
//
// The user accepted the resulting feedback as a deliberately non-faithful
// interpretation. Its geometric motion is slowed independently of decay, and
// a restrained spatial/time palette broadens the formerly near-monochrome lava.
//
// The composite camera matrix is also all zero. Following its IEEE arithmetic
// through project() makes uv2.z infinite and simplifies the sky expression to
// the constant .8; it does not remove the sky layer. Blur1 is reconstructed
// directly from the current history with the checked modern two-pass kernel.
MilkDropPresets["0330"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };

    const shader = `
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RelativeBands : register(t2);
cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};
float3 PackPositive(float x) {
    x = max(x, 0);
    x = x / (1 + x);
    float3 v = frac(min(x, .999999) * float3(1, 255, 65025));
    return v - v.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-7));
    return length(p - a - ab * t);
}
float PCM(int index, int count) {
    int start = max(count - 576, 0);
    return clamp(LeftPCM.Load(int3(clamp(start + index, 0, count - 1), 0, 0)).r, -1, 1);
}
// BuildWaves primes the recurrence before DrawWave selects its centred window.
float SmoothedPCM(int index, int count) {
    index = clamp(index, 0, 575);
    float value = 0, weight = 1;
    [fastopt] for (int tap = 0; tap < 24; ++tap) {
        int sampleIndex = index - tap;
        if (sampleIndex < 0)
            break;
        if (sampleIndex == 0) {
            value += PCM(0, count) * 1.351 * weight;
            break;
        }
        value += PCM(sampleIndex, count) * .49987 * weight;
        weight *= .63;
    }
    return value;
}
float2 WavePoint(int index, int n, float smoothed, float2 size) {
    float x = -1.1 + 2.2 * (float)index / (float)n, y = .25 * smoothed;
    return float2((x + 1) * .5 * size.x, (1 - y) * .5 * size.y);
}
float Coverage(float2 pixel, float2 size, int count) {
    int n = min(240, max(2, (int)floor(size.x / 3))), offset = (480 - n) / 2;
    float projected = ((pixel.x / size.x) + .05) / 1.1 * n;
    int nearestSegment = clamp((int)floor(projected), 0, n - 2), first = nearestSegment - 2,
        previousVertex = clamp(first, 0, n - 1);
    float smoothed = SmoothedPCM(offset + previousVertex, count);
    float2 points[6];
    [fastopt] for (int pointIndex = 0; pointIndex < 6; ++pointIndex) {
        int vertex = clamp(first + pointIndex, 0, n - 1);
        if (vertex > previousVertex)
            smoothed = PCM(offset + vertex, count) * .49987 + smoothed * .63;
        points[pointIndex] = WavePoint(vertex, n, smoothed, size);
        previousVertex = vertex;
    }
    float4 nearest = 1e6;
    [unroll] for (int localSegment = 0; localSegment < 3; ++localSegment) {
        float2 below = points[localSegment], current = points[localSegment + 1], above = points[localSegment + 2],
               above2 = points[localSegment + 3];
        float2 midpoint = (-.15 * below + 1.15 * current + 1.15 * above - .15 * above2) * .5;
        float2 a[2] = {current, midpoint}, b[2] = {midpoint, above};
        [unroll] for (int half = 0; half < 2; ++half) {
            nearest.x = min(nearest.x, SegmentDistance(pixel, a[half], b[half]));
            if (size.x >= 512) {
                nearest.y = min(nearest.y, SegmentDistance(pixel, a[half] + float2(1, 0), b[half] + float2(1, 0)));
                nearest.z = min(nearest.z, SegmentDistance(pixel, a[half] + float2(1, -1), b[half] + float2(1, -1)));
                nearest.w = min(nearest.w, SegmentDistance(pixel, a[half] + float2(0, -1), b[half] + float2(0, -1)));
            }
        }
    }
    float4 part = 1 - smoothstep(.15, 1.1, nearest);
    return 1 - (1 - part.x) * (1 - part.y) * (1 - part.z) * (1 - part.w);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 6)
        return float4(PackPositive(RelativeBands.Load(int3(pixel.x, 0, 0)).r), 1);
    int count = (int)pointCount;
    if (count < 576 || size.x < 6)
        return 0;
    float volume = (RelativeBands.Load(int3(0, 0, 0)).r + RelativeBands.Load(int3(1, 0, 0)).r +
                    RelativeBands.Load(int3(2, 0, 0)).r) /
                   3;
    float waveAlpha = saturate(1.059 * (volume - .71) / (1.30 - .71));
    if (waveAlpha < .004)
        return 0;
    waveAlpha = floor(waveAlpha * 255 + .5) / 255;
    float alpha = Coverage(input.sceneSpacePos.xy, size, count) * waveAlpha;
    if (alpha <= 0)
        return 0;
    return float4(alpha, alpha, alpha, alpha);
}
`;

    const feedback = `
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
int WrapIndex(int x, int n) {
    int q = x % n;
    return q < 0 ? q + n : q;
}
float3 Texel(int2 p, int2 d) {
    p = int2(WrapIndex(p.x, d.x), WrapIndex(p.y, d.y));
    if (p.y == 0 && p.x < 6)
        return 0;
    return Previous.Load(int3(p, 0)).rgb;
}
float3 History(float2 uv, float2 size) {
    int2 d = max(int2(size), int2(1, 1));
    float2 xy = frac(uv) * size - .5;
    int2 b = int2(floor(xy));
    float2 f = frac(xy);
    return lerp(
        lerp(Texel(b, d), Texel(b + int2(1, 0), d), f.x), lerp(Texel(b + int2(0, 1), d), Texel(b + 1, d), f.x), f.y);
}
float3 CubicHistory(float3 a, float3 b, float3 c, float3 d, float t) {
    return b + .5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}
float3 HistoryCatmullRow(int2 b, int py, int2 dimensions, float fraction) {
    return CubicHistory(Texel(b + int2(-1, py), dimensions),
                        Texel(b + int2(0, py), dimensions),
                        Texel(b + int2(1, py), dimensions),
                        Texel(b + int2(2, py), dimensions),
                        fraction);
}
float3 HistoryCatmull(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 xy = frac(uv) * size - .5;
    int2 b = int2(floor(xy));
    float2 f = frac(xy);
    float3 row0 = HistoryCatmullRow(b, -1, dimensions, f.x), row1 = HistoryCatmullRow(b, 0, dimensions, f.x),
           row2 = HistoryCatmullRow(b, 1, dimensions, f.x), row3 = HistoryCatmullRow(b, 2, dimensions, f.x);
    return CubicHistory(row0, row1, row2, row3, f.y);
}
float3 HistoryCadence(float2 uv, float2 size, float step30) {
    float3 bilinearValue = History(uv, size), reconstructed = bilinearValue;
    [branch] if (step30 < .999) {
        float3 cubicValue = HistoryCatmull(uv, size);
        reconstructed = lerp(bilinearValue, cubicValue, saturate(1 - step30));
    }
    return reconstructed;
}
float Luminance(float3 value) {
    return dot(value, float3(.32, .49, .29));
}
float2 WarpVertex(float2 original, float2 size, float motionStep, float cadenceStep) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float y = vertex.y * -.5 * aspect.y + .5;
    float zoom = pow(1.3345, motionStep);
    float2 uv = float2(.5 + vertex.x * aspect.x * .5 / zoom, .5 - vertex.y * aspect.y * .5 / zoom);
    float4 factors = float4(11.68 + 4 * cos(time * 1.413 + 10),
                            8.77 + 3 * cos(time * 1.113 + 7),
                            10.54 + 3 * cos(time * 1.233 + 3),
                            11.49 + 4 * cos(time * .933 + 5));
    float amount = .0035 * motionStep;
    uv.x += amount * (sin(time * .333 + vertex.x * factors.x - vertex.y * factors.w) +
                      cos(time * .753 - vertex.x * factors.y + vertex.y * factors.z));
    uv.y += amount * (cos(time * .375 - vertex.x * factors.z - vertex.y * factors.y) +
                      sin(time * .825 + vertex.x * factors.x + vertex.y * factors.w));
    float dy = y < .4 ? -.007 : (y > .6 ? .007 : 0);
    uv.y -= dy * motionStep;
    return .5 + (uv - .5) / aspect + .5 / size * cadenceStep;
}
float2 MeshUV(float2 original, float2 size, float motionStep, float cadenceStep) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(original) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    bool lower = f.x + f.y <= 1;
    float2 corners[3] = {lower ? cell / grid : (cell + float2(1, 0)) / grid,
                         lower ? (cell + float2(1, 0)) / grid : (cell + float2(0, 1)) / grid,
                         lower ? (cell + float2(0, 1)) / grid : (cell + 1) / grid};
    float3 weights = lower ? float3(1 - f.x - f.y, f.x, f.y) : float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    float2 uv = 0;
    [fastopt] for (int corner = 0; corner < 3; ++corner) uv +=
        weights[corner] * WarpVertex(corners[corner], size, motionStep, cadenceStep);
    return uv;
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
    float2 size = max(viewportSize, float2(1, 1)), original = input.sceneSpacePos.xy / size;
    float step30 = max(frameStep * .5, .0001), motionCadence = step30 * .34;
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x < 6)
        return 0;
    float2 uv = MeshUV(original, size, motionCadence, motionCadence);
    float3 first = HistoryCadence(uv, size, step30);
    float2 motion = uv - original;
    float3 recursive = HistoryCadence(original + motion * Luminance(first), size, step30);
    float multiplier = pow(.99, step30), subtract = .002 * (1 - multiplier) / (1 - .99);
    float3 result=recursive*multiplier-subtract;
    result=DitherDecay(result,multiplier,subtract,.99,.002,input.sceneSpacePos.xy);
    return float4(saturate(result),1);
}
`;

    const composite = `
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
float UnpackPositive(float3 v) {
    float x = dot(v, float3(1, 1.0 / 255, 1.0 / 65025));
    return x / max(1 - x, 1e-6);
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv);
    float2 pixel = floor(uv * size);
    if (pixel.y == 0 && pixel.x < 6)
        return 0;
    return Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0).rgb;
}
float3 Blur1H(float2 uv, float2 size, float2 origin, float2 scale) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1), offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float3 value = 0;
    uv += 1 / size;
    [loop] for (int tap = 0; tap < 4; ++tap) {
        float2 d = float2(offsets[tap] / size.x, 0);
        value += (Image(uv + d, size, origin, scale) + Image(uv - d, size, origin, scale)) * weights[tap];
    }
    return value * .027322404;
}
float3 Blur1(float2 uv, float2 size, float2 origin, float2 scale) {
    const float2 weights = float2(14.2, 4.1), offsets = float2(.901408451, 2.487804878);
    float3 value = 0;
    float2 aligned = uv + float2(2 / size.x, 0);
    [loop] for (int tap = 0; tap < 2; ++tap) {
        float2 d = float2(0, offsets[tap] * 2 / size.y);
        value += (Blur1H(aligned + d, size, origin, scale) + Blur1H(aligned - d, size, origin, scale)) * weights[tap];
    }
    return value * .027322404;
}
float3 Palette(float2 uv, float value) {
    float phase = time * .11 + dot(uv - .5, float2(2.4, -1.7)) + value * 2.2;
    return .5 + .5 * cos(phase + float3(0, 2.0943951, 4.1887902));
}
float3 LavaColour(float value, float2 uv) {
    float3 warm = saturate(float3(value, value * value, pow(max(value, 0), 5)));
    float luminance = dot(warm, float3(.299, .587, .114));
    float3 colour = luminance * (.35 + 1.3 * Palette(uv, value));
    return saturate(lerp(warm, colour, .52));
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float3 sharp = Image(uv, size, origin, scale), blur = Blur1(uv, size, origin, scale);
    float dist = 1.0078125 - sharp.b - .015625 * sharp.g, blurDistance = 1 - blur.b, bdist = min(dist, blurDistance);
    float3 sky = .8 * saturate(3 * bdist - 2);
    float3 result = saturate(sky * bdist);
    float structure = lerp(sharp.r, Blur1((uv - .5) / 5 + .5, size, origin, scale).r, blur.r - .8);
    float midAtt = UnpackPositive(Frame.Load(int3(4, 0, 0)).rgb);
    result += LavaColour(structure, uv) * (2 - pow(max(bdist, 0), 1 + 180 * midAtt));
    return float4(saturate(result), 1);
}
`;

    return {
        name: "0330", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {
            shader, feedback, post: composite
        }
    };
};
