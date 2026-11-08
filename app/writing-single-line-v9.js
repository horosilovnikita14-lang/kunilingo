// One authored handwritten line. The pen and the ink use exactly the same
// arc-length samples; no independent text reveal or looping wrist oscillator.
export const WRITING_TEXT='не спеши';
export const INK_CROP={x:896,y:736,width:128,height:48,scale:4};
// The whole right page, in the original painting's perspective. This replaces
// a local rectangular repair among pre-existing letters with one paper surface.
export const PAGE_POINTS=[[733,770],[952,716],[1168,752],[1170,773],[944,815]];
export function pageCoverage(x,y){let cover=1;for(let i=0;i<PAGE_POINTS.length;i++){const a=PAGE_POINTS[i],b=PAGE_POINTS[(i+1)%PAGE_POINTS.length],dx=b[0]-a[0],dy=b[1]-a[1],d=(dx*(y-a[1])-dy*(x-a[0]))/Math.hypot(dx,dy),t=Math.max(0,Math.min(1,(d+1)/2));cover=Math.min(cover,t*t*(3-2*t));}return cover;}
export const ARM={shoulder:[1258,415],elbow:[1405,718],wrist:[1118,735],nib:[920.2,758]};
export const ARM_OUTLINE='M 1227 343 Q 1253 343 1278 360 Q 1300 371 1310 399 Q 1325 432 1346 468 Q 1365 501 1387 535 Q 1406 559 1419 599 Q 1437 607 1449 633 Q 1462 654 1472 683 Q 1483 708 1478 731 Q 1469 769 1437 798 Q 1396 793 1350 789 Q 1285 790 1220 783 Q 1181 781 1140 771 Q 1113 776 1102 762 L 1081 709 Q 1066 704 1071 691 Q 1075 679 1095 678 Q 1132 679 1154 666 Q 1184 648 1227 639 Q 1240 626 1226 598 Q 1207 566 1201 530 Q 1190 486 1192 438 Q 1191 396 1204 370 Q 1214 352 1227 343 Z';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,t)=>a+(b-a)*t;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const rotate=(p,a)=>[p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];
const paper=([u,v])=>[ARM.nib[0]+u*.95-v*.9,ARM.nib[1]+u*.95*.17+v];

// Small, connected cursive strokes, drawn in page coordinates. These are
// actual pen paths, not outlines of a font filled in from left to right.
const glyphs={
 'н':{advance:4.1,start:[0,0],curves:[[.4,-.7,.8,-2.5,1,-3.6],[.7,-2.6,.2,-.8,.2,0],[1,-1.3,2,-1.7,2.9,-1.6],[3,-2.4,3.3,-3.2,3.5,-3.5],[3.1,-2.3,2.3,.6,4.1,-.1]]},
 'е':{advance:3.7,start:[0,0],curves:[[.7,-.3,3.7,-1.5,2.6,-2.7],[1.7,-3.8,-.2,-1.9,.4,-.5],[.9,.6,2.4,.3,3.7,-.1]]},
 'с':{advance:3.4,start:[0,0],curves:[[.8,-.8,1.7,-3.9,2.7,-2.7],[3,-2.4,2.4,-2.2,2.3,-2.5],[1,-3.3,-.4,-.6,.7,-.1],[1.4,.4,2.5,.2,3.4,-.1]]},
 'п':{advance:4.4,start:[0,0],curves:[[.6,-.7,.8,-2.2,1,-3.1],[.7,-2.1,.4,-.8,.3,0],[1.2,-1.6,2.2,-3.6,3.1,-2.7],[3.7,-1.9,1.8,.7,4.4,-.1]]},
 'ш':{advance:6.5,start:[0,0],curves:[[.6,-.6,.8,-2.3,1,-3],[.7,-1.9,-.1,.5,1.5,.1],[2.1,-.3,2.5,-2.2,2.9,-3],[2.6,-2,1.7,.5,3.3,.1],[3.9,-.3,4.3,-2.2,4.7,-3],[4.4,-1.9,3.6,.8,6.5,-.1]]},
 'и':{advance:4.6,start:[0,0],curves:[[.6,-.7,.9,-2.5,1.1,-3.1],[.8,-1.9,-.1,.7,1.5,.1],[2.3,-.2,3.1,-2.1,3.4,-3.1],[3,-1.6,2.1,.7,4.6,-.1]]}
};
const strokes=[];let cursor=0;
for(const letter of WRITING_TEXT){
 if(letter===' '){cursor+=2.8;continue;}
 const glyph=glyphs[letter],local=[glyph.start];let a=glyph.start;
 for(const c of glyph.curves){for(let i=1;i<=20;i++){const t=i/20,s=1-t;local.push([s*s*s*a[0]+3*s*s*t*c[0]+3*s*t*t*c[2]+t*t*t*c[4],s*s*s*a[1]+3*s*s*t*c[1]+3*s*t*t*c[3]+t*t*t*c[5]]);}a=[c[4],c[5]];}
 const points=local.map(([x,y])=>({local:[cursor+x,y],point:paper([cursor+x,y])}));
 let length=0;points.forEach((p,i)=>{if(i)length+=distance(p.point,points[i-1].point);p.length=length;});
 strokes.push({letter,points,length});cursor+=glyph.advance;
}
export const WRITING_STROKES=strokes;
const segments=[];let clock=.4,previous=strokes[0].points[0];
strokes.forEach((stroke,i)=>{
 const start=stroke.points[0],gap=i===2?.48:.18;
 if(i){segments.push({start:clock,end:clock+gap,from:previous,to:start,lift:true});clock+=gap;}
 const duration=.25+stroke.length/10;
 segments.push({start:clock,end:clock+duration,stroke,index:i});clock+=duration;previous=stroke.points.at(-1);
});
export const WRITING_DURATION=clock+.7;
function atLength(stroke,length){
 const points=stroke.points;let i=1;while(i<points.length-1&&points[i].length<length)i++;
 const a=points[i-1],b=points[i],f=clamp((length-a.length)/(b.length-a.length||1));
 return {point:[mix(a.point[0],b.point[0],f),mix(a.point[1],b.point[1],f)],local:[mix(a.local[0],b.local[0],f),mix(a.local[1],b.local[1],f)]};
}
export function solveArm(wrist){
 const [sx,sy]=ARM.shoulder,upper=distance(ARM.shoulder,ARM.elbow),lower=distance(ARM.elbow,ARM.wrist);
 const dx=wrist[0]-sx,dy=wrist[1]-sy,d=Math.hypot(dx,dy),along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const elbow=[sx+along*dx/d+height*dy/d,sy+along*dy/d-height*dx/d];
 const upperAngle=Math.atan2(elbow[1]-sy,elbow[0]-sx)-Math.atan2(ARM.elbow[1]-sy,ARM.elbow[0]-sx);
 const lowerAngle=Math.atan2(wrist[1]-elbow[1],wrist[0]-elbow[0])-Math.atan2(ARM.wrist[1]-ARM.elbow[1],ARM.wrist[0]-ARM.elbow[0]);
 return {wrist,elbow,upperAngle,lowerAngle};
}
export function sampleWriting(time){
 time=clamp(time,0,WRITING_DURATION);let current=strokes[0].points[0],lift=0,contact=false,phase='ready',ink=[];
 for(const segment of segments){
  if(time<segment.start)break;
  const t=clamp((time-segment.start)/(segment.end-segment.start));
  if(segment.lift){const f=ease(t);current={point:segment.from.point.map((p,i)=>mix(p,segment.to.point[i],f)),local:segment.from.local.map((p,i)=>mix(p,segment.to.local[i],f))};lift=Math.sin(Math.PI*t)**2*(segment.end-segment.start>.3?.75:.28);contact=false;phase='between-letters';}
  else{const length=segment.stroke.length*ease(t);current=atLength(segment.stroke,length);ink.push({stroke:segment.stroke,length});lift=0;contact=t>0;phase='writing';}
  if(time<segment.end)break;
 }
 if(time>=clock){lift=ease((time-clock)/.7);contact=false;phase=time>=WRITING_DURATION?'finished':'lifting';}
 const paperTip=current.point,nib=[paperTip[0],paperTip[1]-lift*2.4];
 // Finger/wrist rotation handles the small up/down letter strokes. The slower
 // progression along the page is carried by an articulated sleeve and elbow.
 const handAngle=-current.local[1]/198+lift*.006;
 const offset=rotate([ARM.nib[0]-ARM.wrist[0],ARM.nib[1]-ARM.wrist[1]],handAngle);
 const wrist=[nib[0]-offset[0],nib[1]-offset[1]];
 return {...solveArm(wrist),time,nib,paperTip,handAngle,lift,contact,ink,phase,done:time>=WRITING_DURATION};
}
export function createInkLayer(){
 const {x,y,width,height,scale}=INK_CROP,c=document.createElement('canvas');c.width=width*scale;c.height=height*scale;const ctx=c.getContext('2d');let previous=-1;
 return {canvas:c,draw(time){if(time===previous)return false;previous=time;const pose=sampleWriting(time);ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.scale(scale,scale);ctx.translate(-x,-y);ctx.lineCap='round';ctx.lineJoin='round';
  for(const {stroke,length}of pose.ink){if(length<=0)continue;const pts=stroke.points;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];if(a.length>=length)break;const end=b.length<=length?b.point:atLength(stroke,length).point;ctx.strokeStyle='rgba(65,51,34,.82)';ctx.lineWidth=.7+.09*Math.sin(i*.22);ctx.beginPath();ctx.moveTo(...a.point);ctx.lineTo(...end);ctx.stroke();}}
  ctx.restore();return true;
 }};
}
export function createWritingBackground(legacy,arm,clean){
 const c=document.createElement('canvas');c.width=1672;c.height=941;const ctx=c.getContext('2d');ctx.drawImage(legacy,0,0);
 ctx.drawImage(arm,1050,320,460,500,1050,320,460,500);
 // Paste the complete paper into the underpainting. The shader's page matte
 // follows its edges; original binding, page thickness and table stay outside.
 ctx.save();ctx.beginPath();PAGE_POINTS.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();ctx.drawImage(clean,0,0);ctx.restore();return c;
}
