/* App bootstrap: owns UI state and wires the modules together. */
(function (App) {
  'use strict';

  const els = {
    grid: document.getElementById('listings'),
    count: document.getElementById('result-count'),
    empty: document.getElementById('empty-state'),
  };

  function refresh() {
    const visible = App.store.all();

    App.view.renderGrid(els.grid, visible);
    els.empty.hidden = visible.length > 0;
    els.count.textContent = `${visible.length} listing${visible.length === 1 ? '' : 's'}`;
  }

  App.store.subscribe(refresh);
  refresh();
})(window.App = window.App || {});
