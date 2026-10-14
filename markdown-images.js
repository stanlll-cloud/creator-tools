(()=>{
 const API='https://creator-tools-x-reader.stanlll-creator-tools.workers.dev';
 const cache=new Map();
 function notice(text){const el=document.getElementById('image-status');if(el)el.textContent=text;}
 async function png(src){
  if(cache.has(src))return cache.get(src);
  const pending=(async()=>{
   const target=/^(data:|blob:)/.test(src)?src:API+'/api/image?url='+encodeURIComponent(new URL(src,location.href).href);
   const r=await fetch(target,{signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('图片无法下载，请上传本地图片替换');
   const blob=await r.blob();const url=URL.createObjectURL(blob);
   try{const im=new Image();im.src=url;await im.decode();if(!im.naturalWidth||im.naturalWidth*im.naturalHeight>40000000)throw Error('图片过大');
    const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);return c.toDataURL('image/png');
   }finally{URL.revokeObjectURL(url);}
  })();cache.set(src,pending);try{return await pending;}catch(e){cache.delete(src);throw e;}
 }
 async function inline(root){const images=[...root.querySelectorAll('img')];let failed=0;
  await Promise.all(images.map(async img=>{try{img.src=await png(img.src);img.dataset.imageReady='1';delete img.dataset.imageFailed;}catch{failed++;img.dataset.imageFailed='1';}}));
  notice(images.length?`${images.length-failed}/${images.length} 张图片已准备。${failed?'有图片读取失败，请上传本地图片替换后再复制。':'可复制图文，或点图片上的「复制图片」粘贴原图。'}`:'支持图片链接、上传图片、拖入图片或粘贴截图。');return failed;
 }
 async function prepare(root){const failed=await inline(root);if(failed)throw Error('有图片未准备好，请上传本地图片替换后再复制。');}
 function clean(root){const c=root.cloneNode(true);c.querySelectorAll('.img-overlay-left,.img-copy-b64-btn,script,iframe,object').forEach(e=>e.remove());c.querySelectorAll('.img-wrapper').forEach(w=>{const im=w.querySelector('img');if(im)w.replaceWith(im);});c.querySelectorAll('[data-decorated]').forEach(e=>e.removeAttribute('data-decorated'));return c;}
 function copyImage(img){const p=png(img.src).then(s=>fetch(s)).then(r=>r.blob());return navigator.clipboard.write([new ClipboardItem({'image/png':p})]).then(()=>notice('原图已复制，请在目标编辑器中粘贴。')).catch(e=>{notice('图片复制失败，请使用「下载全部图片」上传。');throw e;});}
 async function downloadAll(){const root=document.getElementById('preview');await prepare(root);const images=[...root.querySelectorAll('img')];if(!images.length){notice('当前文章没有图片');return;}if(!window.JSZip)throw Error('图片打包组件未加载，请刷新后重试');const zip=new JSZip();for(let i=0;i<images.length;i++){const data=await png(images[i].src);zip.file(`图片-${String(i+1).padStart(2,'0')}.png`,data.split(',')[1],{base64:true});}const blob=await zip.generateAsync({type:'blob'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='文章图片.zip';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);notice('全部原图已打包下载，可解压后上传到编辑器。');}
 window.CreatorImages={png,inline,prepare,clean,copyImage,notice};
 document.addEventListener('DOMContentLoaded',()=>{
  const input=document.getElementById('md-input');const bar=document.createElement('div');bar.style='padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;background:#fff;line-height:1.7;flex-shrink:0';
  bar.innerHTML='<button type="button" id="add-images">添加图片</button> <button type="button" id="download-images">下载全部图片</button><input type="file" id="image-files" accept="image/png,image/jpeg,image/webp" multiple hidden><div id="image-status" role="status">支持图片链接、上传图片、拖入图片或粘贴截图。</div>';
  input.before(bar);const picker=bar.querySelector('#image-files');bar.querySelector('#add-images').onclick=()=>picker.click();bar.querySelector('#download-images').onclick=()=>downloadAll().catch(e=>notice(e.message));
  async function add(files){let md='';for(const file of files){if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15000000){notice('图片须为 PNG、JPEG、WebP，且不超过 15MB');continue;}const src=await png(URL.createObjectURL(file));const id=URL.createObjectURL(await(await fetch(src)).blob());cache.set(id,Promise.resolve(src));md+=`\n\n![${file.name.replace(/[\[\]]/g,'')||'图片'}](${id})\n`;}
   const start=input.selectionStart;input.setRangeText(md,start,input.selectionEnd,'end');input.dispatchEvent(new Event('input',{bubbles:true}));}
  picker.onchange=()=>{add([...picker.files]).catch(e=>notice(e.message));picker.value='';};
  input.addEventListener('paste',e=>{const files=[...(e.clipboardData?.files||[])];if(files.some(f=>f.type.startsWith('image/'))){e.preventDefault();add(files).catch(e=>notice(e.message));}});
  input.addEventListener('dragover',e=>e.preventDefault());input.addEventListener('drop',e=>{const files=[...(e.dataTransfer?.files||[])];if(files.length){e.preventDefault();add(files).catch(e=>notice(e.message));}});
 });
})();
