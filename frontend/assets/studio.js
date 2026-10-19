/* Stable section shortcuts: no remounting, no timer side effects. */
(()=>{
'use strict';
const labels={en:['Your workspace','Plan','Focus','All tools','Account'],tr:['Çalışma alanın','Planın','Odaklan','Tüm araçlar','Hesabın'],de:['Dein Arbeitsbereich','Plan','Fokus','Werkzeuge','Konto'],es:['Tu espacio','Plan','Enfoque','Herramientas','Cuenta']};
const page=document.getElementById('page-tools'),grid=page.querySelector('.tools-grid');grid.id='mb-tools-grid';
const bar=document.createElement('div');bar.className='mb-workspace-nav';bar.setAttribute('role','group');
const targets=['mb-planner','mb-focus-plan','mb-tools-grid','mb-account-panel'];
const buttons=targets.map((id,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-controls',id);b.addEventListener('click',()=>{const target=document.getElementById(id);target.scrollIntoView({block:'start',behavior:'instant'});const focus=target.querySelector('h2,h3')||target;focus.tabIndex=-1;focus.focus({preventScroll:true});});bar.append(b);return b;});
page.querySelector('section').after(bar);
function translate(){const t=labels[document.documentElement.lang]||labels.en;bar.setAttribute('aria-label',t[0]);buttons.forEach((b,i)=>b.textContent=t[i+1]);}
const old=window.applyI18n;window.applyI18n=function(){old();translate();};translate();
})();
