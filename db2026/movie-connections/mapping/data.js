export const namespace = 'https://example.org/registrar/';

export const catalog = [
  {row:'C1', course_code:'DB 240', title:'Databases'},
  {row:'C2', course_code:'DB 310', title:'Data Pipelines'},
];

export const schedule = [
  {row:'S1', term:'Fall 2026', course_ref:'DB240', section_no:'01', instructor_ref:'I17'},
  {row:'S2', term:'Spring 2027', course_ref:'DB240', section_no:'01', instructor_ref:'I42'},
  {row:'S3', term:'Spring 2027', course_ref:'DB240', section_no:'02', instructor_ref:'I42'},
  {row:'S4', term:'Spring 2027', course_ref:'DB310', section_no:'01', instructor_ref:'I17'},
];

export const directory = [
  {row:'D1', staff_id:'I17', name:'Maya Chen'},
  {row:'D2', staff_id:'I42', name:'Jordan Reyes'},
];

export const keyFields = ['term','course_ref','section_no'];
export const initialRules = {sectionKey:['section_no'], courseMatch:'exact', instructor:'text'};
export const initialQuestion = {course:'DB 240', term:'Spring 2027', section:'01'};

export const columns = {
  catalog:['row','course_code','title'],
  schedule:['row','term','course_ref','section_no','instructor_ref'],
  directory:['row','staff_id','name'],
};

export const labels = {
  row:'Row', term:'Term', course_ref:'Course ref', section_no:'Section no.',
  instructor_ref:'Instructor ref', course_code:'Course code', title:'Title',
  staff_id:'Staff ID', name:'Name',
};

export const stages = [
  {
    label:'Section IDs',
    title:'Choose the section ID',
    instruction:'Select the schedule columns that together identify one offering. Rows with the same ID become one node.',
    next:'Map course links'
  },
  {
    label:'Course links',
    title:'Match schedule and catalog codes',
    instruction:'Choose a rule for comparing the schedule’s course reference with the catalog’s course code.',
    next:'Map instructor links'
  },
  {
    label:'Instructor links',
    title:'Map the instructor reference',
    instruction:'Choose where the instructor assignment belongs. The schedule’s instructor reference matches a staff ID in the directory.',
    next:'Ask the graph'
  },
  {
    label:'Query and evidence',
    title:'Who teaches this section?',
    instruction:'Change the term, course, or section number to query the graph built from your rules.',
  },
];

export const codeOptions = [
  {value:'exact', title:'Compare codes as written', detail:'DB240 and DB 240 differ.'},
  {value:'normalized', title:'Remove spaces before comparing', detail:'DB240 and DB 240 compare as DB240.'},
];

export const instructorOptions = [
  {value:'text', title:'Copy the ID onto Section as text', detail:'Section → instructorRef → text'},
  {value:'courseLink', title:'Link Course to Person', detail:'Course → taughtBy → Person'},
  {value:'sectionLink', title:'Link Section to Person', detail:'Section → taughtBy → Person'},
];

export const copy = {
  intro:'Turn a catalog, a class schedule, and an instructor directory into a graph.',
  sourceQuestion:'Who teaches Databases, section 01, in Spring 2027?',
  ontology:'Target ontology',
  ontologyIntro:'An ontology defines node types, their properties, and the relationships between them.',
  courseDefinition:'A Course is a catalog entry.',
  sectionDefinition:'A Section is one offering of a course in a term.',
  personDefinition:'A Person is a staff member in the directory.',
  sectionOf:'sectionOf links a Section to its Course.',
  taughtBy:'taughtBy links a Section to the Person who teaches it.',
  schedule:'Class schedule',
  catalog:'Course catalog',
  directory:'Instructor directory',
  key:'Columns in the section ID',
  sectionPreview:'Generated section IDs',
  linkPreview:'Course matches',
  instructorPreview:'Mapped instructor values',
  noKey:'Select at least one column to generate section IDs.',
  merged:'Merged rows',
  oneSection:'Each schedule row has its own section ID.',
  noCourseMatch:'No catalog match',
  noSectionId:'Choose a section ID first.',
  noInstructorMatch:'No directory match',
  courseNeedsSection:'Match the schedule to the catalog to attach this link to a course.',
  rules:'Current mapping',
  connection:'Graph facts',
  evidence:'Source records',
  noAnswer:'No instructor matched.',
  ambiguous:'The graph returned more than one instructor.',
  collisions:'At least one section ID combines schedule rows. Check which rows supplied the term and the instructor.',
  incompatible:'The query needs a taughtBy link from Section to Person.',
  noCatalogLinks:'The graph has no sectionOf links from Section to Course.',
  factOrigin:'Source rows',
  ask:'Query result',
  code:'SPARQL and Python',
  codeHelp:'Both queries match the term and section number. They follow sectionOf to check the course and taughtBy to find the instructor.',
  pythonHelp:'The Python script reads the downloaded graph. Install RDFLib with pip install rdflib.',
  downloadGraph:'Download graph (.ttl)',
  downloadPython:'Download query (.py)',
  reset:'Reset mapping',
  resetDone:'Mapping reset.',
  sourceTerm:'Term',
  sourceCourse:'Course',
  sourceSection:'Section number',
  tableRow:'Schedule row',
  tableCourse:'Catalog match',
  tableValue:'Generated value',
  ruleLink:'Mapping rule',
};
