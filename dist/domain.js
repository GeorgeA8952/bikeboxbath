export const DAY_MS = 86400000;
export function todayLondon(now = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s)) && new Date(s+'T12:00:00Z').toISOString().slice(0,10) === s; }
export function addDays(date,n) { return new Date(Date.parse(date+'T12:00:00Z')+n*DAY_MS).toISOString().slice(0,10); }
export function hireDays(start,end) { return validDate(start) && validDate(end) ? Math.round((Date.parse(end)-Date.parse(start))/DAY_MS)+1 : 0; }
export function validateRange(start,end,blocked=[],today=todayLondon()) {
 if(!validDate(start)||!validDate(end)) return 'Choose both a collection and return date.';
 if(start<today) return 'Collection must be today or later.';
 if(end<start) return 'Return must be on or after collection.';
 if(end>addDays(today,365)) return 'Choose dates within the next 12 months.';
 if(blocked.some(d=>d>=start&&d<=end)) return 'Your range includes an unavailable date. Please choose another range.';
 return '';
}
