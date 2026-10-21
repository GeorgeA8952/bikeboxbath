import {api,backendInfo} from './client.js';
import {escapeHtml} from './enquiry.js';
export async function installRequestButton(data){
 const email=document.querySelector('#email-enquiry');if(!email)return;
 const info=await backendInfo();if(!info.ready||!email.isConnected||document.querySelector('#managed-request'))return;
 const area=document.createElement('div');area.id='managed-request';area.innerHTML='<button type="button" class="button" id="send-request">Send hire request →</button><p class="form-error" role="alert"></p>';
 email.before(area);email.className='text-link';email.innerHTML='Or email this enquiry ↗';
 area.querySelector('button').addEventListener('click',async()=>{
  const button=area.querySelector('button'),error=area.querySelector('[role=alert]');button.disabled=true;button.textContent='Sending…';error.textContent='';
  data.requestKey ||= crypto.randomUUID();
  try{const result=await api('requests',{method:'POST',body:{...data,website:''}});area.innerHTML=`<div class="request-receipt" role="status"><h3>Request received</h3><strong>${escapeHtml(result.id)}</strong><p>Awaiting confirmation. No payment has been taken.</p></div>`;document.querySelectorAll('[data-step]').forEach(b=>b.disabled=true);}
  catch(e){error.textContent=e.message;button.disabled=false;button.textContent='Send hire request →';}
 });
}
