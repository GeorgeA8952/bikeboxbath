import {validateRange, hireDays} from './domain.js';
import {quoteHire,validateHireDates,money} from './pricing.js';
export const CONTACT = 'hello@bikeboxbath.co.uk';
export const TERMS_VERSION = '2026-10-20';
export const PAYMENTS = ['To be decided','PayPal','BACS bank transfer','Cash on collection'];
export function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
export function dateLabel(value) { return value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')) : 'Not chosen'; }
export function validateDetails(data) {
  if (typeof data.name!=='string'||!data.name.trim()) return 'Enter your name.';
  if (typeof data.email!=='string'||data.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Enter a valid email address.';
  if (typeof data.bike!=='string'||!data.bike.trim()) return 'Add your bike model and frame size so we can discuss fit.';
  if (data.name.length>100 || data.bike.length>180 || (data.message||'').length>1500 || (data.airline||'').length>100) return 'Please shorten the details before continuing.';
  if (!PAYMENTS.includes(data.payment)) return 'Choose one of the listed payment preferences.';
  return '';
}
export function enquiryText(data,today) {
  const error=validateHireDates(data.start,data.end,today)||validateDetails(data);
  if(error) throw new Error(error);
  const quote=quoteHire(data.start,data.end,today);
  return `Hello,\n\nI’d like to hire a black Triathlon Aero Easyfit for these dates.\n\nCollection: ${dateLabel(data.start)}\nReturn: ${dateLabel(data.end)}\nCalendar days (including collection and return): ${hireDays(data.start,data.end)}\n\nName: ${data.name.trim()}\nEmail: ${data.email.trim()}\nBike model / frame size: ${data.bike.trim()}\nAirline / destination: ${data.airline?.trim()||'To be confirmed'}\nPayment preference: ${data.payment}\n${data.message?.trim()?'\n'+data.message.trim()+'\n':''}\nHire quote: ${money(quote.hirePence)}\nRefundable deposit: ${money(quote.depositPence)}\nTotal including deposit: ${money(quote.totalPence)}\nLate return: £40 per day late\n\n${data.acceptedTerms?'I have read and accepted the hire terms, including the deposit and late-return charges. Please confirm the hire and collection arrangements.':'Please confirm the hire, collection arrangements and applicable terms.'}\n\nThanks,\n${data.name.trim()}`;
}
export function enquiryMailto(data,today) {
  const body=enquiryText(data,today);
  return `mailto:${CONTACT}?subject=${encodeURIComponent('Bike box hire enquiry: '+dateLabel(data.start)+' – '+dateLabel(data.end))}&body=${encodeURIComponent(body)}`;
}
