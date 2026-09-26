/* Adds a "what this costs you over the last 30 days" chart to the detail dialog. */
(function (App) {
  'use strict';

  const DAYS = 30;

  /** Compare against the viewer's currency; fall back to USD/EUR for same-currency listings. */
  function compareCurrency(listing) {
    if (listing.currency !== App.pricing.display) return App.pricing.display;
    return listing.currency === 'USD' ? 'EUR' : 'USD';
  }

  const formatDate = (iso) => new Date(`${iso}T00:00:00`)
    .toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  App.detail.onOpen.push(async (listing, body) => {
    const target = compareCurrency(listing);
    const section = document.createElement('section');
    section.className = 'detail-section';
    section.setAttribute('aria-labelledby', 'history-heading');
    section.innerHTML = `
      <h3 id="history-heading">Cost in ${target} · last ${DAYS} days</h3>
      <div class="skeleton spark-skeleton"></div>`;
    body.querySelector('#detail-actions').before(section);

    try {
      const history = await App.currency.history(listing.currency, target, DAYS);
      if (App.detail.currentId !== listing.id || !section.isConnected) return;
      if (history.length < 2) throw new Error('Not enough data');

      const points = history.map((p) => ({ date: p.date, value: p.rate * listing.price }));
      const chart = App.sparkline.create(points, {
        format: (n) => App.view.formatMoney(n, target, { approx: true }),
        formatDate,
        label: `Price of ${listing.title} in ${target} over the last ${DAYS} days`,
      });
      section.querySelector('.spark-skeleton').replaceWith(chart);
    } catch {
      if (!section.isConnected) return;
      section.querySelector('.spark-skeleton').outerHTML =
        '<p class="fx-note">Rate history is unavailable right now.</p>';
    }
  });
})(window.App = window.App || {});
