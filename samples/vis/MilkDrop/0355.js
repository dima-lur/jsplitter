// MilkDrop 0355 — XorDev's procedural folded plasma, audio-coloured by bass_att.
// Original: original/0355.milk, read in full before translation.
// The composite assigns every output channel and never samples sampler_main;
// consequently the native mode-7 wave and decayed feedback are not visible.
// A private source pixel carries the current analyzer value into the post pass.
MilkDropPresets["0355"] = function (TARGET_FPS) {
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
    if (all(p == 0))
        return float4(PackPositive(Bands.Load(int3(3, 0, 0)).r), 1);
    return 0;
}
`;
    const feedback=`
Texture2D Previous : register(t0);
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
float4 main(I input) : SV_Target {
    float step30 = max(frameStep * .5, .0001);
    float3 c = Previous.SampleLevel(Filter, input.t.xy, 0).rgb * pow(.94, step30);
    return float4(c, 1);
}
`;
    const post=`
Texture2D Frame : register(t0);
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
float4 main(I input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.s.xy / size;
    float bassAtt = DecodePositive(Frame.Load(int3(0, 0, 0)).rgb);
    float aspect = size.x / size.y;
    float2 p = (uv - .5) * 1.8 * float2(aspect, 1);
    float2 d = float2(-1, 1);
    float2 q = 5 * p - d;
    float den = .5 + 5 / max(dot(q, q), 1e-6);
    float2 c = mul(p, float2x2(1, 1, d.x / den, d.y / den));
    float2 v = c;
    float a = log(max(length(v), 1e-6)) + time * .5;
    v = mul(v, float2x2(cos(a), cos(a + 33), cos(a + 11), cos(a))) * 5;
    float4 o = 0;
    [unroll] for (float index = 1; index < 9; index += 1) {
        o += sin(float4(v.x, v.y, v.y, v.x)) + 1;
        v += .9 * sin(float2(v.y, v.x) * index + time) / index + .5;
    }
    float ridge = .1 + .1 * pow(length(sin(v / .3) * .2 + c * float2(1, 2)) - 1, 2);
    float4 exponent = c.x * float4(.6, -.4 + bassAtt, 1.4, 0);
    float4 result = 1 - exp(-exp(exponent) / max(o, 1e-5) / ridge / (1 + bassAtt * 5 * exp(.3 * c.y - dot(c, c))) /
                            (.03 + abs(length(p) - .7)) * .2);
    return float4(saturate(result.rgb), 1);
}
`;
    return{name:"0355",sourceId:5,source,updateIntervalMs:17,renderer:{shader,feedback,post}};
};
