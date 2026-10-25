import { monthlyLayers } from './data.mjs';

export const LAYER_COLORS = Object.freeze({
  payments: '#df6783',
  transferIn: '#259d80',
  transferOut: '#5685cd',
  cash: '#d6a04c',
  refunds: '#36a8b5',
  fees: '#aa7bc5',
  adjustments: '#8796ad',
  otherIn: '#75a492',
  otherOut: '#ad9a87',
});
function svgNode(tag, attributes = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  node.append(...children);
  return node;
}
function svgText(value, attributes = {}) {
  const node = svgNode('text', attributes);
  node.textContent = value;
  return node;
}

export function statisticsChart(records, year, { categories, statuses, locale, t, money }) {
  const months = monthlyLayers(records, year, { categories, statuses });
  const booked = new Map(months.map((month) => [month.month, { incoming: 0, outgoing: 0 }]));
  for (const row of records) {
    const total = booked.get(row.month);
    if (!total || row.status !== 'settled' || !categories.includes(row.category)) continue;
    const key = row.minor > 0 ? 'incoming' : 'outgoing';
    total[key] += Math.abs(row.minor);
    if (!Number.isSafeInteger(total[key])) throw new Error('AMOUNT_OVERFLOW');
  }
  const width = 760,
    height = 320,
    baseline = 264,
    chartHeight = 204,
    left = 66,
    column = 55;
  const maximum = Math.max(1, ...months.map((month) => Math.max(month.totalIn, month.totalOut)));
  const svg = svgNode('svg', {
    viewBox: `0 0 ${width} ${height}`,
    role: 'group',
    'aria-label': `${t('statistics')} ${year}`,
    class: 'monthly-chart',
  });
  const description = document.createElement('p');
  description.className = 'sr-only';
  description.setAttribute('role', 'status');
  description.setAttribute('aria-live', 'polite');
  const patternId = `ws-failed-${crypto.randomUUID()}`,
    defs = svgNode('defs');
  defs.append(
    svgNode(
      'pattern',
      {
        id: patternId,
        width: 6,
        height: 6,
        patternUnits: 'userSpaceOnUse',
        patternTransform: 'rotate(35)',
      },
      svgNode('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: '#fff', 'stroke-width': 2 }),
    ),
  );
  svg.append(defs);
  svg.append(
    svgText(`+ ${t('incoming')}   − ${t('outgoing')}`, {
      x: left - 2,
      y: 22,
      fill: '#7f8d9a',
      'font-size': 11,
    }),
  );
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const number = (value) => new Intl.NumberFormat(locale).format(value);
  for (const ratio of [0, 0.25, 0.5, 0.75, 1]) {
    const y = baseline - ratio * chartHeight;
    svg.append(
      svgNode('line', {
        x1: left - 8,
        y1: y,
        x2: width - 12,
        y2: y,
        stroke: ratio === 0 ? '#c6d0da' : '#edf1f5',
        'stroke-width': 1,
      }),
    );
    svg.append(
      svgText(ratio === 0 ? '0' : compact.format((maximum * ratio) / 100), {
        x: left - 14,
        y: y + 4,
        'text-anchor': 'end',
        fill: '#93a0ae',
        'font-size': 10,
      }),
    );
  }
  const groups = [],
    segments = [],
    overlays = [];
  const tooltip = svgNode('g', {
    class: 'chart-tooltip',
    'aria-hidden': 'true',
    visibility: 'hidden',
    'pointer-events': 'none',
  });
  const reset = () => {
    tooltip.setAttribute('visibility', 'hidden');
    svg.removeAttribute('data-hover-month');
    svg.removeAttribute('data-hover-category');
    description.textContent = '';
    for (const group of groups) group.classList.remove('is-dimmed', 'is-hovered');
    for (const segment of segments) segment.classList.remove('is-muted', 'is-active');
    for (const overlay of overlays) overlay.classList.remove('is-muted');
  };
  const show = (item, index, layer = null, segment = null) => {
    reset();
    svg.setAttribute('data-hover-month', item.month);
    if (layer) svg.setAttribute('data-hover-category', layer.category);
    const monthName = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${item.month}-15T12:00:00Z`));
    for (const group of groups) {
      group.classList.toggle('is-dimmed', group.getAttribute('data-month') !== item.month);
      group.classList.toggle('is-hovered', group.getAttribute('data-month') === item.month);
    }
    if (segment) {
      for (const rect of segments) rect.classList.toggle('is-muted', rect !== segment);
      segment.classList.add('is-active');
      for (const overlay of overlays)
        overlay.classList.toggle('is-muted', overlay.getAttribute('data-owner') !== segment.id);
    }
    const boxWidth = 248,
      boxHeight = layer ? 192 : 138,
      y = 35;
    const drawing = svg.getBoundingClientRect(),
      viewport = svg.parentElement?.getBoundingClientRect(),
      scale = drawing.width / width || 1;
    const visibleLeft = viewport ? Math.max(8, (viewport.left - drawing.left) / scale + 8) : left;
    const visibleRight = viewport
      ? Math.min(width - 8, (viewport.right - drawing.left) / scale - 8)
      : width - 12;
    const x = Math.max(
      visibleLeft,
      Math.min(visibleRight - boxWidth, left + index * column + (index < 6 ? 40 : -boxWidth - 5)),
    );
    const children = [
      svgNode('rect', {
        x: 0,
        y: 0,
        width: boxWidth,
        height: boxHeight,
        rx: 12,
        fill: '#fff',
        stroke: '#e1e7ee',
      }),
      svgText(monthName, { x: 15, y: 25, fill: '#283646', 'font-size': 12, 'font-weight': 600 }),
    ];
    let summaryY = 66;
    const lines = [monthName];
    if (layer) {
      const caption = `${t(layer.category)} · ${t(layer.status)}`;
      children.push(
        svgNode('circle', { cx: 19, cy: 47, r: 4, fill: LAYER_COLORS[layer.category] }),
        svgText(t(layer.category), { x: 29, y: 51, fill: '#627387', 'font-size': 10 }),
        svgText(t(layer.status), { x: 15, y: 68, fill: '#8a98a8', 'font-size': 10 }),
        svgText(money(layer.minor), {
          x: 15,
          y: 99,
          fill: LAYER_COLORS[layer.category],
          'font-size': 24,
          'font-weight': 600,
        }),
        svgText(`${t('count')}: ${number(layer.count)}`, {
          x: 15,
          y: 119,
          fill: '#7b8998',
          'font-size': 10,
        }),
      );
      summaryY = 149;
      lines.push(`${caption}: ${money(layer.minor)}, ${t('count')}: ${number(layer.count)}`);
    }
    children.push(
      svgText(t('settled'), { x: 15, y: summaryY - 13, fill: '#98a4b2', 'font-size': 9 }),
    );
    for (const [key, value] of Object.entries(booked.get(item.month))) {
      children.push(
        svgText(t(key), { x: 15, y: summaryY, fill: '#7b8998', 'font-size': 10 }),
        svgText(money(value), {
          x: boxWidth - 15,
          y: summaryY,
          'text-anchor': 'end',
          fill: '#344355',
          'font-size': 11,
          'font-weight': 600,
        }),
      );
      lines.push(`${t('settled')} · ${t(key)}: ${money(value)}`);
      summaryY += 23;
    }
    if (!layer) {
      const count = [...item.incoming, ...item.outgoing].reduce(
        (total, entry) => total + entry.count,
        0,
      );
      children.push(
        svgText(`${t('count')}: ${number(count)}`, {
          x: 15,
          y: summaryY + 3,
          fill: '#7b8998',
          'font-size': 10,
        }),
      );
    }
    tooltip.replaceChildren(...children);
    tooltip.setAttribute('transform', `translate(${x},${y})`);
    tooltip.setAttribute('visibility', 'visible');
    description.textContent = lines.join('. ');
  };
  months.forEach((item, index) => {
    const x = left + index * column + 3;
    const monthName = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${item.month}-15T12:00:00Z`));
    const group = svgNode('g', {
      'data-month': item.month,
      role: 'group',
      tabindex: '0',
      'aria-label': monthName,
    });
    groups.push(group);
    group.append(
      svgNode('rect', {
        class: 'month-background',
        x: x - 5,
        y: 42,
        width: 46,
        height: 255,
        rx: 8,
        fill: 'transparent',
      }),
    );
    const both = item.incoming.length > 0 && item.outgoing.length > 0;
    for (const [direction, offset] of [
      ['incoming', both ? 0 : 10],
      ['outgoing', both ? 21 : 10],
    ]) {
      let cumulative = 0;
      for (const layer of item[direction]) {
        const segmentHeight = (layer.minor / maximum) * chartHeight,
          y = baseline - cumulative - segmentHeight;
        const id = `ws-segment-${crypto.randomUUID()}`,
          rect = svgNode('rect', {
            id,
            x: x + offset,
            y,
            width: 16,
            height: Math.max(0.75, segmentHeight),
            rx: 3,
            fill: LAYER_COLORS[layer.category],
            opacity: layer.status === 'pending' ? 0.5 : 1,
            class: 'chart-segment',
            'data-category': layer.category,
            'data-status': layer.status,
            'data-direction': direction,
            'data-minor': layer.minor,
            'data-count': layer.count,
            'aria-label': `${monthName} · ${t(layer.category)} · ${t(layer.status)}: ${money(layer.minor)}`,
          });
        const title = svgNode('title');
        title.textContent = rect.getAttribute('aria-label');
        rect.append(title);
        group.append(rect);
        segments.push(rect);
        rect.addEventListener('pointerenter', () => show(item, index, layer, rect));
        if (layer.status === 'failed') {
          const hatch = svgNode('rect', {
            x: x + offset,
            y,
            width: 16,
            height: Math.max(0.75, segmentHeight),
            rx: 3,
            fill: `url(#${patternId})`,
            'pointer-events': 'none',
            'data-owner': id,
          });
          group.append(hatch);
          overlays.push(hatch);
        }
        cumulative += segmentHeight;
      }
    }
    group.append(
      svgText(
        new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
          new Date(`${item.month}-15T12:00:00Z`),
        ),
        {
          x: x + 18,
          y: 287,
          'text-anchor': 'middle',
          fill: '#8996a4',
          'font-size': 10,
          'font-weight': '400',
        },
      ),
    );
    group.addEventListener('pointerenter', () => show(item, index));
    group.addEventListener('pointerover', (event) => {
      if (!event.target.closest?.('.chart-segment')) show(item, index);
    });
    group.addEventListener('focus', () => show(item, index));
    group.addEventListener('blur', reset);
    group.addEventListener('pointerleave', reset);
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        show(item, index);
      } else if (event.key === 'Escape') reset();
    });
    svg.append(group);
  });
  svg.addEventListener('pointerleave', reset);
  svg.append(tooltip);
  const table = document.createElement('table');
  table.className = 'sr-only';
  const caption = document.createElement('caption');
  caption.textContent = `${t('statistics')} ${year} · ${statuses.map(t).join(', ')}`;
  table.append(caption);
  const header = document.createElement('tr');
  for (const key of ['month', 'incoming', 'outgoing']) {
    const th = document.createElement('th');
    th.textContent = t(key);
    header.append(th);
  }
  table.append(header);
  for (const month of months) {
    const row = document.createElement('tr');
    for (const value of [month.month, money(month.totalIn), money(month.totalOut)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    table.append(row);
  }
  return { svg, table, description };
}
