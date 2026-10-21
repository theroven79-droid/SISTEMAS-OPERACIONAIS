# NEXUS OS Omega V3 — Projeto da Aula 07

[Voltar à Aula 07](../README.md) · [Índice da disciplina](../../README.md)

Dashboard em português que reúne métricas do sistema operacional, do processo Node.js e do próprio serviço HTTP. A versão declarada no [package.json](package.json) é **3.1.0**.

O monitor observa o ambiente em que o servidor roda. Acessar uma instância em nuvem mostra os recursos visíveis àquela instância, e não os recursos do computador do visitante.

## Arquitetura e arquivos

```text
Navegador ← HTML / JSON / SSE ← Express ← os / process / perf_hooks / v8 / fs
```

| Arquivo | Responsabilidade |
|---|---|
| [server.js](server.js) | Coleta de métricas, rotas Express, HTML, CSS e JavaScript do navegador. |
| [package.json](package.json) | Scripts, requisito de Node.js e dependências. |
| [package-lock.json](package-lock.json) | Versões resolvidas para instalação reproduzível. |
| [.gitignore](.gitignore) | Exclusões de dependências, arquivos de ambiente e logs. |

Não há compilação separada de frontend: a página é montada no próprio `server.js`.

## Instalar e executar

Requisitos declarados: **Node.js 18 ou superior** e npm. Execute no diretório desta aplicação:

```bash
npm ci
npm start
```

O processo escuta em `0.0.0.0`, na porta 3000 por padrão. Para desenvolvimento com reinício ao alterar o arquivo:

```bash
npm run dev
```

Para escolher outra porta em Bash:

```bash
PORT=3001 npm start
```

`PORT` é a configuração de porta lida pelo servidor. O código também consulta variáveis de provedores e `NODE_ENV` para descrever o ambiente; não exige credenciais nem banco de dados para monitoramento local e não carrega `.env` automaticamente.

As dependências declaradas são Express `^5.1.0` e Helmet `^8.1.0`. O lockfile resolve Express **5.2.1** e Helmet **8.3.0**.

## Métricas disponíveis

| Grupo | Dados coletados |
|---|---|
| CPU | Uso médio e por núcleo a partir da diferença entre amostras, média e pico recentes, modelo, clock e carga média. |
| Memória | RAM total/livre/usada e memória do processo: RSS, heap, memória externa e Array Buffers. |
| Runtime | Node.js, V8, libuv, OpenSSL, uso do event loop, atraso do loop, eventos de GC e estatísticas de heap. |
| Sistema | Hostname, plataforma, versão do kernel, arquitetura, PID/PPID e tempos de atividade. |
| Rede | Interfaces, endereços e escolha de uma interface IPv4 principal. |
| HTTP | Requisições concluídas, média de duração, classes de status e taxa de erros do próprio Express. |
| Projeto e armazenamento | Contagem/tamanho de arquivos na pasta da aplicação e espaço do volume, quando suportado. |
| Sessão | Médias, picos, percentis e detecção de desvio em relação à linha de base recente. |
| Processos | Lista resumida de processos com PID, CPU e memória, conforme as informações permitidas pelo sistema. |

A análise de arquivos ignora `node_modules` e `.git`. O painel de rede não é um medidor de largura de banda: o “tráfego HTTP” mostrado corresponde às requisições do próprio serviço.

## Rotas HTTP

| Método e rota | Conteúdo |
|---|---|
| `GET /` | Dashboard HTML completo. |
| `GET /api/dashboard` | JSON com `success`, `timestamp` e `data` contendo a telemetria. |
| `GET /api/public-snapshot` | Resumo selecionado com `schema: "nexus-os-live-v3"` e CORS aberto para consulta remota. |
| `OPTIONS /api/public-snapshot` | Resposta 204 para preflight. |
| `GET /api/stream` | SSE com eventos `telemetry`; em falha de coleta, evento `fault`. |
| `GET /api/health` | JSON com `success: true`, `timestamp` e `status: "online"`. |

Rotas de API inexistentes recebem 404 em JSON. A rota de saúde confirma disponibilidade HTTP; não executa uma verificação completa de todas as fontes de métricas.

## Atualização e limites

| Componente | Configuração no código |
|---|---|
| CPU | Amostragem a cada 1 segundo; histórico de até 60 valores. |
| SSE | Telemetria a cada 1,5 segundo e heartbeat a cada 15 segundos. |
| Perfis da interface | 1 s, 1,5 s, 3 s ou 5 s. SSE é usado no perfil de 1,5 s; os demais usam consultas periódicas. |
| Falha de SSE | A interface passa para consultas periódicas. |
| Processos | Atualização a cada 5 segundos, com até 14 itens. |
| Análise da pasta | Cache de 30 segundos. |
| Histórico HTTP | Até 300 eventos recentes, filtrados pela janela de 60 segundos. |
| Estatísticas da sessão no servidor | Até 180 amostras de coleta. |
| Gravação no navegador | Até 600 registros em memória, exportáveis em CSV. |

As estatísticas de sessão no servidor são alimentadas quando a telemetria é coletada; não representam necessariamente um intervalo fixo independente do número de clientes. Reiniciar o processo descarta os históricos em memória.

## Interface e relatórios

- Cinco temas: Cyber Cyan, Quantum Violet, Matrix Emerald, Crimson Reactor e Solar Gold.
- Neon suave, intenso ou desligado; modo observação para reforçar contraste.
- Controles de pausa, apresentação, tela cheia e efeitos visuais.
- Paleta `Ctrl+K` (também `Cmd+K`), com setas para navegar, Enter para executar e Esc para fechar.
- Filtro e ordenação de processos por nome/PID, CPU ou memória.
- Exportação/cópia de relatório JSON no formato `nexus-os-report-v1`.
- Importação de dois relatórios desse formato para comparação observacional.
- Gravação de sessão no navegador e exportação em CSV.

Preferências como tema, neon, perfil e ordenação são guardadas em `localStorage`. Gravar uma sessão não cria um arquivo no servidor; o download ocorre ao exportar.

Chart.js vem de `cdn.jsdelivr.net`, Lucide de `unpkg.com` e fontes de `fonts.googleapis.com`/`fonts.gstatic.com`. Sem Chart.js, o código evita criar gráficos e mantém as atualizações textuais. Esses recursos visuais dependem das respectivas redes externas.

## Saúde e interpretação

A pontuação de saúde é uma heurística implementada em `buildHealth`: CPU e RAM têm peso de 25% cada, runtime 15%, event loop 20% e API 15%. As classificações são ÓTIMO (90–100), SAUDÁVEL (75–89), ATENÇÃO (50–74) e CRÍTICO (abaixo de 50).

O componente de rede é exibido separadamente e não entra nessa soma. A pontuação e a comparação de amostras não substituem um benchmark controlado. Recursos do host podem diferir do que o processo enxerga em um contêiner.

## Comparação remota — Limitação atual

A interface NEXUS LINK recebe uma URL HTTP/HTTPS e tenta consultar `/api/public-snapshot` pelo navegador. Porém, há uma incompatibilidade no próprio [server.js](server.js):

- `publicSnapshot` produz `nexus-os-live-v3`.
- `fetchRemote` aceita somente `nexus-os-live-v2`.

Por isso, a versão atual rejeita o snapshot de outra instância desta mesma versão com “Endpoint remoto compatível do NEXUS não encontrado”. Executar duas cópias não resolve essa divergência. A comparação por importação de relatórios JSON utiliza outro esquema, `nexus-os-report-v1`.

## Processos e exposição de dados

O observador usa um comando fixo de PowerShell no Windows ou `ps` no Linux. Se a enumeração falha, o painel apresenta somente o processo Node em modo limitado. No Windows, o campo de CPU é tempo acumulado; na coleta Linux, é o percentual fornecido por `ps`.

Não há rota de encerramento de processos ou execução de comandos do visitante. Também não há autenticação implementada nas rotas de leitura. A API completa expõe informações como hostname, interfaces e processos; o resumo público mantém hostname e características de CPU/memória. Os relatórios selecionam campos e não exportam o conteúdo completo de `process.env`.

## Executar no Render e apresentar

O material da Aula 07 e o README anterior deste projeto descrevem um Web Service no Render. Os comandos correspondentes aos arquivos atuais são:

```text
Build Command: npm ci
Start Command: npm start
```

A plataforma pode fornecer `PORT`. A detecção de Render no código usa suas variáveis de ambiente; detectar outros provedores não comprova que um deploy foi realizado neles.

Para a apresentação descrita no material do projeto, inicie o servidor e use a página como fonte de navegador no OBS. Essa opção depende de um ambiente gráfico e não altera a coleta das métricas.

## Verificação e diagnóstico

Com o serviço iniciado, consulte localmente:

```bash
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent http://127.0.0.1:3000/api/dashboard
curl --fail --silent http://127.0.0.1:3000/api/public-snapshot
```

Para conferir o stream, execute `curl -N http://127.0.0.1:3000/api/stream` e interrompa com `Ctrl+C` após receber um evento `telemetry`.

| Sintoma | O que conferir |
|---|---|
| Módulo Express/Helmet não encontrado | Execute `npm ci` na pasta que contém este `package.json`. |
| Porta ocupada | Defina outro `PORT` antes de iniciar. |
| Processos em modo limitado | Confira se o comando fixo de coleta está disponível e se o sistema permite a enumeração. |
| Métricas textuais presentes, gráficos ausentes | Confira o carregamento do Chart.js por CDN. |
| Link remoto rejeitado | Confira a incompatibilidade de esquemas descrita acima. |

O manifesto não define testes automatizados. Esta documentação se baseia no `server.js`, nos manifests e no material já presente neste projeto.
