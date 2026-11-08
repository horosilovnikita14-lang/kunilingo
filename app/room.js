import {createRenderer} from './renderer.js';
import {cameraFor} from './room-camera.js';
import {createSoundscape} from './audio.js';
import {createCharacterMotion} from './motion.js';
import {WRITING_DURATION,PAGE_SWITCH_TIME,SECOND_PAGE_TIME,sampleWriting} from './writing.js';
const $=s=>document.querySelector(s),root=$('#room'),stage=$('#stage'),canvas=$('#scene'),status=$('#status');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),audio=createSoundscape({onPlaybackChange(value){playing=value;sync();transition();},onError(error){message('Не удалось включить музыку');console.error(error);}});
let moving=!reduced.matches,playing=false,raf=0,last=0,clock=0,renderer,frameCount=0;
let statusTimer,restTimer,musicPending=false,lastWake=-Infinity;
let reelAngle=0,musicSpeed=0,transitionUntil=0;
let character=createCharacterMotion(),characterStarted=0,lastLineTime=0,lineOffset=0;
const replay=$('#writingReplay'),timeline=$('#writingTimeline'),timelinePanel=$('#timelinePanel'),position=$('#writingPosition');
const volumeControl=$('#volumeControl'),volumeValue=$('#volumeValue');
function syncVolume(){const percent=Math.round(audio.volume*100);volumeControl.value=String(percent);volumeControl.setAttribute('aria-valuetext',`${percent}%`);volumeValue.textContent=`${percent}%`;}
syncVolume();volumeControl.addEventListener('input',()=>{audio.setVolume(Number(volumeControl.value)/100);syncVolume();wake();});
timeline.max=WRITING_DURATION;
const formatTime=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
let timelineTick=-1,timelineSecond=-1;
function updateTimeline(){
 const tick=Math.floor(lastLineTime*10),second=Math.floor(lastLineTime);
 if(tick!==timelineTick){timeline.value=lastLineTime;timelineTick=tick;}
 if(second!==timelineSecond){position.textContent=`${formatTime(lastLineTime)} / ${formatTime(WRITING_DURATION)}`;timeline.setAttribute('aria-valuetext',`${formatTime(lastLineTime)} из ${formatTime(WRITING_DURATION)}`);timelineSecond=second;}
}
function resetWriting(){character=createCharacterMotion();characterStarted=clock;lastLineTime=0;lineOffset=0;stage.dataset.line='writing';}
function seekWriting(time){
 lineOffset=Math.max(0,Math.min(WRITING_DURATION,Number(time)||0));lastLineTime=lineOffset;
 character=createCharacterMotion();characterStarted=clock;moving=false;last=performance.now();
 stage.dataset.line='writing';wake();updateTimeline();sync();transition();
}
function replayWriting(){resetWriting();moving=true;last=performance.now();updateTimeline();sync();message('Начинает писать на чистом развороте');transition();}
function message(text){status.textContent=text;status.classList.add('show');clearTimeout(statusTimer);statusTimer=setTimeout(()=>status.classList.remove('show'),2600);}
function wake(){const now=performance.now();if(now-lastWake<250)return;lastWake=now;root.classList.remove('resting');clearTimeout(restTimer);restTimer=setTimeout(()=>root.classList.add('resting'),6500);}
function sync(){root.classList.toggle('paused',!moving);$('#motionToggle').setAttribute('aria-pressed',String(moving));$('#motionToggle').setAttribute('aria-label',moving?'Приостановить движение':'Включить движение');$('#motionToggle').title=moving?'Приостановить движение':'Включить движение';$('#soundToggle').setAttribute('aria-pressed',String(playing));$('#soundToggle').setAttribute('aria-label',playing?'Выключить музыку':'Включить музыку');$('#soundToggle').title=playing?'Выключить музыку':'Включить музыку';$('[data-action="music"]').setAttribute('aria-label',playing?'Выключить магнитофон':'Включить магнитофон');stage.dataset.motion=moving?'playing':'paused';$('[data-action="music"]').setAttribute('aria-pressed',String(playing));stage.dataset.music=playing?'on':'off';}
function schedule(){if(!raf&&renderer&&!document.hidden)raf=requestAnimationFrame(frame);}
function transition(){transitionUntil=performance.now()+1800;schedule();}
function frame(now){raf=0;const dt=Math.min(.05,(now-last)/1000||0);last=now;if(moving)clock+=dt;
 const characterTime=clock-characterStarted,pose=character.step(characterTime,moving?dt:0,{transfer:sampleWriting(lastLineTime).transfer,authored:true});
 lastLineTime=Math.min(lineOffset+pose.penTime,WRITING_DURATION);
 if(lastLineTime>=WRITING_DURATION&&!pose.finished)character.finishWriting(characterTime);
 updateTimeline();if(stage.dataset.activity!==pose.activity)stage.dataset.activity=pose.activity;
 musicSpeed+=(Number(playing)-musicSpeed)*(1-Math.exp(-dt*3));if(moving&&musicSpeed>.001)reelAngle+=dt*musicSpeed*.7;
 const camera=cameraFor(root);
 renderer.draw({camera:camera?.sample(now),time:clock,...pose,lineTime:lastLineTime,pet:0,music:reelAngle,tea:0,book:0});
 frameCount++;if(frameCount%30===0)stage.dataset.frame=String(frameCount);
 if(moving||now<transitionUntil||camera?.active(now))schedule();
}
async function action(name){wake();switch(name){case'motion':moving=!moving;last=performance.now();sync();message(moving?'Комната снова оживает':'Движение на паузе');transition();break;
 case'music':if(musicPending)break;musicPending=true;try{await audio.setPlaying(!playing);message(audio.playing?'Cry Me a River · на повторе':'Музыка на паузе');}catch(e){message('Не удалось включить музыку');console.error(e);}finally{playing=audio.playing;musicPending=false;sync();transition();}break;
 }}
$('#motionToggle').addEventListener('click',()=>action('motion'));$('#soundToggle').addEventListener('click',()=>action('music'));$('[data-action="music"]').addEventListener('click',()=>action('music'));
replay.addEventListener('click',()=>{wake();replayWriting();});
timeline.addEventListener('input',()=>seekWriting(timeline.value));
$('#seekFirst').addEventListener('click',()=>seekWriting(0));
$('#seekSlide').addEventListener('click',()=>seekWriting(PAGE_SWITCH_TIME-.35));
$('#seekSecond').addEventListener('click',()=>seekWriting(SECOND_PAGE_TIME));
$('#timelineToggle').addEventListener('click',()=>{timelinePanel.hidden=!timelinePanel.hidden;$('#timelineToggle').setAttribute('aria-expanded',String(!timelinePanel.hidden));wake();});
$('#fullscreenToggle').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await root.requestFullscreen();}catch{message('Разверни окно, чтобы увидеть комнату крупнее');}});
document.addEventListener('fullscreenchange',()=>{$('#fullscreenToggle').setAttribute('aria-pressed',String(Boolean(document.fullscreenElement)));$('#fullscreenToggle').setAttribute('aria-label',document.fullscreenElement?'Выйти из полного экрана':'На весь экран');transition();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{last=performance.now();transition();}});
reduced.addEventListener('change',()=>{moving=!reduced.matches;sync();transition();});
root.addEventListener('camera-change',transition);
root.addEventListener('pointermove',wake,{passive:true});root.addEventListener('keydown',wake);new ResizeObserver(()=>transition()).observe(stage);
sync();wake();try{renderer=await createRenderer(canvas);root.classList.add('ready');stage.dataset.ready='true';transition();}catch(e){stage.dataset.ready='fallback';message('Комната открыта как иллюстрация. Движение недоступно в этом браузере.');console.error(e);moving=false;$('#motionToggle').disabled=true;sync();}
window.addEventListener('pagehide',()=>{audio.dispose();renderer?.dispose?.();cancelAnimationFrame(raf);},{once:true});
