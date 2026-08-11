/**
 * Die feste Hauptnavigation.
 *
 * Bewusst kurz gehalten: die Inhaltsarten selbst stehen nicht hier, sondern
 * wachsen unter „Deine Welt“ in der Seitenleiste mit – dort erscheint nur,
 * was es auch wirklich gibt.
 */

import type { NavItem } from '../types';

export const DEFAULT_NAV: NavItem[] = [
  { id: 'home', label: 'Zuhause', icon: 'Home', path: '/', removable: false, hidden: false },
  { id: 'dna', label: 'Welt-DNA', icon: 'Dna', path: '/dna', removable: false, hidden: false },
  { id: 'graph', label: 'Weltgraph', icon: 'Waypoints', path: '/graph', removable: false, hidden: false },
  { id: 'library', label: 'Bibliothek', icon: 'Library', path: '/bibliothek', removable: false, hidden: false },
  { id: 'canvas', label: 'Concept Canvas', icon: 'Brush', path: '/canvas', removable: false, hidden: false },
  { id: 'artbible', label: 'Weltbuch', icon: 'BookOpen', path: '/artbible', removable: false, hidden: false },
  { id: 'pipeline', label: 'Pipeline', icon: 'Workflow', path: '/pipeline', removable: false, hidden: false },
  { id: 'images', label: 'Bilder', icon: 'Images', path: '/bilder', removable: false, hidden: false },
  { id: 'timeline', label: 'Zeitleiste', icon: 'History', path: '/zeitleiste', removable: false, hidden: false },
  { id: 'settings', label: 'Einstellungen', icon: 'Settings', path: '/einstellungen', removable: false, hidden: false },
];
