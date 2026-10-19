/* Editable messages for asking someone for support (Contact page).
   Nothing is sent, stored or uploaded: the text exists only in this open page until the person
   copies it or, if their device offers it, presses Share. No contacts are read. */
(() => {
'use strict';
const COPY={
 en:{title:'Ask someone for support',intro:'Choose who you want to ask and how it should sound, then change the words so they are yours. Nothing is sent from here.',who:'Who are you asking?',tone:'How should it sound?',message:'Your message (you can edit it)',copy:'Copy message',share:'Share…',reset:'Reset to template',copied:'Copied. Paste it into your own messaging app.',failed:'Could not copy automatically. Select the text and copy it yourself.',kept:'Your edits are kept. Use “Reset to template” to start from the template again.',limits:'This is a template, not advice. It does not contact anyone or notify any service. If you may be in immediate danger, use your local emergency number.',
  audiences:['A friend','A mentor or teacher','A university service','A professional'],tones:['Warm','Direct','Brief'],
  opener:['Hi,','Hello,','Hello, I would like to ask about support.','Hello, I would like to ask about an appointment.'],
  core:['I’m having a difficult week and would really appreciate some time to talk.','I’m struggling at the moment and need some support. Could we talk this week?','Could we talk soon? It’s about how I’m doing.'],
  closer:['No pressure, whenever suits you.','Thank you for taking the time.','Thank you, I appreciate your help.','Please let me know what the next step would be.']},
 tr:{title:'Birinden destek iste',intro:'Kime yazmak istediğini ve nasıl bir üslup istediğini seç, sonra sözcükleri kendine göre değiştir. Buradan hiçbir şey gönderilmez.',who:'Kimden destek istiyorsun?',tone:'Nasıl bir üslup olsun?',message:'Mesajın (düzenleyebilirsin)',copy:'Mesajı kopyala',share:'Paylaş…',reset:'Şablona dön',copied:'Kopyalandı. Kendi mesajlaşma uygulamana yapıştır.',failed:'Otomatik kopyalanamadı. Metni seçip kendin kopyala.',kept:'Düzenlemelerin korunuyor. Şablondan yeniden başlamak için “Şablona dön”ü kullan.',limits:'Bu bir şablondur, tavsiye değildir. Kimseyle iletişime geçmez, hiçbir hizmeti haberdar etmez. Acil tehlikedeysen yerel acil numaranı ara.',
  audiences:['Bir arkadaş','Bir mentor veya öğretmen','Bir üniversite birimi','Bir uzman'],tones:['Sıcak','Doğrudan','Kısa'],
  opener:['Merhaba,','Merhaba,','Merhaba, destek konusunda bilgi almak istiyorum.','Merhaba, randevu konusunda bilgi almak istiyorum.'],
  core:['Zor bir hafta geçiriyorum ve konuşmak için biraz zamanın olursa çok sevinirim.','Şu an zorlanıyorum ve desteğe ihtiyacım var. Bu hafta konuşabilir miyiz?','Yakında konuşabilir miyiz? Nasıl olduğumla ilgili.'],
  closer:['Acelesi yok, sana uygun olduğunda.','Zaman ayırdığın için teşekkürler.','Teşekkürler, yardımın için minnettarım.','Bir sonraki adımın ne olacağını bildirir misin?']},
 de:{title:'Jemanden um Unterstützung bitten',intro:'Wähle, wen du fragen möchtest und wie es klingen soll, und ändere die Worte, bis sie zu dir passen. Von hier wird nichts gesendet.',who:'Wen fragst du?',tone:'Wie soll es klingen?',message:'Deine Nachricht (du kannst sie ändern)',copy:'Nachricht kopieren',share:'Teilen…',reset:'Zur Vorlage zurück',copied:'Kopiert. Füge sie in deine eigene Nachrichten-App ein.',failed:'Automatisches Kopieren nicht möglich. Markiere den Text und kopiere ihn selbst.',kept:'Deine Änderungen bleiben erhalten. Mit „Zur Vorlage zurück“ beginnst du neu.',limits:'Das ist eine Vorlage, kein Rat. Sie kontaktiert niemanden und benachrichtigt keinen Dienst. Bei akuter Gefahr nutze den örtlichen Notruf.',
  audiences:['Eine Freundin / ein Freund','Mentor*in oder Lehrkraft','Eine Hochschulstelle','Fachperson'],tones:['Warm','Direkt','Kurz'],
  opener:['Hallo,','Guten Tag,','Guten Tag, ich möchte nach Unterstützung fragen.','Guten Tag, ich möchte nach einem Termin fragen.'],
  core:['Ich habe gerade eine schwere Woche und würde mich freuen, wenn du Zeit zum Reden hättest.','Ich komme im Moment schlecht zurecht und brauche Unterstützung. Können wir diese Woche sprechen?','Können wir bald sprechen? Es geht darum, wie es mir geht.'],
  closer:['Kein Druck, wann immer es passt.','Danke, dass du dir Zeit nimmst.','Danke, ich schätze Ihre Hilfe.','Bitte teilen Sie mir den nächsten Schritt mit.']},
 es:{title:'Pide apoyo a alguien',intro:'Elige a quién quieres preguntar y cómo debe sonar, y cambia las palabras hasta que sean tuyas. Desde aquí no se envía nada.',who:'¿A quién se lo pides?',tone:'¿Cómo debe sonar?',message:'Tu mensaje (puedes editarlo)',copy:'Copiar mensaje',share:'Compartir…',reset:'Volver a la plantilla',copied:'Copiado. Pégalo en tu propia aplicación de mensajes.',failed:'No se pudo copiar automáticamente. Selecciona el texto y cópialo tú.',kept:'Tus cambios se conservan. Usa «Volver a la plantilla» para empezar de nuevo.',limits:'Es una plantilla, no un consejo. No contacta a nadie ni avisa a ningún servicio. Si estás en peligro inmediato, usa el número de emergencias local.',
  audiences:['Un amigo o amiga','Un mentor o profesor','Un servicio universitario','Un profesional'],tones:['Cálido','Directo','Breve'],
  opener:['Hola,','Hola,','Hola, quisiera preguntar por apoyo.','Hola, quisiera preguntar por una cita.'],
  core:['Estoy teniendo una semana difícil y me vendría bien hablar un rato contigo.','Ahora mismo lo estoy pasando mal y necesito apoyo. ¿Podemos hablar esta semana?','¿Podemos hablar pronto? Es sobre cómo estoy.'],
  closer:['Sin presión, cuando te venga bien.','Gracias por tu tiempo.','Gracias, agradezco tu ayuda.','Avísame cuál sería el siguiente paso.']}
};
const C=()=>COPY[curLang]||COPY.en;
const page=document.getElementById('page-contact');
if(!page)return;
function node(tag,cls,id){const n=document.createElement(tag);if(cls)n.className=cls;if(id)n.id=id;return n;}
const section=node('section','mb-ask','mb-ask-help');section.setAttribute('aria-labelledby','mb-ask-title');
const title=node('h2','','mb-ask-title'),intro=node('p','mb-ask-intro');
const whoLabel=node('label'),whoText=node('span'),who=node('select','','mb-ask-who');whoLabel.append(whoText,who);
const toneLabel=node('label'),toneText=node('span'),tone=node('select','','mb-ask-tone');toneLabel.append(toneText,tone);
const msgLabel=node('label'),msgText=node('span'),msg=node('textarea','','mb-ask-message');msg.rows=6;msg.maxLength=1000;msgLabel.append(msgText,msg);
const row=node('div','mb-ask-actions');
const copy=node('button','btn-solid','mb-ask-copy'),share=node('button','btn-outline','mb-ask-share'),reset=node('button','btn-outline','mb-ask-reset');
for(const b of [copy,share,reset])b.type='button';
share.hidden=typeof navigator==='undefined'||typeof navigator.share!=='function';
const status=node('p','mb-ask-status','mb-ask-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const limits=node('p','mb-ask-limits');
row.append(copy,share,reset);section.append(title,intro,whoLabel,toneLabel,msgLabel,row,status,limits);
const grid=page.querySelector('.contact-grid');if(grid)grid.before(section);else page.append(section);
for(let i=0;i<4;i++)who.append(node('option'));for(let i=0;i<3;i++)tone.append(node('option'));
let dirty=false;
const template=()=>{const c=C(),a=Number(who.value)||0,t=Number(tone.value)||0;return c.opener[a]+' '+c.core[t]+' '+c.closer[a];};
function labels(){const c=C();title.textContent=c.title;intro.textContent=c.intro;whoText.textContent=c.who;toneText.textContent=c.tone;msgText.textContent=c.message;
 copy.textContent=c.copy;share.textContent=c.share;reset.textContent=c.reset;limits.textContent=c.limits;
 Array.from(who.children).forEach((o,i)=>{o.value=String(i);o.textContent=c.audiences[i];});Array.from(tone.children).forEach((o,i)=>{o.value=String(i);o.textContent=c.tones[i];});}
function fill(){if(!dirty){msg.value=template();status.textContent='';}else status.textContent=C().kept;}
msg.addEventListener('input',()=>{dirty=msg.value!==template();status.textContent='';});
who.addEventListener('change',fill);tone.addEventListener('change',fill);
reset.addEventListener('click',()=>{dirty=false;msg.value=template();status.textContent='';});
copy.addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(msg.value);status.textContent=C().copied;}
 catch(e){status.textContent=C().failed;}
});
share.addEventListener('click',async()=>{try{await navigator.share({text:msg.value});}catch(e){/* cancelled by the person: not an error */}});
// A language change re-labels the controls and re-translates the template unless the person edited it.
const previousI18n=window.applyI18n;window.applyI18n=function(){previousI18n();const keep=dirty,text=msg.value;labels();if(keep)msg.value=text;else msg.value=template();};
window.addEventListener('mb:account-changed',()=>{dirty=false;labels();msg.value=template();status.textContent='';});
window.addEventListener('pagehide',()=>{dirty=false;msg.value='';});
labels();msg.value=template();
})();
