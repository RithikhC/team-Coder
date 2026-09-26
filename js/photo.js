/* Loot portraits: drag & drop, paste or pick an image; it's downscaled on a <canvas>
   to a small JPEG data URL so it fits comfortably in localStorage. */
(function (App) {
  'use strict';

  const MAX_SIDE = 720;
  const QUALITY = 0.78;
  const MAX_FILE_BYTES = 12 * 1024 * 1024;
  const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture be cursed — could not read it.')); };
      img.src = url;
    });
  }

  async function toDataUrl(file) {
    if (!file || !file.type.startsWith('image/')) throw new Error('That be no picture, matey — images only.');
    if (file.size > MAX_FILE_BYTES) throw new Error('Too heavy for the hold — keep pictures under 12 MB.');

    const img = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7ebcf'; // parchment behind transparent PNGs
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', QUALITY);
  }

  const isPhoto = (value) => typeof value === 'string' && value.length < 800_000 && DATA_URL.test(value);

  /** Wires up the drop zone and returns a small controller for the form. */
  function initField({ zone, input, preview, removeButton, errorEl }) {
    let value = '';

    function set(next) {
      value = isPhoto(next) ? next : '';
      preview.hidden = !value;
      removeButton.hidden = !value;
      zone.classList.toggle('has-photo', Boolean(value));
      if (value) preview.src = value;
      else preview.removeAttribute('src');
    }

    async function accept(file) {
      errorEl.textContent = '';
      zone.classList.add('is-busy');
      try {
        set(await toDataUrl(file));
        App.fx?.play('pop');
      } catch (err) {
        errorEl.textContent = err.message;
      } finally {
        zone.classList.remove('is-busy');
        input.value = '';
      }
    }

    input.addEventListener('change', () => input.files[0] && accept(input.files[0]));
    removeButton.addEventListener('click', () => {
      set('');
      input.focus();
    });

    ['dragenter', 'dragover'].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add('is-dragging');
    }));
    ['dragleave', 'dragend', 'drop'].forEach((type) => zone.addEventListener(type, () => {
      zone.classList.remove('is-dragging');
    }));
    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) accept(file);
    });

    // Paste a screenshot anywhere on the page (unless a dialog is open).
    document.addEventListener('paste', (event) => {
      if (document.querySelector('dialog[open]')) return;
      const item = [...(event.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
      if (!item) return;
      event.preventDefault();
      accept(item.getAsFile());
      zone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    return {
      get value() { return value; },
      set,
      clear: () => { set(''); errorEl.textContent = ''; },
    };
  }

  App.photo = { toDataUrl, initField, isPhoto };
})(window.App = window.App || {});
