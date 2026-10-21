# ☁️ Aula 07 — Sistemas operacionais e computação em nuvem

[← Aula 06](../Aula-6/README.md) · [Índice da disciplina](../README.md)

A aula aborda o uso de **Node.js e Express** para consultar informações do sistema operacional e disponibilizá-las em uma aplicação web. O material também propõe publicar o projeto em nuvem e comparar diferentes ambientes de execução.

## 📂 Materiais disponíveis

| Arquivo | Conteúdo |
|---|---|
| [Resumo da Aula 07](Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) | Conceitos de nuvem, Express, CORS, Render e comparação entre ambientes. |
| [README do NEXUS OS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) | Instalação, arquitetura, APIs e limitações conhecidas. |
| [`server.js`](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/server.js) | Implementação do servidor e da interface. |
| [`package.json`](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/package.json) | Dependências, requisitos e scripts de execução. |

## 🎯 Objetivo prático

O projeto NEXUS OS apresenta indicadores relacionados a CPU, memória, rede, processos, ambiente Node.js e tempo de atividade. Ao utilizá-lo localmente e em um serviço de nuvem, é possível estudar as diferenças entre os recursos expostos em cada ambiente.

**Importante:** a aplicação sempre coleta informações do ambiente em que o **servidor Node.js** está executando. Os dados exibidos em uma instância remota não são os do computador do visitante.

## ⚙️ Como executar o NEXUS OS

Com Node.js 18 ou superior e npm instalados, execute a partir da pasta `Aula-7`:

```bash
cd NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

Acesse **http://localhost:3000** no navegador. É possível utilizar outra porta por meio de `PORT`. Para desenvolvimento, o projeto também define `npm run dev`.

## ☁️ Configuração sugerida no Render

Para publicar o serviço diretamente a partir deste repositório, as configurações do projeto são:

| Campo | Valor |
|---|---|
| Root Directory | `Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Porta | Variável `PORT` fornecida pelo ambiente |

**Endereço registrado no material:** [Dashboard no Render](https://dashboard-monitoramento-1.onrender.com/). O link é uma referência existente; não comprova a disponibilidade atual do serviço.

## 📊 Comparação entre ambientes

O roteiro da aula propõe comparar plataforma, sistema operacional, CPU, memória, arquitetura, versão do Node.js, interfaces de rede e tempo de atividade. Para interpretar os resultados, registre o **ambiente, a data da coleta e as condições de execução**.

## ⚠️ Limitações importantes

A conexão remota NEXUS LINK apresenta uma incompatibilidade entre os esquemas `nexus-os-live-v3` e `nexus-os-live-v2`. Além disso, as rotas de telemetria não possuem autenticação e podem expor detalhes do ambiente.

Consulte o [README técnico do NEXUS OS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) antes de publicar o serviço.

**Referências:** [Render — Deploy Node/Express](https://render.com/docs/deploy-node-express-app) · [Node.js — Módulo `os`](https://nodejs.org/api/os.html).
