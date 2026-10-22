// 讀取 Firestore routes 集合（建置腳本共用）。
//   1. 先用「列出整個集合」讀取（一次取得全部）。
//   2. 若列表被 Firebase 拒絕（HTTP 403；本專案未登入者只能單筆讀取、不能列表），
//      改成「逐條讀取」：路線代稱 = 預設 seed 的代稱 ＋ settings/general 的 routeSlugs
//      （後台開啟「路線內容管理」時會自動同步，新增路線也會寫入）。
//   其他錯誤（網路、HTTP 5xx 等）照舊丟出，讓建置中止、保留上一版網站。
import { decodeFirestore } from './permit-render.mjs';

const dec = (d) => decodeFirestore({ mapValue: { fields: d.fields || {} } });

export async function fetchRoutesResilient({ BASE, key, getJson, seedSlugs = [], tag = 'routes' }) {
  try {
    const out = [];
    let token = '';
    do {
      const j = await getJson(`${BASE}/routes?pageSize=100&key=${key}${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
      for (const d of j.documents || []) out.push(dec(d));
      token = j.nextPageToken || '';
    } while (token);
    return out;
  } catch (e) {
    if (!/HTTP 403/.test(e.message)) throw e;
    console.warn(`[${tag}] 列出 routes 集合被拒絕（${e.message}），改為逐條讀取`);
  }

  const slugs = new Set(seedSlugs);
  try {
    const j = await getJson(`${BASE}/settings/general?key=${key}`);
    const list = dec(j).routeSlugs;
    if (Array.isArray(list)) for (const s of list) if (typeof s === 'string' && /^[a-z0-9-]+$/.test(s)) slugs.add(s);
  } catch (e) {
    if (!/HTTP 404/.test(e.message)) throw e;
  }

  const out = [];
  const missing = [];
  for (const slug of slugs) {
    try {
      const j = await getJson(`${BASE}/routes/${encodeURIComponent(slug)}?key=${key}`);
      out.push(dec(j));
    } catch (e) {
      if (/HTTP 404/.test(e.message)) missing.push(slug);
      else throw e; // 403、5xx 等：整個建置中止，不用不完整的資料覆蓋網站
    }
  }
  console.log(`[${tag}] 逐條讀取：讀到 ${out.length} 條${missing.length ? `，後台沒有：${missing.join('、')}` : ''}`);
  return out;
}
