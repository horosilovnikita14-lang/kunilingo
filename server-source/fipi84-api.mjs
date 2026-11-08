import {readFile} from 'node:fs/promises';
import {parsePage,sourceRequest,bank,project} from './fipi84-source.mjs';
import {answerPolicy,normalizeAnswer,AnswerInputError} from './practice87-answer.js';
const cache=new Map();
const checkSessions=new Map();
const checkSessionTtl=300000,checkSessionLimit=64;
function takeCheckSession(id){
  const saved=checkSessions.get(id);checkSessions.delete(id);
  // Lease an idle session to one check only. Parallel checks get separate cookies,
  // because FIPI keeps question/answer state in its PHP session.
  return saved?.cookie&&saved.expiresAt>Date.now()?{cookie:saved.cookie,expiresAt:saved.expiresAt}:{expiresAt:Date.now()+checkSessionTtl};
}
function keepCheckSession(id,session){
  const now=Date.now();
  for(const [key,saved]of checkSessions)if(saved.expiresAt<=now)checkSessions.delete(key);
  if(!session.cookie||session.expiresAt<=now||checkSessions.has(id))return;
  if(checkSessions.size>=checkSessionLimit)checkSessions.delete(checkSessions.keys().next().value);
  // Never retain a request's mutable deadline, or overwrite a concurrently
  // completed check's session. Only graded responses return a session to the pool.
  checkSessions.set(id,{cookie:session.cookie,expiresAt:session.expiresAt});
}
function sourceFailureCode(error){
  if(error?.name==='TimeoutError'||error?.name==='AbortError')return 'source_timeout';
  const status=String(error?.message||'').match(/^FIPI ([45]\d{2})$/)?.[1];
  if(status)return 'source_http_'+status;
  return error?.message==='Unexpected check result'?'source_unexpected_response':'source_request_failed';
}
let catalogPromise,archivePromise,snapshotPromise;
const bankSnapshot=()=>snapshotPromise??=readFile(new URL('./data/fipi93/questions.json',import.meta.url),'utf8').then(JSON.parse).then(v=>new Map(v.items.map(q=>[q.id,q]))).catch(()=>new Map());
const archive=()=>archivePromise??=readFile(new URL('./data/fipi85/questions.json',import.meta.url),'utf8').then(JSON.parse);
export const catalog=()=>catalogPromise??=Promise.all([readFile(new URL('./data/fipi84-catalog.json',import.meta.url),'utf8').then(JSON.parse),archive()]).then(([bank,extra])=>{
  const items=[...bank.items,...extra.map(({form,passage,answer,source,mode,...meta})=>meta)];return {...bank,total:items.length,bankTotal:bank.total,archiveTotal:extra.length,items};
});
export async function getQuestion(id) {
  if(/^D\d{4}-[ABC]?\d{1,2}-\d+$/.test(id)){
    const q=(await archive()).find(q=>q.id===id);if(!q)throw new Error('Unknown archive question');const {answer,...publicQuestion}=q;return publicQuestion;
  }
  if(!/^[0-9A-F]{6}$/.test(id))throw new Error('Invalid question ID');
  const stored=(await bankSnapshot()).get(id);if(stored)return stored;
  const entry=(await catalog()).items.find(item=>item.id===id);
  if(!entry)throw new Error('Unknown question');
  const cached=cache.get(id);if(cached&&Date.now()-cached.at<600000)return cached.promise;
  const session={};
  const promise=(async()=>{
    await sourceRequest('index.php',{},false,session);
    return parsePage(await sourceRequest('questions.php',{search:'1',qid:id,pagesize:'1'},false,session));
  })().then(result=>{
    const question=result.items.find(item=>item.guid===entry.guid);
    if(!question)throw new Error('Question no longer available');
    const choiceCount=[...question.form.matchAll(/type=["']?checkbox["']?\s/gi)].length;
    const mode=question.kind==='Развернутый ответ'?'essay':choiceCount?'multiple':/Установление соответствия/.test(question.kind)?'matching':'short';
    return {...entry,form:question.form,passage:question.passage,mode,choiceCount,source:bank+'questions.php?'+new URLSearchParams({proj:project,search:'1',qid:id})};
  }).catch(error=>{cache.delete(id);throw error;});
  if(cache.size>=64)cache.delete(cache.keys().next().value);
  cache.set(id,{at:Date.now(),promise,session});return promise;
}
export async function checkQuestion(id,answer) {
  if(/^D\d{4}-[ABC]?\d{1,2}-\d+$/.test(id)){
    const q=(await archive()).find(q=>q.id===id);if(!q||q.mode==='essay')throw new Error('Invalid archive question');
    return checkArchiveAnswer(q,answer);
  }
  const question=await getQuestion(id),encoded=encodeAnswer(question,answer);
  const sourceId=question.form?.match(/\bname=["']checkform([a-f0-9]{6})["']/i)?.[1]||id;
  const sourceGuid=question.form?.match(/\bname=["']guid["']\s+value=["']([a-f0-9]{32})["']/i)?.[1]||question.guid;
  const session=takeCheckSession(id);
  try{
    if(!session.cookie){await sourceRequest('index.php',{},false,session);await sourceRequest('questions.php',{search:'1',qid:sourceId,pagesize:'1'},false,session);}
    const result=(await sourceRequest('solve.php',{ajax:'1',guid:sourceGuid,answer:encoded},true,session)).trim();
  if(!['0','1','2','3'].includes(result))throw new Error('Unexpected check result');
  if(result==='2'||result==='3')keepCheckSession(id,session);
  return {status:{'0':'unavailable','1':'submitted','2':'incorrect','3':'correct'}[result],...(result==='0'?{code:'source_unavailable'}:{})};
  }catch(error){return {status:'unavailable',code:sourceFailureCode(error)};}
}
export function checkArchiveAnswer(q,answer){
  const value=normalizeAnswer(q,answer);
  if(!q.answer)return {status:'unavailable'};
  // Some official tables append “любая другая последовательность этих цифр”
  // after the actual key. It is an explanation, not another literal answer.
  const choices=[];
  for(const key of q.answer.replace(/<или>/gi,';').replace(/<[^>]+>/g,'').split(/[;|]/).filter(s=>s.trim())){
    try{choices.push(normalizeAnswer(q,key,{sourceKey:true}));}catch{}
  }
  if(!choices.length)return {status:'unavailable'};
  return {status:choices.includes(value)?'correct':'incorrect'};
}
export function encodeAnswer(question,answer) {
  const value=normalizeAnswer(question,answer);
  if(question.mode==='multiple'){
    const indexes=answerPolicy(question).tokens==='numbers'?value.split(',').map(Number):[...value].map(Number);
    const selected=new Set(indexes);
    return Array.from({length:question.choiceCount},(_,i)=>selected.has(i+1)?'1':'0').join('');
  }
  const policy=answerPolicy(question);
  return policy.kind==='set'?value.replaceAll(',',''):policy.kind==='text'?String(answer).trim():value;
}
function json(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(body);}
export async function handleFipi(req,res,url) {
  try{
    if(req.method==='GET'&&url.pathname==='/api/fipi/catalog'){json(res,200,await catalog());return;}
    if(req.method==='GET'&&url.pathname==='/api/fipi/question'){
      json(res,200,await getQuestion((url.searchParams.get('id')||'').toUpperCase()));return;
    }
    if(req.method==='POST'&&url.pathname==='/api/fipi/check'){
      if(!/^application\/json\b/i.test(req.headers['content-type']||'')){json(res,415,{error:'Нужен JSON'});return;}
      if(req.headers.origin&&!['http://127.0.0.1:4175','http://localhost:4175'].includes(req.headers.origin)){json(res,403,{error:'Недоступно'});return;}
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096){json(res,413,{error:'Ответ слишком длинный'});return;}}
      const data=JSON.parse(body);
      json(res,200,await checkQuestion(String(data.id||'').toUpperCase(),data.answer));return;
    }
    json(res,404,{error:'Не найдено'});
  }catch(error){if(error instanceof AnswerInputError){json(res,400,{error:error.message});return;}json(res,503,{error:'Не удалось получить ответ ФИПИ. Попробуй ещё раз или открой задание в источнике.'});}
}
