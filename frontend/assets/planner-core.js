/* Deterministic suggestions: no AI request, no automatic completion. */
(function(root){
'use strict';
// Step states and the only moves between them. Nothing changes state by itself: every move is a choice the
// person makes, and any finished or abandoned step can be brought back to planned.
const STATUSES=['planned','started','paused','partial','done','abandoned'];
const TRANSITIONS={planned:['started','done','abandoned'],started:['paused','partial','done','abandoned'],paused:['started','partial','done','abandoned'],partial:['started','done','abandoned','planned'],done:['planned'],abandoned:['planned']};
// Tasks saved before states existed carry only `done`.
function statusOf(task){return STATUSES.includes(task?.status)?task.status:(task?.done?'done':'planned');}
function allowedMoves(task){return TRANSITIONS[statusOf(task)].slice();}
function moveTask(task,to,day){const from=statusOf(task);if(from===to||!TRANSITIONS[from].includes(to))return null;return {...task,status:to,done:to==='done',status_at:day||dateKey()};}
function statusConsistent(t){if(t.status===undefined)return true;return STATUSES.includes(t.status)&&t.done===(t.status==='done')&&(t.status_at===undefined||t.status_at===''||(typeof t.status_at==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(t.status_at)&&!Number.isNaN(Date.parse(t.status_at))&&new Date(t.status_at).toISOString().slice(0,10)===t.status_at));}
// What actually changed in the last seven days (today and the six days before). Counts only: no score, no grade.
function weekSummary(tasks,today=dateKey()){
 const start=new Date(today+'T00:00:00');start.setDate(start.getDate()-6);const from=dateKey(start);
 const counts={started:0,paused:0,partial:0,done:0,abandoned:0};
 for(const t of tasks){const s=statusOf(t);if(s in counts&&t.status_at&&t.status_at>=from&&t.status_at<=today)counts[s]++;}
 return {from,to:today,counts,total:Object.values(counts).reduce((a,b)=>a+b,0)};
}
function valid(tasks){return Array.isArray(tasks)&&tasks.length<=100&&new Set(tasks.map(t=>t?.id)).size===tasks.length&&tasks.every(t=>t&&typeof t.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(t.id)&&typeof t.title==='string'&&t.title.trim().length>0&&t.title.length<=240&&typeof t.step==='string'&&t.step.length<=300&&Number.isInteger(t.minutes)&&t.minutes>=1&&t.minutes<=180&&['normal','important'].includes(t.priority)&&typeof t.done==='boolean'&&statusConsistent(t)&&typeof t.due==='string'&&(!t.due||(/^\d{4}-\d{2}-\d{2}$/.test(t.due)&&!Number.isNaN(Date.parse(t.due))&&new Date(t.due).toISOString().slice(0,10)===t.due)));}
function dateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function nextDay(date=new Date()){const day=new Date(date);day.setDate(day.getDate()+1);return dateKey(day);}
function recommend(tasks,budget,today){
 if(!Number.isInteger(budget)||budget<1||budget>180)return null;
 const ready=tasks.filter(t=>!t.done&&statusOf(t)!=='abandoned'&&(!t.due||t.due<=today));
 const fits=ready.filter(t=>t.minutes<=budget),pool=fits.length?fits:ready;
 const order=t=>t.due&&t.due<today?0:t.priority==='important'?1:2;
 const sorted=[...pool].sort((a,b)=>order(a)-order(b)||(a.due||'9999').localeCompare(b.due||'9999')||a.minutes-b.minutes||a.id.localeCompare(b.id));
 const task=sorted[0];return task?{task,minutes:Math.min(task.minutes,budget),partial:task.minutes>budget,reason:task.due&&task.due<today?'carry':task.priority==='important'?'priority':'fit'}:null;
}
// True only when the planned day is before today and the task is still open. It only says what the date shows.
function passed(task,today){const state=statusOf(task);return Boolean(task&&task.due&&task.due<today&&state!=='done'&&state!=='abandoned');}
const api={valid,dateKey,nextDay,recommend,STATUSES,statusOf,allowedMoves,moveTask,weekSummary,passed};root.MBPlannerCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
