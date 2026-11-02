// Тесты работают с реальным DOM, поэтому запускаются только в браузере
if (typeof document === 'undefined') {
    throw new Error('dom-tests.js нужно запускать в браузере (открыть index.html)');
}

let totalTests = 0;
let passedTests = 0;

// ================= Песочница: копия блока задач =================
// Тесты на время подменяют #tasks-section свежей копией, а потом возвращают настоящий блок на место.
// Так тесты не портят страницу, и каждый тест начинается с чистого состояния.

const FIXTURE_HTML = `
    <div class="task-area" id="task1">
        <h3>Задача 1: Создание элементов</h3>
        <div class="target" id="target1"></div>
    </div>
    <div class="task-area" id="task2">
        <h3>Задача 2: Навигация по DOM</h3>
        <div class="family-tree">
            <div class="parent" id="parent-element">
                Родительский элемент
                <div class="child">Дочерний элемент 1</div>
                <div class="child">Дочерний элемент 2</div>
                <div class="child special">Особый дочерний элемент</div>
            </div>
        </div>
    </div>
    <div class="task-area" id="task3">
        <h3>Задача 3: Работа с классами</h3>
        <div class="style-demo" id="style-target">Этот элемент будет стилизоваться</div>
        <button id="toggle-style">Переключить стиль</button>
    </div>
    <div class="task-area" id="task4">
        <h3>Задача 4: Обработка событий</h3>
        <div class="event-area">
            <button id="click-btn">Нажми меня</button>
            <div id="click-counter">Кликов: 0</div>
            <input type="text" id="text-input" placeholder="Введите текст">
            <div id="input-display"></div>
        </div>
    </div>
    <div class="task-area" id="task5">
        <h3>Задача 5: Динамические списки</h3>
        <div class="list-controls">
            <input type="text" id="item-input" placeholder="Новый элемент">
            <button id="add-item">Добавить</button>
            <button id="clear-list">Очистить</button>
        </div>
        <ul id="dynamic-list"></ul>
    </div>
    <div class="task-area" id="task6">
        <h3>Задача 6: Работа с формами</h3>
        <form id="user-form">
            <div><label for="user-name">Имя:</label><input type="text" id="user-name" required></div>
            <div><label for="user-email">Email:</label><input type="email" id="user-email" required></div>
            <div><label for="user-age">Возраст:</label><input type="number" id="user-age" min="1" max="120" required></div>
            <button type="submit">Отправить</button>
        </form>
        <div id="form-output"></div>
    </div>
`;

let originalSection = null;
let fixtureSection = null;

function mountFixture() {
    originalSection = document.getElementById('tasks-section');
    fixtureSection = document.createElement('section');
    fixtureSection.id = 'tasks-section';
    fixtureSection.innerHTML = FIXTURE_HTML;
    originalSection.replaceWith(fixtureSection);
}

function resetFixture() {
    fixtureSection.innerHTML = FIXTURE_HTML;
}

function unmountFixture() {
    if (fixtureSection && originalSection) {
        fixtureSection.replaceWith(originalSection);
    }
}

// ================= Вспомогательные функции для тестов =================

const $ = (id) => document.getElementById(id);

// Глубокое сравнение (различает undefined, NaN и работает с массивами и объектами)
function deepEqual(a, b) {
    if (a === b) return true;
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => Object.prototype.hasOwnProperty.call(b, key) && deepEqual(a[key], b[key]));
}

// Строка для вывода значения (показывает undefined, NaN, функции и DOM-элементы)
function format(value) {
    if (value instanceof Element) return `<${value.tagName.toLowerCase()}>`;
    const text = JSON.stringify(value, (key, item) => {
        if (item === undefined) return '__undefined__';
        if (typeof item === 'function') return '__[Function]__';
        if (typeof item === 'number' && !Number.isFinite(item)) return `__${item}__`;
        return item;
    });
    return text === undefined ? String(value) : text.replace(/"__(.*?)__"/g, '$1');
}

function errorNameOf(fn) {
    try {
        fn();
        return 'нет ошибки';
    } catch (error) {
        return error.name;
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Имитация ввода текста в поле
function typeInto(input, text) {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

// Перехват console.log: возвращает массив выведенных строк
function captureLogs(fn) {
    const originalLog = console.log;
    const messages = [];
    console.log = (...args) => messages.push(args.join(' '));
    try {
        fn();
    } finally {
        console.log = originalLog;
    }
    return messages;
}

// Подмена Math.random заранее заданными значениями (по кругу)
function withMathRandom(values, fn) {
    const originalRandom = Math.random;
    let index = 0;
    Math.random = () => values[index++ % values.length];
    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
}

// Текст элементов списка
const listTexts = () => Array.from($('dynamic-list').querySelectorAll('.list-item-text')).map((el) => el.textContent);

// Заполнение формы
function fillForm(name, email, age) {
    $('user-name').value = name;
    $('user-email').value = email;
    $('user-age').value = age;
}

// ================= Вывод результатов =================

function createTestPanel() {
    const panel = document.createElement('section');
    panel.className = 'task-area';
    panel.id = 'test-panel';
    panel.innerHTML = '<h3>Результаты тестов</h3><div id="test-summary"></div><div id="test-results"></div>';
    const footer = document.getElementById('main-footer');
    footer.parentNode.insertBefore(panel, footer);
}

function runTest(testName, actual, expected) {
    const isEqual = deepEqual(actual, expected);
    totalTests++;
    if (isEqual) passedTests++;

    console.log(`${testName}:`, isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА', { expected, actual });

    const result = document.createElement('div');
    result.className = `test-result ${isEqual ? 'test-success' : 'test-failure'}`;

    const title = document.createElement('strong');
    title.textContent = `${testName}: `;
    result.append(title, document.createTextNode(isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА'));

    if (!isEqual) {
        result.append(
            document.createElement('br'),
            document.createTextNode(`Ожидалось: ${format(expected)}`),
            document.createElement('br'),
            document.createTextNode(`Получено: ${format(actual)}`)
        );
    }

    document.getElementById('test-results').appendChild(result);
}

function runTestThrows(testName, fn, expectedErrorName) {
    runTest(testName, errorNameOf(fn), expectedErrorName);
}

function addSection(title) {
    console.log(`\n--- ${title} ---`);
    const heading = document.createElement('h4');
    heading.className = 'test-section-title';
    heading.textContent = title;
    document.getElementById('test-results').appendChild(heading);
}

function renderSummary() {
    const failed = totalTests - passedTests;
    const text = failed === 0
        ? `Пройдено тестов: ${passedTests} из ${totalTests}. Все тесты пройдены!`
        : `Пройдено тестов: ${passedTests} из ${totalTests}. Ошибок: ${failed}`;

    console.log(text);

    const summary = document.getElementById('test-summary');
    summary.className = `test-result ${failed === 0 ? 'test-success' : 'test-failure'}`;
    summary.textContent = text;
}

// ================= Тесты =================

function testFunctionsExist() {
    addSection('Наличие функций');

    const names = [
        'createCard', 'createList', 'countChildren', 'findSpecialChild', 'getParentBackground',
        'setupStyleToggle', 'changeHeaderColor', 'animateElement', 'setupClickCounter',
        'setupInputDisplay', 'setupKeyboardEvents', 'addListItem', 'removeListItem', 'clearList',
        'setupListEvents', 'validateForm', 'displayFormErrors', 'displayFormSuccess',
        'handleFormSubmit', 'setupForm', 'initializeApp'
    ];
    const missing = names.filter((name) => typeof window[name] !== 'function');

    runTest('все 21 функция из задания объявлены', missing, []);
    runTest('количество функций', names.length, 21);
}

function testCreation() {
    addSection('Задание 1. Создание и вставка элементов');

    // ----- createCard -----
    resetFixture();
    const target = $('target1');
    runTest('#target1 вначале пуст', target.children.length, 0);

    const card = createCard('Заголовок', 'Текст карточки');
    runTest('createCard возвращает div', card.tagName, 'DIV');
    runTest('createCard: класс card', card.className, 'card');
    runTest('createCard: внутри h4 и p', Array.from(card.children).map((el) => el.tagName), ['H4', 'P']);
    runTest('createCard: текст заголовка', card.querySelector('h4').textContent, 'Заголовок');
    runTest('createCard: текст абзаца', card.querySelector('p').textContent, 'Текст карточки');
    runTest('createCard добавляет карточку в #target1', card.parentElement.id, 'target1');

    createCard('Вторая', 'Ещё текст');
    runTest('createCard: карточки добавляются по порядку',
        Array.from(target.querySelectorAll('.card h4')).map((el) => el.textContent), ['Заголовок', 'Вторая']);

    resetFixture();
    createCard();
    runTest('createCard() без аргументов создаёт пустую карточку',
        [$('target1').querySelector('h4').textContent, $('target1').querySelector('p').textContent], ['', '']);

    resetFixture();
    createCard(42, true);
    runTest('createCard приводит числа и булевы значения к тексту',
        [$('target1').querySelector('h4').textContent, $('target1').querySelector('p').textContent], ['42', 'true']);

    resetFixture();
    createCard('<b>жирный</b>', '<img src="x" onerror="window.__xssFlag = true">');
    runTest('createCard показывает HTML как текст',
        $('target1').querySelector('h4').textContent, '<b>жирный</b>');
    runTest('createCard не создаёт теги из строки',
        [$('target1').querySelector('b'), $('target1').querySelector('img')], [null, null]);
    runTest('createCard: код из атрибута не выполнился', window.__xssFlag, undefined);

    resetFixture();
    createCard('Очень длинный заголовок '.repeat(50), 'Т'.repeat(5000));
    runTest('createCard: длинные строки', $('target1').querySelector('p').textContent.length, 5000);

    resetFixture();
    $('target1').remove();
    runTestThrows('createCard без #target1 выбрасывает ошибку', () => createCard('a', 'b'), 'Error');

    // ----- createList -----
    resetFixture();
    const list = createList(['Первый', 'Второй', 'Третий']);
    runTest('createList возвращает ol', list.tagName, 'OL');
    runTest('createList: три пункта li',
        Array.from(list.children).map((el) => el.tagName), ['LI', 'LI', 'LI']);
    runTest('createList: тексты пунктов', Array.from(list.children).map((el) => el.textContent),
        ['Первый', 'Второй', 'Третий']);
    runTest('createList добавляет список в #target1', list.parentElement.id, 'target1');

    resetFixture();
    runTest('createList([]) создаёт пустой список', createList([]).children.length, 0);

    resetFixture();
    runTest('createList приводит числа к тексту',
        Array.from(createList([1, 2.5]).children).map((el) => el.textContent), ['1', '2.5']);

    resetFixture();
    const htmlList = createList(['<i>курсив</i>']);
    runTest('createList не создаёт теги из строк', [htmlList.querySelector('i'), htmlList.firstChild.textContent],
        [null, '<i>курсив</i>']);

    resetFixture();
    createList(['a']);
    createList(['b']);
    runTest('createList: два вызова дают два списка', $('target1').querySelectorAll('ol').length, 2);

    resetFixture();
    createCard('Карточка', 'Текст');
    createList(['один']);
    runTest('карточка и список лежат рядом в #target1',
        Array.from($('target1').children).map((el) => el.tagName), ['DIV', 'OL']);

    runTestThrows('createList("строка") выбрасывает TypeError', () => createList('строка'), 'TypeError');
    runTestThrows('createList(null) выбрасывает TypeError', () => createList(null), 'TypeError');
    runTestThrows('createList() без аргументов выбрасывает TypeError', () => createList(), 'TypeError');
}

function testNavigation() {
    addSection('Задание 2. Навигация по DOM');

    // ----- countChildren -----
    resetFixture();
    runTest('countChildren() = 3', countChildren(), 3);
    runTest('countChildren считает только элементы, а не текстовые узлы',
        $('parent-element').childNodes.length > countChildren(), true);

    const extra = document.createElement('div');
    extra.className = 'child';
    $('parent-element').appendChild(extra);
    runTest('countChildren после добавления элемента', countChildren(), 4);

    const grandchild = document.createElement('span');
    extra.appendChild(grandchild);
    runTest('countChildren не считает вложенные элементы', countChildren(), 4);

    $('parent-element').querySelectorAll('.child').forEach((el) => el.remove());
    runTest('countChildren после удаления всех детей', countChildren(), 0);

    resetFixture();
    $('parent-element').remove();
    runTestThrows('countChildren без #parent-element выбрасывает ошибку', () => countChildren(), 'Error');

    // ----- findSpecialChild -----
    resetFixture();
    runTest('findSpecialChild() возвращает текст без лишних пробелов', findSpecialChild(), 'Особый дочерний элемент');

    $('parent-element').querySelector('.special').textContent = '  Новый текст  ';
    runTest('findSpecialChild убирает пробелы по краям', findSpecialChild(), 'Новый текст');

    resetFixture();
    $('parent-element').querySelector('.special').classList.remove('special');
    runTest('findSpecialChild без элемента .special возвращает null', findSpecialChild(), null);

    resetFixture();
    const secondSpecial = document.createElement('div');
    secondSpecial.className = 'child special';
    secondSpecial.textContent = 'Второй особый';
    $('parent-element').appendChild(secondSpecial);
    runTest('findSpecialChild: при нескольких .special берётся первый', findSpecialChild(), 'Особый дочерний элемент');

    resetFixture();
    const outsider = document.createElement('div');
    outsider.className = 'special';
    outsider.textContent = 'Снаружи';
    $('task1').appendChild(outsider);
    $('parent-element').querySelector('.special').classList.remove('special');
    runTest('findSpecialChild игнорирует .special вне #parent-element', findSpecialChild(), null);

    resetFixture();
    $('parent-element').remove();
    runTestThrows('findSpecialChild без #parent-element выбрасывает ошибку', () => findSpecialChild(), 'Error');

    // ----- getParentBackground -----
    resetFixture();
    runTest('getParentBackground() = цвет #3498db', getParentBackground(), 'rgb(52, 152, 219)');

    $('parent-element').style.background = 'red';
    runTest('getParentBackground учитывает изменение стиля', getParentBackground(), 'rgb(255, 0, 0)');

    resetFixture();
    $('parent-element').querySelectorAll('.child').forEach((el) => el.remove());
    runTest('getParentBackground без .child возвращает null', getParentBackground(), null);
}

function testStyles() {
    addSection('Задание 3. Классы и стили');

    // ----- setupStyleToggle -----
    resetFixture();
    setupStyleToggle();
    const styleTarget = $('style-target');
    runTest('вначале класса active-style нет', styleTarget.classList.contains('active-style'), false);

    $('toggle-style').click();
    runTest('первый клик добавляет active-style', styleTarget.classList.contains('active-style'), true);

    $('toggle-style').click();
    runTest('второй клик убирает active-style', styleTarget.classList.contains('active-style'), false);

    for (let i = 0; i < 5; i++) $('toggle-style').click();
    runTest('после 5 кликов класс снова есть', styleTarget.classList.contains('active-style'), true);

    runTest('класс active-style меняет вид элемента (зелёный фон)',
        getComputedStyle(styleTarget).backgroundColor, 'rgb(46, 204, 113)');

    resetFixture();
    setupStyleToggle();
    setupStyleToggle();
    $('toggle-style').click();
    runTest('повторный вызов setupStyleToggle не дублирует обработчик',
        $('style-target').classList.contains('active-style'), true);

    resetFixture();
    $('style-target').className = 'style-demo another';
    setupStyleToggle();
    $('toggle-style').click();
    runTest('toggle не затрагивает другие классы', $('style-target').className, 'style-demo another active-style');

    resetFixture();
    $('toggle-style').remove();
    runTestThrows('setupStyleToggle без кнопки выбрасывает ошибку', () => setupStyleToggle(), 'Error');

    // ----- changeHeaderColor -----
    const header = $('main-header');
    const savedInlineStyle = header.getAttribute('style');

    const colorMin = withMathRandom([0], () => changeHeaderColor());
    runTest('changeHeaderColor: минимальный цвет', colorMin, '#1e1e1e');
    runTest('цвет применён к шапке', getComputedStyle(header).backgroundColor, 'rgb(30, 30, 30)');
    runTest('градиент шапки заменён цветом', getComputedStyle(header).backgroundImage, 'none');

    const colorMax = withMathRandom([0.999999], () => changeHeaderColor());
    runTest('changeHeaderColor: максимальный цвет', colorMax, '#c8c8c8');

    const colorMix = withMathRandom([0, 0.5, 0.999999], () => changeHeaderColor());
    runTest('changeHeaderColor: каналы считаются по отдельности', colorMix, '#1e73c8');

    const colors = Array.from({ length: 50 }, () => changeHeaderColor());
    runTest('changeHeaderColor: всегда формат #rrggbb', colors.every((c) => /^#[0-9a-f]{6}$/.test(c)), true);
    runTest('changeHeaderColor: цвета не однотонные (есть разные)', new Set(colors).size > 1, true);
    runTest('changeHeaderColor: каналы в диапазоне 30-200',
        colors.every((c) => [1, 3, 5].every((i) => {
            const channel = parseInt(c.slice(i, i + 2), 16);
            return channel >= 30 && channel <= 200;
        })), true);

    if (savedInlineStyle === null) header.removeAttribute('style');
    else header.setAttribute('style', savedInlineStyle);
}

async function testAnimation() {
    addSection('Задание 3.3. Анимация');

    resetFixture();
    const styleTarget = $('style-target');

    const promise = animateElement(60);
    runTest('animateElement возвращает Promise', promise instanceof Promise, true);
    runTest('во время анимации элемент увеличен', styleTarget.style.transform, 'scale(1.15)');
    runTest('во время анимации прозрачность 0.5', styleTarget.style.opacity, '0.5');

    const resolved = await promise;
    runTest('Promise возвращает анимируемый элемент', resolved.id, 'style-target');
    runTest('после анимации размер возвращён', styleTarget.style.transform, '');
    runTest('после анимации прозрачность возвращена', styleTarget.style.opacity, '');
    runTest('после анимации inline-transition убран', styleTarget.style.transition, '');

    resetFixture();
    const target2 = $('style-target');
    target2.classList.add('keep-me');
    await animateElement(40);
    runTest('анимация не трогает классы элемента', target2.classList.contains('keep-me'), true);

    resetFixture();
    const target3 = $('style-target');
    const first = animateElement(80);
    await sleep(20);
    const second = animateElement(80);
    await first;
    runTest('при повторном запуске первая анимация не сбрасывает вторую', target3.style.opacity, '0.5');
    await second;
    runTest('после завершения последней анимации стили сброшены', [target3.style.opacity, target3.style.transform], ['', '']);

    runTestThrows('animateElement(-1) выбрасывает RangeError', () => animateElement(-1), 'RangeError');
    runTestThrows('animateElement("abc") выбрасывает RangeError', () => animateElement('abc'), 'RangeError');

    resetFixture();
    $('style-target').remove();
    runTestThrows('animateElement без #style-target выбрасывает ошибку', () => animateElement(10), 'Error');
}

function testEvents() {
    addSection('Задание 4. Обработка событий');

    // ----- setupClickCounter -----
    resetFixture();
    setupClickCounter();
    runTest('счётчик вначале: "Кликов: 0"', $('click-counter').textContent, 'Кликов: 0');

    $('click-btn').click();
    runTest('один клик', $('click-counter').textContent, 'Кликов: 1');

    for (let i = 0; i < 4; i++) $('click-btn').click();
    runTest('пять кликов', $('click-counter').textContent, 'Кликов: 5');

    for (let i = 0; i < 95; i++) $('click-btn').click();
    runTest('сто кликов', $('click-counter').textContent, 'Кликов: 100');

    setupClickCounter();
    runTest('повторный setupClickCounter сбрасывает счётчик', $('click-counter').textContent, 'Кликов: 0');
    $('click-btn').click();
    runTest('после повторной настройки обработчик не дублируется', $('click-counter').textContent, 'Кликов: 1');

    resetFixture();
    $('click-counter').remove();
    runTestThrows('setupClickCounter без #click-counter выбрасывает ошибку', () => setupClickCounter(), 'Error');

    // ----- setupInputDisplay -----
    resetFixture();
    setupInputDisplay();
    runTest('вначале #input-display пуст', $('input-display').textContent, '');

    typeInto($('text-input'), 'Привет');
    runTest('введённый текст показывается', $('input-display').textContent, 'Привет');

    typeInto($('text-input'), 'Привет, мир!');
    runTest('текст обновляется при каждом изменении', $('input-display').textContent, 'Привет, мир!');

    typeInto($('text-input'), '');
    runTest('очистка поля очищает вывод', $('input-display').textContent, '');

    typeInto($('text-input'), '<b>жирный</b> & "кавычки"');
    runTest('HTML показывается как текст', $('input-display').textContent, '<b>жирный</b> & "кавычки"');
    runTest('теги из ввода не создаются', $('input-display').querySelector('b'), null);

    typeInto($('text-input'), '  пробелы  ');
    runTest('пробелы не обрезаются', $('input-display').textContent, '  пробелы  ');

    typeInto($('text-input'), 'я'.repeat(3000));
    runTest('очень длинный текст', $('input-display').textContent.length, 3000);

    resetFixture();
    $('text-input').value = 'уже введено';
    setupInputDisplay();
    runTest('при настройке учитывается уже введённый текст', $('input-display').textContent, 'уже введено');

    // ----- formatKeyEvent и setupKeyboardEvents -----
    runTest('formatKeyEvent: обычная клавиша',
        formatKeyEvent(new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' })), 'keydown: символ "a", код KeyA');
    runTest('formatKeyEvent: отпускание клавиши',
        formatKeyEvent(new KeyboardEvent('keyup', { key: 'a', code: 'KeyA' })), 'keyup: символ "a", код KeyA');
    runTest('formatKeyEvent: пробел',
        formatKeyEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' })), 'keydown: символ "(пробел)", код Space');
    runTest('formatKeyEvent: Enter',
        formatKeyEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' })), 'keydown: символ "Enter", код Enter');
    runTest('formatKeyEvent: модификаторы',
        formatKeyEvent(new KeyboardEvent('keydown', { key: 'A', code: 'KeyA', shiftKey: true, ctrlKey: true })),
        'keydown: символ "A", код KeyA, модификаторы: Ctrl+Shift');
    runTest('formatKeyEvent: кириллица',
        formatKeyEvent(new KeyboardEvent('keydown', { key: 'ф', code: 'KeyA' })), 'keydown: символ "ф", код KeyA');
    runTest('formatKeyEvent: нет кода клавиши',
        formatKeyEvent(new KeyboardEvent('keydown', { key: 'x' })), 'keydown: символ "x", код —');

    setupKeyboardEvents();
    const downLogs = captureLogs(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', code: 'KeyQ' }));
    });
    runTest('keydown на документе выводит одну строку в консоль', downLogs, ['keydown: символ "q", код KeyQ']);

    const upLogs = captureLogs(() => {
        document.dispatchEvent(new KeyboardEvent('keyup', { key: 'q', code: 'KeyQ' }));
    });
    runTest('keyup на документе выводит одну строку в консоль', upLogs, ['keyup: символ "q", код KeyQ']);

    setupKeyboardEvents();
    const onceLogs = captureLogs(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' }));
    });
    runTest('повторный setupKeyboardEvents не дублирует вывод', onceLogs.length, 1);

    resetFixture();
    const inputLogs = captureLogs(() => {
        $('text-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true }));
    });
    runTest('нажатия внутри поля ввода тоже попадают в консоль (всплытие)', inputLogs.length, 1);
}

function testLists() {
    addSection('Задание 5. Динамические списки');

    // ----- addListItem -----
    resetFixture();
    $('item-input').value = 'Молоко';
    const item = addListItem();
    runTest('addListItem возвращает li', item.tagName, 'LI');
    runTest('addListItem: класс list-item', item.className, 'list-item');
    runTest('addListItem: текст элемента', listTexts(), ['Молоко']);
    runTest('addListItem: поле ввода очищено', $('item-input').value, '');
    runTest('addListItem: фокус вернулся в поле ввода', document.activeElement.id, 'item-input');

    const deleteButtons = item.querySelectorAll('button');
    runTest('addListItem: у элемента одна кнопка удаления', deleteButtons.length, 1);
    runTest('addListItem: кнопка называется «Удалить» и не отправляет форму',
        [deleteButtons[0].textContent, deleteButtons[0].type], ['Удалить', 'button']);

    $('item-input').value = '  Хлеб  ';
    addListItem();
    runTest('addListItem обрезает пробелы по краям', listTexts(), ['Молоко', 'Хлеб']);

    $('item-input').value = '';
    runTest('addListItem: пустой ввод возвращает null', addListItem(), null);
    $('item-input').value = '     ';
    runTest('addListItem: ввод из одних пробелов возвращает null', addListItem(), null);
    runTest('addListItem: пустой ввод не добавляет элементов', $('dynamic-list').children.length, 2);

    $('item-input').value = 'Хлеб';
    addListItem();
    runTest('addListItem: повторяющиеся значения разрешены, порядок сохраняется', listTexts(), ['Молоко', 'Хлеб', 'Хлеб']);

    $('item-input').value = '<b>тег</b>';
    addListItem();
    runTest('addListItem: HTML в тексте не создаёт теги',
        [$('dynamic-list').querySelector('b'), listTexts()[3]], [null, '<b>тег</b>']);

    $('item-input').value = 'д'.repeat(1000);
    addListItem();
    runTest('addListItem: длинный текст', listTexts()[4].length, 1000);

    resetFixture();
    $('item-input').remove();
    runTestThrows('addListItem без #item-input выбрасывает ошибку', () => addListItem(), 'Error');

    // ----- removeListItem -----
    resetFixture();
    ['a', 'b', 'c'].forEach((text) => { $('item-input').value = text; addListItem(); });
    const items = $('dynamic-list').children;
    const middleButton = items[1].querySelector('button');
    const removed = removeListItem({ target: middleButton });
    runTest('removeListItem возвращает true при клике по кнопке', removed, true);
    runTest('removeListItem удаляет нужный элемент', listTexts(), ['a', 'c']);

    runTest('removeListItem: клик по тексту элемента ничего не удаляет',
        removeListItem({ target: items[0].querySelector('.list-item-text') }), false);
    runTest('removeListItem: клик по самому li ничего не удаляет', removeListItem({ target: items[0] }), false);
    runTest('removeListItem: клик вне списка', removeListItem({ target: document.body }), false);
    runTest('removeListItem(undefined)', removeListItem(), false);
    runTest('removeListItem: целевой объект не элемент', removeListItem({ target: {} }), false);
    runTest('после «лишних» кликов список не изменился', listTexts(), ['a', 'c']);

    removeListItem({ target: $('dynamic-list').children[0].querySelector('button') });
    removeListItem({ target: $('dynamic-list').children[0].querySelector('button') });
    runTest('можно удалить все элементы', $('dynamic-list').children.length, 0);

    // ----- clearList -----
    resetFixture();
    runTest('clearList на пустом списке возвращает 0', clearList(), 0);
    ['1', '2', '3'].forEach((text) => { $('item-input').value = text; addListItem(); });
    runTest('clearList возвращает количество удалённых элементов', clearList(), 3);
    runTest('clearList очищает список', $('dynamic-list').children.length, 0);
    runTest('сам список #dynamic-list остался на странице', $('dynamic-list') !== null, true);

    resetFixture();
    $('dynamic-list').remove();
    runTestThrows('clearList без #dynamic-list выбрасывает ошибку', () => clearList(), 'Error');

    // ----- setupListEvents (клики настоящими событиями) -----
    resetFixture();
    setupListEvents();
    $('item-input').value = 'через кнопку';
    $('add-item').click();
    runTest('кнопка «Добавить» добавляет элемент', listTexts(), ['через кнопку']);

    $('item-input').value = 'через Enter';
    $('item-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    runTest('клавиша Enter в поле добавляет элемент', listTexts(), ['через кнопку', 'через Enter']);

    $('item-input').value = 'не Enter';
    $('item-input').dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    runTest('другие клавиши не добавляют элемент', listTexts(), ['через кнопку', 'через Enter']);

    $('dynamic-list').children[0].querySelector('button').click();
    runTest('клик по «Удалить» удаляет элемент (делегирование)', listTexts(), ['через Enter']);

    $('item-input').value = 'добавлен позже';
    $('add-item').click();
    $('dynamic-list').children[1].querySelector('button').click();
    runTest('удаление работает и для элементов, добавленных после настройки', listTexts(), ['через Enter']);

    $('clear-list').click();
    runTest('кнопка «Очистить» очищает список', $('dynamic-list').children.length, 0);

    setupListEvents();
    $('item-input').value = 'один раз';
    $('add-item').click();
    runTest('повторный setupListEvents не дублирует обработчики', $('dynamic-list').children.length, 1);

    resetFixture();
    $('clear-list').remove();
    runTestThrows('setupListEvents без кнопки «Очистить» выбрасывает ошибку', () => setupListEvents(), 'Error');
}

function testValidation() {
    addSection('Задание 6.1. validateForm');

    const valid = { name: 'Анна', email: 'anna@mail.ru', age: 25 };
    runTest('корректные данные дают null', validateForm(valid), null);
    runTest('возраст строкой тоже подходит', validateForm({ ...valid, age: '25' }), null);
    runTest('пробелы по краям игнорируются',
        validateForm({ name: '  Анна  ', email: '  anna@mail.ru ', age: ' 25 ' }), null);

    // имя
    runTest('пустое имя', validateForm({ ...valid, name: '' }), { name: 'Введите имя' });
    runTest('имя из пробелов', validateForm({ ...valid, name: '   ' }), { name: 'Введите имя' });
    runTest('имя из одной буквы', validateForm({ ...valid, name: 'А' }),
        { name: 'Имя должно содержать минимум 2 символа' });
    runTest('имя из одной буквы с пробелами', validateForm({ ...valid, name: '  Я  ' }),
        { name: 'Имя должно содержать минимум 2 символа' });
    runTest('имя из двух букв подходит', validateForm({ ...valid, name: 'Ян' }), null);
    runTest('имя не строка', validateForm({ ...valid, name: 123 }), { name: 'Введите имя' });
    runTest('имя отсутствует', validateForm({ email: valid.email, age: 25 }), { name: 'Введите имя' });

    // email
    runTest('пустой email', validateForm({ ...valid, email: '' }), { email: 'Введите email' });
    ['abc', 'a@b', '@mail.ru', 'a@.ru', 'a b@mail.ru', 'a@@mail.ru', 'anna@mail'].forEach((email) => {
        runTest(`некорректный email "${email}"`, Object.keys(validateForm({ ...valid, email }) || {}), ['email']);
    });
    ['a@b.c', 'user.name+tag@example.co.uk', 'тест@почта.рф'].forEach((email) => {
        runTest(`корректный email "${email}"`, validateForm({ ...valid, email }), null);
    });

    // возраст
    runTest('возраст 1 (нижняя граница)', validateForm({ ...valid, age: 1 }), null);
    runTest('возраст 120 (верхняя граница)', validateForm({ ...valid, age: 120 }), null);
    runTest('возраст 0', validateForm({ ...valid, age: 0 }), { age: 'Возраст должен быть от 1 до 120' });
    runTest('возраст 121', validateForm({ ...valid, age: 121 }), { age: 'Возраст должен быть от 1 до 120' });
    runTest('отрицательный возраст', validateForm({ ...valid, age: -5 }), { age: 'Возраст должен быть от 1 до 120' });
    runTest('дробный возраст', validateForm({ ...valid, age: 25.5 }), { age: 'Возраст должен быть целым числом' });
    runTest('дробный возраст строкой', validateForm({ ...valid, age: '25.5' }), { age: 'Возраст должен быть целым числом' });
    runTest('возраст не число', validateForm({ ...valid, age: 'abc' }), { age: 'Возраст должен быть числом' });
    runTest('возраст "12abc"', validateForm({ ...valid, age: '12abc' }), { age: 'Возраст должен быть числом' });
    runTest('возраст в экспоненциальной записи', validateForm({ ...valid, age: '1e2' }), { age: 'Возраст должен быть числом' });
    runTest('возраст NaN', validateForm({ ...valid, age: NaN }), { age: 'Возраст должен быть числом' });
    runTest('возраст Infinity', validateForm({ ...valid, age: Infinity }), { age: 'Возраст должен быть числом' });
    runTest('пустой возраст', validateForm({ ...valid, age: '' }), { age: 'Введите возраст' });
    runTest('возраст null', validateForm({ ...valid, age: null }), { age: 'Введите возраст' });
    runTest('возраст undefined', validateForm({ name: valid.name, email: valid.email }), { age: 'Введите возраст' });

    // несколько ошибок и неверные аргументы
    runTest('все три ошибки сразу', Object.keys(validateForm({ name: '', email: 'x', age: 0 })), ['name', 'email', 'age']);
    runTest('validateForm({}) даёт три ошибки', Object.keys(validateForm({})), ['name', 'email', 'age']);
    runTest('validateForm() без аргументов даёт три ошибки', Object.keys(validateForm()), ['name', 'email', 'age']);
    runTest('validateForm(null) даёт три ошибки', Object.keys(validateForm(null)), ['name', 'email', 'age']);
    runTest('validateForm("строка") даёт три ошибки', Object.keys(validateForm('строка')), ['name', 'email', 'age']);
    runTest('в результате только неверные поля', Object.keys(validateForm({ name: 'Ян', email: 'bad', age: 30 })), ['email']);
}

function testFormDisplay() {
    addSection('Задание 6.2-6.5. Вывод и отправка формы');

    // ----- displayFormErrors -----
    resetFixture();
    const created = displayFormErrors({ name: 'Введите имя', age: 'Введите возраст' });
    runTest('displayFormErrors создаёт элемент на каждую ошибку', created.length, 2);
    runTest('ошибки имеют класс error-message',
        Array.from($('form-output').children).map((el) => el.className), ['error-message', 'error-message']);
    runTest('тексты ошибок', Array.from($('form-output').children).map((el) => el.textContent),
        ['Введите имя', 'Введите возраст']);
    runTest('поля с ошибками помечены', [
        $('user-name').classList.contains('input-error'),
        $('user-email').classList.contains('input-error'),
        $('user-age').getAttribute('aria-invalid')
    ], [true, false, 'true']);
    runTest('фокус переходит к первому полю с ошибкой', document.activeElement.id, 'user-name');
    runTest('в выводе нет сообщения об успехе', $('form-output').querySelector('.success-message'), null);

    displayFormErrors({ email: 'Введите email' });
    runTest('повторный вызов заменяет прежние ошибки', $('form-output').children.length, 1);
    runTest('пометки с прежних полей снимаются',
        [$('user-name').classList.contains('input-error'), $('user-email').classList.contains('input-error')], [false, true]);

    displayFormErrors({ name: '<b>не тег</b>' });
    runTest('текст ошибки вставляется как текст', [$('form-output').querySelector('b'), $('form-output').textContent],
        [null, '<b>не тег</b>']);

    displayFormErrors({});
    runTest('пустой объект ошибок очищает вывод', $('form-output').children.length, 0);
    displayFormErrors({ name: 'x' });
    displayFormErrors(null);
    runTest('displayFormErrors(null) очищает вывод', $('form-output').children.length, 0);
    runTest('displayFormErrors(null) возвращает пустой массив', displayFormErrors(null), []);

    // ----- displayFormSuccess -----
    resetFixture();
    displayFormErrors({ name: 'Ошибка' });
    const success = displayFormSuccess({ name: 'Анна', email: 'anna@mail.ru', age: 25 });
    runTest('displayFormSuccess возвращает div.success-message', [success.tagName, success.className], ['DIV', 'success-message']);
    runTest('успешное сообщение показано в #form-output', $('form-output').querySelectorAll('.success-message').length, 1);
    runTest('успешное сообщение заменяет ошибки', $('form-output').querySelector('.error-message'), null);
    runTest('пометки об ошибках сняты', $('user-name').classList.contains('input-error'), false);
    runTest('в сообщении есть имя, email и возраст',
        ['Анна', 'anna@mail.ru', '25'].every((text) => success.textContent.includes(text)), true);

    displayFormSuccess({ name: '<img src=x>', email: 'a@b.c', age: 1 });
    runTest('displayFormSuccess не создаёт теги из данных',
        [$('form-output').querySelector('img'), $('form-output').textContent.includes('<img src=x>')], [null, true]);

    displayFormSuccess({ name: 'Ян' });
    runTest('displayFormSuccess с неполными данными не падает', $('form-output').querySelector('.success-message') !== null, true);
    runTestThrows('displayFormSuccess() без данных выбрасывает TypeError', () => displayFormSuccess(), 'TypeError');
    runTestThrows('displayFormSuccess("строка") выбрасывает TypeError', () => displayFormSuccess('строка'), 'TypeError');

    // ----- handleFormSubmit (напрямую) -----
    resetFixture();
    let prevented = false;
    fillForm('Анна', 'anna@mail.ru', '25');
    const resultOk = handleFormSubmit({ preventDefault() { prevented = true; } });
    runTest('handleFormSubmit вызывает preventDefault', prevented, true);
    runTest('handleFormSubmit при верных данных возвращает null', resultOk, null);
    runTest('показано сообщение об успехе', $('form-output').querySelector('.success-message') !== null, true);
    runTest('форма очищена после успеха', [$('user-name').value, $('user-email').value, $('user-age').value], ['', '', '']);
    runTest('сообщение об успехе не пропало после очистки формы', $('form-output').textContent.includes('Анна'), true);

    fillForm('', 'bad', '0');
    const resultBad = handleFormSubmit({ preventDefault() {} });
    runTest('handleFormSubmit при ошибках возвращает объект с тремя ошибками', Object.keys(resultBad), ['name', 'email', 'age']);
    runTest('показаны три сообщения об ошибках', $('form-output').querySelectorAll('.error-message').length, 3);
    runTest('сообщение об успехе заменено ошибками', $('form-output').querySelector('.success-message'), null);
    runTest('данные в форме при ошибках сохраняются', [$('user-email').value, $('user-age').value], ['bad', '0']);

    fillForm('  Мария  ', ' maria@mail.ru ', '30');
    handleFormSubmit({ preventDefault() {} });
    runTest('данные в сообщении об успехе обрезаются от пробелов',
        $('form-output').textContent.includes('Имя: Мария') && $('form-output').textContent.includes('Email: maria@mail.ru'), true);

    runTest('handleFormSubmit без объекта события не падает', errorNameOf(() => handleFormSubmit()), 'нет ошибки');

    // ----- setupForm (настоящие события) -----
    resetFixture();
    setupForm();
    runTest('setupForm отключает встроенную проверку браузера', $('user-form').noValidate, true);

    const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
    $('user-form').dispatchEvent(submitEvent);
    runTest('событие submit отменяется (страница не перезагрузится)', submitEvent.defaultPrevented, true);
    runTest('пустая форма: показаны ошибки', $('form-output').querySelectorAll('.error-message').length, 3);

    fillForm('Олег', 'oleg@mail.ru', '40');
    $('user-form').requestSubmit();
    runTest('requestSubmit с верными данными показывает успех', $('form-output').querySelector('.success-message') !== null, true);

    fillForm('Олег', 'oleg-mail', '40');
    $('user-form').requestSubmit();
    runTest('requestSubmit с неверным email показывает ошибку email',
        Array.from($('form-output').children).map((el) => el.dataset.field), ['email']);

    $('user-form').reset();
    runTest('сброс формы очищает #form-output', $('form-output').children.length, 0);
    runTest('сброс формы снимает пометки об ошибках', $('user-email').classList.contains('input-error'), false);

    setupForm();
    $('user-name').value = 'Ян';
    $('user-email').value = 'yan@mail.ru';
    $('user-age').value = '20';
    $('user-form').requestSubmit();
    runTest('повторный setupForm не дублирует обработчик submit', $('form-output').querySelectorAll('.success-message').length, 1);

    resetFixture();
    $('user-form').remove();
    runTestThrows('setupForm без формы выбрасывает ошибку', () => setupForm(), 'Error');
}

function testInitialization() {
    addSection('Инициализация и совместная работа');

    resetFixture();
    const logs = captureLogs(() => initializeApp());
    runTest('initializeApp пишет сообщение в консоль', logs.includes('Приложение инициализировано!'), true);
    runTest('initializeApp создаёт демонстрационную карточку',
        $('target1').querySelector('.card h4').textContent, 'Пример карточки');
    runTest('initializeApp создаёт демонстрационный список',
        Array.from($('target1').querySelectorAll('ol li')).map((li) => li.textContent),
        ['Первый элемент', 'Второй элемент', 'Третий элемент']);

    $('click-btn').click();
    $('click-btn').click();
    runTest('после initializeApp работает счётчик кликов', $('click-counter').textContent, 'Кликов: 2');

    typeInto($('text-input'), 'проверка');
    runTest('после initializeApp работает вывод текста', $('input-display').textContent, 'проверка');

    $('toggle-style').click();
    runTest('после initializeApp работает переключение стиля', $('style-target').classList.contains('active-style'), true);

    // Сценарий: добавить три элемента, удалить средний, очистить
    ['x', 'y', 'z'].forEach((text) => { $('item-input').value = text; $('add-item').click(); });
    $('dynamic-list').children[1].querySelector('button').click();
    runTest('сценарий: добавили три, удалили средний', listTexts(), ['x', 'z']);
    $('clear-list').click();
    runTest('сценарий: очистили список', $('dynamic-list').children.length, 0);

    // Сценарий: сначала ошибка, потом успех
    fillForm('Я', 'bad', '500');
    $('user-form').requestSubmit();
    runTest('сценарий: неверная форма даёт 3 ошибки', $('form-output').querySelectorAll('.error-message').length, 3);
    fillForm('Светлана', 'sveta@mail.ru', '33');
    $('user-form').requestSubmit();
    runTest('сценарий: после исправления остаётся только успех',
        [$('form-output').querySelectorAll('.error-message').length, $('form-output').querySelectorAll('.success-message').length], [0, 1]);
}

// ================= Запуск =================

// Если группа тестов упала с исключением, это записывается как проваленный тест,
// а остальные группы продолжают работать
async function runGroup(groupName, group) {
    try {
        await group();
    } catch (error) {
        runTest(`${groupName}: группа тестов прервалась`, `${error.name}: ${error.message}`, 'без исключений');
    }
}

async function runAllTests() {
    console.log('=== ЗАПУСК ТЕСТОВ ===');
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    createTestPanel();
    mountFixture();

    try {
        await runGroup('Наличие функций', testFunctionsExist);
        await runGroup('Задание 1', testCreation);
        await runGroup('Задание 2', testNavigation);
        await runGroup('Задание 3', testStyles);
        await runGroup('Задание 3.3', testAnimation);
        await runGroup('Задание 4', testEvents);
        await runGroup('Задание 5', testLists);
        await runGroup('Задание 6.1', testValidation);
        await runGroup('Задание 6.2-6.5', testFormDisplay);
        await runGroup('Инициализация', testInitialization);
    } finally {
        unmountFixture();
        setupKeyboardEvents(); // возвращаем обработчик клавиш страницы

        // Тесты вызывают focus(), из-за чего страница могла прокрутиться: возвращаем всё как было
        if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
        }
        window.scrollTo(scrollPosition.x, scrollPosition.y);
    }

    renderSummary();
    console.log('=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
}

document.addEventListener('DOMContentLoaded', runAllTests);