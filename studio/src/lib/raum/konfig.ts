/**
 * Das Stimmwerk.
 *
 * Jede Zahl, die entscheidet, wie sich Dragoncore *anfühlt*, steht hier – und
 * nur hier. Keine Schwelle, keine Dauer, keine Federhärte darf in einer
 * Komponente stehen.
 *
 * Der Grund ist nicht Ordnungsliebe. Wir wissen heute nicht, wo die
 * Commit-Schwelle liegen muss; das weiß erst ein Daumen auf einem echten
 * iPhone. Eine Zahl, die in einer Komponente steht, kostet zum Ändern einen
 * Bau, einen Deploy und einen erneuten Aufbau der Testsituation. Eine Zahl,
 * die hier steht, kostet einen Schieberegler.
 *
 * **Warum kein React-State.** Die Konfiguration wird während einer laufenden
 * Geste sechzigmal in der Sekunde gelesen. Läge sie im React-Zustand, hinge an
 * jedem Lesen eine Abhängigkeitskette, und jede Änderung im Labor würde die
 * ganze Hülle neu zeichnen. Stattdessen: ein Modulwert, `konfig()` zum Lesen,
 * ein Ohr für die wenigen Stellen, die auf Änderungen reagieren müssen.
 *
 * Alle Werte hier sind **Startwerte und keine Designentscheidung.**
 */

export interface Raumkonfig {
  geste: {
    /** Unter dieser Strecke passiert gar nichts – gegen nervöses Zucken. */
    totzonePx: number;
    /**
     * Wie weit die Aktivierungszone vom Rand entfernt beginnt.
     *
     * Nicht null, und das ist wichtig: iOS beansprucht den äußersten Rand
     * selbst für „zurück". Wer dort zieht, kämpft mit dem Betriebssystem und
     * verliert. Ein Streifen *neben* dem Systemrand gehört uns allein.
     */
    randEinzugPx: number;
    /** Wie breit der Streifen ist, in dem eine Raumgeste beginnen darf. */
    randBreitePx: number;

    /**
     * Wie weit die senkrechten Streifen zusätzlich nach innen rücken – über
     * die sichere Fläche des Geräts hinaus.
     *
     * Die sichere Fläche selbst wird gemessen und automatisch abgezogen; diese
     * beiden Werte sind der Sicherheitsabstand *darüber hinaus*. Unten ist er
     * größer, weil die Geste zum Startbildschirm deutlich höher reicht als der
     * Indikator, den man sieht.
     */
    systemEinzugObenPx: number;
    systemEinzugUntenPx: number;

    /**
     * Wie weit gezogen werden muss, damit `fortschritt` 1 erreicht – als
     * Anteil der Bildschirmkante entlang der jeweiligen Achse.
     *
     * Zusammen mit `verpflichtung` ergibt das die tatsächliche Strecke: bei
     * 0.45 und 0.5 sind das auf einem 390 Punkte breiten Telefon etwa 88
     * Punkte bis zur Schwelle. Zwei Regler statt einem, weil sie
     * Verschiedenes bedeuten – der eine, wie schnell der Bogen wächst, der
     * andere, wann er kippt.
     *
     * ---
     *
     * **Warum zwei Anteile und nicht einer.**
     *
     * Hier stand ein einziger Wert für beide Achsen, und das klang sparsam.
     * Auf einem Telefon ist es das Gegenteil: 390 Punkte breit, 844 hoch.
     * Derselbe Anteil ergab waagerecht 88 Punkte bis zur Schwelle und
     * senkrecht 190 – ein senkrechter Zug kostete mehr als das Doppelte,
     * ohne dass irgendjemand das entschieden hätte. Es war keine
     * Designentscheidung, sondern ein Seitenverhältnis, das sich als eine
     * durchgeschlichen hat.
     *
     * Gemessen als Fangquote: rechts wurden 12 von 25 Daumenzügen gefangen,
     * unten 8 von 25.
     */
    wegAnteilWaagerecht: number;
    wegAnteilSenkrecht: number;

    /** Ab hier erkennt Dragoncore die Richtung. Erster Tick. */
    andeutung: number;
    /** Ab hier öffnet ein Loslassen den Raum. Zweiter, klarerer Tick. */
    verpflichtung: number;

    /** Ein kurzer, schneller Wisch genügt statt des vollen Wegs. */
    schnellMindestweg: number;
    schnellTempoPxProMs: number;

    /**
     * Ab welcher Strecke frühestens über die Richtung geurteilt wird.
     *
     * Bleibt bei zehn, und das ist eine gemessene Entscheidung. Der Gedanke
     * lag nahe, hier auf sechzehn zu gehen: Ein Daumen zieht im Bogen, und
     * ganz am Anfang ist dieser Bogen am schiefsten – wer dort urteilt,
     * urteilt über das Zittern des Aufsetzens.
     *
     * Die Fangquote blieb bei sechzehn **exakt gleich** (16/25 und 11/25),
     * während der Bogen sechs Punkte später erschienen wäre. Eine Änderung,
     * die nichts verbessert und die Rückmeldung verzögert, ist keine
     * Verbesserung. Der richtige Hebel lag nicht im *Wann*, sondern im
     * *Wie oft* – siehe `fremdwegPx`.
     */
    richtungssperrePx: number;
    /**
     * Wie schief die Bewegung dabei sein darf.
     *
     * Stand auf 25 Grad, und das war die häufigste Ursache dafür, dass sich
     * die Randgeste „nicht flüssig einfangen" ließ: Gemessen an Daumenzügen
     * mit einem Bogen von 24 und 32 Grad scheiterte **jeder einzelne**. Ein
     * Daumen zieht keine Gerade; er dreht sich um sein Gelenk.
     */
    richtungstoleranzGrad: number;
    /**
     * Ab welchem Winkel die Geste sichtbar jemand anderem gehört.
     *
     * ---
     *
     * **Der eigentliche Fehler, und er war keiner der Zahlen.**
     *
     * Über die Richtung wurde genau einmal geurteilt – beim ersten Schritt
     * über die Sperre – und dieses Urteil war endgültig. Ausgerechnet dort ist
     * ein Daumenbogen am schiefsten: Nach zehn Punkten Weg hat ein Zug, der
     * insgesamt 32 Grad Bogen schlägt, momentan 44 Grad. Keine Toleranz, die
     * ein Scrollen noch abweisen kann, trägt diesen Augenblick. Man kann an
     * `richtungstoleranzGrad` drehen, so lange man will; entweder verschluckt
     * es das Scrollen oder es verwirft den Daumen.
     *
     * Weil es zwei verschiedene Fragen sind, braucht es **zwei Winkel**:
     *
     *   bis `richtungstoleranzGrad`  von hier an gehört die Geste uns
     *   ab  `aufgabewinkelGrad`      von hier an gehört sie jemand anderem
     *   dazwischen                   unentschieden – abwarten
     *
     * Ein Scrollen liegt bei neunzig Grad; es ist damit sofort abgegeben,
     * schneller als vorher. Ein Bogen liegt im Korridor und bekommt seine
     * Chance. Und Abwarten kostet nichts, weil bis dahin nichts angezeigt und
     * niemandem der Finger genommen wurde.
     */
    aufgabewinkelGrad: number;
    /**
     * Wie weit der Finger im unentschiedenen Korridor **quer** laufen darf,
     * bevor Dragoncore die Geste doch abgibt.
     *
     * Der Rückhalt gegen das Warten ohne Ende: Wer eine halbe Bildschirmbreite
     * schräg zieht, wollte etwas anderes, auch wenn der Winkel es offenließe.
     */
    fremdwegPx: number;

    /**
     * Wie tief ein Weg reicht, **wenn ihn niemand gefragt hat**.
     *
     * Hier stand „Mehr Ebenen als drei gibt es nicht", und `naechsterStand`
     * setzte das mit einem `Math.min` durch. Das war eine feste Obergrenze im
     * Unterbau – genau das, was der Auftrag zur Charakterseite verbietet.
     * Eine Kette wie Figur → Beziehung → Person → Ereignis → Ort → Epoche →
     * Fraktion wäre bei drei abgeschnitten worden, von einer Zahl, die von
     * dieser Seite nichts weiß.
     *
     * Wie weit ein Weg reicht, weiß seine Tiefenkarte, und nur sie. Dieser
     * Wert gilt noch für Aufrufer ohne Karte – und das sind die, die ohnehin
     * nichts anzuzeigen hätten.
     */
    hoechsteTiefe: number;
  };

  bogen: {
    grundDeckkraft: number;
    andeutungDeckkraft: number;
    vollDeckkraft: number;
    minBreitePx: number;
    maxBreitePx: number;
    /** Wie weit der Bogen höchstens in die Mitte reicht. */
    maxEinzugAnteil: number;
    weichzeichnenMinPx: number;
    weichzeichnenMaxPx: number;
    /** Ein Gesamtregler über die Auffälligkeit aller Böden. */
    staerke: number;
  };

  bewegung: {
    verpflichtenMs: number;
    abbrechenMs: number;
    heimkehrMs: number;
    /** Wie stark die Mitte auf eine wachsende Geste reagiert. */
    mitteSkalaMin: number;
    mitteVersatzMaxPx: number;
    federHaerte: number;
    federDaempfung: number;
    federMasse: number;
  };

  doppeltipp: {
    abstandMs: number;
    maxWegPx: number;
  };

  langdruck: {
    dauerMs: number;
    toleranzPx: number;
  };

  /**
   * Der Buchkörper.
   *
   * Alles, was das geschlossene Buch zu einem Gegenstand macht und was beim
   * Öffnen passiert. Die Mathematik dazu steht in `lib/buch/koerper.ts`.
   */
  buch: {
    /** Wie weit das Buch bei Berührung anhebt, in Punkten. */
    hub: number;
    /** Wie stark es bei Berührung wächst. 1 = gar nicht. */
    skala: number;
    /**
     * Das wahrgenommene Gewicht – 0 ist ein Heft, 1 ein Foliant.
     *
     * Der wichtigste Regler dieser Gruppe, weil er als einziger *mehrere*
     * Dinge zugleich dreht: Hub, Wachstum, Schattenweg und alle Dauern. „Das
     * Buch fühlt sich zu leicht an" ist ein Gedanke und soll ein Regler sein,
     * nicht fünf.
     */
    gewicht: number;
    oeffnenMs: number;
    schliessenMs: number;
    /** Wie lange der Deckel sich wehrt, bevor er kippt. Siehe `deckelverlauf`. */
    deckelwiderstand: number;
    /** Wie weit der Deckel am Ende offen steht. Nie ganz 180. */
    deckelWinkelGrad: number;
    /** Wie träge der Buchkörper dem Deckel folgt. */
    koerpertraegheit: number;
    /** Wie lange das Buch braucht, um zur Ruhe zu kommen. */
    einrastenMs: number;
    einraststaerke: number;
    schattenstaerke: number;
    /** Wie weit der Schatten der Bewegung hinterherläuft, in Millisekunden. */
    schattenverzoegerungMs: number;
  };

  /** Das Blatt: was beim Blättern passiert. */
  seite: {
    /** Welcher Anteil der Seitenbreite ein volles Umblättern ist. */
    wegAnteil: number;
    /** Ab hier legt sich die Seite um, statt zurückzufallen. */
    schwelle: number;
    schnellMindestweg: number;
    schnellTempoPxProMs: number;
    /** Wie weit der Finger ziehen muss, bevor ein Blattwechsel beginnt. */
    totzonePx: number;
    kruemmung: number;
    /**
     * Wie weit sich ein Blatt höchstens dreht, in Grad.
     *
     * Auf dem Telefon sehr klein: Was man dort sieht, ist eine Seite, die
     * unter dem Finger zur Seite wandert – die vierzehn Grad geben ihr nur
     * Dicke. Eine echte Drehung braucht eine zweite Buchhälfte, auf die die
     * Seite fällt; auf einer einzelnen Seite dreht sich ein Rechteck ins
     * Nichts, und genau so sieht es dann auch aus.
     *
     * Auf einem iPad mit echter Doppelseite ist die Drehung wieder richtig –
     * deshalb ein Regler und keine feste Zahl.
     */
    maxWinkelGrad: number;
    /** Wie deutlich der Falz in der Mitte steht. */
    falzstaerke: number;
    schatten: number;
    /** Wie lange die Seite braucht, um zurückzufallen. */
    zurueckMs: number;
    /** Wie lange sie braucht, um sich umzulegen. */
    legenMs: number;
    federHaerte: number;
    federDaempfung: number;
  };

  /**
   * Wie weit die Oberfläche zurücktritt, wenn niemand etwas tut.
   *
   * Vier Zahlen für einen Gedanken: Nach welcher Stille wird es still, wie
   * still, wie langsam kommt die Stille und wie schnell geht sie wieder.
   */
  flaeche: {
    /** Nach wie vielen Millisekunden ohne Eingabe Ruhe eintritt. */
    ruheNachMs: number;
    /** Wie deutlich die Bedienelemente in Ruhe noch dastehen. Nie unter 0.12. */
    ruheDeckkraft: number;
    /** Wie lange das Zurücktreten dauert – darf langsam sein. */
    beruhigenMs: number;
    /** Wie lange das Zurückkommen dauert – muss schnell sein. */
    erscheinenMs: number;
  };

  /**
   * Die Charakterseite.
   *
   * Der Auftrag nennt die Regler, die es später am Gerät zu drehen gilt:
   * Informationsdichte, Hinweisstärke, Linien, Gold, Grundtiefe, Kontrast –
   * und für das Bildnis Größe, Fokus, Zoom, Schleier. Der Zuschnitt eines
   * *einzelnen* Bildnisses steht dagegen am Eintrag (`lib/bildnis.ts`), denn
   * er gehört zu diesem Bild und nicht zur Stimmung des Buches.
   *
   * Hier stehen die Werte, die für **alle** Figurenseiten gelten. Der
   * Unterschied ist der zwischen „Porträts sind mir zu dunkel" und „auf
   * diesem einen Bild sitzt das Gesicht zu tief".
   */
  figur: {
    /** Wie groß der Name über dem Bildnis steht, in Punkten. */
    namensgroesse: number;
    /** Wie deutlich die vier Kantenmarken sind. Die „Depth-Hint-Stärke". */
    hinweisstaerke: number;
    /** Wie kräftig die goldenen Linien und Zeichen sind. */
    goldstaerke: number;
    /** Wie deutlich feine Linien und Rahmenecken gezeichnet werden. */
    linienstaerke: number;
    /** Wie tief der Grund wirkt – verschiebt den Lichtkegel nach unten. */
    grundtiefe: number;
    /** Wie stark das Korn über dem Grund liegt. */
    kornstaerke: number;
  };

  haptik: {
    andeutung: boolean;
    verpflichtung: boolean;
    einrasten: boolean;
    heimkehr: boolean;
    /** Das Buch antwortet auf die Berührung. */
    beruehrung: boolean;
    /** Der Deckel geht auf. */
    oeffnen: boolean;
    /** Die Seite legt sich um. */
    blattFest: boolean;
    /** Die Seite kommt zur Ruhe. */
    blattRuht: boolean;
  };
}

export const VORGABE: Raumkonfig = {
  geste: {
    totzonePx: 6,
    randEinzugPx: 12,
    randBreitePx: 34,
    systemEinzugObenPx: 8,
    systemEinzugUntenPx: 28,
    wegAnteilWaagerecht: 0.45,
    wegAnteilSenkrecht: 0.26,
    andeutung: 0.15,
    verpflichtung: 0.5,
    schnellMindestweg: 0.26,
    schnellTempoPxProMs: 0.75,
    richtungssperrePx: 10,
    richtungstoleranzGrad: 38,
    aufgabewinkelGrad: 54,
    fremdwegPx: 96,
    hoechsteTiefe: 3,
  },
  bogen: {
    grundDeckkraft: 0,
    andeutungDeckkraft: 0.28,
    vollDeckkraft: 0.92,
    minBreitePx: 1,
    maxBreitePx: 2.2,
    maxEinzugAnteil: 0.52,
    weichzeichnenMinPx: 0,
    /*
     * Sieben.
     *
     * Zwölf standen im Bauplan und waren am Gerät sofort falsch – aber nur,
     * solange der Bogen eine Haarlinie war: Weichgezeichnet blieb davon ein
     * Schmier. Seit er ein Sichelkörper ist, ist Weichzeichnung genau das
     * Richtige, weil aus einer weichgezeichneten Fläche Licht wird und aus
     * einer weichgezeichneten Linie nichts. Der Wert stieg deshalb von vier
     * auf sieben zurück – ein gutes Beispiel dafür, dass eine Zahl hier ohne
     * das Bauteil daneben nichts bedeutet.
     */
    weichzeichnenMaxPx: 7,
    staerke: 1,
  },
  bewegung: {
    verpflichtenMs: 330,
    abbrechenMs: 240,
    heimkehrMs: 360,
    mitteSkalaMin: 0.985,
    mitteVersatzMaxPx: 10,
    federHaerte: 230,
    federDaempfung: 26,
    federMasse: 1,
  },
  doppeltipp: { abstandMs: 280, maxWegPx: 24 },
  langdruck: { dauerMs: 450, toleranzPx: 8 },

  /*
   * Alle Buch- und Seitenwerte sind **Startwerte zum Verwerfen.**
   *
   * Sie stammen aus dem Browser und nicht aus einem Daumen. Genau darum geht
   * es in dieser Runde: Sie am Gerät zu ersetzen.
   */
  buch: {
    hub: 6,
    skala: 1.012,
    gewicht: 0.6,
    oeffnenMs: 900,
    schliessenMs: 620,
    deckelwiderstand: 0.55,
    deckelWinkelGrad: 168,
    koerpertraegheit: 0.35,
    einrastenMs: 320,
    einraststaerke: 0.7,
    schattenstaerke: 0.75,
    schattenverzoegerungMs: 90,
  },
  seite: {
    wegAnteil: 0.55,
    schwelle: 0.42,
    schnellMindestweg: 0.16,
    schnellTempoPxProMs: 0.6,
    totzonePx: 10,
    kruemmung: 0.6,
    maxWinkelGrad: 14,
    falzstaerke: 0.55,
    schatten: 0.7,
    zurueckMs: 300,
    legenMs: 420,
    federHaerte: 210,
    federDaempfung: 34,
  },

  flaeche: {
    ruheNachMs: 2600,
    ruheDeckkraft: 0.34,
    beruhigenMs: 900,
    erscheinenMs: 160,
  },

  figur: {
    namensgroesse: 30,
    /*
     * 0.55 und nicht 1.0.
     *
     * Bei voller Stärke lesen sich die vier Marken als Beschriftungen eines
     * Rahmens, und damit sieht das Bildnis aus wie ein Feld in einem Formular
     * – genau das, was diese Seite nicht sein soll. Bei 0.55 sieht man sie,
     * wenn man hinsieht, und übersieht sie, wenn man das Gesicht ansieht.
     */
    hinweisstaerke: 0.55,
    goldstaerke: 0.85,
    linienstaerke: 0.7,
    grundtiefe: 0.5,
    kornstaerke: 0.5,
  },

  haptik: {
    andeutung: true,
    verpflichtung: true,
    einrasten: true,
    heimkehr: true,
    beruehrung: true,
    oeffnen: true,
    blattFest: true,
    blattRuht: true,
  },
};

/**
 * Vier Bücher, eine Engine.
 *
 * Kein zweites System – dieselben Regler, andere Zahlen. Das ist die Probe
 * darauf, ob die Gruppe `buch` wirklich beschreibt, was ein Buch schwer macht:
 * Wenn sich „ALT" von „LEICHT" nur durch Zahlen unterscheiden lässt, stimmen
 * die Regler. Wenn nicht, fehlt einer.
 */
export const BUCHVORLAGEN: Record<string, Partial<Raumkonfig>> = {
  LEICHT: {
    buch: {
      ...VORGABE.buch,
      gewicht: 0.22,
      oeffnenMs: 620,
      schliessenMs: 430,
      deckelwiderstand: 0.28,
      koerpertraegheit: 0.15,
      einrastenMs: 200,
      schattenstaerke: 0.5,
    },
    seite: { ...VORGABE.seite, wegAnteil: 0.45, zurueckMs: 220, legenMs: 300, federDaempfung: 26 },
  },
  NATÜRLICH: {},
  SCHWER: {
    buch: {
      ...VORGABE.buch,
      gewicht: 0.88,
      oeffnenMs: 1180,
      schliessenMs: 820,
      deckelwiderstand: 0.74,
      koerpertraegheit: 0.6,
      einrastenMs: 460,
      einraststaerke: 0.9,
      schattenstaerke: 0.9,
      schattenverzoegerungMs: 140,
    },
    seite: { ...VORGABE.seite, wegAnteil: 0.62, legenMs: 540, federDaempfung: 46, kruemmung: 0.7 },
  },
  /*
   * ALT ist nicht „zufällig".
   *
   * Ein altes Buch ist nicht unberechenbar, es ist *weich*: Der Einband hat
   * seine Steifigkeit verloren, das Papier ist müde, nichts schnappt mehr.
   * Also niedriger Widerstand, hohe Dämpfung, wenig Krümmung – und kein
   * Zufallsgenerator, der die Bewegung bei jedem Öffnen anders macht. Das wäre
   * nicht alt, das wäre kaputt.
   */
  ALT: {
    buch: {
      ...VORGABE.buch,
      gewicht: 0.72,
      oeffnenMs: 1050,
      deckelwiderstand: 0.34,
      koerpertraegheit: 0.5,
      einrastenMs: 420,
      einraststaerke: 0.35,
      schattenstaerke: 0.6,
    },
    seite: {
      ...VORGABE.seite,
      kruemmung: 0.34,
      falzstaerke: 0.4,
      zurueckMs: 420,
      legenMs: 520,
      federHaerte: 130,
      federDaempfung: 52,
    },
  },
};

/**
 * Vorlagen zum Vergleichen.
 *
 * Nicht vier Produkte, sondern vier Bewegungscharaktere derselben Bedienung.
 * Sie sind zum *Vergleichen* da: Man spürt den Unterschied zwischen ruhig und
 * antwortfreudig in fünf Sekunden und würde ihn über einzelne Regler in einer
 * halben Stunde nicht finden.
 */
export const VORLAGEN: Record<string, Partial<Raumkonfig>> = {
  RUHIG: {
    geste: { ...VORGABE.geste, andeutung: 0.2, verpflichtung: 0.56, schnellTempoPxProMs: 0.95 },
    bewegung: { ...VORGABE.bewegung, verpflichtenMs: 420, heimkehrMs: 440, federDaempfung: 32 },
    bogen: { ...VORGABE.bogen, staerke: 0.7 },
  },
  AUSGEWOGEN: {},
  ANTWORTFREUDIG: {
    geste: { ...VORGABE.geste, totzonePx: 4, andeutung: 0.11, verpflichtung: 0.42, schnellTempoPxProMs: 0.55 },
    bewegung: { ...VORGABE.bewegung, verpflichtenMs: 260, abbrechenMs: 190, heimkehrMs: 280, federDaempfung: 22 },
  },
  EXPERIMENTELL: {
    geste: { ...VORGABE.geste, totzonePx: 3, andeutung: 0.08, verpflichtung: 0.34, schnellMindestweg: 0.18, schnellTempoPxProMs: 0.45 },
    bewegung: { ...VORGABE.bewegung, verpflichtenMs: 220, heimkehrMs: 230, federHaerte: 300, federDaempfung: 20 },
    bogen: { ...VORGABE.bogen, staerke: 1.25, weichzeichnenMaxPx: 18 },
  },
};

/* ------------------------------------------------------------ Der Zugang -- */

const SCHLUESSEL = 'dragoncore-raumkonfig';

let aktuell: Raumkonfig = VORGABE;
const ohren = new Set<() => void>();

/** Die geltenden Werte. Während einer Geste sechzigmal je Sekunde gelesen. */
export function konfig(): Raumkonfig {
  return aktuell;
}

/**
 * Gruppenweise überlagern, nicht ersetzen.
 *
 * Zwei Ebenen tief und nicht mehr – die Konfiguration ist genau so gebaut. Ein
 * flaches `{...basis, ...teil}` würde eine ganze Gruppe austauschen: Wer im
 * Labor an der Totzone dreht, verlöre alle anderen Gestenwerte auf einmal.
 */
function verschmelze(basis: Raumkonfig, teil: Partial<Raumkonfig>): Raumkonfig {
  const alt = basis as unknown as Record<string, Record<string, unknown>>;
  const aus: Record<string, unknown> = { ...alt };
  for (const [gruppe, werte] of Object.entries(teil)) {
    if (!werte || typeof werte !== 'object') continue;
    aus[gruppe] = { ...(alt[gruppe] ?? {}), ...(werte as Record<string, unknown>) };
  }
  return aus as unknown as Raumkonfig;
}

/**
 * Werte ändern – aus dem Labor, sonst von nirgendwo.
 *
 * Gespeichert wird sofort. Wer auf dem Telefon eine gute Einstellung findet
 * und die Anwendung neu lädt, will sie wiederfinden.
 */
export function setzeKonfig(teil: Partial<Raumkonfig>): void {
  aktuell = verschmelze(aktuell, teil);
  /* Wer von Hand am Buch dreht, hat keinen Vorlagennamen mehr. */
  if (teil.buch || teil.seite) letzteBuchvorlage = 'eigen';
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(aktuell));
  } catch {
    /* Privater Modus – dann eben nur für diese Sitzung. */
  }
  for (const ohr of ohren) ohr();
}

export function setzeVorlage(name: string): void {
  aktuell = verschmelze(VORGABE, VORLAGEN[name] ?? {});
  /* Eine Bedienungsvorlage setzt auf die Vorgabe zurück – das Buch also auch. */
  letzteBuchvorlage = 'NATÜRLICH';
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(aktuell));
  } catch {
    /* still */
  }
  for (const ohr of ohren) ohr();
}

/**
 * Welcher Buchcharakter zuletzt gewählt wurde.
 *
 * Nur zum Anzeigen im Stimmzimmer. Er wird bewusst *nicht* gespeichert: Was
 * gilt, sind die Zahlen; der Name ist die Abkürzung, mit der man sie gesetzt
 * hat. Wer danach an einem Regler dreht, hat kein „SCHWER" mehr, sondern
 * etwas Eigenes – und genau das soll dann auch dastehen.
 */
let letzteBuchvorlage: string = 'NATÜRLICH';

export function buchvorlage(): string {
  return letzteBuchvorlage;
}

/**
 * Der Buchcharakter – die zweite Achse.
 *
 * Anders als `setzeVorlage` setzt das hier **nicht** alles zurück. Wie sich
 * ein Buch anfühlt und wie die Bedienung antwortet, sind zwei Fragen; wer den
 * Einband schwerer machen will, will nicht nebenbei seine Schwellenwerte
 * verlieren. Überlagert werden ausschließlich `buch` und `seite`.
 */
export function setzeBuchvorlage(name: string): void {
  const v = BUCHVORLAGEN[name];
  letzteBuchvorlage = name;
  /*
   * NATÜRLICH ist die leere Vorlage. Als reine Überlagerung wäre sie ein
   * Nichtstun – gemeint ist aber „zurück auf die Vorgabe", also wird sie hier
   * ausgeschrieben.
   */
  setzeKonfig({
    buch: v?.buch ?? VORGABE.buch,
    seite: v?.seite ?? VORGABE.seite,
  });
  /* Nach `setzeKonfig`, denn das setzt den Namen gerade auf „eigen". */
  letzteBuchvorlage = name;
}

export function beiKonfig(ohr: () => void): () => void {
  ohren.add(ohr);
  return () => ohren.delete(ohr);
}

/**
 * Gespeicherte Werte holen – vorsichtig.
 *
 * Feld für Feld über die Vorgabe gelegt, nicht ersetzt: Sonst fehlte nach
 * jedem neuen Regler in einer alten Speicherung ein Wert, und die Bedienung
 * stünde mit `undefined` als Schwelle da.
 */
export function ladeKonfig(): void {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return;
    const gelesen = JSON.parse(roh) as Partial<Raumkonfig>;
    aktuell = verschmelze(VORGABE, gelesen);
  } catch {
    aktuell = VORGABE;
  }
}

/** Für „Copy Interaction Config" im Labor. */
export function alsQuelltext(): string {
  return `export const interactionConfig = ${JSON.stringify(aktuell, null, 2)};\n`;
}
