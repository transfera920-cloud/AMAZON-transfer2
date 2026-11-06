// 車輛實拍照片（首頁、/about/、路線頁共用同一份）。圖檔放在 public/images/fleet/。
// 要換照片或改說明：只改這裡，重新建置後首頁、/about/、路線頁、結構化資料與 sitemap 會一起更新。
// 照片已遮掉車尾舊電話；新增照片前請先確認畫面中沒有電話號碼。
export const FLEET_PHOTOS = [
  {
    src: '/images/fleet/vw-caravelle-mountain-road.webp',
    alt: '福斯 Caravelle 九人座接駁車停在山區道路旁',
    caption: '福斯 Caravelle 九人座租賃小客車，山區道路接送',
    width: 716,
    height: 557,
  },
  {
    src: '/images/fleet/vw-caravelle-fleet-night.webp',
    alt: '夜間路邊集合的三輛福斯 Caravelle 登山接駁車車尾',
    caption: '夜間集合的接駁車隊，適合前一晚或凌晨出發的行程',
    width: 960,
    height: 625,
  },
  {
    src: '/images/fleet/vw-caravelle-front-parking.webp',
    alt: '福斯 Caravelle 黑色登山接駁車正面，停放於停車場',
    caption: '車輛定期保養，乘客最多 8 位',
    width: 720,
    height: 573,
  },
  {
    src: '/images/fleet/vw-caravelle-front-three-quarter.webp',
    alt: '福斯 Caravelle 黑色九人座租賃小客車車身斜前方',
    caption: '合法租賃營業車，依法投保強制險並加保乘客傷害責任險',
    width: 720,
    height: 681,
  },
];

export const FLEET_HEADING = '我們的接駁車輛';

export const FLEET_CSS = `/*FLEET:START*/
.fleet{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:16px 0}
.fleet figure{margin:0}
.fleet img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:12px;background:#0b1f17}
.fleet figcaption{font-size:14px;color:#a7f3d0;margin-top:6px;line-height:1.6}
/*FLEET:END*/`;

const escHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 靜態 HTML 圖片區塊；count 指定只放前幾張（路線頁放 2 張，/about/ 放全部） */
export function fleetFiguresHtml(count = FLEET_PHOTOS.length) {
  return FLEET_PHOTOS.slice(0, count)
    .map(
      (p) =>
        `<figure><img src="${escHtml(p.src)}" alt="${escHtml(p.alt)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async" /><figcaption>${escHtml(p.caption)}</figcaption></figure>`
    )
    .join('\n');
}

export const fleetBlockHtml = (count = 2) =>
  `<h2>${FLEET_HEADING}</h2>\n<div class="fleet">\n${fleetFiguresHtml(count)}\n</div>\n`;

/** 結構化資料用：ImageObject 陣列（完整網址） */
export function fleetImageObjects(site, count = FLEET_PHOTOS.length) {
  return FLEET_PHOTOS.slice(0, count).map((p) => ({
    '@type': 'ImageObject',
    url: `${site}${p.src}`,
    contentUrl: `${site}${p.src}`,
    width: p.width,
    height: p.height,
    caption: p.alt,
  }));
}

/** sitemap 用：完整網址清單 */
export const fleetImageUrls = (site, count = FLEET_PHOTOS.length) => FLEET_PHOTOS.slice(0, count).map((p) => `${site}${p.src}`);
