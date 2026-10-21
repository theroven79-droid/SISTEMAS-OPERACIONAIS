# 💻 Aula 03 — Tipos de sistemas operacionais e introdução ao Git

[← Aula 02](../Aula-2/README.md) · [Índice da disciplina](../README.md) · [Aula 04 →](../Aula-4/README.md)

A aula apresenta diferentes categorias de sistemas operacionais e introduz os comandos necessários para configurar a identidade utilizada nos commits do Git.

## 🧠 Categorias de sistemas operacionais

| Categoria | Características | Exemplos ou aplicações citados |
|---|---|---|
| Mainframes | Processamento de grande volume de transações e operações de entrada e saída. | OS/360, OS/390, Linux e UNIX. |
| Servidores | Disponibilização de serviços de rede e atendimento simultâneo a usuários. | Linux e Windows Server. |
| Multiprocessadores | Processamento paralelo e sincronização entre CPUs ou núcleos. | Equipamentos com múltiplos processadores ou núcleos. |
| Computadores pessoais | Execução de aplicações de uso geral e interfaces gráficas. | Windows, macOS e Linux. |
| Dispositivos móveis | Gerenciamento de energia, sensores e aplicações. | Android e iOS. |
| Sistemas embarcados | Execução em dispositivos com finalidades específicas. | Embedded Linux, QNX e VxWorks. |
| Nós sensores | Operação com poucos recursos e consumo reduzido de energia. | TinyOS e Contiki. |
| Tempo real | Cumprimento de prazos de resposta. | Sistemas de controle e aplicações críticas. |
| Cartões inteligentes | Restrições de processamento e memória, com recursos de segurança. | Smart cards. |

Nos sistemas de **tempo real rígido (*hard real-time*)**, o descumprimento de um prazo pode comprometer o funcionamento esperado. Nos sistemas de **tempo real flexível (*soft real-time*)**, atrasos podem provocar perda de qualidade sem necessariamente inviabilizar toda a operação.

## ⚙️ Configurar nome e e-mail no Git

No Git Bash ou em outro terminal com Git instalado:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Para verificar os valores configurados:

```bash
git config --global --get user.name
git config --global --get user.email
```

Para consultar a origem das configurações:

```bash
git config --list --show-origin
```

A opção `--global` define as informações padrão do usuário e normalmente mantém essas configurações entre reinicializações. **Ela não autentica a conta no GitHub**; autenticação e identidade dos commits são conceitos diferentes.

**Referência:** [documentação oficial de `git config`](https://git-scm.com/docs/git-config).

[Continuar para a Aula 04 →](../Aula-4/README.md)
