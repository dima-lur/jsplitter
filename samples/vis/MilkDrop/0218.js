// MilkDrop 0218 — audio-driven mirrored ribbons in recursive pentagons
//
// Ported from vis/milkdrop/0218.milk. The original preset draws two textured
// five-sided custom shapes from the previous frame, followed by two mirrored
// custom waves. Its composite shader adds animated 3D-noise refraction, Blur1
// and channel-dependent power curves.
//
// q1 is an accumulated, audio-driven phase rather than wall-clock time. Two
// hidden history pixels preserve that phase and carry the next frame's phase
// increment. Both values are packed into RGB24 because feedback history uses
// BGRA8 UNORM. Visible history sampling and the post pass mask those pixels.
//
// The reference reloads wavecode samples after its initial waveform clamp, so
// these two active custom waves use 512 raw vertices and SmoothWave expands
// each to 1023 vertices. Their alternating vertices form hatched ribbons. The
// fullscreen port keeps fewer raw pairs for practical GPU cost, but applies
// the original SmoothWave subdivision and preserves overlapping line blends.
//
// This preset uses MilkDrop's fixed-function warp path (PSVERSION_WARP=0).
// Its diffuse shader copies sampled RGB but writes vertex alpha, and textured
// custom shapes likewise ignore the sampled texture alpha. The recursive
// image can therefore stay opaque in Direct2D without changing the preset.
// Timing and source-over opacity are expressed relative to the original
// 30-Hz evaluation, so TARGET_FPS may be raised without accelerating buildup.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0218"] = function (TARGET_FPS) {

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

float4 main(VS_OUTPUT input) : SV_Target {
    float2 p = input.sceneSpacePos.xy;

    // Pixel 0 carries q1's phase increment for the next feedback step. Pixel
    // 1 stays transparent so feedback can preserve the accumulated phase.
    if (p.y < 1.0 && p.x < 2.0) {
        if (p.x < 1.0) {
            float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
            float midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0.0);
            float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);
            float volume = (bassAtt + midAtt + trebAtt) * 0.25;

            // per_frame: mtime += volume^2*0.1; q1 = mtime*0.4.
            // q1 repeats exactly after 200*pi for every frequency used by the
            // preset, so storing the normalized modulo phase loses no motion.
            const float qPeriod = 628.318530718;
            float phaseIncrement = 0.04 * volume * volume / qPeriod;
            return float4(PackUnitFloat(phaseIncrement), 1.0);
        }
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
static const float Q_PERIOD = 628.318530718;

float3 PackUnitFloat(float value) {
    value = frac(max(value, 0.0));
    float3 encoded = frac(value * float3(1.0, 255.0, 65025.0));
    encoded -= encoded.yzz * float3(1.0 / 255.0, 1.0 / 255.0, 0.0);
    return encoded;
}

float UnpackUnitFloat(float3 encoded) {
    return dot(encoded, float3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
}

int WrapIndex(int value, int size) {
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 HistoryTexel(int2 pixel, int2 dimensions, bool wrap) {
    if (wrap) {
        pixel.x = WrapIndex(pixel.x, dimensions.x);
        pixel.y = WrapIndex(pixel.y, dimensions.y);
    } else {
        pixel = clamp(pixel, int2(0, 0), dimensions - 1);
    }
    if (pixel.y == 0 && pixel.x < 2) return 0.0;
    return Previous.Load(int3(pixel, 0)).rgb;
}

float3 SampleHistory(float2 uv, float2 size, bool wrap) {
    // Interpolate the recursive RGB exactly while excluding the two private
    // state texels. MilkDrop's fixed-function warp and textured-shape shaders
    // do not propagate sampled alpha here.
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

float3 HistoryClamp(float2 uv, float2 size) {
    return SampleHistory(uv, size, false);
}

float3 HistoryWrap(float2 uv, float2 size) {
    return SampleHistory(uv, size, true);
}

float3 BlendNormal(float3 destination, float3 sourceColor,
                   float sourceAlpha) {
    sourceAlpha = saturate(sourceAlpha);
    return sourceColor * sourceAlpha +
           destination * (1.0 - sourceAlpha);
}

float TemporalAlpha(float alpha30, float step30) {
    return 1.0 - pow(saturate(1.0 - alpha30), step30);
}

void ScaleAffineLayer(inout float3 additive, inout float transmittance,
                      float step30) {
    float loss30 = 1.0 - saturate(transmittance);
    float nextTransmittance = pow(saturate(transmittance), step30);
    float scale = loss30 > 0.000001
        ? (1.0 - nextTransmittance) / loss30 : step30;
    additive *= scale;
    transmittance = nextTransmittance;
}

float Cross2(float2 a, float2 b) {
    return a.x * b.y - a.y * b.x;
}

bool TriangleWeights(float2 p, float2 a, float2 b, float2 c,
                     out float3 weights) {
    float denominator = Cross2(b - a, c - a);
    if (abs(denominator) < 1e-5) {
        weights = float3(0.0, 0.0, 0.0);
        return false;
    }
    weights.y = Cross2(p - a, c - a) / denominator;
    weights.z = Cross2(b - a, p - a) / denominator;
    weights.x = 1.0 - weights.y - weights.z;
    return all(weights >= -0.0001);
}

bool ShapeSample(float2 p, float2 size, float q1, float textureZoom,
                 float edgeAlpha, out float3 sample,
                 out float vertexAlpha) {
    sample = 0.0;
    vertexAlpha = 0.0;
    float2 centerUv = float2(
        0.5 + 0.05 * sin(q1 * 0.5),
        0.5 + 0.05 * cos(q1 * 0.63));
    // MilkDrop's 2D vertex space has Y=-1 at the top. Custom shapes convert
    // their preset-space y with y * -2 + 1 before projection, so their screen
    // center is (x, 1-y), unlike the warp mesh's already-flipped vertices.
    float2 center = float2(centerUv.x, 1.0 - centerUv.y) * size;
    float geometryAngle = sin(q1 * 0.15) + PI * 0.25;
    float aspectY = size.x > size.y ? size.y / size.x : 1.0;
    const float radius = 1.06779;
    bool found = false;

    [unroll]
    for (int side = 0; side < 5; ++side) {
        float t0 = (float)side / 5.0;
        float t1 = (float)(side + 1) / 5.0;
        float a0 = t0 * TWO_PI + geometryAngle;
        float a1 = t1 * TWO_PI + geometryAngle;
        float2 vertex0 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a0), size.y * sin(a0));
        float2 vertex1 = center + 0.5 * radius * float2(
            size.x * aspectY * cos(a1), size.y * sin(a1));

        float3 weights;
        if (!found && TriangleWeights(p, center, vertex0, vertex1, weights)) {
            float textureAngle0 = t0 * TWO_PI + PI * 0.25;
            float textureAngle1 = t1 * TWO_PI + PI * 0.25;
            float2 texture0 = float2(
                0.5 + 0.5 * aspectY * cos(textureAngle0) / textureZoom,
                0.5 + 0.5 * sin(textureAngle0) / textureZoom);
            float2 texture1 = float2(
                0.5 + 0.5 * aspectY * cos(textureAngle1) / textureZoom,
                0.5 + 0.5 * sin(textureAngle1) / textureZoom);
            float2 textureUv = weights.x * 0.5 +
                               weights.y * texture0 + weights.z * texture1;
            sample = HistoryClamp(textureUv, size);
            vertexAlpha = weights.x +
                          edgeAlpha * (weights.y + weights.z);
            found = true;
        }
    }

    return found;
}

float2 ProjectArm(float sourceY, float cosTm,
                  float sinEight, float cosEight,
                  float sinTwoMinusHalf, float cosThreeOnePlusHalf,
                  float cosTwoThree) {
    float x = sourceY * cosEight;
    float y = -sourceY * sinEight;
    float z = -0.3;

    float angle = PI + sinTwoMinusHalf * 1.5;
    float sineAngle;
    float cosineAngle;
    sincos(angle, sineAngle, cosineAngle);
    float nextY = y * sineAngle + z * cosineAngle;
    float nextZ = y * cosineAngle - z * sineAngle;
    y = nextY;
    z = nextZ;

    angle = -1.0 + cosThreeOnePlusHalf;
    sincos(angle, sineAngle, cosineAngle);
    float nextX = x * sineAngle + y * cosineAngle;
    nextY = x * cosineAngle - y * sineAngle;
    x = nextX;
    y = nextY;

    z -= 0.35;
    angle = cosTwoThree * 1.75 - 1.05;
    sincos(angle, sineAngle, cosineAngle);
    nextX = x * sineAngle + z * cosineAngle;
    nextZ = x * cosineAngle - z * sineAngle;
    x = nextX;
    z = nextZ;

    angle = cosTm * 0.5 - 0.5;
    sincos(angle, sineAngle, cosineAngle);
    nextY = y * cosineAngle - z * sineAngle;
    nextZ = y * sineAngle + z * cosineAngle;
    y = nextY;
    z = nextZ + 2.0;

    return float2(x / z + 0.5, y / z * 1.3 + 0.5);
}

void ArmPairs(float sample, float q1,
              out float2 upperA, out float2 upperB,
              out float2 lowerA, out float2 lowerB) {
    float tm = q1 - sample * 0.2;
    float sinTm;
    float cosTm;
    float sinEight;
    float cosEight;
    sincos(tm, sinTm, cosTm);
    sincos(tm * 8.0, sinEight, cosEight);
    float sinTwoMinusHalf = sin(tm * 2.0 - 0.5);
    float cosThreeOnePlusHalf = cos(tm * 3.1 + 0.5);
    float cosTwoThree = cos(tm * 2.3);

    // flip alternates 1,0. A is flip=1 and B is flip=0. Wave 1 is
    // reflected and shifted exactly as in wave_1_per_point.
    upperA = ProjectArm(0.2 + 0.1 * sinTm, cosTm,
        sinEight, cosEight, sinTwoMinusHalf, cosThreeOnePlusHalf, cosTwoThree);
    upperB = ProjectArm(0.1 + 0.1 * sinTm, cosTm,
        sinEight, cosEight, sinTwoMinusHalf, cosThreeOnePlusHalf, cosTwoThree);
    lowerA = ProjectArm(-0.3 - 0.1 * sinTm, cosTm,
        sinEight, cosEight, sinTwoMinusHalf, cosThreeOnePlusHalf, cosTwoThree);
    lowerB = ProjectArm(-0.2 - 0.1 * sinTm, cosTm,
        sinEight, cosEight, sinTwoMinusHalf, cosThreeOnePlusHalf, cosTwoThree);
}

float2 ToPixels(float2 position, float2 size) {
    float squareSize = max(size.x, size.y);
    // DrawCustomWaves maps preset y through y * -2 + 1 in MilkDrop's
    // top-is-minus-one 2D coordinate system.
    return 0.5 * size +
           float2(position.x - 0.5, 0.5 - position.y) * squareSize;
}

float SegmentDistance(float2 p, float2 a, float2 b, out float along) {
    float2 ab = b - a;
    along = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * along);
}

float3 PairColor(float2 a, float2 b) {
    float2 delta = a - b;
    float magnitude = max(length(delta), 1e-5);
    float angle = abs(asin(clamp(delta.x / magnitude, -1.0, 1.0)));
    float colorAngle;
    if (delta.x < 0.0)
        colorAngle = delta.y < 0.0 ? -angle : PI + angle;
    else
        colorAngle = delta.y < 0.0 ? angle : PI - angle;
    return 0.5 + 0.5 * sin(colorAngle + float3(0.0, 1.047197, 2.094395));
}

float2 SmoothPoint(float2 below, float2 current,
                   float2 above, float2 above2) {
    // SmoothWave: c1=-.15, c2=1.15, c3=1.15, c4=-.15;
    // inv_sum=1/(c1+c2+c3+c4)=.5.
    return (-0.15 * below + 1.15 * current +
            1.15 * above - 0.15 * above2) * 0.5;
}

void AccumulateSegment(float2 p, float2 a, float2 b,
                       float3 colorA, float3 colorB,
                       float alphaA, float alphaB,
                       inout float3 accumulated,
                       inout float transmittance) {
    // bDrawThick draws the line at (0,0), (1,0), (1,1) and (0,1).
    // A line centered on that 2x2 cluster with a narrow antialiased footprint
    // reproduces its union without turning the gaps into filled polygons.
    float along;
    float distance = SegmentDistance(p - 0.5, a, b, along);
    float coverage = 1.0 - smoothstep(0.45, 1.65, distance);
    float sourceAlpha = coverage * lerp(alphaA, alphaB, along);
    float inverseAlpha = 1.0 - sourceAlpha;
    float3 sourceColor = lerp(colorA, colorB, along);

    // Preserve the order-dependent overlap of the original line strip. With
    // SRC_ALPHA / INV_SRC_ALPHA, a sequence of fragments is an affine
    // transform of the destination; retaining its additive term and remaining
    // transmittance lets both waves be accumulated independently and then
    // applied in their original numeric order.
    accumulated = sourceColor * sourceAlpha +
                  accumulated * inverseAlpha;
    transmittance *= inverseAlpha;
}

void RibbonLayers(float2 p, float2 size, float q1,
                  out float3 upperAdd, out float upperTransmittance,
                  out float3 lowerAdd, out float lowerTransmittance) {
    // The source uses 256 alternating A/B pairs. Ninety-six retain the whole
    // parameter range at practical fullscreen cost. SmoothWave below still
    // expands every retained raw edge exactly as the renderer does.
    const int pairs = 96;
    float2 currentUpperA;
    float2 currentUpperB;
    float2 currentLowerA;
    float2 currentLowerB;
    ArmPairs(0.0, q1, currentUpperA, currentUpperB,
        currentLowerA, currentLowerB);

    upperAdd = 0.0;
    lowerAdd = 0.0;
    upperTransmittance = 1.0;
    lowerTransmittance = 1.0;
    float3 initialColor = 0.5 + 0.5 * sin(float3(0.0, 1.047197, 2.094395));
    float3 currentUpperAColor = initialColor;
    float3 currentLowerAColor = initialColor;
    float3 currentUpperBColor = PairColor(currentUpperA, currentUpperB);
    float3 currentLowerBColor = PairColor(currentLowerA, currentLowerB);
    float2 previousUpperB = currentUpperA;
    float2 previousLowerB = currentLowerA;
    float currentAAlpha = 0.0;
    const float firstBAlpha = 1.0 - 1.0 / 511.0;
    float currentBAlpha = firstBAlpha;

    // Avoid FXC O3's expensive speculative optimisation of the full ribbon;
    // the compiled shader retains the same fixed 256-pair runtime loop.
    [fastopt]
    for (int pair = 0; pair < pairs - 1; ++pair) {
        float nextSample = (float)(pair + 1) / (float)(pairs - 1);
        float2 nextUpperA;
        float2 nextUpperB;
        float2 nextLowerA;
        float2 nextLowerB;
        ArmPairs(nextSample, q1, nextUpperA, nextUpperB,
            nextLowerA, nextLowerB);

        float3 nextUpperAColor = currentUpperBColor;
        float3 nextLowerAColor = currentLowerBColor;
        float3 nextUpperBColor = PairColor(nextUpperA, nextUpperB);
        float3 nextLowerBColor = PairColor(nextLowerA, nextLowerB);
        float nextAAlpha = 1.0 - nextSample;
        float nextBAlpha = 1.0 - min(nextSample + 1.0 / 511.0, 1.0);

        // SmoothWave emits raw A, an inserted point carrying A's color,
        // raw B, an inserted point carrying B's color, then the next raw A.
        float2 upperMidA = SmoothPoint(previousUpperB, currentUpperA,
            currentUpperB, nextUpperA);
        float2 upperMidB = SmoothPoint(currentUpperA, currentUpperB,
            nextUpperA, nextUpperB);
        float2 lowerMidA = SmoothPoint(previousLowerB, currentLowerA,
            currentLowerB, nextLowerA);
        float2 lowerMidB = SmoothPoint(currentLowerA, currentLowerB,
            nextLowerA, nextLowerB);

        float2 upperApx = ToPixels(currentUpperA, size);
        float2 upperMidApx = ToPixels(upperMidA, size);
        float2 upperBpx = ToPixels(currentUpperB, size);
        float2 upperMidBpx = ToPixels(upperMidB, size);
        float2 nextUpperApx = ToPixels(nextUpperA, size);
        float2 lowerApx = ToPixels(currentLowerA, size);
        float2 lowerMidApx = ToPixels(lowerMidA, size);
        float2 lowerBpx = ToPixels(currentLowerB, size);
        float2 lowerMidBpx = ToPixels(lowerMidB, size);
        float2 nextLowerApx = ToPixels(nextLowerA, size);

        AccumulateSegment(p, upperApx, upperMidApx,
            currentUpperAColor, currentUpperAColor,
            currentAAlpha, currentAAlpha, upperAdd, upperTransmittance);
        AccumulateSegment(p, upperMidApx, upperBpx,
            currentUpperAColor, currentUpperBColor,
            currentAAlpha, currentBAlpha, upperAdd, upperTransmittance);
        AccumulateSegment(p, upperBpx, upperMidBpx,
            currentUpperBColor, currentUpperBColor,
            currentBAlpha, currentBAlpha, upperAdd, upperTransmittance);
        AccumulateSegment(p, upperMidBpx, nextUpperApx,
            currentUpperBColor, nextUpperAColor,
            currentBAlpha, nextAAlpha, upperAdd, upperTransmittance);

        AccumulateSegment(p, lowerApx, lowerMidApx,
            currentLowerAColor, currentLowerAColor,
            currentAAlpha, currentAAlpha, lowerAdd, lowerTransmittance);
        AccumulateSegment(p, lowerMidApx, lowerBpx,
            currentLowerAColor, currentLowerBColor,
            currentAAlpha, currentBAlpha, lowerAdd, lowerTransmittance);
        AccumulateSegment(p, lowerBpx, lowerMidBpx,
            currentLowerBColor, currentLowerBColor,
            currentBAlpha, currentBAlpha, lowerAdd, lowerTransmittance);
        AccumulateSegment(p, lowerMidBpx, nextLowerApx,
            currentLowerBColor, nextLowerAColor,
            currentBAlpha, nextAAlpha, lowerAdd, lowerTransmittance);

        previousUpperB = currentUpperB;
        previousLowerB = currentLowerB;
        currentUpperA = nextUpperA;
        currentUpperB = nextUpperB;
        currentLowerA = nextLowerA;
        currentLowerB = nextLowerB;
        currentUpperAColor = nextUpperAColor;
        currentUpperBColor = nextUpperBColor;
        currentLowerAColor = nextLowerAColor;
        currentLowerBColor = nextLowerBColor;
        currentAAlpha = nextAAlpha;
        currentBAlpha = nextBAlpha;
    }

    // SmoothWave's last inserted vertex lies between the final A and B; the
    // final raw B is then appended unchanged.
    float2 finalUpperMid = SmoothPoint(previousUpperB, currentUpperA,
        currentUpperB, currentUpperB);
    float2 finalLowerMid = SmoothPoint(previousLowerB, currentLowerA,
        currentLowerB, currentLowerB);
    AccumulateSegment(p, ToPixels(currentUpperA, size),
        ToPixels(finalUpperMid, size), currentUpperAColor, currentUpperAColor,
        currentAAlpha, currentAAlpha, upperAdd, upperTransmittance);
    AccumulateSegment(p, ToPixels(finalUpperMid, size),
        ToPixels(currentUpperB, size), currentUpperAColor, currentUpperBColor,
        currentAAlpha, currentBAlpha, upperAdd, upperTransmittance);
    AccumulateSegment(p, ToPixels(currentLowerA, size),
        ToPixels(finalLowerMid, size), currentLowerAColor, currentLowerAColor,
        currentAAlpha, currentAAlpha, lowerAdd, lowerTransmittance);
    AccumulateSegment(p, ToPixels(finalLowerMid, size),
        ToPixels(currentLowerB, size), currentLowerAColor, currentLowerBColor,
        currentAAlpha, currentBAlpha, lowerAdd, lowerTransmittance);
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    float2 uv = p / size;
    float step30 = max(frameStep * 0.5, 0.0005);

    float previousPhase = UnpackUnitFloat(Previous.Load(int3(1, 0, 0)).rgb);
    float phaseIncrement = UnpackUnitFloat(Previous.Load(int3(0, 0, 0)).rgb);
    float phase = frac(previousPhase + phaseIncrement * step30);
    float q1 = phase * Q_PERIOD;

    // Pixel 1 is persistent state. The transparent source pass preserves it.
    if (p.y < 1.0 && p.x >= 1.0 && p.x < 2.0)
        return float4(PackUnitFloat(phase), 1.0);

    // per_frame zoom=1.1, decay=1, warp=0 and bTexWrap=1.
    float zoom = pow(1.1, step30);
    float2 warpedUv = 0.5 + (uv - 0.5) / zoom;
    // PSVERSION_WARP=0 selects diffuseps.hlsl in foo_vis_milk2: it samples
    // VS0 RGB and writes the fullscreen vertex alpha (one here).
    float3 result = HistoryWrap(warpedUv, size);

    // Custom shapes are rendered in numeric order and both sample the old
    // feedback surface, not the already-warped result.
    float3 shapeSample;
    float shapeVertexAlpha;
    if (ShapeSample(p, size, q1, 0.74186, 1.0,
                    shapeSample, shapeVertexAlpha))
        result = BlendNormal(result, shapeSample,
            TemporalAlpha(shapeVertexAlpha, step30));
    if (ShapeSample(p, size, q1, 0.77977, 0.0,
                    shapeSample, shapeVertexAlpha))
        result = BlendNormal(result, shapeSample,
            TemporalAlpha(shapeVertexAlpha, step30));

    // wavecode_0, then wavecode_1, both standard source-over and thick.
    float3 upperAdd;
    float3 lowerAdd;
    float upperTransmittance;
    float lowerTransmittance;
    RibbonLayers(p, size, q1, upperAdd, upperTransmittance,
        lowerAdd, lowerTransmittance);
    ScaleAffineLayer(upperAdd, upperTransmittance, step30);
    ScaleAffineLayer(lowerAdd, lowerTransmittance, step30);
    result = upperAdd + result * upperTransmittance;
    result = lowerAdd + result * lowerTransmittance;

    // DrawSprites burns the active outer border into the recursive VS after
    // the waves: ob_size=.05, ob_rgb=0 and ob_a=.3. In NDC that is a 2.5%
    // screen-space rim on each side.
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    if (edge < 0.025)
        result = BlendNormal(result, 0.0, TemporalAlpha(0.3, step30));

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
    return pixel.x < 2.5 && pixel.y < 1.5;
}

float3 FrameClamp(float2 uv, float2 size) {
    uv = saturate(uv);
    if (IsControlPixel(uv, size)) return float3(0.0, 0.0, 0.0);
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}

float3 FrameWrap(float2 uv, float2 size) {
    uv = frac(uv);
    if (IsControlPixel(uv, size)) return float3(0.0, 0.0, 0.0);
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}

float2 HashVolume(float3 p) {
    // noisevol_hq is a wrapping 32^3 RGBA texture whose random lattice is
    // spaced every four texels: eight independent cells per texture repeat.
    p -= floor(p / 8.0) * 8.0;
    return frac(sin(float2(
        dot(p, float3(127.1, 311.7, 74.7)),
        dot(p, float3(269.5, 183.3, 246.1)))) * 43758.5453123);
}

float2 NoiseVolume(float3 uvw) {
    float3 p = frac(uvw) * 8.0;
    float3 cell = floor(p);
    float3 f = frac(p);
    f = f * f * (3.0 - 2.0 * f);

    float2 n000 = HashVolume(cell + float3(0.0, 0.0, 0.0));
    float2 n100 = HashVolume(cell + float3(1.0, 0.0, 0.0));
    float2 n010 = HashVolume(cell + float3(0.0, 1.0, 0.0));
    float2 n110 = HashVolume(cell + float3(1.0, 1.0, 0.0));
    float2 n001 = HashVolume(cell + float3(0.0, 0.0, 1.0));
    float2 n101 = HashVolume(cell + float3(1.0, 0.0, 1.0));
    float2 n011 = HashVolume(cell + float3(0.0, 1.0, 1.0));
    float2 n111 = HashVolume(cell + float3(1.0, 1.0, 1.0));

    float2 n00 = lerp(n000, n100, f.x);
    float2 n10 = lerp(n010, n110, f.x);
    float2 n01 = lerp(n001, n101, f.x);
    float2 n11 = lerp(n011, n111, f.x);
    return lerp(lerp(n00, n10, f.y), lerp(n01, n11, f.y), f.z);
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
    // Direct evaluation of foo_vis_milk2's blur1_ps + blur2_ps kernel. Blur0
    // is half-size, hence the two-pixel conversion for its vertical offsets.
    // The public post stage exposes the completed frame rather than MilkDrop's
    // separate pre-warp VS0; that one-frame source difference remains.
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

    // b1ed=.25 in the preset; the first vertical pass uses .75 + .25*t.
    float edge = min(min(uv.x, uv.y), 1.0 - max(uv.x, uv.y));
    float edgeFactor = 0.75 + 0.25 * saturate(sqrt(max(edge, 0.0)) * 5.0);
    return value * edgeFactor;
}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    if (input.sceneSpacePos.x < 2.5 && input.sceneSpacePos.y < 1.5)
        return float4(0.0, 0.0, 0.0, 1.0);

    float2 uv = input.texelSpacePos.xy;
    float3 noisePosition = float3(uv * 3.3, 0.3 + time * 0.3);
    float2 noise = NoiseVolume(noisePosition);
    float2 refractedUv = uv + (noise * 2.0 - 1.0) * 13.0 / size;

    float3 color = FrameWrap(refractedUv, size);
    color += Blur1(uv, size) * 0.4;
    color = pow(max(color, 0.0), float3(0.5, 0.8, 1.7));
    return float4(saturate(color), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0218",
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
