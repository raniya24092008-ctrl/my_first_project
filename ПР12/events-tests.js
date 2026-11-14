'use strict';



(function () {
  /* ----------------------------- Мини-фреймворк --------------------------- */

  const TESTS = [];
  const TEST_TIMEOUT = 6000;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitFor(predicate, timeout = 3000, interval = 25) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (predicate()) return true;
      await sleep(interval);
    }
    return predicate();
  }

  function formatValue(value) {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'function') return `[function ${value.name || 'anonymous'}]`;
    try {
      const serialized = JSON.stringify(value);
      return serialized === undefined ? String(value) : serialized;
    } catch (error) {
      return String(value);
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'утверждение не выполнено');
  }

  function assertNot(condition, message) {
    if (condition) throw new Error(message || 'утверждение не должно выполняться');
  }

  function assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message || 'assertEqual'}: ожидалось ${formatValue(expected)}, получено ${formatValue(actual)}`);
    }
  }

  function assertDeepEqual(actual, expected, message) {
    const actualText = JSON.stringify(actual);
    const expectedText = JSON.stringify(expected);
    if (actualText !== expectedText) {
      throw new Error(`${message || 'assertDeepEqual'}: ожидалось ${expectedText}, получено ${actualText}`);
    }
  }

  function assertIncludes(haystack, needle, message) {
    const text = String(haystack == null ? '' : haystack);
    if (!text.includes(String(needle))) {
      throw new Error(`${message || 'assertIncludes'}: в "${text.slice(0, 200)}" нет подстроки "${needle}"`);
    }
  }

  function assertMatch(value, regexp, message) {
    if (!regexp.test(String(value == null ? '' : value))) {
      throw new Error(`${message || 'assertMatch'}: "${String(value).slice(0, 200)}" не соответствует ${regexp}`);
    }
  }

  function assertThrows(fn, expectedError, message) {
    try {
      fn();
    } catch (error) {
      if (expectedError) {
        const expectedName = typeof expectedError === 'function' ? expectedError.name : String(expectedError);
        const matches = typeof expectedError === 'function'
          ? error instanceof expectedError
          : error.name === expectedName;
        if (!matches) {
          throw new Error(`${message || 'assertThrows'}: ожидалась ошибка ${expectedName}, получено ${error.name}`);
        }
      }
      return error;
    }
    throw new Error(`${message || 'assertThrows'}: ожидалась ошибка, но функция выполнилась без ошибки`);
  }

  /* --------------------------- DOM-хелперы --------------------------------- */

  function el(selector) {
    return document.querySelector(selector);
  }

  function clear(nodeOrSelector) {
    const node = typeof nodeOrSelector === 'string' ? el(nodeOrSelector) : nodeOrSelector;
    if (node) node.replaceChildren();
    return node;
  }

  function fireMouse(target, type, init = {}) {
    return target.dispatchEvent(new MouseEvent(type, Object.assign({
      bubbles: true,
      cancelable: true,
      view: window
    }, init)));
  }

  function fireKey(target, type, init = {}) {
    return target.dispatchEvent(new KeyboardEvent(type, Object.assign({
      bubbles: true,
      cancelable: true
    }, init)));
  }

  function fireEvent(target, type, init = {}) {
    return target.dispatchEvent(new Event(type, Object.assign({
      bubbles: true,
      cancelable: true
    }, init)));
  }

  function register(group, name, fn) {
    TESTS.push({ group, name, fn });
  }

  /* ------------------------------ Запуск ----------------------------------- */

  function withTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timerId = setTimeout(() => {
        reject(new Error(`тест не завершился за ${timeout} мс`));
      }, timeout);

      Promise.resolve()
        .then(fn)
        .then(
          (value) => {
            clearTimeout(timerId);
            resolve(value);
          },
          (error) => {
            clearTimeout(timerId);
            reject(error);
          }
        );
    });
  }

  async function runAll() {
    const results = [];

    for (const item of TESTS) {
      try {
        await withTimeout(item.fn, TEST_TIMEOUT);
        results.push({ group: item.group, name: item.name, ok: true });
      } catch (error) {
        results.push({
          group: item.group,
          name: item.name,
          ok: false,
          message: error && error.message ? error.message : String(error)
        });
      }
    }

    return results;
  }

  function renderResults(results) {
    const container = el('#test-results');
    if (!container) return null;

    container.replaceChildren();

    const passed = results.filter((result) => result.ok).length;
    const failed = results.length - passed;

    const summary = document.createElement('div');
    summary.className = `test-summary ${failed ? 'has-failures' : 'all-passed'}`;
    summary.textContent = failed
      ? `Провалено ${failed} из ${results.length}. Успешно: ${passed}.`
      : `Все ${results.length} тестов пройдены.`;
    container.append(summary);

    let currentGroup = null;
    let groupContainer = null;

    results.forEach((result) => {
      if (result.group !== currentGroup) {
        currentGroup = result.group;

        const heading = document.createElement('h3');
        heading.className = 'test-group-title';
        heading.textContent = currentGroup;
        container.append(heading);

        groupContainer = document.createElement('div');
        groupContainer.className = 'test-group';
        container.append(groupContainer);
      }

      const row = document.createElement('div');
      row.className = `test-row ${result.ok ? 'pass' : 'fail'}`;
      row.textContent = result.ok
        ? `✔ ${result.name}`
        : `✘ ${result.name} — ${result.message}`;
      groupContainer.append(row);
    });

    return { passed, failed, total: results.length };
  }

  async function runTests() {
    const button = el('#run-tests');
    const container = el('#test-results');

    if (button) {
      button.disabled = true;
      button.textContent = 'Тесты выполняются…';
    }
    if (container) container.textContent = 'Выполняем тесты…';

    let results = [];
    try {
      results = await runAll();
    } catch (error) {
      results = [{ group: 'Инфраструктура', name: 'запуск тестов', ok: false, message: String(error) }];
    } finally {
      renderResults(results);
      if (button) {
        button.disabled = false;
        button.textContent = 'Запустить тесты';
      }
    }

    const failed = results.filter((result) => !result.ok);
    if (failed.length) {
      console.error(`Провалено тестов: ${failed.length} из ${results.length}`);
      failed.forEach((result) => console.error(`${result.group} → ${result.name}: ${result.message}`));
    } else {
      console.info(`Все тесты пройдены (${results.length}).`);
    }

    return results;
  }

  /* ==========================================================================
     ТЕСТЫ
     ========================================================================== */

  /* ----------------------------- Интеграция ------------------------------- */

  register('Интеграция', 'все элементы из задания присутствуют в DOM', () => {
    const ids = [
      'basic-btn', 'basic-output', 'color-box', 'mouse-output',
      'key-input', 'key-output',
      'item-list', 'add-item-btn', 'delegation-output',
      'prevent-link', 'prevent-form', 'prevention-output',
      'trigger-custom', 'custom-output', 'multiple-listeners',
      'load-image', 'load-error', 'loading-output',
      'start-timer', 'stop-timer', 'timer-output',
      'debounce-btn', 'throttle-btn', 'async-output'
    ];

    const missing = ids.filter((id) => !document.getElementById(id));
    assertDeepEqual(missing, [], `не найдены элементы с id: ${missing.join(', ')}`);
  });

  register('Интеграция', 'все setup-функции объявлены', () => {
    const names = [
      'setupBasicEvents', 'setupKeyboardEvents', 'setupDelegationEvents',
      'setupPreventionEvents', 'setupCustomEvents', 'setupLoadingEvents', 'setupTimerEvents',
      'createDebounce', 'createThrottle', 'addNewItem', 'triggerCustomEvent'
    ];

    const missing = names.filter((name) => typeof window[name] !== 'function');
    assertDeepEqual(missing, [], `не объявлены функции: ${missing.join(', ')}`);
  });

  /* ------------------------ Задание 1. Базовые события -------------------- */

  register('Задание 1. Базовые обработчики', 'handleBasicClick выводит тип, координаты и target', () => {
    const button = el('#basic-btn');
    const output = el('#basic-output');
    clear(output);

    fireMouse(button, 'click', { clientX: 123, clientY: 45 });

    const text = output.textContent;
    assertIncludes(text, 'click', 'тип события не выведен');
    assertIncludes(text, '123', 'координата clientX не выведена');
    assertIncludes(text, '45', 'координата clientY не выведена');
    assertIncludes(text, 'Target', 'информация о target не выведена');
    assertIncludes(text, 'currentTarget', 'информация о currentTarget не выведена');
    assertIncludes(text, 'button', 'тег target не указан');
  });

  register('Задание 1. Базовые обработчики', 'handleBasicClick добавляет pulse и снимает его через 500 мс', async () => {
    const button = el('#basic-btn');
    button.classList.remove('pulse');

    fireMouse(button, 'click');
    assert(button.classList.contains('pulse'), 'класс pulse не добавлен');

    await sleep(600);
    assertNot(button.classList.contains('pulse'), 'класс pulse не снят через 500 мс');
  });

  register('Задание 1. Базовые обработчики', 'handleMouseEvents меняет фон и показывает координаты', () => {
    const box = el('#color-box');
    const output = el('#mouse-output');

    // У блока есть CSS-переход background-color: без его отключения
    // getComputedStyle вернёт промежуточный цвет, а не конечный.
    box.style.transition = 'none';
    box.style.backgroundColor = '';

    fireMouse(box, 'mouseenter');
    assertEqual(getComputedStyle(box).backgroundColor, 'rgb(231, 76, 60)', 'фон при mouseenter');

    fireMouse(box, 'mousemove', { clientX: 15, clientY: 25 });
    assertMatch(output.textContent, /X\s*=\s*-?\d+/, 'координата X не выведена');
    assertMatch(output.textContent, /Y\s*=\s*-?\d+/, 'координата Y не выведена');

    fireMouse(box, 'mouseleave');
    assertEqual(getComputedStyle(box).backgroundColor, 'rgb(52, 152, 219)', 'фон при mouseleave');
    assertMatch(output.textContent, /mouseleave/i, 'нет сообщения о mouseleave');

    box.style.transition = '';
  });

  register('Задание 1. Базовые обработчики', 'mousemove работает и без предварительного mouseenter (краевой случай)', () => {
    const box = el('#color-box');
    const output = el('#mouse-output');
    clear(output);

    fireMouse(box, 'mousemove', { clientX: 1, clientY: 2 });

    assertMatch(output.textContent, /mousemove/i, 'событие mousemove не обработано');
    assertIncludes(output.textContent, 'X =', 'координаты не выведены');
  });

  /* ---------------------- Задание 2. События клавиатуры ------------------- */

  register('Задание 2. Клавиатура', 'Ctrl+S отменяет стандартное действие и выводит сообщение', () => {
    const input = el('#key-input');
    const output = el('#key-output');

    const event = new KeyboardEvent('keydown', {
      key: 's', code: 'KeyS', ctrlKey: true, bubbles: true, cancelable: true
    });
    input.dispatchEvent(event);

    assertEqual(event.defaultPrevented, true, 'preventDefault для Ctrl+S не вызван');
    assertIncludes(output.textContent, 'Ctrl', 'комбинация не выведена');
    assertMatch(output.textContent, /отмен|перехвач/i, 'нет сообщения о перехвате');
    assertIncludes(output.textContent, 'KeyS', 'code не выведен');
  });

  register('Задание 2. Клавиатура', 'Alt+C и Shift+A тоже перехватываются', () => {
    const input = el('#key-input');

    const altEvent = new KeyboardEvent('keydown', {
      key: 'c', code: 'KeyC', altKey: true, bubbles: true, cancelable: true
    });
    input.dispatchEvent(altEvent);
    assertEqual(altEvent.defaultPrevented, true, 'Alt+C не перехвачен');

    const shiftEvent = new KeyboardEvent('keydown', {
      key: 'A', code: 'KeyA', shiftKey: true, bubbles: true, cancelable: true
    });
    input.dispatchEvent(shiftEvent);
    assertEqual(shiftEvent.defaultPrevented, true, 'Shift+A не перехвачен');
  });

  register('Задание 2. Клавиатура', 'обычная клавиша не отменяется и показывает key/code', () => {
    const input = el('#key-input');
    const output = el('#key-output');

    const event = new KeyboardEvent('keydown', {
      key: 'q', code: 'KeyQ', bubbles: true, cancelable: true
    });
    input.dispatchEvent(event);

    assertEqual(event.defaultPrevented, false, 'обычная клавиша не должна отменяться');
    assertIncludes(output.textContent, 'KeyQ', 'code не выведен');
    assertIncludes(output.textContent, 'q', 'key не выведен');
    assertIncludes(output.textContent, 'ctrlKey', 'модификаторы не выведены');
  });

  register('Задание 2. Клавиатура', 'keyup сбрасывает состояние поля', () => {
    const input = el('#key-input');
    const output = el('#key-output');

    fireKey(input, 'keydown', { key: 'w', code: 'KeyW' });
    assert(input.classList.contains('key-pressed'), 'класс key-pressed не добавлен при keydown');

    fireKey(input, 'keyup', { key: 'w', code: 'KeyW' });
    assertNot(input.classList.contains('key-pressed'), 'класс key-pressed не снят при keyup');
    assertIncludes(output.textContent, 'keyup', 'событие keyup не отражено в выводе');
  });

  register('Задание 2. Клавиатура', 'после комбинации обычные клавиши снова не отменяются', () => {
    const input = el('#key-input');

    fireKey(input, 'keydown', { key: 's', code: 'KeyS', ctrlKey: true });

    const event = new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    assertEqual(event.defaultPrevented, false, 'флаг перехвата «залип» на следующих клавишах');
  });

  /* ---------------------- Задание 3. Делегирование ------------------------ */

  function getFirstItem() {
    const list = el('#item-list');
    if (!list.querySelector('.item')) addNewItem();
    return list.querySelector('.item');
  }

  register('Задание 3. Делегирование', 'клик по .item переключает класс selected', () => {
    const list = el('#item-list');
    const item = getFirstItem();
    item.classList.remove('selected');

    fireMouse(item, 'click');
    assert(item.classList.contains('selected'), 'класс selected не добавлен');

    fireMouse(item, 'click');
    assertNot(item.classList.contains('selected'), 'класс selected не снят повторным кликом');

    assertIncludes(el('#delegation-output').textContent, 'Выбрано', 'вывод не обновлён');
    assert(list.contains(item), 'элемент не должен удаляться при обычном клике');
  });

  register('Задание 3. Делегирование', 'клик по .delete удаляет элемент и не выделяет его', () => {
    const list = el('#item-list');
    const item = getFirstItem();
    item.classList.remove('selected');

    const id = item.dataset.id;
    const before = list.querySelectorAll('.item').length;

    fireMouse(item.querySelector('.delete'), 'click');

    assertEqual(list.querySelectorAll('.item').length, before - 1, 'элемент не удалён');
    assertNot(list.contains(item), 'элемент остался в DOM');
    assertNot(item.classList.contains('selected'), 'удаляемый элемент не должен выделяться');
    assertIncludes(el('#delegation-output').textContent, id, 'id удалённого элемента не выведен');
  });

  register('Задание 3. Делегирование', 'addNewItem создаёт элемент с уникальным data-id', () => {
    const list = el('#item-list');
    clear(el('#delegation-output'));

    const created = addNewItem();

    assert(created instanceof HTMLElement, 'addNewItem не вернул созданный элемент');
    assert(list.contains(created), 'элемент не добавлен в список');
    assertEqual(created.className, 'item', 'у нового элемента неверный класс');

    const ids = Array.from(list.querySelectorAll('.item')).map((item) => item.dataset.id);
    assertEqual(new Set(ids).size, ids.length, `data-id повторяются: ${ids.join(', ')}`);
    assertIncludes(el('#delegation-output').textContent, created.dataset.id, 'id нового элемента не выведен');
  });

  register('Задание 3. Делегирование', 'делегирование работает для динамически добавленных элементов', () => {
    const list = el('#item-list');

    el('#add-item-btn').click();

    const items = Array.from(list.querySelectorAll('.item'));
    const last = items[items.length - 1];

    fireMouse(last, 'click');
    assert(last.classList.contains('selected'), 'делегирование не сработало для нового элемента');

    fireMouse(last.querySelector('.delete'), 'click');
    assertNot(last.isConnected, 'новый элемент не удаляется через .delete');
  });

  register('Задание 3. Делегирование', 'клик по пустому месту списка ничего не ломает', () => {
    const list = el('#item-list');
    const before = list.querySelectorAll('.item.selected').length;

    fireMouse(list, 'click');

    assertEqual(list.querySelectorAll('.item.selected').length, before, 'выделение изменилось от клика по пустому месту');
  });

  /* ------------- Задание 4. Предотвращение стандартного поведения --------- */

  register('Задание 4. Предотвращение', 'клик по ссылке отменяет переход, пишет сообщение и запускает shake', () => {
    const link = el('#prevent-link');
    const output = el('#prevention-output');
    link.classList.remove('shake');
    clear(output);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    const dispatchResult = link.dispatchEvent(event);

    assertEqual(event.defaultPrevented, true, 'defaultPrevented не установлен');
    assertEqual(dispatchResult, false, 'dispatchEvent должен вернуть false для отменённого события');
    assert(output.textContent.length > 0, 'сообщение о предотвращении не выведено');
    assert(link.classList.contains('shake'), 'анимация shake не запущена');
  });

  register('Задание 4. Предотвращение', 'пустое поле блокирует отправку формы', () => {
    const form = el('#prevent-form');
    const input = el('#form-input');
    const output = el('#prevention-output');

    input.value = '   ';
    input.classList.remove('invalid');

    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    assertEqual(event.defaultPrevented, true, 'отправка формы не отменена');
    assertMatch(output.textContent, /пуст/i, 'нет сообщения о пустом поле');
    assert(input.classList.contains('invalid'), 'поле не помечено как некорректное');
  });

  register('Задание 4. Предотвращение', 'корректные данные показываются в выводе', () => {
    const form = el('#prevent-form');
    const input = el('#form-input');
    const output = el('#prevention-output');

    input.value = 'Тестовые данные';
    input.classList.remove('invalid');

    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);

    assertEqual(event.defaultPrevented, true, 'отправка формы не отменена');
    assertIncludes(output.textContent, 'Тестовые данные', 'данные формы не выведены');
    assertNot(input.classList.contains('invalid'), 'класс invalid не снят');
  });

  register('Задание 4. Предотвращение', 'пробелы по краям не считаются данными (краевой случай)', () => {
    const form = el('#prevent-form');
    const input = el('#form-input');
    const output = el('#prevention-output');

    input.value = '  a  ';
    fireEvent(form, 'submit');

    assertIncludes(output.textContent, 'a', 'валидное значение после trim потеряно');
    assertNot(input.classList.contains('invalid'), 'значение с пробелами по краям считается пустым');
  });

  /* ---------------------- Задание 5. Кастомные события -------------------- */

  register('Задание 5. Кастомные события', 'triggerCustomEvent отправляет customAction с detail', () => {
    let received = null;
    const listener = (event) => { received = event; };
    document.addEventListener('customAction', listener);

    try {
      const customEvent = triggerCustomEvent();

      assert(customEvent instanceof CustomEvent, 'создано не CustomEvent');
      assertEqual(customEvent.type, 'customAction', 'неверный тип события');
      assert(received !== null, 'событие не дошло до document');
      assertIncludes(String(received.detail && received.detail.message), 'Привет', 'detail.message отсутствует');
    } finally {
      document.removeEventListener('customAction', listener);
    }
  });

  register('Задание 5. Кастомные события', 'handleCustomEvent выводит detail и анимирует кнопку', () => {
    const output = el('#custom-output');
    const button = el('#trigger-custom');
    button.classList.remove('pulse');

    button.click();

    assertIncludes(output.textContent, 'Привет от кастомного события!', 'detail.message не выведен');
    assert(button.classList.contains('pulse'), 'анимация кнопки не запущена');
  });

  register('Задание 5. Кастомные события', 'обработчик читает данные именно из event.detail', () => {
    const output = el('#custom-output');
    clear(output);

    document.dispatchEvent(new CustomEvent('customAction', { detail: { message: 'Проверка из теста' } }));

    assertIncludes(output.textContent, 'Проверка из теста', 'переданные данные не отображены');
  });

  register('Задание 5. Кастомные события', 'на одно событие подписаны три разных обработчика', () => {
    const output = el('#custom-output');
    clear(output);

    el('#multiple-listeners').click();

    const text = output.textContent;
    assertIncludes(text, 'Слушатель №1', 'первый обработчик не сработал');
    assertIncludes(text, 'Слушатель №2', 'второй обработчик не сработал');
    assertIncludes(text, 'Слушатель №3', 'третий обработчик не сработал');
  });

  register('Задание 5. Кастомные события', 'повторный запуск не дублирует обработчики (краевой случай)', () => {
    const output = el('#custom-output');
    clear(output);

    el('#multiple-listeners').click();
    el('#multiple-listeners').click();

    const count = (output.textContent.match(/Слушатель/g) || []).length;
    assertEqual(count, 3, `ожидалось 3 записи, получено ${count}`);
  });

  /* ------------------- Задание 6. Загрузка и ошибки ----------------------- */

  const ONE_PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const BROKEN_PNG = 'data:image/png;base64,AAAA';

  register('Задание 6. Загрузка и ошибки', 'loadImageWithEvents создаёт img и обрабатывает loadstart', () => {
    const output = el('#loading-output');

    const image = loadImageWithEvents();

    assert(image instanceof HTMLImageElement, 'изображение не создано');
    assertIncludes(image.src, 'picsum.photos', 'использован не тот URL по умолчанию');
    assertIncludes(output.textContent, 'loadstart', 'событие loadstart не обработано');
    assert(el('#image-container').contains(image), 'изображение не добавлено в контейнер');

    // Нейтрализуем сетевой запрос, чтобы тест не зависел от интернета.
    image.remove();
    image.src = ONE_PIXEL_GIF;
  });

  register('Задание 6. Загрузка и ошибки', 'успешная загрузка переводит статус в success', async () => {
    const output = el('#loading-output');

    const image = loadImageWithEvents(ONE_PIXEL_GIF);

    const loaded = await waitFor(() => output.dataset.state === 'success', 3000);
    assert(loaded, 'событие load не обработано');
    assertIncludes(output.textContent, 'load', 'нет записи о событии load');
    assertIncludes(output.textContent, 'loadend', 'нет записи о событии loadend');

    image.remove();
  });

  register('Задание 6. Загрузка и ошибки', 'ошибка загрузки обрабатывается и показывается пользователю', async () => {
    const output = el('#loading-output');

    const image = simulateLoadError(BROKEN_PNG);

    assert(image instanceof HTMLImageElement, 'изображение для проверки ошибки не создано');

    const failed = await waitFor(() => output.dataset.state === 'error', 3000);
    assert(failed, 'событие error не обработано');
    assertMatch(output.textContent, /error|не удалось/i, 'нет сообщения об ошибке');
    assert(el('#image-container .image-error'), 'заглушка с ошибкой не показана');
  });

  /* ------------- Задание 7. Таймеры, debounce и throttle ------------------ */

  register('Задание 7. Таймеры и асинхронность', 'createDebounce схлопывает серию вызовов в один', async () => {
    let calls = 0;
    const debounced = createDebounce(() => { calls += 1; }, 60);

    debounced();
    debounced();
    debounced();
    debounced();

    assertEqual(calls, 0, 'функция не должна вызываться во время серии');
    await sleep(140);
    assertEqual(calls, 1, 'после паузы функция должна вызваться ровно один раз');
  });

  register('Задание 7. Таймеры и асинхронность', 'createDebounce сохраняет аргументы и this', async () => {
    const receiver = {
      calls: 0,
      lastArg: null,
      run(value) {
        this.calls += 1;
        this.lastArg = value;
      }
    };

    const debounced = createDebounce(receiver.run, 40);

    debounced.call(receiver, 'первый');
    debounced.call(receiver, 'второй');

    await sleep(100);

    assertEqual(receiver.calls, 1, 'должен быть один вызов');
    assertEqual(receiver.lastArg, 'второй', 'должен использоваться аргумент последнего вызова');
  });

  register('Задание 7. Таймеры и асинхронность', 'createDebounce.cancel отменяет отложенный вызов', async () => {
    let calls = 0;
    const debounced = createDebounce(() => { calls += 1; }, 40);

    debounced();
    assert(debounced.pending(), 'вызов должен ожидать выполнения');
    debounced.cancel();

    await sleep(100);

    assertEqual(calls, 0, 'cancel должен отменить вызов');
    assertNot(debounced.pending(), 'после cancel ничего не ожидается');
  });

  register('Задание 7. Таймеры и асинхронность', 'createDebounce и createThrottle валидируют аргументы', () => {
    assertThrows(() => createDebounce(null, 10), TypeError, 'createDebounce без функции');
    assertThrows(() => createThrottle('строка', 10), TypeError, 'createThrottle без функции');
  });

  register('Задание 7. Таймеры и асинхронность', 'createThrottle выполняет первый вызов сразу', async () => {
    const calls = [];
    const throttled = createThrottle((value) => calls.push(value), 80);

    throttled(1);
    assertDeepEqual(calls, [1], 'первый вызов должен выполниться немедленно');

    throttled(2);
    throttled(3);
    assertDeepEqual(calls, [1], 'вызовы внутри интервала не выполняются сразу');

    await sleep(150);
    assertDeepEqual(calls, [1, 3], 'в конце интервала должен выполниться последний отложенный вызов');

    throttled.cancel();
  });

  register('Задание 7. Таймеры и асинхронность', 'createThrottle разрешает мгновенный вызов после паузы', async () => {
    const calls = [];
    const throttled = createThrottle((value) => calls.push(value), 50);

    throttled('первый');
    await sleep(90);
    throttled('второй');

    assertDeepEqual(calls, ['первый', 'второй'], 'после паузы вызов выполняется сразу');

    throttled.cancel();
  });

  register('Задание 7. Таймеры и асинхронность', 'startTimer не допускает двойного запуска', async () => {
    stopTimer();

    assertEqual(startTimer(), true, 'первый запуск должен пройти');
    assert(timerInterval !== null, 'интервал не создан');

    await sleep(1150);
    assertEqual(timerValue, 1, 'за 1,15 с должно пройти ровно 1 тиканье');

    assertEqual(startTimer(), false, 'повторный запуск должен быть запрещён');
    const singleInterval = timerInterval;

    await sleep(1150);
    assertEqual(timerInterval, singleInterval, 'интервал не должен пересоздаваться');
    assertEqual(timerValue, 2, 'при одном интервале за 2,3 с должно быть 2 тиканья');
  });

  register('Задание 7. Таймеры и асинхронность', 'stopTimer останавливает и сбрасывает значение', () => {
    const stoppedValue = stopTimer();

    assert(stoppedValue >= 1, 'stopTimer должен вернуть накопленное значение');
    assertEqual(timerInterval, null, 'интервал не очищен');
    assertEqual(timerValue, 0, 'timerValue не сброшен');
    assertEqual(el('#timer-output').textContent.trim(), '0', 'вывод таймера не сброшен');
  });

  register('Задание 7. Таймеры и асинхронность', 'повторный stopTimer безопасен (краевой случай)', () => {
    assertEqual(stopTimer(), false, 'повторная остановка должна вернуть false');
    assertEqual(timerValue, 0, 'значение должно остаться нулевым');
  });

  register('Задание 7. Таймеры и асинхронность', 'testDebounce и testThrottle пишут в #async-output', () => {
    testDebounce();
    assertIncludes(el('#async-output').textContent, 'DEBOUNCE', 'демонстрация debounce не запущена');

    testThrottle();
    assertIncludes(el('#async-output').textContent, 'THROTTLE', 'демонстрация throttle не запущена');
  });

  /* --------------------- Теория: фазы и отмена --------------------------- */

  register('Теория: фазы и отмена', 'порядок обработчиков: capturing → target → bubbling', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('button');
    outer.append(inner);
    document.body.append(outer);

    const order = [];
    outer.addEventListener('click', () => order.push('capture: outer'), true);
    inner.addEventListener('click', () => order.push('target: inner'));
    outer.addEventListener('click', () => order.push('bubble: outer'));

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    outer.remove();

    assertDeepEqual(order, ['capture: outer', 'target: inner', 'bubble: outer'],
      'нарушен порядок фаз события');
  });

  register('Теория: фазы и отмена', 'preventDefault не останавливает всплытие', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('button');
    outer.append(inner);
    document.body.append(outer);

    let parentCalls = 0;
    let defaultPrevented = false;

    inner.addEventListener('click', (event) => {
      event.preventDefault();
      defaultPrevented = event.defaultPrevented;
    });
    outer.addEventListener('click', () => { parentCalls += 1; });

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    outer.remove();

    assertEqual(defaultPrevented, true, 'defaultPrevented не установлен');
    assertEqual(parentCalls, 1, 'событие должно всплыть до родителя');
  });

  register('Теория: фазы и отмена', 'stopPropagation останавливает всплытие, но не отменяет действие', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('button');
    outer.append(inner);
    document.body.append(outer);

    let outerCalls = 0;
    let defaultPrevented = null;

    inner.addEventListener('click', (event) => {
      event.stopPropagation();
      defaultPrevented = event.defaultPrevented;
    });
    outer.addEventListener('click', () => { outerCalls += 1; });

    inner.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    outer.remove();

    assertEqual(outerCalls, 0, 'событие не должно всплывать');
    assertEqual(defaultPrevented, false, 'stopPropagation не отменяет стандартное действие');
  });

  register('Теория: фазы и отмена', 'event.target — источник, event.currentTarget — элемент с обработчиком', () => {
    const list = el('#item-list');
    const item = getFirstItem();
    const deleteButton = item.querySelector('.delete');

    let targetTag = null;
    let currentTargetTag = null;

    const spy = (event) => {
      targetTag = event.target.tagName;
      currentTargetTag = event.currentTarget.tagName;
    };

    list.addEventListener('click', spy);
    try {
      fireMouse(deleteButton, 'click');
    } finally {
      list.removeEventListener('click', spy);
    }

    assertEqual(targetTag, 'BUTTON', 'target должен указывать на кнопку удаления');
    assertEqual(currentTargetTag, 'UL', 'currentTarget должен указывать на список');
  });

  /* --------------------------- Публичный API ------------------------------ */

  function bindRunButton() {
    const button = el('#run-tests');
    if (button && !button.dataset.bound) {
      button.dataset.bound = 'true';
      button.addEventListener('click', runTests);
    }
  }

  window.runTests = runTests;
  window.testRegister = register;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindRunButton, { once: true });
  } else {
    bindRunButton();
  }
})();