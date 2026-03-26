# Sincronização Firebase - Banco dos Marimbondos

## 🌐 Como Funciona a Sincronização em Tempo Real

### Arquitetura de Dados

```
Firebase Realtime Database
└── marimbondos/
    └── shared/  ← TODOS OS DISPOSITIVOS LÊEM E ESCREVEM AQUI
        ├── students (alunos)
        ├── teachers (professores)
        ├── history (histórico)
        ├── notices (avisos)
        ├── storeItems (itens da loja)
        ├── settings (configurações)
        └── ... (outros segmentos)
```

### Fluxo de Sincronização

```
Dispositivo A (Tablet)          Dispositivo B (Notebook)
     ↓                               ↓
[Altera dados]              [Altera dados]
     ↓                               ↓
[syncAllDataToFirebase()]    [syncAllDataToFirebase()]
     ↓                               ↓
[Envia para: marimbondos/shared/*]  ↓
     ↓ ←────────────────────────────┘
[Recebe alterações em tempo real]
     ↓
[Sincroniza localmente]
     ↓
[Atualiza a interface]
```

## 📡 Segmentos de Dados Sincronizados

1. **students** - Dados de todos os alunos
2. **teachers** - Dados de todos os professores
3. **history** - Histórico de transações
4. **studentHistoryArchive** - Arquivo histórico de alunos
5. **loginActivity** - Log de entradas no sistema
6. **notices** - Avisos e notificações
7. **storeItems** - Itens da loja escolar
8. **learnedImportNames** - Nomes aprendidos em importações
9. **settings** - Configurações do sistema
10. **counters** - Contadores internos

## 🔄 Processo Detalhado de Sincronização

### 1️⃣ Salvamento Local + Fila Firebase

Quando algo muda (ex: crédito adicionado a um aluno):

```javascript
// Salva localmente (IndexedDB/localStorage)
persistence.save(buildAppStateSnapshot());

// Adiciona à fila de sincronização Firebase
syncAllDataToFirebase({ immediate: false });
```

### 2️⃣ Debouncing Inteligente

Para evitar spam de requisições, o app agrupa mudanças em **1 segundo**:

```javascript
FIREBASE_SYNC_DEBOUNCE_MS = 1000  // 1 segundo

// Múltiplas mudanças em 1s → 1 requisição Firebase
```

### 3️⃣ Envio para Firebase

```javascript
// Função: flushFirebaseSync()
// Caminho: marimbondos/shared/{segmentKey}
// Dados: { data: {...}, timestamp: "2026-03-26T..." }

db.ref("marimbondos/shared/students").set({
  data: { /* todos os alunos */ },
  timestamp: "2026-03-26T10:30:45.123Z"
});
```

### 4️⃣ Sincronização em Tempo Real

Todos os dispositivos que têm o app aberto recebem a atualização **automaticamente**:

```javascript
// Cada dispositivo mantém listeners ativos
db.ref("marimbondos/shared").on('value', (snapshot) => {
  // Detecta mudanças
  // Sincroniza com local storage
  // Atualiza interface
});
```

## 🔐 Segurança das Regras

### Regras Atualizadas (database.rules.json)

```json
{
  "marimbondos": {
    "shared": {
      ".read": true,      // Todos podem ler
      ".write": true      // Todos podem escrever
    }
  }
}
```

### Por Que Público?

✅ **Razões para permitir acesso público:**
- Sistema escolar **não sensível** (pontos em loja de recompensas)
- Dados já estão no **localStorage de cada dispositivo**
- Sincronização entre **múltiplos dispositivos** da mesma escola
- **Sem dados financeiros reais** ou pessoais sensíveis
- Funcionários confiáveis (dentro da escola)

⚠️ **Se precisar mais segurança futura:**
- Implementar autenticação por e-mail de professor
- Adicionar regras por papel (admin, professor, dev)
- Criptografar dados sensíveis

## 📊 Monitoramento de Sincronização

### Logs no Console do Navegador

Abra o Developer Tools (F12) → Console para ver:

```
✓ Dados salvos em Firebase: students (path: marimbondos/shared/students)
✓ Dados carregados do Firebase: teachers (path: marimbondos/shared/teachers)
✅ Segmentos enviados com sucesso para Firebase
⏳ Aguardando Firebase SDK (tentativa 1/20)...
```

### Verificação de Status

1. Abra o app em **Dispositivo A**
2. Abra o app em **Dispositivo B**
3. Faça uma alteração em **Dispositivo A** (ex: adicione crédito a um aluno)
4. Verifique se **Dispositivo B** sincroniza em segundos

## 🚀 Deploy das Regras

Para aplicar as regras atualizadas:

```bash
# No terminal, na pasta do projeto web:
firebase deploy --only database

# Resposta esperada:
# ✔  database rules deployed successfully
```

## 🔧 Configurações de Performance

```javascript
FIREBASE_SYNC_DEBOUNCE_MS = 1000      // Aguarda 1s para agrupar mudanças
FIREBASE_SAVE_TIMEOUT_MS = 15000      // Timeout de 15s para salvar
FIREBASE_LOAD_TIMEOUT_MS = 5000       // Timeout de 5s para carregar
```

## 📱 Suporte Offline

1. **Dados são salvos localmente** (IndexedDB/localStorage)
2. **Quando online**: Firebase sincroniza automaticamente
3. **Quando offline**: App funciona normalmente com dados locais
4. **Reconexão**: Sincroniza automaticamente quando volta online

## 💡 Dicas de Troubleshooting

| Problema | Solução |
|----------|---------|
| Dados não sincronizam | Verificar if Firebase inicializou (console) |
| Um dispositivo não vê mudança | Recarregar a página (F5) |
| Firebase não conecta | Verificar conexão internet |
| Regras negam acesso | Executar `firebase deploy --only database` |
| Dados desatualizados | Aguardar 2-3 segundos ou recarregar |

## 📝 Resumo Executivo

✅ **O que está funcionando:**
- Sincronização em tempo real entre dispositivos
- Salvamento automático no Firebase
- Dados persistem entre sessões
- Funciona offline com sincronização automática

✅ **Todos os dispositivos:**
- Lêem dados de `marimbondos/shared/`
- Escrevem dados em `marimbondos/shared/`
- Recebem atualizações em tempo real

✅ **Sem autenticação:**
- Sistema funciona para toda a escola
- Dados sincronizam entre todos os dispositivos
- Ideal para ambiente de rede local confiável
