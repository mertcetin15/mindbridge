const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
// Execute the actual scroll controller with a deterministic animation-frame queue.
const frames=[],handlers={},nodes=new Map();let lookups=0;
const document={documentElement:{scrollHeight:2000,clientHeight:1000},getElementById(id){lookups++;if(!nodes.has(id))nodes.set(id,{style:{},classList:{toggle(k,v){this[k]=v;}}});return nodes.get(id);}};
const ctx={document,scrollY:600,addEventListener:(type,fn,options)=>handlers[type]={fn,options},requestAnimationFrame:fn=>frames.push(fn)};ctx.window=ctx;
const source=fs.readFileSync('frontend/app.js','utf8');vm.runInNewContext(source.slice(source.indexOf('let scrollFramePending='),source.indexOf('function toggleMobileNav()')),ctx);
for(let i=0;i<100;i++)handlers.scroll.fn();
test('100 scroll events schedule one frame with no immediate layout reads',()=>{assert.equal(frames.length,1);assert.equal(lookups,0);assert.equal(handlers.scroll.options.passive,true);});
frames.shift()();
test('one scroll frame updates only navigation, progress and top button',()=>{assert.equal(lookups,3);assert.equal(nodes.get('scroll-progress').style.transform,'scaleX(0.6)');assert(nodes.get('back-to-top').classList.visible);});
// Exercise workspace links against existing targets; no target is replaced.
const targets=new Map(),buttons=[];let focused=null;
function element(){return {attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this[k]=fn;},append(n){this.children.push(n);buttons.push(n);},focus(){focused=this;},scrollIntoView(){this.scrolled=true;},querySelector(){return this;}};}
for(const id of ['mb-planner','mb-focus-plan','mb-account-panel'])targets.set(id,element());const grid=element();targets.set('mb-tools-grid',grid);let bar;const section={after(n){bar=n;}};targets.set('page-tools',{querySelector:s=>s==='.tools-grid'?grid:section});
const studio={document:{documentElement:{lang:'en'},getElementById:id=>targets.get(id),createElement:()=>element()},applyI18n(){}};studio.window=studio;vm.runInNewContext(fs.readFileSync('frontend/studio.js','utf8'),studio);
test('workspace shortcuts scroll to existing content and move focus',()=>{buttons.forEach((b,i)=>{b.click();const t=targets.get(b.attrs['aria-controls']);assert(t.scrolled);assert.strictEqual(focused,t);});assert.equal(buttons.length,4);});
studio.document.documentElement.lang='tr';studio.applyI18n();
test('workspace shortcut labels change language without rebuilding buttons',()=>{assert.equal(buttons[0].textContent,'Planın');assert.equal(bar.attrs['aria-label'],'Çalışma alanın');assert.equal(buttons.length,4);});
console.log(`${checks} performance and workspace checks passed (operation counts, not browser FPS).`);
