import {ARM,rotate} from './writing-single-line-v9.js';
// The anatomical wrist is inside the cuff, rather than on its visible edge.
export const HAND_PIVOT=[1132,731],PEN_GRIP=[950,721];
const sub=(a,b)=>a.map((v,i)=>v-b[i]),add=(a,b)=>a.map((v,i)=>v+b[i]);
export function handPose(pose){
 const pivot=add(pose.armWrist,rotate(sub(HAND_PIVOT,ARM.wrist),pose.lowerAngle));
 const grip=add(pose.wrist,rotate(sub(PEN_GRIP,ARM.wrist),pose.handAngle));
 const from=sub(PEN_GRIP,HAND_PIVOT),to=sub(grip,pivot);
 const angle=Math.atan2(from[0]*to[1]-from[1]*to[0],from[0]*to[0]+from[1]*to[1]);
 return {pivot,angle};
}
export function handSource(point,pose){
 const {pivot,angle}=pose.handPose,palm=add(HAND_PIVOT,rotate(sub(point,pivot),-angle));
 // Fingers retain their grip on the authored pen. Blend only at their bases;
 // the palm, wrist and hidden pivot keep the new rigid rotation.
 const fingers=add(ARM.wrist,rotate(sub(point,pose.wrist),-pose.handAngle));
 let t=Math.max(0,Math.min(1,(fingers[0]-990)/40));t=t*t*(3-2*t);
 return palm.map((v,i)=>fingers[i]+(v-fingers[i])*t);
}
