/* Matching for the Library search. Pure functions, no storage, no network.
   - Case and accents are ignored on both sides: "kampus" finds "kampüs", "cafe" finds "café", "STRESS" finds "stress".
   - Turkish dotted and dotless i are treated as one letter, and ß as "ss".
   - Every word typed must appear somewhere in the guide (in any order), not as one exact phrase.
   - The result says which parts of the guide matched, so the interface can explain why it is shown.
   Nothing is inferred about the person and nothing the person types is kept. */
(function(root){
'use strict';
const SPECIAL={'ı':'i','İ':'i','ß':'ss','æ':'ae','œ':'oe','ø':'o','ł':'l','đ':'d','ð':'d','þ':'th'};
function fold(text,lang){
 let s=String(text==null?'':text);
 try{s=s.toLocaleLowerCase(lang||'en');}catch(e){s=s.toLowerCase();}
 s=s.normalize('NFD').replace(/[̀-ͯ]/g,'');
 return s.replace(/[ıİßæœøłđðþ]/g,c=>SPECIAL[c]||c);
}
function tokens(query,lang){
 // Anything that is not a letter or a digit separates words, so every punctuation mark behaves the same way.
 const parts=fold(query,lang).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
 return [...new Set(parts)].slice(0,8);          // eight words is plenty; more only slows things down
}
const FIELDS=['title','summary','steps','question'];
/* fields: {title, summary, steps, question}. Returns {matches, where}.
   where lists, in a fixed order, the fields that contain at least one of the words. */
function match(fields,query,lang){
 const words=tokens(query,lang);
 if(!words.length)return {matches:true,where:[]};
 const folded={};for(const f of FIELDS)folded[f]=fold(fields[f],lang);
 const all=FIELDS.map(f=>folded[f]).join(' ');
 if(!words.every(w=>all.includes(w)))return {matches:false,where:[]};
 return {matches:true,where:FIELDS.filter(f=>words.some(w=>folded[f].includes(w)))};
}
const api={fold,tokens,match,FIELDS};root.MBFieldSearch=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
