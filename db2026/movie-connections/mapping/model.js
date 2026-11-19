import {catalog, directory, keyFields, namespace, schedule} from './data.js';

const compact = code => code.replace(/\s/g, '');
const courseId = row => 'course/' + compact(row.course_code);
const personId = row => 'person/' + row.staff_id;
const classNames = ['Course','Section','Person'];
const properties = [
  ['code','Course','xsd:string'],
  ['title','Course','xsd:string'],
  ['term','Section','xsd:string'],
  ['sectionNumber','Section','xsd:string'],
  ['staffId','Person','xsd:string'],
  ['name','Person','xsd:string'],
  ['sectionOf','Section','lab:Course'],
  ['taughtBy','Section','lab:Person'],
];

export function buildGraph(rules) {
  const index = new Map();
  const sections = new Map();
  const courseLinks = [];
  const instructorValues = [];
  const columns = keyFields.filter(key => rules.sectionKey.includes(key));

  function add(subject, predicate, object, source, kind = 'literal') {
    const key = JSON.stringify([subject,predicate,object,kind]);
    if (!index.has(key)) index.set(key,{subject,predicate,object,kind,sources:[]});
    const fact = index.get(key);
    if (!fact.sources.includes(source)) fact.sources.push(source);
  }

  for (const row of catalog) {
    add(courseId(row),'type','Course',row.row,'class');
    add(courseId(row),'code',row.course_code,row.row);
    add(courseId(row),'title',row.title,row.row);
  }
  for (const row of directory) {
    add(personId(row),'type','Person',row.row,'class');
    add(personId(row),'staffId',row.staff_id,row.row);
    add(personId(row),'name',row.name,row.row);
  }

  const compare = rules.courseMatch === 'normalized' ? compact : code => code;
  for (const row of schedule) {
    if (!columns.length) continue;
    const parts = columns.map(column => row[column]);
    const subject = 'section/' + parts.map(encodeURIComponent).join('/');
    if (!sections.has(subject)) sections.set(subject,{id:subject, parts, rows:[]});
    sections.get(subject).rows.push(row.row);
    add(subject,'type','Section',row.row,'class');
    add(subject,'term',row.term,row.row);
    add(subject,'sectionNumber',row.section_no,row.row);

    const course = catalog.find(c => compare(c.course_code) === compare(row.course_ref));
    if (course) {
      add(subject,'sectionOf',courseId(course),row.row,'link');
      courseLinks.push({schedule:row.row, catalog:course.row, code:course.course_code});
    }

    if (rules.instructor === 'text') {
      add(subject,'instructorRef',row.instructor_ref,row.row);
      instructorValues.push({schedule:row.row, subject:'Section', value:row.instructor_ref});
      continue;
    }
    const person = directory.find(p => p.staff_id === row.instructor_ref);
    if (!person || (rules.instructor === 'courseLink' && !course)) continue;
    const owner = rules.instructor === 'courseLink' ? courseId(course) : subject;
    add(owner,'taughtBy',personId(person),row.row,'link');
    instructorValues.push({
      schedule:row.row, subject:rules.instructor === 'courseLink' ? course.course_code : 'Section',
      person:person.row, staff:person.staff_id, value:person.name
    });
  }
  return {triples:[...index.values()], sections:[...sections.values()], courseLinks, instructorValues};
}

export function queryInstructors(graph, {term, course, section}) {
  const facts = (subject, predicate, object) => graph.triples.filter(f =>
    f.subject === subject && f.predicate === predicate && (object === undefined || f.object === object));
  const answers = new Map();
  for (const {id} of graph.sections) {
    const [termFact] = facts(id,'term',term);
    const [numberFact] = facts(id,'sectionNumber',section);
    if (!termFact || !numberFact) continue;
    for (const courseFact of facts(id,'sectionOf')) {
      const [codeFact] = facts(courseFact.object,'code',course);
      if (!codeFact) continue;
      for (const instructorFact of facts(id,'taughtBy')) {
        const [nameFact] = facts(instructorFact.object,'name');
        const [staffFact] = facts(instructorFact.object,'staffId');
        if (!nameFact || !staffFact) continue;
        const evidence = [codeFact, termFact, numberFact, courseFact, instructorFact, nameFact, staffFact];
        const entry = answers.get(staffFact.object) ?? {name:nameFact.object, staff:staffFact.object, paths:[]};
        entry.paths.push({section:id, facts:evidence});
        answers.set(staffFact.object,entry);
      }
    }
  }
  return [...answers.values()]
    .map(answer => ({
      ...answer,
      sources:[...new Set(answer.paths.flatMap(path => path.facts.flatMap(fact => fact.sources)))].sort(),
    }))
    .sort((a,b) => a.name.localeCompare(b.name) || a.staff.localeCompare(b.staff));
}

export function toSparql({term, course, section}) {
  return [
    `PREFIX lab: <${namespace}>`,
    'SELECT DISTINCT ?name ?staff WHERE {',
    '  ?section a lab:Section ;',
    `      lab:term ${JSON.stringify(term)} ;`,
    `      lab:sectionNumber ${JSON.stringify(section)} ;`,
    '      lab:sectionOf ?course ;',
    '      lab:taughtBy ?person .',
    `  ?course lab:code ${JSON.stringify(course)} .`,
    '  ?person lab:name ?name ; lab:staffId ?staff .',
    '} ORDER BY ?name ?staff',
  ].join('\n');
}

export function toTurtle(graph) {
  const resource = value => `<${namespace}${value}>`;
  const term = (value,kind) => kind === 'class' ? 'lab:' + value :
    kind === 'link' ? resource(value) : JSON.stringify(value);
  return [
    `@prefix lab: <${namespace}> .`,
    '@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .',
    '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
    '',
    ...classNames.map(name => `lab:${name} a rdfs:Class .`),
    ...properties.map(([name,domain,range]) => `lab:${name} a rdf:Property ; rdfs:domain lab:${domain} ; rdfs:range ${range} .`),
    '',
    ...graph.triples.map(f => `${resource(f.subject)} ${f.predicate === 'type' ? 'a' : 'lab:' + f.predicate} ${term(f.object,f.kind)} .`),
    '',
  ].join('\n');
}

export function toPython({term, course, section}) {
  return [
    'from rdflib import Graph, Literal, Namespace, RDF',
    '',
    'graph = Graph().parse("registrar-graph.ttl", format="turtle")',
    `lab = Namespace("${namespace}")`,
    `term = Literal(${JSON.stringify(term)})`,
    `number = Literal(${JSON.stringify(section)})`,
    `code = Literal(${JSON.stringify(course)})`,
    'answers = set()',
    '',
    'for offering in graph.subjects(RDF.type, lab.Section):',
    '    if (offering, lab["term"], term) not in graph:',
    '        continue',
    '    if (offering, lab.sectionNumber, number) not in graph:',
    '        continue',
    '    courses = graph.objects(offering, lab.sectionOf)',
    '    if not any((course, lab.code, code) in graph for course in courses):',
    '        continue',
    '    for person in graph.objects(offering, lab.taughtBy):',
    '        name = graph.value(person, lab.name)',
    '        staff = graph.value(person, lab.staffId)',
    '        if name is not None and staff is not None:',
    '            answers.add((str(name), str(staff)))',
    '',
    'for name, staff in sorted(answers):',
    '    print(name, staff)',
    '',
  ].join('\n');
}
