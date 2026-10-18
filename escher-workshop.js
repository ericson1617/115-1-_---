/* 藝數探索：三站共用數學核心。變形必須配對，不以圖片遮蓋縫隙。 */
'use strict';
(function(){
const $=id=>document.getElementById(id);
const page=document.body.dataset.page||'create';
const initialMode=page==='translation'?'translate':page==='rotation'?'rotate':'mixX';
const names={translate:'平移鑲嵌',rotate:'180° 旋轉鑲嵌',mixX:'左右平移＋上下旋轉',mixY:'上下平移＋左右旋轉'};
const templates={square:[[1,0],[0,1]],rectangle:[[1.2,0],[0,.83]],parallelogram:[[1,0],[.32,.92]],rhombus:[[1,0],[.5,.8660254]],triangle:[[1,0],[.51,.86]]};
const paperDims={A4:[210,297],A3:[297,420],B5:[182,257],drawing:[393,545]};
const palette=['#93cbdc','#f4c6a6','#b9d8bb','#e9c6dd','#a4c6e4','#ecd89b'];
const defaultProfile=(kind)=>({p:kind==='t'?[.22,.5,.78]:[.19,.36],v:kind==='t'?[0,0,0]:[0,0]});
const s={
 mode:initialMode,shape:'square',trans:[defaultProfile('t'),defaultProfile('t')],
 rot:Array.from({length:4},()=>defaultProfile('r')),preset:'blank',
 color:'#7dbfcf',outline:true,multicolor:true,stage:3,
 className:'',seat:'',student:'',tileCm:6,paper:'A4',printKind:'tile',
 history:[],drag:null
};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mul=(a,k)=>[a[0]*k,a[1]*k],cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const norm=a=>Math.hypot(a[0],a[1]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const bound=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const fmt=x=>Number(x).toFixed(2);
const safe=t=>String(t||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,40);
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function verts(){const [u,v]=templates[s.shape];return s.shape==='triangle'?[[0,0],u,v]:[[0,0],u,add(u,v),v]}
function bases(){const v=verts();return v.map((p,i)=>[p,v[(i+1)%v.length]])}
function normal(A,B){const d=sub(B,A),l=norm(d);return[-d[1]/l,d[0]/l]}
function role(e){
 if(s.mode==='translate')return e<2?['t',e]:['paired',e===2?0:1];
 if(s.mode==='rotate')return ['r',e];
 if(s.mode==='mixX')return e===1?['t',1]:e===3?['paired',1]:['r',e];
 return e===0?['t',0]:e===2?['paired',0]:['r',e];
}
function editRoles(){
 if(s.mode==='translate')return [['t',0,0],['t',1,1]];
 if(s.mode==='rotate')return bases().map((_,i)=>['r',i,i]);
 if(s.mode==='mixX')return[['r',0,0],['t',1,1],['r',2,2]];
 return[['t',0,0],['r',1,1],['r',3,3]];
}
function profile(k,i){return k==='t'?s.trans[i]:s.rot[i]}
function halfKnots(pr){const k=[[0,0]];pr.p.forEach((x,j)=>k.push([x,pr.v[j]]));k.push([.5,0]);for(let j=pr.p.length-1;j>=0;j--)k.push([1-pr.p[j],-pr.v[j]]);k.push([1,0]);return k}
function fullKnots(pr){return[[0,0],...pr.p.map((p,j)=>[p,pr.v[j]]),[1,0]]}
function cubic(t,knots){
 if(t<=0||t>=1)return 0;
 let i=0;while(i<knots.length-2&&t>knots[i+1][0])i++;
 const [x1,y1]=knots[i],[x2,y2]=knots[i+1],dx=x2-x1;
 if(dx<1e-7)return y1;
 const s=(t-x1)/dx,p=knots[Math.max(0,i-1)],q=knots[Math.min(knots.length-1,i+2)];
 const m1=(y2-p[1])/(x2-p[0]),m2=(q[1]-y1)/(q[0]-x1);
 return(2*s**3-3*s*s+1)*y1+(s**3-2*s*s+s)*dx*m1+(-2*s**3+3*s*s)*y2+(s**3-s*s)*dx*m2;
}
function rawEdge(e,kind,index,showStage=3){
 const [A,B]=bases()[e],n=normal(A,B),pr=profile(kind,index);
 let knots=kind==='t'?fullKnots(pr):halfKnots(pr);
 if(showStage===0||(showStage===1&&e!==0))knots=[[0,0],[1,0]];
 const pts=[];
 for(let i=0;i<=34;i++){const t=i/34;pts.push(add(add(A,mul(sub(B,A),t)),mul(n,cubic(t,knots))))}
 return pts;
}
function edge(e,stage=3){
 const [kind,k]=role(e);
 if(kind!=='paired')return rawEdge(e,kind,k,stage);
 const [u,v]=templates[s.shape];
 const p=rawEdge(k,'t',k,stage),shift=e===2?v:mul(u,-1);
 return p.map(q=>add(q,shift)).reverse();
}
function tile(stage=3){const out=[];bases().forEach((_,i)=>out.push(...(i?edge(i,stage).slice(1):edge(i,stage))));return out}
function path(pts){return'M'+pts.map(p=>fmt(p[0])+','+fmt(p[1])).join(' L')+' Z'}
function simpleInter(a,b,c,d){
 const A=sub(b,a),B=sub(d,c),eps=1e-9,v1=cross(A,sub(c,a)),v2=cross(A,sub(d,a)),v3=cross(B,sub(a,c)),v4=cross(B,sub(b,c));
 if(v1*v2< -eps&&v3*v4< -eps)return true;
 const within=(x,y,z)=>Math.min(x,y)-eps<=z&&z<=Math.max(x,y)+eps;
 const on=(p,q,r)=>within(p[0],q[0],r[0])&&within(p[1],q[1],r[1]);
 return(Math.abs(v1)<eps&&on(a,b,c))||(Math.abs(v2)<eps&&on(a,b,d))||(Math.abs(v3)<eps&&on(c,d,a))||(Math.abs(v4)<eps&&on(c,d,b));
}
function valid(){
 const p=tile(),n=p.length-1;
 // tile() explicitly returns the starting point again as its last point.
 for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
  if(i===0&&j===n-1)continue;
  const a=p[i],b=p[i+1],c=p[j],d=p[j+1];
  if(Math.max(a[0],b[0])+1e-8<Math.min(c[0],d[0])||Math.max(c[0],d[0])+1e-8<Math.min(a[0],b[0])||Math.max(a[1],b[1])+1e-8<Math.min(c[1],d[1])||Math.max(c[1],d[1])+1e-8<Math.min(a[1],b[1]))continue;
  if(simpleInter(a,b,c,d))return false;
 }
 return true;
}
function snapshot(){return JSON.stringify({mode:s.mode,shape:s.shape,trans:s.trans,rot:s.rot,color:s.color,preset:s.preset})}
function restore(x){const a=typeof x==='string'?JSON.parse(x):x;for(const k of ['mode','shape','trans','rot','color','preset'])if(a[k]!==undefined)s[k]=a[k];$('mode').value=s.mode;$('shape').value=s.shape;$('color').value=s.color;render()}
function undoSave(){s.history.push(snapshot());if(s.history.length>45)s.history.shift()}
function setStatus(x){$('status').textContent=x}
function ensureShape(){
 const tri=$('shape').querySelector('option[value="triangle"]');if(tri)tri.disabled=s.mode!=='rotate';
 if(s.shape==='triangle'&&s.mode!=='rotate'){s.shape='square';$('shape').value='square';setStatus('三角形只適用於旋轉示範；綜合變形會切換為正方形。')}
}
function presetValues(name){
 const effect={
  blank:t=>0,wave:t=>.56*Math.sin(t*Math.PI*2),fish:t=>.80*Math.sin(Math.PI*t)-.18*Math.sin(3*Math.PI*t),
  cloud:t=>.72*Math.sin(Math.PI*t)**2,leaf:t=>.67*Math.sin(Math.PI*t),
  zigzag:t=>.7*Math.sign(Math.sin(t*3.1*Math.PI))*.9,
  cat:t=>(Math.sin(3*Math.PI*t)>0?.78:-.39)*Math.sin(Math.PI*t),
  wing:t=>.65*Math.sin(2*Math.PI*t)+.2*Math.sin(Math.PI*t),
  flower:t=>.72*Math.sin(3*Math.PI*t),
  mountain:t=>.72*Math.sin(3.3*Math.PI*t)
 }[name]||(()=>0);
 const l=.18*Math.min(...templates[s.shape].map(norm));
 for(const [k,i] of editRoles()){
  const pr=profile(k,i);pr.v=pr.p.map((t,j)=>{
   const z=k==='r'?effect(t)*((i%2===0)?1:-1):effect(t+(i===1?.08:0));
   return Number((z*l).toFixed(4))
  });
 }
 for(let k=0;k<12&&!valid();k++)for(const [kind,i] of editRoles())profile(kind,i).v=profile(kind,i).v.map(x=>x*.72);
 if(!valid())for(const [kind,i] of editRoles())profile(kind,i).v=profile(kind,i).v.map(()=>0);
 s.preset=name;render();
}
function modeText(){
 if(s.mode==='translate')return '將邊線剪下、平移到對邊；對應邊必須形狀相同，方向相反。可以只改一組邊，也可以同時改兩組。';
 if(s.mode==='rotate')return '沿邊的中點進行 180° 半周旋轉。系統自動讓同一條邊的後半段與前半段旋轉配對，因此圖塊可交錯密鋪。';
 if(s.mode==='mixX')return '左右兩邊維持平移配對；上下兩邊各自滿足 180° 旋轉配對。上下相鄰的圖塊半周旋轉，左右相鄰的圖塊平移。';
 return '上下兩邊維持平移配對；左右兩邊各自滿足 180° 旋轉配對。左右相鄰的圖塊半周旋轉，上下相鄰的圖塊平移。';
}
function stepsLabel(n){
 const x=page==='translation'?['① 原始多邊形','② 一組邊線平移','③ 兩組邊線變形','④ 大面積密鋪']:
 page==='rotation'?['① 原始多邊形','② 半周旋轉第一邊','③ 配對其他邊線','④ 旋轉密鋪']:
 ['① 觀察原始元件','② 先處理一組邊','③ 合併兩種配對','④ 完整密鋪'];
 return x[n];
}
function transform(points,off,unit,turn=false){
 const vs=verts(),center=mul(vs.reduce((a,p)=>add(a,p),[0,0]),1/vs.length);
 const c=s.shape==='triangle'?center:mul(add(vs[0],vs[2]),.5);
 return points.map(p=>add(off,mul(turn?sub(mul(c,2),p):p,unit)));
}
function transformTriangle(points,offset,unit,sign){return points.map(p=>add(offset,mul(p,unit*sign)))}
function triangleInstances(W,H,unit,origin,stage){
 const queue=[{sign:1,o:[0,0]}],seen=new Set(),items=[],centroid=mul(verts().reduce((a,p)=>add(a,p),[0,0]),1/3);
 const edges=bases().map(([a,b])=>mul(add(a,b),.5));
 while(queue.length&&items.length<180){
  const a=queue.shift(),ct=add(mul(centroid,a.sign),a.o),k=ct.map(v=>Math.round(v*1e5)).join(',');
  if(seen.has(k))continue;seen.add(k);
  const X=origin[0]+ct[0]*unit,Y=origin[1]+ct[1]*unit;
  if(X<-160||X>W+160||Y<-160||Y>H+160)continue;
  items.push(a);
  if(stage===0)break;
  if(stage===1&&items.length>=2)break;
  if(stage===2&&items.length>=13)break;
  for(const m of edges)queue.push({sign:-a.sign,o:add(a.o,mul(m,2*a.sign))});
 }
 return items;
}
function tilesSVG(W,H,unit,stage=3,print=false){
 const vs=verts(),v=templates[s.shape],origin=[W*.46-(v[0][0]+v[1][0])*unit*.46,H*.45-(v[0][1]+v[1][1])*unit*.46];
 let paths='',count=0;const poly=tile(stage),line=s.outline?'#426e83':'none';
 if(s.shape==='triangle'){
  const instances=triangleInstances(W,H,unit,origin,stage);
  for(const it of instances){
   const pts=transformTriangle(poly,add(origin,mul(it.o,unit)),unit,it.sign);
   const color=s.multicolor?palette[(count+Math.abs(it.sign))%palette.length]:s.color;
   paths+='<path d="'+path(pts)+'" fill="'+(print?'#fff':color)+'" stroke="'+(print?'#526875':line)+'" stroke-width="'+(print?.9:1.3)+'"/>';count++;
  }
 }else{
  for(let j=-9;j<=9;j++)for(let i=-10;i<=10;i++){
   if(stage===0&&(i||j))continue;
   if(stage===1&&!((i===0&&j===0)||(i===0&&j===-1)))continue;
   if(stage===2&&(Math.abs(i)>1||Math.abs(j)>1))continue;
   const cell=add(origin,add(mul(v[0],i*unit),mul(v[1],j*unit))),turned=
    s.mode==='rotate'?(Math.abs(i+j)%2===1):s.mode==='mixX'?(Math.abs(j)%2===1):s.mode==='mixY'?(Math.abs(i)%2===1):false;
   if(cell[0]<-420||cell[0]>W+420||cell[1]<-420||cell[1]>H+420)continue;
   const pts=transform(poly,cell,unit,turned),color=s.multicolor?palette[((i*3+j*5)%palette.length+palette.length)%palette.length]:s.color;
   paths+='<path d="'+path(pts)+'" fill="'+(print?'#fff':color)+'" stroke="'+(print?'#526875':line)+'" stroke-width="'+(print?.75:1.1)+'"/>';count++;
  }
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><rect width="100%" height="100%" fill="'+(print?'white':'#fbfeff')+'"/>'+paths+'</svg>';
}
function drawPreview(){
 const box=$('previewScene');if(!box)return;
 const W=840,H=560,unit=s.shape==='triangle'?180:150;
 box.innerHTML=tilesSVG(W,H,unit,s.stage);
 $('stepText').textContent=stepsLabel(s.stage)+'｜'+modeText();
 document.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.step)===s.stage));
 $('modeLabel').textContent=names[s.mode];
}
function edgeLabel(e){
 const label=['下邊','右邊','上邊','左邊'];
 return(s.shape==='triangle'?['第 1 邊','第 2 邊','第 3 邊']:label)[e]||'邊線';
}
function drawEditor(){
 const W=520,H=425,unit=226,origin=[128,93],vs=verts(),pts=transform(tile(),origin,unit),lines=bases();
 let svg='<defs><pattern id="gridD" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#dcecf4"/></pattern></defs><rect width="'+W+'" height="'+H+'" fill="url(#gridD)"/>';
 svg+='<path d="'+path(pts)+'" stroke="#286482" stroke-width="2.4" fill="'+esc(s.color)+'" fill-opacity=".82"/>';
 let handles=0;
 for(const [k,i,e] of editRoles()){
  const pr=profile(k,i),[A,B]=lines[e],axis=sub(B,A),n=normal(A,B);
  pr.p.forEach((t,j)=>{
   const p=add(add(A,mul(axis,t)),mul(n,pr.v[j])),from=transform([add(A,mul(axis,t))],origin,unit)[0],q=transform([p],origin,unit)[0];
   svg+='<path d="M'+fmt(from[0])+' '+fmt(from[1])+' L'+fmt(q[0])+' '+fmt(q[1])+'" stroke="#e5a26e" stroke-width="1.8" stroke-dasharray="3 3"/>';
   svg+='<circle class="handle" cx="'+fmt(q[0])+'" cy="'+fmt(q[1])+'" r="8.2" role="button" tabindex="0" aria-label="'+edgeLabel(e)+'第'+(j+1)+'控制點" data-kind="'+k+'" data-index="'+i+'" data-edge="'+e+'" data-j="'+j+'"/>';handles++;
  });
  const mid=add(A,mul(axis,.5)),midPx=transform([mid],origin,unit)[0];
  svg+='<text x="'+fmt(midPx[0]+n[0]*20)+'" y="'+fmt(midPx[1]+n[1]*20)+'" font-size="11" fill="#427b96" text-anchor="middle">'+(k==='t'?'平移':'180°')+'</text>';
 }
 for(const p of vs){const q=transform([p],origin,unit)[0];svg+='<circle cx="'+fmt(q[0])+'" cy="'+fmt(q[1])+'" r="3.3" fill="#fff" stroke="#2f6c8d" stroke-width="1.5"/>'}
 $('editorScene').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" aria-label="可拖曳的幾何元件"><g>'+svg+'</g></svg>';
 $('controlCount').textContent='可拖曳 '+handles+' 個橘色控制點（支援上下左右與斜向移動）';
}
function render(){
 ensureShape();drawEditor();drawPreview();
 const text=$('concept');if(text)text.textContent=modeText();
 const cur=$('mode');if(cur)cur.value=s.mode;
 const opt=$('shape');if(opt)opt.value=s.shape;
}
function svgPt(svg,evt){const pt=svg.createSVGPoint();pt.x=evt.clientX;pt.y=evt.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse())}
function onMove(evt){
 if(!s.drag)return;
 const svg=$('editorScene').querySelector('svg'),point=svgPt(svg,evt),pos=[(point.x-128)/226,(point.y-93)/226];
 const {kind,index,edge,j}=s.drag,pr=profile(kind,index),[A,B]=bases()[edge],axis=sub(B,A),len2=dot(axis,axis),n=normal(A,B);
 const oldP=pr.p[j],oldV=pr.v[j];
 const gap=.045,min=kind==='r'?.055:.045,max=kind==='r'?.455:.955;
 const lower=j?pr.p[j-1]+gap:min,upper=j===pr.p.length-1?max:pr.p[j+1]-gap;
 const t=bound(dot(sub(pos,A),axis)/len2,lower,upper);
 const foot=add(A,mul(axis,t)),limit=Math.min(.23,.24*Math.min(...templates[s.shape].map(norm)));
 pr.p[j]=Number(t.toFixed(4));pr.v[j]=Number(bound(dot(sub(pos,foot),n),-limit,limit).toFixed(4));
 if(!valid()){pr.p[j]=oldP;pr.v[j]=oldV;setStatus('這樣會造成輪廓交叉，已限制控制點的位置。');return}
 s.stage=3;render();
}
function attachEvents(){
 $('mode').value=s.mode;
 $('mode').addEventListener('change',e=>{undoSave();s.mode=e.target.value;s.stage=3;render()});
 $('shape').addEventListener('change',e=>{undoSave();s.shape=e.target.value;s.stage=3;render()});
 $('preset').addEventListener('change',e=>{undoSave();presetValues(e.target.value);s.stage=3});
 $('color').addEventListener('input',e=>{s.color=e.target.value;render()});
 $('outline').addEventListener('change',e=>{s.outline=e.target.checked;drawPreview()});
 $('multicolor').addEventListener('change',e=>{s.multicolor=e.target.checked;drawPreview()});
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{s.stage=Number(b.dataset.step);drawPreview()}));
 $('undo').addEventListener('click',()=>{if(s.history.length)restore(s.history.pop());else setStatus('目前沒有上一步。')});
 $('reset').addEventListener('click',()=>{undoSave();s.trans=[defaultProfile('t'),defaultProfile('t')];s.rot=Array.from({length:4},()=>defaultProfile('r'));s.preset='blank';$('preset').value='blank';s.stage=3;render()});
 $('addPoint').addEventListener('click',()=>{
  const r=editRoles()[0],pr=profile(r[0],r[1]),max=r[0]==='r'?.47:.96;
  if(pr.p.length>=6){setStatus('每組輪廓最多 6 個可編輯控制點。');return}
  undoSave();let prev=.04,best=.0,at=0;
  for(let i=0;i<=pr.p.length;i++){const next=i===pr.p.length?max:pr.p[i],d=next-prev;if(d>best){best=d;at=i}prev=next}
  const before=at?pr.p[at-1]:.04,after=at===pr.p.length?max:pr.p[at];
  pr.p.splice(at,0,(before+after)/2);pr.v.splice(at,0,0);render();setStatus('已替第一組邊線增加一個可自由拖曳的控制點。')
 });
 const container=$('editorScene');
 container.addEventListener('pointerdown',e=>{
  const h=e.target.closest('[data-kind]');if(!h)return;
  undoSave();s.drag={kind:h.dataset.kind,index:Number(h.dataset.index),edge:Number(h.dataset.edge),j:Number(h.dataset.j)};
  container.querySelector('svg').setPointerCapture(e.pointerId);e.preventDefault();
 });
 container.addEventListener('pointermove',onMove);
 for(const ty of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(ty,()=>s.drag=null);
 container.addEventListener('keydown',e=>{
  const h=e.target.closest('[data-kind]');if(!h||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();undoSave();const a=profile(h.dataset.kind,Number(h.dataset.index)),j=Number(h.dataset.j),dy=e.key==='ArrowUp'?-.012:e.key==='ArrowDown'?.012:0,dx=e.key==='ArrowLeft'?-.016:e.key==='ArrowRight'?.016:0;
  const old=a.v[j];a.v[j]+=dy+dx; if(!valid())a.v[j]=old;render();
 });
 $('downloadSVG').addEventListener('click',()=>download('image/svg+xml',studentSVG(),'元件設計.svg'));
 $('downloadPNG').addEventListener('click',async()=>{try{await png(tilesSVG(1200,850,210,3),'完整鑲嵌.png')}catch(e){setStatus('PNG 轉換失敗，請先下載 SVG。')}});
 $('downloadTilePNG').addEventListener('click',async()=>{try{await png(singleSVG(850,700,true),'我的元件.png')}catch(e){setStatus('PNG 轉換失敗，請先下載 SVG。')}});
 $('downloadPrint').addEventListener('click',()=>download('image/svg+xml',printSVG(),s.printKind==='tile'?'描繪元件模板.svg':'密鋪參考圖.svg'));
 $('print').addEventListener('click',()=>{
  const node=$('printOnly');node.innerHTML=printSVG();window.print();
 });
 $('paper').addEventListener('change',e=>s.paper=e.target.value);
 $('tileCm').addEventListener('change',e=>s.tileCm=Number(e.target.value));
 $('printKind').addEventListener('change',e=>s.printKind=e.target.value);
 for(const [id,key] of [['className','className'],['seat','seat'],['student','student']])$(id).addEventListener('input',e=>s[key]=e.target.value);
 $('load').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{let t=await file.text(),d;
   if(t.trimStart().startsWith('<')){const xml=new DOMParser().parseFromString(t,'image/svg+xml'),node=xml.querySelector('#escher-project');if(!node)throw Error('SVG 沒有專案資料');d=JSON.parse(node.textContent)}
   else d=JSON.parse(t);
   if(!d||!d.trans||!d.rot)throw Error('不是本工具的專案');
   undoSave();restore(d);for(const k of ['className','seat','student']){if(d[k]!==undefined){s[k]=d[k];$(k).value=d[k]}}
   s.stage=3;setStatus('已載入作品：可繼續拖曳修改。');
  }catch(err){setStatus('無法載入作品：'+err.message)}
  e.target.value='';
 });
}
function studentData(){return{app:'藝數探索艾薛爾工作室',version:2,mode:s.mode,shape:s.shape,trans:s.trans,rot:s.rot,color:s.color,preset:s.preset,className:s.className,seat:s.seat,student:s.student}}
function filename(suffix){let name=[safe(s.className),safe(s.seat),safe(s.student)].filter(Boolean).join('_');return(name||'藝數探索_未命名')+'_'+suffix}
function projectMeta(){return'<metadata id="escher-project">'+esc(JSON.stringify(studentData()))+'</metadata>'}
function singleSVG(W,H,transparent=false){
 const points=tile(3),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),sc=.74*Math.min(W/(maxX-minX),H/(maxY-minY));
 const O=[(W-(maxX-minX)*sc)/2-minX*sc,(H-(maxY-minY)*sc)/2-minY*sc],poly=transform(points,O,sc);
 return'<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+(transparent?'':'<rect width="100%" height="100%" fill="white"/>')+'<path d="'+path(poly)+'" fill="'+esc(s.color)+'" stroke="#225e7c" stroke-width="3"/></svg>';
}
function studentSVG(){
 const design=tilesSVG(1200,850,194,3);
 return design.replace(/<svg\b([^>]*)>/,'<svg$1>'+projectMeta()+'<title>'+esc(filename('鑲嵌作品'))+'</title>');
}
function printSVG(){
 const [W,H]=paperDims[s.paper],kind=s.printKind,margin=14;
 if(kind==='pattern'){
  const body=tilesSVG(W,H,s.tileCm*10,3,true);
  const inner=body.replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
  return'<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="0 0 '+W+' '+H+'">'+inner+'</svg>';
 }
 const pts=tile(),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),a=Math.min(...xs),b=Math.max(...xs),c=Math.min(...ys),d=Math.max(...ys),sc=s.tileCm*10/Math.max(b-a,d-c);
 const O=[W/2-(a+b)*sc/2,H/2-(c+d)*sc/2];
 return'<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'mm" height="'+H+'mm" viewBox="0 0 '+W+' '+H+'"><rect width="'+W+'" height="'+H+'" fill="white"/><text x="14" y="17" fill="#465769" font-family="sans-serif" font-size="4.5">藝數探索｜元件描繪模板　'+esc(names[s.mode])+'</text><text x="14" y="24" fill="#6a7c87" font-family="sans-serif" font-size="3.7">剪下外框，以厚紙描繪並連續移動；列印請使用「實際大小 100%」。</text><path d="'+path(transform(pts,O,sc))+'" fill="white" stroke="#1e3d4f" stroke-width=".72"/><text x="14" y="'+(H-12)+'" fill="#6a7c87" font-family="sans-serif" font-size="3.7">'+esc([s.className,s.seat,s.student].filter(Boolean).join(' / '))+'</text></svg>';
}
function download(type,content,suffix){
 const blob=new Blob([content],{type:type+';charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename(suffix);document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);setStatus('已準備下載：'+a.download);
}
async function png(svg,suffix){
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();
 await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
 const canvas=document.createElement('canvas'),match=svg.match(/width="([0-9]+)"/),mh=svg.match(/height="([0-9]+)"/);
 canvas.width=Number(match?.[1]||1200);canvas.height=Number(mh?.[1]||850);
 canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);
 const b=await new Promise(res=>canvas.toBlob(res,'image/png'));
 if(!b)throw Error('PNG encode failed');
 const link=URL.createObjectURL(b),a=document.createElement('a');a.href=link;a.download=filename(suffix);a.click();setTimeout(()=>URL.revokeObjectURL(link),1000);
 setStatus('已準備下載：'+a.download);
}
window.EscherWorkshopDebug={state:s,valid,tile,edge,tilesSVG,triangleInstances,printSVG,snapshot,restore,presetValues};
attachEvents();render();
})();