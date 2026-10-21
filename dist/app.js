import {quoteMarkup} from './quote-ui.js';
import {api,backendInfo} from './client.js';
import {mountAdmin} from './admin.js';
import {mountHire} from './hire.js';
import {createHireState,collectionRange,selectionError} from './hire-model.js';
import {todayLondon,addDays} from './domain.js';
import {packedWeight} from './airlines.js';
import {homePage,boxPage,hirePage,aboutPage,airlinesPage,termsPage,privacyPage,creditsPage,pageIntro,arrow} from './views.js';

const $=selector=>document.querySelector(selector),today=todayLondon(),max=addDays(today,365),hire=createHireState();
let route='home',noticeTimer,cleanup=()=>{},blocked=[];
function notify(message){clearTimeout(noticeTimer);$('#notice').textContent=message;$('#notice').classList.add('show');noticeTimer=setTimeout(()=>$('#notice').classList.remove('show'),5000);}
function bindHome(){
 const form=$('#quick-dates'),start=form.elements.start,end=form.elements.end;
 start.value=hire.start;end.value=hire.end;
 const update=()=>{end.min=start.value?addDays(start.value,4):addDays(today,4);$('#quick-error').textContent=start.value&&end.value?selectionError(start.value,end.value,today,blocked):'';$('#quick-quote').innerHTML=quoteMarkup(start.value,end.value,today);};
 start.onchange=()=>{const range=collectionRange(start.value,end.value,today,max);end.value=range.end;hire.acceptedTerms=false;Object.assign(hire,range);update();};
 end.onchange=()=>{hire.end=end.value;hire.acceptedTerms=false;update();};
 update();
 form.onsubmit=e=>{e.preventDefault();const error=selectionError(start.value,end.value,today,blocked);if(error){$('#quick-error').textContent=error;return;}Object.assign(hire,{start:start.value,end:end.value,step:2,furthest:Math.max(2,hire.furthest),receipt:null});location.hash='/enquire';};
 backendInfo().then(async info=>{if(!info.ready||!form.isConnected)return;try{const result=await api('availability?start='+today+'&end='+max);if(form.isConnected){blocked=result.blocked;update();}}catch{}});
}
function bindPage(){
 if(route==='home')bindHome();
 if(route==='box'||route==='home')document.querySelectorAll('[data-image]').forEach(b=>b.onclick=()=>{$('#gallery-image').src='assets/'+b.dataset.image+'.jpg';$('#gallery-image').alt=b.dataset.image==='easyfit-open'?'Open Triathlon Aero Easyfit case with internal packing layout':'Closed black Triathlon Aero Easyfit case';document.querySelectorAll('[data-image]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 if(route==='airlines')$('#weight-form').onsubmit=e=>{e.preventDefault();const form=new FormData(e.target),out=$('#weight-result');try{const result=packedWeight(form.get('caseWeight'),form.get('bikeWeight'),form.get('packingWeight'),form.get('limit'));out.innerHTML=`<strong>${result.total} kg total</strong>${Math.abs(result.remaining)} kg ${result.over?'over':'within'} your entered allowance. ${result.over?'Repack or ask the airline about an approved option.':'Weight alone does not confirm airline acceptance.'}`;out.classList.toggle('overweight',result.over);}catch(error){out.textContent=error.message;}};
 if(route==='enquire')cleanup=mountHire($('#hire-root'),hire,{notify});
 if(route==='admin')mountAdmin($('#admin-root'));
}
const pages={home:()=>homePage(today,max),box:boxPage,pricing:hirePage,about:aboutPage,airlines:airlinesPage,terms:termsPage,privacy:privacyPage,credits:creditsPage,enquire:()=>'<div id="hire-root"></div>',admin:()=>'<div id="admin-root"></div>'};
const titles={admin:'Rental admin',home:'Bike box hire in Bath',box:'The Easyfit case',pricing:'How hire works',about:'Contact',airlines:'Flying with a bike',enquire:'Plan your hire',terms:'Hire details',privacy:'Privacy',credits:'Images & sources'};
function render(focus=false){
 cleanup();cleanup=()=>{};
 const requested=location.hash.replace(/^#\/?/,'').split('?')[0]||'home';route=({book:'enquire',contact:'about'}[requested]||requested);
 document.body.dataset.route=route;
 $('#main').innerHTML=pages[route]?pages[route]():pageIntro('Page not found','Page not found.','This page could not be found.')+'<div class="shell section"><a class="button" href="#/">Back to the homepage →</a></div>';
 document.title=(titles[route]||'Page not found')+' | Bike Box Bath';
 document.querySelectorAll('[data-nav]').forEach(a=>{if(a.dataset.nav===route)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#main-nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');
 bindPage();
 if(focus){window.scrollTo(0,0);$('#main').focus({preventScroll:true});}
 if(route==='airlines'&&location.hash.includes('?weight'))$('#weight-tool').scrollIntoView({block:'start'});
}
$('#menu-toggle').onclick=()=>{const open=$('#main-nav').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#main-nav').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
$('#year').textContent=new Date().getFullYear();
window.addEventListener('hashchange',()=>{if(location.hash==='#main'){$('#main').focus();return;}render(true);});
render();
