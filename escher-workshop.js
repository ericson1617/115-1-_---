/* 藝數探索：三站共用數學核心。變形必須配對，不以圖片遮蓋縫隙。 */
'use strict';
(function(){
const $=id=>document.getElementById(id);
const page=document.body.dataset.page||'create';
const initialMode=page==='translation'?'translate':page==='rotation'?'rotate':'mixX';
const names={translate:'平移鑲嵌',rotate:'180° 旋轉鑲嵌',mixX:'左右平移＋上下旋轉',mixY:'上下平移＋左右旋轉',rotate90:'90° 頂點旋轉｜正方形',rotate120:'120° 頂點旋轉｜正六邊形'};
const templates={square:[[1,0],[0,1]],rectangle:[[1.2,0],[0,.83]],parallelogram:[[1,0],[.32,.92]],rhombus:[[1,0],[.5,.8660254]],triangle:[[1,0],[.51,.86]],hexagon:[[1,0],[.5,.8660254]]};
const paperDims={A4:[210,297],A3:[297,420],B5:[182,257],drawing:[393,545]};
const palette=['#93cbdc','#f4c6a6','#b9d8bb','#e9c6dd','#a4c6e4','#ecd89b'];
const defaultProfile=(kind)=>({p:kind==='t'?[.22,.5,.78]:[.19,.36],v:kind==='t'?[0,0,0]:[0,0]});
const s={
 mode:initialMode,shape:'square',trans:[defaultProfile('t'),defaultProfile('t')],
 rot:Array.from({length:4},()=>defaultProfile('r')),hex:Array.from({length:3},()=>({p:[.18,.36,.57,.78],v:[0,0,0,0]})),quarter:{p:[.13,.32,.5,.68,.87],v:[0,0,0,0,0]},preset:'blank',
 color:'#7dbfcf',outline:true,multicolor:true,stage:3,
 className:'',seat:'',student:'',tileCm:6,paper:'A4',printKind:'tile',
 history:[],drag:null,stepProgress:1,selectedEdge:2,drawTool:'points',sketching:null
};
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]],sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
const mul=(a,k)=>[a[0]*k,a[1]*k],cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
const norm=a=>Math.hypot(a[0],a[1]),dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const bound=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const fmt=x=>Number(x).toFixed(2);
const safe=t=>String(t||'').replace(/[<>:"/\\|?*\x00-\x1f]/g,'').trim().slice(0,40);
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const rotate=(p,a,center=[0,0])=>{const q=sub(p,center),C=Math.cos(a),S=Math.sin(a);return add(center,[q[0]*C-q[1]*S,q[0]*S+q[1]*C])};
const hexVerts=()=>Array.from({length:6},(_,k)=>[Math.cos(k*Math.PI/3),Math.sin(k*Math.PI/3)]);
function verts(){if(s.shape==='hexagon')return hexVerts();const [u,v]=templates[s.shape];return s.shape==='triangle'?[[0,0],u,v]:[[0,0],u,add(u,v),v]}
function bases(){const v=verts();return v.map((p,i)=>[p,v[(i+1)%v.length]])}
function normal(A,B){const d=sub(B,A),l=norm(d);return[-d[1]/l,d[0]/l]}
function minBaseSide(){return Math.min(...bases().map(([a,b])=>norm(sub(b,a))))}
function role(e){
 if(s.mode==='rotate90')return e===0?['q',0]:['quarterPair',e];
 if(s.mode==='rotate120')return e%2===1?['h',(e-1)/2]:['hexPair',e];
 if(s.mode==='translate')return e<2?['t',e]:['paired',e===2?0:1];
 if(s.mode==='rotate')return ['r',e];
 if(s.mode==='mixX')return e===1?['t',1]:e===3?['paired',1]:['r',e];
 return e===0?['t',0]:e===2?['paired',0]:['r',e];
}
function editRoles(){
 if(s.mode==='rotate90')return [['q',0,0]];
 if(s.mode==='rotate120')return [['h',0,1],['h',1,3],['h',2,5]];
 if(s.mode==='translate')return [['t',0,0],['t',1,1]];
 if(s.mode==='rotate')return bases().map((_,i)=>['r',i,i]);
 if(s.mode==='mixX')return[['r',0,0],['t',1,1],['r',2,2]];
 return[['t',0,0],['r',1,1],['r',3,3]];
}
function profile(k,i){return k==='t'?s.trans[i]:k==='r'?s.rot[i]:k==='q'?s.quarter:s.hex[i]}
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
function rawEdge(e,kind,index){
 const [A,B]=bases()[e],n=normal(A,B),pr=profile(kind,index);
 if(kind==='t'&&Array.isArray(pr.sketch)&&pr.sketch.length>=2){
  return pr.sketch.map(([t,d])=>add(add(A,mul(sub(B,A),t)),mul(n,d)));
 }
 const knots=kind==='r'?halfKnots(pr):fullKnots(pr);
 const pts=[];
 for(let i=0;i<=68;i++){const t=i/68;pts.push(add(add(A,mul(sub(B,A),t)),mul(n,offset(t,knots,pr.angular))))}
 return pts;
}
// Piecewise linear interpolation preserves the sharp vertices in the arrow cut-out.
function offset(t,knots,angular){
 if(!angular)return cubic(t,knots);
 if(t<=0||t>=1)return 0;let i=0;while(i<knots.length-2&&t>knots[i+1][0])i++;
 const [x,y]=knots[i],[xx,yy]=knots[i+1];return y+(yy-y)*(t-x)/(xx-x);
}
function edge(e){
 const [kind,k]=role(e);
 if(kind==='quarterPair'){
  const P=rawEdge(0,'q',0),A=[0,0],B=[1,0],C=[1,1];
  if(e===1)return P.map(p=>rotate(p,-Math.PI/2,B)).reverse();
  if(e===2)return P.map(p=>[1-p[0],1-p[1]]);
  return P.map(p=>rotate(p,Math.PI/2,A)).reverse();
 }
 if(kind==='hexPair'){
  const V=verts(),pivot=V[e],src=(e+5)%6;
  return rawEdge(src,'h',(src-1)/2).map(p=>rotate(p,-Math.PI*2/3,pivot)).reverse();
 }
 if(kind!=='paired')return rawEdge(e,kind,k);
 const [u,v]=templates[s.shape];
 const p=rawEdge(k,'t',k),shift=e===2?v:mul(u,-1);
 return p.map(q=>add(q,shift)).reverse();
}
function tile(){const out=[];bases().forEach((_,i)=>out.push(...(i?edge(i).slice(1):edge(i))));return out}
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
function snapshot(){return JSON.stringify({mode:s.mode,shape:s.shape,trans:s.trans,rot:s.rot,quarter:s.quarter,hex:s.hex,color:s.color,preset:s.preset,selectedEdge:s.selectedEdge})}
function restore(x){const a=typeof x==='string'?JSON.parse(x):x;for(const k of ['mode','shape','trans','rot','quarter','hex','color','preset','selectedEdge'])if(a[k]!==undefined)s[k]=a[k];$('mode').value=s.mode;$('shape').value=s.shape;$('color').value=s.color;render()}
function undoSave(){s.history.push(snapshot());if(s.history.length>45)s.history.shift()}
function setStatus(x){$('status').textContent=x}
function ensureShape(){
 const shape=$('shape');
 const tr=shape.querySelector('option[value="triangle"]'),hx=shape.querySelector('option[value="hexagon"]');
 if(tr)tr.disabled=s.mode!=='rotate';
 if(hx)hx.disabled=s.mode!=='rotate120';
 const arrow=$('preset').querySelector('option[value="arrow"]');if(arrow)arrow.disabled=s.mode!=='translate';
 if(s.mode!=='translate'&&$('preset').value==='arrow')$('preset').value='blank';
 if(s.mode==='rotate90'&&s.shape!=='square')s.shape='square';
 else if(s.mode==='rotate120'&&s.shape!=='hexagon')s.shape='hexagon';
 else if(s.mode!=='rotate120'&&s.shape==='hexagon')s.shape='square';
 else if(s.mode!=='rotate'&&s.shape==='triangle')s.shape='square';
 shape.value=s.shape;
}
function presetValues(name){
 if(name==='arrow'&&s.mode!=='translate'){setStatus('箭頭剪貼預設僅適用「平移」；請先切換為平移模式。');$('preset').value='blank';return}
 if(name==='arrow'&&s.mode==='translate'){
  s.trans[0]={p:[.12,.26,.47,.68,.86],v:[0,-.11,.18,-.11,0],angular:true};
  s.trans[1]={p:[.14,.28,.5,.72,.86],v:[0,-.08,-.43,-.08,0],angular:true};
  s.preset=name;render();return;
 }
 for(const [kind,i] of editRoles())profile(kind,i).angular=false;
 const effect={
  blank:t=>0,wave:t=>.56*Math.sin(t*Math.PI*2),fish:t=>.80*Math.sin(Math.PI*t)-.18*Math.sin(3*Math.PI*t),
  cloud:t=>.72*Math.sin(Math.PI*t)**2,leaf:t=>.67*Math.sin(Math.PI*t),
  zigzag:t=>.7*Math.sign(Math.sin(t*3.1*Math.PI))*.9,
  cat:t=>(Math.sin(3*Math.PI*t)>0?.78:-.39)*Math.sin(Math.PI*t),
  wing:t=>.65*Math.sin(2*Math.PI*t)+.2*Math.sin(Math.PI*t),
  flower:t=>.72*Math.sin(3*Math.PI*t),
  mountain:t=>.72*Math.sin(3.3*Math.PI*t)
 }[name]||(()=>0);
 const l=.18*minBaseSide();
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
 if(s.mode==='rotate90')return '正方形頂點旋轉：每個相鄰元件繞共用角點旋轉 90°；四片不同方向的元件可組成一個週期，再向外延伸。';
 if(s.mode==='rotate120')return '正六邊形頂點旋轉：每三片元件繞共用頂點旋轉 120°；三條自由邊與另外三條配對邊保持精確接合。';
 if(s.mode==='translate')return '將邊線剪下、平移到對邊；對應邊必須形狀相同，方向相反。箭頭可以有尖角、凹口，不必只用光滑曲線。';
 if(s.mode==='rotate')return '沿邊的中點進行 180° 半周旋轉。系統自動讓同一條邊的後半段與前半段旋轉配對，因此圖塊可交錯密鋪。';
 if(s.mode==='mixX')return '左右兩邊維持平移配對；上下兩邊各自滿足 180° 旋轉配對。上下相鄰的圖塊半周旋轉，左右相鄰的圖塊平移。';
 return '上下兩邊維持平移配對；左右兩邊各自滿足 180° 旋轉配對。左右相鄰的圖塊半周旋轉，上下相鄰的圖塊平移。';
}
function stepsLabel(n){
 const x=page==='translation'?['① 初始圖形','② 剪貼位置與平移方向','③ 兩片元件接合','④ 完整密鋪']:
 page==='rotation'?['① 初始圖形','② 剪貼區與旋轉角度','③ 旋轉一圈的元件','④ 完整密鋪']:
 ['① 初始圖形','② 剪貼與移動路徑','③ 一組元件接合','④ 完整密鋪'];
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
 const corners=bases().map(([a,b])=>mul(add(a,b),.5));
 while(queue.length&&items.length<220){
  const a=queue.shift(),ct=add(mul(centroid,a.sign),a.o),key=ct.map(x=>Math.round(x*1e5)).join(',');
  if(seen.has(key))continue;seen.add(key);
  const X=origin[0]+ct[0]*unit,Y=origin[1]+ct[1]*unit;
  if(X<-170||X>W+170||Y<-170||Y>H+170)continue;
  items.push(a);if(stage===0||stage===1&&items.length>=2||stage===2&&items.length>=2)break;
  for(const m of corners)queue.push({sign:-a.sign,o:add(a.o,mul(m,2*a.sign))});
 }
 return items;
}
function hexInstances(W,H,unit,origin,stage){
 const queue=[{c:[0,0],k:0}],seen=new Set(),items=[],V=hexVerts();
 while(queue.length&&items.length<380){
  const a=queue.shift(),key=a.c.map(x=>Math.round(x*1e5)).join(',');
  if(seen.has(key))continue;seen.add(key);
  const X=origin[0]+a.c[0]*unit,Y=origin[1]+a.c[1]*unit;
  if(X<-200||X>W+200||Y<-200||Y>H+200)continue;
  items.push(a);
  if(stage===0||stage===1&&items.length>=2||stage===2&&items.length>=3)break;
  for(const index of [0,2,4]){
   const pivot=add(a.c,rotate(V[index],a.k*2*Math.PI/3));
   for(const dir of [-1,1]){
    const next=rotate(a.c,dir*2*Math.PI/3,pivot);
    queue.push({c:next,k:(a.k+dir+3)%3});
   }
  }
 }
 return items;
}
// One real, editable tile is moved by the exact classroom transformation.
// At 100% it lands on its actual neighbouring cell; at 0% it overlaps the original.

function arrowMark(a,b,color='#b16b34'){
 const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
 if(L<9)return '';const x=dx/L,y=dy/L,head=[b[0]-x*15+y*7,b[1]-y*15-x*7],tail=[b[0]-x*15-y*7,b[1]-y*15+x*7];
 return '<path d="M'+fmt(a[0])+','+fmt(a[1])+' L'+fmt(b[0])+','+fmt(b[1])+' M'+fmt(head[0])+','+fmt(head[1])+' L'+fmt(b[0])+','+fmt(b[1])+' L'+fmt(tail[0])+','+fmt(tail[1])+'" fill="none" stroke="'+color+'" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
}
function visualLabel(txt,x,y,color='#346583'){return'<text x="'+fmt(x)+'" y="'+fmt(y)+'" font-size="18" font-family="sans-serif" fill="'+color+'" font-weight="bold">'+txt+'</text>'}
function movementSVG(W,H,unit,progress,print=false){
 const V=verts(),P=tile(),ctr=s.shape==='hexagon'?[0,0]:[.5,.5],O=s.shape==='hexagon'?[W*.45,H*.53]:[W*.33,H*.36];
 let angle=0,pivot=[0,0],move=p=>p;
 if(s.mode==='translate'||s.mode==='mixY'){
  const [u,v]=templates[s.shape],shift=s.mode==='translate'?(s.selectedEdge===0?mul(v,-1):s.selectedEdge===2?v:s.selectedEdge===1?u:mul(u,-1)):v;
  move=p=>add(p,mul(shift,progress));
 }else{
  angle=s.mode==='rotate90'?Math.PI/2*progress:s.mode==='rotate120'?-2*Math.PI/3*progress:Math.PI*progress;
  pivot=s.mode==='rotate90'?[1,1]:s.mode==='rotate120'?hexVerts()[0]:mul(add(bases()[0][0],bases()[0][1]),.5);
  move=p=>rotate(p,angle,pivot);
 }
 const toPx=p=>add(O,mul(p,unit));
 const shape0=V.map(toPx),shape1=P.map(toPx),moved=P.map(p=>toPx(move(p)));
 const fill=print?'#fff':'#a9d9e6';
 let drawings='<path d="'+path(shape0)+'" fill="none" stroke="#859db2" stroke-width="2.4" stroke-dasharray="7 7"/>';
 drawings+='<path d="'+path(shape1)+'" fill="'+fill+'" fill-opacity=".80" stroke="#316481" stroke-width="2.6"/>';
 // Cut-and-paste demonstration: colored altered edge and its original straight-edge ghost.
 const shapeEdges=bases(),roles=page==='translation'?[['t',sourceForSide(s.selectedEdge),s.selectedEdge]]:editRoles();
 const hues=['#df6e63','#56a37a','#e0a241','#9b7bb9'];
 for(let k=0;k<Math.min(roles.length,4);k++){
  const e=roles[k][2],edited=edge(e).map(toPx);
  const [A,B]=shapeEdges[e],mid=toPx(mul(add(A,B),.5));
  drawings+='<path d="'+path(edited)+'" fill="none" stroke="'+hues[k]+'" stroke-width="5" stroke-linecap="round"/>';
  if(k<2)drawings+='<circle cx="'+fmt(mid[0])+'" cy="'+fmt(mid[1])+'" r="5" fill="'+hues[k]+'"/>';
 }
 drawings+='<path d="'+path(moved)+'" fill="'+(print?'white':'#f3c39d')+'" fill-opacity=".72" stroke="#c3773c" stroke-width="2.6"/>';
 drawings+=visualLabel('原始位置（虛線）',32,40,'#547b93')+visualLabel('彩色線段＝修改的邊界',32,69,'#b26a32');
 if(s.mode==='translate'||s.mode==='mixY'){
  const center=P.reduce((sum,p)=>add(sum,p),[0,0]).map(v=>v/P.length);
  const shift=sub(move(center),center),d=norm(shift),perp=d>1e-6?[-shift[1]/d,shift[0]/d]:[0,-1];
  const a=toPx(add(center,mul(perp,.48))),b=toPx(add(move(center),mul(perp,.48)));
  const direction=s.mode==='translate'?['往上','往右','往下','往左'][s.selectedEdge]:'平移';
  drawings+=arrowMark(a,b)+visualLabel(direction+'平移',b[0]+15,b[1]-11,'#a46c39');
 }else{
  const Q=toPx(pivot),radius=63,start=-Math.PI*.43,end=start+angle;
  const pathArc='M'+fmt(Q[0]+radius*Math.cos(start))+','+fmt(Q[1]+radius*Math.sin(start))+' A'+radius+','+radius+' 0 '+(Math.abs(angle)>Math.PI?'1':'0')+' '+(angle>=0?'1':'0')+' '+fmt(Q[0]+radius*Math.cos(end))+','+fmt(Q[1]+radius*Math.sin(end));
  const e=[Q[0]+radius*Math.cos(end),Q[1]+radius*Math.sin(end)],before=[Q[0]+radius*Math.cos(end-Math.sign(angle)*.19),Q[1]+radius*Math.sin(end-Math.sign(angle)*.19)];
  drawings+='<circle cx="'+fmt(Q[0])+'" cy="'+fmt(Q[1])+'" r="7" fill="#e78048" stroke="white" stroke-width="2"/><path d="'+pathArc+'" fill="none" stroke="#c46c3b" stroke-width="3.6"/>'+arrowMark(before,e);
  const degree=Math.abs(angle*180/Math.PI);
  drawings+=visualLabel('已旋轉 '+Math.round(degree)+'°',Q[0]+70,Q[1]-60,'#ae672e');
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><rect width="100%" height="100%" fill="'+(print?'white':'#fbfeff')+'"/>'+drawings+'</svg>';
}
function tilesSVG(W,H,unit,stage=3,print=false){
 if(stage===1)return movementSVG(W,H,unit,s.stepProgress,print);
 const v=templates[s.shape],origin=s.shape==='hexagon'?[W/2,H/2]:
  [W*.46-(v[0][0]+v[1][0])*unit*.46,H*.45-(v[0][1]+v[1][1])*unit*.46];
 let paths='',count=0;const poly=tile(),line=s.outline?'#426e83':'none';
 const fill=(i,j)=>print?'#fff':s.multicolor?palette[((i*3+j*5)%palette.length+palette.length)%palette.length]:s.color;
 const insert=(pts,col)=>{paths+='<path d="'+path(pts)+'" fill="'+col+'" stroke="'+(print?'#526875':line)+'" stroke-width="'+(print?.8:1.3)+'"/>';count++};
 if(s.shape==='hexagon'){
  for(const it of hexInstances(W,H,unit,origin,stage)){
   const p=poly.map(q=>add(origin,mul(add(rotate(q,it.k*2*Math.PI/3),it.c),unit)));
   insert(p,fill(it.k,count));
  }
 }else if(s.shape==='triangle'){
  for(const it of triangleInstances(W,H,unit,origin,stage)){
   const pts=transformTriangle(poly,add(origin,mul(it.o,unit)),unit,it.sign);
   insert(pts,fill(count,it.sign));
  }
 }else{
  const center=[.5,.5];
  if(s.mode==='rotate90'&&stage===2){
   // Four distinct quarters around one shared vertex: 0°, 90°, 180°, 270°.
   const pivot=[1,1];
   for(let k=0;k<4;k++){
    insert(poly.map(p=>add(origin,mul(rotate(p,k*Math.PI/2,pivot),unit))),fill(k,0));
   }
  }else for(let j=-9;j<=9;j++)for(let i=-10;i<=10;i++){
   if(stage===0&&(i||j))continue;
   if(stage===2){
    const picked=s.mode==='translate'?[ [0,-1],[1,0],[0,1],[-1,0] ][s.selectedEdge]:[0,-1];
    const pair=s.mode==='rotate90'?([[0,0],[1,0],[1,1],[0,1]].some(([x,y])=>x===i&&y===j)):
       ((i===0&&j===0)||(i===picked[0]&&j===picked[1]));
    if(!pair)continue;
   }
   const cell=add(origin,add(mul(v[0],i*unit),mul(v[1],j*unit)));
   if(cell[0]<-420||cell[0]>W+420||cell[1]<-420||cell[1]>H+420)continue;
   if(s.mode==='rotate90'){
    const k=((-(i+j))%4+4)%4;
    insert(poly.map(p=>add(cell,mul(rotate(p,k*Math.PI/2,center),unit))),fill(i,j));
   }else{
    const turned=s.mode==='rotate'?(Math.abs(i+j)%2===1):s.mode==='mixX'?(Math.abs(j)%2===1):s.mode==='mixY'?(Math.abs(i)%2===1):false;
    insert(transform(poly,cell,unit,turned),fill(i,j));
   }
  }
 }
 if(stage===0){
  // Stage one is only the unmodified starting polygon; keep the editable tile in the left editor.
  paths='<path d="'+path(verts().map(p=>add(origin,mul(p,unit))))+'" fill="#b7dce9" stroke="#347397" stroke-width="2.7"/>';
  paths+=visualLabel('起始圖形（尚未剪貼）',30,44);
 }
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><rect width="100%" height="100%" fill="'+(print?'white':'#fbfeff')+'"/>'+paths+'</svg>';
}
function drawPreview(){
 const box=$('previewScene');if(!box)return;
 const W=840,H=560,unit=s.shape==='triangle'?180:s.shape==='hexagon'?122:150;
 box.innerHTML=tilesSVG(W,H,unit,s.stage);
 const progress=$('stepProgress'),progressLabel=$('progressValue');if(progress){progress.disabled=s.stage!==1;progress.value=Math.round(s.stepProgress*100)}
 if(progressLabel)progressLabel.textContent=s.stage===1?Math.round(s.stepProgress*100)+'%':'請選「步驟二」操作';
 $('stepText').textContent=stepsLabel(s.stage)+'｜'+modeText();
 document.querySelectorAll('[data-step]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.step)===s.stage));
 $('modeLabel').textContent=names[s.mode];
}
function edgeLabel(e){
 const label=['上邊','右邊','下邊','左邊'];
 return(s.shape==='triangle'?['第 1 邊','第 2 邊','第 3 邊']:label)[e]||'邊線';
}

function sourceForSide(e){return e%2===0?0:1}
function pointOnSelected(t,d,e){
 const src=sourceForSide(e),[A,B]=bases()[src],[u,v]=templates[s.shape],
 shift=e===2?v:e===3?mul(u,-1):[0,0];
 return add(add(add(A,mul(sub(B,A),t)),mul(normal(A,B),d)),shift);
}
function projectOnSelected(p,e){
 const src=sourceForSide(e),[A,B]=bases()[src],[u,v]=templates[s.shape],shift=e===2?v:e===3?mul(u,-1):[0,0],q=sub(p,shift),axis=sub(B,A);
 return [dot(sub(q,A),axis)/dot(axis,axis),dot(sub(q,A),normal(A,B))];
}
function editorPoint(e){
 const [A,B]=bases()[e];return [A,B];
}
function drawTranslationEditor(){
 const W=520,H=425,unit=226,O=[128,93],vs=verts(),e=s.selectedEdge,src=sourceForSide(e),pr=s.trans[src];
 const toPx=p=>add(O,mul(p,unit));
 const [a,b,d,c]=vs,mid=(p,q)=>mul(add(p,q),.5);
 const a01=mid(a,b),a12=mid(b,d),a23=mid(d,c),a30=mid(c,a);
 const half=e===0?[a,b,a12,a30]:e===1?[b,d,a23,a01]:e===2?[a30,a12,d,c]:[a,a01,a23,c];
 let svg='<defs><pattern id="gridD" width="23" height="23" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#dcecf4"/></pattern></defs><rect width="'+W+'" height="'+H+'" fill="url(#gridD)"/>';
 svg+='<path d="'+path(half.map(toPx))+'" fill="#fff1df" stroke="none"/>';
 svg+='<path d="'+path(tile().map(toPx))+'" fill="'+esc(s.color)+'" fill-opacity=".77" stroke="#2c617d" stroke-width="2.4"/>';
 svg+='<path class="selected-edge" d="'+path(edge(e).map(toPx))+'" fill="none" stroke="#e98b3d" stroke-width="5" stroke-linecap="round"/>';
 svg+='<path d="'+path(edge((e+2)%4).map(toPx))+'" fill="none" stroke="#329d90" stroke-width="4" stroke-dasharray="6 5"/>';
 for(const p of bases()[e]){const q=toPx(p);svg+='<circle cx="'+fmt(q[0])+'" cy="'+fmt(q[1])+'" r="5.2" fill="#fff" stroke="#326781" stroke-width="2"/>'}
 let count=0;
 if(s.drawTool==='points'){
  const ink=Array.isArray(pr.sketch)&&pr.sketch.length>2;
  const list=ink?pr.sketch.slice(1,-1).map((_,j)=>j+1).filter((_,j)=>j%Math.max(1,Math.ceil((pr.sketch.length-2)/9))===0):pr.p.map((_,j)=>j);
  for(const j of list){
   const [t,d]=ink?pr.sketch[j]:[pr.p[j],pr.v[j]],p=toPx(pointOnSelected(t,d,e)),base=toPx(pointOnSelected(t,0,e));
   svg+='<path d="M'+fmt(base[0])+','+fmt(base[1])+' L'+fmt(p[0])+','+fmt(p[1])+'" stroke="#bc8f6e" stroke-width="1.8" stroke-dasharray="3 3"/>';
   svg+='<circle class="handle" data-kind="t" data-index="'+src+'" data-edge="'+e+'" data-j="'+j+'" data-sketch="'+(ink?'1':'0')+'" cx="'+fmt(p[0])+'" cy="'+fmt(p[1])+'" r="8.4" tabindex="0" role="button"/>';
   count++;
  }
 }
 for(const p of vs){const q=toPx(p);svg+='<circle cx="'+fmt(q[0])+'" cy="'+fmt(q[1])+'" r="3.5" fill="white" stroke="#2f708e" stroke-width="1.6"/>'}
 svg+='<path id="penStroke" d="" fill="none" stroke="#f16f33" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>';
 $('editorScene').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 425" aria-label="選定邊的平移輪廓編輯區"><g>'+svg+'</g></svg>';
 $('controlCount').textContent='正在編輯「'+edgeLabel(e)+'」；'+(s.drawTool==='pen'?'直接畫線，另一側會同步配對。':'拖曳 '+count+' 個橘色控制點，另一側同步配對。');
 $('selectedEdge').value=String(e);
 document.querySelectorAll('[data-edge-select]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.edgeSelect)===e));
 document.querySelectorAll('[data-draw-tool]').forEach(b=>b.classList.toggle('selected',b.dataset.drawTool===s.drawTool));
 $('drawHint').textContent='已選擇「'+edgeLabel(e)+'」；'+(s.drawTool==='pen'?'自由畫線時，請由這條邊的一端畫向另一端。':'拖曳橘點修改線條，綠色虛線是自動配對的對邊。');
 $('penTip').style.display=s.drawTool==='pen'?'block':'none';
 $('addPoint').disabled=s.drawTool==='pen'||Boolean(pr.sketch);
 $('editorScene').classList.toggle('penActive',s.drawTool==='pen');
}
function drawEditor(){
 if(page==='translation')return drawTranslationEditor();
 const W=520,H=425,unit=s.shape==='hexagon'?138:226,origin=s.shape==='hexagon'?[260,214]:[128,93],vs=verts(),pts=transform(tile(),origin,unit),lines=bases();
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
function localFromPointer(evt){
 const svg=$('editorScene').querySelector('svg'),p=svgPt(svg,evt);
 const unit=s.shape==='hexagon'?138:226,O=s.shape==='hexagon'?[260,214]:[128,93];
 return[(p.x-O[0])/unit,(p.y-O[1])/unit];
}
function sampleFreehand(pos){
 if(!s.sketching)return;
 const pts=s.sketching.points,last=pts[pts.length-1];
 if(norm(sub(last,pos))>.008&&pts.length<175)pts.push(pos);
 const line=$('editorScene').querySelector('#penStroke');
 if(line)line.setAttribute('d',path(pts.map(p=>add([128,93],mul(p,226)))));
}
function endFreehand(cancelled=false){
 const active=s.sketching;s.sketching=null;
 if(!active)return;
 if(cancelled){render();return}
 const e=active.edge,src=sourceForSide(e),pr=s.trans[src];
 if(active.points.length<6){setStatus('線段太短，請沿整條邊畫出較完整的輪廓。');render();return}
 let points=active.points.map(p=>projectOnSelected(p,e));
 if(points[0][0]>points[points.length-1][0])points.reverse();
 if(points.at(-1)[0]-points[0][0]<.48){setStatus('請由這條邊的一端畫向另一端，讓筆畫跨過至少半條邊。');render();return}
 const limit=.56*minBaseSide(),simplified=[[0,0]];
 for(const [t,d] of points){
  if(t<-.18||t>1.18||Math.abs(d)>limit){setStatus('筆畫太遠，請在淡色標示的半邊附近畫出輪廓。');render();return}
  // Endpoints are added once and only once; duplicate vertices mimic a false intersection.
  if(t>=0&&t<.006||t<=1&&t>.994)continue;
  const last=simplified.at(-1);
  if(Math.hypot(t-last[0],d-last[1])>.016)simplified.push([+t.toFixed(4),+d.toFixed(4)]);
 }
 simplified.push([1,0]);
 let sketch=simplified;
 if(sketch.length>80){const step=Math.ceil((sketch.length-2)/76),thin=[sketch[0]];for(let k=1;k<sketch.length-1;k+=step)thin.push(sketch[k]);thin.push([1,0]);sketch=thin}
 const old=pr.sketch,prior=snapshot();
 pr.sketch=sketch;
 if(!valid()){pr.sketch=old;render();setStatus('這個輪廓會與元件其他邊相交，已保留原來的輪廓。請改畫較小的凹凸。');return}
 s.history.push(prior);if(s.history.length>45)s.history.shift();
 s.stage=3;s.preset='blank';render();
 setStatus('已完成「'+edgeLabel(e)+'」的自由畫線，對邊已自動平移配對！');
}
function onMove(evt){
 if(page==='translation'&&s.sketching){sampleFreehand(localFromPointer(evt));return}
 if(!s.drag)return;
 const pos=localFromPointer(evt),{kind,index,edge,j,sketch}=s.drag,pr=profile(kind,index),[A,B]=bases()[edge];
 if(page==='translation'){
  const [t,d]=projectOnSelected(pos,edge),flipped=edge>=2;
  if(sketch){
   const old=pr.sketch[j].slice();
   pr.sketch[j]=[+bound(t,-.16,1.16).toFixed(4),+bound(d,-.54*minBaseSide(),.54*minBaseSide()).toFixed(4)];
   if(!valid()){pr.sketch[j]=old;setStatus('這樣會造成線條交叉，控制點已退回。');return}
  }else{
   const prevT=pr.p[j],prevD=pr.v[j],lo=j?pr.p[j-1]+.035:.035,hi=j===pr.p.length-1?.965:pr.p[j+1]-.035;
   pr.p[j]=+bound(t,lo,hi).toFixed(4);pr.v[j]=+bound(d,-.50*minBaseSide(),.50*minBaseSide()).toFixed(4);
   if(!valid()){pr.p[j]=prevT;pr.v[j]=prevD;setStatus('這樣會造成線條交叉，控制點已退回。');return}
  }
  render();return;
 }
 const axis=sub(B,A),len2=dot(axis,axis),n=normal(A,B),oldP=pr.p[j],oldV=pr.v[j];
 const gap=.035,min=kind==='r'?.055:.035,max=kind==='r'?.455:.965,lower=j?pr.p[j-1]+gap:min,upper=j===pr.p.length-1?max:pr.p[j+1]-gap;
 const t=bound(dot(sub(pos,A),axis)/len2,lower,upper),foot=add(A,mul(axis,t)),limit=Math.min(.5,.50*minBaseSide());
 pr.p[j]=+t.toFixed(4);pr.v[j]=+bound(dot(sub(pos,foot),n),-limit,limit).toFixed(4);
 if(!valid()){pr.p[j]=oldP;pr.v[j]=oldV;setStatus('這樣會造成輪廓交叉，已限制控制點的位置。');return}
 render();
}
function attachEvents(){
 $('mode').value=s.mode;
 if(page==='translation'){
  const edgeChange=value=>{s.selectedEdge=Number(value);render();setStatus('已切換為「'+edgeLabel(s.selectedEdge)+'」，對邊將保持平移配對。')};
  $('selectedEdge').addEventListener('change',e=>edgeChange(e.target.value));
  document.querySelectorAll('[data-edge-select]').forEach(b=>b.addEventListener('click',()=>edgeChange(b.dataset.edgeSelect)));
  document.querySelectorAll('[data-draw-tool]').forEach(b=>b.addEventListener('click',()=>{
   s.drawTool=b.dataset.drawTool;render();setStatus(s.drawTool==='pen'?'自由畫線：用滑鼠或觸控筆，沿著淡色半邊畫出輪廓。':'控制點模式：拖曳選定邊的橘色控制點。');
  }));
 }
 $('mode').addEventListener('change',e=>{undoSave();s.mode=e.target.value;s.stage=3;render()});
 $('shape').addEventListener('change',e=>{undoSave();s.shape=e.target.value;s.stage=3;render()});
 $('preset').addEventListener('change',e=>{undoSave();presetValues(e.target.value);s.stage=3});
 $('color').addEventListener('input',e=>{s.color=e.target.value;render()});
 $('outline').addEventListener('change',e=>{s.outline=e.target.checked;drawPreview()});
 $('multicolor').addEventListener('change',e=>{s.multicolor=e.target.checked;drawPreview()});
 document.querySelectorAll('[data-step]').forEach(b=>b.addEventListener('click',()=>{s.stage=Number(b.dataset.step);drawPreview()}));
 const progress=$('stepProgress');if(progress)progress.addEventListener('input',e=>{s.stepProgress=Number(e.target.value)/100;drawPreview()});
 $('undo').addEventListener('click',()=>{if(s.history.length)restore(s.history.pop());else setStatus('目前沒有上一步。')});
 $('reset').addEventListener('click',()=>{undoSave();s.trans=[defaultProfile('t'),defaultProfile('t')];s.rot=Array.from({length:4},()=>defaultProfile('r'));s.quarter={p:[.13,.32,.5,.68,.87],v:[0,0,0,0,0]};s.hex=Array.from({length:3},()=>({p:[.18,.36,.57,.78],v:[0,0,0,0]}));s.preset='blank';$('preset').value='blank';s.stage=3;render()});
 $('addPoint').addEventListener('click',()=>{
  const r=page==='translation'?['t',sourceForSide(s.selectedEdge),s.selectedEdge]:editRoles()[0],pr=profile(r[0],r[1]),max=r[0]==='r'?.47:.96;
  if(pr.sketch){setStatus('自由畫線完成後可以拖曳橘點微調；若要改用一般控制點，請按「重設全部曲線」。');return}
  if(pr.p.length>=6){setStatus('每組輪廓最多 6 個可編輯控制點。');return}
  undoSave();let prev=.04,best=.0,at=0;
  for(let i=0;i<=pr.p.length;i++){const next=i===pr.p.length?max:pr.p[i],d=next-prev;if(d>best){best=d;at=i}prev=next}
  const before=at?pr.p[at-1]:.04,after=at===pr.p.length?max:pr.p[at];
  pr.p.splice(at,0,(before+after)/2);pr.v.splice(at,0,0);render();setStatus('已替第一組邊線增加一個可自由拖曳的控制點。')
 });
 const container=$('editorScene');
 container.addEventListener('pointerdown',e=>{
  if(page==='translation'&&s.drawTool==='pen'){
   s.sketching={edge:s.selectedEdge,points:[localFromPointer(e)]};
   const stroke=container.querySelector('#penStroke');if(stroke)stroke.setAttribute('d','');
   container.setPointerCapture(e.pointerId);e.preventDefault();return;
  }
  const h=e.target.closest('[data-kind]');if(!h)return;
  undoSave();s.drag={kind:h.dataset.kind,index:Number(h.dataset.index),edge:Number(h.dataset.edge),j:Number(h.dataset.j),sketch:h.dataset.sketch==='1'};
  container.setPointerCapture(e.pointerId);e.preventDefault();
 });
 container.addEventListener('pointermove',onMove);
 container.addEventListener('pointerup',e=>{if(s.sketching){sampleFreehand(localFromPointer(e));endFreehand()}s.drag=null;});
 container.addEventListener('pointercancel',()=>{if(s.sketching)endFreehand(true);s.drag=null;});
 container.addEventListener('lostpointercapture',()=>{if(s.sketching)endFreehand(true);s.drag=null;});
 container.addEventListener('keydown',e=>{
  const h=e.target.closest('[data-kind]');if(!h||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();undoSave();const a=profile(h.dataset.kind,Number(h.dataset.index)),j=Number(h.dataset.j),dy=e.key==='ArrowUp'?-.012:e.key==='ArrowDown'?.012:0,dx=e.key==='ArrowLeft'?-.016:e.key==='ArrowRight'?.016:0;
  if(h.dataset.sketch==='1'){
   const old=a.sketch[j][1];a.sketch[j][1]+=dy+dx;if(!valid())a.sketch[j][1]=old;
  }else{
   const old=a.v[j];a.v[j]+=dy+dx; if(!valid())a.v[j]=old;
  }render();
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
function studentData(){return{app:'藝數探索艾薛爾工作室',version:4,selectedEdge:s.selectedEdge,mode:s.mode,shape:s.shape,trans:s.trans,rot:s.rot,quarter:s.quarter,hex:s.hex,color:s.color,preset:s.preset,className:s.className,seat:s.seat,student:s.student}}
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
window.EscherWorkshopDebug={state:s,valid,tile,edge,tilesSVG,triangleInstances,printSVG,snapshot,restore,presetValues,sourceForSide,pointOnSelected,projectOnSelected,endFreehand,movementSVG};
attachEvents();render();
})();