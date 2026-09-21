// 1. СОСТОЯНИЕ ПРОГРАММЫ

let value = 0;
// Единственная переменная, где хранится текущее число.
// let — потому что значение будет меняться.
// Это и есть «состояние» программы.


// 2. ССЫЛКИ НА ЭЛЕМЕНТЫ СТРАНИЦЫ (DOM)

const valueDisplay   = document.querySelector('#value');
// Находим <span id="value">, куда будем выводить число

const messageDisplay = document.querySelector('#message');
// Находим <p id="message">, куда будем писать сообщение о знаке

const increaseBtn    = document.querySelector('#increase');
const decreaseBtn    = document.querySelector('#decrease');
const resetBtn       = document.querySelector('#reset');
// Находим все три кнопки по их id


// 3. ФУНКЦИЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА

function render() {
  // Задача render(): привести страницу в соответствие с текущим value

  valueDisplay.textContent = value;
  // Записываем число в <span id="value">. Пользователь видит обновлённое значение.

  if (value > 0) {
    messageDisplay.textContent = 'Число положительное';
  } else if (value < 0) {
    messageDisplay.textContent = 'Число отрицательное';
  } else {
    messageDisplay.textContent = 'Число равно нулю';
  }
  // Проверяем знак числа и пишем соответствующее сообщение в <p id="message">

  // Обратите внимание: render() только ЧИТАЕТ value и ОТОБРАЖАЕТ его.
  // Она не меняет само состояние — это делают обработчики ниже.
}


// 4. ОБРАБОТЧИКИ СОБЫТИЙ

increaseBtn.addEventListener('click', () => {
  value += 1;    // Шаг 1: меняем состояние (value = value + 1)
  render();      // Шаг 2: обновляем интерфейс
});
// При клике на «+1»: сначала меняем переменную, потом перерисовываем экран.

decreaseBtn.addEventListener('click', () => {
  value -= 1;    // Уменьшаем value на 1
  render();      // Обновляем интерфейс
});

resetBtn.addEventListener('click', () => {
  value = 0;     // Возвращаем значение к нулю
  render();      // Обновляем интерфейс
});


// 5. ПЕРВЫЙ ЗАПУСК

render();
// Вызываем render() один раз при загрузке страницы,
// чтобы интерфейс сразу отобразил начальное состояние (0 и «Число равно нулю»).
