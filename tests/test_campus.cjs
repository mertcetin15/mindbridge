const fs=require('fs'),vm=require('vm'),assert=require('assert'),M=require('../frontend/campus-motion.js');let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('scroll progress stays bounded before and after the scene',()=>{assert.equal(M.progress(2000,1000,800),0);assert.equal(M.progress(-2000,1000,800),1);assert(Number.isFinite(M.progress(0,0,0)));});
test('mobile pose uses a smaller rotation and no sideways tilt',()=>{assert.equal(M.pose(.5,true).tilt,0);assert(M.pose(1,true).spin<M.pose(1,false).spin);});
test('desktop journey now turns more than a full circle while mobile stays bounded',()=>{assert.equal(M.pose(1).spin-M.pose(0).spin,720);assert.equal(M.pose(1,true).spin-M.pose(0,true).spin,210);});
const nodes=new Map(),events={},frames=new Map();let seq=0,observer,reads=0,doc;
class E{
 constructor(tag='div',cls=''){this.tag=tag;this.className=cls;this.children=[];this.attrs={};this.style={};this.handlers={};this.textContent='';this.rect={top:0,height:900};this.classList={contains:k=>this.className.split(' ').includes(k),add:k=>{if(!this.classList.contains(k))this.className+=' '+k;},toggle:(k,v)=>{this.className=this.className.split(' ').filter(x=>x!==k).join(' ');if(v)this.classList.add(k);}};}
 set id(v){this._id=v;nodes.set(v,this);}get id(){return this._id;}setAttribute(k,v){this.attrs[k]=v;}append(...ns){for(const n of ns){if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this;this.children.push(n);}}after(n){if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n);}addEventListener(k,f){this.handlers[k]=f;}click(){if(!this.disabled)this.handlers.click?.();}focus(){doc.activeElement=this;}scrollIntoView(){this.scrolled=true;}getBoundingClientRect(){reads++;return this.rect;}
 matches(s){if(s.startsWith('[data-i18n='))return this.attrs['data-i18n']===s.match(/"([^"]+)"/)[1];const [tag,cls]=s.split('.');return (!tag||tag===this.tag)&&(!cls||this.classList.contains(cls));}
 querySelector(s){for(const c of this.children){if(c.matches(s))return c;const n=c.querySelector(s);if(n)return n;}return null;}
}
function node(tag,cls,id){const n=new E(tag,cls);if(id)n.id=id;return n;}
const home=node('div','page active','page-home'),hero=node('section','hero'),inner=node('div','hero-inner'),launch=node('div','mb-launch');home.append(hero,node('section','section'));hero.append(inner);inner.append(launch);
for(const key of ['hero.badge','hero.h1a','hero.btnQuiz','hero.btnTools']){const n=node('span');n.attrs['data-i18n']=key;inner.append(n);}inner.append(node('p','hero-sub'),node('span','','typewriter'));
const planner=node('section','','mb-planner');planner.append(node('h2'));node('textarea','','journal-input');
doc={documentElement:{lang:'en'},hidden:false,getElementById:id=>nodes.get(id),createElement:tag=>node(tag),addEventListener:(k,f)=>(events[k]??=[]).push(f)};
const media={matches:false,addEventListener(k,f){this.change=f;}};
const ctx={document:doc,MBCampusMotion:M,matchMedia:()=>media,innerWidth:1200,innerHeight:900,I18N:Object.fromEntries(['en','tr','de','es'].map(k=>[k,{hero:{}}])),requestAnimationFrame:f=>{frames.set(++seq,f);return seq;},cancelAnimationFrame:id=>frames.delete(id),addEventListener:(k,f)=>(events[k]??=[]).push(f),IntersectionObserver:class{constructor(fn){this.callback=fn;this.targets=[];observer=this;}observe(n){this.targets.push(n);}},showPage(id){ctx.page=id;home.classList.toggle('active',id==='home');},applyI18n(){}};ctx.window=ctx;
vm.runInNewContext(fs.readFileSync('frontend/campus.js','utf8'),ctx);
const emit=(type)=>events[type]?.forEach(f=>f()),flush=()=>{const jobs=[...frames.values()];frames.clear();jobs.forEach(f=>f());};flush();
observer.callback(observer.targets.map(target=>({target,isIntersecting:true})));flush();
test('initial scene mounts with repeated quick starts and old content hidden',()=>{assert.strictEqual(launch.parent,home);assert(launch.hidden);assert(home.querySelector('section.section').hidden);assert(nodes.get('mb-campus-journey'));});
reads=0;for(let i=0;i<100;i++)emit('scroll');
test('100 scroll events schedule only one motion frame for both scenes',()=>assert.equal(frames.size,1));flush();
test('visible scene geometry is read once each and the loop stops at rest',()=>{assert.equal(reads,2);assert.equal(frames.size,0);assert(home.querySelector('.mb-sculpture').style.transform.includes('rotateZ'));});
emit('scroll');ctx.showPage('tools');
test('leaving home cancels pending motion and tools do not animate',()=>{assert.equal(frames.size,0);emit('scroll');assert.equal(frames.size,0);});
ctx.showPage('home');flush();nodes.get('mb-campus-motion').click();
test('pause resets the sculpture and blocks new scroll frames',()=>{assert(home.classList.contains('mb-motion-off'));assert.equal(home.querySelector('.mb-sculpture').style.transform,'none');emit('scroll');assert.equal(frames.size,0);});
nodes.get('mb-campus-motion').click();flush();doc.hidden=true;emit('visibilitychange');emit('scroll');
test('hidden tabs do not schedule motion',()=>assert.equal(frames.size,0));doc.hidden=false;emit('visibilitychange');flush();
media.matches=true;media.change();
test('system reduced motion overrides the toggle and keeps content static',()=>{assert(nodes.get('mb-campus-motion').disabled);assert.equal(frames.size,0);assert(home.classList.contains('mb-motion-off'));});
doc.documentElement.lang='tr';ctx.applyI18n();
test('campus copy and motion state translate without losing settings',()=>{assert.equal(ctx.I18N.tr.hero.h1a,'Dersler arasında,');assert.equal(nodes.get('mb-campus-motion').textContent,'Hareket azaltma tercihin açık');});
const stories=home.querySelector('.mb-journey-stories');stories.children[1].querySelector('button').click();
test('journal story opens and focuses the real journal without adding text',()=>{assert.equal(ctx.page,'tools');assert.strictEqual(doc.activeElement,nodes.get('journal-input'));assert.equal(nodes.get('journal-input').textContent,'');});
media.matches=false;media.change();ctx.showPage('home');flush();observer.callback(observer.targets.map(target=>({target,isIntersecting:false})));emit('scroll');
test('offscreen sculptures do not schedule background frames',()=>assert.equal(frames.size,0));
console.log(`${checks} campus motion and navigation checks passed (simulated DOM, no FPS claim).`);
