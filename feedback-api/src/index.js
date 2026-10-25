// Cloudflare Worker: public feedback API for the ruler-and-compass classroom.
const SITE_ORIGIN = 'https://ericson1617.github.io';
const encoder = new TextEncoder();

function responseJSON(data, status=200, origin='') {
 const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(origin===SITE_ORIGIN)headers['Access-Control-Allow-Origin']=SITE_ORIGIN;
 return new Response(JSON.stringify(data),{status,headers});
}
function base64url(bytes) {
 let raw='';for(const value of new Uint8Array(bytes))raw+=String.fromCharCode(value);
 return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function hmac(secret, input) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return base64url(await crypto.subtle.sign('HMAC',key,encoder.encode(input)));
}
function constantTimeMatch(a,b) {
 if(typeof a!=='string'||typeof b!=='string')return false;
 let diff=a.length^b.length;
 for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
 return diff===0;
}
async function tokenFor(secret) {
 const expiry=Date.now()+4*60*60*1000;
 const nonce=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
 const payload=expiry+'.'+nonce;
 return payload+'.'+await hmac(secret,payload);
}
async function isAdmin(request,secret){
 if(!secret)return false;
 const auth=request.headers.get('Authorization')||'';
 const token=auth.startsWith('Bearer ')?auth.slice(7):'';
 const parts=token.split('.');
 if(parts.length!==3||!/^\d{13}$/.test(parts[0])||!/^[0-9a-f]{32}$/.test(parts[1]))return false;
 if(Number(parts[0])<=Date.now())return false;
 const payload=parts[0]+'.'+parts[1];
 return constantTimeMatch(await hmac(secret,payload),parts[2]);
}
async function limited(request,env,scope,max,windowSeconds){
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const hash=(await hmac(env.SESSION_SECRET,ip)).slice(0,36);
 const epoch=Math.floor(Date.now()/1000),windowIndex=Math.floor(epoch/windowSeconds);
 const bucket=scope+':'+windowIndex+':'+hash;
 const record=await env.DB.prepare('INSERT INTO rate_limits (bucket,hits,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 RETURNING hits')
 .bind(bucket,(windowIndex+1)*windowSeconds).first();
 return record&&record.hits<=max;
}
async function parseJSON(request){
 const body=await request.text();
 if(body.length>6000)throw Object.assign(new Error('輸入內容過長'),{status:413});
 try{return JSON.parse(body)}catch{throw Object.assign(new Error('資料格式不正確'),{status:400})}
}
function stringField(value,limit,label){
 if(typeof value!=='string')throw Object.assign(new Error('請填寫'+label),{status:400});
 const normalized=value.replace(/\r\n?/g,'\n').trim();
 if(normalized.length<1||normalized.length>limit)throw Object.assign(new Error(label+'長度須在 1 至 '+limit+' 字之間'),{status:400});
 return normalized;
}
async function listComments(env,url){
 const limit=Math.max(1,Math.min(50,Number.parseInt(url.searchParams.get('limit')||'20',10)||20));
 const offset=Math.max(0,Math.min(2000,Number.parseInt(url.searchParams.get('offset')||'0',10)||0));
 const {results}=await env.DB.prepare('SELECT id,name,message,created_at FROM comments ORDER BY id DESC LIMIT ? OFFSET ?').bind(limit+1,offset).all();
 const list=results.slice(0,limit),ids=list.map(row=>row.id);
 const byComment=new Map(ids.map(id=>[id,[]]));
 if(ids.length){
  const placeholders=ids.map(() => '?').join(',');
  const replies=await env.DB.prepare('SELECT id,comment_id,message,created_at FROM replies WHERE comment_id IN ('+placeholders+') ORDER BY id ASC').bind(...ids).all();
  for(const reply of replies.results)byComment.get(reply.comment_id)?.push({id:reply.id,message:reply.message,createdAt:reply.created_at});
 }
 return {comments:list.map(row=>({id:row.id,name:row.name,message:row.message,createdAt:row.created_at,replies:byComment.get(row.id)||[]})),hasMore:results.length>limit};
}
export default {
 // UTC 18:00 = Taipei 02:00: remove expired rate-limit identifiers daily.
 async scheduled(controller,env){
  if(env.DB)await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now()/1000)).run();
 },
 async fetch(request,env){
  const origin=request.headers.get('Origin')||'';
  const url=new URL(request.url),path=url.pathname.replace(/\/+$/,'')||'/';
  if(request.method==='OPTIONS'){
   if(origin!==SITE_ORIGIN)return responseJSON({error:'不允許的來源'},403,origin);
   return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':SITE_ORIGIN,
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Authorization, Content-Type',
    'Access-Control-Max-Age':'86400','Vary':'Origin'
   }});
  }
  // Public health endpoint: useful for deployment verification.
  if(path==='/api/health'&&request.method==='GET')
   return responseJSON({ok:true,storage:!!env.DB,adminConfigured:!!(env.ADMIN_PASSWORD&&env.SESSION_SECRET)},200,origin);
  if(request.method==='POST'&&origin!==SITE_ORIGIN)
   return responseJSON({error:'僅允許從尺規作圖工作坊發布資料'},403,origin);
  if(!env.DB)return responseJSON({error:'回饋資料庫尚未設定'},503,origin);
  try {
   if(path==='/api/comments'&&request.method==='GET')
    return responseJSON(await listComments(env,url),200,origin);
   if(path==='/api/comments'&&request.method==='POST'){
    if(!env.SESSION_SECRET)return responseJSON({error:'留言服務尚未設定完成'},503,origin);
    if(!await limited(request,env,'comment',4,600))return responseJSON({error:'短時間留言太多，請稍後再試'},429,origin);
    const body=await parseJSON(request);
    const name=stringField(body.name,30,'名字');
    const message=stringField(body.message,1000,'留言');
    const at=new Date().toISOString();
    const inserted=await env.DB.prepare('INSERT INTO comments (name,message,created_at) VALUES (?,?,?)').bind(name,message,at).run();
    return responseJSON({ok:true,id:inserted.meta.last_row_id,createdAt:at},201,origin);
   }
   if(path==='/api/admin/login'&&request.method==='POST'){
    if(!env.ADMIN_PASSWORD||!env.SESSION_SECRET)return responseJSON({error:'管理者登入服務尚未設定'},503,origin);
    if(!await limited(request,env,'login',6,900))return responseJSON({error:'登入過於頻繁，請稍後再試'},429,origin);
    const body=await parseJSON(request);
    if(typeof body.password!=='string'||body.password.length>128)return responseJSON({error:'登入失敗'},401,origin);
    const entered=await hmac(env.SESSION_SECRET,'password:'+body.password);
    const correct=await hmac(env.SESSION_SECRET,'password:'+env.ADMIN_PASSWORD);
    if(!constantTimeMatch(entered,correct))return responseJSON({error:'密碼不正確'},401,origin);
    return responseJSON({token:await tokenFor(env.SESSION_SECRET),expiresInSeconds:14400},200,origin);
   }
   if(path==='/api/admin/session'&&request.method==='GET'){
    return responseJSON({admin:await isAdmin(request,env.SESSION_SECRET)},200,origin);
   }
   if(path==='/api/admin/replies'&&request.method==='POST'){
    if(!await isAdmin(request,env.SESSION_SECRET))return responseJSON({error:'管理者登入已失效，請重新登入'},401,origin);
    if(!await limited(request,env,'reply',20,600))return responseJSON({error:'回覆過於頻繁，請稍後再試'},429,origin);
    const body=await parseJSON(request);
    const commentId=Number(body.commentId);
    if(!Number.isSafeInteger(commentId)||commentId<1)return responseJSON({error:'無效的留言編號'},400,origin);
    const message=stringField(body.message,1000,'回覆');
    const found=await env.DB.prepare('SELECT id FROM comments WHERE id=?').bind(commentId).first();
    if(!found)return responseJSON({error:'原留言不存在'},404,origin);
    const at=new Date().toISOString();
    const inserted=await env.DB.prepare('INSERT INTO replies (comment_id,message,created_at) VALUES (?,?,?)').bind(commentId,message,at).run();
    return responseJSON({ok:true,id:inserted.meta.last_row_id,createdAt:at},201,origin);
   }
   return responseJSON({error:'找不到服務端點'},404,origin);
  } catch(err){
   if(err&&Number.isInteger(err.status))return responseJSON({error:err.message},err.status,origin);
   console.error('Feedback API failure:',err);
   return responseJSON({error:'服務暫時無法使用'},500,origin);
  }
 }
};
