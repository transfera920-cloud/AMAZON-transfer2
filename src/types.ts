export interface CardLink {
  group: string; // 分類，例：國家公園（可留空）
  label: string; // 顯示文字
  url: string;   // 實際網址（前台不顯示）
}

export interface CardItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  url: string;
  badge?: string;
  links?: CardLink[]; // 有填時，點卡片會彈出連結清單（不顯示網址）
}

export interface SiteData {
  phone: string;
  lineUrl: string;
  email: string;
  siteTitle: string;
  siteSubtitle: string;
  heroLineText: string;
  sectionTitle: string;
  seoDesc: string;
  features: string[];
  aboutTitle: string;
  aboutContent: string;
  footerBannerTitle: string;
  footerBannerSub: string;
  cards: CardItem[];
  popularRoutesTitle?: string;
  // 首頁內容（後台「首頁內容」分頁編輯；沒存過就用 shared/homeContent.mjs 的預設）
  homeBlocks?: unknown[];
  homeFaq?: { q: string; a: string }[];
  permitFaq?: { q: string; a: string }[];
  contentUpdatedAtMs?: number; // 首頁內容最後儲存時間，用來判斷「有尚未發布的變更」
  lastUpdated?: string;
}

export type ActiveModalType = 'admin' | 'calc' | 'hotel' | 'food' | 'road' | null;

export interface RouteSection {
  id: string;
  heading: string;
  body: string; // 簡易標記：空白行分段、「- 」條列、「1. 」編號、[文字](網址)
}

export interface RouteVideo {
  youtubeId: string;
  heading: string;
  title: string;
  description: string;
  uploadDate: string; // YYYY-MM-DD
  duration: string;   // ISO 8601，例 PT5M30S
  summary: string[];
  transcript: string;
  thumbnailUrl?: string;
}

export interface RouteArticle {
  title: string;
  url: string;
  show: boolean;
}

export interface RouteData {
  slug: string;
  name: string;
  navName: string;
  listName: string;
  group: 'popular' | 'more';
  order: number;
  published: boolean;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  breadcrumbName: string;
  serviceName: string;
  homeName?: string;  // 首頁路線清單的顯示名稱（沒填就用內建預設或 listName）
  homeDesc?: string;  // 首頁路線清單名稱後面的說明
  intro: string;
  ctaPrice?: { label: string; url: string };
  sections: RouteSection[];
  faq: { q: string; a: string }[];
  prep: { heading: string; body: string };
  video: RouteVideo;
  articles: RouteArticle[];
  closing?: string;
  updatedAt?: string;   // YYYY-MM-DD（輸出到頁面與 sitemap）
  updatedAtMs?: number; // 用來判斷「有尚未發布的變更」
}
