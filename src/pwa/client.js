/* Install/offline layer; lesson code, question data and BE4_ storage keys stay intact. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const isApple=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 let installEvent=null,installedThisSession=false,registration=null,readyOffline=false;
 let lastStatus='',reloadOnChange=false,reloadOffered=false,reloading=false,checking=false,lastCheck=0,saveTimer;
 // Capture browser installation affordances, without interrupting students.
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;renderInstall();});
 window.addEventListener('appinstalled',()=>{installEvent=null;installedThisSession=true;renderInstall();});
 function persistQuietly(){try{window.BoneEmergency?.host?.exportBackup();}catch(e){console.warn('MRU progress checkpoint unavailable.',e);}}
 function renderInstall(){
  if(!$('pwaInstall'))return;
  const installed=standalone()||installedThisSession;
  $('pwaInstall').textContent=installed?'APP OPTIONS':'INSTALL APP';
  $('pwaNativeInstall').hidden=installed||!installEvent;
  $('pwaInstalledNote').hidden=!installed;
 }
 function renderStatus(message){
  if(message)lastStatus=message;
  if(!$('pwaStatus'))return;
  $('pwaStatus').textContent=readyOffline?(navigator.onLine?'OFFLINE READY':'OFFLINE / READY'):lastStatus||'CHECKING OFFLINE ACCESS';
  $('pwaStatus').dataset.ready=String(readyOffline);
  $('pwaDetailStatus').textContent=readyOffline?'Saved on this device; ready to reopen offline.':lastStatus||'Checking...';
 }
 function openOptions(){renderInstall();$('pwaDialog').showModal();refreshOffline();}
 async function install(){
  if(!installEvent||standalone()||installedThisSession){openOptions();return;}
  const event=installEvent;installEvent=null;renderInstall();
  try{await event.prompt();const choice=await event.userChoice;
   $('pwaUpdateMessage').textContent=choice.outcome==='accepted'?'Installation requested. Open MRU from your home screen while connected once to verify offline access.':'Installation dismissed. The game still works in your browser.';
  }catch(_){openOptions();}
 }
 function updateAvailable(){
  const waiting=!!registration?.waiting;
  const yes=waiting||reloadOffered;
  $('pwaUpdateBanner').hidden=!yes;$('pwaDialogUpdate').hidden=!yes;
  $('pwaApplyUpdate').textContent=waiting?'APPLY UPDATE':'RELOAD APP';
  $('pwaDialogUpdate').textContent=waiting?'APPLY UPDATE':'RELOAD APP';
  if(yes)$('pwaUpdateMessage').textContent='A newer copy is ready. Applying it saves your current case and reloads this app. Other open game windows are not forced to reload.';
 }
 function queryWorker(worker,type='MRU_STATUS'){
  return new Promise((resolve,reject)=>{
   if(!worker){reject(new Error('No active worker'));return;}
   const channel=new MessageChannel();
   const timer=setTimeout(()=>{channel.port1.close();reject(new Error('Offline status timed out'));},5000);
   channel.port1.onmessage=e=>{clearTimeout(timer);channel.port1.close();resolve(e.data);};
   worker.postMessage({type},[channel.port2]);
  });
 }
 async function refreshOffline(){
  if(!registration)return;
  try{const worker=registration.active||navigator.serviceWorker.controller;
   let reply=await queryWorker(worker);
   if(reply?.ready===false&&navigator.onLine)reply=await queryWorker(worker,'MRU_REPAIR');
   readyOffline=reply?.type==='MRU_STATUS'&&reply.ready===true;
   renderStatus(readyOffline?'':'OFFLINE COPY NOT READY');
  }catch(_){if(!readyOffline)renderStatus('CHECKING OFFLINE COPY');}
 }
 function watch(worker){
  if(!worker)return;
  worker.addEventListener('statechange',()=>{
   if(worker.state==='installed'){updateAvailable();if(!navigator.serviceWorker.controller)renderStatus('FINISHING OFFLINE SETUP');}
   if(worker.state==='activated'){refreshOffline();updateAvailable();}
   if(worker.state==='redundant'&&!readyOffline){renderStatus('ONLINE PLAY / SETUP INCOMPLETE');$('pwaUpdateMessage').textContent='Offline setup did not complete. Stay connected and choose Check for updates to retry. Verify that all package files were published together.';}
  });
 }
 async function checkUpdates(manual=false){
  if(checking)return;
  if(!navigator.onLine){if(manual)$('pwaUpdateMessage').textContent='You are offline. Your saved game is available; checking for new releases needs a connection.';return;}
  if(!registration){if(manual){$('pwaUpdateMessage').textContent='Trying offline setup again...';await register();}return;}
  checking=true;lastCheck=Date.now();$('pwaCheckUpdate').disabled=true;
  if(manual)$('pwaUpdateMessage').textContent='Checking the published site...';
  try{await registration.update();updateAvailable();await refreshOffline();
   if(manual&&!registration.waiting&&!reloadOffered)$('pwaUpdateMessage').textContent=registration.installing?'A new copy is downloading. Keep this page open until the update is ready.':'No new release was found. Offline access is shown above.';
  }catch(_){if(manual)$('pwaUpdateMessage').textContent='The update server could not be reached. Continue playing and try again when connected.';}
  finally{checking=false;$('pwaCheckUpdate').disabled=false;}
 }
 function safeReload(){
  if(reloading)return;reloading=true;
  persistQuietly();window.BoneEmergency?.host?.pause();location.reload();
 }
 function applyUpdate(){
  if(!registration?.waiting&&!reloadOffered)return;
  if(!window.confirm('Save your case and reload MRU with the updated app? Your local progress is kept. Export a backup first for an extra copy.'))return;
  persistQuietly();window.BoneEmergency?.host?.pause();
  if(registration?.waiting){reloadOnChange=true;registration.waiting.postMessage({type:'MRU_ACTIVATE'});}
  else safeReload();
 }
 async function register(){
  const local=location.protocol==='file:';
  const eligible=!local&&window.isSecureContext&&'serviceWorker' in navigator;
  $('pwaHostedWarning').hidden=eligible;
  if(!eligible){renderStatus(local?'OPEN LIVE LINK TO INSTALL':'ONLINE PLAY / INSTALL UNAVAILABLE');$('pwaCheckUpdate').disabled=true;return;}
  try{
   const base=new URL('./',document.baseURI);
   registration=await navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.href,updateViaCache:'none'});
   updateAvailable();watch(registration.installing);
   registration.addEventListener('updatefound',()=>watch(registration.installing));
   if(registration.active)await refreshOffline();else renderStatus('SAVING OFFLINE COPY');
   navigator.serviceWorker.ready.then(()=>{refreshOffline();updateAvailable();});
  }catch(e){renderStatus('ONLINE PLAY / SETUP INCOMPLETE');$('pwaUpdateMessage').textContent='Offline setup could not start. Publish sw.js, manifest.webmanifest and the icons folder alongside index.html, then try again. Some browser/device restrictions block offline storage.';console.warn('MRU offline registration failed:',e);}
 }
 function init(){
  $('pwaInstall').onclick=install;$('pwaNativeInstall').onclick=install;$('pwaOptions').onclick=openOptions;$('pwaClose').onclick=()=>$('pwaDialog').close();
  $('pwaApplyUpdate').onclick=applyUpdate;$('pwaDialogUpdate').onclick=applyUpdate;$('pwaCheckUpdate').onclick=()=>checkUpdates(true);
  const block=$(isApple()?'pwaIosInstructions':'pwaAndroidInstructions');block.classList.add('pwaSuggested');
  renderInstall();
  const media=window.matchMedia('(display-mode: standalone)');if(media.addEventListener)media.addEventListener('change',renderInstall);
  if('serviceWorker' in navigator){let hadController=!!navigator.serviceWorker.controller;
   navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(reloadOnChange){safeReload();return;}
    if(hadController){reloadOffered=true;updateAvailable();}
    hadController=true;refreshOffline();
   });
  }
  window.addEventListener('online',()=>{refreshOffline();renderStatus();if(Date.now()-lastCheck>60000)checkUpdates();});
  window.addEventListener('offline',()=>renderStatus(readyOffline?'':'OFFLINE / COPY NOT CONFIRMED'));
  window.addEventListener('pagehide',persistQuietly);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)persistQuietly();else if(Date.now()-lastCheck>60*60*1000)checkUpdates();});
  document.addEventListener('input',e=>{if(e.target.id==='writtenAnswer'){clearTimeout(saveTimer);saveTimer=setTimeout(persistQuietly,350);}});
  // Debug/status surface contains no answers or new scoring logic.
  window.MRUInstall={version:'1.1.0',status:()=>({offlineReady:readyOffline,installed:standalone()||installedThisSession,updateReady:!!registration?.waiting||reloadOffered}),check:()=>checkUpdates(true)};
  register();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
