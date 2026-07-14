/* ui.js — utilitários de DOM, ícones SVG e componentes (toast, drawer, modal, menu).
 * Sem dependências. Ícones no estilo "stroke" (feather-like).
 */
(function (global) {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // ---------------------------------------------------------------- ícones
  var PATHS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    devices: '<rect x="2" y="4" width="14" height="12" rx="2"/><path d="M18 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-2"/><path d="M6 20h6"/>',
    activity: '<path d="M3 12h4l3 8 4-16 3 8h4"/>',
    shield: '<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 4 12.4H4a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 5.7 6.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 11 4.6V4a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2.5 2-2.5 3.5"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.6" y2="16.6"/>',
    bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.5-2"/>',
    wifi: '<path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="M2 9a15 15 0 0 1 20 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    zap: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    alert: '<path d="M12 3l9 16H3z"/><line x1="12" y1="9" x2="12" y2="14"/><circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none"/>',
    download: '<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
    thermo: '<path d="M12 3a2 2 0 0 0-2 2v9a4 4 0 1 0 4 0V5a2 2 0 0 0-2-2z"/>',
    droplet: '<path d="M12 3s6 5.5 6 10a6 6 0 0 1-12 0c0-4.5 6-10 6-10z"/>',
    flame: '<path d="M12 3c1 4 4 5 4 9a4 4 0 0 1-8 0c0-1.5.7-2.7 1.5-3.5C10 10 11 8 12 3z"/>',
    play: '<path d="M6 4l14 8-14 8z"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v5h-5"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    filter: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 16.2a6 6 0 0 0 0-8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 19.1a10 10 0 0 0 0-14.2"/>',
    key: '<circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M17 17l2-2M14 14l2-2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><circle cx="7" cy="7.5" r="0.6" fill="currentColor" stroke="none"/><circle cx="7" cy="16.5" r="0.6" fill="currentColor" stroke="none"/>',
    gauge: '<path d="M12 13l4-4"/><circle cx="12" cy="13" r="8"/><path d="M4 13a8 8 0 0 1 16 0"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'
  };
  function icon(name, cls) {
    var p = PATHS[name] || '';
    return '<svg class="icon ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + p + '</svg>';
  }

  // ---------------------------------------------------------------- toast
  function toast(msg, kind) {
    var wrap = $('#toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toast-wrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'toast ' + (kind || 'info');
    var ic = kind === 'bad' ? 'alert' : kind === 'ok' ? 'check' : 'zap';
    t.innerHTML = icon(ic, 'sm') + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .35s,transform .35s';
      t.style.opacity = '0'; t.style.transform = 'translateY(-8px)';
      setTimeout(function () { t.remove(); }, 360);
    }, kind === 'bad' ? 2600 : 1900);
  }

  // ---------------------------------------------------------------- drawer
  function ensureScrim() {
    var s = $('#scrim');
    if (!s) { s = document.createElement('div'); s.id = 'scrim'; s.className = 'scrim'; document.body.appendChild(s); }
    return s;
  }
  function drawer(title, bodyHtml, opts) {
    opts = opts || {};
    var scrim = ensureScrim();
    var d = document.createElement('aside');
    d.className = 'drawer';
    d.innerHTML =
      '<div class="dh">' + (opts.icon ? icon(opts.icon) : '') +
      '<h3>' + esc(title) + '</h3>' +
      '<button class="tb-btn" data-close style="margin-left:auto">' + icon('x') + '</button></div>' +
      '<div class="db">' + bodyHtml + '</div>';
    document.body.appendChild(d);
    function close() {
      d.classList.remove('open'); scrim.classList.remove('open');
      setTimeout(function () { d.remove(); }, 280);
    }
    scrim.classList.add('open');
    requestAnimationFrame(function () { d.classList.add('open'); });
    scrim.onclick = close;
    $$('[data-close]', d).forEach(function (b) { b.onclick = close; });
    return { el: d, close: close };
  }

  // ---------------------------------------------------------------- menu
  function toggleMenu(menuEl, open) {
    if (!menuEl) return;
    var willOpen = open != null ? open : !menuEl.classList.contains('open');
    $$('.menu.open').forEach(function (m) { if (m !== menuEl) m.classList.remove('open'); });
    menuEl.classList.toggle('open', willOpen);
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.menu') && !e.target.closest('[data-menu-trigger]')) {
      $$('.menu.open').forEach(function (m) { m.classList.remove('open'); });
    }
  });

  // ---------------------------------------------------------------- helpers de formatação
  function fmtTime(d) {
    d = d || new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function relTime(iso) {
    // aceita "HH:MM:SS" já formatado; devolve como está
    return iso || '—';
  }

  global.UI = {
    $: $, $$: $$, esc: esc, icon: icon, toast: toast, drawer: drawer,
    toggleMenu: toggleMenu, fmtTime: fmtTime, relTime: relTime
  };
})(window);
