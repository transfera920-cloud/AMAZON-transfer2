import React from 'react';
import { Mountain, Moon, Sun, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({ darkMode, onToggleDarkMode }) => {
  return (
    <header className="border-b border-emerald-900/40 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/30 shrink-0">
              <Mountain className="w-5 h-5 text-emerald-200" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                  亞馬遜國家山岳協會
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 font-medium">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  官方列管 83 條
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100 truncate">
                台灣林道通行狀況
              </h1>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 方案 A: 查看林保署官方最新狀態 */}
            <a
              href="https://www.forest.gov.tw/0003286"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-emerald-950/40 border border-emerald-400/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>查看林保署官方最新狀態</span>
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-emerald-300 border border-slate-700/70 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title={darkMode ? '切換為明亮模式' : '切換為深色模式'}
              aria-label={darkMode ? '切換為明亮模式' : '切換為深色模式'}
            >
              {darkMode ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden lg:inline text-slate-300">淺色</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-emerald-400" />
                  <span className="hidden lg:inline text-slate-300">深色</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
