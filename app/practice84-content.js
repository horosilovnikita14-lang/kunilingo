// Rebuild source markup from a small allowlist; never run source scripts or forms.
export function sourceFragment(html,document=globalThis.document) {
  const result=document.createDocumentFragment(),template=document.createElement('template');
  const allowed=new Set(['P','DIV','SPAN','B','STRONG','I','EM','U','BR','SUP','SUB','TABLE','TBODY','THEAD','TR','TD','TH','UL','OL','LI']);
  const blocked=new Set(['SCRIPT','STYLE','INPUT','SELECT','TEXTAREA','BUTTON','IFRAME','OBJECT','EMBED','SVG','MATH','LINK','META']);
  template.innerHTML=String(html||'');
  function visit(node,parent) {
    if(node.nodeType===3){parent.append(document.createTextNode(node.textContent));return;}
    if(node.nodeType!==1||blocked.has(node.tagName))return;
    if(node.tagName==='IMG'){
      try{const url=new URL(node.getAttribute('src')||'','https://ege.fipi.ru/bank/');if(url.protocol!=='https:'||url.hostname!=='ege.fipi.ru')return;
        const image=document.createElement('img');image.src=url.href;image.alt=node.getAttribute('alt')||'Иллюстрация задания';image.loading='lazy';parent.append(image);
      }catch{}return;
    }
    if(node.tagName==='P'&&!node.textContent.replaceAll('\u00a0',' ').trim()&&!node.querySelector('img'))return;
    const next=allowed.has(node.tagName)?document.createElement(node.tagName.toLowerCase()):parent;
    if(next!==parent){
      for(const name of ['colspan','rowspan']){const value=node.getAttribute(name);if(value&&/^[1-9]\d?$/.test(value))next.setAttribute(name,value);}
      parent.append(next);
    }
    for(const child of node.childNodes)visit(child,next);
  }
  const statement=template.content.querySelector?.('.cell_0');
  if(statement){
    for(const child of statement.childNodes)visit(child,result);
    const variants=template.content.querySelector('.varinats-block'),choices=variants?.querySelector('.distractors-table');
    if(choices){
      const list=document.createElement('ol');list.className='practice-choice-list';
      for(const row of choices.rows){
        const cells=[...row.cells],last=cells.at(-1);if(!last)continue;
        const item=document.createElement('li'),number=document.createElement('span'),copy=document.createElement('div');
        number.className='practice-choice-label';number.textContent=String(list.children.length+1)+')';
        for(const child of last.childNodes)visit(child,copy);
        item.append(number,copy);list.append(item);
      }
      result.append(list);
    }else if(variants){for(const child of variants.childNodes)visit(child,result);}
  }else for(const child of template.content.childNodes)visit(child,result);
  // Old source layout tables can have an empty first column and one text cell
  // at the right. Keep true matching tables; unwrap only single-column layouts.
  normalizeLayoutTables(result,document);
  return result;
}

export function normalizeLayoutTables(result,document){
  for(const table of [...(result.querySelectorAll?.('table')||[])].reverse()){
    const rows=[...table.rows],groups=rows.map(row=>[...row.cells].filter(cell=>cell.textContent.trim()||cell.querySelector('img')));
    // A numbered source list may use separate spacer, number and text cells.
    // Recognize only the complete 1), 2), ... sequence; matching headings and
    // lettered pairs keep their table structure.
    if(groups.length>1&&groups.every((cells,index)=>cells.length===2&&cells[0].textContent.trim()===`${index+1})`)){
      const list=document.createElement('ol');list.className='practice-choice-list';
      for(const [label,cell]of groups){
        const item=document.createElement('li'),number=document.createElement('span'),copy=document.createElement('div');
        number.className='practice-choice-label';number.textContent=label.textContent.trim();
        while(cell.firstChild)copy.append(cell.firstChild);
        item.append(number,copy);list.append(item);
      }
      table.replaceWith(list);continue;
    }
    if(!groups.length||groups.some(cells=>cells.length>1))continue;
    const flow=document.createElement('div');
    for(const cells of groups)for(const cell of cells){
      const row=document.createElement('div');
      while(cell.firstChild)row.append(cell.firstChild);
      flow.append(row);
    }
    table.replaceWith(flow);
  }
}

// Split only at existing block/line boundaries. Source content is never inferred
// from the task number: old exam formats and reading passages vary too much.
const instructionStart=/^(?:Расставьте|Укажите|Запишите|Прочитайте|Установите|Определите|Найдите|Выпишите|Подберите|Замените|Исправьте|Вставьте|Выберите|Напишите|Среди предложений|Из предложений|В одном из|В тексте выделен|В каких|Какие из|Какое из|Какие высказывания|Какое слово|В каком|Какое предложение|Какая из|Самостоятельно|Отредактируйте|В привед[ёе]нном|Ниже привед[ёе]н)/iu;
const numberedStart=/^(?:\d+[).]|\(\d+\)|[А-ЯA-Z][)])\s*/u;
const blockTags=new Set(['P','DIV','TABLE','UL','OL']);
const meaningful=node=>Boolean(String(node.textContent||'').replaceAll('\u00a0',' ').trim())||node.tagName==='IMG'||Boolean(node.querySelector?.('img'));

export function partitionQuestionNodes(nodes) {
  const blocks=[];
  function collect(node){
    // The sanitizer has already removed attributes: a wrapping DIV is only a
    // layout container. Tables/lists and inline emphasis remain whole.
    if(node.tagName==='DIV'&&[...node.childNodes].some(child=>blockTags.has(child.tagName))) {
      for(const child of node.childNodes)collect(child);
    } else if(meaningful(node))blocks.push(node);
  }
  for(const node of nodes)collect(node);
  const firstText=String(blocks[0]?.textContent||'').trim();
  if(!instructionStart.test(firstText)||numberedStart.test(firstText))return {instruction:[],material:blocks};
  // An essay brief is one instruction, including its quoted problem and rubric.
  if(/^Напишите сочинение/iu.test(firstText))return {instruction:blocks,material:[]};
  let boundary=1;
  while(boundary<blocks.length){
    const node=blocks[boundary],text=String(node.textContent||'').trim();
    if(['TABLE','UL','OL','IMG'].includes(node.tagName)||numberedStart.test(text)||!instructionStart.test(text))break;
    boundary++;
  }
  return {instruction:blocks.slice(0,boundary),material:blocks.slice(boundary)};
}

export function questionFragments(html,document=globalThis.document) {
  const clean=sourceFragment(html,document),parts=partitionQuestionNodes(clean.childNodes||[]);
  const instruction=document.createDocumentFragment(),material=document.createDocumentFragment();
  for(const node of parts.instruction)instruction.append(node);
  for(const node of parts.material)material.append(node);
  standardizeChoices(material,document);
  return {instruction,material,hasInstruction:parts.instruction.length>0,hasMaterial:parts.material.length>0};
}

// One number column for native choices, imported numbered paragraphs and lists.
function standardizeChoices(material,document){
  const nodes=[...(material.childNodes||[])];
  for(let i=0;i<nodes.length;i++){
    const run=[];let j=i;
    while(j<nodes.length&&nodes[j].tagName==='P'&&new RegExp('^'+(run.length+1)+'\\)\\s*').test(nodes[j].textContent.trim()))run.push(nodes[j++]);
    if(run.length<2)continue;
    const list=document.createElement('ol');
    run[0].before(list);
    for(const [index,p]of run.entries()){
      const texts=[];const visit=n=>{if(n.nodeType===3)texts.push(n);else for(const child of n.childNodes||[])visit(child);};visit(p);
      const first=texts.find(n=>n.textContent.trim());
      if(first)first.textContent=first.textContent.replace(new RegExp('^\\s*'+(index+1)+'\\)\\s*'),'');
      const li=document.createElement('li');li.append(p);list.append(li);
    }
    i=j-1;
  }
  for(const list of material.querySelectorAll?.('ol')||[]){
    if(list.classList.contains('practice-choice-list'))continue;
    list.classList.add('practice-choice-list');
    for(const [index,li]of [...list.children].entries()){
      const number=document.createElement('span'),copy=document.createElement('div');
      number.className='practice-choice-label';number.textContent=(index+1)+')';
      while(li.firstChild)copy.append(li.firstChild);li.append(number,copy);
    }
  }
}
