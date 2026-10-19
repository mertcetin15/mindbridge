/* Event-driven drawing: normalized coordinates, bounded history, no idle animation. */
(()=>{'use strict';
const canvas=document.getElementById('zen-canvas');if(!canvas)return;
const ctx=canvas.getContext('2d');if(!ctx)return;
const card=canvas.closest('.tool-card');card.id='mb-zen-studio';
const copy={
 en:['Zen studio','Hold to pour. Grains fall, settle and build coloured layers.','Ink','Line width','Mode','Freehand','Mirror','Undo','Redo','Clear','Download PNG','Draw with a pointer. Keyboard: Space starts or stops a line; arrow keys move. Escape stops. Your drawing stays only in this open tab.','Blue','Clay','Forest','Violet','Canvas cleared. Undo restores it.','Your canvas is ready to download.','Drawing unavailable in this browser.','Drawing limit reached. Start a new stroke or clear the canvas.'],
 tr:['Zen atölyesi','Basılı tut, kum dökülsün. Taneler düşer, birikir ve renkli katmanlar oluşturur.','Mürekkep','Çizgi kalınlığı','Mod','Serbest','Ayna','Geri al','İleri al','Temizle','PNG indir','Parmağınla veya fareyle çiz. Klavye: Boşluk çizgiyi başlatır / durdurur; oklar hareket ettirir. Escape durdurur. Çizimin yalnızca bu açık sekmede kalır.','Mavi','Kil','Orman','Mor','Tuval temizlendi. Geri al ile geri getirebilirsin.','Tuvalin indirilmeye hazır.','Bu tarayıcıda çizim kullanılamıyor.','Çizim sınırına ulaştın. Yeni bir çizgiye başla veya tuvali temizle.'],
 de:['Zen-Atelier','Zeichne oder streue farbigen Sand. Halte gedrückt, um Sand anzuhäufen.','Tinte','Linienstärke','Modus','Freihand','Spiegel','Zurück','Wiederholen','Leeren','PNG laden','Mit Maus oder Finger zeichnen. Tastatur: Leertaste startet / stoppt, Pfeile bewegen, Escape stoppt. Die Zeichnung bleibt nur im offenen Tab.','Blau','Ton','Wald','Violett','Leere Leinwand. Zurück stellt sie wieder her.','Die Zeichnung ist bereit zum Download.','Zeichnen ist in diesem Browser nicht verfügbar.','Zeichenlimit erreicht. Beginne eine neue Linie oder leere die Leinwand.'],
 es:['Taller zen','Dibuja o vierte arena de colores. Mantén pulsado para acumularla.','Tinta','Grosor','Modo','Libre','Espejo','Deshacer','Rehacer','Borrar','Descargar PNG','Dibuja con el ratón o el dedo. Teclado: espacio inicia / para, flechas mueven, Escape para. El dibujo solo permanece en esta pestaña abierta.','Azul','Arcilla','Bosque','Violeta','Lienzo vacío. Deshacer lo restaura.','Tu dibujo está listo para descargar.','Este navegador no permite dibujar.','Límite alcanzado. Empieza otra línea o borra el lienzo.']};
const sand=new window.MBFallingSand();let lastPhysics=0;
const C=()=>copy[document.documentElement.lang]||copy.en;
const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n;};
const title=card.querySelector('h3'),sub=card.querySelector('.sub');title.removeAttribute('data-i18n');sub.removeAttribute('data-i18n');
const bar=el('div','mb-zen-bar'),palette=el('div','mb-zen-palette');palette.setAttribute('role','group');
const colors=['#2d4c9b','#ad4b32','#286954','#79509b'];let brush='ink',grainClock=0,color=colors[0],width=4,mirror=false,strokes=[],history=[],future=[],current=null,pointer=null,kb=false,cursor={x:.5,y:.5},raf=0,dirty=true;
const swatches=colors.map((c,i)=>{const b=el('button','mb-swatch');b.type='button';b.style.setProperty('--swatch',c);b.addEventListener('click',()=>{finish();color=c;translate();});palette.append(b);return b;});
const sizeLabel=el('label'),size=el('input');size.type='range';size.min='1';size.max='14';size.value='4';size.id='mb-zen-size';sizeLabel.htmlFor=size.id;size.addEventListener('input',()=>{finish();width=Number(size.value);});
const modeLabel=el('label'),mode=el('select');mode.id='mb-zen-mode';modeLabel.htmlFor=mode.id;for(const v of ['free','mirror']){const o=el('option');o.value=v;mode.append(o);}mode.addEventListener('change',()=>{finish();mirror=mode.value==='mirror';});
const brushLabel=el('label'),brushSelect=el('select');brushSelect.id='mb-zen-brush';brushLabel.htmlFor=brushSelect.id;for(const value of ['ink','sand']){const option=el('option');option.value=value;brushSelect.append(option);}brushSelect.addEventListener('change',()=>{finish();brush=brushSelect.value;translate();});
bar.append(brushLabel,brushSelect,palette,sizeLabel,size,modeLabel,mode);canvas.before(bar);
const actions=el('div','mb-zen-actions'),status=el('p','mb-zen-status'),hint=el('p','mb-zen-hint');status.setAttribute('role','status');hint.id='mb-zen-hint';canvas.setAttribute('aria-describedby',hint.id);canvas.tabIndex=0;
const buttons=[7,8,9,10].map((key,i)=>{const b=el('button','btn-sm');b.type='button';b.addEventListener('click',()=>act(i));actions.append(b);return b;});canvas.after(actions);actions.after(hint);hint.after(status);
function state(){return {strokes:strokes.slice(),sand:sand.snapshot()};}
function restore(s){strokes=s.strokes;sand.restore(s.sand);}
function snapshot(){sand.settle();history.push(state());if(history.length>20)history.shift();future=[];}
function sync(){buttons[0].disabled=!history.length;buttons[1].disabled=!future.length;buttons[2].disabled=buttons[3].disabled=!strokes.length&&!sand.cells.some(Boolean);}
function drawLine(c,s,W,H){if(s.brush==='sand')return;c.strokeStyle=s.color;c.fillStyle=s.color;c.lineWidth=s.width*W/800;c.lineCap='round';c.lineJoin='round';for(let side=0;side<(s.mirror?2:1);side++){c.beginPath();s.points.forEach((p,i)=>{const x=(side?1-p.x:p.x)*W,y=p.y*H;i?c.lineTo(x,y):c.moveTo(x,y);});if(s.points.length===1){const p=s.points[0];c.arc((side?1-p.x:p.x)*W,p.y*H,s.width*W/1600,0,Math.PI*2);c.fill();}else c.stroke();}}
const still=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;   // read live, so a system change applies at once
function paint(now=0){raf=0;
 const visible=!document.hidden&&(!document.getElementById('page-tools')||document.getElementById('page-tools').classList.contains('active'));
 const pouring=current?.brush==='sand'&&(pointer!==null||kb)&&visible;
 if(visible&&(sand.active||pouring)){
  const steps=Math.min(6,Math.max(1,Math.floor((now-lastPhysics)/16)));lastPhysics=now;
  for(let i=0;i<steps;i++){if(pouring)sand.pour(cursor.x,cursor.y,colors.indexOf(color)+1,Math.ceil(width/2),Math.ceil(width/2)+3,mirror);sand.step();}
  if(still())sand.settle();   // reduced motion: the pile grows, nothing visibly falls
  dirty=true;
 }
 if(dirty){dirty=false;const r=canvas.getBoundingClientRect();if(r.width<1)return;const d=Math.min(window.devicePixelRatio||1,2),W=r.width,H=r.height;if(canvas.width!==Math.round(W*d)||canvas.height!==Math.round(H*d)){canvas.width=Math.round(W*d);canvas.height=Math.round(H*d);}ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle='#fbf8ef';ctx.fillRect(0,0,W,H);for(const s of strokes)drawLine(ctx,s,W,H);sand.draw(ctx,W,H,colors);if(document.activeElement===canvas){ctx.strokeStyle='#2d4c9b';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cursor.x*W,cursor.y*H,7,0,Math.PI*2);ctx.stroke();}sync();}
 if(visible&&(sand.active||pouring)&&!raf)raf=requestAnimationFrame(paint);
}
function request(){dirty=true;if(!raf)raf=requestAnimationFrame(paint);}
function finish(){current=null;kb=false;if(pointer!==null){if(canvas.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);pointer=null;}request();}
function begin(p){if(strokes.length>=80){status.textContent=C()[19];return;}snapshot();current={color,width,mirror,brush,seed:Math.floor(Math.random()*4294967296),points:[p]};strokes.push(current);if(brush==='sand')sand.pour(p.x,p.y,colors.indexOf(color)+1,Math.ceil(width/2),Math.ceil(width/2)+3,mirror);request();}
function point(e){const r=canvas.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};}
function add(p){if(!current)return;if(current.brush==='sand'){request();return;}if(current.points.length>=(current.brush==='sand'?360:1200)||strokes.reduce((n,s)=>n+s.points.length,0)>=6000){finish();status.textContent=C()[19];return;}current.points.push(p);request();}
canvas.addEventListener('pointerdown',e=>{if(e.button!==0||pointer!==null)return;e.preventDefault();finish();pointer=e.pointerId;canvas.setPointerCapture(pointer);canvas.focus({preventScroll:true});cursor=point(e);begin(cursor);});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==pointer||!current)return;cursor=point(e);add(cursor);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{if(current||pointer!==null)finish();});
canvas.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();if(kb)finish();else{begin({...cursor});kb=!!current;}}else if(e.key==='Escape')finish();else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const step=e.shiftKey ? .04 : .01;cursor={x:Math.max(0,Math.min(1,cursor.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0))),y:Math.max(0,Math.min(1,cursor.y+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)))};if(kb)add({...cursor});request();}});
canvas.addEventListener('blur',finish);canvas.addEventListener('focus',request);
function act(i){finish();status.textContent='';if(i===0&&history.length){future.push(state());restore(history.pop());}if(i===1&&future.length){history.push(state());restore(future.pop());}if(i===2&&strokes.length){snapshot();strokes=[];sand.clear();status.textContent=C()[16];}if(i===3&&strokes.length){const out=el('canvas');out.width=1600;out.height=900;const c=out.getContext('2d');c.fillStyle='#fbf8ef';c.fillRect(0,0,1600,900);for(const s of strokes)drawLine(c,s,1600,900);sand.draw(c,1600,900,colors);out.toBlob(blob=>{if(!blob){status.textContent=C()[18];return;}const url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download='mindbridge-zen.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=C()[17];},'image/png');}request();}
function translate(){const labels={en:['Brush','Ink','Pour sand'],tr:['Fırça','Mürekkep','Kum dök'],de:['Pinsel','Tinte','Sand streuen'],es:['Pincel','Tinta','Verter arena']}[document.documentElement.lang]||['Brush','Ink','Pour sand'];brushLabel.textContent=labels[0];Array.from(brushSelect.options).forEach((o,i)=>o.textContent=labels[i+1]);title.textContent=C()[0];sub.textContent=C()[1];palette.setAttribute('aria-label',C()[2]);swatches.forEach((b,i)=>{b.setAttribute('aria-label',C()[12+i]);b.setAttribute('aria-pressed',String(colors[i]===color));});sizeLabel.textContent=brush==='sand'?({en:'Flow',tr:'Akış',de:'Fluss',es:'Flujo'}[document.documentElement.lang]||'Flow'):C()[3];modeLabel.textContent=C()[4];Array.from(mode.options).forEach((o,i)=>o.textContent=C()[5+i]);buttons.forEach((b,i)=>b.textContent=C()[7+i]);hint.textContent=C()[11];canvas.setAttribute('aria-label',C()[0]);status.textContent='';sync();}
window.mbZenResize=request;const old=window.showPage;window.showPage=function(id){finish();const r=old(id);if(id==='tools')request();return r;};
const prev=window.applyI18n;window.applyI18n=function(){prev();translate();};
if('ResizeObserver'in window)new ResizeObserver(request).observe(canvas);else window.addEventListener('resize',request,{passive:true});
document.addEventListener('visibilitychange',finish);
function clearPrivate(){finish();strokes=[];sand.clear();history=[];future=[];status.textContent='';request();}
window.addEventListener('pagehide',clearPrivate);window.addEventListener('mb:account-changed',clearPrivate);translate();request();
})();
