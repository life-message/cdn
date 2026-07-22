import { watchDom } from "./watch.js";

const DEFAULT_IMAGE = "retro";

function isEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

async function applyGravatar(img) {
  const key = img.dataset.gravatar.trim();
  const size = img.dataset.size || img.width || 80;

  const stored = localStorage.getItem(key);
  const candidate = (stored !== null ? stored : key).trim();

  const params = new URLSearchParams({ s: size, d: DEFAULT_IMAGE });

  if (!candidate || !isEmail(candidate)) {
    params.set("f", "y");
    img.src = `https://www.gravatar.com/avatar/?${params}`;
    return;
  }

  const data = new TextEncoder().encode(candidate.toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  params.set("r", "g");
  img.src = `https://www.gravatar.com/avatar/${hash}?${params}`;
}

watchDom("img[data-gravatar]", applyGravatar);
