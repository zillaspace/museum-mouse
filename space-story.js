/* Quiet space around the existing globe, and a closer look with Pip. */
(function(root){
 'use strict';
 if(typeof document==='undefined')return;
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
