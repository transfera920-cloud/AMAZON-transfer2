import React from 'react';
import { Mountain, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 border-t border-slate-800/80 bg-slate-900/60 text-slate-400 py-8 text-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-slate-200">
              亞馬遜國家山岳協會 Amazon National Mountain Association
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>資料範疇：農業部林業及自然保育署 83 條官方列管林道</span>
          </div>
        </div>

        <div className="border-t border-slate-800/60 pt-4 text-center sm:text-left text-slate-500 leading-relaxed text-[11px] space-y-1">
          <p>
            聲明：本工具純粹作為林道清冊與通報狀態檢視，嚴格遵循不臆測路況與不製造未證實資訊原則。目前所有林道路況通報指標均列為「未確認」或「—」，請登山夥伴出發前密切關注林業及自然保育署與各分署即時公告。
          </p>
        </div>
      </div>
    </footer>
  );
};
