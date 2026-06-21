/**
 * LocalStorageFieldManager
 * -------------------------------------------------------------
 * Связывает DOM-элементы с атрибутом [data-field] со значениями
 * в localStorage.
 *
 * Что изменилось по сравнению с исходной версией:
 *
 * 1. Реактивность без бесконечных циклов.
 *    - Перехват localStorage.setItem/removeItem/clear обновляет
 *      ТОЛЬКО DOM, никогда не пишет обратно в localStorage.
 *    - Слушатель input/change пишет ТОЛЬКО в localStorage,
 *      никогда напрямую не трогает DOM других элементов.
 *    Из-за разделения "запись" / "чтение" циклов получиться не может.
 *
 * 2. Если внутри элемента [data-field] есть тег <i> (иконка),
 *    значение пишется не в textContent самого блока (это бы стёрло
 *    иконку), а в дочерний <span data-field-value>, который
 *    создаётся один раз сразу после <i>.
 *
 * 3. Если значения в localStorage нет или оно пустая строка —
 *    элемент полностью убирается из DOM. Как только значение
 *    снова появится — элемент возвращается на то же место
 *    (запоминаем родителя и соседний узел).
 */
class LocalStorageFieldManager {
    constructor() {
        // fieldName -> Set<record>
        this.fieldsToRecords = new Map();
        // element -> record (чтобы не регистрировать один и тот же узел дважды)
        this.elementToRecord = new WeakMap();

        this.init();
    }

    init() {
        this.registerExistingFields();
        this.applyAllFields();
        this.setupMutationObserver();

        // Реакция на изменения localStorage из других вкладок
        window.addEventListener('storage', (event) => {
            if (event.key !== null && this.fieldsToRecords.has(event.key)) {
                this.applyField(event.key);
            }
        });

        this.interceptLocalStorage();
        this.setupInputListeners();
    }

    /* ------------------------------------------------------------------ *
     * Регистрация элементов
     * ------------------------------------------------------------------ */

    registerExistingFields(root = document) {
        root.querySelectorAll('[data-field]').forEach((el) => this.registerElement(el));
    }

    registerElement(element) {
        if (this.elementToRecord.has(element)) {
            // Уже зарегистрирован (например, повторно вставлен в DOM нами же)
            return this.elementToRecord.get(element);
        }

        const fieldName = element.getAttribute('data-field');
        if (!fieldName) return null;

        const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);

        const record = {
            fieldName,
            element,
            isFormField,
            removed: false,
            parent: element.parentNode,
            nextSibling: element.nextSibling,
            icon: null,
            valueSpan: null,
        };

        // Правило №2: если внутри блока есть <i>, значение идёт в <span>
        if (!isFormField) {
            const icon = element.querySelector('i');
            if (icon) {
                record.icon = icon;
                record.valueSpan =
                    element.querySelector(':scope > span[data-field-value]') ||
                    this.createValueSpan(icon);
            }
        }

        this.elementToRecord.set(element, record);
        if (!this.fieldsToRecords.has(fieldName)) {
            this.fieldsToRecords.set(fieldName, new Set());
        }
        this.fieldsToRecords.get(fieldName).add(record);

        return record;
    }

    createValueSpan(afterIcon) {
        const span = document.createElement('span');
        span.setAttribute('data-field-value', '');
        afterIcon.insertAdjacentElement('afterend', span);
        return span;
    }

    /* ------------------------------------------------------------------ *
     * localStorage -> DOM
     * ------------------------------------------------------------------ */

    applyAllFields() {
        this.fieldsToRecords.forEach((_, fieldName) => this.applyField(fieldName));
    }

    applyField(fieldName) {
        const records = this.fieldsToRecords.get(fieldName);
        if (!records) return;

        const value = localStorage.getItem(fieldName);
        const isEmpty = value === null || value === '';

        records.forEach((record) => {
            if (isEmpty) {
                this.removeRecord(record);
            } else {
                this.restoreRecord(record);
                this.writeValue(record, value);
            }
        });
    }

    // Правило №3 (удаление): убираем элемент из DOM, запоминая позицию
    removeRecord(record) {
        if (record.removed) return;
        const { element } = record;
        if (element.isConnected) {
            record.parent = element.parentNode;
            record.nextSibling = element.nextSibling;
            element.remove();
        }
        record.removed = true;
    }

    // Правило №3 (восстановление): возвращаем элемент на прежнее место
    restoreRecord(record) {
        if (!record.removed) return;

        if (!record.element.isConnected) {
            const parent = record.parent;
            if (parent && parent.isConnected) {
                const sibling = record.nextSibling;
                if (sibling && sibling.isConnected && sibling.parentNode === parent) {
                    parent.insertBefore(record.element, sibling);
                } else {
                    parent.appendChild(record.element);
                }
            }
        }
        record.removed = false;
    }

    writeValue(record, value) {
        const isReadonly = record.element.hasAttribute('data-readonly');

        // Есть иконка <i> -> пишем в <span>, а не в сам блок
        if (record.valueSpan) {
            if (isReadonly && record.valueSpan.textContent) return;
            if (record.valueSpan.textContent !== value) {
                record.valueSpan.textContent = value;
            }
            return;
        }

        if (record.isFormField) {
            if (isReadonly && record.element.value) return;
            if (record.element.value !== value) {
                record.element.value = value;
            }
        } else {
            if (isReadonly && record.element.textContent) return;
            if (record.element.textContent !== value) {
                record.element.textContent = value;
            }
        }
    }

    /* ------------------------------------------------------------------ *
     * DOM -> localStorage (пользовательский ввод)
     * ------------------------------------------------------------------ */

    setupInputListeners() {
        document.addEventListener('input', (event) => this.handleFieldChange(event.target));
        document.addEventListener('change', (event) => this.handleFieldChange(event.target));
    }

    handleFieldChange(element) {
        if (!(element instanceof Element)) return;

        const fieldName = element.getAttribute('data-field');
        if (!fieldName || element.hasAttribute('data-readonly')) return;

        const value = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
            ? element.value
            : element.textContent;

        // Пишем только в localStorage. DOM этого же элемента трогать
        // не нужно — он уже отражает то, что ввёл пользователь.
        localStorage.setItem(fieldName, value);
    }

    /* ------------------------------------------------------------------ *
     * Перехват localStorage (правило №1: реактивность в той же вкладке)
     * ------------------------------------------------------------------ */

    interceptLocalStorage() {
        const methods = ['setItem', 'removeItem', 'clear'];

        methods.forEach((method) => {
            const original = localStorage[method].bind(localStorage);

            localStorage[method] = (...args) => {
                const result = original(...args);

                if (method === 'setItem' || method === 'removeItem') {
                    const key = args[0];
                    if (this.fieldsToRecords.has(key)) {
                        this.applyField(key);
                    }
                } else {
                    // clear()
                    this.fieldsToRecords.forEach((_, key) => this.applyField(key));
                }

                return result;
            };
        });
    }

    /* ------------------------------------------------------------------ *
     * Новые элементы, появившиеся в DOM позже
     * ------------------------------------------------------------------ */

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let foundNew = false;

            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                    if (node.hasAttribute?.('data-field') && !this.elementToRecord.has(node)) {
                        this.registerElement(node);
                        foundNew = true;
                    }

                    node.querySelectorAll?.('[data-field]').forEach((el) => {
                        if (!this.elementToRecord.has(el)) {
                            this.registerElement(el);
                            foundNew = true;
                        }
                    });
                });
            }

            // Применяем значения только если реально появились новые поля.
            // Узлы, которые мы сами переставляем (remove/insertBefore),
            // уже зарегистрированы, поэтому повторно сюда не попадают
            // и applyAllFields не будет вызываться бесконечно.
            if (foundNew) {
                this.applyAllFields();
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.fieldManager = new LocalStorageFieldManager();
    });
} else {
    window.fieldManager = new LocalStorageFieldManager();
}

window.updateAllFields = () => {
    window.fieldManager?.applyAllFields();
};