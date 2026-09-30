/* Shared home page. No other curriculum modules, accounts or online scores are implemented. */
(()=>{
 'use strict';
 const MODULES=@@REGISTRY@@;
 const $=id=>document.getElementById(id);
 const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let bridge,previewMounted=false;
 function notify(message){$('toast').textContent=message;$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true;},6500);}
 function navigation(){
  const hub=document.body.dataset.screen==='hub';
  $('hubHomeBtn').hidden=hub;
  $('mainMenuBtn').hidden=hub||document.body.dataset.screen==='home';
 }
 function renderHub(){
  const s=bridge.overview();
  $('hubPromptCount').textContent=s.prompts+' PROMPTS';
  $('hubAtlasCount').textContent=s.atlasViews+' ATLAS VIEWS';
  $('hubCoverageText').textContent=s.encountered+' / '+s.total+' targets encountered';
  $('hubCoverage').value=s.encountered;$('hubCoverage').max=s.total||1;
  $('hubCoverageNote').textContent=['','Foundation','Curriculum review','Challenge'][s.difficulty]+' level. Encountered means practiced, not necessarily mastered.';
  $('hubResumeBtn').hidden=!s.session;$('hubResumeNote').hidden=!s.session;
  $('hubResumeNote').textContent=s.session?'PAUSED FILE: '+s.session.name+' / QUESTION '+s.session.question+' OF '+s.session.length:'';
  $('hubCast').innerHTML=s.cast.map(p=>`<div class="hubCastMember"><span class="manikinInitials" aria-hidden="true">${escapeText(p.initials)}</span><div><strong>${escapeText(p.name)}</strong><small>${escapeText(p.tag)}</small></div></div>`).join('');
  if(!previewMounted){
   const svg=new DOMParser().parseFromString(s.preview,'image/svg+xml').documentElement;
   // Prefix internal IDs to avoid colliding with diagrams mounted by the lesson engine.
   for(const el of svg.querySelectorAll('[id]'))el.id='hubpreview_'+el.id;
   for(const el of [svg,...svg.querySelectorAll('*')]){
    for(const attr of [...el.attributes])if(attr.value.includes('url(#'))el.setAttribute(attr.name,attr.value.replace(/url\(#([^\)]+)\)/g,'url(#hubpreview_$1)'));
    el.removeAttribute('tabindex');el.removeAttribute('role');
   }
   svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');$('hubPreview').replaceChildren(document.importNode(svg,true));previewMounted=true;
  }
 }
 function home(){
  bridge.pause();
  for(const screen of document.querySelectorAll('.screen'))screen.classList.toggle('active',screen.id==='hubScreen');
  document.body.dataset.screen='hub';renderHub();navigation();window.scrollTo(0,0);$('hubTitle').focus({preventScroll:true});
 }
 function exportProgress(){
  try{
   const backup=bridge.exportBackup(),blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='MRU_progress_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
   notify('Progress backup prepared. Keep the JSON file to transfer or restore this module.');
  }catch(error){notify('Backup could not be created: '+error.message);}
 }
 async function importProgress(e){
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>4*1024*1024)throw new Error('Backup file is too large (maximum 4 MB).');
   const parsed=JSON.parse(await file.text());
   if(!parsed||parsed.app!=='manikin-response-unit'||parsed.schemaVersion!==1)throw new Error('Choose a progress JSON file exported by Manikin Response Unit.');
   if(!confirm('Import this backup and REPLACE the saved Bone Emergency progress in this browser? Export your current progress first to keep a copy.'))return;
   bridge.importBackup(parsed);home();notify('Progress restored. Your paused case is available on this page.');
  }catch(error){notify('Nothing was imported. '+error.message);}finally{e.target.value='';}
 }
 function init(){
  bridge=window.BoneEmergency?.host;if(!bridge){console.error('Bone Emergency host bridge is unavailable.');return;}
  $('mysteryModules').innerHTML=MODULES.filter(m=>m.status==='locked').map(m=>`<article class="sealedModule" aria-label="Module ${escapeText(m.number)}, unreleased mystery file"><div class="sealedTop"><span>MODULE / ${escapeText(m.number)}</span><span class="sealedLock" aria-hidden="true"></span></div><h3>CLASSIFIED</h3><div class="redactedBars" aria-hidden="true"><i></i><i></i></div><p>Contents withheld. Await further instructions.</p></article>`).join('');
  $('enterBoneBtn').onclick=()=>{bridge.openMenu();$('homeScreen').querySelector('h1').setAttribute('tabindex','-1');$('homeScreen').querySelector('h1').focus({preventScroll:true});};
  $('hubResumeBtn').onclick=()=>bridge.resume();
  $('brandHome').onclick=home;$('hubHomeBtn').onclick=home;
  $('helpBtn').onclick=()=>document.body.dataset.screen==='hub'?$('hubHelp').showModal():$('helpDialog').showModal();
  $('closeHubHelp').onclick=()=>$('hubHelp').close();
  $('exportProgress').onclick=exportProgress;$('importProgress').onclick=()=>$('progressFile').click();$('progressFile').onchange=importProgress;
  document.addEventListener('mru:screen',navigation);
  window.ManikinResponseUnit={version:'1.1',modules:()=>MODULES.map(m=>({...m})),home};
  renderHub();navigation();document.body.dataset.hubReady='true';
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
