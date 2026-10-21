# Sistemas Operacionais — Aulas e projeto de monitoramento

Repositório da disciplina de Sistemas Operacionais com resumos em Markdown, atividades e uma aplicação Node.js de observabilidade. O material identifica como docente o Prof. Me. Deivison S. Takatu, com contato `deivison.takatu@fatec.sp.gov.br`.

## Navegação por aula

| Pasta | Conteúdo disponível |
|---|---|
| [Aula 01](Aula-1/README.md) | Introdução ao SO, kernel, recursos, avaliação e linha do tempo. |
| [Aula 02](Aula-2/README.md) | Evolução histórica: válvulas, transistores, lotes, multiprogramação, PCs e dispositivos móveis. |
| [Aula 03](Aula-3/README.md) | Tipos de sistemas operacionais e introdução à configuração do Git. |
| [Aula 04](Aula-4/README.md) | Instalação do Windows e estudo de ramificações de sistemas. |
| [Aula 05](Aula-5/README.md) | Comparativo de Kali Linux, Lubuntu, Zorin OS, Linux Mint e Fedora. |
| [Aula 06](Aula-6/README.md) | Pasta sem material de aula além do README; conteúdo pendente. |
| [Aula 07](Aula-7/README.md) | Nuvem, Express, deploy e projeto NEXUS OS. |

## Como estudar o acervo

Comece pelos conceitos da [Aula 01](Aula-1/README.md), avance para o histórico detalhado em [SO-modernos.md](Aula-2/SO-modernos.md) e consulte os guias das aulas seguintes conforme o tema. A [atividade de instalação do Windows](Aula-4/Atividade-1.md) relaciona kernel, processos, threads, drivers, E/S e sistema de arquivos em uma sequência prática.

Os arquivos são registros acadêmicos do repositório. As comparações e cronologias não devem ser interpretadas como medições de desempenho ou validações externas. Na [linha do tempo](Aula-1/Linha-do-tempo.md), por exemplo, há dois registros de iOS/Android, em 2007/8 e 2021; a duplicação está indicada no guia da aula.

## Conceitos que atravessam as aulas

| Conceito | Papel descrito no material |
|---|---|
| Sistema operacional | Gerenciar recursos e intermediar aplicações e hardware. |
| Kernel e privilégios | Núcleo de gerenciamento e distinção entre modo usuário e modo kernel. |
| CPU e processos | Distribuição de processamento e execução de programas; FIFO, Round Robin e prioridade aparecem na introdução. |
| Memória | Alocação, proteção, memória virtual, paginação e segmentação. |
| Arquivos, E/S e drivers | Organização dos dados e comunicação com dispositivos. |
| Virtualização e nuvem | Relação entre execução local, infraestrutura remota e observação dos recursos disponíveis. |

## Executar o projeto da Aula 07

A aplicação executável fica em uma subpasta; não há um `package.json` na raiz da disciplina.

```bash
cd Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR
npm ci
npm start
```

O [manifesto do projeto](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/package.json) exige Node.js 18 ou superior. O servidor usa a porta 3000 por padrão. Para reinício durante o desenvolvimento, use `npm run dev` nessa mesma pasta.

Consulte o [README da aplicação](Aula-7/NEXUS-OS-OMEGA-V3-REFINADO-PTBR/README.md) para métricas, endpoints, perfis de atualização e a incompatibilidade atual entre os esquemas do link remoto. O [resumo da Aula 07](Aula-7/Resumo_Aula_07_Nuvem_Sistemas_Operacionais.md) registra a proposta de comparar ambientes; a existência da proposta não comprova um deploy em segundo provedor.

## Avaliação e entregas registradas

A introdução registra a fórmula:

```text
Nota = (P1 × 0,25) + (P2 × 0,25) + ((PJ + AT) × 0,25)
```

P1 e P2 são provas; PJ é projeto e AT corresponde a atividades. A Aula 01 propõe grupos de três a cinco integrantes, resumo em Markdown e linha do tempo no Miro, exportada para o repositório. As entregas específicas aparecem nos guias das aulas.

## Referências já registradas no acervo

- TANENBAUM, A. S.; BOS, H. *Sistemas Operacionais Modernos*. 4. ed. São Paulo: Pearson, 2016.
- SILBERSCHATZ, A.; GALVIN, P. B.; GAGNE, G. *Fundamentos de Sistemas Operacionais*. 9. ed. Rio de Janeiro: LTC, 2015.
- STALLINGS, W. *Sistemas Operacionais: Conceitos e Projetos*. 8. ed. São Paulo: Pearson, 2015.
- DENARDIN, G. W.; BARRIQUELLO, C. H. *Sistemas Operacionais de Tempo Real e sua Aplicação em Sistemas Embarcados*. Porto Alegre: Editora da UFRGS, 2014.
- AWASTHI, A.; RAWAT, V. *Ramificação e Tarefas do Sistema Operacional*. Edições Nosso Conhecimento, 2023.
- DOWNEY, A. B. *Think OS: A Brief Introduction to Operating Systems*. Green Tea Press, 2015.
- RED HAT. *Red Hat Enterprise Linux – System Administration Guide*. Documentação Oficial.
- DOCKER INC. *Docker Documentation*. Disponível em: https://docs.docker.com

Essas referências integram o registro da disciplina. Este README foi reorganizado a partir dos arquivos locais, sem consulta externa às obras.
