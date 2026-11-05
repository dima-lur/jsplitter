// MilkDrop 0177 — bipolar mirrored feedback with orbiting additive shapes.
//
// Original: original/0177.milk (renamed from the colliding 0176 in the new
// batch; PSVERSION_WARP=0, PSVERSION_COMP=3). The recursive image uses the
// native 48x36 mesh and its per-vertex complex-square displacement. Four
// custom-shape groups are drawn into that history before a two-stage bipolar,
// spherical-lens and mirror composite. The embedded lines1.jpg sprite uses
// Decal blending and burns into the recursive history.
//
// The original's bb/mm/tt smoothing and bm/mt accumulators drive q26/q27 in
// the composite. They are kept in private feedback pixels; two independent
// sentinels reject the outgoing frame injected by the preset browser. The
// invisible mode-0 wave (wave_a=.001) is below the native visibility cutoff.
//
// Loaded by Shader - MilkDrop ALL.js; no side effects or callbacks here.
MilkDropPresets["0177"] = function (TARGET_FPS) {
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
static const float PI = 3.141592653589793;
static const float TWO_PI = 6.283185307179586;
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
float ShapeWeight(float2 p, float2 size, float2 centerUv, float radius) {
    // Custom-shape coordinates use preset Y, whose screen conversion is 1-y.
    float2 center = float2(centerUv.x, 1.0 - centerUv.y) * size;
    float radiusPixels = .5 * radius * min(size.x, size.y);
    return saturate(1.0 - length(p - center) / max(radiusPixels, .5));
}
void AddShape(inout float3 additive, float2 p, float2 size,
              float2 center, float radius, float3 color, float emission) {
    float weight = ShapeWeight(p, size, center, radius);
    // Both RGB and alpha interpolate from their centre values to zero at the
    // polygon rim. Additive fixed-function blending therefore contributes w².
    additive += color * (weight * weight * emission);
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < PRIVATE_WIDTH) {
        if (pixel.x < 6) {
            float value = max(RelativeBands.Load(int3(pixel.x, 0, 0)).r, 0.0);
            return float4(PackPositive(value), 1.0);
        }
        return 0.0;
    }

    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 uv = p / size;
    float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
    float midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0.0);
    float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);

    // shape_0: an almost circular black source-over polygon. Its border alpha
    // is zero; ro/ang therefore has no visible effect at thirty sides.
    float shape0Weight = ShapeWeight(p, size, float2(.5, .5), .06623);
    // The opaque burned sprite replaces the background each frame, so this
    // opacity is per draw, just like the additive shapes and borders below.
    float shapeAlpha = shape0Weight * Quantize(.1);

    // Shapes 1..3 share the frame-driven RGB cycle. At the 30-Hz reference
    // frame*.5 advances at 15 radians per second.
    float phase = time * 15.0;
    float3 shapeColor = Quantize(.5 + .5 * float3(
        sin(phase), sin(phase + 4.188), sin(phase + 2.094)));
    float3 additive = 0.0;

    // BurnSprite pastes an opaque Decal over the visible history each frame;
    // these highlights are then added to that freshly replaced background.
    // They do not accumulate across frames, so their strength must not be
    // scaled by step30 (or sqrt(step30)). Keep the native per-frame peak and
    // radius at every FPS; attenuated audio bands still drive each radius below.
    float emission = 1.0;

    [fastopt]
    for (int shape1Instance = 0; shape1Instance < 4; ++shape1Instance) {
        float orbit = (float)(shape1Instance != 0) * time /
                      max((float)shape1Instance, 1.0) * .7;
        float x = .5 + .225 * sin(orbit);
        float y = .5 + .3 * cos(orbit);
        x -= .4 * x * sin(time);
        y -= .4 * y * cos(time);
        AddShape(additive, p, size, float2(x, y), .1 * midAtt,
                 shapeColor, emission);
    }

    AddShape(additive, p, size,
        float2(.5 + .225 * sin(time + 2.09),
               .5 + .3 * cos(time + 2.09)),
        .1 * bassAtt, shapeColor, emission);

    [fastopt]
    for (int shape3Instance = 0; shape3Instance < 5; ++shape3Instance) {
        float orbit = (float)(shape3Instance != 0) * time /
                      max((float)shape3Instance, 1.0);
        float x = .5 + .225 * sin(orbit);
        float y = .5 + .3 * cos(orbit);
        x += .4 * x * sin(time);
        y += .4 * y * cos(time);
        AddShape(additive, p, size, float2(x, y), .07419 * trebAtt,
                 shapeColor, emission);
    }

    // DrawSprites applies the outer black and then inner red border after the
    // shapes. ob_size/ib_size=.05 in NDC, i.e. 2.5% of each screen dimension.
    // BurnSprite replaces the preceding border too: there is no accumulated
    // opacity to compensate. Temporal scaling made these borders fade at high
    // FPS and flicker with frame-time jitter; the composite maps them to the
    // red/black crossing bands on the lobes. Keep native per-frame alpha.
    float edge = min(min(uv.x, uv.y), min(1.0 - uv.x, 1.0 - uv.y));
    float borderAlpha = 0.0;
    float3 borderColor = 0.0;
    if (edge < .025) {
        borderAlpha = Quantize(.6);
        borderColor = 0.0;
    } else if (edge < .05) {
        borderAlpha = Quantize(.4);
        borderColor = float3(1.0, 0.0, 0.0);
    }

    // Collapse shape_0 and the later border into one premultiplied source.
    // The additive shapes lie between them in native draw order.
    float transmittance = (1.0 - shapeAlpha) * (1.0 - borderAlpha);
    float3 premultiplied = additive * (1.0 - borderAlpha) +
                           borderColor * borderAlpha;
    return float4(premultiplied, 1.0 - transmittance);
}`;

    const warpShader = `
Texture2D Previous : register(t0);
Texture2D SpriteTexture : register(t1);
SamplerState SpriteSampler : register(s1);
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
static const float3 MAGIC_A = float3(.1725, .5333, .9137);
static const float3 MAGIC_B = float3(.8275, .2314, .6745);
static const int PRIVATE_WIDTH = 16;

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
float3 PackSigned(float value) {
    // bm/mt are true signed accumulators in the preset. A symmetric rational
    // mapping keeps both signs and does not impose an artificial wrap period.
    return PackUnit(.5 + .5 * value / (1.0 + abs(value)));
}
float UnpackSigned(float3 packed) {
    float mapped = UnpackUnit(packed) * 2.0 - 1.0;
    return mapped / max(1.0 - abs(mapped), .00001);
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
float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel = int2(WrapIndex(pixel.x, dimensions.x),
                 WrapIndex(pixel.y, dimensions.y));
    if (pixel.y == 0 && pixel.x < PRIVATE_WIDTH) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}
float3 History(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
        HistoryTexel(base + int2(1, 0), dimensions), f.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
        HistoryTexel(base + int2(1, 1), dimensions), f.x);
    return lerp(top, bottom, f.y);
}
float3 BurnSprite(float3 destination, float2 uv, float2 size) {
    // Embedded SpriteSX/SY are stored as offsets from one by the compatible
    // MilkDrop3 state path: .78 becomes the native half-extent multiplier 1.78.
    const float spriteScale = 1.78;
    const float imageAspect = 1000.0 / 1109.0;
    float2 halfExtent = spriteScale.xx;
    // Native first correction preserves the image's own aspect ratio.
    halfExtent.x *= imageAspect;

    float viewportAspect = size.x / max(size.y, 1.0);
    float2 center = float2(-.0375, -.0375);
    // Native second correction normalizes the quad to screen width.
    if (viewportAspect > 1.0) {
        halfExtent.y *= viewportAspect;
        center.y *= viewportAspect;
    } else {
        halfExtent.x /= viewportAspect;
        center.x /= viewportAspect;
    }

    float2 clip = float2(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
    float2 local = (clip - center) / halfExtent;
    if (any(abs(local) > 1.0)) return destination;
    float2 spriteUv = float2(local.x * .5 + .5, .5 - local.y * .5);
    float3 source = SpriteTexture.Sample(SpriteSampler, spriteUv).rgb;
    // Blend mode 1 (Decal): RGB is modulated by quantized a=.5, then pasted
    // opaquely. ColorKey is inactive for this blend mode.
    return source * (128.0 / 255.0);
}

float2 WarpVertex(float2 original, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(2.0 * original.x - 1.0,
                           1.0 - 2.0 * original.y);
    float2 presetPosition = .5 + (original - .5) * aspect;
    float myx = presetPosition.y - .5;
    float myy = presetPosition.x - .25;
    float dy = 4.0 * myx * myy + .15;
    float dx = 2.0 * (myy * myy - myx * myx) +
               sin(time * .25) / 55.0 + .04125;

    // zoom/sx/sy/rot are all one/zero after per_frame. The preset does not
    // overwrite warp=.01, so the ordinary native warp remains underneath its
    // per-vertex dx/dy displacement.
    float2 uv = presetPosition;
    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 + 7.0),
        10.54 + 3.0 * cos(time * 1.233 + 3.0),
        11.49 + 4.0 * cos(time * .933 + 5.0));
    float2 scaled = vertex / 1.331;
    float warpX = sin(time * .333 + scaled.x * factors.x -
                      scaled.y * factors.w) +
                  cos(time * .753 - scaled.x * factors.y +
                      scaled.y * factors.z);
    float warpY = cos(time * .375 - scaled.x * factors.z -
                      scaled.y * factors.y) +
                  sin(time * .825 + scaled.x * factors.x +
                      scaled.y * factors.w);
    uv += .01 * .0035 * float2(warpX, warpY);
    uv -= float2(dx, dy);
    uv = .5 + (uv - .5) / max(aspect, float2(.0001, .0001));

    // Exact at 30 FPS. Fractional feedback steps retain the transform's
    // per-second character instead of applying the full map 2x/4x as often.
    return lerp(original, uv, saturate(step30));
}
float2 MeshUV(float2 original, float2 size, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(original) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1.0, 0.0)) / grid;
    float2 c01 = (cell + float2(0.0, 1.0)) / grid;
    float2 c11 = (cell + 1.0) / grid;
    bool lower = f.x + f.y <= 1.0;
    float3 weights = lower
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float2 a = WarpVertex(lower ? c00 : c10, size, step30);
    float2 b = WarpVertex(lower ? c10 : c01, size, step30);
    float2 c = WarpVertex(lower ? c01 : c11, size, step30);
    return weights.x * a + weights.y * b + weights.z * c;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * .5, .0001);
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    bool initialized =
        all(abs(State(14).rgb - MAGIC_A) < .012) &&
        all(abs(State(15).rgb - MAGIC_B) < .012);

    // On a preset transition InjectFeedback is drawn after the first source
    // image, so its ordinary top-row pixels temporarily occupy the audio
    // registers as well. Ignore them until both state sentinels are present.
    float bass = initialized ? Audio(0) : 0.0;
    float mid = initialized ? Audio(1) : 0.0;
    float treb = initialized ? Audio(2) : 0.0;
    float retention = pow(.99, step30);
    float inputWeight = 2.0 * (1.0 - retention);
    float bb = (initialized ? UnpackPositive(State(6).rgb) : 0.0) *
               retention + bass * inputWeight;
    float mm = (initialized ? UnpackPositive(State(7).rgb) : 0.0) *
               retention + mid * inputWeight;
    float tt = (initialized ? UnpackPositive(State(8).rgb) : 0.0) *
               retention + treb * inputWeight;

    float maximum = max(max(bb, mm), tt);
    float minimum = min(min(bb, mm), tt);
    float range = maximum - minimum;
    float3 normalized = range > .000001
        ? (float3(bb, mm, tt) - minimum) / range : 0.0;
    float bm = initialized ? UnpackSigned(State(9).rgb) : 0.0;
    float mt = initialized ? UnpackSigned(State(10).rgb) : 0.0;
    bm += (normalized.x - normalized.y) *
          (2.0 / 30.0) * step30;
    mt += (normalized.y - normalized.z) *
          (2.0 / 30.0) * step30;

    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < PRIVATE_WIDTH) {
        if (pixel.x < 6) return 0.0;
        if (pixel.x == 6) return float4(PackPositive(bb), 1.0);
        if (pixel.x == 7) return float4(PackPositive(mm), 1.0);
        if (pixel.x == 8) return float4(PackPositive(tt), 1.0);
        if (pixel.x == 9) return float4(PackSigned(bm), 1.0);
        if (pixel.x == 10) return float4(PackSigned(mt), 1.0);
        if (pixel.x == 14) return float4(MAGIC_A, 1.0);
        if (pixel.x == 15) return float4(MAGIC_B, 1.0);
        return 0.0;
    }

    float2 original = input.texelSpacePos.xy;
    float2 uv = MeshUV(original, size, step30);
    float3 result = History(uv, size);
    result = BurnSprite(result, original, size);
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
// MilkDrop's M_INV_PI_2 means 1 / (2*pi), not 1 / (pi/2). Using the latter
// quadruples the angular coordinate in each bipolar transform and turns the
// original broad lobes into the much denser repeated pattern.
static const float INV_TWO_PI = .159154943091895;
static const int PRIVATE_WIDTH = 16;

float UnpackUnit(float3 packed) {
    return dot(packed, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float UnpackSigned(float3 packed) {
    float mapped = UnpackUnit(packed) * 2.0 - 1.0;
    return mapped / max(1.0 - abs(mapped), .00001);
}
int WrapIndex(int value, int count) {
    int wrapped = value % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 CanvasTexel(int2 pixel, int2 dimensions) {
    pixel = int2(WrapIndex(pixel.x, dimensions.x),
                 WrapIndex(pixel.y, dimensions.y));
    if (pixel.y == 0 && pixel.x < PRIVATE_WIDTH) return 0.0;
    return Frame.Load(int3(pixel, 0)).rgb;
}
float3 Canvas(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(CanvasTexel(base, dimensions),
        CanvasTexel(base + int2(1, 0), dimensions), f.x);
    float3 bottom = lerp(CanvasTexel(base + int2(0, 1), dimensions),
        CanvasTexel(base + int2(1, 1), dimensions), f.x);
    return lerp(top, bottom, f.y);
}
float2 ComplexDivide(float2 numerator, float2 denominator) {
    float divisor = max(dot(denominator, denominator), 1e-8);
    return float2(
        numerator.x * denominator.x + numerator.y * denominator.y,
        numerator.y * denominator.x - numerator.x * denominator.y) /
        divisor;
}
float2 Polar(float2 domain, float2 center) {
    float2 c = domain - center;
    return float2(atan2(c.x, c.y), max(length(c), 1e-7));
}
float2 PolarLog(float2 domain, float2 center, float fins,
                float logFactor, float2 coordinate) {
    float2 polar = Polar(domain, center);
    return float2(polar.x * fins + coordinate.x,
                  logFactor * log(1.0 / polar.y) + coordinate.y);
}
float2 Moebius(float2 domain, float2 zeroPoint,
               float2 infinityPoint, float zoom) {
    return ComplexDivide((domain - zeroPoint) * zoom,
                         domain - infinityPoint) + .5;
}
float2 BipolarLog(float2 domain, float2 northPole, float2 southPole,
                  float fins, float logFactor, float2 coordinate) {
    float2 transformed = Moebius(domain, northPole, southPole, 1.0);
    return PolarLog(transformed, .5, fins, logFactor, coordinate) *
           float2(INV_TWO_PI, 1.0);
}
float2 LensHalfSphere(float2 domain, float2 position,
                      float radius, float refractivity) {
    float2 polar = Polar(domain, position);
    float cone = saturate(1.0 - polar.y / radius);
    float halfSphere = sqrt(max(0.0, 1.0 - (cone - 1.0) * (cone - 1.0)));
    float angle = atan2(1.0 - cone, halfSphere);
    float refractedAngle = angle -
        asin(clamp(sin(angle) / refractivity, -1.0, 1.0));
    float cosine = cos(refractedAngle);
    cosine = abs(cosine) < 1e-6 ? (cosine < 0.0 ? -1e-6 : 1e-6) : cosine;
    float distance = 1.0 - cone -
        sin(refractedAngle) * halfSphere / cosine;
    float2 refracted = position +
        float2(sin(polar.x), cos(polar.x)) * distance * radius;
    return polar.y < radius ? refracted : domain;
}
float2 MirrorCut(float2 uv) {
    return .5 + (1.0 - abs(frac(uv * .5) * 2.0 - 1.0) - .5) * .995;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float bm = UnpackSigned(Frame.Load(int3(9, 0, 0)).rgb);
    float mt = UnpackSigned(Frame.Load(int3(10, 0, 0)).rgb);
    float2 coordinate = float2(-bm, .1 * mt);

    float2 uv = .5 + (input.texelSpacePos.xy - .5) *
                       float2(1.0 / aspect.y, 1.0 / aspect.x);
    uv = BipolarLog(uv, float2(0.0, .5), float2(1.0, .5),
                    4.0, .55, coordinate);
    uv = MirrorCut(uv);
    uv = LensHalfSphere(uv, .5, .5, 3.0).yx;
    uv = BipolarLog(uv, float2(0.0, .5), float2(1.0, .5),
                    4.0, .55, coordinate).yx;
    uv = MirrorCut(uv);
    return float4(saturate(Canvas(uv, size) * 1.8), 1.0);
}`;

    return {
        name: "0177",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: {
                shader: warpShader,
                textures: [presetDir + "textures\\lines1.jpg"]
            },
            post: compShader
        }
    };
};
