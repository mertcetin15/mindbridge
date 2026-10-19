const fs=require('fs'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const BOOST=':not(#mb-boost-a):not(#mb-boost-b)',raw=fs.readFileSync('frontend/paper.css','utf8'),css=raw.split(BOOST).join('');   // rules are matched without the specificity helper, which is tested on its own below
const lum=h=>{h=h.replace('#','');const [r,g,b]=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const lightBlock=css.match(/:root,:is\(#page-tools,#page-library,\.mb-workspace\)\{([\s\S]*?)\n\}/)[1];
const darkBlock=css.match(/:root\[data-theme=dark\],\[data-theme=dark\] :is\(#page-tools,#page-library,\.mb-workspace\)\{([\s\S]*?)\n\}/)[1];
const tok=(block,name)=>{const m=block.match(new RegExp('--'+name+':(#[0-9a-fA-F]{6})'));assert(m,'token --'+name+' missing');return m[1];};
test('success, caution and destructive have a value in both themes and reach 5:1 on paper, panel and wash',()=>{
 for(const [theme,block] of [['light',lightBlock],['dark',darkBlock]])for(const name of ['success','caution','danger'])for(const surface of ['bg','bg2','bg3']){
  const r=ratio(tok(block,name),tok(block,surface));assert(r>=5,theme+' --'+name+' on --'+surface+' = '+r.toFixed(2));
 }
 assert(/--info:var\(--g\)/.test(lightBlock),'information is the action colour');
});
test('the destructive colour is a token that holds in dark; the old fixed red (2.6:1 there) is overridden by it',()=>{
 assert(ratio('#b42318',tok(darkBlock,'bg'))<3,'the premise: the old red failed in dark');
 assert(/\.mb-danger[^{]*\{color:var\(--danger\)!important;border-color:var\(--danger\)!important\}/.test(css));
 const accounts=fs.readFileSync('frontend/accounts.css','utf8');assert(/\.mb-danger\{color:#b42318!important/.test(accounts),'the old rule still loads first and is overridden, not deleted');
 assert(css.indexOf('paper.css')<0&&fs.readFileSync('frontend/page.html','utf8').indexOf('accounts.css')<fs.readFileSync('frontend/page.html','utf8').indexOf('paper.css'),'paper.css loads after accounts.css');
});
test('disabled is more than opacity: dashed outline, muted ink, not-allowed, no fill, and skipped while pending',()=>{
 const rule=css.match(/:is\(:disabled,\[aria-disabled=true\]\):not\(\[aria-busy=true\] \*\):not\(\[aria-busy=true\]\)\{\s*([^}]*)\}/)[1];
 for(const part of ['border-style:dashed!important','color:var(--ink3)!important','cursor:not-allowed!important','box-shadow:none!important','background-image:none!important'])assert(rule.includes(part),part);
 assert(!/opacity/.test(rule),'the signal does not depend on opacity');
 const lightInk3=ratio(tok(lightBlock,'ink3'),tok(lightBlock,'bg2')),darkInk3=ratio(tok(darkBlock,'ink3'),tok(darkBlock,'bg2'));assert(lightInk3>=4.5&&darkInk3>=4.5,'muted ink stays readable: '+lightInk3.toFixed(2)+' / '+darkInk3.toFixed(2));
});
test('pending keeps the control recognisable: progress cursor and a dotted edge, not a faded look',()=>{
 const rule=css.match(/\[aria-busy=true\]\[aria-busy=true\]|html body \[aria-busy=true\] :is\([^{]*\{([^}]*)\}/);assert(/cursor:progress!important/.test(css)&&/border-style:dotted!important/.test(css));
 // Older :disabled rules fade controls to .45; a control that is only waiting must not look unavailable.
 assert(/\[aria-busy=true\]\[aria-busy=true\]|\[aria-busy=true\]\{cursor:progress!important;border-style:dotted!important;opacity:1!important\}/.test(css),'pending restores full opacity');
 assert(!/\[aria-busy=true\][^{]*\{[^}]*opacity:(0?\.\d+)/.test(css),'and never sets a fade');
});
test('error is a shape as well as a colour: 2px border plus an icon, or a double border on short number fields',()=>{
 const text=css.match(/:is\(input,select,textarea\)\[aria-invalid=true\]\{([^}]*)\}/)[1];assert(/border:2px solid var\(--danger\)!important/.test(text)&&/background-image:var\(--invalid-icon\)!important/.test(text));
 assert(/input\[type=number\]\[aria-invalid=true\]\{border:4px double var\(--danger\)!important/.test(css));
 assert(css.includes("stroke='%23a12a2a'")&&css.includes("stroke='%23ff9b94'"),'the icon colour matches the token in each theme');
});
test('pressed changes nothing about size or position',()=>{
 const rule=css.match(/:active:not\(:disabled\):not\(\[aria-disabled=true\]\)\{([^}]*)\}/)[1];assert(/box-shadow:inset/.test(rule));assert(!/margin|padding|width|height|top|left|transform|border-width/.test(rule),rule);
});
test('controls added in this release are at least 44px tall by one shared token',()=>{
 assert(/--control-min:44px/.test(css));assert(/\.mb-welcome-chip,\.mb-desk-tone,\.mb-simplify,\.mb-reminders-actions button\{min-height:var\(--control-min\)\}/.test(css));
});
test('the planner and chat mark themselves busy while waiting, so waiting is not shown as unavailable',()=>{
 assert(/panel\.setAttribute\('aria-busy',String\(busy\)\)/.test(fs.readFileSync('frontend/planner.js','utf8')));
 const chat=fs.readFileSync('frontend/chat.js','utf8');assert(/send\.setAttribute\('aria-busy',String\(busy\)\)/.test(chat)&&/input\.setAttribute\('aria-busy',String\(busy\)\)/.test(chat));
});
test('the save indicator uses the same meaning colours as the rest',()=>{
 assert(/\[data-state=saved\]\{border-left:3px solid var\(--success\)\}/.test(css)&&/\[data-state=failed\]\{border-left:4px double var\(--danger\)/.test(css));
});
test('the state rules outrank earlier id-scoped !important rules without touching real elements',()=>{
 const hits=raw.split(BOOST).length-1;assert(hits>=9,'specificity helper used on '+hits+' selectors');
 assert(!/mb-boost-[ab]/.test(fs.readFileSync('frontend/page.html','utf8')+fs.readdirSync('frontend').filter(f=>f.endsWith('.js')).map(f=>fs.readFileSync('frontend/'+f,'utf8')).join('')),'no element or script uses those ids, so :not() always matches');
});
console.log(checks+' interaction-state checks passed.');
(()=>{ // Found by the scripted audits in the real browser; pinned so they cannot quietly return.
 const raw=fs.readFileSync('frontend/paper.css','utf8');
 assert(/input\[type=checkbox\]\{width:24px!important;height:24px!important/.test(raw),'checkboxes are 24px (the chat consent box measured 13px)');
 assert(/label:has\(>input\[type=checkbox\]\)\{[^}]*min-height:var\(--control-min\)/.test(raw),'and sit in a 44px label');
 assert(/\n#page-stories\{overflow-x:clip\}/.test(raw),'the story hover wash is clipped at every width');
 console.log('PASS audit findings pinned: 24px checkboxes in a 44px label; story hover wash clipped at every width');
})();
(()=>{ // Large decorative numerals still need 3:1: ink3 blended over paper at the stated opacity.
 const css=fs.readFileSync('frontend/paper.css','utf8'),op=Number((css.match(/\.story-num\{opacity:([\d.]+)\}/)||[])[1]);assert(op>0,'rule exists');
 const lightBlock=css.replace(/:not\(#mb-boost-a\):not\(#mb-boost-b\)/g,'').match(/:root,:is\(#page-tools,#page-library,\.mb-workspace\)\{([\s\S]*?)\n\}/)[1];
 const hex=n=>lightBlock.match(new RegExp('--'+n+':(#[0-9a-fA-F]{6})'))[1],rgb=h=>[1,3,5].map(i=>parseInt(h.substr(i,2),16));
 const mix=(a,b,t)=>a.map((v,i)=>v*t+b[i]*(1-t)),L=c=>{const [r,g,b]=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*r+.7152*g+.0722*b;};
 const fg=mix(rgb(hex('ink3')),rgb(hex('bg')),op),r=(Math.max(L(fg),L(rgb(hex('bg'))))+.05)/(Math.min(L(fg),L(rgb(hex('bg'))))+.05);
 assert(r>=3,'story numerals reach 3:1 in light, got '+r.toFixed(2));console.log('PASS story numerals reach '+r.toFixed(2)+':1 (large text needs 3:1)');
})();
(()=>{ // Reduced motion must also reach motion that script starts, not only CSS: smooth scrolling ignores the CSS override.
 const bad=[];for(const f of fs.readdirSync('frontend').filter(n=>n.endsWith('.js'))){const src=fs.readFileSync('frontend/'+f,'utf8');
  for(const m of src.matchAll(/behavior:\s*(\(?[^,}]*)/g)){if(/smooth/.test(m[1])&&!/prefers-reduced-motion|.matches?/.test(m[1]))bad.push(f+': '+m[1].slice(0,60));}}
 assert.deepEqual(bad,[],'every smooth scroll is conditional on reduced motion');
 const css=fs.readdirSync('frontend').filter(n=>n.endsWith('.css')).map(n=>fs.readFileSync('frontend/'+n,'utf8')).join('\n');
 assert(/@media\(prefers-reduced-motion:reduce\)\{[^@]*\*,\*::before,\*::after\{animation:none!important;transition:none!important/.test(css),'a global reduced-motion rule removes CSS animation and transition');
 console.log('PASS reduced motion: script smooth-scrolls are conditional and a global CSS rule removes animation and transition');
})();
(()=>{ const css=fs.readFileSync('frontend/paper.css','utf8');
 assert(/:is\(#page-chat,#page-contact,#page-quiz\) :is\([^)]*\.btn-outline[^{]*\{border-radius:var\(--r\)!important\}/.test(css),'Chat, Contact and Self-check controls share the corner radius of Tools and Library');
 console.log('PASS controls on Chat, Contact and Self-check use the shared radius (measured 5px on all five pages)');
})();
(()=>{ const css=fs.readFileSync('frontend/paper.css','utf8');
 for(const t of ['--fs-xs:12px','--fs-sm:13px','--fs-md:15px','--fs-lg:18px','--fs-xl:24px','--fs-2xl:32px'])assert(css.includes(t),t);
 assert(/:where\(h1\)\{font-size:var\(--fs-2xl\)/.test(css)&&/:where\(h3\)\{font-size:var\(--fs-lg\)/.test(css),'headings take the scale');
 assert(/:where\(input:not\(/.test(css),'unstyled fields get a baseline at zero specificity, so every styled field keeps its own look');
 console.log('PASS type scale tokens exist; bare headings and unstyled fields use them at zero specificity');
})();
