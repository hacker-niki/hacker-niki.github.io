'use strict';

const featureButtons = [...document.querySelectorAll('[data-feature]')];
for (const button of featureButtons) {
  button.addEventListener('click', () => {
    for (const option of featureButtons) {
      const active = option === button;
      option.setAttribute('aria-pressed', String(active));
      document.getElementById(option.getAttribute('aria-controls')).hidden = !active;
    }
  });
}
document.querySelector('.feature-tabs').hidden = false;

const search = document.getElementById('search');
const cards = [...document.querySelectorAll('.card')];
const filters = [...document.querySelectorAll('[data-filter]')];
const normalize = (value) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
const entries = cards.map((card) => ({ card, text: normalize(card.textContent) }));
let category = 'Все';
function update() {
  const query = normalize(search.value);
  let count = 0;
  for (const { card, text } of entries) {
    card.hidden = (category !== 'Все' && category !== card.dataset.category) || !text.includes(query);
    if (!card.hidden) count++;
  }
  for (const filter of filters)
    filter.setAttribute('aria-pressed', String(filter.dataset.filter === category));
  document.getElementById('empty').hidden = count > 0;
  document.getElementById('status').textContent = 'Проектов найдено: ' + count;
}
for (const filter of filters)
  filter.addEventListener('click', () => {
    category = filter.dataset.filter;
    update();
  });
search.addEventListener('input', update);
document.getElementById('clear').addEventListener('click', () => {
  category = 'Все';
  search.value = '';
  update();
  search.focus();
});
document.querySelector('.tools').hidden = false;
document.querySelector('.search').hidden = false;
update();
