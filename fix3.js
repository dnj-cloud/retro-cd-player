/* Fix 3: every song becomes its own CD, with the cover art embedded in the file */
(function(){
 const imgMime=d=>d[0]==255?'image/jpeg':d[0]==137?'image/png':d[0]==71?'image/gif':'image/jpeg';
 const dec=(a,enc)=>{try{let l=['iso-8859-1','utf-16le','utf-16be','utf-8'][enc]||'utf-8';if(enc==1&&a[0]==254&&a[1]==255)l='utf-16be';return new TextDecoder(l).decode(a).replace(/\0+$/,'').trim()}catch(e){return''}};
 const ss=(b,i)=>(b[i]&127)<<21|(b[i+1]&127)<<14|(b[i+2]&127)<<7|(b[i+3]&127);
 async function readTags(f){
  const t={};
  try{
   let b=new Uint8Array(await f.slice(0,3e6).arrayBuffer());
   const dv=new DataView(b.buffer);
   if(b[0]==73&&b[1]==68&&b[2]==51){
    const ver=b[3],end=Math.min(b.length,10+ss(b,6));let p=10;
    if(b[5]&64){const ex=ver==4?ss(b,10):dv.getUint32(10);p+=ver==4?ex:ex+4}
    while(p+10<end){
     const id=String.fromCharCode(b[p],b[p+1],b[p+2],b[p+3]),size=ver==4?ss(b,p+4):dv.getUint32(p+4);
     if(!size||!/^[A-Z0-9]{4}$/.test(id))break;
     const d=b.subarray(p+10,p+10+size);p+=10+size;
     if(id=='TIT2')t.title=dec(d.subarray(1),d[0]);
     else if(id=='TPE1')t.artist=dec(d.subarray(1),d[0]);
     else if(id=='TALB')t.album=dec(d.subarray(1),d[0]);
     else if(id=='TYER'||id=='TDRC')t.year=parseInt(dec(d.subarray(1),d[0]))||0;
     else if(id=='APIC'&&!t.pic){
      const enc=d[0];let i=1;while(i<d.length&&d[i])i++;i+=2;
      if(enc==1||enc==2){while(i+1<d.length&&(d[i]||d[i+1]))i+=2;i+=2}else{while(i<d.length&&d[i])i++;i++}
      if(i<d.length)t.pic=d.slice(i);
     }
    }
   }else if(b[0]==102&&b[1]==76&&b[2]==97&&b[3]==67){
    let p=4;
    while(p+4<b.length){
     const h=b[p],type=h&127,len=b[p+1]<<16|b[p+2]<<8|b[p+3];p+=4;
     if(type==4){
      let q=p+4+dv.getUint32(p,true);const n=dv.getUint32(q,true);q+=4;
      for(let k=0;k<n&&q<p+len;k++){const l=dv.getUint32(q,true);const s=dec(b.subarray(q+4,q+4+l),3);q+=4+l;
       const m=s.match(/^([^=]+)=(.*)$/s);if(m){const key=m[1].toUpperCase();if(key=='TITLE')t.title=m[2];if(key=='ARTIST')t.artist=m[2];if(key=='ALBUM')t.album=m[2];if(key=='DATE')t.year=parseInt(m[2])||0}}
     }else if(type==6&&!t.pic){
      let q=p+4;const ml=dv.getUint32(q);q+=4+ml;const dl=dv.getUint32(q);q+=4+dl+16;const n=dv.getUint32(q);q+=4;t.pic=b.slice(q,q+n);
     }
     p+=len;if(h&128)break;
    }
   }else if(b[4]==102&&b[5]==116&&b[6]==121&&b[7]==112){
    if(f.size>b.length)b=new Uint8Array(await f.slice(0,5e7).arrayBuffer());
    const find=(a,b2,c,d2,from=0)=>{for(let i=from;i<b.length-4;i++)if(b[i]==a&&b[i+1]==b2&&b[i+2]==c&&b[i+3]==d2)return i;return -1};
    const atom=(a,b2,c,d2)=>{const i=find(a,b2,c,d2);if(i<0)return null;const j=find(100,97,116,97,i);if(j<0)return null;const sz=new DataView(b.buffer).getUint32(j-4);return b.subarray(j+12,j-4+sz)};
    const n=atom(169,110,97,109),a=atom(169,65,82,84),y=atom(169,100,97,121),c=atom(99,111,118,114);
    if(n)t.title=dec(n,3);if(a)t.artist=dec(a,3);if(y)t.year=parseInt(dec(y,3))||0;if(c)t.pic=c.slice();
   }
  }catch(e){console.warn('tags',e)}
  return t;
 }
 window.readTags=readTags;
 DICT.en.f1='From this phone: pick one or more songs. Each song becomes its own CD, with the cover art inside the file if it has one. An image you pick is used as the cover instead.';
 DICT.ar.f1='من هذا الهاتف: اختر أغنية أو أكثر. كل أغنية تصير قرصاً مستقلاً بغلافها المدمج في الملف إن وجد. الصورة التي تختارها تُستخدم كغلاف بدلاً منه.';
 doImport=async function(){
  const fs=[...$('#if').files];
  const aus=fs.filter(f=>f.type.startsWith('audio/')||/\.(mp3|m4a|flac|ogg|wav|aac|opus)$/i.test(f.name));
  const im=fs.find(f=>f.type.startsWith('image/'));
  if(!aus.length)return toast(tt('choose'));
  const fa=$('#ia').value.trim(),ft=$('#it').value.trim(),fy=+$('#iy').value||2010;
  dlg.classList.remove('show');
  let ok=0,last=null;const pickArt=im?await imgArt(im):null;
  for(let i=0;i<aus.length;i++){
   const f=aus[i];busyMsg(tt('dling')+' '+(i+1)+'/'+aus.length+'...');
   try{
    const tg=await readTags(f);
    const title=(aus.length==1&&ft)||tg.title||f.name.replace(/\.[^.]+$/,'');
    const artist=fa||tg.artist||tt('unk'),year=tg.year||fy,seed=Math.floor(Math.random()*90)+10;
    let art=pickArt;
    if(!art&&tg.pic)art=await imgArt(new Blob([tg.pic],{type:imgMime(tg.pic)}));
    if(!art)art=cover(artist,title,year,seed);
    const rec={id:'u'+Date.now()+'-'+i,artist,title,year,art,seed,tracks:[{n:title,d:await dur(f),blob:f}]};
    await idb('readwrite',s=>s.put(rec));
    A.set(rec.id,Object.assign(rec,{offline:1}));ok++;last=rec.id;
   }catch(e){console.warn(e)}
  }
  if(last)sel=last;tab='all';
  document.querySelectorAll('.tabs .k').forEach(x=>x.classList.toggle('on',x.dataset.t=='all'));
  render();toast(ok?tt('albumok')+' ('+ok+')':tt('fail'));
 };
})();
