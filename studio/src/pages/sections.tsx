/**
 * Bereichsseiten.
 *
 * Alle nutzen dieselbe Übersicht (`EntryBrowser`) und unterscheiden sich nur
 * durch Titel, Eintragstypen und zusätzliche Filter. Neue Bereiche sind damit
 * eine Frage von wenigen Zeilen.
 */

import { EntryBrowser } from '../components/entry/EntryBrowser';
import type { EntryType } from '../types';

// Als Konstanten außerhalb der Komponenten, damit die Filter nicht bei jedem
// Rendern neu berechnet werden.
const PAGES: EntryType[] = ['page'];
const LOCATIONS: EntryType[] = ['location'];
const CHARACTERS: EntryType[] = ['character'];
const CREATURES: EntryType[] = ['creature'];
const PLANTS: EntryType[] = ['plant'];
const ARCHITECTURE: EntryType[] = ['architecture'];
const ASSETS: EntryType[] = ['asset'];
const PROMPTS: EntryType[] = ['prompt'];
const COLLECTIONS: EntryType[] = ['collection'];

const PROMPT_FIELD_FILTERS = [{ key: 'model', label: 'Modell' }];

export function EssencePage() {
  return (
    <EntryBrowser
      title="Art Essenz"
      description="Grundstimmung, Art Bible, Animationen, Magie, UI und Notizen – alles, was als Seite festgehalten wird."
      types={PAGES}
      emptyHint="Halte fest, was Dragoncore im Kern ausmacht – Leitsätze, Regeln, Stimmungen."
    />
  );
}

export function WorldPage() {
  return (
    <EntryBrowser
      title="Welt & Orte"
      description="Regionen, Bauwerke, Biome und Innenräume."
      types={LOCATIONS}
      emptyHint="Lege den ersten Ort an – etwa eine Landschaft oder ein Bauwerk."
    />
  );
}

export function CharactersPage() {
  return (
    <EntryBrowser
      title="Charaktere"
      description="Figuren mit Rolle, Aussehen, Kleidung, Turnarounds und Animationsnotizen."
      types={CHARACTERS}
      emptyHint="Beginne mit einer Hauptfigur – Rolle, Silhouette und Farbpalette genügen für den Anfang."
    />
  );
}

export function CreaturesPage() {
  return (
    <EntryBrowser
      title="Kreaturen & Tiere"
      description="Wesen mit Art, Lebensraum, Verhalten, Bewegungsarten und verwandten Assets."
      types={CREATURES}
      emptyHint="Lege ein erstes Wesen an – Art, Größe und Bewegung sind der beste Einstieg."
    />
  );
}

export function PlantsPage() {
  return (
    <EntryBrowser
      title="Pflanzen"
      description="Bäume, Sträucher, Moose, Wasserpflanzen und Pilze."
      types={PLANTS}
      emptyHint="Pflanzen prägen die Stimmung einer Welt – beginne mit einer prägenden Art."
    />
  );
}

export function ArchitecturePage() {
  return (
    <EntryBrowser
      title="Architektur"
      description="Bauweisen, Materialien, Details und Innenräume."
      types={ARCHITECTURE}
      emptyHint="Halte den Baustil fest, bevor die ersten Gebäude entstehen."
    />
  );
}

export function AssetsPage() {
  return (
    <EntryBrowser
      title="Assets"
      description="Die visuelle Asset-Datenbank: Objekte, Kleidung, Effekte und Icons mit Asset-ID, Pivot und Prompt."
      types={ASSETS}
      assetFilters
      emptyHint="Lege das erste Asset an – mit Asset-ID, Perspektive und Pivot-Hinweis bleibt später alles auffindbar."
    />
  );
}

export function PromptsPage() {
  return (
    <EntryBrowser
      title="Prompts"
      description="Die Prompt-Bibliothek mit Modell, Seitenverhältnis, Seed, Bewertung und Ergebnisbildern."
      types={PROMPTS}
      fieldFilters={PROMPT_FIELD_FILTERS}
      emptyHint="Sichere deinen Basisstil als ersten Prompt – alle weiteren bauen darauf auf."
    />
  );
}

export function CollectionsPage() {
  return (
    <EntryBrowser
      title="Sammlungen"
      description="Lose Zusammenstellungen: Moodboards, Sequenzen, Lieferungen und Recherchen."
      types={COLLECTIONS}
      emptyHint="Sammlungen bündeln Einträge, die zusammengehören – ohne sie zu verschieben."
    />
  );
}
