# 💻 Sistemas Operacionais — Material acadêmico e projeto prático

Repositório de estudos da disciplina de **Sistemas Operacionais**, com resumos, atividades, comparativos de distribuições Linux e um projeto Node.js de monitoramento em nuvem.

**Professor:** Me. Deivison S. Takatu · **Contato:** [deivison.takatu@fatec.sp.gov.br](mailto:deivison.takatu@fatec.sp.gov.br)

## 🗺️ Navegação por aulas

| Aula | Tema | Documentação |
|---|---|---|
| 01 | Introdução, estrutura, kernel e linha do tempo | [Aula 01](Aula-1/README.md) |
| 02 | Evolução histórica dos sistemas operacionais | [Aula 02](Aula-2/README.md) |
| 03 | Tipos de SO e primeiros comandos Git | [Aula 03](Aula-3/README.md) |
| 04 | Instalação Windows e ramificações de sistemas | [Aula 04](Aula-4/README.md) |
| 05 | Comparação de distribuições Linux | [Aula 05](Aula-5/README.md) |
| 06 | Pasta sem material específico publicado | [Aula 06](Aula-6/README.md) |
| 07 | Computação em nuvem, Node.js e dashboard | [Aula 07](Aula-7/README.md) |

## 📌 Conteúdos centrais

| Eixo | Conceitos abordados |
|---|---|
| Arquitetura do SO | Kernel, modos de execução e camadas |
| Processamento | Processos, threads e escalonamento |
| Recursos | Memória, armazenamento, entrada/saída e drivers |
| História | Processamento em lote, multiprogramação e time-sharing |
| Ecossistemas | Servidores, dispositivos móveis, sistemas embarcados e distribuições Linux |
| Prática | Git, Node.js, Express, monitoramento e serviços em nuvem |

Os arquivos de aula funcionam como **índices de estudo**. Alguns textos mais extensos e atividades estão em `.md` separados, acessíveis pelos respectivos READMEs.

## 📊 Projeto aplicado — NEXUS OS

Na **Aula 07**, a aplicação [NEXUS OS Omega V3](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) coleta informações do SO e do processo Node.js, apresenta indicadores numa interface web e disponibiliza endpoints JSON e SSE.

```mermaid
flowchart LR
    A[SO e Node.js] --> B[Servidor Express]
    B --> C[Telemetria JSON / SSE]
    C --> D[Dashboard]
```

### Execução local

Requer **Node.js 18+** e npm. Na raiz deste repositório:

```bash
cd Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

Abra `http://localhost:3000` e consulte [a documentação do projeto](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) para as rotas e limitações.

## 🧮 Avaliação registrada no material

```text
Média = (P1 × 0,25) + (P2 × 0,25) + ((PJ + AT) × 0,25)
```

| Sigla | Significado |
|---|---|
| P1 / P2 | Primeira / segunda prova |
| PJ | Projeto |
| AT | Atividades |

A expressão acima está registrada no material da disciplina. Para critérios atuais de avaliação, consulte as orientações oficiais do professor.

## 📚 Referências bibliográficas do material

- TANENBAUM, A. S.; BOS, H. *Sistemas Operacionais Modernos*. 4. ed. Pearson, 2016.
- SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE, G. *Fundamentos de Sistemas Operacionais*. 9. ed. LTC, 2015.
- STALLINGS, W. *Sistemas Operacionais: Conceitos e Projetos*. 8. ed. Pearson, 2015.
- DENARDIN, G. W.; BARRIQUELLO, C. H. *Sistemas Operacionais de Tempo Real e sua Aplicação em Sistemas Embarcados*. UFRGS, 2014.
- AWASTHI, A.; RAWAT, V. *Ramificação e Tarefas do Sistema Operacional*. Edições Nosso Conhecimento, 2023.
- DOWNEY, A. B. *Think OS*. Green Tea Press, 2015.
- RED HAT. *Red Hat Enterprise Linux — System Administration Guide*. Documentação oficial.
- [Docker Documentation](https://docs.docker.com/).
