# Pacote da Demonstração — Segurança em IoT (Seminário G6) · v2

Kit completo da demo prática da **Pessoa 4 (Wilson)**: dois cenários de ataque
(**A: HTTP + brute force**, **B: MQTT + injeção**), em duas versões
(**simulada** numa VM dedicada e **física** no ESP32), com **broker na Kali** e
duas VMs na **mesma rede interna**.

## Novidades da v2
- **Painel web ao vivo** (verde/vermelho, telemetria, "última tentativa"), sem F5.
- **Placar de ataque** em tempo real (tentativas HTTP / injeções MQTT).
- **Sensores DHT22 + NTC 10k** → telemetria em `casa/telemetria` (dado sensível trafegando).
- **Log didático** ("visto pelo atacante" × "protegido").
- **`--self-test`** no dispositivo + **`setup.sh` / `reset.sh`** na Kali.
- **Painel HTTPS opcional (`--tls`)** → virada 100% ao vivo.
- **Esquemático + diagrama de componentes (SVG)** e **mapeamento de pinos**.

## Aplicação web (nova)
A pasta `webapp/` traz o front-end completo em HTML/CSS/JS: abra `webapp/index.html`
(modo demo, sem backend) ou aponte para o dispositivo real via `webapp/js/config.js`.
Detalhes em `webapp/README.md`.

## Pré-visualização da interface
As imagens em `docs/preview/` mostram o **dashboard**, a **tela de login** e a página de
resultado já renderizados. O esquemático está em `docs/preview/LIGACAO_ESP32.svg`.

## Por onde começar
1. **`ROADMAP.md`** — plano de execução (fases, checklist, cronograma). **Comece aqui.**
2. **`docs/Demo_Seguranca_IoT_G6.md`** — documentação completa (arquitetura, diagramas, roteiro de palco, ressalvas).
3. **`kali/01_preparacao.md`** — montar o ambiente (ou rode `sudo bash kali/setup.sh`).

## Conteúdo
```
pacote/
├── README.md                          <- este índice
├── ROADMAP.md                         <- plano de execução (fases + cronograma)
├── docs/
│   └── Demo_Seguranca_IoT_G6.md       <- documentação completa
├── webapp/                            <- APLICACAO WEB (HTML/CSS/JS) — dashboard + login + resultado
│   ├── index.html · login.html · resultado.html
│   ├── css/style.css · js/{config,store,dashboard,login}.js
│   └── README.md                      <- como rodar (modo demo e modo conectado)
├── dispositivo_vm/
│   └── dispositivo_iot.py             <- alvo SIMULADO (web vivo + MQTT + telemetria + self-test + TLS)
├── firmware_esp32/
│   ├── firmware_esp32.ino             <- alvo FÍSICO (web + MQTT + DHT22 + NTC)
│   ├── LIGACAO_ESP32.md               <- mapeamento de pinos + esquemático (texto)
│   ├── LIGACAO_ESP32.svg              <- esquemático (imagem)
│   ├── COMPONENTES.svg                <- diagrama de blocos (imagem)
│   └── gerar_svg.py                   <- regenera os SVGs, se quiser editar
└── kali/
    ├── setup.sh                       <- instala tudo, sobe broker inseguro, cria wordlist
    ├── reset.sh                       <- restaura o estado inicial entre ensaios
    ├── 01_preparacao.md               <- rede, ferramentas, self-test
    ├── 02_cenarioA_http_bruteforce.md <- interceptação HTTP + hydra
    ├── 03_cenarioB_mqtt_injecao.md    <- interceptação MQTT (+ telemetria) + injeção
    └── 04_virada_defesa.md            <- TLS + senha forte + autenticação
```

## Fluxo em 1 parágrafo
Na `VM ESP32-simulado` roda o `dispositivo_iot.py` (uma "fechadura" com painel web vivo
`admin/admin`, cliente MQTT no tópico `casa/porta` e publicação de telemetria em
`casa/telemetria`, apontando para o broker da Kali). Da `VM Kali`, você **intercepta**
(Wireshark lê senha/comando/telemetria em claro), **ataca** (`hydra` quebra a senha padrão
no HTTP; `mosquitto_pub` injeta `abrir` no MQTT) e faz a **virada**: liga TLS + senha forte
+ autenticação, e os mesmos ataques passam a falhar. A versão física troca a VM-alvo pelo
**ESP32 real** (relé/LED/buzzer + DHT22/NTC), com o mesmo playbook de ataque.

## Aviso ético
Uso **educacional**, em **rede isolada**, contra o **próprio dispositivo do grupo**.
Os alvos são inseguros **de propósito** (HTTP sem TLS, senha padrão, MQTT sem auth).

## Ressalvas honestas
- **Wokwi não é atacável ao vivo** pelo Kali; a versão simulada usa uma **VM dedicada**.
- **`dispositivo_iot.py`** foi **testado** (Python 3 + `paho-mqtt`): HTTP, login, SSE,
  injeção MQTT, telemetria, self-test e modo TLS validados.
- **`firmware_esp32.ino`** é um **esqueleto funcional a compilar/validar** no seu ambiente
  (não foi compilado aqui). A leitura do NTC depende do seu divisor e do **Beta** — calibre.
- **Sintaxe do Kali** (`hydra http-post-form`, `mosquitto`/TLS): confirme na doc atual.
- **Diagramas Mermaid** validados estruturalmente; SVGs conferidos por renderização.
```
