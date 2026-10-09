import {PAGE,buildLayout} from './export-layout.mjs?v=3';
const API='https://creator-tools-x-reader.stanlll-creator-tools.workers.dev';
const $=id=>document.getElementById(id);
let state={source:'',blocks:[],warnings:[],images:[]},busy=false,reading=false;
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function lock(on){busy=on;for(const id of ['pdf','ppt','read','manual','uploads'])$(id).disabled=on;}
function name(ext){return ($('title').value||'X文章').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,70)+'.'+ext;}
function textChunks(text,max=380){const chars=Array.from(text),out=[];for(let i=0;i<chars.length;i+=max)out.push(chars.slice(i,i+max).join(''));return out;}
function ordered(){const out=[];for(const part of $('body').value.split(/(\{\{image:\d+\}\})/)){const m=part.match(/^\{\{image:(\d+)\}\}$/);if(m){const image=state.images[Number(m[1])-1];if(image)out.push({type:'image',...image});}else for(const t of part.split(/\n\s*\n/)){if(t.trim())out.push({type:'text',text:t.trim()});}}return out;}
const measuring=document.createElement('canvas').getContext('2d');
const FONT='"PingFang SC", "Microsoft YaHei", Arial, sans-serif';
function layout(){return buildLayout({title:$('title').value,author:$('author').value,source:state.source,blocks:ordered()},(text,size,bold)=>{measuring.font=`${bold?'bold ':''}${size}px ${FONT}`;return measuring.measureText(text).width;});}
function render(){
 const paper=$('paper');paper.replaceChildren();
 for(const elements of layout()){
  const shell=document.createElement('div');shell.className='page-shell';
  const page=document.createElement('div');page.className='shared-page';
  for(const e of elements){const el=document.createElement(e.type==='image'?'img':'div');
   if(e.type==='image'){el.src=e.data;el.alt=e.alt||'文章插图';}else{el.textContent=e.text;el.style.fontSize=e.size+'px';el.style.fontWeight=e.bold?'700':'400';el.style.color=e.color;el.style.lineHeight=e.h+'px';}
   Object.assign(el.style,{position:'absolute',left:e.x+'px',top:e.y+'px',width:e.w+'px',height:e.h+'px',margin:'0',whiteSpace:'pre'});page.append(el);
  }shell.append(page);paper.append(shell);
 }
 const count=ordered().filter(b=>b.type==='image');$('count').textContent=`${paper.children.length} 页 · ${count.filter(b=>b.data).length}/${count.length} 张图片可用`;
 requestAnimationFrame(()=>{for(const shell of paper.children){const scale=shell.clientWidth/PAGE.width;shell.firstChild.style.transform=`scale(${scale})`;shell.style.height=PAGE.height*scale+'px';}});
}
window.addEventListener('resize',()=>{if(!$('workspace').hidden)render();});
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
 if(!ready())return;lock(true);
 try{
  if(!window.jspdf)throw Error('PDF 组件未加载，请刷新后重试');
  await document.fonts.ready;const pages=layout();const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  for(let i=0;i<pages.length;i++){
   status(`正在生成 PDF ${i+1}/${pages.length} 页…`);
   const canvas=document.createElement('canvas');canvas.width=PAGE.width*2;canvas.height=PAGE.height*2;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle='#fff';ctx.fillRect(0,0,PAGE.width,PAGE.height);
   for(const e of pages[i]){if(e.type==='image'){const im=new Image();im.src=e.data;await im.decode();ctx.drawImage(im,e.x,e.y,e.w,e.h);}else{ctx.font=`${e.bold?'bold ':''}${e.size}px ${FONT}`;ctx.fillStyle=e.color;ctx.textBaseline='middle';ctx.fillText(e.text,e.x,e.y+e.h/2);}}
   if(i)pdf.addPage();pdf.addImage(canvas.toDataURL('image/jpeg',.97),'JPEG',0,0,210,297);
  }
  pdf.save(name('pdf'));status(`PDF 已生成：${pages.length} 页，与 PPT 使用同一排版。`);
 }catch(e){status('PDF 导出失败：'+e.message,true);}finally{lock(false);}
};
$('ppt').onclick=async()=>{
 if(!ready())return;lock(true);
 try{
  if(!window.PptxGenJS)throw Error('PPT 组件未加载，请刷新后重试');
  await document.fonts.ready;const pages=layout();status('正在生成与 PDF 同版式的 PPTX…');
  const ppt=new PptxGenJS();const width=210/25.4,height=297/25.4,k=width/PAGE.width;
  ppt.defineLayout({name:'ARTICLE_A4',width,height});ppt.layout='ARTICLE_A4';ppt.author=$('author').value;ppt.subject=state.source;ppt.title=$('title').value;ppt.lang='zh-CN';
  for(const page of pages){const slide=ppt.addSlide();slide.background={color:'FFFFFF'};
   for(const e of page){if(e.type==='image')slide.addImage({data:e.data,x:e.x*k,y:e.y*k,w:e.w*k,h:e.h*k});
    else if(e.text)slide.addText(e.text,{x:e.x*k,y:e.y*k,w:e.w*k,h:e.h*k,fontSize:e.size*k*72,fontFace:'PingFang SC',bold:e.bold,color:e.color.slice(1),margin:0,vertAnchor:'ctr',valign:'mid',breakLine:false,wrap:false,paraSpaceAfterPt:0});}
  }
  await ppt.writeFile({fileName:name('pptx')});status(`PPTX 已生成：${pages.length} 页，与 PDF 同版式，文字可编辑。`);
 }catch(e){status('PPT 导出失败：'+e.message,true);}finally{lock(false);}
};
