/*
 * Pruebas de la lógica (montos, períodos, monedas, migración y validación).
 * Ejecutar con:  node tests/logic.test.js
 */
'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

['money', 'dates', 'model'].forEach((f) => require(path.join(__dirname, '..', 'js', `${f}.js`)));
const { Money, Dates, Model } = globalThis.LifeOS;

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    process.exitCode = 1;
  }
}

function setup(currency = 'CRC', rate = 50000) {
  const data = Model.createEmpty();
  data.profile = Model.buildProfile({ name: 'Emanuel', displayName: '', currency, salaryFrequency: 'biweekly', rateText: rate ? Money.toInputText(rate) : '' }, null).profile;
  data.categories = Model.defaultCategories();
  return data;
}

function add(data, draft) {
  const base = { currency: data.profile.currency, rateText: '', description: '', categoryId: '', incomeType: 'salary' };
  const d = { ...base, ...draft };
  if (d.kind === 'income' && !d.periodYm) {
    const s = Dates.suggestIncomePeriod(d.date);
    d.periodYm = s.ym; d.periodHalf = s.half;
  }
  const { errors, movement } = Model.buildMovement(d, data, null);
  assert.equal(errors, null, JSON.stringify(errors));
  Model.upsertMovement(data, movement);
  return movement;
}

console.log('Montos');
test('parse acepta formatos comunes', () => {
  assert.equal(Money.parse('12500'), 1250000);
  assert.equal(Money.parse('12 500'), 1250000);
  assert.equal(Money.parse('12.500'), 1250000);
  assert.equal(Money.parse('12500,5'), 1250050);
  assert.equal(Money.parse('12500.50'), 1250050);
  assert.equal(Money.parse('1.234.567,89'), 123456789);
  assert.equal(Money.parse('1,234,567.89'), 123456789);
  assert.equal(Money.parse('₡ 3 000'), 300000);
  assert.equal(Money.parse(Money.toInputText(1250050)), 1250050);
});
test('parse rechaza valores inválidos', () => {
  ['', 'abc', '-5', '1,2,3,4x', '12.345.6789'].forEach((v) => assert.equal(Money.parse(v), null, v));
  assert.equal(Money.parse('0'), 0);
});
test('conversión con tasa entera', () => {
  assert.equal(Money.convert(1000, 'USD', 'CRC', 50525), 505250); // US$10 → ₡5052,50
  assert.equal(Money.convert(505250, 'CRC', 'USD', 50525), 1000);
  assert.equal(Money.convert(100, 'USD', 'CRC', null), null);
  assert.equal(Money.convert(100, 'CRC', 'CRC', null), 100);
});

console.log('Períodos');
test('regla de quincenas', () => {
  assert.deepEqual(Dates.suggestIncomePeriod('2026-11-15'), { ym: '2026-11', half: 1 });
  assert.deepEqual(Dates.suggestIncomePeriod('2026-11-16'), { ym: '2026-11', half: 2 });
  assert.deepEqual(Dates.periodRange({ mode: 'half', y: 2026, m: 2, half: 2 }), { start: '2026-02-16', end: '2026-02-28' });
  assert.deepEqual(Dates.periodRange({ mode: 'month', y: 2028, m: 2 }), { start: '2028-02-01', end: '2028-02-29' });
});
test('navegación entre períodos', () => {
  assert.deepEqual(Dates.shiftPeriod({ mode: 'half', y: 2026, m: 1, half: 1 }, -1), { mode: 'half', y: 2025, m: 12, half: 2 });
  assert.deepEqual(Dates.shiftPeriod({ mode: 'month', y: 2026, m: 12, half: 1 }, 1), { mode: 'month', y: 2027, m: 1, half: 1 });
});
test('fechas inválidas', () => {
  assert.equal(Dates.isValidISODate('2026-02-30'), false);
  assert.equal(Dates.isValidISODate('2026-13-01'), false);
  assert.equal(Dates.isValidISODate('2026-11-02'), true);
});

console.log('Finanzas');
test('saldo = ingresos − gastos − ahorro y el mes es la suma de sus quincenas', () => {
  const d = setup();
  const [gym, phone, gas] = d.categories;
  add(d, { kind: 'income', amountText: '450000', date: '2026-11-14' });
  add(d, { kind: 'income', amountText: '470000', date: '2026-11-29' });
  add(d, { kind: 'income', amountText: '25000', date: '2026-11-20', incomeType: 'other' });
  add(d, { kind: 'expense', amountText: '22000', date: '2026-11-03', categoryId: gym.id });
  add(d, { kind: 'expense', amountText: '15500,50', date: '2026-11-10', categoryId: phone.id });
  add(d, { kind: 'expense', amountText: '20000', date: '2026-11-05', categoryId: gas.id });
  add(d, { kind: 'expense', amountText: '18000', date: '2026-11-21', categoryId: gas.id });
  add(d, { kind: 'saving', amountText: '100000', date: '2026-11-15' });

  const q1 = Model.summarize(d, { mode: 'half', y: 2026, m: 11, half: 1 });
  const q2 = Model.summarize(d, { mode: 'half', y: 2026, m: 11, half: 2 });
  const mo = Model.summarize(d, { mode: 'month', y: 2026, m: 11, half: 1 });

  assert.equal(q1.income, 45000000);
  assert.equal(q1.expense, 5750050);
  assert.equal(q1.saving, 10000000);
  assert.equal(q1.available, 45000000 - 5750050 - 10000000);
  ['income', 'expense', 'saving', 'available'].forEach((k) => assert.equal(mo[k], q1[k] + q2[k], k));
  assert.equal(mo.byCategory[0].categoryId, gas.id); // gasolina acumula 38 000
  assert.equal(mo.byCategory[0].total, 3800000);
});
test('el período manual del ingreso manda sobre la fecha', () => {
  const d = setup();
  add(d, { kind: 'income', amountText: '400000', date: '2026-12-01', periodYm: '2026-11', periodHalf: 2 });
  assert.equal(Model.summarize(d, { mode: 'half', y: 2026, m: 11, half: 2 }).income, 40000000);
  assert.equal(Model.summarize(d, { mode: 'month', y: 2026, m: 12, half: 1 }).income, 0);
});
test('gasto en USD conserva su tasa al cambiar el tipo de cambio del perfil', () => {
  const d = setup('CRC', 50000);
  add(d, { kind: 'expense', amountText: '10', currency: 'USD', rateText: '500', date: '2026-11-04' });
  const p = { mode: 'month', y: 2026, m: 11, half: 1 };
  assert.equal(Model.summarize(d, p).expense, 500000);
  d.profile = Model.buildProfile({ ...d.profile, rateText: '540' }, d.profile).profile;
  assert.equal(d.profile.exchangeRate, 54000);
  assert.equal(Model.summarize(d, p).expense, 500000);
});
test('cambiar la moneda principal recalcula sin modificar registros', () => {
  const d = setup('CRC', 50000);
  const m = add(d, { kind: 'expense', amountText: '5000', date: '2026-11-04' });
  const before = JSON.stringify(d.movements);
  d.profile = { ...d.profile, currency: 'USD' };
  assert.equal(Model.summarize(d, { mode: 'month', y: 2026, m: 11 }).expense, 1000); // ₡5000 / 500 = US$10
  assert.equal(JSON.stringify(d.movements), before);
  assert.equal(m.rate, 50000);
});
test('moneda distinta exige tipo de cambio', () => {
  const d = setup('CRC', null);
  const r = Model.buildMovement({ kind: 'expense', amountText: '10', currency: 'USD', rateText: '', date: '2026-11-04', description: '', categoryId: '' }, d, null);
  assert.ok(r.errors && r.errors.rate);
});
test('validación de formularios', () => {
  const d = setup();
  const r = Model.buildMovement({ kind: 'expense', amountText: '-3', currency: 'CRC', date: '2026-02-30', description: '', categoryId: 'x' }, d, null);
  assert.ok(r.errors.amount && r.errors.date && r.errors.categoryId);
});
test('editar y eliminar actualizan los totales', () => {
  const d = setup();
  const p = { mode: 'month', y: 2026, m: 11 };
  const m = add(d, { kind: 'expense', amountText: '1000', date: '2026-11-04' });
  const edited = Model.buildMovement({ kind: 'expense', amountText: '2500', currency: 'CRC', date: '2026-11-04', description: 'x', categoryId: '' }, d, m).movement;
  Model.upsertMovement(d, edited);
  assert.equal(d.movements.length, 1);
  assert.equal(Model.summarize(d, p).expense, 250000);
  Model.deleteMovement(d, m.id);
  assert.equal(Model.summarize(d, p).expense, 0);
});

console.log('Categorías');
test('nombres únicos y presupuesto quincenal = mitad', () => {
  const d = setup();
  assert.ok(Model.buildCategory({ name: 'gimnasio', icon: '🏋️', type: 'fixed', budgetText: '' }, d, null).errors.name);
  const c = Model.buildCategory({ name: 'Comida', icon: '🍽️', type: 'variable', budgetText: '80000' }, d, null).category;
  assert.equal(Model.budgetForPeriod(c, 'month', d.profile), 8000000);
  assert.equal(Model.budgetForPeriod(c, 'half', d.profile), 4000000);
});
test('eliminar categoría reasigna o deja sin categoría, sin perder gastos', () => {
  const d = setup();
  const [gym, phone] = d.categories;
  add(d, { kind: 'expense', amountText: '1000', date: '2026-11-04', categoryId: gym.id });
  add(d, { kind: 'expense', amountText: '2000', date: '2026-11-04', categoryId: phone.id });
  Model.deleteCategory(d, gym.id, phone.id);
  assert.equal(Model.countCategoryUsage(d, phone.id), 2);
  Model.deleteCategory(d, phone.id, null);
  assert.equal(d.movements.length, 2);
  assert.ok(d.movements.every((m) => m.categoryId === null));
  assert.deepEqual(Model.validate(d), []);
});

console.log('Perfil y tema');
test('tema por defecto claro y se conserva al guardar el perfil', () => {
  const d = setup();
  assert.equal(d.profile.theme, 'light');
  const old = { ...d.profile }; delete old.theme; // perfil de una versión anterior
  assert.equal(Model.themeOf(old), 'light');
  d.profile = { ...d.profile, theme: 'dark' };
  const saved = Model.buildProfile({ name: 'Ema', displayName: '', currency: 'CRC', salaryFrequency: 'monthly', rateText: '500' }, d.profile).profile;
  assert.equal(saved.theme, 'dark');
  assert.deepEqual(Model.validate({ ...d, profile: saved }), []);
});
test('tema inválido se rechaza', () => {
  const d = setup();
  assert.ok(Model.buildProfile({ ...d.profile, theme: 'rosa' }, d.profile).errors.theme);
  assert.ok(Model.validate({ ...d, profile: { ...d.profile, theme: 'rosa' } }).length > 0);
});

console.log('Respaldos');
test('exportar e importar conserva los datos', () => {
  const d = setup();
  add(d, { kind: 'income', amountText: '450000', date: '2026-11-14' });
  add(d, { kind: 'saving', amountText: '50000', date: '2026-11-14' });
  const file = JSON.stringify({ app: 'LifeOS', exportedAt: 'x', ...d });
  const back = Model.migrate(JSON.parse(file));
  assert.deepEqual(Model.validate(back), []);
  assert.deepEqual(back, d);
});
test('importar rechaza archivos que no son respaldos', () => {
  assert.throws(() => Model.migrate([]));
  assert.throws(() => Model.migrate({ foo: 1 }));
  assert.throws(() => Model.migrate({ version: 99 }));
  const bad = setup();
  bad.movements.push({ id: 'a', kind: 'expense', amount: -1, currency: 'CRC', rate: null, date: '2026-11-01', description: '', categoryId: null });
  assert.ok(Model.validate(bad).length > 0);
});
test('datos sin versión se conservan en legacy', () => {
  const old = { tareas: [1], vehiculos: [2] };
  const d = Model.migrate(old, { allowLegacy: true });
  assert.deepEqual(d.legacy, old);
  assert.deepEqual(Model.validate(d), []);
});

console.log(`\n${passed} pruebas superadas${process.exitCode ? ', con fallos' : ''}.`);
