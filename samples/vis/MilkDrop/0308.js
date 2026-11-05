// MilkDrop 0308 — thick colour-changing mode-6 waveform in a liquid field.
// Original: original/0308.milk (provided by the user; retained unchanged).
//
// Source-verified details retained here: mode 6 starts from 480 samples, uses
// min(240,floor(textureWidth/3)) centred left-channel samples, clips its base
// line to +/-1.1, applies fWaveScale=4.96 after the native PCM*128 /128
// cancellation, runs SmoothWave once, reverses Y, and makes four cumulative
// bWaveThick draws at texture widths >=512. No custom shapes/waves are enabled.
// q21..q30 remain zero because the preset has no init assignments, so the three
// noise-volume conditionals in the composite are provably dead.
//
// Native Blur1 is captured after warp but before DrawWave, so the next warp does
// not blur the newest waveform into its displacement field. The common
// JSplitter feedback contract has no auxiliary feedback texture. The feedback
// alpha therefore carries the newest source coverage for one frame; Blur1
// rejects those covered texels and renormalizes the checked modern kernel. The
// RGB history remains the exact source-over-background result used by
// sampler_main. Final Blur1/Blur3 use the same source-excluding first blur pair.
MilkDropPresets["0308"] = function (TARGET_FPS) {
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
float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-7));
    return length(p - a - ab * t);
}
float PCM(int index, int count) {
    int start = max(count - 576, 0);
    return clamp(LeftPCM.Load(int3(clamp(start + index, 0, count - 1), 0, 0)).r, -1, 1);
}
float2 RawPoint(int index, int n, int offset, int count, float2 size) {
    index = clamp(index, 0, n - 1);
    float x = -1.1 + 2.2 * (float)index / (float)n;
    float y = -.25 * (PCM(offset + index, count) * 4.96);
    return float2((x + 1) * .5 * size.x, (1 - y) * .5 * size.y);
}
float Coverage(float2 pixel, float2 size, int count) {
    int n = min(240, max(2, (int)floor(size.x / 3)));
    int offset = (480 - n) / 2;
    float4 nearest = 1e6;
    [fastopt] for (int i = 0; i < 239; ++i) {
        if (i >= n - 1)
            break;
        float2 below = RawPoint(i - 1, n, offset, count, size), current = RawPoint(i, n, offset, count, size),
               above = RawPoint(i + 1, n, offset, count, size), above2 = RawPoint(i + 2, n, offset, count, size);
        float2 midpoint = (-.15 * below + 1.15 * current + 1.15 * above - .15 * above2) * .5;
        float2 a[2] = {current, midpoint}, b[2] = {midpoint, above};
        [unroll] for (int segment = 0; segment < 2; ++segment) {
            nearest.x = min(nearest.x, SegmentDistance(pixel, a[segment], b[segment]));
            if (size.x >= 512) {
                nearest.y =
                    min(nearest.y, SegmentDistance(pixel, a[segment] + float2(1, 0), b[segment] + float2(1, 0)));
                nearest.z =
                    min(nearest.z, SegmentDistance(pixel, a[segment] + float2(1, -1), b[segment] + float2(1, -1)));
                nearest.w =
                    min(nearest.w, SegmentDistance(pixel, a[segment] + float2(0, -1), b[segment] + float2(0, -1)));
            }
        }
    }
    float4 part = 1 - smoothstep(.15, 1.1, nearest);
    return 1 - (1 - part.x) * (1 - part.y) * (1 - part.z) * (1 - part.w);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    int count = (int)pointCount;
    if (count < 576 || size.x < 6)
        return 0;
    float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0), mid = max(RelativeBands.Load(int3(1, 0, 0)).r, 0),
          treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0), volume = (bass + mid + treb) / 3;
    float3 color;
    if (bass > 1.15)
        color = float3(
            3 * (1 - bass) + abs(sin(time * .3) * .1), 1 - abs(sin(time * .3) * .1), .5 + abs(sin(time * .3) * .1));
    else if (treb > 1)
        color = float3(0, .6 + .1 * sin(time * 1.123), .7 + .1 * sin(time * 1.123));
    else
        color = float3(sin(time / 2.5) / 10 + .65, sin(time / 2.5) / 10 + .3, .3 - treb - sin(time / 2.5) / 10);
    color = saturate(color);
    color /= max(max(color.r, color.g), max(color.b, .01));
    color = floor(color * 255 + .5) / 255;
    float waveAlpha = saturate(100 * (volume - 2) / (.95 - 2));
    if (waveAlpha < .004)
        return 0;
    waveAlpha = floor(waveAlpha * 255 + .5) / 255;
    float alpha = Coverage(input.sceneSpacePos.xy, size, count) * waveAlpha;
    if (alpha <= 0)
        return 0;
    return float4(color * alpha, alpha);
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
static const float PI = 3.141592653589793;
float4 Texel(int2 p, int2 d) {
    p = clamp(p, int2(0, 0), d - 1);
    return Previous.Load(int3(p, 0));
}
float4 History4(float2 uv, float2 size) {
    int2 d = max(int2(size), int2(1, 1));
    float2 xy = saturate(uv) * size - .5;
    int2 b = int2(floor(xy));
    float2 f = frac(xy);
    return lerp(
        lerp(Texel(b, d), Texel(b + int2(1, 0), d), f.x), lerp(Texel(b + int2(0, 1), d), Texel(b + 1, d), f.x), f.y);
}
float3 History(float2 uv, float2 size) {
    return History4(uv, size).rgb;
}
float4 Blur1H(float2 uv, float2 size) {
    const float4 w = float4(7.8, 6.4, 3.1, 1), o = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float4 v = 0;
    uv += 1 / size;
    [loop] for (int i = 0; i < 4; ++i) {
        float2 d = float2(o[i] / size.x, 0);
        float4 a = History4(uv + d, size), b = History4(uv - d, size);
        float va = 1 - saturate(a.a * 4), vb = 1 - saturate(b.a * 4);
        v.rgb += (a.rgb * va + b.rgb * vb) * w[i];
        v.a += (va + vb) * w[i];
    }
    return v;
}
float3 Blur1(float2 uv, float2 size) {
    const float2 w = float2(14.2, 4.1), o = float2(.901408451, 2.487804878);
    float4 v = 0;
    float2 aligned = uv + float2(2 / size.x, 0);
    [loop] for (int i = 0; i < 2; ++i) {
        float2 d = float2(0, o[i] * 2 / size.y);
        float4 a = Blur1H(aligned + d, size), b = Blur1H(aligned - d, size);
        v.rgb += (a.rgb + b.rgb) * w[i];
        v.a += (a.a + b.a) * w[i];
    }
    float3 result = v.a > 1e-5 ? v.rgb / v.a : History(uv, size);
    float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
    return result * (.75 + .25 * saturate(sqrt(max(edge, 0)) * 5));
}
float4 Hash4(float2 p) {
    return frac(sin(float4(dot(p, float2(127.1, 311.7)),
                           dot(p, float2(269.5, 183.3)),
                           dot(p, float2(419.2, 371.9)),
                           dot(p, float2(157.7, 246.1)))) *
                43758.5453);
}
// noise_lq is a fixed 256x256 UNORM texture for the component lifetime.
float3 NoiseLQ(float2 uv, float2 size) {
    float2 p = uv * size - .5, b = floor(p), f = frac(p);
    float3 a = floor(Hash4(b).rgb * 256) / 255, bx = floor(Hash4(b + float2(1, 0)).rgb * 256) / 255,
           c = floor(Hash4(b + float2(0, 1)).rgb * 256) / 255, d = floor(Hash4(b + 1).rgb * 256) / 255;
    return lerp(lerp(a, bx, f.x), lerp(c, d, f.x), f.y);
}
float2 VertexRadXY(float2 original, float2 size, out float x, out float y) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    x = vertex.x * .5 * aspect.x + .5;
    y = vertex.y * -.5 * aspect.y + .5;
    return float2(length(vertex * aspect), atan2(vertex.y * aspect.y, vertex.x * aspect.x));
}
float2 WarpVertex(float2 original, float2 size, float step30) {
    float x, y;
    float2 ra = VertexRadXY(original, size, x, y);
    float2 q12 =
        .62 * float2(.6 * sin(.374 * time) + .4 * sin(.294 * time), .6 * sin(.393 * time) + .4 * sin(.223 * time));
    float2 q34 =
        .62 * float2(.6 * sin(-.174 * time) + .4 * sin(.364 * time), .6 * sin(.234 * time) + .4 * sin(-.271 * time));
    float2 delta = (float2(x, y) + ra.x) * 2 - 1 - q12;
    float angle = atan2(delta.x, delta.y), mult = .008 / (length(delta) + .4);
    float2 push = mult * float2(sin(angle - 1.5) / 4, cos(angle - 1.5) / 4);
    delta = (1 - ra.x) * 2 - 1 - q34;
    angle = atan2(delta.x, delta.y);
    mult = .008 / (length(delta) + .4);
    push += mult * float2(sin(angle + .5) / 3, cos(angle + .5) / 3);
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float zoom = pow(1.00496, step30), sx = pow(.99967, step30), sy = pow(.99990, step30);
    float2 uv = float2(.5 + vertex.x * aspect.x * .5 / zoom, .5 - vertex.y * aspect.y * .5 / zoom);
    uv = (uv - .5) / float2(sx, sy) + .5;
    float4 factors = float4(11.68 + 4 * cos(time * 1.413 + 10),
                            8.77 + 3 * cos(time * 1.113 + 7),
                            10.54 + 3 * cos(time * 1.233 + 3),
                            11.49 + 4 * cos(time * .933 + 5));
    float amount = .00016 * .0035 * step30 / 1.331;
    uv.x += amount * (sin(time * .333 + (vertex.x * factors.x - vertex.y * factors.w) / 1.331) +
                      cos(time * .753 - (vertex.x * factors.y - vertex.y * factors.z) / 1.331));
    uv.y += amount * (cos(time * .375 - (vertex.x * factors.z + vertex.y * factors.y) / 1.331) +
                      sin(time * .825 + (vertex.x * factors.x + vertex.y * factors.w) / 1.331));
    uv -= push * step30;
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 MeshUV(float2 original, float2 size, float step30) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(original) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    bool lower = f.x + f.y <= 1;
    float2 corners[3] = {lower ? cell / grid : (cell + float2(1, 0)) / grid,
                         lower ? (cell + float2(1, 0)) / grid : (cell + float2(0, 1)) / grid,
                         lower ? (cell + float2(0, 1)) / grid : (cell + 1) / grid};
    float3 w = lower ? float3(1 - f.x - f.y, f.x, f.y) : float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    float2 uv = 0;
    [fastopt] for (int i = 0; i < 3; ++i) uv += w[i] * WarpVertex(corners[i], size, step30);
    return uv;
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), original = input.sceneSpacePos.xy / size;
    float step30 = max(frameStep * .5, .0001);
    float2 uv = MeshUV(original, size, step30);
    float3 a = History(uv, size), b = Blur1(uv, size) * 10;
    float2 uv2 = uv + (a - b).xy / size * 3 * step30;
    float3 result = History(uv2, size) + (NoiseLQ(original, size) * 3 - 1) * .002 * step30 - .001 * step30;
    return float4(saturate(result), 0);
}
`;

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
float EncodeBlur(float x) {
    return BLUR_BASE + (1 - BLUR_BASE) * sqrt(saturate(x));
}
float DecodeBlur(float x) {
    float v = saturate((x - BLUR_BASE) / (1 - BLUR_BASE));
    return v * v;
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float4 Sample4(float2 uv, float2 origin, float2 scale) {
    return Frame.SampleLevel(Filter, TextureUV(saturate(uv), origin, scale), 0);
}
float3 Original(float4 s) {
    return PAIR_INDEX == 0 ? s.rgb : s.rgb / max(s.a, BLUR_BASE);
}
float2 Dimensions(float2 size, int last) {
    float2 work = size, d = size;
    [unroll] for (int p = 0; p < 6; ++p) {
        if (p > last)
            break;
        if ((p % 2) == 0 || p < 2)
            work = max(float2(16, 16), floor(work * .5));
        d = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return d;
}
float AlphaGrid(float2 uv, float2 dimensions, float2 origin, float2 scale) {
    float2 grid = saturate(uv) * dimensions - .5, cell = floor(grid), w = frac(grid);
    float2 a = (clamp(cell, 0, dimensions - 1) + .5) / dimensions,
           b = (clamp(cell + float2(1, 0), 0, dimensions - 1) + .5) / dimensions,
           c = (clamp(cell + float2(0, 1), 0, dimensions - 1) + .5) / dimensions,
           d = (clamp(cell + 1, 0, dimensions - 1) + .5) / dimensions;
    float top = lerp(DecodeBlur(Sample4(a, origin, scale).a), DecodeBlur(Sample4(b, origin, scale).a), w.x),
          bottom = lerp(DecodeBlur(Sample4(c, origin, scale).a), DecodeBlur(Sample4(d, origin, scale).a), w.x);
    return lerp(top, bottom, w.y);
}
float2 SourceValueWeight(float2 uv, float2 dimensions, float2 origin, float2 scale) {
    if (PAIR_INDEX == 0) {
        float4 s = Sample4(uv, origin, scale);
        return float2(s.r, 1 - saturate(s.a * 4));
    }
    return float2(AlphaGrid(uv, dimensions, origin, scale), 1);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float3 original = Original(Sample4(uv, origin, scale));
    int hp = PAIR_INDEX * 2;
    float2 hs = hp == 0 ? size : Dimensions(size, hp - 1), ht = Dimensions(size, hp), hscale = size / hs,
           vscale = size / ht;
    const float4 hw = float4(7.8, 6.4, 3.1, 1), ho = float4(.974358974, 2.90625, 4.774193548, 6.6);
    const float2 vw = float2(14.2, 4.1), vo = float2(.901408451, 2.487804878);
    float value = 0, totalWeight = 0;
    [fastopt] for (int y = 0; y < 2; ++y)[loop] for (int sy = -1; sy <= 1;
                                                     sy += 2)[loop] for (int x = 0; x < 4; ++x)[loop] for (int sx = -1;
                                                                                                           sx <= 1;
                                                                                                           sx += 2) {
        float2 offset = hscale + float2(vscale.x, 0) + float2(sx * ho[x] * hscale.x, sy * vo[y] * vscale.y);
        float2 sample = SourceValueWeight(uv + offset / size, hs, origin, scale);
        float weight = sample.y * hw[x] * vw[y];
        value += sample.x * weight;
        totalWeight += weight;
    }
    value = totalWeight > 1e-5 ? value / totalWeight : Sample4(uv, origin, scale).r;
    if (PAIR_INDEX == 0) {
        float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
        value *= .75 + .25 * saturate(sqrt(max(edge, 0)) * 5);
    }
    float carrier = EncodeBlur(value);
    return float4(original * carrier, carrier);
}
`;
    }

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
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float4 Packed(float2 uv, float2 origin, float2 scale) {
    return Frame.SampleLevel(Filter, TextureUV(saturate(uv), origin, scale), 0);
}
float3 Image(float2 uv, float2 origin, float2 scale) {
    float4 p = Packed(uv, origin, scale);
    return p.rgb / max(p.a, .5);
}
float3 Blur1H(float2 uv, float2 size, float2 origin, float2 scale) {
    const float4 w = float4(7.8, 6.4, 3.1, 1), o = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float3 v = 0;
    uv += 1 / size;
    [loop] for (int i = 0; i < 4; ++i) {
        float2 d = float2(o[i] / size.x, 0);
        v += (Image(uv + d, origin, scale) + Image(uv - d, origin, scale)) * w[i];
    }
    return v * .027322404;
}
float3 Blur1(float2 uv, float2 size, float2 origin, float2 scale) {
    const float2 w = float2(14.2, 4.1), o = float2(.901408451, 2.487804878);
    float3 v = 0;
    float2 aligned = uv + float2(2 / size.x, 0);
    [loop] for (int i = 0; i < 2; ++i) {
        float2 d = float2(0, o[i] * 2 / size.y);
        v += (Blur1H(aligned + d, size, origin, scale) + Blur1H(aligned - d, size, origin, scale)) * w[i];
    }
    v *= .027322404;
    float edge = min(min(uv.x, uv.y), 1 - max(uv.x, uv.y));
    return v * (.75 + .25 * saturate(sqrt(max(edge, 0)) * 5));
}
float DecodeBlur(float x) {
    float v = saturate((x - .5) / .5);
    return v * v;
}
float2 Blur3Dimensions(float2 size) {
    float2 work = size, d = size;
    [unroll] for (int p = 0; p < 6; ++p) {
        if ((p % 2) == 0 || p < 2)
            work = max(float2(16, 16), floor(work * .5));
        d = max(float2(16, 4), floor((work + 3) / float2(16, 4)) * float2(16, 4));
    }
    return d;
}
float Blur3(float2 uv, float2 size, float2 origin, float2 scale) {
    float2 d = Blur3Dimensions(size), grid = saturate(uv) * d - .5, cell = floor(grid), w = frac(grid);
    float2 a = (clamp(cell, 0, d - 1) + .5) / d, b = (clamp(cell + float2(1, 0), 0, d - 1) + .5) / d,
           c = (clamp(cell + float2(0, 1), 0, d - 1) + .5) / d, e = (clamp(cell + 1, 0, d - 1) + .5) / d;
    float top = lerp(DecodeBlur(Packed(a, origin, scale).a), DecodeBlur(Packed(b, origin, scale).a), w.x),
          bottom = lerp(DecodeBlur(Packed(c, origin, scale).a), DecodeBlur(Packed(e, origin, scale).a), w.x);
    return lerp(top, bottom, w.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float3 sharp = Image(uv, origin, scale), b1 = Blur1(uv, size, origin, scale);
    float3 result = lerp(b1.r + Blur3(uv, size, origin, scale), sharp.r, sqrt(max(sharp.r, 0))) * 2.7;
    float2 uv3 = (uv - .5) * (1 - b1.b) + .5;
    result += saturate(sqrt(max(Image(uv3, origin, scale).b, 0)) * (1 - b1.r - result.r));
    result += saturate(sqrt(max(Blur1(uv3, size, origin, scale).b, 0)) * (1 - b1.r - result.r));
    result = pow(max(result, 0), float3(.9, .7, .6)) * 1.25 - .25;
    result -= sharp.g;
    result *= result;
    result -= .19;
    return float4(saturate(result), 1);
}
`;

    return {
        name: "0308", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {
            shader, feedback, feedbackTransparent: true,
            post: [makeBlurPairPass(0), makeBlurPairPass(1),
                   makeBlurPairPass(2), composite]
        }
    };
};
