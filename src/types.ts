export interface CardItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  url: string;
  badge?: string;
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
}

export type ActiveModalType = 'admin' | 'calc' | 'hotel' | 'food' | 'road' | null;
