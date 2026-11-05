// MilkDrop 0061 — dotted circular PCM seed with a DFT-driven starship composite.
//
// Original: original/0061.milk (PSVERSION_WARP=3, PSVERSION_COMP=4).
// The preset's per-frame program is a 205-bin, three-octave DFT BPM tracker.
// Its persistent EEL memory is reproduced in private feedback pixels; those
// pixels are excluded from image filtering and from the final composite.
//
// The native mode-0 wave uses 240 vertices from the middle of the aligned
// 480-sample waveform, closes the circle, applies MilkDrop SmoothWave, and
// draws the result as four offset point lists. The shader evaluates only the
// angularly-near vertices instead of scanning all 481 smoothed points per
// pixel. PCM smoothing uses a twelve-tap expansion of the native .5 recurrence
// (the omitted tail is below 1/4096). JSplitter does not expose MilkDrop's
// cross-frame waveform aligner, so sample placement uses the current 576-sample
// window directly; scale remains 28.599 because the native PCM *128 and /128
// conversions cancel.
//
// GetBlur1 is represented by a compact wrapped nine-tap blur of the preceding
// history. It is an intentional approximation of MilkDrop's precomputed,
// downsampled blur texture; the source/feedback/post ordering remains exact.

MilkDropPresets["0061"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;
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
static const int CONTROL_WIDTH=32;
static const int CONTROL_HEIGHT=21;

float3 PackUnit(float value){
    float3 packed=frac(min(saturate(value),.999999)*float3(1,255,65025));
    return packed-packed.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float3 PackPositive(float value){
    value=max(value,0.0);
    return PackUnit(value/(1.0+value));
}
float PCMRight(int sampleIndex){
    int count=max((int)pointCount,1);
    int start=max(count-576,0);
    int index=start+clamp(sampleIndex,0,479);
    return RightPCM.Load(int3(index,0,0)).r;
}
float SmoothedRight(int sampleIndex){
    // y[n]=.5*x[n]+.5*y[n-1], expanded far enough that the tail is tiny.
    float sum=0.0;
    float weight=.5;
    [fastopt]
    for(int tap=0;tap<12;++tap){
        sum+=PCMRight(sampleIndex-tap)*weight;
        weight*=.5;
    }
    sum+=PCMRight(sampleIndex-12)*weight*2.0;
    return sum*28.599;
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
    return .5+.5*radius*float2(cos(angle)*aspectY,sin(angle)*aspectX);
}
float2 SmoothVertex(int outputVertex,float2 size){
    // Mode 0 appends vertex zero before SmoothWave: 241 -> 481 points.
    outputVertex=clamp(outputVertex,0,480);
    if(outputVertex==480) return NativeVertex(0,size);
    int base=outputVertex/2;
    if((outputVertex&1)==0) return NativeVertex(base,size);
    int below=max(base-1,0);
    int above=min(base+1,240);
    int above2=min(base+2,240);
    float2 p0=NativeVertex(below==240?0:below,size);
    float2 p1=NativeVertex(base==240?0:base,size);
    float2 p2=NativeVertex(above==240?0:above,size);
    float2 p3=NativeVertex(above2==240?0:above2,size);
    return (-.15*p0+1.15*p1+1.15*p2-.15*p3)*.5;
}
float PointCoverage(float2 pixel,float2 position){
    // Four one-pixel point-list passes form the native 2x2 dotted footprint.
    float2 delta=abs(pixel-(position+.5));
    return 1.0-smoothstep(.85,1.35,max(delta.x,delta.y));
}
float CandidateCoverage(float phase,float2 pixel,float2 size){
    float outputPhase=phase*478.0;
    int nearest=(int)floor(outputPhase+.5)%478;
    return PointCoverage(pixel,SmoothVertex(nearest,size)*size);
}
float CircularWave(float2 pixel,float2 size){
    float2 centered=(pixel/size-.5)*2.0;
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float angle=atan2(centered.y/max(aspect.x,1e-5),
                      centered.x/max(aspect.y,1e-5));
    float phase=frac((angle-time*.2)/TWO_PI);
    // A negative radius points PI away from its construction angle.
    float opposite=frac((angle+PI-time*.2)/TWO_PI);
    return max(CandidateCoverage(phase,pixel,size),
               CandidateCoverage(opposite,pixel,size));
}
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.x>=0 && pixel.x<CONTROL_WIDTH &&
       pixel.y>=0 && pixel.y<CONTROL_HEIGHT){
        int stateIndex=pixel.y*CONTROL_WIDTH+pixel.x;
        if(stateIndex<6){
            float band=max(RelativeBands.Load(int3(stateIndex,0,0)).r,0.0);
            return float4(PackPositive(band),1.0);
        }
        return 0.0;
    }
    float bass=max(RelativeBands.Load(int3(0,0,0)).r,0.0);
    float mid=max(RelativeBands.Load(int3(1,0,0)).r,0.0);
    float treb=max(RelativeBands.Load(int3(2,0,0)).r,0.0);
    float alpha=saturate(100.0*((bass+mid+treb)/3.0-.4)/.6);
    alpha=floor(alpha*255.0+.5)/255.0;
    if(alpha<=0.0) return 0.0;
    float coverage=CircularWave(input.sceneSpacePos.xy,
                                max(viewportSize,float2(1,1)));
    float opacity=coverage*alpha;
    // JSplitter's source image is premultiplied. Returning white RGB with
    // zero alpha would still inject a full-screen white frame into history.
    return float4(opacity,opacity,opacity,opacity);
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
static const float LN2=.6931471805599453;
static const float3 MAGIC=float3(.1725,.5333,.9137);
static const int CONTROL_WIDTH=32;
static const int CONTROL_HEIGHT=21;
static const int DFT_BASE=32;
static const int DFT_BINS=205;
static const int DFT_STRIDE=3;
static const int MAXIND_INDEX=647;
static const int WAIT_INDEX=648;
static const int TREAL_INDEX=649;
static const int DTPREV_INDEX=650;
static const int BPMTIME_INDEX=651;
static const int QUALI_INDEX=652;
static const int SPEED_INDEX=653;
static const int TREL_INDEX=654;
static const int TMOV_INDEX=655;
static const int PROMAX_INDEX=656;
static const int MAGIC_INDEX=657;

float3 PackUnit(float value){
    float3 packed=frac(min(saturate(value),.999999)*float3(1,255,65025));
    return packed-packed.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float UnpackUnit(float3 packed){
    return dot(packed,float3(1,1.0/255.0,1.0/65025.0));
}
float3 PackPositive(float value){
    value=max(value,0.0); return PackUnit(value/(1.0+value));
}
float UnpackPositive(float3 packed){
    float value=min(UnpackUnit(packed),.99999);
    return value/max(1.0-value,.00001);
}
float3 PackSigned(float value){
    return PackUnit(.5+.5*value/(1.0+abs(value)));
}
float UnpackSigned(float3 packed){
    float value=UnpackUnit(packed)*2.0-1.0;
    return value/max(1.0-abs(value),.00001);
}
int2 StateCoord(int index){return int2(index%CONTROL_WIDTH,index/CONTROL_WIDTH);}
float4 State(int index){return Previous.Load(int3(StateCoord(index),0));}
float Audio(int band){return UnpackPositive(State(band).rgb);}
float Frequency(int bin){return 75.0*exp(bin*LN2/60.0);}
float Weight(int bin){
    return min(2.0,1.0+sin(PI*bin/85.0)*3.0)*.5;
}
float DftEnvelope(int bin){
    return UnpackPositive(State(DFT_BASE+bin*DFT_STRIDE).rgb);
}
float DftReal(int bin){
    return UnpackSigned(State(DFT_BASE+bin*DFT_STRIDE+1).rgb);
}
float DftImag(int bin){
    return UnpackSigned(State(DFT_BASE+bin*DFT_STRIDE+2).rgb);
}
float2 AdvancedComplex(int bin,float dt,float treal,float tcorr,float excitation){
    float angular=2.0*PI/60.0*Frequency(bin);
    float decay=1.0-dt*angular*.013;
    float argument=treal*angular+tcorr*15000.0;
    float2 oldValue=float2(DftReal(bin),DftImag(bin));
    return oldValue*decay+excitation*float2(cos(argument),sin(argument))*(1.0-decay);
}
float AdvancedEnvelope(int bin,float dt,float treal,float tcorr,float excitation){
    float2 base=AdvancedComplex(bin,dt,treal,tcorr,excitation);
    // In the original increasing loop the two upper octaves have not yet
    // advanced when the base-octave envelope is evaluated.
    float2 octave1=float2(DftReal(bin+60),DftImag(bin+60));
    float2 octave2=float2(DftReal(bin+120),DftImag(bin+120));
    float sum=sqrt(dot(base,base)+dot(octave1,octave1)+dot(octave2,octave2));
    float d0=exp(-1.5*dt);
    return DftEnvelope(bin)*d0+sum*(1.0-d0)*Weight(bin);
}
int FindPromax(float dt,float treal,float tcorr,float excitation){
    int best=2;
    float bestValue=AdvancedEnvelope(best,dt,treal,tcorr,excitation);
    [fastopt]
    for(int bin=3;bin<=84;++bin){
        float value=AdvancedEnvelope(bin,dt,treal,tcorr,excitation);
        if(value>bestValue){best=min(bin,83);bestValue=value;}
    }
    return best;
}
int Wrap(int value,int count){int r=value%count;return r<0?r+count:r;}
float3 HistoryTexel(int2 pixel,int2 dimensions){
    pixel.x=Wrap(pixel.x,dimensions.x);
    pixel.y=Wrap(pixel.y,dimensions.y);
    if(pixel.x<CONTROL_WIDTH && pixel.y<CONTROL_HEIGHT){
        int fallbackX=min(CONTROL_WIDTH,dimensions.x-1);
        return Previous.Load(int3(fallbackX,pixel.y,0)).rgb;
    }
    return Previous.Load(int3(pixel,0)).rgb;
}
float3 History(float2 uv,float2 size){
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5;
    int2 base=int2(floor(xy)); float2 f=frac(xy);
    float3 top=lerp(HistoryTexel(base,dimensions),
                    HistoryTexel(base+int2(1,0),dimensions),f.x);
    float3 bottom=lerp(HistoryTexel(base+int2(0,1),dimensions),
                       HistoryTexel(base+int2(1,1),dimensions),f.x);
    return lerp(top,bottom,f.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    int stateIndex=pixel.y*CONTROL_WIDTH+pixel.x;
    bool inControl=pixel.x>=0 && pixel.x<CONTROL_WIDTH &&
                   pixel.y>=0 && pixel.y<CONTROL_HEIGHT;
    bool initialized=distance(State(MAGIC_INDEX).rgb,MAGIC)<.01;
    float step30=max(frameStep*.5,.0001);
    float dt=step30/30.0;
    float previousDt=initialized?UnpackPositive(State(DTPREV_INDEX).rgb):0.0;
    float tcorr=dt-previousDt;
    float oldTreal=initialized?UnpackPositive(State(TREAL_INDEX).rgb):0.0;
    float treal=oldTreal+dt+tcorr*38.0;
    float excitation=2.0*Audio(3)+Audio(4)+Audio(5);

    if(inControl){
        // A black texture decodes as negative infinity in PackSigned's
        // rational mapping, so seed every signed DFT cell explicitly.
        if(!initialized){
            if(stateIndex<6) return 0.0;
            if(stateIndex>=DFT_BASE && stateIndex<DFT_BASE+DFT_BINS*DFT_STRIDE){
                int seedOffset=stateIndex-DFT_BASE;
                int seedComponent=seedOffset-(seedOffset/DFT_STRIDE)*DFT_STRIDE;
                return seedComponent==0
                    ?float4(PackPositive(0.0),1.0)
                    :float4(PackSigned(0.0),1.0);
            }
            if(stateIndex==MAXIND_INDEX)return float4(40.0/255.0,0,0,1);
            if(stateIndex==SPEED_INDEX)return float4(PackPositive(.1),1);
            if(stateIndex==MAGIC_INDEX)return float4(MAGIC,1);
            return float4(PackPositive(0.0),1);
        }
        if(stateIndex<6) return 0.0;
        if(stateIndex>=DFT_BASE && stateIndex<DFT_BASE+DFT_BINS*DFT_STRIDE){
            int stateOffset=stateIndex-DFT_BASE;
            int bin=stateOffset/DFT_STRIDE;
            int component=stateOffset-bin*DFT_STRIDE;
            float2 advanced=AdvancedComplex(bin,dt,treal,tcorr,excitation);
            if(component==1) return float4(PackSigned(advanced.x),1.0);
            if(component==2) return float4(PackSigned(advanced.y),1.0);
            float envelope=bin<85
                ?AdvancedEnvelope(bin,dt,treal,tcorr,excitation):0.0;
            return float4(PackPositive(envelope),1.0);
        }
        int maxind=initialized?(int)floor(State(MAXIND_INDEX).r*255.0+.5):40;
        maxind=clamp(maxind,2,83);
        int promax=FindPromax(dt,treal,tcorr,excitation);
        float maxEnvelope=AdvancedEnvelope(maxind,dt,treal,tcorr,excitation);
        float promaxEnvelope=AdvancedEnvelope(promax,dt,treal,tcorr,excitation);
        float wait=initialized?UnpackPositive(State(WAIT_INDEX).rgb):0.0;
        wait+=abs(maxEnvelope-promaxEnvelope)*dt*100.0;
        if(wait>abs((float)(promax-maxind))*80.0/60.0){maxind=promax;wait=0.0;}
        float selectedEnvelope=maxind==promax?promaxEnvelope:maxEnvelope;
        float bpm=Frequency(maxind);
        float smoothing=exp(-2.0*dt);
        float bpmTime=(initialized?UnpackPositive(State(BPMTIME_INDEX).rgb):0.0)+
                      bpm/60.0*dt*4.0;
        float qualityOld=initialized?UnpackPositive(State(QUALI_INDEX).rgb):0.0;
        float quality=qualityOld*smoothing+(1.0-smoothing)*
                      min(3.0,max(0.0,selectedEnvelope*2.2));
        float speedOld=initialized?UnpackPositive(State(SPEED_INDEX).rgb):.1;
        float speed=speedOld*smoothing+(1.0-smoothing)*bpm*.00045;
        float trel=(initialized?UnpackPositive(State(TREL_INDEX).rgb):0.0)+Audio(0)*dt;
        float tmov=(initialized?UnpackPositive(State(TMOV_INDEX).rgb):0.0)+speed*dt;
        if(stateIndex==MAXIND_INDEX)return float4(maxind/255.0,0,0,1);
        if(stateIndex==WAIT_INDEX)return float4(PackPositive(wait),1);
        if(stateIndex==TREAL_INDEX)return float4(PackPositive(treal),1);
        if(stateIndex==DTPREV_INDEX)return float4(PackPositive(dt),1);
        if(stateIndex==BPMTIME_INDEX)return float4(PackPositive(bpmTime),1);
        if(stateIndex==QUALI_INDEX)return float4(PackPositive(quality),1);
        if(stateIndex==SPEED_INDEX)return float4(PackPositive(speed),1);
        if(stateIndex==TREL_INDEX)return float4(PackPositive(trel),1);
        if(stateIndex==TMOV_INDEX)return float4(PackPositive(tmov),1);
        if(stateIndex==PROMAX_INDEX)return float4(promax/255.0,0,0,1);
        if(stateIndex==MAGIC_INDEX)return float4(MAGIC,1);
        return 0.0;
    }

    float2 uv=input.texelSpacePos.xy;
    float2 texel=.7/size;
    float2 blurCenter=frac(uv);
    float2 blurStep=2.0/size;
    float2 firstUv[13]={
        uv+float2(texel.x,0),uv-float2(texel.x,0),
        uv+float2(0,texel.y),uv-float2(0,texel.y),
        blurCenter,
        blurCenter+float2(blurStep.x,0),blurCenter-float2(blurStep.x,0),
        blurCenter+float2(0,blurStep.y),blurCenter-float2(0,blurStep.y),
        blurCenter+blurStep,blurCenter-blurStep,
        blurCenter+float2(blurStep.x,-blurStep.y),
        blurCenter+float2(-blurStep.x,blurStep.y)};
    float3 firstValue[13];
    [fastopt]
    for(int sampleIndex=0;sampleIndex<13;++sampleIndex)
        firstValue[sampleIndex]=History(firstUv[sampleIndex],size);
    float dx=firstValue[0].r-firstValue[1].r;
    float dy=firstValue[2].r-firstValue[3].r;
    float2 gradient=float2(dx,dy);
    float3 blur=firstValue[4]*4.0;
    blur+=(firstValue[5]+firstValue[6]+firstValue[7]+firstValue[8])*2.0;
    blur+=firstValue[9]+firstValue[10]+firstValue[11]+firstValue[12];
    blur/=16.0;
    float2 tailUv[3]={uv+gradient*.002*step30,uv*1.2,uv*2.0};
    float3 tailValue[3];
    [fastopt]
    for(int tailIndex=0;tailIndex<3;++tailIndex)
        tailValue[tailIndex]=History(tailUv[tailIndex],size);
    float3 crisp=tailValue[0];
    crisp-=(length(gradient)*.01+.014*blur)*step30;
    float3 result;
    result.r=max(.3,crisp.r);
    result.b=tailValue[1].b*pow(.8,step30);
    result.g=tailValue[2].b*22.0;
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
static const float PI=3.141592653589793;
static const int CONTROL_WIDTH=32;
static const int CONTROL_HEIGHT=21;
static const int BPMTIME_INDEX=651;
static const int QUALI_INDEX=652;
static const int SPEED_INDEX=653;
static const int TREL_INDEX=654;
static const int TMOV_INDEX=655;
float UnpackUnit(float3 packed){return dot(packed,float3(1,1.0/255.0,1.0/65025.0));}
float UnpackPositive(float3 packed){
    float value=min(UnpackUnit(packed),.99999);
    return value/max(1.0-value,.00001);
}
int2 StateCoord(int index){return int2(index%CONTROL_WIDTH,index/CONTROL_WIDTH);}
float4 State(int index){return Frame.Load(int3(StateCoord(index),0));}
float Audio(int band){return UnpackPositive(State(band).rgb);}
int Wrap(int value,int count){int r=value%count;return r<0?r+count:r;}
float3 ImageTexel(int2 pixel,int2 dimensions){
    pixel.x=Wrap(pixel.x,dimensions.x); pixel.y=Wrap(pixel.y,dimensions.y);
    if(pixel.x<CONTROL_WIDTH && pixel.y<CONTROL_HEIGHT){
        int fallbackX=min(CONTROL_WIDTH,dimensions.x-1);
        return Frame.Load(int3(fallbackX,pixel.y,0)).rgb;
    }
    return Frame.Load(int3(pixel,0)).rgb;
}
float3 GetPixel(float2 uv,float2 size){
    int2 dimensions=max(int2(size),int2(1,1));
    float2 xy=uv*size-.5; int2 base=int2(floor(xy)); float2 f=frac(xy);
    float3 top=lerp(ImageTexel(base,dimensions),ImageTexel(base+int2(1,0),dimensions),f.x);
    float3 bottom=lerp(ImageTexel(base+int2(0,1),dimensions),ImageTexel(base+int2(1,1),dimensions),f.x);
    return lerp(top,bottom,f.y);
}
float4 main(PSInput input) : SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 aspect=float2(min(size.x/size.y,1.0),min(size.y/size.x,1.0));
    float bpmTime=UnpackPositive(State(BPMTIME_INDEX).rgb);
    float quality=UnpackPositive(State(QUALI_INDEX).rgb);
    float speedState=UnpackPositive(State(SPEED_INDEX).rgb);
    float trel=UnpackPositive(State(TREL_INDEX).rgb);
    float tmov=1333.0+UnpackPositive(State(TMOV_INDEX).rgb);
    float rotation=PI*.17*atan(8.0*sin(time*.031+trel*.005))*
                   (1.0+.6*sin(bpmTime*.02));
    float sn=sin(rotation),cs=cos(rotation);
    float2 uv1=(input.texelSpacePos.xy-.5)*aspect+
               .02*float2(sin(time*.51),sin(time*.19));
    float zoom=1.5*2.5*aspect.y;
    float2 q=mul(uv1,float2x2(cs,sn,-sn,cs))/max(zoom,1e-5);
    float bassAtt=Audio(3);
    float midAtt=Audio(4);
    float speed=speedState*500.0;
    float vb=.007*sqrt(max(midAtt+.5,0.0))*max(quality-.3,0.0)*
             saturate(1.0+sin(bpmTime*PI/15.0));
    float zz=sin((time+bpmTime)/60.0)/3.0+.55;
    float3 accumulation=0.0;
    [fastopt]
    for(int trailIndex=0;trailIndex<32;++trailIndex){
        float fi=(float)trailIndex;
        float j=fi/32.0;
        float2 phase=pow(float2(fi+1.0,fi+1.0),float2(17.0,23.0)/51.0)*tmov;
        float2 p=q*(1.0-zz*j)+.053*sin(phase)*float2(2.0,1.5);
        float3 color=cos(float3(12.0,2.0,3.0)*cos(fi))+bassAtt;
        float2 uvt=p+float2(0.0,tmov*(1.0+frac(fi*PI)));
        float3 screen=GetPixel(3.25*frac(uvt.yx/aspect+.5),size);
        float safeSpeed=max(screen.r*speed,1e-5);
        float trail=1.0/max(length(max(p,p/float2(2.0,safeSpeed))),1e-5);
        accumulation+=(trail*screen.g*(-p.y))*.3*(trailIndex%2);
        accumulation+=trail*.0015*color;
        float pulseDistance=fmod(bpmTime,32.0)-fi;
        float pulseDistance2=fmod(bpmTime*2.0,32.0)-fi;
        float pulse=saturate(1.0-pulseDistance*pulseDistance);
        float pulse2=saturate(1.0-pulseDistance2*pulseDistance2);
        accumulation+=vb/max(length(p),1e-5)*(pulse+pulse2*2.0*color);
    }
    float3 result=1.0-exp(-(saturate(q.x)*float3(0,.6,1)*2.0+
                              pow(max(accumulation,0.0),1.8)/32.0));
    return float4(saturate(result),1.0);
}`;

    return {
        name: "0061",
        sourceId: 5,
        source,
        updateIntervalMs,
        renderer: {
            shader,
            feedback: warpShader,
            post: compShader
        }
    };
};
