/*
 * dates.js — Fechas y períodos.
 * Las fechas se manejan como texto "AAAA-MM-DD" (fecha local, sin hora),
 * así se evitan desfases por zona horaria.
 *
 * Un período de vista es { mode: 'month' | 'half', y, m, half }.
 *  - month: todo el mes.
 *  - half: 1 = días 1–15, 2 = día 16 al último día del mes.
 */
(function (L) {
  'use strict';

  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
    'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  const pad = (n) => String(n).padStart(2, '0');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseISO(s) {
    const [y, m, d] = s.split('-').map(Number);
    return { y, m, d };
  }

  /** m va de 1 a 12. */
  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function isValidISODate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const { y, m, d } = parseISO(s);
    return y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth(y, m);
  }

  function ymKey(y, m) {
    return `${y}-${pad(m)}`;
  }

  function isValidYm(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}$/.test(s)) return false;
    const [y, m] = s.split('-').map(Number);
    return y >= 2000 && y <= 2100 && m >= 1 && m <= 12;
  }

  const halfOfDay = (d) => (d <= 15 ? 1 : 2);

  /** Período sugerido para un ingreso según su fecha. */
  function suggestIncomePeriod(dateStr) {
    const { y, m, d } = parseISO(dateStr);
    return { ym: ymKey(y, m), half: halfOfDay(d) };
  }

  function periodFromDate(dateStr, mode) {
    const { y, m, d } = parseISO(dateStr);
    return { mode, y, m, half: halfOfDay(d) };
  }

  function shiftPeriod(p, dir) {
    let { y, m, half } = p;
    if (p.mode === 'month') {
      m += dir;
    } else {
      half += dir;
      if (half < 1) { half = 2; m -= 1; }
      if (half > 2) { half = 1; m += 1; }
    }
    if (m < 1) { m = 12; y -= 1; }
    if (m > 12) { m = 1; y += 1; }
    return { mode: p.mode, y, m, half };
  }

  function periodRange(p) {
    const ym = ymKey(p.y, p.m);
    const last = `${ym}-${pad(daysInMonth(p.y, p.m))}`;
    if (p.mode === 'month') return { start: `${ym}-01`, end: last };
    return p.half === 1 ? { start: `${ym}-01`, end: `${ym}-15` } : { start: `${ym}-16`, end: last };
  }

  function dateInPeriod(dateStr, p) {
    const r = periodRange(p);
    return dateStr >= r.start && dateStr <= r.end;
  }

  /** ¿El período asignado a un ingreso ({ym, half}) cae dentro del período de vista? */
  function incomePeriodInPeriod(ip, p) {
    if (!ip || ip.ym !== ymKey(p.y, p.m)) return false;
    return p.mode === 'month' || ip.half === p.half;
  }

  function samePeriod(a, b) {
    return a.mode === b.mode && a.y === b.y && a.m === b.m && (a.mode === 'month' || a.half === b.half);
  }

  function periodLabel(p) {
    const month = `${cap(MONTHS[p.m - 1])} ${p.y}`;
    if (p.mode === 'month') return month;
    return `${p.half === 1 ? '1.ª' : '2.ª'} quincena · ${month}`;
  }

  function incomePeriodLabel(ip, frequency) {
    const [y, m] = ip.ym.split('-').map(Number);
    const month = `${MONTHS_SHORT[m - 1]} ${y}`;
    if (frequency === 'monthly') return month;
    return `${ip.half === 1 ? '1.ª' : '2.ª'} quinc. ${month}`;
  }

  function formatDate(s) {
    const { y, m, d } = parseISO(s);
    return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
  }

  L.Dates = {
    MONTHS, pad, cap, todayISO, parseISO, daysInMonth, isValidISODate, ymKey, isValidYm,
    suggestIncomePeriod, periodFromDate, shiftPeriod, periodRange, dateInPeriod,
    incomePeriodInPeriod, samePeriod, periodLabel, incomePeriodLabel, formatDate,
  };
})(globalThis.LifeOS = globalThis.LifeOS || {});
