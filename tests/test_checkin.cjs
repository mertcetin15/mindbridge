const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness(){const nodes=new Map(),events={};let doc;class E{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.style={};this.handlers={};this.textContent='';const classes=new Set();this.classList={toggle(k,v){v?classes.add(k):classes.delete(k);},contains:k=>classes.has(k)};}
 set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}append(...n){this.children.push(...n);}before(n){this.beforeNode=n;}after(n){this.afterNode=n;}replaceChildren(...n){this.children=n;}addEventListener(k,f){this.handlers[k]=f;}click(){if(!this.disabled)this.handlers.click?.({type:'click'});}focus(){doc.activeElement=this;}scrollIntoView(){this.scrolled=true;}closest(){return this;}
 querySelectorAll(s){return this.children.flatMap(c=>[...(s.split(',').includes(c.tag)?[c]:[]),...c.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
 }
 for(const id of ['quiz-dots','q-opts','btn-next','q-text','q-nav-label','quiz-main','quiz-result','q-counter','q-hint','quiz-track','mb-planner','mb-focus-plan']){const n=new E();n.id=id;}
 const header=new E('h1'),intro=new E('p'),badge=new E('div'),tool=new E('section');
 doc={documentElement:{lang:'en'},activeElement:null,getElementById:id=>nodes.get(id),createElement:t=>new E(t),querySelector:s=>s==='#page-quiz h1'?header:s==='#page-quiz .sub-q'?intro:s==='#page-quiz .sec-eyebrow'?badge:tool};
 const ctx={document:doc,applyI18n(){},showPage(id){ctx.page=id;},addEventListener:(k,f)=>events[k]=f};ctx.window=ctx;vm.runInNewContext(fs.readFileSync('frontend/checkin.js','utf8'),ctx);
 return {ctx,nodes,doc,events,header,tool,choose:i=>nodes.get('q-opts').children[i].click(),next:()=>nodes.get('btn-next').click(),skip:()=>nodes.get('mb-check-skip').click(),text:n=>[n.textContent,...n.children.map(c=>JSON.stringify(c.textContent))].join(' ')};
}
const h=harness(),$=id=>h.nodes.get(id);
test('starts with five-step progress and disabled next until selection',()=>{assert.equal($('btn-next').disabled,true);assert($('q-counter').textContent.startsWith('01 / 05'));h.ctx.nextQ();assert($('q-counter').textContent.startsWith('01'));});
h.choose(2);test('selection is announced and exposes pressed state',()=>{assert.equal($('q-opts').children[2].attrs['aria-pressed'],'true');assert(!$('btn-next').disabled);});
h.next();h.choose(1);$('mb-check-back').click();
test('back navigation retains the chosen answer',()=>assert.equal($('q-opts').children[2].attrs['aria-pressed'],'true'));
h.doc.documentElement.lang='tr';h.ctx.applyI18n();h.ctx.initQuiz();
test('language changes and returning to the quiz preserve progress',()=>{assert.equal(h.header.textContent,'Bugün neye ihtiyacın var?');assert.equal($('q-opts').children[2].attrs['aria-pressed'],'true');});
h.choose(0);h.next();h.choose(3);h.next();h.choose(2);h.next();h.skip();h.choose(3);h.next();
test('results show at most two explicitly selected needs without a score',()=>{const recs=$('quiz-result').querySelectorAll('article');assert.equal(recs.length,2);assert.equal(recs[0].children[0].textContent,'Odak');assert.equal(recs[1].children[0].textContent,'Mola');assert.equal($('quiz-main').style.display,'none');assert.equal(h.doc.activeElement.id,'mb-check-result-title');});
$('quiz-result').querySelectorAll('article')[0].querySelector('button').click();
test('recommendation opens the real focus tool without starting it',()=>{assert.equal(h.ctx.page,'tools');assert($('mb-focus-plan').scrolled);});
const edit=$('quiz-result').querySelectorAll('button').find(b=>b.textContent==='Değiştir');edit.click();
test('result review can return to edit a specific answer',()=>{assert.equal($('quiz-main').style.display,'block');assert($('q-counter').textContent.startsWith('01'));assert.equal($('q-opts').children[0].attrs['aria-pressed'],'true');});
h.events.pagehide();test('page exit clears in-memory answers',()=>{assert($('btn-next').disabled);assert($('q-counter').textContent.startsWith('01'));});
const skipped=harness();for(let i=0;i<5;i++)skipped.skip();
test('skipping every question produces no invented personal recommendations',()=>{const result=skipped.nodes.get('quiz-result');assert.equal(result.querySelectorAll('article').length,0);assert(result.querySelector('p').textContent.includes('did not infer'));});
const restart=skipped.nodes.get('quiz-result').querySelectorAll('button').find(b=>b.textContent==='Clear answers and restart');restart.click();
test('explicit restart clears the result and returns to question one',()=>{assert.equal(skipped.nodes.get('quiz-result').style.display,'none');assert(skipped.nodes.get('btn-next').disabled);assert.equal(skipped.nodes.get('quiz-result').children.length,0);});
console.log(`${checks} self-check behavior checks passed; harness provides no network or storage APIs.`);

const deep=harness();deep.nodes.get('mb-check-deep').click();
test('full reflection uses eight questions and preserves quick answers on mode change',()=>{assert(deep.nodes.get('q-counter').textContent.startsWith('01 / 08'));deep.choose(3);deep.nodes.get('mb-check-quick').click();assert.equal(deep.nodes.get('q-opts').children[3].attrs['aria-pressed'],'true');deep.nodes.get('mb-check-deep').click();});
for(let i=0;i<8;i++){deep.choose(i===7?3:1);deep.next();}
test('expanded needs use actual support route and editable action plan',()=>{const area=deep.nodes.get('mb-check-area');assert.equal(area.value,'7');assert.equal(area.children.length,8);const card=deep.nodes.get('quiz-result');card.querySelectorAll('article')[0].querySelector('button').click();assert.equal(deep.ctx.page,'contact');area.value='6';area.handlers.change();const time=deep.nodes.get('mb-check-time');time.value='10';time.handlers.change();const go=card.querySelectorAll('button').find(b=>b.textContent==='Open the tool for this step');go.click();assert.equal(deep.ctx.page,'tools');assert(deep.tool.scrolled);});
deep.events['mb:account-changed']();test('account changes remove reflection results and reset answers',()=>{assert(deep.nodes.get('btn-next').disabled);assert.equal(deep.nodes.get('quiz-result').children.length,0);});
const allskip=harness();allskip.nodes.get('mb-check-deep').click();for(let i=0;i<8;i++)allskip.skip();test('eight skipped answers produce no inferred plan',()=>{assert(!allskip.nodes.has('mb-check-area'));});
