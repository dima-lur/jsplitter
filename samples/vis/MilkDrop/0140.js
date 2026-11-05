// MilkDrop 0140 — an audio-reactive sphere assembled from 410 polygons.
//
// Three stages: source geometry, warped feedback, and final composition.
// The source keeps the preset's shape formulas and relative audio bands.
// Feedback and composition use a small normalized filter of their own t0
// input for glow. This approximates Blur1 without native blur textures or
// extra engine passes; it does not reproduce MilkDrop's downsample chain.
// The post stage displays the newly composed frame.
// Keep the native source opacity, ~1.8x feedback stretch and .41 decay at
// every render rate. They determine the spacing and visibility of recursive
// sphere copies. Taking fractional powers of stretch/decay at higher FPS
// inserts additional visible copies and changes this preset's composition.
// Geometry still advances with time and history updates on every frame;
// the short-lived echoes retain the previously validated per-frame behavior.
// The 66 ms PCM window starts about 33 ms behind playback. Its duration
// is independent of the analysis interval and render FPS. Band analysis uses
// 576 input samples and a 1024-point FFT.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0140"] = function (TARGET_FPS) {

    const updateIntervalMs = 33; // Audio analysis interval, independent of render FPS.

    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 66,
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

static const float PI = 3.14159265358979323846;
static const float TWO_PI = 6.28318530717958647692;

float ColorNorm(float value) {
    // foo_vis_milk2 0.10.0 clamps shape colors to 0..1, then rounds to UNORM8.
    // floor(x + 0.5) matches native C round for this nonnegative range.
    return floor(saturate(value) * 255.0 + 0.5) / 255.0;
}

float QuantizeUnorm(float value) {
    return floor(saturate(value) * 255.0 + 0.5) / 255.0;
}

float3 QuantizeUnorm3(float3 value) {
    return floor(saturate(value) * 255.0 + 0.5) / 255.0;
}

void CompositeOver(float3 color, float alpha,
                   inout float3 accumulated, inout float accumulatedAlpha) {
    float nextAlpha = QuantizeUnorm(
        alpha + accumulatedAlpha * (1.0 - alpha));
    float3 nextColor = QuantizeUnorm3(
        color * alpha + accumulated * (1.0 - alpha));
    accumulatedAlpha = nextAlpha;
    accumulated = min(nextColor, nextAlpha);
}

float CadenceAlpha(float alpha) {
    return saturate(alpha);
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 pixel = input.sceneSpacePos.xy;
    float2 screenUv = pixel / size;

    float bass = max(RelativeBands.Load(int3(0, 0, 0)).r, 0.0);
    float treb = max(RelativeBands.Load(int3(2, 0, 0)).r, 0.0);
    float bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0.0);
    float trebAtt = max(RelativeBands.Load(int3(5, 0, 0)).r, 0.0);

    const float instanceCount = 410.0;
    const float nc = 20.248456731316587;
    const float sideCount = 20.0;
    const float sector = TWO_PI / sideCount;
    const float halfSector = 0.5 * sector;
    const float geometryAngle = PI * 0.25;
    float edgeRadius = (0.005 + bass / 100.0) * cos(halfSector);
    float projectionSize = 0.3 + bassAtt / 300.0;
    float zTranslation = bassAtt / 70.0;
    float aspectY = size.x > size.y ? size.y / size.x : 1.0;
    float pixelScale = 0.5 * min(size.x, size.y);

    float q1Sine;
    float q1Cosine;
    float q2Sine;
    float q2Cosine;
    sincos(time / 5.0, q1Sine, q1Cosine);
    sincos(time / 6.0, q2Sine, q2Cosine);

    // The source angles form two fixed recurrences. Advancing their sine and
    // cosine pairs avoids evaluating 820 trigonometric functions per pixel.
    float longitudeStepSine;
    float longitudeStepCosine;
    float latitudeStepSine;
    float latitudeStepCosine;
    sincos(6.28 / nc, longitudeStepSine, longitudeStepCosine);
    sincos(3.14 / nc, latitudeStepSine, latitudeStepCosine);
    float longitudeSine = 0.0;
    float longitudeCosine = 1.0;
    float latitudeSine = 0.0;
    float latitudeCosine = 1.0;
    int longitudeIndex = 0;
    int latitudeIndex = 0;

    float centerGreen = ColorNorm(abs(trebAtt / 5.0 - bass));
    float outerBlue = ColorNorm(treb * 0.7 - bass * 0.5);
    float outerAlpha = ColorNorm(0.1);
    float borderAlpha = ColorNorm(0.006);
    float3 accumulated = 0.0;
    float accumulatedAlpha = 0.0;

    // The generated DXBC is byte-identical with fastopt, while FXC avoids a
    // costly speculative optimisation pass over all 410 instances.
    [fastopt]
    for (int instance = 0; instance < 410; ++instance) {
        // EEL's % converts both positive operands to integers first. Thus
        // instance % sqrt(410) is instance % 20, while int(instance / nc)
        // remains the positive truncation used for the latitude.
        int currentLatitudeIndex = (int)((float)instance / nc);
        if (currentLatitudeIndex > latitudeIndex) {
            float nextLatitudeSine = latitudeSine * latitudeStepCosine +
                                     latitudeCosine * latitudeStepSine;
            latitudeCosine = latitudeCosine * latitudeStepCosine -
                             latitudeSine * latitudeStepSine;
            latitudeSine = nextLatitudeSine;
            latitudeIndex = currentLatitudeIndex;
        }

        float xs = longitudeSine * latitudeSine;
        float ys = longitudeCosine * latitudeSine;
        float zs = latitudeCosine;

        float nextLongitudeSine = longitudeSine * longitudeStepCosine +
                                  longitudeCosine * longitudeStepSine;
        longitudeCosine = longitudeCosine * longitudeStepCosine -
                          longitudeSine * longitudeStepSine;
        longitudeSine = nextLongitudeSine;
        ++longitudeIndex;
        if (longitudeIndex == 20) {
            longitudeIndex = 0;
            longitudeSine = 0.0;
            longitudeCosine = 1.0;
        }

        float y1 = ys * q1Cosine - zs * q1Sine;
        float z1 = ys * q1Sine + zs * q1Cosine;
        float x1 = z1 * q2Sine + xs * q2Cosine;
        float z2 = z1 * q2Cosine - xs * q2Sine;
        float z3 = z2 + zTranslation;
        float denominator = 1.0 + z3 * projectionSize;
        float shapeX = 0.5 + projectionSize * x1 / denominator;
        float shapeY = 0.5 + projectionSize * y1 / denominator;

        // Custom shapes use vertexY = presetY * -2 + 1. MilkDrop's 2D
        // vertex space has Y=-1 at the top, so the screen center is (x, 1-y).
        float2 centerUv = float2(shapeX, 1.0 - shapeY);
        float2 clipDelta = 2.0 * (screenUv - centerUv);
        float2 local = float2(clipDelta.x / max(aspectY, 0.00001),
                              clipDelta.y);
        float radial = length(local);

        // Reject pixels outside the circumcircle before evaluating the exact
        // 20-gon edge. One pixel is retained for raster coverage and border.
        float shapeRadius = 0.005 + bass / 100.0;
        if (radial > shapeRadius + 1.0 / max(pixelScale, 1.0))
            continue;

        float angle = atan2(local.y, local.x);
        float withinSector = frac((angle - geometryAngle) / sector);
        float edgeDelta = withinSector * sector - halfSector;
        float projectedRadius = radial * cos(edgeDelta);
        float signedEdgePixels = (edgeRadius - projectedRadius) * pixelScale;
        // The native render target is single-sampled: triangle coverage is
        // decided at the pixel centre instead of being analytically softened.
        float fillCoverage = signedEdgePixels >= 0.0 ? 1.0 : 0.0;
        float edgeWeight = saturate(projectedRadius /
                                    max(edgeRadius, 0.000001));

        if (fillCoverage > 0.0) {
            float3 centerColor = float3(
                ColorNorm((float)instance / instanceCount),
                centerGreen, 1.0);
            float3 outerColor = float3(0.0, 0.0, outerBlue);
            float centerAlpha = z3 < 0.0 ? 1.0 : 0.0;
            float shapeAlpha = lerp(centerAlpha, outerAlpha, edgeWeight);
            shapeAlpha = CadenceAlpha(shapeAlpha * fillCoverage);
            CompositeOver(lerp(centerColor, outerColor, edgeWeight),
                          shapeAlpha, accumulated, accumulatedAlpha);
        }

        // The source border is a one-pixel 20-segment line strip drawn after
        // every fill. ColorNorm turns its nominal .006 alpha into 2/255.
        float lineCoverage = abs(signedEdgePixels) <= 0.5 ? 1.0 : 0.0;
        if (lineCoverage > 0.0) {
            float alpha = CadenceAlpha(borderAlpha * lineCoverage);
            CompositeOver(1.0, alpha, accumulated, accumulatedAlpha);
        }
    }

    return float4(saturate(accumulated), saturate(accumulatedAlpha));
}`;

    // Ordinary image sampling shared by the feedback and post shaders.
    const imageSampling = `
int WrapIndex(int value, int size) {
    if (value < 0) return value + size;
    if (value >= size) return value - size;
    return value;
}

float3 ImageTexelWrap(int2 pixel, int2 dimensions) {
    pixel.x = WrapIndex(pixel.x, dimensions.x);
    pixel.y = WrapIndex(pixel.y, dimensions.y);
    return Image.Load(int3(pixel, 0)).rgb;
}

float3 ImageWrap(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), int2(1, 1));
    float2 texel = uv * size - 0.5;
    int2 base = int2(floor(texel));
    float2 fraction = frac(texel);
    float3 top = lerp(ImageTexelWrap(base, dimensions),
                      ImageTexelWrap(base + int2(1, 0), dimensions),
                      fraction.x);
    float3 bottom = lerp(ImageTexelWrap(base + int2(0, 1), dimensions),
                         ImageTexelWrap(base + int2(1, 1), dimensions),
                         fraction.x);
    return lerp(top, bottom, fraction.y);
}

float3 ImageClamp(float2 uv, float2 size) {
    float2 halfTexel = 0.5 / size;
    return Image.SampleLevel(Filter,
        clamp(uv, halfTexel, 1.0 - halfTexel), 0.0).rgb;
}

float3 LocalGlow(float2 uv, float2 size) {
    // Normalized [1 2 1] x [1 2 1] kernel: nine bilinear samples.
    // The spacing approximates the original kernel's variance in source
    // pixels, without its downsampling, intermediate rounding or edge fade.
    float2 spacing = float2(4.4, 4.1) / size;
    float3 value = ImageClamp(uv, size) * 4.0;
    value += (ImageClamp(uv + float2(spacing.x, 0.0), size) +
              ImageClamp(uv - float2(spacing.x, 0.0), size) +
              ImageClamp(uv + float2(0.0, spacing.y), size) +
              ImageClamp(uv - float2(0.0, spacing.y), size)) * 2.0;
    value += ImageClamp(uv + spacing, size) +
             ImageClamp(uv - spacing, size) +
             ImageClamp(uv + float2(spacing.x, -spacing.y), size) +
             ImageClamp(uv + float2(-spacing.x, spacing.y), size);
    return value * (1.0 / 16.0);
}`;

    const warpShader = `
Texture2D Image : register(t0);
SamplerState Filter : register(s0);

cbuffer FeedbackConstants : register(b0) {
    float2 viewportSize;
    float time;
    float padding;
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

${imageSampling}

float2 WarpVertexUV(float2 uvOriginal, float2 size) {
    float2 aspect = min(float2(1.0, 1.0),
                        float2(size.x / size.y, size.y / size.x));
    // MilkDrop's mesh coordinates use bottom-up Y; convert the shader's
    // top-down screen coordinates before applying the native warp equations.
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);
    float2 uv = float2(
        0.5 + vertexPos.x * aspect.x * 0.5,
        0.5 - vertexPos.y * aspect.y * 0.5);

    float2 center = float2(0.5, 0.5);
    uv = (uv - center) / float2(1.81670, 1.79871) + center;

    float warpTime = time;
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    float warpAmount = 0.80322 * 0.0035;
    float uDelta = sin(warpTime * 0.333 +
        vertexPos.x * factors.x - vertexPos.y * factors.w);
    uDelta += cos(warpTime * 0.753 -
        vertexPos.x * factors.y + vertexPos.y * factors.z);
    float vDelta = cos(warpTime * 0.375 -
        vertexPos.x * factors.z - vertexPos.y * factors.y);
    vDelta += sin(warpTime * 0.825 +
        vertexPos.x * factors.x + vertexPos.y * factors.w);
    uv += warpAmount * float2(uDelta, vDelta);

    float rotation = 0.004;
    float rotationSine;
    float rotationCosine;
    sincos(rotation, rotationSine, rotationCosine);
    float2 centered = uv - center;
    uv = float2(
        rotationCosine * centered.x - rotationSine * centered.y,
        rotationSine * centered.x + rotationCosine * centered.y) + center;

    uv -= float2(-0.012, -0.004);
    uv = 0.5 + (uv - 0.5) / aspect;
    return uv;
}

float2 MeshUV(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;
    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    // The native mesh's diagonal is 00--11 in top-down coordinates.
    float2 result;
    if (f.x >= f.y) {
        float2 a = WarpVertexUV(corner00, size);
        float2 b = WarpVertexUV(corner10, size);
        float2 c = WarpVertexUV(corner11, size);
        result = (1.0 - f.x) * a + (f.x - f.y) * b + f.y * c;
    } else {
        float2 a = WarpVertexUV(corner00, size);
        float2 b = WarpVertexUV(corner01, size);
        float2 c = WarpVertexUV(corner11, size);
        result = (1.0 - f.y) * a + (f.y - f.x) * b + f.x * c;
    }
    return result;
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uvOriginal = input.sceneSpacePos.xy / size;
    float2 texelUv = input.texelSpacePos.xy;
    float2 meshUv = MeshUV(uvOriginal, size);
    float2 uv = texelUv + (meshUv - uvOriginal);

    float3 history = ImageWrap(uv, size);
    float3 glow = LocalGlow(uv, size);
    float3 result = (history + glow * 0.4) * 0.41;
    return float4(saturate(result), 1.0);
}`;

    const compShader = `
Texture2D Image : register(t0);
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

${imageSampling}

float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 uv = input.texelSpacePos.xy;
    float3 glow = LocalGlow(uv, size);
    float3 result = (ImageWrap(uv, size) + glow) * 2.70;
    return float4(saturate(result), 1.0);
}`;

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0140",
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
