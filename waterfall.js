// Einzelne Wasser-Stränge der beiden gemalten Wasserfälle im See-Bild
// (in % von Breite/Höhe). Statt eines groben Rechtecks pro Wasserfall
// folgt je ein schmaler Streifen genau einem sichtbaren Strang – per
// Spalten-Helligkeitsprofil am Originalbild vermessen (nicht nur nach
// Auge geschätzt).
const WATERFALL_SPOTS = [
  { left: 16.6, top: 32.5, width: 1.4, height: 16.6 },
  { left: 18.2, top: 33.1, width: 3.1, height: 22.7 },
  { left: 21.8, top: 33.4, width: 1.6, height: 17.4 },
  { left: 64.4, top: 36.7, width: 4.3, height: 22.6 },
  { left: 69.6, top: 33.4, width: 5.6, height: 26.4 },
  { left: 75.8, top: 33.1, width: 1.9, height: 26.3 }
];

function startWaterfalls(layerEl) {
  if (!layerEl) return { stop() {} };

  layerEl.innerHTML = "";
  const reduced = prefersReducedMotion();

  WATERFALL_SPOTS.forEach((spot) => {
    const el = document.createElement("div");
    el.className = "waterfall-stream";
    el.style.left = spot.left + "%";
    el.style.top = spot.top + "%";
    el.style.width = spot.width + "%";
    el.style.height = spot.height + "%";

    if (reduced) {
      el.style.animation = "none";
    }

    layerEl.appendChild(el);
  });

  return {
    stop() {
      layerEl.innerHTML = "";
    }
  };
}
