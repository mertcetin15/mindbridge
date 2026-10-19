const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-recovery-ui">([\s\S]*?)<\/script>/)[1];
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
function harness({signedIn=false,hasCode=false,failWith=null}={}){
 const ids=new Map(),calls=[],listeners={};let user=signedIn?{id:'u1',username:'alice'}:null,codeExists=hasCode;
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';this.className='';this.hidden=false;this.value='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}}
 const panel=new E('section');ids.set('mb-account-panel',panel);
 const ctx={console,navigator:{clipboard:{writeText:async()=>{}}},
  document:{documentElement:{lang:'en'},getElementById:id=>ids.get(id),createElement:t=>new E(t)},
  fetch:async(url,opt={})=>{calls.push({url,method:opt.method||'GET',body:opt.body?JSON.parse(opt.body):null,csrf:opt.headers&&opt.headers['X-CSRF-Token']});
   const ok=(data,status=200)=>({ok:status<400,status,json:async()=>data});
   if(url==='/api/auth/me')return ok({user,csrf:user?'c'.repeat(64):null});
   if(url==='/api/auth/recovery')return ok({has_code:codeExists});
   if(failWith)return ok({error:{code:failWith.code}},failWith.status);
   if(url==='/api/auth/recovery-code'){codeExists=true;return ok({code:'ABCDE-FGHJK-LMNPQ-RSTUV',valid_days:365});}
   if(url==='/api/auth/recover')return ok({user:{id:'u1',username:'alice'}});
   return ok({},404);},
  addEventListener:(k,f)=>{listeners[k]=f;},dispatchEvent(){},CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail;},applyI18n(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,ids,calls,listeners,panel,flush:()=>new Promise(r=>setTimeout(r,10))};
}
const walk=(n,f)=>{f(n);n.children.forEach(c=>walk(c,f));};
(async()=>{
await test('signed out: only the "forgot password" form is offered, with plain limits stated',async()=>{
 const h=harness();await h.flush();assert.equal(h.ids.get('mb-recover').hidden,false);assert.equal(h.ids.get('mb-recovery-create').hidden,true);
 assert(/cannot be recovered/.test(h.ids.get('mb-recover').textContent));
});
await test('signed in: only the recovery-code section is offered, and it says what it is for and that it can be replaced',async()=>{
 const h=harness({signedIn:true});await h.flush();assert.equal(h.ids.get('mb-recover').hidden,true);assert.equal(h.ids.get('mb-recovery-create').hidden,false);
 const t=h.ids.get('mb-recovery-create').textContent;assert(/no email address/.test(t)&&/replaces the old one/.test(t)&&/do not have a recovery code yet/.test(t));
});
await test('creating a code sends the password with the CSRF token, shows the code once and clears the password field',async()=>{
 const h=harness({signedIn:true});await h.flush();h.ids.get('mb-recovery-password').value='long-test-password';h.ids.get('mb-recovery-go').l.click();await h.flush();
 const call=h.calls.find(c=>c.url==='/api/auth/recovery-code');assert.deepEqual(call.body,{password:'long-test-password'});assert.equal(call.csrf.length,64);
 assert.equal(h.ids.get('mb-recovery-code').textContent,'ABCDE-FGHJK-LMNPQ-RSTUV');assert.equal(h.ids.get('mb-recovery-shown').hidden,false);assert.equal(h.ids.get('mb-recovery-password').value,'');
});
await test('the code disappears when hidden, when the account changes and when the page is left',async()=>{
 for(const how of ['hide','account','pagehide']){
  const h=harness({signedIn:true});await h.flush();h.ids.get('mb-recovery-password').value='long-test-password';h.ids.get('mb-recovery-go').l.click();await h.flush();
  if(how==='hide')h.ids.get('mb-recovery-hide').l.click();else if(how==='account')h.listeners['mb:account-changed']();else h.listeners.pagehide();await h.flush();
  assert.equal(h.ids.get('mb-recovery-code').textContent,'',how);assert.equal(h.ids.get('mb-recovery-shown').hidden,true,how);}
});
await test('a wrong password for creating a code gives a plain message and shows no code',async()=>{
 const h=harness({signedIn:true,failWith:{code:'invalid_credentials',status:401}});await h.flush();h.ids.get('mb-recovery-password').value='wrong';h.ids.get('mb-recovery-go').l.click();await h.flush();
 assert(/not right/.test(h.ids.get('mb-recovery-status').textContent));assert.equal(h.ids.get('mb-recovery-code').textContent,'');
});
await test('recovering sends username (lower case), code and new password, then clears the fields and tells the person to make a new code',async()=>{
 const h=harness();await h.flush();h.ids.get('mb-recover-user').value=' Alice ';h.ids.get('mb-recover-code').value='abcde-fghjk-lmnpq-rstuv';h.ids.get('mb-recover-new').value='a-brand-new-password';
 h.ids.get('mb-recover-form').l.submit({preventDefault(){}});await h.flush();
 const call=h.calls.find(c=>c.url==='/api/auth/recover');assert.deepEqual(call.body,{username:'alice',code:'abcde-fghjk-lmnpq-rstuv',new_password:'a-brand-new-password'});
 assert.equal(h.ids.get('mb-recover-new').value,'');assert.equal(h.ids.get('mb-recover-code').value,'');assert(/create a new one now/.test(h.ids.get('mb-recover-status').textContent));
});
await test('every failed recovery shows one neutral message that reveals nothing; rate limits say wait',async()=>{
 for(const [fail,expect] of [[{code:'invalid_recovery',status:401},/did not work/],[{code:'auth_rate_limit',status:429},/Too many tries/],[{code:'storage_unavailable',status:503},/Nothing was changed/]]){
  const h=harness({failWith:fail});await h.flush();h.ids.get('mb-recover-user').value='someone';h.ids.get('mb-recover-code').value='x';h.ids.get('mb-recover-new').value='a-brand-new-password';
  h.ids.get('mb-recover-form').l.submit({preventDefault(){}});await h.flush();assert(expect.test(h.ids.get('mb-recover-status').textContent),JSON.stringify(fail));
  assert(!/exist|unknown|no such/i.test(h.ids.get('mb-recover-status').textContent));}
});
await test('nothing is written to browser storage and the code is never logged',async()=>{
 for(const word of ['localStorage','sessionStorage','indexedDB','console.'])assert(!source.includes(word),word);
});
console.log(checks+' recovery interface checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
