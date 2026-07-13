
# Parte III

# Volume VII — Ciclo de Vida Seguro dos Dispositivos IoT

---

# 1. Introdução

Uma das maiores diferenças entre um dispositivo IoT e um software convencional está no seu ciclo de vida.

Enquanto um aplicativo pode ser atualizado diversas vezes ao dia, um dispositivo embarcado pode permanecer em operação durante cinco, dez ou até vinte anos.

Isso significa que sua segurança não depende apenas de boas práticas de programação, mas de decisões tomadas desde a fabricação até o descarte do equipamento.

Esse conceito é conhecido como **Secure Device Lifecycle (SDL)** ou **Ciclo de Vida Seguro do Dispositivo**.

Em vez de tratar a segurança como uma etapa isolada, ela passa a acompanhar todas as fases do produto.

---

# Objetivos deste volume

Ao final deste capítulo o estudante deverá compreender:

- o ciclo de vida de dispositivos IoT;
- Secure Development Lifecycle (SDL);
- Secure by Design;
- Secure by Default;
- gerenciamento de vulnerabilidades;
- atualização de firmware;
- gerenciamento de certificados;
- descomissionamento seguro;
- descarte de dispositivos.

---

# 2. O ciclo de vida de um dispositivo IoT

Um dispositivo conectado normalmente percorre as seguintes etapas:

Projeto

↓

Desenvolvimento

↓

Fabricação

↓

Provisionamento

↓

Implantação

↓

Operação

↓

Atualizações

↓

Manutenção

↓

Descomissionamento

Cada uma dessas fases apresenta riscos específicos.

---

# Exemplo

Uma câmera IP pode ser extremamente segura durante sua fabricação.

Entretanto, caso nunca receba atualizações de firmware, ela se tornará vulnerável com o passar dos anos.

---

# 3. Secure by Design

Nos últimos anos diversos governos passaram a exigir que fabricantes incorporem segurança desde o início do desenvolvimento.

Esse conceito recebe o nome de **Secure by Design**.

Em vez de corrigir problemas após o lançamento, busca-se evitá-los durante o projeto.

Isso envolve decisões como:

- escolha adequada do microcontrolador;
- autenticação baseada em certificados;
- Secure Boot;
- Flash Encryption;
- atualização OTA;
- proteção física.

---

# Curiosidade

Corrigir uma vulnerabilidade durante a fase de projeto pode custar dezenas de vezes menos do que corrigi-la após milhões de dispositivos já terem sido vendidos.

---

# 4. Secure by Default

Além de projetar corretamente, os dispositivos devem sair de fábrica configurados de forma segura.

Isso significa que:

- Telnet deve permanecer desabilitado;
- senhas padrão não devem existir;
- criptografia deve estar ativada;
- autenticação deve ser obrigatória;
- logs importantes devem ser registrados.

O usuário não deveria precisar configurar manualmente recursos básicos de segurança.

---

# Exemplo

Configuração insegura:

Senha:

admin/admin

---

Configuração segura:

Primeira inicialização

↓

Usuário cria senha forte

↓

Dispositivo gera chaves criptográficas

↓

Operação iniciada

---

# 5. Provisionamento Seguro

Provisionar significa preparar um dispositivo para entrar em produção.

Essa etapa normalmente inclui:

- gravação do firmware;
- instalação de certificados;
- registro em servidores;
- associação ao cliente;
- configuração inicial.

Todo esse processo deve ocorrer em ambiente controlado.

Caso seja comprometido, milhares de equipamentos poderão nascer inseguros.

---

# Exemplo

Fábrica

↓

Firmware oficial

↓

Certificado exclusivo

↓

Registro na nuvem

↓

Envio ao cliente

---

# 6. Gerenciamento de Vulnerabilidades

Nenhum software é perfeito.

Consequentemente, novas vulnerabilidades continuarão sendo descobertas durante toda a vida útil do equipamento.

O fabricante deve possuir processos para:

- receber relatos;
- analisar vulnerabilidades;
- desenvolver correções;
- distribuir atualizações.

---

# CVE

Grande parte das vulnerabilidades recebe um identificador denominado CVE (Common Vulnerabilities and Exposures).

Esse identificador facilita:

- documentação;
- divulgação;
- gerenciamento.

---

# CVSS

Além do CVE, normalmente calcula-se uma pontuação chamada CVSS.

Ela estima a gravidade da vulnerabilidade.

Quanto maior a pontuação, maior a prioridade para correção.

---

# 7. Atualizações OTA

Atualizações Over-The-Air representam um dos principais mecanismos para manutenção da segurança.

Entretanto, elas precisam ser cuidadosamente planejadas.

Boas práticas incluem:

- assinatura digital;
- criptografia;
- rollback automático;
- validação de integridade;
- atualização gradual.

---

# Atualização gradual

1%

↓

5%

↓

10%

↓

50%

↓

100%

Esse procedimento reduz o impacto caso a atualização apresente falhas.

---

# Atenção

Atualizar rapidamente é importante.

Atualizar sem validação pode ser ainda mais perigoso.

---

# 8. Rotação de Certificados

Certificados digitais possuem prazo de validade.

Consequentemente precisam ser renovados periodicamente.

Esse processo é conhecido como **Rotação de Certificados**.

Caso um certificado comprometido permaneça válido, um invasor poderá continuar utilizando-o.

---

# Revogação

Quando uma chave é comprometida, ela deve ser revogada imediatamente.

Isso impede novas autenticações utilizando aquele certificado.

---

# Exemplo

Certificado roubado

↓

Autoridade Certificadora

↓

Revogação

↓

Servidores deixam de aceitá-lo

---

# 9. Descomissionamento Seguro

Todo dispositivo eventualmente chega ao fim de sua vida útil.

Entretanto, simplesmente desligá-lo não é suficiente.

Antes do descarte devem ser removidos:

- certificados;
- senhas;
- tokens;
- informações pessoais;
- chaves criptográficas.

---

# Cryptographic Erase

Uma técnica amplamente utilizada consiste em apagar apenas a chave responsável por descriptografar os dados.

Mesmo que toda a memória permaneça intacta, as informações tornam-se irrecuperáveis.

---

# Exemplo

Flash criptografada

↓

Chave apagada

↓

Dados permanecem armazenados

↓

Conteúdo ilegível

---

# 10. Supply Chain Security

A segurança também depende dos componentes utilizados durante o desenvolvimento.

Atualmente um firmware pode conter dezenas de bibliotecas de terceiros.

Caso uma delas possua vulnerabilidades, todo o sistema será afetado.

---

# SBOM

SBOM significa:

Software Bill of Materials.

Consiste em um inventário completo contendo:

- bibliotecas;
- versões;
- dependências;
- componentes utilizados.

Isso facilita identificar rapidamente quais dispositivos são afetados quando uma nova vulnerabilidade é descoberta.

---

# Exemplo

Firmware

↓

Biblioteca MQTT

↓

Biblioteca TLS

↓

Driver Wi-Fi

↓

Biblioteca JSON

↓

SBOM

Caso uma biblioteca apresente vulnerabilidade, torna-se possível localizar todos os dispositivos impactados.

---

# 11. DevSecOps

Tradicionalmente, desenvolvimento e segurança eram tratados separadamente.

Hoje utiliza-se DevSecOps.

A segurança passa a acompanhar continuamente:

Projeto

↓

Desenvolvimento

↓

Testes

↓

Implantação

↓

Monitoramento

Isso reduz significativamente a introdução de vulnerabilidades.

---

# 12. Boas práticas

Um fabricante moderno deve:

- implementar Secure Boot;
- utilizar Flash Encryption;
- remover senhas padrão;
- fornecer atualizações OTA;
- utilizar autenticação baseada em certificados;
- manter SBOM atualizado;
- responder rapidamente a novas vulnerabilidades;
- oferecer suporte durante todo o ciclo de vida do produto.

---

# Resumo do Volume

Neste capítulo estudamos a segurança ao longo de todo o ciclo de vida dos dispositivos IoT.

Foram apresentados conceitos como Secure by Design, Secure by Default, Provisionamento Seguro, DevSecOps, SBOM, Rotação de Certificados e Descomissionamento Seguro.

Esses conceitos demonstram que proteger um dispositivo não significa apenas desenvolver um firmware seguro, mas manter continuamente sua segurança desde a fabricação até seu descarte.

---

# Perguntas para discussão

1. Um fabricante deveria ser obrigado a fornecer atualizações durante toda a vida útil do dispositivo?

2. Qual a importância do SBOM diante de vulnerabilidades em bibliotecas de terceiros?

3. Vale a pena manter dispositivos sem suporte conectados à Internet?

4. O descarte inadequado de um equipamento representa risco de segurança?

5. Por que Secure by Design reduz custos a longo prazo?

---

# Possíveis perguntas do professor

**O que diferencia Secure by Design de Secure by Default?**

**Qual a função de um SBOM?**

**Por que atualizações OTA devem ser assinadas digitalmente?**

**O que é Cryptographic Erase?**

**Por que um dispositivo continua exigindo cuidados mesmo após deixar de ser utilizado?**

---

# Leituras recomendadas

- NIST SP 800-193
- NIST IR 8259
- NTIA Software Bill of Materials
- Cyber Resilience Act (CRA)
- ETSI EN 303 645

---

**Continua no Volume VIII — Normas, Frameworks, Legislação e Boas Práticas Internacionais.**
