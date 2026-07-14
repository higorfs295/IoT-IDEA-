/* dashboard.js — liga o store aos elementos do dashboard e desenha sparklines */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  function esc(s) {
    return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  // desenha um mini grafico (sparkline) num <svg>
  function sparkline(svg, arr, color) {
    if (!svg) return;
    const w = 56, h = 22, pad = 2;
    if (!arr || arr.length < 2) { svg.innerHTML = ''; return; }
    const min = Math.min.apply(null, arr), max = Math.max.apply(null, arr);
    const rng = (max - min) || 1;
    const pts = arr.map((v, i) => {
      const x = pad + (i / (arr.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / rng) * (h - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`;
  }

  let last = { http: 0, fail: 0, inj: 0 };
  function flash(el) { if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 500); }

  function render(s) {
    const card = $('lockcard');
    if (card) card.className = 'card lock st-' + s.estado;
    if ($('lockstate')) $('lockstate').textContent = s.estado;
    if ($('lockicon')) $('lockicon').textContent = s.estado === 'ABERTA' ? '🔓' : '🔒';
    if ($('lockbadge')) $('lockbadge').textContent = s.estado === 'ABERTA' ? 'porta destrancada' : 'porta trancada';
    if ($('lockmeta')) $('lockmeta').textContent = s.evento || '—';

    if ($('tdht')) $('tdht').textContent = s.temp_dht;
    if ($('udht')) $('udht').textContent = s.umid_dht;
    if ($('tntc')) $('tntc').textContent = s.temp_ntc;
    sparkline($('sp_tdht'), s.spark && s.spark.temp_dht, '#38bdf8');
    sparkline($('sp_udht'), s.spark && s.spark.umid_dht, '#38bdf8');
    sparkline($('sp_tntc'), s.spark && s.spark.temp_ntc, '#e8a13a');

    if ($('k_http')) { $('k_http').textContent = s.tentativas_http; if (s.tentativas_http !== last.http) flash($('kpi_http')); }
    if ($('k_fail')) { $('k_fail').textContent = s.tentativas_falhas; if (s.tentativas_falhas !== last.fail) flash($('kpi_fail')); }
    if ($('k_inj')) { $('k_inj').textContent = s.injecoes_mqtt; if (s.injecoes_mqtt !== last.inj) flash($('kpi_inj')); }
    last = { http: s.tentativas_http, fail: s.tentativas_falhas, inj: s.injecoes_mqtt };

    const ult = $('ult');
    if (ult) { ult.textContent = s.ultima_tentativa; ult.className = s.tls ? 'prot' : 'exp'; }
    if ($('authtag')) {
      $('authtag').textContent = s.tls ? 'HTTPS · TLS' : 'HTTP · SEM TLS';
      $('authtag').className = 'tag' + (s.tls ? ' ok' : '');
    }

    const tb = $('log');
    if (tb) {
      tb.innerHTML = '';
      s.log.slice().reverse().forEach((e, idx) => {
        const cls = e.exposto ? 'exposed' : 'protected';
        const txt = e.exposto ? 'VISTO' : 'protegido';
        const tr = document.createElement('tr');
        if (idx === 0) tr.className = 'new';
        tr.innerHTML = `<td>${e.ts}</td><td><span class="chip c-${e.canal}">${e.canal}</span></td>` +
          `<td class="tp ${e.tipo}">${e.tipo}</td><td>${esc(e.detalhe)}</td>` +
          `<td class="${cls}">${txt}</td>`;
        tb.appendChild(tr);
      });
    }

    // badge de modo
    const mb = $('modebadge');
    if (mb) mb.innerHTML = s.mode === 'live'
      ? '<span class="dot"></span> modo <b>conectado</b> · dispositivo real'
      : '<span class="dot"></span> modo <b>demo</b> · simulação no navegador';
    const live = $('live');
    if (live) live.textContent = s.mode === 'live' ? 'ao vivo · SSE' : 'demo · simulação';
  }

  // ---- bootstrap ----
  window.addEventListener('DOMContentLoaded', function () {
    const store = window.IoTStore.createStore();
    store.subscribe(render);

    window.IoTStore.initProvider(store).then(function (provider) {
      window.__provider = provider;

      // formulario de login
      const form = $('loginform');
      if (form) {
        form.addEventListener('submit', function (ev) {
          if (provider.kind === 'mock') {
            ev.preventDefault();
            const u = form.querySelector('[name=usuario]').value;
            const p = form.querySelector('[name=senha]').value;
            const r = provider.login(u, p);
            showToast(r.ok ? 'ACESSO LIBERADO' : 'Senha incorreta', r.ok);
          }
          // no modo live, deixa o POST /login nativo seguir
        });
      }

      // controles de demonstracao (so aparecem/funcionam no mock)
      bind('btn_inject', () => provider.injectMqtt && provider.injectMqtt());
      bind('btn_brute', () => provider.simBrute && provider.simBrute());
      bind('btn_tls', () => provider.toggleTls && provider.toggleTls());
    });
  });

  function bind(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }

  function showToast(msg, ok) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'toast';
      t.style.cssText = 'position:fixed;left:50%;top:24px;transform:translateX(-50%);z-index:99;' +
        'padding:12px 20px;border-radius:12px;font-weight:800;color:#06203a;box-shadow:0 10px 30px rgba(0,0,0,.4)';
      document.body.appendChild(t);
    }
    t.style.background = ok ? 'linear-gradient(135deg,#1f9d6b,#127a51)' : 'linear-gradient(135deg,#e0533d,#b23a28)';
    t.style.color = '#fff'; t.textContent = msg; t.style.opacity = '1';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 1600);
  }
})();
