export const sources = {
  neo4j: {label:'Neo4j movie graph',url:'https://neo4j.com/docs/getting-started/cypher/intro-tutorial/'},
  cs50: {label:'Harvard CS50: Degrees',url:'https://cs50.harvard.edu/ai/projects/0/degrees/'},
  graphrag: {label:'GraphRAG: graph facts as context',url:'https://microsoft.github.io/graphrag/query/local_search/'}
};
export const nodes = Object.fromEntries([
  ['hanks','Person','Tom Hanks'], ['bacon','Person','Kevin Bacon'],
  ['lawrence','Person','Jennifer Lawrence'], ['hugo','Person','Hugo Weaving'],
  ['keanu','Person','Keanu Reeves'], ['lana','Person','Lana Wachowski'],
  ['liv','Person','Liv Tyler'], ['charlize','Person','Charlize Theron'],
  ['apollo','Film','Apollo 13',1995], ['xmen','Film','X-Men: First Class',2011],
  ['cloud','Film','Cloud Atlas',2012], ['matrix','Film','The Matrix',1999],
  ['thatthing','Film','That Thing You Do',1996], ['devils','Film',"The Devil's Advocate",1997]
].map(([id,type,label,year])=>[id,{id,type,label,year}]));
export const credits = [
  ['hanks-apollo-act','hanks','apollo','ACTED_IN','neo4j'],
  ['bacon-apollo-act','bacon','apollo','ACTED_IN','neo4j'],
  ['lawrence-xmen-act','lawrence','xmen','ACTED_IN','cs50'],
  ['bacon-xmen-act','bacon','xmen','ACTED_IN','cs50'],
  ['hanks-cloud-act','hanks','cloud','ACTED_IN','neo4j'],
  ['hugo-cloud-act','hugo','cloud','ACTED_IN','neo4j'],
  ['lana-cloud-direct','lana','cloud','DIRECTED','neo4j'],
  ['keanu-matrix-act','keanu','matrix','ACTED_IN','neo4j'],
  ['hugo-matrix-act','hugo','matrix','ACTED_IN','neo4j'],
  ['lana-matrix-direct','lana','matrix','DIRECTED','neo4j'],
  ['hanks-thatthing-act','hanks','thatthing','ACTED_IN','neo4j'],
  ['hanks-thatthing-direct','hanks','thatthing','DIRECTED','neo4j'],
  ['liv-thatthing-act','liv','thatthing','ACTED_IN','neo4j'],
  ['charlize-thatthing-act','charlize','thatthing','ACTED_IN','neo4j'],
  ['keanu-devils-act','keanu','devils','ACTED_IN','neo4j'],
  ['charlize-devils-act','charlize','devils','ACTED_IN','neo4j']
].map(([id,person,film,kind,source])=>({id,person,film,kind,source}));

export const originalRounds = [
  {id:'shared',title:'A shared film',question:'Which film connects Tom Hanks and Kevin Bacon?',
    instruction:'Tom Hanks is the start. Tap a connected film, then Kevin Bacon.',
    nodes:['hanks','bacon','hugo','apollo','cloud'],start:'hanks',goal:'bacon',allowed:['ACTED_IN'],
    rule:'Acting credits',explanation:'A neighbor is a directly connected node. Apollo 13 is a shared neighbor because both people have an acting credit on that film. Two acting credits connect the two people through that film.'},
  {id:'path',title:'A longer connection',question:'Connect Jennifer Lawrence to Tom Hanks.',
    instruction:'Follow the credits from person to film to person. Find the shortest route.',
    nodes:['lawrence','bacon','hanks','hugo','xmen','apollo','cloud'],start:'lawrence',goal:'hanks',allowed:['ACTED_IN'],
    rule:'Acting credits',explanation:'Kevin Bacon acted in X-Men: First Class and in Apollo 13. Four credits form a path through X-Men: First Class and Apollo 13.'},
  {id:'shortest',title:'A shorter path',question:'Can you shorten the route from Keanu Reeves to Hugo Weaving?',
    instruction:'A six-credit route is selected. Reset the route or tap an earlier route step to find a shorter one.',
    nodes:['keanu','charlize','hanks','hugo','matrix','devils','thatthing','cloud'],start:'keanu',goal:'hugo',allowed:['ACTED_IN'],
    rule:'Fewest acting credits',explanation:'The Matrix is on a two-credit path between Keanu Reeves and Hugo Weaving. A shortest path has the fewest credits among the valid routes.',
    initialPath:{nodes:['keanu','devils','charlize','thatthing','hanks','cloud','hugo'],edges:['keanu-devils-act','charlize-devils-act','charlize-thatthing-act','hanks-thatthing-act','hanks-cloud-act','hugo-cloud-act']}},
  {id:'types',title:'Acting and directing',question:'Connect Keanu Reeves to Tom Hanks using acting credits.',
    instruction:'The graph also contains directing credits. Check the relationship used at each step.',
    nodes:['keanu','hugo','lana','hanks','matrix','cloud'],start:'keanu',goal:'hanks',allowed:['ACTED_IN'],
    rule:'Acting credits only',explanation:'Hugo Weaving acted in The Matrix and in Cloud Atlas. A directing credit describes a different relationship.',
    relationshipFeedback:'Incorrect. This route includes a directing credit. The question requires acting credits at every step.'},
  {id:'roles',title:'One person, two roles',question:"Connect Tom Hanks to Liv Tyler through Tom Hanks's directing credit.",
    instruction:'Tom Hanks has two credits on the same film. Choose which credit the route uses.',
    nodes:['hanks','liv','charlize','keanu','thatthing','devils'],start:'hanks',goal:'liv',pattern:['DIRECTED','ACTED_IN'],
    rule:'Directed, then acted in',explanation:'Tom Hanks acted in and directed That Thing You Do. One Person node can have both relationships. Liv Tyler has an acting credit on that film.',
    relationshipFeedback:"Incorrect. The first step must use Tom Hanks's directing credit. The second step uses Liv Tyler's acting credit."},
  {id:'evidence',title:'Evidence for an answer',question:'How are Lana Wachowski and Tom Hanks connected?',
    instruction:'Build the shortest credit path, then compare its facts with the example answer.',
    nodes:['lana','hanks','hugo','keanu','cloud','matrix'],start:'lana',goal:'hanks',allowed:['ACTED_IN','DIRECTED'],
    rule:'Acting or directing credits',claim:'Lana Wachowski and Tom Hanks acted together in Cloud Atlas.',
    explanation:'Lana Wachowski directed Cloud Atlas. Tom Hanks acted in that film. The example answer incorrectly changes a directing credit into an acting credit.',
    answer:'Lana Wachowski directed Cloud Atlas. Tom Hanks acted in that film.'}
].map(r=>({...r,requireShortest:true}));
export const rounds=originalRounds.slice(0,2);

export const copy = {
  title:'Movie connections',progress:'Step {current} of {total}',solvedProgress:'{count} of {total} solved',
  help:'How to play',credits:'Credits',close:'Close',undo:'Undo',reset:'Reset route',check:'Check connection',next:'Next puzzle',finish:'See results',replay:'Play again',
  soundOff:'Sound off',soundOn:'Sound on',start:'Start',target:'Target',person:'Person',film:'Film',
  acted:'Acted in',directed:'Directed',route:'Your route',routeEmpty:'Choose a connected node to extend the route.',
  routeCount:'{count} credits selected',current:'Current node: {name}',
  correct:'Correct. The route is a shortest valid path.',longer:'This route is valid. A shorter route exists in this graph. Try a route with fewer credits.',
  incomplete:'Continue the route to {name}.',cycle:'This route revisits a node. Tap an earlier route step to shorten it.',
  invalid:'No credit in this graph matches these steps.',
  noConnection:'No displayed credit connects {from} and {to}. Choose a connected node.',
  chooseCredit:'Which credit connects these nodes?',chooseCreditHelp:'The same person and film have two different relationships.',
  selectedFacts:'Selected facts',factsEmpty:'Selected credits appear here as statements.',
  graphLabel:'Movie graph. Choose connected person and film nodes to build a route.',
  nodeLabel:'{name}, {type}{year}{role}',nodeRoleStart:', start',nodeRoleTarget:', target',
  nodeRoleCurrent:', current node',nodeRoleSelected:', selected',creditLabel:'Inspect credit: {statement}',
  legend:'Node types and relationships',creditsHelp:'Each record is one person-to-film relationship. Tap a record to highlight its link.',
  nextHint:'Connected nodes have a blue outline. The gold outline marks the target.',
  helpTitle:'Connect people through film credits',
  helpSteps:['The question names a start, a target, and the relationships allowed.','Tap connected nodes to build a route. Tap an earlier route step to undo later steps.','Check the connection. The selected credits explain the answer.'],
  helpMeaning:'Each link is one credit. A route from a person through a film to another person uses two credits.',
  ontologyTitle:'Types and relationships',ontologyText:'An ontology defines entity types and relationship meanings. Person and Film are the two types in this graph. Acting and directing connect a Person to a Film.',
  arrowText:'Arrows point from the person to the film. A route can follow a credit in either direction.',
  exampleAnswer:'Example answer',supportedAnswer:'Answer supported by these credits',
  llmTitle:'Graph facts as context',llmText:'A large language model (LLM) can use selected graph facts as context when producing an answer. A credit\'s relationship type determines which claims that credit supports.',
  completeTitle:'Six connections explained',completeText:'The puzzles use shared neighbors, shortest paths, and relationship types. Each answer uses the credits on its route.',
  resultsTitle:'Your connections',resultsLinks:'{count} credits',resume:'Continue',
  sources:'Sources',sourcesTitle:'Exercises and records',sourceText:'The introductory person and film credits come from the Neo4j and CS50 datasets. The GraphRAG page describes graph facts used as context. Route lengths refer to the graph displayed in each puzzle.',
  inspectTitle:'Credit selected',inspectHint:'The highlighted arrow connects this person to this film.',
  saved:'Your progress is saved in this browser.'
};

export const records=[
  ['r1','alex','Alex Rivera','home2010','Home',2010,'ACTED_IN'],
  ['r2','sam','Sam Chen','home2020','Home',2020,'ACTED_IN'],
  ['r3','jordan','Jordan Lee','home2010','Home',2010,'DIRECTED'],
  ['r4','priya','Priya Shah','home2020','Home',2020,'DIRECTED'],
  ['r5','priya','Priya Shah','home2020','Home',2020,'ACTED_IN'],
  ['r6','alex','Alex Rivera','orbit2018','Orbit',2018,'ACTED_IN'],
  ['r7','sam','Sam Chen','orbit2018','Orbit',2018,'DIRECTED']
].map(([id,person,name,film,title,year,kind])=>({id,person,name,film,title,year,kind}));

export const lab={
  title:'Film graph workshop',start:'Edit the graph',
  step:'Step {current} of {total}',credit:'Credit',personID:'Person ID',filmID:'Film ID',allRecords:'All source records',
  recordNote:'Practice records. These people and films are fictional.',
  records:'Source records',recordHelp:'Each record gives a person ID, a film ID, and a credit. A person ID identifies one person across records. A film ID identifies one film across records.',
  graph:'Your graph',ontology:'Ontology',queries:'Query results',
  queryHelp:'These results come from your current graph. The application runs all four queries after each edit.',
  empty:'No matches in this graph.',changed:'Changed',
  undo:'Undo edit',reset:'Reset this step',check:'Check model',next:'Continue',
  correct:'Correct.',incorrect:'Incorrect.',select:'Select nodes to edit.',
  split:'Split film',merge:'Merge people',apply:'Apply edit',
  selected:'Selected nodes',chooseTwo:'Select two Person nodes to merge.',
  splitSource:'Move each credit',splitExample:'Example',
  splitChoose:'Choose a film',splitApply:'Split Home',
  splitLabel:'Film for {name}, credit {id}',
  splitError:'This credit lists Home ({year}). Choose that release.',
  splitComplete:'Each Home credit now links to the film listed in its source record. Alex Rivera and Sam Chen have credits on different releases.',
  mergeHelp:'Both records must identify the same person. All credits move to the merged node.',
  merged:'Merged person name',personMismatch:'The merged node combines different person IDs. Undo the merge and compare the records.',
  filmMismatch:'Each film ID must belong to one node. Each node must contain one film ID. Compare the film IDs in the source records.',
  filmsFixed:'Home (2010) and Home (2020) now have separate nodes. Alex’s Home credit is on Home (2010). Sam’s Home credit is on Home (2020).',
  peopleFixed:'Sam Chen now has one Person node. Sam Chen’s credits on Home (2020) and Orbit (2018) connect to that node.',
  creditMismatch:'One or more links still differ from their source credit. Check the person, film, and relationship on each record.',
  creditsFixed:'Every link now matches its source credit. Priya has two different relationships to Home (2020).',
  creditHelp:'A relationship names how two entities are connected. Replace each worked-on link with the credit in its source record.',
  worked:'Worked on',acted:'Acted in',directed:'Directed',
  ontologyIntro:'An ontology defines classes, properties, and their meanings. A class groups entities of the same kind. The graph contains individual people and films.',
  classHelp:'Use Person and Film as the classes in this model. Represent acting and directing with relationships.',
  classes:'Classes',relationships:'Relationship directions',properties:'Literal properties',
  propertyHelp:'A literal is a value such as a name or year. Assign each property to its class.',
  directionHelp:'Acting and directing each connect a Person to a Film. Set the source and target class for each relationship.',
  ontologyMismatch:'Check the classes, the relationship directions, and the class that has each property.',
  ontologyFixed:'The ontology defines Person and Film. Both credit relationships go from Person to Film. Names are text. Film titles are text. Years are integers.',
  domainHelp:'The source class is the domain. The target class is the range. In RDF Schema, these declarations imply types. The record check compares each credit with its source.',
  classCount:'{count} individuals',none:'Choose a class',from:'From',to:'To',name:'name',filmTitle:'title',year:'year',text:'text',integer:'integer',
  evidenceTitle:'Graph facts for an LLM',
  evidenceIntro:'A large language model (LLM) can receive selected graph facts with a question. The selected facts are the credits that match the question.',
  evidenceQuestion:'Who acted in a film directed by Jordan Lee?',
  context:'Selected graph facts',answer:'Answer supported by these records',
  supported:'Alex Rivera acted in Home (2010), which Jordan Lee directed.',
  unsupported:'The records do not establish that Alex Rivera and Jordan Lee are friends. The records describe Alex’s acting credit and Jordan’s directing credit.',
  evidenceChoice:'Which claim do these facts support?',
  choices:['Alex Rivera acted in a film directed by Jordan Lee.','Alex Rivera and Jordan Lee are friends.','Jordan Lee acted in Home (2010).'],
  evidenceWrong:'Incorrect. Keep each credit relationship in the answer. Jordan directed the film. Alex acted in it.',
  examplesTitle:'Queries in SPARQL and Python',
  examplesIntro:'SPARQL matches patterns in an RDF graph. RDF stores statements as subject, predicate, and object. Python uses NetworkX to follow the same relationships.',
  sparqlHelp:'The ex: prefix names this dataset. A question mark marks a variable. Shared variables must match the same entity. SELECT returns the requested values.',
  pythonHelp:'The Python graph uses MultiDiGraph. Directed edges preserve credit direction. Parallel edges preserve acting and directing credits between the same person and film.',
  runHelp:'The query results use your graph. The Python download contains the graph setup and all four executable queries.',
  setup:'Python graph setup',downloadPython:'Download Python',downloadRDF:'Download RDF',downloadJSON:'Download graph JSON',
  setupHelp:'Install NetworkX with pip install networkx. Each node ID identifies one entity. add_node assigns properties. add_edge assigns a named credit relationship.',
  ontologyMeaning:'The ontology view shows classes and property meanings. The graph view shows the people, films, and credits.',
  replay:'Start again',back:'Back',viewGraph:'View graph',viewOntology:'View ontology',
  stages:[
    {id:'films',title:'Separate films',question:'Split Home into two films',instruction:'The graph puts two films titled Home on one node. Use the year on each source credit to put it on the right film.'},
    {id:'people',title:'Combine person records',question:'Do Sam Chen and S. Chen identify the same person?',instruction:'Compare their source person IDs. Select the two nodes and merge their credits.'},
    {id:'credits',title:'Name the relationships',question:'Which credits mean acted in, and which mean directed?',instruction:'Edit the relationship on each link. Keep both of Priya’s credits.'},
    {id:'ontology',title:'Define the ontology',question:'Which types and properties describe this graph?',instruction:'Choose the classes, assign relationship directions, and assign literal properties.'},
    {id:'evidence',title:'Use graph evidence',question:'Which answer follows from these credits?',instruction:'Compare the selected graph facts with the three claims.'},
    {id:'examples',title:'Read the queries',question:'How do SPARQL and Python express these questions?',instruction:'Choose a question to compare the two queries and their results.'}
  ],
  querySpecs:[
    {id:'shared',title:'Which Home film has credits for both Alex and Sam?',meaning:'Two credit links must end at the same Film node. The film title must be Home.',
      sparql:`SELECT DISTINCT ?title ?year WHERE {
  ex:alex ?creditA ?film .
  ex:sam ?creditS ?film .
  VALUES ?creditA { ex:actedIn ex:directed ex:workedOn }
  VALUES ?creditS { ex:actedIn ex:directed ex:workedOn }
  ?film ex:title "Home" ; ex:title ?title ; ex:year ?year .
} ORDER BY ?year`,
      python:`alex_films = set(G.successors("alex"))
sam_films = set(G.successors("sam"))
shared = alex_films & sam_films
result = sorted(
    (G.nodes[f]["title"], G.nodes[f]["year"])
    for f in shared if G.nodes[f]["title"] == "Home"
)`},
    {id:'both',title:'Who has both an acting credit and a directing credit?',meaning:'The same Person must have both relationships. The films can be the same film or different films.',
      sparql:`SELECT DISTINCT ?name WHERE {
  ?person ex:actedIn ?actedFilm ; ex:directed ?directedFilm .
  ?person ex:name ?name .
} ORDER BY ?name`,
      python:`actors = {p for p, f, d in G.edges(data=True)
          if d["kind"] == "ACTED_IN"}
directors = {p for p, f, d in G.edges(data=True)
             if d["kind"] == "DIRECTED"}
result = sorted(G.nodes[p]["name"] for p in actors & directors)`},
    {id:'directors',title:'Who directed Home (2020)?',meaning:'A directing relationship must end at the film whose title is Home and whose year is 2020.',
      sparql:`SELECT DISTINCT ?name WHERE {
  ?person ex:directed ?film ; ex:name ?name .
  ?film ex:title "Home" ; ex:year 2020 .
} ORDER BY ?name`,
      python:`films = {f for f, d in G.nodes(data=True)
         if d.get("title") == "Home" and d.get("year") == 2020}
result = sorted({G.nodes[p]["name"]
    for p, f, d in G.edges(data=True)
    if f in films and d["kind"] == "DIRECTED"})`},
    {id:'cast',title:'Who acted in a film directed by Jordan Lee?',meaning:'The directing link and acting link must end at the same Film node.',
      sparql:`SELECT DISTINCT ?name WHERE {
  ex:jordan ex:directed ?film .
  ?person ex:actedIn ?film ; ex:name ?name .
} ORDER BY ?name`,
      python:`films = {f for p, f, d in G.out_edges("jordan", data=True)
         if d["kind"] == "DIRECTED"}
result = sorted({G.nodes[p]["name"]
    for p, f, d in G.edges(data=True)
    if f in films and d["kind"] == "ACTED_IN"})`}
  ]
};
