const assert=require('assert');
const R=require('../frontend/reminders-core.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const NOW=Date.UTC(2026,9,18,10,0,0);const HOUR=3600000;
const make=(over={})=>({id:'r1',taskId:'t1',title:'Write intro',at:NOW+HOUR,tz:'Europe/Berlin',firedAt:null,...over});
test('a reminder must be in the future and well-formed; the list is capped',()=>{
 assert.equal(R.add([],make({at:NOW}),NOW),'past');assert.equal(R.add([],make({at:NOW-1}),NOW),'past');assert.equal(R.add([],make({at:NaN}),NOW),'invalid');assert.equal(R.add([],make({title:''}),NOW),'invalid');
 assert(Array.isArray(R.add([],make(),NOW)));
 let list=[];for(let i=0;i<R.MAX_REMINDERS;i++)list=R.add(list,make({id:'r'+i,taskId:'t'+i}),NOW);assert.equal(R.add(list,make({id:'extra',taskId:'x'}),NOW),'limit');
});
test('the same step cannot get two reminders for the same minute',()=>{
 const one=R.add([],make(),NOW);assert.equal(R.add(one,make({id:'r2',at:NOW+HOUR+30000}),NOW),'duplicate');
 assert(Array.isArray(R.add(one,make({id:'r2',at:NOW+HOUR+120000}),NOW)),'two minutes apart is allowed');assert(Array.isArray(R.add(one,make({id:'r2',taskId:'t2'}),NOW)),'another step is allowed');
});
test('a due reminder fires exactly once, however often the check runs',()=>{
 let list=R.add([],make(),NOW);assert.equal(R.dueNow(list,NOW+HOUR-1).length,0);
 const first=R.fire(list,NOW+HOUR);assert.equal(first.fired.length,1);assert.equal(first.list[0].firedAt,NOW+HOUR);
 const again=R.fire(first.list,NOW+HOUR+30000);assert.equal(again.fired.length,0,'second pass must not repeat it');assert.equal(R.fire(again.list,NOW+10*HOUR).fired.length,0);
});
test('a reminder that came due while the page was closed fires once on return, without being re-created',()=>{
 const list=R.add([],make(),NOW);const back=NOW+5*HOUR;const r=R.fire(list,back);assert.equal(r.fired.length,1);assert.equal(R.fire(r.list,back+1000).fired.length,0);
});
test('snoozing moves the instant forward from now and makes it fire again once',()=>{
 let list=R.fire(R.add([],make(),NOW),NOW+HOUR).list;list=R.snooze(list,'r1','ten',NOW+HOUR+60000);
 assert.equal(list[0].at,NOW+HOUR+60000+10*60000);assert.equal(list[0].firedAt,null);assert.equal(R.dueNow(list,NOW+HOUR+9*60000).length,0);assert.equal(R.fire(list,list[0].at).fired.length,1);
 assert.equal(R.snooze(list,'r1','forever',0),list,'unknown snooze lengths change nothing');assert.equal(R.snooze(list,'r1','hour',NOW)[0].at,NOW+HOUR);
});
test('removing and pruning never touch other reminders',()=>{
 const list=[make(),make({id:'r2',taskId:'t2',at:NOW+2*HOUR}),make({id:'r3',taskId:'t3',at:NOW+3*HOUR})];
 assert.deepEqual(R.remove(list,'r2').map(r=>r.id),['r1','r3']);assert.deepEqual(R.forOpenTasks(list,['t1','t3']).map(r=>r.id),['r1','r3']);assert.deepEqual(R.forOpenTasks(list,[]),[]);
});
test('nextAt ignores reminders already shown',()=>{
 const list=R.fire([make(),make({id:'r2',taskId:'t2',at:NOW+2*HOUR})],NOW+HOUR).list;assert.equal(R.nextAt(list),NOW+2*HOUR);assert.equal(R.nextAt([]),null);assert.equal(R.nextAt(R.fire(list,NOW+3*HOUR).list),null);
});
test('a time-zone change moves the displayed time, never the instant, and says so',()=>{
 const r=make({at:Date.UTC(2026,9,19,7,0,0),tz:'Europe/Berlin'});
 const berlin=R.describe(r,'en-GB','Europe/Berlin'),tokyo=R.describe(r,'en-GB','Asia/Tokyo');
 assert(/09:00/.test(berlin.text),berlin.text);assert(/16:00/.test(tokyo.text),tokyo.text);assert.equal(berlin.zoneChanged,false);assert.equal(tokyo.zoneChanged,true);assert.equal(tokyo.setIn,'Europe/Berlin');
 assert(/GMT|UTC|CEST|CET|Z|\+/.test(berlin.text),'the zone is part of the text: '+berlin.text);
 assert.equal(R.fire([r],r.at).fired.length,1,'fires at the same instant wherever the device is');assert.equal(R.dueNow([r],r.at-1).length,0);
});
test('daylight-saving change keeps the absolute instant',()=>{
 const before=Date.UTC(2026,9,24,6,30,0),after=Date.UTC(2026,9,25,6,30,0);const r1=make({at:before}),r2=make({id:'r2',at:after});
 assert.equal(r2.at-r1.at,24*HOUR,'stored instants are absolute');assert(/08:30/.test(R.describe(r1,'en-GB','Europe/Berlin').text));assert(/07:30/.test(R.describe(r2,'en-GB','Europe/Berlin').text),'the wall clock shifts at the end of daylight saving');
});
test('storage validation rejects malformed or oversized data',()=>{
 assert(R.validList([make()]));assert(R.validList([]));assert(!R.validList('x'));assert(!R.validList([make({at:'soon'})]));assert(!R.validList([make(),make()]));assert(!R.validList([make({firedAt:'yes'})]));
 assert(!R.validList(Array.from({length:21},(_,i)=>make({id:'r'+i}))));assert(!R.validList([make({id:'bad id!'})]));assert(!R.validList([make({title:'x'.repeat(241)})]));
});
test('an invalid locale or zone falls back to a readable ISO time instead of throwing',()=>{
 const d=R.describe(make(),'en','Not/AZone');assert(typeof d.text==='string'&&d.text.length>5);
});
console.log(checks+' reminder-core checks passed.');
