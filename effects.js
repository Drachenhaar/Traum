// Schaltet die Atmosphäre-Effekte (Nebel, Lichtstrahlen, Wasser, Wesen,
// Blätter) passend zum jeweiligen Ort ein und aus. Vorher liefen diese
// Effekte immer, unabhängig vom gewählten Ort – in der Bibliothek oder der
// Gedankenkuppel ergab das keinen Sinn (Koi in einer Bücherwand ...).
function createEffectsController(layers, chronicle) {
  let active = null;

  function stopAll() {
    if (!active) return;
    Object.values(active).forEach((handle) => {
      if (handle && typeof handle.stop === "function") handle.stop();
    });
    active = null;
  }

  function applyPlace(place) {
    stopAll();

    const cfg = (place && place.effects) || {};
    const next = {};

    if (cfg.fog) next.fog = startFog(layers.fogLayer);
    if (cfg.rays) next.rays = startLightRays(layers.lightRayLayer);
    if (cfg.waterRings) next.waterRings = startWaterRings(layers.waterRingLayer);
    if (cfg.waterfall) next.waterfall = startWaterfalls(layers.waterfallLayer);
    if (cfg.leaves) next.leaves = startLeaves(layers.leafLayer);
    if (cfg.koi || cfg.dragonfly || cfg.bird) {
      next.creatures = startCreatures(layers.creatureLayer, layers.waterRingLayer, chronicle, cfg);
    }

    if (layers.waterShimmerEl) {
      layers.waterShimmerEl.style.display = cfg.waterShimmer ? "" : "none";
    }

    active = next;
  }

  return { applyPlace, stopAll };
}
