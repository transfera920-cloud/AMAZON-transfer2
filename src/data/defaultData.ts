import { SiteData } from '../types';

export const STORAGE_KEY = 'amazon_mount_data';

export const DEFAULT_DATA: SiteData = {
  phone: "0912345678",
  lineUrl: "https://line.me",
  email: "amazonchiayi@gmail.com",
  siteTitle: "亞馬遜高山接駁",
  siteSubtitle: "安全 ‧ 舒適 ‧ 準時 | 專業百岳高山包車接駁",
  heroLineText: "點我加 LINE 官方帳號預約",
  sectionTitle: "高山接駁服務與即時查詢",
  seoDesc: "亞馬遜高山接駁提供全台灣熱門百岳與高山步道之專業接駁服務。合法租賃營業車、職業駕照司機、500萬乘客平安險，讓您的登山行程更安心順暢。",
  features: [
    "合法租賃營業車",
    "職業駕照司機",
    "準時接送不延誤",
    "全台登山口接送",
    "500萬乘客平安險"
  ],
  aboutTitle: "關於亞馬遜高山接駁",
  aboutContent: `亞馬遜高山接駁提供全台灣熱門百岳與高山步道之專業接駁服務。無論您是要前往合歡山群峰、雪山主東峰、嘉明湖（向陽）、玉山登山口、奇萊南華，或是能高越嶺等路線，我們皆提供安全、優質的接駁車隊體驗。\n\n提供司機駕駛經驗豐富的高山接駁服務，協助登山客解決大眾運輸不便的問題。請善用本站提供的價格估算系統、D0住宿推薦、慶功宴餐廳資訊與即時道路管制動態，讓您的登山行程更安心順暢。`,
  footerBannerTitle: "高山登山接駁專屬預約",
  footerBannerSub: "合法租賃車輛 ‧ 行程彈性安排 ‧ 歡迎提早預約包車",
  cards: [
    {
      id: "card-1",
      icon: "fa-calculator",
      title: "價格估算系統",
      desc: "透明化高山包車資估算，快速試算包車費用",
      url: "#calc"
    },
    {
      id: "card-2",
      icon: "fa-hotel",
      title: "D0 住宿查詢",
      desc: "登山口周邊優質民宿與接駁合作住宿推薦篇",
      url: "#hotel"
    },
    {
      id: "card-3",
      icon: "fa-utensils",
      title: "下山慶功宴查詢",
      desc: "精選完登下山補給合菜與在地美食餐廳",
      url: "#food"
    },
    {
      id: "card-4",
      icon: "fa-triangle-exclamation",
      title: "道路路線管制查詢",
      desc: "即時掌握林道與高山省道最新施工管制時間",
      url: "#road"
    }
  ]
};
