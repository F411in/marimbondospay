# Push do Histórico

Este diretório contém a Cloud Function que envia notificações FCM quando o histórico do Banco dos Marimbondos recebe uma nova entrada.

## Pré-requisitos

1. Firebase CLI instalado
2. Projeto Firebase autenticado na sua máquina
3. FCM e Realtime Database habilitados no projeto banco-dos-marimbondos

## Instalação

No terminal, dentro de firebase-functions:

```bash
npm install
```

## Deploy

Se ainda não estiver autenticado:

```bash
firebase login
```

Selecione o projeto correto:

```bash
firebase use banco-dos-marimbondos
```

Publique apenas a função de notificação do histórico:

```bash
firebase deploy --only functions:notifyHistoryUpdate
```

## O que a função faz

- observa mudanças em marimbondos/shared/sync_manifest/data/history
- lê a entrada mais recente em marimbondos/shared/history/data
- envia uma mensagem FCM para o tópico history-updates

## Cliente Android

O app Android já:

- cria o canal history_updates
- assina o tópico history-updates
- exibe a notificação ao receber a mensagem