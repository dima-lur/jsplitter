// MilkDrop 0310 — recursive textured discs and four rotating wave layers
//
// Ported from vis/milkdrop/0310.milk and the corresponding foo_vis_milk2
// rendering paths. Two textured 60-sided shapes recursively sample the old
// frame. A star field and a procedural 3D point cloud sit above them, followed
// by two thick PCM-deformed rings.
//
// The source pass writes 512 stereo waveform pairs plus the six relative-band
// values into a private 32x17 control block. The feedback pass hides that block
// from image filtering and uses it to execute the preset's beat detector,
// alternating q1 rotation, wave-0 advance and recursive geometry.
//
// MilkDrop evaluates the equations at approximately 30 Hz. Decay, geometry
// injection and accumulators are normalized to that cadence, while TARGET_FPS
// controls how often the resulting history is evaluated and displayed.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0310"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    const shader = `
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RightPCM : register(t1);
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
    value = saturate(value);
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnitFloat(value / (1.0 + value));
}

float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.x < 0 || pixel.x >= 32 || pixel.y < 0 || pixel.y >= 17)
        return 0.0;

    // wavecode_*_samples is reloaded after MilkDrop's initial 480-point clamp,
    // so this preset really executes all 512 points. Keep the central 512
    // samples of the same 576-sample waveform window used by foo_vis_milk2.
    if (pixel.y < 16) {
        int waveIndex = pixel.y * 32 + pixel.x;
        int available = max((int)pointCount, 1);
        int windowSamples = min(available, 576);
        int waveSamples = min(windowSamples, 512);
        int sourceStart = max(available - windowSamples, 0) +
                          (windowSamples - waveSamples) / 2;
        int sourceIndex = sourceStart + min(waveIndex, waveSamples - 1);
        float left = saturate(LeftPCM.Load(int3(sourceIndex, 0, 0)).r * 0.5 + 0.5);
        float right = saturate(RightPCM.Load(int3(sourceIndex, 0, 0)).r * 0.5 + 0.5);
        return float4(left, right, 0.0, 1.0);
    }

    // The remaining row carries per_frame audio inputs. Pixels 6..12 remain
    // transparent here so feedback can replace them with persistent state.
    if (pixel.x < 6) {
        float value = max(RelativeBands.Load(int3(pixel.x, 0, 0)).r, 0.0);
        return float4(PackPositive(value), 1.0);
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

static const float PI = 3.14159265359;
static const float TWO_PI = 6.28318530718;
static const int CONTROL_WIDTH = 32;
static const int CONTROL_HEIGHT = 17;

float3 PackUnitFloat(float value) {
    value = frac(max(value, 0.0));
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

float3 PackPositive(float value) {
    value = max(value, 0.0);
    float unit = value / (1.0 + value);
    float3 encoded = frac(unit * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float DecodePositive(float3 encoded) {
    float unit = min(UnpackUnitFloat(encoded), 0.99999);
    return unit / max(1.0 - unit, 0.00001);
}

bool IsControlPixel(int2 pixel) {
    return pixel.x >= 0 && pixel.x < CONTROL_WIDTH &&
           pixel.y >= 0 && pixel.y < CONTROL_HEIGHT;
}

int WrapIndex(int value, int size) {
    value %= size;
    return value < 0 ? value + size : value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions, bool wrap) {
    if (wrap) {
        pixel.x = WrapIndex(pixel.x, dimensions.x);
        pixel.y = WrapIndex(pixel.y, dimensions.y);
    } else {
        pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    }
    if (IsControlPixel(pixel)) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float3 SampleHistory(float2 uv, float2 size, bool wrap) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions, wrap),
                      HistoryTexel(base + int2(1, 0), dimensions, wrap),
                      fraction.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions, wrap),
                         HistoryTexel(base + int2(1, 1), dimensions, wrap),
                         fraction.x);
    return lerp(top, bottom, fraction.y);
}

float3 HistoryWrap(float2 uv, float2 size) {
    return SampleHistory(uv, size, true);
}

float3 HistoryClamp(float2 uv, float2 size) {
    return SampleHistory(uv, size, false);
}

float2 WarpVertexUV(float2 uvOriginal, float2 size, float bass,
                    float bassAtt, float step30) {
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
    float amount = 0.3 * 0.0035 * step30;
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

    // per_pixel_1: preserve half the mesh transform when bass/bass_att rises.
    float audioGate = saturate((bass / max(bassAtt, 0.00001) - 0.9) * 13.0);
    return lerp(uvOriginal, uv, audioGate * 0.5);
}

float2 MeshUV(float2 uvOriginal, float2 size, float bass,
              float bassAtt, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + 1.0) / grid;

    // Select the mesh triangle before running the expensive vertex warp.
    // This keeps the original vertices, barycentric weights and winding.
    bool lowerTriangle = f.x + f.y <= 1.0;
    float2 cornerA = lowerTriangle ? corner00 : corner10;
    float2 cornerB = lowerTriangle ? corner10 : corner01;
    float2 cornerC = lowerTriangle ? corner01 : corner11;
    float3 weight = lowerTriangle
        ? float3(1.0 - f.x - f.y, f.x, f.y)
        : float3(1.0 - f.y, 1.0 - f.x, f.x + f.y - 1.0);
    float2 a = WarpVertexUV(cornerA, size, bass, bassAtt, step30);
    float2 b = WarpVertexUV(cornerB, size, bass, bassAtt, step30);
    float2 c = WarpVertexUV(cornerC, size, bass, bassAtt, step30);
    return weight.x * a + weight.y * b + weight.z * c;
}

float2 PolarAtMeshVertex(float2 uv, float2 aspect) {
    // m_vertinfo is built from mesh-space Y, while uv_orig uses texture Y.
    float2 vertex = float2(2.0 * uv.x - 1.0, 1.0 - 2.0 * uv.y);
    float2 corrected = vertex * aspect;
    return float2(length(corrected), atan2(corrected.y, corrected.x));
}

float UnwrapAngle(float angle, float reference) {
    float delta = angle - reference;
    if (delta > PI) angle -= TWO_PI;
    if (delta < -PI) angle += TWO_PI;
    return angle;
}

float2 MeshPolar(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + 1.0) / grid;
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));

    float2 a;
    float2 b;
    float2 c;
    float3 weights;
    if (f.x + f.y <= 1.0) {
        a = PolarAtMeshVertex(corner00, aspect);
        b = PolarAtMeshVertex(corner10, aspect);
        c = PolarAtMeshVertex(corner01, aspect);
        weights = float3(1.0 - f.x - f.y, f.x, f.y);
    } else {
        a = PolarAtMeshVertex(corner10, aspect);
        b = PolarAtMeshVertex(corner01, aspect);
        c = PolarAtMeshVertex(corner11, aspect);
        weights = float3(1.0 - f.y, 1.0 - f.x,
                         f.x + f.y - 1.0);
    }
    b.y = UnwrapAngle(b.y, a.y);
    c.y = UnwrapAngle(c.y, a.y);
    return a * weights.x + b * weights.y + c * weights.z;
}

float Cross2(float2 a, float2 b) {
    return a.x * b.y - a.y * b.x;
}

float3 TexturedShape(float2 p, float2 size, float radius,
                     float geometryAngle, float textureAngle,
                     float textureZoom, float3 innerColor,
                     float3 outerColor, float innerAlpha,
                     float outerAlpha) {
    float aspectY = size.x > size.y ? size.y / size.x : 1.0;
    float2 local = float2(
        (p.x - size.x * 0.5) / max(size.x * 0.5 * radius * aspectY, 0.00001),
        (p.y - size.y * 0.5) / max(size.y * 0.5 * radius, 0.00001));

    float theta = atan2(local.y, local.x);
    float sectorFloat = frac((theta - geometryAngle) / TWO_PI) * 60.0;
    int side = min((int)floor(sectorFloat), 59);
    float a0 = geometryAngle + TWO_PI * side / 60.0;
    float a1 = geometryAngle + TWO_PI * (side + 1) / 60.0;
    float2 v0 = float2(cos(a0), sin(a0));
    float2 v1 = float2(cos(a1), sin(a1));
    float denominator = Cross2(v0, v1);
    float w0 = Cross2(local, v1) / denominator;
    float w1 = Cross2(v0, local) / denominator;
    float wc = 1.0 - w0 - w1;
    if (w0 < 0.0 || w1 < 0.0 || wc < 0.0) return 0.0;

    float t0 = TWO_PI * side / 60.0 + textureAngle;
    float t1 = TWO_PI * (side + 1) / 60.0 + textureAngle;
    float2 tex0 = 0.5 + 0.5 * float2(
        aspectY * cos(t0) / textureZoom, sin(t0) / textureZoom);
    float2 tex1 = 0.5 + 0.5 * float2(
        aspectY * cos(t1) / textureZoom, sin(t1) / textureZoom);
    float2 textureUv = wc * 0.5 + w0 * tex0 + w1 * tex1;
    float edgeWeight = w0 + w1;
    float3 diffuse = lerp(innerColor, outerColor, edgeWeight);
    float alpha = lerp(innerAlpha, outerAlpha, edgeWeight);
    // BlurPasses leaves sampler 0 clamped before DrawCustomShapes.
    return HistoryClamp(textureUv, size) * diffuse * saturate(alpha);
}

float2 WaveToPixels(float2 position, float2 size) {
    float square = max(size.x, size.y);
    return float2((position.x - 0.5) * square + size.x * 0.5,
                  (0.5 - position.y) * square + size.y * 0.5);
}

float StarField(float2 p, float2 size, float advance) {
    float light = 0.0;
    float halfSize = size.x >= 1024.0 ? 1.0 : 0.5;
    // Keep the long waveform scans as runtime loops. fastopt sharply reduces
    // cold FXC time without changing their iteration counts or output.
    [fastopt]
    for (int i = 0; i < 512; ++i) {
        float samplePosition = i / 511.0;
        float s = samplePosition * 6.28;
        float xp = 0.20 * (sin(s) + sin(s * 0.34) +
                           sin(s * 24.3) + sin(s * 13.8));
        float yp = 0.20 * (cos(s) + sin(s * 0.24) +
                           cos(s * 17.4) + sin(s * 37.7));
        float zp = 0.25 * (cos(s) + cos(s * 5.24) +
                           cos(s * 47.4) + cos(s * 27.7));
        zp += 1.0 - advance;
        if (zp < 0.0) zp += 2.0;
        float alpha = saturate(1.0 - zp * 0.5);
        zp *= 0.7;
        float safeZ = abs(zp) < 0.0001 ? (zp < 0.0 ? -0.0001 : 0.0001) : zp;
        float2 center = WaveToPixels(float2(xp / safeZ + 0.5,
                                            yp / safeZ + 0.5), size);
        if (all(abs(p - center) <= halfSize.xx)) light += alpha;
    }
    return light;
}

float PointCloud(float2 p, float2 size, float q1) {
    float light = 0.0;
    float halfSize = size.x >= 1024.0 ? 1.5 : 1.0;
    float sineQ;
    float cosineQ;
    sincos(q1, sineQ, cosineQ);
    [fastopt]
    for (int i = 0; i < 512; ++i) {
        float samplePosition = i / 511.0;
        float ax = 5.0 * (sin(100.0 * samplePosition + 1.865) + 1.0) *
            sin(300.0 * 6.2831 * samplePosition + 3.14 * samplePosition);
        float ay = 5.0 * (sin(100.0 * samplePosition + 5.23) + 1.0) *
            cos(200.0 * 6.2831 * samplePosition + 3.14 * samplePosition + 0.1454);
        float az = 5.0 * (sin(100.0 * samplePosition + 0.234) + 1.0) *
            sin(400.0 * 6.2831 * samplePosition + 3.14 * samplePosition + 1.84);
        float vy = ay * cosineQ - az * sineQ;
        float vz = ay * sineQ + az * cosineQ;
        float denominator = max(abs(vz - 10.0), 0.0001);
        float2 center = WaveToPixels(float2(ax, vy) / denominator + 0.5, size);
        float alpha = vz > 0.0 ? saturate(0.05 * (5.0 - abs(vz))) : 0.0;
        if (all(abs(p - center) <= halfSize.xx)) light += alpha;
    }
    return light;
}

float2 ReadWaveform(int waveIndex) {
    if (waveIndex < 0 || waveIndex >= 512) return 0.0;
    int2 pixel = int2(waveIndex % 32, waveIndex / 32);
    return Previous.Load(int3(pixel, 0)).rg * 2.0 - 1.0;
}

void RingPoint(float samplePosition, bool secondPlane, float q1,
               float2 size, out float2 position, out float alpha) {
    int originalIndex = (int)round(samplePosition * 511.0);
    float2 waveform = ReadWaveform(originalIndex) * 0.513024;
    float gate = sin(20.0 * 6.2831 * samplePosition + time * 16.0) > 0.0 ? 1.0 : 0.0;
    float ax = (1.58 + 1.5 * gate * abs(waveform.x)) *
               cos(6.2831 * samplePosition);
    float ay = secondPlane ? 0.0 :
        1.3 * (1.58 + 1.5 * gate * abs(waveform.y)) *
        sin(6.2831 * samplePosition);
    float az = secondPlane ?
        1.2 * (1.58 + 1.5 * gate * abs(waveform.y)) *
        sin(6.2831 * samplePosition) : 0.0;

    float sineQ;
    float cosineQ;
    sincos(q1, sineQ, cosineQ);
    float vy = ay * cosineQ - az * sineQ;
    float vz = ay * sineQ + az * cosineQ;
    float denominator = max(abs(vz - 10.0), 0.0001);
    position = WaveToPixels(float2(ax, vy) / denominator + 0.5, size);

    float facing = secondPlane ?
        cos(-1.57) * ax + sin(-1.57) * sineQ * vy :
        cos( 1.57) * ax + sin( 1.57) * sineQ * vy;
    alpha = gate * (facing > 0.0 ? 1.0 : 0.07);
}

float2 SmoothPoint(float2 previous, float2 current,
                   float2 next, float2 afterNext) {
    // Exact SmoothWave coefficients from foo_vis_milk2.
    return (-0.15 * previous + 1.15 * current +
             1.15 * next - 0.15 * afterNext) * 0.5;
}

float SegmentLight(float2 p, float2 a, float2 b,
                   float alphaA, float alphaB) {
    float2 ab = b - a;
    float ab2 = max(dot(ab, ab), 0.00001);
    float total = 0.0;
    const float2 offsets[4] = {
        float2(0.0, 0.0), float2(1.0, 0.0),
        float2(1.0, 1.0), float2(0.0, 1.0)
    };
    [unroll]
    for (int i = 0; i < 4; ++i) {
        float2 shifted = p - offsets[i];
        float t = saturate(dot(shifted - a, ab) / ab2);
        float d = distance(shifted, a + t * ab);
        total += saturate(1.0 - d) * lerp(alphaA, alphaB, t);
    }
    return total;
}

float RingLayers(float2 p, float2 size, float q1) {
    // A reduced sampling count keeps the software-rasterized wave practical.
    // The rolling window below still applies MilkDrop's exact SmoothWave
    // interpolation to the retained vertices.
    const int SAMPLE_COUNT = 160;
    float light = 0.0;
    [fastopt]
    for (int plane = 0; plane < 2; ++plane) {
        bool secondPlane = plane != 0;

        // Rolling SmoothWave window. Besides matching the source more closely,
        // this evaluates only one new RingPoint per segment instead of four.
        float2 pPrev, p0, p1, pAfter;
        float a0, a1, aAfter;
        RingPoint(0.0, secondPlane, q1, size, p0, a0);
        pPrev = p0;
        RingPoint(1.0 / (SAMPLE_COUNT - 1.0), secondPlane, q1,
                  size, p1, a1);
        RingPoint(2.0 / (SAMPLE_COUNT - 1.0), secondPlane, q1,
                  size, pAfter, aAfter);

        [fastopt]
        for (int i = 0; i < SAMPLE_COUNT - 1; ++i) {
            float2 smooth = SmoothPoint(pPrev, p0, p1, pAfter);
            light += SegmentLight(p, p0, smooth, a0, a0);
            light += SegmentLight(p, smooth, p1, a0, a1);

            pPrev = p0;
            p0 = p1;
            a0 = a1;
            p1 = pAfter;
            a1 = aAfter;
            int nextIndex = min(i + 3, SAMPLE_COUNT - 1);
            RingPoint(nextIndex / (float)(SAMPLE_COUNT - 1), secondPlane,
                      q1, size, pAfter, aAfter);
        }
    }
    return light;
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
    int2 pixel = int2(floor(p));
    float step30 = max(frameStep * 0.5, 0.0001);
    float dt = step30 / 30.0;

    float bass = DecodePositive(Previous.Load(int3(0, 16, 0)).rgb);
    float mid = DecodePositive(Previous.Load(int3(1, 16, 0)).rgb);
    float treb = DecodePositive(Previous.Load(int3(2, 16, 0)).rgb);
    float bassAtt = DecodePositive(Previous.Load(int3(3, 16, 0)).rgb);
    float midAtt = DecodePositive(Previous.Load(int3(4, 16, 0)).rgb);
    float trebAtt = DecodePositive(Previous.Load(int3(5, 16, 0)).rgb);

    float phase = UnpackUnitFloat(Previous.Load(int3(6, 16, 0)).rgb);
    float meanBassAtt = DecodePositive(Previous.Load(int3(7, 16, 0)).rgb);
    float peakBassAtt = DecodePositive(Previous.Load(int3(8, 16, 0)).rgb);
    float beatRate = DecodePositive(Previous.Load(int3(9, 16, 0)).rgb);
    float beatAge = DecodePositive(Previous.Load(int3(10, 16, 0)).rgb);
    float3 flags = Previous.Load(int3(11, 16, 0)).rgb;
    bool initialized = flags.r > 0.5;
    bool previousBeat = flags.g > 0.5;
    int stateCode = (int)round(saturate(flags.b) * 3.0);
    int mode = stateCode % 2;
    int parity = stateCode / 2;
    float advance = UnpackUnitFloat(
        Previous.Load(int3(12, 16, 0)).rgb) * 2.0;

    if (!initialized) {
        phase = 0.0;
        meanBassAtt = 0.0;
        peakBassAtt = 0.0;
        beatRate = 0.0;
        beatAge = 0.0;
        previousBeat = false;
        mode = 0;
        parity = 0;
        advance = 0.0;
    }

    // per_frame_3..15: Krash's beat detector, including the previous frame's
    // beat flag and the every-second-beat mode reversal.
    float volume = 0.3 * (bass + mid);
    if (beatRate == 0.0 || volume < 0.01) beatRate = 1.0;
    float ageBeforeReset = initialized ? beatAge + dt : 0.0;
    float meanRetention = pow(0.9, step30);
    meanBassAtt = meanBassAtt * meanRetention +
                  bassAtt * (1.0 - meanRetention);
    peakBassAtt = max(bassAtt, peakBassAtt);
    if (previousBeat && ageBeforeReset < 2.0 * beatRate) {
        float beatRetention = pow(0.9, step30);
        beatRate = beatRate * beatRetention +
                   ageBeforeReset * (1.0 - beatRetention);
    }
    beatRate = max(beatRate, 0.1);
    peakBassAtt = previousBeat ? bassAtt : peakBassAtt *
        pow(ageBeforeReset > 2.0 * beatRate ? 0.95 : 0.995, step30);
    beatAge = previousBeat ? 0.0 : ageBeforeReset;
    peakBassAtt = max(peakBassAtt, 1.1 * meanBassAtt);
    bool beat = volume > 0.8 &&
        peakBassAtt - bassAtt < 0.05 * peakBassAtt &&
        beatAge > 0.1 + 0.5 * (beatRate - 0.1);
    if (beat) {
        parity = 1 - parity;
        if (parity == 0) mode = 1 - mode;
    }

    float flip = mode != 0 ? 1.0 : -1.0;
    float audioMotion = (bassAtt + midAtt + trebAtt) * 0.25;
    audioMotion *= audioMotion;
    phase = frac(phase + audioMotion * 0.04 * flip * step30 / TWO_PI + 1.0);
    float q1 = phase * TWO_PI;
    advance += 0.005 * step30;
    if (advance > 2.0) advance = 0.0;

    if (IsControlPixel(pixel)) {
        if (pixel.y < 16 || pixel.x < 6) return 0.0;
        if (pixel.x == 6) return float4(PackUnitFloat(phase), 1.0);
        if (pixel.x == 7) return float4(PackPositive(meanBassAtt), 1.0);
        if (pixel.x == 8) return float4(PackPositive(peakBassAtt), 1.0);
        if (pixel.x == 9) return float4(PackPositive(beatRate), 1.0);
        if (pixel.x == 10) return float4(PackPositive(beatAge), 1.0);
        if (pixel.x == 11) {
            int nextState = mode + 2 * parity;
            return float4(1.0, beat ? 1.0 : 0.0, nextState / 3.0, 1.0);
        }
        if (pixel.x == 12) return float4(PackUnitFloat(advance * 0.5), 1.0);
        return 0.0;
    }

    float2 uvOriginal = input.texelSpacePos.xy;
    float2 uv = MeshUV(uvOriginal, size, bass, bassAtt, step30);
    float2 screenDelta = uvOriginal - 0.5;
    // The preset shader operates on uv_orig itself here, whose Y already runs
    // from 0 at the top to 1 at the bottom. Only MilkDrop's separate ang
    // interpolant is derived from mesh-vertex Y and therefore needs the flip.
    float2 uvDirection = normalize(screenDelta +
        float2(0.000001, 0.0));
    float2 tangent = uvDirection.yx * float2(1.0, -1.0);
    // rad and ang are vertex attributes in foo_vis_milk2. The 0310 shader
    // receives their triangle-interpolated values, not per-pixel polar values.
    float2 meshPolar = MeshPolar(uvOriginal, size);
    float radius = meshPolar.x;
    float angle = meshPolar.y;
    uv += uvDirection * cos(radius * 50.0 - time * 8.0) *
          5.0 * step30 / size;
    uv += tangent * cos(angle * 50.0 - time * 8.0) *
          5.0 * step30 / size;

    float decay = pow(0.8, step30);
    float3 result = HistoryWrap(uv, size) * decay - 0.04 * (1.0 - decay);
    result=DitherDecay(result,decay,.04*(1-decay),.8,.008,input.sceneSpacePos.xy);
    result = saturate(result);

    // Geometry draw order is the same as foo_vis_milk2: shape 1, shape 2,
    // dotted wave 0, dotted wave 1, thick wave 2 and thick wave 3.
    result += TexturedShape(p, size, 0.55924,
        1.88496 + PI * 0.25, 0.69115 + PI * 0.25, 2.34866,
        float3(1.0, 0.1, 1.0), float3(1.0, 0.05, 0.4), 0.2, 0.0) *
        step30;
    result = saturate(result);
    result += TexturedShape(p, size, 1.54304,
        6.28319 + PI * 0.25, bass + PI * 0.25, 0.30546,
        float3(0.0, 0.5, 0.6), 0.0, 0.4, 0.8) * step30;
    result = saturate(result);
    result += StarField(p, size, advance) * step30;
    result = saturate(result);
    result += PointCloud(p, size, q1) * step30;
    result = saturate(result);
    result += float3(1.0, 0.5, 0.1) *
              RingLayers(p, size, q1) * step30;
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
    return pixel.x < 32.5 && pixel.y < 17.5;
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
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.75 + 0.25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

// GetBlur3 in MilkDrop is the last level of a six-pass, progressively
// downsampled blur pyramid. A handful of distant direct samples would instead
// duplicate sharp waves at the sample offsets, creating phantom outer rings.
// This low-discrepancy Gaussian approximates the *integrated* wide blur in a
// single post shader, without adding special render targets to JSplitter.
// The kernel is symmetric to avoid shifting the image center. Its spreads
// approximate the combined native blur pass variances at this pixel scale.
float3 Blur3(float2 uv, float2 size) {
    static const float2 offsets[48] = {
        float2(+5.745585, +0.000000),
        float2(-5.745585, -0.000000),
        float2(-7.417667, +6.309820),
        float2(+7.417667, -6.309820),
        float2(+1.148181, -12.148436),
        float2(-1.148181, +12.148436),
        float2(+9.565506, +11.585330),
        float2(-9.565506, -11.585330),
        float2(-17.767968, -2.918410),
        float2(+17.767968, +2.918410),
        float2(+17.045609, -10.068520),
        float2(-17.045609, +10.068520),
        float2(-5.777333, +19.956291),
        float2(+5.777333, -19.956291),
        float2(-11.171832, -19.974206),
        float2(+11.171832, +19.974206),
        float2(+24.594281, +8.340235),
        float2(-24.594281, -8.340235),
        float2(-25.982552, +9.959132),
        float2(+25.982552, -9.959132),
        float2(+12.730707, -25.261582),
        float2(-12.730707, +25.261582),
        float2(+9.571685, +28.336323),
        float2(-9.571685, -28.336323),
        float2(-29.386479, -15.813632),
        float2(+29.386479, +15.813632),
        float2(+35.163475, -7.178406),
        float2(-35.163475, +7.178406),
        float2(-21.924149, +28.957356),
        float2(+21.924149, -28.957356),
        float2(-5.184518, -37.150812),
        float2(+5.184518, +37.150812),
        float2(+32.655261, +25.556040),
        float2(-32.655261, -25.556040),
        float2(-45.218425, +1.736358),
        float2(+45.218425, -1.736358),
        float2(+34.069142, -31.481679),
        float2(-34.069142, +31.481679),
        float2(-2.366515, +47.522492),
        float2(+2.366515, -47.522492),
        float2(-35.203199, -39.171969),
        float2(+35.203199, +39.171969),
        float2(+59.020198, +7.373864),
        float2(-59.020198, -7.373864),
        float2(-54.123263, +34.967731),
        float2(+54.123263, -34.967731),
        float2(+17.099899, -70.581426),
        float2(-17.099899, +70.581426)
    };
    float3 value = 0.0;
    [loop]
    for (int i = 0; i < 48; ++i) {
        value += FrameClamp(uv + offsets[i] / size, size);
    }
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    return (value / 48.0) * (0.75 + 0.25 *
        saturate(sqrt(max(edge, 0.0)) * 5.0));
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    if (input.sceneSpacePos.x < 32.5 && input.sceneSpacePos.y < 17.5)
        return float4(0.0, 0.0, 0.0, 1.0);

    float2 uv = input.texelSpacePos.xy;
    float2 mirrorUv = float2(1.0 - uv.x, uv.y);
    float3 mainSample = FrameClamp(uv, size);
    float3 mirrorSample = FrameClamp(mirrorUv, size);
    float3 blur1 = Blur1(uv, size);
    float3 blur1Mirror = Blur1(mirrorUv, size);
    float3 blur3 = Blur3(uv, size);
    float3 blur3Mirror = Blur3(mirrorUv, size);

    float3 result = mainSample.xxx + mirrorSample.xxx;
    float3 blurs = blur1.xxx + blur3.xxx +
                   blur1Mirror.xxx + blur3Mirror.xxx;
    float2 uv3 = (uv - 0.5) * (1.0 - blur1.zz) + 0.5;
    result += saturate(sqrt(max(FrameClamp(uv3, size).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result += saturate(sqrt(max(Blur1(uv3, size).zzz, 0.0)) *
                       (1.0 - result.x * 2.0));
    result = lerp(blurs, result, result);

    float3 roamCos = 0.5 + 0.5 * cos(
        time * float3(0.329, 1.293, 5.070) +
        float3(1.2, 3.9, 2.5));
    result = pow(max(result, 0.0), 0.5 + 4.0 * roamCos);

    float greenSum = FrameClamp(float2(uv.x, 1.0 - uv.y), size).g +
                     FrameClamp(1.0 - uv, size).g;
    result += pow(max(greenSum, 0.0), float3(0.6, 0.95, 5.0));
    result = 1.0 - exp(-2.0 * result);
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0310",
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
