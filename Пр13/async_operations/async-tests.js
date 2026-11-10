/**
 * Простая система тестирования для асинхронных функций.
 * Результаты выводятся в консоль браузера.
 */

// --- Вспомогательные функции для тестов ---

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function assert(condition, message) {
    if (condition) {
        testsPassed++;
        testResults.push({ status: 'PASS', message });
        console.log(`✅ PASS: ${message}`);
    } else {
        testsFailed++;
        testResults.push({ status: 'FAIL', message });
        console.error(`❌ FAIL: ${message}`);
    }
}

async function runTests() {
    console.group('🧪 Запуск тестов для async-tasks.js');
    console.log('-----------------------------------');

    // --- Тесты для Задания 1: Промисы ---
    console.group('Тесты: Основы промисов');
    try {
        const successPromise = createBasicPromise(true);
        assert(successPromise instanceof Promise, 'createBasicPromise(true) возвращает Promise');
        const successResult = await successPromise;
        assert(successResult === "Успех!", 'Промис резолвится с правильным сообщением');
    } catch (e) {
        assert(false, `Ошибка при тестировании успешного промиса: ${e.message}`);
    }

    try {
        const failPromise = createBasicPromise(false);
        await failPromise;
        assert(false, 'Промис должен был быть отклонен');
    } catch (e) {
        assert(e.message === "Ошибка!", 'Промис реджектится с правильным сообщением');
    }
    console.groupEnd();

    // --- Тесты для Задания 2: Async/Await ---
    console.group('Тесты: Async/Await');
    try {
        const result = await basicAsyncAwait();
        // Эта функция ничего не возвращает, а выводит в DOM. Проверим, что она не падает.
        assert(true, 'basicAsyncAwait выполняется без ошибок');
    } catch (e) {
        assert(false, `basicAsyncAwait выбросил ошибку: ${e.message}`);
    }

    try {
        await handleAsyncError();
        assert(true, 'handleAsyncError корректно обрабатывает ошибку');
    } catch (e) {
        assert(false, `handleAsyncError не обработал ошибку: ${e.message}`);
    }
    console.groupEnd();

    // --- Тесты для Задания 4: Таймеры ---
    console.group('Тесты: Асинхронные таймеры');
    const delayStart = performance.now();
    await delayWithPromise(100);
    const delayEnd = performance.now();
    assert((delayEnd - delayStart) >= 95, 'delayWithPromise ждет указанное время (с небольшим допуском)');
    console.groupEnd();

    // --- Тесты для Задания 5: Обработка ошибок ---
    console.group('Тесты: Обработка ошибок');
    // Тест retryWithBackoff с операцией, которая всегда succeeds
    try {
        const successfulOp = () => Promise.resolve("OK");
        const result = await retryWithBackoff(successfulOp, 3);
        assert(result === "OK", 'retryWithBackoff возвращает результат успешной операции с первой попытки');
    } catch (e) {
        assert(false, `retryWithBackoff не сработал для успешной операции: ${e.message}`);
    }

    // Тест retryWithBackoff с операцией, которая всегда fails
    try {
        const failingOp = () => Promise.reject(new Error("Fail"));
        await retryWithBackoff(failingOp, 2);
        assert(false, 'retryWithBackoff должен был выбросить ошибку после всех попыток');
    } catch (e) {
        assert(e.message.includes('Все 2 попыток не удались'), 'retryWithBackoff выбрасывает ошибку после исчерпания попыток');
    }
    console.groupEnd();

    // --- Тесты для Задания 7: Кэширование ---
    console.group('Тесты: Кэширование запросов');
    const cachedFetch = createRequestCache();
    const testUrl = 'https://jsonplaceholder.typicode.com/todos/1';
    
    try {
        // Первый запрос (должен пойти в сеть)
        const data1 = await cachedFetch(testUrl);
        assert(data1 && data1.title, 'Первый запрос возвращает данные');

        // Второй запрос (должен взять из кэша)
        const data2 = await cachedFetch(testUrl);
        assert(data1 === data2, 'Второй запрос возвращает тот же объект из кэша');
    } catch (e) {
        assert(false, `Ошибка при тестировании кэширования: ${e.message}`);
    }
    console.groupEnd();

    // --- Итоги ---
    console.log('-----------------------------------');
    console.log(`Итого: ${testsPassed} пройдено, ${testsFailed} провалено.`);
    console.groupEnd();

    // Опционально: можно вывести результаты на страницу
    const footer = document.getElementById('main-footer');
    if (footer) {
        const summary = document.createElement('p');
        summary.style.marginTop = '1rem';
        summary.style.fontWeight = 'bold';
        summary.textContent = `Результаты тестов: ✅ ${testsPassed} | ❌ ${testsFailed}`;
        footer.appendChild(summary);
    }
}

// Запускаем тесты после полной загрузки страницы и инициализации
window.addEventListener('load', () => {
    // Даем небольшую задержку, чтобы убедиться, что все скрипты загружены
    setTimeout(runTests, 500);
});