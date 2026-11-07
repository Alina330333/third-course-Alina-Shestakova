const taskForm = document.querySelector('#task-form');
const taskTitle = document.querySelector('#task-title');
const taskDesc = document.querySelector('#task-desc');
const taskList = document.querySelector('#task-list');
const messageEl = document.querySelector('#message');
const refreshBtn = document.querySelector('#refresh-btn');

let tasks = []; // Локальная копия данных с сервера

// Показ сообщений
function showMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.className = isError ? 'message error' : 'message success';
  setTimeout(() => { messageEl.className = 'message'; }, 3000);
}

// Обертка для fetch с проверкой статуса
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let msg = `HTTP ${response.status}`;
    try { const data = await response.json(); msg = data.error || msg; } catch {}
    throw new Error(msg);
  }
  return response.status === 204 ? null : response.json();
}

// Загрузка данных (GET)
async function refreshTasks() {
  try {
    tasks = await request('/api/tasks');
    render();
  } catch (err) {
    showMessage('Ошибка загрузки: ' + err.message, true);
  }
}

// Отрисовка (DOM)
function render() {
  taskList.replaceChildren();

  if (tasks.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Список пуст';
    li.style.textAlign = 'center';
    li.style.color = '#888';
    taskList.append(li);
    return;
  }

  for (const task of tasks) {
    const li = document.createElement('li');
    li.className = `task-item ${task.done ? 'done' : ''}`;

    // Безопасный вывод текста (без innerHTML!)
    const infoDiv = document.createElement('div');
    infoDiv.className = 'task-info';
    infoDiv.onclick = () => toggleTask(task.id, task.done); // Клик переключает статус

    const titleSpan = document.createElement('span');
    titleSpan.className = 'task-title';
    titleSpan.textContent = task.title; // Безопасно

    const descSpan = document.createElement('span');
    descSpan.className = 'task-desc';
    descSpan.textContent = task.description;

    infoDiv.append(titleSpan, descSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete';
    delBtn.textContent = 'Удалить';
    delBtn.onclick = () => deleteTask(task.id);

    li.append(infoDiv, delBtn);
    taskList.append(li);
  }
}

// Создание (POST)
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskTitle.value.trim();
  const description = taskDesc.value.trim();

  if (!title) {
    showMessage('Введите название', true);
    return;
  }

  try {
    await request('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    taskTitle.value = '';
    taskDesc.value = '';
    showMessage('Задача добавлена');
    await refreshTasks();
  } catch (err) {
    showMessage('Ошибка создания: ' + err.message, true);
  }
});

// Изменение статуса (PATCH)
async function toggleTask(id, currentDone) {
  try {
    await request(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !currentDone })
    });
    await refreshTasks();
  } catch (err) {
    showMessage('Ошибка изменения: ' + err.message, true);
  }
}

// Удаление (DELETE)
async function deleteTask(id) {
  if (!confirm('Удалить задачу?')) return;
  try {
    await request(`/api/tasks/${id}`, { method: 'DELETE' });
    showMessage('Удалено');
    await refreshTasks();
  } catch (err) {
    showMessage('Ошибка удаления: ' + err.message, true);
  }
}

refreshBtn.addEventListener('click', refreshTasks);

// Запуск при загрузке
refreshTasks();