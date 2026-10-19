const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
// A canvas whose WebGL is unavailable, so the renderer takes the 2D path; every 2D call "costs" `cost` ms on a fake clock.
function rig(cost,{dpr=2,width=900}={}){
 let clock=1000;const widths=[];
 const any=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:any(),apply:()=>any(),set:()=>true});
 class Canvas{constructor(){this.dataset={};this.hidden=false;this._w=0;this._h=0;this.parentElement={getBoundingClientRect:()=>({width,height:600})};this.className='';}
  set width(v){this._w=v;widths.push(v);}get width(){return this._w;}set height(v){this._h=v;}get height(){return this._h;}
  after(n){this.next=n;}addEventListener(){}getContext(kind){if(kind==='webgl')return null;clock+=cost;return any();}}
 const canvas=new Canvas(),made=[];
 const ctx={console,Math,Number,Float32Array,Array,Object,String,Set,Map,JSON,devicePixelRatio:dpr,performance:{now:()=>clock},
  document:{createElement:()=>{const c=new Canvas();made.push(c);return c;},documentElement:{dataset:{}}}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('frontend/cinematic-core.js','utf8'),ctx);vm.runInContext(fs.readFileSync('frontend/cinematic-renderer.js','utf8'),ctx);
 const renderer=ctx.MBCinemaRenderer(canvas);return {renderer,canvas,made,widths,fallback:()=>made[0],tick:n=>{for(let i=0;i<n;i++)renderer.draw(i/Math.max(1,n));}};
}
test('without WebGL the page still gets a drawn scene on a 2D canvas, and nothing throws',()=>{
 const r=rig(2);assert.equal(r.canvas.dataset.renderer,'canvas');assert.equal(r.canvas.hidden,true);assert(r.fallback(),'a fallback canvas exists');r.tick(3);assert(r.fallback().width>0);
});
test('a fast device keeps full quality: the budget is never touched at 2 ms a frame',()=>{
 const r=rig(2);r.tick(40);assert.equal(r.renderer.quality.cap,1.75);assert.equal(r.canvas.dataset.quality,undefined);assert.equal(r.fallback().width,Math.round(900*1.75),'rendered at the capped 1.75x of a 2x screen');
});
test('a slow device is dropped to 1x once, after enough frames, and keeps working',()=>{
 const r=rig(35);r.tick(11);assert.equal(r.renderer.quality.cap,1.75,'not judged on fewer than 12 frames');
 r.tick(3);assert.equal(r.renderer.quality.cap,1);assert.equal(r.canvas.dataset.quality,'reduced');
 r.tick(2);assert.equal(r.fallback().width,900,'now rendered at 1x');
});
test('the budget only ever goes down: a later fast stretch does not raise it again',()=>{
 let cost=35;const r=rig(35);r.tick(14);assert.equal(r.renderer.quality.cap,1);
 const fast=rig(2);fast.tick(14);assert.equal(fast.renderer.quality.cap,1.75);
 r.tick(50);assert.equal(r.renderer.quality.cap,1);
});
test('a screen that is only 1x is never upscaled by the budget',()=>{const r=rig(2,{dpr:1});r.tick(5);assert.equal(r.fallback().width,900);});
test('hidden or zero-size draws cost nothing and cannot trigger a downgrade by themselves',()=>{
 const r=rig(35,{width:0});r.tick(40);assert.equal(r.renderer.quality.cap,1.75);
});
console.log(checks+' cinema budget checks passed.');
