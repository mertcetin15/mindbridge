/* Persistent daily plan. Guest and account storage never silently merge. */
(() => {
'use strict';
const Core=window.MBPlannerCore,KEY='mindbridge.planner.v1';
const copy={
tr:{title:'Bugün neye başlayayım?',intro:'Aklındaki işleri bırak. Vaktine sığan birini seç, küçük bir adımla başla.',task:'Yapılacak iş',step:'Kaldığın yer / sonraki küçük adım',minutes:'Tahmini süre (dk)',due:'Planlanan gün (isteğe bağlı)',priority:'Öncelik',normal:'Normal',important:'Önemli',add:'İşi ekle',save:'Değişikliği kaydet',cancel:'Vazgeç',budget:'Şu an kaç dakikan var?',suggest:'Önerilen başlangıç',begin:'Başla',edit:'Düzenle',done:'Tamamlandı',undo:'Geri aç',tomorrow:'Yarına bırak',remove:'Sil',confirm:'Bu işi silmek istiyor musun?',ready:'Bugün / kalan işler',later:'Sonraki günler',finished:'Tamamlananlar',empty:'Bugün için iş yok. Bir iş ekle veya sonraki günlerin planını gözden geçir.',loading:'Plan yükleniyor…',saved:'Plan kaydedildi.',error:'Kaydedilemedi. Yazdıkların korundu; tekrar dene.',corrupt:'Tarayıcıdaki plan okunamadı. Üzerine yazılmadı. Önce yedekle veya kayıtlı planı kontrol et.',conflict:'Plan başka sekmede değişti. Yazdıklarını kopyalayıp “Yenile”ye bas; sonra yeniden düzenle.',refresh:'Yenile',guest:'Misafir planı · yalnızca bu tarayıcıda saklanır. Girişte otomatik aktarılmaz.',account:'Hesap planı · uygulamanın veritabanında saklanır, AI’ye gönderilmez.',limit:'En fazla 100 iş saklanabilir. Yer açmak için eski bir işi sil.',total:'Açık işler',load:'Bugünün tahmini yükü',min:'dk',part:'Bu iş tek oturuma sığmıyor; seçilen süre yalnızca ilerlemek için.',carry:'Vaktine uygun seçenekler arasında önceki günden kaldığı için öne alındı.',priorityReason:'Vaktine uygun seçenekler arasında önemli olarak işaretlendiği için seçildi.',fit:'Vaktine sığan kısa bir başlangıç.',blocked:'Önce mevcut odak oturumunu bitir veya planını temizle. Üzerine yazılmadı.',started:'Odak oturumu başladı. İş bittiğinde listede “Tamamlandı”ya bas.',editHint:'Sonraki küçük adımı güncelle; yeniden başladığında burada seni beklesin.',export:'Planı indir',ph:'Örn. hocaya e-posta gönder',stepPh:'Örn. taslağın giriş cümlesini yaz',open:'Bugünün planını aç'},
en:{title:'What should I start today?',intro:'Capture your tasks. Choose one that fits your time and start with a small step.',task:'Task',step:'Where you left off / next small step',minutes:'Estimated minutes',due:'Planned day (optional)',priority:'Priority',normal:'Normal',important:'Important',add:'Add task',save:'Save changes',cancel:'Cancel',budget:'How many minutes do you have?',suggest:'Suggested next step',begin:'Start',edit:'Edit',done:'Done',undo:'Reopen',tomorrow:'Move to tomorrow',remove:'Delete',confirm:'Delete this task?',ready:'Today / unfinished',later:'Later days',finished:'Completed',empty:'No tasks for today. Add one or review your later plans.',loading:'Loading plan…',saved:'Plan saved.',error:'Could not save. Your draft is kept; try again.',corrupt:'The browser plan could not be read. It was not overwritten. Back it up or check the saved data first.',conflict:'The plan changed in another tab. Copy your draft, refresh and edit again.',refresh:'Refresh',guest:'Guest plan · stored only in this browser. Signing in does not import it.',account:'Account plan · stored in the app database, never sent to AI.',limit:'You can store up to 100 tasks. Delete an old task to make room.',total:'Open tasks',load:'Estimated work today',min:'min',part:'This task will take more than one session; this is a block to make progress.',carry:'Prioritized among suitable tasks because it was carried over.',priorityReason:'Chosen among suitable tasks because you marked it important.',fit:'A short start that fits your time.',blocked:'Finish or clear your existing focus plan first. It was not overwritten.',started:'Focus session started. Mark the task Done when you finish it.',editHint:'Update the next small step so you can pick up here later.',export:'Download plan',ph:'E.g. email my lecturer',stepPh:'E.g. write the opening sentence',open:'Open today’s plan'},
de:{title:'Womit fange ich heute an?',intro:'Sammle Aufgaben. Wähle eine passende Aufgabe und beginne mit einem kleinen Schritt.',task:'Aufgabe',step:'Stand / nächster kleiner Schritt',minutes:'Geschätzte Minuten',due:'Geplanter Tag (optional)',priority:'Priorität',normal:'Normal',important:'Wichtig',add:'Hinzufügen',save:'Änderungen speichern',cancel:'Abbrechen',budget:'Wie viele Minuten hast du?',suggest:'Vorgeschlagener Start',begin:'Starten',edit:'Bearbeiten',done:'Erledigt',undo:'Wieder öffnen',tomorrow:'Auf morgen verschieben',remove:'Löschen',confirm:'Diese Aufgabe löschen?',ready:'Heute / offen',later:'Spätere Tage',finished:'Erledigt',empty:'Keine Aufgabe für heute. Ergänze eine oder prüfe spätere Pläne.',loading:'Plan wird geladen…',saved:'Plan gespeichert.',error:'Speichern fehlgeschlagen. Dein Entwurf bleibt erhalten.',corrupt:'Browserplan unlesbar. Er wurde nicht überschrieben. Sichere oder prüfe zuerst die Daten.',conflict:'Plan in anderem Tab geändert. Kopiere deinen Entwurf und lade neu.',refresh:'Neu laden',guest:'Gastplan · nur in diesem Browser. Anmeldung importiert ihn nicht.',account:'Kontoplan · in der App-Datenbank, nicht an KI gesendet.',limit:'Maximal 100 Aufgaben. Lösche eine alte Aufgabe.',total:'Offene Aufgaben',load:'Geschätzte Arbeit heute',min:'Min.',part:'Die Aufgabe braucht mehr als eine Sitzung; dies ist ein Arbeitsblock.',carry:'Unter passenden Aufgaben wegen des Übertrags priorisiert.',priorityReason:'Unter passenden Aufgaben als wichtig markiert.',fit:'Ein kurzer Start für deine verfügbare Zeit.',blocked:'Beende oder lösche zuerst den bestehenden Fokusplan.',started:'Fokussitzung gestartet. Markiere die Aufgabe selbst als erledigt.',editHint:'Aktualisiere den nächsten Schritt zum späteren Fortsetzen.',export:'Plan herunterladen',ph:'Z. B. E-Mail an Dozenten',stepPh:'Z. B. Einleitung schreiben',open:'Heutigen Plan öffnen'},
es:{title:'¿Por dónde empiezo hoy?',intro:'Anota tus tareas. Elige una que encaje en tu tiempo y empieza con un paso pequeño.',task:'Tarea',step:'Dónde te quedaste / siguiente paso',minutes:'Minutos estimados',due:'Día previsto (opcional)',priority:'Prioridad',normal:'Normal',important:'Importante',add:'Añadir tarea',save:'Guardar cambios',cancel:'Cancelar',budget:'¿Cuántos minutos tienes?',suggest:'Siguiente paso sugerido',begin:'Empezar',edit:'Editar',done:'Completada',undo:'Reabrir',tomorrow:'Pasar a mañana',remove:'Borrar',confirm:'¿Borrar esta tarea?',ready:'Hoy / pendientes',later:'Otros días',finished:'Completadas',empty:'No hay tareas para hoy. Añade una o revisa los próximos días.',loading:'Cargando plan…',saved:'Plan guardado.',error:'No se pudo guardar. Se conserva tu borrador.',corrupt:'No se pudo leer el plan local. No se sobrescribió. Guarda una copia o revisa los datos.',conflict:'El plan cambió en otra pestaña. Copia el borrador, actualiza y edita de nuevo.',refresh:'Actualizar',guest:'Plan invitado · solo en este navegador. Iniciar sesión no lo importa.',account:'Plan de cuenta · en la base de datos, nunca se envía a la IA.',limit:'Máximo 100 tareas. Borra una antigua.',total:'Tareas abiertas',load:'Trabajo estimado hoy',min:'min',part:'Esta tarea necesita más de una sesión; este bloque permite avanzar.',carry:'Priorizada entre tareas adecuadas porque quedó pendiente.',priorityReason:'Elegida entre tareas adecuadas porque la marcaste importante.',fit:'Un comienzo corto que encaja en tu tiempo.',blocked:'Termina o borra primero tu plan de enfoque actual.',started:'Sesión iniciada. Marca la tarea completada cuando la termines.',editHint:'Actualiza el siguiente paso para continuar más tarde.',export:'Descargar plan',ph:'Ej. enviar correo al profesor',stepPh:'Ej. escribir la primera frase',open:'Abrir el plan de hoy'}
};
const extras={
 tr:{search:'İşlerinde ara',searchPh:'İş adı veya sonraki adım',noMatches:'Aramana uyan iş yok.',repeat:'Yarın için kopyala',restore:'Son silmeyi geri al',deleted:'İş silindi. Sonraki değişikliğe veya yenilemeye kadar geri alabilirsin.',restored:'Silinen iş geri alındı.',copied:'Yarın için yeni bir kopya eklendi. Asıl iş korundu.',invalid:'İş adını ve 1–180 arasında tam sayı süreyi kontrol et.'},
 en:{search:'Search your tasks',searchPh:'Task name or next step',noMatches:'No tasks match your search.',repeat:'Copy for tomorrow',restore:'Undo last deletion',deleted:'Task deleted. You can undo until your next change or refresh.',restored:'Deleted task restored.',copied:'A new copy was added for tomorrow. The original is unchanged.',invalid:'Check the task name and a whole-number duration from 1 to 180.'},
 de:{search:'Aufgaben durchsuchen',searchPh:'Aufgabe oder nächster Schritt',noMatches:'Keine passenden Aufgaben.',repeat:'Für morgen kopieren',restore:'Letztes Löschen rückgängig',deleted:'Aufgabe gelöscht. Bis zur nächsten Änderung oder zum Neuladen rückgängig machbar.',restored:'Gelöschte Aufgabe wiederhergestellt.',copied:'Eine Kopie für morgen wurde hinzugefügt. Das Original bleibt unverändert.',invalid:'Prüfe den Namen und eine ganze Minutenzahl von 1 bis 180.'},
 es:{search:'Buscar en tus tareas',searchPh:'Nombre o siguiente paso',noMatches:'Ninguna tarea coincide.',repeat:'Copiar para mañana',restore:'Deshacer último borrado',deleted:'Tarea borrada. Puedes deshacer hasta el próximo cambio o actualización.',restored:'Tarea borrada recuperada.',copied:'Se añadió una copia para mañana. El original no cambia.',invalid:'Revisa el nombre y una duración entera de 1 a 180 minutos.'}
};
Object.keys(extras).forEach(lang=>Object.assign(copy[lang],extras[lang]));
const budgetErrors={tr:'Boş vaktini 1–180 arasında tam sayı dakika olarak yaz.',en:'Enter your available time as a whole number from 1 to 180 minutes.',de:'Gib 1–180 ganze Minuten als verfügbare Zeit ein.',es:'Introduce entre 1 y 180 minutos enteros disponibles.'};
Object.keys(budgetErrors).forEach(lang=>copy[lang].invalidBudget=budgetErrors[lang]);
const C=()=>copy[curLang]||copy.en;
let tasks=[],revision=0,user=null,csrf=null,guestRaw=null,epoch=0,busy=true,blocked=false,editing=null,message='loading',undoTasks=null;
function node(tag,id){const e=document.createElement(tag);if(id)e.id=id;return e;}
const panel=node('section','mb-planner');panel.className='mb-planner';
const heading=node('h2'),intro=node('p'),privacy=node('p'),status=node('p','mb-planner-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const form=node('form','mb-planner-form'),labels={};
function field(key,type){const label=node('label'),text=node('span'),input=node(type==='select'?'select':'input','mb-task-'+key);if(type!=='select')input.type=type;label.append(text,input);form.append(label);labels[key]=text;return input;}
const title=field('task','text'),step=field('step','text'),duration=field('minutes','number'),due=field('due','date'),priority=field('priority','select');
title.required=true;title.maxLength=240;step.maxLength=300;duration.min='1';duration.max='180';duration.step='1';duration.required=true;duration.value='15';
for(const key of ['normal','important']){const o=node('option');o.value=key;priority.append(o);}
function button(key,fn,id){const b=node('button',id);b.type='button';b.dataset.copy=key;b.addEventListener('click',fn);return b;}
const submit=node('button','mb-task-save');submit.type='submit';const cancel=button('cancel',resetForm,'mb-task-cancel');form.append(submit,cancel);
const budgetLabel=node('label'),budgetText=node('span'),budget=node('input','mb-planner-budget');budget.type='number';budget.min='1';budget.max='180';budget.step='1';budget.value='25';budgetLabel.append(budgetText,budget);
const suggest=node('div','mb-planner-suggestion'),summary=node('p','mb-planner-summary'),groups=node('div','mb-planner-groups');
const refresh=button('refresh',()=>load(false),'mb-planner-refresh'),download=button('export',downloadPlan,'mb-planner-export');const restore=button('restore',()=>{if(undoTasks)mutate(undoTasks,()=>{message='restored';});},'mb-planner-undo');
const searchLabel=node('label'),searchText=node('span'),search=node('input','mb-planner-search');search.type='search';search.maxLength=240;searchLabel.append(searchText,search);
const searchStatus=node('p','mb-planner-search-status');searchStatus.setAttribute('role','status');
panel.append(heading,intro,privacy,form,budgetLabel,suggest,summary,status,refresh,download,restore,searchLabel,searchStatus,groups);
document.getElementById('mb-focus-plan').before(panel);
const homeButton=button('open',()=>{window.showPage('tools');panel.scrollIntoView({behavior:'smooth',block:'start'});title.focus({preventScroll:true});},'mb-planner-open');homeButton.className='btn-solid';document.querySelector('#page-home .hero-inner')?.append(homeButton);
function resetForm(){editing=null;title.value=step.value=due.value='';duration.value='15';priority.value='normal';render();}
function today(){return Core.dateKey();}
function action(task,key,fn){const b=button(key,fn);b.disabled=busy||blocked;b.setAttribute('aria-label',C()[key]+': '+task.title);return b;}
function start(task){
 if(!budget.reportValidity()||!Number.isInteger(Number(budget.value)))return;
 const minutes=Math.min(task.minutes,Number(budget.value));if(!Number.isInteger(minutes)||minutes<1||minutes>180)return;
 if(!window.mbStartPlannerTask?.(task,minutes)){message='blocked';render();return;}
 message='started';render();document.getElementById('mb-focus-plan').scrollIntoView({behavior:'smooth',block:'start'});
}
function render(){
 restore.hidden=!undoTasks;restore.disabled=busy||blocked;searchText.textContent=C().search;search.placeholder=C().searchPh;
 heading.textContent=C().title;intro.textContent=C().intro;privacy.textContent=user?C().account:C().guest;status.textContent=C()[message]||'';
 for(const key in labels)labels[key].textContent=C()[key];for(const o of priority.options)o.textContent=C()[o.value];
 title.placeholder=C().ph;step.placeholder=C().stepPh;submit.textContent=editing?C().save:C().add;cancel.hidden=!editing;budgetText.textContent=C().budget;
 panel.querySelectorAll('[data-copy]').forEach(b=>b.textContent=C()[b.dataset.copy]);homeButton.textContent=C().open;
 form.querySelectorAll('input,select,button').forEach(e=>e.disabled=busy||blocked);refresh.disabled=busy;download.disabled=busy||blocked;
 const active=tasks.filter(t=>!t.done),ready=active.filter(t=>!t.due||t.due<=today());summary.textContent=`${C().total}: ${active.length} · ${C().load}: ${ready.reduce((n,t)=>n+t.minutes,0)} ${C().min}`;
 suggest.replaceChildren();const recommended=Core.recommend(tasks,Number(budget.value),today());
 if(recommended){const h=node('h3'),name=node('p'),reason=node('p'),next=node('p');h.textContent=C().suggest;name.className='mb-suggest-title';name.textContent=recommended.task.title;reason.textContent=recommended.partial?C().part:C()[recommended.reason==='priority'?'priorityReason':recommended.reason];next.textContent=(recommended.task.step||recommended.task.title)+' · '+recommended.minutes+' '+C().min;suggest.append(h,name,next,reason,action(recommended.task,'begin',()=>start(recommended.task)));}
 else{const p=node('p'),n=Number(budget.value);p.textContent=Number.isInteger(n)&&n>=1&&n<=180?C().empty:C().invalidBudget;suggest.append(p);}
 groups.replaceChildren();let matched=0;
 const normalize=value=>value.toLocaleLowerCase(curLang).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 const terms=normalize(search.value.trim()).split(/\s+/).filter(Boolean);
 for(const [key,list] of [['ready',ready],['later',active.filter(t=>t.due>today())],['finished',tasks.filter(t=>t.done)]]){
  const section=node('section'),h=node('h3');h.textContent=C()[key]+' ('+list.length+')';section.append(h);
  for(const task of list.filter(t=>terms.every(term=>normalize(t.title+' '+t.step).includes(term)))){matched++;const card=node('article'),name=node('h4'),meta=node('p'),next=node('p'),actions=node('div');card.className='mb-task';card.dataset.taskId=task.id;name.textContent=task.title;meta.textContent=[task.minutes+' '+C().min,C()[task.priority],task.due].filter(Boolean).join(' · ');next.textContent=task.step;actions.className='mb-task-actions';
   if(!task.done)actions.append(action(task,'begin',()=>start(task)));
   actions.append(action(task,task.done?'undo':'done',()=>mutate(tasks.map(t=>t.id===task.id?{...t,done:!t.done}:t))),action(task,'edit',()=>{editing=task.id;title.value=task.title;step.value=task.step;duration.value=task.minutes;due.value=task.due;priority.value=task.priority;message='editHint';render();form.scrollIntoView({block:'center',behavior:'smooth'});step.focus();}));
   if(!task.done)actions.append(action(task,'tomorrow',()=>mutate(tasks.map(t=>t.id===task.id?{...t,due:Core.nextDay()}:t))));
   actions.append(action(task,'repeat',()=>mutate([...tasks,{...task,id:crypto.randomUUID(),due:Core.nextDay(),done:false}],()=>{message='copied';})),action(task,'remove',()=>{if(window.confirm(C().confirm)){const before=tasks.map(t=>({...t}));mutate(tasks.filter(t=>t.id!==task.id),()=>{if(editing===task.id)resetForm();undoTasks=before;message='deleted';});}}));card.append(name,meta,next,actions);section.append(card);
  }groups.append(section);
 }
 searchStatus.textContent=terms.length&&!matched?C().noMatches:'';
}
async function api(path,body){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{const options={credentials:'same-origin',cache:'no-store',signal:controller.signal};if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-MindBridge-Client':'v5','X-CSRF-Token':csrf||''};options.body=JSON.stringify(body);}const response=await fetch(path,options),data=await response.json();if(!response.ok){const error=new Error('request');error.code=data.error?.code;throw error;}return data;}finally{clearTimeout(timeout);}}
function readGuest(){const raw=localStorage.getItem(KEY);let parsed=[];try{parsed=raw?JSON.parse(raw):[];}catch{throw new Error('corrupt');}if(!Core.valid(parsed))throw new Error('corrupt');return {raw,tasks:parsed};}
async function load(clear){
 undoTasks=null;const previousUser=user?.id||null;const own=++epoch;busy=true;blocked=true;tasks=[];if(clear){search.value='';user=null;csrf=null;editing=null;title.value=step.value=due.value='';}message='loading';render();
 try{
  const account=location.protocol==='file:'?{user:null,csrf:null}:await api('/api/auth/me');if(own!==epoch)return;
  if(previousUser!==(account.user?.id||null)){search.value='';editing=null;title.value=step.value=due.value='';}
  if(account.user){user=account.user;csrf=account.csrf;const data=await api('/api/planner');if(own!==epoch)return;if(data.user_id!==user.id||!Core.valid(data.tasks)||!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error('identity');tasks=data.tasks;revision=data.revision;}
  else{user=null;csrf=null;const local=readGuest();tasks=local.tasks;guestRaw=local.raw;revision=0;}
  if(editing&&!tasks.some(t=>t.id===editing))editing=null;
  blocked=false;message='';
 }catch(e){if(own===epoch)message=e.message==='corrupt'?'corrupt':'error';}
 finally{if(own===epoch){busy=false;render();}}
}
async function mutate(next,after){
 if(busy||blocked)return;if(!Core.valid(next)){message='limit';render();return;}
 const own=epoch;busy=true;message='loading';render();
 try{
  if(user){const data=await api('/api/planner',{revision,tasks:next});if(own!==epoch)return;if(data.user_id!==user.id||!Core.valid(data.tasks)||!Number.isSafeInteger(data.revision)||data.revision!==revision+1)throw new Error('identity');tasks=data.tasks;revision=data.revision;}
  else{const latest=readGuest();if(latest.raw!==guestRaw){const error=new Error('conflict');error.code='planner_conflict';throw error;}const raw=JSON.stringify(next);localStorage.setItem(KEY,raw);guestRaw=raw;tasks=next;}
  undoTasks=null;message='saved';if(after)after();
 }catch(e){if(own===epoch){message=e.code==='planner_conflict'?'conflict':e.message==='corrupt'?'corrupt':'error';if(message==='conflict'||message==='corrupt')blocked=true;}}
 finally{if(own===epoch){busy=false;render();}}
}
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const task={id:editing||crypto.randomUUID(),title:title.value.trim(),step:step.value.trim(),minutes:Number(duration.value),priority:priority.value,due:due.value,done:editing?!!tasks.find(t=>t.id===editing)?.done:false};if(!Core.valid([task])){message='invalid';render();return;}mutate(editing?tasks.map(t=>t.id===editing?task:t):[...tasks,task],resetForm);});
function downloadPlan(){const blob=new Blob([JSON.stringify({version:1,tasks},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='mindbridge-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
budget.addEventListener('input',render);
search.addEventListener('input',render);
window.addEventListener('mb:account-changed',()=>load(true));
window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&!user){blocked=true;message='conflict';render();}});
window.addEventListener('focus',()=>{if(!busy)render();});
const previous=window.applyI18n;window.applyI18n=function(){previous();render();};
load(true);
})();
