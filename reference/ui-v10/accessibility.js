/* Keyboard, navigation focus and dialog state shared across the existing pages. */
(() => {
'use strict';
const names={en:'Skip to content',tr:'İçeriğe geç',de:'Zum Inhalt',es:'Saltar al contenido'};
const priorI18n=window.applyI18n,priorPage=window.showPage;
const sos=document.getElementById('sos-modal'),priorSOS=window.toggleSOS;let returnFocus=null;
sos.setAttribute('role','dialog');sos.setAttribute('aria-modal','true');sos.setAttribute('aria-label','Human support');sos.inert=true;
window.toggleSOS=function(){const opening=!sos.classList.contains('active');if(opening)returnFocus=document.activeElement;priorSOS();sos.inert=!opening;if(opening)sos.querySelector('button,a')?.focus();else returnFocus?.focus();};
function sync(){
 document.querySelectorAll('textarea,input').forEach(el=>{if(!el.labels?.length&&el.placeholder)el.setAttribute('aria-label',el.placeholder);});
 document.querySelector('.mb-skip').textContent=names[curLang]||names.en;
 document.querySelectorAll('.nav-link[data-page]').forEach(b=>{if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const menu=document.getElementById('hamburger-btn');menu.setAttribute('aria-expanded',String(document.querySelector('.nav-links').classList.contains('mobile-open')));
 document.querySelectorAll('.faq-item,.story-item').forEach(el=>{el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-expanded',String(el.classList.contains('active')||el.classList.contains('open')));});
 document.querySelectorAll('a[target="_blank"]').forEach(a=>a.rel='noopener noreferrer');
}
window.applyI18n=function(){priorI18n();sync();};
window.showPage=function(id){const result=priorPage(id);sync();const title=document.querySelector('#page-'+id+' h1,#page-'+id+' h2');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}return result;};
document.addEventListener('keydown',e=>{
 if(sos.classList.contains('active')){
  if(e.key==='Escape'){e.preventDefault();window.toggleSOS();return;}
  if(e.key==='Tab'){const items=[...sos.querySelectorAll('a[href],button:not([disabled])')];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 }
 const item=e.target.closest?.('.faq-item,.story-item');
 if(item&&e.target===item&&(e.key==='Enter'||e.key===' ')){e.preventDefault();item.click();sync();}
});
document.addEventListener('click',()=>queueMicrotask(sync));
sync();
})();
