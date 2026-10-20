import { writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { openBrowser, delay } from './game-kit-cdp.js';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'artifacts', 'solid-three');
await mkdir(output, { recursive: true });
const phase = process.argv[2] || 'after';
const entries = phase === 'before' ? ['/index.html'] : ['/index.html', '/solid-three.html'];
const results = [];
for (const entry of entries) {
  const page = await openBrowser(join(root, 'dist'), { entry, artifactsPath: output, blockRemoteAI: true });
  try {
    for (let i = 0; i < 200 && !await page.evaluate('Boolean(window.__gameKit)'); i++) await delay(50);
    await page.evaluate('window.__gameKit.settings.update({language:"it",muted:true,motion:"reduced"})');
    await delay(250);
    const samples = await page.evaluate(`(async()=>{
      const values=[];
      // Same user action: switch days/months and observe its selected-state DOM update.
      for(let i=0;i<60;i++){
        const label=i%2===0?'MESI':'GIORNI';
        const button=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===label);
        if(!button)throw new Error('Missing mode '+label);
        await new Promise(resolve=>requestAnimationFrame(resolve));
        values.push(await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{observer.disconnect();reject(new Error('No DOM mode update'));},2000);
          const observer=new MutationObserver(()=>{clearTimeout(timer);observer.disconnect();resolve(performance.now()-start);});
          observer.observe(document.getElementById('root'),{attributes:true,childList:true,subtree:true,characterData:true});
          const start=performance.now();button.click();
        }));
      }
      return values;
    })()`);
    const sorted = [...samples].sort((a,b)=>a-b), mean = samples.reduce((a,b)=>a+b,0)/samples.length;
    const resources = await page.evaluate(String.raw`performance.getEntriesByType('resource').filter(e=>/\.(js|css)(\?|$)/.test(e.name)).map(e=>({name:new URL(e.name).pathname,bytes:e.decodedBodySize}))`);
    results.push({entry, samples, mean, p50:sorted[Math.floor(sorted.length*.5)], p95:sorted[Math.floor(sorted.length*.95)], ops_per_second:1000/mean, resources, errors:page.errors});
  } finally { await page.close(); }
}
await writeFile(join(output, `benchmark-${phase}.json`),JSON.stringify({timestamp:new Date().toISOString(),workload:'60 alternating mode clicks; click to first DOM mutation; warmed local desktop browser; no network AI/fonts; muted/reduced motion',runtime:process.version,results},null,2),'utf8');
console.log(JSON.stringify(results.map(({entry,mean,p50,p95,ops_per_second})=>({entry,mean,p50,p95,ops_per_second})),null,2));
