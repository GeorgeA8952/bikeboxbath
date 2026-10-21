import {quoteHire,validateHireDates,money,PRICING} from './pricing.js';
export function quoteMarkup(start,end,today){
 if(!start||!end)return `<div class="quote-empty"><span>5-day minimum: <strong>£55 hire</strong></span><span>Deposit <strong>£150</strong></span><span>Late return <strong>£40 / day</strong></span></div>`;
 if(validateHireDates(start,end,today))return '';
 const q=quoteHire(start,end,today);return `<dl class="auto-quote"><div><dt>${q.days} calendar days × ${money(PRICING.dailyPence)}</dt><dd>${money(q.hirePence)}</dd></div><div><dt>Refundable deposit</dt><dd>${money(q.depositPence)}</dd></div><div class="quote-total"><dt>Total including deposit</dt><dd>${money(q.totalPence)}</dd></div></dl>`;
}
