/* Geometric, dated astronomy around the Museum Mouse globe. No live telemetry. */
(function(root){
'use strict';
const R=6371.0088,AU=149597870.7,PC=30856775814913.67,DEG=Math.PI/180,BASE_FOV=36.86989764584402;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const length=v=>Math.hypot(...v),sub=(a,b)=>a.map((x,i)=>x-b[i]);
function rx(v,a){const c=Math.cos(a),s=Math.sin(a);return[v[0],c*v[1]-s*v[2],s*v[1]+c*v[2]];}
function ry(v,a){const c=Math.cos(a),s=Math.sin(a);return[c*v[0]+s*v[2],v[1],-s*v[0]+c*v[2]];}
function rz(v,a){const c=Math.cos(a),s=Math.sin(a);return[c*v[0]-s*v[1],s*v[0]+c*v[1],v[2]];}
function fovForZoom(n){return BASE_FOV+clamp((1.55-n)*2,0,23);}
function latitudeZoom(lat){return Math.log2(Math.cos(clamp(lat,-89.9999,89.9999)*DEG));}
function camera(options){
 const {width,height,zoom,lng,lat,bearing=0,pitch=0,roll=0,offsetX=0,offsetY=0}=options;
 const fov=options.fov??fovForZoom(zoom),f=height/2/Math.tan(fov*DEG/2);
 const altitude=2*Math.PI*R*f/(512*Math.pow(2,zoom));
 const rotate=v=>rz(rx(rz(rx(ry(v,-lng*DEG),lat*DEG),bearing*DEG),-pitch*DEG),roll*DEG);
 const globeCenter=rz(rx(rz([0,0,-R],bearing*DEG),-pitch*DEG),roll*DEG);
 const toView=v=>{const p=rotate(v);return[p[0]+globeCenter[0],p[1]+globeCenter[1],p[2]+globeCenter[2]-altitude];};
 return{width,height,f,fov,altitude,centerX:width/2+offsetX,centerY:height/2+offsetY,zoom,toView,rotate};
}
function project(p,c,radius=0){
 const v=c.toView(p),depth=-v[2];if(depth<=radius)return null;
 const denominator=depth*depth-radius*radius;
 const x=c.centerX+c.f*v[0]*depth/denominator,y=c.centerY-c.f*v[1]*depth/denominator;
 const rx=c.f*radius*Math.sqrt(depth*depth+v[0]*v[0]-radius*radius)/denominator;
 const ry=c.f*radius*Math.sqrt(depth*depth+v[1]*v[1]-radius*radius)/denominator;
 return{x,y,rx,ry,r:Math.max(rx,ry),depth,distance:length(v),view:v};
}
function zoomForDistance(distance,height){
 let n=-4;
 for(let i=0;i<10;i++){const f=height/2/Math.tan(fovForZoom(n)*DEG/2);n=Math.log2(2*Math.PI*R*f/(512*(distance-R)));}
 return n;
}
function formatDistance(km){return km<AU*.1?Math.round(km).toLocaleString()+' km':(km/AU).toFixed(km<AU?3:2)+' AU';}
root.MuseumAstronomy={camera,project,fovForZoom,zoomForDistance,latitudeZoom,R,AU,PC};
if(typeof module!=='undefined'&&module.exports)module.exports=root.MuseumAstronomy;
if(typeof document==='undefined')return;
root.createMuseumZoomControl=()=>({
 onAdd(map){
  this.map=map;const box=document.createElement('div');box.className='maplibregl-ctrl maplibregl-ctrl-group museum-space-zoom';
  this.buttons=[['+','Zoom in',1],['−','Zoom out',-1]].map(([text,label,delta])=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.title=label;b.setAttribute('aria-label',label);b.onclick=()=>map.museumSpace?map.museumSpace.zoomBy(delta,true):map[delta>0?'zoomIn':'zoomOut']();box.append(b);return b;});
  this.element=box;this.update=()=>{this.buttons[0].disabled=map.getZoom()>=map.getMaxZoom()-.01;this.buttons[1].disabled=map.museumSpace?.atLimit()??false;};
  map.on('move',this.update);return box;
 },onRemove(){this.map.off('move',this.update);this.element.remove();}
});
root.initMuseumSpace=function(map){
 const data=root.MUSEUM_SPACE_DATA,back=document.getElementById('space-stars');
 if(!data||!back)return;
 const panel=back.parentElement,host=map.getContainer(),glCanvas=map.getCanvas(),surface=map.getCanvasContainer();
 const front=document.getElementById('space-bodies'),ctx=back.getContext('2d'),fg=front?.getContext('2d');if(!ctx||!fg)return;
 const presets=document.getElementById('space-presets'),readout=document.getElementById('space-readout'),distanceEl=document.getElementById('space-distance'),fovEl=document.getElementById('space-fov');
 const reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
 let virtual=null,internal=false,frame=0,travel=0,targetZoom=null,width=0,height=0,dpr=1,drag=null,pinch=0,touch=null,lastOpacity=-1;
 const sun=data.bodies.find(b=>b.name==='Sun');
 // HYG is heliocentric at the scale of this view. Add the Sun's geocentric vector.
 const stars=data.stars.map(s=>({p:s.slice(0,3).map((x,i)=>x*PC+sun.p[i]),mag:s[3],ci:s[4]}));
 const normalized=()=>map.getZoom()-latitudeZoom(map.getCenter().lat);
 const value=()=>virtual??normalized();
 const nativeFloor=()=>map.getMinZoom()-latitudeZoom(map.getCenter().lat);
 const withInternal=fn=>{internal=true;try{return fn();}finally{internal=false;}};
 function resize(){
  width=panel.clientWidth;height=panel.clientHeight;dpr=Math.min(root.devicePixelRatio||1,2);
  for(const c of [back,front]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}
  schedule();
 }
 function cFor(n){
  const center=map.getCenter(),offset=map.transform.centerOffset||{x:0,y:0};
  return camera({width,height,zoom:n,lng:center.lng,lat:center.lat,bearing:map.getBearing(),pitch:map.getPitch(),roll:map.getRoll?.()||0,fov:map.getVerticalFieldOfView(),offsetX:offset.x,offsetY:offset.y});
 }
 function limit(n){return clamp(n,zoomForDistance(200*AU,height||800),map.getMaxZoom()-latitudeZoom(map.getCenter().lat));}
 function exit(){virtual=null;surface.style.transform='';surface.style.transformOrigin='';map.dragPan.enable();}
 function setZoom(n){
  n=limit(n);const center=map.getCenter();
  withInternal(()=>{
   map.setVerticalFieldOfView(fovForZoom(n));
   if(n<nativeFloor()){virtual=n;map.dragPan.disable();map.jumpTo({zoom:map.getMinZoom()});}
   else{exit();map.jumpTo({zoom:n+latitudeZoom(center.lat)});}
  });schedule();
 }
 function zoomTo(n,animate=true){
  cancelAnimationFrame(travel);withInternal(()=>map.stop());const start=value(),end=limit(n);targetZoom=end;
  if(!animate||reduced.matches){setZoom(end);targetZoom=null;return;}
  const began=performance.now(),duration=clamp(Math.abs(end-start)*100,220,1100);
  function step(now){const t=clamp((now-began)/duration,0,1),smooth=t*t*(3-2*t);setZoom(start+(end-start)*smooth);if(t<1)travel=requestAnimationFrame(step);else{travel=0;targetZoom=null;}}
  travel=requestAnimationFrame(step);
 }
 function zoomBy(delta,animate=false){zoomTo((targetZoom??value())+delta,animate);}
 map.museumSpace={zoomBy,atLimit:()=>value()<=limit(-100)+.005,reset:()=>{cancelAnimationFrame(travel);targetZoom=null;exit();schedule();}};
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 function moved(){
  if(!internal&&virtual===null){const f=fovForZoom(normalized());if(Math.abs(map.getVerticalFieldOfView()-f)>.001)withInternal(()=>map.setVerticalFieldOfView(f));}
  schedule();
 }
 function moveStarted(){if(!internal){cancelAnimationFrame(travel);travel=0;targetZoom=null;if(virtual!==null)exit();}}
 function draw(){
  frame=0;if(!width||!height)return;
  const n=value(),c=cFor(n),earth=project([0,0,0],c,R),base=project([0,0,0],cFor(Math.max(n,nativeFloor())),R);
  if(virtual!==null&&earth&&base){surface.style.transformOrigin=base.x+'px '+base.y+'px';surface.style.transform='translate('+(earth.x-base.x)+'px,'+(earth.y-base.y)+'px) scale('+(earth.r/base.r)+')';}
  const opacity=clamp((n+1.6)/2.35,0,1);
  if(Math.abs(lastOpacity-opacity)>.002){for(const id of ['clusters','points','pilot-points','selected-point'])if(map.getLayer(id))map.setPaintProperty(id,'icon-opacity',opacity);if(map.getLayer('clusters'))map.setPaintProperty('clusters','text-opacity',opacity);lastOpacity=opacity;}
  const exposure=clamp((4-n)/1.7,0,1);back.style.opacity=String(exposure);front.style.opacity=String(exposure);
  presets.hidden=n>4;readout.hidden=n>4;
  distanceEl.textContent=formatDistance(cFor(n).altitude+R);fovEl.textContent=c.fov.toFixed(1)+'° field of view';
  ctx.setTransform(dpr,0,0,dpr,0,0);fg.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);fg.clearRect(0,0,width,height);
  if(exposure===0)return;
  for(const s of stars){
   const p=project(s.p,c);if(!p||p.x<0||p.x>width||p.y<0||p.y>height)continue;
   const r=clamp(1.65-s.mag*.19,.28,2.1),alpha=clamp(.98-s.mag*.115,.14,.95);
   const color=s.ci<.25?'203,221,255':s.ci>1.1?'255,216,175':'236,239,246';
   ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=`rgba(${color},${alpha})`;ctx.fill();
  }
  const projected=data.bodies.map(b=>({body:b,p:project(b.p,c,b.radius)})).filter(o=>o.p&&o.p.x+o.p.r>=0&&o.p.x-o.p.r<=width&&o.p.y+o.p.r>=0&&o.p.y-o.p.r<=height).sort((a,b)=>b.p.depth-a.p.depth);
  const labels=[];
  for(const {body,p} of projected){
   const behind=earth&&p.depth>earth.depth,inside=earth&&Math.hypot(p.x-earth.x,p.y-earth.y)<earth.r;
   if(behind&&inside&&Math.hypot(p.x-earth.x,p.y-earth.y)+p.r<earth.r)continue;
   fg.save();
   if(behind){fg.beginPath();fg.rect(0,0,width,height);fg.arc(earth.x,earth.y,earth.r,0,Math.PI*2,true);fg.clip('evenodd');}
   drawBody(body,p,c,fg);
   fg.restore();
   if(!inside||!behind)labels.push({name:body.name,p,color:body.color});
  }
  if(earth&&earth.r<10)labels.unshift({name:'Earth',p:earth,color:'#c5e2ff'});
  drawLabels(labels,fg);
 }
 function drawBody(body,p,c,x){
  if(p.r<.7){x.beginPath();x.arc(p.x,p.y,2.8,0,Math.PI*2);x.strokeStyle=body.color;x.lineWidth=.8;x.stroke();return;}
  if(body.name==='Sun'){
   const glow=x.createRadialGradient(p.x,p.y,p.r*.8,p.x,p.y,p.r*2.5);glow.addColorStop(0,'#fff0b955');glow.addColorStop(1,'#fff0b900');x.fillStyle=glow;x.fillRect(p.x-p.r*2.5,p.y-p.r*2.5,p.r*5,p.r*5);
   x.beginPath();x.ellipse(p.x,p.y,p.rx,p.ry,0,0,Math.PI*2);x.fillStyle='#fff5d8';x.fill();return;
  }
  // A Lambertian sphere gives the Moon a phase from the actual Sun direction.
  const light=c.rotate(sub(sun.p,body.p)),norm=length(light),L=light.map(v=>v/norm),size=48;
  const tile=document.createElement('canvas');tile.width=tile.height=size;const t=tile.getContext('2d'),pixels=t.createImageData(size,size);
  const rgb=body.color.slice(1).match(/../g).map(h=>parseInt(h,16));
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){
   const u=(i+.5)/size*2-1,v=1-(j+.5)/size*2,q=u*u+v*v;if(q>1)continue;
   const z=Math.sqrt(1-q),shade=.055+.945*Math.max(0,u*L[0]+v*L[1]+z*L[2]),k=(j*size+i)*4;
   for(let a=0;a<3;a++)pixels.data[k+a]=Math.round(rgb[a]*Math.pow(shade,.65));pixels.data[k+3]=255;
  }
  t.putImageData(pixels,0,0);x.drawImage(tile,p.x-p.rx,p.y-p.ry,p.rx*2,p.ry*2);
 }
 function drawLabels(items,x){
  const used=[];x.font='12px Arial, sans-serif';x.textBaseline='middle';
  items.sort((a,b)=>({Earth:0,Sun:1,Moon:2}[a.name]??3)-({Earth:0,Sun:1,Moon:2}[b.name]??3));
  for(const item of items){const {p,name,color}=item,w=x.measureText(name).width+12;let lx=clamp(p.x+p.r+9,7,width-w-7),ly=p.y;
   if(p.x<6||p.x>width-6||p.y<6||p.y>height-6)continue;
   let free=false;
   for(const offset of [0,-19,19,-38,38,-57,57,-76,76]){ly=clamp(p.y+offset,14,height-14);if(!used.some(b=>lx<b.x+b.w&&lx+w>b.x&&Math.abs(ly-b.y)<18)){free=true;break;}}
   if(!free)continue;used.push({x:lx,y:ly,w});
   x.beginPath();x.moveTo(p.x+p.r+3,p.y);x.lineTo(lx-2,ly);x.strokeStyle='#758799aa';x.lineWidth=.65;x.stroke();
   x.fillStyle='#02060dd9';x.fillRect(lx-3,ly-9,w,18);x.fillStyle=color;x.fillText(name,lx+2,ly);
  }
 }
 function wheel(e){if(e.target.closest('button,a,summary'))return;e.preventDefault();cancelAnimationFrame(travel);targetZoom=null;zoomBy(clamp(-e.deltaY*(e.deltaMode===1?.06:.004),-1.2,1.2));}
 function key(e){if(['+','=','-','_'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();zoomBy(e.key==='+'||e.key==='='?1:-1,true);}}
 function orbit(dx,dy){const center=map.getCenter();withInternal(()=>map.jumpTo({center:[center.lng-dx*.24,clamp(center.lat+dy*.24,-85,85)],zoom:map.getMinZoom()}));schedule();}
 function pointerDown(e){if(virtual===null||e.pointerType==='touch'||e.target.closest('.maplibregl-control-container'))return;e.preventDefault();drag={x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId);}
 function pointerMove(e){if(!drag)return;orbit(e.clientX-drag.x,e.clientY-drag.y);drag={x:e.clientX,y:e.clientY};}
 function pointerUp(){drag=null;}
 function touchStart(e){if(e.touches.length===2){e.preventDefault();pinch=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);touch=null;}else if(virtual!==null&&e.touches.length===1){e.preventDefault();touch=[e.touches[0].clientX,e.touches[0].clientY];}}
 function touchMove(e){if(e.touches.length===2&&pinch){e.preventDefault();const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoomBy(Math.log2(d/pinch));pinch=d;}else if(touch&&virtual!==null&&e.touches.length===1){e.preventDefault();orbit(e.touches[0].clientX-touch[0],e.touches[0].clientY-touch[1]);touch=[e.touches[0].clientX,e.touches[0].clientY];}}
 function touchEnd(){pinch=0;touch=null;}
 function lunarView(){const p=data.bodies.find(b=>b.name==='Moon').p;const lng=Math.atan2(p[0],p[2])/DEG+90;withInternal(()=>{map.stop();map.jumpTo({center:[lng,0],bearing:0,pitch:0,zoom:Math.max(value(),map.getMinZoom())});});zoomTo(zoomForDistance(length(p)*3,height));}
 document.getElementById('space-moon').onclick=lunarView;
 document.getElementById('space-solar').onclick=()=>zoomTo(zoomForDistance(110*AU,height));
 map.scrollZoom.disable();map.touchZoomRotate.disable();map.doubleClickZoom.disable();map.boxZoom.disable();
 map.on('move',moved);map.on('movestart',moveStarted);map.on('resize',resize);
 host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('keydown',key,true);
 host.addEventListener('pointerdown',pointerDown);host.addEventListener('pointermove',pointerMove);host.addEventListener('pointerup',pointerUp);host.addEventListener('pointercancel',pointerUp);
 host.addEventListener('touchstart',touchStart,{passive:false});host.addEventListener('touchmove',touchMove,{passive:false});host.addEventListener('touchend',touchEnd);host.addEventListener('touchcancel',touchEnd);
 const observer=new ResizeObserver(resize);observer.observe(panel);resize();moved();
 map.on('remove',()=>{observer.disconnect();cancelAnimationFrame(frame);cancelAnimationFrame(travel);for(const [type,fn] of [['wheel',wheel],['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',pointerUp],['touchstart',touchStart],['touchmove',touchMove],['touchend',touchEnd],['touchcancel',touchEnd]])host.removeEventListener(type,fn);host.removeEventListener('keydown',key,true);});
};
})(typeof globalThis!=='undefined'?globalThis:this);
