// 產生 public/permit/index.html（入園入山申請頁）。
// 1. 建置時讀取後台（Firestore）裡「入園入山申請系統」卡片的區塊與連結，依後台順序輸出成靜態 HTML，
//    讓 Google 直接讀到完整內容。
// 2. 讀不到後台資料時（沒網路、卡片被改名…），改用下方 SEED 預設內容，建置不會失敗。
// 3. 頁面載入後也會再讀一次後台，所以後台調整順序後，不必重新部署就會更新。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeFirestore, buildGroups, renderGroups } from './permit-render.mjs';
import { readSnapshot } from './snapshot.mjs';
import { DAY_THEME_HEAD } from '../shared/dayTheme.mjs';
import { resolveHomeContent, parseInline, plainText, DEFAULT_PERMIT_FAQ } from '../shared/homeContent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://transfer.amazon-hike.com';
const OUT = path.join(ROOT, 'public', 'permit', 'index.html');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase-applet-config.json'), 'utf8'));
const BASE = process.env.FIRESTORE_BASE_URL || `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`; // FIRESTORE_BASE_URL 僅供本機測試
const DOC_URL = `${BASE}/settings/general?key=${cfg.apiKey}`;

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// 各分類的簡短說明（分類名稱要和後台「分類」欄位一致；沒有對應就不顯示說明）
const GROUP_DESCS = {
  國家公園: '玉山、雪霸、太魯閣等國家公園路線的入園與入山申請，可由國家公園的申請入口辦理。',
  林業及自然保育署: '自然保護區、自然保留區與野生動物保護區等區域的申請，由林業及自然保育署受理。',
  林務局: '山屋、山莊與森林遊樂區的申請入口，行程若會住山屋，建議及早確認床位。',
  縣市政府: '部分自然保留區與步道由縣市政府管理，申請方式與開放時間各地不同。',
  警政署: '部分山區需要先辦理入山申請，由警政署的線上系統受理。',
  林業試驗所: '植物園與生態園區的入園預約，若行程會順道參訪可先確認。',
};

const SEED_CARDS = [
  {
    title: '入園入山申請系統',
    links: [
      { group: '國家公園', label: '臺灣登山申請一站式服務網', url: 'https://hike.taiwan.gov.tw/web_index.aspx' },
      { group: '林業及自然保育署', label: '台灣山林悠遊網｜山屋營地申請', url: 'https://recreation.forest.gov.tw/Apply/Campsite' },
    ],
  },
];

let permitFaqRaw = null;

async function fetchCards() {
  const snap = readSnapshot(ROOT, BASE); // build-routes 剛讀過 settings/general，直接沿用
  if (snap && snap.settings) {
    permitFaqRaw = snap.settings;
    console.log('[permit] 沿用 build-routes 這次已讀取的後台資料（不重複讀取）');
    return snap.settings.cards || [];
  }
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch(DOC_URL, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = await res.json();
    const data = decodeFirestore({ mapValue: { fields: doc.fields || {} } });
    permitFaqRaw = data;
    return data.cards || [];
  } catch (e) {
    console.warn(`[permit] 讀取後台資料失敗，改用預設內容：${e.message}`);
    return null;
  }
}

const today = new Date().toISOString().slice(0, 10);

// 常見問題：後台「首頁內容」分頁可編輯（settings/general 的 permitFaq）；沒存過就用 shared/homeContent.mjs 的預設
let FAQ = DEFAULT_PERMIT_FAQ;

// 其他登山接駁路線導覽：由 build-home.mjs 產生的 home.generated.json 的熱門路線決定（缺檔時用下方預設）
const DEFAULT_NAV = [
  ['hehuanshan', '合歡山'], ['xueshan', '雪山'], ['wulingshanzhuang', '武陵四秀'], ['yushan', '玉山'],
  ['jiaminghu', '嘉明湖'], ['qilai-nanhua', '奇萊南華'], ['dabajianshan', '大霸尖山'], ['jundashan', '郡大山'],
];
function navLinksHtml() {
  let list = DEFAULT_NAV;
  try {
    const g = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'data', 'home.generated.json'), 'utf8'));
    if (g.routes && g.routes.popular && g.routes.popular.length) list = g.routes.popular.map((r) => [r.slug, r.navName || r.name]);
  } catch { /* 沒有就用預設 */ }
  return list.map(([slug, name]) => `<a href="/${esc(slug)}/">${esc(name)}</a>`).join(' ｜ ');
}

const faqAnswerHtml = (a) =>
  parseInline(a)
    .map((p) => (typeof p === 'string' ? esc(p) : `<a href="${esc(p.href)}"${/^https?:\/\//i.test(p.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(p.text)}</a>`))
    .join('');

function buildHtml(groups, fromCloud) {
  const title = '登山入園入山申請｜國家公園、山屋營地申請入口整理 | 亞馬遜高山接駁';
  const h1 = '登山入園入山申請｜國家公園、山屋營地、自然保護區申請入口整理';
  const desc =
    '整理登山常用的入園、入山與山屋營地官方申請入口，包含國家公園、林業及自然保育署、警政署等，並說明申請與接駁預約的安排順序，方便出發前逐項確認。';
  const url = `${SITE}/permit/`;
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url, name: h1, inLanguage: 'zh-TW',
        isPartOf: { '@id': `${SITE}/#website` }, dateModified: today,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '亞馬遜高山接駁', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: '入園入山申請', item: url },
        ],
      },
      ...(FAQ.length
        ? [{
            '@type': 'FAQPage',
            mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) } })),
          }]
        : []),
    ],
  };

  const clientScript = `(function(){
var decodeFirestore=${decodeFirestore.toString()};
var buildGroups=${buildGroups.toString()};
var renderGroups=${renderGroups.toString()};
var descs=${JSON.stringify(GROUP_DESCS)};
try{
fetch(${JSON.stringify(DOC_URL)}).then(function(r){return r.ok?r.json():null;}).then(function(doc){
if(!doc||!doc.fields)return;
var data=decodeFirestore({mapValue:{fields:doc.fields}});
var groups=buildGroups(data.cards);
if(!groups.length)return;
var el=document.getElementById('permit-groups');
if(el)el.innerHTML=renderGroups(groups,descs);
}).catch(function(){});
}catch(e){}
})();`;

  return `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${url}" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" href="/favicon-192x192.png" sizes="192x192" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#0E3B27" />
<meta property="og:title" content="${esc(h1)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="亞馬遜高山接駁" />
<meta property="og:image" content="${SITE}/images/og-cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(h1)}｜亞馬遜高山接駁" />
<meta property="og:locale" content="zh_TW" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(h1)}" />
<meta name="twitter:description" content="${esc(desc)}" />
<meta name="twitter:image" content="${SITE}/images/og-cover.jpg" />
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>
:root{color-scheme:dark}
body{margin:0;background:#07130e;color:#d1fae5;font-family:system-ui,"Noto Sans TC",sans-serif;line-height:1.8}
main{max-width:760px;margin:0 auto;padding:24px 16px 56px}
a{color:#00e676}nav{font-size:14px;margin-bottom:20px}
h1{color:#fff;font-size:28px;line-height:1.4}h2{color:#fff;font-size:20px;margin-top:32px}h3{color:#fff;font-size:16px;margin-bottom:0}
.cta{display:inline-block;background:#00c853;color:#fff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;margin:8px 8px 0 0}
.cta.alt{background:transparent;border:1px solid #10b981;color:#a7f3d0}
</style>
${DAY_THEME_HEAD}</head>
<body>
<main>
<nav aria-label="breadcrumb"><a href="/">亞馬遜高山接駁</a> › 入園入山申請</nav>
<h1>${esc(h1)}</h1>
<p>登山前的入園、入山與山屋營地申請，分屬不同的管理機關。這一頁把常用的官方申請入口整理在一起，方便您出發前依路線逐項確認。實際規定與受理時程，請以各機關的最新公告為準。</p>
<p><a class="cta" href="https://lin.ee/TJJLV36" target="_blank" rel="noopener">LINE 預約詢問</a><a class="cta alt" href="tel:0972573495">來電諮詢</a><a class="cta alt" href="https://price.amazon-hike.com/" target="_blank" rel="noopener">價格估算系統</a></p>

<h2>官方申請入口</h2>
<div id="permit-groups">
${renderGroups(groups, GROUP_DESCS)}
</div>

<h2>常用的一站式申請頁面</h2>
<p>臺灣登山申請一站式服務網整合了國家公園與警政署的入園入山申請，送出後由各機關個別審核。下列頁面在申請前後都用得到：</p>
<ul>
<li><a href="https://hike.taiwan.gov.tw/apply_1.aspx" target="_blank" rel="noopener">各項線上申請</a>：入園、入山與山屋營地的申請入口。</li>
<li><a href="https://hike.taiwan.gov.tw/applySearch.aspx" target="_blank" rel="noopener">申請進度查詢、繳費、異動與取消</a>：日期有變動時，建議儘早在這裡更新。</li>
<li><a href="https://hike.taiwan.gov.tw/notice.aspx" target="_blank" rel="noopener">登山須知</a>：第一次申請前，建議先讀過各項規定。</li>
<li><a href="https://hike.taiwan.gov.tw/open.aspx" target="_blank" rel="noopener">登山路線開放狀態</a>：路線可能因天候或崩塌暫停開放，出發前再確認一次會更安心。</li>
<li><a href="https://hike.taiwan.gov.tw/bed_3.aspx" target="_blank" rel="noopener">玉山抽籤結果查詢</a>：玉山宿營地需要抽籤，結果可在這裡查詢。</li>
<li><a href="https://hike.taiwan.gov.tw/apply_6.aspx" target="_blank" rel="noopener">國家公園出園回報</a>：下山後建議記得回報，讓管理單位掌握您的平安。</li>
<li><a href="https://hike.taiwan.gov.tw/information_3.aspx" target="_blank" rel="noopener">國家公園天氣資訊</a>：出發前查看山區天氣。</li>
</ul>

<h2>我們接送的路線，申請通常向哪裡辦理</h2>
<p>不同路線所屬的管理機關不同，下列為一般情形，規定可能調整，建議出發前向該機關確認。</p>
<ul>
<li><a href="/hehuanshan/">合歡山</a>：石門山、合歡主峰、東峰、北峰等公路旁步道不在生態保護區內，依太魯閣國家公園公告不需申請入園；小奇萊過了箭竹原叉路口後屬於奇萊連峰路線，需要事先向太魯閣國家公園申請。</li>
<li><a href="/yushan/">玉山</a>：通常向玉山國家公園申請，宿營地另有抽籤，建議留意時程。</li>
<li><a href="/xueshan/">雪山</a>、<a href="/wulingshanzhuang/">武陵四秀</a>、<a href="/dabajianshan/">大霸尖山</a>：通常向雪霸國家公園申請。</li>
<li><a href="/qilai-nanhua/">奇萊南華</a>：行程包含奇萊連峰時，通常向太魯閣國家公園申請。</li>
<li><a href="/jiaminghu/">嘉明湖</a>：山屋營地由林業及自然保育署受理，建議及早確認床位。</li>
</ul>
<p>其他路線的申請方式，歡迎透過 LINE 詢問，或參考各路線頁的說明。</p>

<h2>申請與接駁預約，建議這樣安排</h2>
<ol>
<li>先確認路線是否開放：路線可能因天候或崩塌暫停開放，先查過再安排日期，比較不會白忙一場。</li>
<li>依路線向對應機關申請：需要抽籤的路線，建議等結果出來再往下進行。</li>
<li>日期確定後再預約接駁：入園入山日期與接駁日期一致，就不需要來回調整車輛。預約時請提供日期、入山口與下山口。</li>
<li>行程有變動請儘早更新：申請可在一站式服務網異動或取消，也請同步告訴我們，方便調度車輛。</li>
</ol>

${FAQ.length ? `<h2>常見問題</h2>\n${FAQ.map((f) => `<h3>${esc(f.q)}</h3>\n<p>${faqAnswerHtml(f.a)}</p>`).join('\n')}\n` : ''}
<h2>出發前準備</h2>
<ul>
<li><a href="https://stays.amazon-hike.com/trailhead-stays" target="_blank" rel="noopener">登山口住宿查詢</a>：搜尋登山口附近民宿與山屋，安排入山前一晚（D0）住宿。</li>
<li><a href="https://feast.amazon-hike.com/" target="_blank" rel="noopener">下山慶功宴餐廳</a>：依行車時間查詢登山口附近的合菜與美食。</li>
<li><a href="https://road.amazon-hike.com/" target="_blank" rel="noopener">登山路況與管制查詢</a>：出發前查看官方路況與管制入口。</li>
</ul>

<h2>其他登山接駁路線</h2>
<p>${navLinksHtml()}</p>
<p style="margin-top:40px"><a href="/">← 回到亞馬遜高山接駁首頁</a></p>
</main>
<script>${clientScript}</script>
</body>
</html>
`;
}

const cloudCards = await fetchCards();
if (permitFaqRaw) {
  const resolved = resolveHomeContent(permitFaqRaw).permitFaq;
  FAQ = Array.isArray(permitFaqRaw.permitFaq) ? resolved : DEFAULT_PERMIT_FAQ; // 後台存過就照後台（可以是空的＝不顯示 FAQ）
}
let groups = cloudCards ? buildGroups(cloudCards) : [];
const fromCloud = groups.length > 0;
if (!fromCloud) {
  if (cloudCards) console.warn('[permit] 後台找不到「入園入山申請系統」卡片或連結，改用預設內容');
  groups = buildGroups(SEED_CARDS);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buildHtml(groups, fromCloud));
console.log(`[permit] 已產生 /permit/（${fromCloud ? '來自後台' : '預設內容'}，${groups.length} 個區塊）`);
