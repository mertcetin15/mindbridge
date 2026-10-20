/* Navigation that behaves like a connected site: the browser Back and Forward buttons move between the site's pages
   and a page can be opened by its address (#/library). Unknown addresses are ignored. No page content is put in the address. */
(() => {
'use strict';
const J=window.MBJourney;if(!J)return;
let applying=false,current=null;
function go(page){if(typeof window.showPage==='function')window.showPage(page);}
function remember(page,replace){
 try{const url=J.hashFor(page);if(replace)history.replaceState({mb:page},'',url);else history.pushState({mb:page},'',url);}catch(error){/* file:// or blocked: the site works without addresses */}
}
const previousShow=window.showPage;
window.showPage=function(id){
 const result=previousShow(id);
 if(J.known(id)&&!applying&&id!==current){remember(id,current===null);}
 if(J.known(id))current=id;
 return result;
};
window.addEventListener('popstate',event=>{
 const page=(event.state&&event.state.mb)||J.routeFromHash(location.hash);
 // A plain in-page anchor (the skip link, #main-content) also fires popstate. It is not one of our pages: leave the page alone.
 if(!page)return;
 applying=true;try{go(page);}finally{applying=false;}
 current=page;
});
const start=J.routeFromHash(location.hash);
if(start&&start!=='home'){go(start);}else{current='home';remember('home',true);}
})();
