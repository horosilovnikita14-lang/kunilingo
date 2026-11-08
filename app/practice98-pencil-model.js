// Strokes are a separate working layer. The original exercise stays unchanged.
// Each point has an original text anchor (UTF-16 offset), an em displacement,
// and normalized source coordinates for regions where no text anchor is usable.
const SCOPES=Object.freeze(['instruction','material','passage']);
export const PENCIL_COLORS=Object.freeze([
  {id:'ink',label:'Графит',value:'#354336'},
  {id:'copper',label:'Медный',value:'#934726'},
  {id:'green',label:'Зелёный',value:'#3d593b'},
  {id:'blue',label:'Синий',value:'#48677e'},
  {id:'red',label:'Красный',value:'#a54b47'}
].map(Object.freeze));
export const PENCIL_WIDTHS=Object.freeze([1.5,3,5]);
const COLORS=new Set(PENCIL_COLORS.map(color=>color.value));
const LIMIT=500,POINT_LIMIT=24_000,HISTORY_LIMIT=80,MAX_OFFSET=1_000_000;
const ownValue=(record,key)=>Object.getOwnPropertyDescriptor(record,key)?.value;

function plainRecord(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const prototype=Object.getPrototypeOf(value);
  return prototype===Object.prototype||prototype===null;
}
const finiteWithin=(value,limit)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=limit;

function stroke(value){
  if(!plainRecord(value))return null;
  const id=ownValue(value,'id'),scope=ownValue(value,'scope'),source=ownValue(value,'points');
  const width=ownValue(value,'width'),savedColor=ownValue(value,'color');
  // Version-one strokes had no color; normalize them to the original graphite.
  const color=savedColor===undefined?PENCIL_COLORS[0].value:savedColor;
  if(typeof id!=='string'||!id.trim()||id.length>100||!SCOPES.includes(scope)||!PENCIL_WIDTHS.includes(width)||!COLORS.has(color))return null;
  if(!Array.isArray(source)||source.length<2||source.length>4000)return null;
  const points=[];
  for(let i=0;i<source.length;i++){
    const point=ownValue(source,String(i));if(!plainRecord(point))return null;
    const offset=ownValue(point,'offset'),dx=ownValue(point,'dx'),dy=ownValue(point,'dy');
    const x=ownValue(point,'x'),y=ownValue(point,'y');
    if(!Number.isInteger(offset)||offset<0||offset>MAX_OFFSET||!finiteWithin(dx,100)||!finiteWithin(dy,100)||!finiteWithin(x,10)||!finiteWithin(y,10))return null;
    points.push(Object.freeze({offset,dx,dy,x,y}));
  }
  // Keep an explicit data allowlist; no saved HTML or executable properties.
  return Object.freeze({id,scope,points:Object.freeze(points),width,color});
}

function snapshot(items,accept=()=>true){
  const result=[],ids=new Set();let pointCount=0;
  if(Array.isArray(items))for(const item of items){
    const next=stroke(item);
    if(!next||ids.has(next.id)||pointCount+next.points.length>POINT_LIMIT||!accept(next))continue;
    result.push(next);ids.add(next.id);pointCount+=next.points.length;
    if(result.length===LIMIT)break;
  }
  return Object.freeze(result);
}

function scopeText(scopes,scope){
  if(!plainRecord(scopes))return undefined;
  const value=ownValue(scopes,scope);
  return typeof value==='string'?value:undefined;
}

export function validStrokes(items,scopes){
  return snapshot(items,item=>{
    const text=scopeText(scopes,item.scope);
    return text!==undefined&&item.points.every(point=>point.offset<text.length);
  });
}

// Version marker only, not a security or authenticity check. Length framing
// keeps empty/missing scopes and adjacent strings distinct; key order is fixed.
export function textFingerprint(scopes){
  let hash=0x811c9dc5;
  const feed=text=>{for(let i=0;i<text.length;i++){
    const code=text.charCodeAt(i);
    hash=Math.imul(hash^(code&255),0x01000193);
    hash=Math.imul(hash^(code>>>8),0x01000193);
  }};
  for(const scope of SCOPES){
    const text=scopeText(scopes,scope);
    feed(scope+':'+(text===undefined?'-':text.length)+':');
    if(text!==undefined)feed(text);
  }
  return 'p98-'+(hash>>>0).toString(16).padStart(8,'0');
}

export function createPencilHistory(initial=[]){
  let states=[snapshot(initial)],index=0;
  const commit=items=>{
    states=states.slice(0,index+1);
    states.push(Object.freeze(items));
    if(states.length>HISTORY_LIMIT)states.shift();
    index=states.length-1;
    return true;
  };
  return Object.freeze({
    get items(){return states[index];},
    get canUndo(){return index>0;},
    get canRedo(){return index<states.length-1;},
    add(value){
      const item=stroke(value),items=states[index];
      if(!item||items.length>=LIMIT||items.some(mark=>mark.id===item.id)||items.reduce((total,mark)=>total+mark.points.length,0)+item.points.length>POINT_LIMIT)return false;
      return commit([...items,item]);
    },
    remove(ids){
      const selected=new Set(typeof ids==='string'?[ids]:Array.isArray(ids)?ids:[]);
      const items=states[index].filter(item=>!selected.has(item.id));
      return items.length===states[index].length?false:commit(items);
    },
    clear(){return states[index].length?commit([]):false;},
    undo(){if(index===0)return false;index--;return true;},
    redo(){if(index===states.length-1)return false;index++;return true;}
  });
}
