// 入園入山申請頁共用函式。
// 這幾個函式必須是「自給自足」的（不引用外部變數），因為建置腳本會用 toString() 把它們
// 原樣放進 /permit/ 頁面，讓瀏覽器載入後能直接讀後台最新的順序。

// 把 Firestore REST 回傳的欄位格式還原成一般 JS 值
export function decodeFirestore(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(decodeFirestore);
  if ('mapValue' in v) {
    var out = {};
    var f = (v.mapValue && v.mapValue.fields) || {};
    Object.keys(f).forEach(function (k) { out[k] = decodeFirestore(f[k]); });
    return out;
  }
  return null;
}

// 從後台卡片清單中找出「入園入山申請系統」那張卡，並依後台順序分成區塊（依分類第一次出現的順序）
export function buildGroups(cards) {
  var card = (cards || []).filter(function (c) {
    return c && /入園|入山/.test(String(c.title || '')) && c.links && c.links.length;
  })[0];
  if (!card) return [];
  var groups = [];
  card.links.forEach(function (l) {
    if (!l || !String(l.label || '').trim() || !String(l.url || '').trim()) return;
    var name = String(l.group || '').trim();
    var g = groups.filter(function (x) { return x.name === name; })[0];
    if (g) g.items.push(l);
    else groups.push({ name: name, items: [l] });
  });
  return groups;
}

export function renderGroups(groups, descs) {
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  var href = function (u) {
    var t = String(u).trim();
    return /^(https?:|tel:|mailto:|line:)/i.test(t) ? t : 'https://' + t;
  };
  return groups.map(function (g) {
    var d = descs && descs[g.name] ? '<p>' + esc(descs[g.name]) + '</p>' : '';
    var items = g.items.map(function (l) {
      return '<li><a href="' + esc(href(l.url)) + '" target="_blank" rel="noopener">' + esc(String(l.label).trim()) + '</a></li>';
    }).join('');
    return '<h3>' + esc(g.name || '其他申請入口') + '</h3>' + d + '<ul>' + items + '</ul>';
  }).join('\n');
}
