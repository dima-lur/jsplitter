// MilkDrop 0141 — layered audio circles, dotted mode-0 wave and image composite.
//
// Original: original/0141.milk (PSVERSION_WARP=3, PSVERSION_COMP=2).
// Four enabled 100-sided custom shapes are rasterized as their limiting
// circles. Shape 3 declares 321 identical instances; because its equations do
// not read instance, normal blending converges to the same effectively opaque
// disc and is evaluated once. The built-in wave follows modern mode 0: 240
// original vertices, a closing point, SmoothWave and four offset point lists.
//
// The original composite samples MilkDrop3_001.jpg, _003.jpg and _008.jpg.
// They are immutable auxiliary inputs of the post pass at t1..t3; t0 remains
// the completed feedback history. Explicit frac() reproduces sampler wrap.
// GetBlur1 uses the modern horizontal/vertical MilkDrop kernel evaluated
// directly on history. GetBlur3 remains a local approximation of the final
// precomputed, downsampled blur level.

MilkDropPresets["0141"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;
    const textureDir = presetDir + "textures\\";
    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
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
static const float PI=3.141592653589793;
static const float TWO_PI=6.283185307179586;

float3 PackUnit(float value){
    float3 packed=frac(min(saturate(value),.999999)*float3(1,255,65025));
    return packed-packed.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float3 PackPositive(float value){
    value=max(value,0.0); return PackUnit(value/(1.0+value));
}
float4 Quantize(float4 value){return floor(saturate(value)*255.0+.5)/255.0;}
float PCMRight(int sampleIndex){
    int count=max((int)pointCount,1);
    int start=max(count-576,0);
    return RightPCM.Load(int3(start+clamp(sampleIndex,0,479),0,0)).r;
}
float SmoothedRight(int sampleIndex){
    float sum=0.0,weight=.5;
    [fastopt]
    for(int tap=0;tap<12;++tap){
        sum+=PCMRight(sampleIndex-tap)*weight;
        weight*=.5;
    }
    sum+=PCMRight(sampleIndex-12)*weight*2.0;
    return sum*27.455;
}
float2 WaveCenter(){
    return float2(
        .5+.2*(.60*sin(2.121*time)+.5*sin(1.621*time)),
        .5+.2*(.60*sin(1.742*time)+.5*sin(2.322*time)));
}
float2 NativeVertex(int vertex,float2 size){
    vertex=clamp(vertex,0,239);
    float radius=.5+.4*SmoothedRight(120+vertex)-1.0;
    if(vertex<24){
        float blend=.5-.5*cos((vertex/24.0)*PI);
        float other=.5+.4*SmoothedRight(360+vertex)-1.0;
        radius=lerp(other,radius,blend);
    }
    float angle=(vertex/239.0)*6.28+time*.2;
    float aspectX=min(size.x/size.y,1.0);
    float aspectY=min(size.y/size.x,1.0);
    return WaveCenter()+.5*radius*float2(cos(angle)*aspectY,
                                        sin(angle)*aspectX);
}
float2 SmoothVertex(int outputVertex,float2 size){
    outputVertex=clamp(outputVertex,0,480);
    if(outputVertex==480)return NativeVertex(0,size);
    int base=outputVertex/2;
    if((outputVertex&1)==0)return NativeVertex(base,size);
    int below=max(base-1,0),above=min(base+1,240),above2=min(base+2,240);
    float2 p0=NativeVertex(below==240?0:below,size);
    float2 p1=NativeVertex(base==240?0:base,size);
    float2 p2=NativeVertex(above==240?0:above,size);
    float2 p3=NativeVertex(above2==240?0:above2,size);
    return (-.15*p0+1.15*p1+1.15*p2-.15*p3)*.5;
}
float PointCoverage(float2 pixel,float2 position){
    float2 delta=abs(pixel-(position+.5));
    return 1.0-smoothstep(.85,1.35,max(delta.x,delta.y));
}
float CandidateCoverage(float phase,float2 pixel,float2 size){
    int nearest=(int)floor(phase*478.0+.5)%478;
    return PointCoverage(pixel,SmoothVertex(nearest,size)*size);
}
float CircularWave(float2 pixel,float2 size){
    float2 center=WaveCenter();
    float2 centered=(pixel/size-center)*2.0;
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float angle=atan2(centered.y/max(aspect.x,1e-5),
                      centered.x/max(aspect.y,1e-5));
    float phases[2]={frac((angle-time*.2)/TWO_PI),
                     frac((angle+PI-time*.2)/TWO_PI)};
    float coverage=0.0;
    [fastopt]
    for(int phaseIndex=0;phaseIndex<2;++phaseIndex)
        coverage=max(coverage,CandidateCoverage(phases[phaseIndex],pixel,size));
    return coverage;
}
void Over(inout float4 destination,float4 source){
    destination.rgb=source.rgb+destination.rgb*(1.0-source.a);
    destination.a=source.a+destination.a*(1.0-source.a);
}
float4 Disc(float2 uv,float2 size,float2 center,float radius,
            float4 centerColor,float4 edgeColor){
    if(radius<=0.0)return 0.0;
    float minimumSide=min(size.x,size.y);
    float distanceToCenter=length((uv-center)*size)*(2.0/minimumSide);
    float aa=2.0/minimumSide;
    float coverage=1.0-smoothstep(radius-aa,radius+aa,distanceToCenter);
    float t=saturate(distanceToCenter/max(radius,1e-6));
    float4 c=lerp(Quantize(centerColor),Quantize(edgeColor),t);
    c.a*=coverage; c.rgb*=c.a;
    return c;
}
float Ring(float2 uv,float2 size,float2 center,float radius,float width){
    float minimumSide=min(size.x,size.y);
    float distanceToCenter=length((uv-center)*size)*(2.0/minimumSide);
    float pixelWidth=2.0/minimumSide;
    return 1.0-smoothstep(width,width+pixelWidth,
                          abs(distanceToCenter-radius));
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.y==0 && pixel.x>=0 && pixel.x<6){
        float band=max(RelativeBands.Load(int3(pixel.x,0,0)).r,0.0);
        return float4(PackPositive(band),1.0);
    }
    float2 size=max(viewportSize,float2(1,1));
    float2 uv=input.sceneSpacePos.xy/size;
    float bass=max(RelativeBands.Load(int3(0,0,0)).r,0.0);
    float mid=max(RelativeBands.Load(int3(1,0,0)).r,0.0);
    float treb=max(RelativeBands.Load(int3(2,0,0)).r,0.0);
    float bassAtt=max(RelativeBands.Load(int3(3,0,0)).r,0.0);
    float midAtt=max(RelativeBands.Load(int3(4,0,0)).r,0.0);
    float trebAtt=max(RelativeBands.Load(int3(5,0,0)).r,0.0);
    float sounds=(bass+mid+treb)/3.0;
    float4 result=0.0;

    float2 center0=float2(.455+.207*cos(time*bass*.1),
                          .5+.2029*sin(time*bass*.09));
    Over(result,Disc(uv,size,center0,.49203*sounds*.6,
        float4(.5+sin(bass)*.5,.5+sin(mid)*.5,0,1),
        float4(.57,0,0,0)));

    float2 center1=float2(.5+.3*sin(time*bass),.5+.317*cos(time*bass));
    Over(result,Disc(uv,size,center1,.13465*(treb+mid)/3.0,
        float4(1,.09*cos((bass+mid)*1.37),0,1),
        float4(1,1+.09*sin((treb+mid)*1.23),0,.318)));

    float oscillation=sin(time*16.28);
    Over(result,Disc(uv,size,float2(.5,.5),.4,
        float4(1,1,1,.19),
        float4(.5+.25*oscillation-bass,
               .445+1.25*oscillation-bass,.94,0)));

    float2 center3=float2(.475+.407*tan(time*bass*.1),
                          .5+.4029*sin(time*bass*.09));
    float radius3=.22388*sounds*.3;
    Over(result,Disc(uv,size,center3,radius3,
        float4(1+sin(bass)*bass,tan(mid)*bass,0,1),
        float4(0,1,1,1)));
    float border=Ring(uv,size,center3,radius3,4.0/min(size.x,size.y));
    Over(result,float4(Quantize(float4(1,.46,1,1)).rgb*border,border));

    float alpha=saturate(100.0*(sounds-.4)/.6);
    alpha=floor(alpha*255.0+.5)/255.0;
    float coverage=CircularWave(input.sceneSpacePos.xy,size);
    float3 waveColor=saturate(float3(
        1+.2*(.60*sin(.823*time)+.40*sin(.916*time)),
        1+.5*(.60*sin(.900*time)+.40*sin(1.023*time)),
        1+.5*(.60*sin(.808*time)+.40*sin(.949*time))));
    waveColor=floor(waveColor*255.0+.5)/255.0;
    float waveOpacity=coverage*alpha;
    Over(result,float4(waveColor*waveOpacity,waveOpacity));

    float step30=max(frameStep*.5,.0001);
    if(step30<.9999 && result.a>1e-6){
        float temporalAlpha=1.0-pow(saturate(1.0-result.a),step30);
        result.rgb*=temporalAlpha/result.a;
        result.a=temporalAlpha;
    }
    return saturate(result);
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
static const float PI=3.141592653589793;
float UnpackUnit(float3 packed){return dot(packed,float3(1,1.0/255.0,1.0/65025.0));}
float UnpackPositive(float3 packed){
    float value=min(UnpackUnit(packed),.99999);
    return value/max(1.0-value,.00001);
}
int Wrap(int value,int count){int r=value%count;return r<0?r+count:r;}
float3 HistoryWrapTexel(int2 pixel,int2 dimensions){
    pixel.x=Wrap(pixel.x,dimensions.x);pixel.y=Wrap(pixel.y,dimensions.y);
    if(pixel.y==0 && pixel.x<6)return Previous.Load(int3(min(6,dimensions.x-1),0,0)).rgb;
    return Previous.Load(int3(pixel,0)).rgb;
}
float3 HistoryWrap(float2 uv,float2 size){
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5; int2 base=int2(floor(xy)); float2 f=frac(xy);
    float3 top=lerp(HistoryWrapTexel(base,dimensions),
                    HistoryWrapTexel(base+int2(1,0),dimensions),f.x);
    float3 bottom=lerp(HistoryWrapTexel(base+int2(0,1),dimensions),
                       HistoryWrapTexel(base+int2(1,1),dimensions),f.x);
    return lerp(top,bottom,f.y);
}
float3 HistoryClampTexel(int2 pixel,int2 dimensions){
    pixel=clamp(pixel,int2(0,0),dimensions-1);
    if(pixel.y==0 && pixel.x<6)
        pixel.x=min(6,dimensions.x-1);
    return Previous.Load(int3(pixel,0)).rgb;
}
float3 HistoryClamp(float2 uv,float2 size){
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5; int2 base=int2(floor(xy)); float2 f=frac(xy);
    float3 top=lerp(HistoryClampTexel(base,dimensions),
                    HistoryClampTexel(base+int2(1,0),dimensions),f.x);
    float3 bottom=lerp(HistoryClampTexel(base+int2(0,1),dimensions),
                       HistoryClampTexel(base+int2(1,1),dimensions),f.x);
    return lerp(top,bottom,f.y);
}
float3 Blur1Horizontal(float2 uv,float2 size){
    const float4 weights=float4(7.8,6.4,3.1,1.0);
    const float4 offsets=float4(.974358974,2.90625,4.774193548,6.6);
    const float footprint=1.75;
    float2 aligned=uv+1.0/size;
    float3 sum=0.0;
    [fastopt]
    for(int i=0;i<4;++i){
        float2 offset=float2(offsets[i]*footprint/size.x,0.0);
        sum+=(HistoryClamp(aligned+offset,size)+
              HistoryClamp(aligned-offset,size))*weights[i];
    }
    return sum*.027322404;
}
float3 Blur1(float2 uv,float2 size){
    const float2 weights=float2(14.2,4.1);
    const float2 offsets=float2(.901408451,2.487804878);
    const float footprint=1.75;
    float2 aligned=uv+float2(2.0/size.x,0.0);
    float3 sum=0.0;
    [fastopt]
    for(int i=0;i<2;++i){
        float2 offset=float2(0.0,offsets[i]*2.0*footprint/size.y);
        sum+=(Blur1Horizontal(aligned+offset,size)+
              Blur1Horizontal(aligned-offset,size))*weights[i];
    }
    float edge=min(min(uv.x,uv.y),1.0-max(uv.x,uv.y));
    return sum*.027322404*(.75+.25*saturate(sqrt(max(edge,0.0))*5.0));
}
float3 Blur3(float2 uv,float2 size){
    float2 step=18.0/size;
    float3 sum=HistoryClamp(uv,size)*4.0;
    sum+=(HistoryClamp(uv+float2(step.x,0),size)+HistoryClamp(uv-float2(step.x,0),size)+
          HistoryClamp(uv+float2(0,step.y),size)+HistoryClamp(uv-float2(0,step.y),size))*2.0;
    sum+=HistoryClamp(uv+step,size)+HistoryClamp(uv-step,size)+
         HistoryClamp(uv+float2(step.x,-step.y),size)+
         HistoryClamp(uv+float2(-step.x,step.y),size);
    return sum/16.0;
}
float3 HashNoiseTexel(float2 p){
    p-=floor(p/256.0)*256.0;
    float3 random=frac(sin(float3(dot(p,float2(127.1,311.7)),
        dot(p,float2(269.5,183.3)),dot(p,float2(419.2,371.9))))*43758.5453123);
    return floor(random*256.0)/255.0;
}
float2 FrameNoiseOffset(float frameIndex){
    return frac(sin(frameIndex*float2(12.9898,78.233)+float2(37.719,11.135))*43758.5453123)*256.0;
}
float3 NoiseTexture(float2 uv,float2 size,float frameIndex){
    float2 texel=uv*size+FrameNoiseOffset(frameIndex)-.5;
    float2 base=floor(texel),f=frac(texel);
    return lerp(lerp(HashNoiseTexel(base),HashNoiseTexel(base+float2(1,0)),f.x),
                lerp(HashNoiseTexel(base+float2(0,1)),HashNoiseTexel(base+float2(1,1)),f.x),f.y);
}
float2 VertexUV(float2 original,float2 size,float step30){
    float2 aspect=min(float2(1,1),float2(size.x/size.y,size.y/size.x));
    float2 d=(original-.5)*2.0;
    float rad=length(d*aspect);
    float ang=dot(d,d)<1e-12?0.0:atan2(-d.y*aspect.y,d.x*aspect.x);
    float zoom=1.007+.01*sin(2.0*(sqrt(3.0)-rad)*ang);
    float exponent=pow(1.001,rad*2.0-1.0);
    float zoomStep=pow(max(zoom,.001),exponent*step30);
    return .5+(original-.5)/zoomStep+.5/size;
}
float2 MeshUV(float2 original,float2 size,float step30){
    const float2 grid=float2(48,36);
    float2 scaled=saturate(original)*grid;
    float2 cell=min(floor(scaled),grid-1.0),f=scaled-cell;
    float2 c00=cell/grid,c10=(cell+float2(1,0))/grid;
    float2 c01=(cell+float2(0,1))/grid,c11=(cell+1.0)/grid;
    bool lower=f.x+f.y<=1.0;
    float3 weight=lower?float3(1-f.x-f.y,f.x,f.y):
                        float3(1-f.y,1-f.x,f.x+f.y-1);
    float2 a=VertexUV(lower?c00:c10,size,step30);
    float2 b=VertexUV(lower?c10:c01,size,step30);
    float2 c=VertexUV(lower?c01:c11,size,step30);
    return weight.x*a+weight.y*b+weight.z*c;
}
float4 main(PSInput input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.y==0 && pixel.x>=0 && pixel.x<6)return 0.0;
    float2 size=max(viewportSize,float2(1,1));
    float step30=max(frameStep*.5,.0001);
    float2 uvOriginal=input.texelSpacePos.xy;
    float2 uv=MeshUV(uvOriginal,size,step30);
    float2 d=8.0/size;
    // Native GetBlur1 is sampled from a precomputed downsampled texture. The
    // direct full-resolution kernel has a weaker gradient, so restore the
    // measured field amplitude before using it as a flow vector.
    const float blurFlowGain=2.0;
    float2 blur1Uv[4]={uv+float2(d.x,0),uv-float2(d.x,0),
                       uv+float2(0,d.y),uv-float2(0,d.y)};
    float3 blur1Value[4];
    [fastopt]
    for(int blurIndex=0;blurIndex<4;++blurIndex)
        blur1Value[blurIndex]=Blur1(blur1Uv[blurIndex],size);
    float3 dx=(blur1Value[0]-blur1Value[1])*blurFlowGain;
    float3 dy=(blur1Value[2]-blur1Value[3])*blurFlowGain;
    // Subpixel feedback advection loses strength under repeated UNORM8
    // resampling. A sublinear cadence correction preserves the 30 FPS flow
    // character without applying full 30 Hz motion on every high-FPS frame.
// Preserve the 30..120-Hz resampling compensation; above 120 Hz
// keep the same displacement budget per second as at 120 Hz.
    float flowStep=step30 * pow(max(step30, .25), -.32);
    float frameIndex=floor(time*(60.0/max(frameStep,.001)));
    float3 noise=NoiseTexture(uvOriginal,size,frameIndex)-.5;
    float2 uvBlue=uv+float2(dx.b,dy.b)/size*4.0*flowStep;
    float2 uvRed=uv-float2(dx.r,dy.r)/size*flowStep;
    float2 blur3Uv[2]={uvBlue,uvRed};
    float3 blur3Value[2];
    [fastopt]
    for(int blur3Index=0;blur3Index<2;++blur3Index)
        blur3Value[blur3Index]=Blur3(blur3Uv[blur3Index],size);
    float blue=HistoryWrap(uvBlue,size).b;
    blue-=(blue-blur3Value[0].b)*.02*step30;
    blue-=.008*step30;
    blue+=noise.b*.1*sqrt(step30);
    float red=HistoryWrap(uvRed,size).r;
    red+=(red-blur3Value[1].r)*.4*step30+.006*step30;
    float2 uvGreen=uv-float2(dx.r,dy.r)/size*8.0*flowStep+
                       float2(dx.g,dy.g)/size*4.0*flowStep+
                       float2(dx.b,dy.b)/size*8.0*flowStep;
    float green=HistoryClamp(uvGreen,size).g;
    green*=1.0+red*.1*step30;
    green-=(.004+saturate(blue)*.012)*step30;
    float3 result=float3(red,green,blue)*pow(.955,step30);
    return float4(saturate(result),1.0);
}`;

    const compShader = `
Texture2D Frame : register(t0);
Texture2D Texture001 : register(t1);
Texture2D Texture003 : register(t2);
Texture2D Texture008 : register(t3);
SamplerState Sampler001 : register(s1);
SamplerState Sampler003 : register(s2);
SamplerState Sampler008 : register(s3);
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
int Wrap(int value,int count){int r=value%count;return r<0?r+count:r;}
float3 Sample001(float2 uv){return Texture001.Sample(Sampler001,frac(uv)).rgb;}
float3 Sample003(float2 uv){return Texture003.Sample(Sampler003,frac(uv)).rgb;}
float3 Sample008(float2 uv){return Texture008.Sample(Sampler008,frac(uv)).rgb;}
float3 FrameTexel(int2 pixel,int2 dimensions,bool wrapTexture){
    if(wrapTexture){pixel.x=Wrap(pixel.x,dimensions.x);pixel.y=Wrap(pixel.y,dimensions.y);}
    else pixel=clamp(pixel,int2(0,0),dimensions-1);
    if(pixel.y==0 && pixel.x<6)pixel.x=min(6,dimensions.x-1);
    return Frame.Load(int3(pixel,0)).rgb;
}
float3 Image(float2 uv,float2 size,bool wrapTexture){
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5;int2 base=int2(floor(xy));float2 f=frac(xy);
    float3 top=lerp(FrameTexel(base,dimensions,wrapTexture),
                    FrameTexel(base+int2(1,0),dimensions,wrapTexture),f.x);
    float3 bottom=lerp(FrameTexel(base+int2(0,1),dimensions,wrapTexture),
                       FrameTexel(base+int2(1,1),dimensions,wrapTexture),f.x);
    return lerp(top,bottom,f.y);
}
float3 Blur1Horizontal(float2 uv,float2 size){
    const float4 weights=float4(7.8,6.4,3.1,1.0);
    const float4 offsets=float4(.974358974,2.90625,4.774193548,6.6);
    const float footprint=1.75;
    float2 aligned=uv+1.0/size;
    float3 sum=0.0;
    [fastopt]
    for(int i=0;i<4;++i){
        float2 offset=float2(offsets[i]*footprint/size.x,0.0);
        sum+=(Image(aligned+offset,size,false)+
              Image(aligned-offset,size,false))*weights[i];
    }
    return sum*.027322404;
}
float3 Blur1(float2 uv,float2 size){
    const float2 weights=float2(14.2,4.1);
    const float2 offsets=float2(.901408451,2.487804878);
    const float footprint=1.75;
    float2 aligned=uv+float2(2.0/size.x,0.0);
    float3 sum=0.0;
    [fastopt]
    for(int i=0;i<2;++i){
        float2 offset=float2(0.0,offsets[i]*2.0*footprint/size.y);
        sum+=(Blur1Horizontal(aligned+offset,size)+
              Blur1Horizontal(aligned-offset,size))*weights[i];
    }
    float edge=min(min(uv.x,uv.y),1.0-max(uv.x,uv.y));
    return sum*.027322404*(.75+.25*saturate(sqrt(max(edge,0.0))*5.0));
}
float4 main(PSInput input) : SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 uv=input.texelSpacePos.xy;
    float3 initial=Image(uv,size,true);
    float2 texc=.37+.55*initial.xy;
    float2 d=22.0/size;
    const float blurFlowGain=2.0;
    float2 pivot=float2(1,0);
    float2 bgUv=pivot+(uv-pivot)*.992;
    float2 midUv=pivot+(uv-pivot)*.996;
    float2 blur1Uv[5]={uv+float2(d.x,0),uv-float2(d.x,0),
                       uv+float2(0,d.y),uv-float2(0,d.y),bgUv};
    float3 blur1Value[5];
    [fastopt]
    for(int blurIndex=0;blurIndex<5;++blurIndex)
        blur1Value[blurIndex]=Blur1(blur1Uv[blurIndex],size);
    float3 dx=(blur1Value[0]-blur1Value[1])*blurFlowGain;
    float3 dy=(blur1Value[2]-blur1Value[3])*blurFlowGain;
    float3 blur1Bg=blur1Value[4];
    float2 myUv=uv+float2(dx.g,dy.g)*.2;
    float3 result=lerp(float3(0,0,.2),float3(.3,0,1),Image(bgUv,size,true).g);
    result=lerp(result,float3(1,1,0),
        max(blur1Bg.b*1.5,Image(midUv,size,true).b));
    result*=1.0-blur1Bg.r*2.0;
    result=lerp(result,float3(1,.01,.4),Image(uv,size,true).r);
    float3 re=Sample008(myUv)-Sample008(texc);
    re=lerp(Sample003(myUv),re,result.r);
    result=lerp(re,1.0-re,result.g)/1.2+
           Sample001(texc)*result.g;
    return float4(saturate(result),1.0);
}`;

    return {
        name: "0141",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: {
                shader: compShader,
                textures: [
                    textureDir + "MilkDrop3_001.jpg",
                    textureDir + "MilkDrop3_003.jpg",
                    textureDir + "MilkDrop3_008.jpg"
                ]
            }
        }
    };
};
