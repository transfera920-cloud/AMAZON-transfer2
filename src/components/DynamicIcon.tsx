import React from 'react';
import {
  Calculator,
  Hotel,
  Utensils,
  AlertTriangle,
  Link as LinkIcon,
  Phone,
  Mail,
  Car,
  Compass,
  Mountain,
  ShieldCheck,
  Clock,
  Sparkles,
  MapPin,
  HelpCircle
} from 'lucide-react';

interface DynamicIconProps {
  iconName: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ iconName, className = '' }) => {
  const cleanName = (iconName || '').trim();

  // 舊資料可能存的是 FontAwesome 名稱（如 fa-calculator），這裡直接用關鍵字對應到 Lucide 圖示
  const lower = cleanName.toLowerCase();
  if (lower.includes('calc')) return <Calculator className={className} />;
  if (lower.includes('hotel') || lower.includes('bed') || lower.includes('lodg')) return <Hotel className={className} />;
  if (lower.includes('uten') || lower.includes('food') || lower.includes('rest')) return <Utensils className={className} />;
  if (lower.includes('triang') || lower.includes('alert') || lower.includes('road')) return <AlertTriangle className={className} />;
  if (lower.includes('phone')) return <Phone className={className} />;
  if (lower.includes('mail') || lower.includes('envelope')) return <Mail className={className} />;
  if (lower.includes('car')) return <Car className={className} />;
  if (lower.includes('compass')) return <Compass className={className} />;
  if (lower.includes('mountain')) return <Mountain className={className} />;
  if (lower.includes('shield')) return <ShieldCheck className={className} />;
  if (lower.includes('clock') || lower.includes('time')) return <Clock className={className} />;
  if (lower.includes('map')) return <MapPin className={className} />;
  if (lower.includes('sparkle')) return <Sparkles className={className} />;

  return <LinkIcon className={className} />;
};
