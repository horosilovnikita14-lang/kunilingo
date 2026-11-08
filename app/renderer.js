// All character surfaces come from the approved painting. Local influence masks
// deform only the corresponding regions; no frame-wide scaling or camera motion.
import {EYE_CROP,createEyeAtlas} from './eye-poses.js';
import {ARM_OUTLINE,INK_CROP,PAGE_POINTS,sampleWriting,createInkLayer,createWritingBackground} from './writing.js';
import {SLEEVE_GLSL} from './sleeve-rig.js';
import {refineSleeveMatte} from './sleeve-matte.js';
import {WRIST_UNDERLAP_GLSL} from './wrist-underlap.js';
import {HAND_PIVOT} from './hand-rig.js';
import {writingLook,GAZE_TRACKING_GLSL} from './gaze-tracking.js';
import {HAIR_GLSL} from './hair-motion.js';
import {sampleAmbient} from './ambient-motion.js';
import {CAT_MASKS,CAT_GLSL} from './cat-motion.js';
import {detailPlate,renderDimensions} from './quality44.js';
import {createCourtyardAtlas} from './courtyard45.js';
import {observeRenderSize,notebookVisible} from './renderer-performance.js';
const W=1672,H=941;
const VERT=`attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}`;
const FRAG=`precision highp float;
uniform vec4 camera,courtyardRegion;uniform vec2 detailAtlasSize,eyeAtlasSize;uniform float yardQuality;
varying vec2 uv;uniform sampler2D picture,eyePoses,writingBackground,map0,map1,map2,map3,inkTexture;uniform float time,blink,pet,penTime,thinking,music,tea,book,gaze;
uniform float lineActive,lineAngle,wristX,wristY,armWristX,armWristY,elbowX,elbowY,shoulderX,shoulderY,upperAngle,lowerAngle,bookX,bookY;
uniform float palmAngle,handPivotX,handPivotY;
uniform float followX,followY,followHead;
uniform float earTwitch,tailSwish,windDrift,steamDrift,steamPulse;
const vec2 size=vec2(1672.,941.);
vec4 paint(vec2 s){
 vec2 p=s*size;
 // Flex only the middle of a few leaves, with zero displacement at their rim.
 // Neither the shelf, stems nor the surrounding wall gets carried along.
 float leaf=pow(max(0.,1.-length((p-vec2(1457.,202.))/vec2(8.,16.))),2.);
 leaf+=pow(max(0.,1.-length((p-vec2(1888.,36.))/vec2(10.,19.))),2.);
 leaf+=pow(max(0.,1.-length((p-vec2(1990.,335.))/vec2(10.,18.))),2.);
 p.x-=leaf*(sin(time*.71)*.38+sin(time*.43+1.7)*.19);
 return texture2D(picture,(p+vec2(0.,130.))/vec2(2220.,1071.));
}
vec3 eyePose(vec2 s,float pose){
 vec2 local=clamp(s*size-vec2(${EYE_CROP.x}.,${EYE_CROP.y}.),vec2(.5),vec2(${EYE_CROP.width-.5},${EYE_CROP.height-.5}));
 return texture2D(eyePoses,vec2((local.x+pose*${EYE_CROP.width}.)/${EYE_CROP.width*3}.,local.y/${EYE_CROP.height}.)*eyeAtlasSize/detailAtlasSize).rgb;
}
float gauss(vec2 p,vec2 c,vec2 s){vec2 d=(p-c)/s;return exp(-dot(d,d)*2.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rotation(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float paperEdge(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return smoothstep(-10.,-2.,(d.x*(p.y-a.y)-d.y*(p.x-a.x))/length(d));}
float paperCoverage(vec2 p){float cover=1.;
 ${PAGE_POINTS.map((a,i)=>{const b=PAGE_POINTS[(i+1)%PAGE_POINTS.length];return `cover=min(cover,paperEdge(p,vec2(${a[0]}.,${a[1]}.),vec2(${b[0]}.,${b[1]}.)));`;}).join('\n ')}
 return cover;
}
${SLEEVE_GLSL}
${WRIST_UNDERLAP_GLSL}
${GAZE_TRACKING_GLSL}
${HAIR_GLSL}
${CAT_GLSL}
float penMaskAt(vec2 s){return texture2D(map3,s).r*(1.-step(1055.,s.x*size.x));}
float palmMaskAt(vec2 s){return texture2D(map0,s).b*(1.-penMaskAt(s));}
// Rotate in the cassette's own plane, then project back to the painted ellipse.
// The rim, centre spindle and surrounding cassette remain stationary.
vec3 reel(vec2 p,vec2 c,vec2 axisX,vec2 axisY,float a){
 vec2 d=p-c;float det=axisX.x*axisY.y-axisY.x*axisX.y;
 vec2 local=vec2(axisY.y*d.x-axisY.x*d.y,-axisX.y*d.x+axisX.x*d.y)/det;
 float r=length(local),mask=smoothstep(.38,.46,r)*(1.-smoothstep(.88,.98,r));
 vec2 turned=rotation(a)*local;
 return vec3(c+axisX*turned.x+axisY*turned.y,mask);
}
float handwriting(float t){
 // A small wrist arc: constant bone length and no translation of the forearm.
 // All frequencies meet at the same position and velocity after 8.4 seconds.
 float phase=t*6.28318530718/8.4;
 return sin(phase*7.)*.006+sin(phase*13.)*.0025+sin(phase)*.004;
}
void main(){
 vec2 q=(camera.xy+vec2(uv.x,1.-uv.y)*camera.zw)/size,p=q*size;
 if(p.x>1672.||p.y<0.){gl_FragColor=paint(q);return;}
 vec3 m=texture2D(map0,q).rgb,n=texture2D(map1,q).rgb,k=texture2D(map2,q).rgb;
 float breath=sin(time*1.18);
 vec2 d=vec2(0.);
 // Head pivots very slightly around the supported cheek, with eased pauses.
 vec2 headAnchor=vec2(924.,340.);
 float headAngle=sin(time*.48)*.0012+breath*.0008+thinking*.004+(gaze<.5?followHead:0.);
 d+=m.r*(p-(headAnchor+rotation(headAngle)*(p-headAnchor)));
 // Only small curls inside the original hair mass move. The silhouette,
 // face, neck and the room have zero additional hair displacement.
 d+=hairDisplacement(p,time);
 // Breathing stays within the torso. Desk-supported arms and scarf are held.
 float chest=m.g*(gauss(p,vec2(1233.,451.),vec2(100.,125.))+gauss(p,vec2(985.,568.),vec2(57.,94.)))*(1.-smoothstep(610.,650.,p.y));
 d+=vec2(.13,-.65)*breath*chest;
 d+=catDisplacement(p,n,time,pet,earTwitch,tailSwish);
 // Character motion is composed independently of the notebook choreography.
 vec2 s=(p-d)/size;
 // Read down into the notebook; a deliberate blink conceals each change of
 // attention. Eye drawings follow the same head coordinates as the glasses.
 float lid=blink;
 vec3 original=paint(s).rgb;
 vec2 tracking=vec2(followX,followY)*(1.-smoothstep(.25,.85,lid));
 vec3 openEye=gaze>.5?original:eyePose(gazeSource(s,tracking),0.);
 vec3 eye=lid<.55?mix(openEye,eyePose(s,1.),smoothstep(0.,.55,lid)):mix(eyePose(s,1.),eyePose(s,2.),smoothstep(.55,1.,lid));
 vec3 color=mix(original,eye,texture2D(map2,s).g);
 // The hand and sleeve use the original painted surfaces. The clean plate
 // restores the areas they uncover; the wrist and whole pen rotate together.
 // Erasure has a separate, wider matte: it must remove the complete OLD
 // contour, including anti-aliasing and both metal ends of the pen.
 float eraseHand=k.b;
 float eraseArm=lineActive*texture2D(map3,q).b;
 float page=lineActive*paperCoverage(p);
 color=mix(color,texture2D(writingBackground,q).rgb,max(max(eraseHand,eraseArm),page));
 if(lineActive>.5){vec2 inkUV=(p-vec2(bookX,bookY)-vec2(${INK_CROP.x}.,${INK_CROP.y}.))/vec2(${INK_CROP.width}.,${INK_CROP.height}.);vec4 ink=texture2D(inkTexture,inkUV);float inside=step(0.,inkUV.x)*step(inkUV.x,1.)*step(0.,inkUV.y)*step(inkUV.y,1.);float bookShadow=texture2D(inkTexture,inkUV-vec2(0.,2.)/vec2(${INK_CROP.width}.,${INK_CROP.height}.)).a;color*=1.-bookShadow*inside*.15;color=mix(color,ink.rgb,ink.a*inside);}
 vec2 wrist=vec2(1118.,735.);
 vec2 penUV=(wrist+rotation(lineActive>.5?lineAngle:handwriting(penTime))*(p-(lineActive>.5?vec2(wristX,wristY):wrist)))/size;
 vec2 handUV=lineActive>.5?(vec2(${HAND_PIVOT[0]}.,${HAND_PIVOT[1]}.)+rotation(palmAngle)*(p-vec2(handPivotX,handPivotY)))/size:penUV;
 handUV=mix(penUV,handUV,smoothstep(990.,1030.,penUV.x*size.x));
 // Rebuild the soft contact shadow under the moving hand, instead of carrying
 // a bright strip of notebook paper along with the cutout.
 vec2 shadowUV=handUV-vec2(0.,2.0)/size;
 float shadow=palmMaskAt(shadowUV)*.4;
 shadow+=(palmMaskAt(shadowUV+vec2(1.4,0.)/size)+palmMaskAt(shadowUV-vec2(1.4,0.)/size)+palmMaskAt(shadowUV+vec2(0.,1.4)/size)+palmMaskAt(shadowUV-vec2(0.,1.4)/size))*.15;
 color*=1.-shadow*.23*smoothstep(700.,725.,p.y);
 if(lineActive>.5){float sleeveShadow=texture2D(map3,sleeveSource(p-vec2(0.,2.))).g;color*=1.-sleeveShadow*.14*smoothstep(700.,755.,p.y);}
 vec2 paddingUV=wristUnderlapSource(handUV*size)/size;
 float padding=lineActive*wristUnderlapWeight(handUV*size);
 color=mix(color,paint(penUV).rgb,penMaskAt(penUV));
 color=mix(color,paint(handUV).rgb,palmMaskAt(handUV));
 color=mix(color,paint(paddingUV).rgb,padding);
 // The cuff occludes the wrist and its fixed underlap. Restore it last so
 // background erasure, the hand layer and its shadow cannot cut into the knit.
 if(lineActive>.5){vec2 armUV=sleeveSource(p);color=mix(color,paint(armUV).rgb,texture2D(map3,armUV).g);}
 else color=mix(color,paint(q).rgb,texture2D(map3,q).r*step(1055.,p.x));
 if(music>.001){
  vec3 left=reel(p,vec2(206.1,582.1),vec2(21.5,-2.2),vec2(1.6,25.1),music);
  vec3 right=reel(p,vec2(276.6,574.5),vec2(19.6,-2.0),vec2(-.8,24.6),music*.96);
  color=mix(color,paint(left.xy/size).rgb,left.z);
  color=mix(color,paint(right.xy/size).rgb,right.z);
 }
 // The same detailed outdoor plate is visible from the room and throughout
 // every camera move. Only the original glass mask receives it.
 if(k.r>0.){
 float yardY=p.y<=345.?p.y:345.+20.*(1.-exp(-(p.y-345.)/20.));
 vec2 yardUV=(vec2(p.x,yardY)-vec2(294.,-25.))/vec2(500.,390.);
 vec2 yardPixel=courtyardRegion.xy+clamp(yardUV,vec2(0.),vec2(1.))*(courtyardRegion.zw-1.)+.5;
 color=mix(color,texture2D(eyePoses,yardPixel/detailAtlasSize).rgb,smoothstep(.96,1.,k.r)*yardQuality);
 // Three independent particle scales, clipped by a hand-traced glass mask.
 float snow=0.;for(int i=0;i<3;i++){float z=float(i);float cell=42.+z*28.;vec2 sp=p+vec2(time*(3.+z*1.5)+windDrift*(1.+z*.1),-time*(12.+z*10.));vec2 id=floor(sp/cell);vec2 f=fract(sp/cell);vec2 seed=vec2(hash(id+z),hash(id+13.+z));float r=(.65+z*.4)/cell;float flake=1.-smoothstep(r*.3,r,length(f-(.16+seed*.68)));snow+=flake*(.26+z*.12);}
 color=mix(color,vec3(.84,.9,1.),min(.7,snow*k.r));
 }
 // Lighting is exactly the constant lighting of the approved painting.
 // Translucent, slowly changing steam rises only above the illustrated cup.
 float steam=0.;if(p.y>=501.&&p.y<=604.){for(int i=0;i<3;i++){float f=float(i);float y=(604.-p.y)/103.;float x=431.+f*13.+sin(y*5.-time*.74+f*2.)*(7.+y*7.)+steamDrift*y;float a=exp(-pow((p.x-x)/3.3,2.))*smoothstep(0.,.17,y)*(1.-smoothstep(.5,1.,y));float wisp=.84+.16*sin(y*6.-time*.65+f*2.3);steam+=a*wisp*steamPulse*step(0.,y)*step(y,1.);}}
 color=mix(color,vec3(.98,.9,.73),clamp(steam*(.07+tea*.07),0.,.25));
 // Sparse, softly focused motes remain visible at the normal room scale.
 // Outside this padded envelope every mote's smoothstep contribution is zero.
 float dust=0.;if(p.x>=62.&&p.x<=523.&&p.y>=321.&&p.y<=649.){for(int i=0;i<22;i++){
  float f=float(i),seed=hash(vec2(f,9.)),phase=fract(seed+time*(.006+hash(vec2(f,4.))*.006));
  vec2 c=vec2(80.+hash(vec2(f,7.))*425.+sin(time*.19+f)*14.,645.-phase*320.);
  float radius=mix(1.2,2.0,seed),fade=smoothstep(0.,.12,phase)*(1.-smoothstep(.85,1.,phase));
  dust+=(1.-smoothstep(.25,radius,distance(p,c)))*fade*(.28+seed*.16);
 }}
 color=mix(color,vec3(1.,.88,.62),min(dust,.55));
 gl_FragColor=vec4(color,1.);
}`;

// Traced at source resolution. Curves retain the knuckles rather than cutting
// across them with a coarse polygon. All three pieces share the wrist transform.
const handOutline={path:'M 925.1 732.4 C 924.3 729.4 927.0 724.0 931.3 716.2 L 938.8 703.4 C 940.3 699.7 938.5 695.1 940.0 691.2 Q 942.2 687.1 948.9 688.7 L 1001.7 669.1 Q 1004.1 668.0 1006.9 669.5 C 1035.0 682.9 1072.6 701.5 1093.0 701.0 L 1109.7 699.8 L 1111.8 705.1 L 1115.0 709.8 L 1114.6 713.1 L 1118.1 717.7 L 1118.0 722.4 L 1121.5 728.6 L 1125.0 731.4 L 1122.5 733.2 L 1123.0 737.8 L 1124.3 740.6 L 1123.8 743.8 L 1126.6 748.6 L 1125.5 751.7 L 1097.1 754.4 C 1081.5 757.5 1077.2 761.8 1061.0 763.5 L 1023.0 764.3 Q 1014.0 762.7 1005.1 765.2 Q 992.0 767.0 986.7 764.2 Q 984.0 761.8 982.0 758.2 Q 973.0 762.5 967.7 757.3 Q 963.6 753.6 962.5 748.8 Q 958.9 754.1 953.9 752.8 Q 945.8 751.3 944.5 742.5 Q 942.7 735.8 946.9 724.8 Q 940.6 734.7 933.9 737.0 Q 927.7 739.0 925.1 732.4 Z'};
const penTop={path:'M 978.7 677.5 L 980.0 673.9 L 997.2 652.0 L 998.5 649.9 L 1022.8 621.4 L 1025.6 621.3 L 1028.4 617.8 Q 1030.5 615.9 1032.0 616.9 L 1035.3 619.9 L 1032.7 624.5 L 1030.0 626.0 L 1033.3 628.9 Q 1034.6 630.7 1032.9 633.0 L 1009.8 660.3 L 994.5 672.2 Z'};
const penNib={path:'M 920.2 758.0 L 922.0 752.9 L 928.8 740.6 L 932.8 734.1 L 948.1 724.0 L 945.3 735.6 L 933.6 748.8 L 927.0 753.6 Z'};
function mask(channels){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalCompositeOperation='lighter';
 for(const [channel,shape,blur=2] of channels){c.save();c.fillStyle=['#f00','#0f0','#00f'][channel];c.filter=`blur(${blur}px)`;if(shape.path){const path=new Path2D(shape.path);c.fill(path);if(shape.outline){c.strokeStyle=c.fillStyle;c.lineJoin='round';c.lineWidth=shape.outline;c.stroke(path);}}else{c.beginPath();if(shape.ellipse){const [x,y,rx,ry,angle=0]=shape.ellipse;c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);}else{shape.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}c.fill();}c.restore();}return canvas;
}
export function masks(sourceImage){const result=[
 mask([
 [0,[[725,187],[747,103],[824,60],[904,38],[1026,47],[1115,89],[1173,149],[1189,220],[1155,272],[1104,307],[1031,318],[973,365],[931,380],[875,358],[827,326],[764,363],[719,330],[714,274]],5],
 [1,[[768,441],[823,485],[887,417],[956,396],[1044,345],[1157,334],[1260,345],[1331,420],[1427,621],[1466,722],[1452,780],[1140,776],[1120,688],[971,690],[909,708],[761,706],[686,682],[680,605],[711,497]],8],
 // Hand silhouette and both visible sections of the pen share one transform.
 [2,handOutline,.2],
 [2,penTop,.15],
 [2,penNib,.15]
 ]),
 mask(CAT_MASKS),
 mask([
 [0,[[297,0],[793,0],[793,61],[751,99],[728,145],[711,190],[704,237],[716,280],[728,313],[750,346],[729,370],[697,397],[679,410],[674,387],[650,397],[615,378],[595,380],[578,353],[560,371],[529,350],[496,355],[454,361],[416,375],[389,380],[379,351],[380,325],[351,309],[327,294],[315,270],[295,277]],.6],
 [1,{ellipse:[883,280,29,15,-.40]},1.4],
 [1,{ellipse:[958,245,33,17,-.50]},1.4],
 // Cover the old outline with a margin independent from the moving matte.
 [2,{...handOutline,outline:7},.65],
 [2,{...penTop,outline:6},.65],
 [2,{...penNib,outline:6},.65],
 // Blend the page repair over a wider area below the fingers so the old
 // contact shadow cannot leave a pale, stationary outline around the hand.
 [2,[[916,742],[940,734],[1095,739],[1112,748],[1108,777],[1052,784],[953,778],[915,765]],5]
 ]),
 // A loose bound around the cuff; source colours refine its knitted edge below.
 mask([[0,[[1068,666],[1200,650],[1200,812],[1140,798],[1090,755],[1090,720],[1068,710]],.2],[1,{path:ARM_OUTLINE,outline:20},3],[0,penTop,.15],[0,penNib,.15]])
];
 if(sourceImage){
  // Refine only the narrow skin boundary. Paper-coloured edge pixels are not
  // part of the hand; preserve all interior paint and both metallic pen tips.
  const ctx=result[0].getContext('2d'),matte=ctx.getImageData(0,0,W,H),old=new Uint8ClampedArray(matte.data);
  const photo=document.createElement('canvas');photo.width=W;photo.height=H;const pc=photo.getContext('2d');pc.drawImage(sourceImage,0,0,W,H);const rgb=pc.getImageData(0,0,W,H).data;
  const pen=mask([[2,penTop,.15],[2,penNib,.15]]).getContext('2d').getImageData(0,0,W,H).data;
  const smooth=(a,b,v)=>{v=Math.max(0,Math.min(1,(v-a)/(b-a)));return v*v*(3-2*v);};
  // The original snow polygon stopped well before the curls. Composite the
  // replacement courtyard all the way to the glazing bead, through curl gaps.
  // Restrict colour-based matting to the part of each scanline containing hair.
  const curlEdge=[[0,790],[117,790],[135,769],[149,757],[181,753],
   [198,747],[219,736],[239,729],[251,722],[270,722],[283,732],
   [309,729],[330,733],[342,746],[359,746],[371,770],[383,785],[410,790]];
  const glassContext=result[2].getContext('2d');
  const glass=glassContext.getImageData(700,0,96,411);
  let segment=0;
  for(let y=0;y<410;y++){
   while(curlEdge[segment+1][0]<y)segment++;
   const [y0,x0]=curlEdge[segment],[y1,x1]=curlEdge[segment+1];
   const hairStart=x0+(x1-x0)*(y-y0)/(y1-y0)-3;
   for(let x=700;x<796;x++){
    const i=(y*W+x)*4,j=(y*96+x-700)*4;
    const hair=x<hairStart?0:smooth(12,82,rgb[i]-rgb[i+2])*smooth(13,58,rgb[i]-rgb[i+1])*
     (1-smooth(.49,.64,rgb[i+1]/Math.max(1,rgb[i])));
    const pane=(1-smooth(784,786,x))*(1-smooth(408,410,y));
    glass.data[j]=Math.round(255*pane*(1-hair));
   }
  }
  glassContext.putImageData(glass,700,0);
  // Trace the upper fur and tips of both ears against the snow. Preserve the
  // dark leaves on the left while replacing the gaps between their silhouettes.
  const catTop=[[380,432],[390,416],[400,405],[412,398],[425,390],[443,384],
   [459,378],[476,380],[487,373],[501,367],[512,365],[532,367],[546,370],
   [561,372],[576,377],[585,381],[596,363],[599,365],[611,379],
   [617,382],[628,384],[638,387],[650,392],[659,393],[670,391],
   [682,386],[684,389],[678,404],[674,412],[674,417],[700,422]];
  const sill=glassContext.getImageData(378,337,408,86);
  let span=0;
  for(let x=378;x<786;x++){
   while(span<catTop.length-2&&catTop[span+1][0]<x)span++;
   const [x0,y0]=catTop[span],[x1,y1]=catTop[span+1];
   const furY=y0+(y1-y0)*(x-x0)/(x1-x0);
   const sillY=420-(x-398)*.029;
   for(let y=345;y<423;y++){
    const i=(y*W+x)*4,j=((y-337)*408+x-378)*4;
    if(x>=700&&y<381)continue;
    const leaf=x<410?1-smooth(-12,12,rgb[i+2]-rgb[i+1]):0;
    const fur=x<700?Math.max(smooth(furY,furY+3,y),
     smooth(furY-5,furY-2,y)*smooth(10,48,rgb[i]-rgb[i+2])):0;
    sill.data[j]=255*(1-Math.max(leaf,fur))*(1-smooth(sillY-1,sillY,y))*(1-smooth(784,786,x));
   }
  }
  glassContext.putImageData(sill,378,337);
  // Under the close-up frame use the existing foreground snow and low shrubs.
  // Their scale stays natural and the snow no longer stretches to the sill.
  const foreground=glassContext.getImageData(294,365,500,59);
  for(let row=0;row<foreground.height;row++){
   const courtyardWeight=1-smooth(0,16,row);
   for(let col=0;col<foreground.width;col++)
    foreground.data[(row*foreground.width+col)*4]*=courtyardWeight;
  }
  glassContext.putImageData(foreground,294,365);
  for(let y=666;y<770;y++)for(let x=920;x<1132;x++){
   const i=(y*W+x)*4;if(!old[i+2]||pen[i+2]>2)continue;
   // The wrist silhouette used to include a dark piece of knitted cuff.
   // Keep only skin there; the sleeve supplies the continuous overlap above it.
   if(x>1090)matte.data[i+2]*=smooth(30,56,rgb[i]-rgb[i+1]);
   let interior=255;for(const [dx,dy]of[[0,4],[0,-4],[4,0],[-4,0],[3,3],[-3,3],[3,-3],[-3,-3]])interior=Math.min(interior,old[((y+dy)*W+x+dx)*4+2]);
   if(interior>250)continue;
   const skin=smooth(38,64,rgb[i]-rgb[i+1]);
   matte.data[i+2]*=Math.max(skin,interior/255);
  }
  // Retain the real shadowed skin at the wrist seam. The traced edge and
  // colour-keyed sleeve had both rejected these pixels, leaving pinholes.
  // A small skin-only underlap closes the seam without warping either layer.
  const wristOverlap=mask([[2,{...handOutline,outline:4},.2]]).getContext('2d').getImageData(0,0,W,H).data;
  for(let y=700;y<=752;y++)for(let x=1100;x<1132;x++){
   const i=(y*W+x)*4,skin=smooth(22,45,rgb[i]-rgb[i+1]);
   matte.data[i+2]=Math.max(matte.data[i+2],wristOverlap[i+2]*skin);
  }
  // The outer index-finger contour included a few dark notebook-coil pixels
  // above the nail. Trim that local edge; the nail, pen and poses stay intact.
  const fingerTrim=mask([[2,{path:'M 920 708 L 936.6 708 C 935.1 712.4 933.9 716.4 932.2 720.5 C 931.0 723.4 929.2 726.3 927.0 729.1 L 920 729.1 Z'},.2]])
    .getContext('2d').getImageData(920,708,20,23).data;
  for(let y=708;y<731;y++)for(let x=920;x<940;x++)
    matte.data[(y*W+x)*4+2]*=1-fingerTrim[((y-708)*20+x-920)*4+2]/255;
  ctx.putImageData(matte,0,0);
  const cuffContext=result[3].getContext('2d'),cuff=cuffContext.getImageData(0,0,W,H);
  for(let y=648;y<815;y++)for(let x=1065;x<1203;x++){
   const i=(y*W+x)*4;
   // Preserve the olive knit, including its dark linework. Exclude the warm
   // skin, paper and terracotta behind it; no new sleeve is generated.
   cuff.data[i]*=1-smooth(32,52,rgb[i]-rgb[i+1]);
  }cuffContext.putImageData(cuff,0,0);
  const sleeve=cuffContext.getImageData(0,0,W,H);
  const eraseBound=new Uint8ClampedArray(sleeve.data);
  const alpha=refineSleeveMatte(rgb,sleeve.data,W,H);
  for(let y=318;y<818;y++)for(let x=1048;x<1514;x++){
   const p=y*W+x,i=p*4;let expanded=0;
   for(const [dx,dy]of[[0,0],[2,0],[-2,0],[0,2],[0,-2],[2,2],[-2,2],[2,-2],[-2,-2]])expanded=Math.max(expanded,alpha[(y+dy)*W+x+dx]);
   if(y>755&&x>1150)expanded=Math.max(expanded,alpha[(y-6)*W+x]);
   // Erase the complete old painted silhouette, including warm rim light
   // discarded by the moving matte. Otherwise it floats behind the new pose.
   let oldArm=eraseBound[i+1];
   if(x<1235&&y<640){const olive=(rgb[i+1]-rgb[i+2])/Math.max(1,rgb[i]-rgb[i+2]);oldArm*=smooth(.48,.68,olive);}
   sleeve.data[i+1]=alpha[p];sleeve.data[i+2]=Math.max(expanded,oldArm);
  }  cuffContext.putImageData(sleeve,0,0);
 }
 return result;
}
function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.decoding='async';i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Не удалось загрузить ${src}`));i.src=src;});}
// Lossless WebP contains identical pixels. Keep the original PNG as a fallback.
function loadSceneImage(src){return loadImage(src.replace(/\.png$/,'.webp')).catch(()=>loadImage(src));}
export async function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Для движения сцены требуется WebGL.');
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const finish=gl.createProgram();gl.attachShader(finish,shader(gl.VERTEX_SHADER,VERT));
 gl.attachShader(finish,shader(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D rendered;uniform vec2 pixel;uniform float strength;
 void main(){vec3 c=texture2D(rendered,uv).rgb,n=texture2D(rendered,uv+vec2(0.,pixel.y)).rgb,s=texture2D(rendered,uv-vec2(0.,pixel.y)).rgb,e=texture2D(rendered,uv+vec2(pixel.x,0.)).rgb,w=texture2D(rendered,uv-vec2(pixel.x,0.)).rgb;
 vec3 lo=min(c,min(min(n,s),min(e,w))),hi=max(c,max(max(n,s),max(e,w)));
 gl_FragColor=vec4(clamp(c+(c-(n+s+e+w)*.25)*strength,lo,hi),1.);}`));gl.linkProgram(finish);if(!gl.getProgramParameter(finish,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(finish));
 const finishPixel=gl.getUniformLocation(finish,'pixel'),finishStrength=gl.getUniformLocation(finish,'strength'),finishRendered=gl.getUniformLocation(finish,'rendered'),finishAttribute=gl.getAttribLocation(finish,'a');
 const framebuffer=gl.createFramebuffer(),rendered=gl.createTexture();
 gl.bindTexture(gl.TEXTURE_2D,rendered);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const cameraUniform=gl.getUniformLocation(program,'camera');
 const [
  source, halfEye, closedEye, writingSource, downEye, desk, paper, deskRepair,
  detailMaster, panorama, courtyard
 ] = await Promise.all([
  'room.png', 'blink-half-v3.png', 'blink.png', 'writing-background-v2.png',
  'gaze-down-v1.png', 'desk-under-notebook-v1.png', 'notebook-ruled-spread-v3.png',
  'desk-no-foreground-book-v20.png', 'room-detail-master-lab44.png',
  'room-extended67.png', 'courtyard-master52.png'
 ].map(name => loadSceneImage('assets/'+name)));
 const maxTexture=gl.getParameter(gl.MAX_TEXTURE_SIZE);
 const eyes=createEyeAtlas(downEye,halfEye,closedEye);
 const yardAtlas=createCourtyardAtlas(eyes,courtyard,maxTexture);
 gl.uniform2f(gl.getUniformLocation(program,'detailAtlasSize'),yardAtlas.canvas.width,yardAtlas.canvas.height);
 gl.uniform2f(gl.getUniformLocation(program,'eyeAtlasSize'),eyes.width,eyes.height);
 const region=yardAtlas.region;
 gl.uniform4f(gl.getUniformLocation(program,'courtyardRegion'),region.x,region.y,region.width,region.height);
 const ink=createInkLayer(paper);
 const clean=detailPlate(createWritingBackground(writingSource,desk,deskRepair),detailMaster,maxTexture>=3344?2:1);
 let worldPicture=panorama;
 if(panorama.width>maxTexture){
  const scaled=document.createElement('canvas');
  scaled.width=maxTexture;scaled.height=Math.round(panorama.height*maxTexture/panorama.width);
  scaled.getContext('2d').drawImage(panorama,0,0,scaled.width,scaled.height);
  worldPicture=scaled;
 }
 const textures=[worldPicture,yardAtlas.canvas,clean,...masks(source),ink.canvas];
 let inkTexture,writingMode=true;
 const handles=[];
 ['picture','eyePoses','writingBackground','map0','map1','map2','map3','inkTexture'].forEach((name,i)=>{gl.activeTexture(gl.TEXTURE0+i);const t=gl.createTexture();handles[i]=t;if(i===7)inkTexture=t;gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textures[i]);gl.uniform1i(gl.getUniformLocation(program,name),i);});
 const names=['yardQuality','time','blink','pet','penTime','thinking','music','tea','book','gaze','lineActive','lineAngle','wristX','wristY','armWristX','armWristY','elbowX','elbowY','shoulderX','shoulderY','upperAngle','lowerAngle','bookX','bookY','palmAngle','handPivotX','handPivotY','followX','followY','followHead','earTwitch','tailSwish','windDrift','steamDrift','steamPulse'];const uniforms=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));let lastWidth=0,lastHeight=0;
 const viewport=observeRenderSize(canvas);
 return {draw(state){
  gl.useProgram(program);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,handles[0]);
  state={...state,...sampleAmbient(state.time)};
  const view=state.camera||{left:0,top:0,width:W,height:H};
  gl.uniform4f(cameraUniform,view.left,view.top,view.width,view.height);
  // Legacy close-up checks still animate only the wrist over the original book.
  // Replace the plate only when switching modes, never on ordinary frames.
  const nextMode=Number.isFinite(state.lineTime);
  if(nextMode!==writingMode){gl.activeTexture(gl.TEXTURE2);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,nextMode?clean:writingSource);writingMode=nextMode;}
  if(Number.isFinite(state.lineTime)){const p=sampleWriting(state.lineTime),look=writingLook(p);state={...state,lineActive:1,lineAngle:p.handAngle,wristX:p.wrist[0],wristY:p.wrist[1],armWristX:p.armWrist[0],armWristY:p.armWrist[1],elbowX:p.elbow[0],elbowY:p.elbow[1],shoulderX:p.shoulder[0],shoulderY:p.shoulder[1],upperAngle:p.upperAngle,lowerAngle:p.lowerAngle,bookX:p.bookOffset[0],bookY:p.bookOffset[1],palmAngle:p.handPose.angle,handPivotX:p.handPose.pivot[0],handPivotY:p.handPose.pivot[1],followX:look.x,followY:look.y,followHead:look.head};if(notebookVisible(view,p.bookOffset,INK_CROP)&&ink.draw(p.time)){gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,inkTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,ink.canvas);}}
  const rect=viewport.size;
  const dimensions=renderDimensions(rect.width,rect.height,devicePixelRatio,view.width,true,maxTexture);
  const w=dimensions.width,h=dimensions.height;
  // The panorama already contains the courtyard. Bring in native yard detail
  // progressively as a logical painted pixel starts occupying multiple pixels.
  const detailT=Math.min(1,Math.max(0,(w/view.width-1.25)/1.5));
  state.yardQuality=detailT*detailT*(3-2*detailT);
  if(w!==lastWidth||h!==lastHeight){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);lastWidth=w;lastHeight=h;
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,rendered);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,rendered,0);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Не удалось создать буфер просмотра.');
   gl.bindTexture(gl.TEXTURE_2D,handles[0]);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);for(const name of names)gl.uniform1f(uniforms[name],state[name]||0);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.useProgram(finish);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,rendered);gl.uniform1i(finishRendered,0);gl.uniform2f(finishPixel,1/w,1/h);gl.uniform1f(finishStrength,.55);
  gl.enableVertexAttribArray(finishAttribute);gl.vertexAttribPointer(finishAttribute,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
 },gl,dispose:viewport.dispose};
}
