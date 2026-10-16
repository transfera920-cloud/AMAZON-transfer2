/**
 * 集中管理 SEO 相關文案與設定。
 * 主站 <title> / description 以 index.html 為準；
 * 此檔供 React 元件與落地頁共用品牌與 H1 文案。
 */

/** 頁面搜尋主題 (H1)。固定寫在程式碼中，不受後台「網站大標題」影響。 */
export const PAGE_H1 = '登山接駁｜百岳、高山登山口接送服務';

/** 品牌全名 */
export const BRAND_NAME = '亞馬遜高山接駁';

/** 協會名稱（頁首小字） */
export const ASSOCIATION_NAME = '亞馬遜國家山岳協會';

/** 預設 Meta Description（與 index.html 保持一致） */
export const DEFAULT_DESCRIPTION =
  '亞馬遜高山接駁提供全台熱門百岳與高山步道的登山口包車接送，涵蓋合歡山、雪山、玉山、嘉明湖、奇萊南華、大霸尖山、郡大山。合法營業車、職業駕照司機、600萬乘客平安險，可線上試算費用。';

/** 熱門落地頁（用於內部連結與 Footer） */
export const LANDING_PAGES = [
  { path: '/hehuanshan/', name: '合歡山接駁', short: '合歡山' },
  { path: '/xueshan/', name: '雪山接駁', short: '雪山' },
  { path: '/yushan/', name: '玉山接駁', short: '玉山' },
  { path: '/jiaminghu/', name: '嘉明湖接駁', short: '嘉明湖' },
  { path: '/qilai-nanhua/', name: '奇萊南華接駁', short: '奇萊南華' },
  { path: '/dabajianshan/', name: '大霸尖山接駁', short: '大霸尖山' },
  { path: '/jundashan/', name: '郡大山接駁', short: '郡大山' },
] as const;

/** 聯絡資訊 */
export const CONTACT = {
  phone: '0972573495',
  phoneIntl: '+886972573495',
  lineUrl: 'https://lin.ee/x8u0XAR',
  priceUrl: 'https://price.amazon-hike.com/',
  siteUrl: 'https://transfer.amazon-hike.com/',
} as const;
