/* Explicit planning assumptions. No billing or vendor calls. */
(function(root){
'use strict';
function calculate(x){
 const values=['films','minutes','hours','capacity','rate','price','languages','share','attempts','videoRate'];
 if(values.some(k=>!Number.isFinite(x[k]))||x.films<1||x.minutes<1||x.hours<1||x.capacity<1||x.rate<1||x.price<0||x.languages<1||x.languages>74||x.share<0||x.share>100||x.attempts<1||x.videoRate<0)throw new RangeError('Use valid positive planning inputs.');
 const totalHours=x.films*x.hours, equivalents=totalHours/x.capacity, seats=Math.ceil(equivalents);
 const factor=x.minutes/5, seconds=x.minutes*60*x.share/100*x.attempts;
 const voiceCredits=Math.ceil(x.films*x.minutes*900*x.languages*3);
 const voice=voiceCredits<=600000?{name:'Pro',cost:99}:voiceCredits<=1800000?{name:'Scale',cost:299}:voiceCredits<=6000000?{name:'Business',cost:990}:{name:'Enterprise estimate — quote required',cost:990*voiceCredits/6000000};
 const lines=[
  ['Producer labor',x.hours*x.rate*x.films,`${totalHours.toLocaleString()} hours × $${x.rate}/hour`],
  ['Generated video',seconds*x.videoRate*x.films,`${Math.round(seconds).toLocaleString()} generated seconds / film × $${x.videoRate}/second`],
  ['Generated stills',80*factor*.08*x.films,'80 images / 5 minutes × $0.08'],
  ['Script / research model',10*factor*x.films,'$10 allowance / 5 finished minutes'],
  ['Additional language review',Math.max(0,x.languages-1)*150*factor*x.films,'$150 / additional language / 5 minutes'],
  ['Access & technical review',150*factor*x.films,'$150 allowance / 5 minutes; specialist versions extra'],
  ['Routine music / rights allowance',100*x.films,'$100 / film; unusual licenses extra'],
  ['New project asset storage',100*factor*.015*x.films,'100 GB / 5 minutes × $0.015/GB-month'],
  ['ElevenLabs voice plan',voice.cost,`${voice.name}; ${voiceCredits.toLocaleString()} estimated TTS credits`],
  ['Adobe producer seats',69.99*seats,`${seats} seats × $69.99/month`],
  ['Operations tools allowance',200,'Fixed monthly planning allowance']
 ];
 const subtotal=lines.reduce((t,l)=>t+l[1],0),reserve=subtotal*.1,total=subtotal+reserve,revenue=x.films*x.price;
 return {lines,totalHours,equivalents,seats,seconds,voiceCredits,voice,subtotal,reserve,total,revenue,unit:total/x.films,contribution:revenue-total,margin:revenue?(revenue-total)/revenue:null,hardware:seats*6000,funding:3*total+seats*6000};
}
root.MuseumEconomics={calculate};
if(typeof module!=='undefined'&&module.exports)module.exports={calculate};
if(typeof document==='undefined')return;
const keys={films:'calc-films',minutes:'calc-minutes',hours:'calc-hours',capacity:'calc-capacity',rate:'calc-rate',price:'calc-price',languages:'calc-languages',share:'calc-share',attempts:'calc-attempts',videoRate:'calc-video-rate'};
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
function render(){
 const x={};for(const [k,id] of Object.entries(keys)){const el=document.getElementById(id);if(!el.checkValidity()||el.value===''){document.getElementById('out-warning').textContent='Enter valid values in every field to update the estimate.';return;}x[k]=Number(el.value);}
 const y=calculate(x);
 const put=(id,v)=>document.getElementById(id).textContent=v;
 put('out-producers',y.seats);put('out-capacity',`${y.equivalents.toFixed(1)} equivalents, rounded up · ${y.totalHours.toLocaleString()} production hours / month`);
 put('out-unit',money(y.unit));put('out-revenue',money(y.revenue));put('out-monthly',money(y.total));put('out-contribution',money(y.contribution)+(y.margin===null?'':` · ${(y.margin*100).toFixed(0)}%`));put('out-funding',money(y.funding));
 const warnings=[];
 if(y.contribution<0)warnings.push('This scenario does not cover modelled production cost. Increase price, narrow scope, or obtain a subsidy.');
 if(y.voiceCredits>6000000)warnings.push('Voice volume exceeds the published Business allowance; the extrapolated cost needs an enterprise quote.');
 if(x.hours<16)warnings.push('This low producer-hour target needs validation against completed films and their rework logs.');
 warnings.push('Contribution is not profit: sales, management, product development, tax, and other overhead remain outside this model.');
 put('out-warning',warnings.join(' '));
 const body=document.getElementById('cost-lines');body.replaceChildren();
 [...y.lines,['Production contingency (10%)',y.reserve,'10% of modelled subtotal']].forEach(([name,cost,basis])=>{const tr=document.createElement('tr');[name,money(cost/x.films),money(cost),basis].forEach(text=>{const td=document.createElement('td');td.textContent=text;tr.append(td);});body.append(tr);});
}
Object.values(keys).forEach(id=>document.getElementById(id).addEventListener('input',()=>{document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});render();}));
document.querySelectorAll('[data-scenario]').forEach(button=>button.onclick=()=>{const s=button.dataset.scenario;const defaults={films:s==='solo'?5:s==='fifty'?200:20,minutes:5,hours:s==='stress'?40:24,capacity:120,rate:75,price:5000,languages:s==='stress'?3:2,share:s==='stress'?100:60,attempts:s==='stress'?12:8,videoRate:s==='stress'?.4:.12};Object.entries(defaults).forEach(([k,v])=>document.getElementById(keys[k]).value=v);document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',b===button?'true':'false');});render();});
const tabs=[...document.querySelectorAll('[data-pitch]')];
function showPitch(button,focus=false){tabs.forEach(t=>{const chosen=t===button;t.setAttribute('aria-selected',String(chosen));t.tabIndex=chosen?0:-1;document.getElementById('pitch-'+t.dataset.pitch).hidden=!chosen;});if(focus)button.focus();}
tabs.forEach((button,i)=>{button.onclick=()=>showPitch(button);button.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();showPitch(tabs[next],true);};});
document.querySelectorAll('[data-museum]').forEach(b=>b.onclick=()=>{document.getElementById('atlas').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});selectMuseum(b.dataset.museum);});
render();
})(typeof globalThis!=='undefined'?globalThis:this);
