/* Account recovery without email.
   - Signed in: "Recovery code" creates a one-time code (needs the current password). The code is shown once, kept
     only in this open page, and removed when you hide it, sign out, change account or leave.
   - Signed out: "Forgot your password?" takes the username, the recovery code and a new password.
   The server stores only a hash of the code; losing both the password and the code means the account cannot be
   recovered, and the page says so before anyone relies on it. Nothing here is stored in the browser. */
(() => {
'use strict';
const panel=document.getElementById('mb-account-panel');if(!panel)return;
const COPY={
 en:{recoverSummary:'Forgot your password?',recoverNote:'Use the recovery code you saved. It works once, and every device is signed out. If you have neither the password nor a code, the account cannot be recovered.',user:'Username',code:'Recovery code',newPw:'New password (12–128 characters)',recover:'Set a new password',working:'Working…',recovered:'Password changed and you are signed in. Your recovery code has been used: create a new one now.',wrong:'That did not work. Check the username and the code. After several tries this name waits for a while.',wait:'Too many tries. Please wait a few minutes.',failed:'Something went wrong. Nothing was changed.',
  createSummary:'Recovery code',createNote:'A recovery code lets you set a new password if you forget it, because MindBridge has no email address to send a reset link to. Keep it somewhere private, like a password manager. Creating a new code replaces the old one.',have:'You have a recovery code.',none:'You do not have a recovery code yet.',current:'Current password',create:'Create a new recovery code',shownOnce:'Your recovery code. It is shown only now.',hide:'Hide it',copy:'Copy',copied:'Copied.',copyFailed:'Could not copy. Select it and copy it yourself.',created:'Recovery code created. Any earlier code no longer works.',badPassword:'That password is not right.'},
 tr:{recoverSummary:'Şifreni mi unuttun?',recoverNote:'Kaydettiğin kurtarma kodunu kullan. Bir kez işe yarar ve tüm cihazlarda oturum kapanır. Ne şifren ne de kodun varsa hesap kurtarılamaz.',user:'Kullanıcı adı',code:'Kurtarma kodu',newPw:'Yeni şifre (12–128 karakter)',recover:'Yeni şifre belirle',working:'Çalışıyor…',recovered:'Şifre değişti ve oturum açıldı. Kurtarma kodun kullanıldı: şimdi yeni bir tane oluştur.',wrong:'Olmadı. Kullanıcı adını ve kodu kontrol et. Birkaç denemeden sonra bu ad bir süre bekler.',wait:'Çok fazla deneme. Lütfen birkaç dakika bekle.',failed:'Bir şey ters gitti. Hiçbir şey değişmedi.',
  createSummary:'Kurtarma kodu',createNote:'MindBridge’in sıfırlama bağlantısı gönderebileceği bir e-posta adresi olmadığı için, kurtarma kodu şifreni unutursan yeni bir şifre belirlemeni sağlar. Parola yöneticisi gibi özel bir yerde sakla. Yeni kod oluşturmak eskisini geçersiz kılar.',have:'Bir kurtarma kodun var.',none:'Henüz bir kurtarma kodun yok.',current:'Mevcut şifre',create:'Yeni kurtarma kodu oluştur',shownOnce:'Kurtarma kodun. Yalnızca şimdi gösterilir.',hide:'Gizle',copy:'Kopyala',copied:'Kopyalandı.',copyFailed:'Kopyalanamadı. Seçip kendin kopyala.',created:'Kurtarma kodu oluşturuldu. Önceki kod artık çalışmaz.',badPassword:'Şifre doğru değil.'},
 de:{recoverSummary:'Passwort vergessen?',recoverNote:'Nutze den gespeicherten Wiederherstellungscode. Er funktioniert einmal, und alle Geräte werden abgemeldet. Ohne Passwort und ohne Code lässt sich das Konto nicht wiederherstellen.',user:'Benutzername',code:'Wiederherstellungscode',newPw:'Neues Passwort (12–128 Zeichen)',recover:'Neues Passwort setzen',working:'Einen Moment…',recovered:'Passwort geändert, du bist angemeldet. Dein Code wurde verbraucht: erstelle jetzt einen neuen.',wrong:'Das hat nicht geklappt. Prüfe Benutzernamen und Code. Nach mehreren Versuchen muss dieser Name eine Weile warten.',wait:'Zu viele Versuche. Bitte warte einige Minuten.',failed:'Etwas ist schiefgelaufen. Es wurde nichts geändert.',
  createSummary:'Wiederherstellungscode',createNote:'Mit einem Wiederherstellungscode kannst du ein neues Passwort setzen, falls du es vergisst, denn MindBridge hat keine E-Mail-Adresse für einen Link. Bewahre ihn privat auf, etwa in einem Passwortmanager. Ein neuer Code ersetzt den alten.',have:'Du hast einen Wiederherstellungscode.',none:'Du hast noch keinen Wiederherstellungscode.',current:'Aktuelles Passwort',create:'Neuen Wiederherstellungscode erstellen',shownOnce:'Dein Wiederherstellungscode. Er wird nur jetzt angezeigt.',hide:'Ausblenden',copy:'Kopieren',copied:'Kopiert.',copyFailed:'Kopieren nicht möglich. Markiere ihn und kopiere ihn selbst.',created:'Wiederherstellungscode erstellt. Ein früherer Code funktioniert nicht mehr.',badPassword:'Das Passwort stimmt nicht.'},
 es:{recoverSummary:'¿Olvidaste tu contraseña?',recoverNote:'Usa el código de recuperación que guardaste. Funciona una vez y se cierra la sesión en todos los dispositivos. Sin contraseña ni código, la cuenta no se puede recuperar.',user:'Usuario',code:'Código de recuperación',newPw:'Contraseña nueva (12–128 caracteres)',recover:'Poner una contraseña nueva',working:'Un momento…',recovered:'Contraseña cambiada y sesión iniciada. Tu código se usó: crea uno nuevo ahora.',wrong:'No funcionó. Revisa el usuario y el código. Tras varios intentos, este nombre espera un rato.',wait:'Demasiados intentos. Espera unos minutos.',failed:'Algo salió mal. No se cambió nada.',
  createSummary:'Código de recuperación',createNote:'Un código de recuperación te permite poner una contraseña nueva si la olvidas, porque MindBridge no tiene un correo al que enviar un enlace. Guárdalo en un lugar privado, como un gestor de contraseñas. Crear un código nuevo reemplaza el anterior.',have:'Tienes un código de recuperación.',none:'Aún no tienes un código de recuperación.',current:'Contraseña actual',create:'Crear un código de recuperación nuevo',shownOnce:'Tu código de recuperación. Solo se muestra ahora.',hide:'Ocultar',copy:'Copiar',copied:'Copiado.',copyFailed:'No se pudo copiar. Selecciónalo y cópialo tú.',created:'Código de recuperación creado. Cualquier código anterior ya no funciona.',badPassword:'La contraseña no es correcta.'}};
const C=()=>COPY[document.documentElement.lang]||COPY.en;
function el(tag,id,cls){const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;return e;}
function field(labelId,inputId,type,auto){const label=el('label'),span=el('span'),input=el('input',inputId);input.type=type;input.autocomplete=auto;label.append(span,input);return {label,span,input};}
async function post(path,body,csrf){
 const headers={'Content-Type':'application/json','X-MindBridge-Client':'v5'};if(csrf)headers['X-CSRF-Token']=csrf;
 const r=await fetch(path,{method:'POST',credentials:'same-origin',cache:'no-store',headers,body:JSON.stringify(body)});
 const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error('failed');e.status=r.status;e.code=data.error&&data.error.code;throw e;}return data;
}
async function me(){const r=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store'});return r.ok?r.json():{user:null,csrf:null};}

// --- signed out: forgot password ------------------------------------------------------------------
const forgot=el('details','mb-recover'),forgotSummary=el('summary'),forgotNote=el('p',null,'mb-account-note'),forgotForm=el('form','mb-recover-form'),forgotStatus=el('p','mb-recover-status');
forgotStatus.setAttribute('role','status');
const fUser=field('','mb-recover-user','text','username'),fCode=field('','mb-recover-code','text','off'),fNew=field('','mb-recover-new','password','new-password');
fUser.input.minLength=3;fUser.input.maxLength=32;fUser.input.required=true;fCode.input.required=true;fCode.input.maxLength=40;fCode.input.spellcheck=false;fCode.input.autocapitalize='characters';fNew.input.minLength=12;fNew.input.maxLength=128;fNew.input.required=true;
const fGo=el('button','mb-recover-go');fGo.type='submit';fGo.className='btn-outline';
forgotForm.append(fUser.label,fCode.label,fNew.label,fGo);forgot.append(forgotSummary,forgotNote,forgotForm,forgotStatus);

// --- signed in: recovery code ---------------------------------------------------------------------
const make=el('details','mb-recovery-create'),makeSummary=el('summary'),makeNote=el('p',null,'mb-account-note'),makeState=el('p','mb-recovery-state'),makeStatus=el('p','mb-recovery-status');
makeStatus.setAttribute('role','status');
const mPw=field('','mb-recovery-password','password','current-password');mPw.input.maxLength=128;mPw.input.required=true;
const mGo=el('button','mb-recovery-go');mGo.type='button';mGo.className='btn-outline';
const shown=el('div','mb-recovery-shown'),shownLabel=el('p'),shownCode=el('code','mb-recovery-code'),copyBtn=el('button','mb-recovery-copy'),hideBtn=el('button','mb-recovery-hide');
copyBtn.type=hideBtn.type='button';copyBtn.className=hideBtn.className='btn-outline';shown.hidden=true;shown.append(shownLabel,shownCode,copyBtn,hideBtn);
make.append(makeSummary,makeNote,makeState,mPw.label,mGo,shown,makeStatus);
panel.append(forgot,make);

let signedIn=false,csrf=null,keys={forgot:null,make:null,state:null},busy=false;
function text(){
 const c=C();forgotSummary.textContent=c.recoverSummary;forgotNote.textContent=c.recoverNote;fUser.span.textContent=c.user;fCode.span.textContent=c.code;fNew.span.textContent=c.newPw;fGo.textContent=busy?c.working:c.recover;
 makeSummary.textContent=c.createSummary;makeNote.textContent=c.createNote;mPw.span.textContent=c.current;mGo.textContent=c.create;shownLabel.textContent=c.shownOnce;copyBtn.textContent=c.copy;hideBtn.textContent=c.hide;
 if(keys.forgot)forgotStatus.textContent=c[keys.forgot];if(keys.make)makeStatus.textContent=c[keys.make];if(keys.state)makeState.textContent=c[keys.state];
 forgot.hidden=signedIn;make.hidden=!signedIn;
}
function clearCode(){shownCode.textContent='';shown.hidden=true;mPw.input.value='';}
async function sync(){
 clearCode();keys.make=null;
 try{const data=await me();signedIn=!!data.user;csrf=data.csrf;}catch(e){signedIn=false;csrf=null;}
 if(signedIn){try{const r=await fetch('/api/auth/recovery',{credentials:'same-origin',cache:'no-store'});const s=r.ok?await r.json():{};keys.state=s.has_code?'have':'none';}catch(e){keys.state=null;}}
 text();
}
forgotForm.addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;busy=true;keys.forgot=null;text();
 try{
  await post('/api/auth/recover',{username:fUser.input.value.trim().toLowerCase(),code:fCode.input.value,new_password:fNew.input.value});
  fNew.input.value='';fCode.input.value='';keys.forgot='recovered';
  try{if(typeof BroadcastChannel!=='undefined'){const ch=new BroadcastChannel('mindbridge.account');ch.postMessage('refresh');ch.close();}}catch(x){/* the focus handler refreshes too */}
  window.dispatchEvent(new CustomEvent('mb:account-changed'));
 }catch(error){keys.forgot=error.status===429?'wait':error.code==='invalid_recovery'?'wrong':'failed';}
 busy=false;text();await sync();
});
mGo.addEventListener('click',async()=>{
 if(busy||!mPw.input.value)return;busy=true;keys.make=null;
 try{
  const data=await post('/api/auth/recovery-code',{password:mPw.input.value},csrf);
  mPw.input.value='';shownCode.textContent=data.code;shown.hidden=false;keys.make='created';keys.state='have';
 }catch(error){keys.make=error.code==='invalid_credentials'?'badPassword':error.status===429?'wait':'failed';}
 busy=false;text();
});
copyBtn.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(shownCode.textContent);makeStatus.textContent=C().copied;}catch(e){makeStatus.textContent=C().copyFailed;}});
hideBtn.addEventListener('click',()=>{clearCode();keys.make=null;makeStatus.textContent='';});
window.addEventListener('mb:account-changed',()=>{sync();});
window.addEventListener('pagehide',clearCode);
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();text();};
text();sync();
})();
