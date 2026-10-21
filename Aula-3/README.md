# 🧩 Aula 03 — Tipos de Sistemas Operacionais e Git

[← Aula 02](../Aula-2/README.md) · [Índice](../README.md) · [Aula 04 →](../Aula-4/README.md)

A aula compara categorias de sistemas operacionais e introduz a configuração de identidade do Git.

## 💻 Tipos de sistemas operacionais

| Categoria | Principal característica | Exemplos citados no material |
|---|---|---|
| Mainframes | Alto volume de transações e E/S | OS/360, OS/390, Linux e UNIX |
| Servidores | Serviços de rede e vários usuários | Linux, Windows Server |
| Multiprocessadores | Execução paralela e sincronização | Computadores com várias CPUs/núcleos |
| Pessoais | Interface gráfica e aplicações de uso geral | Windows, macOS e Linux |
| Móveis | Gestão de energia, sensores e isolamento | Android, iOS |
| Embarcados | Hardware e finalidade específicos | Embedded Linux, QNX, VxWorks |
| Nós sensores | Baixo consumo e comunicação sem fio | TinyOS, Contiki |
| Tempo real | Resposta dentro de prazos | Sistemas críticos de controle |
| Cartões inteligentes | Restrições de memória e criptografia | Smart cards |

Em sistemas **hard real-time**, perder um prazo pode constituir falha crítica. Em **soft real-time**, atrasos ocasionais podem ser tolerados com perda de qualidade.

## ⚙️ Configurar identidade no Git

No terminal ou Git Bash:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Verificar as definições:

```bash
git config --global --get user.name
git config --global --get user.email
git config --list --show-origin
```

`--global` configura a identidade padrão de commits do usuário, persistindo normalmente entre reinicializações. Isso **não substitui a autenticação no GitHub**.

**Documentação oficial:** [git-config](https://git-scm.com/docs/git-config).
