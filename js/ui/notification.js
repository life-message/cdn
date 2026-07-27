const activeNotifications = [];
const MAX_NOTIFICATIONS = 3;
const DURATION = 3000; // Время жизни в мс
const ANIMATION_DURATION = 300; // Должно совпадать с transition в CSS

// Функция безопасного удаления уведомления
function removeNotification(notifObj) {
  // Очищаем все таймеры, чтобы избежать конфликтов
  clearTimeout(notifObj.showTimeout);
  clearTimeout(notifObj.hideTimeout);

  // Удаляем из массива активных
  const index = activeNotifications.indexOf(notifObj);
  if (index > -1) {
    activeNotifications.splice(index, 1);
  }

  // Убираем класс для анимации скрытия
  notifObj.element.classList.remove("show");

  // Полностью удаляем из DOM после завершения анимации
  setTimeout(() => {
    if (notifObj.element.parentNode) {
      notifObj.element.parentNode.removeChild(notifObj.element);
    }
  }, ANIMATION_DURATION);
}

// Функция получения/создания контейнера
function getContainer() {
  let container = document.getElementById("notification-container");
  if (container) return container;

  container = document.createElement("div");
  container.id = "notification-container";
  container.className = "notification-container";

  const appendContainer = () => document.body.appendChild(container);
  if (document.body) {
    appendContainer();
  } else {
    document.addEventListener("DOMContentLoaded", appendContainer, {
      once: true,
    });
  }

  return container;
}

export default function notification(message, isError = false) {
  const container = getContainer();
  while (activeNotifications.length >= MAX_NOTIFICATIONS) {
    removeNotification(activeNotifications[0]);
  }
  const el = document.createElement("div");
  el.className = "notification";
  if (isError) el.classList.add("error");
  el.textContent = message;
  el.style.cursor = "pointer";

  const notifObj = { element: el };

  el.addEventListener("click", () => {
    removeNotification(notifObj);
  });
  container.appendChild(el);
  notifObj.showTimeout = setTimeout(() => {
    el.classList.add("show");
  }, 10);
  notifObj.hideTimeout = setTimeout(() => {
    removeNotification(notifObj);
  }, DURATION);
  activeNotifications.push(notifObj);
}
