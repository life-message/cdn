import { watchDom } from "../utils/watch.js";

export function initNavigation() {
  watchDom("nav", (nav) => {
    const path = window.location.pathname;

    nav.querySelectorAll("a").forEach((a) => {
      if (a.getAttribute("href") === path) {
        a.classList.add("active", "hidden-text");
        a.removeAttribute("href");
        a.style.pointerEvents = "none";
      }
    });
  });
}
