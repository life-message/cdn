import { dom } from "./dom.js";

export class ResourceManager {
  constructor() {
    this.loaded = new Set();
    this.pageScripts = new Set();
  }

  loadStyles(styles) {
    const currentIds = new Set();

    styles.forEach((styleEl) => {
      const id = this.getResourceId(styleEl);
      currentIds.add(id);
      if (this.loaded.has(id)) return;

      const attrs = { "data-spa-resource": "style", "data-resource-id": id };
      const el =
        styleEl.tagName === "LINK"
          ? dom.create("link", { rel: "stylesheet", href: styleEl.getAttribute("href"), ...attrs })
          : dom.create("style", attrs, styleEl.textContent);

      document.head.appendChild(el);
      this.loaded.add(id);
    });

    document.querySelectorAll('[data-spa-resource="style"]').forEach((el) => {
      const id = el.getAttribute("data-resource-id");
      if (!currentIds.has(id)) {
        el.remove();
        this.loaded.delete(id);
      }
    });
  }

  loadScripts(scripts, target = "head") {
    scripts.forEach((oldScript) => {
      const id = this.getResourceId(oldScript);
      if (this.loaded.has(id)) {
        // Опционально: можно добавить логику перезапуска, если это не модуль
        return;
      }

      const newScript = dom.create("script", {}, "");
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      newScript.setAttribute("data-spa-resource", "script");
      newScript.setAttribute("data-resource-id", id);

      if (newScript.src) newScript.async = false;

      (target === "head" ? document.head : document.body).appendChild(newScript);

      this.loaded.add(id);
      this.pageScripts.add(id);
    });
  }

  clearPageResources() {
    this.pageScripts.forEach(id => {
      const el = document.querySelector(`[data-resource-id="${id}"]`);
      if (el) el.remove();
      this.loaded.delete(id);
    });
    this.pageScripts.clear();
  }

  getResourceId(element) {
    if (element.src) return `script:${element.src}`;
    if (element.href) return `link:${element.href}`;
    if (element.textContent) return `inline:${this.simpleHash(element.textContent)}`;
    return `unknown:${Math.random()}`;
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString(36);
  }
}
