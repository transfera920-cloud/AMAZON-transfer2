import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FOREST_ROADS_DATA, STATUS_LIST, BranchName, RoadStatus } from './data/forestRoads';
import { Header } from './components/Header';
import { StatusSummary } from './components/StatusSummary';
import { FilterBar } from './components/FilterBar';
import { RoadCard } from './components/RoadCard';
import { Footer } from './components/Footer';
import { SearchX, ArrowUp, CheckCircle, RefreshCw, WifiOff } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'amazon_mountain_forest_roads_status_v1';
const API_URL = 'https://forest-road-status.transfera920.workers.dev/';

interface LiveRoad {
  status: RoadStatus;
  detailUrl?: string;
}

// 解碼 API 回傳的 HTML Entities（例如 東&#30524;山林道 -> 東眼山林道）
const decodeEntities = (str?: string): string => {
  if (!str) return '';
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
};

// 名稱比對用：去空白、統一「台/臺」
const normName = (str?: string): string =>
  decodeEntities(str).replace(/\s+/g, '').replace(/台/g, '臺');

const formatTime = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date();
  const date = isNaN(d.getTime()) ? new Date() : d;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<BranchName | '全部'>('全部');
  const [selectedStatus, setSelectedStatus] = useState<RoadStatus | '全部'>('全部');
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 方案 B: 從 localStorage 讀取先前手動記錄之開放狀態
  const [customStatusMap, setCustomStatusMap] = useState<
    Record<number, { status: RoadStatus; updatedAt: string }>
  >(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load saved road status from localStorage', e);
    }
    return {};
  });

  // 即時資料：向 Cloudflare Worker 取得林保署最新狀態
  const [liveMap, setLiveMap] = useState<Record<string, LiveRoad>>({});
  const [liveState, setLiveState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [liveFetchedAt, setLiveFetchedAt] = useState<string>('');
  const [liveError, setLiveError] = useState<string>('');
  const [liveMatched, setLiveMatched] = useState<number>(0);

  const fetchLive = useCallback(async () => {
    setLiveState('loading');
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.roads)) throw new Error('API 回傳格式不符合預期');

      const map: Record<string, LiveRoad> = {};
      data.roads.forEach((r: any) => {
        const decoded = decodeEntities(r.status).trim();
        const status = (STATUS_LIST as string[]).includes(decoded)
          ? (decoded as RoadStatus)
          : '未確認';
        map[normName(r.name)] = {
          status,
          detailUrl: r.detailUrl ? String(r.detailUrl).trim() : undefined,
        };
      });

      const matched = FOREST_ROADS_DATA.filter((r) => map[normName(r.name)]).length;
      if (matched < FOREST_ROADS_DATA.length) {
        console.warn(
          '以下林道在 API 中找不到對應名稱：',
          FOREST_ROADS_DATA.filter((r) => !map[normName(r.name)]).map((r) => r.name)
        );
      }

      setLiveMap(map);
      setLiveMatched(matched);
      setLiveFetchedAt(formatTime(data.fetchedAt));
      setLiveState('ok');
      setLiveError('');
    } catch (e: any) {
      console.error('Failed to fetch live road status', e);
      setLiveState('error');
      setLiveError(e?.message || '網路異常');
    }
  }, []);

  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  // Toggle dark mode class on html tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Track window scroll for back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show a temporary toast notification when saved
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // 方案 B: 手動修改狀態並立刻寫入 localStorage
  const handleStatusChange = (id: number, newStatus: RoadStatus) => {
    const targetRoad = FOREST_ROADS_DATA.find((r) => r.id === id);
    const now = new Date();
    const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    setCustomStatusMap((prev) => {
      const next = { ...prev };
      const baseStatus: RoadStatus =
        (targetRoad && liveMap[normName(targetRoad.name)]?.status) || '未確認';
      if (newStatus === baseStatus) {
        delete next[id];
      } else {
        next[id] = {
          status: newStatus,
          updatedAt: `${timeStr} (手動記錄)`,
        };
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save to localStorage', e);
      }
      return next;
    });

    if (targetRoad) {
      triggerToast(`已更新「${targetRoad.name}」為【${newStatus}】並儲存至瀏覽器`);
    }
  };

  // 方案 B: 重設全部為未確認（清除 localStorage）
  const handleResetAllToUnconfirmed = () => {
    const count = Object.keys(customStatusMap).length;
    if (count === 0) {
      triggerToast('目前沒有任何手動標記');
      return;
    }

    if (
      window.confirm(
        `確定要清除您在瀏覽器中儲存的 ${count} 筆手動標記嗎？\n清除後將恢復為林保署即時資料。`
      )
    ) {
      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
      setCustomStatusMap({});
      triggerToast('已清除全部手動標記，恢復為林保署即時資料');
    }
  };

  // Combine initial official dataset with custom status map from localStorage
  const roadsWithStatus = useMemo(() => {
    return FOREST_ROADS_DATA.map((road) => {
      let merged = road;
      const live = liveMap[normName(road.name)];
      if (live) {
        merged = {
          ...road,
          status: live.status,
          detailUrl: live.detailUrl,
          lastUpdated:
            live.status === '未確認' ? '未確認' : `${liveFetchedAt} (林保署即時)`,
        };
      }
      const custom = customStatusMap[road.id];
      if (custom) {
        return {
          ...merged,
          status: custom.status,
          lastUpdated: custom.updatedAt,
        };
      }
      return merged;
    });
  }, [customStatusMap, liveMap, liveFetchedAt]);

  // Compute status counts for the top status cards based on current branch/search or all
  const statusCounts = useMemo(() => {
    const baseList = roadsWithStatus.filter((road) => {
      const matchBranch = selectedBranch === '全部' || road.branch === selectedBranch;
      const matchSearch =
        !searchQuery.trim() ||
        road.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        road.startLocation.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchBranch && matchSearch;
    });

    const counts: Record<RoadStatus | '全部', number> = {
      全部: baseList.length,
      未確認: 0,
      全線暢通: 0,
      部分封閉: 0,
      交通管制: 0,
      全線封閉: 0,
    };

    baseList.forEach((road) => {
      counts[road.status] = (counts[road.status] || 0) + 1;
    });

    return counts;
  }, [roadsWithStatus, selectedBranch, searchQuery]);

  // Compute branch counts for the filter chips
  const branchCounts = useMemo(() => {
    const counts: Record<BranchName | '全部', number> = {
      全部: roadsWithStatus.length,
      宜蘭分署: 0,
      新竹分署: 0,
      臺中分署: 0,
      南投分署: 0,
      嘉義分署: 0,
      屏東分署: 0,
      臺東分署: 0,
      花蓮分署: 0,
    };

    roadsWithStatus.forEach((road) => {
      counts[road.branch] = (counts[road.branch] || 0) + 1;
    });

    return counts;
  }, [roadsWithStatus]);

  // Filtered roads list
  const filteredRoads = useMemo(() => {
    return roadsWithStatus.filter((road) => {
      // Branch filter
      if (selectedBranch !== '全部' && road.branch !== selectedBranch) {
        return false;
      }

      // Status filter
      if (selectedStatus !== '全部' && road.status !== selectedStatus) {
        return false;
      }

      // Search query (matches road name or start location)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = road.name.toLowerCase().includes(query);
        const matchesStart = road.startLocation.toLowerCase().includes(query);
        if (!matchesName && !matchesStart) {
          return false;
        }
      }

      return true;
    });
  }, [roadsWithStatus, selectedBranch, selectedStatus, searchQuery]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBranch('全部');
    setSelectedStatus('全部');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const modifiedCount = Object.keys(customStatusMap).length;

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header */}
      <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {/* Brand Banner / Subtitle */}
        <div className="mb-6 pb-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                林業及自然保育署 83 條官方列管林道
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              亞馬遜國家山岳協會維護。開放狀態即時取自林保署公告；查無資料者列為「未確認」，也可手動標記並記住於瀏覽器。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {liveState === 'error' ? (
              <div className="text-xs text-rose-300 bg-rose-950/70 border border-rose-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <WifiOff className="w-3.5 h-3.5" />
                <span>即時資料載入失敗（{liveError}）</span>
              </div>
            ) : liveState === 'loading' ? (
              <div className="text-xs text-amber-300 bg-amber-950/70 border border-amber-800/80 px-3 py-1.5 rounded-xl">
                即時資料載入中…
              </div>
            ) : (
              <div className="text-xs font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-3 py-1.5 rounded-xl">
                即時 {liveFetchedAt}・已對應 {liveMatched}/{FOREST_ROADS_DATA.length} 條
              </div>
            )}
            <button
              type="button"
              onClick={fetchLive}
              disabled={liveState === 'loading'}
              className="text-xs text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="重新向 Worker 取得最新狀態"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveState === 'loading' ? 'animate-spin' : ''}`} />
              <span>重新整理</span>
            </button>
            {modifiedCount > 0 && (
              <div className="text-xs font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>已手動標記 {modifiedCount} 條</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Summary Section */}
        <StatusSummary
          statusCounts={statusCounts}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          totalOfficialCount={roadsWithStatus.length}
        />

        {/* Filter and Search Bar */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedBranch={selectedBranch}
          onSelectBranch={setSelectedBranch}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          branchCounts={branchCounts}
          onResetFilters={handleResetFilters}
          totalFilteredCount={filteredRoads.length}
          modifiedCount={modifiedCount}
          onResetAllToUnconfirmed={handleResetAllToUnconfirmed}
        />

        {/* Road Cards Grid */}
        {filteredRoads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
            {filteredRoads.map((road) => (
              <RoadCard
                key={road.id}
                road={road}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
            <SearchX className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">
              找不到符合條件的林道
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              目前篩選條件下無符合之官方林道，請嘗試清除關鍵字搜尋或更換狀態與分署別。
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
            >
              重設所有篩選
            </button>
          </div>
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-emerald-500/80 text-emerald-200 text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xl shadow-slate-950/80 flex items-center gap-2 animate-fadeIn pointer-events-none">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back to top button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="回到頂端"
          className="fixed bottom-6 right-6 p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 z-30 transition-all cursor-pointer border border-emerald-400/40"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}
