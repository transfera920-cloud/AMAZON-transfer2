import React from 'react';
import { SiteData } from '../types';

interface FooterProps {
  data: SiteData;
}

export const Footer: React.FC<FooterProps> = ({ data }) => {
  const phoneHref = `tel:${data.phone || ''}`;
  const emailHref = `mailto:${data.email || ''}`;

  return (
    <footer className="bg-dark-green text-white py-4 px-6 mt-auto border-t border-emerald-900/60 shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
          <h4 id="footer-banner-title" className="font-bold text-lg text-white">
            {data.footerBannerTitle || "高山登山接駁專屬預約"}
          </h4>
          <p id="footer-banner-sub" className="text-xs text-emerald-200/90 mt-0.5">
            {data.footerBannerSub || "合法租賃車輛 ‧ 行程彈性安排 ‧ 歡迎提早預約包車"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* 來電諮詢 */}
          <a
            id="footer-phone-link"
            href={phoneHref}
            className="bg-white text-gray-800 font-bold px-4 py-2 rounded-lg text-sm flex items-center hover:bg-gray-100 transition shadow-xs cursor-pointer"
            title={`撥打電話：${data.phone}`}
          >
            <i className="fa-solid fa-phone text-emerald-700 mr-2" aria-hidden="true"></i>
            <span>來電諮詢</span>
          </a>

          {/* Email 聯絡 */}
          <a
            id="footer-email-link"
            href={emailHref}
            className="bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center hover:bg-emerald-700 transition shadow-xs cursor-pointer"
            title={`發送電子郵件：${data.email}`}
          >
            <i className="fa-solid fa-envelope mr-2" aria-hidden="true"></i>
            <span>Email 聯絡</span>
          </a>

          {/* LINE 立即預約 */}
          <a
            id="footer-line-link"
            href={data.lineUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent-green hover:bg-[#00e676] text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center transition shadow-xs cursor-pointer"
            title="開啟 LINE 官方帳號"
          >
            <i className="fa-brands fa-line text-lg mr-2" aria-hidden="true"></i>
            <span>LINE 立即預約</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
