(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const examples = { DE: 'DE123456789', IT: 'IT12345678901', FR: 'FRAB123456789', GR: 'GR123456789' };
  const rateByCountry = { DE: 19, IT: 22, FR: 20, GR: 24 };
  const prices = { 1: 10000, 2: 2000, 3: 1000 };
  const promotions = new Map([
    ['D15', (cents) => cents * 0.15],
    ['P6', (cents) => cents * 0.06],
    ['F10', () => 1000],
  ]);
  const taxPattern = /^(DE\d{9}|IT\d{11}|GR\d{9}|FR[A-Z]{2}\d{9})$/;
  const currency = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'EUR' });
  const money = (cents) => currency.format(cents / 100);
  function report(code, message, body) {
    byId('purchase-status').textContent = code + ' · ' + message;
    byId('purchase-status').classList.toggle('bad', code >= 400);
    byId('purchase-response').textContent = JSON.stringify(body, null, 2);
  }
  function calculate(purchase) {
    const product = Number(byId('product').value);
    const taxNumber = byId('tax-number').value;
    const coupon = byId('coupon').value;
    const request = { product, taxNumber };
    if (coupon) request.couponCode = coupon;
    if (purchase) request.paymentProcessor = byId('processor').value;
    byId('purchase-route').textContent = purchase ? 'POST /purchase' : 'POST /calculate-price';
    byId('payload').textContent = JSON.stringify(request, null, 2);
    for (const field of ['base', 'discount', 'vat', 'total']) byId(field).textContent = '—';
    byId('vat-label').textContent = 'Налог';
    if (!taxPattern.test(taxNumber)) {
      const details = {
        taxNumber: taxNumber ? 'Invalid tax number format.' : 'This value should not be blank.',
      };
      report(422, 'Проверь налоговый номер', { error: 'Validation Failed', details });
      return;
    }
    if (coupon && !promotions.has(coupon)) {
      report(400, 'Такого купона нет', { error: 'Invalid coupon code.' });
      return;
    }
    const base = prices[product];
    const discount = coupon ? Math.min(base, Math.round(promotions.get(coupon)(base))) : 0;
    const rate = rateByCountry[taxNumber.slice(0, 2)];
    const vat = Math.round(((base - discount) * rate) / 100);
    const total = base - discount + vat;
    byId('base').textContent = money(base);
    byId('discount').textContent = money(-discount || 0);
    byId('vat-label').textContent = 'Налог · ' + rate + '%';
    byId('vat').textContent = money(vat);
    byId('total').textContent = money(total);
    if (purchase) report(200, 'Учебная покупка проведена', { message: 'Purchase successful.' });
    else report(200, 'Цена рассчитана', { price: total / 100 });
  }
  byId('tax-country').addEventListener('change', () => {
    byId('tax-number').value = examples[byId('tax-country').value];
  });
  byId('purchase-form').addEventListener('submit', (event) => {
    event.preventDefault();
    calculate(event.submitter?.id === 'pay');
  });
  calculate(false);
})();
