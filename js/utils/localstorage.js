import { watchDom } from "./watch.js";

class LocalStorageFieldManager {
  constructor() {
    this.fieldsToRecords = new Map();
    this.elementToRecord = new WeakMap();

    this.init();
  }

  init() {
    this.setupWatcher();

    window.addEventListener("storage", (event) => {
      if (event.key !== null) {
        this.applyFieldsByStorageKey(event.key);
      }
    });

    this.interceptLocalStorage();
    this.setupInputListeners();
  }
  getRootKey(fieldName) {
    return fieldName.split(".")[0];
  }

  resolveValue(storageKey, fieldName) {
    const raw = localStorage.getItem(storageKey);
    if (raw === null) return null;

    const path = fieldName.slice(storageKey.length + 1);
    if (!path) return raw;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return raw;
    }

    return this.getByPath(parsed, path);
  }

  getByPath(obj, path) {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return null;
      if (typeof current !== "object") return null;
      current = current[part];
    }
    if (current === undefined) return null;
    if (current === null) return null;
    return typeof current === "object" ? JSON.stringify(current) : String(current);
  }

  setByFieldName(fieldName, value) {
    const storageKey = this.getRootKey(fieldName);
    const path = fieldName.slice(storageKey.length + 1);

    if (!path) {
      localStorage.setItem(storageKey, value);
      return;
    }

    const raw = localStorage.getItem(storageKey);
    let parsed = null;
    if (raw !== null) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.setItem(storageKey, value);
        return;
      }
    }

    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      parsed = {};
    }

    this.setByPath(parsed, path, value);
    localStorage.setItem(storageKey, JSON.stringify(parsed));
  }

  setByPath(obj, path, value) {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (current[part] === null || current[part] === undefined || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  applyFieldsByStorageKey(storageKey) {
    this.fieldsToRecords.forEach((_, fieldName) => {
      if (this.getRootKey(fieldName) === storageKey) {
        this.applyField(fieldName);
      }
    });
  }

  registerElement(element) {
    if (this.elementToRecord.has(element)) {
      return this.elementToRecord.get(element);
    }
    const fieldName = element.getAttribute("data-storage");
    if (!fieldName) return null;
    const isFormField = ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
    const record = {
      fieldName,
      storageKey: this.getRootKey(fieldName),
      element,
      isFormField,
      removed: false,
      parent: element.parentNode,
      nextSibling: element.nextSibling,
      icon: null,
      valueSpan: null,
    };

    if (!isFormField) {
      const icon = element.querySelector("i");
      if (icon) {
        record.icon = icon;
        record.valueSpan = element.querySelector(":scope > span[data-storage-value]") || this.createValueSpan(icon);
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
    const span = document.createElement("span");
    span.setAttribute("data-storage-value", "");
    afterIcon.insertAdjacentElement("afterend", span);
    return span;
  }

  applyAllFields() {
    this.fieldsToRecords.forEach((_, fieldName) => this.applyField(fieldName));
  }

  applyField(fieldName) {
    const records = this.fieldsToRecords.get(fieldName);
    if (!records) return;

    const storageKey = this.getRootKey(fieldName);
    const value = this.resolveValue(storageKey, fieldName);
    const isEmpty = value === null || value === "";

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
    if (tag === "INPUT" || tag === "TEXTAREA") {
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
    const isReadonly = record.element.hasAttribute("data-readonly");
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
    document.addEventListener("input", (event) => this.handleFieldChange(event.target));
    document.addEventListener("change", (event) => this.handleFieldChange(event.target));
  }

  handleFieldChange(element) {
    if (!(element instanceof Element)) return;

    const fieldName = element.getAttribute("data-storage");
    if (!fieldName || element.hasAttribute("data-readonly")) return;

    const value = ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName) ? element.value : element.textContent;

    this.setByFieldName(fieldName, value);
  }

  interceptLocalStorage() {
    const methods = ["setItem", "removeItem", "clear"];

    methods.forEach((method) => {
      const original = localStorage[method].bind(localStorage);

      localStorage[method] = (...args) => {
        const result = original(...args);

        if (method === "setItem" || method === "removeItem") {
          const key = args[0];
          this.applyFieldsByStorageKey(key);
        } else {
          this.fieldsToRecords.forEach((_, fieldName) => this.applyField(fieldName));
        }

        return result;
      };
    });
  }

  setupWatcher() {
    watchDom("[data-storage]", (element) => {
      if (this.elementToRecord.has(element)) return;
      const record = this.registerElement(element);
      if (record) this.applyField(record.fieldName);
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.fieldManager = new LocalStorageFieldManager();
  });
} else {
  window.fieldManager = new LocalStorageFieldManager();
}

window.updateAllFields = () => {
  window.fieldManager?.applyAllFields();
};
