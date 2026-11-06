import React from 'react';
import { FLEET_PHOTOS, FLEET_HEADING } from '../../shared/fleetPhotos.mjs';

/** 車輛實拍。照片與說明來自 shared/fleetPhotos.mjs（與 index.html 靜態 HTML、/about/、路線頁同一份）。 */
export const FleetGallery: React.FC = () => (
  <section className="bg-[#0e2318]/85 border border-emerald-900/60 rounded-2xl p-4 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md mb-4 md:mb-12 relative overflow-hidden">
    <h2 className="text-lg md:text-xl font-bold text-white mb-2.5 md:mb-4 flex items-center relative z-10">
      <span className="w-1.5 h-5 bg-gradient-to-b from-[#00e676] to-[#00c853] rounded-full mr-3 inline-block shadow-[0_0_8px_rgba(0,200,83,0.6)]"></span>
      <span>{FLEET_HEADING}</span>
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 relative z-10">
      {FLEET_PHOTOS.map((p) => (
        <figure key={p.src} className="m-0">
          <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" decoding="async" className="w-full h-auto rounded-xl bg-[#071a10]" />
          <figcaption className="text-xs md:text-sm text-emerald-200/85 mt-1.5 leading-relaxed">{p.caption}</figcaption>
        </figure>
      ))}
    </div>
    <p className="mt-4 text-sm text-emerald-100/80 relative z-10">
      <a href="/about/" className="font-semibold text-[#00e676] hover:text-white underline underline-offset-2">關於我們與保險：公司登記、乘客傷害責任險、服務規則</a>
    </p>
  </section>
);
