/* Tiny interactive SVG line chart — no chart library.
   Hover, touch or use the arrow keys to read any day's value. */
(function (App) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const W = 520;
  const H = 120;
  const PAD = { top: 10, right: 6, bottom: 8, left: 6 };
  let uid = 0;

  function svgEl(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  /**
   * @param {{date: string, value: number}[]} points  chronological
   * @param {{format: (n:number)=>string, formatDate: (iso:string)=>string, label: string}} opts
   */
  function create(points, { format, formatDate, label }) {
    const wrap = document.createElement('div');
    wrap.className = 'spark';

    const values = points.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    const trend = change >= 0 ? 'up' : 'down';

    const x = (i) => PAD.left + (i / Math.max(points.length - 1, 1)) * (W - PAD.left - PAD.right);
    const y = (v) => PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom);

    const readout = document.createElement('p');
    readout.className = 'spark-readout';

    const gradientId = `spark-grad-${++uid}`;
    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      class: `spark-svg is-${trend}`,
      role: 'img',
      tabindex: '0',
      'aria-label': `${label}. From ${format(first)} to ${format(last)}, ${change >= 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}%. Use arrow keys to inspect days.`,
    });

    const defs = svgEl('defs');
    const grad = svgEl('linearGradient', { id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1 });
    grad.append(
      svgEl('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': '.28' }),
      svgEl('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0' }),
    );
    defs.append(grad);

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    const baseY = H - PAD.bottom;
    const area = `${line}L${x(points.length - 1).toFixed(1)},${baseY}L${x(0).toFixed(1)},${baseY}Z`;

    const cursor = svgEl('line', { class: 'spark-cursor', y1: PAD.top, y2: baseY, x1: 0, x2: 0 });
    const dot = svgEl('circle', { class: 'spark-dot', r: 4.5, cx: x(points.length - 1), cy: y(last) });

    svg.append(
      defs,
      svgEl('path', { d: area, fill: `url(#${gradientId})`, class: 'spark-area' }),
      svgEl('path', { d: line, class: 'spark-line' }),
      cursor,
      dot,
    );

    const stats = document.createElement('p');
    stats.className = 'spark-stats';
    stats.innerHTML = `
      <span>Low <strong>${format(min)}</strong></span>
      <span>High <strong>${format(max)}</strong></span>
      <span class="spark-change is-${trend}">${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% ${change >= 0 ? 'dearer' : 'cheaper'} than ${points.length} trading days ago</span>`;

    let active = points.length - 1;
    function show(i, withCursor) {
      active = Math.max(0, Math.min(points.length - 1, i));
      const p = points[active];
      dot.setAttribute('cx', x(active));
      dot.setAttribute('cy', y(p.value));
      cursor.setAttribute('x1', x(active));
      cursor.setAttribute('x2', x(active));
      cursor.classList.toggle('is-visible', withCursor);
      readout.innerHTML = `<span>${formatDate(p.date)}</span> <strong>${format(p.value)}</strong>`;
    }

    function indexFromEvent(event) {
      const rect = svg.getBoundingClientRect();
      const ratio = (event.clientX - rect.left) / rect.width;
      const px = ratio * W;
      return Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (points.length - 1));
    }

    svg.addEventListener('pointermove', (e) => show(indexFromEvent(e), true));
    svg.addEventListener('pointerdown', (e) => show(indexFromEvent(e), true));
    svg.addEventListener('pointerleave', () => show(points.length - 1, false));
    svg.addEventListener('blur', () => show(points.length - 1, false));
    svg.addEventListener('keydown', (e) => {
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };
      if (!(e.key in moves)) return;
      e.preventDefault();
      const step = moves[e.key];
      show(Number.isFinite(step) ? active + step : (step < 0 ? 0 : points.length - 1), true);
    });

    show(points.length - 1, false);
    wrap.append(readout, svg, stats);
    return wrap;
  }

  App.sparkline = { create };
})(window.App = window.App || {});
