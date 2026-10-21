import {readFile,stat,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
for(const file of ['app.js','domain.js','airlines.js','views.js','enquiry.js','pricing.js','quote-ui.js','client.js','request.js','admin.js','hire-model.js','hire.js']) execFileSync(process.execPath,['--check',resolve(root,'dist',file)],{stdio:'inherit'});
for(const file of ['index.html','styles.css','assets/bath.jpg','assets/easyfit-black.jpg','assets/easyfit-open.jpg','assets/favicon.svg']) {
 const s=await stat(resolve(root,'dist',file));if(!s.size)throw Error('Empty asset: '+file);
}
const html=await readFile(resolve(root,'dist/index.html'),'utf8');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(m[1]))await stat(resolve(root,'dist',m[1]));
for(const file of await readdir(resolve(root,'dist'))) if(/\.(js|css|html)$/.test(file)) { const text=await readFile(resolve(root,'dist',file),'utf8'); if(/sk_live_|sk_test_|whsec_/.test(text))throw Error('Possible payment secret in public asset'); }
for(const file of ['server.mjs','security.mjs','store.mjs','setup-admin.mjs'])execFileSync(process.execPath,['--check',resolve(root,'api',file)],{stdio:'inherit'});
console.log('Build verified: public assets and VPS API JavaScript syntax checked.');
