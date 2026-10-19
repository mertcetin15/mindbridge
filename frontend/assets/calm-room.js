/* Opens the Dark Room from the Pause tool.
   The only button that opened it lived in a card that the tools page removes, so the room could not be
   reached at all. This puts one clearly labelled, optional button back next to breathing. The room itself
   is unchanged apart from legibility: a dark screen, one line of text, no sound, no motion, and a visible
   way out (button, or Escape). Nothing here opens it on its own. */
(() => {
'use strict';
const COPY={
 en:{button:'Quiet dark screen',hint:'A dark screen with one line of text. Nothing plays or moves. Leave with the button or the Escape key.'},
 tr:{button:'Sessiz karanlık ekran',hint:'Tek satır yazılı karanlık bir ekran. Hiçbir şey çalmaz ya da hareket etmez. Düğmeyle veya Escape tuşuyla çıkarsın.'},
 de:{button:'Ruhiger dunkler Bildschirm',hint:'Ein dunkler Bildschirm mit einer Textzeile. Nichts spielt oder bewegt sich. Verlasse ihn mit der Schaltfläche oder der Esc-Taste.'},
 es:{button:'Pantalla oscura tranquila',hint:'Una pantalla oscura con una línea de texto. Nada suena ni se mueve. Sal con el botón o con la tecla Escape.'}
};
const C=()=>COPY[curLang]||COPY.en;
const pane=document.getElementById('mb-pane-pause')||document.getElementById('mb-breath-tool')?.parentElement;
if(!pane||!document.getElementById('dark-room-overlay'))return;
function node(tag,id,cls){const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;}
const wrap=node('div','mb-calm-room','mb-calm-room'),button=node('button','mb-calm-room-open','btn-outline'),hint=node('p','mb-calm-room-hint','mb-calm-room-hint');
button.type='button';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-describedby','mb-calm-room-hint');
button.addEventListener('click',()=>window.toggleDarkRoom(true));
wrap.append(button,hint);pane.append(wrap);
function paint(){button.textContent=C().button;hint.textContent=C().hint;}
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();paint();};
paint();
})();
