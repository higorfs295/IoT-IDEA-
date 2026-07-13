
# Parte II

# Volume IV — Segurança Industrial (IIoT), Arquitetura Purdue e Segmentação de Redes

---

# 1. Introdução

Até este momento, os capítulos abordaram a segurança aplicada principalmente aos dispositivos IoT convencionais, como câmeras IP, sensores ambientais e dispositivos residenciais conectados.

Entretanto, existe um ramo da Internet das Coisas onde uma falha de segurança pode gerar impactos muito maiores: a **Industrial Internet of Things (IIoT)**.

Na IIoT, sensores e atuadores controlam processos físicos essenciais para a sociedade.

Alguns exemplos incluem:

- usinas hidrelétricas;
- refinarias;
- linhas de produção;
- hospitais;
- sistemas ferroviários;
- aeroportos;
- redes elétricas;
- tratamento de água;
- plataformas de petróleo.

Nesses ambientes, o objetivo da segurança deixa de ser apenas proteger dados.

Ela passa a proteger pessoas, patrimônio, meio ambiente e continuidade operacional.

Por esse motivo, diversas arquiteturas específicas foram desenvolvidas para separar sistemas críticos das redes corporativas e da Internet.

---

# Objetivos deste volume

Ao final deste capítulo o estudante deverá compreender:

- diferenças entre TI e OT;
- conceitos de ICS;
- funcionamento de sistemas SCADA;
- arquitetura Purdue;
- segmentação de redes industriais;
- zonas e conduítes;
- protocolos industriais;
- importância da disponibilidade em ambientes críticos.

---

# 2. TI versus OT

Um dos conceitos mais importantes da IIoT consiste em compreender que **Tecnologia da Informação (IT)** e **Tecnologia Operacional (OT)** possuem objetivos bastante diferentes.

## Tecnologia da Informação (IT)

Responsável pelo processamento de informações corporativas.

Exemplos:

- servidores;
- notebooks;
- sistemas ERP;
- bancos de dados;
- e-mails;
- aplicações web.

Na TI, normalmente a prioridade é:

Confidencialidade

↓

Integridade

↓

Disponibilidade

---

## Tecnologia Operacional (OT)

Responsável pelo controle de processos físicos.

Exemplos:

- motores;
- bombas;
- esteiras;
- turbinas;
- válvulas;
- robôs industriais.

Na OT, a prioridade normalmente é invertida.

Disponibilidade

↓

Integridade

↓

Confidencialidade

---

# Exemplo

Perder acesso a um servidor de e-mail durante alguns minutos normalmente gera apenas atraso.

Já perder comunicação com um sistema responsável por controlar a pressão de uma caldeira pode resultar em acidentes graves.

---

# Curiosidade

Muitos equipamentos industriais permanecem em funcionamento durante vinte ou trinta anos.

Isso significa que ainda existem dispositivos utilizando sistemas operacionais e protocolos desenvolvidos décadas atrás.

---

# 3. O que são ICS?

ICS significa **Industrial Control Systems**.

Esse termo engloba diversos sistemas responsáveis pelo controle de processos industriais.

Entre eles:

- SCADA;
- PLC;
- RTU;
- DCS;
- IED.

Cada componente possui responsabilidades específicas.

---

# PLC (Programmable Logic Controller)

Também conhecido como CLP.

É um computador industrial extremamente robusto.

Sua função consiste em executar lógica de controle.

Exemplo:

Sensor detecta objeto

↓

PLC recebe sinal

↓

Motor inicia movimento

↓

Esteira transporta peça

↓

Sensor confirma posicionamento

↓

PLC encerra operação

Esse ciclo pode ocorrer milhares de vezes por hora.

---

# RTU (Remote Terminal Unit)

As RTUs normalmente são utilizadas quando os equipamentos estão distribuídos geograficamente.

Exemplos:

- subestações elétricas;
- oleodutos;
- estações meteorológicas;
- sistemas de irrigação.

Sua principal função consiste em coletar informações e transmiti-las para um centro de controle.

---

# DCS (Distributed Control System)

Muito utilizado em refinarias e grandes indústrias químicas.

Ao invés de um único controlador central, diversos controladores trabalham de forma distribuída.

Isso aumenta:

- disponibilidade;
- redundância;
- escalabilidade.

---

# IED (Intelligent Electronic Device)

Equipamentos inteligentes encontrados principalmente no setor elétrico.

Exemplos:

- relés digitais;
- medidores inteligentes;
- controladores de proteção.

---

# 4. O que é SCADA?

SCADA significa:

**Supervisory Control And Data Acquisition**

É um sistema responsável por:

- supervisionar processos;
- armazenar históricos;
- emitir alarmes;
- controlar equipamentos remotamente.

Normalmente sua arquitetura possui os seguintes componentes:

Sensores

↓

PLC

↓

Rede Industrial

↓

Servidor SCADA

↓

Historian

↓

Operador

---

# Historian

O Historian é um banco de dados especializado em séries temporais.

Armazena continuamente informações como:

- temperatura;
- pressão;
- corrente elétrica;
- tensão;
- vazão;
- velocidade.

Esses dados permitem:

- identificar falhas;
- gerar gráficos;
- prever manutenção;
- realizar auditorias.

---

# Na prática

Diversos sistemas SCADA utilizam plataformas como:

- Ignition
- WinCC
- Elipse E3
- FactoryTalk
- AVEVA

---

# 5. A convergência entre TI e OT

Durante décadas, redes industriais permaneceram completamente isoladas.

Esse conceito era conhecido como **Air Gap**.

A ideia era simples.

Se a rede não estivesse conectada à Internet, ela seria naturalmente segura.

Entretanto, a Indústria 4.0 modificou completamente esse cenário.

Hoje é comum que gestores desejem visualizar indicadores da produção diretamente em seus smartphones.

Isso exige integração entre:

Rede Industrial

↓

Rede Corporativa

↓

Cloud

↓

Aplicativos

Embora extremamente útil, essa integração cria novos caminhos para ataques.

---

# Exemplo

Funcionário recebe e-mail malicioso

↓

Notebook corporativo infectado

↓

Malware alcança rede OT

↓

PLC comprometido

↓

Linha de produção interrompida

---

# 6. Arquitetura Purdue

Para reduzir esses riscos surgiu o **Modelo Purdue**.

Ele organiza a infraestrutura industrial em diferentes níveis.

---

## Nível 0

Processo físico.

Exemplos:

- motores;
- sensores;
- válvulas;
- atuadores.

---

## Nível 1

Controladores.

Exemplos:

- PLC;
- RTU;
- IED.

---

## Nível 2

Supervisão.

Exemplos:

- SCADA;
- IHMs;
- estações de operação.

---

## Nível 3

Gerenciamento da produção.

Exemplos:

- MES;
- servidores industriais;
- Historian.

---

## Nível 3.5

DMZ Industrial.

Camada intermediária.

Impede comunicação direta entre fábrica e Internet.

---

## Nível 4

Rede corporativa.

ERP

Servidores

Correio eletrônico

Active Directory

---

## Nível 5

Internet

Cloud

Serviços externos

---

# Importância da DMZ Industrial

A DMZ atua como uma zona de isolamento.

Ela impede que um invasor consiga acessar diretamente um PLC a partir da Internet.

Todo acesso deve passar por mecanismos adicionais de autenticação, inspeção e controle.

---

# Atenção

Uma boa arquitetura nunca permite comunicação direta entre um PLC e a Internet pública.

---

# 7. Segmentação de Redes

Um dos princípios fundamentais da segurança industrial consiste na segmentação.

Nem todos os dispositivos devem conversar entre si.

A rede é dividida em pequenas zonas.

Cada zona possui regras específicas.

Exemplo:

Rede administrativa

↓

Firewall

↓

DMZ

↓

Firewall Industrial

↓

Rede SCADA

↓

Firewall

↓

Rede PLC

Caso um computador seja comprometido, o atacante encontrará diversas barreiras antes de alcançar os controladores.

---

# Firewalls Industriais

Embora semelhantes aos firewalls tradicionais, esses equipamentos compreendem protocolos industriais.

Exemplos:

- Modbus
- DNP3
- EtherNet/IP
- PROFINET

Isso permite identificar comandos potencialmente perigosos.

---

# Curiosidade

Diversos firewalls industriais conseguem identificar tentativas de escrita em registradores Modbus e bloqueá-las automaticamente.

---

# 8. Protocolos Industriais

Grande parte da infraestrutura industrial ainda utiliza protocolos antigos.

Entre eles:

- Modbus
- DNP3
- PROFIBUS
- EtherNet/IP
- HART

Muitos desses protocolos foram desenvolvidos quando praticamente não existiam ameaças cibernéticas.

Consequentemente:

- não possuem autenticação;
- não possuem criptografia;
- não verificam integridade.

---

# Exemplo

Controlador

↓

Recebe comando Modbus

↓

Não verifica identidade

↓

Executa imediatamente

Essa característica representa um dos maiores desafios da cibersegurança industrial.

---

# 9. ISA/IEC 62443

A série ISA/IEC 62443 é considerada atualmente uma das principais normas internacionais para segurança de sistemas industriais.

Ela estabelece diretrizes para:

- fabricantes;
- integradores;
- operadores;
- desenvolvedores.

Entre seus princípios destacam-se:

- Defense in Depth;
- segmentação;
- autenticação;
- gerenciamento de riscos;
- atualização segura;
- monitoramento contínuo.

---

# 10. Disponibilidade acima de tudo

Na computação tradicional, um servidor pode ser reiniciado durante a madrugada.

Na indústria isso nem sempre é possível.

Muitos processos funcionam continuamente.

Exemplos:

- refinarias;
- siderúrgicas;
- hospitais;
- usinas.

Uma interrupção inesperada pode causar:

- prejuízos milionários;
- danos ambientais;
- acidentes.

Por isso atualizações de segurança frequentemente precisam ser cuidadosamente planejadas.

---

# Exemplo Industrial

Imagine uma usina hidrelétrica.

Um sensor mede continuamente o nível da água.

↓

PLC calcula abertura das comportas.

↓

Atuadores movimentam as comportas.

↓

SCADA acompanha toda operação.

↓

Historian registra milhares de medições.

↓

Centro de operação supervisiona o processo.

Caso um invasor modifique as leituras do sensor, todas as decisões seguintes poderão ser comprometidas.

Esse exemplo demonstra como um simples dispositivo IoT pode influenciar um sistema inteiro.

---

# Resumo do Volume

Neste capítulo foram apresentados os principais conceitos relacionados à segurança em ambientes industriais.

Discutimos as diferenças entre TI e OT, os componentes dos sistemas ICS, o funcionamento de arquiteturas SCADA e a importância do Modelo Purdue como estratégia de segmentação.

Também foram abordados os desafios impostos pelos protocolos industriais legados e pelas exigências de disponibilidade contínua presentes em infraestruturas críticas.

Esses conceitos constituem a base para compreender os ataques reais estudados no próximo volume.

---

# Perguntas para discussão

1. O modelo Air Gap ainda é suficiente para proteger ambientes industriais?

2. Por que disponibilidade possui prioridade sobre confidencialidade em OT?

3. Vale a pena substituir imediatamente todos os protocolos industriais antigos?

4. Como a segmentação reduz o impacto de um ataque?

5. Quais seriam as consequências da conexão direta entre um PLC e a Internet?

---

# Possíveis perguntas do professor

**Qual a principal diferença entre TI e OT?**

**Por que o Modelo Purdue continua sendo amplamente utilizado?**

**Qual a função da DMZ Industrial?**

**O que diferencia um firewall industrial de um firewall convencional?**

**Por que protocolos como Modbus ainda são utilizados mesmo apresentando limitações de segurança?**

---

# Leituras recomendadas

- ISA/IEC 62443 Series
- NIST SP 800-82 — Guide to Industrial Control Systems Security
- MITRE ATT&CK for ICS
- Security Engineering — Ross Anderson

---

**Continua no Volume V — Ataques Reais, Botnets, Vulnerabilidades e Modelagem de Ameaças para Dispositivos IoT.**
