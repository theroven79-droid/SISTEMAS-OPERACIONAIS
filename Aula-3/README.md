# Aula 03 — Tipos de Sistemas Operacionais e Git

[Aula 02](../Aula-2/README.md) · [Índice da disciplina](../README.md) · [Aula 04](../Aula-4/README.md)

## 🎮 Fase 03 · Sistemas e versionamento

> **Meta de aprendizado:** Demonstre que você reconhece famílias de sistemas operacionais e sabe configurar a identidade persistente do Git. XP abaixo são **simbólicos**, não ligados às notas da disciplina.

| Nível | Missão com evidência | Material | XP |
|---|---|---|--:|
| Classificar | Distinguir servidor, embarcado e tempo real | [Categorias](#tipos-de-sistemas-operacionais) | 15 |
| Configurar | Definir nome e e-mail no Git com --global | [Comandos](#guia-prático-de-identidade-no-git) | 20 |
| Verificar | Consultar a origem das configurações | [Comandos Git](#guia-prático-de-identidade-no-git) | 20 |

**Checkpoints pessoais**

- [ ] Sei diferenciar hard e soft real-time.
- [ ] Consigo explicar `--global` em `git config`.
- [ ] Verifiquei `user.name` e `user.email` localmente.

<details>
<summary><strong>🏅 Missão extra para aprofundamento</strong></summary>

Criar um repositório de teste e inspecionar o autor do commit, sem publicar dados pessoais desnecessários.

</details>

**Observação:** A identidade configurada no Git não autentica sua conta no GitHub por si só.

---


Resumo das categorias de sistemas operacionais e da configuração inicial da identidade no Git.

## Tipos de sistemas operacionais

| Categoria | Características | Exemplos ou aplicações citados |
|---|---|---|
| Mainframes | Grande volume de entrada e saída, processamento de transações e confiabilidade. | OS/360, OS/390, Linux e UNIX em ambientes corporativos. |
| Servidores | Atendimento simultâneo a usuários e oferta de serviços de rede. | Linux e Windows Server. |
| Multiprocessadores | Processamento paralelo, balanceamento de carga, sincronização e coerência de cache. | Sistemas com múltiplas CPUs ou núcleos. |
| Computadores pessoais | Interface gráfica, multimídia e execução de diferentes programas. | Windows, macOS e Linux. |
| Dispositivos móveis | Gerenciamento de energia, sensores e isolamento das aplicações. | Android e iOS. |
| Sistemas embarcados | Execução em hardware dedicado e com recursos restritos. | Embedded Linux, QNX, VxWorks, eletrodomésticos e sistemas automotivos. |
| Nós sensores | Baixo consumo de energia, funcionamento orientado a eventos e comunicação sem fio. | TinyOS e Contiki. |
| Sistemas de tempo real | Atendimento a prazos de execução. | Controle de voo e transmissão de mídia. |
| Cartões inteligentes | Memória restrita, criptografia e isolamento de aplicações. | Smart cards. |

### Sistemas de tempo real

- **Hard real-time:** exige o cumprimento de prazos rígidos.
- **Soft real-time:** admite atrasos ocasionais ou degradações de qualidade.

## Introdução ao Git

O Git é uma ferramenta de controle de versão utilizada para acompanhar alterações nos arquivos e sincronizar repositórios.

Os comandos apresentados na aula configuram a identidade utilizada nos commits:

```bash
git config --global user.name "Seu nome"
git config --global user.email "seu-email@exemplo.com"
```

Substitua o nome e o e-mail pelos seus dados. A opção `--global` define a identidade padrão do usuário do Git.

---

## Guia prático de identidade no Git

```mermaid
flowchart LR
    A["Configurar nome e e-mail"] --> B["Verificar configuração"]
    B --> C["Realizar commits identificados"]
```

No Git Bash ou terminal integrado do VS Code:

```bash
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
git config --global --get user.name
git config --global --get user.email
```

A configuração `--global` é persistida no arquivo de configuração do usuário, portanto normalmente não precisa ser repetida a cada reinício do computador. Para inspecionar as origens das definições:

```bash
git config --list --show-origin
```

## Comparando tipos de sistemas operacionais

| Grupo | Prioridade de projeto |
|---|---|
| Tempo real | Previsibilidade e cumprimento de prazos |
| Servidores | Compartilhamento de serviços e atendimento simultâneo |
| Móveis | Energia, conectividade e sensores |
| Embarcados | Hardware e finalidade específicos |
| Computadores pessoais | Interação e variedade de aplicações |

**Referências:** [Documentação oficial do Git](https://git-scm.com/docs/git-config) · [Guia GitHub para começar a usar o Git](https://docs.github.com/pt/get-started/using-git).

[← Aula 02](../Aula-2/README.md) · [Aula 04 →](../Aula-4/README.md).
