/* ══════════════════ I18N ENGINE ══════════════════ */
let curLang = 'en';
try { const savedLang=localStorage.getItem('mb_lang'); if(Object.hasOwn(I18N,savedLang)) curLang=savedLang; } catch (_) {}
function T(){return I18N[curLang];}
function getPath(obj,path){return path.split('.').reduce((o,k)=>(o==null?undefined:o[k]),obj);}
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{const v=getPath(T(),el.getAttribute('data-i18n'));if(v!=null)el.textContent=v;});
  document.querySelectorAll('[data-i18n-html]').forEach(el=>{const v=getPath(T(),el.getAttribute('data-i18n-html'));if(v!=null)el.innerHTML=v;});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const v=getPath(T(),el.getAttribute('data-i18n-placeholder'));if(v!=null)el.placeholder=v;});
  document.documentElement.lang=curLang;
  document.documentElement.setAttribute('data-lang',curLang);
  document.getElementById('lang-btn-label').textContent=curLang.toUpperCase();
  document.querySelectorAll('.lang-opt').forEach(o=>o.classList.toggle('active',o.dataset.lang===curLang));
}
function renderMarquee(){
  const items=T().marquee;
  const html=items.map(s=>`<span>${s}</span><span class="marquee-dot">·</span>`).join('');
  document.getElementById('marquee-inner').innerHTML=html+html;
}
function renderStories(){
  const list=document.getElementById('stories-list');
  list.innerHTML=T().stories_data.map((s,i)=>`
    <div class="story-item" data-tag="${s.tag}" data-mb-click="toggleS(this)">
      <div class="story-num">${s.n}</div>
      <div class="story-body">
        <div class="story-meta">
          <span class="anon-badge">${T().stories.anon}</span>
          ${s.badges.map(b=>`<span class="s-tag" style="background:${b.bg};color:${b.c}">${b.t}</span>`).join('')}
          <span class="story-yr">${s.year}</span>
        </div>
        <div class="story-title">${s.title}</div>
        <p class="story-excerpt">${s.excerpt}</p>
        <div class="story-full-text"><a class="mb-story-source" href="${s.url}" target="_blank" rel="noopener noreferrer" data-mb-click="event.stopPropagation()">${T().stories.source}</a></div>
      </div>
      <div class="story-expand">+</div>
    </div>`).join('');
}
function renderLibrary(){window.mbRenderLibrary?.();}
function renderChatGreeting(){
  const hist=document.getElementById('chat-history');
  if(hist.children.length<=1){hist.innerHTML=`<div class="chat-msg msg-ai">${T().chat.greetingMsg}</div>`;}
}
function renderZenStatus(){}
function renderAll(){
  applyI18n();renderMarquee();renderStories();renderLibrary();renderChatGreeting();renderZenStatus();
  if(document.getElementById('page-quiz').classList.contains('active'))initQuiz();
  refreshSplitLines();triggerReveals();
  bindSpotlight();bindCountUp();initHeroParallax();
}
function toggleLangMenu(force){
  const sw=document.getElementById('lang-switch');
  if(force===false){sw.classList.remove('open');return;}
  sw.classList.toggle('open');
}
document.addEventListener('click',e=>{
  const sw=document.getElementById('lang-switch');
  if(sw&&!sw.contains(e.target))sw.classList.remove('open');
});
function setLang(lang){
  if(!Object.hasOwn(I18N,lang))return;curLang=lang;try{localStorage.setItem('mb_lang',lang);}catch(_){}
  renderAll();toggleLangMenu(false);
  restartTypewriter();
}

/* ══════════════════ PARTICLES ══════════════════ */
/* ══════════════════ SOS / THEME / DARK ROOM ══════════════════ */
function toggleSOS(){document.getElementById('sos-modal').classList.toggle('active')}
document.getElementById('sos-modal').addEventListener('click',e=>{if(e.target===document.getElementById('sos-modal'))toggleSOS()});
const thBtn=document.getElementById('theme-toggle');
thBtn.addEventListener('click',()=>{
  const dark=document.documentElement.getAttribute('data-theme')==='dark';
  dark?document.documentElement.removeAttribute('data-theme'):document.documentElement.setAttribute('data-theme','dark');
  window.mbThemeIcon?window.mbThemeIcon(thBtn,dark):(thBtn.textContent=dark?'Light':'Dark');
});
function toggleDarkRoom(show){
  const o=document.getElementById('dark-room-overlay');
  show?o.classList.add('active'):o.classList.remove('active');
  if(show)growZen();
}

/* ══════════════════ NAV / PAGES ══════════════════ */
// One passive, frame-coalesced scroll update. No per-card geometry reads.
let scrollFramePending=false;
function updateScrollChrome(){
 scrollFramePending=false;
 const y=window.scrollY,root=document.documentElement,h=root.scrollHeight-root.clientHeight;
 document.getElementById('navbar').classList.toggle('scrolled',y>50);
 document.getElementById('back-to-top').classList.toggle('visible',y>500);
 document.getElementById('scroll-progress').style.transform=`scaleX(${h>0?Math.min(1,Math.max(0,y/h)):0})`;
}
window.addEventListener('scroll',()=>{if(!scrollFramePending){scrollFramePending=true;requestAnimationFrame(updateScrollChrome);}},{passive:true});
function toggleMobileNav(){
  document.querySelector('.nav-links').classList.toggle('mobile-open');
  document.getElementById('hamburger-btn').classList.toggle('active');
}
function handleNavClick(id){
  document.querySelector('.nav-links').classList.remove('mobile-open');
  document.getElementById('hamburger-btn').classList.remove('active');
  showPage(id);
}
function showPage(id){
  if(!document.getElementById('page-'+id))return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l=>{if(l.dataset.page===id)l.classList.add('active')});
  window.scrollTo({top:0,behavior:'instant'});
  if(id==='quiz')initQuiz();

}
function triggerReveals(){} // Content is visible by default; no scroll-time scanning.

/* ══════════════════ ZEN GARDEN ══════════════════ */
let zenLevel=0;
const zenIcons=['🌱','🌿','🍀','🪴','🌾','🌷','🌸','🌻','🌼','🌺','🌳','🍃','🌵','🎋','🌲','🍄','🌰','🌹','🏵️','🌟'];
function growZen(){}
let timerInt,timerMinutes=25,timerTotal=1500,tLeft=1500,tRunning=false;
function renderTimerDisplay(){
  const disp=document.getElementById('time-display'),circ=document.getElementById('timer-circle');
  const m=Math.floor(tLeft/60),s=tLeft%60;
  disp.textContent=`${m<10?'0':''}${m}:${s<10?'0':''}${s}`;
  circ.style.background=`conic-gradient(var(--g) ${(tLeft/timerTotal)*100}%,var(--bg2) 0)`;
}
function setTimerControlsDisabled(disabled){
  document.getElementById('timer-minutes').disabled=disabled;
  document.querySelectorAll('.timer-step').forEach(b=>b.disabled=disabled);
}
function adjustTimer(delta){
  if(tRunning)return;
  timerMinutes=Math.min(180,Math.max(1,timerMinutes+delta));
  document.getElementById('timer-minutes').value=timerMinutes;
  timerTotal=timerMinutes*60;tLeft=timerTotal;
  renderTimerDisplay();
}
function setTimerFromInput(){
  if(tRunning)return;
  let v=parseInt(document.getElementById('timer-minutes').value,10);
  if(isNaN(v)||v<1)v=1;if(v>180)v=180;
  timerMinutes=v;timerTotal=v*60;tLeft=timerTotal;
  renderTimerDisplay();
}
function toggleTimer(){
  const btn=document.getElementById('timer-btn');
  if(tRunning){clearInterval(timerInt);btn.textContent=T().tools.timer.resume;tRunning=false;setTimerControlsDisabled(false);return;}
  if(tLeft<=0){timerTotal=timerMinutes*60;tLeft=timerTotal;}
  btn.textContent=T().tools.timer.pause;tRunning=true;setTimerControlsDisabled(true);
  timerInt=setInterval(()=>{
    tLeft--;
    renderTimerDisplay();
    if(tLeft<=0){clearInterval(timerInt);document.getElementById('time-display').textContent='00:00';btn.textContent=T().tools.timer.done;tRunning=false;setTimerControlsDisabled(false);growZen();}
  },1000);
}

/* ══════════════════ BREATHING ══════════════════ */
let breathInt,isBreathing=false;
function toggleBreathing(){
  const circ=document.getElementById('breath-circle'),txt=document.getElementById('breath-text'),btn=document.getElementById('breath-btn');
  if(isBreathing){clearInterval(breathInt);circ.style.transform='scale(1)';txt.textContent=T().tools.breath.ready;btn.textContent=T().tools.breath.btn;isBreathing=false;growZen();return;}
  isBreathing=true;btn.textContent=T().tools.breath.stop;
  function cycle(){
    txt.textContent=T().tools.breath.inhale;circ.style.transition='transform 4s ease-out';circ.style.transform='scale(2)';
    setTimeout(()=>{txt.textContent=T().tools.breath.hold;},4000);
    setTimeout(()=>{txt.textContent=T().tools.breath.exhale;circ.style.transition='transform 8s ease-in';circ.style.transform='scale(1)';},11000);
  }
  cycle();breathInt=setInterval(cycle,19000);
}

/* ══════════════════ GROUNDING ══════════════════ */
let gStep=0;
function nextGroundingStep(){
  const steps=T().tools.ground.steps;
  gStep=(gStep+1)%steps.length;
  const c=document.getElementById('grounding-content'),b=document.getElementById('grounding-btn');
  c.style.opacity='0';
  setTimeout(()=>{c.innerHTML=`<span style="font-size:38px;display:block;margin-bottom:12px">${steps[gStep].icon}</span>${steps[gStep].text}`;c.style.opacity='1';},300);
  b.textContent=(gStep===steps.length-1)?T().tools.ground.again:T().tools.ground.btn;
  if(gStep===steps.length-1)growZen();
}
function initGrounding(){
  const c=document.getElementById('grounding-content'),b=document.getElementById('grounding-btn'),steps=T().tools.ground.steps;
  c.innerHTML=`<span style="font-size:38px;display:block;margin-bottom:12px">${steps[0].icon}</span>${steps[0].text}`;
  b.textContent=T().tools.ground.btn;
}

/* ══════════════════ OTHER TOOLS ══════════════════ */
function saveJournal(){}
let soundIdx=-1;
function toggleSound(){}
function saveGratitude(){}
function generateBreak(){const b=document.getElementById('break-idea'),tasks=T().tools.break.tasks;b.style.opacity='0';setTimeout(()=>{b.textContent=tasks[Math.floor(Math.random()*tasks.length)];b.style.opacity='1';b.style.borderColor='var(--g)';},400);}
function addAntiTodo(){const i=document.getElementById('anti-todo-input'),l=document.getElementById('anti-todo-list');if(i.value.trim()){const d=document.createElement('div');d.className='anti-todo-item';d.textContent=i.value.trim();l.prepend(d);i.value='';growZen();}}
function addControlItem(k){const i=document.getElementById('control-input');if(i.value.trim()){const d=document.getElementById(k==='in'?'control-in-list':'control-out-list'),p=document.createElement('span');p.className='control-pill';p.textContent=i.value.trim();d.appendChild(p);i.value='';growZen();}}
function selectMood(){}
function toggleFAQ(el){el.classList.toggle('active');}

/* ══════════════════ ZEN CANVAS ══════════════════ */
function initZenCanvas(){window.mbZenResize?.();}

/* ══════════════════ AI CHAT ══════════════════ */
function handleChatEnter(e){if(e.key==='Enter')sendChatMessage();}
function sendChatMessage(){}

/* ══════════════════ STORIES ══════════════════ */
function toggleS(el){el.classList.toggle('open');}
function filterS(tag,btn){
  document.querySelectorAll('.filt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('.story-item').forEach(s=>{const tags=s.dataset.tag||'';s.style.display=(tag==='all'||tags.includes(tag))?'':'none';});
}

/* ══════════════════ QUIZ ══════════════════ */
// The self-check is owned by checkin.js.

/* ══════════════════ TYPEWRITER ══════════════════ */
let pIdx=0,cIdx=0,isDel=false,twTimer=null;
const tw=document.getElementById('typewriter');
function typeEff(){tw.textContent=T().hero.typeWords[0];}
function restartTypewriter(){clearTimeout(twTimer);typeEff();}
function refreshSplitLines(){}
function bindCursorTargets(){}
function bindSpotlight(){}

/* ══════════════════ STAT COUNT-UP ══════════════════ */
function bindCountUp(){
  document.querySelectorAll('.stat-n').forEach(el=>{
    if(el.dataset.countBound)return;
    const m=el.textContent.match(/^(\d+)([%+]?)$/);
    if(!m)return;
    el.dataset.countBound='1';
    const target=parseInt(m[1],10),suffix=m[2];
    const io=new IntersectionObserver(entries=>{
      entries.forEach(en=>{
        if(en.isIntersecting){
          io.disconnect();
          const start=performance.now(),dur=1400;
          function step(now){
            const p=Math.min((now-start)/dur,1),eased=1-Math.pow(1-p,3);
            el.textContent=Math.round(target*eased)+suffix;
            if(p<1)requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      });
    },{threshold:.4});
    io.observe(el);
  });
}

/* ══════════════════ BACK TO TOP ══════════════════ */
function scrollToTop(){window.scrollTo({top:0,behavior:((typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth')});}


function initHeroParallax(){}
function runPreloader(){document.getElementById('preloader').style.display='none';initZenCanvas();triggerReveals();}

/* ══════════════════ INIT ══════════════════ */
renderAll();
initGrounding();
bindCursorTargets();
bindSpotlight();
function rebindDynamic(){bindCursorTargets();bindSpotlight();}

document.querySelectorAll('.nav-link[data-page]').forEach(l=>l.setAttribute('data-cursor',''));
document.getElementById('theme-toggle').setAttribute('data-cursor','');
typeEff();runPreloader();
