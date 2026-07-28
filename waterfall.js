// Position der beiden gemalten Wasserfälle im See-Bild (in % von
// Breite/Höhe), von Hand am Originalbild vermessen.
const WATERFALL_SPOTS = [
  { left: 15.2, top: 32.6, width: 11.5, height: 21.6 },
  { left: 65.6, top: 33.9, width: 14.5, height: 24.3 }
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
