# 💻 Aula 03 — Tipos de Sistemas Operacionais e Git

Esta aula reúne duas frentes de estudo: os diferentes ambientes em que um **sistema operacional** pode atuar e os primeiros comandos para configurar a identidade de quem utiliza o **Git**.

## 🧠 Onde os sistemas operacionais são utilizados?

| Categoria | Contexto de uso |
|---|---|
| **Mainframes e servidores** | Processamento de grandes volumes de dados e oferta de serviços. |
| **Multiprocessadores** | Distribuição do processamento entre vários processadores ou núcleos. |
| **Computadores pessoais** | Aplicações de uso cotidiano e interação com o usuário. |
| **Dispositivos móveis** | Smartphones e tablets, com atenção a recursos portáteis. |
| **Embarcados e nós sensores** | Equipamentos dedicados a funções específicas. |
| **Tempo real** | Aplicações que precisam respeitar prazos de resposta, rígidos ou flexíveis. |
| **Cartões inteligentes** | Operações em dispositivos com recursos computacionais restritos. |

## 🔧 Configuração inicial do Git

Os comandos abaixo definem o nome e o e-mail associados aos commits realizados no computador:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Para consultar os valores configurados:

```bash
git config --global --get user.name
git config --global --get user.email
```

A opção `--global` mantém essas informações na configuração do usuário. Ela não substitui o login ou a autenticação no GitHub.

**Referência:** [Documentação do `git config`](https://git-scm.com/docs/git-config).

---

[← Aula 02](../Aula-2/README.md) · [📚 Índice da disciplina](../README.md) · [Aula 04 →](../Aula-4/README.md)
