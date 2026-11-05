// MilkDrop 0176 — painterly radial feedback with threefold composite symmetry.
//
// Original: original/0176.milk (MilkDrop 2, PSVERSION_WARP/COMP = 2).
// The preset's per_pixel equations overwrite their initial negative sx/sy:
// the effective stretch is sx = sy = rd * (1 + star / 20). Its centre follows
// q4/q5, which come from the accumulated mid^3-dependent musictime register.
// Keep this register in private feedback pixels rather than replacing it with
// wall-clock time. The inner-border palette's EEL counters are stored there too.
//
// The custom warp adds colour-dependent advection, low-quality random noise
// and an angular cosine. The custom composite takes the RGB maximum of three
// rotated samples. These PS2 shaders replace the legacy fixed-function gamma,
// decay and video-echo operations; fGammaAdj/fVideoEchoAlpha are not applied.
//
// MilkDrop renders the single enabled shape as an 84-sided additive polygon,
// and the single enabled custom wave as 41 independent random dots. An
// analytic radial fill approximates the polygon (84 sides are almost circular).
// A sparse random tile raster approximates the wave's per-point random dots;
// it preserves the density and colour distribution without a costly 41-point
// loop for every screen pixel. Random texture and rand_frame are procedural
// approximations, not byte-identical MilkDrop resources.
//
// FPS-independent HLSL with a fixed history step at the selected FPS.
// The nonlinear mesh lerp is sensitive to jitter in measured Draw intervals.
// The browser changes FeedbackIntervalMs in place, preserving private state.
// Loaded by Shader - MilkDrop ALL.js; no side effects or callbacks here.
MilkDropPresets["0176"] = function (TARGET_FPS) {
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
float3 PackUnit(float x) {
    float3 v = frac(min(saturate(x), 0.999999) *
                    float3(1.0, 255.0, 65025.0));
    return v - v.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float3 PackPositive(float x) {
    x = max(x, 0.0);
    return PackUnit(x / (1.0 + x));
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 p = int2(floor(input.sceneSpacePos.xy));
    if (p.y == 0 && p.x >= 0 && p.x < 2) {
        // The feedback pass reads the prior source frame's audio values.
        // x=0: relative mid; x=1: relative bass for shape_2's radius.
        float b = max(RelativeBands.Load(int3(p.x == 0 ? 1 : 0, 0, 0)).r,
                      0.0);
        return float4(PackPositive(b), 1.0);
    }
    return 0.0;
}`;

    const warpShader = `
Texture2D Previous : register(t0);
cbuffer FeedbackConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};
static const float PI = 3.141592653589793;
static const float TWO_PI = 6.283185307179586;
static const float MUSIC_PERIOD = 31.41592653589793; // 10*pi.
static const float3 MAGIC = float3(0.1725, 0.5333, 0.9137);
static const int PRIVATE_WIDTH = 6;

float3 PackUnit(float x) {
    float3 v = frac(min(saturate(x), 0.999999) *
                    float3(1.0, 255.0, 65025.0));
    return v - v.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float UnpackUnit(float3 v) {
    return dot(v, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float DecodePositive(float3 rgb) {
    float a = min(UnpackUnit(rgb), 0.99999);
    return a / max(1.0 - a, 0.00001);
}
float3 State(int x) {
    return Previous.Load(int3(x, 0, 0)).rgb;
}
int WrapIndex(int index, int count) {
    int wrapped = index % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 Texel(int2 p, int2 dim) {
    p.x = WrapIndex(p.x, dim.x);
    p.y = WrapIndex(p.y, dim.y);
    if (p.y == 0 && p.x < PRIVATE_WIDTH) return 0.0;
    return Previous.Load(int3(p, 0)).rgb;
}
float3 History(float2 uv, float2 size) {
    // Bilinear wrapping. Exclude the reserved control pixels *before* filtering.
    int2 dim = max(int2(size), int2(1, 1));
    float2 coord = uv * size - 0.5;
    int2 p = int2(floor(coord));
    float2 f = frac(coord);
    float3 top = lerp(Texel(p, dim), Texel(p + int2(1, 0), dim), f.x);
    float3 bottom = lerp(Texel(p + int2(0, 1), dim),
                         Texel(p + int2(1, 1), dim), f.x);
    return lerp(top, bottom, f.y);
}
float Hash11(float value) {
    return frac(sin(value * 127.1 + 311.7) * 43758.5453);
}
float Hash12(float2 p) {
    return frac(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}
float3 NoiseTexel(int2 p) {
    float2 v = float2(WrapIndex(p.x, 256), WrapIndex(p.y, 256));
    return frac(sin(float3(
        dot(v, float2(127.1, 311.7)),
        dot(v, float2(269.5, 183.3)),
        dot(v, float2(419.2, 371.9)))) * 43758.5453);
}
float3 NoiseLQ(float2 uv) {
    float2 coord = frac(uv) * 256.0 - 0.5;
    int2 base = int2(floor(coord));
    float2 f = frac(coord);
    float3 a = lerp(NoiseTexel(base), NoiseTexel(base + int2(1, 0)), f.x);
    float3 b = lerp(NoiseTexel(base + int2(0, 1)),
                    NoiseTexel(base + int2(1, 1)), f.x);
    return lerp(a, b, f.y);
}

float2 VertexWarp(float2 original, float2 size, float2 q,
                  float step30) {
    // MilkDrop mesh y increases upwards, unlike texelSpacePos.
    float x = original.x;
    float y = 1.0 - original.y;
    float deltaX = x - 0.5 - q.x;
    float deltaY = y - 0.5 + q.y;
    float rd = length(float2(deltaX * 2.0, deltaY * 1.5));

    // atan(y/x), deliberately NOT atan2(y,x). Preserve quadrant folding.
    float denominator = abs(deltaX) > 1e-6 ? deltaX :
                        (deltaX < 0.0 ? -1e-6 : 1e-6);
    float ag = atan(deltaY / denominator);
    float star = sin(ag * 6.0 + time) * ((2.0 - rd) - ag) / 5.0;
    float zm = 1.0 + star / 20.0;
    // per_pixel_21/22 overwrite their earlier bass/treb sx and sy.
    float stretch = zm * rd;
    stretch = abs(stretch) < 0.0001 ?
        (stretch < 0.0 ? -0.0001 : 0.0001) : stretch;
    float2 centre = float2(0.5 + q.x, 0.5 + q.y);
    float zoom = 0.99951;
    float2 uv = 0.5 + (original - 0.5) / zoom;
    uv = centre + (uv - centre) / stretch;

    // Default built-in warp is still active before the custom shader.
    // warp=.010, fWarpScale=1.331, fWarpAnimSpeed=1.0.
    float2 vertex = float2(2.0 * original.x - 1.0,
                           1.0 - 2.0 * original.y);
    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 + 7.0),
        10.54 + 3.0 * cos(time * 1.233 + 3.0),
        11.49 + 4.0 * cos(time * 0.933 + 5.0));
    float2 w = vertex / 1.331;
    float wx = sin(time * 0.333 + w.x * factors.x - w.y * factors.w) +
               cos(time * 0.753 - w.x * factors.y + w.y * factors.z);
    float wy = cos(time * 0.375 - w.x * factors.z - w.y * factors.y) +
               sin(time * 0.825 + w.x * factors.x + w.y * factors.w);
    uv += 0.010 * 0.0035 * float2(wx, -wy);
    // A nonlinear stretch is not a power transform. Blend toward the full
    // reference warp for fractional feedback steps: exact at 30 FPS and
    // first-order motion normalization at 60/120 FPS.
    return lerp(original, uv, saturate(step30));
}
float2 MeshUV(float2 original, float2 size, float2 q, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(original) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1.0, 0.0)) / grid;
    float2 c01 = (cell + float2(0.0, 1.0)) / grid;
    float2 c11 = (cell + 1.0) / grid;
    // Select triangle before evaluating the expensive per-vertex expression.
    bool lower = f.x + f.y <= 1.0;
    float2 a = lower ? c00 : c10;
    float2 b = lower ? c10 : c01;
    float2 c = lower ? c01 : c11;
    float3 weights = lower
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    return weights.x * VertexWarp(a, size, q, step30) +
           weights.y * VertexWarp(b, size, q, step30) +
           weights.z * VertexWarp(c, size, q, step30);
}

float3 SparseRandomWave(float2 p, float2 size,
                        float frameIndex, float step30) {
    // Original: 41 independent rand() points, 10% coloured green (0.5).
    // Per-tile sparse test has the same average density, without testing all
    // 41 random locations at every pixel. Keep each dot one pixel wide.
    const float2 grid = float2(16.0, 16.0);
    float2 tile = floor(p / size * grid);
    float2 t = tile + frameIndex * float2(0.137, 0.319);
    if (Hash12(t) >= 41.0 / 256.0 ||
        Hash12(t * 2.17 + 19.0) <= 0.9)
        return 0.0;
    float2 offset = 0.12 + 0.76 * float2(
        Hash12(t * 3.01 + 7.1), Hash12(t * 4.13 + 18.7));
    float2 dotPosition = (tile + offset) / grid * size;
    float coverage = all(abs(p - dotPosition) <= float2(0.65, 0.65)) ? 1.0 : 0.0;
    return float3(0.0, 0.5 * coverage * step30, 0.0);
}
float3 Shape2(float2 p, float2 size, float bass, float step30) {
    // 84-sided polygon with centre alpha 0.6 and edge alpha zero. The source
    // is additive blue (0,0,0.2); no texture and no visible outline.
    float t = time;
    float2 center = float2(
        0.5 + 0.34 * sin(0.3 * t) + 0.1 * sin(2.3 * t),
        0.5 - 0.34 * cos(0.3 * t) - 0.1 * cos(2.3 * t));
    float radius = 0.5 * (0.16777 + bass) * min(size.x, size.y);
    float distance = length(p - center * size);
    float alpha = 0.6 * saturate(1.0 - distance / max(radius, 1.0));
    return float3(0.0, 0.0, 0.2 * alpha * step30);
}

float3 InnerBorderColor(float counter1, float counter2, float color) {
    int c = (int)color;
    float r = c == 1 || c == 2 || c == 3 ? 1.0 :
              c == 4 ? sin(counter2 + 2.1) :
              c == 5 || c == 6 ? 0.0 : sin(counter1);
    float g = c == 1 ? 0.0 :
              c == 2 ? sin(counter2 * 0.5) :
              c == 3 ? sin((counter1 + 1.75) * 0.4) :
              c == 4 || c == 5 ? 1.0 :
              c == 6 ? sin(counter2 + 2.0) : 0.0;
    float b = c == 1 ? sin(counter1 + 2.1) :
              c == 2 || c == 3 || c == 4 ? 0.0 :
              c == 5 ? sin(counter1) : 1.0;
    return saturate(float3(0.5 * r, 0.5 * g, b));
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 original = p / size;
    float step30 = max(frameStep * 0.5, 0.0001);
    // MilkDrop reference for stochastic injection is 30 Hz. Reuse one
    // random pattern across fractional steps; avoid increasing its energy.
    float frameIndex = floor(time * 30.0);

    float3 signature = State(5);
    bool initialized = all(abs(signature - MAGIC) < float3(0.012, 0.012, 0.012));
    float mid = DecodePositive(State(0));
    float bass = DecodePositive(State(1));

    // musictime = musictime + mid^3*0.02*(75/fps).
    // At the reference 30 Hz this is 0.05*mid^3 per frame.
    // The period 10*pi preserves both cos(.6*t) and sin(.4*t) exactly.
    float previousPhase = initialized ? UnpackUnit(State(2)) : 0.0;
    float music = frac(previousPhase +
        (0.05 / MUSIC_PERIOD) * mid * mid * mid * step30);
    float musicTime = music * MUSIC_PERIOD;
    float2 q = float2(0.6 * cos(musicTime * 0.6),
                      0.6 * sin(musicTime * 0.4));

    // Reproduce the per_frame rainbow-generator counters in 30-Hz steps.
    float4 counters = Previous.Load(int3(3, 0, 0));
    float c1 = initialized ? floor(counters.r * 5.0 + 0.5) * 0.2 : 0.0;
    float c2 = initialized ? floor(counters.g * 5.0 + 0.5) * 0.2 : 0.0;
    float color = initialized ? floor(counters.b * 8.0 + 0.5) : 0.0;
    bool delay2 = initialized && counters.a > 0.5;
    float tick = fmod(floor(max(time, 0.0) * 30.0), 256.0);
    float oldTick = floor(State(4).r * 255.0 + 0.5);
    if (!initialized || abs(tick - oldTick) > 0.5) {
        c1 = c2 >= 0.999 ? (c1 >= 0.999 ? 0.0 : c1 + 0.2) : 1.0;
        c2 = c1 >= 0.999 ? (c2 >= 0.999 ? 0.0 : c2 + 0.2) : 1.0;
        int delay1 = delay2 ? 1 :
            (((int)color % 2) == 1
                ? (c1 >= 0.999 ? 2 : 0)
                : (c2 >= 0.999 ? 2 : 0));
        delay2 = delay1 == 2;
        color = color > 7.0 ? 0.0 :
                (delay1 == 1 ? color + 1.0 : color);
    }

    // Feedback-only private state. Source replaces only audio texels 0/1.
    if (p.y < 1.0 && p.x >= 0.0 && p.x < PRIVATE_WIDTH) {
        if (p.x < 2.0) return 0.0;
        if (p.x < 3.0) return float4(PackUnit(music), 1.0);
        if (p.x < 4.0) return float4(c1, c2, color / 8.0,
                                    delay2 ? 1.0 : 0.0);
        if (p.x < 5.0) return float4(tick / 255.0, 0.0, 0.0, 1.0);
        return float4(MAGIC, 1.0);
    }

    float2 mesh = MeshUV(original, size, q, step30);
    float2 uv = input.texelSpacePos.xy + (mesh - original);
    // PSVERSION_WARP=2, original warp_ shader. Its sampler_main wraps and
    // filters regardless of bTexWrap. A small RGB displacement is sampled
    // from the *previous* frame, then used for the second history fetch.
    float3 blurry = History(uv + 1.0 / size, size);
    uv += (blurry.xy - 0.37) * 0.01;
    float3 result = History(uv, size);

    // sampler_noise_lq is a 256x256 wrapping bilinear noise texture in
    // MilkDrop, with a fresh rand_frame.xy shift every feedback frame.
    float2 randomOffset = float2(Hash11(frameIndex * 1.123 + 12.8),
                                 Hash11(frameIndex * 2.031 + 94.2));
    result += (NoiseLQ(original * 4.0 + randomOffset) * 2.0 - 1.0) *
              (0.02 * step30);
    float angle = atan2(original.y - 0.5, original.x - 0.5);
    result += cos(angle * 17.0 + time * 12.0) * (0.15 * step30);
    // Do not apply fDecay=0.98: the original custom warp replaces it, and
    // per_frame also sets decay=1. A fade here changes the entire effect.

    // Draw order: shape_2, custom wave_0 dots, built-in wave (wave_a=0),
    // inner border. Nothing else from the disabled shapes/waves is rendered.
    result += Shape2(p, size, bass, step30);
    result += SparseRandomWave(p, size, frameIndex, step30);

    float edge = min(min(original.x, original.y),
                     min(1.0 - original.x, 1.0 - original.y));
    if (edge < 0.0025) {
        // ib_size=.005, ib_a=1, ob_size=0.
        float3 border = InnerBorderColor(c1, c2, color);
        result = border;
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
int WrapIndex(int index, int count) {
    int wrapped = index % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 Pixel(int2 p, int2 dim) {
    p.x = WrapIndex(p.x, dim.x);
    p.y = WrapIndex(p.y, dim.y);
    return p.y == 0 && p.x < 6 ? 0.0 :
           Frame.Load(int3(p, 0)).rgb;
}
float3 SampleCanvas(float2 uv, float2 size) {
    // sampler_main wraps bilinearly. Decode texels explicitly so control
    // state cannot bleed into the image at fractional sample positions.
    int2 dim = max(int2(size), int2(1, 1));
    float2 coord = uv * size - 0.5;
    int2 base = int2(floor(coord));
    float2 f = frac(coord);
    float3 top = lerp(Pixel(base, dim),
                      Pixel(base + int2(1, 0), dim), f.x);
    float3 bottom = lerp(Pixel(base + int2(0, 1), dim),
                         Pixel(base + int2(1, 1), dim), f.x);
    return lerp(top, bottom, f.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    // comp_6..23: rotate two copies by +/-120 degrees in the aspect-scaled
    // space, taking per-channel maxima with the unrotated frame.
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 p = (uv - 0.5) * aspect;
    const float angleA = 6.28 * 0.333;
    const float angleB = 6.28 * 0.667;
    float sa, ca, sb, cb;
    sincos(angleA, sa, ca);
    sincos(angleB, sb, cb);
    float2 uv2 = float2(p.x * ca - p.y * sa,
                        p.x * sa + p.y * ca) + 0.5;
    float2 uv3 = float2(p.x * cb - p.y * sb,
                        p.x * sb + p.y * cb) + 0.5;
    float3 result = SampleCanvas(p + 0.5, size);
    result = max(result, SampleCanvas(uv2, size));
    result = max(result, SampleCanvas(uv3, size));
    // fGammaAdj, video echo, brighten etc. belong only to the legacy
    // composite and are intentionally absent from this custom comp shader.
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0176",
        sourceId: 5, // VisSourceType.Vectorscope
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader,
            feedbackIntervalMs: 1000 / TARGET_FPS
        }
    };
};
