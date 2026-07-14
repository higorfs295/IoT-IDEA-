#!/usr/bin/env bash
# setup.sh — prepara a Kali para a demo do Seminario G6 (modo INSEGURO, atos 1-2)
# Uso:   sudo bash setup.sh
# Reverte / vira defesa:  ver kali/04_virada_defesa.md  e  reset.sh
set -euo pipefail

echo "== [1/4] instalando ferramentas =="
apt update -y
apt install -y wireshark hydra mosquitto mosquitto-clients python3 python3-pip curl
pip3 install paho-mqtt --break-system-packages 2>/dev/null || pip3 install paho-mqtt || true

echo "== [2/4] configurando broker mosquitto (INSEGURO: 1883, anonimo) =="
mkdir -p /etc/mosquitto/conf.d
cat > /etc/mosquitto/conf.d/demo.conf <<'EOF'
# DEMO — inseguro de proposito (atos 1 e 2). NAO usar em producao.
listener 1883 0.0.0.0
allow_anonymous true
EOF
systemctl restart mosquitto
sleep 1
systemctl --no-pager status mosquitto | head -3 || true

echo "== [3/4] criando wordlist controlada (~/wordlist_demo.txt) =="
# usa o HOME do usuario que chamou o sudo, se houver
DEST_HOME="${SUDO_USER:+/home/$SUDO_USER}"
DEST_HOME="${DEST_HOME:-$HOME}"
cat > "$DEST_HOME/wordlist_demo.txt" <<'EOF'
123456
admin
password
12345678
qwerty
admin123
senha
root
EOF
chown "${SUDO_USER:-$(whoami)}" "$DEST_HOME/wordlist_demo.txt" 2>/dev/null || true
echo "  wordlist em: $DEST_HOME/wordlist_demo.txt  (contem admin123)"

echo "== [4/4] teste rapido do broker (loopback) =="
( mosquitto_sub -h 127.0.0.1 -t casa/porta -C 1 -W 3 & sleep 1; \
  mosquitto_pub -h 127.0.0.1 -t casa/porta -m abrir; wait ) \
  && echo "  broker OK (recebeu 'abrir')" || echo "  [aviso] verifique o mosquitto"

echo
echo "PRONTO. IPs desta VM:"
ip -4 addr | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | sed 's/^/   /'
echo
echo "Proximos passos:"
echo "  - Anote IP_KALI (acima) e IP_VM_ESP32 (na outra VM)."
echo "  - Suba o alvo:  na VM-ESP32 ->  sudo python3 dispositivo_iot.py --broker <IP_KALI> --http-port 80"
echo "  - Verifique tudo:  python3 dispositivo_iot.py --broker <IP_KALI> --self-test"
echo "  - Ataques:  kali/02_cenarioA_http_bruteforce.md  e  kali/03_cenarioB_mqtt_injecao.md"
