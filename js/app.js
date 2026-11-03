/*
 * app.js — Interfaz: navegación, vistas, formularios y diálogos.
 * Usa Model para la lógica y Storage para guardar.
 */
(function (L) {
  'use strict';

  const { Money, Dates, Model, Storage, Icons } = L;

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'movements', label: 'Movimientos', icon: 'list' },
    { id: 'categories', label: 'Categorías', icon: 'tag' },
    { id: 'profile', label: 'Mi perfil', icon: 'user' },
  ];
  const KIND_LABEL = { income: 'Ingreso', expense: 'Gasto', saving: 'Ahorro' };
  const KIND_TITLE = { income: 'ingreso', expense: 'gasto', saving: 'ahorro' };

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 15V3M7 8l5-5 5 5M5 21h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    income: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    expense: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    saving: '<path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2z"/><path d="M15.5 11h.01"/>',
    wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  };
  Object.assign(ICONS, Icons.PATHS);
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;

  /** Ícono de una categoría (o de "Sin categoría" si c es null). */
  function catIcon(c) {
    if (!c) return icon('box');
    const key = Icons.resolve(c.icon);
    return key ? icon(key) : `<span class="emoji">${esc(c.icon)}</span>`;
  }

  function hydrateIcons(root = document) {
    $$('[data-icon]', root).forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
  }

  /* ------------------------------------------------------------------ */
  /* Estado y persistencia                                               */
  /* ------------------------------------------------------------------ */

  const state = {
    data: null,
    view: 'dashboard',
    period: null,
    filters: { q: '', kind: 'all', category: 'all' },
  };

  const profile = () => state.data.profile;
  const mainCur = () => state.data.profile.currency;
  const fmt = (cents, cur) => Money.format(cents, cur || mainCur());

  /** Aplica un cambio, lo guarda y vuelve a dibujar. Si no se puede guardar, lo revierte. */
  function commit(mutate, message) {
    const before = JSON.stringify(state.data);
    try {
      mutate(state.data);
      Storage.save(state.data);
    } catch (e) {
      console.error(e);
      state.data = JSON.parse(before);
      toast(e && e.name === 'QuotaExceededError'
        ? 'No hay espacio para guardar. Exporta un respaldo y libera espacio en el navegador.'
        : `No se pudo guardar: ${e.message || 'error desconocido'}`, 'error');
      render();
      return false;
    }
    render();
    if (message) toast(message);
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Avisos y diálogos                                                   */
  /* ------------------------------------------------------------------ */

  function toast(message, type = 'ok') {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    if (type === 'error') el.setAttribute('role', 'alert');
    el.textContent = message;
    $('#toasts').appendChild(el);
    setTimeout(() => el.classList.add('toast--out'), type === 'error' ? 5200 : 2800);
    setTimeout(() => el.remove(), type === 'error' ? 5600 : 3200);
  }

  function openDialog(dlg) {
    if (!dlg.open) dlg.showModal();
  }

  function closeDialog(dlg) {
    if (dlg && dlg.open) dlg.close();
  }

  /** Diálogo de confirmación. Con alertOnly muestra solo "Entendido". */
  function confirmDialog({ title, message, confirmText = 'Confirmar', danger = false, alertOnly = false }) {
    return new Promise((resolve) => {
      const dlg = $('#confirm-dialog');
      $('#confirm-title').textContent = title;
      $('#confirm-message').textContent = message;
      const ok = $('#confirm-ok');
      ok.textContent = alertOnly ? 'Entendido' : confirmText;
      ok.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      $('#confirm-cancel').hidden = alertOnly;
      dlg.returnValue = '';
      dlg.addEventListener('close', () => resolve(dlg.returnValue === 'confirm'), { once: true });
      openDialog(dlg);
      (alertOnly ? ok : $('#confirm-cancel')).focus();
    });
  }

  function showErrors(form, errors) {
    $$('[data-error-for]', form).forEach((el) => {
      const msg = (errors && errors[el.dataset.errorFor]) || '';
      el.textContent = msg;
      const field = el.closest('.field');
      const input = field && field.querySelector('input:not([type=radio]):not([type=checkbox]), select');
      if (input) {
        if (msg) {
          input.setAttribute('aria-invalid', 'true');
          if (!el.id) el.id = `err-${Math.random().toString(36).slice(2, 8)}`;
          input.setAttribute('aria-describedby', el.id);
        } else {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
        }
      }
    });
    const first = errors && form.querySelector('[aria-invalid="true"]');
    if (first) first.focus();
  }

  /* ------------------------------------------------------------------ */
  /* Navegación y estructura                                             */
  /* ------------------------------------------------------------------ */

  function renderNav() {
    $('#nav').innerHTML = VIEWS.map((v) => `
      <button type="button" class="nav-item" data-view="${v.id}" ${state.view === v.id ? 'aria-current="page"' : ''}>
        ${icon(v.icon)}<span>${v.label}</span>
      </button>`).join('');
  }

  function go(view) {
    state.view = view;
    render();
    window.scrollTo(0, 0);
    $('#view-title').focus({ preventScroll: true });
  }

  function render() {
    renderNav();
    const v = VIEWS.find((x) => x.id === state.view);
    $('#view-title').textContent = v.label;
    document.title = `${v.label} · LifeOS`;
    const view = $('#view');
    if (state.view === 'dashboard') view.innerHTML = renderDashboard();
    if (state.view === 'movements') { view.innerHTML = renderMovementsView(); updateMovementList(); }
    if (state.view === 'categories') view.innerHTML = renderCategories();
    if (state.view === 'profile') view.innerHTML = renderProfile();
  }

  /* ------------------------------------------------------------------ */
  /* Selector de período                                                 */
  /* ------------------------------------------------------------------ */

  const defaultMode = () => (profile().salaryFrequency === 'biweekly' ? 'half' : 'month');
  const currentPeriod = (mode) => Dates.periodFromDate(Dates.todayISO(), mode);
  const isCurrentPeriod = (p) => Dates.samePeriod(p, currentPeriod(p.mode));

  function setMode(mode) {
    const p = state.period;
    if (p.mode === mode) return;
    const today = currentPeriod(mode);
    const sameMonth = today.y === p.y && today.m === p.m;
    state.period = { mode, y: p.y, m: p.m, half: mode === 'half' ? (sameMonth ? today.half : 1) : p.half };
  }

  function periodBar() {
    const p = state.period;
    return `
      <div class="period-bar">
        <div class="segmented" role="group" aria-label="Vista por período">
          <button type="button" data-action="period-mode" data-mode="month" aria-pressed="${p.mode === 'month'}">Mensual</button>
          <button type="button" data-action="period-mode" data-mode="half" aria-pressed="${p.mode === 'half'}">Quincenal</button>
        </div>
        <div class="period-nav">
          <button type="button" class="icon-btn" data-action="period-prev" aria-label="Período anterior">${icon('left')}</button>
          <span class="period-label" aria-live="polite">${esc(Dates.periodLabel(p))}</span>
          <button type="button" class="icon-btn" data-action="period-next" aria-label="Período siguiente">${icon('right')}</button>
        </div>
        ${isCurrentPeriod(p) ? '' : '<button type="button" class="link-btn" data-action="period-today">Ir al período actual</button>'}
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* Filas de movimientos                                                */
  /* ------------------------------------------------------------------ */

  function movementTitle(m) {
    if (m.description) return m.description;
    if (m.kind === 'expense') {
      const c = Model.categoryById(state.data, m.categoryId);
      return c ? c.name : 'Gasto';
    }
    if (m.kind === 'income') return m.incomeType === 'salary' ? 'Salario' : 'Ingreso';
    return 'Ahorro';
  }

  function movementMeta(m) {
    const parts = [Dates.formatDate(m.date)];
    if (m.kind === 'expense') {
      const c = Model.categoryById(state.data, m.categoryId);
      parts.push(c ? c.name : 'Sin categoría');
    } else if (m.kind === 'income') {
      parts.push(m.incomeType === 'salary' ? 'Salario' : 'Otro ingreso');
      parts.push(Dates.incomePeriodLabel(m.period, profile().salaryFrequency));
    } else {
      parts.push('Ahorro');
    }
    return parts.join(' · ');
  }

  function movementBadge(m) {
    if (m.kind === 'expense') {
      const c = Model.categoryById(state.data, m.categoryId);
      return `<span class="mv-badge mv-badge--expense" aria-hidden="true">${catIcon(c)}</span>`;
    }
    return `<span class="mv-badge mv-badge--${m.kind}" aria-hidden="true">${icon(m.kind)}</span>`;
  }

  function movementRow(m, withActions) {
    const sign = m.kind === 'income' ? '+' : m.kind === 'expense' ? '−' : '';
    const converted = m.currency !== mainCur() ? Model.valueInMain(m, mainCur()) : null;
    let sub = '';
    if (m.currency !== mainCur()) {
      sub = converted === null
        ? '<span class="mv-sub mv-sub--warn">Falta tipo de cambio</span>'
        : `<span class="mv-sub">≈ ${fmt(converted)} · ${esc(Money.formatRate(m.rate))}</span>`;
    }
    const title = movementTitle(m);
    return `
      <li class="mv-row">
        ${movementBadge(m)}
        <div class="mv-main">
          <span class="mv-title">${esc(title)}</span>
          <span class="mv-meta">${esc(movementMeta(m))}</span>
        </div>
        <div class="mv-amount">
          <span class="amt amt--${m.kind}"><span class="sr-only">${KIND_LABEL[m.kind]}: </span>${sign}${fmt(m.amount, m.currency)}</span>
          ${sub}
        </div>
        ${withActions ? `
        <div class="mv-actions">
          <button type="button" class="icon-btn" data-action="edit-movement" data-id="${esc(m.id)}" aria-label="Editar ${esc(title)}">${icon('edit')}</button>
          <button type="button" class="icon-btn icon-btn--danger" data-action="delete-movement" data-id="${esc(m.id)}" aria-label="Eliminar ${esc(title)}">${icon('trash')}</button>
        </div>` : ''}
      </li>`;
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard                                                           */
  /* ------------------------------------------------------------------ */

  function renderDashboard() {
    const p = state.period;
    const prof = profile();
    const s = Model.summarize(state.data, p);
    const name = prof.displayName || prof.name;
    const when = isCurrentPeriod(p)
      ? (p.mode === 'month' ? 'este mes' : 'esta quincena')
      : `en ${p.mode === 'month' ? Dates.periodLabel(p).toLowerCase() : `la ${Dates.periodLabel(p).replace(' · ', ' de ').toLowerCase()}`}`;

    const greeting = `
      <div class="greeting">
        <h2>Hola, ${esc(name)}.</h2>
        <p>Así están tus finanzas ${esc(when)}.</p>
      </div>`;

    if (s.count === 0) {
      return `${greeting}${periodBar()}
        <section class="empty card">
          <div class="empty-art" aria-hidden="true">${icon('wallet')}</div>
          <h3>Aún no hay movimientos en este período</h3>
          <p class="muted">Empieza registrando tu salario y luego tus gastos. Verás aquí tu saldo disponible, en qué gastas más y cómo vas con tus presupuestos.</p>
          <div class="btn-row btn-row--center">
            <button type="button" class="btn btn-primary" data-action="new-movement" data-kind="income">${icon('income')}Registrar ingreso</button>
            <button type="button" class="btn btn-secondary" data-action="new-movement" data-kind="expense">${icon('expense')}Registrar gasto</button>
          </div>
        </section>`;
    }

    const negative = s.available < 0;
    const summary = `
      <section class="summary" aria-label="Resumen del período">
        <article class="card hero ${negative ? 'hero--negative' : ''}">
          <p class="card-label">Saldo disponible</p>
          <p class="hero-amount">${fmt(s.available)}</p>
          <p class="hero-foot">${negative ? 'Gastaste y reservaste más de lo que ingresó en este período.' : 'Ingresos − gastos − ahorro reservado'}</p>
        </article>
        ${statCard('income', 'Ingresos', s.income)}
        ${statCard('expense', 'Gastos', s.expense)}
        ${statCard('saving', 'Ahorro reservado', s.saving)}
      </section>`;

    const warn = s.missingRate
      ? `<p class="notice notice--warn">${icon('alert')}<span>${s.missingRate} movimiento(s) no tienen tipo de cambio guardado y no se incluyen en los totales. Edítalos en Movimientos para agregarlo.</span></p>`
      : '';

    // Distribución por categoría
    const maxCat = s.byCategory.length ? s.byCategory[0].total : 0;
    const dist = s.byCategory.length
      ? `<ul class="dist">${s.byCategory.map((row, i) => {
        const c = Model.categoryById(state.data, row.categoryId);
        const pct = s.expense ? Math.round((row.total / s.expense) * 100) : 0;
        const w = maxCat ? Math.max(2, Math.round((row.total / maxCat) * 100)) : 0;
        return `
          <li class="dist-row">
            <span class="dist-icon" aria-hidden="true">${catIcon(c)}</span>
            <div class="dist-body">
              <div class="dist-top"><span class="dist-name">${esc(c ? c.name : 'Sin categoría')}</span><span class="dist-amt">${fmt(row.total)}</span></div>
              <div class="bar ${i === 0 ? 'bar--top' : ''}" role="presentation"><span style="width:${w}%"></span></div>
            </div>
            <span class="dist-pct">${pct}%</span>
          </li>`;
      }).join('')}</ul>`
      : '<p class="muted small">Sin gastos en este período.</p>';

    // Presupuestos
    const spentByCat = new Map(s.byCategory.map((r) => [r.categoryId, r.total]));
    const budgeted = state.data.categories.filter((c) => c.budget);
    const budgets = budgeted.length
      ? `<ul class="budgets">${budgeted.map((c) => {
        const limit = Model.budgetForPeriod(c, p.mode, profile());
        const spent = spentByCat.get(c.id) || 0;
        if (limit === null) {
          return `<li class="budget-row"><div class="dist-top"><span class="dist-name"><span class="inline-icon" aria-hidden="true">${catIcon(c)}</span>${esc(c.name)}</span></div><p class="small muted">Configura el tipo de cambio en Mi perfil para comparar este presupuesto.</p></li>`;
        }
        const pct = Math.round((spent / limit) * 100);
        const over = spent > limit;
        const state_ = over ? 'over' : pct >= 85 ? 'near' : 'ok';
        return `
          <li class="budget-row">
            <div class="dist-top"><span class="dist-name"><span class="inline-icon" aria-hidden="true">${catIcon(c)}</span>${esc(c.name)}</span><span class="dist-amt">${fmt(spent)} <span class="muted">de ${fmt(limit)}</span></span></div>
            <div class="bar bar--${state_}" role="progressbar" aria-label="Presupuesto de ${esc(c.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(pct, 100)}"><span style="width:${Math.min(100, pct)}%"></span></div>
            <p class="small budget-status budget-status--${state_}">${over ? `Excedido por ${fmt(spent - limit)}` : `Quedan ${fmt(limit - spent)} · ${pct}% usado`}</p>
          </li>`;
      }).join('')}</ul>
      ${p.mode === 'half' ? '<p class="hint">En la vista quincenal se muestra la mitad del presupuesto mensual.</p>' : ''}`
      : `<p class="muted small">Ninguna categoría tiene presupuesto.</p>
         <button type="button" class="link-btn" data-view="categories">Definir presupuestos</button>`;

    const recent = Model.sortMovements(s.movements).slice(0, 6);

    return `${greeting}${periodBar()}${summary}${warn}
      <div class="dash-grid">
        <section class="card" aria-labelledby="h-dist">
          <h3 id="h-dist">Gasto por categoría</h3>
          ${dist}
        </section>
        <section class="card" aria-labelledby="h-budget">
          <h3 id="h-budget">Presupuestos</h3>
          ${budgets}
        </section>
        <section class="card dash-recent" aria-labelledby="h-recent">
          <div class="card-head">
            <h3 id="h-recent">Movimientos recientes</h3>
            <button type="button" class="link-btn" data-view="movements">Ver todos</button>
          </div>
          <ul class="mv-list">${recent.map((m) => movementRow(m, false)).join('')}</ul>
        </section>
      </div>`;
  }

  function statCard(kind, label, value) {
    return `
      <article class="card stat">
        <span class="stat-icon stat-icon--${kind}" aria-hidden="true">${icon(kind)}</span>
        <div>
          <p class="card-label">${label}</p>
          <p class="stat-amount">${fmt(value)}</p>
        </div>
      </article>`;
  }

  /* ------------------------------------------------------------------ */
  /* Movimientos                                                         */
  /* ------------------------------------------------------------------ */

  function renderMovementsView() {
    const f = state.filters;
    if (f.category !== 'all' && f.category !== 'none' && !Model.categoryById(state.data, f.category)) f.category = 'all';
    const cats = state.data.categories;
    return `${periodBar()}
      <div class="filters" role="search">
        <div class="search">
          ${icon('search')}
          <label class="sr-only" for="f-q">Buscar movimientos</label>
          <input id="f-q" type="search" placeholder="Buscar por descripción o categoría" value="${esc(f.q)}" autocomplete="off">
        </div>
        <label class="sr-only" for="f-kind">Tipo</label>
        <select id="f-kind">
          ${[['all', 'Todos los tipos'], ['income', 'Ingresos'], ['expense', 'Gastos'], ['saving', 'Ahorros']]
            .map(([v, t]) => `<option value="${v}" ${f.kind === v ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
        <label class="sr-only" for="f-cat">Categoría</label>
        <select id="f-cat">
          <option value="all">Todas las categorías</option>
          ${cats.map((c) => `<option value="${esc(c.id)}" ${f.category === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          <option value="none" ${f.category === 'none' ? 'selected' : ''}>Sin categoría</option>
        </select>
      </div>
      <div id="mv-results"></div>`;
  }

  function filteredMovements() {
    const f = state.filters;
    const q = f.q.trim().toLowerCase();
    let list = Model.movementsInPeriod(state.data, state.period);
    if (f.category !== 'all') {
      list = list.filter((m) => m.kind === 'expense' && (f.category === 'none' ? !m.categoryId : m.categoryId === f.category));
    }
    if (f.kind !== 'all') list = list.filter((m) => m.kind === f.kind);
    if (q) {
      list = list.filter((m) => {
        const c = m.kind === 'expense' ? Model.categoryById(state.data, m.categoryId) : null;
        const hay = [m.description, c ? c.name : '', KIND_LABEL[m.kind], m.kind === 'income' && m.incomeType === 'salary' ? 'salario' : '']
          .join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    return Model.sortMovements(list);
  }

  function updateMovementList() {
    const box = $('#mv-results');
    if (!box) return;
    const list = filteredMovements();
    const anyInPeriod = Model.movementsInPeriod(state.data, state.period).length > 0;

    if (!list.length) {
      box.innerHTML = `
        <section class="empty card">
          <div class="empty-art" aria-hidden="true">${icon('list')}</div>
          <h3>${anyInPeriod ? 'Ningún movimiento coincide con los filtros' : 'No hay movimientos en este período'}</h3>
          <p class="muted">${anyInPeriod ? 'Prueba con otra búsqueda o quita los filtros.' : 'Registra un ingreso, un gasto o un ahorro para empezar.'}</p>
          ${anyInPeriod ? '<button type="button" class="btn btn-secondary" data-action="clear-filters">Quitar filtros</button>'
            : `<button type="button" class="btn btn-primary" data-action="new-movement">${icon('plus')}Nuevo movimiento</button>`}
        </section>`;
      return;
    }

    const t = { income: 0, expense: 0, saving: 0 };
    list.forEach((m) => { const v = Model.valueInMain(m, mainCur()); if (v !== null) t[m.kind] += v; });
    const chips = Object.keys(t).filter((k) => list.some((m) => m.kind === k))
      .map((k) => `<span class="chip chip--${k}">${KIND_LABEL[k] === 'Ahorro' ? 'Ahorro' : `${KIND_LABEL[k]}s`}: <strong>${fmt(t[k])}</strong></span>`).join('');

    box.innerHTML = `
      <div class="list-summary"><span class="muted small">${list.length} movimiento(s)</span>${chips}</div>
      <ul class="mv-list mv-list--card card">${list.map((m) => movementRow(m, true)).join('')}</ul>`;
  }

  /* ------------------------------------------------------------------ */
  /* Categorías                                                          */
  /* ------------------------------------------------------------------ */

  function renderCategories() {
    const cats = state.data.categories;
    const month = currentPeriod('month');
    const s = Model.summarize(state.data, month);
    const spent = new Map(s.byCategory.map((r) => [r.categoryId, r.total]));

    const head = `
      <div class="section-head">
        <p class="muted">Organiza tus gastos a tu manera. El ahorro no es una categoría: se registra aparte.</p>
        <button type="button" class="btn btn-primary" data-action="new-category">${icon('plus')}Nueva categoría</button>
      </div>`;

    if (!cats.length) {
      return `${head}
        <section class="empty card">
          <div class="empty-art" aria-hidden="true">${icon('tag')}</div>
          <h3>Todavía no tienes categorías</h3>
          <p class="muted">Crea categorías como Gimnasio, Teléfono o Gasolina para saber en qué se va tu dinero.</p>
          <button type="button" class="btn btn-primary" data-action="new-category">${icon('plus')}Crear categoría</button>
        </section>`;
    }

    return `${head}
      <ul class="cat-grid">
        ${cats.map((c) => {
          const used = Model.countCategoryUsage(state.data, c.id);
          const limit = Model.budgetForPeriod(c, 'month', profile());
          const sp = spent.get(c.id) || 0;
          const budgetLine = c.budget
            ? `<p class="small">Presupuesto: <strong>${fmt(c.budget.amount, c.budget.currency)}</strong> al mes</p>
               ${limit !== null ? `<div class="bar bar--${sp > limit ? 'over' : sp >= limit * 0.85 ? 'near' : 'ok'}" role="presentation"><span style="width:${Math.min(100, Math.round((sp / limit) * 100))}%"></span></div>` : ''}`
            : '<p class="small muted">Sin presupuesto</p>';
          return `
            <li class="card cat-card">
              <div class="cat-top">
                <span class="cat-icon" aria-hidden="true">${catIcon(c)}</span>
                <div class="cat-info">
                  <h3>${esc(c.name)}</h3>
                  <span class="tag">${c.type === 'fixed' ? 'Fijo' : 'Variable'}</span>
                </div>
                <div class="mv-actions">
                  <button type="button" class="icon-btn" data-action="edit-category" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.name)}">${icon('edit')}</button>
                  <button type="button" class="icon-btn icon-btn--danger" data-action="delete-category" data-id="${esc(c.id)}" aria-label="Eliminar ${esc(c.name)}">${icon('trash')}</button>
                </div>
              </div>
              <p class="cat-spent">${fmt(sp)} <span class="muted small">este mes</span></p>
              ${budgetLine}
              <p class="small muted">${used} gasto(s) registrados</p>
            </li>`;
        }).join('')}
      </ul>`;
  }

  /* ------------------------------------------------------------------ */
  /* Perfil                                                              */
  /* ------------------------------------------------------------------ */

  function renderProfile() {
    const p = profile();
    const d = state.data;
    return `
      <div class="profile-grid">
        <section class="card" aria-labelledby="h-profile">
          <h3 id="h-profile">Información personal</h3>
          <form id="profile-form" novalidate>
            <div class="field">
              <label for="pf-name">Nombre</label>
              <input id="pf-name" name="name" type="text" maxlength="60" autocomplete="given-name" value="${esc(p.name)}" required>
              <p class="field-error" data-error-for="name"></p>
            </div>
            <div class="field">
              <label for="pf-display">Nombre para mostrar <span class="optional">(opcional)</span></label>
              <input id="pf-display" name="displayName" type="text" maxlength="40" autocomplete="nickname" value="${esc(p.displayName)}">
              <p class="field-error" data-error-for="displayName"></p>
            </div>
            <div class="field-row field-row--2">
              <div class="field">
                <label for="pf-currency">Moneda principal</label>
                <select id="pf-currency" name="currency">
                  ${Object.values(Money.CURRENCIES).map((c) => `<option value="${c.code}" ${p.currency === c.code ? 'selected' : ''}>${c.label}</option>`).join('')}
                </select>
              </div>
              <div class="field">
                <label for="pf-frequency">Frecuencia salarial</label>
                <select id="pf-frequency" name="salaryFrequency">
                  <option value="monthly" ${p.salaryFrequency === 'monthly' ? 'selected' : ''}>Mensual</option>
                  <option value="biweekly" ${p.salaryFrequency === 'biweekly' ? 'selected' : ''}>Quincenal</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label for="pf-rate">Tipo de cambio (₡ por US$1) <span class="optional">(opcional)</span></label>
              <input id="pf-rate" name="rate" type="text" inputmode="decimal" autocomplete="off" placeholder="Ej.: 505,25" value="${esc(Money.toInputText(p.exchangeRate))}">
              <p class="hint">Se usa para los movimientos nuevos en otra moneda. Cambiarlo no modifica movimientos ya registrados.</p>
              <p class="field-error" data-error-for="rate"></p>
            </div>
            <button type="submit" class="btn btn-primary">Guardar cambios</button>
          </form>
        </section>

        <section class="card" aria-labelledby="h-data">
          <h3 id="h-data">Tus datos</h3>
          <p class="notice">${icon('lock')}<span>Tus datos se guardan <strong>solo en este navegador</strong>. No se envían a ningún servidor ni se sincronizan entre dispositivos. Exporta un respaldo de vez en cuando para no perderlos.</span></p>
          <dl class="data-stats">
            <div><dt>Movimientos</dt><dd>${d.movements.length}</dd></div>
            <div><dt>Categorías</dt><dd>${d.categories.length}</dd></div>
          </dl>
          <div class="btn-row">
            <button type="button" class="btn btn-secondary" data-action="export">${icon('download')}Exportar respaldo</button>
            <button type="button" class="btn btn-secondary" data-action="import">${icon('upload')}Importar respaldo</button>
          </div>
          ${d.legacy ? '<p class="hint">Se conservan datos de una versión anterior de LifeOS. No se usan, pero se incluyen en los respaldos exportados.</p>' : ''}
        </section>
      </div>`;
  }

  function saveProfile(form) {
    const fd = new FormData(form);
    const draft = {
      name: fd.get('name'),
      displayName: fd.get('displayName'),
      currency: fd.get('currency'),
      salaryFrequency: fd.get('salaryFrequency'),
      rateText: fd.get('rate'),
    };
    const { errors, profile: next } = Model.buildProfile(draft, profile());
    showErrors(form, errors);
    if (errors) return;
    const freqChanged = next.salaryFrequency !== profile().salaryFrequency;
    if (commit((d) => { d.profile = next; }, 'Perfil actualizado') && freqChanged) {
      setMode(defaultMode());
    }
  }

  /* ------------------------------------------------------------------ */
  /* Diálogo de movimiento                                               */
  /* ------------------------------------------------------------------ */

  const mvState = { editingId: null, periodTouched: false };

  function selectedKind() {
    const r = $('#movement-form input[name="kind"]:checked');
    return r ? r.value : 'expense';
  }

  function setPeriodFields(ym, half) {
    const [y, m] = ym.split('-').map(Number);
    $('#mv-period-month').value = String(m);
    $('#mv-period-year').value = String(y);
    $('#mv-period-half').value = String(half);
  }

  function syncMovementForm() {
    const kind = selectedKind();
    const editing = !!mvState.editingId;
    $('#mv-title').textContent = `${editing ? 'Editar' : 'Nuevo'} ${KIND_TITLE[kind]}`;
    $('#mv-category-field').hidden = kind !== 'expense';
    $('#mv-income-fields').hidden = kind !== 'income';
    const other = $('#mv-currency').value !== mainCur();
    $('#mv-rate-field').hidden = !other;
    if (other && !$('#mv-rate').value && profile().exchangeRate) {
      $('#mv-rate').value = Money.toInputText(profile().exchangeRate);
    }
    $('#mv-period-hint').textContent = profile().salaryFrequency === 'monthly'
      ? 'Se sugiere según la fecha. Con salario mensual, la quincena solo se usa en la vista quincenal.'
      : 'Se sugiere según la fecha (día 1–15 = 1.ª quincena). Cámbialo si el pago corresponde a otro período.';
  }

  function defaultDate() {
    const today = Dates.todayISO();
    return Dates.dateInPeriod(today, state.period) ? today : Dates.periodRange(state.period).start;
  }

  function openMovementDialog(kind, movement) {
    const form = $('#movement-form');
    form.reset();
    showErrors(form, null);
    mvState.editingId = movement ? movement.id : null;
    mvState.periodTouched = !!movement;

    const cats = state.data.categories;
    $('#mv-category').innerHTML = `<option value="">Sin categoría</option>${
      cats.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}`;
    $('#mv-period-month').innerHTML = Dates.MONTHS.map((n, i) => `<option value="${i + 1}">${Dates.cap(n)}</option>`).join('');

    const k = movement ? movement.kind : (kind || 'expense');
    $(`#movement-form input[name="kind"][value="${k}"]`).checked = true;
    $('#mv-amount').value = movement ? Money.toInputText(movement.amount) : '';
    $('#mv-currency').value = movement ? movement.currency : mainCur();
    $('#mv-rate').value = movement && movement.rate ? Money.toInputText(movement.rate) : '';
    $('#mv-date').value = movement ? movement.date : defaultDate();
    $('#mv-description').value = movement ? movement.description : '';
    $('#mv-category').value = movement && movement.kind === 'expense' && movement.categoryId ? movement.categoryId : (cats[0] ? cats[0].id : '');
    $('#mv-income-type').value = movement && movement.incomeType ? movement.incomeType : 'salary';
    const per = movement && movement.period ? movement.period : Dates.suggestIncomePeriod($('#mv-date').value);
    setPeriodFields(per.ym, per.half);

    syncMovementForm();
    openDialog($('#movement-dialog'));
    $('#mv-amount').focus();
  }

  function submitMovement(form) {
    const fd = new FormData(form);
    const draft = {
      kind: fd.get('kind'),
      amountText: fd.get('amount'),
      currency: fd.get('currency'),
      rateText: fd.get('rate'),
      date: fd.get('date'),
      description: fd.get('description'),
      categoryId: fd.get('categoryId'),
      incomeType: fd.get('incomeType'),
      periodYm: `${fd.get('periodYear')}-${Dates.pad(fd.get('periodMonth'))}`,
      periodHalf: fd.get('periodHalf'),
    };
    const existing = mvState.editingId ? state.data.movements.find((m) => m.id === mvState.editingId) : null;
    const { errors, movement } = Model.buildMovement(draft, state.data, existing);
    showErrors(form, errors);
    if (errors) return;
    const label = KIND_LABEL[movement.kind];
    if (commit((d) => Model.upsertMovement(d, movement), `${label} ${existing ? 'actualizado' : 'registrado'}`)) {
      closeDialog($('#movement-dialog'));
    }
  }

  async function deleteMovementFlow(id) {
    const m = state.data.movements.find((x) => x.id === id);
    if (!m) return;
    const ok = await confirmDialog({
      title: `Eliminar ${KIND_TITLE[m.kind]}`,
      message: `¿Eliminar «${movementTitle(m)}» por ${fmt(m.amount, m.currency)} del ${Dates.formatDate(m.date)}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (ok) commit((d) => Model.deleteMovement(d, id), 'Movimiento eliminado');
  }

  /* ------------------------------------------------------------------ */
  /* Diálogos de categoría                                               */
  /* ------------------------------------------------------------------ */

  let editingCategoryId = null;

  function openCategoryDialog(cat) {
    const form = $('#category-form');
    form.reset();
    showErrors(form, null);
    editingCategoryId = cat ? cat.id : null;
    $('#cat-title').textContent = cat ? 'Editar categoría' : 'Nueva categoría';
    const current = (cat && Icons.resolve(cat.icon)) || (cat ? Icons.CATEGORY[0].key : 'banknote');
    $('#cat-icons').innerHTML = Icons.CATEGORY.map(({ key, label }) => `
      <label class="icon-option" title="${esc(label)}">
        <input type="radio" name="icon" value="${key}" ${key === current ? 'checked' : ''} aria-label="${esc(label)}">
        <span aria-hidden="true">${icon(key)}</span>
      </label>`).join('');
    $('#cat-name').value = cat ? cat.name : '';
    $(`#category-form input[name="type"][value="${cat ? cat.type : 'variable'}"]`).checked = true;
    const budgetCur = cat && cat.budget ? cat.budget.currency : mainCur();
    $('#cat-budget').value = cat && cat.budget ? Money.toInputText(cat.budget.amount) : '';
    $('#cat-budget-hint').textContent = `En ${Money.CURRENCIES[mainCur()].label.toLowerCase()}. En la vista quincenal se usa la mitad.${
      budgetCur !== mainCur() ? ` Actualmente está en ${budgetCur}; al guardar quedará en ${mainCur()}.` : ''}`;
    openDialog($('#category-dialog'));
    $('#cat-name').focus();
  }

  function submitCategory(form) {
    const fd = new FormData(form);
    const existing = editingCategoryId ? Model.categoryById(state.data, editingCategoryId) : null;
    const { errors, category } = Model.buildCategory({
      name: fd.get('name'), icon: fd.get('icon'), type: fd.get('type'), budgetText: fd.get('budget'),
    }, state.data, existing);
    showErrors(form, errors);
    if (errors) return;
    const ok = commit((d) => {
      const i = d.categories.findIndex((c) => c.id === category.id);
      if (i === -1) d.categories.push(category); else d.categories[i] = category;
    }, existing ? 'Categoría actualizada' : 'Categoría creada');
    if (ok) closeDialog($('#category-dialog'));
  }

  let deletingCategoryId = null;

  async function deleteCategoryFlow(id) {
    const cat = Model.categoryById(state.data, id);
    if (!cat) return;
    const used = Model.countCategoryUsage(state.data, id);
    if (!used) {
      const ok = await confirmDialog({
        title: 'Eliminar categoría',
        message: `¿Eliminar la categoría «${cat.name}»? No tiene gastos registrados.`,
        confirmText: 'Eliminar',
        danger: true,
      });
      if (ok) commit((d) => Model.deleteCategory(d, id, null), 'Categoría eliminada');
      return;
    }
    deletingCategoryId = id;
    const others = state.data.categories.filter((c) => c.id !== id);
    $('#delcat-message').textContent = `«${cat.name}» tiene ${used} gasto(s) registrados.`;
    $('#delcat-target').innerHTML = others.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
    const reassign = $('#delcat-form input[value="reassign"]');
    reassign.disabled = !others.length;
    $('#delcat-target').disabled = !others.length;
    $('#delcat-reassign-option').classList.toggle('is-disabled', !others.length);
    (others.length ? reassign : $('#delcat-form input[value="none"]')).checked = true;
    openDialog($('#delcat-dialog'));
  }

  function submitDeleteCategory(form) {
    const mode = new FormData(form).get('mode');
    const target = mode === 'reassign' ? $('#delcat-target').value : null;
    const id = deletingCategoryId;
    if (state.filters.category === id) state.filters.category = 'all';
    if (commit((d) => Model.deleteCategory(d, id, target), 'Categoría eliminada')) {
      closeDialog($('#delcat-dialog'));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Exportar / importar                                                 */
  /* ------------------------------------------------------------------ */

  function exportData() {
    const payload = { app: 'LifeOS', exportedAt: new Date().toISOString(), ...state.data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifeos-respaldo-${Dates.todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Respaldo exportado');
  }

  async function importFile(file) {
    const fail = (message) => confirmDialog({ title: 'No se pudo importar', message, alertOnly: true });
    if (file.size > 10 * 1024 * 1024) return fail('El archivo es demasiado grande para ser un respaldo de LifeOS.');

    let raw;
    try {
      raw = JSON.parse(await file.text());
    } catch (e) {
      return fail('El archivo no es un JSON válido. Elige un respaldo exportado desde LifeOS.');
    }

    let data;
    try {
      data = Model.migrate(raw);
    } catch (e) {
      return fail(e.message);
    }
    const errors = Model.validate(data);
    if (!errors.length && !data.profile) errors.push('El respaldo no contiene un perfil.');
    if (errors.length) {
      return fail(`El respaldo no es válido: ${errors[0]}${errors.length > 1 ? ` (y ${errors.length - 1} problema(s) más)` : ''}`);
    }

    const ok = await confirmDialog({
      title: 'Reemplazar tus datos',
      message: `El respaldo contiene ${data.movements.length} movimiento(s) y ${data.categories.length} categoría(s). Tus datos actuales se reemplazarán por completo. Si quieres conservarlos, exporta antes un respaldo.`,
      confirmText: 'Reemplazar datos',
      danger: true,
    });
    if (!ok) return undefined;

    if (state.data.legacy && !data.legacy) data.legacy = state.data.legacy; // nunca perder datos antiguos
    Storage.backupRaw('antes-de-importar');
    if (commit((d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, data); }, 'Respaldo restaurado')) {
      state.period = currentPeriod(defaultMode());
      state.filters = { q: '', kind: 'all', category: 'all' };
      render();
    }
    return undefined;
  }

  /* ------------------------------------------------------------------ */
  /* Primer acceso                                                       */
  /* ------------------------------------------------------------------ */

  function openOnboarding() {
    const dlg = $('#onboarding');
    dlg.addEventListener('cancel', (e) => e.preventDefault()); // no se puede cerrar sin perfil
    openDialog(dlg);
    $('#ob-name').focus();
  }

  function submitOnboarding(form) {
    const fd = new FormData(form);
    const { errors, profile: p } = Model.buildProfile({
      name: fd.get('name'),
      displayName: fd.get('displayName'),
      currency: fd.get('currency'),
      salaryFrequency: fd.get('salaryFrequency'),
    }, null);
    showErrors(form, errors);
    if (errors) return;
    const seed = fd.get('seed') === 'on';
    try {
      state.data.profile = p;
      if (seed && !state.data.categories.length) state.data.categories = Model.defaultCategories();
      Storage.save(state.data);
    } catch (e) {
      state.data.profile = null;
      toast('No se pudo guardar el perfil en este navegador.', 'error');
      return;
    }
    closeDialog($('#onboarding'));
    start();
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */

  function bindEvents() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-action], [data-view]');
      if (!t) return;
      if (t.dataset.view && !t.dataset.action) { go(t.dataset.view); return; }

      const { action, id } = t.dataset;
      switch (action) {
        case 'new-movement': openMovementDialog(t.dataset.kind); break;
        case 'edit-movement': openMovementDialog(null, state.data.movements.find((m) => m.id === id)); break;
        case 'delete-movement': deleteMovementFlow(id); break;
        case 'new-category': openCategoryDialog(null); break;
        case 'edit-category': openCategoryDialog(Model.categoryById(state.data, id)); break;
        case 'delete-category': deleteCategoryFlow(id); break;
        case 'period-prev': state.period = Dates.shiftPeriod(state.period, -1); render(); break;
        case 'period-next': state.period = Dates.shiftPeriod(state.period, 1); render(); break;
        case 'period-today': state.period = currentPeriod(state.period.mode); render(); break;
        case 'period-mode': setMode(t.dataset.mode); render(); break;
        case 'clear-filters': state.filters = { q: '', kind: 'all', category: 'all' }; render(); break;
        case 'export': exportData(); break;
        case 'import': $('#import-file').click(); break;
        case 'close-dialog': closeDialog(t.closest('dialog')); break;
        default: break;
      }
    });

    // Filtros de movimientos (solo se redibuja la lista para no perder el foco)
    document.addEventListener('input', (e) => {
      if (e.target.id === 'f-q') { state.filters.q = e.target.value; updateMovementList(); }
    });
    document.addEventListener('change', (e) => {
      if (e.target.id === 'f-kind') { state.filters.kind = e.target.value; updateMovementList(); }
      if (e.target.id === 'f-cat') {
        state.filters.category = e.target.value;
        if (e.target.value !== 'all' && state.filters.kind !== 'expense') {
          state.filters.kind = 'all';
          $('#f-kind').value = 'all';
        }
        updateMovementList();
      }
    });

    document.addEventListener('submit', (e) => {
      const f = e.target;
      const handlers = {
        'onboarding-form': submitOnboarding,
        'movement-form': submitMovement,
        'category-form': submitCategory,
        'delcat-form': submitDeleteCategory,
        'profile-form': saveProfile,
      };
      if (handlers[f.id]) { e.preventDefault(); handlers[f.id](f); }
    });

    // Formulario de movimiento: mostrar campos según tipo y moneda
    const mvForm = $('#movement-form');
    mvForm.addEventListener('change', (e) => {
      if (e.target.name === 'kind' || e.target.name === 'currency') syncMovementForm();
      if (['periodMonth', 'periodYear', 'periodHalf'].includes(e.target.name)) mvState.periodTouched = true;
      if (e.target.name === 'date' && !mvState.periodTouched && Dates.isValidISODate(e.target.value)) {
        const s = Dates.suggestIncomePeriod(e.target.value);
        setPeriodFields(s.ym, s.half);
      }
    });

    // Cerrar diálogos al hacer clic fuera (excepto el de bienvenida)
    $$('dialog').forEach((dlg) => {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg && dlg.id !== 'onboarding' && dlg.id !== 'confirm-dialog') closeDialog(dlg);
      });
    });

    $('#import-file').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (file) importFile(file);
    });

    // Si los datos cambian en otra pestaña, recargarlos
    window.addEventListener('storage', (e) => {
      if (e.key !== Storage.KEY || !e.newValue) return;
      try {
        const d = Model.migrate(JSON.parse(e.newValue), { allowLegacy: true });
        if (Model.validate(d).length) return;
        state.data = d;
        if (d.profile) {
          $$('dialog[open]').forEach((x) => { if (x.id !== 'confirm-dialog') x.close(); });
          if ($('#app').hidden) start(); else render();
        }
      } catch (err) { /* ignorar */ }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Arranque                                                            */
  /* ------------------------------------------------------------------ */

  function start() {
    state.period = currentPeriod(defaultMode());
    $('#app').hidden = false;
    render();
  }

  /** Título grande que se compacta al desplazarse (con margen para evitar parpadeos). */
  function bindScrollTitle() {
    let compact = false;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const next = compact ? y > 4 : y > 24;
      if (next !== compact) {
        compact = next;
        document.documentElement.classList.toggle('is-scrolled', compact);
      }
    }, { passive: true });
  }

  /** Permite abrir la app sin conexión (solo cuando se sirve por http/https). */
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ });
    }
  }

  function init() {
    hydrateIcons();
    bindEvents();
    bindScrollTitle();
    registerServiceWorker();

    const { data, error } = Storage.load();
    if (error === 'unavailable') {
      document.body.insertAdjacentHTML('beforeend', '<p class="fatal">Este navegador no permite guardar datos locales (puede estar en modo privado estricto). LifeOS necesita el almacenamiento local para funcionar.</p>');
      return;
    }

    let loaded = null;
    let warning = error === 'corrupt'
      ? 'Los datos guardados estaban dañados. Se guardó una copia de seguridad interna y se empezó de nuevo.'
      : '';
    if (data) {
      try {
        loaded = Model.migrate(data, { allowLegacy: true });
        const errs = Model.validate(loaded);
        if (errs.length) throw new Error(errs[0]);
      } catch (e) {
        Storage.backupRaw('invalido');
        loaded = null;
        warning = `Los datos guardados no se pudieron leer (${e.message}). Se guardó una copia de seguridad interna.`;
      }
    }

    state.data = loaded || Model.createEmpty();
    if (state.data.profile) start(); else openOnboarding();
    if (warning) toast(warning, 'error');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(globalThis.LifeOS = globalThis.LifeOS || {});
