document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('registrationForm');
    const status = document.getElementById('formStatus');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const birthDate = document.getElementById('birthDate');
    const bio = document.getElementById('bio');
    const charCount = document.getElementById('charCount');

    // Поля, для которых в разметке есть место под сообщение об ошибке (id + "Error")
    const fields = Array.from(form.elements).filter(function (el) {
        return el.id && document.getElementById(el.id + 'Error');
    });

    // ---------- Дата рождения: максимум это сегодняшний день ----------
    const now = new Date();
    birthDate.max = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');

    // ---------- Показ и скрытие ошибок ----------
    function showError(field, message) {
        field.classList.add('error');
        field.setAttribute('aria-invalid', 'true');
        document.getElementById(field.id + 'Error').textContent = message;
    }

    function clearError(field) {
        field.classList.remove('error');
        field.removeAttribute('aria-invalid');
        document.getElementById(field.id + 'Error').textContent = '';
    }

    // Текст ошибки выбираем по тому, какое именно ограничение нарушено (Constraint Validation API)
    function getErrorMessage(field) {
        const v = field.validity;

        if (v.customError) {
            return field.validationMessage;
        }
        if (v.valueMissing) {
            return field.type === 'checkbox'
                ? 'Необходимо принять условия'
                : 'Это поле обязательно для заполнения';
        }
        if (v.typeMismatch) {
            return 'Введите корректный email, например name@mail.com';
        }
        if (v.tooShort) {
            return field.type === 'password'
                ? 'Пароль должен быть не короче ' + field.minLength + ' символов'
                : 'Минимальная длина: ' + field.minLength + ' симв. (сейчас ' + field.value.length + ')';
        }
        if (v.tooLong) {
            return 'Максимальная длина: ' + field.maxLength + ' символов';
        }
        if (v.patternMismatch) {
            if (field.type === 'password') {
                return 'Нужны заглавные и строчные латинские буквы и цифра';
            }
            if (field.type === 'tel') {
                return 'Введите телефон в формате +7 (999) 999-99-99';
            }
        }
        if (v.rangeUnderflow || v.rangeOverflow || v.badInput) {
            return 'Укажите корректную дату рождения';
        }
        return 'Некорректное значение';
    }

    // ---------- Кастомная проверка: подтверждение пароля ----------
    function checkPasswordMatch() {
        const mismatch = confirmPassword.value !== '' && confirmPassword.value !== password.value;
        // setCustomValidity делает поле невалидным для самого браузера (и для :invalid в CSS)
        confirmPassword.setCustomValidity(mismatch ? 'Пароли не совпадают' : '');
    }

    // ---------- Проверка одного поля ----------
    function validateField(field) {
        if (field === confirmPassword) {
            checkPasswordMatch();
        }

        if (field.validity.valid) {
            clearError(field);
            return true;
        }

        showError(field, getErrorMessage(field));
        return false;
    }

    // ---------- Валидация в реальном времени ----------
    fields.forEach(function (field) {
        // Когда пользователь ушёл из поля, показываем ошибку (blur)
        field.addEventListener('blur', function () {
            validateField(field);
        });

        // Пока печатает: если ошибка уже показана, сразу проверяем заново, чтобы она пропала после исправления
        field.addEventListener('input', function () {
            if (field.classList.contains('error')) {
                validateField(field);
            }
        });
    });

    // Чекбокс соглашения проверяем сразу при переключении
    document.getElementById('terms').addEventListener('change', function (e) {
        validateField(e.target);
    });

    // Если поменяли пароль, подтверждение нужно проверить заново
    password.addEventListener('input', function () {
        if (confirmPassword.value !== '') {
            validateField(confirmPassword);
        }
    });

    // ---------- Подсказки к паролю меняют цвет по мере выполнения условий ----------
    const passwordRules = {
        length: function (value) { return value.length >= 8; },
        case: function (value) { return /[a-z]/.test(value) && /[A-Z]/.test(value); },
        digit: function (value) { return /\d/.test(value); }
    };

    function updatePasswordHints() {
        document.querySelectorAll('#passwordRequirements li').forEach(function (item) {
            const rule = passwordRules[item.dataset.rule];
            item.classList.toggle('met', rule(password.value));
        });
    }

    password.addEventListener('input', updatePasswordHints);

    // ---------- Счётчик символов для textarea ----------
    function updateCounter() {
        charCount.textContent = bio.value.length;
        charCount.parentElement.classList.toggle('limit', bio.value.length >= 450);
    }

    bio.addEventListener('input', updateCounter);

    // ---------- Сообщение о результате ----------
    function showStatus(message, type) {
        status.textContent = message;
        status.className = 'form-status ' + type;
    }

    // ---------- Отправка формы ----------
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        let firstInvalid = null;

        fields.forEach(function (field) {
            if (!validateField(field) && !firstInvalid) {
                firstInvalid = field;
            }
        });

        if (firstInvalid) {
            showStatus('Пожалуйста, исправьте ошибки в форме', 'error');
            firstInvalid.focus();
            return;
        }

        // Эмуляция отправки: собираем данные и выводим в консоль
        const data = new FormData(form);
        console.log('Данные формы:', {
            firstName: data.get('firstName'),
            lastName: data.get('lastName'),
            email: data.get('email'),
            phone: data.get('phone'),
            birthDate: data.get('birthDate'),
            country: data.get('country'),
            gender: data.get('gender'),
            interests: data.getAll('interests'),
            newsletter: data.has('newsletter')
        });
        // form.submit(); // раскомментировать для реальной отправки на сервер

        form.reset();
        showStatus('Форма успешно отправлена! Спасибо за регистрацию.', 'success');
    });

    // ---------- Очистка формы ----------
    form.addEventListener('reset', function () {
        fields.forEach(clearError);
        confirmPassword.setCustomValidity('');
        status.textContent = '';
        status.className = 'form-status';

        // Значения полей сбрасываются уже после события reset, поэтому обновляем счётчик и подсказки чуть позже
        setTimeout(function () {
            updateCounter();
            updatePasswordHints();
        }, 0);
    });
});