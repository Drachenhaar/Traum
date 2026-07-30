document.addEventListener("DOMContentLoaded", () => {
  const kasse = new Kasse();
  const toolkit = new Toolkit();

  initKasseUI(kasse);
  initToolkitUI(toolkit);
  renderKasseBook(kasse);
  renderToolkitBook(toolkit);

  const appTabs = document.querySelectorAll(".app-tab");
  const appSections = {
    kasse: document.getElementById("appKasseSection"),
    toolkit: document.getElementById("appToolkitSection")
  };

  appTabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      appTabs.forEach((b) => b.classList.toggle("active", b === btn));
      Object.entries(appSections).forEach(([key, el]) => {
        if (el) el.classList.toggle("active", key === btn.dataset.appTab);
      });
    });
  });
});
