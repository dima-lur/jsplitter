// MilkDrop 0240 — colour-age transfer and diffusion dithering.
// Original: original/0240.milk (provided by the user; retained unchanged).
// Native mode-7 connected dual-channel wave adapted from 0116; bass-triggered offsets and mesh still require verification.
// Preset HLSL is invariant under 30/60/120 FPS, and uses frameStep at runtime.
// Source t0/t1: PCM, t2: six relative bands; control row is hidden from post.
// FXC compilation and comparison against MilkDrop must be verified on Windows.
MilkDropPresets["0240"] = function (TARGET_FPS) {
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

float2 ToPixels(float2 nativePoint, float2 size) {
    // DrawWave negates native Y immediately before submitting its vertices.
    return float2((nativePoint.x + 1.0) * 0.5 * size.x,
                  (1.0 - nativePoint.y) * 0.5 * size.y);
}

float2 ReadSmoothedStereo(int sample, int sourceStart,
                          inout float2 smoothed, bool first) {
    const float waveScale = 1.231;
    const float smoothing = 0.0;
    float2 raw = clamp(float2(
        LeftPCM.Load(int3(sourceStart + sample, 0, 0)).r,
        RightPCM.Load(int3(sourceStart + sample, 0, 0)).r),
        -1.0, 1.0) * waveScale;
    smoothed = first ? raw :
        raw * (1.0 - smoothing) + smoothed * smoothing;
    return smoothed;
}

void WavePoints(int vertex, float2 amplitudes, float2 edgeStart,
                float2 lineStep, float2 perpendicular, float2 size,
                out float2 leftPoint, out float2 rightPoint) {
    float2 base = edgeStart + lineStep * vertex;
    // wave_y=.48 gives native pair separation wave_y squared.
    const float separation = 0.2304;
    leftPoint = ToPixels(base + perpendicular *
        (0.25 * amplitudes.x + separation), size);
    rightPoint = ToPixels(base + perpendicular *
        (0.25 * amplitudes.y - separation), size);
}

float SegmentCoverage(float2 p, float2 a, float2 b) {
    return 1.0 - smoothstep(0.15, 1.25, DistanceToSegment(p, a, b));
}

float3 PackUnit(float x) {
    float3 v=frac(min(saturate(x),.999999)*float3(1,255,65025));
    return v-v.yzz*float3(1.0/255.0,1.0/255.0,0.0);
}
float3 PackPositive(float x) {x=max(x,0.0);return PackUnit(x/(1.0+x));}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 control=int2(floor(input.sceneSpacePos.xy));
    if(control.y==0 && control.x>=0 && control.x<6) {
        float band=max(RelativeBands.Load(int3(control.x,0,0)).r,0.0);
        return float4(PackPositive(band),1.0);
    }
    if(control.y==0 && control.x<16) return 0.0;
    float2 size = max(viewportSize, float2(1.0, 1.0));
    float2 p = input.sceneSpacePos.xy;
    int count = (int)pointCount;
    int usable = min(count, 576);
    int vertexCount = min(240, min(usable, (int)(size.x / 3.0)));
    if (vertexCount < 3) return float4(0.0, 0.0, 0.0, 0.0);

    int sourceStart = max(count - usable, 0);
    int sampleOffset = (usable - vertexCount) / 2;

    // Mode 7 first clips an angle-adjustable six-unit line to +/-1.1. Since
    // wave_x=.5 places it at the origin, the two clipped ends are symmetric.
    const float angle = 0.471; // 1.57 * fWaveParam (+.300)
    float2 direction = float2(cos(angle), sin(angle));
    float halfLength = min(1.1 / max(abs(direction.x), 1e-5),
                           1.1 / max(abs(direction.y), 1e-5));
    float2 edgeStart = -direction * halfLength;
    float2 edgeEnd = direction * halfLength;
    float2 lineStep = (edgeEnd - edgeStart) / vertexCount;
    float lineAngle = atan2(lineStep.y, lineStep.x);
    float2 perpendicular = float2(cos(lineAngle + 1.57),
                                  sin(lineAngle + 1.57));

    // BuildWaves recursively smooths all 576 PCM values before the visible
    // centered subsection is selected. Prime both channels through its first
    // visible sample, then advance them once per raw waveform vertex.
    float2 smoothed = 0.0;
    [loop]
    for (int sample = 0; sample < 576; ++sample) {
        if (sample >= usable) break;
        ReadSmoothedStereo(sample, sourceStart, smoothed, sample == 0);
        if (sample >= sampleOffset) break;
    }

    float2 leftBelow, rightBelow;
    WavePoints(0, smoothed, edgeStart, lineStep, perpendicular, size,
               leftBelow, rightBelow);
    float2 leftA = leftBelow;
    float2 rightA = rightBelow;

    ReadSmoothedStereo(sampleOffset + 1, sourceStart, smoothed, false);
    float2 leftB, rightB;
    WavePoints(1, smoothed, edgeStart, lineStep, perpendicular, size,
               leftB, rightB);

    float coverage = 0.0;
    // SmoothWave processes each channel separately, inserting a four-point
    // interpolated vertex between every pair. The two strips are additive.
    [loop]
    for (int vertex = 2; vertex < 240; ++vertex) {
        if (vertex >= vertexCount) break;
        ReadSmoothedStereo(sampleOffset + vertex, sourceStart,
                           smoothed, false);
        float2 leftC, rightC;
        WavePoints(vertex, smoothed, edgeStart, lineStep, perpendicular, size,
                   leftC, rightC);
        float2 leftMid = (-0.15 * leftBelow + 1.15 * leftA +
                           1.15 * leftB - 0.15 * leftC) * 0.5;
        float2 rightMid = (-0.15 * rightBelow + 1.15 * rightA +
                            1.15 * rightB - 0.15 * rightC) * 0.5;
        coverage += SegmentCoverage(p, leftA, leftMid);
        coverage += SegmentCoverage(p, leftMid, leftB);
        coverage += SegmentCoverage(p, rightA, rightMid);
        coverage += SegmentCoverage(p, rightMid, rightB);
        leftBelow = leftA;
        leftA = leftB;
        leftB = leftC;
        rightBelow = rightA;
        rightA = rightB;
        rightB = rightC;
    }

    float2 leftLastMid = (-0.15 * leftBelow + 1.15 * leftA +
                           1.15 * leftB - 0.15 * leftB) * 0.5;
    float2 rightLastMid = (-0.15 * rightBelow + 1.15 * rightA +
                            1.15 * rightB - 0.15 * rightB) * 0.5;
    coverage += SegmentCoverage(p, leftA, leftLastMid);
    coverage += SegmentCoverage(p, leftLastMid, leftB);
    coverage += SegmentCoverage(p, rightA, rightLastMid);
    coverage += SegmentCoverage(p, rightLastMid, rightB);

    // Original 0240: per-frame wave_r=1, wave_g=wave_b=0; maximize RGB.
    float3 presetColor=float3(1.0,0.0,0.0);
    float relativeVolume=(
        RelativeBands.Load(int3(0,0,0)).r+
        RelativeBands.Load(int3(1,0,0)).r+
        RelativeBands.Load(int3(2,0,0)).r)/3.0;
    // bModWaveAlphaByVolume, fWaveAlpha=2.929, start=1.15, end=1.33.
    float waveAlpha=saturate(2.929*(relativeVolume-1.15)/(1.33-1.15));
    if(waveAlpha<.004)waveAlpha=0.0;
    waveAlpha=floor(waveAlpha*255.0+.5)/255.0;
    float3 additiveWave=presetColor*coverage*waveAlpha*(frameStep*.5);
    return float4(additiveWave, 0.0);
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
float3 CubicHistory(float3 a,float3 b,float3 c,float3 d,float t){
    return b+0.5*t*(c-a+t*(2.0*a-5.0*b+4.0*c-d+
           t*(3.0*(b-c)+d-a)));
}
float3 HistoryCatmullRow(int2 b,int py,int2 dim,float fraction){
    return CubicHistory(
        Texel(b+int2(-1,py),dim),Texel(b+int2(0,py),dim),
        Texel(b+int2(1,py),dim),Texel(b+int2(2,py),dim),fraction);
}
float3 HistoryCatmull(float2 uv,float2 size){
    int2 dim=max(int2(size),int2(1,1));
    float2 xy=uv*size-0.5;
    int2 b=int2(floor(xy)); float2 f=frac(xy);
    float3 row0=HistoryCatmullRow(b,-1,dim,f.x);
    float3 row1=HistoryCatmullRow(b, 0,dim,f.x);
    float3 row2=HistoryCatmullRow(b, 1,dim,f.x);
    float3 row3=HistoryCatmullRow(b, 2,dim,f.x);
    return CubicHistory(row0,row1,row2,row3,f.y);
}
float3 HistoryCadence(float2 uv,float2 size,float step30){
    float3 bilinearValue=History(uv,size);
    float3 reconstructed=bilinearValue;
    [branch]
    if(step30<0.999){
        // Repeated sub-30-Hz bilinear resampling diffuses fine history detail.
        // Match the successful 0246 compensation: 50% cubic at 60 FPS and
        // 75% at 120 FPS, while retaining the exact 30-FPS sampling path.
        float3 cubicValue=HistoryCatmull(uv,size);
        reconstructed=lerp(bilinearValue,cubicValue,saturate(1.0-step30));
    }
    return reconstructed;
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

float4 main(PSInput input):SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 uv0=input.texelSpacePos.xy;
    float2 pos=input.sceneSpacePos.xy;
    float step30=max(frameStep*0.5,0.0001);
    float bass=Audio(0),mid=Audio(1),treb=Audio(2);
    float bassAtt=Audio(3),midAtt=Audio(4),trebAtt=Audio(5);
    bool initialized=all(abs(State(15).rgb-MAGIC)<float3(.012,.012,.012));
    float bassThreshold=initialized?UnpackPositive(State(6).rgb):1.3;
float rx=initialized?State(7).r*0.04-0.02:0.0;
float ry=initialized?State(7).g*0.04-0.02:0.0;
bassThreshold=bassAtt>bassThreshold?2.0:(bassThreshold-1.3)*pow(0.96,step30)+1.3;
if(abs(bassThreshold-2.13)<0.01){rx=0.016*sin(time*7);ry=0.012*sin(time*9);}

    if(pos.y<1 && pos.x>=0 && pos.x<16) {
        if(pos.x<6) return 0.0;
        if(pos.x<7)return float4(PackPositive(bassThreshold),1);
if(pos.x<8)return float4(saturate(rx/0.04+0.5),saturate(ry/0.04+0.5),0,1);

        if(pos.x<15) return 0.0;
        return float4(MAGIC,1.0);
    }
    float2 uv=uv0;
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float2 d=(uv0-0.5)*aspect;
    float rad=length(d)*2.0;
    float ang=atan2(d.y,d.x);
    // rand_frame changes once per rendered history frame in MilkDrop.  Keep
    // the noise independent at 60/120 FPS so sqrt(step30) preserves variance;
    // repeating one 30-Hz field would add it coherently 2x/4x instead.
    float visualFrame=floor(time*30.0/max(step30,0.0001));
    float2 randFrame=float2(Hash11(visualFrame*1.13+14.1),
                            Hash11(visualFrame*1.27+29.7));
    float movementX=0.003*(0.6*sin(0.234*time)+0.4*sin(0.277*time))+rx;
float movementY=0.003*(0.6*sin(0.284*time)+0.4*sin(0.247*time))+ry;
float cx=.5+.110*(.6*sin(.374*time)+.4*sin(.294*time));
float cy=.5+.110*(.6*sin(.393*time)+.4*sin(.223*time));
float rot=.010*(.6*sin(.381*time)+.4*sin(.579*time));
uv=BuiltinUV(uv0,size,time,float2(cx,cy),1.033,rot,float2(1,1),
    float2(movementX,movementY),.04298,3.138,step30);

    float3 base=HistoryCadence(uv,size,step30);
float sum=max(base.r+base.g+base.b,0.00001);
float3 normalizedColor=base/sum;
float zoom=dot(normalizedColor,float3(1.0,0.985,0.95));
// This custom colour-dependent zoom is another recursive transform, separate
// from BuiltinUV.  Apply its multiplicative fractional step as well; using the
// full 30-Hz coefficient every frame made it run 2x/4x faster at 60/120 FPS.
float zoomStep=pow(max(zoom,0.0001),step30);
float3 result=HistoryCadence((uv-.5)*zoomStep+.5,size,step30);
float amount=0.02*step30;
float3 transfer=saturate((result-0.05)*99.0);
transfer.yz*=saturate((0.1-result.xy)*99.0);
result+=transfer.xxx*float3(-1,1,0)*amount*0.7;
result+=transfer.yyy*float3(0,-1,1)*amount*4.0;
result+=transfer.zzz*float3(0,0,-1)*amount;
float2 ditherUV=uv0*size/256.0+randFrame;
result+=(Noise(ditherUV,0)-0.5)*(5.0/256.0)*float3(1,3,8)*sqrt(step30);

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
    float3 bands=FrameAt(uv,size);
result=Lum(bands)*lerp(float3(1,1,1),float3(.2,.5,1),bands.r)*1.7;

    return float4(saturate(result),1.0);
}`;
    return {
        name: "0240", sourceId: 5, source, updateIntervalMs: 17,
        renderer: { shader, feedback: warpShader, post: compShader }
    };
};
