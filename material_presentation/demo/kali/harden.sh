#!/usr/bin/env bash
# harden.sh — automatiza a VIRADA (defesa) do broker na Kali: TLS + autenticação.
# Faz de uma vez o que o kali/04_virada_defesa.md descreve passo a passo:
#   1) gera CA + certificado do servidor (CN = IP da Kali);
#   2) cria o usuário/senha do broker;
#   3) reconfigura o mosquitto para 8883 (TLS) + auth, sem anônimo;
#   4) reinicia e testa (injeção anônima deve ser REJEITADA).
#
# Uso:   sudo bash harden.sh <IP_KALI> [usuario] [senha]
# Ex.:   sudo bash harden.sh 192.168.56.10 iot_user "S3nh@-Broker-2026"
#
# Reverter para o modo inseguro (atos 1-2):  sudo bash reset.sh
# Ético: rede isolada, apenas contra o próprio dispositivo do grupo.
set -euo pipefail

IP_KALI="${1:-}"
MQTT_USER="${2:-iot_user}"
MQTT_PASS="${3:-}"

if [[ -z "$IP_KALI" ]]; then
  echo "uso: sudo bash harden.sh <IP_KALI> [usuario] [senha]" >&2
  exit 1
fi
if [[ -z "$MQTT_PASS" ]]; then
  # gera uma senha forte se não vier por argumento
  MQTT_PASS="$(openssl rand -base64 15)"
  echo "== senha do broker gerada automaticamente: $MQTT_PASS =="
fi

CERTS=/etc/mosquitto/certs
WORK="${SUDO_USER:+/home/$SUDO_USER}"; WORK="${WORK:-$HOME}/mqtt-tls"

echo "== [1/4] gerando CA + certificado do servidor (CN=$IP_KALI) em $WORK =="
mkdir -p "$WORK" && cd "$WORK"
openssl req -new -x509 -days 365 -nodes -keyout ca.key -out ca.crt -subj "/CN=DemoG6-CA"
openssl req -new -nodes -keyout server.key -out server.csr -subj "/CN=$IP_KALI"
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365
chown -R "${SUDO_USER:-$(whoami)}" "$WORK" 2>/dev/null || true

echo "== [2/4] instalando certificados em $CERTS =="
mkdir -p "$CERTS"
cp ca.crt server.crt server.key "$CERTS/"
chown mosquitto:mosquitto "$CERTS"/{ca.crt,server.crt,server.key} 2>/dev/null || true

echo "== [3/4] criando usuário do broker ($MQTT_USER) =="
mosquitto_passwd -b -c /etc/mosquitto/passwd "$MQTT_USER" "$MQTT_PASS"

echo "== [4/4] reconfigurando mosquitto (8883 TLS + auth, sem anônimo) =="
tee /etc/mosquitto/conf.d/demo.conf >/dev/null <<EOF
# VIRADA — TLS + autenticação. A porta insegura 1883 fica desligada.
listener 8883 0.0.0.0
cafile   $CERTS/ca.crt
certfile $CERTS/server.crt
keyfile  $CERTS/server.key
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF
systemctl restart mosquitto
sleep 1

echo
echo "== teste: injeção ANÔNIMA deve FALHAR =="
if mosquitto_pub -h "$IP_KALI" -t casa/porta -m abrir 2>/dev/null; then
  echo "  [ATENÇÃO] injeção anônima foi aceita — revise a config!"
else
  echo "  [ok] injeção anônima rejeitada (porta 1883 fechada / auth exigida)"
fi

echo "== teste: publisher LEGÍTIMO (TLS + credencial) deve FUNCIONAR =="
if mosquitto_pub -h "$IP_KALI" -p 8883 --cafile "$WORK/ca.crt" \
     -u "$MQTT_USER" -P "$MQTT_PASS" -t casa/porta -m abrir 2>/dev/null; then
  echo "  [ok] publisher autenticado aceito"
else
  echo "  [aviso] publisher legítimo falhou — confira CN do cert = $IP_KALI e a CA"
fi

cat <<EOF

============================================================
 VIRADA aplicada. Agora, do lado do ALVO, use o canal seguro:

 Simulado (dispositivo_iot.py):
   python3 dispositivo_iot.py --broker $IP_KALI --http-port 443 \\
     --tls --certfile dev.crt --keyfile dev.key --password "S3nh@-Forte" \\
     --max-fails 5 --lockout 30 \\
     --mqtt-port 8883 --mqtt-tls --cafile $WORK/ca.crt \\
     --mqtt-user $MQTT_USER --mqtt-pass "$MQTT_PASS"

 Físico (firmware_esp32.ino):
   #define MODO_SEGURO true   + cole $WORK/ca.crt em CA_CERT
   + MQTT_USER="$MQTT_USER"  MQTT_PASS="$MQTT_PASS"

 Repita os ataques: hydra e mosquitto_pub anônimo agora FALHAM.
 Reverter para inseguro:  sudo bash reset.sh
============================================================
EOF
