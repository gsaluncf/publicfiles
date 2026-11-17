import {nodes, credits} from './game-data.js';

export function roundGraph(round){
  const ids=new Set(round.nodes);
  return {nodes:round.nodes.map(id=>nodes[id]),credits:credits.filter(e=>ids.has(e.person)&&ids.has(e.film))};
}
export function connections(graph,a,b){
  return graph.credits.filter(e=>(e.person===a&&e.film===b)||(e.person===b&&e.film===a));
}
export function creditSentence(e){
  return `${nodes[e.person].label} ${e.kind==='DIRECTED'?'directed':'acted in'} ${nodes[e.film].label} (${nodes[e.film].year}).`;
}
function permitted(round,edge,depth){
  return round.pattern ? round.pattern[depth]===edge.kind : round.allowed.includes(edge.kind);
}
export function shortestRoute(round){
  const graph=roundGraph(round),queue=[{nodes:[round.start],edges:[]}],seen=new Set();
  for(let i=0;i<queue.length;i++){
    const p=queue[i],last=p.nodes.at(-1);
    if(last===round.goal)return p;
    const key=round.pattern?`${last}:${p.edges.length}`:last;
    if(seen.has(key))continue;
    seen.add(key);
    for(const e of graph.credits){
      if(!permitted(round,e,p.edges.length))continue;
      const next=e.person===last?e.film:e.film===last?e.person:null;
      if(next&&!p.nodes.includes(next))queue.push({nodes:[...p.nodes,next],edges:[...p.edges,e.id]});
    }
  }
  return null;
}
export function evaluateRoute(round,path,edgeIds){
  const graph=roundGraph(round);
  if(!Array.isArray(path)||!Array.isArray(edgeIds)||path[0]!==round.start||edgeIds.length!==path.length-1)return {status:'invalid'};
  const selected=[];
  for(let i=0;i<edgeIds.length;i++){
    const e=connections(graph,path[i],path[i+1]).find(e=>e.id===edgeIds[i]);
    if(!e)return {status:'invalid'};
    selected.push(e);
  }
  if(new Set(path).size!==path.length)return {status:'cycle'};
  if(path.at(-1)!==round.goal)return {status:'incomplete'};
  const wrong=selected.filter((e,i)=>!permitted(round,e,i));
  if(wrong.length||(round.pattern&&edgeIds.length!==round.pattern.length))return {status:'relationship',wrong:wrong.map(e=>e.id)};
  const shortest=shortestRoute(round);
  if(!shortest)return {status:'invalid'};
  if(round.requireShortest&&edgeIds.length>shortest.edges.length)return {status:'longer',length:edgeIds.length,shortest:shortest.edges.length};
  return {status:'solved',length:edgeIds.length,shortest:shortest.edges.length};
}
