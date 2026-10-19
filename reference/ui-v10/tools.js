
/* MindBridge stage 3: one owner per resource; no third-party audio requests. */
(() => {
'use strict';
const el=id=>document.getElementById(id);
const translations={
en:{reset:'Reset session',duration:'Session length in minutes',invalid:'Enter a whole number from 1 to 180.',ready:'Ready',paused:'Paused',finished:'Session complete.',volume:'Volume',stop:'Stop sound',loading:'Starting sound…',stopped:'Sound stopped.',audioError:'Audio could not start. Try again or check browser permissions.',unsupported:'This browser does not support these sounds.',names:['🌧️ Rain-like noise','🌫️ Brown noise','🎵 Soft tones'],soundDesc:'Sounds generated in your browser: rain-like noise, brown noise and soft tones. No recordings or streaming.',breathDesc:'Follow a 4-second inhale, 7-second hold and 8-second exhale at a comfortable pace. You can stop at any time.',cycle:'Cycle',complete:'Exercise complete.',cycles:'4 cycles · 1 min 16 sec',policy:'Leaving Tools or hiding this tab pauses focus and stops breathing and sound. Resume manually.',timerDesc:'Choose a session length, pause, resume or reset. Sessions are kept only while this page stays open.'},
tr:{reset:'Oturumu sıfırla',duration:'Dakika olarak oturum süresi',invalid:'1–180 arasında tam sayı gir.',ready:'Hazır',paused:'Duraklatıldı',finished:'Oturum tamamlandı.',volume:'Ses seviyesi',stop:'Sesi durdur',loading:'Ses başlatılıyor…',stopped:'Ses durduruldu.',audioError:'Ses başlatılamadı. Yeniden dene veya tarayıcı izinlerini kontrol et.',unsupported:'Bu tarayıcı bu sesleri desteklemiyor.',names:['🌧️ Yağmur benzeri ses','🌫️ Kahverengi gürültü','🎵 Yumuşak tonlar'],soundDesc:'Tarayıcında üretilen yağmur benzeri ses, kahverengi gürültü ve yumuşak tonlar. Kayıt veya yayın kullanılmaz.',breathDesc:'Rahat bir tempoda 4 saniye nefes al, 7 saniye tut ve 8 saniye ver. İstediğin an durdurabilirsin.',cycle:'Döngü',complete:'Egzersiz tamamlandı.',cycles:'4 döngü · 1 dk 16 sn',policy:'Araçlardan ayrılınca veya sekme gizlenince odak süresi duraklar; nefes ve ses durur. Devam etmek için yeniden başlat.',timerDesc:'Oturum süresini seç, duraklat, devam et veya sıfırla. Oturum yalnızca bu sayfa açıkken korunur.'},
de:{reset:'Sitzung zurücksetzen',duration:'Sitzungsdauer in Minuten',invalid:'Gib eine ganze Zahl von 1 bis 180 ein.',ready:'Bereit',paused:'Pausiert',finished:'Sitzung abgeschlossen.',volume:'Lautstärke',stop:'Klang stoppen',loading:'Klang wird gestartet…',stopped:'Klang gestoppt.',audioError:'Audio konnte nicht starten. Versuche es erneut oder prüfe die Browserberechtigungen.',unsupported:'Dieser Browser unterstützt diese Klänge nicht.',names:['🌧️ Regenähnliches Rauschen','🌫️ Braunes Rauschen','🎵 Sanfte Töne'],soundDesc:'Im Browser erzeugte Klänge: regenähnliches Rauschen, braunes Rauschen und sanfte Töne. Keine Aufnahmen oder Streams.',breathDesc:'Atme in angenehmem Tempo 4 Sekunden ein, halte 7 Sekunden und atme 8 Sekunden aus. Du kannst jederzeit stoppen.',cycle:'Zyklus',complete:'Übung abgeschlossen.',cycles:'4 Zyklen · 1 Min. 16 Sek.',policy:'Beim Verlassen der Tools oder Ausblenden des Tabs pausiert der Fokus; Atmung und Klang stoppen. Starte manuell erneut.',timerDesc:'Wähle eine Sitzungsdauer, pausiere, setze fort oder setze zurück. Sitzungen bleiben nur erhalten, solange diese Seite geöffnet ist.'},
es:{reset:'Reiniciar sesión',duration:'Duración en minutos',invalid:'Introduce un número entero entre 1 y 180.',ready:'Listo',paused:'En pausa',finished:'Sesión completada.',volume:'Volumen',stop:'Detener sonido',loading:'Iniciando sonido…',stopped:'Sonido detenido.',audioError:'No se pudo iniciar el audio. Inténtalo de nuevo o revisa los permisos del navegador.',unsupported:'Este navegador no admite estos sonidos.',names:['🌧️ Ruido similar a lluvia','🌫️ Ruido marrón','🎵 Tonos suaves'],soundDesc:'Sonidos generados en tu navegador: ruido similar a lluvia, ruido marrón y tonos suaves. Sin grabaciones ni streaming.',breathDesc:'Sigue una inhalación de 4 segundos, una retención de 7 y una exhalación de 8 a un ritmo cómodo. Puedes parar cuando quieras.',cycle:'Ciclo',complete:'Ejercicio completado.',cycles:'4 ciclos · 1 min 16 s',policy:'Al salir de Herramientas u ocultar la pestaña se pausa la sesión y se detienen respiración y sonido. Reanuda manualmente.',timerDesc:'Elige la duración, pausa, reanuda o reinicia. Las sesiones se mantienen solo mientras esta página esté abierta.'}
};
const C=()=>translations[curLang]||translations.en;
function addStatus(id,after){const p=document.createElement('p');p.id=id;p.className='mb-stage3-note';p.setAttribute('role','status');p.setAttribute('aria-live','polite');after.after(p);return p;}
function button(id,after,action){const b=document.createElement('button');b.id=id;b.type='button';b.className='btn-outline mb-stage3-control';b.addEventListener('click',action);after.after(b);return b;}
// Focus timer: monotonic deadline, never count callbacks as elapsed seconds.
let minutes=25,total=minutes*60000,remaining=total,deadline=0,timerHandle=null,timerState='idle',lastBroadcastState='';
const timerBtn=el('timer-btn'),minuteInput=el('timer-minutes');
timerBtn.removeAttribute('data-i18n');minuteInput.removeAttribute('oninput');minuteInput.step='1';
const timerStatus=addStatus('mb-timer-status',timerBtn);
const resetBtn=button('mb-timer-reset',timerStatus,resetTimer);
function timerView(){
 const seconds=Math.ceil(Math.max(0,remaining)/1000);el('time-display').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 el('timer-circle').style.background=`conic-gradient(var(--g) ${Math.max(0,Math.min(100,remaining/total*100))}%,var(--bg2) 0)`;
 const t=T().tools.timer;timerBtn.textContent=timerState==='running'?t.pause:timerState==='paused'?t.resume:t.btn;
 timerBtn.setAttribute('aria-pressed',String(timerState==='running'));
 minuteInput.disabled=timerState==='running';document.querySelectorAll('.timer-step').forEach(b=>b.disabled=timerState==='running');
 timerStatus.textContent=timerState==='complete'?C().finished:timerState==='paused'?C().paused:'';
 if(lastBroadcastState!==timerState){lastBroadcastState=timerState;window.dispatchEvent(new CustomEvent('mb:focus-state',{detail:{state:timerState}}));}
}
function tick(){remaining=Math.max(0,deadline-performance.now());if(remaining===0){clearInterval(timerHandle);timerHandle=null;timerState='complete';}timerView();}
function pauseTimer(){if(timerState!=='running')return;tick();if(timerState==='complete')return;clearInterval(timerHandle);timerHandle=null;timerState='paused';timerView();}
function resetTimer(){clearInterval(timerHandle);timerHandle=null;remaining=total;timerState='idle';minuteInput.value=minutes;minuteInput.removeAttribute('aria-invalid');timerView();}
function durationFromInput(){
 if(timerState==='running')return false;
 const v=Number(minuteInput.value);if(!minuteInput.value.trim()||!Number.isInteger(v)||v<1||v>180){minuteInput.setAttribute('aria-invalid','true');timerStatus.textContent=C().invalid;return false;}
 minuteInput.removeAttribute('aria-invalid');if(v!==minutes){minutes=v;total=v*60000;resetTimer();}return true;
}
window.setTimerFromInput=durationFromInput;minuteInput.addEventListener('change',durationFromInput);
window.adjustTimer=delta=>{if(timerState==='running')return;minutes=Math.min(180,Math.max(1,minutes+delta));total=minutes*60000;minuteInput.removeAttribute('aria-invalid');resetTimer();};
window.toggleTimer=()=>{if(timerState==='running'){pauseTimer();return;}if(!durationFromInput())return;if(timerState==='complete')remaining=total;timerState='running';deadline=performance.now()+remaining;clearInterval(timerHandle);timerHandle=setInterval(tick,200);timerView();};
// Breathing: a bounded four-cycle session, one scheduled callback at a time.
const phases=[{key:'inhale',ms:4000,scale:2},{key:'hold',ms:7000,scale:2},{key:'exhale',ms:8000,scale:1}];
let breathing=false,breathHandle=null,breathPhase=0,breathCycle=0,breathDeadline=0,breathState='idle';
const breathBtn=el('breath-btn'),breathText=el('breath-text'),circle=el('breath-circle');
breathBtn.removeAttribute('data-i18n');breathText.removeAttribute('data-i18n');breathText.setAttribute('aria-live','polite');
const breathStatus=addStatus('mb-breath-status',breathBtn);
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
function breathView(){
 breathBtn.textContent=breathing?T().tools.breath.stop:T().tools.breath.btn;breathBtn.setAttribute('aria-pressed',String(breathing));
 breathText.textContent=breathing?T().tools.breath[phases[breathPhase].key]:T().tools.breath.ready;
 breathStatus.textContent=breathing?`${C().cycle} ${breathCycle+1}/4`:breathState==='complete'?C().complete:C().cycles;
}
function breathAnimation(){const p=phases[breathPhase];circle.style.transition=reduced.matches?'none':`transform ${Math.max(0,breathDeadline-performance.now())/1000}s linear`;circle.style.transform=reduced.matches?'scale(1)':`scale(${p.scale})`;}
function stopBreathing(done=false){clearTimeout(breathHandle);breathHandle=null;breathing=false;breathState=done?'complete':'idle';circle.style.transition='none';circle.style.transform='scale(1)';breathView();}
function nextBreath(){
 if(!breathing)return;
 const now=performance.now();
 // If this callback is delayed, derive the correct phase rather than extending it.
 while(now>=breathDeadline){breathPhase++;if(breathPhase===3){breathPhase=0;breathCycle++;if(breathCycle===4){stopBreathing(true);return;}}breathDeadline+=phases[breathPhase].ms;}
 breathView();breathAnimation();clearTimeout(breathHandle);breathHandle=setTimeout(nextBreath,Math.max(1,breathDeadline-performance.now()));
}
window.toggleBreathing=()=>{if(breathing){stopBreathing();return;}breathing=true;breathState='running';breathPhase=0;breathCycle=0;breathDeadline=performance.now()+4000;nextBreath();};
reduced.addEventListener?.('change',()=>{if(breathing)breathAnimation();});
// Audio: synthetic, local Web Audio sources; fresh context per playback.
let audio=null,audioIndex=-1,audioState='idle',audioGeneration=0,volume=.2;
const soundButtons=[...document.querySelectorAll('.sound-btn')],soundStatus=el('sound-status');
soundStatus.setAttribute('role','status');soundStatus.setAttribute('aria-live','polite');soundStatus.style.opacity='1';
soundButtons.forEach(b=>{b.removeAttribute('data-i18n');b.type='button';});
const volumeLabel=document.createElement('label');volumeLabel.className='mb-volume';volumeLabel.htmlFor='mb-volume';
const labelText=document.createElement('span'),range=document.createElement('input'),output=document.createElement('output');
range.id='mb-volume';range.type='range';range.min='0';range.max='100';range.step='1';range.value='20';output.htmlFor='mb-volume';
volumeLabel.append(labelText,range,output);soundStatus.before(volumeLabel);
const audioStop=button('mb-audio-stop',soundStatus,()=>stopAudio());
function audioView(){
 soundButtons.forEach((b,i)=>{b.textContent=C().names[i];const active=audioState==='playing'&&i===audioIndex;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));b.setAttribute('aria-busy',String(audioState==='loading'&&i===audioIndex));});
 soundStatus.textContent=audioState==='playing'?T().tools.sound.playing+' · '+C().names[audioIndex]:audioState==='loading'?C().loading:audioState==='error'?C().audioError:audioState==='unsupported'?C().unsupported:C().stopped;
 labelText.textContent=C().volume;output.textContent=Math.round(volume*100)+'%';audioStop.textContent=C().stop;audioStop.disabled=audioState!=='playing'&&audioState!=='loading';
}
function release(instance){if(!instance)return;for(const source of instance.sources){try{source.stop();}catch(_){}try{source.disconnect();}catch(_){}}for(const node of instance.nodes){try{node.disconnect();}catch(_){}}try{const closing=instance.ctx.close();closing?.catch(()=>{});}catch(_){} }
function stopAudio(){audioGeneration++;const old=audio;audio=null;audioIndex=-1;audioState='idle';release(old);audioView();}
function configureAudio(instance,index){
 const {ctx}=instance,gain=ctx.createGain();instance.gain=gain;instance.nodes.push(gain);gain.gain.value=0;gain.connect(ctx.destination);
 if(index===2){
  // Three low-amplitude sine waves. Explicitly soft tones, not a music recording.
  [174.61,220,261.63].forEach(f=>{const oscillator=ctx.createOscillator(),level=ctx.createGain();oscillator.type='sine';oscillator.frequency.value=f;level.gain.value=.08;oscillator.connect(level);level.connect(gain);instance.sources.push(oscillator);instance.nodes.push(level);oscillator.start();});
 }else{
  const buffer=ctx.createBuffer(1,ctx.sampleRate*8,ctx.sampleRate),samples=buffer.getChannelData(0);let last=0;
  for(let i=0;i<samples.length;i++){const white=Math.random()*2-1;if(index===1){last=(last+.02*white)/1.02;samples[i]=last*3.5;}else samples[i]=white*.35;}
  // Crossfade the loop boundaries to avoid periodic clicks.
  const fade=Math.min(1024,samples.length/4);for(let i=0;i<fade;i++){const t=(i+1)/fade;const k=samples.length-fade+i;samples[k]=samples[k]*(1-t)+samples[0]*t;}
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=index===0?2500:450;source.connect(filter);filter.connect(gain);instance.sources.push(source);instance.nodes.push(filter);source.start();
 }
 gain.gain.setTargetAtTime(volume,ctx.currentTime,.06);
}
window.toggleSound=async(_button,index)=>{
 if(!Number.isInteger(index)||index<0||index>2)return;
 if(audioIndex===index&&(audioState==='playing'||audioState==='loading')){stopAudio();return;}
 stopAudio();const generation=audioGeneration,AudioCtor=window.AudioContext||window.webkitAudioContext;
 if(!AudioCtor){audioState='unsupported';audioView();return;}
 audioIndex=index;audioState='loading';audioView();let instance;
 try{
  const ctx=new AudioCtor();instance={ctx,sources:[],nodes:[],gain:null};audio=instance;
  await ctx.resume();if(generation!==audioGeneration){release(instance);return;}
  if(ctx.state!=='running')throw Error('Audio context not running');
  configureAudio(instance,index);audioState='playing';audioView();
  ctx.onstatechange=()=>{if(audio===instance&&audioState==='playing'&&ctx.state!=='running')stopAudio();};
 }catch(_){release(instance);if(generation!==audioGeneration)return;audio=null;audioIndex=-1;audioState='error';audioView();}
};
range.addEventListener('input',()=>{volume=Math.max(0,Math.min(1,Number(range.value)/100));if(audio?.gain)audio.gain.gain.setTargetAtTime(volume,audio.ctx.currentTime,.03);audioView();});
function cleanup(){pauseTimer();stopBreathing();stopAudio();}
const previousShowPage=window.showPage;window.showPage=function(id){if(id!=='tools')cleanup();return previousShowPage(id);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)cleanup();});
window.addEventListener('pagehide',cleanup);
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();translate();};
function translate(){
 resetBtn.textContent=C().reset;minuteInput.setAttribute('aria-label',C().duration);
 document.querySelector('[data-i18n="tools.timer.d"]').textContent=C().timerDesc;
 document.querySelector('[data-i18n="tools.breath.d"]').textContent=C().breathDesc;
 document.querySelector('[data-i18n="tools.sound.d"]').textContent=C().soundDesc;
 el('mb-tools-policy').textContent=C().policy;timerView();breathView();audioView();
}
const policy=document.createElement('p');policy.id='mb-tools-policy';policy.className='mb-stage3-policy';document.querySelector('#page-tools .section').append(policy);
translate();
})();

