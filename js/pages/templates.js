import { fetchTextCached } from "./dom.js";
import { SPA } from "../utils/spa.js";

async function loadTemplate(element) {
  const name = element.dataset.template;

  try {
    const html = await fetchTextCached(`templates/${name}.html`);
    element.insertAdjacentHTML("beforebegin", html);
    element.remove();
  } catch (error) {
    console.error(`Ошибка загрузки шаблона "${name}":`, error);
  }
}

SPA((node) => {
  loadTemplate(node);
}, {
  selector: "[data-template]",
  continuous: true
});
