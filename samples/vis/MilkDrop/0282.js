// MilkDrop 0282 — rotating multicolour PCM seam in a soft cross-feedback field.
// Original: original/0282.milk, read in full before translation.
//
// There are no enabled custom waves or shapes. The fresh image is the native
// normal-blended, thick mode-6 waveform. Its 240-point base geometry, forward
// PCM smoothing, SmoothWave midpoint insertion, final Y reversal and four
// cumulative one-pixel draws follow the checked BuildWaves/DrawWave path.
// Because mode 6 is a graph along a straight axis, only the three segments
// surrounding a pixel's axial projection can be nearest; this avoids scanning
// all 479 smoothed vertices for every source pixel.
//
// q15 is never assigned, so the noise_lq term in the warp is identically zero.
// GetBlur1 in the warp and GetBlur2 in the composite are broad weighted
// approximations of the native precomputed blur chain. Blur2 remains outside
// feedback, while the final composite is presentation-only.
MilkDropPresets["0282"] = function (TARGET_FPS) {
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
struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float along = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-6));
    return length(p - a - ab * along);
}
float PCM(int logicalIndex, int sourceStart, int available, int count) {
    logicalIndex = clamp(logicalIndex, 0, available - 1);
    int sampleIndex = clamp(sourceStart + logicalIndex, 0, count - 1);
    return clamp(LeftPCM.Load(int3(sampleIndex, 0, 0)).r, -1.0, 1.0);
}
float SmoothedPCM(int logicalIndex, int sourceStart, int available, int count) {
    // Native recurrence: s[0]=x[0]*2.28 and
    // s[i]=x[i]*2.28*(1-.207)+s[i-1]*.207. Eight terms leave less
    // than 4e-6 of the bounded input tail at the visible centered window.
    float value = 0.0;
    float weight = 1.0;
    [fastopt]
    for (int tap = 0; tap < 8; ++tap) {
        int index = logicalIndex - tap;
        if (index < 0) break;
        float sample = PCM(index, sourceStart, available, count) * 2.28;
        if (index == 0) {
            value += sample * weight;
            break;
        }
        value += sample * .793 * weight;
        weight *= .207;
    }
    return value;
}
void WaveLine(out float2 edge0, out float2 edge1,
              out float2 direction, out float2 perpendicular) {
    float angle = 1.57 * .22;
    direction = float2(cos(angle), sin(angle));
    perpendicular = float2(-direction.y, direction.x);
    float halfLength = min(3.0, 1.1 / max(abs(direction.x), abs(direction.y)));
    edge0 = -direction * halfLength;
    edge1 = direction * halfLength;
}
float2 WavePoint(int vertex, int vertexCount, int sampleOffset,
                 int sourceStart, int available, int count, float2 size) {
    float2 edge0, edge1, direction, perpendicular;
    WaveLine(edge0, edge1, direction, perpendicular);
    int clampedVertex = clamp(vertex, 0, vertexCount - 1);
    float2 position = edge0 + (edge1 - edge0) *
        ((float)clampedVertex / (float)vertexCount);
    position += perpendicular * .25 * SmoothedPCM(
        sampleOffset + clampedVertex, sourceStart, available, count);
    // DrawWave reverses Y before projection. MilkDrop's 2D target has Y=-1
    // at the top, so the pre-reversal coordinate maps as (1-y)*height/2.
    return float2((position.x + 1.0) * .5 * size.x,
                  (1.0 - position.y) * .5 * size.y);
}
float SegmentCoverage(float2 pixel, int segment, int vertexCount,
                      int sampleOffset, int sourceStart, int available,
                      int count, float2 size) {
    int i = clamp(segment, 0, vertexCount - 2);
    float2 p0 = WavePoint(i - 1, vertexCount, sampleOffset,
                          sourceStart, available, count, size);
    float2 p1 = WavePoint(i, vertexCount, sampleOffset,
                          sourceStart, available, count, size);
    float2 p2 = WavePoint(i + 1, vertexCount, sampleOffset,
                          sourceStart, available, count, size);
    float2 p3 = WavePoint(i + 2, vertexCount, sampleOffset,
                          sourceStart, available, count, size);
    float2 midpoint = (-.15 * p0 + 1.15 * p1 +
                        1.15 * p2 - .15 * p3) * .5;
    float4 distance = 1e6;
    distance.x = min(SegmentDistance(pixel, p1, midpoint),
                     SegmentDistance(pixel, midpoint, p2));
    if (size.x >= 512.0) {
        float2 offset1 = float2(1, 0);
        float2 offset2 = float2(1, -1);
        float2 offset3 = float2(0, -1);
        distance.y = min(SegmentDistance(pixel, p1 + offset1, midpoint + offset1),
                         SegmentDistance(pixel, midpoint + offset1, p2 + offset1));
        distance.z = min(SegmentDistance(pixel, p1 + offset2, midpoint + offset2),
                         SegmentDistance(pixel, midpoint + offset2, p2 + offset2));
        distance.w = min(SegmentDistance(pixel, p1 + offset3, midpoint + offset3),
                         SegmentDistance(pixel, midpoint + offset3, p2 + offset3));
    }
    float4 part = 1.0 - smoothstep(.35, 1.15, distance);
    return 1.0 - (1.0 - part.x) * (1.0 - part.y) *
                 (1.0 - part.z) * (1.0 - part.w);
}
float WaveCoverage(float2 pixel, float2 size, int count) {
    int usable = min(count, 576);
    if (usable < 4) return 0.0;
    int sourceStart = max(count - usable, 0);
    int available = min(usable, 480);
    int vertexCount = min(240, max(2, (int)floor(size.x / 3.0)));
    vertexCount = min(vertexCount, available);
    int sampleOffset = max((available - vertexCount) >> 1, 0);

    float2 edge0, edge1, direction, perpendicular;
    WaveLine(edge0, edge1, direction, perpendicular);
    float2 edge0Pixel = float2((edge0.x + 1.0) * .5 * size.x,
                               (1.0 - edge0.y) * .5 * size.y);
    float2 edge1Pixel = float2((edge1.x + 1.0) * .5 * size.x,
                               (1.0 - edge1.y) * .5 * size.y);
    float2 linePixel = edge1Pixel - edge0Pixel;
    float lineLength2 = max(dot(linePixel, linePixel), 1e-6);
    float axial = dot(pixel - edge0Pixel, linePixel) / lineLength2;
    // NDC-perpendicular audio displacement is not exactly perpendicular in
    // a rectangular pixel grid. Two local corrections recover the nearest
    // axial index without scanning the complete 479-vertex strip.
    float2 perpendicularPixel = float2(perpendicular.x * .5 * size.x,
                                       -perpendicular.y * .5 * size.y);
    int nearest = clamp((int)floor(axial * vertexCount), 0, vertexCount - 1);
    [unroll]
    for (int refine = 0; refine < 2; ++refine) {
        float amplitude = .25 * SmoothedPCM(sampleOffset + nearest,
            sourceStart, available, count);
        float corrected = axial - amplitude *
            dot(perpendicularPixel, linePixel) / lineLength2;
        nearest = clamp((int)floor(corrected * vertexCount),
                        0, vertexCount - 1);
    }
    float coverage = 0.0;
    [fastopt]
    for (int offset = -2; offset <= 2; ++offset) {
        coverage = max(coverage, SegmentCoverage(pixel, nearest + offset,
            vertexCount, sampleOffset, sourceStart, available, count, size));
    }
    return coverage;
}
float TemporalAlpha(float alpha30, float step30) {
    return 1.0 - pow(saturate(1.0 - alpha30), step30);
}
float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    float2 pixel = input.sceneSpacePos.xy;
    float2 uv = pixel / size;
    float step30 = max(frameStep * .5, .0001);

    // Outer border is drawn after the native wave.
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    if (edge < .005) {
        float alpha = TemporalAlpha(.8, step30);
        return float4(0, 0, 0, alpha);
    }

    int count = (int)pointCount;
    if (count < 4) return 0.0;
    float coverage = WaveCoverage(pixel, size, count);
    if (coverage <= 0.0) return 0.0;

    float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
    float mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0.0);
    float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
    // The EEL preset updates vol after evaluating wave_r/g/b. The native
    // analyzer cadence already delays these bands relative to the rendered
    // PCM; using the current analyzer sample is the closest stateless source
    // approximation available in the one-file source pass.
    float volume = (bass + mid + treb) * .25;
    volume *= volume;
    float3 color = saturate(float3(
        1.0 + 1.3 * cos(volume * 150.0),
        1.0 + .5 * tan(volume * 35.0),
        1.0 + .3 * sin(volume * 20.0)));
    color /= max(max(color.r, color.g), max(color.b, .01));
    color = floor(color * 255.0 + .5) / 255.0;
    return float4(color * coverage, coverage);
}`;

    const warpShader = `
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
int2 ClampPixel(int2 pixel, int2 dimensions) {
    return clamp(pixel, int2(0, 0), dimensions - 1);
}
float3 HistoryTexel(int2 pixel, int2 dimensions) {
    return Previous.Load(int3(ClampPixel(pixel, dimensions), 0)).rgb;
}
float3 HistoryClamp(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = saturate(uv) * size - .5;
    int2 base = int2(floor(texel));
    float2 weight = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
        HistoryTexel(base + int2(1, 0), dimensions), weight.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
        HistoryTexel(base + int2(1, 1), dimensions), weight.x);
    return lerp(top, bottom, weight.y);
}
float3 CubicHistory(float3 a, float3 b, float3 c, float3 d, float t) {
    return b + .5 * t * (c - a + t * (2.0 * a - 5.0 * b +
        4.0 * c - d + t * (3.0 * (b - c) + d - a)));
}
float3 HistoryCatmullRow(int2 base, int row, int2 dimensions, float fraction) {
    return CubicHistory(
        HistoryTexel(base + int2(-1, row), dimensions),
        HistoryTexel(base + int2( 0, row), dimensions),
        HistoryTexel(base + int2( 1, row), dimensions),
        HistoryTexel(base + int2( 2, row), dimensions), fraction);
}
float3 HistoryCatmull(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = saturate(uv) * size - .5;
    int2 base = int2(floor(texel));
    float2 weight = frac(texel);
    float3 row0 = HistoryCatmullRow(base, -1, dimensions, weight.x);
    float3 row1 = HistoryCatmullRow(base,  0, dimensions, weight.x);
    float3 row2 = HistoryCatmullRow(base,  1, dimensions, weight.x);
    float3 row3 = HistoryCatmullRow(base,  2, dimensions, weight.x);
    return CubicHistory(row0, row1, row2, row3, weight.y);
}
float3 HistoryCadence(float2 uv, float2 size, float step30) {
    float3 bilinear = HistoryClamp(uv, size);
    float3 reconstructed = bilinear;
    [branch]
    if (step30 < .999) {
        // Two/four bilinear history evaluations per native 30-Hz interval
        // accumulate excess diffusion. Match 0246: retain the exact 30-FPS
        // path, then blend 50%/75% Catmull reconstruction at 60/120 FPS.
        reconstructed = lerp(bilinear, HistoryCatmull(uv, size),
                             saturate(1.0 - step30));
    }
    return reconstructed;
}
float3 Blur1Approx(float2 uv, float2 size) {
    float2 texel = 1.0 / size;
    float2 offsets[12] = {
        float2( 2, 0), float2(-2, 0), float2(0, 2), float2(0,-2),
        float2( 4, 4), float2(-4, 4), float2(4,-4), float2(-4,-4),
        float2( 6, 0), float2(-6, 0), float2(0, 6), float2(0,-6)
    };
    float3 sum = HistoryClamp(uv, size) * 4.0;
    [fastopt]
    for (int index = 0; index < 12; ++index) {
        float weight = index < 4 ? 2.0 : 1.0;
        sum += HistoryClamp(uv + offsets[index] * texel, size) * weight;
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeScale = .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return min(sum * (.98 / 20.0) * edgeScale, .98);
}
float2 BuiltinUV(float2 uv, float2 size, float step30) {
    float2 aspect = min(float2(1, 1),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    float radius = length(vertex * aspect);
    float fullZoom = pow(.99980, pow(.99950, radius * 2.0 - 1.0));
    float zoom = pow(fullZoom, step30);
    float2 stretch = pow(float2(1.00980, 1.0), step30);
    float2 local = (uv - .5) * aspect / zoom;
    local /= max(stretch, .0001);
    float angle = .011 * step30;
    float sine = sin(angle), cosine = cos(angle);
    local = float2(cosine * local.x - sine * local.y,
                   sine * local.x + cosine * local.y);
    // Native translation subtracts dx/dy. Here dy=-.008.
    float2 transformed = .5 + local + float2(0, .008) * step30;
    // Preserve the reference half-texel displacement per 30-Hz interval.
    // Leaving it at half a texel per rendered frame adds FPS/2 pixels/second
    // of drift on both axes. In this colour-dependent recursive warp that
    // can reverse local flow and empty a region, with a viewport-size bias.
    return .5 + (transformed - .5) / aspect + (.5 * step30) / size;
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
    float2 size = max(viewportSize, float2(1, 1));
    float2 original = input.sceneSpacePos.xy / size;
    float step30 = max(frameStep * .5, .0001);
    float2 uv = BuiltinUV(original, size, step30);

    float3 rc = HistoryClamp(uv, size) + Blur1Approx(uv, size);
    float scale = 1.0 + rc.g * .02;
    // Remove the explicit integer X wrap before forming the fractional step.
    // At step30=1 this is algebraically the preset's frac(ruv + (1,pow)).
    float2 fullUv;
    fullUv.x = .5 + (uv.x - .5) * scale;
    fullUv.y = .5 + (uv.y - 1.5) * scale + pow(max(rc.r, 0.0), .004);
    float2 recursiveUv = frac(uv + (fullUv - uv) * step30);
    float3 result = HistoryCadence(recursiveUv, size, step30);

    // q15 is never assigned, hence noise3=0. q10..q12 are the three
    // deterministic per-frame colours used by lerp(noise3, colour, ret.x).
    float3 cycleColor = .5 + .4 * float3(
        .6 * sin(time * 1.1) + .4 * sin(time * .8),
        .6 * sin(time * 1.34) + .4 * sin(time * .4),
        .6 * sin(time * 1.6) + .4 * sin(time * .5));
    float3 noise2 = cycleColor * result.r;
    result += saturate(cross(result, noise2)) * step30;
    result *= pow(.985, step30);
    result=DitherDecay(result,pow(.985,step30),0,.985,0,input.sceneSpacePos.xy);
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
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + saturate(uv) * scale;
}
float3 Image(float2 uv, float2 origin, float2 scale) {
    return Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0.0).rgb;
}
float3 Blur2(float2 uv, float2 size, float2 origin, float2 scale) {
    // Blur2 is the second progressively downsampled native blur pair. This
    // weighted footprint reaches 20 source pixels rather than producing the
    // ghost rings caused by a few equally weighted sharp taps.
    float2 offsets[12] = {
        float2( 8, 0), float2(-8, 0), float2(0, 8), float2(0,-8),
        float2( 7, 7), float2(-7, 7), float2(7,-7), float2(-7,-7),
        float2(20, 0), float2(-20, 0), float2(0,20), float2(0,-20)
    };
    float3 sum = Image(uv, origin, scale) * 4.0;
    [fastopt]
    for (int index = 0; index < 12; ++index) {
        float weight = index < 4 ? 2.0 : 1.0;
        sum += Image(uv + offsets[index] / size, origin, scale) * weight;
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeScale = .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return min(sum * (.98 / 20.0) * edgeScale, .98);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    float2 uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x,
                          ddy(input.texelSpacePos.y) * size.y);
    float2 origin = input.texelSpacePos.xy - uv * scale;
    float3 result = Image(uv, origin, scale) +
                    Blur2(uv, size, origin, scale);
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0282", sourceId: 5, source,
        updateIntervalMs: 17,
        renderer: {
            shader, feedback: warpShader, post: compShader
        }
    };
};
