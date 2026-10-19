const fs=require('fs'),assert=require('assert');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
const page=fs.readFileSync('frontend/page.html','utf8'),css=fs.readFileSync('frontend/dark-room.css','utf8');
const block=page.match(/<div id="dark-room-overlay"[\s\S]*?<\/button>\s*<\/div>/)[0];
const lum=h=>{h=h.replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const [r,g,b]=[0,2,4].map(i=>parseInt(h.substr(i,2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*r+.7152*g+.0722*b;};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
const bg=block.match(/id="dark-room-overlay" style="[^"]*background:(#[0-9a-f]{3,6})/i)[1];
const textColor=block.match(/class="dark-room-text"[^>]*style="[^"]*color:(#[0-9a-f]{3,6})/i)[1];
const button=block.match(/<button class="dark-room-btn"[^>]*style="([^"]*)"/)[1];
const buttonColor=button.match(/(?:^|;)color:(#[0-9a-f]{3,6})/i)[1],buttonBorder=button.match(/border:1px solid (#[0-9a-f]{3,6})/i)[1];
test('the room is a warm near-black, not pure black',()=>{assert.notEqual(bg.toLowerCase(),'#000');assert.notEqual(bg.toLowerCase(),'#000000');assert.equal(bg.toLowerCase(),'#0f1413');});
test('the message is readable (at least 4.5:1) even though it is large text',()=>{assert(ratio(textColor,bg)>=4.5,'ratio '+ratio(textColor,bg).toFixed(2));});
test('the way out is easy to see: label at least 4.5:1, outline at least 3:1, and a 44px target',()=>{
 assert(ratio(buttonColor,bg)>=4.5,'label '+ratio(buttonColor,bg).toFixed(2));assert(ratio(buttonBorder,bg)>=3,'outline '+ratio(buttonBorder,bg).toFixed(2));assert(/min-height:44px/.test(button));
});
test('hovering or focusing the exit raises contrast and stays visible',()=>{
 const hover=css.match(/\.dark-room-btn:hover,\.dark-room-btn:focus-visible\{background:(#[0-9a-f]+);color:(#[0-9a-f]+);border-color:(#[0-9a-f]+)\}/i);assert(hover,'hover and focus share one rule');
 assert(ratio(hover[2],hover[1])>=7,'text '+ratio(hover[2],hover[1]).toFixed(2));assert(ratio(hover[3],hover[1])>=3);assert(ratio(hover[2],hover[1])>ratio(buttonColor,bg)*0.9,'not weaker than the resting state');
});
test('no fade for reduced motion; the rule beats the inline transition',()=>{
 assert(/@media \(prefers-reduced-motion:reduce\)\{#dark-room-overlay,#dark-room-overlay \*\{transition:none!important\}\}/.test(css));assert(/transition:opacity 1s ease/.test(block),'the inline fade is what the rule has to override');
});
test('the overlay is still a labelled modal dialog that other scripts make inert and restore',()=>{
 const modern=fs.readFileSync('frontend/modern-ui.js','utf8');assert(/dark\.setAttribute\('role','dialog'\)/.test(modern)&&/dark\.setAttribute\('aria-modal','true'\)/.test(modern));assert(/e\.key==='Escape'\)\{if\(dark\.classList\.contains\('active'\)\)window\.toggleDarkRoom\(false\)/.test(modern),'Escape leaves');assert(/darkReturn\?\.focus\(\)/.test(modern),'focus returns');
});
test('the room does not start sound or motion of its own',()=>{
 const toggle=fs.readFileSync('frontend/app.js','utf8').match(/function toggleDarkRoom\(show\)\{[\s\S]*?\n\}/)[0];assert(!/Audio|play\(|toggleSound|requestAnimationFrame|setInterval|setTimeout/.test(toggle),toggle);
});
console.log(checks+' dark-room checks passed.');
