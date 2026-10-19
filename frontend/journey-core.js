/* The path the site suggests, and the address of each page. Pure functions, no storage, no network.
   Path: How am I feeling? (Self-check) -> What do I need? (Library) -> One manageable step, then a gentle look back (Tools).
   The path is a suggestion shown on those three pages. Nothing is locked: every page stays reachable from the menu. */
(root=>{
'use strict';
const PAGES=['home','stories','tools','library','chat','contact','quiz'];
const PATH=['quiz','library','tools'];
function known(page){return PAGES.includes(page);}
function hashFor(page){return known(page)?'#/'+page:'';}
function routeFromHash(hash){const m=/^#\/([a-z]+)$/.exec(String(hash||''));return m&&known(m[1])?m[1]:null;}
function position(page){return PATH.indexOf(page);}
function neighbours(page){const i=position(page);return i<0?null:{index:i,total:PATH.length,prev:i>0?PATH[i-1]:null,next:i<PATH.length-1?PATH[i+1]:null};}
const api={PAGES,PATH,known,hashFor,routeFromHash,position,neighbours};root.MBJourney=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
