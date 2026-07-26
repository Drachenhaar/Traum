// Zonen mit offenem Wasser (in % von Breite/Höhe), abgestimmt auf das
// Hintergrundbild: links und rechts vom Buch, nicht darüber.
const WATER_ZONES = [
  { xMin: 7, xMax: 32, yMin: 47, yMax: 63 },
  { xMin: 66, xMax: 91, yMin: 45, yMax: 61 }
];

function randomWaterPoint() {
  const zone = WATER_ZONES[Math.floor(Math.random() * WATER_ZONES.length)];
  return {
    x: randomBetween(zone.xMin, zone.xMax),
    y: randomBetween(zone.yMin, zone.yMax)
  };
}

function spawnWaterRing(layerEl, x, y) {
  if (!layerEl) return;

  const ring = document.createElement("div");
  ring.className = "water-ring";
  ring.style.left = x + "%";
  ring.style.top = y + "%";

  const duration = randomBetween(3.5, 5.8);
  const scale = randomBetween(5, 9);
  ring.style.setProperty("--ring-duration", duration + "s");
  ring.style.setProperty("--ring-scale", scale);

  layerEl.appendChild(ring);
  setTimeout(() => ring.remove(), duration * 1000 + 100);
}

function startWaterRings(layerEl) {
  if (!layerEl || prefersReducedMotion()) return;

  function scheduleNext() {
    setTimeout(() => {
      const point = randomWaterPoint();
      spawnWaterRing(layerEl, point.x, point.y);
      scheduleNext();
    }, randomDelayMs(6, 16));
  }

  scheduleNext();
}
