// A conservative environment refinement. Animation silhouettes and every
// repaired character region keep the accepted source artwork, at every zoom.
export function detailPlate(source,master,scale=2){
 const c=document.createElement('canvas');c.width=1672*scale;c.height=941*scale;
 const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(source,0,0,c.width,c.height);
 const patch=document.createElement('canvas');patch.width=c.width;patch.height=c.height;
 const p=patch.getContext('2d');p.scale(scale,scale);
 p.drawImage(master,0,0,1672,941);
 p.globalCompositeOperation='destination-out';p.fillStyle='#000';p.filter='blur(9px)';
 // Source character plus the swept envelope of the writing rig.
 p.fill(new Path2D('M 680 0 L 1240 0 L 1240 285 L 1370 345 L 1518 594 L 1560 830 L 1120 865 L 530 835 L 510 690 L 640 656 L 650 473 L 690 377 Z'));
 // Cat and blanket, cassette including its metal rims, notebook and cookies.
 for(const [x,y,w,h]of[[325,351,429,185],[105,485,248,207],[523,677,680,176],[790,822,280,119]])p.fillRect(x,y,w,h);
 ctx.globalAlpha=.64;ctx.drawImage(patch,0,0);ctx.globalAlpha=1;
 return c;
}
export function scaledSource(image,scale=2){const c=document.createElement('canvas');c.width=1672*scale;c.height=941*scale;const p=c.getContext('2d');p.imageSmoothingQuality='high';p.drawImage(image,0,0,c.width,c.height);return c;}

export const WORLD={width:2220,height:1071,top:-130};
export function renderDimensions(width,height,dpr,viewWidth,quality,maxTexture=4096){
 const native=Math.min(width*Math.min(dpr,2),3840,Math.sqrt(3840*2160*width/height));
 const legacy=Math.min(2200,Math.max(width,height*1672/941)*1672/viewWidth*Math.min(dpr,1.5))*viewWidth/1672;
 const w=Math.max(1,Math.floor(Math.min(quality?native:legacy,maxTexture,maxTexture*width/height)));
 return {width:w,height:Math.max(1,Math.floor(w*height/width))};
}
// The added margins are registered to the old painting with 874 feature matches.
// The source painting is restored over the whole centre; no regenerated face
// or character contour enters the animation rig.
export function extendPlate(plate,extension,scale=1.5){
 const c=document.createElement('canvas');c.width=WORLD.width*scale;c.height=WORLD.height*scale;
 const ctx=c.getContext('2d');ctx.scale(scale,scale);ctx.translate(0,130);
 const a=.8287875428655261,b=.0017333467160924358,tx=1.6609966992446454,ty=111.7185427603703,d=a*a+b*b;
 ctx.save();ctx.transform(a/d,-b/d,b/d,a/d,(-a*tx-b*ty)/d,(b*tx-a*ty)/d);
 ctx.drawImage(extension,0,0);
 // Continue only the tabletop at the far lower right, outside all close-ups.
 ctx.drawImage(extension,0,extension.height-2,extension.width,2,0,extension.height-1,extension.width,90);
 ctx.restore();
 // A narrow overlap lies only on the formerly cut wall and book spines.
 const centre=document.createElement('canvas');centre.width=1672*scale;centre.height=941*scale;
 const p=centre.getContext('2d');p.drawImage(plate,0,0,centre.width,centre.height);
 p.globalCompositeOperation='destination-out';
 const right=p.createLinearGradient(1644*scale,0,1672*scale,0);right.addColorStop(0,'#0000');right.addColorStop(1,'#000');p.fillStyle=right;p.fillRect(1644*scale,0,28*scale,941*scale);
 const top=p.createLinearGradient(0,0,0,14*scale);top.addColorStop(0,'#000');top.addColorStop(1,'#0000');p.fillStyle=top;p.fillRect(0,0,1672*scale,14*scale);
 ctx.drawImage(centre,0,0,1672,941);return c;
}
