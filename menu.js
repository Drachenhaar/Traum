function initMenuToggle(buttonEl) {
  if (!buttonEl) return;

  buttonEl.addEventListener("click", () => {
    document.body.classList.toggle("ui-minimal");
  });
}
