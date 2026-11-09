import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyTopicReviews100} from '../server-source/topics100.mjs';
import {prepareTopicCoverage101} from '../server-source/topic-preparation101.mjs';
import {articleIds101} from '../app/study101-registry.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const source=applyTopicReviews100({
  catalog:await read('server-source/catalog.json'),
  bank:(await read('server-source/bank-snapshot.json')).items,
  archive:await read('server-source/questions.json'),
  reviews:await read('server-source/topic-reviews100.json'),
});
const includeQueueText=process.argv.includes('--queue');
const report=prepareTopicCoverage101({...source,articleIds:articleIds101,includeQueueText});
const {queue,...coverage}=report;
const directory=resolve(root,'work');
await mkdir(directory,{recursive:true});
await writeFile(resolve(directory,'topic-coverage101.json'),JSON.stringify({...coverage,queue:queue.map(({conditionText,passageText,...entry})=>entry)},null,2)+'\n');
if(includeQueueText)await writeFile(resolve(directory,'topic-classification101.jsonl'),queue.map(entry=>JSON.stringify(entry)).join('\n')+'\n');
console.log(JSON.stringify({summary:report.summary,coverage:'work/topic-coverage101.json',...(includeQueueText?{queue:'work/topic-classification101.jsonl'}:{})},null,2));
