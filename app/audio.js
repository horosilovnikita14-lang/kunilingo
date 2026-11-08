const TRACK_URL=new URL('./assets/cry-me-a-river.mp3',import.meta.url).href;
const VOLUME_KEY='quiet-room-music-volume';
const DEFAULT_VOLUME=.35;

export function createSoundscape({onPlaybackChange,onError}={}){
 let media,requested=false,disposed=false,revision=0,volume=DEFAULT_VOLUME;
 try{const saved=localStorage.getItem(VOLUME_KEY);if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
 const playing=()=>Boolean(media&&!media.paused&&!media.ended);
 const changed=()=>{if(!disposed)onPlaybackChange?.(playing());};
 const failed=()=>{requested=false;media.pause();changed();onError?.(new Error('Не удалось воспроизвести музыку'));};
 function init(){
  if(media)return media;
  media=new Audio(TRACK_URL);media.loop=true;media.preload='metadata';media.volume=volume;
  media.addEventListener('playing',changed);media.addEventListener('pause',changed);media.addEventListener('error',failed);
  return media;
 }
 return {
  get playing(){return playing();},
  get volume(){return volume;},
  async setPlaying(value){
   if(disposed)return;
   const ticket=++revision;requested=Boolean(value);
   if(!requested){media?.pause();changed();return;}
   const player=init();
   try{await player.play();if(disposed||!requested)player.pause();else if(ticket===revision)changed();}
   catch(error){if(disposed||ticket!==revision)return;requested=false;player.pause();changed();throw error;}
  },
  setVolume(value){
   if(!Number.isFinite(Number(value)))return;
   volume=Math.max(0,Math.min(1,Number(value)));if(media)media.volume=volume;
   try{localStorage.setItem(VOLUME_KEY,String(volume));}catch{}
  },
  dispose(){
   disposed=true;requested=false;revision++;
   if(media){media.removeEventListener('playing',changed);media.removeEventListener('pause',changed);media.removeEventListener('error',failed);media.pause();media.removeAttribute('src');media.load();}
  }
 };
}
