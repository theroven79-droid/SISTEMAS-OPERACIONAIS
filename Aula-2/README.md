# Aula 02 — Evolução histórica dos Sistemas Operacionais

[Aula 01](../Aula-1/README.md) · [Índice da disciplina](../README.md) · [Aula 03](../Aula-3/README.md)

## 🎮 Fase 02 · Evolução tecnológica

> **Meta de aprendizado:** Justifique mudanças em técnicas de execução e interface usando os acontecimentos descritos no estudo histórico. XP abaixo são **simbólicos**, não ligados às notas da disciplina.

| Nível | Missão com evidência | Material | XP |
|---|---|---|--:|
| Linha do tempo | Ordenar gerações conforme o material | [SO-modernos.md](SO-modernos.md) | 15 |
| Comparar | Explicar lote vs. multiprogramação | [Panorama](#panorama-histórico) | 20 |
| Relacionar | Associar PC, redes e dispositivos móveis às mudanças da plataforma | [Estudo detalhado](SO-modernos.md) | 20 |

**Checkpoints pessoais**

- [ ] Sei definir spooling em contexto.
- [ ] Consigo diferenciar multiprogramação de compartilhamento de tempo.
- [ ] Consultei o glossário do texto expandido.

<details>
<summary><strong>🏅 Missão extra para aprofundamento</strong></summary>

Criar tabela comparando duas gerações quanto a hardware, forma de interação e método de execução.

</details>

**Observação:** As datas são divisões aproximadas adotadas pelo material; períodos recentes podem se sobrepor.

---


Estudo da evolução dos sistemas operacionais e de sua relação com as mudanças no hardware e nas formas de utilização dos computadores.

## Material de estudo

O arquivo [SO-modernos.md](SO-modernos.md) reúne o estudo detalhado, com base nas seções 1.2.1 a 1.2.5 de *Sistemas Operacionais Modernos*, de Andrew S. Tanenbaum e Herbert Bos.

## Panorama histórico

| Geração | Período apresentado no material | Tecnologia e temas |
|---|---|---|
| Primeira | 1945–1955 | Válvulas, programação em código de máquina e operação direta dos computadores. |
| Segunda | 1955–1965 | Transistores, mainframes, cartões perfurados e processamento em lote. |
| Terceira | 1965–1980 | Circuitos integrados, multiprogramação, spooling e compartilhamento de tempo. |
| Quarta | A partir de 1980 | Computadores pessoais, interfaces gráficas, redes e sistemas distribuídos. |
| Quinta | A partir de 1990 | Dispositivos móveis, smartphones e seus sistemas operacionais. |

Os períodos seguem a divisão adotada no material de estudo. As fases mais recentes se sobrepõem.

## Conceitos principais

- **Processamento em lote:** organização de tarefas para execução em sequência.
- **Multiprogramação:** manutenção de vários programas na memória para aproveitar a CPU enquanto uma tarefa aguarda entrada ou saída.
- **Spooling:** preparação e armazenamento de dados de entrada e saída em disco.
- **Compartilhamento de tempo:** alternância do atendimento entre usuários e tarefas.
- **Interfaces gráficas:** interação por elementos visuais.
- **Computação móvel:** integração de telefonia, aplicações e sensores em dispositivos portáteis.

O documento detalhado também apresenta MULTICS, UNIX, MINIX, Linux, POSIX, CP/M, MS-DOS e a evolução dos sistemas móveis. Ao final, há um glossário e uma linha do tempo.

## Atividades propostas

1. Produzir um resumo em Markdown com mais de 500 linhas sobre a história dos sistemas operacionais, conforme a orientação da atividade.
2. Expandir a linha do tempo no Miro e exportá-la em Markdown para o repositório.

Consulte também a [linha do tempo da Aula 01](../Aula-1/Linha-do-tempo.md).

---

## Linha do tempo para revisão

```mermaid
flowchart LR
    A["Válvulas"] --> B["Transistores e lotes"]
    B --> C["Circuitos integrados e multiprogramação"]
    C --> D["PCs, interfaces e redes"]
    D --> E["Sistemas móveis"]
```

| Tema-chave | Onde aprofundar | Ideia central |
|---|---|---|
| Processamento em lote | [SO-modernos.md](SO-modernos.md) | Execução de tarefas organizadas em sequência |
| Multiprogramação | [SO-modernos.md](SO-modernos.md) | Melhor uso da CPU durante esperas de E/S |
| Compartilhamento de tempo | [SO-modernos.md](SO-modernos.md) | Alternância de atendimento entre tarefas ou usuários |
| Sistemas pessoais e móveis | [SO-modernos.md](SO-modernos.md) | Evolução de hardware, interface e necessidades de uso |

## Perguntas para autoavaliação

1. Qual foi o papel dos transistores na evolução do hardware?
2. Por que a multiprogramação aumentou o aproveitamento do processador?
3. Como o compartilhamento de tempo mudou a interação com computadores?
4. Que diferenças de requisitos surgiram com os sistemas móveis?

**Nota cronológica:** a periodização segue o material da disciplina e usa faixas aproximadas. Os eventos tecnológicos reais não ocorreram em etapas totalmente isoladas. [Voltar ao índice](../README.md).
