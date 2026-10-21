// ⚠ 一次性遷移工具，已執行完畢（產生 src/data/routes.seed.json）。日後路線內容以後台為準，請勿重跑。
// 一次性遷移工具：把現有 public/<slug>/index.html 解析成 src/data/routes.seed.json，
// 並用共用產生器重新輸出，與原檔逐行比對（確認遷移後頁面沒有走樣）。
// 用法：node scripts/extract-routes.mjs [--write-pages]
//   --write-pages：比對通過後，用產生器輸出覆寫 public/<slug>/index.html
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderRoutePage, unesc, SITE, DEFAULT_CTA_PRICE, DEFAULT_CLOSING } from '../shared/renderRoutePage.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const SKIP = new Set(['permit']);
const warn = (...a) => console.warn('[extract]', ...a);

/** 行內 HTML → 簡易標記 */
function htmlToInline(h) {
  let out = '';
  let last = 0;
  const re = /<a href="([^"]*)"(?: target="_blank" rel="noopener")?>(.*?)<\/a>/g;
  let m;
  while ((m = re.exec(h))) {
    out += unesc(h.slice(last, m.index)) + `[${unesc(m[2])}](${unesc(m[1])})`;
    last = m.index + m[0].length;
  }
  out += unesc(h.slice(last));
  if (/<[a-z/]/i.test(h.replace(re, ''))) warn('行內仍有未轉換的標籤：', h.slice(0, 80));
  return out;
}

/** 區塊 HTML（p / ul / ol 的連續序列）→ 簡易標記 */
function htmlToBody(h) {
  const blocks = [];
  const re = /<p>(.*?)<\/p>|<ul>\n([\s\S]*?)\n<\/ul>|<ol>\n([\s\S]*?)\n<\/ol>/gs;
  let m;
  let consumed = 0;
  let rest = h;
  while ((m = re.exec(h))) {
    const gap = h.slice(consumed, m.index).trim();
    if (gap) warn('區塊內有無法解析的內容：', gap.slice(0, 80));
    consumed = m.index + m[0].length;
    if (m[1] !== undefined) blocks.push(htmlToInline(m[1]));
    else if (m[2] !== undefined) blocks.push(m[2].split('\n').map((l) => '- ' + htmlToInline(l.replace(/^<li>|<\/li>$/g, ''))).join('\n'));
    else blocks.push(m[3].split('\n').map((l, i) => `${i + 1}. ` + htmlToInline(l.replace(/^<li>|<\/li>$/g, ''))).join('\n'));
  }
  if (h.slice(consumed).trim()) warn('區塊尾端有無法解析的內容：', h.slice(consumed).trim().slice(0, 80));
  return blocks.join('\n\n');
}

// ---- llms.txt：取得分組、排序、清單名稱 ----
const llms = fs.readFileSync(path.join(PUB, 'llms.txt'), 'utf8');
const llmsInfo = {};
{
  let group = null;
  let n = 0;
  for (const line of llms.split('\n')) {
    if (/^## 路線頁/.test(line)) { group = 'popular'; n = 0; continue; }
    if (/^## 更多百岳路線/.test(line)) { group = 'more'; n = 0; continue; }
    if (/^## /.test(line)) { group = null; continue; }
    const m = line.match(/^- \[(.*)\]\(https:\/\/transfer\.amazon-hike\.com\/([^/]+)\/\)/);
    if (group && m) llmsInfo[m[2]] = { group, order: ++n + (group === 'more' ? 100 : 0), listName: m[1] };
  }
}

const slugs = fs.readdirSync(PUB, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !SKIP.has(d.name) && fs.existsSync(path.join(PUB, d.name, 'index.html')))
  .map((d) => d.name);

// ---- 先收集「導覽用短名稱」：所有 popular 頁面的「其他登山接駁路線」連結 ----
const navNames = {};
for (const slug of slugs) {
  const h = fs.readFileSync(path.join(PUB, slug, 'index.html'), 'utf8');
  const m = h.match(/<h2>其他登山接駁路線<\/h2>\n<p>(.*?)<\/p>/);
  if (!m) continue;
  for (const a of m[1].matchAll(/<a href="\/([^/]+)\/">(.*?)<\/a>/g)) navNames[a[1]] = unesc(a[2]);
}

const routes = [];
const originals = {};
for (const slug of slugs) {
  const file = path.join(PUB, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  originals[slug] = html;
  const info = llmsInfo[slug];
  if (!info) { warn(`${slug}: llms.txt 找不到，略過`); continue; }

  const g1 = (re, label) => { const m = html.match(re); if (!m) { warn(`${slug}: 找不到 ${label}`); return ''; } return unesc(m[1]); };
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const graph = ld['@graph'];
  const web = graph.find((n) => n['@type'] === 'WebPage');
  const svc = graph.find((n) => n['@type'] === 'Service');
  const vo = graph.find((n) => n['@type'] === 'VideoObject');

  const r = {
    slug,
    name: info.listName.split('｜')[0],
    navName: navNames[slug] || '',
    listName: info.listName,
    group: info.group,
    order: info.order,
    published: true,
    h1: g1(/<h1>(.*?)<\/h1>/, 'h1'),
    metaTitle: g1(/<meta property="og:title" content="(.*?)" \/>/, 'og:title'),
    metaDescription: g1(/<meta name="description" content="(.*?)" \/>/, 'description'),
    breadcrumbName: g1(/<nav aria-label="breadcrumb">.*? › (.*?)<\/nav>/, 'breadcrumb'),
    serviceName: svc ? svc.name : '',
    updatedAt: web ? web.dateModified : '',
  };
  if (!r.navName) r.navName = r.breadcrumbName.replace(/接駁$/, '');
  r.name = r.navName || r.name;

  // 第三顆按鈕（預設為價格估算系統）
  const cta = html.match(/<a class="cta alt" href="([^"]*)" target="_blank" rel="noopener">(.*?)<\/a><\/p>/);
  r.ctaPrice = cta ? { label: unesc(cta[2]), url: unesc(cta[1]) } : { ...DEFAULT_CTA_PRICE };
  // 結尾段落（預設為「延伸閱讀」；有自訂寫法就保留）
  const tail = html.split('<p style="margin-top:40px">')[0];
  const tailStart = [...tail.matchAll(/<!--ARTICLES:END-->\n|<p>更多路線請見.*?<\/p>\n|<h2>其他登山接駁路線<\/h2>\n<p>.*?<\/p>\n|<h2>[^<]*出發前準備<\/h2>\n[\s\S]*?<\/ul>\n\n/g)].pop();
  const clMd = tailStart ? htmlToBody(tail.slice(tailStart.index + tailStart[0].length)) : '';
  r.closing = clMd === DEFAULT_CLOSING ? '' : clMd;

  // 主體：CTA 段落之後到「常見問題 / 影片」之前
  const afterCta = html.split(/<p><a class="cta"[^\n]*<\/p>\n\n/)[1];
  r.intro = htmlToInline(html.match(/<h1>.*?<\/h1>\n<p>(.*?)<\/p>/)[1]);
  const mainEnd = afterCta.search(/<!--VIDEO:START-->|<h2>常見問題<\/h2>/);
  const secs = afterCta.slice(0, mainEnd).split(/\n\n(?=<h2>)/).map((s) => s.trim()).filter(Boolean);
  r.sections = secs.map((s, i) => {
    const m = s.match(/^<h2>(.*?)<\/h2>\n([\s\S]*)$/);
    if (!m) { warn(`${slug}: 區塊 ${i} 無法解析`); return { id: `s${i}`, heading: '', body: '' }; }
    return { id: `s${i + 1}`, heading: unesc(m[1]), body: htmlToBody(m[2]) };
  });

  // FAQ
  const faqM = html.match(/<h2>常見問題<\/h2>\n([\s\S]*?)\n\n(?=<h2>)/);
  r.faq = [];
  if (faqM) for (const m of faqM[1].matchAll(/<h3>(.*?)<\/h3>\n<p>(.*?)<\/p>/g)) r.faq.push({ q: unesc(m[1]), a: htmlToInline(m[2]) });

  // 出發前準備
  const prepM = html.match(/<h2>([^<]*出發前準備)<\/h2>\n([\s\S]*?)\n\n(?=<h2>其他登山接駁路線)/);
  r.prep = prepM ? { heading: unesc(prepM[1]), body: htmlToBody(prepM[2]) } : { heading: '', body: '' };

  // 影片
  r.video = { youtubeId: '', title: '', description: '', uploadDate: '', duration: '', heading: '', summary: [], transcript: '' };
  const vm = html.match(/<!--VIDEO:START-->\n<h2>(.*?)<\/h2>\n<div class="video">\n[\s\S]*?embed\/([^"]+)" title="(.*?)" loading[\s\S]*?<\/iframe><\/div>\n(?:<ul>(.*?)<\/ul>)?\n(?:<details><summary>影片逐字稿<\/summary>(.*?)<\/details>)?\n<\/div>\n<!--VIDEO:END-->/s);
  if (vm) {
    r.video.heading = unesc(vm[1]);
    r.video.youtubeId = vm[2];
    r.video.title = unesc(vm[3]);
    r.video.summary = vm[4] ? [...vm[4].matchAll(/<li>(.*?)<\/li>/g)].map((x) => unesc(x[1])) : [];
    r.video.transcript = vm[5] ? [...vm[5].matchAll(/<p>(.*?)<\/p>/g)].map((x) => unesc(x[1])).join('\n') : '';
  } else if (html.includes('<!--VIDEO:START-->')) warn(`${slug}: 影片區塊無法解析`);
  // videos.json 的欄位（說明、上傳日期、長度…）以 videos.json 為準
  try {
    const vj = JSON.parse(fs.readFileSync(path.join(PUB, 'videos.json'), 'utf8'))[slug];
    if (vj) {
      r.video.description = vj.description || '';
      r.video.uploadDate = vj.uploadDate || '';
      r.video.duration = vj.duration || '';
      if (vj.thumbnailUrl) r.video.thumbnailUrl = vj.thumbnailUrl;
      if (!r.video.youtubeId && vj.youtubeId) { r.video.youtubeId = vj.youtubeId; r.video.title = vj.title || ''; r.video.heading = vj.heading || ''; r.video.summary = vj.summary || []; }
    }
  } catch (e) { warn('讀取 videos.json 失敗', e.message); }
  if (vo && vo.uploadDate && !r.video.uploadDate) r.video.uploadDate = vo.uploadDate;

  // 攻略文章
  r.articles = [];
  const am = html.match(/<!--ARTICLES:START-->\n<h2>路線攻略文章<\/h2>\n<ul>\n([\s\S]*?)\n<\/ul>\n<!--ARTICLES:END-->/);
  if (am) for (const m of am[1].matchAll(/<li><a href="(.*?)" target="_blank" rel="noopener">(.*?)<\/a><\/li>/g)) r.articles.push({ title: unesc(m[2]), url: unesc(m[1]), show: true });
  try {
    const aj = JSON.parse(fs.readFileSync(path.join(PUB, 'articles.json'), 'utf8'))[slug] || [];
    for (const a of aj) if (a && a.show === false && !r.articles.some((x) => x.url === a.url)) r.articles.push({ title: a.title || '', url: a.url || '', show: false });
  } catch { /* ignore */ }

  routes.push(r);
}

routes.sort((a, b) => a.order - b.order);
// 重新編號為 10, 20, 30…，之後後台插入/調整順序較方便
routes.forEach((r, i) => { r.order = (i + 1) * 10; });

// ---- 比對 ----
let bad = 0;
const rendered = {};
for (const r of routes) {
  const out = renderRoutePage(r, { routes });
  rendered[r.slug] = out;
  const a = originals[r.slug].split('\n');
  const b = out.split('\n');
  const diffs = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) diffs.push(i + 1);
  const navOnly = diffs.length > 0 && diffs.every((n) => /^<p><a href="\/hehuanshan\/">/.test(b[n - 1] || '') || /^<p><a href="\/hehuanshan\/">/.test(a[n - 1] || '')) && diffs.length <= 2;
  if (navOnly) {
    console.log(`△ ${r.slug}: 僅「其他登山接駁路線」導覽不同（原頁漏列了部分路線，產生器會補齊）`);
    continue;
  }
  if (diffs.length) {
    bad++;
    console.log(`✗ ${r.slug}: ${diffs.length} 行不同（行 ${diffs.slice(0, 6).join(', ')}）`);
    const i = diffs[0] - 1;
    console.log('   原本:', String(a[i]).slice(0, 220));
    console.log('   產生:', String(b[i]).slice(0, 220));
  } else console.log(`✓ ${r.slug}`);
}
fs.mkdirSync(path.join(ROOT, 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'routes.seed.json'), JSON.stringify(routes, null, 2) + '\n');
console.log(`\n已寫入 src/data/routes.seed.json（${routes.length} 條路線）。不一致：${bad} 頁`);
if (process.argv.includes('--write-pages') && bad === 0) {
  for (const r of routes) fs.writeFileSync(path.join(PUB, r.slug, 'index.html'), rendered[r.slug]);
  console.log('已用產生器輸出覆寫 public/<slug>/index.html');
}
process.exit(bad ? 1 : 0);
