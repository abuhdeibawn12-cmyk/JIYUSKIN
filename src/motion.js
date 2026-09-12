const running=new WeakMap();
export function reveal(panel,open,duration=350){
 const start=panel.hidden?0:panel.getBoundingClientRect().height;running.get(panel)?.cancel();panel.hidden=false;panel.style.maxHeight='none';panel.style.height='auto';const end=open?panel.scrollHeight:0;
 const finish=()=>{panel.hidden=!open;panel.style.height='';panel.style.maxHeight=open?'none':'0px';running.delete(panel)};
 if(matchMedia('(prefers-reduced-motion:reduce)').matches){finish();return Promise.resolve()}
 panel.style.overflow='hidden';const a=panel.animate([{height:start+'px',opacity:open?0:1},{height:end+'px',opacity:open?1:0}],{duration,easing:'ease',fill:'forwards'});running.set(panel,a);return a.finished.then(()=>{finish();a.cancel()},()=>{});
}
export function initDetailMotion(){
 function click(e){const summary=e.target.closest('.j-detail>summary');if(!summary)return;e.preventDefault();const detail=summary.parentElement,panel=detail.querySelector('.j-detail-body');if(!panel)return;const open=summary.getAttribute('aria-expanded')!=='true';summary.setAttribute('aria-expanded',String(open));if(open){panel.hidden=true;detail.open=true}Promise.resolve(reveal(panel,open,300)).then(()=>{if(summary.getAttribute('aria-expanded')===String(open))detail.open=open})}
 document.querySelectorAll('.j-detail').forEach(d=>{d.querySelector('summary').setAttribute('aria-expanded',String(d.open));d.querySelector('.j-detail-body').hidden=!d.open});document.addEventListener('click',click);return()=>document.removeEventListener('click',click);
}
