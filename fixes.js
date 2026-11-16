/* Fix 1: remove the built-in demo albums */
[...A.values()].forEach(a=>{if(a.demo&&!a.offline)A.delete(a.id)});
render();

/* Fix 2: drag a CD up to the player with your finger (no Insert button needed) */
(function(){
 const st=document.createElement('style');
 st.textContent='.shelf,.cd{touch-action:none}';
 document.head.appendChild(st);
 let raf=0;
 shelf.addEventListener('pointerdown',e=>{
  e.stopImmediatePropagation();
  cancelAnimationFrame(raf);
  if(busy||e.button>0)return;
  const c=e.target.closest('.cd'),id=c&&c.dataset.id;
  const x0=e.clientX,y0=e.clientY,s0=shelf.scrollLeft;
  let g=null,mode='',lastX=x0,lastT=performance.now(),v=0,cx=x0,cy=y0;
  const pick=()=>{if(!c||g)return;mode='drag';g=ghost(c);drag.moved=true;sel=id;
   shelf.querySelectorAll('.cd').forEach(x=>x.classList.toggle('sel',x==c));
   info(id);c.style.opacity=.25;S.select();follow(cx,cy)};
  const follow=(x,y)=>{if(!g)return;
   g.style.transform='translate('+(x-56)+'px,'+(y-76)+'px) scale(1.08) rotate('+Math.max(-8,Math.min(8,(x-x0)/20))+'deg)';
   $('#pl').style.outline=y<$('#pl').getBoundingClientRect().bottom+10?'2px solid #6fb4e8':''};
  const timer=setTimeout(()=>{if(!mode)pick()},300);
  const mv=ev=>{
   cx=ev.clientX;cy=ev.clientY;const dx=cx-x0,dy=cy-y0;
   if(!mode&&(Math.abs(dx)>8||Math.abs(dy)>8)){
    clearTimeout(timer);
    if(c&&dy<0&&Math.abs(dy)>Math.abs(dx)*.6)pick();else{mode='scroll';drag.moved=true}
   }
   if(mode=='scroll'){shelf.scrollLeft=s0-dx;const t=performance.now();v=(lastX-cx)/((t-lastT)||1);lastX=cx;lastT=t}
   if(mode=='drag')follow(cx,cy);
  };
  const up=async ev=>{
   clearTimeout(timer);
   window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);
   $('#pl').style.outline='';
   if(mode=='scroll'){
    if(performance.now()-lastT>80)v=0;
    let last=performance.now();
    const step=t=>{const dt=t-last;last=t;shelf.scrollLeft+=v*dt;v*=Math.pow(.95,dt/16);if(Math.abs(v)>.02)raf=requestAnimationFrame(step)};
    raf=requestAnimationFrame(step);
   }
   if(g){
    c.style.opacity='';
    const r=$('#pl').getBoundingClientRect();
    if(ev.type=='pointerup'&&ev.clientY<r.bottom+10){await insert(id,null,g)}
    else{const b=c.getBoundingClientRect();g.style.transition='transform .35s';g.style.transform='translate('+b.left+'px,'+b.top+'px)';await sleep(360);g.remove()}
   }
   setTimeout(()=>drag.moved=false,60);
  };
  window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
 },true);
})();
