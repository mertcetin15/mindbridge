/* Event-driven scroll motion. No perpetual RAF, timers or wheel interception. */
(function(root){
'use strict';
const clamp=n=>Math.min(1,Math.max(0,n));
function progress(top,height,viewport){return clamp((viewport*.75-top)/Math.max(1,height-viewport*.25));}
function pose(p,compact=false){return {spin:(compact?-8:-18)+p*(compact?210:720),tilt:(compact?0:-18)+p*(compact?0:48),lift:Math.sin(p*Math.PI)*(compact?-10:-24)};}
function controller({request,cancel,read,write}){let frame=null,enabled=true;
 function schedule(){if(!enabled||frame!==null)return;frame=request(()=>{frame=null;if(enabled)write(read());});}
 function setEnabled(value){enabled=value;if(!enabled&&frame!==null){cancel(frame);frame=null;}if(enabled)schedule();}
 return {schedule,setEnabled,destroy(){setEnabled(false);}};
}
const api={progress,pose,controller};root.MBCampusMotion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
