// MilkDrop 0190 — XY Oscillation Spiral
//
// The native vectorscope source supplies synchronized left/right PCM data.
// Three HLSL programs convert that data into a recursive visualization:
//   shader   - draws the current, rotating XY spiral from stereo PCM;
//   feedback - warps the previous history image into a new background;
//   post     - combines the completed history with a shifted copy.
//
// The renderer accumulates a history on scheduled feedback steps:
// warp the previous image, composite the new source image and save the result.
// The post pass affects display only and is never saved to the history.
//
// TARGET_FPS controls feedback-history updates and repaint.
// Per-frame transforms, decay and source opacity are normalized to the
// preset's original 30-Hz cadence.
// The shader intentionally uses a 129-vertex software-rasterized polyline;
// its per-pixel distance calculations are relatively GPU-intensive.

// Loaded by Shader - MilkDrop ALL.js. The factory has no panel/timer side effects.
MilkDropPresets["0190"] = function (TARGET_FPS) {

    const updateIntervalMs = 17; // Audio analysis interval, independent of render FPS.

    // 1. Stereo PCM input. These settings are the vectorscope source defaults.
    const source = {
        leftChannel: 0,  // Default: 0; also accepts a vis.AudioFormat channel name; angular displacement.
        rightChannel: 1, // Default: 1; also accepts a vis.AudioFormat channel name; radial displacement.
        durationMs: 40,  // Default: 40 ms; allowed: integer 10..500 ms; audio window.
        points: 1024     // Default: 1024; allowed: integer 32..8192; paired PCM samples for HLSL.
    };

    // 2. Source shader. Reads PCM at t0/t1; b0 contains viewportSize, time,
    //    pointCount. Its RGBA output represents only the current waveform.
    const shader = `
// Rasterize the mode-1 XY oscillation spiral from stereo PCM.
// t0 holds the left channel; t1 holds the right channel. Both contain
// synchronized, normalized float samples provided by VectorscopeSource.
Texture2D<float> LeftPCM : register(t0);
Texture2D<float> RightPCM : register(t1);

cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
    float frameStep; // 60-Hz units, matched to feedback history cadence.
};

struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};

float DistanceToSegment(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float t = saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-5));
    return length(p - a - ab * t);
}

// Build the spiral from 129 vertices selected within the first 256 frames.
// The +32 sample offset supplies the left-channel phase used by mode 1;
// the right channel controls radius. Reducing the polyline vertex count
// limits the work performed by every pixel of this HLSL renderer.
float2 SpiralPoint(int vertex, int count, float2 viewport) {
    int available = min(max(count - 32, 1), 256);
    int samples = min(129, available);
    int i = min(available - 1, (int)round((float)vertex * (float)(available - 1) / max(1.0, (float)(samples - 1))));
    float l = clamp(LeftPCM.Load(int3(i + 32, 0, 0)).r, -1.0, 1.0);
    float r = clamp(RightPCM.Load(int3(i, 0, 0)).r, -1.0, 1.0);

    // Preset fWaveScale. The PCM input is already normalized to [-1, 1].
    const float waveScale = 1.285746;
    float radius = 0.53 + 0.43 * (r * waveScale);
    float angle = (l * waveScale) * 1.57 + time * 2.3;
    float radiusPx = 0.5 * min(viewport.x, viewport.y) * radius;
    return 0.5 * viewport + radiusPx * float2(cos(angle), -sin(angle));
}

float4 main(VS_OUTPUT input) : SV_Target {
    float2 viewport = max(viewportSize, float2(1.0, 1.0));
    int count = (int)pointCount;
    if (count < 64) return float4(0.0, 0.0, 0.0, 0.0);

    float2 p = input.sceneSpacePos.xy;
    float2 centerDelta = p - viewport * 0.5;
    if (length(centerDelta) > 0.61 * min(viewport.x, viewport.y))
        return float4(0.0, 0.0, 0.0, 0.0);

    // Reject pixels outside the spiral's reachable angular sector.
    // This is a performance optimization: such pixels cannot touch the line.
    float angleToPixel = atan2(-centerDelta.y, centerDelta.x);
    float relativeAngle = atan2(sin(angleToPixel - time * 2.3),
                                cos(angleToPixel - time * 2.3));
    if (abs(relativeAngle) > 2.10 && length(centerDelta) > 4.0)
        return float4(0.0, 0.0, 0.0, 0.0);

    int available = min(max(count - 32, 1), 256);
    int vertexCount = min(129, available);

    // Smooth each polyline section by inserting a four-point interpolated
    // midpoint, then measure the pixel's distance to the resulting segments.
    // Smooth coverage below produces an antialiased, thin waveform.
    float2 prev = SpiralPoint(0, count, viewport);
    float2 a = prev;
    float2 b = SpiralPoint(1, count, viewport);
    float nearest = 1e6;
    [loop]
    for (int segment = 0; segment < vertexCount - 1; ++segment) {
        float2 c = SpiralPoint(min(segment + 2, vertexCount - 1), count, viewport);
        float2 mid = (-0.15 * prev + 1.15 * a + 1.15 * b - 0.15 * c) * 0.5;
        nearest = min(nearest, DistanceToSegment(p, a, mid));
        nearest = min(nearest, DistanceToSegment(p, mid, b));
        prev = a;
        a = b;
        b = c;
    }

    float coverage30 = 1.0 - smoothstep(0.15, 1.45, nearest);
    float coverage = coverage30; // No pow() at the 30-Hz reference.
    [branch]
    if (frameStep < 2.0)
        coverage = 1.0 - pow(saturate(1.0 - coverage30), frameStep * 0.5);
    // Slowly cycle RGB and normalize the brightest channel to 1, following
    // the preset's wave_r/g/b expressions and bMaximizeWaveColor=1.
    float3 rgb = saturate(float3(0.65, 0.65, 0.65) +
        0.5 * sin(time * float3(1.13, 1.23, 1.33)));
    rgb /= max(max(rgb.r, rgb.g), max(rgb.b, 1e-4));
    // Modern DrawWave rounds vertex color before rasterization.
    rgb = floor(saturate(rgb) * 255.0 + 0.5) / 255.0;
    // Premultiplied RGBA: the color and the alpha both follow line coverage.
    // The renderer composites this image over the warped history.
    return float4(rgb * coverage, coverage); // Premultiplied alpha.
}`;

    // 3. Feedback shader. Reads the previous history image at t0/s0.
    //    b0 contains viewportSize, time and frameStep (time in 60-Hz frames).
    //    Its output becomes the background for the current source image.
    const warpShader = `Texture2D Previous : register(t0);
SamplerState PreviousSampler : register(s0);

cbuffer WarpConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};

// The previous image is warped via a 48x36 triangle grid.
// UV coordinates are transformed at grid corners and linearly interpolated
// within each triangle to reproduce mesh-based deformation in a pixel shader.
struct VS_OUTPUT {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
    float4 texelSpacePos : TEXEL_POS;
};

// No texture wrapping: coordinates outside the history image are black.
float3 History(float2 uv) {
    if (any(uv < float2(0.0, 0.0)) || any(uv > float2(1.0, 1.0)))
        return float3(0.0, 0.0, 0.0);
    return Previous.SampleLevel(PreviousSampler, uv, 0.0).rgb;
}

// Vertex deformation from the preset's per_pixel expressions.
// The angular zoom, time-dependent rotation and slight axis stretching
// create and rotate the characteristic multi-petal shape.
float2 WarpVertexUV(float2 uvOriginal, float2 size) {
    // frameStep is expressed in 60-Hz frames; use 30-Hz units for this
    // preset's per-frame deformation and color-retention constants.
    float step30 = max(frameStep * 0.5, 0.0005);
    float2 p = uvOriginal - float2(0.5, 0.5);
    // Aspect-correct the coordinates used for zoom and rotation.
    float2 aspect = float2(size.x / size.y, 1.0);
    float2 polar = p * aspect;
    // MilkDrop-style radial coordinate: x/y range [-1,1] at grid edges;
    // aspect coefficients never exceed 1, so circles remain undistorted.
    // The viewport dimensions determine the aspect in this implementation.
    float2 milkAspect = min(float2(1.0, 1.0),
                            float2(size.x / size.y, size.y / size.x));
    float rad = length(2.0 * p * milkAspect);
    // Screen-space angle (Y points downward in Direct2D).
    float ang = atan2(-polar.y, polar.x);

    float zoom = 0.999513;
    zoom += 0.05 * (sin(6.0 * ang) +
        0.3 * sin(sin(time * 2.0 * sin(time) * rad)) - 0.1 * cos(rad));
    if (rad < 0.5)
        zoom -= 0.05 * (1.0 - rad);
    zoom = max(0.35, zoom);

    float rot = 0.5 * sin(0.5 - rad) * cos(0.02 * (0.5 - rad) + time);
    float sx = 1.0;
    float sy = 1.0;
    if (sin(time) < 0.0)
        sx += 0.01 * (0.99 - rad) * sin(0.733 * time);
    if (sin(time) > 0.0)
        sy += 0.01 * (0.99 - rad) * cos(0.953 * time);

    // Apply zoom and anisotropic stretch before rotation.
    float2 uv = (polar / max(float2(sx, sy) *
        pow(zoom, step30), float2(0.1, 0.1))) / aspect + 0.5;

    // Add the preset's built-in, slowly animated warp displacement.
    // Values correspond to fWarpAnimSpeed=1, fWarpScale=1.331 and warp=0.0101.
    // Flip the Y displacement for Direct2D's screen coordinates.
    float warpTime = time;
    float2 vertexPos = float2(2.0 * uvOriginal.x - 1.0,
                              1.0 - 2.0 * uvOriginal.y);
    float4 factors = float4(
        11.68 + 4.0 * cos(warpTime * 1.413 + 10.0),
         8.77 + 3.0 * cos(warpTime * 1.113 +  7.0),
        10.54 + 3.0 * cos(warpTime * 1.233 +  3.0),
        11.49 + 4.0 * cos(warpTime * 0.933 +  5.0));
    float warpAmount = 0.0101 * 0.0035 * step30;
    float scaleInverse = 1.0 / 1.331;
    float uDelta = sin(warpTime * 0.333 + scaleInverse *
        (vertexPos.x * factors.x - vertexPos.y * factors.w));
    uDelta += cos(warpTime * 0.753 - scaleInverse *
        (vertexPos.x * factors.y - vertexPos.y * factors.z));
    float vDelta = cos(warpTime * 0.375 - scaleInverse *
        (vertexPos.x * factors.z + vertexPos.y * factors.y));
    vDelta += sin(warpTime * 0.825 + scaleInverse *
        (vertexPos.x * factors.x + vertexPos.y * factors.w));
    uv += warpAmount * float2(uDelta, -vDelta);

    float theta = rot * step30;
    float s = sin(theta);
    float c = cos(theta);
    float2 v = (uv - 0.5) * aspect;
    float2 rotated = float2(c * v.x - s * v.y,
                             s * v.x + c * v.y);
    return rotated / aspect + 0.5;
}

// Each cell of the 48x36 grid consists of two triangles. Interpolate
// their corner UVs with barycentric weights, instead of evaluating the
// nonlinear warp separately at every output pixel.
float2 MeshUV(float2 uvOriginal, float2 size) {
    const float2 grid = float2(48.0, 36.0);
    float2 scaled = saturate(uvOriginal) * grid;
    float2 cell = min(floor(scaled), grid - 1.0);
    float2 f = scaled - cell;

    float2 corner00 = cell / grid;
    float2 corner10 = (cell + float2(1.0, 0.0)) / grid;
    float2 corner01 = (cell + float2(0.0, 1.0)) / grid;
    float2 corner11 = (cell + float2(1.0, 1.0)) / grid;

    float2 result;
    if (f.x + f.y <= 1.0) {
        float2 a = WarpVertexUV(corner00, size);
        float2 b = WarpVertexUV(corner10, size);
        float2 c = WarpVertexUV(corner01, size);
        result = (1.0 - f.x - f.y) * a + f.x * b + f.y * c;
    } else {
        float2 a = WarpVertexUV(corner10, size);
        float2 b = WarpVertexUV(corner01, size);
        float2 c = WarpVertexUV(corner11, size);
        result = (1.0 - f.y) * a + (1.0 - f.x) * b +
                 (f.x + f.y - 1.0) * c;
    }
    return result;
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
    float2 uvOriginal = input.sceneSpacePos.xy / size;

    float2 uv = MeshUV(uvOriginal, size);

    // Translate from D2D's sampling UV to the displaced history location.
    // Combine two nearby history samples to produce layered, trailing lines.
    float2 baseUV = input.texelSpacePos.xy;
    float2 fetch = baseUV + (uv - uvOriginal);
    float2 trailing = lerp(fetch, baseUV, 0.33);
    // Scale the trail retention according to elapsed frame time.
    float step30 = max(frameStep * 0.5, 0.0005);
    float3 ret = max(History(fetch),
                     History(trailing) * pow(0.95, step30));

    // Fade the old colors each step, including a slight additional reduction
    // near the warp's center. This controls how long old petals remain visible.
    float center = 1.0 - saturate(length(uv - uvOriginal) * 40.0);
    float decay = pow(0.99, step30);
    float bias30 = 0.0025 + center * 0.003;
    ret = ret * decay - bias30 / 0.01 * (1.0 - decay);
    ret=DitherDecay(ret,decay,bias30/.01*(1-decay),.99,bias30,input.sceneSpacePos.xy);
    return float4(saturate(ret), 1.0);
}`;

    // 4. Final image shader. Reads the completed history at t0/s0. The
    //    RGB maximum of two offset samples emphasizes layered, colored trails.
    //    This pass does not modify the feedback history.
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
float3 SampleFrame(float2 uv) {
    // Keep the background black when the shifted sample goes offscreen.
    if (any(uv < float2(0.0, 0.0)) || any(uv > float2(1.0, 1.0)))
        return float3(0.0, 0.0, 0.0);
    return Frame.SampleLevel(Filter, uv, 0.0).rgb;
}
float4 main(PSInput p) : SV_Target {
    float2 uv = p.texelSpacePos.xy;
    float2 shift = 0.06 * float2(cos(uv.y * 13.5), sin(uv.x * 19.5));
    float3 result = max(SampleFrame(uv), SampleFrame(uv + shift));
    return float4(result, 1.0);
}`;

    // 5. Run the pipeline. In the options object, `shader` is shorthand for
    //    `shader: shader`; feedback and post refer to the two image shaders.
    //    Feedback advances at the chosen interval rather than on every Draw().

    // Return the source settings and the ordinary CreateAsync renderer.
    return {
        name: "0190",
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
