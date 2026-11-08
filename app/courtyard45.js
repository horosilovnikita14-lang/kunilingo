export const COURTYARD_RECT=Object.freeze({left:294,top:-25,width:500,height:390});
// Continue the snow foreground behind the sill without repeating the last
// texture row. All selectable frames end above this gentle ground mapping.
export const courtyardSourceY=y=>y<=345?y:345+20*(1-Math.exp(-(y-345)/20));
export const COURTYARD_FRAMES=Object.freeze({
 balanced:{label:'Площадка и фонарь',left:388,width:332,bottom:331},
 playground:{label:'Ближе к площадке',left:406,width:244,bottom:339},
 lantern:{label:'Акцент на фонарь',left:450,width:246,bottom:344}
});
export function courtyardFrame(variant,width,height){
 const r=COURTYARD_FRAMES[variant]||COURTYARD_FRAMES.balanced;
 const aspect=width/height,w=Math.min(r.width,330*aspect),h=w/aspect;
 return {left:r.left+(r.width-w)/2,top:r.bottom-h,width:w,height:h};
}
// A single atlas keeps the existing eight texture-unit budget. The courtyard
// retains every pixel of its own asset; it never enters the low-res room atlas.
export function createCourtyardAtlas(eyes,yard,maxSize=4096){
 const availableHeight=maxSize-eyes.height-4,scale=Math.min(1,maxSize/yard.width,availableHeight/yard.height);
 const width=Math.max(eyes.width,Math.floor(yard.width*scale)),height=eyes.height+4+Math.floor(yard.height*scale);
 const atlas=document.createElement('canvas');atlas.width=width;atlas.height=height;const c=atlas.getContext('2d');
 c.drawImage(eyes,0,0);const region={x:0,y:eyes.height+4,width:Math.floor(yard.width*scale),height:Math.floor(yard.height*scale)};
 c.drawImage(yard,region.x,region.y,region.width,region.height);
 return {canvas:atlas,eyes:{width:eyes.width,height:eyes.height},region};
}
