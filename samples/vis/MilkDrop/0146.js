// MilkDrop 0146 — four roaming custom-wave paths with emboss / blur color
//
// Source: milkdrop/0146.milk (MilkDrop 2, PSVERSION=2). The four enabled
// additive thick custom waves are the visible source of the preset. Their
// per-point mx/my/ma registers form stateful walks, driven by the relative
// bass/mid/treb bands. Both the beat-triggered zoom/rotation and the four
// wave states survive successive feedback steps in reserved history pixels.
//
// The modern foo_vis_milk2 uses distinct downsampled Blur1/Blur3 textures
// and GPU line strips. JSplitter's general shader/feedback/post pipeline has
// no separate blur textures or geometry pass. Blur3 is approximated with a
// broad weighted kernel and each 512-point wave is rasterized through 64
// vertices. These are fidelity/performance compromises, not native behavior.
// The preset's ordinary mode-7 wave has fWaveAlpha=.001 (visually negligible);
// all custom shapes are disabled. Several per_frame q/registers are unused by
// the active shaders, so we do not carry those redundant values.
//
// 30 FPS is the reference; the source and history advance at TARGET_FPS, not
// at a frozen 30 Hz. Stateful drifts, fade and injection use a 30-Hz time
// factor. The per-point curve retains its 512-sample reference shape.
//
// Loaded by Shader - MilkDrop ALL.js; no global timers or callbacks here.
MilkDropPresets["0146"] = function (TARGET_FPS) {
    const updateIntervalMs = 17; // Audio cadence, independent of the display.

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
};
struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float3 PackUnitFloat(float value) {
    float3 encoded = frac(min(saturate(value), 0.999999) *
                          float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnitFloat(value / (1.0 + value));
}

float4 main(VS_OUTPUT input) : SV_Target {
    // The audio values are written AFTER the feedback pass. The next pass
    // reads them from Previous in order to update the beat / wave states.
    int2 p = int2(floor(input.sceneSpacePos.xy));
    if (p.y == 0 && p.x >= 0 && p.x < 3) {
        float band = max(RelativeBands.Load(int3(p.x, 0, 0)).r, 0.0);
        return float4(PackPositive(band), 1.0);
    }
    return 0.0; // Do not overwrite the other private state pixels.
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

static const float PI = 3.1415926535898;
static const float TWO_PI = 6.2831853071796;
static const int CONTROL_WIDTH = 32;
static const int CONTROL_HEIGHT = 17;
static const int VERTICES_PER_WAVE = 64;

float3 PackUnitFloat(float value) {
    float3 encoded = frac(min(saturate(value), 0.999999) *
                          float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}
float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnitFloat(value / (1.0 + value));
}
float DecodePositive(float3 encoded) {
    float v = min(UnpackUnitFloat(encoded), 0.99999);
    return v / max(1.0 - v, 0.00001);
}
float3 State(int index) {
    return Previous.Load(int3(index, 0, 0)).rgb;
}
bool IsControl(int2 p) {
    return p.x >= 0 && p.x < CONTROL_WIDTH &&
           p.y >= 0 && p.y < CONTROL_HEIGHT;
}
int WrapIndex(int value, int limit) {
    value %= limit;
    return value < 0 ? value + limit : value;
}
float3 HistoryTexel(int2 p, int2 dims, bool wrap) {
    if (wrap) {
        p.x = WrapIndex(p.x, dims.x);
        p.y = WrapIndex(p.y, dims.y);
    } else {
        p = clamp(p, int2(0, 0), dims - 1);
    }
    return IsControl(p) ? float3(0.0, 0.0, 0.0) :
                          Previous.Load(int3(p, 0)).rgb;
}
float3 SampleHistory(float2 uv, float2 size, bool wrap) {
    int2 dims = max(int2(size), int2(1, 1));
    float2 coord = uv * size - 0.5;
    int2 cell = int2(floor(coord));
    float2 f = frac(coord);
    float3 top = lerp(HistoryTexel(cell, dims, wrap),
        HistoryTexel(cell + int2(1, 0), dims, wrap), f.x);
    float3 bottom = lerp(HistoryTexel(cell + int2(0, 1), dims, wrap),
        HistoryTexel(cell + int2(1, 1), dims, wrap), f.x);
    return lerp(top, bottom, f.y);
}
float3 HistoryWrap(float2 uv, float2 size) {
    return SampleHistory(uv, size, true);
}
float3 HistoryClamp(float2 uv, float2 size) {
    return SampleHistory(uv, size, false);
}

// A compact version of the modern Blur1 horizontal/vertical two-stage kernel.
// This is evaluated on the previous frame inside the warp, as in MilkDrop.
float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(0.974358974, 2.90625,
                                  4.774193548, 6.6);
    const float norm = 0.027322404;
    float2 aligned = uv + 1.0 / size;
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 o = float2(offsets[i] / size.x, 0.0);
        sum += (HistoryClamp(aligned + o, size) +
                HistoryClamp(aligned - o, size)) * weights[i];
    }
    return sum * norm;
}
float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(0.901408451, 2.487804878);
    const float norm = 0.027322404;
    float2 aligned = uv + float2(2.0 / size.x, 0.0);
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 o = float2(0.0, offsets[i] * 2.0 / size.y);
        sum += (Blur1Horizontal(aligned + o, size) +
                Blur1Horizontal(aligned - o, size)) * weights[i];
    }
    return sum * norm; // b1ed=0 in 0146.
}
float3 Blur3(float2 uv, float2 size) {
    // The original gets Blur3 from successive downsampled textures. There is
    // no equivalent history texture in the public three-pass API; use a
    // broad, weighted approximation rather than treating Blur3 as Blur1.
    float2 a = 28.0 / size;
    float2 b = 52.0 / size;
    float3 sum = HistoryClamp(uv, size) * 0.22;
    sum += (HistoryClamp(uv + float2(a.x, 0.0), size) +
            HistoryClamp(uv - float2(a.x, 0.0), size) +
            HistoryClamp(uv + float2(0.0, a.y), size) +
            HistoryClamp(uv - float2(0.0, a.y), size)) * 0.105;
    sum += (HistoryClamp(uv + float2(b.x, b.y), size) +
            HistoryClamp(uv + float2(-b.x, b.y), size) +
            HistoryClamp(uv + float2(b.x, -b.y), size) +
            HistoryClamp(uv - float2(b.x, b.y), size)) * 0.09;
    return sum;
}

float Hash11(float p) {
    return frac(sin(p * 127.1 + 311.7) * 43758.5453123);
}
float2 RandomOffset(float now) {
    // frameStep is the measured draw interval in 60-Hz units.
    // Derive the frame index from this runtime value, keeping DXBC
    // identical for 30, 60 and 120 FPS.
    float frame = floor(now * (60.0 / frameStep));
    return float2(Hash11(frame * 1.123 + 12.8),
                  Hash11(frame * 2.031 + 94.2));
}
float3 NoiseTexel(int2 p) {
    p.x = WrapIndex(p.x, 256);
    p.y = WrapIndex(p.y, 256);
    float2 uv = float2(p);
    return frac(sin(float3(
        dot(uv, float2(127.1, 311.7)),
        dot(uv, float2(269.5, 183.3)),
        dot(uv, float2(419.2, 371.9)))) * 43758.5453123);
}
float3 NoiseLq(float2 uv) {
    float2 coord = frac(uv) * 256.0 - 0.5;
    int2 cell = int2(floor(coord));
    float2 f = frac(coord);
    float3 a = lerp(NoiseTexel(cell), NoiseTexel(cell + int2(1, 0)), f.x);
    float3 b = lerp(NoiseTexel(cell + int2(0, 1)),
                    NoiseTexel(cell + int2(1, 1)), f.x);
    return lerp(a, b, f.y);
}

// Reproduce the preset's four per-point recurrences. ma is a phase and mx/my
// are saved per-wave across frames. Native custom-wave y is inverted at the
// rasterization step, not here. The low/high reflection order is preserved.
void WaveParameters(int wave, float3 bands,
                    out float rate, out float speed, out float gate) {
    float bass = bands.x, mid = bands.y, treb = bands.z;
    if (wave == 0) {
        rate = 3.1415 * 0.01 * ((bass > 1.0 ? bass : 0.0) -
                                (treb > 1.0 ? treb : 0.0));
        speed = 0.0002;
        gate = bass + mid + treb > 0.8 ? 1.0 : 0.0;
    } else if (wave == 1) {
        rate = 3.1415 * 0.05 * ((bass > 1.0 ? bass : 0.0) -
                                (mid > 1.0 ? mid : 0.0));
        speed = 0.0001;
        gate = bass + mid + treb > 0.1 ? 1.0 : 0.0;
    } else if (wave == 2) {
        rate = 3.1415 * 0.01 * ((mid > 1.0 ? mid : 0.0) -
                                (treb > 1.0 ? treb : 0.0));
        speed = 0.0004;
        gate = bass + mid + treb > 0.3 ? 1.0 : 0.0;
    } else {
        rate = 3.1415 * 0.02 * ((bass > 0.5 ? bass : 0.0) -
                                (treb > 0.5 ? treb : 0.0));
        speed = 0.0008;
        gate = bass + mid + treb > 0.2 ? 1.0 : 0.0;
    }
}
float3 ReadWaveState(int wave, bool initialized) {
    if (!initialized) return 0.0;
    int statePixel = 10 + wave * 3;
    float x = UnpackUnitFloat(State(statePixel));
    float y = UnpackUnitFloat(State(statePixel + 1));
    float ma = UnpackUnitFloat(State(statePixel + 2)) * TWO_PI;
    return float3(x, y, ma);
}
void WalkWave(float3 startState, float rate, float speed,
              int iterations, out float3 endState,
              out float2 minCorner, out float2 maxCorner) {
    float2 position = startState.xy;
    float phase = startState.z;
    float s, c, ds, dc;
    sincos(phase, s, c);
    sincos(rate, ds, dc);
    minCorner = float2(1.0, 1.0);
    maxCorner = 0.0;
    [loop]
    for (int i = 0; i < 512; ++i) {
        if (i >= iterations) break;
        float nextS = s * dc + c * ds;
        float nextC = c * dc - s * ds;
        s = nextS;
        c = nextC;
        position += speed * float2(c, s);
        if (position.x > 0.9) position.x = 0.9 - position.x;
        if (position.y > 0.9) position.y = 0.9 - position.y;
        if (position.x < 0.1) position.x = 0.9 + position.x;
        if (position.y < 0.1) position.y = 0.9 + position.y;
        minCorner = min(minCorner, position);
        maxCorner = max(maxCorner, position);
    }
    endState = float3(position, frac((phase + rate * iterations) /
                             TWO_PI + 10.0) * TWO_PI);
}
int2 VertexPixel(int wave, int vertex, int component) {
    int number = wave * 128 + vertex * 2 + component;
    return int2(number % 32, 1 + number / 32);
}
float2 Vertex(int wave, int vertex) {
    float x = UnpackUnitFloat(Previous.Load(int3(
        VertexPixel(wave, vertex, 0), 0)).rgb);
    float y = UnpackUnitFloat(Previous.Load(int3(
        VertexPixel(wave, vertex, 1), 0)).rgb);
    return float2(x, y);
}
float2 WaveToPixels(float2 position, float2 size) {
    float side = max(size.x, size.y);
    return 0.5 * size + float2(position.x - 0.5, 0.5 - position.y) * side;
}
float DistanceToSegment(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float along = saturate(dot(p - a, ab) /
                           max(dot(ab, ab), 0.0001));
    return length(p - a - ab * along);
}
float3 Waves(float2 p, float2 size, float step30) {
    // Cross-preset InjectFeedback may carry arbitrary pixels into the private
    // control block. Reject those until our own state signature is written.
    float3 marker = State(22);
    if (any(abs(marker - float3(0.118, 0.831, 0.447)) > 0.012))
        return 0.0;
    float3 light = 0.0;
    float side = max(size.x, size.y);
    float2 q = (p - 0.5 * size) / side * float2(1.0, -1.0) + 0.5;
    // These nested raster loops stay dynamic. fastopt avoids costly O3
    // speculation without changing the evaluated 4 x 63 segments.
    [fastopt]
    for (int wave = 0; wave < 4; ++wave) {
        float3 boundsMin = State(23 + wave * 2);
        float3 boundsMax = State(24 + wave * 2);
        float pad = 3.0 / side + 1.0 / 255.0;
        if (boundsMin.b < 0.5 || any(q < boundsMin.xy - pad) ||
            any(q > boundsMax.xy + pad)) continue;
        float2 a = WaveToPixels(Vertex(wave, 0), size);
        float sum = 0.0;
        [fastopt]
        for (int i = 1; i < VERTICES_PER_WAVE; ++i) {
            float2 b = WaveToPixels(Vertex(wave, i), size);
            float distance = DistanceToSegment(p, a, b);
            sum += 1.0 - smoothstep(0.25, 1.8, distance);
            a = b;
        }
        float opacity = (1.0 - exp(-sum * 1.4)) * step30;
        if (wave == 0) light.r += opacity;
        else if (wave == 1) light.b += opacity;
        else if (wave == 2) light.g += opacity;
        else light.rb += opacity;
    }
    return light;
}

// The built-in warp is applied at 48x36 mesh vertices and then interpolated.
float2 WarpVertexUV(float2 original, float2 size, float2 motion,
                    float zoom, float rot, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 centered = original * 2.0 - 1.0;
    centered.y = -centered.y;
    float radius = length(centered * aspect);
    float exponent = pow(3.04777, radius * 2.0 - 1.0);
    float zoomStep = pow(max(zoom, 0.05), exponent * step30);
    float2 v = centered * aspect / zoomStep;
    float angle = rot * step30;
    float cs = cos(angle), sn = sin(angle);
    v = float2(v.x * cs - v.y * sn, v.x * sn + v.y * cs);
    float2 uv = 0.5 + float2(v.x, -v.y) * 0.5;
    float4 factors = float4(
        11.68 + 4.0 * cos(time * 1.413 + 10.0),
         8.77 + 3.0 * cos(time * 1.113 +  7.0),
        10.54 + 3.0 * cos(time * 1.233 +  3.0),
        11.49 + 4.0 * cos(time * 0.933 +  5.0));
    float2 s = centered; // fWarpScale=1, fWarpAnimSpeed=1
    float amount = 0.01605 * 0.0035 * step30;
    float wx = sin(time * 0.333 + s.x * factors.x - s.y * factors.w) +
               cos(time * 0.753 - s.x * factors.y + s.y * factors.z);
    float wy = cos(time * 0.375 - s.x * factors.z - s.y * factors.y) +
               sin(time * 0.825 + s.x * factors.x + s.y * factors.w);
    uv += amount * float2(wx, wy);
    uv += motion * step30;
    return 0.5 + (uv - 0.5) / aspect;
}
float2 MeshUV(float2 uvOriginal, float2 size, float2 motion,
              float zoom, float rot, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1.0, 0.0)) / grid;
    float2 c01 = (cell + float2(0.0, 1.0)) / grid;
    float2 c11 = (cell + 1.0) / grid;
    // Select the mesh triangle before running the expensive vertex warp.
    // This keeps the original vertices, barycentric weights and winding.
    bool lowerTriangle = f.x + f.y <= 1.0;
    float2 cornerA = lowerTriangle ? c00 : c10;
    float2 cornerB = lowerTriangle ? c10 : c01;
    float2 cornerC = lowerTriangle ? c01 : c11;
    float3 weight = lowerTriangle
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float2 a = WarpVertexUV(cornerA, size, motion, zoom, rot, step30);
    float2 b = WarpVertexUV(cornerB, size, motion, zoom, rot, step30);
    float2 c = WarpVertexUV(cornerC, size, motion, zoom, rot, step30);
    return weight.x * a + weight.y * b + weight.z * c;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    int2 pixel = int2(floor(p));
    float step30 = clamp(frameStep * 0.5, 0.0001, 2.0);

    // Guard against reading the previous preset's GPU history as state.
    bool initialized = all(abs(State(22) -
        float3(0.118, 0.831, 0.447)) < 0.012);
    float3 bands = float3(DecodePositive(State(0)),
                           DecodePositive(State(1)),
                           DecodePositive(State(2)));
    float mean = initialized ? DecodePositive(State(3)) : 0.0;
    float peak = initialized ? DecodePositive(State(4)) : 0.0;
    float age = initialized ? UnpackUnitFloat(State(5)) * 4.0 : 4.0;
    float z = initialized ? UnpackUnitFloat(State(6)) : 0.0;
    float r = initialized ? UnpackUnitFloat(State(7)) * 2.0 - 1.0 : 0.0;
    float dx = initialized ? UnpackUnitFloat(State(8)) * 2.0 - 1.0 : 0.0;
    float dy = initialized ? UnpackUnitFloat(State(9)) * 2.0 - 1.0 : 0.0;

    // per_frame beat detector. q11..q18/q23..q32 are computed in the .milk
    // but are never consumed by its enabled renderer and are therefore omitted.
    float beat = max(bands.x, max(bands.y, bands.z));
    float slowRetention = pow(0.99, step30);
    mean = mean * slowRetention + beat * (1.0 - slowRetention);
    age = min(4.0, age + step30 / 30.0);
    bool isBeat = beat > 0.5 + mean + peak && age > 0.2;
    peak = isBeat ? beat : peak * pow(0.9, step30);
    if (isBeat) {
        age = 0.0;
        dx = Hash11(time * 18.137 + 6.2) * 2.0 - 1.0;
        dy = Hash11(time * 16.791 + 20.3) * 2.0 - 1.0;
        r = Hash11(time * 14.219 + 3.8) * 2.0 - 1.0;
        z = Hash11(time * 12.527 + 42.8);
    }
    if (IsControl(pixel)) {
        // Source pass overwrites the audio inputs, but not this state.
        if (pixel.y == 0) {
            if (pixel.x < 3) return 0.0;
            if (pixel.x == 3) return float4(PackPositive(mean), 1.0);
            if (pixel.x == 4) return float4(PackPositive(peak), 1.0);
            if (pixel.x == 5) return float4(PackUnitFloat(age / 4.0), 1.0);
            if (pixel.x == 6) return float4(PackUnitFloat(z), 1.0);
            if (pixel.x == 7) return float4(PackUnitFloat((r + 1.0) * 0.5), 1.0);
            if (pixel.x == 8) return float4(PackUnitFloat((dx + 1.0) * 0.5), 1.0);
            if (pixel.x == 9) return float4(PackUnitFloat((dy + 1.0) * 0.5), 1.0);
            if (pixel.x == 22) return float4(0.118, 0.831, 0.447, 1.0);
            if (pixel.x >= 10 && pixel.x < 22) {
                int wave = (pixel.x - 10) / 3;
                int component = (pixel.x - 10) % 3;
                float rate, speed, gate;
                WaveParameters(wave, bands, rate, speed, gate);
                float3 next;
                float2 lower, upper;
                WalkWave(ReadWaveState(wave, initialized),
                         rate * step30, speed * step30, 512,
                         next, lower, upper);
                float value = component == 0 ? next.x :
                              component == 1 ? next.y : next.z / TWO_PI;
                return float4(PackUnitFloat(value), 1.0);
            }
            if (pixel.x >= 23 && pixel.x < 31) {
                int wave = (pixel.x - 23) / 2;
                bool maximum = (pixel.x - 23) % 2 != 0;
                float rate, speed, gate;
                WaveParameters(wave, bands, rate, speed, gate);
                float3 next;
                float2 lower, upper;
                // Bounding box must match the path stored in rows 1..16.
                WalkWave(ReadWaveState(wave, initialized),
                         rate, speed, 512, next, lower, upper);
                float2 bound = maximum ? upper : lower;
                return float4(bound.x, bound.y, gate, 1.0);
            }
            return 0.0;
        }
        int wave = (pixel.y - 1) / 4;
        int vertex = (((pixel.y - 1) % 4) * 32 + pixel.x) / 2;
        int component = pixel.x % 2;
        float rate, speed, gate;
        WaveParameters(wave, bands, rate, speed, gate);
        float3 next;
        float2 lower, upper;
        WalkWave(ReadWaveState(wave, initialized), rate, speed,
                 (vertex + 1) * 8, next, lower, upper);
        return float4(PackUnitFloat(component == 0 ? next.x : next.y), 1.0);
    }

    float zoom = 1.03 + z * 0.06;
    float rot = r * 0.06;
    float2 motion = float2(dx, -dy) * 0.01;
    float2 uvOriginal = input.texelSpacePos.xy;
    float2 uv = MeshUV(uvOriginal, size, motion, zoom, rot, step30);
    float2 d = 8.0 / size;
    // Keep one compiled copy of the sampling functions. Writing four Blur1
    // calls and three History/Blur3 pairs separately makes FXC inline each
    // complete manual-bilinear path, nearly doubling DXBC and cold compile.
    float2 blur1Uv[4] = {
        uv + float2(d.x, 0.0), uv - float2(d.x, 0.0),
        uv + float2(0.0, d.y), uv - float2(0.0, d.y)
    };
    float3 blur1Value[4];
    [fastopt]
    for (int sample = 0; sample < 4; ++sample)
        blur1Value[sample] = Blur1(blur1Uv[sample], size);
    float3 blurDx = blur1Value[0] - blur1Value[1];
    float3 blurDy = blur1Value[2] - blur1Value[3];
    float2 channelUv[3] = {
        lerp(uvOriginal, uv, 0.1) +
            float2(blurDx.x, blurDy.x) * 2.0 / size,
        lerp(uvOriginal, uv, 0.3) +
            float2(blurDx.y, blurDy.y) * 2.0 / size,
        lerp(uvOriginal, uv, 0.1) +
            float2(blurDx.z, blurDy.z) * 2.0 / size
    };
    float3 historySample[3];
    float3 blur3Sample[3];
    [fastopt]
    for (int channel = 0; channel < 3; ++channel) {
        historySample[channel] = HistoryWrap(channelUv[channel], size);
        blur3Sample[channel] = Blur3(channelUv[channel], size);
    }
    float3 color = float3(
        lerp(historySample[0].x, blur3Sample[0].x, 0.01),
        lerp(historySample[1].y, blur3Sample[1].y, 0.01),
        lerp(historySample[2].z, blur3Sample[2].z, 0.01));

    // sampler_noise_lq: random 256x256 bilinear-wrap noise. The actual
    // texture is unavailable to a stand-alone shader, so synthesize one.
    // Noise variance (sqrt(step30)) and negative drift (step30) are scaled
    // separately when evaluating the history faster than the 30-Hz source.
    float2 nUV = uvOriginal * size / 256.0 * 1.2 + RandomOffset(time);
    float3 noise = NoiseLq(nUV) - 0.5;
    color += -0.004 * step30 + noise * 0.1 * sqrt(step30);
    color = saturate(color + Waves(p, size, step30));
    return float4(color, 1.0);
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

bool IsControl(float2 uv, float2 size) {
    float2 pixel = uv * size;
    return pixel.x < 32.5 && pixel.y < 17.5;
}
float3 FrameClamp(float2 uv, float2 size) {
    uv = saturate(uv);
    [branch]
    if (IsControl(uv, size)) {
        // The feedback reserves 32x17 texels for wave/beat state. Neither
        // blurs nor the final composite may sample those RGB state values.
        // Reconstruct the small corner from the two adjacent visible edges.
        // The weights converge to the original image on either boundary,
        // avoiding the hard black rectangle without touching GPU history.
        const float2 edgePixel = float2(32.5, 17.5);
        float2 gap = edgePixel - uv * size;
        float3 right = Frame.SampleLevel(Filter,
            float2(edgePixel.x / size.x, uv.y), 0.0).rgb;
        float3 bottom = Frame.SampleLevel(Filter,
            float2(uv.x, edgePixel.y / size.y), 0.0).rgb;
        return lerp(bottom, right, gap.y / (gap.x + gap.y));
    }
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}
float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(0.974358974, 2.90625,
                                  4.774193548, 6.6);
    const float norm = 0.027322404;
    float2 aligned = uv + 1.0 / size;
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 o = float2(offsets[i] / size.x, 0.0);
        sum += (FrameClamp(aligned + o, size) +
                FrameClamp(aligned - o, size)) * weights[i];
    }
    return sum * norm;
}
float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(0.901408451, 2.487804878);
    const float norm = 0.027322404;
    float2 aligned = uv + float2(2.0 / size.x, 0.0);
    float3 sum = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 o = float2(0.0, offsets[i] * 2.0 / size.y);
        sum += (Blur1Horizontal(aligned + o, size) +
                Blur1Horizontal(aligned - o, size)) * weights[i];
    }
    return sum * norm;
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float2 d = 8.0 / size;
    float3 dx = Blur1(uv + float2(d.x, 0.0), size) -
                Blur1(uv - float2(d.x, 0.0), size);
    float3 dy = Blur1(uv + float2(0.0, d.y), size) -
                Blur1(uv - float2(0.0, d.y), size);
    float2 uvZ = uv - float2(dx.z, dy.z) * 0.2;
    float2 uvY = uv - float2(dx.y, dy.y) * 0.04;
    float emboss = (dy.y - dx.y) + 1.0 + (dy.z - dx.z) * 2.0;
    float3 result = lerp(float3(0.2, 0.0, 0.1),
                         float3(0.8, 0.6, 0.0), FrameClamp(uvZ, size).y);
    result *= emboss;
    result = lerp(result, float3(0.2, 0.0, 0.4),
                  Blur1(uvY, size).x * 1.4);
    result = lerp(result, float3(1.0, 0.9, 0.8),
                  FrameClamp(uv, size).z);
    // fGammaAdj=1.28 is the preset's output gamma. It affects display, not
    // the history already written by the feedback pass.
    result = pow(max(result, 0.0), 1.0 / 1.28);
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0146",
        sourceId: 5, // Vectorscope
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader
        }
    };
};
