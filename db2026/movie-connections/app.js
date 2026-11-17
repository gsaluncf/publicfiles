import {copy, courses, namespace, queries, relationships, stages} from './game-data.js';
import {courseTitle, graphFor, prerequisitePath, queryAnswers, toPython, toTurtle} from './model.js';

const storageKey = 'ncf-course-graph-v1';
const workshop = document.getElementById('workshop');
const $ = id => document.getElementById(id);
let progress = {step:0, solved:false};
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (Number.isInteger(saved?.step) && saved.step >= 0 && saved.step < stages.length) {
    progress = {step:saved.step, solved:saved.solved === true};
  }
} catch {
  // The workshop also works with browser storage disabled.
}

const save = () => {
  try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch {}
};
const escapeText = value => String(value).replace(/[&<>"]/g, c => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'
})[c]);

let activeQuery = queries[0].id;
let connectionStart = null;
const answers = ['programming',null,'recommendedFor','0','0'];
const hints = [copy.prerequisiteHint,null,copy.recommendationHint,copy.ontologyHint,copy.evidenceHint];

function go(step) {
  progress = {step, solved:false};
  connectionStart = null;
  save();
  render();
  window.scrollTo(0,0);
  $('question').focus({preventScroll:true});
}

function render() {
  const {step, solved} = progress;
  const stage = stages[step];
  const edges = graphFor(step, solved);
  const connect = step === 1;
  $('progress').textContent = `Step ${step+1} of ${stages.length}`;
  workshop.innerHTML = `
    <div class="task">
      ${step < stages.length-1 ? `<p class="stage-name">${stage.title}</p>` : ''}
      <h2 id="question" tabindex="-1">${stage.prompt}</h2>
      <p>${stage.help}</p>
    </div>
    ${step === stages.length-1 ? queryView(edges) : `
      <div class="layout">
        <section class="exercise">
          ${stage.record ? `<div class="catalog"><h3>${copy.catalog}</h3><p>${stage.record}</p></div>` : ''}
          ${connect ? '' : `
          ${step === 4 ? evidenceView(edges) : ''}
          ${solved ? `<p class="success" role="status">${stage.feedback}</p>` : answerForm(step, stage)}
          ${step === 2 ? directResult(edges) : ''}
          <div class="controls">
            ${solved ? '<button class="primary" id="next">Continue</button>' : ''}
            ${step > 0 ? '<button id="back">Back</button>' : ''}
          </div>`}
        </section>
        ${step === 3 && solved ? ontologyView() : graphView(edges, {connect,solved})}
      </div>`}
  `;
  $('next')?.addEventListener('click', () => go(step+1));
  $('back')?.addEventListener('click', () => go(step-1));
  $('restart')?.addEventListener('click', () => go(0));
  $('exercise-form')?.addEventListener('submit', checkAnswer);
  if (connect && !solved) {
    const board = $('graph-board');
    board.querySelectorAll('button[data-course]').forEach(button => {
      button.addEventListener('click', () => selectConnectionCourse(button.dataset.course));
    });
    board.addEventListener('keydown', event => {
      if (event.key === 'Escape') setConnectionStart(null);
    });
  }
  $('query-select')?.addEventListener('change', event => {
    activeQuery = event.target.value;
    $('query-body').innerHTML = queryBody(edges);
  });
  $('python-download')?.addEventListener('click', () => download('course-graph.py', toPython(edges)));
  $('rdf-download')?.addEventListener('click', () => download('course-graph.ttl', toTurtle(edges)));
  $('json-download')?.addEventListener('click', () => download('course-graph.json', JSON.stringify({
    courses:courses.map(({id,code,title}) => ({id,code,title})),
    relationships,
    edges
  }, null, 2)));
  drawGraph(edges, connect && solved);
}

function answerForm(step, stage) {
  let choices;
  if (step === 0) {
    choices = `
      <label for="course-choice">${copy.choose}</label>
      <div class="edge-input">
        <select id="course-choice" name="answer" required>
          <option value="">Select a course</option>
          ${courses.filter(c => c.id !== 'sql').map(c => `<option value="${c.id}">${c.title}</option>`).join('')}
        </select>
        <span aria-hidden="true">→</span><strong>${courseTitle('sql')}</strong>
      </div>`;
  } else {
    const options = step === 2
      ? [['prerequisiteFor',copy.required],['recommendedFor',copy.recommendation]]
      : stage.choices.map((choice,i) => [String(i),choice]);
    choices = `<fieldset aria-label="${stage.prompt}">${options.map(([value,label]) => `
      <label class="choice"><input type="radio" name="answer" value="${value}" required><span>${label}</span></label>`
    ).join('')}</fieldset>`;
  }
  return `
    <form id="exercise-form">
      ${choices}
      <button class="primary" type="submit">${stage.action}</button>
      <p id="feedback" class="feedback" role="status"></p>
    </form>`;
}

function checkAnswer(event) {
  event.preventDefault();
  const answer = new FormData(event.currentTarget).get('answer');
  const {step} = progress;
  if (answer !== answers[step]) {
    $('feedback').textContent = `Incorrect. ${hints[step]}`;
    return;
  }
  completeStep();
}

function completeStep() {
  progress.solved = true;
  save();
  render();
  $('next').focus({preventScroll:true});
}

function selectConnectionCourse(id) {
  if (connectionStart === id) {
    setConnectionStart(null);
  } else if (!connectionStart) {
    setConnectionStart(id);
  } else if (connectionStart === 'sql' && id === 'databases') {
    connectionStart = null;
    completeStep();
  } else {
    setConnectionStart(null, `Incorrect. ${copy.missingHint}`);
  }
}

function setConnectionStart(id, error = '') {
  connectionStart = id;
  $('graph-board').querySelectorAll('button[data-course]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.course === id));
  });
  const status = $('connection-status');
  status.textContent = id ? copy.connectionStart.replace('{course}', courseTitle(id)) : error;
  status.classList.toggle('feedback', Boolean(error));
}

function directResult(edges) {
  const result = queryAnswers(edges).direct.join(', ') || copy.noMatches;
  return `<div class="live-result" aria-live="polite"><h3>${copy.direct}</h3><p>${result}</p></div>`;
}

function graphView(edges, {connect = false, solved = false} = {}) {
  const fact = edge => `${courseTitle(edge.from)} ${relationships[edge.kind].sentence} ${courseTitle(edge.to)}.`;
  const hasRecommendation = edges.some(edge => edge.kind === 'recommendedFor');
  const editable = connect && !solved;
  return `
    <section class="visual" aria-labelledby="graph-title">
      <div class="visual-heading">
        <h3 id="graph-title">${copy.graph}</h3>
        <div class="legend"><span><i></i> Required</span>${hasRecommendation ? '<span><i class="dashed"></i> Recommended</span>' : ''}</div>
      </div>
      <div class="board" id="graph-board"${editable ? ' role="group" aria-labelledby="graph-title"' : ' aria-hidden="true"'}>
        <canvas id="arrows" aria-hidden="true"></canvas>
        ${courses.map(c => {
          const attributes = `class="course" data-course="${c.id}" style="grid-area:${c.row}/${c.column}"`;
          const label = `<small>${c.code}</small><strong>${c.title}</strong>`;
          return editable
            ? `<button type="button" ${attributes} aria-pressed="false">${label}</button>`
            : `<div ${attributes}>${label}</div>`;
        }).join('')}
      </div>
      ${editable ? '<p id="connection-status" role="status"></p>' : ''}
      ${connect && solved ? `<p class="success" role="status">${stages[1].feedback}</p>${directResult(edges)}` : ''}
      ${connect ? `<div class="controls">${solved ? '<button class="primary" id="next">Continue</button>' : ''}<button id="back">Back</button></div>` : ''}
      <details class="edge-list">
        <summary>Read the arrow labels</summary>
        <ul>${edges.map(edge => `<li>${fact(edge)}</li>`).join('')}</ul>
      </details>
    </section>`;
}

function drawGraph(edges, showAddedArrow) {
  graphResize?.disconnect();
  const board = $('graph-board');
  if (!board) return;
  const painter = () => {
    const canvas = $('arrows');
    if (!canvas) return;
    const area = board.getBoundingClientRect();
    if (!area.width || !area.height) return;
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(area.width * scale);
    canvas.height = Math.round(area.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale,scale);
    const position = id => {
      const rect = board.querySelector(`[data-course="${id}"]`).getBoundingClientRect();
      return {x:rect.left-area.left+rect.width/2,y:rect.top-area.top+rect.height/2,w:rect.width,h:rect.height};
    };
    for (const edge of edges) {
      const a = position(edge.from), b = position(edge.to);
      const angle = Math.atan2(b.y-a.y,b.x-a.x);
      const x = Math.cos(angle), y = Math.sin(angle);
      const radius = node => Math.min(node.w/2/Math.abs(x),node.h/2/Math.abs(y)) + 2;
      const start = {x:a.x+x*radius(a),y:a.y+y*radius(a)};
      const end = {x:b.x-x*radius(b),y:b.y-y*radius(b)};
      const recommended = edge.kind === 'recommendedFor';
      ctx.strokeStyle = ctx.fillStyle = recommended ? '#e8ba77' : '#98dfb4';
      ctx.lineWidth = showAddedArrow && edge.from === 'sql' && edge.to === 'databases' ? 4 : 2.5;
      ctx.setLineDash(recommended ? [5,5] : []);
      ctx.beginPath();
      ctx.moveTo(start.x,start.y);
      ctx.lineTo(end.x,end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(end.x,end.y);
      ctx.lineTo(end.x-x*9-y*4,end.y-y*9+x*4);
      ctx.lineTo(end.x-x*9+y*4,end.y-y*9-x*4);
      ctx.fill();
    }
  };
  graphResize = new ResizeObserver(painter);
  graphResize.observe(board);
  painter();
}

function ontologyView() {
  return `
    <section class="visual ontology">
      <h3>${copy.ontology}</h3>
      <div class="type-card">
        <strong>Course</strong>
        <span>${copy.codeProperty}</span>
        <span>${copy.titleProperty}</span>
      </div>
      ${Object.values(relationships).map(r => `
        <p class="type-edge"><strong>Course</strong><span>${r.label} →</span><strong>Course</strong></p>
      `).join('')}
    </section>`;
}

function evidenceView(edges) {
  const path = prerequisitePath(edges, 'pipelines');
  return `<div class="catalog">
    <h3>${copy.evidence}</h3>
    <ol>${path.map(e => `<li>${courseTitle(e.from)} is required before ${courseTitle(e.to)}.</li>`).join('')}</ol>
  </div>`;
}

function queryView(edges) {
  return `
    <section class="queries">
      <label for="query-select">${copy.selectQuery}</label>
      <select id="query-select">${queries.map(query => `<option value="${query.id}"${query.id===activeQuery?' selected':''}>${query.title}</option>`).join('')}</select>
      <div id="query-body">${queryBody(edges)}</div>
      <details><summary>Python setup and graph data</summary><pre><code>${escapeText(toPython(edges))}</code></pre></details>
      <div class="controls downloads">
        <button id="python-download">Download Python</button>
        <button id="rdf-download">Download RDF</button>
        <button id="json-download">Download graph JSON</button>
      </div>
      <details><summary>Course ontology</summary>${ontologyView()}</details>
      <details><summary>Course graph</summary>${graphView(edges)}</details>
      <div class="controls"><button id="back">Back</button><button id="restart">Start again</button></div>
    </section>`;
}

function queryBody(edges) {
  const query = queries.find(q => q.id === activeQuery);
  const result = queryAnswers(edges)[query.id].join(', ') || copy.noMatches;
  return `
    <p>${query.explanation}</p>
    <div class="live-result" aria-live="polite"><h3>${copy.results}</h3><p>${result}</p></div>
    <div class="code-grid">
      <section><h3>SPARQL</h3><pre><code>${escapeText(`PREFIX ex: <${namespace}>\n${query.sparql}`)}</code></pre></section>
      <section><h3>Python / NetworkX</h3><pre><code>${escapeText(query.python)}</code></pre></section>
    </div>`;
}

function download(name, content) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], {type:'text/plain'}));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

let graphResize;
render();
