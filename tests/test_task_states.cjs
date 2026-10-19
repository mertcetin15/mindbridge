const assert=require('assert');
const Core=require('../frontend/planner-core.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const task=(over={})=>({id:'t1',title:'Write intro',step:'Open the file',minutes:10,priority:'normal',due:'',done:false,...over});
test('tasks saved before states existed derive their state from done',()=>{
 assert.equal(Core.statusOf(task()),'planned');assert.equal(Core.statusOf(task({done:true})),'done');
 assert.equal(Core.statusOf(task({status:'paused'})),'paused');assert.equal(Core.statusOf(task({status:'nonsense'})),'planned');
});
test('the transition table is exactly the documented one',()=>{
 const expected={planned:['started','done','abandoned'],started:['paused','partial','done','abandoned'],paused:['started','partial','done','abandoned'],partial:['started','done','abandoned','planned'],done:['planned'],abandoned:['planned']};
 for(const s of Core.STATUSES)assert.deepEqual(Core.allowedMoves(task({status:s,done:s==='done'})).sort(),expected[s].slice().sort(),s);
});
test('every allowed move works, every other move and a no-op are refused',()=>{
 for(const from of Core.STATUSES)for(const to of Core.STATUSES){
  const t=task({status:from,done:from==='done'}),moved=Core.moveTask(t,to,'2026-10-18'),ok=Core.allowedMoves(t).includes(to);
  if(ok){assert(moved,from+'→'+to);assert.equal(moved.status,to);assert.equal(moved.done,to==='done');assert.equal(moved.status_at,'2026-10-18');}
  else assert.equal(moved,null,from+'→'+to+' must be refused');
 }
});
test('a move never mutates the original and never touches other fields',()=>{
 const t=task({title:'Keep',step:'Same',minutes:25,priority:'important',due:'2026-10-20'});const copy=JSON.stringify(t);const moved=Core.moveTask(t,'started','2026-10-18');
 assert.equal(JSON.stringify(t),copy);for(const k of ['id','title','step','minutes','priority','due'])assert.equal(moved[k],t[k]);
});
test('finished and abandoned steps can come back, with the change dated',()=>{
 const back=Core.moveTask(Core.moveTask(task(),'abandoned','2026-10-10'),'planned','2026-10-18');assert.equal(back.status,'planned');assert.equal(back.done,false);assert.equal(back.status_at,'2026-10-18');
 assert.equal(Core.moveTask(task({done:true}),'planned','2026-10-18').done,false);
});
test('validation accepts old and new shapes and rejects contradictions',()=>{
 assert(Core.valid([task()]));assert(Core.valid([task({done:true})]));assert(Core.valid([task({status:'partial',status_at:'2026-10-18'})]));assert(Core.valid([task({status:'done',done:true,status_at:''})]));
 assert(!Core.valid([task({status:'done',done:false})]));assert(!Core.valid([task({status:'started',done:true})]));assert(!Core.valid([task({status:'finished'})]));
 assert(!Core.valid([task({status:'planned',status_at:'18/10/2026'})]));assert(!Core.valid([task({status:'planned',status_at:'2026-02-31'})]));assert(!Core.valid([task({status:5})]));
});
test('suggestions never offer abandoned work but do offer paused, partial and started work',()=>{
 const today='2026-10-18';
 for(const s of ['paused','partial','started'])assert.equal(Core.recommend([task({status:s})],25,today).task.id,'t1',s);
 assert.equal(Core.recommend([task({status:'abandoned'})],25,today),null);
 assert.equal(Core.recommend([task({status:'abandoned'}),task({id:'t2',minutes:20})],25,today).task.id,'t2');
});
test('the weekly summary counts what changed in the last seven days and nothing else',()=>{
 const today='2026-10-18';
 const tasks=[task({id:'a',status:'done',done:true,status_at:'2026-10-18'}),task({id:'b',status:'done',done:true,status_at:'2026-10-12'}),task({id:'c',status:'done',done:true,status_at:'2026-10-11'}),
  task({id:'d',status:'partial',status_at:'2026-10-15'}),task({id:'e',status:'abandoned',status_at:'2026-10-17'}),task({id:'f',status:'paused',status_at:'2026-10-18'}),task({id:'g',status:'started',status_at:'2026-10-14'}),
  task({id:'h',status:'planned',status_at:'2026-10-18'}),task({id:'i',done:true}),task({id:'j',status:'done',done:true,status_at:'2026-10-19'})];
 const week=Core.weekSummary(tasks,today);
 assert.equal(week.from,'2026-10-12');assert.equal(week.to,today);
 assert.deepEqual(week.counts,{started:1,paused:1,partial:1,done:2,abandoned:1},'the 12th counts, the 11th and a future date do not; planned and undated tasks are ignored');
 assert.equal(week.total,6);assert.deepEqual(Object.keys(week).sort(),['counts','from','to','total'],'no score, rating or percentage is produced');
});
test('the weekly window crosses month and leap-year boundaries correctly',()=>{
 assert.equal(Core.weekSummary([],'2026-03-02').from,'2026-02-24');assert.equal(Core.weekSummary([],'2028-03-01').from,'2028-02-24');assert.equal(Core.weekSummary([],'2026-01-03').from,'2025-12-28');
});
console.log(checks+' task-state checks passed.');
