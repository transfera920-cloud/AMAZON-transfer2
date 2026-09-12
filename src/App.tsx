/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SiteData, ActiveModalType } from './types';
import { DEFAULT_DATA, STORAGE_KEY } from './data/defaultData';
import { Header } from './components/Header';
import { CardsGrid } from './components/CardsGrid';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { AdminModal } from './components/AdminModal';
import { PriceCalcModal } from './components/PriceCalcModal';
import { D0LodgingModal } from './components/D0LodgingModal';
import { FeastModal } from './components/FeastModal';
import { RoadStatusModal } from './components/RoadStatusModal';

export default function App() {
  const [siteData, setSiteData] = useState<SiteData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_DATA,
          ...parsed,
          features: Array.isArray(parsed.features) ? parsed.features : DEFAULT_DATA.features,
          cards: Array.isArray(parsed.cards) && parsed.cards.length > 0 ? parsed.cards : DEFAULT_DATA.cards
        };
      }
    } catch (e) {
      console.error('Failed to parse localStorage data, loading default', e);
    }
    return DEFAULT_DATA;
  });

  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync document title and meta description dynamically
  useEffect(() => {
    if (siteData.siteTitle) {
      document.title = `${siteData.siteTitle} | 專業百岳包車接駁服務`;
    }
    const seoTitleElem = document.getElementById('seo-title');
    if (seoTitleElem) {
      seoTitleElem.innerText = `${siteData.siteTitle} | 專業百岳包車接駁服務`;
    }
    const seoDescElem = document.getElementById('seo-desc');
    if (seoDescElem && siteData.seoDesc) {
      seoDescElem.setAttribute('content', siteData.seoDesc);
    }
  }, [siteData.siteTitle, siteData.seoDesc]);

  // Support legacy global toggleAdminModal if referenced by external inline onclick
  useEffect(() => {
    (window as any).toggleAdminModal = () => {
      setIsAdminOpen(prev => !prev);
    };
    return () => {
      delete (window as any).toggleAdminModal;
    };
  }, []);

  const handleSaveData = (newData: SiteData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
    setSiteData(newData);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f4f6f4] text-[#2d3748] relative selection:bg-emerald-200 selection:text-emerald-900">
      {/* 頁首區塊 Header & 後台按鈕 */}
      <Header
        data={siteData}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* 主要內容區 Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-10 flex-grow w-full">
        {/* 板塊網格 (高山接駁服務與即時查詢) */}
        <CardsGrid
          sectionTitle={siteData.sectionTitle || "高山接駁服務與即時查詢"}
          cards={siteData.cards}
          onOpenModal={(modalType) => setActiveModal(modalType)}
        />

        {/* 關於我們區塊 */}
        <AboutSection
          title={siteData.aboutTitle || "關於亞馬遜高山接駁"}
          content={siteData.aboutContent}
        />
      </main>

      {/* 底部預約 Bar (Sticky/Fixed Footer) */}
      <Footer data={siteData} />

      {/* 後台管理彈出視窗 (Admin Modal) */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        data={siteData}
        onSave={handleSaveData}
      />

      {/* 互動工具彈出視窗: 價格估算系統 */}
      <PriceCalcModal
        isOpen={activeModal === 'calc'}
        onClose={() => setActiveModal(null)}
        lineUrl={siteData.lineUrl}
        phone={siteData.phone}
      />

      {/* 互動工具彈出視窗: D0 住宿查詢 */}
      <D0LodgingModal
        isOpen={activeModal === 'hotel'}
        onClose={() => setActiveModal(null)}
      />

      {/* 互動工具彈出視窗: 下山慶功宴查詢 */}
      <FeastModal
        isOpen={activeModal === 'food'}
        onClose={() => setActiveModal(null)}
      />

      {/* 互動工具彈出視窗: 道路路線管制查詢 */}
      <RoadStatusModal
        isOpen={activeModal === 'road'}
        onClose={() => setActiveModal(null)}
      />
    </div>
  );
}
