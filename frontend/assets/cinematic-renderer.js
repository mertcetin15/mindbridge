/* One draw per scroll update. WebGL with a projected Canvas fallback. */
(()=>{'use strict';const C=window.MBCinemaCore;
const VS=`precision highp float;attribute vec3 aStart;attribute vec3 aEnd;attribute vec3 aNormalStart;attribute vec3 aNormalEnd;attribute vec3 aColor;attribute float aKind;
uniform mat4 uView;uniform mat4 uProjection;uniform float uMorph;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vKind;
void main(){vec3 p=mix(aStart,aEnd,uMorph);if((aKind>.5&&aKind<1.5)||(aKind>5.5&&aKind<6.5)){p.y-=6.0*(1.0-uMorph);}if(aKind>2.5&&aKind<3.5){p.y-=6.0*(1.0-smoothstep(.65,1.0,uMorph));}vPosition=p;vNormal=normalize(mix(aNormalStart,aNormalEnd,uMorph));vColor=aColor;vKind=aKind;gl_Position=uProjection*uView*vec4(p,1.0);}`;
const FS=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;varying float vKind;uniform vec3 uEye;uniform float uMorph;uniform float uNight;uniform float uProgress;
float hash(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}
float bridgeBand(vec3 p,float off){return (1.0-smoothstep(1.15,2.2,abs(p.x-off)))*smoothstep(-24.0,-21.0,p.z)*(1.0-smoothstep(8.0,10.0,p.z));}
void main(){
float k=vKind;vec3 n=normalize(vNormal);vec3 light=normalize(mix(vec3(-.45,.85,.4),vec3(.6,.8,-.2),uNight));vec3 view=normalize(uEye-vPosition);
float diffuse=max(dot(n,light),0.0);float spec=pow(max(dot(n,normalize(light+view)),0.0),32.0);float fres=pow(1.0-max(dot(n,view),0.0),3.0);
vec3 base=vColor;float shine=.16;
bool timber=k>5.5&&k<6.5,stone=k>7.5&&k<8.5,meadow=k>8.5,water=(k>4.5&&k<5.5)||(k>6.5&&k<7.5),rising=(k>.5&&k<1.5)||timber;
if(k<.5){base=mix(base,vec3(.32,.34,.31),smoothstep(.45,.95,uMorph));}
if(timber){float grain=sin(vPosition.z*170.0+sin(vPosition.x*3.4)*1.8+sin(vPosition.x*11.0)*.25);base*=.96+.035*grain;shine=.025;}
if(stone){float c=hash(floor(vPosition*vec3(2.5,2.5,2.5)))*.6+hash(floor(vPosition*vec3(9.0,9.0,9.0)))*.4;base*=.92+.12*c;base*=.95+.05*step(.5,fract(vPosition.y*2.6));shine=.02;}
if(meadow){float c=hash(floor(vPosition*vec3(23.0,1.0,23.0)))*.5+hash(floor(vPosition*vec3(7.0,1.0,7.0)))*.5;base*=.95+.09*c;shine=.0;}
float sky=n.y*.5+.5;
vec3 ambient=mix(mix(vec3(.36,.35,.30),vec3(.50,.54,.56),sky),mix(vec3(.17,.21,.32),vec3(.27,.34,.50),sky),uNight);
float ao=1.0;if(rising||stone)ao=mix(.6,1.0,smoothstep(-3.0,-.2,vPosition.y));
vec3 color=base*(ambient*ao+.58*diffuse*mix(1.0,ao,.5))+vec3(.96,.92,.83)*spec*shine+vec3(.06,.07,.08)*fres;
float knot=exp(-dot((vPosition.xz-vec2(1.3,0.0))*vec2(.45,.31),(vPosition.xz-vec2(1.3,0.0))*vec2(.45,.31)))*(1.0-uMorph);
if(meadow){float sh=max(bridgeBand(vPosition,1.6)*uMorph*smoothstep(-.8,-2.2,vPosition.y)*.9,knot*.5);color*=1.0-.38*sh;}
color=mix(color,color*vec3(.27,.39,.62)+vec3(.015,.025,.045),uNight);
if(water){
float ph=uProgress;
vec3 wn=normalize(vec3(sin(vPosition.x*1.3+vPosition.z*.7+ph*18.0)*.05+sin(vPosition.x*3.7-ph*27.0+vPosition.z*1.9)*.022,1.0,cos(vPosition.z*1.1-vPosition.x*.4+ph*15.0)*.05+sin(vPosition.z*4.3+ph*22.0)*.022));
float f=pow(1.0-max(dot(wn,view),0.0),4.0);
bool pond=k<6.0;
vec3 deep=mix(pond?vec3(.27,.46,.47):vec3(.13,.31,.34),vec3(.03,.075,.125),uNight);vec3 skyc=mix(vec3(.74,.83,.84),vec3(.07,.13,.24),uNight);
vec3 wc=mix(deep,skyc,clamp(.16+.84*f,0.0,1.0));
wc+=vec3(1.0,.93,.78)*pow(max(dot(wn,normalize(light+view)),0.0),110.0)*1.1*(1.0-uNight*.55);
if(!pond){float sh=max(bridgeBand(vPosition,1.7)*uMorph,knot);wc*=1.0-.4*sh;}
color=wc;}
float dist=length(uEye-vPosition);float fog=1.0-exp(-dist*.018);
vec3 fogColor=mix(mix(vec3(.89,.91,.82),vec3(.80,.87,.87),smoothstep(25.0,110.0,dist)),vec3(.055,.085,.14),uNight);
color=mix(color,fogColor,fog);
color=mix(color,fogColor,smoothstep(-.4,-2.6,vPosition.y)*.2*(1.0-uNight*.4));
gl_FragColor=vec4(color,1.0);
}`;
window.MBCinemaRenderer=function(canvas){let gl,program,buffer,mesh=null,disposed=false,fallback=null,last=0,meshCompact=null;const uniforms={},viewM=new Float32Array(16),projM=new Float32Array(16),eyeV=new Float32Array(3);
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader unavailable: '+gl.getShaderInfoLog(s));return s;}
 try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power'});if(!gl)throw Error('WebGL unavailable');program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,VS),fs=compile(gl.FRAGMENT_SHADER,FS);gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Renderer unavailable: '+gl.getProgramInfoLog(program));buffer=gl.createBuffer();gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const stride=16*4;let offset=0;for(const [name,size]of [['aStart',3],['aEnd',3],['aNormalStart',3],['aNormalEnd',3],['aColor',3],['aKind',1]]){const l=gl.getAttribLocation(program,name);if(l>=0){gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,stride,offset*4);}offset+=size;}gl.enable(gl.DEPTH_TEST);for(const name of ['uView','uProjection','uEye','uMorph','uNight','uProgress'])uniforms[name]=gl.getUniformLocation(program,name);canvas.dataset.renderer='webgl';}
 catch(e){canvas.dataset.rendererError=e.message;if(gl){gl.getExtension('WEBGL_lose_context')?.loseContext();}gl=null;fallback=document.createElement('canvas');fallback.className='mb-cinema-fallback';canvas.after(fallback);canvas.hidden=true;canvas.dataset.renderer='canvas';}
 // Frame budget. Drawing that averages more than 20 ms (below ~50 fps) drops the rest of this visit to 1x resolution.
 // It is only ever lowered, so quality never flips back and forth; the page stays fully usable either way.
 const quality={cap:1.75,avg:0,samples:0};
 function draw(p){const t0=performance.now();drawFrame(p);const spent=performance.now()-t0;quality.avg=quality.samples?quality.avg*.8+spent*.2:spent;quality.samples++;if(quality.cap>1&&quality.samples>=12&&quality.avg>20){quality.cap=1;canvas.dataset.quality='reduced';}}
 function drawFrame(p){if(disposed)return;last=p;const r=canvas.parentElement.getBoundingClientRect();if(r.width<1||r.height<1)return;const compact=r.width<760,dpr=Math.min(devicePixelRatio||1,quality.cap),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr),cam=C.camera(p,compact),morph=C.smooth(.02,.52,p),night=C.clamp(window.mbSceneNight??(document.documentElement.dataset.theme==='dark'?1:0));
 if(!mesh||meshCompact!==compact){meshCompact=compact;mesh=C.geometry(compact);if(gl){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh.data,gl.STATIC_DRAW);}}
 canvas.dataset.progress=p.toFixed(4);canvas.dataset.morph=morph.toFixed(4);
 if(gl){if(gl.isContextLost())return;if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);viewM.set(C.lookAt(cam.eye,cam.target));projM.set(C.perspective(cam.fov,W/H));eyeV.set(cam.eye);gl.uniformMatrix4fv(uniforms.uView,false,viewM);gl.uniformMatrix4fv(uniforms.uProjection,false,projM);gl.uniform3fv(uniforms.uEye,eyeV);gl.uniform1f(uniforms.uMorph,morph);gl.uniform1f(uniforms.uProgress,p);gl.uniform1f(uniforms.uNight,night);gl.drawArrays(gl.TRIANGLES,0,mesh.data.length/16);}
 else{if(fallback.width!==W||fallback.height!==H){fallback.width=W;fallback.height=H;}const ctx=fallback.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,W,H);
 const shadow=ctx.createRadialGradient(W*.5,H*.69,0,W*.5,H*.69,W*.26);shadow.addColorStop(0,'rgba(61,74,58,.13)');shadow.addColorStop(1,'rgba(61,74,58,0)');ctx.save();ctx.translate(0,H*.52);ctx.scale(1,.24);ctx.fillStyle=shadow;ctx.fillRect(0,0,W,H*4);ctx.restore();
 // Filled garden surfaces are drawn in the Canvas fallback too.
 const projected=mesh.faces.filter(f=>(f.kind!==6&&f.kind!==1)||morph>.32).map(face=>{const lift=(face.kind===6||face.kind===1)?-6*(1-morph):0;const points=face.points.map(v=>C.project([v[0],v[1]+lift,v[2]],cam,W,H));return {face,points,depth:points.reduce((sum,p)=>sum+(p?p[2]:0),0)/points.length};}).sort((a,b)=>b.depth-a.depth);
 for(const {face,points} of projected){if(points.some(v=>!v))continue;ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.closePath();ctx.fillStyle='rgb('+face.color.map((v,i)=>Math.round(v*(1-night*[.73,.61,.38][i])*255)).join(',')+')';ctx.fill();}

 const segments=[];for(const line of mesh.lines){if(line.kind===0&&morph>.92)continue;if((line.kind===1||line.kind===6)&&morph<.28)continue;if(line.kind===3&&morph<.65)continue;const count=line.kind>=1?Math.min(24,mesh.segments):mesh.segments;let prior=null;for(let i=0;i<=count;i++){const t=i/count,a=line.start(t),b=line.end(t),pos=a.map((v,j)=>C.mix(v,b[j],morph));if(line.kind===1||line.kind===6)pos[1]-=6*(1-morph);if(line.kind===3)pos[1]-=6*(1-C.smooth(.65,1,morph));const screen=C.project(pos,cam,W,H);if(prior&&screen)segments.push({a:prior,b:screen,color:line.color,r:line.r,depth:(prior[2]+screen[2])/2});prior=screen;}}
 segments.sort((a,b)=>b.depth-a.depth);ctx.lineCap='round';for(let layer=0;layer<3;layer++)for(const seg of segments){const f=H/(2*Math.tan(cam.fov*Math.PI/360)),width=Math.max(.7,2*seg.r*f/seg.depth),fog=Math.min(.75,seg.depth*.023);const rgb=seg.color.map((v,i)=>Math.round((v*(1-fog)+[.89,.91,.82][i]*fog)*(1-night*[.73,.61,.38][i])*255));ctx.beginPath();ctx.moveTo(seg.a[0],seg.a[1]);ctx.lineTo(seg.b[0],seg.b[1]);ctx.strokeStyle=layer===0?'rgb('+rgb.map(v=>Math.round(v*.78)).join(',')+')':layer===1?'rgb('+rgb.join(',')+')':'rgba(255,255,241,.3)';ctx.lineWidth=width*[1,.78,.22][layer];ctx.stroke();}
 }
 }
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;if(!fallback){fallback=document.createElement('canvas');fallback.className='mb-cinema-fallback';canvas.after(fallback);}canvas.hidden=true;canvas.dataset.renderer='canvas';draw(last);});
 return {draw,quality,dispose(){disposed=true;if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program);}mesh=null;fallback?.remove();}};
};
})();
