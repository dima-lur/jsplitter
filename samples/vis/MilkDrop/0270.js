// MilkDrop 0270 — rotating textured disc and three orbiting colour sources.
// Original: original/new/0270.milk, read in full before translation.
//
// The modern 0.10.0 binary was checked for the mode-5 waveform (DrawWave at
// 0x18011F5F1: 480 vertices, independent channel offsets, texture-size alpha).
// Its embedded include.fx also supplies sqrt(abs(x)), not HLSL sqrt(x).
// q27/q28/q30 are never assigned by this preset; their zero values eliminate
// the apparent tangent distortion, but not the following q1..q4 translation.
//
// Private history pixels carry audio and the original oldq8 accumulator.
// As in 0314/0329, feedback sees the preceding source's band sample. This is
// one history-step latency, not an extra audio gain or a new analysis window.
// Blur1 uses the native separable weights; Blur2/3 below are broad Gaussian
// approximations to the progressively downsampled chain. Post samples the
// current history; MilkDrop's precomputed blur can still belong to the previous
// history step. These are fidelity limits, not verified pixel equivalence.
// The textured disc has a discrete .6 copy ratio: taking its fractional
// spatial transform at higher FPS introduces extra rings. Instead advance
// the complete disc operation toward its native result by step30; both new
// source and history still update on every 30/60/120-FPS rendering step.
MilkDropPresets["0270"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
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
float3 PackPositive(float x) {
    x = max(x, 0.0);
    float3 v = frac(min(x / (1.0 + x), .999999) *
                    float3(1.0, 255.0, 65025.0));
    return v - v.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float3 Quantize(float3 value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float QuantizeAlpha(float value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float3 Bands(int first) {
    return max(float3(RelativeBands.Load(int3(first, 0, 0)),
        RelativeBands.Load(int3(first + 1, 0, 0)),
        RelativeBands.Load(int3(first + 2, 0, 0))), 0.0);
}
float CenterTransmittance(float2 uv, float2 size, float step30) {
    float aspectY = min(size.y / size.x, 1.0);
    float diamond = abs(uv.x - .5) / (.025 * aspectY) +
                    abs(uv.y - .5) / .025;
    return pow(1.0 - (3.0 / 32.0) * saturate(1.0 - diamond), step30);
}
float3 OrbitingShape(float2 uv, float2 size, float2 center,
                    float radius, float3 centerColor) {
    float aspectY = min(size.y / size.x, 1.0);
    float2 local = float2((uv.x - center.x) / aspectY,
                          uv.y - (1.0 - center.y));
    const float sector = 2.0 * PI / 40.0;
    float angle = frac((atan2(local.y, local.x) - PI * .25) / sector) *
                  sector - sector * .5;
    float boundary = radius * .5 * cos(sector * .5) /
                     max(cos(angle), .000001);
    float weight = saturate(1.0 - length(local) / max(boundary, .000001));
    // The triangle fan interpolates RGB and alpha separately: both fall to
    // zero at its rim, so the additive RGB contribution is quadratic.
    return Quantize(centerColor) * weight * weight;
}
float SegmentDistanceSquared(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), .000001));
    float2 offset = p - a - ab * t;
    return dot(offset, offset);
}
void Segments(float2 p, float2 a, float2 b, bool thick,
              inout float4 nearest) {
    // min(sqrt(d2)) == sqrt(min(d2)): defer the square roots until after
    // the complete 480-vertex scan instead of repeating eight per vertex.
    nearest.x = min(nearest.x, SegmentDistanceSquared(p, a, b));
    if (thick) {
        nearest.y = min(nearest.y, SegmentDistanceSquared(p - float2(1, 0), a, b));
        nearest.z = min(nearest.z, SegmentDistanceSquared(p - float2(1, -1), a, b));
        nearest.w = min(nearest.w, SegmentDistanceSquared(p - float2(0, -1), a, b));
    }
}
float2 PCM(int index, int start) {
    return clamp(float2(LeftPCM.Load(int3(start + index, 0, 0)),
                        RightPCM.Load(int3(start + index, 0, 0))), -1.0, 1.0)
           * 1.951;
}
float2 WaveVertex(float2 current, float2 ahead, float2 size) {
    float x = current.y * ahead.x + current.x * ahead.y;
    float y = current.y * current.y - ahead.x * ahead.x;
    float cs = cos(time * .3), sn = sin(time * .3);
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 native = float2(x * cs - y * sn, x * sn + y * cs) * aspect.yx;
    native += float2(.72, 0.0); // wave_x=.860, wave_y=.500.
    // DrawWave reverses Y, followed by the Y-down 2D projection.
    return (native + 1.0) * .5 * size;
}
float WaveAlpha(float2 p, float2 size, float alpha) {
    if (alpha < .004) return 0.0; // Native visibility test before UNORM8.
    int start = max((int)pointCount - 576, 0);
    float2 filtered = PCM(0, start);
    float2 ahead = filtered;
    [fastopt]
    for (int i = 1; i <= 32; ++i)
        ahead = ahead * .9 + PCM(i, start) * .1;
    float2 below = WaveVertex(filtered, ahead, size);
    float2 a = below;
    filtered = filtered * .9 + PCM(1, start) * .1;
    ahead = ahead * .9 + PCM(33, start) * .1;
    float2 b = WaveVertex(filtered, ahead, size);
    float4 nearest = 1e12;
    bool thick = size.x >= 512.0;
    [fastopt]
    for (int vertex = 2; vertex < 480; ++vertex) {
        filtered = filtered * .9 + PCM(vertex, start) * .1;
        ahead = ahead * .9 + PCM(vertex + 32, start) * .1;
        float2 c = WaveVertex(filtered, ahead, size);
        float2 midpoint = (-.15 * below + 1.15 * a + 1.15 * b - .15 * c) * .5;
        Segments(p, a, midpoint, thick, nearest);
        Segments(p, midpoint, b, thick, nearest);
        below = a; a = b; b = c;
    }
    float2 midpoint = (-.15 * below + 1.15 * a + b) * .5;
    Segments(p, a, midpoint, thick, nearest);
    Segments(p, midpoint, b, thick, nearest);
    float4 opacity = (1.0 - smoothstep(.35, 1.15, sqrt(nearest))) * QuantizeAlpha(alpha);
    if (!thick) opacity.yzw = 0.0;
    // Four cumulative srcAlpha/invSrcAlpha draws, not one wider line.
    return 1.0 - (1.0 - opacity.x) * (1.0 - opacity.y) *
                 (1.0 - opacity.z) * (1.0 - opacity.w);
}
float4 main(VS_OUTPUT input) : SV_Target {
    float2 p = input.sceneSpacePos.xy;
    int2 pixel = int2(floor(p));
    if (pixel.y == 0 && pixel.x < 16) {
        if (pixel.x < 6)
            return float4(PackPositive(RelativeBands.Load(int3(pixel.x, 0, 0))), 1.0);
        return 0.0; // Keep feedback-owned state intact under source OVER.
    }
    float2 size = max(viewportSize, float2(1, 1));
    float2 uv = p / size;
    float step30 = max(frameStep * .5, .0001);
    float3 att = Bands(3);
    float frame30 = time * 30.0;
    float3 rgb = OrbitingShape(uv, size,
        float2(.57 + .189 * sin(time), .5 + .3 * cos(time)),
        .1 * att.y, .5 + .5 * sin(frame30 * .5 + float3(0, 4.188, 2.094)));
    rgb += OrbitingShape(uv, size,
        float2(.5 + .225 * sin(time + 2.09), .45 + .25 * cos(time + 1.797)),
        .103 * att.x, float3(.4686 + .4686 * sin(frame30 * .4686),
        .612 + .612 * sin(frame30 * .612 + 3.2666),
        .5 + .5 * sin(frame30 * .5 + 2.094)));
    rgb += OrbitingShape(uv, size,
        float2(.44 + .216 * sin(time + 5.154), .5 + .3 * cos(time + 4.19)),
        .09 * att.z, .5 + .5 * sin(frame30 * .5 + float3(0, 4.188, 2.094)));
    rgb = saturate(rgb * step30);
    float volume = dot(Bands(0), .333);
    float alpha = 1.136;
    if (size.x == 256.0) alpha *= .07;
    else if (size.x == 512.0) alpha *= .09;
    else if (size.x == 1024.0) alpha *= .11;
    else if (size.x == 2048.0) alpha *= .13;
    alpha = saturate(alpha * (volume - 1.140) / (1.300 - 1.140));
    alpha = WaveAlpha(p, size, alpha);
    alpha = 1.0 - pow(saturate(1.0 - alpha), step30);
    float3 wave = float3(1, .83, 1.24) + float3(
        .350 * (.60 * sin(.980 * time) + .40 * sin(1.047 * time)),
        .4165 * (.534 * sin(1.0187 * time) + .352 * sin(1.1567 * time)),
        .350 * (.60 * sin(.814 * time) + .40 * sin(1.011 * time)));
    rgb = Quantize(wave) * alpha + rgb * (1.0 - alpha);
    // DrawSprites darkens the centre after both shapes and waveform. Apply
    // the same multiplier to source RGB and the feedback contribution.
    rgb *= CenterTransmittance(uv, size, step30);
    return float4(rgb, alpha);
}`;

    const imageHeader = `
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
static const float PI = 3.141592653589793;
float Unpack(float3 value) {
    return dot(value, float3(1, 1.0 / 255.0, 1.0 / 65025.0));
}
float DecodePositive(float3 value) {
    float v = min(Unpack(value), .999999);
    return v / max(1.0 - v, .000001);
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    float3 v = frac(min(value / (1.0 + value), .999999) *
                    float3(1, 255, 65025));
    return v - v.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0);
}
float State(int index) {
    return DecodePositive(Frame.Load(int3(index, 0, 0)).rgb);
}
bool IsControl(float2 uv, float2 size) {
    return uv.y * size.y < 1.5 && uv.x * size.x < 16.5;
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv); // bTexWrap=0, including the textured shape.
    if (IsControl(uv, size)) return 0.0;
    return Frame.SampleLevel(Filter, origin + uv * scale, 0).rgb;
}
float3 Blur1H(float2 uv, float2 size, float2 origin, float2 scale) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(.974358974, 2.90625, 4.774193548, 6.6);
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 delta = float2(offsets[i] / size.x, 0);
        sum += (Image(uv + 1.0 / size + delta, size, origin, scale) +
                Image(uv + 1.0 / size - delta, size, origin, scale)) * weights[i];
    }
    return sum * .027322404;
}
float3 Blur1(float2 uv, float2 size, float2 origin, float2 scale) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(.901408451, 2.487804878);
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 delta = float2(0, offsets[i] * 2.0 / size.y);
        sum += (Blur1H(uv + float2(2.0 / size.x, 0) + delta, size, origin, scale) +
                Blur1H(uv + float2(2.0 / size.x, 0) - delta, size, origin, scale)) * weights[i];
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    return sum * .027322404 * (.705 + .295 * saturate(sqrt(max(edge, 0.0)) * 5.0));
}
void BlurFootprint(float2 size, int level, out float2 sigma, out float2 shift) {
    // Derive the footprint from the actual six-pass dimensions and embedded
    // blur1_ps/blur2_ps offsets, including bilinear interpolation variance.
    float2 work = size, sourceDimensions = size;
    float2 variance = 0.0;
    shift = 0.0;
    [loop]
    for (int passIndex = 0; passIndex < 6; ++passIndex) {
        if (passIndex >= level * 2) break;
        float2 pixelScale = size / sourceDimensions;
        if ((passIndex & 1) == 0) {
            const float4 w = float4(7.8, 6.4, 3.1, 1.0);
            const float4 d = float4(.974358974, 2.90625, 4.774193548, 6.6);
            float4 f = frac(d);
            variance.x += dot(w, d * d + f * (1.0 - f)) / 18.3 *
                          pixelScale.x * pixelScale.x;
            shift += pixelScale;
        } else {
            const float2 w = float2(14.2, 4.1);
            const float2 d = float2(.901408451, 2.487804878);
            float2 f = frac(d);
            variance.y += dot(w, d * d + f * (1.0 - f)) / 18.3 *
                          pixelScale.y * pixelScale.y;
            shift.x += pixelScale.x;
        }
        if ((passIndex & 1) == 0 || passIndex < 2)
            work = max(float2(16, 16), floor(work * .5));
        sourceDimensions = max(float2(16, 4),
            floor((work + 3.0) / float2(16, 4)) * float2(16, 4));
    }
    sigma = sqrt(variance);
}
float3 BroadBlur(float2 uv, float2 size, float2 origin, float2 scale, int level) {
    // Dense weighted footprint, rather than a handful of sharp displaced
    // copies. This approximates the broad Blur2/3 fields, not their exact
    // downsampled lattice or intermediate UNORM8 conversions.
    float2 sigma, shift;
    BlurFootprint(size, level, sigma, shift);
    float3 sum = 0.0;
    float total = 0.0;
    [loop]
    for (int y = -6; y <= 6; ++y) {
        [loop]
        for (int x = -6; x <= 6; ++x) {
            float2 offset = float2(x, y) / 3.0;
            float weight = exp(-.5 * dot(offset, offset));
            sum += Image(uv + (shift + offset * sigma) / size, size, origin, scale) * weight;
            total += weight;
        }
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    // b2x=.880 and b3x=.970: safe blur ranges clamp Blur3's maximum to
    // Blur2's .880. Approximate the intermediate clipping in decoded units.
    return min(sum / total, .88) *
        (.705 + .295 * saturate(sqrt(max(edge, 0.0)) * 5.0));
}
float2 MeshWeights(float2 uv, out float2 a, out float2 b, out float2 c,
                   out float3 weights) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(uv) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    bool lower = f.x + f.y <= 1.0;
    a = (cell + (lower ? float2(0, 0) : float2(1, 0))) / grid;
    b = (cell + (lower ? float2(1, 0) : float2(0, 1))) / grid;
    c = (cell + (lower ? float2(0, 1) : float2(1, 1))) / grid;
    weights = lower ? float3(1.0 - f.x - f.y, f.x, f.y) :
                      float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    return f;
}
`;

    const warpShader = imageHeader + `
float4 Phases(float q8) {
    return float4(.62 * (.60 * sin(.374 * q8) + .40 * sin(.294 * q8)),
                  .738 * (.6 * sin(.3223 * q8) + .484 * sin(.2542 * q8)),
                  .539 * (.57 * sin(-.1914 * q8) + .368 * sin(.3895 * q8)),
                  .62 * (.60 * sin(.234 * q8) + .40 * sin(-.271 * q8)));
}
float2 WarpVertex(float2 uvOriginal, float2 size, float q8, float4 q, float step30) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(uvOriginal.x * 2.0 - 1.0, 1.0 - uvOriginal.y * 2.0);
    float rad = length(vertex * aspect);
    // Per-vertex EEL x/y uses the aspect-corrected 0..1 mesh coordinates.
    float2 xy = .5 + float2(vertex.x, -vertex.y) * aspect * .5;
    float2 d = xy * 2.0 - 1.0 - q.xy;
    float angle = atan2(d.x, d.y + 1e-20);
    float mult = .008 / (length(d) + .4);
    float2 delta = mult * float2(sin(angle - 1.5), cos(angle - 1.64));
    d = xy * 2.0 - 1.0 - q.zw;
    angle = atan2(d.x, d.y + 1e-20);
    mult = .008 * sin(q8) / (length(d) + .4);
    delta += mult * float2(sin(angle + 1.5), cos(angle + 1.5));
    float zoom = pow(1.00496, pow(.80707, rad * 2.0 - 1.0) * step30);
    float2 uv = .5 + float2(vertex.x, -vertex.y) * aspect * .5 / zoom;
    uv = (uv - .5) / pow(float2(.99967, .99990), step30) + .5;
    // Tiny built-in warp (.00016) is retained, rather than rounded to zero.
    float4 f = float4(11.68, 8.77, 10.54, 11.49) +
        float4(4, 3, 3, 4) * cos(time * float4(1.413, 1.113, 1.233, .933) +
                                float4(10, 7, 3, 5));
    uv += .00016 * .0035 * step30 * float2(
        sin(time * .333 + (vertex.x * f.x - vertex.y * f.w) / 1.331) +
        cos(time * .753 - (vertex.x * f.y - vertex.y * f.z) / 1.331),
        cos(time * .375 - (vertex.x * f.z + vertex.y * f.y) / 1.331) +
        sin(time * .825 + (vertex.x * f.x + vertex.y * f.w) / 1.331));
    float rotation = -.01 * rad * sin(q8) * step30;
    float sn = sin(rotation), cs = cos(rotation);
    float2 local = uv - .5;
    uv = .5 + float2(local.x * cs - local.y * sn, local.x * sn + local.y * cs);
    uv -= delta * step30;
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 MeshUV(float2 uv, float2 size, float q8, float4 q, float step30) {
    float2 a, b, c; float3 weight;
    MeshWeights(uv, a, b, c, weight);
    float2 corners[3] = { a, b, c };
    float2 transformed[3];
    [loop]
    for (int i = 0; i < 3; ++i)
        transformed[i] = WarpVertex(corners[i], size, q8, q, step30);
    return transformed[0] * weight.x + transformed[1] * weight.y +
           transformed[2] * weight.z;
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    float2 original = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x,
                          ddy(input.texelSpacePos.y) * size.y);
    float2 origin = input.texelSpacePos.xy - original * scale;
    float step30 = max(frameStep * .5, .0001);
    float oldq8 = State(6);
    float previousQ8 = oldq8 + .11 * max(time - step30 / 30.0, 0.0);
    float sum = State(0) + State(3);
    float increment = sum > 1.8 ? min(previousQ8 + .25 * pow(max(sum - 1.0, 0.0), 5.0), 1.0) : 0.0;
    oldq8 += increment * step30;
    float q8 = oldq8 + .11 * time;
    if (original.y * size.y < 1.0 && original.x * size.x < 16.0) {
        int pixel = (int)floor(original.x * size.x);
        if (pixel < 6) return 0.0;
        return float4(pixel == 6 ? PackPositive(oldq8) : float3(0, 0, 0), 1.0);
    }
    float4 q = Phases(q8);
    // Keep the .6 geometric progression of the native copies. A spatial
    // .6^step30 would pack two/four times as many annuli into the same disc.
    float2 local = float2((original.x - .5) / min(size.y / size.x, 1.0), original.y - .5);
    float rotation = .02 + .6 * time;
    const float sector = 2.0 * PI / 30.0;
    float angle = frac((atan2(local.y, local.x) - rotation - PI * .25) / sector) *
                  sector - sector * .5;
    float boundary = .3 * cos(sector * .5) / max(cos(angle), .000001);
    float radial = length(local) / boundary;
    bool inDisc = radial < 1.0;
    float effectStep = inDisc ? 1.0 : step30;
    float2 uv = MeshUV(original, size, q8, q, effectStep);
    // q27=q28=q30=0: rs before the matrix is zero, then rs+.1 is
    // multiplied by float2x2(_qa), leaving this nonzero translation.
    uv += .1 * float2(q.x + q.z, q.y + q.w) / 30.0 * effectStep;
    float2 uv6 = uv - .51;
    uv6 = mul(uv6, float2x2(q.x, q.y, q.z, q.w));
    // Verified modern _safe_sqrt substitution from embedded include.fx.
    float3 mus = (.24 / max(sqrt(abs(uv6.y)), 1e-15)) * float3(2, 1.1, 2);
    float3 sharp = Image(uv, size, origin, scale);
    float3 blur = Blur1(frac(uv), size, origin, scale);
    // At 30 FPS this is exactly (sharp-.054*blur+.052*mus)*.843-.01.
    float decay = pow(.843, effectStep);
    float3 drive = (-.054 * blur + .052 * mus) * .843 - .01;
    float3 result = sharp * decay + drive * ((1.0 - decay) / (1.0 - .843));
    result = saturate(result);
    // Shape 0 is a 30-sided textured fan drawn after warp. Its angle grows
    // by .02 per reference frame; texture angle and zoom remain 0 and 1.
    if (inDisc) {
        float cs = cos(rotation), sn = sin(rotation);
        float2 textureLocal = float2(cs * local.x + sn * local.y,
                                     -sn * local.x + cs * local.y);
        float2 textureUV = .5 + textureLocal * (1.0 / .6) *
            float2(min(size.y / size.x, 1.0), 1.0);
        float shapeAlpha = lerp(252.0 / 255.0, 1.0, radial);
        shapeAlpha = 1.0 - pow(saturate(1.0 - shapeAlpha), effectStep);
        float3 tint = pow(lerp(float3(1, 250.0 / 255.0, 1), 1.0, radial), effectStep);
        result = lerp(result, Image(textureUV, size, origin, scale) * tint, shapeAlpha);
        // Scale the complete warp+disc operation, not just shape alpha:
        // otherwise the extra partial frames leak the bright warp drive
        // through a shape that is almost opaque at the 30-Hz reference.
        // This update preserves the native static fixed point as well as
        // the copy spacing; source emission is already scaled by step30.
        if (step30 < .9999)
            result = lerp(Image(original, size, origin, scale), result, step30);
    }
    float diamond = abs(local.x) / .025 + abs(local.y) / .025;
    result *= pow(1.0 - (3.0 / 32.0) * saturate(1.0 - diamond), step30);
    return float4(saturate(result), 1.0);
}`;

    const compShader = imageHeader + `
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1));
    float2 uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x,
                          ddy(input.texelSpacePos.y) * size.y);
    float2 origin = input.texelSpacePos.xy - uv * scale;
    if (IsControl(uv, size)) return float4(0, 0, 0, 1);
    float3 base = Blur1(uv, size, origin, scale) +
                  BroadBlur(uv, size, origin, scale, 2) +
                  BroadBlur(uv, size, origin, scale, 3) +
                  Image(uv, size, origin, scale) * .8 - .4;
    float a = base.x / 4.0, b = base.y / 4.0, c = base.z / 4.0;
    c = c + b + a * b;
    a = a + c + a * c;
    base = .3 * a;
    float3 result = base * (1.3 - base) * (.7 - base) * 2.0 * float3(2.2, .4, 1.2) +
                    base * base * float3(2.9, 2.5, .8);
    result /= float3(2.1, -.8, 2.6);
    result *= 1.5;
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0270", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {
            shader, feedback: warpShader, post: compShader
        }
    };
};
