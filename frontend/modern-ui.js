/* Navigation, tool discovery and focus continuity. No user text is indexed. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const copy={
 en:{search:'Find a tool',hint:'Search tools and pages',close:'Close search',empty:'No matching tools.',results:'results',plan:'Plan your day',planD:'Choose one task and a realistic time block.',focus:'Find your focus',focusD:'Set a small goal. Start with one session.',breathe:'Take a pause',breatheD:'A guided breathing exercise, at your pace.',running:'Focus session',paused:'Session paused',back:'Return to session',theme:'Switch appearance',menu:'Menu'},
 tr:{search:'Araç bul',hint:'Araç veya sayfa ara',close:'Aramayı kapat',empty:'Eşleşen araç bulunamadı.',results:'sonuç',plan:'Gününü planla',planD:'Bir iş seç. Ayırabileceğin süreyi belirle.',focus:'Odağını bul',focusD:'Küçük bir hedef koy. Tek oturumla başla.',breathe:'Bir mola ver',breatheD:'Kendi hızında, rehberli nefes egzersizi.',running:'Odak oturumu',paused:'Oturum duraklatıldı',back:'Oturuma dön',theme:'Görünümü değiştir',menu:'Menü'},
 de:{search:'Werkzeug finden',hint:'Werkzeuge und Seiten suchen',close:'Suche schließen',empty:'Keine passenden Werkzeuge.',results:'Ergebnisse',plan:'Plane deinen Tag',planD:'Eine Aufgabe. Ein realistischer Zeitrahmen.',focus:'Finde deinen Fokus',focusD:'Ein kleines Ziel. Eine konzentrierte Sitzung.',breathe:'Mach eine Pause',breatheD:'Eine angeleitete Atemübung in deinem Tempo.',running:'Fokussitzung',paused:'Sitzung pausiert',back:'Zur Sitzung',theme:'Darstellung wechseln',menu:'Menü'},
 es:{search:'Buscar herramienta',hint:'Busca herramientas y páginas',close:'Cerrar búsqueda',empty:'No hay herramientas coincidentes.',results:'resultados',plan:'Planifica tu día',planD:'Elige una tarea y un tiempo realista.',focus:'Encuentra tu enfoque',focusD:'Una meta pequeña. Empieza con una sesión.',breathe:'Haz una pausa',breatheD:'Un ejercicio de respiración a tu ritmo.',running:'Sesión de enfoque',paused:'Sesión pausada',back:'Volver a la sesión',theme:'Cambiar apariencia',menu:'Menú'}
};
const t=()=>copy[document.documentElement.lang]||copy.en;
function node(tag,id,text){const n=document.createElement(tag);if(id)n.id=id;if(text)n.textContent=text;return n;}
function button(id,fn){const n=node('button',id);n.type='button';n.addEventListener('click',fn);return n;}
const animations=new WeakMap();
function animate(el){animations.get(el)?.cancel();if(!motion.matches&&el.animate)animations.set(el,el.animate([{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'}));}
function closeMenu(){document.querySelector('.nav-links').classList.remove('mobile-open');$('hamburger-btn').classList.remove('active');$('hamburger-btn').setAttribute('aria-expanded','false');}
const oldShow=window.showPage;
window.showPage=function(id){if(!$('page-'+id))return;closeMenu();oldShow(id);};
function jump(page,target){window.showPage(page);const el=target?$(target):null;if(el){el.scrollIntoView({behavior:motion.matches?'instant':'smooth',block:'center'});el.tabIndex=-1;el.focus({preventScroll:true});el.classList.add('mb-jump-highlight');setTimeout(()=>el.classList.remove('mb-jump-highlight'),1500);}}
// A small set of direct, working actions rather than a decorative dashboard.
const launch=node('div');launch.className='mb-launch';
const actions=[['plan','planD','mb-planner'],['focus','focusD','mb-focus-plan'],['breathe','breatheD','mb-breath-tool']];
const breath=$('breath-circle')?.closest('.tool-card');if(breath)breath.id='mb-breath-tool';
for(const [title,desc,target] of actions){const b=button('',()=>jump('tools',target));b.append(node('strong','',t()[title]),node('span','',t()[desc]),node('b','','↗'));b.dataset.titleKey=title;b.dataset.descKey=desc;launch.append(b);}
document.querySelector('.hero-inner').append(launch);
const open=button('mb-search-open',openSearch);open.className='mb-search-open';open.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>';document.querySelector('.nav-right').prepend(open);
const dialog=node('dialog','mb-search');dialog.setAttribute('aria-labelledby','mb-search-title');
const head=node('div');head.className='mb-search-head';const title=node('h2','mb-search-title');const close=button('mb-search-close',()=>dialog.close());close.textContent='×';head.append(title,close);
const label=node('label');label.htmlFor='mb-search-input';const input=node('input','mb-search-input');input.type='search';input.autocomplete='off';input.spellcheck=false;
const count=node('p','mb-search-count');count.setAttribute('role','status');const results=node('div','mb-search-results');dialog.append(head,label,input,count,results);document.body.append(dialog);
let returnFocus=null;
function openSearch(){if(dialog.open)return;returnFocus=document.activeElement;closeMenu();input.value='';renderSearch();dialog.showModal();input.focus();animate(dialog);}
dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
function normalized(s){return s.toLocaleLowerCase(document.documentElement.lang).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');}
function catalog(){const items=[];document.querySelectorAll('.nav-link[data-page]').forEach(n=>items.push({label:n.textContent,page:n.dataset.page}));for(const [key,,target] of actions)items.push({label:t()[key],page:'tools',target});document.querySelectorAll('.tool-card').forEach((n,i)=>{if(n.dataset.retired==='true')return;if(!n.id)n.id='mb-tool-'+i;const title=n.querySelector('h3');if(title)items.push({label:title.textContent,page:'tools',target:n.id});});return items;}
function renderSearch(){results.replaceChildren();const words=normalized(input.value.trim()).split(/\s+/).filter(Boolean);const matches=catalog().filter(x=>words.every(w=>normalized(x.label).includes(w)));count.textContent=matches.length?`${matches.length} ${t().results}`:t().empty;for(const item of matches){const b=button('',()=>{returnFocus=null;dialog.close();jump(item.page,item.target);});b.textContent=item.label;results.append(b);}}
input.addEventListener('input',renderSearch);input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();results.querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
results.addEventListener('keydown',e=>{if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;const buttons=Array.from(results.querySelectorAll('button'));const i=buttons.indexOf(document.activeElement);if(i<0)return;e.preventDefault();let next=e.key==='Home'?0:e.key==='End'?buttons.length-1:i+(e.key==='ArrowDown'?1:-1);if(next<0)input.focus();else buttons[Math.min(next,buttons.length-1)]?.focus();});
const timerTool=$('timer-circle').closest('.tool-card');if(timerTool)timerTool.id='mb-timer-tool';
const ribbon=node('aside','mb-session');ribbon.hidden=true;const info=node('div');const status=node('span','mb-session-label'),time=node('strong','mb-session-time');info.append(status,time);const back=button('mb-session-back',()=>jump('tools','mb-timer-tool'));ribbon.append(info,back);document.body.append(ribbon);let focusState='idle';
function syncSession(){ribbon.hidden=!['running','paused'].includes(focusState);const label=t()[focusState==='running'?'running':'paused'];if(status.textContent!==label)status.textContent=label;if(time.textContent!==$('time-display').textContent)time.textContent=$('time-display').textContent;if(back.textContent!==t().back)back.textContent=t().back;}
window.addEventListener('mb:focus-state',e=>{focusState=e.detail.state;syncSession();});
new MutationObserver(syncSession).observe($('time-display'),{childList:true,characterData:true,subtree:true});
// Menus and the dark room remain usable by keyboard.
const oldMobile=window.toggleMobileNav;window.toggleMobileNav=function(){oldMobile();$('hamburger-btn').setAttribute('aria-expanded',String(document.querySelector('.nav-links').classList.contains('mobile-open')));};
const oldLang=window.toggleLangMenu;window.toggleLangMenu=function(force){oldLang(force);$('lang-btn').setAttribute('aria-expanded',String($('lang-switch').classList.contains('open')));};
$('lang-btn').setAttribute('aria-controls','lang-menu');
const dark=$('dark-room-overlay');dark.inert=true;dark.setAttribute('role','dialog');dark.setAttribute('aria-modal','true');dark.setAttribute('aria-label','Dark room');let darkReturn=null,locked=[];
const oldDark=window.toggleDarkRoom;window.toggleDarkRoom=function(show){if(show===dark.classList.contains('active'))return;if(show){darkReturn=document.activeElement;locked=Array.from(document.body.children).filter(el=>el!==dark&&!el.inert&&!['SCRIPT','STYLE','LINK'].includes(el.tagName));locked.forEach(el=>el.inert=true);}else{locked.forEach(el=>el.inert=false);locked=[];}oldDark(show);dark.inert=!show;if(show)dark.querySelector('button')?.focus();else darkReturn?.focus();};
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!dark.classList.contains('active')&&!$('sos-modal').classList.contains('active')){e.preventDefault();openSearch();}if(e.key==='Escape'){if(dark.classList.contains('active'))window.toggleDarkRoom(false);else if(document.querySelector('.nav-links').classList.contains('mobile-open')){closeMenu();$('hamburger-btn').focus();}if($('lang-switch').classList.contains('open'))$('lang-btn').focus();window.toggleLangMenu(false);}if(dark.classList.contains('active')&&e.key==='Tab'){e.preventDefault();dark.querySelector('button')?.focus();}});
document.addEventListener('click',e=>{if(!$('navbar').contains(e.target))closeMenu();$('lang-btn').setAttribute('aria-expanded',String($('lang-switch').classList.contains('open')));});
try{const saved=localStorage.getItem('mb_theme');if(saved==='dark')document.documentElement.dataset.theme='dark';else if(saved==='light')document.documentElement.removeAttribute('data-theme');}catch(_){}
$('theme-toggle').addEventListener('click',()=>{try{localStorage.setItem('mb_theme',document.documentElement.dataset.theme==='dark'?'dark':'light');}catch(_){}syncTheme();});
function syncTheme(){const darkNow=document.documentElement.dataset.theme==='dark';window.mbThemeIcon?window.mbThemeIcon($('theme-toggle'),darkNow):($('theme-toggle').textContent=darkNow?'Light':'Dark');$('theme-toggle').setAttribute('aria-label',t().theme);}
function translate(){open.setAttribute('aria-label',t().search+' (Ctrl / ⌘ K)');title.textContent=t().search;label.textContent=t().hint;close.setAttribute('aria-label',t().close);$('hamburger-btn').setAttribute('aria-label',t().menu);launch.querySelectorAll('button').forEach(b=>{b.querySelector('strong').textContent=t()[b.dataset.titleKey];b.querySelector('span').textContent=t()[b.dataset.descKey];});syncTheme();syncSession();if(dialog.open)renderSearch();}
const oldI18n=window.applyI18n;window.applyI18n=function(){oldI18n();translate();};translate();
motion.addEventListener('change',()=>{if(motion.matches)document.getAnimations().forEach(a=>a.cancel());});
animate(document.querySelector('.hero-inner'));
})();
