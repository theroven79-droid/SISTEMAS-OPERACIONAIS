# ☁️ Aula 07 — Projeto: Nuvem e Sistemas Operacionais

> **Resumo de estudo — detalhado, organizado e fácil de revisar**  
> Baseado nos slides da aula **“Projeto — Nuvem e Sistemas Operacionais”**.

---

## 🎯 Objetivo da aula

A aula mostra como evoluir uma aplicação simples feita com **Node.js + Express** para um **dashboard de monitoramento de sistema operacional**, além de publicar essa aplicação em um serviço de nuvem como o **Render**.

A ideia principal é unir três assuntos:

- **API REST com Express**
- **Monitoramento do sistema operacional**
- **Deploy em nuvem**

---

# 1. 🌐 API REST com Express

## O que é feito no projeto?

A aplicação usa **Express.js** para criar um servidor web capaz de disponibilizar informações do sistema operacional.

### Passos apresentados na aula

1. Criar uma nova pasta para o projeto.
2. Abrir a pasta no **VS Code**.
3. Instalar o Express:

```bash
npm install express
```

4. Instalar o CORS:

```bash
npm install cors express
```

5. Criar o arquivo da aplicação.
6. Executar o servidor:

```bash
node index.js
```

---

## 🔐 O que é CORS?

**CORS** é um mecanismo de segurança do navegador que controla o acesso entre **domínios diferentes**.

### Para lembrar

> **CORS controla se um site pode acessar recursos de outro domínio.**

---

# 2. ☁️ O que é o Render?

O **Render** é uma plataforma de hospedagem em nuvem usada para publicar aplicações e serviços web.

Segundo a aula, ele:

- suporta **Node.js**, Python e outras linguagens;
- integra facilmente com repositórios **Git**;
- permite **deploy contínuo automático**;
- possui interface simples para iniciantes;
- pode ser usado em projetos pequenos e acadêmicos;
- oferece ambiente de produção;
- possui certificado **SSL**;
- é indicado para **APIs e microsserviços**.

---

# 3. ✅ Benefícios do Render

A aula destaca os seguintes benefícios:

- deploy rápido;
- configuração simplificada;
- atualizações automáticas via GitHub;
- ambiente de produção profissional;
- possibilidade de escalabilidade;
- monitoramento de desempenho;
- infraestrutura confiável;
- facilidade de uso em projetos acadêmicos.

### Para lembrar

> **Render = hospedar, publicar e manter a aplicação online de forma simples.**

---

# 4. 🚀 Como publicar o projeto no Render

## Etapas apresentadas na aula

### 1. Subir o projeto para o GitHub

O projeto deve estar disponível em um repositório.

### 2. Criar conta no Render

Acessar o painel do Render.

### 3. Criar um novo Web Service

Selecionar:

```text
New → Web Service
```

Depois conectar o repositório do GitHub.

### 4. Definir os comandos

Nos slides:

```text
Build Command: node
Start Command: node index.js
```

### 5. Fazer o deploy

Depois do deploy, a aplicação fica disponível em um endereço semelhante a:

```text
seu-projeto.onrender.com
```

---

# 5. 🖥️ Evolução do projeto

Antes, a aplicação mostrava apenas informações básicas da máquina, como:

- hostname;
- plataforma;
- arquitetura;
- quantidade de CPUs;
- memória;
- tempo de atividade.

Nesta aula, o projeto evolui para um **dashboard completo de monitoramento**.

---

# 6. 📊 Indicadores de desempenho

A nova versão do projeto passa a apresentar indicadores visuais.

Entre eles:

- percentual de uso da **memória RAM**;
- uso médio da **CPU**;
- **uptime** formatado;
- quantidade de arquivos do projeto;
- IP principal;
- status geral da máquina.

## Por que isso é importante?

Esses dados formam um **painel executivo**, permitindo entender rapidamente o estado do computador ou servidor.

### Para lembrar

> **Dashboard = visão rápida e visual do estado do sistema.**

---

# 7. 🧠 Informações do sistema operacional

O dashboard também detalha o ambiente em que a aplicação está sendo executada.

Pode mostrar:

| Informação | O que representa |
|---|---|
| **Hostname** | Nome da máquina |
| **Tipo do sistema** | Sistema operacional em execução |
| **Kernel** | Núcleo do sistema operacional |
| **Arquitetura** | Arquitetura do processador |
| **Endianness** | Ordem usada para armazenar bytes |
| **Node.js** | Versão do ambiente Node em execução |

Esses dados ajudam a relacionar:

```text
Hardware
   ↓
Sistema Operacional
   ↓
Software / Node.js
   ↓
Aplicação
```

---

# 8. 🏠 Execução local x ☁️ execução em nuvem

Um dos objetivos do projeto é identificar automaticamente onde ele está sendo executado.

A aplicação pode estar:

```text
LOCALMENTE
```

ou:

```text
NA NUVEM
```

como no **Render**.

---

## O que pode mudar entre os ambientes?

O dashboard pode exibir diferenças relacionadas a:

- porta utilizada;
- modo de execução;
- características da máquina;
- informações do servidor remoto;
- ambiente onde a aplicação está hospedada.

Isso permite estudar conceitos como:

- **virtualização**;
- infraestrutura remota;
- serviços sob demanda;
- execução local;
- execução em cloud.

---

# 9. 🔍 Comparação: PC local x servidor em nuvem

A proposta permite executar a mesma aplicação em dois ambientes diferentes.

Exemplo:

```text
MEU COMPUTADOR
      VS
SERVIDOR RENDER
```

Isso ajuda a observar que a aplicação pode ser a mesma, mas o ambiente de execução pode mudar.

### Podem ser comparados

- sistema operacional;
- hostname;
- CPU;
- memória;
- arquitetura;
- Node.js;
- IP;
- uptime;
- ambiente de execução.

---

# 10. 🌍 Segundo provedor de nuvem

A aula não termina no Render.

O trabalho pede escolher **outra plataforma semelhante ao Render**, fazer o deploy da mesma aplicação e comparar os dois servidores.

Depois, deve ser elaborado um **relatório comparativo** descrevendo as principais diferenças entre as ferramentas.

---

## Estrutura simples para comparação

| Item | Render | Segundo serviço |
|---|---|---|
| Facilidade de deploy |  |  |
| Sistema operacional |  |  |
| CPU |  |  |
| RAM |  |  |
| Arquitetura |  |  |
| Node.js |  |  |
| IP |  |  |
| Uptime |  |  |
| Recursos da plataforma |  |  |

> **Importante:** os valores devem ser coletados na execução real. Não devem ser inventados.

---

# 11. 🧩 Fluxo geral do projeto

```text
CÓDIGO NODE.JS
      ↓
EXPRESS
      ↓
API / DASHBOARD
      ↓
INFORMAÇÕES DO SISTEMA
      ↓
EXECUÇÃO LOCAL
      ↓
GITHUB
      ↓
RENDER
      ↓
EXECUÇÃO EM NUVEM
      ↓
COMPARAÇÃO DOS AMBIENTES
```

---

# 12. 📝 Resumo rápido para prova

## Express

> Framework usado com Node.js para criar servidor e API web.

## API REST

> Forma de disponibilizar dados e recursos através de rotas HTTP.

## CORS

> Mecanismo que controla acesso entre domínios diferentes.

## Render

> Plataforma de nuvem usada para hospedar e publicar aplicações web.

## Deploy

> Processo de colocar uma aplicação em funcionamento em um servidor.

## Dashboard

> Painel visual usado para acompanhar informações e indicadores.

## CPU

> Indica o processamento realizado pela máquina.

## RAM

> Memória usada pelos programas durante a execução.

## Uptime

> Tempo que o sistema permanece ligado ou em execução.

## Hostname

> Nome que identifica a máquina na rede ou no sistema.

## Kernel

> Núcleo do sistema operacional.

## Arquitetura

> Tipo de arquitetura do processador/sistema.

## Cloud

> Uso de infraestrutura computacional remota através da internet.

---

# 13. 🧠 O que você realmente precisa lembrar

```text
Node.js + Express
        ↓
criam a aplicação

Dashboard
        ↓
mostra dados do sistema

GitHub
        ↓
armazena o projeto

Render
        ↓
hospeda a aplicação

Execução local x nuvem
        ↓
permite comparar ambientes
```

---

# 14. ✅ Checklist da aula

Ao final da atividade, você deve entender:

- [ ] como iniciar uma aplicação Express;
- [ ] como executar um servidor Node.js;
- [ ] o que é CORS;
- [ ] o que é o Render;
- [ ] como publicar um projeto no Render;
- [ ] como conectar GitHub ao Render;
- [ ] o que é deploy;
- [ ] como um dashboard monitora o sistema;
- [ ] quais informações do sistema operacional podem ser exibidas;
- [ ] diferença entre execução local e em nuvem;
- [ ] como comparar dois servidores;
- [ ] como elaborar um relatório comparativo.

---

# 🎯 Resumo final

A aula ensina a transformar uma aplicação simples em Node.js e Express em um **dashboard de monitoramento de sistema operacional**, capaz de apresentar informações como CPU, RAM, uptime, hostname, arquitetura, kernel, IP e ambiente de execução.

Depois, o projeto é publicado no **Render**, permitindo comparar a execução no computador local com a execução em um servidor na nuvem.

Por fim, a atividade propõe publicar a aplicação em **outro serviço semelhante ao Render** e produzir um relatório comparando os ambientes e as ferramentas.

---

## ⚡ Para prova, memorize assim

> **Node.js + Express criam a aplicação. O dashboard monitora o sistema. O GitHub guarda o projeto. O Render coloca a aplicação na nuvem. Depois, comparamos o ambiente local com o ambiente cloud e com outro provedor.**
