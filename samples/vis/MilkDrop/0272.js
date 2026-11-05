// MilkDrop 0272 — two persistent audio walks in a growing neon feedback field.
// Original: original/0272.milk, read in full before translation.
//
// The built-in additive mode-7 wave has wave_rgb=0 and is invisible. The two
// enabled custom waves are 512-point stateful walks: their arbitrary EEL
// variables (xx/yy, pt, ltreb and bc) survive both points and frames. The
// source pass therefore prepares the native bidirectionally-smoothed PCM and
// six relative bands in private history pixels; feedback advances the state
// and draws the waves after the custom grow warp. Geometry is displayed one
// history step after it is generated, matching the existing private-state
// technique but adding a documented extra geometry-step latency.
//
// Native point sprites are retained at 256 of 512 samples per wave for
// practical fullscreen cost. Their order, square-viewport projection,
// UNORM8 RGBA conversion and normal blending are preserved. At higher FPS the
// walks and opacity advance by STEP_30; this is a cadence approximation, not
// pixel equivalence to four independently evaluated native point lists.
//
// Blur1 is recreated as a presentation-only post pass. Its green channel is
// encoded in premultiplied alpha while RGB carries the unblurred frame, then
// the composite samples both fields. The unused uv2/ret2 branch in the .milk
// is omitted: ret2 is calculated but never contributes to ret. The final
// composite remains outside feedback.
MilkDropPresets["0272"] = function (TARGET_FPS) {
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
static const int CONTROL_WIDTH = 64;
static const int PCM_COUNT = 512;
static const int BAND_BASE = 1024;
static const float VALUE_RANGE = .75;

float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}
float4 PackTwoUnit12(float2 value) {
    // Alpha must stay one so source OVER replaces the preceding PCM texel.
    float2 integer = floor(saturate(value) * 4095.0 + .5);
    float2 high = floor(integer / 256.0);
    float2 low = integer - high * 256.0;
    float joinedHigh = high.x * 16.0 + high.y;
    return float4(low.x / 255.0, low.y / 255.0,
                  joinedHigh / 255.0, 1.0);
}
float2 RawPair(int wave, int sampleIndex) {
    int leftIndex = wave == 0 ? 128 + sampleIndex : 256 + sampleIndex;
    int rightIndex = wave == 0 ? 384 + sampleIndex : 256 + sampleIndex;
    int last = max((int)pointCount - 1, 0);
    return clamp(float2(
        LeftPCM.Load(int3(clamp(leftIndex, 0, last), 0, 0)),
        RightPCM.Load(int3(clamp(rightIndex, 0, last), 0, 0))), -1.0, 1.0);
}
float2 SmoothedPair(int wave, int target) {
    // Custom-wave smoothing uses sqrt(.5*.98)=.7 in both directions. For a
    // single requested target, accumulate the backward recurrence without a
    // 512-element temporary array. Custom waves consume MilkDrop's PCM*128
    // buffer directly; unlike the built-in wave path there is no later /128.
    float2 forward = RawPair(wave, 0);
    float2 result = 0.0;
    float weight = 1.0;
    [fastopt]
    for (int sampleIndex = 0; sampleIndex < PCM_COUNT; ++sampleIndex) {
        if (sampleIndex > 0)
            forward = RawPair(wave, sampleIndex) * .3 + forward * .7;
        if (sampleIndex >= target) {
            result += forward * weight * (sampleIndex == PCM_COUNT - 1 ? 1.0 : .3);
            weight *= .7;
        }
    }
    return result * (.004 * 1.286 * 128.0);
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.x < 0 || pixel.x >= CONTROL_WIDTH || pixel.y < 0)
        return 0.0;
    int controlIndex = pixel.y * CONTROL_WIDTH + pixel.x;
    if (controlIndex < 2 * PCM_COUNT) {
        int wave = controlIndex / PCM_COUNT;
        int sampleIndex = controlIndex - wave * PCM_COUNT;
        float2 value = SmoothedPair(wave, sampleIndex);
        return PackTwoUnit12(.5 + value * (.5 / VALUE_RANGE));
    }
    if (controlIndex >= BAND_BASE && controlIndex < BAND_BASE + 6) {
        float band = max(RelativeBands.Load(int3(controlIndex - BAND_BASE, 0, 0)), 0.0);
        return float4(PackPositive(band), 1.0);
    }
    // Feedback owns point geometry and persistent EEL state.
    return 0.0;
}`;

    const warpShader = `
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
static const float PI = 3.141592653589793;
static const int CONTROL_WIDTH = 64;
static const int CONTROL_HEIGHT = 42;
static const int PCM_COUNT = 512;
static const int BAND_BASE = 1024;
static const int GEOMETRY_BASE = 1088;
static const int RETAINED_POINTS = 256;
static const int STATE_BASE = 2624;
static const float VALUE_RANGE = .75;
static const float3 MAGIC = float3(.2078, .6824, .9412);

int2 ControlPosition(int controlIndex) {
    return int2(controlIndex % CONTROL_WIDTH, controlIndex / CONTROL_WIDTH);
}
bool IsControl(int2 pixel) {
    return pixel.x >= 0 && pixel.x < CONTROL_WIDTH &&
           pixel.y >= 0 && pixel.y < CONTROL_HEIGHT;
}
float3 PackUnit(float value) {
    float3 packed = frac(min(saturate(value), .999999) *
                         float3(1.0, 255.0, 65025.0));
    return packed - packed.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
}
float UnpackUnit(float3 value) {
    return dot(value, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}
float3 PackPositive(float value) {
    value = max(value, 0.0);
    return PackUnit(value / (1.0 + value));
}
float DecodePositive(float3 value) {
    float unit = min(UnpackUnit(value), .999999);
    return unit / max(1.0 - unit, .000001);
}
float4 PackTwoUnit12(float2 value) {
    float2 integer = floor(saturate(value) * 4095.0 + .5);
    float2 high = floor(integer / 256.0);
    float2 low = integer - high * 256.0;
    float joinedHigh = high.x * 16.0 + high.y;
    return float4(low.x / 255.0, low.y / 255.0,
                  joinedHigh / 255.0, 1.0);
}
float2 DecodeTwoUnit12(float4 packed) {
    float3 bytes = floor(saturate(packed.rgb) * 255.0 + .5);
    float highX = floor(bytes.z / 16.0);
    float highY = bytes.z - highX * 16.0;
    return float2(highX * 256.0 + bytes.x,
                  highY * 256.0 + bytes.y) / 4095.0;
}
float4 State(int offset) {
    return Previous.Load(int3(ControlPosition(STATE_BASE + offset), 0));
}
bool Initialized() {
    return all(abs(State(0).rgb - MAGIC) < .012);
}
float Band(int index) {
    return DecodePositive(Previous.Load(int3(
        ControlPosition(BAND_BASE + index), 0)).rgb);
}
float2 WaveValue(int wave, int sampleIndex) {
    float4 packed = Previous.Load(int3(ControlPosition(
        wave * PCM_COUNT + sampleIndex), 0));
    return (DecodeTwoUnit12(packed) - .5) * (2.0 * VALUE_RANGE);
}
float3 QuantizeColor(float3 value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}
float QuantizeAlpha(float value) {
    return floor(saturate(value) * 255.0 + .5) / 255.0;
}

struct FrameData {
    float3 bands;
    float3 bandsAtt;
    float average;
    float peak;
    float age;
    float index;
    float p1;
    float p2;
    float q1;
    float q2;
    float pt;
    float trebDelta;
    float wave1Phase;
};
FrameData AdvanceFrame(bool initialized, float step30) {
    FrameData data;
    data.bands = float3(Band(0), Band(1), Band(2));
    data.bandsAtt = float3(Band(3), Band(4), Band(5));
    data.average = initialized ? DecodePositive(State(1).rgb) : 0.0;
    data.peak = initialized ? DecodePositive(State(2).rgb) : 0.0;
    data.age = initialized ? DecodePositive(State(3).rgb) : .101;
    data.index = initialized ? floor(State(4).r * 16.0 + .5) : 0.0;
    data.p1 = initialized ? DecodePositive(State(5).rgb) : 0.0;
    data.p2 = initialized ? DecodePositive(State(6).rgb) : 0.0;
    float oldPt = initialized ? DecodePositive(State(7).rgb) : 100.0;
    float oldTreb = initialized ? DecodePositive(State(9).rgb) : 0.0;
    float oldWave1Phase = initialized ? UnpackUnit(State(10).rgb) : 0.0;

    float decayMedium = pow(.69, step30);
    float decaySlow = pow(.9, step30);
    float beat = max(data.bands.x, max(data.bands.y, data.bands.z));
    data.average = data.average * decaySlow + beat * (1.0 - decaySlow);
    bool isBeat = beat > data.average + data.peak && data.age > .1;
    data.age = isBeat ? 0.0 : data.age + step30 / 30.0;
    data.peak = isBeat ? beat : data.peak * decayMedium;
    if (isBeat) data.index = fmod(data.index + 1.0, 16.0);
    bool quarterBeat = isBeat && fmod(data.index, 4.0) < .5;
    if (quarterBeat) data.p1 += 1.0;
    data.p2 = decayMedium * data.p2 + (1.0 - decayMedium) * data.p1;
    float rotation = data.p2 * PI / 4.0;
    data.q1 = cos(rotation);
    data.q2 = sin(rotation);
    data.pt = oldPt + data.q1 * .001 * step30;
    data.trebDelta = data.bands.z - oldTreb;
    data.wave1Phase = frac(oldWave1Phase + data.q1 * step30 * .25);
    return data;
}
float2 OldWalkPosition(int wave, bool initialized) {
    if (!initialized) return 0.0;
    return DecodeTwoUnit12(State(wave == 0 ? 8 : 11));
}
void EvaluateWavePoint(int wave, int target, bool finish,
                       FrameData data, bool initialized, float step30,
                       out float2 pointPosition, out float3 pointColor,
                       out float pointAlpha, out float2 endPosition) {
    float2 walk = OldWalkPosition(wave, initialized);
    pointPosition = walk;
    pointColor = 0.0;
    pointAlpha = 0.0;
    [fastopt]
    for (int sampleIndex = 0; sampleIndex < PCM_COUNT; ++sampleIndex) {
        float2 value = WaveValue(wave, sampleIndex);
        if (wave == 0) {
            walk += float2(value.x * data.q2 * data.bands.z,
                           value.y * data.q2 * data.bands.x) * (.01 * step30);
        } else {
            walk += float2(value.x * data.trebDelta * data.bands.y,
                           value.y * data.trebDelta * data.bandsAtt.x) * (.01 * step30);
        }
        walk.x = walk.x > 1.0 ? 0.0 : (walk.x < 0.0 ? 1.0 : walk.x);
        walk.y = walk.y > 1.0 ? 0.0 : (walk.y < 0.0 ? 1.0 : walk.y);
        if (sampleIndex == target) {
            pointPosition = float2(walk.x, walk.y + value.x * .01);
            if (wave == 0) {
                bool alternate = (sampleIndex & 1) != 0;
                float3 evenColor = float3(
                    sin(data.pt * data.bands.y) * .5 + .5,
                    tan(data.pt * data.bands.z) * .5 + .5,
                    cos(data.pt * data.bands.x) * .5 + .5);
                float3 oddColor = float3(data.bandsAtt.x * .45,
                                         data.bandsAtt.z * .4,
                                         data.bandsAtt.y * .5);
                pointColor = QuantizeColor(alternate ? evenColor : oddColor);
                pointAlpha = QuantizeAlpha(value.x * data.bands.x);
            } else {
                float gate = data.wave1Phase < .00001 ? 1.0 : 0.0;
                pointColor = QuantizeColor(float3(data.q1, gate * data.q1, data.q1));
                pointAlpha = QuantizeAlpha(.5);
            }
            if (!finish) break;
        }
    }
    endPosition = walk;
}

int WrapIndex(int value, int count) {
    int wrapped = value % count;
    return wrapped < 0 ? wrapped + count : wrapped;
}
float3 HistoryTexel(int2 pixel, int2 dimensions) {
    pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    return IsControl(pixel) ? 0.0 : Previous.Load(int3(pixel, 0)).rgb;
}
float3 History(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = saturate(uv) * size - .5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(HistoryTexel(base, dimensions),
        HistoryTexel(base + int2(1, 0), dimensions), fraction.x);
    float3 bottom = lerp(HistoryTexel(base + int2(0, 1), dimensions),
        HistoryTexel(base + int2(1, 1), dimensions), fraction.x);
    return lerp(top, bottom, fraction.y);
}
float Luminance(float3 color) {
    return dot(color, float3(.299, .587, .114));
}
float4 GrowLuminance(float2 uv, float2 probe, float2 size) {
    float2 sampleUV[4] = {
        uv + float2(probe.x, 0), uv - float2(probe.x, 0),
        uv + float2(0, probe.y), uv - float2(0, probe.y)
    };
    float3 samples[4];
    [fastopt]
    for (int index = 0; index < 4; ++index)
        samples[index] = History(sampleUV[index], size);
    return float4(Luminance(samples[0]), Luminance(samples[1]),
                  Luminance(samples[2]), Luminance(samples[3]));
}
float2 WarpVertex(float2 original, float2 size, float step30) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2.0 - 1.0,
                           1.0 - original.y * 2.0);
    float radius = length(vertex * aspect);
    float zoom = pow(1.00496, step30);
    float2 uv = .5 + float2(vertex.x, -vertex.y) * aspect * .5 / zoom;
    uv = (uv - .5) / pow(float2(.99967, .99990), step30) + .5;
    float4 factors = float4(11.68, 8.77, 10.54, 11.49) +
        float4(4, 3, 3, 4) * cos(time * float4(1.413, 1.113, 1.233, .933) +
                                float4(10, 7, 3, 5));
    float2 scaled = vertex / 1.331;
    uv += .00016 * .0035 * step30 * float2(
        sin(time * .333 + scaled.x * factors.x - scaled.y * factors.w) +
        cos(time * .753 - scaled.x * factors.y + scaled.y * factors.z),
        cos(time * .375 - scaled.x * factors.z - scaled.y * factors.y) +
        sin(time * .825 + scaled.x * factors.x + scaled.y * factors.w));
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 MeshUV(float2 original, float2 size, float step30) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(original) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 fraction = scaled - cell;
    float2 c00 = cell / grid;
    float2 c10 = (cell + float2(1, 0)) / grid;
    float2 c01 = (cell + float2(0, 1)) / grid;
    float2 c11 = (cell + 1.0) / grid;
    bool lower = fraction.x + fraction.y <= 1.0;
    float3 weight = lower
        ? float3(1.0 - fraction.x - fraction.y, fraction.x, fraction.y)
        : float3(1.0 - fraction.y, 1.0 - fraction.x,
                 fraction.x + fraction.y - 1.0);
    float2 corners[3] = {
        lower ? c00 : c10, lower ? c10 : c01, lower ? c01 : c11
    };
    float2 warped[3];
    [loop]
    for (int index = 0; index < 3; ++index)
        warped[index] = WarpVertex(corners[index], size, step30);
    return warped[0] * weight.x + warped[1] * weight.y + warped[2] * weight.z;
}
float2 GeometryPosition(int wave, int pointIndex) {
    int controlIndex = GEOMETRY_BASE + (wave * RETAINED_POINTS + pointIndex) * 3;
    return DecodeTwoUnit12(Previous.Load(int3(ControlPosition(controlIndex), 0)));
}
float4 GeometryColor(int wave, int pointIndex) {
    int controlIndex = GEOMETRY_BASE + (wave * RETAINED_POINTS + pointIndex) * 3;
    float3 color = Previous.Load(int3(ControlPosition(controlIndex + 1), 0)).rgb;
    float alpha = Previous.Load(int3(ControlPosition(controlIndex + 2), 0)).r;
    return float4(color, alpha);
}
bool CadenceSelect(int pointId, float step30) {
    if (step30 >= .9999) return true;
    float renderFrame = floor(time * 30.0 / step30);
    float rank = frac((pointId + .5) * .61803398875);
    return frac(rank - frac(renderFrame * step30)) < step30;
}
float3 DrawDots(float3 destination, float2 pixel, float2 size,
                float step30, bool initialized) {
    if (!initialized) return destination;
    float squareSide = max(size.x, size.y);
    float halfSize = size.x >= 1024.0 ? 1.5 : 1.0;
    [fastopt]
    for (int wave = 0; wave < 2; ++wave) {
        [fastopt]
        for (int pointIndex = 0; pointIndex < RETAINED_POINTS; ++pointIndex) {
            float2 position = GeometryPosition(wave, pointIndex);
            float2 dotPixel = .5 * size +
                float2(position.x - .5, .5 - position.y) * squareSide;
            if (all(abs(pixel - dotPixel) <= halfSize)) {
                float4 color = GeometryColor(wave, pointIndex);
                // Moving dots do not repeatedly cover the same pixel, so a
                // fractional alpha makes every new trace weaker and shorter
                // lived at high FPS. Partition both waves between subframes
                // and retain their full native opacity instead.
                int pointId = wave * RETAINED_POINTS + pointIndex;
                float alpha = CadenceSelect(pointId, step30) ? color.a : 0.0;
                destination = color.rgb * alpha + destination * (1.0 - alpha);
            }
        }
    }
    return destination;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 pixel = input.sceneSpacePos.xy;
    int2 integerPixel = int2(floor(pixel));
    float step30 = max(frameStep * .5, .0001);
    bool initialized = Initialized();

    if (IsControl(integerPixel)) {
        FrameData data = AdvanceFrame(initialized, step30);
        int controlIndex = integerPixel.y * CONTROL_WIDTH + integerPixel.x;
        if (controlIndex < 2 * PCM_COUNT ||
            (controlIndex >= BAND_BASE && controlIndex < BAND_BASE + 6))
            return float4(0, 0, 0, 1);
        if (controlIndex >= GEOMETRY_BASE &&
            controlIndex < GEOMETRY_BASE + 3 * 2 * RETAINED_POINTS) {
            int entry = controlIndex - GEOMETRY_BASE;
            int combinedPoint = entry / 3;
            int component = entry - combinedPoint * 3;
            int wave = combinedPoint / RETAINED_POINTS;
            int pointIndex = combinedPoint - wave * RETAINED_POINTS;
            int target = (pointIndex * (PCM_COUNT - 1) +
                          (RETAINED_POINTS - 1) / 2) /
                         (RETAINED_POINTS - 1);
            float2 pointPosition, endPosition;
            float3 pointColor;
            float pointAlpha;
            EvaluateWavePoint(wave, target, false, data, initialized, step30,
                pointPosition, pointColor, pointAlpha, endPosition);
            if (component == 0) return PackTwoUnit12(pointPosition);
            if (component == 1) return float4(pointColor, 1.0);
            return float4(pointAlpha, 0, 0, 1);
        }
        int stateIndex = controlIndex - STATE_BASE;
        if (stateIndex == 0) return float4(MAGIC, 1.0);
        if (stateIndex == 1) return float4(PackPositive(data.average), 1.0);
        if (stateIndex == 2) return float4(PackPositive(data.peak), 1.0);
        if (stateIndex == 3) return float4(PackPositive(data.age), 1.0);
        if (stateIndex == 4) return float4(data.index / 16.0, 0, 0, 1);
        if (stateIndex == 5) return float4(PackPositive(data.p1), 1.0);
        if (stateIndex == 6) return float4(PackPositive(data.p2), 1.0);
        if (stateIndex == 7) return float4(PackPositive(data.pt), 1.0);
        if (stateIndex == 9) return float4(PackPositive(data.bands.z), 1.0);
        if (stateIndex == 10) return float4(PackUnit(data.wave1Phase), 1.0);
        if (stateIndex == 8 || stateIndex == 11) {
            int wave = stateIndex == 8 ? 0 : 1;
            float2 pointPosition, endPosition;
            float3 pointColor;
            float pointAlpha;
            EvaluateWavePoint(wave, PCM_COUNT - 1, true, data, initialized,
                step30, pointPosition, pointColor, pointAlpha, endPosition);
            return PackTwoUnit12(endPosition);
        }
        return float4(0, 0, 0, 1);
    }

    float2 original = pixel / size;
    float2 uv = MeshUV(original, size, step30);
    // The .milk intentionally differentiates at a sub-pixel footprint and
    // amplifies the result before the final one-pixel feedback displacement.
    float2 probe = 3.0 / (size * size);
    float4 luminance = GrowLuminance(uv, probe, size);
    float2 gradient = float2(luminance.x - luminance.y,
                             luminance.z - luminance.w) * (2.3 * 1000.0 / 3.0);
    gradient = (saturate(gradient * .5 + .5) * 2.0 - 1.0) * 1.4;
    float decay = pow(.95, step30);
    float3 result = History(uv + gradient / size * step30, size) * decay;
    // At short history steps, decay can fall below half an R8_UNORM code and
    // dark pixels then round back to themselves forever. Correct only the
    // extra stall range introduced by the shorter step: the darkest range
    // would also survive one native 30-FPS .95 decay and must keep that long
    // tail. Fresh bright dots are composited afterward and are therefore not
    // weakened or dithered.
    float decayLoss = 1.0 - decay;
    if (decayLoss < 1.0 / 32.0) {
        // result is already multiplied by decay, so express both half-code
        // thresholds in that same post-decay value space.
        float stallLevel = decay * .5 / (255.0 * max(decayLoss, 1e-6));
        float nativeStallLevel = .95 * .5 / (255.0 * (1.0 - .95));
        float tick = floor(time * (60.0 / max(frameStep, .001)));
        float3 random = frac(sin(float3(
            dot(pixel, float2(12.9898, 78.233)) + tick * 19.193,
            dot(pixel, float2(39.346, 11.135)) + tick * 47.853,
            dot(pixel, float2(73.156, 52.235)) + tick * 83.155)) *
            43758.5453);
        float3 nativeTail = smoothstep(
            nativeStallLevel * .75, nativeStallLevel * 1.25, result);
        float3 vulnerable = nativeTail * (1.0 - smoothstep(
            stallLevel, stallLevel * 1.5, result));
        result += (random - .5) * vulnerable / 255.0;
        result = saturate(result);
    }
    result = DrawDots(result, pixel, size, step30, initialized);
    return float4(saturate(result), 1.0);
}`;

    const blur1Pass = `
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
static const float BLUR_BASE = .5;
bool IsControl(float2 uv, float2 size) {
    float2 pixel = uv * size;
    return pixel.x < 64.5 && pixel.y < 42.5;
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + saturate(uv) * scale;
}
float4 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    if (IsControl(saturate(uv), size)) return 0.0;
    return Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0.0);
}
float2 BlurTargetDimensions(float2 size) {
    float2 work = max(float2(16.0, 16.0), floor(size * .5));
    return max(float2(16.0, 4.0),
        floor((work + 3.0) / float2(16.0, 4.0)) * float2(16.0, 4.0));
}
float EncodeBlur(float value) {
    return BLUR_BASE + (1.0 - BLUR_BASE) * sqrt(saturate(value));
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x,
                          ddy(input.texelSpacePos.y) * size.y);
    float2 origin = input.texelSpacePos.xy - uv * scale;
    float3 original = Image(uv, size, origin, scale).rgb;
    float2 verticalScale = size / BlurTargetDimensions(size);
    const float4 horizontalWeights = float4(7.8, 6.4, 3.1, 1.0);
    const float4 horizontalOffsets = float4(.974358974, 2.90625,
                                             4.774193548, 6.6);
    const float2 verticalWeights = float2(14.2, 4.1);
    const float2 verticalOffsets = float2(.901408451, 2.487804878);
    float value = 0.0;
    [loop]
    for (int y = 0; y < 2; ++y) {
        [loop]
        for (int sy = -1; sy <= 1; sy += 2) {
            [loop]
            for (int x = 0; x < 4; ++x) {
                [loop]
                for (int sx = -1; sx <= 1; sx += 2) {
                    float2 pixelOffset = float2(1.0, 1.0) +
                        float2(verticalScale.x, 0.0) +
                        float2(sx * horizontalOffsets[x],
                               sy * verticalOffsets[y] * verticalScale.y);
                    value += Image(uv + pixelOffset / size,
                                   size, origin, scale).g *
                             horizontalWeights[x] * verticalWeights[y];
                }
            }
        }
    }
    value *= .027322404 * .027322404;
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    value *= .75 + .25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    float carrier = EncodeBlur(value);
    return float4(original * carrier, carrier);
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
static const float BLUR_BASE = .5;
bool IsControl(float2 uv, float2 size) {
    float2 pixel = uv * size;
    return pixel.x < 64.5 && pixel.y < 42.5;
}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + saturate(uv) * scale;
}
float DecodeBlur(float alpha) {
    float encoded = saturate((alpha - BLUR_BASE) / (1.0 - BLUR_BASE));
    return encoded * encoded;
}
void DecodeTexel(int2 pixel, int2 dimensions,
                 out float3 sharp, out float blur) {
    float4 packed = Frame.Load(int3(clamp(pixel, int2(0, 0),
                                          dimensions - 1), 0));
    sharp = packed.rgb / max(packed.a, BLUR_BASE);
    blur = DecodeBlur(packed.a);
}
void Fields(float2 uv, float2 size, float2 origin, float2 scale,
            out float3 sharp, out float blur) {
    uv = saturate(uv);
    if (IsControl(uv, size)) {
        sharp = 0.0;
        blur = 0.0;
        return;
    }
    // Sampling premultiplied RGB first and dividing by the interpolated
    // carrier alpha weights sharp pixels by Blur1. Decode the four backing
    // texels independently, then interpolate the sharp and blur fields. This
    // retains the fine edges that the composite deliberately exaggerates.
    uint width, height;
    Frame.GetDimensions(width, height);
    int2 dimensions = max(int2(width, height), int2(1, 1));
    float2 texturePosition = TextureUV(uv, origin, scale) * dimensions - .5;
    int2 base = int2(floor(texturePosition));
    float2 weight = frac(texturePosition);
    float3 sharp00, sharp10, sharp01, sharp11;
    float blur00, blur10, blur01, blur11;
    DecodeTexel(base, dimensions, sharp00, blur00);
    DecodeTexel(base + int2(1, 0), dimensions, sharp10, blur10);
    DecodeTexel(base + int2(0, 1), dimensions, sharp01, blur01);
    DecodeTexel(base + 1, dimensions, sharp11, blur11);
    sharp = lerp(lerp(sharp00, sharp10, weight.x),
                 lerp(sharp01, sharp11, weight.x), weight.y);
    blur = lerp(lerp(blur00, blur10, weight.x),
                lerp(blur01, blur11, weight.x), weight.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.sceneSpacePos.xy / size;
    if (IsControl(uv, size)) return float4(0, 0, 0, 1);
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x,
                          ddy(input.texelSpacePos.y) * size.y);
    float2 origin = input.texelSpacePos.xy - uv * scale;
    float2 uv3 = float2(uv.x, 1.0 - uv.y);
    float2 d = 4.0 / size;
    float2 positions[10] = {
        uv, uv3,
        uv + float2(d.x, 0), uv - float2(d.x, 0),
        uv + float2(0, d.y), uv - float2(0, d.y),
        uv3 + float2(d.x, 0), uv3 - float2(d.x, 0),
        uv3 + float2(2.0 * d.x, d.y), uv3 - float2(0, d.y)
    };
    float3 sharpSamples[10];
    float blurSamples[10];
    [fastopt]
    for (int index = 0; index < 10; ++index)
        Fields(positions[index], size, origin, scale,
               sharpSamples[index], blurSamples[index]);

    float dx = blurSamples[2] - blurSamples[3];
    float dy = blurSamples[4] - blurSamples[5];
    float2 uvY = uv - float2(dx, dy) * .4;
    float dx3 = blurSamples[6] - blurSamples[7];
    float dy3 = blurSamples[8] - blurSamples[9];
    float2 uv3Y = uv3 - float2(dx3, dy3) * 1.36;
    float3 displacedSharp[2];
    float unusedBlur[2];
    Fields(uvY, size, origin, scale,
           displacedSharp[0], unusedBlur[0]);
    Fields(uv3Y, size, origin, scale,
           displacedSharp[1], unusedBlur[1]);

    float3 result = lerp(
        float3(2.0, 1.1, 1.8) * displacedSharp[0].x,
        lerp(float3(1.8, .4, 2.5), float3(2.8, 2.4, 0.0),
             sharpSamples[0].z),
        blurSamples[0] * .5);
    result = lerp(result, float3(1.4, 1.0, 2.3),
                  displacedSharp[0].z);

    float3 result3 = lerp(
        float3(2.9, .9, .5) * displacedSharp[1].x,
        lerp(float3(2.1, .9, 2.5), float3(1.9, .5, 1.9),
             sharpSamples[1].z),
        blurSamples[1] * 1.54);
    result3 = lerp(result3, float3(1.7, .5, 1.6),
                   displacedSharp[1].z);
    result += result - result3;
    return float4(saturate(result), 1.0);
}`;

    return {
        name: "0272", sourceId: 5, source,
        updateIntervalMs: 17,
        renderer: {
            shader, feedback: warpShader,
            post: [blur1Pass, compShader]
        }
    };
};
