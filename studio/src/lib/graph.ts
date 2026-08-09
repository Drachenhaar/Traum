/**
 * Kräftesimulation für den Weltgraphen.
 *
 * Bewusst selbst geschrieben statt einer Bibliothek: so bleibt genau das drin,
 * was gebraucht wird – und die Abstoßung läuft über ein räumliches Raster
 * statt über alle Paare. Damit bleibt die Berechnung auch bei mehreren tausend
 * Knoten flüssig, statt quadratisch zu wachsen.
 */

export interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radius – ergibt sich aus der Zahl der Verbindungen */
  r: number;
  color: string;
  label: string;
  type: string;
  /** Vom Nutzer festgehalten (gezogen) */
  pinned?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  color: string;
  label: string;
}

interface SimOptions {
  /** Ideale Kantenlänge */
  linkDistance: number;
  /** Stärke der Abstoßung */
  charge: number;
  /** Zug zur Mitte */
  gravity: number;
}

const DEFAULTS: SimOptions = { linkDistance: 132, charge: 3200, gravity: 0.010 };

export class GraphSimulation {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  alpha = 1;
  private byId = new Map<string, GraphNode>();
  private options: SimOptions;

  constructor(options: Partial<SimOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  /**
   * Daten setzen. Bereits bekannte Knoten behalten ihre Position – so springt
   * das Bild nicht, wenn ein einzelner Eintrag hinzukommt.
   */
  setData(nodes: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy'>[], edges: GraphEdge[]): void {
    const previous = this.byId;
    const next = new Map<string, GraphNode>();
    const count = nodes.length;

    this.nodes = nodes.map((n, i) => {
      const old = previous.get(n.id);
      if (old) {
        const merged = { ...old, ...n };
        next.set(n.id, merged);
        return merged;
      }
      /*
       * Neue Knoten starten auf einer Spirale – das sieht ruhiger aus als
       * Zufall, und der goldene Winkel verteilt sie gleichmaessig.
       *
       * Der Radius haengt an `linkDistance` und nicht an einer festen Zahl.
       * Das ist kein Schoenheitsdetail: Die Abstossung rechnet ueber ein
       * raeumliches Raster mit der Zellbreite `linkDistance * 2.2`. Lagen alle
       * Knoten anfangs in ein, zwei Zellen, half das Raster ueberhaupt nicht –
       * die ersten Ticks kosteten dann quadratisch viel, und genau die
       * ersten sind die teuersten. Von Anfang an ungefaehr so weit gestreut
       * wie am Ende, greift das Raster ab dem ersten Tick.
       */
      const angle = i * 2.399963; // goldener Winkel
      const radius = 30 + 0.55 * this.options.linkDistance * Math.sqrt(i + 1) + count * 0.05;
      const node: GraphNode = {
        ...n,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      };
      next.set(n.id, node);
      return node;
    });

    this.byId = next;
    this.edges = edges.filter((e) => next.has(e.source) && next.has(e.target));
    this.alpha = 1;
  }

  node(id: string): GraphNode | undefined {
    return this.byId.get(id);
  }

  /** Ein Simulationsschritt. Gibt zurück, ob sich noch nennenswert etwas bewegt. */
  tick(): boolean {
    const { linkDistance, charge, gravity } = this.options;
    const nodes = this.nodes;
    const n = nodes.length;
    if (n === 0) return false;

    const alpha = this.alpha;

    // --- Abstoßung über ein räumliches Raster ----------------------------
    // Nur Knoten in benachbarten Zellen stoßen sich ab. Weiter entfernte
    // Kräfte sind ohnehin vernachlässigbar, kosten aber am meisten Rechenzeit.
    const cell = linkDistance * 2.2;
    /*
     * Zahlenschluessel statt `"3,-7"`.
     *
     * Vierhundert Zeichenketten je Tick, vierhundertzwanzig Ticks: Das sind
     * hunderttausend Zeichenketten, die nur entstehen, um sofort wieder
     * weggeworfen zu werden – und jede davon muss der Speicherbereiniger
     * wieder einsammeln. Ein Zahlenschluessel ist derselbe Gedanke ohne die
     * Zeichenketten. Der Versatz haelt negative Koordinaten positiv, der
     * Faktor haelt Zeilen auseinander.
     */
    const grid = new Map<number, GraphNode[]>();
    const schluessel = (x: number, y: number) =>
      (Math.floor(x / cell) + 20000) * 40000 + Math.floor(y / cell) + 20000;

    for (const node of nodes) {
      const key = schluessel(node.x, node.y);
      const bucket = grid.get(key);
      if (bucket) bucket.push(node);
      else grid.set(key, [node]);
    }

    for (const node of nodes) {
      const cx = Math.floor(node.x / cell);
      const cy = Math.floor(node.y / cell);
      for (let ix = cx - 1; ix <= cx + 1; ix++) {
        for (let iy = cy - 1; iy <= cy + 1; iy++) {
          const bucket = grid.get((ix + 20000) * 40000 + iy + 20000);
          if (!bucket) continue;
          for (const other of bucket) {
            if (other === node) continue;
            let dx = node.x - other.x;
            let dy = node.y - other.y;
            let dist2 = dx * dx + dy * dy;
            if (dist2 === 0) {
              // Exakt übereinander – minimal auseinanderschieben.
              dx = (Math.random() - 0.5) * 0.6;
              dy = (Math.random() - 0.5) * 0.6;
              dist2 = dx * dx + dy * dy;
            }
            if (dist2 > cell * cell) continue;
            const force = (charge * alpha) / dist2;
            node.vx += dx * force * 0.0022;
            node.vy += dy * force * 0.0022;

            // Harte Trennung: Knoten dürfen sich nie überlappen, sonst werden
            // die Beschriftungen unlesbar.
            const minDist = node.r + other.r + 26;
            const dist = Math.sqrt(dist2);
            if (dist < minDist) {
              const push = ((minDist - dist) / dist) * 0.5;
              node.vx += dx * push;
              node.vy += dy * push;
            }
          }
        }
      }
    }

    // --- Federn entlang der Kanten ---------------------------------------
    for (const edge of this.edges) {
      const a = this.byId.get(edge.source);
      const b = this.byId.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const target = linkDistance + a.r + b.r;
      const force = ((dist - target) / dist) * alpha * 0.09;
      const fx = dx * force;
      const fy = dy * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // --- Zur Mitte ziehen und bewegen ------------------------------------
    let movement = 0;
    for (const node of nodes) {
      if (node.pinned) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx -= node.x * gravity * alpha;
      node.vy -= node.y * gravity * alpha;

      node.vx *= 0.82;
      node.vy *= 0.82;

      node.x += node.vx;
      node.y += node.vy;
      movement += Math.abs(node.vx) + Math.abs(node.vy);
    }

    this.alpha *= 0.991;
    if (this.alpha < 0.005) this.alpha = 0;

    return this.alpha > 0 && movement / n > 0.008;
  }

  /** Simulation neu anstoßen (nach Ziehen oder Filterwechsel). */
  reheat(value = 0.6): void {
    this.alpha = Math.max(this.alpha, value);
  }

  /** Umschließendes Rechteck aller Knoten – zum Einpassen der Ansicht. */
  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (!this.nodes.length) return { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of this.nodes) {
      minX = Math.min(minX, n.x - n.r);
      minY = Math.min(minY, n.y - n.r);
      maxX = Math.max(maxX, n.x + n.r);
      maxY = Math.max(maxY, n.y + n.r);
    }
    return { minX, minY, maxX, maxY };
  }
}

/** Knoten im Umkreis von `depth` Schritten – für den Fokusmodus. */
export function neighbourhood(
  neighbours: Map<string, Set<string>>,
  startId: string,
  depth: number,
): Set<string> {
  const result = new Set<string>([startId]);
  let frontier = [startId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const other of neighbours.get(id) ?? []) {
        if (!result.has(other)) {
          result.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return result;
}
