// MilkDrop 0055 — audio-reactive cellular raymarch.
//
// Original: original/0055.milk (PSVERSION_WARP=4, PSVERSION_COMP=3).
// The visible frame is generated entirely by the custom warp shader. The
// built-in mode-15 wave has zero alpha, no custom waves/shapes are enabled,
// and the custom composite is only GetPixel(uv). Consequently the legacy
// decay, echo, gamma and brighten/darken settings do not affect the image.
//
// The original per-frame code also simulates up to 150 strings in megabuf.
// None of that position/string state is read by the enabled warp or composite
// shader; only q1, q3 and q6..q10 are consumed, so the unused simulation is
// deliberately omitted. It advances EEL's global RNG, therefore beat-time
// random q7..q9 values are reproduced procedurally rather than byte-for-byte.
//
// The source writes modern relative bands into private history pixels. The
// feedback pass preserves the used per-frame state and renders a fresh scene.
// q3 retains the original five-frame (1/6 second at 30 Hz) delay in elapsed
// time, including variable Draw intervals and FPS changes. Accumulators and
// smoothing are normalized from the 30 Hz preset.

MilkDropPresets["0055"] = function (TARGET_FPS) {
    const updateIntervalMs = 17;
    const source = {
        leftChannel: 0,
        rightChannel: 1,
        durationMs: 40,
        points: 1024,
        relativeBandAnalysis: true
    };

    // The native wave is invisible. The source pass only transports the six
    // analyzer values into pixels 0..5 for the next feedback step.
    const shader = `
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
float4 main(VS_OUTPUT input) : SV_Target {
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    if(pixel.y==0 && pixel.x>=0 && pixel.x<6){
        float value=max(RelativeBands.Load(int3(pixel.x,0,0)).r,0.0);
        return float4(PackPositive(value),1.0);
    }
    return 0.0;
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
static const float3 MAGIC=float3(.1725,.5333,.9137);
// Second sentinel also versions the fixed time-grid state layout.
static const float3 MAGIC2=float3(.8275,.2314,.7294);
// A fixed 1200-Hz sampling grid has 40 subdivisions of a reference frame
// and is finer than the browser's fastest requested 1000-Hz repaint rate.
// 200 intervals retain the native 5/30-second delay; one extra sample
// brackets fractional positions. This is storage resolution, not render FPS.
static const float DELAY_TICKS_PER_STEP30=40.0;
static const int DELAY_TICKS=200;
static const int DELAY_SAMPLES=DELAY_TICKS+1;
static const int DELAY_BASE=8;
static const int POINTER_INDEX=28;
static const int VOLTIME_INDEX=29;
static const int SMOOTH_VOLUME_INDEX=30;
static const int BEAT_AGE_INDEX=31;
static const int BEAT_DELAY_INDEX=32;
static const int GRID_INDEX=33;
static const int FORM_TARGET_INDEX=34;
static const int FORM_SMOOTH_INDEX=35;
static const int SCALE_TARGET_INDEX=36;
static const int SCALE_SMOOTH_INDEX=37;
static const int BEAT_COUNTER_INDEX=38;
static const int MAGIC_INDEX=39;
static const int MAGIC2_INDEX=40;
// Keep the original first 41 registers and append a fixed-size delay area.
static const int BASE_CONTROL_PIXELS=41;
static const int DELAY_PHASE_INDEX=BASE_CONTROL_PIXELS+DELAY_SAMPLES-20;
static const int TVOL_INDEX=DELAY_PHASE_INDEX+1;
static const int CONTROL_PIXELS=TVOL_INDEX+1;

float3 PackUnit(float value){
    float3 packed=frac(min(saturate(value),.999999)*float3(1,255,65025));
    return packed-packed.yzz*float3(1.0/255.0,1.0/255.0,0);
}
float UnpackUnit(float3 packed){
    return dot(packed,float3(1,1.0/255.0,1.0/65025.0));
}
float3 PackPositive(float value){
    value=max(value,0.0);
    return PackUnit(value/(1.0+value));
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
int StateColumns(){return max(6,min(64,(int)viewportSize.x));}
float4 State(int pixel){
    int columns=StateColumns();
    return Previous.Load(int3(pixel%columns,pixel/columns,0));
}
float4 RingState(int slot){
    return State(slot<20 ? DELAY_BASE+slot : BASE_CONTROL_PIXELS+slot-20);
}
float Audio(int band){return UnpackPositive(State(band).rgb);}
float Hash11(float value){return frac(sin(value*127.1+311.7)*43758.5453);}

float2x2 Rotate2D(float angle){
    float sn=sin(angle),cs=cos(angle);
    return float2x2(cs,-sn,sn,cs);
}

float3 RenderScene(float2 uv,float2 size,float q1,float q3,float q6,
                   float q7,float q8,float q9,float q10){
    float2 resolution=size;
    float2 fragment=uv*resolution;
    float3 output=0.0;

    // Keep one compiled copy of the raymarch body. The channel loop supplies
    // Z=-1,0,+1 exactly as the original shader, while [fastopt] prevents FXC
    // O3 from speculatively unrolling the 80-step body three times.
    [fastopt]
    for(int channel=0;channel<3;++channel){
        float zOffset=(float)channel-1.0;
        float distanceAlongRay=0.0;
        float channelValue=0.0;
        [fastopt]
        for(int march=0;march<80;++march){
            if((float)march>=q10) break;
            float3 p=float3(
                (fragment*2.0-resolution)/resolution.y*distanceAlongRay,
                distanceAlongRay-8.0);

            // In the source, skipFlag remains set after the first rejection;
            // later iterations cannot contribute, so an early break is exact.
            if(abs(p.x)>=5.0) break;

            p.xz=mul(Rotate2D(q6/3.0),p.xz);
            p.xy=mul(Rotate2D(q6/2.0),p.xy);

            float3 grid=floor(p*q1);
            float3 cell=frac(p*q7)-.5;
            float randomPoint=frac(sin(dot(
                grid,float3(127.0,312.0,75.0)))*43758.0);
            float highlight=step(length(cell),randomPoint*.3+.1);
            float randomAngle=frac(sin(dot(
                grid,float3(44.0,78.0,123.0)))*127.0)*PI*2.0;

            float edgeDistance=1.0;
            float scale=q9;
            [unroll]
            for(int octave=0;octave<3;++octave){
                float3 folded=abs(frac(p*scale*.5)*2.0-1.0);
                float nearest=max(folded.x,folded.y);
                nearest=min(nearest,max(folded.y,folded.z));
                nearest=min(nearest,max(folded.x,folded.z));
                edgeDistance=min(edgeDistance,nearest/scale);
                scale*=.6;
            }

            float3 absolute=abs(p);
            float diagonal=dot(absolute,float3(.577,.577,.577))*q8;
            float shape=max(max(max(absolute.x,absolute.y),absolute.z),
                            diagonal)-(3.0+q3);
            float stepLength=.01+.15*abs(max(max(shape,edgeDistance-.1),
                                      abs(sin(shape))-.3)+
                                      zOffset*.02-(float)march/130.0);
            distanceAlongRay+=stepLength;
            float surface=smoothstep(.02,.01,stepLength);
            channelValue+=1.6/stepLength*(
                .5+.5*sin((float)march*.3+zOffset*5.0)+
                surface*4.0*highlight*sin(
                    randomAngle+(float)march*.4+zOffset*5.0));
        }
        output[channel]=channelValue;
    }

    output=output*output/1.0e7;
    float3 exponential=exp(2.0*output);
    return (exponential-1.0)/(exponential+1.0);
}

float4 main(PSInput input) : SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float step30=max(frameStep*.5,.0001);
    int2 pixel=int2(floor(input.sceneSpacePos.xy));
    // The browser injects the outgoing preset into the new feedback history.
    // A single tolerant RGB sentinel can very rarely occur in that image and
    // make its ordinary pixels look like valid q/state registers. Require a
    // second independent sentinel so preset transitions cannot seed q6 with
    // arbitrary data and briefly send the raymarch into a rapid rotation.
    bool initialized=all(abs(State(MAGIC_INDEX).rgb-MAGIC)<.012) &&
                     all(abs(State(MAGIC2_INDEX).rgb-MAGIC2)<.012);

    float bassAtt=Audio(3),midAtt=Audio(4),trebAtt=Audio(5);
    float volume=sqrt(max(bassAtt+midAtt+trebAtt,0.0))/3.0;
    float previousVolume=initialized?UnpackPositive(State(7).rgb):0.0;
    float volumeRetention=pow(.9,step30);
    float smoothedPrevious=previousVolume*volumeRetention+
                           volume*(1.0-volumeRetention);

    float pvol=initialized?UnpackPositive(State(6).rgb):0.0;
    float pvolRetention=volume>pvol?pow(.5,step30):pow(28.0/30.0,step30);
    pvol=pvol*pvolRetention+volume*(1.0-pvolRetention);

    // Do not derive a ring length or a previous-sample address from the
    // current frameStep: yesterday's state was written with yesterday's dt.
    // Advance a fixed time grid and interpolate each crossed tick between
    // the preceding and current tvol. Rendering itself still runs every Draw.
    float previousTvol=initialized?UnpackSigned(State(TVOL_INDEX).rgb):0.0;
    float tvolRetention=pow(.8,step30);
    float tvol=previousTvol*tvolRetention+
               (volume-smoothedPrevious)*(1.0-tvolRetention);
    int previousTick=initialized
        ? (int)floor(State(POINTER_INDEX).r*255.0+.5):0;
    float previousPhase=initialized?UnpackUnit(State(DELAY_PHASE_INDEX).rgb):0.0;
    float elapsedTicks=step30*DELAY_TICKS_PER_STEP30;
    float advanced=previousPhase+elapsedTicks;
    int crossedTicks=(int)floor(advanced);
    float delayPhase=frac(advanced);
    int currentTick=(previousTick+crossedTicks)%DELAY_SAMPLES;
    int delayedIndex=(currentTick+DELAY_SAMPLES-DELAY_TICKS)%DELAY_SAMPLES;
    int newerIndex=(delayedIndex+1)%DELAY_SAMPLES;
    // The engine bounds a per-Draw step to 100 ms, below the 166.7-ms delay,
    // so both delayed endpoints already exist in the preceding history.
    float delayedTvol=initialized?lerp(
        UnpackSigned(RingState(delayedIndex).rgb),
        UnpackSigned(RingState(newerIndex).rgb),delayPhase):0.0;

    const float VOLTIME_PERIOD=188.4955592153876; // 60*PI
    float voltime=initialized
        ? UnpackUnit(State(VOLTIME_INDEX).rgb)*VOLTIME_PERIOD:0.0;
    float smoothVolume=initialized
        ? UnpackPositive(State(SMOOTH_VOLUME_INDEX).rgb):0.0;
    float myVolume=(bassAtt+midAtt+trebAtt)/3.0;
    smoothVolume=myVolume>smoothVolume
        ? myVolume:smoothVolume*pow(.98,step30);
    voltime=frac((voltime+smoothVolume*.0275*step30)/VOLTIME_PERIOD)*
            VOLTIME_PERIOD;

    float beatAge=initialized
        ? UnpackUnit(State(BEAT_AGE_INDEX).rgb)*4.0:0.0;
    float beatDelay=initialized?State(BEAT_DELAY_INDEX).r:
        (Hash11(floor(time*60.0)+1.17)>.5?.5:.25);
    float grid=initialized?floor(State(GRID_INDEX).r*16.0+.5):
        3.0+floor(Hash11(floor(time*60.0)+2.31)*6.0);
    float formTarget=initialized?State(FORM_TARGET_INDEX).r*3.0:
        .6+Hash11(floor(time*60.0)+3.47);
    // The persistent representation must not depend on the current dt.
    // A Draw interval crossing 1/30 s used to reinterpret these RGB values
    // between scalar and packed formats, abruptly changing q8 and q9.
    float formSmooth=initialized
        ? UnpackPositive(State(FORM_SMOOTH_INDEX).rgb):formTarget;
    float scaleTarget=initialized?State(SCALE_TARGET_INDEX).r*3.0:
        .6+Hash11(floor(time*60.0)+4.93)*1.5;
    float scaleSmooth=initialized
        ? UnpackPositive(State(SCALE_SMOOTH_INDEX).rgb):scaleTarget;
    float beatCounter=initialized
        ? floor(State(BEAT_COUNTER_INDEX).r*255.0+.5):0.0;

    beatAge=min(4.0,beatAge+step30/30.0);
    bool beat=beatAge>=beatDelay && myVolume>1.275;
    if(beat){
        beatAge=0.0;
        beatCounter=fmod(beatCounter+1.0,256.0);
        float seed=beatCounter*17.0+floor(time*30.0);
        grid=3.0+floor(Hash11(seed+11.3)*6.0);
        formTarget=.6+Hash11(seed+27.1);
        scaleTarget=.6+Hash11(seed+43.7)*1.5;
    }
    float smoothing30=7.25/30.0;
    float smoothing=1.0-pow(1.0-smoothing30,step30);
    formSmooth=lerp(formSmooth,formTarget,smoothing);
    scaleSmooth=lerp(scaleSmooth,scaleTarget,smoothing);

    float q1=pvol;
    float q3=delayedTvol+1.0;
    float q6=voltime;
    float q7=grid;
    float q8=formSmooth;
    float q9=scaleSmooth;
    float q10=30.0+abs(sin(voltime/5.0))*50.0;

    const int controlPixels=CONTROL_PIXELS;
    int stateIndex=pixel.y*StateColumns()+pixel.x;
    if(pixel.x<StateColumns() && stateIndex>=0 && stateIndex<controlPixels){
        if(stateIndex<6) return 0.0;
        if(stateIndex==6) return float4(PackPositive(pvol),1);
        if(stateIndex==7) return float4(PackPositive(smoothedPrevious),1);
        if((stateIndex>=DELAY_BASE && stateIndex<DELAY_BASE+20) ||
           (stateIndex>=BASE_CONTROL_PIXELS && stateIndex<DELAY_PHASE_INDEX)){
            int ringIndex=stateIndex<BASE_CONTROL_PIXELS
                ? stateIndex-DELAY_BASE:stateIndex-BASE_CONTROL_PIXELS+20;
            int ageTicks=(currentTick-ringIndex+DELAY_SAMPLES)%DELAY_SAMPLES;
            if(ageTicks<crossedTicks){
                float blend=saturate(1.0-(delayPhase+(float)ageTicks)/elapsedTicks);
                return float4(PackSigned(lerp(previousTvol,tvol,blend)),1);
            }
            return initialized?State(stateIndex):float4(PackSigned(0.0),1);
        }
        if(stateIndex==POINTER_INDEX)return float4(currentTick/255.0,0,0,1);
        if(stateIndex==DELAY_PHASE_INDEX)return float4(PackUnit(delayPhase),1);
        if(stateIndex==TVOL_INDEX)return float4(PackSigned(tvol),1);
        if(stateIndex==VOLTIME_INDEX)
            return float4(PackUnit(voltime/VOLTIME_PERIOD),1);
        if(stateIndex==SMOOTH_VOLUME_INDEX)
            return float4(PackPositive(smoothVolume),1);
        if(stateIndex==BEAT_AGE_INDEX)return float4(PackUnit(beatAge/4.0),1);
        if(stateIndex==BEAT_DELAY_INDEX)return float4(beatDelay,0,0,1);
        if(stateIndex==GRID_INDEX)return float4(grid/16.0,0,0,1);
        if(stateIndex==FORM_TARGET_INDEX)return float4(formTarget/3.0,0,0,1);
        if(stateIndex==FORM_SMOOTH_INDEX)return float4(PackPositive(formSmooth),1);
        if(stateIndex==SCALE_TARGET_INDEX)return float4(scaleTarget/3.0,0,0,1);
        if(stateIndex==SCALE_SMOOTH_INDEX)return float4(PackPositive(scaleSmooth),1);
        if(stateIndex==BEAT_COUNTER_INDEX)return float4(beatCounter/255.0,0,0,1);
        if(stateIndex==MAGIC_INDEX)return float4(MAGIC,1);
        if(stateIndex==MAGIC2_INDEX)return float4(MAGIC2,1);
        return 0.0;
    }

    float2 uv=input.texelSpacePos.xy;
    return float4(saturate(RenderScene(
        uv,size,q1,q3,q6,q7,q8,q9,q10)),1.0);
}`;

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
// 41 original registers + 181 extra time-grid samples + phase and tvol.
// Fixed layout: changing the Draw interval never exposes state as image data.
static const int CONTROL_PIXELS=224;
float4 main(PSInput input) : SV_Target {
    float2 size=max(viewportSize,float2(1,1));
    float2 uv=input.texelSpacePos.xy;
    float columns=max(6.0,min(64.0,floor(size.x)));
    const float controlPixels=CONTROL_PIXELS;
    float rows=ceil(controlPixels/columns);
    if(input.sceneSpacePos.y<rows+.5 && input.sceneSpacePos.x<min(controlPixels,columns)+.5)
        uv.y+=(rows+1.0)/size.y;
    // comp shader is exactly GetPixel(uv); custom shaders replace the legacy
    // gamma/echo/brighten path, so no additional color transform is applied.
    return float4(saturate(Frame.SampleLevel(Filter,uv,0.0).rgb),1.0);
}`;

    return {
        name: "0055",
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
