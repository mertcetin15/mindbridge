/* Delegated click actions, replacing inline `onclick="..."` attributes.
   Inline handlers are the only reason the Content-Security-Policy had to allow inline scripts.
   Markup now carries `data-mb-click="name(arg, ...)"`. This file parses that text itself: it never
   uses eval, new Function or string timers, so the policy can stay strict.
   Accepted form:  globalFunction('text', 12, true, this, event)  optionally followed by  ;return false
   and the single special action  event.stopPropagation().  Anything else is refused and logged.
   Order matches inline handlers: from the clicked element up through its ancestors, stopping when an
   action stops propagation. Capture-phase interceptors elsewhere still run first, as before. */
(() => {
'use strict';
const ACTION=/^\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\(([^()]*)\)\s*(;\s*return\s+false)?\s*;?\s*$/;
const cache=new Map();
// Allow-list: markup can only trigger these. Injected markup naming anything else (eval, location.assign,
// document.write, ...) is refused even before the CSP gets a say. Add a name here when adding a new action.
const ALLOWED=new Set(['addAntiTodo','addControlItem','adjustTimer','event.stopPropagation','filterS','generateBreak','handleNavClick','nextGroundingStep','nextQ','saveGratitude','saveJournal','scrollToTop','selectMood','sendChatMessage','setLang','toggleBreathing','toggleDarkRoom','toggleLangMenu','toggleMobileNav','toggleS','toggleSOS','toggleSound','toggleTimer']);

function splitArguments(text){
 if(!text.trim())return [];
 const parts=[];let current='',quote=null;
 for(const ch of text){
  if(quote){current+=ch;if(ch===quote)quote=null;}
  else if(ch==="'"||ch==='"'){quote=ch;current+=ch;}
  else if(ch===','){parts.push(current.trim());current='';}
  else current+=ch;
 }
 parts.push(current.trim());return parts;
}
function literal(token,element,event){
 if(token==='this')return element;
 if(token==='event')return event;
 if(token==='true')return true;
 if(token==='false')return false;
 if(token==='null')return null;
 if(/^-?\d+(\.\d+)?$/.test(token))return Number(token);
 const text=/^'([^'\\]*)'$|^"([^"\\]*)"$/.exec(token);
 if(text)return text[1]!==undefined?text[1]:text[2];
 throw new Error('Unsupported argument: '+token);
}
function compile(source){
 if(cache.has(source))return cache.get(source);
 const match=ACTION.exec(source);
 if(!match)throw new Error('Unsupported action: '+source);
 if(!ALLOWED.has(match[1]))throw new Error('Action not allowed: '+match[1]);
 const compiled={name:match[1],tokens:splitArguments(match[2]),suppressDefault:Boolean(match[3])};
 cache.set(source,compiled);return compiled;
}
function resolve(name){
 // Only plain properties of window: no prototype walk, no computed access.
 return name.split('.').reduce((owner,key)=>owner!=null&&Object.prototype.hasOwnProperty.call(owner,key)?owner[key]:undefined,window);
}
/* Returns true when the action stopped propagation. Exported for tests. */
function runAction(element,event,source){
 let compiled;
 try{compiled=compile(source);}catch(error){console.error(error.message);return false;}
 if(compiled.name==='event.stopPropagation'){event.stopPropagation();return true;}
 const fn=resolve(compiled.name);
 if(typeof fn!=='function'){console.error('Unknown action: '+compiled.name);return false;}
 let args;
 try{args=compiled.tokens.map(token=>literal(token,element,event));}catch(error){console.error(error.message);return false;}
 const result=fn.apply(window,args);
 if(compiled.suppressDefault||result===false)event.preventDefault();
 return false;
}
document.addEventListener('click',event=>{
 for(let node=event.target instanceof Element?event.target:null;node;node=node.parentElement){
  const source=node.getAttribute&&node.getAttribute('data-mb-click');
  if(source&&runAction(node,event,source))break;
  if(event.cancelBubble)break;
 }
});
window.mbRunAction=runAction;
})();
