/* Post-a-listing form: reads, validates and submits new listings. */
(function (App) {
  'use strict';

  const MAX_PRICE = 10_000_000;

  function read(form) {
    const fd = new FormData(form);
    const get = (name) => String(fd.get(name) ?? '').trim();
    return {
      title: get('title'),
      price: get('price'),
      currency: get('currency'),
      category: get('category'),
      description: get('description'),
    };
  }

  function validate(data) {
    const errors = {};

    if (!data.title) errors.title = 'Every piece o’ loot needs a name, matey.';
    else if (data.title.length < 3) errors.title = 'Name it proper — at least 3 letters.';

    const price = Number(data.price);
    if (data.price === '') errors.price = 'Name yer price (0 if ye be givin’ it away).';
    else if (!Number.isFinite(price)) errors.price = 'That be no number I ever saw.';
    else if (price < 0) errors.price = 'A price can’t sink below the waterline.';
    else if (price > MAX_PRICE) errors.price = 'Not even the King’s treasury holds that much — keep it under 10 million.';

    if (!App.isCategory(data.category)) errors.category = 'Pick a hold to stow it in.';

    return errors;
  }

  function showErrors(form, errors) {
    form.querySelectorAll('[data-error-for]').forEach((node) => {
      const name = node.dataset.errorFor;
      const field = form.elements[name];
      node.textContent = errors[name] || '';
      field.setAttribute('aria-invalid', errors[name] ? 'true' : 'false');
      if (errors[name]) field.setAttribute('aria-describedby', node.id || (node.id = `${name}-error`));
      else field.removeAttribute('aria-describedby');
    });
  }

  function clearFieldError(form, name) {
    const node = form.querySelector(`[data-error-for="${name}"]`);
    if (!node) return;
    node.textContent = '';
    form.elements[name].setAttribute('aria-invalid', 'false');
  }

  function fillCurrencies(select, list, preferred) {
    const wanted = preferred || select.value || 'USD';
    select.innerHTML = '';
    Object.keys(list).sort().forEach((code) => {
      const option = new Option(code, code);
      option.title = list[code];
      select.add(option);
    });
    select.value = list[wanted] ? wanted : 'USD';
  }

  let currencySelect = null;
  let currencyChosen = false;

  /** Default the listing currency to the viewer's own, until they pick one explicitly. */
  function suggestCurrency(code) {
    if (!currencySelect || currencyChosen) return;
    if ([...currencySelect.options].some((o) => o.value === code)) currencySelect.value = code;
  }

  const PREVIEW_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY'];

  /**
   * As the seller types, show what buyers elsewhere will see, using Frankfurter's
   * amount/from/to conversion endpoint. Debounced, and stale responses are dropped.
   */
  function createPricePreview(form, previewEl) {
    let timer;
    let seq = 0;

    function clear() {
      clearTimeout(timer);
      seq++;
      previewEl.textContent = '';
    }

    function update() {
      const raw = form.elements.price.value;
      const amount = Number(raw);
      const from = form.elements.currency.value;
      if (raw === '' || !Number.isFinite(amount) || amount <= 0) return clear();

      clearTimeout(timer);
      timer = setTimeout(async () => {
        const mine = ++seq;
        const targets = [...new Set([App.pricing?.display, ...PREVIEW_CURRENCIES])]
          .filter((code) => code && code !== from)
          .slice(0, 3);
        try {
          const data = await App.currency.quote(amount, from, targets);
          if (mine !== seq) return;
          const parts = targets
            .filter((code) => data.rates[code] != null)
            .map((code) => `<strong>${App.view.formatMoney(data.rates[code], code, { approx: true })}</strong>`);
          previewEl.innerHTML = parts.length ? `Pirates in far ports pay ≈ ${parts.join(' · ')}` : '';
        } catch {
          if (mine === seq) previewEl.textContent = '';
        }
      }, 350);
    }

    form.elements.price.addEventListener('input', update);
    form.elements.currency.addEventListener('change', update);
    return { update, clear };
  }

  function init(form, statusEl) {
    const select = form.elements.category;
    App.CATEGORIES.forEach((c) => select.add(new Option(`${c.icon}  ${c.label}`, c.id)));

    currencySelect = form.elements.currency;
    fillCurrencies(currencySelect, App.currency.FALLBACK_CURRENCIES, 'USD');
    App.currency.currencies().then((list) => fillCurrencies(currencySelect, list));
    currencySelect.addEventListener('change', () => { currencyChosen = true; });

    const preview = createPricePreview(form, document.getElementById('price-preview'));
    const photo = App.photo.initField({
      zone: document.getElementById('photo-zone'),
      input: document.getElementById('photo'),
      preview: document.getElementById('photo-preview'),
      removeButton: document.getElementById('photo-remove'),
      errorEl: document.getElementById('photo-error'),
    });

    let statusTimer;
    function flash(message) {
      statusEl.textContent = message;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 3500);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = { ...read(form), photo: photo.value };
      const errors = validate(data);
      showErrors(form, errors);

      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) {
        form.elements[firstInvalid].focus();
        return;
      }

      if (editingId) {
        const listing = App.store.update(editingId, data);
        stopEdit();
        flash(`Refitted “${listing.title}”.`);
        App.toast(`“${listing.title}” refitted and back on the board.`, { timeout: 3000 });
        return;
      }

      const listing = App.store.add(data);
      const lastCurrency = currencySelect.value;
      form.reset();
      currencySelect.value = lastCurrency; // sellers usually post several items in one currency
      preview.clear();
      photo.clear();
      form.elements.title.focus();
      flash(`Hoisted “${listing.title}” onto the board!`);
      App.fx.celebrate(ui.submit);
    });

    form.addEventListener('input', (event) => {
      if (event.target.getAttribute('aria-invalid') === 'true') clearFieldError(form, event.target.name);
    });

    const ui = {
      panel: form.closest('.post-panel'),
      heading: document.getElementById('post-heading'),
      submit: form.querySelector('[type="submit"]'),
      cancel: document.getElementById('cancel-edit'),
    };
    const defaults = { heading: ui.heading.textContent, submit: ui.submit.textContent };

    startEdit = (listing) => {
      editingId = listing.id;
      showErrors(form, {});
      form.elements.title.value = listing.title;
      form.elements.price.value = listing.price;
      currencySelect.value = listing.currency;
      form.elements.category.value = listing.category;
      form.elements.description.value = listing.description || '';
      photo.set(listing.photo || '');

      ui.heading.textContent = 'Refit yer loot';
      ui.submit.textContent = 'Seal the changes';
      ui.cancel.hidden = false;
      ui.panel.classList.add('is-editing');
      ui.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      form.elements.title.focus({ preventScroll: true });
      preview.update();
    };

    stopEdit = () => {
      editingId = null;
      form.reset();
      showErrors(form, {});
      preview.clear();
      photo.clear();
      ui.heading.textContent = defaults.heading;
      ui.submit.textContent = defaults.submit;
      ui.cancel.hidden = true;
      ui.panel.classList.remove('is-editing');
    };

    ui.cancel.addEventListener('click', stopEdit);
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && editingId) stopEdit();
    });
  }

  let editingId = null;
  let startEdit = () => {};
  let stopEdit = () => {};

  App.form = {
    init,
    validate,
    suggestCurrency,
    startEdit: (listing) => startEdit(listing),
    stopEdit: () => stopEdit(),
    get editingId() { return editingId; },
  };
})(window.App = window.App || {});
