export const namespace = 'https://example.org/courses/';

export const courses = [
  {id:'programming', code:'CS 101', title:'Programming', column:1, row:1},
  {id:'sql', code:'CS 120', title:'SQL', column:1, row:2},
  {id:'statistics', code:'STAT 110', title:'Statistics', column:2, row:1},
  {id:'databases', code:'CS 240', title:'Databases', column:2, row:2},
  {id:'pipelines', code:'CS 310', title:'Data Pipelines', column:2, row:3}
];

export const relationships = {
  prerequisiteFor: {label:'Required before', sentence:'is required before'},
  recommendedFor: {label:'Recommended before', sentence:'is recommended before'}
};

export const stages = [
  {
    title:'Read an arrow',
    prompt:'Which course is required before SQL?',
    help:'Each box represents a course. A solid arrow points from a prerequisite to the course that requires it.',
    feedback:'Programming is the prerequisite. Its arrow points to SQL.',
    action:'Check answer'
  },
  {
    title:'Add a prerequisite',
    prompt:'Which arrow is missing?',
    help:'Choose the course that should point to Databases.',
    record:'Databases requires SQL.',
    feedback:'SQL now points to Databases. The graph shows the path from Programming through SQL to Databases.',
    action:'Add arrow'
  },
  {
    title:'Label a recommendation',
    prompt:'How should Statistics connect to Databases?',
    help:'Change the label on the Statistics arrow to match the catalog.',
    record:'Databases recommends Statistics as preparation. The only prerequisite is SQL.',
    feedback:'The dashed arrow marks Statistics as recommended. The solid arrow from SQL marks the prerequisite.',
    action:'Update arrow'
  },
  {
    title:'Define the ontology',
    prompt:'How should the graph represent its courses and arrows?',
    help:'An ontology defines what the nodes and relationships mean. Statistics and SQL are both courses. Their arrows into Databases describe different relationships.',
    feedback:'Course is the node type. The two arrow labels distinguish prerequisites from recommendations.',
    action:'Check model',
    choices:['Use Course as the node type and give the two relationships different labels.','Use Required Course and Recommended Course as node types and give every relationship the same label.']
  },
  {
    title:'Use the graph as evidence',
    prompt:'Which answer can an AI assistant support with these arrows?',
    help:'The assistant receives the facts on the required path to Data Pipelines.',
    feedback:'Programming comes before SQL. SQL comes before Databases. Databases comes before Data Pipelines.',
    action:'Check answer',
    choices:['Programming is an indirect prerequisite for Data Pipelines.','Statistics is a prerequisite for Data Pipelines.','Programming directly connects to Data Pipelines.']
  },
  {
    title:'Query the graph',
    prompt:'Query the same arrows in SPARQL and Python',
    help:'SPARQL matches relationships in RDF. In Python, NetworkX follows prerequisite edges. A separate list holds the recommendation links.'
  }
];

export const copy = {
  catalog:'Example catalog',
  choose:'Choose a course',
  direct:'Direct prerequisites for Databases in this graph',
  evidence:'Facts supplied to the assistant',
  graph:'Course graph',
  noMatches:'No matching courses.',
  ontology:'Course ontology',
  codeProperty:'code: text',
  titleProperty:'title: text',
  selectQuery:'Question',
  results:'Result',
  prerequisiteHint:'Follow the solid arrow into SQL.',
  missingHint:'Read the catalog entry for Databases. Its prerequisite is the course at the start of the missing arrow.',
  recommendationHint:'The catalog lists Statistics as recommended preparation.',
  ontologyHint:'The course stays the same. The label on its arrow tells you what the relationship means.',
  evidenceHint:'Follow only the solid arrows. A direct prerequisite has one arrow to the target.',
  recommendation:'Recommended before',
  required:'Required before'
};

export const queries = [
  {
    id:'direct',
    title:'What does Databases require directly?',
    explanation:'One arrow connects each direct prerequisite to Databases. G contains only the prerequisite arrows.',
    sparql:'SELECT ?course WHERE {\n  ?id ex:prerequisiteFor ex:databases ;\n      ex:title ?course .\n} ORDER BY ?course',
    python:'required = G.predecessors("databases")\nresult = sorted(G.nodes[c]["title"] for c in required)'
  },
  {
    id:'indirect',
    title:'What comes before Data Pipelines?',
    explanation:'In SPARQL, + matches a path of one or more prerequisite arrows. NetworkX ancestors finds the nodes with a directed path to Data Pipelines.',
    sparql:'SELECT DISTINCT ?course WHERE {\n  ?id ex:prerequisiteFor+ ex:pipelines ;\n      ex:title ?course .\n} ORDER BY ?course',
    python:'required = nx.ancestors(G, "pipelines")\nresult = sorted(G.nodes[c]["title"] for c in required)'
  },
  {
    id:'recommended',
    title:'What does Databases recommend?',
    explanation:'This query uses the recommendation relationship.',
    sparql:'SELECT ?course WHERE {\n  ?id ex:recommendedFor ex:databases ;\n      ex:title ?course .\n} ORDER BY ?course',
    python:'result = sorted(\n    G.nodes[start]["title"] for start, end in recommended\n    if end == "databases"\n)'
  }
];
