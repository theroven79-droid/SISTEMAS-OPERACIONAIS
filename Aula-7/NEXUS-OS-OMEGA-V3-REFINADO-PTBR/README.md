# NEXUS OS OMEGA V3 // HYPERVISION REFINADO

Dashboard de observabilidade em tempo real para **Sistemas Operacionais, Node.js, Express e Cloud**, com visual futurista e métricas reais da máquina onde o Node.js está executando.

Esta revisão remove completamente a antiga escala da interface e prioriza um **layout responsivo nativo**, mais estável em navegador, OBS, monitor, projetor e Render.

## Estrutura

```text
/
├── server.js
├── package.json
├── .gitignore
└── README.md
```

Todo o backend, HTML, CSS e JavaScript do navegador está concentrado em **um único `server.js`**.

## Principais recursos

### Interface em português

A interface principal, mensagens, comandos, estados, alertas, gerenciador de tarefas e controles foram revisados para português do Brasil. Termos técnicos consolidados como Node.js, Event Loop, V8, PID, RSS e HTTP foram mantidos quando fazem sentido.

### 5 temas

- Cyber Cyan
- Quantum Violet
- Matrix Emerald
- Crimson Reactor
- Solar Gold

O tema selecionado fica salvo no navegador com `localStorage`.

### Neon controlável

Três intensidades:

```text
SUAVE
INTENSO
DESLIGADO
```

### Modo Observação

O **Modo Observação** melhora a leitura sem redimensionar o site:

- aumenta contraste;
- reforça textos secundários;
- destaca painéis e métricas;
- melhora leitura em monitor distante, OBS ou projetor;
- mantém o layout e as proporções originais.

### Paleta de comandos `Ctrl + K`

A paleta foi refeita para ser mais robusta e totalmente utilizável por teclado:

- `Ctrl + K`: abrir/fechar;
- `↑` e `↓`: navegar;
- `Enter`: executar;
- `Esc`: fechar;
- busca em português;
- destaque do comando selecionado;
- execução protegida para um comando com erro não derrubar o restante da interface;
- mensagens visuais de sucesso/erro.

Entre os comandos estão atualização da telemetria, conexão com Render, temas, neon, modo observação, tela cheia, apresentação, relatórios, gravação da sessão e acesso rápido ao gerenciador de tarefas.

### Gerenciador de Tarefas NEXUS

No final da página existe um observador de processos **somente leitura**.

Ele mostra, quando o sistema operacional permite:

- nome do processo;
- PID;
- CPU ou tempo de CPU;
- memória residente;
- percentual de RAM;
- processo do NEXUS destacado;
- fonte da coleta;
- horário de atualização;
- filtro por nome/PID;
- ordenação por CPU, memória, nome ou PID.

No Windows, a coleta usa um comando interno fixo com PowerShell e `Get-Process`. No Linux/Render, utiliza `ps` em modo somente leitura. Se a enumeração de processos não estiver disponível, o painel entra em modo limitado e mostra o próprio processo Node.

**Não existe endpoint para executar comandos, encerrar processos ou controlar remotamente o sistema operacional.**

## Telemetria

O dashboard reúne:

- uso real de CPU por amostragem;
- uso por núcleo lógico;
- RAM total, usada e livre;
- memória do processo Node;
- Event Loop Delay;
- Event Loop Utilization;
- Garbage Collector;
- V8 e heap;
- uptime do sistema e do processo;
- interfaces de rede;
- identidade do sistema operacional;
- ambiente Cloud;
- telemetria HTTP do Express;
- análise da pasta do próprio projeto;
- armazenamento disponível quando suportado;
- pontuação heurística de saúde;
- alertas;
- inteligência de sessão e detecção simples de anomalias.

A pontuação de saúde é apenas um indicador visual heurístico e não substitui ferramentas profissionais de diagnóstico.

## PC local x Render

O NEXUS pode rodar localmente e consultar outra instância publicada no Render.

Exemplo:

```text
https://meu-nexus.onrender.com
```

A interface local usa o endpoint público sanitizado da instância remota e monta a comparação **PC atual x servidor Render** sem expor variáveis de ambiente sensíveis.

## Instalação

Na pasta do projeto:

```bash
npm install
```

## Execução

```bash
npm start
```

Abra:

```text
http://localhost:3000
```

## Desenvolvimento

```bash
npm run dev
```

## OBS Studio

1. Inicie o projeto com `npm start`.
2. No OBS, adicione uma fonte **Navegador**.
3. Use:

```text
http://localhost:3000
```

4. Para clicar nos controles dentro do OBS, use **Interagir** na fonte Navegador.

## Deploy no Render

Crie um **Web Service** conectado ao repositório GitHub.

Build Command:

```bash
npm install
```

Start Command:

```bash
npm start
```

O servidor usa:

```javascript
const PORT = process.env.PORT || 3000;
```

E escuta em:

```javascript
app.listen(PORT, '0.0.0.0', ...)
```

Isso permite execução local e em ambientes Cloud que fornecem uma porta dinâmica.

## Segurança

O projeto não fornece:

- shell remoto;
- endpoint de execução de comandos;
- leitura arbitrária de arquivos;
- caminho de arquivo informado pelo navegador;
- dump completo de `process.env`;
- controle remoto de processos;
- stress test de CPU/RAM/rede.

Os relatórios exportados contêm apenas dados previamente selecionados e seguros.

## Dependências

Dependências Node:

```text
express
helmet
```

No navegador, Chart.js e Lucide são carregados por CDN. Se Chart.js não estiver disponível, a interface foi preparada para continuar exibindo a telemetria textual sem derrubar todo o dashboard.

---

**NEXUS OS OMEGA V3 // HYPERVISION REFINADO**
