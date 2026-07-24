import { watchDom } from "../utils/watch.js";

const ATTR = "data-replaced";

const parse = (el) => {
  const [value, ...anims] = (el?.getAttribute(ATTR) || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return { value: value || "", anims };
};

const getContainer = (el) =>
  el.closest("[data-switcher]") || document.body;

async function play(el, anims, phase, token, keep = false) {
  if (el._animClasses) el.classList.remove(...el._animClasses);

  const classes = anims.map((name) => `${name}-${phase}`);
  el._animClasses = classes.length ? classes : null;

  if (!classes.length) return true;

  void el.offsetWidth;

  const before = new Set(el.getAnimations?.() || []);

  el.classList.add(...classes);
  void el.offsetWidth;

  await new Promise((resolve) => requestAnimationFrame(resolve));

  if (el._token !== token) return false;

  const active = (el.getAnimations?.() || []).filter((animation) => {
    const timing = animation.effect?.getComputedTiming?.();
    return !before.has(animation) && timing && Number.isFinite(timing.endTime);
  });

  if (active.length) {
    await Promise.allSettled(active.map((animation) => animation.finished));
  }

  if (el._token !== token) return false;

  if (!keep) {
    el.classList.remove(...classes);
    if (el._animClasses === classes) el._animClasses = null;
  }

  return true;
}

function toggleFields(target, disabled) {
  target.querySelectorAll("input, textarea, select").forEach((field) => {
    field.disabled = disabled;
  });
}

async function switchTo(container, value, animate, forceAnims) {
  const buttons = [...container.querySelectorAll(`button[${ATTR}]`)];
  const targets = [...container.querySelectorAll(`[${ATTR}]:not(button)`)];

  const activeBtn = buttons.find((btn) => parse(btn).value === value);
  const openAnims = forceAnims ?? (activeBtn ? parse(activeBtn).anims : []);

  buttons.forEach((btn) => {
    btn.classList.toggle("active", parse(btn).value === value);
  });

  await Promise.all(
    targets.map(async (target) => {
      const token = Symbol();
      target._token = token;

      if (target._animClasses) {
        target.classList.remove(...target._animClasses);
        target._animClasses = null;
      }

      const show = parse(target).value === value;

      if (show) {
        target._anims = openAnims;
        target.hidden = false;
        toggleFields(target, false);

        if (animate) {
          await play(target, openAnims, "in", token);
        }
      } else {
        toggleFields(target, true);

        const ok =
          animate && !target.hidden
            ? await play(target, target._anims || [], "out", token, true)
            : true;

        if (ok && target._token === token) {
          target.hidden = true;

          if (target._animClasses) {
            target.classList.remove(...target._animClasses);
            target._animClasses = null;
          }
        }
      }
    })
  );
}

function init(container) {
  if (container._switcher) return;
  container._switcher = true;

  container.addEventListener("click", (event) => {
    const btn = event.target.closest?.(`button[${ATTR}]`);
    if (!btn || getContainer(btn) !== container) return;

    const { value, anims } = parse(btn);
    if (value) switchTo(container, value, true, anims);
  });

  const buttons = [...container.querySelectorAll(`button[${ATTR}]`)];
  const targets = [...container.querySelectorAll(`[${ATTR}]:not(button)`)];

  const visible = targets.find((target) => !target.hidden);
  const activeBtn =
    buttons.find((btn) => btn.classList.contains("active")) || buttons[0];

  const value = visible
    ? parse(visible).value
    : activeBtn
      ? parse(activeBtn).value
      : "";

  if (value) switchTo(container, value, false);
}

watchDom(`button[${ATTR}]`, (btn) => {
  const container = getContainer(btn);
  if (container) init(container);
});
