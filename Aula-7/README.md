# Aula 07 — Nuvem e Sistemas Operacionais

[Aula 06](../Aula-6/README.md) · [Índice da disciplina](../README.md)

Estudo de aplicações Node.js com Express, monitoramento do sistema operacional e publicação em nuvem.

## Materiais

| Material | Conteúdo |
|---|---|
| [Resumo da aula](Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) | Express, CORS, Render, deploy e comparação entre ambientes. |
| [Projeto NEXUS OS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) | Instruções de instalação, execução e uso do dashboard. |
| [Código da aplicação](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/server.js) | Servidor, coleta de métricas e interface do NEXUS OS. |
| [Manifesto npm](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/package.json) | Dependências, scripts e requisito de Node.js. |

## Objetivo da aula

Evoluir uma aplicação que apresenta informações básicas do sistema operacional para um dashboard com indicadores de CPU, memória, tempo de atividade, rede e ambiente de execução.

A proposta inclui publicar a aplicação no Render, escolher uma segunda plataforma e elaborar um relatório comparativo dos ambientes.

## Executar o NEXUS OS

Com Node.js 18 ou superior e npm disponíveis, execute a partir desta pasta:

```bash
cd NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

O projeto utiliza `server.js` como entrada e Express e Helmet como dependências. O servidor usa a porta 3000 por padrão. Para desenvolvimento com reinício automático, execute `npm run dev` na pasta da aplicação.

## Recursos do projeto

- Coleta de métricas do sistema e do processo Node.js.
- Atualização por SSE ou consultas periódicas.
- Observação de processos em modo somente leitura.
- Cinco temas, ajustes de neon e modo de observação.
- Paleta de comandos.
- Exportação de relatórios JSON e sessões CSV.
- Comparação por importação de relatórios.

Os endpoints e a limitação de compatibilidade do link remoto estão descritos no [guia do NEXUS OS](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

## Relatório comparativo

O resumo da aula propõe comparar facilidade de deploy, sistema operacional, CPU, memória, arquitetura, versão do Node.js, IP, tempo de atividade e recursos das plataformas.

Preencha o relatório com dados coletados em cada ambiente. A comparação deve identificar a plataforma e o contexto da coleta.

## Endereço registrado no projeto

[Dashboard no Render](https://dashboard-monitoramento-1.onrender.com/)
