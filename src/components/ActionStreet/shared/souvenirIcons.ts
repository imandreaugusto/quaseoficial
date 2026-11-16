import {
  Beef,
  Building,
  CircleAlert,
  Coffee,
  Cpu,
  Flame,
  Package,
  Rocket,
  Signpost,
  Train,
  TrainFront,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';

const SOUVENIR_ICONS: Record<string, LucideIcon> = {
  Beef,
  Building,
  AlertCircle: CircleAlert,
  Coffee,
  Cpu,
  Flame,
  Rocket,
  Signpost,
  Train,
  TrainFront,
  Utensils,
  Wine,
};

export const getSouvenirIcon = (name: string): LucideIcon => SOUVENIR_ICONS[name] ?? Package;
