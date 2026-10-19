/* Deterministic geometry and camera. No textures, network or animation clock. */
(function(root){'use strict';
const clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const d=Math.hypot(...a)||1;return a.map(v=>v/d);},dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
// Fifty authored samples across five beats. Interpolation stays reversible.
const deckY=z=>-.25+1.3*Math.sin(Math.PI*clamp((8-z)/30));
function journeyPose(p,compact){
 const unfold=smooth(.0,.42,p),crossing=smooth(.46,.94,p),arrival=smooth(.88,1,p);
 const orbit=Math.sin(p*Math.PI*2)*1.1*(1-unfold);
 const ez=mix(compact?12:10.5,-25,crossing),tz=mix(0,-39,crossing);
 // Eye height of a person standing on the boards (1.62 m above them): the camera rides the arch.
 const eyeY=mix(2.3,deckY(ez)+.13+1.62,crossing)+arrival*1.25;
 const lookY=mix(mix(.1,.5,unfold),deckY(tz)+.95,crossing*(1-arrival));
 return {eye:[mix(compact?0:3.6,0,unfold)+orbit,eyeY,ez],target:[0,lookY,tz],fov:mix(compact?52:43,compact?57:49,arrival)};
}
const journeyFrames=[false,true].map(compact=>Array.from({length:50},(_,i)=>journeyPose(i/49,compact)));
function camera(p,compact=false){const q=clamp(p),n=q*49,i=Math.min(48,Math.floor(n)),t=n-i,a=journeyFrames[compact?1:0][i],b=journeyFrames[compact?1:0][i+1];
 const eye=a.eye.map((v,j)=>mix(v,b.eye[j],t));
 // Footfall: a faint, deterministic bob and sway tied to progress (never a clock), only while crossing.
 const walk=smooth(.5,.58,q)*(1-smooth(.9,.96,q));eye[1]+=Math.sin(q*Math.PI*2*24)*.02*walk;eye[0]+=Math.sin(q*Math.PI*2*12)*.011*walk;
 return {eye,target:a.target.map((v,j)=>mix(v,b.target[j],t)),fov:mix(a.fov,b.fov,t)};}
function perspective(fov,aspect,near=.1,far=140){const f=1/Math.tan(fov*Math.PI/360),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function lookAt(eye,target){const z=unit(sub(eye,target)),x=unit(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function path(i,t,open){const phase=i*Math.PI*2/12;
 if(!open){const a=t*Math.PI*2,r=1.4+.35*Math.sin(3*a+phase);return [r*Math.cos(a+phase)+.5*Math.cos(2*a+phase),1.25*Math.sin(2*a+phase)+.25*Math.cos(3*a),r*Math.sin(a+phase)+.25*Math.sin(3*a+phase)];}
 const z=8-30*t,y=-.25+1.3*Math.sin(Math.PI*t),x=(i-5.5)*.17;return [x,y,z];
}
function frame(fn,t){const p=fn(t),tan=unit(sub(fn(Math.min(1,t+.001)),fn(Math.max(0,t-.001))));let n=unit(cross(tan,[0,1,0]));if(Math.hypot(...n)<.1)n=[1,0,0];return {p,n,b:unit(cross(tan,n))};}
const colors=[[.29,.43,.72],[.48,.65,.64],[.81,.51,.40],[.59,.52,.74],[.83,.71,.52],[.48,.63,.52]];
function geometry(compact=false){const data=[],lines=[],faces=[],segments=compact?72:100,sides=compact?6:8;
 function tube(start,end,r,color,kind=0,count=segments){const verts=[];for(let j=0;j<=count;j++){const t=j/count,a=frame(start,t),b=frame(end,t);for(let k=0;k<=sides;k++){const angle=k/sides*Math.PI*2;const na=a.n.map((v,i)=>v*Math.cos(angle)+a.b[i]*Math.sin(angle)),nb=b.n.map((v,i)=>v*Math.cos(angle)+b.b[i]*Math.sin(angle));verts.push([...a.p.map((v,i)=>v+na[i]*r),...b.p.map((v,i)=>v+nb[i]*r),...na,...nb,...color,kind]);}}
 for(let j=0;j<count;j++)for(let k=0;k<sides;k++){const a=j*(sides+1)+k,b=a+sides+1;for(const v of [a,b,a+1,b,b+1,a+1])data.push(...verts[v]);}
 lines.push({start,end,color,kind,r});
 }
 // Solid faces carry their real normals, including vertical timber edges.
 function face(points,color,kind=4){const normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));faces.push({points,color,kind});for(let i=1;i<points.length-1;i++)for(const v of [points[0],points[i],points[i+1]])data.push(...v,...v,...normal,...normal,...color,kind);}
 function timber(x,y,z,w,h,d,color,kind=6){
 const a=[x-w/2,y-h/2,z-d/2],b=[x+w/2,y-h/2,z-d/2],c=[x+w/2,y+h/2,z-d/2],d0=[x-w/2,y+h/2,z-d/2],e=[x-w/2,y-h/2,z+d/2],f=[x+w/2,y-h/2,z+d/2],g=[x+w/2,y+h/2,z+d/2],h0=[x-w/2,y+h/2,z+d/2];
 for(const q of [[d0,h0,g,c],[a,b,f,e],[e,f,g,h0],[b,a,d0,c],[a,e,h0,d0],[f,b,c,g]])face(q,color,kind);
 }
 for(let i=0;i<12;i++)tube(t=>path(i,t,false),t=>path(i,t,true),.066,colors[i%colors.length]);
 // ---- A bowstring-arch footbridge over a river: boards, girders, rails, steel arches and hangers. ----
 const Z=t=>8-30*t,deck=t=>-.25+1.3*Math.sin(Math.PI*t),steel=[.31,.37,.38],oak=[.43,.30,.20],dark=[.27,.22,.17],stone=[.56,.55,.50];
 const archY=t=>deck(t)+.3+3.9*Math.pow(Math.sin(Math.PI*t),.9);
 for(let j=0;j<100;j++){const u=(j+.5)/100,tone=(Math.sin(j*17.1)+1)*.025;timber(0,deck(u)+.13,Z(u),2.7,.18,.282,[.48+tone,.34+tone,.22+tone]);}
 for(let j=0;j<34;j++){const u=(j+.5)/34;timber(0,deck(u)-.06,Z(u),2.86,.13,.2,dark,6);}
 for(const x of [-1.2,0,1.2]){const girder=t=>[x,deck(t)-.2,Z(t)];tube(girder,girder,x===0?.07:.13,dark,6,48);}
 for(const side of [-1,1]){
  const rx=side*1.32,rail=t=>[rx,deck(t)+1.1,Z(t)],edge=t=>[side*1.38,deck(t)-.02,Z(t)],arch=t=>[side*1.52,archY(t),Z(t)];
  tube(rail,rail,.06,oak,6,48);tube(edge,edge,.1,dark,6,48);tube(arch,arch,.085,steel,1,56);
  for(const h of [.38,.72]){const cable=t=>[rx,deck(t)+h,Z(t)];tube(cable,cable,.016,[.4,.42,.4],1,48);}
  for(let j=0;j<=30;j++){const u=j/30;timber(rx,deck(u)+.62,Z(u),.08,1.0,.08,steel,1);}
  // Steel hangers carry the deck from the arch.
  for(let j=1;j<22;j++){const u=j/22,y0=deck(u)+.25,y1=archY(u),hanger=t=>[side*1.52,mix(y0,y1,t),Z(u)];tube(hanger,hanger,.016,[.58,.6,.58],1,1);}
  // Bearing blocks where each arch meets the stone.
  for(const u of [.005,.995])timber(side*1.52,deck(u)+.08,Z(u),.32,.5,.5,steel,1);
 }
 // Stone abutments sit on the river banks; the far one meets the garden landing.
 for(const zc of [8.2,-22.2]){timber(0,-1.75,zc,3.9,2.9,2.4,stone,8);timber(0,-.26,zc,4.15,.12,2.65,[.63,.62,.57],8);}
 // Gravel approach for the near bank.
 face([[-1.4,-.38,46],[1.4,-.38,46],[1.25,-.38,9.4],[-1.25,-.38,9.4]],[.74,.71,.62],4);
 // Meadow quad below the mesh: only the Canvas fallback shows it.
 face([[-40,-.62,50],[40,-.62,50],[40,-.62,9],[-40,-.62,9]],[.56,.66,.46],4);
 // A real destination beyond the bridge, with a continuous landing at z=-22.
 const land=[[-10,-.4,-22],[10,-.4,-22],[16,-.4,-42],[10,-.4,-51],[-12,-.4,-51],[-16,-.4,-37]];face(land,[.57,.66,.48]);
 // Pond is inset to the right of the path; its outline is shared by the effects layer.
 const pond=Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return [5.1+3.2*Math.cos(a),-.36,-33+4.0*Math.sin(a)];});face(pond,[.37,.58,.59],5);
 for(let i=0;i<13;i++){const z=-22-i*1.35,x=Math.sin(i*.3)*.17;face([[x-.9,-.29,z+.45],[x+.9,-.29,z+.45],[x+.85,-.29,z-.5],[x-.85,-.29,z-.5]],[.77,.76,.65]);}
 // Open crescent arbor at the far end frames the destination without closing the path.
 for(const side of [-1,1]){const arch=t=>[side*(3.2-1.9*Math.sin(t*Math.PI/2)),3.8*t-.3,-41];tube(arch,arch,.11,[.51,.44,.32],4,12);}
 // Three willows and an intentionally small, readable bench.
 for(const [x,z,h] of [[-5,-30,5.5],[10,-40,7],[-10,-43,6]]){
 const trunk=t=>[x+.35*Math.sin(t*2),-.35+h*t,z];tube(trunk,trunk,.17,[.40,.40,.29],4,7);
 for(let j=0;j<7;j++){const a=j/7*Math.PI*2,branch=t=>[x+Math.cos(a)*2.8*t,h-.35-3.7*t*t,z+Math.sin(a)*2.4*t];tube(branch,branch,.08,[.39+j*.015,.53,.34],4,10);}}
 for(let j=0;j<4;j++){const seat=t=>[-5+3*t,.32,-36+j*.18];tube(seat,seat,.12,[.59,.43,.29],4,1);const back=t=>[-5+3*t,.85+j*.19,-36.15];tube(back,back,.10,[.59,.43,.29],4,1);}
 for(const x of [-4.7,-2.3])for(const z of [-35.5,-36.1]){const leg=t=>[x,-.3+.7*t,z];tube(leg,leg,.075,[.36,.39,.30],4,1);}
 // Six lamp posts border the path; luminous heads are projected in the effects layer.
 const lamps=[];for(const z of [-25,-31,-38])for(const side of [-1,1]){const x=side*1.7,post=t=>[x,-.3+1.55*t,z];tube(post,post,.045,[.34,.40,.34],4,1);lamps.push([x,1.3,z]);}
 // ---- River valley: lit terrain mesh, flowing water, reeds and rocks. ----
 const WATER=-2.45,mx3=(c,d,t)=>[mix(c[0],d[0],t),mix(c[1],d[1],t),mix(c[2],d[2],t)];
 const gardenMask=(x,z)=>smooth(-18,-24,z)*(1-smooth(16,24,Math.abs(x)));
 function ground(x,z){
  const m=Math.sin(x*.11+1.3)*1.1+Math.sin(x*.27)*.45,zc=-7+m*.8,half=14.4+m*.5,a=Math.abs((z-zc)/half),ac=Math.min(1,a);
  const hills=smooth(.7,1.3,a)*smooth(16,62,Math.abs(x))*(4.2+2.2*Math.sin(z*.06+x*.04)+1.2*Math.sin(x*.13));
  const lumps=.1*Math.sin(x*.7+z*.5)*Math.sin(z*.45-x*.3)*smooth(.9,1.4,a)*(1-gardenMask(x,z));
  return -.55-3.4*(1-Math.pow(ac,3.2))+hills+lumps;
 }
 function tint(x,z,h,slope){
  const lush=.5+.5*Math.sin(x*.21+z*.17)*Math.sin(z*.13-x*.09);
  let c=[mix(.43,.52,lush),mix(.57,.65,lush),mix(.33,.40,lush)];
  c=mx3(c,[.33,.47,.30],smooth(16,60,Math.abs(x)));
  c=mx3(c,[.50,.47,.41],smooth(.1,.3,slope));
  c=mx3(c,[.33,.31,.24],1-smooth(WATER-.1,WATER+.7,h));
  return mx3(c,[.57,.66,.48],gardenMask(x,z)*.85);
 }
 {const cols=compact?40:62,step=compact?2:1,xs=Array.from({length:cols+1},(_,i)=>{const u=i/cols*2-1;return Math.sign(u)*Math.pow(Math.abs(u),1.6)*100;}),zs=[];
  for(let z=-110;z<-60;z+=10)zs.push(z);for(let z=-60;z<-45;z+=2.5*step)zs.push(z);for(let z=-45;z<25;z+=step)zs.push(z);for(let z=25;z<50;z+=4)zs.push(z);zs.push(50);
  const grid=zs.map(z=>xs.map(x=>{const h=ground(x,z),e=.5,dx=ground(x+e,z)-ground(x-e,z),dz=ground(x,z+e)-ground(x,z-e),n=unit([-dx/(2*e),1,-dz/(2*e)]);return [x,h,z,...n,...tint(x,z,h,1-n[1])];}));
  const put=v=>data.push(v[0],v[1],v[2],v[0],v[1],v[2],v[3],v[4],v[5],v[3],v[4],v[5],v[6],v[7],v[8],9);
  for(let j=0;j<zs.length-1;j++)for(let i=0;i<cols;i++){const a=grid[j][i],b=grid[j][i+1],c=grid[j+1][i],d=grid[j+1][i+1];for(const v of [a,c,b,b,c,d])put(v);}}
 face([[-100,WATER,12],[100,WATER,12],[100,WATER,-26],[-100,WATER,-26]],[.37,.58,.59],7);
 // Shore reeds and boulders follow the real ground height.
 function shore(x,side){let z=side>0?3.5:-17.5;for(let n=0;n<160&&ground(x,z)>WATER+.2;n++)z-=side*.1;return z;}
 for(let j=0;j<24;j++){const side=j%2?1:-1,x=-13+((j*.6180339)%1)*26,z=shore(x,side)+side*.15,base=ground(x,z)-.1,h=.7+(j%4)*.18,lean=((j%5)-2)*.07;
  const stem=t=>[x+lean*t*3,base+h*t,z];tube(stem,stem,.014,[.36,.48,.32],3,3);
  const leaf=t=>[x+lean*3+.22*Math.sin(t*Math.PI/2)*(j%2?1:-1),base+h*.5+.2*Math.sin(t*Math.PI),z-.05*t];tube(leaf,leaf,.032,[.46,.58,.38],3,4);}
 for(let j=0;j<14;j++){const side=j%2?1:-1,x=-15+((j*.7548776)%1)*30,z=shore(x,side)+side*(.1+(j%3)*.4),s2=.35+(j%4)*.14,y0=ground(x,z)-.12,tone=.5+(j%3)*.04,col=[tone,tone-.01,tone-.07];
  const r=[0,1,2,3].map(k=>{const a=k/4*Math.PI*2+j;return [x+Math.cos(a)*s2*(1+.25*Math.sin(j*3+k)),y0+s2*.18,z+Math.sin(a)*s2*(1+.25*Math.cos(j*2+k))];}),top=[x+.06*s2,y0+s2*.85,z],bot=[x,y0-s2*.3,z];
  for(let k=0;k<4;k++){const q=r[k],w=r[(k+1)%4];face([top,q,w],col,8);face([bot,w,q],col,8);}}
 return {data:new Float32Array(data),lines,faces,lamps,segments};
}
function project(point,cam,W,H){const z=unit(sub(cam.eye,cam.target)),x=unit(cross([0,1,0],z)),y=cross(z,x),p=sub(point,cam.eye),depth=-dot(p,z);if(depth<.15)return null;const f=H/(2*Math.tan(cam.fov*Math.PI/360));return [W/2+dot(p,x)*f/depth,H/2-dot(p,y)*f/depth,depth];}
root.MBCinemaCore={clamp,mix,smooth,camera,journeyFrames,perspective,lookAt,path,geometry,project};if(typeof module!=='undefined')module.exports=root.MBCinemaCore;
})(typeof window!=='undefined'?window:globalThis);
