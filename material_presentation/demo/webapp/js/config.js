/* config.js — configuracao da aplicacao web da Camera IoT (Seminario G6)
 *
 * MODO:
 *   'auto'  -> tenta conectar ao dispositivo real; se falhar, cai para mock
 *   'live'  -> forca conexao ao dispositivo (dispositivo_iot.py)
 *   'mock'  -> simulacao no navegador (sem backend) — bom para apresentar/entregar
 *
 * BASE_URL: onde o dispositivo_iot.py responde. Vazio ('') = mesma origem
 *   (quando o front e servido pelo proprio dispositivo). Para testar o front
 *   separado apontando a um dispositivo, use ex.: 'http://192.168.56.20'
 */
window.APP_CONFIG = {
  MODE: 'auto',
  BASE_URL: '',            // '' = mesma origem; ou 'http://<IP_VM_ESP32>'
  POLL_MS: 1500,           // fallback de polling quando SSE indisponivel
  MOCK_TICK_MS: 2000,      // ritmo da telemetria no modo mock
  DEVICE_LABEL: 'CAM-G6 / porta principal',
};
