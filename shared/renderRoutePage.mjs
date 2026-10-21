// 路線頁共用產生器。純 ESM、不依賴 Node API：建置腳本（Node）與後台預覽（瀏覽器）都用同一份，
// 所以後台預覽看到的就是上線後的 HTML。
//
// 內文用「簡易標記」：
//   - 空白行分隔段落
//   - 每行以「- 」開頭 = 條列；每行以「1. 」開頭 = 編號清單
//   - [文字](網址) = 超連結（https 開頭會自動開新分頁；/permit/ 這類站內連結不會）

export const SITE = 'https://transfer.amazon-hike.com';
export const BRAND = '亞馬遜高山接駁';
export const DEFAULT_CONTACT = { lineUrl: 'https://lin.ee/TJJLV36', phone: '0972573495' };
export const DEFAULT_CTA_PRICE = { label: '價格估算系統', url: 'https://price.amazon-hike.com/' };
export const DEFAULT_CLOSING =
  '延伸閱讀：[亞馬遜國家山岳協會](https://amazon-hike.com/)提供登山入門教學與百岳介紹，行前功課可一併參考。';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const unesc = (s = '') =>
  String(s).replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** 簡易標記 → 行內 HTML */
export function inline(md = '') {
  const s = String(md);
  let out = '';
  let last = 0;
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(s))) {
    out += esc(s.slice(last, m.index));
    const url = m[2];
    const external = /^https?:\/\//i.test(url);
    out += `<a href="${esc(url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${esc(m[1])}</a>`;
    last = m.index + m[0].length;
  }
  return out + esc(s.slice(last));
}

/** 簡易標記 → 純文字（FAQ JSON-LD 用） */
export function plain(md = '') {
  return String(md).replace(LINK_RE, '$1');
}

/** 簡易標記區塊 → HTML 區塊 */
export function bodyToHtml(body = '') {
  const blocks = String(body).replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks
    .map((b) => {
      const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.every((l) => /^[-*] /.test(l))) {
        return `<ul>\n${lines.map((l) => `<li>${inline(l.replace(/^[-*] /, ''))}</li>`).join('\n')}\n</ul>`;
      }
      if (lines.every((l) => /^\d+[.)] /.test(l))) {
        return `<ol>\n${lines.map((l) => `<li>${inline(l.replace(/^\d+[.)] /, ''))}</li>`).join('\n')}\n</ol>`;
      }
      return `<p>${inline(lines.join(''))}</p>`;
    })
    .join('\n');
}

const VIDEO_CSS = `/*VIDEO:START*/
.video{margin:16px 0}.video-frame{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000}
.video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.video details{margin-top:12px;border:1px solid #10b981;border-radius:12px;padding:8px 16px}
.video summary{cursor:pointer;color:#a7f3d0;font-weight:700}
/*VIDEO:END*/`;

const BASE_CSS = `:root{color-scheme:dark}
body{margin:0;background:#07130e;color:#d1fae5;font-family:system-ui,"Noto Sans TC",sans-serif;line-height:1.8}
main{max-width:760px;margin:0 auto;padding:24px 16px 56px}
a{color:#00e676}nav{font-size:14px;margin-bottom:20px}
h1{color:#fff;font-size:28px;line-height:1.4}h2{color:#fff;font-size:20px;margin-top:32px}h3{color:#fff;font-size:16px;margin-bottom:0}
.cta{display:inline-block;background:#00c853;color:#fff;font-weight:700;padding:12px 28px;border-radius:999px;text-decoration:none;margin:8px 8px 0 0}
.cta.alt{background:transparent;border:1px solid #10b981;color:#a7f3d0}
`;

/** 逐字稿文字 → 段落陣列（一行一段） */
export function transcriptParas(t = '') {
  return String(t).split(/\n+/).map((x) => x.trim()).filter(Boolean);
}

export function hasVideo(route) {
  return !!(route.video && String(route.video.youtubeId || '').trim());
}

export function visibleArticles(route) {
  return (route.articles || []).filter((a) => a && a.show !== false && a.title && /^https:\/\//.test(a.url || ''));
}

function buildJsonLd(route, paras) {
  const url = `${SITE}/${route.slug}/`;
  const faq = (route.faq || []).filter((f) => f && f.q && f.a);
  const graph = [
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: route.metaTitle,
      inLanguage: 'zh-TW',
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${url}#service` },
      dateModified: route.updatedAt,
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: BRAND, item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: route.breadcrumbName, item: url },
      ],
    },
    {
      '@type': 'Service',
      name: route.serviceName,
      serviceType: '登山口包車接送',
      areaServed: { '@type': 'Country', name: 'Taiwan' },
      provider: { '@id': `${SITE}/#org` },
      '@id': `${url}#service`,
    },
    {
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: plain(f.a) },
      })),
    },
  ];
  const v = route.video || {};
  const id = String(v.youtubeId || '').trim();
  if (id && v.title && v.description && v.uploadDate) {
    const o = {
      '@type': 'VideoObject',
      '@id': `${url}#video`,
      name: v.title,
      description: v.description,
      thumbnailUrl: [v.thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`],
      uploadDate: v.uploadDate,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      inLanguage: 'zh-TW',
      publisher: { '@id': `${SITE}/#org` },
    };
    if (v.duration) o.duration = v.duration;
    if (paras.length) o.transcript = paras.join('\n');
    graph.push(o);
  }
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

function videoBlock(route, paras) {
  const v = route.video;
  const id = String(v.youtubeId).trim();
  const summary = (v.summary || []).filter(Boolean).map((s) => `<li>${esc(s)}</li>`).join('');
  return `<!--VIDEO:START-->
<h2>${esc(v.heading || '路線影片')}</h2>
<div class="video">
<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${esc(id)}" title="${esc(v.title || '')}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
${summary ? `<ul>${summary}</ul>` : ''}
${paras.length ? `<details><summary>影片逐字稿</summary>${paras.map((p) => `<p>${esc(p)}</p>`).join('')}</details>` : ''}
</div>
<!--VIDEO:END-->
`;
}

function articlesBlock(items) {
  return `<!--ARTICLES:START-->
<h2>路線攻略文章</h2>
<ul>
${items.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></li>`).join('\n')}
</ul>
<!--ARTICLES:END-->
`;
}

/**
 * 產生單一路線頁 HTML。
 * ctx.routes  : 所有「已發布」路線（用來產生「其他登山接駁路線」導覽）
 * ctx.contact : { lineUrl, phone }
 */
export function renderRoutePage(route, ctx = {}) {
  const contact = { ...DEFAULT_CONTACT, ...(ctx.contact || {}) };
  const all = (ctx.routes || []).filter((r) => r.published !== false);
  const url = `${SITE}/${route.slug}/`;
  const withVideo = hasVideo(route);
  const paras = withVideo ? transcriptParas(route.video.transcript) : [];
  const t = esc(route.metaTitle);
  const d = esc(route.metaDescription);

  const popular = all
    .filter((r) => r.group === 'popular' && r.slug !== route.slug)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const navLinks = popular.map((r) => `<a href="/${r.slug}/">${esc(r.navName || r.name)}</a>`).join(' ｜ ');
  const articles = visibleArticles(route);
  const cp = route.ctaPrice && route.ctaPrice.url ? route.ctaPrice : DEFAULT_CTA_PRICE;
  const closing = String(route.closing || '').trim() || DEFAULT_CLOSING;

  const head = `<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${t} | ${BRAND}</title>
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta name="description" content="${d}" />
<link rel="canonical" href="${url}" />
<meta property="og:title" content="${t}" />
<meta property="og:description" content="${d}" />
<meta property="og:url" content="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${BRAND}" />
<meta property="og:image" content="${SITE}/images/og-cover.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="${t}｜${BRAND}" />
<meta property="og:locale" content="zh_TW" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${t}" />
<meta name="twitter:description" content="${d}" />
<meta name="twitter:image" content="${SITE}/images/og-cover.jpg" />
<script type="application/ld+json">${buildJsonLd(route, paras)}</script>
<style>
${BASE_CSS}${withVideo ? VIDEO_CSS + '\n' : ''}</style>
</head>
`;

  const sections = (route.sections || [])
    .filter((s) => s && (s.heading || s.body))
    .map((s) => `<h2>${esc(s.heading)}</h2>\n${bodyToHtml(s.body)}\n\n`)
    .join('');

  const faq = (route.faq || [])
    .filter((f) => f && f.q && f.a)
    .map((f) => `<h3>${esc(f.q)}</h3>\n<p>${inline(f.a)}</p>\n`)
    .join('');

  const prep = route.prep && (route.prep.heading || route.prep.body)
    ? `<h2>${esc(route.prep.heading)}</h2>\n${bodyToHtml(route.prep.body)}\n\n`
    : '';

  const body = `<body>
<main>
<nav aria-label="breadcrumb"><a href="/">${BRAND}</a> › ${esc(route.breadcrumbName)}</nav>
<h1>${esc(route.h1)}</h1>
<p>${inline(route.intro)}</p>
<p><a class="cta" href="${esc(contact.lineUrl)}" target="_blank" rel="noopener">LINE 預約詢問</a><a class="cta alt" href="tel:${esc(contact.phone)}">來電諮詢</a><a class="cta alt" href="${esc(cp.url)}" target="_blank" rel="noopener">${esc(cp.label || DEFAULT_CTA_PRICE.label)}</a></p>

${sections}${withVideo ? videoBlock(route, paras) : ''}${faq ? `<h2>常見問題</h2>\n${faq}\n` : ''}${prep}${navLinks ? `<h2>其他登山接駁路線</h2>\n<p>${navLinks}</p>\n` : ''}${route.group !== 'popular' ? `<p>更多路線請見<a href="/">首頁的「${esc((ctx.categoryTitles && ctx.categoryTitles[route.group]) || '更多百岳登山接駁路線')}」</a>。</p>\n` : ''}${articles.length ? articlesBlock(articles) : ''}${bodyToHtml(closing)}
<p style="margin-top:40px"><a href="/">← 回到${BRAND}首頁</a></p>
</main>
</body>
</html>
`;
  return head + body;
}

/** 檢查路線資料，回傳提醒文字陣列（只提醒，不擋存檔） */
export function checkRoute(route) {
  const w = [];
  const len = (s) => [...String(s || '')].length;
  if (len(route.metaTitle) > 60) w.push(`SEO 標題 ${len(route.metaTitle)} 字，偏長（建議 60 字內，搜尋結果可能被截斷）`);
  if (!route.metaTitle) w.push('SEO 標題是空的');
  if (len(route.metaDescription) > 120) w.push(`SEO 描述 ${len(route.metaDescription)} 字，偏長（建議 120 字內）`);
  if (len(route.metaDescription) < 40) w.push('SEO 描述偏短（建議 60～120 字）');
  if (!route.h1) w.push('H1 是空的');
  if ((route.faq || []).filter((f) => f.q && f.a).length < 3) w.push('常見問題少於 3 題');
  (route.sections || []).forEach((s, i) => {
    if (!s.heading) w.push(`第 ${i + 1} 個區塊沒有標題`);
    if (!String(s.body || '').trim()) w.push(`區塊「${s.heading || i + 1}」沒有內容`);
  });
  const mdLinks = [...JSON.stringify([route.intro, route.sections, route.faq, route.prep]).matchAll(/\]\(([^)\s\\]*)\)/g)];
  mdLinks.forEach((m) => {
    if (!/^(https:\/\/|\/)/.test(m[1])) w.push(`連結「${m[1]}」不是 https 或站內路徑`);
  });
  (route.articles || []).forEach((a) => {
    if (a.show !== false && a.url && !/^https:\/\//.test(a.url)) w.push(`攻略文章「${a.title || a.url}」網址不是 https，不會顯示`);
  });
  if (route.video && route.video.youtubeId) {
    if (!route.video.uploadDate) w.push('影片缺上傳日期，只會嵌入影片、不會輸出影片結構化資料');
    if (!route.video.description) w.push('影片缺說明，不會輸出影片結構化資料');
  }
  return w;
}

/** 新路線的起始內容（參考「更多路線」頁的通用寫法，請依實際路線補充） */
export function makeRouteTemplate(slug, name, order = 99) {
  const n = name || slug;
  return {
    slug,
    name: n,
    navName: n,
    listName: n,
    group: 'more',
    order,
    published: false,
    h1: `${n}接駁｜登山口包車接送`,
    metaTitle: `${n}接駁｜登山口包車接送`,
    metaDescription: `${n}登山口包車接送，合法營業車、職業駕照司機、600萬乘客平安險。`,
    breadcrumbName: `${n}接駁`,
    serviceName: `${n}登山口包車接駁`,
    intro: `亞馬遜高山接駁（也就是許多登山客搜尋的「登山接駁」）提供${n}登山口的包車接送。`,
    sections: [
      {
        id: 'services',
        heading: `${n}接駁服務內容`,
        body: `- 登山口：（請填寫）。\n- 主要路線：（請填寫）。\n- 提供來回包車或單程接送，也可安排夜間或 D0 跨夜出發的時段。\n- 車型：9 人座商務車或 7 人座休旅。\n- 合法租賃營業車、職業駕照司機、600萬乘客平安險。`,
      },
      {
        id: 'cost',
        heading: '車程與費用',
        body: `每位登山客的出發地不同，車程與費用也不同。請使用[價格估算系統](https://price.amazon-hike.com/)，選擇出發地與登山口，即可查看預估車程、地圖與費用。`,
      },
      {
        id: 'road',
        heading: '路況注意事項',
        body: `前往登山口的道路與林道可能因天氣或施工調整管制，出發前請查看[登山路況與管制查詢](https://road.amazon-hike.com/)與官方公告，一切以官方公告為準。`,
      },
      {
        id: 'book',
        heading: '如何預約',
        body: `1. 用 LINE 或電話告知日期、人數、出發地與登山口。\n2. 先用[價格估算系統](https://price.amazon-hike.com/)試算費用，確認車型與行程（來回或單程）。\n3. 收到車趟確認後完成預約。`,
      },
    ],
    faq: [
      { q: `${n}的接送可以從哪裡出發？`, a: '提供台北/新北、桃園、新竹、台中、彰化、嘉義、台南、高雄、宜蘭出發的包車接送，實際車程與費用請用價格估算系統查詢，細節歡迎透過 LINE 詢問。' },
      { q: '可以只搭單程嗎？', a: '可以。若入山口與下山口不同（A進B出），請在詢問時說明兩個登山口與日期。' },
      { q: '遇到天氣或道路管制怎麼辦？', a: '請在出發前確認官方路況，若有異動，歡迎透過 LINE 與我們聯絡調整行程。' },
    ],
    prep: {
      heading: `${n}出發前準備`,
      body: `- [登山口住宿查詢](https://stays.amazon-hike.com/trailhead-stays)：搜尋登山口附近民宿與山屋。\n- [下山慶功宴餐廳](https://feast.amazon-hike.com/)：依行車時間查詢登山口附近的合菜與美食。\n- [登山路況與管制查詢](https://road.amazon-hike.com/)：出發前查看官方路況與管制入口。\n- [入園入山申請入口整理](/permit/)：路線所屬機關與官方申請入口，出發前一併確認會更安心。`,
    },
    video: { youtubeId: '', title: '', description: '', uploadDate: '', duration: '', heading: '', summary: [], transcript: '' },
    articles: [],
  };
}
