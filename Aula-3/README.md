# 💻 Relatório da pasta — Aula 03: tipos de sistemas operacionais e Git

[← Aula 02](../Aula-2/README.md) · [Relatório da disciplina](../README.md) · [Aula 04 →](../Aula-4/README.md)

## 📌 Resumo

O conteúdo desta aula combina dois assuntos: a **classificação dos sistemas operacionais conforme sua aplicação** e a **configuração da identidade do usuário no Git**. A pasta contém o próprio `README.md`, que registra os conceitos e comandos estudados.

## 🧠 Tipos de sistemas operacionais

| Categoria | Características gerais |
|---|---|
| Mainframes e servidores | Processamento de grande volume de dados e fornecimento de serviços. |
| Multiprocessadores | Execução de tarefas em vários processadores ou núcleos. |
| Computadores pessoais | Aplicações de uso geral e interfaces para interação com usuários. |
| Sistemas móveis | Recursos adaptados a dispositivos portáteis, sensores e consumo de energia. |
| Sistemas embarcados e nós sensores | Funcionamento voltado a finalidades específicas e, muitas vezes, a recursos limitados. |
| Sistemas de tempo real | Execução de tarefas sujeitas a prazos de resposta. |
| Cartões inteligentes | Processamento e armazenamento restritos, com foco em segurança. |

A distinção entre tempo real **rígido (*hard real-time*)** e **flexível (*soft real-time*)** também faz parte do conteúdo.

## 🔧 Comandos Git registrados

A aula apresenta comandos para definir e consultar a identidade padrão utilizada nos commits:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
git config --global --get user.name
git config --global --get user.email
```

A opção `--global` preserva a configuração no ambiente do usuário, normalmente entre reinicializações. Essa definição **não substitui a autenticação na plataforma GitHub**.

## 🔎 Considerações

O material reúne conceitos de arquitetura e exemplos de diferentes ambientes de execução. Os comandos apresentados dizem respeito à configuração local do Git; não criam repositórios nem publicam arquivos automaticamente.

**Referência:** [Documentação oficial de `git config`](https://git-scm.com/docs/git-config).
