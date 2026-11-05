// MilkDrop 0314 — four dotted articulated spirals
//
// Ported from vis/milkdrop/0314.milk and the corresponding foo_vis_milk2
// rendering paths. The preset draws one additive six-sided hand marker,
// followed by four normal-blended 512-point custom waves. Their point pairs
// alternate across four differently sized articulated ribbons.
//
// q1 is the preset's audio-driven mtime accumulator. Two private history
// pixels carry its increment and wrapped phase; two more carry bass and
// bass_att for the warp shader. All four pixels are hidden from feedback and
// from the final image.
//
// The original equations scale mtime by 75/fps. Accumulation, source-over
// opacity and recursive .83 decay are normalized to 30 Hz so TARGET_FPS can
// select a smoother feedback cadence without changing their time constants.
// The original warp's uv_orig-based displacement and interpolated mesh
// rad/ang are reproduced inside feedback without an engine-specific pass.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0314"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

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
    value = frac(max(value, 0.0));
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    float unit = value / (1.0 + value);
    float3 encoded = frac(unit * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 p = input.sceneSpacePos.xy;
    if (p.y < 1.0 && p.x < 4.0) {
        float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
        float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);

        if (p.x < 1.0) {
            float midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0.0);
            float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);
            float volume = (bassAtt + midAtt + trebAtt) * 0.20;

            // per_frame: vol*=vol; mtime+=vol*.1*(75/fps); q1=mtime*.4.
            // At the preset's 30-Hz cadence this is q1 += volume^2*.1.
            const float TWO_PI = 6.28318530718;
            float phaseIncrement = volume * volume * 0.1 / TWO_PI;
            return float4(PackUnitFloat(phaseIncrement), 1.0);
        }
        if (p.x < 2.0)
            return float4(PackPositive(bass), 1.0);
        if (p.x < 3.0)
            return float4(PackPositive(bassAtt), 1.0);

        // Pixel 3 is transparent so the accumulated phase survives the
        // source pass and can be replaced by feedback below.
        return float4(0.0, 0.0, 0.0, 0.0);
    }

    return float4(0.0, 0.0, 0.0, 0.0);
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

static const float PI = 3.14159265359;
static const float TWO_PI = 6.28318530718;

float3 PackUnitFloat(float value) {
    value = frac(max(value, 0.0));
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float DecodePositive(float3 encoded) {
    float unit = min(UnpackUnitFloat(encoded), 0.99999);
    return unit / max(1.0 - unit, 0.00001);
}

int WrapIndex(int value, int size) {
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    if (pixel.y == 0 && pixel.x < 4) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float3 HistoryWrap(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
                      HistoryTexel(base + int2(1, 0), dimensions),
                      fraction.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
                         HistoryTexel(base + int2(1, 1), dimensions),
                         fraction.x);
    return lerp(top, bottom, fraction.y);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);

    float zoom = pow(1.002, step30);
    float2 uv = 0.5 + (uvOriginal - 0.5) / zoom;

    float warpTime = time * 0.037;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    float amount = 0.033 * 0.0035 * step30;
    const float scaleInverse = 1.0 / 0.015;
    float uDelta = sin(warpTime * 0.333 + scaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - scaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - scaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + scaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += amount * float2(uDelta / aspect.x, vDelta / aspect.y);
    return uv;
}

// MilkDrop supplies rad/ang as mesh-vertex attributes. The warp vertex
// shader in foo_vis_milk2 0.10.0 interpolates these attributes over the
// same triangles as the warped UVs; calculating atan2 per screen pixel
// introduces a different distortion field in this preset.
float2 PolarAtVertex(float2 uv, float2 aspect) {
    // MilkDrop's mesh vertices use an upward Y axis, while uv is Y-down.
    float2 vertex = float2(2.0 * uv.x - 1.0,
                            1.0 - 2.0 * uv.y) * aspect;
    float rad = length(vertex);
    float ang = rad < 1e-6 ? 0.0 : atan2(vertex.y, vertex.x);
    return float2(rad, ang);
}

float4 MeshVertex(float2 uv, float2 size, float step30,
                  float2 aspect) {
    return float4(WarpVertexUV(uv, size, step30),
                  PolarAtVertex(uv, aspect));
}

float4 MeshData(float2 uvOriginal, float2 size, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));

    // Use the same indexed triangle, but only three MeshVertex call sites.
    bool lowerTriangle = f.x + f.y <= 1.0;
    float2 cornerA = lowerTriangle ? corner00 : corner10;
    float2 cornerB = lowerTriangle ? corner10 : corner01;
    float2 cornerC = lowerTriangle ? corner01 : corner11;
    float3 weight = lowerTriangle
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float4 a = MeshVertex(cornerA, size, step30, aspect);
    float4 b = MeshVertex(cornerB, size, step30, aspect);
    float4 c = MeshVertex(cornerC, size, step30, aspect);
    return weight.x * a + weight.y * b + weight.z * c;
}
float2 ProjectPoint(float sourceY, float tm, float spinAngle) {
    float sineAngle;
    float cosineAngle;
    sincos(spinAngle, sineAngle, cosineAngle);
    float x = sourceY * cosineAngle;
    float y = -sourceY * sineAngle + 0.2 + 0.1 * sin(tm);
    float z = 0.0;

    // Wrist rotation.
    float angle = sin(tm * 2.0);
    sincos(angle, sineAngle, cosineAngle);
    float nextX = x;
    float nextY = y * sineAngle + z * cosineAngle;
    float nextZ = y * cosineAngle - z * sineAngle;

    // Rotation around the forearm.
    angle = tm * 8.0;
    sincos(angle, sineAngle, cosineAngle);
    x = nextX * sineAngle + nextY * cosineAngle;
    y = nextX * cosineAngle - nextY * sineAngle;
    z = nextZ - 0.3;

    // Forearm bend.
    angle = PI + sin(tm * 2.0 - 0.5) * 2.5;
    sincos(angle, sineAngle, cosineAngle);
    nextX = x;
    nextY = y * sineAngle + z * cosineAngle;
    nextZ = y * cosineAngle - z * sineAngle;

    // The preset assigns another angle here but does not recompute sa/ca;
    // foo_vis_milk2 therefore applies the forearm sine/cosine a second time.
    x = nextX * sineAngle + nextY * cosineAngle;
    y = nextX * cosineAngle - nextY * sineAngle;
    z = nextZ - 0.35;

    // Upper arm outward.
    angle = cos(tm) * 1.75 - 1.05;
    sincos(angle, sineAngle, cosineAngle);
    nextX = x * sineAngle + z * cosineAngle;
    nextY = y;
    nextZ = x * cosineAngle - z * sineAngle;

    // Upper arm up/down and perspective projection.
    angle = cos(tm);
    sincos(angle, sineAngle, cosineAngle);
    x = nextX;
    y = nextY * cosineAngle - nextZ * sineAngle;
    z = nextY * sineAngle + nextZ * cosineAngle + 1.5;
    return float2(x / z + 0.5, y / z * 1.3 + 0.5);
}

float2 WavePoint(float sample, bool highPoint, float q1,
                 float phaseOffset, float spinRate,
                 float jitter, float spread) {
    float tm = q1 - sample * 0.8 + phaseOffset;
    float sourceY = (highPoint ? 0.5 : -0.5) * spread * sample;
    float spinAngle = tm * spinRate +
        sin(tm * 76.0 + time * 4.0) * jitter;
    return ProjectPoint(sourceY, tm, spinAngle);
}

float2 ToPixels(float2 position, float2 size) {
    float squareSize = max(size.x, size.y);
    // foo_vis_milk2 maps custom-wave y with y*-2+1; in its 2D vertex
    // convention the top is Y=-1, so preset-space y is inverted here.
    return 0.5 * size +
           float2(position.x - 0.5, 0.5 - position.y) * squareSize;
}

float DotLayerTransmittance(float2 p, float2 size, float q1,
                            float phaseOffset, float spinRate,
                            float jitter, float spread) {
    // The source has 256 alternating point pairs. Keeping 128 pairs preserves
    // the full parameter interval and the A/B separation while remaining
    // practical in a fullscreen pixel shader.
    const int pairs = 128;
    float halfSize = size.x >= 1024.0 ? 1.5 : 1.0;
    float transmittance = 1.0;

    // Preserve the 256-pair point loop but skip FXC O3's expensive
    // speculative loop optimisation.
    [fastopt]
    for (int pair = 0; pair < pairs; ++pair) {
        float sampleA = (float)pair / (float)(pairs - 1);
        float sampleB = min(sampleA + 1.0 / 511.0, 1.0);
        float2 pointA = ToPixels(WavePoint(sampleA, true, q1,
            phaseOffset, spinRate, jitter, spread), size);
        float2 pointB = ToPixels(WavePoint(sampleB, false, q1,
            phaseOffset, spinRate, jitter, spread), size);
        float coverageA = all(abs(p - pointA) <= halfSize) ? 1.0 : 0.0;
        float coverageB = all(abs(p - pointB) <= halfSize) ? 1.0 : 0.0;
        transmittance *= 1.0 - coverageA * (1.0 - sampleA);
        transmittance *= 1.0 - coverageB * (1.0 - sampleB);
    }

    return transmittance;
}

float Cross2(float2 a, float2 b) {
    return a.x * b.y - a.y * b.x;
}

bool TriangleWeights(float2 p, float2 a, float2 b, float2 c,
                     out float3 weights) {
    float denominator = Cross2(b - a, c - a);
    if (abs(denominator) < 1e-5) {
        weights = 0.0;
        return false;
    }
    weights.y = Cross2(p - a, c - a) / denominator;
    weights.z = Cross2(b - a, p - a) / denominator;
    weights.x = 1.0 - weights.y - weights.z;
    return all(weights >= -0.0001);
}

float3 HandMarker(float2 p, float2 size, float q1) {
    float2 centerUv = ProjectPoint(0.0, q1,
        q1 * 20.0 + sin(q1 * 76.0 + time * 4.0) * 0.4);
    // Custom shapes do not receive the custom-wave inverse-aspect scale.
    float2 center = float2(centerUv.x, 1.0 - centerUv.y) * size;
    float geometryAngle = cos(q1) + PI * 0.25;
    float aspectY = size.x > size.y ? size.y / size.x : 1.0;
    const float radius = 0.04556;

    [unroll]
    for (int side = 0; side < 6; ++side) {
        float a0 = (float)side / 6.0 * TWO_PI + geometryAngle;
        float a1 = (float)(side + 1) / 6.0 * TWO_PI + geometryAngle;
        float2 vertex0 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a0), -size.y * sin(a0));
        float2 vertex1 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a1), -size.y * sin(a1));
        float3 weights;
        if (TriangleWeights(p, center, vertex0, vertex1, weights)) {
            // RGB and alpha both fade from the center to zero at the rim;
            // additive blending therefore produces weight^2.
            return float3(1.0, 0.7, 0.3) * 0.7 *
                   weights.x * weights.x;
        }
    }
    return 0.0;
}

// Recover sub-code decay in UNORM8 history at arbitrary frame rates.
// Thresholds are in the post-decay value space. Preserve the quantization
// floor of the native 30-Hz operation; correct only the additional stall band.
float3 DitherDecay(float3 value, float retention, float subtraction,
                   float nativeRetention, float nativeSubtraction, float2 pixel) {
    if (frameStep >= 2.0) return value;
    const float halfCode = .5 / 255.0;
    float loss = max(1.0-retention,0.0);
    float nativeLoss = max(1.0-nativeRetention,0.0);
    float ceiling = loss > 1e-7
        ? max(0.0,(halfCode*retention-subtraction)/max(loss,1e-7))
        : (subtraction < halfCode ? 1.0 : 0.0);
    float nativeFloor = nativeLoss > 1e-7
        ? max(0.0,(halfCode*nativeRetention-nativeSubtraction)/max(nativeLoss,1e-7))
        : (nativeSubtraction < halfCode ? 1.0 : 0.0);
    if (ceiling <= nativeFloor) return value;
    float3 aboveNative = nativeFloor > 0
        ? smoothstep(nativeFloor,nativeFloor+1.0/255.0,value) : 1.0;
    float3 vulnerable = aboveNative * (1.0-smoothstep(
        ceiling,ceiling+max(ceiling*.35,1.0/255.0),value));
    float tick = floor(time*(60.0/max(frameStep,.001)));
    float3 noise = frac(sin(float3(
        dot(floor(pixel),float2(12.9898,78.233))+tick*19.193,
        dot(floor(pixel),float2(39.346,11.135))+tick*47.853,
        dot(floor(pixel),float2(73.156,52.235))+tick*83.155))*43758.5453);
    return value+(noise-.5)*vulnerable/255.0;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 uvOriginal = p / size;
    float2 baseUv = input.texelSpacePos.xy;
    float step30 = max(frameStep * 0.5, 0.0005);

    float phaseIncrement = UnpackUnitFloat(
        Previous.Load(int3(0, 0, 0)).rgb);
    float bass = DecodePositive(Previous.Load(int3(1, 0, 0)).rgb);
    float bassAtt = DecodePositive(Previous.Load(int3(2, 0, 0)).rgb);
    float previousPhase = UnpackUnitFloat(
        Previous.Load(int3(3, 0, 0)).rgb);
    float phase = frac(previousPhase + phaseIncrement * step30);
    float q1 = phase * TWO_PI;

    if (p.y < 1.0 && p.x < 4.0) {
        if (p.x < 3.0)
            return float4(0.0, 0.0, 0.0, 0.0);
        return float4(PackUnitFloat(phase), 1.0);
    }

    // Built-in 48x36 motion mesh, followed by warp_1..20. The audio gate
    // affects only the mesh transform; radial and tangential offsets remain.
    float4 meshData = MeshData(uvOriginal, size, step30);
    float2 meshUv = meshData.xy;
    float gate = saturate((bass / max(bassAtt, 1e-6) - 0.9) * 13.0);
    float2 gatedUv = lerp(uvOriginal, meshUv, gate * 0.5);
    float2 uv = baseUv + (gatedUv - uvOriginal);

    // warp_6/7: v1 = normalize(uv_orig - .5);
    //           v2 = v1.yx * float2(1, -1).
    // uv_orig has a downward Y axis; only the mesh's rad/ang use Y-up.
    float2 radialDirection = normalize(uvOriginal - 0.5 +
        float2(1e-8, 0.0));
    float2 tangentialDirection = radialDirection.yx * float2(1.0, -1.0);
    float radius = meshData.z;
    float angle = meshData.w;
    uv += radialDirection *
        (cos(radius * 30.0 - time * 7.0) * 5.0 * step30) / size;
    uv += tangentialDirection *
        (cos(angle * 30.0 - time * 7.0) * 5.0 * step30) / size;

    float3 result = HistoryWrap(uv, size);
    float decay = pow(0.83, step30);
    result = result * decay - (0.004 * 0.83 / 0.17) * (1.0 - decay);
    result=DitherDecay(result,decay,(.004*.83/.17)*(1.0-decay),.83,.004*.83,input.sceneSpacePos.xy);
    result = saturate(result);

    // foo_vis_milk2 draw order: custom shape, then waves 0, 1, 2 and 3.
    result = saturate(result + HandMarker(p, size, q1) * step30);

    float transmittance = DotLayerTransmittance(p, size, q1,
        0.0, 20.0, 0.4, 0.1);
    transmittance = pow(saturate(transmittance), step30);
    result = float3(1.0, 1.0, 0.7) * (1.0 - transmittance) +
             result * transmittance;

    transmittance = DotLayerTransmittance(p, size, q1,
        -0.01, -29.0, 0.4, 0.2);
    transmittance = pow(saturate(transmittance), step30);
    result = float3(1.0, 0.9, 0.8) * (1.0 - transmittance) +
             result * transmittance;

    transmittance = DotLayerTransmittance(p, size, q1,
        -0.02, 23.0, 0.3, 0.4);
    transmittance = pow(saturate(transmittance), step30);
    result = float3(1.0, 0.72, 0.1) * (1.0 - transmittance) +
             result * transmittance;

    transmittance = DotLayerTransmittance(p, size, q1,
        -0.03, -4.0, 0.2, 0.6);
    transmittance = pow(saturate(transmittance), step30);
    result = float3(1.0, 0.7, 0.5) * (1.0 - transmittance) +
             result * transmittance;

    return float4(saturate(result), 1.0);
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

bool IsControlPixel(float2 uv, float2 size) {
    float2 pixel = uv * size;
    return pixel.x < 4.5 && pixel.y < 1.5;
}

float3 FrameClamp(float2 uv, float2 size) {
    uv = saturate(uv);
    if (IsControlPixel(uv, size)) return 0.0;
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}

float3 Blur1Horizontal(float2 uv, float2 size) {
    const float4 weights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 offsets = float4(0.974358974, 2.90625,
                                  4.774193548, 6.6);
    const float weightDivisor = 0.027322404;
    float2 alignedUv = uv + 1.0 / size;
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 4; ++i) {
        float2 offset = float2(offsets[i] / size.x, 0.0);
        value += (FrameClamp(alignedUv + offset, size) +
                  FrameClamp(alignedUv - offset, size)) * weights[i];
    }
    return value * weightDivisor;
}

float3 Blur1(float2 uv, float2 size) {
    const float2 weights = float2(14.2, 4.1);
    const float2 offsets = float2(0.901408451, 2.487804878);
    const float weightDivisor = 0.027322404;
    float2 alignedUv = uv + float2(2.0 / size.x, 0.0);
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 2; ++i) {
        float2 offset = float2(0.0, offsets[i] * 2.0 / size.y);
        value += (Blur1Horizontal(alignedUv + offset, size) +
                  Blur1Horizontal(alignedUv - offset, size)) * weights[i];
    }
    value *= weightDivisor;

    // b1ed=.300 is applied by the first vertical blur pass.
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.7 + 0.3 *
        saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    if (input.sceneSpacePos.x < 4.5 && input.sceneSpacePos.y < 1.5)
        return float4(0.0, 0.0, 0.0, 1.0);

    float2 uv = input.texelSpacePos.xy;
    float3 result = FrameClamp(uv, size) + Blur1(uv, size) * 0.4;
    result = pow(max(result, 0.0), float3(0.5, 0.8, 1.7));
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0314",
        sourceId: 5, // VisSourceType.Vectorscope
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader
        }
    };
};
