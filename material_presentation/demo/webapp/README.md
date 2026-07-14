# Câmera IoT — Aplicação Web (Seminário G6 · Segurança em IoT)

Front-end da "fechadura/câmera inteligente" da demonstração: **dashboard ao vivo**,
**tela de login** e **página de resultado**, em HTML + CSS + JavaScript puro (sem build,
sem dependências). Funciona de duas formas:

- **Modo demo (mock):** roda **sem backend** — telemetria simulada, e botões que
  reproduzem os ataques (injeção MQTT, brute force, virada TLS). Ótimo para apresentar
  ou entregar. Basta abrir `index.html`.
- **Modo conectado (live):** consome o dispositivo real (`dispositivo_iot.py`) via
  `GET /state` e `SSE /events`, e o login faz `POST /login`. Usado quando o front é
  servido pelo próprio dispositivo ou apontando para o IP dele.

## Como abrir

### Jeito mais simples (modo demo)
Abra o arquivo `index.html` no navegador (duplo-clique). Pronto — o painel anima sozinho.

> Observação: alguns navegadores restringem `file://`. Se algo não carregar, use o
> servidor local abaixo (recomendado de qualquer forma).

### Servindo localmente (recomendado)
Dentro da pasta `webapp/`:
```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

### Modo conectado ao dispositivo real
Edite `js/config.js`:
```js
window.APP_CONFIG = {
  MODE: 'live',                 // ou 'auto'
  BASE_URL: 'http://<IP_VM_ESP32>',  // IP do dispositivo_iot.py
  ...
};
```
- `MODE: 'auto'` (padrão) tenta o dispositivo (`/healthz`) e, se não responder, cai para o mock.
- Se o front for **servido pelo próprio dispositivo**, deixe `BASE_URL: ''` (mesma origem).

## Estrutura
```
webapp/
├── index.html          # dashboard (painel ao vivo)
├── login.html          # tela de login dedicada
├── resultado.html      # página de resultado (acesso liberado/negado)
├── css/
│   └── style.css       # design system (tema escuro tecnológico)
├── js/
│   ├── config.js       # modo (mock/live/auto), IP do dispositivo
│   ├── store.js        # estado + provedores mock e live (SSE/fetch)
│   ├── dashboard.js    # renderização do painel + sparklines
│   └── login.js        # comportamento da tela de login
└── assets/
    └── favicon.svg
```

## O que cada tela mostra
- **Dashboard (`index.html`):** estado da trava (🔒/🔓, verde/vermelho), telemetria
  (DHT22 temp/umidade + NTC) com mini-gráficos, **placar de ataque** (tentativas HTTP,
  falhas, injeções MQTT), "última tentativa" e o **log** com marcação
  *VISTO pelo atacante* × *protegido*.
- **Login (`login.html`):** identidade do dispositivo + formulário; avisa que é
  **HTTP sem TLS**. No mock vai para `resultado.html`; no live faz `POST /login`.
- **Resultado (`resultado.html`):** confirma acesso liberado/negado.

## Controles de demonstração (rodapé do dashboard, só no modo demo)
- **injetar MQTT** — simula `mosquitto_pub casa/porta abrir` (a porta abre).
- **simular brute force** — simula o `hydra` testando senhas até `admin123`.
- **ligar/desligar TLS** — simula a "virada": o rótulo muda para HTTPS·TLS e as
  credenciais passam a aparecer como "protegido" no log.

> No **modo conectado**, esses botões não agem localmente — os ataques reais vêm do
> Kali (`hydra`, `mosquitto_pub`) e a virada é feita no broker/dispositivo.

## Integração com o dispositivo real
As chaves do JSON de `/state` esperadas do `dispositivo_iot.py` são:
`estado, evento, ultima_tentativa, tls, temp_dht, umid_dht, temp_ntc,
tentativas_http, tentativas_falhas, injecoes_mqtt, log[]`
(cada item de `log`: `ts, canal, tipo, detalhe, exposto`). O dispositivo já entrega
exatamente esse formato.

## Ressalvas honestas
- É **front-end**. O comportamento real (abrir a trava física, MQTT, ser atacado pelo
  Kali) é do `dispositivo_iot.py` / firmware. O modo demo apenas **simula** o
  comportamento no navegador para fins de apresentação.
- Nenhuma biblioteca externa é usada (nada de CDN) — funciona offline.
- Testado com Chromium: dashboard, sparklines, login, brute force simulado, injeção MQTT
  e virada TLS funcionando; login → resultado validado.
