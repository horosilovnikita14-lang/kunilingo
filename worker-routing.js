const json=(value,status=200,cache='no-store')=>Response.json(value,{status,headers:{'Cache-Control':cache}});
let catalogBody;
const questionBodies=new Map();
function publicData(request,key,body,maxAge){
 const etag=`"${DATA_RELEASE}-${key}"`,headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':`public, max-age=${maxAge}`,'ETag':etag,'X-Content-Type-Options':'nosniff'};
 const matches=request.headers.get('if-none-match')?.split(',').some(value=>value.trim().replace(/^W\//,'')===etag||value.trim()==='*');
 if(matches)return new Response(null,{status:304,headers});
 return new Response(request.method==='HEAD'?null:body,{headers});
}
async function staticAsset(request,env){
 const result=await env.ASSETS?.fetch(request);
 if(!result)return new Response('Static asset binding unavailable',{status:503});
 if(result.status!==200&&result.status!==206&&result.status!==304)return result;
 const response=new Response(result.body,result),path=new URL(request.url).pathname;
 // Revalidate code on navigation; retain the asset binding's ETag and range support.
 // Large art and fonts are shared across routes and can be reused for a full day.
 response.headers.set('Cache-Control',/\.(?:png|webp|avif|jpe?g|svg|woff2?|mp3)$/i.test(path)?'public, max-age=86400':'public, max-age=0, must-revalidate');
 return response;
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return staticAsset(request,env);
  try{
   const reading=request.method==='GET'||request.method==='HEAD';
   if(reading&&url.pathname==='/api/fipi/catalog'){
    catalogBody??=JSON.stringify(await catalog());return publicData(request,'catalog',catalogBody,60);
   }
   if(reading&&url.pathname==='/api/fipi/question'){
    const id=(url.searchParams.get('id')||'').toUpperCase();
    let body=questionBodies.get(id);
    if(!body){body=JSON.stringify(await getQuestion(id));if(questionBodies.size>=128)questionBodies.delete(questionBodies.keys().next().value);questionBodies.set(id,body);}
    return publicData(request,id,body,300);
   }
   if(request.method==='POST'&&url.pathname==='/api/fipi/check'){
    if(request.headers.get('origin')&&request.headers.get('origin')!==url.origin)return json({error:'Недоступно'},403);
    if(!/^application\/json\b/i.test(request.headers.get('content-type')||''))return json({error:'Нужен JSON'},415);
    const text=await request.text();if(new TextEncoder().encode(text).length>4096)return json({error:'Ответ слишком длинный'},413);
    let data;try{data=JSON.parse(text);}catch{return json({error:'Некорректный запрос'},400);}
    return json(await checkQuestion(String(data.id||'').toUpperCase(),data.answer));
   }
   return json({error:'Не найдено'},404);
  }catch(error){return error instanceof AnswerInputError?json({error:error.message},400):json({error:'Не удалось загрузить или проверить задание. Попробуй ещё раз.'},503);}
 }
};
