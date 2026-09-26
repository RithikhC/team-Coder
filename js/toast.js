/* Lightweight toast notifications with an optional action (e.g. Undo). */
(function (App) {
  'use strict';

  /**
   * The region is a manual popover so toasts live in the top layer — above an open
   * <dialog>. Re-showing it moves it to the top of the stack after newer dialogs.
   */
  function setLayer(region, visible) {
    if (typeof region.showPopover !== 'function') return;
    try {
      if (region.matches(':popover-open')) region.hidePopover();
      if (visible) region.showPopover();
    } catch { /* unsupported or already in the requested state */ }
  }

  function toast(message, { action, timeout = 6000 } = {}) {
    const region = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast';

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    el.append(text);

    let timer;
    let gone = false;
    const dismiss = () => {
      if (gone) return;
      gone = true;
      clearTimeout(timer);
      el.classList.add('is-leaving');
      setTimeout(() => {
        el.remove();
        if (!region.childElementCount) setLayer(region, false);
      }, 200);
    };
    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(dismiss, ms);
    };

    if (action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast-action';
      button.textContent = action.label;
      button.addEventListener('click', () => {
        action.onClick();
        dismiss();
      });
      el.append(button);
    }

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss message');
    close.textContent = '✕';
    close.addEventListener('click', dismiss);
    el.append(close);

    // Pause while the user is hovering or focused inside, so Undo is never snatched away.
    el.addEventListener('pointerenter', () => clearTimeout(timer));
    el.addEventListener('pointerleave', () => schedule(2500));
    el.addEventListener('focusin', () => clearTimeout(timer));
    el.addEventListener('focusout', () => schedule(2500));

    region.append(el);
    setLayer(region, true);
    schedule(timeout);
    return dismiss;
  }

  App.toast = toast;
})(window.App = window.App || {});
