import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHireState,collectionRange,durationRange,selectionError,requestIdentity,requestPayload} from '../dist/hire-model.js';
import {RentalStore} from '../api/store.mjs';
import {TERMS_VERSION} from '../dist/enquiry.js';

test('a collection date starts with five days and retains an existing valid return',()=>{
 assert.deepEqual(collectionRange('2026-10-24','','2026-10-20','2027-10-20'),{start:'2026-10-24',end:'2026-10-28'});
 assert.deepEqual(collectionRange('2026-10-30','2026-10-28','2026-10-20','2027-10-20'),{start:'2026-10-30',end:'2026-11-03'});
 assert.equal(collectionRange('2026-10-24','2026-11-01','2026-10-20','2027-10-20').end,'2026-11-01');
 assert.equal(collectionRange('2027-10-18','','2026-10-20','2027-10-20').end,'');
});
test('a quick hire length cannot skip a booked date or exceed the planning range',()=>{
 assert.equal(durationRange('2026-10-24',7,'2026-10-20','2027-10-20').end,'2026-10-30');
 assert.throws(()=>durationRange('2026-10-24',7,'2026-10-20','2027-10-20',['2026-10-27']),/unavailable/);
 assert.throws(()=>durationRange('2027-10-18',5,'2026-10-20','2027-10-20'),/12 months/);
 assert.match(selectionError('2026-10-24','2026-10-27','2026-10-20'),/Minimum hire/);
});
test('retries reuse a request key; changed dates, details and payment create a new one',()=>{
 const state=createHireState();let n=0;const uuid=()=>String(++n);
 const first=requestIdentity(state,uuid);assert.equal(requestIdentity(state,uuid),first);
 state.end='2026-11-07';assert.notEqual(requestIdentity(state,uuid),first);
 const second=state.requestKey;state.payment='Cash on collection';assert.notEqual(requestIdentity(state,uuid),second);
 const third=state.requestKey;state.email='other@example.test';assert.notEqual(requestIdentity(state,uuid),third);
 assert.equal(requestPayload(state).termsVersion,TERMS_VERSION);
 assert.equal('requestFingerprint' in requestPayload(state),false);
});
const input={requestKey:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',start:'2026-11-01',end:'2026-11-05',name:'Test rider',email:'test@example.test',bike:'Road bike',airline:'',message:'',payment:'PayPal'};
test('public requests require current terms and preserve consent; changed retries are rejected',()=>{
 const store=new RentalStore(':memory:');
 try{
  assert.throws(()=>store.create(input,{today:'2026-10-20'}),/accept the current hire terms/);
  assert.throws(()=>store.create({...input,acceptedTerms:true,termsVersion:'old'},{today:'2026-10-20'}),/current hire terms/);
  const accepted={...input,acceptedTerms:true,termsVersion:TERMS_VERSION};
  const result=store.create(accepted,{today:'2026-10-20'}),row=store.get(result.id);
  assert.equal(row.terms_version,TERMS_VERSION);assert.ok(Date.parse(row.terms_accepted_at));
  assert.equal(store.create(accepted,{today:'2026-10-20'}).id,row.id);
  assert.throws(()=>store.create({...accepted,end:'2026-11-06'},{today:'2026-10-20'}),/different hire details/);
 }finally{store.close();}
});
test('existing databases gain consent fields without rewriting old hire records',()=>{
 const folder=mkdtempSync(join(tmpdir(),'bbb-migration-')),file=join(folder,'rentals.sqlite');
 let store=new RentalStore(file);
 try{
  const {id}=store.create(input,{manual:true,today:'2026-10-20'});
  store.db.exec('ALTER TABLE hires DROP COLUMN terms_version; ALTER TABLE hires DROP COLUMN terms_accepted_at;');store.close();
  store=new RentalStore(file);assert.equal(store.get(id).name,'Test rider');assert.equal(store.get(id).terms_accepted_at,'');assert.equal(store.get(id).terms_version,'');
 }finally{store.close();unlinkSync(file);rmdirSync(folder);}
});
