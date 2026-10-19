const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-save-state">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){return Promise.resolve(fn()).then(()=>{checks++;console.log('PASS '+name);});}
function harness(saveImpl){
 const nodes=new Map(),handlers={};
 class E{constructor(id){this.id=id;this.attrs={};this._text='';this.value='';this.l={};}
  get textContent(){return this._text;}set textContent(v){this._text=v;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  addEventListener(k,f){this.l[k]=f;}before(n){this.sibling=n;}}
 const input=new E('journal-input'),status=new E('journal-status'),gratitude=new E('gratitude-status');
 for(const n of [input,status,gratitude])nodes.set(n.id,n);
 const ctx={curLang:'en',console,document:{getElementById:id=>nodes.get(id),createElement:()=>new E('')},
  addEventListener:(k,f)=>{handlers[k]=f;},applyI18n(){ctx.i18nRuns=(ctx.i18nRuns||0)+1;}};
 ctx.window=ctx;ctx.saveJournal=()=>saveImpl(input,status);
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,input,status,gratitude,state:status.sibling,handlers};
}
(async()=>{
 await test('typing shows an unsaved state with symbol and words; clearing hides it',()=>{
  const h=harness(()=>{});h.input.value='hello';h.input.l.input();
  assert.equal(h.state.attrs['data-state'],'unsaved');assert(h.state.textContent.startsWith('✎ Not saved yet'));
  h.input.value='  ';h.input.l.input();assert.equal(h.state.textContent,'');assert.equal(h.state.attrs['data-state'],undefined);
 });
 await test('saved appears only after the existing code clears the field',async()=>{
  const h=harness(async(input,status)=>{await null;input.value='';status.textContent='Saved to your account.';});
  h.input.value='my day';h.input.l.input();const pending=h.ctx.saveJournal();
  assert.equal(h.state.attrs['data-state'],'saving','shows saving while the write is pending');
  assert(!h.state.textContent.includes('Saved to your account'));
  await pending;assert.equal(h.state.attrs['data-state'],'saved');
  assert(/^✓ Saved to your account\. \(Last confirmed /.test(h.state.textContent),h.state.textContent);
 });
 await test('a failed write never says saved and keeps the text',async()=>{
  const h=harness(async(input,status)=>{await null;status.textContent='Could not save. Your text is kept.';});
  h.input.value='keep me';await h.ctx.saveJournal();
  assert.equal(h.state.attrs['data-state'],'failed');assert(h.state.textContent.startsWith('! Could not save'));
  assert(!/saved/i.test(h.state.textContent.replace('Could not save','')));assert.equal(h.input.value,'keep me');
 });
 await test('a thrown error is a failure, not a success',async()=>{
  const h=harness(async()=>{throw new Error('network');});h.input.value='x';await h.ctx.saveJournal();
  assert.equal(h.state.attrs['data-state'],'failed');assert(h.state.textContent.startsWith('! Not saved.'),'falls back to the built-in failure text');
 });
 await test('blank save falls through to the existing message without a saving state',async()=>{
  let called=0;const h=harness((i,s)=>{called++;s.textContent='Write something first.';});
  await h.ctx.saveJournal();assert.equal(called,1);assert.equal(h.state.textContent,'');
 });
 await test('double activation while saving is ignored',async()=>{
  let called=0;const h=harness(async(input)=>{called++;await null;input.value='';});
  h.input.value='once';const a=h.ctx.saveJournal(),b=h.ctx.saveJournal();await Promise.all([a,b]);assert.equal(called,1);
 });
 await test('leaving with unsaved text asks the browser to confirm; empty field does not',()=>{
  const h=harness(()=>{});const ev={prevented:false,preventDefault(){this.prevented=true;}};
  h.input.value='draft';h.handlers.beforeunload(ev);assert(ev.prevented&&ev.returnValue);
  const ev2={prevented:false,preventDefault(){this.prevented=true;}};h.input.value='';h.handlers.beforeunload(ev2);assert(!ev2.prevented);
 });
 await test('status regions are announced politely and language changes re-render',()=>{
  const h=harness(()=>{});assert.equal(h.status.attrs['aria-live'],'polite');assert.equal(h.gratitude.attrs.role,'status');
  h.input.value='x';h.input.l.input();h.ctx.curLang='de';h.ctx.applyI18n();assert(h.state.textContent.includes('Noch nicht gespeichert'));
 });
 console.log(checks+' save-state checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
