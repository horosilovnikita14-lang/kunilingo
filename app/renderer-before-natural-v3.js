// All character surfaces come from the approved painting. Local influence masks
// deform only the corresponding regions; no frame-wide scaling or camera motion.
const W=1672,H=941;
const VERT=`attribute vec2 a;varying vec2 uv;void main(){uv=(a+1.)*.5;gl_Position=vec4(a,0.,1.);}`;
const FRAG=`precision highp float;
varying vec2 uv;uniform sampler2D picture,closed,writingBackground,map0,map1,map2;uniform float time,blink,pet,penTime,thinking,music,tea,book;
const vec2 size=vec2(1672.,941.);
float gauss(vec2 p,vec2 c,vec2 s){vec2 d=(p-c)/s;return exp(-dot(d,d)*2.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
mat2 rotation(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
// Rotate in the cassette's own plane, then project back to the painted ellipse.
// The rim, centre spindle and surrounding cassette remain stationary.
vec3 reel(vec2 p,vec2 c,vec2 axisX,vec2 axisY,float a){
 vec2 d=p-c;float det=axisX.x*axisY.y-axisY.x*axisX.y;
 vec2 local=vec2(axisY.y*d.x-axisY.x*d.y,-axisX.y*d.x+axisX.x*d.y)/det;
 float r=length(local),mask=smoothstep(.38,.46,r)*(1.-smoothstep(.88,.98,r));
 vec2 turned=rotation(a)*local;
 return vec3(c+axisX*turned.x+axisY*turned.y,mask);
}
vec2 handwriting(float t){
 float cycle=mod(t,8.4),stroke=min(cycle,7.1),back=smoothstep(7.1,8.4,cycle);
 float contact=1.-smoothstep(6.95,7.15,cycle);
 vec2 advance=vec2(stroke*1.45,stroke*.16);
 vec2 letters=vec2(sin(stroke*8.6)*1.35,sin(stroke*17.2)*.72)*contact;
 return (advance+letters)*(1.-back)+vec2(0.,-sin(back*3.14159265)*3.2);
}
void main(){
 vec2 q=vec2(uv.x,1.-uv.y),p=q*size;
 vec3 m=texture2D(map0,q).rgb,n=texture2D(map1,q).rgb,k=texture2D(map2,q).rgb;
 float breath=sin(time*1.42), cb=sin(time*1.8+.8);
 vec2 d=vec2(0.);
 d+=m.r*vec2(sin(time*.67)*.62+thinking*1.6,-breath*.65-thinking*2.0);
 d+=m.r*gauss(p,vec2(920.,166.),vec2(240.,170.))*vec2(sin(time*1.12)*.8,sin(time*.91)*.65);
 d+=m.g*vec2(breath*.45,-breath*1.45);
 vec2 handShift=handwriting(penTime),breathShift=vec2(breath*.45,-breath*1.45);
 // The cuff follows the wrist; the motion dies out towards the planted elbow.
 float sleeve=m.g*smoothstep(1080.,1116.,p.x)*(1.-smoothstep(1120.,1410.,p.x))*smoothstep(630.,665.,p.y)*(1.-smoothstep(785.,815.,p.y));
 d+=handShift*sleeve;
 d+=n.r*vec2(cb*.35,-cb*1.15-pet*1.4);
 d+=n.g*vec2((sin(time*.92+.5)*3.2+pet*sin(time*9.)*5.)*clamp((p.y-447.)/65.,0.,1.),sin(time*1.12)*.8);
 d+=n.b*vec2(pet*2.4,-pet*3.8);
 float page=gauss(p,vec2(1120.,778.),vec2(80.,40.));d+=page*vec2(book*.8,-book*3.);
 vec2 s=(p-d)/size;
 // A separately painted closed-eye frame is used only within the eye masks.
 vec3 color=mix(texture2D(picture,s).rgb,texture2D(closed,s).rgb,blink*texture2D(map2,s).g);
 // Restore the page beneath the original hand, then composite the original
 // hand and entire pen as one rigid layer. The pen can no longer bend.
 color=mix(color,texture2D(writingBackground,s).rgb,texture2D(map2,s).b);
 vec2 handUV=(p-handShift-breathShift)/size;
 color=mix(color,texture2D(picture,handUV).rgb,texture2D(map0,handUV).b);
 if(music>.001){
  vec3 left=reel(p,vec2(206.1,582.1),vec2(21.5,-2.2),vec2(1.6,25.1),music);
  vec3 right=reel(p,vec2(276.6,574.5),vec2(19.6,-2.0),vec2(-.8,24.6),music*.96);
  color=mix(color,texture2D(picture,left.xy/size).rgb,left.z);
  color=mix(color,texture2D(picture,right.xy/size).rgb,right.z);
 }
 // Three independent particle scales, clipped by a hand-traced glass mask.
 float snow=0.;for(int i=0;i<3;i++){float z=float(i);float cell=42.+z*28.;vec2 sp=p+vec2(time*(3.+z*1.5),-time*(12.+z*10.));vec2 id=floor(sp/cell);vec2 f=fract(sp/cell);vec2 seed=vec2(hash(id+z),hash(id+13.+z));float r=(.65+z*.4)/cell;float flake=1.-smoothstep(r*.3,r,length(f-(.16+seed*.68)));snow+=flake*(.26+z*.12);}
 color=mix(color,vec3(.84,.9,1.),min(.7,snow*k.r));
 // Lighting is exactly the constant lighting of the approved painting.
 // Translucent, slowly changing steam rises only above the illustrated cup.
 float steam=0.;for(int i=0;i<3;i++){float f=float(i);float y=(604.-p.y)/103.;float x=431.+f*13.+sin(y*5.-time*.74+f*2.)*(7.+y*7.);float a=exp(-pow((p.x-x)/3.3,2.))*smoothstep(0.,.17,y)*(1.-smoothstep(.5,1.,y));steam+=a*step(0.,y)*step(y,1.);}
 color=mix(color,vec3(.98,.9,.73),clamp(steam*(.07+tea*.07),0.,.25));
 // Sparse, softly focused motes remain visible at the normal room scale.
 float dust=0.;for(int i=0;i<22;i++){
  float f=float(i),seed=hash(vec2(f,9.)),phase=fract(seed+time*(.006+hash(vec2(f,4.))*.006));
  vec2 c=vec2(80.+hash(vec2(f,7.))*425.+sin(time*.19+f)*14.,645.-phase*320.);
  float radius=mix(1.2,2.0,seed),fade=smoothstep(0.,.12,phase)*(1.-smoothstep(.85,1.,phase));
  dust+=(1.-smoothstep(.25,radius,distance(p,c)))*fade*(.28+seed*.16);
 }
 color=mix(color,vec3(1.,.88,.62),min(dust,.55));
 gl_FragColor=vec4(color,1.);
}`;

function mask(channels){
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const c=canvas.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,W,H);c.globalCompositeOperation='lighter';
 for(const [channel,shape,blur=2] of channels){c.save();c.fillStyle=['#f00','#0f0','#00f'][channel];c.filter=`blur(${blur}px)`;c.beginPath();if(shape.ellipse){const [x,y,rx,ry,angle=0]=shape.ellipse;c.ellipse(x,y,rx,ry,angle,0,Math.PI*2);}else{shape.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}c.fill();c.restore();}return canvas;
}
const masks=()=>[
 mask([
 [0,[[725,187],[747,103],[824,60],[904,38],[1026,47],[1115,89],[1173,149],[1189,220],[1155,272],[1104,307],[1031,318],[973,365],[931,380],[875,358],[827,326],[764,363],[719,330],[714,274]],5],
 [1,[[768,441],[823,485],[887,417],[956,396],[1044,345],[1157,334],[1260,345],[1331,420],[1427,621],[1466,722],[1452,780],[1140,776],[1120,688],[971,690],[909,708],[761,706],[686,682],[680,605],[711,497]],8],
 // Hand silhouette and both visible sections of the pen share one transform.
 [2,[[926,734],[925,730],[929,720],[936,708],[940,701],[939,694],[941,690],[947,688],[995,671],[1004,668],[1012,671],[1036,682],[1057,690],[1080,698],[1100,702],[1110,700],[1116,707],[1117,720],[1123,735],[1123,742],[1127,748],[1126,752],[1097,755],[1075,762],[1048,764],[1008,763],[991,765],[981,765],[975,762],[972,759],[965,760],[960,756],[956,752],[948,753],[943,749],[942,743],[941,737],[936,733],[932,737],[928,737]],.55],
 [2,[[978,678],[984,665],[999,648],[1025,620],[1031,617],[1035,620],[1030,626],[1033,629],[1033,632],[1009,661],[994,675]],.35],
 [2,[[921,757],[925,745],[930,737],[946,726],[943,735],[934,748]],.35]
 ]),
 mask([
 [0,[[347,434],[364,402],[400,380],[453,369],[506,358],[551,369],[581,380],[605,380],[625,395],[651,399],[674,420],[669,447],[644,464],[584,471],[539,454],[490,452],[430,469],[376,461]],3],
 [1,[[450,442],[476,449],[501,458],[521,479],[533,509],[524,534],[511,532],[487,510],[479,485],[455,476]],3],
 [2,[[559,401],[571,370],[582,365],[594,387],[608,398]],2],
 [2,[[637,407],[672,388],[681,393],[671,420]],2]
 ]),
 mask([
 [0,[[297,0],[793,0],[793,61],[751,99],[728,145],[711,190],[704,237],[716,280],[728,313],[750,346],[729,370],[697,397],[679,410],[674,387],[650,397],[615,378],[595,380],[578,353],[560,371],[529,350],[496,355],[454,361],[416,375],[389,380],[379,351],[380,325],[351,309],[327,294],[315,270],[295,277]],.6],
 [1,{ellipse:[883,280,29,15,-.40]},1.4],
 [1,{ellipse:[958,245,33,17,-.50]},1.4],
 // Only this local patch uses the generated clean background plate.
 [2,[[908,773],[911,731],[931,684],[963,670],[966,659],[1020,606],[1044,610],[1050,631],[1015,671],[1071,682],[1130,686],[1141,770],[1100,783],[940,783]],5]
 ])
];
function loadImage(src){return new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error(`Не удалось загрузить ${src}`));i.src=src;});}
export async function createRenderer(canvas){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw new Error('Для движения сцены требуется WebGL.');
 function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VERT));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
 const images=await Promise.all([loadImage('assets/room.png'),loadImage('assets/blink.png'),loadImage('assets/writing-background-v2.png')]);
 const textures=[...images,...masks()];['picture','closed','writingBackground','map0','map1','map2'].forEach((name,i)=>{gl.activeTexture(gl.TEXTURE0+i);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,textures[i]);gl.uniform1i(gl.getUniformLocation(program,name),i);});
 const names=['time','blink','pet','penTime','thinking','music','tea','book'];const uniforms=Object.fromEntries(names.map(n=>[n,gl.getUniformLocation(program,n)]));let lastWidth=0,lastHeight=0;
 return {draw(state){const rect=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio,1.5),w=Math.min(2200,Math.round(rect.width*ratio)),h=Math.round(w*H/W);if(w!==lastWidth||h!==lastHeight){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);lastWidth=w;lastHeight=h;}for(const name of names)gl.uniform1f(uniforms[name],state[name]||0);gl.drawArrays(gl.TRIANGLES,0,6);},gl};
}
