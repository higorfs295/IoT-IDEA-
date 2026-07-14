/* app.js — shell do console: config, tema, sidebar, topbar e roteamento.
 * Depende de: config.js, store.js, charts.js, ui.js, fleet.js, router.js, views.js
 */
(function () {
  'use strict';
  var UI = window.UI, icon = UI.icon, $ = UI.$, $$ = UI.$$;

  var LS_CFG = 'iotconsole.cfg', LS_THEME = 'iotconsole.theme';

  // ------------------------------------------------------ config persistida
  function loadStoredConfig() {
    try {
      var raw = localStorage.getItem(LS_CFG);
      if (raw) Object.assign(window.APP_CONFIG, JSON.parse(raw));
    } catch (e) {}
  }
  function saveConfig(obj) {
    if (obj === null) { localStorage.removeItem(LS_CFG); return; }
    var cur = {};
    try { cur = JSON.parse(localStorage.getItem(LS_CFG) || '{}'); } catch (e) {}
    localStorage.setItem(LS_CFG, JSON.stringify(Object.assign(cur, obj)));
  }
  function getConfig() { return window.APP_CONFIG || {}; }

  // ------------------------------------------------------ tema
  function getTheme() { return document.documentElement.getAttribute('data-theme') || 'dark'; }
  function setTheme(t) {
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(LS_THEME, t); } catch (e) {}
    var b = $('[data-ref="theme"]');
    if (b) b.innerHTML = icon(t === 'light' ? 'moon' : 'sun');
  }
  function loadStoredTheme() {
    var t = 'dark';
    try { t = localStorage.getItem(LS_THEME) || 'dark'; } catch (e) {}
    setTheme(t);
  }

  // ------------------------------------------------------ navegação (modelo)
  var NAV = [
    { sec: 'Operação', items: [
      { path: '/', label: 'Visão geral', icon: 'grid' },
      { path: '/dispositivos', label: 'Dispositivos', icon: 'devices' },
      { path: '/telemetria', label: 'Telemetria', icon: 'activity' }
    ]},
    { sec: 'Segurança', items: [
      { path: '/seguranca', label: 'Central de Segurança', icon: 'shield' },
      { path: '/eventos', label: 'Eventos & Logs', icon: 'list', badge: 'attacks' },
      { path: '/conformidade', label: 'Conformidade', icon: 'checkCircle' }
    ]},
    { sec: 'Sistema', items: [
      { path: '/config', label: 'Configurações', icon: 'settings' },
      { path: '/ajuda', label: 'Ajuda', icon: 'help' }
    ]}
  ];

  function buildSidebar() {
    var nav = $('#sbnav');
    nav.innerHTML = NAV.map(function (grp) {
      return '<div class="sb-sec">' + UI.esc(grp.sec) + '</div>' +
        grp.items.map(function (it) {
          return '<a class="sb-link" href="#' + it.path + '" data-path="' + it.path + '">' +
            icon(it.icon) + '<span class="lbl">' + UI.esc(it.label) + '</span>' +
            (it.badge ? '<span class="badge-num zero" data-badge="' + it.badge + '">0</span>' : '') + '</a>';
        }).join('');
    }).join('');
  }

  function setActiveNav(path) {
    $$('#sbnav .sb-link').forEach(function (a) {
      var p = a.getAttribute('data-path');
      var active = p === '/' ? path === '/' : (path === p || path.indexOf(p + '/') === 0);
      a.classList.toggle('active', active);
    });
  }

  // ------------------------------------------------------ chrome dinâmico
  function updateChrome(s) {
    // badges de ataque (sidebar + topbar)
    var attacks = (s.tentativas_http || 0) + (s.injecoes_mqtt || 0);
    $$('[data-badge="attacks"]').forEach(function (b) {
      b.textContent = attacks; b.classList.toggle('zero', attacks === 0);
    });
    var bell = $('[data-ref="bellnum"]');
    if (bell) { bell.textContent = attacks; bell.style.display = attacks ? 'grid' : 'none'; }

    // rodapé da sidebar: modo + TLS
    var modeEl = $('[data-ref="sbmode"]');
    if (modeEl) modeEl.innerHTML = s.mode === 'live'
      ? '<span class="dot"></span><span class="txt">conectado · <b>dispositivo real</b></span>'
      : '<span class="dot"></span><span class="txt">modo <b>demo</b> · simulação</span>';
    var tlsEl = $('[data-ref="sbtls"]');
    if (tlsEl) tlsEl.innerHTML = s.tls
      ? '<span class="dot"></span><span class="txt">canal <b>HTTPS · TLS</b></span>'
      : '<span class="dot off"></span><span class="txt">canal <b>HTTP</b> · sem TLS</span>';

    // pílula do topo (ambiente)
    var env = $('[data-ref="envpill"]');
    if (env) env.innerHTML = (s.mode === 'live' ? '<span class="dot"></span> ao vivo · SSE' : '<span class="dot"></span> demo · simulação');
  }

  // ------------------------------------------------------ bootstrap
  window.addEventListener('DOMContentLoaded', function () {
    loadStoredConfig();
    loadStoredTheme();
    buildSidebar();

    var consoleEl = $('#console');
    var store = window.IoTStore.createStore();

    // colapsar sidebar
    var collapseBtn = $('[data-ref="collapse"]');
    if (collapseBtn) collapseBtn.onclick = function () { consoleEl.classList.toggle('collapsed'); };
    // menu mobile
    var menuBtn = $('[data-ref="menu"]');
    if (menuBtn) menuBtn.onclick = function () { consoleEl.classList.toggle('nav-open'); };
    // fecha nav mobile ao clicar num link
    $('#sbnav').addEventListener('click', function (e) {
      if (e.target.closest('.sb-link')) consoleEl.classList.remove('nav-open');
    });

    // tema (topbar)
    var themeBtn = $('[data-ref="theme"]');
    if (themeBtn) { themeBtn.innerHTML = icon(getTheme() === 'light' ? 'moon' : 'sun');
      themeBtn.onclick = function () { setTheme(getTheme() === 'light' ? 'dark' : 'light'); }; }

    // busca: Enter leva aos Eventos; tecla "/" foca a busca
    var searchInput = $('[data-ref="search"]');
    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') location.hash = '/eventos';
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === '/' && document.activeElement !== searchInput &&
            !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) {
          e.preventDefault(); searchInput.focus();
        }
      });
    }
    // sino de alertas leva aos Eventos
    var bellBtn = $('[data-ref="bell"]');
    if (bellBtn) bellBtn.onclick = function () { location.hash = '/eventos'; };

    window.IoTStore.initProvider(store).then(function (provider) {
      window.__provider = provider;

      var router = window.Router.create();
      var ctx = {
        store: store, provider: provider, router: router,
        getConfig: getConfig, saveConfig: saveConfig, getTheme: getTheme, setTheme: setTheme,
        act: function (name) {
          if (provider.kind === 'live') { UI.toast('No modo conectado, os ataques vêm do Kali.', 'info'); return; }
          if (name === 'inject') { provider.injectMqtt(); }
          else if (name === 'brute') { provider.simBrute(); UI.toast('Brute force simulado iniciado…', 'info'); }
          else if (name === 'tls') { provider.toggleTls(); UI.toast(store.get().tls ? 'Defesa aplicada (TLS + auth + rate limit)' : 'Defesa retirada (modo inseguro)', store.get().tls ? 'ok' : 'bad'); }
        }
      };

      var V = window.Views;
      router.register('/', function (p, c) { return V.Overview(p, c); });
      router.register('/dispositivos', function (p, c) { return V.Devices(p, c); });
      router.register('/dispositivos/:id', function (p, c) { return V.DeviceDetail(p, c); });
      router.register('/telemetria', function (p, c) { return V.Telemetry(p, c); });
      router.register('/seguranca', function (p, c) { return V.Security(p, c); });
      router.register('/eventos', function (p, c) { return V.Events(p, c); });
      router.register('/conformidade', function (p, c) { return V.Compliance(p, c); });
      router.register('/config', function (p, c) { return V.Settings(p, c); });
      router.register('/ajuda', function (p, c) { return V.Help(p, c); });

      // quick actions (topbar)
      wireQuickMenu(ctx);
      wireAvatarMenu();

      router.start($('#outlet'), {
        ctx: ctx,
        onNavigate: function (path, view) {
          setActiveNav(path);
          var h = $('[data-ref="ttl"]'); if (h) h.textContent = view.title || '';
          var cr = $('[data-ref="crumb"]'); if (cr) cr.textContent = view.crumb || '';
        }
      });

      store.subscribe(function (state) { router.update(state); updateChrome(state); });
    });
  });

  function wireQuickMenu(ctx) {
    var trig = $('[data-ref="quick"]');
    var menu = $('[data-ref="quickmenu"]');
    if (!trig || !menu) return;
    var live = ctx.provider.kind === 'live';
    trig.onclick = function (e) { e.stopPropagation(); UI.toggleMenu(menu); };
    $$('[data-qa]', menu).forEach(function (mi) {
      mi.onclick = function () {
        UI.toggleMenu(menu, false);
        var a = mi.getAttribute('data-qa');
        if (a === 'login') { location.href = 'login.html'; return; }
        ctx.act(a);
      };
    });
    if (live) menu.querySelectorAll('[data-qa]:not([data-qa="login"])').forEach(function (mi) {
      mi.style.opacity = '.5';
    });
  }

  function wireAvatarMenu() {
    var trig = $('[data-ref="avatar"]');
    var menu = $('[data-ref="avatarmenu"]');
    if (!trig || !menu) return;
    trig.onclick = function (e) { e.stopPropagation(); UI.toggleMenu(menu); };
    $$('[data-av]', menu).forEach(function (mi) {
      mi.onclick = function () {
        UI.toggleMenu(menu, false);
        var a = mi.getAttribute('data-av');
        if (a === 'theme') setTheme(getTheme() === 'light' ? 'dark' : 'light');
        else if (a === 'config') location.hash = '/config';
        else if (a === 'logout') location.href = 'login.html';
      };
    });
  }
})();
