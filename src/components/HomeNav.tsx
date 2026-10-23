import React, { useState } from 'react';
import { routeCategories, navLinkText } from '../../shared/homeContent.mjs';
import type { HomeContent, HomeRoutes } from '../../shared/homeContent.mjs';

/**
 * 首頁路線選單（放在「高山接駁服務與即時查詢」卡片區上方）。
 * 分類 = 後台「首頁內容」的路線清單區塊（名稱、順序、路線歸屬都在後台設定）；連結文字固定為「山名＋接駁」。
 * 靜態 HTML 版本由 scripts/build-home.mjs 寫進 index.html，兩邊用同一份資料。
 */
export const HomeNav: React.FC<{ content: HomeContent; routes: HomeRoutes }> = ({ content, routes }) => {
  const cats = routeCategories(content.blocks)
    .map((c) => ({ ...c, list: routes[c.id] || [] }))
    .filter((c) => c.list.length);
  const [open, setOpen] = useState<string | null>(() => cats[0]?.id ?? null);
  if (!cats.length) return null;
  const active = cats.find((c) => c.id === open);

  return (
    <nav aria-label="登山接駁路線選單" className="mb-6 md:mb-10">
      <div className="flex flex-wrap justify-center gap-2 md:gap-3">
        {cats.map((c) => {
          const on = c.id === open;
          return (
            <button
              key={c.id}
              type="button"
              aria-expanded={on}
              onClick={() => setOpen(on ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm md:text-base font-semibold border transition-colors cursor-pointer ${
                on
                  ? 'bg-emerald-600/30 border-emerald-400 text-white'
                  : 'bg-[#0a2015]/80 border-emerald-700/60 text-emerald-200 hover:text-white hover:border-emerald-500'
              }`}
            >
              {c.title}
              <span className="ml-1.5 text-xs opacity-70" aria-hidden="true">{on ? '▴' : '▾'}</span>
            </button>
          );
        })}
      </div>
      {active && (
        <ul className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 bg-[#0e2318]/85 border border-emerald-900/60 rounded-2xl p-3 md:p-4 list-none">
          {active.list.map((r) => (
            <li key={r.slug}>
              <a
                href={r.url}
                className="block px-3 py-2 rounded-lg text-sm md:text-base text-emerald-100 hover:bg-emerald-900/50 hover:text-white"
              >
                {navLinkText(r)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
};
