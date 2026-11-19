// Builds data/network.json from OpenStreetMap (Overpass API). Run on any computer with internet:
//   node scripts/build-data.mjs
// Then commit data/network.json. The app uses it automatically instead of the built-in sample network.
import { writeFile } from 'node:fs/promises';
import { BBOX, fromOverpass, compact, q, OVERPASS } from '../js/data.js';

async function overpass(body) {
  let err;
  for (const u of OVERPASS) {
    try {
      const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(body) });
      if (r.ok) return r.json();
      err = new Error(`${u}: ${r.status}`);
    } catch (e) { err = e; }
  }
  throw err;
}

const b = BBOX.join(',');
console.log('Fetching bus stops...');
const stops = await overpass(q(`node["highway"="bus_stop"](${b});out;`));
console.log(`  ${stops.elements.length} stop nodes`);
console.log('Fetching bus route relations (this can take a minute)...');
const routes = await overpass(q(`relation["route"="bus"](${b});out geom;`));
console.log(`  ${routes.elements.length} route relations`);

const net = fromOverpass(stops, routes);
const used = new Set(net.routes.flatMap(r => r.stops));
net.stops = net.stops.filter(s => used.has(s.id));
const out = compact(net);
await writeFile(new URL('../data/network.json', import.meta.url), JSON.stringify(out));
console.log(`Done: ${net.stops.length} stops used by ${net.routes.length} route directions (${new Set(net.routes.map(r => r.ref)).size} lines).`);
console.log('Wrote data/network.json');
