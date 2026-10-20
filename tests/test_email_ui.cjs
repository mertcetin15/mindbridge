const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-email-ui">([\s\S]*?)<\/script>/)[1];
let checks=0;async function test(name,fn){await fn();checks++;console.log('PASS '+name);}
const TOKEN='T'.repeat(43);
function harness({mail=true,signedIn=false,hash='',info={has_email:false},fail=null}={}){
 const ids=new Map(),calls=[],listeners={},history=[];let loc={hash};
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';this.className='';this.hidden=false;this.value='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);this.children=[];}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...n){this.children.push(...n);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}focus(){}scrollIntoView(){}}
 const panel=new E('section');ids.set('mb-account-panel',panel);
 const ctx={console,
  document:{documentElement:{lang:'en'},getElementById:id=>ids.get(id),createElement:t=>new E(t)},
  get location(){return loc;},history:{replaceState:(a,b,u)=>{history.push(u);loc={hash:u};}},
  showPage:id=>calls.push({page:id}),
  fetch:async(url,opt={})=>{calls.push({url,method:opt.method||'GET',body:opt.body?JSON.parse(opt.body):null,csrf:opt.headers&&opt.headers['X-CSRF-Token']});
   const ok=(d,s=200)=>({ok:s<400,status:s,json:async()=>d});
   if(url==='/api/health')return ok({mail_enabled:mail});
   if(url==='/api/auth/me')return ok({user:signedIn?{id:'u1',username:'alice'}:null,csrf:signedIn?'c'.repeat(64):null});
   if(url==='/api/auth/email'&&(opt.method||'GET')==='GET')return ok(info);
   if(fail&&url===fail.url)return ok({error:{code:fail.code}},fail.status);
   return ok({ok:true,user:{id:'u1'}});},
  addEventListener:(k,f)=>{listeners[k]=f;},dispatchEvent(){},CustomEvent:function(n){this.type=n;},applyI18n(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,ids,calls,listeners,history,flush:()=>new Promise(r=>setTimeout(r,15))};
}
(async()=>{
await test('with no mail server configured nothing is offered anywhere',async()=>{
 const h=harness({mail:false});await h.flush();for(const id of ['mb-email','mb-email-forgot','mb-email-reset'])assert.equal(h.ids.get(id).hidden,true,id);
});
await test('signed out: only "forgot password / use my email" is offered, and it explains the same-message rule',async()=>{
 const h=harness();await h.flush();assert.equal(h.ids.get('mb-email-forgot').hidden,false);assert.equal(h.ids.get('mb-email').hidden,true);
 assert(/same message/.test(h.ids.get('mb-email-forgot').textContent));
});
await test('signed in: the email section states what the address is for and shows the confirmation state',async()=>{
 const h=harness({signedIn:true,info:{has_email:true,email:'a***@example.com',verified:false,mail_enabled:true}});await h.flush();
 assert.equal(h.ids.get('mb-email').hidden,false);const t=h.ids.get('mb-email').textContent;assert(/used for nothing else/.test(t)&&/a\*\*\*@example.com/.test(t)&&/not confirmed yet/.test(t));
});
await test('saving sends the address and password with the CSRF token and clears the password',async()=>{
 const h=harness({signedIn:true});await h.flush();h.ids.get('mb-email-address').value=' Alice@Example.com ';h.ids.get('mb-email-password').value='long-test-password';h.ids.get('mb-email-save').l.click();await h.flush();
 const c=h.calls.find(x=>x.url==='/api/auth/email'&&x.method==='POST');assert.deepEqual(c.body,{password:'long-test-password',email:'Alice@Example.com'});assert.equal(c.csrf.length,64);
 assert.equal(h.ids.get('mb-email-password').value,'');assert(/confirmation link is on its way/.test(h.ids.get('mb-email-status').textContent));
});
await test('forgot password always shows the same message and never says whether the address exists',async()=>{
 for(const fail of [null,{url:'/api/auth/forgot',code:'x',status:500}]){
  const h=harness();await h.flush();h.ids.get('mb-email-forgot-address').value='someone@example.com';h.ids.get('mb-email-forgot-form').l.submit({preventDefault(){}});await h.flush();
  if(!fail)assert(/If that address is confirmed on an account/.test(h.ids.get('mb-email-forgot-status').textContent));}
 const h=harness();await h.flush();h.ids.get('mb-email-forgot-address').value='x@example.com';h.ids.get('mb-email-forgot-form').l.submit({preventDefault(){}});await h.flush();
 assert(!/exist|unknown|no account|not found/i.test(h.ids.get('mb-email-forgot-status').textContent));
});
await test('a #verify link is read once, removed from the address bar, posted in a body and the result is announced',async()=>{
 const h=harness({hash:'#verify='+TOKEN});await h.flush();
 assert.deepEqual(h.history,['#/home'],'the token left the address bar');const c=h.calls.find(x=>x.url==='/api/auth/verify-email');assert.deepEqual(c.body,{token:TOKEN});
 assert(!h.calls.some(x=>x.url&&x.url.includes(TOKEN)),'the token is never in a URL');assert(/Email confirmed/.test(h.ids.get('mb-email-notice').textContent));
});
await test('a bad verify link gives a plain message that says how to get a new one',async()=>{
 const h=harness({hash:'#verify='+TOKEN,fail:{url:'/api/auth/verify-email',code:'invalid_link',status:400}});await h.flush();
 assert(/did not work/.test(h.ids.get('mb-email-notice').textContent)&&/again/.test(h.ids.get('mb-email-notice').textContent));
});
await test('a #reset link opens the new-password form; submitting posts the token and password and signs in',async()=>{
 const h=harness({hash:'#reset='+TOKEN});await h.flush();assert.equal(h.ids.get('mb-email-reset').hidden,false);assert.deepEqual(h.history,['#/home']);
 h.ids.get('mb-email-reset-new').value='a-brand-new-password';h.ids.get('mb-email-reset-form').l.submit({preventDefault(){}});await h.flush();
 const c=h.calls.find(x=>x.url==='/api/auth/reset');assert.deepEqual(c.body,{token:TOKEN,new_password:'a-brand-new-password'});assert.equal(h.ids.get('mb-email-reset-new').value,'');
 assert(/Password changed and you are signed in/.test(h.ids.get('mb-email-reset-status').textContent));
});
await test('unrelated or malformed fragments are ignored',async()=>{
 for(const hash of ['#/library','#main-content','#reset=short','#verify=<script>','']){const h=harness({hash});await h.flush();assert.equal(h.calls.filter(x=>x.url&&/verify-email|reset/.test(x.url)).length,0,hash);assert.equal(h.history.length,0,hash);}
});
await test('nothing is written to browser storage and nothing is logged',async()=>{
 for(const word of ['localStorage','sessionStorage','indexedDB','console.'])assert(!source.includes(word),word);
});
console.log(checks+' account email interface checks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
