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
    notifObj.element.classList.remove('show');

    // Полностью удаляем из DOM после завершения анимации
    setTimeout(() => {
        if (notifObj.element.parentNode) {
            notifObj.element.parentNode.removeChild(notifObj.element);
        }
    }, ANIMATION_DURATION);
}

// Функция получения/создания контейнера
function getContainer() {
    let container = document.getElementById('notification-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';

    const appendContainer = () => document.body.appendChild(container);
    if (document.body) {
        appendContainer();
    } else {
        document.addEventListener('DOMContentLoaded', appendContainer, { once: true });
    }

    return container;
}

export default function notification(message, isError = false) {
    const container = getContainer();

    // 1. Контроль переполнения (максимум 3 штуки)
    // Если лимит достигнут, удаляем самое старое уведомление (первое в массиве)
    while (activeNotifications.length >= MAX_NOTIFICATIONS) {
        removeNotification(activeNotifications[0]);
    }

    // 2. Создание элемента
    const el = document.createElement('div');
    el.className = 'notification'; // ID убран, чтобы не было дублей
    if (isError) el.classList.add('error');
    el.textContent = message;
    el.style.cursor = 'pointer'; // Подсказка, что уведомление кликабельно

    const notifObj = { element: el };

    // 3. Обработчик клика (удаление раньше времени)
    el.addEventListener('click', () => {
        removeNotification(notifObj);
    });

    // 4. Добавляем в контейнер
    container.appendChild(el);

    // 5. Настраиваем таймеры для авто-скрытия
    // Небольшая задержка перед добавлением класса show, чтобы сработала CSS анимация появления
    notifObj.showTimeout = setTimeout(() => {
        el.classList.add('show');
    }, 10);

    // Таймер начала скрытия
    notifObj.hideTimeout = setTimeout(() => {
        removeNotification(notifObj);
    }, DURATION);

    // 6. Сохраняем в массив активных
    activeNotifications.push(notifObj);
}