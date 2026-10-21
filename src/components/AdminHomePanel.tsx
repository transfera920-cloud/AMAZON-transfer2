import React, { useEffect, useMemo, useRef, useState } from 'react';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { Save, Plus, Trash2, ArrowUp, ArrowDown, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import {
  defaultHomeBlocks,
  DEFAULT_HOME_FAQ,
  DEFAULT_PERMIT_FAQ,
} from '../../shared/homeContent.mjs';
import type { HomeBlock, HomeContent, HomeFaqEntry, RoadItem } from '../../shared/homeContent.mjs';
import type { RouteData } from '../types';

/**
 * 後台「首頁內容」分頁：編輯首頁各區塊（順序、標題、文字）、首頁常見問題、入園入山申請頁常見問題。
 * 資料存在 Firestore settings/general 的 homeBlocks / homeFaq / permitFaq；按「發布到網站」後才會更新靜態 HTML 與結構化資料。
 */

const inputCls = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500';
const btnGhost = 'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const Card: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
      <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {title}
      </h4>
      {aside}
    </div>
    {children}
  </div>
);

const moveItem = <T,>(arr: T[], i: number, dir: -1 | 1): T[] => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const c = arr.slice();
  [c[i], c[j]] = [c[j], c[i]];
  return c;
};

const KIND_LABEL: Record<HomeBlock['kind'], string> = {
  text: '文字區塊',
  routes: '路線分類',
  roadguide: '道路管制卡片',
  faq: '常見問題',
};

const TONE_LABEL: Record<RoadItem['tone'], string> = { amber: '黃（一般提醒）', blue: '藍（天候／雪季）', red: '紅（封閉／禁止）' };

/** 連結只接受 https、站內路徑、tel:、mailto:（其他不會變成連結） */
function linkWarnings(label: string, text: string): string[] {
  const out: string[] = [];
  for (const m of String(text).matchAll(/\]\(([^)\s]*)\)/g)) {
    if (!/^(https?:\/\/|\/(?!\/)|tel:|mailto:)/i.test(m[1])) out.push(`${label}：連結「${m[1]}」格式不正確，不會變成連結`);
    else if (/^http:\/\//i.test(m[1])) out.push(`${label}：連結「${m[1]}」不是 https`);
  }
  return out;
}

const FaqEditor: React.FC<{ items: HomeFaqEntry[]; onChange: (v: HomeFaqEntry[]) => void }> = ({ items, onChange }) => (
  <>
    {items.map((f, i) => (
      <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <input className={inputCls} placeholder="問題" value={f.q} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)))} />
          <button className={btnGhost} disabled={i === 0} onClick={() => onChange(moveItem(items, i, -1))}><ArrowUp className="w-3.5 h-3.5" /></button>
          <button className={btnGhost} disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, 1))}><ArrowDown className="w-3.5 h-3.5" /></button>
          <button className={`${btnGhost} text-red-600`} onClick={() => { if (window.confirm(`刪除這題？\n${f.q || '(空白問題)'}`)) onChange(items.filter((_, k) => k !== i)); }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <textarea className={inputCls} rows={3} placeholder="回答（連結：[文字](https://網址)；站內連結：[文字](/hehuanshan/)）" value={f.a} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)))} />
      </div>
    ))}
    {!items.length && <p className="text-[11px] text-gray-500">目前沒有問題。</p>}
  </>
);

/** 內建分類：路線頁導覽與 llms.txt 會用到「熱門」「更多」，所以只能改名、不能刪除 */
const BUILTIN_GROUPS = ['popular', 'more'];

type RouteLite = Pick<RouteData, 'slug' | 'name' | 'group' | 'published'>;

interface Props {
  initial: HomeContent;
  routes: RouteLite[];
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export const AdminHomePanel: React.FC<Props> = ({ initial, routes, onSaved, onError, onDirtyChange }) => {
  const [blocks, setBlocks] = useState<HomeBlock[]>(initial.blocks);
  const [faq, setFaq] = useState<HomeFaqEntry[]>(initial.faq);
  const [permitFaq, setPermitFaq] = useState<HomeFaqEntry[]>(initial.permitFaq);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  // 後台資料重新載入（例如剛儲存完）時，同步成最新內容；有還沒儲存的修改時不覆蓋
  useEffect(() => {
    if (dirtyRef.current) return;
    setBlocks(initial.blocks);
    setFaq(initial.faq);
    setPermitFaq(initial.permitFaq);
    setDirty(false);
  }, [initial]);

  useEffect(() => { onDirtyChange(dirty); }, [dirty]);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };
  const setBlocksD = mark(setBlocks);
  const setFaqD = mark(setFaq);
  const setPermitFaqD = mark(setPermitFaq);

  // 目前已存在資料庫的分類代號（用來判斷這次儲存刪掉了哪些分類）
  const savedGroups = useMemo(
    () => initial.blocks.filter((b) => b.kind === 'routes').map((b) => (b as Extract<HomeBlock, { kind: 'routes' }>).group),
    [initial]
  );

  const addCategory = () => {
    const code = `c${Date.now().toString(36)}`;
    const nb: HomeBlock = { id: code, kind: 'routes', group: code, title: '新的路線分類', collapsed: false };
    // 放在最後一個路線分類之後
    let at = -1;
    blocks.forEach((b, i) => { if (b.kind === 'routes') at = i; });
    setBlocksD(at < 0 ? [...blocks, nb] : [...blocks.slice(0, at + 1), nb, ...blocks.slice(at + 1)]);
  };

  const removeCategory = (i: number) => {
    const b = blocks[i];
    if (b.kind !== 'routes') return;
    const n = routes.filter((r) => r.group === b.group).length;
    const msg = `刪除路線分類「${b.title || '(未命名)'}」？` + (n ? `\n\n裡面的 ${n} 條路線不會被刪除，按「儲存首頁內容」後會改放到「更多」分類。` : '');
    if (window.confirm(msg)) setBlocksD(blocks.filter((_, k) => k !== i));
  };

  const updBlock = (i: number, patch: Record<string, unknown>) =>
    setBlocksD(blocks.map((b, k) => (k === i ? ({ ...b, ...patch } as HomeBlock) : b)));

  const warnings = useMemo(() => {
    const w: string[] = [];
    blocks.forEach((b) => {
      if (!b.title.trim()) w.push(`有一個「${KIND_LABEL[b.kind]}」沒有標題`);
      if (b.kind === 'text') {
        if (!b.body.trim()) w.push(`區塊「${b.title || '(未命名)'}」沒有內容`);
        w.push(...linkWarnings(`區塊「${b.title}」`, b.body));
      }
      if (b.kind === 'routes' && !routes.some((r) => r.group === b.group && r.published)) {
        w.push(`路線分類「${b.title || '(未命名)'}」目前沒有已發布的路線，首頁不會顯示這個分類`);
      }
    });
    faq.forEach((f, i) => w.push(...linkWarnings(`首頁 FAQ 第 ${i + 1} 題`, f.a)));
    permitFaq.forEach((f, i) => w.push(...linkWarnings(`申請頁 FAQ 第 ${i + 1} 題`, f.a)));
    if (faq.filter((f) => f.q.trim() && f.a.trim()).length < 3) w.push('首頁常見問題少於 3 題');
    return w;
  }, [blocks, faq, permitFaq, routes]);

  const save = async () => {
    setSaving(true);
    try {
      const cleanFaq = (l: HomeFaqEntry[]) => l.map((f) => ({ q: f.q.trim(), a: f.a.trim() })).filter((f) => f.q && f.a);
      const payload = JSON.parse(
        JSON.stringify({
          homeBlocks: blocks.map((b) => ({ ...b, title: b.title.trim() })),
          homeFaq: cleanFaq(faq),
          permitFaq: cleanFaq(permitFaq),
          contentUpdatedAtMs: Date.now(),
        })
      );
      // merge：只更新這三個欄位，不動首頁其他設定
      await setDoc(doc(db, 'settings', 'general'), payload, { merge: true });

      // 被刪除的分類：裡面的路線改放「更多」（沒有「更多」就放第一個分類），不然這些路線會從首頁清單消失
      const nowGroups = blocks.filter((b) => b.kind === 'routes').map((b) => (b as Extract<HomeBlock, { kind: 'routes' }>).group);
      const removed = savedGroups.filter((g) => !nowGroups.includes(g));
      const fallback = nowGroups.includes('more') ? 'more' : nowGroups[0];
      const moved = fallback ? routes.filter((r) => removed.includes(r.group)) : [];
      if (moved.length) {
        const batch = writeBatch(db);
        const now = Date.now();
        moved.forEach((r) => batch.update(doc(db, 'routes', r.slug), { group: fallback, updatedAtMs: now }));
        await batch.commit();
      }

      dirtyRef.current = false;
      setDirty(false);
      onSaved(`已儲存首頁內容${moved.length ? `（${moved.length} 條路線已移到「${blocks.find((b) => b.kind === 'routes' && b.group === fallback)?.title || '更多'}」）` : ''}。要讓網站更新，請按「發布到網站」`);
    } catch (e: any) {
      onError(`儲存首頁內容失敗：${e?.message || e}`);
    }
    setSaving(false);
  };

  const resetDefaults = () => {
    if (!window.confirm('把首頁區塊與兩份常見問題全部還原成內建預設內容？（按「儲存」前不會真的寫入）')) return;
    setBlocks(defaultHomeBlocks());
    setFaq(DEFAULT_HOME_FAQ.map((f) => ({ ...f })));
    setPermitFaq(DEFAULT_PERMIT_FAQ.map((f) => ({ ...f })));
    setDirty(true);
  };

  const updRoad = (bi: number, ri: number, patch: Partial<RoadItem>) => {
    const b = blocks[bi];
    if (b.kind !== 'roadguide') return;
    updBlock(bi, { items: b.items.map((it, k) => (k === ri ? { ...it, ...patch } : it)) });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-xs text-emerald-900 leading-relaxed flex-1 min-w-[220px]">
          這裡編輯<strong>首頁</strong>（各區塊的順序與文字、常見問題）與<strong>入園入山申請頁</strong>的常見問題。<br />
          首頁的「熱門／更多路線」清單來自「路線」分頁（每條路線的分組、順序、首頁顯示名稱與說明）。
        </p>
        <div className="flex items-center gap-2">
          <button className={btnGhost} onClick={resetDefaults}><RotateCcw className="w-3.5 h-3.5" />還原預設</button>
          <button
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}儲存首頁內容
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />提醒（不影響儲存）</div>
          <ul className="list-disc pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      <Card
        title={`首頁區塊（由上到下，共 ${blocks.length} 個）`}
        aside={
          <div className="flex items-center gap-2">
            <button className={btnGhost} onClick={addCategory}><Plus className="w-3.5 h-3.5" />新增路線分類</button>
            <button
              className={btnGhost}
              onClick={() => {
                // 新增在「常見問題」之前（最後一個區塊通常是 FAQ）
                const at = blocks.findIndex((b) => b.kind === 'faq');
                const nb: HomeBlock = { id: `t${Date.now()}`, kind: 'text', title: '', body: '' };
                setBlocksD(at < 0 ? [...blocks, nb] : [...blocks.slice(0, at), nb, ...blocks.slice(at)]);
              }}
            >
              <Plus className="w-3.5 h-3.5" />新增文字區塊
            </button>
          </div>
        }
      >
        <p className="text-[11px] text-gray-500 leading-relaxed">
          內文寫法：空白行分段；每行開頭「- 」＝條列；「1. 」＝編號清單；連結 <code>[文字](https://網址)</code>，站內連結 <code>[文字](/permit/)</code>。
          「路線分類」就是首頁的一個路線清單：可新增、改名（改標題）、調整順序、刪除（內建的「熱門」「更多」只能改名，不能刪）。道路管制卡片與常見問題可以調整順序與標題，但不能刪除。
        </p>
        {blocks.map((b, i) => (
          <div key={b.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-700 whitespace-nowrap">{KIND_LABEL[b.kind]}</span>
              <input className={inputCls} placeholder="區塊標題（H2）" value={b.title} onChange={(e) => updBlock(i, { title: e.target.value })} />
              <button className={btnGhost} disabled={i === 0} onClick={() => setBlocksD(moveItem(blocks, i, -1))}><ArrowUp className="w-3.5 h-3.5" /></button>
              <button className={btnGhost} disabled={i === blocks.length - 1} onClick={() => setBlocksD(moveItem(blocks, i, 1))}><ArrowDown className="w-3.5 h-3.5" /></button>
              {b.kind === 'text' && (
                <button className={`${btnGhost} text-red-600`} onClick={() => { if (window.confirm(`刪除區塊「${b.title || '(未命名)'}」？`)) setBlocksD(blocks.filter((_, k) => k !== i)); }}><Trash2 className="w-3.5 h-3.5" /></button>
              )}
              {b.kind === 'routes' && (
                <button
                  className={`${btnGhost} text-red-600`}
                  disabled={BUILTIN_GROUPS.includes(b.group)}
                  title={BUILTIN_GROUPS.includes(b.group) ? '內建分類不能刪除，只能改名' : '刪除這個分類'}
                  onClick={() => removeCategory(i)}
                ><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>

            {b.kind === 'text' && (
              <textarea className={`${inputCls} font-mono`} rows={Math.min(14, Math.max(4, b.body.split('\n').length + 1))} value={b.body} onChange={(e) => updBlock(i, { body: e.target.value })} />
            )}

            {b.kind === 'routes' && (
              <div className="text-[11px] text-gray-600 space-y-1.5">
                <p>
                  {(() => {
                    const inCat = routes.filter((r) => r.group === b.group);
                    return `目前 ${inCat.length} 條路線（已發布 ${inCat.filter((r) => r.published).length} 條）${BUILTIN_GROUPS.includes(b.group) ? '，內建分類' : ''}。`;
                  })()}
                  要把路線放進這個分類，或修改首頁上的路線名稱與說明，請到「路線」分頁（在清單上直接改）。
                </p>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700">
                  <input type="checkbox" checked={b.collapsed} onChange={(e) => updBlock(i, { collapsed: e.target.checked })} />
                  預設收合（顯示「展開查看 N 條路線」）
                </label>
              </div>
            )}

            {b.kind === 'faq' && <p className="text-[11px] text-gray-600">顯示下方「首頁常見問題」。</p>}

            {b.kind === 'roadguide' && (
              <div className="space-y-2">
                <p className="text-[11px] text-gray-600">每張卡片：標籤（例：夜間常態管制）、標題、重點時間、說明。上方的官方連結（公路局 168、林業署）固定顯示。</p>
                {b.items.map((it, ri) => (
                  <div key={ri} className="border border-gray-200 rounded-lg p-2.5 space-y-2 bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <select className={`${inputCls} !w-auto`} value={it.tone} onChange={(e) => updRoad(i, ri, { tone: e.target.value as RoadItem['tone'] })}>
                        {(Object.keys(TONE_LABEL) as RoadItem['tone'][]).map((t) => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
                      </select>
                      <input className={`${inputCls} flex-1 min-w-[140px]`} placeholder="標籤（例：每週二四全日封閉）" value={it.tag} onChange={(e) => updRoad(i, ri, { tag: e.target.value })} />
                      <button className={btnGhost} disabled={ri === 0} onClick={() => updBlock(i, { items: moveItem(b.items, ri, -1) })}><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button className={btnGhost} disabled={ri === b.items.length - 1} onClick={() => updBlock(i, { items: moveItem(b.items, ri, 1) })}><ArrowDown className="w-3.5 h-3.5" /></button>
                      <button className={`${btnGhost} text-red-600`} onClick={() => { if (window.confirm(`刪除「${it.title || '(未命名)'}」？`)) updBlock(i, { items: b.items.filter((_, k) => k !== ri) }); }}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <input className={inputCls} placeholder="標題（例：台20線 南橫公路（梅山口至向陽登山口））" value={it.title} onChange={(e) => updRoad(i, ri, { title: e.target.value })} />
                    <input className={inputCls} placeholder="重點（例：每週二、週四不開放…）" value={it.highlight} onChange={(e) => updRoad(i, ri, { highlight: e.target.value })} />
                    <textarea className={inputCls} rows={3} placeholder="說明" value={it.desc} onChange={(e) => updRoad(i, ri, { desc: e.target.value })} />
                  </div>
                ))}
                <button className={btnGhost} onClick={() => updBlock(i, { items: [...b.items, { tone: 'amber', tag: '', title: '', highlight: '', desc: '' }] })}>
                  <Plus className="w-3.5 h-3.5" />新增卡片
                </button>
              </div>
            )}
          </div>
        ))}
      </Card>

      <Card
        title={`首頁常見問題（${faq.length}）`}
        aside={<button className={btnGhost} onClick={() => setFaqD([...faq, { q: '', a: '' }])}><Plus className="w-3.5 h-3.5" />新增問題</button>}
      >
        <p className="text-[11px] text-gray-500">會同時輸出成首頁畫面與 FAQPage 結構化資料（連結在結構化資料中只保留文字）。空白的問題或回答儲存時會自動略過。</p>
        <FaqEditor items={faq} onChange={setFaqD} />
      </Card>

      <Card
        title={`入園入山申請頁（/permit/）常見問題（${permitFaq.length}）`}
        aside={<button className={btnGhost} onClick={() => setPermitFaqD([...permitFaq, { q: '', a: '' }])}><Plus className="w-3.5 h-3.5" />新增問題</button>}
      >
        <p className="text-[11px] text-gray-500">申請頁的連結清單仍在「首頁設定」的「入園入山申請系統」卡片裡編輯；這裡只管下方的常見問題。</p>
        <FaqEditor items={permitFaq} onChange={setPermitFaqD} />
      </Card>
    </div>
  );
};
