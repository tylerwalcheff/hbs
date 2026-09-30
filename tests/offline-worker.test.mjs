/* Deterministic tests of the real generated service worker in a simulated worker runtime.
   This does NOT replace installation/offline checks in Safari and Chrome on real devices. */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const source=await readFile(root+'/sw.js','utf8');
const files=JSON.parse(source.match(/const FILES=(\{[\s\S]*?\});/)[1]);
const assets=new Map(await Promise.all(Object.keys(files).map(async n=>[n,await readFile(root+'/'+n)])));
const base='https://school.example/manikin-response-unit/';
const stores=new Map();
const cacheApi={
 async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async put(key,value){data.set(String(key),value.clone());},async match(key){return data.get(String(key))?.clone();}};},
 async keys(){return [...stores.keys()];},
 async delete(name){return stores.delete(name);}
};
function worker(code=source,scope=base){
 const events=new Map();
 const state={offline:false,claim:0,skip:0,badFile:null,requests:[]};
 const self={registration:{scope},clients:{async claim(){state.claim++;}},async skipWaiting(){state.skip++;},addEventListener(type,fn){events.set(type,fn);}};
 const ctx={self,URL,Request,Response,Uint8Array,crypto:webcrypto,caches:cacheApi,console,
  fetch:async request=>{if(state.offline)throw new TypeError('Network is offline');const url=new URL(request.url||request);state.requests.push(url.href);const name=url.pathname.slice(new URL(scope).pathname.length);const bytes=assets.get(name);return new Response(state.badFile===name?'PARTIAL DEPLOYMENT':bytes||'Not found',{status:bytes?200:404});}};
 vm.runInNewContext(code,ctx,{filename:'sw.js'});
 return {state,async event(type,extra={}){const tasks=[];let response;events.get(type)?.({waitUntil(p){tasks.push(p);},respondWith(p){response=p;},...extra});await Promise.all(tasks);return response?await response:undefined;},
 async status(type='MRU_STATUS'){let result;await this.event('message',{data:{type},source:{url:scope},ports:[{postMessage(x){result=x;}}]});return result;},
 async get(path,navigate=false){const req=new Request(new URL(path,scope));const request=navigate?new Proxy(req,{get(t,k){if(k==='mode')return 'navigate';const v=Reflect.get(t,k,t);return typeof v==='function'?v.bind(t):v;}}):req;return this.event('fetch',{request});}}
}
const checks=[];const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const first=worker();
await first.event('install');
check('All current app resources cached during first installation',(await first.status()).ready);
check('Installation never forces skipWaiting',first.state.skip===0);
await cacheApi.open('unrelated-classroom-site');
await first.event('activate');
check('New worker claims current clients',first.state.claim===1);
first.state.offline=true;
check('Root navigation opens the complete cached app offline',(await (await first.get('./',true)).text()).includes('id="content-data"'));
check('index.html with launch query works offline',(await (await first.get('index.html?launch=app',true)).text()).includes('@@')===false);
check('Manifest is available offline',JSON.parse(await (await first.get('manifest.webmanifest')).text()).display==='standalone');
check('Icon responses work offline',(await first.get('icons/icon-192.png')).status===200);
check('Requests outside project scope are not intercepted',await first.get('https://school.example/another-app/')===undefined);
check('Non-app documents are not replaced by the game',await first.get('README.md',true)===undefined);
check('POST requests are not cached',await first.event('fetch',{request:new Request(base,{method:'POST',body:'x'})})===undefined);
const secondScope=worker(source,'https://school.example/other-project/');await secondScope.event('install');await secondScope.event('activate');
const oldCacheKeys=await cacheApi.keys();
const update=worker(source.replace(/const BUILD='([^']+)'/,"const BUILD='$1-test-update'"));
await update.event('install');
check('Downloading an update keeps existing app caches',oldCacheKeys.every(k=>stores.has(k)));
check('Update waits until explicitly activated',update.state.skip===0);
await update.event('message',{data:{type:'MRU_ACTIVATE'},source:{url:base}});
check('Explicit update asks to activate',update.state.skip===1);
await update.event('activate');
check('Activation preserves unrelated caches and other project apps',stores.has('unrelated-classroom-site')&&(await secondScope.status()).ready);
check('Only old cache for this project is cleaned up',oldCacheKeys.filter(k=>k.includes(encodeURIComponent(base))).every(k=>!stores.has(k)));
const currentKeys=await cacheApi.keys();
const broken=worker(source.replace(/const BUILD='([^']+)'/,"const BUILD='$1-broken-update'"));broken.state.badFile='index.html';
let failed=false;try{await broken.event('install');}catch(_){failed=true;}
check('A mixed/partial deployment fails safely',failed);
check('Failed deployment does not delete the usable previous app',currentKeys.every(k=>stores.has(k))&&(await update.status()).ready);
// Simulate device reclaiming one cached resource; readiness must be honest and repairable.
const cacheName=(await cacheApi.keys()).find(k=>k.includes(encodeURIComponent(base)));
stores.get(cacheName).delete(base+'icons/icon-192.png');
check('Missing offline resource is not reported as ready',!(await update.status()).ready);
check('A connected repair restores the verified current release',(await update.status('MRU_REPAIR')).ready);
console.log(JSON.stringify({suite:'Generated offline worker (simulated runtime)',passed:checks.length,checks},null,2));
