/* Edit / delete actions for a listing, surfaced in the detail dialog. */
(function (App) {
  'use strict';

  function edit(id) {
    const listing = App.store.get(id);
    if (!listing) return;
    App.detail.close();
    App.form.startEdit(listing);
  }

  function remove(id) {
    const removed = App.store.remove(id);
    if (!removed) return;
    App.detail.close();
    if (App.form.editingId === id) App.form.stopEdit();

    App.toast(`“${removed.listing.title}” walked the plank.`, {
      action: { label: 'Fish it out!', onClick: () => App.store.restore(removed) },
    });
  }

  App.detail.onOpen.push((listing, body) => {
    body.querySelector('#detail-actions').insertAdjacentHTML('afterbegin', `
      <button type="button" class="btn btn-danger-ghost" data-action="delete">Walk the plank</button>
      <span class="spacer"></span>
      <button type="button" class="btn btn-ghost" data-action="edit">Refit</button>`);
  });

  document.getElementById('detail').addEventListener('click', (event) => {
    const button = event.target.closest('[data-action="edit"], [data-action="delete"]');
    if (!button) return;
    const id = App.detail.currentId;
    if (button.dataset.action === 'edit') edit(id);
    else remove(id);
  });
})(window.App = window.App || {});
