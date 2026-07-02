const openBookButton = document.getElementById("openBook");
const closeBookButton = document.getElementById("closeBook");
const bookPage = document.getElementById("bookPage");

openBookButton.addEventListener("click", () => {
  bookPage.classList.add("open");
});

closeBookButton.addEventListener("click", () => {
  bookPage.classList.remove("open");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    bookPage.classList.remove("open");
  }
});
