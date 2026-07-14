/*
 * firmware_esp32.ino  (v2) — "Fechadura/Camera IoT" — Seminario G6
 * =========================================================================
 * Equivalente FISICO do dispositivo_iot.py (v2). Canais + telemetria:
 *   1) HTTP : painel web com login (admin/admin)  -> alvo do brute force (hydra)
 *   2) MQTT : assina 'casa/porta' (comando)  e  PUBLICA 'casa/telemetria'
 *             com leituras REAIS de DHT22 (temp+umid) e NTC 10k (temp).
 *
 * Ao "abrir" (login correto OU comando MQTT 'abrir'):
 *   MODO_ATUADOR=true  -> RELE + LED verde + BUZZER
 *   MODO_ATUADOR=false -> apenas Serial/pagina ("so tela")
 *
 * >>> INSEGURO DE PROPOSITO (HTTP sem TLS, senha padrao, MQTT sem auth). <<<
 * Rede isolada, apenas contra o proprio dispositivo do grupo.
 *
 * -------------------------------------------------------------------------
 * DEPENDENCIAS (Arduino IDE):
 *   - Placa "ESP32 Dev Module" (core arduino-esp32)
 *   - PubSubClient (Nick O'Leary)                 -> MQTT
 *   - DHT sensor library (Adafruit) + Adafruit Unified Sensor  -> DHT22
 *   (WiFi.h e WebServer.h vem com o core do ESP32)
 *
 * RESSALVA: APIs mudam por versao do core/bibliotecas. Este e um ESQUELETO
 * a compilar/validar no SEU ambiente (nao foi compilado aqui). A leitura do
 * NTC depende do seu divisor e do coeficiente Beta — calibre com o seu sensor.
 * =========================================================================
 */

#include <WiFi.h>
#include <WebServer.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <math.h>

// ===================== CONFIGURACAO (PREENCHER) =====================
const char* WIFI_SSID   = "<SSID_REDE_ISOLADA>";
const char* WIFI_PASS   = "<SENHA_WIFI>";

const char* MQTT_BROKER = "<IP_KALI>";     // broker mosquitto roda na Kali
const int   MQTT_PORT   = 1883;            // 1883 = sem TLS (demo)
const char* TOPIC_CMD   = "casa/porta";        // recebe comandos
const char* TOPIC_TEL   = "casa/telemetria";   // publica temp/umid
const char* MQTT_CLIENTID = "fechadura-g6";

const char* PAINEL_USER = "admin";
const char* PAINEL_PASS = "admin123";      // padrao/fraca de proposito

#define MODO_ATUADOR true                  // true=fisico, false=so tela

// ---- Pinos digitais/atuadores ----
const int PIN_RELE   = 26;   // "trava"
const int PIN_LED_V  = 25;   // verde (liberado)
const int PIN_LED_R  = 33;   // vermelho (negado) [opcional]
const int PIN_BUZZER = 27;   // buzzer ativo
const bool RELE_ATIVO_EM_LOW = true;       // muitos reles sao active-low

// ---- Sensores ----
const int  PIN_DHT   = 4;    // dado do DHT22
#define    DHT_TIPO    DHT22
const int  PIN_NTC   = 34;   // ADC1_CH6 (entrada analogica; use 32-39)

// Divisor do NTC: 3V3 --[ NTC ]--(PIN_NTC)--[ R_FIXO=10k ]-- GND
const float NTC_R_FIXO   = 10000.0;  // resistor fixo do divisor (10k)
const float NTC_R_NOMINAL= 10000.0;  // resistencia do NTC a 25C (10k)
const float NTC_BETA     = 3950.0;   // coeficiente Beta (tipico; calibrar)
const float NTC_T_NOMINAL= 25.0;     // temperatura nominal (C)
const float ADC_MAX      = 4095.0;   // ADC de 12 bits no ESP32

const unsigned long AUTO_RELOCK_MS = 8000;
const unsigned long TELEMETRIA_MS  = 3000; // publica a cada 3s
// ===================================================================

WebServer server(80);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DHT dht(PIN_DHT, DHT_TIPO);

bool          portaAberta = false;
unsigned long abertaDesde = 0;
unsigned long ultimaTel   = 0;
String        ultimoEvento = "Dispositivo iniciado (trancado)";
String        ultimaTentativa = "-";
unsigned long cntHttp = 0, cntFalhas = 0, cntInj = 0;
float tDht = NAN, uDht = NAN, tNtc = NAN;

// ---------------------- Atuadores ----------------------
void aplicarRele(bool aberto) {
#if MODO_ATUADOR
  int nAberto = RELE_ATIVO_EM_LOW ? LOW : HIGH;
  int nFechado= RELE_ATIVO_EM_LOW ? HIGH : LOW;
  digitalWrite(PIN_RELE, aberto ? nAberto : nFechado);
  digitalWrite(PIN_LED_V, aberto ? HIGH : LOW);
  digitalWrite(PIN_LED_R, aberto ? LOW  : HIGH);
  if (aberto) { digitalWrite(PIN_BUZZER, HIGH); delay(120); digitalWrite(PIN_BUZZER, LOW); }
#endif
}
void abrirPorta(const String& origem) {
  portaAberta = true; abertaDesde = millis();
  ultimoEvento = "ACESSO LIBERADO via " + origem;
  Serial.println("\n===== PORTA ABERTA =====\n" + ultimoEvento);
  aplicarRele(true);
}
void trancarPorta(const String& motivo) {
  portaAberta = false; ultimoEvento = motivo;
  Serial.println("\n----- PORTA TRANCADA -----\n" + motivo);
  aplicarRele(false);
}
void negarAcesso(const String& origem) {
  cntFalhas++; ultimoEvento = "ACESSO NEGADO via " + origem;
  Serial.println(ultimoEvento);
#if MODO_ATUADOR
  digitalWrite(PIN_LED_R, HIGH);
  digitalWrite(PIN_BUZZER, HIGH); delay(60); digitalWrite(PIN_BUZZER, LOW);
#endif
}

// ---------------------- Sensores ----------------------
float lerNtcC() {
  int adc = analogRead(PIN_NTC);
  if (adc <= 0 || adc >= (int)ADC_MAX) return NAN;
  // tensao -> resistencia do NTC (divisor com R_FIXO para GND)
  float rNtc = NTC_R_FIXO * ( (ADC_MAX / (float)adc) - 1.0 );
  // equacao Beta -> Kelvin -> Celsius
  float tK = 1.0 / ( (1.0/(NTC_T_NOMINAL+273.15)) +
                     (1.0/NTC_BETA) * log(rNtc/NTC_R_NOMINAL) );
  return tK - 273.15;
}
void lerSensores() {
  float t = dht.readTemperature();
  float u = dht.readHumidity();
  if (!isnan(t)) tDht = t;
  if (!isnan(u)) uDht = u;
  float n = lerNtcC();
  if (!isnan(n)) tNtc = n;
}

// ---------------------- Painel web ----------------------
String pagina() {
  String estado = portaAberta ? "ABERTA" : "TRANCADA";
  String h = "<!DOCTYPE html><html lang='pt-BR'><head><meta charset='UTF-8'>";
  h += "<meta http-equiv='refresh' content='2'>";  // atualiza sozinho (leve)
  h += "<title>Camera IoT</title></head><body style='font-family:sans-serif;max-width:520px;margin:32px auto'>";
  h += "<h1>Painel da Camera IoT</h1>";
  h += "<p>Estado: <b>" + estado + "</b></p>";
  h += "<p style='color:#555'>" + ultimoEvento + "</p>";
  h += "<p>DHT22: <b>" + String(tDht,1) + " C</b> / <b>" + String(uDht,1) + " %</b>";
  h += " &nbsp; NTC: <b>" + String(tNtc,1) + " C</b></p>";
  h += "<p>Tentativas HTTP: " + String(cntHttp) + " | falhas: " + String(cntFalhas)
       + " | injecoes MQTT: " + String(cntInj) + "</p>";
  h += "<p><b>Ultima tentativa:</b> <code>" + ultimaTentativa + "</code></p>";
  h += "<form method='POST' action='/login'>";
  h += "Usuario:<br><input name='usuario' value='admin'><br><br>";
  h += "Senha:<br><input name='senha' value='admin123'><br><br>";
  h += "<button type='submit'>Enviar dados</button></form>";
  h += "<p style='font-size:12px;color:#999'>Demo educacional - HTTP sem TLS.</p>";
  h += "</body></html>";
  return h;
}
void handleRoot()   { server.send(200, "text/html", pagina()); }
void handleStatus() {
  String s = "estado=" + String(portaAberta?"ABERTA":"TRANCADA") + "\n";
  s += "temp_dht=" + String(tDht,1) + "\numid_dht=" + String(uDht,1)
     + "\ntemp_ntc=" + String(tNtc,1) + "\n";
  server.send(200, "text/plain", s);
}
void handleLogin() {
  cntHttp++;
  String u = server.hasArg("usuario") ? server.arg("usuario") : "";
  String p = server.hasArg("senha")   ? server.arg("senha")   : "";
  ultimaTentativa = "HTTP usuario=" + u + " senha=" + p;   // exposto (HTTP)
  if (u == PAINEL_USER && p == PAINEL_PASS) {
    abrirPorta("HTTP/login (usuario=" + u + ")");
    server.send(200, "text/html",
      "<h1 style='color:#2e7d5b'>ACESSO LIBERADO</h1><a href='/'>voltar</a>");
  } else {
    negarAcesso("HTTP/login");
    server.send(401, "text/html",
      "<h1 style='color:#b4442e'>ACESSO NEGADO</h1><p>Senha incorreta.</p><a href='/'>voltar</a>");
  }
}

// ---------------------- MQTT ----------------------
void onMqtt(char* topic, byte* payload, unsigned int len) {
  String msg; for (unsigned int i=0;i<len;i++) msg += (char)payload[i];
  msg.trim(); msg.toLowerCase();
  Serial.printf("[mqtt] %s: %s\n", topic, msg.c_str());
  if (msg=="abrir"||msg=="open"||msg=="1"||msg=="unlock") {
    cntInj++; abrirPorta(String("MQTT (")+topic+")");
  } else if (msg=="fechar"||msg=="close"||msg=="0"||msg=="lock") {
    trancarPorta("Comando MQTT: fechar");
  } else { negarAcesso("MQTT"); }
}
void reconectarMqtt() {
  int t=0;
  while (!mqtt.connected() && t<3) {
    Serial.print("[mqtt] conectando... ");
    if (mqtt.connect(MQTT_CLIENTID)) {  // sem auth (demo)
      Serial.println("ok");
      mqtt.subscribe(TOPIC_CMD);
      Serial.printf("[mqtt] assinando '%s', publicando '%s'\n", TOPIC_CMD, TOPIC_TEL);
    } else { Serial.printf("rc=%d\n", mqtt.state()); t++; delay(1500); }
  }
}
void publicarTelemetria() {
  char buf[96];
  snprintf(buf, sizeof(buf),
    "{\"temp_dht\":%.1f,\"umid_dht\":%.1f,\"temp_ntc\":%.1f}", tDht, uDht, tNtc);
  mqtt.publish(TOPIC_TEL, buf);
}

// ---------------------- setup / loop ----------------------
void setup() {
  Serial.begin(115200); delay(300);
#if MODO_ATUADOR
  pinMode(PIN_RELE,OUTPUT); pinMode(PIN_LED_V,OUTPUT);
  pinMode(PIN_LED_R,OUTPUT); pinMode(PIN_BUZZER,OUTPUT);
#endif
  analogReadResolution(12);         // ADC 12 bits
  dht.begin();
  trancarPorta("Dispositivo iniciado (trancado)");

  Serial.printf("[wifi] conectando em %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA); WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status()!=WL_CONNECTED){ delay(400); Serial.print("."); }
  Serial.print("\n[wifi] IP do dispositivo: "); Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/index.html", handleRoot);
  server.on("/status", handleStatus);
  server.on("/login", HTTP_POST, handleLogin);
  server.begin();
  Serial.println("[http] painel na porta 80 (POST /login)");

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(onMqtt);
  reconectarMqtt();
}
void loop() {
  server.handleClient();
  if (!mqtt.connected()) reconectarMqtt();
  mqtt.loop();

  if (millis() - ultimaTel > TELEMETRIA_MS) {
    ultimaTel = millis();
    lerSensores();
    publicarTelemetria();
  }
  if (portaAberta && AUTO_RELOCK_MS>0 && millis()-abertaDesde > AUTO_RELOCK_MS)
    trancarPorta("Trava fechada automaticamente");
}

/* =========================================================================
 * VIRADA (DEFESA) — versao segura (resumo; validar na sua versao)
 *   1) MQTT sobre TLS:
 *        #include <WiFiClientSecure.h>
 *        WiFiClientSecure sec; sec.setCACert(CA_CERT);
 *        PubSubClient mqtt(sec); mqtt.setServer(MQTT_BROKER, 8883);
 *        mqtt.connect(MQTT_CLIENTID, "iot_user", "<senha>");
 *   2) HTTP -> HTTPS: servir o painel sob TLS (lib de servidor seguro ou proxy).
 *   3) Senha forte: trocar PAINEL_PASS por senha longa e unica.
 * ========================================================================= */
