import { fetchTextCached } from "./dom.js";

let activeDialog = null;

function closeMenu() {
  activeDialog?.close();
  activeDialog = null;
}

function buildDialog(menuName, html) {
  const dialog = document.createElement("dialog");
  dialog.dataset.menuName = menuName;

  const template = document.createElement("template");
  template.innerHTML = html;
  const scripts = Array.from(template.content.querySelectorAll("script"));

  dialog.appendChild(template.content.cloneNode(true));

  // Скрипты, вставленные через innerHTML, не выполняются — пересоздаём их
  for (const sourceScript of scripts) {
    const runnableScript = document.createElement("script");
    for (const { name, value } of sourceScript.attributes) {
      runnableScript.setAttribute(name, value);
    }
    runnableScript.textContent = sourceScript.textContent;
    dialog.appendChild(runnableScript);
  }

  dialog.addEventListener("close", () => {
    dialog.remove();
    if (activeDialog === dialog) activeDialog = null;
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeMenu();
  });

  return dialog;
}

async function openMenu(menuName) {
  if (!menuName || activeDialog?.dataset.menuName === menuName) return;
  closeMenu();

  try {
    const fileName = menuName.endsWith(".html") ? menuName : `${menuName}.html`;
    const html = await fetchTextCached(`/menus/${fileName}`);
    const dialog = buildDialog(menuName, html);

    document.body.appendChild(dialog);
    dialog.showModal();
    activeDialog = dialog;
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener("click", (event) => {
  const closeTrigger = event.target.closest("[close='true']");
  if (closeTrigger) {
    closeMenu();
    return;
  }

  const openTrigger = event.target.closest("[menu]");
  if (openTrigger) {
    event.preventDefault();
    openMenu(openTrigger.getAttribute("menu"));
  }
});
