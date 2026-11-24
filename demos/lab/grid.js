'use strict';
const sizeControl = document.querySelector('#board-size');
const playerControl = document.querySelector('#players');
const turnText = document.querySelector('#turn');
const board = document.querySelector('#board');
const symbols = ['X', 'O', '△', '□'];
let cells = [],
  turn = 0,
  done = false;

function resetGame() {
  const size = Number(sizeControl.value);
  cells = Array(size * size).fill('');
  turn = 0;
  done = false;
  board.replaceChildren();
  board.style.setProperty('--side', size);
  for (let i = 0; i < cells.length; i++) {
    const cell = document.createElement('button');
    cell.setAttribute('aria-label', 'Строка ' + (Math.floor(i / size) + 1) + ', столбец ' + ((i % size) + 1));
    cell.addEventListener('click', () => move(i));
    board.append(cell);
  }
  announce();
}
function announce() {
  turnText.textContent = 'Ход игрока ' + (turn + 1) + ' · ' + symbols[turn];
}
function move(i) {
  if (done || cells[i]) return;
  const n = Number(sizeControl.value),
    row = Math.floor(i / n),
    col = i % n;
  const symbol = symbols[turn];
  cells[i] = symbol;
  const button = board.children[i];
  button.textContent = symbol;
  button.dataset.symbol = symbol;
  button.setAttribute('aria-label', button.getAttribute('aria-label') + ': ' + symbol);
  const ids = Array.from({ length: n }, (_, k) => k);
  const lines = [
    ids.map((k) => row * n + k),
    ids.map((k) => k * n + col),
    ids.map((k) => k * n + k),
    ids.map((k) => k * n + n - 1 - k),
  ];
  const win = lines.find((line) => line.every((k) => cells[k] === symbol));
  if (win) {
    done = true;
    win.forEach((k) => board.children[k].classList.add('win'));
    turnText.textContent = 'Победил игрок ' + (turn + 1) + ' · ' + symbol;
  } else if (cells.every(Boolean)) {
    done = true;
    turnText.textContent = 'Ничья';
  } else {
    turn = (turn + 1) % Number(playerControl.value);
    announce();
  }
}
sizeControl.addEventListener('change', resetGame);
playerControl.addEventListener('change', resetGame);
document.querySelector('#reset-game').addEventListener('click', resetGame);
resetGame();
