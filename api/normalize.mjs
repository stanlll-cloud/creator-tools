export function postId(input) {
  const u = new URL(input);
  if (u.protocol !== 'https:' || !['x.com','www.x.com','twitter.com','www.twitter.com'].includes(u.hostname)) throw Error('请粘贴 x.com 或 twitter.com 的 HTTPS 链接');
  const m = u.pathname.match(/^\/(?:[^/]+\/status|i\/article|i\/status)\/(\d+)(?:\/|$)/);
  if (!m) throw Error('链接应包含 /status/帖子ID 或 /i/article/文章ID');
  return m[1];
}
export function normalize(raw, source) {
 const t=raw.status||raw.tweet;
 if(!t || raw.code!==200) throw Error('无法读取这条公开内容，可能已删除、需要登录或服务暂不可用');
 const a=t.article, blocks=[], warnings=[];
 const image=(url,alt='')=>{if(url && /^https:\/\/pbs\.twimg\.com\//.test(url))blocks.push({type:'image',url,alt});};
 if(a){
  const cover=a.cover_media?.media_info; image(cover?.original_img_url||cover?.media_url_https,'文章封面');
  const media=a.media_entities||[];
  const map=Object.fromEntries(media.map(m=>[String(m.media_id||m.id||m.media_key),m.media_info||m]));
  const rawEntities=a.content?.entityMap||{};
  const entities=Array.isArray(rawEntities)?Object.fromEntries(rawEntities.map(e=>[String(e.key),e.value])):rawEntities;
  for(const b of a.content?.blocks||[]){
   if(b.text?.trim()) blocks.push({type:/header/.test(b.type)?'heading':'text',text:b.text});
   for(const range of b.entityRanges||[]){
    const e=entities[range.key];if(!e)continue;
    if(e.type==='MEDIA')for(const item of e.data?.mediaItems||[]){const m=map[String(item.mediaId)];if(m)image(m.original_img_url||m.media_url_https,m.ext_alt_text||'');else warnings.push('一处文章插图未返回，无法确认完整性');}
    if(e.type==='MARKDOWN' && !b.text?.trim() && e.data?.markdown)blocks.push({type:'text',text:e.data.markdown});
    if(e.type==='TWEET')warnings.push('文章包含嵌入帖子，请核对原文；未展开嵌入内容');
   }
  }
  if(!blocks.some(b=>b.type==='text'||b.type==='heading'))throw Error('接口只返回了文章摘要，未获取到完整正文，请使用手动粘贴');
  for(const m0 of media){const m=m0.media_info||m0;const url=m.original_img_url||m.media_url_https;if(url&&!blocks.some(b=>b.url===url))image(url,'文章插图');}
 } else {
  if(t.text)blocks.push({type:'text',text:t.text});
  for(const m of t.media?.photos||[])image(m.url,m.altText||'');
 }
 if(t.media?.videos?.length || a?.media_entities?.some(m=>/Video|Gif/.test((m.media_info||m).__typename||'')))warnings.push('视频或 GIF 的动态内容不包含在导出文件中');
 warnings.push('请对照原文核对；仅包含接口返回的内容，不自动展开整个帖子串。');
 return {title:a?.title||((t.text||'X 文章').split('\n')[0].slice(0,80)),author:t.author?.name||t.author?.screen_name||'',source,blocks,warnings};
}
