# 📊 Relatório técnico da pasta — NEXUS OS Omega V3

[← Aula 07](../README.md) · [↑ Relatório da disciplina](../../README.md)

## 📌 Apresentação

Esta subpasta contém o **NEXUS OS Omega V3**, um dashboard de observabilidade desenvolvido com **Node.js e Express**, com interface em português. A aplicação consulta informações do ambiente em que está sendo executada e apresenta métricas do sistema operacional, do processo Node.js e das requisições HTTP do próprio servidor.

A versão declarada no projeto é **3.1.0**, com requisito de Node.js 18 ou superior.

## 📂 Arquivos e responsabilidades

| Arquivo | Conteúdo |
|---|---|
| [`server.js`](server.js) | Código principal: coleta de métricas, rotas HTTP, interface em HTML/CSS/JavaScript e controles visuais. |
| [`package.json`](package.json) | Nome, versão, dependências, requisitos e scripts de execução. |
| [`package-lock.json`](package-lock.json) | Registro das versões resolvidas das dependências npm. |
| [`.gitignore`](.gitignore) | Regras de exclusão de arquivos do versionamento. |
| `README.md` | Relatório técnico e índice da aplicação. |

O projeto utiliza **Express** para atender às rotas HTTP e **Helmet** para configurar cabeçalhos de segurança. A maior parte da implementação está concentrada no arquivo `server.js`.

## 🧠 Funcionalidades identificadas

| Grupo | Dados e recursos |
|---|---|
| CPU e memória | Utilização do processador, informações dos núcleos, memória RAM e consumo do processo Node.js. |
| Sistema e rede | Plataforma, arquitetura, nome da máquina, tempo de atividade e interfaces de rede. |
| Runtime | Versões do Node.js e V8, informações do heap e indicadores do event loop. |
| Requisições HTTP | Contagem, duração e classificação de respostas do serviço Express. |
| Processos | Listagem, filtro e ordenação de processos visíveis, sem permitir encerrá-los. |
| Projeto e armazenamento | Análise de arquivos e consulta ao volume, quando suportada pelo ambiente. |
| Relatórios e interface | Gráficos, cinco temas, configurações visuais, exportação JSON/CSV e comparação de relatórios importados. |

As atualizações ocorrem por **Server-Sent Events (SSE)** ou consultas periódicas. Os históricos mantidos pelo servidor ficam em memória e são perdidos após seu encerramento.

## 🌐 Rotas e operação

| Rota | Finalidade |
|---|---|
| `/` | Exibir o painel no navegador. |
| `/api/dashboard` | Retornar a telemetria em JSON. |
| `/api/public-snapshot` | Disponibilizar um resumo de métricas. |
| `/api/stream` | Enviar eventos de telemetria por SSE. |
| `/api/health` | Informar a disponibilidade do serviço. |

Para executar o projeto, com Node.js 18 ou superior e npm instalados, utilize `npm ci` e `npm start` na pasta da aplicação. O servidor escuta na porta **3000** por padrão e respeita a variável de ambiente `PORT`.

## ⚠️ Aspectos que exigem atenção

A integração **NEXUS LINK** apresenta incompatibilidade de esquema: o servidor gera `nexus-os-live-v3`, enquanto o cliente remoto espera `nexus-os-live-v2`. Assim, a conexão entre duas instâncias desta mesma versão não funciona diretamente; a comparação de relatórios por importação de JSON é um recurso separado.

As rotas de telemetria **não exigem autenticação** e podem divulgar informações do ambiente. Os indicadores refletem o servidor ou container que executa o Node.js, não o computador do visitante. A enumeração de processos depende dos recursos e permissões do sistema operacional, e alguns gráficos exigem bibliotecas carregadas externamente.

## 🔗 Fontes e materiais relacionados

[Código-fonte](server.js) · [Manifesto npm](package.json) · [Resumo da Aula 07](../Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) · [Node.js — módulo `os`](https://nodejs.org/api/os.html) · [MDN — SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) · [Render — deploy](https://render.com/docs/deploy-node-express-app)
