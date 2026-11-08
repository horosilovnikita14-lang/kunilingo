async function sourceRequest(endpoint,params={},post=false,session=null){
  if(!['index.php','questions.php','solve.php'].includes(endpoint))throw new Error('Unsupported source');
  const url=new URL(endpoint,bank),data=new URLSearchParams({proj:project,...params});
  if(session&&!session.deadline)session.deadline=Date.now()+6000;
  const timeout=Math.max(1,Math.min(6000,(session?.deadline??Date.now()+6000)-Date.now()));
  const response=await fetch(post?url:url.href+'?'+data,{method:post?'POST':'GET',headers:{...(post?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(session?.cookie?{Cookie:session.cookie}:{})},body:post?data.toString():undefined,signal:AbortSignal.timeout(timeout)});
  if(!response.ok)throw new Error('FIPI '+response.status);
  if(session){const cookie=response.headers.get('set-cookie')?.match(/PHPSESSID=[a-z0-9,-]+/i)?.[0];if(cookie)session.cookie=cookie;}
  return new TextDecoder('windows-1251').decode(await response.arrayBuffer());
}
