
/* Stage 2: local persistence. No network requests or encryption claims. */
(() => {
'use strict';
const KEY='mindbridge.entries.v2';
const types=['journal','gratitude','mood'];
const moods=['😫','😞','😐','🙂','🤩'];
const copy={
en:{history:'History',empty:'No entries yet.',del:'Delete',confirm:'Delete this entry?',saved:'Saved in this browser.',error:'Could not save. Your input has been kept. Check browser storage permissions or available space.',readError:'Saved data cannot be read. Existing data has not been overwritten.',blank:'Write something before saving.',long:'Text is too long.',privacy:'Stored only in this browser, without encryption. Other people using this browser profile can read it. Clearing browser data may erase entries; private browsing may not retain them.',labels:['Very low','Low','Neutral','Good','Very good']},
tr:{history:'Kayıt geçmişi',empty:'Henüz kayıt yok.',del:'Sil',confirm:'Bu kayıt silinsin mi?',saved:'Bu tarayıcıya kaydedildi.',error:'Kaydedilemedi. Yazın korunuyor. Tarayıcı depolama izinlerini veya boş alanı kontrol et.',readError:'Kayıtlar okunamıyor. Mevcut verilerin üzerine yazılmadı.',blank:'Kaydetmeden önce bir şey yaz.',long:'Yazı çok uzun.',privacy:'Yalnızca bu tarayıcıda, şifrelenmeden saklanır. Aynı tarayıcı profilini kullanan kişiler okuyabilir. Tarayıcı verilerini temizlemek kayıtları silebilir; gizli modda kalıcı olmayabilir.',labels:['Çok kötü','Kötü','Orta','İyi','Çok iyi']},
de:{history:'Verlauf',empty:'Noch keine Einträge.',del:'Löschen',confirm:'Diesen Eintrag löschen?',saved:'In diesem Browser gespeichert.',error:'Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten. Prüfe Speicherberechtigungen oder freien Speicher.',readError:'Gespeicherte Daten können nicht gelesen werden. Sie wurden nicht überschrieben.',blank:'Schreibe vor dem Speichern etwas.',long:'Der Text ist zu lang.',privacy:'Nur in diesem Browser, unverschlüsselt gespeichert. Andere Personen mit diesem Browserprofil können die Daten lesen. Das Löschen von Browserdaten kann Einträge entfernen; private Fenster speichern möglicherweise nicht dauerhaft.',labels:['Sehr schlecht','Schlecht','Neutral','Gut','Sehr gut']},
es:{history:'Historial',empty:'Todavía no hay entradas.',del:'Eliminar',confirm:'¿Eliminar esta entrada?',saved:'Guardado en este navegador.',error:'No se pudo guardar. Tu texto se conserva. Revisa los permisos o el espacio disponible.',readError:'No se pueden leer los datos guardados. No se han sobrescrito.',blank:'Escribe algo antes de guardar.',long:'El texto es demasiado largo.',privacy:'Guardado solo en este navegador, sin cifrado. Otras personas que usen este perfil pueden leerlo. Borrar los datos del navegador puede eliminar las entradas; el modo privado puede no conservarlas.',labels:['Muy mal','Mal','Neutral','Bien','Muy bien']}
};
const C=()=>copy[curLang]||copy.en;
const statusIds={journal:'journal-status',gratitude:'gratitude-status',mood:'mood-feedback'};
function status(type,message){const e=document.getElementById(statusIds[type]);e.textContent=message;e.style.opacity='1';}
function load(){
 const raw=localStorage.getItem(KEY);if(raw===null)return {version:2,entries:[]};
 const data=JSON.parse(raw);
 if(data.version!==2||!Array.isArray(data.entries)||data.entries.some(e=>!e||typeof e.id!=='string'||!types.includes(e.type)||typeof e.text!=='string'||!Number.isFinite(Date.parse(e.at))||(e.type==='mood'&&!moods.includes(e.text)))||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw Error('Invalid stored data');
 return data;
}
function commit(data){localStorage.setItem(KEY,JSON.stringify(data));}
function render(){
 let data;try{data=load();}catch(_){types.forEach(t=>{document.getElementById('mb-list-'+t).replaceChildren();status(t,C().readError);});return;}
 types.forEach(type=>{
  const list=document.getElementById('mb-list-'+type);list.replaceChildren();
  const entries=data.entries.filter(e=>e.type===type).reverse();
  if(!entries.length){const li=document.createElement('li');li.textContent=C().empty;list.append(li);}
  entries.forEach(entry=>{
   const li=document.createElement('li'),time=document.createElement('time'),body=document.createElement('p'),button=document.createElement('button');
   time.dateTime=entry.at;time.textContent=new Date(entry.at).toLocaleString(({en:'en-GB',tr:'tr-TR',de:'de-DE',es:'es-ES'})[curLang]||'en-GB');
   body.className='mb-entry-text';body.textContent=entry.type==='mood'?entry.text+' '+C().labels[moods.indexOf(entry.text)]:entry.text;
   button.type='button';button.className='mb-delete';button.textContent=C().del;
   button.addEventListener('click',()=>{if(!window.confirm(C().confirm))return;try{const fresh=load();fresh.entries=fresh.entries.filter(e=>e.id!==entry.id);commit(fresh);render();document.getElementById('mb-summary-'+type).focus();}catch(_){status(type,C().error);}});
   li.append(time,body,button);list.append(li);
  });
 });
}
function save(type,text,onSuccess){
 if(!text.trim()){status(type,C().blank);return false;}
 if(text.length>(type==='journal'?10000:1000)){status(type,C().long);return false;}
 let data;try{data=load();}catch(_){status(type,C().readError);return false;}
 try{data.entries.push({id:globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),type,text:text.trim(),at:new Date().toISOString()});commit(data);}catch(_){status(type,C().error);return false;}
 onSuccess?.();render();status(type,C().saved);return true;
}
window.saveJournal=()=>{const input=document.getElementById('journal-input');save('journal',input.value,()=>{input.value='';});};
window.saveGratitude=()=>{const input=document.getElementById('gratitude-input');save('gratitude',input.value,()=>{input.value='';});};
window.selectMood=button=>{if(save('mood',button.textContent.trim()))document.querySelectorAll('.mood-btn').forEach(b=>{const active=b===button;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});};
function translate(){
 types.forEach(type=>{document.getElementById('mb-summary-'+type).textContent=C().history;document.getElementById('mb-privacy-'+type).textContent=C().privacy;status(type,'');});
 document.querySelectorAll('.mood-btn').forEach((b,i)=>b.setAttribute('aria-label',C().labels[i]));render();
}
types.forEach(type=>{
 const statusEl=document.getElementById(statusIds[type]);statusEl.removeAttribute('data-i18n');statusEl.classList.add('mb-status');statusEl.setAttribute('role','status');statusEl.setAttribute('aria-live','polite');
 const details=document.createElement('details'),summary=document.createElement('summary'),list=document.createElement('ol'),privacy=document.createElement('p');
 details.className='mb-history';summary.id='mb-summary-'+type;summary.tabIndex=0;list.id='mb-list-'+type;privacy.id='mb-privacy-'+type;privacy.className='mb-privacy';details.append(summary,list);statusEl.after(privacy,details);
 if(type!=='mood'){const input=document.getElementById(type+'-input');input.maxLength=type==='journal'?10000:1000;input.setAttribute('aria-labelledby','mb-heading-'+type);const heading=input.closest('.tool-card')?.querySelector('h3')||statusEl.parentElement.querySelector('h3');if(heading)heading.id='mb-heading-'+type;}
});
document.querySelectorAll('.mood-btn').forEach(b=>{b.type='button';b.setAttribute('aria-pressed','false');});
const originalApply=window.applyI18n;window.applyI18n=function(){originalApply();translate();};
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)render();});
translate();
})();
