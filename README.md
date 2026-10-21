# Sistemas Operacionais

Resumos, atividades e projeto prático da disciplina de Sistemas Operacionais.

**Professor:** Me. Deivison S. Takatu

**Contato:** [deivison.takatu@fatec.sp.gov.br](mailto:deivison.takatu@fatec.sp.gov.br)

## Conteúdo do repositório

| Aula | Tema | Material |
|---|---|---|
| 01 | Introdução aos sistemas operacionais | [Resumo e linha do tempo](Aula-1/README.md) |
| 02 | Evolução histórica dos sistemas operacionais | [Resumo e estudo detalhado](Aula-2/README.md) |
| 03 | Tipos de sistemas operacionais e introdução ao Git | [Resumo da aula](Aula-3/README.md) |
| 04 | Instalação do Windows e ramificações de sistemas | [Atividades](Aula-4/README.md) |
| 05 | Comparação de distribuições Linux | [Comparativo](Aula-5/README.md) |
| 06 | O conteúdo não está nesta página. | [Pasta da aula](Aula-6/) |
| 07 | Nuvem e monitoramento do sistema operacional | [Resumo e projeto NEXUS OS](Aula-7/README.md) |

## Temas de estudo

- **Estrutura do sistema operacional:** kernel, camadas e modos de execução.
- **Gerenciamento de recursos:** CPU, processos, memória e dispositivos.
- **Organização dos dados:** sistemas de arquivos e operações de entrada e saída.
- **Evolução dos sistemas:** processamento em lote, multiprogramação, computadores pessoais e dispositivos móveis.
- **Ambientes de execução:** distribuições Linux, execução local e serviços em nuvem.

A [Aula 01](Aula-1/README.md) apresenta os fundamentos. A [Aula 02](Aula-2/SO-modernos.md) aprofunda o estudo histórico. A [atividade de instalação do Windows](Aula-4/Atividade-1.md) aplica os conceitos de kernel, processos, threads, drivers e sistema de arquivos.

## Projeto prático: NEXUS OS

O projeto da Aula 07 é um dashboard desenvolvido com Node.js, Express e Helmet. Ele apresenta informações do sistema operacional e do processo Node.js, como CPU, memória, rede e tempo de atividade.

Com Node.js 18 ou superior e npm disponíveis, execute os comandos a partir da raiz deste repositório:

```bash
cd Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

O servidor utiliza a porta 3000 por padrão. As instruções de desenvolvimento e as descrições das rotas e dos recursos estão no [README do projeto](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

## Avaliação

A fórmula apresentada na introdução da disciplina é:

```text
Média = (P1 × 0,25) + (P2 × 0,25) + ((PJ + AT) × 0,25)
```

| Sigla | Significado |
|---|---|
| P1 | Primeira prova |
| P2 | Segunda prova |
| PJ | Projeto |
| AT | Atividades |

As propostas de entrega estão nos materiais de cada aula. A Aula 01 orienta a formação de grupos de três a cinco integrantes e a organização das atividades em um repositório GitHub.

## Referências bibliográficas

- TANENBAUM, A. S.; BOS, H. *Sistemas Operacionais Modernos*. 4. ed. São Paulo: Pearson, 2016.
- SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE, G. *Fundamentos de Sistemas Operacionais*. 9. ed. Rio de Janeiro: LTC, 2015.
- STALLINGS, W. *Sistemas Operacionais: Conceitos e Projetos*. 8. ed. São Paulo: Pearson, 2015.
- DENARDIN, G. W.; BARRIQUELLO, C. H. *Sistemas Operacionais de Tempo Real e sua Aplicação em Sistemas Embarcados*. Porto Alegre: Editora da UFRGS, 2014.
- AWASTHI, A.; RAWAT, V. *Ramificação e Tarefas do Sistema Operacional*. Edições Nosso Conhecimento, 2023.
- DOWNEY, A. B. *Think OS: A Brief Introduction to Operating Systems*. Green Tea Press, 2015.
- RED HAT. *Red Hat Enterprise Linux — System Administration Guide*. Documentação oficial.
- DOCKER INC. [*Docker Documentation*](https://docs.docker.com/).
