import { watchDom } from "../utils/watch.js";

const ATTR = "data-replaced";

const AnimationManager = {
  addInAnimation(target, anims) {
    anims.forEach(cls => target.classList.add(`${cls}-in`));
    setTimeout(() => anims.forEach(cls => target.classList.remove(`${cls}-in`)), 300);
  },

  addOutAnimation(target, anims, onComplete) {
    anims.forEach(cls => target.classList.add(`${cls}-out`));
    setTimeout(() => {
      anims.forEach(cls => target.classList.remove(`${cls}-out`));
      if (onComplete) onComplete();
    }, 300);
  },

  toggleFields(target, disabled) {
    target.querySelectorAll("input, textarea, select").forEach(f => f.disabled = disabled);
  }
};

function initContainer(container) {
  if (container.dataset.switcherInited) return;
  container.dataset.switcherInited = "true";

  const buttons = container.querySelectorAll(`button[${ATTR}]`);
  const targets = container.querySelectorAll(`[${ATTR}]:not(button)`);

  function switchTo(value) {
    const activeBtn = Array.from(buttons).find(btn => btn.getAttribute(ATTR).split(' ')[0] === value);
    const anims = activeBtn ? activeBtn.getAttribute(ATTR).split(' ').slice(1) : [];

    buttons.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute(ATTR).split(' ')[0] === value);
    });

    targets.forEach(target => {
      const isVisible = target.getAttribute(ATTR).split(' ')[0] === value;

      if (isVisible) {
        target.hidden = false;
        AnimationManager.addInAnimation(target, anims);
        AnimationManager.toggleFields(target, false);
      } else {
        AnimationManager.toggleFields(target, true);
        AnimationManager.addOutAnimation(target, anims, () => {
          target.hidden = true;
        });
      }
    });
  }

  buttons.forEach(btn => {
    btn.addEventListener("click", () => switchTo(btn.getAttribute(ATTR).split(' ')[0]));
  });

  const visibleTarget = Array.from(targets).find(t => !t.hidden);
  const defaultValue = visibleTarget
    ? visibleTarget.getAttribute(ATTR).split(' ')[0]
    : buttons[0]?.getAttribute(ATTR).split(' ')[0];

  if (defaultValue) switchTo(defaultValue);
}

watchDom(`button[${ATTR}]`, (btn) => {
  const container = btn.closest("[data-switcher]") || btn.closest("form") || document.body;
  delete container.dataset.switcherInited;
  initContainer(container);
});
