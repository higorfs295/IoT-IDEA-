# Changelog — Demo de Segurança em IoT (Seminário G6)

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/).
Este pacote é material didático; as versões refletem a evolução da demonstração.

## [v3] — Defesa completa + observabilidade

### Adicionado
- **Rate limiting anti-brute-force** no alvo simulado (`dispositivo_iot.py`): flags
  `--max-fails` e `--lockout` bloqueiam o IP após *N* falhas de login, respondendo **HTTP 429**.
  Novo contador **bloqueios** no placar e no log (`BLOQUEIO`).
- **MQTT com autenticação e TLS no cliente** do simulado: `--mqtt-user`, `--mqtt-pass`,
  `--mqtt-tls`, `--cafile`, `--insecure-tls`. O alvo continua recebendo comandos legítimos
  **após a virada** do broker.
- **Endpoint `/metrics`** (formato de exposição Prometheus) no dispositivo — liga a demo ao
  tema de Observabilidade (Volume VI do dossiê).
- **Firmware `MODO_SEGURO`** (`firmware_esp32.ino`): a virada virou **código** — MQTT sobre
  TLS (8883) + `MQTT_USER`/`MQTT_PASS` + senha forte + rate limiting no login (429).
- **`kali/harden.sh`**: automatiza a virada do broker (gera CA/cert, cria usuário, religa o
  mosquitto em 8883 + auth, sem anônimo, e testa injeção anônima × publisher legítimo).
- **Webapp**: KPI de **bloqueios**; o modo demo (mock) reproduz a virada completa
  (senha forte + rate limiting + rejeição de injeção MQTT quando o TLS está ligado).
- **Docs**: modelo de ameaças **STRIDE** mapeado aos atos, **máquina de estados** da trava,
  seção de novidades v3 e ponte explícita com os volumes do dossiê.

### Corrigido
- `snapshot()` do dispositivo agora expõe `tls`/`mqtt_tls`. Antes, o painel e o webapp liam
  `s.tls` mas o campo nunca era enviado — o rótulo não alternava para **HTTPS · TLS**.
- Contexto de exposição do MQTT deixou de depender de `port == 1883` fixo; passa a refletir
  `--mqtt-tls`.

### Testado
- `dispositivo_iot.py`: HTTP/login, ciclo de lockout (401 → 429, inclusive contra senha
  correta durante o bloqueio), `/metrics`, `/state` com `tls`, modo `--tls` e `--self-test`.
- Webapp (Chromium): virada no mock — brute force bloqueado (lockout 15s) e injeção MQTT
  rejeitada com a defesa ligada.
- Sintaxe validada: `python -m py_compile`, `bash -n` (setup/harden/reset) e `node --check` (JS).

### Notas / limites
- `firmware_esp32.ino` continua um **esqueleto a compilar/validar** no core arduino-esp32:
  o `MODO_SEGURO` é código real, mas não foi compilado neste ambiente.
- HTTPS **de servidor** no ESP32 segue fora de escopo (use proxy TLS). No simulado, `--tls`
  entrega o painel em HTTPS de verdade.

## [v2] — Painel ao vivo + telemetria

### Adicionado
- Dashboard web redesenhado (tema escuro), atualização ao vivo via **SSE** (sem F5).
- Tela de login dedicada; placar de ataque (tentativas HTTP, falhas, injeções MQTT).
- Telemetria simulada **DHT22** (temp+umidade) e **NTC 10k** (temp) em `casa/telemetria`.
- Log didático "visto pelo atacante" × "protegido".
- `--self-test` no dispositivo; `setup.sh` / `reset.sh` na Kali.
- Painel HTTPS opcional (`--tls`); esquemático + diagrama de componentes (SVG) e pinagem.
- Aplicação web standalone (`webapp/`) com modos `mock` / `live` / `auto`.

## [v1] — Base da demonstração

### Adicionado
- Dois cenários de ataque (A: HTTP + brute force; B: MQTT + injeção) em duas versões
  (simulada em VM dedicada e física no ESP32), com broker na Kali e roteiro de palco.
