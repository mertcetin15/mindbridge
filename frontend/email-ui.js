/* Optional account email, only when the operator has configured a mail server (/api/health says mail_enabled).
   - Signed in: save an address (needs the current password); a confirmation link is mailed to it.
   - Signed out: "Forgot your password? Use my email" mails a single-use reset link if a confirmed account owns the address.
   - Links look like /#verify=TOKEN and /#reset=TOKEN. A fragment is never sent to the server; the token is read once,
     removed from the address bar at once, and sent in the body of a POST. Nothing is stored in the browser. */
(() => {
'use strict';
const panel=document.getElementById('mb-account-panel');if(!panel)return;
const COPY={
 en:{title:'Email for password reset (optional)',note:'If you add an email address and confirm it, you can reset a forgotten password with a link sent to it. The address is used for nothing else and can be removed at any time.',none:'No email address saved.',unconfirmed:'Saved but not confirmed yet. Open the link we sent to it.',confirmed:'Confirmed.',email:'Email address',password:'Current password',save:'Save and send confirmation',remove:'Remove email',saved:'Saved. If the address is right, a confirmation link is on its way (valid 24 hours).',removed:'Email removed.',badPassword:'That password is not right.',invalid:'That address does not look right.',failed:'Something went wrong. Nothing was changed.',wait:'Too many tries. Please wait a few minutes.',
  forgotSummary:'Forgot your password? Use my email',forgotNote:'Enter the address you confirmed. If it belongs to an account, a link that works once for 30 minutes is sent to it. You always see the same message, so nobody can use this to find out who has an account.',send:'Send reset link',sent:'If that address is confirmed on an account, a reset link is on its way.',
  verified:'Email confirmed. You can now use it to reset your password.',verifyBad:'That confirmation link did not work. It may have expired or been used. Save the address again to get a new one.',inUse:'That address is already confirmed on another account.',
  resetTitle:'Choose a new password',newPw:'New password (12–128 characters)',resetGo:'Set new password',resetDone:'Password changed and you are signed in. Every other device was signed out.',resetBad:'That reset link did not work. It may have expired or been used. Ask for a new one.'},
 tr:{title:'Şifre sıfırlama için e-posta (isteğe bağlı)',note:'Bir e-posta adresi ekleyip onaylarsan, unuttuğun şifreyi o adrese gönderilen bir bağlantıyla sıfırlayabilirsin. Adres başka hiçbir şey için kullanılmaz ve istediğin zaman kaldırılabilir.',none:'Kayıtlı e-posta adresi yok.',unconfirmed:'Kaydedildi ama henüz onaylanmadı. Adrese gönderdiğimiz bağlantıyı aç.',confirmed:'Onaylandı.',email:'E-posta adresi',password:'Mevcut şifre',save:'Kaydet ve onay gönder',remove:'E-postayı kaldır',saved:'Kaydedildi. Adres doğruysa bir onay bağlantısı yolda (24 saat geçerli).',removed:'E-posta kaldırıldı.',badPassword:'Şifre doğru değil.',invalid:'Bu adres doğru görünmüyor.',failed:'Bir şey ters gitti. Hiçbir şey değişmedi.',wait:'Çok fazla deneme. Lütfen birkaç dakika bekle.',
  forgotSummary:'Şifreni mi unuttun? E-postamı kullan',forgotNote:'Onayladığın adresi yaz. Bir hesaba aitse, adrese 30 dakika boyunca bir kez çalışan bir bağlantı gönderilir. Her zaman aynı mesajı görürsün; böylece kimse bununla kimin hesabı olduğunu öğrenemez.',send:'Sıfırlama bağlantısı gönder',sent:'Bu adres bir hesapta onaylıysa, sıfırlama bağlantısı yolda.',
  verified:'E-posta onaylandı. Artık şifreni sıfırlamak için kullanabilirsin.',verifyBad:'Onay bağlantısı çalışmadı. Süresi dolmuş ya da kullanılmış olabilir. Yenisi için adresi tekrar kaydet.',inUse:'Bu adres başka bir hesapta zaten onaylı.',
  resetTitle:'Yeni şifre belirle',newPw:'Yeni şifre (12–128 karakter)',resetGo:'Yeni şifreyi ayarla',resetDone:'Şifre değişti ve oturum açıldı. Diğer tüm cihazların oturumu kapatıldı.',resetBad:'Sıfırlama bağlantısı çalışmadı. Süresi dolmuş ya da kullanılmış olabilir. Yenisini iste.'},
 de:{title:'E-Mail für das Zurücksetzen des Passworts (optional)',note:'Wenn du eine E-Mail-Adresse hinzufügst und bestätigst, kannst du ein vergessenes Passwort mit einem Link zurücksetzen, der an sie gesendet wird. Die Adresse dient zu nichts anderem und kann jederzeit entfernt werden.',none:'Keine E-Mail-Adresse gespeichert.',unconfirmed:'Gespeichert, aber noch nicht bestätigt. Öffne den Link, den wir gesendet haben.',confirmed:'Bestätigt.',email:'E-Mail-Adresse',password:'Aktuelles Passwort',save:'Speichern und Bestätigung senden',remove:'E-Mail entfernen',saved:'Gespeichert. Wenn die Adresse stimmt, ist ein Bestätigungslink unterwegs (24 Stunden gültig).',removed:'E-Mail entfernt.',badPassword:'Das Passwort stimmt nicht.',invalid:'Diese Adresse sieht nicht richtig aus.',failed:'Etwas ist schiefgelaufen. Es wurde nichts geändert.',wait:'Zu viele Versuche. Bitte warte einige Minuten.',
  forgotSummary:'Passwort vergessen? Meine E-Mail nutzen',forgotNote:'Gib die bestätigte Adresse ein. Gehört sie zu einem Konto, wird ein Link gesendet, der 30 Minuten lang einmal funktioniert. Du siehst immer dieselbe Meldung, damit niemand so herausfinden kann, wer ein Konto hat.',send:'Link zum Zurücksetzen senden',sent:'Wenn diese Adresse bei einem Konto bestätigt ist, ist ein Link unterwegs.',
  verified:'E-Mail bestätigt. Du kannst sie jetzt zum Zurücksetzen deines Passworts nutzen.',verifyBad:'Dieser Bestätigungslink hat nicht funktioniert. Er ist vielleicht abgelaufen oder benutzt. Speichere die Adresse erneut für einen neuen.',inUse:'Diese Adresse ist bei einem anderen Konto bereits bestätigt.',
  resetTitle:'Neues Passwort wählen',newPw:'Neues Passwort (12–128 Zeichen)',resetGo:'Neues Passwort setzen',resetDone:'Passwort geändert und du bist angemeldet. Alle anderen Geräte wurden abgemeldet.',resetBad:'Dieser Link hat nicht funktioniert. Er ist vielleicht abgelaufen oder benutzt. Fordere einen neuen an.'},
 es:{title:'Correo para restablecer la contraseña (opcional)',note:'Si añades un correo y lo confirmas, podrás restablecer una contraseña olvidada con un enlace enviado a esa dirección. La dirección no se usa para nada más y puedes quitarla cuando quieras.',none:'No hay un correo guardado.',unconfirmed:'Guardado pero aún sin confirmar. Abre el enlace que enviamos.',confirmed:'Confirmado.',email:'Correo electrónico',password:'Contraseña actual',save:'Guardar y enviar confirmación',remove:'Quitar correo',saved:'Guardado. Si la dirección es correcta, un enlace de confirmación va en camino (válido 24 horas).',removed:'Correo quitado.',badPassword:'La contraseña no es correcta.',invalid:'Esa dirección no parece correcta.',failed:'Algo salió mal. No se cambió nada.',wait:'Demasiados intentos. Espera unos minutos.',
  forgotSummary:'¿Olvidaste tu contraseña? Usar mi correo',forgotNote:'Escribe la dirección que confirmaste. Si pertenece a una cuenta, se envía un enlace que funciona una vez durante 30 minutos. Siempre ves el mismo mensaje, así nadie puede averiguar quién tiene una cuenta.',send:'Enviar enlace',sent:'Si esa dirección está confirmada en una cuenta, un enlace va en camino.',
  verified:'Correo confirmado. Ya puedes usarlo para restablecer tu contraseña.',verifyBad:'Ese enlace de confirmación no funcionó. Puede haber caducado o usado. Guarda la dirección de nuevo para recibir otro.',inUse:'Esa dirección ya está confirmada en otra cuenta.',
  resetTitle:'Elige una contraseña nueva',newPw:'Contraseña nueva (12–128 caracteres)',resetGo:'Poner la contraseña nueva',resetDone:'Contraseña cambiada y sesión iniciada. Se cerró la sesión en todos los demás dispositivos.',resetBad:'Ese enlace no funcionó. Puede haber caducado o usado. Pide uno nuevo.'}};
const C=()=>COPY[document.documentElement.lang]||COPY.en;
function el(tag,id,cls){const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;return e;}
function field(id,type,auto){const label=el('label'),span=el('span'),input=el('input',id);input.type=type;input.autocomplete=auto;label.append(span,input);return {label,span,input};}
async function call(path,body,csrf,method){
 const headers={'Content-Type':'application/json','X-MindBridge-Client':'v5'};if(csrf)headers['X-CSRF-Token']=csrf;
 const r=await fetch(path,{method:method||'POST',credentials:'same-origin',cache:'no-store',headers,body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error('failed');e.status=r.status;e.code=data.error&&data.error.code;throw e;}return data;
}
let on=false,signedIn=false,csrf=null,info=null,keys={mine:null,forgot:null,reset:null,notice:null},busy=false,resetToken=null;

// signed in
const mine=el('details','mb-email'),mineSum=el('summary'),mineNote=el('p',null,'mb-account-note'),mineState=el('p','mb-email-state'),mineStatus=el('p','mb-email-status');mineStatus.setAttribute('role','status');
const mEmail=field('mb-email-address','email','email'),mPw=field('mb-email-password','password','current-password');mEmail.input.maxLength=254;mEmail.input.required=true;mPw.input.maxLength=128;mPw.input.required=true;
const mSave=el('button','mb-email-save'),mRemove=el('button','mb-email-remove');mSave.type=mRemove.type='button';mSave.className=mRemove.className='btn-outline';
mine.append(mineSum,mineNote,mineState,mEmail.label,mPw.label,mSave,mRemove,mineStatus);
// signed out
const forgot=el('details','mb-email-forgot'),fSum=el('summary'),fNote=el('p',null,'mb-account-note'),fForm=el('form','mb-email-forgot-form'),fStatus=el('p','mb-email-forgot-status');fStatus.setAttribute('role','status');
const fEmail=field('mb-email-forgot-address','email','email');fEmail.input.maxLength=254;fEmail.input.required=true;const fGo=el('button','mb-email-forgot-go');fGo.type='submit';fGo.className='btn-outline';
fForm.append(fEmail.label,fGo);forgot.append(fSum,fNote,fForm,fStatus);
// reset form (opened from a link)
const reset=el('section','mb-email-reset'),rTitle=el('h3'),rForm=el('form','mb-email-reset-form'),rStatus=el('p','mb-email-reset-status');rStatus.setAttribute('role','status');
const rNew=field('mb-email-reset-new','password','new-password');rNew.input.minLength=12;rNew.input.maxLength=128;rNew.input.required=true;const rGo=el('button','mb-email-reset-go');rGo.type='submit';rGo.className='btn-outline';
rForm.append(rNew.label,rGo);reset.append(rTitle,rForm,rStatus);reset.hidden=true;
const notice=el('p','mb-email-notice','mb-account-note');notice.setAttribute('role','status');
panel.append(notice,mine,forgot,reset);
[mine,forgot,reset,notice].forEach(e=>{e.hidden=true;});

function text(){
 const c=C();mineSum.textContent=c.title;mineNote.textContent=c.note;mEmail.span.textContent=c.email;mPw.span.textContent=c.password;mSave.textContent=c.save;mRemove.textContent=c.remove;
 mineState.textContent=!info||!info.has_email?c.none:(info.email+' · '+(info.verified?c.confirmed:c.unconfirmed));mRemove.hidden=!(info&&info.has_email);
 fSum.textContent=c.forgotSummary;fNote.textContent=c.forgotNote;fEmail.span.textContent=c.email;fGo.textContent=c.send;rTitle.textContent=c.resetTitle;rNew.span.textContent=c.newPw;rGo.textContent=c.resetGo;
 if(keys.mine)mineStatus.textContent=c[keys.mine];if(keys.forgot)fStatus.textContent=c[keys.forgot];if(keys.reset)rStatus.textContent=c[keys.reset];notice.textContent=keys.notice?c[keys.notice]:'';
 mine.hidden=!(on&&signedIn);forgot.hidden=!(on&&!signedIn);reset.hidden=!(on&&resetToken);notice.hidden=!keys.notice;
}
async function sync(){
 if(!on){text();return;}
 try{const me=await (await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'})).json();signedIn=!!me.user;csrf=me.csrf;}catch(e){signedIn=false;csrf=null;}
 info=null;if(signedIn){try{const r=await fetch('/api/auth/email',{credentials:'same-origin',cache:'no-store'});info=r.ok?await r.json():null;}catch(e){info=null;}}
 text();
}
const errKey=e=>e.status===429?'wait':e.code==='invalid_credentials'?'badPassword':e.code==='invalid_request'?'invalid':'failed';
mSave.addEventListener('click',async()=>{
 if(busy||!mEmail.input.value||!mPw.input.value)return;busy=true;keys.mine=null;
 try{await call('/api/auth/email',{password:mPw.input.value,email:mEmail.input.value.trim()},csrf);mPw.input.value='';keys.mine='saved';}catch(e){keys.mine=errKey(e);}
 busy=false;await sync();
});
mRemove.addEventListener('click',async()=>{
 if(busy||!mPw.input.value)return;busy=true;keys.mine=null;
 try{await call('/api/auth/email/remove',{password:mPw.input.value},csrf);mPw.input.value='';keys.mine='removed';}catch(e){keys.mine=errKey(e);}
 busy=false;await sync();
});
fForm.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;busy=true;keys.forgot=null;
 try{await call('/api/auth/forgot',{email:fEmail.input.value.trim()});keys.forgot='sent';fEmail.input.value='';}catch(err){keys.forgot=err.status===429?'wait':'failed';}
 busy=false;text();
});
rForm.addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!resetToken)return;busy=true;keys.reset=null;
 try{
  await call('/api/auth/reset',{token:resetToken,new_password:rNew.input.value});rNew.input.value='';resetToken=null;keys.reset='resetDone';
  try{if(typeof BroadcastChannel!=='undefined'){const ch=new BroadcastChannel('mindbridge.account');ch.postMessage('refresh');ch.close();}}catch(x){}
  window.dispatchEvent(new CustomEvent('mb:account-changed'));
 }catch(err){keys.reset=err.status===429?'wait':err.code==='invalid_link'?'resetBad':'failed';if(err.code==='invalid_link')resetToken=null;}
 busy=false;await sync();
});

// Links: #verify=TOKEN or #reset=TOKEN. Read once, remove from the address bar, never store.
async function handleFragment(){
 const m=/^#(verify|reset)=([A-Za-z0-9_-]{20,64})$/.exec(location.hash);if(!m)return;
 try{history.replaceState(null,'','#/home');}catch(e){}
 if(typeof window.showPage==='function')window.showPage('home');
 if(m[1]==='verify'){
  try{await call('/api/auth/verify-email',{token:m[2]});keys.notice='verified';}catch(e){keys.notice=e.code==='email_in_use'?'inUse':'verifyBad';}
 }else{resetToken=m[2];keys.reset=null;}
 await sync();(m[1]==='verify'?notice:reset).scrollIntoView({block:'center',behavior:((typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)?'auto':'smooth')});
 if(m[1]==='reset'){rNew.input.focus();}
}
window.addEventListener('hashchange',handleFragment);
window.addEventListener('mb:account-changed',()=>{sync();});
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();text();};
(async()=>{
 try{const h=await (await fetch('/api/health',{cache:'no-store'})).json();on=!!h.mail_enabled;}catch(e){on=false;}
 await sync();await handleFragment();
})();
})();
