// 建置腳本共用：把「本次建置」從 Firestore 讀到的資料存成暫存檔，讓後面的腳本直接沿用，
// 不必各自再讀一次（Firestore 免費版每天有讀取次數上限，每條路線每讀一次就算一次）。
//
// 規則：
//   - 只有 build-routes.mjs（建置鏈的第一支）會真的去讀 Firestore，並寫出暫存檔。
//   - build-home.mjs、build-permit.mjs 只在「暫存檔是 10 分鐘內、來源網址相同」時才沿用；否則照舊自己讀。
//   - 暫存檔放在 .cache/（已列入 .gitignore，不會被提交），Cloudflare 每次建置都是乾淨環境，不會有過期資料。
import fs from 'node:fs';
import path from 'node:path';

const MAX_AGE_MS = 10 * 60 * 1000;
const file = (root) => path.join(root, '.cache', 'firestore-snapshot.json');

/** routes：已解碼的路線資料（會拿掉 photos，首頁與申請頁用不到，也避免暫存檔過大）；settings：settings/general 解碼後的物件，讀不到就傳 null */
export function writeSnapshot(root, { base, routes, settings }) {
  try {
    fs.mkdirSync(path.join(root, '.cache'), { recursive: true });
    const slim = routes.map((r) => { const { photos, ...rest } = r || {}; return rest; });
    fs.writeFileSync(file(root), JSON.stringify({ base, fetchedAt: Date.now(), routes: slim, settings: settings ?? null }));
  } catch { /* 寫不出暫存檔不影響建置，後面的腳本會自己讀 */ }
}

/** 取得可沿用的暫存資料；沒有、過期、來源不同或內容不完整就回傳 null */
export function readSnapshot(root, base) {
  try {
    const s = JSON.parse(fs.readFileSync(file(root), 'utf8'));
    if (!s || s.base !== base || !Array.isArray(s.routes) || !s.routes.length) return null;
    if (!(Date.now() - Number(s.fetchedAt) < MAX_AGE_MS)) return null;
    return s;
  } catch { return null; }
}
