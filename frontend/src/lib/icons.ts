import {
  Sparkles, Utensils, CookingPot, ShowerHead, Shirt, ChefHat,
  Brush, WashingMachine, Wind, type LucideIcon,
} from "lucide-react";

// Maps a service's `icon_name` (stored in the DB) to a Lucide icon component.
export const SERVICE_ICONS: Record<string, LucideIcon> = {
  Sparkles, Utensils, CookingPot, ShowerHead, Shirt, ChefHat,
  Brush, WashingMachine, Wind,
};

export function serviceIcon(name?: string | null): LucideIcon {
  return (name && SERVICE_ICONS[name]) || Sparkles;
}
