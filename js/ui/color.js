import { SPA } from "../utils/spa.js";

const HUE_KEY = "color";

const getHue = () => parseInt(localStorage.getItem(HUE_KEY) || "0", 10);

const syncButton = (btn, hue) => {
  if (!btn.style.getPropertyValue("--hue-target")) {
    btn.style.setProperty("--hue-target", `${btn.dataset.hueAdaptive}deg`);
  }
  btn.classList.toggle("active", parseInt(btn.dataset.hueAdaptive, 10) === hue);
};

const syncAllButtons = () => {
  const hue = getHue();
  document.querySelectorAll("[data-hue-adaptive]").forEach((btn) => syncButton(btn, hue));
};

const setHue = (deg) => {
  document.documentElement.style.setProperty("--hue-offset", `${deg}deg`);
  localStorage.setItem(HUE_KEY, deg);
  syncAllButtons();
};

SPA((btn) => syncButton(btn, getHue()), {
  selector: "[data-hue-adaptive]",
  continuous: true
});

window.addEventListener('storage', (e) => {
  if (e.key === 'color') {
    setHue(e.newValue);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setHue(getHue());

  const slider = document.getElementById("hue-slider");
  if (slider) {
    slider.value = getHue();
    slider.addEventListener("input", (e) => setHue(e.target.value));
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-hue-adaptive]");
  if (!btn) return;

  setHue(btn.dataset.hueAdaptive);

  const slider = document.getElementById("hue-slider");
  if (slider) slider.value = btn.dataset.hueAdaptive;
});

document.addEventListener("hue:refresh", syncAllButtons);
