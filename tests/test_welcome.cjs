const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-welcome">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness({hidden=false,storageBroken=false,simplifyOn=false,timerRunning=false}={}){
 const ids=new Map(),store=new Map(),log=[];const handlers={};
 if(hidden)store.set('mindbridge.welcome.hidden','1');
 class E{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.l={};this._t='';this.hidden=false;this.className='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}before(n){this.sibling=n;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}
  click(){log.push('click:'+this.id);this.l.click?.();}scrollIntoView(){log.push('scroll:'+this.id);}focus(){log.push('focus:'+this.id);}}
 const home=new E('div');home.querySelector=()=>null;ids.set('page-home',home);
 for(const key of ['focus','write','timer','plan']){const tab=new E('button');tab.id='mb-tab-'+key;const pane=new E('section');pane.id='mb-pane-'+key;}
 let simplify=simplifyOn;const simplifyCalls=[],timerCalls=[];let timerValue=5;
 const ctx={console,curLang:'en',
  document:{getElementById:id=>ids.get(id),createElement:t=>new E(t)},
  localStorage:storageBroken?{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,v);}},
  showPage:p=>log.push('page:'+p),toggleSOS:()=>log.push('sos'),
  mbSimplify:{get:()=>simplify,setForNow:v=>{simplify=Boolean(v);simplifyCalls.push(Boolean(v));}},
  mbSetTimerMinutes:n=>{if(timerRunning)return false;timerValue=n;timerCalls.push(n);return true;},
  mbRestoreTimerMinutes:()=>{timerValue=5;timerCalls.push('restore');return true;},
  addEventListener:(k,f)=>{handlers[k]=f;},applyI18n(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 const $=id=>ids.get(id);
 return {ctx,$,store,log,simplifyCalls,timerCalls,handlers,state:()=>({simplify,timerValue}),root:$('mb-welcome')};
}
const walk=(n,f)=>{f(n);n.children.forEach(c=>walk(c,f));};
test('first visit: four plain pointers, skippable, and not one field that asks about the person',()=>{
 const h=harness();assert.equal(h.$('mb-welcome-tour').hidden,false);const labels=['mb-welcome-begin','mb-welcome-journal','mb-welcome-timer','mb-welcome-help'].map(id=>h.$(id).textContent);
 assert.deepEqual(labels.map(t=>t.split(/(?=[A-Z][a-z])/)[0]),['Begin','Journal','Timer','Help'].map(s=>s),'pointer titles: '+labels.join(' | '));
 let fields=0;walk(h.root,n=>{if(['input','textarea','select'].includes(n.tag))fields++;});assert.equal(fields,0,'no input field of any kind');
 assert(/Nothing here asks anything about you/.test(h.$('mb-welcome-tour').textContent));assert.equal(h.store.size,0,'showing it stores nothing');
});
test('Skip hides it for now only; hiding for good is remembered and announced; stored choice is respected',()=>{
 const h=harness();h.$('mb-welcome-skip').click();assert.equal(h.$('mb-welcome-tour').hidden,true);assert.equal(h.store.size,0,'skip stores nothing');
 const g=harness();g.$('mb-welcome-hide').click();assert.equal(g.$('mb-welcome-tour').hidden,true);assert.equal(g.store.get('mindbridge.welcome.hidden'),'1');assert(/Welcome hidden/.test(g.$('mb-welcome-status').textContent));
 assert.equal(harness({hidden:true}).$('mb-welcome-tour').hidden,true);
 assert.doesNotThrow(()=>{const b=harness({storageBroken:true});b.$('mb-welcome-hide').click();});
});
test('every pointer opens the real thing and nothing starts by itself',()=>{
 const h=harness();h.$('mb-welcome-begin').click();h.$('mb-welcome-journal').click();h.$('mb-welcome-timer').click();h.$('mb-welcome-help').click();
 for(const k of ['mb-tab-focus','mb-tab-write','mb-tab-timer'])assert(h.log.includes('click:'+k),k);assert(h.log.includes('sos'));assert.equal(h.log.filter(x=>x==='page:tools').length,3);
 assert.equal(h.timerCalls.length,0,'the timer is untouched');assert.equal(h.simplifyCalls.length,0);
});
test('"right now" is optional, collapsed by default text, and explains itself in plain words',()=>{
 const h=harness();const t=h.$('mb-rightnow').textContent;assert(/Need it simpler right now\?/.test(t));assert(/says nothing about you and is not saved/.test(t));
 assert.deepEqual(['low','start','big','perfect'].map(k=>h.$('mb-rightnow-'+k).textContent),['I have no energy','I do not know where to start','This feels too big','I want it to be perfect']);
 assert.equal(h.$('mb-rightnow-result').textContent,'');assert.equal(h.$('mb-rightnow-back').hidden,true);assert.equal(h.simplifyCalls.length+h.timerCalls.length,0,'nothing happens until a choice');
});
test('low energy: a simpler view for now and a 2-minute timer that is opened but not started; explained; not saved; reversible',()=>{
 const h=harness();h.$('mb-rightnow-low').click();
 assert.deepEqual(h.simplifyCalls,[true]);assert.deepEqual(h.timerCalls,[2]);assert(h.log.includes('click:mb-tab-timer'));assert(!h.log.some(x=>/start|toggleTimer/i.test(x)),'the timer is not started');
 const r=h.$('mb-rightnow-result').textContent;assert(/Suggested because you chose “I have no energy”/.test(r)&&/2 minutes/.test(r)&&/only if you want to/.test(r));
 assert.equal(h.$('mb-rightnow-low').attrs['aria-pressed'],'true');assert.equal(h.$('mb-rightnow-back').hidden,false);assert.equal(h.store.size,0,'nothing is written to storage');
 h.$('mb-rightnow-back').click();assert.deepEqual(h.simplifyCalls,[true,false]);assert.deepEqual(h.timerCalls,[2,'restore']);assert.equal(h.$('mb-rightnow-result').textContent,'');assert(/Nothing was saved/.test(h.$('mb-welcome-status').textContent));assert.equal(h.$('mb-rightnow-low').attrs['aria-pressed'],'false');
});
test('a simpler view the person already chose is left alone, in both directions',()=>{
 const h=harness({simplifyOn:true});h.$('mb-rightnow-low').click();assert.equal(h.simplifyCalls.length,0);h.$('mb-rightnow-back').click();assert.equal(h.simplifyCalls.length,0);assert.equal(h.state().simplify,true);
});
test('a running timer is never changed, and going back does not touch it either',()=>{
 const h=harness({timerRunning:true});h.$('mb-rightnow-low').click();assert.equal(h.timerCalls.length,0);h.$('mb-rightnow-back').click();assert.equal(h.timerCalls.length,0);
});
test('choosing another sentence first undoes the previous suggestion',()=>{
 const h=harness();h.$('mb-rightnow-low').click();h.$('mb-rightnow-perfect').click();
 assert.deepEqual(h.simplifyCalls,[true,false],'simpler view reverted');assert.deepEqual(h.timerCalls,[2,'restore',5]);assert(/rough first pass for 5 minutes/.test(h.$('mb-rightnow-result').textContent)&&/does not have to be good/.test(h.$('mb-rightnow-result').textContent));
 assert.equal(h.$('mb-rightnow-low').attrs['aria-pressed'],'false');assert.equal(h.$('mb-rightnow-perfect').attrs['aria-pressed'],'true');
});
test('"do not know where to start" and "too big" change nothing and open Begin',()=>{
 for(const key of ['start','big']){const h=harness();h.$('mb-rightnow-'+key).click();assert.equal(h.simplifyCalls.length+h.timerCalls.length,0);assert(h.log.includes('click:mb-tab-focus'));assert(/^Suggested because you chose/.test(h.$('mb-rightnow-result').textContent));}
});
test('account change clears the moment and reverts what it changed',()=>{
 const h=harness();h.$('mb-rightnow-low').click();h.handlers['mb:account-changed']();assert.deepEqual(h.simplifyCalls,[true,false]);assert.equal(h.$('mb-rightnow-result').textContent,'');assert.equal(h.$('mb-rightnow-back').hidden,true);
});
test('all four languages: labels, results and the selection survive a language change',()=>{
 const h=harness();h.$('mb-rightnow-start').click();
 h.ctx.curLang='tr';h.ctx.applyI18n();assert.equal(h.$('mb-rightnow-start').textContent,'Nereden başlayacağımı bilmiyorum');assert(/dediğin için öneriyoruz/.test(h.$('mb-rightnow-result').textContent));assert.equal(h.$('mb-rightnow-start').attrs['aria-pressed'],'true');
 h.ctx.curLang='de';h.ctx.applyI18n();assert(/Vorgeschlagen, weil du/.test(h.$('mb-rightnow-result').textContent));assert.equal(h.$('mb-welcome-skip').textContent,'Vorerst überspringen');
 h.ctx.curLang='es';h.ctx.applyI18n();assert(/Sugerido porque elegiste/.test(h.$('mb-rightnow-result').textContent));assert.equal(h.$('mb-welcome-hide').textContent,'No volver a mostrar');
});
console.log(checks+' welcome checks passed.');
