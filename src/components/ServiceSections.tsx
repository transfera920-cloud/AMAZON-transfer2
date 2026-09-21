import React from 'react';
import { ROUTES, DEPARTURE_CITIES } from './PriceCalcModal';

interface SectionShellProps {
  title: string;
  children: React.ReactNode;
}

const SectionShell: React.FC<SectionShellProps> = ({ title, children }) => (
  <section className="bg-[#0e2318]/85 border border-emerald-900/60 rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md mb-12 relative overflow-hidden">
    <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center relative z-10">
      <span className="w-1.5 h-5 bg-gradient-to-b from-[#00e676] to-[#00c853] rounded-full mr-3 inline-block shadow-[0_0_8px_rgba(0,200,83,0.6)]"></span>
      <span>{title}</span>
    </h2>
    <div className="text-emerald-100/85 leading-relaxed text-sm md:text-base space-y-4 relative z-10">
      {children}
    </div>
  </section>
);

export const TrailheadCharterSection: React.FC = () => (
  <SectionShell title="登山口接送與登山包車">
    <p>
      提供由 {DEPARTURE_CITIES.join('、')} 出發的登山口包車接送。車型可選擇 9 人座商務車、7 人座休旅，或適合林道碎石路段的高底盤四驅車，並可依行程選擇來回包車或單程，也可選擇夜間或 D0 跨夜出發的時段。
    </p>
    <p>可使用上方「價格估算系統」，先試算各路線的包車費用。</p>
  </SectionShell>
);

export const PopularRoutesSection: React.FC = () => (
  <SectionShell title="熱門百岳登山接駁路線">
    <ul className="space-y-2.5 list-none">
      {ROUTES.map((route) => (
        <li key={route.name}>
          <span className="font-semibold text-white">{route.name}</span>
          <span>：{route.description}</span>
        </li>
      ))}
    </ul>
  </SectionShell>
);

export const OneWayTripSection: React.FC = () => (
  <SectionShell title="A進B出與行程接送">
    <p>
      A進B出是指從一個登山口入山、由另一個登山口下山的行程（例如縱走），起點與終點不同。本站價格估算提供「來回包車」與「單程」兩種行程模式；若您的行程入山口與下山口不同，歡迎透過 LINE 說明入山口、下山口與日期。
    </p>
  </SectionShell>
);

export const ServiceProcessSection: React.FC = () => (
  <SectionShell title="登山接駁服務流程">
    <ol className="space-y-2.5 list-decimal list-inside">
      <li>於「價格估算系統」選擇目標百岳／登山口與出發城市。</li>
      <li>選擇車型、行程模式（來回或單程）、乘客人數，以及是否為夜間出發。</li>
      <li>查看試算的預估費用。</li>
      <li>點選「帶入報價加 LINE 預約」，系統會複製行程摘要並開啟 LINE，貼上訊息即可詢問預約日期是否有車趟。</li>
    </ol>
  </SectionShell>
);
