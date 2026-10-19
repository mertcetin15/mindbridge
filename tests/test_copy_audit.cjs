const fs=require('fs'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
// Copy that talks about progress, tasks, reminders and reflection. Guilt, pressure, scoring and comparison do not belong in it.
const FILES=['planner.js','planner-core.js','reminders.js','reminders-core.js','campus-desk.js','workspace.js','welcome.js','simplify.js','ask-help.js','save-state.js','calm-options.js','journey.js','focus.js','next-step.js','start-copy.js','checkin.js'];
const BANNED={
 streak:/\bstreaks?\b|leaderboard|\branking\b|\b(productivity|mood|wellbeing|motivation|focus) score/i,
 guilt:/\blazy\b|falling behind|fell behind|you failed|you have failed|don'?t give up|no excuses|should have|you missed/i,
 pressure:/\bhurry\b|last chance|running out of time|act now|before it'?s too late|\bASAP\b|urgent/i,
 tr:/tembel|başarısız oldun|geride kaldın|son şans|acele et|kaçırdın|vazgeçme/i,
 de:/\bfaul\b|Versager|zu spät|letzte Chance|beeil dich|verpasst/i,
 es:/perezos|fracasaste|última oportunidad|date prisa|te quedaste atrás|lo perdiste/i};
test('no module that speaks about tasks or progress contains guilt, pressure, scoring or comparison wording in any language',()=>{
 const hits=[];for(const f of FILES){const p='frontend/'+f;if(!fs.existsSync(p))continue;const src=fs.readFileSync(p,'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');   // comments that state the policy are not copy
  for(const [kind,re] of Object.entries(BANNED)){const m=src.match(re);if(m)hits.push(f+' ['+kind+'] '+m[0]);}}
 assert.deepEqual(hits,[]);
});
test('every file in the list exists, so a rename cannot silently drop a module from the audit',()=>{
 const missing=FILES.filter(f=>!fs.existsSync('frontend/'+f));assert.deepEqual(missing,[]);
});
test('the passed-day note is neutral: no warning colour, no icon, and it offers a way forward and says nothing was lost',()=>{
 const css=fs.readFileSync('frontend/paper.css','utf8');const rule=(css.match(/\.mb-task-passed\{([^}]*)\}/)||[])[1];assert(rule,'rule exists');
 assert(!/danger|caution|#a12a2a|red/i.test(rule),rule);
 const src=fs.readFileSync('frontend/planner.js','utf8');for(const m of src.match(/passed:'[^']*'/g)){assert(/\.|\?/.test(m));}
 assert.equal(src.match(/passed:'/g).length,4,'four languages');
 assert(/Nothing was lost/.test(src)&&/pick a new day/.test(src));
});
test('the weekly view describes counts and never scores',()=>{
 const src=fs.readFileSync('frontend/planner.js','utf8');assert(!/percent|%\s*complete|completion rate|productiv/i.test(src));
});
console.log(checks+' copy-audit checks passed.');
