# NEXUS OS OMEGA V3 // HYPERVISION REFINADO

> Dashboard de observabilidade em tempo real para **Sistemas Operacionais, Node.js, Express e ambientes Cloud**, com interface futurista em português, métricas reais e suporte a execução local e no Render.

---

## 📌 Sobre o projeto

O **NEXUS OS OMEGA V3** transforma um projeto acadêmico de Sistemas Operacionais em uma central visual de monitoramento capaz de acompanhar, em tempo real, o computador ou servidor onde a aplicação Node.js está executando.

A proposta combina três objetivos:

- **monitoramento técnico real** de CPU, memória, Node.js, rede, HTTP e sistema operacional;
- **visualização profissional** com temas, gráficos, alertas e interface estilo HUD/cyberpunk;
- **comparação Local × Cloud**, permitindo observar o PC atual e uma instância publicada no Render.

A versão refinada remove o antigo sistema de escala da interface e utiliza um **layout responsivo nativo**, mais estável para navegador, OBS Studio, monitor e projetor.

---

## 🧱 Arquitetura

O projeto foi mantido propositalmente pequeno:

```text
/
├── server.js
├── package.json
├── .gitignore
└── README.md
```

### Regra principal

Todo o código da aplicação está concentrado em **um único `server.js`**:

- servidor Express;
- APIs;
- coleta de métricas;
- HTML;
- CSS;
- JavaScript do navegador;
- gráficos;
- temas;
- paleta `Ctrl + K`;
- Gerenciador de Tarefas;
- integração Local × Render.

Não existem pastas `public`, `src`, `views`, `routes`, `frontend` ou `backend`.

---

## ⚙️ Tecnologias

### Backend

- Node.js **18+**
- Express 5
- Helmet
- módulos nativos do Node.js: `os`, `fs`, `path`, `perf_hooks`, `v8`, entre outros

### Frontend

- HTML5
- CSS3
- JavaScript Vanilla
- Chart.js via CDN
- Lucide Icons via CDN

### Dependências Node

```text
express
helmet
```

---

# 🚀 Principais recursos

## 📊 Telemetria em tempo real

O dashboard monitora informações reais da máquina onde o Node.js está rodando, incluindo:

- uso global de CPU;
- uso por núcleo lógico;
- modelo, quantidade de núcleos e clock da CPU;
- Load Average quando disponível;
- memória RAM total, usada e livre;
- memória do processo Node.js;
- RSS, Heap Used, Heap Total, External e Array Buffers;
- uso de CPU do processo Node;
- Event Loop Delay;
- Event Loop Utilization;
- Garbage Collector;
- informações do V8;
- uptime do sistema;
- uptime do processo;
- hostname;
- plataforma e arquitetura;
- kernel;
- interfaces de rede;
- IPv4/IPv6 quando disponíveis;
- telemetria HTTP do próprio Express;
- arquivos e tamanho do projeto;
- informações seguras do ambiente Cloud;
- saúde geral do sistema;
- alertas automáticos.

As métricas indisponíveis no sistema operacional são exibidas como **N/A**, sem inventar valores.

---

## 🧠 Saúde do sistema

O NEXUS calcula um **System Health Score** de `0 a 100` utilizando métricas como:

- CPU;
- RAM;
- Event Loop;
- telemetria HTTP;
- disponibilidade da aplicação.

Classificação visual aproximada:

```text
90–100  ÓTIMO
75–89   SAUDÁVEL
50–74   ATENÇÃO
0–49    CRÍTICO
```

> O Health Score é um indicador heurístico criado pelo dashboard. Ele não substitui ferramentas profissionais de diagnóstico, benchmark ou observabilidade.

---

## 🎨 5 temas visuais

A interface possui cinco temas completos:

1. **Cyber Cyan**
2. **Quantum Violet**
3. **Matrix Emerald**
4. **Crimson Reactor**
5. **Solar Gold**

O tema escolhido fica salvo em `localStorage` e é restaurado automaticamente na próxima abertura.

---

## ✨ Neon configurável

O usuário pode escolher três intensidades:

```text
SUAVE
INTENSO
DESLIGADO
```

O controle altera brilho, bordas, efeitos e elementos decorativos sem modificar o tamanho da interface.

---

## 👁️ Modo Observação

O **Modo Observação** melhora a leitura do painel sem aplicar zoom ou escala artificial.

Ele reforça:

- contraste;
- textos secundários;
- bordas dos painéis;
- destaque das métricas;
- leitura em monitor distante;
- visualização em projetor e OBS Studio.

---

# ⌨️ Paleta de comandos — `Ctrl + K`

A V3 possui uma paleta de comandos totalmente utilizável por teclado.

### Atalhos

| Tecla | Função |
|---|---|
| `Ctrl + K` | Abrir ou fechar a paleta |
| `↑` / `↓` | Navegar pelos comandos |
| `Enter` | Executar o comando selecionado |
| `Esc` | Fechar |

A busca é feita em português e cada comando é executado de forma protegida para que uma eventual falha não derrube o restante da interface.

### Exemplos de comandos disponíveis

- atualizar telemetria;
- conectar ao Render;
- desconectar servidor remoto;
- alternar apresentação;
- alternar efeitos visuais;
- tela cheia;
- exportar relatório;
- copiar relatório;
- exportar sessão;
- modo observação;
- alterar neon;
- trocar tema;
- abrir Gerenciador de Tarefas;
- pausar/retomar telemetria;
- iniciar/parar gravação da sessão.

---

# 🖥️ Gerenciador de Tarefas NEXUS

No final do dashboard existe um **observador resumido de processos** integrado ao mesmo design do site.

Quando o sistema operacional permite, ele mostra:

- nome do processo;
- PID;
- uso de CPU ou tempo de CPU;
- memória residente;
- percentual aproximado de RAM;
- processo atual do NEXUS destacado;
- quantidade de processos visíveis;
- fonte da coleta;
- horário da última atualização.

Também possui:

- filtro por nome ou PID;
- ordenação por CPU;
- ordenação por memória;
- ordenação por nome;
- ordenação por PID.

### Segurança do Gerenciador

O recurso é **somente leitura**.

Ele **não permite**:

- encerrar processos;
- executar comandos enviados pelo navegador;
- controlar remotamente o sistema operacional;
- enviar parâmetros arbitrários para o shell.

No Windows, a enumeração utiliza uma chamada interna fixa ao PowerShell com `Get-Process`. No Linux/Render, utiliza `ps` em modo somente leitura. Se a enumeração não estiver disponível, o painel entra em modo limitado e mantém pelo menos as informações do próprio processo Node.js.

---

# 🔗 Comparação PC local × Render

O NEXUS pode comparar duas instâncias do próprio dashboard.

### Exemplo

```text
PC LOCAL
   ↕
NEXUS LINK
   ↕
SERVIDOR RENDER
```

Fluxo recomendado:

1. execute o NEXUS no seu PC;
2. publique o mesmo projeto no Render;
3. abra a versão local;
4. informe a URL pública do Render;
5. conecte pelo painel **NEXUS LINK**.

Exemplo de URL:

```text
https://meu-nexus.onrender.com
```

A aplicação local consulta um **snapshot público sanitizado** do servidor remoto para realizar a comparação sem expor `process.env` completo ou secrets.

---

## 📡 Atualização de dados

O projeto utiliza:

- **SSE (Server-Sent Events)** para telemetria contínua;
- fallback para consultas periódicas quando necessário;
- históricos limitados para evitar crescimento infinito em memória;
- cache para informações que não precisam ser recalculadas a cada segundo.

---

# 📈 Visualizações

O dashboard possui diferentes painéis e gráficos para facilitar a leitura das métricas, incluindo:

- histórico de CPU;
- histórico de memória;
- uso por núcleo;
- Load Average;
- Event Loop;
- tráfego HTTP;
- memória do processo Node;
- Health Score;
- alertas;
- comparação Local × Render;
- inteligência da sessão;
- resumos do sistema e do ambiente Cloud.

Quando o Chart.js não estiver disponível, a aplicação continua apresentando a telemetria textual em vez de derrubar todo o dashboard.

---

# 🎥 Uso no OBS Studio

O NEXUS pode ser utilizado como fonte de navegador no OBS.

### 1. Inicie o projeto

```bash
npm start
```

### 2. No OBS

Adicione:

```text
Fontes → + → Navegador
```

URL:

```text
http://localhost:3000
```

Resolução recomendada:

```text
1920 × 1080
```

Para clicar nos controles do dashboard dentro do OBS:

```text
Botão direito na fonte → Interagir
```

> Usando `localhost`, o NEXUS monitora o seu PC. Usando a URL publicada no Render, ele monitora o servidor Render.

---

# 📦 Instalação

## Requisitos

- Node.js 18 ou superior;
- npm;
- Windows ou Linux;
- navegador moderno.

Confira o Node:

```bash
node -v
```

---

## 1. Instalar dependências

Na pasta do projeto:

```bash
npm install
```

---

## 2. Executar

```bash
npm start
```

Abra:

```text
http://localhost:3000
```

---

## Desenvolvimento

```bash
npm run dev
```

O modo de desenvolvimento utiliza:

```text
node --watch server.js
```

---

# ☁️ Deploy no Render

## Configuração

Crie um **Web Service** no Render conectado ao repositório GitHub do projeto.

### Build Command

```bash
npm install
```

### Start Command

```bash
npm start
```

O servidor utiliza:

```javascript
const PORT = process.env.PORT || 3000;
```

E escuta em:

```javascript
app.listen(PORT, '0.0.0.0', ...)
```

Assim, o mesmo projeto funciona localmente e em ambientes Cloud que fornecem uma porta dinâmica.

---

# 🌐 Endpoints principais

## `GET /`

Entrega o dashboard completo.

## `GET /api/dashboard`

Retorna a telemetria completa utilizada pela interface local.

Formato geral:

```json
{
  "success": true,
  "timestamp": "ISO_DATE",
  "data": {}
}
```

## `GET /api/public-snapshot`

Retorna somente um resumo sanitizado da telemetria. É utilizado principalmente para a comparação PC × Render.

## `GET /api/stream`

Stream SSE utilizado para atualização contínua da telemetria.

## `GET /api/health`

Endpoint simples de disponibilidade.

Exemplo:

```json
{
  "success": true,
  "status": "online"
}
```

---

# 📁 Análise do projeto

O NEXUS analisa somente a própria pasta da aplicação para apresentar informações como:

- quantidade de arquivos;
- quantidade de diretórios;
- tamanho do projeto;
- distribuição por extensão.

Pastas como estas são ignoradas quando aplicável:

```text
node_modules
.git
```

O navegador não pode escolher caminhos arbitrários para leitura.

---

# 📤 Relatórios e sessão

A interface permite:

- exportar relatório seguro;
- copiar relatório;
- registrar uma sessão de telemetria;
- exportar dados da sessão;
- importar relatórios compatíveis para comparação visual.

Secrets e o conteúdo completo de `process.env` não são enviados ao navegador.

---

# 🔐 Segurança

O projeto foi desenhado para monitorar, não controlar remotamente a máquina.

Não existem endpoints para:

```text
shell remoto
execução arbitrária de comandos
encerramento remoto de processos
leitura arbitrária de arquivos
directory traversal
dump completo de environment variables
stress test de CPU
stress test de RAM
flood de rede
```

O endpoint público utilizado na comparação remota contém somente dados previamente selecionados.

---

# ⚠️ Limitações

Algumas informações dependem do sistema operacional e do ambiente onde a aplicação é executada.

Por exemplo:

- o Render pode limitar a visibilidade de processos;
- containers podem apresentar apenas parte dos recursos do host;
- algumas informações de rede podem ser internas ao ambiente Cloud;
- temperatura de CPU/GPU não é inventada quando o Node.js não possui acesso confiável ao dado;
- o Gerenciador de Tarefas pode entrar em modo limitado;
- gráficos e ícones externos dependem de acesso às respectivas CDNs;
- métricas de uma única amostra não constituem benchmark científico.

---

# 🛠️ Solução rápida de problemas

## `Cannot find module 'express'`

Execute dentro da pasta do projeto:

```bash
npm install
```

Depois:

```bash
npm start
```

---

## Porta 3000 ocupada

No ambiente local, defina outra porta antes de executar ou encerre a aplicação que já está utilizando a porta.

No Render, a porta é fornecida automaticamente pela plataforma através de `process.env.PORT`.

---

## Gráficos não aparecem

Verifique a conexão com a internet, pois o Chart.js é carregado por CDN. O restante do dashboard deve continuar funcionando mesmo sem os gráficos.

---

## `Ctrl + K`

Use:

```text
Ctrl + K
```

Depois navegue com:

```text
↑ ↓
Enter
Esc
```

---

# 🎓 Valor acadêmico

O projeto reúne conceitos importantes de Sistemas Operacionais e desenvolvimento web, como:

- processos;
- memória;
- CPU;
- uptime;
- arquitetura;
- redes;
- runtime;
- Event Loop;
- observabilidade;
- cliente-servidor;
- APIs REST;
- SSE;
- execução local × Cloud;
- PaaS;
- segurança de aplicações;
- monitoramento de recursos.

Isso permite utilizar o NEXUS tanto como **trabalho acadêmico** quanto como **projeto de portfólio**.

---

# ✅ Resumo

O **NEXUS OS OMEGA V3 // HYPERVISION REFINADO** é um dashboard de monitoramento que reúne:

```text
✔ CPU e núcleos
✔ RAM
✔ Node.js / V8
✔ Event Loop
✔ HTTP
✔ Rede
✔ Sistema operacional
✔ Cloud
✔ Health Score
✔ Alertas
✔ 5 temas
✔ Neon configurável
✔ Modo Observação
✔ Ctrl + K
✔ Gerenciador de Tarefas somente leitura
✔ Comparação PC × Render
✔ SSE
✔ Relatórios
✔ Sessões
✔ OBS Studio
✔ Interface responsiva em português
✔ Compatibilidade local + Render
```

Tudo isso mantendo a arquitetura principal do projeto:

```text
BACKEND + API + HTML + CSS + FRONTEND JS = server.js
```

---

**NEXUS OS OMEGA V3 // HYPERVISION REFINADO**  
*Real-Time System Monitor · Local + Cloud · Node.js + Express*

https://dashboard-monitoramento-1.onrender.com/

