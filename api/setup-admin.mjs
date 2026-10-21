import {stdin,stdout} from 'node:process';
import {createInterface} from 'node:readline/promises';
import {writeFile,stat,chmod} from 'node:fs/promises';
import {resolve} from 'node:path';
import {hashPassword} from './security.mjs';
function hidden(prompt){return new Promise((resolve,reject)=>{let value='';stdout.write(prompt);stdin.setRawMode(true);stdin.resume();const handle=chunk=>{for(const ch of chunk.toString('utf8')){if(ch==='\u0003'){finish();reject(Error('Cancelled.'));return;}if(ch==='\r'||ch==='\n'){finish();resolve(value);return;}if(ch==='\u007f'||ch==='\b'){value=value.slice(0,-1);continue;}if(ch>=' '&&value.length<256)value+=ch;}};const finish=()=>{stdin.off('data',handle);stdin.setRawMode(false);stdin.pause();stdout.write('\n');};stdin.on('data',handle);});}
try{
 if(!stdin.isTTY)throw Error('Run setup in an interactive VPS terminal. Password input is hidden.');
 const target=resolve(process.argv[2]||'/etc/bikeboxbath.env');let exists=false;try{await stat(target);exists=true;}catch{}
 if(exists&&!process.argv.includes('--replace'))throw Error('Configuration exists. Use --replace only when deliberately resetting the admin account; existing sessions will be cleared by the restart instructions.');
 const rl=createInterface({input:stdin,output:stdout});
 const origin=(await rl.question('Website origin [https://bikeboxbath.co.uk]: ')).trim()||'https://bikeboxbath.co.uk';
 if(new URL(origin).origin!==origin||!origin.startsWith('https://'))throw Error('Enter an HTTPS origin without a path or trailing slash.');
 const username=(await rl.question('Admin username [admin]: ')).trim()||'admin';if(!/^[a-zA-Z0-9_.-]{3,60}$/.test(username))throw Error('Use 3–60 letters, numbers, dots, dashes or underscores.');
 rl.close();const password=await hidden('New password (minimum 14 characters): '),confirmation=await hidden('Repeat password: ');
 if(password!==confirmation)throw Error('Passwords do not match.');
 const hash=await hashPassword(password);
 await writeFile(target,['PUBLIC_ORIGIN='+origin,'ADMIN_USER='+username,'ADMIN_PASSWORD_HASH='+hash,'BBB_DATA=/var/lib/bikeboxbath/rentals.sqlite','PORT=4174',''].join('\n'),{mode:0o600,flag:exists?'w':'wx'});
 await chmod(target,0o600);
 console.log('Admin configuration saved. No plaintext password was written. Follow VPS-SETUP.md to start the service.');
}catch(error){console.error(error.message);process.exitCode=1;}finally{if(stdin.isTTY)stdin.setRawMode(false);}
