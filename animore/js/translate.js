// Machine translation of anime synopses (English -> Mongolian).
// Results are cached on the device, so each synopsis is translated once and then works offline.
const KEY = 'animore:v1:tr:';
const MAX_ENTRIES = 80;
const CHUNK = 450;          // MyMemory limit is 500 bytes per request, so we stay under it
const inflight = new Map();

const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };

function read(id) { try { return JSON.parse(localStorage.getItem(KEY + id)); } catch { return null; } }
function write(id, h, text) {
  try {
    localStorage.setItem(KEY + id, JSON.stringify({ h, t: text, ts: Date.now() }));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(KEY));
    if (keys.length > MAX_ENTRIES) {
      keys.map(k => [k, (JSON.parse(localStorage.getItem(k)) || {}).ts || 0]).sort((a, b) => a[1] - b[1])
        .slice(0, keys.length - MAX_ENTRIES + 10).forEach(([k]) => localStorage.removeItem(k));
    }
  } catch { /* storage full: translation still shown this session */ }
}

// Cached translation for this exact source text, or null.
export function cached(id, source) {
  const e = read(id);
  return e && e.h === hash(source) && e.t ? e.t : null;
}

// Split into pieces under CHUNK chars, preferring sentence boundaries.
function pieces(para) {
  if (para.length <= CHUNK) return [para];
  const out = []; let cur = '';
  for (const s of para.match(/[^.!?。]+[.!?。]*\s*/g) || [para]) {
    if ((cur + s).length > CHUNK && cur) { out.push(cur.trim()); cur = ''; }
    if (s.length > CHUNK) { for (let i = 0; i < s.length; i += CHUNK) out.push(s.slice(i, i + CHUNK).trim()); }
    else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function getJSON(url) {
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } finally { clearTimeout(to); }
}

async function viaGoogle(q) {
  const j = await getJSON(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=mn&dt=t&q=${encodeURIComponent(q)}`);
  const out = (j && j[0] || []).map(s => s && s[0] || '').join('');
  if (!out.trim()) throw new Error('empty');
  return out;
}
async function viaMyMemory(q) {
  const j = await getJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=en|mn`);
  const out = j && j.responseData && j.responseData.translatedText;
  if (!out || Number(j.responseStatus) !== 200 || /MYMEMORY WARNING|INVALID/i.test(out)) throw new Error('mymemory');
  return out;
}
async function one(q) { try { return await viaGoogle(q); } catch { return await viaMyMemory(q); } }

// Translate `source` (plain text, paragraphs separated by blank lines). Throws if every provider fails.
export function translate(id, source) {
  const hit = cached(id, source); if (hit) return Promise.resolve(hit);
  const k = id + ':' + hash(source);
  if (inflight.has(k)) return inflight.get(k);
  const p = (async () => {
    const paras = source.split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
    const done = await Promise.all(paras.map(async para => (await Promise.all(pieces(para).map(one))).join(' ')));
    const text = done.join('\n\n');
    write(id, hash(source), text);
    return text;
  })().finally(() => inflight.delete(k));
  inflight.set(k, p);
  return p;
}
