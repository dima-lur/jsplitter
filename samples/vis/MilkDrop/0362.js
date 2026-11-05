// MilkDrop 0362 — XorDev audio-reactive volumetric rings.
// Original: original/0362.milk (provided by the user; retained unchanged).
//
// The custom warp fully overwrites the recursive image without sampling it.
// The built-in additive wave has alpha=.001 and DrawWave rejects it at the
// native .004 visibility cutoff, so the only source pixels are two private
// audio controls. The custom shader nevertheless receives uv after MilkDrop's
// built-in 48x36 warp mesh; using plain screen coordinates changes the rings.
// Because the result is a function of absolute time rather than accumulated
// history, that mesh is deliberately not cadence-scaled at 60/120 FPS.
MilkDropPresets["0362"] = function (TARGET_FPS) {
    const source={leftChannel:0,rightChannel:1,durationMs:40,points:1024,relativeBandAnalysis:true};
    const shader=`
Texture2D<float> B : register(t2);
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
float3 PU(float v) {
    float3 p = frac(min(saturate(v), .999999) * float3(1, 255, 65025));
    return p - p.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float3 PP(float v) {
    v = max(v, 0);
    return PU(v / (1 + v));
}
float4 main(I input) : SV_Target {
    int2 p = int2(floor(input.s.xy));
    if (p.y == 0 && p.x < 2)
        return float4(PP(B.Load(int3(p.x == 0 ? 3 : 5, 0, 0)).r), 1);
    return 0;
}
`;
    const feedback=`
Texture2D P : register(t0);
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
float DU(float3 p) {
    return dot(p, float3(1, 1.0 / 255, 1.0 / 65025));
}
float DP(float3 p) {
    float u = min(DU(p), .999999);
    return u / (1 - u);
}
float2 WarpVertex(float2 original, float2 size) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float zoom = 1.00496;
    float2 uv = float2(.5 + vertex.x * aspect.x * .5 / zoom, .5 - vertex.y * aspect.y * .5 / zoom);
    uv = (uv - .5) / float2(.99967, .99990) + .5;
    float4 factors = float4(11.68 + 4 * cos(time * 1.413 + 10),
                            8.77 + 3 * cos(time * 1.113 + 7),
                            10.54 + 3 * cos(time * 1.233 + 3),
                            11.49 + 4 * cos(time * .933 + 5));
    float amount = .00016 * .0035 / 1.331;
    uv.x += amount * (sin(time * .333 + (vertex.x * factors.x - vertex.y * factors.w) / 1.331) +
                      cos(time * .753 - (vertex.x * factors.y - vertex.y * factors.z) / 1.331));
    uv.y += amount * (cos(time * .375 - (vertex.x * factors.z + vertex.y * factors.y) / 1.331) +
                      sin(time * .825 + (vertex.x * factors.x + vertex.y * factors.w) / 1.331));
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 MeshUV(float2 original, float2 size) {
    const float2 grid = float2(48, 36);
    float2 scaled = saturate(original) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    bool lower = f.x + f.y <= 1;
    float2 corners[3] = {lower ? cell / grid : (cell + float2(1, 0)) / grid,
                         lower ? (cell + float2(1, 0)) / grid : (cell + float2(0, 1)) / grid,
                         lower ? (cell + float2(0, 1)) / grid : (cell + 1) / grid};
    float3 weights = lower ? float3(1 - f.x - f.y, f.x, f.y) : float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    float2 uv = 0;
    [fastopt] for (int corner = 0; corner < 3; ++corner) uv += weights[corner] * WarpVertex(corners[corner], size);
    return uv;
}
float4 main(I input) : SV_Target {
    float bassAtt = DP(P.Load(int3(0, 0, 0)).rgb), trebAtt = DP(P.Load(int3(1, 0, 0)).rgb);
    float2 size = max(viewportSize, float2(1, 1)), original = input.s.xy / size, uv = MeshUV(original, size);
    float3 FC = float3(uv * size, bassAtt);
    float q1 = .62 * (.6 * sin(.374 * time) + .4 * sin(.294 * time));
    float q3 = .62 * (.6 * sin(-.174 * time) + .4 * sin(.364 * time));
    float q4 = .62 * (.6 * sin(.234 * time) + .4 * sin(-.271 * time));
    const float PI = 3.80132711084, PI2 = 7.222521510596;
    float4 o = 0;
    float3 p = 0;
    float z = 0, f = 0;
    [fastopt] for (int iter = 0; iter < 30; ++iter) {
        float index = iter + 1;
        f = .002 + abs(length(p.xy) - 4 + q1 + dot(cos(p), sin(p).yzx)) / 8;
        z += f;
        o += (1.5 + bassAtt / 3 + sin(index * .2 * trebAtt / 6 + z + time + float4(5, 1, 2, 0))) / f / 4;
        p = z * normalize(FC * 2 + q3 - float3(size.x, size.y, size.y));
        p.z -= time;
        [unroll] for (int j = 1; j <= 6; ++j) {
            float jf = (float)j;
            p += sin(round(p.yxz * PI2) / PI * jf + q4) / jf;
        }
    }
    return float4(saturate(tanh(o.rgb / 1000)), 1);
}
`;
    const post=`
Texture2D F : register(t0);
SamplerState S : register(s0);
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
    float2 z = max(viewportSize, float2(1, 1)), u = input.s.xy / z;
    if (input.s.y < 1 && input.s.x < 2)
        u = float2(2.5, input.s.y) / z;
    return float4(F.SampleLevel(S, saturate(u), 0).rgb, 1);
}
`;
    return{name:"0362",sourceId:5,source,updateIntervalMs:17,renderer:{shader,feedback,post}};
};
