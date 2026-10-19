const fs=require('fs'),vm=require('vm'),assert=require('assert');
const K=require('../frontend/calm-options-core.js');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-calm-options">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
let reachableAll=true;
function harness(lang='en'){
 const log=[];
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';this.className='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  append(...n){this.children.push(...n);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}click(){this.l.click&&this.l.click();}
  get hidden(){return false;}getAttribute(){return null;}closest(sel){return /mb-pane/.test(sel)?null:this;}scrollIntoView(){}querySelector(){return null;}querySelectorAll(){return [];}getClientRects(){return [1];}focus(){}get parentElement(){return null;}}
 const ctx={console,MBCalmOptions:K,
  document:{documentElement:{lang},createElement:t=>new E(t),querySelector:()=>reachableAll?new E('h3'):null,getElementById:()=>null},getComputedStyle:()=>({display:'block'}),
  showPage:id=>log.push('page:'+id)};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,log,E};
}
const walk=(n,f)=>{f(n);n.children.forEach(c=>walk(c,f));};
test('elevated: two answers at 2 or more, or any 3; skipped answers are ignored; light answers are not elevated',()=>{
 assert.equal(K.elevated([0,1,1,0,1]),false);assert.equal(K.elevated([2,0,1,0,1]),false);
 assert.equal(K.elevated([2,2,0,0,0]),true);assert.equal(K.elevated([0,0,3,0,0]),true);
 assert.equal(K.elevated([null,null,null,null,null]),false);assert.equal(K.elevated([null,3]),true);assert.equal(K.elevated(undefined),false);
});
test('five options, Continue normally is one of them and no option is marked preferred',()=>{
 assert.deepEqual(K.OPTIONS.map(o=>o.id),['breathing','grounding','journaling','break','continue']);
 assert.equal(K.OPTIONS.find(o=>o.id==='continue').tool,null);
});
test('nothing is added when the answers are not elevated',()=>{
 const h=harness();const card=new h.E('section');assert.equal(h.ctx.mbCalmOptions(card,[0,1,0,1,0]),null);assert.equal(card.children.length,0);
});
test('elevated: the panel offers the five options with the same class, plus a way to reach a person',()=>{
 const h=harness();const card=new h.E('section');const box=h.ctx.mbCalmOptions(card,[3,2,2,0,0]);assert(box);
 const buttons=[];walk(box,n=>{if(n.tag==='button')buttons.push(n);});
 assert.deepEqual(buttons.slice(0,5).map(b=>b.textContent),['Breathing','Grounding','Journaling','Take a break','Continue normally']);
 assert(buttons.slice(0,5).every(b=>b.className===buttons[0].className),'identical weight');assert.equal(buttons[5].textContent,'Reach a person');
});
test('choosing an option opens the page and the card only; nothing is started',()=>{
 const h=harness();const card=new h.E('section');const box=h.ctx.mbCalmOptions(card,[3,3,0,0,0]);const buttons=[];walk(box,n=>{if(n.tag==='button')buttons.push(n);});
 buttons[0].click();assert.deepEqual(h.log,['page:tools']);
 assert(!/\.play\(|AudioContext|\.start\(|setTimeout|setInterval|requestAnimationFrame/.test(source),'no autostart or timers in the module');
 assert.deepEqual(source.match(/[\w.]+\.click\(/g),['tab.click('],'the only click is on a tab, which only shows its panel');
});
test('Continue normally changes nothing and says so; it does not leave the page',()=>{
 const h=harness();const card=new h.E('section');const box=h.ctx.mbCalmOptions(card,[3,3,0,0,0]);const buttons=[];let status;walk(box,n=>{if(n.tag==='button')buttons.push(n);if(n.attrs&&n.attrs.role==='status')status=n;});
 buttons[4].click();assert.deepEqual(h.log,[]);assert(/Nothing changed/.test(status.textContent));
});
test('an option whose card cannot be reached is not offered; Continue normally and the person button always are',()=>{
 reachableAll=false;try{const h=harness();const card=new h.E('section');const box=h.ctx.mbCalmOptions(card,[3,3,0,0,0]);const labels=[];walk(box,n=>{if(n.tag==='button')labels.push(n.textContent);});
  assert.deepEqual(labels,['Continue normally','Reach a person']);}finally{reachableAll=true;}
});
test('a card inside a hidden section or marked retired is not offered, even when it exists',()=>{
 for(const flag of ['hidden','retired']){
  const h=harness();const real=h.ctx.document.querySelector;
  h.ctx.document.querySelector=()=>{const card=new h.E('div');card.id='';const parent=new h.E('details');Object.defineProperty(parent,'hidden',{get:()=>flag==='hidden'});parent.getAttribute=k=>flag==='retired'&&k==='data-retired'?'true':null;card.closest=sel=>/mb-pane/.test(sel)?null:card;Object.defineProperty(card,'parentElement',{get:()=>parent});return card;};
  const box=h.ctx.mbCalmOptions(new h.E('section'),[3,3,0,0,0]);const labels=[];walk(box,n=>{if(n.tag==='button')labels.push(n.textContent);});
  assert.deepEqual(labels,['Continue normally','Reach a person'],flag);}
});
test('the person button goes to the contact page',()=>{
 const h=harness();const card=new h.E('section');const box=h.ctx.mbCalmOptions(card,[3,3,0,0,0]);const buttons=[];walk(box,n=>{if(n.tag==='button')buttons.push(n);});buttons[5].click();assert.deepEqual(h.log,['page:contact']);
});
test('the copy states the limits, is not a diagnosis, and never names a condition, in every language',()=>{
 for(const lang of ['en','tr','de','es']){const h=harness(lang);const card=new h.E('section');const text=h.ctx.mbCalmOptions(card,[3,3,0,0,0]).textContent;
  assert(!/depress|anxiety|disorder|diagnos(e|is) you|depresyon|anksiyete|Depression|Angst|ansiedad|depresi/i.test(text.replace(/not a diagnosis|bir tanı değildir|keine Diagnose|no es un diagnóstico/gi,'')),lang+': '+text);
  assert(text.length>200,lang);}
 assert(/not a diagnosis/.test(harness('en').ctx.mbCalmOptions(new (harness().E)('s'),[3,3]).textContent));
});
test('the Self-check result calls the panel with the visible answers and does not depend on it existing',()=>{
 const src=fs.readFileSync('frontend/checkin.js','utf8');assert(/if\(window\.mbCalmOptions\)window\.mbCalmOptions\(card,visible\)/.test(src));
});
console.log(checks+' calm-option checks passed.');
