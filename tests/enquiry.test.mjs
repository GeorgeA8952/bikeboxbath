import test from 'node:test';
import assert from 'node:assert/strict';
import {enquiryMailto,enquiryText,validateDetails,escapeHtml} from '../dist/enquiry.js';
const today='2026-10-19';
const enquiry={start:'2026-11-03',end:'2026-11-09',name:'Test rider',email:'rider@example.test',bike:'Road bike, 56 cm',airline:'easyJet',payment:'Cash on collection',message:'Please check fit & collection.'};
test('email enquiry uses the supplied address and preserves dates, bike and payment',()=>{
 const url=new URL(enquiryMailto(enquiry,today));
 assert.equal(url.pathname,'hello@bikeboxbath.co.uk');
 assert.match(url.searchParams.get('body'),/Calendar days.*: 7/);
 assert.match(url.searchParams.get('body'),/Cash on collection/);
 assert.match(url.searchParams.get('body'),/Road bike, 56 cm/);
 assert.match(url.searchParams.get('body'),/Hire quote: £77/);
});
test('user characters cannot create another recipient or mail header',()=>{
 const link=enquiryMailto({...enquiry,name:'Name & bcc=other@example.com',message:'?cc=other@example.com\r\n<script>alert(1)</script>'},today);
 const url=new URL(link);assert.equal(url.searchParams.get('bcc'),null);assert.equal(url.searchParams.get('cc'),null);
 assert.equal([...url.searchParams.keys()].length,2);
 assert.equal(escapeHtml('<img src=x onerror="bad">'), '&lt;img src=x onerror=&quot;bad&quot;&gt;');
});
test('reversed and past rental dates cannot become an enquiry',()=>{
 assert.throws(()=>enquiryText({...enquiry,end:'2026-11-01'},today),/Return must/);
 assert.throws(()=>enquiryText({...enquiry,start:'2026-10-18'},today),/Collection must/);
});
test('missing bike details and unrecognised payment preferences are rejected',()=>{
 assert.match(validateDetails({...enquiry,bike:'   '}),/bike model/);
 assert.match(validateDetails({...enquiry,payment:'unrecognised'}),/listed payment/);
});
test('a copied draft does not claim terms acceptance until the checkbox was selected',()=>{
 assert.doesNotMatch(enquiryText(enquiry,today),/I have read and accepted/);
 assert.match(enquiryText({...enquiry,acceptedTerms:true},today),/I have read and accepted/);
});
