import React from 'react';
import { Mountain, ShieldCheck, Phone, MessageCircle } from 'lucide-react';
import { LANDING_PAGES, CONTACT, BRAND_NAME, ASSOCIATION_NAME } from '../data/seoContent';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-900/60 text-slate-400 py-8 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Brand + Contact */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="font-semibold text-slate-200 block">{BRAND_NAME}</span>
              <span className="text-[11px] text-slate-500">{ASSOCIATION_NAME}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px]">
            <a
              href={`tel:${CONTACT.phone}`}
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              {CONTACT.phone}
            </a>
            <a
              href={CONTACT.lineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              LINE 預約
            </a>
            <a
              href={CONTACT.priceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors"
            >
              價格估算系統
            </a>
          </div>
        </div>

        {/* Landing page internal links */}
        <div className="border-t border-slate-800/60 pt-4">
          <p className="text-[11px] text-slate-500 mb-2 font-medium">熱門登山接駁路線</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {LANDING_PAGES.map((page) => (
              <a
                key={page.path}
                href={page.path}
                className="text-[12px] text-emerald-400/90 hover:text-emerald-300 underline-offset-2 hover:underline transition-colors"
              >
                {page.name}
              </a>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-slate-800/60 pt-4 text-center sm:text-left text-slate-500 leading-relaxed text-[11px] space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>合法營業車 · 職業駕照司機 · 600萬乘客平安險</span>
          </div>
          <p>
            林道路況資料僅供參考，請以農業部林業及自然保育署與各分署官方公告為準。出發前請確認路況與天氣。
          </p>
        </div>
      </div>
    </footer>
  );
};
