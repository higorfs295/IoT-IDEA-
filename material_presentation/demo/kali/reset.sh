#!/usr/bin/env bash
# reset.sh — devolve a Kali ao estado inicial da demo entre ensaios.
# Uso:   sudo bash reset.sh
# O que faz:
#   - volta o broker mosquitto para o modo INSEGURO (1883, anonimo)
#   - remove config de TLS/auth deixada pela "virada"
#   - encerra dispositivos/capturas soltos (opcional)
set -euo pipefail

echo "== restaurando broker INSEGURO (atos 1-2) =="
mkdir -p /etc/mosquitto/conf.d
cat > /etc/mosquitto/conf.d/demo.conf <<'EOF'
listener 1883 0.0.0.0
allow_anonymous true
EOF

# remove artefatos da virada, se existirem
rm -f /etc/mosquitto/passwd 2>/dev/null || true
# (mantemos os certs em /etc/mosquitto/certs; nao atrapalham o modo inseguro)

systemctl restart mosquitto
sleep 1
echo "  broker reiniciado (1883, anonimo)."

echo "== encerrando processos de demo soltos (se houver) =="
pkill -f "dispositivo_iot.py" 2>/dev/null && echo "  dispositivo_iot.py encerrado" || true
pkill -f "tcpdump" 2>/dev/null || true

echo "== teste rapido =="
( mosquitto_sub -h 127.0.0.1 -t casa/porta -C 1 -W 3 & sleep 1; \
  mosquitto_pub -h 127.0.0.1 -t casa/porta -m abrir; wait ) \
  && echo "  broker OK" || echo "  [aviso] verifique o mosquitto"

echo
echo "Ambiente pronto para novo ensaio (estado inseguro dos atos 1-2)."
echo "Reinicie o alvo na VM-ESP32 e refaca o self-test antes de comecar."
