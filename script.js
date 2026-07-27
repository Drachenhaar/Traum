const world = document.getElementById("world");
const worldStage = document.getElementById("worldStage");
const enterButton = document.getElementById("enterButton");
const orbLayer = document.getElementById("orbLayer");
const creatureLayer = document.getElementById("creatureLayer");
const fogLayer = document.getElementById("fogLayer");
const lightRayLayer = document.getElementById("lightRayLayer");
const waterRingLayer = document.getElementById("waterRingLayer");
const leafLayer = document.getElementById("leafLayer");
const menuToggle = document.getElementById("menuToggle");

const chronicle = new Chronicle();
const thoughtGarden = new ThoughtGarden();

const orbMessages = [
  "Es eilt nicht.",
  "Der Ort ist schon da.",
  "Manche Wege zeigen sich leise.",
  "Das Wasser erinnert sich.",
  "Das Buch wartet geduldig.",
  "Vielleicht genügt heute ein Blick."
];

function revealTextSequence() {
  const reveals = document.querySelectorAll(".reveal");

  reveals.forEach((element) => {
    const delay = Number(element.dataset.delay || 0);

    setTimeout(() => {
      element.classList.add("show");
    }, delay);
  });
}

function goToBook() {
  world.classList.add("zoomed");
  enterButton.classList.add("hide");

  setTimeout(() => {
    revealTextSequence();
  }, 1200);
}

function createOrb() {
  if (!orbLayer) return;

  const orb = document.createElement("div");
  orb.className = "orb";

  const x = 6 + Math.random() * 88;
  const y = 14 + Math.random() * 68;
  const size = 12 + Math.random() * 10;
  const duration = 9 + Math.random() * 7;
  const drift = Math.round(Math.random() * 90 - 45) + "px";

  orb.style.left = x + "%";
  orb.style.top = y + "%";
  orb.style.setProperty("--size", size + "px");
  orb.style.setProperty("--duration", duration + "s");
  orb.style.setProperty("--drift", drift);

  orbLayer.appendChild(orb);

  const speaks = Math.random() < 0.06;

  if (speaks) {
    const pastThought = Math.random() < 0.35 ? thoughtGarden.randomPast() : null;

    const message = document.createElement("div");
    message.className = "orb-message";
    message.textContent = pastThought
      ? pastThought.content
      : orbMessages[Math.floor(Math.random() * orbMessages.length)];
    message.style.left = x + "%";
    message.style.top = y + "%";

    orbLayer.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 7200);
  }

  setTimeout(() => {
    orb.remove();
  }, duration * 1000 + 500);
}

function startOrbs() {
  createOrb();
  setInterval(createOrb, 1700);
}

document.addEventListener("DOMContentLoaded", () => {
  const worldStageController = initWorldStage(worldStage, world);
  worldStageController.setImage(loadCurrentPlace().backgroundSrc);

  enterButton.addEventListener("click", goToBook);
  startOrbs();

  startPresenceTracking(chronicle);
  initThoughtInput(thoughtGarden, chronicle);
  initCreatures(creatureLayer, waterRingLayer, chronicle);
  initMenuToggle(menuToggle);
  initBook(thoughtGarden, worldStageController);

  initFog(fogLayer);
  initLightRays(lightRayLayer);
  startWaterRings(waterRingLayer);
  startLeaves(leafLayer);
});

// Verhindert Pinch-Zoom-Gesten auf der Szene (Safari feuert "gesturestart"
// zusätzlich zu den Touch-Events), damit nichts versehentlich verschoben
// oder gezoomt wird.
document.addEventListener("gesturestart", (e) => e.preventDefault());
