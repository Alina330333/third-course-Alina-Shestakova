const test = require('node:test');
const assert = require('node:assert/strict');
const { isPositiveInteger } = require('../validation');

test('Валидация: положительные целые числа', () => {
  assert.equal(isPositiveInteger(3), true);
  assert.equal(isPositiveInteger(1), true);
  assert.equal(isPositiveInteger(100), true);
});

test('Валидация: невалидные значения', () => {
  assert.equal(isPositiveInteger(0), false);
  assert.equal(isPositiveInteger(-3), false);
  assert.equal(isPositiveInteger('3'), false);
  assert.equal(isPositiveInteger(1.5), false);
  assert.equal(isPositiveInteger(null), false);
  assert.equal(isPositiveInteger(undefined), false);
});