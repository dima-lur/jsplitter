// MilkDrop 0246 — chromatically driven painterly advection.
// Original: original/0246.milk (provided by the user; retained unchanged).
// Native mode-5 connected line adapted from 0113/0132; warp mesh remains approximate.
// Preset HLSL is invariant under 30/60/120 FPS, and uses frameStep at runtime.
// Source t0/t1: PCM, t2: six relative bands; control row is hidden from post.
// FXC compilation and comparison against MilkDrop must be verified on Windows.
MilkDropPresets["0246"] = function (TARGET_FPS) {
    const source = {
        leftChannel: 0, rightChannel: 1, durationMs: 40,
        points: 1024, relativeBandAnalysis: true
    };
    const shader = `
// Built-in MilkDrop mode 5: connected, four-point-smoothed stereo XY line.
// Geometry / channel offsets follow 0113 and 0132 (modern 0.10.0 behavior).
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
    float3 v=frac(min(saturate(x),.999999)*float3(1.0,255.0,65025.0));
    return v-v.yzz*float3(1.0/255.0,1.0/255.0,0.0);
}
float3 PackPositive(float x) {x=max(x,0.0);return PackUnit(x/(1.0+x));}
float DistanceToSegment(float2 p,float2 a,float2 b){
    float2 v=b-a;
    return length(p-a-v*saturate(dot(p-a,v)/max(dot(v,v),1e-5)));
}
float2 WavePoint(float left,float leftAhead,float right,float rightAhead,
                 float2 center,float2 size,float2 rotation){
    float x=right*leftAhead+left*rightAhead;
    float y=right*right-leftAhead*leftAhead;
    float2 rotated=float2(x*rotation.x-y*rotation.y,
                          x*rotation.y+y*rotation.x);
    return center+.5*min(size.x,size.y)*float2(rotated.x,-rotated.y);
}
float2 SmoothMidpoint(float2 below,float2 current,
                      float2 above,float2 above2){
    return (-.15*below+1.15*current+1.15*above-.15*above2)*.5;
}
float4 main(VS_OUTPUT input):SV_Target {
    int2 control=int2(floor(input.sceneSpacePos.xy));
    if(control.y==0 && control.x>=0 && control.x<6)
        return float4(PackPositive(RelativeBands.Load(int3(control.x,0,0)).r),1.0);
    if(control.y==0 && control.x<16) return 0.0;
    float2 size=max(viewportSize,float2(1,1));
    float2 pixel=input.sceneSpacePos.xy;
    float2 center=.5*size+.25*min(size.x,size.y)*
                  float2(cos(2.0*time),-sin(2.0*time));
    float2 rotation=float2(cos(2.0*time),sin(2.0*time));
    float coverage=0.0;
    int count=(int)pointCount;
    int usable=min(count,576);
    int vertexCount=min(480,usable-32);
    if(vertexCount>=3 && length(pixel-center)<=1.6*min(size.x,size.y)){
        // BuildWaves smooths all 576 samples first. A 32-slot delayed pair
        // preserves mode-5 i/i+32 reads without repeating the recurrence.
        const float waveScale=1.139;
        const float smoothing=.1;
        int sourceStart=max(count-usable,0);
        float leftDelay[32];
        float rightDelay[32];
        float leftFiltered=clamp(LeftPCM.Load(int3(sourceStart,0,0)).r,-1,1)*waveScale;
        float rightFiltered=clamp(RightPCM.Load(int3(sourceStart,0,0)).r,-1,1)*waveScale;
        leftDelay[0]=leftFiltered;
        rightDelay[0]=rightFiltered;
        float2 below=0, current=0, above=0;
        int built=0;
        [loop] for(int sample=1;sample<512;sample++){
            float leftRaw=clamp(LeftPCM.Load(int3(sourceStart+sample,0,0)).r,-1,1);
            float rightRaw=clamp(RightPCM.Load(int3(sourceStart+sample,0,0)).r,-1,1);
            leftFiltered=leftRaw*waveScale*(1-smoothing)+leftFiltered*smoothing;
            rightFiltered=rightRaw*waveScale*(1-smoothing)+rightFiltered*smoothing;
            int slot=sample&31;
            if(sample<32){
                leftDelay[slot]=leftFiltered;
                rightDelay[slot]=rightFiltered;
                continue;
            }
            int vertex=sample-32;
            if(vertex>=vertexCount)break;
            float2 dotPosition=WavePoint(leftDelay[slot],leftFiltered,
                     rightDelay[slot],rightFiltered,center,size,rotation);
            leftDelay[slot]=leftFiltered;
            rightDelay[slot]=rightFiltered;
            if(built==0){below=dotPosition;current=dotPosition;}
            else if(built==1)above=dotPosition;
            else {
                float2 midpoint=SmoothMidpoint(below,current,above,dotPosition);
                coverage+=1.0-smoothstep(.15,1.25,DistanceToSegment(pixel,current,midpoint));
                coverage+=1.0-smoothstep(.15,1.25,DistanceToSegment(pixel,midpoint,above));
                below=current;current=above;above=dotPosition;
            }
            built++;
        }
        if(built>2){
            float2 midpoint=SmoothMidpoint(below,current,above,above);
            coverage+=1.0-smoothstep(.15,1.25,DistanceToSegment(pixel,current,midpoint));
            coverage+=1.0-smoothstep(.15,1.25,DistanceToSegment(pixel,midpoint,above));
        }
    }
    // 0246 per_frame_1..3: exactly the three original color expressions.
    float3 color=saturate(float3(
        .65+.35*(.60*sin(3.980*time)+.40*sin(11.047*time)),
        .65+.35*(.60*sin(.835*time)+.40*sin(1.081*time)),
        .65+.35*(.60*sin(.814*time)+.40*sin(1.011*time))));
    float maximum=max(max(color.r,color.g),color.b);
    if(maximum>.01)color/=maximum;
    color=floor(color*255.0+.5)/255.0;
    float volume=(RelativeBands.Load(int3(0,0,0)).r+
                  RelativeBands.Load(int3(1,0,0)).r+
                  RelativeBands.Load(int3(2,0,0)).r)/3.0;
    float textureAlpha=1.0;
    if(abs(size.x-256.0)<.5)textureAlpha=.07;
    else if(abs(size.x-512.0)<.5)textureAlpha=.09;
    else if(abs(size.x-1024.0)<.5)textureAlpha=.11;
    else if(abs(size.x-2048.0)<.5)textureAlpha=.13;
    float waveAlpha=saturate(1.714*textureAlpha*(volume-.75)/(.95-.75));
    if(waveAlpha<.004)waveAlpha=0.0;
    waveAlpha=floor(waveAlpha*255.0+.5)/255.0;
    float alpha30=saturate(coverage)*waveAlpha;
    float alpha=alpha30;
    [branch] if(frameStep < 2.0)
        alpha=1.0-pow(saturate(1.0-alpha30),frameStep*.5);
    // Non-additive source-over blending, not isolated points and not additive.
    return float4(color*alpha,alpha);
}
`;
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
        // More history evaluations per 30-Hz interval cause cumulative bilinear
        // diffusion. Progressively use the sharper reconstruction as cadence rises:
        // 50% at 60 FPS and 75% at 120 FPS, while 30 FPS stays exactly bilinear.
        float3 cubic=HistoryCatmull(uv,size);
        reconstructed=lerp(bilinearValue,cubic,saturate(1.0-step30));
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
    float rot=-.014;
float cx=.5+.110*(.6*sin(.374*time)+.4*sin(.294*time));
float cy=.5+.110*(.6*sin(.393*time)+.4*sin(.223*time));
float dx=.005*(.6*sin(.173*time)+.4*sin(.223*time));
uv=BuiltinUV(uv0,size,time,float2(cx,cy),1.004,rot,float2(1,1),
             float2(dx,0),.02944,1.331,step30);
float2 t=.005+.045*saturate(float2(bass,treb)-1.0);
float2 delta=1.0/size;
float2 preview=lerp(uv,uv0,-1.0)+delta;
float3 blurred=HistoryCadence(preview,size,step30);
float2 offset=(blurred.xy-0.37)*t;
float q1=cos(time*2.0),q2=sin(time*2.0);
uv+=float2(offset.x*q1+offset.y*q2,
           offset.x*q2-offset.y*q1)*step30;

    float3 result=HistoryCadence(uv,size,step30)-0.004*step30;

    // At 60/120 FPS the smaller warp and decay increments repeatedly pass
    // through BGRA8 history. Deterministic rounding discards sub-LSB spatial
    // detail while the extra bilinear resampling keeps smoothing what remains.
    // Match 0206's zero-mean stochastic rounding so fractional changes survive
    // statistically without altering the 30-FPS reference image.
    [branch]
    if(step30<0.999) {
        float frameIndex=floor(time*30.0/step30);
        float2 jitterKey=floor(pos)+float2(frameIndex*0.75487766,
                                          frameIndex*0.56984029);
        float3 jitter=float3(Hash12(jitterKey),
                             Hash12(jitterKey+float2(17.0,53.0)),
                             Hash12(jitterKey+float2(101.0,29.0)))-0.5;
        result+=jitter*(1.0/255.0);
    }

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
    result=FrameAt(uv,size);
    return float4(saturate(result),1.0);
}`;
    return {
        name: "0246", sourceId: 5, source, updateIntervalMs: 17,
        renderer: { shader, feedback: warpShader, post: compShader }
    };
};
