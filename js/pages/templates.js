import { fetchTextCached } from "./dom.js";
import { watchDom } from "../utils/watch.js";

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

watchDom("[data-template]", loadTemplate);
