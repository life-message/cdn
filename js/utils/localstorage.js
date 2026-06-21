class LocalStorageFieldManager {
    constructor() {
        this.fieldsToRecords = new Map();
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

    registerExistingFields(root = document) {
        root.querySelectorAll('[data-storage]').forEach((el) => this.registerElement(el));
    }

    registerElement(element) {
        if (this.elementToRecord.has(element)) {
            return this.elementToRecord.get(element);
        }
        const fieldName = element.getAttribute('data-storage');
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

        if (!isFormField) {
            const icon = element.querySelector('i');
            if (icon) {
                record.icon = icon;
                record.valueSpan =
                    element.querySelector(':scope > span[data-storage-value]') ||
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
        span.setAttribute('data-storage-value', '');
        afterIcon.insertAdjacentElement('afterend', span);
        return span;
    }

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

    removeRecord(record) {
        if (record.removed) return;
        const { element } = record;

        const tag = element.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            return;
        }

        if (element.isConnected) {
            record.parent = element.parentNode;
            record.nextSibling = element.nextSibling;
            element.remove();
        }
        record.removed = true;
    }

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

    setupInputListeners() {
        document.addEventListener('input', (event) => this.handleFieldChange(event.target));
        document.addEventListener('change', (event) => this.handleFieldChange(event.target));
    }

    handleFieldChange(element) {
        if (!(element instanceof Element)) return;

        const fieldName = element.getAttribute('data-storage');
        if (!fieldName || element.hasAttribute('data-readonly')) return;

        const value = ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
            ? element.value
            : element.textContent;

        localStorage.setItem(fieldName, value);
    }

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

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let foundNew = false;

            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return;

                    if (node.hasAttribute?.('data-storage') && !this.elementToRecord.has(node)) {
                        this.registerElement(node);
                        foundNew = true;
                    }

                    node.querySelectorAll?.('[data-storage]').forEach((el) => {
                        if (!this.elementToRecord.has(el)) {
                            this.registerElement(el);
                            foundNew = true;
                        }
                    });
                });
            }
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