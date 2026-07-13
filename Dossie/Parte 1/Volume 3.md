
# Volume III — Protocolos, Criptografia e Comunicação Segura

---

# 1. Introdução

Após compreender como o hardware estabelece uma identidade confiável e protege informações sensíveis, surge um novo desafio: como transmitir dados entre dispositivos sem que eles sejam interceptados, alterados ou falsificados?

Em um ecossistema IoT, sensores, atuadores, gateways, servidores e aplicações trocam milhares — ou até milhões — de mensagens diariamente. Essas comunicações podem ocorrer por diferentes meios, como Wi-Fi, Ethernet, Bluetooth Low Energy (BLE), ZigBee, LoRaWAN ou redes celulares (NB-IoT e LTE-M).

Independentemente da tecnologia empregada, três requisitos fundamentais devem ser atendidos:

- **Confidencialidade:** impedir que terceiros leiam os dados transmitidos;
- **Integridade:** garantir que a informação não seja modificada durante o percurso;
- **Autenticidade:** assegurar que remetente e destinatário sejam realmente quem afirmam ser.

Sem esses mecanismos, um invasor poderia capturar comandos destinados a uma fechadura inteligente, modificar leituras de sensores ambientais ou assumir o controle de dispositivos críticos.

Este volume apresenta os principais protocolos de comunicação utilizados em IoT, seus desafios de segurança e os mecanismos criptográficos empregados para proteger essas comunicações.

---

# Objetivos deste volume

Ao final deste capítulo o estudante deverá compreender:

- por que IoT utiliza protocolos específicos;
- funcionamento do MQTT;
- funcionamento do CoAP;
- diferenças entre HTTP e MQTT;
- importância do TLS e DTLS;
- autenticação baseada em certificados;
- gerenciamento de certificados digitais;
- atualizações OTA seguras;
- principais vulnerabilidades associadas aos protocolos de comunicação.

---

# 2. Comunicação em IoT

Ao contrário da computação tradicional, muitos dispositivos IoT possuem limitações severas de processamento, memória e energia.

Essas limitações inviabilizam o uso de protocolos excessivamente complexos.

Por esse motivo surgiram protocolos especializados.

Os principais são:

- MQTT
- CoAP
- DDS
- OPC UA
- AMQP

Cada um foi desenvolvido para cenários específicos.

---

# Exemplo

Imagine um sensor de temperatura alimentado por bateria.

Enviar centenas de cabeçalhos HTTP diariamente desperdiçaria energia.

Nesse cenário, protocolos leves tornam-se muito mais eficientes.

---

# 3. MQTT (Message Queuing Telemetry Transport)

O MQTT é atualmente um dos protocolos mais utilizados em IoT.

Foi criado para ambientes com:

- baixa largura de banda;
- conexões instáveis;
- dispositivos com poucos recursos computacionais.

Seu funcionamento baseia-se no modelo **Publish/Subscribe**.

Ao contrário do modelo Cliente-Servidor tradicional, os dispositivos não enviam mensagens diretamente uns aos outros.

Eles publicam informações em um intermediário denominado **Broker**.

---

## Arquitetura

Sensor

↓

Broker MQTT

↓

Aplicativo

↓

Usuário

---

## Conceitos principais

### Publisher

Responsável por enviar mensagens.

Exemplo:

Sensor de temperatura.

---

### Subscriber

Recebe mensagens publicadas.

Exemplo:

Aplicativo do usuário.

---

### Broker

Servidor responsável por intermediar toda a comunicação.

Exemplos populares:

- Mosquitto
- HiveMQ
- EMQX
- AWS IoT Core
- Azure IoT Hub

---

# QoS (Quality of Service)

O MQTT permite escolher diferentes níveis de confiabilidade.

## QoS 0

Entrega sem confirmação.

Mais rápido.

Menor consumo.

Pode perder mensagens.

---

## QoS 1

Entrega garantida pelo menos uma vez.

Pode haver duplicação.

---

## QoS 2

Entrega exatamente uma vez.

Maior confiabilidade.

Maior consumo de banda.

Maior latência.

---

# Vantagens

- protocolo extremamente leve;
- baixo consumo energético;
- excelente escalabilidade;
- simples implementação.

---

# Limitações

O MQTT, por si só, **não oferece criptografia**.

Também não realiza autenticação forte.

Esses mecanismos precisam ser adicionados externamente.

---

# Atenção

Um erro comum é afirmar que MQTT é um protocolo seguro.

Na realidade, ele apenas define como as mensagens são transportadas.

A segurança depende de mecanismos adicionais, como TLS, autenticação e controle de acesso.

---

# 4. CoAP (Constrained Application Protocol)

O CoAP foi desenvolvido especificamente para dispositivos extremamente limitados.

Seu funcionamento lembra o HTTP.

Entretanto, utiliza UDP em vez de TCP.

Isso reduz:

- consumo energético;
- latência;
- quantidade de mensagens.

---

## Modelo

Cliente

↓

GET

↓

Sensor

↓

Resposta

---

O CoAP também suporta:

- POST
- PUT
- DELETE

Assim como o HTTP.

---

# Segurança

Como utiliza UDP, o CoAP normalmente emprega **DTLS (Datagram TLS)**.

Em cenários muito restritos também pode utilizar **OSCORE**, que protege apenas o conteúdo da mensagem, mantendo parte do cabeçalho visível para facilitar o roteamento.

---

# Curiosidade

Diversos projetos de cidades inteligentes utilizam CoAP devido ao seu baixo consumo de energia.

---

# 5. OPC UA

Embora menos comum em IoT residencial, o OPC UA tornou-se um dos principais protocolos da IIoT.

Foi desenvolvido para substituir protocolos industriais inseguros.

Suporta:

- autenticação;
- criptografia;
- assinatura digital;
- controle de acesso;
- comunicação entre diferentes fabricantes.

Atualmente é considerado um dos pilares da Indústria 4.0.

---

# 6. Protocolos industriais legados

Muitos equipamentos antigos utilizam protocolos criados décadas atrás.

Entre eles:

- Modbus
- DNP3
- Profibus
- BACnet

Esses protocolos priorizavam disponibilidade.

Não havia preocupação com:

- autenticação;
- criptografia;
- confidencialidade.

Consequentemente, diversos ataques modernos exploram exatamente essas limitações.

---

# Exemplo

PLC

↓

Modbus TCP

↓

Sem autenticação

↓

Atacante envia comando

↓

PLC executa

Esse cenário demonstra por que protocolos legados precisam ser encapsulados em conexões seguras.

---

# 7. TLS (Transport Layer Security)

O TLS é atualmente o principal mecanismo utilizado para proteger comunicações sobre TCP.

Sua função é estabelecer um canal seguro.

Durante o handshake ocorrem diversas etapas.

Cliente

↓

Servidor

↓

Troca de certificados

↓

Validação

↓

Negociação de chaves

↓

Canal criptografado

↓

Comunicação segura

---

# O que o TLS garante?

- confidencialidade;
- integridade;
- autenticação;
- proteção contra ataques Man-in-the-Middle.

---

# TLS 1.3

A versão mais recente reduziu significativamente:

- tempo de conexão;
- número de mensagens do handshake;
- algoritmos inseguros.

Por isso tornou-se altamente recomendada para aplicações IoT modernas.

---

# 8. DTLS

Nem todos os protocolos utilizam TCP.

Quando a comunicação ocorre via UDP, utiliza-se DTLS.

Ele fornece garantias semelhantes ao TLS.

Entretanto, foi adaptado para lidar com perda de pacotes.

É amplamente utilizado em:

- CoAP;
- sensores ambientais;
- dispositivos alimentados por bateria.

---

# 9. OSCORE

OSCORE significa:

Object Security for Constrained RESTful Environments.

Diferentemente do TLS, ele protege diretamente o conteúdo da mensagem.

Isso permite que proxies e roteadores continuem encaminhando pacotes sem necessidade de descriptografá-los.

É especialmente útil em redes extremamente limitadas.

---

# 10. PKI (Public Key Infrastructure)

Toda autenticação baseada em certificados depende de uma infraestrutura denominada PKI.

Ela é composta por:

- Autoridade Certificadora (CA);
- certificados digitais;
- chaves públicas;
- chaves privadas;
- listas de revogação.

Essa infraestrutura permite verificar matematicamente a identidade dos dispositivos.

---

## Analogia

Imagine um cartório emitindo documentos.

A Autoridade Certificadora desempenha função semelhante.

Ela garante que determinado certificado pertence realmente ao dispositivo.

---

# Certificados X.509

Os certificados normalmente armazenam:

- identidade do dispositivo;
- chave pública;
- período de validade;
- assinatura da autoridade certificadora.

Quando um dispositivo conecta-se ao servidor, esse certificado é apresentado.

O servidor valida sua autenticidade antes de permitir qualquer comunicação.

---

# 11. Autenticação Mútua (mTLS)

Na navegação comum da Internet, apenas o servidor apresenta um certificado.

Na IoT isso normalmente não é suficiente.

Em ambientes industriais utiliza-se **Mutual TLS**.

Servidor

↓

Valida dispositivo

↓

Dispositivo

↓

Valida servidor

Ambos precisam provar sua identidade.

Essa abordagem reduz significativamente ataques de falsificação.

---

# 12. Atualizações OTA (Over-The-Air)

Manter dispositivos atualizados é essencial.

Entretanto, atualizar firmware pela Internet também representa um risco.

Caso um atacante consiga substituir o arquivo de atualização, poderá instalar código malicioso.

Por isso atualizações OTA modernas utilizam:

- assinatura digital;
- verificação criptográfica;
- Secure Boot;
- rollback protegido;
- canais criptografados.

---

# Fluxo seguro

Servidor

↓

Firmware assinado

↓

TLS

↓

Dispositivo

↓

Verifica assinatura

↓

Instala atualização

↓

Reinicia

---

# Curiosidade

Alguns fabricantes mantêm duas partições de firmware.

Caso a atualização falhe, o dispositivo retorna automaticamente à versão anterior.

---

# 13. Vulnerabilidades comuns

Mesmo utilizando protocolos modernos, diversos erros continuam sendo encontrados.

Entre eles:

- certificados expirados;
- senhas padrão;
- autenticação desabilitada;
- TLS mal configurado;
- uso de algoritmos criptográficos obsoletos;
- ausência de validação do certificado.

Esses problemas frequentemente decorrem de implementações inadequadas, e não dos protocolos em si.

---

# Na prática

Diversas câmeras IP antigas aceitam conexões HTTPS.

Entretanto, não verificam corretamente o certificado apresentado pelo servidor.

Isso permite ataques Man-in-the-Middle.

---

# Resumo do Volume

Neste capítulo foram apresentados os principais protocolos utilizados na comunicação entre dispositivos IoT.

Estudamos MQTT, CoAP, OPC UA, TLS, DTLS, OSCORE e os conceitos fundamentais de PKI, certificados digitais e autenticação mútua.

Também discutimos os desafios relacionados às atualizações OTA e as vulnerabilidades frequentemente encontradas em implementações reais.

Esses mecanismos são responsáveis por garantir que as informações trafeguem de forma segura entre dispositivos, gateways e serviços em nuvem, constituindo um dos pilares da segurança em sistemas IoT modernos.

---

# Perguntas para discussão

1. MQTT deveria oferecer criptografia nativamente?

2. Em quais situações CoAP é mais adequado que MQTT?

3. Um certificado digital expirado representa um risco de segurança?

4. Por que atualizações OTA precisam ser assinadas digitalmente?

5. É possível confiar apenas em senhas para autenticar dispositivos IoT?

---

# Possíveis perguntas do professor

**Qual a principal diferença entre MQTT e HTTP?**

**Por que o MQTT depende de TLS para garantir confidencialidade?**

**Quando utilizar DTLS em vez de TLS?**

**Qual a vantagem do Mutual TLS em dispositivos IoT?**

**Como um certificado digital impede ataques de spoofing?**

**Por que atualizações OTA inseguras representam uma ameaça tão grave?**

---

# Leituras recomendadas

- MQTT Version 5.0 Specification (OASIS)
- RFC 8446 — TLS 1.3
- RFC 7252 — CoAP
- RFC 8613 — OSCORE
- OPC Foundation — OPC UA Specifications
- NIST SP 800-52

---

# Encerramento da Parte I

Ao longo dos três primeiros volumes foram apresentados os fundamentos que sustentam a segurança em dispositivos IoT:

- a evolução da Internet das Coisas e seus desafios;
- os mecanismos de segurança implementados diretamente no hardware, como Root of Trust, Secure Boot e Flash Encryption;
- os principais protocolos de comunicação e as tecnologias criptográficas responsáveis por proteger os dados durante sua transmissão.

Esses conhecimentos formam a base necessária para compreender, na próxima parte, como essas tecnologias são aplicadas em ambientes industriais, quais ataques reais exploram suas vulnerabilidades e quais estratégias podem ser adotadas para proteger infraestruturas críticas e dispositivos conectados.

**Continua na Parte II — Volume IV: Segurança Industrial (IIoT), Arquiteturas Purdue e Segmentação de Redes.**
