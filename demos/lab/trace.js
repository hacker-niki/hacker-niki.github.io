(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const hops = [
    { name: 'gateway.example', address: '192.0.2.1', ms: 2 },
    { name: 'edge.example', address: '192.0.2.14', ms: 8 },
    { name: 'transit.example', address: '198.51.100.7', ms: 1250 },
    { name: 'relay.example', address: '198.51.100.22', ms: 26 },
    { name: 'target.example', address: '203.0.113.42', ms: 34 },
  ];
  function render() {
    const ttl = Number(byId('trace-ttl').value);
    const timeout = Number(byId('trace-timeout').value) * 1000;
    const last = ttl === hops.length;
    byId('trace-count').textContent = ttl;
    byId('trace-next').textContent = last ? 'Начать сначала ↺' : 'Следующий переход →';
    const lines = ['Traceroute to ' + hops[hops.length - 1].address, 'Max hops: ' + ttl, ''];
    const nodes = hops.map((hop, index) => {
      const step = index + 1;
      const visited = step <= ttl;
      const missed = hop.ms > timeout;
      const li = document.createElement('li');
      if (step === ttl) {
        li.className = 'active';
        li.setAttribute('aria-current', 'step');
      }
      const number = document.createElement('span');
      number.className = 'num';
      number.textContent = step;
      const label = document.createElement('span');
      label.textContent = visited ? (missed ? 'Таймаут' : hop.name) : 'Следующий узел';
      const address = document.createElement('small');
      address.textContent = visited ? (missed ? 'Ответ ещё не получен' : hop.address) : 'Ожидает своего TTL';
      label.append(address);
      const rtt = document.createElement('span');
      rtt.className = 'rtt';
      rtt.textContent = visited ? (missed ? '* * *' : hop.ms + ' мс') : '—';
      li.append(number, label, rtt);
      if (visited)
        lines.push(step + (missed ? ' * * *' : ' ' + hop.name + ' ' + hop.address + ' ' + hop.ms + 'ms'));
      return li;
    });
    const current = hops[ttl - 1];
    let message;
    if (current.ms > timeout) {
      message =
        'За ' + timeout / 1000 + ' с ответ не пришёл. Увеличь ожидание или продолжи со следующим TTL.';
    } else if (last) {
      message =
        'Конечный узел ответил на ICMP Echo Request. Обратный путь вместе с прямым занял ' +
        current.ms +
        ' мс.';
      lines.push('', ttl + ' hops between you and ' + current.address + ' ' + current.ms + 'ms');
    } else {
      message =
        'На узле ' +
        current.address +
        ' TTL исчерпан. Ответ ICMP Time Exceeded вернулся через ' +
        current.ms +
        ' мс.';
    }
    byId('trace-status').textContent = message;
    byId('trace-status').classList.toggle('bad', current.ms > timeout);
    byId('trace-output').textContent = lines.join('\n');
    byId('trace-steps').replaceChildren(...nodes);
  }
  byId('trace-ttl').addEventListener('input', render);
  byId('trace-timeout').addEventListener('change', render);
  byId('trace-next').addEventListener('click', () => {
    const control = byId('trace-ttl');
    control.value = (Number(control.value) % hops.length) + 1;
    render();
  });
  render();
})();
