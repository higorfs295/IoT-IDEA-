# Kali — 04 · A virada (defesa): TLS + senha forte + autenticação

> Objetivo: repetir os dois ataques e mostrar que agora **falham**. É o clímax da demo
> e a ponte com a conclusão do seminário: *criptografia protege o transporte, mas não
> substitui autenticação*.

> **⚠️ Ensaie esta parte antes.** Gerar certificado e configurar o broker/dispositivo é
> o que mais toma tempo. Se o tempo de palco for curto, deixe a virada como **vídeo/prints**.

## Defesa 1 — Senha forte (barra o brute force do Cenário A)

No dispositivo, troque a senha padrão por uma senha forte:
- **Simulado:** reinicie apontando `--password`:
  ```bash
  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 80 \
       --password "S3nh@-Forte-#2026"
  ```
- **Físico:** altere `PAINEL_PASS` no firmware e regrave.

Repita o hydra:
```bash
hydra -l admin -P ~/wordlist_demo.txt <IP_VM_ESP32> \
      http-post-form "/login:usuario=^USER^&senha=^PASS^:Senha incorreta"
```
**Resultado:** o hydra **não** encontra a senha (não está na wordlist). 
> "Senha forte e única quebra a viabilidade do brute force."

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

> **Ressalva:** para o **dispositivo** continuar recebendo comandos legítimos após a virada, ele também precisa falar TLS. No firmware, use `WiFiClientSecure` + `setCACert(ca.crt)` e `connect(clientId, "iot_user", "<senha>")` na porta 8883 (ver comentário no fim do `firmware_esp32.ino`). No simulado, a versão simples não faz TLS de servidor — para a virada MQTT, foque na **rejeição da injeção** e na **captura cifrada**, que já demonstram o ponto.

## Fecho (fala)
"Ligando TLS, a interceptação falha; exigindo autenticação no broker, a injeção falha; e com senha forte, o brute force falha. Nenhuma medida sozinha resolve tudo — segurança é em camadas."
