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
     * Wie weit gezogen werden muss, damit `fortschritt` 1 erreicht – als
     * Anteil der Bildschirmkante entlang der Achse.
     *
     * Zusammen mit `verpflichtung` ergibt das die tatsächliche Strecke: bei
     * 0.45 und 0.5 sind das auf einem 390 Punkte breiten Telefon etwa 88
     * Punkte bis zur Schwelle. Zwei Regler statt einem, weil sie
     * Verschiedenes bedeuten – der eine, wie schnell der Bogen wächst, der
     * andere, wann er kippt.
     */
    wegAnteil: number;

    /** Ab hier erkennt Dragoncore die Richtung. Erster Tick. */
    andeutung: number;
    /** Ab hier öffnet ein Loslassen den Raum. Zweiter, klarerer Tick. */
    verpflichtung: number;

    /** Ein kurzer, schneller Wisch genügt statt des vollen Wegs. */
    schnellMindestweg: number;
    schnellTempoPxProMs: number;

    /** Ab welcher Strecke die Richtung festgelegt wird. */
    richtungssperrePx: number;
    /** Wie schief die Bewegung dabei sein darf. */
    richtungstoleranzGrad: number;

    /** Mehr Ebenen als drei gibt es nicht. Siehe `useRaum.ts`. */
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

  haptik: {
    andeutung: boolean;
    verpflichtung: boolean;
    einrasten: boolean;
    heimkehr: boolean;
  };
}

export const VORGABE: Raumkonfig = {
  geste: {
    totzonePx: 6,
    randEinzugPx: 12,
    randBreitePx: 34,
    wegAnteil: 0.45,
    andeutung: 0.15,
    verpflichtung: 0.5,
    schnellMindestweg: 0.26,
    schnellTempoPxProMs: 0.75,
    richtungssperrePx: 10,
    richtungstoleranzGrad: 25,
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
     * Vier statt zwölf.
     *
     * Zwölf Punkte Weichzeichnung standen im Bauplan als Startwert und waren
     * am Gerät sofort falsch: auf eine 1,6 Punkte breite Linie angewandt
     * bleibt davon kein Bogen übrig, sondern ein Hauch. Der Regler geht
     * weiterhin bis dreißig – wer ihn dorthin schiebt, sieht, warum er hier
     * tiefer steht.
     */
    weichzeichnenMaxPx: 4,
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
  haptik: { andeutung: true, verpflichtung: true, einrasten: true, heimkehr: true },
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
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(aktuell));
  } catch {
    /* Privater Modus – dann eben nur für diese Sitzung. */
  }
  for (const ohr of ohren) ohr();
}

export function setzeVorlage(name: string): void {
  aktuell = verschmelze(VORGABE, VORLAGEN[name] ?? {});
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(aktuell));
  } catch {
    /* still */
  }
  for (const ohr of ohren) ohr();
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
