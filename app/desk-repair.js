// Only the removed foreground book is taken from the edited plate. The
// character, furnishings, postcards and cookie bowl retain their source pixels.
import {ARM_OUTLINE} from './writing-single-line-v9.js';
export function repairForegroundBook(source,repair){
 const scale=Math.max((source.naturalWidth||source.width)/1672,repair?(repair.naturalWidth||repair.width)/1672:1);
 const c=document.createElement('canvas');c.width=Math.round(1672*scale);c.height=Math.round(941*scale);const ctx=c.getContext('2d');ctx.drawImage(source,0,0,c.width,c.height);if(!repair)return c;
 const patch=document.createElement('canvas');patch.width=c.width;patch.height=c.height;const p=patch.getContext('2d');
 p.scale(scale,scale);
 p.fillStyle='#fff';p.filter='blur(2px)';
 p.fill(new Path2D('M 970 828 L 1240 793 L 1395 803 L 1650 870 L 1690 917 L 1690 960 L 1020 960 L 1029 916 L 1018 878 L 970 856 Z'));
 // Keep the foreground bowl and cookies in front of the repaired tabletop.
 p.globalCompositeOperation='destination-out';p.filter='blur(1px)';
 p.fill(new Path2D('M 790 863 L 851 855 L 870 843 L 892 834 Q 904 826 922 829 L 939 837 L 955 845 L 975 854 L 993 865 Q 1041 872 1058 889 Q 1055 909 1035 930 L 1025 960 L 790 960 Z'));
 // Source cloth is sampled again when the arm moves, so keep it untouched.
 p.filter='none';const sleeve=new Path2D(ARM_OUTLINE);p.fill(sleeve);p.strokeStyle='#fff';p.lineWidth=6;p.lineJoin='round';p.stroke(sleeve);
 p.filter='none';p.globalCompositeOperation='source-in';p.drawImage(repair,0,0,1672,941);ctx.drawImage(patch,0,0);return c;
}
