// Development-only packager. Publish index.html, manifest.webmanifest, sw.js and icons/ together.
// No npm packages required. Changing any cached asset changes the worker's build ID automatically.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const load=path=>readFile(new URL(path,import.meta.url),'utf8');
const release=JSON.parse(await load('app-version.json')).version;
const registry=JSON.stringify(JSON.parse(await load('src/hub/registry.json')));
const markers={
 '@@GAME_CSS@@':await load('src/bone-emergency/style.css'),
 '@@HUB_CSS@@':await load('src/hub/style.css'),
 '@@PWA_CSS@@':await load('src/pwa/style.css'),
 '@@GAME_DATA@@':await load('src/bone-emergency/data.json'),
 '@@GAME_ENGINE@@':await load('src/bone-emergency/engine.js'),
 '@@HUB_SCRIPT@@':(await load('src/hub/host.js')).replace('@@REGISTRY@@',()=>registry),
 '@@PWA_PANEL@@':await load('src/pwa/panel.html'),
 '@@PWA_DIALOG@@':await load('src/pwa/dialog.html'),
 '@@PWA_SCRIPT@@':await load('src/pwa/client.js'),
};
let html=await load('src/index.template.html');
for(const [marker,value] of Object.entries(markers))html=html.replace(marker,()=>value);
if(/@@[A-Z_]+@@/.test(html))throw new Error('An unresolved HTML build marker remains.');
await writeFile(new URL('index.html',import.meta.url),html);
const names=['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','icons/apple-touch-icon.png','icons/favicon-32.png'];
const hashes={};
for(const name of names){const bytes=await readFile(new URL(name,import.meta.url));hashes[name]=createHash('sha256').update(bytes).digest('hex');}
let sw=await load('src/pwa/sw.template.js');
const build=release+'-'+createHash('sha256').update(JSON.stringify(hashes)+sw).digest('hex').slice(0,12);
sw=sw.replace('@@RELEASE@@',release).replace('@@BUILD@@',build).replace('@@ASSET_HASHES@@',JSON.stringify(hashes,null,2));
if(/@@[A-Z_]+@@/.test(sw))throw new Error('An unresolved worker build marker remains.');
await writeFile(new URL('sw.js',import.meta.url),sw);
console.log('Built MRU '+build+'; index.html '+Buffer.byteLength(html)+' bytes.');
