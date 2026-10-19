/* Stage 4: bounded, ephemeral conversation. No API keys or persistent chat store. */
(() => {
'use strict';
const el=id=>document.getElementById(id),container=document.querySelector('#page-chat .chat-container');
const input=el('chat-input-box'),history=el('chat-history'),send=document.querySelector('#page-chat button[data-mb-click="sendChatMessage()"]');
const COPY={
en:{title:"Reflection chat",sub:"A place to think aloud. AI can make mistakes; this is not therapy.",ai:"AI",mode:'Chat mode',consent:'I understand that my message and recent conversation are sent to Groq in AI mode. Avoid identifying or sensitive details. Provider data policies apply; this is not a promise of zero retention.',welcome:"What is on your mind?",send:'Send',cancel:'Cancel',clear:'Clear chat',refresh:'Check connection',checking:'Checking connection…',received:'AI response received.',available:'AI configured; live response not yet verified.',unavailable:"AI unavailable. The server connection needs configuring.",waiting:'Waiting for a response…',cancelled:'Cancelled. Your draft is kept. A request already sent may still be processed by the server.',timeout:'No response in time. Your draft is kept; try again.',failure:'Could not get a response. Your draft is kept; try again.',required:'Please accept the AI data notice before sending.',long:'Use no more than 2,000 characters.',empty:'Write a message first.',rate:'Too many requests. Wait a minute before trying again.',quota:'You have used today’s AI replies for this account. The limit protects shared capacity; it resets within 24 hours. Everything else in MindBridge still works.',auth:'Groq rejected the key or model access. Check your local key and account permissions.',invalid:'The server returned an invalid response.',ailabel:'AI response',safetylabel:'Human support information',privacy:'Chat is kept only in this open page. Clear chat or reload to remove it here. Clearing cannot recall messages already sent to a provider.',help:'Germany: immediate danger 112; TelefonSeelsorge 116 123 (German). Elsewhere: local emergency services. Keyword detection may miss risk; do not rely on this chat in a crisis.',clearDone:'Chat cleared.',limit:'Up to the most recent 10 exchanges are sent; older context is dropped to fit the size limit.'},
tr:{title:"Birlikte düşün",sub:"Düşüncelerini toparla. AI hata yapabilir; bu bir terapi hizmeti değildir.",ai:"AI",mode:'Sohbet modu',consent:'AI modunda mesajımın ve yakın sohbet geçmişimin Groq’ye gönderildiğini anlıyorum. Kimlik belirten veya hassas ayrıntılardan kaçın. Sağlayıcının veri politikaları geçerlidir; sıfır saklama garantisi yoktur.',welcome:"Aklında ne var?",send:'Gönder',cancel:'İptal',clear:'Sohbeti temizle',refresh:'Bağlantıyı kontrol et',checking:'Bağlantı kontrol ediliyor…',received:'AI yanıtı alındı.',available:'AI yapılandırılmış; canlı yanıt henüz doğrulanmadı.',unavailable:"AI kullanılamıyor. Sunucu bağlantısının ayarlanması gerekiyor.",waiting:'Yanıt bekleniyor…',cancelled:'İptal edildi. Taslağın korundu. Gönderilmiş istek sunucuda hâlâ işlenebilir.',timeout:'Zamanında yanıt gelmedi. Taslağın korundu; yeniden dene.',failure:'Yanıt alınamadı. Taslağın korundu; yeniden dene.',required:'Göndermeden önce AI veri açıklamasını onayla.',long:'En fazla 2.000 karakter kullan.',empty:'Önce bir mesaj yaz.',rate:'Çok fazla istek gönderildi. Yeniden denemeden önce bir dakika bekle.',quota:'Bu hesabın bugünkü AI yanıt hakkı doldu. Sınır ortak kapasiteyi korur; 24 saat içinde yenilenir. MindBridge’in geri kalanı çalışmaya devam eder.',auth:'Groq anahtarı veya model erişimini kabul etmedi. Yerel anahtarını ve hesap izinlerini kontrol et.',invalid:'Sunucu geçersiz bir yanıt döndürdü.',ailabel:'AI yanıtı',safetylabel:'İnsan desteği bilgisi',privacy:'Sohbet yalnızca bu açık sayfada tutulur. Buradan silmek için sohbeti temizle veya sayfayı yenile. Temizleme, sağlayıcıya gönderilmiş mesajları geri çekmez.',help:'Almanya: acil tehlikede 112; TelefonSeelsorge 116 123 (Almanca). Başka ülkelerde yerel acil yardım. Anahtar kelime kontrolü riskleri kaçırabilir; krizde bu sohbete güvenme.',clearDone:'Sohbet temizlendi.',limit:'En fazla son 10 konuşma çifti gönderilir; boyut sınırını aşmamak için eski bağlam çıkarılır.'},
de:{title:"Reflexionschat",sub:"Gedanken ordnen. KI kann Fehler machen; dies ist keine Therapie.",ai:"KI",mode:'Chatmodus',consent:'Ich verstehe, dass meine Nachricht und der jüngste Chatverlauf im KI-Modus an Groq gesendet werden. Vermeide identifizierende oder sensible Details. Es gelten die Datenrichtlinien des Anbieters; keine Zusage einer Nullspeicherung.',welcome:"Was beschäftigt dich?",send:'Senden',cancel:'Abbrechen',clear:'Chat löschen',refresh:'Verbindung prüfen',checking:'Verbindung wird geprüft…',received:'KI-Antwort erhalten.',available:'KI konfiguriert; Live-Antwort noch nicht überprüft.',unavailable:"KI nicht verfügbar. Die Serververbindung muss eingerichtet werden.",waiting:'Warte auf eine Antwort…',cancelled:'Abgebrochen. Dein Entwurf bleibt erhalten. Eine gesendete Anfrage kann weiter verarbeitet werden.',timeout:'Zeitüberschreitung. Dein Entwurf bleibt erhalten; versuche es erneut.',failure:'Keine Antwort erhalten. Dein Entwurf bleibt erhalten; versuche es erneut.',required:'Bestätige vor dem Senden den KI-Datenhinweis.',long:'Verwende höchstens 2.000 Zeichen.',empty:'Schreibe zuerst eine Nachricht.',rate:'Zu viele Anfragen. Warte eine Minute.',quota:'Die heutigen KI-Antworten für dieses Konto sind aufgebraucht. Das Limit schützt die gemeinsame Kapazität und wird innerhalb von 24 Stunden zurückgesetzt. Alles andere in MindBridge funktioniert weiter.',auth:'Groq hat den Schlüssel oder Modellzugriff abgelehnt. Prüfe Schlüssel und Berechtigungen.',invalid:'Ungültige Antwort vom Server.',ailabel:'KI-Antwort',safetylabel:'Informationen zu menschlicher Hilfe',privacy:'Der Chat bleibt nur auf dieser geöffneten Seite. Lösche ihn oder lade neu, um ihn hier zu entfernen. Bereits gesendete Nachrichten können nicht zurückgerufen werden.',help:'Deutschland: 112 bei unmittelbarer Gefahr; TelefonSeelsorge 116 123. Anderswo: örtlicher Notruf. Stichworterkennung kann Risiken übersehen; verlasse dich in einer Krise nicht auf diesen Chat.',clearDone:'Chat gelöscht.',limit:'Höchstens die letzten 10 Gesprächspaare werden gesendet; älterer Kontext wird bei Überschreiten der Größenbegrenzung entfernt.'},
es:{title:"Reflexión",sub:"Ordena tus ideas. La IA puede equivocarse; esto no es terapia.",ai:"IA",mode:'Modo de chat',consent:'Entiendo que mi mensaje y el historial reciente se envían a Groq en modo IA. Evita detalles identificativos o sensibles. Se aplican las políticas del proveedor; no hay garantía de retención cero.',welcome:"¿Qué tienes en mente?",send:'Enviar',cancel:'Cancelar',clear:'Borrar chat',refresh:'Comprobar conexión',checking:'Comprobando conexión…',received:'Respuesta de IA recibida.',available:'IA configurada; respuesta real aún no verificada.',unavailable:"IA no disponible. Hay que configurar la conexión del servidor.",waiting:'Esperando respuesta…',cancelled:'Cancelado. Se conserva tu borrador. Una solicitud enviada puede seguir procesándose.',timeout:'Tiempo de espera agotado. Se conserva tu borrador; inténtalo de nuevo.',failure:'No se obtuvo respuesta. Se conserva tu borrador; inténtalo de nuevo.',required:'Acepta el aviso de datos antes de enviar.',long:'Usa como máximo 2.000 caracteres.',empty:'Escribe primero un mensaje.',rate:'Demasiadas solicitudes. Espera un minuto.',quota:'Se agotaron las respuestas de IA de hoy para esta cuenta. El límite protege la capacidad compartida y se restablece en 24 horas. Todo lo demás en MindBridge sigue funcionando.',auth:'Groq rechazó la clave o el acceso al modelo. Revisa la clave y los permisos.',invalid:'El servidor devolvió una respuesta inválida.',ailabel:'Respuesta de IA',safetylabel:'Información de ayuda humana',privacy:'El chat solo permanece en esta página abierta. Bórralo o recarga para quitarlo aquí. Borrar no retira mensajes ya enviados al proveedor.',help:'Alemania: 112 ante peligro inmediato; TelefonSeelsorge 116 123 (alemán). Fuera: emergencias locales. La detección por palabras puede omitir riesgos; no dependas de este chat en una crisis.',clearDone:'Chat borrado.',limit:'Se envían como máximo los últimos 10 intercambios; se elimina contexto antiguo para cumplir el límite de tamaño.'}
};
const LOGIN={en:'Sign in from Tools before using AI, then try again.',tr:'AI kullanmadan önce Araçlar bölümünden hesabına giriş yap, sonra yeniden dene.',de:'Melde dich unter Tools an und versuche es erneut.',es:'Inicia sesión en Herramientas y vuelve a intentarlo.'};
Object.keys(LOGIN).forEach(lang=>COPY[lang].login=LOGIN[lang]);
const C=()=>COPY[curLang]||COPY.en;
const SAFETY=__SAFETY_DATA__;
const risk=new RegExp(SAFETY.pattern,'iu'),softRisk=new RegExp(SAFETY.soft_pattern,'iu');
// Same normalisation the server applies, so zero-width characters or full-width letters cannot hide a phrase.
const normalizeRisk=s=>s.normalize('NFKC').replace(/[​-‍⁠﻿­]/g,'').replace(/\s+/g,' ');
let conversation=[],mode='ai',busy=false,available=false,requiresLogin=false,statusKey='unavailable',generation=0,pending=null,healthSequence=0;
function make(tag,id){const node=document.createElement(tag);if(id)node.id=id;return node;}
const controls=make('div','mb-chat-controls');controls.className='mb-chat-controls';
const modeLabel=make('label'),modeText=make('span'),select=make('select','mb-chat-mode');modeLabel.htmlFor=select.id;
for(const value of ['ai']){const option=make('option');option.value=value;select.append(option);}modeLabel.append(modeText,select);
const clear=make('button','mb-chat-clear'),refresh=make('button','mb-chat-refresh');[clear,refresh].forEach(b=>{b.type='button';b.className='btn-outline';});controls.append(clear,refresh);container.prepend(controls);
const notice=make('label','mb-chat-notice'),consent=make('input','mb-chat-consent'),consentText=make('span');consent.type='checkbox';notice.className='mb-chat-notice';notice.append(consent,consentText);controls.after(notice);
const status=make('p','mb-chat-status'),privacy=make('p','mb-chat-privacy'),help=make('p','mb-chat-help'),limit=make('p','mb-chat-limit');[status,privacy,help,limit].forEach(n=>n.className='mb-chat-note');status.setAttribute('role','status');status.setAttribute('aria-live','polite');notice.after(status,privacy,help,limit);
const cancel=make('button','mb-chat-cancel');cancel.type='button';cancel.className='btn-outline';send.after(cancel);
send.removeAttribute('data-i18n');input.removeAttribute('onkeypress');input.maxLength=2000;input.setAttribute('aria-label','Message');history.setAttribute('role','log');history.setAttribute('aria-live','polite');history.setAttribute('aria-relevant','additions');
function paintMessages(){
 history.replaceChildren();
 if(!conversation.length){const greeting=make('div');greeting.className='chat-msg msg-ai';greeting.textContent=C().welcome;history.append(greeting);}
 for(const message of conversation){
  const box=make('div');box.className='chat-msg '+(message.role==='user'?'msg-user':'msg-ai');
  if(message.role==='assistant'){const label=make('small');label.className='mb-chat-source';label.textContent=C()[message.source==='ai'?'ailabel':'safetylabel'];box.append(label);}
  const body=make('span');body.textContent=message.content;box.append(body);history.append(box);
 }
 history.scrollTop=history.scrollHeight;
}
function view(){
 select.value=mode;select.options[0].textContent=C().ai;modeText.textContent=C().mode;
 select.disabled=busy;clear.textContent=C().clear;refresh.textContent=C().refresh;refresh.disabled=busy;
 notice.hidden=mode!=='ai';consent.disabled=busy;consentText.textContent=C().consent;
 send.textContent=C().send;send.disabled=busy;input.disabled=busy;send.setAttribute('aria-busy',String(busy));input.setAttribute('aria-busy',String(busy));cancel.textContent=C().cancel;cancel.hidden=!busy;
 status.textContent=C()[statusKey]||C().failure;privacy.textContent=C().privacy;help.textContent=C().help;limit.textContent=C().limit;
 document.querySelector('[data-i18n-html="chat.title"]').textContent=C().title;document.querySelector('[data-i18n="chat.sub"]').textContent=C().sub;
 document.querySelector('[data-i18n="chat.badge"]').textContent=available?C().ai:C().unavailable;
}
function stop(key='cancelled'){generation++;if(pending){clearTimeout(pending.timeout);pending.controller.abort();pending=null;}busy=false;statusKey=key;view();}
function clearChat(){stop('clearDone');conversation=[];input.value='';consent.checked=false;paintMessages();input.focus();}
function contextFor(text){
 let messages=conversation.slice(-20).map(({role,content})=>({role,content}));messages.push({role:'user',content:text});
 while(messages.reduce((n,m)=>n+m.content.length,0)>12000&&messages.length>1)messages.splice(0,2);
 return messages;
}
async function checkConnection(){
 if(location.protocol==='file:'){available=false;statusKey='unavailable';view();return;}
 const ownGeneration=generation,sequence=++healthSequence;statusKey='checking';view();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
 try{const response=await fetch('/api/health',{signal:controller.signal,cache:'no-store',credentials:'same-origin'});const data=await response.json();if(ownGeneration!==generation||sequence!==healthSequence||busy)return;requiresLogin=data.ai_requires_login===true;available=response.ok&&data.version==='4.0.0'&&data.ai_configured===true;statusKey=available?'available':'unavailable';}
 catch(_){if(ownGeneration!==generation||sequence!==healthSequence||busy)return;available=false;statusKey='unavailable';}
 finally{clearTimeout(timeout);if(ownGeneration===generation&&sequence===healthSequence&&!busy)view();}
}
window.sendChatMessage=async()=>{
 if(busy)return;const text=input.value.trim(),language=curLang;
 if(!text){statusKey='empty';view();return;}if(text.length>2000){statusKey='long';view();return;}
 // Local human-help shortcut is available even without a provider or consent.
 const checked=normalizeRisk(text);
 if(risk.test(checked)){
  conversation.push({role:'user',content:text},{role:'assistant',content:SAFETY.crisis[language]||SAFETY.crisis.en,source:'safety'});
  conversation=conversation.slice(-40);input.value='';statusKey=available?'available':'unavailable';paintMessages();view();return;
 }
 // Indirect distress without consent or a provider: a gentle support note instead of a dead-end error.
 if(softRisk.test(checked)&&(!consent.checked||!available)){
  conversation.push({role:'user',content:text},{role:'assistant',content:SAFETY.support[language]||SAFETY.support.en,source:'safety'});
  conversation=conversation.slice(-40);input.value='';statusKey=available?'available':'unavailable';paintMessages();view();return;
 }
 if(!consent.checked){statusKey='required';view();return;}if(!available){statusKey='unavailable';view();return;}
 const ownGeneration=++generation,controller=new AbortController();let timedOut=false;
 const timeout=setTimeout(()=>{timedOut=true;controller.abort();},32000);pending={controller,timeout};busy=true;statusKey='waiting';view();
 try{
  const headers={'Content-Type':'application/json','X-MindBridge-Client':'v4'};
  if(requiresLogin){
   const session=await fetch('/api/auth/me',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
   const account=await session.json();if(ownGeneration!==generation)return;
   if(!session.ok||!account.user||!account.csrf){statusKey='login';return;}
   headers['X-CSRF-Token']=account.csrf;
  }
  const response=await fetch('/api/chat',{method:'POST',headers,credentials:'same-origin',signal:controller.signal,body:JSON.stringify({mode:'ai',language,consent:true,messages:contextFor(text)})});
  const data=await response.json();if(ownGeneration!==generation)return;
  if(!response.ok){statusKey=response.status===401||data.error?.code==='csrf_required'?'login':data.error?.code==='ai_quota'?'quota':response.status===429?'rate':(data.error?.code==='ai_not_configured'||data.error?.code==='ai_disabled')?'unavailable':data.error?.code==='consent_required'?'required':data.error?.code==='provider_auth_error'?'auth':'failure';if(statusKey==='unavailable')available=false;return;}
  if(typeof data.reply!=='string'||!data.reply.trim()||data.reply.length>6000||!['ai','safety'].includes(data.source)){statusKey='invalid';return;}
  conversation.push({role:'user',content:text},{role:'assistant',content:data.reply,source:data.source});conversation=conversation.slice(-40);input.value='';statusKey='received';paintMessages();
 }catch(_){if(ownGeneration===generation)statusKey=timedOut?'timeout':'failure';}
 finally{clearTimeout(timeout);if(ownGeneration===generation){pending=null;busy=false;view();input.focus();}}
};
window.handleChatEnter=e=>{if(e.key==='Enter'&&!e.isComposing&&!e.repeat){e.preventDefault();window.sendChatMessage();}};input.addEventListener('keydown',window.handleChatEnter);
cancel.addEventListener('click',()=>stop());clear.addEventListener('click',clearChat);refresh.addEventListener('click',checkConnection);
select.addEventListener('change',()=>{mode=select.value;clearChat();statusKey=available?'available':'unavailable';view();});
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();view();paintMessages();};
// Prevent the legacy greeting renderer from overwriting the controlled conversation.
window.renderChatGreeting=paintMessages;
const previousPage=window.showPage;window.showPage=function(id){if(id!=='chat'&&busy)stop();return previousPage(id);};
window.addEventListener('pagehide',()=>{stop();conversation=[];input.value='';consent.checked=false;paintMessages();});
window.addEventListener('mb:account-changed',clearChat);
paintMessages();view();checkConnection();
})();
