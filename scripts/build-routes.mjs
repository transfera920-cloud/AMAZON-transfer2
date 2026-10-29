// 建置時：讀取後台（Firestore routes 集合）→ 產生 public/<slug>/index.html、sitemap.xml、llms.txt。
//
// 資料來源規則（重要）：
//   1. 讀得到 Firestore 且有資料        → 用 Firestore（後台編輯的內容）。
//   2. 讀得到 Firestore 但集合是空的    → 用 src/data/routes.seed.json（第一次部署，尚未在後台匯入）。
//   3. 讀取失敗（網路、權限、HTTP 錯誤）→ 建置直接失敗（exit 1），Cloudflare 會保留上一版網站，
//      不會用舊內容悄悄蓋掉後台的新內容。
//      本機離線測試可設環境變數 ROUTES_ALLOW_SEED=1，改用 seed 繼續。
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFirestore } from './permit-render.mjs';
import { fetchRoutesResilient } from './fetch-routes.mjs';
import { writeSnapshot } from './snapshot.mjs';
import { renderRoutePage, esc, SITE, DEFAULT_CONTACT, visiblePhotos, photoSrc, photosHeadingOf } from '../shared/renderRoutePage.mjs';
import { resolveHomeContent, routeCategories, cleanGroupId, resolveGroup } from '../shared/homeContent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const BASE = process.env.FIRESTORE_BASE_URL || `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`; // FIRESTORE_BASE_URL 僅供本機測試
const ALLOW_SEED = process.env.ROUTES_ALLOW_SEED === '1';

// settings/general 在一次建置裡會被好幾處用到（逐條讀取的路線清單、聯絡資料、給後面腳本的暫存），同一網址只讀一次
const settingsCache = new Map();
function getJson(url) {
  if (!/\/settings\/general\?/.test(url)) return fetchJson(url);
  if (!settingsCache.has(url)) settingsCache.set(url, fetchJson(url));
  return settingsCache.get(url);
}

async function fetchJson(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) {
      // 把 Google 回的原因一起印出來（只取訊息，不含網址與金鑰），方便判斷是規則、金鑰限制還是其他問題
      let why = '';
      try { const j = await res.json(); why = ` — ${j.error?.status || ''} ${j.error?.message || ''}`.trimEnd(); } catch { /* 沒有內容 */ }
      throw new Error(`HTTP ${res.status} ${res.statusText}${why}`);
    }
    return await res.json();
  } finally { clearTimeout(timer); }
}

async function fetchRoutes() {
  return fetchRoutesResilient({ BASE, key: cfg.apiKey, getJson, seedSlugs: loadSeed().map((r) => r.slug), tag: 'routes' });
}

async function fetchContact() {
  try {
    const j = await getJson(`${BASE}/settings/general?key=${cfg.apiKey}`);
    const d = decodeFirestore({ mapValue: { fields: j.fields || {} } });
    const c = {};
    c.categories = routeCategories(resolveHomeContent(d).blocks); // 路線分類（id、標題），用於 llms.txt 與路線頁底部的導向文字
    if (typeof d.lineUrl === 'string' && /^https?:\/\//.test(d.lineUrl)) c.lineUrl = d.lineUrl;
    if (typeof d.phone === 'string' && /^[0-9+\-\s]{6,}$/.test(d.phone.trim())) c.phone = d.phone.trim();
    return c;
  } catch (e) {
    console.warn(`[routes] 讀取聯絡資料失敗，使用預設值：${e.message}`);
    return {};
  }
}

function loadSeed() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'routes.seed.json'), 'utf8'));
}

function normalize(r) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  return {
    ...r,
    published: r.published !== false,
    group: cleanGroupId(r.group) || 'popular',
    order: Number(r.order) || 0,
    sections: arr(r.sections),
    faq: arr(r.faq),
    articles: arr(r.articles),
    photos: arr(r.photos),
    video: r.video && typeof r.video === 'object' ? { ...r.video, summary: arr(r.video.summary) } : {},
    prep: r.prep && typeof r.prep === 'object' ? r.prep : { heading: '', body: '' },
    updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(r.updatedAt || '') ? r.updatedAt : new Date().toISOString().slice(0, 10),
  };
}

// ---------- 取得資料 ----------
let routes;
let source;
try {
  routes = await fetchRoutes();
  if (routes.length) {
    source = 'Firestore';
    // 把這次讀到的資料存成暫存檔，build-home / build-permit 直接沿用，不再各讀一次 Firestore
    let rawSettings = null;
    try {
      const j = await getJson(`${BASE}/settings/general?key=${cfg.apiKey}`);
      rawSettings = decodeFirestore({ mapValue: { fields: j.fields || {} } }) || {};
    } catch { /* 讀不到就讓後面的腳本自己處理 */ }
    writeSnapshot(ROOT, { base: BASE, routes, settings: rawSettings });
    // 訪客一律讀這份靜態檔（/site-settings.json），不直接讀 Firestore，讀取次數不再隨流量成長
    if (rawSettings && Object.keys(rawSettings).length) {
      try {
        fs.mkdirSync(PUB, { recursive: true });
        fs.writeFileSync(path.join(PUB, 'site-settings.json'), JSON.stringify(rawSettings));
        console.log('[routes] 已輸出 public/site-settings.json（訪客用，免讀資料庫）');
      } catch (e) { console.warn(`[routes] 無法輸出 site-settings.json：${e.message}`); }
    }
  }
  else { routes = loadSeed(); source = 'seed（Firestore routes 集合是空的，請到後台「路線內容管理」匯入預設路線）'; }
} catch (e) {
  if (ALLOW_SEED) {
    console.warn(`[routes] 讀取 Firestore 失敗（${e.message}），ROUTES_ALLOW_SEED=1，改用 seed`);
    routes = loadSeed();
    source = 'seed（離線）';
  } else {
    console.error(`[routes] ✗ 讀取 Firestore 失敗：${e.message}`);
    console.error('[routes]   為避免用舊內容覆蓋網站，建置中止。請稍後重試；本機離線測試可設 ROUTES_ALLOW_SEED=1。');
    process.exit(1);
  }
}
routes = routes.filter((r) => r && typeof r.slug === 'string').map(normalize);


// ---------- 後台匯入的照片（data URL）→ 存成 public/images/trailheads/ 圖檔，並把網址改成站內路徑 ----------
// 檔名 = 路線代稱 + 內容雜湊，內容不變就不會重複產生；換照片就會是新檔名（瀏覽器不會沿用舊圖）。
{
  const dir = path.join(PUB, 'images', 'trailheads');
  let n = 0;
  for (const r of routes) {
    for (const p of r.photos || []) {
      const m = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(String(p && p.url || '').trim());
      if (!m) continue;
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const buf = Buffer.from(m[2], 'base64');
      const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
      const name = `${r.slug}-${hash}.${ext}`;
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), buf);
      p.url = `/images/trailheads/${name}`;
      n++;
    }
  }
  if (n) console.log(`[routes] 已把 ${n} 張後台匯入的照片存成 /images/trailheads/ 圖檔`);
}

// ---------- SEO 覆蓋檔 ----------
// src/data/seoOverrides.json 有寫的路線，H1／SEO 標題／SEO 描述以該檔為準（優先於後台）。不需要時刪掉該路線或整個檔案。
try {
  const ov = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'seoOverrides.json'), 'utf8'));
  let n = 0;
  for (const r of routes) {
    const o = ov[r.slug];
    if (!o || typeof o !== 'object') continue;
    for (const k of ['h1', 'metaTitle', 'metaDescription']) if (typeof o[k] === 'string' && o[k].trim()) r[k] = o[k].trim();
    n++;
  }
  console.log(`[routes] 套用 seoOverrides.json：${n} 條路線`);
} catch (e) {
  if (e.code !== 'ENOENT') console.warn(`[routes] 讀取 seoOverrides.json 失敗，略過：${e.message}`);
}
routes.sort((a, b) => a.order - b.order);
console.log(`[routes] 資料來源：${source}；共 ${routes.length} 條路線`);

const contact = await fetchContact();
const haveCategories = !!(contact.categories && contact.categories.length); // 讀不到後台設定時，不要把自訂分類的路線誤歸到「更多」
const categories = haveCategories ? contact.categories : routeCategories(resolveHomeContent({}).blocks);
const categoryTitles = Object.fromEntries(categories.map((c) => [c.id, c.title]));
const groupIds = new Set(categories.map((c) => c.id));
delete contact.categories;
// 路線的分類被刪除（代號不在分類清單）時，與首頁一樣歸到「更多」
if (haveCategories) for (const r of routes) r.group = resolveGroup(r.group, groupIds);
const SLUG_RE = /^[a-z0-9-]+$/;
const published = [];
let written = 0;

for (const r of routes) {
  if (!SLUG_RE.test(r.slug) || r.slug === 'permit') { console.warn(`[routes] 略過不合法的 slug：${r.slug}`); continue; }
  const dir = path.join(PUB, r.slug);
  const file = path.join(dir, 'index.html');
  if (!r.published) {
    if (fs.existsSync(file)) { fs.rmSync(file); try { fs.rmdirSync(dir); } catch { /* 目錄不空就保留 */ } }
    console.log(`[routes] ${r.slug}: 未發布，不輸出頁面`);
    continue;
  }
  if (!r.h1 || !r.metaTitle || !r.metaDescription) { console.warn(`[routes] ${r.slug}: H1／SEO 標題／SEO 描述缺漏，略過（保留原檔）`); continue; }
  published.push(r);
}
for (const r of published) {
  const html = renderRoutePage(r, { routes: published, contact, categoryTitles, categories });
  const dir = path.join(PUB, r.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  written++;
}
console.log(`[routes] 已輸出 ${written} 個路線頁`);

// ---------- sitemap.xml ----------
const maxDate = published.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), '0000-00-00');
const imagesOf = (r) =>
  visiblePhotos(r).map((p) => {
    const u = photoSrc(p.url);
    return u.startsWith('/') ? `${SITE}${u}` : u;
  });
const urls = [
  { loc: `${SITE}/`, lastmod: maxDate, images: [] },
  ...published.map((r) => ({ loc: `${SITE}/${r.slug}/`, lastmod: r.updatedAt, images: imagesOf(r) })),
  { loc: `${SITE}/permit/`, lastmod: maxDate, images: [] },
];
fs.writeFileSync(
  path.join(PUB, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${esc(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n` +
          u.images.map((i) => `    <image:image>\n      <image:loc>${esc(i)}</image:loc>\n    </image:image>\n`).join('') +
          `  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`
);

// ---------- llms.txt（只換兩個路線清單，其餘手寫文字保留） ----------
const llmsPath = path.join(PUB, 'llms.txt');
if (fs.existsSync(llmsPath)) {
  let t = fs.readFileSync(llmsPath, 'utf8');
  const line = (r) => `- [${r.listName || r.name}](${SITE}/${r.slug}/)`;
  const inGroup = (g) => published.filter((r) => resolveGroup(r.group, groupIds) === g);
  const swap = (heading, body) => {
    const re = new RegExp(`(## ${heading}\\n)[\\s\\S]*?(?=\\n## |$)`);
    if (!re.test(t)) { console.warn(`[routes] llms.txt 找不到「## ${heading}」，略過`); return false; }
    t = t.replace(re, (_, h) => `${h}${body}\n`);
    return true;
  };
  swap('路線頁', inGroup('popular').map(line).join('\n'));
  swap('更多百岳路線', inGroup('more').map(line).join('\n'));
  // 後台新增的分類：在「更多百岳路線」後面各自輸出一個 ## 分類標題 段落（先清掉上次產生的，再重寫）
  t = t.replace(/\n## [^\n]*\n<!--CATEGORY:[^>]*-->[\s\S]*?(?=\n## |$)/g, '');
  const extra = categories
    .filter((c) => c.id !== 'popular' && c.id !== 'more' && inGroup(c.id).length)
    .map((c) => `\n## ${c.title}\n<!--CATEGORY:${c.id}-->\n${inGroup(c.id).map(line).join('\n')}\n`)
    .join('');
  if (extra) t = t.replace(/(## 更多百岳路線\n[\s\S]*?\n)(?=\n## |$)/, (m) => `${m}${extra}`);
  fs.writeFileSync(llmsPath, t);
}
// ---------- llms-full.txt（所有已發布路線的完整文字，給 AI 一次讀完；每次建置自動重寫） ----------
{
  const strip = (t = '') => String(t).replace(/\+\+([^+]+?)\+\+/g, '$1').replace(/\r/g, '').trim();
  const line = (t) => String(t || '').replace(/\s*\n\s*/g, ' ').trim();
  const lineUrl = contact.lineUrl || DEFAULT_CONTACT.lineUrl;
  const phone = contact.phone || DEFAULT_CONTACT.phone;
  const parts = [
    `# 亞馬遜高山接駁（登山接駁）：全站路線完整內容`,
    `> 本檔彙整 ${SITE} 所有已發布路線頁的文字內容，供 AI 與搜尋引擎一次閱讀。各路線的最新版本以網址對應的頁面為準。`,
    `預約：LINE ${lineUrl} ｜ 電話 ${phone}`,
  ];
  for (const r of published) {
    const out = [`\n---\n\n## ${r.h1}`, `網址：${SITE}/${r.slug}/`, `最後更新：${r.updatedAt}`, '', strip(r.intro)];
    for (const sec of r.sections || []) {
      if (!sec || !String(sec.body || '').trim()) continue;
      out.push('', `### ${line(sec.heading)}`, strip(sec.body));
    }
    const ph = visiblePhotos(r);
    if (ph.length) out.push('', `### ${line(photosHeadingOf(r))}`, ...ph.map((p) => `- ${line(p.alt)}${p.caption ? `（${line(p.caption)}）` : ''}`));
    const faq = (r.faq || []).filter((f) => f && f.q && f.a);
    if (faq.length) out.push('', '### 常見問題', ...faq.flatMap((f) => ['', `Q：${line(f.q)}`, `A：${strip(f.a)}`]));
    if (r.prep && (r.prep.heading || r.prep.body)) out.push('', `### ${line(r.prep.heading)}`, strip(r.prep.body));
    parts.push(out.join('\n'));
  }
  fs.writeFileSync(path.join(PUB, 'llms-full.txt'), parts.join('\n') + '\n');
  console.log(`[routes] 已輸出 llms-full.txt（${published.length} 條路線）`);
}
console.log('[routes] 完成');
