const fs=require('fs'),vm=require('vm'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const source=fs.readFileSync('frontend/icons.js','utf8');
function make(){
 class E{constructor(t){this.tag=t;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=v;}append(...n){this.children.push(...n);}replaceChildren(...n){this.children=n;}}
 const ctx={console,Object,document:{createElementNS:(ns,t)=>{const e=new E(t);e.ns=ns;return e;}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
test('every icon is a decorative SVG on one 24-unit grid with at least one path',()=>{
 const w=make();assert.deepEqual(w.MBIcons.names.sort(),['camera','heart','moon','sun']);
 for(const name of w.MBIcons.names){const s=w.MBIcons.icon(name);assert.equal(s.tag,'svg');assert.equal(s.ns,'http://www.w3.org/2000/svg');assert.equal(s.attrs.viewBox,'0 0 24 24');assert.equal(s.attrs['aria-hidden'],'true');assert.equal(s.attrs.focusable,'false');assert.equal(s.attrs.class,'mb-icon');assert(s.children.length>=1&&s.children.every(p=>p.tag==='path'&&/^M/.test(p.attrs.d)),name);}
});
test('the theme button shows where it leads: sun while dark, moon while light, and never accumulates icons',()=>{
 const w=make(),button={children:[],replaceChildren(...n){this.children=n;}};
 w.mbThemeIcon(button,true);const dark=JSON.stringify(button.children[0].children.map(p=>p.attrs.d));w.mbThemeIcon(button,false);const light=JSON.stringify(button.children[0].children.map(p=>p.attrs.d));
 assert.notEqual(dark,light);assert.equal(button.children.length,1);assert.equal(JSON.parse(dark).length,9,'sun: disc and eight rays');assert.equal(JSON.parse(light).length,1,'moon: one crescent');
 w.mbThemeIcon(button,true);w.mbThemeIcon(button,true);assert.equal(button.children.length,1);
});
test('icons are built with the DOM, never from HTML strings',()=>{const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');assert(!/innerHTML|insertAdjacentHTML|outerHTML/.test(code));assert(/createElementNS/.test(code));});
test('one stroke width, round geometry and colour from the text, defined once',()=>{
 const css=fs.readFileSync('frontend/paper.css','utf8');const rule=css.match(/\.mb-icon\{([^}]*)\}/)[1];
 assert(/stroke-width:1\.75/.test(rule)&&/stroke-linecap:round/.test(rule)&&/stroke-linejoin:round/.test(rule)&&/stroke:currentColor/.test(rule)&&/fill:none/.test(rule));
 assert.equal((css.match(/^\.mb-icon\{/gm)||[]).length,1,'the family is defined once; per-context rules may only set size');
});
test('controls and cards no longer use decorative emoji; the mood scale keeps its emoji because they are stored values',()=>{
 const page=fs.readFileSync('frontend/page.html','utf8'),modern=fs.readFileSync('frontend/modern-ui.js','utf8'),paper=fs.readFileSync('frontend/paper.css','utf8');
 const pict=/\p{Extended_Pictographic}/gu;
 const outsideMood=[...page.matchAll(pict)].map(m=>m[0]).filter(c=>!['😫','😞','😐','🙂','🤩'].includes(c));assert.deepEqual([...new Set(outsideMood)].filter(c=>c!=='↗'),[],'page.html: '+outsideMood.join(''));
 assert.deepEqual([...modern.matchAll(pict)].map(m=>m[0]).filter(c=>c!=='↗'),[],'modern-ui.js');assert.equal([...paper.matchAll(pict)].length,0,'paper.css');
 assert(/id="theme-toggle"[^>]*>\s*<svg class="mb-icon"/.test(page),'theme button starts with an icon, not text');assert((page.match(/<svg class="mb-icon"/g)||[]).length>=3);
});
test('the mood scale is untouched in the page and in the backend validation',()=>{
 const page=fs.readFileSync('frontend/page.html','utf8');for(const m of ['😫','😞','😐','🙂','🤩'])assert(page.includes(m),m);
 const py=fs.readFileSync('backend/accounts.py','utf8');for(const m of ['😫','😞','😐','🙂','🤩'])assert(py.includes(m),'backend '+m);
});
console.log(checks+' icon checks passed.');
