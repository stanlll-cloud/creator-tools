export function publicURL(value){
 const u=new URL(value);const h=u.hostname.toLowerCase();
 if(u.protocol!=='https:'||u.username||u.password||u.port||!h.includes('.')||h.includes(':')||/^\d+(?:\.\d+)*$/.test(h)||/(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(h))throw Error('请使用公开网站的 HTTPS 文章链接');
 return u;
}
export function normalizeWeb(raw,source){
 const d=raw.data||raw;const content=d.content||'';
 if(typeof content!=='string'||content.trim().length<40)throw Error('未获取到可用正文，请手动粘贴文章');
 const blocks=[];const regex=/!\[([^\]]*)\]\((https?:\/\/[^\s]+?)(?:\s+"[^"]*")?\)/g;let cursor=0;
 const text=s=>{for(const p of s.split(/\n\s*\n/)){const clean=p.replace(/^#{1,6}\s+/gm,'').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'$1').trim();if(clean)blocks.push({type:'text',text:clean});}};
 for(const match of content.matchAll(regex)){text(content.slice(cursor,match.index));try{const u=publicURL(match[2]);blocks.push({type:'image',url:u.href,alt:match[1]});}catch{}cursor=match.index+match[0].length;}
 text(content.slice(cursor));
 return {title:d.title||'网页文章',author:'',source,blocks,warnings:['网页提取可能包含导航或遗漏动态内容，请对照原文核对。','登录、付费墙及访问受限的文章可能无法读取。']};
}
export async function readWeb(source){
 const url=publicURL(source);
 const r=await fetch('https://r.jina.ai/'+url.href,{headers:{Accept:'application/json','X-Remove-Selector':'nav,header,footer,aside','X-Timeout':'25'},signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error(r.status===429?'网页提取繁忙，请稍后重试':'网页提取失败，网站可能限制访问；可手动粘贴正文');
 return normalizeWeb(await r.json(),source);
}
async function directRead(source){
 let url=publicURL(source),response;
 for(let hop=0;hop<4;hop++){
  response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0 (compatible; CreatorTools/1.0)','Accept':'text/html'},signal:AbortSignal.timeout(15000)});
  if(response.status>=300&&response.status<400){url=publicURL(new URL(response.headers.get('Location')||'',url).href);continue;}break;
 }
 if(!response.ok||!(response.headers.get('Content-Type')||'').includes('text/html'))throw Error('网页未返回文章 HTML');
 const reader=response.body.getReader();let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2500000){await reader.cancel();throw Error('网页过大');}chunks.push(value);}
 const html=await new Blob(chunks).text();let title='',author='';
 const groups=[[],[],[]];const rewrite=new HTMLRewriter().on('title',{text(t){title+=t.text;}}).on('meta[name="author"]',{element(el){author=el.getAttribute('content')||'';}});
 const tags=['p','h1','h2','h3','li','pre','img'];
 ['article','main','body'].forEach((scope,index)=>{
  const stack=[];rewrite.on(tags.map(t=>`${scope} ${t}`).join(','),{
   element(el){
    if(el.tagName==='img'){
     let raw=el.getAttribute('data-src')||el.getAttribute('data-original')||el.getAttribute('src')||'';
     if(!raw||raw.startsWith('data:'))raw=(el.getAttribute('srcset')||'').split(',').at(-1)?.trim().split(/\s+/)[0]||'';
     try{if(raw){const image=publicURL(new URL(raw,url).href);groups[index].push({type:'image',url:image.href,alt:el.getAttribute('alt')||''});}}catch{}return;
    }
    const block={type:'text',text:''};groups[index].push(block);stack.push(block);el.onEndTag(()=>{stack.pop();});
   },text(t){if(stack.length)stack.at(-1).text+=t.text;}
  });
 });
 await rewrite.transform(new Response(html,{headers:{'Content-Type':'text/html'}})).text();
 const selected=groups.find(g=>g.filter(b=>b.type==='text').reduce((n,b)=>n+b.text.trim().length,0)>100);
 if(!selected)throw Error('网页需要动态加载或未找到正文');
 const blocks=selected.map(b=>b.type==='text'?{...b,text:b.text.replace(/\s+/g,' ').trim()}:b).filter(b=>b.type==='image'||b.text);
 return {title:title.trim()||'网页文章',author,source,blocks,warnings:['已提取网页静态正文，请核对原文；动态、登录和付费内容可能缺失。']};
}
export async function extractWeb(source){
 try{return await directRead(source);}catch{return await readWeb(source);}
}
