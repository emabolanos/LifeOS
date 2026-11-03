/*
 * money.js — Montos en enteros (céntimos), conversión y formato.
 * Todos los montos se guardan como enteros en la unidad mínima de su moneda.
 * El tipo de cambio se guarda como entero: céntimos de colón por 1 dólar
 * (ej.: ₡505,25 por US$1 → 50525).
 */
(function (L) {
  'use strict';

  const CURRENCIES = {
    CRC: { code: 'CRC', label: 'Colones (₡)', short: '₡' },
    USD: { code: 'USD', label: 'Dólares (US$)', short: 'US$' },
  };

  const MAX_CENTS = 1e13; // límite razonable (100 mil millones)

  /**
   * Convierte texto escrito por el usuario a céntimos.
   * Acepta "12500", "12 500", "12.500", "12500,50", "12500.50", "₡12 500,5".
   * Devuelve null si el texto no es un monto válido.
   */
  function parse(input) {
    const s = String(input == null ? '' : input).trim().replace(/[\s ₡$]|US/g, '');
    if (!s) return null;

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    let decSep = null;

    if (lastComma > -1 && lastDot > -1) {
      decSep = lastComma > lastDot ? ',' : '.';
    } else if (lastComma > -1) {
      // una sola coma seguida de 1–2 dígitos = decimal; si no, separador de miles
      decSep = /^[^,]*,\d{1,2}$/.test(s) ? ',' : null;
    } else if (lastDot > -1) {
      decSep = /^[^.]*\.\d{1,2}$/.test(s) ? '.' : null;
    }

    let intPart = s;
    let decPart = '';
    if (decSep) {
      const i = s.lastIndexOf(decSep);
      intPart = s.slice(0, i);
      decPart = s.slice(i + 1);
    }
    // Si hay separadores de miles, los grupos deben ser de 3 dígitos (1.234.567)
    if (/[.,]/.test(intPart) && !/^\d{1,3}([.,]\d{3})+$/.test(intPart)) return null;
    intPart = intPart.replace(/[.,]/g, '');
    if (intPart === '') intPart = '0';
    if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(decPart)) return null;

    const cents = parseInt(intPart, 10) * 100 + parseInt((decPart + '00').slice(0, 2), 10);
    if (!Number.isSafeInteger(cents) || cents >= MAX_CENTS) return null;
    return cents;
  }

  /** Céntimos → texto editable ("12500,5" → "12500,50"; "12500,00" → "12500"). */
  function toInputText(cents) {
    if (cents == null) return '';
    const int = Math.floor(cents / 100);
    const dec = cents % 100;
    return dec ? `${int},${String(dec).padStart(2, '0')}` : String(int);
  }

  const formatters = {};
  function getFormatter(currency, digits) {
    const key = currency + digits;
    if (!formatters[key]) {
      formatters[key] = new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    }
    return formatters[key];
  }

  /** Céntimos → texto para mostrar ("₡12 500", "$45,90"). */
  function format(cents, currency) {
    if (cents == null || !Number.isFinite(cents)) return '—';
    const digits = currency === 'USD' || cents % 100 !== 0 ? 2 : 0;
    return getFormatter(currency, digits).format(cents / 100);
  }

  /**
   * Convierte un monto entre CRC y USD con un tipo de cambio entero
   * (céntimos de colón por 1 dólar). Devuelve null si falta la tasa.
   */
  function convert(cents, from, to, rate) {
    if (from === to) return cents;
    if (!Number.isSafeInteger(rate) || rate <= 0) return null;
    if (from === 'USD' && to === 'CRC') return Math.round((cents * rate) / 100);
    if (from === 'CRC' && to === 'USD') return Math.round((cents * 100) / rate);
    return null;
  }

  function formatRate(rate) {
    return rate ? `${format(rate, 'CRC')} por US$1` : 'Sin definir';
  }

  L.Money = { CURRENCIES, MAX_CENTS, parse, toInputText, format, convert, formatRate };
})(globalThis.LifeOS = globalThis.LifeOS || {});
