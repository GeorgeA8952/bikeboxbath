import {addDays,validDate} from './domain.js';
import {validateHireDates} from './pricing.js';
import {TERMS_VERSION} from './enquiry.js';

export function createHireState(){
 return {start:'',end:'',name:'',email:'',bike:'',airline:'',message:'',payment:'PayPal',acceptedTerms:false,step:1,furthest:1,receipt:null};
}
export function collectionRange(start,end,today,max){
 if(!validDate(start)||start<today||start>addDays(max,-4))return {start,end:''};
 const minimum=addDays(start,4);
 return {start,end:validDate(end)&&end>=minimum&&end<=max?end:minimum};
}
export function selectionError(start,end,today,blocked=[]){
 const error=validateHireDates(start,end,today);
 if(error)return error;
 return blocked.some(d=>d>=start&&d<=end)?'A date in this hire is unavailable. Choose another range.':'';
}
export function durationRange(start,days,today,max,blocked=[]){
 if(!validDate(start))throw Error('Choose a collection date first.');
 const end=addDays(start,days-1),error=selectionError(start,end,today,blocked);
 if(error)throw Error(error);
 if(end>max)throw Error('Choose dates within the next 12 months.');
 return {start,end};
}
export function requestPayload(state){
 return Object.fromEntries(['start','end','name','email','bike','airline','message','payment'].map(key=>[key,state[key]]).concat([['acceptedTerms',state.acceptedTerms===true],['termsVersion',TERMS_VERSION]]));
}
export function requestIdentity(state,uuid=()=>crypto.randomUUID()){
 const fingerprint=JSON.stringify(requestPayload(state));
 if(state.requestFingerprint!==fingerprint){state.requestFingerprint=fingerprint;state.requestKey=uuid();}
 return state.requestKey;
}
