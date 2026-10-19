const assert=require('assert');
const S=require('../frontend/field-search-core.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const guide=(over={})=>({title:'The assignment you cannot start',summary:'The document is open. The first sentence is not there.',steps:'Write one ugly sentence. Set a five minute timer. Stop when it rings.',question:'What would make the first minute easier?',...over});
test('case and accents are ignored on both sides, in every direction',()=>{
 for(const [typed,stored,lang] of [['kampus','Kampüs','tr'],['KAMPÜS','kampus','tr'],['cafe','Café','en'],['CAFÉ','cafe','en'],['senor','Señor','es'],['uber','Über','de'],['Strasse','Straße','de'],['istanbul','İstanbul','tr'],['ISTANBUL','ıstanbul','tr'],['ısı','isi','tr'],['STRESS','stress','en']])
  assert.equal(S.fold(typed,lang),S.fold(stored,lang),typed+' ~ '+stored);
});
test('folding is idempotent and never throws on odd input',()=>{
 for(const v of ['Kampüs','İİIıı','ß','','   ','\u0000','💔','a'.repeat(5000),null,undefined,42]){const once=S.fold(v,'tr');assert.equal(S.fold(once,'tr'),once);}
 assert.equal(S.fold('X','not-a-language'),'x','an invalid language tag falls back instead of throwing');
});
test('words are split on spaces and punctuation, deduplicated and capped',()=>{
 assert.deepEqual(S.tokens('  exam,   stress! "exam" ',''),['exam','stress']);
 assert.deepEqual(S.tokens('| ??? ...'),[]);assert.deepEqual(S.tokens(''),[]);assert.deepEqual(S.tokens(null),[]);
 assert.equal(S.tokens('a b c d e f g h i j k l').length,8);assert.deepEqual(S.tokens('well-being'),['well','being']);
});
test('every word must appear somewhere in the guide, in any order',()=>{
 assert.equal(S.match(guide(),'assignment start').matches,true);assert.equal(S.match(guide(),'start assignment').matches,true);
 assert.equal(S.match(guide(),'assignment holiday').matches,false,'one missing word excludes the guide');
 assert.equal(S.match(guide(),'sentence minute timer').matches,true,'words may come from different fields');
});
test('it reports which fields matched, in a fixed order, so the page can say why',()=>{
 assert.deepEqual(S.match(guide(),'assignment').where,['title']);
 assert.deepEqual(S.match(guide(),'sentence').where,['summary','steps']);
 assert.deepEqual(S.match(guide(),'timer easier').where,['steps','question']);
 assert.deepEqual(S.match(guide(),'minute assignment').where,['title','steps','question']);
 assert.deepEqual(S.FIELDS,['title','summary','steps','question']);
});
test('an empty or punctuation-only search matches everything and explains nothing',()=>{
 for(const q of ['','   ','|','???',null,undefined]){const r=S.match(guide(),q);assert.equal(r.matches,true);assert.deepEqual(r.where,[]);}
});
test('matching is exact on spelling: no guessing, no fuzzy results (a deliberate limit)',()=>{
 assert.equal(S.match(guide(),'asignment').matches,false);assert.equal(S.match(guide(),'timr').matches,false);
 assert.equal(S.match(guide(),'assign').matches,true,'but a beginning of a word is enough');
});
test('regular-expression characters and prototype-like words are just text',()=>{
 for(const q of ['.*','(a|b)','[a-z]+','\\d','constructor','__proto__','toString','$&','$1'])assert.doesNotThrow(()=>S.match(guide(),q));
 assert.equal(S.match(guide(),'.*').matches,true,'punctuation is a separator, so this is an empty search');
 assert.equal(S.match(guide(),'constructor').matches,false);
});
test('missing fields count as empty rather than crashing',()=>{
 assert.equal(S.match({title:'Only a title'},'title').matches,true);assert.equal(S.match({},'anything').matches,false);assert.deepEqual(S.match({title:'Only a title'},'title').where,['title']);
});
test('a thousand guides are filtered in well under a tenth of a second',()=>{
 const rows=Array.from({length:1000},(_,i)=>guide({title:'Guide '+i+' kampüs',summary:'x'.repeat(200)}));const t0=process.hrtime.bigint();let n=0;for(const r of rows)if(S.match(r,'kampus guide 7',  'tr').matches)n++;const ms=Number(process.hrtime.bigint()-t0)/1e6;
 assert(n>0&&ms<100,n+' matches in '+ms.toFixed(1)+' ms');
});
console.log(checks+' library-search core checks passed.');
(()=>{ // Related guides (UX-13): from the editorial category only, in four languages, and they never read the query.
 const src=require('fs').readFileSync('frontend/field-library.js','utf8');
 assert.equal((src.match(/moreIn:'/g)||[]).length,4);
 const fn=src.slice(src.indexOf('function more(i,cat){'),src.indexOf('function paint()'));
 assert(/catOf\(n\)===cat/.test(fn),'related guides share the category');
 assert(!/\bquery\b|hit\.|saved\.|localStorage|fetch\(/.test(fn.replace(/query='';/,'')),'related guides use nothing the person typed, saved or did');
 console.log('PASS related guides come from the editorial category only');checks++;
})();
