// Fixed hidden wrist continuation. It turns with the palm, without stretching.
const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
export function wristUnderlapWeight(x,y){const top=702+(x-1104)*.12;return smooth(1098,1105,x)*(1-smooth(1146,1152,x))*smooth(top,top+1.5,y)*(1-smooth(752.5,754,y));}
export function wristUnderlapSource(x,y){y=Math.max(704,Math.min(750,y));return [Math.min(x-3,1109.7+(y-700)*.33-4),y];}
export const WRIST_UNDERLAP_GLSL=`float wristUnderlapWeight(vec2 p){float top=702.+(p.x-1104.)*.12;return smoothstep(1098.,1105.,p.x)*(1.-smoothstep(1146.,1152.,p.x))*smoothstep(top,top+1.5,p.y)*(1.-smoothstep(752.5,754.,p.y));}
vec2 wristUnderlapSource(vec2 p){float y=clamp(p.y,704.,750.);return vec2(min(p.x-3.,1109.7+(y-700.)*.33-4.),y);}`;
