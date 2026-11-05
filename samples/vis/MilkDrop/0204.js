// MilkDrop 0204 — audio discs and a chromatic blur-gradient flow.
//
// Original: original/0204.milk (PSVERSION_WARP=3, PSVERSION_COMP=3).
// Two enabled 100-sided custom shapes are represented by their circular
// limiting geometry. The built-in wave follows modern mode 0: 240 vertices,
// a closing point, SmoothWave, and four cumulative point-list draws.
//
// The warp and composite both read MilkDrop's precomputed blur levels. Blur1
// uses the established modern separable kernel evaluated directly on history;
// Blur2 is a documented broad weighted approximation. The apparent 3D-noise
// branch is dead in this preset because q11..q29 are never assigned and all
// three interval tests reduce to value > 0 && value <= 0.

MilkDropPresets["0204"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;
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
    float frameStep;
};
struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};
static const float PI = 3.141592653589793;
static const float TWO_PI = 6.283185307179586;

float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}
float4 Quantize(float4 value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float PCMRight(int sampleIndex) {
    int count = max((int)pointCount, 1);
    int start = max(count - 576, 0);
    return RightPCM.Load(int3(start + clamp(sampleIndex, 0, 479), 0, 0)).r;
}
float SmoothedRight(int sampleIndex) {
    float sum = 0.0;
    float weight = .5;
    [fastopt]
    for (int tap = 0; tap < 12; ++tap) {
        sum += PCMRight(sampleIndex - tap) * weight;
        weight *= .5;
    }
    sum += PCMRight(sampleIndex - 12) * weight * 2.0;
    return sum * 28.599;
}
float2 NativeWaveVertex(int vertex, float2 size) {
    vertex = clamp(vertex, 0, 239);
    float radius = .5 + .4 * SmoothedRight(120 + vertex) - 1.0;
    if (vertex < 24) {
        float blend = .5 - .5 * cos((vertex / 24.0) * PI);
        float other = .5 + .4 * SmoothedRight(360 + vertex) - 1.0;
        radius = lerp(other, radius, blend);
    }
    float angle = (vertex / 239.0) * 6.28 + time * .2;
    float aspectX = min(size.x / size.y, 1.0);
    float aspectY = min(size.y / size.x, 1.0);
    return .5 + .5 * radius * float2(cos(angle) * aspectY,
                                     sin(angle) * aspectX);
}
float2 SmoothWaveVertex(int outputVertex, float2 size) {
    outputVertex = clamp(outputVertex, 0, 480);
    if (outputVertex == 480) return NativeWaveVertex(0, size);
    int base = outputVertex / 2;
    if ((outputVertex & 1) == 0) return NativeWaveVertex(base, size);
    int below = max(base - 1, 0);
    int above = min(base + 1, 240);
    int above2 = min(base + 2, 240);
    int sourceVertex[4] = { below, base, above, above2 };
    float2 wavePoint[4] = {
        float2(0.0, 0.0), float2(0.0, 0.0),
        float2(0.0, 0.0), float2(0.0, 0.0)
    };
    [fastopt]
    for (int pointIndex = 0; pointIndex < 4; ++pointIndex) {
        int vertex = sourceVertex[pointIndex] == 240
            ? 0 : sourceVertex[pointIndex];
        wavePoint[pointIndex] = NativeWaveVertex(vertex, size);
    }
    return (-.15 * wavePoint[0] + 1.15 * wavePoint[1] +
            1.15 * wavePoint[2] - .15 * wavePoint[3]) * .5;
}
float PointCoverage(float2 pixel, float2 position) {
    float2 delta = abs(pixel - (position + .5));
    return 1.0 - smoothstep(.85, 1.35, max(delta.x, delta.y));
}
float CandidateCoverage(float phase, float2 pixel, float2 size) {
    int nearest = (int)floor(phase * 478.0 + .5) % 478;
    return PointCoverage(pixel, SmoothWaveVertex(nearest, size) * size);
}
float CircularWave(float2 pixel, float2 size) {
    float2 centered = (pixel / size - .5) * 2.0;
    float2 aspect = float2(min(size.x / size.y, 1.0),
                           min(size.y / size.x, 1.0));
    float angle = atan2(centered.y / max(aspect.x, 1e-5),
                        centered.x / max(aspect.y, 1e-5));
    float phase[2] = {
        frac((angle - time * .2) / TWO_PI),
        frac((angle + PI - time * .2) / TWO_PI)
    };
    float coverage = 0.0;
    [fastopt]
    for (int phaseIndex = 0; phaseIndex < 2; ++phaseIndex)
        coverage = max(coverage,
                       CandidateCoverage(phase[phaseIndex], pixel, size));
    return coverage;
}
void Over(inout float4 destination, float4 source) {
    destination.rgb = source.rgb + destination.rgb * (1.0 - source.a);
    destination.a = source.a + destination.a * (1.0 - source.a);
}
float4 Disc(float2 uv, float2 size, float2 center, float radius,
            float4 centerColor, float4 edgeColor) {
    if (radius <= 0.0) return 0.0;
    float minimumSide = min(size.x, size.y);
    float distanceToCenter = length((uv - center) * size) *
                             (2.0 / minimumSide);
    float aa = 2.0 / minimumSide;
    float coverage = 1.0 - smoothstep(radius - aa, radius + aa,
                                      distanceToCenter);
    float interpolation = saturate(distanceToCenter / max(radius, 1e-6));
    float4 color = lerp(Quantize(centerColor), Quantize(edgeColor),
                        interpolation);
    color.a *= coverage;
    color.rgb *= color.a;
    return color;
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 6) {
        float value = max(RelativeBands.Load(int3(pixel.x, 0, 0)).r, 0.0);
        return float4(PackPositive(value), 1.0);
    }

    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.sceneSpacePos.xy / size;
    float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
    float mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0.0);
    float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
    float sounds = (bass + mid + treb) / 3.0;
    float4 result = 0.0;

    float2 center0 = float2(.5 + .207 * cos(time * bass * .1),
                            .5 + .207 * sin(time * bass * .1));
    Over(result, Disc(uv, size, center0, .40031 * sounds * .6,
        float4(.5 + .5 * sin(bass), .5 + .5 * sin(mid), 0.0, 1.0),
        float4(.5, 0.0, 0.0, 0.0)));

    float2 center1 = float2(.5 + .3 * sin(time * bass),
                            .5 + .317 * cos(time * bass));
    Over(result, Disc(uv, size, center1, .13465 * (treb + mid) / 3.0,
        float4(1.0, .09 * cos((bass + mid) * 1.37), 0.0, 1.0),
        float4(1.0, 1.0 + .09 * sin((treb + mid) * 1.23), 0.0, .3)));

    float alpha = saturate(100.0 * (sounds - .4) / .6);
    alpha = floor(alpha * 255.0 + .5) / 255.0;
    float coverage = CircularWave(input.sceneSpacePos.xy, size);
    float3 waveColor = Quantize(float4(
        1.0 + .4 * (.6 * sin(.933 * time) + .4 * sin(1.045 * time)),
        1.0 + .4 * (.6 * sin(.900 * time) + .4 * sin(.956 * time)),
        1.0 + .4 * (.6 * sin(.910 * time) + .4 * sin(.920 * time)),
        1.0)).rgb;
    float waveOpacity = coverage * alpha;
    Over(result, float4(waveColor * waveOpacity, waveOpacity));

    float step30 = max(frameStep * .5, .0001);
    if (step30 < .9999 && result.a > 1e-6) {
        float temporalAlpha = 1.0 - pow(saturate(1.0 - result.a), step30);
        result.rgb *= temporalAlpha / result.a;
        result.a = temporalAlpha;
    }
    return saturate(result);
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

float UnpackUnit(float3 packed) {
    return dot(packed, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float UnpackPositive(float3 packed) {
    float value = min(UnpackUnit(packed), .99999);
    return value / max(1.0 - value, .00001);
}
int WrapIndex(int value, int count) {
    int wrapped = value % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 HistoryTexel(int2 pixel, int2 dimensions, bool wrapTexture) {
    if (wrapTexture) {
        pixel = int2(WrapIndex(pixel.x, dimensions.x),
                     WrapIndex(pixel.y, dimensions.y));
    } else {
        pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    }
    if (pixel.y == 0 && pixel.x < 6) pixel.x = min(6, dimensions.x - 1);
    return Previous.Load(int3(pixel, 0)).rgb;
}
float3 History(float2 uv, float2 size, bool wrapTexture) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions, wrapTexture),
        HistoryTexel(base + int2(1, 0), dimensions, wrapTexture), f.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions, wrapTexture),
        HistoryTexel(base + int2(1, 1), dimensions, wrapTexture), f.x);
    return lerp(top, bottom, f.y);
}
float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float footprint = 1.75;
    float2 aligned = uv + 1.0 / size;
    float3 sum = 0.0;
    [fastopt]
    for (int index = 0; index < 4; ++index) {
        float2 offset = float2(offsets[index] * footprint / size.x, 0.0);
        sum += (History(aligned + offset, size, false) +
                History(aligned - offset, size, false)) * weights[index];
    }
    return sum * .027322404;
}
float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(.901408451, 2.487804878);
    const float footprint = 1.75;
    float2 aligned = uv + float2(2.0 / size.x, 0.0);
    float3 sum = 0.0;
    [fastopt]
    for (int index = 0; index < 2; ++index) {
        float2 offset = float2(0.0, offsets[index] * 2.0 *
                                     footprint / size.y);
        sum += (Blur1Horizontal(aligned + offset, size) +
                Blur1Horizontal(aligned - offset, size)) * weights[index];
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeScale = .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return min(sum * .027322404 * edgeScale, .98);
}
float2 WarpVertex(float2 original, float2 size, float bass, float step30) {
    float2 mesh = original * 2.0 - 1.0;
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 corrected = mesh * aspect;
    float radius = length(corrected);
    float angle = atan2(corrected.y, corrected.x);
    float zoom = 1.00951 + .023 *
        (.6 * sin(.339 * time) + .4 * sin(.276 * time));
    zoom -= max(.005, bass - 1.3) *
            sin(time * 2.0 + radius * 3.0) * sin(angle * 3.0);
    float zoomStep = pow(max(zoom, .01), step30);
    return .5 + (original - .5) / zoomStep + .5 / size;
}
float2 MeshUV(float2 original, float2 size, float bass, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(original) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1.0, 0.0)) / grid;
    float2 c01 = (cell + float2(0.0, 1.0)) / grid;
    float2 c11 = (cell + 1.0) / grid;
    bool lower = f.x + f.y <= 1.0;
    float3 weight = lower
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float2 corner[3] = {
        lower ? c00 : c10,
        lower ? c10 : c01,
        lower ? c01 : c11
    };
    float2 warped[3];
    [fastopt]
    for (int cornerIndex = 0; cornerIndex < 3; ++cornerIndex)
        warped[cornerIndex] = WarpVertex(
            corner[cornerIndex], size, bass, step30);
    return weight.x * warped[0] + weight.y * warped[1] +
           weight.z * warped[2];
}

float4 main(PSInput input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 6) return 0.0;
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * .5, .0001);
    float bass = UnpackPositive(Previous.Load(int3(0, 0, 0)).rgb);
    float2 uv = MeshUV(input.texelSpacePos.xy, size, bass, step30);
    float2 d = 4.0 / size;

    float2 blurUv[5] = {
        frac(uv + float2(d.x, 0.0)), frac(uv - float2(d.x, 0.0)),
        frac(uv + float2(0.0, d.y)), frac(uv - float2(0.0, d.y)), uv
    };
    float3 blurValue[5];
    [fastopt]
    for (int blurIndex = 0; blurIndex < 5; ++blurIndex)
        blurValue[blurIndex] = Blur1(blurUv[blurIndex], size);
    const float blurFlowGain = 2.0;
    float3 dx = (blurValue[0] - blurValue[1]) * blurFlowGain;
    float3 dy = (blurValue[2] - blurValue[3]) * blurFlowGain;
    float3 centerBlur = blurValue[4];

// Preserve the 30..120-Hz resampling compensation; above 120 Hz
// keep the same displacement budget per second as at 120 Hz.
    float flowStep = step30 * pow(max(step30, .25), -.32);
    float2 pixel4 = 4.0 / size * flowStep;
    float2 pixel12 = 12.0 / size * flowStep;
    float2 greenUv = uv + float2(dx.g, dy.g) * pixel4 +
                          float2(dx.r, dy.r) * pixel12;
    float2 redUv = uv + float2(dx.r, dy.r) * pixel4 +
                        float2(dx.b, dy.b) * pixel12;
    float2 blueUv = uv + float2(dx.b, dy.b) * pixel4 +
                         float2(dx.g, dy.g) * pixel12;
    float2 channelUv[3] = { frac(redUv), frac(greenUv), frac(blueUv) };
    float3 channelSample[3];
    [fastopt]
    for (int channelIndex = 0; channelIndex < 3; ++channelIndex)
        channelSample[channelIndex] = History(
            channelUv[channelIndex], size, true);
    float3 result = float3(channelSample[0].r,
                           channelSample[1].g,
                           channelSample[2].b);
    result += (result - centerBlur) * (.042 * step30) - .0055 * step30;
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

int WrapIndex(int value, int count) {
    int wrapped = value % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 FrameTexel(int2 pixel, int2 dimensions, bool wrapTexture) {
    if (wrapTexture) {
        pixel = int2(WrapIndex(pixel.x, dimensions.x),
                     WrapIndex(pixel.y, dimensions.y));
    } else {
        pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    }
    if (pixel.y == 0 && pixel.x < 6) pixel.x = min(6, dimensions.x - 1);
    return Frame.Load(int3(pixel, 0)).rgb;
}
float3 Image(float2 uv, float2 size, bool wrapTexture) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(FrameTexel(base, dimensions, wrapTexture),
        FrameTexel(base + int2(1, 0), dimensions, wrapTexture), f.x);
    float3 bottom = lerp(FrameTexel(base + int2(0, 1), dimensions, wrapTexture),
        FrameTexel(base + int2(1, 1), dimensions, wrapTexture), f.x);
    return lerp(top, bottom, f.y);
}
float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float footprint = 1.75;
    float2 aligned = uv + 1.0 / size;
    float3 sum = 0.0;
    [fastopt]
    for (int index = 0; index < 4; ++index) {
        float2 offset = float2(offsets[index] * footprint / size.x, 0.0);
        sum += (Image(aligned + offset, size, false) +
                Image(aligned - offset, size, false)) * weights[index];
    }
    return sum * .027322404;
}
float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(.901408451, 2.487804878);
    const float footprint = 1.75;
    float2 aligned = uv + float2(2.0 / size.x, 0.0);
    float3 sum = 0.0;
    [fastopt]
    for (int index = 0; index < 2; ++index) {
        float2 offset = float2(0.0, offsets[index] * 2.0 *
                                     footprint / size.y);
        sum += (Blur1Horizontal(aligned + offset, size) +
                Blur1Horizontal(aligned - offset, size)) * weights[index];
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeScale = .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return min(sum * .027322404 * edgeScale, .98);
}
float3 Blur2(float2 uv, float2 size) {
    // Native Blur2 is the second progressively downsampled blur pair.  Its
    // footprint reaches roughly 20-26 source pixels at this stage; a single
    // 7-pixel ring leaves bright green history much too local for this
    // preset's colour-sensitive composite.
    float2 texel = 1.0 / size;
    float2 offset[12] = {
        float2( 8.0,  0.0), float2(-8.0,  0.0),
        float2( 0.0,  8.0), float2( 0.0, -8.0),
        float2( 7.0,  7.0), float2(-7.0,  7.0),
        float2( 7.0, -7.0), float2(-7.0, -7.0),
        float2(20.0,  0.0), float2(-20.0,  0.0),
        float2( 0.0, 20.0), float2( 0.0,-20.0)
    };
    float3 sum = Image(uv, size, false) * 4.0;
    [fastopt]
    for (int index = 0; index < 12; ++index) {
        float weight = index < 4 ? 2.0 : 1.0;
        sum += Image(uv + offset[index] * texel, size, false) * weight;
    }
    // GetBlur2 converts its normalized blur texture back to b2n..b2x.
    return min(sum * (.98 / 20.0), .98);
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float2 onePixel = 1.0 / size;
    float2 imageUv[4] = {
        uv + float2(onePixel.x, 0.0), uv - float2(onePixel.x, 0.0),
        uv + float2(0.0, onePixel.y), uv - float2(0.0, onePixel.y)
    };
    float3 imageValue[4];
    [fastopt]
    for (int imageIndex = 0; imageIndex < 4; ++imageIndex)
        imageValue[imageIndex] = Image(imageUv[imageIndex], size, true);
    float3 dx = imageValue[0] - imageValue[1];
    float3 dy = imageValue[2] - imageValue[3];
    float2 displacement = float2(dx.g, dy.g) * 3.0;

    float2 d = 2.0 / size;
    float2 blurUv[4] = {
        uv + float2(d.x, 0.0), uv - float2(d.x, 0.0),
        uv + float2(0.0, d.y), uv - float2(0.0, d.y)
    };
    float3 blurValue[4];
    [fastopt]
    for (int blurIndex = 0; blurIndex < 4; ++blurIndex)
        blurValue[blurIndex] = Blur1(blurUv[blurIndex], size);
    float3 blurDx = blurValue[0] - blurValue[1];
    float3 blurDy = blurValue[2] - blurValue[3];
    displacement += float2(blurDx.g, blurDy.g);

    float gradient = pow(max(length(displacement) * .8, 0.0), .7);
    float3 result = (gradient + Blur2(uv, size).g * .4 - .1) *
                    float3(4.3, .5, .7);
    // The original reassigns dx/dy to the Blur1 gradients before this lookup.
    float2 finalUv[2] = {
        uv + float2(blurDx.r, blurDy.r) * onePixel * 18.0, uv
    };
    float3 finalValue[2];
    [fastopt]
    for (int finalIndex = 0; finalIndex < 2; ++finalIndex)
        finalValue[finalIndex] = Image(finalUv[finalIndex], size, true);
    float redField = finalValue[0].r;
    result = lerp(result, float3(.5, .1, 0.0), redField * 6.0);
    result = lerp(result, 1.0, finalValue[1].b);
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0204",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader
        }
    };
};
