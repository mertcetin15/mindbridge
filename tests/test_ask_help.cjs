const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-ask-help">([\s\S]*?)<\/script>/)[1];
let checks=0;const queue=[];function test(name,fn){queue.push(async()=>{await fn();checks++;console.log('PASS '+name);});}
function harness({clipboard='ok',share=true}={}){
 const ids=new Map(),listeners={},clips=[],shares=[];
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';this.value='';this.hidden=false;}
  get textContent(){return this._t;}set textContent(v){this._t=v;}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}before(n){this.sibling=n;}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}}
 const page=new E('div'),grid=new E('div');page.querySelector=s=>s==='.contact-grid'?grid:null;
 const ctx={curLang:'en',console,document:{getElementById:id=>id==='page-contact'?page:ids.get(id),createElement:t=>new E(t)},
  navigator:{clipboard:{writeText:async t=>{if(clipboard==='fail')throw new Error('denied');clips.push(t);}}},
  addEventListener:(k,f)=>{listeners[k]=f;},applyI18n(){}};
 if(share)ctx.navigator.share=async d=>{shares.push(d);};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 const $=id=>ids.get(id);return {ctx,$,clips,shares,listeners};
}
test('a template is prefilled, editable, and nothing is sent or stored',()=>{
 const h=harness();assert(/difficult week/.test(h.$('mb-ask-message').value));assert.equal(h.clips.length,0);assert.equal(h.shares.length,0);
 assert(/does not contact anyone/.test(h.$('mb-ask-help').children.at(-1).textContent));
});
test('audience and tone change the template',()=>{
 const h=harness();h.$('mb-ask-who').value='2';h.$('mb-ask-tone').value='1';h.$('mb-ask-who').l.change();
 const v=h.$('mb-ask-message').value;assert(v.startsWith('Hello, I would like to ask about support.'));assert(/need some support/.test(v));
});
test('the person’s edits are never overwritten by changing the options',()=>{
 const h=harness(),msg=h.$('mb-ask-message');msg.value='My own words, please keep.';msg.l.input();
 h.$('mb-ask-tone').value='2';h.$('mb-ask-tone').l.change();
 assert.equal(msg.value,'My own words, please keep.');assert(/edits are kept/.test(h.$('mb-ask-status').textContent));
 h.$('mb-ask-reset').l.click();assert(/Could we talk soon/.test(msg.value));
});
test('copy writes exactly the edited text and reports success; failure is reported honestly',async()=>{
 const h=harness(),msg=h.$('mb-ask-message');msg.value='Edited text';msg.l.input();await h.$('mb-ask-copy').l.click();
 assert.deepEqual(h.clips,['Edited text']);assert(/^Copied/.test(h.$('mb-ask-status').textContent));
 const f=harness({clipboard:'fail'});await f.$('mb-ask-copy').l.click();assert(/Could not copy/.test(f.$('mb-ask-status').textContent));
});
test('Share exists only when the device offers it and runs only on a press',async()=>{
 const yes=harness();assert.equal(yes.$('mb-ask-share').hidden,false);assert.equal(yes.shares.length,0);await yes.$('mb-ask-share').l.click();assert.equal(yes.shares.length,1);
 const no=harness({share:false});assert.equal(no.$('mb-ask-share').hidden,true);
});
test('four languages relabel and re-translate an unedited template; edited text is kept',()=>{
 const h=harness();h.ctx.curLang='de';h.ctx.applyI18n();assert(/schwere Woche/.test(h.$('mb-ask-message').value));assert.equal(h.$('mb-ask-copy').textContent,'Nachricht kopieren');
 h.ctx.curLang='tr';h.ctx.applyI18n();assert(/Zor bir hafta/.test(h.$('mb-ask-message').value));
 const msg=h.$('mb-ask-message');msg.value='Kendi sözlerim';msg.l.input();h.ctx.curLang='es';h.ctx.applyI18n();assert.equal(msg.value,'Kendi sözlerim');assert.equal(h.$('mb-ask-copy').textContent,'Copiar mensaje');
});
test('account change and page exit clear the draft',()=>{
 const h=harness(),msg=h.$('mb-ask-message');msg.value='private words';msg.l.input();h.listeners['mb:account-changed']();assert(/difficult week/.test(msg.value));
 msg.value='more private words';h.listeners.pagehide();assert.equal(msg.value,'');
});
(async()=>{for(const t of queue)await t();console.log(checks+' ask-for-support checks passed.');})().catch(e=>{console.error(e);process.exit(1);});
