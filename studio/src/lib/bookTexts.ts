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
    /**
     * Die Frage nach dem Namen – und die Welt, die daran hängt.
     *
     * Hier standen bis eben zwei verschiedene Dinge in einem Atemzug:
     *
     *     Frage:       „Wie soll dein **Buch** heißen?"
     *     Platzhalter: „Der Name deiner **Welt**"
     *
     * Seit Fassung 8 sind das nicht mehr zwei Worte für dasselbe. Die Welt
     * ist gemeinsam, das Buch bestimmt, wie man sie erlebt; ein zweiter Band
     * kann in derselben Welt stehen. Genau dieser Unterschied trägt den
     * halben Aufbau des Programms – und ausgerechnet an der Stelle, an der
     * jemand ihn zum ersten Mal begegnet, wurde er verwischt.
     *
     * **Im einen Fall war der Platzhalter schlicht falsch.** Wer sein Buch
     * einer bestehenden Welt zuordnet, wurde aufgefordert, deren Namen
     * einzutragen – obwohl sie längst einen hat und ihn behält. Nachgelesen
     * in `Geburt.tsx`: `worldName: gewaehlteWelt?.name ?? einband.title`.
     *
     * Der Platzhalter nennt jetzt nur noch das Buch. Was mit der Welt
     * geschieht, sagt der Hinweis – und er sagt es je nach Lage anders,
     * weil es je nach Lage etwas anderes ist. Das ist der Grund, warum aus
     * einem festen Satz eine Funktion wurde: Ein Satz, der in der Hälfte der
     * Fälle nicht stimmt, ist kein Hinweis, sondern eine Falle.
     */
    titel: {
      frage: 'Wie soll dein Buch heißen?',
      /** Eine neue Welt beginnt mit diesem Buch – und trägt seinen Namen. */
      hinweisNeueWelt:
        'Der Name steht auf dem Einband – und auf der Welt, die mit diesem Buch beginnt. Er lässt sich jederzeit ändern.',
      /** `%s` ist die bestehende Welt. Sie heisst weiter, wie sie heisst. */
      hinweisBestehendeWelt:
        'Der Name steht auf dem Einband. Die Welt %s behält ihren eigenen. Er lässt sich jederzeit ändern.',
      platzhalter: 'Ein Name für dieses Buch',
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

    /*
     * Und noch einmal dieselben Szenen – fuer ein weiteres Buch neben denen,
     * die schon im Regal stehen.
     *
     * „Jede Welt beginnt mit einem leeren Buch" waere auch hier falsch: Wer
     * sein drittes Buch anlegt, faengt nicht an, er faengt *noch etwas* an.
     * Das ist ein anderer Satz und ein anderer Ton – ruhiger, ohne die
     * Feierlichkeit des ersten Males, die man nicht wiederholen kann, ohne
     * sie zu entwerten.
     */
    anfangWeiterer: {
      zeile: 'Neben deinen Büchern ist Platz.',
      unterzeile: 'Beginne noch eines.',
      aria: 'Ein weiteres Buch beginnen',
    },
    vollendenWeiterer: {
      knopf: 'Dieses Buch beginnen',
      ruhe: 'Dein neues Buch.',
      oeffnen: 'Schlag es auf.',
    },
    ausrichtung: {
      frage: 'Was möchtest du hier erschaffen?',
      /*
       * Der Hinweis stand vorher auf „Es schaltet nichts frei und nichts ab" –
       * und das war damals woertlich wahr, weil die Wahl ueberhaupt nichts tat.
       * Jetzt tut sie etwas, und der Satz muss genauer sein: Sie ordnet, was
       * offenliegt. Weggenommen wird trotzdem nichts.
       */
      hinweis:
        'Daraus ergibt sich, womit dieses Buch beginnt und wie viel gleich offenliegt. Es nimmt nichts weg – alles bleibt erreichbar, und du kannst es jederzeit ändern.',
      ohne: 'Das ergibt sich',
    },
    zurueck: 'Zurück',
    weiter: 'Weiter',

    /**
     * Warum „Weiter" gerade nicht geht.
     *
     * Gemessen, auf dem Telefon: Zwei der fünf Schritte sperren den Knopf,
     * beide bei Deckkraft 0,3, beide ohne ein Wort dazu. Wer ihn drückt,
     * bekommt nichts – keine Bewegung, keine Meldung. Und der aktive
     * „Zurück" daneben sieht verfügbarer aus als der Weg nach vorn.
     *
     * Das Bittere daran: **Die Begründungen gibt es längst.** Sie stehen im
     * Quelltext, ausführlich und gut, und richten sich an Programmierer:
     *
     *     „Ein Buch ohne Art hätte keinen Arbeitsraum, und dann stünde man
     *      nach der Zeremonie vor einer Tür ohne Zimmer."   – Artwahl.tsx
     *
     *     „Trägt das Buch schon einen Namen? Daran – und nur daran – hängt
     *      alles."                                      – bookIdentity.ts
     *
     * Der Leser bekam davon nichts. Hier stehen dieselben Gründe in der
     * Sprache des Buches.
     *
     * **Und warum sie nicht mahnen.** Gesetz 3: nichts mahnt. Kein „bitte",
     * kein „erforderlich", kein Ausrufezeichen. Zwei Sätze: Was gerade der
     * Fall ist, und was daraus folgt – beides über das Buch, nicht über ein
     * Formular. Sie stehen sofort da, nicht erst nach einem misslungenen
     * Griff: Eine Sackgasse zu erklären, nachdem jemand hineingelaufen ist,
     * ist schlechter, als sie gar nicht erst entstehen zu lassen. Und sie
     * verschwinden in dem Augenblick, in dem sie nicht mehr stimmen.
     */
    warten: {
      art: 'Noch ist keine Art gewählt. Ohne sie hat das Buch keinen Arbeitsraum.',
      titel: 'Noch ohne Namen. Ein namenloses Buch lässt sich nicht wieder aufschlagen.',
    },
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

/**
 * Was unter der Titelfrage steht – je nachdem, wohin dieses Buch gehört.
 *
 * `welt` ist der Name einer **bestehenden** Welt, der dieses Buch beitritt,
 * oder `undefined`, wenn mit ihm eine neue beginnt. Die Frage darüber bleibt
 * in beiden Fällen dieselbe; es ist immer der Titel des Buches, nach dem
 * gefragt wird.
 *
 * Eine leere oder nur aus Leerzeichen bestehende Angabe gilt als „keine".
 * Den Satz „Die Welt  behält ihren eigenen." mit einem Loch in der Mitte
 * auszuliefern wäre schlimmer als der Satz, der hier vorher stand.
 */
export function titelHinweis(welt?: string): string {
  const name = welt?.trim();
  if (!name) return BUCH_TEXTE.geburt.titel.hinweisNeueWelt;
  /*
   * Anführungszeichen um den Weltnamen, und zwar deutsche.
   *
   * Ohne sie liest sich „Die Welt Das Tal der stillen Riesen behält ihren
   * eigenen." wie ein verunglückter Satz. Mit ihnen ist sichtbar, wo der
   * Name anfängt und aufhört – auch bei einer Welt, die „Die Welt" heisst.
   */
  return BUCH_TEXTE.geburt.titel.hinweisBestehendeWelt.replace('%s', `„${name}“`);
}

/** Ein Datum, wie es auf einer Besitzseite steht. */
export function langesDatum(at: number): string {
  return new Date(at).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
