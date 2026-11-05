// MilkDrop 0267 — beat-steered feedback with orbiting additive discs.
//
// Original: original/0267.milk (PSVERSION_WARP=3, PSVERSION_COMP=3).
// Eleven custom-shape instances inject audio-reactive light into a nonlinear
// feedback field. The built-in mode-0 wave has alpha .001 and is below the
// modern renderer's visibility threshold. No external textures are required.

MilkDropPresets["0267"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;
    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    const shader = `
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
static const int PRIVATE_WIDTH = 16;

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
float Quantize(float value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float3 Quantize(float3 value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float TemporalAlpha(float alpha30, float step30) {
    return step30 < .9999
        ? 1.0 - pow(saturate(1.0 - alpha30), step30)
        : alpha30;
}
float ShapeWeight(float2 pixel, float2 size,
                  float2 centerPreset, float radius) {
    float2 center = float2(centerPreset.x, 1.0 - centerPreset.y) * size;
    float radiusPixels = .5 * radius * min(size.x, size.y);
    return saturate(1.0 - length(pixel - center) /
                    max(radiusPixels, .5));
}
void AddShape(inout float3 additive, float2 pixel, float2 size,
              float2 center, float radius, float3 color, float emission) {
    float weight = ShapeWeight(pixel, size, center, radius);
    // Additive custom shapes interpolate both RGB and alpha to zero at the
    // rim, hence their fixed-function contribution is color * weight^2.
    additive += color * weight * weight * emission;
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 address = int2(floor(input.sceneSpacePos.xy));
    if (address.y == 0 && address.x >= 0 && address.x < PRIVATE_WIDTH) {
        if (address.x < 6) {
            float value = max(RelativeBands.Load(
                int3(address.x, 0, 0)).r, 0.0);
            return float4(PackPositive(value), 1.0);
        }
        return 0.0;
    }

    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 pixel = input.sceneSpacePos.xy;
    float2 uv = pixel / size;
    float step30 = max(frameStep * .5, .0001);
    float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
    float midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0.0);
    float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);

    // shape_0: 30-sided black source-over disc. Its animated outline has
    // border_a=0, so bob, ro and the random colour seed are not visible.
    float shape0Weight = ShapeWeight(pixel, size, float2(.5, .5), .06623);
    float shape0Alpha = TemporalAlpha(
        shape0Weight * Quantize(.1), step30);

    // Keep the 30-Hz frame-driven colour equations smooth at higher rates.
    float frame30 = time * 30.0;
    float phase = frame30 * .5;
    // Above 120 Hz, preserve the established emission per second instead
    // of continuing the sqrt compensation with an ever-growing gain.
    float emission = saturate(step30) / sqrt(max(saturate(step30), .25));
    float3 additive = 0.0;

    float3 color1 = Quantize(float3(
        .5 + .5 * sin(phase),
        .5 + .5 * sin(phase + 4.188),
        .66 + .66 * sin(frame30 * .66 + 2.2615)));
    [fastopt]
    for (int instance1 = 0; instance1 < 4; ++instance1) {
        float orbit = (float)(instance1 != 0) * time /
                      max((float)instance1, 1.0);
        float x = .5 + .225 * sin(orbit * .7);
        float y = .54 + .36 * cos(orbit * .62);
        x -= .4 * x * sin(time);
        y -= .44 * y * cos(time);
        AddShape(additive, pixel, size, float2(x, y), .1 * midAtt,
                 color1, emission);
    }

    float3 color2 = Quantize(float3(
        .5 + .5 * sin(phase),
        .427 + .427 * sin(frame30 * .427 + 3.9367),
        .5 + .5 * sin(phase + 2.094)));
    AddShape(additive, pixel, size,
        float2(.39 + .1822 * sin(time + 1.693),
               .5 + .3 * cos(time + 2.09)),
        .1 * bassAtt, color2, emission);

    float3 color3 = Quantize(.5 + .5 * float3(
        sin(phase), sin(phase + 4.188), sin(phase + 2.094)));
    [fastopt]
    for (int instance3 = 0; instance3 < 5; ++instance3) {
        float orbit = (float)(instance3 != 0) * time /
                      max((float)instance3, 1.0);
        float x = .5 + .225 * sin(orbit);
        float y = .41 + .35 * cos(orbit);
        x += .47 * x * sin(time);
        y += .4 * y * cos(time);
        AddShape(additive, pixel, size, float2(x, y),
                 .07419 * trebAtt, color3, emission);
    }

    // DrawSprites applies the opaque black outer border last. ob_size=.012
    // is .006 of each normalized screen dimension in the DX9 path.
    float edge = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
    float borderAlpha = edge < .006 ? 1.0 : 0.0;
    float transmittance = (1.0 - shape0Alpha) * (1.0 - borderAlpha);
    float3 premultiplied = additive * (1.0 - borderAlpha);
    return float4(saturate(premultiplied), 1.0 - transmittance);
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
static const float3 MAGIC = float3(.1725, .5333, .9137);
static const int PRIVATE_WIDTH = 16;

float Hash12(float2 value) {
    return frac(sin(dot(value, float2(127.1, 311.7))) * 43758.5453);
}
float Hash11(float value) {
    return frac(sin(value * 127.1 + 311.7) * 43758.5453);
}
float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float UnpackUnit(float3 packed) {
    return dot(packed, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}
float UnpackPositive(float3 packed) {
    float value = min(UnpackUnit(packed), .99999);
    return value / max(1.0 - value, .00001);
}
float PackPositiveChannel(float value) {
    value = max(value, 0.0);
    return value / (1.0 + value);
}
float UnpackPositiveChannel(float packed) {
    packed = min(saturate(packed), .999);
    return packed / max(1.0 - packed, .001);
}
float3 PackPositiveChannels(float3 value) {
    value = max(value, 0.0);
    return value / (1.0 + value);
}
float3 UnpackPositiveChannels(float3 packed) {
    packed = min(saturate(packed), .999);
    return packed / max(1.0 - packed, .001);
}
float4 State(int index) {
    return Previous.Load(int3(index, 0, 0));
}
float Audio(int band) {
    return UnpackPositive(State(band).rgb);
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
    if (pixel.y == 0 && pixel.x < PRIVATE_WIDTH) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}
float3 HistoryBilinear(float2 uv, float2 size, bool wrapTexture) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    return lerp(
        lerp(HistoryTexel(base, dimensions, wrapTexture),
             HistoryTexel(base + int2(1, 0), dimensions, wrapTexture), f.x),
        lerp(HistoryTexel(base + int2(0, 1), dimensions, wrapTexture),
             HistoryTexel(base + int2(1, 1), dimensions, wrapTexture), f.x),
        f.y);
}
float4 CubicWeights(float t) {
    float t2 = t * t, t3 = t2 * t;
    return float4(-.5 * t + t2 - .5 * t3,
                  1.0 - 2.5 * t2 + 1.5 * t3,
                  .5 * t + 2.0 * t2 - 1.5 * t3,
                  -.5 * t2 + .5 * t3);
}
float3 CubicRow(int2 pixel, int2 dimensions, float4 weights,
                bool wrapTexture) {
    return HistoryTexel(pixel + int2(-1, 0), dimensions,
                        wrapTexture) * weights.x +
           HistoryTexel(pixel, dimensions, wrapTexture) * weights.y +
           HistoryTexel(pixel + int2(1, 0), dimensions,
                        wrapTexture) * weights.z +
           HistoryTexel(pixel + int2(2, 0), dimensions,
                        wrapTexture) * weights.w;
}
float3 HistoryCubic(float2 uv, float2 size, bool wrapTexture) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float4 wx = CubicWeights(f.x), wy = CubicWeights(f.y);
    float3 result = CubicRow(base + int2(0, -1), dimensions, wx,
                             wrapTexture) * wy.x +
                    CubicRow(base, dimensions, wx, wrapTexture) * wy.y +
                    CubicRow(base + int2(0, 1), dimensions, wx,
                             wrapTexture) * wy.z +
                    CubicRow(base + int2(0, 2), dimensions, wx,
                             wrapTexture) * wy.w;
    return saturate(result);
}
float3 History(float2 uv, float2 size, bool wrapTexture) {
    float3 reconstructed = HistoryBilinear(uv, size, wrapTexture);
    [branch]
    if (frameStep < 2.0)
        reconstructed = lerp(reconstructed,HistoryCubic(uv,size,wrapTexture),
                             saturate(2.0-frameStep));
    return reconstructed;
}
float3 Noise(float2 uv, float2 seed) {
    float2 base = floor(frac(uv + seed) * 256.0);
    float2 f = frac(frac(uv + seed) * 256.0);
    float3 a = float3(Hash12(base), Hash12(base + 13.7),
                      Hash12(base + 23.1));
    float3 b = float3(Hash12(base + float2(1, 0)),
                      Hash12(base + float2(1, 0) + 13.7),
                      Hash12(base + float2(1, 0) + 23.1));
    float3 c = float3(Hash12(base + float2(0, 1)),
                      Hash12(base + float2(0, 1) + 13.7),
                      Hash12(base + float2(0, 1) + 23.1));
    float3 d = float3(Hash12(base + 1.0), Hash12(base + 1.0 + 13.7),
                      Hash12(base + 1.0 + 23.1));
    return lerp(lerp(a, b, f.x), lerp(c, d, f.x), f.y);
}
float2 WarpVertex(float2 original, float2 size, float step30,
                  float2 center, float zoom30, float rotation30,
                  float2 translation30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    // Modern MilkDrop first enters its aspect-corrected mesh space. Zoom is
    // centred on .5; only stretch and rotation use the preset cx/cy.
    float2 vertex = float2(2.0 * original.x - 1.0,
                           1.0 - 2.0 * original.y);
    float radius = length(vertex * aspect);
    float exponent = pow(1.21, radius * 2.0 - 1.0);
    float zoomStep = pow(max(zoom30, .05), exponent * step30);
    float2 stretchStep = pow(float2(1.14989, 1.09), step30);
    float2 target = .5 + (original - .5) * aspect;
    target = .5 + (target - .5) / zoomStep;
    target = center + (target - center) / stretchStep;
    float warpTime = time * 1.62;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 + 7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 + 3.0),
        11.49 + 4.0 * cos(warpTime * .933 + 5.0));
    // Built-in warp phases use the mesh's explicit Y-up vertex convention;
    // the resulting V displacement is then applied in texture space.
    float2 scaled = vertex / 1.846;
    float warpX = sin(warpTime * .333 + scaled.x * factors.x -
                      scaled.y * factors.w) +
                  cos(warpTime * .753 - scaled.x * factors.y +
                      scaled.y * factors.z);
    float warpY = cos(warpTime * .375 - scaled.x * factors.z -
                      scaled.y * factors.y) +
                  sin(warpTime * .825 + scaled.x * factors.x +
                      scaled.y * factors.w);
    target += .0086 * .0035 * step30 * float2(warpX, warpY);

    // MilkDrop's mesh order is zoom, stretch, ordinary warp, rotation, then
    // translation. dx/dy describe visible motion, so they are subtracted
    // from the lookup UV; adding them reverses the accumulated sweep.
    float rotation = rotation30 * step30;
    float cs = cos(rotation), sn = sin(rotation);
    float2 delta = target - center;
    target = center + float2(cs * delta.x - sn * delta.y,
                             sn * delta.x + cs * delta.y);
    target -= translation30 * step30;
    return .5 + (target - .5) / aspect;
}
float2 MeshUV(float2 original, float2 size, float step30,
              float2 center, float zoom30, float rotation30,
              float2 translation30) {
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
        warped[cornerIndex] = WarpVertex(corner[cornerIndex], size,
            step30, center, zoom30, rotation30, translation30);
    return weight.x * warped[0] + weight.y * warped[1] +
           weight.z * warped[2];
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 original = input.texelSpacePos.xy;
    float2 pixel = input.sceneSpacePos.xy;
    float step30 = max(frameStep * .5, .0001);
    bool initialized = all(abs(State(15).rgb - MAGIC) < .012);
    float bass = initialized ? Audio(0) : 0.0;
    float mid = initialized ? Audio(1) : 0.0;
    float treb = initialized ? Audio(2) : 0.0;
    float bassAtt = initialized ? Audio(3) : 0.0;
    float midAtt = initialized ? Audio(4) : 0.0;
    float trebAtt = initialized ? Audio(5) : 0.0;

    float decMed = pow(.8, step30);
    float decSlow = pow(.862, step30);
    float beat = (bass + mid + treb) / 3.0;
    float average = initialized ? UnpackPositive(State(6).rgb) : 0.0;
    float peak = initialized ? UnpackPositive(State(7).rgb) : 0.0;
    float age = initialized ? UnpackPositive(State(8).rgb) : 0.0;
    average = average * decSlow + beat * (1.0 - decSlow);
    age += step30 / 30.0;
    bool isBeat = beat > .22 + average + peak && age > .22;
    if (isBeat) age = 0.0;
    peak = isBeat ? beat : peak * decMed;

    float4 indexState = State(9);
    // Fixed representatives of per_frame_init rand(8). State survives FPS
    // switches, so the values are selected only on a genuine preset reset.
    float index = initialized ? floor(indexState.r * 8.0 + .5) : 3.0;
    // Use the common rand(8) branch where bnot(index2 % 3) is initially
    // false. This starts at the preset's fixed off-centre (.44,.38), producing
    // the reference sideward sweep; later index wraps still enable the moving
    // centre periodically.
    float index2 = initialized ? floor(indexState.g * 8.0 + .5) : 5.0;
    if (isBeat) {
        index = fmod(index + 1.0, 8.0);
        if (index < .5) index2 = fmod(index2 + 1.0, 8.0);
    }
    float p1 = initialized ? UnpackPositive(State(10).rgb) : 0.0;
    float p2 = initialized ? UnpackPositive(State(11).rgb) : 0.0;
    if (isBeat && index < .5) p1 += 1.0;
    p2 = decMed * p2 + (1.0 - decMed) * p1;
    float rotationPhase = p2 * 3.330088212805 * .5;
    float q1 = cos(rotationPhase), q2 = sin(rotationPhase);

    // Fixed representative of per_frame_init trel=rand(10).
    float trel = initialized ? UnpackPositive(State(12).rgb) : 4.0;
    float trelFiltered = initialized ? UnpackPositive(State(13).rgb) : trel;
    float3 smoothBands = initialized
        ? UnpackPositiveChannels(State(14).rgb) : 0.0;
    // per_frame uses the preceding bass_/mid_/treb_ values for trel, then
    // updates the three filters later in the same frame.
    trel += dot(smoothBands, 1.0) * step30 / 90.0;
    trelFiltered = trelFiltered * decMed + (1.0 - decMed) * trel;
    float bandRetention = pow(.79, step30);
    smoothBands = smoothBands * bandRetention +
        (1.0 - bandRetention) * float3(bassAtt, midAtt, trebAtt);
    float rota = initialized ? UnpackPositiveChannel(indexState.b) : 0.0;
    rota = rota * decMed + (1.0 - decMed) * peak * .5;

    int2 statePixel = int2(floor(pixel));
    if (statePixel.y == 0 && statePixel.x >= 0 &&
        statePixel.x < PRIVATE_WIDTH) {
        if (statePixel.x < 6) return 0.0;
        if (statePixel.x == 6) return float4(PackPositive(average), 1.0);
        if (statePixel.x == 7) return float4(PackPositive(peak), 1.0);
        if (statePixel.x == 8) return float4(PackPositive(age), 1.0);
        if (statePixel.x == 9) return float4(index / 8.0,
            index2 / 8.0, PackPositiveChannel(rota), 1.0);
        if (statePixel.x == 10) return float4(PackPositive(p1), 1.0);
        if (statePixel.x == 11) return float4(PackPositive(p2), 1.0);
        if (statePixel.x == 12) return float4(PackPositive(trel), 1.0);
        if (statePixel.x == 13) return float4(PackPositive(trelFiltered), 1.0);
        if (statePixel.x == 14) return float4(
            PackPositiveChannels(smoothBands), 1.0);
        return float4(MAGIC, 1.0);
    }

    float mask = fmod(index2, 3.0) < .5 ? 1.0 : 0.0;
    float2 center = float2(
        .44 + .25 * sin(trelFiltered * 12.0) * mask,
        .38 + .49 * cos(trelFiltered * 6.0) * mask);
    float zoom30 = .76 + .046 * q1 * (50.0 / 30.0);
    float rotation30 = (.032 * q1 + rota * q2 / 8.0) * (50.0 / 30.0);
    float2 translation30 = float2(.0144 * q1, .014 * q2) *
                           (50.0 / 30.0) * average;
    float2 uv = MeshUV(original, size, step30, center, zoom30,
                       rotation30, translation30);
    // The custom warp retains only twenty percent of built-in mesh motion.
    uv = lerp(original, uv, .2);

    float2 renderFrame = floor(time * 30.0 / step30).xx;
    float2 randomOffset = float2(
        Hash11(renderFrame.x * 1.13 + 14.1),
        Hash11(renderFrame.x * 1.27 + 29.7));
    float2 ditherUv = original * size / 256.0 * 1.5 + randomOffset;
    float3 displaced = History(uv, size, true);
    float luminance = dot(displaced, float3(.299, .587, .114));
    uv.y -= (luminance - .35) * (luminance - .4) *
            32.0 / size.y * step30;
    float3 result = History(saturate(uv), size, false) - .0011 * step30;
    result += (Noise(ditherUv, 0.0) - .5) * (.0038 * step30);

    // Preserve sub-LSB feedback changes in the 8-bit recursive bitmap.
    if (step30 < .999) {
        float2 jitterKey = floor(pixel) +
            renderFrame * float2(.75487766, .56984029);
        float3 jitter = float3(Hash12(jitterKey),
            Hash12(jitterKey + float2(17.0, 53.0)),
            Hash12(jitterKey + float2(101.0, 29.0))) - .5;
        result += jitter * (1.0 / 255.0);
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
static const int PRIVATE_WIDTH = 16;
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
    if (pixel.y == 0 && pixel.x < PRIVATE_WIDTH) return 0.0;
    return Frame.Load(int3(pixel, 0)).rgb;
}
float3 Image(float2 uv, float2 size, bool wrapTexture) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    return lerp(
        lerp(FrameTexel(base, dimensions, wrapTexture),
             FrameTexel(base + int2(1, 0), dimensions, wrapTexture), f.x),
        lerp(FrameTexel(base + int2(0, 1), dimensions, wrapTexture),
             FrameTexel(base + int2(1, 1), dimensions, wrapTexture), f.x),
        f.y);
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
    float edgeScale = .69 + .31 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return min(sum * .027322404 * edgeScale, .97);
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float2 d = 4.0 / size;
    float2 blurUv[5] = {
        uv + float2(d.x, 0.0), uv - float2(d.x, 0.0),
        uv + float2(0.0, d.y), uv - float2(0.0, d.y), uv
    };
    float3 blurValue[5];
    [fastopt]
    for (int blurIndex = 0; blurIndex < 5; ++blurIndex)
        blurValue[blurIndex] = Blur1(blurUv[blurIndex], size);
    float dx = blurValue[0].g - blurValue[1].g;
    float dy = blurValue[2].g - blurValue[3].g;
    float2 displacedUv = uv - float2(dx, dy) * .5;
    float3 current = Image(uv, size, true);
    float3 result = lerp(
        float3(1.4, .8, 2.0) * Image(displacedUv, size, true).r,
        float3(1.6, 2.0, 3.0), blurValue[4].g * .05);
    result = lerp(result, float3(1.0, .1, -2.0), current.b);
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0267",
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
