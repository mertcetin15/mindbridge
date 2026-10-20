const fs=require('fs'),vm=require('vm'),assert=require('assert');
const J=require('../frontend/journey-core.js');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-journey">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness({hash=''}={}){
 const ids=new Map(),hist=[],log=[],handlers={};let currentHash=hash;
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';this.className='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}prepend(n){this.children.unshift(n);}replaceChildren(...n){this.children=n;this._t='';}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}click(){this.l.click&&this.l.click();}}
 for(const p of J.PAGES){const e=new E('div');ids.set('page-'+p,e);}
 const ctx={console,curLang:'en',
  document:{getElementById:id=>ids.get(id),createElement:t=>new E(t)},
  history:{pushState:(s,t,u)=>{hist.push(['push',s.mb,u]);currentHash=u;},replaceState:(s,t,u)=>{hist.push(['replace',s.mb,u]);currentHash=u;}},
  location:{get hash(){return currentHash;}},
  showPage:id=>log.push(id),applyI18n(){},MBJourney:J,
  addEventListener:(k,f)=>{handlers[k]=f;}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,ids,hist,log,handlers,pop:(state,h)=>{currentHash=h||'';handlers.popstate({state});}};
}
test('addresses: only known pages, nothing else is trusted',()=>{
 assert.equal(J.routeFromHash('#/library'),'library');
 for(const bad of ['','#','#/','#/nope','#/library/x','#/library?x=1','#/<script>','#//evil.example','library',null,undefined])assert.equal(J.routeFromHash(bad),null,String(bad));
 assert.equal(J.hashFor('quiz'),'#/quiz');assert.equal(J.hashFor('nope'),'');
});
test('the path has three steps with sensible neighbours, and other pages are off the path',()=>{
 assert.deepEqual(J.PATH,['quiz','library','tools']);
 assert.deepEqual(J.neighbours('quiz'),{index:0,total:3,prev:null,next:'library'});
 assert.deepEqual(J.neighbours('tools'),{index:2,total:3,prev:'library',next:null});
 assert.equal(J.neighbours('home'),null);assert.equal(J.neighbours('chat'),null);
});
test('opening a page adds one history entry; opening the same page twice adds none',()=>{
 const h=harness();h.hist.length=0;h.ctx.showPage('library');h.ctx.showPage('library');h.ctx.showPage('tools');
 assert.deepEqual(h.hist,[['push','library','#/library'],['push','tools','#/tools']]);
});
test('the browser Back button goes to the previous page and does not add history entries',()=>{
 const h=harness();h.ctx.showPage('library');h.ctx.showPage('tools');h.hist.length=0;h.log.length=0;
 h.pop({mb:'library'},'#/library');assert.equal(h.log[h.log.length-1],'library');assert.equal(h.hist.length,0);
 h.pop(null,'#/quiz');assert.equal(h.log[h.log.length-1],'quiz','without state the address decides');
 const before=h.log.length;h.pop(null,'#main-content');assert.equal(h.log.length,before,'the skip link (#main-content) does not change the page');
 h.pop(null,'');assert.equal(h.log.length,before,'an empty address with no state changes nothing');
 h.ctx.showPage('tools');assert.equal(h.hist[h.hist.length-1][0],'push','normal navigation works again after Back');
});
test('a page can be opened from its address at load; an unknown address opens home and is replaced',()=>{
 const a=harness({hash:'#/library'});assert.equal(a.log[0],'library');assert.equal(a.hist[0][0],'replace');
 const b=harness({hash:'#/evil'});assert.equal(b.log.length,0);assert.deepEqual(b.hist[0],['replace','home','#/home']);
});
test('a blocked history API never breaks navigation',()=>{
 const h=harness();h.ctx.history.pushState=()=>{throw new Error('SecurityError');};h.ctx.history.replaceState=()=>{throw new Error('SecurityError');};
 assert.doesNotThrow(()=>h.ctx.showPage('tools'));assert.equal(h.log[h.log.length-1],'tools');
});
test('no path strip is drawn on any page',()=>{
 const h=harness();for(const p of J.PAGES)assert.equal(h.ids.get('page-'+p).children.length,0,p);
});
test('navigating never touches stored data: no storage, network or clearing in the module',()=>{
 for(const word of ['localStorage','sessionStorage','fetch(','XMLHttpRequest','.reset(','.value=','removeItem'])assert(!source.includes(word),word);
});
console.log(checks+' journey checks passed.');
