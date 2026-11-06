// 產生 public/about/index.html（關於我們與保險頁）。
// 內容在 shared/aboutContent.mjs；版型沿用路線頁（同一份 CSS、同一個日夜主題），文字全部直接寫在 HTML，
// 訪客與搜尋引擎、AI 看到的是同一份內容；FAQ 的結構化資料與頁面上的問答由同一份資料產生，兩邊一定一致。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, BRAND, DEFAULT_CONTACT, BASE_CSS, esc } from '../shared/renderRoutePage.mjs';
import { DAY_THEME_HEAD } from '../shared/dayTheme.mjs';
import { ABOUT_FAQ, ABOUT_UPDATED, COMPANY } from '../shared/aboutContent.mjs';
import { FLEET_CSS, FLEET_PHOTOS, fleetFiguresHtml, fleetImageObjects, fleetImageUrls } from '../shared/fleetPhotos.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'about', 'index.html');
const URL = `${SITE}/about/`;
const LINE = DEFAULT_CONTACT.lineUrl;
const PHONE = DEFAULT_CONTACT.phone;

const TITLE = '關於亞馬遜高山接駁｜公司登記、乘客傷害責任險與服務規則';
const DESC = `${BRAND}由${COMPANY.legalName}（統編 ${COMPANY.taxId}）營運，福斯九人座租賃小客車，依法投保強制險並加保國泰產險乘客傷害責任險（每一個人 600 萬元），駕駛具 10 年以上山區經驗。`;

const EXTRA_CSS = `table{width:100%;border-collapse:collapse;margin:12px 0}
th,td{text-align:left;padding:10px 12px;border:1px solid #065f46;vertical-align:top}
th{width:34%;background:#0b1f17;color:#fff;font-weight:600}
.box{background:#0b1f17;border:1px solid #10b981;border-radius:12px;padding:12px 16px;margin:14px 0}
details.q{border:1px solid #065f46;border-radius:12px;padding:8px 14px;margin:10px 0}
details.q summary{cursor:pointer;font-weight:700;color:#fff}
details.q p{margin:8px 0 0}
.foot{font-size:14px;color:#6ee7b7}`;

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${URL}#webpage`,
      url: URL,
      name: TITLE,
      inLanguage: 'zh-TW',
      dateModified: ABOUT_UPDATED,
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${SITE}/#org` },
      breadcrumb: { '@id': `${URL}#breadcrumb` },
      primaryImageOfPage: { '@id': `${URL}#photo-1` },
      mentions: { '@type': 'Organization', '@id': 'https://amazon-hike.com/#organization', name: '亞馬遜國家山岳協會', url: 'https://amazon-hike.com/' },
    },
    {
      // 與首頁、路線頁的 LocalBusiness 使用同一個 @id，欄位保持一致
      '@type': 'LocalBusiness',
      '@id': `${SITE}/#org`,
      name: BRAND,
      legalName: COMPANY.legalName,
      taxID: COMPANY.taxId,
      foundingDate: COMPANY.founded,
      alternateName: ['高山接駁', '登山接駁', 'Amazon Hike Transfer'],
      url: `${SITE}/`,
      telephone: '+886972573495',
      image: [`${SITE}/images/og-cover.jpg`, ...fleetImageUrls(SITE)],
      logo: `${SITE}/logo.png`,
      priceRange: '$$',
      address: { '@type': 'PostalAddress', addressCountry: 'TW', addressRegion: '嘉義縣' },
      sameAs: [LINE, 'https://www.facebook.com/groups/518840791872080', 'https://amazon-hike.com/'],
    },
    ...fleetImageObjects(SITE).map((o, i) => ({ ...o, '@id': `${URL}#photo-${i + 1}` })),
    {
      '@type': 'BreadcrumbList',
      '@id': `${URL}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: BRAND, item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: '關於我們與保險', item: URL },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${URL}#faq`,
      mainEntity: ABOUT_FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
};

const faqHtml = ABOUT_FAQ.map((f) => `<details class="q"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('\n');

const html = `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(TITLE)} | ${BRAND}</title>
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="description" content="${esc(DESC)}" />
<link rel="canonical" href="${URL}" />
<link rel="icon" href="/favicon.ico" sizes="48x48" />
<link rel="icon" type="image/png" href="/favicon-192x192.png" sizes="192x192" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#0E3B27" />
<meta property="og:title" content="${esc(TITLE)}" />
<meta property="og:description" content="${esc(DESC)}" />
<meta property="og:url" content="${URL}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${BRAND}" />
<meta property="og:image" content="${SITE}/images/og-cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${esc(TITLE)}｜${BRAND}" />
<meta property="og:locale" content="zh_TW" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(TITLE)}" />
<meta name="twitter:description" content="${esc(DESC)}" />
<meta name="twitter:image" content="${SITE}/images/og-cover.jpg" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
${BASE_CSS}${EXTRA_CSS}\n${FLEET_CSS}
</style>
${DAY_THEME_HEAD}</head>
<body>
<main>
<nav aria-label="breadcrumb"><a href="/">${BRAND}</a> › 關於我們與保險</nav>
<h1>關於${BRAND}：公司登記、乘客傷害責任險與服務規則</h1>
<p class="updated">最後更新：<time datetime="${ABOUT_UPDATED}">${ABOUT_UPDATED}</time></p>
<p>我們做高山接駁，不只是提供交通服務，而是希望讓登山者少一點交通上的煩惱，多一點安心走進山林的時間，也希望用自己的經驗，讓每一趟登山旅程從出發到下山，都能更加順利。</p>
<p><a class="cta" href="${esc(LINE)}" target="_blank" rel="noopener">LINE 預約詢問</a><a class="cta alt" href="tel:${esc(PHONE)}">來電諮詢</a></p>

<h2>公司與營業資格</h2>
<table>
<tr><th>營運公司</th><td>${COMPANY.legalName}</td></tr>
<tr><th>統一編號</th><td>${COMPANY.taxId}</td></tr>
<tr><th>設立</th><td>${COMPANY.founded} 年</td></tr>
<tr><th>登記營業項目</th><td>${COMPANY.business}</td></tr>
</table>
<p>以上資料可至經濟部「商工登記公示資料查詢服務」（<a href="https://findbiz.nat.gov.tw/" target="_blank" rel="noopener">findbiz.nat.gov.tw</a>），以統一編號自行查證。</p>

<h2>車輛與駕駛</h2>
<ul>
<li>車輛以福斯九人座租賃小客車為主，一輛車乘客最多 8 位。</li>
<li>駕駛有至少 10 年的山區道路經驗，熟悉高山路線、林道與登山口。</li>
<li>具有因應山區道路狀況、天候變化與交通管制的實務經驗。</li>
</ul>
<div class="fleet">
${fleetFiguresHtml()}
</div>

<h2>保險與理賠</h2>
<div class="box">車輛依法投保強制汽車責任險，另外加保<strong>國泰產險「汽車第三人責任保險乘客傷害責任附加條款」，每一個人保險金額 600 萬元</strong>（簡稱乘客傷害責任險）。實際保障內容與條件，以保單條款為準。</div>
<ul>
<li><strong>這是責任保險：</strong>乘客因事故傷亡，由被保險人依法應負賠償責任時，保險公司依條款賠償。</li>
<li><strong>與強制險的關係：</strong>依條款約定，每一個人的保險金額是超過強制險給付標準以上的部分；乘客傷亡時，強制險依法定標準給付。</li>
<li><strong>載運人數：</strong>承保人數以行車執照記載的載運人數為準，超過時賠償按比例計算。</li>
</ul>
<p><strong>發生事故時怎麼處理？</strong>理賠請直接聯絡保險公司的理賠部門，由保險公司審查文件、計算金額與撥款。業務員主要協助送件與傳達訊息。</p>

<h2>訂金、天候與取消規則</h2>
<ul>
<li><strong>訂金：</strong>一般不先收訂金。</li>
<li><strong>天候判斷：</strong>高山接駁屬於特殊接駁，天候變化大，是否成行以出發前三天的天氣預報為準，由我們依登山專業判讀。</li>
<li><strong>不可抗力：</strong>因天候、封路等不可抗力因素無法成行，不收費用。</li>
<li><strong>自行取消或改期：</strong>視實際情況與我們的專業判斷而定，沒有固定的收費標準。建議越早告知越好。</li>
</ul>

<h2>與亞馬遜國家山岳協會的關係</h2>
<p>亞馬遜國家山岳協會與亞馬遜高山接駁，都源自對登山活動的熱愛與長期實務經驗，由同一位經營者營運，是兩個獨立單位。協會專注於登山活動、登山教育與山岳安全；高山接駁則延伸登山服務需求，提供登山口交通接駁、行程接送與相關交通規劃。從登山活動的規劃、準備，到登山口的交通接駁，希望透過不同服務的整合，讓登山者能更安心、更便利地享受山林。</p>
<p><a href="https://amazon-hike.com/" target="_blank" rel="noopener">前往亞馬遜國家山岳協會官網</a></p>

<h2>常見問題</h2>
${faqHtml}

<h2>聯絡我們</h2>
<p>電話：<a href="tel:${esc(PHONE)}">0972-573-495</a>（山上收訊較差，建議行前先確認）<br />LINE：<a href="${esc(LINE)}" target="_blank" rel="noopener">${esc(LINE)}</a></p>
<p class="foot">保險內容以實際保單條款為準。</p>
<p style="margin-top:40px"><a href="/">← 回到${BRAND}首頁</a></p>
</main>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`[about] 已輸出 public/about/index.html（${ABOUT_UPDATED}）`);
