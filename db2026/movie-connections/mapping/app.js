import {
  catalog, columns, copy, codeOptions, directory, initialQuestion, initialRules,
  instructorOptions, keyFields, labels, schedule, stages,
} from './data.js';
import {buildGraph, queryInstructors, toPython, toSparql, toTurtle} from './model.js';

const storageKey = 'ncf-ontology-mapping-v1';
const $ = id => document.getElementById(id);
const html = value => String(value).replace(/[&<>"']/g, char =>
  ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[char]);
const terms = [...new Set(schedule.map(row => row.term))];
const sectionNumbers = [...new Set(schedule.map(row => row.section_no))];
const courseCodes = catalog.map(row => row.course_code);
const sourceRows = {catalog, schedule, directory};
const sourceTitles = {catalog:copy.catalog, schedule:copy.schedule, directory:copy.directory};
const baseState = () => ({stage:0, rules:structuredClone(initialRules), question:{...initialQuestion}});

function load() {
  const state = baseState();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return state;
    if (Number.isInteger(saved.stage) && stages[saved.stage]) state.stage = saved.stage;
    if (Array.isArray(saved.rules?.sectionKey)) state.rules.sectionKey = keyFields.filter(field => saved.rules.sectionKey.includes(field));
    if (codeOptions.some(o => o.value === saved.rules?.courseMatch)) state.rules.courseMatch = saved.rules.courseMatch;
    if (instructorOptions.some(o => o.value === saved.rules?.instructor)) state.rules.instructor = saved.rules.instructor;
    if (terms.includes(saved.question?.term)) state.question.term = saved.question.term;
    if (courseCodes.includes(saved.question?.course)) state.question.course = saved.question.course;
    if (sectionNumbers.includes(saved.question?.section)) state.question.section = saved.question.section;
  } catch { /* The exercise also runs without browser storage. */ }
  return state;
}

let state = load();
const save = () => {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
};
$('intro').textContent = copy.intro;
$('sample-question').textContent = copy.sourceQuestion;
$('reset-mapping').textContent = copy.reset;
$('show-ontology').textContent = copy.ontology;
$('target-ontology').innerHTML = ontology();
$('show-ontology').addEventListener('click', () => $('target-ontology').showModal());

function go(stage) {
  state.stage = stage;
  save();
  render();
  $('step-title').focus();
  $('mapping-steps').scrollIntoView({block:'nearest'});
}

function render() {
  const expanded = [...document.querySelectorAll('details[open][id]')].map(panel => panel.id);
  const {stage, rules, question} = state;
  const graph = buildGraph(rules);
  const active = stages[stage];
  $('mapping-steps').innerHTML = stages.map((step,i) =>
    `<button type="button" data-stage="${i}"${stage === i ? ' aria-current="step"' : ''}>${step.label}</button>`).join('');
  $('mapping-workspace').innerHTML = `
    <section class="step">
      <h2 id="step-title" tabindex="-1">${active.title}</h2>
      <p class="step-instruction">${active.instruction}</p>
      ${stage === 3 ? queryView(graph, question) : mappingView(stage, graph, rules)}
    </section>`;
  for (const id of expanded) {
    const panel = $(id);
    if (panel) panel.open = true;
  }
}

function ontology() {
  return `<h2 id="ontology-title">${copy.ontology}</h2>
    <p>${copy.ontologyIntro}</p>
    <div class="entity-definitions">
      <div><strong>Course</strong><p>${copy.courseDefinition}</p><code>code, title</code></div>
      <div><strong>Section</strong><p>${copy.sectionDefinition}</p><code>term, sectionNumber</code></div>
      <div><strong>Person</strong><p>${copy.personDefinition}</p><code>staffId, name</code></div>
    </div>
    <p><code>Section → sectionOf → Course</code></p><p>${copy.sectionOf}</p>
    <p><code>Section → taughtBy → Person</code></p><p>${copy.taughtBy}</p>
    <form method="dialog"><button>Close</button></form>`;
}

function table(headings, rows, className = '') {
  return `<div class="table-scroll"><table class="${className}">
    <thead><tr>${headings.map(label => `<th scope="col">${html(label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(cells => `<tr>${cells.map(cell => `<td>${html(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div>`;
}

function sourceTable(type, fields = columns[type], rows = sourceRows[type]) {
  return `<section class="source-table"><h3>${sourceTitles[type]}</h3>${table(
    fields.map(field => labels[field]), rows.map(row => fields.map(field => row[field])),
    type === 'schedule' && fields.length === 5 ? 'schedule-table' : '',
  )}</section>`;
}

function mappingView(stage, graph, rules) {
  const sources = [
    () => sourceTable('schedule'),
    () => sourceTable('schedule', ['row','course_ref']) + sourceTable('catalog'),
    () => sourceTable('schedule', ['row','term','course_ref','section_no','instructor_ref']) + sourceTable('directory'),
  ][stage]();
  const controls = [
    () => keyControls(rules) + sectionPreview(graph),
    () => choices('courseMatch', codeOptions, rules.courseMatch) + coursePreview(graph),
    () => choices('instructor', instructorOptions, rules.instructor) + instructorPreview(graph, rules),
  ][stage]();
  return `<div class="mapping-grid">
    <div>${sources}</div>
    <div class="mapping-controls">${controls}
      <button type="button" class="primary next-step" data-next="${stage + 1}">${stages[stage].next}</button>
    </div>
  </div>`;
}

function keyControls(rules) {
  return `<fieldset class="key-controls"><legend>${copy.key}</legend><div class="key-options">
    ${keyFields.map(field => `<label>
      <input id="key-${field}" type="checkbox" name="sectionKey" value="${field}"${rules.sectionKey.includes(field) ? ' checked' : ''}>
      <span>${labels[field]}</span>
    </label>`).join('')}
  </div></fieldset>`;
}

function choices(name, options, selected) {
  return `<fieldset class="rule-options"><legend class="sr-only">${copy.ruleLink}</legend>
    ${options.map(({value,title,detail}) => `<label>
      <input id="${name}-${value}" type="radio" name="${name}" value="${value}"${value === selected ? ' checked' : ''}>
      <span><strong>${title}</strong><small>${detail}</small></span>
    </label>`).join('')}
  </fieldset>`;
}

function sectionPreview(graph) {
  const nodes = graph.sections;
  const count = nodes.length;
  const entries = nodes.map(node => {
    const merged = node.rows.length > 1;
    return `<li${merged ? ' class="collision"' : ''}>
      <code>${html(node.parts.join(' / '))}</code> <span>${node.rows.join(', ')}${merged ? ` <strong>${copy.merged}</strong>` : ''}</span>
    </li>`;
  }).join('');
  return `<section class="mapping-preview" aria-labelledby="preview-title">
    <h3 id="preview-title">${copy.sectionPreview}</h3>
    <p id="section-count">${schedule.length} schedule rows → ${count} Section ${count === 1 ? 'node' : 'nodes'}</p>
    ${count ? `<ul class="node-list">${entries}</ul>` : `<p>${copy.noKey}</p>`}
    ${count === schedule.length ? `<p class="positive">${copy.oneSection}</p>` : ''}
  </section>`;
}

function coursePreview(graph) {
  return `<section class="mapping-preview"><h3>${copy.linkPreview}</h3>
    <p id="course-count">${graph.courseLinks.length} of ${schedule.length} rows matched</p>
    ${graph.sections.length ? table([copy.tableRow,copy.tableCourse], schedule.map(row => {
      const match = graph.courseLinks.find(link => link.schedule === row.row);
      return [`${row.row}  ${row.course_ref}`, match ? `${match.catalog}  ${match.code}` : copy.noCourseMatch];
    })) : `<p>${copy.noSectionId}</p>`}
  </section>`;
}

function instructorPreview(graph, rules) {
  const needsCourse = rules.instructor === 'courseLink' && graph.instructorValues.length === 0;
  return `<section class="mapping-preview"><h3>${copy.instructorPreview}</h3>
    ${!graph.sections.length ? `<p>${copy.noSectionId}</p>` : needsCourse ? `<p>${copy.courseNeedsSection}</p>` :
      table([copy.tableRow,copy.tableValue],schedule.map(row => {
        const item = graph.instructorValues.find(value => value.schedule === row.row);
        const value = item?.person ? `${item.subject} → ${item.value} (${item.person})` : item ? `"${item.value}"` : copy.noInstructorMatch;
        return [`${row.row}  ${row.instructor_ref}`,value];
      }))}
  </section>`;
}

function selectRule(name, label, options, value) {
  return `<label for="query-${name}">${label}<select id="query-${name}" name="${name}">${options.map(option => {
    const [key,text] = Array.isArray(option) ? option : [option,option];
    return `<option value="${html(key)}"${key === value ? ' selected' : ''}>${html(text)}</option>`;
  }).join('')}</select></label>`;
}

function queryView(graph, question) {
  const answers = queryInstructors(graph, question);
  const {rules} = state;
  const merged = graph.sections.some(section => section.rows.length > 1);
  const notes = [];
  if (!graph.sections.length) notes.push(copy.noSectionId);
  if (graph.sections.length && !graph.courseLinks.length) notes.push(copy.noCatalogLinks);
  if (rules.instructor !== 'sectionLink') notes.push(copy.incompatible);
  if (merged) notes.push(copy.collisions);
  return `
    <div class="query-controls">
      ${selectRule('term',copy.sourceTerm,terms,question.term)}
      ${selectRule('course',copy.sourceCourse,catalog.map(row => [row.course_code,row.title]),question.course)}
      ${selectRule('section',copy.sourceSection,sectionNumbers,question.section)}
    </div>
    <section class="query-result${answers.length > 1 ? ' ambiguous' : ''}" aria-labelledby="result-title">
      <h3 id="result-title">${copy.ask}</h3>
      ${answers.length ? `<ul class="answer-list">${answers.map(a => `<li>${html(a.name)} <small>${html(a.staff)}</small></li>`).join('')}</ul>` : `<p class="answer-list">${copy.noAnswer}</p>`}
      ${answers.length > 1 ? `<p>${copy.ambiguous}</p>` : ''}
      ${notes.length ? `<ul class="mapping-notes">${notes.map(note => `<li>${note}</li>`).join('')}</ul>` : ''}
    </section>
    ${answers.map(answerEvidence).join('')}
    ${mappingSummary(rules)}
    <details class="disclosure" id="code-view">
      <summary>${copy.code}</summary><p>${copy.codeHelp}</p>
      <div class="code-grid">
        <section><h3>SPARQL</h3><pre><code>${html(toSparql(question))}</code></pre></section>
        <section><h3>Python / RDFLib</h3><pre><code>${html(toPython(question))}</code></pre></section>
      </div>
      <p>${copy.pythonHelp}</p>
      <div class="controls">
        <button type="button" data-download="graph">${copy.downloadGraph}</button>
        <button type="button" data-download="python">${copy.downloadPython}</button>
      </div>
    </details>`;
}

function answerEvidence(answer) {
  const sections = answer.paths.map(path => {
    const linkFacts = path.facts.filter(fact => ['term','sectionNumber','sectionOf','taughtBy'].includes(fact.predicate));
    const display = value => value.startsWith('person/') ? value.replace('person/', '') :
      value.startsWith('course/') ? value.replace('course/', '') : value;
    return `<p class="evidence-id"><code>${html(decodeURIComponent(path.section))}</code></p>${table(
      ['Property or relationship','Value',copy.factOrigin],
      linkFacts.map(fact => [fact.predicate,display(fact.object),fact.sources.join(', ')]),
    )}`;
  }).join('');
  const raw = Object.keys(sourceRows).map(type => {
    const selected = sourceRows[type].filter(row => answer.sources.includes(row.row));
    return selected.length ? sourceTable(type,columns[type],selected) : '';
  }).join('');
  return `<section class="evidence">
    <h3>${copy.connection} · ${html(answer.name)}</h3>${sections}
    <details id="sources-${html(answer.staff)}" class="disclosure"><summary>${copy.evidence} (${answer.sources.join(', ')})</summary>${raw}</details>
  </section>`;
}

function mappingSummary(rules) {
  return `<details class="disclosure" id="mapping-summary"><summary>${copy.rules}</summary>
    <ul>
      <li>Section ID: ${rules.sectionKey.length ? rules.sectionKey.map(field => `<code>${field}</code>`).join(' + ') : copy.noKey}</li>
      <li><code>course_ref → sectionOf → Course</code> · ${codeOptions.find(o => o.value === rules.courseMatch).title}</li>
      <li><code>instructor_ref</code> · ${instructorOptions.find(o => o.value === rules.instructor).detail}</li>
    </ul>
  </details>`;
}

function download(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], {type:mime}));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

$('mapping-steps').addEventListener('click', event => {
  const button = event.target.closest('[data-stage]');
  if (button) go(Number(button.dataset.stage));
});
$('mapping-workspace').addEventListener('change', event => {
  const {id, name, value, checked} = event.target;
  if (name === 'sectionKey') {
    state.rules.sectionKey = keyFields.filter(field => field === value ? checked : state.rules.sectionKey.includes(field));
  } else if (name === 'courseMatch' || name === 'instructor') {
    state.rules[name] = value;
  } else if (Object.hasOwn(state.question, name)) {
    state.question[name] = value;
  } else {
    return;
  }
  save();
  render();
  $(id)?.focus({preventScroll:true});
  const summary = document.querySelector('#section-count, #course-count, .answer-list');
  if (summary) $('mapping-announcement').textContent = summary.textContent.trim();
});
$('mapping-workspace').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.next) go(Number(button.dataset.next));
  if (button.dataset.download === 'graph') download('registrar-graph.ttl', toTurtle(buildGraph(state.rules)), 'text/turtle');
  if (button.dataset.download === 'python') download('query_instructors.py', toPython(state.question), 'text/x-python');
});
$('reset-mapping').addEventListener('click', () => {
  state = baseState();
  save();
  render();
  $('mapping-announcement').textContent = copy.resetDone;
  $('step-title').focus();
});

render();
