import {lab,records,sources} from './game-data.js';
import {initialModel,splitFilm,mergePeople,relabelCredit,checkStage,queryResults,checkOntology,toTurtle,toPython,pythonSetup,evidenceContext} from './model.js';
const key='ncf-movie-ontology-v2',clone=o=>structuredClone(o),$=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const verb=k=>k==='ACTED_IN'?lab.acted:k==='DIRECTED'?lab.directed:lab.worked;
let s={version:2,step:0,model:initialModel(),ontology:{classes:[]},history:[],passed:[],view:'graph',evidence:null};
let base=clone(s.model),baseOntology=clone(s.ontology),selected=[],lastResults=null,message=null,replay=null,query='shared',observed=false;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.version===2&&saved.model?.nodes&&saved.model?.edges&&Number.isInteger(saved.step)&&saved.step>=0&&saved.step<6){s=saved;base=clone(s.base??s.model);baseOntology=clone(s.baseOntology??s.ontology);}}catch{}
function save(){try{localStorage.setItem(key,JSON.stringify({...s,base,baseOntology}));}catch{}}
function button(id,text,cls=''){return `<button type="button" id="${id}" class="${cls}">${esc(text)}</button>`;}
function select(name,options,value='',label=name){return `<select name="${name}" aria-label="${esc(label)}">${options.map(([v,t])=>`<option value="${v}"${value===v?' selected':''}>${esc(t)}</option>`).join('')}</select>`;}
function hook(id,fn){$(id)?.addEventListener('click',fn);}
const resultString=rows=>rows.length?rows.join(', '):lab.empty;
function invalidate(){s.passed=s.passed.filter(id=>lab.stages.findIndex(t=>t.id===id)<s.step);}
function snapshot(){s.history.push({model:clone(s.model),ontology:clone(s.ontology)});}
function edit(model){lastResults=queryResults(s.model);snapshot();s.model=model;selected=[];message=null;invalidate();save();render();}
function sourceRecord(r){return `<div class="source-record" data-source="${r.id}"><strong>${r.id}: ${esc(r.name)} ${verb(r.kind).toLowerCase()} ${esc(r.title)} (${r.year})</strong><span>${lab.personID}: ${r.person} · ${lab.filmID}: ${r.film}</span></div>`;}
export function mountWorkshop(onReplay){
  replay=onReplay;render();
  if(!observed){new ResizeObserver(()=>requestAnimationFrame(draw)).observe($('workshop'));observed=true;}
}
function render(){
  const stage=lab.stages[s.step];$('title').textContent=lab.title;
  $('progress').textContent=fmt(lab.step,{current:s.step+3,total:8});
  $('help').onclick=()=>{const d=$('dialog');$('dialog-content').innerHTML=`<h2>${lab.title}</h2><p>${lab.recordHelp}</p><p>${lab.ontologyMeaning}</p><p>${lab.queryHelp}</p>`;if(!d.open)d.showModal();$('dialog-close').focus();};
  $('workshop').innerHTML=`
    <nav class="stage-nav" aria-label="Workshop steps">${lab.stages.map((t,i)=>`<button type="button" data-stage="${i}" ${i>s.step&&!s.passed.includes(lab.stages[i-1]?.id)?'disabled':''} aria-current="${i===s.step?'step':'false'}">${i+3}. ${esc(t.title)}</button>`).join('')}</nav>
    <div class="task"><p class="round-title">${stage.title}</p><h2 id="lab-question" tabindex="-1">${stage.question}</h2>${s.step===3?`<p>${lab.ontologyIntro}</p>`:''}<p>${stage.instruction}</p></div>
    ${s.step<=3?editor():s.step===4?evidence():examples()}
    <div id="lab-feedback" class="feedback ${message?.ok?'success':message?'warning':''}" role="status">${message?`<p>${message.ok?lab.correct:lab.incorrect} ${esc(message.message)}</p>`:''}</div>
    <div class="workshop-footer">${s.step?button('lab-back',lab.back):''}${s.step<5?button('lab-next',lab.next,'primary'):button('lab-replay',lab.replay)}<span class="save-note">${esc(lab.recordNote)}</span></div>`;
  $('workshop').querySelectorAll('[data-stage]').forEach(b=>b.onclick=()=>go(Number(b.dataset.stage)));
  hook('lab-back',()=>go(s.step-1));hook('lab-next',()=>go(s.step+1));
  hook('lab-replay',()=>{s={version:2,step:0,model:initialModel(),ontology:{classes:[]},history:[],passed:[],view:'graph',evidence:null};base=clone(s.model);baseOntology=clone(s.ontology);selected=[];lastResults=null;message=null;save();replay();});
  if($('lab-next'))$('lab-next').disabled=!s.passed.includes(stage.id);
  hook('lab-undo',()=>{if(s.history.length){lastResults=queryResults(s.model);const prev=s.history.pop();s.model=prev.model??prev;if(prev.ontology)s.ontology=prev.ontology;selected=[];message=null;invalidate();save();render();}});
  if($('lab-undo'))$('lab-undo').disabled=!s.history.length;
  hook('lab-reset',()=>{snapshot();lastResults=queryResults(s.model);s.model=clone(base);s.ontology=clone(baseOntology);selected=[];message=null;invalidate();save();render();});
  hook('model-check',validate);hook('split-open',splitForm);hook('merge-open',mergeForm);
  hook('view-graph',()=>{s.view='graph';save();render();});hook('view-ontology',()=>{s.view='ontology';save();render();});
  $('workshop').querySelectorAll('[data-model-node]').forEach(b=>b.onclick=()=>chooseNode(b.dataset.modelNode));
  $('workshop').querySelectorAll('[data-credit-kind]').forEach(e=>e.onchange=()=>{const id=e.dataset.creditKind;edit(relabelCredit(s.model,id,e.value));document.querySelector(`[data-credit-kind="${id}"]`)?.focus({preventScroll:true});});
  $('ontology-form')?.addEventListener('change',e=>{const name=e.target.name,value=e.target.value,f=new FormData($('ontology-form'));snapshot();s.ontology={...Object.fromEntries(f),classes:f.getAll('classes')};message=null;invalidate();save();render();const selector=name==='classes'?`[name="classes"][value="${value}"]`:`[name="${name}"]`;document.querySelector('#ontology-form '+selector)?.focus({preventScroll:true});});
  $('workshop').querySelectorAll('[data-evidence]').forEach(b=>b.onclick=()=>{s.evidence=Number(b.dataset.evidence);if(s.evidence===0){s.passed=[...new Set([...s.passed,'evidence'])];message={ok:true,message:lab.supported};}else message={ok:false,message:lab.evidenceWrong.replace(/^Incorrect\. /,'')};save();render();});
  $('query-picker')?.addEventListener('change',e=>{query=e.target.value;render();$('query-picker').focus({preventScroll:true});});
  hook('download-python',()=>download('film-graph.py',toPython(s.model),'text/x-python'));
  hook('download-rdf',()=>download('film-graph.ttl',toTurtle(s.model,s.ontology),'text/turtle'));
  hook('download-json',()=>download('film-graph.json',JSON.stringify({model:s.model,ontology:s.ontology,records},null,2),'application/json'));
  requestAnimationFrame(draw);
}
function go(step){if(step<0||step>5)return;if(step>s.step&&!s.passed.includes(lab.stages[step-1].id))return;s.step=step;s.view=step===3?'ontology':'graph';base=clone(s.model);baseOntology=clone(s.ontology);s.history=[];selected=[];message=null;lastResults=null;save();render();$('lab-question').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
function validate(){
  const stage=lab.stages[s.step].id;
  if(stage==='ontology'){const r=checkOntology(s.ontology);message={ok:r.ok,message:r.ok?lab.ontologyFixed:lab.ontologyMismatch};}
  else message=checkStage(s.model,stage);
  if(message.ok)s.passed=[...new Set([...s.passed,stage])];save();render();if(message.ok)$('lab-next')?.focus({preventScroll:true});else $('lab-feedback').scrollIntoView({block:'nearest'});
}
function editor(){return `<div class="model-layout"><section class="model-main">
    <div class="actions model-actions">${button('lab-undo',lab.undo)}${button('lab-reset',lab.reset)}${button('model-check',lab.check,'primary')}</div>
    ${s.step===3?`<div class="view-tabs">${button('view-graph',lab.viewGraph,s.view==='graph'?'active':'')}${button('view-ontology',lab.viewOntology,s.view==='ontology'?'active':'')}</div>`:''}
    ${s.view==='ontology'?ontologyBoard():graphBoard()}
    <section id="edit-tools" class="edit-tools">${s.step===0?`<p>${lab.chooseFilm}</p>${button('split-open',lab.split)}`:s.step===1?`<p>${lab.chooseTwo}</p>${button('merge-open',lab.merge)}`:s.step===2?creditEditor():ontologyForm()}</section>
    </section><aside class="query-panel"><h3>${lab.queries}</h3><p>${lab.queryHelp}</p>${queryRows()}<details class="sources-detail"><summary>${lab.allRecords}</summary><p>${lab.recordHelp}</p>${records.map(sourceRecord).join('')}</details></aside></div>`;}
function graphBoard(){return `<div class="legend"><span><i class="person-key"></i>Person</span><span><i class="film-key"></i>Film</span><span><i class="line-key"></i>${lab.acted}</span><span><i class="line-key directed"></i>${lab.directed}</span><span class="worked-key">${lab.worked}</span></div><div class="model-board" id="model-board" role="group" aria-label="${lab.graph}"><svg id="model-lines" aria-hidden="true"><defs>${['blue','gold','grey'].map((k,i)=>`<marker id="m-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${['#8FBDD2','#DEC47E','#B9C6D5'][i]}"/></marker>`).join('')}</defs><g id="model-edges"></g></svg>${['Person','Film'].flatMap(type=>{const group=s.model.nodes.filter(n=>n.type===type);return group.map((n,i)=>`<button type="button" class="model-node ${type.toLowerCase()} ${selected.includes(n.id)?'selected':''}" data-model-node="${n.id}" aria-pressed="${selected.includes(n.id)}" style="left:${type==='Person'?22:78}%;top:${group.length===1?50:10+i*80/(group.length-1)}%"><small>${n.type}</small><strong>${esc(n.label)}</strong>${n.year?`<span>${n.year}</span>`:''}</button>`);}).join('')}</div><p id="selection" class="selection">${selected.length?`${lab.selected}: ${selected.map(id=>esc(s.model.nodes.find(n=>n.id===id).label)).join(', ')}`:lab.select}</p><div id="node-records"></div>`;}
function chooseNode(id){if(selected.includes(id))selected=selected.filter(x=>x!==id);else selected=[...selected.slice(-1),id];render();const rs=records.filter(r=>s.model.edges.some(e=>e.id===r.id&&(e.from===id||e.to===id)));$('node-records').innerHTML=`<h3>${lab.records}</h3>${rs.map(sourceRecord).join('')}`;document.querySelector(`[data-model-node="${id}"]`)?.focus({preventScroll:true});}
function draw(){
  const board=$('model-board');if(!board)return;const rect=board.getBoundingClientRect(),svg=$('model-lines'),ns='http://www.w3.org/2000/svg';if(!rect.width)return;svg.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);$('model-edges').replaceChildren();
  for(const e of s.model.edges){
    const a=document.querySelector(`[data-model-node="${e.from}"]`)?.getBoundingClientRect(),b=document.querySelector(`[data-model-node="${e.to}"]`)?.getBoundingClientRect();if(!a||!b)continue;
    const peers=s.model.edges.filter(p=>p.from===e.from&&p.to===e.to),offset=(peers.indexOf(e)-(peers.length-1)/2)*25;
    const x1=a.right-rect.left,y1=a.top+a.height/2-rect.top+offset,x2=b.left-rect.left,y2=b.top+b.height/2-rect.top+offset,mid=(x1+x2)/2;
    const g=document.createElementNS(ns,'g');g.setAttribute('class',`model-edge ${e.kind.toLowerCase()}${selected.includes(e.from)||selected.includes(e.to)?' highlighted':''}`);
    const path=document.createElementNS(ns,'path');path.setAttribute('d',`M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`);path.setAttribute('marker-end',`url(#m-${e.kind==='DIRECTED'?'gold':e.kind==='ACTED_IN'?'blue':'grey'})`);
    const title=document.createElementNS(ns,'title');title.textContent=`${e.id}: ${verb(e.kind)}`;path.append(title);g.append(path);$('model-edges').append(g);
  }
}
function splitForm(){
  const id=selected.length===1?selected[0]:null,n=s.model.nodes.find(n=>n.id===id);if(n?.type!=='Film'){message={ok:false,message:lab.chooseFilm};render();return;}
  const rs=records.filter(r=>s.model.edges.some(e=>e.id===r.id&&e.to===id));
  $('edit-tools').innerHTML=`<h3>${lab.split}</h3><p>${lab.splitHelp}</p><form id="split-form">${rs.map(r=>`<label class="record-edit">${sourceRecord(r)}${select(r.id,[['','Choose a film'],['2010','Home (2010)'],['2020','Home (2020)']],'',fmt(lab.splitLabel,{id:r.id}))}</label>`).join('')}<button type="submit" class="primary">${lab.apply}</button></form>`;
  $('split-form').onsubmit=e=>{e.preventDefault();try{edit(splitFilm(s.model,id,Object.fromEntries(new FormData(e.target))));}catch(err){$('lab-feedback').textContent=err.message;}};document.querySelector('#split-form select').focus();
}
function mergeForm(){
  if(selected.length!==2||selected.some(id=>s.model.nodes.find(n=>n.id===id)?.type!=='Person')){message={ok:false,message:lab.chooseTwo};render();return;}
  const names=records.filter(r=>s.model.edges.some(e=>e.id===r.id&&selected.includes(e.from))).map(r=>r.name),name=names.every(n=>n===names[0])?names[0]:s.model.nodes.find(n=>n.id===selected[0]).label;
  $('edit-tools').innerHTML=`<h3>${lab.merge}</h3><p>${lab.mergeHelp}</p><form id="merge-form"><label>${lab.merged}<input name="name" value="${esc(name)}" required maxlength="60"></label><button type="submit" class="primary">${lab.apply}</button></form>`;
  $('merge-form').onsubmit=e=>{e.preventDefault();edit(mergePeople(s.model,...selected,new FormData(e.target).get('name').trim()));};document.querySelector('#merge-form input').focus();
}
function creditEditor(){return `<h3>${lab.relationships}</h3><p>${lab.creditHelp}</p>${s.model.edges.map(e=>{const r=records.find(r=>r.id===e.id);return `<label class="record-edit">${sourceRecord(r)}<span class="model-fact">${esc(s.model.nodes.find(n=>n.id===e.from).label)} ${select(e.id,[['WORKED_ON',lab.worked],['ACTED_IN',lab.acted],['DIRECTED',lab.directed]],e.kind,`${r.id}: ${lab.credit}` ).replace('<select ','<select data-credit-kind="'+e.id+'" ')} ${esc(s.model.nodes.find(n=>n.id===e.to).label)} (${s.model.nodes.find(n=>n.id===e.to).year})</span></label>`;}).join('')}`;}
function queryRows(){const current=queryResults(s.model);return current.map((q,i)=>{const old=lastResults?.[i].rows,changed=old&&JSON.stringify(old)!==JSON.stringify(q.rows);return `<div class="query-row${changed?' changed':''}" data-query-result="${q.id}"><h4>${q.title}</h4>${changed?`<del>${esc(resultString(old))}</del><span class="change-label">${lab.changed}</span>`:''}<p>${esc(resultString(q.rows))}</p></div>`;}).join('');}
const classOptions=[['',lab.none],['Person','Person'],['Film','Film']];
function ontologyForm(){const o=s.ontology;return `<form id="ontology-form"><fieldset><legend>${lab.classes}</legend><p>${lab.classHelp}</p><div class="class-options">${['Person','Film','Actor','Director'].map(c=>`<label><input type="checkbox" name="classes" value="${c}"${o.classes?.includes(c)?' checked':''}>${c}</label>`).join('')}</div></fieldset><fieldset><legend>${lab.relationships}</legend><p>${lab.directionHelp}</p>${['acted','directed'].map(k=>`<div class="relationship-form"><strong>${lab[k]}</strong><label>${lab.from}${select(k+'From',classOptions,o[k+'From'],`${lab[k]}: ${lab.from}`)}</label><label>${lab.to}${select(k+'To',classOptions,o[k+'To'],`${lab[k]}: ${lab.to}`)}</label></div>`).join('')}</fieldset><fieldset><legend>${lab.properties}</legend><p>${lab.propertyHelp}</p>${['name','title','year'].map(k=>`<label class="property-form"><strong>${k} (${k==='year'?lab.integer:lab.text})</strong>${select(k,classOptions,o[k],k)}</label>`).join('')}</fieldset></form>`;}
function ontologyBoard(){const o=s.ontology;return `<section class="ontology-view" aria-label="${lab.ontology}"><h3>${lab.ontology}</h3><p>${lab.ontologyMeaning}</p><div class="schema-classes">${(o.classes??[]).length?o.classes.map(c=>`<div class="schema-class"><h4>${c}</h4><span>${fmt(lab.classCount,{count:s.model.nodes.filter(n=>n.type===c).length})}</span><ul>${['name','title','year'].filter(p=>o[p]===c).map(p=>`<li>${p}: ${p==='year'?lab.integer:lab.text}</li>`).join('')}</ul></div>`).join(''):`<p>${lab.classHelp}</p>`}</div><div class="schema-links">${['acted','directed'].map(k=>`<div><span>${o[k+'From']||'?'}</span><strong>${lab[k]}</strong><span class="schema-arrow" aria-label="to">→</span><span>${o[k+'To']||'?'}</span></div>`).join('')}</div><p class="schema-note">${lab.domainHelp}</p></section>`;}
function evidence(){const context=evidenceContext(s.model);return `<div class="evidence-layout"><section class="evidence-main"><p>${lab.evidenceIntro}</p><h3>${lab.evidenceQuestion}</h3><div class="context-panel"><h3>${lab.context}</h3>${context.map(e=>`<div class="source-record"><strong>${esc(e.person)} ${verb(e.kind).toLowerCase()} ${esc(e.film)} (${e.year})</strong><span>${lab.credit}: ${e.id}</span></div>`).join('')}</div><h3>${lab.evidenceChoice}</h3><div class="evidence-choices">${lab.choices.map((t,i)=>`<button type="button" data-evidence="${i}" aria-pressed="${s.evidence===i}">${t}</button>`).join('')}</div>${s.passed.includes('evidence')?`<div class="facts"><h3>${lab.answer}</h3><p>${lab.supported}</p><p>${lab.unsupported}</p></div>`:''}</section><aside class="query-panel">${ontologyBoard()}</aside></div>`;}
function examples(){const q=lab.querySpecs.find(q=>q.id===query),r=queryResults(s.model).find(r=>r.id===query);return `<section class="query-examples"><p>${lab.examplesIntro}</p><div class="view-tabs">${button('view-graph',lab.viewGraph,s.view==='graph'?'active':'')}${button('view-ontology',lab.viewOntology,s.view==='ontology'?'active':'')}</div>${s.view==='ontology'?ontologyBoard():graphBoard()}<label class="query-picker">${lab.queries}${select('query',lab.querySpecs.map(q=>[q.id,q.title]),query,lab.queries).replace('<select ','<select id="query-picker" ')}</label><p>${q.meaning}</p><div class="query-output"><h3>${lab.queries}</h3><p>${esc(resultString(r.rows))}</p></div><div class="code-pair"><section><h3>SPARQL</h3><p>${lab.sparqlHelp}</p><pre><code>${esc('PREFIX ex: <https://example.org/film/>\n'+q.sparql)}</code></pre></section><section><h3>Python / NetworkX</h3><p>${lab.pythonHelp}</p><pre><code>${esc(q.python)}</code></pre></section></div><details class="setup-code"><summary>${lab.setup}</summary><p>${lab.setupHelp}</p><pre><code>${esc(pythonSetup(s.model))}</code></pre></details><p>${lab.runHelp}</p><div class="download-controls">${button('download-python',lab.downloadPython,'primary')}${button('download-rdf',lab.downloadRDF)}${button('download-json',lab.downloadJSON)}</div><nav class="doc-links" aria-label="Documentation"><a href="https://www.w3.org/TR/sparql11-query/" target="_blank" rel="noopener">SPARQL</a><a href="https://networkx.org/documentation/stable/reference/classes/multidigraph.html" target="_blank" rel="noopener">NetworkX MultiDiGraph</a><a href="https://www.w3.org/TR/rdf-schema/" target="_blank" rel="noopener">RDF Schema</a><a href="${sources.graphrag.url}" target="_blank" rel="noopener">GraphRAG</a></nav></section>`;}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
