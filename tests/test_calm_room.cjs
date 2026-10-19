const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('MindBridge.html','utf8');
const source=html.match(/<script id="mindbridge-calm-room">([\s\S]*?)<\/script>/)[1];
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
function harness({pane=true,overlay=true}={}){
 const ids=new Map(),calls=[];
 class E{constructor(t){this.tag=t;this.children=[];this.attrs={};this.l={};this._t='';}
  get textContent(){return this._t+this.children.map(c=>c.textContent).join('');}set textContent(v){this._t=String(v);}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}append(...n){this.children.push(...n);}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this.l[k]=f;}}
 if(pane){const p=new E('section');p.id='mb-pane-pause';}if(overlay){const o=new E('div');o.id='dark-room-overlay';}
 const ctx={console,curLang:'en',document:{getElementById:id=>ids.get(id),createElement:t=>new E(t)},toggleDarkRoom:v=>calls.push(v),applyI18n(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,calls,$:id=>ids.get(id)};
}
test('a labelled button is added to the Pause tool and nothing opens by itself',()=>{
 const h=harness();const b=h.$('mb-calm-room-open');assert.equal(b.textContent,'Quiet dark screen');assert.equal(b.attrs['aria-haspopup'],'dialog');assert.equal(b.attrs['aria-describedby'],'mb-calm-room-hint');
 assert(/Nothing plays or moves/.test(h.$('mb-calm-room-hint').textContent)&&/Escape/.test(h.$('mb-calm-room-hint').textContent));assert.equal(h.calls.length,0,'not opened on load');assert.equal(h.$('mb-pane-pause').children[0],h.$('mb-calm-room'));
});
test('pressing it opens the room, and only then',()=>{const h=harness();h.$('mb-calm-room-open').l.click();assert.deepEqual(h.calls,[true]);});
test('without the Pause pane or the room, the script does nothing and does not throw',()=>{assert.doesNotThrow(()=>harness({pane:false}));assert.doesNotThrow(()=>harness({overlay:false}));assert.equal(harness({overlay:false}).$('mb-calm-room'),undefined);});
test('four languages',()=>{
 const h=harness();for(const [lang,word] of [['tr','Sessiz karanlık ekran'],['de','Ruhiger dunkler Bildschirm'],['es','Pantalla oscura tranquila'],['en','Quiet dark screen']]){h.ctx.curLang=lang;h.ctx.applyI18n();assert.equal(h.$('mb-calm-room-open').textContent,word);}
});
test('the page actually contains a way to reach the Dark Room',()=>{
 const reachable=/toggleDarkRoom\(true\)/.test(fs.readFileSync('frontend/calm-room.js','utf8'))&&/\{\{SCRIPT:calm-room\.js:/.test(fs.readFileSync('frontend/page.html','utf8'));assert(reachable);
});
console.log(checks+' calm-room checks passed.');
