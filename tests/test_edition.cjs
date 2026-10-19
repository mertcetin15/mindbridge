const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness(file,extra={}){const nodes=new Map(),events={},frames=new Map(),calls=[],draws=[],grains=[];let tick=0,doc;
 class E{constructor(tag='div',cls=''){this.tag=tag;this.className=cls;this.children=[];this.attrs={};this.dataset={};this.handlers={};this.style={setProperty(){}};this.textContent='';this.value='';}
 set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}get options(){return this.children;}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}append(...xs){for(const n of xs){n.parent=this;this.children.push(n);}}replaceChildren(...xs){this.children=[];this.append(...xs);}before(n){const p=this.parent;if(p){n.parent=p;p.children.splice(p.children.indexOf(this),0,n);}}after(n){const p=this.parent;if(p){n.parent=p;p.children.splice(p.children.indexOf(this)+1,0,n);}}
 addEventListener(k,f){this.handlers[k]=f;}emit(k,e={}){this.handlers[k]?.(e);}click(){if(!this.disabled)this.emit('click');}focus(){doc.activeElement=this;}scrollIntoView(){this.scrolled=true;}all(){return this.children.flatMap(n=>[n,...n.all()]);}querySelectorAll(s){return this.all().filter(n=>s.split(',').some(t=>t.startsWith('.')?n.className===t.slice(1):n.tag===t));}querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(){return this.parent;}getBoundingClientRect(){return {left:0,top:0,width:800,height:450};}getContext(){return {setTransform(){},fillRect(...args){grains.push(args);},beginPath(){},arc(...x){draws.push(x);},fill(){},stroke(){},moveTo(...x){draws.push(x);},lineTo(...x){draws.push(x);}};}setPointerCapture(v){this.capture=v;}hasPointerCapture(v){return this.capture===v;}releasePointerCapture(){this.capture=null;}toBlob(fn){fn({});}}
 const root=new E('div');root.id='page-library';const card=new E('section','tool-card'),canvas=new E('canvas');canvas.id='zen-canvas';card.append(new E('h3'),new E('p','sub'),canvas);for(const id of ['mb-planner','mb-focus-plan','journal-input']){const n=new E('section');n.id=id;n.append(new E('h2'));}
 doc={documentElement:{lang:'en'},getElementById:id=>nodes.get(id),querySelector:()=>root,createElement:t=>new E(t),activeElement:null,addEventListener:(k,f)=>events[k]=f};
 const ctx={document:doc,devicePixelRatio:2,requestAnimationFrame:f=>{frames.set(++tick,f);return tick;},setTimeout:f=>f(),URL:{createObjectURL:()=>{calls.push('export');return 'blob:test';},revokeObjectURL(){}},applyI18n(){},showPage:id=>calls.push(id),addEventListener:(k,f)=>events[k]=f};Object.assign(ctx,extra);ctx.window=ctx;if(file.includes('zen-studio'))vm.runInNewContext(fs.readFileSync('frontend/falling-sand.js','utf8'),ctx);if(file.includes('field-library'))vm.runInNewContext(fs.readFileSync('frontend/field-search-core.js','utf8'),ctx);vm.runInNewContext(fs.readFileSync(file,'utf8'),ctx);
 return {nodes,events,ctx,doc,root,card,canvas,calls,draws,grains,frames,flush(now=0){const xs=[...frames.values()];frames.clear();xs.forEach(f=>f(now));}};
}
const lib=harness('frontend/field-library.js'),cards=()=>lib.root.querySelectorAll('.mb-field-card'),button=(root,text)=>root.querySelectorAll('button').find(n=>n.textContent===text);
test('library has eighteen complete worksheets in all four languages',()=>{for(const lang of ['en','tr','de','es']){lib.doc.documentElement.lang=lang;lib.ctx.applyI18n();assert.equal(cards().length,18);cards().forEach(c=>{assert(c.querySelector('h2').textContent);assert.equal(c.querySelectorAll('li').length,3);assert(c.querySelector('blockquote').textContent);});}});
lib.doc.documentElement.lang='en';lib.ctx.applyI18n();const search=lib.nodes.get('mb-guide-search');search.value='notifications';search.emit('input');
test('search filters the full worksheet text',()=>assert.equal(cards().length,1));
button(cards()[0],'Read later').click();search.value='';search.emit('input');button(lib.root,'My reading list (1)').click();
test('reading list contains only explicitly saved guide IDs',()=>{assert.equal(cards().length,1);assert(cards()[0].querySelector('h2').textContent.includes('notifications'));});
button(cards()[0],'Remove from list').click();test('removing the last saved guide shows a recoverable empty state',()=>{assert.equal(cards().length,0);assert(lib.root.querySelector('.mb-field-empty'));button(lib.root,'Reset filters').click();assert.equal(cards().length,18);});
const fold=lib.ctx.MBFieldSearch.fold;
search.value='NOTIFICATIONS';search.emit('input');
test('library search ignores letter case',()=>assert.equal(cards().length,1));
test('a result says which parts of the guide matched',()=>{const why=cards()[0].querySelector('.mb-field-why');assert(why,'a why-line is shown while searching');assert(/^Matches in: (title|description|steps|question)(, (title|description|steps|question))*$/.test(why.textContent),why.textContent);});
search.value='';search.emit('input');test('without a search term no why-line is shown and every guide is listed',()=>{assert.equal(cards().length,18);assert.equal(lib.root.querySelectorAll('.mb-field-why').length,0);});
test('several words match in any order and need not be adjacent',()=>{
 const titles=cards().map(c=>c.querySelector('h2').textContent);const t=titles.find(x=>x.split(/\s+/).filter(w=>w.length>3).length>=2);const words=t.toLowerCase().split(/\s+/).filter(w=>w.length>3).slice(0,2);
 search.value=words.slice().reverse().join(' ');search.emit('input');assert(cards().some(c=>c.querySelector('h2').textContent===t),'reversed order still finds "'+t+'"');
 search.value=words[0]+' qqqzzz';search.emit('input');assert.equal(cards().length,0,'a word that appears nowhere removes the guide');search.value='';search.emit('input');
});
test('accents and Turkish dotted/dotless i are forgiven in all four languages',()=>{
 for(const lang of ['tr','de','es']){lib.doc.documentElement.lang=lang;lib.ctx.applyI18n();search.value='';search.emit('input');
  const target=cards().map(c=>c.querySelector('h2').textContent).find(x=>/[^\u0000-\u007f]/.test(x));if(!target)continue;
  const word=target.split(/\s+/).find(w=>/[^\u0000-\u007f]/.test(w)).replace(/[.,;:!?]/g,'');search.value=fold(word,lang).toUpperCase();search.emit('input');
  assert(cards().some(c=>c.querySelector('h2').textContent===target),lang+': typing "'+search.value+'" should find "'+target+'"');}
 lib.doc.documentElement.lang='en';lib.ctx.applyI18n();search.value='';search.emit('input');
});
test('an empty result names the search, counts the filters and offers a way back; the typed text is shown literally',()=>{
 search.value='zzzzqq';search.emit('input');let empty=lib.root.querySelector('.mb-field-empty');assert(empty);assert.equal(empty.querySelectorAll('p')[0].textContent,'No guide matches “zzzzqq”.');
 assert(/^Try fewer or shorter words/.test(empty.querySelectorAll('p')[1].textContent),'no filters on yet, so no filter count');
 const time=lib.nodes.get('mb-guide-time');time.value='5';time.emit('change');empty=lib.root.querySelector('.mb-field-empty');assert(/^Filters on: 1\. Try fewer/.test(empty.querySelectorAll('p')[1].textContent),empty.querySelectorAll('p')[1].textContent);
 search.value='zzqq $& $1';search.emit('input');empty=lib.root.querySelector('.mb-field-empty');assert.equal(empty.querySelectorAll('p')[0].textContent,'No guide matches “zzqq $& $1”.','replacement patterns in what is typed stay literal');
 button(lib.root,'Reset filters').click();assert.equal(cards().length,18);assert.equal(search.value,'');assert.equal(lib.nodes.get('mb-guide-time').value,'0');
});
test('nothing typed into the search is written to storage or sent anywhere',()=>{const src=fs.readFileSync('frontend/field-library.js','utf8')+fs.readFileSync('frontend/field-search-core.js','utf8');assert(!/localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon/.test(src));});const time=lib.nodes.get('mb-guide-time');time.value='2';time.emit('change');test('time filter returns only fitting exercises',()=>{assert.equal(cards().length,2);});
lib.events['mb:account-changed']();test('account changes clear reading-list membership',()=>assert(button(lib.root,'My reading list (0)')));
const zen=harness('frontend/zen-studio.js');zen.flush();const zbutton=text=>button(zen.card,text),key=k=>zen.canvas.emit('keydown',{key:k,preventDefault(){}});
test('canvas has no animation loop when idle',()=>assert.equal(zen.frames.size,0));
key(' ');key('ArrowRight');key('ArrowDown');key(' ');zen.flush();
test('keyboard stroke enables export and undo',()=>{assert(!zbutton('Undo').disabled);assert(!zbutton('Download PNG').disabled);assert(zen.draws.length>0);assert.equal(zen.frames.size,0);});
zbutton('Undo').click();zen.flush();test('undo removes the drawing; redo restores it',()=>{assert(zbutton('Download PNG').disabled);zbutton('Redo').click();zen.flush();assert(!zbutton('Download PNG').disabled);});
zbutton('Clear').click();zen.flush();test('clear is reversible',()=>{assert(zbutton('Download PNG').disabled);zbutton('Undo').click();zen.flush();assert(!zbutton('Download PNG').disabled);});
zbutton('Download PNG').click();test('PNG export is explicit and local',()=>assert(zen.calls.includes('export')));
zen.events['mb:account-changed']();zen.flush();test('account change clears canvas and all undo history',()=>{assert(zbutton('Download PNG').disabled);assert(zbutton('Undo').disabled);assert(zbutton('Redo').disabled);});
const e={button:0,pointerId:4,clientX:20,clientY:30,preventDefault(){}};zen.canvas.emit('pointerdown',e);zen.canvas.emit('pointermove',{...e,clientX:50});zen.canvas.emit('pointercancel');zen.flush();test('pointer cancellation releases capture without an idle loop',()=>{assert.equal(zen.canvas.capture,null);assert.equal(zen.frames.size,0);});
zen.doc.documentElement.lang='tr';zen.ctx.applyI18n();test('translation preserves a drawing and localizes its tools',()=>{assert(!zbutton('PNG indir').disabled);});

const sand=harness('frontend/zen-studio.js');sand.flush();const brush=sand.nodes.get('mb-zen-brush');brush.value='sand';brush.emit('change');sand.flush();
sand.canvas.emit('pointerdown',e);sand.flush(100);const first=sand.grains.length;sand.flush(200);
test('sand pours while held and grain marks accumulate',()=>{assert(sand.grains.length>first+12);assert(sand.frames.size>0);});
sand.canvas.emit('pointerup');for(let i=0;i<500&&sand.frames.size;i++)sand.flush(300+i*16);sand.grains.length=0;sand.ctx.mbZenResize();sand.flush(400);const pattern=JSON.stringify(sand.grains);
sand.grains.length=0;sand.ctx.mbZenResize();sand.flush(500);
test('settled sand is stable across redraws and stops when at rest',()=>{assert.equal(JSON.stringify(sand.grains),pattern);assert.equal(sand.frames.size,0);});
button(sand.card,'Undo').click();sand.flush();sand.grains.length=0;button(sand.card,'Redo').click();sand.flush();
test('undo and redo restore the exact sand grain arrangement',()=>assert.equal(JSON.stringify(sand.grains),pattern));
sand.canvas.emit('pointerdown',e);sand.flush(600);sand.doc.hidden=true;sand.ctx.showPage('home');sand.flush(700);
test('navigation stops sand pouring and releases the pointer',()=>{assert.equal(sand.frames.size,0);assert.equal(sand.canvas.capture,null);});
test('a sand tap released before the first animation frame still drops and settles grains',()=>{const h=harness('frontend/zen-studio.js');h.flush();const b=h.nodes.get('mb-zen-brush');b.value='sand';b.emit('change');h.flush();const e={key:' ',preventDefault(){}};h.canvas.emit('keydown',e);h.canvas.emit('keydown',e);for(let i=0;i<500&&h.frames.size;i++)h.flush(100+i*16);h.grains.length=0;h.ctx.mbZenResize();h.flush();assert(h.grains.some(p=>p[1]>430));assert.equal(h.frames.size,0);});
function dropOnce(extra){const h=harness('frontend/zen-studio.js',extra);h.flush();const b=h.nodes.get('mb-zen-brush');b.value='sand';b.emit('change');h.flush();const k={key:' ',preventDefault(){}};h.canvas.emit('keydown',k);h.flush(100);h.canvas.emit('keydown',k);return h;}
test('with normal motion released sand keeps animating on later frames (the baseline for the next check)',()=>{const h=dropOnce({});h.flush(120);assert(h.frames.size>0,'grains are still falling');});
test('with reduced motion released sand is already at rest after one frame: nothing visibly falls',()=>{
 const h=dropOnce({matchMedia:q=>({matches:/prefers-reduced-motion/.test(q)})});h.flush(120);assert.equal(h.frames.size,0,'no further animation frames are requested');
 h.grains.length=0;h.ctx.mbZenResize();h.flush(130);assert(h.grains.some(p=>p[1]>430),'the grains are drawn settled at the bottom');
});
test('the reduced-motion preference is read live: turning it on mid-session takes effect at the next pour',()=>{
 let reduce=false;const h=harness('frontend/zen-studio.js',{matchMedia:()=>({matches:reduce})});h.flush();const b=h.nodes.get('mb-zen-brush');b.value='sand';b.emit('change');h.flush();const k={key:' ',preventDefault(){}};
 h.canvas.emit('keydown',k);h.flush(100);h.canvas.emit('keydown',k);h.flush(120);assert(h.frames.size>0,'animating while the preference is off');
 for(let i=0;i<500&&h.frames.size;i++)h.flush(200+i*16);reduce=true;h.canvas.emit('keydown',k);h.flush(9000);h.canvas.emit('keydown',k);h.flush(9016);assert.equal(h.frames.size,0,'settles at once after the preference changes');
});
const translations={};vm.runInNewContext(fs.readFileSync('frontend/translations.js','utf8')+';globalThis.copy=I18N;',translations);
test('ten sourced stories are available in every language without fictional outcomes',()=>{for(const t of Object.values(translations.copy)){assert.equal(t.stories_data.length,10);for(const story of t.stories_data){assert(/^https:\/\//.test(story.url));assert(story.excerpt.length>40);assert(!story.outcome);}}});

console.log(`${checks} field library and drawing behavior checks passed (simulated DOM).`);
