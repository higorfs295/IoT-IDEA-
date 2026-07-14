/* fleet.js — modelo de "frota" para a página de Dispositivos.
 *
 * O dispositivo primário (CAM-G6) reflete o estado real do store (mock ou live).
 * Os demais são dispositivos SIMULADOS (marcados como demo) para dar o caráter de
 * um sistema de gestão de frota. Eles recebem pequena variação a cada tick.
 * Nada aqui altera o backend — é apenas apresentação no navegador.
 */
(function (global) {
  'use strict';

  // dispositivos simulados (didáticos) — claramente marcados como "demo"
  var sim = [
    { id: 'cam-recep', nome: 'CAM-RECEP · Recepção', tipo: 'Câmera IP', icon: 'camera', ip: '192.168.56.31', fw: 'v2.0', online: true, tls: true, estado: 'TRANCADA', temp: 23.4, umid: 52, base: 88 },
    { id: 'lock-lab3', nome: 'LOCK-LAB3 · Laboratório 3', tipo: 'Fechadura', icon: 'lock', ip: '192.168.56.32', fw: 'v2.0', online: true, tls: true, estado: 'TRANCADA', temp: 22.1, umid: 48, base: 82 },
    { id: 'sens-galpao', nome: 'SENS-GALPAO · Galpão', tipo: 'Sensor ambiental', icon: 'thermo', ip: '192.168.56.33', fw: 'v1.4', online: true, tls: false, estado: 'ONLINE', temp: 29.8, umid: 66, base: 54 },
    { id: 'gw-borda', nome: 'GW-BORDA · Gateway', tipo: 'Gateway / Edge', icon: 'server', ip: '192.168.56.10', fw: 'v3.1', online: true, tls: true, estado: 'ONLINE', temp: 41.2, umid: 30, base: 91 },
    { id: 'therm-sala', nome: 'THERM-SALA · Termostato', tipo: 'Termostato', icon: 'gauge', ip: '192.168.56.34', fw: 'v1.1', online: false, tls: false, estado: 'OFFLINE', temp: 0, umid: 0, base: 20 }
  ];

  function jitter(v, amp, lo, hi) {
    var n = v + (Math.random() - 0.5) * amp;
    return Math.round(Math.max(lo, Math.min(hi, n)) * 10) / 10;
  }

  function tick() {
    sim.forEach(function (d) {
      if (!d.online) return;
      d.temp = jitter(d.temp, 0.5, 15, 55);
      d.umid = jitter(d.umid, 1.2, 20, 85);
    });
  }
  setInterval(tick, 3000);

  // pontuação de postura (0..100, maior = melhor) e risco derivado
  function health(d) {
    var h = d.base || 60;
    if (!d.online) return 20;
    if (!d.tls) h -= 22;
    if (d.fw && /v1/.test(d.fw)) h -= 10;
    return Math.max(0, Math.min(100, Math.round(h)));
  }
  function riskLabel(h) {
    if (h >= 75) return { t: 'baixo', cls: 'ok', color: '#1f9d6b' };
    if (h >= 50) return { t: 'médio', cls: 'warn', color: '#e8a13a' };
    return { t: 'alto', cls: 'bad', color: '#e0533d' };
  }

  // dispositivo primário a partir do estado real do store
  function primary(state) {
    var h = state.tls ? 84 : 46;
    if (state.injecoes_mqtt > 0 || state.tentativas_falhas > 3) h -= 8;
    h = Math.max(0, Math.min(100, h));
    return {
      id: 'cam-g6', nome: 'CAM-G6 · Porta principal', tipo: 'Fechadura/Câmera', icon: 'camera',
      ip: (global.APP_CONFIG && global.APP_CONFIG.BASE_URL) ? '(live)' : '192.168.56.20',
      fw: 'v2.0', online: true, tls: !!state.tls, estado: state.estado,
      temp: state.temp_dht, umid: state.umid_dht, ntc: state.temp_ntc,
      primary: true, demo: (state.mode !== 'live'),
      _health: h
    };
  }

  function list(state) {
    var out = [primary(state)];
    // apenas no modo demo/mock adicionamos a frota simulada
    if (!state || state.mode !== 'live') {
      sim.forEach(function (d) {
        out.push(Object.assign({}, d, { demo: true, _health: health(d) }));
      });
    }
    return out;
  }

  function byId(state, id) {
    return list(state).filter(function (d) { return d.id === id; })[0] || null;
  }

  global.Fleet = { list: list, byId: byId, health: health, riskLabel: riskLabel };
})(window);
