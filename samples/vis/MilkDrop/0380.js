// MilkDrop 0380 — rotating 99x21 fold raymarch and four random-walk waves.
// Original: original/0380.milk (provided by the user; retained unchanged).
//
// The custom warp overwrites the old image, but MilkDrop draws custom waves
// after that pass, so all four additive 512-point walks remain visible. Their
// init variables live in the per-frame EEL VM while mx/my/md belong to the
// separate per-point VM; the checked runtime therefore starts those variables
// at zero and the first point's boundary tests move them to the intended centre.
// Direction choices use a deterministic stand-in for EEL2's global RNG because
// its process-global seed cannot be reproduced by an isolated preset port.
// At high FPS every frame still displays a full 512-dot walk, while only the
// cadence-proportional prefix advances its persistent centre; this preserves
// the 30 FPS diffusion rate without thinning the visible point cloud.
//
// The final sampler is the actual MilkDrop clouds.jpg (not procedural noise).
// GetBlur2 is represented by a broad 64-tap weighted approximation of the
// progressively downsampled native blur footprint; it is presentation-only.
// The checked 0.10.0 reference applies the preset's bDarken output operation;
// the user's matched-frame luminance also corresponds to ret *= ret.

// Fixed preset seed: native rand_preset varies per load, but regenerating it
// when the browser changes FPS would invalidate the DXBC cache and jump the image.
MilkDropPresets["0380"] = function (TARGET_FPS) {
    const textureDir = typeof presetDir === "string"
        ? presetDir + "textures\\"
        : "component\\samples\\vis\\MilkDrop\\textures\\";
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };

    const shader = `
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
float4 main(PSInput input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    if (pixel.y == 0 && pixel.x >= 18 && pixel.x < 24)
        return float4(PackPositive(RelativeBands.Load(int3(pixel.x - 18, 0, 0)).r), 1);
    return 0;
}
`;

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
float UnpackPositive(float3 packed) {
    float unit = min(dot(packed, float3(1, 1.0 / 255, 1.0 / 65025)), .999999);
    return unit / (1 - unit);
}
float3 PackPositive(float value) {
    value = max(value, 0);
    value = value / (1 + value);
    float3 packed = frac(min(value, .999999) * float3(1, 255, 65025));
    return packed - packed.yzz * float3(1.0 / 255, 1.0 / 255, 0);
}
float ReadControl(int index) {
    return UnpackPositive(Previous.Load(int3(index, 0, 0)).rgb);
}
float Advance(float oldValue, float drive, float rate, float step30) {
    float keep = pow(saturate(.95 - drive * rate), step30), target = drive * rate / max(.05 + drive * rate, 1e-7);
    return oldValue * keep + target * (1 - keep);
}
float Random01(float frameIndex, float waveIndex, float sampleIndex) {
    return frac(sin(dot(float3(frameIndex, waveIndex, sampleIndex), float3(12.9898, 78.233, 37.719))) * 43758.5453);
}
void WalkPoint(inout float2 position,
               inout int direction,
               int waveIndex,
               int sampleIndex,
               float frameIndex,
               float bass,
               float treb) {
    int oldDirection = direction;
    direction = (direction + (int)floor(Random01(frameIndex, waveIndex, sampleIndex) * 4)) % 4;
    if (direction == oldDirection)
        direction = (direction + 1) % 4;
    float leftStep = waveIndex == 3 ? .0019 : .002, downStep = waveIndex == 1 ? .0018 : .002;
    position.x += (direction == 0 ? .002 * bass : 0) - (direction == 1 ? leftStep * bass : 0);
    position.y += (direction == 2 ? .002 * treb : 0) - (direction == 3 ? downStep * treb : 0);
    float upperX = waveIndex == 3 ? .95 : .9, resetX = waveIndex == 3 ? .47 : .5, upperY = waveIndex == 2 ? .83 : .9,
          resetY = waveIndex == 2 ? .45 : .5;
    if (position.x > upperX)
        position.x = resetX;
    if (position.x < .1)
        position.x = .5;
    if (position.y > upperY)
        position.y = resetY;
    if (position.y < .1)
        position.y = .5;
}
float2 PointPixel(float2 position, float2 size) {
    float2 inverseAspect = max(float2(1, 1), float2(size.y / size.x, size.x / size.y));
    float2 screen = float2(.5 + (position.x - .5) * inverseAspect.x, .5 + (.5 - position.y) * inverseAspect.y);
    return screen * size;
}
float Quantize(float value) {
    return floor(saturate(value) * 255 + .5) / 255;
}
float3 HSV(float h, float s, float v) {
    float4 K = float4(1, 2.0 / 3, 1.0 / 3, 3);
    float3 p = abs(frac(h + K.xyz) * 6 - K.www);
    return v * lerp(K.xxx, saturate(p - K.xxx), s);
}
float3x3 Rotate3D(float angle, float3 axis) {
    axis = normalize(axis);
    float s = sin(angle), c = cos(angle), oc = 1 - c;
    return float3x3(oc * axis.x * axis.x + c,
                    oc * axis.x * axis.y - axis.z * s,
                    oc * axis.z * axis.x + axis.y * s,
                    oc * axis.x * axis.y + axis.z * s,
                    oc * axis.y * axis.y + c,
                    oc * axis.y * axis.z - axis.x * s,
                    oc * axis.z * axis.x - axis.y * s,
                    oc * axis.y * axis.z + axis.x * s,
                    oc * axis.z * axis.z + c);
}
float4 main(PSInput input) : SV_Target {
    int2 pixel = int2(floor(input.sceneSpacePos.xy));
    float2 size = max(viewportSize, float2(1, 1));
    float step30 = max(frameStep * .5, .0001);
    float bass = ReadControl(18), mid = ReadControl(19), treb = ReadControl(20), bassAtt = ReadControl(21),
          midAtt = ReadControl(22), trebAtt = ReadControl(23);
    float smoothState[6];
    [unroll] for (int stateIndex = 0; stateIndex < 6; ++stateIndex) smoothState[stateIndex] = ReadControl(stateIndex);
    smoothState[0] = Advance(smoothState[0], bassAtt * bassAtt, .02, step30);
    smoothState[1] = Advance(smoothState[1], smoothState[0], .01, step30);
    smoothState[2] = Advance(smoothState[2], midAtt * midAtt, .02, step30);
    smoothState[3] = Advance(smoothState[3], smoothState[2], .01, step30);
    smoothState[4] = Advance(smoothState[4], trebAtt * trebAtt, .02, step30);
    smoothState[5] = Advance(smoothState[5], smoothState[4], .01, step30);
    if (pixel.y == 0 && pixel.x < 6)
        return float4(PackPositive(saturate(smoothState[pixel.x])), 1);
    float2 position[4] = {float2(ReadControl(6), ReadControl(7)),
                          float2(ReadControl(9), ReadControl(10)),
                          float2(ReadControl(12), ReadControl(13)),
                          float2(ReadControl(15), ReadControl(16))};
    int direction[4] = {(int)floor(ReadControl(8) + .5),
                        (int)floor(ReadControl(11) + .5),
                        (int)floor(ReadControl(14) + .5),
                        (int)floor(ReadControl(17) + .5)};
    float2 savedPosition[4];
    int savedDirection[4];
    [unroll] for (int wave = 0; wave < 4; ++wave) {
        savedPosition[wave] = position[wave];
        savedDirection[wave] = direction[wave];
    }
    // Carry fractional steps instead of rounding the same error every frame.
    bool clockValid=all(abs(Previous.Load(int3(25,0,0)).rgb-float3(.1725,.5333,.9137))<.012);
    float budget=(clockValid ? ReadControl(24) : 0)+512*step30;
    int advanceCount=clamp((int)floor(budget+1e-5),0,512);
    if(pixel.y==0 && pixel.x==24)
        return float4(PackPositive(max(0,budget-advanceCount)),1);
    if(pixel.y==0 && pixel.x==25) return float4(.1725,.5333,.9137,1);
    float frameIndex = floor(time * 30 / step30 + .5);
    float4 hits = 0;
    float pointSize = size.x >= 1024 ? 3 : 2, halfSize = pointSize * .5;
    [fastopt] for (int sampleIndex = 0; sampleIndex < 512; ++sampleIndex) {
        [unroll] for (int wave = 0; wave < 4; ++wave) {
            WalkPoint(position[wave], direction[wave], wave, sampleIndex, frameIndex, bass, treb);
            float2 centre = PointPixel(position[wave], size);
            float hit = all(abs(input.sceneSpacePos.xy - centre) <= halfSize) ? 1 : 0;
            hits[wave] += hit;
            if (sampleIndex + 1 == advanceCount) {
                savedPosition[wave] = position[wave];
                savedDirection[wave] = direction[wave];
            }
        }
    }
    if (pixel.y == 0 && pixel.x >= 6 && pixel.x < 18) {
        int item = pixel.x - 6, wave = item / 3, component = item - wave * 3;
        float value = component == 0 ? savedPosition[wave].x
                                     : (component == 1 ? savedPosition[wave].y : (float)savedDirection[wave]);
        return float4(PackPositive(value), 1);
    }
    float q23 = (smoothState[1] + smoothState[3] + smoothState[5]) * 10;
    float aspect = size.x / size.y;
    float2 uv = (input.sceneSpacePos.xy / size - .5) * float2(aspect, 1);
    float3 output = 0;
    float ray = 0, scaleFactor = 0, distanceField = 0;
    float3 axis = float3(2 + sin(time * .5) * 2, 1, 1);
    float3x3 rotation = Rotate3D(time * .5 - 8, axis);
    [fastopt] for (int rayIndex = 0; rayIndex < 99; ++rayIndex) {
        scaleFactor = 2;
        float3 p = mul(float3(uv * ray * 3, ray), rotation);
        p.z = fmod(time * .5 + q23 / 1.047 + p.z, scaleFactor) - scaleFactor;
        p.x += .6;
        [loop] for (int fold = 0; fold < 21; ++fold) {
            p = abs(p.zyx) - 1;
            distanceField = dot(p, p);
            scaleFactor /= distanceField;
            p /= distanceField + .03;
        }
        ray -= p.z / scaleFactor * .5 + .002;
        output +=
            1e-5 + HSV(p.y, p.y * 5 + distanceField, 3) * 9e-6 * scaleFactor / max(distanceField * distanceField, 1e-8);
    }
    float alpha = Quantize(bass * .1);
    float3 colour0 = float3(Quantize(bass * .5), 1, 1), colour1 = float3(1, Quantize(treb * .5), 1),
           colour2 = float3(Quantize(.87), 1, 1), colour3 = 1;
    float3 waves = (hits.x * colour0 + hits.y * colour1 + hits.z * colour2 + hits.w * colour3) * alpha;
    return float4(saturate(output + waves), 1);
}
`;

    const compShader = `
Texture2D Frame : register(t0);
SamplerState FrameFilter : register(s0);
Texture2D Clouds : register(t1);
SamplerState CloudFilter : register(s1);
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
static const float CLOUD_SCALE = 0.313378900;
float2 TextureUV(float2 uv, float2 origin, float2 scale) {
    return origin + uv * scale;
}
float3 Image(float2 uv, float2 size, float2 origin, float2 scale) {
    uv = saturate(uv);
    float2 pixel = floor(uv * size);
    if (pixel.y == 0 && pixel.x < 26)
        uv = float2(26.5, pixel.y) / size;
    return Frame.SampleLevel(FrameFilter, TextureUV(uv, origin, scale), 0).rgb;
}
float3 BroadBlur2(float2 uv, float2 size, float2 origin, float2 scale) {
    const float weights[8] = {1, 3, 6, 8, 8, 6, 3, 1};
    float3 value = 0;
    float total = 0;
    [fastopt] for (int y = 0; y < 8; ++y)[loop] for (int x = 0; x < 8; ++x) {
        float weight = weights[x] * weights[y];
        float2 offset = (float2(x, y) - 3.5) * 6 / size;
        value += Image(uv + offset, size, origin, scale) * weight;
        total += weight;
    }
    return value / total;
}
float4 main(PSInput input) : SV_Target {
    float2 size = max(viewportSize, float2(1, 1)), uv = input.sceneSpacePos.xy / size;
    float2 scale = float2(ddx(input.texelSpacePos.x) * size.x, ddy(input.texelSpacePos.y) * size.y),
           origin = input.texelSpacePos.xy - uv * scale;
    float3 coordinates = Image(uv, size, origin, scale) + BroadBlur2(uv, size, origin, scale);
    float2 aspect = min(float2(1, 1), float2(size.x / size.y, size.y / size.x));
    float2 cloudUV = coordinates.xy * CLOUD_SCALE + uv * float2(1, -1) * aspect;
    float3 result = Clouds.SampleLevel(CloudFilter, frac(cloudUV), 0).rgb;
    return float4(result * result, 1);
}
`;

    return {
        name: "0380", sourceId: 5, source, updateIntervalMs: 17,
        renderer: {
            shader, feedback: warpShader,
            post: {shader: compShader, textures: [textureDir + "clouds.jpg"]}
        }
    };
};
