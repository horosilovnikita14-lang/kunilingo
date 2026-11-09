import {readFile,writeFile,mkdir,cp,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {applyTopicReviews100} from './server-source/topics100.mjs';
import {prepareTopicCoverage101} from './server-source/topic-preparation101.mjs';
import {articleIds101} from './app/study101-registry.js';
const root=process.cwd(),read=p=>readFile(resolve(root,p),'utf8');
await mkdir('dist/client',{recursive:true});await mkdir('dist/server',{recursive:true});
for(const item of await readdir('app',{withFileTypes:true}))if(item.isFile()&&/\.(js|css|html)$/.test(item.name))await cp('app/'+item.name,'dist/client/'+item.name);
await cp('app/assets','dist/client/assets',{recursive:true});
let html=await read('app/index.html');
html=html.replace('<head>','<head><meta name="robots" content="noindex,nofollow"><script>const entryUrl=new URL(location.href);entryUrl.searchParams.set("ui","59");entryUrl.searchParams.set("style","copper");if(!entryUrl.hash)entryUrl.hash="/russian/path";history.replaceState(null,"",entryUrl);</script>');
await writeFile('dist/client/index.html',html);await writeFile('dist/client/robots.txt','User-agent: *\nDisallow: /\n');
const reviewed=applyTopicReviews100({archive:JSON.parse(await read('server-source/questions.json')),catalog:JSON.parse(await read('server-source/catalog.json')),bank:JSON.parse(await read('server-source/bank-snapshot.json')).items,reviews:JSON.parse(await read('server-source/topic-reviews100.json'))});
const {archive,catalog:bankCatalog,bank:bankSnapshot}=reviewed;
const topicCoverage=prepareTopicCoverage101({bank:bankSnapshot,archive,articleIds:articleIds101});
await mkdir('dist/reports',{recursive:true});
await writeFile('dist/reports/topic-coverage101.json',JSON.stringify(topicCoverage,null,2)+'\n');
const answers=(await read('app/practice87-answer.js')).replaceAll('export ','');
const source=await read('server-source/fipi84-source.mjs');
const constants=source.slice(source.indexOf('export const project='),source.indexOf('export async function sourceRequest')).replaceAll('export ','');
const parsing=source.slice(source.indexOf('export function textOf')).replaceAll('export ','');
let api=await read('server-source/fipi84-api.mjs');api=api.slice(api.indexOf('const cache='),api.indexOf('function json('));
api=api.replace(/const archive=[^\n]+/,'const archive=()=>Promise.resolve(ARCHIVE);').replace("readFile(new URL('./data/fipi84-catalog.json',import.meta.url),'utf8').then(JSON.parse)",'Promise.resolve(BANK_CATALOG)').replaceAll('export ','');
api=api.replace(/const bankSnapshot=[^\n]+/,'const bankSnapshot=()=>Promise.resolve(BANK_SNAPSHOT);');
const transport=await read('worker-transport.js'),routing=await read('worker-routing.js');
const release=createHash('sha256').update(JSON.stringify([archive,bankCatalog,bankSnapshot])+api+answers+parsing).digest('hex').slice(0,16);
await writeFile('dist/server/index.js',`const DATA_RELEASE=${JSON.stringify(release)};\nconst ARCHIVE=${JSON.stringify(archive)};\nconst BANK_CATALOG=${JSON.stringify(bankCatalog)};\nconst BANK_SNAPSHOT=new Map(${JSON.stringify(bankSnapshot)}.map(q=>[q.id,q]));\n${answers}\n${constants}\n${transport}\n${parsing}\n${api}\n${routing}`);
// Hosting identity is local configuration, not required to build a clean clone.
let hosting;
try{hosting=JSON.parse(await read('.openai/hosting.json'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(hosting){
  delete hosting.static;hosting.d1=null;hosting.r2=null;
  await mkdir('dist/.openai',{recursive:true});
  await writeFile('.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n');await writeFile('dist/.openai/hosting.json',JSON.stringify(hosting,null,2)+'\n');
}
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'kunilingo-russian-ege',main:'index.js',compatibility_date:'2026-11-07',assets:{directory:'../client',binding:'ASSETS'}},null,2));
console.log(JSON.stringify({catalog:bankCatalog.items.length+archive.length,archive:archive.length,workerBytes:(await read('dist/server/index.js')).length}));
