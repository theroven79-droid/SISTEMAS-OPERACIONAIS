# ☁️ Relatório da pasta — Aula 07: sistemas operacionais na nuvem

[← Aula 06](../Aula-6/README.md) · [Relatório da disciplina](../README.md)

## 📌 Resumo

A Aula 07 relaciona **Node.js, Express, computação em nuvem e monitoramento do sistema operacional**. O conteúdo reúne um resumo teórico e um projeto prático de dashboard, além de orientações para comparar ambientes locais e serviços publicados na nuvem.

## 📂 Arquivos e subpastas

| Material | Conteúdo |
|---|---|
| [`Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md`](Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) | Texto de apoio sobre Node.js, Express, CORS, Render e comparação entre ambientes. |
| [`NEXUS-OS-OMEGA-V3-REFINADO-PTBR/`](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) | Projeto do painel NEXUS OS, com código-fonte, manifesto de dependências e relatório técnico. |
| `README.md` | Resumo e índice dos materiais da aula. |

## 🧠 Conteúdo do projeto

O dashboard da subpasta NEXUS OS utiliza o Node.js para reunir informações relacionadas ao processador, à memória, à rede, aos processos e ao tempo de atividade. Essas informações são disponibilizadas por rotas HTTP e apresentadas em uma interface web.

A proposta também inclui executar a aplicação em mais de um ambiente e observar diferenças de plataforma, arquitetura, recursos e comportamento do serviço. Em uma hospedagem remota, as métricas coletadas correspondem ao **ambiente do servidor**, e não ao computador do visitante.

## ☁️ Publicação e observações

O projeto pode ser configurado no Render utilizando a subpasta do NEXUS OS como diretório da aplicação, `npm ci` como comando de instalação e `npm start` para inicialização.

**Endereço registrado no material:** [Dashboard no Render](https://dashboard-monitoramento-1.onrender.com/). O endereço não confirma disponibilidade em tempo real.

A implementação contém uma incompatibilidade de esquemas na função NEXUS LINK e disponibiliza rotas de telemetria sem autenticação. Esses aspectos são detalhados no [relatório técnico do projeto](NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

**Referências:** [Node.js — módulo `os`](https://nodejs.org/api/os.html) · [Render — deploy Node/Express](https://render.com/docs/deploy-node-express-app).
