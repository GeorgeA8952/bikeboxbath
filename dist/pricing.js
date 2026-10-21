import {todayLondon,validDate,hireDays,validateRange,addDays,DAY_MS} from './domain.js';
export const PRICING=Object.freeze({dailyPence:1100,depositPence:15000,lateDailyPence:4000,minimumDays:5,version:'2026-10-19'});
export const money=pence=>new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:pence%100?2:0}).format(pence/100);
export function validateHireDates(start,end,today=todayLondon(),allowPast=false){
 const error=validateRange(start,end,[],allowPast&&validDate(start)?start:today);
 if(error)return error;
 if(hireDays(start,end)<PRICING.minimumDays)return 'Minimum hire is 5 calendar days. Return on '+addDays(start,4)+' or later.';
 return '';
}
export function quoteHire(start,end,today=todayLondon(),allowPast=false){
 const error=validateHireDates(start,end,today,allowPast);if(error)throw new Error(error);
 const days=hireDays(start,end),hirePence=days*PRICING.dailyPence;
 return {days,dailyPence:PRICING.dailyPence,hirePence,depositPence:PRICING.depositPence,totalPence:hirePence+PRICING.depositPence,lateDailyPence:PRICING.lateDailyPence,pricingVersion:PRICING.version};
}
export function lateCharge(due,returned,rate=PRICING.lateDailyPence){
 if(!validDate(due)||!validDate(returned))throw new Error('Choose a valid return date.');
 const days=Math.max(0,Math.round((Date.parse(returned)-Date.parse(due))/DAY_MS));
 return {days,pence:days*rate};
}
