# IoT Console — Aplicação Web (Seminário G6 · Segurança em IoT)

Front-end da "fechadura/câmera inteligente" da demonstração, agora como um **console de
gestão** completo (estilo painel administrativo): navegação lateral, múltiplas páginas,
biblioteca de componentes, temas claro/escuro e gráficos em SVG — tudo em **HTML + CSS +
JavaScript puro**, sem build e **sem nenhuma dependência externa** (funciona offline).

Continua funcionando de duas formas:

- **Modo demo (mock):** roda **sem backend** — telemetria simulada, frota de dispositivos
  didática e botões que reproduzem os ataques (injeção MQTT, brute force, virada TLS).
  Ótimo para apresentar ou entregar. Basta abrir `index.html`.
- **Modo conectado (live):** consome o dispositivo real (`dispositivo_iot.py`) via
  `GET /state` e `SSE /events`; o login faz `POST /login`. Usado quando o front é servido
  pelo próprio dispositivo ou aponta para o IP dele.

## Como abrir

### Jeito mais simples (modo demo)
Abra `index.html` no navegador (duplo-clique). O console anima sozinho.

> Alguns navegadores restringem `file://`. Se algo não carregar, use o servidor local
> abaixo (recomendado de qualquer forma).

### Servindo localmente (recomendado)
Dentro da pasta `webapp/`:
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

### Modo conectado ao dispositivo real
Edite `js/config.js` (ou use a página **Configurações** do console, que salva no navegador):
```js
window.APP_CONFIG = {
  MODE: 'live',                      // ou 'auto'
  BASE_URL: 'http://<IP_VM_ESP32>',  // IP do dispositivo_iot.py
  ...
};
```
- `MODE: 'auto'` (padrão) tenta o dispositivo (`/healthz`) e, se não responder, cai para o mock.
- Se o front for **servido pelo próprio dispositivo**, deixe `BASE_URL: ''` (mesma origem).

## Páginas do console (rotas por hash)

| Rota | Página | O que mostra |
|------|--------|--------------|
| `#/` | **Visão geral** | KPIs, estado da trava + telemetria, medidor de postura, placar de ataque e eventos recentes |
| `#/dispositivos` | **Dispositivos** | Frota conectada. `CAM-G6` é o alvo real; os demais são **simulados** (didáticos) |
| `#/dispositivos/:id` | **Detalhe** | Ficha técnica, telemetria e ações do dispositivo |
| `#/telemetria` | **Telemetria** | Gráficos de área (DHT22 temp/umidade, NTC) + estatísticas (mín/méd/máx) |
| `#/seguranca` | **Central de Segurança** | Postura (gauge), controles da virada, camadas de defesa e mapa STRIDE |
| `#/eventos` | **Eventos & Logs** | Log filtrável (canal/tipo/exposição/busca) + **exportar CSV** |
| `#/conformidade` | **Conformidade** | Aderência a ETSI EN 303 645 / OWASP IoT Top 10 / NIST (ligada ao dossiê) |
| `#/config` | **Configurações** | Modo, endereço, rótulo, ritmo da telemetria e tema (salvos no navegador) |
| `#/ajuda` | **Ajuda & Sobre** | Explicação da demo, fluxo do ataque e aviso ético |

Além do console, permanecem as telas dedicadas **`login.html`** (autenticação do dispositivo,
avisando que é HTTP sem TLS) e **`resultado.html`** (acesso liberado/negado).

## Estrutura
```
webapp/
├── index.html          # console (shell + roteamento por hash)
├── login.html          # tela de login dedicada
├── resultado.html      # página de resultado (acesso liberado/negado)
├── css/
│   └── style.css       # design system: tokens (claro/escuro), layout de console e componentes
├── js/
│   ├── config.js       # modo (mock/live/auto), IP do dispositivo, rótulo
│   ├── store.js        # estado + provedores mock e live (SSE/fetch) — camada de dados
│   ├── charts.js       # gráficos em SVG (sparkline, área, barras, donut, gauge)
│   ├── ui.js           # utilitários de DOM, ícones SVG, toast, drawer, menus
│   ├── fleet.js        # modelo da frota (primário real + simulados) para a página Dispositivos
│   ├── router.js       # roteador por hash (mount/update/unmount)
│   ├── views.js        # todas as páginas do console
│   ├── app.js          # shell (sidebar + topbar), tema, configuração e bootstrap
│   └── login.js        # comportamento da tela de login dedicada
└── assets/
    └── favicon.svg
```

> **Nota:** o antigo `js/dashboard.js` (painel único) foi substituído pela arquitetura
> modular acima. O `store.js` foi mantido como camada de dados (mock/live).

## Componentes do design system
Cards e KPIs, tabelas de dados com filtros, abas e *segmented control*, chips/badges de
status, botões (primário/perigo/fantasma), *switches*, barras de progresso, medidores
(gauge/donut em SVG), *drawer*/modal, menus suspensos, *toasts*, *timeline*, grade de
dispositivos, *callouts* e *empty states*. Tema **claro/escuro** via `[data-theme]`, com
alternância na topbar (persistida no navegador).

## Controles de demonstração
Disponíveis no botão **Simular** (topbar), na **Visão geral** e na **Central de Segurança**
(apenas no modo demo):

- **injetar MQTT** — simula `mosquitto_pub casa/porta abrir` (a porta abre). Após a virada
  (TLS ligado), a injeção anônima é **rejeitada** e a porta não abre.
- **simular brute force** — simula o `hydra` testando senhas. No modo inseguro `admin123`
  abre; após a virada, a senha padrão não vale e, após 5 falhas, o IP é **bloqueado**
  (rate limiting) — o placar de **bloqueios** sobe e o log marca *BLOQUEIO*.
- **aplicar/retirar TLS** — simula a **virada** completa (TLS + senha forte + rate limiting
  + auth no MQTT). O rótulo muda para **HTTPS·TLS** e as credenciais passam a *protegido*.

> No **modo conectado**, esses botões ficam desativados — os ataques reais vêm do Kali
> (`hydra`, `mosquitto_pub`) e a virada é feita no broker/dispositivo.

## Integração com o dispositivo real
As chaves do JSON de `/state` esperadas do `dispositivo_iot.py` são:
`estado, evento, ultima_tentativa, tls, mqtt_tls, temp_dht, umid_dht, temp_ntc,
tentativas_http, tentativas_falhas, injecoes_mqtt, bloqueios_http, log[]`
(cada item de `log`: `ts, canal, tipo, detalhe, exposto`). Há também `GET /metrics`
(formato Prometheus) para observabilidade.

## Ressalvas honestas
- É **front-end**. O comportamento real (abrir a trava física, MQTT, ser atacado pelo
  Kali) é do `dispositivo_iot.py` / firmware. O modo demo apenas **simula** o comportamento
  no navegador para fins de apresentação; a frota simulada (exceto `CAM-G6`) é didática.
- Nenhuma biblioteca externa é usada (nada de CDN) — funciona offline.
- Verificado com Chromium: as 9 rotas renderizam sem erros de console; ações de demo (injeção,
  brute force com rate limiting, virada TLS), filtros/exportação CSV, troca de tema e layout
  responsivo (desktop/mobile, sem *scroll* horizontal) validados.
