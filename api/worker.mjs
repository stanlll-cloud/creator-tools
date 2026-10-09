import {postId,normalize} from './normalize.mjs';
const origins=new Set(['https://stanlll-cloud.github.io','http://127.0.0.1:3087','http://localhost:3087']);
export default {async fetch(req,env){
 const origin=req.headers.get('Origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://stanlll-cloud.github.io','Vary':'Origin','Cache-Control':'no-store'};
 const json=(body,status=200)=>Response.json(body,{status,headers});
 if(origin&&!origins.has(origin))return json({error:'来源不允许'},403);
 if(req.method==='OPTIONS')return new Response(null,{headers:{...headers,'Access-Control-Allow-Methods':'GET, OPTIONS'}});
 if(req.method!=='GET')return json({error:'方法不支持'},405);
 try{
  if(env.REQUEST_LIMIT){const {success}=await env.REQUEST_LIMIT.limit({key:req.headers.get('CF-Connecting-IP')||'unknown'});if(!success)return json({error:'操作太频繁，请一分钟后重试'},429);}
  const u=new URL(req.url);
  if(u.pathname==='/health')return json({ok:true,version:1});
  if(u.pathname==='/api/extract'){
   const source=u.searchParams.get('url')||'';const id=postId(source);
   let r=await fetch(`https://api.fxtwitter.com/2/status/${id}`,{headers:{'User-Agent':'CreatorTools/1.0','Accept':'application/json'},signal:AbortSignal.timeout(15000)});
   if(!r.ok)r=await fetch(`https://api.fxtwitter.com/status/${id}`,{headers:{'User-Agent':'CreatorTools/1.0','Accept':'application/json'},signal:AbortSignal.timeout(15000)});
   if(!r.ok)throw Error('提取服务暂不可用（'+r.status+'），请稍后重试或手动粘贴');
   return json(normalize(await r.json(),source));
  }
  if(u.pathname==='/api/image'){
   const image=new URL(u.searchParams.get('url')||'');
   if(image.protocol!=='https:'||image.hostname!=='pbs.twimg.com'||!/^\/(media|tweet_video_thumb|ext_tw_video_thumb|amplify_video_thumb)\//.test(image.pathname))return json({error:'不支持的图片来源'},400);
   const r=await fetch(image,{redirect:'manual',signal:AbortSignal.timeout(20000)});
   const type=r.headers.get('Content-Type')||'';
   if(!r.ok||!/^image\/(jpeg|png|webp|gif)(;|$)/.test(type))throw Error('图片下载失败');
   if(Number(r.headers.get('Content-Length')||0)>15000000)throw Error('图片超过 15MB');
   const reader=r.body.getReader();let size=0,chunks=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>15000000){await reader.cancel();throw Error('图片超过 15MB');}chunks.push(value);}
   return new Response(new Blob(chunks),{headers:{...headers,'Content-Type':type}});
  }
  return json({error:'接口不存在'},404);
 }catch(e){return json({error:e.message||'读取失败'},400);}
}};
