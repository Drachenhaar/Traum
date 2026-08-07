/**
 * Alle Worte der Buchwerdung und der Besitzseite – an einem Ort.
 *
 * Nicht aus Ordnungsliebe: Diese Saetze sind der Ton des ganzen Programms.
 * Verstreut in einem Dutzend Komponenten liesse sich weder eine Uebersetzung
 * anlegen noch der Klang nachtraeglich stimmen, ohne durch Dateien zu jagen,
 * die mit Sprache nichts zu tun haben.
 *
 * Wird spaeter uebersetzt, tritt neben dieses Objekt ein zweites gleicher
 * Gestalt – und sonst aendert sich nichts.
 */

export const BUCH_TEXTE = {
  geburt: {
    anfang: {
      zeile: 'Jede Welt beginnt mit einem leeren Buch.',
      unterzeile: 'Erschaffe deines.',
      /* Fuer Vorleseprogramme – die Szene selbst traegt keinen Knopf. */
      aria: 'Die Erschaffung des Buches beginnen',
    },
    einband: {
      frage: 'Woraus soll dein Buch sein?',
      hinweis: 'Nimm es in die Hand. Es wird lange bei dir liegen.',
      material: 'Material',
      farbe: 'Farbe',
    },
    titel: {
      frage: 'Wie soll dein Buch heißen?',
      hinweis: 'Der Name steht auf dem Einband. Er lässt sich jederzeit ändern.',
      platzhalter: 'Der Name deiner Welt',
      untertitelPlatzhalter: 'Ein Untertitel, wenn du magst',
    },
    zeichen: {
      frage: 'Welches Zeichen soll dein Buch tragen?',
      hinweis: 'Es wird dich begleiten – auf dem Einband, auf jeder Kapitelmarke, auf allem, was dieses Buch verlässt.',
      wegVorhanden: 'Ein vorhandenes Zeichen',
      wegEigen: 'Ein eigenes Bild',
      wegErschaffen: 'Ein Zeichen erschaffen',
      erschaffenHinweis:
        'Das Buch erzeugt keine Bilder. Es hält den Text bereit, den du mitnimmst – zu einer Bild-KI deiner Wahl. Was dabei herauskommt, legst du hier wieder ein.',
      promptKopieren: 'Text mitnehmen',
      promptKopiert: 'Text kopiert – jetzt bei einer Bild-KI einsetzen.',
      promptZuruecksetzen: 'Auf Werksfassung zurücksetzen',
      bildWaehlen: 'Bild einlegen',
      bildTauschen: 'Anderes Bild',
      groesse: 'Größe',
      drehung: 'Drehung',
    },
    vollenden: {
      knopf: 'Mein Buch beginnen',
      /* Der Moment nach der Vollendung: nur das Buch, sonst nichts. */
      ruhe: 'Dein Buch.',
      oeffnen: 'Schlag es auf.',
    },

    /*
     * Dieselben Szenen fuer ein Buch, das es schon gibt.
     *
     * „Jede Welt beginnt mit einem leeren Buch" waere hier gelogen – die Welt
     * steht laengst, es wechselt nur der Einband. Ein Buch neu zu binden ist
     * ein eigener Vorgang mit eigener Wuerde, kein zweiter Geburtstag.
     */
    anfangNeu: {
      zeile: 'Ein Buch darf sich verwandeln.',
      unterzeile: 'Binde es neu.',
      aria: 'Das Buch neu binden',
    },
    vollendenNeu: {
      knopf: 'Neu binden',
      ruhe: 'Neu gebunden.',
      oeffnen: 'Zurück zum Buch',
    },
    zurueck: 'Zurück',
    weiter: 'Weiter',
  },

  besitz: {
    gehoert: 'Dieses Buch gehört',
    namePlatzhalter: 'Dein Name',
    begonnen: 'Begonnen am',
    segen: 'Möge jede Seite deiner Fantasie eine Heimat geben.',
    weiter: 'Weiterblättern',
  },

  meinBuch: {
    titel: 'Mein Buch',
    rubrik: 'Anhang · Einband & Zeichen',
    hinweis:
      'Was du hier änderst, betrifft nur den Einband. Keine geschriebene Seite geht dabei verloren.',
    gespeichert: 'Gespeichert.',
    neuBinden: 'Das Buch neu binden',
    neuBindenNote: 'Noch einmal durch die Szenen – Einband, Titel, Zeichen. Der Band bleibt, wie er ist.',
  },
} as const;

/** Ein Datum, wie es auf einer Besitzseite steht. */
export function langesDatum(at: number): string {
  return new Date(at).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
