/* Progressive disclosure: keep drafts and existing records in their original modules. */
(()=>{'use strict';
const labels={en:{plan:'Plan a day',focus:'Focus session',tools:'Journal & relaxation',account:'Account',workspace:'Organise your work',intro:'Tasks and a weekly plan, when you need them.',open:'Open',},tr:{plan:'Gününü planla',focus:'Odak oturumu',tools:'Günlük ve rahatlama',account:'Hesap',workspace:'İşlerini düzenle',intro:'Görevler ve haftalık plan, ihtiyaç duyduğunda.',open:'Aç'},de:{plan:'Tag planen',focus:'Fokussitzung',tools:'Tagebuch & Entspannung',account:'Konto',workspace:'Deine Aufgaben',intro:'Aufgaben und Wochenplan bei Bedarf.',open:'Öffnen'},es:{plan:'Planificar el día',focus:'Sesión de enfoque',tools:'Diario y descanso',account:'Cuenta',workspace:'Organiza tu trabajo',intro:'Tareas y plan semanal cuando los necesites.',open:'Abrir'}};
const copy=()=>labels[document.documentElement.lang]||labels.en,groups=[];
for(const [id,key]of [['mb-planner','plan'],['mb-focus-plan','focus'],['mb-tools-grid','tools'],['mb-account-panel','account']]){const target=document.getElementById(id);if(!target)continue;const details=document.createElement('details'),summary=document.createElement('summary');details.className='mb-quiet-section';details.dataset.section=key;summary.textContent=copy()[key];details.append(summary);target.before(details);details.append(target);groups.push({details,summary,key});
 // Existing tool shortcuts already scroll to their target. Open only its containing section.
 for(const el of [target,...target.querySelectorAll('[id],.tool-card')]){const scroll=el.scrollIntoView.bind(el);el.scrollIntoView=function(options){details.open=true;return scroll(options);};}
}
// Remove redundant ornamentation; the bridge, sun/moon, garden and logo vine remain.
for(const el of document.querySelectorAll('.mb-journey-ruler,.mb-paper-fold,.mb-branch-divider,.mb-living-atmosphere'))el.remove();
// Keep the film surface free of copy; move its accessible controls below it.
const cinema=document.getElementById('mb-cinema');
for(const el of document.querySelectorAll('.mb-cinema-label,.mb-cinema-panels,.mb-garden-chapters,.mb-garden-arrival,.mb-cinema-scroll,.mb-cinema-track'))el.remove();
const toolbar=document.querySelector('.mb-cinema-toolbar');if(toolbar&&cinema)cinema.after(toolbar);
function translate(){groups.forEach(({summary,key})=>summary.textContent=copy()[key]);const launch=document.querySelector('.mb-workspace-launch');if(launch){launch.querySelector('h2').textContent=copy().workspace;launch.querySelector('p').textContent=copy().intro;launch.querySelector('button').textContent=copy().open;}}
new MutationObserver(translate).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});translate();
})();
