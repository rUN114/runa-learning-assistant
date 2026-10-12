// 仅取当前题目的学习通图片，转换为字节后发送；不把签名 URL、Cookie 写入 AI 或记录。
async function readQuestionImages(sources:{label:string;url:string}[],signal:AbortSignal):Promise<QuestionImage[]>{
  if(sources.length>8)throw new Error('题目图片过多。');
  const images:QuestionImage[]=[];let total=0;
  for(const source of sources){
    const url=new URL(source.url);if(url.protocol!=='https:'||!isCourseHost(url.hostname)||url.username||url.password)throw new Error('图片来源不属于支持的学习通域名，请手动核对。');
    const controller=new AbortController(),abort=()=>controller.abort(),timer=setTimeout(()=>controller.abort(),12000);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
    try{
      const response=await fetch(url.href,{credentials:'omit',redirect:'error',signal:controller.signal});
      const mime=(response.headers.get('content-type')||'').split(';')[0];
      if(!response.ok||!/^image\/(png|jpeg|webp|gif)$/.test(mime))throw new Error('图片不可读取或格式不支持。');
      const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(total+(size*4/3)>7500000)throw new Error('题目图片总大小超出限制。');chunks.push(value);}}
      catch(error){await reader.cancel();throw error;}finally{reader.releaseLock();}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
      const data='data:'+mime+';base64,'+btoa(binary);total+=data.length;images.push({label:source.label,data});
    }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
  }
  return images;
}
