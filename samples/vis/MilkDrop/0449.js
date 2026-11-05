// MilkDrop 0449 — plasma transition: R234 / Purple Lava.
// Original: original/0449.milk2, both embedded presets read in full.
//
// Purple Lava draws a normal black shape, five additive radial shapes and a
// normal red custom wave; R234 draws a thick additive custom wave. During the
// transition those primitives remain global and use the native .47/.53 alpha
// weights. The spatial plasma field affects the blended warp mesh and the two
// composite passes, not source geometry.
//
// The installed 0.10.0 component's plasma branch is a deterministic recursive
// subdivision of the 48x36 mesh. Its five perturbations are the stored
// random_1..5 values (rather than calls to a process-global PRNG). The helper
// below evaluates that construction along the path to a requested mesh vertex,
// retaining runtime aspect correction and native triangle interpolation.
//
// The compact symmetric exponential PCM kernel represents the verified native
// forward/backward IIR. Expanding the exact IIR for each of 480 dots would make
// the per-pixel source shader impractically expensive.
function MilkDrop0449PlasmaHlsl() {
    return `
float PlasmaVertex(int2 target, float2 aspect) {
    int x0 = 0, x1 = 48, y0 = 0, y1 = 36;
    float dt = .25;
    float topLeft = .112, topRight = .841, bottomLeft = .010, bottomRight = .694;
    [fastopt] for (int level = 0; level < 8; ++level) {
        if (all(target == int2(x0, y0)))
            return topLeft;
        if (all(target == int2(x1, y0)))
            return topRight;
        if (all(target == int2(x0, y1)))
            return bottomLeft;
        if (all(target == int2(x1, y1)))
            return bottomRight;
        int middleX = (x0 + x1) >> 1, middleY = (y0 + y1) >> 1;
        bool wide = x1 - x0 >= 2, tall = y1 - y0 >= 2;
        float left = 0, right = 0, top = 0, bottom = 0;
        if (tall) {
            left = (topLeft + bottomLeft) * .5 + (x0 == 0 ? -.59 : -.776) * dt * aspect.y;
            right = (topRight + bottomRight) * .5 - .776 * dt * aspect.y;
            if (all(target == int2(x0, middleY)))
                return left;
            if (all(target == int2(x1, middleY)))
                return right;
        }
        if (wide) {
            top = (topLeft + topRight) * .5 + (y0 == 0 ? .682 : -.98) * dt * aspect.x;
            bottom = (bottomLeft + bottomRight) * .5 - .98 * dt * aspect.x;
            if (all(target == int2(middleX, y0)))
                return top;
            if (all(target == int2(middleX, y1)))
                return bottom;
        }
        if (wide && tall) {
            float centre = (left + right + top + bottom) * .25 + .388 * dt;
            if (all(target == int2(middleX, middleY)))
                return centre;
            bool useRight = target.x > middleX, useBottom = target.y > middleY;
            if (!useRight && !useBottom) {
                topRight = top;
                bottomLeft = left;
                bottomRight = centre;
                x1 = middleX;
                y1 = middleY;
            } else if (useRight && !useBottom) {
                topLeft = top;
                bottomLeft = centre;
                bottomRight = right;
                x0 = middleX;
                y1 = middleY;
            } else if (!useRight && useBottom) {
                topLeft = left;
                topRight = centre;
                bottomRight = bottom;
                x1 = middleX;
                y0 = middleY;
            } else {
                topLeft = centre;
                topRight = right;
                bottomLeft = bottom;
                x0 = middleX;
                y0 = middleY;
            }
            dt *= .5;
        } else
            return topLeft;
    }
    return topLeft;
}
float PlasmaMinimum(float2 aspect) {
    float3 basis = float3(1, aspect);
    return min(min(dot(float3(.1275625, -.245, 0), basis), dot(float3(.0817304687, -.0850917969, -.138763672), basis)),
               dot(float3(.0450625, 0, -.19359375), basis));
}
float PlasmaMaximum(float2 aspect) {
    float3 basis = float3(1, aspect);
    return max(max(dot(float3(.784046875, .1065625, 0), basis), .841),
               max(dot(float3(.829609375, .03196875, 0), basis), dot(float3(.81821875, .05328125, 0), basis)));
}
float PlasmaWeight(int2 vertex, float2 aspect, float minimum, float maximum) {
    float normalized = (PlasmaVertex(vertex, aspect) - minimum) / max(maximum - minimum, 1e-7);
    return saturate((normalized - .4610745) / .14665);
}
float PlasmaMask(float2 uv, float2 size) {
    const float2 grid = float2(48, 36);
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float minimum = PlasmaMinimum(aspect), maximum = PlasmaMaximum(aspect);
    float2 scaled = saturate(uv) * grid, cell = min(floor(scaled), grid - 1), f = scaled - cell;
    bool lower = f.x + f.y <= 1;
    int2 c0 = int2(lower ? cell : cell + float2(1, 0)), c1 = int2(lower ? cell + float2(1, 0) : cell + float2(0, 1)),
         c2 = int2(lower ? cell + float2(0, 1) : cell + 1);
    float3 weights = lower ? float3(1 - f.x - f.y, f.x, f.y) : float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    int2 vertices[3] = {c0, c1, c2};
    float result = 0;
    [fastopt] for (int corner = 0; corner < 3; ++corner) result +=
        weights[corner] * PlasmaWeight(vertices[corner], aspect, minimum, maximum);
    return result;
}
`;
}
MilkDropPresets["0449"] = function (TARGET_FPS) {
    const plasmaHlsl = MilkDrop0449PlasmaHlsl();
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
struct PSInput {
    float4 clipSpacePos : SV_POSITION;
    float4 sceneSpacePos : SCENE_POS;
};
float3 PackPositive(float value) {
    value = max(value, 0);
    value = value / (1 + value);
    float3 packed = frac(min(value, .999999) * float3(1, 255, 65025));
    return packed - packed.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float PCM(Texture2D<float> channel, int index, int count) {
    int start = max(count - 480, 0);
    return clamp(channel.Load(int3(clamp(start + index, 0, count - 1), 0, 0)).r, -1, 1);
}
float SmoothPCM(Texture2D<float> channel, int index, int count) {
    float value = 0, weight = 0;
    [fastopt] for (int tap = -8; tap <= 8; ++tap) {
        float w = pow(.7, abs((float)tap));
        value += PCM(channel, clamp(index + tap, 0, 479), count) * w;
        weight += w;
    }
    return value / max(weight, 1e-6);
}
float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    return length(p - a - ab * saturate(dot(p - a, ab) / max(dot(ab, ab), 1e-7)));
}
float2 WavePoint16(int index, int count, float2 size) {
    index = clamp(index, 0, 15);
    float left = SmoothPCM(LeftPCM, 232 + index, count) * 2.446336;
    float right = SmoothPCM(RightPCM, 232 + index, count) * 2.446336;
    float2 inverseAspect = max(float2(1, 1), float2(size.y / size.x, size.x / size.y));
    return float2(.5 + left * inverseAspect.x, .5 - right * inverseAspect.y) * size;
}
float R234Wave(float2 pixel, int count, float2 size) {
    float4 nearest = 1e6;
    [fastopt] for (int i = 0; i < 15; ++i) {
        float2 below = WavePoint16(i - 1, count, size), a = WavePoint16(i, count, size),
               b = WavePoint16(i + 1, count, size), above2 = WavePoint16(i + 2, count, size);
        float2 middle = (-.15 * below + 1.15 * a + 1.15 * b - .15 * above2) * .5;
        float2 aa[2] = {a, middle}, bb[2] = {middle, b};
        [unroll] for (int segment = 0; segment < 2; ++segment) {
            nearest.x = min(nearest.x, SegmentDistance(pixel, aa[segment], bb[segment]));
            nearest.y = min(nearest.y, SegmentDistance(pixel, aa[segment] + float2(1, 0), bb[segment] + float2(1, 0)));
            nearest.z =
                min(nearest.z, SegmentDistance(pixel, aa[segment] + float2(1, -1), bb[segment] + float2(1, -1)));
            nearest.w =
                min(nearest.w, SegmentDistance(pixel, aa[segment] + float2(0, -1), bb[segment] + float2(0, -1)));
        }
    }
    float4 part = 1 - smoothstep(.15, 1.1, nearest);
    return 1 - (1 - part.x) * (1 - part.y) * (1 - part.z) * (1 - part.w);
}
float CircleCoordinate(float2 uv, float2 centre, float2 size) {
    return length((uv - centre) * size) * 2 / min(size.x, size.y);
}
float Coverage(float radius, float distanceToCentre, float2 size) {
    float feather = 2 / min(size.x, size.y);
    return 1 - smoothstep(radius - feather, radius + feather, distanceToCentre);
}
float4 Over(float4 front, float4 back) {
    return float4(front.rgb + back.rgb * (1 - front.a), front.a + back.a * (1 - front.a));
}
float4 main(PSInput input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    int count = (int)pointCount;
    if (pixel.y == 0 && pixel.x < 6)
        return float4(PackPositive(RelativeBands.Load(int3(pixel.x, 0, 0)).r), 1);
    if (count < 480)
        return 0;
    float step30 = max(frameStep * .5, .0001), bassAtt = max(RelativeBands.Load(int3(3, 0, 0)).r, 0),
          midAtt = max(RelativeBands.Load(int3(4, 0, 0)).r, 0);
    float p1Coverage = R234Wave(input.sceneSpacePos.xy, count, size) * step30 * .53;
    float4 p1 = float4(p1Coverage.xxx, 0);
    // Shape 0 init calls absent int(); per-frame compiles separately, with ro=0.
    float d0 = CircleCoordinate(uv, float2(.5, .485), size);
    float shape0 = Coverage(.06623, d0, size) * saturate(1 - d0 / .06623);
    float4 p2 = float4(0, 0, 0, .1 * shape0 * .47);
    // DrawCustomShapes supplies instance=0..3. EEL division by zero yields zero.
    float phase = time * 15;
    [unroll] for (int instance = 0; instance < 4; ++instance) {
        float angle = time / (float)max(instance, 1) * .7 * (instance > 0 ? 1 : 0);
        float2 centre = float2(.5 + .225 * sin(angle), .5 + .3 * cos(angle));
        centre -= .4 * centre * float2(sin(time), cos(time));
        float radius = .1 * midAtt, dist = CircleCoordinate(uv, centre, size),
              radial = Coverage(radius, dist, size) * saturate(1 - dist / max(radius, 1e-6));
        float3 colour = .5 + .5 * sin(phase + float3(0, 4.188, 2.094));
        p2.rgb += colour * radial * step30 * .47;
    }
    float2 centre2 = float2(.5 + .225 * sin(time + 2.09), .5 + .3 * cos(time + 2.09));
    float radius2 = .1 * bassAtt, dist2 = CircleCoordinate(uv, centre2, size),
          radial2 = Coverage(radius2, dist2, size) * saturate(1 - dist2 / max(radius2, 1e-6));
    float3 colour2 =
        float3(.464 + .464 * sin(time * 13.92), .46 + .46 * sin(time * 13.8 + 3.6436), .5 + .5 * sin(phase + 2.094));
    p2.rgb += colour2 * radial2 * step30 * .47;
    // Native requests 512 non-spectrum samples although only 480 are valid in
    // this build. Clamp rather than reproducing its undefined out-of-bounds tail.
    float dotHit = 0, halfSize = size.x >= 1024 ? 1.5 : 1;
    [fastopt] for (int sampleIndex = 0; sampleIndex < 480; ++sampleIndex) {
        float left = SmoothPCM(LeftPCM, sampleIndex, count) * .410276,
              right = SmoothPCM(RightPCM, sampleIndex, count) * .410276;
        float2 inverseAspect = max(float2(1, 1), float2(size.y / size.x, size.x / size.y));
        float2 centre = float2(.5 + left * inverseAspect.x, .5 - right * inverseAspect.y) * size;
        dotHit = max(dotHit, all(abs(input.sceneSpacePos.xy - centre) <= halfSize) ? 1 : 0);
    }
    float waveAlpha = dotHit * .47;
    p2 = Over(float4(.9 * waveAlpha, 0, 0, waveAlpha), p2);
    p2.rgb += p1.rgb;
    return saturate(p2);
}
`;

    const feedback = `
Texture2D Previous : register(t0);
SamplerState Filter : register(s0);
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
${plasmaHlsl}
float UnpackPositive(float3 packed) {
    float unit = min(dot(packed, float3(1, 1.0 / 255, 1.0 / 65025)), .999999);
    return unit / (1 - unit);
}
float ReadControl(int index) {
    return UnpackPositive(Previous.Load(int3(index, 0, 0)).rgb);
}
int WrapIndex(int value, int size) {
    int result = value % size;
    return result < 0 ? result + size : result;
}
float3 Texel(int2 p, int2 dimensions) {
    p = int2(WrapIndex(p.x, dimensions.x), WrapIndex(p.y, dimensions.y));
    if (p.y == 0 && p.x < 6)
        return 0;
    return Previous.Load(int3(p, 0)).rgb;
}
float3 History(float2 uv, float2 size) {
    int2 dimensions = max(int2(size), 1);
    float2 xy = frac(uv) * size - .5;
    int2 base = int2(floor(xy));
    float2 f = frac(xy);
    return lerp(lerp(Texel(base, dimensions), Texel(base + int2(1, 0), dimensions), f.x),
                lerp(Texel(base + int2(0, 1), dimensions), Texel(base + 1, dimensions), f.x),
                f.y);
}
float3 Blur1(float2 uv, float2 size) {
    float2 offsets[12] = {float2(2, 0),
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
    float3 value = History(uv, size) * 4;
    [fastopt] for (int tap = 0; tap < 12; ++tap) value += History(uv + offsets[tap] / size, size) * (tap < 4 ? 2 : 1);
    return value / 20;
}
float2 BuiltInVertex(float2 original,
                     float2 size,
                     float zoom,
                     float rotation,
                     float2 centre,
                     float warpAmount,
                     float warpScale,
                     float warpSpeed,
                     float step30) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float zoomStep = pow(max(zoom, 1e-5), step30);
    float2 uv = float2(.5 + vertex.x * aspect.x * .5 / zoomStep, .5 - vertex.y * aspect.y * .5 / zoomStep);
    float2 delta = uv - centre;
    float c = cos(rotation * step30), s = sin(rotation * step30);
    uv = centre + float2(c * delta.x - s * delta.y, s * delta.x + c * delta.y);
    float4 factors = float4(11.68 + 4 * cos(time * 1.413 + 10),
                            8.77 + 3 * cos(time * 1.113 + 7),
                            10.54 + 3 * cos(time * 1.233 + 3),
                            11.49 + 4 * cos(time * .933 + 5));
    float amount = .0035 * warpAmount * step30;
    uv.x +=
        amount * (sin(time * warpSpeed * .333 + vertex.x * factors.x / warpScale - vertex.y * factors.w / warpScale) +
                  cos(time * warpSpeed * .753 - vertex.x * factors.y / warpScale + vertex.y * factors.z / warpScale));
    uv.y +=
        amount * (cos(time * warpSpeed * .375 - vertex.x * factors.z / warpScale - vertex.y * factors.y / warpScale) +
                  sin(time * warpSpeed * .825 + vertex.x * factors.x / warpScale + vertex.y * factors.w / warpScale));
    return .5 + (uv - .5) / aspect + .5 / size;
}
float2 P1Vertex(float2 original, float2 size, float step30, float bass, float bassAtt, float mid, float trebAtt) {
    float vol = (bass + mid) / 6;
    float rotation = .01 * (1 - trebAtt) + .03 * (.6 * sin(.381 * time) + .4 * sin(.479 * time));
    float2 centre = float2(.5 + .41 * (.6 * sin(.374 * time) + .4 * sin(.294 * time)),
                           .5 + .41 * (.6 * sin(.393 * time) + .4 * sin(.223 * time)));
    return BuiltInVertex(
        original, size, 1.0201 * (1 - .02 * bassAtt), rotation, centre, .81954 * vol, 16.217, 9.861, step30);
}
float2 P2Vertex(float2 original, float2 size, float step30, float bass) {
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 vertex = float2(original.x * 2 - 1, 1 - original.y * 2);
    float rad = length(vertex * aspect), ang = atan2(vertex.y * aspect.y, vertex.x * aspect.x);
    float zoom = .99245 + .02 * cos(rad * 16 + ang * 3 - time * 3.5) * (bass / 3 - rad);
    return BuiltInVertex(original, size, zoom, .0279 * (.8 - rad), float2(.5, .495), .36278, 4.365, 1, step30);
}
float2 MeshUV(
    float2 original, float2 size, float step30, float bass, float bassAtt, float mid, float trebAtt, out float blend) {
    const float2 grid = float2(48, 36);
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float minimum = PlasmaMinimum(aspect), maximum = PlasmaMaximum(aspect);
    float2 scaled = saturate(original) * grid;
    int2 cell = min(int2(floor(scaled)), int2(47, 35));
    float2 f = scaled - cell;
    bool lower = f.x + f.y <= 1;
    int2 corners[3];
    if (lower) {
        corners[0] = cell;
        corners[1] = cell + int2(1, 0);
        corners[2] = cell + int2(0, 1);
    } else {
        corners[0] = cell + int2(1, 0);
        corners[1] = cell + int2(0, 1);
        corners[2] = cell + 1;
    }
    float3 weights = lower ? float3(1 - f.x - f.y, f.x, f.y) : float3(1 - f.y, 1 - f.x, f.x + f.y - 1);
    float2 result = 0;
    blend = 0;
    [fastopt] for (int corner = 0; corner < 3; ++corner) {
        float vertexBlend = PlasmaWeight(corners[corner], aspect, minimum, maximum);
        float2 cornerUV = float2(corners[corner]) / grid;
        float2 p1 = P1Vertex(cornerUV, size, step30, bass, bassAtt, mid, trebAtt),
               p2 = P2Vertex(cornerUV, size, step30, bass);
        result += weights[corner] * lerp(p1, p2, vertexBlend);
        blend += weights[corner] * vertexBlend;
    }
    return result;
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), original = input.sceneSpacePos.xy / size;
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x < 6)
        return 0;
    float step30 = max(frameStep * .5, .0001);
    float bass = ReadControl(0), mid = ReadControl(1), bassAtt = ReadControl(3), trebAtt = ReadControl(5), blend = 0;
    float2 uv = MeshUV(original, size, step30, bass, bassAtt, mid, trebAtt, blend);
    float3 first = History(uv, size);
    float2 motion = uv - original;
    float3 p1 = History(original + motion * dot(first, float3(.299, .587, .114)), size);
    float multiplier = pow(.99, step30), subtract = .002 * (1 - multiplier) / (1 - .99);
    p1 = p1 * multiplier - subtract;
    float2 d = 4 / size;
    float2 blurUV[5] = {
        frac(uv + float2(d.x, 0)), frac(uv - float2(d.x, 0)), frac(uv + float2(0, d.y)), frac(uv - float2(0, d.y)), uv};
    float3 blurValue[5];
    [fastopt] for (int blurIndex = 0; blurIndex < 5; ++blurIndex) blurValue[blurIndex] = Blur1(blurUV[blurIndex], size);
    float3 dx = blurValue[0] - blurValue[1], dy = blurValue[2] - blurValue[3], b = blurValue[4], p2 = 0;
// Preserve the 30..120-Hz resampling compensation; above 120 Hz
// keep the same displacement budget per second as at 120 Hz.
    float flow = step30 * pow(max(step30, .25), -.32);
    float2 sampleUV = uv + (float2(dx.y, dy.y) * 4 / size + float2(dx.x, dy.x) * 16 / size) * flow;
    p2.y = History(sampleUV, size).y;
    p2.y += (p2.y - b.y) * .042 * step30 - .00735 * step30;
    sampleUV = uv + (float2(dx.x, dy.x) * 4 / size + float2(dx.z, dy.z) * 16 / size) * flow;
    p2.x = History(sampleUV, size).x;
    p2.x += (p2.x - b.x) * .042 * step30 - .00735 * step30;
    sampleUV = uv + (float2(dx.z, dy.z) * 4 / size + float2(dx.y, dy.y) * 16 / size) * flow;
    p2.z = History(sampleUV, size).z;
    p2.z += (p2.z - b.z) * .042 * step30 - .00735 * step30;
    return float4(saturate(lerp(p1, p2, blend)), 1);
}
`;

    const post = `
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
${plasmaHlsl}
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv);
    float2 pixel = floor(uv * size);
    if (pixel.y == 0 && pixel.x < 6)
        return 0;
    return Frame.SampleLevel(Filter, TextureUV(uv, origin, scale), 0).rgb;
}
float3 Blur(float2 uv, float2 size, float2 origin, float2 scale, float radius) {
    float2 offsets[12] = {float2(1, 0),
                          float2(-1, 0),
                          float2(0, 1),
                          float2(0, -1),
                          float2(1, 1),
                          float2(-1, 1),
                          float2(1, -1),
                          float2(-1, -1),
                          float2(2, 0),
                          float2(-2, 0),
                          float2(0, 2),
                          float2(0, -2)};
    float3 value = Image(uv, size, origin, scale) * 4;
    [fastopt] for (int tap = 0; tap < 12; ++tap) value +=
        Image(uv + offsets[tap] * radius / size, size, origin, scale) * (tap < 4 ? 2 : 1);
    return value / 20;
}
float3 Composite(float2 uv, float2 size, float2 origin, float2 scale, bool second) {
    float2 d = 1 / size;
    float3 dx = Image(uv + float2(d.x, 0), size, origin, scale) - Image(uv - float2(d.x, 0), size, origin, scale),
           dy = Image(uv + float2(0, d.y), size, origin, scale) - Image(uv - float2(0, d.y), size, origin, scale);
    float2 dz = float2(dx.y, dy.y) * 3;
    d = 2 / size;
    dx = Blur(uv + float2(d.x, 0), size, origin, scale, 4) - Blur(uv - float2(d.x, 0), size, origin, scale, 4);
    dy = Blur(uv + float2(0, d.y), size, origin, scale, 4) - Blur(uv - float2(0, d.y), size, origin, scale, 4);
    dz += float2(dx.y, dy.y);
    float3 result =
        (pow(length(dz) * (second ? .9 : .8), .7) + Blur(uv, size, origin, scale, 16).y * (second ? .6 : .4) - .1) *
        (second ? float3(3.3, 2.5, .7) : float3(3.3, .5, .7));
    result = lerp(result,
                  second ? float3(.6, .1, 0) : float3(.2, .1, 0),
                  Image(uv + float2(dx.x, dy.x) / size * 18, size, origin, scale).x * 6);
    result = lerp(result, 1, Image(uv, size, origin, scale).z);
    if (second)
        result -= .07;
    return saturate(result);
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    return float4(
        lerp(Composite(uv, size, origin, scale, false), Composite(uv, size, origin, scale, true), PlasmaMask(uv, size)),
        1);
}
`;

    return {
        name: "0449", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {shader, feedback, post}
    };
};
