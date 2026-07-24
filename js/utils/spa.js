/**
 * spa(fn, options?)
 *
 * Универсальный инструмент для работы с динамическим контентом в SPA.
 * Запускает fn при:
 *  - первоначальной загрузке страницы
 *  - SPA-навигации (popstate, pushState/replaceState, hashchange)
 *  - (опционально) при появлении новых элементов в DOM (режим watch)
 *
 * @param {Function} fn               - функция для выполнения.
 *                                      В режиме continuous принимает найденный элемент (node).
 * @param {Object} [options]          - настройки
 * @param {string|null} [options.id]  - id элемента
 * @param {string|null} [options.className] - CSS-класс элемента
 * @param {string|null} [options.selector] - произвольный CSS-селектор (например, "[data-template]")
 * @param {number} [options.timeout=3000] - мс ожидания элемента через MutationObserver
 * @param {boolean} [options.continuous=false] - если true, работает как watchDom:
 *                                               вызывает fn(node) для каждого найденного элемента
 *                                               и продолжает следить за DOM постоянно.
 */
export function SPA(fn, { id = null, className = null, selector = null, timeout = 3000, continuous = false } = {}) {

  // Определяем итоговый селектор для поиска
  const finalSelector = selector || (id ? `#${id}` : (className ? `.${className}` : null));

  // Проверка соответствия узла селектору
  const matchesTarget = (node) => {
    if (!finalSelector) return true;
    return node.matches?.(finalSelector);
  };

  // Сканирование узла и его потомков (логика из watch.js)
  const scanNode = (node) => {
    if (matchesTarget(node)) {
      fn(node);
    }
    if (node.querySelectorAll && finalSelector) {
      node.querySelectorAll(finalSelector).forEach(fn);
    }
  };

  function tryRun() {
    if (!finalSelector) return;

    // 1. Проверяем наличие элементов прямо сейчас
    const existingElements = document.querySelectorAll(finalSelector);
    const targets = Array.from(existingElements).filter(matchesTarget);

    if (targets.length > 0) {
      if (continuous) {
        // В режиме watch вызываем функцию для каждого найденного элемента
        targets.forEach(fn);
      } else {
        // В обычном режиме вызываем один раз и выходим
        fn();
        return;
      }
    }

    // Если элементов нет или режим continuous — ставим Observer
    const deadline = Date.now() + timeout;
    let observer = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations) {
        for (const node of addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scanNode(node);
          }
        }
      }

      // Логика отключения для обычного режима (не continuous)
      if (!continuous) {
        const currentTargets = document.querySelectorAll(finalSelector);
        const hasTarget = Array.from(currentTargets).some(matchesTarget);

        if (hasTarget || Date.now() > deadline) {
          observer.disconnect();
          observers.delete(observer);
          if (!hasTarget) {
            console.warn(`[spa] Элемент не найден за ${timeout}мс:`, finalSelector);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    observers.add(observer);
  }

  // Хранилище активных наблюдателей
  const observers = new Set();

  function onNavigate() {
    // При навигации сбрасываем observers только если это НЕ глобальный watch
    if (!continuous) {
      for (const obs of observers) {
        obs.disconnect();
      }
      observers.clear();
    }

    // Небольшая задержка для обновления DOM фреймворком
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
  // Используем свойство функции для хранения обработчика, чтобы не дублировать слушатели
  if (!fn.__spaNavigateHandler) {
    fn.__spaNavigateHandler = onNavigate;
    window.addEventListener("spa:navigate", onNavigate);
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("hashchange", onNavigate);
  }
}
