import { SPA } from "../utils/spa.js";
import {
  playClassAnimation,
  clearAnimationClasses,
} from "./animate.js";

const ATTR = "data-replaced";

const parse = (el) => {
  const [value, ...anims] = (el?.getAttribute(ATTR) || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return {
    value: value || "",
    anims,
  };
};

const getContainer = (el) =>
  el.closest("[data-switcher]") || document.body;

function toggleFields(target, disabled) {
  target.querySelectorAll("input, textarea, select").forEach((field) => {
    field.disabled = disabled;
  });
}

async function switchTo(container, value, animate, forceAnims) {
  const buttons = [...container.querySelectorAll(`button[${ATTR}]`)];
  const targets = [...container.querySelectorAll(`[${ATTR}]:not(button)`)];

  const activeBtn = buttons.find((btn) => parse(btn).value === value);
  const anims = forceAnims ?? (activeBtn ? parse(activeBtn).anims : []);

  // Первая анимация — входящему блоку,
  // вторая (если есть) — выходящему.
  const [inName, outName = inName] = anims;

  buttons.forEach((btn) => {
    btn.classList.toggle("active", parse(btn).value === value);
  });

  await Promise.all(
    targets.map(async (target) => {
      const token = Symbol();
      target._token = token;
      const isCurrent = () => target._token === token;

      clearAnimationClasses(target);

      const show = parse(target).value === value;

      if (show) {
        target.hidden = false;
        toggleFields(target, false);

        if (animate && inName) {
          await playClassAnimation(target, [inName], "in", { isCurrent });
        }
      } else {
        toggleFields(target, true);

        const ok =
          animate && outName && !target.hidden
            ? await playClassAnimation(target, [outName], "out", {
              isCurrent,
              keep: true,
            })
            : true;

        if (ok && isCurrent()) {
          target.hidden = true;
          clearAnimationClasses(target);
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

  if (value) {
    switchTo(container, value, false);
  }
}

SPA((btn) => {
  const container = getContainer(btn);
  if (container) init(container);
}, {
  selector: `button[${ATTR}]`,
  continuous: true
});
