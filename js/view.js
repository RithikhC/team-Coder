/* Rendering helpers: formatting and HTML templates for listing cards. */
(function (App) {
  'use strict';

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
  }

  function formatMoney(amount, currency = 'USD', { approx = false } = {}) {
    try {
      // Converted prices are estimates: cents on a 4-digit number are just noise.
      const options = approx && Math.abs(amount) >= 1000 ? { maximumFractionDigits: 0 } : {};
      return new Intl.NumberFormat(undefined, { style: 'currency', currency, ...options }).format(amount);
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

  /**
   * Shows the price in the viewer's display currency when it differs from the listing's own,
   * keeping the seller's original price underneath for transparency.
   */
  function priceHtml(listing, pricing) {
    const original = formatMoney(listing.price, listing.currency);
    const converted = pricing && listing.currency !== pricing.display
      ? App.currency.toBase(pricing.table, listing.price, listing.currency)
      : null;

    if (converted === null) return `<span class="price">${original}</span>`;
    return `
      <span class="price-stack">
        <span class="price" title="Converted from ${original} at ECB rates">≈ ${formatMoney(converted, pricing.display, { approx: true })}</span>
        <span class="price-original">${original} listed</span>
      </span>`;
  }

  function cardHtml(listing, query, pricing) {
    const cat = App.getCategory(listing.category);
    const posted = new Date(listing.createdAt);
    return `
      <li class="card" style="--hue:${cat.hue}" data-id="${escapeHtml(listing.id)}">
        <div class="card-media" aria-hidden="true">${cat.icon}</div>
        <div class="card-body">
          <span class="card-cat">${escapeHtml(cat.label)}</span>
          <h3 class="card-title">
            <button type="button" class="card-open" data-action="open">${highlight(listing.title, query)}</button>
          </h3>
          ${listing.description ? `<p class="card-desc">${highlight(listing.description, query)}</p>` : ''}
          <div class="card-foot">
            ${priceHtml(listing, pricing)}
            <time class="time" datetime="${posted.toISOString()}" title="${posted.toLocaleString()}">${timeAgo(listing.createdAt)}</time>
          </div>
        </div>
      </li>`;
  }

  function renderGrid(container, listings, query = '', pricing = null) {
    container.innerHTML = listings.map((l) => cardHtml(l, query, pricing)).join('');
  }

  App.view = { escapeHtml, highlight, formatMoney, timeAgo, priceHtml, cardHtml, renderGrid };
})(window.App = window.App || {});
