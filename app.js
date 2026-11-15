const $=s=>document.querySelector(s),au=$('#au'),shelf=$('#shelf'),bay=$('#bay'),disc=$('#disc'),pl=$('#bay');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let A=new Map(),tab='all',query='',sel=null,cur=null,ti=0,busy=false,urls=[];
let cfg={select:1,insert:1,tray:1,click:1,eject:1};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('rcd-cfg')||'{}'))}catch(e){}
const recent=()=>{try{return JSON.parse(localStorage.getItem('rcd-rec')||'[]')}catch(e){return[]}};
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',3000)}
/* ---------- UI sounds (WebAudio) ---------- */
let ac;function snd(k,f=300,d=.08,type='square',v=.05){if(!cfg[k])return;try{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+d);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+d)}catch(e){}}
const S={select:()=>snd('select',900,.05,'triangle'),insert:()=>{snd('insert',180,.25,'sawtooth',.06)},tray:()=>{snd('tray',120,.3,'square',.05)},click:()=>snd('click',1400,.03),eject:()=>{snd('eject',500,.15,'sawtooth',.06);setTimeout(()=>snd('eject',250,.2,'sawtooth',.06),120)}};
/* ---------- storage (IndexedDB) ---------- */
const dbp=new Promise((ok,no)=>{try{const r=indexedDB.open('retrocd',1);r.onupgradeneeded=()=>r.result.createObjectStore('a',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});
const idb=async(m,f)=>{const d=await dbp;return new Promise((ok,no)=>{const t=d.transaction('a',m),q=f(t.objectStore('a'));t.oncomplete=()=>ok(q&&q.result);t.onerror=()=>no(t.error)})};
/* ---------- demo audio: original tones generated in-browser ---------- */
function synth(seed,sec){const sr=22050,n=sr*sec,b=new ArrayBuffer(44+n*2),v=new DataView(b);const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
 const sc=[0,3,5,7,10,12,15],base=110*Math.pow(2,(seed%5)/12);let x=seed*9301+49297,st=Math.floor(sr*.2),f=base;
 for(let i=0;i<n;i++){if(i%st===0){x=(x*9301+49297)%233280;f=base*Math.pow(2,(sc[x%7]+(x%3)*12)/12)}const t=(i%st)/st,e=Math.exp(-3*t),ph=i/sr;
  const s=(Math.sin(2*Math.PI*f*ph)*.5+Math.sin(2*Math.PI*f*2*ph)*.15)*e+Math.sin(2*Math.PI*base/2*ph)*.25*(Math.floor(i/(st*4))%2);
  v.setInt16(44+i*2,Math.max(-1,Math.min(1,s*.6))*32767,true)}
 return new Blob([b],{type:'audio/wav'})}
/* ---------- cover art (original, generated) ---------- */
function cover(ar,ti,yr,seed){const c=document.createElement('canvas');c.width=c.height=224;const g=c.getContext('2d');g.fillStyle='#16181b';g.fillRect(0,0,224,224);
 g.strokeStyle='rgba(111,180,232,.55)';g.lineWidth=1.5;const m=seed%3;
 if(m==0)for(let r=14;r<200;r+=14){g.beginPath();g.arc(70+seed*9%40,150,r,0,7);g.stroke()}
 else if(m==1)for(let i=-224;i<224;i+=12){g.beginPath();g.moveTo(i,224);g.lineTo(i+224,0);g.stroke()}
 else for(let y=60;y<200;y+=10){g.beginPath();for(let x=0;x<=224;x+=4)g.lineTo(x,y+Math.sin(x/18+y/9)*10);g.stroke()}
 g.fillStyle='rgba(10,12,14,.85)';g.fillRect(0,0,224,64);g.fillStyle='#e3e8ee';g.font='bold 22px Arial Narrow,Arial';g.textBaseline='top';g.fillText(ar.toUpperCase().slice(0,16),10,10,204);g.fillStyle='#8fb7d6';g.font='13px Arial';g.fillText(ti.slice(0,28),10,40,204);g.fillStyle='#b9bec6';g.font='11px Arial';g.fillText(String(yr),10,206);return c.toDataURL('image/jpeg',.85)}
const DEMOS=[['d1','Neon Static','Cold Signal',2010,['Boot Sequence','Carrier Wave','Low Battery'],1],['d2','Glass Harbor','Night Ferry',2009,['Dockside','Foghorn','Last Crossing'],2],['d3','Tin Orchard','Pocket Radio',2011,['Dial Tone','Static Bloom','Sign Off'],3],['d4','Neon Static','Standby',2012,['Idle','Resume'],4]];
DEMOS.forEach(([id,artist,title,year,tr,seed])=>A.set(id,{id,artist,title,year,art:cover(artist,title,year,seed),demo:1,seed,offline:0,tracks:tr.map((n,i)=>({n,d:12+i*3}))}));
async function load(){try{const all=await idb('readonly',s=>s.getAll());all.forEach(a=>{const d=A.get(a.id);A.set(a.id,Object.assign(d||{},a,{offline:1}))})}catch(e){toast('Storage unavailable: offline library disabled')}render()}
const fmt=s=>{s=Math.max(0,s|0);return String(s/60|0).padStart(2,'0')+':'+String(s%60).padStart(2,'0')};
/* ---------- shelf ---------- */
function list(){let l=[...A.values()],q=query.trim().toLowerCase();
 if(q)l=l.filter(a=>(a.artist+' '+a.title).toLowerCase().includes(q)||a.tracks.some(t=>t.n.toLowerCase().includes(q)));
 if(tab=='dl')l=l.filter(a=>a.offline);
 if(tab=='art')l.sort((a,b)=>a.artist.localeCompare(b.artist)||a.year-b.year);
 if(tab=='rec'){const r=recent();l=r.map(i=>A.get(i)).filter(a=>a&&l.includes(a))}
 return l}
function render(){shelf.innerHTML='';const l=list();if(!l.length){shelf.innerHTML='<div class="empty">'+(tab=='dl'?tt('e1'):tab=='rec'?tt('e2'):tt('e3'))+'</div>';return}
 l.forEach((a,i)=>{const d=document.createElement('div');d.className='cd'+(a.id==sel?' sel':'')+(a.id==cur?' out':'');d.dataset.id=a.id;d.style.zIndex=l.length-i;
  d.innerHTML='<img alt="'+esc(a.artist+' - '+a.title)+'" src="'+a.art+'"><div class="sp"><b>'+esc(a.artist)+'</b><div class="led'+(a.offline?' on':'')+'"></div></div><div class="pb" data-p="'+a.id+'"></div>';shelf.appendChild(d)});
 if(sel)info(sel)}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function info(id){const a=A.get(id);if(!a)return;const inn=id==cur;
 $('#panel').innerHTML='<img src="'+a.art+'" alt=""><div class="pi"><h3>'+esc(a.artist)+' &mdash; '+esc(a.title)+'</h3><small>'+(a.year||'-')+' &middot; <span class="st">'+tt(a.dev?'onphone':a.offline?'saved':'nsaved')+'</span>'+(a.demo?' &middot; '+tt('demo'):'')+'</small><ul class="tl">'+a.tracks.map((t,i)=>'<li data-i="'+i+'" class="'+(inn&&i==ti?'cur':'')+'"><span>'+(i+1)+'. '+esc(t.n)+'</span><span>'+fmt(t.d)+'</span></li>').join('')+'</ul><div class="act">'+(inn?'':'<button class="k" id="ains">'+tt('ins')+'</button>')+(a.offline?'':'<button class="k" id="asave">'+tt('save')+'</button>')+(((a.offline||!a.demo)&&!a.dev)?'<button class="k" id="adel">'+tt('del')+'</button>':'')+'<span id="stat" class="st" style="align-self:center"></span></div></div>'}
$('#panel').onclick=async e=>{const a=A.get(sel);if(!a)return;S.click();
 if(e.target.id=='ains')insert(sel,shelf.querySelector('.cd.sel'));
 if(e.target.id=='asave')saveOffline(a);
 if(e.target.id=='adel')del(a);
 const li=e.target.closest('li');if(li&&sel==cur){ti=+li.dataset.i;playTrack()}};
shelf.addEventListener('click',e=>{if(drag.moved)return;const c=e.target.closest('.cd');if(!c)return;sel=c.dataset.id;S.select();shelf.querySelectorAll('.cd').forEach(x=>x.classList.toggle('sel',x==c));info(sel)});
/* ---------- drag a CD toward the player ---------- */
const drag={moved:false};
shelf.addEventListener('pointerdown',e=>{const c=e.target.closest('.cd');if(!c||busy)return;const x0=e.clientX,y0=e.clientY,id=c.dataset.id;let g=null;drag.moved=false;
 const mv=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;
  if(!g&&dy<-10&&Math.abs(dy)>Math.abs(dx)){g=ghost(c);drag.moved=true;sel=id;shelf.querySelectorAll('.cd').forEach(x=>x.classList.toggle('sel',x==c));info(id);c.style.opacity=.25;S.select()}
  if(g){g.style.transform='translate('+(ev.clientX-56)+'px,'+(ev.clientY-56-20)+'px) scale(1.08) rotate('+Math.max(-8,Math.min(8,dx/20))+'deg)';const r=$('#pl').getBoundingClientRect();bay.parentNode.parentNode.style.outline=(ev.clientY<r.bottom&&ev.clientY>r.top)?'2px solid #6fb4e8':''}};
 const up=async ev=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);$('#pl').style.outline='';
  if(!g){return}const r=$('#pl').getBoundingClientRect();c.style.opacity='';
  if(ev.type=='pointerup'&&ev.clientY<r.bottom+10&&ev.clientY>r.top-10){await insert(id,null,g)}else{const b=c.getBoundingClientRect();g.style.transition='transform .35s';g.style.transform='translate('+b.left+'px,'+b.top+'px)';await sleep(360);g.remove()}
  setTimeout(()=>drag.moved=false,50)};
 window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up)});
function ghost(c){const g=document.createElement('div');g.className='ghost';g.innerHTML='<img src="'+A.get(c.dataset.id).art+'" alt="">';const b=c.getBoundingClientRect();g.style.transform='translate('+b.left+'px,'+b.top+'px)';document.body.appendChild(g);return g}
/* ---------- insert / eject ---------- */
async function insert(id,fromEl,g){if(busy)return;busy=true;const a=A.get(id);
 try{if(cur)await eject(true);
  if(!g){g=ghost(fromEl);fromEl.style.visibility='hidden'}
  const tracks=await getTracks(a);
  S.tray();bay.classList.add('open');
  const b=bay.getBoundingClientRect(),cx=b.left+b.width/2-56,cy=b.top+b.height/2-56;
  g.style.transition='transform .55s cubic-bezier(.3,.8,.3,1)';g.style.transform='translate('+cx+'px,'+(cy-24)+'px) scale(1.1)';await sleep(600);
  S.insert();g.style.transition='transform .6s ease-in,opacity .6s';g.style.transform='translate('+cx+'px,'+cy+'px) scale(.55)';g.style.opacity=0;bay.classList.add('loaded');await sleep(600);g.remove();
  S.tray();bay.classList.remove('open');await sleep(450);
  cur=id;sel=id;ti=0;a._t=tracks;rc(id);render();await playTrack();
 }catch(e){console.error(e);toast('Could not load this album: '+(e.message||e));if(g)g.remove();cur=null;bay.classList.remove('loaded');render()}
 busy=false}
async function eject(quiet){const a=A.get(cur);if(!a)return;const was=!quiet;busy=true;au.pause();disc.className='disc';S.eject();bay.classList.add('open');
 const el=[...shelf.querySelectorAll('.cd')].find(x=>x.dataset.id==cur);
 if(el){el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});await sleep(300)}
 const b=bay.getBoundingClientRect(),g=document.createElement('div');g.className='ghost';g.innerHTML='<img src="'+a.art+'" alt="">';g.style.opacity=0;g.style.transform='translate('+(b.left+b.width/2-56)+'px,'+(b.top+b.height/2-56)+'px) scale(.55)';document.body.appendChild(g);
 bay.classList.remove('loaded');await sleep(50);g.style.transition='transform .6s ease-out,opacity .3s';g.style.opacity=1;g.style.transform='translate('+(b.left+b.width/2-56)+'px,'+(b.top-30)+'px) scale(1.1)';await sleep(500);
 const t=el?el.getBoundingClientRect():{left:20,top:b.bottom+120};g.style.transition='transform .6s cubic-bezier(.4,0,.2,1)';g.style.transform='translate('+t.left+'px,'+t.top+'px)';await sleep(620);g.remove();
 cur=null;if(a._t){a._t.forEach(t=>t.u&&URL.revokeObjectURL(t.u))}au.removeAttribute('src');idle();render();busy=false}
async function getTracks(a){if(a.dev)return a.tracks.map(t=>({...t,u:Capacitor.convertFileSrc(t.path)}));if(a.offline)return a.tracks.map(t=>({...t,u:URL.createObjectURL(t.blob)}));return a.tracks.map((t,i)=>({...t,u:URL.createObjectURL(synth(a.seed*10+i,t.d))}))}
function rc(id){const r=recent().filter(x=>x!=id);r.unshift(id);try{localStorage.setItem('rcd-rec',JSON.stringify(r.slice(0,20)))}catch(e){}}
/* ---------- playback ---------- */
async function playTrack(){const a=A.get(cur);if(!a)return;const t=a._t[ti];au.src=t.u;try{await au.play()}catch(e){toast('Tap play to start audio')}
 info(cur);media(a,t)}
function lcd(a,b,c,p){$('#l1').textContent=a;$('#l2').textContent=b;$('#l3').textContent=c;$('#pgi').style.width=p+'%'}
function tick(){const a=A.get(cur);if(!a)return;const d=au.duration||a._t[ti].d||0,p=d?au.currentTime/d*100:0;
 lcd(a.title.toUpperCase(),a.tracks[ti].n,'TRK '+String(ti+1).padStart(2,'0')+'/'+String(a.tracks.length).padStart(2,'0')+' '+fmt(au.currentTime)+(au.paused?' II':' >'),p);
 const pb=shelf.querySelector('[data-p="'+cur+'"]');if(pb)pb.style.width=p+'%'}
au.ontimeupdate=tick;au.onplay=()=>{disc.className='disc spin';$('#bt').innerHTML='&#10074;&#10074;'};au.onpause=()=>{disc.className=cur?'disc pause':'disc';$('#bt').innerHTML='&#9654;';tick()};
au.onended=()=>{const a=A.get(cur);if(ti<a.tracks.length-1){ti++;playTrack()}else{ti=0;au.pause();disc.className='disc';lcd(a.title.toUpperCase(),'END OF DISC','TRK --/-- 00:00',0)}};
au.onerror=()=>{if(cur)toast('Audio error on this track')};
$('#bt').onclick=()=>{S.click();if(!cur)return toast(tt('first'));au.paused?au.play():au.pause()};
$('#bn').onclick=()=>{S.click();const a=A.get(cur);if(a&&ti<a.tracks.length-1){ti++;playTrack()}};
$('#bp').onclick=()=>{S.click();if(!cur)return;if(au.currentTime>3)au.currentTime=0;else if(ti>0){ti--;playTrack()}};
$('#bs').onclick=()=>{S.click();if(!cur)return;au.pause();au.currentTime=0;disc.className='disc'};
$('#be').onclick=()=>{S.click();if(cur&&!busy)eject()};
function media(a,t){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=new MediaMetadata({title:t.n,artist:a.artist,album:a.title,artwork:[{src:a.art,sizes:'224x224',type:'image/jpeg'}]});
 const h=(n,f)=>navigator.mediaSession.setActionHandler(n,f);h('play',()=>au.play());h('pause',()=>au.pause());h('nexttrack',()=>$('#bn').click());h('previoustrack',()=>$('#bp').click())}catch(e){}}
/* ---------- offline library ---------- */
async function saveOffline(a){const st=$('#stat');try{const tr=[];for(let i=0;i<a.tracks.length;i++){if(st)st.textContent='Saving '+(i+1)+'/'+a.tracks.length+'...';await sleep(30);tr.push({n:a.tracks[i].n,d:a.tracks[i].d,blob:synth(a.seed*10+i,a.tracks[i].d)})}
 const rec={id:a.id,artist:a.artist,title:a.title,year:a.year,art:a.art,demo:a.demo,seed:a.seed,tracks:tr};await idb('readwrite',s=>s.put(rec));Object.assign(a,rec,{offline:1});toast(tt('savedok'));render()}catch(e){toast('Save failed: '+(e.message||'storage error'))}}
async function del(a){if(a.id==cur)await eject();try{await idb('readwrite',s=>s.delete(a.id))}catch(e){}
 if(a.demo){a.offline=0;a.tracks=a.tracks.map(t=>({n:t.n,d:t.d}))}else{A.delete(a.id);if(sel==a.id){sel=null;$('#panel').innerHTML='<div class="pi"><small>Album deleted.</small></div>'}}render();toast(tt('deleted'))}
/* ---------- import local files ---------- */
const dlg=$('#dlg'),dbox=$('#dbox');dlg.onclick=e=>{if(e.target==dlg)dlg.classList.remove('show')};
$('#imp').onclick=()=>{S.click();dbox.innerHTML='<b>Import your own album</b><input id="ia" type="text" placeholder="Artist"><input id="it" type="text" placeholder="Album title"><input id="iy" type="number" placeholder="Year" value="2010"><input id="if" type="file" accept="audio/*,image/*" multiple><small>Pick audio files in track order. Add an image to use as the cover (optional).</small><div class="act"><button class="k" id="iok">Save to library</button><button class="k" id="ino">Cancel</button></div>';dlg.classList.add('show');$('#ino').onclick=()=>dlg.classList.remove('show');$('#iok').onclick=doImport};
const dur=f=>new Promise(r=>{const a=new Audio(),u=URL.createObjectURL(f);a.onloadedmetadata=()=>{URL.revokeObjectURL(u);r(a.duration||0)};a.onerror=()=>r(0);a.src=u});
const imgArt=f=>new Promise(r=>{const i=new Image(),u=URL.createObjectURL(f);i.onload=()=>{const c=document.createElement('canvas');c.width=c.height=224;const s=Math.min(i.width,i.height);c.getContext('2d').drawImage(i,(i.width-s)/2,(i.height-s)/2,s,s,0,0,224,224);URL.revokeObjectURL(u);r(c.toDataURL('image/jpeg',.85))};i.onerror=()=>r(null);i.src=u});
async function doImport(){const fs=[...$('#if').files],au_=fs.filter(f=>f.type.startsWith('audio/')),im=fs.find(f=>f.type.startsWith('image/'));
 if(!au_.length)return toast(tt('choose'));const artist=$('#ia').value.trim()||'Unknown artist',title=$('#it').value.trim()||'Untitled',year=+$('#iy').value||2010;
 try{const tracks=[];for(const f of au_)tracks.push({n:f.name.replace(/\.[^.]+$/,''),d:await dur(f),blob:f});
  const seed=Math.floor(Math.random()*90)+10,art=(im&&await imgArt(im))||cover(artist,title,year,seed),id='u'+Date.now(),rec={id,artist,title,year,art,seed,tracks};
  await idb('readwrite',s=>s.put(rec));A.set(id,Object.assign(rec,{offline:1}));dlg.classList.remove('show');sel=id;tab='all';document.querySelectorAll('.tabs .k').forEach(x=>x.classList.toggle('on',x.dataset.t=='all'));render();toast(tt('albumok'))}catch(e){toast('Import failed: '+(e.message||'storage error'))}}
$('#set').onclick=()=>{S.click();const n={select:'CD case selection',insert:'CD insertion',tray:'Tray closing',click:'Button clicks',eject:'Ejection'};dbox.innerHTML='<b>Interface sounds</b>'+Object.keys(n).map(k=>'<label><input type="checkbox" data-k="'+k+'" '+(cfg[k]?'checked':'')+'> '+n[k]+'</label>').join('')+'<div class="act"><button class="k" id="ino">Close</button></div>';dlg.classList.add('show');$('#ino').onclick=()=>dlg.classList.remove('show');dbox.onchange=e=>{cfg[e.target.dataset.k]=e.target.checked?1:0;try{localStorage.setItem('rcd-cfg',JSON.stringify(cfg))}catch(x){}}};
/* ---------- search & tabs ---------- */
$('#q').oninput=e=>{query=e.target.value;render()};
document.querySelectorAll('.tabs .k').forEach(b=>b.onclick=()=>{S.click();tab=b.dataset.t;document.querySelectorAll('.tabs .k').forEach(x=>x.classList.toggle('on',x==b));render()});
document.querySelectorAll('.ctl .k').forEach(b=>b.addEventListener('pointerdown',()=>{}));
/* ---------- language (EN / AR) ---------- */
const DICT={en:{scan:'Scan',onphone:'On this phone',perm:'Allow access to music files in the permission prompt or in Settings, then tap Scan.',search:'Search artist, album or track',imp:'+ Import',snd:'Sound',t_all:'All albums',t_art:'Artists',t_dl:'Downloaded',t_rec:'Recent',eject:'\u25B2 Eject',nodisc:'NO DISC',drag:'Drag a CD here',hint:'Tap a CD to see its details. Pull it upward and drop it on the player to insert it.',saved:'Saved offline',nsaved:'Not saved offline',demo:'demo disc',ins:'Insert',save:'Save offline',del:'Delete',e1:'No downloaded albums yet. Save one offline or import your own files.',e2:'Nothing played yet.',e3:'No albums match.',savedok:'Saved offline',deleted:'Deleted from this device',choose:'Choose at least one audio file',albumok:'Album saved to this device',first:'Insert a CD first',impt:'Add an album',artist:'Artist',album:'Album title',year:'Year',f1:'From this phone: pick audio files in track order, plus an optional cover image.',f2:'Or from the internet: paste direct https links to audio files you are allowed to download (one per line).',ok:'Save to library',cancel:'Cancel',close:'Close',sndt:'Interface sounds',s_select:'CD case selection',s_insert:'CD insertion',s_tray:'Tray closing',s_click:'Button clicks',s_eject:'Ejection',yt:'YouTube links are not supported. Use direct links to music you may download.',https:'Links must start with https://',unk:'Unknown artist',untitled:'Untitled',dling:'Downloading',notaudio:'The link is not an audio file',done:'Album downloaded and saved',fail:'Download failed.'},
ar:{scan:'فحص',onphone:'على هذا الهاتف',perm:'اسمح بالوصول إلى ملفات الموسيقى من نافذة الإذن أو من الإعدادات، ثم اضغط فحص.',search:'ابحث عن فنان أو ألبوم أو أغنية',imp:'+ إضافة',snd:'الصوت',t_all:'كل الألبومات',t_art:'الفنانون',t_dl:'المحمّلة',t_rec:'الأخيرة',eject:'\u25B2 إخراج',nodisc:'لا يوجد قرص',drag:'اسحب قرصاً إلى هنا',hint:'المس قرصاً لعرض تفاصيله. اسحبه للأعلى وأفلته على المشغّل لإدخاله.',saved:'محفوظ بدون إنترنت',nsaved:'غير محفوظ بدون إنترنت',demo:'قرص تجريبي',ins:'إدخال',save:'حفظ بدون إنترنت',del:'حذف',e1:'لا توجد ألبومات محمّلة بعد. احفظ ألبوماً أو أضف ملفاتك.',e2:'لم يتم تشغيل شيء بعد.',e3:'لا توجد نتائج.',savedok:'تم الحفظ على الجهاز',deleted:'تم الحذف من الجهاز',choose:'اختر ملفاً صوتياً واحداً على الأقل',albumok:'تم حفظ الألبوم على الجهاز',first:'أدخل قرصاً أولاً',impt:'إضافة ألبوم',artist:'الفنان',album:'عنوان الألبوم',year:'السنة',f1:'من هذا الهاتف: اختر الملفات الصوتية بترتيب الأغاني، مع صورة غلاف اختيارية.',f2:'أو من الإنترنت: الصق روابط https مباشرة لملفات صوتية يُسمح لك بتحميلها (رابط في كل سطر).',ok:'حفظ في المكتبة',cancel:'إلغاء',close:'إغلاق',sndt:'أصوات الواجهة',s_select:'اختيار علبة القرص',s_insert:'إدخال القرص',s_tray:'إغلاق الدرج',s_click:'نقر الأزرار',s_eject:'الإخراج',yt:'روابط يوتيوب غير مدعومة. استخدم روابط مباشرة لموسيقى يُسمح لك بتحميلها.',https:'يجب أن يبدأ الرابط بـ https://',unk:'فنان غير معروف',untitled:'بدون عنوان',dling:'جارٍ التحميل',notaudio:'الرابط ليس ملفاً صوتياً',done:'تم تحميل الألبوم وحفظه',fail:'فشل التحميل.'}};
let lang='en';try{lang=localStorage.getItem('rcd-lang')||((navigator.language||'').startsWith('ar')?'ar':'en')}catch(e){}
const tt=k=>(DICT[lang]&&DICT[lang][k])||DICT.en[k]||k;
const idle=()=>lcd(tt('nodisc'),tt('drag'),'TRK --/-- 00:00',0);
function busyMsg(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(t._h)}
function applyLang(){document.documentElement.lang=lang;document.documentElement.dir=lang=='ar'?'rtl':'ltr';document.querySelectorAll('[data-i]').forEach(e=>e.textContent=tt(e.dataset.i));$('#q').placeholder=tt('search');$('#lng').textContent=lang=='ar'?'EN':'ع';if(!cur)idle();if(!sel)$('#panel').innerHTML='<div class="pi"><small>'+tt('hint')+'</small></div>';render()}
$('#lng').onclick=()=>{S.click();lang=lang=='ar'?'en':'ar';try{localStorage.setItem('rcd-lang',lang)}catch(e){}applyLang()};
$('#set').onclick=()=>{S.click();const ks=['select','insert','tray','click','eject'];dbox.innerHTML='<b>'+tt('sndt')+'</b>'+ks.map(k=>'<label><input type="checkbox" data-k="'+k+'" '+(cfg[k]?'checked':'')+'> '+tt('s_'+k)+'</label>').join('')+'<div class="act"><button class="k" id="ino">'+tt('close')+'</button></div>';dlg.classList.add('show');$('#ino').onclick=()=>dlg.classList.remove('show');dbox.onchange=e=>{cfg[e.target.dataset.k]=e.target.checked?1:0;try{localStorage.setItem('rcd-cfg',JSON.stringify(cfg))}catch(x){}}};
$('#imp').onclick=()=>{S.click();dbox.onchange=null;dbox.innerHTML='<b>'+tt('impt')+'</b><input id="ia" type="text" placeholder="'+tt('artist')+'"><input id="it" type="text" placeholder="'+tt('album')+'"><input id="iy" type="number" placeholder="'+tt('year')+'" value="2010"><small>'+tt('f1')+'</small><input id="if" type="file" accept="audio/*,image/*" multiple><small>'+tt('f2')+'</small><textarea id="il" placeholder="https://..."></textarea><div class="act"><button class="k" id="iok">'+tt('ok')+'</button><button class="k" id="ino">'+tt('cancel')+'</button></div>';dlg.classList.add('show');$('#ino').onclick=()=>dlg.classList.remove('show');$('#iok').onclick=()=>$('#il').value.trim()?doLink():doImport()};
/* ---------- download albums from direct links ---------- */
async function doLink(){const urls=$('#il').value.split(/\s+/).filter(Boolean);
 if(urls.some(u=>/youtube\.com|youtu\.be/i.test(u)))return toast(tt('yt'));
 if(urls.some(u=>!/^https:\/\//i.test(u)))return toast(tt('https'));
 const artist=$('#ia').value.trim()||tt('unk'),title=$('#it').value.trim()||tt('untitled'),year=+$('#iy').value||2010;dlg.classList.remove('show');
 try{const tracks=[];for(let i=0;i<urls.length;i++){const lab=tt('dling')+' '+(i+1)+'/'+urls.length;busyMsg(lab+'...');const r=await fetch(urls[i]);if(!r.ok)throw new Error('HTTP '+r.status);let blob;const tot=+r.headers.get('content-length');
  if(r.body&&tot){const rd=r.body.getReader(),parts=[];let got=0;for(;;){const x=await rd.read();if(x.done)break;parts.push(x.value);got+=x.value.length;busyMsg(lab+' '+Math.round(got/tot*100)+'%')}blob=new Blob(parts)}else blob=await r.blob();
  const ty=r.headers.get('content-type')||blob.type||'';if(/text|html|json/i.test(ty))throw new Error(tt('notaudio'));
  const f=new Blob([blob],{type:/^audio\//.test(ty)?ty:'audio/mpeg'});let n=urls[i].split('?')[0].split('/').pop();try{n=decodeURIComponent(n)}catch(e){}
  tracks.push({n:n.replace(/\.[^.]+$/,'')||('Track '+(i+1)),d:await dur(f),blob:f})}
  const seed=Math.floor(Math.random()*90)+10,id='u'+Date.now(),rec={id,artist,title,year,art:cover(artist,title,year,seed),seed,tracks};
  await idb('readwrite',s=>s.put(rec));A.set(id,Object.assign(rec,{offline:1}));sel=id;tab='all';document.querySelectorAll('.tabs .k').forEach(x=>x.classList.toggle('on',x.dataset.t=='all'));render();toast(tt('done'))
 }catch(e){toast(tt('fail')+' '+(e.message||''))}}
applyLang();

/* ---------- automatic device music scan (Android app only) ---------- */
const native=!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
const MS=native?Capacitor.registerPlugin('MusicScan'):null;
const PH="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='1' height='1' fill='%23222'/%3E%3C/svg%3E";
let scanning=false;
async function scanDevice(){if(!MS||scanning)return;scanning=true;
 try{const r=await MS.scan(),g=new Map();
  r.tracks.forEach(t=>{let a=g.get(t.albumId);if(!a){a={id:'m'+t.albumId,artist:t.artist||'Unknown',title:t.album||'Unknown album',year:t.year||0,art:PH,dev:1,offline:1,demo:0,seed:t.albumId%97,tracks:[]};g.set(t.albumId,a)}
   if(t.artist&&a.artist!=t.artist&&a.artist!='Various artists')a.artist='Various artists';a.tracks.push({n:t.title,d:t.dur,path:t.path,id:t.id,k:t.track})});
  if(!g.size){toast(tt('e3'));return}
  [...A.values()].forEach(a=>{if(a.dev&&!g.has(+a.id.slice(1)))A.delete(a.id)});
  [...A.values()].forEach(a=>{if(a.demo&&!a.offline)A.delete(a.id)});
  const fresh=[];g.forEach(a=>{a.tracks.sort((x,y)=>(x.k||0)-(y.k||0));const o=A.get(a.id);if(o){o.tracks=a.tracks;o.artist=a.artist;o.title=a.title}else{A.set(a.id,a);fresh.push(a.id)}});
  render();scanning=false;for(const id of fresh){const a=A.get(id);if(!a)continue;let art='';try{const x=await MS.art({id:a.tracks[0].id});art=x.art||''}catch(e){}
   a.art=art||cover(a.artist,a.title,a.year||'',a.seed);document.querySelectorAll('.cd[data-id="'+id+'"] img').forEach(i=>i.src=a.art);if(id==sel)info(id)}
 }catch(e){toast(tt('perm'))}scanning=false}
if(native){$('#scn').style.display='';$('#scn').onclick=()=>{S.click();scanDevice()};document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy&&!cur)scanDevice()})}

load().then(()=>{if(native)scanDevice()});
/* ---------- PWA: service worker + persistent storage ---------- */
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(e=>console.warn('SW failed',e)))}
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}

