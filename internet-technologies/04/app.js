const API_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=10';
const POSTS_URL = 'https://jsonplaceholder.typicode.com/posts';

// состояние приложения
const state = {
  posts: [],         // загруженные публикации
  isLoading: false,  // идёт первоначальная загрузка
  isSaving: false,   // идёт сохранение (POST или PATCH)
  error: null,       // текст ошибки
  editingId: null,   // id редактируемой записи (null = создание)
  filter: '',        // фильтр поиска
};

// элементы страницы
const loadBtn = document.querySelector('#loadBtn');
const saveBtn = document.querySelector('#saveBtn');
const cancelBtn = document.querySelector('#cancelBtn');
const filterInput = document.querySelector('#filterInput');
const titleInput = document.querySelector('#titleInput');
const bodyInput = document.querySelector('#bodyInput');
const formTitle = document.querySelector('#formTitle');
const errorEl = document.querySelector('#error');
const postsList = document.querySelector('#postsList');


// утилита: показ/скрытие ошибки
function showError(message) {
  errorEl.textContent = message || '';
}


// ЧТЕНИЕ (GET) 
async function loadPosts() {
  state.isLoading = true;
  state.error = null;
  showError('');
  render();

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const posts = await response.json();
    state.posts = posts;

  } catch (err) {
    console.error(err);
    state.error = 'Не удалось загрузить публикации. ' + err.message;
    state.posts = [];
  } finally {
    state.isLoading = false;
    render();
  }
}


// СОЗДАНИЕ (POST) 
async function createPost(data) {
  state.isSaving = true;
  render();

  try {
    const response = await fetch(POSTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const created = await response.json();

    // JSONPlaceholder возвращает объект с id. Добавляем его в начало списка.
    state.posts.unshift(created);

    resetForm();
  } catch (err) {
    console.error(err);
    showError('Ошибка сохранения: ' + err.message);
  } finally {
    state.isSaving = false;
    render();
  }
}


// РЕДАКТИРОВАНИЕ (PATCH) 
async function updatePost(id, data) {
  state.isSaving = true;
  render();

  try {
    const response = await fetch(`${POSTS_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const updated = await response.json();

    // Обновляем нужный объект в массиве
    state.posts = state.posts.map(post =>
      post.id === id ? { ...post, ...updated } : post
    );

    resetForm();
  } catch (err) {
    console.error(err);
    showError('Ошибка обновления: ' + err.message);
  } finally {
    state.isSaving = false;
    render();
  }
}


// УДАЛЕНИЕ (DELETE) 
async function deletePost(id) {
  try {
    const response = await fetch(`${POSTS_URL}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    // Удаляем из состояния только после успешного ответа
    state.posts = state.posts.filter(post => post.id !== id);
    render();
  } catch (err) {
    console.error(err);
    showError('Ошибка удаления: ' + err.message);
  }
}


// ФИЛЬТРАЦИЯ 
function getFilteredPosts(posts, filter) {
  const query = filter.trim().toLowerCase();
  if (query === '') return posts;

  return posts.filter(post =>
    post.title.toLowerCase().includes(query) ||
    post.body.toLowerCase().includes(query)
  );
}


// ОТОБРАЖЕНИЕ 
function render() {
  postsList.innerHTML = '';

  if (state.isLoading) {
    postsList.innerHTML = '<p class="hint">Загрузка...</p>';
    return;
  }

  if (state.error) {
    postsList.innerHTML = `<p class="error">${state.error}</p>`;
    return;
  }

  if (state.posts.length === 0) {
    postsList.innerHTML = '<p class="hint">Публикаций пока нет. Нажмите «Загрузить».</p>';
    return;
  }

  const filtered = getFilteredPosts(state.posts, state.filter);
  renderPosts(filtered);
}


function renderPosts(posts) {
  if (posts.length === 0) {
    postsList.innerHTML = '<p class="hint">Ничего не найдено.</p>';
    return;
  }

  for (const post of posts) {
    postsList.appendChild(createPostCard(post));
  }
}


function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'post-card';

  const meta = document.createElement('p');
  meta.className = 'meta';
  meta.textContent = `ID: ${post.id}`;
  card.appendChild(meta);

  const title = document.createElement('h3');
  title.textContent = post.title;
  card.appendChild(title);

  const body = document.createElement('p');
  body.textContent = post.body;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Редактировать';
  editBtn.addEventListener('click', () => startEdit(post.id));
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'Удалить';
  deleteBtn.addEventListener('click', () => {
    if (confirm(`Удалить публикацию «${post.title}»?`)) {
      deletePost(post.id);
    }
  });
  actions.appendChild(deleteBtn);

  card.appendChild(actions);
  return card;
}


// ФОРМА 
function startEdit(id) {
  const post = state.posts.find(p => p.id === id);
  if (!post) return;

  state.editingId = id;
  titleInput.value = post.title;
  bodyInput.value = post.body;
  formTitle.textContent = `Редактирование публикации #${id}`;
  saveBtn.textContent = 'Сохранить изменения';
  showError('');
}

function resetForm() {
  state.editingId = null;
  titleInput.value = '';
  bodyInput.value = '';
  formTitle.textContent = 'Новая публикация';
  saveBtn.textContent = 'Сохранить';
  showError('');
}


// ОБРАБОТЧИКИ 
loadBtn.addEventListener('click', loadPosts);

saveBtn.addEventListener('click', () => {
  if (state.isSaving) return;   // защита от двойного клика

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title || !body) {
    showError('Заполните заголовок и текст');
    return;
  }
  showError('');

  const data = { title, body, userId: 1 };

  if (state.editingId === null) {
    createPost(data);
  } else {
    updatePost(state.editingId, data);
  }
});

cancelBtn.addEventListener('click', resetForm);

filterInput.addEventListener('input', () => {
  state.filter = filterInput.value;
  render();   // без нового запроса
});


// СТАРТ 
render();