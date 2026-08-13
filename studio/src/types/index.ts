/**
 * Zentrale Datentypen von Dragoncore Studio.
 *
 * Leitgedanke: Alles ist ein Eintrag (`Entry`). Was ein Eintrag *ist*, sagt sein
 * `type` – und Typen sind Daten, keine Klassen. Deshalb ist `EntryType` ein
 * String: neue Inhaltsarten entstehen ohne eine Zeile neuen Code.
 *
 * Der zweite Grundpfeiler sind `Relation`s. Eine Beziehung hat eine Bedeutung
 * („lebt in“, „besteht aus“, „stammt von“) und eine Richtung. Aus vielen
 * bedeutungstragenden Kanten entsteht der Weltgraph.
 */

import type { Profil } from '../lib/profil';
import type { Emblem } from '../lib/zeichen/emblem';
import type { Notiz } from '../lib/anerbieten/gedaechtnis';

/** Typ-Kennung eines Eintrags. Eingebaute Typen siehe `lib/types-registry.ts`. */
export type EntryType = string;

export type EntryStatus = 'Idee' | 'In Arbeit' | 'Überarbeitung' | 'Freigegeben' | 'Archiviert';

export const ENTRY_STATUSES: EntryStatus[] = [
  'Idee',
  'In Arbeit',
  'Überarbeitung',
  'Freigegeben',
  'Archiviert',
];

/* ------------------------------------------------------------------ Blöcke */

export type BlockType =
  | 'heading'
  | 'text'
  | 'quote'
  | 'note'
  | 'image'
  | 'gallery'
  | 'moodboard'
  | 'palette'
  | 'materials'
  | 'references'
  | 'checklist'
  | 'prompt'
  | 'assetList'
  | 'divider'
  | 'spacer';

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface PaletteSwatch {
  id: string;
  color: string;
  name: string;
  note: string;
}

export interface MaterialSwatch {
  id: string;
  name: string;
  color: string;
  finish: string;
  note: string;
}

export interface ReferenceCard {
  id: string;
  title: string;
  note: string;
  source: string;
  imageId?: string;
}

export interface MoodboardTile {
  id: string;
  imageId?: string;
  caption: string;
}

export interface BlockData {
  level?: 1 | 2 | 3;
  text?: string;
  source?: string;
  tone?: 'info' | 'warn' | 'idea';
  imageId?: string;
  caption?: string;
  imageIds?: string[];
  tiles?: MoodboardTile[];
  columns?: number;
  swatches?: PaletteSwatch[];
  materials?: MaterialSwatch[];
  cards?: ReferenceCard[];
  items?: ChecklistItem[];
  prompt?: string;
  negativePrompt?: string;
  model?: string;
  entryIds?: string[];
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  collapsed?: boolean;
  data: BlockData;
}

/* ------------------------------------------------------------------ Eintrag */

export type FieldValue = string | string[] | boolean;

export interface Entry {
  id: string;
  /**
   * Zu welchem Buch dieser Eintrag gehört.
   *
   * Optional im Typ, aber nicht in den Daten: Beim Hereinkommen bekommt jeder
   * Eintrag den seinen (siehe `lib/heilung.ts`), und die Datenbankfassung 3
   * hat alle Bestandsdaten gestempelt. Das `?` steht hier nur, damit ältere
   * Sicherungsdateien noch gelesen werden können, ohne dass der Typ lügt.
   */
  bookId?: string;
  title: string;
  subtitle: string;
  type: EntryType;
  category: string;
  description: string;
  tags: string[];
  status: EntryStatus;
  favorite: boolean;
  coverImage?: string;
  createdAt: number;
  updatedAt: number;
  /**
   * Alte, ungerichtete Verknüpfungen. Bleibt für Altdaten und Import erhalten,
   * wird beim Start in echte `Relation`s überführt.
   */
  linkedEntryIds: string[];
  blocks: Block[];
  fields: Record<string, FieldValue>;
  /** Produktionsstufe (nur bei Assets genutzt), siehe `lib/pipeline.ts` */
  pipelineStage?: string;
  /**
   * Was am Tisch nicht gezeigt wird.
   *
   * Der einzige Zusatz, den das Spielen wirklich braucht – und ausdrücklich
   * *ein Feld an der Seite* und keine zweite Art von Seite. Ein
   * „Spielleitereintrag" neben dem Eintrag wäre ein zweites Weltmodell, und
   * damit wäre der Preis für ein Geheimnis eine gespaltene Welt.
   *
   * Zwei Fälle, ein Feld:
   *   `text`       – ein Absatz, den nur die Leitung liest. Der häufige Fall:
   *                  Die Seite ist zeigbar, ein Satz darauf nicht.
   *   `ganzeSeite` – die Seite selbst ist nicht für den Tisch. Der Plan des
   *                  Gegenspielers steht nicht halb offen.
   *
   * Verborgen ist es nur im Tischmodus (`Settings.tischmodus`). Ohne ihn
   * steht es da, deutlich als verborgen gekennzeichnet – wer nicht sieht, was
   * er versteckt hat, versteckt nichts, sondern verliert es.
   */
  geheim?: EntryGeheim;
  /**
   * Weltzeit: wann das hier begann und endete.
   *
   * Bewusst der rohe Text, den der Verfasser geschrieben hat – „1032",
   * „Frühjahr 1044", „12.4.1032" – und keine Zahl, in die wir seine
   * Schreibweise übersetzt haben. Gelesen wird beim Rechnen; siehe
   * `lib/chronik/zeit.ts`. Was sich nicht sicher deuten lässt, bleibt stehen
   * und wird angezeigt, taucht nur nicht auf der Achse auf.
   *
   * Beides darf fehlen. Ein Ort ohne Ende besteht bis heute, eine Figur ohne
   * Anfang war immer schon da – das ist eine Aussage, kein fehlender Wert.
   */
  beginn?: string;
  ende?: string;
  /**
   * Die Atmosphäre dieser Seite.
   *
   * Optional, immer. Ein Buch, das beim Aufschlagen Geräusche macht, die
   * niemand bestellt hat, ist ein Schrecken – deshalb hängt hier nichts, bis
   * jemand etwas einlegt, und selbst dann entscheidet der Verfasser, ob es
   * von selbst beginnt.
   */
  atmosphaere?: EntryAtmosphaere;
  /** Papierkorb: gelöschte Einträge bleiben wiederherstellbar */
  deletedAt?: number;
}

/** Was an einer Seite klingt. Siehe `lib/atmosphaere.ts`. */
export interface EntryAtmosphaere {
  /** Kennung in der Tabelle `klaenge`. Fehlt sie, klingt nichts. */
  klangId: string;
  /** 0 bis 1. Ein Wald ist leiser als eine Glocke. */
  lautstaerke: number;
  /** Läuft der Klang endlos? Für Wind ja, für einen Donner nicht. */
  schleife: boolean;
  /** Wie lange das Ein- und Ausblenden dauert, in Millisekunden. */
  einblenden: number;
  ausblenden: number;
  /**
   * Beginnt er beim Aufschlagen von selbst?
   *
   * Auch dann nur, wenn die Atmosphäre insgesamt eingeschaltet ist – zwei
   * Schalter, und beide müssen zustimmen. Ton, den man nicht bestellt hat,
   * bekommt man in diesem Buch nicht.
   */
  vonSelbst: boolean;
}

/* --------------------------------------------------------------- Beziehungen */

export interface Relation {
  id: string;
  /**
   * Zu welchem Buch diese Verbindung gehört.
   *
   * Ableitbar wäre sie – über `fromId` hinge sie am Eintrag. Sie steht
   * trotzdem hier, weil sonst kein Buch seine Kanten laden könnte, ohne
   * vorher die Einträge *aller* Bücher zu lesen. Genau das soll die
   * Bibliothek vermeiden.
   */
  bookId?: string;
  /** Ausgangseintrag */
  fromId: string;
  /** Zieleintrag */
  toId: string;
  /** Beziehungsart, siehe `lib/relations.ts` */
  type: string;
  /** Optionale Anmerkung („nur im Winter“, „zweite Generation“ …) */
  note?: string;
  /**
   * Wann diese Verbindung galt – Weltzeit, roh wie geschrieben.
   *
   * Ohne sie gilt eine Beziehung, solange beide Enden bestehen. Das ist für
   * „besteht aus“ richtig und für „herrschte über“ falsch: Ein König regiert
   * selten sein ganzes Leben, und eine Ehe endet nicht immer mit dem Tod.
   * Fehlen beide Angaben, bleibt es beim alten Verhalten – das ist der
   * häufige Fall und soll keine Arbeit machen.
   */
  beginn?: string;
  ende?: string;
  /**
   * Ein Satz zur Zeit dieser Verbindung.
   *
   * „Nur im Sommer", „bis zum Bruch von Arven", „angeblich schon früher" –
   * Dinge, die keine Spanne sind und trotzdem zur Zeit gehören. Sie werden
   * nicht gerechnet, nur gelesen: Was sich nicht datieren lässt, soll
   * trotzdem dastehen dürfen.
   */
  zeitnotiz?: string;
  createdAt: number;
}

/* -------------------------------------------------------------------- Bilder */

export interface StoredImageMeta {
  id: string;
  /**
   * In welches Buch dieses Bild gelegt wurde.
   *
   * Die Datei selbst (`StoredImageBlob`) trägt bewusst keine Buchzugehörigkeit
   * – sie hängt an dieser Id, und ein Bild ein zweites Mal zu speichern, nur
   * weil es in einem zweiten Buch vorkommt, wäre die teuerste denkbare
   * Antwort. Soll ein Bild später in mehreren Büchern stehen, kommt eine
   * Liste *daneben*; dieses Feld bleibt dann, was es ist: das Buch, in dem es
   * zuerst lag.
   */
  bookId?: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  prompt: string;
  negativePrompt: string;
  source: string;
  status: EntryStatus;
  favorite: boolean;
  linkedEntryIds: string[];
  fileName: string;
  mime: string;
  size: number;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
}

export interface StoredImageBlob {
  id: string;
  full: Blob;
  thumb: Blob;
}

/**
 * Was nicht jeder sehen soll.
 *
 * Bewusst ohne Verschlüsselung und ohne Zugriffsrechte: Das hier schützt vor
 * Blicken über die Schulter am Spieltisch, nicht vor jemandem, der die Datei
 * hat. Alles liegt offen im Browser dieses Geräts, so wie jede andere Seite
 * auch – etwas anderes zu behaupten wäre gefährlicher als gar nichts.
 */
export interface EntryGeheim {
  /** Der Absatz, den nur die Leitung liest. */
  text?: string;
  /** Die ganze Seite bleibt am Tisch zu. */
  ganzeSeite?: boolean;
}

/* -------------------------------------------------------------------- Klang */

/**
 * Ein Klang in der Sammlung.
 *
 * Nach demselben Muster wie Bilder – Angaben hier, Datei daneben. Das ist
 * keine Verdopplung des Bildmodells, sondern dieselbe Antwort auf dieselbe
 * Frage: Listen müssen leicht bleiben, Dateien dürfen schwer sein. Ein
 * Klangverzeichnis, das jedes Mal zwanzig Megabyte lädt, wäre kein
 * Verzeichnis.
 */
export interface StoredKlang {
  id: string;
  bookId?: string;
  title: string;
  fileName: string;
  mime: string;
  size: number;
  /** Länge in Sekunden, sofern der Browser sie verraten hat. */
  dauer?: number;
  /** Woher er stammt – eine Aufnahme, eine Bibliothek, ein Name. */
  quelle?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredKlangBlob {
  id: string;
  datei: Blob;
}

/* ------------------------------------------------------------------ Verlauf */

/** Zeitpunkt-Aufnahme eines Eintrags – Grundlage für Zeitleiste und Rückkehr. */
export interface Revision {
  id: string;
  /**
   * Buch. Über `entryId` wäre es meist ableitbar – aber gerade nicht dann,
   * wenn man es braucht: Die Fassung eines endgültig entfernten Eintrags hat
   * keinen Eintrag mehr, an dem sie hinge.
   */
  bookId?: string;
  entryId: string;
  at: number;
  /** Was ist passiert? „angelegt“, „bearbeitet“, „gelöscht“ … */
  action: 'created' | 'edited' | 'deleted' | 'restored';
  /** Kurzbeschreibung für die Zeitleiste */
  summary: string;
  snapshot: Entry;
}

/* ----------------------------------------------------------- Concept Canvas */

export type CanvasItemKind = 'image' | 'note' | 'entry' | 'stroke' | 'frame';

export interface CanvasItem {
  id: string;
  kind: CanvasItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Bild-ID, Eintrags-ID oder Text – je nach Art */
  refId?: string;
  text?: string;
  color?: string;
  /** Freihandlinie: Punkte relativ zur Position */
  points?: number[];
  rotation?: number;
  z: number;
}

export interface CanvasBoard {
  id: string;
  /** Buch. Ein Bogen hängt an keinem Eintrag, also steht es hier oder nirgends. */
  bookId?: string;
  name: string;
  items: CanvasItem[];
  /** Kamera beim letzten Verlassen – man kehrt dorthin zurück */
  camera: { x: number; y: number; zoom: number };
  createdAt: number;
  updatedAt: number;
}

/* -------------------------------------------------------------- Navigation */

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  removable: boolean;
  hidden: boolean;
}

/* ------------------------------------------------------------ Einstellungen */

/** Ein selbst angelegter Eintragstyp – gleichberechtigt mit den eingebauten. */
export interface CustomTypeDef {
  type: string;
  label: string;
  labelPlural: string;
  newTitle: string;
  icon: string;
  accent: string;
  categories: string[];
  fields: { key: string; label: string; kind: string; hint?: string }[];
}

export interface CreativeGoal {
  id: string;
  text: string;
  /** Zieltyp und Zielzahl, z. B. 10 Kreaturen */
  entryType?: string;
  target: number;
  done: boolean;
  createdAt: number;
}

/** Woher das Zeichen des Buches stammt. */
/**
 * Woher das Zeichen eines Buches kommt.
 *
 * `baukasten` ist neu und der einzige Wert, hinter dem eine *Konstruktion*
 * steht statt eines fertigen Dings. Die drei anderen bleiben unangetastet:
 * Wer sein Zeichen hochgeladen hat, soll es behalten.
 */
export type EmblemType = 'preset' | 'upload' | 'generated' | 'baukasten';

/**
 * Die Identität des Buches: Titel, Einband, Zeichen.
 *
 * Eine eigene Entität, keine Ansammlung von Einstellungen. Sie ist die
 * Grundlage für alles, was dieses Buch später ausweist – Besitzseite,
 * Kapitelmarken, Siegel auf geteilten Weltfragmenten, Ausgaben als PDF.
 * Deshalb hat sie eine eigene `id`, die bestehen bleibt, auch wenn der Titel
 * sich ändert.
 */
export interface BookIdentity {
  id: string;
  title: string;
  subtitle?: string;
  /** Schlüssel aus COVER_MATERIALS */
  coverMaterial: string;
  /** Schlüssel aus COVER_COLORS */
  coverColor: string;
  emblemType: EmblemType;
  /** Schlüssel aus EMBLEM_PRESETS – wenn das Zeichen aus der Bibliothek kommt */
  emblemId?: string;
  /**
   * Id eines Bildes aus der Bildverwaltung – wenn das Zeichen hochgeladen oder
   * von einer Bild-KI erzeugt wurde. Bewusst nur die Id: Die Datei liegt als
   * Blob in `imageBlobs`, wie jedes andere Bild auch.
   */
  emblemImageId?: string;
  /** Feineinstellung des eingelegten Bildes auf dem Einband. */
  emblemScale?: number;
  emblemRotation?: number;
  /** Der Text, mit dem das Zeichen erzeugt wurde – bleibt als Herkunft erhalten. */
  emblemPrompt?: string;
  /**
   * Der Bauplan aus dem Zeichen-Baukasten – siehe `lib/zeichen/emblem.ts`.
   *
   * Ausdrücklich die Konstruktion und nicht das Bild. Ein Zeichen, das als
   * Datei abgelegt wird, ist fertig; man kann es ansehen und wegwerfen, aber
   * nicht mehr öffnen. Als Ebenenliste bleibt es für immer aufmachbar – und
   * weil darin keine Farbe steht, erscheint derselbe Bauplan als Goldprägung
   * auf Leder und als Tinte auf Papier, ohne zweimal zu existieren.
   */
  emblemBauplan?: Emblem;
  /** Wer das Buch begonnen hat. Erscheint auf der Besitzseite. */
  owner?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Ein Band in der Bibliothek.
 *
 * Dragoncore war ein Buch und ist jetzt eine Bibliothek. Das ist keine zweite
 * Datenwelt: Es kommt genau eine Ebene *darüber*. Ein `LibraryBook` ist
 * deshalb kein neues Objekt neben der Buchidentität, sondern dieselbe
 * Identität, um das erweitert, was erst Sinn ergibt, wenn ein Buch neben
 * anderen steht – wann es zuletzt offen lag, ob es im Regal steht oder im
 * Archiv, welcher Welt und welcher Reihe es angehört.
 *
 * Und um seine eigenen Einstellungen. Das ist die zweite Entscheidung dieser
 * Datei: Was einem Buch gehört – sein Weltname, sein Lesebändchen, seine
 * Ziele, seine eigenen Typen –, steht im Buch. Was dem Gerät gehört – die
 * Navigation, die Erinnerung ans Sichern –, bleibt in `Settings`. Vorher lag
 * beides in derselben Zeile, was richtig war, solange es genau ein Buch gab.
 */
export interface LibraryBook extends BookIdentity {
  /**
   * Der Buchrücken. Was im Regal zu sehen ist, wenn das Buch geschlossen
   * steht. Ohne eigenen Text steht dort der Titel.
   */
  spine?: { text?: string; ornament?: string };
  /** Die Rückseite – ein Satz über dieses Buch, wie auf einem Klappentext. */
  backCover?: { text?: string };
  /** Wann es zuletzt aufgeschlagen wurde. Bestimmt, was vorne liegt. */
  lastOpenedAt?: number;
  /**
   * Aus dem Regal genommen, nicht weggeworfen. Ein Buch kann Jahre Arbeit
   * enthalten; das Löschen ist eine zweite, ausdrückliche Handlung.
   */
  archived?: boolean;
  /**
   * Die Welt, in der dieses Buch spielt.
   *
   * Noch ohne Wirkung – vorbereitet für den Tag, an dem ein Weltbuch und zwei
   * Romane dieselbe Welt teilen. Bis dahin ist ein Buch seine eigene Welt,
   * und das steht hier auch so: Jedes neue Buch bekommt eine eigene `worldId`.
   */
  worldId?: string;
  /** Eine Reihe: „Mooshalde I, II, III". Noch ohne Verwaltung. */
  seriesId?: string;
  /**
   * Der alte Weg – nur noch zum Lesen.
   *
   * Fünf Namen, die einmal gefragt und nie benutzt wurden. Seit es `profil`
   * gibt, schreibt niemand mehr hierher; gelesen wird es weiter, damit ein
   * Buch aus jener Zeit sein Profil bekommt, statt bei null anzufangen.
   *
   * Nicht entfernen. Es steht in jeder Sicherung, die je erstellt wurde.
   */
  weg?: string;

  /* ------------------------------------------- Was dieses Buch ausmacht */

  /** Der Name der Welt in diesem Buch. */
  worldName: string;
  worldTagline: string;
  /** Wo das Buch zuletzt zugeklappt wurde – sein Lesebändchen. */
  lastSpreadKey?: string;
  /** Zuletzt geöffnete Seiten dieses Buches. */
  recentIds: string[];
  /** Wie oft eine Seite gelesen wurde – daraus entsteht die Abnutzung. */
  visits?: Record<string, number>;
  goals: CreativeGoal[];
  customTypes: CustomTypeDef[];
  promptTemplates?: StoredPromptTemplate[];
  spiegelAus?: boolean;
  spiegelVerlauf?: { at: number; motive: string[] }[];
  leitfaden?: { an: boolean; erledigt: string[] };
  /** Welche Entdeckungen in *diesem* Band Absicht sind. */
  entdeckungenAbsicht?: string[];
  /**
   * Das Profil dieses Buches – siehe `lib/profil.ts`.
   *
   * Es ordnet und faltet, es entfernt nie. Was hier steht, entscheidet, was
   * zuerst offen liegt und wie dicht die Seiten gesetzt sind – nicht, was es
   * gibt. Jede Funktion bleibt in jedem Profil erreichbar.
   *
   * Steht es nicht da, stammt das Buch aus der Zeit davor: Dann wird es aus
   * `weg` abgeleitet, und zwar in der sanftesten Auslegung.
   */
  profil?: Profil;
  /**
   * Was Dragoncore in diesem Band schon gesagt bekommen hat.
   *
   * Gehört dem Buch und nicht dem Gerät: „Nicht mehr hierzu" meint eine
   * bestimmte Figur in einer bestimmten Welt. Wer denselben Hinweis in einem
   * anderen Band bekäme, bekäme ihn zu Recht.
   */
  anerbieten?: Notiz[];
}

/**
 * Die abweichende Fassung einer Prompt-Vorlage.
 *
 * Nur die Abweichung wird gespeichert – wer nichts ändert, bekommt spätere
 * Verbesserungen der Werksfassung mit.
 */
export interface StoredPromptTemplate {
  id: string;
  content: string;
  updatedAt: number;
}

/**
 * Die Einstellungen, wie die Oberfläche sie sieht.
 *
 * Achtung, hier stehen zwei Dinge in einem Objekt – absichtlich, und mit einer
 * klaren Trennung dahinter:
 *
 *   **Global** (`nav`, `backupReminderDays`, `seedVersion`, `lastBackupAt`,
 *   `activeBookId`) gehört dem Gerät. Es liegt in der Zeile `settings` der
 *   Datenbank und gilt für die ganze Bibliothek.
 *
 *   **Buchbezogen** (`book`, `worldName`, `lastSpreadKey`, `goals`,
 *   `customTypes`, `leitfaden` …) gehört dem aufgeschlagenen Buch. Es liegt
 *   im `LibraryBook` selbst, in der Tabelle `books`.
 *
 * Der Store legt beides beim Laden übereinander und zerlegt jede Änderung
 * wieder – siehe `lib/bibliothek.ts`. Für Seiten und Komponenten ändert sich
 * dadurch nichts: `settings.worldName` ist weiterhin der Weltname, er gehört
 * nur jetzt zu *diesem* Buch statt zum Gerät.
 */
export interface Settings {
  id: 'settings';
  nav: NavItem[];
  /**
   * Welches Buch aufgeschlagen ist. Fehlt es, steht man in der Bibliothek.
   * Der einzige Ort, an dem das steht – jede buchbezogene Abfrage hängt hier.
   */
  activeBookId?: string;
  /**
   * Das aufgeschlagene Buch. Fehlt es, hat dieses Gerät noch keines – dann
   * beginnt beim Start die Erschaffung statt das Lesen.
   *
   * Wird vom Store aus der Tabelle `books` eingelegt, nicht hier gespeichert.
   */
  book?: LibraryBook;
  /** Eigene Fassungen von Prompt-Vorlagen. */
  promptTemplates?: StoredPromptTemplate[];
  /** Der alte Weg – nur noch zum Lesen, siehe `LibraryBook.weg`. */
  weg?: string;
  /**
   * Der Tischmodus – siehe `lib/geheim.ts`.
   *
   * Gehört dem *Gerät* und nicht dem Buch: Er beschreibt, wer gerade auf den
   * Bildschirm sieht, und das ist keine Eigenschaft der Welt. Wer am
   * Spieltisch zwischen zwei Bänden wechselt, will ihn nicht zweimal
   * einschalten.
   */
  tischmodus?: boolean;
  /**
   * Das Profil dieses Buches – siehe `lib/profil.ts`.
   *
   * Es ordnet und faltet, es entfernt nie. Was hier steht, entscheidet, was
   * zuerst offen liegt und wie dicht die Seiten gesetzt sind – nicht, was es
   * gibt. Jede Funktion bleibt in jedem Profil erreichbar.
   *
   * Steht es nicht da, stammt das Buch aus der Zeit davor: Dann wird es aus
   * `weg` abgeleitet, und zwar in der sanftesten Auslegung.
   */
  profil?: Profil;
  /**
   * Was Dragoncore in diesem Band schon gesagt bekommen hat.
   *
   * Gehört dem Buch und nicht dem Gerät: „Nicht mehr hierzu" meint eine
   * bestimmte Figur in einer bestimmten Welt. Wer denselben Hinweis in einem
   * anderen Band bekäme, bekäme ihn zu Recht.
   */
  anerbieten?: Notiz[];
  /**
   * Der Charakterspiegel lässt sich vollständig abschalten.
   *
   * Nicht verstecken – abschalten. Wer ihn nicht will, soll ihn nicht haben,
   * und zwar ohne Begründung und ohne Nachfrage.
   */
  spiegelAus?: boolean;
  /**
   * Entdeckungen, die der Verfasser als Absicht gekennzeichnet hat.
   *
   * Eine Fantasy-Welt darf ungewöhnlich sein. Wer für seinen Waldkoi
   * entschieden hat, dass er weit reist, will nicht jedes Mal aufs Neue
   * danach gefragt werden. Gespeichert wird die Kennung des Befundes – ändert
   * sich die Welt so, dass er neu entsteht, ist er auch wieder eine Frage.
   */
  entdeckungenAbsicht?: string[];
  /**
   * Wie weit der Leitfaden ist – siehe `lib/leitfaden.ts`.
   *
   * Fehlt er, ist er an: Ein neues Buch soll zeigen, was man tun kann. Wer
   * ihn abstellt, hat ihn abgestellt; er kommt nicht von selbst zurueck.
   */
  leitfaden?: { an: boolean; erledigt: string[] };
  /**
   * Frühere Spiegelungen: was der Spiegel zu einem früheren Zeitpunkt als
   * stärkste Motive gesehen hat. Daraus entsteht eine Chronik des kreativen
   * Vorgangs – „vor einem Jahr war dies eines der stärksten Motive".
   */
  spiegelVerlauf?: { at: number; motive: string[] }[];
  /**
   * Ob das Buch überhaupt klingen darf.
   *
   * Fehlt der Wert, ist die Antwort *nein*. Das ist die einzige vertretbare
   * Vorgabe: Wer ein Buch aufschlägt, erwartet Stille, und ein Programm, das
   * ungefragt Ton macht, hat einmal zu viel Vertrauen genommen. Gehört dem
   * Gerät, nicht dem Band – ob es hier leise sein muss, entscheidet der Ort,
   * an dem man sitzt, nicht die Welt, die man liest.
   */
  atmosphaereAn?: boolean;
  lastBackupAt?: number;
  backupReminderDays: number;
  seedVersion: number;
  customTypes: CustomTypeDef[];
  goals: CreativeGoal[];
  /** Zuletzt geöffnete Einträge – „Weitermachen, wo du warst“ */
  recentIds: string[];
  /** Name der Welt, erscheint im Weltbuch und im Story-Modus */
  worldName: string;
  worldTagline: string;
  /**
   * Wo das Buch zuletzt zugeklappt wurde. Beim nächsten Öffnen schlägt es
   * genau dort wieder auf – wie ein Buch mit Lesebändchen.
   */
  lastSpreadKey?: string;
  /**
   * Wie oft eine Seite gelesen wurde. Daraus entsteht die Abnutzung: oft
   * besuchte Seiten wirken eine Spur wärmer und griffiger.
   */
  visits?: Record<string, number>;
}

export type ViewMode = 'grid' | 'list' | 'detail';

export interface EntryFilter {
  query: string;
  types: EntryType[];
  categories: string[];
  statuses: EntryStatus[];
  tags: string[];
  favoritesOnly: boolean;
  cutoutOnly: boolean;
  animatableOnly: boolean;
  orientation: '' | 'hoch' | 'quer' | 'quadratisch';
}

export const EMPTY_FILTER: EntryFilter = {
  query: '',
  types: [],
  categories: [],
  statuses: [],
  tags: [],
  favoritesOnly: false,
  cutoutOnly: false,
  animatableOnly: false,
  orientation: '',
};
