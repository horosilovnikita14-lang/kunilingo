const map=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export function createState(saved={},legacy=false) {
  const state={};
  for(const key of ['done','controls','drafts','started','practiceStarted','controlStarted','controlWork','writingChecks','mocks','theoryRead','theoryPassed','checkWork','practiceWork']) state[key]={...map(saved?.[key])};
  for(const [id,done] of Object.entries(state.done)) if(done) {state.theoryRead[id]=true;state.theoryPassed[id]=true;}
  return state;
}
export function sequence(course) {return course.flatMap(unit=>[...unit.lessons.flatMap(lesson=>['theory','practice'].map(kind=>({kind,id:lesson.id,unitId:unit.id}))),{kind:'control',id:unit.id,unitId:unit.id}]);}
export function completed(state,item) {return Boolean((item.kind==='theory'?state.theoryPassed:item.kind==='practice'?state.done:state.controls)[item.id]);}
export function nextStep(course,state) {return sequence(course).find(item=>!completed(state,item));}
export function canOpen(course,state,kind,id) {
  const item=sequence(course).find(item=>item.kind===kind&&item.id===id);
  if (!item) return false;
  const next=nextStep(course,state);
  return completed(state,item)||(next?.id===id&&next.kind===kind);
}
export function workFor(store,id,questions) {
  const value=store[id]||{};
  const step=Number.isInteger(value.step)&&questions[value.step]?value.step:0;
  return {step,answer:typeof value.answer==='string'?value.answer:'',result:value.result===true,attempts:Number(value.attempts)||0};
}
export function allAnswered(work,questions,isCorrect) {
  return questions.every((question,index)=>isCorrect(question,work?.answers?.[index]));
}
