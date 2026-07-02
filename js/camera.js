function goToBook() {
  const world = document.getElementById("world");
  const enterButton = document.getElementById("enterButton");

  world.classList.add("zoomed");
  enterButton.classList.add("hide");

  setTimeout(() => {
    revealTextSequence();
  }, 2300);
}
