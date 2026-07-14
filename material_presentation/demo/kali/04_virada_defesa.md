# Kali — 04 · A virada (defesa): TLS + senha forte + autenticação

> Objetivo: repetir os dois ataques e mostrar que agora **falham**. É o clímax da demo
> e a ponte com a conclusão do seminário: *criptografia protege o transporte, mas não
> substitui autenticação*.

> **⚠️ Ensaie esta parte antes.** Gerar certificado e configurar o broker/dispositivo é
> o que mais toma tempo. Se o tempo de palco for curto, deixe a virada como **vídeo/prints**.

> **Atalho (v3):** `sudo bash kali/harden.sh <IP_KALI> [usuario] [senha]` faz sozinho os
> passos da Defesa 2 (CA/cert + usuário + mosquitto em 8883/TLS/auth) e testa. Ele imprime,
> no fim, o comando exato para religar o alvo simulado no modo seguro. Se preferir entender
> passo a passo, siga o manual abaixo.

## Defesa 1 — Senha forte + rate limiting (barra o brute force do Cenário A)

No dispositivo, troque a senha padrão por uma senha forte **e ligue o rate limiting**:
- **Simulado:** reinicie com `--password` e `--max-fails`:
  ```bash
  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 80 \
       --password "S3nh@-Forte-#2026" --max-fails 5 --lockout 30
  ```
- **Físico:** `#define MODO_SEGURO true` (aplica senha forte + rate limiting) e regrave.

Repita o hydra:
```bash
hydra -l admin -P ~/wordlist_demo.txt <IP_VM_ESP32> \
      http-post-form "/login:usuario=^USER^&senha=^PASS^:Senha incorreta"
```
**Resultado:** o hydra **não** encontra a senha (não está na wordlist) **e** é bloqueado —
após 5 tentativas o alvo passa a responder **HTTP 429** e o placar de **bloqueios** sobe.
> "Senha forte e única quebra a viabilidade do brute force; o rate limiting corta a força bruta antes mesmo disso — é defesa em camadas."

## Defesa 2 — MQTT sobre TLS + autenticação (barra a injeção do Cenário B)

### 2.1 Gerar certificados (CA + servidor) na Kali

```bash
mkdir -p ~/mqtt-tls && cd ~/mqtt-tls

# CA
openssl req -new -x509 -days 365 -nodes \
  -keyout ca.key -out ca.crt -subj "/CN=DemoG6-CA"

# chave + CSR do servidor (CN = IP do broker)
openssl req -new -nodes \
  -keyout server.key -out server.csr -subj "/CN=<IP_KALI>"

# assina o certificado do servidor com a CA
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365
```

### 2.2 Definir usuário/senha do broker

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd iot_user   # pede a senha
```

### 2.3 Reconfigurar o mosquitto (TLS + auth, sem anônimo)

```bash
sudo cp ~/mqtt-tls/ca.crt ~/mqtt-tls/server.crt ~/mqtt-tls/server.key /etc/mosquitto/certs/ 2>/dev/null || \
  sudo mkdir -p /etc/mosquitto/certs && sudo cp ~/mqtt-tls/{ca.crt,server.crt,server.key} /etc/mosquitto/certs/

sudo tee /etc/mosquitto/conf.d/demo.conf >/dev/null <<'EOF'
# porta insegura desligada; agora só TLS com autenticação
listener 8883 0.0.0.0
cafile   /etc/mosquitto/certs/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile  /etc/mosquitto/certs/server.key
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF

sudo systemctl restart mosquitto
```

### 2.4 Repetir a injeção do atacante (agora deve FALHAR)

```bash
# tentativa anônima e sem TLS -> rejeitada
mosquitto_pub -h <IP_KALI> -t casa/porta -m abrir
# tentativa TLS mas sem credencial -> rejeitada
mosquitto_pub -h <IP_KALI> -p 8883 --cafile ~/mqtt-tls/ca.crt -t casa/porta -m abrir
```
**Resultado:** conexão recusada / não autorizado. A porta **não** abre.

> Para provar que o sistema legítimo ainda funciona (com credencial):
> ```bash
> mosquitto_pub -h <IP_KALI> -p 8883 --cafile ~/mqtt-tls/ca.crt \
>   -u iot_user -P "<senha>" -t casa/porta -m abrir
> ```

### 2.5 Re-interceptar com o Wireshark
Repita a captura com filtro `mqtt`/`tls`: o conteúdo agora aparece **cifrado** — o tópico/payload não são mais legíveis.

### 2.6 Religar o ALVO no canal seguro (v3 — agora fecha 100%)

Para o dispositivo **continuar recebendo comandos legítimos** após a virada, ele fala TLS/auth:

- **Simulado** (`dispositivo_iot.py`) — o `harden.sh` imprime este comando pronto:
  ```bash
  python3 dispositivo_iot.py --broker <IP_KALI> --http-port 443 \
    --tls --certfile dev.crt --keyfile dev.key --password "S3nh@-Forte" \
    --max-fails 5 --lockout 30 \
    --mqtt-port 8883 --mqtt-tls --cafile ~/mqtt-tls/ca.crt \
    --mqtt-user iot_user --mqtt-pass "<senha>"
  ```
- **Físico** (`firmware_esp32.ino`): `#define MODO_SEGURO true`, cole a `ca.crt` em `CA_CERT` e
  defina `MQTT_USER`/`MQTT_PASS`. O firmware passa a usar `WiFiClientSecure` + `setCACert` e
  `connect(clientId, MQTT_USER, MQTT_PASS)` na porta 8883.

> **Ressalva honesta:** o **painel do ESP32** continua em HTTP (HTTPS de servidor no ESP32 exige
> proxy TLS ou lib dedicada — fora do escopo). No **simulado**, `--tls` já entrega o painel em
> HTTPS de verdade, então a virada do Cenário A também fica 100% ao vivo.

## Fecho (fala)
"Ligando TLS, a interceptação falha; exigindo autenticação no broker, a injeção falha; e com senha forte, o brute force falha. Nenhuma medida sozinha resolve tudo — segurança é em camadas."
