/* First visit and "what do I need right now" on the home page.
   Orientation: four plain pointers (Begin, Journal, a timer, help). It never asks anything about the person,
   does not block the page, and can be skipped for now or hidden for good.
   Right now (optional): the person picks the sentence closest to the moment. The page answers with one
   clearly explained suggestion. This is not saved, not sent, not a label and not an assessment; the
   one thing it may change (a simpler view, a shorter timer) is reversible with one button and is never
   written to the saved preferences. */
(() => {
'use strict';
const KEY='mindbridge.welcome.hidden';
const COPY={
 en:{label:'WELCOME',title:'A quick look around',intro:'Nothing here asks anything about you. Open what you like, in any order.',begin:'Begin',beginD:'Choose a small first step',journal:'Journal',journalD:'Write, or just look at a prompt',timer:'Timer',timerD:'Five minutes is a fine start',help:'Help',helpD:'Find support quickly',skip:'Skip for now',hide:'Do not show this again',hidden:'Welcome hidden. You can still find everything in the menu.',
  rightNow:'Need it simpler right now?',rightIntro:'Optional. Pick the sentence closest to now. This is only a suggestion for this moment: it says nothing about you and is not saved.',
  options:['I have no energy','I do not know where to start','This feels too big','I want it to be perfect'],
  results:{
   low:'Suggested because you chose “I have no energy”: the view is simplified for now and the timer is set to 2 minutes. The timer is open; press Start only if you want to.',
   start:'Suggested because you chose “I do not know where to start”: Begin lists small first steps you can pick from.',
   big:'Suggested because you chose “This feels too big”: Begin can turn it into a smaller step.',
   perfect:'Suggested because you chose “I want it to be perfect”: a rough first pass for 5 minutes, with the timer open. It does not have to be good. Press Start only if you want to.'},
  back:'Back to normal',backed:'Back to normal. Nothing was saved.'},
 tr:{label:'HOŞ GELDİN',title:'Kısa bir bakış',intro:'Burada hiçbir şey senin hakkında bir şey sormaz. Dilediğini, dilediğin sırayla aç.',begin:'Başla',beginD:'Küçük bir ilk adım seç',journal:'Günlük',journalD:'Yaz ya da sadece bir soruya bak',timer:'Sayaç',timerD:'Beş dakika iyi bir başlangıç',help:'Yardım',helpD:'Hızlıca destek bul',skip:'Şimdilik geç',hide:'Bir daha gösterme',hidden:'Karşılama gizlendi. Her şeye menüden ulaşabilirsin.',
  rightNow:'Şu an daha sade mi olsun?',rightIntro:'İsteğe bağlı. Şu ana en yakın cümleyi seç. Bu yalnızca bu an için bir öneri: senin hakkında bir şey söylemez ve kaydedilmez.',
  options:['Hiç enerjim yok','Nereden başlayacağımı bilmiyorum','Bu çok büyük geliyor','Mükemmel olmasını istiyorum'],
  results:{
   low:'“Hiç enerjim yok” dediğin için öneriyoruz: görünüm şimdilik sadeleştirildi ve sayaç 2 dakikaya ayarlandı. Sayaç açık; yalnızca istersen Başlat’a bas.',
   start:'“Nereden başlayacağımı bilmiyorum” dediğin için öneriyoruz: Başla bölümü seçebileceğin küçük ilk adımları listeler.',
   big:'“Bu çok büyük geliyor” dediğin için öneriyoruz: Başla bölümü onu daha küçük bir adıma çevirebilir.',
   perfect:'“Mükemmel olmasını istiyorum” dediğin için öneriyoruz: 5 dakikalık kaba bir ilk deneme, sayaç açık. İyi olmak zorunda değil. Yalnızca istersen Başlat’a bas.'},
  back:'Normale dön',backed:'Normale dönüldü. Hiçbir şey kaydedilmedi.'},
 de:{label:'WILLKOMMEN',title:'Ein kurzer Überblick',intro:'Hier wird nichts über dich abgefragt. Öffne, was du magst, in beliebiger Reihenfolge.',begin:'Beginnen',beginD:'Einen kleinen ersten Schritt wählen',journal:'Tagebuch',journalD:'Schreiben oder nur eine Anregung ansehen',timer:'Timer',timerD:'Fünf Minuten sind ein guter Anfang',help:'Hilfe',helpD:'Schnell Unterstützung finden',skip:'Vorerst überspringen',hide:'Nicht mehr anzeigen',hidden:'Willkommen ausgeblendet. Alles bleibt über das Menü erreichbar.',
  rightNow:'Gerade lieber einfacher?',rightIntro:'Optional. Wähle den Satz, der jetzt am besten passt. Das ist nur ein Vorschlag für diesen Moment: Er sagt nichts über dich aus und wird nicht gespeichert.',
  options:['Ich habe keine Energie','Ich weiß nicht, wo ich anfangen soll','Das fühlt sich zu groß an','Es soll perfekt werden'],
  results:{
   low:'Vorgeschlagen, weil du „Ich habe keine Energie“ gewählt hast: Die Ansicht ist vorerst vereinfacht und der Timer steht auf 2 Minuten. Der Timer ist geöffnet; drücke Start nur, wenn du magst.',
   start:'Vorgeschlagen, weil du „Ich weiß nicht, wo ich anfangen soll“ gewählt hast: Beginnen listet kleine erste Schritte zur Auswahl.',
   big:'Vorgeschlagen, weil du „Das fühlt sich zu groß an“ gewählt hast: Beginnen kann daraus einen kleineren Schritt machen.',
   perfect:'Vorgeschlagen, weil du „Es soll perfekt werden“ gewählt hast: ein grober erster Durchgang für 5 Minuten, der Timer ist geöffnet. Es muss nicht gut sein. Drücke Start nur, wenn du magst.'},
  back:'Zurück zu normal',backed:'Zurück zu normal. Nichts wurde gespeichert.'},
 es:{label:'BIENVENIDA',title:'Un vistazo rápido',intro:'Aquí nada te pregunta sobre ti. Abre lo que quieras, en el orden que quieras.',begin:'Empezar',beginD:'Elige un primer paso pequeño',journal:'Diario',journalD:'Escribe, o solo mira una pregunta',timer:'Temporizador',timerD:'Cinco minutos son un buen comienzo',help:'Ayuda',helpD:'Encuentra apoyo rápido',skip:'Omitir por ahora',hide:'No volver a mostrar',hidden:'Bienvenida oculta. Todo sigue en el menú.',
  rightNow:'¿Prefieres algo más simple ahora?',rightIntro:'Opcional. Elige la frase más cercana a este momento. Es solo una sugerencia para ahora: no dice nada de ti y no se guarda.',
  options:['No tengo energía','No sé por dónde empezar','Esto se siente demasiado grande','Quiero que quede perfecto'],
  results:{
   low:'Sugerido porque elegiste «No tengo energía»: la vista queda simplificada por ahora y el temporizador en 2 minutos. El temporizador está abierto; pulsa Iniciar solo si quieres.',
   start:'Sugerido porque elegiste «No sé por dónde empezar»: Empezar ofrece pequeños primeros pasos para elegir.',
   big:'Sugerido porque elegiste «Esto se siente demasiado grande»: Empezar puede convertirlo en un paso más pequeño.',
   perfect:'Sugerido porque elegiste «Quiero que quede perfecto»: una primera pasada rápida de 5 minutos, con el temporizador abierto. No tiene que quedar bien. Pulsa Iniciar solo si quieres.'},
  back:'Volver a lo normal',backed:'Vuelta a lo normal. No se guardó nada.'}
};
const C=()=>COPY[curLang]||COPY.en;
const home=document.getElementById('page-home');
if(!home)return;
function node(tag,id,cls){const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;}
function text(tag,value,cls){const n=node(tag,'',cls);n.textContent=value;return n;}
function stored(){try{return localStorage.getItem(KEY)==='1';}catch(e){return false;}}
function remember(){try{localStorage.setItem(KEY,'1');}catch(e){/* shown again next visit; no harm */}}

// Where each pointer goes. Tabs and panes are created by product-ui.js; ids are looked up at click time.
function openTool(key){
 window.showPage('tools');
 const tab=document.getElementById('mb-tab-'+key);if(tab)tab.click();
 const pane=document.getElementById('mb-pane-'+key);(pane||tab)?.scrollIntoView?.({block:'start'});(tab||pane)?.focus?.({preventScroll:true});
}
const POINTERS=[['begin',()=>openTool('focus')],['journal',()=>openTool('write')],['timer',()=>openTool('timer')],['help',()=>window.toggleSOS?.()]];

const root=node('section','mb-welcome','mb-welcome');root.setAttribute('aria-labelledby','mb-welcome-title');
const tour=node('div','mb-welcome-tour','mb-welcome-tour'),label=text('span','','mb-editorial-label'),title=node('h2','mb-welcome-title'),intro=node('p','','mb-welcome-intro'),list=node('ul','','mb-welcome-list'),actions=node('div','','mb-welcome-actions');
const skip=node('button','mb-welcome-skip'),hide=node('button','mb-welcome-hide');skip.type=hide.type='button';skip.className=hide.className='mb-welcome-button';
const pointers=POINTERS.map(([key,go])=>{const li=node('li'),b=node('button','mb-welcome-'+key);b.type='button';b.className='mb-welcome-pointer';b.addEventListener('click',go);const strong=node('strong'),small=node('span');b.append(strong,small);li.append(b);list.append(li);return {key,strong,small};});
actions.append(skip,hide);tour.append(label,title,intro,list,actions);
const live=node('p','mb-welcome-status','mb-welcome-status');live.setAttribute('role','status');live.setAttribute('aria-live','polite');

const now=node('details','mb-rightnow','mb-rightnow'),nowSummary=node('summary'),nowIntro=node('p','','mb-welcome-intro'),chips=node('div','','mb-welcome-chips'),result=node('p','mb-rightnow-result','mb-rightnow-result'),back=node('button','mb-rightnow-back');
chips.setAttribute('role','group');back.type='button';back.className='mb-welcome-button';back.hidden=true;result.setAttribute('role','status');result.setAttribute('aria-live','polite');
const KEYS=['low','start','big','perfect'];const chipButtons=KEYS.map(k=>{const b=node('button','mb-rightnow-'+k);b.type='button';b.className='mb-welcome-chip';b.addEventListener('click',()=>choose(k));chips.append(b);return b;});
now.append(nowSummary,nowIntro,chips,result,back);root.append(tour,live,now);
const anchor=document.getElementById('mb-campus-desk')||home.querySelector('.mb-campus-intro');if(anchor)anchor.before(root);else home.append(root);

let chosen=null,changed={simplify:false,timer:false},hiddenForNow=false;
function paint(){
 const c=C();tour.hidden=hiddenForNow||stored();label.textContent=c.label;title.textContent=c.title;intro.textContent=c.intro;skip.textContent=c.skip;hide.textContent=c.hide;
 for(const p of pointers){p.strong.textContent=c[p.key];p.small.textContent=c[p.key+'D'];}
 nowSummary.textContent=c.rightNow;nowIntro.textContent=c.rightIntro;chipButtons.forEach((b,i)=>{b.textContent=c.options[i];b.setAttribute('aria-pressed',String(chosen===KEYS[i]));});
 chips.setAttribute('aria-label',c.rightNow);result.textContent=chosen?c.results[chosen]:'';back.textContent=c.back;back.hidden=!chosen;
}
function undo(){
 if(changed.simplify)window.mbSimplify?.setForNow(false);
 if(changed.timer)window.mbRestoreTimerMinutes?.();
 changed={simplify:false,timer:false};
}
function choose(key){
 undo();chosen=key;
 if(key==='low'){
  if(window.mbSimplify&&!window.mbSimplify.get()){window.mbSimplify.setForNow(true);changed.simplify=true;}
  if(window.mbSetTimerMinutes?.(2))changed.timer=true;openTool('timer');
 }else if(key==='perfect'){
  if(window.mbSetTimerMinutes?.(5))changed.timer=true;openTool('timer');
 }else openTool('focus');
 paint();
}
back.addEventListener('click',()=>{undo();chosen=null;paint();live.textContent=C().backed;});
skip.addEventListener('click',()=>{hiddenForNow=true;paint();});
hide.addEventListener('click',()=>{remember();paint();live.textContent=C().hidden;});
// A momentary choice must not outlive the moment.
window.addEventListener('pagehide',()=>{chosen=null;});
window.addEventListener('mb:account-changed',()=>{undo();chosen=null;paint();});
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();paint();};
paint();
})();
