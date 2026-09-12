import React from 'react';
import { ShieldCheck, UserCheck, Clock, Award, Compass, Car } from 'lucide-react';

interface AboutSectionProps {
  title: string;
  content: string;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ title, content }) => {
  return (
    <section className="bg-white rounded-xl p-6 md:p-8 shadow-sm border border-gray-100 mb-10">
      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
        <span className="w-1.5 h-5 bg-dark-green rounded-full mr-2.5 inline-block"></span>
        <span id="about-title">{title}</span>
      </h3>

      {/* Content paragraphs */}
      <div
        id="about-content"
        className="text-gray-600 leading-relaxed text-sm space-y-4 whitespace-pre-line"
      >
        {content}
      </div>

      {/* Trust & Reliability Badges */}
      <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-gray-800">500萬責任險</div>
            <div className="text-[10px] text-gray-500">每位乘客高額保障</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <UserCheck className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-gray-800">職業駕照司機</div>
            <div className="text-[10px] text-gray-500">百岳深山路況豐富</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <Car className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-gray-800">合規營業租賃車</div>
            <div className="text-[10px] text-gray-500">定期保養定檢齊全</div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100/60">
          <Clock className="w-5 h-5 text-emerald-700 flex-shrink-0" />
          <div className="text-left">
            <div className="text-xs font-bold text-gray-800">準時安全接送</div>
            <div className="text-[10px] text-gray-500">全台登山口到府點對點</div>
          </div>
        </div>
      </div>
    </section>
  );
};
