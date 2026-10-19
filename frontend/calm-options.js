/* Self-check result: when the answers describe a heavy day, a short list of options is added; nothing is replaced
   and nothing starts.
   - Five options of the same weight: Breathing, Grounding, Journaling, Take a break, Continue normally.
   - Choosing one only opens that tool and puts focus on its heading. No exercise, sound or animation starts;
     the person presses Start themselves.
   - "Continue normally" is as large and as prominent as the others and changes nothing.
   - The panel says what Self-check can and cannot tell, and offers a way to reach a person. It names no condition. */
(() => {
'use strict';
const K=window.MBCalmOptions;if(!K)return;
const COPY={
 en:{title:'A few options, your choice',intro:'Your answers describe a heavy day. Nothing will start by itself. Pick what fits, or none.',breathing:'Breathing',grounding:'Grounding',journaling:'Journaling',break:'Take a break',continue:'Continue normally',continued:'Nothing changed. Carry on with your plan below.',limits:'Self-check only reflects the answers you gave today. It cannot tell how you are doing overall and it is not a diagnosis. If you would like to talk to a person, that is always an option.',person:'Reach a person'},
 tr:{title:'Birkaç seçenek, karar senin',intro:'Cevapların yoğun bir günü anlatıyor. Hiçbir şey kendiliğinden başlamaz. Sana uyanı seç, ya da hiçbirini.',breathing:'Nefes',grounding:'Topraklanma',journaling:'Günlük',break:'Mola ver',continue:'Normal devam et',continued:'Hiçbir şey değişmedi. Aşağıdaki planınla devam edebilirsin.',limits:'Öz değerlendirme yalnızca bugün verdiğin cevapları yansıtır. Genel durumunu söyleyemez ve bir tanı değildir. Biriyle konuşmak istersen bu her zaman bir seçenek.',person:'Biriyle konuş'},
 de:{title:'Ein paar Möglichkeiten, du entscheidest',intro:'Deine Antworten beschreiben einen anstrengenden Tag. Nichts startet von selbst. Wähle, was passt, oder nichts.',breathing:'Atmen',grounding:'Erdung',journaling:'Tagebuch',break:'Pause machen',continue:'Normal weitermachen',continued:'Nichts hat sich geändert. Mach mit deinem Plan weiter.',limits:'Der Selbst-Check spiegelt nur deine heutigen Antworten. Er kann nicht sagen, wie es dir insgesamt geht, und ist keine Diagnose. Wenn du mit einem Menschen sprechen möchtest, ist das immer möglich.',person:'Mit einem Menschen sprechen'},
 es:{title:'Algunas opciones, tú decides',intro:'Tus respuestas describen un día pesado. Nada empieza solo. Elige lo que te sirva, o nada.',breathing:'Respiración',grounding:'Anclaje',journaling:'Diario',break:'Tomar un descanso',continue:'Seguir con normalidad',continued:'Nada cambió. Sigue con tu plan de abajo.',limits:'El autochequeo solo refleja las respuestas que diste hoy. No puede decir cómo estás en general y no es un diagnóstico. Si quieres hablar con una persona, siempre es una opción.',person:'Hablar con una persona'}};
const C=()=>COPY[document.documentElement.lang]||COPY.en;
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
// Where each card is found. A tool is offered only if its card exists and nothing but a closed section or a hidden tab
// pane hides it. Grounding and Take a break sit in a section the interface has retired (hidden), so they are not offered.
const FIND={breath:'[data-i18n="tools.breath.h"]',ground:'#grounding-content',journal:'[data-i18n="tools.journal.h"]',break:'#break-idea'};
function cardFor(tool){const e=document.querySelector(FIND[tool]);return e&&e.closest('.tool-card');}
function reachable(tool){
 const card=cardFor(tool);if(!card)return false;
 for(let e=card;e&&e.id!=='page-tools';e=e.parentElement){
  if(e.id&&e.id.indexOf('mb-pane-')===0)continue;
  // Retired by the interface (hidden section or retired card): offering it would lead nowhere.
  if(e.hidden||(e.getAttribute&&e.getAttribute('data-retired')==='true'))return false;
  if(e.tagName==='DETAILS')continue;
  if(window.getComputedStyle(e).display==='none'&&!e.closest('details:not([open])'))return false;
 }
 return true;
}
function openCard(tool){
 window.showPage('tools');
 const card=cardFor(tool);if(!card)return;
 for(let e=card.parentElement;e&&e.id!=='page-tools';e=e.parentElement)if(e.tagName==='DETAILS')e.open=true;
 const pane=card.closest('[id^=mb-pane-]'),tab=pane&&document.getElementById('mb-tab-'+pane.id.slice('mb-pane-'.length));
 if(tab)tab.click();
 // The card's own heading can be a hidden duplicate; focus the first heading that is really on screen.
 const shown=e=>e&&e.getClientRects().length>0,heads=[...card.querySelectorAll('h2,h3')].concat(pane?[...pane.querySelectorAll('h2,h3,h4')]:[]);
 const h=heads.find(shown)||pane||card;
 h.scrollIntoView({block:'center',behavior:'instant'});h.tabIndex=-1;h.focus({preventScroll:true});
}
window.mbCalmOptions=function(card,answers){
 if(!K.elevated(answers))return null;
 const c=C(),box=node('section',undefined,'mb-calm-options');box.setAttribute('aria-labelledby','mb-calm-title');
 const title=node('h3',c.title);title.id='mb-calm-title';box.append(title,node('p',c.intro));
 const row=node('div',undefined,'mb-calm-row'),status=node('p',undefined,'mb-calm-status');status.setAttribute('role','status');
 for(const o of K.OPTIONS.filter(x=>!x.tool||reachable(x.tool))){
  const b=node('button',c[o.id],'btn-outline mb-calm-option');b.type='button';
  b.addEventListener('click',()=>{if(o.tool)openCard(o.tool);else status.textContent=c.continued;});
  row.append(b);
 }
 const person=node('button',c.person,'btn-outline mb-calm-option');person.type='button';person.addEventListener('click',()=>window.showPage('contact'));
 box.append(row,status,node('p',c.limits,'mb-calm-limits'),person);
 card.append(box);return box;
};
})();
