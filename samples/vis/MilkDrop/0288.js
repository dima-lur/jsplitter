// MilkDrop 0288 — red audio walkers shredded into a monochrome noise field.
// Original: original/0288.milk, read in full before translation. Native paths
// were checked against foo_vis_milk2 0.10.0 source commit 5b44cea and its
// matching 69e4744f... binary: 48x36 warp triangles, point/wrap history,
// four-channel bilinear noise, shape state lifetime, draw order and blur chain.
//
// The built-in additive mode-7 wave has alpha .001, below the native .004
// cutoff. Four enabled shape families contain 2048 tiny additive polygons.
// Within each family EEL carries ma/mx/my from one instance to the next and
// from one frame to the next, so the overlapping polygons form four continuous
// audio-steered walks. Feedback stores those twelve state values in hidden
// history pixels, advances every native instance for the state pixels, and
// rasterizes a 64-segment union of each current-frame walk. That union and the
// statistically equivalent generated noise field are the two documented
// approximations forced by the single-file, per-pixel renderer contract.
MilkDropPresets["0288"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
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
float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) * float3(1, 255, 65025));
    return packed - packed.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0);
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    // The visible shape walk is evaluated in feedback, where its persistent
    // EEL state can be carried in hidden history pixels 6..17.
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 6)
        return float4(PackPositive(RelativeBands.Load(int3(pixel.x, 0, 0)).r), 1.0);
    return 0.0;
}
`;

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
static const float TWO_PI = 6.283185307179586;
float UnpackUnit(float3 packed) {
    return dot(packed, float3(1, 1.0 / 255.0, 1.0 / 65025.0));
}
float3 PackUnit(float value) {
    float3 p = frac(min(saturate(value), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0);
}
float UnpackPositive(float3 packed) {
    float v = min(UnpackUnit(packed), .999999);
    return v / max(1 - v, 1e-6);
}
int WrapIndex(int value, int count) {
    int wrapped = value % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 Texel(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    if (pixel.y == 0 && pixel.x < 24)
        pixel.x = min(24, dimensions.x - 1);
    return Previous.Load(int3(pixel, 0)).rgb;
}
float3 HistoryPoint(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    return Texel(int2(floor(frac(uv) * size)), dimensions);
}
float4 NoiseTexel(float2 p) {
    p -= floor(p / 256.0) * 256.0;
    return floor(frac(sin(float4(dot(p, float2(127.1, 311.7)),
                                 dot(p, float2(269.5, 183.3)),
                                 dot(p, float2(419.2, 371.9)),
                                 dot(p, float2(157.7, 246.1)))) *
                      43758.5453) *
                 256.0) /
           255.0;
}
float4 Noise(float2 uv, float2 size, float frame) {
    float2 offset = frac(sin(frame * float2(12.9898, 78.233) + float2(37.719, 11.135)) * 43758.5453) * 256.0;
    float2 p = uv * size + offset - .5, b = floor(p), f = frac(p);
    return lerp(lerp(NoiseTexel(b), NoiseTexel(b + float2(1, 0)), f.x),
                lerp(NoiseTexel(b + float2(0, 1)), NoiseTexel(b + 1), f.x),
                f.y) *
               2 -
           1;
}
// sampler_pw_main is point-filtered and the complete mesh + custom warp is
// strongly nonlinear. Fractional spatial transforms quantize motion to the X/Y
// texel axes, while bilinear interpolation destroys the particles. Execute the
// indivisible native operation once per 30-Hz interval and keep its sharp
// history unchanged between those steps; shape state and emission still update
// on every rendered frame, including non-integral cadence ratios.
// Registers 18..22 store fractional budgets in RGB, not one UNORM8 channel.
// A sentinel prevents an injected image from being interpreted as a clock.
bool ClockInitialized() {
    return all(abs(Previous.Load(int3(23,0,0)).rgb-float3(.1725,.5333,.9137))<.012);
}
float ClockPhase(int index) {
    return ClockInitialized() ? UnpackUnit(Previous.Load(int3(index,0,0)).rgb) : 0;
}
float NativeNoiseFrame(float step30) {
    return !ClockInitialized() || ClockPhase(18)+step30>=1.0-1e-6 ? 1 : 0;
}
float ShapeBudget(int family, float step30) {
    float count=family==0 ? 512 : (family==1 ? 1024 : 256);
    return ClockPhase(19+family)+count*step30;
}
int ShapeAdvance(int family, float step30) {
    return (int)floor(ShapeBudget(family,step30)+1e-5);
}
float2 VertexUV(float2 original, float2 size, float step30) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float2 center = .5 + .210 * float2(.6 * sin(.374 * time) + .4 * sin(.294 * time),
                                       .6 * sin(.393 * time) + .4 * sin(.223 * time));
    float2 translate =
        .003 * float2(.6 * sin(.234 * time) + .4 * sin(.277 * time), .6 * sin(.284 * time) + .4 * sin(.247 * time));
    float rotation = .010 * (.6 * sin(.381 * time) + .4 * sin(.579 * time)) * step30;
    float zoom = pow(1.023, step30);
    float2 uv = float2(.5 + vertex.x * aspect.x * .5 / zoom, .5 - vertex.y * aspect.y * .5 / zoom);
    float4 f = float4(11.68 + 4 * cos(time * 1.413 + 10),
                      8.77 + 3 * cos(time * 1.113 + 7),
                      10.54 + 3 * cos(time * 1.233 + 3),
                      11.49 + 4 * cos(time * .933 + 5));
    float invScale = 1.0 / 3.138, amount = .12262 * .0035 * step30;
    uv.x += amount * (sin(time * .333 + invScale * (vertex.x * f.x - vertex.y * f.w)) +
                      cos(time * .753 - invScale * (vertex.x * f.y - vertex.y * f.z)));
    uv.y += amount * (cos(time * .375 - invScale * (vertex.x * f.z + vertex.y * f.y)) +
                      sin(time * .825 + invScale * (vertex.x * f.x + vertex.y * f.w)));
    float2 d = uv - center;
    float sn = sin(rotation), cs = cos(rotation);
    uv = center + float2(cs * d.x - sn * d.y, sn * d.x + cs * d.y) - translate * step30;
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 MeshUV(float2 original, float2 size, float step30) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(original) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    float2 tl = cell / grid, tr = (cell + float2(1, 0)) / grid, bl = (cell + float2(0, 1)) / grid,
           br = (cell + 1) / grid;
    float2 corners[3];
    float3 weights;
    if (f.x + f.y <= 1) {
        corners[0] = tl;
        corners[1] = tr;
        corners[2] = bl;
        weights = float3(1 - f.x - f.y, f.x, f.y);
    } else {
        corners[0] = tr;
        corners[1] = bl;
        corners[2] = br;
        weights = float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    }
    float2 result = 0;
    [fastopt] for (int corner = 0; corner < 3; ++corner) result +=
        weights[corner] * VertexUV(corners[corner], size, step30);
    return result;
}
float VertexRad(float2 original, float2 size) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    return length(vertex * aspect);
}
float MeshRad(float2 original, float2 size) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(original) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    float2 tl = cell / grid, tr = (cell + float2(1, 0)) / grid, bl = (cell + float2(0, 1)) / grid,
           br = (cell + 1) / grid;
    if (f.x + f.y <= 1)
        return (1 - f.x - f.y) * VertexRad(tl, size) + f.x * VertexRad(tr, size) + f.y * VertexRad(bl, size);
    return (1 - f.y) * VertexRad(tr, size) + (1 - f.x) * VertexRad(bl, size) + (f.x + f.y - 1) * VertexRad(br, size);
}
float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    return length(p - a - ab * saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-8)));
}
int InstanceCount(int family) {
    return family == 0 ? 512 : (family == 1 ? 1024 : 256);
}
float Speed(int family) {
    return family == 0 ? .0002 : (family == 1 ? .0001 : (family == 2 ? .0004 : .0008));
}
float Radius(int family) {
    return .5 * (family == 0 ? .01220 : (family == 1 ? .01489 : .01525));
}
float Delta(int family, float bass, float mid, float treb) {
    return family == 0   ? ((bass > 1 ? .031415 * bass : 0) - (treb > 1 ? .031415 * treb : 0))
           : family == 1 ? ((bass > 1 ? .157075 * bass : 0) - (mid > 1 ? .157075 * mid : 0))
           : family == 2 ? ((mid > 1 ? .031415 * mid : 0) - (treb > 1 ? .031415 * treb : 0))
                         : ((bass > .5 ? .06283 * bass : 0) - (treb > .5 ? .06283 * treb : 0));
}
float Gate(int family, float sum) {
    return family == 0 ? step(.8, sum) : (family == 1 ? step(.1, sum) : (family == 2 ? step(.3, sum) : step(.2, sum)));
}
void Boundary(inout float value) {
    if (value > .9)
        value = .9 - value;
    if (value < .1)
        value = .9 + value;
}
void AdvanceOne(inout float ma, inout float2 position, float delta, float speed) {
    ma += delta;
    position += speed * float2(cos(ma), sin(ma));
    Boundary(position.x);
    Boundary(position.y);
}
float2 WalkSum(int count, float ma, float delta) {
    if (abs(delta) < 1e-6)
        return count * float2(cos(ma), sin(ma));
    float amplitude = sin(count * delta * .5) / sin(delta * .5);
    float middle = ma + (count + 1) * delta * .5;
    return amplitude * float2(cos(middle), sin(middle));
}
float ReadState(int family, int component) {
    return UnpackUnit(Previous.Load(int3(6 + family * 3 + component, 0, 0)).rgb);
}
void LoadState(int family, out float ma, out float2 position) {
    ma = ReadState(family, 0) * TWO_PI;
    position = float2(ReadState(family, 1), ReadState(family, 2));
}
void AdvanceChunk(inout float ma, inout float2 position, float delta, float speed, int count) {
    position += speed * WalkSum(count, ma, delta);
    ma += delta * count;
    Boundary(position.x);
    Boundary(position.y);
}
float ShapeField(float2 uv, float2 size, float step30, float bass, float mid, float treb) {
    float sum = bass + mid + treb, contribution = 0;
    float2 aspect = float2(size.x / min(size.x, size.y), size.y / min(size.x, size.y));
    [fastopt] for (int family = 0; family < 4; ++family) {
        float ma;
        float2 position;
        LoadState(family, ma, position);
        int advance = ShapeAdvance(family, step30);
        // Round UP so the last segment also covers a non-multiple of 64.
        int chunk = max((advance + 63) / 64, 1);
        float delta = Delta(family, bass, mid, treb), speed = Speed(family), gate = Gate(family, sum),
              radius = Radius(family);
        [fastopt] for (int segment = 0; segment < 64; ++segment) {
            if (segment * chunk >= advance)
                break;
            float2 a = position;
            int count = min(chunk, advance - segment * chunk);
            AdvanceChunk(ma, position, delta, speed, count);
            float2 b = position, as = float2(a.x, 1 - a.y), bs = float2(b.x, 1 - b.y);
            float jump = length((bs - as) * aspect);
            float distanceToShape =
                jump < .12 ? SegmentDistance(uv * aspect, as * aspect, bs * aspect) : length((uv - bs) * aspect);
            contribution += gate * step(distanceToShape, radius);
        }
    }
    return saturate(contribution);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv0 = input.sceneSpacePos.xy / size;
    float step30 = max(frameStep * .5, .0001);
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    float bass = UnpackPositive(Previous.Load(int3(0, 0, 0)).rgb),
          mid = UnpackPositive(Previous.Load(int3(1, 0, 0)).rgb),
          treb = UnpackPositive(Previous.Load(int3(2, 0, 0)).rgb);
    if (pixel.y==0 && pixel.x>=18 && pixel.x<24) {
        if (pixel.x==23) return float4(.1725,.5333,.9137,1);
        float remainder;
        if (pixel.x==18)
            remainder=ClockInitialized() ? max(0,ClockPhase(18)+step30-NativeNoiseFrame(step30)) : 0;
        else {
            int family=pixel.x-19;
            remainder=max(0,ShapeBudget(family,step30)-ShapeAdvance(family,step30));
        }
        return float4(PackUnit(remainder),1);
    }
    [branch] if (pixel.y == 0 && pixel.x >= 6 && pixel.x < 18) {
        int stateIndex = pixel.x - 6, family = stateIndex / 3, component = stateIndex - family * 3;
        float ma;
        float2 position;
        LoadState(family, ma, position);
        int advance = ShapeAdvance(family, step30);
        float delta = Delta(family, bass, mid, treb), speed = Speed(family);
        [fastopt] for (int instance = 0; instance < 1024; ++instance) {
            if (instance >= advance)
                break;
            AdvanceOne(ma, position, delta, speed);
        }
        float state = component == 0 ? frac(ma / TWO_PI) : (component == 1 ? position.x : position.y);
        return float4(PackUnit(state), 1);
    }
    float shape = ShapeField(uv0, size, step30, bass, mid, treb);
    float nativeFrame = NativeNoiseFrame(step30);
    float3 heldHistory = Texel(pixel, max(int2(size), int2(1, 1)));
    [branch] if (nativeFrame < .5) {
        heldHistory.r += shape;
        return float4(saturate(heldHistory), 1);
    }
    float2 uv = MeshUV(uv0, size, 1.0);
    float4 n = Noise(uv, size, floor(time * 30));
    float2 recursive = uv + n.zw / size * .5;
    float3 displaced = HistoryPoint(recursive, size);
    float radius = MeshRad(uv0, size);
    float3 nativeWarp = saturate((displaced + (.59 - .2 * radius) * n.xyz - .5) * 3 + .25).r.xxx;
    nativeWarp.r += shape;
    return float4(saturate(nativeWarp), 1);
}
`;

    // foo_vis_milk2 exposes Blur1/2/3 after pairs in a six-pass progressive
    // downsampled convolution. The port carries the newest blur level in
    // alpha while RGB preserves the unblurred history for the final composite.
    function makeBlurPairPass(pairIndex) {
        return `
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
static const int PAIR_INDEX = ${pairIndex};
static const float BLUR_BASE = .5;
bool IsControl(float2 uv, float2 size) {
    float2 p = uv * size;
    return p.x < 24.5 && p.y < 1.5;
}
float EncodeBlur(float value) {
    return BLUR_BASE + (1 - BLUR_BASE) * sqrt(saturate(value));
}
float DecodeBlur(float value) {
    float v = saturate((value - BLUR_BASE) / (1 - BLUR_BASE));
    return v * v;
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float4 FrameClamp4(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv);
    float4 s = Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0);
    if (IsControl(uv, size))
        s = 0;
    return s;
}
float3 DecodeOriginal(float4 s) {
    return PAIR_INDEX == 0 ? s.rgb : s.rgb / max(s.a, BLUR_BASE);
}
float2 DimensionsAfterPass(float2 size, int lastPass) {
    float2 work = size, dimensions = size;
    [unroll] for (int blurPass = 0; blurPass < 6; ++blurPass) {
        if (blurPass > lastPass)
            break;
        if ((blurPass % 2) == 0 || blurPass < 2)
            work = max(float2(16, 16), floor(work * .5));
        dimensions = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return dimensions;
}
float AlphaGrid(float2 uv, float2 size, float2 dimensions, float2 origin, float2 scale) {
    float2 grid = saturate(uv) * dimensions - .5, cell = floor(grid), w = frac(grid);
    float2 a = (clamp(cell, 0, dimensions - 1) + .5) / dimensions,
           b = (clamp(cell + float2(1, 0), 0, dimensions - 1) + .5) / dimensions,
           c = (clamp(cell + float2(0, 1), 0, dimensions - 1) + .5) / dimensions,
           d = (clamp(cell + 1, 0, dimensions - 1) + .5) / dimensions;
    float top = lerp(DecodeBlur(FrameClamp4(a, size, origin, scale).a),
                     DecodeBlur(FrameClamp4(b, size, origin, scale).a),
                     w.x),
          bottom = lerp(DecodeBlur(FrameClamp4(c, size, origin, scale).a),
                        DecodeBlur(FrameClamp4(d, size, origin, scale).a),
                        w.x);
    return lerp(top, bottom, w.y);
}
float SourceValue(float2 uv, float2 size, float2 dimensions, float2 origin, float2 scale) {
    return PAIR_INDEX == 0 ? FrameClamp4(uv, size, origin, scale).g : AlphaGrid(uv, size, dimensions, origin, scale);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float4 center = Frame.SampleLevel(Filter, TextureUV(saturate(uv), origin, scale), 0);
    float3 original = DecodeOriginal(center);
    int horizontalPass = PAIR_INDEX * 2;
    float2 horizontalSource = horizontalPass == 0 ? size : DimensionsAfterPass(size, horizontalPass - 1),
           horizontalTarget = DimensionsAfterPass(size, horizontalPass);
    float2 horizontalScale = size / horizontalSource, verticalScale = size / horizontalTarget;
    const float4 hw = float4(7.8, 6.4, 3.1, 1), ho = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float2 vw = float2(14.2, 4.1), vo = float2(.901408451, 2.487804878);
    float value = 0;
    [fastopt] for (int y = 0; y < 2; ++y)[loop] for (int sy = -1; sy <= 1;
                                                     sy += 2)[loop] for (int x = 0; x < 4; ++x)[loop] for (int sx = -1;
                                                                                                           sx <= 1;
                                                                                                           sx += 2) {
        float2 offset = horizontalScale + float2(verticalScale.x, 0) +
                        float2(sx * ho[x] * horizontalScale.x, sy * vo[y] * verticalScale.y);
        value += SourceValue(uv + offset / size, size, horizontalSource, origin, scale) * hw[x] * vw[y];
    }
    value *= .027322404 * .027322404;
    if (PAIR_INDEX == 0) {
        float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
        value *= .75 + .25 * saturate(sqrt(max(edge, 0)) * 5);
    }
    float carrier = EncodeBlur(value);
    return float4(original * carrier, carrier);
}
`;
    }

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
bool IsControl(float2 uv, float2 size) {
    float2 p = uv * size;
    return p.x < 24.5 && p.y < 1.5;
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float4 Packed(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv);
    if (IsControl(uv, size))
        return 0;
    return Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0);
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    float4 p = Packed(uv, size, origin, scale);
    return p.rgb / max(p.a, .5);
}
float3 Blur1Horizontal(float2 uv, float2 size, float2 origin, float2 scale) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1), offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float3 value = 0;
    uv += 1 / size;
    [loop] for (int i = 0; i < 4; ++i) {
        float2 o = float2(offsets[i] / size.x, 0);
        value += (Image(uv + o, size, origin, scale) + Image(uv - o, size, origin, scale)) * weights[i];
    }
    return value * .027322404;
}
float3 Blur1(float2 uv, float2 size, float2 origin, float2 scale) {
    const float2 weights = float2(14.2, 4.1), offsets = float2(.901408451, 2.487804878);
    float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
    float3 value = 0;
    uv += float2(2 / size.x, 0);
    [loop] for (int i = 0; i < 2; ++i) {
        float2 o = float2(0, offsets[i] * 2 / size.y);
        value +=
            (Blur1Horizontal(uv + o, size, origin, scale) + Blur1Horizontal(uv - o, size, origin, scale)) * weights[i];
    }
    value *= .027322404;
    return value * (.75 + .25 * saturate(sqrt(max(edge, 0)) * 5));
}
float DecodeBlur(float value) {
    float v = saturate((value - .5) / .5);
    return v * v;
}
float2 Blur3Dimensions(float2 size) {
    float2 work = size, dimensions = size;
    [unroll] for (int blurPass = 0; blurPass < 6; ++blurPass) {
        if ((blurPass % 2) == 0 || blurPass < 2)
            work = max(float2(16, 16), floor(work * .5));
        dimensions = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return dimensions;
}
float Blur3(float2 uv, float2 size, float2 origin, float2 scale) {
    float2 dimensions = Blur3Dimensions(size), grid = saturate(uv) * dimensions - .5, cell = floor(grid),
           w = frac(grid);
    float2 a = (clamp(cell, 0, dimensions - 1) + .5) / dimensions,
           b = (clamp(cell + float2(1, 0), 0, dimensions - 1) + .5) / dimensions,
           c = (clamp(cell + float2(0, 1), 0, dimensions - 1) + .5) / dimensions,
           d = (clamp(cell + 1, 0, dimensions - 1) + .5) / dimensions;
    float top = lerp(DecodeBlur(Frame.SampleLevel(Filter, TextureUV(a, origin, scale), 0).a),
                     DecodeBlur(Frame.SampleLevel(Filter, TextureUV(b, origin, scale), 0).a),
                     w.x),
          bottom = lerp(DecodeBlur(Frame.SampleLevel(Filter, TextureUV(c, origin, scale), 0).a),
                        DecodeBlur(Frame.SampleLevel(Filter, TextureUV(d, origin, scale), 0).a),
                        w.x);
    return lerp(top, bottom, w.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    if (IsControl(uv, size))
        return float4(0, 0, 0, 1);
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float value = Image(uv, size, origin, scale).r;
    float blur = Blur1(uv, size, origin, scale).g + Blur3(uv, size, origin, scale);
    float mixed = lerp(blur, value, value);
    float3 result = pow(max(mixed, 0), float3(.3, .9, 8)) * 1.25 - .25;
    return float4(saturate(result), 1);
}
`;

    const blur1Pass = makeBlurPairPass(0);
    const blur2Pass = makeBlurPairPass(1);
    const blur3Pass = makeBlurPairPass(2);

    return { name:"0288", sourceId:5, source, updateIntervalMs:17,
        renderer:{ shader, feedback:warpShader,
                   post:[blur1Pass, blur2Pass, blur3Pass, compShader] } };
};
