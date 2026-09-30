import type { Photo } from './match-batch';
import type { MatchVerdict } from './match-store';
import type { PageCopyFor } from './content-schema';
import { fillTemplate } from './content-utils';
type UI = PageCopyFor<'matching'>['ui'];
interface ClientData { batch:string; query:string; verdict:MatchVerdict|null; panes:{label:string;photos:Photo[]}[]; ui:UI; views:PageCopyFor<'matching'>['views']; prev:string|null; next:string|null; }
const inputFocus = (target:EventTarget|null) => target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable);
export function initMatchingReview() {
  const node = document.getElementById('matching-data');
  if (!node) return;
  const data:ClientData = JSON.parse(node.textContent!), ui = data.ui;
  const rows = Array.from(document.querySelectorAll<HTMLAnchorElement>('.card-row'));
  const filters = document.querySelectorAll<HTMLButtonElement>('[data-filter]');
  let filter = 'all';
  const applyFilter = () => rows.forEach(r=>r.hidden=filter==='undecided' ? r.dataset.decided==='1' : filter!=='all' && r.dataset.cls!==filter);
  filters.forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter!;filters.forEach(f=>f.setAttribute('aria-pressed',String(f===b)));applyFilter();}));
  const prefetch = document.getElementById('prefetch') as HTMLButtonElement;
  const prefetchState = document.getElementById('prefetch-state')!;
  const expired = () => {window.location.href=`/signin?error=expired&next=${encodeURIComponent(window.location.pathname+window.location.search)}`;};
  prefetch.addEventListener('click',async()=>{
    prefetch.disabled=true;let n=0,failed=0;
    for (const row of rows) {
      try {
        const r=await fetch(`/api/matching/${data.batch}/cards/${encodeURIComponent(row.dataset.enc!)}/hydrate`,{method:'POST'});
        if (r.status===401) {expired();return;}
        if (!r.ok) failed++;
      } catch {failed++;}
      n++;prefetchState.textContent=fillTemplate(ui.prefetchProgress,{n,total:rows.length});
    }
    prefetchState.textContent=fillTemplate(ui.prefetchDone,{n:n-failed,total:rows.length,failed});prefetch.disabled=false;
  });
  let verdict=data.verdict?.verdict ?? '', candidate=data.verdict?.candidate_key ?? '';
  const verdictButtons=document.querySelectorAll<HTMLButtonElement>('[data-v]');
  const state=document.getElementById('save-state')!;
  const paint=()=>verdictButtons.forEach(b=>b.setAttribute('aria-pressed',String(verdict===b.dataset.v && (verdict!=='same'||candidate===b.dataset.c))));
  paint();
  verdictButtons.forEach(b=>b.addEventListener('click',()=>{
    const same=verdict===b.dataset.v && (verdict!=='same'||candidate===b.dataset.c);
    verdict=same?'':b.dataset.v!;candidate=verdict==='same'?b.dataset.c!:'';state.textContent=ui.dirty;paint();
  }));
  const notes=document.getElementById('verdict-notes') as HTMLTextAreaElement, scars=document.getElementById('verdict-scars') as HTMLTextAreaElement;
  for (const field of [notes,scars]) field.addEventListener('input',()=>{state.textContent=ui.dirty;});
  const save=document.getElementById('save-verdict') as HTMLButtonElement;
  save.addEventListener('click',async()=>{
    save.disabled=true;notes.disabled=scars.disabled=true;verdictButtons.forEach(b=>b.disabled=true);
    try {
      const r=await fetch(`/api/matching/${data.batch}/verdict`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query_enc:data.query,verdict,candidate_key:candidate,notes:notes.value,scar_notes:scars.value})});
      if (r.status===401) {expired();return;}
      state.textContent=r.ok?ui.saved:fillTemplate(ui.notSaved,{status:r.status});
      if (r.ok) {
        const row=rows.find(r=>r.dataset.enc===data.query)!;row.dataset.decided=verdict?'1':'0';row.querySelector('.verdict-tick')!.textContent=verdict?'✓':'';
        const decided=rows.filter(r=>r.dataset.decided==='1').length;
        (document.getElementById('batch-progress') as HTMLProgressElement).value=decided;
        document.getElementById('progress-copy')!.textContent=fillTemplate(ui.progress,{decided,total:rows.length});applyFilter();
      }
    } catch {state.textContent=fillTemplate(ui.notSaved,{status:'network'});} finally {save.disabled=false;notes.disabled=scars.disabled=false;verdictButtons.forEach(b=>b.disabled=false);}
  });
  initCompare(data);
  document.addEventListener('keydown',e=>{
    if (inputFocus(e.target) || (document.getElementById('compare') as HTMLDialogElement).open) return;
    const destination=e.key==='j'?data.next:e.key==='k'?data.prev:null;
    if (destination) {e.preventDefault();window.location.href=destination;}
  });
}

// ported from sharkbook-offline-matching/review_page.py COMPARE_HTML / COMPARE_JS,
// MIT, Simon J Pierce / MMF. Fit the ID box on the full image instead of loading a crop file.
function initCompare(data:ClientData) {
  const dialog=document.getElementById('compare') as HTMLDialogElement;
  type Side = 'L'|'R';
  type Pane = {el:HTMLElement;stage:HTMLElement;img:HTMLImageElement;pane:number;idx:number;whole:boolean;s:number;x:number;y:number};
  const make=(side:Side,pane:number):Pane=>{
    const el=dialog.querySelector<HTMLElement>(`[data-side=${side}]`)!;
    return {el,stage:el.querySelector<HTMLElement>('.stage')!,img:el.querySelector<HTMLImageElement>('img')!,pane,idx:0,whole:false,s:1,x:0,y:0};
  };
  const S={L:make('L',0),R:make('R',1)};
  let selected=0,origin:HTMLElement|null=null;
  const photos=(P:Pane)=>data.panes[P.pane]?.photos ?? [];
  const apply=(P:Pane)=>{P.img.style.transform=`translate(${P.x}px,${P.y}px) scale(${P.s})`;};
  const fit=(P:Pane)=>{
    const r=P.stage.getBoundingClientRect(),nw=P.img.naturalWidth,nh=P.img.naturalHeight;
    if (!nw || !nh || !r.width || !r.height) return;
    const photo=photos(P)[P.idx];
    const b=!P.whole && photo?.box && photo.w && photo.h ? [photo.box[0]*nw/photo.w,photo.box[1]*nh/photo.h,photo.box[2]*nw/photo.w,photo.box[3]*nh/photo.h] : [0,0,nw,nh];
    P.s=Math.min(r.width/b[2],r.height/b[3])*.96;P.x=(r.width-b[2]*P.s)/2-b[0]*P.s;P.y=(r.height-b[3]*P.s)/2-b[1]*P.s;apply(P);
  };
  const zoom=(P:Pane,f:number,cx:number,cy:number)=>{
    const n=Math.min(Math.max(P.s*f,.005),80);f=n/P.s;P.x=cx-(cx-P.x)*f;P.y=cy-(cy-P.y)*f;P.s=n;apply(P);
  };
  const show=(side:Side)=>{
    const P=S[side],ph=photos(P),cap=P.el.querySelector('.caption')!,toggle=P.el.querySelector<HTMLButtonElement>('[data-a=area]')!;
    P.el.querySelector('.who')!.textContent=data.panes[P.pane]?.label ?? '';
    if (!ph.length) {P.img.removeAttribute('src');cap.textContent=data.ui.noPhotos;toggle.hidden=true;return;}
    P.idx=(P.idx+ph.length)%ph.length;const photo=ph[P.idx];
    toggle.hidden=!photo.box;toggle.textContent=P.whole?data.ui.idArea:data.ui.whole;
    cap.textContent=`${fillTemplate(data.ui.photoCount,{n:P.idx+1,total:ph.length})} · ${data.views[photo.view]} · ${photo.date ?? ''}`;
    const src=photo.url; // already the same-origin proxy URL (set server-side)
    if (P.img.getAttribute('src')===src) fit(P); else P.img.src=src;
  };
  const tabs=()=>{
    const t=S.R.el.querySelector('.tabs')!;t.replaceChildren();
    data.panes.slice(1).forEach((p,j)=>{const b=document.createElement('button');b.type='button';b.textContent=`${j+1}. ${p.label}`;b.classList.toggle('on',S.R.pane===j+1);b.onclick=()=>{S.R.pane=j+1;S.R.idx=0;tabs();show('R');};t.appendChild(b);});
  };
  const step=(side:Side,d:number)=>{S[side].idx+=d;show(side);};
  const close=()=>{dialog.close();document.body.style.overflow='';origin?.focus();};
  for (const side of ['L','R'] as const) {
    const P=S[side];P.img.addEventListener('load',()=>fit(P));
    P.img.addEventListener('error',()=>{P.el.querySelector('.caption')!.textContent=data.ui.noPhotos;});
    P.stage.addEventListener('wheel',e=>{e.preventDefault();const r=P.stage.getBoundingClientRect();zoom(P,Math.exp(-e.deltaY*.0018),e.clientX-r.left,e.clientY-r.top);},{passive:false});
    let drag:{x:number;y:number}|null=null;
    P.stage.addEventListener('pointerdown',e=>{drag={x:e.clientX-P.x,y:e.clientY-P.y};P.stage.setPointerCapture(e.pointerId);});
    P.stage.addEventListener('pointermove',e=>{if (drag) {P.x=e.clientX-drag.x;P.y=e.clientY-drag.y;apply(P);}});
    for (const event of ['pointerup','pointercancel','lostpointercapture']) P.stage.addEventListener(event,()=>{drag=null;});
    P.stage.addEventListener('dblclick',()=>fit(P));
    P.el.querySelector('.controls')!.addEventListener('click',e=>{
      const action=(e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a,r=P.stage.getBoundingClientRect();
      if (action==='prev') step(side,-1);else if (action==='next') step(side,1);else if (action==='in') zoom(P,1.4,r.width/2,r.height/2);else if (action==='out') zoom(P,1/1.4,r.width/2,r.height/2);else if (action==='fit') fit(P);else if (action==='area') {P.whole=!P.whole;show(side);}
    });
  }
  document.querySelectorAll<HTMLButtonElement>('.photo-pick').forEach(button=>button.addEventListener('click',()=>{
    const pane=Number(button.dataset.pane),idx=Number(button.dataset.idx);
    if (pane===0) {
      selected=idx;document.querySelectorAll('.photo-pick[data-pane="0"]').forEach(b=>b.classList.toggle('selected',b===button));
      document.getElementById('pick-hint')!.textContent=data.ui.picked;return;
    }
    origin=button;S.L.idx=selected;S.R.pane=pane;S.R.idx=idx;S.L.whole=S.R.whole=false;
    dialog.showModal();document.body.style.overflow='hidden';tabs();show('L');show('R');
  }));
  document.getElementById('compare-close')!.addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('keydown',e=>{
    if (inputFocus(e.target)) return;
    if (e.key==='Escape') {e.preventDefault();close();}
    else if (e.key==='ArrowRight' || e.key==='ArrowLeft') {e.preventDefault();step(e.shiftKey?'L':'R',e.key==='ArrowRight'?1:-1);}
    else if (/^[1-9]$/.test(e.key) && data.panes[Number(e.key)]) {e.preventDefault();S.R.pane=Number(e.key);S.R.idx=0;tabs();show('R');}
  });
  window.addEventListener('resize',()=>{if (dialog.open) {fit(S.L);fit(S.R);}});
}
