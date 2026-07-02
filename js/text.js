function revealTextSequence() {
  const sequence = [
    { selector: "#title", delay: 0 },
    { selector: "#line1", delay: 2600 },
    { selector: "#line2", delay: 6200 },
    { selector: "#line3", delay: 10400 },
    { selector: "#openBookButton", delay: 14200 }
  ];

  sequence.forEach((item) => {
    const element = document.querySelector(item.selector);
    if (!element) return;

    setTimeout(() => {
      element.classList.add("show");
    }, item.delay);
  });
}
