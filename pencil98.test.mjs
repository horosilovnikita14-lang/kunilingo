import test from 'node:test';
import assert from 'node:assert/strict';
import {createPencilHistory,validStrokes,textFingerprint,PENCIL_COLORS,PENCIL_WIDTHS} from './app/practice98-pencil-model.js';

const point=(change={})=>({offset:0,dx:0,dy:0,x:0.1,y:0.2,...change});
const stroke=(id='a',change={})=>({id,scope:'material',points:[point(),point({offset:4,dx:0.5,x:0.4})],width:1.5,color:'#354336',...change});

test('restored strokes survive serialization, undo, redo and erasing',()=>{
  const saved=JSON.parse(JSON.stringify([stroke()])),history=createPencilHistory(saved);
  assert.deepEqual(history.items,saved);
  assert.equal(history.canUndo,false);
  assert.equal(history.add(stroke('b',{scope:'passage'})),true);
  assert.equal(history.remove(['a']),true);
  assert.deepEqual(history.items.map(item=>item.id),['b']);
  assert.equal(history.undo(),true);
  assert.deepEqual(history.items.map(item=>item.id),['a','b']);
  assert.equal(history.undo(),true);
  assert.deepEqual(history.items,saved);
  assert.equal(history.undo(),false);
  assert.equal(history.redo(),true);
  assert.equal(history.redo(),true);
  assert.equal(history.redo(),false);
  assert.equal(history.clear(),true);
  assert.equal(history.clear(),false);
  assert.equal(history.undo(),true);
  assert.deepEqual(history.items.map(item=>item.id),['b']);
});

test('new strokes after undo replace redo; invalid and empty actions keep it',()=>{
  const history=createPencilHistory();
  history.add(stroke('a'));history.add(stroke('b'));history.undo();
  assert.equal(history.canRedo,true);
  assert.equal(history.add(stroke('a')),false);
  assert.equal(history.remove(['missing']),false);
  assert.equal(history.canRedo,true);
  history.add(stroke('c'));
  assert.equal(history.canRedo,false);
  assert.equal(history.redo(),false);
  assert.deepEqual(history.items.map(item=>item.id),['a','c']);
});

test('history deeply owns immutable copies, including each point',()=>{
  const initial=[stroke()],history=createPencilHistory(initial),saved=history.items;
  initial[0].points[0].dx=50;initial.push(stroke('b'));
  assert.equal(history.items.length,1);
  assert.equal(history.items[0].points[0].dx,0);
  assert.throws(()=>history.items.push(stroke('b')),TypeError);
  assert.throws(()=>{history.items[0].scope='passage';},TypeError);
  assert.throws(()=>{history.items[0].points[0].offset=9;},TypeError);
  assert.throws(()=>history.items[0].points.push(point()),TypeError);
  const next=stroke('b');history.add(next);next.id='changed';next.points[0].offset=99;
  assert.equal(history.items[1].id,'b');
  assert.equal(history.items[1].points[0].offset,0);
  assert.equal(saved.length,1);
  history.undo();assert.equal(history.items,saved);
});

test('validation rejects malformed scopes, offsets and unsafe coordinates',()=>{
  const invalid=[null,[],new Date(),stroke(''),stroke(' '.repeat(2)),stroke('a'.repeat(101)),
    stroke('a',{scope:'answer'}),stroke('a',{width:2}),stroke('a',{points:[]}),stroke('a',{points:[point()]}),
    ...[{offset:-1},{offset:0.5},{offset:1_000_001},{offset:NaN},{dx:Infinity},{dy:-101},{x:10.01},{y:-10.01},{x:'0.3'}].map(change=>stroke('a',{points:[point(),point(change)]})),
    stroke('a',{points:Array.from({length:4001},()=>point())})];
  const history=createPencilHistory(invalid);
  assert.equal(history.items.length,0);
  for(const item of invalid)assert.equal(history.add(item),false);
  assert.equal(history.add(stroke('edge',{points:[point({offset:1_000_000,dx:100,dy:-100,x:-10,y:10}),point()]})),true);
  assert.equal(history.add(stroke('long',{points:Array.from({length:4000},()=>point())})),true);
});

test('plain record allowlists exclude HTML, unsafe keys, getters and class instances',()=>{
  class Example{constructor(){Object.assign(this,stroke());}}
  const value=JSON.parse(JSON.stringify(stroke()));
  value.rawHTML='<script>bad</script>';value.points[0].rawHTML='<b>x</b>';
  const history=createPencilHistory([value,new Example()]);
  assert.equal(history.items.length,1);
  assert.deepEqual(Object.keys(history.items[0]),['id','scope','points','width','color']);
  assert.deepEqual(Object.keys(history.items[0].points[0]),['offset','dx','dy','x','y']);
  let reads=0;const getter=stroke('getter');Object.defineProperty(getter,'points',{get(){reads++;return [point(),point()];}});
  assert.equal(history.add(getter),false);
  const pointGetter=stroke('point-getter');Object.defineProperty(pointGetter.points[0],'dx',{get(){reads++;return 0;}});
  assert.equal(history.add(pointGetter),false);
  assert.equal(reads,0);
});

test('scope validation rejects a whole stroke if any anchor is no longer present',()=>{
  const records=[stroke('a'),stroke('passage',{scope:'passage',points:[point({offset:2}),point({offset:6})]}),
    stroke('missing',{scope:'instruction'}),stroke('end',{points:[point(),point({offset:5})]}),
    stroke('far',{points:[point({offset:20}),point()]})];
  assert.deepEqual(validStrokes(records,{material:'слово',passage:'😀слово'}).map(item=>item.id),['a','passage']);
  assert.deepEqual(validStrokes(records,{material:''}),[]);
  assert.deepEqual(validStrokes(records,null),[]);
  assert.equal(records.length,5);
});

test('duplicate strokes and per-task size are bounded',()=>{
  const records=Array.from({length:501},(_,index)=>stroke('m'+index));
  const history=createPencilHistory([null,stroke('m0'),...records]);
  assert.equal(history.items.length,500);
  assert.equal(history.add(stroke('overflow')),false);
  assert.equal(history.remove('m0'),true);
  assert.equal(history.add(stroke('replacement')),true);
  assert.equal(validStrokes([...records,stroke('m0')],{material:'слово'}).length,500);
});

test('history retains at most 80 snapshots without losing current strokes',()=>{
  const history=createPencilHistory();
  for(let i=0;i<100;i++)history.add(stroke('m'+i));
  assert.equal(history.items.length,100);
  let undo=0;while(history.undo())undo++;
  assert.equal(undo,79);
  assert.equal(history.items.length,21);
  let redo=0;while(history.redo())redo++;
  assert.equal(redo,79);
  assert.equal(history.items.length,100);
});

test('per-task total point budget limits restore and add, and erasing frees space',()=>{
  const long=id=>stroke(id,{points:Array.from({length:4000},()=>point())});
  const records=Array.from({length:7},(_,i)=>long('long'+i));
  const history=createPencilHistory(records);
  assert.equal(history.items.length,6);
  assert.equal(history.items.reduce((sum,item)=>sum+item.points.length,0),24_000);
  assert.equal(history.add(stroke('small')),false);
  assert.equal(history.remove(['long0']),true);
  assert.equal(history.add(stroke('small')),true);
  assert.equal(history.add(long('overflow')),false);
  assert.equal(validStrokes(records,{material:'слово'}).length,6);
  const mixed=createPencilHistory([...records.slice(0,5),long('six'),long('skip'),stroke('also-skip')]);
  assert.equal(mixed.items.length,6);
});

test('fingerprints are stable across scope order and change with source text or scope',()=>{
  const first=textFingerprint({material:'😀текст',instruction:'Прочитайте'});
  assert.match(first,/^p98-[0-9a-f]{8}$/);
  assert.equal(first,textFingerprint({instruction:'Прочитайте',material:'😀текст'}));
  assert.notEqual(first,textFingerprint({material:'😀Текст',instruction:'Прочитайте'}));
  assert.notEqual(textFingerprint({material:'a'}),textFingerprint({passage:'a'}));
  assert.notEqual(textFingerprint({}),textFingerprint({material:''}));
  assert.notEqual(textFingerprint({material:'ab',passage:'c'}),textFingerprint({material:'a',passage:'bc'}));
  assert.equal(textFingerprint(null),textFingerprint({}));
});

test('version-one graphite strokes load without changing source fingerprints or geometry',()=>{
  const source={material:'слово'},legacyStroke=stroke();delete legacyStroke.color;
  const legacy=JSON.parse(JSON.stringify({version:1,fingerprint:textFingerprint(source),strokes:[legacyStroke]}));
  const validated=validStrokes(legacy.strokes,source),history=createPencilHistory(validated);
  assert.equal(textFingerprint(source),legacy.fingerprint);
  assert.deepEqual(history.items,[{...legacyStroke,color:'#354336'}]);
  assert.equal(history.items[0].width,1.5);
  assert.equal('color' in legacy.strokes[0],false);
  const resaved=JSON.parse(JSON.stringify({version:1,fingerprint:legacy.fingerprint,strokes:history.items}));
  assert.deepEqual(validStrokes(resaved.strokes,source),history.items);
});

test('all pencil colors and widths survive save, source validation, undo and redo',()=>{
  const history=createPencilHistory();let index=0;
  for(const color of PENCIL_COLORS)for(const width of PENCIL_WIDTHS){
    assert.equal(history.add(stroke('style'+index++,{width,color:color.value})),true);
  }
  const saved=JSON.parse(JSON.stringify(history.items));
  assert.equal(saved.length,15);
  assert.deepEqual(validStrokes(saved,{material:'слово'}),saved);
  for(let i=saved.length-1;i>=0;i--){
    assert.equal(history.items.at(-1).width,saved[i].width);
    assert.equal(history.items.at(-1).color,saved[i].color);
    assert.equal(history.undo(),true);
  }
  assert.equal(history.items.length,0);
  for(let i=0;i<saved.length;i++){
    assert.equal(history.redo(),true);
    assert.deepEqual(history.items.at(-1),saved[i]);
  }
  assert.deepEqual(history.items,saved);
});

test('styles accept only the fixed palette and widths, rejecting CSS and nonliteral data',()=>{
  const history=createPencilHistory();
  const invalidColors=['red','ink','#fff','#A54B47','#354336;stroke-width:99','var(--study-ink)','url(https://example.invalid/paint)',null,{},1];
  for(const color of invalidColors)assert.equal(history.add(stroke('bad',{color})),false);
  for(const width of [0,-1,2,4,6,'3',NaN,Infinity,null])assert.equal(history.add(stroke('bad',{width})),false);
  assert.equal(history.items.length,0);
  assert.equal(history.add(stroke('valid',{color:'#a54b47',width:5})),true);
  assert.equal(history.items[0].color,'#a54b47');
  assert.throws(()=>PENCIL_COLORS.push({id:'bad',value:'red'}),TypeError);
  assert.throws(()=>{PENCIL_COLORS[0].value='red';},TypeError);
  assert.throws(()=>PENCIL_WIDTHS.push(9),TypeError);
});
