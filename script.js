const world = document.getElementById("world");
const enterButton = document.getElementById("enterButton");
const bookText = document.getElementById("bookText");

enterButton.addEventListener("click", () => {
  world.classList.add("zoomed");
  enterButton.style.opacity = "0";
  enterButton.style.pointerEvents = "none";

  setTimeout(() => {
    bookText.classList.add("visible");
  }, 1600);
});
