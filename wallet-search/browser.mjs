import { normalize, parseMinor, mergeExports, filterRecords, localDay } from './core.mjs';
import {
  CATEGORIES,
  STATUSES,
  fallbackRecords,
  ledgerTotals,
  validateLedger,
  cachePlan,
  automaticRefreshRange,
  cacheScopeValue,
  readSnapshot,
  needsRecheck,
} from './data.mjs';
import { LOCALES, translate, detectSiteLanguage } from './i18n.mjs';
import { PROFILE, findAdapter, inferTypography } from './layout.mjs';
import {
  observedEndpoint,
  accountIdentity,
  loadNative,
  nativeErrorCode,
  requestCSV,
  waitUntil,
} from './native.mjs';
import { cacheRequest } from './cache-client.mjs';
import { LAYER_COLORS, statisticsChart } from './charts.mjs';
import { createStatisticsAccordion } from './accordion.mjs';

if (location.origin !== 'https://www.etoro.com') throw new Error('Open eToro Wallet first.');
const INSTANCE = '__etoroWalletSearchV1';
window[INSTANCE]?.destroy();
function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.className = value;
    else node.setAttribute(key, value);
  }
  node.append(...children.filter((child) => child !== null && child !== undefined));
  return node;
}
const CSS = `
  :host{--ws-green:#159b51;--ws-red:#cc5365;--ws-name-size:14px;--ws-name-weight:600;color-scheme:light}
  *,*::before,*::after{box-sizing:border-box}button,input,select{font:inherit;color:inherit;min-width:0}button{cursor:pointer}button,input,select{border:1px solid #e0e6ec;border-radius:7px;background:white;padding:8px 10px}button:hover{background:#f4faf6}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #1abb66;outline-offset:2px}h2,p{margin:0}
  .card{border:1px solid #e7ebef;border-radius:9px;background:white;padding:20px;margin-block-end:12px;min-width:0}.heading,.actions,.search-actions,.results-heading,.monthly,.summary-line{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.heading,.results-heading{justify-content:space-between}h2{font-size:17px;font-weight:600}.version,.subtle{color:#929ba5;font-size:10px}.actions button,.search-actions button{font-size:12px}.primary{color:var(--ws-green);border-color:#9ad3af}.quiet{background:transparent;border:0;padding:3px 0;font-size:11px;color:#87929d}.filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-block:17px 12px}.field{display:flex;flex-direction:column;gap:4px;min-width:0}.field>span{font-size:10px;color:#89939d}.query{grid-column:span 2}input,select{width:100%;font-size:12px}.amount-fields{display:flex;gap:5px}.amount-fields>*{width:100%}.status{font-size:11px;color:#84909b;min-height:16px;margin-block-start:10px;overflow-wrap:anywhere}.status.error{color:var(--ws-red)}
  .monthly strong{font-size:13px;font-weight:600}.monthly select{width:auto;max-width:100%;font-size:12px}.layers{display:flex;flex-wrap:wrap;gap:8px 13px;margin-block-start:17px}.layer,.status-layer{display:flex;gap:5px;align-items:center;font-size:10px;color:#687584;cursor:pointer;max-width:100%}.layer input,.status-layer input{width:auto;accent-color:#159b51}.swatch{width:8px;height:8px;flex:0 0 8px;border-radius:2px}.status-layers{display:flex;gap:12px;flex-wrap:wrap;border-block-start:1px solid #edf0f3;margin-block-start:12px;padding-block-start:12px}.chart-scroll{overflow-x:auto;max-width:100%;margin-block-start:14px}.monthly-chart{display:block;width:100%;min-width:580px;direction:ltr;font-family:inherit}.monthly-chart g[tabindex]{cursor:default}.monthly-chart g[tabindex]:focus{outline:none}.monthly-chart g[tabindex]:focus>text{text-decoration:underline}
  .statistics-accordion{font-family:inherit;border-block-start:1px solid #e7ebef;margin-block-start:16px;min-width:0}.statistics-summary{font-family:inherit;display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none;cursor:pointer;padding:14px 0 0;font-size:13px;font-weight:600;color:#526273;transition:color .15s ease}.statistics-summary::-webkit-details-marker{display:none}.statistics-summary::after{content:'';width:7px;height:7px;border-right:1.5px solid currentColor;border-bottom:1.5px solid currentColor;transform:rotate(45deg);margin-inline-end:3px;flex:0 0 7px;transition:transform .3s cubic-bezier(.4,0,.2,1)}.statistics-summary:hover,.statistics-accordion[data-expanded=true]>.statistics-summary{color:#148548}.statistics-accordion[data-expanded=true]>.statistics-summary::after{transform:rotate(225deg)}.statistics-summary:focus-visible{outline:2px solid #1abb66;outline-offset:4px;border-radius:3px}.statistics-content{min-height:0}.statistics-body{padding-block-start:16px;min-width:0}
  .stats-presets{display:flex;flex-wrap:wrap;gap:3px;background:#f3f6f9;padding:4px;border-radius:9px;margin-block-start:16px;width:fit-content;max-width:100%}.stats-presets button{font-size:12px;border:0;background:transparent;padding:6px 14px;color:#7a8999}.stats-presets button[aria-pressed=true]{color:#208751;background:white;box-shadow:0 1px 4px #263b5015}.layers{gap:6px;margin-block-start:12px}.layer{font-size:11px;padding:5px 8px;border-radius:6px;border:1px solid transparent}.layer:has(input:checked){background:#f7fafc;border-color:#e2e9ef;color:#344457}.layer input{margin:0}.status-layer{font-size:11px}.monthly-chart g[tabindex]{transition:opacity .12s}.monthly-chart .month-background{transition:fill .12s}.monthly-chart .is-hovered>.month-background{fill:#f0f5fa}.monthly-chart .chart-segment{transition:opacity .12s;stroke:transparent;stroke-width:1.5px;vector-effect:non-scaling-stroke}.monthly-chart .is-dimmed{opacity:.25}.monthly-chart .is-muted{opacity:.22}.monthly-chart .is-active{stroke:#25394a}.chart-tooltip{filter:drop-shadow(0 6px 10px #23374c20)}
  .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-block-start:14px}.metric{border-inline-end:1px solid #edf0f3;padding-inline-end:9px;min-width:0}.metric:last-child{border:0}.metric-label{font-size:10px;color:#929ba5}.metric-value{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.3px;overflow-wrap:anywhere;margin-block-start:3px}.red{color:var(--ws-red)}.green{color:var(--ws-green)}.foot{font-size:10px;line-height:1.55;color:#929ba5;margin-block-start:10px;overflow-wrap:anywhere}.cache-line{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.cache-line .foot{flex:1 1 260px}.cache-line button{margin-block-start:8px}
  .results-heading strong{font-size:13px;font-weight:600}.summary-line{font-size:11px;gap:6px 14px;padding-block:11px;border-block-start:1px solid #edf0f3;margin-block-start:12px;font-variant-numeric:tabular-nums}.view{height:480px;max-height:60vh;min-height:160px;overflow:auto;position:relative;overscroll-behavior:contain;border-block-start:1px solid #edf0f3;scrollbar-gutter:stable}.spacer{position:relative;width:100%}.row{position:absolute;inset-inline:0;height:80px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border-block-end:1px solid #edf0f3;padding:10px 2px}.row-title{font-size:var(--ws-name-size);font-weight:var(--ws-name-weight);line-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}.row-meta{font-size:10px;color:#96a0aa;margin-block-start:4px}.row-amount{font-size:14px;font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums;unicode-bidi:isolate}.row-failed .row-amount{color:#9099a3;text-decoration:line-through}.row-pending .row-amount{color:#b28b39}.empty{font-size:12px;color:#929ba5;text-align:center;padding:25px 0}.hidden{display:none!important}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}bdi{unicode-bidi:isolate}
  @media(prefers-reduced-motion:reduce){.statistics-summary,.statistics-summary::after,.monthly-chart g[tabindex],.monthly-chart .month-background,.monthly-chart .chart-segment{transition:none}}
  .loaded-count{margin-block-start:5px;font-variant-numeric:tabular-nums}.actions{justify-content:flex-end;gap:8px 12px}.refresh-button{display:inline-flex;align-items:center;gap:6px;min-height:30px;padding:6px 8px;color:var(--ws-green);border:1px solid #dce9e0;border-radius:7px;white-space:nowrap}.refresh-button:disabled{opacity:.75}.refresh-icon{display:block;flex:none}.refresh-button.is-loading .refresh-icon{animation:ws-refresh-spin .85s linear infinite;transform-origin:center}.results-card .summary-line{margin-block-start:8px;padding-block:8px}.monthly-chart g[tabindex]:focus-visible>.month-background{stroke:#159b51;stroke-width:1.5px}
  @keyframes ws-refresh-spin{to{transform:rotate(360deg)}}
  @media(prefers-reduced-motion:reduce){.refresh-button.is-loading .refresh-icon{animation:none}}
  @container(max-width:650px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))}.card{padding:16px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.metric:nth-child(2){border:0}}
  @container(max-width:380px){.filters{grid-template-columns:1fr}.query{grid-column:auto}.row{gap:7px}.row-amount{font-size:12px}.metric-value{font-size:18px}.monthly{gap:5px}}
`;

function mount(account, currency) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone,
    today = () => localDay(Date.now(), zone),
    boot = new AbortController();
  const state = {
    records: [],
    matches: [],
    ranges: [],
    pendingDays: [],
    loaded: false,
    cacheAvailable: false,
    cachedRows: 0,
    scope: null,
    identity: null,
    language: detectSiteLanguage(document, navigator),
    busy: null,
    destroyed: false,
    permissionOrigin: null,
    retryRange: null,
    pending: null,
    statsOpen: false,
    initializing: true,
    activePlan: null,
    loadContext: null,
    flight: null,
    categories: new Set(['payments']),
    statuses: new Set(['settled']),
  };
  const t = (key) => translate(state.language, key),
    locale = () => LOCALES[state.language],
    number = (value) => new Intl.NumberFormat(locale()).format(value),
    money = (value) =>
      new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(value / 100);
  const host = element('div', { 'data-etoro-wallet-search': 'v3' });
  host.style.cssText =
    'all:initial;display:block;width:100%;min-width:0;box-sizing:border-box;container-type:inline-size;font-size:14px;line-height:1.45;color:#202630;position:relative;isolation:isolate;';
  host.style.fontFamily = getComputedStyle(
    account.querySelector(PROFILE.balance) || account,
  ).fontFamily;
  const root = host.attachShadow({ mode: 'open' });
  root.append(element('style', { text: CSS }));
  const refs = {},
    labels = [],
    controlLabels = [];
  let nativeDisplay = null,
    frame = 0,
    debounce = 0,
    startupTimer = 0;
  const text = (key, tag = 'span', attributes = {}) => {
    const node = element(tag, attributes);
    labels.push([node, key]);
    return node;
  };
  const button = (key, handler, cls = '') => {
    const node = text(key, 'button', { type: 'button', class: cls });
    node.addEventListener('click', handler);
    return node;
  };
  const option = (key, value) => text(key, 'option', { value });
  const field = (key, node, cls = '') => {
    if (node.matches('input,select')) controlLabels.push([node, key]);
    return element('label', { class: `field ${cls}` }, text(key), node);
  };
  refs.status = element('p', { class: 'status', role: 'status' });
  const say = (key, error = false, suffix = '') => {
    if (state.destroyed) return;
    refs.status.textContent = t(key) + suffix;
    refs.status.classList.toggle('error', error);
  };
  refs.statistics = text('statistics', 'summary', {
    class: 'statistics-summary',
    id: 'wallet-search-statistics-toggle',
    'aria-expanded': 'false',
    'aria-controls': 'wallet-search-statistics',
  });
  refs.statisticsAccordion = element('details', { class: 'statistics-accordion' }, refs.statistics);
  refs.cancel = button(
    'cancel',
    () => {
      state.pending = null;
      state.busy?.abort();
    },
    'hidden',
  );
  refs.loaded = element('p', { class: 'loaded-count subtle' });
  refs.refresh = element('button', {
    type: 'button',
    class: 'refresh-button quiet',
    'aria-busy': 'false',
  });
  const refreshIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({
    viewBox: '0 0 24 24',
    width: '16',
    height: '16',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.8',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'refresh-icon',
  }))
    refreshIcon.setAttribute(key, value);
  const refreshPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  refreshPath.setAttribute(
    'd',
    'M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 17.9 17',
  );
  refreshIcon.append(refreshPath);
  refs.refresh.append(refreshIcon, text('refresh'));
  refs.refresh.addEventListener('click', () => {
    try {
      queryOptions();
      void runLoad(searchRange(), true);
    } catch {
      say('badRange', true);
    }
  });
  refs.disable = button('remove', () => window[INSTANCE]?.destroy(), 'quiet');
  const heading = element(
    'div',
    { class: 'heading' },
    element(
      'div',
      {},
      text('title', 'h2'),
      element('p', {
        class: 'version',
        text: `v${typeof RELEASE_VERSION === 'undefined' ? 'development' : RELEASE_VERSION}`,
      }),
      refs.loaded,
    ),
    element('div', { class: 'actions' }, refs.cancel, refs.refresh, refs.disable),
  );
  refs.query = element('input', {
    type: 'search',
    autocomplete: 'off',
    spellcheck: 'false',
    dir: 'auto',
  });
  refs.from = element('input', { type: 'date', min: PROFILE.firstDay, max: today() });
  refs.to = element('input', { type: 'date', min: PROFILE.firstDay, max: today() });
  refs.direction = element(
    'select',
    {},
    option('all', 'all'),
    option('incoming', 'in'),
    option('outgoing', 'out'),
  );
  refs.type = element(
    'select',
    {},
    option('all', 'all'),
    ...CATEGORIES.map((key) => option(key, key)),
  );
  refs.recordStatus = element(
    'select',
    {},
    option('all', 'all'),
    ...STATUSES.map((key) => option(key, key)),
  );
  refs.operator = element(
    'select',
    {},
    ...['any', 'gt', 'gte', 'lt', 'lte', 'eq', 'between'].map((key) => option(key, key)),
  );
  refs.amount = element('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off' });
  refs.amountTo = element('input', {
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    class: 'hidden',
  });
  refs.search = button('search', () => void runSearch(), 'primary');
  const controls = element(
    'section',
    { class: 'card controls-card' },
    heading,
    element(
      'div',
      { class: 'filters' },
      field('query', refs.query, 'query'),
      field('from', refs.from),
      field('to', refs.to),
      field('direction', refs.direction),
      field('type', refs.type),
      field('status', refs.recordStatus),
      field('amount', refs.operator),
      field(
        'amount',
        element('div', { class: 'amount-fields' }, refs.amount, refs.amountTo),
        'query',
      ),
    ),
    element('div', { class: 'search-actions' }, refs.search, button('reset', reset)),
    refs.status,
  );
  refs.year = element('select');
  for (let year = Number(today().slice(0, 4)); year >= 2007; year--)
    refs.year.append(element('option', { value: String(year), text: String(year) }));
  refs.year.value = today().slice(0, 4);
  refs.layers = element('div', { class: 'layers' });
  refs.statusLayers = element('div', { class: 'status-layers' });
  const presets = {
    payments: ['payments'],
    transfers: ['transferIn', 'transferOut'],
    all: CATEGORIES,
  };
  refs.presets = element('div', { class: 'stats-presets' });
  for (const [key, categories] of Object.entries(presets)) {
    const control = button(key, () => {
      state.categories = new Set(categories);
      for (const input of refs.layers.querySelectorAll('input'))
        input.checked = state.categories.has(input.value);
      renderStatistics();
    });
    control.setAttribute('data-stats-view', key);
    refs.presets.append(control);
  }
  for (const category of CATEGORIES) {
    const input = element('input', {
      type: 'checkbox',
      value: category,
      ...(state.categories.has(category) ? { checked: '' } : {}),
    });
    input.addEventListener('change', () => {
      input.checked ? state.categories.add(category) : state.categories.delete(category);
      renderStatistics();
    });
    const swatch = element('span', { class: 'swatch' });
    swatch.style.backgroundColor = LAYER_COLORS[category];
    refs.layers.append(element('label', { class: 'layer' }, input, swatch, text(category)));
    controlLabels.push([input, category]);
  }
  for (const status of STATUSES) {
    const input = element('input', {
      type: 'checkbox',
      value: status,
      ...(status === 'settled' ? { checked: '' } : {}),
    });
    input.addEventListener('change', () => {
      input.checked ? state.statuses.add(status) : state.statuses.delete(status);
      renderStatistics();
    });
    refs.statusLayers.append(element('label', { class: 'status-layer' }, input, text(status)));
    controlLabels.push([input, status]);
  }
  refs.chart = element('div', { class: 'chart-scroll' });
  refs.metrics = element('div', { class: 'stats' });
  for (const [key, cls] of [
    ['outgoing', 'red'],
    ['incoming', 'green'],
    ['net', ''],
    ['count', ''],
  ]) {
    refs[key] = element('div', { class: `metric-value ${cls}` });
    refs.metrics.append(
      element('div', { class: 'metric' }, text(key, 'div', { class: 'metric-label' }), refs[key]),
    );
  }
  refs.classificationNote = text('classificationNote', 'p', { class: 'foot hidden' });
  refs.statisticsPanel = element(
    'section',
    {
      class: 'statistics-body',
      id: 'wallet-search-statistics',
      role: 'region',
      'aria-labelledby': 'wallet-search-statistics-toggle',
    },
    element('div', { class: 'monthly' }, refs.year),
    refs.presets,
    refs.layers,
    refs.statusLayers,
    refs.chart,
    refs.metrics,
    text('statusNote', 'p', { class: 'foot' }),
    refs.classificationNote,
  );
  refs.statisticsContent = element('div', { class: 'statistics-content' }, refs.statisticsPanel);
  refs.statisticsAccordion.append(refs.statisticsContent);
  controls.append(refs.statisticsAccordion);
  const statisticsDisclosure = createStatisticsAccordion({
    details: refs.statisticsAccordion,
    summary: refs.statistics,
    content: refs.statisticsContent,
    body: refs.statisticsPanel,
    onChange: (expanded) => {
      state.statsOpen = expanded;
      if (expanded) {
        renderStatistics();
        void runLoad(statisticsRange());
      }
    },
  });
  refs.found = element('span');
  refs.empty = element('div', { class: 'empty' });
  refs.layoutNote = text('layout', 'p', { class: 'foot hidden' });
  refs.list = element('div', { class: 'view', tabindex: '0', role: 'region' });
  refs.spacer = element('div', { class: 'spacer' });
  refs.list.append(refs.spacer);
  refs.cacheNote = element('p', { class: 'foot' });
  refs.clearCache = button('cacheClear', () => void clearCache(), 'quiet');
  controls.insertBefore(
    element('div', { class: 'cache-line' }, refs.cacheNote, refs.clearCache),
    refs.statisticsAccordion,
  );
  const results = element(
    'section',
    { class: 'card results-card' },
    element('div', { class: 'results-heading' }, text('results', 'strong')),
    refs.layoutNote,
    element('div', { class: 'summary-line' }, refs.found),
    refs.empty,
    refs.list,
  );
  root.append(controls, results);
  const adapter = findAdapter(account);
  if (adapter.group) adapter.group.insertBefore(host, adapter.group.firstChild);
  else if (adapter.balance) adapter.balance.after(host);
  else account.append(host);
  for (const type of ['click', 'keydown', 'keyup', 'input', 'change'])
    host.addEventListener(type, (event) => event.stopPropagation());
  const resizeObserver = new ResizeObserver(() => scheduleRows());
  resizeObserver.observe(refs.list);
  const ready = bootstrap();
  void ready.then(() => {
    if (state.destroyed) return;
    startupTimer = setTimeout(() => {
      startupTimer = 0;
      if (state.destroyed) return;
      void runLoad(
        automaticRefreshRange(state.ranges, today(), state.pendingDays, PROFILE.firstDay),
        false,
        { background: true },
      ).finally(() => {
        state.initializing = false;
      });
    }, 0);
  });

  function searchRange() {
    return { from: refs.from.value || PROFILE.firstDay, to: refs.to.value || today() };
  }
  function statisticsRange() {
    return {
      from: `${refs.year.value}-01-01`,
      to: refs.year.value === today().slice(0, 4) ? today() : `${refs.year.value}-12-31`,
    };
  }
  function queryOptions() {
    const range = searchRange();
    if (range.from > range.to || !refs.from.checkValidity() || !refs.to.checkValidity())
      throw new Error('INVALID_RANGE');
    const amount = refs.operator.value === 'any' ? null : parseMinor(refs.amount.value),
      amountTo = refs.operator.value === 'between' ? parseMinor(refs.amountTo.value) : null;
    if (
      (refs.operator.value !== 'any' && (amount === null || amount < 0)) ||
      (refs.operator.value === 'between' && (amountTo === null || amountTo < amount))
    )
      throw new Error('INVALID_AMOUNT');
    return {
      query: refs.query.value,
      from: refs.from.value,
      to: refs.to.value,
      direction: refs.direction.value,
      amountOp: refs.operator.value,
      amount,
      amountTo,
    };
  }
  function reset() {
    for (const ref of [refs.query, refs.from, refs.to, refs.amount, refs.amountTo]) ref.value = '';
    refs.direction.value = 'all';
    refs.type.value = 'all';
    refs.recordStatus.value = 'all';
    refs.operator.value = 'any';
    refs.amountTo.classList.add('hidden');
    update();
  }
  function update({ preserveScroll = false } = {}) {
    if (state.destroyed) return;
    host.setAttribute('data-source', state.loaded ? state.source || 'cache' : 'none');
    try {
      state.matches = filterRecords(
        state.records.map((row) => ({
          ...row,
          search: normalize(`${row.name} ${t(row.category)} ${t(row.status)}`),
        })),
        queryOptions(),
      ).filter(
        (row) =>
          (refs.type.value === 'all' || row.category === refs.type.value) &&
          (refs.recordStatus.value === 'all' || row.status === refs.recordStatus.value),
      );
    } catch {
      say('badRange', true);
      return;
    }
    refs.found.textContent = `${t('found')}: ${number(state.matches.length)}`;
    refs.loaded.textContent = `${t('loaded')}: ${number(state.records.length)} · ${zone}`;
    refs.empty.textContent = t(state.loaded ? 'empty' : 'noData');
    refs.empty.classList.toggle('hidden', state.loaded && !!state.matches.length);
    refs.list.classList.toggle('hidden', !state.matches.length);
    refs.cacheNote.textContent = t(state.cacheAvailable ? 'cacheInfo' : 'cacheUnavailable');
    refs.clearCache.disabled = !state.cacheAvailable || !!state.busy;
    if (!preserveScroll) refs.list.scrollTop = 0;
    renderRows();
    renderStatistics();
  }
  function renderStatistics() {
    if (state.destroyed) return;
    const categories = [...state.categories],
      yearly = state.records.filter((row) => row.month.slice(0, 4) === refs.year.value),
      summary = ledgerTotals(yearly, { categories }),
      missingTypes =
        yearly.length > 0 &&
        !yearly.some(
          (row) => row.status !== 'unknown' && !['otherIn', 'otherOut'].includes(row.category),
        );
    refs.metrics.setAttribute('aria-label', `${t('statistics')} ${refs.year.value}`);
    for (const [key, values] of Object.entries(presets))
      refs.presets
        .querySelector(`[data-stats-view=${key}]`)
        .setAttribute(
          'aria-pressed',
          String(
            values.length === categories.length &&
              values.every((value) => state.categories.has(value)),
          ),
        );
    for (const key of ['incoming', 'outgoing', 'net', 'count'])
      refs[key].textContent =
        state.loaded && !missingTypes
          ? key === 'count'
            ? number(summary.count)
            : money(summary[key])
          : '—';
    refs.classificationNote.textContent = t(
      missingTypes ? 'typedDataMissing' : 'classificationNote',
    );
    refs.classificationNote.classList.toggle(
      'hidden',
      !missingTypes &&
        !state.records.some(
          (row) =>
            row.status === 'unknown' || row.category === 'otherIn' || row.category === 'otherOut',
        ),
    );
    if (!state.statsOpen) return;
    if (
      missingTypes &&
      !(
        state.statuses.has('unknown') &&
        (state.categories.has('otherIn') || state.categories.has('otherOut'))
      )
    ) {
      refs.chart.replaceChildren(
        element('p', { class: 'foot chart-placeholder', text: t('typedDataMissing') }),
      );
      return;
    }
    const chart = statisticsChart(state.records, refs.year.value, {
      categories,
      statuses: [...state.statuses],
      locale: locale(),
      t,
      money,
    });
    refs.chart.replaceChildren(chart.svg, chart.description, chart.table);
  }
  function scheduleRows() {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        renderRows();
      });
  }
  function renderRows() {
    refs.spacer.style.height = `${state.matches.length * PROFILE.rowHeight}px`;
    const start = Math.max(0, Math.floor(refs.list.scrollTop / PROFILE.rowHeight) - 5),
      stop = Math.min(
        state.matches.length,
        start + Math.ceil((refs.list.clientHeight || 480) / PROFILE.rowHeight) + 11,
      ),
      fragment = document.createDocumentFragment();
    const formatter = new Intl.DateTimeFormat(locale(), {
      timeZone: zone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    for (let index = start; index < stop; index++) {
      const row = state.matches[index],
        name = row.name || t(row.category),
        date = row.dateOnly
          ? new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', dateStyle: 'medium' }).format(
              new Date(row.timestamp),
            )
          : formatter.format(new Date(row.timestamp));
      const node = element(
        'div',
        {
          class: `row row-${row.status}`,
          'aria-label': `${name}, ${date}, ${money(row.minor)}, ${t(row.status)}`,
        },
        element(
          'div',
          {},
          element('div', { class: 'row-title', text: name, title: name, dir: 'auto' }),
          element('div', {
            class: 'row-meta',
            text: `${date} · ${t(row.category)} · ${t(row.status)}`,
          }),
        ),
        element('bdi', {
          class: `row-amount ${row.minor > 0 ? 'green' : ''}`,
          text: money(row.minor),
        }),
      );
      node.style.top = `${index * PROFILE.rowHeight}px`;
      fragment.append(node);
    }
    refs.spacer.replaceChildren(fragment);
  }
  function translateUI() {
    host.lang = state.language;
    host.dir = state.language === 'ar' ? 'rtl' : 'ltr';
    for (const [node, key] of labels) node.textContent = t(key);
    for (const [node, key] of controlLabels) node.setAttribute('aria-label', t(key));
    refs.query.placeholder = t('query');
    refs.amount.placeholder = new Intl.NumberFormat(locale(), { minimumFractionDigits: 2 }).format(
      0,
    );
    refs.amountTo.placeholder = t('to');
    refs.amount.setAttribute('aria-label', t('amount'));
    refs.amountTo.setAttribute('aria-label', `${t('amount')} ${t('to')}`);
    refs.list.setAttribute('aria-label', t('results'));
    refs.year.setAttribute('aria-label', t('year'));
    refs.disable.title = t('disableHint');
    refs.refresh.title = t(state.busy ? 'loading' : 'refresh');
    update();
  }
  function restoreNative() {
    if (!nativeDisplay) return;
    for (const saved of nativeDisplay.saved) {
      saved.node.getAttribute('style');
      if (saved.node.style.cssText === saved.hiddenCss) {
        if (saved.styleAttribute === null) saved.node.removeAttribute('style');
        else saved.node.setAttribute('style', saved.styleAttribute);
      } else if (
        saved.node.style.getPropertyValue('display') === 'none' &&
        saved.node.style.getPropertyPriority('display') === 'important'
      ) {
        if (saved.value) saved.node.style.setProperty('display', saved.value, saved.priority);
        else saved.node.style.removeProperty('display');
        if (!saved.hadStyle && !saved.node.style.cssText) saved.node.removeAttribute('style');
      }
    }
    nativeDisplay = null;
  }
  function replaceNative() {
    const found = findAdapter(account, state.records);
    state.lastLayoutAttempt = Date.now();
    refs.layoutNote.classList.toggle('hidden', !!found.list);
    if (!found.list || found.list === nativeDisplay?.list) return;
    restoreNative();
    const nodes = [found.list, found.known ? account.querySelector(PROFILE.header) : null].filter(
      Boolean,
    );
    nativeDisplay = {
      list: found.list,
      saved: nodes.map((node) => {
        const styleAttribute = node.getAttribute('style');
        return {
          node,
          styleAttribute,
          hadStyle: styleAttribute !== null,
          value: node.style.getPropertyValue('display'),
          priority: node.style.getPropertyPriority('display'),
        };
      }),
    };
    for (const saved of nativeDisplay.saved) {
      saved.node.style.setProperty('display', 'none', 'important');
      saved.hiddenCss = saved.node.style.cssText;
    }
    inferTypography(account, state.records, host);
  }
  function nativeHints(records) {
    const hints = [],
      nativeRows = [...account.querySelectorAll(PROFILE.row)],
      year = account.querySelector(PROFILE.header)?.textContent.match(/\b20\d{2}\b/)?.[0];
    for (const record of records) {
      if (!record.name || record.month.slice(0, 4) !== year) continue;
      const matches = nativeRows.filter(
        (node) =>
          normalize(node.textContent).includes(record.search) &&
          [...node.querySelectorAll('span')].some((leaf) => {
            try {
              return (
                /[€£$]/.test(leaf.textContent) && parseMinor(leaf.textContent) === record.minor
              );
            } catch {
              return false;
            }
          }),
      );
      if (matches.length !== 1) continue;
      const node = matches[0],
        parts = Object.fromEntries(
          new Intl.DateTimeFormat('en-GB', {
            timeZone: zone,
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
          })
            .formatToParts(new Date(record.timestamp))
            .map((p) => [p.type, p.value]),
        );
      if (
        !node.textContent.includes(`${parts.hour}:${parts.minute}`) ||
        !node.textContent.includes(`${parts.day}/${parts.month}`)
      )
        continue;
      const icon = node.querySelector('img')?.getAttribute('src') || '',
        classes = [...node.querySelectorAll('[class]')].map((n) => n.className).join(' ');
      const category = /card-payment/.test(icon)
        ? record.minor > 0
          ? 'refunds'
          : 'payments'
        : /bank-payment|etoro-transfer/.test(icon)
          ? record.minor > 0
            ? 'transferIn'
            : 'transferOut'
          : null;
      const status = /--(declined|cancelled|reversed|expired|returned)\b/.test(classes)
        ? 'failed'
        : /--(authorized|pending|partial-reversed|reversed-balance)\b/.test(classes)
          ? 'pending'
          : /--empty\b/.test(classes)
            ? 'settled'
            : 'unknown';
      if (category) hints.push({ ...record, category, status });
    }
    return hints;
  }
  async function bootstrap() {
    try {
      state.identity = await waitUntil(() => accountIdentity(account), boot.signal, 5000);
      const raw = cacheScopeValue({ account: state.identity, currency, timeZone: zone }),
        digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      state.scope = [...new Uint8Array(digest)]
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
      const value = await cacheRequest('cache-read', state.scope, null, boot.signal);
      if (state.destroyed || accountIdentity(account) !== state.identity) return;
      let snapshot;
      try {
        snapshot = readSnapshot(value, { currency, timeZone: zone, today: today() });
      } catch {
        await cacheRequest('cache-clear', state.scope, null, boot.signal);
        snapshot = readSnapshot(null, { currency, timeZone: zone, today: today() });
      }
      if (state.destroyed || accountIdentity(account) !== state.identity) return;
      state.cacheAvailable = true;
      state.records = snapshot.records;
      state.ranges = snapshot.ranges;
      state.pendingDays = snapshot.pendingDays;
      state.cachedRows = snapshot.records.length;
      state.loaded = !!(snapshot.records.length || snapshot.ranges.length);
      if (state.loaded) replaceNative();
      update();
    } catch {
      if (!state.destroyed) {
        state.cacheAvailable = false;
        update();
      }
    }
  }
  function setBusy(controller) {
    state.busy = controller;
    refs.cancel.classList.toggle('hidden', !controller);
    refs.clearCache.disabled = !!controller || !state.cacheAvailable;
    refs.refresh.disabled = !!controller;
    refs.refresh.classList.toggle('is-loading', !!controller);
    refs.refresh.setAttribute('aria-busy', String(!!controller));
    refs.refresh.title = t(controller ? 'loading' : 'refresh');
  }
  function runLoad(range, force = false, { background = false } = {}) {
    if (state.destroyed) return Promise.resolve();
    if (state.busy) {
      const plan = force ? range : cachePlan(range, state.ranges, today(), state.pendingDays);
      if (!plan) return Promise.resolve();
      if (
        !force &&
        state.activePlan &&
        plan.from >= state.activePlan.from &&
        plan.to <= state.activePlan.to
      ) {
        // A user search can join an automatic load without a second request.
        // It also explicitly permits the native export UI if fallback is needed.
        if (!background) state.loadContext.background = false;
        return state.flight;
      }
      if (!background || !state.pending || state.pending.background)
        state.pending = { range, force, background };
      return state.flight;
    }
    const context = { background };
    state.loadContext = context;
    state.activePlan = range;
    state.flight = performLoad(range, force, context);
    return state.flight;
  }
  async function performLoad(range, force, context) {
    if (state.destroyed) return;
    if (range.from > range.to) {
      say('badRange', true);
      return;
    }
    const controller = new AbortController();
    let timedOut = false;
    const deadline = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 60000);
    setBusy(controller);
    say('loading');
    try {
      await ready;
      if (controller.signal.aborted || state.destroyed)
        throw new DOMException('Cancelled', 'AbortError');
      const plan = force ? range : cachePlan(range, state.ranges, today(), state.pendingDays);
      state.activePlan = plan;
      if (!plan) {
        update({ preserveScroll: context.background });
        say('updated');
        return;
      }
      let parsed,
        endpoint = observedEndpoint();
      if (!endpoint)
        try {
          endpoint = await waitUntil(observedEndpoint, controller.signal, 2000);
        } catch (error) {
          if (error.name === 'AbortError') throw error;
        }
      host.removeAttribute('data-native-error');
      host.removeAttribute('data-native-transport');
      if (endpoint) {
        try {
          parsed = await loadNative(plan, {
            endpoint,
            currency,
            timeZone: zone,
            signal: controller.signal,
            onTransport: (value) => host.setAttribute('data-native-transport', value),
          });
        } catch (error) {
          if (
            error.name === 'AbortError' ||
            error.message === 'TOO_MANY_ROWS' ||
            error.message === 'FILE_TOO_LARGE'
          )
            throw error;
          host.setAttribute('data-native-error', nativeErrorCode(error));
        }
      } else host.setAttribute('data-native-error', 'NATIVE_NOT_OBSERVED');
      if (!parsed) {
        // Automatic updates must not open a dialog or start a download. Keep
        // the cache usable and leave interactive export fallback to the user.
        if (context.background) throw new Error('AUTO_REFRESH_UNAVAILABLE');
        parsed = await requestCSV(account, plan, {
          currency,
          timeZone: zone,
          signal: controller.signal,
        });
        parsed.records = fallbackRecords(parsed.records, nativeHints(parsed.records));
      }
      if (
        controller.signal.aborted ||
        state.destroyed ||
        (state.identity && accountIdentity(account) !== state.identity)
      )
        throw new DOMException('Cancelled', 'AbortError');
      const kept = state.records.filter((row) => row.day < plan.from || row.day > plan.to),
        merged = mergeExports([{ records: kept }, { records: parsed.records }]);
      validateLedger(merged);
      state.records = merged;
      state.ranges.push(plan);
      state.pendingDays = [
        ...new Set([
          ...state.pendingDays.filter((day) => day < plan.from || day > plan.to),
          ...parsed.records.filter(needsRecheck).map((r) => r.day),
        ]),
      ];
      state.loaded = true;
      state.permissionOrigin = null;
      state.retryRange = null;
      replaceNative();
      update({ preserveScroll: context.background });
      say('updated');
      state.source = parsed.source;
      host.setAttribute('data-source', parsed.source);
      if (state.scope && state.cacheAvailable) {
        try {
          await cacheRequest(
            'cache-write',
            state.scope,
            { records: parsed.records, range: plan, currency, timeZone: zone, today: today() },
            controller.signal,
          );
          state.cachedRows = state.records.length;
        } catch (error) {
          if (error.name !== 'AbortError') {
            state.cacheAvailable = false;
            refs.cacheNote.textContent = t('cacheUnavailable');
          }
        }
      }
    } catch (error) {
      if (error.message === 'EXPORT_HOST_PERMISSION') {
        state.permissionOrigin = error.origin;
        state.retryRange = { range, force };
      }
      say(
        error.name === 'AbortError' && !timedOut
          ? 'cancel'
          : error.message === 'EXPORT_HOST_PERMISSION'
            ? 'permission'
            : error.message === 'FILE_TOO_LARGE'
              ? 'tooLarge'
              : error.message === 'TOO_MANY_ROWS'
                ? 'tooMany'
                : context.background
                  ? 'autoError'
                  : 'error',
        error.name !== 'AbortError' || timedOut,
      );
    } finally {
      clearTimeout(deadline);
      if (state.busy === controller) {
        setBusy(null);
        state.activePlan = null;
        state.loadContext = null;
      }
      if (!state.destroyed && state.pending) {
        const queued = state.pending;
        state.pending = null;
        queueMicrotask(
          () => void runLoad(queued.range, queued.force, { background: queued.background }),
        );
      }
    }
  }
  async function runSearch() {
    try {
      queryOptions();
    } catch {
      say('badRange', true);
      return;
    }
    await runLoad(searchRange());
    update();
  }
  async function clearCache() {
    if (state.busy || !state.scope) return;
    try {
      await cacheRequest('cache-clear', state.scope, null, boot.signal);
      if (state.destroyed) return;
      state.records = [];
      state.matches = [];
      state.ranges = [];
      state.pendingDays = [];
      state.cachedRows = 0;
      state.loaded = false;
      restoreNative();
      update();
      say('cacheCleared');
    } catch {
      say('cacheUnavailable', true);
    }
  }
  function destroy() {
    if (state.destroyed) return;
    state.destroyed = true;
    boot.abort();
    state.busy?.abort();
    state.pending = null;
    clearTimeout(debounce);
    clearTimeout(startupTimer);
    state.initializing = false;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    statisticsDisclosure.destroy();
    restoreNative();
    host.remove();
    state.records = [];
    state.matches = [];
    state.ranges = [];
    state.pendingDays = [];
  }
  for (const ref of [
    refs.query,
    refs.from,
    refs.to,
    refs.direction,
    refs.type,
    refs.recordStatus,
    refs.operator,
    refs.amount,
    refs.amountTo,
  ])
    ref.addEventListener('input', () => {
      clearTimeout(debounce);
      refs.amountTo.classList.toggle('hidden', refs.operator.value !== 'between');
      debounce = setTimeout(update, 120);
    });
  refs.query.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void runSearch();
    }
  });
  refs.list.addEventListener('scroll', scheduleRows, { passive: true });
  refs.year.addEventListener('change', () => {
    renderStatistics();
    void runLoad(statisticsRange());
  });
  translateUI();
  return {
    account,
    currency,
    host,
    destroy,
    identity: () => state.identity,
    getStatus() {
      return {
        currency,
        language: state.language,
        timeZone: zone,
        loaded: state.loaded,
        rows: state.records.length,
        matches: state.matches.length,
        busy: !!state.busy,
        initializing: state.initializing,
        cachedRows: state.cachedRows,
        cacheAvailable: state.cacheAvailable,
        permissionOrigin: state.permissionOrigin,
      };
    },
    retryExport() {
      if (!state.retryRange || state.busy) return false;
      const { range, force } = state.retryRange;
      void runLoad(range, force);
      return true;
    },
    clearCache,
    refresh() {
      const language = detectSiteLanguage(document, navigator);
      if (language !== state.language) {
        state.language = language;
        translateUI();
      }
      if (
        state.loaded &&
        !nativeDisplay?.list.isConnected &&
        (nativeDisplay || Date.now() - (state.lastLayoutAttempt || 0) > 10000)
      )
        replaceNative();
    },
  };
}
let current = null,
  stopped = false,
  checkTimer;
function checkRoute() {
  if (stopped) return;
  const route = location.pathname.match(/^\/wallet\/account\/([A-Z]{3})\/?$/),
    account = route && document.querySelector(PROFILE.account);
  if (
    current &&
    (!account ||
      current.account !== account ||
      current.currency !== route[1] ||
      !current.host.isConnected ||
      (current.identity() &&
        accountIdentity(account) &&
        current.identity() !== accountIdentity(account)))
  ) {
    current.destroy();
    current = null;
  }
  if (account && !current) current = mount(account, route[1]);
  current?.refresh();
}
const observer = new MutationObserver(() => {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(checkRoute, 200);
});
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['lang'],
});
const routeTimer = setInterval(checkRoute, 1000);
window[INSTANCE] = {
  getStatus() {
    return {
      enabled: !stopped,
      mounted: !!current,
      language: detectSiteLanguage(document, navigator),
      ...current?.getStatus(),
    };
  },
  retryExport() {
    return current?.retryExport() || false;
  },
  clearCache() {
    return current?.clearCache();
  },
  destroy() {
    stopped = true;
    clearTimeout(checkTimer);
    clearInterval(routeTimer);
    observer.disconnect();
    current?.destroy();
    delete window[INSTANCE];
  },
};
checkRoute();
