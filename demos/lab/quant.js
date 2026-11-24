'use strict';
const input = document.querySelector('#phrase');
const historyBox = document.querySelector('#history');
const voice = document.querySelector('#voice');
const keywords = {
  hello: ['привет', 'ку', 'хэй', 'салам', 'шалом', 'hello'],
  time: ['время', 'час', 'time'],
  repeat: ['повтори', 'скажи', 'say'],
  coin: ['монетка', 'монетку', 'подбрось', 'coin'],
  help: ['возможности', 'функции', 'команды', 'functions'],
};
function addLine(speaker, text, kind) {
  const line = document.createElement('p');
  line.className = kind;
  const who = document.createElement('b');
  who.textContent = speaker;
  line.append(who, document.createTextNode(' ' + text));
  historyBox.append(line);
  if (historyBox.children.length > 30) historyBox.firstElementChild.remove();
  historyBox.scrollTop = historyBox.scrollHeight;
}
function answer(phrase) {
  const words = phrase.toLocaleLowerCase('ru').match(/[а-яёa-z]+/gu) || [];
  for (const word of words) {
    const match = Object.entries(keywords).find(([, variants]) => variants.includes(word));
    if (!match) continue;
    switch (match[0]) {
      case 'hello':
        return 'Привет! Чем займёмся?';
      case 'time':
        return (
          'По местному времени ' +
          new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(new Date()) +
          '.'
        );
      case 'coin':
        return 'Выпадает ' + (crypto.getRandomValues(new Uint8Array(1))[0] % 2 ? 'орёл.' : 'решка.');
      case 'repeat':
        return (
          phrase.slice(phrase.toLocaleLowerCase('ru').indexOf(word) + word.length).replace(/^[\s,:—]+/, '') ||
          'Какую фразу повторить?'
        );
      case 'help':
        return 'Я могу назвать время, подбросить монетку, повторить фразу или поздороваться.';
    }
  }
  return 'Не узнал команду. Спроси «время» или нажми на пример.';
}
function send(phrase) {
  if (!phrase.trim()) return;
  const reply = answer(phrase.trim());
  addLine('Вы', phrase.trim(), 'user');
  addLine('Квант', reply, 'reply');
  if (voice.checked && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(reply);
    utterance.lang = 'ru-RU';
    speechSynthesis.speak(utterance);
  }
}
document.querySelector('#prompt').addEventListener('submit', (event) => {
  event.preventDefault();
  send(input.value);
  input.value = '';
});
document
  .querySelectorAll('[data-command]')
  .forEach((button) => button.addEventListener('click', () => send(button.dataset.command)));
if (!('speechSynthesis' in window)) document.querySelector('#sound-option').hidden = true;
else
  voice.addEventListener('change', () => {
    if (!voice.checked) speechSynthesis.cancel();
  });
