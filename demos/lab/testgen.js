'use strict';

const samples = {
  sql: [
    'SELECT — Получает данные из таблицы',
    'WHERE — Оставляет строки, подходящие под условие',
    'JOIN — Соединяет строки разных таблиц',
    'GROUP BY — Объединяет строки в группы',
    'ORDER BY — Задаёт порядок строк в результате',
  ],
  audio: [
    'Амплитуда — Величина колебания сигнала',
    'Герц — Единица измерения частоты',
    'Тембр — Окраска звука',
    'Децибел — Логарифмическая единица отношения уровней',
  ],
};
const el = (id) => document.getElementById(id);
let quiz = [],
  guesses = [],
  index = 0;

function chooseTopic() {
  el('terms').value = samples[el('topic').value].join('\n');
  el('issue').textContent = '';
}
function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function show(id) {
  for (const panel of ['editor', 'quiz', 'score']) el(panel).hidden = panel !== id;
}
function build() {
  const rows = el('terms')
    .value.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const pairs = rows.map((row) => row.match(/^(.+?)\s+[—–-]\s+(.+)$/u));
  const error = (message) => {
    el('issue').textContent = message;
  };
  if (rows.length < 3 || rows.length > 12) return error('Добавь от 3 до 12 пар.');
  if (pairs.some((pair) => !pair))
    return error('Раздели термин и определение тире с пробелами на каждой строке.');
  const bank = pairs.map(([, term, definition]) => ({ term: term.trim(), definition: definition.trim() }));
  const unique = (field) => new Set(bank.map((item) => item[field].toLocaleLowerCase('ru'))).size;
  if (unique('term') !== bank.length || unique('definition') !== bank.length)
    return error('У каждого термина должно быть своё определение. Убери повторы.');
  el('issue').textContent = '';
  quiz = shuffle(bank).map((item) => {
    const alternatives = shuffle(bank.filter((other) => other !== item)).slice(0, 3);
    return { ...item, choices: shuffle([item, ...alternatives]).map((other) => other.term) };
  });
  index = 0;
  guesses = [];
  show('quiz');
  render();
}
function render() {
  const current = quiz[index];
  el('progress').textContent = 'Вопрос ' + (index + 1) + ' из ' + quiz.length;
  el('question').textContent = current.definition;
  el('question').tabIndex = -1;
  el('question').focus();
  el('answers')
    .querySelectorAll('label')
    .forEach((label) => label.remove());
  for (const term of current.choices) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'answer';
    radio.value = term;
    radio.addEventListener('change', () => {
      el('next').disabled = false;
    });
    label.append(radio, ' ' + term);
    el('answers').append(label);
  }
  el('next').disabled = true;
  el('next').textContent = index + 1 === quiz.length ? 'Посмотреть результат' : 'Далее';
}
function next() {
  const selected = el('answers').querySelector('input:checked');
  if (!selected) return;
  guesses.push(selected.value);
  if (++index < quiz.length) return render();
  const correct = quiz.filter((item, i) => guesses[i] === item.term).length;
  el('points').textContent =
    correct + ' из ' + quiz.length + ' · ' + Math.round((100 * correct) / quiz.length) + '%';
  el('review').replaceChildren();
  quiz.forEach((item, i) => {
    const line = document.createElement('li');
    line.textContent =
      item.definition + ' — ' + item.term + (guesses[i] === item.term ? ' ✓' : '. Твой ответ: ' + guesses[i]);
    el('review').append(line);
  });
  show('score');
  el('points').tabIndex = -1;
  el('points').focus();
}
function exportMoodle() {
  const doc = document.implementation.createDocument('', 'quiz', null);
  function add(parent, name, value) {
    const child = doc.createElement(name);
    if (value !== undefined) child.textContent = value;
    parent.appendChild(child);
    return child;
  }
  for (const item of quiz) {
    const question = add(doc.documentElement, 'question');
    question.setAttribute('type', 'multichoice');
    add(add(question, 'name'), 'text', item.term);
    const body = add(question, 'questiontext');
    body.setAttribute('format', 'plain_text');
    add(body, 'text', item.definition);
    add(question, 'single', 'true');
    add(question, 'shuffleanswers', '1');
    add(question, 'answernumbering', 'abc');
    for (const term of item.choices) {
      const answer = add(question, 'answer');
      answer.setAttribute('fraction', term === item.term ? '100' : '0');
      answer.setAttribute('format', 'plain_text');
      add(answer, 'text', term);
    }
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(doc);
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml;charset=utf-8' }));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'testgen-moodle.xml';
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
el('topic').addEventListener('change', chooseTopic);
el('build').addEventListener('click', build);
el('again').addEventListener('click', build);
for (const id of ['change', 'edit'])
  el(id).addEventListener('click', () => {
    show('editor');
    el('terms').focus();
  });
el('next').addEventListener('click', next);
el('export').addEventListener('click', exportMoodle);
chooseTopic();
