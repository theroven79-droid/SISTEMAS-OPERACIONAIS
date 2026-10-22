# 📊 NEXUS OS Omega V3

**Um dashboard para acompanhar o ambiente em que uma aplicação Node.js está rodando.**

O **NEXUS OS Omega V3** reúne métricas do sistema operacional, do processo Node.js e do servidor HTTP em uma interface web em português. O painel organiza esses dados em indicadores, gráficos e visualizações que ajudam a comparar o comportamento da aplicação em diferentes ambientes.

## ✨ O que o painel apresenta

| Área | Recursos disponíveis |
|---|---|
| **💻 CPU e memória** | Uso do processador, informações por núcleo, memória RAM e consumo do processo Node.js. |
| **🌐 Sistema e rede** | Plataforma, arquitetura, nome da máquina, interfaces de rede e tempo de atividade. |
| **⚙️ Runtime** | Versões do Node.js e V8, estatísticas de heap e indicadores do *event loop*. |
| **📡 Servidor HTTP** | Quantidade, duração e classificação das requisições atendidas pelo Express. |
| **🧩 Processos** | Visualização e ordenação de processos acessíveis ao servidor, em modo somente leitura. |
| **📁 Projeto e armazenamento** | Contagem de arquivos do projeto e informações de armazenamento quando disponíveis. |
| **📈 Análises e relatórios** | Históricos, alertas visuais, exportação em JSON e CSV e comparação entre relatórios importados. |

A interface oferece **cinco temas de cores**, controles de visualização e uma **paleta de comandos com `Ctrl + K`**. Os dados são atualizados por *Server-Sent Events* (SSE), com alternativa de consultas periódicas.

## 🛠️ Tecnologias

| Tecnologia | Utilização no projeto |
|---|---|
| **Node.js 18+** | Execução do servidor e coleta de informações do ambiente. |
| **Express 5** | Rotas HTTP para o painel e as métricas. |
| **Helmet 8** | Configuração de cabeçalhos HTTP de segurança. |
| **HTML, CSS e JavaScript** | Interface e interações do dashboard, incluídas no `server.js`. |

## 📂 Estrutura da aplicação

| Arquivo | Função |
|---|---|
| [`server.js`](server.js) | Servidor, coleta de dados, endpoints e interface web. |
| [`package.json`](package.json) | Scripts, versão da aplicação e dependências. |
| [`package-lock.json`](package-lock.json) | Registro das dependências npm resolvidas. |
| [`.gitignore`](.gitignore) | Regras de arquivos ignorados pelo Git. |

## 🚀 Executar localmente

Com **Node.js 18 ou superior** e npm instalados, acesse esta pasta pelo terminal e execute:

```bash
npm ci
npm start
```

A aplicação utiliza a porta **3000** por padrão, ou a porta definida na variável de ambiente `PORT`. Depois de iniciar, abra `http://localhost:3000` no navegador.

## 🔗 Dados disponibilizados

| Rota | Conteúdo |
|---|---|
| `/` | Interface do dashboard. |
| `/api/dashboard` | Métricas do ambiente em JSON. |
| `/api/public-snapshot` | Resumo de telemetria para consulta externa. |
| `/api/stream` | Atualizações contínuas via SSE. |
| `/api/health` | Resposta de verificação do serviço. |

O dashboard reflete o **servidor ou contêiner** que executa o Node.js. Os históricos de sessão mantidos em memória são reiniciados quando o processo encerra.

**Versão registrada no projeto:** `3.1.0`.

**Materiais relacionados:** [Resumo da Aula 07](../Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) · [Node.js — módulo `os`](https://nodejs.org/api/os.html) · [MDN — SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) · [Render — deploy Node/Express](https://render.com/docs/deploy-node-express-app)

---

[← Voltar à Aula 07](../README.md) · [📚 Índice da disciplina](../../README.md)
