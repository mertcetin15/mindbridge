/* Component gallery helpers (development only).
   mbVisualSnapshot()        -> the computed look of every [data-sample] plus the colour tokens, for the current
                                theme and viewport width.
   mbVisualCompare(baseline) -> a list of differences against a saved snapshot for the same theme and width.
   It reads computed styles; it does not draw pixels, so it catches changes to colour, border, radius, type, size,
   spacing and cursor, and it does not catch layout flow, painting, fonts that fail to load, or motion. */
(() => {
'use strict';
const PROPS=['color','backgroundColor','borderTopColor','borderTopStyle','borderTopWidth','borderLeftColor','borderLeftStyle','borderLeftWidth','borderRadius','fontFamily','fontSize','fontWeight','lineHeight','paddingTop','paddingLeft','minHeight','height','boxShadow','cursor','opacity'];
const TOKENS=['--g','--g2','--bg','--bg2','--bg3','--ink','--ink2','--ink3','--border','--border2','--clay','--forest','--info','--success','--caution','--danger','--r','--r2'];
const root=document.documentElement;
function theme(){return root.getAttribute('data-theme')==='dark'?'dark':'light';}
// Named width buckets, not pixels: a scrollbar or a different window must not change which baseline applies.
function bucket(){const w=root.clientWidth;return w<=480?'phone':w<=1000?'tablet':'desktop';}
function key(){return theme()+'@'+bucket();}
function tidy(prop,value){
 if(prop==='fontFamily')return value.split(',')[0].replace(/["']/g,'').trim();
 if(prop==='height')return String(Math.round(parseFloat(value)||0));
 return value;
}
function snapshot(){
 const samples={};
 for(const el of document.querySelectorAll('[data-sample]')){
  const cs=getComputedStyle(el),look={};
  for(const p of PROPS)look[p]=tidy(p,cs[p]);
  samples[el.getAttribute('data-sample')]=look;
 }
 const cs=getComputedStyle(root),tokens={};
 for(const t of TOKENS)tokens[t]=cs.getPropertyValue(t).trim();
 return {key:key(),theme:theme(),width:Math.round(root.clientWidth),samples,tokens};
}
// A short, stable fingerprint of one sample's look (FNV-1a over the properties in a fixed order).
function hashText(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h.toString(16).padStart(8,'0');}
function hash(look){return hashText(PROPS.map(p=>look[p]).join('|'));}
function fingerprint(){const s=snapshot(),samples={};for(const id of Object.keys(s.samples))samples[id]=hash(s.samples[id]);return {key:s.key,theme:s.theme,width:s.width,samples,tokens:hashText(TOKENS.map(t=>s.tokens[t]).join('|'))};}
/* Baseline file: {version, full:{key:snapshot}, hashes:{key:fingerprint}}. Keys with a full snapshot give
   property-level differences; keys with only a fingerprint name the samples that changed. */
function compare(baseline){
 const now=snapshot(),full=baseline&&baseline.full&&baseline.full[now.key];
 if(full)return compareFull({[now.key]:full});
 const prints=baseline&&baseline.hashes&&baseline.hashes[now.key];
 if(!prints)return [{id:'*',prop:'baseline',expected:'a record for '+now.key,actual:'none saved'}];
 const fp=fingerprint(),diffs=[];
 if(prints.tokens!==fp.tokens)diffs.push({id:'token',prop:'tokens',expected:prints.tokens,actual:fp.tokens});
 for(const id of Object.keys(prints.samples))if(!(id in fp.samples))diffs.push({id,prop:'sample',expected:'present',actual:'missing'});
 for(const id of Object.keys(fp.samples)){if(!(id in prints.samples))diffs.push({id,prop:'sample',expected:'absent',actual:'new'});else if(prints.samples[id]!==fp.samples[id])diffs.push({id,prop:'look',expected:prints.samples[id],actual:fp.samples[id]});}
 return diffs;
}
function compareFull(baseline){
 const now=snapshot(),expected=baseline&&baseline[now.key],diffs=[];
 if(!expected)return [{id:'*',prop:'baseline',expected:'a snapshot for '+now.key,actual:'none saved'}];
 for(const id of Object.keys(expected.samples))if(!now.samples[id])diffs.push({id,prop:'sample',expected:'present',actual:'missing'});
 for(const id of Object.keys(now.samples))if(!expected.samples[id])diffs.push({id,prop:'sample',expected:'absent',actual:'new'});
 for(const id of Object.keys(expected.samples)){if(!now.samples[id])continue;for(const p of PROPS)if(expected.samples[id][p]!==now.samples[id][p])diffs.push({id,prop:p,expected:expected.samples[id][p],actual:now.samples[id][p]});}
 for(const t of TOKENS)if(expected.tokens[t]!==now.tokens[t])diffs.push({id:'token',prop:t,expected:expected.tokens[t],actual:now.tokens[t]});
 return diffs;
}
function setTheme(name){if(name==='dark')root.setAttribute('data-theme','dark');else root.removeAttribute('data-theme');renderTokens();document.getElementById('g-status').textContent='Theme: '+name;}
function renderTokens(){
 const box=document.getElementById('g-tokens');if(!box)return;box.replaceChildren();const cs=getComputedStyle(root);
 for(const t of TOKENS.filter(x=>!/^--r/.test(x))){const item=document.createElement('div'),chip=document.createElement('span'),label=document.createElement('span');item.className='g-swatch';chip.className='g-chip';chip.style.background='var('+t+')';label.textContent=t+'  '+cs.getPropertyValue(t).trim();item.append(chip,label);box.append(item);}
}
document.getElementById('g-light')?.addEventListener('click',()=>setTheme('light'));
document.getElementById('g-dark')?.addEventListener('click',()=>setTheme('dark'));
window.mbVisualSnapshot=snapshot;window.mbVisualFingerprint=fingerprint;window.mbVisualCompare=compare;window.mbVisualKeys={PROPS,TOKENS};
renderTokens();
})();
