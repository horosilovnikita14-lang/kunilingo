import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {mountDesignerGallery102} from './app/design102.js';
import {categoryContent102,exportContentPackage102} from './app/study102-content.js';

test('designer gallery uses shared cards, disclosures and an isolated worksheet without network or student storage',async t=>{
  const window=new Window(),saved=new Map();
  const set=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});};
  set('document',window.document);set('getComputedStyle',window.getComputedStyle.bind(window));set('matchMedia',()=>({matches:true}));
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});set('ResizeObserver',class{observe(){}disconnect(){}});
  let external=0;set('fetch',()=>{external++;throw new Error('No gallery request expected');});
  window.localStorage.setItem('kunilingo.practice84','existing student work');
  window.document.write(await readFile(new URL('./app/design102.html',import.meta.url),'utf8'));
  const gallery=mountDesignerGallery102(window.document);assert.ok(gallery);
  t.after(async()=>{gallery.destroy();for(const [name,descriptor]of saved)descriptor?Object.defineProperty(globalThis,name,descriptor):delete globalThis[name];await window.happyDOM.close();});
  assert.deepEqual([...window.document.querySelectorAll('.practice-question-row')].map(card=>card.dataset.status),['new','unfinished','done']);
  assert.ok(window.document.querySelector('[data-design102-guide] [data-guide-topic="homogeneous-repeat"]'));
  assert.equal(window.document.querySelector('[data-design102-guide] details').open,false);
  assert.ok(window.document.querySelector('[data-pencil-tool="pencil"]'));assert.ok(window.document.querySelector('[data-pencil-layer]'));
  assert.equal(window.localStorage.getItem('kunilingo.practice84'),'existing student work');assert.equal(external,0);
  assert.equal(window.document.querySelectorAll('[data-practice="question"]').length,0);
});

test('content package preview rejects invalid JSON, exposes draft honestly and never changes the live registry',async t=>{
  const window=new Window(),saved=new Map();
  const set=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});};
  set('document',window.document);set('getComputedStyle',window.getComputedStyle.bind(window));set('matchMedia',()=>({matches:true}));set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});set('ResizeObserver',class{observe(){}disconnect(){}});
  window.document.write(await readFile(new URL('./app/design102.html',import.meta.url),'utf8'));
  const gallery=mountDesignerGallery102(window.document);t.after(async()=>{gallery.destroy();for(const [name,descriptor]of saved)descriptor?Object.defineProperty(globalThis,name,descriptor):delete globalThis[name];await window.happyDOM.close();});
  const json=window.document.querySelector('[data-design102-json]'),button=window.document.querySelector('[data-design102-validate]'),status=window.document.querySelector('[data-design102-validation]');
  json.value='{bad';button.click();assert.match(status.textContent,/JSON/);
  const content=exportContentPackage102(),target=content.articles.find(article=>article.id==='homogeneous-repeat');target.title='Предпросмотр изменённого заголовка';
  json.value=JSON.stringify(content);button.click();assert.match(status.textContent,/Формат корректен/);
  const chooser=window.document.querySelector('#design102-category');chooser.value='homogeneous-repeat';chooser.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.match(window.document.querySelector('[data-design102-category-preview]').textContent,/Предпросмотр изменённого заголовка/);
  assert.notEqual(categoryContent102('homogeneous-repeat').article.title,target.title);
  chooser.value='intro-confidence';chooser.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.match(window.document.querySelector('[data-design102-category-status]').textContent,/Черновик/);assert.equal(window.document.querySelector('[data-design102-category-preview]').textContent,'');
});
