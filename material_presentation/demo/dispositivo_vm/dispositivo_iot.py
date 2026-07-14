#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
dispositivo_iot.py  (v2) — "ESP32 simulado" para a demo do Seminario G6
=======================================================================
Fechadura/Camera IoT com DOIS canais + TELEMETRIA:

  1) HTTP  : painel web VIVO (atualiza sozinho via SSE) + login admin/admin
             -> alvo do brute force (hydra)
  2) MQTT  : assina 'casa/porta' (comando) e PUBLICA 'casa/telemetria'
             (temperatura/umidade)  -> alvo da injecao (mosquitto_pub)
             e fonte de dado sensivel para a interceptacao

Novidades da v2:
  - Painel web moderno, verde/vermelho, "ultima tentativa de acesso", ao vivo (sem F5).
  - Placar de ataque em tempo real (tentativas HTTP + injecoes MQTT).
  - Telemetria simulada de DHT22 (temp+umid) e NTC (temp) — equivalente ao firmware.
  - Log didatico: "o que o atacante viu" x "o que estava protegido".
  - --self-test: confere HTTP/MQTT/telemetria antes de subir ao palco.
  - --tls: painel em HTTPS (certificado autoassinado) para a virada 100% ao vivo.

>>> INSEGURO DE PROPOSITO por padrao (HTTP sem TLS, senha padrao, MQTT sem auth).
    Rode APENAS em rede interna/isolada e contra o proprio dispositivo do grupo.

Dependencias:
  pip install paho-mqtt        # canal MQTT (web usa apenas a stdlib)

Uso tipico (na VM "ESP32-simulado"):
  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 80

Virada (defesa) com painel HTTPS ao vivo:
  # gere um cert autoassinado (uma vez):
  openssl req -x509 -newkey rsa:2048 -nodes -keyout dev.key -out dev.crt \\
          -days 365 -subj "/CN=<IP_VM_ESP32>"
  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 443 \\
          --tls --certfile dev.crt --keyfile dev.key --password "S3nh@-Forte"
"""

import argparse
import html
import http.server
import json
import queue
import random
import socketserver
import ssl
import sys
import threading
import time
import datetime

try:
    import paho.mqtt.client as mqtt
    TEM_MQTT = True
except Exception:
    TEM_MQTT = False


# ============================================================ ESTADO
class Estado:
    def __init__(self, auto_relock=8):
        self.lock = threading.Lock()
        self.trancada = True
        self.auto_relock = auto_relock
        self._timer = None
        # telemetria
        self.temp_dht = 24.0
        self.umid_dht = 55.0
        self.temp_ntc = 24.5
        # contadores/placar
        self.tentativas_http = 0
        self.tentativas_falhas = 0
        self.injecoes_mqtt = 0
        self.ultimo_evento = "Dispositivo iniciado (trancado)"
        self.ultima_tentativa = "—"
        self.log = []  # lista de dicts: {ts, canal, tipo, detalhe, exposto}
        # assinantes SSE (cada um recebe eventos via fila)
        self.subs = []

    # -------- eventos para o painel ao vivo (SSE) --------
    def _broadcast(self):
        snap = self.snapshot()
        dead = []
        for q in self.subs:
            try:
                q.put_nowait(snap)
            except Exception:
                dead.append(q)
        for q in dead:
            if q in self.subs:
                self.subs.remove(q)

    def snapshot(self):
        with self.lock:
            return {
                "estado": "ABERTA" if not self.trancada else "TRANCADA",
                "evento": self.ultimo_evento,
                "ultima_tentativa": self.ultima_tentativa,
                "temp_dht": round(self.temp_dht, 1),
                "umid_dht": round(self.umid_dht, 1),
                "temp_ntc": round(self.temp_ntc, 1),
                "tentativas_http": self.tentativas_http,
                "tentativas_falhas": self.tentativas_falhas,
                "injecoes_mqtt": self.injecoes_mqtt,
                "log": list(self.log[-12:]),
            }

    def _registrar(self, canal, tipo, detalhe, exposto):
        ts = datetime.datetime.now().strftime("%H:%M:%S")
        self.log.append({"ts": ts, "canal": canal, "tipo": tipo,
                         "detalhe": detalhe, "exposto": exposto})
        # log didatico no terminal: o que o atacante viu x o que estava protegido
        marca = "VISTO PELO ATACANTE" if exposto else "protegido"
        print(f"[{ts}] {canal:4} {tipo:10} {detalhe}  <<{marca}>>")

    # -------- acoes --------
    def abrir(self, origem, canal, exposto):
        with self.lock:
            self.trancada = False
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            self.ultimo_evento = f"[{ts}] ACESSO LIBERADO via {origem}"
        self._registrar(canal, "ABRIR", origem, exposto)
        banner(self.ultimo_evento, True)
        self._agendar_relock()
        self._broadcast()

    def negar(self, origem, canal, detalhe, exposto):
        with self.lock:
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            self.ultimo_evento = f"[{ts}] ACESSO NEGADO via {origem}"
            self.ultima_tentativa = f"[{ts}] {detalhe}"
            self.tentativas_falhas += 1
        self._registrar(canal, "NEGAR", detalhe, exposto)
        self._broadcast()

    def registrar_tentativa_http(self, usuario, senha, exposto):
        with self.lock:
            self.tentativas_http += 1
            self.ultima_tentativa = (f"HTTP usuario={usuario} senha={senha}"
                                     if exposto else "HTTP (conteudo cifrado)")

    def registrar_injecao(self):
        with self.lock:
            self.injecoes_mqtt += 1

    def _agendar_relock(self):
        if self.auto_relock and self.auto_relock > 0:
            if self._timer:
                self._timer.cancel()
            self._timer = threading.Timer(self.auto_relock, self._relock)
            self._timer.daemon = True
            self._timer.start()

    def _relock(self):
        with self.lock:
            self.trancada = True
            ts = datetime.datetime.now().strftime("%H:%M:%S")
            self.ultimo_evento = f"[{ts}] Trava fechada automaticamente"
        self._broadcast()

    def atualizar_telemetria(self):
        # passeio aleatorio suave, como um sensor real
        with self.lock:
            self.temp_dht = max(18, min(32, self.temp_dht + random.uniform(-0.3, 0.3)))
            self.umid_dht = max(30, min(80, self.umid_dht + random.uniform(-0.8, 0.8)))
            self.temp_ntc = self.temp_dht + random.uniform(-0.4, 0.4)
        self._broadcast()


def banner(msg, aberto):
    linha = "=" * 58
    print("\n" + linha)
    print("  PORTA ABERTA" if aberto else "  PORTA TRANCADA")
    print("  " + msg)
    print(linha + "\n")


ESTADO = None
CFG = None


# ============================================================ HTML
# CSS comum (tema escuro tecnologico). Mantido em variavel para reuso.
_CSS = """
:root{--navy:#0b2440;--navy2:#0f2c4c;--steel:#4a6fa5;--cyan:#38bdf8;
  --good:#1f9d6b;--good-d:#127a51;--bad:#e0533d;--bad-d:#b23a28;--amber:#e8a13a;
  --bg:#0a1626;--panel:#0f2942;--card:#13314f;--card2:#0e2740;--line:#20456b;
  --ink:#e8f0fa;--muted:#8aa4c4;--mono:'JetBrains Mono',Consolas,monospace}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,'Segoe UI',Roboto,sans-serif;color:var(--ink);
  min-height:100vh;background:radial-gradient(1200px 600px at 80% -10%,#12395f 0%,var(--bg) 55%)}
a{color:var(--cyan)}
.topbar{display:flex;align-items:center;gap:14px;padding:16px 26px;
  border-bottom:1px solid var(--line);background:rgba(11,36,64,.6)}
.logo{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;
  background:linear-gradient(135deg,var(--cyan),var(--steel));font-weight:800;color:#06203a}
.brand b{font-size:18px}.brand span{display:block;font-size:12px;color:var(--muted)}
.pill{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted)}
.dot{width:9px;height:9px;border-radius:50%;background:var(--good);
  box-shadow:0 0 0 4px rgba(31,157,107,.18);animation:pulse 1.6s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
.wrap{max-width:1120px;margin:22px auto;padding:0 22px;
  display:grid;grid-template-columns:1.35fr .9fr;gap:20px}
.card{background:linear-gradient(180deg,var(--card),var(--card2));
  border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.card h2{margin:0 0 4px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
.lock{grid-column:1/2}
.lockface{display:flex;align-items:center;gap:22px;margin-top:8px}
.lockicon{width:96px;height:96px;border-radius:22px;display:grid;place-items:center;flex:none;font-size:44px;transition:.35s}
.st-TRANCADA .lockicon{background:linear-gradient(135deg,var(--good),var(--good-d));box-shadow:0 8px 26px rgba(31,157,107,.4)}
.st-ABERTA .lockicon{background:linear-gradient(135deg,var(--bad),var(--bad-d));box-shadow:0 8px 26px rgba(224,83,61,.45)}
.lockstate{font-size:40px;font-weight:800;letter-spacing:1px;line-height:1}
.st-TRANCADA .lockstate{color:#7ff0c0}.st-ABERTA .lockstate{color:#ffb3a6}
.lockmeta{color:var(--muted);font-size:13px;margin-top:8px;font-family:var(--mono)}
.badge{display:inline-block;margin-top:10px;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:700}
.st-TRANCADA .badge{background:rgba(31,157,107,.16);color:#7ff0c0;border:1px solid rgba(31,157,107,.4)}
.st-ABERTA .badge{background:rgba(224,83,61,.16);color:#ffb3a6;border:1px solid rgba(224,83,61,.4)}
.tele{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:20px}
.tcell{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px;position:relative;overflow:hidden}
.tcell .v{font-size:30px;font-weight:800}.tcell .u{font-size:14px;color:var(--muted);font-weight:600}
.tcell .k{font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:1px}
.tcell .ic{font-size:18px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:6px}
.kpi{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:14px;text-align:center}
.kpi .n{font-size:28px;font-weight:800}
.kpi.http .n{color:var(--cyan)}.kpi.fail .n{color:var(--bad)}.kpi.inj .n{color:var(--amber)}
.kpi .l{font-size:11px;color:var(--muted);margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.last{margin-top:14px;background:#0a1f38;border:1px dashed var(--line);border-radius:10px;
  padding:10px 12px;font-family:var(--mono);font-size:13px}
.last b{color:var(--muted);font-family:system-ui}.last .exp{color:#ff9f8f}.last .prot{color:#7ff0c0}
.login label{display:block;font-size:12px;color:var(--muted);margin:12px 0 5px;letter-spacing:.4px}
.login .field{display:flex;align-items:center;gap:10px;background:#0a1f38;border:1px solid var(--line);
  border-radius:11px;padding:11px 13px;transition:.2s}
.login .field:focus-within{border-color:var(--cyan);box-shadow:0 0 0 3px rgba(56,189,248,.15)}
.login .field input{background:transparent;border:0;color:var(--ink);width:100%;font-size:15px;outline:none}
.login .field .fi{color:var(--muted)}
.login button{margin-top:18px;width:100%;padding:13px;border:0;border-radius:11px;cursor:pointer;
  font-weight:800;font-size:15px;color:#06203a;background:linear-gradient(135deg,var(--cyan),#5aa0e8)}
.login .warn{margin-top:12px;font-size:11px;color:var(--muted);display:flex;gap:7px;align-items:flex-start}
.tag{display:inline-block;font-size:10px;font-weight:700;color:#06203a;background:var(--amber);
  padding:2px 7px;border-radius:5px;letter-spacing:.5px}
.logcard{grid-column:1/3}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:1px;
  padding:8px 10px;border-bottom:1px solid var(--line)}
td{padding:9px 10px;border-bottom:1px solid rgba(32,69,107,.4);font-family:var(--mono)}
.chip{font-size:11px;font-weight:700;padding:2px 9px;border-radius:999px;font-family:system-ui}
.c-HTTP{background:rgba(56,189,248,.14);color:#8fd8f7}.c-MQTT{background:rgba(232,161,58,.14);color:#f2c680}
.tp{font-weight:700}.tp.ABRIR{color:#7ff0c0}.tp.NEGAR{color:#ff9f8f}.tp.FECHAR{color:var(--muted)}
.exposed{color:#ff9f8f;font-weight:700}.protected{color:#7ff0c0;font-weight:700}
.foot{max-width:1120px;margin:10px auto 30px;padding:0 22px;color:var(--muted);font-size:12px;
  display:flex;justify-content:space-between}
@media(max-width:820px){.wrap{grid-template-columns:1fr}.logcard,.lock{grid-column:1}}
"""

# --- DASHBOARD (painel vivo, servido em "/") ---
PAGINA = """<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Camera IoT — Painel</title><style>__CSS__</style></head>
<body>
<div class="topbar">
  <div class="logo">IoT</div>
  <div class="brand"><b>Câmera IoT — Painel de Controle</b>
    <span>Fechadura inteligente · Seminário G6 · Segurança em IoT</span></div>
  <div class="pill"><span class="dot"></span> <span id="live">ao vivo · SSE</span></div>
</div>
<div class="wrap">
  <div class="card lock st-TRANCADA" id="lockcard">
    <h2>Estado da trava</h2>
    <div class="lockface">
      <div class="lockicon" id="lockicon">&#128274;</div>
      <div>
        <div class="lockstate" id="lockstate">TRANCADA</div>
        <div class="badge" id="lockbadge">porta trancada</div>
        <div class="lockmeta" id="lockmeta">—</div>
      </div>
    </div>
    <div class="tele">
      <div class="tcell"><div class="ic">&#127777;</div><div class="v"><span id="tdht">--</span><span class="u">&deg;C</span></div><div class="k">DHT22 · temperatura</div></div>
      <div class="tcell"><div class="ic">&#128167;</div><div class="v"><span id="udht">--</span><span class="u">%</span></div><div class="k">DHT22 · umidade</div></div>
      <div class="tcell"><div class="ic">&#128293;</div><div class="v"><span id="tntc">--</span><span class="u">&deg;C</span></div><div class="k">NTC 10k · temperatura</div></div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:20px">
    <div class="card">
      <h2>Placar de ataque</h2>
      <div class="kpis">
        <div class="kpi http"><div class="n" id="k_http">0</div><div class="l">tentativas HTTP</div></div>
        <div class="kpi fail"><div class="n" id="k_fail">0</div><div class="l">falhas login</div></div>
        <div class="kpi inj"><div class="n" id="k_inj">0</div><div class="l">injeções MQTT</div></div>
      </div>
      <div class="last"><b>última tentativa:</b><br><span id="ult">—</span></div>
    </div>
    <div class="card login">
      <h2>Autenticação <span class="tag" id="authtag">HTTP · SEM TLS</span></h2>
      <form method="POST" action="/login">
        <label>Usuário</label>
        <div class="field"><span class="fi">&#128100;</span><input name="usuario" value="admin"></div>
        <label>Senha</label>
        <div class="field"><span class="fi">&#128274;</span><input name="senha" value="admin123"></div>
        <button type="submit">Entrar / destravar</button>
        <div class="warn">&#9888;&#65039; <span>Demo educacional: as credenciais podem trafegar <b>sem criptografia</b> (de propósito).</span></div>
      </form>
    </div>
  </div>
  <div class="card logcard">
    <h2>Log de eventos — o que o atacante viu × o que estava protegido</h2>
    <table><thead><tr><th>hora</th><th>canal</th><th>tipo</th><th>detalhe</th><th>exposição</th></tr></thead>
    <tbody id="log"></tbody></table>
  </div>
</div>
<div class="foot"><span>Seminário G6 — Segurança em IoT · Internet das Coisas (UFG)</span><span>dispositivo: câmera/fechadura · v2</span></div>
<script>
function esc(s){return (s+'').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
function apply(s){
  var card=document.getElementById('lockcard');
  card.className='card lock st-'+s.estado;
  document.getElementById('lockstate').textContent=s.estado;
  document.getElementById('lockicon').innerHTML=(s.estado==='ABERTA')?'&#128275;':'&#128274;';
  document.getElementById('lockbadge').textContent=(s.estado==='ABERTA')?'porta destrancada':'porta trancada';
  document.getElementById('lockmeta').textContent=s.evento||'—';
  document.getElementById('tdht').textContent=s.temp_dht;
  document.getElementById('udht').textContent=s.umid_dht;
  document.getElementById('tntc').textContent=s.temp_ntc;
  document.getElementById('k_http').textContent=s.tentativas_http;
  document.getElementById('k_fail').textContent=s.tentativas_falhas;
  document.getElementById('k_inj').textContent=s.injecoes_mqtt;
  var ult=document.getElementById('ult');
  ult.textContent=s.ultima_tentativa; ult.className=(s.tls?'prot':'exp');
  document.getElementById('authtag').textContent=s.tls?'HTTPS · TLS':'HTTP · SEM TLS';
  var tb=document.getElementById('log');tb.innerHTML='';
  s.log.slice().reverse().forEach(function(e){
    var cls=e.exposto?'exposed':'protected';var txt=e.exposto?'VISTO':'protegido';
    tb.innerHTML+='<tr><td>'+e.ts+'</td><td><span class="chip c-'+e.canal+'">'+e.canal+
      '</span></td><td class="tp '+e.tipo+'">'+e.tipo+'</td><td>'+esc(e.detalhe)+
      '</td><td class="'+cls+'">'+txt+'</td></tr>';
  });
}
try{
  var evs=new EventSource('/events');
  evs.onmessage=function(ev){apply(JSON.parse(ev.data));};
  evs.onerror=function(){document.getElementById('live').textContent='reconectando…';};
}catch(e){ setInterval(function(){fetch('/state').then(r=>r.json()).then(apply);},1500); }
fetch('/state').then(r=>r.json()).then(apply);
</script>
</body></html>""".replace("__CSS__", _CSS)

# --- TELA DE LOGIN dedicada (servida em "/login" via GET) ---
LOGIN = """<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Câmera IoT — Acesso</title><style>__CSS__
body{display:grid;place-items:center}
.scene{width:min(920px,94vw);display:grid;grid-template-columns:1.05fr .95fr;margin:26px;
  border:1px solid var(--line);border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45)}
.left{background:linear-gradient(160deg,#0f2c4c,#0a1f38);padding:38px 34px;position:relative;overflow:hidden}
.left .badge2{display:inline-flex;gap:8px;align-items:center;font-size:12px;color:var(--muted);
  border:1px solid var(--line);border-radius:999px;padding:6px 12px;margin:0}
.left h1{font-size:30px;margin:22px 0 6px;line-height:1.1;color:#fff}
.left p{color:#a9c4e2;font-size:14px;max-width:320px}
.cam{margin-top:26px;display:flex;align-items:center;gap:14px;background:rgba(56,189,248,.08);
  border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.cam .eye{width:48px;height:48px;border-radius:12px;display:grid;place-items:center;font-size:24px;
  background:linear-gradient(135deg,var(--cyan),var(--steel))}
.cam b{font-size:14px}.cam span{display:block;font-size:12px;color:var(--muted)}
.right2{background:linear-gradient(180deg,var(--card),var(--card2));padding:38px 34px}
.right2 h2{margin:0 0 2px;font-size:20px;color:var(--ink);letter-spacing:0;text-transform:none}
.right2 .sub{color:var(--muted);font-size:13px;margin-bottom:8px}
.hex{position:absolute;opacity:.5}
.note{margin-top:16px;display:flex;gap:9px;font-size:11.5px;color:var(--muted);
  background:rgba(224,83,61,.08);border:1px solid rgba(224,83,61,.3);border-radius:10px;padding:10px 12px}
</style></head>
<body>
<div class="scene">
  <div class="left">
    <svg class="hex" style="top:-20px;right:-10px" width="180" height="180" viewBox="0 0 100 100"><polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill="#173e63"/></svg>
    <svg class="hex" style="bottom:60px;right:40px" width="90" height="90" viewBox="0 0 100 100"><polygon points="50,3 93,26 93,74 50,97 7,74 7,26" fill="#38bdf8" opacity=".25"/></svg>
    <span class="badge2"><span class="dot"></span> dispositivo online · rede local</span>
    <h1>Câmera IoT<br>Fechadura Inteligente</h1>
    <p>Acesse o painel para monitorar sensores e controlar a trava da porta.</p>
    <div class="cam"><div class="eye">&#128247;</div><div><b>CAM-G6 / porta principal</b><span>firmware v2 · MQTT + HTTP</span></div></div>
  </div>
  <div class="right2 login">
    <h2>Acesso ao painel <span class="tag">HTTP</span></h2>
    <div class="sub">Entre com as credenciais do dispositivo</div>
    <form method="POST" action="/login">
      <label>Usuário</label>
      <div class="field"><span class="fi">&#128100;</span><input name="usuario" value="admin" autocomplete="off"></div>
      <label>Senha</label>
      <div class="field"><span class="fi">&#128274;</span><input name="senha" value="admin123" autocomplete="off"></div>
      <button type="submit">Entrar e destravar</button>
      <div class="note">&#9888;&#65039; <span>Demonstração educacional. A comunicação é <b>HTTP sem criptografia</b> de propósito — as credenciais trafegam legíveis na rede.</span></div>
    </form>
  </div>
</div>
</body></html>""".replace("__CSS__", _CSS)

# --- Pagina de resultado (login aceito/negado) ---
# Usa placeholders @@...@@ e render_resultado() para NAO colidir com as chaves do CSS.
RESULTADO_TPL = """<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Resultado</title><style>__CSS__
body{display:grid;place-items:center}
.box{max-width:460px;margin:26px;text-align:center}
.rc{width:74px;height:74px;border-radius:50%;display:grid;place-items:center;font-size:34px;margin:0 auto 14px}
.rc.ok{background:linear-gradient(135deg,var(--good),var(--good-d))}
.rc.no{background:linear-gradient(135deg,var(--bad),var(--bad-d))}
.box h1{margin:.2em 0;font-size:24px}.box a{display:inline-block;margin-top:16px}
</style></head><body><div class="card box">
<div class="rc @@KLASS@@">@@ICONE@@</div><h1 style="color:@@COR@@">@@TITULO@@</h1>
<p style="color:var(--muted)">@@MSG@@</p>
<a href="/">voltar ao painel</a></div></body></html>""".replace("__CSS__", _CSS)


def render_resultado(cor, titulo, klass, icone, msg):
    return (RESULTADO_TPL.replace("@@COR@@", cor).replace("@@TITULO@@", titulo)
            .replace("@@KLASS@@", klass).replace("@@ICONE@@", icone).replace("@@MSG@@", msg))


# ============================================================ HTTP handler
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):  # silencia log padrao
        return

    def _send(self, corpo, codigo=200, ctype="text/html; charset=utf-8", extra=None):
        dados = corpo.encode("utf-8") if isinstance(corpo, str) else corpo
        self.send_response(codigo)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(dados)))
        if extra:
            for k, v in extra.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(dados)

    def do_GET(self):
        if self.path in ("/", "/index.html", "/painel"):
            self._send(PAGINA)
        elif self.path in ("/login", "/acesso"):
            self._send(LOGIN)           # tela de login dedicada (GET)
        elif self.path == "/state":
            self._send(json.dumps(ESTADO.snapshot()), ctype="application/json")
        elif self.path == "/status":
            s = ESTADO.snapshot()
            self._send(f"estado={s['estado']}\nevento={s['evento']}\n"
                       f"temp_dht={s['temp_dht']}\numid_dht={s['umid_dht']}\n"
                       f"temp_ntc={s['temp_ntc']}\n", ctype="text/plain; charset=utf-8")
        elif self.path == "/events":
            self._sse()
        elif self.path == "/healthz":
            self._send("ok\n", ctype="text/plain")
        else:
            self._send(render_resultado("#ff9f8f", "404", "no", "&#10005;", "Página não encontrada."), codigo=404)

    def _sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()
        q = queue.Queue(maxsize=20)
        ESTADO.subs.append(q)
        try:
            # manda estado inicial na hora
            q.put_nowait(ESTADO.snapshot())
            while True:
                try:
                    snap = q.get(timeout=15)
                    data = "data: " + json.dumps(snap) + "\n\n"
                except queue.Empty:
                    data = ": keepalive\n\n"  # comentario SSE p/ manter viva
                self.wfile.write(data.encode("utf-8"))
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError):
            pass
        finally:
            if q in ESTADO.subs:
                ESTADO.subs.remove(q)

    def do_POST(self):
        if self.path != "/login":
            self._send(render_resultado("#ff9f8f", "404", "no", "&#10005;", "Rota inexistente."), 404)
            return
        tam = int(self.headers.get("Content-Length", 0) or 0)
        corpo = self.rfile.read(tam).decode("utf-8", "replace") if tam else ""
        campos = parse_form(corpo)
        usuario = campos.get("usuario", "")
        senha = campos.get("senha", "")
        exposto = not CFG.tls  # se HTTP, credencial trafega exposta
        ESTADO.registrar_tentativa_http(usuario, senha, exposto)
        if usuario == CFG.user and senha == CFG.password:
            ESTADO.abrir(f"HTTP/login (usuario={usuario})", "HTTP", exposto)
            self._send(render_resultado("#7ff0c0", "ACESSO LIBERADO", "ok", "&#10003;",
                       f"Bem-vindo, {html.escape(usuario)}. Porta destrancada."))
        else:
            ESTADO.negar("HTTP/login", "HTTP",
                         f"usuario={usuario} senha={senha}" if exposto else "login (cifrado)",
                         exposto)
            # "Senha incorreta" = marca de FALHA para o hydra
            self._send(render_resultado("#ff9f8f", "ACESSO NEGADO", "no", "&#10005;", "Senha incorreta."), 401)


def parse_form(corpo):
    out = {}
    for par in corpo.split("&"):
        if "=" in par:
            k, v = par.split("=", 1)
            out[unquote(k)] = unquote(v)
    return out


def unquote(s):
    s = s.replace("+", " ")
    res, i = [], 0
    while i < len(s):
        if s[i] == "%" and i + 2 < len(s):
            try:
                res.append(chr(int(s[i+1:i+3], 16))); i += 3; continue
            except ValueError:
                pass
        res.append(s[i]); i += 1
    return "".join(res)


class Servidor(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def iniciar_http(port, tls, certfile, keyfile):
    srv = Servidor(("0.0.0.0", port), Handler)
    esquema = "http"
    if tls:
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(certfile=certfile, keyfile=keyfile)
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
        esquema = "https"
    print(f"[http] painel {esquema.upper()} em 0.0.0.0:{port} (login: POST /login)")
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


# ============================================================ MQTT
def iniciar_mqtt(broker, port, topic_cmd, topic_tel):
    if not TEM_MQTT:
        print("[mqtt] paho-mqtt NAO instalado — canal MQTT desativado (pip install paho-mqtt)")
        return None

    def on_connect(c, u, f, rc, *a):
        if rc == 0:
            c.subscribe(topic_cmd)
            print(f"[mqtt] conectado {broker}:{port}; assinando '{topic_cmd}', publicando '{topic_tel}'")
        else:
            print(f"[mqtt] falha ao conectar (rc={rc})")

    def on_message(c, u, msg):
        payload = msg.payload.decode("utf-8", "replace").strip().lower()
        exposto = (port == 1883)  # sem TLS => exposto
        if payload in ("abrir", "open", "1", "unlock"):
            ESTADO.registrar_injecao()
            ESTADO.abrir(f"MQTT ({msg.topic})", "MQTT", exposto)
        elif payload in ("fechar", "close", "0", "lock"):
            ESTADO._relock()
            ESTADO._registrar("MQTT", "FECHAR", msg.topic, exposto)
        else:
            ESTADO.negar("MQTT", "MQTT", f"payload={payload}", exposto)

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except Exception:
        client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    try:
        client.connect(broker, port, 60)
    except Exception as e:
        print(f"[mqtt] nao conectou em {broker}:{port} -> {e}")
        return None
    client.loop_start()

    # publica telemetria periodicamente (dado sensivel trafegando)
    def publicar():
        while True:
            ESTADO.atualizar_telemetria()
            s = ESTADO.snapshot()
            msg = json.dumps({"temp_dht": s["temp_dht"], "umid_dht": s["umid_dht"],
                              "temp_ntc": s["temp_ntc"]})
            try:
                client.publish(topic_tel, msg)
            except Exception:
                pass
            time.sleep(CFG.telemetria)
    threading.Thread(target=publicar, daemon=True).start()
    return client


# ============================================================ SELF-TEST
def self_test():
    import urllib.request
    ok = True
    print("== self-test ==")
    # HTTP
    try:
        proto = "https" if CFG.tls else "http"
        ctx = ssl._create_unverified_context() if CFG.tls else None
        url = f"{proto}://127.0.0.1:{CFG.http_port}/healthz"
        with urllib.request.urlopen(url, timeout=3, context=ctx) as r:
            print("  [ok] HTTP responde:", r.read().decode().strip())
    except Exception as e:
        ok = False; print("  [FALHA] HTTP:", e)
    # MQTT
    if TEM_MQTT:
        try:
            got = {"v": False}
            try:
                cli = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            except Exception:
                cli = mqtt.Client()
            cli.on_message = lambda c, u, m: got.__setitem__("v", True)
            cli.connect(CFG.broker, CFG.mqtt_port, 5)
            cli.subscribe(CFG.topic_tel)
            cli.loop_start(); time.sleep(CFG.telemetria + 2); cli.loop_stop()
            print("  [ok] MQTT telemetria recebida" if got["v"]
                  else "  [aviso] MQTT sem telemetria ainda (broker no ar?)")
            ok = ok and True
        except Exception as e:
            ok = False; print("  [FALHA] MQTT:", e)
    else:
        print("  [aviso] paho-mqtt ausente; canal MQTT nao testado")
    print("== resultado:", "PRONTO" if ok else "REVISAR ==")
    return ok


# ============================================================ main
def main():
    global ESTADO, CFG
    ap = argparse.ArgumentParser(description="Dispositivo IoT simulado v2 (demo G6)")
    ap.add_argument("--http-port", type=int, default=80)
    ap.add_argument("--broker", default="127.0.0.1")
    ap.add_argument("--mqtt-port", type=int, default=1883)
    ap.add_argument("--topic-cmd", default="casa/porta")
    ap.add_argument("--topic-tel", default="casa/telemetria")
    ap.add_argument("--user", default="admin")
    ap.add_argument("--password", default="admin123")
    ap.add_argument("--auto-relock", type=int, default=8)
    ap.add_argument("--telemetria", type=float, default=3.0, help="intervalo (s) da telemetria")
    ap.add_argument("--tls", action="store_true", help="painel em HTTPS (virada)")
    ap.add_argument("--certfile", default="dev.crt")
    ap.add_argument("--keyfile", default="dev.key")
    ap.add_argument("--self-test", action="store_true", help="checa HTTP/MQTT e sai")
    CFG = ap.parse_args()
    ESTADO = Estado(auto_relock=CFG.auto_relock)

    print("=" * 58)
    print(" DISPOSITIVO IoT SIMULADO v2 — Seminario G6 (demo educacional)")
    print("=" * 58)
    print(f"  painel     : {'HTTPS' if CFG.tls else 'HTTP'} porta {CFG.http_port}  login {CFG.user}/{CFG.password}")
    print(f"  broker MQTT: {CFG.broker}:{CFG.mqtt_port}  cmd '{CFG.topic_cmd}'  tel '{CFG.topic_tel}'")
    print(f"  telemetria : DHT22 + NTC a cada {CFG.telemetria}s")
    print("=" * 58)

    iniciar_http(CFG.http_port, CFG.tls, CFG.certfile, CFG.keyfile)
    iniciar_mqtt(CFG.broker, CFG.mqtt_port, CFG.topic_cmd, CFG.topic_tel)

    if CFG.self_test:
        time.sleep(1)
        ok = self_test()
        sys.exit(0 if ok else 1)

    print("\n[dispositivo] pronto. Painel na porta indicada. Ctrl+C para sair.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[dispositivo] encerrando.")
        sys.exit(0)


if __name__ == "__main__":
    main()
