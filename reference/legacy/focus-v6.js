/* One goal per timer session. Review is self-reported; nothing is saved automatically. */
(() => {
'use strict';
const el=id=>document.getElementById(id);
const COPY={
en:{title:'One session, one goal',intro:'Choose a concrete result and the first small step. The timer measures time; you decide whether the task was completed.',goal:'What will you finish?',goalPh:'Example: write the introduction paragraph',step:'What is the first small step?',stepPh:'Example: open the document and write one sentence',minutes:'Minutes (1–180)',start:'Start this session',pause:'Pause session',resume:'Resume session',again:'Start another session',clear:'Clear plan',review:'Time is up. What happened?',done:'Completed',partial:'Partly completed',notDone:'Not completed',note:'What helped or got in the way? (optional)',transfer:'Add review to journal draft',copied:'Added to your journal draft. Use Save Entry there to keep it.',invalid:'Enter a goal, a first step and a whole duration from 1 to 180 minutes.',other:'Another timer is running. Pause or reset it before starting this plan.',running:'Session running.',paused:'Session paused; your goal is kept.',reset:'Timer reset; your goal is kept. Start again when ready.',ready:'Plan ready.',choose:'Choose an outcome first.',full:'Your journal draft has no room for this review. Nothing was overwritten.',privacy:'This plan stays only in the open page and disappears on reload or account change. Journal transfer is optional; it does not save or send anything to AI.',summary:'Focus session review',target:'Goal',first:'First step',length:'Planned duration',outcome:'Self-reported outcome'},
tr:{title:'Bir oturum, bir hedef',intro:'Somut bir sonuç ve ilk küçük adımı seç. Sayaç zamanı ölçer; işin tamamlanıp tamamlanmadığını sen belirtirsin.',goal:'Bu oturumda neyi bitireceksin?',goalPh:'Örnek: giriş paragrafını yazmak',step:'İlk küçük adımın ne?',stepPh:'Örnek: belgeyi açıp bir cümle yazmak',minutes:'Dakika (1–180)',start:'Bu oturumu başlat',pause:'Oturumu duraklat',resume:'Oturuma devam et',again:'Yeni oturum başlat',clear:'Planı temizle',review:'Süre bitti. Sonuç ne oldu?',done:'Tamamlandı',partial:'Kısmen tamamlandı',notDone:'Tamamlanmadı',note:'Ne yardımcı oldu veya engel oldu? (isteğe bağlı)',transfer:'Değerlendirmeyi günlük taslağına ekle',copied:'Günlük taslağına eklendi. Kalıcı tutmak için oradaki Kaydı Sakla düğmesine bas.',invalid:'Hedef, ilk adım ve 1–180 arasında tam sayı süre gir.',other:'Başka bir sayaç çalışıyor. Bu planı başlatmadan önce duraklat veya sıfırla.',running:'Oturum sürüyor.',paused:'Oturum duraklatıldı; hedefin korunuyor.',reset:'Sayaç sıfırlandı; hedefin korunuyor. Hazır olduğunda yeniden başlat.',ready:'Plan hazır.',choose:'Önce sonucu seç.',full:'Günlük taslağında bu değerlendirme için yer yok. Hiçbir yazının üzerine yazılmadı.',privacy:'Plan yalnızca açık sayfada kalır; yenileme veya hesap değişiminde silinir. Günlüğe aktarmak isteğe bağlıdır; otomatik kayıt veya AI’ye gönderim yapmaz.',summary:'Odak oturumu değerlendirmesi',target:'Hedef',first:'İlk adım',length:'Planlanan süre',outcome:'Kullanıcının belirttiği sonuç'},
de:{title:'Eine Sitzung, ein Ziel',intro:'Wähle ein konkretes Ergebnis und den ersten kleinen Schritt. Der Timer misst Zeit; du bewertest das Ergebnis.',goal:'Was willst du abschließen?',goalPh:'Beispiel: Einleitungsabsatz schreiben',step:'Was ist der erste kleine Schritt?',stepPh:'Beispiel: Dokument öffnen und einen Satz schreiben',minutes:'Minuten (1–180)',start:'Sitzung starten',pause:'Sitzung pausieren',resume:'Sitzung fortsetzen',again:'Neue Sitzung starten',clear:'Plan löschen',review:'Zeit abgelaufen. Was ist passiert?',done:'Abgeschlossen',partial:'Teilweise abgeschlossen',notDone:'Nicht abgeschlossen',note:'Was hat geholfen oder gestört? (optional)',transfer:'Bewertung zum Tagebuchentwurf hinzufügen',copied:'Zum Entwurf hinzugefügt. Speichere den Eintrag im Tagebuch.',invalid:'Gib Ziel, ersten Schritt und eine ganze Dauer von 1 bis 180 Minuten an.',other:'Ein anderer Timer läuft. Pausiere oder setze ihn zuerst zurück.',running:'Sitzung läuft.',paused:'Sitzung pausiert; Ziel bleibt erhalten.',reset:'Timer zurückgesetzt; Ziel bleibt erhalten.',ready:'Plan bereit.',choose:'Wähle zuerst ein Ergebnis.',full:'Im Tagebuchentwurf ist nicht genug Platz. Nichts wurde überschrieben.',privacy:'Der Plan bleibt nur auf der geöffneten Seite und verschwindet beim Neuladen oder Kontowechsel. Die Übertragung ist optional und speichert nichts automatisch; nichts geht an KI.',summary:'Fokussitzungsbewertung',target:'Ziel',first:'Erster Schritt',length:'Geplante Dauer',outcome:'Selbstberichtetes Ergebnis'},
es:{title:'Una sesión, un objetivo',intro:'Elige un resultado concreto y el primer paso pequeño. El temporizador mide tiempo; tú evalúas el resultado.',goal:'¿Qué vas a terminar?',goalPh:'Ejemplo: escribir el párrafo inicial',step:'¿Cuál es el primer paso pequeño?',stepPh:'Ejemplo: abrir el documento y escribir una frase',minutes:'Minutos (1–180)',start:'Iniciar sesión de trabajo',pause:'Pausar sesión',resume:'Reanudar sesión',again:'Iniciar otra sesión',clear:'Borrar plan',review:'Se acabó el tiempo. ¿Qué pasó?',done:'Completado',partial:'Parcialmente completado',notDone:'No completado',note:'¿Qué ayudó o dificultó? (opcional)',transfer:'Añadir evaluación al borrador del diario',copied:'Añadido al borrador. Guarda la entrada desde el diario.',invalid:'Introduce un objetivo, primer paso y duración entera de 1 a 180 minutos.',other:'Hay otro temporizador activo. Páusalo o reinícialo antes.',running:'Sesión en curso.',paused:'Sesión pausada; se conserva el objetivo.',reset:'Temporizador reiniciado; se conserva el objetivo.',ready:'Plan listo.',choose:'Elige primero un resultado.',full:'No cabe en el borrador del diario. No se sobrescribió nada.',privacy:'El plan solo permanece en esta página abierta y desaparece al recargar o cambiar de cuenta. Transferirlo es opcional y no lo guarda ni envía a la IA automáticamente.',summary:'Evaluación de sesión de enfoque',target:'Objetivo',first:'Primer paso',length:'Duración prevista',outcome:'Resultado indicado por el usuario'}
};
const C=()=>COPY[curLang]||COPY.en;let plan=null,phase='ready',result=null,statusKey='ready',copied=false;
function node(tag,id){const n=document.createElement(tag);if(id)n.id=id;return n;}
const panel=node('section','mb-focus-plan');panel.className='mb-account-panel mb-focus-plan';
const title=node('h2'),intro=node('p'),privacy=node('p'),status=node('p','mb-focus-status');intro.className=privacy.className='mb-account-note';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const form=node('form','mb-focus-form'),goal=node('input','mb-focus-goal'),step=node('input','mb-focus-step'),minutes=node('input','mb-focus-minutes');goal.type=step.type='text';goal.maxLength=240;step.maxLength=300;goal.required=step.required=true;minutes.type='number';minutes.min='1';minutes.max='180';minutes.step='1';minutes.value='25';minutes.required=true;
function field(input){const label=node('label'),span=node('span');label.append(span,input);form.append(label);return span;}
const goalLabel=field(goal),stepLabel=field(step),minutesLabel=field(minutes);
const start=node('button','mb-focus-start');start.type='submit';start.className='btn-solid';const clear=node('button','mb-focus-clear');clear.type='button';clear.className='btn-outline';form.append(start,clear);
const review=node('div','mb-focus-review'),reviewHeading=node('h3'),outcomes=node('div'),noteLabel=node('label'),noteText=node('span'),note=node('textarea','mb-focus-note');note.maxLength=500;noteLabel.append(noteText,note);
const resultButtons={};for(const key of ['done','partial','notDone']){const b=node('button','mb-focus-'+key);b.type='button';b.className='btn-outline';b.addEventListener('click',()=>{result=key;statusKey='ready';copied=false;view();});resultButtons[key]=b;outcomes.append(b);}
const recap=node('p','mb-focus-recap');const transfer=node('button','mb-focus-transfer');transfer.type='button';transfer.className='btn-outline';review.append(reviewHeading,recap,outcomes,noteLabel,transfer);panel.append(title,intro,form,status,review,privacy);document.querySelector('#page-tools .tools-grid').before(panel);
function view(){
 title.textContent=C().title;intro.textContent=C().intro;privacy.textContent=C().privacy;
 goalLabel.textContent=C().goal;stepLabel.textContent=C().step;minutesLabel.textContent=C().minutes;goal.placeholder=C().goalPh;step.placeholder=C().stepPh;
 const locked=phase==='running'||phase==='paused';goal.disabled=step.disabled=minutes.disabled=locked;
 start.textContent=phase==='running'?C().pause:phase==='paused'?C().resume:phase==='review'?C().again:C().start;clear.textContent=C().clear;
 review.hidden=phase!=='review';reviewHeading.textContent=C().review;recap.textContent=plan?C().target+': '+plan.goal+'\n'+C().first+': '+plan.step:'';noteText.textContent=C().note;transfer.textContent=C().transfer;transfer.disabled=!result||copied;
 for(const key in resultButtons){resultButtons[key].textContent=C()[key];resultButtons[key].setAttribute('aria-pressed',String(result===key));}
 status.textContent=C()[statusKey]||C().ready;
}
form.addEventListener('submit',e=>{
 e.preventDefault();if(phase==='running'||phase==='paused'){window.toggleTimer();return;}
 const duration=Number(minutes.value),target=goal.value.trim(),first=step.value.trim();
 if(!target||!first||target.length>240||first.length>300||!Number.isInteger(duration)||duration<1||duration>180){statusKey='invalid';view();return;}
 if(el('timer-btn').getAttribute('aria-pressed')==='true'){statusKey='other';view();return;}
 el('timer-minutes').value=String(duration);window.setTimerFromInput();el('mb-timer-reset').click();
 plan={goal:target,step:first,minutes:duration};result=null;copied=false;note.value='';phase='running';statusKey='running';window.toggleTimer();view();
});
function clearPlan(){const owned=plan&&(phase==='running'||phase==='paused');plan=null;phase='ready';result=null;copied=false;goal.value=step.value=note.value='';statusKey='ready';if(owned)el('mb-timer-reset').click();view();}
clear.addEventListener('click',clearPlan);
window.addEventListener('mb:focus-state',e=>{
 if(!plan)return;const state=e.detail.state;
 if(state==='running'&&(phase==='running'||phase==='paused')){phase='running';statusKey='running';}
 else if(state==='paused'&&phase==='running'){phase='paused';statusKey='paused';}
 else if(state==='complete'&&(phase==='running'||phase==='paused')){phase='review';statusKey='review';}
 else if(state==='idle'&&(phase==='running'||phase==='paused')){phase='ready';statusKey='reset';}
 view();
});
transfer.addEventListener('click',()=>{
 if(!plan||phase!=='review'||copied)return;if(!result){statusKey='choose';view();return;}
 const text=[C().summary,C().target+': '+plan.goal,C().first+': '+plan.step,C().length+': '+plan.minutes+' min',C().outcome+': '+C()[result],note.value.trim()?C().note+': '+note.value.trim():''].filter(Boolean).join('\n');
 const journal=el('journal-input'),draft=journal.value?journal.value+'\n\n'+text:text;
 if(draft.length>10000){statusKey='full';view();return;}
 journal.value=draft;copied=true;statusKey='copied';view();journal.closest('.tool-card')?.scrollIntoView({behavior:'smooth',block:'center'});journal.focus();
});
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();view();};
window.addEventListener('mb:account-changed',clearPlan);view();
})();
