// ================= Окружение: браузер или Node.js =================
const isBrowser = typeof document !== 'undefined';

if (!isBrowser && typeof require === 'function') {
    // В Node.js подключаем функции из functions.js
    Object.assign(globalThis, require('./functions.js'));
}

let totalTests = 0;
let passedTests = 0;

// ================= Вспомогательные функции для тестов =================

// Глубокое сравнение (в отличие от JSON.stringify различает undefined, NaN и Infinity)
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

// Строка для вывода значения (умеет показывать undefined, NaN, Infinity и функции)
function format(value) {
    const text = JSON.stringify(value, (key, item) => {
        if (item === undefined) return '__undefined__';
        if (typeof item === 'function') return '__[Function]__';
        if (typeof item === 'number' && !Number.isFinite(item)) return `__${item}__`;
        return item;
    });
    return text === undefined ? String(value) : text.replace(/"__(.*?)__"/g, '$1');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Пауза для тестов с таймерами
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Возвращает имя ошибки, которую выбросила функция, или 'нет ошибки'
function errorNameOf(fn) {
    try {
        fn();
        return 'нет ошибки';
    } catch (error) {
        return error.name;
    }
}

// ================= Вывод результатов =================

// Функция для вывода результатов тестов
function runTest(testName, actual, expected) {
    const isEqual = deepEqual(actual, expected);
    totalTests++;
    if (isEqual) passedTests++;

    console.log(`${testName}:`, isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА', {expected, actual});

    if (!isBrowser) return;

    const resultElement = document.createElement('div');
    resultElement.className = `test-result ${isEqual ? 'success' : 'error'}`;

    resultElement.innerHTML = `
        <strong>${escapeHtml(testName)}:</strong>
        ${isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА'}
        <br>
        Ожидалось: ${escapeHtml(format(expected))}
        <br>
        Получено: ${escapeHtml(format(actual))}
    `;

    document.getElementById('testResults').appendChild(resultElement);
}

// Проверка, что функция выбрасывает ошибку нужного типа
function runTestThrows(testName, fn, expectedErrorName) {
    runTest(testName, errorNameOf(fn), expectedErrorName);
}

// Заголовок группы тестов
function addSection(title) {
    console.log(`\n--- ${title} ---`);
    if (!isBrowser) return;

    const heading = document.createElement('h2');
    heading.className = 'test-section';
    heading.textContent = title;
    document.getElementById('testResults').appendChild(heading);
}

// Итоговая плашка: сколько тестов пройдено
function renderSummary() {
    const failed = totalTests - passedTests;
    const text = failed === 0
        ? `Пройдено тестов: ${passedTests} из ${totalTests}. Все тесты пройдены!`
        : `Пройдено тестов: ${passedTests} из ${totalTests}. Ошибок: ${failed}`;

    console.log(text);

    if (!isBrowser) {
        process.exitCode = failed === 0 ? 0 : 1;
        return;
    }

    let summary = document.getElementById('summary');
    if (!summary) {
        summary = document.createElement('div');
        summary.id = 'summary';
        const results = document.getElementById('testResults');
        results.parentNode.insertBefore(summary, results);
    }

    const percent = totalTests === 0 ? 0 : Math.round((passedTests / totalTests) * 100);
    summary.className = `summary ${failed === 0 ? 'summary-success' : 'summary-error'}`;
    summary.innerHTML = `
        <strong>${text}</strong>
        <div class="progress"><div class="progress-bar" style="width: ${percent}%"></div></div>
    `;
}

// ================= Описание заданий на странице (блок #tasksInfo) =================

function renderTasksInfo() {
    const tasks = [
        { title: 'sum(...numbers)', text: 'Сумма любого количества аргументов (rest parameters).',
          code: 'sum(1, 2, 3)', run: () => sum(1, 2, 3) },
        { title: 'createUser({ name, age, email })', text: 'Деструктуризация объекта, email необязателен.',
          code: 'createUser({ name: "Анна", age: 25 })', run: () => createUser({ name: 'Анна', age: 25 }) },
        { title: 'secretMessage(password, message)', text: 'Замыкание: пароль и сообщение спрятаны внутри функции.',
          code: 'secretMessage("qwerty", "Привет")("qwerty")', run: () => secretMessage('qwerty', 'Привет')('qwerty') },
        { title: 'compose(...functions)', text: 'Композиция функций справа налево (и pipe слева направо).',
          code: 'compose(x => x + 1, x => x * 2)(5)', run: () => compose(x => x + 1, x => x * 2)(5) },
        { title: 'myMap(array, callback)', text: 'Свой аналог Array.prototype.map.',
          code: 'myMap([1, 2, 3], x => x * 2)', run: () => myMap([1, 2, 3], x => x * 2) },
        { title: 'myFilter(array, callback)', text: 'Свой аналог Array.prototype.filter.',
          code: 'myFilter([1, 2, 3, 4], x => x % 2 === 0)', run: () => myFilter([1, 2, 3, 4], x => x % 2 === 0) },
        { title: 'myReduce(array, callback, initialValue)', text: 'Свой аналог Array.prototype.reduce.',
          code: 'myReduce([1, 2, 3, 4], (a, b) => a + b, 0)', run: () => myReduce([1, 2, 3, 4], (a, b) => a + b, 0) },
        { title: 'curry(fn)', text: 'Каррирование: функция от нескольких аргументов превращается в цепочку.',
          code: 'curry((a, b, c) => a + b + c)(1)(2)(3)', run: () => curry((a, b, c) => a + b + c)(1)(2)(3) },
        { title: 'memoize(fn)', text: 'Кэширует результаты: для одинаковых аргументов функция выполняется один раз.',
          code: 'fibonacciMemo(50)', run: () => fibonacciMemo(50) },
        { title: 'debounce(fn, delay)', text: 'Откладывает вызов, пока вызовы не прекратятся (например, поиск при вводе).',
          code: 'typeof debounce(() => {}, 100)', run: () => typeof debounce(() => {}, 100) },
        { title: 'throttle(fn, interval)', text: 'Ограничивает частоту вызовов (например, обработчик прокрутки).',
          code: 'typeof throttle(() => {}, 100)', run: () => typeof throttle(() => {}, 100) },
        { title: 'createValidator(options)', text: 'Создаёт проверку пароля: длина, цифры, заглавные буквы.',
          code: 'createValidator({ minLength: 8, requireDigit: true })("abc")',
          run: () => createValidator({ minLength: 8, requireDigit: true })('abc') },
        { title: 'Дополнительно: factorialRecursive, flatten, fibonacciGenerator', text: 'Рекурсия и генераторы.',
          code: 'flatten([1, [2, [3, [4]]]])', run: () => flatten([1, [2, [3, [4]]]]) }
    ];

    console.log('=== ЗАДАНИЯ ===');
    tasks.forEach((task) => console.log(`${task.title}: ${task.code} ->`, task.run()));

    if (!isBrowser) return;

    const container = document.getElementById('tasksInfo');
    if (!container) return;

    container.innerHTML = tasks.map((task) => `
        <div class="task">
            <h3><code>${escapeHtml(task.title)}</code></h3>
            <p>${escapeHtml(task.text)}</p>
            <p><code>${escapeHtml(task.code)}</code> &rarr; <code>${escapeHtml(format(task.run()))}</code></p>
        </div>
    `).join('');
}

// ================= Тесты =================

function testBasicFunctions() {
    addSection('Часть 2. Основные функции');

    // sum
    runTest('sum(1, 2, 3)', sum(1, 2, 3), 6);
    runTest('sum() без аргументов', sum(), 0);
    runTest('sum(5)', sum(5), 5);
    runTest('sum(-1, 1)', sum(-1, 1), 0);
    runTest('sum(...[1, 2, 3, 4, 5]) (spread)', sum(...[1, 2, 3, 4, 5]), 15);
    runTest('sum(0.1, 0.2) с учётом погрешности', Math.abs(sum(0.1, 0.2) - 0.3) < 1e-9, true);
    runTest('sum(Infinity, 1)', sum(Infinity, 1), Infinity);
    runTestThrows('sum("1", 2) выбрасывает TypeError', () => sum('1', 2), 'TypeError');
    runTestThrows('sum(NaN) выбрасывает TypeError', () => sum(NaN), 'TypeError');
    runTestThrows('sum(null) выбрасывает TypeError', () => sum(null), 'TypeError');

    // createUser
    runTest('createUser с email',
        createUser({ name: 'Анна', age: 25, email: 'anna@mail.ru' }),
        'Пользователь: Анна, возраст: 25, email: anna@mail.ru');
    runTest('createUser без email',
        createUser({ name: 'Иван', age: 30 }),
        'Пользователь: Иван, возраст: 30, email: не указан');
    runTest('createUser с email: null',
        createUser({ name: 'Иван', age: 30, email: null }),
        'Пользователь: Иван, возраст: 30, email: не указан');
    runTest('createUser с пустым email',
        createUser({ name: 'Иван', age: 30, email: '   ' }),
        'Пользователь: Иван, возраст: 30, email: не указан');
    runTest('createUser с возрастом 0',
        createUser({ name: 'Малыш', age: 0 }),
        'Пользователь: Малыш, возраст: 0, email: не указан');
    runTest('createUser игнорирует лишние поля',
        createUser({ name: 'Олег', age: 40, city: 'Сургут' }),
        'Пользователь: Олег, возраст: 40, email: не указан');
    runTestThrows('createUser() без аргументов', () => createUser(), 'TypeError');
    runTestThrows('createUser без имени', () => createUser({ age: 20 }), 'TypeError');
    runTestThrows('createUser с пустым именем', () => createUser({ name: '  ', age: 20 }), 'TypeError');
    runTestThrows('createUser с возрастом-строкой', () => createUser({ name: 'А', age: '20' }), 'TypeError');
    runTestThrows('createUser с отрицательным возрастом', () => createUser({ name: 'А', age: -5 }), 'RangeError');

    // secretMessage
    const check = secretMessage('qwerty', 'Привет, это секрет');
    runTest('secretMessage возвращает функцию', typeof check, 'function');
    runTest('secretMessage: верный пароль', check('qwerty'), 'Привет, это секрет');
    runTest('secretMessage: неверный пароль', check('wrong'), 'Доступ запрещен');
    runTest('secretMessage: пароль в другом регистре', check('QWERTY'), 'Доступ запрещен');
    runTest('secretMessage: вызов без пароля', check(), 'Доступ запрещен');
    runTest('secretMessage: пароль и сообщение снаружи недоступны',
        [check.password, check.message], [undefined, undefined]);
    const checkA = secretMessage('a', 'Сообщение A');
    const checkB = secretMessage('b', 'Сообщение B');
    runTest('secretMessage: замыкания независимы',
        [checkA('a'), checkA('b'), checkB('b'), checkB('a')],
        ['Сообщение A', 'Доступ запрещен', 'Сообщение B', 'Доступ запрещен']);
    runTest('secretMessage: пароль сравнивается строго (число и строка)', secretMessage(123, 'x')('123'), 'Доступ запрещен');
}

function testHigherOrderFunctions() {
    addSection('Часть 3. Функции высшего порядка');

    const addOne = (x) => x + 1;
    const double = (x) => x * 2;

    // compose / pipe
    runTest('compose(addOne, double)(5) = addOne(double(5))', compose(addOne, double)(5), 11);
    runTest('pipe(addOne, double)(5) = double(addOne(5))', pipe(addOne, double)(5), 12);
    runTest('compose() без функций возвращает аргумент', compose()(7), 7);
    runTest('compose из одной функции', compose(double)(4), 8);
    runTest('compose из трёх функций работает со строками',
        compose((s) => s + '!', (s) => s.toUpperCase(), (s) => s.trim())('  привет '), 'ПРИВЕТ!');
    runTest('compose: последняя функция принимает несколько аргументов',
        compose(double, (a, b) => a + b)(2, 3), 10);
    runTest('compose возвращает функцию', typeof compose(addOne), 'function');
    runTestThrows('compose с не-функцией', () => compose(addOne, 42), 'TypeError');

    // myMap
    runTest('myMap([1, 2, 3], x => x * 2)', myMap([1, 2, 3], (x) => x * 2), [2, 4, 6]);
    runTest('myMap([]) на пустом массиве', myMap([], (x) => x), []);
    runTest('myMap передаёт индекс', myMap(['a', 'b'], (value, index) => value + index), ['a0', 'b1']);
    runTest('myMap передаёт сам массив', myMap([1, 2], (value, index, arr) => arr.length), [2, 2]);
    const mapSource = [3, 1, 2];
    const mapExpected = mapSource.map((x) => x * x);
    runTest('myMap даёт тот же результат, что и Array.map', myMap(mapSource, (x) => x * x), mapExpected);
    runTest('myMap не меняет исходный массив', mapSource, [3, 1, 2]);
    runTest('myMap сохраняет пропуски в разреженном массиве', 1 in myMap([1, , 3], (x) => x), false);
    runTestThrows('myMap(null, fn) выбрасывает TypeError', () => myMap(null, (x) => x), 'TypeError');
    runTestThrows('myMap без функции выбрасывает TypeError', () => myMap([1], 'не функция'), 'TypeError');

    // myFilter
    runTest('myFilter: чётные числа', myFilter([1, 2, 3, 4, 5, 6], (x) => x % 2 === 0), [2, 4, 6]);
    runTest('myFilter: ничего не подошло', myFilter([1, 3, 5], (x) => x % 2 === 0), []);
    runTest('myFilter: подошло всё', myFilter([2, 4], (x) => x % 2 === 0), [2, 4]);
    runTest('myFilter на пустом массиве', myFilter([], () => true), []);
    runTest('myFilter: любое «истинное» значение подходит', myFilter([0, 1, '', 2, null, 'a'], (x) => x), [1, 2, 'a']);
    runTest('myFilter передаёт индекс', myFilter(['a', 'b', 'c'], (value, index) => index % 2 === 0), ['a', 'c']);
    const filterSource = [5, 8, 1, 9];
    runTest('myFilter даёт тот же результат, что и Array.filter',
        myFilter(filterSource, (x) => x > 4), filterSource.filter((x) => x > 4));
    runTest('myFilter не меняет исходный массив', filterSource, [5, 8, 1, 9]);
    runTestThrows('myFilter(undefined, fn) выбрасывает TypeError', () => myFilter(undefined, () => true), 'TypeError');
    runTestThrows('myFilter без функции выбрасывает TypeError', () => myFilter([1]), 'TypeError');

    // myReduce
    runTest('myReduce: сумма с начальным значением 0', myReduce([1, 2, 3, 4], (acc, x) => acc + x, 0), 10);
    runTest('myReduce: сумма без начального значения', myReduce([1, 2, 3, 4], (acc, x) => acc + x), 10);
    runTest('myReduce: начальное значение 10', myReduce([1, 2, 3, 4], (acc, x) => acc + x, 10), 20);
    runTest('myReduce: пустой массив с начальным значением', myReduce([], (acc, x) => acc + x, 5), 5);
    runTest('myReduce: максимум', myReduce([3, 9, 2], (max, x) => (x > max ? x : max)), 9);
    runTest('myReduce: строки', myReduce(['a', 'b', 'c'], (acc, x) => acc + x, ''), 'abc');
    runTest('myReduce передаёт индекс', myReduce([10, 20, 30], (acc, x, index) => acc + index, 0), 3);
    runTest('myReduce собирает объект',
        myReduce(['a', 'b'], (acc, x, index) => ({ ...acc, [x]: index }), {}), { a: 0, b: 1 });
    let reduceCalls = 0;
    runTest('myReduce: один элемент без начального значения',
        myReduce([42], () => { reduceCalls++; return 0; }), 42);
    runTest('myReduce: в этом случае callback не вызывается', reduceCalls, 0);
    runTest('myReduce: явное undefined считается начальным значением',
        myReduce([5], (acc, x) => String(acc) + x, undefined),
        [5].reduce((acc, x) => String(acc) + x, undefined));
    runTest('myReduce даёт тот же результат, что и Array.reduce',
        myReduce([1, 2, 3, 4], (a, b) => a * b, 1), [1, 2, 3, 4].reduce((a, b) => a * b, 1));
    runTestThrows('myReduce: пустой массив без начального значения', () => myReduce([], (a, b) => a + b), 'TypeError');
    runTestThrows('myReduce без функции выбрасывает TypeError', () => myReduce([1, 2], null, 0), 'TypeError');
}

function testAdvancedFunctions() {
    addSection('Часть 4. Каррирование, мемоизация, валидатор');

    // curry
    const add3 = curry((a, b, c) => a + b + c);
    runTest('curry: add3(1)(2)(3)', add3(1)(2)(3), 6);
    runTest('curry: add3(1, 2)(3)', add3(1, 2)(3), 6);
    runTest('curry: add3(1)(2, 3)', add3(1)(2, 3), 6);
    runTest('curry: add3(1, 2, 3)', add3(1, 2, 3), 6);
    const add10 = add3(10);
    runTest('curry: частичное применение переиспользуется',
        [add10(1)(2), add10(5)(5), add3(0)(0)(0)], [13, 20, 0]);
    runTest('curry: функция с одним аргументом', curry((x) => x * 2)(21), 42);
    runTest('curry: функция без аргументов', curry(() => 'готово')(), 'готово');
    runTest('curry: функция из двух аргументов', curry((a, b) => a * b)(3)(4), 12);
    runTest('curry вместе с myMap', myMap([1, 2, 3], curry((a, b) => a + b)(10)), [11, 12, 13]);
    runTestThrows('curry с не-функцией', () => curry('abc'), 'TypeError');

    // memoize
    let squareCalls = 0;
    const square = memoize((x) => { squareCalls++; return x * x; });
    runTest('memoize: результат верный', [square(4), square(4)], [16, 16]);
    runTest('memoize: функция вызвана только один раз', squareCalls, 1);
    square(5);
    runTest('memoize: новый аргумент считается заново', squareCalls, 2);

    let addCalls = 0;
    const slowAdd = memoize((a, b) => { addCalls++; return a + b; });
    slowAdd(1, 2);
    slowAdd(1, 2);
    runTest('memoize: несколько аргументов, повтор берётся из кэша', addCalls, 1);
    slowAdd(2, 1);
    runTest('memoize: другой порядок аргументов это другой вызов', addCalls, 2);

    let typeCalls = 0;
    const typed = memoize((x) => { typeCalls++; return typeof x; });
    runTest('memoize различает 1 и "1"', [typed(1), typed('1'), typeCalls], ['number', 'string', 2]);

    let objectCalls = 0;
    const byObject = memoize((obj) => { objectCalls++; return obj.a; });
    byObject({ a: 1 });
    byObject({ a: 1 });
    runTest('memoize: одинаковые объекты по содержимому берутся из кэша', objectCalls, 1);

    let undefinedCalls = 0;
    const returnsUndefined = memoize(() => { undefinedCalls++; });
    returnsUndefined();
    returnsUndefined();
    runTest('memoize кэширует и результат undefined', undefinedCalls, 1);

    let flakyAttempts = 0;
    const flaky = memoize(() => {
        flakyAttempts++;
        if (flakyAttempts === 1) throw new Error('временная ошибка');
        return 'ок';
    });
    errorNameOf(flaky);
    runTest('memoize не кэширует ошибки', flaky(), 'ок');

    const thisCarrier = { factor: 3, calc: memoize(function (x) { return x * this.factor; }) };
    runTest('memoize сохраняет this', thisCarrier.calc(5), 15);
    runTest('memoize: fibonacciMemo(0) и (1)', [fibonacciMemo(0), fibonacciMemo(1)], [0, 1]);
    runTest('memoize: fibonacciMemo(10)', fibonacciMemo(10), 55);
    runTest('memoize: fibonacciMemo(50) считается мгновенно', fibonacciMemo(50), 12586269025);
    runTestThrows('memoize с не-функцией', () => memoize(null), 'TypeError');

    // createValidator
    const validate = createValidator({ minLength: 8, requireDigit: true, requireUppercase: true });
    runTest('createValidator возвращает функцию', typeof validate, 'function');
    runTest('валидатор: корректный пароль', validate('Passw0rdX'), { isValid: true, errors: [] });
    runTest('валидатор: ровно минимальная длина', validate('Abcdefg1').isValid, true);
    runTest('валидатор: на один символ короче', validate('Abcdef1'),
        { isValid: false, errors: ['Минимальная длина: 8 символов'] });
    runTest('валидатор: нет цифры и заглавной буквы', validate('password'),
        { isValid: false, errors: ['Нужна хотя бы одна цифра', 'Нужна хотя бы одна заглавная буква'] });
    runTest('валидатор: нет заглавной буквы', validate('password1'),
        { isValid: false, errors: ['Нужна хотя бы одна заглавная буква'] });
    runTest('валидатор: все три ошибки сразу', validate('abc'), {
        isValid: false,
        errors: ['Минимальная длина: 8 символов', 'Нужна хотя бы одна цифра', 'Нужна хотя бы одна заглавная буква']
    });
    runTest('валидатор: пустая строка', validate('').isValid, false);
    runTest('валидатор: русская заглавная буква', validate('Пароль12').isValid, true);
    runTest('валидатор: не строка (число)', validate(12345678),
        { isValid: false, errors: ['Значение должно быть строкой'] });
    runTest('валидатор: null и undefined', [validate(null).isValid, validate(undefined).isValid], [false, false]);
    runTest('валидатор: только проверка цифры', createValidator({ requireDigit: true })('abc'),
        { isValid: false, errors: ['Нужна хотя бы одна цифра'] });
    runTest('валидатор без опций принимает любую строку', createValidator()('что угодно').isValid, true);
    runTest('валидатор с пустым объектом опций', createValidator({})('').isValid, true);
    const mutableOptions = { minLength: 5 };
    const frozenValidator = createValidator(mutableOptions);
    mutableOptions.minLength = 100;
    runTest('изменение options после создания не влияет на валидатор', frozenValidator('abcde').isValid, true);
    runTestThrows('createValidator(null)', () => createValidator(null), 'TypeError');
    runTestThrows('createValidator("строка")', () => createValidator('строка'), 'TypeError');
    runTestThrows('createValidator с отрицательной minLength', () => createValidator({ minLength: -1 }), 'RangeError');
    runTestThrows('createValidator с дробной minLength', () => createValidator({ minLength: 2.5 }), 'RangeError');
}

// Тесты с таймерами (debounce и throttle) выполняются по очереди
async function testTimers() {
    addSection('Часть 4. Debounce и throttle (тесты с таймерами)');

    // ----- debounce -----
    let calls = [];
    let debounced = debounce((value) => calls.push(value), 50);
    [1, 2, 3, 4, 5].forEach((value) => debounced(value));
    runTest('debounce: сразу после вызовов функция не выполнена', calls.length, 0);
    await sleep(120);
    runTest('debounce: серия быстрых вызовов даёт один вызов', calls.length, 1);
    runTest('debounce: вызван с аргументами последнего вызова', calls, [5]);

    calls = [];
    debounced = debounce((value) => calls.push(value), 40);
    debounced('a');
    await sleep(100);
    debounced('b');
    await sleep(100);
    runTest('debounce: вызовы с паузой дольше delay выполняются оба', calls, ['a', 'b']);

    calls = [];
    debounced = debounce(() => calls.push('вызов'), 60);
    debounced();
    await sleep(35);
    debounced(); // таймер начинается заново
    await sleep(35);
    runTest('debounce: каждый новый вызов сбрасывает таймер', calls.length, 0);
    await sleep(80);
    runTest('debounce: и функция выполняется после паузы', calls.length, 1);

    calls = [];
    debounced = debounce(() => calls.push('вызов'), 30);
    debounced();
    debounced.cancel();
    await sleep(80);
    runTest('debounce: cancel отменяет отложенный вызов', calls.length, 0);

    let capturedThis = null;
    const holder = { value: 42, handler: debounce(function () { capturedThis = this.value; }, 20) };
    holder.handler();
    await sleep(70);
    runTest('debounce сохраняет this', capturedThis, 42);
    runTestThrows('debounce с не-функцией', () => debounce('abc', 100), 'TypeError');

    // ----- throttle -----
    calls = [];
    let throttled = throttle((value) => calls.push(value), 100);
    [1, 2, 3, 4, 5].forEach((value) => throttled(value));
    runTest('throttle: первый вызов выполняется сразу', calls, [1]);
    await sleep(160);
    runTest('throttle: в конце интервала выполняется последний вызов', calls, [1, 5]);

    await sleep(100);
    throttled(6);
    runTest('throttle: после паузы вызов снова проходит сразу', calls, [1, 5, 6]);
    await sleep(120);

    calls = [];
    throttled = throttle(() => calls.push('вызов'), 100);
    throttled();
    throttled();
    throttled();
    throttled.cancel();
    await sleep(160);
    runTest('throttle: cancel отменяет отложенный вызов', calls.length, 1);

    calls = [];
    throttled = throttle(() => calls.push('вызов'), 100);
    const startedAt = Date.now();
    while (Date.now() - startedAt < 350) {
        throttled();
        await sleep(10);
    }
    await sleep(120);
    runTest('throttle: за 350 мс при интервале 100 мс не более 5 вызовов',
        calls.length >= 3 && calls.length <= 5, true);

    capturedThis = null;
    const throttleHolder = { value: 7, handler: throttle(function () { capturedThis = this.value; }, 50) };
    throttleHolder.handler();
    runTest('throttle сохраняет this', capturedThis, 7);
    runTestThrows('throttle с не-функцией', () => throttle(null, 100), 'TypeError');
}

function testRecursionAndGenerators() {
    addSection('Дополнительно. Рекурсия и генераторы');

    runTest('factorialRecursive(5)', factorialRecursive(5), 120);
    runTest('factorialRecursive(0)', factorialRecursive(0), 1);
    runTest('factorialRecursive(10)', factorialRecursive(10), 3628800);
    runTestThrows('factorialRecursive(-1)', () => factorialRecursive(-1), 'RangeError');
    runTestThrows('factorialRecursive(2.5)', () => factorialRecursive(2.5), 'RangeError');

    runTest('flatten: вложенность на несколько уровней', flatten([1, [2, [3, [4]]]]), [1, 2, 3, 4]);
    runTest('flatten: плоский массив не меняется', flatten([1, 2, 3]), [1, 2, 3]);
    runTest('flatten: пустой массив', flatten([]), []);
    runTest('flatten: только пустые вложенные массивы', flatten([[], [[]]]), []);
    runTest('flatten не меняет исходный массив', (() => { const a = [1, [2]]; flatten(a); return a; })(), [1, [2]]);
    runTestThrows('flatten(не массив)', () => flatten('abc'), 'TypeError');

    runTest('fibonacciGenerator: первые 8 чисел', take(fibonacciGenerator(), 8), [0, 1, 1, 2, 3, 5, 8, 13]);
    runTest('take(…, 0) возвращает пустой массив', take(fibonacciGenerator(), 0), []);
    const generator = fibonacciGenerator();
    runTest('генератор выдаёт значения по одному',
        [generator.next().value, generator.next().value, generator.next().value], [0, 1, 1]);
    runTest('генератор помнит состояние между вызовами', generator.next().value, 2);
    runTest('генератор итерируемый', typeof generator[Symbol.iterator], 'function');
    runTest('take работает с обычным массивом', take([10, 20, 30], 2), [10, 20]);
}

function testIntegration() {
    addSection('Совместная работа функций');

    const evenSquaresSum = compose(
        (numbers) => myReduce(numbers, (acc, x) => acc + x, 0),
        (numbers) => myMap(numbers, (x) => x * x),
        (numbers) => myFilter(numbers, (x) => x % 2 === 0)
    );
    runTest('конвейер: сумма квадратов чётных чисел', evenSquaresSum([1, 2, 3, 4, 5, 6]), 56);
    runTest('конвейер на пустом массиве', evenSquaresSum([]), 0);

    const isStrongPassword = createValidator({ minLength: 6, requireDigit: true });
    const checkAll = (passwords) => myMap(passwords, (p) => isStrongPassword(p).isValid);
    runTest('валидатор вместе с myMap', checkAll(['abc', 'abcdef1', 'abcdef']), [false, true, false]);

    const add = curry((a, b) => a + b);
    const addThenDouble = pipe(add(1), (x) => x * 2);
    runTest('curry вместе с pipe', addThenDouble(4), 10);
}

// Запуск группы тестов: если функция выбросила неожиданное исключение,
// это записывается как проваленный тест, а остальные группы продолжают работать
async function runGroup(groupName, group) {
    try {
        await group();
    } catch (error) {
        runTest(`${groupName}: группа тестов прервалась`, `${error.name}: ${error.message}`, 'без исключений');
    }
}

// Запуск всех тестов
async function runAllTests() {
    console.log('=== ЗАПУСК ТЕСТОВ ===');
    totalTests = 0;
    passedTests = 0;

    await runGroup('Часть 2', testBasicFunctions);
    await runGroup('Часть 3', testHigherOrderFunctions);
    await runGroup('Часть 4', testAdvancedFunctions);
    await runGroup('Таймеры', testTimers);
    await runGroup('Рекурсия и генераторы', testRecursionAndGenerators);
    await runGroup('Совместная работа', testIntegration);

    renderSummary();
    console.log('=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
}

// Демонстрация debounce и throttle в консоли
async function demonstrateTimers() {
    console.log('\n=== ДЕМОНСТРАЦИЯ DEBOUNCE И THROTTLE ===');
    const started = Date.now();
    const log = (label) => (n) => console.log(`${label}: вызов №${n}, прошло ${Date.now() - started} мс`);

    const debouncedLog = debounce(log('debounce'), 100);
    const throttledLog = throttle(log('throttle'), 100);

    for (let i = 1; i <= 8; i++) {
        debouncedLog(i);
        throttledLog(i);
        await sleep(30);
    }
    await sleep(200);
    console.log('Debounce вызвал функцию один раз (в конце), throttle несколько раз с интервалом.');
}

async function main() {
    renderTasksInfo();
    await runAllTests();
    await demonstrateTimers();
}

// Запуск при загрузке страницы (в Node.js запускаем сразу)
if (isBrowser) {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}