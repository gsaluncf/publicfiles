import {courses, namespace, queries} from './game-data.js';

const required = 'prerequisiteFor';
const recommended = 'recommendedFor';
export const courseTitle = id => courses.find(course => course.id === id).title;

export function graphFor(step, solved) {
  const edges = [
    {from:'programming', to:'sql', kind:required},
    {from:'statistics', to:'databases', kind:required},
    {from:'databases', to:'pipelines', kind:required}
  ];
  if (step > 1 || (step === 1 && solved)) {
    edges.push({from:'sql', to:'databases', kind:required});
  }
  if (step > 2 || (step === 2 && solved)) {
    edges.find(edge => edge.from === 'statistics').kind = recommended;
  }
  return edges;
}

export function precedingCourses(edges, target, kind = required) {
  return edges.filter(edge => edge.to === target && edge.kind === kind)
    .map(edge => edge.from);
}

export function prerequisitePath(edges, target) {
  const path = [];
  const visited = new Set([target]);
  const pending = [target];
  while (pending.length) {
    const course = pending.pop();
    for (const edge of edges.filter(edge => edge.to === course && edge.kind === required)) {
      path.push(edge);
      if (visited.has(edge.from)) continue;
      visited.add(edge.from);
      pending.push(edge.from);
    }
  }
  return path.reverse();
}

export function queryAnswers(edges) {
  const titles = ids => Array.from(new Set(ids), courseTitle).sort();
  return {
    direct: titles(precedingCourses(edges, 'databases')),
    indirect: titles(prerequisitePath(edges, 'pipelines').map(edge => edge.from)),
    recommended: titles(precedingCourses(edges, 'databases', recommended))
  };
}

export function toPython(edges) {
  const nodeRows = courses.map(c => `    (${JSON.stringify(c.id)}, {"title": ${JSON.stringify(c.title)}, "code": ${JSON.stringify(c.code)}})`);
  const pairs = kind => edges.filter(e => e.kind === kind)
    .map(e => `    (${JSON.stringify(e.from)}, ${JSON.stringify(e.to)})`);
  return [
    '# Install NetworkX with: pip install networkx',
    'import networkx as nx',
    '',
    'G = nx.DiGraph()',
    'G.add_nodes_from([', nodeRows.join(',\n'), '])',
    'G.add_edges_from([', pairs(required).join(',\n'), '])',
    'recommended = [', pairs(recommended).join(',\n'), ']',
    ...queries.flatMap(q => ['', '# '+q.title, q.python, `print(${JSON.stringify(q.id)}, result)`])
  ].join('\n') + '\n';
}

export function toTurtle(edges) {
  return [
    `@prefix ex: <${namespace}> .`,
    '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
    '',
    'ex:Course a rdfs:Class .',
    ...['code','title'].map(p => `ex:${p} a rdf:Property ; rdfs:domain ex:Course ; rdfs:range xsd:string .`),
    ...[required, recommended].map(p => `ex:${p} a rdf:Property ; rdfs:domain ex:Course ; rdfs:range ex:Course .`),
    '',
    ...courses.map(c => `ex:${c.id} a ex:Course ; ex:code ${JSON.stringify(c.code)} ; ex:title ${JSON.stringify(c.title)} .`),
    ...edges.map(e => `ex:${e.from} ex:${e.kind} ex:${e.to} .`)
  ].join('\n') + '\n';
}
