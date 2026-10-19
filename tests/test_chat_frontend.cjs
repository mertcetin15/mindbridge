const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
const script=html.match(/<script id="mindbridge-stage-four">([\s\S]*?)<\/script>/)[1];
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name);}
function harness(protocol='file:'){
 const nodes=new Map(),queries=new Map(),jobs=new Map(),listeners={};let id=0,fetcher=()=>Promise.resolve({ok:true,json:async()=>({version:'4.0.0',ai_configured:true})}),calls=[];
 class E{constructor(){this.children=[];this.attrs={};this.style={};this.value='';this.checked=false;this.disabled=false;this.textContent='';}set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}get options(){return this.children;}removeAttribute(k){delete this.attrs[k];}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this[k]=f;}append(...a){this.children.push(...a);}prepend(...a){this.children.unshift(...a);}after(){}replaceChildren(...a){this.children=a;}focus(){this.focused=true;}}
 for(const key of ['chat-input-box','chat-history']){const e=new E();e.id=key;}
 const ctx={console,curLang:'en',AbortController,location:{protocol},document:{getElementById:k=>nodes.get(k),createElement:()=>new E(),querySelector:s=>{if(!queries.has(s))queries.set(s,new E());return queries.get(s);}},setTimeout:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},clearTimeout:n=>jobs.delete(n),fetch:(...a)=>{calls.push(a);return fetcher(...a);},applyI18n(){},showPage(){},addEventListener:(k,f)=>listeners[k]=f};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(script,ctx);
 return {ctx,nodes,jobs,listeners,calls,fetch:f=>fetcher=f,send:queries.get('#page-chat button[data-mb-click="sendChatMessage()"]')};
}
async function settle(){await Promise.resolve();await Promise.resolve();await Promise.resolve();}
(async()=>{
const h=harness(),input=h.nodes.get('chat-input-box');
test('standalone starts with honest offline status; no network',()=>{assert.equal(h.calls.length,0);assert(h.nodes.get('mb-chat-status').textContent.includes('unavailable'));});
input.value='<img src=x onerror=alert(1)>';await h.ctx.sendChatMessage();
test('offline chat preserves draft and never fabricates a reply',()=>{assert.equal(h.calls.length,0);assert.equal(input.value,'<img src=x onerror=alert(1)>');assert.equal(h.nodes.get('chat-history').children.length,1);});
h.nodes.get('mb-chat-mode').value='ai';h.nodes.get('mb-chat-mode').change();input.value='I may kill myself';await h.ctx.sendChatMessage();
test('human support shortcut works without backend or consent',()=>{assert.equal(h.calls.length,0);assert(h.nodes.get('chat-history').children.at(-1).children[1].textContent.includes('116 123'));});
h.nodes.get('mb-chat-clear').click();input.value='Hello';await h.ctx.sendChatMessage();
test('AI consent enforced before any send',()=>{assert.equal(h.calls.length,0);assert(h.nodes.get('mb-chat-status').textContent.includes('accept'));assert.equal(input.value,'Hello');});
h.ctx.location.protocol='http:';await h.nodes.get('mb-chat-refresh').click();
test('health means configured, not live verified',()=>assert(h.nodes.get('mb-chat-status').textContent.includes('not yet verified')));
h.nodes.get('mb-chat-consent').checked=true;
h.fetch(async(url,opts)=>({ok:true,json:async()=>({reply:'<script>evil</script>',source:'ai'})}));await h.ctx.sendChatMessage();
test('AI body has same-origin relative URL, consent, no secret; safe rendered reply',()=>{const call=h.calls.at(-1);assert.equal(call[0],'/api/chat');const data=JSON.parse(call[1].body);assert.equal(data.consent,true);assert.equal(data.messages.at(-1).content,'Hello');assert.equal(call[1].headers['X-MindBridge-Client'],'v4');assert.equal(h.nodes.get('chat-history').children.at(-1).children[1].textContent,'<script>evil</script>');assert(h.nodes.get('mb-chat-status').textContent.includes('received'));});
input.value='Another';h.fetch(async()=>({ok:false,status:429,json:async()=>({error:{code:'rate_limit'}})}));await h.ctx.sendChatMessage();
test('429 preserves draft, adds no fake reply, unlocks controls',()=>{assert.equal(input.value,'Another');assert.equal(h.nodes.get('chat-history').children.length,2);assert(!h.send.disabled);assert(h.nodes.get('mb-chat-status').textContent.includes('Too many'));});
h.fetch(async()=>({ok:false,status:429,json:async()=>({error:{code:'ai_quota'}})}));await h.ctx.sendChatMessage();
test('daily AI quota gets its own honest message, keeps the draft and adds no reply',()=>{const s=h.nodes.get('mb-chat-status').textContent;assert(s.includes('today’s AI replies')&&!s.includes('Wait a minute'));assert.equal(input.value,'Another');assert.equal(h.nodes.get('chat-history').children.length,2);assert(!h.send.disabled);});
h.fetch(async()=>({ok:true,json:async()=>({reply:'Wrong',source:'demo'})}));await h.ctx.sendChatMessage();
test('AI refuses mislabeled provider/demo result',()=>{assert(h.nodes.get('mb-chat-status').textContent.includes('invalid'));assert.equal(input.value,'Another');});
let resolve;h.fetch(()=>new Promise(r=>resolve=r));const pending=h.ctx.sendChatMessage();await settle();const requestCount=h.calls.length;await h.ctx.sendChatMessage();
test('duplicate sends suppressed while waiting',()=>{assert.equal(h.calls.length,requestCount);assert(h.send.disabled);assert(!h.nodes.get('mb-chat-cancel').hidden);});
h.nodes.get('mb-chat-clear').click();resolve({ok:true,json:async()=>({reply:'Late',source:'ai'})});await pending;
test('clear cancels and ignores late reply; resets consent',()=>{assert.equal(h.nodes.get('chat-history').children.length,1);assert(!h.nodes.get('mb-chat-consent').checked);assert(!h.send.disabled);});
h.nodes.get('mb-chat-consent').checked=true;input.value='Keep draft';h.fetch((url,options)=>new Promise((res,rej)=>options.signal.addEventListener('abort',()=>rej(Error('aborted')))));const timeout=h.ctx.sendChatMessage();await settle();[...h.jobs.values()].find(j=>j.ms===32000).fn();await timeout;
test('timeout aborts request, keeps draft, allows retry',()=>{assert.equal(input.value,'Keep draft');assert(h.nodes.get('mb-chat-status').textContent.includes('No response in time'));assert(!h.send.disabled);});
const cancel=h.ctx.sendChatMessage();await settle();h.nodes.get('mb-chat-cancel').click();await cancel;
test('cancel reports provider may still process; preserves draft',()=>{assert.equal(input.value,'Keep draft');assert(h.nodes.get('mb-chat-status').textContent.includes('may still'));});
const nav=h.ctx.sendChatMessage();await settle();h.ctx.showPage('tools');await nav;
test('navigation aborts waiting request',()=>assert(!h.send.disabled));
h.ctx.curLang='tr';h.ctx.applyI18n();
test('language changes translate controls',()=>assert.equal(h.nodes.get('mb-chat-clear').textContent,'Sohbeti temizle'));
let prevented=false;h.ctx.handleChatEnter({key:'Enter',isComposing:true,preventDefault(){prevented=true;}});
test('IME composition Enter does not send',()=>assert(!prevented));
input.value='x'.repeat(2001);await h.ctx.sendChatMessage();
test('oversized input is rejected locally',()=>assert(h.nodes.get('mb-chat-status').textContent.includes('2.000')));
h.ctx.curLang='en';h.nodes.get('mb-chat-clear').click();h.nodes.get('mb-chat-consent').checked=true;h.fetch(async()=>({ok:true,json:async()=>({reply:'a'.repeat(5000),source:'ai'})}));
for(let i=0;i<15;i++){input.value='Message '+i;await h.ctx.sendChatMessage();}
test('history context is bounded and retains valid role alternation',()=>{const data=JSON.parse(h.calls.at(-1)[1].body);assert(data.messages.length<=21);assert(data.messages.reduce((n,m)=>n+m.content.length,0)<=12000);assert.equal(data.messages[0].role,'user');assert.equal(data.messages.at(-1).role,'user');});
h.listeners.pagehide();
test('pagehide clears chat memory and consent',()=>{assert.equal(h.nodes.get('chat-history').children.length,1);assert(!h.nodes.get('mb-chat-consent').checked);});
const secured=harness('http:');
secured.fetch(async()=>({ok:true,json:async()=>({version:'4.0.0',ai_configured:true,ai_requires_login:true})}));await secured.nodes.get('mb-chat-refresh').click();
secured.nodes.get('mb-chat-mode').value='ai';secured.nodes.get('mb-chat-mode').change();secured.nodes.get('mb-chat-consent').checked=true;secured.nodes.get('chat-input-box').value='Study plan';
secured.fetch(async()=>({ok:true,json:async()=>({user:null,csrf:null})}));await secured.ctx.sendChatMessage();
test('hosted AI requires login before sending a provider request',()=>{assert(secured.nodes.get('mb-chat-status').textContent.includes('Sign in'));assert.equal(secured.calls.at(-1)[0],'/api/auth/me');assert.equal(secured.nodes.get('chat-input-box').value,'Study plan');});
secured.fetch(async(url)=>({ok:true,json:async()=>url==='/api/auth/me'?{user:{id:'u'},csrf:'valid-token'}:{reply:'Plan response',source:'ai'}}));await secured.ctx.sendChatMessage();
test('hosted AI sends current csrf without persisting it',()=>{assert.equal(secured.calls.at(-1)[1].headers['X-CSRF-Token'],'valid-token');assert.equal(secured.nodes.get('chat-input-box').value,'');});
console.log(`${count} frontend behavior checks passed; all inline scripts parse.`);
})().catch(e=>{console.error(e);process.exit(1);});
