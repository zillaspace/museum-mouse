/* Quiet space around the existing globe, and a closer look with Pip. */
(function(root){
 'use strict';
 function starField(width,height){
  let seed=19770905;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const count=Math.min(1100,Math.max(160,Math.round(width*height/1900)));
  return Array.from({length:count},()=>{
   const x=random(),y=random(),light=random(),tint=random();
   return {x:x*width,y:y*height,r:light>.984?1.15:light>.90?.7:.25+random()*.3,
    alpha:light>.984?.91:.15+light*.48,color:tint<.12?'193,211,255':tint>.91?'255,228,195':'231,237,247',bright:light>.984};
  });
 }
 root.MuseumSpace={starField};
 if(typeof module!=='undefined'&&module.exports)module.exports={starField};
 if(typeof document==='undefined')return;
 root.initMuseumSpace=function(map){
  const canvas=document.getElementById('space-stars');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const container=canvas.parentElement;
  function draw(){
   const width=container.clientWidth,height=container.clientHeight;
   if(!width||!height)return;
   const ratio=Math.min(root.devicePixelRatio||1,2);
   canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
   ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);
   starField(width,height).forEach(s=>{
    if(s.bright){
     const glow=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,3.8);
     glow.addColorStop(0,`rgba(${s.color},.22)`);glow.addColorStop(1,`rgba(${s.color},0)`);
     ctx.fillStyle=glow;ctx.fillRect(s.x-4,s.y-4,8,8);
    }
    ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(${s.color},${s.alpha})`;ctx.fill();
   });
  }
  function exposure(){canvas.style.opacity=String(Math.max(0,Math.min(1,(4-map.getZoom())/1.7)));}
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(draw):null;
  observer?.observe(container);if(!observer)root.addEventListener('resize',draw);
  map.on('zoom',exposure);draw();exposure();
  map.on('remove',()=>{observer?.disconnect();root.removeEventListener('resize',draw);map.off('zoom',exposure);});
 };
 const scene=document.querySelector('.pip-scene'),button=document.getElementById('pip-inspect');
 const reduced=root.matchMedia('(prefers-reduced-motion: reduce)');
 if(scene&&button){
  const lens=scene.querySelector('.pip-lens'),portrait=scene.querySelector('img');
  let frame=0,stillDetail=false;
  function position(x,y){
   const width=scene.clientWidth,size=width*.31,scale=1.8;
   lens.style.width=lens.style.height=size+'px';
   lens.style.left=(x*width-size/2)+'px';lens.style.top=(y*width-size/2)+'px';
   lens.style.backgroundSize=(width*scale)+'px '+(width*scale)+'px';
   lens.style.backgroundPosition=(size/2-x*width*scale)+'px '+(size/2-y*width*scale)+'px';
  }
  function stop(){cancelAnimationFrame(frame);frame=0;scene.classList.remove('is-looking');button.disabled=false;position(.51,.21);}
  function play(){
   stop();position(.51,.21);
   if(reduced.matches){stillDetail=!stillDetail;position(stillDetail?.45:.51,stillDetail?.38:.21);return;}
   scene.classList.add('is-looking');button.disabled=true;
   const route=[[.51,.21],[.45,.38],[.72,.69],[.51,.21]],start=performance.now(),duration=4400;
   function tick(now){
    const progress=Math.min(1,(now-start)/duration),part=Math.min(2,Math.floor(progress*3));
    const t=progress===1?1:progress*3-part,ease=t*t*(3-2*t);
    position(route[part][0]+(route[part+1][0]-route[part][0])*ease,route[part][1]+(route[part+1][1]-route[part][1])*ease);
    if(progress<1)frame=requestAnimationFrame(tick);else stop();
   }
   frame=requestAnimationFrame(tick);
  }
  button.addEventListener('click',play);
  portrait.addEventListener('load',()=>position(.51,.21));position(.51,.21);
  if(typeof ResizeObserver==='function')new ResizeObserver(()=>position(.51,.21)).observe(scene);
  reduced.addEventListener('change',()=>{if(reduced.matches)stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  if(typeof IntersectionObserver==='function'){
   const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){play();observer.disconnect();}},{threshold:.6});
   observer.observe(scene);
  }
 }
 document.querySelectorAll('[data-sketch-play]').forEach(button=>{
  const card=button.closest('.mouse-study');let timer;
  button.addEventListener('click',()=>{
   clearTimeout(timer);card.classList.remove('is-playing');
   if(reduced.matches)return;
   void card.offsetWidth;card.classList.add('is-playing');
   timer=setTimeout(()=>card.classList.remove('is-playing'),2600);
  });
 });
})(typeof globalThis!=='undefined'?globalThis:this);
