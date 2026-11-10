// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function displayOutput(elementId, data, isError = false) {
    const output = document.getElementById(elementId);
    if (!output) return;

    const timestamp = new Date().toLocaleTimeString();
    const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);

    output.innerHTML = `[${timestamp}] ${content}`;
    output.className = `output ${isError ? 'error' : 'success'}`;
}

function updateProgress(percentage) {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = `${percentage}%`;
    }
}

function setLoadingState(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Загрузка...';
    } else {
        button.disabled = false;
        button.innerHTML = button.textContent; // Восстанавливаем оригинальный текст
    }
}


// === ЗАДАНИЕ 1: Основы промисов ===

function createBasicPromise(shouldResolve = true) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (shouldResolve) {
                resolve("Успех!");
            } else {
                reject(new Error("Ошибка!"));
            }
        }, 1000);
    });
}

function handleBasicPromise() {
    setLoadingState('basic-promise', true);
    createBasicPromise(true)
        .then(result => {
            displayOutput('promise-output', result);
        })
        .catch(error => {
            displayOutput('promise-output', error.message, true);
        })
        .finally(() => {
            setLoadingState('basic-promise', false);
        });
}

function createPromiseChain() {
    setLoadingState('promise-chain', true);
    let chainResult = '';
    
    createBasicPromise(true)
        .then(step1 => {
            chainResult += `Шаг 1: ${step1}\n`;
            displayOutput('promise-output', chainResult);
            return new Promise(resolve => setTimeout(() => resolve(`Шаг 2 завершен`), 500));
        })
        .then(step2 => {
            chainResult += `${step2}\n`;
            displayOutput('promise-output', chainResult);
            return new Promise(resolve => setTimeout(() => resolve(`Шаг 3 завершен`), 500));
        })
        .then(step3 => {
            chainResult += `${step3}\n`;
            displayOutput('promise-output', chainResult);
        })
        .catch(error => {
            displayOutput('promise-output', `Ошибка в цепочке: ${error.message}`, true);
        })
        .finally(() => {
            setLoadingState('promise-chain', false);
        });
}

function handlePromiseError() {
    setLoadingState('promise-error', true);
    createBasicPromise(false)
        .then(result => {
            displayOutput('promise-output', result);
        })
        .catch(error => {
            displayOutput('promise-output', `Поймана ошибка: ${error.message}`, true);
        })
        .finally(() => {
            setLoadingState('promise-error', false);
        });
}

function setupPromiseEvents() {
    document.getElementById('basic-promise')?.addEventListener('click', handleBasicPromise);
    document.getElementById('promise-chain')?.addEventListener('click', createPromiseChain);
    document.getElementById('promise-error')?.addEventListener('click', handlePromiseError);
}


// === ЗАДАНИЕ 2: Async/Await ===

async function basicAsyncAwait() {
    setLoadingState('basic-async', true);
    try {
        await delayWithPromise(500); // Добавляем задержку перед выводом
        const result = await createBasicPromise(true);
        displayOutput('async-output', `Результат: ${result}`);
    } catch (error) {
        displayOutput('async-output', `Ошибка: ${error.message}`, true);
    } finally {
        setLoadingState('basic-async', false);
    }
}

async function handleAsyncError() {
    setLoadingState('async-error', true);
    try {
        const result = await createBasicPromise(false);
        displayOutput('async-output', `Результат: ${result}`);
    } catch (error) {
        displayOutput('async-output', `Поймана ошибка в async/await: ${error.message}`, true);
    } finally {
        setLoadingState('async-error', false);
    }
}

async function parallelAsyncExecution() {
    setLoadingState('async-parallel', true);
    const startTime = performance.now();
    try {
        const [res1, res2, res3] = await Promise.all([
            createBasicPromise(true),
            delayWithPromise(1500).then(() => "Вторая операция завершена"),
            delayWithPromise(800).then(() => "Третья операция завершена")
        ]);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        const results = [res1, res2, res3];
        displayOutput('async-output', `Все операции выполнены параллельно за ${duration}с:\n${JSON.stringify(results, null, 2)}`);
    } catch (error) {
        displayOutput('async-output', `Ошибка при параллельном выполнении: ${error.message}`, true);
    } finally {
        setLoadingState('async-parallel', false);
    }
}

function setupAsyncEvents() {
    document.getElementById('basic-async')?.addEventListener('click', basicAsyncAwait);
    document.getElementById('async-error')?.addEventListener('click', handleAsyncError);
    document.getElementById('async-parallel')?.addEventListener('click', parallelAsyncExecution);
}


// === ЗАДАНИЕ 3: Работа с внешними API ===

async function fetchUsers() {
    setLoadingState('fetch-users', true);
    const apiDataContainer = document.getElementById('api-data');
    apiDataContainer.innerHTML = '';
    
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const users = await response.json();
        
        displayOutput('api-output', `Загружено ${users.length} пользователей.`);
        
        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <h4>${user.name}</h4>
                <p>Email: ${user.email}</p>
                <p>Город: ${user.address.city}</p>
            `;
            apiDataContainer.appendChild(card);
        });
    } catch (error) {
        displayOutput('api-output', `Ошибка при загрузке пользователей: ${error.message}`, true);
    } finally {
        setLoadingState('fetch-users', false);
    }
}

async function createPost() {
    setLoadingState('fetch-post', true);
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                title: 'foo',
                body: 'bar',
                userId: 1,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayOutput('api-output', `Пост успешно создан:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
        displayOutput('api-output', `Ошибка при создании поста: ${error.message}`, true);
    } finally {
        setLoadingState('fetch-post', false);
    }
}

async function testApiError() {
    setLoadingState('fetch-error', true);
    try {
        const response = await fetch('https://jsonplaceholder.typicode.com/nonexistent-endpoint');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayOutput('api-output', data);
    } catch (error) {
        let errorMessage = `Ошибка: ${error.message}`;
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            errorMessage = 'Ошибка сети: не удалось подключиться к серверу.';
        }
        displayOutput('api-output', errorMessage, true);
    } finally {
        setLoadingState('fetch-error', false);
    }
}

function setupApiEvents() {
    document.getElementById('fetch-users')?.addEventListener('click', fetchUsers);
    document.getElementById('fetch-post')?.addEventListener('click', createPost);
    document.getElementById('fetch-error')?.addEventListener('click', testApiError);
}


// === ЗАДАНИЕ 4: Асинхронные таймеры ===

let intervalId;
let counter = 0;

async function startAsyncInterval() {
    if (intervalId) return; // Предотвращаем повторный запуск
    
    setLoadingState('start-interval', true);
    document.getElementById('stop-interval').disabled = false;
    
    intervalId = setInterval(async () => {
        counter++;
        const outputElement = document.getElementById('interval-output');
        if (outputElement) {
            outputElement.textContent = `Интервал: ${counter}`;
        }
        // Можно добавить асинхронную логику внутри интервала, если нужно
        // await delayWithPromise(100); 
    }, 1000);
}

function stopAsyncInterval() {
    clearInterval(intervalId);
    intervalId = null;
    counter = 0;
    const outputElement = document.getElementById('interval-output');
    if (outputElement) {
        outputElement.textContent = `Интервал: 0`;
    }
    setLoadingState('start-interval', false);
    document.getElementById('stop-interval').disabled = true;
}

function delayWithPromise(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDelay() {
    setLoadingState('delay-promise', true);
    const outputElement = document.getElementById('timer-output');
    if (!outputElement) return;

    outputElement.textContent = 'Начало последовательности задержек...';
    await delayWithPromise(1000);
    outputElement.textContent = 'Прошло 1 секунда...';
    await delayWithPromise(1500);
    outputElement.textContent = 'Прошло еще 1.5 секунды...';
    await delayWithPromise(500);
    outputElement.textContent = 'Последовательность задержек завершена!';
    setLoadingState('delay-promise', false);
}

function setupTimerEvents() {
    document.getElementById('start-interval')?.addEventListener('click', startAsyncInterval);
    document.getElementById('stop-interval')?.addEventListener('click', stopAsyncInterval);
    document.getElementById('delay-promise')?.addEventListener('click', testDelay);
    // Изначально отключаем кнопку остановки
    document.getElementById('stop-interval').disabled = true;
}


// === ЗАДАНИЕ 5: Обработка ошибок ===

async function asyncTryCatch() {
    setLoadingState('try-catch', true);
    let log = '';
    try {
        log += 'Попытка 1: Успешная операция...\n';
        await delayWithPromise(500);
        log += 'Попытка 1: Успех!\n\n';

        try {
            log += 'Попытка 2: Операция с ошибкой...\n';
            await createBasicPromise(false);
        } catch (innerError) {
            log += `Попытка 2: Поймана внутренняя ошибка: ${innerError.message}\n\n`;
        }

        log += 'Попытка 3: Еще одна успешная операция...\n';
        await delayWithPromise(300);
        log += 'Попытка 3: Успех!';

    } catch (outerError) {
        log += `Внешний блок catch: ${outerError.message}`;
    } finally {
        displayOutput('error-output', log);
        setLoadingState('try-catch', false);
    }
}

async function handleMultipleErrors() {
    setLoadingState('multiple-errors', true);
    const promises = [
        createBasicPromise(true),
        createBasicPromise(false),
        delayWithPromise(1000).then(() => "Успех 2"),
        Promise.reject(new Error("Явная ошибка 2")),
        delayWithPromise(500).then(() => "Успех 3")
    ];

    try {
        const results = await Promise.allSettled(promises);
        let stats = { fulfilled: 0, rejected: 0 };
        let log = 'Результаты Promise.allSettled:\n';

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                stats.fulfilled++;
                log += `Промис ${index + 1}: ✅ Успех - ${result.value}\n`;
            } else {
                stats.rejected++;
                log += `Промис ${index + 1}: ❌ Ошибка - ${result.reason.message}\n`;
            }
        });

        log += `\nСтатистика: ${stats.fulfilled} успехов, ${stats.rejected} ошибок.`;
        displayOutput('error-output', log);
    } catch (error) {
        // Этот блок не должен сработать для Promise.allSettled, но на всякий случай
        displayOutput('error-output', `Неожиданная ошибка: ${error.message}`, true);
    } finally {
        setLoadingState('multiple-errors', false);
    }
}

async function retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Попытка ${attempt} из ${maxRetries}...`);
            return await operation();
        } catch (error) {
            console.warn(`Попытка ${attempt} не удалась: ${error.message}`);
            if (attempt === maxRetries) {
                throw new Error(`Все ${maxRetries} попыток не удались. Последняя ошибка: ${error.message}`);
            }
            const delay = Math.pow(2, attempt) * 1000; // Экспоненциальная задержка
            console.log(`Ожидание ${delay / 1000} секунд перед следующей попыткой...`);
            await delayWithPromise(delay);
        }
    }
}

function setupErrorEvents() {
    document.getElementById('try-catch')?.addEventListener('click', asyncTryCatch);
    document.getElementById('multiple-errors')?.addEventListener('click', handleMultipleErrors);
    document.getElementById('retry-pattern')?.addEventListener('click', async () => {
        setLoadingState('retry-pattern', true);
        let attemptCount = 0;
        const failingOperation = () => {
            attemptCount++;
            if (attemptCount < 3) {
                return Promise.reject(new Error(`Имитация сбоя (попытка ${attemptCount})`));
            }
            return Promise.resolve(`Успех после ${attemptCount} попыток!`);
        };

        try {
            const result = await retryWithBackoff(failingOperation, 4);
            displayOutput('error-output', `Результат: ${result}`);
        } catch (error) {
            displayOutput('error-output', `Финальная ошибка: ${error.message}`, true);
        } finally {
            setLoadingState('retry-pattern', false);
            attemptCount = 0; // Сброс счетчика для следующего запуска
        }
    });
}


// === ЗАДАНИЕ 6: Параллельные операции ===

async function demonstratePromiseAll() {
    setLoadingState('promise-all', true);
    const startTime = performance.now();
    const promises = [
        delayWithPromise(2000).then(() => 'Результат 1 (2с)'),
        delayWithPromise(1000).then(() => 'Результат 2 (1с)'),
        delayWithPromise(3000).then(() => 'Результат 3 (3с)'),
        delayWithPromise(500).then(() => 'Результат 4 (0.5с)'),
        delayWithPromise(1500).then(() => 'Результат 5 (1.5с)')
    ];

    try {
        const results = await Promise.all(promises);
        const endTime = performance.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        displayOutput('parallel-output', `Promise.all выполнен за ${duration}с (вместо ~8с последовательно):\n${results.join('\n')}`);
    } catch (error) {
        displayOutput('parallel-output', `Promise.all завершился с ошибкой: ${error.message}`, true);
    } finally {
        setLoadingState('promise-all', false);
    }
}

async function demonstratePromiseRace() {
    setLoadingState('promise-race', true);
    const promises = [
        delayWithPromise(3000).then(() => 'Медленный результат'),
        delayWithPromise(1000).then(() => 'Быстрый результат'),
        delayWithPromise(2000).then(() => 'Средний результат')
    ];

    try {
        const winner = await Promise.race(promises);
        displayOutput('parallel-output', `Promise.race: Первым завершился промис с результатом: "${winner}"`);
    } catch (error) {
        displayOutput('parallel-output', `Promise.race завершился с ошибкой: ${error.message}`, true);
    } finally {
        setLoadingState('promise-race', false);
    }
}

async function demonstratePromiseAllSettled() {
    setLoadingState('promise-allSettled', true);
    const promises = [
        createBasicPromise(true),
        createBasicPromise(false),
        delayWithPromise(1000).then(() => "Успех"),
        Promise.reject(new Error("Отказ"))
    ];

    try {
        const results = await Promise.allSettled(promises);
        let log = 'Результаты Promise.allSettled:\n';
        results.forEach((result, i) => {
            log += `Промис ${i+1}: [${result.status}] ${result.status === 'fulfilled' ? result.value : result.reason.message}\n`;
        });
        displayOutput('parallel-output', log);
    } catch (error) {
        displayOutput('parallel-output', `Неожиданная ошибка: ${error.message}`, true);
    } finally {
        setLoadingState('promise-allSettled', false);
    }
}

function setupParallelEvents() {
    document.getElementById('promise-all')?.addEventListener('click', demonstratePromiseAll);
    document.getElementById('promise-race')?.addEventListener('click', demonstratePromiseRace);
    document.getElementById('promise-allSettled')?.addEventListener('click', demonstratePromiseAllSettled);
}


// === ЗАДАНИЕ 7: Реальные сценарии ===

async function sequentialApiRequests() {
    setLoadingState('sequential-requests', true);
    let log = 'Начало последовательных запросов...\n';
    displayOutput('scenario-output', log);

    try {
        // 1. Получить пользователя
        log += '1. Получение пользователя...\n';
        displayOutput('scenario-output', log);
        const userResponse = await fetch('https://jsonplaceholder.typicode.com/users/1');
        if (!userResponse.ok) throw new Error('Не удалось получить пользователя');
        const user = await userResponse.json();
        log += `   Получен пользователь: ${user.name}\n\n`;
        displayOutput('scenario-output', log);

        // 2. Получить посты пользователя
        log += '2. Получение постов пользователя...\n';
        displayOutput('scenario-output', log);
        const postsResponse = await fetch(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
        if (!postsResponse.ok) throw new Error('Не удалось получить посты');
        const posts = await postsResponse.json();
        log += `   Получено ${posts.length} постов.\n`;
        if (posts.length > 0) {
            log += `   Первый пост: "${posts[0].title}"\n\n`;
        }
        displayOutput('scenario-output', log);

        // 3. Получить комментарии к первому посту
        if (posts.length > 0) {
            log += '3. Получение комментариев к первому посту...\n';
            displayOutput('scenario-output', log);
            const commentsResponse = await fetch(`https://jsonplaceholder.typicode.com/comments?postId=${posts[0].id}`);
            if (!commentsResponse.ok) throw new Error('Не удалось получить комментарии');
            const comments = await commentsResponse.json();
            log += `   Получено ${comments.length} комментариев.\n`;
            if (comments.length > 0) {
                log += `   Первый комментарий: "${comments[0].body.substring(0, 50)}..."\n`;
            }
        }
        displayOutput('scenario-output', log);

    } catch (error) {
        displayOutput('scenario-output', `Ошибка в последовательных запросах: ${error.message}`, true);
    } finally {
        setLoadingState('sequential-requests', false);
    }
}

async function simulateFileUpload() {
    setLoadingState('upload-simulation', true);
    updateProgress(0);
    const outputElement = document.getElementById('scenario-output');
    if (outputElement) outputElement.textContent = 'Начало симуляции загрузки файла...';

    const totalSteps = 100;
    for (let i = 1; i <= totalSteps; i++) {
        await delayWithPromise(50); // Симулируем время загрузки
        updateProgress(i);
        if (outputElement && i % 20 === 0) { // Обновляем текст каждые 20%
             outputElement.textContent = `Загрузка: ${i}%`;
        }
    }
    
    if (outputElement) outputElement.textContent = 'Файл успешно загружен!';
    setLoadingState('upload-simulation', false);
}

function createRequestCache() {
    const cache = new Map();
    return async function cachedRequest(url) {
        if (cache.has(url)) {
            console.log(`Кэш-попадание для ${url}`);
            return cache.get(url);
        }

        console.log(`Кэш-промах для ${url}. Выполняется запрос...`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            cache.set(url, data);
            return data;
        } catch (error) {
            console.error(`Ошибка при запросе к ${url}:`, error);
            throw error; // Пробрасываем ошибку, чтобы вызывающий код мог ее обработать
        }
    };
}

function setupRealScenarioEvents() {
    document.getElementById('sequential-requests')?.addEventListener('click', sequentialApiRequests);
    document.getElementById('upload-simulation')?.addEventListener('click', simulateFileUpload);
    document.getElementById('cache-requests')?.addEventListener('click', async () => {
        setLoadingState('cache-requests', true);
        const cachedFetch = createRequestCache();
        const url = 'https://jsonplaceholder.typicode.com/users/1';
        let log = '';

        try {
            log += 'Первый запрос (кэш-промах):\n';
            const data1 = await cachedFetch(url);
            log += `Получены данные для ${data1.name}\n\n`;
            displayOutput('scenario-output', log);

            log += 'Второй запрос (кэш-попадание):\n';
            const data2 = await cachedFetch(url);
            log += `Получены те же данные для ${data2.name} (из кэша)`;
            displayOutput('scenario-output', log);
        } catch (error) {
            displayOutput('scenario-output', `Ошибка кэширования: ${error.message}`, true);
        } finally {
            setLoadingState('cache-requests', false);
        }
    });
}


// === ИНИЦИАЛИЗАЦИЯ ВСЕХ ФУНКЦИЙ ===

function initializeAsyncOperations() {
    // Вызовите все функции настройки:
    setupPromiseEvents();
    setupAsyncEvents();
    setupApiEvents();
    setupTimerEvents();
    setupErrorEvents();
    setupParallelEvents();
    setupRealScenarioEvents();

    console.log('Все асинхронные обработчики инициализированы!');
}

// Запуск инициализации когда DOM загружен
document.addEventListener('DOMContentLoaded', initializeAsyncOperations);