const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-simplify">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness({stored=null,storageBroken=false,noNav=false}={}){
 const store=stored?{'mindbridge.simplify':stored}:{};
 class E{constructor(){this.attrs={};this.l={};this.children=[];this._t='';}
  get textContent(){return this._t;}set textContent(v){this._t=v;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,f){this.l[k]=f;}
  prepend(...n){this.children.unshift(...n);}click(){this.l.click?.();}}
 const nav=new E(),rootEl=new E();
 const ctx={curLang:'en',console,document:{documentElement:rootEl,querySelector:s=>noNav?null:nav,createElement:()=>new E()},applyI18n(){},
  localStorage:storageBroken?{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}}
   :{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];}}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 const [live,hint,button]=nav.children;return {ctx,nav,rootEl,live,hint,button,store};
}
test('off by default: nothing hidden, button reports not pressed and describes itself',()=>{
 const h=harness();assert.equal(h.rootEl.attrs['data-simplify'],undefined);assert.equal(h.button.attrs['aria-pressed'],'false');
 assert.equal(h.button.attrs['aria-describedby'],h.hint.id);assert(/All tools and pages stay available/.test(h.hint.textContent));
});
test('toggle is reversible, announced politely and remembered',()=>{
 const h=harness();h.button.click();
 assert.equal(h.rootEl.attrs['data-simplify'],'on');assert.equal(h.button.attrs['aria-pressed'],'true');assert.equal(h.live.textContent,'Simplified view on');assert.equal(h.store['mindbridge.simplify'],'on');
 h.button.click();assert.equal(h.rootEl.attrs['data-simplify'],undefined);assert.equal(h.live.textContent,'Simplified view off');assert.equal(h.store['mindbridge.simplify'],undefined);
 assert.equal(h.live.attrs['aria-live'],'polite');
});
test('a saved preference is restored on load without announcing anything',()=>{
 const h=harness({stored:'on'});assert.equal(h.rootEl.attrs['data-simplify'],'on');assert.equal(h.button.attrs['aria-pressed'],'true');assert.equal(h.live.textContent,'');
});
test('blocked storage still works for the open page',()=>{
 const h=harness({storageBroken:true});h.button.click();assert.equal(h.rootEl.attrs['data-simplify'],'on');h.button.click();assert.equal(h.rootEl.attrs['data-simplify'],undefined);
});
test('language change relabels the control and keeps the state',()=>{
 const h=harness();h.button.click();h.ctx.curLang='de';h.ctx.applyI18n();assert.equal(h.button.textContent,'Vereinfachen');assert.equal(h.button.attrs['aria-pressed'],'true');assert(h.hint.textContent.includes('Deine Wahl'));
});
test('missing navigation container is harmless',()=>{assert.doesNotThrow(()=>harness({noNav:true}));});
test('the stylesheet hides decoration only, never tools, and collapses rather than removes motion',()=>{
 const css=fs.readFileSync('frontend/paper.css','utf8');const rule=css.match(/html\[data-simplify=on\] :is\(([^)]*)\)\{display:none!important\}/);
 assert(rule,'hide rule present');for(const forbidden of ['tool-card','#page-','mb-planner','journal','chat','mb-focus','nav-links'])assert(!rule[1].includes(forbidden),'must not hide '+forbidden);
 assert(/animation-duration:\.01ms!important/.test(css)&&!/html\[data-simplify=on\] \*[^{]*\{[^}]*animation:\s*none/.test(css));
});
console.log(checks+' simplify checks passed.');
