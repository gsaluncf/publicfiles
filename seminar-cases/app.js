const progress=document.querySelector('.reading-progress');
function updateProgress(){const d=document.documentElement;progress.style.width=`${Math.min(100,(scrollY/(d.scrollHeight-innerHeight))*100)}%`;}
addEventListener('scroll',updateProgress,{passive:true});updateProgress();
const sections=[...document.querySelectorAll('.case-section')];
if(sections.length){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('.contents nav a').forEach(a=>a.classList.toggle('active',a.hash==='#'+entry.target.id));}})},{rootMargin:'-12% 0px -65% 0px'});sections.forEach(s=>observer.observe(s));}
const dialog=document.querySelector('#image-viewer');
document.querySelectorAll('[data-image]').forEach(button=>button.addEventListener('click',()=>{dialog.querySelector('img').src=button.dataset.image;dialog.querySelector('img').alt=button.querySelector('img').alt;dialog.querySelector('p').textContent=button.dataset.caption;dialog.showModal();}));
dialog.querySelector('button').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
