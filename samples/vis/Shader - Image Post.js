include('docs/Flags.js');
window.DrawMode = 1;
// Post-processing example for the native waveform source.
// The source shader reads prepared PCM points at t0 and draws a line.
// The post shader reads the resulting image at t0/s0 and applies a vignette;
// it does not receive PCM and does not need a feedback history.
vis.UpdateIntervalMs = 16; // Default: 16 ms; allowed: unsigned integer 1..4294967295 ms.
const sourceShader = `
Texture2D<float> Waveform : register(t0);
cbuffer VisConstants : register(b0) {
    float2 viewportSize;
    float time;
    float pointCount;
};
struct PSInput { float4 clipSpacePos: SV_POSITION; float4 sceneSpacePos: SCENE_POS; };
float4 main(PSInput p): SV_Target {
    float2 sz=max(viewportSize,float2(1.0,1.0));
    int count=max(1,(int)pointCount);
    int i=clamp((int)(p.sceneSpacePos.x/sz.x*count),0,count-1);
    float sampleValue=Waveform.Load(int3(i,0,0)).r;
    float y=(1.0-sampleValue)*0.5*sz.y;
    float lineAlpha=1.0-smoothstep(0.0,1.5,abs(p.sceneSpacePos.y-y));
    return float4(0.15*lineAlpha,0.9*lineAlpha,0.7*lineAlpha,lineAlpha);
}`;
const postShader = `
Texture2D Frame : register(t0);
SamplerState Filter : register(s0);
cbuffer ImageConstants : register(b0) {
    float2 viewportSize;
    float time;
    float frameStep;
};
struct PSInput {
    float4 clipSpacePos: SV_POSITION;
    float4 sceneSpacePos: SCENE_POS;
    float4 texelSpacePos: TEXEL_POS;
};
float4 main(PSInput p): SV_Target {
    float2 uv=p.texelSpacePos.xy;
    float4 color=Frame.Sample(Filter,uv);
    float2 centered=(p.sceneSpacePos.xy-0.5*viewportSize)/max(viewportSize,float2(1,1));
    float shade=1.0-0.45*saturate(dot(centered,centered)*2.0);
    return color*shade; // Premultiplied output.
}`;
let visual=null;
vis.CreateAsync(VisSourceType.Waveform,  null, 
    { shader: sourceShader, post: postShader })
    .then(v=>{visual=v;window.Repaint();})
    .catch(e=>console.log("Shader post example: "+e));
function on_paint(gr) {
    const w=window.Width, h=window.Height;
    gr.FillSolidRect(0,0,w,h,0xff000000);
    if(visual && w>0 && h>0)visual.Draw(gr,0,0,w,h);
}
setInterval(()=>window.Repaint(),33);
