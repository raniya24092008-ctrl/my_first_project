// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================

// Находит элемент по id или выбрасывает понятную ошибку
function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Элемент #${id} не найден на странице`);
    }
    return element;
}

// Реестр обработчиков: если функцию настройки вызвать повторно,
// старый обработчик снимается, и обработчики не дублируются
const boundHandlers = new WeakMap();

function bindHandler(element, eventName, handler) {
    const handlersByEvent = boundHandlers.get(element) || {};
    if (handlersByEvent[eventName]) {
        element.removeEventListener(eventName, handlersByEvent[eventName]);
    }
    element.addEventListener(eventName, handler);
    handlersByEvent[eventName] = handler;
    boundHandlers.set(element, handlersByEvent);
}

// ================= ЗАДАНИЕ 1: Создание и вставка элементов =================

// 1.1. Создаёт карточку с заголовком и текстом и добавляет её в #target1
function createCard(title, content) {
    const target = getRequiredElement('target1');

    const card = document.createElement('div');
    card.className = 'card';

    // textContent вставляет строку как текст, поэтому HTML внутри не выполнится
    const heading = document.createElement('h4');
    heading.textContent = String(title ?? '');

    const paragraph = document.createElement('p');
    paragraph.textContent = String(content ?? '');

    card.append(heading, paragraph);
    target.appendChild(card);

    return card;
}

// 1.2. Создаёт нумерованный список из массива и добавляет его в #target1
function createList(items) {
    if (!Array.isArray(items)) {
        throw new TypeError('createList: ожидался массив элементов');
    }

    const target = getRequiredElement('target1');

    // Список собираем вне документа и вставляем один раз: так браузер перерисовывает страницу один раз
    const list = document.createElement('ol');
    items.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.textContent = String(item ?? '');
        list.appendChild(listItem);
    });

    target.appendChild(list);

    return list;
}

// ================= ЗАДАНИЕ 2: Навигация по DOM =================

// 2.1. Количество дочерних элементов у #parent-element
// children содержит только элементы, а childNodes ещё и текстовые узлы
function countChildren() {
    return getRequiredElement('parent-element').children.length;
}

// 2.2. Текст первого элемента с классом "special" внутри #parent-element (или null)
function findSpecialChild() {
    const special = getRequiredElement('parent-element').querySelector('.special');
    return special ? special.textContent.trim() : null;
}

// 2.3. Цвет фона родителя элементов .child (или null, если таких элементов нет)
function getParentBackground() {
    const child = document.querySelector('.child');
    if (!child || !child.parentElement) {
        return null;
    }
    // getComputedStyle возвращает итоговый цвет с учётом CSS: "rgb(52, 152, 219)"
    return getComputedStyle(child.parentElement).backgroundColor;
}

// ================= ЗАДАНИЕ 3: Работа с классами и стилями =================

// 3.1. Переключение класса "active-style" у #style-target по клику на #toggle-style
function setupStyleToggle() {
    const button = getRequiredElement('toggle-style');
    const target = getRequiredElement('style-target');

    bindHandler(button, 'click', function () {
        target.classList.toggle('active-style');
    });
}

// 3.2. Случайный цвет фона шапки. Возвращает цвет в формате #rrggbb
// Каждый канал берётся из диапазона 30-200, чтобы белый текст всегда читался
function changeHeaderColor() {
    const header = getRequiredElement('main-header');

    const randomChannel = () => 30 + Math.floor(Math.random() * 171);
    const color = '#' + [randomChannel(), randomChannel(), randomChannel()]
        .map((channel) => channel.toString(16).padStart(2, '0'))
        .join('');

    // Свойство background (а не backgroundColor) заменяет и исходный градиент
    header.style.background = color;

    return color;
}

// 3.3. Анимация #style-target: размер и прозрачность меняются, затем возвращаются
// Возвращает Promise, который выполняется после окончания анимации
let animationCounter = 0;

function animateElement(duration = 400) {
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
        throw new RangeError('animateElement: длительность должна быть числом не меньше 0');
    }

    const target = getRequiredElement('style-target');
    const currentAnimation = ++animationCounter;

    target.style.transition = `transform ${duration}ms ease, opacity ${duration}ms ease`;
    target.style.transform = 'scale(1.15)';
    target.style.opacity = '0.5';

    return new Promise((resolve) => {
        setTimeout(() => {
            // Если за это время запустили новую анимацию, возвращает стили только последняя
            if (currentAnimation === animationCounter) {
                target.style.transform = '';
                target.style.opacity = '';
                target.style.transition = '';
            }
            resolve(target);
        }, duration);
    });
}

// ================= ЗАДАНИЕ 4: Обработка событий =================

// 4.1. Счётчик кликов на #click-btn, значение показывается в #click-counter
function setupClickCounter() {
    const button = getRequiredElement('click-btn');
    const counter = getRequiredElement('click-counter');

    let count = 0; // счётчик хранится в замыкании
    counter.textContent = 'Кликов: 0';

    bindHandler(button, 'click', function () {
        count++;
        counter.textContent = `Кликов: ${count}`;
    });
}

// 4.2. Текст из #text-input показывается в #input-display в реальном времени
function setupInputDisplay() {
    const input = getRequiredElement('text-input');
    const display = getRequiredElement('input-display');

    // Событие input срабатывает при любом изменении: набор, вставка, удаление, голосовой ввод
    const updateDisplay = () => {
        display.textContent = input.value;
    };

    bindHandler(input, 'input', updateDisplay);
    updateDisplay();
}

// Формирует строку для вывода информации о нажатой клавише
function formatKeyEvent(event) {
    const symbol = event.key === ' ' ? '(пробел)' : event.key;

    const modifiers = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Meta');

    const modifiersText = modifiers.length > 0 ? `, модификаторы: ${modifiers.join('+')}` : '';

    return `${event.type}: символ "${symbol}", код ${event.code || '—'}${modifiersText}`;
}

function logKeyEvent(event) {
    console.log(formatKeyEvent(event));
}

// 4.3. Вывод в консоль информации о нажатиях клавиш (keydown и keyup на документе)
function setupKeyboardEvents() {
    bindHandler(document, 'keydown', logKeyEvent);
    bindHandler(document, 'keyup', logKeyEvent);
}

// ================= ЗАДАНИЕ 5: Динамические списки =================

// 5.1. Добавляет новый элемент в #dynamic-list из значения #item-input
// Возвращает созданный li или null, если ввод пустой
function addListItem() {
    const input = getRequiredElement('item-input');
    const list = getRequiredElement('dynamic-list');

    const text = input.value.trim();
    if (text === '') {
        input.focus();
        return null;
    }

    const listItem = document.createElement('li');
    listItem.className = 'list-item';

    const label = document.createElement('span');
    label.className = 'list-item-text';
    label.textContent = text;

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete-btn';
    deleteButton.textContent = 'Удалить';

    listItem.append(label, deleteButton);
    list.appendChild(listItem);

    input.value = '';
    input.focus();

    return listItem;
}

// 5.2. Удаляет элемент списка при клике на его кнопку удаления
// Возвращает true, если элемент удалён
function removeListItem(event) {
    const target = event && event.target;
    if (!(target instanceof Element)) {
        return false;
    }

    // closest работает и тогда, когда клик пришёлся на вложенный в кнопку элемент
    const deleteButton = target.closest('.delete-btn');
    if (!deleteButton) {
        return false;
    }

    const listItem = deleteButton.closest('.list-item');
    if (!listItem) {
        return false;
    }

    listItem.remove();
    return true;
}

// 5.3. Очищает весь список. Возвращает количество удалённых элементов
function clearList() {
    const list = getRequiredElement('dynamic-list');
    const removedCount = list.children.length;
    list.replaceChildren();
    return removedCount;
}

// 5.4. Настраивает обработчики списка: добавление, очистка и удаление через делегирование
function setupListEvents() {
    const addButton = getRequiredElement('add-item');
    const clearButton = getRequiredElement('clear-list');
    const input = getRequiredElement('item-input');
    const list = getRequiredElement('dynamic-list');

    bindHandler(addButton, 'click', () => addListItem());
    bindHandler(clearButton, 'click', () => clearList());

    // Добавление по нажатию Enter в поле ввода
    bindHandler(input, 'keydown', (event) => {
        if (event.key === 'Enter') {
            addListItem();
        }
    });

    // Делегирование: один обработчик на весь список вместо обработчика на каждую кнопку.
    // Он работает и для элементов, которые будут добавлены позже
    bindHandler(list, 'click', removeListItem);
}

// ================= ЗАДАНИЕ 6: Работа с формами =================

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const MIN_NAME_LENGTH = 2;
const MIN_AGE = 1;
const MAX_AGE = 120;

// Соответствие поля данных и поля ввода на странице
const FORM_FIELD_IDS = {
    name: 'user-name',
    email: 'user-email',
    age: 'user-age'
};

// 6.1. Проверяет данные формы { name, email, age }
// Возвращает объект с ошибками (только по неверным полям) или null, если всё верно
function validateForm(formData) {
    const data = formData && typeof formData === 'object' ? formData : {};
    const errors = {};

    // Имя: не пустое, минимум 2 символа (пробелы по краям не считаются)
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (name === '') {
        errors.name = 'Введите имя';
    } else if (name.length < MIN_NAME_LENGTH) {
        errors.name = `Имя должно содержать минимум ${MIN_NAME_LENGTH} символа`;
    }

    // Email: формат name@domain.zone
    const email = typeof data.email === 'string' ? data.email.trim() : '';
    if (email === '') {
        errors.email = 'Введите email';
    } else if (!EMAIL_PATTERN.test(email)) {
        errors.email = 'Введите корректный email (например, name@mail.ru)';
    }

    // Возраст: целое число от 1 до 120 (подходит и число, и строка с числом)
    const rawAge = data.age === null || data.age === undefined ? '' : String(data.age).trim();
    if (rawAge === '') {
        errors.age = 'Введите возраст';
    } else if (!NUMBER_PATTERN.test(rawAge)) {
        errors.age = 'Возраст должен быть числом';
    } else {
        const age = Number(rawAge);
        if (!Number.isInteger(age)) {
            errors.age = 'Возраст должен быть целым числом';
        } else if (age < MIN_AGE || age > MAX_AGE) {
            errors.age = `Возраст должен быть от ${MIN_AGE} до ${MAX_AGE}`;
        }
    }

    return Object.keys(errors).length === 0 ? null : errors;
}

// Убирает пометки об ошибках с полей формы
function clearInvalidMarks() {
    Object.values(FORM_FIELD_IDS).forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.classList.remove('input-error');
            input.removeAttribute('aria-invalid');
        }
    });
}

// 6.2. Показывает ошибки валидации в #form-output. Возвращает массив созданных элементов
function displayFormErrors(errors) {
    const output = getRequiredElement('form-output');
    output.setAttribute('aria-live', 'polite');
    output.replaceChildren();
    clearInvalidMarks();

    if (!errors || typeof errors !== 'object') {
        return [];
    }

    const created = [];
    let firstInvalidInput = null;

    Object.entries(errors).forEach(([field, message]) => {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.dataset.field = field;
        errorElement.textContent = message;
        output.appendChild(errorElement);
        created.push(errorElement);

        const input = document.getElementById(FORM_FIELD_IDS[field]);
        if (input) {
            input.classList.add('input-error');
            input.setAttribute('aria-invalid', 'true');
            if (!firstInvalidInput) firstInvalidInput = input;
        }
    });

    // Курсор переходит к первому полю с ошибкой
    if (firstInvalidInput) {
        firstInvalidInput.focus();
    }

    return created;
}

// 6.3. Показывает сообщение об успешной отправке. Возвращает созданный элемент
function displayFormSuccess(userData) {
    if (!userData || typeof userData !== 'object') {
        throw new TypeError('displayFormSuccess: ожидался объект с данными пользователя');
    }

    const output = getRequiredElement('form-output');
    output.setAttribute('aria-live', 'polite');
    output.replaceChildren();
    clearInvalidMarks();

    const message = document.createElement('div');
    message.className = 'success-message';

    const heading = document.createElement('h4');
    heading.textContent = 'Данные успешно отправлены!';
    message.appendChild(heading);

    [
        ['Имя', userData.name],
        ['Email', userData.email],
        ['Возраст', userData.age]
    ].forEach(([label, value]) => {
        const row = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = `${label}: `;
        row.append(strong, document.createTextNode(String(value ?? '')));
        message.appendChild(row);
    });

    output.appendChild(message);

    return message;
}

// 6.4. Обработка отправки формы. Возвращает объект ошибок или null, если всё верно
function handleFormSubmit(event) {
    // Отменяем стандартную отправку: страница не должна перезагружаться
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    const form = getRequiredElement('user-form');

    // Собираем данные формы
    const formData = {
        name: getRequiredElement('user-name').value,
        email: getRequiredElement('user-email').value,
        age: getRequiredElement('user-age').value
    };

    // Валидация и показ результата
    const errors = validateForm(formData);
    if (errors) {
        displayFormErrors(errors);
        return errors;
    }

    const userData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        age: Number(formData.age)
    };

    form.reset(); // сначала очищаем форму: событие reset также очищает #form-output
    displayFormSuccess(userData);

    return null;
}

// Очистка формы кнопкой reset или вызовом form.reset()
function handleFormReset() {
    getRequiredElement('form-output').replaceChildren();
    clearInvalidMarks();
}

// 6.5. Подключает обработчики к форме #user-form
function setupForm() {
    const form = getRequiredElement('user-form');

    // Отключаем встроенную проверку браузера, иначе при неверных данных событие submit
    // не наступит, и наши сообщения об ошибках никогда не появятся
    form.noValidate = true;

    bindHandler(form, 'submit', handleFormSubmit);
    bindHandler(form, 'reset', handleFormReset);
}

// ================= ИНИЦИАЛИЗАЦИЯ ВСЕХ ФУНКЦИЙ =================

// Вызывает все функции настройки
function initializeApp() {
    setupStyleToggle();
    setupClickCounter();
    setupInputDisplay();
    setupKeyboardEvents();
    setupListEvents();
    setupForm();

    // Демонстрация createCard и createList
    createCard('Пример карточки', 'Это содержимое карточки');
    createList(['Первый элемент', 'Второй элемент', 'Третий элемент']);

    console.log('Приложение инициализировано!');
}

// Запуск инициализации, когда DOM загружен
document.addEventListener('DOMContentLoaded', initializeApp);