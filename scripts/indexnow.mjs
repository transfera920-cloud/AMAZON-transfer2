// 通知 Bing 等支援 IndexNow 的搜尋引擎：網址有新增或更新。
// 用法（網站「發布」完成、新版本已上線之後）：  npm run indexnow
//   - 預設送出 sitemap.xml 裡的全部網址；也可以只送指定網址： node scripts/indexnow.mjs https://transfer.amazon-hike.com/yushan/
// 金鑰檔是 public/7afb778dd1dc8aead3ccf6080e878b63.txt（內容就是金鑰本身），網站上線後必須能在 {SITE}/7afb778dd1dc8aead3ccf6080e878b63.txt 打開，否則會被拒絕。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'transfer.amazon-hike.com';
const SITE = `https://${HOST}`;
const KEY = '7afb778dd1dc8aead3ccf6080e878b63';

let urls = process.argv.slice(2).filter((u) => u.startsWith(SITE));
if (!urls.length) {
  const xml = fs.readFileSync(path.join(ROOT, 'public', 'sitemap.xml'), 'utf8');
  urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
}
if (!urls.length) { console.error('沒有可送出的網址'); process.exit(1); }

// 先確認金鑰檔已經上線，避免白送
const keyUrl = `${SITE}/${KEY}.txt`;
try {
  const res = await fetch(keyUrl);
  const body = (await res.text()).trim();
  if (!res.ok || body !== KEY) throw new Error(`HTTP ${res.status}，內容不符`);
} catch (e) {
  console.error(`✗ 金鑰檔 ${keyUrl} 還打不開（${e.message}）。請先把網站發布上線再執行。`);
  process.exit(1);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList: urls }),
});
console.log(`IndexNow 回應：HTTP ${res.status}（200／202 = 已收到）；送出 ${urls.length} 個網址`);
if (res.status >= 400) process.exit(1);
