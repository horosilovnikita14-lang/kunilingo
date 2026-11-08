// Original two-joint motion. Each segment uses rotation and translation only;
// a narrow elbow blend joins the two painted surfaces.
import {ARM} from './writing-single-line-v9.js';
const smooth=(a,b,x)=>{x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x);};
const source=(p,origin,angle,target=origin)=>{const dx=p[0]-target[0],dy=p[1]-target[1],c=Math.cos(angle),s=Math.sin(angle);return [origin[0]+c*dx+s*dy,origin[1]-s*dx+c*dy];};
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t);}
export function sleeveSource(p,pose){
 const wrist=pose.armWrist||pose.wrist,shoulder=pose.shoulder||ARM.shoulder,upper=source(p,ARM.shoulder,pose.upperAngle,shoulder),lower=source(p,ARM.wrist,pose.lowerAngle,wrist);
 const blend=smooth(-24,24,segmentDistance(p,shoulder,pose.elbow)-segmentDistance(p,pose.elbow,wrist));
 return upper.map((v,i)=>v+(lower[i]-v)*blend);
}
export const SLEEVE_GLSL=`float segmentDistance(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
vec2 sleeveSource(vec2 p){
 vec2 shoulder=vec2(shoulderX,shoulderY),elbow=vec2(elbowX,elbowY),wrist=vec2(armWristX,armWristY);
 vec2 upper=vec2(1258.,415.)+rotation(upperAngle)*(p-shoulder);
 vec2 lower=vec2(1118.,735.)+rotation(lowerAngle)*(p-wrist);
 float blend=smoothstep(-24.,24.,segmentDistance(p,shoulder,elbow)-segmentDistance(p,elbow,wrist));
 return mix(upper,lower,blend)/size;
}`;

