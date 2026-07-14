# Kali — 01 · Preparação do ambiente (v2)

> **⚠️ Ético:** rede interna/isolada, atacando **apenas** o dispositivo do próprio grupo.
> **⚠️ Sintaxe:** confirme opções no `--help` da sua versão (`hydra`, `mosquitto`, `wireshark`).

## Caminho rápido (recomendado): `setup.sh`

Na **VM Kali**, com o pacote copiado:

```bash
sudo bash kali/setup.sh
```

Ele instala tudo, sobe o broker **inseguro** (1883, anônimo), cria a wordlist
`~/wordlist_demo.txt` (com `admin123`), testa o broker e imprime o IP da Kali.

Depois, entre ensaios, para voltar ao estado inicial:

```bash
sudo bash kali/reset.sh
```

## Caminho manual (se preferir passo a passo)

### 1. Rede das duas VMs (mesma rede interna/host-only)
```bash
ip -4 addr | grep inet          # IP da Kali -> <IP_KALI>
ping -c 2 <IP_VM_ESP32>         # confirme que alcança o alvo
```
Anote: `IP_KALI = ____________` · `IP_VM_ESP32 = ____________`

### 2. Ferramentas
```bash
sudo apt update
sudo apt install -y wireshark hydra mosquitto mosquitto-clients python3-pip
pip3 install paho-mqtt --break-system-packages
```

### 3. Broker mosquitto (inseguro, para os atos 1–2)
```bash
sudo tee /etc/mosquitto/conf.d/demo.conf >/dev/null <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
EOF
sudo systemctl restart mosquitto
```

### 4. Wordlist controlada
```bash
printf '123456\nadmin\npassword\nqwerty\nadmin123\nsenha\nroot\n' > ~/wordlist_demo.txt
```

## Subir o alvo

- **Simulada** (na `VM ESP32-simulado`):
  ```bash
  pip3 install paho-mqtt --break-system-packages
  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 80
  ```
- **Física:** grave o `firmware_esp32.ino` (com `MQTT_BROKER=<IP_KALI>`), ligue o ESP32,
  anote o IP do Serial Monitor.

## Verificação antes do palco (`--self-test`)

O próprio dispositivo confere HTTP + MQTT + telemetria e sai com código 0/1:

```bash
# rode na VM-alvo (sobe, testa e encerra)
python3 dispositivo_iot.py --broker <IP_KALI> --self-test
```
Saída esperada:
```
== self-test ==
  [ok] HTTP responde: ok
  [ok] MQTT telemetria recebida
== resultado: PRONTO ==
```

## Novidade v2 — telemetria (dado sensível trafegando)

Além do comando de porta, o dispositivo agora **publica temperatura/umidade** em
`casa/telemetria`. Você pode mostrar esse fluxo (é dado sensível de IoT viajando):
```bash
mosquitto_sub -h <IP_KALI> -t casa/telemetria -v
```

## Novidade v3 — observabilidade (`/metrics`)

O dispositivo expõe métricas no **formato Prometheus** — útil para mostrar o tema de
Observabilidade (Volume VI do dossiê) e para verificar contadores ao vivo:
```bash
curl http://<IP_VM_ESP32>/metrics
# iot_porta_trancada, iot_tentativas_http_total, iot_falhas_login_total,
# iot_bloqueios_http_total, iot_temperatura_celsius{sensor=...}, iot_tls_ativo ...
```

## Checklist rápido
- [ ] `ping <IP_VM_ESP32>` responde
- [ ] `curl http://<IP_VM_ESP32>/` mostra o painel (agora com telemetria/placar)
- [ ] `mosquitto_sub -t casa/telemetria -v` recebe leituras
- [ ] `curl http://<IP_VM_ESP32>/metrics` retorna métricas Prometheus
- [ ] `--self-test` retorna PRONTO (checa HTTP, MQTT, telemetria e `/metrics`)
- [ ] wordlist com `admin123`
