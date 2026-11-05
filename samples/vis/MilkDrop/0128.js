// MilkDrop 0128 — noisy monochrome feedback, lava composite and a burned sprite.
//
// Original: original/0128.milk (PSVERSION_WARP=2, PSVERSION_COMP=3).
// The built-in mode-7 stereo waveform follows modern BuildWaves/SmoothWave:
// 240 source vertices, recursive PCM smoothing, a 479-vertex strip per
// channel, and the native thick-line offsets. The source-color sprite blend
// is evaluated in feedback because SpriteBurn=1; MilkDrop3_026.jpg is t1.
//
// sampler_noise_lq is approximated by a deterministic 256x256 RGBA8 hash
// texture with a new wrapped rand_frame offset for every history step.
// GetBlur1 uses the established modern two-stage kernel. The dead projection
// branch in the original composite simplifies exactly: bdist never exceeds
// one, therefore saturate(bdist-2) is zero and lerp(1,sky,bdist)=1-bdist.

MilkDropPresets["0128"] = function (TARGET_FPS) {
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
float3 PackUnit(float value) {
    float3 packed=frac(min(saturate(value),.999999)*float3(1,255,65025));
    return packed-packed.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float3 PackPositive(float value) {
    value=max(value,0.0);
    return PackUnit(value/(1.0+value));
}
float DistanceToSegment(float2 p,float2 a,float2 b) {
    float2 ab=b-a;
    float t=saturate(dot(p-a,ab)/max(dot(ab,ab),1e-5));
    return length(p-a-ab*t);
}
float SegmentCoverage(float2 p,float2 a,float2 b) {
    float coverage=1.0-smoothstep(.15,1.25,DistanceToSegment(p,a,b));
    coverage=max(coverage,1.0-smoothstep(.15,1.25,
        DistanceToSegment(p,a+float2(1,0),b+float2(1,0))));
    coverage=max(coverage,1.0-smoothstep(.15,1.25,
        DistanceToSegment(p,a+float2(1,-1),b+float2(1,-1))));
    coverage=max(coverage,1.0-smoothstep(.15,1.25,
        DistanceToSegment(p,a+float2(0,-1),b+float2(0,-1))));
    return coverage;
}
float2 ToPixels(float2 nativePoint,float2 size) {
    return float2((nativePoint.x+1.0)*.5*size.x,
                  (1.0-nativePoint.y)*.5*size.y);
}
float2 ReadSmoothedStereo(int sample,int sourceStart,
                          inout float2 smoothed,bool first) {
    const float waveScale=1.351;
    const float smoothing=.630;
    float2 raw=clamp(float2(
        LeftPCM.Load(int3(sourceStart+sample,0,0)).r,
        RightPCM.Load(int3(sourceStart+sample,0,0)).r),-1.0,1.0)*waveScale;
    smoothed=first?raw:raw*(1.0-smoothing)+smoothed*smoothing;
    return smoothed;
}
void WavePoints(int vertex,float2 amplitudes,float2 edgeStart,
                float2 lineStep,float2 perpendicular,float2 size,
                out float2 leftPoint,out float2 rightPoint) {
    float2 base=edgeStart+lineStep*vertex;
    const float separation=.25; // wave_y^2, wave_y=.5.
    leftPoint=ToPixels(base+perpendicular*(.25*amplitudes.x+separation),size);
    rightPoint=ToPixels(base+perpendicular*(.25*amplitudes.y-separation),size);
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.y==0 && pixel.x==0) {
        float midAtt=max(RelativeBands.Load(int3(4,0,0)).r,0.0);
        return float4(PackPositive(midAtt),1.0);
    }
    float2 size=max(viewportSize,float2(1,1));
    float2 p=input.sceneSpacePos.xy;
    int count=(int)pointCount;
    int usable=min(count,576);
    int vertexCount=min(240,min(usable,(int)(size.x/3.0)));
    if(vertexCount<3)return 0.0;
    int sourceStart=max(count-usable,0);
    int sampleOffset=(usable-vertexCount)/2;
    float2 edgeStart=float2(-1.1,0.0);
    float2 lineStep=float2(2.2/vertexCount,0.0);
    float2 perpendicular=float2(0.0,1.0);
    float2 smoothed=0.0;
    [loop]
    for(int sample=0;sample<576;++sample) {
        if(sample>=usable)break;
        ReadSmoothedStereo(sample,sourceStart,smoothed,sample==0);
        if(sample>=sampleOffset)break;
    }
    float2 leftBelow,rightBelow;
    WavePoints(0,smoothed,edgeStart,lineStep,perpendicular,size,
               leftBelow,rightBelow);
    float2 leftA=leftBelow,rightA=rightBelow;
    ReadSmoothedStereo(sampleOffset+1,sourceStart,smoothed,false);
    float2 leftB,rightB;
    WavePoints(1,smoothed,edgeStart,lineStep,perpendicular,size,leftB,rightB);
    float coverage=0.0;
    [loop]
    for(int vertex=2;vertex<240;++vertex) {
        if(vertex>=vertexCount)break;
        ReadSmoothedStereo(sampleOffset+vertex,sourceStart,smoothed,false);
        float2 leftC,rightC;
        WavePoints(vertex,smoothed,edgeStart,lineStep,perpendicular,size,
                   leftC,rightC);
        float2 leftMid=(-.15*leftBelow+1.15*leftA+1.15*leftB-.15*leftC)*.5;
        float2 rightMid=(-.15*rightBelow+1.15*rightA+1.15*rightB-.15*rightC)*.5;
        coverage=max(coverage,SegmentCoverage(p,leftA,leftMid));
        coverage=max(coverage,SegmentCoverage(p,leftMid,leftB));
        coverage=max(coverage,SegmentCoverage(p,rightA,rightMid));
        coverage=max(coverage,SegmentCoverage(p,rightMid,rightB));
        leftBelow=leftA;leftA=leftB;leftB=leftC;
        rightBelow=rightA;rightA=rightB;rightB=rightC;
    }
    float2 leftLast=(-.15*leftBelow+1.15*leftA+1.15*leftB-.15*leftB)*.5;
    float2 rightLast=(-.15*rightBelow+1.15*rightA+1.15*rightB-.15*rightB)*.5;
    coverage=max(coverage,SegmentCoverage(p,leftA,leftLast));
    coverage=max(coverage,SegmentCoverage(p,leftLast,leftB));
    coverage=max(coverage,SegmentCoverage(p,rightA,rightLast));
    coverage=max(coverage,SegmentCoverage(p,rightLast,rightB));
    // wave_rgb=.65 is maximized to white; alpha 1.059 clamps and rounds to 1.
    coverage=saturate(coverage);
    return float4(coverage.xxx,coverage);
}`;

    const warpShader = `
Texture2D Previous : register(t0);
Texture2D SpriteTexture : register(t1);
SamplerState SpriteSampler : register(s1);
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
int Wrap(int value,int count){int wrapped=value%count;return wrapped<0?wrapped+count:wrapped;}
float3 HistoryTexel(int2 pixel,int2 dimensions) {
    pixel=int2(Wrap(pixel.x,dimensions.x),Wrap(pixel.y,dimensions.y));
    if(pixel.x==0&&pixel.y==0)return 0.0;
    return Previous.Load(int3(pixel,0)).rgb;
}
float3 History(float2 uv,float2 size) {
    int2 dimensions=max(int2(size),int2(1,1));
    float2 texel=uv*size-.5;int2 base=int2(floor(texel));float2 f=frac(texel);
    float3 top=lerp(HistoryTexel(base,dimensions),
                    HistoryTexel(base+int2(1,0),dimensions),f.x);
    float3 bottom=lerp(HistoryTexel(base+int2(0,1),dimensions),
                       HistoryTexel(base+int2(1,1),dimensions),f.x);
    return lerp(top,bottom,f.y);
}
float3 HistoryPoint(float2 uv,float2 size) {
    int2 dimensions=max(int2(size),int2(1,1));
    int2 pixel=min(int2(floor(frac(uv)*size)),dimensions-1);
    if(pixel.x==0&&pixel.y==0)return 0.0;
    return Previous.Load(int3(pixel,0)).rgb;
}
float4 NoiseTexel(int2 pixel) {
    float2 p=fmod(float2(pixel)+256.0,256.0);
    float4 phase=float4(dot(p,float2(127.1,311.7)),dot(p,float2(269.5,183.3)),
                        dot(p,float2(419.2,371.9)),dot(p,float2(112.7,257.4)));
    return floor(frac(sin(phase)*43758.5453123)*256.0)/255.0;
}
float4 NoiseLq(float2 uv) {
    float2 texel=frac(uv)*256.0-.5;int2 base=int2(floor(texel));float2 f=frac(texel);
    float4 top=lerp(NoiseTexel(base),NoiseTexel(base+int2(1,0)),f.x);
    float4 bottom=lerp(NoiseTexel(base+int2(0,1)),NoiseTexel(base+int2(1,1)),f.x);
    return lerp(top,bottom,f.y);
}
float2 RandomFrameOffset() {
    float frame=floor(max(time,0.0)*(60.0/max(frameStep,.001)));
    return frac(sin(frame*float2(12.9898,78.233)+float2(37.719,19.913))*43758.5453123);
}
float2 WarpVertexUV(float2 original,float2 size,float step30) {
    float2 aspect=min(float2(1,1),float2(size.x/size.y,size.y/size.x));
    float2 vertex=float2(2.0*original.x-1.0,1.0-2.0*original.y);
    float zoomStep=pow(1.00189,step30);
    float2 uv=float2(.5+vertex.x*aspect.x*.5/zoomStep,
                     .5-vertex.y*aspect.y*.5/zoomStep);
    float4 factors=float4(11.68+4*cos(time*1.413+10),8.77+3*cos(time*1.113+7),
                           10.54+3*cos(time*1.233+3),11.49+4*cos(time*.933+5));
    float2 scaled=vertex/3.138;
    float amount=.01*.0035*step30;
    float u=sin(time*.333+scaled.x*factors.x-scaled.y*factors.w)+
            cos(time*.753-scaled.x*factors.y+scaled.y*factors.z);
    float v=cos(time*.375-scaled.x*factors.z-scaled.y*factors.y)+
            sin(time*.825+scaled.x*factors.x+scaled.y*factors.w);
    uv+=amount*float2(u,v);
    return .5+(uv-.5)/aspect;
}
float2 MeshUV(float2 original,float2 size,float step30) {
    const float2 grid=float2(48,36);
    float2 scaled=saturate(original)*grid;
    float2 cell=min(floor(scaled),grid-1.0),f=scaled-cell;
    float2 c00=cell/grid,c10=(cell+float2(1,0))/grid;
    float2 c01=(cell+float2(0,1))/grid,c11=(cell+1.0)/grid;
    bool lower=f.x+f.y<=1.0;
    float3 weight=lower?float3(1-f.x-f.y,f.x,f.y):
                        float3(1-f.y,1-f.x,f.x+f.y-1);
    float2 a=WarpVertexUV(lower?c00:c10,size,step30);
    float2 b=WarpVertexUV(lower?c10:c01,size,step30);
    float2 c=WarpVertexUV(lower?c01:c11,size,step30);
    return weight.x*a+weight.y*b+weight.z*c;
}
float MeshRadius(float2 original,float2 size) {
    float2 aspect=min(float2(1,1),float2(size.x/size.y,size.y/size.x));
    return length((original*2.0-1.0)*aspect);
}
float3 BurnSprite(float3 destination,float2 uv,float2 size,float step30) {
    float2 clip=float2(uv.x*2.0-1.0,1.0-uv.y*2.0);
    // The per-frame sprite program supplies the animated part of sx and sy.
    float scale=1.0+.1*sin(time*.5);
    // Embedded preset sprites store SpriteSX/SpriteSY as offsets from one;
    // DrawUserSprites therefore turns 0.88 into the multiplier 1.88.
    const float spriteScale=1.88;
    const float imageAspect=16.0/9.0;
    float viewportAspect=size.x/max(size.y,1.0);
    // Match the modern embedded-sprite path: normalize the static scale to
    // the larger viewport dimension, correct the image quad, translate it,
    // then normalize the completed quad to screen width.
    float maximumDimension=max(size.x,size.y);
    float2 halfExtent=scale*spriteScale*maximumDimension/max(size,float2(1,1));
    halfExtent.y/=imageAspect;
    float2 center=float2(-.450001,.08);
    if(viewportAspect>1.0) {
        halfExtent.y*=viewportAspect;
        center.y*=viewportAspect;
    } else {
        halfExtent.x/=viewportAspect;
        center.x/=viewportAspect;
    }
    // The modern sprite path is allowed to stretch the image independently
    // on each axis. Keep the animated native size where it covers the target,
    // but never let a texture edge enter the viewport at narrow/tall aspects.
    float2 edgeGuard=4.0/max(size,float2(1,1));
    halfExtent=max(halfExtent,1.0+abs(center)+edgeGuard);
    float2 local=(clip-center)/halfExtent;
    if(any(abs(local)>1.0))return destination;
    float2 spriteUv=float2(local.x*.5+.5,.5-local.y*.5);
    float3 source=SpriteTexture.Sample(SpriteSampler,spriteUv).rgb;
    // Blend 3: src*SRCCOLOR + dst*INVSRCCOLOR. Its fixed point is source;
    // exponentiating transmittance preserves one 30-Hz blend across substeps.
    float3 transmittance=pow(saturate(1.0-source),step30);
    return source*(1.0-transmittance)+destination*transmittance;
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

float4 main(PSInput input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.x==0&&pixel.y==0)return Previous.Load(int3(0,0,0));
    float2 size=max(viewportSize,float2(1,1));
    float step30=max(frameStep*.5,.0001);
    float2 original=input.texelSpacePos.xy;
    float2 mesh=MeshUV(original,size,step30);
    float2 uv=original+(mesh-original);
    float2 noiseUv=RandomFrameOffset()+uv*size/256.0;
    float4 noise=NoiseLq(noiseUv)*2.0-1.0;
    float3 history=HistoryPoint(uv+noise.zw*.5/size,size);
    float radius=MeshRadius(original,size);
    float3 warped=history+(.59-.2*radius)*noise.rgb;
    warped=saturate((warped-.5)*3.0+.25);
    warped.yz=warped.xx;
    float3 result=lerp(history,warped,saturate(step30));
    result*=pow(.98,step30);
    result=DitherDecay(result,pow(.98,step30),0,.98,0,input.sceneSpacePos.xy);
    result=BurnSprite(result,original,size,step30);
    return float4(saturate(result),1.0);
}`;

    const compShader = `
Texture2D Frame : register(t0);
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
float UnpackUnit(float3 value){return dot(value,float3(1,1.0/255.0,1.0/65025.0));}
float DecodePositive(float3 value){float unit=min(UnpackUnit(value),.99999);return unit/max(1.0-unit,.00001);}
float3 FrameClamp(float2 uv,float2 size) {
    uv=saturate(uv);
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5;int2 base=int2(floor(xy));float2 f=frac(xy);
    base=clamp(base,int2(0,0),dimensions-1);
    int2 right=min(base+int2(1,0),dimensions-1);
    int2 down=min(base+int2(0,1),dimensions-1);
    int2 diagonal=min(base+1,dimensions-1);
    float3 a=(base.x==0&&base.y==0)?0.0:Frame.Load(int3(base,0)).rgb;
    float3 b=(right.x==0&&right.y==0)?0.0:Frame.Load(int3(right,0)).rgb;
    float3 c=(down.x==0&&down.y==0)?0.0:Frame.Load(int3(down,0)).rgb;
    float3 d=(diagonal.x==0&&diagonal.y==0)?0.0:Frame.Load(int3(diagonal,0)).rgb;
    return lerp(lerp(a,b,f.x),lerp(c,d,f.x),f.y);
}
float3 Blur1Horizontal(float2 uv,float2 size) {
    const float4 weights=float4(7.8,6.4,3.1,1.0);
    const float4 offsets=float4(.974358974,2.90625,4.774193548,6.6);
    float2 aligned=uv+1.0/size;float3 value=0.0;
    [loop]for(int i=0;i<4;++i){
        float2 offset=float2(offsets[i]/size.x,0);
        value+=(FrameClamp(aligned+offset,size)+FrameClamp(aligned-offset,size))*weights[i];
    }
    return value*.027322404;
}
float3 Blur1(float2 uv,float2 size) {
    const float2 weights=float2(14.2,4.1);
    const float2 offsets=float2(.901408451,2.487804878);
    float2 aligned=uv+float2(2.0/size.x,0);float3 value=0.0;
    [loop]for(int i=0;i<2;++i){
        float2 offset=float2(0,offsets[i]*2.0/size.y);
        value+=(Blur1Horizontal(aligned+offset,size)+Blur1Horizontal(aligned-offset,size))*weights[i];
    }
    float edge=min(min(uv.x,uv.y),1.0-max(uv.x,uv.y));
    return value*.027322404*(.75+.25*saturate(sqrt(max(edge,0.0))*5.0));
}
float3 Lava(float value){return saturate(float3(value,value*value,pow(max(value,0.0),5.0)));}
float4 main(PSInput input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.x==0&&pixel.y==0)return float4(0,0,0,1);
    float2 size=max(viewportSize,float2(1,1));
    float2 uv=input.texelSpacePos.xy;
    float midAtt=DecodePositive(Frame.Load(int3(0,0,0)).rgb);
    float3 frame=FrameClamp(uv,size);
    float2 blurUv[2]={uv,(uv-5.0)/5.0+5.0};
    float3 blurValue[2];
    [fastopt]
    for(int blurIndex=0;blurIndex<2;++blurIndex)
        blurValue[blurIndex]=Blur1(blurUv[blurIndex],size);
    float3 blur=blurValue[0];
    float getDist=1.0078125-frame.b-.015625*frame.g;
    float getDistB=1.0-blur.b;
    float bdist=min(getDist,getDistB);
    float3 result=saturate(1.0-bdist).xxx;
    float struc=lerp(frame.r,blurValue[1].r,blur.r-.8);
    result+=Lava(struc)*(.2-pow(max(bdist,0.0),1.0+5.0*midAtt));
    return float4(saturate(result),1.0);
}`;

    return {
        name: "0128",
        sourceId: 5,
        source,
        updateIntervalMs: 17,
        renderer: {
            shader,
            feedback: {
                shader: warpShader,
                textures: [presetDir + "textures\\MilkDrop3_026.jpg"]
            },
            post: compShader
        }
    };
};
