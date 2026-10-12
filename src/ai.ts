'use strict';
// 手动搜题与课程答题共享同一套请求适配。
async function runModel(text: string,signal: AbortSignal,send: (event: ModelEvent) => void=()=>{},structured=false,model?: string,images: QuestionImage[]=[]){
  if(!String(text).trim()||text.length>24000)throw new Error('题目内容为空或超过 24000 字符。');
  const c=await config();if(!c.apiKey)throw new Error('请先在设置页填写你自己的 DeepSeek API Key。');
  model||=c.model;
  const officialDeepSeek=new URL(c.baseUrl).hostname==='api.deepseek.com';
  if(images.length>8||images.some(image=>!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(image.data))||images.reduce((size,image)=>size+image.data.length,0)>8000000)throw new Error('题目图片格式或大小超出限制。');
  const content=images.length?[{type:'text',text},...images.flatMap(image=>[{type:'text',text:image.label},{type:'image_url',image_url:{url:image.data}}])]:text;
  const options: RequestInit={method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${c.apiKey}`},credentials:'omit',redirect:'error',signal,
    body:JSON.stringify({model,messages:[{role:'system',content:structured?SYSTEM+'严格按用户给定的 JSON 结构输出。结论必须符合完整题干，时间、地点等任一条件错误都不能把判断题判为对。缺失依据或无法确定时返回 uncertain:true。':SYSTEM},{role:'user',content}],stream:true,max_tokens:structured&&officialDeepSeek?16384:4096,...(structured?{response_format:{type:'json_object'}}:{}),...(officialDeepSeek?{thinking:{type:structured?'enabled':'disabled'}}:{})})};
  let response: Response;
  // 只重试尚未接收答案的只读模型请求；不重试网页保存或提交。
  for(let attempt=0;attempt<3;attempt++){
    let failure: unknown;
    try{response=await fetch(endpoint(c.baseUrl),options);if(response.ok||![408,429,500,502,503,504].includes(response.status)||attempt===2)break;await response.body?.cancel();}
    catch(error){if(signal.aborted||attempt===2)throw error;failure=error;}
    send({type:'NOTICE',text:'模型连接暂时不可用，正在重试 '+(attempt+1)+'/2。'});
    await new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1000*2**attempt);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
    if(failure)response=null;
  }
  if(!response.ok)throw new Error(httpError(response.status));send({type:'START'});
  let answer='',reasoning='',finished=false,truncated=false;
  const accept=(data: string)=>{
    if(data==='[DONE]'){finished=true;return;}
    let chunk;try{chunk=JSON.parse(data);}catch{throw new Error('接口返回的数据不是兼容的 JSON 流。');}
    if(chunk.error)throw new Error('模型接口返回错误，请检查模型和额度。');
    const choice=chunk.choices?.[0],delta=choice?.delta||{};
    if(typeof delta.content==='string'){answer+=delta.content;send({type:'DELTA',text:delta.content});}
    if(typeof delta.reasoning_content==='string'){reasoning+=delta.reasoning_content;send({type:'THINKING'});}
    if(choice?.finish_reason==='length'){truncated=true;send({type:'NOTICE',text:'答案达到长度上限，可能不完整。'});}
    if(choice?.finish_reason)finished=true;
  };
  if(!(response.headers.get('content-type')||'').includes('text/event-stream')){
    const json=await response.json();answer=json.choices?.[0]?.message?.content||'';
    truncated=json.choices?.[0]?.finish_reason==='length';
    if(typeof answer!=='string')throw new Error('接口答案格式不兼容。');send({type:'DELTA',text:answer});finished=true;
  }else{
    const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
    const consume=(event: string)=>{const data=event.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(data)accept(data);};
    while(true){const {value,done}=await reader.read();pending+=decoder.decode(value||new Uint8Array(),{stream:!done});pending=pending.replace(/\r\n/g,'\n');let boundary;
      while((boundary=pending.indexOf('\n\n'))>=0){consume(pending.slice(0,boundary));pending=pending.slice(boundary+2);}if(done){if(pending.trim())consume(pending);break;}}
  }
  if(!answer.trim())throw new Error(reasoning?'模型只返回思考内容，尚未给出完整答案，请重试或更换模型。':'接口没有返回答案。');
  if(!finished)send({type:'NOTICE',text:'连接提前结束，答案可能不完整。'});
  if(structured&&(!finished||truncated))throw new Error('答案未完整返回，此次结果未用于填写。');
  return answer;
}
