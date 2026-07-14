# Ligação do ESP32 (v2) — fechadura IoT com sensores

> Ligações da **versão física**, agora com **DHT22** (temp+umidade) e **NTC 10k** (temp).
> Se for usar só a versão simulada (VM), ignore este arquivo.
>
> **Ressalva honesta:** os pinos batem com o `firmware_esp32.ino`. Confirme a pinagem da
> **sua** placa (ESP32 DevKit v1) e o **modo do relé** (muitos são *active-low*). O NTC
> exige o **divisor** descrito abaixo e **calibração do Beta** para leitura precisa.

## Componentes
| Qtd | Componente | Papel |
|----|------------|-------|
| 1 | ESP32 DevKit v1 | microcontrolador / dispositivo IoT |
| 1 | Módulo relé (1 canal) | "trava" da porta |
| 1 | LED verde + resistor 330 Ω | status "liberado" |
| 1 | LED vermelho + resistor 330 Ω *(opcional)* | status "negado" |
| 1 | Buzzer ativo 5V | beep de acesso / alarme |
| 1 | **DHT22** (AM2302) | telemetria: temperatura + umidade |
| 1 | **NTC 10k** + **resistor 10k** | telemetria: temperatura (divisor) |
| — | protoboard + jumpers | montagem |
| — | *(opcional)* resistor 10k pull-up p/ DHT22 | estabilidade do dado |

## Mapeamento de pinos

| Sinal | Pino ESP32 | Tipo | Liga em | Constante no firmware |
|-------|-----------|------|---------|-----------------------|
| Relé IN | **GPIO 26** | saída digital | IN do módulo relé | `PIN_RELE` |
| LED verde | **GPIO 25** | saída digital | ânodo (via 330 Ω) | `PIN_LED_V` |
| LED vermelho | **GPIO 33** | saída digital | ânodo (via 330 Ω) | `PIN_LED_R` |
| Buzzer | **GPIO 27** | saída digital | + do buzzer | `PIN_BUZZER` |
| DHT22 DATA | **GPIO 4** | digital (1-wire) | pino DATA do DHT22 | `PIN_DHT` |
| NTC (leitura) | **GPIO 34** | **ADC** (entrada) | meio do divisor NTC/10k | `PIN_NTC` |
| Alimentação 5V | **VIN/5V** | power | VCC relé / buzzer | — |
| Alimentação 3V3 | **3V3** | power | VCC DHT22 / topo do divisor NTC | — |
| Terra | **GND** | power | GND comum de tudo | — |

> **Importante (ADC do ESP32):** use um pino do **ADC1** (GPIO 32–39) para o NTC —
> o `GPIO 34` é entrada-apenas e ideal. **Evite os pinos do ADC2** (usados pelo Wi-Fi).

## Divisor de tensão do NTC (obrigatório)

O NTC sozinho não gera tensão legível; monte um divisor com o resistor de 10k:

```
 3V3 ──[ NTC 10k ]──┬──[ R 10k ]── GND
                     │
                  GPIO34 (ADC)
```

- A tensão no meio varia com a temperatura → o firmware converte via **equação Beta**.
- Os parâmetros (`NTC_BETA`, `NTC_R_NOMINAL`) estão no `.ino`; ajuste ao seu sensor.

## Esquemático (ver também `LIGACAO_ESP32.svg`)

```
                         ESP32 DevKit v1
                     +------------------------+
        5V  ---------| VIN               3V3  |--------+---( DHT22 VCC )
                     |                        |        +---( topo divisor NTC )
        GND ----+----| GND               GND  |----+
                |    |                        |    |
   ( relé VCC )-+    | GPIO26 ----> IN (relé) |    +--- GND comum
   ( buzzer - )-+    | GPIO25 ----> LED verde --[330]--> GND
   ( DHT22 GND)-+    | GPIO27 ----> buzzer +  |
   (divisor GND)+    | GPIO33 ----> LED verm. --[330]--> GND
                     | GPIO4  <---- DHT22 DATA |
                     | GPIO34 <---- meio do divisor NTC/10k
                     +------------------------+

 Divisor NTC:  3V3 --[NTC 10k]--+--[10k]-- GND ,  '+' vai ao GPIO34
 Relé:  VCC->5V  GND->GND  IN->GPIO26  (saida NO/COM aciona a "porta")
 DHT22: VCC->3V3  GND->GND  DATA->GPIO4  (pull-up 10k entre DATA e VCC, opcional)
```

## Diagrama de blocos (componentes)

Veja `COMPONENTES.svg` para a visão de blocos (dispositivo, sensores, atuadores,
rede, atacante). Renderiza como imagem em qualquer visualizador de SVG.

## Modo seguro (virada)
A pinagem é a **mesma** nos dois modos. A virada é só software: `#define MODO_SEGURO true`
no topo do `firmware_esp32.ino` liga MQTT sobre TLS (8883) + autenticação + senha forte +
rate limiting — cole a `ca.crt` (gerada por `kali/harden.sh`) em `CA_CERT` e recompile.

## Dicas
- Alimente o ESP32 pelo **micro-USB** durante a demo (estável).
- Relé de 4 canais também serve — use 1 canal.
- Anote o **IP do ESP32** no Serial Monitor ao ligar (é o `<IP_ESP32>` do hydra).
- Se o DHT22 ler `nan`, confira o pull-up e o tempo entre leituras (≥ 2 s).
- Se a temperatura do NTC vier estranha, recalibre `NTC_BETA`/`NTC_R_NOMINAL`.
