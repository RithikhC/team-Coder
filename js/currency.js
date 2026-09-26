/* Frankfurter currency API client (https://frankfurter.dev) - no key needed.
   Rates are cached in memory + localStorage, concurrent requests are de-duplicated,
   and a stale cached table is used as a fallback when the network fails. */
(function (App) {
  'use strict';

  const API = 'https://api.frankfurter.dev/v1';
  const RATES_KEY = 'listit.rates.v1';
  const CURRENCIES_KEY = 'listit.currencies.v1';
  const RATES_TTL = 6 * 60 * 60 * 1000;       // ECB publishes once per working day
  const CURRENCIES_TTL = 7 * 24 * 60 * 60 * 1000;

  // Used until /currencies responds (or if it never does).
  const FALLBACK_CURRENCIES = {
    AUD: 'Australian Dollar', CAD: 'Canadian Dollar', CHF: 'Swiss Franc', CNY: 'Chinese Renminbi Yuan',
    EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee', JPY: 'Japanese Yen',
    SEK: 'Swedish Krona', SGD: 'Singapore Dollar', USD: 'United States Dollar',
  };

  const memory = new Map();   // base -> rates table
  const inflight = new Map(); // url -> Promise

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full or blocked - cache is best effort */ }
  }

  function getJson(url, timeoutMs = 8000) {
    if (inflight.has(url)) return inflight.get(url);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const request = fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Frankfurter responded with ${res.status}`);
        return res.json();
      })
      .finally(() => {
        clearTimeout(timer);
        inflight.delete(url);
      });

    inflight.set(url, request);
    return request;
  }

  /** { CODE: 'Name', ... } of every currency Frankfurter supports. */
  async function currencies() {
    const cached = readJson(CURRENCIES_KEY, null);
    if (cached && Date.now() - cached.fetchedAt < CURRENCIES_TTL) return cached.list;
    try {
      const list = await getJson(`${API}/currencies`);
      writeJson(CURRENCIES_KEY, { list, fetchedAt: Date.now() });
      return list;
    } catch {
      return cached?.list || FALLBACK_CURRENCIES;
    }
  }

  /**
   * Latest rates with `base` as the unit: { base, date, rates: { EUR: 0.87, ... }, stale? }.
   * rates[base] is always 1 so lookups never special-case the base.
   */
  async function rates(base) {
    const cachedAll = readJson(RATES_KEY, {});
    const hit = memory.get(base) || cachedAll[base];
    if (hit && Date.now() - hit.fetchedAt < RATES_TTL) {
      memory.set(base, hit);
      return hit;
    }

    try {
      const data = await getJson(`${API}/latest?base=${encodeURIComponent(base)}`);
      const table = { base, date: data.date, rates: { ...data.rates, [base]: 1 }, fetchedAt: Date.now() };
      memory.set(base, table);
      writeJson(RATES_KEY, { ...readJson(RATES_KEY, {}), [base]: table });
      return table;
    } catch (err) {
      if (hit) return { ...hit, stale: true };
      throw err;
    }
  }

  /** Convert `amount` in `from` into the table's base currency. Returns null if unknown. */
  function toBase(table, amount, from) {
    if (!table) return null;
    const rate = table.rates[from];
    return rate ? amount / rate : null;
  }

  /** Exact server-side conversion of one amount into several currencies. */
  async function quote(amount, from, targets) {
    const to = targets.filter((c) => c !== from).join(',');
    if (!to) return { date: null, rates: {} };
    return getJson(`${API}/latest?amount=${encodeURIComponent(amount)}&from=${from}&to=${to}`);
  }

  const isoDate = (d) => d.toISOString().slice(0, 10);
  const historyCache = new Map();

  /** Daily rates for 1 `from` in `to` over the last `days` days: [{ date, rate }, ...]. */
  async function history(from, to, days = 30) {
    const start = isoDate(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
    const key = `${from}>${to}@${start}`;
    if (historyCache.has(key)) return historyCache.get(key);

    const data = await getJson(`${API}/${start}..?base=${from}&symbols=${to}`);
    const points = Object.entries(data.rates)
      .map(([date, r]) => ({ date, rate: r[to] }))
      .filter((p) => typeof p.rate === 'number')
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    historyCache.set(key, points);
    return points;
  }

  App.currency = { API, FALLBACK_CURRENCIES, currencies, rates, toBase, quote, history };
})(window.App = window.App || {});
