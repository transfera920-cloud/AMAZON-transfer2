// 首頁（與申請頁 FAQ）內容的共用邏輯。純 ESM、不依賴 Node API：
//   - 建置腳本（scripts/build-home.mjs）用它把內容寫進 index.html 的靜態 HTML 與結構化資料
//   - React 首頁（src/components/HomeBlocks.tsx）與後台（AdminHomePanel.tsx）用同一份預設內容與解析規則
// 所以「後台改的 → 靜態 HTML → 畫面」三處一定是同一份文字。
//
// 資料存放：Firestore settings/general 文件的 homeBlocks / homeFaq / permitFaq 三個欄位。
//   欄位不存在（還沒在後台存過）→ 用下方 DEFAULT_*，網站看起來和改版前完全一樣。
//
// 內文簡易標記：空白行 = 分段；「- 」開頭 = 條列；「1. 」開頭 = 編號清單；[文字](網址) = 連結。

export const HOME_MARKER_START = '<!--HOME:BLOCKS:START-->';
export const HOME_MARKER_END = '<!--HOME:BLOCKS:END-->';

export const LINK_CLASS =
  'font-semibold text-[#00e676] hover:text-white underline decoration-emerald-600/50 underline-offset-2 transition-colors';

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/* 預設內容（= 改版前寫死在程式碼裡的文字）                              */
/* ------------------------------------------------------------------ */

/** 首頁路線清單的「顯示名稱 / 說明」預設值（以 slug 對應）。路線資料裡有填 homeName / homeDesc 時以路線資料為準。 */
export const DEFAULT_HOME_ROUTE_TEXT = {
  hehuanshan: { name: '合歡山群峰｜武嶺｜小奇萊', desc: '石門山、合歡群峰、小奇萊登山口' },
  xueshan: { name: '雪山登山口服務站', desc: '雪山主東峰' },
  wulingshanzhuang: { name: '武陵山莊', desc: '武陵四秀（桃山、池有、品田、喀拉業）' },
  yushan: { name: '玉山登山口｜塔塔加停車場', desc: '玉山群峰、麟趾山、鹿林山' },
  jiaminghu: { name: '嘉明湖｜向陽國家森林遊樂區', desc: '天使的眼淚嘉明湖、向陽山、三叉山，南橫台20線接駁' },
  'qilai-nanhua': { name: '奇萊南華｜屯原登山口', desc: '能高越嶺西段、奇萊南峰、南華山黃金大草原' },
  dabajianshan: { name: '大霸尖山｜觀霧大鹿林道東線口', desc: '世紀奇峰大霸群峰、觀霧遊憩區' },
  jundashan: { name: '郡大山｜望鄉部落 (含林道接駁)', desc: '八大秀、郡大林道 32K 搖晃專車直達登山口' },
  dajianshan: { name: '大小劍｜仁壽橋停車場', desc: '大小劍線（大劍山、佳陽山、小劍山）' },
  zhijiayang: { name: '志佳陽山｜環山部落', desc: '志佳陽山' },
  nanhu: { name: '南湖大山｜勝光登山口', desc: '南湖中央尖、北一段、南湖群峰' },
  baigu: { name: '白姑大山｜紅香部落｜最後農家', desc: '白姑大山' },
  shuanshan: { name: '閂山鈴鳴山｜730 林道接駁 11.7K', desc: '北二段、閂山鈴鳴山、無明甘藷' },
  biyang: { name: '畢羊縱走｜820 林道起點｜慈恩隧道口', desc: '畢羊縱走（畢祿山、羊頭山）' },
  'nenggao-andongjun': { name: '能高安東軍｜屯原雲天宮｜奧萬大森林遊樂區', desc: '能高安東軍縱走' },
  wanda: { name: '干卓萬｜萬大林道｜武界林道', desc: '干卓萬縱走' },
  batongguan: { name: '八通關｜八通關登山口', desc: '馬博拉斯橫斷、八大秀、南二段' },
  nanhengsanxing: { name: '南橫三星｜南橫登山口｜特生中心', desc: '南橫三星、南一段' },
  beidawu: { name: '北大武山｜北大武登山口', desc: '北大武山' },
};

export const DEFAULT_ROAD_ITEMS = [
  {
    tone: 'amber',
    tag: '夜間常態管制',
    title: '台21線 新中橫公路（草坪頭至塔塔加段）',
    highlight: '每日 17:30 至隔日 07:00 實施常態夜間預警性封閉管制',
    desc: '影響百岳：玉山主峰、排雲山莊、鹿林麟趾山。登山接駁若欲一早起登，需在 07:00 後通過或提前於前一日 17:30 前抵達東埔山莊 D0。',
  },
  {
    tone: 'blue',
    tag: '雪季／天候管制',
    title: '台14甲線 合歡山景觀公路（翠峰至大禹嶺段）',
    highlight: '視降雪與路面結冰彈性啟動雪季管制，夜間常態預警封閉',
    desc: '影響百岳：合歡主東石門、合歡北西峰、奇萊主北。冬季低溫結冰期翠峰至大禹嶺需加掛雪鍊，亞馬遜高山接駁車隊備有專業雪鍊裝備與經驗駕駛。',
  },
  {
    tone: 'red',
    tag: '每週二四全日封閉',
    title: '台20線 南橫公路（梅山口至向陽登山口）',
    highlight: '每週二、週四不開放；開放日 07:00~14:00 放行，17:00 前淨空',
    desc: '影響百岳：嘉明湖（向陽）、戒茂斯、南橫三星。欲攀登向陽嘉明湖請務必避開二、四道路維護日，亞馬遜高山接駁依通行規定彈性調度車趟。',
  },
  {
    tone: 'amber',
    tag: '四驅專用／日間開放',
    title: '郡大林道（檢查哨至 32K 登山口）',
    highlight: '開放時間 06:00 ~ 17:00（夜間關閉）；限高底盤四驅車進入',
    desc: '路面崎嶇不平且多坑洞碎石，一般轎車切勿進入。亞馬遜高山接駁提供專用高底盤 4WD 四驅越野車與經驗司機帶路，確保全隊安全抵達。',
  },
];

export const DEFAULT_HOME_FAQ = [
  {
    q: '亞馬遜高山接駁提供什麼服務？',
    a: '亞馬遜高山接駁提供全台灣熱門百岳與高山步道的登山口包車接送（許多登山客也會搜尋「登山接駁」）。車型可選 9 人座商務車、7 人座休旅車，或適合林道碎石路段的高底盤四驅車，並可選擇來回包車、單程，也可安排夜間或 D0 跨夜出發的時段。',
  },
  {
    q: '可以從哪些地方出發？',
    a: '北中南主要縣市與宜蘭都可以出發。實際車程建議用 Google 地圖查詢，其他細節歡迎透過 LINE 詢問。',
  },
  {
    q: '高山接駁有哪些車型？哪些路線需要四驅車？',
    a: '車型有 9 人座商務車、7 人座休旅車與高底盤四驅車。郡大林道（檢查哨至 32K 登山口）路面崎嶇、多坑洞碎石，限高底盤四驅車進入，一般轎車切勿進入；本站提供專用高底盤 4WD 四驅越野車與經驗司機帶路。郡大山、西巒大山另有[專屬接駁頁](https://shuttle.amazon-hike.com/)。',
  },
  {
    q: '登山接駁的費用怎麼算？',
    a: '可先使用本站的[價格估算系統](https://price.amazon-hike.com/)試算各路線的包車費用，依序選擇出發城市、車型、行程模式（來回或單程）、乘客人數，以及是否夜間出發。前往郡大山（望鄉部落、郡大林道）請改用[郡大山專用價格估算系統](https://shuttle.amazon-hike.com/)。',
  },
  {
    q: '怎麼預約高山接駁？',
    a: '先用價格估算系統試算費用，再點選「帶入報價加 LINE 預約」，系統會複製行程摘要並開啟 LINE，貼上訊息即可詢問預約日期是否有車趟；也可以直接來電 0972573495。',
  },
  {
    q: '可以只搭單程，或是 A進B出嗎？',
    a: '可以。A進B出是指從一個登山口入山、由另一個登山口下山的行程（例如縱走），起點與終點不同。價格估算提供「來回包車」與「單程」兩種行程模式；若入山口與下山口不同，請透過 LINE 說明入山口、下山口與日期。',
  },
  {
    q: '搭乘亞馬遜高山接駁有什麼安全保障？',
    a: '使用合法租賃營業車，由職業駕照司機駕駛，並投保 600 萬乘客平安險。',
  },
  {
    q: '目前提供哪些百岳的登山接駁？',
    a: '熱門路線包含[合歡山群峰](/hehuanshan/)、[雪山登山口服務站](/xueshan/)、[武陵山莊](/wulingshanzhuang/)、[玉山](/yushan/)、[嘉明湖](/jiaminghu/)、[奇萊南華](/qilai-nanhua/)、[大霸尖山](/dabajianshan/)與[郡大山](/jundashan/)，各路線頁有車程、路況與預約說明。其他路線歡迎透過 LINE 詢問。',
  },
  {
    q: '建議前一晚出發，還是凌晨直接起登？',
    a: '建議安排交通日（D0）：下班後先出發，前一晚住在登山口附近，隔天再從容起登。凌晨直接起登容易睡眠不足、增加司機疲勞駕駛的風險，也少了適應高度的時間，凌晨集合也比較容易睡過頭。',
  },
];

/** /permit/ 申請頁的常見問題（原本寫在 scripts/build-permit.mjs） */
export const DEFAULT_PERMIT_FAQ = [
  {
    q: '入園入山申請要先辦，還是先預約接駁？',
    a: '建議先確認入園入山的日期，再與我們聯絡預約接駁，日期不一致時就不必來回調整。若您的行程需要抽籤（例如玉山宿營地），可以等抽籤結果出來再預約，比較安心。',
  },
  {
    q: '入園入山申請可以在哪裡辦理？',
    a: '臺灣登山申請一站式服務網整合了玉山、雪霸、太魯閣國家公園與警政署入山的申請，由各機關個別審核；林業及自然保育署的山屋營地、自然保護區等，也可以從同一個入口進入。',
  },
  {
    q: '申請之後行程有變動怎麼辦？',
    a: '一站式服務網提供申請進度查詢、異動與取消。日期有變動時，建議儘早更新申請，也歡迎同步透過 LINE 告知我們，方便我們調整車輛安排。',
  },
  {
    q: '申請需要提前多久？',
    a: '各機關與各路線的受理時程不同，也可能因抽籤或名額而調整，建議以官方網站的公告為準，並儘早辦理，避免額滿或來不及。',
  },
];

/**
 * 首頁區塊（由上到下的順序）。kind：
 *   text      文字區塊（標題 + 簡易標記內文）— 可新增、刪除、改順序
 *   routes    路線清單（group: popular | more）— 內容來自「路線」分頁，這裡只設標題與是否收合
 *   roadguide 道路管制卡片（items）
 *   faq       常見問題（題目在 homeFaq）
 */
export function defaultHomeBlocks(popularTitle) {
  return [
    {
      id: 'charter',
      kind: 'text',
      title: '登山口接送與登山包車',
      body:
        '提供北中南主要縣市與宜蘭出發的登山口包車接送。車型可選擇 9 人座商務車、7 人座休旅，或適合林道碎石路段的高底盤四驅車，並可依行程選擇來回包車或單程，也可選擇夜間或 D0 跨夜出發的時段。\n\n' +
        '可使用上方「價格估算系統」，先試算各路線的包車費用；前往郡大山（望鄉部落、郡大林道）請改用[郡大山專用價格估算系統](https://shuttle.amazon-hike.com/)。',
    },
    { id: 'popular', kind: 'routes', group: 'popular', title: popularTitle || '熱門百岳登山接駁路線', collapsed: false },
    { id: 'more', kind: 'routes', group: 'more', title: '更多百岳登山接駁路線', collapsed: true },
    {
      id: 'oneway',
      kind: 'text',
      title: 'A進B出與行程接送',
      body:
        'A進B出是指從一個登山口入山、由另一個登山口下山的行程（例如縱走），起點與終點不同。本站價格估算提供「來回包車」與「單程」兩種行程模式；若您的行程入山口與下山口不同，歡迎透過 LINE 說明入山口、下山口與日期。',
    },
    {
      id: 'process',
      kind: 'text',
      title: '登山接駁服務流程',
      body:
        '1. 於「價格估算系統」選擇目標百岳／登山口與出發城市。\n' +
        '2. 選擇車型、行程模式（來回或單程）、乘客人數，以及是否為夜間出發。\n' +
        '3. 查看試算的預估費用。\n' +
        '4. 點選「帶入報價加 LINE 預約」，系統會複製行程摘要並開啟 LINE，貼上訊息即可詢問預約日期是否有車趟。',
    },
    { id: 'roadguide', kind: 'roadguide', title: '高山道路與林道管制即時指南', items: DEFAULT_ROAD_ITEMS },
    {
      id: 'permit',
      kind: 'text',
      title: '入園入山申請',
      body:
        '登山前的入園、入山與山屋營地申請，分屬不同的管理機關。我們把國家公園、林業及自然保育署、警政署等官方申請入口整理在同一頁，並說明申請與接駁預約的安排順序，出發前可以逐項對照確認。\n\n' +
        '[查看入園入山申請入口整理](/permit/)',
    },
    { id: 'faq', kind: 'faq', title: '常見問題' },
  ];
}

/* ------------------------------------------------------------------ */
/* 解析 / 清理                                                          */
/* ------------------------------------------------------------------ */

const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** 只接受 https、http、站內路徑、tel:、mailto:；其他（例如 javascript:）一律當成純文字 */
export function safeHref(u) {
  const s = String(u || '').trim();
  return /^(https?:\/\/|\/(?!\/)|tel:|mailto:)/i.test(s) ? s : '';
}

/** 簡易標記 → [字串 | {text, href}] */
export function parseInline(md = '') {
  const s = String(md);
  const out = [];
  let last = 0;
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const href = safeHref(m[2]);
    out.push(href ? { text: m[1], href } : m[0]);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** 簡易標記區塊 → [{type:'p'|'ul'|'ol', items:[parts[]]}] */
export function parseBlocks(body = '') {
  const blocks = String(body).replace(/\r/g, '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => /^[-*] /.test(l))) {
      return { type: 'ul', items: lines.map((l) => parseInline(l.replace(/^[-*] /, ''))) };
    }
    if (lines.every((l) => /^\d+[.)] /.test(l))) {
      return { type: 'ol', items: lines.map((l) => parseInline(l.replace(/^\d+[.)] /, ''))) };
    }
    return { type: 'p', items: [parseInline(lines.join(''))] };
  });
}

/** 簡易標記 → 純文字（FAQ 結構化資料用：連結只留文字） */
export function plainText(md = '') {
  return String(md).replace(LINK_RE, '$1');
}

const str = (v, max = 5000) => (typeof v === 'string' ? v.slice(0, max) : '');
const TONES = ['amber', 'blue', 'red'];

function cleanFaq(list, fallback) {
  if (!Array.isArray(list)) return fallback;
  return list
    .filter((x) => x && typeof x === 'object')
    .map((x) => ({ q: str(x.q, 300).trim(), a: str(x.a, 3000).trim() }))
    .filter((x) => x.q && x.a);
}

/** 路線分類代號：只接受英數、底線、連字號（最多 64 字）；內建分類是 popular（熱門）與 more（更多） */
export function cleanGroupId(v) {
  const g = typeof v === 'string' ? v.trim() : '';
  return /^[a-zA-Z0-9_-]{1,64}$/.test(g) ? g : '';
}

/** 首頁區塊 → 路線分類清單 [{ id, title, collapsed }]（順序 = 首頁由上到下的順序） */
export function routeCategories(blocks) {
  return (blocks || [])
    .filter((b) => b && b.kind === 'routes')
    .map((b) => ({ id: b.group, title: b.title || b.group, collapsed: !!b.collapsed }));
}

/** 路線的分類代號不在分類清單裡（例如分類被刪除）時，改放進「更多」（沒有「更多」就放第一個分類） */
export function resolveGroup(group, groupIds) {
  const ids = groupIds instanceof Set ? groupIds : new Set(groupIds || []);
  if (ids.has(group)) return group;
  if (ids.has('more')) return 'more';
  return ids.values().next().value || 'popular';
}

function cleanBlocks(list, popularTitle) {
  if (!Array.isArray(list) || !list.length) return defaultHomeBlocks(popularTitle);
  const seen = new Set();
  const seenGroups = new Set();
  const out = [];
  list.forEach((b, i) => {
    if (!b || typeof b !== 'object') return;
    const kind = ['text', 'routes', 'roadguide', 'faq'].includes(b.kind) ? b.kind : null;
    if (!kind) return;
    let id = str(b.id, 64).replace(/[^a-zA-Z0-9_-]/g, '') || `b${i + 1}`;
    while (seen.has(id)) id += 'x';
    seen.add(id);
    const base = { id, kind, title: str(b.title, 200) };
    if (kind === 'text') out.push({ ...base, body: str(b.body, 8000) });
    else if (kind === 'routes') {
      // 分類代號：內建 popular / more，後台新增的分類用自己的代號；同一個代號只留第一個區塊
      const group = cleanGroupId(b.group) || 'popular';
      if (seenGroups.has(group)) return;
      seenGroups.add(group);
      out.push({ ...base, group, collapsed: !!b.collapsed });
    }
    else if (kind === 'roadguide') {
      const items = (Array.isArray(b.items) ? b.items : [])
        .filter((x) => x && typeof x === 'object')
        .map((x) => ({
          tone: TONES.includes(x.tone) ? x.tone : 'amber',
          tag: str(x.tag, 60),
          title: str(x.title, 200),
          highlight: str(x.highlight, 300),
          desc: str(x.desc, 1000),
        }))
        .filter((x) => x.title);
      out.push({ ...base, items });
    } else out.push(base);
  });
  return out.length ? out : defaultHomeBlocks(popularTitle);
}

/** 把 Firestore settings/general 的原始資料整理成首頁內容（缺的欄位用預設） */
export function resolveHomeContent(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const popularTitle = typeof r.popularRoutesTitle === 'string' && r.popularRoutesTitle.trim() ? r.popularRoutesTitle.trim() : '';
  return {
    blocks: cleanBlocks(r.homeBlocks, popularTitle),
    faq: cleanFaq(r.homeFaq, DEFAULT_HOME_FAQ),
    permitFaq: cleanFaq(r.permitFaq, DEFAULT_PERMIT_FAQ),
  };
}

/**
 * 路線資料 → 首頁清單 { [分類代號]: [{slug,url,name,desc,navName}] }（只含已發布，依 order 排序）。
 * groupIds：目前有的分類代號；路線的分類不在裡面時改放「更多」。沒傳就照路線自己的分類。
 * popular / more 兩個鍵一定存在（舊程式與申請頁導覽會用到）。
 */
export function buildHomeRoutes(routes, groupIds) {
  const list = (routes || [])
    .filter((r) => r && typeof r.slug === 'string' && r.published !== false)
    .slice()
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  const item = (r) => {
    const d = DEFAULT_HOME_ROUTE_TEXT[r.slug] || {};
    const name = (typeof r.homeName === 'string' && r.homeName.trim()) || d.name || r.listName || r.name || r.slug;
    const desc = typeof r.homeDesc === 'string' ? r.homeDesc : d.desc || '';
    return { slug: r.slug, url: `/${r.slug}/`, name, desc, navName: r.navName || r.name || name };
  };
  const ids = groupIds ? new Set(groupIds) : null;
  const out = { popular: [], more: [] };
  for (const r of list) {
    let g = cleanGroupId(r.group) || 'popular';
    if (ids) g = resolveGroup(g, ids);
    (out[g] || (out[g] = [])).push(item(r));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 靜態 HTML 輸出（寫進 index.html，給爬蟲與初次載入）                     */
/* ------------------------------------------------------------------ */

function partsHtml(parts) {
  return parts
    .map((p) => {
      if (typeof p === 'string') return esc(p);
      const external = /^https?:\/\//i.test(p.href);
      return `<a href="${esc(p.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} class="${LINK_CLASS}">${esc(p.text)}</a>`;
    })
    .join('');
}

export function bodyHtml(body) {
  return parseBlocks(body)
    .map((b) => {
      if (b.type === 'ul') return `<ul class="space-y-2.5 list-disc list-inside">${b.items.map((it) => `<li>${partsHtml(it)}</li>`).join('')}</ul>`;
      if (b.type === 'ol') return `<ol class="space-y-2.5 list-decimal list-inside">${b.items.map((it) => `<li>${partsHtml(it)}</li>`).join('')}</ol>`;
      return `<p>${partsHtml(b.items[0])}</p>`;
    })
    .join('\n');
}

const SHELL = 'bg-[#0e2318]/85 border border-emerald-900/60 rounded-2xl p-6 md:p-8 mb-12';
const shell = (title, inner) =>
  `<section class="${SHELL}">\n<h2 class="text-lg md:text-xl font-bold text-white mb-4">${esc(title)}</h2>\n${inner}\n</section>`;

const TONE_CLASS = { amber: 'text-amber-200/90', blue: 'text-blue-200/90', red: 'text-red-200/90' };

function routeLi(r) {
  return `<li><a href="${esc(r.url)}" class="font-semibold text-[#00e676]">${esc(r.name)}</a>${r.desc ? `：${esc(r.desc)}` : ''}</li>`;
}

export function renderBlockHtml(block, ctx) {
  const title = block.title || '';
  if (block.kind === 'text') {
    return shell(title, `<div class="text-emerald-100/85 leading-relaxed text-sm md:text-base space-y-4">\n${bodyHtml(block.body)}\n</div>`);
  }
  if (block.kind === 'routes') {
    const list = (ctx.routes && ctx.routes[block.group]) || [];
    if (!list.length) return '';
    const ul = (extra) => `<ul class="space-y-2.5 list-none text-emerald-100/85 text-sm md:text-base${extra}">\n${list.map(routeLi).join('\n')}\n</ul>`;
    if (block.collapsed) {
      return shell(title, `<details>\n<summary class="cursor-pointer font-semibold text-[#00e676]">展開查看 ${list.length} 條路線</summary>\n${ul(' mt-4')}\n</details>`);
    }
    return shell(title, ul(''));
  }
  if (block.kind === 'roadguide') {
    const cards = (block.items || [])
      .map(
        (it) => `<div class="bg-[#071a10]/80 p-4 rounded-xl border border-emerald-800/40">
${it.tag ? `<p class="text-xs ${TONE_CLASS[it.tone] || TONE_CLASS.amber} font-semibold mb-1">${esc(it.tag)}</p>\n` : ''}<h3 class="font-bold text-white text-sm mb-1">${esc(it.title)}</h3>
${it.highlight ? `<p class="${TONE_CLASS[it.tone] || TONE_CLASS.amber} font-medium mb-1">${esc(it.highlight)}</p>\n` : ''}<p>${esc(it.desc)}</p>
</div>`
      )
      .join('\n');
    return shell(
      title,
      `<div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-900/60 text-xs text-emerald-200">
<div class="flex items-center gap-2">
<span>官方即時路況查詢：</span>
<a href="https://168.thb.gov.tw/" target="_blank" rel="noopener noreferrer" class="text-[#00e676] hover:text-white underline">公路局 168 即時路況</a>
<span>|</span>
<a href="https://www.forest.gov.tw/" target="_blank" rel="noopener noreferrer" class="text-[#00e676] hover:text-white underline">林業署林道動態</a>
</div>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 text-xs text-emerald-100/80">
${cards}
</div>`
    );
  }
  if (block.kind === 'faq') {
    if (!ctx.faq || !ctx.faq.length) return '';
    const items = ctx.faq
      .map((f) => `<div>\n<h3 class="font-bold text-white text-sm md:text-base mb-1">${esc(f.q)}</h3>\n<p>${partsHtml(parseInline(f.a))}</p>\n</div>`)
      .join('\n');
    return shell(title, `<div class="text-emerald-100/85 leading-relaxed text-sm md:text-base space-y-4">\n${items}\n</div>`);
  }
  return '';
}

/** 首頁所有區塊的靜態 HTML（不含標記） */
export function renderHomeBlocksHtml(content, routes) {
  const ctx = { routes, faq: content.faq };
  // 路線清單區塊（熱門／更多）不再顯示在頁面中間，路線連結改由上方的路線選單呈現（renderNavHtml）
  return content.blocks.filter((b) => b.kind !== 'routes').map((b) => renderBlockHtml(b, ctx)).filter(Boolean).join('\n\n');
}

/* ------------------------------------------------------------------ */
/* 路線選單（放在首頁「高山接駁服務與即時查詢」卡片區上方）               */
/* ------------------------------------------------------------------ */

export const HOME_NAV_MARKER_START = '<!--HOME:NAV:START-->';
export const HOME_NAV_MARKER_END = '<!--HOME:NAV:END-->';

/** 選單與路線頁導覽的連結文字：「山名＋接駁」（名稱已經以「接駁」結尾就不重複加） */
export function navLinkText(r) {
  const n = String((r && (r.navName || r.name)) || '').trim();
  return n.endsWith('接駁') ? n : `${n}接駁`;
}

/** 首頁選單的靜態 HTML（給爬蟲與初次載入；React 掛載後由 HomeNav 元件接手）。分類 = 後台首頁內容的「路線清單」區塊 */
export function renderNavHtml(blocks, routes) {
  const cats = routeCategories(blocks)
    .map((c) => ({ ...c, list: (routes && routes[c.id]) || [] }))
    .filter((c) => c.list.length);
  if (!cats.length) return '';
  const items = cats
    .map(
      (c) => `<details name="home-menu" style="margin:0 0 8px"><summary style="cursor:pointer;list-style:none;display:inline-block;padding:8px 16px;border:1px solid rgba(16,185,129,.6);border-radius:999px;color:#a7f3d0;font-weight:600">${esc(c.title)}</summary><ul style="list-style:none;margin:8px 0 0;padding:12px 16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 16px">${c.list
        .map((r) => `<li><a href="${esc(r.url)}" style="color:#00e676">${esc(navLinkText(r))}</a></li>`)
        .join('')}</ul></details>`
    )
    .join('\n');
  return `<nav aria-label="登山接駁路線選單" style="margin-bottom:32px;text-align:center">\n${items}\n</nav>`;
}

/** 把產生的區塊放進 index.html（以標記取代），並更新 JSON-LD 的 FAQPage 與服務目錄。回傳新的 HTML。 */
export function applyHomeToIndexHtml(html, content, routes, allPublished) {
  const re = new RegExp(`${HOME_MARKER_START}[\\s\\S]*?${HOME_MARKER_END}`);
  if (!re.test(html)) throw new Error('index.html 找不到首頁區塊標記（<!--HOME:BLOCKS:START-->）');
  const block = `${HOME_MARKER_START}\n${renderHomeBlocksHtml(content, routes)}\n        ${HOME_MARKER_END}`;
  let out = html.replace(re, () => block);

  // 路線選單：放在「百岳與高山登山接駁」卡片區上方；有標記就更新，沒有標記就在卡片區前面插入
  const navHtml = renderNavHtml(content.blocks, routes);
  const navRe = new RegExp(`${HOME_NAV_MARKER_START}[\\s\\S]*?${HOME_NAV_MARKER_END}`);
  const navBlock = navHtml ? `${HOME_NAV_MARKER_START}\n${navHtml}\n        ${HOME_NAV_MARKER_END}` : `${HOME_NAV_MARKER_START}${HOME_NAV_MARKER_END}`;
  if (navRe.test(out)) out = out.replace(navRe, () => navBlock);
  else {
    const cardsAnchor = '<!-- 百岳與高山登山接駁核心卡片 -->';
    if (out.includes(cardsAnchor)) out = out.replace(cardsAnchor, () => `${navBlock}\n        ${cardsAnchor}`);
    else console.warn('[home] index.html 找不到卡片區標記，略過路線選單');
  }

  const ldRe = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/;
  const m = out.match(ldRe);
  if (!m) throw new Error('index.html 找不到 JSON-LD');
  const ld = JSON.parse(m[2]);
  const graph = ld['@graph'] || [];
  const faqNode = graph.find((n) => n['@type'] === 'FAQPage');
  const hasFaqBlock = content.blocks.some((b) => b.kind === 'faq');
  if (faqNode) {
    if (hasFaqBlock && content.faq.length) {
      faqNode.mainEntity = content.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: plainText(f.a) },
      }));
    } else {
      ld['@graph'] = graph.filter((n) => n !== faqNode);
    }
  }
  const biz = graph.find((n) => n['@type'] === 'LocalBusiness');
  if (biz && biz.hasOfferCatalog && allPublished && allPublished.length) {
    biz.hasOfferCatalog.itemListElement = allPublished.map((r) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: r.serviceName || `${r.name}登山口包車接駁`,
        url: `https://transfer.amazon-hike.com/${r.slug}/`,
        provider: { '@id': 'https://transfer.amazon-hike.com/#org' },
      },
    }));
  }
  const ldText = JSON.stringify(ld, null, 2).replace(/</g, '\\u003c');
  out = out.replace(ldRe, (_, a, _b, c) => `${a}\n${ldText}\n    ${c}`);
  return out;
}
