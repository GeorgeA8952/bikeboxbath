import test from 'node:test';import assert from 'node:assert/strict';
import {todayLondon,validDate,addDays,hireDays,validateRange} from '../dist/domain.js';
test('London date stays correct near midnight in British Summer Time',()=>{assert.equal(todayLondon(new Date('2026-10-14T23:30:00Z')),'2026-10-15')});
test('inclusive calendar-day hire across the clocks changing',()=>{assert.equal(hireDays('2026-10-23','2026-10-27'),5);assert.equal(hireDays('2026-10-15','2026-10-15'),1)});
test('invalid, past and reversed date ranges are rejected',()=>{assert.equal(validDate('2026-02-30'),false);assert.ok(validateRange('2026-02-30','2026-03-01',[],'2026-01-01'));assert.ok(validateRange('2026-10-14','2026-10-16',[],'2026-10-15'));assert.ok(validateRange('2026-10-17','2026-10-16',[],'2026-10-15'));assert.ok(validateRange('','',[],'2026-10-15'))});
test('overlap checks include interior days and both boundaries',()=>{for(const d of ['2026-10-16','2026-10-18','2026-10-20'])assert.ok(validateRange('2026-10-16','2026-10-20',[d],'2026-10-15'));assert.equal(validateRange('2026-10-16','2026-10-20',['2026-10-21'],'2026-10-15'),'')});
test('365-day horizon is enforced and leap-day arithmetic works',()=>{assert.ok(validateRange('2026-10-16','2027-10-16',[],'2026-10-15'));assert.equal(addDays('2028-02-28',1),'2028-02-29');assert.equal(addDays('2028-02-28',2),'2028-03-01')});
