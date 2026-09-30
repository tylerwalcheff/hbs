(()=>{
'use strict';
const D=JSON.parse(document.getElementById('content-data').textContent);
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const mem={};const store={get(k,f){try{const s=localStorage.getItem('BE4_'+k);return s===null?f:JSON.parse(s);}catch(_){return k in mem?mem[k]:f;}},set(k,v){mem[k]=v;try{localStorage.setItem('BE4_'+k,JSON.stringify(v));}catch(_){}},remove(k){delete mem[k];try{localStorage.removeItem('BE4_'+k);}catch(_){}}};
const saved=store.get('prefs',{});const P={mode:saved.mode==='game'?'game':'practice',difficulty:[1,2,3].includes(+saved.difficulty)?+saved.difficulty:2,length:[5,8,10].includes(+saved.length)?+saved.length:8,sound:!!saved.sound,timer:!!saved.timer};
const types=['Long','Short','Flat','Irregular','Sesamoid'];
const names={mixed:'Full Manikin Rounds',bones:'Bone Emergency',longbone:'Long Bone Service Center',classify:'Bone Type Classifier 3000'};
const domains={identify:'REGIONAL IDENTIFICATION',regional:'DETAILED ANATOMY',long:'LONG-BONE STRUCTURE / FUNCTION',classify:'CLASSIFICATION + REASONING',application:'ANATOMICAL APPLICATION'};
const byId=new Map(D.questions.map(q=>[q.id,q]));
let R=null,preferred=null,serial=0,clock=null,lastTick=0,zoom=1,audio=null,toastTimer=null,atlasView='thorax';
function notify(t){$('#toast').textContent=t;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function tone(good){if(!P.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='triangle';const t=audio.currentTime;o.frequency.setValueAtTime(good?520:170,t);o.frequency.exponentialRampToValueAtTime(good?800:110,t+.14);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.19);o.start(t);o.stop(t+.2);}catch(_){}}
function persist(){store.set('prefs',P);if(R)store.set('session',R);else store.remove('session');}
function showScreen(which){$$('.screen').forEach(e=>e.classList.toggle('active',e.id===which+'Screen'));document.body.dataset.screen=which;window.scrollTo(0,0);document.dispatchEvent(new CustomEvent('mru:screen',{detail:which}));}
function pool(module,difficulty){return D.questions.filter(q=>(module==='mixed'||q.module===module)&&(difficulty===1?q.level<=2:difficulty===2?q.level>=2:q.level===3));}
function coverage(difficulty){let c=store.get('coverage_'+difficulty,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{};}
function questionUsage(difficulty){return store.get('usage_'+difficulty,{})||{};}
function compatible(q,chosen){return chosen.every(p=>p.objective!==q.objective&&!p.guards.some(t=>q.guards.includes(t)));}
function slotsFor(n,difficulty){
 if(n===5)return ['identify','regional','application','long','classify'];
 const a=['identify','regional','regional','application','application','long','long','classify'];
 if(n===10)a.push('identify','long');
 return a;
}
// Select learning targets, not merely random sentences. Backtracking maintains independent concepts.
// Fresh targets have priority; eligible review items are explicitly marked rather than silently recycled.
function makePlan(module,difficulty,length){
 const bank=pool(module,difficulty),cov=coverage(difficulty),usage=questionUsage(difficulty);
 const slots=module==='mixed'?slotsFor(length,difficulty):Array(length).fill('*');
 // Constrain the smaller domain pools first; the delivered case is shuffled.
 slots.sort((a,b)=>bank.filter(q=>a==='*'||q.domain===a).length-bank.filter(q=>b==='*'||q.domain===b).length);
 let nodes=0;const dead=new Set();
 function candidates(domain,chosen){
  const choices=shuffle(bank.filter(q=>(domain==='*'||q.domain===domain)&&compatible(q,chosen)));
  choices.sort((a,b)=>(cov[a.objective]||0)-(cov[b.objective]||0)||(usage[a.id]||0)-(usage[b.id]||0)||a.guards.length-b.guards.length);
  // Equivalent wordings are redundant, but a different guard signature can enable
  // a valid extended case. Do not discard that alternative prematurely.
  const seen=new Set();return choices.filter(q=>{const k=q.objective+'|'+[...q.guards].sort().join(',');if(seen.has(k))return false;seen.add(k);return true;});
 }
 function search(i,chosen){
  if(i===slots.length)return chosen;if(++nodes>30000)return null;
  const key=i+'|'+chosen.map(q=>q.objective+'@'+[...q.guards].sort().join(',')).sort().join(';');if(dead.has(key))return null;
  const eligible=bank.filter(q=>compatible(q,chosen)),left=slots.length-i;
  // Every independent target consumes at least one nonshared concept guard.
  if(new Set(eligible.map(q=>q.objective)).size<left||new Set(eligible.flatMap(q=>q.guards)).size<left){dead.add(key);return null;}
  for(const domain of new Set(slots.slice(i))){if(domain==='*')continue;const needed=slots.slice(i).filter(x=>x===domain).length;if(new Set(eligible.filter(q=>q.domain===domain).map(q=>q.objective)).size<needed){dead.add(key);return null;}}
  for(const q of candidates(slots[i],chosen)){const out=search(i+1,[...chosen,q]);if(out)return out;}dead.add(key);return null;
 }
 let out=search(0,[]),adjusted=false;
 if(!out){nodes=0;dead.clear();adjusted=true;const neutral=Array(length).fill('*');slots.splice(0,slots.length,...neutral);out=search(0,[]);}
 // Never quietly insert a duplicate to meet a requested case length.
 if(!out)throw new Error('Not enough independent targets in this module and level for this case length. Choose a shorter case.');
 return {questions:shuffle(out).map(q=>({id:q.id,review:!!cov[q.objective]})),adjusted};
}
function patient(){let b=store.get('patients',[]);if(!Array.isArray(b)||b.some(i=>!Number.isInteger(i)||i<0||i>=D.cast.length))b=[];if(!b.length)b=shuffle(D.cast.map((_,i)=>i));let i;if(preferred!==null){i=preferred;preferred=null;b=b.filter(x=>x!==i);}else i=b.shift();store.set('patients',b);return {...D.cast[i],incident:pick(D.cast[i].incidents)};}
function uiPrefs(){
 $$('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===P.mode)));
 $('#difficulty').value=P.difficulty;$('#caseLength').value=P.length;
 $('#modeNote').textContent=P.mode==='practice'?'Retry freely. Hints mark an item as assisted. No timer.':`4 cases / ${P.length*4} questions. Classification includes a reason.`;
 $('#difficultyNote').textContent={1:'Foundation: a supported starting point.',2:'Curriculum review: identification, interpretation and application.',3:'Challenge: more typed recall and relational reasoning.'}[P.difficulty];
 $('#timerSetting').disabled=P.mode!=='game';$('#timerSetting').checked=P.timer;
 $('#soundBtn').textContent=P.sound?'Sound on':'Sound off';$('#soundBtn').setAttribute('aria-pressed',P.sound);
 $('#resumeBtn').hidden=!R||R.finished;$('#mixedDescription').textContent=`One manikin. ${P.length} distinct learning targets. Bones, directions, structure and function.`;
 $('#rosterHint').textContent=`Choose the first manikin or leave the roster shuffled. Each patient stays for ${P.length} questions. All eight names rotate before repeating.`;
 const cov=coverage(P.difficulty),all=pool('mixed',P.difficulty),objectives=new Set(all.map(q=>q.objective));
 $('#coverageHome').textContent=`${[...objectives].filter(k=>cov[k]).length} / ${objectives.size} learning targets encountered on this level`;
 for(const [m,id] of [['bones','bonesCount'],['longbone','longCount'],['classify','classCount']]){const b=pool(m,P.difficulty);$('#'+id).textContent=`${new Set(b.map(q=>q.objective)).size} TARGETS / ${b.length} PROMPTS ON THIS LEVEL`;}
}
function roster(){$('#roster').innerHTML=D.cast.map((p,i)=>`<button class="manikinCard" data-patient="${i}" aria-pressed="${preferred===i}"><span class="manikinInitials">${esc(p.initials)}</span><span><strong>${esc(p.name)}</strong><small>${esc(p.tag)}</small></span></button>`).join('');$$('[data-patient]').forEach(b=>b.onclick=()=>{preferred=preferred===+b.dataset.patient?null:+b.dataset.patient;roster();});$('#firstPatientHint').textContent=preferred===null?'First patient: shuffled':'First patient: '+D.cast[preferred].name;}
function saveDraft(){const input=$('#writtenAnswer');if(R&&document.body.dataset.screen==='game'&&input&&!R.locked)R.lastInput=input.value;}
function home(){saveDraft();stopClock();$$('dialog[open]').forEach(d=>d.close());persist();showScreen('home');uiPrefs();roster();}
function start(module){
 if(!names[module])return;
 if(R&&!R.finished&&document.body.dataset.screen==='home'&&!confirm('Start a new shift and replace the paused session? Learning-target coverage will be kept.'))return;
 let plan;try{plan=makePlan(module,P.difficulty,P.length);}catch(e){notify(e.message);return;}
 R={module,mode:P.mode,difficulty:P.difficulty,length:P.length,timer:P.timer,patient:patient(),caseIndex:0,index:0,plan:plan.questions,adjusted:plan.adjusted,caseResults:[],caseLog:[],caseStart:0,score:0,streak:0,bestStreak:0,completed:0,firstTry:0,solved:0,assisted:0,errors:0,hinted:false,locked:false,phase:'type',seconds:0,finished:false,caseLogged:false};
 prepare();showScreen('game');render();
}
function current(){return R?byId.get(R.plan[R.index]?.id):null;}
function prepare(){const q=current();R.errors=0;R.hinted=false;R.locked=false;R.phase='type';R.choiceOrder=shuffle(q.options||[]).map(o=>o.id);R.reasonOrder=shuffle(types.filter(t=>t!==q.answer)).slice(0,3);R.reasonOrder=shuffle([q.answer,...R.reasonOrder]);R.seconds=q.kind==='classify'?120:90;R.message=null;R.lastInput='';persist();}
function resume(){if(!R||R.finished)return;showScreen('game');render();if(R.caseLogged&&R.index===R.length-1)receipt();}
function renderPatient(){const p=R.patient;$('#patientName').textContent=p.name.toUpperCase();$('#patientInitials').textContent=p.initials;$('#patientCode').textContent=p.code;$('#incident').textContent=p.incident;$('#caseTag').textContent=p.tag;$('#caseCount').textContent=`CASE ${String(R.caseIndex+1).padStart(2,'0')} / QUESTION ${R.index+1} OF ${R.length}`;$('#checkSteps').innerHTML=Array.from({length:R.length},(_,i)=>`<span class="checkStep ${i<R.caseResults.length?'done':i===R.index?'current':''}" aria-label="Question ${i+1}: ${i<R.caseResults.length?'complete':i===R.index?'current':'pending'}">${i<R.caseResults.length?'&#10003;':i+1}</span>`).join('');}
function render(){
 const q=current();if(!q){home();return;}stopClock();renderPatient();
 $('#gameScreen').dataset.questionId=q.id;$('#gameScreen').dataset.kind=q.kind;
 $('#runTitle').textContent=`${names[R.module]} / ${R.mode} / ${['','Foundation','Curriculum','Challenge'][R.difficulty]}`;
 const cov=coverage(R.difficulty),b=pool(R.module,R.difficulty),obj=new Set(b.map(x=>x.objective));
 $('#deckCounter').textContent=`${R.plan[R.index].review?'REVIEW TARGET':'NEW TARGET'} / ${[...obj].filter(k=>cov[k]).length} OF ${obj.size} ENCOUNTERED`;
 $('#taskLabel').textContent=domains[q.domain]+' / '+R.patient.code;
 $('#prompt').textContent=q.prompt.replaceAll('{name}',R.patient.name);
 $('#taskInstruction').textContent=q.kind==='click'?'Select the actual anatomical shape. You may enlarge the whole view.':q.kind==='input'?(q.responseMode==='function'?'Write a short function phrase. Common equivalent wording is accepted.':'Type the anatomical term or requested number. Minor spelling errors are accepted.'):q.kind==='classify'?'First classify the specimen. Then justify the category. Both parts count as one question.':'Choose the most anatomically accurate answer.';
 $('#nextBtn').disabled=!R.locked;$('#nextBtn').textContent=R.locked?(R.index===R.length-1?'Close case / view report':'Next question'): 'Complete this question to continue';
 $('#hintBtn').hidden=R.mode!=='practice';$('#hintBtn').disabled=R.locked;$('#revealBtn').hidden=R.locked;$('#revealBtn').textContent='Review answer (no credit)';
 $('#stage').classList.toggle('noDiagram',!q.view);$('#stage').classList.toggle('reasonPhase',q.kind==='classify'&&R.phase==='reason'&&!R.locked);
 $('#specimenBanner').hidden=q.kind!=='classify';$('#specimenName').textContent=q.specimen||'';
 $('#plateTitle').textContent=q.view?D.art[q.view].title:'Case assessment / written response';$('#orientation').textContent=q.view?D.art[q.view].orientation:'MANIKIN FILE '+R.patient.code+' / FIVE DEPARTMENTS, ONE CLIPBOARD';
 $('#plateNote').textContent=q.view?D.art[q.view].note:'Choose using anatomical knowledge. There is no diagnostic image attached to this item.';
 $('#zoomBtn').hidden=!q.view;$('#diagramViewport').hidden=!q.view;
 if(q.view)mount($('#diagramHost'),q.view,{click:q.kind==='click',highlight:q.kind!=='click'?q.target:null});else $('#diagramHost').innerHTML='';
 renderAnswers(q);$('#sourceLine').hidden=!R.locked;
 if(R.locked){paint(q.target,R.assistedCurrent?'revealed':'selected');showSource(q);}
 if(R.message)feedback(...R.message);else feedback('','AWAITING YOUR ASSESSMENT',`${esc(R.patient.name)} is ready. ${q.kind==='classify'?'A category without its reason is not yet a completed assessment.':'Choose carefully; the entire region stays in view.'}`);
 stats();persist();if(!R.locked)startClock();
}
function mount(host,view,opts={}){
 const prefix='b4_'+(++serial)+'_',raw=D.art[view].svg.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix+id}"`).replace(/url\(#([^\)]+)\)/g,(_,id)=>`url(#${prefix+id})`);
 host.innerHTML=raw;const svg=$('svg',host),rs=$$('.region',svg);svg.classList.toggle('noninteractive',!opts.click&&!opts.study);
 rs.forEach((g,i)=>{
  const t=g.dataset.bone,eligible=opts.study||(opts.click&&g.dataset.role!=='bracket');
  g.setAttribute('role',eligible?'button':'img');g.setAttribute('tabindex',eligible?'0':'-1');g.setAttribute('aria-label',opts.study?(D.meta[t]?.display||t):`Anatomical region ${i+1}`);
  g.classList.toggle('marked',opts.highlight===t);g.classList.toggle('passive',!eligible);
  if(eligible){g.addEventListener('click',()=>opts.study?study(t):answer(t));g.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();opts.study?study(t):answer(t);}else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const allowed=rs.filter(x=>x.getAttribute('tabindex')==='0'),ix=allowed.indexOf(g),step=['ArrowLeft','ArrowUp'].includes(e.key)?-1:1;allowed[(ix+step+allowed.length)%allowed.length].focus();}});}
 });return svg;
}
function renderAnswers(q){
 const host=$('#answerHost');host.innerHTML='';host.hidden=q.kind==='click';host.className='answerHost '+q.kind;
 $('#typeChoices').hidden=true;
 if(q.kind==='choice'){
  host.innerHTML=R.choiceOrder.map((id,i)=>{const o=q.options.find(o=>o.id===id);return `<button class="answerChoice" data-answer="${id}" ${R.locked?'disabled':''}><span class="answerKey">${i+1}</span><span>${esc(o.text)}</span></button>`;}).join('');
 }else if(q.kind==='input'){
  host.innerHTML=`<form id="answerForm" autocomplete="off"><label for="writtenAnswer">${/^\d+$/.test(q.answer)?'ENTER A NUMBER':q.responseMode==='function'?'SHORT FUNCTION PHRASE':'ANATOMICAL TERM'}</label><div class="inputRow"><input id="writtenAnswer" type="text" ${/^\d+$/.test(q.answer)?'inputmode="numeric"':''} spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="inputHelp" ${R.locked?'disabled':''} value="${esc(R.lastInput||'')}"><button class="paperSubmit" ${R.locked?'disabled':''}>Submit</button></div><small id="inputHelp">${q.responseMode==='function'?'Enter submits. Use a short phrase rather than a full explanation.':'Enter submits. Scientific synonyms and minor spelling errors are accepted.'}</small></form>`;
  $('#answerForm').onsubmit=e=>{e.preventDefault();const value=$('#writtenAnswer').value.trim();if(value){R.lastInput=value;answer(value);}};
 }else if(q.kind==='classify'){
  host.innerHTML=`<div class="categoryRow" aria-label="All five bone categories">${types.map((t,i)=>`<button class="typeBtn ${R.phase==='reason'&&t===q.answer?'accepted':''}" data-answer="${esc(t)}" ${R.phase==='reason'||R.locked?'disabled':''}><small>${i+1}</small><span>${t}</span></button>`).join('')}</div>`;
  if(R.phase==='reason')host.innerHTML+=`<div class="reasonHeader">CATEGORY RECORDED / NOW JUSTIFY IT</div><div class="reasonChoices">${R.reasonOrder.map((t,i)=>`<button class="answerChoice" data-answer="${esc(t)}" ${R.locked?'disabled':''}><span class="answerKey">${i+1}</span><span>${esc(D.typeFacts[t])}</span></button>`).join('')}</div>`;
 }
 $$('[data-answer]',host).forEach(b=>b.onclick=()=>answer(b.dataset.answer));
 if(R.locked&&q.kind==='choice'){const b=$(`[data-answer="${q.answer}"]`,host);b?.classList.add('accepted');}
}
function feedback(kind,title,body){$('#feedback').className='feedback'+(kind?' '+kind:'');$('#feedbackTitle').textContent=title;$('#feedbackText').innerHTML=body;}
function message(kind,title,body){R.message=[kind,title,body];feedback(kind,title,body);persist();}
function paint(target,cls){if(!target)return;for(const host of [$('#diagramHost'),$('#zoomDrawing')])$$('.region',host).filter(g=>g.dataset.bone===target).forEach(g=>g.classList.add(cls));}
function normalize(s){return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function editDistance(a,b){let row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,row[j]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));row=n;}return row[b.length];}
function inputOK(raw,q){
 let s=normalize(raw);
 const numberWords={'four':'4','five':'5','six':'6','seven':'7','twelve':'12','fourteen':'14','twenty six':'26','twenty seven':'27','two hundred six':'206','two hundred and six':'206'};
 s=numberWords[s]||s;
 if(q.responseMode==='function'){
  if(/\b(?:not|no|never|doesn|doesnt|don|dont|cannot|can\s+t|can\s+not|isn|isnt)\b/.test(s))return false;
  s=s.replace(/^(?:its main function is |its function is |the function is |it is important for |it is used for |it is for |they |it )/, '');
 }
 const aliases=[q.answer,...q.aliases||[]].filter(Boolean).map(normalize);
 if(aliases.includes(s))return true;
 if(/^\d+$/.test(q.answer))return false;
 return aliases.some(a=>a.length>=6&&s.length>=5&&editDistance(a,s)<=(a.length>=12?2:1));
}
function selectedName(raw,q){if(q.kind==='choice')return q.options.find(o=>o.id===raw)?.text||raw;if(q.kind==='click')return D.meta[raw]?.display||raw;if(q.kind==='classify'&&R.phase==='reason')return D.typeFacts[raw]||raw;return raw;}
function answer(raw){
 const q=current();if(!q||R.locked||document.body.dataset.screen!=='game')return;
 const okay=q.kind==='input'?inputOK(raw,q):raw===q.answer;
 if(okay&&q.kind==='classify'&&R.phase==='type'){
  R.phase='reason';R.message=['hint','CATEGORY ACCEPTED / REASON REQUIRED',`You classified ${esc(q.specimen)} as <strong>${esc(q.answer)}</strong>. Select the structural reason; the question is not complete yet.`];render();tone(true);return;
 }
 if(okay){const points=R.mode==='game'&&!R.hinted?([100,60,30][Math.min(R.errors,2)]):0;R.score+=points;R.solved++;const first=R.errors===0&&!R.hinted;if(first){R.streak++;R.bestStreak=Math.max(R.bestStreak,R.streak);}else R.streak=0;
  const label=q.kind==='choice'?q.options.find(o=>o.id===q.answer).text:q.kind==='classify'?q.specimen+' / '+q.answer:q.kind==='click'?D.meta[q.answer]?.display||q.answer:q.answer;
  R.assistedCurrent=R.hinted;complete(first,R.hinted,points,label);message('good','ASSESSMENT CONFIRMED'+(R.mode==='game'?` / +${points}`:''),`<strong>${esc(label)}</strong><br>${esc(q.explanation)}<div class="patientAside">${esc(R.patient.good)}</div>`);tone(true);
 }else{
  R.errors++;R.streak=0;if(R.mode==='game')R.score=Math.max(0,R.score-20);
  let why=q.kind==='choice'?q.options.find(o=>o.id===raw)?.why:q.kind==='click'?D.meta[raw]?.fact:null;
  if(q.kind==='classify')why=R.phase==='reason'?'That describes a different category and does not justify the recorded classification.':'That category does not fit this specimen\'s defining anatomy.';
  why=why||q.wrong||(q.responseMode==='function'?'That phrase does not match the function requested. Use a short phrase, not the structure name.':'That response does not match the structure or relationship requested.');
  message('bad',`RECHECK REQUIRED${R.mode==='game'?' / -20':''}`,`${q.kind==='input'?'You wrote':'You selected'} <strong>${esc(selectedName(raw,q))}</strong>. ${esc(why)}<br><span class="targetClue">Clue: ${esc(q.hint)}</span>`);
  if(q.kind==='click'){paint(raw,'wrong');const id=q.id;setTimeout(()=>{if(current()?.id===id)for(const h of [$('#diagramHost'),$('#zoomDrawing')])$$('.wrong',h).forEach(g=>g.classList.remove('wrong'));},700);}
  else if(q.kind==='input'){const inp=$('#writtenAnswer');if(inp){inp.focus();inp.select();}}
  tone(false);stats();persist();
 }
}
function complete(first,assisted,points,label){
 stopClock();R.locked=true;R.completed++;if(first)R.firstTry++;if(assisted)R.assisted++;
 const q=current();R.caseResults.push({id:q.id,objective:q.objective,label:q.label,answer:label,first,assisted,errors:R.errors,points});
 const cov=coverage(R.difficulty);cov[q.objective]=(cov[q.objective]||0)+1;store.set('coverage_'+R.difficulty,cov);const usage=questionUsage(R.difficulty);usage[q.id]=(usage[q.id]||0)+1;store.set('usage_'+R.difficulty,usage);
 $('#nextBtn').disabled=false;$('#nextBtn').textContent=R.index===R.length-1?'Close case / view report':'Next question';$('#hintBtn').disabled=true;$('#revealBtn').hidden=true;renderAnswers(q);paint(q.target,assisted?'revealed':'selected');renderPatient();stats();showSource(q);persist();
 // Enlarge is optional; after an answer it closes so feedback remains visible.
 if($('#zoomDialog').open)$('#zoomDialog').close();
}
function showSource(q){const e=$('#sourceLine');e.hidden=false;e.textContent=`CLASS SOURCE: ${D.sources[q.source].title} / ${q.location}.`+(q.key!==q.source?` Answer reference: ${D.sources[q.key].title}.`:'');}
function reveal(){const q=current();if(!q||R.locked)return;R.assistedCurrent=true;R.streak=0;let label=q.kind==='choice'?q.options.find(o=>o.id===q.answer).text:q.kind==='click'?D.meta[q.answer]?.display||q.answer:q.kind==='classify'?q.specimen+' / '+q.answer:q.answer;complete(false,true,0,label);message('hint','ANSWER REVIEWED / NO CREDIT',`<strong>${esc(label)}</strong><br>${esc(q.explanation)}`);}
function hint(){const q=current();if(!q||R.locked||R.mode!=='practice')return;R.hinted=true;R.streak=0;message('hint','CLUE / ASSISTED ITEM',esc(q.hint)+' This item will not count as independent first-try recall.');}
function next(){if(!R?.locked)return;if(R.index===R.length-1){receipt();return;}R.index++;prepare();render();$('#prompt').focus({preventScroll:true});}
function receipt(){
 stopClock();if(!R.caseLogged){R.caseLog.push({name:R.patient.name,results:[...R.caseResults],score:R.score-R.caseStart});R.caseLogged=true;persist();}
 $('#receiptName').textContent=R.patient.name;$('#receiptCode').textContent=R.patient.code;$('#receiptLead').textContent=R.patient.release;$('#receiptHeader').textContent=`CASE CLOSED / ${R.length} DISTINCT TARGETS ASSESSED`;
 $('#receiptFirst').textContent=R.caseResults.filter(x=>x.first).length+'/'+R.length;$('#receiptChecks').textContent=R.length+'/'+R.length;$('#receiptPoints').textContent=R.mode==='game'?R.score-R.caseStart:R.caseResults.filter(x=>!x.assisted).length;$('#receiptPointsLabel').textContent=R.mode==='game'?'NET POINTS':'UNASSISTED';
 $('#receiptTargets').innerHTML=R.caseResults.map((x,i)=>`<div class="receiptCheck"><span>${i+1}. <strong>${esc(x.label)}</strong></span><small>${x.assisted?'REVIEWED WITH SUPPORT':x.first?'INDEPENDENT / FIRST TRY':`REVIEW / ${x.errors} ERROR${x.errors!==1?'S':''}`}</small></div>`).join('');
 const missed=R.caseResults.filter(x=>!x.first);$('#receiptReview').textContent=missed.length?'Review next: '+missed.map(x=>x.label).join('; ')+'.':'All targets were completed independently on the first try.';
 $('#admitNext').textContent=R.mode==='game'&&R.caseIndex===3?'View shift report':'Admit next manikin';$('#caseDialog').showModal();
}
function admit(){
 $('#caseDialog').close();if(R.mode==='game'&&R.caseIndex===3){finish();return;}
 let p;try{p=makePlan(R.module,R.difficulty,R.length);}catch(e){notify(e.message);home();return;}
 Object.assign(R,{patient:patient(),caseIndex:R.caseIndex+1,index:0,plan:p.questions,adjusted:p.adjusted,caseResults:[],caseStart:R.score,caseLogged:false});prepare();render();
}
function stats(){if(!R)return;$('#scoreVal').textContent=R.mode==='game'?R.score:'--';$('#scoreLabel').textContent=R.mode==='game'?'Score':'Practice';$('#streakVal').textContent=R.streak;$('#accuracyVal').textContent=R.completed?Math.round(R.firstTry/R.completed*100)+'%':'--';$('#checksVal').textContent=R.mode==='game'?R.completed+'/'+R.length*4:R.completed;$('#statusReadout').textContent=R.locked?'FILE UPDATED / NEXT ORDER READY':R.errors?'RADIOLOGY REQUESTS A SECOND LOOK':'ER STATUS: SOMEHOW FUNCTIONAL';}
function finish(){stopClock();R.finished=true;const key=R.module+'_'+R.difficulty+'_'+R.length+'_'+(R.timer?'timed':'untimed');let bs=store.get('bests',{});bs[key]=Math.max(bs[key]||0,R.score);store.set('bests',bs);$('#finalScore').textContent=R.score;$('#finalAccuracy').textContent=Math.round(R.firstTry/R.completed*100)+'%';$('#finalStreak').textContent=R.bestStreak;$('#finalBest').textContent=bs[key];$('#summaryNames').innerHTML=R.caseLog.map(p=>`<div class="discharged">${esc(p.name)}<small>${p.results.filter(r=>r.first).length} / ${R.length} FIRST TRY</small></div>`).join('');$('#summaryNote').textContent=`${R.completed} questions completed. ${R.assisted} reviewed with support. New targets remain prioritized in the next shift; review targets are identified explicitly.`;showScreen('summary');persist();}
function startClock(){stopClock();if(!R||R.mode!=='game'||!R.timer||R.locked)return;$('#timer').hidden=false;lastTick=performance.now();const total=current().kind==='classify'?120:90;clock=setInterval(()=>{const now=performance.now(),dt=(now-lastTick)/1000;lastTick=now;if(document.hidden||document.querySelector('dialog[open]'))return;R.seconds=Math.max(0,R.seconds-dt);$('#timerText').textContent=Math.ceil(R.seconds)+'s';$('#timerFill').style.width=100*R.seconds/total+'%';if(!R.seconds){reveal();message('hint','TIME WINDOW CLOSED / ANSWER REVIEW',esc(current().explanation));}},150);}
function stopClock(){clearInterval(clock);clock=null;$('#timer').hidden=true;$('#timerText').textContent='';}
function openZoom(){const q=current();if(!q?.view)return;zoom=1;$('#zoomTitle').textContent=D.art[q.view].title;mount($('#zoomDrawing'),q.view,{click:q.kind==='click',highlight:q.kind!=='click'?q.target:null});if(R.locked)paint(q.target,R.assistedCurrent?'revealed':'selected');applyZoom();$('#zoomDialog').showModal();}
function applyZoom(){const h=$('#zoomDrawing');h.style.width=100*zoom+'%';h.style.height=100*zoom+'%';$('#zoomLevel').textContent=Math.round(100*zoom)+'%';$('#zoomOut').disabled=zoom<=1;$('#zoomIn').disabled=zoom>=3;}
function openAtlas(){renderAtlas();$('#atlasDialog').showModal();}
function renderAtlas(){const v=D.art[atlasView];$('#atlasView').value=atlasView;$('#atlasTitle').textContent=v.title;$('#atlasOrientation').textContent=v.orientation;$('#atlasNote').textContent=v.note;const svg=mount($('#atlasDrawing'),atlasView,{study:true});const keys=[...new Set($$('.region',svg).map(g=>g.dataset.bone))];$('#atlasList').innerHTML=keys.map(k=>`<button class="atlasBone" data-study="${esc(k)}" aria-pressed="false">${esc(D.meta[k]?.display||k)}</button>`).join('');$$('[data-study]').forEach(b=>b.onclick=()=>study(b.dataset.study));$('#atlasFact').textContent='Choose a structure to see its location and a concise explanation. Brackets identify gross regions, not tissues.';}
function study(t){$$('.region',$('#atlasDrawing')).forEach(g=>g.classList.toggle('selected',g.dataset.bone===t));$$('[data-study]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.study===t));$('#atlasFact').textContent=(D.meta[t]?.display||t)+'. '+(D.meta[t]?.fact||'');}
function bankTable(){const term=normalize($('#bankSearch').value),dom=$('#bankDomain').value;const qs=D.questions.filter(q=>(!dom||q.domain===dom)&&(!term||normalize(q.prompt+' '+q.label+' '+q.explanation).includes(term)));$('#bankCount').textContent=qs.length+' prompts shown';$('#bankRows').innerHTML=qs.map(q=>{const a=q.kind==='choice'?q.options.find(o=>o.id===q.answer).text:q.kind==='click'?D.meta[q.answer]?.display||q.answer:q.answer;const ref=D.sources[q.key];const evidence=ref.url?`<a href="${esc(ref.url)}" target="_blank" rel="noopener">Retained answer reference</a>`:`<span>Key from supplied class slideshow</span>`;return `<tr><td>${esc(q.id)}<br>${esc(domains[q.domain])}<br>Level ${q.level}</td><td><strong>${esc(q.label)}</strong><br>${esc(q.prompt)}<details><summary>Answer and explanation</summary><p><strong>${esc(a)}</strong><br>${esc(q.explanation)}</p></details></td><td>${esc(D.sources[q.source].title)}<br>${esc(q.location)}<br>${evidence}</td></tr>`;}).join('');}
function audit(){const errors=[],views={};for(const [k,a] of Object.entries(D.art)){const x=new DOMParser().parseFromString(a.svg,'image/svg+xml');if(x.querySelector('parsererror'))errors.push('Invalid SVG '+k);views[k]=new Set(Array.from(x.querySelectorAll('[data-bone]')).map(g=>g.getAttribute('data-bone')));for(const t of views[k])if(!D.meta[t])errors.push('Missing metadata '+t);}
 const ids=new Set();for(const q of D.questions){if(ids.has(q.id))errors.push('Duplicate ID '+q.id);ids.add(q.id);if(q.target&&!views[q.view]?.has(q.target))errors.push('Missing target '+q.id);if(q.domain==='long'&&q.view&&q.view!=='longbone')errors.push('Leading long-bone view '+q.id);if(!q.objective||!q.guards?.length)errors.push('Missing objective guard '+q.id);if(!D.sources[q.source]||!D.sources[q.key])errors.push('Missing source '+q.id);if(q.domain==='micro'||q.view==='microscopy')errors.push('Out-of-scope content '+q.id);}
 return {ok:!errors.length,errors,prompts:D.questions.length,objectives:new Set(D.questions.map(q=>q.objective)).size,views:Object.keys(D.art).length};}
function setup(){
 const prev=store.get('session',null);if(prev&&prev.plan?.length===prev.length&&prev.plan.every(p=>byId.has(p.id))&&prev.patient&&Number.isInteger(prev.index)&&prev.index>=0&&prev.index<prev.length)R=prev;
 uiPrefs();roster();$$('[data-start]').forEach(b=>b.onclick=()=>start(b.dataset.start));$$('[data-mode]').forEach(b=>b.onclick=()=>{P.mode=b.dataset.mode;persist();uiPrefs();});$('#difficulty').onchange=e=>{P.difficulty=+e.target.value;persist();uiPrefs();};$('#caseLength').onchange=e=>{P.length=+e.target.value;persist();uiPrefs();};$('#timerSetting').onchange=e=>{P.timer=e.target.checked;persist();uiPrefs();};$('#soundBtn').onclick=()=>{P.sound=!P.sound;persist();uiPrefs();};
 for(const id of ['brandHome','mainMenuBtn','leaveBtn','summaryHome','caseHome'])$('#'+id).onclick=home;
 $('#resumeBtn').onclick=resume;$('#nextBtn').onclick=next;$('#admitNext').onclick=admit;$('#anotherShift').onclick=()=>{const m=R.module;R.finished=true;start(m);};$('#hintBtn').onclick=hint;$('#revealBtn').onclick=reveal;
 $('#resetScore').onclick=()=>{if(confirm('Reset saved high scores? Learning-target coverage and the paused case will be kept.')){store.remove('bests');notify('High scores cleared.');}};
 $('#resetCoverage').onclick=()=>{if(confirm('Restart learning-target coverage on every level and discard the paused session?')){for(const n of [1,2,3]){store.remove('coverage_'+n);store.remove('usage_'+n);}R=null;persist();uiPrefs();notify('Coverage reset. The next case starts with new targets.');}};
 $('#atlasView').innerHTML=Object.entries(D.art).map(([k,v])=>`<option value="${k}">${esc(v.title)}</option>`).join('');$('#atlasView').onchange=e=>{atlasView=e.target.value;renderAtlas();};$('#atlasBtn').onclick=openAtlas;$('#closeAtlas').onclick=()=>$('#atlasDialog').close();
 $('#zoomBtn').onclick=openZoom;$('#closeZoom').onclick=()=>$('#zoomDialog').close();$('#zoomIn').onclick=()=>{zoom=Math.min(3,zoom+.5);applyZoom();};$('#zoomOut').onclick=()=>{zoom=Math.max(1,zoom-.5);applyZoom();};
 $('#helpBtn').onclick=()=>$('#helpDialog').showModal();$('#closeHelp').onclick=()=>$('#helpDialog').close();$('#curriculumBtn').onclick=()=>{$('#curriculumDialog').showModal();bankTable();};$('#closeCurriculum').onclick=()=>$('#curriculumDialog').close();$('#bankSearch').oninput=bankTable;$('#bankDomain').onchange=bankTable;
 $('#caseDialog').addEventListener('cancel',e=>{e.preventDefault();$('#admitNext').focus();});
 document.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.repeat||document.querySelector('dialog[open]')||document.body.dataset.screen!=='game'||R?.locked||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(/^[1-5]$/.test(e.key)){const i=+e.key-1,q=current();const arr=q.kind==='choice'?R.choiceOrder:q.kind==='classify'?(R.phase==='reason'?R.reasonOrder:types):[];if(arr[i]!==undefined){e.preventDefault();answer(arr[i]);}}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();});window.addEventListener('beforeunload',persist);
 const report=audit();window.BoneEmergency={version:'4.0',audit,progress:()=>R?{module:R.module,case:R.caseIndex+1,question:R.index+1,length:R.length,completed:R.completed,score:R.score,locked:R.locked}:null};

 // Host bridge: Bone Emergency remains the unchanged first curriculum module.
 window.BoneEmergency.host={
  openMenu:home,
  resume,
  pause(){saveDraft();stopClock();$$('dialog[open]').forEach(d=>d.close());persist();},
  overview(){
   const cov=coverage(P.difficulty),targets=new Set(pool('mixed',P.difficulty).map(q=>q.objective));
   return {contentVersion:'4.0',prompts:D.questions.length,atlasViews:Object.keys(D.art).length,
    difficulty:P.difficulty,encountered:[...targets].filter(k=>cov[k]).length,total:targets.size,
    session:R&&!R.finished?{name:R.patient.name,question:R.index+1,length:R.length,activity:names[R.module]}:null,
    cast:D.cast.map(p=>({name:p.name,initials:p.initials,tag:p.tag})),preview:D.art.longbone.svg};
  },
  exportBackup(){
   saveDraft();persist();const values={};
   for(const key of ['prefs','session','patients','bests','coverage_1','coverage_2','coverage_3','usage_1','usage_2','usage_3'])values[key]=store.get(key,null);
   return {app:'manikin-response-unit',schemaVersion:1,exportedAt:new Date().toISOString(),modules:{'bone-emergency':{contentVersion:'4.0',values}}};
  }
 };

 window.BoneEmergency.host.importBackup=backup=>{
  const fail=()=>{throw new Error('This is not a compatible Manikin Response Unit progress backup.');};
  if(!backup||backup.app!=='manikin-response-unit'||backup.schemaVersion!==1)fail();
  const source=backup.modules?.['bone-emergency'];
  if(source?.contentVersion!=='4.0'||!source.values||typeof source.values!=='object')fail();
  const v=source.values,clean={},isObj=x=>x&&typeof x==='object'&&!Array.isArray(x),
   n=(x,max=100000000)=>Number.isFinite(x)&&x>=0&&x<=max,
   int=(x,max=100000000)=>Number.isInteger(x)&&n(x,max);
  const validObjectives=new Set(D.questions.map(q=>q.objective));
  for(const level of [1,2,3]){
   for(const prefix of ['coverage_','usage_']){
    const key=prefix+level,obj=v[key];if(obj!==null&&obj!==undefined&&!isObj(obj))fail();clean[key]={};
    for(const [k,count] of Object.entries(obj||{})){
     if(!int(count))fail();
     if(prefix==='coverage_'?validObjectives.has(k):byId.has(k))clean[key][k]=count;
    }
   }
  }
  const prefs=v.prefs||{};if(!isObj(prefs))fail();
  if(!['practice','game'].includes(prefs.mode)||![1,2,3].includes(prefs.difficulty)||![5,8,10].includes(prefs.length))fail();
  clean.prefs={mode:prefs.mode,difficulty:prefs.difficulty,length:prefs.length,sound:!!prefs.sound,timer:!!prefs.timer};
  clean.patients=Array.isArray(v.patients)&&v.patients.every(x=>int(x,D.cast.length-1))?[...new Set(v.patients)]:[];
  clean.bests={};if(v.bests&&!isObj(v.bests))fail();
  for(const [key,value] of Object.entries(v.bests||{}))if(/^(mixed|bones|longbone|classify)_[123]_(5|8|10)_(timed|untimed)$/.test(key)&&n(value))clean.bests[key]=value;
  clean.session=null;
  if(v.session){
   const s=v.session;if(!isObj(s)||!names[s.module]||!['practice','game'].includes(s.mode)||![1,2,3].includes(s.difficulty)||![5,8,10].includes(s.length)||!Array.isArray(s.plan)||s.plan.length!==s.length||!int(s.index,s.length-1)||!int(s.caseIndex,100000))fail();
   if(!s.plan.every(p=>isObj(p)&&byId.has(p.id)))fail();
   for(const key of ['score','caseStart'])if(!Number.isFinite(s[key])||Math.abs(s[key])>100000000)fail();
   for(const key of ['streak','bestStreak','completed','firstTry','solved','assisted','errors'])if(!int(s[key]))fail();
   if(!n(s.seconds,120)||!['type','reason'].includes(s.phase))fail();
   const cast=D.cast.find(p=>p.code===s.patient?.code);if(!cast)fail();
   const q=byId.get(s.plan[s.index].id);
   const choices=Array.isArray(q.options)?q.options.map(o=>o.id):[];
   if(!Array.isArray(s.choiceOrder)||s.choiceOrder.length!==choices.length||new Set(s.choiceOrder).size!==choices.length||!s.choiceOrder.every(x=>choices.includes(x)))fail();
   if(q.kind==='classify'&&(!Array.isArray(s.reasonOrder)||!s.reasonOrder.every(t=>types.includes(t))||new Set(s.reasonOrder).size!==s.reasonOrder.length))fail();
   if(q.kind==='classify'&&(!s.reasonOrder.includes(q.answer)||s.reasonOrder.length!==4))fail();
   const safeResults=rs=>{
    if(!Array.isArray(rs)||rs.length>s.length)fail();
    return rs.map(r=>{const item=byId.get(r.id);if(!item||!int(r.errors)||!Number.isFinite(r.points)||Math.abs(r.points)>100000)fail();
     return {id:item.id,objective:item.objective,label:item.label,answer:String(r.answer||'').slice(0,300),first:!!r.first,assisted:!!r.assisted,errors:r.errors,points:r.points};});
   };
   if(!Array.isArray(s.caseLog)||s.caseLog.length>10000)fail();
   const results=safeResults(s.caseResults);
   if(results.length!==s.index+(s.locked?1:0))fail();
   const log=s.caseLog.map(x=>{if(!D.cast.some(p=>p.name===x.name)||!Number.isFinite(x.score)||Math.abs(x.score)>100000000)fail();return {name:x.name,score:x.score,results:safeResults(x.results)};});
   const lastInput=typeof s.lastInput==='string'?s.lastInput.slice(0,1000):'';
   clean.session={module:s.module,mode:s.mode,difficulty:s.difficulty,length:s.length,timer:!!s.timer,
    patient:{...cast,incident:cast.incidents.includes(s.patient.incident)?s.patient.incident:cast.incidents[0]},
    caseIndex:s.caseIndex,index:s.index,plan:s.plan.map(p=>({id:p.id,review:!!p.review})),adjusted:!!s.adjusted,
    caseResults:results,caseLog:log,caseStart:s.caseStart,score:s.score,streak:s.streak,bestStreak:s.bestStreak,
    completed:s.completed,firstTry:s.firstTry,solved:s.solved,assisted:s.assisted,errors:s.errors,hinted:!!s.hinted,
    locked:!!s.locked,phase:s.phase,seconds:s.seconds,finished:!!s.finished,caseLogged:!!s.caseLogged,
    choiceOrder:s.choiceOrder,reasonOrder:q.kind==='classify'?s.reasonOrder:[],lastInput,assistedCurrent:!!s.assistedCurrent,message:null};
   if(s.locked){const label=q.kind==='choice'?q.options.find(o=>o.id===q.answer).text:q.kind==='click'?D.meta[q.answer]?.display||q.answer:q.answer;
    clean.session.message=[s.assistedCurrent?'hint':'good','RESTORED / ASSESSMENT COMPLETE',`<strong>${esc(label)}</strong><br>${esc(q.explanation)}`];}
   else if(s.phase==='reason'&&q.kind==='classify')clean.session.message=['','RESTORED / CATEGORY RECORDED','Choose the reason supporting your classification.'];
  }
  // All validation finishes before the first write. A user confirmation happens in the host.
  stopClock();$$('dialog[open]').forEach(d=>d.close());
  for(const [key,value] of Object.entries(clean))value===null?store.remove(key):store.set(key,value);
  Object.assign(P,clean.prefs);R=clean.session;uiPrefs();roster();persist();
 };
 // Opt-in local QA interface; not required for play or shipped with an external dependency.
 if(location.hash==='#qa')window.__BE_TEST__={data:D,get:()=>R,plan:makePlan,inputOK,answer,next,admit,reveal,start:(m,d=2,n=8)=>{R=null;P.difficulty=d;P.length=n;P.mode='game';start(m);},jump:id=>{if(!R){P.mode='practice';start('mixed');}R.plan[R.index]={id,review:false};prepare();render();},home};
 document.body.dataset.ready='true';if(!report.ok){console.error(report);notify('A content validation problem was found. See the curriculum map before using this file.');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
