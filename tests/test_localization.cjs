const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const LANGS=['en','tr','de','es'];
function balanced(src,start){let depth=0,q=null,esc=false;for(let i=start;i<src.length;i++){const c=src[i];if(q){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===q)q=null;continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return src.slice(start,i+1);}}return null;}
const flat=(o,p='',out={})=>{for(const [k,v] of Object.entries(o)){const key=p?p+'.'+k:k;if(Array.isArray(v)){out[key+'[]']=v.length;v.forEach((x,i)=>{if(x&&typeof x==='object')flat(x,key+'['+i+']',out);else out[key+'['+i+']']=x;});}else if(v&&typeof v==='object')flat(v,key,out);else out[key]=v;}return out;};
const tokens=s=>typeof s==='string'?(s.match(/\{[a-zA-Z]+\}|%s|%d|\$\{[^}]+\}/g)||[]).sort().join(','):'';
const modules=fs.readdirSync('frontend').filter(f=>f.endsWith('.js')&&f!=='translations.js');
function languageBlocks(){const found=[];for(const f of modules){const src=fs.readFileSync('frontend/'+f,'utf8');const re=/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\{/g;let m;
 while((m=re.exec(src))){const text=balanced(src,m.index+m[0].length-1);if(!text||text.length<200||!/[{,]\s*en\s*:\s*[\[{]/.test(text))continue;let obj;try{obj=vm.runInNewContext('('+text+')',{});}catch(e){continue;}
  if(LANGS.every(l=>obj[l]&&typeof obj[l]==='object'))found.push({file:f,name:m[1],flat:Object.fromEntries(LANGS.map(l=>[l,flat(obj[l])]))});}}return found;}
test('the main translation table has the same keys and array lengths in all four languages, and no untranslated copy of an English sentence',()=>{
 const ctx={};vm.runInNewContext(fs.readFileSync('frontend/translations.js','utf8')+';globalThis.OUT=I18N;',ctx);const I=ctx.OUT;assert.deepEqual(Object.keys(I).sort(),[...LANGS].sort());
 const F=Object.fromEntries(LANGS.map(l=>[l,flat(I[l])]));const keys=new Set(LANGS.flatMap(l=>Object.keys(F[l])));assert(keys.size>150,'sanity: '+keys.size);
 for(const l of LANGS)assert.deepEqual([...keys].filter(k=>!(k in F[l])),[],l+' is missing keys');
 // Source links are the same in every language on purpose; only sentences count here.
 for(const l of LANGS.slice(1))assert.deepEqual(Object.keys(F.en).filter(k=>typeof F.en[k]==='string'&&F.en[k].length>25&&!/^https?:\/\//.test(F.en[k])&&F[l][k]===F.en[k]),[],l+' has English left in');
});
test('every module that carries its own per-language copy has the same keys, array lengths and placeholders in all four languages',()=>{
 const blocks=languageBlocks();assert(blocks.length>=31,'only found '+blocks.length+' language blocks, the scanner may have broken');
 const problems=[];for(const b of blocks){const keys=new Set(LANGS.flatMap(l=>Object.keys(b.flat[l])));
  for(const l of LANGS){const miss=[...keys].filter(k=>!(k in b.flat[l]));if(miss.length)problems.push(b.file+' '+b.name+' '+l+' missing '+miss.slice(0,4).join(','));}
  for(const k of keys)for(const l of LANGS.slice(1))if(k in b.flat[l]&&tokens(b.flat[l][k])!==tokens(b.flat.en[k]))problems.push(b.file+' '+b.name+' '+l+' placeholder mismatch '+k);}
 assert.deepEqual(problems,[]);
});
test('the modules added in recent releases are all among the blocks that are checked',()=>{
 const names=new Set(languageBlocks().map(b=>b.file));for(const f of ['simplify.js','save-state.js','ask-help.js','reminders.js','welcome.js','calm-options.js','recovery-ui.js','email-ui.js','recovery-ui.js','calm-room.js','planner.js','focus.js','zen-studio.js','studio.js'])assert(names.has(f),f+' is not being checked');
});
test('no empty translation and no string that is only whitespace in any checked block',()=>{
 const empty=[];for(const b of languageBlocks())for(const l of LANGS)for(const [k,v] of Object.entries(b.flat[l]))if(typeof v==='string'&&!v.trim())empty.push(b.file+' '+b.name+' '+l+' '+k);assert.deepEqual(empty,[]);
});
test('the page sets its language attribute and every language option is offered',()=>{
 const page=fs.readFileSync('frontend/page.html','utf8');assert(/<html[^>]*lang="en"/.test(page));for(const l of LANGS)assert(new RegExp("setLang\\('"+l+"'\\)").test(page)||new RegExp('data-mb-click="setLang\\(\'' +l+ '\'\\)"').test(page),'language option '+l);
});
test('a stored day (YYYY-MM-DD) is shown in the reader’s language and never slips a day in any time zone',()=>{
 const planner=fs.readFileSync('frontend/planner.js','utf8');assert(/dayText\(task\.due\)/.test(planner)&&/dayText\(s\.from\)/.test(planner)&&/dayText\(s\.to\)/.test(planner),'the planner formats days through dayText');
 const show=(iso,locale,zone)=>new Intl.DateTimeFormat(locale,{day:'numeric',month:'short',year:'numeric',timeZone:zone}).format(new Date(iso+'T00:00:00Z'));
 for(const [locale,expect] of [['en-GB',/19/],['tr-TR',/19/],['de-DE',/19/],['es-ES',/19/]]){const text=show('2026-10-19',locale,'UTC');assert(expect.test(text)&&/2026/.test(text)&&text!=='2026-10-19',locale+': '+text);}
 assert.notEqual(show('2026-10-19','en-GB','UTC'),show('2026-10-19','de-DE','UTC'),'different languages give different text');
 assert(/19/.test(show('2026-10-19','en-GB','UTC')),'UTC formatting keeps the day');assert(/18/.test(show('2026-10-19','en-GB','Pacific/Pago_Pago')),'the premise: local formatting at UTC midnight would show the previous day west of UTC, which is why the planner pins UTC');
});
console.log(checks+' localization checks passed.');
