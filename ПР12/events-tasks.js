'use strict';

/* ============================================================================
 * Практическая работа №12. JavaScript: обработка событий
 * events-tasks.js — обработчики событий и их подключение к DOM.
 * ==========================================================================*/

/* ------------------------------ Константы -------------------------------- */

const COLOR_BOX_DEFAULT = '#3498db';
const COLOR_BOX_ACTIVE = '#e74c3c';
const PULSE_DURATION = 500;
const ANIMATION_DURATION = 500;
const TIMER_STEP = 1000;
const IMAGE_URL = 'https://picsum.photos/300/200';
const IMAGE_ERROR_URL = 'https://this-host-does-not-exist.example/missing-image.jpg';
const IMAGE_TIMEOUT = 10000;
const CUSTOM_EVENT_NAME = 'customAction';
const MULTI_EVENT_NAME = 'multiAction';
const MULTI_LISTENER_COUNT = 3;

/* ------------------------------- Утилиты --------------------------------- */

// Таймеры анимаций: элемент → (класс анимации → id таймера).
// WeakMap не держит ссылку на удалённые из DOM элементы.
const animationTimers = new WeakMap();

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (char) => map[char]);
}

function writeText(id, text) {
  const node = byId(id);
  if (node) node.textContent = text;
  return node;
}

function writeHtml(id, html) {
  const node = byId(id);
  if (node) node.innerHTML = html;
  return node;
}

// Перезапуск CSS-анимации: снять класс → принудительный reflow → навесить класс снова.
function restartAnimation(element, className, duration = ANIMATION_DURATION) {
  if (!element) return null;

  let timers = animationTimers.get(element);
  if (!timers) {
    timers = new Map();
    animationTimers.set(element, timers);
  }

  const previousTimer = timers.get(className);
  if (previousTimer) clearTimeout(previousTimer);

  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);

  const timerId = setTimeout(() => {
    element.classList.remove(className);
    timers.delete(className);
  }, duration);

  timers.set(className, timerId);
  return timerId;
}

/* ==========================================================================
   ЗАДАНИЕ 1. Базовые обработчики событий
   ========================================================================== */

function describeElement(element) {
  if (!(element instanceof Element)) return String(element);
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = typeof element.className === 'string' && element.className.trim()
    ? `.${element.className.trim().split(/\s+/).join('.')}`
    : '';
  return `<${tag}${id}${classes}>`;
}

// 1.1. Клик по кнопке: информация о событии + короткая анимация.
function handleBasicClick(event) {
  const button = event.currentTarget || event.target;
  const target = event.target;

  const lines = [
    `Тип события: ${event.type}`,
    `Координаты внутри окна (clientX / clientY): ${Math.round(event.clientX)} / ${Math.round(event.clientY)}`,
    `Координаты внутри документа (pageX / pageY): ${Math.round(event.pageX)} / ${Math.round(event.pageY)}`,
    `Target (источник события): ${describeElement(target)}`,
    `currentTarget (элемент с обработчиком): ${describeElement(event.currentTarget)}`,
    `Кнопка мыши: ${event.button}, число кликов (detail): ${event.detail}`,
    `Отменяемое событие (cancelable): ${event.cancelable}`,
    `Доверенное событие (isTrusted): ${event.isTrusted}`
  ];

  writeHtml('basic-output', lines.map((line) => `<div class="log-line">${escapeHtml(line)}</div>`).join(''));

  const clicks = Number(button.dataset.clicks || 0) + 1;
  button.dataset.clicks = String(clicks);
  const counter = document.createElement('div');
  counter.className = 'log-line log-muted';
  counter.textContent = `Всего кликов по кнопке: ${clicks}`;
  const output = byId('basic-output');
  if (output) output.append(counter);

  restartAnimation(button, 'pulse', PULSE_DURATION);
}

// 1.2. Мышь на цветном блоке: mouseenter / mouseleave / mousemove.
function handleMouseEvents(event) {
  const box = event.currentTarget;

  if (!box) return;

  switch (event.type) {
    case 'mouseenter': {
      box.style.backgroundColor = COLOR_BOX_ACTIVE;
      writeText('mouse-output', 'mouseenter: курсор вошёл в блок, фон изменён на #e74c3c.');
      break;
    }
    case 'mouseleave': {
      box.style.backgroundColor = COLOR_BOX_DEFAULT;
      writeText('mouse-output', 'mouseleave: курсор покинул блок, фон возвращён на #3498db.');
      break;
    }
    case 'mousemove': {
      // Координаты внутри самого блока получаем из clientX/clientY и getBoundingClientRect().
      const rect = box.getBoundingClientRect();
      const innerX = Math.round(event.clientX - rect.left);
      const innerY = Math.round(event.clientY - rect.top);
      writeText(
        'mouse-output',
        `mousemove: X = ${innerX}, Y = ${innerY} (внутри блока); ` +
        `clientX = ${Math.round(event.clientX)}, clientY = ${Math.round(event.clientY)}; ` +
        `смещение курсора: ${Math.round(event.movementX)}, ${Math.round(event.movementY)}`
      );
      break;
    }
    default:
      break;
  }
}

// 1.3. Подключение обработчиков задачи 1.
function setupBasicEvents() {
  const button = byId('basic-btn');
  const box = byId('color-box');

  if (button) {
    button.addEventListener('click', handleBasicClick);
  }

  if (box) {
    // mouseenter / mouseleave не всплывают, поэтому вешаем их прямо на блок.
    box.addEventListener('mouseenter', handleMouseEvents);
    box.addEventListener('mouseleave', handleMouseEvents);
    box.addEventListener('mousemove', handleMouseEvents);
  }
}

/* ==========================================================================
   ЗАДАНИЕ 2. События клавиатуры
   ========================================================================== */

// Комбинации, для которых отменяем стандартное поведение браузера.
const KEY_COMBOS = {
  'ctrl+s': 'Ctrl + S — стандартное сохранение страницы отменено',
  'alt+c': 'Alt + C — стандартное действие отменено',
  'shift+a': 'Shift + A — стандартное действие отменено'
};

const MODIFIER_KEYS = ['control', 'alt', 'shift', 'meta'];

function normalizeKeyCombo(event) {
  const parts = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  const key = String(event.key || '').toLowerCase();
  if (key && !MODIFIER_KEYS.includes(key)) parts.push(key);
  return parts.join('+');
}

function formatKeyCombo(event) {
  const parts = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  if (event.metaKey) parts.push('Meta');
  const key = String(event.key || '');
  if (key && !MODIFIER_KEYS.includes(key.toLowerCase())) {
    parts.push(key.length === 1 ? key.toUpperCase() : key);
  }
  return parts.join(' + ') || '—';
}

// 2.1. keydown: информация о клавише и перехват комбинаций.
function handleKeyEvents(event) {
  const input = event.currentTarget;
  const combo = normalizeKeyCombo(event);
  const specialMessage = KEY_COMBOS[combo];

  if (specialMessage) {
    // Отменяем только то, для чего это действительно нужно.
    event.preventDefault();
  }

  if (input) input.classList.add('key-pressed');

  const lines = [
    `key: "${event.key}"`,
    `code: "${event.code}"`,
    `ctrlKey: ${event.ctrlKey} | altKey: ${event.altKey} | shiftKey: ${event.shiftKey} | metaKey: ${event.metaKey}`,
    `Комбинация: ${formatKeyCombo(event)}`,
    `repeat: ${event.repeat} | location: ${event.location}`
  ];

  if (specialMessage) {
    lines.push(`⛔ ${specialMessage} (вызван event.preventDefault(), event.defaultPrevented = ${event.defaultPrevented})`);
  } else if (event.cancelable) {
    lines.push('Стандартное поведение не отменялось.');
  }

  writeHtml('key-output', lines.map((line) => `<div class="log-line">${escapeHtml(line)}</div>`).join(''));
}

// Сброс состояния по keyup.
function handleKeyUp(event) {
  if (event.currentTarget) event.currentTarget.classList.remove('key-pressed');

  const output = byId('key-output');
  if (!output) return;

  const line = document.createElement('div');
  line.className = 'log-line log-muted';
  line.textContent = `keyup: клавиша "${event.key}" отпущена — состояние сброшено`;
  output.append(line);
}

// 2.2. Подключение обработчиков клавиатуры.
function setupKeyboardEvents() {
  const input = byId('key-input');
  if (!input) return;

  input.addEventListener('keydown', handleKeyEvents);
  input.addEventListener('keyup', handleKeyUp);

  // Если фокус ушёл из поля, класс подсветки не должен «залипать».
  input.addEventListener('blur', () => input.classList.remove('key-pressed'));
}

/* ==========================================================================
   ЗАДАНИЕ 3. Делегирование событий
   ========================================================================== */

function getItemList() {
  return byId('item-list');
}

function getNextItemId(list) {
  const ids = Array.from(list.querySelectorAll('.item'))
    .map((item) => Number(item.dataset.id))
    .filter((id) => Number.isFinite(id));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function updateDelegationOutput(message) {
  const output = byId('delegation-output');
  if (!output) return;

  const list = getItemList();
  const items = list ? Array.from(list.querySelectorAll('.item')) : [];
  const selected = items.filter((item) => item.classList.contains('selected'));
  const selectedIds = selected.map((item) => item.dataset.id).join(', ');

  const summary = `Элементов в списке: ${items.length}. Выбрано: ${selected.length}` +
    (selected.length ? ` (data-id: ${selectedIds})` : '') + '.';

  const messageHtml = message ? `<div class="log-line">${escapeHtml(message)}</div>` : '';
  output.innerHTML = messageHtml + `<div class="log-line log-muted">${escapeHtml(summary)}</div>`;
}

// 3.1. Один обработчик на весь список вместо обработчиков на каждом элементе.
function handleDelegationClick(event) {
  const list = event.currentTarget;
  const target = event.target;

  if (!(target instanceof Element) || !list || !list.contains(target)) return;

  // Сначала проверяем удаление: кнопка .delete лежит внутри .item.
  const deleteButton = target.closest('.delete');
  if (deleteButton) {
    const item = deleteButton.closest('.item');
    if (item) {
      const id = item.dataset.id;
      item.remove();
      updateDelegationOutput(`Удалён элемент с data-id = ${id}.`);
    }
    return;
  }

  const item = target.closest('.item');
  if (item) {
    const isSelected = item.classList.toggle('selected');
    updateDelegationOutput(
      isSelected
        ? `Выбран элемент с data-id = ${item.dataset.id}.`
        : `Снято выделение с элемента data-id = ${item.dataset.id}.`
    );
    return;
  }

  updateDelegationOutput('Клик по пустому месту списка — элементов не затронуто.');
}

// 3.2. Добавление элемента с уникальным data-id.
function addNewItem() {
  const list = getItemList();
  if (!list) return null;

  const id = getNextItemId(list);

  const item = document.createElement('li');
  item.className = 'item';
  item.dataset.id = String(id);

  const title = document.createElement('span');
  title.className = 'item-title';
  title.textContent = `Элемент ${id}`;

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete';
  deleteButton.setAttribute('aria-label', 'Удалить элемент');
  deleteButton.textContent = '×';

  item.append(title, deleteButton);
  list.append(item);

  updateDelegationOutput(`Добавлен элемент с data-id = ${id}.`);
  return item;
}

// 3.3. Подключение делегирования.
function setupDelegationEvents() {
  const list = getItemList();
  const addButton = byId('add-item-btn');

  if (list) list.addEventListener('click', handleDelegationClick);
  // Важно: новый элемент не требует переподключения обработчика.
  if (addButton) addButton.addEventListener('click', () => addNewItem());
}

/* ==========================================================================
   ЗАДАНИЕ 4. Предотвращение стандартного поведения
   ========================================================================== */

// 4.1. Отмена перехода по ссылке.
function preventLinkDefault(event) {
  event.preventDefault();

  const link = event.currentTarget;
  const href = link ? link.getAttribute('href') : '';

  writeHtml(
    'prevention-output',
    `<div class="log-line">Переход по ссылке заблокирован вызовом <code>preventDefault()</code>.</div>` +
    `<div class="log-line log-muted">Адрес, по которому браузер не перешёл: ${escapeHtml(href)}</div>` +
    `<div class="log-line log-muted">event.defaultPrevented = ${event.defaultPrevented}</div>`
  );

  restartAnimation(link, 'shake', 420);
}

// 4.2. Отмена отправки формы + валидация поля.
function preventFormSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const output = byId('prevention-output');
  if (!form || !output) return;

  const input = form.querySelector('input[name="userText"]') || form.querySelector('input');
  const value = input ? input.value.trim() : '';

  if (!value) {
    if (input) {
      input.classList.add('invalid');
      input.focus();
    }
    output.innerHTML =
      '<div class="log-line log-error">Форма не отправлена: поле не должно быть пустым.</div>' +
      '<div class="log-line log-muted">Отправка отменена через event.preventDefault(), страница не перезагружена.</div>';
    return;
  }

  if (input) input.classList.remove('invalid');

  const formData = new FormData(form);
  const fields = [];
  formData.forEach((fieldValue, fieldName) => {
    fields.push(`${fieldName}: "${String(fieldValue)}"`);
  });

  output.innerHTML =
    '<div class="log-line log-success">Отправка формы перехвачена — страница не перезагружена.</div>' +
    `<div class="log-line">${escapeHtml(fields.join('; '))}</div>` +
    `<div class="log-line log-muted">Метод формы: ${escapeHtml(form.method || 'get')}, длина значения: ${value.length} симв.</div>`;
}

// 4.3. Подключение обработчиков предотвращения.
function setupPreventionEvents() {
  const link = byId('prevent-link');
  const form = byId('prevent-form');

  if (link) link.addEventListener('click', preventLinkDefault);
  if (form) form.addEventListener('submit', preventFormSubmit);
}

/* ==========================================================================
   ЗАДАНИЕ 5. Кастомные события
   ========================================================================== */

const CUSTOM_EVENT_DETAIL = { message: 'Привет от кастомного события!' };

let customEventCount = 0;

// 5.1. Создание и отправка кастомного события.
function triggerCustomEvent() {
  const customEvent = new CustomEvent(CUSTOM_EVENT_NAME, {
    detail: {
      message: CUSTOM_EVENT_DETAIL.message,
      timestamp: Date.now(),
      source: 'triggerCustomEvent'
    },
    bubbles: true,
    cancelable: true
  });

  document.dispatchEvent(customEvent);
  return customEvent;
}

// 5.2. Обработчик кастомного события: данные лежат в event.detail.
function handleCustomEvent(event) {
  const detail = event.detail || {};
  customEventCount += 1;

  writeHtml(
    'custom-output',
    `<div class="log-line log-success">Событие «${escapeHtml(event.type)}» получено (${customEventCount}-й раз).</div>` +
    `<div class="log-line">detail.message: ${escapeHtml(detail.message || '(нет данных)')}</div>` +
    `<div class="log-line log-muted">bubbles: ${event.bubbles}, cancelable: ${event.cancelable}, ` +
    `isTrusted: ${event.isTrusted}, timestamp: ${escapeHtml(detail.timestamp || '—')}</div>`
  );

  restartAnimation(byId('trigger-custom'), 'pulse', PULSE_DURATION);
}

/* --- 5.3. Три независимых обработчика одного кастомного события ---------- */

const multiMessages = [];
let multiListenersAttached = false;

function reportMultiListener(index, text) {
  multiMessages.push(`Слушатель №${index}: ${text}`);

  const output = byId('custom-output');
  if (!output) return;

  const items = multiMessages
    .slice(-MULTI_LISTENER_COUNT)
    .map((message) => `<div class="log-line">${escapeHtml(message)}</div>`)
    .join('');

  const header = `<div class="log-line log-success">Событие «${MULTI_EVENT_NAME}»: ` +
    `${MULTI_LISTENER_COUNT} обработчика получили одно и то же событие.</div>`;

  output.innerHTML = header + items;
}

function handleMultiListenerOne(event) {
  reportMultiListener(1, `получил detail.ping = "${event.detail.ping}"`);
}

function handleMultiListenerTwo(event) {
  reportMultiListener(2, `видит тип «${event.type}», target = ${describeElement(event.target)}`);
}

function handleMultiListenerThree() {
  reportMultiListener(3, 'работает независимо: свой код, своё сообщение');
}

// Подключаем три обработчика один раз, затем отправляем событие.
function setupMultipleListeners() {
  if (!multiListenersAttached) {
    document.addEventListener(MULTI_EVENT_NAME, handleMultiListenerOne);
    document.addEventListener(MULTI_EVENT_NAME, handleMultiListenerTwo);
    document.addEventListener(MULTI_EVENT_NAME, handleMultiListenerThree);
    multiListenersAttached = true;
  }

  multiMessages.length = 0;

  document.dispatchEvent(new CustomEvent(MULTI_EVENT_NAME, {
    detail: { ping: 'проверка трёх слушателей', time: Date.now() }
  }));

  restartAnimation(byId('multiple-listeners'), 'pulse', PULSE_DURATION);
}

// 5.4. Подключение кастомных событий.
function setupCustomEvents() {
  document.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);

  const triggerButton = byId('trigger-custom');
  const multiButton = byId('multiple-listeners');

  if (triggerButton) triggerButton.addEventListener('click', () => triggerCustomEvent());
  if (multiButton) multiButton.addEventListener('click', setupMultipleListeners);
}

/* ==========================================================================
   ЗАДАНИЕ 6. События загрузки и ошибок
   ========================================================================== */

function resetLoadingOutput(state = 'loading') {
  const output = byId('loading-output');
  if (output) {
    output.replaceChildren();
    output.dataset.state = state;
  }
  return output;
}

function logLoading(text, extraClass = '') {
  const output = byId('loading-output');
  if (!output) return;
  const line = document.createElement('div');
  line.className = `log-line${extraClass ? ` ${extraClass}` : ''}`;
  line.textContent = text;
  output.append(line);
}

function showImageErrorPlaceholder(container, url) {
  if (!container) return;
  const box = document.createElement('div');
  box.className = 'image-error';
  box.textContent = `Не удалось загрузить изображение: ${url}`;
  container.append(box);
}

// 6.1. Загрузка изображения с обработкой load / error / loadstart / loadend.
function loadImageWithEvents(url = IMAGE_URL) {
  const output = resetLoadingOutput('loading');
  const container = byId('image-container');
  if (!output || !container) return null;

  container.replaceChildren();

  const image = document.createElement('img');
  image.className = 'loaded-image';
  image.alt = 'Случайное изображение 300×200';

  image.addEventListener('loadstart', () => {
    logLoading('loadstart — загрузка ресурса началась');
  });

  image.addEventListener('load', () => {
    output.dataset.state = 'success';
    const size = image.naturalWidth && image.naturalHeight
      ? `${image.naturalWidth}×${image.naturalHeight} px`
      : 'размер ещё не определён';
    logLoading(`load — изображение успешно загружено (${size})`, 'log-success');
    image.dispatchEvent(new Event('loadend'));
  });

  image.addEventListener('error', () => {
    output.dataset.state = 'error';
    logLoading('error — изображение не загрузилось, показано сообщение об ошибке', 'log-error');
    image.remove();
    showImageErrorPlaceholder(container, url);
  });

  image.addEventListener('loadend', () => {
    logLoading('loadend — загрузка завершена (успешно или с ошибкой)', 'log-muted');
  });

  container.append(image);
  image.src = url;

  // Браузер не генерирует loadstart/loadend для <img>, поэтому loadstart
  // отправляем вручную, а loadend — из обработчика load.
  image.dispatchEvent(new Event('loadstart'));

  return image;
}

// 6.2. Загрузка несуществующего изображения с обработкой ошибки и таймаутом.
function simulateLoadError(url = IMAGE_ERROR_URL) {
  const output = resetLoadingOutput('loading');
  const container = byId('image-container');
  if (!output || !container) return null;

  container.replaceChildren();
  logLoading(`Попытка загрузить недоступный ресурс: ${url}`);

  const image = document.createElement('img');
  image.className = 'loaded-image';
  image.alt = 'Изображение, которое не удалось загрузить';

  // Страховка: если сеть «зависла» и error не пришёл, сообщаем об этом сами.
  const timeoutId = setTimeout(() => {
    output.dataset.state = 'error';
    logLoading(`timeout — за ${IMAGE_TIMEOUT / 1000} с ответ не получен, считаем загрузку неудачной`, 'log-error');
    image.remove();
    showImageErrorPlaceholder(container, url);
  }, IMAGE_TIMEOUT);

  image.addEventListener('error', () => {
    clearTimeout(timeoutId);
    output.dataset.state = 'error';
    logLoading('error — событие ошибки получено, исключение не «всплыло» в консоль', 'log-error');
    image.remove();
    showImageErrorPlaceholder(container, url);
  }, { once: true });

  container.append(image);
  image.src = url;
  return image;
}

// 6.3. Подключение обработчиков загрузки.
function setupLoadingEvents() {
  const loadButton = byId('load-image');
  const errorButton = byId('load-error');

  if (loadButton) loadButton.addEventListener('click', () => loadImageWithEvents());
  if (errorButton) errorButton.addEventListener('click', () => simulateLoadError());
}

/* ==========================================================================
   ЗАДАНИЕ 7. Таймеры и асинхронные события
   ========================================================================== */

let timerInterval = null;
let timerValue = 0;

function renderTimer() {
  const output = byId('timer-output');
  if (output) output.textContent = String(timerValue);
}

// 7.1. Запуск секундомера с защитой от повторного запуска.
function startTimer() {
  const output = byId('timer-output');

  if (timerInterval !== null) {
    if (output) output.dataset.state = 'running';
    return false;
  }

  timerInterval = setInterval(() => {
    timerValue += 1;
    renderTimer();
  }, TIMER_STEP);

  if (output) output.dataset.state = 'running';
  renderTimer();
  return true;
}

// 7.2. Остановка и сброс.
function stopTimer() {
  const output = byId('timer-output');

  if (timerInterval === null) {
    if (output) output.dataset.state = 'stopped';
    return false;
  }

  clearInterval(timerInterval);
  timerInterval = null;

  const stoppedAt = timerValue;
  timerValue = 0;
  renderTimer();

  if (output) {
    output.dataset.state = 'stopped';
    output.dataset.lastValue = String(stoppedAt);
  }

  return stoppedAt;
}

// 7.3. Debounce: вызов откладывается до паузы в delay миллисекунд.
function createDebounce(func, delay) {
  if (typeof func !== 'function') {
    throw new TypeError('createDebounce: первым аргументом должна быть функция');
  }

  const wait = Math.max(0, Number(delay) || 0);
  let timerId = null;

  function debounced(...args) {
    if (timerId !== null) clearTimeout(timerId);

    timerId = setTimeout(() => {
      timerId = null;
      func.apply(this, args);
    }, wait);
  }

  debounced.cancel = function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  debounced.pending = function pending() {
    return timerId !== null;
  };

  return debounced;
}

// 7.4. Throttle: не чаще одного вызова за interval (leading + trailing).
function createThrottle(func, interval) {
  if (typeof func !== 'function') {
    throw new TypeError('createThrottle: первым аргументом должна быть функция');
  }

  const wait = Math.max(0, Number(interval) || 0);
  let lastCallTime = 0;
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;

  function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - lastCallTime);

    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastCallTime = now;
      func.apply(this, args);
      return;
    }

    // Вызов пришёл внутри интервала: запоминаем его и выполним в конце окна.
    if (timerId === null) {
      timerId = setTimeout(() => {
        timerId = null;
        lastCallTime = Date.now();
        func.apply(lastThis, lastArgs);
      }, remaining);
    }
  }

  throttled.cancel = function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastCallTime = 0;
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/* --- Демонстрации debounce и throttle ----------------------------------- */

let debounceDemoTimer = null;
let throttleDemoTimer = null;

function prepareAsyncOutput(title) {
  const output = byId('async-output');
  if (!output) return null;

  // Новая демонстрация останавливает предыдущую, чтобы журналы не смешивались.
  if (debounceDemoTimer !== null) {
    clearInterval(debounceDemoTimer);
    debounceDemoTimer = null;
  }
  if (throttleDemoTimer !== null) {
    clearInterval(throttleDemoTimer);
    throttleDemoTimer = null;
  }

  const lines = [];
  output.dataset.demo = title;
  const log = (text) => {
    lines.push(text);
    output.textContent = lines.join('\n');
    output.scrollTop = output.scrollHeight;
  };

  return { output, log };
}

// 7.5. Наглядная разница: обычная функция против debounce.
function testDebounce() {
  const context = prepareAsyncOutput('debounce');
  if (!context) return;

  const { log } = context;

  if (debounceDemoTimer !== null) {
    clearInterval(debounceDemoTimer);
    debounceDemoTimer = null;
  }

  log('DEBOUNCE, задержка 400 мс: серия из 5 быстрых вызовов с шагом 100 мс');
  log('Обычная функция срабатывает на каждый вызов, debounce — один раз после паузы.');
  log('');

  let normalCalls = 0;

  const debounced = createDebounce((payload) => {
    log(`[debounce] ▶ обработчик выполнился 1 раз, аргумент последнего вызова: "${payload}"`);
    log(`[итог] обычных вызовов: ${normalCalls}, выполнений debounce: 1`);
  }, 400);

  let attempt = 0;
  debounceDemoTimer = setInterval(() => {
    attempt += 1;
    normalCalls += 1;
    log(`[${attempt}/5] вызов → обычная функция выполнилась сразу (всего: ${normalCalls}), debounce-вызов отложен`);
    debounced(`вызов №${attempt}`);

    if (attempt >= 5) {
      clearInterval(debounceDemoTimer);
      debounceDemoTimer = null;
      log('Серия закончилась. Ждём 400 мс тишины…');
    }
  }, 100);
}

// 7.6. Наглядная разница: обычная функция против throttle.
function testThrottle() {
  const context = prepareAsyncOutput('throttle');
  if (!context) return;

  const { log } = context;

  if (throttleDemoTimer !== null) {
    clearInterval(throttleDemoTimer);
    throttleDemoTimer = null;
  }

  log('THROTTLE, интервал 400 мс: серия из 8 быстрых кликов с шагом 80 мс');
  log('Обработчик выполняется не чаще одного раза в 400 мс, последний вызов не теряется.');
  log('');

  const startedAt = Date.now();

  const throttled = createThrottle((payload) => {
    const elapsed = Date.now() - startedAt;
    log(`[throttle] ▶ обработчик выполнился для вызова №${payload} (t = ${elapsed} мс)`);
  }, 400);

  let click = 0;
  throttleDemoTimer = setInterval(() => {
    click += 1;
    log(`[клик ${click}] → throttle(${click})`);
    throttled(click);

    if (click >= 8) {
      clearInterval(throttleDemoTimer);
      throttleDemoTimer = null;
      log('Серия кликов завершена, отложенный вызов выполнится в конце окна.');
    }
  }, 80);
}

// 7.7. Подключение таймеров и демонстраций.
function setupTimerEvents() {
  const startButton = byId('start-timer');
  const stopButton = byId('stop-timer');
  const debounceButton = byId('debounce-btn');
  const throttleButton = byId('throttle-btn');

  if (startButton) startButton.addEventListener('click', () => startTimer());
  if (stopButton) stopButton.addEventListener('click', () => stopTimer());
  if (debounceButton) debounceButton.addEventListener('click', () => testDebounce());
  if (throttleButton) throttleButton.addEventListener('click', () => testThrottle());
}

/* ==========================================================================
   Инициализация
   ========================================================================== */

let eventsInitialized = false;

function initEvents() {
  if (eventsInitialized) return;

  setupBasicEvents();
  setupKeyboardEvents();
  setupDelegationEvents();
  setupPreventionEvents();
  setupCustomEvents();
  setupLoadingEvents();
  setupTimerEvents();

  eventsInitialized = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEvents, { once: true });
} else {
  initEvents();
}