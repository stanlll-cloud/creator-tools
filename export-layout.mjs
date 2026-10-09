// One A4 coordinate model for preview, PDF and editable PowerPoint.
export const PAGE={width:740,height:1046,margin:44,bottom:995};
export function buildLayout({title,author,source,blocks},measure){
 const pages=[[]];let y=44;
 const next=()=>{pages.push([]);y=44;};
 const place=el=>pages.at(-1).push(el);
 function lines(text,size,bold=false){
  const out=[];
  for(const paragraph of text.replace(/\r/g,'').split('\n')){
   let line='';
   // Preserve characters; wrap near word boundaries for Latin text.
   const words=paragraph.match(/[a-zA-Z0-9_]+|[^\S\n]+|[^a-zA-Z0-9_]/gu)||[''];
   for(const word of words){
    if(measure(line+word,size,bold)<=652){line+=word;continue;}
    if(line){out.push(line.trimEnd());line='';}
    for(const char of word){if(line&&measure(line+char,size,bold)>652){out.push(line.trimEnd());line='';}line+=char;}
   }
   out.push(line.trimEnd());
  }return out;
 }
 function text(text,size=17,color='#283142',bold=false,gap=13){
  const lh=size*1.65;
  for(const line of lines(text,size,bold)){
   if(y+lh>PAGE.bottom)next();
   place({type:'text',text:line,x:44,y,w:652,h:lh,size,color,bold});y+=lh;
  }y+=gap;
 }
 text(title||'未命名文章',29,'#202734',true,10);
 if(author)text(author,12,'#8993a2',false,18);
 for(let i=0;i<blocks.length;){
  const b=blocks[i];
  if(b.type!=='image'){text(b.text||'');i++;continue;}
  if(!b.data){i++;continue;}
  const run=[];
  while(i<blocks.length&&blocks[i].type==='image'){if(blocks[i].data)run.push(blocks[i]);i++;}
  for(let j=0;j<run.length;){
   const group=run.slice(j,j+(run[j].width/run[j].height>1.2?3:2));j+=group.length;
   const ratios=group.map(im=>im.width/im.height),sum=ratios.reduce((a,b)=>a+b,0),gap=14;
   let height=Math.min(group.length===1?540:620,(652-gap*(group.length-1))/sum);
   const remaining=PAGE.bottom-y-16;
   // Use remaining space only when the images remain comfortably readable.
   if(height>remaining){if(remaining>=height*.7)height=remaining;else next();}
   let x=44+(652-(sum*height+gap*(group.length-1)))/2;
   group.forEach((im,k)=>{place({type:'image',data:im.data,alt:im.alt,x,y,w:ratios[k]*height,h:height});x+=ratios[k]*height+gap;});y+=height+18;
  }
 }
 if(source)text('原文：'+source,10,'#8993a2',false,0);
 pages.forEach((page,i)=>page.push({type:'text',text:`${i+1} / ${pages.length}`,x:44,y:1013,w:652,h:16,size:10,color:'#8993a2',bold:false}));
 return pages;
}
