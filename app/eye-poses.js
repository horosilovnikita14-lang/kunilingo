// The three eye drawings share the original painting's pixel coordinates.
// Packing only their small common crop keeps WebGL below eight texture units.
export const EYE_CROP={x:832,y:208,width:192,height:112};
export function createEyeAtlas(down,half,closed){
 const {x,y,width,height}=EYE_CROP;
 const scale=Math.max(...[down,half,closed].map(i=>(i.naturalWidth||i.width)/1672));
 const atlas=document.createElement('canvas');atlas.width=Math.round(width*3*scale);atlas.height=Math.round(height*scale);
 const c=atlas.getContext('2d');
 [down,half,closed].forEach((image,i)=>{const s=(image.naturalWidth||image.width)/1672;c.drawImage(image,x*s,y*s,width*s,height*s,i*width*scale,0,width*scale,height*scale);});
 return atlas;
}
