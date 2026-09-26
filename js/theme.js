/* Light/dark theme toggle. Follows the OS setting until the user picks one explicitly.
   The initial theme is applied by an inline <head> script to avoid a flash. */
(function (App) {
  'use strict';

  const STORAGE_KEY = 'listit.theme';
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function saved() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function apply(theme, button) {
    root.dataset.theme = theme;
    const label = theme === 'dark'
      ? 'Douse the lanterns (switch to daylight theme)'
      : 'Light the lanterns (switch to night-watch theme)';
    button.setAttribute('aria-label', label);
    button.title = label;
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', getComputedStyle(root).getPropertyValue('--surface').trim());
  }

  function init(button) {
    apply(root.dataset.theme || (systemDark.matches ? 'dark' : 'light'), button);

    button.addEventListener('click', () => {
      const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
      apply(theme, button);
    });

    systemDark.addEventListener('change', (event) => {
      if (!saved()) apply(event.matches ? 'dark' : 'light', button);
    });
  }

  App.theme = { init };
})(window.App = window.App || {});
