const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const nodes=new Map(),listeners={};let timerState='idle',saves=0;
class E{constructor(){this.children=[];this.attrs={};this.value='';this.textContent='';this.style={};this.classList={};}set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}append(...n){this.children.push(...n);}before(){}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}addEventListener(k,f){this[k]=f;}closest(){return {scrollIntoView(){}};}focus(){}}
for(const id of ['timer-btn','timer-minutes','journal-input','mb-timer-reset']){const n=new E();n.id=id;}
const ctx={curLang:'en',document:{getElementById:id=>nodes.get(id),createElement:()=>new E(),querySelector:()=>new E()},applyI18n(){},saveJournal(){saves++;},addEventListener:(type,fn)=>listeners[type]=fn,setTimerFromInput(){},toggleTimer(){state(timerState==='running'?'paused':'running');}};ctx.window=ctx;
function state(s){timerState=s;nodes.get('timer-btn').attrs['aria-pressed']=String(s==='running');listeners['mb:focus-state']?.({detail:{state:s}});}
nodes.get('mb-timer-reset').click=()=>state('idle');state('idle');vm.createContext(ctx);vm.runInContext(fs.readFileSync('frontend/focus.js','utf8'),ctx);
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const submit=()=>nodes.get('mb-focus-form').submit({preventDefault(){}});
check('empty plan cannot start timer',()=>{submit();assert.equal(timerState,'idle');});
nodes.get('mb-focus-goal').value='Write paragraph';nodes.get('mb-focus-step').value='Open document';nodes.get('mb-focus-minutes').value='1.5';
check('fractional duration rejected',()=>{submit();assert.equal(timerState,'idle');});
nodes.get('mb-focus-minutes').value='25';state('running');
check('another active timer is not overwritten',()=>{submit();assert(nodes.get('mb-focus-status').textContent.includes('Another'));});
state('idle');submit();
check('valid goal starts existing timer with selected duration',()=>{assert.equal(timerState,'running');assert.equal(nodes.get('timer-minutes').value,'25');assert(nodes.get('mb-focus-goal').disabled);});
submit();check('plan button pauses timer',()=>assert.equal(timerState,'paused'));
submit();check('plan button resumes timer',()=>assert.equal(timerState,'running'));
state('complete');check('completion asks for outcome; does not assume success',()=>{assert(!nodes.get('mb-focus-review').hidden);assert(nodes.get('mb-focus-transfer').disabled);assert.equal(saves,0);});
nodes.get('mb-focus-transfer').click();check('unselected outcome cannot generate journal draft',()=>assert.equal(nodes.get('journal-input').value,''));
nodes.get('mb-focus-partial').click();nodes.get('mb-focus-note').value='Distracted';nodes.get('journal-input').value='My existing draft';nodes.get('mb-focus-transfer').click();
check('journal transfer preserves existing draft and labels outcome',()=>{const value=nodes.get('journal-input').value;assert(value.startsWith('My existing draft\n\n'));assert(value.includes('I made some progress.'));assert(value.includes('Write paragraph'));assert.equal(saves,0);});
const original=nodes.get('journal-input').value;nodes.get('mb-focus-transfer').click();check('duplicate transfer is suppressed',()=>assert.equal(nodes.get('journal-input').value,original));
ctx.curLang='tr';ctx.applyI18n();check('language switch preserves chosen outcome',()=>{assert.equal(nodes.get('mb-focus-partial').attrs['aria-pressed'],'true');assert(nodes.get('mb-focus-transfer').textContent.includes('günlük'));});
submit();state('complete');nodes.get('mb-focus-done').click();nodes.get('journal-input').value='x'.repeat(9999);nodes.get('mb-focus-transfer').click();
check('full journal is not overwritten',()=>{assert.equal(nodes.get('journal-input').value.length,9999);assert(nodes.get('mb-focus-status').textContent.includes('yer yok'));});
submit();state('paused');listeners['mb:account-changed']();check('account change clears private plan and stops owned timer',()=>{assert.equal(nodes.get('mb-focus-goal').value,'');assert.equal(timerState,'idle');assert(nodes.get('mb-focus-review').hidden);});
nodes.get('mb-focus-form').requestSubmit=submit;
check('planner task opens a real focus session with the chosen block',()=>{assert(ctx.mbStartPlannerTask({title:'Send email',step:'Write greeting'},15));assert.equal(timerState,'running');assert.equal(nodes.get('timer-minutes').value,'15');assert.equal(nodes.get('mb-focus-goal').value,'Send email');});
check('planner cannot replace a running or paused session',()=>{assert(!ctx.mbStartPlannerTask({title:'Other',step:''},10));submit();assert(!ctx.mbStartPlannerTask({title:'Other',step:''},10));assert.equal(nodes.get('mb-focus-goal').value,'Send email');});
submit();state('complete');check('planner preserves the pending focus review',()=>assert(!ctx.mbStartPlannerTask({title:'Other',step:''},10)));
console.log(checks+' focus workflow checks passed; all scripts parse.');
(()=>{ // Gentle completion (UX-08): three outcomes in the person's words, a hint per outcome, and a continue button that only a click can use.
 const src=require('fs').readFileSync('frontend/focus.js','utf8');
 for(const phrase of ['I completed it.','I made some progress.','I couldn’t do it yet.','Keep going for 5 more minutes'])if(!src.includes(phrase))throw new Error('missing copy: '+phrase);
 for(const key of ['hintDone','hintPartial','hintNotDone','more']){const n=(src.match(new RegExp(key+":'",'g'))||[]).length;if(n!==4)throw new Error(key+' is in '+n+' languages');}
 if(/Streak|score|great job|well done|amazing|congrat/i.test(src.replace(/\/\*[\s\S]*?\*\//g,'')))throw new Error('celebratory or grading wording');
 const clickOnly=src.match(/more\.addEventListener\('click'/g);if(!clickOnly||clickOnly.length!==1)throw new Error('continue must start only from its own click');
 if(/phase='review'[^;]*toggleTimer\(\)/.test(src))throw new Error('review must not start a timer');
 console.log('PASS gentle completion copy, hints in four languages, no celebration wording, continue only on click');
})();
