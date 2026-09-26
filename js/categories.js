/* Category definitions shared by the form, filters and cards. */
(function (App) {
  'use strict';

  App.CATEGORIES = [
    { id: 'electronics', label: 'Electronics',   icon: '💻', hue: 225 },
    { id: 'furniture',   label: 'Furniture',     icon: '🛋️', hue: 28 },
    { id: 'vehicles',    label: 'Vehicles',      icon: '🚗', hue: 0 },
    { id: 'books',       label: 'Books',         icon: '📚', hue: 265 },
    { id: 'clothing',    label: 'Clothing',      icon: '👕', hue: 320 },
    { id: 'home',        label: 'Home & Garden', icon: '🪴', hue: 140 },
    { id: 'sports',      label: 'Sports',        icon: '⚽', hue: 190 },
    { id: 'other',       label: 'Other',         icon: '📦', hue: 45 },
  ];

  const byId = new Map(App.CATEGORIES.map((c) => [c.id, c]));

  App.getCategory = (id) => byId.get(id) || byId.get('other');
  App.isCategory = (id) => byId.has(id);
})(window.App = window.App || {});
