// Answer semantics shared by the solving screen and both source adapters.
// A sequence (matching) and a number such as 14 must never be treated as a set of digits.
export class AnswerInputError extends Error {
  constructor(message){super(message);this.name='AnswerInputError';}
}
const strip=html=>String(html||'').replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<\/(?:p|div|tr)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/[ \t]+/g,' ').trim();
function bodyText(q){const form=String(q.form||'');return strip(form.match(/class=['"]cell_0['"][^>]*>([\s\S]*?)<\/td>/i)?.[1]||form||q.stem||'');}
function instruction(text){return text.split('\n').map(s=>s.trim()).filter(s=>s&&!/^Ответы к заданиям\s/i.test(s)).slice(0,3).join(' ').split(/(?:^|\s)\d+\)\s/)[0];}
const uniqueNumbers=values=>[...new Set(values.map(Number).filter(n=>Number.isInteger(n)&&n>0))].sort((a,b)=>a-b);
export function answerPolicy(q={}){
  const text=bodyText(q),lead=instruction(text);
  if(q.mode==='essay'||q.kind==='Развернутый ответ')return {kind:'essay',hint:'',inputMode:'text'};
  if(q.mode==='matching'||/Установление соответствия/i.test(q.kind||'')||/установите соответствие|последовательность цифр|в порядке.*(?:букв|следования)/i.test(lead))return {kind:'sequence',hint:'Запиши цифры в порядке букв А, Б, В… Здесь порядок важен.',inputMode:'numeric'};
  let values=[],set=false;
  if(q.mode==='multiple'){
    set=true;values=Array.from({length:q.choiceCount||0},(_,i)=>i+1);
  }else if(/(?:укажите|запишите)\s+(?:(?:все|те|эти)\s+)?цифр/i.test(lead)){
    set=true;values=uniqueNumbers([...text.matchAll(/\((\d+)\)/g)].map(m=>m[1]));
  }else if(/номера\s+(?:(?:этих|верных)\s+)?(?:ответов|предложений)|варианты\s+ответов|номер\s*\(а\)/i.test(lead)){
    set=true;
    const range=lead.match(/(?:среди|из)\s+предложений\s+(\d+)\s*[–—-]\s*(\d+)/i);
    if(range&&+range[2]>=+range[1]&&+range[2]-+range[1]<100)values=Array.from({length:+range[2]-+range[1]+1},(_,i)=>i+ +range[1]);
    else {
      const numbered=uniqueNumbers([...text.matchAll(/(?:^|\n)\s*(\d+)\)/g)].map(m=>m[1]));
      values=numbered.length?numbered:uniqueNumbers([...((text+'\n'+strip(q.passage)).matchAll(/\((\d+)\)/g))].map(m=>m[1]));
    }
  }
  if(set){
    const tokens=values.some(n=>n>9)?'numbers':'digits';
    return {kind:'set',tokens,allowedValues:values,
      hint:tokens==='numbers'?'Запиши все выбранные номера через пробел или запятую. Порядок не важен; без повторов.':'Запиши все выбранные цифры без повторов. Порядок не важен; пробелы и запятые допустимы.',inputMode:'numeric'};
  }
  return {kind:'text',hint:'Запиши ответ по инструкции к заданию.',inputMode:'text'};
}

function segmentNumbers(value,allowed){
  const result=[];
  function visit(at,parts){
    if(result.length>1)return;
    if(at===value.length){result.push(parts);return;}
    for(const n of allowed){const word=String(n);if(!parts.includes(n)&&value.startsWith(word,at))visit(at+word.length,[...parts,n]);}
  }
  visit(0,[]);return result;
}
export function normalizeAnswer(q,raw,{sourceKey=false}={}){
  const policy=answerPolicy(q),value=String(raw??'').trim();
  if(!value)throw new AnswerInputError('Введи ответ.');
  if(value.length>250)throw new AnswerInputError('Ответ слишком длинный.');
  if(policy.kind==='essay')throw new AnswerInputError('Сочинение проверяется по критериям.');
  if(policy.kind==='text')return value.toLocaleLowerCase('ru').replaceAll('ё','е').replace(/[\s,;|]/g,'');
  if(!/^[\d\s,;]+$/.test(value))throw new AnswerInputError('Используй только цифры, пробелы или запятые.');
  const compact=value.replace(/[\s,;]/g,'');
  if(policy.kind==='sequence')return compact;
  let numbers;
  if(policy.tokens==='digits')numbers=[...compact].map(Number);
  else if(/[\s,;]/.test(value))numbers=value.split(/[\s,;]+/).filter(Boolean).map(Number);
  else if(!sourceKey&&policy.allowedValues.includes(Number(value)))numbers=[Number(value)];
  else {
    const choices=segmentNumbers(compact,policy.allowedValues);
    if(choices.length!==1)throw new AnswerInputError('Раздели номера пробелами или запятыми.');
    numbers=choices[0];
  }
  if(numbers.some(n=>n===0||!Number.isInteger(n)||(policy.allowedValues.length&&!policy.allowedValues.includes(n))))throw new AnswerInputError('Укажи только номера, которые есть в задании.');
  if(new Set(numbers).size!==numbers.length)throw new AnswerInputError('Каждую цифру или номер запиши только один раз.');
  numbers.sort((a,b)=>a-b);
  return numbers.join(policy.tokens==='numbers'?',':'');
}
