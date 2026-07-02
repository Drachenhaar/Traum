alert("Dragoncore JS läuft");

document.addEventListener("DOMContentLoaded", () => {
  const enterButton = document.getElementById("enterButton");

  enterButton.addEventListener("click", () => {
    goToBook();
  });

  startOrbs();
});
