/* store.js — camada de dados da aplicacao
 * Fornece um "store" com o estado do dispositivo e notifica os assinantes.
 * Dois provedores: MockProvider (sem backend) e LiveProvider (dispositivo_iot.py).
 */
(function (global) {
  'use strict';
  const CFG = global.APP_CONFIG || {};

  // ----------------------------------------------------------- util
  function now() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ----------------------------------------------------------- Store
  function createStore() {
    const listeners = new Set();
    let state = emptyState();
    return {
      get: () => state,
      set: (s) => { state = s; listeners.forEach((fn) => fn(state)); },
      patch: (p) => { state = Object.assign({}, state, p); listeners.forEach((fn) => fn(state)); },
      subscribe: (fn) => { listeners.add(fn); fn(state); return () => listeners.delete(fn); },
    };
  }
  function emptyState() {
    return {
      estado: 'TRANCADA', evento: 'Dispositivo iniciado (trancado)',
      ultima_tentativa: '—', tls: false,
      temp_dht: 24.0, umid_dht: 55.0, temp_ntc: 24.5,
      tentativas_http: 0, tentativas_falhas: 0, injecoes_mqtt: 0,
      log: [], mode: 'mock',
      spark: { temp_dht: [], umid_dht: [], temp_ntc: [] },
    };
  }

  // ----------------------------------------------------------- MockProvider
  // Simula um dispositivo IoT no navegador: telemetria variando, e reage a
  // acoes locais (login pelo formulario, "injecao" MQTT via botao de demo).
  function MockProvider(store) {
    let s = emptyState(); s.mode = 'mock';
    let relockTimer = null;

    function pushLog(canal, tipo, detalhe, exposto) {
      s.log.push({ ts: now(), canal, tipo, detalhe, exposto });
      if (s.log.length > 40) s.log.shift();
    }
    function commit() {
      // limita historico dos sparklines
      ['temp_dht', 'umid_dht', 'temp_ntc'].forEach((k) => {
        s.spark[k].push(s[k]); if (s.spark[k].length > 20) s.spark[k].shift();
      });
      store.set(Object.assign({}, s, { spark: {
        temp_dht: s.spark.temp_dht.slice(), umid_dht: s.spark.umid_dht.slice(),
        temp_ntc: s.spark.temp_ntc.slice() } }));
    }
    function abrir(origem, canal, exposto) {
      s.estado = 'ABERTA'; s.evento = `[${now()}] ACESSO LIBERADO via ${origem}`;
      pushLog(canal, 'ABRIR', origem, exposto);
      if (relockTimer) clearTimeout(relockTimer);
      relockTimer = setTimeout(() => {
        s.estado = 'TRANCADA'; s.evento = `[${now()}] Trava fechada automaticamente`; commit();
      }, 8000);
      commit();
    }
    function negar(canal, detalhe, exposto) {
      s.tentativas_falhas++; s.evento = `[${now()}] ACESSO NEGADO`;
      s.ultima_tentativa = exposto ? detalhe : 'login (cifrado)';
      pushLog(canal, 'NEGAR', detalhe, exposto); commit();
    }

    // telemetria periodica
    const tick = setInterval(() => {
      s.temp_dht = clamp(s.temp_dht + (Math.random() - 0.5) * 0.6, 18, 32);
      s.umid_dht = clamp(s.umid_dht + (Math.random() - 0.5) * 1.4, 30, 80);
      s.temp_ntc = clamp(s.temp_dht + (Math.random() - 0.5) * 0.8, 18, 32);
      s.temp_dht = Math.round(s.temp_dht * 10) / 10;
      s.umid_dht = Math.round(s.umid_dht * 10) / 10;
      s.temp_ntc = Math.round(s.temp_ntc * 10) / 10;
      commit();
    }, CFG.MOCK_TICK_MS || 2000);

    // API publica do provider
    return {
      kind: 'mock',
      start() { commit(); },
      stop() { clearInterval(tick); if (relockTimer) clearTimeout(relockTimer); },
      // chamado pelo formulario de login do dashboard/login.html
      login(usuario, senha) {
        s.tentativas_http++;
        const exposto = !s.tls;
        if (usuario === 'admin' && senha === 'admin123') {
          s.ultima_tentativa = exposto ? `HTTP usuario=${usuario} senha=${senha}` : 'login (cifrado)';
          abrir(`HTTP/login (usuario=${usuario})`, 'HTTP', exposto);
          return { ok: true };
        }
        s.ultima_tentativa = exposto ? `HTTP usuario=${usuario} senha=${senha}` : 'login (cifrado)';
        negar('HTTP', `usuario=${usuario} senha=${senha}`, exposto);
        return { ok: false };
      },
      // simulacoes de ataque para a apresentacao (botoes do rodape)
      injectMqtt() { s.injecoes_mqtt++; abrir('MQTT (casa/porta)', 'MQTT', !s.tls); },
      simBrute() {
        const senhas = ['123456', 'admin', 'password', 'qwerty', 'admin123'];
        let i = 0;
        const iv = setInterval(() => {
          const p = senhas[i++];
          this.login('admin', p);
          if (p === 'admin123' || i >= senhas.length) clearInterval(iv);
        }, 500);
      },
      toggleTls() {
        s.tls = !s.tls;
        s.evento = `[${now()}] ${s.tls ? 'TLS/HTTPS ativado (virada)' : 'voltou a HTTP sem TLS'}`;
        pushLog('SYS', s.tls ? 'ABRIR' : 'FECHAR', s.tls ? 'defesa: TLS + senha forte' : 'inseguro (demo)', false);
        commit();
      },
    };
  }

  // ----------------------------------------------------------- LiveProvider
  // Conecta ao dispositivo_iot.py real: SSE em /events, fallback /state,
  // e POST /login para o formulario.
  function LiveProvider(store, base) {
    let es = null, poll = null, alive = false;
    function apply(json) {
      const s = Object.assign(emptyState(), json, { mode: 'live' });
      // mantem sparklines localmente a partir das leituras que chegam
      const prev = store.get();
      s.spark = prev.spark || { temp_dht: [], umid_dht: [], temp_ntc: [] };
      ['temp_dht', 'umid_dht', 'temp_ntc'].forEach((k) => {
        s.spark[k] = (s.spark[k] || []).concat([json[k]]).slice(-20);
      });
      store.set(s);
    }
    return {
      kind: 'live',
      start() {
        try {
          es = new EventSource(base + '/events');
          es.onmessage = (ev) => { alive = true; apply(JSON.parse(ev.data)); };
          es.onerror = () => { /* mantem; SSE reconecta sozinho */ };
        } catch (e) { /* sem SSE: usa polling */ }
        poll = setInterval(() => {
          fetch(base + '/state').then((r) => r.json()).then(apply).catch(() => {});
        }, CFG.POLL_MS || 1500);
      },
      stop() { if (es) es.close(); if (poll) clearInterval(poll); },
      // no modo live o proprio <form> faz POST /login; estes ficam no-op
      injectMqtt() { alert('No modo conectado, a injecao vem do Kali (mosquitto_pub).'); },
      simBrute() { alert('No modo conectado, o brute force vem do Kali (hydra).'); },
      toggleTls() { alert('No modo conectado, a virada TLS e feita no broker/dispositivo.'); },
      login() { /* form nativo cuida do POST */ },
    };
  }

  // ----------------------------------------------------------- bootstrap
  // Decide o provider conforme APP_CONFIG.MODE (com deteccao no modo 'auto').
  function initProvider(store) {
    const base = (CFG.BASE_URL || '').replace(/\/$/, '');
    const mode = CFG.MODE || 'auto';
    if (mode === 'mock') return Promise.resolve(startMock());
    if (mode === 'live') return Promise.resolve(startLive());

    // auto: tenta /healthz rapido; se responder, live; senao mock
    return fetch(base + '/healthz', { method: 'GET' })
      .then((r) => (r.ok ? startLive() : startMock()))
      .catch(() => startMock());

    function startMock() { const p = MockProvider(store); p.start(); return p; }
    function startLive() { const p = LiveProvider(store, base); p.start(); return p; }
  }

  global.IoTStore = { createStore, initProvider, emptyState };
})(window);
