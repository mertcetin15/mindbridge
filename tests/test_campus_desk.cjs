const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness(){const nodes=new Map(),events={},animations=[];let doc,allow=true,calls=[];class E{
 constructor(tag='div',cls=''){this.tag=tag;this.className=cls;this.children=[];this.attrs={};this.dataset={};this.handlers={};this.value='';this.style={};this.textContent='';this.classList={contains:k=>this.className.split(' ').includes(k)};}
 set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}get options(){return this.children;}append(...n){this.children.push(...n);}before(n){this.previous=n;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.handlers[k]=f;}click(){if(!this.disabled)this.handlers.click?.();}focus(){doc.activeElement=this;}scrollIntoView(){this.scrolled=true;}querySelector(s){return this.children.find(c=>s.split(',').includes(c.tag)||c.className===s.slice(1));}animate(){const a={cancelled:false,cancel(){this.cancelled=true;}};animations.push(a);return a;}
 }
 function node(tag,id,cls=''){const n=new E(tag,cls);if(id)n.id=id;return n;}
 const home=node('div','page-home');home.append(node('section','','mb-campus-intro'));node('button','mb-campus-motion');node('textarea','journal-input');for(const id of ['mb-focus-plan','mb-planner']){const n=node('section',id);n.append(node('h2'));}
 doc={documentElement:{lang:'en'},hidden:false,getElementById:id=>nodes.get(id),createElement:t=>new E(t),addEventListener:(k,f)=>events[k]=f};const reduced={matches:false,addEventListener(k,f){this.change=f;}};
 const ctx={document:doc,matchMedia:()=>reduced,showPage(id){ctx.page=id;},applyI18n(){},addEventListener:(k,f)=>events[k]=f,mbStartPlannerTask:(task,duration)=>{calls.push({task,duration});return allow;}};ctx.window=ctx;vm.runInNewContext(fs.readFileSync('frontend/campus-desk.js','utf8'),ctx);
 return {ctx,doc,nodes,events,animations,reduced,home,calls,allow:v=>allow=v,submit:()=>nodes.get('mb-desk-focus-form').handlers.submit({preventDefault(){}})};
}
const h=harness(),$=id=>h.nodes.get(id);
test('return point shows a loading-safe plan action without exposing a draft',()=>{assert($('mb-resume-plan').children[0].textContent.includes('Check'));assert($('mb-resume-journal').hidden);});
h.ctx.mbResumePlan=()=>({available:true,task:{title:'Essay',step:'Write opening'}});h.ctx.mbRefreshResume();
test('return point uses the current plan next step',()=>{assert.equal($('mb-resume-plan').children[0].textContent,'Essay');assert.equal($('mb-resume-plan').children[1].textContent,'Write opening');});
$('journal-input').value='Keep my personal draft';h.ctx.showPage('home');
test('journal resume shows presence but never the private text',()=>{assert(!$('mb-resume-journal').hidden);assert(!$('mb-resume-journal').children.some(n=>n.textContent.includes('Keep my personal draft')));});
$('mb-resume-journal-open').click();
test('resume opens and focuses the actual journal without changing it',()=>{assert.equal(h.ctx.page,'tools');assert.equal($('journal-input').value,'Keep my personal draft');assert.equal(h.doc.activeElement,$('journal-input'));assert.equal(h.calls.length,0);});
h.ctx.mbResumeFocus=()=>({phase:'paused',goal:'Current goal',step:'Next step'});h.ctx.mbRefreshResume();
test('existing focus takes priority without starting or replacing it',()=>{assert(!$('mb-resume-focus').hidden);assert($('mb-resume-plan').hidden);$('mb-resume-focus-open').click();assert.equal(h.calls.length,0);assert.equal(h.doc.activeElement,$('mb-focus-plan').children[0]);});
h.ctx.mbResumeFocus=()=>null;h.ctx.mbResumePlan=()=>({available:false,task:null});h.ctx.mbRefreshResume();
test('unavailable or switched account state removes old task content',()=>{assert($('mb-resume-focus').hidden);assert.equal($('mb-resume-focus').children[0].textContent,'');assert(!$('mb-resume-plan').children[0].textContent.includes('Essay'));});
const question=$('mb-desk-question').textContent;$('mb-desk-use').click();
test('prompt is appended without overwriting or automatically saving',()=>assert.equal($('journal-input').value,'Keep my personal draft\n\n'+question+'\n\n'));
const once=$('journal-input').value;$('mb-desk-use').click();
test('reusing the same prompt does not duplicate it',()=>{assert.equal($('journal-input').value,once);assert(!$('mb-desk-journal-return').hidden);});
$('journal-input').value='x'.repeat(9999);$('mb-desk-flip').click();$('mb-desk-use').click();
test('oversized prompt transfer preserves the existing journal',()=>{assert.equal($('journal-input').value.length,9999);assert($('mb-desk-journal-status').textContent.includes('too long'));});
for(let i=0;i<5;i++)$('mb-desk-flip').click();
test('six prompt cards wrap predictably',()=>assert.equal($('mb-desk-question').textContent,question));
$('journal-input').value='Do not lose this draft';
$('mb-desk-tone-easy').click();const easy=new Set();for(let i=0;i<4;i++){easy.add($('mb-desk-question').textContent);$('mb-desk-flip').click();}
test('low-effort style cycles only its own two prompts and leaves the draft untouched',()=>{assert.equal(easy.size,2);assert.equal($('journal-input').value,'Do not lose this draft');assert.equal($('mb-desk-tone-easy').attrs['aria-pressed'],'true');assert.equal($('mb-desk-tone-all').attrs['aria-pressed'],'false');});
$('mb-desk-tone-none').click();
test('"No prompt" hides the card, says writing freely is fine and keeps the draft',()=>{assert($('mb-desk-use').hidden&&$('mb-desk-flip').hidden);assert(/No prompt/.test($('mb-desk-journal-status').textContent));assert.equal($('mb-desk-tone-none').attrs['aria-pressed'],'true');assert.equal($('mb-desk-tone-easy').attrs['aria-pressed'],'false');assert.equal($('journal-input').value,'Do not lose this draft');});
$('mb-desk-tone-reflective').click();
test('choosing a style again brings prompts back, still without touching the draft',()=>{assert(!$('mb-desk-use').hidden&&!$('mb-desk-flip').hidden);assert.equal($('mb-desk-journal-status').textContent,'');assert.equal($('journal-input').value,'Do not lose this draft');});
$('mb-desk-goal').value='   ';h.submit();
test('blank quick focus is rejected without starting a timer',()=>assert.equal(h.calls.length,0));
$('mb-desk-goal').value='Write the opening sentence';h.allow(false);h.submit();
test('active-session rejection preserves the new goal and offers a return',()=>{assert.equal($('mb-desk-goal').value,'Write the opening sentence');assert(!$('mb-desk-focus-return').hidden);});
h.allow(true);h.submit();
test('valid quick focus starts the existing bridge then focuses its real panel',()=>{assert.equal(h.calls.at(-1).duration,10);assert.equal(h.calls.at(-1).task.step,'Write the opening sentence');assert.equal($('mb-desk-goal').value,'');assert.equal(h.doc.activeElement,$('mb-focus-plan').children[0]);});
$('mb-desk-goal').value='Preserve goal';$('mb-desk-minutes').value='15';h.doc.documentElement.lang='tr';h.ctx.applyI18n();
test('language changes retain selected duration and unsent goal',()=>{assert.equal($('mb-desk-goal').value,'Preserve goal');assert.equal($('mb-desk-minutes').value,'15');assert.equal($('mb-resume').children[1].textContent,'Kaldığın yerden.');});
h.reduced.matches=true;h.reduced.change();const before=h.animations.length;$('mb-desk-flip').click();
test('reduced motion cancels an active flip and suppresses new animation',()=>{assert(h.animations.every(a=>a.cancelled));assert.equal(h.animations.length,before);});
h.events['mb:account-changed']();
test('account changes clear quick-focus drafts and feedback',()=>{assert.equal($('mb-desk-goal').value,'');assert.equal($('mb-desk-focus-status').textContent,'');assert.equal($('mb-desk-journal-status').textContent,'');});
h.reduced.matches=false;h.home.className='';$('mb-desk-flip').click();h.home.className='mb-motion-off';$('mb-campus-motion').click();const pausedCount=h.animations.length;$('mb-desk-flip').click();
test('the main campus pause control also stops and suppresses card flips',()=>{assert(h.animations.every(a=>a.cancelled));assert.equal(h.animations.length,pausedCount);});
$('mb-desk-goal').value='Private draft';h.events.pagehide();
test('page exit clears the private quick-focus draft',()=>assert.equal($('mb-desk-goal').value,''));
console.log(`${checks} campus desk checks passed; no network/storage/save APIs are available in the harness.`);
