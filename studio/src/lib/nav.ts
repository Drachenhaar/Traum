/** Standard-Navigation. Sie ist in den Einstellungen umsortier- und ausblendbar. */

import type { NavItem } from '../types';

export const DEFAULT_NAV: NavItem[] = [
  { id: 'home', label: 'Zuhause', icon: 'Home', path: '/', removable: false, hidden: false },
  { id: 'essence', label: 'Art Essenz', icon: 'Flame', path: '/essenz', removable: false, hidden: false },
  { id: 'world', label: 'Welt', icon: 'Mountain', path: '/welt', removable: false, hidden: false },
  { id: 'characters', label: 'Charaktere', icon: 'User', path: '/charaktere', removable: false, hidden: false },
  { id: 'creatures', label: 'Kreaturen', icon: 'Bird', path: '/kreaturen', removable: false, hidden: false },
  { id: 'plants', label: 'Pflanzen', icon: 'Leaf', path: '/pflanzen', removable: false, hidden: false },
  { id: 'architecture', label: 'Architektur', icon: 'Landmark', path: '/architektur', removable: false, hidden: false },
  { id: 'assets', label: 'Assets', icon: 'Package', path: '/assets', removable: false, hidden: false },
  { id: 'prompts', label: 'Prompts', icon: 'Sparkles', path: '/prompts', removable: false, hidden: false },
  { id: 'collections', label: 'Sammlungen', icon: 'Library', path: '/sammlungen', removable: false, hidden: false },
  { id: 'images', label: 'Bilder', icon: 'Images', path: '/bilder', removable: false, hidden: false },
  { id: 'settings', label: 'Einstellungen', icon: 'Settings', path: '/einstellungen', removable: false, hidden: false },
];
