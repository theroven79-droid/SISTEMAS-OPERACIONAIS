# Aula 03 — Tipos de Sistemas Operacionais e Git

[Aula 02](../Aula-2/README.md) · [Índice da disciplina](../README.md) · [Aula 04](../Aula-4/README.md)

Resumo das categorias de sistemas operacionais e da configuração inicial de identidade no Git.

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

Substitua o nome e o e-mail pelos seus dados. A opção `--global` aplica a configuração ao usuário do Git.
