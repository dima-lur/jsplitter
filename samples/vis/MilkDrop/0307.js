// MilkDrop 0307 — radial feedback ripples with a blue stretched composite.
// Original: original/0307.milk (provided by the user; retained unchanged).
// The native mode-4 waveform, custom warp and polar composite are transferred;
// the multi-stage MilkDrop blur remains a local approximation.
// Preset HLSL is invariant under 30/60/120 FPS, and uses frameStep at runtime.
// Source t0/t1: PCM, t2: six relative bands; control row is hidden from post.
// FXC compilation and comparison against MilkDrop must be verified on Windows.
MilkDropPresets["0307"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };
    const shader = `Texture2D<float> LeftPCM : register(t0);
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
float3 PackUnit(float x) {
    float3 v = frac(min(saturate(x),0.999999)*float3(1.0,255.0,65025.0));
    return v-v.yzz*float3(1.0/255.0,1.0/255.0,0.0);
}
float3 PackPositive(float x) { x=max(x,0.0);return PackUnit(x/(1.0+x)); }
float SegmentDistance(float2 p, float2 a, float2 b) {
    float2 ab = b - a;
    float along = saturate(dot(p - a, ab) /
        max(dot(ab, ab), 1e-5));
    return length(p - a - ab * along);
}

void AddSegmentDistances(float2 p, float2 a, float2 b,
                         bool thick, inout float4 nearest) {
    nearest.x = min(nearest.x, SegmentDistance(p, a, b));
    if (thick) {
        // DrawWave mutates the line between its four thick passes, producing
        // these exact one-pixel offsets at texture widths of at least 512.
        nearest.y = min(nearest.y, SegmentDistance(
            p, a + float2(1.0, 0.0), b + float2(1.0, 0.0)));
        nearest.z = min(nearest.z, SegmentDistance(
            p, a + float2(1.0, -1.0), b + float2(1.0, -1.0)));
        nearest.w = min(nearest.w, SegmentDistance(
            p, a + float2(0.0, -1.0), b + float2(0.0, -1.0)));
    }
}

float2 Mode4Point(int vertex, int vertexCount, float leftSample,
                  float rightSample, float2 previous,
                  float2 previous2) {
    // Native mode 4 is the horizontal "script" waveform. The right channel
    // bends X, while the left channel supplies Y. wave_mystery=0 gives
    // momentum weights .7/.3. DrawWave reverses Y before rasterization.
    float2 nativePoint = float2(
        -1.0 + 2.0 * (float)vertex / (float)vertexCount +
            rightSample * 0.44,
        leftSample * 0.47);
    if (vertex > 1)
        nativePoint = nativePoint * 0.3 +
                      (previous * 2.0 - previous2) * 0.7;
    return nativePoint;
}

float2 ToPixels(float2 nativePoint, float2 size) {
    return float2((nativePoint.x + 1.0) * 0.5 * size.x,
                  (nativePoint.y + 1.0) * 0.5 * size.y);
}

float WaveCoverage(float2 p, float2 size, int count) {
    int usable = min(count, 576);
    int available = min(480, max(usable - 25, 0));
    int vertexCount = min(available, (int)floor(size.x / 3.0));
    if (vertexCount < 3) return 0.0;

    int sourceStart = max(count - usable, 0);
    int sampleOffset = max((available - vertexCount) >> 1, 0);
    int leftFirst = sampleOffset;
    int rightFirst = sampleOffset + 25;
    const float waveScale = 1.521;
    const float smoothing = 0.9;

    // BuildWaves smooths the full aligned PCM buffer before mode 4 selects
    // its centered subsection. Prime both recurrences through their first
    // visible samples; the right channel begins 25 samples later.
    float2 filtered = clamp(float2(
        LeftPCM.Load(int3(sourceStart, 0, 0)).r,
        RightPCM.Load(int3(sourceStart, 0, 0)).r),
        -1.0, 1.0) * waveScale;
    float leftFiltered = filtered.x;
    float rightFiltered = filtered.y;
    [fastopt]
    for (int sample = 1; sample < 576; ++sample) {
        if (sample > rightFirst) break;
        float2 raw = clamp(float2(
            LeftPCM.Load(int3(sourceStart + sample, 0, 0)).r,
            RightPCM.Load(int3(sourceStart + sample, 0, 0)).r),
            -1.0, 1.0) * waveScale;
        filtered = raw * (1.0 - smoothing) + filtered * smoothing;
        if (sample == leftFirst) leftFiltered = filtered.x;
        if (sample == rightFirst) rightFiltered = filtered.y;
    }

    float2 nativeBelow = Mode4Point(0, vertexCount, leftFiltered,
        rightFiltered, 0.0, 0.0);
    float2 nativeA = nativeBelow;

    float leftRaw = clamp(LeftPCM.Load(int3(
        sourceStart + leftFirst + 1, 0, 0)).r, -1.0, 1.0) * waveScale;
    float rightRaw = clamp(RightPCM.Load(int3(
        sourceStart + rightFirst + 1, 0, 0)).r, -1.0, 1.0) * waveScale;
    leftFiltered = leftRaw * (1.0 - smoothing) +
                   leftFiltered * smoothing;
    rightFiltered = rightRaw * (1.0 - smoothing) +
                    rightFiltered * smoothing;
    float2 nativeB = Mode4Point(1, vertexCount, leftFiltered,
        rightFiltered, nativeA, nativeBelow);

    float4 nearest = 1e6;
    bool thick = size.x >= 512.0;
    [fastopt]
    for (int vertex = 2; vertex < 480; ++vertex) {
        if (vertex >= vertexCount) break;
        leftRaw = clamp(LeftPCM.Load(int3(
            sourceStart + leftFirst + vertex, 0, 0)).r,
            -1.0, 1.0) * waveScale;
        rightRaw = clamp(RightPCM.Load(int3(
            sourceStart + rightFirst + vertex, 0, 0)).r,
            -1.0, 1.0) * waveScale;
        leftFiltered = leftRaw * (1.0 - smoothing) +
                       leftFiltered * smoothing;
        rightFiltered = rightRaw * (1.0 - smoothing) +
                        rightFiltered * smoothing;
        float2 nativeC = Mode4Point(vertex, vertexCount, leftFiltered,
            rightFiltered, nativeB, nativeA);

        float2 below = ToPixels(nativeBelow, size);
        float2 a = ToPixels(nativeA, size);
        float2 b = ToPixels(nativeB, size);
        float2 c = ToPixels(nativeC, size);
        float2 midpoint = (-0.15 * below + 1.15 * a +
                            1.15 * b - 0.15 * c) * 0.5;
        AddSegmentDistances(p, a, midpoint, thick, nearest);
        AddSegmentDistances(p, midpoint, b, thick, nearest);
        nativeBelow = nativeA;
        nativeA = nativeB;
        nativeB = nativeC;
    }

    float2 below = ToPixels(nativeBelow, size);
    float2 a = ToPixels(nativeA, size);
    float2 b = ToPixels(nativeB, size);
    float2 lastMidpoint = (-0.15 * below + 1.15 * a +
                            1.15 * b - 0.15 * b) * 0.5;
    AddSegmentDistances(p, a, lastMidpoint, thick, nearest);
    AddSegmentDistances(p, lastMidpoint, b, thick, nearest);

    float4 coverage = 1.0 - smoothstep(0.35, 1.15, nearest);
    return thick ? dot(coverage, 1.0) : coverage.x;
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 p=int2(floor(input.sceneSpacePos.xy));
    if(p.y==0 && p.x>=0 && p.x<6) {
        float band=max(RelativeBands.Load(int3(p.x,0,0)).r,0.0);
        return float4(PackPositive(band),1.0);
    }
    if(p.y==0 && p.x<16) return float4(0.0,0.0,0.0,0.0);
    float2 size=max(viewportSize,float2(1,1));
    float coverage = WaveCoverage(input.sceneSpacePos.xy, size,
                                  (int)pointCount);
    // bAdditiveWaves=1: preserve feedback alpha and add the quantized white
    // fWaveAlpha=.320 contribution. Scale only emission cadence at high FPS.
    float waveAlpha = floor(0.320 * 255.0 + 0.5) / 255.0;
    float contribution = coverage * waveAlpha * (frameStep * 0.5);
    return float4(saturate(contribution).xxx, 0.0);
}`;
    const warpShader = `Texture2D Previous : register(t0);
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
static const float PI=3.141592653589793;
static const float TWO_PI=6.283185307179586;
static const float3 MAGIC=float3(0.1725,0.5333,0.9137);
float Hash12(float2 p) {return frac(sin(dot(p,float2(127.1,311.7)))*43758.5453);}
float Hash11(float a) {return frac(sin(a*127.1+311.7)*43758.5453);}
float3 PackUnit(float x) {
    float3 v=frac(min(saturate(x),0.999999)*float3(1,255,65025));
    return v-v.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float UnpackUnit(float3 v){return dot(v,float3(1,1.0/255,1.0/65025));}
float3 PackPositive(float x){ x=max(x,0.0);return PackUnit(x/(1+x)); }
float UnpackPositive(float3 v){float x=min(UnpackUnit(v),0.99999);return x/max(1.0-x,0.00001);}
float4 State(int x){return Previous.Load(int3(x,0,0));}
float Audio(int x){return UnpackPositive(State(x).rgb);}
int Wrap(int i,int count){int k=i%count;return k<0?k+count:k;}
float3 Texel(int2 pos,int2 dim){
    pos.x=Wrap(pos.x,dim.x); pos.y=Wrap(pos.y,dim.y);
    if(pos.y==0 && pos.x<16)return 0;
    return Previous.Load(int3(pos,0)).rgb;
}
float3 History(float2 uv,float2 size){
    int2 dim=max(int2(size),int2(1,1));
    float2 xy=uv*size-0.5;
    int2 b=int2(floor(xy)); float2 f=frac(xy);
    float3 a=lerp(Texel(b,dim),Texel(b+int2(1,0),dim),f.x);
    float3 c=lerp(Texel(b+int2(0,1),dim),Texel(b+int2(1,1),dim),f.x);
    return lerp(a,c,f.y);
}
float3 Blur(float2 uv,float2 size,float scale){
    float2 st=scale/size;
    float3 sum=History(uv,size)*4.0;
    sum+=History(uv+float2(st.x,0),size)+History(uv-float2(st.x,0),size);
    sum+=History(uv+float2(0,st.y),size)+History(uv-float2(0,st.y),size);
    return sum*(1.0/8.0);
}
float3 Blur1(float2 uv,float2 size){return Blur(uv,size,2.0);}
float3 Blur2(float2 uv,float2 size){return Blur(uv,size,7.0);}
float3 Blur3(float2 uv,float2 size){return Blur(uv,size,18.0);}
float3 Noise(float2 uv,float2 seed){
    float2 base=floor(frac(uv+seed)*256.0); float2 f=frac(frac(uv+seed)*256.0);
    float3 a=float3(Hash12(base),Hash12(base+13.7),Hash12(base+23.1));
    float3 b=float3(Hash12(base+float2(1,0)),Hash12(base+float2(1,0)+13.7),Hash12(base+float2(1,0)+23.1));
    float3 c=float3(Hash12(base+float2(0,1)),Hash12(base+float2(0,1)+13.7),Hash12(base+float2(0,1)+23.1));
    float3 d=float3(Hash12(base+float2(1,1)),Hash12(base+float2(1,1)+13.7),Hash12(base+float2(1,1)+23.1));
    return lerp(lerp(a,b,f.x),lerp(c,d,f.x),f.y);
}
float3 NormalizeDecay(float3 sample,float multiplier,float subtract,float step30){
    float decay=pow(multiplier,step30);
    return sample*decay-subtract*multiplier*(1.0-decay)/max(1.0-multiplier,0.000001);
}
float2 BuiltinUV(float2 uv, float2 size,float timeValue,float2 center,
                 float zoom,float rotation,float2 stretch,float2 translate,
                 float warpAmount,float warpScale,float step30){
    float2 delta=uv-center;
    float2 target=center+delta/max(zoom,0.0001)/max(abs(stretch),float2(0.01,0.01));
    float c=cos(rotation),s=sin(rotation);
    target=center+float2(c*(target.x-center.x)-s*(target.y-center.y),
                         s*(target.x-center.x)+c*(target.y-center.y));
    target+=translate;
    float2 wave=(target-0.5)/max(warpScale,0.01);
    float2 w=float2(sin(timeValue*0.333+wave.x*11.68-wave.y*11.49)+cos(timeValue*0.753-wave.x*8.77+wave.y*10.54),
                    cos(timeValue*0.375-wave.x*10.54-wave.y*8.77)+sin(timeValue*0.825+wave.x*11.68+wave.y*11.49));
    target+=w*(warpAmount*0.0035);
    return uv+(target-uv)*step30;
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

float4 main(PSInput input):SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 uv0=input.texelSpacePos.xy;
    float2 pos=input.sceneSpacePos.xy;
    float step30=max(frameStep*0.5,0.0001);
    float bass=Audio(0),mid=Audio(1),treb=Audio(2);
    float bassAtt=Audio(3),midAtt=Audio(4),trebAtt=Audio(5);
    bool initialized=all(abs(State(15).rgb-MAGIC)<float3(.012,.012,.012));
    float phase=0.0; float flip=1.0; float angleAdvance=0.0;
    if(pos.y<1 && pos.x>=0 && pos.x<16) {
        if(pos.x<6) return 0.0;
        
        if(pos.x<15) return 0.0;
        return float4(MAGIC,1.0);
    }
    float2 uv=uv0;
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float2 d=(uv0-0.5)*aspect;
    float rad=length(d)*2.0;
    float ang=atan2(d.y,d.x);
    float2 randFrame=float2(Hash11(floor(time*30.0)*1.13+14.1),
                            Hash11(floor(time*30.0)*1.27+29.7));
    uv=BuiltinUV(uv0,size,time,float2(.5,.5),1.002,0,float2(1,1),
             float2(0,0),.033,.015,step30);
float t=saturate((bass/max(bassAtt,0.00001)-.9)*13.0);
uv=lerp(uv0,uv,t*0.5);
float2 ray=normalize(uv0-.5+float2(1e-5,0));
float2 tangential=ray.yx*float2(1,-1);
uv+=(ray*cos(rad*50.0-time*8.0)*5.0+
     tangential*cos(ang*50.0-time*8.0)*5.0)/size*step30;

    float3 result=NormalizeDecay(History(uv,size),.8,.01,step30);
    result=DitherDecay(result,pow(.8,step30),.04*(1-pow(.8,step30)),.8,.008,input.sceneSpacePos.xy);

    return float4(saturate(result),1.0);
}`;
    const compShader = `Texture2D Frame : register(t0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos:SV_POSITION;
    float4 sceneSpacePos:SCENE_POS;
    float4 texelSpacePos:TEXEL_POS;
};
static const float PI=3.141592653589793;
int Wrap(int a,int n){int x=a%n;return x<0?x+n:x;}
float3 Pixel(int2 p,int2 size){p.x=Wrap(p.x,size.x);p.y=Wrap(p.y,size.y);
    return p.y==0 && p.x<16 ? 0.0 : Frame.Load(int3(p,0)).rgb;}
float3 FrameAt(float2 uv,float2 size){
    int2 dim=max(int2(size),int2(1,1));
    float2 coord=uv*size-0.5;
    int2 b=int2(floor(coord));float2 f=frac(coord);
    return lerp(lerp(Pixel(b,dim),Pixel(b+int2(1,0),dim),f.x),
                lerp(Pixel(b+int2(0,1),dim),Pixel(b+int2(1,1),dim),f.x),f.y);
}
float3 Blur(float2 uv,float2 size,float scale){
    float2 p=scale/size;
    float3 x=FrameAt(uv,size)*4;
    x+=FrameAt(uv+float2(p.x,0),size)+FrameAt(uv-float2(p.x,0),size);
    x+=FrameAt(uv+float2(0,p.y),size)+FrameAt(uv-float2(0,p.y),size);
    return x*(1.0/8.0);
}
float3 Blur1(float2 uv,float2 size){return Blur(uv,size,2.0);}
float3 Blur2(float2 uv,float2 size){return Blur(uv,size,7.0);}
float3 Blur3(float2 uv,float2 size){return Blur(uv,size,18.0);}
float Lum(float3 c){return dot(c,float3(.299,.587,.114));}
float4 main(PSInput input):SV_Target{
    float2 size=max(viewportSize,float2(1,1));
    float2 uv=input.texelSpacePos.xy;
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float2 p=(uv-0.5)*aspect;
    float rad=length(p)*2.0;
    float ang=atan2(p.y,p.x);
    float3 result=0.0;
    float2 polar=float2(rad,uv.y);
result=(FrameAt(polar,size)+Blur1(polar,size))*float3(1.0,1.5,3.5);

    return float4(saturate(result),1.0);
}`;
    return {
        name: "0307", sourceId: 5, source, updateIntervalMs: 17,
        renderer: { shader, feedback: warpShader, post: compShader }
    };
};
