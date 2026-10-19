/* Optional reminders for planner steps.
   - Off until the person adds one. Nothing is sent to the server or any other site.
   - They work only while this page is open: there is no background service. The text says so.
   - Stored in this browser only (not in the account), for open steps; cleared on account change.
   - Exact local time and time zone are always shown; snooze, remove and a clear "reminder is ready" box,
     with no counting of missed reminders, no repeats and no escalating wording. */
(() => {
'use strict';
const Core=window.MBRemindersCore,KEY='mindbridge.reminders.v1',NOTIFY_KEY='mindbridge.reminders.notify';
const COPY={
 en:{title:'Reminders (optional)',intro:'Pick a step and a time. A reminder appears here, and as a browser notification only if you allow it. It works only while this page is open; nothing is sent anywhere and nothing repeats.',step:'Step',noSteps:'Add a step in the plan first.',when:'Date and time',add:'Add reminder',notify:'Also show a browser notification (your browser will ask permission)',notifyDenied:'The browser did not allow notifications, so only the on-page reminder will appear.',notifyOff:'Browser notifications are not available here; the on-page reminder still works.',
  added:'Reminder added.',past:'Choose a time in the future.',invalid:'Choose a step and a valid date and time.',duplicate:'That step already has a reminder at about that time.',limit:'You can keep up to 20 reminders. Remove one to add another.',removed:'Reminder removed.',snoozed:'Snoozed.',storage:'Reminders could not be saved in this browser, so they will be lost when you close the page.',corrupt:'Saved reminders could not be read and were not changed. Remove them in your browser data to start again.',
  list:'Your reminders',none:'No reminders.',readyTitle:'Reminder ready',readyFor:'For:',setFor:'Set for',snooze10:'Snooze 10 minutes',snooze60:'Snooze 1 hour',remove:'Remove',dismiss:'Dismiss',zone:'Time zone',zoneChanged:'Set in {zone}; shown in your current time zone.',notifyBody:'Open MindBridge to see this step.',scope:'Reminders stay in this browser only and are cleared when you sign in, sign out or switch account.'},
 tr:{title:'Hatırlatıcılar (isteğe bağlı)',intro:'Bir adım ve bir saat seç. Hatırlatıcı burada görünür; tarayıcı bildirimi yalnızca sen izin verirsen gelir. Yalnızca bu sayfa açıkken çalışır; hiçbir yere bir şey gönderilmez ve hiçbir şey tekrarlanmaz.',step:'Adım',noSteps:'Önce planına bir adım ekle.',when:'Tarih ve saat',add:'Hatırlatıcı ekle',notify:'Tarayıcı bildirimi de göster (tarayıcın izin isteyecek)',notifyDenied:'Tarayıcı bildirime izin vermedi; yalnızca sayfadaki hatırlatıcı görünecek.',notifyOff:'Burada tarayıcı bildirimi kullanılamıyor; sayfadaki hatırlatıcı çalışır.',
  added:'Hatırlatıcı eklendi.',past:'Gelecekte bir zaman seç.',invalid:'Bir adım ve geçerli bir tarih/saat seç.',duplicate:'Bu adımın yaklaşık aynı saatte zaten bir hatırlatıcısı var.',limit:'En fazla 20 hatırlatıcı tutabilirsin. Yenisi için birini kaldır.',removed:'Hatırlatıcı kaldırıldı.',snoozed:'Ertelendi.',storage:'Hatırlatıcılar bu tarayıcıya kaydedilemedi; sayfayı kapatınca kaybolur.',corrupt:'Kayıtlı hatırlatıcılar okunamadı ve değiştirilmedi. Yeniden başlamak için tarayıcı verilerinden kaldır.',
  list:'Hatırlatıcıların',none:'Hatırlatıcı yok.',readyTitle:'Hatırlatıcı hazır',readyFor:'Adım:',setFor:'Ayarlanan zaman',snooze10:'10 dakika ertele',snooze60:'1 saat ertele',remove:'Kaldır',dismiss:'Kapat',zone:'Saat dilimi',zoneChanged:'{zone} diliminde ayarlandı; şu anki saat diliminde gösteriliyor.',notifyBody:'Bu adımı görmek için MindBridge’i aç.',scope:'Hatırlatıcılar yalnızca bu tarayıcıda durur; giriş, çıkış veya hesap değişiminde silinir.'},
 de:{title:'Erinnerungen (optional)',intro:'Wähle einen Schritt und eine Zeit. Die Erinnerung erscheint hier und nur mit deiner Erlaubnis als Browser-Benachrichtigung. Sie funktioniert nur, solange diese Seite offen ist; nichts wird gesendet und nichts wiederholt sich.',step:'Schritt',noSteps:'Füge zuerst einen Schritt im Plan hinzu.',when:'Datum und Uhrzeit',add:'Erinnerung hinzufügen',notify:'Auch Browser-Benachrichtigung zeigen (der Browser fragt nach Erlaubnis)',notifyDenied:'Der Browser hat Benachrichtigungen nicht erlaubt; es erscheint nur die Erinnerung auf der Seite.',notifyOff:'Browser-Benachrichtigungen sind hier nicht verfügbar; die Erinnerung auf der Seite funktioniert.',
  added:'Erinnerung hinzugefügt.',past:'Wähle einen Zeitpunkt in der Zukunft.',invalid:'Wähle einen Schritt sowie Datum und Uhrzeit.',duplicate:'Dieser Schritt hat schon eine Erinnerung zu ungefähr dieser Zeit.',limit:'Bis zu 20 Erinnerungen sind möglich. Entferne eine, um eine neue hinzuzufügen.',removed:'Erinnerung entfernt.',snoozed:'Verschoben.',storage:'Erinnerungen konnten in diesem Browser nicht gespeichert werden und gehen beim Schließen verloren.',corrupt:'Gespeicherte Erinnerungen waren nicht lesbar und wurden nicht verändert. Entferne sie in den Browserdaten, um neu zu beginnen.',
  list:'Deine Erinnerungen',none:'Keine Erinnerungen.',readyTitle:'Erinnerung bereit',readyFor:'Für:',setFor:'Eingestellt für',snooze10:'10 Minuten später',snooze60:'1 Stunde später',remove:'Entfernen',dismiss:'Schließen',zone:'Zeitzone',zoneChanged:'In {zone} eingestellt; in deiner aktuellen Zeitzone angezeigt.',notifyBody:'Öffne MindBridge, um diesen Schritt zu sehen.',scope:'Erinnerungen bleiben nur in diesem Browser und werden bei Anmeldung, Abmeldung oder Kontowechsel gelöscht.'},
 es:{title:'Recordatorios (opcional)',intro:'Elige un paso y una hora. El recordatorio aparece aquí y como notificación del navegador solo si lo permites. Funciona solo mientras esta página está abierta; no se envía nada y nada se repite.',step:'Paso',noSteps:'Primero añade un paso al plan.',when:'Fecha y hora',add:'Añadir recordatorio',notify:'Mostrar también una notificación del navegador (el navegador pedirá permiso)',notifyDenied:'El navegador no permitió notificaciones; solo aparecerá el recordatorio en la página.',notifyOff:'Las notificaciones del navegador no están disponibles aquí; el recordatorio en la página funciona.',
  added:'Recordatorio añadido.',past:'Elige una hora futura.',invalid:'Elige un paso y una fecha y hora válidas.',duplicate:'Ese paso ya tiene un recordatorio a una hora parecida.',limit:'Puedes tener hasta 20 recordatorios. Quita uno para añadir otro.',removed:'Recordatorio quitado.',snoozed:'Aplazado.',storage:'No se pudieron guardar los recordatorios en este navegador; se perderán al cerrar la página.',corrupt:'No se pudieron leer los recordatorios guardados y no se cambiaron. Quítalos en los datos del navegador para empezar de nuevo.',
  list:'Tus recordatorios',none:'No hay recordatorios.',readyTitle:'Recordatorio listo',readyFor:'Para:',setFor:'Programado para',snooze10:'Aplazar 10 minutos',snooze60:'Aplazar 1 hora',remove:'Quitar',dismiss:'Cerrar',zone:'Zona horaria',zoneChanged:'Programado en {zone}; mostrado en tu zona horaria actual.',notifyBody:'Abre MindBridge para ver este paso.',scope:'Los recordatorios solo se quedan en este navegador y se borran al iniciar sesión, cerrar sesión o cambiar de cuenta.'}
};
const C=()=>COPY[curLang]||COPY.en;
const planner=document.getElementById('mb-planner');
if(!planner||!Core)return;
const zone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){return 'UTC';}};
const locale=()=>({en:'en-GB',tr:'tr-TR',de:'de-DE',es:'es-ES'})[curLang]||'en-GB';
function node(tag,id,cls){const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;}

let items=[],message='',unreadable=false,saveFailed=false,timer=null,notify=false;
function readStore(){try{const raw=localStorage.getItem(KEY);if(raw===null)return [];const parsed=JSON.parse(raw);if(!Core.validList(parsed))throw new Error('invalid');return parsed;}catch(e){unreadable=true;return [];}}
function writeStore(){if(unreadable)return false;try{if(items.length)localStorage.setItem(KEY,JSON.stringify(items));else localStorage.removeItem(KEY);saveFailed=false;return true;}catch(e){saveFailed=true;return false;}}
function readNotify(){try{return localStorage.getItem(NOTIFY_KEY)==='on'&&typeof Notification!=='undefined'&&Notification.permission==='granted';}catch(e){return false;}}
function writeNotify(on){try{if(on)localStorage.setItem(NOTIFY_KEY,'on');else localStorage.removeItem(NOTIFY_KEY);}catch(e){}}

const panel=node('section','mb-reminders','mb-reminders'),heading=node('h2'),intro=node('p','','mb-reminders-intro'),scope=node('p','','mb-reminders-intro');
const form=node('form','mb-reminders-form','mb-reminders-form'),stepLabel=node('label'),stepText=node('span'),stepSelect=node('select','mb-reminder-step'),whenLabel=node('label'),whenText=node('span'),when=node('input','mb-reminder-when');
when.type='datetime-local';stepLabel.append(stepText,stepSelect);whenLabel.append(whenText,when);
const addButton=node('button','mb-reminder-add');addButton.type='submit';addButton.className='btn-solid';
const notifyLabel=node('label','','mb-reminders-notify'),notifyBox=node('input','mb-reminder-notify'),notifyText=node('span');notifyBox.type='checkbox';notifyLabel.append(notifyBox,notifyText);
form.append(stepLabel,whenLabel,addButton);
const status=node('p','mb-reminders-status','mb-reminders-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const ready=node('div','mb-reminders-ready','mb-reminders-ready');ready.setAttribute('role','status');ready.setAttribute('aria-live','polite');
const listHeading=node('h3'),list=node('ul','mb-reminders-list','mb-reminders-list');
panel.append(heading,intro,form,notifyLabel,status,ready,listHeading,list,scope);planner.after(panel);
// Later scripts move the planner into its own tool pane. Keep this panel next to it, wherever it ends up.
function place(){if(planner.nextElementSibling!==panel)planner.after(panel);}

function text(tag,value,cls){const n=node(tag,'',cls);n.textContent=value;return n;}
function button(label,fn,id){const b=node('button',id);b.type='button';b.textContent=label;b.addEventListener('click',fn);return b;}
function describe(r){const d=Core.describe(r,locale(),zone());return {line:d.text+(d.zoneChanged?' · '+C().zoneChanged.replace('{zone}',d.setIn):''),zone:d.zone};}
function openSteps(){return typeof window.mbPlannerTasks==='function'?window.mbPlannerTasks():null;}

function renderSteps(){
 const steps=openSteps(),previous=stepSelect.value;stepSelect.replaceChildren();
 if(!steps||!steps.length){const o=node('option');o.value='';o.textContent=C().noSteps;stepSelect.append(o);stepSelect.disabled=true;addButton.disabled=true;when.disabled=true;return;}
 for(const s of steps){const o=node('option');o.value=s.id;o.textContent=s.title;stepSelect.append(o);}
 if(steps.some(s=>s.id===previous))stepSelect.value=previous;stepSelect.disabled=false;addButton.disabled=unreadable;when.disabled=false;
}
function renderReady(){
 ready.replaceChildren();
 const shown=items.filter(r=>r.firedAt!==null&&r.firedAt!==undefined&&r.at<=Date.now()&&!r.acknowledged);
 for(const r of shown){
  const box=node('div','','mb-reminder-ready-item');box.append(text('strong',C().readyTitle),text('p',C().readyFor+' '+r.title),text('p',C().setFor+' '+describe(r).line));
  const row=node('div','','mb-reminders-actions');
  row.append(button(C().snooze10,()=>act(r.id,'ten')),button(C().snooze60,()=>act(r.id,'hour')),button(C().dismiss,()=>act(r.id,'remove')));box.append(row);ready.append(box);
 }
}
function renderList(){
 list.replaceChildren();const waiting=items.filter(r=>r.firedAt===null||r.firedAt===undefined);
 if(!waiting.length){list.append(text('li',C().none));return;}
 for(const r of [...waiting].sort((a,b)=>a.at-b.at)){
  const li=node('li'),d=describe(r);li.append(text('strong',r.title),text('span',' · '+d.line));
  const row=node('div','','mb-reminders-actions');row.append(button(C().snooze10,()=>act(r.id,'ten')),button(C().snooze60,()=>act(r.id,'hour')),button(C().remove,()=>act(r.id,'remove')));li.append(row);list.append(li);
 }
}
function render(){
 heading.textContent=C().title;intro.textContent=C().intro;scope.textContent=C().scope+' '+C().zone+': '+zone()+'.';stepText.textContent=C().step;whenText.textContent=C().when;addButton.textContent=C().add;listHeading.textContent=C().list;
 notifyText.textContent=C().notify;notifyBox.checked=notify;notifyBox.disabled=typeof Notification==='undefined';
 status.textContent=saveFailed?C().storage:unreadable?C().corrupt:message?C()[message]||'':'';
 renderSteps();renderReady();renderList();schedule();
}
function act(id,kind){
 const now=Date.now();
 if(kind==='remove'){items=Core.remove(items,id);message='removed';}
 else{items=Core.snooze(items,id,kind,now);message='snoozed';}
 writeStore();render();
}
function showNotification(r){
 if(!notify||typeof Notification==='undefined'||Notification.permission!=='granted')return;
 try{new Notification(r.title,{body:C().notifyBody,tag:'mindbridge-reminder-'+r.id});}catch(e){/* notification is optional */}
}
function check(){
 // Re-read first so a second tab that already showed a reminder is respected (duplicate prevention).
 if(!unreadable){const fresh=readStore();if(!unreadable)items=fresh;}
 const now=Date.now(),result=Core.fire(items,now);
 if(result.fired.length){items=result.list;writeStore();for(const r of result.fired)showNotification(r);renderReady();renderList();}
 schedule();
}
function schedule(){
 clearTimeout(timer);timer=null;const next=Core.nextAt(items);if(next===null||document.hidden)return;
 timer=setTimeout(check,Math.min(Math.max(next-Date.now(),1000),30000));
}
form.addEventListener('submit',e=>{
 e.preventDefault();const steps=openSteps()||[],step=steps.find(s=>s.id===stepSelect.value),at=new Date(when.value).getTime();
 if(!step||!when.value){message='invalid';render();return;}
 const id=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,64);
 const result=Core.add(items,{id,taskId:step.id,title:step.title,at,tz:zone()},Date.now());
 if(typeof result==='string'){message=result;render();return;}
 items=result;message='added';when.value='';writeStore();render();
});
notifyBox.addEventListener('change',async()=>{
 if(!notifyBox.checked){notify=false;writeNotify(false);render();return;}
 if(typeof Notification==='undefined'){notify=false;message='notifyOff';render();return;}
 let permission=Notification.permission;
 if(permission==='default'){try{permission=await Notification.requestPermission();}catch(e){permission='denied';}}
 notify=permission==='granted';writeNotify(notify);message=notify?'':'notifyDenied';render();
});
window.addEventListener('load',place);
window.addEventListener('mb:planner-render',()=>{place();
 const steps=openSteps();if(steps){const kept=Core.forOpenTasks(items,steps.map(s=>s.id));if(kept.length!==items.length){items=kept;writeStore();}}
 renderSteps();renderReady();renderList();schedule();
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();else{clearTimeout(timer);timer=null;}});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){unreadable=false;items=readStore();render();}});
// Reminders name private steps: drop them when the account changes, as the plan itself does.
window.addEventListener('mb:account-changed',()=>{items=[];unreadable=false;message='';try{localStorage.removeItem(KEY);}catch(e){}render();});
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();render();};
items=readStore();notify=readNotify();render();check();
})();
