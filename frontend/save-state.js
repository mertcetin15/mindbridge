/* Honest save feedback for the Journal.
   Journal text is never stored until the user presses Save, so this module only reports facts:
   - typing  -> "Not saved yet" (text lives only on this open page)
   - pressing Save -> "Saving…", then "Saved" only if the existing save code cleared the field,
     which it does solely after the write succeeded; otherwise "Not saved" and the text stays.
   - leaving the page with unsaved text asks the browser to confirm.
   Every state pairs a distinct symbol with words, so it never relies on colour alone. */
(() => {
'use strict';
const COPY={
 en:{unsaved:'Not saved yet. This text stays only on this open page until you press Save.',saving:'Saving…',failed:'Not saved. Your text is still here; you can try again.',at:'Last confirmed',leave:'You have unsaved journal text.'},
 tr:{unsaved:'Henüz kaydedilmedi. Bu yazı, Kaydet’e basana kadar yalnızca bu açık sayfada durur.',saving:'Kaydediliyor…',failed:'Kaydedilmedi. Yazın burada duruyor; yeniden deneyebilirsin.',at:'Son onay',leave:'Kaydedilmemiş günlük yazın var.'},
 de:{unsaved:'Noch nicht gespeichert. Dieser Text bleibt nur auf dieser geöffneten Seite, bis du Speichern drückst.',saving:'Wird gespeichert…',failed:'Nicht gespeichert. Dein Text ist noch da; du kannst es erneut versuchen.',at:'Zuletzt bestätigt',leave:'Du hast ungespeicherten Tagebuchtext.'},
 es:{unsaved:'Aún sin guardar. Este texto solo está en esta página abierta hasta que pulses Guardar.',saving:'Guardando…',failed:'No se guardó. Tu texto sigue aquí; puedes intentarlo de nuevo.',at:'Última confirmación',leave:'Tienes texto del diario sin guardar.'}
};
const C=()=>COPY[curLang]||COPY.en;
const input=document.getElementById('journal-input'),status=document.getElementById('journal-status');
if(!input||!status||typeof window.saveJournal!=='function')return;
const SYMBOL={unsaved:'✎',saving:'…',saved:'✓',failed:'!'};
const state=document.createElement('p');state.id='mb-journal-state';state.className='mb-save-state';
state.setAttribute('role','status');state.setAttribute('aria-live','polite');
status.before(state);
// Existing record messages were silent for screen readers.
for(const id of ['journal-status','gratitude-status']){const n=document.getElementById(id);if(n){n.setAttribute('role','status');n.setAttribute('aria-live','polite');}}
let mode='idle',confirmedAt=null,busy=false;
const clock=d=>d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
function render(){
 if(mode==='idle'){state.textContent='';state.removeAttribute('data-state');return;}
 const text=mode==='unsaved'?C().unsaved:mode==='saving'?C().saving:mode==='failed'?(status.textContent.trim()||C().failed)
  :status.textContent.trim()+(confirmedAt?' ('+C().at+' '+clock(confirmedAt)+')':'');
 state.setAttribute('data-state',mode);state.textContent=SYMBOL[mode]+' '+text;
}
input.addEventListener('input',()=>{if(busy)return;mode=input.value.trim()?'unsaved':'idle';render();});
const original=window.saveJournal;
window.saveJournal=async function(){
 if(busy)return;
 if(!input.value.trim())return original.apply(this,arguments);   // existing "write something first" message
 busy=true;mode='saving';render();
 try{await Promise.resolve(original.apply(this,arguments));}catch(e){}
 busy=false;
 // The field is emptied only by the existing code after a confirmed write.
 if(input.value.trim()===''){mode='saved';confirmedAt=new Date();}else{mode='failed';}
 render();
};
window.addEventListener('beforeunload',event=>{
 if(!input.value.trim())return;
 event.preventDefault();event.returnValue=C().leave;return C().leave;
});
const previousI18n=window.applyI18n;
window.applyI18n=function(){previousI18n();render();};
})();
