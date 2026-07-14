/* router.js — roteador por hash (#/rota) sem dependências.
 * Views são fábricas: factory(params, ctx) -> { title, crumb, render(), mount(root), update(state), unmount() }
 */
(function (global) {
  'use strict';

  function createRouter() {
    var routes = [];      // { re, keys, factory }
    var outlet = null;
    var ctx = {};
    var current = null;   // view atual (instância)
    var onNavigate = null;

    function register(path, factory) {
      var keys = [];
      var re = new RegExp('^' + path.replace(/:[^/]+/g, function (m) {
        keys.push(m.slice(1)); return '([^/]+)';
      }).replace(/\//g, '\\/') + '$');
      routes.push({ re: re, keys: keys, factory: factory });
    }

    function parseHash() {
      var h = location.hash.replace(/^#/, '') || '/';
      if (h[0] !== '/') h = '/' + h;
      return h;
    }

    function resolve(path) {
      for (var i = 0; i < routes.length; i++) {
        var m = path.match(routes[i].re);
        if (m) {
          var params = {};
          routes[i].keys.forEach(function (k, idx) { params[k] = decodeURIComponent(m[idx + 1]); });
          return { factory: routes[i].factory, params: params };
        }
      }
      return null;
    }

    function navigate() {
      var path = parseHash();
      var r = resolve(path) || resolve('/');
      if (!r) return;
      if (current && current.unmount) { try { current.unmount(); } catch (e) {} }
      var view = r.factory(r.params, ctx);
      current = view;
      if (outlet) {
        outlet.innerHTML = typeof view.render === 'function' ? view.render() : (view.html || '');
        if (view.mount) { try { view.mount(outlet, ctx); } catch (e) { console.error(e); } }
        // scroll ao topo do conteúdo
        var sc = outlet.closest('.main') || window;
        if (sc.scrollTo) sc.scrollTo({ top: 0, behavior: 'auto' });
      }
      if (onNavigate) onNavigate(path, view);
      // primeira pintura com estado atual
      if (view.update && ctx.store) { try { view.update(ctx.store.get()); } catch (e) {} }
    }

    function update(state) {
      if (current && current.update) { try { current.update(state); } catch (e) {} }
    }

    function start(outletEl, options) {
      outlet = outletEl;
      options = options || {};
      ctx = options.ctx || {};
      onNavigate = options.onNavigate || null;
      window.addEventListener('hashchange', navigate);
      navigate();
    }

    function go(path) {
      if (location.hash === '#' + path) { navigate(); }
      else location.hash = path;
    }

    return { register: register, start: start, update: update, go: go, current: function () { return current; } };
  }

  global.Router = { create: createRouter };
})(window);
