export const PROJECT_NAME = 'KuniLingo';

// One shell for all subjects. Only available subjects belong in this registry.
export const SUBJECTS=Object.freeze([
  Object.freeze({id:'russian',label:'Русский язык',qualification:'ЕГЭ'})
]);
export const SECTIONS=Object.freeze({
  path:Object.freeze({label:'Путь'}),
  practice:Object.freeze({label:'Практика'}),
  progress:Object.freeze({label:'Прогресс'})
});
const owns=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
export function parseView(hash,subjects=SUBJECTS){
  const parts=String(hash||'').replace(/^#\/?/,'').split('/');
  const subject=subjects.find(item=>item.id===parts[0])||subjects[0];
  const section=parts.length===2&&subjects.some(item=>item.id===parts[0])&&owns(SECTIONS,parts[1])?parts[1]:null;
  return {subject:subject.id,section};
}
export function viewHash(subject,section){return section?`#/${subject}/${section}`:'';}
