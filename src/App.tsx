/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { SiteData, ActiveModalType } from './types';
import { DEFAULT_DATA } from './data/defaultData';
import {
  getLocalCachedData,
  saveSiteDataToCloud,
  fetchSiteDataOnce,
  getAuthInstance
} from './firebase';
import { Header } from './components/Header';
import { CardsGrid } from './components/CardsGrid';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { db } from './firebase';
import { ADMIN_EMAIL } from './data/adminConfig';
import { HomeBlocks } from './components/HomeBlocks';
import { HomeNav } from './components/HomeNav';
import { resolveHomeContent, routeCategories, buildHomeRoutes } from '../shared/homeContent.mjs';
import type { HomeRoutes } from '../shared/homeContent.mjs';
import { collection, getDocs } from 'firebase/firestore';
import homeGenerated from './data/home.generated.json';

// 後台與各工具視窗只在打開時才下載，減少首頁 JS 體積
const AdminModal = lazy(() => import('./components/AdminModal').then((m) => ({ default: m.AdminModal })));
const AdminLoginModal = lazy(() => import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal })));
const AdminRoutesPanel = lazy(() => import('./components/AdminRoutesPanel').then((m) => ({ default: m.AdminRoutesPanel })));
const PriceCalcModal = lazy(() => import('./components/PriceCalcModal').then((m) => ({ default: m.PriceCalcModal })));
const D0LodgingModal = lazy(() => import('./components/D0LodgingModal').then((m) => ({ default: m.D0LodgingModal })));
const FeastModal = lazy(() => import('./components/FeastModal').then((m) => ({ default: m.FeastModal })));
const RoadStatusModal = lazy(() => import('./components/RoadStatusModal').then((m) => ({ default: m.RoadStatusModal })));

export default function App() {
  // Initialize with local cache for instant paint, then update with Cloud data
  const [siteData, setSiteData] = useState<SiteData>(() => getLocalCachedData());
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  
  // Admin Login authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // 以 Firebase Authentication 判斷登入狀態（真正的寫入權限由 Firestore 規則把關）
  useEffect(() => {
    // firebase/auth 改為按需載入，不阻擋首頁
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const [{ onAuthStateChanged }, auth] = await Promise.all([import('firebase/auth'), getAuthInstance()]);
        if (cancelled) return;
        unsub = onAuthStateChanged(auth, (user) => {
          setIsAdminLoggedIn(!!user && user.email === ADMIN_EMAIL);
        });
      } catch (e) {
        console.warn('Auth init failed', e);
      }
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
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
  // 訪客一律使用建置時產生的清單（0 次資料庫讀取）；只有登入後台的管理員才讀一次最新路線資料，
  // 這樣後台改的名稱、說明、分類、順序儲存後，管理員自己看首頁會立刻更新，不必等「發布到網站」。
  const [liveRoutes, setLiveRoutes] = useState<any[] | null>(null);
  useEffect(() => {
    if (!isAdminLoggedIn) { setLiveRoutes(null); return; }
    let cancelled = false;
    getDocs(collection(db, 'routes'))
      .then((snap) => { if (!cancelled) setLiveRoutes(snap.docs.map((d) => d.data())); })
      .catch((err) => console.warn('路線資料讀取失敗，使用建置時的清單：', err));
    return () => { cancelled = true; };
  }, [isAdminLoggedIn]);
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
    Promise.all([import('firebase/auth'), getAuthInstance()])
      .then(([{ signOut }, auth]) => signOut(auth))
      .catch((e) => console.warn(e));
    setIsAdminLoggedIn(false);
    setIsAdminOpen(false);
    setIsRoutesOpen(false);
  };

  // <title> 與 meta description 皆以 index.html 內的固定內容為準，
  // 避免 JS 執行後與原始 HTML 不一致（Googlebot 會同時看原始與渲染後版本）

  // 網站設定：不使用即時監聽。訪客有 1 小時內的本機快取就完全不讀資料庫；
  // 過期才讀 1 次。管理員登入後強制讀 1 次，確保看到最新內容。
  useEffect(() => {
    let isMounted = true;
    fetchSiteDataOnce(isAdminLoggedIn).then((fresh) => {
      if (isMounted && fresh) {
        setSiteData(fresh);
        setIsCloudConnected(true);
      }
    });
    return () => { isMounted = false; };
  }, [isAdminLoggedIn]);

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

      <Suspense fallback={null}>
        {/* 後台登入彈出視窗 (Admin Login Modal) */}
        {isLoginOpen && (
          <AdminLoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {/* 後台管理彈出視窗 (Admin Modal) */}
        {isAdminOpen && (
          <AdminModal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            data={siteData}
            onSave={handleSaveData}
            isCloudConnected={isCloudConnected}
            onLogout={handleLogout}
            onOpenRoutes={() => { setIsAdminOpen(false); setIsRoutesOpen(true); }}
          />
        )}

        {/* 路線內容管理（編輯各路線頁、發布到網站） */}
        {isRoutesOpen && isAdminLoggedIn && (
          <AdminRoutesPanel
            isOpen={true}
            onClose={() => { setIsRoutesOpen(false); setIsAdminOpen(true); }}
          />
        )}

        {/* 互動工具彈出視窗 */}
        {activeModal === 'calc' && (
          <PriceCalcModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            lineUrl={siteData.lineUrl}
            phone={siteData.phone}
          />
        )}
        {activeModal === 'hotel' && <D0LodgingModal isOpen={true} onClose={() => setActiveModal(null)} />}
        {activeModal === 'food' && <FeastModal isOpen={true} onClose={() => setActiveModal(null)} />}
        {activeModal === 'road' && <RoadStatusModal isOpen={true} onClose={() => setActiveModal(null)} />}
      </Suspense>
    </div>
  );
}
