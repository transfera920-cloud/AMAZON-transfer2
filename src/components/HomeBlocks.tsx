import React from 'react';
import { parseBlocks, parseInline, LINK_CLASS } from '../../shared/homeContent.mjs';
import type { HomeBlock, HomeContent, HomeRoutes, HomeRouteItem, InlinePart, RoadItem } from '../../shared/homeContent.mjs';

/**
 * 首頁內容區塊。順序、標題與文字都來自後台（Firestore settings/general 的 homeBlocks / homeFaq），
 * 路線清單來自路線資料（建置時產生的 home.generated.json）。預設內容與解析規則在 shared/homeContent.mjs，
 * 與 index.html 的靜態 HTML 共用同一份，所以不會出現兩邊文字不一致。
 */

const SectionShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="bg-[#0e2318]/85 border border-emerald-900/60 rounded-2xl p-4 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md mb-4 md:mb-12 relative overflow-hidden">
    <h2 className="text-lg md:text-xl font-bold text-white mb-2.5 md:mb-4 flex items-center relative z-10">
      <span className="w-1.5 h-5 bg-gradient-to-b from-[#00e676] to-[#00c853] rounded-full mr-3 inline-block shadow-[0_0_8px_rgba(0,200,83,0.6)]"></span>
      <span>{title}</span>
    </h2>
    <div className="text-emerald-100/85 leading-relaxed text-sm md:text-base space-y-2.5 md:space-y-4 relative z-10">
      {children}
    </div>
  </section>
);

const Parts: React.FC<{ parts: InlinePart[] }> = ({ parts }) => (
  <>
    {parts.map((p, i) => {
      if (typeof p === 'string') return <React.Fragment key={i}>{p}</React.Fragment>;
      const external = /^https?:\/\//i.test(p.href);
      return (
        <a key={i} href={p.href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className={LINK_CLASS}>
          {p.text}
        </a>
      );
    })}
  </>
);

const RichBody: React.FC<{ body: string }> = ({ body }) => (
  <>
    {parseBlocks(body).map((b, i) => {
      if (b.type === 'ul') return <ul key={i} className="space-y-2.5 list-disc list-inside">{b.items.map((it, k) => <li key={k}><Parts parts={it} /></li>)}</ul>;
      if (b.type === 'ol') return <ol key={i} className="space-y-2.5 list-decimal list-inside">{b.items.map((it, k) => <li key={k}><Parts parts={it} /></li>)}</ol>;
      return <p key={i}><Parts parts={b.items[0]} /></p>;
    })}
  </>
);

const RouteItem: React.FC<{ route: HomeRouteItem }> = ({ route }) => (
  <li>
    <a href={route.url} className="font-semibold text-[#00e676] hover:text-white underline underline-offset-2">{route.name}</a>
    {route.desc && <span>：{route.desc}</span>}
  </li>
);

const RoutesBlock: React.FC<{ block: Extract<HomeBlock, { kind: 'routes' }>; routes: HomeRouteItem[] }> = ({ block, routes }) => {
  if (!routes.length) return null;
  const list = <ul className={`space-y-2.5 list-none${block.collapsed ? ' mt-4' : ''}`}>{routes.map((r) => <RouteItem key={r.slug} route={r} />)}</ul>;
  return (
    <SectionShell title={block.title}>
      {block.collapsed ? (
        <details>
          <summary className="cursor-pointer font-semibold text-[#00e676]">展開查看 {routes.length} 條路線</summary>
          {list}
        </details>
      ) : list}
    </SectionShell>
  );
};

const TAG_CLASS: Record<RoadItem['tone'], string> = { amber: 'text-amber-300', blue: 'text-blue-300', red: 'text-red-300' };
const HIGHLIGHT_CLASS: Record<RoadItem['tone'], string> = { amber: 'text-amber-200/90', blue: 'text-blue-200/90', red: 'text-red-200/90' };

const RoadGuideBlock: React.FC<{ block: Extract<HomeBlock, { kind: 'roadguide' }> }> = ({ block }) => (
  <SectionShell title={block.title}>
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-900/60 text-xs text-emerald-200">
      <div className="flex items-center gap-2">
        <span>官方即時路況查詢：</span>
        <a href="https://168.thb.gov.tw/" target="_blank" rel="noopener noreferrer" className="text-[#00e676] hover:text-white underline decoration-emerald-600/50 underline-offset-2 transition-colors font-medium">公路局 168 即時路況</a>
        <span className="text-emerald-700">|</span>
        <a href="https://www.forest.gov.tw/" target="_blank" rel="noopener noreferrer" className="text-[#00e676] hover:text-white underline decoration-emerald-600/50 underline-offset-2 transition-colors font-medium">林業署林道動態</a>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
      {block.items.map((it, i) => (
        <div key={i} className="bg-[#071a10]/80 p-4 rounded-xl border border-emerald-800/40">
          {it.tag && <div className="mb-2"><span className={`text-xs font-semibold ${TAG_CLASS[it.tone]}`}>{it.tag}</span></div>}
          <h3 className="font-bold text-white text-sm mb-1">{it.title}</h3>
          {it.highlight && <p className={`text-xs font-medium mb-1.5 ${HIGHLIGHT_CLASS[it.tone]}`}>{it.highlight}</p>}
          <p className="text-xs text-emerald-100/70 leading-relaxed">{it.desc}</p>
        </div>
      ))}
    </div>
  </SectionShell>
);

export const HomeBlocks: React.FC<{ content: HomeContent; routes: HomeRoutes }> = ({ content, routes }) => (
  <>
    {content.blocks.map((block) => {
      switch (block.kind) {
        case 'text':
          return <SectionShell key={block.id} title={block.title}><RichBody body={block.body} /></SectionShell>;
        case 'routes':
          return <RoutesBlock key={block.id} block={block} routes={routes[block.group]} />;
        case 'roadguide':
          return <RoadGuideBlock key={block.id} block={block} />;
        case 'faq':
          if (!content.faq.length) return null;
          return (
            <SectionShell key={block.id} title={block.title}>
              <div className="space-y-4">
                {content.faq.map((item) => (
                  <div key={item.q}>
                    <h3 className="font-bold text-white text-sm md:text-base mb-1">{item.q}</h3>
                    <p><Parts parts={parseInline(item.a)} /></p>
                  </div>
                ))}
              </div>
            </SectionShell>
          );
        default:
          return null;
      }
    })}
  </>
);
