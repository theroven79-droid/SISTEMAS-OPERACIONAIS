# Aula 03 — Tipos de Sistemas Operacionais e Git

[Aula anterior](../Aula-2/README.md) · [Índice da disciplina](../README.md) · [Próxima aula](../Aula-4/README.md)

Resumo dos contextos de uso de sistemas operacionais e da configuração inicial de identidade no Git, conforme o conteúdo disponível nesta pasta.

## Tipos e contextos de uso

| Categoria | Características registradas | Exemplos citados |
|---|---|---|
| Mainframes | Grande volume de E/S e transações, confiabilidade e processamento em lote | OS/360, OS/390, Linux e UNIX em ambientes corporativos |
| Servidores | Atendimento simultâneo a usuários e serviços de rede | Linux e Windows Server |
| Multiprocessadores | Paralelismo, balanceamento, sincronização e coerência de cache | Múltiplas CPUs ou núcleos |
| Computadores pessoais | Interface gráfica, multimídia e multiprogramação | Windows, macOS e Linux |
| Portáteis | Economia de energia, sensores e isolamento de aplicações | Android e iOS |
| Embarcados | Hardware dedicado e recursos restritos | Embedded Linux, QNX e VxWorks |
| Nós sensores | Bateria limitada, eventos e comunicação sem fio | TinyOS e Contiki |
| Tempo real | Atendimento a prazos de execução | Hard real-time e soft real-time |
| Cartões inteligentes | Memória restrita, criptografia e isolamento por applets | Smart cards |

O material diferencia **hard real-time**, com prazos rígidos, de **soft real-time**, que admite degradações ou atrasos ocasionais. As categorias descrevem finalidades e requisitos; não constituem uma lista de projetos implementados nesta pasta.

## Introdução ao Git

Git é apresentado como ferramenta de controle de versão para rastrear mudanças e sincronizar repositórios. Os comandos registrados para configurar a identidade são:

```bash
git config --global user.name "<Nome>"
git config --global user.email "<Email>"
```

Substitua os campos pela identidade que deseja registrar. A opção `--global` grava a configuração do usuário do Git.

## Alcance do material

O resumo original termina nessa configuração inicial. Não há nesta pasta um roteiro completo de commits, branches, publicação ou exercícios de Git. A organização acima preserva o conteúdo disponível e fecha o bloco de comandos que estava incompleto.
