# Kali — 03 · Cenário B: MQTT (interceptação + injeção)

> O broker mosquitto roda **na Kali** (`<IP_KALI>`), sem TLS e sem auth (de propósito).
> O dispositivo-alvo **assina** `casa/porta`. Como o broker está na Kali, o Wireshark vê tudo localmente.

## Ato 1 — Interceptação (Wireshark lê o comando em claro)

1. No Wireshark, capturando na interface da rede interna, aplique o filtro:
   ```
   mqtt
   ```
2. Gere um comando legítimo (simulando o "app" da fechadura):
   ```bash
   mosquitto_pub -h <IP_KALI> -t casa/porta -m abrir
   ```
3. No Wireshark, abra o pacote **MQTT Publish Message**. Mostre os campos legíveis:
   - **Topic:** `casa/porta`
   - **Message:** `abrir`

### Bônus (v2) — telemetria sensível também em claro
O dispositivo publica temperatura/umidade em `casa/telemetria`. Mostre que **dados do
sensor** (não só o comando) trafegam expostos:
```bash
mosquitto_sub -h <IP_KALI> -t casa/telemetria -v
```
No Wireshark (filtro `mqtt`) aparece o JSON `{"temp_dht":..,"umid_dht":..,"temp_ntc":..}`
legível — reforça que **qualquer dado de IoT sem TLS vaza**, não apenas senhas.

> **Fala:** "O comando de destravar viaja sem criptografia. Além de ler, um atacante pode repetir/forjar esse comando."

**Observar em tempo real (opcional, bom para o telão):**
```bash
# escuta tudo que passa no topico (mostra o payload chegando)
mosquitto_sub -h <IP_KALI> -t casa/porta -v
```

## Ato 2 — Injeção (forjar o comando, sem autenticação)

Como o broker aceita conexões anônimas, **qualquer um publica** o comando —
não há "porteiro". Do lado do atacante:

```bash
mosquitto_pub -h <IP_KALI> -t casa/porta -m abrir
```

**Resultado esperado:** o dispositivo-alvo **destrava**:
- simulado → a tela/`/status` mostra `ACESSO LIBERADO via MQTT`;
- físico → **relé clica, LED verde acende, buzzer apita**.

> **Fala:** "Repare: não quebramos senha nenhuma. O serviço simplesmente não exigia autenticação — e isso basta para abrir a porta."

Variações para reforçar:
```bash
mosquitto_pub -h <IP_KALI> -t casa/porta -m fechar   # tranca de novo
mosquitto_pub -h <IP_KALI> -t casa/porta -m abrir    # abre de novo (repetível)
```

## Por que injeção (e não brute force) no MQTT
- O `hydra` **não tem módulo MQTT**; o ataque natural aqui é a **injeção/impersonação de publisher**, que é exatamente o retrato de um broker mal configurado (sem auth/sem TLS).
- Se você **ligar** usuário/senha no broker, o `mosquitto_pub` anônimo passa a ser **rejeitado** — é a virada (arquivo 06).

## Erros comuns (e ajustes)
- **`Connection refused` / não conecta** → o mosquitto não está ouvindo em `0.0.0.0:1883` ou há firewall. Reveja `01_preparacao.md` (config `listener 1883 0.0.0.0`, `allow_anonymous true`).
- **Wireshark não mostra `mqtt`** → confirme a interface certa e que o tráfego passa pela Kali (o broker está nela, então deve passar). Cheque também se o dispositivo realmente conectou (`mosquitto_sub` deve ver o payload).
- **Publica mas a porta não abre** → confira se o dispositivo assinou o mesmo tópico (`casa/porta`) e se o payload é `abrir` (minúsculo).

## Plano B (sem rede ao vivo)
Prints: (1) Wireshark com o Publish `casa/porta = abrir` legível; (2) o dispositivo abrindo após o `mosquitto_pub`. No físico, um vídeo curto do relé/LED é o mais impactante.
