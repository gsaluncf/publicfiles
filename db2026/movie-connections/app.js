import {nodes,credits,rounds,copy,sources,lab} from './game-data.js';
import {roundGraph,connections,evaluateRoute,creditSentence} from './engine.js';
import {mountWorkshop} from './workshop.js';

const $=id=>document.getElementById(id),KEY='ncf-movie-connections-v1';
const fmt=(s,v={})=>{const text=s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');return v.count===1?text.replace(/\bcredits\b/g,'credit'):text;};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
let storageOK=true,audio=null,dialogReturn=null,inspected=null;
let state={index:0,path:[rounds[0].start],edges:[],done:Array(rounds.length).fill(null),solved:false,finished:false,muted:true,status:null};
try{
  const s=JSON.parse(localStorage.getItem(KEY));
  if(s?.version===1){
    const done=rounds.map((r,i)=>{
      const p=s.done?.[i];return p&&evaluateRoute(r,p.nodes,p.edges).status==='solved'?p:null;
    });
    const index=Number.isInteger(s.index)?Math.max(0,Math.min(s.index,rounds.length-1,done.filter(Boolean).length)):0;
    const r=rounds[index],graph=roundGraph(r);
    const valid=Array.isArray(s.path)&&Array.isArray(s.edges)&&s.path[0]===r.start&&s.edges.length===s.path.length-1&&new Set(s.path).size===s.path.length&&s.edges.every((id,i)=>connections(graph,s.path[i],s.path[i+1]).some(e=>e.id===id));
    state={...state,index,done,muted:s.muted!==false,finished:!!s.finished&&done.every(Boolean),path:valid?s.path:[r.start],edges:valid?s.edges:[]};
    state.solved=valid&&!!s.solved&&evaluateRoute(r,state.path,state.edges).status==='solved';
    if(state.solved)state.status={status:'solved'};
  }
}catch{storageOK=false;}

function save(){try{localStorage.setItem(KEY,JSON.stringify({version:1,index:state.index,path:state.path,edges:state.edges,done:state.done,solved:state.solved,finished:state.finished,muted:state.muted}));}catch{storageOK=false;} $('saved').hidden=!storageOK;}
function tone(success=true){
  if(state.muted)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
    const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;
    o.type='sine';o.frequency.setValueAtTime(success?660:330,t);o.frequency.exponentialRampToValueAtTime(success?880:294,t+.1);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+.015);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.2);
  }catch{}
}
function openDialog(html,returnTo){
  const d=$('dialog');dialogReturn=returnTo??document.activeElement;
  $('dialog-content').innerHTML=html;$('dialog-close').textContent=copy.close;
  if(!d.open)d.showModal();
  (d.querySelector('button:not(#dialog-close),a')??$('dialog-close')).focus();
}
function closeDialog(){const back=dialogReturn;$('dialog').close();if(back?.isConnected)back.focus({preventScroll:true});}
$('dialog-close').addEventListener('click',closeDialog);
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog')){const b=$('dialog').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)closeDialog();}});
$('dialog').addEventListener('cancel',()=>{if(dialogReturn?.isConnected)setTimeout(()=>dialogReturn.focus({preventScroll:true}),0);});

function loadRound(index){
  state.index=index;const r=rounds[index];
  state.path=r.initialPath?[...r.initialPath.nodes]:[r.start];
  state.edges=r.initialPath?[...r.initialPath.edges]:[];
  state.solved=false;state.finished=false;state.status=null;inspected=null;save();render();
  $('question').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
}
function changeRoute(path,edges,focus){
  state.path=path;state.edges=edges;state.status=null;state.solved=false;inspected=null;
  save();render();if(focus)document.querySelector(`[data-node="${focus}"]`)?.focus({preventScroll:true});
}
function addStep(id,credit){changeRoute([...state.path,id],[...state.edges,credit.id],id);}
function chooseNode(id){
  const prior=state.path.indexOf(id);
  if(prior>=0){changeRoute(state.path.slice(0,prior+1),state.edges.slice(0,prior),id);return;}
  const r=rounds[state.index],g=roundGraph(r),last=state.path.at(-1),options=connections(g,last,id);
  if(!options.length){state.status={status:'noConnection',from:nodes[last].label,to:nodes[id].label};renderFeedback();tone(false);return;}
  if(options.length===1){addStep(id,options[0]);return;}
  openDialog(`<h2>${esc(copy.chooseCredit)}</h2><p>${esc(copy.chooseCreditHelp)}</p><div class="choice">${options.map(e=>`<button type="button" data-choice="${e.id}">${esc(e.kind==='DIRECTED'?copy.directed:copy.acted)}</button>`).join('')}</div>`,document.querySelector(`[data-node="${id}"]`));
  $('dialog-content').querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{const e=options.find(e=>e.id===b.dataset.choice);closeDialog();addStep(id,e);}));
}
function render(){
  $('title').textContent=copy.title;
  $('help').innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16v1"/></svg><span class="button-label">${esc(copy.help)}</span>`;
  $('help').setAttribute('aria-label',copy.help);$('help').title=copy.help;
  const soundLabel=state.muted?copy.soundOff:copy.soundOn;
  $('sound').innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${state.muted?'<path d="m17 9 5 6m0-6-5 6"/>':'<path d="M17 8q4 4 0 8m2-11q7 7 0 14"/>'}</svg><span class="button-label">${esc(soundLabel)}</span>`;
  $('sound').setAttribute('aria-label',soundLabel);$('sound').title=soundLabel;$('sound').setAttribute('aria-pressed',String(!state.muted));
  $('saved').textContent=copy.saved;$('saved').hidden=!storageOK;$('sources').textContent=copy.sources;
  $('progress').textContent=fmt(copy.progress,{current:state.index+1,total:8});
  $('play').hidden=state.finished;$('results').hidden=!state.finished;
  $('workshop').hidden=!state.finished;
  if(state.finished){$('results').hidden=true;mountWorkshop(()=>{state.done=Array(rounds.length).fill(null);loadRound(0);});return;}
  $('help').onclick=showHelp;
  const r=rounds[state.index];
  $('round-title').textContent=r.title;$('question').textContent=r.question;$('instruction').textContent=r.instruction;$('rule').textContent=r.rule;
  $('credits-open').textContent=copy.credits;$('credits-title').textContent=copy.credits;$('credits-help').textContent=copy.creditsHelp;
  $('legend').setAttribute('aria-label',copy.legend);
  for(const [id,k] of [['person-label','person'],['film-label','film'],['acted-label','acted'],['directed-label','directed'],['route-title','route'],['undo','undo'],['reset','reset'],['check','check']])$(id).textContent=copy[k];
  $('undo').disabled=state.edges.length===0;$('reset').disabled=state.edges.length===0;$('check').disabled=state.edges.length===0;
  $('claim').hidden=!r.claim;$('claim').innerHTML=r.claim?`<small>${esc(copy.exampleAnswer)}</small><p>${esc(r.claim)}</p>`:'';
  renderBoard();renderRoute();renderCredits();renderFeedback();renderFacts();
}
function renderBoard(){
  const r=rounds[state.index],g=roundGraph(r),current=state.path.at(-1),box=$('nodes');box.replaceChildren();
  $('board').setAttribute('aria-label',copy.graphLabel);
  for(const type of ['Person','Film']){
    const group=g.nodes.filter(n=>n.type===type);
    group.forEach((n,i)=>{
      const y=group.length===1?50:group.length===2?29+i*42:12+i*(76/(group.length-1));
      const connected=connections(g,current,n.id).length>0&&!state.path.includes(n.id);
      const selected=state.path.includes(n.id),b=make('button',`node ${type.toLowerCase()}${connected?' connected':''}${selected?' selected':''}${n.id===r.goal?' goal':''}${n.id===current?' current':''}`);
      b.type='button';b.dataset.node=n.id;b.style.left=type==='Person'?'22%':'78%';b.style.top=y+'%';
      let role=n.id===r.start?copy.nodeRoleStart:'';if(n.id===r.goal)role+=copy.nodeRoleTarget;if(n.id===current)role+=copy.nodeRoleCurrent;else if(selected)role+=copy.nodeRoleSelected;
      b.setAttribute('aria-label',fmt(copy.nodeLabel,{name:n.label,type:n.type,year:n.year?', '+n.year:'',role}));b.setAttribute('aria-pressed',String(selected));
      b.append(make('span','type',n.type),make('span','name',n.label));if(n.year)b.append(make('span','year',String(n.year)));
      if(n.id===r.start||n.id===r.goal)b.append(make('span','badge',n.id===r.start?copy.start:copy.target));
      b.addEventListener('click',()=>chooseNode(n.id));box.append(b);
    });
  }
  requestAnimationFrame(drawEdges);
}
function drawEdges(){
  if(state.finished)return;
  const board=$('board'),rect=board.getBoundingClientRect(),svg=$('lines'),g=roundGraph(rounds[state.index]);
  if(!rect.width)return;svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
  const ns='http://www.w3.org/2000/svg';$('edges').replaceChildren();
  for(const e of g.credits){
    const a=document.querySelector(`[data-node="${e.person}"]`).getBoundingClientRect(),b=document.querySelector(`[data-node="${e.film}"]`).getBoundingClientRect();
    const peers=g.credits.filter(v=>v.person===e.person&&v.film===e.film),offset=(peers.indexOf(e)-(peers.length-1)/2)*19;
    const x1=a.right-rect.left-1,y1=a.top+a.height/2-rect.top+offset,x2=b.left-rect.left+1,y2=b.top+b.height/2-rect.top+offset,mid=(x1+x2)/2;
    const d=`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
    const group=document.createElementNS(ns,'g');group.setAttribute('class',`edge${e.kind==='DIRECTED'?' directed':''}${state.edges.includes(e.id)?' active':''}${inspected===e.id?' inspected':''}${state.status?.wrong?.includes(e.id)?' rejected':''}`);group.dataset.credit=e.id;
    const line=document.createElementNS(ns,'path');line.setAttribute('d',d);line.setAttribute('class','base');line.setAttribute('marker-end',`url(#arrow-${e.kind==='DIRECTED'?'director':'actor'})`);
    const hit=document.createElementNS(ns,'path');hit.setAttribute('d',d);hit.setAttribute('class','hit');const title=document.createElementNS(ns,'title');title.textContent=creditSentence(e);hit.append(title);hit.addEventListener('click',()=>inspectCredit(e.id,true));group.append(line,hit);$('edges').append(group);
  }
}
function renderRoute(){
  $('route-count').textContent=fmt(copy.routeCount,{count:state.edges.length});$('route').replaceChildren();
  state.path.forEach((id,i)=>{const li=make('li'),b=make('button',i===state.path.length-1?'current':'',nodes[id].label);b.type='button';b.dataset.routeStep=String(i);b.addEventListener('click',()=>changeRoute(state.path.slice(0,i+1),state.edges.slice(0,i),id));li.append(b);$('route').append(li);});
}
function creditRecord(e){
  const b=make('button',`credit-record${e.kind==='DIRECTED'?' directed':''}${state.edges.includes(e.id)?' active':''}${inspected===e.id?' inspected':''}`);
  b.type='button';b.dataset.record=e.id;b.setAttribute('aria-label',fmt(copy.creditLabel,{statement:creditSentence(e)}));
  b.append(make('span','person',nodes[e.person].label),make('span','verb',e.kind==='DIRECTED'?copy.directed:copy.acted),make('span','movie',`${nodes[e.film].label} (${nodes[e.film].year})`));
  b.addEventListener('click',()=>inspectCredit(e.id,window.innerWidth<=850));return b;
}
function renderCredits(){const list=$('credits-list');list.replaceChildren();for(const e of roundGraph(rounds[state.index]).credits)list.append(creditRecord(e));}
function inspectCredit(id,modal){
  const e=credits.find(e=>e.id===id);if(!e)return;inspected=id;drawEdges();renderCredits();
  if(modal)openDialog(`<h2>${esc(copy.inspectTitle)}</h2><p>${esc(creditSentence(e))}</p><p>${esc(copy.inspectHint)}</p><p><a href="${sources[e.source].url}" target="_blank" rel="noopener">${esc(sources[e.source].label)}</a></p>`);
}
function renderFeedback(){
  const r=rounds[state.index],s=state.status,feedback=$('feedback');feedback.replaceChildren();feedback.className='feedback';
  $('instruction').textContent=r.instruction;$('instruction').style.color='';
  if(!s){feedback.textContent=copy.nextHint;return;}
  let text=s.status==='relationship'?(r.relationshipFeedback??rounds[3].relationshipFeedback):copy[s.status]??copy.invalid;
  if(s.status==='solved')text=copy.correct;
  if(s.status==='incomplete')text=fmt(text,{name:nodes[r.goal].label});
  if(s.status==='noConnection')text=fmt(text,s);
  feedback.append(make('p','',text));
  if(s.status==='solved'){
    feedback.classList.add('success');feedback.append(make('p','',r.explanation));
    const next=make('button','primary',state.index===rounds.length-1?lab.start:copy.next);next.id='next';next.type='button';next.addEventListener('click',advance);feedback.append(next);
  }else{
    feedback.classList.add('warning');$('instruction').textContent=text;$('instruction').style.color='var(--bad)';
  }
  drawEdges();
}
function renderFacts(){
  const box=$('facts');box.replaceChildren();box.hidden=state.edges.length===0;if(box.hidden)return;
  box.append(make('h3','',copy.selectedFacts));const list=make('ol');
  for(const id of state.edges){const e=credits.find(e=>e.id===id);list.append(make('li','',creditSentence(e)));}box.append(list);
  const r=rounds[state.index];if(state.solved&&r.answer){box.append(make('h3','',copy.supportedAnswer),make('p','',r.answer),make('h3','',copy.llmTitle),make('p','',copy.llmText));}
}
function check(){
  const r=rounds[state.index],result=evaluateRoute(r,state.path,state.edges);state.status=result;state.solved=result.status==='solved';
  if(state.solved)state.done[state.index]={nodes:[...state.path],edges:[...state.edges]};
  save();renderFeedback();renderFacts();tone(state.solved);
  if(state.solved){$('feedback').scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('next').focus({preventScroll:true});}
}
function advance(){
  if(!state.solved)return;
  if(state.index<rounds.length-1){loadRound(state.index+1);return;}
  state.finished=true;save();render();
  $('lab-question').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'instant'});
}
function renderResults(){
  const box=$('results');box.replaceChildren();const title=make('h2','',copy.completeTitle);title.tabIndex=-1;box.append(title,make('p','intro',copy.completeText));
  rounds.forEach((r,i)=>{
    const p=state.done[i];if(!p)return;
    const details=make('details','result-row'),summary=make('summary','',r.title);summary.append(make('span','',fmt(copy.resultsLinks,{count:p.edges.length})));details.append(summary);
    const list=make('ul');for(const id of p.edges)list.append(make('li','',creditSentence(credits.find(e=>e.id===id))));details.append(list,make('p','',r.explanation));box.append(details);
  });
  const learning=make('section','facts');learning.append(make('h3','',copy.ontologyTitle),make('p','',copy.ontologyText),make('h3','',copy.llmTitle),make('p','',copy.llmText));box.append(learning);
  const replay=make('button','primary',copy.replay);replay.type='button';replay.id='replay';replay.addEventListener('click',()=>{state.done=Array(6).fill(null);loadRound(0);});box.append(replay);
  const source=make('button','',copy.sources);source.type='button';source.addEventListener('click',showSources);box.append(source);
}
function showSources(){openDialog(`<h2>${esc(copy.sourcesTitle)}</h2><p>${esc(copy.sourceText)}</p><ul>${Object.values(sources).map(s=>`<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('')}</ul>`);}
$('check').addEventListener('click',check);
$('undo').addEventListener('click',()=>{if(state.edges.length)changeRoute(state.path.slice(0,-1),state.edges.slice(0,-1));});
$('reset').addEventListener('click',()=>changeRoute([rounds[state.index].start],[]));
function showHelp(){openDialog(`<h2>${esc(copy.helpTitle)}</h2><ol>${copy.helpSteps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p>${esc(copy.helpMeaning)}</p><h3>${esc(copy.ontologyTitle)}</h3><p>${esc(copy.ontologyText)}</p><p>${esc(copy.arrowText)}</p>`);}
$('help').onclick=showHelp;
$('sources').addEventListener('click',showSources);
$('sound').addEventListener('click',()=>{state.muted=!state.muted;save();render();tone(true);});
$('credits-open').addEventListener('click',()=>{openDialog(`<h2>${esc(copy.credits)}</h2><p>${esc(copy.creditsHelp)}</p><div id="mobile-credits"></div>`);for(const e of roundGraph(rounds[state.index]).credits)$('mobile-credits').append(creditRecord(e));});
new ResizeObserver(()=>requestAnimationFrame(drawEdges)).observe($('board'));
render();
