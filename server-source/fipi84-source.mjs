import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const project='AF0ED3F2557F8FFC4C06F80B6803FD26';
export const bank='https://ege.fipi.ru/bank/';
export async function sourceRequest(endpoint,params={},post=false,session=null) {
  if(!['index.php','questions.php','solve.php'].includes(endpoint))throw new Error('Unsupported source');
  const url=new URL(endpoint,bank),data=new URLSearchParams({proj:project,...params});
  let bytes;
  if(process.platform==='win32'){
    const args=['--silent','--show-error','--fail','--connect-timeout','10','--max-time','30','--max-filesize','12000000'];
    if(session){args.push('--include');if(session.cookie)args.push('--cookie',session.cookie);}
    if(post)args.push('--data',data.toString(),url.href);else args.push(url.href+'?'+data);
    const result=await exec('curl.exe',args,{encoding:'buffer',maxBuffer:12_000_000,windowsHide:true});
    bytes=result.stdout;
    if(session){
      while(bytes.subarray(0,5).toString()==='HTTP/'){
        const end=bytes.indexOf('\r\n\r\n');if(end<0)throw new Error('Invalid HTTP headers');
        const headers=bytes.subarray(0,end).toString('latin1');
        const cookie=headers.match(/^Set-Cookie:\s*(PHPSESSID=[a-z0-9,-]+)/im)?.[1];
        if(cookie)session.cookie=cookie;
        bytes=bytes.subarray(end+4);
      }
    }
  }else{
    const response=await fetch(post?url:url.href+'?'+data,{method:post?'POST':'GET',headers:{...(post?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(session?.cookie?{Cookie:session.cookie}:{})},body:post?data:undefined,signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw new Error('FIPI '+response.status);
    if(session){const cookie=response.headers.get('set-cookie')?.match(/PHPSESSID=[a-z0-9,-]+/i)?.[0];if(cookie)session.cookie=cookie;}
    bytes=await response.arrayBuffer();
  }
  return new TextDecoder('windows-1251').decode(bytes);
}
export function textOf(html) {
  const named={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",laquo:'«',raquo:'»',ndash:'–',mdash:'—',hellip:'…'};
  return html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(Math.min(0x10ffff,n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))))
    .replace(/&([a-z]+);/gi,(all,n)=>named[n]??all).replace(/\s+/g,' ').trim();
}
export function parsePage(html) {
  const counts=[...html.matchAll(/setQCount\((\d+)(?:,\s*(\d+),\s*(\d+))?\)/g)];
  if(!counts.length)throw new Error('Source count missing');
  const count=Number(counts.at(-1)[1]),markers=[...html.matchAll(/<div\s+class=["']qblock(?:\s+hide-form)?["'](?:\s+id=['"]q([a-f0-9]+)['"])?\s*>/gi)];
  const items=[];let passage='';
  for(let index=0;index<markers.length;index++){
    const marker=markers[index],chunk=html.slice(marker.index+marker[0].length,markers[index+1]?.index??html.indexOf("<div id='bottom_marker'"));
    if(!marker[1]){passage=chunk.replace(/<\/div>\s*$/,'');continue;}
    const form=chunk.match(/<form\b[\s\S]*?<\/form>/i)?.[0];
    const guid=form?.match(/name=["']guid["']\s+value=["']([a-f0-9]{32})["']/i)?.[1].toUpperCase();
    const stem=form?.match(/<td\b[^>]*class=['"]cell_0['"][^>]*>([\s\S]*?)<\/td>/i)?.[1];
    if(!guid||stem===undefined)throw new Error('Unrecognised question '+marker[1]);
    const info=chunk.match(/class=["']param-row["'][^>]*>([\s\S]*?)<\/td>/i)?.[1]||'';
    const codes=[...info.matchAll(/<div>\s*(\d+(?:\.\d+)*)/g)].map(m=>m[1]);
    const kind=textOf(chunk.match(/Тип ответа:<\/td><td>([\s\S]*?)<\/td>/i)?.[1]||'');
    items.push({id:marker[1].toUpperCase(),guid,codes,kind,year:null,stem:textOf(stem),bodyText:textOf(form),form,passage});
  }
  if(count>0&&!items.length)throw new Error('Questions missing');
  return {total:count,items};
}
export async function questionPage(params={}) {return parsePage(await sourceRequest('questions.php',{search:'1',pagesize:'50',page:'0',...params}));}
