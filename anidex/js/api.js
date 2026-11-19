// AniList GraphQL client with in-memory + localStorage cache (rate-limit friendly).
import { API_URL } from './config.js';

const CARD = `id title{romaji english native} coverImage{large extraLarge color} averageScore episodes format seasonYear genres status`;
const CP = 'anidex:v1:c:';
const mem = new Map();

function lsGet(key) { try { return JSON.parse(localStorage.getItem(CP + key)); } catch { return null; } }
function lsSet(key, val) {
  try {
    localStorage.setItem(CP + key, JSON.stringify(val));
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CP));
    if (keys.length > 60) {
      keys.map(k => [k, (JSON.parse(localStorage.getItem(k)) || {}).ts || 0]).sort((a, b) => a[1] - b[1])
        .slice(0, keys.length - 50).forEach(([k]) => localStorage.removeItem(k));
    }
  } catch { /* storage full */ }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

export class ApiError extends Error { constructor(kind, msg) { super(msg || kind); this.kind = kind; } }

async function post(query, variables, token, attempt = 0) {
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify({ query, variables }),
    });
  } catch { throw new ApiError('network'); }
  if (res.status === 429 && attempt < 2) {
    const wait = Math.min(Number(res.headers.get('Retry-After')) || 2, 6);
    await sleep(wait * 1000);
    return post(query, variables, token, attempt + 1);
  }
  let json = null;
  try { json = await res.json(); } catch { /* not json */ }
  if (!res.ok || !json || json.errors) throw new ApiError(res.status === 429 ? 'rate' : 'api', json?.errors?.[0]?.message);
  return json.data;
}

// ttl in minutes; 0 = no cache. Falls back to stale cache when offline.
async function gql(query, variables = {}, { ttl = 30, token } = {}) {
  const clean = Object.fromEntries(Object.entries(variables).filter(([, v]) => v != null));
  const key = btoa(unescape(encodeURIComponent(query.replace(/\s+/g, ' ') + JSON.stringify(clean)))).slice(-64) + query.length;
  const now = Date.now();
  if (ttl) {
    const m = mem.get(key) || lsGet(key);
    if (m && now - m.ts < ttl * 60000) { mem.set(key, m); return m.data; }
  }
  try {
    const data = await post(query, clean, token);
    if (ttl) { const e = { ts: now, data }; mem.set(key, e); lsSet(key, e); }
    return data;
  } catch (err) {
    const stale = mem.get(key) || lsGet(key);
    if (stale && err.kind === 'network') return stale.data;
    throw err;
  }
}

// ---- normalisation ----
export function norm(m) {
  const title = m.title || {};
  return {
    id: m.id,
    title: title.english || title.romaji || title.native || '—',
    romaji: title.romaji, native: title.native,
    cover: m.coverImage?.extraLarge || m.coverImage?.large || null,
    coverSm: m.coverImage?.large || m.coverImage?.extraLarge || null,
    color: m.coverImage?.color || null,
    score: m.averageScore ? Math.round(m.averageScore) / 10 : null,
    episodes: m.episodes ?? null, format: m.format || null, year: m.seasonYear || m.startDate?.year || null,
    genres: m.genres || [], status: m.status || null,
  };
}

const PAGE_Q = `query($page:Int,$perPage:Int,$sort:[MediaSort],$genre:String,$tag:String,$season:MediaSeason,$year:Int,$search:String){
  Page(page:$page,perPage:$perPage){pageInfo{hasNextPage} media(type:ANIME,isAdult:false,sort:$sort,genre:$genre,tag:$tag,season:$season,seasonYear:$year,search:$search){${CARD}}}}`;

export async function page(opts = {}) {
  const { ttl = 30, ...v } = opts;
  const d = await gql(PAGE_Q, { perPage: 12, page: 1, ...v }, { ttl });
  return { items: d.Page.media.map(norm), hasNext: d.Page.pageInfo.hasNextPage };
}

export function currentSeason(date = new Date()) {
  const m = date.getMonth() + 1, y = date.getFullYear();
  const season = m <= 3 ? 'WINTER' : m <= 6 ? 'SPRING' : m <= 9 ? 'SUMMER' : 'FALL';
  return { season, year: y };
}

export const trending = (extra = {}) => page({ sort: ['TRENDING_DESC'], ...extra });
export const popularBy = (filter, extra = {}) => page({ sort: ['POPULARITY_DESC'], ...filter, ...extra });
export const newSeason = (extra = {}) => { const s = currentSeason(); return page({ sort: ['POPULARITY_DESC'], season: s.season, year: s.year, ...extra }); };
export const search = (q, extra = {}) => page({ search: q, sort: ['SEARCH_MATCH'], perPage: 20, ttl: 60, ...extra });

export async function random(count = 8) {
  const p = 1 + Math.floor(Math.random() * 40);
  const r = await page({ sort: ['POPULARITY_DESC'], page: p, perPage: 24, ttl: 0 });
  const a = r.items.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, count);
}

const DETAIL_Q = `query($id:Int){Media(id:$id,type:ANIME){
  ${CARD} bannerImage description(asHtml:false) season startDate{year} duration source popularity
  trailer{id site thumbnail}
  studios(isMain:true){nodes{name}}
  nextAiringEpisode{episode airingAt}
  externalLinks{site url type color isDisabled language}
  recommendations(perPage:10,sort:RATING_DESC){nodes{mediaRecommendation{${CARD}}}}
}}`;

export function cleanDescription(raw) {
  if (!raw) return '';
  let s = String(raw).replace(/<br\s*\/?>/gi, '\n').replace(/<\/?(i|b|em|strong|u|s|span|p|div)[^>]*>/gi, '');
  s = s.replace(/~!([\s\S]*?)!~/g, '');                 // spoilers
  s = s.replace(/<[^>]+>/g, '');
  const ta = document.createElement('textarea'); ta.innerHTML = s; s = ta.value; // decode entities (plain text only)
  s = s.replace(/\(Source:[^)]*\)/gi, '').replace(/\[Written by[^\]]*\]/gi, '');
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

export async function detail(id) {
  const d = await gql(DETAIL_Q, { id: Number(id) }, { ttl: 180 });
  const m = d.Media; const base = norm(m);
  return {
    ...base,
    banner: m.bannerImage || null,
    description: cleanDescription(m.description),
    season: m.season || null, duration: m.duration || null, source: m.source || null,
    studio: m.studios?.nodes?.[0]?.name || null,
    trailer: m.trailer && m.trailer.id ? { id: m.trailer.id, site: m.trailer.site } : null,
    next: m.nextAiringEpisode ? { episode: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt * 1000 } : null,
    links: (m.externalLinks || []).filter(l => l.type === 'STREAMING' && !l.isDisabled && /^https:\/\//.test(l.url || '')),
    similar: (m.recommendations?.nodes || []).map(n => n.mediaRecommendation).filter(Boolean).map(norm).slice(0, 10),
  };
}

export async function viewer(token) {
  const d = await gql('query{Viewer{id name avatar{large medium}}}', {}, { ttl: 0, token });
  return { name: d.Viewer.name, avatar: d.Viewer.avatar?.large || d.Viewer.avatar?.medium || null };
}
