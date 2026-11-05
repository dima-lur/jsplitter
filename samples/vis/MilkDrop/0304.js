// MilkDrop 0304 — a compact recursive three-colour flower.
// Original: original/0304.milk (provided by the user; retained unchanged).
//
// All three enabled custom-shape programs overwrite their alpha with
// int(rand(int(q30)))/5. q30 is never assigned by the preset and starts at
// zero, while MilkDrop's rand(0) has a one-element integer range. The resulting
// alpha is therefore zero for all 33 + 7 + 33 instances. The shapes are kept
// logically absent here instead of drawing their base parameters at the centre.
// This matters: 0304 is a pure-feedback preset whose initial image comes from
// the outgoing preset during a normal MilkDrop transition (the browser mirrors
// that behaviour with InjectFeedback).
//
// The native warp samples the previous Blur1 render target. JSplitter's general
// feedback pass cannot retain that auxiliary surface, so Blur1 is reconstructed
// from the preceding history with the verified modern blur-pair kernel. The
// final Blur1/Blur3 composite uses a three-pair post chain and is presentation
// only, matching the native ordering as closely as the common pipeline allows.
MilkDropPresets["0304"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };

    // The built-in mode-0 wave has wave_a=.001 and fails the native .004
    // visibility cutoff. Pixels 6 and 7 retain q4/q5 phase state in feedback.
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
float3 PackUnit(float x) {
    float3 p = frac(min(saturate(x), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float3 PackPositive(float x) {
    x = max(x, 0);
    return PackUnit(x / (1 + x));
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 p = int2(floor(input.sceneSpacePos.xy));
    if (p.y == 0 && p.x >= 0 && p.x < 6)
        return float4(PackPositive(RelativeBands.Load(int3(p.x, 0, 0)).r), 1);
    return 0;
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
static const float PI = 3.141592653589793;
static const float TWO_PI = 6.283185307179586;
static const int CONTROL_PIXELS = 8;
float UnpackUnit(float3 p) {
    return dot(p, float3(1, 1.0 / 255, 1.0 / 65025));
}
float3 PackUnit(float x) {
    float3 p = frac(min(saturate(x), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float UnpackPositive(float3 p) {
    float x = min(UnpackUnit(p), .999999);
    return x / max(1 - x, 1e-6);
}
float3 PackPositive(float x) {
    x = max(x, 0);
    return PackUnit(x / (1 + x));
}
float StatePositive(int x) {
    return UnpackPositive(Previous.Load(int3(x, 0, 0)).rgb);
}
float3 HistoryTexel(int2 p, int2 d) {
    p = clamp(p, int2(0, 0), d - 1);
    if (p.y == 0 && p.x < CONTROL_PIXELS)
        return 0;
    return Previous.Load(int3(p, 0)).rgb;
}
// sampler_fc_main is bilinear-clamp in the native warp shader.
float3 History(float2 uv, float2 size) {
    int2 d = max(int2(size), int2(1, 1));
    float2 xy = saturate(uv) * size - .5;
    int2 b = int2(floor(xy));
    float2 f = frac(xy);
    float3 a = lerp(HistoryTexel(b, d), HistoryTexel(b + int2(1, 0), d), f.x);
    float3 c = lerp(HistoryTexel(b + int2(0, 1), d), HistoryTexel(b + 1, d), f.x);
    return lerp(a, c, f.y);
}
float3 Blur1H(float2 uv, float2 size) {
    const float4 w = float4(7.8, 6.4, 3.1, 1), o = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float3 v = 0;
    uv += 1 / size;
    [loop] for (int i = 0; i < 4; ++i) {
        float2 d = float2(o[i] / size.x, 0);
        v += (History(uv + d, size) + History(uv - d, size)) * w[i];
    }
    return v * .027322404;
}
float2 BlurPassDimensions(float2 work) {
    return max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
}
float2 Blur0Dimensions(float2 size) {
    return BlurPassDimensions(max(float2(16, 16), floor(size * .5)));
}
float2 Blur1Dimensions(float2 size) {
    float2 work = max(float2(16, 16), floor(size * .5));
    work = max(float2(16, 16), floor(work * .5));
    return BlurPassDimensions(work);
}
float3 Blur1Point(float2 uv, float2 size) {
    const float2 w = float2(14.2, 4.1), o = float2(.901408451, 2.487804878);
    float2 sourceSize = Blur0Dimensions(size), aligned = uv + float2(1 / sourceSize.x, 0);
    float3 v = 0;
    [loop] for (int i = 0; i < 2; ++i) {
        float2 d = float2(0, o[i] / sourceSize.y);
        v += (Blur1H(aligned + d, size) + Blur1H(aligned - d, size)) * w[i];
    }
    v *= .027322404;
    float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
    return v * (.75 + .25 * saturate(sqrt(max(edge, 0)) * 5));
}
// GetBlur1 samples the quarter-resolution second blur target, not the
// continuous kernel. Recreate its texel grid before the warp reads it.
float3 Blur1(float2 uv, float2 size) {
    float2 d = Blur1Dimensions(size), grid = saturate(uv) * d - .5, cell = floor(grid), f = frac(grid);
    float2 p[4] = {cell, cell + float2(1, 0), cell + float2(0, 1), cell + 1};
    float3 v[4];
    [fastopt] for (int i = 0; i < 4; ++i) {
        float2 q = (clamp(p[i], 0, d - 1) + .5) / d;
        v[i] = Blur1Point(q, size);
    }
    return lerp(lerp(v[0], v[1], f.x), lerp(v[2], v[3], f.x), f.y);
}
float2 VertexRadAng(float2 uv, float2 size) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 d = (uv - .5) * aspect;
    return float2(length(d) * 2, dot(d, d) < 1e-12 ? 0 : atan2(-d.y, d.x));
}
float UnwrapAngle(float a, float ref) {
    float d = a - ref;
    if (d > PI)
        a -= TWO_PI;
    else if (d < -PI)
        a += TWO_PI;
    return a;
}
// Per-vertex code: zoom=1+sin(ang*5-q5)*.04*bass;
// rot=.02*sin(rad*2*pi*2-q4*4)*(mid+treb)*.5.
float2 WarpVertex(float2 uv, float2 size, float bass, float mid, float treb, float q4, float q5, float step30) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 ra = VertexRadAng(uv, size);
    float zoom = 1 + sin(ra.y * 5 - q5) * .04 * bass;
    float rotation = .01 * sin(ra.x * TWO_PI * 2 - q4 * 4) * (mid + treb);
    float zs = pow(max(zoom, .01), step30), rs = rotation * step30, sn = sin(rs), cs = cos(rs);
    float2 p = .5 + (uv - .5) * aspect;
    float2 d = (p - .5) / zs;
    p = .5 + float2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
    return .5 + (p - .5) / aspect;
}
float3 MeshTriangle(float2 uv, out float2 a, out float2 b, out float2 c) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(uv) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    float2 tl = cell / grid, tr = (cell + float2(1, 0)) / grid, bl = (cell + float2(0, 1)) / grid,
           br = (cell + 1) / grid;
    if (f.x + f.y <= 1) {
        a = tl;
        b = tr;
        c = bl;
        return float3(1 - f.x - f.y, f.x, f.y);
    }
    a = tr;
    b = bl;
    c = br;
    return float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
}
void MeshData(float2 original,
              float2 size,
              float bass,
              float mid,
              float treb,
              float q4,
              float q5,
              float step30,
              out float2 uv,
              out float radius) {
    float2 corners[3];
    float3 w = MeshTriangle(original, corners[0], corners[1], corners[2]);
    float2 warped[3], ra[3];
    [fastopt] for (int i = 0; i < 3; ++i) {
        warped[i] = WarpVertex(corners[i], size, bass, mid, treb, q4, q5, step30);
        ra[i] = VertexRadAng(corners[i], size);
    }
    ra[1].y = UnwrapAngle(ra[1].y, ra[0].y);
    ra[2].y = UnwrapAngle(ra[2].y, ra[0].y);
    uv = w.x * warped[0] + w.y * warped[1] + w.z * warped[2];
    radius = dot(w, float3(ra[0].x, ra[1].x, ra[2].x));
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), original = input.sceneSpacePos.xy / size;
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    float step30 = max(frameStep * .5, .0001), seconds = step30 / 30;
    float bass = StatePositive(0), mid = StatePositive(1), treb = StatePositive(2);
    float q4 = StatePositive(6) + seconds * (treb + mid) * .5, q5 = StatePositive(7) + seconds * bass;
    if (pixel.y == 0 && pixel.x >= 6 && pixel.x < CONTROL_PIXELS)
        return float4(PackPositive(pixel.x == 6 ? q4 : q5), 1);
    float2 uv;
    float radius;
    MeshData(original, size, bass, mid, treb, q4, q5, step30, uv, radius);
    // The native 30 Hz step first mixes 20% Blur1, then applies x -> x*x/d.
    // Split both operations compositionally so two/four substeps preserve one
    // 30 Hz step instead of repeatedly blurring and squaring the history.
    float blurMix = step30 >= .9999 ? .2 : 1 - pow(.8, step30);
    float3 base = lerp(History(uv, size), Blur1(uv, size), blurMix);
    float denominator = max(1.4 * radius, 1e-6);
    float3 result;
    if (step30 >= .9999)
        result = base * base / denominator;
    else {
        float powerDelta = exp2(step30) - 1;
        result = base * pow(max(base / denominator, 1e-6), powerDelta);
    }
    return float4(saturate(result), 1);
}
`;

    // Three horizontal+vertical pairs recreate the progressive Blur1/2/3
    // pyramid. RGB preserves the original image; alpha carries scalar red blur.
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
    return p.x < 8.5 && p.y < 1.5;
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
float3 DecodePayload(float4 s) {
    return PAIR_INDEX == 0 ? float3(s.r, 0, 0) : s.rgb / max(s.a, BLUR_BASE);
}
float2 DimensionsAfterPass(float2 size, int lastPass) {
    float2 work = size, dimensions = size;
    [unroll] for (int p = 0; p < 6; ++p) {
        if (p > lastPass)
            break;
        if ((p % 2) == 0 || p < 2)
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
    return PAIR_INDEX == 0 ? FrameClamp4(uv, size, origin, scale).r : AlphaGrid(uv, size, dimensions, origin, scale);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float4 center = Frame.SampleLevel(Filter, TextureUV(saturate(uv), origin, scale), 0);
    float3 payload = DecodePayload(center);
    int hp = PAIR_INDEX * 2;
    float2 hs = hp == 0 ? size : DimensionsAfterPass(size, hp - 1), ht = DimensionsAfterPass(size, hp);
    float2 hscale = size / hs, vscale = size / ht;
    const float4 hw = float4(7.8, 6.4, 3.1, 1), ho = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float2 vw = float2(14.2, 4.1), vo = float2(.901408451, 2.487804878);
    float value = 0;
    [fastopt] for (int y = 0; y < 2; ++y)[loop] for (int sy = -1; sy <= 1;
                                                     sy += 2)[loop] for (int x = 0; x < 4; ++x)[loop] for (int sx = -1;
                                                                                                           sx <= 1;
                                                                                                           sx += 2) {
        float2 offset = hscale + float2(vscale.x, 0) + float2(sx * ho[x] * hscale.x, sy * vo[y] * vscale.y);
        value += SourceValue(uv + offset / size, size, hs, origin, scale) * hw[x] * vw[y];
    }
    value *= .027322404 * .027322404;
    if (PAIR_INDEX == 0) {
        float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
        value *= .75 + .25 * saturate(sqrt(max(edge, 0)) * 5);
        payload.y = value;
    }
    float carrier = EncodeBlur(value);
    return float4(payload * carrier, carrier);
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
    return p.x < 8.5 && p.y < 1.5;
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
float3 Payload(float2 uv, float2 size, float2 origin, float2 scale) {
    float4 p = Packed(uv, size, origin, scale);
    return p.rgb / max(p.a, .5);
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    return Payload(uv, size, origin, scale).xxx;
}
float DecodeBlur(float value) {
    float v = saturate((value - .5) / .5);
    return v * v;
}
float2 Blur1Dimensions(float2 size) {
    float2 work = size, dimensions = size;
    [unroll] for (int p = 0; p < 2; ++p) {
        work = max(float2(16, 16), floor(work * .5));
        dimensions = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return dimensions;
}
float2 Blur3Dimensions(float2 size) {
    float2 work = size, dimensions = size;
    [unroll] for (int p = 0; p < 6; ++p) {
        if ((p % 2) == 0 || p < 2)
            work = max(float2(16, 16), floor(work * .5));
        dimensions = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return dimensions;
}
float Blur1(float2 uv, float2 size, float2 origin, float2 scale) {
    float2 d = Blur1Dimensions(size), grid = saturate(uv) * d - .5, cell = floor(grid), w = frac(grid);
    float2 a = (clamp(cell, 0, d - 1) + .5) / d, b = (clamp(cell + float2(1, 0), 0, d - 1) + .5) / d,
           c = (clamp(cell + float2(0, 1), 0, d - 1) + .5) / d, e = (clamp(cell + 1, 0, d - 1) + .5) / d;
    float top = lerp(Payload(a, size, origin, scale).y, Payload(b, size, origin, scale).y, w.x),
          bottom = lerp(Payload(c, size, origin, scale).y, Payload(e, size, origin, scale).y, w.x);
    return lerp(top, bottom, w.y);
}
float Blur3(float2 uv, float2 size, float2 origin, float2 scale) {
    float2 d = Blur3Dimensions(size), grid = saturate(uv) * d - .5, cell = floor(grid), w = frac(grid);
    float2 a = (clamp(cell, 0, d - 1) + .5) / d, b = (clamp(cell + float2(1, 0), 0, d - 1) + .5) / d,
           c = (clamp(cell + float2(0, 1), 0, d - 1) + .5) / d, e = (clamp(cell + 1, 0, d - 1) + .5) / d;
    float top = lerp(DecodeBlur(Frame.SampleLevel(Filter, TextureUV(a, origin, scale), 0).a),
                     DecodeBlur(Frame.SampleLevel(Filter, TextureUV(b, origin, scale), 0).a),
                     w.x),
          bottom = lerp(DecodeBlur(Frame.SampleLevel(Filter, TextureUV(c, origin, scale), 0).a),
                        DecodeBlur(Frame.SampleLevel(Filter, TextureUV(e, origin, scale), 0).a),
                        w.x);
    return lerp(top, bottom, w.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    if (IsControl(uv, size))
        return float4(0, 0, 0, 1);
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale, mirror = 1 - uv;
    float value = Image(uv, size, origin, scale).r + Image(mirror, size, origin, scale).r;
    float blurs = Blur1(uv, size, origin, scale) + Blur3(uv, size, origin, scale) + Blur1(mirror, size, origin, scale) +
                  Blur3(mirror, size, origin, scale);
    float mixed = lerp(blurs, value, value);
    return float4(saturate(pow(max(mixed, 0), float3(5, 1, .5))), 1);
}
`;

    return {
        name: "0304", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {
            shader, feedback: warpShader,
            post: [makeBlurPairPass(0), makeBlurPairPass(1),
                   makeBlurPairPass(2), compShader]
        }
    };
};
