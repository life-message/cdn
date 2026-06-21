function initSwitchers(attrName = 'data-replaced') {
    const buttons = document.querySelectorAll(`button[${attrName}]`);
    const containers = new Set();

    buttons.forEach(btn => {
        const container = btn.closest('[data-switcher]') || btn.closest('form') || btn.closest('body');
        containers.add(container);
    });

    containers.forEach(container => {
        if (container.dataset.switcherInited) return;
        container.dataset.switcherInited = 'true';

        const switchButtons = container.querySelectorAll(`button[${attrName}]`);
        const targets = container.querySelectorAll(`[${attrName}]:not(button)`);

        function switchTo(value) {
            switchButtons.forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute(attrName) === value);
            });

            targets.forEach(target => {
                const isVisible = target.getAttribute(attrName) === value;
                target.hidden = !isVisible;

                target.querySelectorAll('input, textarea, select').forEach(field => {
                    field.disabled = !isVisible;
                });
            });
        }

        switchButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTo(btn.getAttribute(attrName)));
        });

        if (switchButtons.length) {
            const visibleTarget = Array.from(targets).find(t => !t.hidden);
            const defaultValue = visibleTarget
                ? visibleTarget.getAttribute(attrName)
                : switchButtons[0].getAttribute(attrName);

            switchTo(defaultValue);
        }
    });
}

const observer = new MutationObserver(() => {
    initSwitchers();
});

observer.observe(document.body, { childList: true, subtree: true });

initSwitchers();