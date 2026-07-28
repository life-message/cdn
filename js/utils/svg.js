import { SPA } from "./spa.js"

const svgCache = new Map();
const processingSet = new Set();

async function replaceSvg() {
  const images = document.querySelectorAll('img[alt*="svg"]');

  for (const img of images) {
    if (img.dataset.svgReplaced === 'true' || processingSet.has(img.src)) {
      continue;
    }

    processingSet.add(img.src);
    img.dataset.svgReplaced = 'true';

    try {
      let svgText;

      if (svgCache.has(img.src)) {
        svgText = svgCache.get(img.src);
      } else {
        const response = await fetch(img.src);
        if (!response.ok) throw new Error('Ошибка загрузки файла');
        svgText = await response.text();
        svgCache.set(img.src, svgText);
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');

      if (svgElement) {
        if (img.className) svgElement.setAttribute('class', img.className);
        if (img.id) svgElement.setAttribute('id', img.id);
        if (img.width) svgElement.setAttribute('width', img.width);
        if (img.height) svgElement.setAttribute('height', img.height);

        img.replaceWith(svgElement);
      }
    } catch (error) {
      console.error(`Не удалось заменить иконку ${img.src}:`, error);
      img.removeAttribute('data-svg-replaced');
    } finally {
      processingSet.delete(img.src);
    }
  }
}

SPA(replaceSvg, {
  selector: 'img[alt*="svg"]',
  continuous: true
});
