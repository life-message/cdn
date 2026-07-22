/**
 * spa(fn, options?)
 *
 * Запускает fn при:
 *  - первоначальной загрузке страницы (DOMContentLoaded или сразу, если DOM уже готов)
 *  - SPA-навигации (popstate, pushState/replaceState, hashchange)
 *
 * Если передан id или className — fn вызывается только когда нужный элемент
 * присутствует в DOM. Если элемент ещё не появился (SPA рендерит асинхронно),
 * используется MutationObserver с таймаутом.
 *
 * @param {Function} fn               - функция для выполнения
 * @param {string|null} [id]          - id элемента, наличие которого обязательно
 * @param {string|null} [className]   - CSS-класс элемента, наличие которого обязательно
 * @param {number} [timeout=3000]     - мс ожидания элемента через MutationObserver
 */
export function spa(fn, id = null, className = null, timeout = 3000) {
  function targetExists() {
    if (id && !document.getElementById(id)) return false;
    if (className && !document.querySelector(`.${className}`)) return false;
    return true;
  }

  function tryRun() {
    if (targetExists()) {
      fn();
      return;
    }

    // Элемент ещё не в DOM — ждём через MutationObserver
    const deadline = Date.now() + timeout;
    let observer = new MutationObserver(() => {
      if (targetExists()) {
        observer.disconnect();
        observer = null;
        fn();
      } else if (Date.now() > deadline) {
        observer.disconnect();
        observer = null;
        console.warn(
          `[spa] Элемент не найден за ${timeout}мс:`,
          id ? `#${id}` : `.${className}`,
        );
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Сохраняем observer, чтобы отменить его при следующей навигации
    observers.add(observer);
  }

  // Храним активные observers для этого вызова spa()
  const observers = new Set();

  function onNavigate() {
    // Отключаем все висящие observers перед новым запуском
    for (const obs of observers) {
      obs.disconnect();
    }
    observers.clear();

    // Небольшая задержка — даём SPA-фреймворку обновить DOM
    setTimeout(tryRun, 0);
  }

  // --- Первоначальная загрузка ---
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryRun, { once: true });
  } else {
    tryRun();
  }

  // --- Патчим history один раз глобально ---
  if (!window.__spaPatched) {
    window.__spaPatched = true;

    const patchHistory = (method) => {
      const original = history[method];
      history[method] = function (...args) {
        original.apply(this, args);
        window.dispatchEvent(new Event("spa:navigate"));
      };
    };

    patchHistory("pushState");
    patchHistory("replaceState");
  }

  // --- Слушаем навигацию ---
  // Дедупликация: один обработчик на навигационное событие
  if (!fn.__spaNavigateHandler) {
    fn.__spaNavigateHandler = onNavigate;
    window.addEventListener("spa:navigate", onNavigate);
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("hashchange", onNavigate);
  }
}
