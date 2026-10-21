import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {quoteHire,lateCharge} from '../dist/pricing.js';
import {todayLondon,validDate,addDays} from '../dist/domain.js';
import {validateDetails,PAYMENTS,TERMS_VERSION} from '../dist/enquiry.js';
const transitions={pending:['pending','confirmed','cancelled'],confirmed:['confirmed','collected','cancelled'],collected:['collected','returned'],returned:['returned'],cancelled:['cancelled','pending']};
export class Problem extends Error{constructor(status,message){super(message);this.status=status;}}
const fail=(status,message)=>{throw new Problem(status,message);};
const text=(v,max,required=false)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(400,'Check the required details and text lengths.');return v.trim();};
const flag=v=>v===true?1:0;
export class RentalStore{
 constructor(path){
  if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
  this.db=new DatabaseSync(path);this.db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  this.db.exec("CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,name TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1); CREATE TABLE IF NOT EXISTS hires(id TEXT PRIMARY KEY,request_key TEXT UNIQUE NOT NULL,start TEXT NOT NULL,end TEXT NOT NULL,name TEXT NOT NULL,email TEXT NOT NULL,bike TEXT NOT NULL,airline TEXT NOT NULL DEFAULT '',message TEXT NOT NULL DEFAULT '',payment TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',case_id TEXT REFERENCES cases(id),hire_pence INTEGER NOT NULL,deposit_pence INTEGER NOT NULL,daily_pence INTEGER NOT NULL,late_daily_pence INTEGER NOT NULL,paid_hire INTEGER NOT NULL DEFAULT 0,paid_deposit INTEGER NOT NULL DEFAULT 0,cash_checked INTEGER NOT NULL DEFAULT 0,id_checked INTEGER NOT NULL DEFAULT 0,collection_checked INTEGER NOT NULL DEFAULT 0,collection_notes TEXT NOT NULL DEFAULT '',return_checked INTEGER NOT NULL DEFAULT 0,return_notes TEXT NOT NULL DEFAULT '',actual_return TEXT NOT NULL DEFAULT '',late_days INTEGER NOT NULL DEFAULT 0,late_pence INTEGER NOT NULL DEFAULT 0,damage_pence INTEGER NOT NULL DEFAULT 0,damage_notes TEXT NOT NULL DEFAULT '',deposit_refunded_pence INTEGER NOT NULL DEFAULT 0,deposit_settled INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1); CREATE INDEX IF NOT EXISTS hire_dates ON hires(case_id,status,start,end); CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,csrf TEXT NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,hire_id TEXT,action TEXT NOT NULL,at TEXT NOT NULL);");
  const columns=new Set(this.db.prepare('PRAGMA table_info(hires)').all().map(c=>c.name));
  for(const name of ['terms_version','terms_accepted_at'])if(!columns.has(name))this.db.exec("ALTER TABLE hires ADD COLUMN "+name+" TEXT NOT NULL DEFAULT ''");
  this.db.prepare("INSERT OR IGNORE INTO cases(id,name,active) VALUES('easyfit-01','Easyfit 01',1)").run();
 }
 close(){this.db.close();}
 transaction(work){this.db.exec('BEGIN IMMEDIATE');try{const result=work();this.db.exec('COMMIT');return result;}catch(error){this.db.exec('ROLLBACK');throw error;}}
 audit(id,action){this.db.prepare('INSERT INTO audit(hire_id,action,at) VALUES(?,?,?)').run(id,action,new Date().toISOString());}
 limit(key,max,windowMs){
  const now=Date.now();this.db.prepare('DELETE FROM limits WHERE expires < ?').run(now);
  const row=this.db.prepare('SELECT * FROM limits WHERE key=?').get(key);
  if(row&&row.count>=max)fail(429,'Too many attempts. Try again later.');
  if(row)this.db.prepare('UPDATE limits SET count=count+1 WHERE key=?').run(key);
  else this.db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?)').run(key,now+windowMs);
 }
 create(input,{manual=false,today=todayLondon()}={}){
  const error=validateDetails(input);if(error)fail(400,error);
  if(!manual&&(input.acceptedTerms!==true||input.termsVersion!==TERMS_VERSION))fail(400,'Read and accept the current hire terms before sending your request.');
  const q=(()=>{try{return quoteHire(input.start,input.end,today,manual);}catch(e){fail(400,e.message);}})();
  const email=text(input.email,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'Enter a valid email address.');
  const requestKey=text(input.requestKey,80,true);if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey))fail(400,'Invalid request key.');
  return this.transaction(()=>{
   const existing=this.db.prepare('SELECT * FROM hires WHERE request_key=?').get(requestKey);
   if(existing){const same=existing.start===input.start&&existing.end===input.end&&existing.email===email&&existing.name===input.name.trim()&&existing.bike===input.bike.trim()&&existing.payment===input.payment&&existing.airline===(input.airline||'').trim()&&existing.message===(input.message||'').trim();if(!same)fail(409,'This request reference belongs to different hire details. Start a new request.');return {id:existing.id,quote:q,duplicate:true};}
   if(!manual&&this.blocked(input.start,input.end,today).length)fail(409,'Those dates are unavailable. Choose another range.');
   const id='BBB-'+randomBytes(8).toString('hex').toUpperCase(),now=new Date().toISOString();
   this.db.prepare('INSERT INTO hires(id,request_key,start,end,name,email,bike,airline,message,payment,hire_pence,deposit_pence,daily_pence,late_daily_pence,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,requestKey,input.start,input.end,text(input.name,100,true),email,text(input.bike,180,true),text(input.airline||'',100),text(input.message||'',1500),input.payment,q.hirePence,q.depositPence,q.dailyPence,q.lateDailyPence,now,now);
   if(input.acceptedTerms===true&&input.termsVersion===TERMS_VERSION)this.db.prepare('UPDATE hires SET terms_version=?,terms_accepted_at=? WHERE id=?').run(TERMS_VERSION,now,id);
   this.audit(id,'request-created');return {id,quote:q,duplicate:false};
  });
 }
 list(){return this.db.prepare('SELECT * FROM hires ORDER BY created_at DESC LIMIT 1000').all();}
 cases(){return this.db.prepare('SELECT * FROM cases ORDER BY name').all();}
 get(id){const row=this.db.prepare('SELECT * FROM hires WHERE id=?').get(id);if(!row)fail(404,'Hire not found.');return row;}
 caseUpdate(input){
  const id=input.id?text(input.id,80,true):'case-'+randomBytes(6).toString('hex'),name=text(input.name,100,true),active=flag(input.active);
  if(!active&&this.db.prepare("SELECT id FROM hires WHERE case_id=? AND status IN ('confirmed','collected') LIMIT 1").get(id))fail(409,'This case has active hires. Reallocate or complete them before disabling it.');
  this.db.prepare('INSERT INTO cases(id,name,active) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,active=excluded.active').run(id,name,active);return this.cases();
 }
 blocked(start,end,today=todayLondon()){
  if(!validDate(start)||!validDate(end)||end<start)return [];
  const boxes=this.cases().filter(c=>c.active),busy=this.db.prepare("SELECT case_id,start,CASE WHEN status='collected' AND end<? THEN ? ELSE end END AS end FROM hires WHERE status IN ('confirmed','collected')").all(today,today);
  const result=[];for(let d=start;d<=end;d=addDays(d,1)){if(!boxes.some(c=>!busy.some(h=>h.case_id===c.id&&h.start<=d&&h.end>=d)))result.push(d);}return result;
 }
 update(id,input,today=todayLondon()){
  return this.transaction(()=>{
   const row=this.get(id);if(input.version!==row.version)fail(409,'This hire changed in another window. Reload before saving.');
   const status=text(input.status,20,true);if(!transitions[row.status]?.includes(status))fail(400,'That status change is not allowed.');
   const start=text(input.start,10,true),end=text(input.end,10,true);let q;try{q=quoteHire(start,end,today,true);}catch(e){fail(400,e.message);}
   if(['collected','returned'].includes(row.status)&&(start!==row.start||end!==row.end||input.case_id!==row.case_id))fail(400,'Dates and case cannot change after collection.');
   const caseId=input.case_id?text(input.case_id,80):null;
   if(['confirmed','collected'].includes(status)){
    if(!caseId||!this.db.prepare('SELECT id FROM cases WHERE id=? AND active=1').get(caseId))fail(400,'Choose an active case.');
    const conflict=this.db.prepare("SELECT id FROM hires WHERE id<>? AND case_id=? AND status IN ('confirmed','collected') AND start<=? AND (CASE WHEN status='collected' AND end<? THEN ? ELSE end END)>=?").get(id,caseId,end,today,today,start);
    if(conflict)fail(409,'This case is already allocated for overlapping dates.');
   }
   if(!PAYMENTS.includes(input.payment))fail(400,'Choose a payment preference.');
   if(['collected','returned'].includes(status)&&input.payment==='To be decided')fail(400,'Record the actual payment method before collection.');
   const paidHire=flag(input.paid_hire),paidDeposit=flag(input.paid_deposit),idChecked=flag(input.id_checked),collectionChecked=flag(input.collection_checked),cashChecked=flag(input.cash_checked),returnChecked=flag(input.return_checked),settled=flag(input.deposit_settled);
   const collectionNotes=text(input.collection_notes||'',3000),returnNotes=text(input.return_notes||'',3000),damageNotes=text(input.damage_notes||'',1500);
   if(['collected','returned'].includes(status)&&(!paidHire||!paidDeposit||!idChecked||!collectionChecked||!collectionNotes||(input.payment==='Cash on collection'&&!cashChecked)))fail(400,'Collection requires verified hire payment and deposit, ID, case inspection notes and a cash check when paying cash.');
   const actualReturn=input.actual_return||'';if(actualReturn&&(!validDate(actualReturn)||actualReturn<start||actualReturn>today))fail(400,'Actual return must be between collection and today.');
   if(status==='returned'&&(!returnChecked||!returnNotes||!actualReturn))fail(400,'Record the return inspection, condition notes and actual return date.');
   const late=actualReturn?lateCharge(end,actualReturn,row.late_daily_pence):{days:0,pence:0};
   const damage=Number(input.damage_pence||0),refunded=Number(input.deposit_refunded_pence||0);
   if(!Number.isInteger(damage)||damage<0||damage>1000000||!Number.isInteger(refunded)||refunded<0||refunded>row.deposit_pence)fail(400,'Enter valid whole-penny damage and refund amounts.');
   if(damage&&!damageNotes)fail(400,'Record the reason for any damage charge.');
   const refundable=Math.max(0,row.deposit_pence-late.pence-damage);
   if(refunded>refundable)fail(400,'The recorded refund exceeds the remaining deposit.');
   if(settled&&(status!=='returned'||!paidDeposit||refunded!==refundable))fail(400,'Inspect the returned case and record the full deposit balance before marking it settled.');
   if(status!=='returned'&&(actualReturn||returnChecked||damage||refunded||settled))fail(400,'Return and settlement details require returned status.');
   this.db.prepare('UPDATE hires SET start=?,end=?,payment=?,status=?,case_id=?,hire_pence=?,paid_hire=?,paid_deposit=?,cash_checked=?,id_checked=?,collection_checked=?,collection_notes=?,return_checked=?,return_notes=?,actual_return=?,late_days=?,late_pence=?,damage_pence=?,damage_notes=?,deposit_refunded_pence=?,deposit_settled=?,updated_at=?,version=version+1 WHERE id=?').run(start,end,input.payment,status,caseId,q.hirePence,paidHire,paidDeposit,cashChecked,idChecked,collectionChecked,collectionNotes,returnChecked,returnNotes,actualReturn,late.days,late.pence,damage,damageNotes,refunded,settled,new Date().toISOString(),id);
   this.audit(id,'updated:'+row.status+'→'+status);return this.get(id);
  });
 }
 anonymise(id,version){return this.transaction(()=>{const row=this.get(id);if(row.version!==version)fail(409,'Reload before removing personal details.');if(row.status!=='cancelled'&&!(row.status==='returned'&&row.deposit_settled))fail(400,'Only cancelled or settled returned hires can be anonymised.');this.db.prepare("UPDATE hires SET name='Removed',email='',bike='',airline='',message='',collection_notes='',return_notes='',damage_notes='',updated_at=?,version=version+1 WHERE id=?").run(new Date().toISOString(),id);this.audit(id,'personal-details-removed');return this.get(id);});}
}
