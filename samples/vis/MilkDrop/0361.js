// MilkDrop 0361 — XorDev volumetric sine lattice with a red solarized composite.
// Original: original/0361.milk, read in full before translation.
// The native wave is below the .004 visibility cutoff. The warp overwrites
// every colour with its 50x7-iteration procedural raymarch, so feedback image
// decay is irrelevant. Two private pixels retain the preset's smoothed q2/mid
// state; the public image is otherwise the direct procedural result.
MilkDropPresets["0361"] = function (TARGET_FPS) {
    const source={leftChannel:0,rightChannel:1,durationMs:40,points:1024,relativeBandAnalysis:true};
    const shader=`
Texture2D<float> Bands : register(t2);
cbuffer C : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
    float frameStep;
};
struct I {
    float4 p : SV_POSITION;
    float4 s : SCENE_POS;
};
float3 PackUnit(float v) {
    float3 p = frac(min(saturate(v), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float3 PackPositive(float v) {
    v = max(v, 0);
    return PackUnit(v / (1 + v));
}
float4 main(I input) : SV_Target {
    int2 p = int2(floor(input.s.xy));
    if (p.x == 1 && p.y == 0)
        return float4(PackPositive(Bands.Load(int3(1, 0, 0)).r), 1);
    return 0;
}
`;
    const feedback=`
Texture2D Previous : register(t0);
cbuffer C : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct I {
    float4 p : SV_POSITION;
    float4 s : SCENE_POS;
    float4 t : TEXEL_POS;
};
float DecodeUnit(float3 p) {
    return dot(p, float3(1, 1.0 / 255, 1.0 / 65025));
}
float DecodePositive(float3 p) {
    float u = min(DecodeUnit(p), .999999);
    return u / (1 - u);
}
float3 PackUnit(float v) {
    float3 p = frac(min(saturate(v), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float3 PackPositive(float v) {
    v = max(v, 0);
    return PackUnit(v / (1 + v));
}
float4 main(I input) : SV_Target {
    int2 pixel = int2(floor(input.s.xy));
    float step30 = max(frameStep * .5, .0001);
    float oldQ = DecodePositive(Previous.Load(int3(0, 0, 0)).rgb),
          mid = DecodePositive(Previous.Load(int3(1, 0, 0)).rgb);
    float keep = pow(.92, step30);
    float q2 = oldQ * keep + mid * (1 - keep);
    if (all(pixel == 0))
        return float4(PackPositive(q2), 1);
    float2 size = max(viewportSize, float2(1, 1)), frag = input.s.xy;
    float3 FC = float3(frag, .7), p = 0;
    float z = 0, f = 0;
    float3 outColor = 0;
    [fastopt] for (int iter = 0; iter < 50; ++iter) {
        f = .0052 + .08 * abs(length(p) - 5.7);
        z += f;
        outColor += (p / z + q2) / f;
        p = z * (FC * 2 - float3(size.x, size.y, size.y)) / size.y;
        p.z += 9;
        [unroll] for (int j = 1; j <= 7; ++j) {
            float jf = (float)j;
            p += sin(round(p.zxy / .02) * .02 * jf - time) / jf;
        }
    }
    outColor = tanh(outColor / 2420);
    return float4(saturate(outColor), 1);
}
`;
    const post=`
Texture2D Frame : register(t0);
SamplerState Filter : register(s0);
cbuffer C : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct I {
    float4 p : SV_POSITION;
    float4 s : SCENE_POS;
    float4 t : TEXEL_POS;
};
float3 H(float2 u) {
    return Frame.SampleLevel(Filter, saturate(u), 0).rgb;
}
float3 Blur1(float2 u, float2 z) {
    float2 o[12] = {float2(2, 0),
                    float2(-2, 0),
                    float2(0, 2),
                    float2(0, -2),
                    float2(4, 4),
                    float2(-4, 4),
                    float2(4, -4),
                    float2(-4, -4),
                    float2(7, 0),
                    float2(-7, 0),
                    float2(0, 7),
                    float2(0, -7)};
    float3 x = H(u) * 4;
    [fastopt] for (int i = 0; i < 12; ++i) x += H(u + o[i] / z) * (i < 4 ? 2 : 1);
    float edge = min(min(u.x, u.y), 1 - max(u.x, u.y));
    return x / 20 * (.75 + .25 * saturate(sqrt(max(edge, 0)) * 5));
}
float4 main(I input) : SV_Target {
    float2 z = max(viewportSize, float2(1, 1)), u = 1 - input.s.xy / z;
    u = .5 + (u - .5) * .88;
    float3 sharp = H(u), blur = Blur1(u, z);
    float3 r = lerp(sharp.y * float3(.6, 0, 0), lerp(1, float3(1, 0, 0), blur.y), sharp.x * .6);
    r = r * (1 - r) * 4;
    r = 1 - r;
    return float4(saturate(r), 1);
}
`;
    return{name:"0361",sourceId:5,source,updateIntervalMs:17,renderer:{shader,feedback,post}};
};
