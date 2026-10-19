/* When is a Self-check answer set "elevated", and which options follow. Pure functions, no storage, no network.
   Answers are 0..3 (0 = least). Elevated here means: at least two answers at 2 or higher, or any answer at 3.
   That is a description of the answers the person gave for this sitting. It is not a score, not a diagnosis and
   it is never saved or sent. */
(root=>{
'use strict';
function elevated(answers){const a=(answers||[]).filter(v=>Number.isInteger(v));return a.filter(v=>v>=2).length>=2||a.some(v=>v===3);}
// Five options, none preferred. `tool` is the tools-page card (data-i18n tools.<tool>.h) that is only opened, never started.
const OPTIONS=[{id:'breathing',tool:'breath'},{id:'grounding',tool:'ground'},{id:'journaling',tool:'journal'},{id:'break',tool:'break'},{id:'continue',tool:null}];
const api={elevated,OPTIONS};root.MBCalmOptions=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
