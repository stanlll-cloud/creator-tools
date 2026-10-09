const API='https://creator-tools-x-reader.stanlll-creator-tools.workers.dev';
const $=id=>document.getElementById(id);
let state={source:'',blocks:[],warnings:[],images:[]},busy=false,reading=false;
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function lock(on){busy=on;for(const id of ['pdf','ppt','read','manual','uploads'])$(id).disabled=on;}
function name(ext){return ($('title').value||'X文章').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70)+'.'+ext;}
function textChunks(text,max=380){const chars=Array.from(text),out=[];for(let i=0;i<chars.length;i+=max)out.push(chars.slice(i,i+max).join(''));return out;}
function ordered(){const out=[];for(const part of $('body').value.split(/(\{\{image:\d+\}\})/)){const m=part.match(/^\{\{image:(\d+)\}\}$/);if(m){const image=state.images[Number(m[1])-1];if(image)out.push({type:'image',...image});}else for(const t of part.split(/\n\s*\n/)){if(t.trim())out.push({type:'text',text:t.trim()});}}return out;}
function render(){
 const paper=$('paper');paper.replaceChildren();const h=document.createElement('h1');h.textContent=$('title').value||'未命名文章';paper.append(h);
 const author=document.createElement('p');author.className='source';author.textContent=$('author').value;paper.append(author);
 for(const b of ordered()){if(b.type==='image'){if(b.data){const im=document.createElement('img');im.src=b.data;im.alt=b.alt||'文章插图';paper.append(im);}else{const p=document.createElement('p');p.textContent='[图片下载失败]';paper.append(p);}}else{const p=document.createElement('p');p.textContent=b.text;paper.append(p);}}
 if(state.source){const p=document.createElement('p');p.className='source';p.textContent='原文：'+state.source;paper.append(p);}
 const count=ordered().filter(b=>b.type==='image');$('count').textContent=`${count.filter(b=>b.data).length}/${count.length} 张图片可用`;
}
function gallery(){ $('media').replaceChildren();state.images.forEach((im,i)=>{const f=document.createElement('figure');if(im.data){const img=document.createElement('img');img.src=im.data;f.append(img);}const c=document.createElement('figcaption');c.textContent=`图片 ${i+1} · ${im.data?'已保存':'失败'}`;f.append(c);$('media').append(f);});render(); }
const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
async function imageData(blob){const url=await dataURL(blob);const im=new Image();im.src=url;await im.decode();if(im.naturalWidth*im.naturalHeight>40000000)throw Error('图片像素过大');const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0);return {data:c.toDataURL('image/png'),width:c.width,height:c.height};}
function fill(doc){state={...doc,images:[]};$('title').value=doc.title||'';$('author').value=doc.author||'';$('body').value=doc.blocks.map(b=>{if(b.type==='image'){state.images.push(b);return '{{image:'+state.images.length+'}}';}return b.text||'';}).join('\n\n');$('incomplete').checked=false;$('workspace').hidden=false;gallery();}
$('extract').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;reading=true;lock(true);status('正在读取公开正文…');try{
 const response=await fetch(API+'/api/extract?url='+encodeURIComponent($('url').value.trim()),{signal:AbortSignal.timeout(35000)});const doc=await response.json();if(!response.ok)throw Error(doc.error||'提取失败');fill(doc);
 for(let i=0;i<state.images.length;i++){status(`正文已读取，正在保存图片 ${i+1}/${state.images.length}…`);try{const r=await fetch(API+'/api/image?url='+encodeURIComponent(state.images[i].url),{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error();Object.assign(state.images[i],await imageData(await r.blob()));}catch{state.images[i].error=true;}gallery();}
 const failed=state.images.filter(im=>!im.data).length;status(`读取完成：${state.images.length-failed}/${state.images.length} 张图片已保存。\n${failed?'有图片下载失败，请核对原文。\n':''}${state.warnings.join('\n')}`,failed>0);
 }catch(err){status('读取失败：'+err.message+'。可以展开「手动粘贴正文」继续。',true);}finally{reading=false;lock(false);}});
$('manual').onclick=()=>{if(busy)return;fill({title:'我的文章',author:'',source:'',blocks:[],warnings:[]});status('可以输入标题和正文，并添加本地图片。');};
$('uploads').onchange=async e=>{if(busy)return;lock(true);try{if($('workspace').hidden)fill({title:'我的文章',author:'',source:'',blocks:[],warnings:[]});for(const file of e.target.files){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15000000){status('部分图片格式不支持或超过 15MB',true);continue;}const data=await imageData(file);state.images.push({...data,alt:file.name});$('body').value+='\n\n{{image:'+state.images.length+'}}';}gallery();}catch(err){status('添加图片失败：'+err.message,true);}finally{lock(false);e.target.value='';}};
for(const id of ['title','author','body'])$(id).addEventListener('input',render);
function ready(){if(busy||reading)return false;if(!ordered().length){status('请先读取或输入正文',true);return false;}if(ordered().some(b=>b.type==='image'&&!b.data)&&!$('incomplete').checked){status('有图片未保存，请补充图片或勾选允许导出当前内容。',true);return false;}return true;}
$('pdf').onclick=async()=>{
 if(!ready())return;lock(true);let host;
 try{
  if(!window.html2canvas||!window.jspdf)throw Error('PDF 组件未加载，请刷新后重试');
  status('正在分页生成 PDF…');
  host=document.createElement('div');host.style='position:fixed;left:0;top:0;z-index:9999;width:740px;background:white;pointer-events:none';document.body.append(host);
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  const pages=[];let page;
  const newPage=()=>{page=document.createElement('article');page.className='pdf-page';pages.push(page);host.replaceChildren(page);};
  newPage();
  const flush=async()=>{await document.fonts.ready;const canvas=await html2canvas(page,{scale:1.6,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,windowWidth:1000});if(pages.length>1)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.96),'JPEG',0,0,210,297);};
  const append=async el=>{page.append(el);if(page.scrollHeight>1046 && page.children.length>1){el.remove();await flush();newPage();page.append(el);}};
  const title=document.createElement('h1');title.textContent=$('title').value;await append(title);
  const author=document.createElement('p');author.className='source';author.textContent=$('author').value;await append(author);
  for(const b of ordered()){
   if(b.type==='image'&&b.data){const im=document.createElement('img');im.src=b.data;im.alt=b.alt||'';await im.decode();await append(im);}
   else if(b.type==='text'){for(const chunk of textChunks(b.text,450)){const p=document.createElement('p');p.textContent=chunk;await append(p);}}
  }
  if(state.source){const source=document.createElement('p');source.className='source';source.textContent='原文：'+state.source;await append(source);}
  await flush();pdf.save(name('pdf'));status(`PDF 已生成：${pages.length} 页，开始下载。`);
 }catch(e){status('PDF 导出失败：'+e.message,true);}finally{host?.remove();lock(false);}
};
$('ppt').onclick=async()=>{if(!ready())return;lock(true);try{if(!window.PptxGenJS)throw Error('PPT 组件未加载，请刷新后重试');status('正在生成可编辑 PPTX…');const ppt=new PptxGenJS();ppt.layout='LAYOUT_WIDE';ppt.author=$('author').value;ppt.subject=state.source;ppt.title=$('title').value;ppt.lang='zh-CN';
 const base=()=>{const s=ppt.addSlide();s.background={color:'F7F8FA'};s.addText('创作工具箱 · X 文章',{x:.6,y:7.06,w:11,h:.18,fontSize:9,color:'8993A2'});return s;};
 const cover=base();cover.addText($('title').value||'X 文章',{x:.8,y:1.5,w:11.7,h:2.6,fontSize:32,bold:true,color:'202734',fontFace:'Microsoft YaHei',breakLine:false,fit:'shrink'});cover.addText([$ ('author').value,state.source].filter(Boolean).join('\n'),{x:.85,y:4.8,w:11.5,h:1.0,fontSize:13,color:'6C7889',fontFace:'Microsoft YaHei',fit:'shrink'});
 let n=0;
 for(const b of ordered()){if(b.type==='text'){for(const chunk of textChunks(b.text)){const s=base();s.addText($('title').value.slice(0,65),{x:.6,y:.4,w:12,h:.5,fontSize:17,bold:true,color:'3267D9',fontFace:'Microsoft YaHei',fit:'shrink'});s.addText(chunk,{x:.75,y:1.25,w:11.8,h:5.3,fontSize:20,color:'283142',fontFace:'Microsoft YaHei',breakLine:false,fit:'shrink',paraSpaceAfterPt:12,margin:0});n++;}}else if(b.data){const s=base();const ratio=b.width/b.height;let w=11.8,h=w/ratio;if(h>5.9){h=5.9;w=h*ratio;}s.addImage({data:b.data,x:(13.333-w)/2,y:.6+(5.9-h)/2,w,h});n++;}}
 await ppt.writeFile({fileName:name('pptx')});status(`PPTX 已生成：封面 + ${n} 页正文与图片，文字可编辑。`);
 }catch(e){status('PPT 导出失败：'+e.message,true);}finally{lock(false);}};
