/* login.js — comportamento da tela de login dedicada.
 * No modo demo (mock), valida localmente e vai para resultado.html.
 * No modo conectado (live), deixa o POST /login nativo seguir para o dispositivo.
 */
(function () {
  'use strict';
  window.addEventListener('DOMContentLoaded', function () {
    const cfg = window.APP_CONFIG || {};
    const dl = document.getElementById('devlabel');
    if (dl && cfg.DEVICE_LABEL) dl.textContent = cfg.DEVICE_LABEL;

    const store = window.IoTStore.createStore();
    window.IoTStore.initProvider(store).then(function (provider) {
      const form = document.getElementById('loginform');
      if (!form) return;
      form.addEventListener('submit', function (ev) {
        if (provider.kind !== 'mock') return; // live: POST nativo
        ev.preventDefault();
        const u = form.querySelector('[name=usuario]').value;
        const p = form.querySelector('[name=senha]').value;
        const ok = (u === 'admin' && p === 'admin123');
        const params = new URLSearchParams({ r: ok ? 'ok' : 'no' });
        window.location.href = 'resultado.html?' + params.toString();
      });
    });
  });
})();
