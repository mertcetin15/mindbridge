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
    <div class="story-item" data-tag="${s.tag}" onclick="toggleS(this)">
      <div class="story-num">${s.n}</div>
      <div class="story-body">
        <div class="story-meta">
          <span class="anon-badge">${T().stories.anon}</span>
          ${s.badges.map(b=>`<span class="s-tag" style="background:${b.bg};color:${b.c}">${b.t}</span>`).join('')}
          <span class="story-yr">${s.year}</span>
        </div>
        <div class="story-title">${s.title}</div>
        <p class="story-excerpt">${s.excerpt}</p>
        <div class="story-full-text">${s.full.map(p=>`<p>${p}</p>`).join('')}<div class="story-outcome">${T().stories.outcome} ${s.outcome}</div></div>
      </div>
      <div class="story-expand">+</div>
    </div>`).join('');
}
function renderLibrary(){
  document.getElementById('faq-list').innerHTML=T().library.faq.map(f=>`<div class="faq-item" onclick="toggleFAQ(this)"><div class="faq-question">${f.q}<span class="faq-icon">+</span></div><div class="faq-answer"><p>${f.a}</p></div></div>`).join('');
  document.getElementById('lib-cards').innerHTML=T().library.libcards.map(c=>`<div class="lib-card"><span class="tag">${c.tag}</span><h4>${c.h}</h4><p>${c.d}</p></div>`).join('');
  document.getElementById('zones-list').innerHTML=T().library.zones.map(z=>`<div class="zone-item" style="border-left-color:${z.c}"><div class="zone-icon">${z.icon}</div><div class="zone-info"><h4>${z.h}</h4><p>${z.d}</p></div></div>`).join('');
}
function renderChatGreeting(){
  const hist=document.getElementById('chat-history');
  if(hist.children.length<=1){hist.innerHTML=`<div class="chat-msg msg-ai">${T().chat.greetingMsg}</div>`;}
}
function renderZenStatus(){document.getElementById('zen-status').textContent=T().tools.zen.stages[zenLevel];}
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
  thBtn.textContent=dark?'🌙':'☀️';
});
function toggleDarkRoom(show){
  const o=document.getElementById('dark-room-overlay');
  show?o.classList.add('active'):o.classList.remove('active');
  if(show)growZen();
}

/* ══════════════════ NAV / PAGES ══════════════════ */
window.addEventListener('scroll',()=>{
  document.getElementById('navbar').classList.toggle('scrolled',window.scrollY>50);
  const h=document.documentElement.scrollHeight-document.documentElement.clientHeight;
  document.getElementById('scroll-progress').style.width=(h>0?(document.documentElement.scrollTop/h)*100:0)+'%';
});
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
  setTimeout(()=>{refreshSplitLines();triggerReveals();},120);
}
function triggerReveals(){
  document.querySelectorAll('.page.active .reveal').forEach(el=>{
    if(el.getBoundingClientRect().top<window.innerHeight-40)el.classList.add('active');
  });
  document.querySelectorAll('.page.active .split-lines').forEach(el=>{
    if(el.getBoundingClientRect().top<window.innerHeight-40)el.classList.add('active');
  });
}
window.addEventListener('scroll',triggerReveals);

/* ══════════════════ ZEN GARDEN ══════════════════ */
let zenLevel=0;
const zenIcons=['🌱','🌿','🍀','🪴','🌾','🌷','🌸','🌻','🌼','🌺','🌳','🍃','🌵','🎋','🌲','🍄','🌰','🌹','🏵️','🌟'];
function growZen(){
  if(zenLevel>=zenIcons.length-1)return;
  zenLevel++;
  const c=document.getElementById('zen-plant-container'),s=document.getElementById('zen-status');
  c.style.transform='scale(1.4)';
  setTimeout(()=>{c.innerHTML=zenIcons[zenLevel];s.textContent=T().tools.zen.stages[zenLevel];c.style.transform='scale(1)'},300);
}

/* ══════════════════ TIMER ══════════════════ */
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
function saveJournal(){const i=document.getElementById('journal-input'),s=document.getElementById('journal-status');if(i.value.trim()){i.value='';s.style.opacity='1';growZen();setTimeout(()=>s.style.opacity='0',3000);}}
function resolveFoF(k){const i=document.getElementById('fof-input'),s=document.getElementById('fof-status');if(i.value.trim()){if(k==='feeling'){i.style.opacity='0';s.textContent=T().tools.fof.feelingMsg;setTimeout(()=>{i.value='';i.style.opacity='1';s.textContent='';growZen();},2000);}else{s.textContent=T().tools.fof.factMsg;setTimeout(()=>s.textContent='',3000);}}}
function generateKinetic(){const b=document.getElementById('kinetic-idea'),tasks=T().tools.kinetic.tasks;b.style.opacity='0';setTimeout(()=>{b.textContent=tasks[Math.floor(Math.random()*tasks.length)];b.style.opacity='1';b.style.borderColor='var(--g)';},400);}
function logNourishment(){const s=document.getElementById('nourish-status');s.style.opacity='1';growZen();setTimeout(()=>s.style.opacity='0',3000);}
let soundIdx=-1;
function toggleSound(btn,idx){const s=document.getElementById('sound-status'),all=document.querySelectorAll('.sound-btn');if(btn.classList.contains('active')){btn.classList.remove('active');s.style.opacity='0';soundIdx=-1;}else{all.forEach(b=>b.classList.remove('active'));btn.classList.add('active');soundIdx=idx;s.textContent=T().tools.sound.playing+' '+T().tools.sound.names[idx]+'...';s.style.opacity='1';}}
function saveGratitude(){const i=document.getElementById('gratitude-input'),s=document.getElementById('gratitude-status');if(i.value.trim()){i.value='';s.style.opacity='1';growZen();setTimeout(()=>s.style.opacity='0',3000);}}
function drawAffirmation(){const c=document.getElementById('affirmation-card'),cards=T().tools.affirm.cards;c.style.opacity='0';setTimeout(()=>{c.textContent=`"${cards[Math.floor(Math.random()*cards.length)]}"`;c.style.opacity='1';},400);}
function generateBreak(){const b=document.getElementById('break-idea'),tasks=T().tools.break.tasks;b.style.opacity='0';setTimeout(()=>{b.textContent=tasks[Math.floor(Math.random()*tasks.length)];b.style.opacity='1';b.style.borderColor='var(--g)';},400);}
function addAntiTodo(){const i=document.getElementById('anti-todo-input'),l=document.getElementById('anti-todo-list');if(i.value.trim()){const d=document.createElement('div');d.className='anti-todo-item';d.textContent=i.value.trim();l.prepend(d);i.value='';growZen();}}
function lockWorry(){const i=document.getElementById('worry-input'),s=document.getElementById('worry-status');if(i.value.trim()){i.style.opacity='0';setTimeout(()=>{i.value='';i.style.opacity='1';s.textContent=T().tools.worry.locked;growZen();setTimeout(()=>s.textContent='',4000);},500);}}
function addControlItem(k){const i=document.getElementById('control-input');if(i.value.trim()){const d=document.getElementById(k==='in'?'control-in-list':'control-out-list'),p=document.createElement('span');p.className='control-pill';p.textContent=i.value.trim();d.appendChild(p);i.value='';growZen();}}
function clearBrainDump(){const i=document.getElementById('brain-dump-input');if(i.value.trim()){i.style.opacity='0';setTimeout(()=>{i.value='';i.style.opacity='1';growZen();},500);}}
function selectMood(b){document.querySelectorAll('.mood-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('mood-feedback').style.opacity='1';growZen();setTimeout(()=>document.getElementById('mood-feedback').style.opacity='0',3000);}
function toggleFAQ(el){el.classList.toggle('active');}
function catchPlane(){const d=document.getElementById('plane-display'),msgs=T().tools.planes.messages;d.style.opacity='0';setTimeout(()=>{d.textContent=`"${msgs[Math.floor(Math.random()*msgs.length)]}"`;d.style.opacity='1';},400);}
function foldPlane(){const i=document.getElementById('plane-input'),s=document.getElementById('plane-status');if(i.value.trim()){T().tools.planes.messages.push(i.value.trim());i.value='';s.style.opacity='1';growZen();setTimeout(()=>s.style.opacity='0',3000);}}
function sendFeedback(){const i=document.getElementById('feedback-input'),s=document.getElementById('feedback-status');if(i.value.trim()){s.textContent=T().contact.fbSent;s.style.opacity='1';}}

/* ══════════════════ ZEN CANVAS ══════════════════ */
let zPoints=[],zenCanvasInit=false;
function initZenCanvas(){
  if(zenCanvasInit)return;zenCanvasInit=true;
  const canvas=document.getElementById('zen-canvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  let drawing=false,framePending=false;
  function wake(){if(!framePending){framePending=true;requestAnimationFrame(drawF);}}
  canvas.addEventListener('mousedown',()=>drawing=true);
  canvas.addEventListener('mouseup',()=>drawing=false);
  canvas.addEventListener('mouseleave',()=>drawing=false);
  canvas.addEventListener('mousemove',e=>{
    if(!drawing)return;
    const r=canvas.getBoundingClientRect();
    zPoints.push({x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height),age:0});wake();
  });
  canvas.addEventListener('touchstart',e=>{drawing=true;e.preventDefault()},{passive:false});
  canvas.addEventListener('touchend',()=>drawing=false);
  canvas.addEventListener('touchmove',e=>{
    if(!drawing)return;
    const r=canvas.getBoundingClientRect(),t=e.touches[0];
    zPoints.push({x:(t.clientX-r.left)*(canvas.width/r.width),y:(t.clientY-r.top)*(canvas.height/r.height),age:0});wake();
    e.preventDefault();
  },{passive:false});
  function drawF(){
    framePending=false;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    for(let i=zPoints.length-1;i>=0;i--){
      const p=zPoints[i];p.age+=1;
      const op=1-(p.age/110),rad=4+(p.age/6);
      if(op<=0){zPoints.splice(i,1);continue;}
      ctx.beginPath();ctx.arc(p.x,p.y,rad,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,111,176,${op*.22})`;ctx.fill();
    }
    if(zPoints.length)wake();
  }
}

/* ══════════════════ AI CHAT ══════════════════ */
function handleChatEnter(e){if(e.key==='Enter')sendChatMessage();}
function getResp(input){
  const t=input.toLowerCase(),R=T().chat.R;
  function pick(a){return a[Math.floor(Math.random()*a.length)];}
  if(t.match(/(hi|hello|hey|morning|evening|howdy|merhaba|selam|hallo|hola)/))return pick(R.greeting);
  if(t.match(/(stress|exam|test|overwhelm|deadline|fail|anxi|worry|too much|panic|sınav|stres|kaygı|prüfung|stress|angst|examen|ansied)/))return pick(R.stress);
  if(t.match(/(sad|depress|alone|lonely|cry|hopeless|bad|empty|numb|üzgün|yalnız|traurig|einsam|triste|solo)/))return pick(R.sadness);
  if(t.match(/(tired|sleep|exhaust|burnout|can't focus|energy|drained|yorgun|tükenmiş|müde|erschöpft|cansado|agotado)/))return pick(R.burnout);
  if(t.match(/(thank|good|happy|great|better|win|well|fine|iyi|teşekkür|danke|gut|gracias|bien)/))return pick(R.positive);
  return pick(R.default);
}
function sendChatMessage(){
  const inp=document.getElementById('chat-input-box'),hist=document.getElementById('chat-history'),txt=inp.value.trim();
  if(!txt)return;
  const um=document.createElement('div');um.className='chat-msg msg-user';um.textContent=txt;hist.appendChild(um);inp.value='';hist.scrollTop=hist.scrollHeight;
  const ti=document.createElement('div');ti.className='typing-indicator';ti.innerHTML='<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';hist.appendChild(ti);hist.scrollTop=hist.scrollHeight;
  const resp=getResp(txt);
  setTimeout(()=>{hist.removeChild(ti);const am=document.createElement('div');am.className='chat-msg msg-ai';am.textContent=resp;hist.appendChild(am);hist.scrollTop=hist.scrollHeight;},Math.min(1000+resp.length*14,3200));
}

/* ══════════════════ STORIES ══════════════════ */
function toggleS(el){el.classList.toggle('open');}
function filterS(tag,btn){
  document.querySelectorAll('.filt').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  document.querySelectorAll('.story-item').forEach(s=>{const tags=s.dataset.tag||'';s.style.display=(tag==='all'||tags.includes(tag))?'':'none';});
}

/* ══════════════════ QUIZ ══════════════════ */
let qIdx=0,scores=[];
function initQuiz(){
  qIdx=0;scores=[];
  document.getElementById('quiz-main').style.display='block';
  document.getElementById('quiz-result').style.display='none';
  renderQ();
}
function renderQ(){
  const QS=T().quiz.QS,q=QS[qIdx];
  document.getElementById('q-counter').textContent=T().quiz.qCounter+' '+(qIdx+1)+' '+T().quiz.of+' '+QS.length;
  document.getElementById('q-text').textContent=q.q;
  document.getElementById('q-hint').textContent=q.hint;
  document.getElementById('btn-next').style.display='none';
  document.getElementById('q-nav-label').textContent=T().quiz.selectPrompt;
  document.getElementById('quiz-track').innerHTML=QS.map((_,i)=>`<div class="track-seg${i<qIdx?' done':i===qIdx?' cur':''}"></div>`).join('');
  document.getElementById('quiz-dots').innerHTML=QS.map((_,i)=>`<div class="qdot${i<qIdx?' done':i===qIdx?' cur':''}"></div>`).join('');
  document.getElementById('q-opts').innerHTML=q.opts.map((o,i)=>`<button class="opt" onclick="selOpt(this,${o.s})"><div class="opt-circle"></div><div class="opt-label"><strong>${o.l}</strong><span>${o.d}</span></div></button>`).join('');
}
function selOpt(btn,score){
  document.querySelectorAll('.opt').forEach(o=>o.classList.remove('sel'));btn.classList.add('sel');scores[qIdx]=score;
  document.getElementById('btn-next').style.display='block';document.getElementById('q-nav-label').textContent='';
}
function nextQ(){
  const QS=T().quiz.QS;
  if(qIdx<QS.length-1){qIdx++;renderQ();}else showResult();
}
function showResult(){
  const total=scores.reduce((a,b)=>a+b,0),RES=T().quiz.RESULTS,res=RES.find(r=>total>=r.range[0]&&total<=r.range[1])||RES[2];
  document.getElementById('quiz-main').style.display='none';
  const rd=document.getElementById('quiz-result');rd.style.display='block';
  rd.innerHTML=`<div class="result-card"><div class="result-icon-wrap" style="background:${res.bg}">${res.emoji}</div><div class="result-h" style="color:${res.col}">${res.label}</div><p class="result-desc">${res.desc}</p><div class="result-recs">${res.recs.map(r=>`<div class="rec-item"><strong>${r.t}</strong><span>${r.d}</span></div>`).join('')}</div><div class="result-actions"><button class="btn-sm" onclick="initQuiz()">${T().quiz.retake}</button><button class="btn-sm solid" onclick="handleNavClick('tools')">${T().quiz.exploreTools}</button><button class="btn-sm solid" onclick="handleNavClick('contact')">${T().quiz.getSupport}</button></div></div>`;
}

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
function scrollToTop(){window.scrollTo({top:0,behavior:'smooth'});}
window.addEventListener('scroll',()=>{
  document.getElementById('back-to-top').classList.toggle('visible',window.scrollY>500);
});

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
