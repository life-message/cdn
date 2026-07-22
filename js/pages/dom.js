export const dom = {
  create(tag, attrs = {}, content = "") {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
    if (content) el.innerHTML = content;
    return el;
  },

  exists(selector) {
    return document.querySelector(selector) !== null;
  },
};

const textCache = new Map();

// Загружает текст файла с простым кэшем по URL (используется меню и шаблонами)
export async function fetchTextCached(url) {
  if (textCache.has(url)) return textCache.get(url);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не удалось загрузить: ${url}`);

  const text = await res.text();
  textCache.set(url, text);
  return text;
}
