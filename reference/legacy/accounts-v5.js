/* Account cookies stay HttpOnly; CSRF is held only in memory. Guest records never auto-upload. */
(() => {
'use strict';
const el=id=>document.getElementById(id),TYPES=['journal','gratitude','mood'],MOODS=['😫','😞','😐','🙂','🤩'];
const COPY={
en:{title:'Your account',guest:'Guest · browser records',username:'Username (3–32 letters, numbers, _ or -)',password:'Password (12–128 characters)',login:'Sign in',register:'Create account',logout:'Sign out',note:'Guest records stay in this browser. When signed in, new records are stored in this app’s database on the server (on your Mac in the local setup), without encryption of entry text. They are not sent to AI. Changing accounts clears drafts. No email or password recovery is available yet.',account:'Signed in as',busy:'Please wait…',saved:'Saved to your account.',error:'The request failed. Your draft is kept. Try again.',auth:'Your session ended. Sign in again; your draft is kept.',credentials:'Wrong username or password.',unavailable:'This username is unavailable.',invalid:'Check the username, password or entry format.',csrf:'Session changed. Refresh your account and try again.',rate:'Too many account requests. Wait a minute.',storage:'Database unavailable. Your draft is kept.',import:'Copy guest records to account',imported:'Guest records copied. Originals remain in this browser.',export:'Download my records',manage:'Manage account',current:'Current password',newPassword:'New password (12–128 characters)',change:'Change password',changed:'Password changed. All sessions were signed out.',delete:'Delete account and records',confirm:'Permanently delete this account and all its database records? Guest browser records are not affected.',deleted:'Account and database records deleted.',history:'Account history',empty:'No entries in the loaded history.',del:'Delete',confirmEntry:'Delete this account entry?',more:'Load older records',count:'Records loaded',local:'Guest · saved in this browser only, without encryption. Signing in does not automatically upload these records.',server:'Account · saved in the app database, without encryption of entry text. Other users cannot access it through their accounts. Local setup keeps the database on this Mac.',limit:'Account record limit reached (2,000). Export or delete old entries.',noGuest:'No guest entries to copy.',badGuest:'Guest data could not be read. It was not changed.',file:'Accounts require the running app. Open http://127.0.0.1:8000.',ready:'Account ready.',guestReady:'Guest mode.',refresh:'Refresh account'},
tr:{title:'Hesabın',guest:'Misafir · tarayıcı kayıtları',username:'Kullanıcı adı (3–32 harf, rakam, _ veya -)',password:'Şifre (12–128 karakter)',login:'Giriş yap',register:'Hesap oluştur',logout:'Çıkış yap',note:'Misafir kayıtları bu tarayıcıda kalır. Giriş yaptığında yeni kayıtlar uygulamanın sunucudaki veritabanında tutulur (yerel kurulumda MacBook’unda). Kayıt metinleri şifrelenmez ve AI’ye gönderilmez. Hesap değişince taslaklar temizlenir. Henüz e-posta veya şifre kurtarma yoktur.',account:'Giriş yapılan hesap',busy:'Lütfen bekle…',saved:'Hesabına kaydedildi.',error:'İşlem başarısız. Taslağın korunuyor. Yeniden dene.',auth:'Oturumun sona erdi. Yeniden giriş yap; taslağın korunuyor.',credentials:'Kullanıcı adı veya şifre yanlış.',unavailable:'Bu kullanıcı adı kullanılamıyor.',invalid:'Kullanıcı adı, şifre veya kayıt biçimini kontrol et.',csrf:'Oturum değişti. Hesabını yenileyip yeniden dene.',rate:'Çok fazla hesap isteği. Bir dakika bekle.',storage:'Veritabanına ulaşılamıyor. Taslağın korunuyor.',import:'Misafir kayıtlarını hesaba kopyala',imported:'Misafir kayıtları kopyalandı. Orijinalleri tarayıcıda duruyor.',export:'Kayıtlarımı indir',manage:'Hesabı yönet',current:'Mevcut şifre',newPassword:'Yeni şifre (12–128 karakter)',change:'Şifreyi değiştir',changed:'Şifre değişti. Tüm oturumlardan çıkış yapıldı.',delete:'Hesabı ve kayıtları sil',confirm:'Bu hesabı ve veritabanındaki tüm kayıtlarını kalıcı olarak silmek istiyor musun? Tarayıcıdaki misafir kayıtları etkilenmez.',deleted:'Hesap ve veritabanı kayıtları silindi.',history:'Hesap geçmişi',empty:'Yüklenen geçmişte kayıt yok.',del:'Sil',confirmEntry:'Bu hesap kaydı silinsin mi?',more:'Eski kayıtları yükle',count:'Yüklenen kayıt',local:'Misafir · yalnızca bu tarayıcıda, şifrelenmeden saklanır. Giriş yapmak kayıtları otomatik yüklemez.',server:'Hesap · uygulamanın veritabanına kaydedilir; kayıt metni şifrelenmez. Diğer kullanıcılar kendi hesaplarıyla erişemez. Yerel kurulumda veritabanı bu MacBook’ta tutulur.',limit:'Hesabın 2.000 kayıt sınırına ulaştı. Eski kayıtları indir veya sil.',noGuest:'Kopyalanacak misafir kaydı yok.',badGuest:'Misafir kayıtları okunamadı. Değiştirilmedi.',file:'Hesap için çalışan uygulama gerekir. http://127.0.0.1:8000 adresini aç.',ready:'Hesap hazır.',guestReady:'Misafir modu.',refresh:'Hesabı yenile'},
de:{title:'Dein Konto',guest:'Gast · Browser-Einträge',username:'Benutzername (3–32 Buchstaben, Zahlen, _ oder -)',password:'Passwort (12–128 Zeichen)',login:'Anmelden',register:'Konto erstellen',logout:'Abmelden',note:'Gast-Einträge bleiben im Browser. Angemeldete Einträge liegen in der App-Datenbank auf dem Server (bei lokaler Nutzung auf deinem Mac), mit unverschlüsseltem Text. Sie werden nicht an KI gesendet. Kontowechsel löscht Entwürfe. Noch keine E-Mail- oder Passwortwiederherstellung.',account:'Angemeldet als',busy:'Bitte warten…',saved:'Im Konto gespeichert.',error:'Anfrage fehlgeschlagen. Dein Entwurf bleibt erhalten.',auth:'Sitzung abgelaufen. Melde dich erneut an; der Entwurf bleibt erhalten.',credentials:'Benutzername oder Passwort falsch.',unavailable:'Benutzername nicht verfügbar.',invalid:'Prüfe Benutzername, Passwort oder Eintragsformat.',csrf:'Sitzung geändert. Aktualisiere das Konto.',rate:'Zu viele Kontoanfragen. Warte eine Minute.',storage:'Datenbank nicht verfügbar. Entwurf bleibt erhalten.',import:'Gast-Einträge ins Konto kopieren',imported:'Kopiert. Originale bleiben im Browser.',export:'Meine Einträge herunterladen',manage:'Konto verwalten',current:'Aktuelles Passwort',newPassword:'Neues Passwort (12–128 Zeichen)',change:'Passwort ändern',changed:'Passwort geändert. Alle Sitzungen abgemeldet.',delete:'Konto und Einträge löschen',confirm:'Dieses Konto und alle Datenbankeinträge endgültig löschen? Browser-Gasteinträge bleiben erhalten.',deleted:'Konto und Datenbankeinträge gelöscht.',history:'Kontoverlauf',empty:'Keine Einträge im geladenen Verlauf.',del:'Löschen',confirmEntry:'Diesen Kontoeintrag löschen?',more:'Ältere Einträge laden',count:'Geladene Einträge',local:'Gast · nur in diesem Browser unverschlüsselt gespeichert. Anmeldung lädt nichts automatisch hoch.',server:'Konto · App-Datenbank, Eintragstext unverschlüsselt. Andere Nutzer haben über ihre Konten keinen Zugriff. Die lokale Datenbank liegt auf diesem Mac.',limit:'Kontolimit von 2.000 Einträgen erreicht.',noGuest:'Keine Gasteinträge zum Kopieren.',badGuest:'Gasteinträge unlesbar. Nicht verändert.',file:'Konten benötigen die laufende App unter http://127.0.0.1:8000.',ready:'Konto bereit.',guestReady:'Gastmodus.',refresh:'Konto aktualisieren'},
es:{title:'Tu cuenta',guest:'Invitado · registros del navegador',username:'Usuario (3–32 letras, números, _ o -)',password:'Contraseña (12–128 caracteres)',login:'Iniciar sesión',register:'Crear cuenta',logout:'Cerrar sesión',note:'Los registros de invitado quedan en el navegador. Al iniciar sesión, los nuevos registros se guardan en la base de datos de la app en el servidor (en tu Mac para uso local), sin cifrar el texto. No se envían a la IA. Cambiar de cuenta borra los borradores. Aún no hay recuperación de contraseña ni correo.',account:'Sesión iniciada como',busy:'Espera…',saved:'Guardado en tu cuenta.',error:'Solicitud fallida. Se conserva tu borrador.',auth:'Sesión terminada. Inicia sesión otra vez; se conserva tu borrador.',credentials:'Usuario o contraseña incorrectos.',unavailable:'Usuario no disponible.',invalid:'Revisa el usuario, contraseña o registro.',csrf:'La sesión cambió. Actualiza la cuenta.',rate:'Demasiadas solicitudes. Espera un minuto.',storage:'Base de datos no disponible. Se conserva el borrador.',import:'Copiar registros de invitado',imported:'Copiados. Los originales quedan en el navegador.',export:'Descargar mis registros',manage:'Gestionar cuenta',current:'Contraseña actual',newPassword:'Nueva contraseña (12–128 caracteres)',change:'Cambiar contraseña',changed:'Contraseña cambiada. Se cerraron todas las sesiones.',delete:'Borrar cuenta y registros',confirm:'¿Borrar permanentemente esta cuenta y todos sus registros? Los registros locales de invitado no cambian.',deleted:'Cuenta y registros borrados.',history:'Historial de cuenta',empty:'Sin registros en el historial cargado.',del:'Borrar',confirmEntry:'¿Borrar este registro de cuenta?',more:'Cargar registros anteriores',count:'Registros cargados',local:'Invitado · solo en este navegador, sin cifrado. Iniciar sesión no sube nada automáticamente.',server:'Cuenta · base de datos de la app, sin cifrar el texto. Otros usuarios no acceden desde sus cuentas. La base local está en este Mac.',limit:'Se alcanzó el límite de 2.000 registros.',noGuest:'Sin registros de invitado para copiar.',badGuest:'No se pudieron leer los registros locales. No cambiaron.',file:'Las cuentas requieren la app en http://127.0.0.1:8000.',ready:'Cuenta lista.',guestReady:'Modo invitado.',refresh:'Actualizar cuenta'}
};
const C=()=>COPY[curLang]||COPY.en;
const guestSave={journal:window.saveJournal,gratitude:window.saveGratitude,mood:window.selectMood},priorI18n=window.applyI18n;
let user=null,csrf=null,ready=false,busy=false,epoch=0,records=[],total=0,message='busy',mutating=false,loading=false,loadSequence=0,queuedRefresh=false;
const pendingIDs=new Map();
function node(tag,id){const n=document.createElement(tag);if(id)n.id=id;return n;}
const panel=node('section','mb-account-panel');panel.className='mb-account-panel';
const title=node('h2'),identity=node('p'),note=node('p'),status=node('p','mb-account-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');note.className='mb-account-note';
const form=node('form','mb-account-form'),username=node('input','mb-account-username'),password=node('input','mb-account-password');
username.type='text';username.autocomplete='username';username.minLength=3;username.maxLength=32;username.required=true;username.pattern='[a-zA-Z0-9_-]{3,32}';password.type='password';password.autocomplete='current-password';password.minLength=12;password.maxLength=128;password.required=true;
const userLabel=node('label'),passLabel=node('label'),userText=node('span'),passText=node('span');userLabel.append(userText,username);passLabel.append(passText,password);
function btn(id,key,action){const b=node('button',id);b.type='button';b.className='btn-outline';b.dataset.key=key;b.addEventListener('click',action);return b;}
const login=node('button','mb-login');login.type='submit';login.className='btn-outline';login.dataset.key='login';const register=btn('mb-register','register',()=>authenticate('register'));
form.append(userLabel,passLabel,login,register);form.addEventListener('submit',e=>{e.preventDefault();authenticate('login');});
const actions=node('div','mb-account-actions'),logout=btn('mb-logout','logout',logoutAccount),importBtn=btn('mb-import','import',importGuest),exportBtn=btn('mb-export','export',exportAccount),refresh=btn('mb-account-refresh','refresh',()=>refreshSession());
actions.append(logout,importBtn,exportBtn);
const manage=node('details','mb-account-manage'),summary=node('summary'),current=node('input','mb-current-password'),newPassword=node('input','mb-new-password');
current.type='password';current.autocomplete='current-password';current.maxLength=128;newPassword.type='password';newPassword.autocomplete='new-password';newPassword.minLength=12;newPassword.maxLength=128;
const currentLabel=node('label'),newLabel=node('label'),currentText=node('span'),newText=node('span');currentLabel.append(currentText,current);newLabel.append(newText,newPassword);
const change=btn('mb-password-change','change',()=>manageAccount(false)),deleteBtn=btn('mb-account-delete','delete',()=>manageAccount(true));deleteBtn.classList.add('mb-danger');manage.append(summary,currentLabel,newLabel,change,deleteBtn);
const more=btn('mb-records-more','more',()=>loadRecords(true)),count=node('p');panel.append(title,identity,note,form,actions,manage,refresh,status,count,more);document.querySelector('#page-tools .section').after(panel);
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('mindbridge.account'):null;
function announce(){window.dispatchEvent(new CustomEvent('mb:account-changed'));channel?.postMessage('refresh');}
function updateUser(next,token,clearDrafts=false){
 const changed=(user?.id||null)!==(next?.id||null);user=next;csrf=token;ready=true;
 if(changed){epoch++;records=[];total=0;pendingIDs.clear();if(clearDrafts){el('journal-input').value='';el('gratitude-input').value='';}window.dispatchEvent(new CustomEvent('mb:account-changed'));}
 if(!user){priorI18n();}paint();
}
function view(){
 title.textContent=C().title;identity.textContent=user?C().account+' '+user.username:C().guest;note.textContent=C().note;
 userText.textContent=C().username;passText.textContent=C().password;currentText.textContent=C().current;newText.textContent=C().newPassword;summary.textContent=C().manage;
 form.hidden=!!user;actions.hidden=!user;manage.hidden=!user;status.textContent=C()[message]||C().error;
 panel.querySelectorAll('button[data-key]').forEach(b=>{b.textContent=C()[b.dataset.key];b.disabled=busy||!ready;});
 more.hidden=!user||records.length>=total;more.disabled=busy||loading;count.hidden=!user;count.textContent=user?`${C().count}: ${records.length}/${total}`:'';
 TYPES.forEach(t=>{el('mb-privacy-'+t).textContent=user?C().server:C().local;if(user)el('mb-summary-'+t).textContent=C().history;});
}
function paint(){
 if(user)TYPES.forEach(type=>{
  const list=el('mb-list-'+type);list.replaceChildren();const matching=records.filter(e=>e.type===type);
  if(!matching.length){const li=node('li');li.textContent=C().empty;list.append(li);}
  matching.forEach(e=>{const li=node('li'),date=node('time'),text=node('p'),del=btn('', 'del',()=>deleteEntry(e.id));date.dateTime=e.at;date.textContent=new Date(e.at).toLocaleString(curLang);text.className='mb-entry-text';text.textContent=e.text;del.textContent=C().del;del.className='mb-delete';li.append(date,text,del);list.append(li);});
 });view();
}
function recordStatus(type,text){const ids={journal:'journal-status',gratitude:'gratitude-status',mood:'mood-feedback'};el(ids[type]).textContent=text;el(ids[type]).style.opacity='1';}
function errorKey(e){return ({invalid_credentials:'credentials',username_unavailable:'unavailable',invalid_request:'invalid',csrf_required:'csrf',auth_rate_limit:'rate',storage_unavailable:'storage',not_authenticated:'auth',entry_limit:'limit'})[e.code]||'error';}
async function api(path,body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const options={credentials:'same-origin',cache:'no-store',signal:controller.signal};
  if(body!==undefined){options.method='POST';options.headers={'Content-Type':'application/json','X-MindBridge-Client':'v5'};if(csrf)options.headers['X-CSRF-Token']=csrf;options.body=JSON.stringify(body);}
  const response=await fetch(path,options),data=await response.json();if(!response.ok){const e=new Error('Request failed');e.code=data.error?.code;e.status=response.status;throw e;}return data;
 }finally{clearTimeout(timeout);}
}
async function refreshSession(){
 if(location.protocol==='file:'){ready=true;message='file';view();return;}
 if(busy){queuedRefresh=true;return;}const own=epoch;message='busy';view();
 try{const data=await api('/api/auth/me');if(own!==epoch||busy)return;updateUser(data.user,data.csrf,true);message=user?'ready':'guestReady';if(user)await loadRecords();}
 catch(e){if(own===epoch){ready=true;message=errorKey(e);}}
 finally{view();}
}
async function authenticate(action){
 if(busy)return;if(!form.reportValidity())return;busy=true;message='busy';view();
 try{const data=await api('/api/auth/'+action,{username:username.value,password:password.value});password.value='';updateUser(data.user,data.csrf,true);message='ready';announce();await loadRecords();}
 catch(e){message=errorKey(e);password.value='';}
 finally{busy=false;view();if(queuedRefresh){queuedRefresh=false;refreshSession();}}
}
async function logoutAccount(){
 if(busy)return;busy=true;message='busy';view();
 try{await api('/api/auth/logout',{});updateUser(null,null,true);message='guestReady';announce();}
 catch(e){message=errorKey(e);}
 finally{busy=false;view();if(queuedRefresh){queuedRefresh=false;refreshSession();}}
}
async function loadRecords(append=false){
 if(!user)return;const own=epoch,sequence=++loadSequence;loading=true;
 try{const data=await api('/api/entries?limit=100&offset='+(append?records.length:0));if(own!==epoch||sequence!==loadSequence)return;
  if(data.user_id!==user.id){const e=new Error('Session changed');e.code='csrf_required';throw e;}
  if(!Array.isArray(data.entries)||!Number.isInteger(data.total)||data.entries.some(e=>!e||typeof e.id!=='string'||!TYPES.includes(e.type)||typeof e.text!=='string'||!Number.isFinite(Date.parse(e.at))))throw Error('Invalid entries');
  records=append?[...records,...data.entries.filter(e=>!records.some(r=>r.id===e.id))]:data.entries;total=data.total;paint();
 }catch(e){if(own===epoch){message=errorKey(e);if(e.code==='not_authenticated')updateUser(null,null);}}
 finally{if(sequence===loadSequence)loading=false;view();}
}
async function saveAccount(type,value,success){
 if(!ready||busy||mutating){recordStatus(type,C().busy);return;}
 if(!user){guestSave[type](value);view();return;}
 const text=type==='mood'?value.textContent.trim():value.value.trim();if(!text){recordStatus(type,C().invalid);return;}
 const own=epoch,signature=type+'\n'+text;const client_id=pendingIDs.get(signature)||crypto.randomUUID();pendingIDs.set(signature,client_id);mutating=true;
 try{await api('/api/entries',{client_id,type,text});if(own!==epoch)return;pendingIDs.delete(signature);success();await loadRecords();recordStatus(type,C().saved);}
 catch(e){if(own===epoch){if(e.code==='not_authenticated'){updateUser(null,null);message='auth';}recordStatus(type,C()[errorKey(e)]);}}
 finally{mutating=false;view();}
}
window.saveJournal=()=>saveAccount('journal',el('journal-input'),()=>{el('journal-input').value='';});
window.saveGratitude=()=>saveAccount('gratitude',el('gratitude-input'),()=>{el('gratitude-input').value='';});
window.selectMood=b=>saveAccount('mood',b,()=>document.querySelectorAll('.mood-btn').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));}));
async function deleteEntry(id){
 if(mutating||busy||!window.confirm(C().confirmEntry))return;const own=epoch;mutating=true;
 try{await api('/api/entries/'+encodeURIComponent(id)+'/delete',{});if(own===epoch)await loadRecords();}
 catch(e){if(own===epoch)message=errorKey(e);}
 finally{mutating=false;view();}
}
async function importGuest(){
 if(busy||!user)return;let source;
 try{source=JSON.parse(localStorage.getItem('mindbridge.entries.v2')||'{"version":2,"entries":[]}');if(source.version!==2||!Array.isArray(source.entries))throw Error('Bad guest data');}
 catch(_){message='badGuest';view();return;}
 if(!source.entries.length){message='noGuest';view();return;}
 // Explicit action; originals are never deleted, retries use original stable IDs.
 const own=epoch;busy=true;message='busy';view();
 try{
  let batch=[],size=0;
  async function send(){if(batch.length){await api('/api/entries/import',{entries:batch});batch=[];size=0;}}
  for(const e of source.entries){if(!e||typeof e.text!=='string'||typeof e.id!=='string')throw Error('Bad guest entry');if(batch.length>=50||size+e.text.length>50000)await send();batch.push({client_id:e.id,type:e.type,text:e.text,at:e.at});size+=e.text.length;}
  await send();if(own===epoch){message='imported';await loadRecords();}
 }catch(e){if(own===epoch)message=errorKey(e);}
 finally{busy=false;view();if(queuedRefresh){queuedRefresh=false;refreshSession();}}
}
async function exportAccount(){
 if(busy||!user)return;const own=epoch;busy=true;view();
 try{const data=await api('/api/account/export');if(own!==epoch)return;if(data.user_id!==user.id)throw Error('Session changed');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='mindbridge-account.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 catch(e){if(own===epoch)message=errorKey(e);}
 finally{busy=false;view();if(queuedRefresh){queuedRefresh=false;refreshSession();}}
}
async function manageAccount(deleting){
 if(busy||!user)return;if(!current.value||(!deleting&&(newPassword.value.length<12||newPassword.value.length>128))){message='invalid';view();return;}if(deleting&&!window.confirm(C().confirm))return;
 busy=true;message='busy';view();
 try{await api('/api/auth/'+(deleting?'delete':'password'),deleting?{password:current.value}:{password:current.value,new_password:newPassword.value});updateUser(null,null,true);message=deleting?'deleted':'changed';announce();}
 catch(e){message=errorKey(e);}
 finally{current.value='';newPassword.value='';busy=false;view();if(queuedRefresh){queuedRefresh=false;refreshSession();}}
}
window.applyI18n=function(){priorI18n();paint();};
window.addEventListener('storage',()=>{if(user)paint();});window.addEventListener('focus',()=>refreshSession());channel?.addEventListener('message',()=>refreshSession());
view();refreshSession();
})();
