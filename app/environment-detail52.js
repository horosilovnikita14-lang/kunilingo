// Native close-up drawings, registered in the room's unchanged world space.
// Compose once into the panorama. No view-dependent swapping or extra camera.
export const ENVIRONMENT_TILES={
  shelf:{left:1218,top:-105,width:994,height:560},
  desk:{left:0,top:330,width:766,height:431}
};
export function applyEnvironmentDetails(panorama,images,scale){
  const scene=panorama.getContext('2d');
  scene.save();
  scene.setTransform(scale,0,0,scale,0,130*scale);
  for(const [name,r]of Object.entries(ENVIRONMENT_TILES)){
    const tile=document.createElement('canvas');
    tile.width=Math.round(r.width*scale);tile.height=Math.round(r.height*scale);
    const p=tile.getContext('2d');
    p.setTransform(scale,0,0,scale,-r.left*scale,-r.top*scale);
    p.imageSmoothingQuality='high';
    p.drawImage(images[name],r.left,r.top,r.width,r.height);
    p.globalCompositeOperation='destination-out';
    p.fillStyle='#000';p.filter='blur(5px)';
    // Keep the entire animated character and every swept writing surface.
    p.fill(new Path2D('M 680 0 L 1240 0 L 1240 285 L 1370 345 L 1518 594 L 1560 830 L 1120 865 L 530 835 L 510 690 L 640 656 L 650 473 L 690 377 Z'));
    if(name==='desk'){
      // Glazing, moving cat/blanket/tail and notebook stay on their old plates.
      p.fillRect(285,-130,530,558);
      p.fillRect(320,340,450,225);
      p.fillRect(510,677,690,180);
      // Preserve spindle geometry and ellipse contours used by reel rotation.
      for(const [x,y,rx,ry]of[[206.1,582.1,33,37],[276.6,574.5,32,36]]){
        p.beginPath();p.ellipse(x,y,rx,ry,-.08,0,Math.PI*2);p.fill();
      }
    }
    p.filter='none';
    const e=22;
    for(const [x0,y0,x1,y1,bounds]of[
      [r.left,r.top,r.left+e,r.top,[r.left,r.top,e,r.height]],
      [r.left+r.width,r.top,r.left+r.width-e,r.top,[r.left+r.width-e,r.top,e,r.height]],
      [r.left,r.top,r.left,r.top+e,[r.left,r.top,r.width,e]],
      [r.left,r.top+r.height,r.left,r.top+r.height-e,[r.left,r.top+r.height-e,r.width,e]]
    ]){
      const g=p.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,'#000');g.addColorStop(1,'#0000');p.fillStyle=g;p.fillRect(...bounds);
    }
    scene.drawImage(tile,r.left,r.top,r.width,r.height);
  }
  scene.restore();return panorama;
}
