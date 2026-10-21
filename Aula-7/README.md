# Aula 07 — Nuvem, Sistemas Operacionais e NEXUS OS

[Aula anterior](../Aula-6/README.md) · [Índice da disciplina](../README.md)

A aula relaciona servidor Express, coleta de informações do sistema operacional e publicação em nuvem. Esta pasta reúne o resumo de estudo e uma implementação do dashboard NEXUS OS Omega V3.

## Material disponível

| Caminho | Conteúdo |
|---|---|
| [Resumo da Aula 07](Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) | Conceitos de Express, CORS, Render, deploy e comparação entre ambientes. |
| [Projeto NEXUS OS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) | Guia técnico da aplicação, instalação, métricas, endpoints e limitações. |
| [server.js](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/server.js) | Implementação do servidor, da coleta e da interface. |
| [package.json](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/package.json) | Scripts, dependências e requisito de Node.js. |

## Objetivo registrado na aula

Evoluir uma aplicação de informações básicas do SO para um dashboard com CPU, RAM, uptime, identidade do sistema, rede e ambiente de execução. O resumo propõe publicar no Render, escolher um segundo provedor e produzir um relatório comparativo com dados reais.

A proposta acadêmica não comprova que as duas publicações tenham sido concluídas. CPU, memória, arquitetura, SO, Node.js e uptime devem ser coletados nos ambientes que estiverem efetivamente em execução.

## Executar o código desta pasta

A partir de `Aula-7`:

```bash
cd NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

O manifesto exige Node.js 18 ou superior. A aplicação escuta na porta 3000 por padrão, aceita `PORT` e fornece modo de desenvolvimento com `npm run dev`.

O resumo didático menciona `index.js`, instalação de CORS e um comando de build `node`. O projeto disponível usa **server.js**, **Express e Helmet**. Para este código, os comandos são `npm ci` para instalar e `npm start` para iniciar, executados dentro da subpasta da aplicação.

## O que a implementação oferece

- Telemetria por JSON e SSE, com consultas periódicas como alternativa.
- Métricas de CPU, RAM, Node/V8, event loop, HTTP, rede e arquivos do projeto.
- Observador de processos somente leitura.
- Cinco temas, neon configurável, modo observação e paleta de comandos.
- Exportação de relatórios JSON e de sessões CSV.
- Comparação visual por importação de relatórios.

Os detalhes e os limites de amostragem estão no [README do NEXUS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

## Comparação local e remota

O código diferencia a máquina atual de uma segunda instância consultada pela interface. Entretanto, o endpoint público produz o esquema `nexus-os-live-v3` e o cliente remoto exige `nexus-os-live-v2`. Essa divergência faz a versão atual rejeitar o snapshot de outra instância igual.

A importação de relatórios usa `nexus-os-report-v1` e constitui um fluxo separado. Comparações entre amostras são observacionais, não benchmarks controlados.

## Roteiro para o relatório proposto

O resumo da aula sugere registrar facilidade de deploy, sistema operacional, CPU, RAM, arquitetura, Node.js, IP, uptime e recursos de cada plataforma. Guarde os valores coletados e o ambiente correspondente, distinguindo informações observadas de campos indisponíveis.

O endereço `https://dashboard-monitoramento-1.onrender.com/` já constava no README desta pasta. Ele é preservado aqui como referência registrada, sem afirmar que sua disponibilidade ou seu conteúdo foram verificados nesta revisão.
