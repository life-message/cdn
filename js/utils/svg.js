import { SPA } from "./spa.js"

async function replaceSvg() {
  const images = document.querySelectorAll('img[alt*="svg"]');

  for (const img of images) {
    try {
      const response = await fetch(img.src);

      if (!response.ok) throw new Error('Ошибка загрузки файла');

      const svgText = await response.text();

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
    }
  }
}

SPA(replaceSvg, {
  selector: 'img[alt*="svg"]',
  continuous: true  // Важно! Обрабатывать каждый найденный элемент
});
