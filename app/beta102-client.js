import {enhanceControls} from './study-controls86.js';
import {betaRequest,getStudySync,summarizeStudyRecords} from './beta102-storage.js';
import {icon} from './ui-study56-icons.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const categories={bug:'Ошибка в работе',content:'Ошибка в задании или теории',suggestion:'Предложение',other:'Другое'};
const statuses={new:'Новое',in_progress:'В работе',resolved:'Исправлено'};
const button=(action,label,primary=false)=>'<button type="button" data-beta-action="'+action+'"'+(primary?' class="beta102-primary"':'')+'>'+label+'</button>';
const summary=records=>{const value=summarizeStudyRecords(records);return value.total?'Открытых заданий: '+value.exercises+', черновиков: '+value.drafts+', пройденных тем: '+value.lessons+', заданий с пометками: '+value.marks+'.':'Сохранённых решений пока нет.';};
const feedbackDraftKey='kunilingo.beta102.feedback-drafts';
function feedbackDraftStore(){
  let storage;try{storage=globalThis.localStorage;}catch{}
  const drafts=new Map(),pending=new Set();
  // Separate keys keep independent tabs from replacing each other's drafts.
  const key=(identity,context)=>feedbackDraftKey+'.'+encodeURIComponent(JSON.stringify([identity,context.section,context.exerciseId||null,context.lessonId||null]));
  return {
    read(identity,context){
      const id=key(identity,context);let draft=drafts.get(id);
      try{if(storage&&!pending.has(id)){draft=JSON.parse(storage.getItem(id)||'null');if(draft)drafts.set(id,draft);else drafts.delete(id);}}catch{}
      return draft&&typeof draft.message==='string'?{message:draft.message.slice(0,4000),category:Object.hasOwn(categories,draft.category)?draft.category:'bug'}:null;
    },
    save(identity,context,draft){
      const id=key(identity,context),value={message:String(draft.message||'').slice(0,4000),category:Object.hasOwn(categories,draft.category)?draft.category:'bug',updatedAt:Date.now()};drafts.set(id,value);pending.add(id);
      try{if(!storage)throw new Error();storage.setItem(id,JSON.stringify(value));pending.delete(id);return true;}catch{return false;}
    },
    remove(identity,context){const id=key(identity,context);drafts.delete(id);pending.add(id);try{if(!storage)throw new Error();storage.removeItem(id);pending.delete(id);return true;}catch{return false;}}
  };
}

// Only identifiers needed to reproduce the problem are included. Answers,
// drawings, passwords, browser storage and raw HTML never enter a report.
export function feedbackContext(value={},viewport){
  const result={section:['path','practice','progress','general'].includes(value.section)?value.section:'general'};
  for(const key of ['exerciseId','lessonId','version'])if(typeof value[key]==='string'&&value[key].trim())result[key]=value[key].slice(0,120);
  if(viewport&&Number.isInteger(viewport.width)&&Number.isInteger(viewport.height)&&viewport.width>0&&viewport.height>0&&viewport.width<=20000&&viewport.height<=20000)result.viewport={width:viewport.width,height:viewport.height};
  return result;
}

export async function performIdentityChange({sync,onIdentityChange,reason,operation}){
  // Recovery also runs when a controller throws while being disposed.
  try{
    await onIdentityChange?.({phase:'before',user:sync.user,reason});
    await sync.flush();
    if(sync.state?.durable===false&&(sync.state.dirty||!sync.user))throw new Error('Часть работы пока хранится только в открытом окне. Освободи место в браузере и сохрани её перед сменой аккаунта.');
    await operation();
  }finally{await onIdentityChange?.({phase:'after',user:sync.user,reason});}
}

export function mountBeta102({root,dock,getContext=()=>({}),onIdentityChange,request=betaRequest,sync=getStudySync()}={}){
  const doc=root.ownerDocument,host=doc.createElement('aside'),dialog=doc.createElement('dialog');
  host.className='beta102-host';host.setAttribute('aria-label','Аккаунт и обратная связь');
  dialog.className='beta102-dialog';dialog.setAttribute('aria-labelledby','beta102-dialog-title');
  root.append(host,dialog);
  const abort=new AbortController(),options={signal:abort.signal};
  const compact=globalThis.matchMedia?.('(max-width:1050px)');
  function positionHost(){const docked=Boolean(dock&&compact?.matches);(docked?dock:root).append(host);host.classList.toggle('is-docked',docked);}
  positionHost();compact?.addEventListener?.('change',positionHost,options);
  const feedbackDrafts=feedbackDraftStore();
  let busy=false,initialized=false,destroyed=false,view='account',authMode='login',returnFocus=null,reportContext=null,reportIdentity='guest',queue=[],queueAdmin=false,nextCursor=null,reportTicket=0;
  const syncLabels={guest:'Работа сохраняется на этом устройстве',saved:'Работа сохранена в аккаунте',pending:'Сохраняем работу…',syncing:'Сохраняем работу…',offline:'Нет связи · работа на устройстве',expired:'Нужно снова войти',conflict:'Нужно выбрать сохранённую работу',storage_error:'Не удалось сохранить работу'};
  function renderHost(){
    if(destroyed)return;
    const user=sync.user;
    const label=user?.displayName||user?.username||'Войти';
    host.innerHTML='<div class="beta102-host-actions">'+button('account',icon('account')+'<span class="beta102-action-label">'+esc(label)+'</span>')+button('feedback',icon('feedback')+'<span class="beta102-action-label">Сообщить о проблеме</span>')+'</div><p aria-live="polite">Бета-тест · <span data-beta-sync-label>'+esc(syncLabels[sync.state.status]||'')+'</span></p>';
    host.querySelector('[data-beta-action="account"]').setAttribute('aria-label',label);
    host.querySelector('[data-beta-action="account"]').title=label;
    host.querySelector('[data-beta-action="feedback"]').setAttribute('aria-label','Сообщить о проблеме');
    host.querySelector('[data-beta-action="feedback"]').title='Сообщить о проблеме';
    host.querySelector('[data-beta-action="account"]').disabled=!initialized||busy;
    if(sync.state.conflict)host.insertAdjacentHTML('beforeend',button('conflict','Выбрать версию работы',true));
  }
  const notify=()=>{renderHost();const label=dialog.querySelector('[data-beta-account-sync]');if(label)label.textContent=sync.state.error||syncLabels[sync.state.status]||'';};
  const unsubscribe=sync.subscribe(notify);
  function error(message){const node=dialog.querySelector('[data-beta-error]');if(node){node.textContent=message;node.hidden=!message;}}
  function shell(title,body){
    dialog.innerHTML='<header><h2 id="beta102-dialog-title">'+title+'</h2><button type="button" data-beta-action="close" aria-label="Закрыть">×</button></header>'+body+'<p class="beta102-error" role="alert" data-beta-error hidden></p>';
    enhanceControls(dialog);
    if(dialog.open)dialog.querySelector('input,textarea,button[data-beta-action]:not([data-beta-action="close"])')?.focus({preventScroll:true});
  }
  function renderAuth(){
    view='auth';const registering=authMode==='register';
    shell(registering?'Создать аккаунт':'Войти',
      '<p>Аккаунт сохранит твой путь, ответы и пометки.</p><form data-beta-form="auth">'+
      '<label>Логин<input name="username" autocomplete="username" minlength="3" maxlength="32" required value="'+esc(registering?'':sync.user?.username||'')+'"></label>'+
      (registering?'<label>Как к тебе обращаться<input name="displayName" autocomplete="nickname" maxlength="64"></label>':'')+
      '<label>Пароль<input name="password" type="password" autocomplete="'+(registering?'new-password':'current-password')+'" minlength="8" maxlength="128" required></label>'+
      '<button class="beta102-primary" type="submit">'+(registering?'Создать аккаунт':'Войти')+'</button></form>'+button('switch-auth',registering?'Уже есть аккаунт':'Создать аккаунт'));
  }
  function renderAccount(){
    if(!sync.user){renderAuth();return;}view='account';
    if(sync.state.status==='expired'){
      shell(esc(sync.user.displayName||sync.user.username),'<p role="status">'+esc(sync.state.error||'Сеанс завершился. Войди снова, чтобы сохранить работу в аккаунте.')+'</p><p>'+esc(summary(sync.snapshot()))+'</p>'+button('reauth','Войти снова',true));
      return;
    }
    shell(esc(sync.user.displayName||sync.user.username),'<p data-beta-account-sync role="status">'+esc(sync.state.error||syncLabels[sync.state.status])+'</p><p>'+esc(summary(sync.snapshot()))+'</p><div class="beta102-stack">'+
      (sync.state.conflict?button('conflict','Выбрать версию работы',true):button('flush','Сохранить сейчас',true))+button('my-reports','Мои сообщения')+(sync.user.role==='owner'?button('owner-reports','Все сообщения об ошибках'):'')+button('logout','Выйти')+'</div>');
  }
  function renderImport(){
    view='import';shell('Какую работу продолжить?',
      '<p><strong>В аккаунте.</strong> '+esc(summary(sync.snapshot()))+'</p><p><strong>На этом устройстве до входа.</strong> '+esc(summary(sync.guestSnapshot()))+'</p>'+
      '<p>Перенос заменит текущую работу аккаунта копией с этого устройства. Гостевая копия останется на устройстве.</p><div class="beta102-stack">'+button('keep-account','Продолжить из аккаунта',true)+button('import-guest','Перенести работу этого устройства')+'</div>');
  }
  function renderConflict(){
    const conflict=sync.state.conflict;if(!conflict){renderAccount();return;}
    view='conflict';shell('Выбери версию работы','<p>Работа в аккаунте изменилась на другом устройстве. Мы сохранили обе версии и ждём твоего выбора.</p><p><strong>В аккаунте.</strong> '+esc(summary(conflict.records))+'</p><p><strong>На этом устройстве.</strong> '+esc(summary(sync.snapshot()))+'</p><p>Выбранная версия станет текущей. Другая версия не будет объединена с ней автоматически.</p><div class="beta102-stack">'+button('resolve-server','Продолжить из аккаунта',true)+button('resolve-device','Сохранить работу этого устройства')+'</div>');
  }
  function openFeedback(){
    view='feedback';reportIdentity=sync.user?.id||'guest';reportContext=feedbackContext(getContext()||{},{width:Math.round(globalThis.innerWidth||0),height:Math.round(globalThis.innerHeight||0)});
    const draft=feedbackDrafts.read(reportIdentity,reportContext);
    shell('Сообщить о проблеме','<p>Нашёл ошибку, неточность или неудобство? Опиши, что произошло и что ты ожидал.</p><form data-beta-form="feedback"><label>О чём сообщение<select name="category">'+Object.entries(categories).map(([id,label])=>'<option value="'+id+'"'+(id===draft?.category?' selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Сообщение<textarea name="message" rows="6" minlength="5" maxlength="4000" required>'+esc(draft?.message||'')+'</textarea></label><p class="beta102-small">К сообщению приложим раздел'+(reportContext.exerciseId?' и номер задания':reportContext.lessonId?' и номер темы':'')+'. Ответы и личные пометки не отправляются.</p><button class="beta102-primary" type="submit">Отправить сообщение</button></form>');
  }
  function saveFeedbackDraft(){
    const form=dialog.querySelector('[data-beta-form="feedback"]');
    if(view!=='feedback'||!form)return;
    const saved=feedbackDrafts.save(reportIdentity,reportContext,{message:form.elements.message.value,category:form.elements.category.value});
    if(!saved)error('Не удалось сохранить черновик сообщения на устройстве. Текст остаётся в открытом приложении; перед перезагрузкой скопируй его.');
  }
  function feedbackList(items,admin){
    return items.length?'<ol class="beta102-reports">'+items.map(item=>'<li><div class="beta102-report-heading"><strong>'+esc(categories[item.category]||'Сообщение')+'</strong><small>'+esc(statuses[item.status]||item.status)+'</small></div>'+
      (admin?'<p class="beta102-small">'+esc(item.username||'Без аккаунта')+'</p>':'')+'<p class="beta102-report-message">'+esc(item.message)+'</p><p class="beta102-small">'+esc([item.context?.section==='path'?'Путь':item.context?.section==='practice'?'Практика':item.context?.section==='progress'?'Прогресс':'Приложение',item.context?.exerciseId,item.context?.lessonId].filter(Boolean).join(' · '))+'</p>'+
      (admin?'<label>Состояние<select data-beta-report="'+esc(item.id)+'">'+Object.entries(statuses).map(([id,label])=>'<option value="'+id+'"'+(item.status===id?' selected':'')+'>'+label+'</option>').join('')+'</select></label>':'')+'</li>').join('')+'</ol>':'<p>Сообщений пока нет.</p>';
  }
  function reportsView(){shell(queueAdmin?'Сообщения об ошибках':'Мои сообщения',feedbackList(queue,queueAdmin)+(nextCursor?button('more-reports','Загрузить ещё'):'')+button('account','К аккаунту'));}
  async function loadReports(admin,more=false){
    const ticket=++reportTicket,identity=sync.user?.id;
    view='reports';queueAdmin=admin;shell(admin?'Сообщения об ошибках':'Мои сообщения','<p role="status">Загружаем сообщения…</p>');
    const current=()=>view==='reports'&&!destroyed&&ticket===reportTicket&&identity===sync.user?.id;
    try{const data=await request((admin?'/api/beta/admin/feedback':'/api/beta/feedback')+(more&&nextCursor?'?cursor='+encodeURIComponent(nextCursor):''),{expectedUser:identity||'guest'});if(!current())return;queue=more?[...queue,...(data.items||[])]:data.items||[];nextCursor=data.nextCursor;reportsView();}
    catch(cause){if(current())shell(admin?'Сообщения об ошибках':'Мои сообщения','<p role="alert">'+esc(cause.message)+'</p>'+button(admin?'owner-reports':'my-reports','Повторить')+button('account','К аккаунту'));}
  }
  function open(which){
    if(busy)return;saveFeedbackDraft();reportTicket++;
    returnFocus=host.querySelector('[data-beta-action="'+(which==='feedback'?'feedback':'account')+'"]')||doc.activeElement;
    if(which==='feedback')openFeedback();else if(which==='conflict')renderConflict();else renderAccount();
    if(!dialog.open)dialog.showModal();dialog.querySelector('input,textarea,button[data-beta-action]:not([data-beta-action="close"])')?.focus();
  }
  function close(){
    if(busy)return;saveFeedbackDraft();dialog.close();
    const target=returnFocus?.isConnected?returnFocus:host.querySelector('[data-beta-action="'+(['feedback','sent'].includes(view)?'feedback':'account')+'"]');
    target?.focus({preventScroll:true});
  }
  function setBusy(value){busy=value;renderHost();dialog.querySelectorAll('button,input,select,textarea').forEach(node=>{node.disabled=value;});dialog.setAttribute('aria-busy',String(value));}
  async function identityChange(reason,operation){
    reportTicket++;setBusy(true);error('');
    try{await performIdentityChange({sync,onIdentityChange,reason,operation});}
    finally{setBusy(false);}
  }
  async function authenticate(form){
    const fields=new FormData(form),body={username:String(fields.get('username')||''),password:String(fields.get('password')||'')};
    const displayName=String(fields.get('displayName')||'').trim();if(authMode==='register'&&displayName)body.displayName=displayName;
    await identityChange('login',async()=>{
      const data=await request('/api/beta/'+authMode,{method:'POST',body});let progress=null;
      try{progress=await request('/api/beta/progress',{expectedUser:data.user.id});}catch{}
      sync.activate(data.user,progress);
    });
    if(sync.state.conflict)renderConflict();else if(sync.state.status!=='offline'&&summarizeStudyRecords(sync.guestSnapshot()).total)renderImport();else renderAccount();
  }
  async function action(name){
    if(name==='close'){close();return;}
    if(busy)return;
    if(name==='account'){open('account');return;}
    if(name==='reauth'){authMode='login';renderAuth();return;}
    if(name==='feedback'){open('feedback');return;}
    if(name==='switch-auth'){authMode=authMode==='login'?'register':'login';renderAuth();return;}
    if(name==='conflict'){open('conflict');return;}
    if(name==='keep-account'){renderAccount();return;}
    if(name==='my-reports'||name==='owner-reports'){await loadReports(name==='owner-reports');return;}
    if(name==='more-reports'){await loadReports(queueAdmin,true);return;}
    if(name==='flush'){setBusy(true);await sync.flush();setBusy(false);sync.state.conflict?renderConflict():renderAccount();return;}
    if(name==='logout'){
      await identityChange('logout',async()=>{await request('/api/beta/logout',{method:'POST',body:{},expectedUser:sync.user?.id||'guest'});sync.activate(null);});authMode='login';renderAuth();return;
    }
    if(name==='import-guest'){
      await identityChange('resolve',async()=>{sync.replaceWithGuest();await sync.flush();});sync.state.conflict?renderConflict():renderAccount();return;
    }
    if(name==='resolve-server'||name==='resolve-device'){
      await identityChange('resolve',async()=>{sync.resolveConflict(name==='resolve-server'?'server':'device');await sync.flush();});sync.state.conflict?renderConflict():renderAccount();
    }
  }
  function handleClick(event){const target=event.target.closest('[data-beta-action]');if(target){event.preventDefault();action(target.dataset.betaAction).catch(cause=>{error(cause.message||'Не удалось выполнить действие. Попробуй ещё раз.');});}}
  host.addEventListener('click',handleClick,options);dialog.addEventListener('click',handleClick,options);
  dialog.addEventListener('submit',async event=>{
    const form=event.target;if(!form.dataset.betaForm)return;event.preventDefault();if(busy)return;
    try{
      if(form.dataset.betaForm==='auth'){await authenticate(form);return;}
      saveFeedbackDraft();const values=new FormData(form);setBusy(true);error('');
      const data=await request('/api/beta/feedback',{method:'POST',body:{category:String(values.get('category')),message:String(values.get('message')||'').trim(),context:reportContext},expectedUser:reportIdentity});
      feedbackDrafts.remove(reportIdentity,reportContext);
      setBusy(false);view='sent';shell('Спасибо за сообщение','<p role="status">Сообщение принято. Мы проверим проблему.</p><p class="beta102-small">Номер: '+esc(data.feedback?.id||'')+'</p>'+button('close','Готово',true));
    }catch(cause){setBusy(false);error(cause.message||'Не удалось отправить сообщение. Текст сохранён в этом окне.');}
  },options);
  dialog.addEventListener('input',saveFeedbackDraft,options);
  dialog.addEventListener('change',saveFeedbackDraft,options);
  dialog.addEventListener('change',async event=>{
    const select=event.target.closest('[data-beta-report]');if(!select||busy)return;
    const id=select.dataset.betaReport,old=queue.find(item=>item.id===id)?.status;setBusy(true);error('');
    try{const data=await request('/api/beta/admin/feedback/'+encodeURIComponent(id),{method:'PATCH',body:{status:select.value},expectedUser:sync.user?.id||'guest'});const item=queue.find(item=>item.id===id);if(item)item.status=data.feedback.status;reportsView();}
    catch(cause){select.value=old;error(cause.message);}
    finally{setBusy(false);}
  },options);
  dialog.addEventListener('cancel',event=>{event.preventDefault();event.stopPropagation();close();},options);
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}},options);
  globalThis.addEventListener?.('online',()=>sync.flush(),options);
  const session=(async()=>{
    try{
      const data=await request('/api/beta/session');
      if(data.user)await identityChange('restore',async()=>{let progress=null;try{progress=await request('/api/beta/progress',{expectedUser:data.user.id});}catch{}sync.activate(data.user,progress);});
    }catch{/* The guest workspace remains usable while the local server is unavailable. */}
    finally{initialized=true;renderHost();}
    return sync.user;
  })();
  renderHost();
  return {session,get user(){return sync.user;},flush:()=>sync.flush(),contextChanged(){},destroy(){saveFeedbackDraft();destroyed=true;reportTicket++;unsubscribe();abort.abort();dialog.close();dialog.remove();host.remove();}};
}
