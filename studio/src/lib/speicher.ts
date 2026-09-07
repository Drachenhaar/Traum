/**
 * Ob der Browser das Buch behalten darf.
 *
 * ---
 *
 * **Das Loch, das diese Datei schliesst.**
 *
 * Auf der Einstellungsseite steht seit Langem ein wahrer Satz: „Alles liegt
 * lokal in diesem Browser. Es gibt keinen Server – Sicherungen sind daher
 * wichtig." Er ist ehrlich, und er schiebt die ganze Verantwortung auf
 * jemanden, der gerade eine Welt schreibt.
 *
 * Denn was dort nicht steht: Ein Browser darf lokale Daten **von sich aus
 * wegräumen**. Läuft der Datenträger voll, wirft er weg, was er für
 * entbehrlich hält – und für „entbehrlich" hält er alles, was nicht
 * ausdrücklich anders angemeldet ist. Safari geht weiter und löscht
 * Web-Speicher nach sieben Tagen ohne Besuch. Wer sein Buch zwei Wochen
 * liegen lässt und zurückkommt, findet unter Umständen ein leeres Regal.
 *
 * Dagegen gibt es genau eine Massnahme, und sie ist eine Zeile lang:
 * `navigator.storage.persist()`. Danach ist der Speicher als *dauerhaft*
 * angemeldet und wird nur noch auf ausdrückliche Anweisung des Nutzers
 * gelöscht.
 *
 * ---
 *
 * **Wann gefragt wird – und warum nicht beim Start.**
 *
 * Die Browser entscheiden das nicht per Dialog, sondern nach *Verbundenheit*:
 * Wie oft war jemand hier, hat er ein Lesezeichen gesetzt, ist die Anwendung
 * installiert? Eine Seite, die beim allerersten Aufschlagen fragt, bekommt
 * deshalb fast sicher ein Nein – und ein Nein kostet den Versuch.
 *
 * Gefragt wird darum in dem Augenblick, in dem es **etwas zu verlieren gibt**:
 * wenn das erste Buch entstanden ist. Das ist zugleich der Moment mit den
 * besten Aussichten und der einzige, in dem die Frage eine Bedeutung hat.
 *
 * Und danach nie wieder von selbst. Firefox zeigt für diese Bitte eine
 * Nachfrage am Bildschirmrand; sie bei jedem Start zu stellen wäre genau die
 * Sorte Zudringlichkeit, die dieses Buch nicht hat. Wer beim ersten Mal Nein
 * bekommen hat, findet im Kolophon einen Knopf.
 *
 * ---
 *
 * **Es ersetzt die Sicherung nicht.** Dauerhafter Speicher schützt vor dem
 * Aufräumen des Browsers. Er schützt nicht vor einem verlorenen Telefon, einem
 * gelöschten Profil oder einem Menschen, der „Browserdaten löschen" drückt.
 * Die Ausfuhr bleibt die einzige Sicherung, die diesen Namen verdient – diese
 * Datei nimmt ihr nur den Fall ab, in dem niemand etwas falsch gemacht hat.
 */

/** Was das Gerät über den Speicher dieses Buches sagt. */
export interface Speicherlage {
  /**
   * Ist der Speicher als dauerhaft angemeldet?
   *
   * `undefined` heisst: Der Browser kennt die Frage nicht. Das ist etwas
   * anderes als „nein" und muss anders gesagt werden – „dein Browser kann das
   * nicht sagen" ist ehrlich, „dein Buch ist ungeschützt" wäre geraten.
   */
  dauerhaft: boolean | undefined;
  /** Belegte Bytes, soweit der Browser sie nennt. */
  belegt?: number;
  /** Verfügbare Bytes, soweit der Browser sie nennt. */
  gesamt?: number;
}

/**
 * Kennt dieser Browser die Frage überhaupt?
 *
 * Geprüft wird die Methode und nicht der Browsername. Eine Abfrage nach dem
 * Namen ist in zwei Jahren falsch, eine Abfrage nach dem Können nie.
 */
function kann(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.persist;
}

/** Wie es gerade steht – ohne zu fragen, ohne etwas zu ändern. */
export async function speicherlage(): Promise<Speicherlage> {
  if (typeof navigator === 'undefined' || !navigator.storage) return { dauerhaft: undefined };
  let dauerhaft: boolean | undefined;
  try {
    dauerhaft = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
  } catch {
    /*
     * Ein Fehler hier ist kein Nein.
     *
     * In einem privaten Fenster oder unter strengen Einstellungen wirft der
     * Zugriff, statt `false` zu liefern. „Der Browser sagt nichts" ist die
     * richtige Antwort darauf – und die Seite zeigt dann auch das.
     */
    dauerhaft = undefined;
  }
  let belegt: number | undefined;
  let gesamt: number | undefined;
  try {
    if (navigator.storage.estimate) {
      const s = await navigator.storage.estimate();
      belegt = s.usage;
      gesamt = s.quota;
    }
  } catch {
    /* Der Platz ist eine Nebensache; ohne ihn steht die Seite trotzdem. */
  }
  return { dauerhaft, belegt, gesamt };
}

/**
 * Den Browser bitten, das Buch zu behalten.
 *
 * Zurück kommt die Lage **danach**. Ein `false` ist keine Störung und wird
 * nirgends als Fehler gemeldet: Es heisst nur, dass der Browser diese Seite
 * noch nicht gut genug kennt. Wer sie öfter besucht oder ein Lesezeichen
 * setzt, bekommt beim nächsten Versuch ein Ja.
 */
export async function umDauerhaftigkeitBitten(): Promise<boolean | undefined> {
  if (!kann()) return undefined;
  try {
    /* Schon angemeldet? Dann nicht noch einmal fragen. */
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage.persist();
  } catch {
    return undefined;
  }
}

/* ---------------------------------------------------- Die zweite Hälfte --- */

/**
 * Ist eine Sicherung fällig?
 *
 * ---
 *
 * **Der Fall, den die alte Rechnung nicht kannte.**
 *
 * Auf der Einstellungsseite stand:
 *
 *     lastBackupAt !== undefined && jetzt - lastBackupAt > tage
 *
 * Damit bekam ausgerechnet der Mensch **keine** Warnung, der am meisten zu
 * verlieren hatte: Wer nie gesichert hat, hat kein Datum – und ohne Datum war
 * die Bedingung falsch. Die Erinnerung erschien erst nach der ersten
 * Sicherung, also erst, nachdem die Gefahr vorüber war.
 *
 * Gemessen wird deshalb ab dem Datum der letzten Sicherung **oder**, wenn es
 * keine gab, ab dem Augenblick, seit dem es etwas zu verlieren gibt: dem
 * ältesten lebenden Eintrag.
 *
 * Und auf einem leeren Buch schweigt sie. Jemanden zu mahnen, er möge das
 * Nichts sichern, das er noch nicht geschrieben hat, ist die Sorte
 * Aufdringlichkeit, mit der Programme das Vertrauen verlieren.
 */
export function sicherungFaellig(
  { letzteSicherung, aeltesterEintrag, eintraege }: {
    letzteSicherung?: number;
    /** Wann der älteste lebende Eintrag entstand. */
    aeltesterEintrag?: number;
    /** Wie viele Einträge es gibt, die nicht im Papierkorb liegen. */
    eintraege: number;
  },
  tage: number,
  jetzt = Date.now(),
): boolean {
  if (eintraege <= 0) return false;
  const seit = letzteSicherung ?? aeltesterEintrag;
  if (seit === undefined) return false;
  return jetzt - seit > tage * 86_400_000;
}

/**
 * Bytes, wie ein Mensch sie liest.
 *
 * Mit tausend und nicht mit 1024: Der Browser meldet seine Schätzung in
 * Dezimalpräfixen, und eine Anzeige, die anders rechnet als die Quelle, zeigt
 * eine andere Zahl als die Einstellungen desselben Browsers.
 */
export function alsGroesse(bytes: number | undefined): string | undefined {
  if (bytes === undefined || !Number.isFinite(bytes)) return undefined;
  if (bytes < 1000) return `${bytes} B`;
  const einheiten = ['kB', 'MB', 'GB', 'TB'];
  let wert = bytes / 1000;
  let i = 0;
  while (wert >= 1000 && i < einheiten.length - 1) {
    wert /= 1000;
    i++;
  }
  return `${wert < 10 ? wert.toFixed(1) : Math.round(wert)} ${einheiten[i]}`;
}
