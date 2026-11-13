import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Emit paths relative to each page so the site works under a project directory.
const siteDirectory = fileURLToPath(new URL('../', import.meta.url));
process.chdir(siteDirectory);
const originalCases = JSON.parse(fs.readFileSync('_source/cases.json', 'utf8').replace(/^\uFEFF/, ''));
const valueCases = JSON.parse(fs.readFileSync('_source/value-cases.json', 'utf8').replace(/^\uFEFF/, ''))
  .map((c, index) => ({ ...c, number: originalCases.length + index + 1 }));
const cases = [...originalCases, ...valueCases];
const manifest = JSON.parse(fs.readFileSync('assets/media-manifest.json', 'utf8').replace(/^\uFEFF/, ''));
const sharedMedia = Array.isArray(manifest) ? manifest : manifest.items || manifest.assets;
const media = [...sharedMedia, ...valueCases.flatMap(c => c.images ?? [])];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>String(n).padStart(2,'0');
const palette={snow:['#156c87','#e6f0f4'],moneyball:['#17664f','#e8f1eb'],ebay:['#91472e','#f6ece6'],plymouth:['#673e73','#f3ebf5']};
const caseColors = slug => palette[slug] ?? ['#24548a', '#e9eff8'];
const labels={snow:'John Snow',moneyball:'Moneyball',ebay:'eBay',plymouth:'Plymouth'};
const caseLabel = c => c.shortTitle || labels[c.slug] || c.title;
const artKeys={snow:'snow-map',moneyball:'moneyball-payroll',ebay:'ebay-figure'};
const findMedia=key=>media.find(m=>m.key===({'moneyball-payroll':'moneyball-figure'}[key]||key))||media.find(m=>m.key?.includes(key));
const cover=c=>findMedia(c.coverMediaKey ?? artKeys[c.slug])||media.find(m=>m.key?.startsWith(c.slug));
const fig=(m,cls='')=>m?`<figure class="evidence ${cls}"><button class="image-button" data-image="/assets/${esc(m.filename)}" data-caption="${esc(m.caption)}" aria-label="Enlarge ${esc(m.alt)}"><img src="/assets/${esc(m.filename)}" alt="${esc(m.alt)}" loading="lazy" decoding="async"><span class="enlarge">Enlarge image <span aria-hidden="true">↗</span></span></button><figcaption>${esc(m.caption)} <a href="${esc(m.sourceUrl)}" target="_blank" rel="noopener">${esc(m.sourceLabel||'Original source')}</a></figcaption></figure>`:'';
function header(active) {
  const caseLinks = originalCases.map(c => {
    const current = active === c.slug ? ' aria-current="page"' : '';
    return `<a class="direct-case-link" href="/${esc(c.slug)}/"${current}>${esc(caseLabel(c))}</a>`;
  }).join('');
  return `<header class="site-header">
    <a class="brand" href="/" aria-label="New College of Florida Data Science, Data Communication home"><span class="program-brand"><img src="/assets/Nnoshield.svg" alt="" width="26" height="26"><span>New College of Florida<br>Data Science</span></span><span class="course-name">Data Communication</span></a>
    <nav aria-label="Course materials"><a href="/#all-cases">All cases</a>${caseLinks}<a href="/#business-value">Business value</a></nav>
    <span class="course-term">Spring 2027</span>
  </header><div class="reading-progress" aria-hidden="true"></div>`;
}
const footer=()=>`<footer class="site-footer"><div><a class="brand" href="/">Data Communication</a><p>Communications and Applied Domains in Data Science<br>New College of Florida · Spring 2027</p><a href="https://ds.ncf.edu/">NCF Data Science (ds.ncf.edu)</a></div><p>Seminar prompts adapted from Chip and Dan Heath’s <a href="https://heathbrothers.com/wp-content/uploads/resources/mts-made-to-stick-model.pdf" target="_blank" rel="noopener">Made to Stick framework</a>.</p></footer><dialog id="image-viewer"><button class="close-viewer" aria-label="Close enlarged image">Close <span aria-hidden="true">×</span></button><img alt="Enlarged image"><p></p></dialog>`;
const pageHtml=(title,desc,body,slug='')=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(desc)}"><meta name="theme-color" content="#163450"><title>${esc(title)} | Data Communication</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet"><link rel="stylesheet" href="/style.css"><script src="/app.js" defer></script></head><body class="${slug?'case-page '+slug:'home-page'}" ${slug?`style="--accent:${caseColors(slug)[0]};--tint:${caseColors(slug)[1]}"`:''}><a class="skip" href="#main">Skip to content</a>${header(slug)}${body}${footer()}</body></html>`;
function layout(title, description, body, slug = '') {
  const root = slug ? '../' : './';
  const html = pageHtml(title, description, body, slug).replace(/[ \t]+$/gm, '');
  return html.replace(/( (?:href|src|data-image)=")\/(?!\/)/g, (_, attribute) => attribute + root);
}
function mini(c) {
  if (c.hero) {
    const { title, metrics, note } = c.hero;
    const figures = metrics.map(({ label, value, detail }) => `
      <div>
        <b>${esc(label)}</b>
        <strong>${esc(value)}</strong>
        ${detail ? `<small>${esc(detail)}</small>` : ''}
      </div>`).join('');
    return `<div class="hero-data">
      <span>${esc(title)}</span>
      <div class="metric-pair hero-metrics">${figures}</div>
      ${note ? `<small>${esc(note)}</small>` : ''}
    </div>`;
  }
  const existing = {
    snow: `<div class="hero-data"><span>Deaths per 10,000 houses</span><div class="mini-row"><b>Southwark &amp; Vauxhall</b><i style="width:100%"></i><strong>315.4</strong></div><div class="mini-row"><b>Lambeth</b><i style="width:12%"></i><strong>37.5</strong></div><small>First seven weeks of the 1854 epidemic</small></div>`,
    moneyball: `<div class="hero-data"><span>Batting statistics</span><div class="metric-pair"><div><b>Batting average</b><strong>Tejada</strong><small>.308 compared with Hatteberg’s .280</small></div><div><b>On-base percentage</b><strong>Hatteberg</strong><small>.374 compared with Tejada’s .354</small></div></div><small>Oakland regular season, 2002</small></div>`,
    ebay: `<div class="hero-data"><span>Estimated return on investment</span><div class="metric-pair"><div><b>Nonexperimental</b><strong>1,632%</strong><small>Observational data with controls</small></div><div><b>Experimental</b><strong>−63%</strong><small>Market experiment</small></div></div><small>Blake, Nosko &amp; Tadelis · Table 1</small></div>`
  };
  return existing[c.slug] ?? '';
}
function readingLabel(c, displayedTitle) {
  const name = c.readingLabel?.trim();
  if (!name || displayedTitle.trim().toLowerCase() === name.toLowerCase()) return '';
  return `<p class="reading-attribution">${esc(name)}</p>`;
}
function caseCard(c, heading = 'h2') {
  const [accent, tint] = caseColors(c.slug);
  const image = cover(c);
  const title = esc(caseLabel(c));
  const href = `/${esc(c.slug)}/`;
  const art = image
    ? `<img src="/assets/${esc(image.filename)}" alt="${esc(image.alt)}" loading="lazy">`
    : mini(c);
  const duration = c.video?.duration
    ? `<div class="case-meta"><span>Video length: ${esc(c.video.duration)}</span></div>`
    : '';
  return `<article class="case-entry" data-case="${esc(c.slug)}" style="--accent:${accent};--tint:${tint}">
    <a href="${href}" class="index-art${image ? '' : ' metric-art'}" aria-label="Open ${title} case">${art}<span class="case-counter">${num(c.number)}</span></a>
    <div class="index-copy"><p class="case-domain">${esc(c.domain)}</p>
      <${heading} class="case-card-title"><a href="${href}">${title}</a></${heading}>${readingLabel(c, caseLabel(c))}
      <p>${esc(c.subtitle)}</p>${duration}
      <a class="text-link" href="${href}">Read the case <span aria-hidden="true">↗</span></a>
    </div>
  </article>`;
}
const snowMap = cover(originalCases[0]);
const home = `<main id="main">
  <section class="home-hero"><div class="hero-title"><p class="intro-label">Seminar cases</p>
    <h1>Communicating data<br>in practice.</h1>
    <p>AI tools can help analysts build models, prepare charts, and draft reports. A manager deciding whether to renew an advertising campaign still needs someone to explain how many sales the ads generated and how that number was estimated. Across six fields, this seminar examines how analysts make those judgments and explain them to the people who use their work.</p>
    <p>Each case begins with a decision. A short video introduces the setting. The numbered sections describe the records people collected, the measures they chose, and what they learned. Students use the original figures to check a result, then write a recommendation for someone involved in the decision.</p>
    <p>The cases offer guest speakers ideas for seminars based on their own experience. A box office manager, for example, might describe how the orchestra estimates how many people attended a concert for the first time. A ticket order identifies the buyer, but one buyer can bring three guests. Students can learn from hearing how the manager explained what the orchestra knew about its buyers and what it still needed to learn about its audience.</p>
    </div><div class="hero-montage"><img src="/assets/${esc(snowMap.filename)}" alt="${esc(snowMap.alt)}">
      <div class="montage-caption"><span>London, 1854</span><b>John Snow’s investigation</b></div></div>
  </section>
  <div id="all-cases" class="case-index">${originalCases.map(c => caseCard(c)).join('')}</div>
  <section id="business-value" class="case-index case-group" aria-labelledby="business-value-heading">
    <h2 id="business-value-heading">The business value of data</h2>
    ${valueCases.map(c => caseCard(c, 'h3')).join('')}
  </section>
</main>`;
fs.writeFileSync('index.html', layout('Communicating data in practice', 'Seminar cases in data communication and the business value of data.', home));
function renderVideo(video, heading) {
  return `<div class="video-block">
    <div class="video-heading"><span>${esc(heading)}</span><span>${esc(video.duration)}</span></div>
    ${video.embedUrl ? `<div class="video-frame"><iframe src="${esc(video.embedUrl)}" title="${esc(video.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe></div>` : ''}
    <div class="video-caption">
      <div><b>${esc(video.title)}</b><p>${esc(video.presenter)}</p></div>
      <a href="${esc(video.url)}" target="_blank" rel="noopener">Open video <span aria-hidden="true">↗</span></a>
    </div>
    <p class="watch-prompt">${esc(video.prompt)}</p>
  </div>`;
}
for(const c of cases){
const video = c.video ? renderVideo(c.video, 'Case video') : '';
const relatedVideo = c.relatedVideo
  ? `<details class="related-video">
       <summary>${esc(c.relatedVideo.label)}</summary>
       ${renderVideo(c.relatedVideo, 'Comparison video')}
     </details>`
  : '';
const table=c.activity.table;
const activity=`<div class="practice" id="activity"><div class="practice-heading"><span class="practice-mark" aria-hidden="true">✓</span><div><p>Student activity</p><h3>${esc(c.activity.title)}</h3></div></div><ol>${c.activity.instructions.map(t=>`<li>${t}</li>`).join('')}</ol>${table?`<div class="table-scroll"><table><thead><tr>${table.headers.map(t=>`<th scope="col">${t}</th>`).join('')}</tr></thead><tbody>${table.rows.map(row=>`<tr>${row.map((v,i)=>i===0?`<th scope="row">${v}</th>`:`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${c.activity.formulas.map(f=>`<div class="formula">${esc(f)}</div>`).join('')}<details class="answer"><summary>Check the calculation <span aria-hidden="true">+</span></summary><div>${c.activity.answer}</div></details><div class="communication"><b>Written recommendation</b><p>${c.activity.communication}</p></div></div>`;
const sections=c.sections.map(s=>`<section class="case-section" id="section-${s.number}"><div class="section-heading"><span>${num(s.number)}</span><h2>${esc(s.title.replace(/^\d+[.\s]+/,''))}</h2></div><div class="section-copy">${s.paragraphs.map(p=>`<p>${p}</p>`).join('')}${s.number===1?video:''}${s.mediaKey?fig(findMedia(s.mediaKey)):''}${s.number===3?relatedVideo:''}${s.number===4?activity:''}</div></section>`).join('');
const next = cases[cases.indexOf(c) + 1];
const body=`<main id="main"><div class="case-hero"><div><a class="back-link" href="/#all-cases">All cases</a><p class="intro-label">Case ${num(c.number)} / ${esc(c.domain)}</p><h1>${esc(c.title)}</h1>${readingLabel(c, c.title)}<p class="hero-description">${esc(c.intro)}</p></div>${mini(c)}</div><div class="reading-layout"><aside class="contents"><p>Contents</p><nav aria-label="Case sections">${c.sections.map(s=>`<a href="#section-${s.number}"><span>${num(s.number)}</span>${esc(s.title.replace(/^\d+[.\s]+/,''))}</a>`).join('')}</nav><a class="activity-link" href="#activity">Open the activity</a></aside><article class="case-body">${sections}<section class="speaker"><span>Question for the guest speaker</span><p>${esc(c.speakerQuestion)}</p></section><section class="reading"><h2>Case sources</h2><div>${c.reading.map((r,i)=>`<a href="${esc(r.url)}" target="_blank" rel="noopener"><span>${num(i+1)}</span><div><b>${esc(r.title)}</b><p>${esc(r.note)}</p></div><span aria-hidden="true">↗</span></a>`).join('')}</div></section></article></div>${next?`<section class="next-case"><div><p>Continue to case ${num(next.number)}</p><h2>${esc(caseLabel(next))}</h2>${c.transition ? `<p>${esc(c.transition)}</p>` : ''}</div><a class="button" href="/${next.slug}/">${next.shortTitle ? `Read case ${num(next.number)}` : `Read ${esc(caseLabel(next))}`} <span aria-hidden="true">↗</span></a></section>`:`<section class="next-case"><div><h2>All cases</h2></div><a class="button" href="/#all-cases">View all cases</a></section>`}</main>`;
fs.mkdirSync(path.join(siteDirectory,c.slug),{recursive:true});fs.writeFileSync(path.join(siteDirectory,c.slug,'index.html'),layout(c.title,c.subtitle,body,c.slug));
}
// Old links identified each topic with a fragment on the shared reading page.
const legacyTopics = Object.fromEntries(valueCases.map(c => [c.legacyId, c.slug]));
const legacyPage = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>The business value of data</title>
  <script>
    const topics = ${JSON.stringify(legacyTopics).replace(/</g, '\\u003c')};
    const key = location.hash.slice(1);
    location.replace(Object.hasOwn(topics, key) ? '../' + topics[key] + '/' : '../#business-value');
  </script>
  <noscript><meta http-equiv="refresh" content="0;url=../#business-value"></noscript>
</head><body><a href="../#business-value">The business value of data</a></body></html>`;
fs.mkdirSync('business-value', { recursive: true });
fs.writeFileSync('business-value/index.html', legacyPage);
console.log(`Built the overview, ${cases.length} cases, and the business value redirect.`);
