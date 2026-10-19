/* One small icon family for interface chrome: 24-unit grid, 1.75 stroke, round caps and joins, currentColor.
   Replaces emoji in controls, which rendered differently on every platform and ignored the theme.
   Icons are decorative (aria-hidden); the control that holds one always has its own text label.
   Built with the DOM, not innerHTML. The mood scale keeps its emoji on purpose: those characters are stored values. */
(() => {
'use strict';
const NS='http://www.w3.org/2000/svg';
const PATHS={
 moon:['M20 14.2A8.2 8.2 0 0 1 9.8 4 8.2 8.2 0 1 0 20 14.2z'],
 sun:['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z','M12 2.5v2.2','M12 19.3v2.2','M2.5 12h2.2','M19.3 12h2.2','M5.3 5.3l1.6 1.6','M17.1 17.1l1.6 1.6','M5.3 18.7l1.6-1.6','M17.1 6.9l1.6-1.6'],
 heart:['M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.1 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'],
 camera:['M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z','M12 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z']
};
function icon(name){
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','mb-icon');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 for(const d of PATHS[name]||[]){const p=document.createElementNS(NS,'path');p.setAttribute('d',d);svg.append(p);}
 return svg;
}
// The theme button shows where it will take you: the sun while dark, the moon while light.
window.mbThemeIcon=(button,dark)=>{button.replaceChildren(icon(dark?'sun':'moon'));};
window.MBIcons={icon,names:Object.keys(PATHS)};
})();
