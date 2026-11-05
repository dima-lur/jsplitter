// MilkDrop 0011 — audio-driven fractal raymarch tunnel
//
// Original: original/0011.milk. The visible image is generated entirely by
// its PS4 warp shader; the preset has no custom waves or shapes. Its built-in
// mode-15 wave is effectively invisible (black RGB and alpha .001).
//
// q1 is the only persistent per-frame value read by the raymarch. The source
// writes the modern relative audio bands into a hidden control row, feedback
// advances q1 and renders the scene, and post applies the original ret *= 2.
// Audio therefore reaches the procedural image one history step later than in
// native MilkDrop, which is the unavoidable limit of the shared pipeline.

// Loaded by Shader - MilkDrop.js; no panel callbacks or timers here.
MilkDropPresets["0011"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    // The native wave is invisible. Use the source pass only to deliver the
    // six current relative bands to feedback through pixels 0..5.
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
    float3 packed = frac(min(saturate(value), 0.999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 6) {
        float band = max(RelativeBands.Load(int3(pixel.x, 0, 0)).r, 0.0);
        return float4(PackPositive(band), 1.0);
    }
    return float4(0.0, 0.0, 0.0, 0.0);
}`;

    const feedbackShader = `
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

static const float3 STATE_MAGIC = float3(0.1725, 0.5333, 0.9137);

float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), 0.999999) *
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
    float value = min(UnpackUnit(packed), 0.99999);
    return value / max(1.0 - value, 0.00001);
}

float4 State(int pixel) {
    return Previous.Load(int3(pixel, 0, 0));
}

float Audio(int band) {
    return UnpackPositive(State(band).rgb);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size,
                    float zoom, float warpTime) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);
    float2 uv = 0.5 + (uvOriginal - 0.5) / max(zoom, 0.0001);

    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    const float scaleInverse = 1.0 / 1.331;
    float uDelta = sin(warpTime * 0.333 + scaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - scaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - scaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + scaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += 0.009 * 0.0035 * float2(
        uDelta / max(aspect.x, 0.0001),
        vDelta / max(aspect.y, 0.0001));
    return uv;
}

float2 MeshUV(float2 uvOriginal, float2 size,
              float zoom, float warpTime) {
    // MilkDrop calculates built-in motion at 48x36 mesh vertices and
    // interpolates it over the same alternating triangle diagonals.
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    float2 result = 0.0;
    if (f.x + f.y <= 1.0) {
        float2 a = WarpVertexUV(corner00, size, zoom, warpTime);
        float2 b = WarpVertexUV(corner10, size, zoom, warpTime);
        float2 c = WarpVertexUV(corner01, size, zoom, warpTime);
        result = (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    } else {
        float2 a = WarpVertexUV(corner10, size, zoom, warpTime);
        float2 b = WarpVertexUV(corner01, size, zoom, warpTime);
        float2 c = WarpVertexUV(corner11, size, zoom, warpTime);
        result = (1.0 - f.y) * a + (1.0 - f.x) * b +
                 (f.x + f.y - 1.0) * c;
    }
    return result;
}

float Noise2(float2 p) {
    return sin(p.x * 3.0 + sin(p.y * 2.7)) *
           cos(p.y * 1.1 + cos(p.x * 2.3));
}

float Fractal(float3 p) {
    float value = 0.0;
    float amplitude = 1.0;
    [loop]
    for (int octave = 0; octave < 7; ++octave) {
        value += Noise2(p.xy + p.z * 0.5) * amplitude;
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float step30 = max(frameStep * 0.5, 0.0001);
    bool initialized = all(abs(State(15).rgb - STATE_MAGIC) <
                           float3(0.012, 0.012, 0.012));

    float bass = Audio(0);
    float mid = Audio(1);
    float treb = Audio(2);
    float bassAtt = Audio(3);
    float volume = (bass + mid + treb) * 0.25;
    float q1 = (initialized ? UnpackPositive(State(6).rgb) : 0.0) +
               volume * 0.01 * step30;

    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 16) {
        if (pixel.x < 6) return float4(0.0, 0.0, 0.0, 0.0);
        if (pixel.x == 6) return float4(PackPositive(q1), 1.0);
        if (pixel.x == 15) return float4(STATE_MAGIC, 1.0);
        return float4(0.0, 0.0, 0.0, 0.0);
    }

    float zoom = 0.9995 + 0.015 * volume;
    float2 uvOriginal = input.texelSpacePos.xy;
    float2 uv = MeshUV(uvOriginal, size, zoom, time);
    uv = (uv - 0.5) * float2(size.x / size.y, 1.0);

    float3 ray = normalize(float3(uv.x, uv.y, 1.0));
    float3 accumulated = 0.0;
    float distanceAlongRay = 0.0;
    float distanceToSurface = 0.0;
    float noiseValue = 0.0;

    [loop]
    for (int march = 0; march < 50; ++march) {
        float3 p = distanceAlongRay * ray;
        p.z += time;

        float sineAngle;
        float cosineAngle;
        sincos(p.z, sineAngle, cosineAngle);
        p.xy = mul(p.xy, float2x2(
            cosineAngle, -sineAngle,
            sineAngle,  cosineAngle));

        noiseValue = Fractal(p + q1 * 0.5 + time * 0.1);
        distanceToSurface = length(p.xy) - 1.0 + noiseValue * 0.3;
        // q6 is never assigned by the preset and therefore remains zero.
        p.z = fmod(p.z, 5.0) - 3.0;
        distanceToSurface = abs(distanceToSurface) + 0.01;

        float3 color = float3(0.1, 0.3, 0.8) /
            (length(p.xy + noiseValue + bassAtt) * 0.8);
        color += float3(0.8, 0.4, 0.2) /
            (length(p.xz + noiseValue) * 0.5);
        color += float3(1.0, 1.0, 2.0) *
            (0.5 + 0.5 * sin(noiseValue + time));

        accumulated += color / distanceToSurface * 0.12;
        distanceAlongRay += distanceToSurface * 0.6;
    }

    return float4(tanh(accumulated * 0.001), 1.0);
}`;

    const postShader = `
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

float4 main(PSInput input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 0 && pixel.x < 16)
        return float4(0.0, 0.0, 0.0, 1.0);
    float3 color = Frame.SampleLevel(Filter, input.texelSpacePos.xy, 0.0).rgb;
    return float4(saturate(color * 2.0), 1.0);
}`;

    return {
        name: "0011",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: feedbackShader,
            post: postShader
        }
    };
};
