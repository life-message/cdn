/**
 * Следит за появлением элементов по селектору: сразу обрабатывает те, что уже
 * есть в DOM, и продолжает вызывать onFound для всех, что появятся позже
 * (например, после SPA-навигации, открытия меню, загрузки шаблона).
 *
 * Возвращает MutationObserver — его можно отключить вручную (observer.disconnect()),
 * если наблюдение нужно только один раз.
 */
export function watchDom(selector, onFound, root = document.body) {
  const scan = (node) => {
    if (node.matches?.(selector)) onFound(node);
    node.querySelectorAll?.(selector).forEach(onFound);
  };

  scan(document);

  const observer = new MutationObserver((mutations) => {
    for (const { addedNodes } of mutations) {
      for (const node of addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return observer;
}
