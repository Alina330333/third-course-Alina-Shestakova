function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

//function isPositiveInteger(value) {
  //return true; // Сломано специально для демонстрации провала тестов
//}

function parsePositiveInt(raw, defaultVal, maxVal) {
  if (raw === undefined) return defaultVal;
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const val = Number(raw);
  if (val > maxVal) return null;
  return val;
}

function parseDone(raw) {
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

module.exports = { isPositiveInteger, parsePositiveInt, parseDone };