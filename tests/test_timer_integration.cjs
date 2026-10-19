const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness(){
 const nodes=new Map(),listeners={},jobs=new Map();let now=0,seq=0;
 class E{set textContent(v){this._text=v;this.textWrites=(this.textWrites||0)+1;}get textContent(){return this._text;}constructor(){this.children=[];this.attrs={};this.style={};this.value='';this.textContent='';this.disabled=false;this.active=false;this.classList={toggle:(k,v)=>this.active=v,add(){}};}set value(v){this._value=String(v);}get value(){return this._value;}set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}removeAttribute(k){delete this.attrs[k];}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this[k]=f;}after(){}before(){}append(...a){this.children.push(...a);}}
 const ids=['timer-btn','timer-minutes','time-display','timer-circle','breath-btn','breath-text','breath-circle','sound-status'];for(const id of ids){const n=new E();n.id=id;}nodes.get('timer-minutes').value='5';
 const sounds=[new E(),new E(),new E()],steps=[new E(),new E()],other=new Map();
 const contexts=[];let resumeMode='ok';
 class N{constructor(){this.gain={value:1,setTargetAtTime(v){this.value=v;}};this.frequency={value:0};this.stopped=false;this.disconnected=false;}connect(){}disconnect(){this.disconnected=true;}start(){this.started=true;}stop(){this.stopped=true;}}
 class AC{constructor(){this.state='suspended';this.sampleRate=8000;this.currentTime=0;this.destination={};this.nodes=[];contexts.push(this);}resume(){if(resumeMode==='fail')return Promise.reject(Error('blocked'));if(resumeMode==='defer')return new Promise((res,rej)=>{this.resolve=()=>{this.state='running';res();};this.reject=rej;});this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}createGain(){const n=new N();this.nodes.push(n);return n;}createOscillator(){const n=new N();this.nodes.push(n);return n;}createBiquadFilter(){const n=new N();this.nodes.push(n);return n;}createBufferSource(){const n=new N();this.nodes.push(n);return n;}createBuffer(c,len){const samples=new Float32Array(len);this.samples=samples;return {getChannelData:()=>samples};}}
 const media={matches:false,addEventListener(k,f){this.change=f;}};
 const doc={hidden:false,getElementById:id=>nodes.get(id),createElement:()=>new E(),querySelectorAll:s=>s==='.sound-btn'?sounds:steps,querySelector:s=>{if(!other.has(s))other.set(s,new E());return other.get(s);},addEventListener:(k,f)=>listeners[k]=f};
 const langs={en:{timer:{btn:'Start',pause:'Pause',resume:'Resume'},breath:{btn:'Start breathing',stop:'Stop',ready:'Ready?',inhale:'Inhale',hold:'Hold',exhale:'Exhale'},sound:{playing:'Playing'}},tr:{timer:{btn:'Başlat',pause:'Duraklat',resume:'Devam'},breath:{btn:'Nefes başlat',stop:'Durdur',ready:'Hazır?',inhale:'Al',hold:'Tut',exhale:'Ver'},sound:{playing:'Çalıyor'}}};
 const ctx={console,document:doc,curLang:'en',T:()=>({tools:langs[ctx.curLang]||langs.en}),performance:{now:()=>now},setInterval:(fn,delay)=>{jobs.set(++seq,{fn,delay,kind:'interval'});return seq;},clearInterval:id=>jobs.delete(id),setTimeout:(fn,delay)=>{jobs.set(++seq,{fn,delay,kind:'timeout'});return seq;},clearTimeout:id=>jobs.delete(id),AudioContext:AC,matchMedia:()=>media,applyI18n(){},showPage(id){ctx.page=id;},addEventListener:(k,f)=>listeners[k]=f};ctx.window=ctx;ctx.CustomEvent=class {constructor(type,init){this.type=type;this.detail=init.detail;}};const events=[];ctx.dispatchEvent=e=>events.push(e.detail.state);vm.createContext(ctx);vm.runInContext(html.match(/<script id="mindbridge-stage-three">([\s\S]*?)<\/script>/)[1],ctx);
 return {events,ctx,nodes,sounds,steps,contexts,jobs,media,doc,listeners,time:v=>now=v,mode:v=>resumeMode=v,fire:kind=>{const job=[...jobs].find(([,j])=>j.kind===kind);assert(job,'Expected job');if(kind==='timeout')jobs.delete(job[0]);job[1].fn();}};
}
(async()=>{
const h=harness(),{ctx,nodes}=h;
test('initial display is a five-minute small step',()=>{assert.equal(nodes.get('time-display').textContent,'05:00');assert.equal(nodes.get('timer-minutes').value,'5');});
test('invalid durations rejected without starting',()=>{for(const v of ['','0','181','1.5','wat']){nodes.get('timer-minutes').value=v;ctx.toggleTimer();assert.equal(h.jobs.size,0);assert.equal(nodes.get('timer-minutes').attrs['aria-invalid'],'true');}});
test('deadline follows elapsed time instead of callback count',()=>{nodes.get('timer-minutes').value='1';ctx.toggleTimer();h.time(15500);h.fire('interval');assert.equal(nodes.get('time-display').textContent,'00:45');assert(nodes.get('timer-minutes').disabled);});
test('repeated ticks within the same displayed second do not rewrite the clock',()=>{const clock=nodes.get('time-display'),before=clock.textWrites;for(const n of [15600,15700,15800,15900]){h.time(n);h.fire('interval');}assert.equal(clock.textWrites,before);h.time(15500);});
test('pause preserves subsecond remainder; no ticking while paused',()=>{ctx.toggleTimer();assert.equal(h.jobs.size,0);h.time(70000);ctx.toggleTimer();h.time(70500);h.fire('interval');assert.equal(nodes.get('time-display').textContent,'00:44');});
test('completion clamps zero and releases interval',()=>{h.time(120000);h.fire('interval');assert.equal(nodes.get('time-display').textContent,'00:00');assert.equal(h.jobs.size,0);assert(!nodes.get('timer-minutes').disabled);assert.equal(nodes.get('mb-timer-status').textContent,'Session complete.');});
test('reset stops an active timer',()=>{ctx.toggleTimer();nodes.get('mb-timer-reset').click();assert.equal(h.jobs.size,0);assert.equal(nodes.get('time-display').textContent,'01:00');});
test('adjustments clamp 1–180 and clear validation',()=>{ctx.adjustTimer(999);assert.equal(nodes.get('timer-minutes').value,'180');ctx.adjustTimer(-999);assert.equal(nodes.get('timer-minutes').value,'1');});
test('only the user\'s own duration choice is remembered; storage failure is harmless',()=>{
 const store={};ctx.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 ctx.adjustTimer(9);assert.equal(store['mindbridge.timer.minutes'],'10');
 nodes.get('timer-minutes').value='12';nodes.get('timer-minutes').change();assert.equal(store['mindbridge.timer.minutes'],'12');
 nodes.get('timer-minutes').value='30';ctx.setTimerFromInput();assert.equal(store['mindbridge.timer.minutes'],'12','programmatic durations must not become the default');
 nodes.get('timer-minutes').value='abc';nodes.get('timer-minutes').change();assert.equal(store['mindbridge.timer.minutes'],'12','invalid input is not stored');
 ctx.localStorage={getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}};ctx.adjustTimer(1);
});
test('a suggested length applies for the moment: not remembered, refused while running, and restorable to the person’s own default',()=>{
 const store={'mindbridge.timer.minutes':'12'};ctx.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 assert.equal(ctx.mbSetTimerMinutes(2),true);assert.equal(nodes.get('time-display').textContent,'02:00');assert.equal(nodes.get('timer-minutes').value,'2');assert.equal(store['mindbridge.timer.minutes'],'12','a momentary suggestion never becomes the default');
 for(const bad of [0,181,1.5,'3'])assert.equal(ctx.mbSetTimerMinutes(bad),false);assert.equal(nodes.get('time-display').textContent,'02:00');
 assert.equal(ctx.mbRestoreTimerMinutes(),true);assert.equal(nodes.get('time-display').textContent,'12:00','back to what the person saved');
 ctx.toggleTimer();assert.equal(ctx.mbSetTimerMinutes(2),false,'never changes a running timer');assert.equal(nodes.get('time-display').textContent.length,5);nodes.get('mb-timer-reset').click();
});
test('progress is exposed as --p for the linear presentation and tracks elapsed time',()=>{
 const seen=[];nodes.get('timer-circle').style.setProperty=(k,v)=>seen.push([k,v]);
 nodes.get('timer-minutes').value='10';ctx.setTimerFromInput();ctx.adjustTimer(0);
 assert.deepEqual(seen.at(-1),['--p','100.00']);
 h.time(1000);ctx.toggleTimer();h.time(1000+300000);h.fire('interval');
 assert.deepEqual(seen.at(-1),['--p','50.00'],'half of ten minutes elapsed');
 nodes.get('mb-timer-reset').click();delete nodes.get('timer-circle').style.setProperty;
});
test('breathing transitions 4/7/8 correctly',()=>{h.time(0);ctx.toggleBreathing();assert.equal(nodes.get('breath-text').textContent,'Inhale');h.time(4000);h.fire('timeout');assert.equal(nodes.get('breath-text').textContent,'Hold');h.time(11000);h.fire('timeout');assert.equal(nodes.get('breath-text').textContent,'Exhale');});
test('stop cancels pending callback and resets animation',()=>{ctx.toggleBreathing();assert.equal(h.jobs.size,0);assert.equal(nodes.get('breath-circle').style.transform,'scale(1)');assert.equal(nodes.get('breath-text').textContent,'Ready');});
test('delayed breathing callback catches up and finishes four cycles',()=>{h.time(0);ctx.toggleBreathing();h.time(30000);h.fire('timeout');assert.equal(nodes.get('breath-text').textContent,'Exhale');assert(nodes.get('mb-breath-status').textContent.includes('2/4'));h.time(76000);h.fire('timeout');assert.equal(h.jobs.size,0);assert.equal(nodes.get('mb-breath-status').textContent,'Exercise complete.');});
test('reduced-motion mode removes scaling',()=>{h.media.matches=true;ctx.toggleBreathing();assert.equal(nodes.get('breath-circle').style.transform,'scale(1)');ctx.toggleBreathing();});
await ctx.toggleSound(h.sounds[0],0);
test('real noise buffer/source starts and playing state is truthful',()=>{const ac=h.contexts.at(-1);assert.equal(ac.state,'running');assert(ac.nodes.some(n=>n.started));assert(ac.samples.some(v=>v!==0));assert.equal(h.sounds[0].attrs['aria-pressed'],'true');});
test('volume and mute change actual gain',()=>{const range=nodes.get('mb-volume');range.value='0';range.input();assert.equal(h.contexts.at(-1).nodes[0].gain.value,0);range.value='35';range.input();assert.equal(h.contexts.at(-1).nodes[0].gain.value,.35);});
const old=h.contexts.at(-1);await ctx.toggleSound(h.sounds[1],1);
test('switching releases old sources and context',()=>{assert.equal(old.state,'closed');assert(old.nodes.filter(n=>n.started).every(n=>n.stopped&&n.disconnected));assert.equal(h.sounds[0].attrs['aria-pressed'],'false');assert.equal(h.sounds[1].attrs['aria-pressed'],'true');});
await ctx.toggleSound(h.sounds[2],2);
test('soft tones create three oscillators',()=>assert.equal(h.contexts.at(-1).nodes.filter(n=>n.started).length,3));
await ctx.toggleSound(h.sounds[2],2);
test('same sound toggles off',()=>assert.equal(h.contexts.at(-1).state,'closed'));
h.mode('defer');const pending=ctx.toggleSound(h.sounds[0],0);const first=h.contexts.at(-1);const latest=ctx.toggleSound(h.sounds[1],1);const second=h.contexts.at(-1);second.resolve();await latest;first.resolve();await pending;
test('rapid switching rejects a late old resume',()=>{assert.equal(first.state,'closed');assert.equal(h.sounds[1].attrs['aria-pressed'],'true');assert.equal(h.sounds[0].attrs['aria-pressed'],'false');});
const cancel=ctx.toggleSound(h.sounds[2],2);const cancelContext=h.contexts.at(-1);nodes.get('mb-audio-stop').click();cancelContext.resolve();await cancel;
test('stop during startup cannot restart audio',()=>{assert.equal(cancelContext.state,'closed');assert(h.sounds.every(b=>b.attrs['aria-pressed']==='false'));});
h.mode('fail');await ctx.toggleSound(h.sounds[0],0);
test('blocked audio reports error and closes context',()=>{assert.equal(h.contexts.at(-1).state,'closed');assert(nodes.get('sound-status').textContent.includes('could not start'));assert.equal(h.sounds[0].attrs['aria-pressed'],'false');});
h.mode('ok');await ctx.toggleSound(h.sounds[0],0);ctx.toggleTimer();ctx.toggleBreathing();ctx.curLang='tr';ctx.applyI18n();
test('language change preserves running state and labels',()=>{assert.equal(nodes.get('timer-btn').textContent,'Duraklat');assert.equal(nodes.get('breath-btn').textContent,'Durdur');assert(nodes.get('sound-status').textContent.includes('Çalıyor'));});
h.doc.hidden=true;h.listeners.visibilitychange();
test('hidden tab cleans all scheduled work and audio; timer paused',()=>{assert.equal(h.jobs.size,0);assert.equal(h.contexts.at(-1).state,'closed');assert.equal(nodes.get('timer-btn').textContent,'Devam');});
ctx.toggleTimer();ctx.toggleBreathing();await ctx.toggleSound(h.sounds[0],0);ctx.showPage('home');
test('leaving tools cleans resources',()=>{assert.equal(h.jobs.size,0);assert.equal(h.contexts.at(-1).state,'closed');assert.equal(ctx.page,'home');});
test('missing Web Audio is explicitly unsupported',()=>{ctx.AudioContext=undefined;ctx.toggleSound(h.sounds[0],0);assert(nodes.get('sound-status').textContent.includes('desteklemiyor'));});
test('timer emits changed states without repeated tick events',()=>{for(const s of ['idle','running','paused','complete'])assert(h.events.includes(s));assert(h.events.every((s,i)=>i===0||s!==h.events[i-1]));});
console.log(`${checks} behavior checks passed; all inline scripts parse.`);
})().catch(e=>{console.error(e);process.exit(1);});
