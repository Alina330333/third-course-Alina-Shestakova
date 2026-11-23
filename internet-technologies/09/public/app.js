const btnTasks = document.getElementById('btn-tasks');
const btnTransfers = document.getElementById('btn-transfers');
const tabTasks = document.getElementById('tab-tasks');
const tabTransfers = document.getElementById('tab-transfers');

btnTasks.addEventListener('click', () => {
  btnTasks.classList.add('active');
  btnTransfers.classList.remove('active');
  tabTasks.classList.remove('hidden');
  tabTransfers.classList.add('hidden');
});

btnTransfers.addEventListener('click', () => {
  btnTransfers.classList.add('active');
  btnTasks.classList.remove('active');
  tabTransfers.classList.remove('hidden');
  tabTasks.classList.add('hidden');
  loadTransferData();
});

const taskList = document.querySelector('#task-list');
const messageEl = document.querySelector('#message');
const searchInput = document.querySelector('#search');
const doneFilter = document.querySelector('#done-filter');
const sortSelect = document.querySelector('#sort');
const orderSelect = document.querySelector('#order');
const limitSelect = document.querySelector('#limit');
const prevBtn = document.querySelector('#prev-btn');
const nextBtn = document.querySelector('#next-btn');
const pageInfo = document.querySelector('#page-info');

let filters = { search: '', done: '', sort: 'id', order: 'asc', page: 1, limit: 5 };
let pagination = { total: 0, pages: 0 };

function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'message error' : 'message success';
  if (text) setTimeout(() => { messageEl.className = 'message'; }, 4000);
}

function makeTasksUrl() {
  const params = new URLSearchParams({
    search: filters.search, sort: filters.sort, order: filters.order, page: String(filters.page), limit: String(filters.limit)
  });
  if (filters.done !== '') params.set('done', filters.done);
  return '/api/tasks?' + params.toString();
}

async function refreshTasks() {
  try {
    const response = await fetch(makeTasksUrl());
    if (!response.ok) throw new Error('Ошибка загрузки');
    const data = await response.json();
    pagination = data.pagination;
    renderTasks(data.items);
  } catch (err) {
    showMessage(err.message, true);
  }
}

function renderTasks(tasks) {
  taskList.replaceChildren();
  if (tasks.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Ничего не найдено';
    li.style.textAlign = 'center';
    taskList.append(li);
  } else {
    for (const task of tasks) {
      const li = document.createElement('li');
      li.className = `task-item ${task.done ? 'done' : ''}`;
      const info = document.createElement('div');
      info.className = 'task-info';
      info.onclick = () => toggleTask(task.id, task.done);
      info.innerHTML = `<span class="task-title">${task.title}</span>`;
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete';
      delBtn.textContent = 'Удалить';
      delBtn.onclick = () => deleteTask(task.id);
      li.append(info, delBtn);
      taskList.append(li);
    }
  }
  prevBtn.disabled = filters.page <= 1;
  nextBtn.disabled = filters.page >= pagination.pages;
  pageInfo.textContent = `Страница ${pagination.page} из ${pagination.pages || 1} (Всего: ${pagination.total})`;
}

searchInput.addEventListener('input', () => { filters.search = searchInput.value; filters.page = 1; refreshTasks(); });
doneFilter.addEventListener('change', () => { filters.done = doneFilter.value; filters.page = 1; refreshTasks(); });
sortSelect.addEventListener('change', () => { filters.sort = sortSelect.value; filters.page = 1; refreshTasks(); });
orderSelect.addEventListener('change', () => { filters.order = orderSelect.value; filters.page = 1; refreshTasks(); });
limitSelect.addEventListener('change', () => { filters.limit = parseInt(limitSelect.value); filters.page = 1; refreshTasks(); });

prevBtn.addEventListener('click', () => { if (filters.page > 1) { filters.page--; refreshTasks(); } });
nextBtn.addEventListener('click', () => { if (filters.page < pagination.pages) { filters.page++; refreshTasks(); } });

document.querySelector('#task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.querySelector('#new-title').value.trim();
  if (!title) return;
  try {
    await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    document.querySelector('#new-title').value = '';
    refreshTasks();
  } catch (err) { showMessage('Ошибка создания', true); }
});

async function toggleTask(id, currentDone) {
  await fetch(`/api/tasks/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: !currentDone }) });
  refreshTasks();
}

async function deleteTask(id) {
  if (!confirm('Удалить задачу?')) return;
  await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (filters.page > 1 && pagination.total - 1 <= (filters.page - 1) * filters.limit) filters.page--;
  refreshTasks();
}

const invList = document.querySelector('#inventory-list');
const historyList = document.querySelector('#history-list');
const transferForm = document.querySelector('#transfer-form');

async function loadTransferData() {
  try {
    const res = await fetch('/api/transfers-data');
    const data = await res.json();
    
    invList.innerHTML = '';
    data.inventories.forEach(item => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.name}</strong> <span>${item.quantity} шт.</span>`;
      invList.appendChild(li);
    });

    historyList.innerHTML = '';
    if (data.transfers.length === 0) {
      historyList.innerHTML = '<li>История пуста</li>';
    } else {
      data.transfers.forEach(t => {
        const li = document.createElement('li');
        li.textContent = `Перевод #${t.id}: из ${t.from_id} в ${t.to_id} - ${t.quantity} шт. (${t.created_at})`;
        historyList.appendChild(li);
      });
    }
  } catch (err) {
    showMessage('Ошибка загрузки данных складов', true);
  }
}

transferForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  messageEl.className = 'message';
  
  const fromId = parseInt(document.getElementById('from-id').value);
  const toId = parseInt(document.getElementById('to-id').value);
  const quantity = parseInt(document.getElementById('quantity').value);

  try {
    const res = await fetch('/api/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId, toId, quantity })
    });
    
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Ошибка сервера');

    showMessage(`Успешно перенесено ${quantity} шт.`, false);
    loadTransferData();
  } catch (err) {
    showMessage(err.message, true);
  }
});

refreshTasks();