const PLACES = [
  {
    id: "see",
    name: "Der stille See",
    description: "Wo alles begann.",
    backgroundSrc: "assets/backgrounds/DC9D9291-52A5-43BA-9F8B-A3D1960C30E2.png",
    available: true
  },
  {
    id: "bibliothek",
    name: "Die Bibliothek",
    description: "Entsteht noch.",
    backgroundSrc: "assets/backgrounds/library.jpg",
    available: false
  },
  {
    id: "tal",
    name: "Das Tal",
    description: "Entsteht noch.",
    backgroundSrc: "assets/backgrounds/valley.jpg",
    available: false
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
