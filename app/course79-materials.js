import {wordlists} from './course79-wordlists.js';
const normalize=value=>value.toLocaleLowerCase('ru').replace(/ё/g,'е');
export function dictionaryFor(id) {
  if(id==='norms-1') return {title:'Все слова для ударений',...wordlists.stress,description:'Ударная гласная выделена прописной буквой. Учи слово вместе с указанной формой; запомненное ударение не всегда переносится на другие формы.',groups:wordlists.stress.groups};
  if(id!=='norms-2') return null;
  const groups=[];
  for(const entry of wordlists.paronyms.groups) {
    const title=entry[0];
    let group=groups.find(group=>group.title===title);
    if(!group) {group={title,entries:[]};groups.push(group);}
    group.entries.push(entry);
  }
  return {title:'Все группы паронимов',url:wordlists.paronyms.url,groups,description:'Это полный перечень пар и групп из списка ФИПИ. Запоминай различие значений и сочетаний, а не только похожее звучание. В задании сохраняй нужную форму слова.'};
}
export function dictionaryMarkup(id,escape) {
  const data=dictionaryFor(id);
  if(!data) return '';
  return '<section class="course-dictionary"><h3>'+data.title+'</h3><p>'+data.description+'</p>'+
    '<p class="course-source-note">ФИПИ · список 2026, опубликованный в действующем навигаторе. Используем при подготовке к 2027 году. <a href="'+data.url+'" target="_blank" rel="noopener">Оригинал ↗</a></p>'+
    '<label class="course-dictionary-search">Найти слово<input type="search" data-word-search placeholder="'+(id==='norms-1'?'Например, аэропорты':'Например, представить')+'" autocomplete="off"></label>'+
    '<div class="course-word-groups">'+data.groups.map((group,index)=>'<details class="course-word-group" '+(index===0?'open':'')+'><summary>'+escape(group.title)+'</summary><ul>'+
      group.entries.map(entry=>'<li data-word-entry="'+escape(normalize(entry))+'">'+(id==='norms-1'?escape(entry).replace(/[АЕЁИОУЫЭЮЯ]/g,letter=>'<b>'+letter+'</b>'):escape(entry))+'</li>').join('')+'</ul></details>').join('')+'</div>'+
    '<p data-word-empty hidden role="status">Такого слова в этом списке нет.</p></section>';
}
export function filterDictionary(input,body) {
  const term=normalize(input.value.trim());
  let total=0;
  for(const group of body.querySelectorAll('.course-word-group')) {
    let count=0;
    for(const item of group.querySelectorAll('[data-word-entry]')) {
      const visible=item.dataset.wordEntry.includes(term);
      item.hidden=!visible;if(visible)count++;
    }
    group.hidden=count===0;group.open=Boolean(term&&count);
    total+=count;
  }
  const empty=body.querySelector('[data-word-empty]');
  if(empty)empty.hidden=total>0;
}

