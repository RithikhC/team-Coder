/* Rendering helpers: formatting and HTML templates for listing cards. */
(function (App) {
  'use strict';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
  }

  function formatMoney(amount, currency = 'USD') {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
    } catch {
      return `${Number(amount).toFixed(2)} ${currency}`;
    }
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const UNITS = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];

  function timeAgo(timestamp) {
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    for (const [unit, size] of UNITS) {
      if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
    }
    return 'just now';
  }

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* Escapes text and wraps search-term matches in <mark>. */
  function highlight(text, query) {
    const words = query ? App.filters.terms(query) : [];
    if (!words.length) return escapeHtml(text);
    const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
    return String(text)
      .split(pattern)
      .map((part, i) => (i % 2 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
      .join('');
  }

  function cardHtml(listing, query) {
    const cat = App.getCategory(listing.category);
    const posted = new Date(listing.createdAt);
    return `
      <li class="card" style="--hue:${cat.hue}" data-id="${escapeHtml(listing.id)}">
        <div class="card-media" aria-hidden="true">${cat.icon}</div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(cat.label)}</span>
          <h3 class="card-title">${highlight(listing.title, query)}</h3>
          ${listing.description ? `<p class="card-desc">${highlight(listing.description, query)}</p>` : ''}
          <div class="card-foot">
            <span class="price">${formatMoney(listing.price, listing.currency)}</span>
            <time class="time" datetime="${posted.toISOString()}" title="${posted.toLocaleString()}">${timeAgo(listing.createdAt)}</time>
          </div>
        </div>
      </li>`;
  }

  function renderGrid(container, listings, query = '') {
    container.innerHTML = listings.map((l) => cardHtml(l, query)).join('');
  }

  App.view = { escapeHtml, highlight, formatMoney, timeAgo, cardHtml, renderGrid };
})(window.App = window.App || {});
