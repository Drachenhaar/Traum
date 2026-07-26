const CREATURES = [
  { className: "creature-koi", src: "assets/creatures/koi.png", revealAfterSeconds: 180 },
  { className: "creature-dragonfly", src: "assets/creatures/dragonfly.png", revealAfterSeconds: 300 },
  { className: "creature-bird", src: "assets/creatures/bird.png", revealAfterSeconds: 600 }
];

function initCreatures(layerEl) {
  if (!layerEl) return;

  const start = Date.now();

  CREATURES.forEach((creature) => {
    const img = document.createElement("img");
    img.src = creature.src;
    img.alt = "";
    img.className = `creature ${creature.className}`;

    // Solange kein Artwork unter assets/creatures/ liegt, verschwindet das
    // Element einfach wieder, statt als kaputtes Bild sichtbar zu bleiben.
    img.addEventListener("error", () => img.remove());

    layerEl.appendChild(img);

    const alreadyElapsed = (Date.now() - start) / 1000;
    const remainingDelay = Math.max(0, creature.revealAfterSeconds - alreadyElapsed) * 1000;

    setTimeout(() => img.classList.add("show"), remainingDelay);
  });
}
