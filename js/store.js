/* Listing store: an in-memory array persisted to localStorage, with change listeners. */
(function (App) {
  'use strict';

  // New key for the Plunder Port reskin, so every crew starts with a fresh manifest of loot.
  const STORAGE_KEY = 'plunderport.loot.v1';
  const HOUR = 60 * 60 * 1000;
  const DEFAULT_CURRENCY = 'USD';

  const SEED = [
    { title: 'Brass spyglass, 20× magnification', price: 340, currency: 'GBP', category: 'electronics', description: 'Spotted a Navy frigate three leagues off with it. Small dent on the eyepiece.', age: 2 },
    { title: 'Iron-bound oak treasure chest', price: 1200, currency: 'EUR', category: 'furniture', description: 'Triple-locked, key included. Previous contents: none o’ yer business.', age: 5 },
    { title: 'Sloop “Salty Maiden”, 40 ft', price: 48000, currency: 'USD', category: 'vehicles', description: 'Two masts, fresh tar, patched sails. Comes with one friendly ghost.', age: 9 },
    { title: 'Map to Skull Isle — X clearly marked', price: 85000, currency: 'INR', category: 'books', description: 'Authentic (probably). Slight rum stain near the X.', age: 20 },
    { title: 'Captain’s tricorn hat with plume', price: 220, currency: 'CAD', category: 'clothing', description: 'Survived three mutinies. Feather replaced only once.', age: 26 },
    { title: 'Barrel of spiced Caribbean rum', price: 26000, currency: 'JPY', category: 'home', description: 'Aged twelve years in the hold. Keep well away from lit cannons.', age: 40 },
    { title: 'Matched pair of flintlock pistols', price: 950, currency: 'CHF', category: 'sports', description: 'Velvet-lined case, powder horn included.', age: 52 },
    { title: 'Parrot that squawks “pieces of eight”', price: 60, currency: 'USD', category: 'other', description: 'Also knows several words unfit for print.', age: 70 },
    { title: 'Toledo-steel cutlass', price: 3100, currency: 'SEK', category: 'sports', description: 'Keen edge, barnacle-free, balanced for boarding actions.', age: 96 },
    { title: 'Brass sextant & star almanac', price: 480, currency: 'AUD', category: 'electronics', description: 'Never once lost at sea while holdin’ it. Almanac good till 1799.', age: 120 },
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
