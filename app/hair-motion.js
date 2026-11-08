// Interior curls from the original painting. Compact C2 support gives zero
// displacement and zero velocity at every patch edge: no moving cutouts.
export const HAIR_CURLS=Object.freeze([
 {center:[766,284],radius:[31,49],amplitude:[1.25,.38],frequency:.81,phase:.4},
 {center:[1145,208],radius:[26,43],amplitude:[.86,.26],frequency:.69,phase:2.1},
 {center:[990,100],radius:[45,26],amplitude:[.34,.24],frequency:.54,phase:1.2}
]);
export function hairDisplacement([x,y],time){
 let dx=0,dy=0;
 for(const c of HAIR_CURLS){
  const r2=((x-c.center[0])/c.radius[0])**2+((y-c.center[1])/c.radius[1])**2;
  const support=Math.max(0,1-r2)**3;
  // Two slow harmonics make an unequal, restrained breathing-like motion.
  const wave=.82*Math.sin(time*c.frequency+c.phase)+.18*Math.sin(time*c.frequency*.47+c.phase*1.7);
  dx+=support*c.amplitude[0]*wave;
  dy+=support*c.amplitude[1]*Math.sin(time*c.frequency*.73+c.phase-.6);
 }
 return [dx,dy];
}
const f=n=>Number(n).toFixed(9);
export const HAIR_GLSL=`vec2 hairDisplacement(vec2 p,float t){vec2 movement=vec2(0.);
${HAIR_CURLS.map(c=>`{vec2 local=(p-vec2(${c.center.map(f)}))/vec2(${c.radius.map(f)});float support=pow(max(0.,1.-dot(local,local)),3.);float wave=.82*sin(t*${f(c.frequency)}+${f(c.phase)})+.18*sin(t*${f(c.frequency*.47)}+${f(c.phase*1.7)});movement+=support*vec2(${f(c.amplitude[0])}*wave,${f(c.amplitude[1])}*sin(t*${f(c.frequency*.73)}+${f(c.phase-.6)}));}`).join('\n')}
return movement;}`;
