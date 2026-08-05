/**
 * Icon-Auflösung nach Name.
 *
 * Es werden nur die tatsächlich benutzten Lucide-Icons importiert, damit das
 * Bundle klein bleibt. Unbekannte Namen fallen auf ein neutrales Icon zurück.
 */

import {
  AlignLeft,
  Bird,
  BookMarked,
  Circle,
  Flame,
  Heading,
  Home,
  Image,
  Images,
  Landmark,
  Layers,
  LayoutGrid,
  Leaf,
  Library,
  ListChecks,
  Minus,
  Mountain,
  MoveVertical,
  Package,
  Palette,
  Quote,
  Settings,
  Sparkles,
  StickyNote,
  FileText,
  User,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  AlignLeft,
  Bird,
  BookMarked,
  FileText,
  Flame,
  Heading,
  Home,
  Image,
  Images,
  Landmark,
  Layers,
  LayoutGrid,
  Leaf,
  Library,
  ListChecks,
  Minus,
  Mountain,
  MoveVertical,
  Package,
  Palette,
  Quote,
  Settings,
  Sparkles,
  StickyNote,
  User,
};

export function iconByName(name: string): LucideIcon {
  return ICONS[name] ?? Circle;
}
