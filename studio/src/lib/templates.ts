/**
 * Die Typ-Registry.
 *
 * Ein Eintragstyp ist hier nichts weiter als Daten: Beschriftung, Symbol,
 * Akzentfarbe und eine Liste von Feldern. Deshalb braucht ein neuer Inhaltstyp
 * keine einzige Zeile neuen Code – weder ein Formular noch eine Migration.
 * Selbst angelegte Typen (aus den Einstellungen) mischen sich gleichberechtigt
 * unter die eingebauten.
 */

import type { CustomTypeDef, EntryType, FieldValue } from '../types';

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'select'
  | 'boolean'
  | 'images'
  | 'entries'
  | 'palette';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  options?: string[];
  hint?: string;
  compact?: boolean;
  /**
   * Das Feld gehoert zu diesem Eintrag, wird aber woanders geschrieben.
   *
   * Bisher genau ein Fall: das Manuskript einer Szene. Es steht in den
   * Feldern, damit Suche, Sicherung und Ausgabe es ohne Sonderweg mitnehmen –
   * geschrieben wird es im Schreibraum. Es zusaetzlich als Textkasten ins
   * Formular zu stellen waere ein zweiter Ort fuer dieselbe Sache, und zwei
   * Orte fuer dieselbe Sache sind der Anfang von zwei Wahrheiten.
   */
  anderswo?: boolean;
}

export interface TemplateDef {
  type: EntryType;
  label: string;
  labelPlural: string;
  newTitle: string;
  icon: string;
  /** Farbe im Weltgraphen und in kleinen Kennzeichnungen */
  accent: string;
  /** Gruppe in der Navigation */
  family: 'welt' | 'wesen' | 'natur' | 'bau' | 'produktion' | 'erzaehlung' | 'roman' | 'system';
  categories: string[];
  fields: FieldDef[];
  starterBlocks?: { type: string; data: Record<string, unknown> }[];
  /** Eigene Typen lassen sich bearbeiten und entfernen */
  custom?: boolean;
}

const PALETTE: FieldDef = {
  key: 'palette',
  label: 'Farbpalette',
  kind: 'palette',
  hint: 'Farben antippen zum Bearbeiten',
};

const REFS: FieldDef = { key: 'keyImages', label: 'Referenzbilder', kind: 'images' };

/* --------------------------------------------------------- Eingebaute Typen */

const BUILTIN: TemplateDef[] = [
  /* ---------------------------------------------------------------- Welt */
  {
    type: 'location',
    label: 'Ort',
    labelPlural: 'Orte',
    newTitle: 'Neuer Ort',
    icon: 'Mountain',
    accent: '#55604A',
    family: 'welt',
    categories: ['Region', 'Siedlung', 'Bauwerk', 'Innenraum', 'Landmarke', 'Weg'],
    fields: [
      { key: 'region', label: 'Region', kind: 'text', compact: true },
      { key: 'atmosphere', label: 'Atmosphäre', kind: 'textarea' },
      { key: 'light', label: 'Licht & Tageszeit', kind: 'textarea' },
      { key: 'sound', label: 'Klang', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'biome',
    label: 'Biom',
    labelPlural: 'Biome',
    newTitle: 'Neues Biom',
    icon: 'Trees',
    accent: '#3A422F',
    family: 'welt',
    categories: ['Wald', 'Moor', 'Küste', 'Gebirge', 'Ebene', 'Höhle', 'Wasser'],
    fields: [
      { key: 'climate', label: 'Klima', kind: 'text', compact: true },
      { key: 'ground', label: 'Boden & Bewuchs', kind: 'textarea' },
      { key: 'weather', label: 'Wetter & Jahreszeiten', kind: 'textarea' },
      { key: 'lifeforms', label: 'Typische Lebensformen', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },

  /* --------------------------------------------------------------- Wesen */
  {
    type: 'character',
    label: 'Charakter',
    labelPlural: 'Charaktere',
    newTitle: 'Neuer Charakter',
    icon: 'User',
    accent: '#A8853F',
    family: 'wesen',
    categories: ['Hauptfigur', 'Nebenfigur', 'Begleiter', 'Statist'],
    fields: [
      { key: 'role', label: 'Rolle', kind: 'text', compact: true },
      { key: 'age', label: 'Alter / Altersgruppe', kind: 'text', compact: true },
      /*
       * Die Kopfangaben der Charakterseite.
       *
       * Sie stehen im Referenzbild als fünf Zeilen unter dem Namen – Alter,
       * Herkunft, Volk, Rolle, Zugehörigkeit – und drei davon konnte dieses
       * Buch bisher nicht sagen.
       *
       * `zugehoerigkeit` ist der interessante Fall: Wer einem Orden angehört,
       * hat dafür eigentlich eine Kante (`member_of`), und die ist die bessere
       * Wahrheit – sie verbindet zwei Seiten miteinander, statt einen Namen
       * zweimal zu schreiben. Das Feld ist trotzdem da, weil nicht jede
       * Zugehörigkeit eine eigene Seite verdient („keine feste", „eine alte
       * Schuld"). Die Charakterseite fragt deshalb erst die Kante und erst
       * dann das Feld – siehe `kopfangaben` in `Figurblaetter.tsx`.
       */
      { key: 'herkunft', label: 'Herkunft', kind: 'text', compact: true },
      { key: 'volk', label: 'Volk', kind: 'text', compact: true },
      { key: 'zugehoerigkeit', label: 'Zugehörigkeit', kind: 'text', compact: true },
      /*
       * Wesen und Fähigkeiten als Aufzählungen, nicht als Fließtext.
       *
       * `personality` gibt es schon und bleibt: Das ist der Absatz, in dem
       * jemand *beschreibt*, wie diese Figur ist. Diese beiden sind das
       * andere – die kurzen Merkposten, die im Bild als Listen stehen.
       * Ausdrücklich **keine Werte und keine Balken**: „intuitiv" ist keine
       * Zahl, und wer sie zu einer machte, hätte aus einer Figur ein
       * Charakterblatt gemacht.
       */
      { key: 'wesen', label: 'Wesen', kind: 'tags', hint: 'Kurze Merkposten – intuitiv, loyal, eigensinnig …' },
      { key: 'faehigkeiten', label: 'Besondere Fähigkeiten', kind: 'tags', hint: 'Was sie kann, das andere nicht können.' },
      /*
       * Der charakteristische Buchauftritt.
       *
       * Das Neue am Referenzbild, und die einzige Angabe darin, die nicht
       * beschreibt, *wer* jemand ist, sondern **wie man ihn zum ersten Mal
       * erlebt**. Für ein Weltbuch ist das eine Nebensächlichkeit; für ein
       * Buch, aus dem ein Roman werden soll, ist es die halbe Figur.
       */
      { key: 'buchauftritt', label: 'Charakteristischer Buchauftritt', kind: 'textarea', hint: 'Wie tritt diese Figur zum ersten Mal in Erscheinung?' },
      { key: 'zitat', label: 'Zitat', kind: 'textarea', hint: 'Ein Satz, den nur sie sagen würde.' },
      { key: 'personality', label: 'Persönlichkeit', kind: 'textarea' },
      /* Ein Bewohner ist kein NPC. Diese Felder machen den Unterschied. */
      { key: 'goals', label: 'Ziele', kind: 'textarea', hint: 'Was will diese Figur – heute, und was ihr ganzes Leben lang?' },
      { key: 'wishes', label: 'Wünsche', kind: 'textarea', hint: 'Was wünscht sie sich, ohne es je auszusprechen?' },
      { key: 'fears', label: 'Ängste', kind: 'textarea', hint: 'Wovor hat sie Angst? Weiß sie es selbst?' },
      { key: 'habits', label: 'Gewohnheiten', kind: 'tags', hint: 'Was tut sie jeden Tag, ohne darüber nachzudenken?' },
      { key: 'quirks', label: 'Eigenarten', kind: 'tags', hint: 'Woran erkennt man sie von weitem?' },
      { key: 'routine', label: 'Tagesablauf', kind: 'textarea', hint: 'Wo ist sie im Morgengrauen? Wo bei Einbruch der Nacht?' },
      { key: 'memories', label: 'Erinnerungen', kind: 'textarea', hint: 'An welchen Tag denkt sie am häufigsten zurück?' },
      { key: 'places', label: 'Lieblingsorte', kind: 'tags', hint: 'Wohin geht sie, wenn sie allein sein will?' },
      { key: 'speech', label: 'Sprache', kind: 'textarea', hint: 'Wie klingt sie? Kurze Sätze, lange Pausen?' },
      { key: 'background', label: 'Vergangenheit', kind: 'textarea', hint: 'Was ist geschehen, bevor wir sie treffen?' },
      { key: 'face', label: 'Gesichtsmerkmale', kind: 'textarea' },
      { key: 'hair', label: 'Haare', kind: 'textarea' },
      { key: 'clothing', label: 'Kleidung', kind: 'textarea' },
      PALETTE,
      { key: 'turnaround', label: 'Turnaround-Bilder', kind: 'images' },
      { key: 'expressions', label: 'Ausdrucksbilder', kind: 'images' },
      { key: 'motionRefs', label: 'Bewegungsreferenzen', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
    ],
  },
  {
    type: 'creature',
    label: 'Kreatur',
    labelPlural: 'Kreaturen',
    newTitle: 'Neue Kreatur',
    icon: 'Bird',
    accent: '#8C6D31',
    family: 'wesen',
    categories: ['Kreatur', 'Geistwesen', 'Schwarmwesen', 'Urwesen'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'behaviour', label: 'Verhalten', kind: 'textarea', hint: 'Was tut es, wenn es sich unbeobachtet glaubt?' },
      { key: 'personality', label: 'Wesen', kind: 'textarea' },
      /* Kreaturen stehen im selben Kapitel wie die Tiere – und bekommen
         deshalb dieselben Fragen. Ein Wesen ohne Revier ist Dekoration. */
      { key: 'territory', label: 'Revier', kind: 'textarea', hint: 'Wie weit reicht es, und wer wird geduldet?' },
      { key: 'sleep', label: 'Schlafplatz', kind: 'text', hint: 'Wo verbringt es die Nacht – und mit wem?' },
      { key: 'migration', label: 'Wanderung', kind: 'textarea', hint: 'Zieht es fort? Woher weiß es den Weg?' },
      { key: 'voice', label: 'Stimme', kind: 'textarea', hint: 'Wie klingt es, und was bedeutet welcher Laut?' },
      { key: 'tracks', label: 'Spuren', kind: 'textarea', hint: 'Woran erkennt man, dass es hier war?' },
      PALETTE,
      { key: 'bodyParts', label: 'Körperteile', kind: 'tags', hint: 'z. B. Schleierflossen, Hörner' },
      { key: 'locomotion', label: 'Bewegungsarten', kind: 'tags', hint: 'z. B. schweben, gleiten' },
      { key: 'turnaround', label: 'Turnaround', kind: 'images' },
      { key: 'animationNotes', label: 'Animationsnotizen', kind: 'textarea' },
    ],
  },
  {
    type: 'animal',
    label: 'Tier',
    labelPlural: 'Tiere',
    newTitle: 'Neues Tier',
    icon: 'Rabbit',
    accent: '#7A8467',
    family: 'wesen',
    categories: ['Säugetier', 'Vogel', 'Fisch', 'Insekt', 'Reptil'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'behaviour', label: 'Verhalten', kind: 'textarea', hint: 'Was tut es, wenn es sich unbeobachtet glaubt?' },
      { key: 'diet', label: 'Nahrung', kind: 'text' },
      { key: 'territory', label: 'Revier', kind: 'textarea', hint: 'Wie weit reicht es, und wer wird geduldet?' },
      { key: 'migration', label: 'Wanderung', kind: 'textarea', hint: 'Zieht es fort? Wohin, und woher weiß es den Weg?' },
      { key: 'sleep', label: 'Schlafplatz', kind: 'text', hint: 'Wo verbringt es die Nacht – und mit wem?' },
      { key: 'mating', label: 'Paarung', kind: 'textarea', hint: 'Wie wirbt es? Zu welcher Jahreszeit?' },
      { key: 'voice', label: 'Stimme', kind: 'textarea', hint: 'Wie klingt es – und was bedeutet welcher Laut?' },
      { key: 'tracks', label: 'Spuren', kind: 'textarea', hint: 'Woran erkennt man, dass es hier war?' },
      { key: 'locomotion', label: 'Bewegungsarten', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },

  /* --------------------------------------------------------------- Natur */
  {
    type: 'plant',
    label: 'Pflanze',
    labelPlural: 'Pflanzen',
    newTitle: 'Neue Pflanze',
    icon: 'Leaf',
    accent: '#525B44',
    family: 'natur',
    categories: ['Baum', 'Strauch', 'Blume', 'Moos & Flechte', 'Wasserpflanze', 'Pilz'],
    fields: [
      { key: 'species', label: 'Art', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'season', label: 'Jahreszeit / Zyklus', kind: 'text' },
      { key: 'growth', label: 'Wuchsform', kind: 'textarea' },
      { key: 'magic', label: 'Besondere Eigenschaften', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'material',
    label: 'Material',
    labelPlural: 'Materialien',
    newTitle: 'Neues Material',
    icon: 'Layers',
    accent: '#8C7A62',
    family: 'natur',
    categories: ['Holz', 'Stein', 'Metall', 'Textil', 'Glas', 'Organisch', 'Magisch'],
    fields: [
      { key: 'finish', label: 'Oberfläche', kind: 'text', compact: true, placeholder: 'matt, seidig, rau' },
      { key: 'hardness', label: 'Härte / Verhalten', kind: 'text', compact: true },
      { key: 'appearance', label: 'Aussehen im Licht', kind: 'textarea' },
      { key: 'aging', label: 'Alterung', kind: 'textarea' },
      { key: 'usage', label: 'Typische Verwendung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },

  /* ------------------------------------------------------------ Gebautes */
  {
    type: 'architecture',
    label: 'Architektur',
    labelPlural: 'Architektur',
    newTitle: 'Neues Bauwerk',
    icon: 'Landmark',
    accent: '#6B5B45',
    family: 'bau',
    categories: ['Gebäude', 'Innenraum', 'Detail', 'Ruine', 'Konstruktion', 'Brücke'],
    fields: [
      { key: 'style', label: 'Baustil', kind: 'text', compact: true },
      { key: 'scale', label: 'Maßstab', kind: 'text', compact: true },
      { key: 'construction', label: 'Konstruktion', kind: 'textarea' },
      { key: 'details', label: 'Charakteristische Details', kind: 'textarea' },
      { key: 'interior', label: 'Innenraum', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'prop',
    label: 'Objekt',
    labelPlural: 'Objekte & Props',
    newTitle: 'Neues Objekt',
    icon: 'Package',
    accent: '#9A7C4E',
    family: 'bau',
    categories: ['Werkzeug', 'Behälter', 'Schmuck', 'Waffe', 'Buch', 'Instrument'],
    fields: [
      { key: 'purpose', label: 'Zweck', kind: 'text', compact: true },
      { key: 'size', label: 'Größe', kind: 'text', compact: true },
      { key: 'handling', label: 'Handhabung', kind: 'textarea' },
      { key: 'details', label: 'Details & Gebrauchsspuren', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'furniture',
    label: 'Möbel',
    labelPlural: 'Möbel',
    newTitle: 'Neues Möbelstück',
    icon: 'Armchair',
    accent: '#7E6A4E',
    family: 'bau',
    categories: ['Sitzen', 'Liegen', 'Ablage', 'Aufbewahrung', 'Licht'],
    fields: [
      { key: 'style', label: 'Stil', kind: 'text', compact: true },
      { key: 'size', label: 'Maße', kind: 'text', compact: true },
      { key: 'construction', label: 'Bauweise', kind: 'textarea' },
      { key: 'wear', label: 'Abnutzung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'clothing',
    label: 'Kleidung',
    labelPlural: 'Kleidung',
    newTitle: 'Neues Kleidungsstück',
    icon: 'Shirt',
    accent: '#8A7357',
    family: 'bau',
    categories: ['Oberteil', 'Mantel', 'Kopfbedeckung', 'Schuhwerk', 'Accessoire'],
    fields: [
      { key: 'fabric', label: 'Stoff', kind: 'text', compact: true },
      { key: 'cut', label: 'Schnitt', kind: 'textarea' },
      { key: 'movement', label: 'Verhalten in Bewegung', kind: 'textarea' },
      PALETTE,
      REFS,
    ],
  },

  /* ---------------------------------------------------------- Produktion */
  {
    type: 'asset',
    label: 'Asset',
    labelPlural: 'Assets',
    newTitle: 'Neues Asset',
    icon: 'Box',
    accent: '#B08D57',
    family: 'produktion',
    categories: ['Objekt', 'Kleidung', 'Architektur', 'Pflanze', 'Kreatur', 'Effekt', 'UI', 'Hintergrund'],
    fields: [
      { key: 'assetId', label: 'Asset-ID', kind: 'text', compact: true, hint: 'z. B. OBJ_STERNENBUCHPULT_01' },
      { key: 'subcategory', label: 'Unterkategorie', kind: 'text', compact: true },
      { key: 'perspective', label: 'Perspektive', kind: 'select', options: ['', 'Front', 'Seite', '3/4', 'Iso', 'Top-down', 'Frei'], compact: true },
      { key: 'orientation', label: 'Orientierung', kind: 'select', options: ['', 'hoch', 'quer', 'quadratisch'], compact: true },
      { key: 'pivot', label: 'Pivot-Hinweis', kind: 'text' },
      { key: 'cutout', label: 'Freigestellt', kind: 'boolean', compact: true },
      { key: 'animatable', label: 'Animierbar', kind: 'boolean', compact: true },
      { key: 'fileFormat', label: 'Dateiformat', kind: 'select', options: ['', 'PNG', 'WEBP', 'SVG', 'JPG', 'PSD', 'GLB'], compact: true },
      { key: 'lod', label: 'LOD-Stufen', kind: 'text', compact: true, placeholder: 'z. B. LOD0, LOD1' },
      { key: 'conceptImages', label: 'Konzept', kind: 'images' },
      { key: 'referenceImages', label: 'Referenz', kind: 'images' },
      { key: 'approvedImages', label: 'Freigegebene Fassung', kind: 'images' },
      { key: 'gameImages', label: 'Spielfassung', kind: 'images' },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'exportNote', label: 'Export-Hinweis', kind: 'textarea' },
    ],
  },
  {
    type: 'prompt',
    label: 'Prompt',
    labelPlural: 'Prompts',
    newTitle: 'Neuer Prompt',
    icon: 'Sparkles',
    accent: '#C0A468',
    family: 'produktion',
    categories: ['Basisstil', 'Charakter', 'Kreatur', 'Umgebung', 'Objekt', 'Effekt', 'UI'],
    fields: [
      { key: 'model', label: 'Modell', kind: 'text', compact: true, placeholder: 'z. B. Midjourney v6' },
      { key: 'prompt', label: 'Prompt', kind: 'textarea' },
      { key: 'negativePrompt', label: 'Negativer Prompt', kind: 'textarea' },
      { key: 'aspectRatio', label: 'Seitenverhältnis', kind: 'text', compact: true },
      { key: 'resolution', label: 'Auflösung', kind: 'text', compact: true },
      { key: 'seed', label: 'Seed', kind: 'text', compact: true },
      { key: 'rating', label: 'Bewertung', kind: 'select', options: ['', '★', '★★', '★★★', '★★★★', '★★★★★'], compact: true },
      { key: 'isTemplate', label: 'Als Vorlage markiert', kind: 'boolean', compact: true },
      { key: 'referenceImages', label: 'Referenzbilder', kind: 'images' },
      { key: 'resultImages', label: 'Ergebnisbilder', kind: 'images' },
      { key: 'notes', label: 'Notizen', kind: 'textarea' },
    ],
  },
  {
    type: 'concept',
    label: 'Concept Art',
    labelPlural: 'Concept Art',
    newTitle: 'Neues Konzept',
    icon: 'Brush',
    accent: '#A0785A',
    family: 'produktion',
    categories: ['Umgebung', 'Figur', 'Objekt', 'Stimmung', 'Komposition'],
    fields: [
      { key: 'intent', label: 'Was soll es zeigen?', kind: 'textarea' },
      { key: 'stage', label: 'Reifegrad', kind: 'select', options: ['', 'Skizze', 'Ausarbeitung', 'Final'], compact: true },
      { key: 'sketches', label: 'Skizzen', kind: 'images' },
      { key: 'finals', label: 'Ausgearbeitet', kind: 'images' },
      PALETTE,
    ],
  },
  {
    type: 'animation',
    label: 'Animation',
    labelPlural: 'Animationen',
    newTitle: 'Neue Animation',
    icon: 'Film',
    accent: '#6E7B6B',
    family: 'produktion',
    categories: ['Zyklus', 'Übergang', 'Effekt', 'Kamera', 'Idle'],
    fields: [
      { key: 'loop', label: 'Endlos', kind: 'boolean', compact: true },
      { key: 'duration', label: 'Dauer', kind: 'text', compact: true, placeholder: 'z. B. 2,4 s' },
      { key: 'easing', label: 'Bewegungsverlauf', kind: 'text', compact: true },
      { key: 'principle', label: 'Bewegungsgedanke', kind: 'textarea', hint: 'Woher kommt die Bewegung, wohin geht sie?' },
      { key: 'frames', label: 'Einzelbilder', kind: 'images' },
    ],
  },
  {
    type: 'ui',
    label: 'UI-Element',
    labelPlural: 'UI & Icons',
    newTitle: 'Neues UI-Element',
    icon: 'MousePointer',
    accent: '#5E6B7A',
    family: 'produktion',
    categories: ['Icon', 'Rahmen', 'Knopf', 'Cursor', 'Anzeige'],
    fields: [
      { key: 'purpose', label: 'Aufgabe', kind: 'text', compact: true },
      { key: 'sizes', label: 'Größen', kind: 'text', compact: true },
      { key: 'states', label: 'Zustände', kind: 'tags', hint: 'ruhend, aktiv, gesperrt' },
      { key: 'shapes', label: 'Formensprache', kind: 'textarea' },
      REFS,
    ],
  },

  /* ---------------------------------------------------------- Erzählung */
  {
    type: 'lore',
    label: 'Lore',
    labelPlural: 'Lore',
    newTitle: 'Neuer Lore-Eintrag',
    icon: 'ScrollText',
    accent: '#7C6A57',
    family: 'erzaehlung',
    categories: ['Legende', 'Mythos', 'Märchen', 'Gerücht', 'Lied', 'Brauch', 'Ritual', 'Zeitalter'],
    fields: [
      { key: 'era', label: 'Zeit', kind: 'text', compact: true },
      { key: 'teller', label: 'Wer erzählt es', kind: 'text', compact: true, hint: 'Großmütter? Betrunkene? Kinder beim Spiel?' },
      { key: 'summary', label: 'Kurzfassung', kind: 'textarea', hint: 'Wie erzählt man sie in drei Sätzen am Feuer?' },
      { key: 'variants', label: 'Andere Fassungen', kind: 'textarea', hint: 'Wie klingt sie zwei Täler weiter?' },
      { key: 'ritual', label: 'Brauch', kind: 'textarea', hint: 'Was tut man deswegen bis heute – auch ohne zu wissen, warum?' },
      { key: 'truth', label: 'Was wirklich geschah', kind: 'textarea', hint: 'Darf von der Erzählung abweichen. Muss es sogar.' },
      REFS,
    ],
  },
  {
    type: 'quest',
    label: 'Quest',
    labelPlural: 'Quests',
    newTitle: 'Neue Quest',
    icon: 'Flag',
    accent: '#8B6A4F',
    family: 'erzaehlung',
    categories: ['Haupt', 'Neben', 'Entdeckung', 'Begegnung'],
    fields: [
      { key: 'hook', label: 'Aufhänger', kind: 'textarea' },
      { key: 'steps', label: 'Stationen', kind: 'tags' },
      { key: 'reward', label: 'Was bleibt danach?', kind: 'textarea' },
      { key: 'mood', label: 'Stimmung', kind: 'text', compact: true },
    ],
  },
  {
    type: 'magic',
    label: 'Magie',
    labelPlural: 'Magie & Effekte',
    newTitle: 'Neue Magie',
    icon: 'Wand',
    accent: '#9C86B0',
    family: 'erzaehlung',
    categories: ['Kraft', 'Ritual', 'Erscheinung', 'Fluch', 'Segen'],
    fields: [
      { key: 'source', label: 'Ursprung', kind: 'textarea', hint: 'Woher kommt diese Kraft? Wer hat sie zuerst bemerkt?' },
      { key: 'cost', label: 'Preis', kind: 'textarea', hint: 'Was kostet sie? Magie ohne Preis wirkt beliebig.' },
      { key: 'limit', label: 'Grenzen', kind: 'textarea', hint: 'Was kann sie ausdrücklich nicht?' },
      { key: 'effect', label: 'Wirkung auf die Welt', kind: 'textarea', hint: 'Was hat sich verändert, seit es sie gibt?' },
      { key: 'appearance', label: 'Erscheinung', kind: 'textarea', hint: 'Wie sieht man sie?' },
      { key: 'sound', label: 'Klang', kind: 'text', hint: 'Wie klingt sie?' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'music',
    label: 'Musik',
    labelPlural: 'Musik & Klang',
    newTitle: 'Neues Klangstück',
    icon: 'Music',
    accent: '#6F7E8C',
    family: 'erzaehlung',
    categories: ['Thema', 'Umgebung', 'Übergang', 'Instrument', 'Geräusch'],
    fields: [
      { key: 'instruments', label: 'Instrumente', kind: 'tags' },
      { key: 'tempo', label: 'Tempo & Takt', kind: 'text', compact: true },
      { key: 'mood', label: 'Stimmung', kind: 'text', compact: true },
      { key: 'description', label: 'Wie klingt es?', kind: 'textarea' },
    ],
  },

  /* ------------------------------------------------------- Weltsysteme */
  /*
   * Diese Vorlagen beschreiben nicht, was etwas *ist*, sondern wie es sich
   * anfühlt. Die Beschriftungen bleiben kurz – sie werden im Buch als Rubrik
   * gesetzt. Die Frage steht im `hint`: Sie erscheint beim Schreiben und ist
   * das eigentliche Werkzeug. Nicht „Feld ausfüllen“, sondern „darüber
   * nachdenken“.
   */
  {
    type: 'moment',
    label: 'Moment',
    labelPlural: 'Momente',
    newTitle: 'Ein neuer Moment',
    icon: 'Sunrise',
    accent: '#C0A468',
    family: 'welt',
    categories: ['Morgengrauen', 'Mittag', 'Abend', 'Dämmerung', 'Nacht', 'Sturm', 'Stille'],
    fields: [
      {
        key: 'timeOfDay',
        label: 'Stunde',
        kind: 'select',
        compact: true,
        options: ['', 'Morgengrauen', 'Sonnenaufgang', 'Vormittag', 'Mittag', 'Nachmittag', 'Abend', 'Dämmerung', 'Nacht'],
      },
      {
        key: 'season',
        label: 'Jahreszeit',
        kind: 'select',
        compact: true,
        options: ['', 'Frühling', 'Sommer', 'Herbst', 'Winter', 'Zwischenzeit'],
      },
      { key: 'light', label: 'Licht', kind: 'textarea', hint: 'Welche Farbe hat das Licht zu dieser Stunde – und wohin fallen die Schatten?' },
      { key: 'sound', label: 'Klang', kind: 'textarea', hint: 'Welche Geräusche hört man hier? Und welche fehlen auffällig?' },
      { key: 'smell', label: 'Geruch', kind: 'textarea', hint: 'Wie riecht es hier nach dem Regen?' },
      { key: 'weather', label: 'Wetter', kind: 'textarea', hint: 'Woher kommt der Nebel? Wann bricht der Regen ab?' },
      { key: 'air', label: 'Luft', kind: 'text', hint: 'Temperatur, Wind, Feuchte – was spürt die Haut zuerst?' },
      { key: 'water', label: 'Wasser', kind: 'textarea', hint: 'Wohin fließt es, und was nimmt es mit?' },
      { key: 'change', label: 'Wandel', kind: 'textarea', hint: 'Wie sieht dieser Ort im Winter aus? Und wer bemerkt den Unterschied?' },
      { key: 'feeling', label: 'Gefühl', kind: 'textarea', hint: 'Was fühlt man hier – nicht, was sieht man?' },
      PALETTE,
      REFS,
    ],
  },
  /*
   * Die Epoche.
   *
   * Nicht jede Welt zaehlt in Jahren. „Zeitalter der Ersten Flamme" ist eine
   * Zeitangabe wie „1032", nur eine, die man sich merken kann.
   *
   * Bewusst ein ganz normaler Eintragstyp und kein eigener Datenbestand: Eine
   * Epoche hat einen Titel, eine Beschreibung, Bilder, Beziehungen und –
   * entscheidend – dieselben Felder `beginn` und `ende` wie jeder andere
   * Eintrag. Damit liegt sie automatisch auf dem Zeitstrahl, taucht in der
   * Suche auf, laesst sich verknuepfen und wird mitgesichert. Ein eigener
   * Speicher haette all das noch einmal gebraucht.
   */
  {
    type: 'epoche',
    label: 'Epoche',
    labelPlural: 'Epochen',
    newTitle: 'Ein neues Zeitalter',
    icon: 'Hourglass',
    accent: '#8C6510',
    family: 'welt',
    categories: ['Zeitalter', 'Ära', 'Dynastie', 'Krieg', 'Zwischenzeit', 'Gegenwart'],
    fields: [
      {
        key: 'kennzeichen',
        label: 'Woran man sie erkennt',
        kind: 'textarea',
        hint: 'Was war in dieser Zeit anders als davor – und woran hätte es ein Reisender gemerkt?',
      },
      {
        key: 'wende',
        label: 'Was sie beendet hat',
        kind: 'textarea',
        hint: 'Zeitalter enden selten leise. Was war der Bruch?',
      },
      {
        key: 'quellen',
        label: 'Was überliefert ist',
        kind: 'textarea',
        hint: 'Wer hat davon berichtet – und wie zuverlässig ist das?',
      },
      REFS,
    ],
  },
  {
    type: 'cycle',
    label: 'Kreislauf',
    labelPlural: 'Kreisläufe',
    newTitle: 'Ein neuer Kreislauf',
    icon: 'Sprout',
    accent: '#4E6B3E',
    family: 'natur',
    categories: ['Wachstum', 'Reife', 'Alterung', 'Verfall', 'Wiedergeburt', 'Wanderung'],
    fields: [
      { key: 'span', label: 'Dauer', kind: 'text', compact: true, hint: 'Ein Tag, ein Jahr, ein Zeitalter?' },
      { key: 'trigger', label: 'Auslöser', kind: 'textarea', hint: 'Was setzt diesen Kreislauf in Gang?' },
      { key: 'growth', label: 'Werden', kind: 'textarea', hint: 'Woraus entsteht es, und wie lange braucht es?' },
      { key: 'decay', label: 'Vergehen', kind: 'textarea', hint: 'Was bleibt zurück, wenn es vergeht?' },
      { key: 'rebirth', label: 'Wiederkehr', kind: 'textarea', hint: 'Kehrt es zurück – und als dasselbe?' },
      { key: 'habitat', label: 'Lebensraum', kind: 'text' },
      { key: 'chain', label: 'Nahrungskette', kind: 'tags', hint: 'Wer frisst wen? Und was geschieht, wenn ein Glied fehlt?' },
      { key: 'symbiosis', label: 'Symbiosen', kind: 'tags', hint: 'Wer braucht wen, ohne es zu wissen?' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'voice',
    label: 'Stimme',
    labelPlural: 'Stimmen',
    newTitle: 'Eine neue Stimme',
    icon: 'MessagesSquare',
    accent: '#8B6A4F',
    family: 'erzaehlung',
    categories: ['Begrüßung', 'Abschied', 'Streit', 'Freude', 'Trauer', 'Geheimnis', 'Schweigen'],
    fields: [
      { key: 'speaker', label: 'Wer spricht', kind: 'text', compact: true },
      { key: 'listener', label: 'Zu wem', kind: 'text', compact: true },
      { key: 'occasion', label: 'Anlass', kind: 'text', compact: true, hint: 'Was ist gerade geschehen?' },
      { key: 'manner', label: 'Redestil', kind: 'textarea', hint: 'Woran erkennt man diese Stimme mit geschlossenen Augen?' },
      { key: 'dialect', label: 'Dialekt', kind: 'text', hint: 'Welche Wörter benutzt nur sie?' },
      { key: 'scene', label: 'Die Szene', kind: 'textarea', hint: 'Schreib sie wie ein kleines Theaterstück – zwei, drei Repliken genügen.' },
      { key: 'unsaid', label: 'Ungesagt', kind: 'textarea', hint: 'Was verschweigt diese Figur gerade? Und warum?' },
      REFS,
    ],
  },
  {
    type: 'artifact',
    label: 'Artefakt',
    labelPlural: 'Artefakte',
    newTitle: 'Ein neues Artefakt',
    icon: 'Gem',
    accent: '#B08D57',
    family: 'bau',
    categories: ['Fund', 'Erbstück', 'Reliquie', 'Werkzeug', 'Waffe', 'Schmuck', 'Schriftstück'],
    fields: [
      { key: 'age', label: 'Alter', kind: 'text', compact: true },
      { key: 'origin', label: 'Herkunft', kind: 'text', compact: true },
      { key: 'maker', label: 'Hergestellt von', kind: 'text', compact: true, hint: 'Von Hand, von vielen Händen, von niemandem?' },
      { key: 'making', label: 'Herstellung', kind: 'textarea', hint: 'Wie wurde es gemacht – und ließe es sich heute noch machen?' },
      { key: 'foundAt', label: 'Fundort', kind: 'text', hint: 'Wo lag es, und wie lange schon?' },
      { key: 'owner', label: 'Besitzer', kind: 'text', hint: 'Wer trug es zuletzt? Freiwillig?' },
      { key: 'story', label: 'Geschichte', kind: 'textarea', hint: 'Was hat dieser Gegenstand gesehen?' },
      { key: 'symbolism', label: 'Symbolik', kind: 'textarea', hint: 'Wofür steht er – auch ohne Worte?' },
      { key: 'marks', label: 'Spuren', kind: 'textarea', hint: 'Welche Kerbe erzählt welche Nacht?' },
      PALETTE,
      REFS,
    ],
  },
  {
    type: 'law',
    label: 'Naturgesetz',
    labelPlural: 'Naturgesetze',
    newTitle: 'Ein neues Gesetz',
    icon: 'Scale',
    accent: '#8E7BA6',
    family: 'system',
    categories: ['Zeit', 'Leben & Tod', 'Magie', 'Materie', 'Raum', 'Seele', 'Sprache'],
    fields: [
      { key: 'rule', label: 'Das Gesetz', kind: 'textarea', hint: 'Ein Satz, der immer gilt – ohne Ausnahme.' },
      { key: 'because', label: 'Warum', kind: 'textarea', hint: 'Warum ist es so? Muss es das überhaupt?' },
      { key: 'limit', label: 'Grenze', kind: 'textarea', hint: 'Was ist in dieser Welt unmöglich?' },
      { key: 'cost', label: 'Preis', kind: 'textarea', hint: 'Was kostet es, dieses Gesetz zu beugen?' },
      { key: 'consequence', label: 'Folgen', kind: 'textarea', hint: 'Was geschieht, wenn es doch gebrochen wird?' },
      { key: 'known', label: 'Wer weiß davon', kind: 'text', hint: 'Alle? Wenige? Niemand mehr?' },
      REFS,
    ],
  },

  /* -------------------------------------------------------------- System */
  {
    type: 'dna',
    label: 'DNA-Regel',
    labelPlural: 'Welt-DNA',
    newTitle: 'Neue Regel',
    icon: 'Dna',
    accent: '#A8853F',
    family: 'system',
    categories: [
      'Gefühl',
      'Werte',
      'Formensprache',
      'Material',
      'Licht',
      'Animation',
      'Kreaturen',
      'Architektur',
      'Pflanzen',
      'Klang',
      'UI',
    ],
    fields: [
      { key: 'rule', label: 'Die Regel', kind: 'textarea', hint: 'Ein Satz, an dem sich alles messen lässt' },
      { key: 'because', label: 'Warum?', kind: 'textarea' },
      { key: 'doThis', label: 'So ja', kind: 'tags' },
      { key: 'notThis', label: 'So nicht', kind: 'tags' },
      PALETTE,
      REFS,
    ],
  },
  /* -------------------------------------------------------------- Roman */
  /*
   * Roman, Kapitel und Szene sind gewoehnliche Eintraege.
   *
   * Das ist die wichtigste Entscheidung am ganzen Romanverfasser. Sie
   * bedeutet: Die Suche findet Szenen, der Weltgraph kennt sie, der
   * Zeitstrahl datiert sie, die Sicherung nimmt sie mit, der Papierkorb
   * holt sie zurueck, frueherer Fassungen gibt es umsonst. Nichts davon
   * musste gebaut werden – es gilt fuer Eintraege, und eine Szene ist einer.
   *
   * Die Struktur des Romans steht nicht in Feldern, sondern in Beziehungen:
   * Roman --enthaelt--> Kapitel --enthaelt--> Szene. Damit ist ein Kapitel
   * kein Sonderfall, sondern ein Knoten wie jeder andere, und eine Szene
   * darf ganz nebenbei auch noch an einem Ort spielen.
   */
  {
    type: 'roman',
    label: 'Roman',
    labelPlural: 'Romane',
    newTitle: 'Neuer Roman',
    icon: 'BookMarked',
    accent: '#6B5B45',
    family: 'roman',
    categories: ['Roman', 'Novelle', 'Erzählung', 'Kurzgeschichte', 'Zyklus'],
    fields: [
      { key: 'genre', label: 'Genre', kind: 'text', compact: true },
      { key: 'logline', label: 'Worum geht es?', kind: 'textarea', hint: 'In zwei Sätzen – als würdest du es jemandem im Zug erzählen.' },
      { key: 'zielWoerter', label: 'Zielumfang in Wörtern', kind: 'text', compact: true, placeholder: '90000' },
      { key: 'notes', label: 'Notizen', kind: 'textarea' },
    ],
  },
  {
    type: 'kapitel',
    label: 'Kapitel',
    labelPlural: 'Kapitel',
    newTitle: 'Neues Kapitel',
    icon: 'Bookmark',
    accent: '#7C6A57',
    family: 'roman',
    categories: ['Kapitel', 'Teil', 'Prolog', 'Epilog', 'Zwischenspiel'],
    fields: [
      { key: 'summary', label: 'Worum geht es hier?', kind: 'textarea', hint: 'Für dich, nicht für den Leser.' },
    ],
  },
  {
    type: 'szene',
    label: 'Szene',
    labelPlural: 'Szenen',
    newTitle: 'Neue Szene',
    icon: 'PenLine',
    accent: '#8B6A4F',
    family: 'roman',
    categories: ['Szene', 'Rückblende', 'Traum', 'Brief', 'Zwischenspiel'],
    fields: [
      { key: 'manuskript', label: 'Manuskript', kind: 'textarea', anderswo: true },
      { key: 'summary', label: 'Was geschieht hier?', kind: 'textarea', hint: 'Eine Zeile genügt.' },
      { key: 'faeden', label: 'Handlungsfäden', kind: 'tags', hint: 'Haupthandlung, Nordreich, Sternenschlüssel …' },
    ],
  },

  {
    type: 'page',
    label: 'Seite',
    labelPlural: 'Seiten',
    newTitle: 'Neue Seite',
    icon: 'FileText',
    accent: '#7C6A57',
    family: 'system',
    categories: ['Notiz', 'Recherche', 'Plan', 'Protokoll'],
    fields: [],
    starterBlocks: [{ type: 'text', data: { text: '' } }],
  },
  {
    type: 'collection',
    label: 'Sammlung',
    labelPlural: 'Sammlungen',
    newTitle: 'Neue Sammlung',
    icon: 'Library',
    accent: '#8A8070',
    family: 'system',
    categories: ['Moodboard', 'Sequenz', 'Lieferung', 'Recherche'],
    fields: [
      { key: 'purpose', label: 'Zweck', kind: 'text', compact: true },
      { key: 'keyImages', label: 'Bilder', kind: 'images' },
    ],
  },
];

/* ------------------------------------------------------------ Registry ------ */

let registry: Map<string, TemplateDef> = new Map(BUILTIN.map((t) => [t.type, t]));

/** Selbst angelegte Typen einspielen (beim Start und nach jeder Änderung). */
export function setCustomTypes(defs: CustomTypeDef[]): void {
  const next = new Map(BUILTIN.map((t) => [t.type, t]));
  for (const def of defs) {
    next.set(def.type, {
      type: def.type,
      label: def.label,
      labelPlural: def.labelPlural,
      newTitle: def.newTitle,
      icon: def.icon,
      accent: def.accent,
      family: 'system',
      categories: def.categories,
      fields: def.fields.map((f) => ({
        key: f.key,
        label: f.label,
        kind: (f.kind as FieldKind) ?? 'text',
        hint: f.hint,
      })),
      custom: true,
    });
  }
  registry = next;
}

export const BUILTIN_TYPES = BUILTIN;

export function allTemplates(): TemplateDef[] {
  return [...registry.values()];
}

/**
 * Vorlage zu einem Typ. Unbekannte Typen (etwa aus einem Import) bekommen eine
 * brauchbare Ersatzvorlage, statt die App scheitern zu lassen.
 */
export function templateFor(type: EntryType): TemplateDef {
  const found = registry.get(type);
  if (found) return found;
  return {
    type,
    label: type,
    labelPlural: type,
    newTitle: `Neu: ${type}`,
    icon: 'Circle',
    accent: '#8A8070',
    family: 'system',
    categories: [],
    fields: [],
  };
}

export const FAMILY_LABELS: Record<TemplateDef['family'], string> = {
  welt: 'Welt',
  wesen: 'Wesen',
  natur: 'Natur',
  bau: 'Gebautes',
  produktion: 'Produktion',
  erzaehlung: 'Erzählung',
  roman: 'Roman',
  system: 'Werkzeuge',
};

export function templatesByFamily(): { family: TemplateDef['family']; label: string; items: TemplateDef[] }[] {
  const order: TemplateDef['family'][] = ['welt', 'wesen', 'natur', 'bau', 'produktion', 'erzaehlung', 'roman', 'system'];
  return order
    .map((family) => ({
      family,
      label: FAMILY_LABELS[family],
      items: allTemplates().filter((t) => t.family === family),
    }))
    .filter((g) => g.items.length > 0);
}

/* ------------------------------------------------------------- Feldzugriff */

export function emptyFields(type: EntryType): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of templateFor(type).fields) {
    if (f.kind === 'boolean') out[f.key] = false;
    else if (f.kind === 'tags' || f.kind === 'images' || f.kind === 'entries' || f.kind === 'palette')
      out[f.key] = [];
    else out[f.key] = '';
  }
  return out;
}

export function asText(v: FieldValue | undefined): string {
  return typeof v === 'string' ? v : '';
}
export function asList(v: FieldValue | undefined): string[] {
  return Array.isArray(v) ? v : [];
}
export function asBool(v: FieldValue | undefined): boolean {
  return v === true;
}

/** Farbe eines Eintragstyps – überall dort, wo Herkunft sichtbar werden soll. */
export function accentOf(type: EntryType): string {
  return templateFor(type).accent;
}
