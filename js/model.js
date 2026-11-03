/*
 * model.js — Estructura de datos, validación y lógica financiera.
 * No toca el DOM ni el almacenamiento.
 *
 * Estructura (versión 1):
 * {
 *   version: 1,
 *   profile: { name, displayName, currency: 'CRC'|'USD',
 *              salaryFrequency: 'monthly'|'biweekly', exchangeRate: int|null } | null,
 *   categories: [{ id, name, icon (clave de icons.js), type: 'fixed'|'variable',
 *                  budget: { amount: int, currency } | null }],
 *   movements: [{ id, kind: 'income'|'expense'|'saving', amount: int, currency,
 *                 rate: int|null, date: 'AAAA-MM-DD', description,
 *                 createdAt, updatedAt,
 *                 // solo ingresos:
 *                 incomeType: 'salary'|'other', period: { ym: 'AAAA-MM', half: 1|2 },
 *                 // solo gastos:
 *                 categoryId: string|null }],
 *   legacy?: datos de una versión anterior, conservados sin usar
 * }
 */
(function (L) {
  'use strict';

  const { Money, Dates } = L;

  const SCHEMA_VERSION = 1;
  const KINDS = ['income', 'expense', 'saving'];
  const FREQUENCIES = ['monthly', 'biweekly'];
  const CATEGORY_TYPES = ['fixed', 'variable'];
  const INCOME_TYPES = ['salary', 'other'];

  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const isCurrency = (c) => Object.prototype.hasOwnProperty.call(Money.CURRENCIES, c);
  const isPositiveInt = (n) => Number.isSafeInteger(n) && n > 0;
  const nowISO = () => new Date().toISOString();
  const clean = (s) => String(s == null ? '' : s).trim().replace(/\s+/g, ' ');

  function uid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function createEmpty() {
    return { version: SCHEMA_VERSION, profile: null, categories: [], movements: [] };
  }

  function defaultCategories() {
    return [
      { name: 'Gimnasio', icon: 'dumbbell', type: 'fixed' },
      { name: 'Teléfono', icon: 'phone', type: 'fixed' },
      { name: 'Gasolina', icon: 'fuel', type: 'variable' },
      { name: 'Gastos diarios', icon: 'cart', type: 'variable' },
    ].map((c) => ({ id: uid(), ...c, budget: null }));
  }

  /* ------------------------------------------------------------------ */
  /* Migración y validación                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Lleva cualquier estructura conocida a la versión actual sin borrar nada.
   * allowLegacy: datos sin número de versión (versión anterior de LifeOS) se
   * conservan completos en `legacy`. En importaciones no se permite, para no
   * reemplazar los datos actuales con un archivo que no es un respaldo.
   */
  function migrate(raw, { allowLegacy = false } = {}) {
    if (!isObj(raw)) throw new Error('El archivo no contiene datos de LifeOS.');
    const d = JSON.parse(JSON.stringify(raw));

    if (d.version === undefined) {
      if (!allowLegacy) throw new Error('El archivo no es un respaldo de LifeOS (no tiene número de versión).');
      return { ...createEmpty(), legacy: d };
    }
    if (!Number.isInteger(d.version) || d.version < 1) throw new Error('El número de versión del respaldo no es válido.');
    if (d.version > SCHEMA_VERSION) throw new Error('El respaldo proviene de una versión más reciente de LifeOS.');

    // Futuras migraciones: while (d.version < SCHEMA_VERSION) d = MIGRATIONS[d.version](d);
    delete d.app;
    delete d.exportedAt;
    return d;
  }

  /** Devuelve una lista de errores (vacía si los datos son válidos). */
  function validate(d) {
    const errors = [];
    const err = (msg) => errors.push(msg);

    if (!isObj(d)) return ['Los datos no tienen el formato esperado.'];
    if (d.version !== SCHEMA_VERSION) err('Versión de datos no compatible.');

    if (d.profile !== null) {
      const p = d.profile;
      if (!isObj(p)) err('El perfil no es válido.');
      else {
        if (typeof p.name !== 'string' || !p.name.trim()) err('El perfil no tiene nombre.');
        if (p.displayName != null && typeof p.displayName !== 'string') err('El nombre para mostrar no es válido.');
        if (!isCurrency(p.currency)) err('La moneda principal del perfil no es válida.');
        if (!FREQUENCIES.includes(p.salaryFrequency)) err('La frecuencia salarial no es válida.');
        if (p.exchangeRate !== null && !isPositiveInt(p.exchangeRate)) err('El tipo de cambio del perfil no es válido.');
      }
    }

    if (!Array.isArray(d.categories)) err('La lista de categorías no es válida.');
    if (!Array.isArray(d.movements)) err('La lista de movimientos no es válida.');
    if (errors.length) return errors;

    const ids = new Set();
    const catIds = new Set();
    d.categories.forEach((c, i) => {
      const where = `Categoría ${i + 1}`;
      if (!isObj(c)) return err(`${where}: formato no válido.`);
      if (typeof c.id !== 'string' || !c.id || ids.has(c.id)) err(`${where}: identificador no válido o repetido.`);
      ids.add(c.id);
      catIds.add(c.id);
      if (typeof c.name !== 'string' || !c.name.trim()) err(`${where}: falta el nombre.`);
      if (typeof c.icon !== 'string' || !c.icon) err(`${where}: falta el ícono.`);
      if (!CATEGORY_TYPES.includes(c.type)) err(`${where}: tipo no válido.`);
      if (c.budget !== null && (!isObj(c.budget) || !isPositiveInt(c.budget.amount) || !isCurrency(c.budget.currency))) {
        err(`${where}: presupuesto no válido.`);
      }
    });

    d.movements.forEach((m, i) => {
      const where = `Movimiento ${i + 1}`;
      if (!isObj(m)) return err(`${where}: formato no válido.`);
      if (typeof m.id !== 'string' || !m.id || ids.has(m.id)) err(`${where}: identificador no válido o repetido.`);
      ids.add(m.id);
      if (!KINDS.includes(m.kind)) err(`${where}: tipo no válido.`);
      if (!isPositiveInt(m.amount) || m.amount >= Money.MAX_CENTS) err(`${where}: monto no válido.`);
      if (!isCurrency(m.currency)) err(`${where}: moneda no válida.`);
      if (m.rate !== null && !isPositiveInt(m.rate)) err(`${where}: tipo de cambio no válido.`);
      if (!Dates.isValidISODate(m.date)) err(`${where}: fecha no válida.`);
      if (typeof m.description !== 'string') err(`${where}: descripción no válida.`);
      if (m.kind === 'income') {
        if (!INCOME_TYPES.includes(m.incomeType)) err(`${where}: tipo de ingreso no válido.`);
        if (!isObj(m.period) || !Dates.isValidYm(m.period.ym) || ![1, 2].includes(m.period.half)) {
          err(`${where}: período no válido.`);
        }
      }
      if (m.kind === 'expense' && m.categoryId !== null && !catIds.has(m.categoryId)) {
        err(`${where}: la categoría no existe.`);
      }
    });

    return errors;
  }

  /* ------------------------------------------------------------------ */
  /* Perfil                                                              */
  /* ------------------------------------------------------------------ */

  function parseRate(text) {
    const t = clean(text);
    if (!t) return { rate: null };
    const rate = Money.parse(t);
    if (!rate) return { error: 'Escribe un tipo de cambio mayor que cero.' };
    return { rate };
  }

  /** draft: { name, displayName, currency, salaryFrequency, rateText? } */
  function buildProfile(draft, existing) {
    const errors = {};
    const name = clean(draft.name);
    const displayName = clean(draft.displayName);
    if (!name) errors.name = 'Escribe tu nombre.';
    else if (name.length > 60) errors.name = 'Máximo 60 caracteres.';
    if (displayName.length > 40) errors.displayName = 'Máximo 40 caracteres.';
    if (!isCurrency(draft.currency)) errors.currency = 'Elige una moneda.';
    if (!FREQUENCIES.includes(draft.salaryFrequency)) errors.salaryFrequency = 'Elige una frecuencia.';

    let exchangeRate = existing ? existing.exchangeRate : null;
    if (draft.rateText !== undefined) {
      const r = parseRate(draft.rateText);
      if (r.error) errors.rate = r.error;
      else exchangeRate = r.rate;
    }

    if (Object.keys(errors).length) return { errors };
    return {
      errors: null,
      profile: { name, displayName, currency: draft.currency, salaryFrequency: draft.salaryFrequency, exchangeRate },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Categorías                                                          */
  /* ------------------------------------------------------------------ */

  /** draft: { name, icon, type, budgetText } */
  function buildCategory(draft, data, existing) {
    const errors = {};
    const name = clean(draft.name);
    if (!name) errors.name = 'Escribe un nombre.';
    else if (name.length > 40) errors.name = 'Máximo 40 caracteres.';
    else if (data.categories.some((c) => c.id !== (existing && existing.id) && c.name.toLowerCase() === name.toLowerCase())) {
      errors.name = 'Ya existe una categoría con ese nombre.';
    }
    if (typeof draft.icon !== 'string' || !draft.icon) errors.icon = 'Elige un ícono.';
    if (!CATEGORY_TYPES.includes(draft.type)) errors.type = 'Elige un tipo.';

    let budget = null;
    if (clean(draft.budgetText)) {
      const amount = Money.parse(draft.budgetText);
      if (!amount) errors.budget = 'Escribe un monto mayor que cero o déjalo vacío.';
      else budget = { amount, currency: data.profile.currency };
    }

    if (Object.keys(errors).length) return { errors };
    return {
      errors: null,
      category: { id: existing ? existing.id : uid(), name, icon: draft.icon, type: draft.type, budget },
    };
  }

  function countCategoryUsage(data, id) {
    return data.movements.filter((m) => m.kind === 'expense' && m.categoryId === id).length;
  }

  /** Elimina la categoría y reasigna sus gastos a `reassignTo` (id o null = "Sin categoría"). */
  function deleteCategory(data, id, reassignTo) {
    if (reassignTo === id) throw new Error('No se puede reasignar a la misma categoría.');
    if (reassignTo !== null && !data.categories.some((c) => c.id === reassignTo)) {
      throw new Error('La categoría de destino no existe.');
    }
    data.movements.forEach((m) => {
      if (m.kind === 'expense' && m.categoryId === id) {
        m.categoryId = reassignTo;
        m.updatedAt = nowISO();
      }
    });
    data.categories = data.categories.filter((c) => c.id !== id);
  }

  function categoryById(data, id) {
    return data.categories.find((c) => c.id === id) || null;
  }

  /* ------------------------------------------------------------------ */
  /* Movimientos                                                         */
  /* ------------------------------------------------------------------ */

  /**
   * draft: { kind, amountText, currency, rateText, date, description,
   *          categoryId, incomeType, periodYm, periodHalf }
   * existing: movimiento que se edita (o null).
   */
  function buildMovement(draft, data, existing) {
    const errors = {};
    const profile = data.profile;

    if (!KINDS.includes(draft.kind)) errors.kind = 'Elige el tipo de movimiento.';

    const amount = Money.parse(draft.amountText);
    if (!clean(draft.amountText)) errors.amount = 'Escribe el monto.';
    else if (!amount) errors.amount = 'Escribe un monto válido mayor que cero.';

    if (!isCurrency(draft.currency)) errors.currency = 'Elige una moneda.';

    if (!Dates.isValidISODate(draft.date)) errors.date = 'Escribe una fecha válida.';

    const description = clean(draft.description);
    if (description.length > 140) errors.description = 'Máximo 140 caracteres.';

    // Tipo de cambio: obligatorio si la moneda no es la principal.
    let rate = null;
    if (draft.currency !== profile.currency) {
      const r = parseRate(draft.rateText);
      if (r.error) errors.rate = r.error;
      else if (!r.rate) errors.rate = 'Indica el tipo de cambio para convertir este movimiento.';
      else rate = r.rate;
    } else {
      // En la moneda principal se guarda la tasa vigente (o la que ya tenía),
      // por si en el futuro cambia la moneda principal.
      rate = existing && existing.rate ? existing.rate : profile.exchangeRate;
    }

    let categoryId = null;
    if (draft.kind === 'expense' && draft.categoryId) {
      if (!categoryById(data, draft.categoryId)) errors.categoryId = 'La categoría no existe.';
      else categoryId = draft.categoryId;
    }

    let incomeType;
    let period;
    if (draft.kind === 'income') {
      if (!INCOME_TYPES.includes(draft.incomeType)) errors.incomeType = 'Elige el tipo de ingreso.';
      incomeType = draft.incomeType;
      period = { ym: draft.periodYm, half: Number(draft.periodHalf) };
      if (!Dates.isValidYm(period.ym) || ![1, 2].includes(period.half)) errors.period = 'Elige un período válido.';
    }

    if (Object.keys(errors).length) return { errors };

    const now = nowISO();
    const movement = {
      id: existing ? existing.id : uid(),
      kind: draft.kind,
      amount,
      currency: draft.currency,
      rate,
      date: draft.date,
      description,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };
    if (draft.kind === 'income') Object.assign(movement, { incomeType, period });
    if (draft.kind === 'expense') movement.categoryId = categoryId;
    return { errors: null, movement };
  }

  function upsertMovement(data, movement) {
    const i = data.movements.findIndex((m) => m.id === movement.id);
    if (i === -1) data.movements.push(movement);
    else data.movements[i] = movement;
  }

  function deleteMovement(data, id) {
    data.movements = data.movements.filter((m) => m.id !== id);
  }

  function sortMovements(list) {
    return list.slice().sort((a, b) => (b.date.localeCompare(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /* ------------------------------------------------------------------ */
  /* Cálculos                                                            */
  /* ------------------------------------------------------------------ */

  /** Valor del movimiento en la moneda principal, usando SU tasa guardada. */
  function valueInMain(m, mainCurrency) {
    return Money.convert(m.amount, m.currency, mainCurrency, m.rate);
  }

  /** Ingresos por su período asignado; gastos y ahorros por su fecha. */
  function movementsInPeriod(data, p) {
    return data.movements.filter((m) => (m.kind === 'income'
      ? Dates.incomePeriodInPeriod(m.period, p)
      : Dates.dateInPeriod(m.date, p)));
  }

  function summarize(data, p) {
    const main = data.profile.currency;
    const list = movementsInPeriod(data, p);
    const totals = { income: 0, expense: 0, saving: 0 };
    const byCat = new Map();
    let missingRate = 0;

    list.forEach((m) => {
      const v = valueInMain(m, main);
      if (v === null) { missingRate += 1; return; }
      totals[m.kind] += v;
      if (m.kind === 'expense') {
        const key = m.categoryId || null;
        byCat.set(key, (byCat.get(key) || 0) + v);
      }
    });

    const byCategory = Array.from(byCat, ([categoryId, total]) => ({ categoryId, total }))
      .sort((a, b) => b.total - a.total);

    return {
      count: list.length,
      movements: list,
      income: totals.income,
      expense: totals.expense,
      saving: totals.saving,
      // Saldo disponible = ingresos − gastos − ahorro reservado
      available: totals.income - totals.expense - totals.saving,
      byCategory,
      missingRate,
    };
  }

  /** Presupuesto mensual convertido a la moneda principal; mitad en vista quincenal. */
  function budgetForPeriod(cat, mode, profile) {
    if (!cat.budget) return null;
    const monthly = Money.convert(cat.budget.amount, cat.budget.currency, profile.currency, profile.exchangeRate);
    if (monthly === null) return null;
    return mode === 'half' ? Math.round(monthly / 2) : monthly;
  }

  L.Model = {
    SCHEMA_VERSION, KINDS, uid, createEmpty, defaultCategories, migrate, validate,
    buildProfile, buildCategory, countCategoryUsage, deleteCategory, categoryById,
    buildMovement, upsertMovement, deleteMovement, sortMovements,
    valueInMain, movementsInPeriod, summarize, budgetForPeriod,
  };
})(globalThis.LifeOS = globalThis.LifeOS || {});
