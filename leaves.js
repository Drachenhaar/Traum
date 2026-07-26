function spawnLeaf(layerEl) {
  const leaf = document.createElement("div");
  leaf.className = "leaf";

  const startX = randomBetween(4, 92);
  const size = randomBetween(10, 17);
  const duration = randomBetween(9, 16);
  const drift = randomBetween(-70, 70);
  const rotateStart = randomBetween(-30, 30);
  const rotateEnd = rotateStart + randomBetween(120, 260) * (Math.random() < 0.5 ? -1 : 1);
  const hue = randomBetween(28, 42);

  leaf.style.left = startX + "%";
  leaf.style.width = size + "px";
  leaf.style.height = size * 0.7 + "px";
  leaf.style.setProperty("--drift", drift + "px");
  leaf.style.setProperty("--rotate-start", rotateStart + "deg");
  leaf.style.setProperty("--rotate-end", rotateEnd + "deg");
  leaf.style.background = `radial-gradient(ellipse at 35% 30%, hsla(${hue}, 55%, 55%, 0.9), hsla(${hue - 8}, 50%, 28%, 0.85))`;
  leaf.style.animationDuration = duration + "s";

  layerEl.appendChild(leaf);

  setTimeout(() => leaf.remove(), duration * 1000 + 200);
}

function startLeaves(layerEl) {
  if (!layerEl || prefersReducedMotion()) return;

  function scheduleNext() {
    setTimeout(() => {
      if (Math.random() < 0.85) spawnLeaf(layerEl);
      scheduleNext();
    }, randomDelayMs(5, 22));
  }

  scheduleNext();
}
