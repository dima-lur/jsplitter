// MilkDrop 0206 — cubic history with reduced high-FPS microtexture.
// History sampling blends from bilinear at 30 Hz to 90% Catmull-Rom plus
// 10% bilinear at 60 Hz and above. The small bilinear contribution damps
// fine history variations that the gradient-based composite magnifies.
// At an exact 30-FPS step, sampling and dithering remain unchanged.
// Do not treat this as a verified native MilkDrop sampler.
// Original: original/0206.milk (provided by the user; retained unchanged).
// Mode-1 geometry follows 0101, with Y flipped for the original CCW rotation. The variable vol is persistent,
// but MilkDrop's built-in wave_mystery resets to fWaveParam each frame.
// Thus per_frame adds .6*vol to -1, not to the previous wave_mystery.
// Native noise textures remain an approximation.
// Preset HLSL is independent of the selected FPS; frameStep is a runtime input.
// Source t0/t1: PCM, t2: relative bands. Top row holds band/state + current
// PCM and is completely hidden from the post pass. Narrow panels wrap
// the packed PCM strip into subsequent rows.
// FXC compilation and comparison against MilkDrop must be verified on Windows.
MilkDropPresets["0206"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };
    // Feedback needs the current PCM as well as persistent EEL state. The source
    // pass packs 272 raw stereo samples into a hidden raster strip starting at pixel (16,0).
    // Existing six relative-band values remain at pixels 0..5.
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
float3 PackUnit(float x) {
    float3 v=frac(min(saturate(x),0.999999)*float3(1.0,255.0,65025.0));
    return v-v.yzz*float3(1.0/255.0,1.0/255.0,0.0);
}
float3 PackPositive(float x) { x=max(x,0.0);return PackUnit(x/(1.0+x)); }
float4 main(VS_OUTPUT input) : SV_Target {
    int2 p=int2(floor(input.sceneSpacePos.xy));
    if (p.y==0 && p.x>=0 && p.x<6) {
        float band=max(RelativeBands.Load(int3(p.x,0,0)).r,0.0);
        return float4(PackPositive(band),1.0);
    }
    int columns=max((int)viewportSize.x-16,1);
    int index=p.y*columns+p.x-16;
    if (p.x>=16 && p.y>=0 && index>=0 && index<272) {
        int count=max((int)pointCount,1);
        int first=max(count-min(count,576),0);
        int offset=clamp(first+index,0,count-1);
        float left=clamp(LeftPCM.Load(int3(offset,0,0)).r,-1.0,1.0);
        float right=clamp(RightPCM.Load(int3(offset,0,0)).r,-1.0,1.0);
        return float4(left*0.5+0.5,right*0.5+0.5,0.0,1.0);
    }
    return float4(0,0,0,0);
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
    int columns=max(dim.x-16,1);
    int pcmSlot=pos.y*columns+pos.x-16;
    if(pos.y==0 && pos.x<16) return 0;
    if(pos.x>=16 && pcmSlot>=0 && pcmSlot<272) return 0;
    return Previous.Load(int3(pos,0)).rgb;
}
// Catmull-Rom for feedback steps shorter than 1/30 s: lower diffusion.
// Preserve the exact verified 30-FPS bilinear path.
float4 CubicWeights(float t){
    float t2=t*t, t3=t2*t;
    return float4(-0.5*t+t2-0.5*t3,
                   1.0-2.5*t2+1.5*t3,
                   0.5*t+2.0*t2-1.5*t3,
                  -0.5*t2+0.5*t3);
}
float3 CubicRow(int2 p,int2 dim,float4 wx){
    return Texel(p+int2(-1,0),dim)*wx.x
         + Texel(p,dim)*wx.y
         + Texel(p+int2(1,0),dim)*wx.z
         + Texel(p+int2(2,0),dim)*wx.w;
}
float3 HistoryCubic(float2 uv,float2 size){
    int2 dim=max(int2(size),int2(1,1));
    float2 xy=uv*size-0.5;
    int2 b=int2(floor(xy));
    float2 t=frac(xy);
    float4 wx=CubicWeights(t.x),wy=CubicWeights(t.y);
    float3 c=CubicRow(b+int2(0,-1),dim,wx)*wy.x
            +CubicRow(b,dim,wx)*wy.y
            +CubicRow(b+int2(0,1),dim,wx)*wy.z
            +CubicRow(b+int2(0,2),dim,wx)*wy.w;
    // Catmull-Rom has negative lobes. Avoid out-of-range color overshoot.
    return saturate(c);
}
float3 History(float2 uv,float2 size){

    int2 dim=max(int2(size),int2(1,1));
    float2 xy=uv*size-0.5;
    int2 b=int2(floor(xy)); float2 f=frac(xy);
    float3 a=lerp(Texel(b,dim),Texel(b+int2(1,0),dim),f.x);
    float3 c=lerp(Texel(b+int2(0,1),dim),Texel(b+int2(1,1),dim),f.x);
    float3 bilinearValue=lerp(a,c,f.y);
    // Pure cubic feedback retains too much fine relief at high FPS. Keep
    // a small bilinear contribution before the composite takes gradients;
    // preserve the original bilinear path at a full 30-Hz reference step.
    const float highFpsCubicWeight = 0.9;
    return frameStep<2.0 ? lerp(bilinearValue,HistoryCubic(uv,size),
        highFpsCubicWeight*saturate(2.0-frameStep)) : bilinearValue;
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

// Mode 1 is rendered here to use the current smoothed volume.
// wave_mystery is per-frame, whereas vol and mtime are persistent EEL variables.
float2 StereoPCM(int i) {
    int columns=max((int)viewportSize.x-16,1);
    int sampleIndex=clamp(i,0,271);
    int2 address=int2(16+sampleIndex%columns,sampleIndex/columns);
    float4 packed=Previous.Load(int3(address,0));
    return saturate(packed.rg)*2.0-1.0;
}
float2 SpiralVertex(float left,float right,float mystery,float2 size) {
    // MilkDrop uses Y-up geometry; screen-space Y increases downward.
    float radius=0.53+0.43*right+mystery;
    float angle=left*1.57+time*2.3;
    return 0.5*size+0.5*min(size.x,size.y)*radius*
           float2(cos(angle),-sin(angle));
}
float2 NextSpiral(int vertex,float mystery,inout float leftSmooth,
                  inout float rightSmooth,float2 size) {
    const float waveScale=0.43;
    const float smooth=0.9;
    float l=StereoPCM(vertex+32).r*waveScale;
    float r=StereoPCM(vertex).g*waveScale;
    leftSmooth=l*(1.0-smooth)+leftSmooth*smooth;
    rightSmooth=vertex==0?r:r*(1.0-smooth)+rightSmooth*smooth;
    return SpiralVertex(leftSmooth,rightSmooth,mystery,size);
}
float SegmentDistance(float2 p,float2 a,float2 b) {
    float2 ab=b-a;
    return length(p-a-ab*saturate(dot(p-a,ab)/max(dot(ab,ab),1e-5)));
}
void ThickLine(float2 p,float2 a,float2 b,inout float4 nearest) {
    nearest.x=min(nearest.x,SegmentDistance(p,a,b));
    nearest.y=min(nearest.y,SegmentDistance(p,a+float2(1,0),b+float2(1,0)));
    nearest.z=min(nearest.z,SegmentDistance(p,a+float2(1,-1),b+float2(1,-1)));
    nearest.w=min(nearest.w,SegmentDistance(p,a+float2(0,-1),b+float2(0,-1)));
}
float WaveCoverage(float2 p,float2 size,float mystery) {
    if(length(p-0.5*size)>0.96*min(size.x,size.y)) return 0.0;
    float leftSmooth=StereoPCM(0).r*0.43;
    [fastopt] for(int prime=1;prime<32;++prime) {
        float l=StereoPCM(prime).r*0.43;
        leftSmooth=l*0.1+leftSmooth*0.9;
    }
    float rightSmooth=0.0;
    float2 below=NextSpiral(0,mystery,leftSmooth,rightSmooth,size);
    float2 a=below;
    float2 b=NextSpiral(1,mystery,leftSmooth,rightSmooth,size);
    float4 nearest=1e6;
    [fastopt] for(int vertex=2;vertex<240;vertex++) {
        float2 c=NextSpiral(vertex,mystery,leftSmooth,rightSmooth,size);
        float2 mid=(-0.15*below+1.15*a+1.15*b-0.15*c)*0.5;
        ThickLine(p,a,mid,nearest);
        ThickLine(p,mid,b,nearest);
        below=a; a=b; b=c;
    }
    float2 lastMid=(-0.15*below+1.15*a+1.15*b-0.15*b)*0.5;
    ThickLine(p,a,lastMid,nearest);
    ThickLine(p,lastMid,b,nearest);
    return saturate(dot(1.0-smoothstep(0.15,1.25,nearest),float4(1,1,1,1)));
}
float4 main(PSInput input):SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 uv0=input.texelSpacePos.xy;
    float2 pos=input.sceneSpacePos.xy;
    float step30=max(frameStep*0.5,0.0001);
    float bass=Audio(0),mid=Audio(1),treb=Audio(2);
    float bassAtt=Audio(3),midAtt=Audio(4),trebAtt=Audio(5);
    bool initialized=all(abs(State(15).rgb-MAGIC)<float3(.012,.012,.012));
    float oldVolume=initialized?UnpackPositive(State(6).rgb):0.0;
float volumeFade=pow(0.9,step30);
float volume=volumeFade*oldVolume+(1.0-volumeFade)*(bassAtt+midAtt+trebAtt)/3.0;
// The built-in wave_mystery is initialized to fWaveParam (-1.0)
// at every frame, then the preset adds 0.6*vol. Only vol accumulates.
float waveMystery=-1.0+0.6*volume;
float oldMusic=initialized?UnpackUnit(State(7).rgb):0.0;
float music=frac(oldMusic + volume*0.01/(20.0*PI)*step30);
float qMusic=music*20.0*PI;

    int pcmColumns=max((int)size.x-16,1);
    int pcmIndex=(int)pos.y*pcmColumns+(int)pos.x-16;
    if(pos.x>=16 && pos.y>=0 && pcmIndex>=0 && pcmIndex<272)
        return Previous.Load(int3((int2)pos,0));
    if(pos.y<1 && pos.x>=0 && pos.x<16) {
        if(pos.x<6) return 0.0;
        if(pos.x<7) return float4(PackPositive(volume),1);
if(pos.x<8) return float4(PackUnit(music),1);
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
    float localRotation=log(max(uv0.x+0.1,0.0001))*(uv0.x+0.1)*0.1;
uv=BuiltinUV(uv0,size,time,
    float2(0.5+0.2*sin(qMusic),0.5-0.2*sin(qMusic*1.2)),
    1.0298,localRotation,float2(.99010,.97078),float2(0,0),
    0.01,0.403,step30);
float2 ditherUV=uv0*size/256.0*1.5+randFrame;
float noiseR=Noise(ditherUV,0).r;
float blend=1.3-rad+(noiseR-0.5)*0.15;
// BuiltinUV already scales the displacement by step30. The next
// lerp is a spatial modifier, not a second per-frame displacement:
// scaling its weight again reverses some warp directions at 60/120 FPS.
uv=lerp(uv,uv0,blend);
float3 displaced=History(saturate(uv),size);
float lum=dot(displaced,float3(.299,.587,.114));
uv.y-=(lum-.35)*(lum-.4)*64.0/size.y*step30;

    float3 result=History(saturate(uv),size)-0.0011*step30;
result+=(Noise(ditherUV,0)-0.5)*(0.0038*step30);
    // Reduced zero-mean dither for sub-LSB feedback changes.
    // Retain the requested 50% amplitude for the added high-FPS dither;
    // this is a visual compromise, not full stochastic rounding.
    // Active above the reference cadence, preserving the 30-FPS path.
    // The feedback bitmap uses an 8-bit UNORM format.
    if (step30 < 0.999) {
        float frameIndex=floor(time*30.0/step30);
        float2 jitterKey=floor(pos)+float2(frameIndex*0.75487766,
                                          frameIndex*0.56984029);
        float3 jitter=float3(Hash12(jitterKey),
                             Hash12(jitterKey+float2(17.0,53.0)),
                             Hash12(jitterKey+float2(101.0,29.0)))-0.5;
        result+=jitter*(0.5/255.0);
    }

    // Native order: warp the old canvas, then blend the current built-in wave.
    float alpha=WaveCoverage(pos,size,waveMystery);
    if(step30<1.0) alpha=1.0-pow(saturate(1.0-alpha),step30);
    float3 waveColor=saturate(float3(
        0.5+0.5*(0.6*sin(time*1.3)+0.4*sin(time*0.98)),
        0.5+0.5*(0.6*sin(time*1.2)+0.4*sin(time*0.6)),
        0.5+0.5*(0.6*sin(time*1.1)+0.4*sin(time*0.78))));
    waveColor=floor(waveColor*255.0+0.5)/255.0;
    result=lerp(saturate(result),waveColor,alpha);
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
    int cols=max(size.x-16,1);
    int index=p.y*cols+p.x-16;
    if(p.y==0 && p.x<16) return 0.0;
    if(p.x>=16 && index>=0 && index<272) return 0.0;
    return Frame.Load(int3(p,0)).rgb;}
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
    float3 current=FrameAt(uv,size);
float dx=FrameAt(uv-float2(1.0/size.x,0),size).r-
         FrameAt(uv+float2(1.0/size.x,0),size).r;
float dy=FrameAt(uv-float2(0,1.0/size.y),size).r-
         FrameAt(uv+float2(0,1.0/size.y),size).r;
float2 gradient=float2(dx,dy);
float2 seed=(uv-.5)*0.0+0.3*cos((uv-.5)*2.0)-gradient;
float dots=saturate(.04/max(length(seed),0.0001));
// Original comp_17 overwrites uv1 again: cos() takes the result of comp_15.
float2 seed2=0.3*cos(seed*12.0)-9.0*gradient;
float dots2=saturate(.04/max(length(seed2),0.0001));
result=float3(dots,dots,dots)+current*12.0*dots2;

    return float4(saturate(result),1.0);
}`;
    return {
        name: "0206", sourceId: 5, source, updateIntervalMs: 17,
        renderer: { shader, feedback: warpShader, post: compShader }
    };
};
