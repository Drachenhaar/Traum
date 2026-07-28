const PLACES = [
  {
    id: "see",
    name: "Der stille See",
    description: "Wo alles begann.",
    backgroundSrc: "assets/backgrounds/DC9D9291-52A5-43BA-9F8B-A3D1960C30E2.png",
    available: true,
    effects: {
      fog: true,
      rays: true,
      leaves: true,
      waterShimmer: true,
      waterRings: true,
      waterfall: true,
      koi: true,
      dragonfly: true,
      bird: true
    }
  },
  {
    id: "bibliothek",
    name: "Die Bibliothek",
    description: "Wo Wissen wächst.",
    backgroundSrc: "assets/backgrounds/library.png",
    available: true,
    // Innenraum ohne Wasser – hier bleibt nur das Ambiente der Orbs.
    effects: {}
  },
  {
    id: "tal",
    name: "Das Tal",
    description: "Wo etwas Großes ruht.",
    backgroundSrc: "assets/backgrounds/valley.png",
    available: true,
    // Weites Bergtal: Nebel, Licht, Blätter und ein seltener Vogel passen;
    // kein stiller See, also keine Wasserringe/Koi/Libelle.
    effects: {
      fog: true,
      rays: true,
      leaves: true,
      bird: true
    }
  },
  {
    id: "gedankenkuppel",
    name: "Die Gedankenkuppel",
    description: "Wo Gedanken zur Ruhe kommen.",
    backgroundSrc: "assets/backgrounds/thoughtdome.png",
    available: true,
    // Der gemalte Sternenhimmel und die Lichtpunkte sind schon im Bild –
    // die Orbs allein tragen die Stimmung hier am besten.
    effects: {}
  }
];

const CURRENT_PLACE_KEY = "dragoncore_current_place";

function getPlaceById(id) {
  return PLACES.find((place) => place.id === id) || PLACES[0];
}

function loadCurrentPlace() {
  try {
    const id = localStorage.getItem(CURRENT_PLACE_KEY);
    return getPlaceById(id);
  } catch (e) {
    return PLACES[0];
  }
}

function saveCurrentPlace(id) {
  try {
    localStorage.setItem(CURRENT_PLACE_KEY, id);
  } catch (e) {
    console.warn("Ort konnte nicht gespeichert werden", e);
  }
}
