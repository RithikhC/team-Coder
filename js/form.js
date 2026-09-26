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

    if (!data.title) errors.title = 'Give your listing a title.';
    else if (data.title.length < 3) errors.title = 'Title should be at least 3 characters.';

    const price = Number(data.price);
    if (data.price === '') errors.price = 'Enter a price (use 0 for free items).';
    else if (!Number.isFinite(price)) errors.price = 'Price must be a number.';
    else if (price < 0) errors.price = 'Price can’t be negative.';
    else if (price > MAX_PRICE) errors.price = 'That’s a bit much — keep it under 10 million.';

    if (!App.isCategory(data.category)) errors.category = 'Pick a category.';

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

  function init(form, statusEl) {
    const select = form.elements.category;
    App.CATEGORIES.forEach((c) => select.add(new Option(`${c.icon}  ${c.label}`, c.id)));

    currencySelect = form.elements.currency;
    fillCurrencies(currencySelect, App.currency.FALLBACK_CURRENCIES, 'USD');
    App.currency.currencies().then((list) => fillCurrencies(currencySelect, list));
    currencySelect.addEventListener('change', () => { currencyChosen = true; });

    let statusTimer;
    function flash(message) {
      statusEl.textContent = message;
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { statusEl.textContent = ''; }, 3500);
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = read(form);
      const errors = validate(data);
      showErrors(form, errors);

      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) {
        form.elements[firstInvalid].focus();
        return;
      }

      const listing = App.store.add(data);
      const lastCurrency = currencySelect.value;
      form.reset();
      currencySelect.value = lastCurrency; // sellers usually post several items in one currency
      form.elements.title.focus();
      flash(`Posted “${listing.title}”.`);
    });

    form.addEventListener('input', (event) => {
      if (event.target.getAttribute('aria-invalid') === 'true') clearFieldError(form, event.target.name);
    });
  }

  App.form = { init, validate, suggestCurrency };
})(window.App = window.App || {});
