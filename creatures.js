const CREATURE_DEFS = [
  { className: "creature-koi", src: "assets/creatures/koi.png", revealAfterSeconds: 180 },
  { className: "creature-dragonfly", src: "assets/creatures/dragonfly.png", revealAfterSeconds: 300 },
  { className: "creature-bird", src: "assets/creatures/bird.png", revealAfterSeconds: 600 }
];

const DRAGONFLY_ZONES = [
  { xMin: 6, xMax: 24, yMin: 50, yMax: 74 },
  { xMin: 76, xMax: 93, yMin: 48, yMax: 70 }
];

function pickPointInZone(zone) {
  return { x: randomBetween(zone.xMin, zone.xMax), y: randomBetween(zone.yMin, zone.yMax) };
}

function pickZone(zones) {
  return zones[Math.floor(Math.random() * zones.length)];
}

// Der Koi schwimmt in unregelmäßigen Etappen innerhalb einer Wasserzone,
// taucht dann ab (wird blasser/unschärfer, als wäre er tiefer im Wasser)
// und erscheint nach einer Pause an anderer Stelle wieder – begleitet von
// Wasserringen beim Ab- und Auftauchen.
function runKoi(imgEl, waterRingLayer) {
  let alive = true;

  function reduced() {
    return prefersReducedMotion();
  }

  function cycle() {
    if (!alive) return;

    const zone = pickZone(WATER_ZONES);
    const point = pickPointInZone(zone);

    placeInstantly(imgEl, point.x, point.y);
    imgEl.classList.remove("diving");
    requestAnimationFrame(() => imgEl.classList.add("show"));
    spawnWaterRing(waterRingLayer, point.x, point.y);

    if (reduced()) {
      setTimeout(() => {
        if (!alive) return;
        imgEl.classList.remove("show");
        setTimeout(cycle, randomDelayMs(40, 90));
      }, randomDelayMs(20, 35));
      return;
    }

    const swims = 2 + Math.floor(Math.random() * 3);
    let step = 0;

    function swimStep() {
      if (!alive) return;

      if (step >= swims) {
        setTimeout(() => {
          if (!alive) return;
          imgEl.classList.add("diving");
          const curX = parseFloat(imgEl.style.left);
          const curY = parseFloat(imgEl.style.top);
          spawnWaterRing(waterRingLayer, curX, curY);
          setTimeout(cycle, randomDelayMs(20, 70));
        }, randomDelayMs(2, 5));
        return;
      }

      step += 1;
      const next = pickPointInZone(zone);
      const duration = randomBetween(6, 13);
      imgEl.style.setProperty("--move-duration", duration + "s");
      imgEl.style.left = next.x + "%";
      imgEl.style.top = next.y + "%";

      setTimeout(swimStep, duration * 1000 + randomDelayMs(1, 4));
    }

    swimStep();
  }

  cycle();
  return {
    stop() {
      alive = false;
    }
  };
}

// Die Libelle erscheint selten, macht ein paar kurze, schnelle Sprünge mit
// Schwebepausen dazwischen und verschwindet danach wieder für eine Weile.
function runDragonfly(imgEl) {
  let alive = true;

  function cycle() {
    if (!alive) return;

    const zone = pickZone(DRAGONFLY_ZONES);
    const start = pickPointInZone(zone);
    placeInstantly(imgEl, start.x, start.y);

    if (prefersReducedMotion()) {
      requestAnimationFrame(() => imgEl.classList.add("show"));
      setTimeout(() => {
        if (!alive) return;
        imgEl.classList.remove("show");
        setTimeout(cycle, randomDelayMs(60, 120));
      }, randomDelayMs(10, 18));
      return;
    }

    requestAnimationFrame(() => imgEl.classList.add("show"));

    const dashes = 2 + Math.floor(Math.random() * 3);
    let step = 0;

    function dash() {
      if (!alive) return;

      if (step >= dashes) {
        setTimeout(() => {
          if (!alive) return;
          imgEl.classList.remove("show");
          setTimeout(cycle, randomDelayMs(25, 90));
        }, randomDelayMs(1, 3));
        return;
      }

      step += 1;
      const point = pickPointInZone(zone);
      const dashDuration = randomBetween(0.5, 1.1);
      imgEl.style.setProperty("--move-duration", dashDuration + "s");
      imgEl.style.left = point.x + "%";
      imgEl.style.top = point.y + "%";

      setTimeout(dash, dashDuration * 1000 + randomDelayMs(1.5, 4));
    }

    setTimeout(dash, randomDelayMs(0.5, 1.5));
  }

  cycle();
  return {
    stop() {
      alive = false;
    }
  };
}

// Der Vogel zieht selten in einem weichen Bogen durch den Himmel und ist
// den Rest der Zeit nicht zu sehen.
function runBird(imgEl) {
  let alive = true;

  function flight() {
    if (!alive) return;

    const fromLeft = Math.random() < 0.5;
    const startX = fromLeft ? -8 : 100;
    const endX = fromLeft ? 100 : -8;
    const y = randomBetween(6, 22);
    const midY = y + randomBetween(-4, 4);

    imgEl.style.transform = fromLeft ? "scaleX(1)" : "scaleX(-1)";
    placeInstantly(imgEl, startX, y);

    const duration = prefersReducedMotion() ? randomBetween(28, 36) : randomBetween(14, 22);

    requestAnimationFrame(() => {
      imgEl.classList.add("show");
      imgEl.style.setProperty("--move-duration", duration + "s");
      imgEl.style.left = endX + "%";
      imgEl.style.top = midY + "%";

      setTimeout(() => {
        if (!alive) return;
        imgEl.classList.remove("show");
        setTimeout(flight, randomDelayMs(90, 240));
      }, duration * 1000);
    });
  }

  setTimeout(flight, randomDelayMs(20, 90));
  return {
    stop() {
      alive = false;
    }
  };
}

function initCreatures(layerEl, waterRingLayer) {
  if (!layerEl) return;

  const start = Date.now();

  CREATURE_DEFS.forEach((creature) => {
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

    setTimeout(() => {
      if (creature.className === "creature-koi") runKoi(img, waterRingLayer);
      else if (creature.className === "creature-dragonfly") runDragonfly(img);
      else if (creature.className === "creature-bird") runBird(img);
    }, remainingDelay);
  });
}
