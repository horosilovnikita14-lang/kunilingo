// Restore the accepted breathing region. Tail motion uses its complete shape;
// the ear has an interior flex with a pinned silhouette, never a moving backdrop.
export const CAT_MASKS=[
 [0,[[347,434],[364,402],[400,380],[453,369],[506,358],[551,369],[581,380],[605,380],[625,395],[651,399],[674,420],[669,447],[644,464],[584,471],[539,454],[490,452],[430,469],[376,461]],3],
 [1,{path:'M 346 441 C 367 433 400 435 431 439 C 470 441 502 450 522 472 C 533 485 537 502 529 516 L 518 529 L 509 530 C 495 524 490 508 484 491 C 472 477 450 472 427 471 C 398 473 370 473 350 465 Z',outline:12},4],
 [2,{path:'M 594 367 L 601 372 L 613 391 L 618 404 L 584 407 L 585 390 L 590 375 Z'},0]
];
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{x=clamp((x-a)/(b-a));return x*x*(3-2*x);};
function turn(p,c,a){const x=p[0]-c[0],y=p[1]-c[1],co=Math.cos(a),si=Math.sin(a);return[c[0]+co*x+si*y,c[1]-si*x+co*y];}

export const EAR_INTERIOR=[[594,367],[601,372],[613,391],[618,404],[584,407],[585,390],[590,375]];
export function earWeight(p){
 let distance=1000;
 for(let i=0;i<EAR_INTERIOR.length;i++){const a=EAR_INTERIOR[i],b=EAR_INTERIOR[(i+1)%EAR_INTERIOR.length],x=b[0]-a[0],y=b[1]-a[1];distance=Math.min(distance,(x*(p[1]-a[1])-y*(p[0]-a[0]))/Math.hypot(x,y));}
 return smooth(2,9,distance);
}
export function earDisplacement(p,amount){const s=turn(p,[602,407],.075*amount),w=earWeight(p);return[(p[0]-s[0])*w,(p[1]-s[1])*w];}

// mask = [original breathing region, complete tail, ear interior].
export function catDisplacement(p,time,pet,earTwitch,mask,tailSwish=0){
 const [x,y]=p,[body,tail]=mask,g=clamp(pet);
 const breath=Math.sin(time*1.8+.8),reach=g+tailSwish*(1-g);
 let dx=body*breath*.35,dy=body*(-breath*1.15-g*1.4);
 let s=turn(p,[372,451],-.014*reach);
 s=turn(s,[475,464],(.003*Math.sin(time*.57)+.002*Math.sin(time*.31+.5)+.095*reach)*smooth(434,490,x));
 dx+=(x-s[0])*tail;dy+=(y-s[1])*tail;
 // Sample within the already-breathing cat, so the fold stays attached.
 const ear=earDisplacement([x-dx,y-dy],earTwitch*(1-g)+.3*g);
 dx+=ear[0];dy+=ear[1];
 return[dx,dy];
}

export const CAT_GLSL=`
vec2 catTurn(vec2 p,vec2 c,float a){float co=cos(a),si=sin(a);vec2 v=p-c;return c+vec2(co*v.x+si*v.y,-si*v.x+co*v.y);}
float catEarEdge(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return(v.x*(p.y-a.y)-v.y*(p.x-a.x))/length(v);}
float catEarWeight(vec2 p){float distance=1000.;
 ${EAR_INTERIOR.map((a,i)=>{const b=EAR_INTERIOR[(i+1)%EAR_INTERIOR.length];return `distance=min(distance,catEarEdge(p,vec2(${a[0]}.,${a[1]}.),vec2(${b[0]}.,${b[1]}.)));`;}).join('\n ')}
 return smoothstep(2.,9.,distance);
}
vec2 catDisplacement(vec2 p,vec3 mask,float t,float touch,float ear,float swish){
 float g=clamp(touch,0.,1.),breath=sin(t*1.8+.8),reach=g+swish*(1.-g);
 vec2 d=mask.r*vec2(breath*.35,-breath*1.15-g*1.4);
 vec2 s=catTurn(p,vec2(372.,451.),-.014*reach);
 s=catTurn(s,vec2(475.,464.),(.003*sin(t*.57)+.002*sin(t*.31+.5)+.095*reach)*smoothstep(434.,490.,p.x));
 d+=(p-s)*mask.g;
 vec2 local=p-d;s=catTurn(local,vec2(602.,407.),.075*(ear*(1.-g)+.3*g));
 d+=(local-s)*catEarWeight(local);
 return d;
}`;
