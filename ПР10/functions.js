// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ПРОВЕРКИ АРГУМЕНТОВ =================

function assertFunction(value, functionName) {
    if (typeof value !== 'function') {
        throw new TypeError(`${functionName}: ожидалась функция, получено ${typeof value}`);
    }
}

function assertArray(value, functionName) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${functionName}: ожидался массив, получено ${typeof value}`);
    }
}

// ================= ЧАСТЬ 2: ОСНОВНЫЕ ЗАДАНИЯ =================

// Сумма любого количества аргументов (rest parameters)
// sum() -> 0, sum(1, 2, 3) -> 6
function sum(...numbers) {
    let total = 0;
    for (let i = 0; i < numbers.length; i++) {
        if (typeof numbers[i] !== 'number' || Number.isNaN(numbers[i])) {
            throw new TypeError(`sum: аргумент №${i + 1} не является числом`);
        }
        total += numbers[i];
    }
    return total;
}

// Создание описания пользователя (деструктуризация объекта, email необязателен)
// createUser({ name: "Анна", age: 25 }) -> "Пользователь: Анна, возраст: 25, email: не указан"
function createUser({ name, age, email = "не указан" } = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
        throw new TypeError('createUser: имя должно быть непустой строкой');
    }
    if (typeof age !== 'number' || !Number.isFinite(age)) {
        throw new TypeError('createUser: возраст должен быть числом');
    }
    if (age < 0) {
        throw new RangeError('createUser: возраст не может быть отрицательным');
    }

    // Пустой email или null тоже считаем «не указан»
    const shownEmail = (email === null || String(email).trim() === '') ? "не указан" : email;

    return `Пользователь: ${name}, возраст: ${age}, email: ${shownEmail}`;
}

// Секретное сообщение: пароль и сообщение хранятся в замыкании и снаружи недоступны
function secretMessage(password, message) {
    return function (inputPassword) {
        return inputPassword === password ? message : "Доступ запрещен";
    };
}

// ================= ЧАСТЬ 3: ФУНКЦИИ ВЫСШЕГО ПОРЯДКА =================

// Композиция функций справа налево: compose(f, g, h)(x) = f(g(h(x)))
// Самая правая функция может принимать несколько аргументов
function compose(...functions) {
    functions.forEach((fn) => assertFunction(fn, 'compose'));

    return function (...args) {
        if (functions.length === 0) return args[0];

        let result = functions[functions.length - 1].apply(this, args);
        for (let i = functions.length - 2; i >= 0; i--) {
            result = functions[i](result);
        }
        return result;
    };
}

// Композиция слева направо: pipe(f, g, h)(x) = h(g(f(x)))
function pipe(...functions) {
    return compose(...functions.slice().reverse());
}

// Аналог Array.prototype.map (callback получает элемент, индекс и массив)
function myMap(array, callback) {
    assertArray(array, 'myMap');
    assertFunction(callback, 'myMap');

    const result = new Array(array.length);
    for (let i = 0; i < array.length; i++) {
        if (i in array) { // пропуски в разреженных массивах сохраняем, как в оригинале
            result[i] = callback(array[i], i, array);
        }
    }
    return result;
}

// Аналог Array.prototype.filter
function myFilter(array, callback) {
    assertArray(array, 'myFilter');
    assertFunction(callback, 'myFilter');

    const result = [];
    for (let i = 0; i < array.length; i++) {
        if (i in array && callback(array[i], i, array)) {
            result.push(array[i]);
        }
    }
    return result;
}

// Аналог Array.prototype.reduce
// Если initialValue не передан, первым значением аккумулятора становится первый элемент
function myReduce(array, callback, initialValue) {
    assertArray(array, 'myReduce');
    assertFunction(callback, 'myReduce');

    const hasInitialValue = arguments.length >= 3; // initialValue может быть и undefined, и 0
    let index = 0;
    let accumulator;

    if (hasInitialValue) {
        accumulator = initialValue;
    } else {
        while (index < array.length && !(index in array)) index++;
        if (index >= array.length) {
            throw new TypeError('myReduce: пустой массив без начального значения');
        }
        accumulator = array[index++];
    }

    for (; index < array.length; index++) {
        if (index in array) {
            accumulator = callback(accumulator, array[index], index, array);
        }
    }
    return accumulator;
}

// ================= ЧАСТЬ 4: СЛОЖНО, НО ВАЖНО =================

// Каррирование: curry(f)(a)(b)(c), curry(f)(a, b)(c) и curry(f)(a, b, c) дают одинаковый результат
// Количество аргументов определяется по fn.length
function curry(fn) {
    assertFunction(fn, 'curry');

    return function curried(...args) {
        if (args.length >= fn.length) {
            return fn.apply(this, args);
        }
        return function (...nextArgs) {
            return curried.apply(this, args.concat(nextArgs));
        };
    };
}

// Мемоизация: результат для одинаковых аргументов считается один раз
// Ключ кэша строится из аргументов, поэтому они должны сериализоваться в JSON
// (числа, строки, массивы, простые объекты)
function memoize(fn) {
    assertFunction(fn, 'memoize');

    const cache = new Map();

    function makeKey(args) {
        return JSON.stringify(args, (key, value) => {
            if (value === undefined) return '__undefined__';
            if (typeof value === 'number' && !Number.isFinite(value)) return `__${value}__`;
            if (typeof value === 'bigint') return `${value}n`;
            return value;
        });
    }

    function memoized(...args) {
        const key = makeKey(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args); // если функция выбросит ошибку, в кэш ничего не попадёт
        cache.set(key, result);
        return result;
    }

    memoized.cache = cache; // доступ к кэшу пригодится для проверок и очистки
    return memoized;
}

// Дебаунсинг: вызов откладывается, пока вызовы не прекратятся на delay миллисекунд
// Вызывается только последний вызов с его аргументами
function debounce(fn, delay) {
    assertFunction(fn, 'debounce');

    let timerId = null;

    function debounced(...args) {
        clearTimeout(timerId);
        timerId = setTimeout(() => {
            timerId = null;
            fn.apply(this, args);
        }, delay);
    }

    debounced.cancel = function () {
        clearTimeout(timerId);
        timerId = null;
    };

    return debounced;
}

// Троттлинг: функция вызывается не чаще одного раза за interval миллисекунд
// Первый вызов выполняется сразу, а последний пропущенный вызов выполнится в конце интервала
function throttle(fn, interval) {
    assertFunction(fn, 'throttle');

    let lastCallTime = 0;
    let timerId = null;
    let lastArgs;
    let lastThis;

    function invoke() {
        lastCallTime = Date.now();
        timerId = null;
        fn.apply(lastThis, lastArgs);
        lastArgs = lastThis = undefined;
    }

    function throttled(...args) {
        lastArgs = args;
        lastThis = this;

        const remaining = interval - (Date.now() - lastCallTime);

        if (remaining <= 0) {
            clearTimeout(timerId);
            invoke();
        } else if (timerId === null) {
            timerId = setTimeout(invoke, remaining);
        }
    }

    throttled.cancel = function () {
        clearTimeout(timerId);
        timerId = null;
        lastArgs = lastThis = undefined;
    };

    return throttled;
}

// Создание валидатора пароля
// options: { minLength, requireDigit, requireUppercase }
// Возвращает функцию, которая отвечает объектом { isValid, errors }
function createValidator(options = {}) {
    if (options === null || typeof options !== 'object') {
        throw new TypeError('createValidator: options должен быть объектом');
    }

    // Копируем значения, чтобы изменение options снаружи не влияло на валидатор
    const { minLength = 0, requireDigit = false, requireUppercase = false } = options;

    if (!Number.isInteger(minLength) || minLength < 0) {
        throw new RangeError('createValidator: minLength должен быть целым числом не меньше 0');
    }

    return function validate(value) {
        if (typeof value !== 'string') {
            return { isValid: false, errors: ['Значение должно быть строкой'] };
        }

        const errors = [];

        if (value.length < minLength) {
            errors.push(`Минимальная длина: ${minLength} символов`);
        }
        if (requireDigit && !/\d/.test(value)) {
            errors.push('Нужна хотя бы одна цифра');
        }
        if (requireUppercase && !/[A-ZА-ЯЁ]/.test(value)) {
            errors.push('Нужна хотя бы одна заглавная буква');
        }

        return { isValid: errors.length === 0, errors };
    };
}

// ================= ДОПОЛНИТЕЛЬНО: РЕКУРСИЯ И ГЕНЕРАТОРЫ =================

// Факториал через рекурсию
function factorialRecursive(n) {
    if (!Number.isInteger(n) || n < 0) {
        throw new RangeError('factorialRecursive: нужно целое число не меньше 0');
    }
    return n <= 1 ? 1 : n * factorialRecursive(n - 1);
}

// Разворачивание вложенных массивов любой глубины (рекурсия)
function flatten(array) {
    assertArray(array, 'flatten');
    return myReduce(array, (flat, item) =>
        Array.isArray(item) ? flat.concat(flatten(item)) : flat.concat([item]), []);
}

// Число Фибоначчи: рекурсия + мемоизация (без кэша работало бы за O(2^n))
const fibonacciMemo = memoize(function (n) {
    return n < 2 ? n : fibonacciMemo(n - 1) + fibonacciMemo(n - 2);
});

// Генератор бесконечной последовательности Фибоначчи (значения вычисляются лениво)
function* fibonacciGenerator() {
    let [current, next] = [0, 1];
    while (true) {
        yield current;
        [current, next] = [next, current + next];
    }
}

// Берёт первые count значений из любого итерируемого объекта (в том числе из бесконечного генератора)
function take(iterable, count) {
    const result = [];
    if (count <= 0) return result;
    for (const value of iterable) {
        result.push(value);
        if (result.length >= count) break;
    }
    return result;
}

// Экспорт для запуска тестов в Node.js (в браузере объекта module нет, и этот блок пропускается)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sum, createUser, secretMessage,
        compose, pipe, myMap, myFilter, myReduce,
        curry, memoize, debounce, throttle, createValidator,
        factorialRecursive, flatten, fibonacciMemo, fibonacciGenerator, take
    };
}