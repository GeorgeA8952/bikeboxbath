import {api,backendInfo} from './client.js';
import {addDays,todayLondon,hireDays,validDate} from './domain.js';
import {quoteHire,money} from './pricing.js';
import {CONTACT,escapeHtml as esc,dateLabel,validateDetails,enquiryMailto,enquiryText} from './enquiry.js';
import {collectionRange,durationRange,selectionError,requestIdentity,requestPayload} from './hire-model.js';

const monthName=date=>new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(date);
const shortDate=value=>value?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')):'Choose date';
const arrow='<span aria-hidden="true">→</span>';

export function mountHire(root,state,{notify=()=>{}}={}){
 const today=todayLondon(),max=addDays(today,365),first=new Date(today+'T12:00:00Z'),wide=matchMedia('(min-width:760px)');
 let shown=new Date((state.start||today)+'T12:00:00Z');shown.setUTCDate(1);
 let phase=state.start?'end':'start',blocked=[],availability='loading',online=false,error='',disposed=false,generation=0,sending=false;
 if(state.step>1&&selectionError(state.start,state.end,today))state.step=1;
 const quote=()=>{try{return quoteHire(state.start,state.end,today);}catch{return null;}};
 const validRange=()=>!selectionError(state.start,state.end,today,blocked);
 const rangeStatus=()=>availability==='loading'?'Checking dates…':availability==='error'?'Calendar connection unavailable':validRange()?(online?'Dates available':'Quote ready'):'5-day minimum';

 function summary(){
  const q=quote();
  return `<aside class="hire-summary" aria-label="Your hire summary">
   <div class="summary-product"><img src="assets/easyfit-black.jpg" alt="Black Bike Box Alan Easyfit" width="800" height="600"><div><p class="eyebrow">Your bike box</p><h2>Triathlon Aero Easyfit</h2><span>Bike Box Alan · Black</span></div></div>
   <div class="summary-dates"><div><span>Collect in Bath</span><strong>${shortDate(state.start)}</strong></div><span aria-hidden="true">→</span><div><span>Return to Bath</span><strong>${shortDate(state.end)}</strong></div></div>
   <dl class="hire-breakdown"><div><dt>${q?`${q.days} days × £11`:'Minimum hire · 5 days'}</dt><dd>${q?money(q.hirePence):'£55'}</dd></div><div><dt>Refundable deposit</dt><dd>£150</dd></div><div class="hire-total"><dt>${q?'Total':'5-day total'}<small>Including deposit</small></dt><dd>${q?money(q.totalPence):'£205'}</dd></div></dl>
   <div class="summary-note"><span aria-hidden="true">↩</span><p>Your deposit is settled after the return inspection.</p></div>
   <dl class="summary-facts"><div><dt>Collection</dt><dd>Bath, by appointment</dd></div><div><dt>Bring along</dt><dd>Photo ID</dd></div><div><dt>Late return</dt><dd>£40 per day</dd></div></dl>
   <a class="summary-help" href="mailto:${CONTACT}">A question before you hire? ↗</a>
  </aside>`;
 }
 function progress(){
  return `<ol class="hire-progress" aria-label="Hire progress">${['Dates','Your details','Review'].map((label,i)=>`<li class="${state.step===i+1?'current':state.step>i+1?'complete':''}" ${state.step===i+1?'aria-current="step"':''}><button type="button" data-step="${i+1}" ${i+1>state.furthest?'disabled':''}><span>${state.step>i+1?'✓':String(i+1).padStart(2,'0')}</span>${label}</button></li>`).join('')}</ol>`;
 }
 function actions(label,back){
  const q=quote();return `<div class="hire-actions"><div class="mobile-total"><span>Including £150 deposit</span><strong>${q?money(q.totalPence):'£205'}</strong></div>${back?`<button class="hire-back" type="button" data-step="${back}">← Back</button>`:''}<button class="button hire-next" type="submit" ${sending?'disabled':''}>${label} ${arrow}</button></div>`;
 }
 function dates(){
  return `<div class="hire-step-heading"><div><p class="eyebrow">01 / Plan your hire</p><h2>Choose your dates.</h2></div><span class="availability-badge" id="availability-status" role="status">${rangeStatus()}</span></div>
   <form id="hire-dates-form"><div class="hire-date-fields"><label class="${phase==='start'?'date-active':''}"><span>Collect in Bath</span><input id="hire-start" name="start" type="date" value="${state.start}" min="${today}" max="${addDays(max,-4)}" required></label><span class="date-separator" aria-hidden="true">→</span><label class="${phase==='end'?'date-active':''}"><span>Return to Bath</span><input id="hire-end" name="end" type="date" value="${state.end}" min="${state.start?addDays(state.start,4):addDays(today,4)}" max="${max}" required></label></div>
   <div class="duration-row"><span>Hire length</span>${[5,7,10,14].map(days=>`<button type="button" data-duration="${days}" aria-pressed="${!!state.start&&hireDays(state.start,state.end)===days}" ${!state.start?'disabled':''}>${days} days</button>`).join('')}</div>
   <div class="hire-calendar-header"><p id="calendar-instruction">${phase==='start'?'Choose a collection date':'Choose a return date'} <span>· Minimum 5 days</span></p><div><button type="button" id="hire-prev" aria-label="Previous month">←</button><button type="button" id="hire-next" aria-label="Next month">→</button></div></div>
   <div class="hire-calendars" id="hire-calendars"></div>
   <div class="calendar-key"><span><i class="key-range"></i>Your hire</span>${online?'<span><i class="key-unavailable"></i>Unavailable</span>':''}<button type="button" id="clear-hire-dates">Clear dates</button></div>
   <p class="calendar-footnote">Collection and return dates both count as hire days.</p>
   ${availability==='error'?'<p class="connection-notice">We couldn’t load availability. You can still send your dates by email. <button type="button" id="retry-calendar">Try again</button></p>':''}
   <p class="form-error hire-error" id="hire-error" role="alert">${esc(error)}</p>${actions('Your details')}</form>`;
 }
 function details(){
  return `<div class="hire-step-heading"><div><p class="eyebrow">02 / Your details</p><h2>You and your bike.</h2></div></div><p class="hire-step-copy">We’ll use your email for your hire and collection arrangements.</p>
   <form id="hire-details-form"><div class="field-grid">
    <label>Your name<input name="name" autocomplete="name" maxlength="100" value="${esc(state.name)}" required></label>
    <label>Email address<input name="email" type="email" autocomplete="email" maxlength="254" value="${esc(state.email)}" required></label>
    <label class="full">Bike model & frame size<input name="bike" maxlength="180" value="${esc(state.bike)}" placeholder="e.g. Canyon Aeroad, size M" required><small>Include integrated handlebars or a fit question if relevant.</small></label>
   </div><details class="extra-details" ${state.airline||state.message?'open':''}><summary>Add flight details or a question <span>Optional +</span></summary><div class="field-grid"><label class="full">Airline / destination<input name="airline" maxlength="100" value="${esc(state.airline)}" placeholder="e.g. easyJet / Mallorca"></label><label class="full">Your message<textarea name="message" maxlength="1500" rows="3">${esc(state.message)}</textarea></label></div></details>
   <p class="form-error hire-error" role="alert">${esc(error)}</p>${actions('Review hire',1)}</form>`;
 }
 function review(){
  const methods=[['PayPal','PayPal','Preferred for online payment'],['BACS bank transfer','Bank transfer','Payment must clear before collection'],['Cash on collection','Cash','Notes checked at handover']];
  return `<div class="hire-step-heading"><div><p class="eyebrow">03 / Check your hire</p><h2>Review your hire.</h2></div></div>
   <form id="hire-review-form"><div class="review-block"><div class="review-block-title"><h3>Your dates</h3><button type="button" data-step="1">Edit</button></div><p>${dateLabel(state.start)} <span aria-hidden="true">→</span> ${dateLabel(state.end)}</p><span>${quote().days} calendar days · Collection in Bath</span></div>
   <div class="review-block"><div class="review-block-title"><h3>Your details</h3><button type="button" data-step="2">Edit</button></div><p>${esc(state.name)} · ${esc(state.email)}</p><span>${esc(state.bike)}</span>${state.airline?`<span>${esc(state.airline)}</span>`:''}${state.message?`<p class="review-message">${esc(state.message)}</p>`:''}</div>
   <fieldset class="payment-choices"><legend>Preferred payment method</legend>${methods.map(([value,label,description])=>`<label class="payment-choice"><input type="radio" name="payment" value="${value}" ${state.payment===value?'checked':''}><span><strong>${label}</strong><small>${description}</small></span><span class="radio-mark" aria-hidden="true"></span></label>`).join('')}</fieldset>
   <p class="payment-context">Payment is arranged after your hire is confirmed.</p>
   <label class="terms-choice"><input type="checkbox" id="hire-terms" name="acceptedTerms" ${state.acceptedTerms?'checked':''} required><span>I agree to the <a href="#/terms">hire terms</a>, including the £150 deposit and £40 per day late-return charge. <a href="#/privacy">Privacy notice</a>.</span></label>
   <p class="form-error hire-error" role="alert">${esc(error)}</p>
   ${actions(online?'Send hire request':'Email hire request',2)}
   <p class="submit-context">${online?'Your request will be sent to Bike Box Bath. No payment is taken here.':'Opens a prepared email to '+CONTACT+'. Send it from your email app to finish.'}</p>
   <details class="email-alternative"><summary>Prefer to copy your request?</summary><button type="button" id="copy-hire-request">Copy hire details</button><button type="button" id="download-hire-request">Download details</button></details></form>`;
 }
 function receipt(){
  return `<section class="hire-receipt"><span class="receipt-tick" aria-hidden="true">✓</span><p class="eyebrow">Hire request received</p><h1>Request received.</h1><p>Your request is awaiting confirmation. No payment has been taken.</p><div class="receipt-reference"><span>Your reference</span><strong>${esc(state.receipt.id)}</strong></div><div class="receipt-next"><h2>What happens next</h2><p>We’ll confirm availability and arrange payment and collection with you by email.</p><p>At collection, bring photo ID. We’ll check the case with you before handover.</p></div><a class="button" href="#/">Back to the homepage ${arrow}</a><button class="text-link" type="button" id="another-hire">Plan another hire</button></section>`;
 }
 function render(focus=false){
  if(disposed||!root.isConnected)return;
  root.innerHTML=`<section class="hire-section"><div class="shell"><a href="#/" class="hire-home-link">← Bike box hire in Bath</a>${state.receipt?`<div class="hire-layout-grid">${receipt()}${summary()}</div>`:`<h1 class="hire-page-title">Plan your hire.</h1>${progress()}<div class="hire-layout-grid"><div class="hire-panel">${state.step===1?dates():state.step===2?details():review()}</div>${summary()}</div>`}</div></section>`;
  if(state.receipt){root.querySelector('#another-hire').onclick=()=>{state.receipt=null;state.step=1;state.furthest=1;state.acceptedTerms=false;state.requestFingerprint='';state.start='';state.end='';render(true);};return;}
  root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.step)));
  if(state.step===1)bindDates();
  if(state.step===2)bindDetails();
  if(state.step===3)bindReview();
  if(focus){const heading=root.querySelector('.hire-panel h2');heading.tabIndex=-1;heading.focus({preventScroll:true});root.querySelector('.hire-panel').scrollIntoView({block:'start',behavior:'instant'});}
 }
 function go(next){
  error='';
  if(next>1&&!validRange()){error=selectionError(state.start,state.end,today,blocked);next=1;}
  if(next>2&&validateDetails(state)){error=validateDetails(state);next=2;}
  state.step=next;state.furthest=Math.max(state.furthest,next);render(true);
 }
 function drawCalendar(){
  const container=root.querySelector('#hire-calendars');if(!container)return;
  let html='';
  for(let m=0;m<(wide.matches?2:1);m++){
   const date=new Date(Date.UTC(shown.getUTCFullYear(),shown.getUTCMonth()+m,1)),y=date.getUTCFullYear(),mo=date.getUTCMonth();
   const offset=(date.getUTCDay()+6)%7,count=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
   html+=`<section class="hire-month"><h3 id="hire-month-${m}">${monthName(date)}</h3><div class="hire-calendar" role="group" aria-labelledby="hire-month-${m}" aria-describedby="calendar-instruction">`;
   html+=['M','T','W','T','F','S','S'].map(d=>`<span class="hire-weekday" aria-hidden="true">${d}</span>`).join('')+'<span aria-hidden="true"></span>'.repeat(offset);
   for(let day=1;day<=count;day++){
    const d=`${y}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const busy=blocked.includes(d),tooShort=phase==='end'&&state.start&&d<addDays(state.start,4);
    const disabled=d<today||d>max||busy||tooShort||(phase==='start'&&d>addDays(max,-4));
    const selected=d===state.start||d===state.end,inside=state.start&&state.end&&d>state.start&&d<state.end;
    html+=`<button type="button" class="hire-day ${d===state.start?'range-start':d===state.end?'range-end':inside?'range-middle':''} ${busy?'date-busy':''}" data-date="${d}" aria-pressed="${!!selected}" aria-label="${dateLabel(d)}${busy?', unavailable':d===state.start?', collection':d===state.end?', return':tooShort?', before minimum return date':''}" ${disabled?'disabled':''}>${day}</button>`;
   }
   html+='</div></section>';
  }
  container.innerHTML=html;
  root.querySelector('#hire-prev').disabled=shown.getUTCFullYear()===first.getUTCFullYear()&&shown.getUTCMonth()===first.getUTCMonth();
  const final=new Date(max+'T12:00:00Z');root.querySelector('#hire-next').disabled=shown.getUTCFullYear()===final.getUTCFullYear()&&shown.getUTCMonth()===final.getUTCMonth();
 }
 function setRange(range){if(state.start!==range.start||state.end!==range.end)state.acceptedTerms=false;if(state.start!==range.start&&validDate(range.start)){shown=new Date(range.start+'T12:00:00Z');shown.setUTCDate(1);}Object.assign(state,range);}
 function bindDates(){
  drawCalendar();
  root.querySelector('#hire-calendars').onclick=e=>{
   const b=e.target.closest('[data-date]');if(!b||b.disabled)return;
   if(phase==='start'){setRange(collectionRange(b.dataset.date,'',today,max));phase='end';}
   else{setRange({start:state.start,end:b.dataset.date});phase='start';}
   error=selectionError(state.start,state.end,today,blocked);render();
   root.querySelector(`[data-date="${b.dataset.date}"]`)?.focus({preventScroll:true});
  };
  for(const [id,key] of [['hire-start','start'],['hire-end','end']]){
   const input=root.querySelector('#'+id);
   input.onfocus=()=>{phase=key==='start'?'start':'end';drawCalendar();root.querySelector('#calendar-instruction').innerHTML=(phase==='start'?'Choose a collection date':'Choose a return date')+' <span>· Minimum 5 days</span>';root.querySelectorAll('.hire-date-fields label').forEach(l=>l.classList.toggle('date-active',l.contains(input)));};
   input.onchange=()=>{if(key==='start'){setRange(collectionRange(input.value,state.end,today,max));phase='end';}else{setRange({start:state.start,end:input.value});phase='start';}error=state.start&&state.end?selectionError(state.start,state.end,today,blocked):'';render();};
  }
  root.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{try{setRange(durationRange(state.start,Number(b.dataset.duration),today,max,blocked));error='';phase='start';}catch(e){error=e.message;}render();});
  root.querySelector('#hire-prev').onclick=()=>{shown.setUTCMonth(shown.getUTCMonth()-1);drawCalendar();};
  root.querySelector('#hire-next').onclick=()=>{shown.setUTCMonth(shown.getUTCMonth()+1);drawCalendar();};
  root.querySelector('#clear-hire-dates').onclick=()=>{state.start='';state.end='';state.acceptedTerms=false;error='';phase='start';render();root.querySelector('#hire-start').focus();};
  root.querySelector('#retry-calendar')?.addEventListener('click',loadAvailability);
  root.querySelector('#hire-dates-form').onsubmit=e=>{e.preventDefault();go(2);};
 }
 function bindDetails(){
  const form=root.querySelector('#hire-details-form');
  const remember=()=>{for(const [key,value] of new FormData(form))state[key]=String(value).trim();};
  form.oninput=remember;form.onchange=remember;form.onsubmit=e=>{e.preventDefault();remember();go(3);};
 }
 function bindReview(){
  const form=root.querySelector('#hire-review-form');
  form.onchange=()=>{state.payment=form.elements.payment.value;state.acceptedTerms=form.elements.acceptedTerms.checked;};
  form.onsubmit=async e=>{
   e.preventDefault();if(sending)return;
   state.payment=form.elements.payment.value;state.acceptedTerms=form.elements.acceptedTerms.checked;
   if(!state.acceptedTerms){form.reportValidity();return;}
   if(!validRange()){go(1);return;}
   if(!online){location.href=enquiryMailto(state,today);notify('Your email draft is ready. Send it from your email app to finish.');return;}
   sending=true;error='';const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Sending your request…';
   root.querySelectorAll('[data-step]').forEach(b=>b.disabled=true);
   try{
    const result=await api('requests',{method:'POST',body:{...requestPayload(state),requestKey:requestIdentity(state),website:''}});
    state.receipt={id:result.id,quote:result.quote};render();
    const heading=root.querySelector('.hire-receipt h1');if(heading){heading.tabIndex=-1;heading.focus();heading.scrollIntoView({block:'center'});}
   }catch(e){error=e.message;if(e.status===409){state.step=1;await loadAvailability();}render();}
   finally{sending=false;if(!state.receipt)render();}
  };
  root.querySelector('#copy-hire-request').onclick=async()=>{try{await navigator.clipboard.writeText(enquiryText(state,today));notify('Hire details copied.');}catch{notify('Copy is unavailable. Use Download details instead.');}};
  root.querySelector('#download-hire-request').onclick=()=>{const url=URL.createObjectURL(new Blob([enquiryText(state,today)],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='bike-box-bath-hire.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 }
 async function loadAvailability(){
  const current=++generation;availability='loading';online=false;
  if(state.step===1)render();
  const info=await backendInfo();
  if(disposed||current!==generation)return;
  if(!info.ready){availability='offline';render();return;}
  try{const result=await api('availability?start='+today+'&end='+max);if(disposed||current!==generation)return;blocked=result.blocked;availability='ready';online=true;if(state.start&&state.end&&!validRange()){state.step=1;error=selectionError(state.start,state.end,today,blocked);}render();}
  catch{if(!disposed&&current===generation){availability='error';render();}}
 }
 const resized=()=>{if(state.step===1)drawCalendar();};wide.addEventListener('change',resized);
 render();loadAvailability();
 return ()=>{disposed=true;generation++;wide.removeEventListener('change',resized);};
}
