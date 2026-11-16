/* Fix 4 (Android app): the phone scan makes every song its own CD */
scanDevice=async function(){
 if(!MS||scanning)return;
 scanning=true;
 try{
  const r=await MS.scan();
  if(!r.tracks.length){toast(tt('e3'));scanning=false;return}
  const ids=new Set(),fresh=[];
  r.tracks.forEach(t=>{
   const id='m'+t.id;ids.add(id);
   if(!A.has(id)){
    A.set(id,{id,artist:t.artist||tt('unk'),title:t.title||'Track',year:t.year||0,art:PH,dev:1,offline:1,demo:0,seed:t.albumId%97,aid:t.albumId,tracks:[{n:t.title||'Track',d:t.dur,path:t.path,id:t.id}]});
    fresh.push(id);
   }
  });
  [...A.values()].forEach(a=>{if((a.dev&&!ids.has(a.id))||(a.demo&&!a.offline))A.delete(a.id)});
  render();scanning=false;
  const cache={};
  for(const id of fresh){
   const a=A.get(id);if(!a)continue;
   if(!(a.aid in cache)){let art='';try{const x=await MS.art({id:a.tracks[0].id});art=x.art||''}catch(e){}cache[a.aid]=art}
   a.art=cache[a.aid]||cover(a.artist,a.title,a.year||'',a.seed);
   document.querySelectorAll('.cd[data-id="'+id+'"] img').forEach(i=>i.src=a.art);
   if(id==sel)info(id);
  }
 }catch(e){toast(tt('perm'))}
 scanning=false;
};
