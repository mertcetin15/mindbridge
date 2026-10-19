const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-events">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness(){
 const calls=[],errors=[];let clickHandler;
 class El{constructor(attrs={},parent=null){this.attrs=attrs;this.parentElement=parent;}getAttribute(k){return k in this.attrs?this.attrs[k]:null;}}
 const mk=(attrs,parent)=>new El(attrs,parent);
 const ctx={console:{error:m=>errors.push(m)},Element:El,Object,Number,Error,Map,Set,
  document:{addEventListener:(k,f)=>{if(k==='click')clickHandler=f;}},
  eval:()=>{calls.push('EVAL');},
  location:{assign:()=>calls.push('ASSIGN')},
  record:(...a)=>calls.push(a),
  handleNavClick:(...a)=>{calls.push(['nav',...a]);},
  toggleS:(...a)=>{calls.push(['toggleS',...a]);},
  filterS:(...a)=>{calls.push(['filterS',...a]);},
  saveJournal:()=>{calls.push(['save']);return false;},
  adjustTimer:(...a)=>{calls.push(['adjust',...a]);},
  scrollToTop:()=>{calls.push(['top']);}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 const fire=(target)=>{const ev={target,defaultPrevented:false,cancelBubble:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.cancelBubble=true;}};clickHandler(ev);return ev;};
 return {ctx,calls,errors,mk,fire};
}
test('calls the named function with literal arguments, numbers and the clicked element',()=>{
 const h=harness(),el=h.mk({'data-mb-click':"filterS('stress',this)"});h.fire(el);
 assert.deepEqual(h.calls[0].slice(0,2),['filterS','stress']);assert.strictEqual(h.calls[0][2],el);
 h.calls.length=0;h.fire(h.mk({'data-mb-click':'adjustTimer(-5)'}));assert.deepEqual(h.calls,[['adjust',-5]]);
});
test('a click on a child reaches the parent action, like an inline handler would',()=>{
 const h=harness(),parent=h.mk({'data-mb-click':"handleNavClick('tools')"}),child=h.mk({},parent);h.fire(child);assert.deepEqual(h.calls,[['nav','tools']]);
});
test('";return false" and a false result both cancel the default action',()=>{
 const h=harness();assert.equal(h.fire(h.mk({'data-mb-click':"handleNavClick('home');return false"})).defaultPrevented,true);
 assert.equal(h.fire(h.mk({'data-mb-click':'saveJournal()'})).defaultPrevented,true);
 assert.equal(h.fire(h.mk({'data-mb-click':"handleNavClick('home')"})).defaultPrevented,false);
});
test('event.stopPropagation() on a link keeps the ancestor action from running',()=>{
 const h=harness(),card=h.mk({'data-mb-click':'toggleS(this)'}),link=h.mk({'data-mb-click':'event.stopPropagation()'},card),text=h.mk({},link);
 const ev=h.fire(text);assert.equal(ev.cancelBubble,true);assert.equal(h.calls.length,0);
 h.fire(h.mk({},card));assert.equal(h.calls.length,1,'clicking elsewhere on the card still toggles it');
});
test('dangerous or unknown actions are refused and logged, never executed',()=>{
 const h=harness();
 for(const bad of ["eval('1')","location.assign('javascript:alert(1)')","document.write('<b>')","constructor.constructor('x')()","record(1)","handleNavClick('a');record(2)","handleNavClick(1+1)","handleNavClick(window)","handleNavClick(`x`)","  "]){
  const before=h.calls.length,ev=h.fire(h.mk({'data-mb-click':bad}));assert.equal(h.calls.length,before,'must not run: '+bad);assert.equal(ev.defaultPrevented,false);
 }
 assert(h.errors.length>=9,'each refusal is logged');assert(!h.calls.includes('EVAL')&&!h.calls.includes('ASSIGN'));
});
test('elements without the attribute and non-element targets are ignored',()=>{
 const h=harness();h.fire(h.mk({}));h.fire(null);h.fire({});assert.equal(h.calls.length,0);assert.equal(h.errors.length,0);
});
test('every action named in the markup and in script templates is on the allow-list',()=>{
 const names=new Set();const scan=text=>{for(const m of text.matchAll(/data-mb-click=\\?"([^"\\]*)\\?"/g)){const call=/^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\(/.exec(m[1]);assert(call,'unparseable: '+m[1]);names.add(call[1]);}};
 scan(fs.readFileSync('frontend/page.html','utf8'));for(const f of fs.readdirSync('frontend').filter(f=>f.endsWith('.js')&&f!=='events.js'))scan(fs.readFileSync('frontend/'+f,'utf8'));
 const allowed=new Set([...source.match(/ALLOWED=new Set\(\[([^\]]*)\]\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]));
 assert(names.size>=20,'found '+names.size);for(const n of names)assert(allowed.has(n),'missing from allow-list: '+n);
 for(const n of allowed)if(n!=='event.stopPropagation')assert(names.has(n),'allow-list entry is unused: '+n);
});
test('the served page and every script use no inline event-handler attributes',()=>{
 const offenders=[];const scan=(label,text)=>{for(const m of text.matchAll(/\son(click|input|change|submit|mouse[a-z]+|key[a-z]+|focus|blur|load|error|touch[a-z]+|pointer[a-z]+)\s*=/g))offenders.push(label+':'+m[0].trim());};
 scan('page.html',fs.readFileSync('frontend/page.html','utf8'));scan('index.html',fs.readFileSync('frontend/index.html','utf8'));
 for(const f of fs.readdirSync('frontend').filter(f=>f.endsWith('.js')&&f!=='events.js'))scan(f,fs.readFileSync('frontend/'+f,'utf8'));
 assert.deepEqual(offenders,[]);
});
console.log(checks+' delegated-event checks passed.');
