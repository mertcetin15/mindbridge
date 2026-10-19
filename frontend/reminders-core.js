/* Reminder rules, pure and testable. A reminder is an absolute instant (epoch ms), so changing the device
   time zone never makes it fire at the wrong moment; only how the time is *shown* changes.
   Opt-in only, no recurrence, no escalation, no "you missed" messaging. */
(function(root){
'use strict';
const MAX_REMINDERS=20,DUPLICATE_WINDOW_MS=60000,SNOOZE_MS={ten:10*60*1000,hour:60*60*1000};
function validItem(r){return r&&typeof r.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(r.id)&&typeof r.taskId==='string'&&r.taskId.length>0&&r.taskId.length<=64&&typeof r.title==='string'&&r.title.length>0&&r.title.length<=240&&Number.isFinite(r.at)&&r.at>0&&typeof r.tz==='string'&&r.tz.length<=64&&(r.firedAt===null||Number.isFinite(r.firedAt));}
function validList(list){return Array.isArray(list)&&list.length<=MAX_REMINDERS&&list.every(validItem)&&new Set(list.map(r=>r.id)).size===list.length;}
/* Returns the new list, or a string naming why nothing was added. */
function add(list,{id,taskId,title,at,tz},now){
 if(!Number.isFinite(at))return 'invalid';
 if(at<=now)return 'past';
 if(list.length>=MAX_REMINDERS)return 'limit';
 if(list.some(r=>r.taskId===taskId&&pending(r)&&Math.abs(r.at-at)<DUPLICATE_WINDOW_MS))return 'duplicate';
 const item={id,taskId,title:String(title).slice(0,240),at,tz:String(tz||'').slice(0,64),firedAt:null};
 return validItem(item)?[...list,item]:'invalid';
}
const pending=r=>r.firedAt===null||r.firedAt===undefined;   // never shown yet
function dueNow(list,now){return list.filter(r=>pending(r)&&r.at<=now);}
/* Marks reminders as shown exactly once: a second pass with the same list finds nothing new. */
function fire(list,now){const due=dueNow(list,now),ids=new Set(due.map(r=>r.id));return {list:list.map(r=>ids.has(r.id)?{...r,firedAt:now}:r),fired:due};}
function snooze(list,id,key,now){const ms=SNOOZE_MS[key];if(!ms)return list;return list.map(r=>r.id===id?{...r,at:now+ms,firedAt:null}:r);}
function remove(list,id){return list.filter(r=>r.id!==id);}
function forOpenTasks(list,openIds){const open=new Set(openIds);return list.filter(r=>open.has(r.taskId));}
function nextAt(list){const waiting=list.filter(pending).map(r=>r.at);return waiting.length?Math.min(...waiting):null;}
/* Exact local date, time and zone for display. `shownIn` is the zone in force now; `setIn` the one at creation. */
function describe(r,locale,shownIn){
 const zone=shownIn||'UTC';let text;
 try{text=new Intl.DateTimeFormat(locale||'en',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:zone,timeZoneName:'short'}).format(new Date(r.at));}
 catch(e){text=new Date(r.at).toISOString();}
 return {text,zone,zoneChanged:Boolean(r.tz)&&r.tz!==zone,setIn:r.tz};
}
const api={MAX_REMINDERS,SNOOZE_MS,validItem,validList,add,dueNow,fire,snooze,remove,forOpenTasks,nextAt,describe};
root.MBRemindersCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
