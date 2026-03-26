# Checklist de Teste Rápido

## Fluxos Base

- Login com professor, admin e DEV
- Logout e novo login mantendo tema/preferências
- Troca entre abas principais sem erro no console

## Alunos

- Criar aluno manualmente
- Editar aluno existente
- Abrir turma e histórico individual
- Banir e desbanir aluno quando permitido

## Professores

- Criar professor
- Editar professor
- Editar dados da própria conta
- Validar senha de 4 dígitos

## Avisos

- Criar aviso ativo
- Editar aviso existente
- Confirmar exibição do aviso após login

## Loja

- Abrir aba Loja com itens cadastrados
- Buscar item por nome
- Limpar busca e verificar contagem de resultados
- Abrir modal de novo item em tela pequena e confirmar scroll
- Abrir modal de editar item em tela pequena e confirmar scroll
- Cadastrar item com foto, valor e quantidade
- Editar item existente
- Adicionar item ao carrinho
- Revisar compra no carrinho

## Persistência e Sync

- Recarregar a página e confirmar persistência local
- Validar sync do WebView com `Webview\android-app\sync-web-assets.ps1`
- Conferir presença de `index.html`, `app.js`, `styles.css` e `vendor/` nos assets Android

## Build Android

- Rodar `App Android\gradlew.bat assembleDebug`
- Confirmar geração do APK debug sem erro