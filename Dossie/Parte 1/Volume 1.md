# Dossiê Técnico — Segurança da Informação em Dispositivos IoT

## Material de Apoio para Seminário, Monitoria e Sala de Aula Invertida

> **Tema:** Segurança da Informação em Dispositivos IoT
>
> **Contexto:** Análise de vulnerabilidades comuns, como botnets, e modelagem de ameaças para dispositivos domésticos conectados.
>
> **Objetivo do material:** Fornecer uma base teórica e prática para apresentações, monitorias, discussões em sala e desenvolvimento de projetos relacionados à Segurança em Internet das Coisas (IoT).

---

# Parte I

# Volume I — Fundamentos da Segurança em IoT e IIoT

---

# 1. Introdução

A Internet das Coisas (Internet of Things — IoT) representa uma das maiores transformações tecnológicas das últimas décadas. Seu objetivo é conectar objetos físicos à Internet, permitindo que sensores, atuadores, dispositivos embarcados e equipamentos inteligentes coletem dados, troquem informações e executem ações automaticamente.

Embora a ideia pareça simples, seu impacto é profundo. Hoje, lâmpadas, fechaduras, câmeras de vigilância, geladeiras, veículos, sensores agrícolas, equipamentos hospitalares e máquinas industriais compartilham dados continuamente com servidores locais e serviços em nuvem.

Essa conectividade trouxe inúmeros benefícios:

- automação residencial;
- cidades inteligentes;
- monitoramento ambiental;
- agricultura de precisão;
- medicina remota;
- indústria 4.0;
- logística inteligente;
- veículos conectados.

Entretanto, quanto maior a conectividade, maior também é a superfície de ataque.

Na computação tradicional, uma invasão normalmente resulta em perda de informações, indisponibilidade de serviços ou vazamento de dados.

Na IoT, os impactos podem extrapolar o ambiente digital.

Um invasor pode controlar uma fechadura inteligente, desligar equipamentos hospitalares, manipular sensores industriais ou assumir o controle de milhares de câmeras conectadas para formar uma botnet.

Por esse motivo, segurança em IoT não é apenas um problema de tecnologia da informação (TI).

Ela envolve diretamente segurança física, engenharia eletrônica, sistemas embarcados, computação distribuída e sistemas ciberfísicos (Cyber-Physical Systems — CPS).

---

# Objetivos deste volume

Ao final deste capítulo o estudante deverá compreender:

- o que caracteriza um sistema IoT;
- diferenças entre IoT e IIoT;
- como ocorre o fluxo de informações;
- por que dispositivos IoT possuem desafios de segurança diferentes da computação convencional;
- principais arquiteturas utilizadas atualmente;
- conceitos fundamentais que servirão de base para todos os próximos volumes.

---

# 2. O que é Internet das Coisas?

A Internet das Coisas consiste em um ecossistema formado por dispositivos físicos capazes de perceber informações do ambiente, processar dados e comunicar-se utilizando protocolos de rede.

Esses dispositivos normalmente possuem:

- sensores;
- atuadores;
- microcontroladores;
- memória;
- interfaces de comunicação;
- firmware embarcado.

Ao contrário de computadores tradicionais, grande parte desses equipamentos executa apenas uma função específica.

Exemplos:

- medir temperatura;
- detectar movimento;
- abrir uma porta;
- controlar iluminação;
- monitorar pressão;
- registrar consumo energético.

Essa especialização permite reduzir consumo de energia, custo e tamanho do hardware.

Em contrapartida, limita significativamente a capacidade computacional disponível para implementar mecanismos avançados de segurança.

---

## Exemplo prático

Uma lâmpada inteligente normalmente possui:

Sensor de estado

↓

Microcontrolador ESP32

↓

Módulo Wi-Fi

↓

Firmware

↓

Aplicativo móvel

↓

Servidor em nuvem

↓

Usuário

Mesmo uma ação aparentemente simples, como acender uma lâmpada utilizando um smartphone, envolve diversos componentes computacionais e múltiplas conexões de rede.

Cada uma dessas conexões representa um possível ponto de ataque.

---

# 3. Evolução Histórica

A IoT não surgiu de forma repentina.

Sua evolução pode ser dividida em diferentes fases.

## Primeira geração

Décadas de 1980 e 1990.

Os dispositivos eram isolados.

Sensores apenas coletavam dados localmente.

Não havia comunicação com a Internet.

---

## Segunda geração

Início dos anos 2000.

Popularização do Wi-Fi.

Redes Ethernet mais acessíveis.

Surgimento de sistemas M2M (Machine-to-Machine).

Equipamentos passaram a trocar dados automaticamente.

---

## Terceira geração

2010 em diante.

Popularização dos smartphones.

Serviços em nuvem.

Protocolos leves.

ESP8266.

Arduino.

Raspberry Pi.

A IoT tornou-se acessível para consumidores.

---

## Quarta geração

Atualmente.

Edge Computing.

Inteligência Artificial embarcada.

5G.

Digital Twins.

Arquiteturas Zero Trust.

Computação distribuída.

Dispositivos passaram a tomar decisões localmente.

---

# Curiosidade

Estima-se que existam dezenas de bilhões de dispositivos IoT em operação no mundo.

O número cresce continuamente devido à redução do custo de sensores e microcontroladores.

Isso significa que a superfície global de ataque cresce diariamente.

---

# 4. IoT versus IIoT

Um erro comum é utilizar os termos como sinônimos.

Embora relacionados, eles possuem objetivos bastante diferentes.

## IoT (Internet of Things)

Voltada principalmente ao consumidor.

Exemplos:

- Smart TVs;
- relógios inteligentes;
- aspiradores robóticos;
- câmeras IP;
- tomadas inteligentes;
- assistentes virtuais.

O foco normalmente é:

- conforto;
- automação;
- entretenimento;
- economia de energia.

---

## IIoT (Industrial Internet of Things)

Aplicação em ambientes industriais.

Exemplos:

- sensores de vibração;
- CLPs (PLCs);
- robôs industriais;
- linhas de produção;
- refinarias;
- usinas hidrelétricas;
- subestações elétricas.

O foco passa a ser:

- disponibilidade;
- confiabilidade;
- previsibilidade;
- segurança operacional;
- redução de falhas.

Uma falha em uma residência normalmente causa inconveniência.

Uma falha em uma refinaria pode causar acidentes graves e prejuízos milionários.

Por esse motivo, a IIoT possui requisitos de segurança significativamente mais rigorosos.

---

# Comparação

| IoT | IIoT |
|------|-------|
| Consumidor | Ambiente industrial |
| Prioriza conforto | Prioriza disponibilidade |
| Equipamentos baratos | Equipamentos críticos |
| Atualizações frequentes | Mudanças controladas |
| Vida útil de poucos anos | Vida útil superior a décadas |

---

# 5. Sistemas Ciberfísicos (Cyber-Physical Systems)

Um sistema ciberfísico integra elementos computacionais com processos físicos.

Nele, software e hardware interagem continuamente com o ambiente.

Exemplo:

Sensor de temperatura

↓

Controlador

↓

Atuador

↓

Motor

↓

Ambiente físico

↓

Novo valor de temperatura

↓

Sensor

↓

Controlador

Esse ciclo ocorre continuamente.

Diferentemente de aplicações tradicionais, erros computacionais possuem consequências físicas.

Um sensor comprometido pode induzir decisões incorretas.

Isso pode resultar em:

- superaquecimento;
- explosões;
- desperdício energético;
- acidentes industriais.

Por isso, segurança em CPS envolve tanto cibersegurança quanto segurança funcional (Safety).

---

# Atenção

Security e Safety não significam a mesma coisa.

Security refere-se à proteção contra ataques intencionais.

Safety refere-se à prevenção de acidentes, mesmo na ausência de ataques.

Na IIoT, ambos devem coexistir.

---

# 6. Arquitetura Geral de um Sistema IoT

Embora existam inúmeras variações, a maioria dos sistemas IoT segue uma arquitetura semelhante.

Sensores

↓

Microcontrolador

↓

Rede Local

↓

Gateway

↓

Internet

↓

Servidor

↓

Banco de Dados

↓

Aplicação

↓

Usuário

Cada camada possui responsabilidades específicas.

Quanto maior o número de componentes, maior também a superfície de ataque.

---

# 7. Edge Computing

Historicamente, todos os dados eram enviados diretamente para a nuvem.

Essa abordagem apresentou limitações importantes.

Problemas:

- alta latência;
- consumo elevado de banda;
- dependência da Internet;
- custos crescentes.

Edge Computing surgiu para resolver essas limitações.

O processamento passa a ocorrer próximo da origem dos dados.

Exemplo:

Uma câmera inteligente pode identificar uma pessoa localmente.

Em vez de enviar horas de vídeo para a nuvem, transmite apenas:

"Pessoa detectada às 15h42."

Essa abordagem reduz:

- tráfego;
- tempo de resposta;
- exposição de dados sensíveis.

Além disso, melhora significativamente a privacidade.

---

# Fog Computing

Entre Edge e Cloud surgiu uma camada intermediária denominada Fog Computing.

Nela, um Gateway agrega informações provenientes de dezenas ou centenas de dispositivos.

Ele realiza:

- autenticação;
- filtragem;
- compressão;
- agregação;
- criptografia;
- análise preliminar.

Somente informações relevantes seguem para a nuvem.

---

# Cloud Computing

A nuvem continua desempenhando papel essencial.

Ela fornece:

- armazenamento;
- análise histórica;
- aprendizado de máquina;
- gerenciamento remoto;
- atualização OTA;
- dashboards;
- integração entre dispositivos.

Entretanto, enviar absolutamente tudo para a nuvem já não é considerado uma boa prática.

---

# Exemplo residencial

Uma câmera de segurança pode:

Detectar movimento

↓

Executar IA local

↓

Ignorar folhas balançando

↓

Identificar pessoa

↓

Enviar apenas um alerta

↓

Gravar vídeo apenas quando necessário

Esse modelo reduz custos e melhora a privacidade.

---

# 8. Por que IoT é mais difícil de proteger?

Ao contrário de servidores corporativos, dispositivos IoT apresentam diversas limitações.

Entre elas:

- pouca memória RAM;
- armazenamento reduzido;
- processadores modestos;
- alimentação por bateria;
- conectividade intermitente;
- exposição física.

Além disso, muitos dispositivos permanecem instalados durante anos sem receber atualizações.

Outro desafio importante é o custo.

Adicionar mecanismos robustos de segurança aumenta:

- consumo energético;
- memória utilizada;
- custo do hardware;
- tempo de desenvolvimento.

Por isso, muitos fabricantes acabam negligenciando requisitos básicos de segurança.

---

# Na prática

Uma câmera IP de baixo custo frequentemente utiliza:

- firmware desatualizado;
- senha padrão;
- interface web insegura;
- criptografia inexistente.

Ela pode permanecer vulnerável durante toda sua vida útil.

---

# 9. Modelo de Ameaças

Nenhum sistema pode ser protegido adequadamente sem compreender quais ameaças ele enfrenta.

Esse processo recebe o nome de Threat Modeling.

Modelar ameaças significa responder perguntas como:

- Quem pode atacar?
- Qual o objetivo do atacante?
- Quais recursos ele possui?
- Quais ativos precisam ser protegidos?
- Quais vulnerabilidades existem?
- Qual seria o impacto da exploração?

Entre os modelos mais utilizados destaca-se o STRIDE.

Cada letra representa uma categoria de ameaça:

- Spoofing
- Tampering
- Repudiation
- Information Disclosure
- Denial of Service
- Elevation of Privilege

Esse modelo será aprofundado em volumes posteriores.

---

# Curiosidade

Grandes empresas iniciam a segurança ainda durante o projeto do dispositivo.

Adicionar segurança apenas após o produto estar pronto costuma ser muito mais caro e menos eficiente.

Daí surge o conceito de **Secure by Design**.

---

# Resumo do Volume

Neste primeiro volume foram apresentados os fundamentos necessários para compreender a segurança em dispositivos IoT.

Foram discutidas a evolução histórica da Internet das Coisas, as diferenças entre IoT e IIoT, os sistemas ciberfísicos, as arquiteturas Edge, Fog e Cloud Computing, além dos desafios específicos enfrentados por dispositivos embarcados.

Esses conceitos servirão como base para todos os próximos capítulos, onde serão estudadas as tecnologias de proteção, as principais vulnerabilidades e os mecanismos modernos utilizados para garantir autenticidade, integridade, confidencialidade e disponibilidade dos dispositivos conectados.

---

# Perguntas para discussão

1. Todo dispositivo IoT realmente precisa estar conectado à Internet?

2. Quais riscos surgem quando uma residência possui dezenas de dispositivos inteligentes?

3. É possível garantir segurança absoluta em um dispositivo IoT?

4. Edge Computing melhora apenas o desempenho ou também aumenta a segurança?

5. Por que um ataque a uma câmera IP pode comprometer toda a rede doméstica?

---

# Possíveis perguntas do professor

**O que diferencia IoT de IIoT além do ambiente de aplicação?**

**Por que sistemas ciberfísicos exigem uma abordagem diferente da segurança tradicional?**

**Como Edge Computing contribui para a redução da superfície de ataque?**

**Qual a relação entre disponibilidade e segurança em ambientes industriais?**

**Por que dispositivos embarcados apresentam maiores desafios para implementação de mecanismos criptográficos?**

---

# Leituras recomendadas

- Ross Anderson — *Security Engineering*
- Practical IoT Hacking — No Starch Press
- NIST IR 8259
- NIST SP 800-213
- OWASP IoT Project
- ISA/IEC 62443

---

**Continua no Volume II — Hardware Seguro, Identidade Digital e Raiz de Confiança.**
