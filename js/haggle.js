/* Haggle with the seller: make offers in yer own currency; the captain accepts, counters,
   or takes offence. Each listing's captain has a hidden walk-away price and limited patience. */
(function (App) {
  'use strict';

  const PATIENCE = 3;
  const sessions = new Map(); // listing id -> { patience, counter, deal } (lasts until reload)

  const pick = (lines) => lines[Math.floor(Math.random() * lines.length)];

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    return Math.abs(h);
  }

  /** Lowest fraction of the ask this captain will take: 72–84%, fixed per listing. */
  const floorFor = (listing) => 0.72 + (hash(listing.id) % 13) / 100;

  const LINES = {
    greet: [
      'Ahoy! {ask} be me price. Make me an offer, if ye dare.',
      'Fine loot, this. {ask} and it’s yers - or try yer luck.',
      'I’ll hear offers, landlubber. Askin’ {ask}.',
    ],
    full: ['Full price? Ha! An honest pirate. Done!', 'No haggling? Me kind o’ buyer. Deal!'],
    accept: [
      'Arr… ye drive a hard bargain. {offer} it is!',
      'Blast ye, fine - {offer}. Don’t tell the crew.',
      'Shake on it: {offer}. Pleasure robbin’- er, tradin’ with ye.',
    ],
    counter: [
      '{offer}? Ha! I’ll part with it for {counter}, not a doubloon less.',
      'Tempting… but no. Meet me at {counter}.',
      'Me parrot laughed at that. {counter}, final-ish offer.',
    ],
    insult: [
      '{offer}?! Ye insult me and me mother’s ship!',
      'For {offer} I’d sooner feed it to the sharks.',
      'Is that a price or a joke? {offer}… pah!',
    ],
    walkAway: ['That’s it - I’ll not trade with the likes o’ ye today!', 'Enough! Off me deck before I call the crew.'],
    done: ['A deal’s a deal. It’s waitin’ in yer bag.'],
  };

  function say(template, values) {
    return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
  }

  function session(id) {
    if (!sessions.has(id)) sessions.set(id, { patience: PATIENCE, counter: null, deal: null, log: [] });
    return sessions.get(id);
  }

  /** Haggle in the viewer's currency when rates allow, otherwise in the seller's. */
  function terms(listing) {
    const ctx = App.pricing.context();
    const cur = ctx && listing.currency !== ctx.display ? ctx.display : listing.currency;
    const ask = cur === listing.currency ? listing.price : App.currency.toBase(ctx.table, listing.price, listing.currency);
    return { cur, ask };
  }

  function render(listing, section) {
    const { formatMoney } = App.view;
    const s = session(listing.id);
    const { cur, ask } = terms(listing);
    const money = (n) => formatMoney(n, cur, { approx: cur !== listing.currency });
    const start = Math.round(ask * 0.8 * 100) / 100;

    if (!s.log.length) s.log.push({ who: 'captain', text: say(pick(LINES.greet), { ask: money(ask) }) });

    section.innerHTML = `
      <h3 id="haggle-heading">Haggle with the seller</h3>
      <div class="haggle-log" aria-live="polite"></div>
      <form class="haggle-form" novalidate>
        <div class="haggle-slider">
          <label for="offer-range">Yer offer <span class="offer-pct">80%</span> <span class="muted">o’ the askin’ price</span></label>
          <input id="offer-range" type="range" min="30" max="110" step="1" value="80">
        </div>
        <div class="haggle-row">
          <label for="offer-amount" class="visually-hidden">Offer amount in ${cur}</label>
          <span class="offer-cur" aria-hidden="true">${cur}</span>
          <input id="offer-amount" type="number" min="0" step="any" inputmode="decimal" value="${start}">
          <button type="submit" class="btn btn-primary">Make yer offer</button>
        </div>
        <div class="haggle-foot">
          <span class="patience" aria-label="Captain’s patience"></span>
          <button type="button" class="btn-link accept-counter" hidden></button>
        </div>
      </form>`;

    const log = section.querySelector('.haggle-log');
    const form = section.querySelector('.haggle-form');
    const range = section.querySelector('#offer-range');
    const amount = section.querySelector('#offer-amount');
    const pct = section.querySelector('.offer-pct');
    const patienceEl = section.querySelector('.patience');
    const counterBtn = section.querySelector('.accept-counter');

    function bubble({ who, text, mood = '' }, animate) {
      const el = document.createElement('div');
      el.className = `msg ${who}${mood ? ` is-${mood}` : ''}${animate ? ' is-new' : ''}`;
      el.innerHTML = `<span class="avatar" aria-hidden="true">${who === 'captain' ? '🏴‍☠️' : '🙋'}</span>`;
      const p = document.createElement('p');
      p.textContent = text;
      el.append(p);
      log.append(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }

    function post(entry) {
      s.log.push(entry);
      bubble(entry, true);
    }

    function syncFromRange() {
      pct.textContent = `${range.value}%`;
      amount.value = Math.round(ask * range.value) / 100;
    }
    function syncFromAmount() {
      const ratio = Math.round((Number(amount.value) / ask) * 100);
      if (Number.isFinite(ratio)) {
        range.value = Math.min(110, Math.max(30, ratio));
        pct.textContent = `${ratio}%`;
      }
    }

    function refreshControls() {
      patienceEl.textContent = `Patience: ${'☠'.repeat(s.patience)}${'·'.repeat(PATIENCE - s.patience)}`;
      const over = s.deal !== null || s.patience <= 0;
      form.querySelectorAll('input, button[type="submit"]').forEach((el) => { el.disabled = over; });
      counterBtn.hidden = over || s.counter === null;
      if (s.counter !== null) counterBtn.textContent = `Take the captain’s ${money(s.counter)}`;
      form.classList.toggle('is-over', over);
    }

    function strike(price, origin) {
      s.deal = price;
      s.counter = null;
      // Convert the agreed price back into the seller's currency, pro rata to the ask.
      const dealInListing = cur === listing.currency ? price : (price / ask) * listing.price;
      App.bag.stow(listing, origin, Math.round(dealInListing * 100) / 100);
      App.fx.celebrate(origin, 'fanfare', 90);
      post({ who: 'captain', text: pick(LINES.done), mood: 'happy' });
      refreshControls();
    }

    function captainThinks(reply) {
      const typing = bubble({ who: 'captain', text: '…' }, true);
      typing.classList.add('is-typing');
      form.classList.add('is-waiting');
      setTimeout(() => {
        typing.remove();
        form.classList.remove('is-waiting');
        if (!section.isConnected) return;
        reply();
        refreshControls();
      }, 650);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const offer = Number(amount.value);
      if (!Number.isFinite(offer) || offer <= 0) {
        amount.focus();
        return;
      }
      post({ who: 'you', text: `I’ll give ye ${money(offer)}.` });
      const ratio = offer / ask;
      const floor = floorFor(listing);
      const origin = form.querySelector('[type="submit"]');

      captainThinks(() => {
        if (ratio >= 1) {
          post({ who: 'captain', text: pick(LINES.full), mood: 'happy' });
          strike(ask, origin);
        } else if (ratio >= floor) {
          post({ who: 'captain', text: say(pick(LINES.accept), { offer: money(offer) }), mood: 'happy' });
          strike(offer, origin);
        } else {
          s.patience -= 1;
          const insulted = ratio < floor - 0.2;
          App.fx.play('grumble');
          if (s.patience <= 0) {
            s.counter = null;
            post({ who: 'captain', text: pick(LINES.walkAway), mood: 'angry' });
          } else if (insulted) {
            post({ who: 'captain', text: say(pick(LINES.insult), { offer: money(offer) }), mood: 'angry' });
          } else {
            // Meet halfway between the offer and the ask, but never below the captain's floor.
            s.counter = Math.round(Math.max(ask * floor, (offer + ask) / 2) * 100) / 100;
            post({ who: 'captain', text: say(pick(LINES.counter), { offer: money(offer), counter: money(s.counter) }) });
          }
        }
      });
    });

    counterBtn.addEventListener('click', () => {
      post({ who: 'you', text: `Done - ${money(s.counter)}.` });
      strike(s.counter, counterBtn);
    });
    range.addEventListener('input', syncFromRange);
    amount.addEventListener('input', syncFromAmount);

    s.log.forEach((entry) => bubble(entry, false));
    if (s.deal !== null) amount.value = Math.round(s.deal * 100) / 100;
    syncFromAmount();
    refreshControls();
  }

  App.detail.onOpen.push((listing, body) => {
    if (!(listing.price > 0)) return; // nothing to haggle over free loot
    const section = document.createElement('section');
    section.className = 'detail-section haggle';
    section.setAttribute('aria-labelledby', 'haggle-heading');
    body.querySelector('.detail-price').after(section);
    render(listing, section);
  });
})(window.App = window.App || {});
