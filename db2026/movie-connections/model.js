import {records,lab} from './game-data.js';
const clone=o=>structuredClone(o);
const label=(m,id)=>m.nodes.find(n=>n.id===id)?.label;
export function initialModel(){
  return {nodes:[
    {id:'alex',type:'Person',label:'Alex Rivera'},
    {id:'sam-acting',type:'Person',label:'Sam Chen'},
    {id:'jordan',type:'Person',label:'Jordan Lee'},
    {id:'priya',type:'Person',label:'Priya Shah'},
    {id:'sam-directing',type:'Person',label:'S. Chen'},
    {id:'home',type:'Film',label:'Home',year:'2010 / 2020'},
    {id:'orbit2018',type:'Film',label:'Orbit',year:2018}
  ],edges:records.map(r=>({id:r.id,from:r.id==='r7'?'sam-directing':r.person==='sam'?'sam-acting':r.person,to:r.title==='Home'?'home':'orbit2018',kind:'WORKED_ON'}))};
}
export function splitFilm(model,id,assignments){
  const m=clone(model);
  const years=['2010','2020'];
  const filmIds=years.map(year=>'home'+year);
  const combined=m.nodes.some(n=>n.id===id&&n.type==='Film');
  const releasesExist=filmIds.every(filmId=>m.nodes.some(n=>n.id===filmId&&n.type==='Film'));
  // Progress saved by the original editor may already contain an incorrect split.
  if(!combined&&!releasesExist)throw Error('No Home film nodes found.');
  const edges=m.edges.filter(e=>combined?e.to===id:filmIds.includes(e.to));
  if(!edges.length||edges.some(e=>!years.includes(assignments[e.id])))throw Error('Assign every credit to a film.');
  if(combined){
    m.nodes=m.nodes.filter(n=>n.id!==id);
    for(const year of years)m.nodes.push({id:'home'+year,type:'Film',label:'Home',year:Number(year)});
  }
  for(const edge of edges)edge.to='home'+assignments[edge.id];
  return m;
}
export function mergePeople(model,a,b,name='Sam Chen'){
  const m=clone(model),ns=[a,b].map(id=>m.nodes.find(n=>n.id===id));
  if(a===b||ns.some(n=>n?.type!=='Person'))throw Error('Select two Person nodes.');
  const id=ns.some(n=>n.id.startsWith('sam'))?'sam':a;
  m.nodes=m.nodes.filter(n=>![a,b].includes(n.id));m.nodes.push({id,type:'Person',label:name});
  for(const e of m.edges)if([a,b].includes(e.from))e.from=id;return m;
}
export function relabelCredit(model,id,kind){
  if(!['ACTED_IN','DIRECTED','WORKED_ON'].includes(kind))throw Error('Unknown credit relationship.');
  const m=clone(model),e=m.edges.find(e=>e.id===id);if(!e)throw Error('Unknown record.');e.kind=kind;return m;
}
function identitiesMatch(m,side){
  const field=side==='person'?'from':'to',type=side==='person'?'Person':'Film';
  const grouped=new Map(),used=new Map();
  for(const r of records){
    const e=m.edges.find(e=>e.id===r.id),n=m.nodes.find(n=>n.id===e?.[field]);
    if(n?.type!==type)return false;
    if(grouped.has(r[side])&&grouped.get(r[side])!==n.id)return false;
    if(used.has(n.id)&&used.get(n.id)!==r[side])return false;
    if(side==='film'&&(n.label!==r.title||n.year!==r.year))return false;
    grouped.set(r[side],n.id);used.set(n.id,r[side]);
  }
  return true;
}
export function checkStage(m,stage){
  if(stage==='films')return {ok:identitiesMatch(m,'film'),message:identitiesMatch(m,'film')?lab.filmsFixed:lab.filmMismatch};
  if(stage==='people')return {ok:identitiesMatch(m,'person'),message:identitiesMatch(m,'person')?lab.peopleFixed:lab.personMismatch};
  const ok=identitiesMatch(m,'film')&&identitiesMatch(m,'person')&&records.every(r=>m.edges.find(e=>e.id===r.id)?.kind===r.kind);
  return {ok,message:ok?lab.creditsFixed:lab.creditMismatch};
}
export function queryResults(m){
  const edges=m.edges,people=m.nodes.filter(n=>n.type==='Person'),films=m.nodes.filter(n=>n.type==='Film');
  const personKeys=n=>new Set(edges.filter(e=>e.from===n.id).map(e=>records.find(r=>r.id===e.id).person));
  const bySource=k=>people.filter(n=>personKeys(n).has(k)).map(n=>n.id);
  const alex=bySource('alex'),sam=bySource('sam'),jordan=bySource('jordan');
  const shared=films.filter(f=>f.label==='Home'&&edges.some(e=>alex.includes(e.from)&&e.to===f.id)&&edges.some(e=>sam.includes(e.from)&&e.to===f.id)).map(f=>`${f.label} (${f.year})`);
  const both=people.filter(n=>edges.some(e=>e.from===n.id&&e.kind==='ACTED_IN')&&edges.some(e=>e.from===n.id&&e.kind==='DIRECTED')).map(n=>n.label).sort();
  const selected=films.filter(f=>f.label==='Home'&&f.year===2020).map(f=>f.id);
  const directors=[...new Set(edges.filter(e=>selected.includes(e.to)&&e.kind==='DIRECTED').map(e=>label(m,e.from)))].sort();
  const directed=edges.filter(e=>jordan.includes(e.from)&&e.kind==='DIRECTED').map(e=>e.to);
  const cast=[...new Set(edges.filter(e=>directed.includes(e.to)&&e.kind==='ACTED_IN').map(e=>label(m,e.from)))].sort();
  return [shared,both,directors,cast].map((rows,i)=>({...lab.querySpecs[i],rows}));
}
export function completedModel(){
  let m=splitFilm(initialModel(),'home',{r1:'2010',r2:'2020',r3:'2010',r4:'2020',r5:'2020'});
  m=mergePeople(m,'sam-acting','sam-directing');for(const r of records)m=relabelCredit(m,r.id,r.kind);return m;
}
export function evidenceContext(m){
  const directors=m.edges.filter(e=>e.kind==='DIRECTED'&&m.edges.some(s=>s.from===e.from&&records.find(r=>r.id===s.id)?.person==='jordan'));
  const acted=m.edges.filter(e=>e.kind==='ACTED_IN'&&directors.some(d=>d.to===e.to));
  return [...directors.filter(d=>acted.some(a=>a.to===d.to)),...acted].map(e=>({...e,person:label(m,e.from),film:label(m,e.to),year:m.nodes.find(n=>n.id===e.to)?.year}));
}
export const completedOntology=()=>({classes:['Person','Film'],actedFrom:'Person',actedTo:'Film',directedFrom:'Person',directedTo:'Film',name:'Person',title:'Film',year:'Film'});
export function checkOntology(o){const target=completedOntology();return {ok:Array.isArray(o.classes)&&o.classes.length===2&&target.classes.every(c=>o.classes.includes(c))&&Object.keys(target).filter(k=>k!=='classes').every(k=>o[k]===target[k])};}
function canonicalModel(m){
  const map=Object.fromEntries(m.nodes.map(n=>{const e=m.edges.find(e=>n.type==='Person'?e.from===n.id:e.to===n.id),r=records.find(r=>r.id===e?.id);return [n.id,r?r[n.type==='Person'?'person':'film']:n.id];}));
  return {nodes:m.nodes.map(n=>({...n,id:map[n.id]})),edges:m.edges.map(e=>({...e,from:map[e.from],to:map[e.to]}))};
}
export function toTurtle(m,o){
  if(!checkStage(m,'credits').ok||!checkOntology(o).ok)throw Error('Complete the graph and ontology before exporting.');
  const c=canonicalModel(m),lines=[
    '@prefix ex: <https://example.org/film/> .','@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .','@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .','',
    'ex:Person a rdfs:Class .','ex:Film a rdfs:Class .',
    ...['actedIn','directed'].map(k=>`ex:${k} a rdf:Property ; rdfs:domain ex:Person ; rdfs:range ex:Film .`),
    'ex:name a rdf:Property ; rdfs:domain ex:Person ; rdfs:range xsd:string .',
    'ex:title a rdf:Property ; rdfs:domain ex:Film ; rdfs:range xsd:string .',
    'ex:year a rdf:Property ; rdfs:domain ex:Film ; rdfs:range xsd:integer .',''
  ];
  for(const n of c.nodes)lines.push(n.type==='Person'?`ex:${n.id} a ex:Person ; ex:name ${JSON.stringify(n.label)} .`:`ex:${n.id} a ex:Film ; ex:title ${JSON.stringify(n.label)} ; ex:year ${n.year} .`);
  for(const e of c.edges)lines.push(`ex:${e.from} ex:${e.kind==='ACTED_IN'?'actedIn':'directed'} ex:${e.to} .`);return lines.join('\n')+'\n';
}
export function pythonSetup(m){
  const c=canonicalModel(m),lines=['import networkx as nx','G = nx.MultiDiGraph()',''];
  for(const n of c.nodes)lines.push(n.type==='Person'?`G.add_node(${JSON.stringify(n.id)}, type="Person", name=${JSON.stringify(n.label)})`:`G.add_node(${JSON.stringify(n.id)}, type="Film", title=${JSON.stringify(n.label)}, year=${n.year})`);
  lines.push('');for(const e of c.edges)lines.push(`G.add_edge(${JSON.stringify(e.from)}, ${JSON.stringify(e.to)}, kind=${JSON.stringify(e.kind)})`);return lines.join('\n');
}
export function toPython(m){
  if(!checkStage(m,'credits').ok)throw Error('Complete the graph before exporting.');
  return '# Install: pip install networkx\n'+pythonSetup(m)+'\n\n'+lab.querySpecs.map(q=>'# '+q.title+'\n'+q.python+'\nprint('+JSON.stringify(q.id)+', result)').join('\n\n')+'\n';
}
