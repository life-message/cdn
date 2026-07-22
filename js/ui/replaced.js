import { watchDom } from "../utils/watch.js";

const ATTR = "data-replaced";

function initContainer(container) {
  if (container.dataset.switcherInited) return;
  container.dataset.switcherInited = "true";

  const buttons = container.querySelectorAll(`button[${ATTR}]`);
  const targets = container.querySelectorAll(`[${ATTR}]:not(button)`);

  function switchTo(value) {
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute(ATTR) === value);
    });

    targets.forEach((target) => {
      const isVisible = target.getAttribute(ATTR) === value;
      target.hidden = !isVisible;
      target.querySelectorAll("input, textarea, select").forEach((field) => {
        field.disabled = !isVisible;
      });
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => switchTo(btn.getAttribute(ATTR)));
  });

  const visibleTarget = Array.from(targets).find((t) => !t.hidden);
  const defaultValue = visibleTarget
    ? visibleTarget.getAttribute(ATTR)
    : buttons[0]?.getAttribute(ATTR);

  if (defaultValue) switchTo(defaultValue);
}

watchDom(`button[${ATTR}]`, (btn) => {
  const container = btn.closest("[data-switcher]") || btn.closest("form") || document.body;
  delete container.dataset.switcherInited;
  initContainer(container);
});
