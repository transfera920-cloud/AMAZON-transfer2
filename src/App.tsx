/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { SiteData, ActiveModalType } from './types';
import { DEFAULT_DATA } from './data/defaultData';
import {
  getLocalCachedData,
  loadSiteDataFromCloud,
  saveSiteDataToCloud,
  subscribeToSiteData,
  testConnection
} from './firebase';
import { Header } from './components/Header';
import { CardsGrid } from './components/CardsGrid';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { AdminModal } from './components/AdminModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminRoutesPanel } from './components/AdminRoutesPanel';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { ADMIN_EMAIL } from './data/adminConfig';
import { PriceCalcModal } from './components/PriceCalcModal';
import { D0LodgingModal } from './components/D0LodgingModal';
import { FeastModal } from './components/FeastModal';
import { RoadStatusModal } from './components/RoadStatusModal';
import { HomeBlocks } from './components/HomeBlocks';
import { HomeNav } from './components/HomeNav';
import { resolveHomeContent, routeCategories, buildHomeRoutes } from '../shared/homeContent.mjs';
import type { HomeRoutes } from '../shared/homeContent.mjs';
import { collection, onSnapshot } from 'firebase/firestore';
import homeGenerated from './data/home.generated.json';

export default function App() {
  // Initialize with local cache for instant paint, then update with Cloud data
  const [siteData, setSiteData] = useState<SiteData>(() => getLocalCachedData());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  
  // Admin Login authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // 以 Firebase Authentication 判斷登入狀態（真正的寫入權限由 Firestore 規則把關）
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setIsAdminLoggedIn(!!user && user.email === ADMIN_EMAIL);
    });
  }, []);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isRoutesOpen, setIsRoutesOpen] = useState(false);

  // 首頁內容區塊與 FAQ：後台有存過就用後台的，沒有就用預設（shared/homeContent.mjs）；路線清單來自建置時產生的資料
  const homeContent = useMemo(
    () => resolveHomeContent({ popularRoutesTitle: siteData.popularRoutesTitle, homeBlocks: siteData.homeBlocks, homeFaq: siteData.homeFaq }),
    [siteData.popularRoutesTitle, siteData.homeBlocks, siteData.homeFaq]
  );

  // 頁面中間的區塊：隱藏路線清單（選單仍使用完整的 homeContent 取得分類）
  const homeBlocksContent = useMemo(
    () => ({ ...homeContent, blocks: homeContent.blocks.filter((b) => b.kind !== 'routes') }),
    [homeContent]
  );

  // 首頁路線清單：先用建置時產生的資料（立刻有畫面），再改讀資料庫的路線資料，
  // 這樣後台改的名稱、說明、分類、順序，以及新增的路線，儲存後首頁馬上更新，不必等「發布到網站」。
  const [liveRoutes, setLiveRoutes] = useState<any[] | null>(null);
  useEffect(() => {
    return onSnapshot(
      collection(db, 'routes'),
      (snap) => setLiveRoutes(snap.docs.map((d) => d.data())),
      (err) => console.warn('路線即時資料讀取失敗，使用建置時的清單：', err)
    );
  }, []);
  const homeRoutes = useMemo<HomeRoutes>(() => {
    if (!liveRoutes || !liveRoutes.length) return homeGenerated.routes as HomeRoutes;
    // 與 build-home.mjs 相同的上線條件：已發布且 H1／SEO 欄位齊全
    const live = liveRoutes.filter((r) => r && typeof r.slug === 'string' && r.h1 && r.metaTitle && r.metaDescription);
    const ids = routeCategories(homeContent.blocks).map((c) => c.id);
    return buildHomeRoutes(live, ids);
  }, [liveRoutes, homeContent]);

  const handleOpenAdmin = () => {
    if (isAdminLoggedIn) {
      setIsAdminOpen(true);
    } else {
      setIsLoginOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    setIsLoginOpen(false);
    setIsAdminOpen(true);
  };

  const handleLogout = () => {
    signOut(auth).catch((e) => console.warn(e));
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setIsRoutesOpen(false);
  };

  // <title> 與 meta description 皆以 index.html 內的固定內容為準，
  // 避免 JS 執行後與原始 HTML 不一致（Googlebot 會同時看原始與渲染後版本）

  // Connect to Firestore and subscribe to live changes across all devices
  useEffect(() => {
    let isMounted = true;

    // Validate connection
    testConnection();

    // Initial load from cloud with automatic localStorage fallback
    loadSiteDataFromCloud()
      .then(({ data, fromCloud }) => {
        if (isMounted) {
          setSiteData(data);
          setIsCloudConnected(fromCloud);
        }
      })
      .catch((err) => {
        console.warn('Initial cloud fetch error, relying on local cache:', err);
      });

    // Real-time multi-device sync listener
    const unsubscribe = subscribeToSiteData(
      (updatedData) => {
        if (isMounted) {
          setSiteData(updatedData);
          setIsCloudConnected(true);
        }
      },
      (err) => {
        console.warn('Realtime sync subscription status:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Support legacy global toggleAdminModal if referenced by external inline onclick
  useEffect(() => {
    (window as any).toggleAdminModal = () => {
      handleOpenAdmin();
    };
    return () => {
      delete (window as any).toggleAdminModal;
    };
  }, [isAdminLoggedIn]);

  const handleSaveData = async (newData: SiteData) => {
    // Save to Firestore cloud database (and auto-update localStorage backup)
    await saveSiteDataToCloud(newData);
    setSiteData(newData);
    setIsCloudConnected(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#07130e] text-slate-100 relative selection:bg-emerald-600 selection:text-white bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.15),rgba(7,19,14,0))]">
      {/* 頁首區塊 Header & 後台按鈕 */}
      <Header
        data={siteData}
        onOpenAdmin={handleOpenAdmin}
        isCloudConnected={isCloudConnected}
      />

      {/* 主要內容區 Main Content */}
      <main className="max-w-5xl mx-auto px-3 md:px-4 py-4 md:py-10 flex-grow w-full">
        {/* 路線選單（分類來自後台首頁內容的路線清單區塊） */}
        <HomeNav content={homeContent} routes={homeRoutes} />

        {/* 板塊網格 (百岳與高山登山接駁) */}
        <CardsGrid
          sectionTitle={siteData.sectionTitle || "百岳與高山登山接駁"}
          cards={siteData.cards}
          onOpenModal={(modalType) => setActiveModal(modalType)}
        />

        {/* 路線清單區塊（熱門／更多）改由上方 HomeNav 顯示，頁面中間不再重複呈現 */}
        <HomeBlocks content={homeBlocksContent} routes={homeRoutes} />

        {/* 關於我們區塊 */}
        <AboutSection
          title={siteData.aboutTitle || "關於我們"}
          content={siteData.aboutContent}
        />
      </main>

      {/* 底部預約 Bar (Sticky/Fixed Footer) */}
      <Footer data={siteData} />

      {/* 後台登入彈出視窗 (Admin Login Modal) */}
      <AdminLoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 後台管理彈出視窗 (Admin Modal) */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        data={siteData}
        onSave={handleSaveData}
        isCloudConnected={isCloudConnected}
        onLogout={handleLogout}
        onOpenRoutes={() => { setIsAdminOpen(false); setIsRoutesOpen(true); }}
      />

      {/* 路線內容管理（編輯各路線頁、發布到網站） */}
      <AdminRoutesPanel
        isOpen={isRoutesOpen && isAdminLoggedIn}
        onClose={() => { setIsRoutesOpen(false); setIsAdminOpen(true); }}
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
