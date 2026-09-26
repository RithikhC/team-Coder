/* Holds (categories) shared by the form, filters and cards.
   Ids are stable storage keys; labels, icons and hues are the Plunder Port skin. */
(function (App) {
  'use strict';

  App.CATEGORIES = [
    { id: 'electronics', label: 'Navigation',       icon: '🔭', hue: 45 },
    { id: 'furniture',   label: 'Chests & Coffers', icon: '💰', hue: 24 },
    { id: 'vehicles',    label: 'Ships & Dinghies', icon: '⛵', hue: 205 },
    { id: 'books',       label: 'Maps & Charts',    icon: '🗺️', hue: 80 },
    { id: 'clothing',    label: 'Garb & Hats',      icon: '🎩', hue: 330 },
    { id: 'home',        label: 'Grog & Grub',      icon: '🍺', hue: 140 },
    { id: 'sports',      label: 'Blades & Cannons', icon: '⚔️', hue: 0 },
    { id: 'other',       label: 'Curiosities',      icon: '🦜', hue: 170 },
  ];

  const byId = new Map(App.CATEGORIES.map((c) => [c.id, c]));

  App.getCategory = (id) => byId.get(id) || byId.get('other');
  App.isCategory = (id) => byId.has(id);
})(window.App = window.App || {});
