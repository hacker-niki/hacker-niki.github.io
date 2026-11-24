(() => {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const rows = [
    [1, 'Студия', null],
    [2, 'Разработка', 1],
    [3, 'Дизайн', 1],
    [4, 'Платформа', 2],
    [5, 'Мобильная команда', 2],
  ];
  const departments = rows.map(([id, name, parent_id]) => ({
    id,
    name,
    parent_id,
    created_at: '2026-01-09T09:00:00Z',
  }));
  const people = [
    [1, 2, 'Анна Лис', 'Руководитель разработки'],
    [2, 3, 'Ирина Полевая', 'Дизайнер'],
    [3, 4, 'Павел Котов', 'Разработчик'],
    [4, 5, 'Максим Рощин', 'Разработчик'],
  ].map(([id, department_id, full_name, position]) => ({
    id,
    department_id,
    full_name,
    position,
    hired_at: '2026-01-12',
    created_at: '2026-01-12T09:00:00Z',
  }));
  function readNode(department, depth, withEmployees) {
    const node = { ...department };
    const employees = people.filter((person) => person.department_id === department.id);
    if (withEmployees && employees.length) node.employees = employees;
    const children = departments.filter((dept) => dept.parent_id === department.id);
    if (depth > 0 && children.length)
      node.children = children.map((child) => readNode(child, depth - 1, withEmployees));
    return node;
  }
  function branch(dept) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'tree-node';
    const id = document.createElement('small');
    id.textContent = '#' + dept.id;
    name.append(dept.name, id);
    li.append(name);
    const children = departments.filter((child) => child.parent_id === dept.id);
    if (children.length) {
      const list = document.createElement('ul');
      list.append(...children.map(branch));
      li.append(list);
    }
    return li;
  }
  function renderTree() {
    byId('org-tree').replaceChildren(...departments.filter((dept) => dept.parent_id === null).map(branch));
  }
  function report(route, status, message, response) {
    byId('org-route').textContent = route;
    byId('org-status').textContent = status + ' · ' + message;
    byId('org-status').classList.toggle('bad', status !== 200);
    byId('org-response').textContent = JSON.stringify(response, null, 2);
  }
  for (const key of ['org-id', 'org-from', 'org-parent']) {
    const select = byId(key);
    if (key === 'org-parent') select.add(new Option('В корень', ''));
    departments.forEach((dept) => select.add(new Option(dept.name + ' · #' + dept.id, dept.id)));
  }
  byId('org-from').value = '5';
  byId('org-parent').value = '3';
  function query() {
    const dept = departments.find((entry) => entry.id === Number(byId('org-id').value));
    const depth = Number(byId('org-depth').value);
    const include = byId('org-employees').checked;
    report(
      'GET /departments/' + dept.id + '?depth=' + depth + '&include_employees=' + include,
      200,
      'Получен отдел «' + dept.name + '»',
      readNode(dept, depth, include),
    );
  }
  byId('org-get').addEventListener('submit', (event) => {
    event.preventDefault();
    query();
  });
  byId('org-move').addEventListener('submit', (event) => {
    event.preventDefault();
    const dept = departments.find((entry) => entry.id === Number(byId('org-from').value));
    const destination = Number(byId('org-parent').value) || null;
    const route = 'PATCH /departments/' + dept.id + '  ' + JSON.stringify({ parent_id: destination });
    let error = '';
    if (dept.id === destination) error = 'conflict: department cannot be its own parent';
    let ancestor = departments.find((entry) => entry.id === destination);
    while (!error && ancestor) {
      if (ancestor.id === dept.id)
        error =
          'conflict: moving department ' +
          dept.id +
          ' under its own descendant ' +
          destination +
          ' would create a cycle';
      ancestor = departments.find((entry) => entry.id === ancestor.parent_id);
    }
    if (error) {
      report(route, 409, 'Перенос создаёт цикл', { error });
      return;
    }
    dept.parent_id = destination;
    renderTree();
    report(route, 200, 'Положение отдела сохранено', dept);
  });
  renderTree();
  query();
})();
