import React from 'react';
import { DynamicIcon } from './DynamicIcon';
import { CardItem, ActiveModalType } from '../types';
import { ExternalLink, ArrowRight, Sparkles } from 'lucide-react';

interface CardsGridProps {
  sectionTitle: string;
  cards: CardItem[];
  onOpenModal: (type: ActiveModalType) => void;
}

export const CardsGrid: React.FC<CardsGridProps> = ({ sectionTitle, cards, onOpenModal }) => {

  const handleCardClick = (card: CardItem, e: React.MouseEvent) => {
    const targetUrl = (card.url || '').trim();
    const title = card.title || '';

    // If it points to one of our interactive tools or hash
    if (targetUrl === '#calc' || title.includes('價格') || title.includes('估算') || title.includes('試算')) {
      e.preventDefault();
      onOpenModal('calc');
      return;
    }
    if (targetUrl === '#hotel' || title.includes('住宿') || title.includes('D0')) {
      e.preventDefault();
      onOpenModal('hotel');
      return;
    }
    if (targetUrl === '#food' || title.includes('慶功') || title.includes('餐廳') || title.includes('美食')) {
      e.preventDefault();
      onOpenModal('food');
      return;
    }
    if (targetUrl === '#road' || title.includes('管制') || title.includes('路況') || title.includes('道路')) {
      e.preventDefault();
      onOpenModal('road');
      return;
    }

    // If it's a valid external URL
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Fallback: if user typed something else or anchor
    if (targetUrl.startsWith('#')) {
      const toolId = targetUrl.replace('#', '');
      if (['calc', 'hotel', 'food', 'road'].includes(toolId)) {
        e.preventDefault();
        onOpenModal(toolId as ActiveModalType);
      }
    }
  };

  return (
    <section className="mb-10">
      {/* 功能板塊區塊標題 */}
      <div className="text-center mb-8">
        <h2 id="section-title" className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
          {sectionTitle}
        </h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1.5">
          點擊下方卡片即可立即開啟高山試算、特色住宿、慶功餐廳與路況指南
        </p>
      </div>

      {/* 板塊網格 (動態渲染) */}
      <div id="cards-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const isExternal = (card.url || '').startsWith('http://') || (card.url || '').startsWith('https://');

          return (
            <div
              key={card.id}
              onClick={(e) => handleCardClick(card, e)}
              className="bg-white p-6 rounded-xl shadow-xs hover:shadow-md border border-gray-100 flex flex-col items-center text-center card-hover group cursor-pointer relative overflow-hidden transition-all duration-200"
            >
              {/* Badge if present */}
              {card.badge && (
                <div className="absolute top-2.5 right-2.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  {card.badge}
                </div>
              )}

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl mb-4 group-hover:bg-emerald-600 group-hover:text-white transition duration-200 shadow-xs">
                <DynamicIcon iconName={card.icon} className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="font-bold text-gray-800 text-base mb-2 group-hover:text-emerald-700 transition">
                {card.title}
              </h3>

              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed flex-grow">
                {card.desc}
              </p>

              {/* Action Hint */}
              <div className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
                <span>立即查看</span>
                {isExternal ? (
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition duration-150" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
