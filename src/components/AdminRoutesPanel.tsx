import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import {
  X, Save, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, ChevronLeft, Loader2, Rocket, AlertTriangle, Check, Download
} from 'lucide-react';
import { db } from '../firebase';
import { RouteData, RouteSection } from '../types';
import seedRoutesRaw from '../data/routes.seed.json';
import { AdminHomePanel } from './AdminHomePanel';
import { resolveHomeContent, routeCategories, DEFAULT_HOME_ROUTE_TEXT } from '../../shared/homeContent.mjs';
import type { RouteCategory } from '../../shared/homeContent.mjs';
import { renderRoutePage, checkRoute, makeRouteTemplate } from '../../shared/renderRoutePage.mjs';

const seedRoutes = seedRoutesRaw as unknown as RouteData[];
const SITE = 'https://transfer.amazon-hike.com';

const taipeiToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date());

/** 去掉 undefined（Firestore 不接受），並補齊欄位 */
function clean(r: RouteData): RouteData {
  const c = JSON.parse(JSON.stringify(r)) as RouteData;
  c.sections = (c.sections || []).map((s, i) => ({ ...s, id: s.id || `s${Date.now()}${i}` }));
  c.faq = c.faq || [];
  c.articles = c.articles || [];
  c.prep = c.prep || { heading: '', body: '' };
  c.video = { youtubeId: '', heading: '', title: '', description: '', uploadDate: '', duration: '', summary: [], transcript: '', ...(c.video || {}) };
  // 首頁清單的名稱與說明：後台還沒填過的路線，帶入原本寫在程式裡的文字，編輯時看得到、存檔後就屬於後台
  const dflt = DEFAULT_HOME_ROUTE_TEXT[c.slug];
  if (typeof c.homeName !== 'string') c.homeName = dflt?.name ?? c.listName ?? c.name ?? '';
  if (typeof c.homeDesc !== 'string') c.homeDesc = dflt?.desc ?? '';
  return c;
}

function youtubeIdFrom(input: string): string {
  const s = input.trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : s;
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';
const btnGhost = 'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <label className="block">
    <span className="block text-xs font-semibold text-gray-700 mb-1">{label}</span>
    {children}
    {hint && <span className="block text-[11px] text-gray-500 mt-1">{hint}</span>}
  </label>
);

const Card: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {title}
      </h4>
      {aside}
    </div>
    {children}
  </div>
);

const Counter: React.FC<{ value: string; max: number }> = ({ value, max }) => {
  const n = [...value].length;
  return <span className={`text-[11px] ${n > max ? 'text-red-600 font-bold' : 'text-gray-400'}`}>{n}/{max}</span>;
};

/** 路線清單的一列：可直接改「分類」「首頁顯示名稱」「首頁說明」（離開欄位時自動儲存） */
const RouteRow: React.FC<{
  r: RouteData;
  categories: RouteCategory[];
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onTogglePublished: () => void;
  onEdit: () => void;
  onSaveHome: (patch: { homeName: string; homeDesc: string }) => void;
  onChangeGroup: (group: string) => void;
}> = ({ r, categories, canUp, canDown, onMove, onTogglePublished, onEdit, onSaveHome, onChangeGroup }) => {
  const [name, setName] = useState(r.homeName || '');
  const [desc, setDesc] = useState(r.homeDesc || '');
  useEffect(() => { setName(r.homeName || ''); setDesc(r.homeDesc || ''); }, [r.homeName, r.homeDesc]);

  const commit = () => {
    if (name === (r.homeName || '') && desc === (r.homeDesc || '')) return;
    onSaveHome({ homeName: name.trim(), homeDesc: desc.trim() });
  };
  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); };
  const known = categories.some((c) => c.id === r.group);

  return (
    <div className="py-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-col">
          <button className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20 cursor-pointer" disabled={!canUp} onClick={() => onMove(-1)}><ArrowUp className="w-3.5 h-3.5" /></button>
          <button className="p-0.5 text-gray-400 hover:text-gray-800 disabled:opacity-20 cursor-pointer" disabled={!canDown} onClick={() => onMove(1)}><ArrowDown className="w-3.5 h-3.5" /></button>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="font-semibold text-gray-900">{r.name}
            {!r.published && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">未發布</span>}
          </div>
          <div className="text-[11px] text-gray-500">/{r.slug}/　{r.metaTitle}</div>
        </div>
        <select
          className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white cursor-pointer max-w-[180px]"
          value={r.group}
          title="這條路線放在首頁哪個分類"
          onChange={(e) => onChangeGroup(e.target.value)}
        >
          {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          {!known && <option value={r.group}>（分類已刪除，會顯示在「更多」）</option>}
        </select>
        <a className={btnGhost} href={`${SITE}/${r.slug}/`} target="_blank" rel="noopener noreferrer">看線上頁</a>
        <button className={btnGhost} onClick={onTogglePublished}>{r.published ? <><EyeOff className="w-3.5 h-3.5" />停用</> : <><Eye className="w-3.5 h-3.5" />發布</>}</button>
        <button className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer" onClick={onEdit}>編輯內容</button>
      </div>
      <div className="grid md:grid-cols-2 gap-2 pl-6">
        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-0.5">首頁顯示名稱</span>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={onEnter} placeholder="首頁清單上的連結文字" />
        </label>
        <label className="block">
          <span className="block text-[11px] text-gray-500 mb-0.5">首頁說明（接在名稱後面，可留空）</span>
          <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={commit} onKeyDown={onEnter} placeholder="例：玉山群峰、麟趾山、鹿林山" />
        </label>
      </div>
    </div>
  );
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminRoutesPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState<RouteData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [newSlug, setNewSlug] = useState('');
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState('more');
  const [tab, setTab] = useState<'routes' | 'home'>('routes');
  const [siteRaw, setSiteRaw] = useState<any>(null);
  const [contentUpdatedAtMs, setContentUpdatedAtMs] = useState(0);
  const [homeDirty, setHomeDirty] = useState(false);

  const [hookUrl, setHookUrl] = useState('');
  const [lastPublishedAt, setLastPublishedAt] = useState(0);
  const [hookBusy, setHookBusy] = useState(false);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  /** 建置腳本讀不到「路線列表」時，靠 settings/general.routeSlugs 逐條讀取；這裡讓它永遠等於目前所有路線的代稱 */
  const syncRouteSlugs = async (current: unknown, slugs: string[]) => {
    if (!slugs.length) return;
    const have = Array.isArray(current) ? (current as string[]) : [];
    const same = have.length === slugs.length && slugs.every((s) => have.includes(s));
    if (same) return;
    try {
      await updateDoc(doc(db, 'settings', 'general'), { routeSlugs: slugs });
    } catch { /* 寫不進去不影響後台使用；下次開啟會再試 */ }
  };

  const load = async () => {
    let loadedSlugs: string[] = [];
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(collection(db, 'routes'));
      const list = snap.docs.map((d) => clean(d.data() as RouteData));
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      setRoutes(list);
      loadedSlugs = list.map((r) => r.slug);
    } catch (e: any) {
      setError(`讀取路線失敗：${e?.message || e}`);
    }
    try {
      const g = await getDoc(doc(db, 'settings', 'general'));
      if (g.exists()) {
        setSiteRaw(g.data());
        setContentUpdatedAtMs(Number(g.data().contentUpdatedAtMs) || 0);
        await syncRouteSlugs(g.data().routeSlugs, loadedSlugs);
      }
    } catch { /* 讀不到就用預設內容 */ }
    try {
      const p = await getDoc(doc(db, 'private', 'deploy'));
      if (p.exists()) {
        setHookUrl((p.data().hookUrl as string) || '');
        setLastPublishedAt(Number(p.data().lastPublishedAt) || 0);
      }
    } catch { /* 第一次還沒有這份文件，或規則尚未更新 */ }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) { setDraft(null); setDirty(false); setHomeDirty(false); setTab('routes'); load(); }
  }, [isOpen]);

  // 一定要 memo：AdminHomePanel 以它的 identity 判斷「後台資料更新了」，每次 render 都產生新物件會洗掉正在編輯的內容
  const homeInitial = useMemo(() => resolveHomeContent(siteRaw), [siteRaw]);
  // 路線分類 = 首頁的路線清單區塊（在「首頁內容」分頁新增、改名、刪除）
  const categories = useMemo(() => routeCategories(homeInitial.blocks), [homeInitial]);
  const categoryTitles = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.title])), [categories]);

  const missingSeeds = useMemo(
    () => seedRoutes.filter((s) => !routes.some((r) => r.slug === s.slug)),
    [routes]
  );
  const pending = useMemo(
    () => contentUpdatedAtMs > lastPublishedAt || routes.some((r) => (r.updatedAtMs || 0) > lastPublishedAt),
    [routes, lastPublishedAt, contentUpdatedAtMs]
  );

  const importSeeds = async () => {
    if (!missingSeeds.length) return;
    if (!window.confirm(`要把 ${missingSeeds.length} 條預設路線匯入後台嗎？（已存在的路線不會被覆蓋）`)) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const now = Date.now();
      missingSeeds.forEach((s) => batch.set(doc(db, 'routes', s.slug), { ...clean(s), updatedAtMs: now }));
      await batch.commit();
      say(`已匯入 ${missingSeeds.length} 條路線`);
      await load();
    } catch (e: any) {
      setError(`匯入失敗：${e?.message || e}`);
      setLoading(false);
    }
  };

  // 只和「同一個分類」裡的上一條／下一條交換順序（清單就是依首頁顯示的樣子分組）
  const move = async (r: RouteData, dir: -1 | 1) => {
    const sameGroup = routes.filter((x) => x.group === r.group);
    const idx = sameGroup.findIndex((x) => x.slug === r.slug);
    const a = sameGroup[idx];
    const b = sameGroup[idx + dir];
    if (!a || !b) return;
    try {
      const now = Date.now();
      const batch = writeBatch(db);
      batch.update(doc(db, 'routes', a.slug), { order: b.order, updatedAtMs: now });
      batch.update(doc(db, 'routes', b.slug), { order: a.order, updatedAtMs: now });
      await batch.commit();
      await load();
    } catch (e: any) { setError(`調整順序失敗：${e?.message || e}`); }
  };

  /** 清單上直接改：首頁顯示名稱／說明、分類。只寫入這幾個欄位，並更新本機畫面（不重新讀取整份清單） */
  const patchRoute = async (slug: string, patch: Partial<RouteData>, okMsg: string) => {
    try {
      const now = Date.now();
      await updateDoc(doc(db, 'routes', slug), { ...patch, updatedAtMs: now });
      setRoutes((prev) => prev.map((x) => (x.slug === slug ? { ...x, ...patch, updatedAtMs: now } : x)));
      say(okMsg);
    } catch (e: any) { setError(`儲存失敗：${e?.message || e}`); }
  };

  const togglePublished = async (r: RouteData) => {
    const next = !r.published;
    if (!next && !window.confirm(`停用「${r.name}」後，下次發布時 /${r.slug}/ 會從網站下架（網址變 404）。確定嗎？`)) return;
    try {
      await updateDoc(doc(db, 'routes', r.slug), { published: next, updatedAtMs: Date.now() });
      await load();
    } catch (e: any) { setError(`更新失敗：${e?.message || e}`); }
  };

  const createRoute = async () => {
    const slug = newSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) { setError('網址代稱（slug）只能用小寫英文、數字與連字號'); return; }
    if (slug === 'permit' || routes.some((r) => r.slug === slug)) { setError('這個網址代稱已經存在'); return; }
    if (!newName.trim()) { setError('請輸入路線名稱'); return; }
    const maxOrder = routes.reduce((m, r) => Math.max(m, r.order || 0), 0);
    const t = clean(makeRouteTemplate(slug, newName.trim(), maxOrder + 10) as RouteData);
    t.group = categories.some((c) => c.id === newGroup) ? newGroup : 'more';
    t.updatedAt = taipeiToday();
    t.updatedAtMs = Date.now();
    try {
      await setDoc(doc(db, 'routes', slug), t);
      setNewSlug(''); setNewName('');
      await load();
      setDraft(t); setDirty(false);
      say('已建立草稿（尚未發布），請填寫內容');
    } catch (e: any) { setError(`建立失敗：${e?.message || e}`); }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const out = clean(draft);
      out.updatedAt = taipeiToday();
      out.updatedAtMs = Date.now();
      await setDoc(doc(db, 'routes', out.slug), out);
      setDraft(out); setDirty(false);
      say('已儲存。要讓網站更新，請按「發布到網站」');
      await load();
    } catch (e: any) {
      setError(`儲存失敗：${e?.message || e}`);
    }
    setSaving(false);
  };

  const saveHook = async (publishedNow = false) => {
    const url = hookUrl.trim();
    const data: Record<string, unknown> = { hookUrl: url };
    if (publishedNow) data.lastPublishedAt = Date.now();
    await setDoc(doc(db, 'private', 'deploy'), data, { merge: true });
    if (publishedNow) setLastPublishedAt(data.lastPublishedAt as number);
  };

  const publish = async () => {
    const url = hookUrl.trim();
    if (!/^https:\/\//.test(url)) { setError('請先貼上 Cloudflare 的 Deploy Hook 網址（https 開頭）'); return; }
    if ((dirty || homeDirty) && !window.confirm('還有未儲存的修改，發布不會包含它。仍要發布嗎？')) return;
    setHookBusy(true);
    setError(null);
    try {
      await fetch(url, { method: 'POST', mode: 'no-cors' }); // Cloudflare Hook 不回 CORS 標頭，瀏覽器看不到結果，只要沒丟錯就視為已送出
      await saveHook(true);
      say('已送出發布，約 1～2 分鐘後網站更新');
    } catch (e: any) {
      setError(`送出發布失敗：${e?.message || e}`);
    }
    setHookBusy(false);
  };

  const set = <K extends keyof RouteData>(k: K, v: RouteData[K]) => { setDraft((d) => (d ? { ...d, [k]: v } : d)); setDirty(true); };

  const updSection = (i: number, patch: Partial<RouteSection>) =>
    set('sections', draft!.sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const moveItem = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return arr;
    const c = arr.slice();
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  };

  const previewHtml = useMemo(() => {
    if (!preview || !draft) return '';
    const others = routes.filter((r) => r.slug !== draft.slug && r.published !== false);
    try {
      return renderRoutePage({ ...clean(draft), updatedAt: taipeiToday() }, { routes: [...others, { ...draft, published: true }], categoryTitles });
    } catch (e: any) {
      return `<p>預覽失敗：${e?.message || e}</p>`;
    }
  }, [preview, draft, routes, categoryTitles]);

  const warnings = useMemo(() => (draft ? checkRoute(draft) : []), [draft]);

  const requestClose = () => {
    if ((dirty || homeDirty) && !window.confirm('有尚未儲存的修改，確定要關閉嗎？')) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 text-gray-900">
        {/* Header */}
        <div className="bg-[#1e293b] text-white px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {draft && (
              <button className="p-1 rounded-lg hover:bg-white/10 cursor-pointer" onClick={() => { if (dirty && !window.confirm('有尚未儲存的修改，確定要離開嗎？')) return; setDraft(null); setDirty(false); }} title="回到路線清單">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="font-bold text-base truncate">{draft ? `編輯路線：${draft.name}（/${draft.slug}/）` : '內容管理'}</h3>
            {pending && <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full whitespace-nowrap">有尚未發布的變更</span>}
          </div>
          <button onClick={requestClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"><X className="w-6 h-6" /></button>
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 text-red-800 text-xs py-2.5 px-5 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</span>
            <button onClick={() => setError(null)} className="font-bold cursor-pointer">✕</button>
          </div>
        )}
        {toast && (
          <div className="bg-emerald-600 text-white text-xs py-2 px-4 flex items-center justify-center gap-1.5"><Check className="w-4 h-4" />{toast}</div>
        )}

        <div className="p-5 overflow-y-auto flex-grow space-y-5 text-sm bg-slate-50/60">
          {loading && <div className="flex items-center gap-2 text-gray-500 text-xs"><Loader2 className="w-4 h-4 animate-spin" />讀取中…</div>}

          {/* ===== 清單 ===== */}
          {!draft && (
            <>
              <Card title="發布到網站">
                <p className="text-xs text-gray-600 leading-relaxed">
                  在這裡「儲存」只會存進後台資料庫，<strong>網站要重新建置後才會更新</strong>。改完想上線時，按下「發布到網站」，Cloudflare 會重新建置（約 1～2 分鐘）。
                </p>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    className={inputCls}
                    type="password"
                    autoComplete="off"
                    placeholder="貼上 Cloudflare Deploy Hook 網址（https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/…）"
                    value={hookUrl}
                    onChange={(e) => setHookUrl(e.target.value)}
                  />
                  <button className={btnGhost} onClick={() => saveHook().then(() => say('已儲存 Deploy Hook')).catch((e) => setError(`儲存失敗：${e?.message || e}`))}>儲存網址</button>
                  <button
                    className="inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    onClick={publish}
                    disabled={hookBusy}
                  >
                    {hookBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}發布到網站
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">
                  Deploy Hook 網址只存在「僅管理員可讀」的資料中，不會出現在公開網站。
                  {lastPublishedAt > 0 && `　上次發布：${new Date(lastPublishedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`}
                </p>
              </Card>

              <div className="flex gap-1 border-b border-gray-200">
                {([['routes', '路線'], ['home', '首頁內容']] as const).map(([k, label]) => (
                  <button
                    key={k}
                    className={`px-4 py-2 text-sm font-semibold -mb-px border-b-2 cursor-pointer ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                    onClick={() => setTab(k)}
                  >
                    {label}{k === 'home' && homeDirty ? ' •' : ''}
                  </button>
                ))}
              </div>

              {tab === 'routes' && <>
              {missingSeeds.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="text-xs text-amber-900 leading-relaxed">
                    {routes.length === 0
                      ? '後台還沒有路線資料。按「匯入預設路線」，會把目前網站上的 19 條路線內容放進後台，之後就能在這裡編輯。'
                      : `有 ${missingSeeds.length} 條預設路線還沒在後台：${missingSeeds.map((s) => s.name).join('、')}`}
                  </div>
                  <button className="inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer whitespace-nowrap" onClick={importSeeds}>
                    <Download className="w-4 h-4" />匯入預設路線
                  </button>
                </div>
              )}

              <Card
                title={`路線清單（${routes.length}）`}
                aside={<button className={btnGhost} onClick={() => setTab('home')}>管理路線分類</button>}
              >
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  清單依首頁的分類分組。每條路線可直接改「分類」「首頁顯示名稱」「首頁說明」（離開欄位就會儲存）；上下箭頭調整該分類內的順序。
                  新增、改名、刪除分類請到「首頁內容」分頁。改完記得按上方「發布到網站」。
                </p>
                {[
                  ...categories.map((c) => ({ id: c.id, title: c.title, collapsed: c.collapsed, list: routes.filter((r) => r.group === c.id) })),
                  { id: '__orphan', title: '分類已被刪除（首頁會顯示在「更多」）', collapsed: false, list: routes.filter((r) => !categories.some((c) => c.id === r.group)) },
                ]
                  .filter((g) => g.id !== '__orphan' || g.list.length > 0)
                  .map((g) => (
                    <div key={g.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-100 px-3 py-1.5 text-xs font-bold text-gray-700 flex items-center gap-2">
                        {g.title}
                        <span className="font-normal text-gray-500">{g.list.length} 條{g.collapsed ? '・首頁預設收合' : ''}</span>
                      </div>
                      <div className="divide-y divide-gray-100 px-3">
                        {g.list.map((r, i) => (
                          <RouteRow
                            key={r.slug}
                            r={r}
                            categories={categories}
                            canUp={i > 0}
                            canDown={i < g.list.length - 1}
                            onMove={(dir) => move(r, dir)}
                            onTogglePublished={() => togglePublished(r)}
                            onEdit={() => { setDraft(clean(r)); setDirty(false); }}
                            onSaveHome={(patch) => patchRoute(r.slug, patch, '已儲存首頁顯示文字。要讓網站更新，請按「發布到網站」')}
                            onChangeGroup={(group) => patchRoute(r.slug, { group }, '已更換分類。要讓網站更新，請按「發布到網站」')}
                          />
                        ))}
                        {!g.list.length && <div className="text-xs text-gray-400 py-3">這個分類還沒有路線（在其他路線的「分類」下拉選這個分類，就會移進來）。</div>}
                      </div>
                    </div>
                  ))}
                {!routes.length && !loading && <div className="text-xs text-gray-500 py-3">目前沒有路線。</div>}
              </Card>

              <Card title="新增路線">
                <div className="grid md:grid-cols-4 gap-2 items-end">
                  <Field label="路線名稱" hint="例：玉山北峰、北大武山">
                    <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </Field>
                  <Field label="網址代稱（slug）" hint="小寫英文、數字、連字號；建立後不可更改。例：yushan-north">
                    <input className={inputCls} value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="yushan-north" />
                  </Field>
                  <Field label="分類" hint="之後可在清單上更換">
                    <select className={inputCls} value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </Field>
                  <button className="inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer" onClick={createRoute}>
                    <Plus className="w-4 h-4" />建立草稿
                  </button>
                </div>
                <p className="text-[11px] text-gray-500">草稿預設「未發布」，填好內容後在清單按「發布」，再按上方「發布到網站」才會上線；上線後會自動出現在 sitemap、llms.txt 與其他路線頁的導覽。</p>
              </Card>
              <p className="text-[11px] text-gray-500">為避免已被搜尋引擎收錄的網址變成 404，路線無法刪除，只能「停用」。</p>
              </>}
            </>
          )}

          {/* ===== 首頁內容（一直保持載入，只用 hidden 切換，避免切到別的分頁或編輯路線時洗掉還沒儲存的修改） ===== */}
          <div className={!draft && tab === 'home' ? '' : 'hidden'}>
            <AdminHomePanel
              initial={homeInitial}
              routes={routes}
              missingSeedCount={missingSeeds.length}
              onImportSeeds={importSeeds}
              onPatchRoute={patchRoute}
              onSaved={(m) => { say(m); load(); }}
              onError={(m) => setError(m)}
              onDirtyChange={setHomeDirty}
            />
          </div>

          {/* ===== 編輯 ===== */}
          {draft && (
            <>
              {warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />提醒（不影響儲存）</div>
                  <ul className="list-disc pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </div>
              )}

              <Card title="基本設定">
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="路線名稱（後台與導覽短名稱）"><input className={inputCls} value={draft.navName} onChange={(e) => { set('navName', e.target.value); set('name', e.target.value); }} /></Field>
                  <Field label="llms.txt 與清單用的完整名稱" hint="例：玉山｜塔塔加"><input className={inputCls} value={draft.listName} onChange={(e) => set('listName', e.target.value)} /></Field>
                  <Field label="首頁清單顯示名稱" hint="首頁「熱門／更多路線」清單裡的連結文字，例：玉山登山口｜塔塔加停車場">
                    <input className={inputCls} value={draft.homeName || ''} onChange={(e) => set('homeName', e.target.value)} />
                  </Field>
                  <Field label="首頁清單說明" hint="接在名稱後面，例：玉山群峰、麟趾山、鹿林山（可留空）">
                    <input className={inputCls} value={draft.homeDesc || ''} onChange={(e) => set('homeDesc', e.target.value)} />
                  </Field>
                  <Field label="分類" hint="決定路線出現在首頁哪個清單。「熱門」分類的路線也會出現在各頁「其他登山接駁路線」導覽；其他分類的頁尾會導向首頁。分類在「首頁內容」分頁管理">
                    <select className={inputCls} value={draft.group} onChange={(e) => set('group', e.target.value)}>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                      {!categories.some((c) => c.id === draft.group) && <option value={draft.group}>（分類已刪除，會顯示在「更多」）</option>}
                    </select>
                  </Field>
                  <Field label="發布狀態">
                    <select className={inputCls} value={draft.published ? '1' : '0'} onChange={(e) => set('published', e.target.value === '1')}>
                      <option value="1">已發布（下次發布到網站時上線）</option>
                      <option value="0">未發布（不輸出頁面）</option>
                    </select>
                  </Field>
                </div>
              </Card>

              <Card title="搜尋引擎與頁面標題（SEO）">
                <Field label="頁面大標題（H1）"><input className={inputCls} value={draft.h1} onChange={(e) => set('h1', e.target.value)} /></Field>
                <Field label="SEO 標題" hint="網站名稱 ｜亞馬遜高山接駁 會自動加在後面">
                  <input className={inputCls} value={draft.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} />
                  <div className="text-right"><Counter value={draft.metaTitle} max={60} /></div>
                </Field>
                <Field label="SEO 描述（meta description）">
                  <textarea className={inputCls} rows={2} value={draft.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} />
                  <div className="text-right"><Counter value={draft.metaDescription} max={120} /></div>
                </Field>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="麵包屑名稱"><input className={inputCls} value={draft.breadcrumbName} onChange={(e) => set('breadcrumbName', e.target.value)} /></Field>
                  <Field label="結構化資料的服務名稱"><input className={inputCls} value={draft.serviceName} onChange={(e) => set('serviceName', e.target.value)} /></Field>
                </div>
              </Card>

              <Card title="開頭段落與按鈕">
                <Field label="開頭段落" hint="連結寫法：[文字](https://網址)">
                  <textarea className={inputCls} rows={3} value={draft.intro} onChange={(e) => set('intro', e.target.value)} />
                </Field>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="第三顆按鈕文字（預設：價格估算系統）"><input className={inputCls} value={draft.ctaPrice?.label || ''} onChange={(e) => set('ctaPrice', { label: e.target.value, url: draft.ctaPrice?.url || '' })} placeholder="價格估算系統" /></Field>
                  <Field label="第三顆按鈕網址" hint="兩格都留空＝用預設"><input className={inputCls} value={draft.ctaPrice?.url || ''} onChange={(e) => set('ctaPrice', { label: draft.ctaPrice?.label || '', url: e.target.value })} placeholder="https://price.amazon-hike.com/" /></Field>
                </div>
              </Card>

              <Card
                title={`內容區塊（${draft.sections.length}）`}
                aside={<button className={btnGhost} onClick={() => set('sections', [...draft.sections, { id: `s${Date.now()}`, heading: '', body: '' }])}><Plus className="w-3.5 h-3.5" />新增區塊</button>}
              >
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  每個區塊 = 一個 H2 小標題 + 內文。內文寫法：空白行分段；每行開頭「- 」＝條列；「1. 」＝編號清單；連結 <code>[文字](https://網址)</code>，站內連結用 <code>[文字](/permit/)</code>。
                </p>
                {draft.sections.map((s, i) => (
                  <div key={s.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} placeholder="區塊標題（H2）" value={s.heading} onChange={(e) => updSection(i, { heading: e.target.value })} />
                      <button className={btnGhost} disabled={i === 0} onClick={() => set('sections', moveItem(draft.sections, i, -1))}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button className={btnGhost} disabled={i === draft.sections.length - 1} onClick={() => set('sections', moveItem(draft.sections, i, 1))}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button className={`${btnGhost} text-red-600`} onClick={() => { if (window.confirm(`刪除區塊「${s.heading || i + 1}」？`)) set('sections', draft.sections.filter((_, k) => k !== i)); }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <textarea className={`${inputCls} font-mono`} rows={Math.min(14, Math.max(4, s.body.split('\n').length + 1))} value={s.body} onChange={(e) => updSection(i, { body: e.target.value })} />
                  </div>
                ))}
              </Card>

              <Card
                title={`常見問題（${draft.faq.length}）`}
                aside={<button className={btnGhost} onClick={() => set('faq', [...draft.faq, { q: '', a: '' }])}><Plus className="w-3.5 h-3.5" />新增問題</button>}
              >
                <p className="text-[11px] text-gray-500">會同時輸出成頁面內容與 FAQ 結構化資料（連結在結構化資料中只保留文字）。</p>
                {draft.faq.map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <input className={inputCls} placeholder="問題" value={f.q} onChange={(e) => set('faq', draft.faq.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
                      <button className={btnGhost} disabled={i === 0} onClick={() => set('faq', moveItem(draft.faq, i, -1))}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button className={btnGhost} disabled={i === draft.faq.length - 1} onClick={() => set('faq', moveItem(draft.faq, i, 1))}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button className={`${btnGhost} text-red-600`} onClick={() => set('faq', draft.faq.filter((_, k) => k !== i))}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <textarea className={inputCls} rows={3} placeholder="回答" value={f.a} onChange={(e) => set('faq', draft.faq.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
                  </div>
                ))}
              </Card>

              <Card title="出發前準備（頁面下方連結清單）">
                <Field label="標題"><input className={inputCls} value={draft.prep.heading} onChange={(e) => set('prep', { ...draft.prep, heading: e.target.value })} /></Field>
                <Field label="內容" hint="每行「- [連結文字](網址)：說明」">
                  <textarea className={`${inputCls} font-mono`} rows={6} value={draft.prep.body} onChange={(e) => set('prep', { ...draft.prep, body: e.target.value })} />
                </Field>
              </Card>

              <Card title="活動影片（YouTube）">
                <p className="text-[11px] text-gray-500">影片 ID 留空＝這頁不顯示影片。可直接貼 YouTube 網址，會自動取出 ID。要輸出影片結構化資料，需填「標題、說明、上傳日期」。</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="YouTube 網址或影片 ID"><input className={inputCls} value={draft.video.youtubeId} onChange={(e) => set('video', { ...draft.video, youtubeId: youtubeIdFrom(e.target.value) })} /></Field>
                  <Field label="區塊標題（H2）"><input className={inputCls} value={draft.video.heading} onChange={(e) => set('video', { ...draft.video, heading: e.target.value })} /></Field>
                  <Field label="影片標題"><input className={inputCls} value={draft.video.title} onChange={(e) => set('video', { ...draft.video, title: e.target.value })} /></Field>
                  <Field label="上傳日期（YYYY-MM-DD）"><input className={inputCls} value={draft.video.uploadDate} onChange={(e) => set('video', { ...draft.video, uploadDate: e.target.value })} placeholder="2026-05-25" /></Field>
                  <Field label="片長（ISO 8601，選填）" hint="例：PT5M30S = 5 分 30 秒"><input className={inputCls} value={draft.video.duration} onChange={(e) => set('video', { ...draft.video, duration: e.target.value })} /></Field>
                </div>
                <Field label="影片說明（給搜尋引擎的結構化資料）"><textarea className={inputCls} rows={2} value={draft.video.description} onChange={(e) => set('video', { ...draft.video, description: e.target.value })} /></Field>
                <Field label="重點摘要（一行一點）"><textarea className={inputCls} rows={3} value={draft.video.summary.join('\n')} onChange={(e) => set('video', { ...draft.video, summary: e.target.value.split('\n') })} /></Field>
                <Field label="逐字稿（一行一段，可直接貼上）"><textarea className={inputCls} rows={5} value={draft.video.transcript} onChange={(e) => set('video', { ...draft.video, transcript: e.target.value })} /></Field>
              </Card>

              <Card
                title={`路線攻略文章連結（${draft.articles.length}）`}
                aside={<button className={btnGhost} onClick={() => set('articles', [...draft.articles, { title: '', url: '', show: true }])}><Plus className="w-3.5 h-3.5" />新增文章</button>}
              >
                {draft.articles.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input className={`${inputCls} flex-1 min-w-[160px]`} placeholder="文章標題" value={a.title} onChange={(e) => set('articles', draft.articles.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
                    <input className={`${inputCls} flex-1 min-w-[160px]`} placeholder="https://…" value={a.url} onChange={(e) => set('articles', draft.articles.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} />
                    <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={a.show !== false} onChange={(e) => set('articles', draft.articles.map((x, k) => (k === i ? { ...x, show: e.target.checked } : x)))} />顯示</label>
                    <button className={`${btnGhost} text-red-600`} onClick={() => set('articles', draft.articles.filter((_, k) => k !== i))}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {!draft.articles.length && <p className="text-[11px] text-gray-500">還沒有文章。文章做好後貼上網址、勾「顯示」即可；網址需為 https。</p>}
              </Card>

              <Card title="頁尾結尾段落（進階）">
                <Field label="結尾段落" hint="留空＝使用預設的「延伸閱讀：亞馬遜國家山岳協會…」。要放這條路線專屬的協會文章連結時再填。">
                  <textarea className={inputCls} rows={3} value={draft.closing || ''} onChange={(e) => set('closing', e.target.value)} />
                </Field>
              </Card>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-5 py-3 flex items-center justify-between gap-3 border-t border-gray-200">
          <div className="text-[11px] text-gray-500 hidden sm:block">
            {draft ? '儲存只更新後台資料；回到清單按「發布到網站」才會讓前台頁面更新。' : '路線頁與首頁都是建置時產生的靜態 HTML，發布後 Google 讀到的是完整內容。'}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {draft && <button className={btnGhost} onClick={() => setPreview(true)}><Eye className="w-3.5 h-3.5" />預覽頁面</button>}
            {draft && (
              <button
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 text-white rounded-lg font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                onClick={save}
                disabled={saving || !dirty}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}儲存路線
              </button>
            )}
            {!draft && <button className={btnGhost} onClick={requestClose}>關閉</button>}
          </div>
        </div>
      </div>

      {/* 預覽 */}
      {preview && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl w-full max-w-3xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-white text-sm">
              <span>預覽：/{draft?.slug}/（未儲存的修改也會顯示）</span>
              <button className="p-1 hover:bg-white/10 rounded cursor-pointer" onClick={() => setPreview(false)}><X className="w-5 h-5" /></button>
            </div>
            <iframe title="route-preview" className="flex-1 w-full bg-white" sandbox="" srcDoc={previewHtml} />
          </div>
        </div>
      )}
    </div>
  );
};
