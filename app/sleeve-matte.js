// Separate the olive knitted sleeve from the warm chair, skin and scarf.
// A generous traced bound finds the real painted edge instead of cutting it.
// Flooding the outside preserves enclosed highlights and dark cable-knit lines.
export function refineSleeveMatte(rgb,rough,width,height){
 const x0=1048,y0=318,w=466,h=500,n=w*h;
 let candidate=new Uint8Array(n);const connected=new Uint8Array(n),outside=new Uint8Array(n),queue=new Int32Array(n);
 const index=(x,y)=>(y0+y)*width+x0+x;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const p=y*w+x,i=index(x,y)*4,r=rgb[i],g=rgb[i+1],b=rgb[i+2];
  const olive=(g-b)/Math.max(1,r-b);
  candidate[p]=Number(rough[i+1]>24&&olive>.70&&r-g<(x+x0<1140?35:45));
 }
 const morph=(input,r,dilate)=>{const out=new Uint8Array(n),offsets=[];for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(dx*dx+dy*dy<=r*r)offsets.push(dy*w+dx);for(let y=r;y<h-r;y++)for(let x=r;x<w-r;x++){const p=y*w+x;let v=Number(!dilate);for(const d of offsets){if(dilate?input[p+d]:!input[p+d]){v=Number(dilate);break;}}out[p]=v;}return out;};
 // Bridge narrow painted highlights before finding the outside. They are
 // colour variation in the knit, not holes in the sleeve. Remove thin spikes.
 candidate=morph(morph(candidate,5,true),5,false);
 candidate=morph(morph(candidate,2,false),2,true);
 // Keep only the sleeve connected to the upper arm, never a separate chair fleck.
 let head=0,tail=0;const seed=(450-y0)*w+1260-x0;
 queue[tail++]=seed;connected[seed]=1;
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);
  for(const q of [x?p-1:-1,x+1<w?p+1:-1,y?p-w:-1,y+1<h?p+w:-1])if(q>=0&&candidate[q]&&!connected[q]){connected[q]=1;queue[tail++]=q;}
 }
 head=tail=0;
 const push=p=>{if(!connected[p]&&!outside[p]){outside[p]=1;queue[tail++]=p;}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x);}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1);}
 while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);if(x)push(p-1);if(x+1<w)push(p+1);if(y)push(p-w);if(y+1<h)push(p+w);}
 const alpha=new Uint8ClampedArray(width*height);
 const cuffEdge=[[1132,768.5],[1142,768],[1154,767],[1160,766],[1165,765],[1170,764.5],[1175,765],[1180,771],[1185,775],[1190,777],[1196,779],[1204,780]];
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const p=y*w+x;let sum=0;
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=(1-outside[p+dy*w+dx])*(dx?1:2)*(dy?1:2);
  alpha[index(x,y)]=255*sum/16;
  // The underside is in deep shadow: colour segmentation mistakes it for the
  // desk. Trace this short edge explicitly, including the opaque cloth above
  // it, rather than removing a rectangular patch or retaining a table fragment.
  const sx=x+x0,sy=y+y0;
  if(sx>=1132&&sx<=1204&&sy>=760){let i=1;while(i<cuffEdge.length-1&&cuffEdge[i][0]<sx)i++;const a=cuffEdge[i-1],b=cuffEdge[i],t=(sx-a[0])/(b[0]-a[0]),edge=a[1]+(b[1]-a[1])*t;alpha[index(x,y)]=255*Math.max(0,Math.min(1,edge+.5-sy));}
 }
 return alpha;
}
