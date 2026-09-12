import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { SiteData } from '../types';

interface HeaderProps {
  data: SiteData;
  onOpenAdmin: () => void;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ data, onOpenAdmin, isCloudConnected = false }) => {
  return (
    <>
      {/* 管理後台按鈕 (固定右上角) */}
      <button
        id="btn-admin-open"
        onClick={onOpenAdmin}
        className="fixed top-4 right-4 z-40 bg-gray-800/90 hover:bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 backdrop-blur-sm transition-all border border-gray-600/50 cursor-pointer"
        title="開啟網站內容管理後台"
      >
        <i className="fa-solid fa-gear" aria-hidden="true"></i>
        <span>管理後台</span>
        {isCloudConnected && (
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
            title="已連線至 Firebase Firestore 雲端共用資料庫"
          ></span>
        )}
      </button>

      {/* 頁首區塊 Header */}
      <header className="bg-dark-green text-white pt-12 pb-8 px-4 text-center relative shadow-md">
        <div className="max-w-4xl mx-auto">
          {/* 網站大標題 */}
          <h1
            id="site-title"
            className="text-3xl md:text-5xl font-extrabold tracking-wide mb-3 text-white drop-shadow-sm"
          >
            {data.siteTitle}
          </h1>

          {/* 副標題 / 標語 */}
          <p
            id="site-subtitle"
            className="text-emerald-100 text-sm md:text-base tracking-widest mb-7 font-medium"
          >
            {data.siteSubtitle}
          </p>

          {/* 大 LINE 按鈕 */}
          <div className="flex justify-center">
            <a
              id="hero-line-link"
              href={data.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-accent-green hover:bg-[#00e676] text-white font-bold px-8 py-3.5 rounded-full text-base md:text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <i className="fa-brands fa-line text-2xl mr-2.5" aria-hidden="true"></i>
              <span id="hero-line-text">{data.heroLineText || "點我加 LINE 官方帳號預約"}</span>
            </a>
          </div>

          {/* 賣點/特色條標籤 */}
          <div
            id="features-container"
            className="mt-8 pt-6 border-t border-emerald-800/60 flex flex-wrap justify-center gap-x-6 gap-y-2.5 text-xs md:text-sm text-emerald-200"
          >
            {data.features && data.features.length > 0 ? (
              data.features.map((feat, idx) => (
                <span key={idx} className="flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00c853]"></span>
                  <span>{feat}</span>
                </span>
              ))
            ) : (
              <span>• 合法租賃營業車 • 職業駕照司機 • 準時接送不延誤 • 500萬乘客險</span>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
