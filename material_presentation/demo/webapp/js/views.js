/* views.js — páginas (views) do console. Cada view é uma fábrica:
 *   factory(params, ctx) -> { title, crumb, render(), mount(root), update(state), unmount() }
 * ctx = { store, provider, router, act, setTheme, getTheme, saveConfig, getConfig }
 */
(function (global) {
  'use strict';
  var UI = global.UI, C = global.Charts, Fleet = global.Fleet;
  var icon = UI.icon, esc = UI.esc;

  // ------------------------------------------------------------- utilidades
  function q(root, ref) { return root.querySelector('[data-ref="' + ref + '"]'); }
  function setTxt(root, ref, v) { var e = q(root, ref); if (e) e.textContent = v; }
  function setHtml(root, ref, v) { var e = q(root, ref); if (e) e.innerHTML = v; }

  function postureScore(s) {
    var sc = 30;
    if (s.tls) sc += 32;
    if (s.mqtt_tls) sc += 20;
    if (s.bloqueios_http > 0 || s.tls) sc += 10;
    if (s.injecoes_mqtt > 0 && !s.mqtt_tls) sc -= 14;
    if (s.tentativas_falhas > 5 && !s.tls) sc -= 6;
    return Math.max(0, Math.min(100, Math.round(sc)));
  }
  function postureLabel(v) {
    if (v >= 75) return { t: 'Protegido', cls: 'ok' };
    if (v >= 45) return { t: 'Atenção', cls: 'warn' };
    return { t: 'Exposto', cls: 'bad' };
  }
  function tlsChip(s) {
    return s.tls
      ? '<span class="chip ok"><span class="cd"></span>HTTPS · TLS</span>'
      : '<span class="chip bad"><span class="cd"></span>HTTP · sem TLS</span>';
  }

  // linha de evento (tabela)
  function eventRow(e, isNew) {
    var cls = e.exposto ? 'exposed' : 'protected';
    var txt = e.exposto ? 'VISTO' : 'protegido';
    return '<tr' + (isNew ? ' class="new"' : '') + '>' +
      '<td class="mono">' + esc(e.ts) + '</td>' +
      '<td><span class="chip neutral c-' + esc(e.canal) + '">' + esc(e.canal) + '</span></td>' +
      '<td class="tp ' + esc(e.tipo) + '">' + esc(e.tipo) + '</td>' +
      '<td class="mono">' + esc(e.detalhe) + '</td>' +
      '<td class="' + cls + '">' + txt + '</td></tr>';
  }

  // KPI card estático (com data-ref para atualizar o número)
  function kpi(ref, label, ic, color, foot) {
    return '<div class="kpi" data-ref="' + ref + '_card">' +
      '<div class="kpi-top"><div class="kpi-ic ' + color + '">' + icon(ic) + '</div>' +
      '<div><div class="kpi-l">' + esc(label) + '</div></div></div>' +
      '<div class="kpi-n" data-ref="' + ref + '">—</div>' +
      '<div class="kpi-foot" data-ref="' + ref + '_foot">' + (foot || '') + '</div></div>';
  }

  // hero da trava + telemetria (bloco reutilizável)
  function lockBlock() {
    return '<section class="card lockcard st-TRANCADA" data-ref="lockcard">' +
      '<div class="card-h"><h3>Estado da trava</h3>' +
      '<span class="r" data-ref="tlschip">' + '</span></div>' +
      '<div class="card-b">' +
      '<div class="lockface"><div class="lockicon" data-ref="lockicon">🔒</div>' +
      '<div><div class="lockstate" data-ref="lockstate">—</div>' +
      '<div class="chip neutral mt-s" data-ref="lockbadge">porta trancada</div>' +
      '<div class="lockmeta" data-ref="lockmeta">—</div></div></div>' +
      '<div class="tele mt">' +
      teleCell('🌡️', 'tdht', '°C', 'DHT22 · temperatura', 'sp_tdht') +
      teleCell('💧', 'udht', '%', 'DHT22 · umidade', 'sp_udht') +
      teleCell('🔥', 'tntc', '°C', 'NTC 10k · temperatura', 'sp_tntc') +
      '</div></div></section>';
  }
  function teleCell(ic, ref, unit, k, spark) {
    return '<div class="tcell"><div class="ic">' + ic + '</div>' +
      '<div class="v"><span data-ref="' + ref + '">--</span> <span class="u">' + unit + '</span></div>' +
      '<div class="k">' + k + '</div><div class="spark" data-ref="' + spark + '"></div></div>';
  }

  function updLock(root, s) {
    var card = q(root, 'lockcard');
    if (card) card.className = 'card lockcard st-' + s.estado;
    setTxt(root, 'lockstate', s.estado);
    setTxt(root, 'lockicon', s.estado === 'ABERTA' ? '🔓' : '🔒');
    setTxt(root, 'lockbadge', s.estado === 'ABERTA' ? 'porta destrancada' : 'porta trancada');
    setTxt(root, 'lockmeta', s.evento || '—');
    setHtml(root, 'tlschip', tlsChip(s));
    setTxt(root, 'tdht', s.temp_dht); setTxt(root, 'udht', s.umid_dht); setTxt(root, 'tntc', s.temp_ntc);
    var sp = s.spark || {};
    setHtml(root, 'sp_tdht', C.sparkline(sp.temp_dht, { color: '#38bdf8' }));
    setHtml(root, 'sp_udht', C.sparkline(sp.umid_dht, { color: '#5aa0e8' }));
    setHtml(root, 'sp_tntc', C.sparkline(sp.temp_ntc, { color: '#e8a13a' }));
  }

  // painel de ações de demonstração (mock)
  function demoControls(ctx) {
    if (ctx.provider && ctx.provider.kind === 'live') {
      return '<div class="callout info">' + icon('radio') +
        '<div>Modo <b>conectado</b>: os ataques vêm do Kali (hydra, mosquitto_pub) e a virada é feita no dispositivo/broker. Os botões de simulação ficam desativados.</div></div>';
    }
    return '<div class="stack">' +
      '<button class="btn amber block" data-act="inject">' + icon('zap') + 'Injetar comando MQTT</button>' +
      '<button class="btn block" data-act="brute">' + icon('key') + 'Simular brute force (hydra)</button>' +
      '<button class="btn good block" data-act="tls">' + icon('shield') + 'Aplicar/retirar defesa (TLS)</button>' +
      '</div>';
  }
  function wireDemo(root, ctx) {
    UI.$$('[data-act]', root).forEach(function (b) {
      b.onclick = function () { ctx.act(b.getAttribute('data-act')); };
    });
  }

  // ============================================================= 1. Overview
  function Overview(params, ctx) {
    return {
      title: 'Visão geral', crumb: 'Operação',
      render: function () {
        return '' +
          '<div class="page-head"><div class="ph-t"><h2>Visão geral</h2>' +
          '<p>Estado operacional e de segurança da fechadura inteligente CAM-G6 em tempo real.</p></div>' +
          '<div class="ph-act"><button class="btn" data-ref="refresh">' + icon('refresh') + 'Atualizar</button>' +
          '<a class="btn primary" href="#/seguranca">' + icon('shield') + 'Central de Segurança</a></div></div>' +

          '<div class="grid g-4">' +
          kpi('k_devices', 'Dispositivos online', 'devices', 'c-brand') +
          kpi('k_posture', 'Postura de segurança', 'shield', 'c-good') +
          kpi('k_attacks', 'Tentativas de ataque', 'zap', 'c-amber') +
          kpi('k_block', 'Bloqueios (rate limit)', 'lock', 'c-violet') +
          '</div>' +

          '<div class="grid g-2-1 mt">' +
          lockBlock() +
          '<section class="card"><div class="card-h"><h3>Postura de segurança</h3>' +
          '<span class="r" data-ref="postchip"></span></div><div class="card-b">' +
          '<div style="text-align:center" data-ref="gauge"></div>' +
          '<div class="stack mt">' + demoControls(ctx) + '</div>' +
          '</div></section>' +
          '</div>' +

          '<div class="grid g-2-1 mt">' +
          '<section class="card"><div class="card-h"><h3>Placar de ataque</h3><span class="sub">sessão atual</span></div>' +
          '<div class="card-b"><div class="grid g-2" style="gap:12px">' +
          miniStat('m_http', 'tentativas HTTP', '#6cc8f4') +
          miniStat('m_fail', 'falhas de login', '#f0806c') +
          miniStat('m_inj', 'injeções MQTT', '#f0b95f') +
          miniStat('m_blk', 'bloqueios', '#37c088') +
          '</div><div class="lastbox mt"><b>última tentativa:</b><br><span data-ref="ult">—</span></div></div></section>' +

          '<section class="card"><div class="card-h"><h3>Eventos recentes</h3>' +
          '<a class="r" href="#/eventos">ver todos ' + icon('chevron', 'sm') + '</a></div>' +
          '<div class="card-b tight"><div class="tl" data-ref="tl"></div></div></section>' +
          '</div>';
      },
      mount: function (root) {
        wireDemo(root, ctx);
        var r = q(root, 'refresh'); if (r) r.onclick = function () { UI.toast('Painel atualizado', 'info'); };
      },
      update: function (s) {
        updLock(root0(this), s);
        var root = root0(this);
        // KPIs
        var fleet = Fleet.list(s); var online = fleet.filter(function (d) { return d.online; }).length;
        setTxt(root, 'k_devices', online);
        setHtml(root, 'k_devices_foot', '<span class="muted">de ' + fleet.length + ' na frota</span>');
        var post = postureScore(s), pl = postureLabel(post);
        setHtml(root, 'k_posture', post + '<span class="unit">/100</span>');
        setHtml(root, 'k_posture_foot', '<span class="chip ' + pl.cls + '">' + pl.t + '</span>');
        var attacks = (s.tentativas_http || 0) + (s.injecoes_mqtt || 0);
        setTxt(root, 'k_attacks', attacks);
        setHtml(root, 'k_attacks_foot', '<span class="muted">' + (s.tentativas_falhas || 0) + ' falhas de login</span>');
        setTxt(root, 'k_block', s.bloqueios_http || 0);
        setHtml(root, 'k_block_foot', s.tls ? '<span class="chip ok">defesa ativa</span>' : '<span class="chip warn">defesa inativa</span>');
        // gauge + chip
        setHtml(root, 'gauge', C.gauge(post, { label: pl.t }));
        setHtml(root, 'postchip', '<span class="chip ' + pl.cls + '"><span class="cd"></span>' + pl.t + '</span>');
        // placar
        setTxt(root, 'm_http', s.tentativas_http || 0);
        setTxt(root, 'm_fail', s.tentativas_falhas || 0);
        setTxt(root, 'm_inj', s.injecoes_mqtt || 0);
        setTxt(root, 'm_blk', s.bloqueios_http || 0);
        setTxt(root, 'ult', s.ultima_tentativa || '—');
        var ub = q(root, 'ult'); if (ub) ub.className = s.tls ? 'protected' : 'exposed';
        // timeline (últimos 6)
        var tl = q(root, 'tl');
        if (tl) {
          var evs = (s.log || []).slice(-6).reverse();
          tl.innerHTML = evs.length ? evs.map(function (e) {
            var k = e.tipo === 'ABRIR' ? 'good' : (e.tipo === 'NEGAR' || e.tipo === 'BLOQUEIO') ? 'bad' : '';
            return '<div class="ev ' + k + '"><div class="t">' + esc(e.detalhe) +
              ' <span class="chip neutral c-' + esc(e.canal) + '" style="margin-left:6px">' + esc(e.canal) + '</span></div>' +
              '<div class="m">' + esc(e.ts) + ' · ' + (e.exposto ? 'visto pelo atacante' : 'protegido') + '</div></div>';
          }).join('') : '<div class="empty"><div class="e-ic">' + icon('list') + '</div>Sem eventos ainda.</div>';
        }
      }
    };
  }
  function miniStat(ref, label, color) {
    return '<div class="kpi" style="padding:14px"><div class="kpi-n" data-ref="' + ref + '" style="color:' + color + ';font-size:26px">0</div>' +
      '<div class="kpi-l">' + esc(label) + '</div></div>';
  }
  // guarda o root por instância (mount recebe root; update também é chamado com root disponível via closure)
  function root0(view) { return view._root; }

  // ============================================================= 2. Dispositivos
  function Devices(params, ctx) {
    return {
      title: 'Dispositivos', crumb: 'Operação',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Dispositivos</h2>' +
          '<p>Frota conectada ao console. O dispositivo <b>CAM-G6</b> reflete o alvo real da demo; os demais são simulados para fins didáticos.</p></div>' +
          '<div class="ph-act"><span class="chip neutral" data-ref="count">—</span></div></div>' +
          '<div class="dev-grid" data-ref="grid"></div>';
      },
      mount: function (root) { this._root = root; },
      update: function (s) {
        var root = this._root; if (!root) return;
        var fleet = Fleet.list(s);
        setTxt(root, 'count', fleet.length + ' dispositivos');
        var grid = q(root, 'grid');
        grid.innerHTML = fleet.map(function (d) {
          var rl = Fleet.riskLabel(d._health);
          var st = d.estado === 'ABERTA' ? '<span class="chip bad"><span class="cd"></span>aberta</span>'
            : !d.online ? '<span class="chip neutral"><span class="cd"></span>offline</span>'
              : '<span class="chip ok"><span class="cd"></span>' + (d.estado === 'ONLINE' ? 'online' : 'trancada') + '</span>';
          return '<a class="dev" href="#/dispositivos/' + d.id + '">' +
            '<div class="dev-h"><div class="dev-ic">' + icon(d.icon) + '</div>' +
            '<div style="min-width:0"><b>' + esc(d.nome) + '</b><span>' + esc(d.ip) + ' · ' + esc(d.fw) + '</span></div></div>' +
            '<div class="row" style="gap:8px;flex-wrap:wrap">' + st +
            (d.tls ? '<span class="chip ok">TLS</span>' : '<span class="chip warn">sem TLS</span>') +
            (d.demo ? '<span class="tagbox demo">demo</span>' : '<span class="tagbox ok">alvo</span>') + '</div>' +
            '<div class="dev-metrics">' +
            (d.online ? '<span>' + icon('thermo', 'sm') + ' <b>' + d.temp + '°C</b></span><span>' + icon('droplet', 'sm') + ' <b>' + d.umid + '%</b></span>' : '<span class="muted">sem telemetria</span>') +
            '</div>' +
            '<div class="dev-foot"><div class="riskbar"><i style="width:' + d._health + '%;background:' + rl.color + '"></i></div>' +
            '<span class="chip ' + rl.cls + '">risco ' + rl.t + '</span></div></a>';
        }).join('');
      }
    };
  }

  // ============================================================= 3. Detalhe do dispositivo
  function DeviceDetail(params, ctx) {
    var id = params.id;
    return {
      title: 'Dispositivo', crumb: 'Operação · Dispositivos',
      render: function () {
        return '<div class="page-head"><div class="ph-t">' +
          '<div class="crumb" style="font-size:11px;color:var(--muted)"><a href="#/dispositivos">Dispositivos</a> ' + icon('chevron', 'sm') + ' <span data-ref="crumbid">' + esc(id) + '</span></div>' +
          '<h2 data-ref="dname">—</h2><p data-ref="dsub">—</p></div>' +
          '<div class="ph-act" data-ref="dact"></div></div>' +
          '<div data-ref="body"></div>';
      },
      mount: function (root) { this._root = root; },
      update: function (s) {
        var root = this._root; if (!root) return;
        var d = Fleet.byId(s, id);
        var body = q(root, 'body');
        if (!d) { body.innerHTML = '<div class="empty"><div class="e-ic">' + icon('alert') + '</div>Dispositivo não encontrado.</div>'; return; }
        setTxt(root, 'dname', d.nome);
        setHtml(root, 'dsub', esc(d.tipo) + ' · ' + esc(d.ip) + ' · firmware ' + esc(d.fw) + (d.demo ? ' &nbsp;<span class="tagbox demo">simulado</span>' : ''));
        var rl = Fleet.riskLabel(d._health);
        setHtml(root, 'dact', '<span class="chip ' + rl.cls + '">risco ' + rl.t + '</span>' +
          (d.tls ? '<span class="chip ok">TLS</span>' : '<span class="chip warn">sem TLS</span>'));

        var isPrimary = !!d.primary;
        body.innerHTML =
          '<div class="grid g-3">' +
          kpiStatic('Postura', d._health + '<span class="unit">/100</span>', 'shield', rl.cls === 'ok' ? 'c-good' : rl.cls === 'warn' ? 'c-amber' : 'c-bad') +
          kpiStatic('Estado', d.estado, d.estado === 'ABERTA' ? 'unlock' : 'lock', d.estado === 'ABERTA' ? 'c-bad' : 'c-good') +
          kpiStatic('Conexão', d.online ? 'online' : 'offline', 'wifi', d.online ? 'c-brand' : 'c-bad') +
          '</div>' +
          '<div class="grid g-2-1 mt">' +
          '<section class="card"><div class="card-h"><h3>Telemetria</h3><span class="sub">' + (d.online ? 'ao vivo' : 'indisponível') + '</span></div>' +
          '<div class="card-b">' + (d.online ?
            '<div class="tele">' +
            '<div class="tcell"><div class="ic">🌡️</div><div class="v">' + d.temp + ' <span class="u">°C</span></div><div class="k">temperatura</div></div>' +
            '<div class="tcell"><div class="ic">💧</div><div class="v">' + d.umid + ' <span class="u">%</span></div><div class="k">umidade</div></div>' +
            (isPrimary ? '<div class="tcell"><div class="ic">🔥</div><div class="v">' + (d.ntc || d.temp) + ' <span class="u">°C</span></div><div class="k">NTC 10k</div></div>' : '<div class="tcell"><div class="ic">📶</div><div class="v">OK <span class="u"></span></div><div class="k">enlace</div></div>') +
            '</div>' : '<div class="empty"><div class="e-ic">' + icon('wifi') + '</div>Dispositivo offline — sem telemetria.</div>') +
          '</div></section>' +
          '<section class="card"><div class="card-h"><h3>Ficha técnica</h3></div><div class="card-b">' +
          fichaRow('Identificador', d.id) +
          fichaRow('Tipo', d.tipo) +
          fichaRow('Endereço', d.ip) +
          fichaRow('Firmware', d.fw) +
          fichaRow('Criptografia', d.tls ? 'TLS habilitado' : 'ausente (HTTP)') +
          fichaRow('Categoria', d.demo ? 'Simulado (demo)' : 'Alvo real da demonstração') +
          '</div></section></div>' +
          (isPrimary ?
            '<section class="card mt"><div class="card-h"><h3>Ações</h3><span class="sub">controles da demonstração</span></div>' +
            '<div class="card-b"><div class="grid g-3">' + demoControls(ctx) + '</div></div></section>' : '');
        if (isPrimary) wireDemo(root, ctx);
      }
    };
  }
  function kpiStatic(label, val, ic, color) {
    return '<div class="kpi"><div class="kpi-top"><div class="kpi-ic ' + color + '">' + icon(ic) + '</div>' +
      '<div class="kpi-l">' + esc(label) + '</div></div><div class="kpi-n">' + val + '</div></div>';
  }
  function fichaRow(k, v) {
    return '<div class="field-row"><div class="fr-t"><b>' + esc(k) + '</b></div><div class="fr-r mono">' + esc(v) + '</div></div>';
  }

  // ============================================================= 4. Telemetria
  function Telemetry(params, ctx) {
    var range = '20';
    return {
      title: 'Telemetria', crumb: 'Operação',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Telemetria</h2>' +
          '<p>Séries dos sensores DHT22 (temperatura/umidade) e NTC 10k. No modo demo, os dados são simulados no navegador.</p></div>' +
          '<div class="ph-act"><div class="seg" data-ref="seg">' +
          '<button data-r="10">10</button><button class="active" data-r="20">20</button><button data-r="40">40</button></div></div></div>' +
          '<div class="grid g-3" data-ref="stats"></div>' +
          '<div class="grid g-1 mt">' + teleChartCard('temp_dht', 'DHT22 · Temperatura', '#38bdf8', '°C') +
          '</div>' +
          '<div class="grid g-2 mt">' +
          teleChartCard('umid_dht', 'DHT22 · Umidade', '#5aa0e8', '%') +
          teleChartCard('temp_ntc', 'NTC 10k · Temperatura', '#e8a13a', '°C') +
          '</div>';
      },
      mount: function (root) {
        this._root = root;
        var self = this;
        UI.$$('[data-ref="seg"] button', root).forEach(function (b) {
          b.onclick = function () {
            range = b.getAttribute('data-r');
            UI.$$('[data-ref="seg"] button', root).forEach(function (x) { x.classList.remove('active'); });
            b.classList.add('active');
            self.update(ctx.store.get());
          };
        });
      },
      update: function (s) {
        var root = this._root; if (!root) return;
        var sp = s.spark || {};
        var n = parseInt(range, 10);
        ['temp_dht', 'umid_dht', 'temp_ntc'].forEach(function (k, i) {
          var arr = (sp[k] || []).slice(-n);
          var color = i === 0 ? '#38bdf8' : i === 1 ? '#5aa0e8' : '#e8a13a';
          setHtml(root, 'chart_' + k, C.area(arr, { color: color, h: k === 'temp_dht' ? 150 : 120 }));
          var cur = q(root, 'cur_' + k); if (cur) cur.textContent = (arr.length ? arr[arr.length - 1] : '--');
        });
        // stats cards
        var st = q(root, 'stats');
        st.innerHTML = [
          statCard('Temperatura DHT22', sp.temp_dht, '°C', '#38bdf8'),
          statCard('Umidade DHT22', sp.umid_dht, '%', '#5aa0e8'),
          statCard('Temperatura NTC', sp.temp_ntc, '°C', '#e8a13a')
        ].join('');
      }
    };
  }
  function teleChartCard(k, title, color, unit) {
    return '<section class="card"><div class="card-h"><h3>' + esc(title) + '</h3>' +
      '<span class="r mono" style="color:' + color + ';font-weight:800;font-size:18px"><span data-ref="cur_' + k + '">--</span> ' + unit + '</span></div>' +
      '<div class="card-b"><div data-ref="chart_' + k + '"></div></div></section>';
  }
  function statCard(label, arr, unit, color) {
    arr = arr || [];
    var min = arr.length ? Math.min.apply(null, arr) : 0;
    var max = arr.length ? Math.max.apply(null, arr) : 0;
    var avg = arr.length ? (arr.reduce(function (a, b) { return a + b; }, 0) / arr.length) : 0;
    var last = arr.length ? arr[arr.length - 1] : 0;
    return '<div class="card pad"><div class="kpi-l" style="margin-bottom:8px">' + esc(label) + '</div>' +
      '<div class="row" style="justify-content:space-between"><span class="kpi-n" style="color:' + color + '">' + (Math.round(last * 10) / 10) + '<span class="unit">' + unit + '</span></span></div>' +
      '<div class="hr"></div><div class="row" style="justify-content:space-between;font-size:12px;color:var(--muted)">' +
      '<span>mín <b style="color:var(--ink-soft)">' + (Math.round(min * 10) / 10) + '</b></span>' +
      '<span>méd <b style="color:var(--ink-soft)">' + (Math.round(avg * 10) / 10) + '</b></span>' +
      '<span>máx <b style="color:var(--ink-soft)">' + (Math.round(max * 10) / 10) + '</b></span></div></div>';
  }

  // ============================================================= 5. Central de Segurança
  function Security(params, ctx) {
    var stride = [
      ['S', 'Spoofing', 'Falsificar identidade', 'Certificados / mTLS'],
      ['T', 'Tampering', 'Alterar dados', 'Assinatura / hash'],
      ['R', 'Repudiation', 'Negar ações', 'Logs assinados'],
      ['I', 'Info Disclosure', 'Vazar dados', 'Criptografia (TLS)'],
      ['D', 'Denial of Service', 'Indisponibilizar', 'Rate limiting'],
      ['E', 'Elevation of Priv.', 'Escalar privilégios', 'Menor privilégio']
    ];
    return {
      title: 'Central de Segurança', crumb: 'Segurança',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Central de Segurança</h2>' +
          '<p>Postura do dispositivo, controles da demonstração e mapeamento das ameaças (STRIDE).</p></div>' +
          '<div class="ph-act" data-ref="tlschip2"></div></div>' +

          '<div class="grid g-1-2">' +
          '<section class="card"><div class="card-h"><h3>Postura</h3></div><div class="card-b" style="text-align:center">' +
          '<div data-ref="gauge"></div><div class="mt" data-ref="postnote"></div></div></section>' +

          '<section class="card"><div class="card-h"><h3>Controles da virada (Defense in Depth)</h3></div>' +
          '<div class="card-b"><div class="stack" data-ref="ctrls"></div></div></section>' +
          '</div>' +

          '<div class="grid g-2 mt">' +
          '<section class="card"><div class="card-h"><h3>Camadas de defesa</h3></div><div class="card-b"><div class="stack" data-ref="layers"></div></div></section>' +
          '<section class="card"><div class="card-h"><h3>Mapa de ameaças — STRIDE</h3></div><div class="card-b"><div class="stack">' +
          stride.map(function (r) {
            return '<div class="list-row"><div class="lr-ic" style="font-weight:800;color:var(--brand)">' + r[0] + '</div>' +
              '<div class="lr-t"><b>' + r[1] + '</b><span>' + r[2] + '</span></div>' +
              '<div class="lr-r"><span class="chip neutral">' + r[3] + '</span></div></div>';
          }).join('') + '</div></div></section>' +
          '</div>';
      },
      mount: function (root) {
        this._root = root;
        setHtml(root, 'ctrls', demoControls(ctx)); // uma vez (não muda entre ticks)
        wireDemo(root, ctx);
      },
      update: function (s) {
        var root = this._root; if (!root) return;
        var post = postureScore(s), pl = postureLabel(post);
        setHtml(root, 'gauge', C.gauge(post, { label: pl.t }));
        setHtml(root, 'postnote', '<span class="chip ' + pl.cls + '">' + pl.t + '</span>');
        setHtml(root, 'tlschip2', tlsChip(s));
        // camadas
        var layers = [
          ['Senha forte (não padrão)', s.tls],
          ['HTTPS / TLS no painel', s.tls],
          ['Autenticação + TLS no MQTT', s.mqtt_tls],
          ['Rate limiting anti-brute-force', s.tls],
          ['Observabilidade (logs + métricas)', true]
        ];
        setHtml(root, 'layers', layers.map(function (l) {
          return '<div class="field-row"><div class="fr-t"><b>' + esc(l[0]) + '</b></div>' +
            '<div class="fr-r">' + (l[1] ? '<span class="chip ok">' + icon('check', 'sm') + 'ativo</span>' : '<span class="chip bad">inativo</span>') + '</div></div>';
        }).join(''));
      }
    };
  }

  // ============================================================= 6. Eventos & Logs
  function Events(params, ctx) {
    var f = { canal: 'all', tipo: 'all', exp: 'all', txt: '' };
    return {
      title: 'Eventos & Logs', crumb: 'Segurança',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Eventos &amp; Logs</h2>' +
          '<p>Registro do que o atacante viu × o que estava protegido. Filtre e exporte para CSV.</p></div>' +
          '<div class="ph-act"><button class="btn" data-ref="csv">' + icon('download') + 'Exportar CSV</button></div></div>' +
          '<section class="card"><div class="card-b tight">' +
          '<div class="row wrap" style="gap:10px">' +
          '<div class="inp" style="min-width:200px"><span class="fi">' + icon('search', 'sm') + '</span><input data-ref="q" placeholder="buscar no detalhe..."></div>' +
          selFilter('canal', ['all', 'HTTP', 'MQTT', 'SYS']) +
          selFilter('tipo', ['all', 'ABRIR', 'NEGAR', 'BLOQUEIO', 'FECHAR']) +
          selFilter('exp', ['all', 'expostos', 'protegidos']) +
          '<span class="chip neutral" data-ref="cnt" style="margin-left:auto">—</span>' +
          '</div></div>' +
          '<div class="tbl-wrap"><table class="dt"><thead><tr>' +
          '<th>hora</th><th>canal</th><th>tipo</th><th>detalhe</th><th>exposição</th></tr></thead>' +
          '<tbody data-ref="tb"></tbody></table></div></section>';
      },
      mount: function (root) {
        this._root = root; var self = this;
        var qi = q(root, 'q'); qi.oninput = function () { f.txt = qi.value.toLowerCase(); self.update(ctx.store.get()); };
        ['canal', 'tipo', 'exp'].forEach(function (name) {
          var sel = q(root, 'f_' + name);
          sel.onchange = function () { f[name] = sel.value; self.update(ctx.store.get()); };
        });
        q(root, 'csv').onclick = function () { exportCsv(ctx.store.get().log || []); };
      },
      update: function (s) {
        var root = this._root; if (!root) return;
        var log = (s.log || []).slice().reverse().filter(function (e) {
          if (f.canal !== 'all' && e.canal !== f.canal) return false;
          if (f.tipo !== 'all' && e.tipo !== f.tipo) return false;
          if (f.exp === 'expostos' && !e.exposto) return false;
          if (f.exp === 'protegidos' && e.exposto) return false;
          if (f.txt && String(e.detalhe).toLowerCase().indexOf(f.txt) < 0) return false;
          return true;
        });
        setTxt(root, 'cnt', log.length + ' eventos');
        var tb = q(root, 'tb');
        tb.innerHTML = log.length ? log.map(function (e, i) { return eventRow(e, i === 0); }).join('')
          : '<tr><td colspan="5"><div class="empty"><div class="e-ic">' + icon('filter') + '</div>Nenhum evento com esses filtros.</div></td></tr>';
      }
    };
  }
  function selFilter(name, opts) {
    return '<div class="inp" style="min-width:130px;padding:6px 10px"><span class="fi">' + icon('filter', 'sm') + '</span>' +
      '<select data-ref="f_' + name + '">' + opts.map(function (o) {
        return '<option value="' + o + '">' + (o === 'all' ? name : o) + '</option>';
      }).join('') + '</select></div>';
  }
  function exportCsv(log) {
    var head = 'hora,canal,tipo,detalhe,exposicao\n';
    var body = log.map(function (e) {
      return [e.ts, e.canal, e.tipo, '"' + String(e.detalhe).replace(/"/g, '""') + '"', e.exposto ? 'exposto' : 'protegido'].join(',');
    }).join('\n');
    var blob = new Blob([head + body], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'eventos_iot_g6.csv';
    document.body.appendChild(a); a.click(); a.remove();
    UI.toast('CSV exportado (' + log.length + ' linhas)', 'ok');
  }

  // ============================================================= 7. Conformidade
  function Compliance(params, ctx) {
    return {
      title: 'Conformidade', crumb: 'Segurança',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Conformidade</h2>' +
          '<p>Como o estado atual do dispositivo se alinha a referências de segurança IoT. Ligado ao dossiê (Volumes V, VII e VIII).</p></div></div>' +
          '<div class="grid g-3" data-ref="scores"></div>' +
          '<section class="card mt"><div class="card-h"><h3>ETSI EN 303 645 · OWASP IoT Top 10 — controles</h3></div>' +
          '<div class="card-b"><div class="stack" data-ref="checks"></div></div></section>';
      },
      mount: function (root) { this._root = root; },
      update: function (s) {
        var root = this._root; if (!root) return;
        var checks = [
          ['Sem senhas padrão/universais', s.tls, 'ETSI 5.1-1 · OWASP #1'],
          ['Comunicação segura (TLS)', s.tls, 'ETSI 5.5 · OWASP #7'],
          ['Autenticação no MQTT', s.mqtt_tls, 'OWASP #2'],
          ['Resistência a força bruta (rate limit)', s.tls, 'ETSI 5.1-2'],
          ['Telemetria protegida em trânsito', s.tls, 'OWASP #7'],
          ['Registro de eventos / observabilidade', true, 'NIST CSF · Detect'],
          ['Superfície mínima (serviços expostos)', s.tls, 'ETSI 5.6 · OWASP #2'],
          ['Atualização segura documentada (OTA assinada)', true, 'ETSI 5.3 · Vol. VII']
        ];
        var done = checks.filter(function (c) { return c[1]; }).length;
        var pct = Math.round(done / checks.length * 100);
        setHtml(root, 'scores', '' +
          scoreCard('Aderência geral', pct + '%', pct >= 70 ? 'c-good' : pct >= 40 ? 'c-amber' : 'c-bad', done + ' de ' + checks.length + ' controles') +
          scoreCard('ETSI EN 303 645', s.tls ? 'ok' : 'parcial', s.tls ? 'c-good' : 'c-amber', 'IoT de consumo') +
          scoreCard('OWASP IoT Top 10', s.tls && s.mqtt_tls ? 'baixo risco' : 'em risco', s.tls && s.mqtt_tls ? 'c-good' : 'c-bad', 'vulnerabilidades comuns'));
        setHtml(root, 'checks', checks.map(function (c) {
          return '<div class="field-row"><div class="fr-t"><b>' + esc(c[0]) + '</b><span>' + esc(c[2]) + '</span></div>' +
            '<div class="fr-r">' + (c[1]
              ? '<span class="chip ok">' + icon('check', 'sm') + 'conforme</span>'
              : '<span class="chip bad">' + icon('x', 'sm') + 'não conforme</span>') + '</div></div>';
        }).join(''));
      }
    };
  }
  function scoreCard(label, val, color, sub) {
    return '<div class="card pad"><div class="kpi-top"><div class="kpi-ic ' + color + '">' + icon('checkCircle') + '</div>' +
      '<div class="kpi-l">' + esc(label) + '</div></div>' +
      '<div class="kpi-n mt-s">' + esc(val) + '</div><div class="kpi-foot">' + esc(sub) + '</div></div>';
  }

  // ============================================================= 8. Configurações
  function Settings(params, ctx) {
    return {
      title: 'Configurações', crumb: 'Sistema',
      render: function () {
        var cfg = ctx.getConfig();
        var theme = ctx.getTheme();
        return '<div class="page-head"><div class="ph-t"><h2>Configurações</h2>' +
          '<p>Preferências da interface (salvas neste navegador). Não alteram o dispositivo.</p></div></div>' +
          '<div class="grid g-2">' +
          '<section class="card"><div class="card-h"><h3>Conexão</h3></div><div class="card-b">' +
          '<label class="lb">Modo de operação</label>' +
          '<div class="inp"><span class="fi">' + icon('radio', 'sm') + '</span><select data-ref="mode">' +
          optSel('auto', cfg.MODE) + optSel('mock', cfg.MODE) + optSel('live', cfg.MODE) + '</select></div>' +
          '<label class="lb">Endereço do dispositivo (BASE_URL)</label>' +
          '<div class="inp"><span class="fi">' + icon('server', 'sm') + '</span><input data-ref="base" placeholder="http://192.168.56.20" value="' + esc(cfg.BASE_URL || '') + '"></div>' +
          '<label class="lb">Rótulo do dispositivo</label>' +
          '<div class="inp"><span class="fi">' + icon('devices', 'sm') + '</span><input data-ref="label" value="' + esc(cfg.DEVICE_LABEL || '') + '"></div>' +
          '<div class="row mt" style="gap:10px"><button class="btn primary" data-ref="save">' + icon('check') + 'Salvar</button>' +
          '<button class="btn ghost" data-ref="reset">Restaurar padrão</button></div>' +
          '<div class="callout info mt">' + icon('help') + '<div>Após salvar, <b>recarregue a página</b> para reconectar no novo modo.</div></div>' +
          '</div></section>' +

          '<section class="card"><div class="card-h"><h3>Aparência &amp; demo</h3></div><div class="card-b">' +
          '<div class="field-row"><div class="fr-t"><b>Tema claro</b><span>alterna entre escuro e claro</span></div>' +
          '<div class="fr-r"><label class="sw"><input type="checkbox" data-ref="theme"' + (theme === 'light' ? ' checked' : '') + '><span class="tr"></span></label></div></div>' +
          '<label class="lb">Ritmo da telemetria (ms) — modo demo</label>' +
          '<div class="inp"><span class="fi">' + icon('clock', 'sm') + '</span><input data-ref="tick" type="number" min="500" step="500" value="' + (cfg.MOCK_TICK_MS || 2000) + '"></div>' +
          '<div class="callout mt">' + icon('cpu') + '<div>Motor de dados atual: <b data-ref="engine">—</b>. O modo demo simula tudo no navegador; o modo conectado consome <span class="mono">/state</span> e <span class="mono">/events</span>.</div></div>' +
          '</div></section></div>';
      },
      mount: function (root) {
        this._root = root;
        q(root, 'theme').onchange = function (e) { ctx.setTheme(e.target.checked ? 'light' : 'dark'); };
        q(root, 'save').onclick = function () {
          ctx.saveConfig({
            MODE: q(root, 'mode').value,
            BASE_URL: q(root, 'base').value.trim(),
            DEVICE_LABEL: q(root, 'label').value.trim(),
            MOCK_TICK_MS: parseInt(q(root, 'tick').value, 10) || 2000
          });
          UI.toast('Configurações salvas — recarregue a página', 'ok');
        };
        q(root, 'reset').onclick = function () { ctx.saveConfig(null); UI.toast('Padrão restaurado — recarregue', 'info'); };
      },
      update: function (s) {
        var root = this._root; if (!root) return;
        setTxt(root, 'engine', s.mode === 'live' ? 'conectado (dispositivo real)' : 'demo (simulação no navegador)');
      }
    };
  }
  function optSel(v, cur) { return '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + '</option>'; }

  // ============================================================= 9. Ajuda
  function Help(params, ctx) {
    return {
      title: 'Ajuda', crumb: 'Sistema',
      render: function () {
        return '<div class="page-head"><div class="ph-t"><h2>Ajuda &amp; Sobre</h2>' +
          '<p>Console de gestão da demonstração de Segurança em IoT — Seminário G6 (UFG).</p></div></div>' +
          '<div class="grid g-2">' +
          '<section class="card"><div class="card-h"><h3>O que é este painel</h3></div><div class="card-b stack">' +
          '<p class="muted">Interface web da "fechadura/câmera inteligente" da demo. Mostra estado da trava, telemetria, o placar de ataque e o log didático (o que o atacante vê × o que está protegido). Funciona em <b>modo demo</b> (sem backend) ou <b>conectado</b> ao dispositivo real.</p>' +
          '<div class="callout bad">' + icon('alert') + '<div><b>Uso educacional</b>, em rede isolada, contra o próprio dispositivo do grupo. Os alvos são inseguros <b>de propósito</b> (HTTP sem TLS, senha padrão, MQTT sem auth).</div></div>' +
          '</div></section>' +
          '<section class="card"><div class="card-h"><h3>Fluxo da demonstração</h3></div><div class="card-b"><div class="tl">' +
          helpStep('1 · Interceptar', 'Wireshark lê senha e comandos em claro no HTTP/MQTT.') +
          helpStep('2 · Atacar', 'hydra quebra a senha padrão; mosquitto_pub injeta "abrir".') +
          helpStep('3 · A virada', 'Liga TLS + senha forte + rate limiting + auth no MQTT.', 'good') +
          helpStep('4 · Resultado', 'Os mesmos ataques passam a falhar (429 / rejeição).', 'good') +
          '</div></div></section>' +
          '</div>' +
          '<section class="card mt"><div class="card-h"><h3>Navegação do console</h3></div><div class="card-b"><div class="grid g-3">' +
          navHelp('grid', 'Visão geral', 'KPIs, trava, postura e eventos recentes') +
          navHelp('devices', 'Dispositivos', 'Frota conectada (CAM-G6 + simulados)') +
          navHelp('activity', 'Telemetria', 'Séries dos sensores com estatísticas') +
          navHelp('shield', 'Central de Segurança', 'Postura, controles e STRIDE') +
          navHelp('list', 'Eventos & Logs', 'Registro filtrável + exportação CSV') +
          navHelp('checkCircle', 'Conformidade', 'Aderência a ETSI/OWASP/NIST') +
          '</div></div></section>' +
          '<div class="callout info mt">' + icon('book') + '<div>Material teórico completo no <b>Dossiê Técnico de Segurança em IoT</b> (10 volumes) — na raiz do repositório.</div></div>';
      }
    };
  }
  function helpStep(t, m, k) {
    return '<div class="ev ' + (k || '') + '"><div class="t">' + esc(t) + '</div><div class="m" style="font-family:var(--sans);color:var(--muted)">' + esc(m) + '</div></div>';
  }
  function navHelp(ic, t, m) {
    return '<div class="list-row"><div class="lr-ic">' + icon(ic) + '</div><div class="lr-t"><b>' + esc(t) + '</b><span>' + esc(m) + '</span></div></div>';
  }

  // ------------------------------------------------------------- registro
  // Faz o root ficar acessível no update do Overview (que usa root0)
  function bindRoot(view) {
    var origMount = view.mount;
    view.mount = function (root, ctx2) { this._root = root; if (origMount) origMount.call(this, root, ctx2); };
    return view;
  }

  global.Views = {
    Overview: function (p, c) { return bindRoot(Overview(p, c)); },
    Devices: Devices,
    DeviceDetail: DeviceDetail,
    Telemetry: Telemetry,
    Security: Security,
    Events: Events,
    Compliance: Compliance,
    Settings: Settings,
    Help: Help
  };
})(window);
