const STUDY_KEYS=new Set(['kunilingo.practice84','kunilingo.russian.course78','kunilingo.russian.course73','kunilingo.russian.path.v1','kunilingo.russian.2027.priorities','kunilingo.pencil98.preferences']);
const PENCIL_KEY=/^kunilingo\.pencil98\.(?:[0-9a-f]{6}|D\d{4}-[ABC]?\d{1,2}-\d+)$/i;
const CACHE_PREFIX='kunilingo.beta102.user.';
const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
export const isStudyStorageKey=key=>typeof key==='string'&&(STUDY_KEYS.has(key)||PENCIL_KEY.test(key));
const copy=value=>JSON.parse(JSON.stringify(value));
function records(value){
  const result={};
  if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of Object.keys(value))if(isStudyStorageKey(key)){
    try{const item=copy(value[key]);if(item!==undefined)result[key]=item;}catch{}
  }
  return result;
}
function nativeStorage(){try{return globalThis.localStorage;}catch{return null;}}
export async function betaRequest(path,{method='GET',body,expectedUser}={}){
  const headers={...(body===undefined?{}:{'Content-Type':'application/json'}),...(expectedUser?{'X-KuniLingo-User':expectedUser}:{})};
  const response=await fetch(path,{method,credentials:'same-origin',headers,...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
  let data;try{data=await response.json();}catch{data={};}
  if(!response.ok){const failure=new Error(data.error?.message||'Не удалось выполнить запрос. Попробуй ещё раз.');failure.status=response.status;failure.data=data;throw failure;}
  return data;
}

export function summarizeStudyRecords(value={}){
  const practice=value['kunilingo.practice84']||{},course=value['kunilingo.russian.course78']||value['kunilingo.russian.course73']||{};
  const count=list=>Array.isArray(list)?list.length:list&&typeof list==='object'?Object.values(list).filter(Boolean).length:0;
  const drafts=Object.values(practice.drafts||{}).filter(text=>typeof text==='string'&&text.trim()).length;
  const exercises=Object.values(practice.work||{}).filter(item=>item?.visited||item?.done).length;
  const completed=Object.values(practice.work||{}).filter(item=>item?.done).length;
  const lessons=count(course.done),marks=Object.entries(value).filter(([key,item])=>PENCIL_KEY.test(key)&&Array.isArray(item?.strokes)&&item.strokes.length).length;
  return {drafts,exercises,completed,lessons,marks,total:drafts+exercises+lessons+marks};
}

// Guest records keep their original keys. Account records live in a separate
// durable outbox per user; changing a cookie never changes this storage scope.
export function createStudySync({storage=nativeStorage(),request=betaRequest,onChange,debounceMs=700}={}){
  let user=null,current={},revision=null,dirty=false,conflict=null,status='guest',error='',timer=null,flight=null,epoch=0,edit=0,durable=true;
  const guestPending=new Set();
  const listeners=new Set();
  function readGuest(){
    const result={};
    if(!storage)return result;
    try{for(let i=0;i<storage.length;i++){
      const key=storage.key(i);if(!isStudyStorageKey(key))continue;
      try{result[key]=JSON.parse(storage.getItem(key));}catch{}
    }}catch{}
    return result;
  }
  let guest=readGuest();current=guest;
  const state=()=>({user:user?{...user}:null,revision,dirty,durable,conflict:conflict?copy(conflict):null,status,error});
  function emit(reason='state'){const event={reason,...state()};for(const listener of listeners)listener(event);onChange?.(event);}
  const cacheKey=id=>CACHE_PREFIX+encodeURIComponent(id);
  function persist(){
    if(!user)return;
    try{if(!storage)throw new Error();storage.setItem(cacheKey(user.id),JSON.stringify({version:1,revision,records:current,dirty}));durable=true;}
    catch(cause){durable=false;status='storage_error';error='Не удалось сохранить работу на этом устройстве. Освободи место в браузере.';emit();throw cause;}
  }
  function later(){clearTimeout(timer);if(user&&!conflict)timer=setTimeout(()=>{flush().catch(()=>{});},debounceMs);}
  function update(key,value,remove=false){
    if(!isStudyStorageKey(key))throw new TypeError('Неизвестный ключ учебных данных');
    // Leaving a screen saves its snapshot again. An unchanged snapshot must
    // not create a new server revision and conflict with another open tab.
    if(durable&&(remove?!own(current,key):own(current,key)&&JSON.stringify(current[key])===JSON.stringify(value)))return;
    if(remove)delete current[key];else current[key]=copy(value);
    edit++;error='';
    if(user){dirty=true;status=conflict?'conflict':'pending';persist();later();}
    else{guest=current;guestPending.add(key);try{if(!storage)throw new Error('Хранилище браузера недоступно');if(remove)storage.removeItem(key);else storage.setItem(key,JSON.stringify(current[key]));guestPending.delete(key);durable=guestPending.size===0;status=durable?'guest':'storage_error';}catch(cause){durable=false;status='storage_error';error='Не удалось сохранить работу на этом устройстве. Освободи место в браузере.';emit();throw cause;}}
    emit('write');
  }
  const adapter=Object.freeze({
    getItem(key){return isStudyStorageKey(key)&&own(current,key)?JSON.stringify(current[key]):null;},
    setItem(key,value){update(key,JSON.parse(String(value)));},
    removeItem(key){if(isStudyStorageKey(key)&&own(current,key))update(key,null,true);},
    key(index){return Object.keys(current)[index]??null;},
    get length(){return Object.keys(current).length;}
  });
  function activate(nextUser,remote=null){
    clearTimeout(timer);epoch++;edit=0;error='';conflict=null;user=nextUser?{...nextUser}:null;
    if(!user){current=guest;revision=null;dirty=false;durable=guestPending.size===0;status=durable?'guest':'storage_error';emit('identity');return;}
    let cached;try{cached=JSON.parse(storage?.getItem(cacheKey(user.id))||'null');}catch{}
    const pending=cached?.version===1&&cached.dirty;
    current=records(pending?cached.records:remote?.records||cached?.records||{});
    // A pending snapshot retains the revision it was based on. Persisting the
    // newer conflicting revision here would turn the next reload into consent.
    revision=pending?(Number.isSafeInteger(cached?.revision)?cached.revision:null):Number.isSafeInteger(remote?.revision)?remote.revision:Number.isSafeInteger(cached?.revision)?cached.revision:null;
    dirty=Boolean(pending);
    if(pending&&remote&&cached.revision!==remote.revision){conflict={revision:remote.revision,records:records(remote.records)};status='conflict';}
    else status=remote?(dirty?'pending':'saved'):'offline';
    if(!remote)error='Связь с аккаунтом прервалась. Работа останется на этом устройстве до синхронизации.';
    try{persist();}catch{}
    emit('identity');if(dirty&&!conflict&&remote)later();
  }
  async function runFlush(){
    clearTimeout(timer);if(!user||!dirty||conflict)return false;
    const ticket=epoch,identity=user.id;
    status='syncing';error='';emit();
    try{
      if(revision===null){
        const remote=await request('/api/beta/progress',{expectedUser:identity});if(ticket!==epoch)return false;
        if(Object.keys(records(remote.records)).length){conflict={revision:remote.revision,records:records(remote.records)};status='conflict';persist();emit();return false;}
        revision=remote.revision;
      }
      // Serialize writes. An edit made during a request stays in the outbox and
      // is sent against the revision returned by that request, never discarded.
      while(dirty&&!conflict&&ticket===epoch){
        const sentEdit=edit,snapshot=copy(current);
        let remote;
        try{remote=await request('/api/beta/progress',{method:'PUT',body:{revision,records:snapshot},expectedUser:identity});}
        catch(cause){
          if(cause.status===409&&cause.data&&Number.isSafeInteger(cause.data.revision)){
            if(ticket!==epoch)return false;
            conflict={revision:cause.data.revision,records:records(cause.data.records)};status='conflict';persist();emit();return false;
          }
          throw cause;
        }
        if(ticket!==epoch)return false;
        revision=remote.revision;dirty=edit!==sentEdit;
        if(!dirty)current=records(remote.records||snapshot);
        persist();
      }
      if(ticket!==epoch)return false;
      status=dirty?'pending':'saved';emit();return !dirty;
    }catch(cause){
      if(ticket===epoch){if(status!=='storage_error'){status=cause.status===401?'expired':'offline';error=cause.status===401?(cause.data?.error?.code==='session_changed'?'В другом окне изменился аккаунт. Войди снова: твоя работа осталась на этом устройстве.':'Сеанс завершился. Войди снова: несохранённая работа осталась на этом устройстве.'):'Нет связи с аккаунтом. Работа сохранена на этом устройстве и отправится при восстановлении связи.';}try{persist();}catch{}emit();}
      return false;
    }
  }
  function flush(){if(!flight){const ticket=epoch;flight=runFlush().finally(()=>{flight=null;if(ticket!==epoch&&user&&dirty&&!conflict)later();});}return flight;}
  function resolveConflict(choice){
    if(!conflict)return false;
    const remote=conflict;conflict=null;revision=remote.revision;
    if(choice==='server'){current=records(remote.records);dirty=false;status='saved';}
    else if(choice==='device'){dirty=true;status='pending';}
    else{conflict=remote;return false;}
    edit++;error='';persist();emit('replace');if(dirty)later();return true;
  }
  function replaceWithGuest(){
    if(!user||conflict)return false;
    current=records(guest);dirty=true;edit++;status='pending';persist();emit('replace');later();return true;
  }
  return Object.freeze({
    storage:adapter,get state(){return state();},get user(){return user?{...user}:null;},
    snapshot:()=>copy(current),guestSnapshot:()=>copy(guest),activate,flush,resolveConflict,replaceWithGuest,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    destroy(){clearTimeout(timer);epoch++;listeners.clear();}
  });
}

let singleton;
export function getStudySync(options){return singleton??=createStudySync(options);}
export function getStudyStorage(){return getStudySync().storage;}
