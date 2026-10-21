// 建置時：讀取後台（Firestore）→ 更新首頁。
//   1. routes 集合            → 首頁「熱門／更多」路線清單、JSON-LD 的服務目錄
//   2. settings/general       → homeBlocks（區塊順序與文字）、homeFaq（首頁常見問題）
//   3. 輸出
//        index.html                    靜態 HTML（給爬蟲與初次載入）與 FAQPage 結構化資料
//        src/data/home.generated.json  React 首頁用的路線清單（確保畫面與靜態 HTML 同一份、連結一定存在）
//
// 資料來源規則與 build-routes.mjs 相同：
//   - 讀得到 Firestore → 用後台資料（欄位還沒存過就用預設內容）
//   - routes 集合是空的 → 用 src/data/routes.seed.json
//   - 讀取失敗 → 建置直接失敗（Cloudflare 保留上一版網站）；本機離線測試可設 ROUTES_ALLOW_SEED=1
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFirestore } from './permit-render.mjs';
import { resolveHomeContent, buildHomeRoutes, applyHomeToIndexHtml, routeCategories } from '../shared/homeContent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const BASE = process.env.FIRESTORE_BASE_URL || `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
const ALLOW_SEED = process.env.ROUTES_ALLOW_SEED === '1';

async function getJson(url) {
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
  const out = [];
  let token = '';
  do {
    const j = await getJson(`${BASE}/routes?pageSize=100&key=${cfg.apiKey}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
    for (const d of j.documents || []) out.push(decodeFirestore({ mapValue: { fields: d.fields || {} } }));
    token = j.nextPageToken || '';
  } while (token);
  return out;
}

async function fetchSettings() {
  try {
    const j = await getJson(`${BASE}/settings/general?key=${cfg.apiKey}`);
    return decodeFirestore({ mapValue: { fields: j.fields || {} } }) || {};
  } catch (e) {
    if (ALLOW_SEED || /HTTP 404/.test(e.message)) {
      console.warn(`[home] 讀取 settings/general 失敗（${e.message}），首頁文字使用預設內容`);
      return {};
    }
    throw e;
  }
}

const loadSeed = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'routes.seed.json'), 'utf8'));

let routes;
let settings;
let source;
try {
  routes = await fetchRoutes();
  settings = await fetchSettings();
  if (routes.length) source = 'Firestore';
  else { routes = loadSeed(); source = 'seed（Firestore routes 集合是空的）'; }
} catch (e) {
  if (ALLOW_SEED) {
    console.warn(`[home] 讀取 Firestore 失敗（${e.message}），ROUTES_ALLOW_SEED=1，改用 seed 與預設文字`);
    routes = loadSeed();
    settings = {};
    source = 'seed（離線）';
  } else {
    console.error(`[home] ✗ 讀取 Firestore 失敗：${e.message}`);
    console.error('[home]   為避免用舊內容覆蓋網站，建置中止。請稍後重試；本機離線測試可設 ROUTES_ALLOW_SEED=1。');
    process.exit(1);
  }
}

routes = routes.filter((r) => r && typeof r.slug === 'string' && /^[a-z0-9-]+$/.test(r.slug));
const content = resolveHomeContent(settings);
const categories = routeCategories(content.blocks); // 路線分類 = 首頁的「路線清單」區塊（後台「首頁內容」分頁新增、改名、刪除）
const homeRoutes = buildHomeRoutes(routes, categories.map((c) => c.id));
const allPublished = routes
  .filter((r) => r.published !== false && r.h1 && r.metaTitle && r.metaDescription) // 與 build-routes.mjs 的上線條件一致
  .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

// 只列出真的會有頁面的路線（缺 H1 / SEO 欄位的路線 build-routes 不會輸出頁面）
const live = new Set(allPublished.map((r) => r.slug));
const keepLive = (list) => list.filter((r) => live.has(r.slug));
const finalRoutes = Object.fromEntries(Object.entries(homeRoutes).map(([g, list]) => [g, keepLive(list)]));

const indexPath = path.join(ROOT, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const next = applyHomeToIndexHtml(html, content, finalRoutes, allPublished);
if (next !== html) fs.writeFileSync(indexPath, next);

fs.writeFileSync(
  path.join(ROOT, 'src', 'data', 'home.generated.json'),
  JSON.stringify({ _說明: '由 scripts/build-home.mjs 在建置時自動產生，請勿手動修改。', routes: finalRoutes }, null, 2) + '\n'
);

const catSummary = categories.map((c) => `${c.title}（${c.id}）${(finalRoutes[c.id] || []).length} 條`).join('、');
console.log(`[home] 資料來源：${source}；路線分類 ${categories.length} 個：${catSummary}；區塊 ${content.blocks.length} 個、FAQ ${content.faq.length} 題`);
