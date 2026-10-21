# 💻 Sistemas Operacionais — Materiais e atividades

Repositório acadêmico da disciplina de **Sistemas Operacionais**, com resumos, exercícios, comparações de distribuições Linux e um projeto prático de monitoramento utilizando Node.js.

**Professor:** Me. Deivison S. Takatu · **Contato:** [deivison.takatu@fatec.sp.gov.br](mailto:deivison.takatu@fatec.sp.gov.br)

## 📚 Índice das aulas

| Aula | Tema principal | Materiais |
|---:|---|---|
| 01 | Introdução, kernel, gerenciamento de recursos e linha do tempo. | [Aula 01](Aula-1/README.md) |
| 02 | Evolução histórica dos sistemas operacionais. | [Aula 02](Aula-2/README.md) |
| 03 | Categorias de sistemas operacionais e configuração do Git. | [Aula 03](Aula-3/README.md) |
| 04 | Instalação do Windows e ramificações de sistemas. | [Aula 04](Aula-4/README.md) |
| 05 | Comparação de distribuições Linux. | [Aula 05](Aula-5/README.md) |
| 06 | Pasta sem material específico disponível no repositório. | [Aula 06](Aula-6/README.md) |
| 07 | Computação em nuvem, Node.js e dashboard de monitoramento. | [Aula 07](Aula-7/README.md) |

Cada README funciona como um guia de navegação. Algumas aulas também possuem documentos `.md` adicionais com explicações e atividades mais extensas.

## 📌 Conteúdos estudados

| Área | Conceitos abordados |
|---|---|
| Arquitetura dos sistemas operacionais | Kernel, modos de execução e camadas do sistema. |
| Processamento | Processos, threads e escalonamento da CPU. |
| Gerenciamento de recursos | Memória, sistemas de arquivos, dispositivos e drivers. |
| Evolução histórica | Processamento em lote, multiprogramação e compartilhamento de tempo. |
| Tipos de sistemas | Servidores, computadores pessoais, dispositivos móveis e sistemas embarcados. |
| Atividades práticas | Git, ambientes Linux, Node.js, Express e publicação em nuvem. |

## 📊 Projeto prático — NEXUS OS

Na Aula 07, o repositório inclui o **NEXUS OS Omega V3**, um dashboard web que apresenta informações do sistema operacional e do processo Node.js. Entre os dados exibidos estão métricas de CPU, memória, rede, tempo de atividade, processos e requisições HTTP.

O código-fonte e a documentação estão disponíveis na pasta [`Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR`](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

### ⚙️ Executar localmente

**Pré-requisitos:** Node.js 18 ou superior e npm.

Na raiz deste repositório:

```bash
cd Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

Abra **http://localhost:3000** para acessar o painel. Para consultar as rotas HTTP, os recursos e as limitações de segurança, veja o [README do NEXUS OS](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md).

O monitor mostra informações do **ambiente que executa o servidor**. Uma instância publicada na nuvem não mede os recursos do computador de quem visita a página.

## 🧮 Avaliação mencionada no material

A expressão apresentada na introdução da disciplina é:

```text
Média = (P1 × 0,25) + (P2 × 0,25) + ((PJ + AT) × 0,25)
```

| Sigla | Significado |
|---|---|
| P1 | Primeira prova |
| P2 | Segunda prova |
| PJ | Projeto |
| AT | Atividades |

Esta é a fórmula registrada no material consultado. Para confirmar critérios de avaliação vigentes, siga as orientações do professor.

## 📖 Referências bibliográficas do material

- TANENBAUM, A. S.; BOS, H. *Sistemas Operacionais Modernos*. 4. ed. Pearson, 2016.
- SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE, G. *Fundamentos de Sistemas Operacionais*. 9. ed. LTC, 2015.
- STALLINGS, W. *Sistemas Operacionais: Conceitos e Projetos*. 8. ed. Pearson, 2015.
- DENARDIN, G. W.; BARRIQUELLO, C. H. *Sistemas Operacionais de Tempo Real e sua Aplicação em Sistemas Embarcados*. UFRGS, 2014.
- AWASTHI, A.; RAWAT, V. *Ramificação e Tarefas do Sistema Operacional*. Edições Nosso Conhecimento, 2023.
- DOWNEY, A. B. *Think OS*. Green Tea Press, 2015.
- RED HAT. *Red Hat Enterprise Linux — System Administration Guide*. Documentação oficial.
- [Docker Documentation](https://docs.docker.com/).
