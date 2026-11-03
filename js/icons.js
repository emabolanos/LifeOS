/*
 * icons.js — Íconos de línea para categorías (SVG 24×24, trazo).
 * Las categorías guardan la clave del ícono (ej.: "fuel").
 * EMOJI_MAP traduce los emoji de la primera versión a su ícono equivalente,
 * así los datos existentes se ven bien sin tener que modificarlos.
 */
(function (L) {
  'use strict';

  const CATEGORY = [
    ['banknote', 'Billetes', '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>'],
    ['coins', 'Monedas', '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/><path d="m16.7 13.9.7.7-2.8 2.8"/>'],
    ['card', 'Tarjeta', '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>'],
    ['piggy', 'Alcancía', '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"/><path d="M15.5 11h.01"/>'],
    ['receipt', 'Recibo', '<path d="M5 2v20l2.5-1.5L10 22l2-1.5 2 1.5 2.5-1.5L19 22V2l-2.5 1.5L14 2l-2 1.5L10 2 7.5 3.5z"/><path d="M9 8h6M9 12h6M9 16h4"/>'],
    ['cart', 'Compras', '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3H5l2.2 11.2a2 2 0 0 0 2 1.6h8.4a2 2 0 0 0 2-1.5L21.5 7H6"/>'],
    ['dumbbell', 'Gimnasio', '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'],
    ['phone', 'Teléfono', '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>'],
    ['fuel', 'Gasolina', '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'],
    ['home', 'Casa', '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],
    ['bolt', 'Electricidad', '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'],
    ['droplet', 'Agua', '<path d="M12 2.7s-6.5 7-6.5 11.3a6.5 6.5 0 0 0 13 0c0-4.3-6.5-11.3-6.5-11.3z"/>'],
    ['wifi', 'Internet', '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0M12 20h.01"/>'],
    ['bus', 'Transporte', '<rect x="4" y="3" width="16" height="15" rx="2.5"/><path d="M4 11h16M8 18v3M16 18v3M8 14.5h.01M16 14.5h.01"/>'],
    ['car', 'Carro', '<path d="M5 17H3v-5l2.2-5.2A2 2 0 0 1 7 5.5h10a2 2 0 0 1 1.8 1.3L21 12v5h-2M3 12h18M9.5 17h5"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>'],
    ['utensils', 'Comida', '<path d="M5 2v7a2 2 0 0 0 4 0V2M7 11v11M17 22V2c-2.5 1-4 3.5-4 7v4h4"/>'],
    ['coffee', 'Café', '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 2v2.5M12 2v2.5"/>'],
    ['education', 'Educación', '<path d="M2 9.5 12 5l10 4.5-10 4.5z"/><path d="M6 11.5V16c3.5 2.5 8.5 2.5 12 0v-4.5M22 9.5v5"/>'],
    ['health', 'Salud', '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>'],
    ['pill', 'Medicinas', '<path d="M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7z"/><path d="m8.5 8.5 7 7"/>'],
    ['shirt', 'Ropa', '<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0z"/>'],
    ['film', 'Entretenimiento', '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>'],
    ['gamepad', 'Juegos', '<rect x="2.5" y="7" width="19" height="11" rx="4"/><path d="M7 11v3M5.5 12.5h3M15 12h.01M17.5 13.5h.01"/>'],
    ['plane', 'Viajes', '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'],
    ['paw', 'Mascotas', '<circle cx="6.5" cy="10" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/><circle cx="9.5" cy="5.5" r="1.8"/><circle cx="14.5" cy="5.5" r="1.8"/><path d="M12 12c-3 0-5.5 3.5-5.5 6 0 1.5 1 2.5 2.5 2.5 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.5 0 2.5-1 2.5-2.5 0-2.5-2.5-6-5.5-6z"/>'],
    ['gift', 'Regalos', '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>'],
    ['box', 'Otros', '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'],
  ];

  const PATHS = {};
  const LABELS = {};
  CATEGORY.forEach(([key, label, path]) => { PATHS[key] = path; LABELS[key] = label; });

  const EMOJI_MAP = {
    '🏋️': 'dumbbell', '📱': 'phone', '⛽': 'fuel', '🛒': 'cart', '🏠': 'home', '💡': 'bolt',
    '💧': 'droplet', '🌐': 'wifi', '🚌': 'bus', '🚗': 'car', '🍽️': 'utensils', '☕': 'coffee',
    '🎓': 'education', '🩺': 'health', '💊': 'pill', '👕': 'shirt', '🎬': 'film', '🎮': 'gamepad',
    '✈️': 'plane', '🐾': 'paw', '🎁': 'gift', '💳': 'card', '🧾': 'receipt', '📦': 'box',
  };

  /** Clave de ícono para un valor guardado (clave o emoji antiguo); null si no se conoce. */
  function resolve(value) {
    if (PATHS[value]) return value;
    return EMOJI_MAP[value] || null;
  }

  L.Icons = { CATEGORY: CATEGORY.map(([key, label]) => ({ key, label })), PATHS, LABELS, resolve };
})(globalThis.LifeOS = globalThis.LifeOS || {});
