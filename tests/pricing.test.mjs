import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteHire,lateCharge,validateHireDates} from '../dist/pricing.js';
test('five inclusive days cost £55 plus a separate £150 deposit',()=>{assert.deepEqual(quoteHire('2026-11-01','2026-11-05','2026-10-19'),{days:5,dailyPence:1100,hirePence:5500,depositPence:15000,totalPence:20500,lateDailyPence:4000,pricingVersion:'2026-10-19'});});
test('four days are rejected rather than quietly rounded up',()=>{assert.match(validateHireDates('2026-11-01','2026-11-04','2026-10-19'),/Minimum hire/);assert.throws(()=>quoteHire('2026-11-01','2026-11-04','2026-10-19'));});
test('weekly hire and clock change use calendar days, not elapsed hours',()=>{const q=quoteHire('2026-10-23','2026-10-29','2026-10-19');assert.equal(q.days,7);assert.equal(q.hirePence,7700);assert.equal(q.totalPence,22700);});
test('late charge is £40 for each day beyond due return, and zero for early return',()=>{assert.deepEqual(lateCharge('2026-11-05','2026-11-07'),{days:2,pence:8000});assert.deepEqual(lateCharge('2026-11-05','2026-11-04'),{days:0,pence:0});});
