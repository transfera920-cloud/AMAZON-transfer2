import React from 'react';
import { DynamicIcon } from './DynamicIcon';
import { CardItem, ActiveModalType } from '../types';

interface CardsGridProps {
  sectionTitle: string;
  cards: CardItem[];
  onOpenModal: (type: ActiveModalType) => void;
}

export const CardsGrid: React.FC<CardsGridProps> = ({ sectionTitle, cards, onOpenModal }) => {

  const handleCardClick = (card: CardItem, e: React.MouseEvent) => {
    const rawUrl = (card.url || '').trim();

    // 1. Check if explicitly set to one of the built-in modal triggers
    if (rawUrl === '#calc') {
      e.preventDefault();
      onOpenModal('calc');
      return;
    }
    if (rawUrl === '#hotel') {
      e.preventDefault();
      onOpenModal('hotel');
      return;
    }
    if (rawUrl === '#food') {
      e.preventDefault();
      onOpenModal('food');
      return;
    }
    if (rawUrl === '#road') {
      e.preventDefault();
      onOpenModal('road');
      return;
    }

    // 2. Direct phone call or email links
    if (rawUrl.startsWith('tel:') || rawUrl.startsWith('mailto:')) {
      window.location.href = rawUrl;
      return;
    }

    // 3. Full external HTTP / HTTPS link
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      e.preventDefault();
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 4. Relative paths or custom schemes (like line://)
    if (rawUrl.startsWith('/') || rawUrl.startsWith('line://')) {
      e.preventDefault();
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // 5. User entered plain domain without protocol (e.g., "forms.gle/..." or "www.example.com")
    if (rawUrl.includes('.') && !rawUrl.startsWith('#')) {
      e.preventDefault();
      window.open(`https://${rawUrl}`, '_blank', 'noopener,noreferrer');
      return;
    }

    // 6. Generic Hash modal fallback
    if (rawUrl.startsWith('#')) {
      const toolId = rawUrl.replace('#', '');
      if (['calc', 'hotel', 'food', 'road'].includes(toolId)) {
        e.preventDefault();
        onOpenModal(toolId as ActiveModalType);
        return;
      }
    }

    // 7. Fallback ONLY if url is empty: map by default title
    if (!rawUrl) {
      const title = card.title || '';
      if (title.includes('價格') || title.includes('估算') || title.includes('試算')) {
        onOpenModal('calc');
      } else if (title.includes('住宿') || title.includes('D0')) {
        onOpenModal('hotel');
      } else if (title.includes('慶功') || title.includes('餐廳') || title.includes('美食')) {
        onOpenModal('food');
      } else if (title.includes('管制') || title.includes('路況') || title.includes('道路')) {
        onOpenModal('road');
      }
    }
  };

  return (
    <section className="mb-12">
      {/* 功能板塊區塊標題 */}
      <div className="text-center mb-9">
        <h2 id="section-title" className="text-2xl md:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
          {sectionTitle}
        </h2>
        <div className="w-12 h-1 bg-gradient-to-r from-emerald-500 to-[#00c853] mx-auto mt-3 rounded-full shadow-[0_0_8px_rgba(0,200,83,0.5)]"></div>
      </div>

      {/* 板塊網格 (動態渲染) */}
      <div id="cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const rawUrl = (card.url || '').trim();
          const isExternal = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || (rawUrl.includes('.') && !rawUrl.startsWith('#'));

          return (
            <div
              key={card.id}
              onClick={(e) => handleCardClick(card, e)}
              className="bg-[#0e2318]/85 hover:bg-[#122e20] p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_35px_rgba(0,200,83,0.2)] border border-emerald-900/60 hover:border-emerald-500/60 flex flex-col items-center text-center card-hover group cursor-pointer relative overflow-hidden transition-all duration-300 backdrop-blur-md"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick(card, e as unknown as React.MouseEvent);
                }
              }}
              title={isExternal ? `開啟連結：${rawUrl}` : card.title}
            >
              {/* Ambient glow in card corner */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-400/25 transition duration-300 pointer-events-none"></div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0a2718] to-[#06190f] text-[#00e676] border border-emerald-700/50 flex items-center justify-center text-2xl mb-4 group-hover:from-[#00c853] group-hover:to-[#00963e] group-hover:text-white group-hover:shadow-[0_0_20px_rgba(0,200,83,0.45)] transition-all duration-300 shadow-sm">
                <DynamicIcon iconName={card.icon} className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="font-bold text-white text-base mb-2 group-hover:text-[#00e676] transition-colors duration-200">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-emerald-100/70 group-hover:text-emerald-100/90 leading-relaxed flex-grow transition-colors">
                {card.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

