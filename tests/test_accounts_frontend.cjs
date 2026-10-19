const vm=require('vm'),fs=require('fs'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
const code=fs.readFileSync('frontend/accounts.js','utf8');
const nodes=new Map(),listeners={},calls=[];let user=null,csrf=null,records=[],failSave=false,guestCalls=0,replySave=null;
class E{constructor(){this.children=[];this.dataset={};this.style={};this.textContent='';this.value='';this.hidden=false;this.classList={add(){},toggle(){}};}set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}append(...n){this.children.push(...n);}after(){}setAttribute(k,v){this[k]=v;}replaceChildren(...n){this.children=n;}addEventListener(k,f){this[k]=f;}focus(){}reportValidity(){return true;}querySelectorAll(){const all=[];const walk=n=>{if(n.dataset.key)all.push(n);n.children.forEach(walk);};this.children.forEach(walk);return all;}remove(){}click(){this.clickHandler?.();}}
for(const id of ['journal-input','gratitude-input','journal-status','gratitude-status','mood-feedback',...['journal','gratitude','mood'].flatMap(t=>['mb-list-'+t,'mb-privacy-'+t,'mb-summary-'+t])]){const e=new E();e.id=id;}
const body=new E(),section=new E(),moods=['😫','😞','😐','🙂','🤩'].map(t=>{const e=new E();e.textContent=t;return e;});
const ctx={console,curLang:'en',crypto:require('crypto').webcrypto,AbortController,CustomEvent:class{constructor(type){this.type=type;}},location:{protocol:'http:'},setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>JSON.stringify({version:2,entries:[{id:'guest-1',type:'journal',text:'Old guest note',at:'2025-01-01T12:00:00Z'}]})},document:{body,getElementById:id=>nodes.get(id),createElement:()=>new E(),querySelector:()=>section,querySelectorAll:()=>moods},applyI18n(){for(const t of ['journal','gratitude','mood'])nodes.get('mb-list-'+t).replaceChildren();},saveJournal(){guestCalls++;nodes.get('journal-input').value='';},saveGratitude(){guestCalls++;},selectMood(){guestCalls++;},confirm:()=>true,addEventListener:(k,f)=>(listeners[k]??=[]).push(f),dispatchEvent:e=>{for(const f of listeners[e.type]||[])f();}};ctx.window=ctx;
ctx.fetch=async(path,options={})=>{
 const data=options.body?JSON.parse(options.body):null;calls.push({path,data,headers:options.headers});
 let result={};let status=200;
 if(path==='/api/auth/me')result={user,csrf};
 else if(path==='/api/auth/register'||path==='/api/auth/login'){user={id:'u-'+data.username,username:data.username};csrf='c'.repeat(64);records=[];result={user,csrf};}
 else if(path.startsWith('/api/entries?'))result={user_id:user?.id,entries:records.slice(),total:records.length};
 else if(path==='/api/entries'){if(replySave)return new Promise(res=>replySave(res));if(failSave){status=503;result={error:{code:'storage_unavailable'}};}else{const e={id:'r-'+records.length,type:data.type,text:data.text,at:'2026-10-12T08:00:00Z'};records.unshift(e);result={entries:[e]};}}
 else if(path==='/api/auth/logout'||path==='/api/auth/delete'||path==='/api/auth/password'){user=null;csrf=null;result={ok:true};}
 else if(path==='/api/entries/import'){for(const e of data.entries)records.push({...e,id:e.client_id});result={ok:true};}
 return {ok:status===200,status,json:async()=>result};
};vm.createContext(ctx);vm.runInContext(code,ctx);
const tick=()=>new Promise(res=>setImmediate(res));let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
(async()=>{
await tick();check('guest default makes no record upload',()=>assert(!calls.some(c=>c.path==='/api/entries')));
nodes.get('journal-input').value='Guest';await ctx.saveJournal();check('guest delegates to existing local storage handler',()=>assert.equal(guestCalls,1));
nodes.get('mb-account-username').value='alice';nodes.get('mb-account-password').value='long-test-password';await nodes.get('mb-account-form').submit({preventDefault(){}});await tick();
check('sign-in paints account and clears credential input',()=>{assert(nodes.get('mb-account-status').textContent.includes('ready'));assert.equal(nodes.get('mb-account-password').value,'');assert(nodes.get('mb-account-form').hidden);});
nodes.get('journal-input').value='<img src=x onerror=evil>';await ctx.saveJournal();check('account saves server-side with csrf and safe plain text',()=>{const call=calls.find(c=>c.path==='/api/entries');assert.equal(call.headers['X-CSRF-Token'],'c'.repeat(64));assert.equal(call.headers['X-MindBridge-Client'],'v5');assert.equal(nodes.get('journal-input').value,'');assert.equal(nodes.get('mb-list-journal').children[0].children[1].textContent,'<img src=x onerror=evil>');});
failSave=true;nodes.get('journal-input').value='Keep draft';await ctx.saveJournal();const failed=calls.at(-1).data.client_id;
check('failure preserves draft and reports database failure',()=>{assert.equal(nodes.get('journal-input').value,'Keep draft');assert(nodes.get('journal-status').textContent.includes('Database'));});
failSave=false;await ctx.saveJournal();check('retry keeps same idempotency id',()=>assert.equal(calls.filter(c=>c.path==='/api/entries').at(-1).data.client_id,failed));
check('guest import never runs automatically',()=>assert(!calls.some(c=>c.path==='/api/entries/import')));
await nodes.get('mb-import').click();check('explicit import copies original guest dates and IDs',()=>{const call=calls.find(c=>c.path==='/api/entries/import');assert.equal(call.data.entries[0].client_id,'guest-1');});
ctx.curLang='tr';ctx.applyI18n();check('language refresh keeps account privacy labels',()=>assert(nodes.get('mb-privacy-journal').textContent.includes('Hesap')));
await nodes.get('mb-logout').click();check('logout clears account histories and restores guest UI',()=>{assert(!nodes.get('mb-account-form').hidden);assert.equal(nodes.get('mb-list-journal').children.length,0);assert(nodes.get('mb-privacy-journal').textContent.includes('Misafir'));});
console.log(checks+' account frontend checks passed; all scripts parse.');
})().catch(e=>{console.error(e);process.exit(1)});
