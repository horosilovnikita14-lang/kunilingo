// One continuous two-page take. Pen, notebook and ink share page coordinates.
import {ARM,ARM_OUTLINE,solveArm,rotate,WRITING_STROKES as GLYPHS} from './writing-single-line-v9.js';
import {handPose} from './hand-rig.js';
import {repairForegroundBook} from './desk-repair.js';
export {ARM,ARM_OUTLINE,solveArm,rotate};
export const WRITING_TEXT='Учебные заметки — две страницы';
export const WRITING_SPEED=.7;
export const NOTEBOOK_SLIDE_SPEED=1.8;
export const INK_CROP={x:532,y:684,width:660,height:156,scale:2};
export const BOOK_OUTLINE='M 542 744 L 751 696 Q 769 690 791 696 L 953 714 L 1156 754 L 1161 770 Q 1177 770 1178 775 L 1177 778 L 957 827 Q 942 831 932 829 L 741 789 Q 730 788 721 788 L 704 784 L 544 754 Q 540 751 542 744 Z';
export const PAGE_POINTS=[[536,742],[772,687],[1182,769],[948,839],[536,759]];
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
// A steady middle with short, cosine-rounded starts and stops. Quintic easing
// across every tiny letter made the wrist repeatedly rush and brake.
const strokeProgress=t=>{t=clamp(t);const edge=.18,peak=1/(1-edge);if(t<edge)return peak*(t/2-edge*Math.sin(Math.PI*t/edge)/(2*Math.PI));if(t>1-edge)return 1-strokeProgress(1-t);return peak*(t-edge/2);};
const mix=(a,b,t)=>a+(b-a)*t,lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const add=(a,b)=>a.map((v,i)=>v+b[i]),dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function pageCoverage(x,y){let cover=1;for(let i=0;i<PAGE_POINTS.length;i++){const a=PAGE_POINTS[i],b=PAGE_POINTS[(i+1)%PAGE_POINTS.length],dx=b[0]-a[0],dy=b[1]-a[1],d=(dx*(y-a[1])-dy*(x-a[0]))/Math.hypot(dx,dy),t=clamp((d+10)/8);cover=Math.min(cover,t*t*(3-2*t));}return cover;}
// X advances toward image-left; tops of letters point toward the viewer.
const toPaper=(anchor,x,y)=>[anchor[0]-x+y*.55,anchor[1]-x*.2-y*.7];
const strokes=[],timeline=[];let clock=0,lastTip=ARM.nib,lastBook=[0,0],lastAngle=0;
function travel(point,book,duration,phase='moving-hand',drag=false){
 // Keep the same endpoints but give a long reach proportionally more time.
 // Quintic easing peaks at 1.875 times its average velocity.
 const speed=drag?38:phase==='between-letters'?18:145;
 if(!drag&&phase!=='between-letters')duration=Math.min(duration,.55);
 duration=Math.max(duration,dist(lastTip,point)*1.875/speed);
 if(phase==='between-letters')duration/=WRITING_SPEED;
 if(phase==='moving-notebook')duration/=NOTEBOOK_SLIDE_SPEED;
 timeline.push({start:clock,end:clock+duration,from:lastTip,to:point,bookFrom:lastBook,bookTo:book,angleFrom:lastAngle,angleTo:0,phase,drag});clock+=duration;lastTip=point;lastBook=book;lastAngle=0;
}
for(let page=0;page<2;page++){
 const book=page===0?[0,0]:[160,16];
 if(page===1){
  const grip=[...lastTip];
  // One continuous slide, with the palm following the same point on the book.
  travel(add(grip,book),book,1.5,'moving-notebook',true);
 }
 for(let row=0;row<5;row++){
  const anchor=page===0?[935+17*row,772-3.8*row]:[765+16*row,746-3.8*row];let cursor=0;
  const words=3+(row%2),wordSizes=Array.from({length:words},(_,w)=>4+((row*3+w*5+page)%4));
  travel(add(anchor,book),book,page===1&&row===0?1.7:1.05,row?'next-line':'moving-hand');
  for(let word=0;word<words;word++){
   for(let letter=0;letter<wordSizes[word];letter++){
    const seed=page*113+row*37+word*11+letter*3,glyph=GLYPHS[seed%GLYPHS.length],origin=glyph.points[0].local,sx=.72+(seed%7)*.045,sy=.82+(seed%5)*.065;
    const pts=glyph.points.map(p=>{const x=(p.local[0]-origin[0])*sx,y=p.local[1]*sy;return {point:toPaper(anchor,cursor+x,y),angle:y*.7/198,length:0};});
    let length=0;pts.forEach((p,i)=>{if(i)length+=dist(p.point,pts[i-1].point);p.length=length;});
    const stroke={page,row,word,seed,points:pts,length,book};strokes.push(stroke);const start=add(pts[0].point,book);
    if(dist(lastTip,start)>.08)travel(start,book,word&&letter===0?.22:.08,'between-letters');
    const duration=(.14+length/20)/WRITING_SPEED;timeline.push({start:clock,end:clock+duration,stroke,phase:'writing'});clock+=duration;
    lastTip=add(pts.at(-1).point,book);lastAngle=pts.at(-1).angle;lastBook=book;cursor+=(glyph.points.at(-1).local[0]-origin[0])*sx+.25;
   }cursor+=3.4;
  }
 }
}
const inkEnds=clock;export const WRITING_DURATION=clock+.8;
export const WRITING_STROKES=strokes;
// Read-only timing metadata for checking playback speed separately from poses.
export const WRITING_TIMELINE=timeline.map(({start,end,phase})=>Object.freeze({start,end,phase}));
export const PAGE_SWITCH_TIME=timeline.find(s=>s.phase==='moving-notebook').start;
export const SECOND_PAGE_TIME=timeline.find(s=>s.stroke?.page===1).start;
export const FIRST_ROW_CHANGE_TIME=timeline.find(s=>s.phase==='next-line').start;
export const KEY_TIMES=[0,PAGE_SWITCH_TIME*.45,PAGE_SWITCH_TIME-.01,PAGE_SWITCH_TIME+.75,SECOND_PAGE_TIME,WRITING_DURATION];
function atLength(stroke,length){let i=1;const pts=stroke.points;while(i<pts.length-1&&pts[i].length<length)i++;const a=pts[i-1],b=pts[i],f=clamp((length-a.length)/(b.length-a.length||1));return {point:lerp(a.point,b.point,f),angle:mix(a.angle,b.angle,f)};}
// Accepted armhalf17 choreography: half the deviation inside each letter.
// Keep this independent from the palm rig; wrist/handAngle below are the pen's
// authored transform, while handPose attaches the palm to the moving cuff.
export const ARM_STROKE_RESPONSE=.5;
function quietArm(wrist,baseline){
 const armWrist=baseline?lerp(baseline,wrist,ARM_STROKE_RESPONSE):wrist;
 return {...solveArm(armWrist),wrist,armWrist,shoulder:ARM.shoulder};
}
export function sampleWriting(time){
 time=clamp(time,0,WRITING_DURATION);let paperTip=ARM.nib,gazeTip=ARM.nib,bookOffset=[0,0],angle=0,lift=0,contact=false,phase='ready',ink=[],page=0,row=0,baseline=null;
 for(const s of timeline){if(time<s.start)break;const t=clamp((time-s.start)/(s.end-s.start));phase=s.phase;
  if(s.stroke){const progress=strokeProgress(t),length=s.stroke.length*progress,p=atLength(s.stroke,length);bookOffset=s.stroke.book;paperTip=add(p.point,bookOffset);angle=p.angle;lift=0;contact=t>0;ink.push({stroke:s.stroke,length});page=s.stroke.page;row=s.stroke.row;
   const first=s.stroke.points[0],last=s.stroke.points.at(-1),tip=add(lerp(first.point,last.point,progress),bookOffset),offset=rotate(ARM.nib.map((v,i)=>v-ARM.wrist[i]),mix(first.angle,last.angle,progress));baseline=tip.map((v,i)=>v-offset[i]);
   // Eyes follow progress across the letter, not each loop or pen lift.
   gazeTip=tip;
  }
  else{const f=ease(t);paperTip=lerp(s.from,s.to,f);gazeTip=paperTip;bookOffset=lerp(s.bookFrom,s.bookTo,f);angle=mix(s.angleFrom,s.angleTo,f);lift=Math.sin(Math.PI*t)**2*(s.phase==='between-letters'?.12:1);contact=false;baseline=null;}
  if(time<s.end)break;
 }
 if(time>=inkEnds){lift=ease((time-inkEnds)/.8);contact=false;phase=time>=WRITING_DURATION?'finished':'lifting';baseline=null;}
 const nib=[paperTip[0],paperTip[1]-lift*4],handAngle=angle+lift*.012;
 const offset=rotate([ARM.nib[0]-ARM.wrist[0],ARM.nib[1]-ARM.wrist[1]],handAngle),wrist=[nib[0]-offset[0],nib[1]-offset[1]];
 const pose={...quietArm(wrist,baseline),time,nib,paperTip,gazeTip,handAngle,lift,contact,ink,phase,bookOffset,page,row,done:time>=WRITING_DURATION,transfer:['moving-hand','moving-notebook','next-line'].includes(phase)};
 return {...pose,handPose:handPose(pose)};
}
export function createInkLayer(bookImage){
 const {x,y,width,height,scale}=INK_CROP,c=document.createElement('canvas'),paper=document.createElement('canvas');c.width=paper.width=width*scale;c.height=paper.height=height*scale;
 const pc=paper.getContext('2d');pc.scale(scale,scale);pc.translate(-x,-y);pc.save();pc.clip(new Path2D(BOOK_OUTLINE));pc.drawImage(bookImage,0,0,1672,941);pc.restore();
 const ctx=c.getContext('2d');let previous=-1;
 return {canvas:c,draw(time){if(time===previous)return false;previous=time;const pose=sampleWriting(time);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(paper,0,0);ctx.save();ctx.scale(scale,scale);ctx.translate(-x,-y);ctx.lineCap='round';ctx.lineJoin='round';
  for(const {stroke,length}of pose.ink){if(length<=0)continue;const pts=stroke.points;ctx.lineWidth=.46+(stroke.seed%5)*.025;ctx.strokeStyle=`rgba(83,65,43,${.43+(stroke.seed%7)*.035})`;ctx.beginPath();ctx.moveTo(...pts[0].point);for(let i=1;i<pts.length;i++){if(pts[i-1].length>=length)break;ctx.lineTo(...(pts[i].length<=length?pts[i].point:atLength(stroke,length).point));}ctx.stroke();}ctx.restore();return true;}};
}
export function createWritingBackground(legacy,desk,repair){const scale=Math.max((legacy.naturalWidth||legacy.width)/1672,(desk.naturalWidth||desk.width)/1672),ds=(desk.naturalWidth||desk.width)/1672;const c=document.createElement('canvas');c.width=Math.round(1672*scale);c.height=Math.round(941*scale);const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.drawImage(legacy,0,0,1672,941);ctx.drawImage(desk,520*ds,320*ds,990*ds,530*ds,520,320,990,530);return repairForegroundBook(c,repair);}
