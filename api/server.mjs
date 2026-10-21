import {createServer} from 'node:http';
import {isIP} from 'node:net';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {RentalStore,Problem} from './store.mjs';
import {token,digest,equal,verifyPassword,sessionCookie,sessionToken} from './security.mjs';
import {PRICING} from '../dist/pricing.js';
import {todayLondon,validDate,addDays} from '../dist/domain.js';
function readJson(req){return new Promise((resolve,reject)=>{if(!String(req.headers['content-type']||'').startsWith('application/json'))return reject(new Problem(415,'Use JSON requests.'));let size=0,over=false,chunks=[];req.on('data',chunk=>{size+=chunk.length;if(size>16384){if(!over)reject(new Problem(413,'Request is too large.'));over=true;chunks=[];}else if(!over)chunks.push(chunk);});req.on('end',()=>{if(over)return;try{const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();resolve(value);}catch{reject(new Problem(400,'Invalid request.'));}});req.on('error',()=>reject(new Problem(400,'Incomplete request.')));});}
export function createApi({dataPath,origin,adminUser,passwordHash,dev=false}){
 const expectedOrigin=new URL(origin).origin;
 if(!dev&&!expectedOrigin.startsWith('https://'))throw Error('Production PUBLIC_ORIGIN must use HTTPS.');
 const ready=Boolean(adminUser&&/^scrypt1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash||''));
 let inFlightLogins=0;
 const store=new RentalStore(dataPath);store.db.prepare('DELETE FROM sessions').run();
 function json(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...headers});res.end(JSON.stringify(body));}
 function originCheck(req){if(req.headers.origin!==expectedOrigin)throw new Problem(403,'This request must come from the website.');}
 function session(req){
  const raw=sessionToken(req.headers.cookie,dev);if(!/^[a-f0-9]{64}$/.test(raw))throw new Problem(401,'Sign in to continue.');
  const entry=store.db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(digest(raw),Date.now());
  if(!entry)throw new Problem(401,'Your session has expired. Sign in again.');return entry;
 }
 function adminWrite(req){originCheck(req);const entry=session(req);if(!equal(req.headers['x-csrf-token'],entry.csrf))throw new Problem(403,'Reload the admin page before saving.');return entry;}
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname.replace(/^\/(?:home\/)?api(?=\/|$)/,'')||'/';
   const remote=req.socket.remoteAddress||'',forward=String(req.headers['x-real-ip']||''),ip=(remote==='127.0.0.1'||remote==='::1'||remote==='::ffff:127.0.0.1')&&isIP(forward)?forward:remote;
   if(req.method==='GET'&&path==='/health')return json(res,200,{ready,pricing:PRICING});
   if(!ready)throw new Problem(503,'Admin service needs configuration.');
   if(req.method==='GET'&&path==='/availability'){
    const start=url.searchParams.get('start'),end=url.searchParams.get('end'),today=todayLondon();
    if(!validDate(start)||!validDate(end)||start<today||end<start||end>addDays(today,365))throw new Problem(400,'Choose a valid planning range.');
    store.limit('availability:'+digest(ip),120,60000);return json(res,200,{blocked:store.blocked(start,end,today)});
   }
   if(req.method==='POST'&&path==='/requests'){
    originCheck(req);store.limit('request:'+digest(ip),8,3600000);store.limit('request-global',100,3600000);
    const input=await readJson(req);if(input.website)throw new Problem(400,'Invalid request.');
    const result=store.create(input);return json(res,result.duplicate?200:201,{id:result.id,quote:result.quote,status:'pending'});
   }
   if(req.method==='POST'&&path==='/login'){
    originCheck(req);store.limit('login:'+digest(ip),5,900000);store.limit('login-global',30,900000);
    const input=await readJson(req);if(inFlightLogins>=2)throw new Problem(429,'Sign-in is busy. Try again shortly.');let valid;inFlightLogins++;try{valid=await verifyPassword(input.password,passwordHash);}finally{inFlightLogins--;}
    if(!valid||!equal(input.username,adminUser))throw new Problem(401,'Incorrect sign-in details.');
    const raw=token(),csrf=token();store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    store.db.prepare('INSERT INTO sessions(hash,csrf,expires) VALUES(?,?,?)').run(digest(raw),csrf,Date.now()+28800000);
    return json(res,200,{authenticated:true,csrf},{'Set-Cookie':sessionCookie(raw,dev)});
   }
   if(req.method==='GET'&&path==='/session'){let entry;try{entry=session(req);}catch(error){if(error.status===401)return json(res,200,{authenticated:false});throw error;}return json(res,200,{authenticated:true,csrf:entry.csrf});}
   if(req.method==='POST'&&path==='/logout'){const entry=adminWrite(req);store.db.prepare('DELETE FROM sessions WHERE hash=?').run(entry.hash);return json(res,200,{ok:true},{'Set-Cookie':sessionCookie('',dev,0)});}
   if(req.method==='GET'&&path==='/hires'){session(req);return json(res,200,{hires:store.list(),cases:store.cases(),pricing:PRICING});}
   if(req.method==='POST'&&path==='/hires'){adminWrite(req);return json(res,201,store.create(await readJson(req),{manual:true}));}
   if(req.method==='POST'&&path==='/cases'){adminWrite(req);return json(res,200,{cases:store.caseUpdate(await readJson(req))});}
   const hirePath=path.match(/^\/hires\/(BBB-[A-F0-9]{16})(\/anonymise)?$/);
   if(hirePath&&req.method==='PATCH'&&!hirePath[2]){adminWrite(req);return json(res,200,{hire:store.update(hirePath[1],await readJson(req))});}
   if(hirePath&&req.method==='POST'&&hirePath[2]){adminWrite(req);const input=await readJson(req);return json(res,200,{hire:store.anonymise(hirePath[1],input.version)});}
   throw new Problem(404,'Endpoint not found.');
  }catch(error){if(res.headersSent)return res.end();if(!error.status)console.error('API request failed. Review server health; request data has not been logged.');json(res,error.status||500,{error:error.status?error.message:'Unable to complete the request.'});}
 });
 server.headersTimeout=10000;server.requestTimeout=15000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=100;
 return {server,store,close:async()=>{await new Promise(resolve=>server.close(resolve));store.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 process.umask(0o077);
 const dev=process.env.BBB_DEV==='1',port=Number(process.env.PORT||4174);
 const app=createApi({dataPath:process.env.BBB_DATA||'/var/lib/bikeboxbath/rentals.sqlite',origin:process.env.PUBLIC_ORIGIN||(dev?'http://127.0.0.1:4173':''),adminUser:process.env.ADMIN_USER,passwordHash:process.env.ADMIN_PASSWORD_HASH,dev});
 app.server.listen(port,'127.0.0.1',()=>console.log('Rental API listening on loopback port '+port+'.'));
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
