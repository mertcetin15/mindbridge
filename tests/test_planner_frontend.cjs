const assert=require('assert'),fs=require('fs'),vm=require('vm'),Core=require('../frontend/planner-core.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
const task=(id,minutes,extra={})=>({id,title:'Task '+id,step:'First step',minutes,priority:'normal',due:'',done:false,...extra});
test('time fit beats an oversized task',()=>assert.equal(Core.recommend([task('a',60,{priority:'important'}),task('b',15)],20,'2026-10-13').task.id,'b'));
test('large task becomes an explicitly partial block',()=>{const r=Core.recommend([task('a',60)],20,'2026-10-13');assert(r.partial);assert.equal(r.minutes,20);});
test('future and completed tasks are excluded',()=>assert.equal(Core.recommend([task('a',5,{due:'2026-10-14'}),task('b',5,{done:true})],20,'2026-10-13'),null));
test('a passed day is stated plainly, only for open tasks, never for today or undated work',()=>{
 const T='2026-10-13';assert.equal(Core.passed(task('a',5,{due:'2026-10-12'}),T),true);
 assert.equal(Core.passed(task('a',5,{due:T}),T),false);assert.equal(Core.passed(task('a',5),T),false);
 assert.equal(Core.passed(task('a',5,{due:'2026-10-12',done:true}),T),false);assert.equal(Core.passed(task('a',5,{due:'2026-10-12',status:'abandoned'}),T),false);
});
test('carried work is prioritized among tasks that fit',()=>assert.equal(Core.recommend([task('a',15,{priority:'important'}),task('b',15,{due:'2026-10-12'})],25,'2026-10-13').task.id,'b'));
test('invalid budget produces no suggestion',()=>assert.equal(Core.recommend([task('a',5)],0,'2026-10-13'),null));
test('corrupt records and impossible dates are rejected',()=>{assert(!Core.valid([task('a',5,{due:'2026-02-30'})]));assert(!Core.valid([task('a',5),task('a',5)]));assert(!Core.valid({}));});
test('tomorrow crosses month and year boundaries',()=>assert.equal(Core.nextDay(new Date(2026,11,31,23)),'2027-01-01'));
function harness(initial=null){
 let created=0;const nodes=new Map(),listeners={},store=new Map();if(initial!==null)store.set('mindbridge.planner.v1',initial);
 let seq=0,failWrite=false,fetcher=async()=>({ok:true,json:async()=>({user:null,csrf:null})});
 class E{
  constructor(tag){created++;this.tag=tag;this.children=[];this.dataset={};this.value='';this.attrs={};this.handlers={};}
  set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}
  get options(){return this.children;}append(...items){this.children.push(...items);}before(){}replaceChildren(...items){this.children=items;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,fn){this.handlers[k]=fn;}focus(){}scrollIntoView(){}reportValidity(){return true;}click(){return this.handlers.click?.();}
  querySelectorAll(selector){const all=[];const walk=e=>{for(const c of e.children){if(selector==='[data-copy]'?c.dataset.copy:selector.split(',').includes(c.tag))all.push(c);walk(c);}};walk(this);return all;}
 }
 const focus=new E('section');focus.id='mb-focus-plan';const hero=new E('div');
 const ctx={console,MBPlannerCore:Core,curLang:'en',document:{createElement:t=>new E(t),getElementById:id=>nodes.get(id),querySelector:()=>hero},location:{protocol:'file:'},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('quota');store.set(k,v);}},crypto:{randomUUID:()=>`id-${++seq}`},AbortController,Blob,URL,Date,setTimeout:()=>1,clearTimeout(){},fetch:(...args)=>fetcher(...args),addEventListener:(k,fn)=>listeners[k]=fn,applyI18n(){},showPage(){},confirm:()=>true,mbStartPlannerTask:()=>true};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('frontend/planner.js','utf8'),ctx);
 return {ctx,nodes,listeners,store,created:()=>created,fail:()=>failWrite=true,fetch:f=>fetcher=f,click:(id)=>nodes.get(id).click(),submit:()=>nodes.get('mb-planner-form').handlers.submit({preventDefault(){}})};
}
async function settle(){for(let i=0;i<50;i++)await Promise.resolve();}
(async()=>{
 const h=harness();await settle();h.nodes.get('mb-task-task').value='<img onerror=evil()> An actual task';h.nodes.get('mb-task-step').value='Write email';h.nodes.get('mb-task-minutes').value='15';h.nodes.get('mb-task-priority').value='normal';h.submit();await settle();
 test('guest task is really saved and draft clears after success',()=>{assert.equal(JSON.parse(h.store.get('mindbridge.planner.v1')).length,1);assert.equal(h.nodes.get('mb-task-task').value,'');});
 test('resume snapshot is a copy of the current ready task',()=>{const r=h.ctx.mbResumePlan();assert(r.available);assert.equal(r.task.step,'Write email');r.task.step='Mutated';assert.equal(h.ctx.mbResumePlan().task.step,'Write email');});
 test('user title is rendered as plain text',()=>assert.equal(h.nodes.get('mb-planner-suggestion').children[1].textContent,'<img onerror=evil()> An actual task'));
 const again=harness(h.store.get('mindbridge.planner.v1'));await settle();test('guest plan survives reload',()=>assert(again.nodes.get('mb-planner-summary').textContent.includes('1')));
 h.fail();h.nodes.get('mb-task-task').value='Keep this failed draft';h.submit();await settle();test('storage failure preserves draft and old task',()=>{assert.equal(h.nodes.get('mb-task-task').value,'Keep this failed draft');assert.equal(JSON.parse(h.store.get('mindbridge.planner.v1')).length,1);});
 const broken=harness('{broken');await settle();test('corrupt local plan is never overwritten',()=>{assert(broken.nodes.get('mb-task-save').disabled);assert.equal(broken.store.get('mindbridge.planner.v1'),'{broken');});
 again.ctx.mbStartPlannerTask=()=>false;again.nodes.get('mb-planner-suggestion').children.at(-1).click();test('active focus plan cannot be overwritten',()=>assert(again.nodes.get('mb-planner-status').textContent.includes('existing focus')));
 again.listeners.storage({key:'mindbridge.planner.v1'});test('another tab invalidates stale local edits',()=>assert(again.nodes.get('mb-task-save').disabled));test('conflicted plan exposes no resume task',()=>{assert.equal(again.ctx.mbResumePlan().available,false);assert.equal(again.ctx.mbResumePlan().task,null);});
 const account=harness();await settle();account.ctx.location.protocol='http:';account.fetch(async path=>({ok:true,json:async()=>path==='/api/auth/me'?{user:{id:'owner'},csrf:'token'}:{user_id:'owner',revision:0,tasks:[]}}));account.listeners['mb:account-changed']();await settle();account.nodes.get('mb-task-task').value='Account draft';account.nodes.get('mb-task-priority').value='normal';
 account.fetch(async()=>({ok:false,json:async()=>({error:{code:'planner_conflict'}})}));account.submit();await settle();test('server revision conflict preserves draft and blocks overwrite',()=>{assert.equal(account.nodes.get('mb-task-task').value,'Account draft');assert(account.nodes.get('mb-task-save').disabled);});
 account.listeners['mb:account-changed']();test('account change immediately clears private planner draft',()=>assert.equal(account.nodes.get('mb-task-task').value,''));

 const saved=h=>JSON.parse(h.store.get('mindbridge.planner.v1'));
 const clickAction=(h,id,key)=>{const card=h.nodes.get('mb-planner-groups').querySelectorAll('article').find(n=>n.dataset.taskId===id);assert(card, 'task must be visible');card.querySelectorAll('button').find(b=>b.dataset.copy===key).click();};
 const extra=harness(JSON.stringify([task('original',15,{title:'Read lecture notes',step:'Review chapter two',done:true})]));await settle();
 clickAction(extra,'original','repeat');await settle();
 test('copy for tomorrow preserves original and resets completion on a fresh ID',()=>{const list=saved(extra);assert.equal(list.length,2);assert(list[0].done);assert(!list[1].done);assert.notEqual(list[0].id,list[1].id);assert.equal(list[1].due,Core.nextDay());assert.equal(list[1].step,list[0].step);});
 clickAction(extra,'original','remove');await settle();
 test('successful deletion offers undo',()=>{assert.equal(saved(extra).length,1);assert(!extra.nodes.get('mb-planner-undo').hidden);});
 extra.click('mb-planner-undo');await settle();
 test('undo restores original task data and position',()=>{assert.equal(saved(extra)[0].id,'original');assert(saved(extra)[0].done);assert(extra.nodes.get('mb-planner-undo').hidden);});
 clickAction(extra,'original','remove');await settle();clickAction(extra,saved(extra)[0].id,'done');await settle();
 test('a later mutation invalidates undo instead of overwriting newer work',()=>assert(extra.nodes.get('mb-planner-undo').hidden));
 const find=harness(JSON.stringify([task('a',10,{title:'Email professor',step:'Write the greeting'}),task('b',20,{title:'Math exercises'})]));await settle();
 find.nodes.get('mb-planner-search').value='greeting';find.nodes.get('mb-planner-search').handlers.input();
 test('task search includes next steps without changing saved tasks',()=>{assert.equal(find.nodes.get('mb-planner-groups').querySelectorAll('article').filter(n=>!n.hidden).length,1);assert.equal(saved(find).length,2);});
 find.nodes.get('mb-planner-search').value='absent';find.nodes.get('mb-planner-search').handlers.input();
 test('empty search result has explicit feedback',()=>assert.equal(find.nodes.get('mb-planner-search-status').textContent,'No tasks match your search.'));
 find.nodes.get('mb-planner-search').value='';find.nodes.get('mb-planner-search').handlers.input();clickAction(find,'a','edit');clickAction(find,'a','remove');await settle();
 test('deleting the edited task exits editing rather than leaving a stale task ID',()=>{assert(find.nodes.get('mb-task-cancel').hidden);assert.equal(find.nodes.get('mb-task-task').value,'');});
 find.listeners['mb:account-changed']();await settle();
 test('account transition clears undo history and task search',()=>{assert(find.nodes.get('mb-planner-undo').hidden);assert.equal(find.nodes.get('mb-planner-search').value,'');});
 const clearing=harness(JSON.stringify([task('a',10)]));await settle();clearing.store.clear();clearing.listeners.storage({key:null});
 test('storage clear in another tab blocks stale plan writes',()=>assert(clearing.nodes.get('mb-task-save').disabled));
 const invalid=harness();await settle();invalid.nodes.get('mb-task-task').value='   ';invalid.nodes.get('mb-task-priority').value='normal';invalid.submit();await settle();
 test('whitespace title produces validation feedback instead of a task-limit error',()=>{assert(invalid.nodes.get('mb-planner-status').textContent.startsWith('Check the task'));assert.equal(invalid.store.size,0);});
 const failed=harness(JSON.stringify([task('a',10)]));await settle();failed.fail();clickAction(failed,'a','remove');await settle();
 test('failed deletion preserves data and never offers a fake undo',()=>{assert.equal(saved(failed).length,1);assert(failed.nodes.get('mb-planner-undo').hidden);});
 const malformed=harness();await settle();malformed.ctx.location.protocol='http:';malformed.fetch(async path=>({ok:true,json:async()=>path==='/api/auth/me'?{user:{id:'owner'},csrf:'token'}:{user_id:'owner',revision:0,tasks:[]}}));malformed.listeners['mb:account-changed']();await settle();malformed.nodes.get('mb-task-task').value='Preserve draft';malformed.nodes.get('mb-task-priority').value='normal';malformed.fetch(async()=>({ok:true,json:async()=>({user_id:'owner',revision:1,tasks:'invalid'})}));malformed.submit();await settle();
 test('malformed successful server response preserves draft and reports failure',()=>{assert.equal(malformed.nodes.get('mb-task-task').value,'Preserve draft');assert(malformed.nodes.get('mb-planner-status').textContent.startsWith('Could not save'));});

 const large=harness(JSON.stringify(Array.from({length:100},(_,i)=>task('task-'+i,10,{title:'Read chapter '+i}))));await settle();
 test('task action buttons are labeled on the first render',()=>{for(const b of large.nodes.get('mb-planner-groups').querySelectorAll('button'))assert(b.textContent?.length);});
 const originalRows=large.nodes.get('mb-planner-groups').querySelectorAll('article'),before=large.created();
 for(const value of ['R','Re','Read','Read chapter 99']){large.nodes.get('mb-planner-search').value=value;large.nodes.get('mb-planner-search').handlers.input();}
 test('searching 100 tasks creates zero additional DOM nodes',()=>{assert.equal(large.created()-before,0);assert.equal(originalRows.filter(n=>!n.hidden).length,1);});
 large.nodes.get('mb-planner-budget').value='5';large.nodes.get('mb-planner-budget').handlers.input();
 test('changing time budget preserves existing task rows',()=>assert.deepEqual(large.nodes.get('mb-planner-groups').querySelectorAll('article'),originalRows));
 const beforeFocus=large.created();large.listeners.focus();
 test('window refocus on the same day does not rebuild the planner',()=>assert.equal(large.created(),beforeFocus));
 console.log(`${count} planner checks passed.`);
})().catch(e=>{console.error(e);process.exit(1);});
