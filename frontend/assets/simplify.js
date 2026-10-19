/* "Simplify this screen": a reversible, user-chosen view preference.
   It hides decoration and motion only. Every page and tool stays available, nothing is inferred
   about the person, and nothing is sent anywhere. The preference lives in this browser if storage
   is available; otherwise it simply lasts until the page closes. */
(() => {
'use strict';
const KEY='mindbridge.simplify';
const COPY={
 en:{label:'Simplify',on:'Simplified view on',off:'Simplified view off',hint:'Hides decoration and animation. All tools and pages stay available. Your choice; switch it off any time.'},
 tr:{label:'Sadeleştir',on:'Sade görünüm açık',off:'Sade görünüm kapalı',hint:'Süsleri ve animasyonları gizler. Tüm araçlar ve sayfalar yerinde kalır. Seçim senin; istediğin zaman kapat.'},
 de:{label:'Vereinfachen',on:'Einfache Ansicht an',off:'Einfache Ansicht aus',hint:'Blendet Dekoration und Animation aus. Alle Werkzeuge und Seiten bleiben verfügbar. Deine Wahl; jederzeit abschaltbar.'},
 es:{label:'Simplificar',on:'Vista simple activada',off:'Vista simple desactivada',hint:'Oculta decoración y animaciones. Todas las herramientas y páginas siguen disponibles. Tú eliges; desactívala cuando quieras.'}
};
const C=()=>COPY[curLang]||COPY.en;
const root=document.documentElement;
const holder=document.querySelector('.nav-right');
if(!holder)return;
function read(){try{return localStorage.getItem(KEY)==='on';}catch(e){return false;}}
function write(on){try{if(on)localStorage.setItem(KEY,'on');else localStorage.removeItem(KEY);}catch(e){}}
let on=read();
const button=document.createElement('button');button.type='button';button.id='mb-simplify';button.className='mb-simplify';
const hint=document.createElement('span');hint.id='mb-simplify-hint';hint.className='mb-sr-only';
const live=document.createElement('span');live.id='mb-simplify-live';live.className='mb-sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');
button.setAttribute('aria-describedby','mb-simplify-hint');
function paint(announce){
 if(on)root.setAttribute('data-simplify','on');else root.removeAttribute('data-simplify');
 button.textContent=C().label;button.setAttribute('aria-pressed',String(on));hint.textContent=C().hint;
 if(announce)live.textContent=on?C().on:C().off;
}
button.addEventListener('click',()=>{on=!on;write(on);paint(true);});
// For other features that suggest a simpler view for the moment: never writes the saved preference.
window.mbSimplify={get:()=>on,setForNow:value=>{on=Boolean(value);paint(true);}};
holder.prepend(live,hint,button);
const previousI18n=window.applyI18n;
window.applyI18n=function(){previousI18n();paint(false);};
paint(false);
})();
