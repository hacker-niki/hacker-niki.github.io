'use strict';

const boxCanvas = document.querySelector('#box-view');
const boxInputs = ['length', 'width', 'height', 'angle'].map((key) => document.querySelector('#box-' + key));
const boxFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 6 });

function boxVolume(length, width, height) {
  const cm3 = length * width * height;
  return { litres: cm3 / 1000, metres: cm3 / 1000000 };
}

function drawBox(length, width, height, degrees) {
  const bounds = boxCanvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const dpi = Math.min(window.devicePixelRatio || 1, 3);
  boxCanvas.width = Math.round(bounds.width * dpi);
  boxCanvas.height = Math.round(bounds.height * dpi);
  const ctx = boxCanvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle),
    sin = Math.sin(angle);
  const tilt = 0.42;
  const minX = -width * sin;
  const maxX = length * cos;
  const maxY = (length * sin + width * cos) * tilt;
  const scale = Math.min((bounds.width - 96) / (maxX - minX), (bounds.height - 72) / (maxY + height));
  const originX = (bounds.width - (maxX + minX) * scale) / 2;
  const originY = (bounds.height - (maxY - height) * scale) / 2;
  function project(x, z, y) {
    return [originX + (x * cos - z * sin) * scale, originY + ((x * sin + z * cos) * tilt - y) * scale];
  }
  function polygon(points, fill, outline) {
    ctx.beginPath();
    points.forEach(([x, y], index) => (index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#30414e';
  for (let x = 10; x < bounds.width; x += 20) {
    for (let y = 10; y < bounds.height; y += 20) ctx.fillRect(x, y, 1, 1);
  }
  const topBack = project(0, 0, height),
    topRight = project(length, 0, height);
  const topFront = project(length, width, height),
    topLeft = project(0, width, height);
  const bottomRight = project(length, 0, 0),
    bottomFront = project(length, width, 0),
    bottomLeft = project(0, width, 0);
  const ink = '#3c3028';
  ctx.lineWidth = 1.25;
  ctx.lineJoin = 'round';
  polygon([topBack, topRight, topFront, topLeft], '#f0bc7d', ink);
  polygon([topFront, topLeft, bottomLeft, bottomFront], '#bd8958', ink);
  polygon([topRight, topFront, bottomFront, bottomRight], '#996c4c', ink);
  polygon(
    [
      project(0, width * 0.44, height),
      project(length, width * 0.44, height),
      project(length, width * 0.56, height),
      project(0, width * 0.56, height),
    ],
    '#e2a862',
  );
  polygon(
    [
      project(length, width * 0.44, height),
      project(length, width * 0.56, height),
      project(length, width * 0.56, height * 0.69),
      project(length, width * 0.44, height * 0.69),
    ],
    '#ad794a',
  );
  function dimension(a, b, text, dx, dy, align) {
    const start = [a[0] + dx, a[1] + dy],
      end = [b[0] + dx, b[1] + dy];
    ctx.strokeStyle = '#a4c4c1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...start);
    ctx.lineTo(...end);
    for (const [x, y] of [start, end]) {
      ctx.moveTo(x - 2, y + 3);
      ctx.lineTo(x + 2, y - 3);
    }
    ctx.stroke();
    const x = (start[0] + end[0]) / 2,
      y = (start[1] + end[1]) / 2;
    ctx.font = '600 12px ui-monospace, monospace';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#131d28';
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#eaf4f3';
    ctx.fillText(text, x, y);
  }
  // Hide labels on very short edges instead of overlapping neighbouring text.
  if (Math.hypot(bottomFront[0] - bottomLeft[0], bottomFront[1] - bottomLeft[1]) > 38)
    dimension(bottomLeft, bottomFront, length + ' см', 0, 13, 'center');
  if (Math.hypot(bottomFront[0] - bottomRight[0], bottomFront[1] - bottomRight[1]) > 38)
    dimension(bottomFront, bottomRight, width + ' см', 0, 13, 'center');
  if (height * scale > 18) dimension(topRight, bottomRight, height + ' см', 10, 0, 'left');
}

function updateBox() {
  const values = boxInputs.map((input) => Number(input.value));
  boxInputs.forEach((input, index) => {
    const text = String(values[index]) + (index === 3 ? '°' : ' см');
    document.getElementById(input.id + '-value').textContent = text;
    input.setAttribute('aria-valuetext', text);
  });
  const [length, width, height, angle] = values;
  const volume = boxVolume(length, width, height);
  document.querySelector('#box-litres').textContent = boxFormatter.format(volume.litres) + ' л';
  document.querySelector('#box-metres').textContent = boxFormatter.format(volume.metres) + ' м³';
  drawBox(length, width, height, angle);
}

boxInputs.forEach((input) => input.addEventListener('input', updateBox));
new ResizeObserver(updateBox).observe(boxCanvas);
updateBox();
