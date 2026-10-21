let connection;
export const apiUrl=path=>new URL('api/'+path,document.baseURI).href;
export function backendInfo(){return connection??=(async()=>{try{const config=await fetch(new URL('runtime.json',document.baseURI),{cache:'no-store'});if(!config.ok||!(await config.json()).apiEnabled)return {ready:false};const response=await fetch(apiUrl('health'),{cache:'no-store'});return response.ok?await response.json():{ready:false};}catch{return {ready:false};}})();}
export async function api(path,{method='GET',body,csrf}={}){
 const response=await fetch(apiUrl(path),{method,credentials:'same-origin',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let value;try{value=await response.json();}catch{throw new Error('The rental service did not respond. Try again or email hello@bikeboxbath.co.uk.');}
 if(!response.ok){const error=new Error(value.error||'Unable to complete the request.');error.status=response.status;throw error;}return value;
}
