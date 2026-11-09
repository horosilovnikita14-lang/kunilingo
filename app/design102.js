import {sections} from './practice84-taxonomy.js';
import {questionRow} from './practice88-view.js';
import {conceptFor101} from './study101-registry.js';
import {conceptMarkup100} from './study100-guides.js';
import {enhanceControls} from './study-controls86.js';
import {mountPencil} from './practice98-pencil.js';
import {categoryContent102,contentCategories102,contentCoverage102,exportContentPackage102,parseContentPackage102,createContentRegistry102} from './study102-content.js';

export function mountDesignerGallery102(doc=globalThis.document){
  const root=doc.querySelector('.design102');if(!root)return null;
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  // Public catalogue metadata, no condition keys or saved student's progress.
  const sample={id:'41634D',internalId:'Р-00002',task:16,year:null,codes:[],tags:['homogeneous-repeat']};
  root.querySelector('[data-design102-records]').innerHTML=[questionRow(sample),questionRow(sample,{visited:true}),questionRow(sample,{done:true})].join('');
  root.querySelectorAll('[data-practice="question"]').forEach(button=>{button.removeAttribute('data-practice');button.removeAttribute('data-question');button.setAttribute('aria-label',button.textContent.trim()+' · образец');});
  root.querySelector('#design102-section').innerHTML=sections.map(section=>'<option value="'+escape(section.id)+'">'+escape(section.label)+'</option>').join('');
  root.querySelector('[data-design102-guide]').innerHTML=conceptMarkup100(conceptFor101('homogeneous-repeat'));
  const coverage=contentCoverage102();
  root.querySelector('[data-design102-coverage]').innerHTML='<p>'+coverage.categories+' категорий: '+coverage.published+' со статьями, '+coverage.draft+' ожидают наполнения.</p><table><thead><tr><th>Раздел</th><th>Статьи категорий</th></tr></thead><tbody>'+coverage.bySection.map(section=>'<tr><td>'+escape(section.title)+'</td><td>'+section.published+' / '+section.categories+'</td></tr>').join('')+'</tbody></table>';
  const chooser=root.querySelector('#design102-category');
  chooser.innerHTML=contentCategories102.filter(category=>category.kind==='category').map(category=>'<option value="'+escape(category.id)+'">'+escape(category.title)+'</option>').join('');
  const status=root.querySelector('[data-design102-category-status]'),preview=root.querySelector('[data-design102-category-preview]');
  let lookup=categoryContent102;
  const showCategory=()=>{
    const content=lookup(chooser.value);status.textContent=content?.status==='published'?'Статья доступна.':'Черновик: место категории зарезервировано, полного материала пока нет.';
    preview.innerHTML=content?.article?conceptMarkup100(content.article):'';enhanceControls(preview);
  };
  chooser.addEventListener('change',showCategory);showCategory();
  root.querySelector('[data-design102-answer]').addEventListener('submit',event=>{event.preventDefault();root.querySelector('#design102-answer-status').textContent='Показано состояние после действия. Данные этого образца не отправлены и не сохранены.';});
  root.querySelector('[data-design102-retry]').addEventListener('click',()=>{root.querySelector('[data-design102-retry-status]').textContent='Образец повторного действия. Сетевой запрос не выполнялся.';});
  const textarea=root.querySelector('[data-design102-json]'),validation=root.querySelector('[data-design102-validation]');
  root.querySelector('[data-design102-fill]').addEventListener('click',()=>{textarea.value=JSON.stringify(exportContentPackage102(),null,2);});
  root.querySelector('[data-design102-export]').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify(exportContentPackage102(),null,2)+'\n'],{type:'application/json'})),link=doc.createElement('a');
    link.href=url;link.download='kunilingo-content102.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  root.querySelector('[data-design102-validate]').addEventListener('click',()=>{
    const result=parseContentPackage102(textarea.value);
    if(!result.ok){validation.textContent=result.errors.join(' ');return;}
    const registry=createContentRegistry102(result.package);lookup=registry.categoryContent;
    validation.textContent='Формат корректен. Ниже доступен предпросмотр выбранной категории; живое приложение не изменено.';showCategory();
  });
  enhanceControls(root);
  // Explicit in-memory storage keeps gallery marks separate from student work.
  const temporary=new Map(),storage={getItem:key=>temporary.get(key)??null,setItem:(key,value)=>temporary.set(key,value)};
  const pencil=mountPencil({container:root.querySelector('[data-design102-worksheet]'),questionId:'design102-example',storage});
  return {destroy(){pencil.destroy();},coverage};
}

if(globalThis.document?.querySelector('.design102'))mountDesignerGallery102();
