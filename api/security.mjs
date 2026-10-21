import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const options={N:131072,r:8,p:1,maxmem:256*1024*1024};
export const token=()=>randomBytes(32).toString('hex');
export const digest=value=>createHash('sha256').update(String(value)).digest('hex');
export function equal(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);}
export async function hashPassword(password){
 if(typeof password!=='string'||password.length<14||password.length>256)throw new Error('Use a password of 14–256 characters.');
 const salt=randomBytes(16).toString('hex'),key=await derive(password,salt,64,options);
 return 'scrypt1:'+salt+':'+key.toString('hex');
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>256)return false;
 const parts=String(encoded||'').split(':');
 if(parts.length!==3||parts[0]!=='scrypt1'||!/^[a-f0-9]{32}$/.test(parts[1])||!/^[a-f0-9]{128}$/.test(parts[2]))return false;
 const key=await derive(password,parts[1],64,options);return equal(key.toString('hex'),parts[2]);
}
export function sessionCookie(value,dev=false,maxAge=28800){return (dev?'bbb_admin_dev':'__Host-bbb_admin')+'='+value+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(dev?'':'; Secure');}
export function sessionToken(header,dev=false){const key=dev?'bbb_admin_dev':'__Host-bbb_admin';for(const pair of String(header||'').split(';')){const [name,...value]=pair.trim().split('=');if(name===key)return value.join('=');}return '';}
