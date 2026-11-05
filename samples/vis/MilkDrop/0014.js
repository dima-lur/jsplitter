// MilkDrop 0014 — rain on inverted London
//
// Original: original/0014.milk. The visible image is produced entirely by
// the PS4 composite shader; its black built-in wave and decaying warp buffer
// do not contribute visible RGB. The original composite samples
// stoy_london.jpg at coarse LODs. To keep this preset self-contained,
// this port embeds the corresponding 8x8
// mip-6..9 images and performs the original fractional-LOD interpolation.

// Loaded by Shader - MilkDrop.js; no panel callbacks or timers here.
MilkDropPresets["0014"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    // The source pass only transports bass_att. Broadcast the packed value:
    // D2D may place this intermediate image in a larger backing texture, so
    // physical texel (0,0) is not a reliable address for a private register.
    // London and its mip levels are evaluated directly in post.
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
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz *
        float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}

float4 main(VS_OUTPUT input) : SV_Target {
    float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
    return float4(PackPositive(bassAtt), 1.0);
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

float3 N13(float p) {
    float3 p3 = frac(float3(p, p, p) * float3(.1031, .11369, .13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return frac(float3((p3.x + p3.y) * p3.z,
                       (p3.x + p3.z) * p3.y,
                       (p3.y + p3.z) * p3.x));
}

float UnpackUnit(float3 packed) {
    return dot(packed, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float UnpackPositive(float3 packed) {
    float value = min(UnpackUnit(packed), .99999);
    return value / max(1.0 - value, .00001);
}

static const uint4 LONDON6[16] = {
    uint4(0x75685Au, 0xE0D3C5u, 0xF5F8F3u, 0xF7FAF5u), uint4(0xE0DAD0u, 0xB4AEA4u, 0xB7AEA1u, 0x91887Bu),
    uint4(0x917F6Bu, 0x92806Cu, 0xE4E2DAu, 0xF7F5EDu), uint4(0xD3CCBEu, 0xC6BFB1u, 0xA8A193u, 0x8A8375u),
    uint4(0x907C67u, 0x998570u, 0x9F9484u, 0xD2C7B7u), uint4(0xD9D3C2u, 0xC2BCABu, 0x9D9688u, 0x625B4Du),
    uint4(0x715B47u, 0x9B8571u, 0xA4937Bu, 0xAA9981u), uint4(0xAFA492u, 0x968B79u, 0x686159u, 0x3C352Du),
    uint4(0x372621u, 0x4D3C37u, 0x736053u, 0x867366u), uint4(0x69625Au, 0x5B544Cu, 0x463C35u, 0x352B24u),
    uint4(0x433328u, 0x5E4E43u, 0x8E8276u, 0xA5998Du), uint4(0x9F9689u, 0x8B8275u, 0x666259u, 0x49453Cu),
    uint4(0x332A1Fu, 0x786F64u, 0xA49C8Cu, 0xA8A090u), uint4(0xA39D8Bu, 0x9A9482u, 0x9A9483u, 0x837D6Cu),
    uint4(0x6C6356u, 0x847B6Eu, 0x978F7Fu, 0x9F9787u), uint4(0x989284u, 0x928C7Eu, 0x96917Fu, 0x918C7Au)
};

static const uint4 LONDON7[4] = {
    uint4(0x989185u, 0xF7F0E4u, 0xCCC5B7u, 0x9E9789u),
    uint4(0x8B7965u, 0xB2A08Cu, 0xB6AFA1u, 0x696254u),
    uint4(0x49392Eu, 0x8C7C71u, 0x7B746Au, 0x4C453Bu),
    uint4(0x675E51u, 0xA0978Au, 0x9A9483u, 0x928C7Bu)
};

static const uint4 LONDON8 =
    uint4(0xAFA598u, 0xA2988Bu, 0x74695Du, 0x7D7366u);
static const uint LONDON9 = 0x968A7Du;

float3 DecodeColor(uint packed) {
    return float3((packed >> 16) & 255u,
                  (packed >> 8) & 255u,
                  packed & 255u) / 255.0;
}

float3 London6Texel(int2 pixel) {
    pixel = clamp(pixel, int2(0, 0), int2(7, 7));
    int index = pixel.y * 8 + pixel.x;
    return DecodeColor(LONDON6[index >> 2][index & 3]);
}

float3 London6(float2 uv) {
    float2 texel = saturate(uv) * 8.0 - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(London6Texel(base),
                      London6Texel(base + int2(1, 0)), f.x);
    float3 bottom = lerp(London6Texel(base + int2(0, 1)),
                         London6Texel(base + int2(1, 1)), f.x);
    return lerp(top, bottom, f.y);
}

float3 London7Texel(int2 pixel) {
    pixel = clamp(pixel, int2(0, 0), int2(3, 3));
    int index = pixel.y * 4 + pixel.x;
    return DecodeColor(LONDON7[index >> 2][index & 3]);
}

float3 London7(float2 uv) {
    float2 texel = saturate(uv) * 4.0 - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(London7Texel(base),
                      London7Texel(base + int2(1, 0)), f.x);
    float3 bottom = lerp(London7Texel(base + int2(0, 1)),
                         London7Texel(base + int2(1, 1)), f.x);
    return lerp(top, bottom, f.y);
}

float3 London8Texel(int2 pixel) {
    pixel = clamp(pixel, int2(0, 0), int2(1, 1));
    return DecodeColor(LONDON8[pixel.y * 2 + pixel.x]);
}

float3 London8(float2 uv) {
    float2 texel = saturate(uv) * 2.0 - .5;
    int2 base = int2(floor(texel));
    float2 f = frac(texel);
    float3 top = lerp(London8Texel(base),
                      London8Texel(base + int2(1, 0)), f.x);
    float3 bottom = lerp(London8Texel(base + int2(0, 1)),
                         London8Texel(base + int2(1, 1)), f.x);
    return lerp(top, bottom, f.y);
}

float3 LondonLevel(float2 uv, int level) {
    float3 result = DecodeColor(LONDON9);
    if (level == 0) result = London6(uv);
    else if (level == 1) result = London7(uv);
    else if (level == 2) result = London8(uv);
    return result;
}

float N(float t) {
    return frac(sin(t * 12345.564) * 7658.76);
}

float Saw(float b, float t) {
    return smoothstep(0.0, b, t) * smoothstep(1.0, b, t);
}

float2 DropLayer2(float2 uv, float t) {
    float2 original = uv;
    uv.y += t * .75;
    const float2 aspect = float2(6.0, 1.0);
    float2 grid = aspect * 2.0;
    float2 id = floor(uv * grid);
    uv.y += N(id.x);
    id = floor(uv * grid);
    float3 n = N13(id.x * 35.2 + id.y * 2376.1);
    float2 st = frac(uv * grid) - float2(.5, 0.0);
    float x = n.x - .5;
    float y = original.y * 20.0;
    x += sin(y + sin(y)) * (.5 - abs(x)) * (n.z - .5);
    x *= .7;
    float phase = frac(t + n.z);
    y = (Saw(.85, phase) - .5) * .9 + .5;
    float dropDistance = length((st - float2(x, y)) * aspect.yx);
    float mainDrop = smoothstep(.4, 0.0, dropDistance);
    float r = sqrt(smoothstep(1.0, y, st.y));
    float columnDistance = abs(st.x - x);
    float trail = smoothstep(.23 * r, .15 * r * r, columnDistance);
    float trailFront = smoothstep(-.02, .02, st.y - y);
    trail *= trailFront * r * r;
    y = original.y;
    float trail2 = smoothstep(.2 * r, 0.0, columnDistance);
    float droplets = max(0.0, sin(y * (1.0 - y) * 120.0) - st.y) *
                     trail2 * trailFront * n.z;
    y = frac(y * 10.0) + (st.y - .5);
    droplets = smoothstep(.3, 0.0, length(st - float2(x, y)));
    return float2(mainDrop + droplets * r * trailFront, trail);
}

float StaticDrops(float2 uv, float t) {
    uv *= 40.0;
    float2 id = floor(uv);
    uv = frac(uv) - .5;
    float3 n = N13(id.x * 107.45 + id.y * 3543.654);
    float2 p = (n.xy - .5) * .7;
    float fade = Saw(.025, frac(t + n.z));
    return smoothstep(.3, 0.0, length(uv - p)) * frac(n.z * 10.0) * fade;
}

float2 Drops(float2 uv, float t) {
    float staticLayer = StaticDrops(uv, t) * 1.5;
    float2 layer1 = DropLayer2(uv, t);
    float2 layer2 = DropLayer2(uv * 1.85, t);
    float coverage = smoothstep(.3, 1.0,
        staticLayer + layer1.x + layer2.x);
    return float2(coverage, max(layer1.y * 1.5, layer2.y));
}

float3 LondonBlur(float2 uv, float focus) {
    // Select the adjacent embedded mip pair and reproduce the original
    // fractional LOD interpolation directly, without an intermediate atlas.
    float lod = clamp(focus, 6.0, 9.0);
    int lower = min((int)floor(lod - 6.0), 2);
    float fraction = lod - (6.0 + lower);
    return lerp(LondonLevel(uv, lower),
                LondonLevel(uv, lower + 1), fraction);
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float bassAtt = UnpackPositive(
        Frame.SampleLevel(Filter, input.texelSpacePos.xy, 0.0).rgb);

    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    // TEXEL_POS addresses the backing texture, whose occupied sub-rectangle
    // can change on resize. The procedural scene must use logical 0..1 UVs.
    float2 screenUv = input.sceneSpacePos.xy / size;
    float2 uv = (screenUv * 2.0 - 1.0) * aspect;
    uv.y = -uv.y;

    // story becomes one immediately in the original (smoothstep(0,0,T*2)).
    const float zoom = 1.1;
    uv *= zoom * .9;
    float2 imageUv = uv * .2;
    uv *= 1.5;
    float dropTime = time * .25;

    const float2 epsilon = float2(.001, 0.0);
    // Keep one compiled copy of the procedural rain stack. FXC otherwise
    // inlines StaticDrops and both DropLayer2 calls independently for the
    // centre, X-gradient and Y-gradient samples.
    float2 dropUvs[3] = {
        uv,
        uv + epsilon,
        uv + epsilon.yx
    };
    float2 dropSamples[3];
    [fastopt]
    for (int sampleIndex = 0; sampleIndex < 3; ++sampleIndex)
        dropSamples[sampleIndex] = Drops(dropUvs[sampleIndex], dropTime);

    float2 drops = dropSamples[0];
    float2 normal = float2(
        dropSamples[1].x - drops.x,
        dropSamples[2].x - drops.x);

    float minBlur = 7.0;
    float maxBlur = 6.5 + bassAtt / 3.0;
    float focus = lerp(maxBlur - drops.y, minBlur,
                       smoothstep(.1, .2, drops.x));
    float2 sampleUv = float2(
        imageUv.x * (2.5 + bassAtt) + .5,
        .5 - imageUv.y * 2.0) + normal;
    // The embedded mip texels came from the native image's coarse chain.
    // Its observed centre is one half mip-6 texel to the right when sampled
    // with the generic normalized convention; restore the native alignment.
    sampleUv.x += .5 / 8.0;
    float3 color = LondonBlur(sampleUv, focus);
    return float4(1.0 - color, 1.0);
}`;

    return {
        name: "0014",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            post: postShader
        }
    };
};
