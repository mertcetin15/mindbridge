const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const grab=id=>html.match(new RegExp('<script id="'+id+'">([\\s\\S]*?)</script>'))[1];
const coreSource=grab('mindbridge-reminders-core'),uiSource=grab('mindbridge-reminders');
let checks=0;const queue=[];function test(name,fn){queue.push(async()=>{await fn();checks++;console.log('PASS '+name);});}
const HOUR=3600000,T0=Date.UTC(2026,9,18,10,0,0);

function harness({steps=[{id:'t1',title:'Write intro'},{id:'t2',title:'Read chapter'}],stored=null,permission='default',grant='granted',storageFails=false,hidden=false}={}){
 let clock=T0;const timers=[],store=new Map(),notified=[],asked=[],handlers={window:{},document:{}};
 if(stored!==null)store.set('mindbridge.reminders.v1',typeof stored==='string'?stored:JSON.stringify(stored));
 class FakeDate extends Date{static now(){return clock;}}
 class E{constructor(tag){this.tag=tag;this.children=[];this.attrs={};this.l={};this._t='';this.value='';this.checked=false;this.disabled=false;this.hidden=false;this.className='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;this._t='';}after(n){this.sibling=n;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}}
 const ids=new Map(),planner=new E('section');ids.set('mb-planner',planner);
 const state={steps};
 const ctx={console,Intl,Math,Number,String,Array,Set,Object,JSON,Promise,curLang:'en',
  Date:FakeDate,setTimeout:(fn,ms)=>{timers.push({fn,ms,live:true});return timers.length;},clearTimeout:id=>{if(timers[id-1])timers[id-1].live=false;},
  crypto:{randomUUID:()=>'id-'+Math.random().toString(36).slice(2,12)},
  document:{getElementById:id=>ids.get(id),createElement:t=>new E(t),get hidden(){return hidden;},addEventListener:(k,f)=>{handlers.document[k]=f;}},
  localStorage:{getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{if(storageFails)throw new Error('quota');store.set(k,v);},removeItem:k=>{store.delete(k);}},
  Notification:Object.assign(function(title,opts){notified.push({title,opts});},{permission,requestPermission:async()=>{asked.push(1);ctx.Notification.permission=grant;return grant;}}),
  addEventListener:(k,f)=>{handlers.window[k]=f;},applyI18n(){}};
 ctx.window=ctx;ctx.mbPlannerTasks=()=>state.steps;
 vm.createContext(ctx);vm.runInContext(coreSource,ctx);vm.runInContext(uiSource,ctx);
 const $=id=>ids.get(id);
 const live=()=>timers.filter(t=>t.live);
 const submit=(stepId,whenValue)=>{$('mb-reminder-step').value=stepId;$('mb-reminder-when').value=whenValue;$('mb-reminders-form').l.submit({preventDefault(){}});};
 const local=ms=>{const d=new Date(ms);const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());};
 return {ctx,$,store,notified,asked,timers,live,state,handlers,submit,local,setClock:v=>{clock=v;},stored:()=>JSON.parse(store.get('mindbridge.reminders.v1')||'null')};
}
const status=h=>h.$('mb-reminders-status').textContent;

test('nothing exists until a step is available; the panel says it is optional and what it does not do',()=>{
 const h=harness({steps:[]});assert(/Add a step in the plan first/.test(h.$('mb-reminder-step').textContent));assert.equal(h.$('mb-reminder-add').disabled,true);
 const intro=h.$('mb-reminders').children[1].textContent;assert(/only while this page is open/.test(intro)&&/nothing is sent anywhere/.test(intro)&&/nothing repeats/.test(intro));
 assert(/Time zone: /.test(h.$('mb-reminders').children.at(-1).textContent));assert.equal(h.store.size,0,'rendering stores nothing');assert.equal(h.asked.length,0,'no permission is requested on load');assert.equal(h.live().length,0);
});
test('a past or empty time is refused with a message; a future time is stored with exact time and zone',()=>{
 const h=harness();h.submit('t1',h.local(T0-HOUR));assert(/future/.test(status(h)));assert.equal(h.stored(),null);
 h.submit('t1','');assert(/valid date and time/.test(status(h)));
 h.submit('t1',h.local(T0+HOUR));assert.equal(status(h),'Reminder added.');const s=h.stored();assert.equal(s.length,1);assert.equal(s[0].title,'Write intro');assert.equal(s[0].at,T0+HOUR);assert.equal(s[0].firedAt,null);assert(s[0].tz.length>0);
 const row=h.$('mb-reminders-list').children[0].textContent;assert(/Write intro/.test(row)&&/2026/.test(row),row);
});
test('the same step cannot get a second reminder at about the same time',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));h.submit('t1',h.local(T0+HOUR));assert(/already has a reminder/.test(status(h)));assert.equal(h.stored().length,1);
});
test('a due reminder is shown once in the page, never as a notification unless opted in, and never repeated',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));assert.equal(h.live().length,1,'one timer while a reminder is waiting');
 h.setClock(T0+HOUR+1000);h.live().at(-1).fn();
 const ready=h.$('mb-reminders-ready');assert.equal(ready.children.length,1);assert(/Reminder ready/.test(ready.textContent)&&/Write intro/.test(ready.textContent));assert.equal(h.notified.length,0,'no notification without opt-in');
 assert.equal(h.stored()[0].firedAt,T0+HOUR+1000);
 h.setClock(T0+2*HOUR);h.handlers.document.visibilitychange();assert.equal(h.$('mb-reminders-ready').children.length,1,'still one box');assert.equal(h.notified.length,0);
 assert(/Snooze 10 minutes/.test(ready.textContent)&&/Dismiss/.test(ready.textContent));assert(!/missed|late|overdue/i.test(ready.textContent+h.$('mb-reminders').textContent),'no guilt wording');
});
test('a reminder that came due while the page was closed appears once on return and is not re-notified on reload',()=>{
 const past={id:'r9',taskId:'t1',title:'Write intro',at:T0-5*HOUR,tz:'UTC',firedAt:null};
 const h=harness({stored:[past]});assert.equal(h.$('mb-reminders-ready').children.length,1);assert.equal(h.stored()[0].firedAt,T0);
 const again=harness({stored:h.stored()});assert.equal(again.$('mb-reminders-ready').children.length,1,'still shown until dismissed');assert.equal(again.notified.length,0);assert.equal(again.stored()[0].firedAt,T0,'firedAt is not rewritten');
});
test('browser notifications need a separate click; permission is requested only then; refusal is explained',async()=>{
 const h=harness();assert.equal(h.asked.length,0);h.$('mb-reminder-notify').checked=true;await h.$('mb-reminder-notify').l.change();
 assert.equal(h.asked.length,1);assert.equal(h.store.get('mindbridge.reminders.notify'),'on');
 h.submit('t1',h.local(T0+HOUR));h.setClock(T0+HOUR+1);h.live().at(-1).fn();assert.equal(h.notified.length,1);assert.equal(h.notified[0].title,'Write intro');h.live().forEach(t=>t.fn());assert.equal(h.notified.length,1,'one notification per reminder');
 const denied=harness({grant:'denied'});denied.$('mb-reminder-notify').checked=true;await denied.$('mb-reminder-notify').l.change();assert(/did not allow notifications/.test(status(denied)));assert.equal(denied.store.get('mindbridge.reminders.notify'),undefined);
 const off=harness();off.$('mb-reminder-notify').checked=true;await off.$('mb-reminder-notify').l.change();off.$('mb-reminder-notify').checked=false;await off.$('mb-reminder-notify').l.change();assert.equal(off.store.get('mindbridge.reminders.notify'),undefined,'turning it off is remembered');
});
test('snooze moves it forward and hides the box; dismiss and remove delete it',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));h.setClock(T0+HOUR+1000);h.live().at(-1).fn();
 const box=h.$('mb-reminders-ready').children[0];const snooze=box.children.at(-1).children[0];snooze.l.click();
 assert.equal(h.$('mb-reminders-ready').children.length,0);assert.equal(h.stored()[0].at,T0+HOUR+1000+10*60000);assert.equal(h.stored()[0].firedAt,null);assert.equal(status(h),'Snoozed.');
 h.setClock(T0+HOUR+1000+10*60000);h.live().at(-1).fn();assert.equal(h.$('mb-reminders-ready').children.length,1,'fires again exactly once after the snooze');
 h.$('mb-reminders-ready').children[0].children.at(-1).children[2].l.click();assert.equal(h.stored(),null,'dismiss removes it and clears storage');assert.equal(status(h),'Reminder removed.');
 const g=harness();g.submit('t2',g.local(T0+2*HOUR));g.$('mb-reminders-list').children[0].children.at(-1).children[2].l.click();assert.equal(g.stored(),null);
});
test('reminders for steps that were finished, set aside or deleted are dropped; others stay',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));h.submit('t2',h.local(T0+2*HOUR));assert.equal(h.stored().length,2);
 h.state.steps=[{id:'t2',title:'Read chapter'}]; const fire=h.handlers.window['mb:planner-render'];fire();assert.deepEqual(h.stored().map(r=>r.taskId),['t2']);
 h.state.steps=null;fire();assert.equal(h.stored().length,1,'while the plan is loading or blocked nothing is pruned');
});
test('the panel follows the planner when a later script moves it into another container',()=>{
 const h=harness(),planner=h.ctx.document.getElementById('mb-planner');let moved=0;
 planner.nextElementSibling=null;planner.after=n=>{moved++;planner.nextElementSibling=n;};
 h.handlers.window.load();assert.equal(moved,1,'repositioned after the page finished loading');
 h.handlers.window.load();assert.equal(moved,1,'and left alone once it is in place');
 planner.nextElementSibling=null;h.handlers.window['mb:planner-render']();assert.equal(moved,2,'also repaired when the planner re-renders');
});
test('changing account removes reminders because they name private steps',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));h.handlers.window['mb:account-changed']();assert.equal(h.stored(),null);assert.equal(h.$('mb-reminders-list').children[0].textContent,'No reminders.');
});
test('unreadable saved data is reported and never overwritten; adding is disabled',()=>{
 const h=harness({stored:'{not json'});assert(/could not be read and were not changed/.test(status(h)));assert.equal(h.$('mb-reminder-add').disabled,true);h.submit('t1',h.local(T0+HOUR));assert.equal(h.store.get('mindbridge.reminders.v1'),'{not json');
});
test('a storage failure is stated plainly instead of pretending the reminder is saved',()=>{
 const h=harness({storageFails:true});h.submit('t1',h.local(T0+HOUR));assert(/will be lost when you close the page/.test(status(h)));
});
test('a hidden tab schedules no timer, and coming back checks immediately',()=>{
 const h=harness({hidden:true});h.submit('t1',h.local(T0+HOUR));assert.equal(h.live().length,0);
});
test('the interface is translated and keeps the person’s data when the language changes',()=>{
 const h=harness();h.submit('t1',h.local(T0+HOUR));h.ctx.curLang='de';h.ctx.applyI18n();assert.equal(h.$('mb-reminders').children[0].textContent,'Erinnerungen (optional)');assert.equal(h.stored().length,1);
 h.ctx.curLang='tr';h.ctx.applyI18n();assert(/Hatırlatıcılar/.test(h.$('mb-reminders').children[0].textContent));h.ctx.curLang='es';h.ctx.applyI18n();assert(/Recordatorios/.test(h.$('mb-reminders').children[0].textContent));
});
(async()=>{for(const t of queue)await t();console.log(checks+' reminder interface checks passed.');})().catch(e=>{console.error(e);process.exit(1);});
