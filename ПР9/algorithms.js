// ================= КОНСТАНТЫ =================

const VOWELS_REGEX = /[aeiouаеёиоуыэюя]/gi;                 // гласные русские и английские
const WORD_REGEX = /[a-zA-Zа-яА-ЯёЁ0-9]+/g;                 // слова: буквы и цифры
const NOT_LETTER_OR_DIGIT_REGEX = /[^a-zA-Zа-яА-ЯёЁ0-9]/g;  // всё, кроме букв и цифр
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_CHARS = {
    lower: "abcdefghijklmnopqrstuvwxyz",
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
    special: "!@#$%^&*()_+-=[]{};:,.<>?"
};

// ================= ЗАДАЧА 2.1: Функции для работы с числами =================

// Проверка на простое число
// Временная сложность: O(√n) - корневая
// Делители проверяем только до √n и только вида 6k ± 1
function isPrime(number) {
    if (!Number.isInteger(number) || number <= 1) return false;
    if (number <= 3) return true;
    if (number % 2 === 0 || number % 3 === 0) return false;
    for (let i = 5; i * i <= number; i += 6) {
        if (number % i === 0 || number % (i + 2) === 0) return false;
    }
    return true;
}

// Вычисление факториала
// Временная сложность: O(n) - линейная
// Для n > 18 результат больше Number.MAX_SAFE_INTEGER и может быть неточным
function factorial(n) {
    if (!Number.isInteger(n) || n < 0) return undefined;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Первые n чисел Фибоначчи (итеративная реализация)
// Временная сложность: O(n) - линейная
function fibonacci(n) {
    if (!Number.isInteger(n) || n <= 0) return [];
    if (n === 1) return [0];
    const fib = [0, 1];
    for (let i = 2; i < n; i++) {
        fib.push(fib[i - 1] + fib[i - 2]);
    }
    return fib;
}

// Наибольший общий делитель (алгоритм Евклида)
// Временная сложность: O(log(min(a, b))) - логарифмическая
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b !== 0) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

// ================= ЗАДАЧА 2.2: Функции для работы со строками =================

// Проверка на палиндром (регистр, пробелы и знаки препинания игнорируются)
// Временная сложность: O(n) - линейная, где n - длина строки
function isPalindrome(str) {
    const cleaned = str.replace(NOT_LETTER_OR_DIGIT_REGEX, '').toLowerCase();
    let left = 0;
    let right = cleaned.length - 1;
    while (left < right) {
        if (cleaned[left] !== cleaned[right]) return false;
        left++;
        right--;
    }
    return true;
}

// Подсчёт количества гласных букв (русских и английских)
// Временная сложность: O(n) - линейная
function countVowels(str) {
    const matches = str.match(VOWELS_REGEX);
    return matches ? matches.length : 0;
}

// Переворот строки без split / reverse / join
// Временная сложность: O(n) - линейная
function reverseString(str) {
    let reversed = '';
    for (let i = str.length - 1; i >= 0; i--) {
        reversed += str[i];
    }
    return reversed;
}

// Поиск самого длинного слова в предложении (при равной длине берётся первое)
// Временная сложность: O(n) - линейная
function findLongestWord(sentence) {
    const words = sentence.match(WORD_REGEX) || [];
    let longest = '';
    for (const word of words) {
        if (word.length > longest.length) {
            longest = word;
        }
    }
    return longest;
}

// ================= ЗАДАЧА 2.3: Функции для работы с массивами =================

// Поиск максимального элемента без Math.max
// Временная сложность: O(n) - линейная
function findMax(arr) {
    if (arr.length === 0) return undefined;
    let max = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            max = arr[i];
        }
    }
    return max;
}

// Удаление дубликатов (порядок элементов сохраняется)
// Временная сложность: O(n) - линейная (Set ищет элемент за O(1))
function removeDuplicates(arr) {
    return [...new Set(arr)];
}

// Пузырьковая сортировка (исходный массив не изменяется, сортируется его копия)
// Временная сложность: O(n²) - квадратичная в худшем и среднем случае, O(n) в лучшем
// Память: O(n) из-за копии массива
function bubbleSort(arr) {
    const result = [...arr];
    const n = result.length;
    let swapped;
    for (let i = 0; i < n - 1; i++) {
        swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
            if (result[j] > result[j + 1]) {
                const temp = result[j];
                result[j] = result[j + 1];
                result[j + 1] = temp;
                swapped = true;
            }
        }
        if (!swapped) break; // Оптимизация: если обменов не было, массив уже отсортирован
    }
    return result;
}

// Бинарный поиск в отсортированном массиве (возвращает индекс или -1)
// Временная сложность: O(log n) - логарифмическая
function binarySearch(sortedArr, target) {
    let left = 0;
    let right = sortedArr.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (sortedArr[mid] === target) {
            return mid;
        } else if (sortedArr[mid] < target) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

// ================= ЗАДАЧА 2.4: Утилитарные функции =================

// Форматирование денежной суммы: 1234.56 -> "1 234.56 ₽"
// Временная сложность: O(d) - линейная по числу цифр d (для обычных сумм это константа)
function formatCurrency(amount, currency = '₽') {
    const parts = amount.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${parts[0]}.${parts[1]} ${currency}`;
}

// Проверка валидности email
// Временная сложность: O(n) - линейная, где n - длина строки
function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email);
}

// Генерация случайного пароля: всегда есть строчная и заглавная буквы, цифра и спецсимвол
// Временная сложность: O(n) - линейная, где n - длина пароля
function generatePassword(length = 8) {
    const { lower, upper, digits, special } = PASSWORD_CHARS;
    const allChars = lower + upper + digits + special;

    // Чтобы поместились все 4 категории символов, длина не меньше 4
    const size = Math.max(length, 4);

    const pickRandom = (chars) => chars[Math.floor(Math.random() * chars.length)];

    // По одному символу из каждой категории, остальные из общего набора
    const result = [pickRandom(lower), pickRandom(upper), pickRandom(digits), pickRandom(special)];
    while (result.length < size) {
        result.push(pickRandom(allChars));
    }

    // Перемешиваем (алгоритм Фишера-Йетса), чтобы обязательные символы не стояли в начале
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join('');
}

// Экспорт для запуска тестов в Node.js (в браузере объекта module нет, и этот блок пропускается)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isPrime, factorial, fibonacci, gcd,
        isPalindrome, countVowels, reverseString, findLongestWord,
        findMax, removeDuplicates, bubbleSort, binarySearch,
        formatCurrency, isValidEmail, generatePassword
    };
}