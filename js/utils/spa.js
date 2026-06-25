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
    // Определяем, есть ли нужный элемент в DOM прямо сейчас
    function targetExists() {
        if (id && !document.getElementById(id)) return false;
        if (className && !document.querySelector(`.${className}`)) return false;
        return true;
    }

    // Запускаем fn сразу или ждём элемент через MutationObserver
    function tryRun() {
        if (targetExists()) {
            fn();
            return;
        }

        // Элемент ещё не в DOM — ждём через MutationObserver
        const deadline = Date.now() + timeout;

        const observer = new MutationObserver(() => {
            if (targetExists()) {
                observer.disconnect();
                fn();
            } else if (Date.now() > deadline) {
                observer.disconnect();
                console.warn(`[spa] Элемент не найден за ${timeout}мс:`, id ? `#${id}` : `.${className}`);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // --- Первоначальная загрузка ---
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryRun, { once: true });
    } else {
        tryRun();
    }

    // --- SPA-навигация: перехватываем pushState / replaceState ---
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

    // Слушаем все варианты SPA-навигации
    const onNavigate = () => tryRun();

    window.addEventListener("spa:navigate", onNavigate);
    window.addEventListener("popstate", onNavigate);
    window.addEventListener("hashchange", onNavigate);
}
