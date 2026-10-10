const API_URL = 'https://jsonplaceholder.typicode.com/users';

// всё состояние приложения в одном объекте
const state = {
  users: [],          // данные с сервера
  isLoading: false,   // идёт ли загрузка
  error: null,        // текст ошибки
  filter: ''          // текущий фильтр
};

const loadButton      = document.querySelector('#loadButton');
const reloadButton    = document.querySelector('#reloadButton');
const filterInput     = document.querySelector('#filterInput');

const statusElement     = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');
const usersElement      = document.querySelector('#users');


// 1. Загрузка данных

async function loadUsers() {
  // до запроса — состояние «загрузка»
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    // 404, 500 и т.п. не считаются успехом
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const users = await response.json();   // превращаем тело ответа в массив
    state.users = users;                   // сохраняем в состояние

  } catch (error) {
    console.error(error);
    state.error = 'Не удалось загрузить данные. ' + error.message;
    state.users = [];

  } finally {
    // выполняется всегда — иначе интерфейс зависнет на «Загрузка...»
    state.isLoading = false;
    render();
  }
}


// 2. Фильтрация

function getFilteredUsers(users, filter) {
  const query = filter.trim().toLowerCase();

  if (query === '') return users;   // пустой фильтр — все

  // оставляем пользователя, если совпало любое из полей
  return users.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.username.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  );
}


// 3. Карточка пользователя

function createUserCard(user) {
  // создаём элементы через createElement — безопаснее, чем innerHTML
  const article = document.createElement('article');
  article.className = 'user-card';

  const name = document.createElement('h2');
  name.textContent = user.name;
  article.append(name);

  const username = document.createElement('p');
  username.textContent = '@' + user.username;
  article.append(username);

  const email = document.createElement('p');
  email.textContent = user.email;
  article.append(email);

  const city = document.createElement('p');
  city.textContent = 'Город: ' + user.address.city;   // вложенное свойство
  article.append(city);

  const company = document.createElement('p');
  company.textContent = 'Компания: ' + user.company.name;
  article.append(company);

  return article;
}


// 4. Статистика

function getStatistics(users, filteredUsers) {
  // Set убирает дубликаты городов, .size — их количество
  const cities = new Set(users.map(u => u.address.city));

  return {
    total: users.length,
    visible: filteredUsers.length,
    uniqueCities: cities.size
  };
}


// 5. Отображение

function render() {
  usersElement.innerHTML = '';
  statisticsElement.textContent = '';

  // состояния проверяем по порядку
  if (state.isLoading) {
    statusElement.textContent = 'Загрузка...';
    return;
  }

  if (state.error) {
    statusElement.textContent = state.error;
    return;
  }

  if (state.users.length === 0) {
    statusElement.textContent = 'Данные ещё не загружены.';
    return;
  }

  statusElement.textContent = '';

  const filtered = getFilteredUsers(state.users, state.filter);

  if (filtered.length === 0) {
    statusElement.textContent = 'Никого не найдено по запросу.';
  } else {
    for (const user of filtered) {
      usersElement.append(createUserCard(user));
    }
  }

  const stats = getStatistics(state.users, filtered);
  statisticsElement.textContent =
    `Всего: ${stats.total}, показано: ${stats.visible}, уникальных городов: ${stats.uniqueCities}`;
}


// 6. События

loadButton.addEventListener('click', () => {
  loadUsers();
});

reloadButton.addEventListener('click', () => {
  loadUsers();   // та же функция, состояние пройдёт заново
});

filterInput.addEventListener('input', () => {
  // input срабатывает при каждом изменении текста
  state.filter = filterInput.value;
  render();      // данные не перезапрашиваем, только перерисовываем
});

render();   // стартовое состояние
