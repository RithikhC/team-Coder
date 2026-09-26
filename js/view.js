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
        <span class="price" title="Exchanged from ${original} at the Harbour Master’s rates">≈ ${formatMoney(converted, pricing.display, { approx: true })}</span>
        <span class="price-original">${original} asked</span>
      </span>`;
  }

  /** The seller's photo if they gave one (validated data: URL), otherwise the hold's icon. */
  function mediaHtml(listing, cat = App.getCategory(listing.category)) {
    return App.photo.isPhoto(listing.photo)
      ? `<img src="${listing.photo}" alt="" loading="lazy" decoding="async">`
      : `<span class="media-icon" aria-hidden="true">${cat.icon}</span>`;
  }

  function bagButtonHtml(listing) {
    const inBag = App.bag.has(listing.id);
    return `
      <button type="button" class="bag-add" data-action="bag" aria-pressed="${inBag}"
              aria-label="${inBag ? 'Take out of plunder bag' : 'Stow in plunder bag'}: ${escapeHtml(listing.title)}"
              title="${inBag ? 'In yer bag' : 'Stow in bag'}">
        <span aria-hidden="true">${inBag ? '✓' : '🪙'}</span>
      </button>`;
  }

  function saveButtonHtml(listing) {
    const saved = App.saved.has(listing.id);
    return `
      <button type="button" class="save-btn" data-action="save" aria-pressed="${saved}"
              aria-label="${saved ? 'Stop coveting' : 'Covet'}: ${escapeHtml(listing.title)}"
              title="${saved ? 'Coveted' : 'Covet this loot'}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 4.3 2.4h1.8c.7-1.3 2.2-2.4 4.3-2.4 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>
      </button>`;
  }

  function cardHtml(listing, query, pricing) {
    const cat = App.getCategory(listing.category);
    const posted = new Date(listing.createdAt);
    return `
      <li class="card" style="--hue:${cat.hue}" data-id="${escapeHtml(listing.id)}">
        <div class="card-media${listing.photo ? ' has-photo' : ''}" aria-hidden="true">${mediaHtml(listing, cat)}</div>
        ${saveButtonHtml(listing)}
        <div class="card-body">
          <div class="card-meta">
            <span class="card-cat">${escapeHtml(cat.label)}</span>
            <time class="time" datetime="${posted.toISOString()}" title="${posted.toLocaleString()}">${timeAgo(listing.createdAt)}</time>
          </div>
          <h3 class="card-title">
            <button type="button" class="card-open" data-action="open">${highlight(listing.title, query)}</button>
          </h3>
          ${listing.description ? `<p class="card-desc">${highlight(listing.description, query)}</p>` : ''}
          <div class="card-foot">
            ${priceHtml(listing, pricing)}
            ${bagButtonHtml(listing)}
          </div>
        </div>
      </li>`;
  }

  // Ids on screen after the previous render: only cards that newly appear get the
  // (staggered) entrance animation, so toggling a heart doesn't replay the whole board.
  // A card that entered moments ago (e.g. just before live rates re-rendered the grid)
  // keeps its entrance so the animation isn't cut short.
  const ENTRANCE_MS = 900;
  let shownIds = new Set();
  const enteredAt = new Map(); // id -> { i, t }

  function renderGrid(container, listings, query = '', pricing = null) {
    container.innerHTML = listings.map((l) => cardHtml(l, query, pricing)).join('');

    const now = performance.now();
    let next = 0;
    container.querySelectorAll('.card').forEach((card) => {
      const id = card.dataset.id;
      let entry = enteredAt.get(id);
      if (!shownIds.has(id)) {
        entry = { i: Math.min(next++, 12), t: now };
        enteredAt.set(id, entry);
      } else if (!entry || now - entry.t > ENTRANCE_MS) {
        return;
      }
      card.classList.add('is-entering');
      card.style.setProperty('--i', entry.i);
    });
    shownIds = new Set(listings.map((l) => l.id));
  }

  App.view = { escapeHtml, highlight, formatMoney, timeAgo, priceHtml, mediaHtml, cardHtml, renderGrid };
})(window.App = window.App || {});
