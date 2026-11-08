// Absolute scene time makes these details pause and resume with the room.
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return clamp(x*x*x*(x*(x*6-15)+10));};
const pulse=t=>t<0||t>=1.2?0:t<.34?ease(t/.34):1-ease((t-.34)/.86);
// One lazy sweep, a smaller return, then a long still interval.
const swish=t=>t<0||t>=5?0:t<1.2?ease(t/1.2):t<3.2?1-1.4*ease((t-1.2)/2):-.4*(1-ease((t-3.2)/1.8));
export function sampleAmbient(time){
 const t=Math.max(0,Number(time)||0),cycle=t%79;
 const earTwitch=pulse(cycle-3.2)+.82*pulse(cycle-21.7)+.95*pulse(cycle-45.1)+.88*pulse(cycle-66.5);
 return {
  earTwitch,
  tailSwish:swish(t%67-6)+.86*swish(t%67-28)+.94*swish(t%67-49),
  windDrift:5.5*Math.sin(t*.17)+2*(Math.sin(t*.067+.4)-Math.sin(.4)),
  steamDrift:2.4*Math.sin(t*.37)+1.2*Math.sin(t*.19+.6),
  steamPulse:.9+.1*Math.sin(t*.31)+.05*Math.sin(t*.53+2)
 };
}
