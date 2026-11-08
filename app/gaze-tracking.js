import {ARM,PAGE_SWITCH_TIME,SECOND_PAGE_TIME,WRITING_TIMELINE} from './writing.js';
const slide=WRITING_TIMELINE.find(s=>s.phase==='moving-notebook');
const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
export function writingLook(pose){
 const follow=pose.time<PAGE_SWITCH_TIME||pose.time>=SECOND_PAGE_TIME?0:
  pose.time<=slide.end?pose.bookOffset[0]/160:1-smooth(slide.end,SECOND_PAGE_TIME,pose.time);
 // One target through writing, row returns and the notebook slide keeps the
 // eyes continuous. Small projected offsets avoid chasing individual strokes.
 const target=pose.gazeTip;
 return {x:(target[0]-ARM.nib[0])*.015,y:(target[1]-ARM.nib[1])*.021875,head:.0025*follow};
}
// Only the exposed eyeball interior follows the pen. Eyelashes, eyelids,
// glasses and the surrounding face remain in their painted positions.
export const TRACKING_EYES=[
 {center:[891.5,283.3],radius:[15,8],angle:-.35,lid:[880,284.5,-.32]},
 {center:[961.5,252.5],radius:[17,9],angle:-.43,lid:[948,254,-.4667]}
];
export function eyeInterior(point){
 let weight=0;
 for(const e of TRACKING_EYES){const x=point[0]-e.center[0],y=point[1]-e.center[1],c=Math.cos(e.angle),s=Math.sin(e.angle),u=c*x+s*y,v=-s*x+c*y,r=Math.hypot(u/e.radius[0],v/e.radius[1]),lid=point[1]-(e.lid[1]+(point[0]-e.lid[0])*e.lid[2]);weight=Math.max(weight,(1-smooth(.72,1,r))*smooth(.7,2,lid));}
 return weight;
}
export function gazeSource(point,look){const w=eyeInterior(point);return [point[0]-look.x*w,point[1]-look.y*w];}
export const GAZE_TRACKING_GLSL=`float eyeInterior(vec2 p){float weight=0.;
${TRACKING_EYES.map(e=>`{vec2 d=p-vec2(${e.center.map(v=>v.toFixed(4)).join(',')});float u=${Math.cos(e.angle).toFixed(9)}*d.x+${Math.sin(e.angle).toFixed(9)}*d.y;float v=${(-Math.sin(e.angle)).toFixed(9)}*d.x+${Math.cos(e.angle).toFixed(9)}*d.y;float r=length(vec2(u/${e.radius[0].toFixed(1)},v/${e.radius[1].toFixed(1)}));float lid=p.y-(${e.lid[1].toFixed(4)}+(p.x-${e.lid[0].toFixed(1)})*${e.lid[2].toFixed(4)});weight=max(weight,(1.-smoothstep(.72,1.,r))*smoothstep(.7,2.,lid));}`).join('\n')}
return weight;}
vec2 gazeSource(vec2 s,vec2 offset){return s-offset*eyeInterior(s*size)/size;}`;
