/* Listing store: an in-memory array persisted to localStorage, with change listeners. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'listit.listings.v1';
  const HOUR = 60 * 60 * 1000;
  const DEFAULT_CURRENCY = 'USD';

  const SEED = [
    { title: 'MacBook Air M2, 256GB', price: 749, currency: 'GBP', category: 'electronics', description: 'Barely used, battery cycle count 42. Comes with original charger and box.', age: 2 },
    { title: 'Mid-century oak coffee table', price: 180, currency: 'EUR', category: 'furniture', description: 'Solid oak, minor scratches on one leg. Pickup only.', age: 5 },
    { title: '2014 Honda Civic, 92k km', price: 7400, currency: 'USD', category: 'vehicles', description: 'Single owner, full service history, new tyres last spring.', age: 9 },
    { title: 'Sony WH-1000XM4 headphones', price: 16500, currency: 'INR', category: 'electronics', description: 'Noise cancelling, black. Includes carry case.', age: 20 },
    { title: 'Clean Code — Robert C. Martin', price: 18, currency: 'USD', category: 'books', description: 'Paperback, a few highlighted pages.', age: 26 },
    { title: 'North Face puffer jacket (M)', price: 130, currency: 'CAD', category: 'clothing', description: 'Worn one winter, no tears.', age: 40 },
    { title: 'Monstera deliciosa, ~1 m tall', price: 35, currency: 'EUR', category: 'home', description: 'Healthy and huge. Pot included.', age: 52 },
    { title: 'Adjustable dumbbells 2–24 kg', price: 32000, currency: 'JPY', category: 'sports', description: 'Pair, quick-dial weight selector.', age: 70 },
    { title: 'IKEA Billy bookcase, white', price: 450, currency: 'SEK', category: 'furniture', description: 'Already disassembled for easy transport.', age: 96 },
  ];

  const listeners = new Set();

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function seedListings() {
    const now = Date.now();
    return SEED.map(({ age, ...rest }) => ({ id: uid(), ...rest, createdAt: now - age * HOUR }));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) return seedListings();
      const data = JSON.parse(raw);
      // Listings saved before multi-currency support were all priced in USD.
      return Array.isArray(data) ? data.map((l) => ({ currency: DEFAULT_CURRENCY, ...l })) : seedListings();
    } catch (err) {
      console.warn('Could not read saved listings, starting fresh.', err);
      return seedListings();
    }
  }

  let listings = load();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    } catch (err) {
      console.warn('Could not save listings.', err);
    }
  }

  function emit() {
    listeners.forEach((fn) => fn(listings.slice()));
  }

  function normalize(input) {
    return {
      title: String(input.title).trim(),
      price: Math.round(Number(input.price) * 100) / 100,
      currency: /^[A-Z]{3}$/.test(input.currency) ? input.currency : DEFAULT_CURRENCY,
      category: App.isCategory(input.category) ? input.category : 'other',
      description: String(input.description || '').trim(),
    };
  }

  App.store = {
    all() {
      return listings.slice();
    },

    get(id) {
      return listings.find((l) => l.id === id) || null;
    },

    add(input) {
      const listing = { id: uid(), ...normalize(input), createdAt: Date.now() };
      listings.unshift(listing);
      persist();
      emit();
      return listing;
    },

    update(id, input) {
      const index = listings.findIndex((l) => l.id === id);
      if (index === -1) return null;
      listings[index] = { ...listings[index], ...normalize(input), updatedAt: Date.now() };
      persist();
      emit();
      return listings[index];
    },

    /** Removes a listing and returns what's needed to put it back exactly where it was. */
    remove(id) {
      const index = listings.findIndex((l) => l.id === id);
      if (index === -1) return null;
      const [listing] = listings.splice(index, 1);
      persist();
      emit();
      return { listing, index };
    },

    restore({ listing, index }) {
      if (listings.some((l) => l.id === listing.id)) return;
      listings.splice(Math.min(index, listings.length), 0, listing);
      persist();
      emit();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  persist();
})(window.App = window.App || {});
