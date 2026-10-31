// ================= Окружение: браузер или Node.js =================
const isBrowser = typeof document !== 'undefined';

if (!isBrowser && typeof require === 'function') {
    // В Node.js подключаем функции из algorithms.js
    Object.assign(globalThis, require('./algorithms.js'));
}

let totalTests = 0;
let passedTests = 0;

// Функция для вывода результатов тестов
function runTest(testName, actual, expected) {
    const isEqual = JSON.stringify(actual) === JSON.stringify(expected);
    totalTests++;
    if (isEqual) passedTests++;

    console.log(`${testName}:`, isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА', {expected, actual});

    if (!isBrowser) return;

    const resultElement = document.createElement('div');
    resultElement.className = `test-result ${isEqual ? 'success' : 'error'}`;

    resultElement.innerHTML = `
        <strong>${testName}:</strong>
        ${isEqual ? '✅ УСПЕХ' : '❌ ОШИБКА'}
        <br>
        Ожидалось: ${JSON.stringify(expected)}
        <br>
        Получено: ${JSON.stringify(actual)}
    `;

    document.getElementById('testResults').appendChild(resultElement);
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

// Итоговая строка: сколько тестов пройдено
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

// Проверка пароля: нужная длина и все 4 категории символов
function isStrongPassword(password, length) {
    return password.length === length &&
        /[a-z]/.test(password) &&
        /[A-Z]/.test(password) &&
        /\d/.test(password) &&
        /[^a-zA-Z0-9]/.test(password);
}

// Запуск всех тестов
function runAllTests() {
    console.log('=== ЗАПУСК ТЕСТОВ ===');
    totalTests = 0;
    passedTests = 0;

    // ---------- Тесты для работы с числами ----------
    addSection('Числа');
    runTest('isPrime(7)', isPrime(7), true);
    runTest('isPrime(10)', isPrime(10), false);
    runTest('isPrime(1)', isPrime(1), false);
    runTest('isPrime(2)', isPrime(2), true);
    runTest('isPrime(-7)', isPrime(-7), false);
    runTest('isPrime(7919)', isPrime(7919), true);
    runTest('factorial(5)', factorial(5), 120);
    runTest('factorial(0)', factorial(0), 1);
    runTest('factorial(10)', factorial(10), 3628800);
    runTest('factorial(-3)', factorial(-3), undefined);
    runTest('gcd(54, 24)', gcd(54, 24), 6);
    runTest('gcd(0, 5)', gcd(0, 5), 5);
    runTest('gcd(-12, 18)', gcd(-12, 18), 6);
    runTest('gcd(17, 13)', gcd(17, 13), 1);
    runTest('fibonacci(6)', fibonacci(6), [0, 1, 1, 2, 3, 5]);
    runTest('fibonacci(0)', fibonacci(0), []);
    runTest('fibonacci(1)', fibonacci(1), [0]);
    runTest('fibonacci(10)', fibonacci(10), [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]);

    // ---------- Тесты для работы со строками ----------
    addSection('Строки');
    runTest('isPalindrome("А роза упала на лапу Азора")', isPalindrome("А роза упала на лапу Азора"), true);
    runTest('isPalindrome("Madam, I\'m Adam")', isPalindrome("Madam, I'm Adam"), true);
    runTest('isPalindrome("hello")', isPalindrome("hello"), false);
    runTest('isPalindrome("")', isPalindrome(""), true);
    runTest('countVowels("JavaScript")', countVowels("JavaScript"), 3);
    runTest('countVowels("Привет, мир!")', countVowels("Привет, мир!"), 3);
    runTest('countVowels("Ёлка")', countVowels("Ёлка"), 2);
    runTest('countVowels("")', countVowels(""), 0);
    runTest('reverseString("hello")', reverseString("hello"), "olleh");
    runTest('reverseString("Привет")', reverseString("Привет"), "тевирП");
    runTest('reverseString("")', reverseString(""), "");
    runTest('findLongestWord("Самое длинное слово в предложении")', findLongestWord("Самое длинное слово в предложении"), "предложении");
    runTest('findLongestWord("a bb ccc dd")', findLongestWord("a bb ccc dd"), "ccc");
    runTest('findLongestWord("кот пёс")', findLongestWord("кот пёс"), "кот");
    runTest('findLongestWord("")', findLongestWord(""), "");

    // ---------- Тесты для работы с массивами ----------
    addSection('Массивы');
    runTest('findMax([3, 7, 2, 9, 1])', findMax([3, 7, 2, 9, 1]), 9);
    runTest('findMax([-5, -2, -9])', findMax([-5, -2, -9]), -2);
    runTest('findMax([7])', findMax([7]), 7);
    runTest('findMax([])', findMax([]), undefined);
    runTest('removeDuplicates([1, 2, 2, 3, 4, 4, 5])', removeDuplicates([1, 2, 2, 3, 4, 4, 5]), [1, 2, 3, 4, 5]);
    runTest('removeDuplicates([3, 3, 3])', removeDuplicates([3, 3, 3]), [3]);
    runTest('removeDuplicates(["a", "b", "a"])', removeDuplicates(["a", "b", "a"]), ["a", "b"]);
    runTest('removeDuplicates([])', removeDuplicates([]), []);
    runTest('bubbleSort([64, 34, 25, 12, 22, 11, 90])', bubbleSort([64, 34, 25, 12, 22, 11, 90]), [11, 12, 22, 25, 34, 64, 90]);
    runTest('bubbleSort([5, 4, 3, 2, 1])', bubbleSort([5, 4, 3, 2, 1]), [1, 2, 3, 4, 5]);
    runTest('bubbleSort([3, -1, 2, 2])', bubbleSort([3, -1, 2, 2]), [-1, 2, 2, 3]);
    runTest('bubbleSort([1])', bubbleSort([1]), [1]);
    runTest('bubbleSort([])', bubbleSort([]), []);

    // bubbleSort не должен менять исходный массив
    const original = [3, 1, 2];
    bubbleSort(original);
    runTest('bubbleSort не меняет исходный массив', original, [3, 1, 2]);

    runTest('binarySearch([1, 3, 5, 7, 9], 5)', binarySearch([1, 3, 5, 7, 9], 5), 2);
    runTest('binarySearch([1, 3, 5, 7, 9], 1)', binarySearch([1, 3, 5, 7, 9], 1), 0);
    runTest('binarySearch([1, 3, 5, 7, 9], 9)', binarySearch([1, 3, 5, 7, 9], 9), 4);
    runTest('binarySearch([1, 3, 5, 7, 9], 4)', binarySearch([1, 3, 5, 7, 9], 4), -1);
    runTest('binarySearch([], 1)', binarySearch([], 1), -1);

    // ---------- Тесты для утилитарных функций ----------
    addSection('Утилитарные функции');
    runTest('formatCurrency(1234.56)', formatCurrency(1234.56), "1 234.56 ₽");
    runTest('formatCurrency(0)', formatCurrency(0), "0.00 ₽");
    runTest('formatCurrency(1234567.891)', formatCurrency(1234567.891), "1 234 567.89 ₽");
    runTest('formatCurrency(1234.5, "$")', formatCurrency(1234.5, "$"), "1 234.50 $");
    runTest('isValidEmail("test@example.com")', isValidEmail("test@example.com"), true);
    runTest('isValidEmail("invalid.email")', isValidEmail("invalid.email"), false);
    runTest('isValidEmail("a@b")', isValidEmail("a@b"), false);
    runTest('isValidEmail("a b@c.d")', isValidEmail("a b@c.d"), false);
    runTest('isValidEmail("")', isValidEmail(""), false);

    // Пароль случайный, поэтому проверяем его свойства, а не конкретное значение
    runTest('generatePassword(12): длина и типы символов', isStrongPassword(generatePassword(12), 12), true);
    runTest('generatePassword(): длина по умолчанию 8', isStrongPassword(generatePassword(), 8), true);
    runTest('generatePassword(4): минимальная длина', isStrongPassword(generatePassword(4), 4), true);

    let allStrong = true;
    for (let i = 0; i < 200; i++) {
        if (!isStrongPassword(generatePassword(8), 8)) allStrong = false;
    }
    runTest('200 паролей по 8 символов: везде все типы символов', allStrong, true);

    renderSummary();
    console.log('=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ===');
}

// Дополнительные демонстрации в консоли
function demonstrateAlgorithms() {
    console.log('\n=== ДЕМОНСТРАЦИЯ АЛГОРИТМОВ ===');

    console.log('Сгенерированный пароль:', generatePassword(12));
    console.log('Числа Фибоначчи до 10:', fibonacci(10));
    console.log('Проверка email "invalid.email":', isValidEmail("invalid.email"));

    const testArray = [5, 2, 8, 1, 9];
    console.log('Исходный массив:', testArray);
    console.log('Отсортированный массив:', bubbleSort(testArray));
    console.log('Исходный массив после сортировки (не изменился):', testArray);
    console.log('Максимальный элемент:', findMax(testArray));
    console.log('Форматирование суммы 1234567.89:', formatCurrency(1234567.89));
}

// Запуск при загрузке страницы (в Node.js запускаем сразу)
if (isBrowser) {
    document.addEventListener('DOMContentLoaded', function() {
        runAllTests();
        demonstrateAlgorithms();
    });
} else {
    runAllTests();
    demonstrateAlgorithms();
}