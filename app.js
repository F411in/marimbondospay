        // --- SISTEMA DE PERSISTÊNCIA COM LOCALSTORAGE ---
        class DataPersistence {
            constructor() {
                this.storageKey = 'marimbondos_db';
                this.dbName = 'MarimbondosDB';
                this.storeName = 'appData';
                this.db = null;
                this.dbInitPromise = null; // inicialização adiada para melhorar tempo de boot
            }

            // Garante inicialização lazy do IndexedDB quando necessário
            ensureInit() {
                if (!this.dbInitPromise) {
                    this.dbInitPromise = this.initIndexedDB();
                }
                return this.dbInitPromise;
            }

            initIndexedDB() {
                if (!('indexedDB' in window)) {
                    console.warn('IndexedDB não disponível, usando localStorage');
                    return Promise.resolve(null);
                }

                return new Promise(resolve => {
                    const request = indexedDB.open(this.dbName, 1);

                    request.onerror = () => {
                        console.error('Erro ao abrir IndexedDB');
                        resolve(null);
                    };

                    request.onsuccess = (e) => {
                        this.db = e.target.result;
                        console.log('✓ IndexedDB inicializado');
                        resolve(this.db);
                    };

                    request.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName);
                        }
                    };
                });
            }

            save(data) {
                this.saveToLocalStorage(data);

                if (this.db) {
                    try {
                        const transaction = this.db.transaction([this.storeName], 'readwrite');
                        const store = transaction.objectStore(this.storeName);
                        store.put(data, this.storageKey);
                        console.log('✓ Dados salvos em IndexedDB');
                    } catch(err) {
                        console.warn('Erro ao salvar em IndexedDB:', err);
                    }
                    return;
                }

                this.ensureInit()?.then(db => {
                    if (!db) return;
                    try {
                        const transaction = db.transaction([this.storeName], 'readwrite');
                        const store = transaction.objectStore(this.storeName);
                        store.put(data, this.storageKey);
                        console.log('✓ Dados espelhados no IndexedDB');
                    } catch(err) {
                        console.warn('Erro ao salvar em IndexedDB:', err);
                    }
                });
            }

            saveToLocalStorage(data) {
                try {
                    localStorage.setItem(this.storageKey, JSON.stringify(data));
                    console.log('✓ Dados salvos em localStorage');
                } catch(err) {
                    console.error('Erro ao salvar em localStorage:', err);
                }
            }

            load() {
                if (this.db) {
                    return new Promise((resolve) => {
                        try {
                            const transaction = this.db.transaction([this.storeName], 'readonly');
                            const store = transaction.objectStore(this.storeName);
                            const request = store.get(this.storageKey);
                            
                            request.onsuccess = () => {
                                if (request.result) {
                                    console.log('✓ Dados carregados de IndexedDB');
                                    resolve(request.result);
                                } else {
                                    resolve(this.loadFromLocalStorage());
                                }
                            };
                            
                            request.onerror = () => {
                                console.warn('Erro ao carregar de IndexedDB');
                                resolve(this.loadFromLocalStorage());
                            };
                        } catch(err) {
                            console.warn('Erro ao acessar IndexedDB:', err);
                            resolve(this.loadFromLocalStorage());
                        }
                    });
                } else {
                    return this.ensureInit().then(db => {
                        if (!db) {
                            return this.loadFromLocalStorage();
                        }

                        return new Promise(resolve => {
                            try {
                                const transaction = db.transaction([this.storeName], 'readonly');
                                const store = transaction.objectStore(this.storeName);
                                const request = store.get(this.storageKey);

                                request.onsuccess = () => {
                                    if (request.result) {
                                        console.log('✓ Dados carregados de IndexedDB');
                                        resolve(request.result);
                                    } else {
                                        resolve(this.loadFromLocalStorage());
                                    }
                                };

                                request.onerror = () => {
                                    console.warn('Erro ao carregar de IndexedDB');
                                    resolve(this.loadFromLocalStorage());
                                };
                            } catch(err) {
                                console.warn('Erro ao acessar IndexedDB:', err);
                                resolve(this.loadFromLocalStorage());
                            }
                        });
                    });
                }
            }

            loadFromLocalStorage() {
                try {
                    const data = localStorage.getItem(this.storageKey);
                    if (data) {
                        console.log('✓ Dados carregados de localStorage');
                        return JSON.parse(data);
                    }
                    return null;
                } catch(err) {
                    console.error('Erro ao carregar de localStorage:', err);
                    return null;
                }
            }

            clear() {
                // Limpar IndexedDB
                if (this.db) {
                    try {
                        const transaction = this.db.transaction([this.storeName], 'readwrite');
                        const store = transaction.objectStore(this.storeName);
                        store.delete(this.storageKey);
                    } catch(err) {
                        console.warn('Erro ao limpar IndexedDB:', err);
                    }
                }
                
                // Limpar localStorage
                try {
                    localStorage.removeItem(this.storageKey);
                } catch(err) {
                    console.error('Erro ao limpar localStorage:', err);
                }
            }
        }

        const persistence = new DataPersistence();

        // Atualiza a UI da splash com progresso (step: 1-10)
        function updateSplashProgress(step = 0, message = '') {
            try {
                const pct = Math.min(100, Math.round((Number(step) || 0) / 10 * 100));
                const bar = document.getElementById('splash-progress-bar');
                const text = document.getElementById('splash-progress');
                const splash = document.getElementById('splash-screen');
                if (bar) {
                    bar.style.width = pct + '%';
                    bar.setAttribute('aria-valuenow', String(pct));
                }
                const percentEl = document.getElementById('splash-percent');
                if (percentEl) percentEl.textContent = pct + '%';
                if (text) {
                    text.textContent = message || (pct >= 100 ? 'Pronto' : `Inicializando — ${pct}%`);
                }
                // Ajuste de tema da splash
                if (splash) {
                    const mode = typeof getCurrentThemeMode === 'function' ? getCurrentThemeMode() : (document.documentElement.classList.contains('dark') ? 'dark' : 'light');
                    if (mode === 'dark') {
                        splash.classList.add('splash-dark');
                    } else {
                        splash.classList.remove('splash-dark');
                    }
                }
            } catch (e) {
                console.warn('updateSplashProgress falhou', e);
            }
        }

        // --- CONFIGURAÇÃO FIREBASE ---
        // ⚠️ IMPORTANTE: Você precisa configurar suas credenciais do Firebase
        // Siga os passos:
        // 1. Vá para https://console.firebase.google.com
        // 2. Crie um novo projeto ou use um existente
        // 3. Copie os dados de configuração do seu projeto
        // 4. Cole as informações abaixo:
        
        const firebaseConfig = {
            apiKey: "AIzaSyAef3eDWhfs7KhLGFjn5rEsPktyPNckOrI",
            authDomain: "banco-dos-marimbondos.firebaseapp.com",
            projectId: "banco-dos-marimbondos",
            storageBucket: "banco-dos-marimbondos.appspot.com",
            messagingSenderId: "450318154980",
            appId: "1:450318154980:web:249c6899ffc310703f00f1"
        };

        let firebaseInitialized = false;
        let firebaseUser = null;
        let db = null;
        let firebaseListeners = {}; // Armazenar listeners ativos para limpeza
        let lastAppliedRemoteTimestamp = '';
        let lastAppliedRemoteSignature = '';
        let uiRefreshTimer = null;
        let firebaseSyncTimer = null;
        let pendingRealtimeNavigationRefresh = false;
        let pendingFirebaseSegments = {};
        let firebaseSyncInFlight = false;
        let firebaseSyncRetryRequested = false;
        const FIREBASE_SYNC_DEBOUNCE_MS = 450;
        const FIREBASE_SAVE_TIMEOUT_MS = 12000;
        const FIREBASE_SYNC_MANIFEST_KEY = 'sync_manifest';
        const FIREBASE_STATE_SEGMENT_KEYS = ['settings', 'students', 'teachers', 'history', 'studentHistoryArchive', 'loginActivity', 'notices', 'storeItems', 'learnedImportNames', 'counters'];
        let firebaseSegmentTimestamps = {};
        let firebasePendingSegmentTimestamps = {};
        let firebaseSegmentSignatures = {};
        let firebaseManifestCache = {};
        const FIREBASE_SYNC_WARNING_COOLDOWN_MS = 15000;
        let firebaseSyncWarningState = {
            lastWarningAt: 0,
            hasPendingRecoveryNotice: false
        };

        function normalizeFirebasePathSegment(segment) {
            if (!segment || typeof segment !== 'string') return 'local';
            return segment
                .trim()
                .replace(/\./g, '_')
                .replace(/\#/g, '_')
                .replace(/\$/g, '_')
                .replace(/\[/g, '_')
                .replace(/\]/g, '_')
                .replace(/\//g, '_')
                .replace(/@/g, '_at_')
                .replace(/\s+/g, '_')
                .replace(/[^a-zA-Z0-9_\-]/g, '_') || 'local';
        }

        function withAsyncTimeout(promise, timeoutMs, timeoutMessage) {
            let timeoutId = null;

            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
            });

            return Promise.race([promise, timeoutPromise]).finally(() => {
                if (timeoutId !== null) clearTimeout(timeoutId);
            });
        }

        function notifyFirebaseSyncFailure(error) {
            firebaseSyncWarningState.hasPendingRecoveryNotice = true;
            const now = Date.now();

            if ((now - firebaseSyncWarningState.lastWarningAt) < FIREBASE_SYNC_WARNING_COOLDOWN_MS) {
                return;
            }

            firebaseSyncWarningState.lastWarningAt = now;
            showToast('Sem sincronizacao em nuvem no momento. Os dados continuam salvos neste dispositivo e serao reenviados quando a conexao voltar.', 'warning');
            console.warn('⚠️ Sincronização em nuvem degradada:', error?.message || error);
        }

        function notifyFirebaseSyncRecovery() {
            if (!firebaseSyncWarningState.hasPendingRecoveryNotice) {
                return;
            }

            firebaseSyncWarningState.hasPendingRecoveryNotice = false;
            firebaseSyncWarningState.lastWarningAt = 0;
            showToast('Sincronizacao em nuvem restabelecida. As alteracoes pendentes foram enviadas.', 'success');
        }

        // Backups: Listar, criar manualmente e deletar (usa Cloud Functions HTTP)
        async function loadBackups() {
            try {
                if (!firebaseInitialized || !db) return renderBackups([]);
                const snap = await db.ref('marimbondos/backups').once('value');
                const raw = snap.val() || {};
                    const list = Object.keys(raw).map(k => {
                        const item = raw[k] || {};
                        // prefer top-level createdAt, then meta.createdAt
                        const createdAtIso = item.createdAtIso || (item.meta && item.meta.createdAtIso) || null;
                        const createdAt = item.createdAt || (item.meta && item.meta.createdAt) || (createdAtIso ? new Date(createdAtIso).toLocaleString() : null);
                        const chunked = !!(item.meta && item.meta.partsCount) || !!item.parts;
                        return Object.assign({ key: k, createdAtIso, createdAt, chunked }, item);
                    });
                // ordenar por createdAtIso desc
                    list.sort((a, b) => (b.createdAtIso || b.createdAt || '').localeCompare(a.createdAtIso || a.createdAt || ''));
                renderBackups(list.slice(0, 4));
            } catch (err) {
                console.error('Erro ao carregar backups:', err);
                renderBackups([]);
            }
        }

        function renderBackups(list) {
            const container = document.getElementById('backups-list');
            if (!container) return;
            if (!list || !list.length) {
                container.innerHTML = '<div class="text-[10px] text-slate-500">Nenhum backup encontrado</div>';
                return;
            }
            container.innerHTML = list.map(entry => {
                const when = escapeHtml(entry.createdAt || entry.createdAtIso || '—');
                const key = escapeHtml(entry.key);
                return `
                    <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3">
                        <div>
                            <div class="text-sm font-black text-slate-800">${when}</div>
                            <div class="text-[10px] text-slate-500 mt-1 break-all">${key}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="copyToClipboard('${key}')" class="py-1 px-3 bg-white border rounded-xl text-xs">Copiar chave</button>
                            <button onclick="restoreBackup('${key}')" class="py-1 px-3 bg-amber-500 text-white rounded-xl text-xs">Restaurar</button>
                            <button onclick="deleteBackup('${key}')" class="py-1 px-3 bg-rose-500 text-white rounded-xl text-xs">Excluir</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function triggerManualBackup() {
            try {
                if (!firebaseInitialized) return showToast('Firebase não configurado', 'error');
                showToast('Iniciando backup manual (RTDB)...', 'info');
                // Usar fallback RTDB local diretamente (evita dependência de Cloud Functions)
                await localCreateBackup();
                await loadBackups();
                return;
            } catch (err) {
                console.error(err);
                showToast('Erro ao criar backup', 'error');
            }
        }

        async function deleteBackup(key) {
            try {
                const okConfirm = await showConfirmModal('Excluir backup ' + key + '?', 'Excluir backup');
                if (!okConfirm) return;
                // Usar remoção via RTDB local
                const ok = await localDeleteBackup(key);
                if (ok) await loadBackups();
                return;
            } catch (err) {
                console.error(err);
                showToast('Erro ao excluir backup', 'error');
            }
        }

        function copyToClipboard(text) {
            try {
                if (!text) return;
                navigator.clipboard?.writeText(text);
                showToast('Chave copiada', 'success');
            } catch (err) {
                console.error('Erro copy:', err);
                showToast('Não foi possível copiar', 'error');
            }
        }

        // Operações locais usando Realtime Database (fallback sem Cloud Functions)
        async function localCreateBackup() {
            if (!firebaseInitialized || !db) return showToast('Firebase não configurado', 'error');
            try {
                const rootSnap = await db.ref('marimbondos/shared').once('value');
                const data = rootSnap.val() || {};
                const now = new Date();
                const iso = now.toISOString();
                const key = iso.replace(/[:.]/g, '-');
                // serializar e decidir entre gravação direta ou chunked
                const json = JSON.stringify(data);
                const CHUNK_THRESHOLD = 500000; // se maior que isso, escrever em partes (500KB)
                if (json.length > CHUNK_THRESHOLD) {
                    console.log('localCreateBackup: payload grande (len=' + json.length + '), usando chunked (<=10 partes)');
                    // Garantir no máximo 10 partes: calcular parts desejadas e ajustar chunkSize
                    let parts = Math.ceil(json.length / 500000) || 1;
                    parts = Math.min(10, parts);
                    const chunkSize = Math.ceil(json.length / parts);
                    // write metadata first
                    await db.ref(`marimbondos/backups/${key}/meta`).set({ createdAtIso: iso, createdAt: now.toLocaleString(), partsCount: parts });
                    for (let i = 0; i < parts; i++) {
                        const part = json.slice(i * chunkSize, (i + 1) * chunkSize);
                        await db.ref(`marimbondos/backups/${key}/parts/${i}`).set(part);
                        console.log('localCreateBackup: wrote part', i, 'for', key);
                        const pct = Math.round(((i + 1) / parts) * 100);
                        showToast(`Backup ${pct}% concluído`, 'info');
                    }
                    await db.ref(`marimbondos/backups/${key}/_notified`).set(true);
                    const histRef = await db.ref('marimbondos/shared/history/data').push({ title: 'Backup manual criado', desc: `Backup criado (chunked): ${key}`, createdAtIso: iso, createdAt: now.toLocaleString(), metadata: { manualBackup: true, chunked: true } });
                    console.log('localCreateBackup: chunked history entry pushed', histRef.key);
                    try { addHistory('Backup manual criado', `Backup criado (chunked): ${key}`, 'creation', null, 'student', { backupKey: key, manualBackup: true, chunked: true }); } catch (e) { console.warn('localCreateBackup: addHistory failed', e); }
                    showToast('Backup concluído: ' + key, 'success');
                    return key;
                } else {
                    // gravação direta para payloads menores
                    await db.ref(`marimbondos/backups/${key}`).set({ createdAtIso: iso, createdAt: now.toLocaleString(), data, _notified: true });
                    console.log('localCreateBackup: backup saved to /marimbondos/backups/', key);
                    // escrever histórico
                    const histRef = await db.ref('marimbondos/shared/history/data').push({ title: 'Backup manual criado', desc: `Backup criado: ${key}`, createdAtIso: iso, createdAt: now.toLocaleString(), metadata: { manualBackup: true } });
                    console.log('localCreateBackup: history entry pushed', histRef.key);
                    try { addHistory('Backup manual criado', `Backup criado: ${key}`, 'creation', null, 'student', { backupKey: key, manualBackup: true }); } catch (e) { console.warn('localCreateBackup: addHistory failed', e); }
                    showToast('Backup criado (RTDB): ' + key, 'success');
                    return key;
                }
            } catch (err) {
                console.warn('localCreateBackup: initial set failed, attempting chunked backup', err && err.message ? err.message : err);
                const msg = String(err && err.message || err || '').toLowerCase();
                // If the failure is due to write size, try chunking the JSON and saving parts
                if (msg.includes('write too large') || msg.includes('write failed') || msg.includes('request entity too large') || msg.includes('payload too large')) {
                    try {
                        const json = JSON.stringify(data);
                        // fallback: ensure max 10 parts and show progress
                        let parts = Math.ceil(json.length / 500000) || 1;
                        parts = Math.min(10, parts);
                        const chunkSize = Math.ceil(json.length / parts);
                        console.log('localCreateBackup: chunking backup into', parts, 'parts (fallback)');
                        // write metadata first
                        await db.ref(`marimbondos/backups/${key}/meta`).set({ createdAtIso: iso, createdAt: now.toLocaleString(), partsCount: parts });
                        for (let i = 0; i < parts; i++) {
                            const part = json.slice(i * chunkSize, (i + 1) * chunkSize);
                            await db.ref(`marimbondos/backups/${key}/parts/${i}`).set(part);
                            console.log('localCreateBackup: wrote part', i, 'for', key);
                            const pct = Math.round(((i + 1) / parts) * 100);
                            showToast(`Backup ${pct}% concluído`, 'info');
                        }
                        await db.ref(`marimbondos/backups/${key}/_notified`).set(true);
                        const histRef2 = await db.ref('marimbondos/shared/history/data').push({ title: 'Backup manual criado', desc: `Backup criado (chunked): ${key}`, createdAtIso: iso, createdAt: now.toLocaleString(), metadata: { manualBackup: true, chunked: true } });
                        console.log('localCreateBackup: chunked history entry pushed', histRef2.key);
                        try { addHistory('Backup manual criado', `Backup criado (chunked): ${key}`, 'creation', null, 'student', { backupKey: key, manualBackup: true, chunked: true }); } catch (e) { console.warn('localCreateBackup: addHistory failed', e); }
                        showToast('Backup concluído: ' + key, 'success');
                        return key;
                    } catch (e2) {
                        console.error('localCreateBackup: chunked backup failed', e2 && e2.message ? e2.message : e2);
                        showToast('Falha ao criar backup (chunking)', 'error');
                        return null;
                    }
                }
                console.error('Erro localCreateBackup:', err);
                showToast('Falha ao criar backup localmente', 'error');
            }
        }

        async function localDeleteBackup(key) {
            if (!firebaseInitialized || !db) return showToast('Firebase não configurado', 'error');
            try {
                await db.ref(`marimbondos/backups/${key}`).remove();
                showToast('Backup excluído (RTDB)', 'success');
                try { await loadBackups(); } catch (e) { /* ignore */ }
                return true;
            } catch (err) {
                console.error('Erro localDeleteBackup:', err);
                showToast('Falha ao excluir backup localmente', 'error');
                return false;
            }
        }
        async function localRestoreBackup(key) {
            if (!firebaseInitialized || !db) return showToast('Firebase não configurado', 'error');
            try {
                const snap = await db.ref(`marimbondos/backups/${key}`).once('value');
                const entry = snap.val();
                if (!entry) return showToast('Backup não encontrado', 'error');

                // Reconstruir backup chunked se necessário
                let backupData = entry.data;
                if ((!backupData || Object.keys(backupData).length === 0) && entry.meta && entry.meta.partsCount) {
                    const partsSnap = await db.ref(`marimbondos/backups/${key}/parts`).once('value');
                    const partsObj = partsSnap.val() || {};
                    const ordered = Object.keys(partsObj).sort((a, b) => Number(a) - Number(b)).map(i => partsObj[i]).join('');
                    try {
                        backupData = JSON.parse(ordered);
                    } catch (pe) {
                        console.error('localRestoreBackup: falha ao montar backup chunked', pe);
                        return showToast('Falha ao ler backup chunked', 'error');
                    }
                }

                const now = new Date();
                const iso = now.toISOString();
                const preKey = `pre-restore-${iso.replace(/[:.]/g, '-')}`;
                const currentSnap = await db.ref('marimbondos/shared').once('value');
                await db.ref(`marimbondos/backups/${preKey}`).set({ createdAtIso: iso, createdAt: now.toLocaleString(), data: currentSnap.val() || {} });

                // aplicar restauração
                await db.ref('marimbondos/shared').set(backupData);

                // histórico
                const histRef = await db.ref('marimbondos/shared/history/data').push({ title: 'Restauração de backup aplicada', desc: `Restaurado a partir do backup ${key}`, createdAtIso: iso, createdAt: now.toLocaleString(), metadata: { manualRestore: true } });
                console.log('localRestoreBackup: history entry pushed', histRef.key);
                try { addHistory('Restauração de backup aplicada', `Restaurado a partir do backup ${key}`, 'edit', null, 'student', { backupKey: key, manualRestore: true }); } catch (e) { console.warn('localRestoreBackup: addHistory failed', e); }
                showToast('Restauração aplicada (RTDB): ' + key, 'success');
                return true;
            } catch (err) {
                console.error('Erro localRestoreBackup:', err);
                showToast('Falha ao restaurar localmente', 'error');
                return false;
            }
        }

        // Garantir que backups existentes no DB tenham uma entrada no histórico.
        // Usa transações em `/marimbondos/backups/<key>/_notified` para evitar duplicatas entre clientes.
        async function ensureBackupsHaveHistory() {
            if (!firebaseInitialized || !db) return;
            try {
                const snap = await db.ref('marimbondos/backups').once('value');
                const list = snap.val() || {};
                const keys = Object.keys(list || {});
                console.log('ensureBackupsHaveHistory: found backups count=', keys.length);
                for (const key of keys) {
                    if (!key) continue;
                    if (key.startsWith('pre-restore-')) {
                        console.log('ensureBackupsHaveHistory: skipping pre-restore backup', key);
                        continue; // ignorar pre-restore
                    }
                    const entry = list[key] || {};
                    if (entry._notified) {
                        console.log('ensureBackupsHaveHistory: already notified, skipping', key);
                        continue;
                    }
                    const notifiedRef = db.ref(`marimbondos/backups/${key}/_notified`);
                    try {
                        const txResult = await notifiedRef.transaction(current => {
                            if (current) return; // já notificado, abortar
                            return true; // marcar como notificado
                        }, undefined, false);
                        console.log('ensureBackupsHaveHistory: transaction result for', key, txResult && txResult.committed);
                        if (txResult && txResult.committed) {
                            const now = new Date();
                            const histRef = await db.ref('marimbondos/shared/history/data').push({
                                title: 'Backup criado',
                                desc: `Backup criado: ${key}`,
                                createdAtIso: now.toISOString(),
                                createdAt: now.toLocaleString()
                            });
                            console.log('ensureBackupsHaveHistory: history entry pushed for', key, histRef.key);
                            try { addHistory('Backup criado', `Backup criado: ${key}`, 'creation', null, 'student', { backupKey: key }); } catch (e) { console.warn('ensureBackupsHaveHistory: addHistory failed', e); }
                        }
                    } catch (e) {
                        console.warn('Erro ao tentar notificar backup', key, e && e.message ? e.message : e);
                    }
                }
            } catch (e) {
                console.warn('Erro em ensureBackupsHaveHistory:', e && e.message ? e.message : e);
            }
        }

        // Escuta novas entradas em /marimbondos/backups e garante criação de histórico
        let _backupsListenerAttached = false;
        function watchBackupsRealtimeListeners() {
            if (!firebaseInitialized || !db || _backupsListenerAttached) return;
            try {
                const backupsRef = db.ref('marimbondos/backups');
                backupsRef.on('child_added', async (snap) => {
                    const key = snap.key;
                    if (!key) return;
                    console.log('watchBackupsRealtimeListeners: child_added detected', key);
                    if (key.startsWith('pre-restore-')) {
                        console.log('watchBackupsRealtimeListeners: ignoring pre-restore key', key);
                        return;
                    }
                    const val = snap.val() || {};
                    // If already notified, nothing to do
                    if (val._notified) {
                        console.log('watchBackupsRealtimeListeners: already notified, skipping', key);
                        return;
                    }
                    const notifiedRef = db.ref(`marimbondos/backups/${key}/_notified`);
                    try {
                        console.log('watchBackupsRealtimeListeners: attempting _notified transaction for', key);
                        const tx = await notifiedRef.transaction(current => {
                            if (current) return; // already true -> abort
                            return true; // mark notified
                        }, undefined, false);
                        console.log('watchBackupsRealtimeListeners: transaction committed?', tx && tx.committed, key);
                        if (tx && tx.committed) {
                            const now = new Date();
                            const histRef = await db.ref('marimbondos/shared/history/data').push({
                                title: 'Backup criado',
                                desc: `Backup criado: ${key}`,
                                createdAtIso: now.toISOString(),
                                createdAt: now.toLocaleString(),
                                metadata: { autoDetected: true }
                            });
                            console.log('watchBackupsRealtimeListeners: pushed history for', key, histRef.key);
                            try { addHistory('Backup criado', `Backup criado: ${key}`, 'creation', null, 'student', { backupKey: key, autoDetected: true }); } catch (e) { console.warn('watchBackupsRealtimeListeners: addHistory failed', e); }
                        }
                    } catch (e) {
                        console.warn('Erro ao processar child_added backups:', key, e && e.message ? e.message : e);
                    }
                });
                _backupsListenerAttached = true;
            } catch (e) {
                console.warn('Erro ao anexar listener de backups:', e && e.message ? e.message : e);
            }
        }

        async function restoreBackup(key) {
            try {
                const okConfirm = await showConfirmModal('Restaurar backup ' + key + '? Isso substituirá o estado compartilhado.', 'Restaurar backup');
                if (!okConfirm) return;
                showToast('Iniciando restauração (RTDB)...', 'info');
                await localRestoreBackup(key);
                await loadBackups();
                return;
            } catch (err) {
                console.error(err);
                showToast('Erro ao restaurar backup', 'error');
            }
        }


        // Aguardar Firebase estar disponível
        function waitForFirebase(callback, maxAttempts = 20) {
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (typeof firebase !== 'undefined') {
                    clearInterval(checkInterval);
                    console.log('✓ Firebase SDK carregado com sucesso');
                    callback();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('❌ Firebase SDK não carregou após múltiplas tentativas');
                    console.warn('⚠️ Firebase não disponível. Usando localStorage apenas.');
                    firebaseInitialized = false;
                    callback(); // Chamar callback mesmo assim para continuar o app
                } else {
                    console.log(`⏳ Aguardando Firebase SDK (tentativa ${attempts}/${maxAttempts})...`);
                }
            }, 500);
        }

        // Inicializar Firebase
        function initFirebase() {
            try {
                // Verificar se firebase está definido
                if (typeof firebase === 'undefined') {
                    console.error('❌ Firebase SDK ainda não foi carregado');
                    throw new Error('Firebase não está disponível. Tentando novamente...');
                }

                // Verificar se está usando placeholder (não configurado)
                if (firebaseConfig.apiKey.includes("COLE_SEU") || 
                    firebaseConfig.projectId.includes("COLE_SEU") ||
                    firebaseConfig.apiKey === "") {
                    console.warn('⚠️ Firebase não configurado. Usando localStorage apenas.');
                    firebaseInitialized = false;
                    return false;
                }
                
                console.log('🔧 Inicializando Firebase...');

                if (!firebase.apps.length) {
                    firebase.initializeApp(firebaseConfig);
                    console.log('✓ Firebase App inicializado');
                }
                
                db = firebase.database();
                console.log('✓ Firebase Realtime Database conectado');
                firebaseInitialized = true;
                
                return true;
            } catch (err) {
                console.error('❌ Erro ao inicializar Firebase:', err.message);
                console.error('Stack:', err.stack);
                firebaseInitialized = false;
                return false;
            }
        }

        // Salvar dados no Firebase (escopo compartilhado entre contas)
        function isListSegment(segment) {
            // Segments que representam listas/coleções e devem usar /data + push()
            const listSegments = ['history', 'studentHistoryArchive', 'loginActivity', 'storeItems', 'notices'];
            return listSegments.includes(segment);
        }

        async function saveToFirebase(dataKey, data, timestamp = new Date().toISOString()) {
            if (!firebaseInitialized || !db) return;

            try {
                const safeDataKey = normalizeFirebasePathSegment(dataKey);

                if (isListSegment(safeDataKey)) {
                    // Para segmentos do tipo lista, gravamos em .../segment/data usando push()
                    const path = `marimbondos/shared/${safeDataKey}/data`;
                    const pushPromise = db.ref(path).push(Object.assign({}, data, { createdAt: timestamp }));
                    await withAsyncTimeout(pushPromise, FIREBASE_SAVE_TIMEOUT_MS, 'Timeout ao salvar no Firebase (push)');
                    console.log(`✓ Item adicionado em Firebase: ${dataKey} (path: ${path})`);
                    return timestamp;
                } else {
                    const path = `marimbondos/shared/${safeDataKey}`;
                    const savePromise = db.ref(path).set({
                        data: data,
                        timestamp
                    });

                    await withAsyncTimeout(savePromise, FIREBASE_SAVE_TIMEOUT_MS, 'Timeout ao salvar no Firebase');
                    console.log(`✓ Dados salvos em Firebase: ${dataKey} (path: ${path})`);
                    return timestamp;
                }
            } catch (err) {
                console.error('Erro ao salvar dados em Firebase:', err.message);
                console.warn('⚠️ Dados salvos apenas localmente');
                notifyFirebaseSyncFailure(err);
                throw err;
            }
        }

        async function loadFromFirebase(dataKey) {
            if (!firebaseInitialized || !db) return null;

            try {
                const safeDataKey = normalizeFirebasePathSegment(dataKey);

                if (isListSegment(safeDataKey)) {
                    const path = `marimbondos/shared/${safeDataKey}/data`;
                    const loadPromise = db.ref(path).once('value');
                    const snapshot = await withAsyncTimeout(loadPromise, 5000, 'Timeout ao carregar do Firebase');

                    if (snapshot.exists()) {
                        console.log(`✓ Lista carregada do Firebase: ${dataKey} (path: ${path})`);
                        return snapshot.val(); // retorna objeto com filhos
                    }
                    return null;
                } else {
                    const path = `marimbondos/shared/${safeDataKey}`;
                    const loadPromise = db.ref(path).once('value');
                    const snapshot = await withAsyncTimeout(loadPromise, 5000, 'Timeout ao carregar do Firebase');

                    if (snapshot.exists()) {
                        console.log(`✓ Dados carregados do Firebase: ${dataKey} (path: ${path})`);
                        return snapshot.val().data;
                    }
                    return null;
                }
            } catch (err) {
                console.error('Erro ao carregar dados do Firebase:', err.message);
                return null;
            }
        }

        // Carregar dados do Firebase ao inicializar
        async function loadFromFirebaseOnStartup() {
            console.log('🔍 loadFromFirebaseOnStartup() chamado | Firebase:', firebaseInitialized, '| DB:', !!db);
            
            if (!firebaseInitialized || !db) {
                console.warn('⚠️ Firebase não inicializado (firebaseInitialized:', firebaseInitialized, ', db:', !!db, '), pulando carregamento');
                return;
            }

            try {
                console.log('📥 Carregando segmentos do Firebase...');
                const segmentEntries = await Promise.all(FIREBASE_STATE_SEGMENT_KEYS.map(async segmentKey => {
                    const segmentData = await loadFromFirebase(segmentKey);
                    return [segmentKey, segmentData];
                }));

                const availableSegments = Object.fromEntries(segmentEntries.filter(([, segmentData]) => segmentData !== null && segmentData !== undefined));
                const hasSegmentData = Object.keys(availableSegments).length > 0;

                if (hasSegmentData) {
                    const sanitizedSegments = {};
                    Object.entries(availableSegments).forEach(([segmentKey, segmentValue]) => {
                        sanitizedSegments[segmentKey] = sanitizeFirebaseSegmentValue(segmentKey, segmentValue);
                    });

                    applyRemoteStateSegments(sanitizedSegments);
                    const manifest = await loadFromFirebase(FIREBASE_SYNC_MANIFEST_KEY) || {};
                    syncFirebaseSegmentTracking(buildAppStateSnapshot(), manifest);
                    console.log('✅ Segmentos sincronizados do Firebase com sucesso!');
                    console.log('Dados:', {
                        alunos: MOCK_STUDENTS.length,
                        professores: MOCK_TEACHERS.length,
                        registros: MOCK_HISTORY.length,
                        segmentos: Object.keys(sanitizedSegments).length
                    });
                    persistence.save(buildAppStateSnapshot());
                } else {
                    console.log('ℹ️ Nenhum segmento encontrado no Firebase. Verificando legado all_data...');
                    const allData = await loadFromFirebase('all_data');
                    if (allData) {
                        const sanitizedData = sanitizeRemoteAppState(allData);
                        applyRemoteAppState(sanitizedData);
                        persistence.save(buildAppStateSnapshot());
                        syncAllDataToFirebase({ immediate: true, forceAll: true });
                        console.log('✅ Estado legado migrado de all_data para segmentos.');
                    } else {
                        console.log('ℹ️ Nenhum dado encontrado no Firebase (primeira sincronização)');
                    }
                }

                // Configurar a sincronização em tempo real para escopo global
                setupRealtimeSync();
            } catch (err) {
                console.error('❌ Erro ao carregar dados do Firebase:', err);
                // Mesmo em caso de erro, garantimos listener para quando vier conexão
                setupRealtimeSync();
            }
        }
        async function flushFirebaseSync() {
            if (!firebaseInitialized || !db || !Object.keys(pendingFirebaseSegments).length) {
                return;
            }

            if (firebaseSyncInFlight) {
                firebaseSyncRetryRequested = true;
                return;
            }

            const queuedSegments = { ...pendingFirebaseSegments };
            pendingFirebaseSegments = {};
            firebaseSyncInFlight = true;
            const currentTime = new Date().toISOString();

            try {
                const nextManifest = { ...firebaseManifestCache };

                for (const [segmentKey, segmentEntry] of Object.entries(queuedSegments)) {
                    await saveToFirebase(segmentKey, segmentEntry.data, currentTime);
                    firebaseSegmentTimestamps[segmentKey] = currentTime;
                    firebaseSegmentSignatures[segmentKey] = segmentEntry.signature;
                    delete firebasePendingSegmentTimestamps[segmentKey];
                    nextManifest[segmentKey] = currentTime;
                }

                await saveToFirebase(FIREBASE_SYNC_MANIFEST_KEY, nextManifest, currentTime);
                firebaseManifestCache = nextManifest;
                localStorage.setItem('last_sync_timestamp', currentTime);
                lastAppliedRemoteTimestamp = currentTime;
                lastAppliedRemoteSignature = getAppStateSignature(buildAppStateSnapshot());
                notifyFirebaseSyncRecovery();
                console.log('✅ Segmentos enviados com sucesso para Firebase:', Object.keys(queuedSegments));
            } catch (err) {
                console.error('❌ Erro ao sincronizar com Firebase:', err.message);
                notifyFirebaseSyncFailure(err);
                pendingFirebaseSegments = { ...queuedSegments, ...pendingFirebaseSegments };
            } finally {
                firebaseSyncInFlight = false;
                if (firebaseSyncRetryRequested || Object.keys(pendingFirebaseSegments).length) {
                    firebaseSyncRetryRequested = false;
                    window.setTimeout(() => {
                        flushFirebaseSync();
                    }, FIREBASE_SYNC_DEBOUNCE_MS);
                }
            }
        }

        function syncAllDataToFirebase(options = {}) {
            if (!firebaseInitialized) {
                console.warn('⚠️ Firebase não inicializado, pulando syncAllDataToFirebase');
                return;
            }

            const immediate = Boolean(options?.immediate);
            const forceAll = Boolean(options?.forceAll);
            const state = buildAppStateSnapshot();
            const segments = buildFirebaseStateSegments(state);
            const queuedAt = new Date().toISOString();

            FIREBASE_STATE_SEGMENT_KEYS.forEach(segmentKey => {
                const segmentValue = segments[segmentKey];
                const signature = getFirebaseSegmentSignature(segmentKey, segmentValue);
                if (!forceAll && signature === firebaseSegmentSignatures[segmentKey]) {
                    return;
                }

                pendingFirebaseSegments[segmentKey] = {
                    data: segmentValue,
                    signature
                };
                firebasePendingSegmentTimestamps[segmentKey] = queuedAt;
            });

            if (!Object.keys(pendingFirebaseSegments).length) {
                return;
            }

            if (firebaseSyncTimer) {
                window.clearTimeout(firebaseSyncTimer);
                firebaseSyncTimer = null;
            }

            if (immediate) {
                flushFirebaseSync();
                return;
            }

            firebaseSyncTimer = window.setTimeout(() => {
                firebaseSyncTimer = null;
                flushFirebaseSync();
            }, FIREBASE_SYNC_DEBOUNCE_MS);
        }

        function sanitizeForFirebase(value) {
            if (Array.isArray(value)) {
                return value
                    .map(item => sanitizeForFirebase(item))
                    .filter(item => item !== undefined);
            }

            if (value && typeof value === 'object') {
                const cleanedObject = {};
                Object.entries(value).forEach(([key, entryValue]) => {
                    const cleanedValue = sanitizeForFirebase(entryValue);
                    if (cleanedValue !== undefined) {
                        cleanedObject[key] = cleanedValue;
                    }
                });
                return cleanedObject;
            }

            return value === undefined ? undefined : value;
        }

        function buildFirebaseStateSegments(state = buildAppStateSnapshot()) {
            return {
                settings: sanitizeForFirebase(state.settings),
                students: sanitizeForFirebase(state.students),
                teachers: sanitizeForFirebase(state.teachers),
                history: sanitizeForFirebase(state.history),
                studentHistoryArchive: sanitizeForFirebase(state.studentHistoryArchive),
                loginActivity: sanitizeForFirebase(state.loginActivity),
                notices: sanitizeForFirebase(state.notices),
                storeItems: sanitizeForFirebase(state.storeItems),
                learnedImportNames: sanitizeForFirebase(state.learnedImportNames),
                counters: sanitizeForFirebase(state.counters)
            };
        }

        function getFirebaseSegmentSignature(segmentKey, segmentValue) {
            try {
                return JSON.stringify(sanitizeForFirebase(segmentValue));
            } catch (error) {
                console.warn(`Não foi possível gerar a assinatura do segmento ${segmentKey}:`, error);
                return '';
            }
        }

        function getAppStateSignature(state = buildAppStateSnapshot()) {
            try {
                return JSON.stringify(buildFirebaseStateSegments(state));
            } catch (error) {
                console.warn('Não foi possível gerar a assinatura do estado da aplicação:', error);
                return '';
            }
        }

        function getCurrentFirebaseSegmentValue(segmentKey) {
            const state = buildAppStateSnapshot();
            return buildFirebaseStateSegments(state)[segmentKey];
        }

        function sanitizeFirebaseSegmentValue(segmentKey, rawValue) {
            switch (segmentKey) {
                case 'settings':
                    return mergeSettings(rawValue);
                case 'students':
                    return Array.isArray(rawValue)
                        ? rawValue.map(normalizeStudentRecord).filter(student => student && typeof student === 'object')
                        : [...(MOCK_STUDENTS || [])];
                case 'teachers':
                    return Array.isArray(rawValue)
                        ? rawValue.map(normalizeTeacherRecord).filter(teacher => teacher && teacher.email && teacher.name)
                        : [...(MOCK_TEACHERS || [])];
                case 'history':
                    return Array.isArray(rawValue)
                        ? rawValue.map(normalizeHistoryRecord).filter(Boolean)
                        : [...(MOCK_HISTORY || [])];
                case 'studentHistoryArchive':
                    return normalizeStudentHistoryArchive(rawValue, MOCK_STUDENT_HISTORY_ARCHIVE);
                case 'loginActivity':
                    return normalizeLoginActivityList(rawValue);
                case 'notices':
                    return Array.isArray(rawValue)
                        ? rawValue.map(normalizeNoticeRecord).filter(Boolean)
                            : [];
                case 'storeItems':
                    return Array.isArray(rawValue)
                        ? normalizeAllStoreItems(rawValue)
                        : normalizeAllStoreItems(MOCK_STORE_ITEMS);
                case 'learnedImportNames':
                    return sanitizeStringList(rawValue, LEARNED_IMPORT_NAMES);
                case 'counters': {
                    const safeCounters = rawValue && typeof rawValue === 'object' ? rawValue : {};
                    return {
                        history: sanitizeCounterValue(safeCounters.history, historyCounter),
                        notices: sanitizeCounterValue(safeCounters.notices, noticesCounter),
                        storeItems: sanitizeCounterValue(
                            safeCounters.storeItems,
                            Math.max(0, ...(MOCK_STORE_ITEMS || []).map(item => item.id || 0)) + 1
                        )
                    };
                }
                default:
                    return sanitizeForFirebase(rawValue);
            }
        }

        function applyRemoteStateSegments(segmentMap = {}) {
            if (segmentMap.settings !== undefined) {
                MOCK_SETTINGS = mergeSettings(segmentMap.settings);
                applyLoginHolidayTheme(getCurrentThemeMode());
            }

            if (segmentMap.students !== undefined) {
                MOCK_STUDENTS = segmentMap.students || [];
                normalizeAllStudents();
            }

            if (segmentMap.teachers !== undefined) {
                MOCK_TEACHERS = segmentMap.teachers || [];
                normalizeAllTeachers();
            }

            if (segmentMap.history !== undefined) {
                MOCK_HISTORY = segmentMap.history || [];
            }

            if (segmentMap.studentHistoryArchive !== undefined) {
                MOCK_STUDENT_HISTORY_ARCHIVE = normalizeStudentHistoryArchive(segmentMap.studentHistoryArchive, MOCK_STUDENT_HISTORY_ARCHIVE);
            }

            if (segmentMap.loginActivity !== undefined) {
                MOCK_LOGIN_ACTIVITY = normalizeLoginActivityList(segmentMap.loginActivity || []);
            }

            if (segmentMap.notices !== undefined) {
                MOCK_NOTICES = segmentMap.notices || [];
            }

            if (segmentMap.storeItems !== undefined) {
                MOCK_STORE_ITEMS = normalizeAllStoreItems(segmentMap.storeItems || []);
            }

            if (segmentMap.learnedImportNames !== undefined) {
                LEARNED_IMPORT_NAMES = sanitizeStringList(segmentMap.learnedImportNames, LEARNED_IMPORT_NAMES);
                syncLearnedImportNameCaches();
            }

            if (segmentMap.counters !== undefined) {
                historyCounter = sanitizeCounterValue(segmentMap.counters?.history, historyCounter);
                noticesCounter = sanitizeCounterValue(segmentMap.counters?.notices, noticesCounter);
                storeItemCounter = sanitizeCounterValue(
                    segmentMap.counters?.storeItems,
                    Math.max(0, ...(MOCK_STORE_ITEMS || []).map(item => item.id || 0)) + 1
                );
            } else if (segmentMap.storeItems !== undefined) {
                storeItemCounter = Math.max(0, ...(MOCK_STORE_ITEMS || []).map(item => item.id || 0)) + 1;
            }

            compactHistoryStorage();
        }

        function syncFirebaseSegmentTracking(state = buildAppStateSnapshot(), manifest = firebaseManifestCache) {
            const segments = buildFirebaseStateSegments(state);
            FIREBASE_STATE_SEGMENT_KEYS.forEach(segmentKey => {
                firebaseSegmentSignatures[segmentKey] = getFirebaseSegmentSignature(segmentKey, segments[segmentKey]);
                if (manifest && manifest[segmentKey]) {
                    firebaseSegmentTimestamps[segmentKey] = String(manifest[segmentKey]);
                }
            });
            firebaseManifestCache = { ...(manifest || firebaseManifestCache) };
        }

        function teardownRealtimeSync() {
            if (!firebaseListeners || typeof firebaseListeners !== 'object') {
                firebaseListeners = {};
                return;
            }

            Object.values(firebaseListeners).forEach(listenerEntry => {
                if (!listenerEntry?.ref || typeof listenerEntry.callback !== 'function') {
                    return;
                }

                try {
                    listenerEntry.ref.off('value', listenerEntry.callback);
                } catch (error) {
                    console.warn('Falha ao remover listener do Firebase:', error);
                }
            });

            firebaseListeners = {};
        }

        function scheduleRealtimeUiRefresh(options = {}) {
            const shouldRebuildNavigation = Boolean(options.rebuildNavigation);
            if (shouldRebuildNavigation) {
                pendingRealtimeNavigationRefresh = true;
            }

            if (uiRefreshTimer) {
                window.clearTimeout(uiRefreshTimer);
            }

            uiRefreshTimer = window.setTimeout(() => {
                uiRefreshTimer = null;

                if (appScreenReady && !document.hidden) {
                    if (pendingRealtimeNavigationRefresh) {
                        buildNavigation();
                    }
                    pendingRealtimeNavigationRefresh = false;
                    refreshUI();
                }
            }, IS_ANDROID_RUNTIME ? 320 : 180);
        }

        function setupRealtimeSync() {
            teardownRealtimeSync();

            if (!firebaseInitialized || !db) {
                return;
            }

            const manifestRef = db.ref(`marimbondos/shared/${FIREBASE_SYNC_MANIFEST_KEY}`);
            const manifestCallback = async (snapshot) => {
                const manifestPayload = snapshot.val()?.data;
                if (!manifestPayload || typeof manifestPayload !== 'object') {
                    return;
                }

                const remoteManifest = { ...manifestPayload };
                const changedSegments = FIREBASE_STATE_SEGMENT_KEYS.filter(segmentKey => {
                    const nextTimestamp = remoteManifest[segmentKey] ? String(remoteManifest[segmentKey]) : '';
                    const knownTimestamp = firebasePendingSegmentTimestamps[segmentKey] || firebaseSegmentTimestamps[segmentKey] || '';
                    return nextTimestamp && nextTimestamp !== knownTimestamp;
                });

                if (!changedSegments.length) {
                    firebaseManifestCache = remoteManifest;
                    return;
                }

                try {
                    const segmentEntries = await Promise.all(changedSegments.map(async segmentKey => {
                        const remoteValue = await loadFromFirebase(segmentKey);
                        return [segmentKey, sanitizeFirebaseSegmentValue(segmentKey, remoteValue)];
                    }));

                    const segmentMap = Object.fromEntries(segmentEntries.filter(([, value]) => value !== null && value !== undefined));
                    if (!Object.keys(segmentMap).length) {
                        firebaseManifestCache = remoteManifest;
                        syncFirebaseSegmentTracking(buildAppStateSnapshot(), remoteManifest);
                        return;
                    }

                    applyRemoteStateSegments(segmentMap);
                    persistence.save(buildAppStateSnapshot());
                    syncFirebaseSegmentTracking(buildAppStateSnapshot(), remoteManifest);
                    lastAppliedRemoteTimestamp = new Date().toISOString();
                    lastAppliedRemoteSignature = getAppStateSignature(buildAppStateSnapshot());
                    scheduleRealtimeUiRefresh({
                        rebuildNavigation: changedSegments.includes('settings') || changedSegments.includes('teachers')
                    });
                } catch (error) {
                    console.error('❌ Erro ao aplicar atualização em tempo real do Firebase:', error);
                }
            };

            manifestRef.on('value', manifestCallback);
            firebaseListeners.manifest = {
                ref: manifestRef,
                callback: manifestCallback
            };
        }

        function buildAppStateSnapshot() {
            return {
                settings: MOCK_SETTINGS,
                students: MOCK_STUDENTS,
                teachers: MOCK_TEACHERS,
                history: MOCK_HISTORY,
                studentHistoryArchive: MOCK_STUDENT_HISTORY_ARCHIVE,
                loginActivity: MOCK_LOGIN_ACTIVITY,
                notices: MOCK_NOTICES,
                storeItems: MOCK_STORE_ITEMS,
                learnedImportNames: LEARNED_IMPORT_NAMES,
                counters: {
                    history: historyCounter,
                    notices: noticesCounter,
                    storeItems: storeItemCounter
                }
            };
        }

            function checkStorageAvailability() {
                try {
                    const test = '__storage_test__';
                    localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                console.warn('⚠️ localStorage não disponível (possivelmente bloqueado por Tracking Prevention):', e.message);
                return false;
            }
        }

        function checkIndexedDBAvailability() {
            return new Promise((resolve) => {
                if (!window.indexedDB) {
                    console.warn('⚠️ IndexedDB não suportado pelo navegador');
                    resolve(false);
                    return;
                }
                
                const request = indexedDB.open('test', 1);
                request.onerror = () => {
                    console.warn('⚠️ IndexedDB bloqueado ou não disponível');
                    resolve(false);
                };
                request.onsuccess = () => {
                    request.result.close();
                    resolve(true);
                };
            });
        }

        function checkLibraries() {
            setTimeout(() => {
                if (typeof XLSX === 'undefined') {
                    console.warn('XLSX library não foi carregado. Tentando carregar de fonte alternativa...');
                    
                    const loadXLSX = (sources, index = 0) => {
                        if (index >= sources.length) {
                            console.error('❌ Todas as fontes do XLSX falharam. Funcionalidade de exportação pode não funcionar.');
                            return;
                        }
                        
                        const script = document.createElement('script');
                        script.src = sources[index];
                        script.onload = () => {
                            console.log(`✓ XLSX carregado com sucesso da fonte ${index + 1}: ${sources[index]}`);
                        };
                        script.onerror = () => {
                            console.warn(`Fonte ${index + 1} falhou, tentando próxima...`);
                            loadXLSX(sources, index + 1);
                        };
                        document.head.appendChild(script);
                    };
                    
                    // Múltiplas fontes para garantir carregamento
                    const xlsxSources = [
                        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
                        'https://cdn.jsdelivr.net/npm/xlsx@0.17.5/dist/xlsx.full.min.js'
                    ];
                    
                    loadXLSX(xlsxSources);
                } else {
                    console.log('✓ XLSX carregado corretamente');
                }
            }, 2000); // Aguardar 2 segundos para carregamento inicial
        }

        const PERSONAL_THEME_OPTIONS = ['auto', 'dark', 'light'];
        const THEME_SETTINGS = {
            current: 'auto'
        };

        function normalizeEmailAddress(value = '') {
            return String(value || '').trim().toLowerCase();
        }

        function getCurrentUserStorageKey() {
            const normalizedEmail = normalizeEmailAddress(MOCK_USER?.email);
            return normalizedEmail || 'guest';
        }

        function getCurrentThemeMode() {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }

        function applyLoginLogoTheme(themeKey = 'none') {
            const accentElement = document.getElementById('login-logo-theme-accent');
            const logoBadge = document.getElementById('login-logo-badge');
            if (!accentElement || !logoBadge) return;
            logoBadge.dataset.logoTheme = themeKey || 'none';
            accentElement.className = 'login-logo-theme-accent hidden';
            accentElement.innerHTML = '';
        }

        function applyLoginHolidayTheme(mode = getCurrentThemeMode(), themeOverride = null) {
            const loginScreen = document.getElementById('login-screen');
            const themeCopy = document.getElementById('login-theme-copy');
            if (!loginScreen) return;

            clearLoginThemeVariables(loginScreen);

            if (themeCopy) {
                themeCopy.innerHTML = '<strong>INSTRUÇÕES:</strong> Informe seu e-mail e a senha numérica de 4 dígitos. Acesso restrito a funcionários.';
            }

            applyLoginLogoTheme('none');
        }

        const LOGIN_THEME_VARIABLE_NAMES = [
            '--login-screen-bg',
            '--login-screen-halo',
            '--login-screen-glow',
            '--login-panel-bg',
            '--login-panel-border',
            '--login-panel-shadow',
            '--login-accent-bg',
            '--login-accent-shadow',
            '--login-pill-bg',
            '--login-pill-fg',
            '--login-pill-border',
            '--login-info-bg',
            '--login-info-border',
            '--login-button-bg',
            '--login-button-fg',
            '--login-input-bg',
            '--login-input-border'
        ];

        function clearLoginThemeVariables(targetElement) {
            if (!targetElement) return;
            LOGIN_THEME_VARIABLE_NAMES.forEach(propertyName => targetElement.style.removeProperty(propertyName));
        }


        function updateBrowserThemeColor(color) {
            const resolvedColor = String(color || '').trim() || '#FFB800';
            let metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (!metaThemeColor) {
                metaThemeColor = document.createElement('meta');
                metaThemeColor.name = 'theme-color';
                document.head.appendChild(metaThemeColor);
            }
            metaThemeColor.setAttribute('content', resolvedColor);
        }

        function syncAndroidSystemBars(mode = getCurrentThemeMode()) {
            const root = document.documentElement;
            if (!root) return;

            const computedStyle = window.getComputedStyle(root);
            const backgroundColor = String(computedStyle.getPropertyValue('--bg') || '').trim() || (mode === 'dark' ? '#0F172A' : '#FAF1CC');
            const useDarkIcons = mode !== 'dark';

            updateBrowserThemeColor(backgroundColor);

            try {
                if (!window.AndroidApp || typeof window.AndroidApp.setSystemBarsTheme !== 'function') return;
                window.AndroidApp.setSystemBarsTheme(backgroundColor, useDarkIcons);
            } catch (error) {
                console.warn('Não foi possível sincronizar as barras do sistema no Android:', error);
            }
        }

        function syncAndroidSeasonalAppIcon(themeKey = getHolidayAppTheme()) {
            try {
                if (!window.AndroidApp || typeof window.AndroidApp.setSeasonalAppIcon !== 'function') return;
                window.AndroidApp.setSeasonalAppIcon('none');
            } catch (error) {
                console.warn('Não foi possível sincronizar o ícone sazonal no Android:', error);
            }
        }

        const SUPPORT_WHATSAPP_PHONE = '5583991956560';
        const SUPPORT_WHATSAPP_MESSAGE = 'Olá, preciso de ajuda com o Marimbondos - Pay';
        const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${encodeURIComponent(SUPPORT_WHATSAPP_MESSAGE)}`;

        function openSupportWhatsApp(event) {
            event?.preventDefault?.();

            try {
                if (window.AndroidApp && typeof window.AndroidApp.openWhatsAppSupport === 'function') {
                    const handled = window.AndroidApp.openWhatsAppSupport(SUPPORT_WHATSAPP_PHONE, SUPPORT_WHATSAPP_MESSAGE);
                    if (handled === true || handled === 'true' || typeof handled === 'undefined') {
                        return false;
                    }
                }

                if (window.AndroidApp && typeof window.AndroidApp.openExternalUrl === 'function') {
                    const handled = window.AndroidApp.openExternalUrl(SUPPORT_WHATSAPP_URL);
                    if (handled === true || handled === 'true' || typeof handled === 'undefined') {
                        return false;
                    }
                }
            } catch (error) {
                console.warn('Falha ao abrir suporte via bridge Android:', error);
            }

            const popup = window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
            if (!popup) {
                window.location.href = SUPPORT_WHATSAPP_URL;
            }

            return false;
        }

        function renderSeasonalThemeScene() {
            document.getElementById('seasonal-theme-scene')?.remove();
        }

        function getSeasonalThemeShowcaseMarkup(tabId = 'login', themeKey = getHolidayAppTheme()) {
            return '';
        }

        function normalizeSearchText(value = '') {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        }

        function getThemeNoticeCycle(themeKey = getActiveGlobalSeasonalTheme()) {
            return 'none';
        }

        function createCalendarDate(year, month, day) {
            return new Date(year, month - 1, day, 12, 0, 0, 0);
        }

        function addDaysToDate(date, amount) {
            const result = new Date(date);
            result.setDate(result.getDate() + amount);
            return result;
        }

        function isDateWithinRange(targetDate, startDate, endDate) {
            const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
            const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();
            const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()).getTime();
            return target >= start && target <= end;
        }

        function calculateEasterSunday(year) {
            const century = Math.floor(year / 100);
            const goldenNumber = year % 19;
            const skippedLeapYears = Math.floor((century - 17) / 25);
            let correction = century - Math.floor(century / 4) - Math.floor((century - skippedLeapYears) / 3) + (19 * goldenNumber) + 15;
            correction %= 30;
            correction -= Math.floor(correction / 28) * (1 - Math.floor(correction / 28) * Math.floor(29 / (correction + 1)) * Math.floor((21 - goldenNumber) / 11));
            let weekday = year + Math.floor(year / 4) + correction + 2 - century + Math.floor(century / 4);
            weekday %= 7;
            const offset = correction - weekday;
            const month = 3 + Math.floor((offset + 40) / 44);
            const day = offset + 28 - 31 * Math.floor(month / 4);
            return createCalendarDate(year, month, day);
        }

        function getSeasonalThemeByDate(referenceDate = new Date()) {
            return 'none';
        }

        function normalizeGlobalSeasonalThemeSelection(value, fallback = 'auto') {
            return 'none';
        }

        function getHolidayAppTheme(referenceDate = new Date(), themeOverride = null) {
            return 'none';
        }

        function getActiveGlobalSeasonalTheme() {
            return 'none';
        }

        function renderLoginThemeSettingsPreview(themeSelection = null) {
            return;
        }

        function previewLoginThemeSelection(themeSelection) {
            UI_STATE.settings.globalSeasonalTheme = 'none';
            applyLoginHolidayTheme(getCurrentThemeMode(), 'none');
        }

        function persistGlobalLoginThemeSetting(themeSelection, options = {}) {
            return true;
        }

        function getCurrentTeacherRecord() {
            const currentEmail = normalizeEmailAddress(MOCK_USER.email);
            return MOCK_TEACHERS.find(teacher => normalizeEmailAddress(teacher.email) === currentEmail) || null;
        }

        const TEACHER_BADGE_OPTIONS = [
            { key: 'docente', label: 'Professor', className: 'bg-sky-100 text-sky-700 border-sky-200' },
            { key: 'admin', label: 'Admin', className: 'bg-amber-100 text-amber-700 border-amber-200' },
            { key: 'direcao', label: 'Direção', className: 'bg-rose-100 text-rose-700 border-rose-200' },
            { key: 'pedagoga', label: 'Pedagoga', className: 'bg-pink-100 text-pink-700 border-pink-200' },
            { key: 'articuladora', label: 'Articuladora', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
            { key: 'viewer', label: 'Viewer', className: 'bg-slate-100 text-slate-600 border-slate-200' },
            { key: 'dev', label: 'Dev', className: 'bg-purple-100 text-purple-700 border-purple-200' }
        ];
        const LOGIN_ACTIVITY_LIMIT = 1;

        function getTeacherBadgeMeta(badgeKey = '') {
            return TEACHER_BADGE_OPTIONS.find(badge => badge.key === badgeKey) || null;
        }

        function getPrimaryTeacherBadgeKey(roleLabel = '') {
            const roleType = deriveRoleType(roleLabel);
            if (roleType === 'teacher') return '';
            return roleType;
        }

        function normalizeTeacherBadges(values = [], roleLabel = '', options = {}) {
            const validBadgeKeys = new Set(TEACHER_BADGE_OPTIONS.map(badge => badge.key));
            const roleBadge = getPrimaryTeacherBadgeKey(roleLabel);
            const badgeList = Array.isArray(values) ? values : [];
            const includeRoleBadge = Boolean(options.includeRoleBadge);
            return [...new Set([...(badgeList || []), ...(includeRoleBadge && roleBadge ? [roleBadge] : [])]
                .map(value => String(value || '').trim().toLowerCase())
                .map(value => value === 'pedaga' ? 'pedagoga' : value)
                .filter(value => value !== 'professor')
                .filter(value => validBadgeKeys.has(value)))];
        }

        function buildTeacherBadgeSelector(selectedBadges = [], fieldPrefix = 'teacher') {
            const normalizedBadges = normalizeTeacherBadges(selectedBadges);
            return `
                <div class="grid grid-cols-2 gap-2">
                    ${TEACHER_BADGE_OPTIONS.map(badge => `
                        <label class="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-amber-300 transition">
                            <input type="checkbox" value="${badge.key}" data-badge-field="${fieldPrefix}" ${normalizedBadges.includes(badge.key) ? 'checked' : ''} class="w-4 h-4 accent-amber-500 rounded">
                            <span class="text-[10px] font-black px-2 py-1 rounded-full border ${badge.className}">${badge.label}</span>
                        </label>
                    `).join('')}
                </div>
            `;
        }

        function getSelectedTeacherBadges(fieldPrefix = 'teacher') {
            return normalizeTeacherBadges(
                Array.from(document.querySelectorAll(`input[data-badge-field="${fieldPrefix}"]:checked`)).map(input => input.value)
            );
        }

        function getTeacherDisplayBadges(teacher) {
            if (!teacher || typeof teacher !== 'object') return [];
            return normalizeTeacherBadges(Array.isArray(teacher.badges) ? teacher.badges : [], teacher?.role);
        }

        function teacherHasBadge(teacher, badgeKey = '') {
            const normalizedBadgeKey = String(badgeKey || '').trim().toLowerCase();
            if (!normalizedBadgeKey || normalizedBadgeKey === 'all') return true;
            const normalizedRoleBadge = getPrimaryTeacherBadgeKey(teacher?.role || '');
            return (normalizedRoleBadge && normalizedBadgeKey === normalizedRoleBadge) || getTeacherDisplayBadges(teacher).includes(normalizedBadgeKey);
        }

        function shouldShowTeacherRolePill(roleLabel = '') {
            return deriveRoleType(roleLabel) !== 'teacher';
        }

        function normalizeLoginActivityRecord(entry) {
            if (!entry || typeof entry !== 'object') return null;
            const loggedInAtIso = String(entry.loggedInAtIso || entry.createdAtIso || '').trim();
            return {
                id: String(entry.id || `login-${loggedInAtIso || Date.now()}`).trim(),
                teacherEmail: String(entry.teacherEmail || '').trim().toLowerCase(),
                teacherName: String(entry.teacherName || '').trim(),
                role: String(entry.role || 'Professor').trim() || 'Professor',
                loggedInAtIso,
                loggedInAt: String(entry.loggedInAt || (loggedInAtIso ? new Date(loggedInAtIso).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'))).trim()
            };
        }

        function normalizeLoginActivityList(values = []) {
            if (!Array.isArray(values)) return [];
            return values
                .map(normalizeLoginActivityRecord)
                .filter(entry => entry && entry.teacherEmail && entry.teacherName)
                .sort((a, b) => (Date.parse(b.loggedInAtIso || '') || 0) - (Date.parse(a.loggedInAtIso || '') || 0))
                .slice(0, LOGIN_ACTIVITY_LIMIT);
        }

        function formatRelativeDuration(startIso = '') {
            const startTime = Date.parse(String(startIso || '').trim());
            if (!Number.isFinite(startTime)) return 'agora';

            const elapsedMs = Math.max(0, Date.now() - startTime);
            const totalMinutes = Math.floor(elapsedMs / 60000);
            const totalHours = Math.floor(totalMinutes / 60);
            const totalDays = Math.floor(totalHours / 24);

            if (totalMinutes < 1) return 'menos de 1 min';
            if (totalMinutes < 60) return `${totalMinutes} min`;
            if (totalHours < 24) return `${totalHours}h ${totalMinutes % 60}min`;
            return `${totalDays}d ${totalHours % 24}h`;
        }

        function isTeacherOnline(teacher) {
            if (!teacher || !teacher.isOnline) return false;
            const lastActiveTime = Date.parse(String(teacher.lastActiveAtIso || '').trim());
            return Number.isFinite(lastActiveTime) && (Date.now() - lastActiveTime) <= 5 * 60 * 1000;
        }

        function getTeacherPresenceMeta(teacher) {
            if (isTeacherOnline(teacher)) {
                return {
                    text: `Online há ${formatRelativeDuration(teacher.onlineSessionStartedAtIso || teacher.lastLoginAtIso)}`,
                    className: 'text-emerald-600',
                    icon: 'wifi'
                };
            }

            if (teacher?.lastLoginAtIso) {
                return {
                    text: `Último login há ${formatRelativeDuration(teacher.lastLoginAtIso)}`,
                    className: 'text-slate-500',
                    icon: 'clock-3'
                };
            }

            return {
                text: 'Sem login registado',
                className: 'text-slate-400',
                icon: 'circle-off'
            };
        }

        function ensureTeacherRecordFromUser(user) {
            const normalizedEmail = normalizeEmailAddress(user?.email);
            if (!normalizedEmail) return null;

            let teacher = MOCK_TEACHERS.find(entry => normalizeEmailAddress(entry.email) === normalizedEmail) || null;
            if (!teacher) {
                teacher = normalizeTeacherRecord({
                    email: normalizedEmail,
                    name: user?.name || normalizedEmail,
                    password: user?.pin || '',
                    role: user?.role || 'Professor',
                    badges: normalizeTeacherBadges([], user?.role || 'Professor'),
                    themePreference: 'auto'
                });
                if (teacher) {
                    MOCK_TEACHERS.unshift(teacher);
                }
            }

            return teacher;
        }

        function recordLoginActivity(user, loginIso) {
            const teacher = ensureTeacherRecordFromUser(user);
            if (!teacher) return;

            const entry = normalizeLoginActivityRecord({
                id: `login-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
                teacherEmail: teacher.email,
                teacherName: teacher.name,
                role: teacher.role,
                loggedInAtIso: loginIso,
                loggedInAt: new Date(loginIso).toLocaleString('pt-BR')
            });

            MOCK_LOGIN_ACTIVITY = normalizeLoginActivityList([entry]);
        }

        function updateTeacherPresence(user, shouldBeOnline, loginIso = '') {
            const teacher = ensureTeacherRecordFromUser(user);
            if (!teacher) return;

            const nowIso = new Date().toISOString();
            teacher.lastActiveAtIso = nowIso;
            teacher.isOnline = Boolean(shouldBeOnline);

            if (loginIso) {
                teacher.lastLoginAtIso = loginIso;
                teacher.onlineSessionStartedAtIso = loginIso;
            } else if (teacher.isOnline) {
                teacher.onlineSessionStartedAtIso = teacher.onlineSessionStartedAtIso || teacher.lastLoginAtIso || nowIso;
            } else {
                teacher.onlineSessionStartedAtIso = '';
            }
        }

        function syncCurrentUserPresence(forceOnline = null) {
            if (!appScreenReady || !MOCK_USER?.email) return;
            const shouldBeOnline = forceOnline === null ? !document.hidden : Boolean(forceOnline);
            updateTeacherPresence(MOCK_USER, shouldBeOnline);
            saveAllData();
        }

        function normalizeTeacherRecord(teacher) {
            if (!teacher || typeof teacher !== 'object') return null;
            const normalizedRole = String(teacher.role || 'Professor').trim() || 'Professor';
            const persistedBadges = Array.isArray(teacher.badges)
                ? normalizeTeacherBadges(teacher.badges, normalizedRole)
                : normalizeTeacherBadges([], normalizedRole);
            return {
                ...teacher,
                email: String(teacher.email || '').trim().toLowerCase(),
                name: String(teacher.name || '').trim(),
                password: teacher.password != null ? String(teacher.password).trim() : '',
                role: normalizedRole,
                badges: persistedBadges,
                lastLoginAtIso: String(teacher.lastLoginAtIso || '').trim(),
                lastActiveAtIso: String(teacher.lastActiveAtIso || '').trim(),
                onlineSessionStartedAtIso: String(teacher.onlineSessionStartedAtIso || '').trim(),
                isOnline: Boolean(teacher.isOnline),
                themePreference: PERSONAL_THEME_OPTIONS.includes(String(teacher.themePreference || '').trim())
                    ? String(teacher.themePreference).trim()
                    : 'auto'
            };
        }

        function ensureViewerAccount() {
            const existingViewer = MOCK_TEACHERS.find(teacher => deriveRoleType(teacher.role) === 'viewer');
            if (existingViewer) {
                existingViewer.role = 'Viewer';
                existingViewer.themePreference = PERSONAL_THEME_OPTIONS.includes(existingViewer.themePreference) ? existingViewer.themePreference : 'auto';
                return;
            }

            if (MOCK_SETTINGS.viewerSeedInitialized) {
                return;
            }

            MOCK_TEACHERS.push({ ...VIEWER_ACCOUNT_TEMPLATE });
            MOCK_SETTINGS.viewerSeedInitialized = true;
        }

        function normalizeAllTeachers() {
            MOCK_TEACHERS = (MOCK_TEACHERS || [])
                .map(normalizeTeacherRecord)
                .filter(teacher => teacher && teacher.email && teacher.name);

            const currentUserEmail = normalizeEmailAddress(MOCK_USER.email);
            if (!MOCK_TEACHERS.some(teacher => normalizeEmailAddress(teacher.email) === currentUserEmail)) {
                MOCK_TEACHERS.unshift(normalizeTeacherRecord({
                    email: currentUserEmail,
                    name: MOCK_USER.name,
                    password: MOCK_USER.pin,
                    role: MOCK_USER.role,
                    themePreference: 'auto'
                }));
            }

            ensureViewerAccount();
            MOCK_TEACHERS.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        }

        function getUserThemePreference() {
            const teacher = getCurrentTeacherRecord();
            if (teacher && PERSONAL_THEME_OPTIONS.includes(teacher.themePreference)) {
                return teacher.themePreference;
            }

            const savedTheme = localStorage.getItem(`marimbondos_theme_${getCurrentUserStorageKey()}`);
            return PERSONAL_THEME_OPTIONS.includes(savedTheme) ? savedTheme : 'auto';
        }

        function applySeasonalTheme(mode = getCurrentThemeMode()) {
            const root = document.documentElement;
            const body = document.body;
            root.dataset.seasonTheme = 'none';
            body.dataset.seasonTheme = 'none';
            body.style.removeProperty('background-image');
            body.style.removeProperty('background-attachment');
            root.style.removeProperty('--seasonal-highlight');
            root.style.removeProperty('--seasonal-highlight-soft');
            root.style.removeProperty('--seasonal-scene-texture-url');
            root.style.removeProperty('--seasonal-stage-texture-url');
            root.style.removeProperty('--seasonal-motion-primary');
            root.style.removeProperty('--seasonal-motion-secondary');
            root.style.removeProperty('--seasonal-motion-tertiary');
            root.style.removeProperty('--seasonal-panel-entrance');
            root.style.removeProperty('--seasonal-tab-enter-x');
            root.style.removeProperty('--seasonal-tab-enter-y');
            root.style.removeProperty('--seasonal-tab-enter-rotate');
            root.style.removeProperty('--seasonal-shimmer-gradient');
            root.style.removeProperty('--seasonal-orb-gradient');
            root.style.removeProperty('--seasonal-orb-opacity');
            root.style.removeProperty('--seasonal-stage-card-gradient');
            updateBrowserThemeColor(mode === 'dark' ? '#0F172A' : '#FAF1CC');
            renderSeasonalThemeScene();
            renderSeasonalThemeDecorations([]);
            syncAndroidSeasonalAppIcon(getHolidayAppTheme());
        }

        function renderSeasonalThemeDecorations(motifs = []) {
            document.getElementById('seasonal-theme-decorations')?.remove();
        }

        function initTheme() {
            THEME_SETTINGS.current = getUserThemePreference();
            applyTheme();
        }

        function applyTheme() {
            const theme = THEME_SETTINGS.current;
            const isDark = theme === 'auto' 
                ? window.matchMedia('(prefers-color-scheme: dark)').matches 
                : theme === 'dark';
            
            const root = document.documentElement;
            const body = document.body;
            
            if (isDark) {
                // Tema Escuro - Cores Modernas
                root.classList.add('dark');
                body.classList.remove('dark-light');
                
                root.style.setProperty('--primary', '#fbbf24');
                root.style.setProperty('--primary-dark', '#f59e0b');
                root.style.setProperty('--secondary', '#3b82f6');
                root.style.setProperty('--success', '#10b981');
                root.style.setProperty('--danger', '#ef4444');
                root.style.setProperty('--warning', '#f59e0b');
                
                root.style.setProperty('--bg', '#0f172a');
                root.style.setProperty('--bg-secondary', '#111827');
                root.style.setProperty('--bg-card', '#1f2937');
                root.style.setProperty('--text-primary', '#f8fafc');
                root.style.setProperty('--text-secondary', '#cbd5e1');
                root.style.setProperty('--text-tertiary', '#fde68a');
                root.style.setProperty('--border', 'rgba(251, 191, 36, 0.16)');
                root.style.setProperty('--shadow', 'rgba(0, 0, 0, 0.34)');
                root.style.setProperty('--surface-1', '#1f2937');
                root.style.setProperty('--surface-2', '#111827');
                root.style.setProperty('--surface-muted', '#273449');
                root.style.setProperty('--panel-border', 'rgba(251, 191, 36, 0.16)');
                root.style.setProperty('--panel-shadow', '0 18px 40px rgba(0, 0, 0, 0.34)');
                body.style.backgroundImage = '';
                body.style.backgroundAttachment = '';
            } else {
                // Tema Claro - Cores Modernas
                root.classList.remove('dark');
                body.classList.add('dark-light');
                
                root.style.setProperty('--primary', '#fbbf24');
                root.style.setProperty('--primary-dark', '#f59e0b');
                root.style.setProperty('--secondary', '#3b82f6');
                root.style.setProperty('--success', '#10b981');
                root.style.setProperty('--danger', '#ef4444');
                root.style.setProperty('--warning', '#f59e0b');
                
                root.style.setProperty('--bg', '#faf1cc');
                root.style.setProperty('--bg-secondary', '#eed79a');
                root.style.setProperty('--bg-card', '#fff7de');
                root.style.setProperty('--text-primary', '#2f2410');
                root.style.setProperty('--text-secondary', '#5b4410');
                root.style.setProperty('--text-tertiary', '#7c5a10');
                root.style.setProperty('--border', 'rgba(180, 83, 9, 0.26)');
                root.style.setProperty('--shadow', 'rgba(146, 64, 14, 0.14)');
                root.style.setProperty('--surface-1', '#fff2c4');
                root.style.setProperty('--surface-2', '#e9cd81');
                root.style.setProperty('--surface-muted', '#e0be62');
                root.style.setProperty('--panel-border', 'rgba(146, 64, 14, 0.18)');
                root.style.setProperty('--panel-shadow', '0 16px 36px rgba(146, 64, 14, 0.14)');
                body.style.backgroundImage = '';
                body.style.backgroundAttachment = '';
            }

            applySeasonalTheme(isDark ? 'dark' : 'light');
            applyLoginHolidayTheme(isDark ? 'dark' : 'light');
            syncAndroidSystemBars(isDark ? 'dark' : 'light');
            localStorage.setItem(`marimbondos_theme_${getCurrentUserStorageKey()}`, THEME_SETTINGS.current);
        }

        function setTheme(theme) {
            if (!PERSONAL_THEME_OPTIONS.includes(theme)) {
                showToast('Tema inválido.', 'error');
                return;
            }

            THEME_SETTINGS.current = theme;
            const currentTeacher = getCurrentTeacherRecord();
            if (currentTeacher) {
                currentTeacher.themePreference = theme;
                saveAllData();
            } else {
                localStorage.setItem(`marimbondos_theme_${getCurrentUserStorageKey()}`, theme);
            }
            applyTheme();
            showToast('Tema pessoal atualizado com sucesso!', 'success');
        }

        function buildSeasonalBackgroundImage(themeKey, palette) {
            const backgrounds = {
                carnaval: `radial-gradient(circle at 12% 18%, ${palette.primary}2f 0%, transparent 24%), radial-gradient(circle at 86% 14%, ${palette.secondary}2e 0%, transparent 22%), radial-gradient(circle at 52% 78%, ${palette.surface2}72 0%, transparent 28%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                pascoa: `radial-gradient(circle at 14% 16%, ${palette.surface2}76 0%, transparent 26%), radial-gradient(circle at 86% 18%, ${palette.secondary}24 0%, transparent 22%), radial-gradient(circle at 52% 84%, ${palette.primary}1c 0%, transparent 28%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                tiradentes: `radial-gradient(circle at 18% 20%, ${palette.primary}20 0%, transparent 24%), radial-gradient(circle at 82% 16%, ${palette.secondary}22 0%, transparent 20%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                'dia-do-trabalho': `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgSecondary} 64%, ${palette.surface1} 100%), radial-gradient(circle at 15% 22%, ${palette.primary}20 0%, transparent 24%), radial-gradient(circle at 82% 76%, ${palette.secondary}20 0%, transparent 22%)`,
                'sao-joao': `radial-gradient(circle at 14% 18%, ${palette.secondary}28 0%, transparent 22%), radial-gradient(circle at 82% 14%, ${palette.primary}26 0%, transparent 22%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                independencia: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgSecondary} 70%, ${palette.surface1} 100%), radial-gradient(circle at 82% 18%, ${palette.secondary}22 0%, transparent 22%), radial-gradient(circle at 14% 74%, ${palette.primary}20 0%, transparent 24%)`,
                'nossa-senhora': `radial-gradient(circle at 50% 12%, ${palette.secondary}22 0%, transparent 24%), radial-gradient(circle at 18% 72%, ${palette.primary}1d 0%, transparent 24%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                criancas: `radial-gradient(circle at 18% 18%, ${palette.primary}2a 0%, transparent 24%), radial-gradient(circle at 82% 22%, ${palette.secondary}22 0%, transparent 24%), radial-gradient(circle at 54% 84%, ${palette.surface2}5e 0%, transparent 30%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                halloween: `radial-gradient(circle at 16% 16%, ${palette.primary}26 0%, transparent 22%), radial-gradient(circle at 84% 18%, ${palette.secondary}24 0%, transparent 22%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                finados: `linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%), radial-gradient(circle at 18% 24%, ${palette.surface2}4a 0%, transparent 24%), radial-gradient(circle at 82% 72%, ${palette.primary}14 0%, transparent 20%)`,
                proclamacao: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bgSecondary} 72%, ${palette.surface1} 100%), radial-gradient(circle at 16% 18%, ${palette.primary}22 0%, transparent 24%), radial-gradient(circle at 84% 18%, ${palette.secondary}20 0%, transparent 20%)`,
                'consciencia-negra': `radial-gradient(circle at 18% 20%, ${palette.primary}26 0%, transparent 22%), radial-gradient(circle at 82% 18%, ${palette.secondary}18 0%, transparent 18%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                natal: `radial-gradient(circle at 18% 16%, ${palette.primary}22 0%, transparent 22%), radial-gradient(circle at 82% 20%, ${palette.secondary}22 0%, transparent 20%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`,
                'ano-novo': `radial-gradient(circle at 16% 18%, ${palette.primary}20 0%, transparent 22%), radial-gradient(circle at 84% 16%, ${palette.secondary}22 0%, transparent 22%), radial-gradient(circle at 50% 84%, ${palette.surface2}5a 0%, transparent 28%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`
            };

            return backgrounds[themeKey] || `radial-gradient(circle at top, ${palette.surface2}66 0%, transparent 34%), radial-gradient(circle at 85% 15%, ${palette.primary}22 0%, transparent 24%), linear-gradient(180deg, ${palette.bg} 0%, ${palette.bgSecondary} 100%)`;
        }

        // --- DADOS E PERMISSÕES GLOBAIS ---
        let MOCK_USER = {
            email: "v.oliveira10@live.com",
            pin: "1104",
            name: "Prof. Victor Oliveira",
            role: "Desenvolvedor",
            roleType: "dev" 
        };

        let MOCK_SETTINGS = {
            maxWeeklyCreditPerTeacher: 50,
            aeeWeeklyBonus: 30,
            aeeCreditDay: 1,
            nextAEECreditDate: '',
            baseCreditPerStudent: 100,
            feiraDate: "",
            creditsFrozen: false,
            storeEnabledForUsers: false,
            storeEnabledForDev: true,
            globalSeasonalTheme: 'none',
            viewerSeedInitialized: false
        };

        let MOCK_STUDENTS = [];
        let MOCK_TEACHERS = [
            { email: "v.oliveira10@live.com", name: "Prof. Victor Oliveira", role: "Desenvolvedor", password: "1104", badges: ['dev'], themePreference: 'auto' },
            { email: "viewer@marimbondos.app", name: "Viewer", role: "Viewer", password: "0000", badges: ['viewer'], themePreference: 'auto' }
        ];

        const GENERAL_HISTORY_RETENTION_DAYS = 15;
        let MOCK_HISTORY = [];
        let MOCK_STUDENT_HISTORY_ARCHIVE = {};
        let MOCK_LOGIN_ACTIVITY = [];
        let historyCounter = 1;
        let MOCK_NOTICES = [];
        let noticesCounter = 1;
        let MOCK_STORE_ITEMS = [];
        let storeItemCounter = 1;
        const PRELOADED_LEARNED_IMPORT_NAMES = Array.isArray(window.MARIMBONDOS_PRELOADED_LEARNED_IMPORT_NAMES)
            ? window.MARIMBONDOS_PRELOADED_LEARNED_IMPORT_NAMES
            : [];
        const STORE_CART = {
            items: [],
            studentId: null,
            studentQuery: ''
        };
        let LEARNED_IMPORT_NAMES = [];
        let LEARNED_GIVEN_NAMES = new Set();
        let LEARNED_SURNAME_NAMES = new Set();
        let LEARNED_COMPOUND_NAMES = new Set();
        const IS_ANDROID_RUNTIME = /Android/i.test(navigator.userAgent || '');

        const FIXED_CLASSES = [
            "1º Ano A", "1º Ano B", "2º Ano A", "2º Ano B", 
            "3º Ano A", "3º Ano B", "4º Ano A", "4º Ano B", 
            "5º Ano A", "5º Ano B"
        ];

        // --- FUNÇÕES DE PERSISTÊNCIA ---
        function saveAllData(options = {}) {
            normalizeAllTeachers();
            compactHistoryStorage();
            const data = buildAppStateSnapshot();

            persistence.save(data);
            syncAllDataToFirebase({ immediate: Boolean(options?.immediateFirebaseSync) });
        }

        async function loadAllData() {
            try {
                let shouldPersistAfterLoad = false;
                const saved = await persistence.load();

                if (saved) {
                    MOCK_SETTINGS = mergeSettings(saved.settings);
                    MOCK_STUDENTS = saved.students || [];
                    normalizeAllStudents();
                    MOCK_TEACHERS = saved.teachers || [{ email: "v.oliveira10@live.com", name: "Prof. Victor Oliveira", role: "Desenvolvedor" }];
                    MOCK_HISTORY = Array.isArray(saved.history) ? saved.history.map(normalizeHistoryRecord).filter(Boolean) : [];
                    MOCK_STUDENT_HISTORY_ARCHIVE = normalizeStudentHistoryArchive(saved.studentHistoryArchive, {});
                    MOCK_LOGIN_ACTIVITY = normalizeLoginActivityList(saved.loginActivity || []);
                    MOCK_NOTICES = saved.notices || [];
                    MOCK_STORE_ITEMS = normalizeAllStoreItems(saved.storeItems || []);
                    LEARNED_IMPORT_NAMES = Array.isArray(saved.learnedImportNames) ? saved.learnedImportNames : [];
                    syncLearnedImportNameCaches();
                    compactHistoryStorage();

                    if (saved.counters) {
                        historyCounter = saved.counters.history || 1;
                        noticesCounter = saved.counters.notices || 1;
                        storeItemCounter = saved.counters.storeItems || (Math.max(0, ...MOCK_STORE_ITEMS.map(item => item.id || 0)) + 1);
                    } else {
                        storeItemCounter = Math.max(0, ...MOCK_STORE_ITEMS.map(item => item.id || 0)) + 1;
                    }

                    console.log('✓ Dados carregados localmente com sucesso');
                } else {
                    if (!MOCK_TEACHERS.some(t => t.email === MOCK_USER.email)) {
                        MOCK_TEACHERS = [{ email: MOCK_USER.email, name: MOCK_USER.name, role: MOCK_USER.role }];
                    }
                    shouldPersistAfterLoad = true;
                    console.log('✓ Sistema inicializado (primeiro acesso)');
                }

                await loadFromFirebaseOnStartup();

                if (hydrateLearnedImportNameDatabase() > 0) {
                    shouldPersistAfterLoad = true;
                }

                if (deactivateSeasonalThemeNotices('')) {
                    shouldPersistAfterLoad = true;
                }

                if (shouldPersistAfterLoad) {
                    saveAllData();
                }
            } catch (err) {
                console.error('Erro ao carregar dados:', err);

                if (!MOCK_TEACHERS.some(t => t.email === MOCK_USER.email)) {
                    MOCK_TEACHERS = [{ email: MOCK_USER.email, name: MOCK_USER.name, role: MOCK_USER.role }];
                }

                hydrateLearnedImportNameDatabase();
                saveAllData();
            }
        }

        let lastUIStateSignature = null;

        function getUIStateSignature() {
            // Gera uma assinatura baseada no estado atual para evitar re-renderização desnecessária
            return JSON.stringify({
                students: MOCK_STUDENTS.length,
                teachers: MOCK_TEACHERS.length,
                history: MOCK_HISTORY.length,
                notices: MOCK_NOTICES.length,
                storeItems: MOCK_STORE_ITEMS.length,
                settings: MOCK_SETTINGS.feiraDate
            });
        }

        function refreshUI() {
            if (currentTabView) {
                const currentSignature = getUIStateSignature();
                
                // Não recarregar UI se não houve mudanças significativas
                if (currentSignature === lastUIStateSignature) {
                    console.log('⏭️ UI não recarregada (sem mudanças)');
                    return;
                }
                
                lastUIStateSignature = currentSignature;
                
                // Melhorada transição suave ao atualizar com Request Animation Frame
                const tabContent = document.getElementById('tab-content');
                if (tabContent) {
                    // Use requestAnimationFrame para sincronizar com o refresh do navegador
                    requestAnimationFrame(() => {
                        tabContent.style.opacity = '0.85';
                        tabContent.style.transition = 'opacity 0.12s cubic-bezier(0.4, 0, 0.2, 1)';
                    });
                }
                
                // Mudar conteúdo recém começada transição de opacidade
                requestAnimationFrame(() => {
                    switchTab(currentTabView);
                    console.log('🔄 UI atualizada para aba:', currentTabView);
                });
                
                // Restaurar opacidade com transição suave
                if (tabContent) {
                    setTimeout(() => {
                        tabContent.style.opacity = '1';
                    }, 60);
                    setTimeout(() => {
                        tabContent.style.transition = ''; // Remove transição após completar
                    }, 200);
                }
            }
        }

        function mergeSettings(rawSettings = {}) {
            return {
                ...MOCK_SETTINGS,
                ...(rawSettings && typeof rawSettings === 'object' ? rawSettings : {}),
                globalSeasonalTheme: 'none',
                viewerSeedInitialized: typeof rawSettings?.viewerSeedInitialized === 'boolean'
                    ? rawSettings.viewerSeedInitialized
                    : Boolean(MOCK_SETTINGS.viewerSeedInitialized)
            };
        }

        function sanitizeCounterValue(value, fallback = 0) {
            const normalizedValue = Math.floor(Number(value));
            return Number.isFinite(normalizedValue) && normalizedValue >= 0 ? normalizedValue : fallback;
        }

        function normalizeHistoryRecord(entry) {
            if (!entry || typeof entry !== 'object') return null;

            const normalizedEntry = {
                ...sanitizeForFirebase(entry),
                id: sanitizeCounterValue(entry.id, 0),
                title: String(entry.title || '').trim(),
                desc: String(entry.desc || '').trim(),
                type: String(entry.type || 'info').trim() || 'info',
                createdAt: String(entry.createdAt || entry.date || new Date().toLocaleString('pt-BR')).trim(),
                studentName: String(entry.studentName || '').trim()
            };

            return normalizedEntry.title || normalizedEntry.desc ? normalizedEntry : null;
        }

        function buildHistoryEntryKey(entry) {
            if (!entry || typeof entry !== 'object') return '';
            if (entry.id !== undefined && entry.id !== null) return `id:${entry.id}`;
            return [entry.studentId || 'global', entry.title || '', entry.createdAtIso || entry.createdAt || entry.date || ''].join('|');
        }

        function sortHistoryEntries(entries = []) {
            return [...entries].sort((a, b) => {
                const timestampA = getHistoryEntryTimestamp(a)?.getTime() || 0;
                const timestampB = getHistoryEntryTimestamp(b)?.getTime() || 0;
                if (timestampA !== timestampB) return timestampB - timestampA;
                return (Number(b?.id) || 0) - (Number(a?.id) || 0);
            });
        }

        function dedupeHistoryEntries(entries = []) {
            const seenEntries = new Set();
            const normalizedEntries = [];

            for (const rawEntry of entries) {
                const normalizedEntry = normalizeHistoryRecord(rawEntry);
                if (!normalizedEntry) continue;
                const entryKey = buildHistoryEntryKey(normalizedEntry);
                if (!entryKey || seenEntries.has(entryKey)) continue;
                seenEntries.add(entryKey);
                normalizedEntries.push(normalizedEntry);
            }

            return sortHistoryEntries(normalizedEntries);
        }

        function normalizeStudentHistoryArchive(rawArchive = {}, fallback = {}) {
            const archiveSource = rawArchive && typeof rawArchive === 'object' && !Array.isArray(rawArchive) ? rawArchive : fallback;
            const normalizedArchive = {};

            Object.entries(archiveSource || {}).forEach(([studentId, entries]) => {
                const numericStudentId = Number(studentId);
                if (!Number.isFinite(numericStudentId) || numericStudentId <= 0 || !Array.isArray(entries)) return;

                const normalizedEntries = dedupeHistoryEntries(entries)
                    .filter(entry => Number(entry.studentId) === numericStudentId);

                if (normalizedEntries.length) {
                    normalizedArchive[String(numericStudentId)] = normalizedEntries;
                }
            });

            return normalizedArchive;
        }

        function compactHistoryStorage() {
            const nextArchive = normalizeStudentHistoryArchive(MOCK_STUDENT_HISTORY_ARCHIVE, {});
            const recentHistory = [];

            dedupeHistoryEntries(MOCK_HISTORY).forEach(entry => {
                if (!shouldDisplayHistoryCard(entry, GENERAL_HISTORY_RETENTION_DAYS)) {
                    const studentId = Number(entry.studentId);
                    if (Number.isFinite(studentId) && studentId > 0) {
                        const archiveKey = String(studentId);
                        const archivedEntries = Array.isArray(nextArchive[archiveKey]) ? nextArchive[archiveKey] : [];
                        nextArchive[archiveKey] = dedupeHistoryEntries([...archivedEntries, entry]);
                    }
                    return;
                }

                recentHistory.push(entry);
            });

            MOCK_HISTORY = recentHistory;
            MOCK_STUDENT_HISTORY_ARCHIVE = nextArchive;
        }

        function normalizeNoticeRecord(notice) {
            if (!notice || typeof notice !== 'object') return null;

            const normalizedNotice = {
                ...sanitizeForFirebase(notice),
                id: sanitizeCounterValue(notice.id, 0),
                author: String(notice.author || '').trim(),
                authorName: String(notice.authorName || '').trim(),
                title: String(notice.title || '').trim(),
                message: String(notice.message || '').trim(),
                active: typeof notice.active === 'boolean' ? notice.active : Boolean(notice.active),
                createdAt: String(notice.createdAt || new Date().toLocaleString('pt-BR')).trim()
            };

            return normalizedNotice.title && normalizedNotice.message ? normalizedNotice : null;
        }

        function sanitizeStringList(values, fallback = []) {
            if (!Array.isArray(values)) return Array.isArray(fallback) ? [...fallback] : [];
            return [...new Set(values
                .map(value => String(value || '').trim())
                .filter(Boolean))];
        }

        function sanitizeRemoteAppState(rawData = {}) {
            const safeData = rawData && typeof rawData === 'object' ? rawData : {};
            const students = Array.isArray(safeData.students)
                ? safeData.students.map(normalizeStudentRecord).filter(student => student && typeof student === 'object')
                : [...(MOCK_STUDENTS || [])];
            const teachers = Array.isArray(safeData.teachers)
                ? safeData.teachers.map(normalizeTeacherRecord).filter(teacher => teacher && teacher.email && teacher.name)
                : [...(MOCK_TEACHERS || [])];
            const history = Array.isArray(safeData.history)
                ? safeData.history.map(normalizeHistoryRecord).filter(Boolean)
                : [...(MOCK_HISTORY || [])];
            const studentHistoryArchive = normalizeStudentHistoryArchive(safeData.studentHistoryArchive, MOCK_STUDENT_HISTORY_ARCHIVE);
            const loginActivity = normalizeLoginActivityList(safeData.loginActivity || MOCK_LOGIN_ACTIVITY);
            const notices = Array.isArray(safeData.notices)
                ? safeData.notices.map(normalizeNoticeRecord).filter(Boolean)
                : [...(MOCK_NOTICES || [])];
            const storeItems = Array.isArray(safeData.storeItems)
                ? normalizeAllStoreItems(safeData.storeItems)
                : normalizeAllStoreItems(MOCK_STORE_ITEMS);
            const learnedImportNames = sanitizeStringList(safeData.learnedImportNames, LEARNED_IMPORT_NAMES);
            const derivedStoreCounter = Math.max(0, ...storeItems.map(item => item.id || 0)) + 1;
            const countersSource = safeData.counters && typeof safeData.counters === 'object' ? safeData.counters : {};

            return {
                settings: mergeSettings(safeData.settings),
                students,
                teachers,
                history,
                studentHistoryArchive,
                loginActivity,
                notices,
                storeItems,
                learnedImportNames,
                counters: {
                    history: sanitizeCounterValue(countersSource.history, historyCounter),
                    notices: sanitizeCounterValue(countersSource.notices, noticesCounter),
                    storeItems: sanitizeCounterValue(countersSource.storeItems, derivedStoreCounter)
                }
            };
        }

        function applyRemoteAppState(allData) {
            MOCK_SETTINGS = mergeSettings(allData.settings);
            MOCK_STUDENTS = allData.students || [];
            normalizeAllStudents();
            MOCK_TEACHERS = allData.teachers || [];
            normalizeAllTeachers();
            MOCK_HISTORY = allData.history || [];
            MOCK_STUDENT_HISTORY_ARCHIVE = normalizeStudentHistoryArchive(allData.studentHistoryArchive, MOCK_STUDENT_HISTORY_ARCHIVE);
            MOCK_LOGIN_ACTIVITY = normalizeLoginActivityList(allData.loginActivity || []);
            MOCK_NOTICES = allData.notices || [];
            MOCK_STORE_ITEMS = normalizeAllStoreItems(allData.storeItems || []);
            LEARNED_IMPORT_NAMES = sanitizeStringList(allData.learnedImportNames, LEARNED_IMPORT_NAMES);
            syncLearnedImportNameCaches();

            historyCounter = sanitizeCounterValue(allData.counters?.history, historyCounter);
            noticesCounter = sanitizeCounterValue(allData.counters?.notices, noticesCounter);
            storeItemCounter = sanitizeCounterValue(
                allData.counters?.storeItems,
                Math.max(0, ...MOCK_STORE_ITEMS.map(item => item.id || 0)) + 1
            );

            compactHistoryStorage();
        }

        function normalizeStudentRecord(student) {
            if (!student || typeof student !== 'object') return student;
            if (!student.weekCredits || typeof student.weekCredits !== 'object') {
                student.weekCredits = {};
            } else {
                const normalizedWeekCredits = {};
                Object.entries(student.weekCredits).forEach(([teacherKey, value]) => {
                    const normalizedTeacherKey = normalizeFirebasePathSegment(String(teacherKey || 'local').toLowerCase());
                    normalizedWeekCredits[normalizedTeacherKey] = (normalizedWeekCredits[normalizedTeacherKey] || 0) + (Number(value) || 0);
                });
                student.weekCredits = normalizedWeekCredits;
            }
            if (typeof student.banned !== 'boolean') {
                student.banned = Boolean(student.banned);
            }
            if (!Number.isFinite(student.balance)) {
                student.balance = Number(student.balance) || 0;
            }
            student.banCount = Number.isFinite(student.banCount) ? student.banCount : 0;
            student.banRelatedToFairDate = String(student.banRelatedToFairDate || '');
            return student;
        }

        function normalizeAllStudents() {
            MOCK_STUDENTS = (MOCK_STUDENTS || []).map(normalizeStudentRecord);
        }

        function normalizeStoreItemRecord(item) {
            if (!item || typeof item !== 'object') return null;

            const normalizedItem = {
                id: Number(item.id) || 0,
                name: String(item.name || '').trim(),
                price: Math.max(0, Number(item.price) || 0),
                quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
                imageData: String(item.imageData || '').trim(),
                createdAt: String(item.createdAt || new Date().toLocaleString('pt-BR')),
                updatedAt: String(item.updatedAt || item.createdAt || new Date().toLocaleString('pt-BR'))
            };

            if (!normalizedItem.name || !normalizedItem.imageData || !normalizedItem.quantity) {
                return null;
            }

            return normalizedItem;
        }

        function normalizeAllStoreItems(items = MOCK_STORE_ITEMS) {
            return (items || [])
                .map(normalizeStoreItemRecord)
                .filter(Boolean)
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        }

        function readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = loadEvent => resolve(String(loadEvent?.target?.result || ''));
                reader.onerror = () => reject(new Error('Falha ao ler arquivo de imagem.'));
                reader.readAsDataURL(file);
            });
        }

        function loadImageElement(src) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error('Falha ao processar a imagem selecionada.'));
                image.src = src;
            });
        }

        async function optimizeStoreItemImage(file) {
            const sourceDataUrl = await readFileAsDataUrl(file);

            try {
                const image = await loadImageElement(sourceDataUrl);
                const maxBytes = 260 * 1024;
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (!context) {
                    return sourceDataUrl;
                }

                const estimateDataUrlBytes = dataUrl => {
                    const base64Payload = String(dataUrl || '').split(',')[1] || '';
                    return Math.ceil((base64Payload.length * 3) / 4);
                };
                const maxDimension = 960;
                const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
                let targetWidth = Math.max(1, Math.round((image.width || 1) * scale));
                let targetHeight = Math.max(1, Math.round((image.height || 1) * scale));
                const qualitySteps = [0.82, 0.76, 0.7, 0.64, 0.58];
                let bestResult = sourceDataUrl;

                for (let dimensionAttempt = 0; dimensionAttempt < 4; dimensionAttempt += 1) {
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    context.clearRect(0, 0, targetWidth, targetHeight);
                    context.imageSmoothingEnabled = true;
                    context.imageSmoothingQuality = 'high';
                    context.drawImage(image, 0, 0, targetWidth, targetHeight);

                    for (const quality of qualitySteps) {
                        const candidate = canvas.toDataURL('image/jpeg', quality);
                        if (candidate.length < bestResult.length) {
                            bestResult = candidate;
                        }
                        if (estimateDataUrlBytes(candidate) <= maxBytes) {
                            return candidate;
                        }
                    }

                    targetWidth = Math.max(320, Math.round(targetWidth * 0.84));
                    targetHeight = Math.max(320, Math.round(targetHeight * 0.84));
                }

                return bestResult.length < sourceDataUrl.length ? bestResult : sourceDataUrl;
            } catch (error) {
                console.warn('Falha ao otimizar imagem da loja, mantendo arquivo original:', error);
                return sourceDataUrl;
            }
        }

        function formatMarimbondosValue(value) {
            const numericValue = Number(value) || 0;
            return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace('.', ',');
        }

        function canManageStoreInventory() {
            const currentRole = getCurrentRoleType();
            return currentRole === 'teacher' || currentRole === 'admin' || currentRole === 'dev';
        }

        function isStoreEnabledForRole(roleType = getCurrentRoleType()) {
            if (roleType === 'viewer') return false;
            return roleType === 'dev'
                ? Boolean(MOCK_SETTINGS.storeEnabledForDev)
                : Boolean(MOCK_SETTINGS.storeEnabledForUsers);
        }

        function canAccessTab(tabId, roleType = getCurrentRoleType()) {
            const targetTab = TABS_CONFIG.find(tab => tab.id === tabId);
            if (!targetTab || !targetTab.roles.includes(roleType)) return false;
            if (tabId === 'store') return isStoreEnabledForRole(roleType);
            return true;
        }

        function getAvailableTabs(roleType = getCurrentRoleType()) {
            return TABS_CONFIG.filter(tab => canAccessTab(tab.id, roleType));
        }

        function createSystemNotice(title, message, fairCycle = '') {
            const existingNotice = MOCK_NOTICES.find(notice => notice.systemNoticeType === 'fair-turnover' && notice.fairCycle === fairCycle);
            if (existingNotice) {
                existingNotice.title = title;
                existingNotice.message = message;
                existingNotice.active = true;
                return existingNotice;
            }

            const newNotice = {
                id: noticesCounter++,
                author: 'system@marimbondos.local',
                authorName: 'Sistema',
                title,
                message,
                active: true,
                createdAt: new Date().toLocaleString('pt-BR'),
                systemNoticeType: 'fair-turnover',
                fairCycle
            };

            MOCK_NOTICES.unshift(newNotice);
            return newNotice;
        }

        function deactivateSeasonalThemeNotices(exceptCycle = '') {
            let changed = false;
            (MOCK_NOTICES || []).forEach(notice => {
                if (notice.systemNoticeType === 'seasonal-theme' && notice.themeCycle !== exceptCycle) {
                    if (notice.active) changed = true;
                    notice.active = false;
                }
            });
            return changed;
        }

        function syncSeasonalThemeNotice() {
            return deactivateSeasonalThemeNotices('');
        }

        function escapeHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getTeacherCreditKey() {
            return normalizeFirebasePathSegment(String(MOCK_USER?.email || 'local').toLowerCase());
        }

        function canDistributeCreditsWhileFrozen() {
            return getCurrentRoleType() === 'dev';
        }

        function getStudentWeeklyCredit(student, teacherKey = getTeacherCreditKey()) {
            normalizeStudentRecord(student);
            return Number(student.weekCredits[teacherKey]) || 0;
        }

        function setStudentWeeklyCredit(student, amount, teacherKey = getTeacherCreditKey()) {
            normalizeStudentRecord(student);
            student.weekCredits[teacherKey] = Number(amount) || 0;
        }

        function getTeacherWeeklyDistributedCredit(teacherKey = getTeacherCreditKey()) {
            return MOCK_STUDENTS.reduce((total, student) => total + getStudentWeeklyCredit(student, teacherKey), 0);
        }

        function getDisplayHistoryTitle(title) {
            if (title === 'Banido Aluno') return 'Banimento de Aluno';
            if (title === 'Desbanido Aluno') return 'Desbanimento de Aluno';
            return title;
        }

        function getHistoryVisuals(entry) {
            const title = getDisplayHistoryTitle(entry?.title || '');
            const desc = String(entry?.desc || '');
            const noticeEntry = /aviso|notifica|comunicado/i.test(title) || /aviso|notifica|comunicado/i.test(desc);

            // Backup entries: automatic backups created by scheduled server task
            if (/backup automático|backup automatico|backup diário|backup diario/i.test(title) || /backup automático|backup automatico|backup diário|backup diario/i.test(desc) || entry?.metadata?.autoBackup) {
                return {
                    title,
                    badgeLabel: 'Backup Auto',
                    badgeClass: 'bg-violet-100 text-violet-800 border border-violet-200',
                    borderClass: 'border-violet-500',
                    cardClass: 'bg-violet-50/40'
                };
            }

            // Manual backup entries (created via UI or manual trigger)
            if (/backup manual|backup criado|backup criado manualmente/i.test(title) || /backup manual|backup criado|backup criado manualmente/i.test(desc) || entry?.metadata?.manualBackup) {
                return {
                    title,
                    badgeLabel: 'Backup',
                    badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
                    borderClass: 'border-purple-400',
                    cardClass: 'bg-purple-50/30'
                };
            }

            if (/banimento de aluno/i.test(title)) {
                return {
                    title,
                    badgeLabel: 'Banimento',
                    badgeClass: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
                    borderClass: 'border-yellow-500',
                    cardClass: 'bg-yellow-50/40'
                };
            }

            if (/desbanimento automático/i.test(title)) {
                return {
                    title,
                    badgeLabel: 'Desban. Auto',
                    badgeClass: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
                    borderClass: 'border-emerald-500',
                    cardClass: 'bg-emerald-50/40'
                };
            }

            if (/desbanimento de aluno/i.test(title)) {
                return {
                    title,
                    badgeLabel: 'Desban. Manual',
                    badgeClass: 'bg-teal-100 text-teal-700 border border-teal-200',
                    borderClass: 'border-teal-500',
                    cardClass: 'bg-teal-50/40'
                };
            }

            if (entry?.type === 'deletion') {
                return {
                    title,
                    badgeLabel: 'Exclusão',
                    badgeClass: 'bg-red-500 text-white border border-red-500',
                    borderClass: 'border-red-600',
                    cardClass: 'bg-red-100'
                };
            }

            if (entry?.type === 'aee-auto-credit') {
                return {
                    title,
                    badgeLabel: 'Crédito AEE',
                    badgeClass: 'bg-pink-100 text-pink-700 border border-pink-200',
                    borderClass: 'border-pink-500',
                    cardClass: 'bg-pink-50/40'
                };
            }

            if (entry?.type === 'credit') {
                return {
                    title,
                    badgeLabel: 'Crédito',
                    badgeClass: 'bg-green-500 text-white border border-green-500',
                    borderClass: 'border-green-500',
                    cardClass: 'bg-green-50/30'
                };
            }

            if (entry?.type === 'debit') {
                return {
                    title,
                    badgeLabel: 'Débito',
                    badgeClass: 'bg-red-400 text-white border border-red-400',
                    borderClass: 'border-red-500',
                    cardClass: 'bg-red-50/30'
                };
            }

            if (noticeEntry) {
                return {
                    title,
                    badgeLabel: 'Aviso',
                    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
                    borderClass: 'border-amber-400',
                    cardClass: 'bg-amber-50/40'
                };
            }

            if (entry?.type === 'creation') {
                return {
                    title,
                    badgeLabel: 'Criação',
                    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
                    borderClass: 'border-amber-400',
                    cardClass: 'bg-amber-50/40'
                };
            }

            return {
                title,
                badgeLabel: 'Edição',
                badgeClass: 'bg-blue-100 text-blue-700 border border-blue-200',
                borderClass: 'border-blue-500',
                cardClass: 'bg-blue-50/40'
            };
        }

        function canManageNotice(notice) {
            return Boolean(notice) && canAdministerNotices();
        }

        function canAdministerNotices() {
            return MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin';
        }

        function canManageTeachers() {
            return MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin';
        }

        function canDeleteStudents() {
            return MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin';
        }

        function canImportStudents() {
            return MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin';
        }

        function canViewActivityHistory() {
            return MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin' || MOCK_USER.roleType === 'teacher';
        }

        function canAccessDeveloperTools() {
            return MOCK_USER.roleType === 'dev';
        }

        function isDeveloperTeacherRecord(teacher) {
            return Boolean(teacher) && deriveRoleType(teacher.role) === 'dev';
        }

        function canModifyTeacherRecord(teacher) {
            if (!canManageTeachers() || !teacher) return false;
            if (!isDeveloperTeacherRecord(teacher)) return true;
            return MOCK_USER.roleType === 'dev' && MOCK_USER.email !== teacher.email;
        }

        function canEditTeacherRecord(teacher) {
            if (!canManageTeachers() || !teacher) return false;
            if (!isDeveloperTeacherRecord(teacher)) return true;
            return MOCK_USER.roleType === 'dev';
        }

        function canAssignDeveloperRole(roleLabel = '') {
            return deriveRoleType(roleLabel) !== 'dev' || MOCK_USER.roleType === 'dev';
        }

        function canBypassCreditRestrictions() {
            const currentRole = getCurrentRoleType();
            return currentRole === 'dev' || currentRole === 'admin';
        }

        function deriveRoleType(roleLabel = '') {
            const normalizedRole = String(roleLabel || '').trim().toLowerCase();
            if (!normalizedRole) return 'teacher';
            if (normalizedRole.includes('viewer') || normalizedRole.includes('visual')) return 'viewer';
            if (normalizedRole.includes('desenvol') || normalizedRole === 'dev') return 'dev';
            if (normalizedRole.includes('admin') || normalizedRole.includes('diret')) return 'admin';
            return 'teacher';
        }

        function getCurrentRoleType() {
            const resolvedRole = deriveRoleType(MOCK_USER?.roleType || MOCK_USER?.role);
            return ['teacher', 'admin', 'dev', 'viewer'].includes(resolvedRole) ? resolvedRole : 'teacher';
        }

        function getFallbackTabId(roleType = getCurrentRoleType()) {
            return getAvailableTabs(roleType)[0]?.id || 'account';
        }

        function renderTabCrashState(tabId, error) {
            const container = document.getElementById('tab-content');
            if (!container) return;

            const safeMessage = escapeHtml(error?.message || 'Falha desconhecida ao montar a interface.');
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded-[2rem] p-6 shadow-sm space-y-4">
                    <div class="flex items-start gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                        </div>
                        <div class="space-y-2 min-w-0">
                            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-red-600">Falha de Renderização</p>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Não foi possível abrir a aba ${escapeHtml(String(tabId || 'atual'))}</h3>
                            <p class="text-sm text-slate-600 leading-relaxed">${safeMessage}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button onclick="switchTab('transactions')" class="py-3 px-4 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs tracking-widest btn-bounce flex items-center justify-center gap-2">
                            <i data-lucide="arrow-right-left" class="w-4 h-4"></i> Abrir Transações
                        </button>
                        <button onclick="switchTab(getFallbackTabId())" class="py-3 px-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold uppercase text-xs tracking-widest btn-bounce flex items-center justify-center gap-2">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i> Recarregar Aba Permitida
                        </button>
                    </div>
                </div>
            `;
            initIcons();
            applyAutofillGuards(container);
            enhanceInteractiveElements(container);
        }

        function captureUIState(tabId = currentTabView) {
            switch (tabId) {
                case 'transactions': {
                    const searchInput = document.getElementById('trans-search');
                    const reasonInput = document.getElementById('trans-reason');
                    const valueInput = document.getElementById('trans-value');
                    if (searchInput) UI_STATE.transactions.search = searchInput.value;
                    if (reasonInput) UI_STATE.transactions.reason = reasonInput.value;
                    if (valueInput) UI_STATE.transactions.value = valueInput.value;
                    UI_STATE.transactions.selectedStudentIds = Array.from(document.querySelectorAll('.trans-student-cb:checked')).map(cb => cb.value);
                    break;
                }
                case 'store': {
                    const storeSearch = document.getElementById('store-search');
                    if (storeSearch) UI_STATE.store.search = storeSearch.value;
                    break;
                }
                case 'students': {
                    const studentsSearch = document.getElementById('students-search');
                    if (studentsSearch) UI_STATE.students.search = studentsSearch.value;
                    break;
                }
                case 'teachers': {
                    const teachersSearch = document.getElementById('teachers-search');
                    if (teachersSearch) UI_STATE.teachers.search = teachersSearch.value;
                    break;
                }
                case 'settings': {
                    const maxCreditInput = document.getElementById('config-max-credit');
                    const aeeBonusInput = document.getElementById('config-aee-bonus');
                    const feiraDateInput = document.getElementById('config-feira-date');
                    if (maxCreditInput) UI_STATE.settings.maxCredit = maxCreditInput.value;
                    if (aeeBonusInput) UI_STATE.settings.aeeBonus = aeeBonusInput.value;
                    if (feiraDateInput) UI_STATE.settings.feiraDate = feiraDateInput.value;
                    if (document.getElementById('config-freeze-credits')) {
                        UI_STATE.settings.creditsFrozen = document.getElementById('config-freeze-credits').checked;
                    }
                    if (document.getElementById('config-store-users')) {
                        UI_STATE.settings.storeEnabledForUsers = document.getElementById('config-store-users').checked;
                    }
                    if (document.getElementById('config-store-dev')) {
                        UI_STATE.settings.storeEnabledForDev = document.getElementById('config-store-dev').checked;
                    }
                    break;
                }
            }
        }

        function restoreUIState(tabId) {
            switch (tabId) {
                case 'transactions': {
                    const transSearch = document.getElementById('trans-search');
                    const transReason = document.getElementById('trans-reason');
                    const transValue = document.getElementById('trans-value');
                    if (transSearch) transSearch.value = UI_STATE.transactions.search || '';
                    if (transReason) transReason.value = UI_STATE.transactions.reason || '';
                    if (transValue) transValue.value = UI_STATE.transactions.value || '';
                    filterTransactionStudents(UI_STATE.transactions.search || '');
                    UI_STATE.transactions.selectedStudentIds.forEach(studentId => {
                        const checkbox = document.querySelector(`.trans-student-cb[value="${studentId}"]`);
                        if (checkbox && !checkbox.disabled) checkbox.checked = true;
                    });
                    break;
                }
                case 'store': {
                    const storeSearch = document.getElementById('store-search');
                    if (storeSearch) storeSearch.value = UI_STATE.store.search || '';
                    filterStoreItems(UI_STATE.store.search || '');
                    break;
                }
                case 'students': {
                    const studentsSearch = document.getElementById('students-search');
                    if (studentsSearch) studentsSearch.value = UI_STATE.students.search || '';
                    filterStudentsDirectory(UI_STATE.students.search || '');
                    break;
                }
                case 'teachers': {
                    const teachersSearch = document.getElementById('teachers-search');
                    if (teachersSearch) teachersSearch.value = UI_STATE.teachers.search || '';
                    filterTeachersDirectory(UI_STATE.teachers.search || '');
                    break;
                }
                case 'settings':
                    if (UI_STATE.settings.maxCredit !== '' && document.getElementById('config-max-credit')) {
                        document.getElementById('config-max-credit').value = UI_STATE.settings.maxCredit;
                    }
                    if (UI_STATE.settings.aeeBonus !== '' && document.getElementById('config-aee-bonus')) {
                        document.getElementById('config-aee-bonus').value = UI_STATE.settings.aeeBonus;
                    }
                    if (UI_STATE.settings.feiraDate !== '' && document.getElementById('config-feira-date')) {
                        document.getElementById('config-feira-date').value = UI_STATE.settings.feiraDate;
                    }
                    if (UI_STATE.settings.creditsFrozen !== null && document.getElementById('config-freeze-credits')) {
                        document.getElementById('config-freeze-credits').checked = UI_STATE.settings.creditsFrozen;
                    }
                    if (UI_STATE.settings.storeEnabledForUsers !== null && document.getElementById('config-store-users')) {
                        document.getElementById('config-store-users').checked = UI_STATE.settings.storeEnabledForUsers;
                    }
                    if (UI_STATE.settings.storeEnabledForDev !== null && document.getElementById('config-store-dev')) {
                        document.getElementById('config-store-dev').checked = UI_STATE.settings.storeEnabledForDev;
                    }
                    break;
            }
        }

        function filterStudentsDirectory(term = '') {
            const normalizedTerm = String(term).trim().toLowerCase();
            UI_STATE.students.search = term;
            const cards = document.querySelectorAll('.student-class-card[data-class][data-students]');
            const resultsContainer = document.getElementById('students-search-results');
            const classesContainer = document.getElementById('students-classes-container');
            const matchingStudents = !normalizedTerm
                ? []
                : MOCK_STUDENTS
                    .filter(student => {
                        const haystack = `${student.name} ${student.class} ${student.aee ? 'aee' : ''}`.toLowerCase();
                        return haystack.includes(normalizedTerm);
                    })
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

            let visibleCount = 0;

            cards.forEach(card => {
                const className = card.getAttribute('data-class') || '';
                const students = card.getAttribute('data-students') || '';
                const matches = !normalizedTerm || className.includes(normalizedTerm) || students.includes(normalizedTerm);
                card.style.display = matches ? 'block' : 'none';
                if (matches) visibleCount++;
            });

            if (classesContainer) {
                classesContainer.classList.toggle('hidden', Boolean(normalizedTerm));
            }

            if (resultsContainer) {
                if (!normalizedTerm) {
                    resultsContainer.classList.add('hidden');
                    resultsContainer.innerHTML = '';
                } else {
                    resultsContainer.classList.remove('hidden');
                    resultsContainer.innerHTML = matchingStudents.length
                        ? `
                            <div class="space-y-3">
                                <div class="flex items-center justify-between gap-3">
                                    <div>
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resultados da Busca</p>
                                        <h4 class="text-sm font-black uppercase tracking-tight text-slate-800">${matchingStudents.length} aluno(s) encontrados</h4>
                                    </div>
                                    <span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest">${escapeHtml(term)}</span>
                                </div>
                                ${matchingStudents.map(student => {
                                    const showBanButton = !student.banned || canManuallyUnbanStudents();
                                    const showDeleteButton = canDeleteStudents();
                                    const banButtonLabel = student.banned ? 'Desbanir' : 'Banir';
                                    const banButtonTitle = student.banned ? 'Desbanir' : 'Banir';
                                    const banButtonClass = student.banned
                                        ? 'directory-action-btn-unban'
                                        : 'directory-action-btn-ban';
                                    const banButtonIcon = student.banned ? 'unlock' : 'ban';
                                    return `
                                    <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm transition hover:border-amber-300 hover:shadow-md">
                                        <div class="flex items-start justify-between gap-4">
                                            <button onclick="openStudentActionMenu(${student.id})" class="min-w-0 flex-1 text-left">
                                                <div class="flex flex-wrap items-center gap-2 mb-2">
                                                    <span class="text-sm font-black uppercase tracking-tight text-slate-800">${escapeHtml(student.name)}</span>
                                                    ${student.aee ? '<span class="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest">AEE</span>' : ''}
                                                    ${student.banned ? '<span class="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest">Banido</span>' : ''}
                                                    ${(student.banCount || 0) > 0 ? `<span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">${student.banCount} ban.</span>` : ''}
                                                </div>
                                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${escapeHtml(student.class)} • Saldo M$ ${student.balance}</p>
                                            </button>
                                            <i data-lucide="arrow-up-right" class="w-4 h-4 text-slate-400 shrink-0 mt-1"></i>
                                        </div>
                                        <div class="directory-action-row directory-action-row-compact">
                                            <button onclick="openStudentHistory(${student.id})" class="directory-action-btn directory-action-btn-history directory-action-btn-compact btn-bounce">
                                                <i data-lucide="history"></i> Histórico
                                            </button>
                                            <button onclick="openEditStudentModal(${student.id})" class="directory-action-btn directory-action-btn-edit directory-action-btn-compact btn-bounce">
                                                <i data-lucide="pencil"></i> Editar
                                            </button>
                                            ${showDeleteButton ? `<button onclick="handleDeleteStudent(${student.id})" class="directory-action-btn directory-action-btn-delete directory-action-btn-compact btn-bounce">
                                                <i data-lucide="trash-2"></i> Excluir
                                            </button>` : ''}
                                            ${showBanButton ? `<button onclick="toggleBanStudent(${student.id})" title="${banButtonTitle}" class="directory-action-btn ${banButtonClass} directory-action-btn-compact btn-bounce">
                                                <i data-lucide="${banButtonIcon}"></i> ${banButtonLabel}
                                            </button>` : ''}
                                        </div>
                                    </div>
                                `;}).join('')}
                            </div>
                        `
                        : `
                            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                                <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum aluno corresponde a essa busca</p>
                            </div>
                        `;
                    lucide.createIcons();
                }
            }

            const emptyState = document.getElementById('students-search-empty');
            if (emptyState) {
                emptyState.classList.toggle('hidden', normalizedTerm ? true : visibleCount > 0);
            }
        }

        function getBannedStudents() {
            return MOCK_STUDENTS
                .filter(student => student.banned)
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        }

        function getStudentsWithBanHistory() {
            return MOCK_STUDENTS
                .filter(student => Number(student.banCount) > 0)
                .sort((a, b) => (Number(b.banCount) || 0) - (Number(a.banCount) || 0) || a.name.localeCompare(b.name, 'pt-BR'));
        }

        function getStudentBanReasons(studentId) {
            return getStudentHistoryEntries(studentId)
                .filter(entry => entry.studentId === studentId && /banimento de aluno/i.test(entry.title || ''))
                .map(entry => {
                    const plainDesc = String(entry.desc || '')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&amp;/g, '&')
                        .replace(/\s+/g, ' ')
                        .trim();
                    const reasonMatch = plainDesc.match(/Motivo:\s*(.+?)(?:\.\s*Liberação automática prevista|$)/i);
                    return {
                        date: entry.date,
                        reason: reasonMatch ? reasonMatch[1].trim() : plainDesc,
                        fullDesc: plainDesc
                    };
                });
        }

        function getPersistentBanCount() {
            return MOCK_STUDENTS.reduce((total, student) => total + (Number(student.banCount) || 0), 0);
        }

        function getStudentsWithBanHistoryCount() {
            return getBannedStudents().length;
        }

        function canManuallyUnbanStudents() {
            return MOCK_USER.roleType === 'dev';
        }

        function getStudentsByBalanceFilter(filterType) {
            const students = [...MOCK_STUDENTS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
            switch (filterType) {
                case 'positive-balance':
                    return students.filter(student => student.balance > 0);
                case 'negative-balance':
                    return students.filter(student => student.balance < 0);
                case 'zero-balance':
                    return students.filter(student => student.balance === 0);
                default:
                    return [];
            }
        }

        function openBalanceStudentsModal(filterType) {
            const students = getStudentsByBalanceFilter(filterType);
            const configByType = {
                'positive-balance': {
                    title: 'Alunos com Saldo Positivo',
                    subtitle: 'Lista dos alunos com saldo acima de zero.',
                    badge: 'Saldo +',
                    tone: 'bg-green-50 border-green-100 text-green-700',
                    valueClass: 'text-green-600'
                },
                'negative-balance': {
                    title: 'Alunos Negativados',
                    subtitle: 'Lista dos alunos com saldo abaixo de zero.',
                    badge: 'Saldo -',
                    tone: 'bg-red-50 border-red-100 text-red-700',
                    valueClass: 'text-red-600'
                },
                'zero-balance': {
                    title: 'Alunos com Saldo Zerado',
                    subtitle: 'Lista dos alunos que estão exatamente com saldo zero.',
                    badge: 'Saldo 0',
                    tone: 'bg-slate-50 border-slate-200 text-slate-700',
                    valueClass: 'text-slate-600'
                }
            };
            const config = configByType[filterType];
            if (!config) return;

            openModal(`
                <div class="space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configurações</p>
                            <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">${config.title}</h3>
                            <p class="text-sm text-slate-500 font-medium">${config.subtitle}</p>
                        </div>
                        <button type="button" onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal de saldo">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="flex items-center justify-between rounded-2xl border px-4 py-3 ${config.tone}">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest">${config.badge}</p>
                            <p class="text-sm font-semibold">${students.length} aluno(s)</p>
                        </div>
                        <i data-lucide="wallet" class="w-5 h-5"></i>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
                        ${students.length ? students.map(student => `
                            <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                <div class="flex items-start justify-between gap-3">
                                    <button onclick="openStudentActionMenu(${student.id})" class="min-w-0 flex-1 text-left">
                                        <div class="flex flex-wrap items-center gap-2 mb-1">
                                            <p class="font-black text-sm uppercase tracking-tight text-slate-800">${escapeHtml(student.name)}</p>
                                            ${student.aee ? '<span class="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest">AEE</span>' : ''}
                                            ${student.banned ? '<span class="px-2 py-1 rounded-full bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest">Banido</span>' : ''}
                                        </div>
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${escapeHtml(student.class)}</p>
                                    </button>
                                    <div class="text-right shrink-0">
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo</p>
                                        <p class="text-lg font-black ${config.valueClass}">M$ ${student.balance}</p>
                                    </div>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                                <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum aluno nesta categoria</p>
                            </div>
                        `}
                    </div>
                </div>
            `);
        }

        function getFairHistoryEntries() {
            return MOCK_HISTORY
                .filter(entry => entry?.metadata?.fairCycle || /virada da feira|zeragem pós-feira|desbanimento automático|saldo negativo zerado/i.test(entry?.title || ''))
                .sort((a, b) => b.id - a.id);
        }

        function getStudentHistoryEntries(studentId) {
            const archiveKey = String(studentId);
            const recentEntries = MOCK_HISTORY.filter(entry => Number(entry.studentId) === Number(studentId));
            const archivedEntries = Array.isArray(MOCK_STUDENT_HISTORY_ARCHIVE[archiveKey]) ? MOCK_STUDENT_HISTORY_ARCHIVE[archiveKey] : [];
            return dedupeHistoryEntries([...recentEntries, ...archivedEntries]);
        }

        function renderHistoryList(entries, emptyMessage = 'Sem registros.') {
            const isDev = MOCK_USER.roleType === 'dev';
            if (!entries.length) {
                return `
                    <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                        <i data-lucide="clock-3" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${emptyMessage}</p>
                    </div>
                `;
            }

            return entries.map(entry => {
                const visuals = getHistoryVisuals(entry);
                const fairLabel = entry?.metadata?.fairCycle ? `<span class="history-badge bg-slate-100 text-slate-700 border border-slate-200">Feira ${escapeHtml(entry.metadata.fairCycle)}</span>` : '';
                const entryDesc = highlightHistoryStudentName(entry.desc || '', entry.studentName || '');
                return `
                    <div class="history-item p-4 rounded-2xl border-l-4 card-shadow mb-3 flex flex-col sm:flex-row justify-between items-start gap-3 transition-all ${visuals.borderClass} ${visuals.cardClass}">
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                <p class="history-date text-[10px] font-bold text-slate-400">${entry.date}</p>
                                <span class="history-badge ${visuals.badgeClass}">${visuals.badgeLabel}</span>
                                ${fairLabel}
                            </div>
                            <p class="history-title font-black text-sm text-slate-800 uppercase tracking-tight">${visuals.title}</p>
                            <div class="history-desc text-xs text-slate-600 mt-1 leading-relaxed">${entryDesc}</div>
                            <p class="history-author text-[9px] text-slate-400 mt-2 font-bold italic flex items-center gap-1">
                                <i data-lucide="user" class="w-2.5 h-2.5"></i> Executado por: ${entry.author}
                            </p>
                        </div>
                        <div class="flex items-center gap-1 ml-0 sm:ml-4 w-full sm:w-auto justify-end flex-wrap">
                            ${isDev ? `
                                <button onclick="undoHistoryEntry(${entry.id})" class="history-action-btn p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition btn-bounce flex items-center gap-1 border border-blue-100" title="Reverter este registro">
                                    <i data-lucide="undo-2" class="w-4 h-4"></i>
                                    <span class="text-[10px] font-bold uppercase">Reverter</span>
                                </button>
                                <button onclick="deleteHistoryEntry(${entry.id})" class="history-action-btn history-delete-btn p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition btn-bounce flex items-center gap-1 border border-red-100" title="Deletar este registro">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function parseAppDate(value = '') {
            if (!value) return null;
            if (value instanceof Date) {
                return Number.isNaN(value.getTime()) ? null : value;
            }

            const normalizedValue = String(value).trim();
            if (!normalizedValue) return null;

            const directDate = new Date(normalizedValue);
            if (!Number.isNaN(directDate.getTime())) {
                return directDate;
            }

            const match = normalizedValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
            if (!match) return null;

            const day = Number(match[1]);
            const month = Number(match[2]) - 1;
            const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
            const hours = Number(match[4] || 0);
            const minutes = Number(match[5] || 0);
            const seconds = Number(match[6] || 0);
            const parsedDate = new Date(year, month, day, hours, minutes, seconds);
            return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
        }

        function getHistoryEntryTimestamp(entry) {
            return parseAppDate(entry?.createdAtIso || entry?.createdAt || entry?.date);
        }

        function shouldDisplayHistoryCard(entry, maxAgeDays = 15) {
            const entryDate = getHistoryEntryTimestamp(entry);
            if (!entryDate) return true;
            const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
            return (Date.now() - entryDate.getTime()) <= maxAgeMs;
        }

        function openBannedStudentsModal() {
            const studentsWithBanHistory = getStudentsWithBanHistory();
            const studentsWithBanHistoryCount = getStudentsWithBanHistoryCount();
            const contentHtml = `
                <div class="space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configurações</p>
                            <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Histórico de Banimentos</h3>
                            <p class="text-sm text-slate-500 font-medium">Contagem persistente de banimentos e motivos registrados por aluno.</p>
                        </div>
                        <button type="button" onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal de banimentos">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-amber-700">Alunos com Histórico</p>
                            <p class="text-sm font-semibold text-amber-900">${studentsWithBanHistoryCount} aluno(s)</p>
                        </div>
                        <i data-lucide="ban" class="w-5 h-5 text-amber-600"></i>
                    </div>
                    <div class="max-h-[60vh] overflow-y-auto pr-1 space-y-3">
                        ${studentsWithBanHistory.length ? studentsWithBanHistory.map(student => {
                            const reasons = getStudentBanReasons(student.id);
                            return `
                                <div class="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                    <div class="flex items-start justify-between gap-3 mb-3">
                                        <button onclick="openStudentActionMenu(${student.id})" class="min-w-0 flex-1 text-left">
                                            <div class="flex flex-wrap items-center gap-2 mb-1">
                                                <p class="font-black text-sm uppercase tracking-tight text-slate-800">${escapeHtml(student.name)}</p>
                                                <span class="px-2 py-1 rounded-full ${student.banned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} text-[9px] font-black uppercase tracking-widest">${student.banned ? 'Banido agora' : 'Ativo'}</span>
                                                <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">${student.banCount || 0} ban.</span>
                                            </div>
                                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${escapeHtml(student.class)} • Saldo M$ ${student.balance}</p>
                                        </button>
                                    </div>
                                    <div class="space-y-2">
                                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivos registrados</p>
                                        ${reasons.length ? reasons.map(reason => `
                                            <div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                                <div class="flex items-center justify-between gap-2 mb-1">
                                                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(reason.date)}</span>
                                                </div>
                                                <p class="text-xs text-slate-700 leading-relaxed font-medium">${escapeHtml(reason.reason)}</p>
                                            </div>
                                        `).join('') : '<div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 text-xs text-slate-500 font-medium">Sem motivo legível no histórico antigo.</div>'}
                                    </div>
                                </div>
                            `;
                        }).join('') : `
                            <div class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                                <i data-lucide="shield-check" class="w-8 h-8 mx-auto mb-2 text-emerald-300"></i>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nenhum banimento foi registrado ainda</p>
                            </div>
                        `}
                    </div>
                </div>
            `;
            openModal(contentHtml);
        }

        function openFairHistoryModal() {
            const fairHistory = getFairHistoryEntries();
            const contentHtml = `
                <div class="space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Configurações</p>
                            <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Histórico da Feira</h3>
                            <p class="text-sm text-slate-500 font-medium">Registros das execuções da virada da feira e seus efeitos.</p>
                        </div>
                        <button type="button" onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal do histórico da feira">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="max-h-[65vh] overflow-y-auto pr-1">
                        ${renderHistoryList(fairHistory, 'Nenhuma execução da feira foi registrada ainda.')}
                    </div>
                </div>
            `;
            openModal(contentHtml);
        }

        function runFairDayTurnoverManually() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode executar a virada manual da feira.', 'error');
                return;
            }

            const feiraDateInput = document.getElementById('config-feira-date');
            const resolvedFairDate = feiraDateInput && feiraDateInput.value
                ? feiraDateInput.value
                : MOCK_SETTINGS.feiraDate;

            if (!resolvedFairDate) {
                showToast('Defina a data da feira antes de executar a virada.', 'error');
                return;
            }

            MOCK_SETTINGS.feiraDate = resolvedFairDate;

            const changed = processFairDayTurnover(true, resolvedFairDate);
            if (changed) {
                saveAllData();
                showToast('Virada da feira executada com sucesso!', 'success');
            } else {
                showToast('Nenhum aluno precisou de ajuste nesta virada.', 'success');
            }

            switchTab('settings');
        }

        function filterTeachersDirectory(term = '') {
            const normalizedTerm = normalizeSearchText(term);
            UI_STATE.teachers.search = term;
            const activeBadge = String(UI_STATE.teachers.badge || 'all').trim().toLowerCase();
            const rows = document.querySelectorAll('.teacher-directory-row');
            let visibleCount = 0;

            rows.forEach(row => {
                const searchable = row.getAttribute('data-search') || '';
                const badgeList = (row.getAttribute('data-badges') || '').split('|').filter(Boolean);
                const roleBadge = String(row.getAttribute('data-role-badge') || '').trim().toLowerCase();
                const matchesSearch = !normalizedTerm || searchable.includes(normalizedTerm);
                const matchesBadge = activeBadge === 'all' || badgeList.includes(activeBadge) || roleBadge === activeBadge;
                const matches = matchesSearch && matchesBadge;
                row.style.display = matches ? 'flex' : 'none';
                if (matches) visibleCount++;
            });

            const emptyState = document.getElementById('teachers-search-empty');
            if (emptyState) {
                emptyState.classList.toggle('hidden', visibleCount > 0);
            }
        }

        function setTeacherDirectoryBadgeFilter(filterKey = 'all') {
            UI_STATE.teachers.badge = ['all', 'docente', 'admin', 'direcao', 'pedagoga', 'articuladora'].includes(String(filterKey || '').trim().toLowerCase())
                ? String(filterKey || 'all').trim().toLowerCase()
                : 'all';
            switchTab('teachers');
        }

        function setRankingClassFilter(className) {
            rankingClassFilter = className;
            switchTab('ranking');
        }

        function navigateFromSettings(target) {
            switch (target) {
                case 'students':
                    switchTab('students');
                    break;
                case 'teachers':
                    switchTab('teachers');
                    break;
                case 'banned':
                    openBannedStudentsModal();
                    break;
                case 'positive-balance':
                    openBalanceStudentsModal('positive-balance');
                    break;
                case 'negative-balance':
                    openBalanceStudentsModal('negative-balance');
                    break;
                case 'zero-balance':
                    openBalanceStudentsModal('zero-balance');
                    break;
            }
        }

        function openStudentActionMenu(id) {
            handleRankingClick(id);
        }

        let currentClassView = null;
        let currentTabView = 'transactions';
        let appScreenReady = false;
        let transactionClassFilter = 'Todos';
        let rankingClassFilter = 'Todos';
        const UI_STATE = {
            transactions: {
                search: '',
                reason: '',
                value: '',
                selectedStudentIds: []
            },
            store: {
                search: ''
            },
            students: {
                search: ''
            },
            teachers: {
                search: '',
                badge: 'all'
            },
            settings: {
                maxCredit: '',
                aeeBonus: '',
                feiraDate: '',
                globalSeasonalTheme: '',
                creditsFrozen: null,
                storeEnabledForUsers: null,
                storeEnabledForDev: null
            }
        };

        const TABS_CONFIG = [
            { id: 'transactions', icon: 'arrow-right-left', label: 'Transações', roles: ['teacher', 'admin', 'dev'] },
            { id: 'store', icon: 'store', label: 'Loja', roles: ['teacher', 'admin', 'dev'] },
            { id: 'ranking', icon: 'trophy', label: 'Ranking', roles: ['teacher', 'admin', 'dev', 'viewer'] },
            { id: 'history', icon: 'clock', label: 'Histórico', roles: ['teacher', 'admin', 'dev'] },
            { id: 'students', icon: 'users', label: 'Alunos', roles: ['teacher', 'admin', 'dev'] },
            { id: 'teachers', icon: 'shield-alert', label: 'Professores', roles: ['admin', 'dev'] },
            { id: 'notices', icon: 'bell-ring', label: 'Avisos', roles: ['teacher', 'admin', 'dev'] },
            { id: 'account', icon: 'user-cog', label: 'Minha Conta', roles: ['teacher', 'admin', 'dev'] },
            { id: 'settings', icon: 'settings', label: 'Configurações', roles: ['teacher', 'admin', 'dev', 'viewer'] }

        ];

        // --- RESET SEMANAL DE CRÉDITOS POR PROFESSOR ---
        function resetWeeklyCredits(force = false) {
            const now = new Date();
            const year = now.getFullYear();
            const jan1 = new Date(year, 0, 1);
            const days = Math.floor((now - jan1) / 86400000);
            const week = Math.ceil((days + jan1.getDay() + 1) / 7);
            const weekKey = `${year}-W${week}`;
            const lastReset = localStorage.getItem('marimbondos_last_weekly_reset');

            if (!force && lastReset === weekKey) {
                return;
            }

            MOCK_STUDENTS.forEach(student => {
                if (student.weekCredits && typeof student.weekCredits === 'object') {
                    Object.keys(student.weekCredits).forEach(prof => {
                        student.weekCredits[prof] = 0;
                    });
                }
            });

            localStorage.setItem('marimbondos_last_weekly_reset', weekKey);
            saveAllData();
            console.log('✓ Créditos semanais resetados para todos os alunos/professores.');
        }

        function getLocalDateKey(date = new Date()) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function parseLocalDate(dateString) {
            if (!dateString) return null;
            const [year, month, day] = dateString.split('-').map(Number);
            if (!year || !month || !day) return null;
            return new Date(year, month - 1, day, 12, 0, 0, 0);
        }

        function processFairDayTurnover(force = false, cycleDateOverride = '') {
            const feiraDate = cycleDateOverride || MOCK_SETTINGS.feiraDate;
            if (!feiraDate) return false;

            const feiraDateObject = parseLocalDate(feiraDate);
            if (!feiraDateObject) return false;

            const nextDay = new Date(feiraDateObject);
            nextDay.setDate(nextDay.getDate() + 1);

            const currentDayKey = getLocalDateKey(new Date());
            const turnoverDayKey = getLocalDateKey(nextDay);
            const processedCycle = localStorage.getItem('marimbondos_last_fair_turnover_cycle');
            const fairMetadata = { metadata: { fairCycle: feiraDate, source: force ? 'manual' : 'automatic' } };

            if (!force && currentDayKey < turnoverDayKey) return false;
            if (!force && processedCycle === feiraDate) return false;

            let unbannedCount = 0;
            let negativeResetCount = 0;

            MOCK_STUDENTS.forEach(student => {
                const studentFairReference = String(student.banRelatedToFairDate || '').trim();
                const shouldAutoUnban = student.banned && Number(student.banCount || 0) < 3 && (
                    !studentFairReference ||
                    studentFairReference <= feiraDate
                );

                if (shouldAutoUnban) {
                    student.banned = false;
                    student.balance = 0;
                    student.banRelatedToFairDate = '';
                    addHistory('Desbanimento Automático', `${student.name} foi desbanido automaticamente no dia seguinte à feira e teve o saldo redefinido para M$ 0.`, 'edit', student.id, 'student', fairMetadata);
                    unbannedCount++;
                    return;
                }

                if (student.balance < 0) {
                    student.balance = 0;
                    addHistory('Saldo Negativo Zerado', `${student.name} estava negativado e teve o saldo ajustado para M$ 0 no dia seguinte à feira.`, 'edit', student.id, 'student', fairMetadata);
                    negativeResetCount++;
                }
            });

            if (unbannedCount > 0) {
                addHistory('Virada da Feira', `${unbannedCount} aluno(s) foram desbanidos automaticamente e tiveram o saldo redefinido para M$ 0 após a feira.`, 'edit', null, 'student', fairMetadata);
            }

            if (negativeResetCount > 0) {
                addHistory('Zeragem Pós-Feira', `${negativeResetCount} aluno(s) negativados tiveram o saldo ajustado para M$ 0 no dia seguinte à feira.`, 'edit', null, 'student', fairMetadata);
            }

            if (unbannedCount > 0 || negativeResetCount > 0) {
                const summaryParts = [];
                if (unbannedCount > 0) summaryParts.push(`${unbannedCount} aluno(s) foram desbanidos automaticamente`);
                if (negativeResetCount > 0) summaryParts.push(`${negativeResetCount} aluno(s) negativados tiveram o saldo redefinido para M$ 0`);
                createSystemNotice('Comunicado Pós-Feira', `No dia seguinte à feira escolar, ${summaryParts.join(' e ')}. O sistema aplicou os ajustes previstos nas regras da feira.`, feiraDate);
            }

            if (unbannedCount > 0 || negativeResetCount > 0) {
                saveAllData();
                localStorage.setItem('marimbondos_last_fair_turnover_cycle', feiraDate);
            } else if (force) {
                localStorage.removeItem('marimbondos_last_fair_turnover_cycle');
            }

            return unbannedCount > 0 || negativeResetCount > 0;
        }

        function processAEEWeeklyCredits(force = false) {
            // Verifica se há alunos AEE e se aeeWeeklyBonus > 0
            const aeeBonus = parseFloat(MOCK_SETTINGS.aeeWeeklyBonus) || 0;
            if (aeeBonus <= 0 || !MOCK_STUDENTS.some(s => s.aee)) return false;

            // Obtém dia da semana configurável (0 = domingo, 1 = segunda-feira, etc.) - padrão é segunda (1)
            const aeeCreditDay = MOCK_SETTINGS.aeeCreditDay ?? 1;
            const today = new Date();
            const dayOfWeek = today.getDay(); 
            if (!force && dayOfWeek !== aeeCreditDay) return false;

            // Gera chave para rastrear última aplicação de crédito AEE semanal
            const year = today.getFullYear();
            const jan1 = new Date(year, 0, 1);
            const days = Math.floor((today - jan1) / 86400000);
            const week = Math.ceil((days + jan1.getDay() + 1) / 7);
            const weekKey = `aee-${year}-W${week}`;
            const lastAEEDistribution = localStorage.getItem('marimbondos_last_aee_weekly_distribution');

            // Se já foi distribuído esta semana, não faz novamente
            if (!force && lastAEEDistribution === weekKey) return false;

            let creditedCount = 0;
            const creditedStudentNames = [];

            // Distribui crédito para todos os alunos AEE
            MOCK_STUDENTS.forEach(student => {
                if (student.aee && !student.banned) {
                    student.balance += aeeBonus;
                    creditedCount++;
                    creditedStudentNames.push(student.name);
                    
                    // Registra no histórico com metadata especial para marcar como AEE automático
                    addHistory(
                        "Crédito Semanal AEE",
                        `${student.name} recebeu automaticamente M$ ${aeeBonus} pelo programa AEE.`,
                        'aee-auto-credit',
                        student.id,
                        'student',
                        { autoCredit: true, source: 'aeeWeekly', amount: aeeBonus }
                    );
                }
            });

            if (creditedCount > 0) {
                localStorage.setItem('marimbondos_last_aee_weekly_distribution', weekKey);
                saveAllData();
                
                // Cria notificação de sistema
                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                createSystemNotice(
                    "Créditos AEE Distribuídos",
                    `${creditedCount} aluno(s) com AEE recebu ${creditedCount > 1 ? 'eram' : 'eu'} M$ ${aeeBonus} de crédito semanal.`,
                    getLocalDateKey(today)
                );

                // Mostra toast quando screen está pronta
                if (appScreenReady && !document.getElementById('login-screen')?.classList.contains('hidden') === false) {
                    showToast(`Créditos AEE distribuídos para ${creditedCount} aluno(s)! 💳`, 'success');
                }

                console.log(`💳 CRÉDITOS AEE DISTRIBUÍDOS: ${creditedCount} aluno(s) receberam M$ ${aeeBonus} cada (${dayNames[aeeCreditDay]})`);
                return true;
            }

            return false;
        }

        // --- INICIALIZAÇÃO ---
        window.onload = async () => {
            try {
                console.log('🚀 [1/10] Início do window.onload');
                
                // Reset semanal automático ao carregar o sistema
                try {
                    resetWeeklyCredits();
                    console.log('✓ [1/10] Créditos semanais verificados');
                    updateSplashProgress(1, 'Verificando créditos semanais...');
                } catch (e) {
                    console.error('❌ [1/10] Erro ao resetar créditos semanais:', e);
                }

                if (IS_ANDROID_RUNTIME) {
                    document.documentElement.classList.add('android-runtime');
                }

                console.log('✓ [2/10] Classe android-runtime definida');
                updateSplashProgress(2, 'Detectando ambiente...');

                applyAdaptivePerformanceMode();
                console.log('✓ [2.1/10] Performance adaptativa aplicada');
                
                document.addEventListener('visibilitychange', () => {
                    applyAdaptivePerformanceMode();
                    if (!document.hidden) {
                        scheduleRealtimeUiRefresh();
                    }
                    if (appScreenReady) {
                        syncCurrentUserPresence(!document.hidden);
                    }
                });
                window.addEventListener('focus', () => {
                    if (appScreenReady) {
                        syncCurrentUserPresence(true);
                    }
                });
                window.addEventListener('blur', () => {
                    if (appScreenReady) {
                        syncCurrentUserPresence(false);
                    }
                });
                window.addEventListener('beforeunload', () => {
                    if (appScreenReady) {
                        updateTeacherPresence(MOCK_USER, false);
                        try {
                            persistence.save(buildAppStateSnapshot());
                        } catch (error) {
                            console.warn('Não foi possível persistir o status offline antes de sair:', error);
                        }
                    }
                });
                
                console.log('✓ [3/10] Event listeners registrados');
                updateSplashProgress(3, 'Registrando listeners...');

                // Verificar disponibilidade de storage
                const localStorageAvailable = checkStorageAvailability();
                const indexedDBAvailable = await checkIndexedDBAvailability();
                console.log('✓ [4/10] Disponibilidade de storage verificada:', { localStorageAvailable, indexedDBAvailable });
                updateSplashProgress(4, 'Verificando armazenamento...');
                
                if (!localStorageAvailable && !indexedDBAvailable) {
                    console.error('❌ Nenhum método de armazenamento disponível. O aplicativo pode não funcionar corretamente.');
                    showToast('Armazenamento bloqueado pelo navegador. Algumas funcionalidades podem não funcionar.', 'warning');
                } else if (!localStorageAvailable) {
                    console.warn('⚠️ localStorage bloqueado, usando apenas IndexedDB');
                } else if (!indexedDBAvailable) {
                    console.warn('⚠️ IndexedDB não disponível, usando apenas localStorage');
                }
                
                console.log('✓ [5/10] Storage verificado');

                initTheme();
                console.log('✓ [6/10] Tema inicializado');
                updateSplashProgress(6, 'Aplicando tema...');
                installKnownExternalNoiseFilters();
                console.log('✓ [6.1/10] Filtros de ruído externos instalados');

                // Inicializar Firebase com waitForFirebase para garantir SDK carregado
                console.log('✓ [7/10] Iniciando verificação Firebase...');
                await new Promise(resolve => {
                    waitForFirebase(async () => {
                        console.log('✓ [7.1/10] Firebase SDK verificado, inicializando...');
                        initFirebase();
                        console.log('✓ [7.2/10] Firebase inicializado');
                        // Agendar verificações/listeners não-críticos para momento ocioso
                        const scheduleNonCriticalFirebaseWork = () => {
                            const runWork = async () => {
                                try {
                                    await ensureBackupsHaveHistory();
                                    console.log('✓ Backups verificados e histórico notificado (deferred)');
                                } catch (e) {
                                    console.warn('Erro ao garantir histórico de backups (deferred):', e && e.message ? e.message : e);
                                }

                                try {
                                    watchBackupsRealtimeListeners();
                                    console.log('✓ Listener de backups anexado (deferred)');
                                } catch (e) {
                                    console.warn('Erro ao anexar listener de backups (deferred):', e && e.message ? e.message : e);
                                }
                            };

                            if (typeof window.requestIdleCallback === 'function') {
                                window.requestIdleCallback(() => runWork().catch(err => console.warn('Erro deferred backups:', err)), { timeout: 2000 });
                            } else {
                                setTimeout(() => runWork().catch(err => console.warn('Erro deferred backups:' , err)), 500);
                            }
                        };

                        scheduleNonCriticalFirebaseWork();
                        resolve();
                    }, 20);
                });
                console.log('✓ [7.3/10] Firebase verificado');
                updateSplashProgress(7, 'Conectando ao Firebase...');

                console.log('✓ [8/10] Iniciando loadAllData...');
                await loadAllData();
                console.log('✓ [8.1/10] Dados carregados com sucesso');
                updateSplashProgress(8, 'Carregando dados...');
                
                console.log('✓ [9/10] Aplicando processamentos pós-carga...');
                applyLoginHolidayTheme(getCurrentThemeMode());
                processFairDayTurnover();
                processAEEWeeklyCredits();
                console.log('✓ [9.1/10] Processamentos completados');
                updateSplashProgress(9, 'Aplicando processamentos...');
                
                console.log('✓ [10/10] Inicializando ícones e elementos finais...');
                initIcons();
                console.log('✓ [10.1/10] Ícones inicializados');
                updateSplashProgress(10, 'Finalizando inicialização...');
                applyAutofillGuards(document);
                console.log('✓ [10.2/10] Autofill guards aplicados');
                enhanceInteractiveElements();
                console.log('✓ [10.3/10] Elementos interativos aprimorados');
                setupLoginEnterKey();
                console.log('✓ [10.4/10] Listeners de login configurados');
                setupScrollNavigation();
                console.log('✓ [10.5/10] Scroll do nav configurado');
                console.log('✅ [SUCESSO] Todas as inicializações completadas com sucesso!');
            } finally {
                console.log('✓ [FINALLY] Removendo classe app-booting...');
                updateSplashProgress(10, 'Pronto — carregando interface');
                document.body.classList.remove('app-booting');
                // Garantir remoção visual da splash após transição
                try {
                    const splash = document.getElementById('splash-screen');
                    if (splash) {
                        // permitir animação de saída antes de remover do fluxo
                        setTimeout(() => {
                            splash.style.display = 'none';
                        }, 420);
                    }
                } catch (e) { /* noop */ }
                console.log('✓ [FINALLY] Classe app-booting removida. Login screen deve estar visível agora.');
            }
        };

        function initIcons() {
            if (typeof lucide === 'undefined' || typeof lucide.createIcons !== 'function') {
                console.warn('Lucide não está disponível para renderizar ícones agora.');
                return;
            }
            try {
                lucide.createIcons();
            } catch (error) {
                console.error('Falha ao renderizar ícones:', error);
            }
        }

        let knownExternalNoiseFilterInstalled = false;

        function isKnownExternalAsyncListenerNoise(value) {
            const message = String(value || '');
            return /A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received/i.test(message);
        }

        function installKnownExternalNoiseFilters() {
            if (knownExternalNoiseFilterInstalled) return;
            knownExternalNoiseFilterInstalled = true;

            window.addEventListener('unhandledrejection', event => {
                const reason = event?.reason;
                const message = String(reason?.message || reason?.stack || reason || '');

                if (isKnownExternalAsyncListenerNoise(message)) {
                    event.preventDefault();
                }
            }, true);

            window.addEventListener('error', event => {
                const message = String(event?.message || event?.error?.message || event?.error?.stack || '');
                if (isKnownExternalAsyncListenerNoise(message)) {
                    event.preventDefault();
                    return false;
                }
                return undefined;
            }, true);
        }

        function applyAutofillGuards(root = document) {
            if (!root || typeof root.querySelectorAll !== 'function') return;

            const guardedFields = root.querySelectorAll('input, textarea, select');
            guardedFields.forEach(field => {
                const fieldType = String(field.getAttribute('type') || '').toLowerCase();
                const fieldId = String(field.id || '').toLowerCase();
                const fieldName = String(field.getAttribute('name') || '').toLowerCase();
                const inputMode = String(field.getAttribute('inputmode') || '').toLowerCase();
                const isSensitiveField = fieldType === 'password'
                    || fieldType === 'email'
                    || inputMode === 'numeric'
                    || /pin|password|senha|email/.test(fieldId)
                    || /pin|password|senha|email/.test(fieldName);
                const isLoginAutofillField = fieldId === 'login-email' || fieldId === 'login-pin';

                if (!isSensitiveField) return;

                if (isLoginAutofillField) {
                    field.removeAttribute('data-lpignore');
                    field.removeAttribute('data-1p-ignore');
                    field.removeAttribute('data-bwignore');
                    field.removeAttribute('data-form-type');
                    field.setAttribute('autocapitalize', 'none');
                    field.setAttribute('autocorrect', 'off');
                    field.setAttribute('spellcheck', 'false');
                    field.setAttribute('autocomplete', fieldId === 'login-email' ? 'username' : 'current-password');
                    if (fieldId === 'login-email') {
                        field.setAttribute('name', 'username');
                    } else {
                        field.setAttribute('name', 'current-password');
                    }
                    return;
                }

                field.setAttribute('data-lpignore', 'true');
                field.setAttribute('data-1p-ignore', 'true');
                field.setAttribute('data-bwignore', 'true');
                field.setAttribute('data-form-type', 'other');
                field.setAttribute('autocapitalize', 'none');
                field.setAttribute('autocorrect', 'off');
                field.setAttribute('spellcheck', 'false');

                if (fieldType === 'password') {
                    field.setAttribute('autocomplete', 'new-password');
                } else if (!field.hasAttribute('autocomplete')) {
                    field.setAttribute('autocomplete', 'off');
                }
            });
        }

        function shouldUsePerformanceLiteMode() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            const lowConcurrency = Number(navigator.hardwareConcurrency || 0) > 0 && Number(navigator.hardwareConcurrency) <= 4;
            return IS_ANDROID_RUNTIME || Boolean(connection?.saveData) || lowConcurrency || reducedMotion;
        }

        function applyAdaptivePerformanceMode() {
            const root = document.documentElement;
            if (!root) return;
            root.classList.toggle('performance-lite', shouldUsePerformanceLiteMode());
            root.classList.toggle('app-paused-motion', Boolean(document.hidden));
        }

        function enhanceInteractiveElements(root = document) {
            if (!root || typeof root.querySelectorAll !== 'function') return;
            try {
                root.querySelectorAll('button, a, label[onclick], .ranking-card, .history-item, .transaction-student-card, .student-class-card, .student-class-trigger').forEach(el => {
                    el.classList.add('pressable');
                });

                root.querySelectorAll('h1, h2, h3, h4').forEach(el => {
                    el.classList.add('motion-heading');
                });

                root.querySelectorAll('span[class*="bg-"], .bg-amber-400, .bg-yellow-400').forEach(el => {
                    if (el.classList.contains('rounded-full') || el.classList.contains('rounded-3xl') || el.classList.contains('rounded-2xl') || el.classList.contains('inline-block')) {
                        el.classList.add('motion-badge');
                    }
                });

                root.querySelectorAll('.space-y-4, .space-y-3, .grid').forEach(group => {
                    if (group.children.length > 1) {
                        group.classList.add('tab-stagger');
                        Array.from(group.children).forEach((child, index) => {
                            child.classList.add('motion-item');
                            child.style.setProperty('--stagger', String(index));
                        });
                    }
                });

                root.querySelectorAll('#nav-container button').forEach((el, index) => {
                    el.style.setProperty('--nav-stagger', String(index));
                });
            } catch (error) {
                console.error('Falha ao aplicar interações refinadas:', error);
            }
        }

        function setupScrollNavigation() {
            const navContainer = document.getElementById('nav-container');
            const tabContent = document.getElementById('tab-content');
            const appContent = document.getElementById('app-content');
            const desktopMedia = window.matchMedia('(min-width: 1024px)');
            
            if (!navContainer || !tabContent) {
                console.warn('⚠️ Nav container ou tab content não encontrados');
                return;
            }

            let lastScrollTop = 0;
            let isNavHidden = false;
            let accumulatedDelta = 0;
            let isTicking = false;

            const setNavVisibility = (shouldHide) => {
                if (desktopMedia.matches) {
                    navContainer.classList.remove('hidden-nav');
                    appContent?.classList.remove('nav-collapsed');
                    isNavHidden = false;
                    return;
                }

                if (shouldHide === isNavHidden) {
                    return;
                }

                isNavHidden = shouldHide;
                navContainer.classList.toggle('hidden-nav', shouldHide);
                appContent?.classList.toggle('nav-collapsed', shouldHide);
            };

            const enforceCurrentLayout = () => {
                setNavVisibility(false);
                lastScrollTop = tabContent.scrollTop || 0;
                accumulatedDelta = 0;
            };

            const evaluateScrollDirection = () => {
                const currentScroll = tabContent.scrollTop || 0;
                const scrollDifference = currentScroll - lastScrollTop;
                lastScrollTop = currentScroll;

                if (desktopMedia.matches) {
                    setNavVisibility(false);
                    accumulatedDelta = 0;
                    return;
                }

                if (currentScroll <= 6) {
                    setNavVisibility(false);
                    accumulatedDelta = 0;
                    return;
                }

                accumulatedDelta += scrollDifference;

                if (accumulatedDelta > 18) {
                    setNavVisibility(true);
                    accumulatedDelta = 0;
                    return;
                }

                if (accumulatedDelta < -12) {
                    setNavVisibility(false);
                    accumulatedDelta = 0;
                }
            };

            const handleScroll = () => {
                if (isTicking) return;
                isTicking = true;
                requestAnimationFrame(() => {
                    evaluateScrollDirection();
                    isTicking = false;
                });
            };

            const handleMediaChange = () => {
                enforceCurrentLayout();
            };

            if (typeof desktopMedia.addEventListener === 'function') {
                desktopMedia.addEventListener('change', handleMediaChange);
            } else if (typeof desktopMedia.addListener === 'function') {
                desktopMedia.addListener(handleMediaChange);
            }

            tabContent.addEventListener('scroll', handleScroll, { passive: true });
            enforceCurrentLayout();
            
            console.log('✓ Scroll navigation ativado (mobile-first, suave e com navbar fixa no desktop)');
        }

        function setupLoginEnterKey() {
            console.log('🔧 Configurando listeners de login...');
            const pressEnter = (e) => { if(e.key === 'Enter') handleLogin(); };
            document.getElementById('login-email').addEventListener('keypress', pressEnter);
            document.getElementById('login-pin').addEventListener('keypress', pressEnter);
            // Event listener para o botão de login
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) {
                console.log('✓ Botão de login encontrado, adicionando click listener');
                loginBtn.addEventListener('click', handleLogin);
            } else {
                console.error('❌ Botão de login (#login-btn) NÃO encontrado!');
            }
        }

        function handleLogin() {
            console.log('🔵 handleLogin() foi chamado!');
            normalizeAllTeachers();
            const email = document.getElementById('login-email').value.trim();
            const pin = document.getElementById('login-pin').value.trim();
            
            console.log('📋 Tentativa de login:');
            console.log('  Email:', JSON.stringify(email), '| MOCK_USER.email:', JSON.stringify(MOCK_USER.email));
            console.log('  PIN:', JSON.stringify(pin), '| MOCK_USER.pin:', JSON.stringify(MOCK_USER.pin));
            console.log('  Email match:', email === MOCK_USER.email);
            console.log('  PIN match:', pin === MOCK_USER.pin);
            
            // Verificar se é o usuário DEV (desenvolvedor)
            if (email === MOCK_USER.email && pin === MOCK_USER.pin) {
                console.log('✓ Login DEV bem-sucedido');
                setCurrentUser(MOCK_USER, { trackLogin: true });
                showLoginSuccessScreen();
                return;
            }
            
            console.log('ℹ DEV login falhou, verificando professores...');
            console.log('  Total de professores:', MOCK_TEACHERS.length);
            console.log('  Professores:', MOCK_TEACHERS.map(t => ({ email: t.email, temSenha: !!t.password })));
            
            // Verificar se é um professor registrado
            const teacher = MOCK_TEACHERS.find(t => t.email === email);
            if (teacher) {
                console.log('  Professor encontrado:', teacher.email);
                if (teacher.password) {
                    console.log('  Comparando PIN:', JSON.stringify(pin), 'com senha:', JSON.stringify(teacher.password));
                    if (teacher.password === pin) {
                        const derivedRoleType = deriveRoleType(teacher.role);
                        console.log('✓ Login de professor bem-sucedido');
                        setCurrentUser({
                            email: teacher.email,
                            name: teacher.name,
                            pin: teacher.password,
                            role: teacher.role,
                            roleType: derivedRoleType
                        }, { trackLogin: true });
                        showLoginSuccessScreen();
                        return;
                    } else {
                        console.log('✗ Senha incorreta para professor');
                    }
                } else {
                    console.log('✗ Professor não tem senha configurada');
                }
            } else {
                console.log('  Professor com email', JSON.stringify(email), 'não encontrado');
            }
            
            console.log('❌ Login falhou');
            showToast("E-mail ou senha incorretos.", "error");
        }
        
        function setCurrentUser(user, options = {}) {
            const normalizedUser = user && typeof user === 'object'
                ? {
                    ...user,
                    roleType: user.roleType || deriveRoleType(user.role)
                }
                : user;

            MOCK_USER = normalizedUser;
            normalizeAllTeachers();
            appScreenReady = false;
            let rawUserKey = 'local';
            if (normalizedUser && typeof normalizedUser === 'object') {
                rawUserKey = normalizedUser.email || normalizedUser.uid || 'local';
            } else {
                rawUserKey = normalizedUser || 'local';
            }
            firebaseUser = normalizeFirebasePathSegment(rawUserKey);

            // Atualizar listeners e dados do Firebase: DEFERIDO até a UI estar visível
            // (evita bloquear a renderização da tela de login)
            THEME_SETTINGS.current = getUserThemePreference();
            applyTheme();

            if (options.trackLogin) {
                const loginIso = new Date().toISOString();
                updateTeacherPresence(normalizedUser, true, loginIso);
                recordLoginActivity(normalizedUser, loginIso);
                saveAllData();
            }
        }
        
        function showLoginSuccessScreen() {
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-content').classList.remove('hidden');
            document.getElementById('user-display-name').textContent = MOCK_USER.name;
            document.getElementById('user-display-role').textContent = MOCK_USER.role;
            buildNavigation();
            switchTab(getFallbackTabId());
            appScreenReady = true;
            syncCurrentUserPresence(true);
            setTimeout(showActiveNotices, 600);

            // Agendar sincronização do Firebase em idle para não bloquear a UI
            const scheduleFirebaseSync = () => {
                const runSync = () => {
                    try {
                        setupRealtimeSync();
                        loadFromFirebaseOnStartup().catch(err => console.warn('Falha ao recarregar Firebase após login (deferred):', err));
                    } catch (e) {
                        console.warn('Erro ao iniciar sync Firebase deferred:', e);
                    }
                };

                if (typeof window.requestIdleCallback === 'function') {
                    window.requestIdleCallback(runSync, { timeout: 1000 });
                } else {
                    setTimeout(runSync, 200);
                }
            };

            scheduleFirebaseSync();
        }

        function logout() {
            confirmAction("Sair do Sistema", "Deseja realmente fazer logout?", "executeLogout", null, false);
        }

        function executeLogout() {
            if (appScreenReady) {
                syncCurrentUserPresence(false);
            }
            window.location.reload();
        }

        function cloneHistoryData(data) {
            if (data === null || data === undefined) return null;
            return JSON.parse(JSON.stringify(data));
        }

        function escapeRegExp(value = '') {
            return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function resolveHistoryStudentName(studentIdOrData = null, deletionType = 'student') {
            if (studentIdOrData && typeof studentIdOrData === 'object') {
                const objectName = String(studentIdOrData.name || '').trim();
                if (objectName && deletionType === 'student') {
                    return objectName;
                }
            }

            const numericStudentId = Number(studentIdOrData);
            if (!numericStudentId) return '';

            const student = MOCK_STUDENTS.find(entry => Number(entry.id) === numericStudentId);
            return String(student?.name || '').trim();
        }

        function highlightHistoryStudentName(desc = '', studentName = '') {
            const normalizedStudentName = String(studentName || '').trim();
            if (!normalizedStudentName) {
                return desc;
            }

            const studentNamePattern = new RegExp(`(^|[^\\wÀ-ÿ])(${escapeRegExp(normalizedStudentName)})(?=$|[^\\wÀ-ÿ])`, 'g');
            return desc.replace(studentNamePattern, (match, prefix, fullName) => `${prefix}<strong class="history-student-chip">${fullName}</strong>`);
        }

        function addHistory(title, desc, type, studentIdOrData = null, deletionType = 'student', metadata = null) {
            const safeDesc = escapeHtml(desc);
            const historyStudentName = resolveHistoryStudentName(studentIdOrData, deletionType);
            let processedDesc = highlightHistoryStudentName(safeDesc, historyStudentName);
            
            // Destacar valores monetários na descrição
            const valueMatch = safeDesc.match(/M\$ \d+(\.\d+)?/g);
            if (valueMatch) {
                valueMatch.forEach(match => {
                    let colorClass = 'text-slate-800';
                    if (type === 'credit' || title.toLowerCase().includes('crédito')) colorClass = 'text-green-600';
                    if (type === 'debit' || title.toLowerCase().includes('débito')) colorClass = 'text-red-600';
                    
                    processedDesc = processedDesc.replace(match, `<b class="${colorClass} history-value-chip">${match}</b>`);
                });
            }

            const entry = {
                id: historyCounter++,
                date: new Date().toLocaleString('pt-BR'),
                createdAtIso: new Date().toISOString(),
                author: MOCK_USER.name,
                title: title,
                desc: processedDesc,
                type: type,// 'transaction', 'edit', 'deletion', 'creation', etc.
                deletionType: deletionType, // 'student' ou 'teacher' para diferenciar exclusões
                studentName: historyStudentName
            };

            if (metadata && typeof metadata === 'object') {
                Object.assign(entry, cloneHistoryData(metadata));
            }

            if (type === 'deletion') {
                entry.studentData = studentIdOrData;
                if (studentIdOrData?.id !== undefined && studentIdOrData?.id !== null) {
                    entry.studentId = studentIdOrData.id;
                }
            } else if (typeof studentIdOrData === 'number') {
                entry.studentId = studentIdOrData;
            } else if (studentIdOrData && studentIdOrData.id) {
                entry.studentId = studentIdOrData.id;
            }

            MOCK_HISTORY.unshift(entry);
            compactHistoryStorage();
            saveAllData();
        }

        function handleTransaction(type) {
            const valInput = document.getElementById('trans-value');
            const val = parseFloat(valInput.value);
            if (!val || val <= 0) { showToast("Insira um valor válido.", "error"); return; }

            const checkboxes = document.querySelectorAll('.trans-student-cb:checked:not([disabled])');
            if(checkboxes.length === 0) { showToast("Selecione ao menos um aluno elegível.", "error"); return; }

            const canBypassRestrictions = canBypassCreditRestrictions();
            const teacherKey = getTeacherCreditKey();
            const selectedStudents = Array.from(checkboxes)
                .map(cb => MOCK_STUDENTS.find(s => s.id === parseInt(cb.value)))
                .filter(Boolean);

            if (type === 'credit' && MOCK_SETTINGS.creditsFrozen && !canDistributeCreditsWhileFrozen()) {
                showToast("Com o congelamento ativo, apenas o DEV pode distribuir créditos.", "error");
                return;
            }

            if (type === 'credit' && !canBypassRestrictions) {
                const currentTeacherTotal = getTeacherWeeklyDistributedCredit(teacherKey);
                const projectedTeacherTotal = currentTeacherTotal + (selectedStudents.length * val);
                if (projectedTeacherTotal > MOCK_SETTINGS.maxWeeklyCreditPerTeacher) {
                    const remainingCredit = Math.max(0, MOCK_SETTINGS.maxWeeklyCreditPerTeacher - currentTeacherTotal);
                    showToast(`Limite semanal do professor excedido. Restante disponível: M$ ${remainingCredit}.`, "error");
                    return;
                }
            }

            // Motivos predefinidos
            const suggestedReasons = type === 'credit' ? [
                'Excelente comportamento',
                'Participação ativa na aula',
                'Ajudou um colega',
                'Presença e pontualidade',
                'Conclusão de atividades',
                'Respeito e educação'
            ] : [
                'Falta de engajamento',
                'Não realizou atividade',
                'Desrespeito ao professor',
                'Saída não autorizada',
                'Agressividade',
                'Perturbação do aprendizado'
            ];

            // Construir resumo dos alunos
            const studentsSummary = selectedStudents.map(s => `
                <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                        <p class="font-bold text-slate-800 text-sm">${s.name}</p>
                        <p class="text-[10px] text-slate-400 uppercase">${s.class}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] text-slate-400 mb-1">Novo Saldo</p>
                        <p class="font-black text-amber-600 text-sm">M$ ${type === 'credit' ? s.balance + val : s.balance - val}</p>
                    </div>
                </div>
            `).join('');

            const typeLabel = type === 'credit' ? 'Crédito' : 'Débito';
            const typeColor = type === 'credit' ? 'green' : 'red';
            const typeIcon = type === 'credit' ? 'plus' : 'minus';

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-4">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Confirmar ${typeLabel}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Revise os dados antes de confirmar</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                        <div class="flex items-center justify-between p-4 rounded-2xl" style="background: ${typeColor === 'green' ? '#dcfce7' : '#fee2e2'}; border: 1px solid ${typeColor === 'green' ? '#86efac' : '#fca5a5'};">
                            <div>
                                <p class="text-[10px] font-bold uppercase tracking-widest" style="color: ${typeColor === 'green' ? '#15803d' : '#991b1b'};">Tipo de Transação</p>
                                <p class="text-sm font-black mt-1" style="color: ${typeColor === 'green' ? '#166534' : '#7f1d1d'};">${typeLabel}</p>
                            </div>
                            <div style="color: ${typeColor === 'green' ? '#166534' : '#7f1d1d'};" class="text-4xl font-black">
                                <i data-lucide="${typeIcon}"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                            <p class="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-2">Valor por Aluno</p>
                            <p class="text-3xl font-black text-amber-600">M$ ${val}</p>
                        </div>

                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 tracking-wider">Motivo da Transação</label>
                            
                            <div class="flex gap-2 flex-wrap mb-3">
                                ${suggestedReasons.map((reason, idx) => `
                                    <button type="button" onclick="document.getElementById('confirm-trans-reason').value = '${reason.replace(/'/g, "\\'")}'; document.querySelectorAll('.reason-suggest-btn').forEach(b => b.classList.remove('bg-amber-500', 'text-white')); this.classList.add('bg-amber-500', 'text-white');" class="reason-suggest-btn text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:border-amber-300 transition btn-bounce">
                                        ${reason}
                                    </button>
                                `).join('')}
                            </div>

                            <div class="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3">
                                <input type="checkbox" id="enable-custom-reason" onchange="document.getElementById('confirm-trans-reason').disabled = !this.checked; if (this.checked) document.getElementById('confirm-trans-reason').focus();" class="w-4 h-4 accent-amber-500">
                                <label for="enable-custom-reason" class="text-[10px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer flex-1">Usar motivo personalizado</label>
                            </div>

                            <textarea id="confirm-trans-reason" placeholder="Ou selecione um motivo acima..." rows="3" disabled class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 resize-none disabled:opacity-50"></textarea>
                        </div>

                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 tracking-wider">Alunos Afetados (${selectedStudents.length})</p>
                            <div class="max-h-48 overflow-y-auto space-y-2">
                                ${studentsSummary}
                            </div>
                        </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="confirmTransactionOp('${type}')" class="flex-1 py-4 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl" style="background-color: ${typeColor === 'green' ? '#22c55e' : '#ef4444'};">Confirmar ${typeLabel}</button>
                    </div>
                </div>
            `);
        }

        function confirmTransactionOp(type) {
            const reason = document.getElementById('confirm-trans-reason').value.trim();
            if (!reason) { showToast("O motivo da transação é obrigatório.", "error"); return; }

            const valInput = document.getElementById('trans-value');
            const val = parseFloat(valInput.value);
            if (!val || val <= 0) { showToast("Insira um valor válido.", "error"); return; }
            
            const checkboxes = document.querySelectorAll('.trans-student-cb:checked:not([disabled])');
            if(checkboxes.length === 0) { showToast("Selecione ao menos um aluno elegível.", "error"); return; }

            const canBypassRestrictions = canBypassCreditRestrictions();
            const teacherKey = getTeacherCreditKey();
            const selectedStudents = Array.from(checkboxes)
                .map(cb => MOCK_STUDENTS.find(s => s.id === parseInt(cb.value)))
                .filter(Boolean);

            let successCount = 0;

            selectedStudents.forEach(student => {
                if (student.banned && type === 'credit') return;

                if (type === 'credit') {
                    const currentTeacherCredit = getStudentWeeklyCredit(student, teacherKey);
                    student.balance += val;
                    setStudentWeeklyCredit(student, currentTeacherCredit + val, teacherKey);
                    successCount++;
                    addHistory("Crédito", `${student.name} recebeu M$ ${val}. Motivo: ${reason}`, 'credit', student.id);
                    console.log(`✓ CRÉDITO: ${student.name} recebeu M$ ${val} (Motivo: ${reason})`);
                    return;
                }

                student.balance -= val;
                successCount++;
                addHistory("Débito", `${student.name} teve retirada de M$ ${val}. Motivo: ${reason}`, 'debit', student.id);
                console.log(`✓ DÉBITO: ${student.name} teve M$ ${val} retirados (Motivo: ${reason})`);
            });

            if (successCount > 0) {
                const historyMessage = `Sucesso! ${successCount} ${successCount === 1 ? 'aluno' : 'alunos'} ${type === 'credit' ? 'creditado(s)' : 'debitado(s)'}.`;
                showToast(historyMessage, "success");
                valInput.value = '';
                checkboxes.forEach(cb => cb.checked = false);
                saveAllData();
                closeModal();
                switchTab('transactions');
            }
        }

        function getStoreItemById(itemId) {
            return MOCK_STORE_ITEMS.find(item => item.id === Number(itemId));
        }

        function renderStoreItemImagePreview(imageData = '') {
            const preview = document.getElementById('store-item-image-preview');
            const emptyState = document.getElementById('store-item-image-empty');
            const hiddenInput = document.getElementById('store-item-image-data');
            const normalizedImageData = String(imageData || '').trim();

            if (hiddenInput) hiddenInput.value = normalizedImageData;
            if (!preview || !emptyState) return;

            if (!normalizedImageData) {
                preview.classList.add('hidden');
                preview.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            preview.classList.remove('hidden');
            emptyState.classList.add('hidden');
            preview.innerHTML = `<img src="${normalizedImageData}" alt="Prévia do item" class="w-full h-full object-cover rounded-2xl">`;
        }

        async function handleStoreItemImageUpload(event) {
            const file = event?.target?.files?.[0];
            if (!file) {
                renderStoreItemImagePreview('');
                return;
            }

            if (!file.type.startsWith('image/')) {
                event.target.value = '';
                renderStoreItemImagePreview('');
                showToast('Selecione um arquivo de imagem válido para o item.', 'error');
                return;
            }

            try {
                const optimizedImageData = await optimizeStoreItemImage(file);
                renderStoreItemImagePreview(optimizedImageData);
            } catch (error) {
                event.target.value = '';
                renderStoreItemImagePreview('');
                showToast('Não foi possível carregar a foto do item.', 'error');
            }
        }

        function openAddStoreItemModal() {
            if (!canManageStoreInventory()) {
                showToast('Apenas professores, administradores e DEV podem cadastrar itens na loja.', 'error');
                return;
            }

            openModal(`
                <div class="store-item-editor-modal">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Nova Mercadoria</p>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Cadastrar Item da Loja</h3>
                        </div>
                        <button onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal da loja">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="store-item-editor-body modal-scroll-region">
                        <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
                        <div class="store-photo-frame rounded-[1.5rem] p-3 flex flex-col gap-3">
                            <div id="store-item-image-empty" class="aspect-square rounded-2xl border-2 border-dashed border-amber-300/70 flex flex-col items-center justify-center text-center px-4 text-slate-500 bg-white/70">
                                <i data-lucide="image-plus" class="w-8 h-8 text-amber-500 mb-2"></i>
                                <p class="text-xs font-black uppercase tracking-widest">Foto obrigatória</p>
                                <p class="text-[10px] mt-1">Adicione uma imagem para o item aparecer na vitrine.</p>
                            </div>
                            <div id="store-item-image-preview" class="hidden aspect-square rounded-2xl overflow-hidden"></div>
                            <input type="hidden" id="store-item-image-data" value="">
                            <input type="file" id="store-item-image-file" accept="image/*" capture="environment" class="hidden" onchange="handleStoreItemImageUpload(event)">
                            <button type="button" onclick="document.getElementById('store-item-image-file').click()" class="py-3 px-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce flex items-center justify-center gap-2">
                                <i data-lucide="upload" class="w-4 h-4"></i> Escolher Foto
                            </button>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nome do Item</label>
                                <input type="text" id="store-item-name" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-bold text-slate-800" placeholder="Ex: Caderno personalizado">
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor (M$)</label>
                                    <input type="number" min="0.01" step="0.01" id="store-item-price" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-black text-amber-600" placeholder="0,00">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantidade</label>
                                    <input type="number" min="1" step="1" id="store-item-quantity" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-black text-slate-800" placeholder="1">
                                </div>
                            </div>
                            <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-[11px] text-amber-800 font-semibold leading-relaxed">
                                Quando a quantidade chegar a zero em uma venda, o item será removido automaticamente da loja junto com a foto e os demais dados.
                            </div>
                        </div>
                    </div>
                    </div>
                    <div class="modal-glass-actions store-item-editor-actions">
                        <button onclick="closeModal()" class="flex-1 py-3.5 bg-slate-100/80 text-slate-600 font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest">Cancelar</button>
                        <button onclick="createStoreItem()" class="flex-1 py-3.5 bg-slate-900 text-white font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                            <i data-lucide="package-plus" class="w-4 h-4"></i> Salvar Item
                        </button>
                    </div>
                </div>
            `);
            renderStoreItemImagePreview('');
        }

        function createStoreItem() {
            if (!canManageStoreInventory()) {
                showToast('Apenas administradores e DEV podem cadastrar itens na loja.', 'error');
                return;
            }

            const name = document.getElementById('store-item-name').value.trim();
            const price = parseFloat(document.getElementById('store-item-price').value);
            const quantity = parseInt(document.getElementById('store-item-quantity').value, 10);
            const imageData = document.getElementById('store-item-image-data').value.trim();

            if (!name) { showToast('Informe o nome do item.', 'error'); return; }
            if (!Number.isFinite(price) || price <= 0) { showToast('Informe um valor válido para o item.', 'error'); return; }
            if (!Number.isInteger(quantity) || quantity <= 0) { showToast('Informe uma quantidade válida para o item.', 'error'); return; }
            if (!imageData) { showToast('A foto do item é obrigatória.', 'error'); return; }

            const newItem = normalizeStoreItemRecord({
                id: storeItemCounter++,
                name,
                price,
                quantity,
                imageData,
                createdAt: new Date().toLocaleString('pt-BR'),
                updatedAt: new Date().toLocaleString('pt-BR')
            });

            if (!newItem) {
                showToast('Não foi possível criar o item da loja.', 'error');
                return;
            }

            MOCK_STORE_ITEMS.push(newItem);
            MOCK_STORE_ITEMS = normalizeAllStoreItems();
            addHistory('Item da Loja Criado', `${name} foi cadastrado na loja com estoque inicial de ${quantity} unidade(s) por M$ ${formatMarimbondosValue(price)}.`, 'creation');
            saveAllData({ immediateFirebaseSync: true });
            closeModal();
            showToast('Item cadastrado na loja com sucesso!', 'success');
            if (currentTabView === 'store') switchTab('store');
        }

        function openEditStoreItemModal(itemId) {
            if (!canManageStoreInventory()) {
                showToast('Apenas administradores e DEV podem editar itens da loja.', 'error');
                return;
            }

            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                return;
            }

            openModal(`
                <div class="store-item-editor-modal">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Estoque</p>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Editar Item da Loja</h3>
                        </div>
                        <button onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal da loja">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="store-item-editor-body modal-scroll-region">
                        <div class="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
                        <div class="store-photo-frame rounded-[1.5rem] p-3 flex flex-col gap-3">
                            <div id="store-item-image-empty" class="hidden aspect-square rounded-2xl border-2 border-dashed border-amber-300/70 flex flex-col items-center justify-center text-center px-4 text-slate-500 bg-white/70">
                                <i data-lucide="image-plus" class="w-8 h-8 text-amber-500 mb-2"></i>
                                <p class="text-xs font-black uppercase tracking-widest">Foto obrigatória</p>
                            </div>
                            <div id="store-item-image-preview" class="aspect-square rounded-2xl overflow-hidden"></div>
                            <input type="hidden" id="store-item-image-data" value="${escapeHtml(item.imageData)}">
                            <input type="file" id="store-item-image-file" accept="image/*" capture="environment" class="hidden" onchange="handleStoreItemImageUpload(event)">
                            <button type="button" onclick="document.getElementById('store-item-image-file').click()" class="py-3 px-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce flex items-center justify-center gap-2">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i> Trocar Foto
                            </button>
                        </div>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nome do Item</label>
                                <input type="text" id="store-item-name" value="${escapeHtml(item.name)}" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-bold text-slate-800">
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Valor (M$)</label>
                                    <input type="number" min="0.01" step="0.01" id="store-item-price" value="${item.price}" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-black text-amber-600">
                                </div>
                                <div>
                                    <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantidade</label>
                                    <input type="number" min="1" step="1" id="store-item-quantity" value="${item.quantity}" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-black text-slate-800">
                                </div>
                            </div>
                            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-semibold leading-relaxed">
                                Última atualização em ${item.updatedAt}. Se o estoque zerar durante uma venda, o item será excluído automaticamente.
                            </div>
                        </div>
                    </div>
                    </div>
                    <div class="modal-glass-actions store-item-editor-actions">
                        <button onclick="closeModal()" class="flex-1 py-3.5 bg-slate-100/80 text-slate-600 font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest">Cancelar</button>
                        <button onclick="updateStoreItem(${item.id})" class="flex-1 py-3.5 bg-slate-900 text-white font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                            <i data-lucide="save" class="w-4 h-4"></i> Salvar Alterações
                        </button>
                    </div>
                </div>
            `);
            renderStoreItemImagePreview(item.imageData);
        }

        function updateStoreItem(itemId) {
            if (!canManageStoreInventory()) {
                showToast('Apenas administradores e DEV podem editar itens da loja.', 'error');
                return;
            }

            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                return;
            }

            const name = document.getElementById('store-item-name').value.trim();
            const price = parseFloat(document.getElementById('store-item-price').value);
            const quantity = parseInt(document.getElementById('store-item-quantity').value, 10);
            const imageData = document.getElementById('store-item-image-data').value.trim();

            if (!name) { showToast('Informe o nome do item.', 'error'); return; }
            if (!Number.isFinite(price) || price <= 0) { showToast('Informe um valor válido para o item.', 'error'); return; }
            if (!Number.isInteger(quantity) || quantity <= 0) { showToast('Informe uma quantidade válida para o item.', 'error'); return; }
            if (!imageData) { showToast('A foto do item é obrigatória.', 'error'); return; }

            item.name = name;
            item.price = price;
            item.quantity = quantity;
            item.imageData = imageData;
            item.updatedAt = new Date().toLocaleString('pt-BR');
            MOCK_STORE_ITEMS = normalizeAllStoreItems();
            addHistory('Item da Loja Editado', `${name} teve seus dados de loja atualizados por ${MOCK_USER.name}.`, 'edit');
            saveAllData({ immediateFirebaseSync: true });
            closeModal();
            showToast('Item da loja atualizado com sucesso!', 'success');
            if (currentTabView === 'store') switchTab('store');
        }

        function handleDeleteStoreItem(itemId) {
            if (!canManageStoreInventory()) {
                showToast('Apenas administradores e DEV podem excluir itens da loja.', 'error');
                return;
            }

            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                return;
            }

            openModal(`
                <div class="space-y-5">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="trash-2" class="w-7 h-7"></i>
                        </div>
                        <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Excluir Item da Loja</h3>
                        <p class="text-sm text-slate-600 mt-2">Deseja remover <strong>${escapeHtml(item.name)}</strong> do estoque? A foto e todos os dados do item serão apagados.</p>
                    </div>
                    <div class="modal-glass-actions">
                        <button onclick="closeModal()" class="flex-1 py-3.5 bg-slate-100/80 text-slate-600 font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest">Cancelar</button>
                        <button onclick="confirmDeleteStoreItem(${item.id})" class="flex-1 py-3.5 bg-red-600 text-white font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest shadow-xl">Excluir Agora</button>
                    </div>
                </div>
            `);
        }

        function confirmDeleteStoreItem(itemId) {
            if (!canManageStoreInventory()) {
                showToast('Apenas administradores e DEV podem excluir itens da loja.', 'error');
                return;
            }

            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                closeModal();
                return;
            }

            MOCK_STORE_ITEMS = MOCK_STORE_ITEMS.filter(currentItem => currentItem.id !== itemId);
            addHistory('Item da Loja Excluído', `${item.name} foi removido manualmente do estoque da loja.`, 'deletion');
            saveAllData({ immediateFirebaseSync: true });
            closeModal();
            showToast('Item removido da loja com sucesso.', 'success');
            if (currentTabView === 'store') switchTab('store');
        }

        function openStoreInsufficientBalanceModal(student, item, quantity, totalCost) {
            openModal(`
                <div class="space-y-5">
                    <div class="text-center">
                        <div class="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="wallet-cards" class="w-7 h-7"></i>
                        </div>
                        <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Saldo Insuficiente</h3>
                        <p class="text-sm text-slate-600 mt-2">${escapeHtml(student.name)} não possui saldo suficiente para comprar ${quantity} unidade(s) de ${escapeHtml(item.name)}.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo Atual</p>
                            <p class="text-xl font-black text-slate-800 mt-1">M$ ${formatMarimbondosValue(student.balance)}</p>
                        </div>
                        <div class="p-4 rounded-2xl bg-red-50 border border-red-100 text-center">
                            <p class="text-[10px] font-bold uppercase tracking-widest text-red-400">Valor da Venda</p>
                            <p class="text-xl font-black text-red-600 mt-1">M$ ${formatMarimbondosValue(totalCost)}</p>
                        </div>
                    </div>
                    <div class="modal-glass-actions">
                        <button onclick="closeModal()" class="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest">Entendi</button>
                    </div>
                </div>
            `);
        }

        function getStoreCartEntries() {
            STORE_CART.items = (STORE_CART.items || [])
                .map(entry => ({
                    itemId: Number(entry.itemId) || 0,
                    quantity: Math.max(0, parseInt(entry.quantity, 10) || 0)
                }))
                .filter(entry => entry.itemId > 0 && entry.quantity > 0);

            return STORE_CART.items
                .map(entry => {
                    const item = getStoreItemById(entry.itemId);
                    if (!item) return null;
                    return {
                        ...entry,
                        item,
                        subtotal: item.price * entry.quantity,
                        stockExceeded: entry.quantity > item.quantity
                    };
                })
                .filter(Boolean);
        }

        function getStoreCartCount() {
            return getStoreCartEntries().reduce((total, entry) => total + entry.quantity, 0);
        }

        function getStoreCartTotal() {
            return getStoreCartEntries().reduce((total, entry) => total + entry.subtotal, 0);
        }

        function resetStoreCart(preserveQuery = false) {
            STORE_CART.items = [];
            STORE_CART.studentId = null;
            STORE_CART.studentQuery = preserveQuery ? STORE_CART.studentQuery : '';
        }

        function addStoreItemToCart(itemId, quantity = 1) {
            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                return;
            }

            const normalizedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
            const existingEntry = STORE_CART.items.find(entry => entry.itemId === item.id);
            const currentQuantity = existingEntry ? existingEntry.quantity : 0;
            const nextQuantity = currentQuantity + normalizedQuantity;

            if (nextQuantity > item.quantity) {
                showToast(`O carrinho não pode ultrapassar o estoque de ${item.name}.`, 'error');
                return;
            }

            if (existingEntry) {
                existingEntry.quantity = nextQuantity;
            } else {
                STORE_CART.items.push({ itemId: item.id, quantity: normalizedQuantity });
            }

            showToast(`${item.name} adicionado ao carrinho.`, 'success');
            if (currentTabView === 'store') {
                switchTab('store');
            }
        }

        function updateStoreCartItemQuantity(itemId, quantity) {
            const item = getStoreItemById(itemId);
            const existingEntry = STORE_CART.items.find(entry => entry.itemId === Number(itemId));
            if (!item || !existingEntry) return;

            const normalizedQuantity = Math.max(0, parseInt(quantity, 10) || 0);
            if (normalizedQuantity === 0) {
                removeStoreCartItem(itemId, false);
                return;
            }

            existingEntry.quantity = Math.min(item.quantity, normalizedQuantity);
            renderStoreCartModal();
        }

        function removeStoreCartItem(itemId, rerender = true) {
            STORE_CART.items = STORE_CART.items.filter(entry => entry.itemId !== Number(itemId));
            if (rerender) {
                renderStoreCartModal();
            }
            if (currentTabView === 'store') {
                switchTab('store');
            }
        }

        function openAddStoreItemToCartModal(itemId) {
            const item = getStoreItemById(itemId);
            if (!item) {
                showToast('Esse item da loja não foi encontrado.', 'error');
                return;
            }

            openModal(`
                <div class="space-y-5">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Carrinho</p>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Adicionar ${escapeHtml(item.name)}</h3>
                        </div>
                        <button onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal do carrinho">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)] gap-4 items-start">
                        <div class="store-photo-frame rounded-[1.5rem] p-3">
                            <div class="aspect-square rounded-2xl overflow-hidden">
                                <img src="${item.imageData}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover">
                            </div>
                        </div>
                        <div class="space-y-4">
                            <div class="grid grid-cols-2 gap-3">
                                <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Valor Unitário</p>
                                    <p class="text-xl font-black text-amber-700 mt-1">M$ ${formatMarimbondosValue(item.price)}</p>
                                </div>
                                <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Estoque</p>
                                    <p class="text-xl font-black text-slate-800 mt-1">${item.quantity}</p>
                                </div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Quantidade</label>
                                <input type="number" id="store-cart-quantity" min="1" max="${item.quantity}" step="1" value="1" oninput="refreshStoreCartItemPreview(${item.id})" class="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-black text-slate-800">
                            </div>
                            <div id="store-cart-item-summary" class="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800">
                                <p class="store-cart-summary-kicker text-[10px] font-bold uppercase tracking-widest text-slate-300">Subtotal</p>
                                <p class="text-2xl font-black mt-1">M$ ${formatMarimbondosValue(item.price)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-glass-actions">
                        <button onclick="closeModal()" class="flex-1 py-3.5 bg-slate-100/80 text-slate-600 font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest">Cancelar</button>
                        <button onclick="confirmAddStoreItemToCart(${item.id})" class="flex-1 py-3.5 bg-slate-900 text-white font-black rounded-2xl btn-bounce uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-2">
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Adicionar ao Carrinho
                        </button>
                    </div>
                </div>
            `);

            refreshStoreCartItemPreview(item.id);
        }

        function refreshStoreCartItemPreview(itemId) {
            const item = getStoreItemById(itemId);
            const summary = document.getElementById('store-cart-item-summary');
            const quantityInput = document.getElementById('store-cart-quantity');
            if (!item || !summary || !quantityInput) return;

            const quantity = Math.max(1, Math.min(item.quantity, parseInt(quantityInput.value, 10) || 1));
            quantityInput.value = quantity;
            summary.innerHTML = `
                <p class="store-cart-summary-kicker text-[10px] font-bold uppercase tracking-widest text-slate-300">Subtotal</p>
                <p class="text-2xl font-black mt-1">M$ ${formatMarimbondosValue(item.price * quantity)}</p>
                <p class="store-cart-summary-meta text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">${quantity} unidade(s) reservadas no carrinho</p>
            `;
        }

        function confirmAddStoreItemToCart(itemId) {
            const quantity = parseInt(document.getElementById('store-cart-quantity')?.value || '1', 10);
            addStoreItemToCart(itemId, quantity);
            closeModal();
        }

        function filterStoreCartStudents(term = STORE_CART.studentQuery || '') {
            STORE_CART.studentQuery = term;
            const resultsContainer = document.getElementById('store-cart-student-results');
            const selectedLabel = document.getElementById('store-cart-selected-student');
            const counterLabel = document.getElementById('store-cart-student-counter');
            if (!resultsContainer || !selectedLabel || !counterLabel) return;

            const normalizedTerm = normalizeSearchText(term);
            const searchTokens = normalizedTerm.split(/\s+/).filter(Boolean);
            const filteredStudents = [...MOCK_STUDENTS]
                .map(student => {
                    const normalizedName = normalizeSearchText(student.name);
                    const normalizedClass = normalizeSearchText(student.class);
                    const searchable = `${normalizedName} ${normalizedClass} ${student.id} ${normalizeSearchText(formatMarimbondosValue(student.balance))}`;
                    const matches = searchTokens.every(token => searchable.includes(token));
                    let score = 0;

                    if (!searchTokens.length) {
                        score = 0;
                    } else if (matches) {
                        score += searchTokens.reduce((total, token) => {
                            if (normalizedName.startsWith(token)) return total + 12;
                            if (normalizedName.includes(token)) return total + 8;
                            if (normalizedClass.startsWith(token)) return total + 5;
                            if (normalizedClass.includes(token)) return total + 3;
                            return total + 1;
                        }, 0);
                    }

                    return { student, matches: !searchTokens.length || matches, score, normalizedName };
                })
                .filter(entry => entry.matches)
                .sort((a, b) => b.score - a.score || a.normalizedName.localeCompare(b.normalizedName, 'pt-BR'))
                .map(entry => entry.student);

            counterLabel.textContent = filteredStudents.length
                ? `${filteredStudents.length} aluno(s) encontrados`
                : (normalizedTerm ? 'Nenhum aluno encontrado' : `${MOCK_STUDENTS.length} aluno(s) disponíveis`);

            resultsContainer.innerHTML = filteredStudents.length
                ? filteredStudents.map(student => {
                    const isSelected = Number(STORE_CART.studentId) === Number(student.id);
                    return `
                        <button type="button" onclick="selectStoreCartStudent(${student.id})" class="w-full text-left p-4 rounded-2xl border transition ${isSelected ? 'bg-amber-50 border-amber-300 shadow-md' : 'bg-white border-slate-200 hover:border-amber-200'}">
                            <div class="flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="font-black text-sm text-slate-800 uppercase tracking-tight truncate">${escapeHtml(student.name)}</p>
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">${escapeHtml(student.class)} • Matrícula ${student.id}</p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-[10px] font-bold uppercase tracking-widest ${student.balance >= getStoreCartTotal() ? 'text-emerald-500' : 'text-red-500'}">Saldo</p>
                                    <p class="text-sm font-black ${student.balance >= getStoreCartTotal() ? 'text-emerald-600' : 'text-red-600'}">M$ ${formatMarimbondosValue(student.balance)}</p>
                                </div>
                            </div>
                        </button>
                    `;
                }).join('')
                : '<div class="p-4 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500 font-semibold">Nenhum aluno corresponde à pesquisa atual.</div>';

            const selectedStudent = MOCK_STUDENTS.find(student => student.id === Number(STORE_CART.studentId));
            selectedLabel.textContent = selectedStudent
                ? `${selectedStudent.name} • ${selectedStudent.class} • Saldo M$ ${formatMarimbondosValue(selectedStudent.balance)}`
                : 'Nenhum aluno selecionado';

            refreshStoreCartCheckoutSummary();
        }

        function selectStoreCartStudent(studentId) {
            STORE_CART.studentId = Number(studentId) || null;
            filterStoreCartStudents(STORE_CART.studentQuery || '');
        }

        function refreshStoreCartCheckoutSummary() {
            const summary = document.getElementById('store-cart-checkout-summary');
            if (!summary) return;

            const entries = getStoreCartEntries();
            const selectedStudent = MOCK_STUDENTS.find(student => student.id === Number(STORE_CART.studentId));
            const total = getStoreCartTotal();
            const totalItems = getStoreCartCount();
            const stockIssue = entries.some(entry => entry.stockExceeded);
            const enoughBalance = selectedStudent ? selectedStudent.balance >= total : false;

            summary.innerHTML = `
                <p class="store-cart-summary-kicker text-[10px] font-bold uppercase tracking-widest text-slate-300">Resumo da Compra</p>
                <p class="text-2xl font-black mt-1">M$ ${formatMarimbondosValue(total)}</p>
                <p class="store-cart-summary-meta text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">${totalItems} item(ns) no carrinho</p>
                <p class="text-[10px] font-bold uppercase tracking-widest mt-2 ${selectedStudent ? (enoughBalance ? 'store-cart-summary-balance-ok' : 'store-cart-summary-balance-warning') : 'store-cart-summary-meta'}">${selectedStudent ? `Saldo após compra: M$ ${formatMarimbondosValue(selectedStudent.balance - total)}` : 'Escolha um aluno para finalizar a compra.'}</p>
                ${stockIssue ? '<p class="store-cart-summary-stock-warning text-[10px] font-bold uppercase tracking-widest mt-2">Há item(ns) acima do estoque disponível.</p>' : ''}
            `;
        }

        function getStoreCartModalContent() {
            const entries = getStoreCartEntries();
            const cartRows = entries.length
                ? entries.map(entry => `
                    <div class="p-4 bg-white border ${entry.stockExceeded ? 'border-red-200 bg-red-50/40' : 'border-slate-200'} rounded-2xl space-y-3">
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="font-black text-slate-800 uppercase tracking-tight break-words">${escapeHtml(entry.item.name)}</p>
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">M$ ${formatMarimbondosValue(entry.item.price)} por unidade • Estoque ${entry.item.quantity}</p>
                            </div>
                            <button type="button" onclick="removeStoreCartItem(${entry.item.id})" class="px-3 py-2 rounded-xl bg-red-500 text-white border border-red-300 font-black uppercase text-[10px] tracking-widest btn-bounce">Remover</button>
                        </div>
                        <div class="grid grid-cols-[110px_minmax(0,1fr)] gap-3 items-center">
                            <input type="number" min="1" max="${entry.item.quantity}" value="${entry.quantity}" oninput="updateStoreCartItemQuantity(${entry.item.id}, this.value)" class="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-black text-slate-800 text-center">
                            <div class="p-3 rounded-xl bg-slate-900 text-white">
                                <p class="text-[10px] font-bold uppercase tracking-widest text-slate-300">Subtotal</p>
                                <p class="text-lg font-black mt-1">M$ ${formatMarimbondosValue(entry.subtotal)}</p>
                            </div>
                        </div>
                        ${entry.stockExceeded ? '<p class="text-[10px] font-bold uppercase tracking-widest text-red-500">Ajuste a quantidade para caber no estoque atual.</p>' : ''}
                    </div>
                `).join('')
                : '<div class="p-6 rounded-2xl border border-dashed border-slate-200 text-center text-sm text-slate-500 font-semibold">Seu carrinho está vazio. Adicione itens da vitrine para continuar.</div>';

            return `
                <div class="store-cart-modal">
                    <div class="flex items-start justify-between gap-4">
                        <div>
                            <p class="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Loja Escolar</p>
                            <h3 class="text-lg font-black text-slate-800 uppercase tracking-tight">Carrinho de Compras</h3>
                        </div>
                        <button onclick="closeModal()" class="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar carrinho">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>
                    <div class="store-cart-modal-body grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-4">
                        <div class="store-cart-modal-column space-y-4">
                            <div class="store-cart-modal-items modal-scroll-region">${cartRows}</div>
                        </div>
                        <div class="store-cart-modal-column space-y-4">
                            <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Aluno da Compra</p>
                                <p id="store-cart-selected-student" class="text-sm font-black text-slate-800 mt-2">Nenhum aluno selecionado</p>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Buscar aluno</label>
                                <div class="relative mb-2">
                                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                    <input type="text" id="store-cart-student-search" value="${escapeHtml(STORE_CART.studentQuery || '')}" oninput="filterStoreCartStudents(this.value)" placeholder="Digite nome, turma, saldo ou matrícula..." class="w-full p-4 pl-10 bg-white border border-slate-200 rounded-2xl outline-none focus:border-amber-400 font-semibold text-slate-800">
                                </div>
                                <p id="store-cart-student-counter" class="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">${MOCK_STUDENTS.length} aluno(s) disponíveis</p>
                                <div id="store-cart-student-results" class="modal-scroll-region space-y-2 max-h-[290px] pr-1"></div>
                            </div>
                            <div id="store-cart-checkout-summary" class="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800"></div>
                        </div>
                    </div>
                    <div class="store-cart-modal-actions">
                        <button onclick="resetStoreCart(); closeModal(); if (currentTabView === 'store') switchTab('store');" class="flex-1 py-3 bg-slate-100/80 text-slate-600 font-black rounded-2xl btn-bounce uppercase text-[10px] tracking-widest">Esvaziar Carrinho</button>
                        <button onclick="finalizeStoreCartCheckout()" class="flex-1 py-3 bg-green-600 text-white font-black rounded-2xl btn-bounce uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-2 ${entries.length ? '' : 'opacity-50 pointer-events-none'}">
                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Finalizar Compra
                        </button>
                    </div>
                </div>
            `;
        }

        function renderStoreCartModal() {
            const modal = document.getElementById('global-modal');
            if (modal && !modal.classList.contains('hidden')) {
                setModalContent(getStoreCartModalContent(), true);
            } else {
                openModal(getStoreCartModalContent());
            }

            filterStoreCartStudents(STORE_CART.studentQuery || '');
            refreshStoreCartCheckoutSummary();
        }

        function openStoreCartModal() {
            renderStoreCartModal();
        }

        function finalizeStoreCartCheckout() {
            const entries = getStoreCartEntries();
            if (!entries.length) {
                showToast('Adicione itens ao carrinho antes de finalizar.', 'error');
                return;
            }

            const student = MOCK_STUDENTS.find(currentStudent => currentStudent.id === Number(STORE_CART.studentId));
            if (!student) {
                showToast('Escolha o aluno comprador para finalizar a compra.', 'error');
                return;
            }

            if (entries.some(entry => entry.stockExceeded)) {
                showToast('Existe item no carrinho acima do estoque disponível.', 'error');
                return;
            }

            const totalCost = entries.reduce((total, entry) => total + entry.subtotal, 0);
            if (student.balance < totalCost) {
                openStoreInsufficientBalanceModal(student, { name: 'o carrinho' }, getStoreCartCount(), totalCost);
                return;
            }

            student.balance -= totalCost;
            const purchaseSummary = [];
            entries.forEach(entry => {
                entry.item.quantity -= entry.quantity;
                entry.item.updatedAt = new Date().toLocaleString('pt-BR');
                purchaseSummary.push(`${entry.quantity}x ${entry.item.name}`);
                if (entry.item.quantity <= 0) {
                    MOCK_STORE_ITEMS = MOCK_STORE_ITEMS.filter(currentItem => currentItem.id !== entry.item.id);
                    addHistory('Item Esgotado', `${entry.item.name} esgotou e foi removido automaticamente da loja.`, 'deletion');
                }
            });

            MOCK_STORE_ITEMS = normalizeAllStoreItems();
            addHistory('Compra na Loja', `${student.name} comprou ${purchaseSummary.join(', ')} por M$ ${formatMarimbondosValue(totalCost)}.`, 'debit', student.id);
            resetStoreCart();
            saveAllData({ immediateFirebaseSync: true });
            closeModal();
            showToast('Compra finalizada com sucesso!', 'success');
            if (currentTabView === 'store') switchTab('store');
        }

        function openSellStoreItemModal(itemId) {
            openAddStoreItemToCartModal(itemId);
        }

        function filterStoreItems(term = '') {
            UI_STATE.store.search = term;
            const normalizedTerm = String(term || '').trim().toLowerCase();
            const cards = document.querySelectorAll('.store-item-card[data-search]');
            const emptyState = document.getElementById('store-empty-state');
            const emptyTitle = document.getElementById('store-empty-title');
            const emptyDescription = document.getElementById('store-empty-description');
            const clearSearchButton = document.getElementById('store-clear-search-btn');
            const resultsCount = document.getElementById('store-results-count');
            let visibleCards = 0;
            const totalCards = cards.length;

            cards.forEach(card => {
                const searchContent = card.getAttribute('data-search') || '';
                const matches = !normalizedTerm || searchContent.includes(normalizedTerm);
                card.style.display = matches ? '' : 'none';
                if (matches) visibleCards++;
            });

            if (resultsCount) {
                resultsCount.textContent = `${visibleCards} de ${totalCards} ${totalCards === 1 ? 'item visível' : 'itens visíveis'}`;
            }

            if (emptyState) {
                emptyState.classList.toggle('hidden', visibleCards > 0);
            }

            if (clearSearchButton) {
                clearSearchButton.classList.toggle('hidden', !(normalizedTerm && totalCards > 0));
            }

            if (normalizedTerm && totalCards > 0) {
                if (emptyTitle) emptyTitle.textContent = 'Nenhum item encontrado';
                if (emptyDescription) emptyDescription.textContent = 'Ajuste o termo de busca ou limpe o filtro para voltar a ver todos os produtos.';
            } else {
                if (emptyTitle) emptyTitle.textContent = 'Nenhum item disponível';
                if (emptyDescription) {
                    emptyDescription.textContent = canManageStoreInventory()
                        ? 'Cadastre produtos com foto, valor e quantidade para começar a vender.'
                        : 'Ainda não há produtos cadastrados na loja.';
                }
            }
        }

        function filterTransactionStudents(term) {
            term = term.toLowerCase();
            const labels = document.querySelectorAll('.trans-student-label');
            labels.forEach(label => {
                const name = label.getAttribute('data-name').toLowerCase();
                const studentClass = label.getAttribute('data-class');
                const matchesTerm = name.includes(term);
                const matchesClass = transactionClassFilter === 'Todos' || studentClass === transactionClassFilter;
                label.style.display = (matchesTerm && matchesClass) ? 'block' : 'none';
            });
        }

        function setTransactionClassFilter(className) {
            transactionClassFilter = className;
            document.querySelectorAll('.filter-chip').forEach(btn => {
                btn.classList.remove('bg-amber-500', 'text-slate-900', 'border-amber-500');
                btn.classList.add('transaction-chip');
            });
            if (event?.currentTarget) {
                event.currentTarget.classList.remove('transaction-chip');
                event.currentTarget.classList.add('bg-amber-500', 'text-slate-900', 'border-amber-500');
            }
            filterTransactionStudents(document.getElementById('trans-search')?.value || '');
        }

        // --- GESTÃO DE ALUNOS (CRUD) ---
        
        function openClassDetails(className) {
            currentClassView = className;
            const studentsInClass = MOCK_STUDENTS.filter(s => s.class === className).sort((a,b) => a.name.localeCompare(b.name));
            const showDeleteButton = canDeleteStudents();
            
            let studentsListHtml = studentsInClass.length > 0 ? studentsInClass.map(s => {
                const showBanButton = !s.banned || canManuallyUnbanStudents();
                const banButtonTitle = s.banned ? 'Desbanir' : 'Banir';
                const banButtonIcon = s.banned ? 'unlock' : 'ban';
                const banButtonClass = s.banned ? 'directory-action-btn-unban' : 'directory-action-btn-ban';
                return `
                <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2 hover:bg-white transition-colors">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                             <p class="text-sm font-bold text-slate-800 ${s.banned ? 'line-through text-slate-400' : ''}">${s.name}</p>
                             ${s.aee ? '<span class="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">AEE</span>' : ''}
                                ${(s.banCount || 0) > 0 ? `<span class="text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">${s.banCount}x ban</span>` : ''}
                        </div>
                        <p class="text-[10px] font-bold text-amber-600 uppercase">Saldo: M$ ${s.balance}</p>
                    </div>
                    <div class="directory-action-row directory-action-row-compact">
                        <button onclick="openStudentHistory(${s.id})" class="directory-action-btn directory-action-btn-history directory-action-btn-compact btn-bounce" title="Histórico do Aluno">
                            <i data-lucide="history"></i> Histórico
                        </button>
                        <button onclick="openEditStudentModal(${s.id})" class="directory-action-btn directory-action-btn-edit directory-action-btn-compact btn-bounce" title="Editar">
                            <i data-lucide="pencil"></i> Editar
                        </button>
                        ${showBanButton ? `<button onclick="toggleBanStudent(${s.id})" class="directory-action-btn ${banButtonClass} directory-action-btn-compact btn-bounce" title="${banButtonTitle}">
                            <i data-lucide="${banButtonIcon}"></i> ${s.banned ? 'Desbanir' : 'Banir'}
                        </button>` : ''}
                        ${showDeleteButton ? `<button onclick="handleDeleteStudent(${s.id})" class="directory-action-btn directory-action-btn-delete directory-action-btn-compact btn-bounce" title="Excluir">
                            <i data-lucide="trash-2"></i> Excluir
                        </button>` : ''}
                    </div>
                </div>
            `;}).join('') : '<div class="text-center py-10"><p class="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum aluno nesta turma</p></div>';

            openModal(`
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">${className}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lista de Alunos</p>
                    </div>
                    <button onclick="closeModal()" class="modal-close-btn transition" aria-label="Fechar modal"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="max-h-[50vh] overflow-y-auto no-scrollbar pr-1 mb-6">
                    ${studentsListHtml}
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="closeModal()" class="py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest btn-bounce">Voltar</button>
                    <button onclick="openAddStudentModal('${className}')" class="py-3 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest btn-bounce flex items-center justify-center gap-2">
                        <i data-lucide="user-plus" class="w-4 h-4"></i> Adicionar
                    </button>
                </div>
            `);
        }

        // --- HISTÓRICO INDIVIDUAL DO ALUNO ---
        function openStudentHistory(id) {
            const student = MOCK_STUDENTS.find(s => s.id === id);
            if (!student) return;

            const studentHistory = getStudentHistoryEntries(id);
            const banReasons = getStudentBanReasons(id);

            let histHtml = studentHistory.length > 0 ? studentHistory.map(h => {
                const visuals = getHistoryVisuals(h);
                return `
                <div class="p-3 ${visuals.cardClass} border-l-4 ${visuals.borderClass} rounded-r-xl mb-3 shadow-sm">
                    <div class="flex justify-between items-start mb-1 gap-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase">${h.date}</span>
                        <span class="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.16em] ${visuals.badgeClass}">${visuals.badgeLabel}</span>
                    </div>
                    <p class="text-xs font-bold text-slate-800">${visuals.title}</p>
                    <p class="text-[11px] text-slate-600 leading-tight">${h.desc}</p>
                    <p class="text-[9px] text-slate-400 mt-2 flex items-center gap-1 font-bold italic">
                        <i data-lucide="user" class="w-2.5 h-2.5"></i> Por: ${h.author}
                    </p>
                </div>
            `;
            }).join('') : '<div class="text-center py-10 opacity-50"><i data-lucide="clock" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i><p class="text-[10px] font-bold uppercase">Sem registros para este aluno</p></div>';

            openModal(`
                <div class="mb-6 flex items-center justify-between">
                    <div>
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Histórico: ${student.name}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${student.class}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo Atual</p>
                        <p class="text-xl font-black text-amber-500">M$ ${student.balance}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banimentos</p>
                        <p class="text-lg font-black text-red-500">${student.banCount || 0}</p>
                    </div>
                    <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                        <p class="text-lg font-black ${student.banned ? 'text-red-500' : 'text-emerald-600'}">${student.banned ? 'Banido' : 'Ativo'}</p>
                    </div>
                </div>
                <div class="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="flex items-center justify-between gap-3 mb-3">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Motivos de Banimento</p>
                        <span class="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">${banReasons.length} registro(s)</span>
                    </div>
                    <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
                        ${banReasons.length ? banReasons.map(reason => `
                            <div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
                                <p class="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">${escapeHtml(reason.date)}</p>
                                <p class="text-xs text-slate-700 leading-relaxed font-medium">${escapeHtml(reason.reason)}</p>
                            </div>
                        `).join('') : '<div class="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 text-xs text-slate-500 font-medium">Nenhum motivo de banimento registrado para este aluno.</div>'}
                    </div>
                </div>
                <div class="max-h-[50vh] overflow-y-auto no-scrollbar pr-1 mb-6">
                    ${histHtml}
                </div>
                <button onclick="openClassDetails('${student.class}')" class="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">
                    Voltar para Turma
                </button>
            `);
        }

        function openEditStudentModal(id) {
            const student = MOCK_STUDENTS.find(s => s.id === id);
            if (!student) return;

            // Controle de permissão para saldo
            const canEditBalance = MOCK_USER.roleType === 'dev' || MOCK_USER.roleType === 'admin';
            const canEditBanCount = MOCK_USER.roleType === 'dev';

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Editar Aluno</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alterar Informações</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Nome Completo</label>
                            <input type="text" id="edit-std-name" value="${student.name}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Turma</label>
                            <select id="edit-std-class" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                                ${FIXED_CLASSES.map(c => `<option value="${c}" ${c === student.class ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        ${canEditBalance ? `
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Saldo (M$)</label>
                            <input type="number" id="edit-std-balance" value="${student.balance}" class="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl outline-none focus:border-amber-500 transition font-bold text-amber-700">
                        </div>
                        ` : ''}
                        ${canEditBanCount ? `
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Contagem de Banimentos</label>
                            <input type="number" id="edit-std-ban-count" value="${Number(student.banCount) || 0}" min="0" class="w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl outline-none focus:border-amber-500 transition font-bold text-amber-700">
                            <p class="text-[10px] text-slate-500 mt-1">Ajuste manual da contagem de banimentos. Visível apenas para DEV.</p>
                        </div>
                        ` : ''}
                        <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atendimento Especial (AEE)</span>
                            <input type="checkbox" id="edit-std-aee" ${student.aee ? 'checked' : ''} class="w-5 h-5 accent-amber-500">
                        </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="openClassDetails('${student.class}')" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveStudentEdit(${id})" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Salvar</button>
                    </div>
                </div>
            `);
        }

        function saveStudentEdit(id) {
            const student = MOCK_STUDENTS.find(s => s.id === id);
            const newName = document.getElementById('edit-std-name').value.trim();
            const newClass = document.getElementById('edit-std-class').value;
            const newAee = document.getElementById('edit-std-aee').checked;
            const balanceInput = document.getElementById('edit-std-balance');
            const banCountInput = document.getElementById('edit-std-ban-count');

            if (!newName) { showToast("O nome não pode estar vazio.", "error"); return; }

            const oldName = student.name;
            const oldClass = student.class;
            const oldBalance = student.balance;

            student.name = newName;
            student.class = newClass;
            student.aee = newAee;
            
            if(balanceInput) {
                student.balance = parseFloat(balanceInput.value) || 0;
            }

            if (banCountInput) {
                const newBanCount = parseInt(banCountInput.value) || 0;
                if (newBanCount !== student.banCount) {
                    const oldBanCount = Number(student.banCount) || 0;
                    student.banCount = newBanCount;
                    addHistory('Contagem de banimentos ajustada', `Contagem de banimentos alterada de ${oldBanCount} para ${newBanCount} por ${MOCK_USER.name}`, 'edit', student.id);
                }
            }

            addHistory("Aluno Editado", `${oldName} (${oldClass}) atualizado.`, 'edit', student.id);
            if (oldBalance !== student.balance) {
                addHistory("Saldo Ajustado", `Saldo alterado de M$ ${oldBalance} para M$ ${student.balance} manualmente.`, 'edit', student.id);
            }

            console.log(`✓ EDIÇÃO ALUNO: ${oldName} → ${newName} (ID: ${id}, Turma: ${oldClass} → ${newClass}, AEE: ${newAee}, Saldo: ${oldBalance} → ${student.balance})`);
            showToast("Dados salvos com sucesso!");
            saveAllData();
            openClassDetails(newClass);
            if (currentTabView === 'students') switchTab('students');
        }

        function handleDeleteStudent(id) {
            if (!canDeleteStudents()) {
                showToast("Apenas admins e DEV podem excluir alunos.", "error");
                return;
            }

            const student = MOCK_STUDENTS.find(s => s.id === id);
            if (!student) return;

            openModal(`
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                    </div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Excluir Aluno?</h3>
                    <p class="text-xs text-slate-500 px-4">Tem certeza que deseja remover <b>${student.name}</b>? Esta ação pode ser revertida por um desenvolvedor no histórico.</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="openClassDetails('${student.class}')" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Manter</button>
                    <button onclick="confirmDeleteStudent(${id})" class="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-lg shadow-red-200">Excluir</button>
                </div>
            `);
        }

        function confirmDeleteStudent(id) {
            if (!canDeleteStudents()) {
                showToast("Apenas admins e DEV podem excluir alunos.", "error");
                return;
            }

            const index = MOCK_STUDENTS.findIndex(s => s.id === id);
            const student = {...MOCK_STUDENTS[index]};
            const className = student.class;

            MOCK_STUDENTS.splice(index, 1);
            
            console.log(`🗑️ ALUNO DELETADO: ${student.name} (ID: ${id}, Turma: ${className}) removido do sistema`);
            addHistory("Aluno Excluído", `${student.name} removido do ${className}.`, 'deletion', student, 'student');
            showToast("Aluno removido.", "error");
            saveAllData();
            closeModal();
            switchTab('students');
        }

        function toggleBanStudent(id) {
            const student = MOCK_STUDENTS.find(s => s.id === id);
            if(!student) return;

            if (student.banned && !canManuallyUnbanStudents()) {
                showToast('Apenas o DEV pode desbanir alunos manualmente.', 'error');
                return;
            }

            window.pendingBanStudentId = id;

            if (student.banned) {
                confirmAction(
                    "Desbanir Aluno", 
                    `Deseja realmente desbanir o(a) aluno(a) ${student.name}?`, 
                    "executeBanStudent", 
                    null, 
                    false
                );
                return;
            }

            openModal(`
                <div class="mb-6">
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Banir Aluno</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Motivo obrigatório</p>
                </div>
                <div class="space-y-4 mb-8">
                    <div class="p-4 bg-red-50 border border-red-100 rounded-2xl">
                        <p class="text-sm font-bold text-slate-800">${student.name}</p>
                        <p class="text-xs text-slate-500 mt-1">Informe o motivo do banimento para registrar no histórico.</p>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Motivo do Banimento</label>
                        <textarea id="ban-student-reason" placeholder="Ex: agressão, fraude, reincidência disciplinar..." rows="4" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-red-400 transition font-medium text-slate-700 resize-none"></textarea>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="cancelBanStudent()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                    <button onclick="executeBanStudent()" class="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-lg shadow-red-200">Banir</button>
                </div>
            `);
        }

        function cancelBanStudent() {
            window.pendingBanStudentId = null;
            closeModal();
        }

        function executeBanStudent() {
            const id = window.pendingBanStudentId;
            const student = MOCK_STUDENTS.find(s => s.id === id);
            if (!student) return;

            const willBan = !student.banned;

            if (!willBan && !canManuallyUnbanStudents()) {
                showToast('Apenas o DEV pode desbanir alunos manualmente.', 'error');
                return;
            }

            let reason = '';

            if (willBan) {
                const reasonInput = document.getElementById('ban-student-reason');
                reason = reasonInput ? reasonInput.value.trim() : '';
                if (!reason) {
                    showToast("O motivo do banimento é obrigatório.", "error");
                    return;
                }
            }

            if (willBan) {
                student.banCount = (Number(student.banCount) || 0) + 1;
            }
            student.banned = !student.banned;
            const autoUnbanEligible = Number(student.banCount) < 3;
            student.banRelatedToFairDate = student.banned && autoUnbanEligible ? (MOCK_SETTINGS.feiraDate || getLocalDateKey(new Date())) : '';
            const status = student.banned ? "Banido" : "Desbanido";
            showToast(`Aluno ${status.toLowerCase()}!`, student.banned ? "error" : "success");
            const description = student.banned
                ? `${student.name} foi banido pela ${student.banCount}ª vez. Motivo: ${reason}${student.banRelatedToFairDate ? `. Liberação automática prevista para o dia seguinte à feira (${student.banRelatedToFairDate}).` : (Number(student.banCount) >= 3 ? '. A partir do 3º banimento, a liberação automática após a feira é desativada.' : '')}`
                : `${student.name} foi desbanido.`;
            addHistory(student.banned ? 'Banimento de Aluno' : 'Desbanimento de Aluno', description, 'edit', student.id);
            console.log(`${student.banned ? '🚫 BANIMENTO' : '✅ DESBANIMENTO'}: ${student.name} (ID: ${id}, Contagem: ${student.banCount}, Motivo: ${reason || 'Desbane manual'})`);
            saveAllData();
            window.pendingBanStudentId = null;

            const modal = document.getElementById('global-modal');
            if (modal && !modal.classList.contains('hidden') && !modal.classList.contains('modal-closing')) {
                closeModal();
            }

            if (currentTabView) {
                switchTab(currentTabView);
            }
        }

        // --- GESTÃO DE PROFESSORES (CRUD) ---
        function openEditTeacherModal(email) {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem editar professores.", "error");
                return;
            }

            const teacher = MOCK_TEACHERS.find(t => t.email === email);
            if (!teacher) return;
            if (!canEditTeacherRecord(teacher)) {
                showToast("Uma conta DEV só pode ser editada por outro DEV.", "error");
                return;
            }

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Editar Professor</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Alterar Informações</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Nome Completo</label>
                        <input type="text" id="edit-teacher-name" value="${teacher.name}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">E-mail</label>
                        <input type="email" id="edit-teacher-email" value="${teacher.email}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Senha (4 dígitos)</label>
                        <div class="flex items-center gap-2">
                            <input type="password" id="edit-teacher-password" maxlength="4" inputmode="numeric" value="${teacher.password || ''}" placeholder="Deixe em branco para manter" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 text-center tracking-[0.2em]">
                            <button type="button" onclick="togglePasswordVisibility('edit-teacher-password', this)" class="shrink-0 px-4 py-4 rounded-2xl bg-slate-100 text-slate-600 border border-slate-200 btn-bounce flex items-center gap-2" aria-label="Mostrar senha">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Cargo / Função</label>
                        <select id="edit-teacher-role" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                            <option value="Professor" ${teacher.role === 'Professor' ? 'selected' : ''}>Professor</option>
                            <option value="Admin" ${teacher.role === 'Admin' ? 'selected' : ''}>Administrador</option>
                            <option value="Viewer" ${teacher.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
                            ${MOCK_USER.roleType === 'dev' ? `<option value="Desenvolvedor" ${teacher.role === 'Desenvolvedor' ? 'selected' : ''}>Desenvolvedor</option>` : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 tracking-wider">Badges para Filtro</label>
                        ${buildTeacherBadgeSelector(teacher.badges, 'edit-teacher')}
                    </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveTeacherEdit('${email}')" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Salvar</button>
                    </div>
                </div>
            `);
        }

        function togglePasswordVisibility(inputId, triggerButton) {
            const input = document.getElementById(inputId);
            if (!input) return;

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            if (triggerButton) {
                triggerButton.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-4 h-4"></i>`;
                triggerButton.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
                lucide.createIcons();
            }
        }

        function saveTeacherEdit(oldEmail) {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem editar professores.", "error");
                return;
            }

            const teacher = MOCK_TEACHERS.find(t => t.email === oldEmail);
            if (!teacher) return;
            if (!canEditTeacherRecord(teacher)) {
                showToast("Uma conta DEV só pode ser editada por outro DEV.", "error");
                return;
            }

            const newName = document.getElementById('edit-teacher-name').value.trim();
            const newEmail = document.getElementById('edit-teacher-email').value.trim();
            const newPassword = document.getElementById('edit-teacher-password').value.trim();
            const newRole = document.getElementById('edit-teacher-role').value;
            const newBadges = getSelectedTeacherBadges('edit-teacher');

            if (!newName) { showToast("O nome não pode estar vazio.", "error"); return; }
            if (!newEmail) { showToast("O e-mail não pode estar vazio.", "error"); return; }
            if (!newEmail.includes('@')) { showToast("E-mail inválido.", "error"); return; }
            
            // Validar senha se fornecida
            if (newPassword && (newPassword.length !== 4 || isNaN(newPassword))) { 
                showToast("Senha deve conter exatamente 4 dígitos.", "error"); 
                return; 
            }

            // Verifica se o novo e-mail já existe (e é diferente do atual)
            if (newEmail !== oldEmail && MOCK_TEACHERS.find(t => t.email === newEmail)) {
                showToast("Este e-mail já está cadastrado.", "error");
                return;
            }

            if (!canAssignDeveloperRole(newRole)) {
                showToast("Apenas um DEV pode promover uma conta para DEV.", "error");
                return;
            }

            const oldName = teacher.name;
            const oldRole = teacher.role;

            teacher.name = newName;
            teacher.email = newEmail;
            teacher.role = newRole;
            teacher.badges = normalizeTeacherBadges(newBadges, newRole);
            
            // Atualizar senha apenas se uma nova foi fornecida
            if (newPassword) {
                teacher.password = newPassword;
            }

            if (normalizeEmailAddress(oldEmail) === normalizeEmailAddress(MOCK_USER.email)) {
                MOCK_USER.name = newName;
                MOCK_USER.email = newEmail;
                MOCK_USER.role = newRole;
                MOCK_USER.roleType = deriveRoleType(newRole);
                if (newPassword) {
                    MOCK_USER.pin = newPassword;
                }
                const userDisplayName = document.getElementById('user-display-name');
                if (userDisplayName) userDisplayName.textContent = newName;
            }

            console.log(`✏️ EDIÇÃO PROFESSOR: ${oldName} (${oldEmail}) → ${newName} (${newEmail}, Cargo: ${oldRole} → ${newRole})`);
            addHistory("Professor Editado", `${oldName} foi atualizado para ${newName} (${newRole}).`, 'edit');
            showToast("Dados do professor salvos com sucesso!");
            saveAllData();
            closeModal();
            switchTab('teachers');
        }

        function handleDeleteTeacher(email) {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem excluir professores.", "error");
                return;
            }

            const teacher = MOCK_TEACHERS.find(t => t.email === email);
            if (!teacher) return;
            if (!canModifyTeacherRecord(teacher)) {
                showToast("Uma conta DEV só pode ser excluída por outro DEV.", "error");
                return;
            }

            openModal(`
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                    </div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Excluir Professor?</h3>
                    <p class="text-xs text-slate-500 px-4">Tem certeza que deseja remover <b>${teacher.name}</b> do sistema? Esta ação será registada no histórico.</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Manter</button>
                    <button onclick="confirmDeleteTeacher('${email}')" class="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-lg shadow-red-200">Excluir</button>
                </div>
            `);
        }

        function confirmDeleteTeacher(email) {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem excluir professores.", "error");
                return;
            }

            const index = MOCK_TEACHERS.findIndex(t => t.email === email);
            const teacher = MOCK_TEACHERS[index];
            if (!teacher) return;
            if (!canModifyTeacherRecord(teacher)) {
                showToast("Uma conta DEV só pode ser excluída por outro DEV.", "error");
                closeModal();
                return;
            }

            // Proteção: Não permite deletar o único dev ou o usuário atual
            if (isDeveloperTeacherRecord(teacher) && MOCK_TEACHERS.filter(t => isDeveloperTeacherRecord(t)).length === 1) {
                showToast("Não é permitido excluir o único Desenvolvedor do sistema.", "error");
                closeModal();
                return;
            }

            if (teacher.email === MOCK_USER.email) {
                showToast("Não é permitido excluir sua própria conta.", "error");
                closeModal();
                return;
            }

            MOCK_TEACHERS.splice(index, 1);
            
            addHistory("Professor Excluído", `${teacher.name} (${teacher.email}) foi removido do sistema.`, 'deletion', teacher, 'teacher');
            showToast("Professor removido com sucesso.", "error");
            saveAllData();
            closeModal();
            switchTab('teachers');
        }

        // --- GESTÃO DE AVISOS (NOTICES) ---
        function openCreateNoticeModal() {
            if (!canAdministerNotices()) {
                showToast("Apenas admins e DEV podem criar avisos.", "error");
                return;
            }

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Novo Aviso</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Criar Notificação</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Título</label>
                        <input type="text" id="create-notice-title" placeholder="Ex: Aviso Importante" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Mensagem</label>
                        <textarea id="create-notice-message" placeholder="Digite sua mensagem..." rows="4" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 resize-none"></textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Data de Expiração (Opcional)</label>
                        <input type="date" id="create-notice-expiry" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                        <p class="text-[9px] text-slate-400 mt-1">O aviso será automaticamente desativado após essa data</p>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ativar Aviso</span>
                        <input type="checkbox" id="create-notice-active" checked class="w-5 h-5 accent-amber-500">
                    </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveNewNotice()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Criar</button>
                    </div>
                </div>
            `);
        }

        function saveNewNotice() {
            if (!canAdministerNotices()) {
                showToast("Apenas admins e DEV podem criar avisos.", "error");
                return;
            }

            const title = document.getElementById('create-notice-title').value.trim();
            const message = document.getElementById('create-notice-message').value.trim();
            const active = document.getElementById('create-notice-active').checked;
            const expireDate = document.getElementById('create-notice-expiry').value;

            if (!title) { showToast("O título não pode estar vazio.", "error"); return; }
            if (!message) { showToast("A mensagem não pode estar vazia.", "error"); return; }

            const newNotice = {
                id: noticesCounter++,
                author: MOCK_USER.email,
                authorName: MOCK_USER.name,
                title: title,
                message: message,
                active: active,
                createdAt: new Date().toLocaleString('pt-BR'),
                expiryDate: expireDate || null
            };

            MOCK_NOTICES.unshift(newNotice);
            addHistory("Novo Aviso", `Aviso "${title}" foi criado.`, 'creation', newNotice.id, 'notice', {
                noticeAction: 'creation',
                noticeData: cloneHistoryData(newNotice)
            });
            console.log(`📢 NOVO AVISO: "${title}" (ID: ${newNotice.id}, Ativo: ${active}, Expira em: ${expireDate || 'Nunca'})`);
            showToast("Aviso criado com sucesso!");
            saveAllData();
            closeModal();
            switchTab('notices');
        }

        function openEditNoticeModal(id) {
            const notice = MOCK_NOTICES.find(n => n.id === id);
            if (!notice) return;

            // Verifica permissão
            const canEdit = canManageNotice(notice);
            if (!canEdit) {
                showToast("Você não tem permissão para editar este aviso.", "error");
                return;
            }

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Editar Aviso</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atualizar Notificação</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Título</label>
                        <input type="text" id="edit-notice-title" value="${notice.title}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Mensagem</label>
                        <textarea id="edit-notice-message" rows="4" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 resize-none">${notice.message}</textarea>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Data de Expiração (Opcional)</label>
                        <input type="date" id="edit-notice-expiry" value="${notice.expiryDate || ''}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                        <p class="text-[9px] text-slate-400 mt-1">O aviso será automaticamente desativado após essa data</p>
                    </div>
                    <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aviso Ativo</span>
                        <input type="checkbox" id="edit-notice-active" ${notice.active ? 'checked' : ''} class="w-5 h-5 accent-amber-500">
                    </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveEditNotice(${id})" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Salvar</button>
                    </div>
                </div>
            `);
        }

        function saveEditNotice(id) {
            const notice = MOCK_NOTICES.find(n => n.id === id);
            if (!notice) return;

            if (!canAdministerNotices()) {
                showToast("Você não tem permissão para editar este aviso.", "error");
                return;
            }

            const previousNoticeData = cloneHistoryData(notice);

            const title = document.getElementById('edit-notice-title').value.trim();
            const message = document.getElementById('edit-notice-message').value.trim();
            const active = document.getElementById('edit-notice-active').checked;
            const expireDate = document.getElementById('edit-notice-expiry').value;

            if (!title) { showToast("O título não pode estar vazio.", "error"); return; }
            if (!message) { showToast("A mensagem não pode estar vazia.", "error"); return; }

            notice.title = title;
            notice.message = message;
            notice.active = active;
            notice.expiryDate = expireDate || null;

            addHistory("Aviso Editado", `Aviso "${title}" foi atualizado.`, 'edit', notice.id, 'notice', {
                noticeAction: 'edit',
                noticeData: cloneHistoryData(notice),
                previousNoticeData
            });
            console.log(`✏️ EDIÇÃO AVISO: "${title}" (ID: ${id}, Ativo: ${active}, Expira em: ${expireDate || 'Nunca'})`);
            showToast("Aviso atualizado com sucesso!");
            saveAllData();
            closeModal();
            switchTab('notices');
        }

        function handleDeleteNotice(id) {
            const notice = MOCK_NOTICES.find(n => n.id === id);
            if (!notice) return;

            // Verifica permissão
            const canDelete = canManageNotice(notice);
            if (!canDelete) {
                showToast("Você não tem permissão para deletar este aviso.", "error");
                return;
            }

            openModal(`
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8"></i>
                    </div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Excluir Aviso?</h3>
                    <p class="text-xs text-slate-500 px-4">Tem certeza que deseja remover este aviso?</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Manter</button>
                    <button onclick="confirmDeleteNotice(${id})" class="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-lg shadow-red-200">Excluir</button>
                </div>
            `);
        }

        function confirmDeleteNotice(id) {
            const notice = MOCK_NOTICES.find(n => n.id === id);
            if (!notice) return;

            if (!canAdministerNotices()) {
                showToast("Você não tem permissão para deletar este aviso.", "error");
                return;
            }

            const index = MOCK_NOTICES.findIndex(n => n.id === id);
            if (index > -1) {
                const removedNotice = cloneHistoryData(MOCK_NOTICES[index]);
                MOCK_NOTICES.splice(index, 1);
                addHistory("Aviso Excluído", `Aviso "${removedNotice.title}" foi removido do sistema.`, 'deletion', null, 'notice', {
                    noticeAction: 'deletion',
                    noticeData: removedNotice
                });
                showToast("Aviso removido com sucesso.", "error");
                saveAllData();
                closeModal();
                switchTab('notices');
            }
        }

        function toggleNoticeActive(id) {
            const notice = MOCK_NOTICES.find(n => n.id === id);
            if (!notice) return;

            // Verifica permissão
            const canToggle = canAdministerNotices();
            if (!canToggle) {
                showToast("Você não tem permissão para alterar este aviso.", "error");
                return;
            }

            const previousNoticeData = cloneHistoryData(notice);
            notice.active = !notice.active;
            addHistory(notice.active ? "Aviso Ativado" : "Aviso Desativado", `Aviso "${notice.title}" foi ${notice.active ? 'ativado' : 'desativado'}.`, 'edit', notice.id, 'notice', {
                noticeAction: 'toggle',
                noticeData: cloneHistoryData(notice),
                previousNoticeData
            });
            saveAllData();
            switchTab('notices');
        }

        // --- ADICIONAR PROFESSOR ---
        function openAddTeacherModal() {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem cadastrar professores.", "error");
                return;
            }

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Novo Professor</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastrar no Sistema</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Nome Completo</label>
                        <input type="text" id="new-teacher-name" placeholder="Ex: Prof. João Silva" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">E-mail</label>
                        <input type="email" id="new-teacher-email" placeholder="Ex: professor@escola.com" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Senha (4 dígitos)</label>
                        <input type="password" id="new-teacher-password" maxlength="4" inputmode="numeric" placeholder="Ex: 1234" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 text-center tracking-[0.2em]">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Cargo / Função</label>
                        <select id="new-teacher-role" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                            <option value="Professor">Professor</option>
                            <option value="Admin">Administrador</option>
                            <option value="Viewer">Viewer</option>
                            ${MOCK_USER.roleType === 'dev' ? '<option value="Desenvolvedor">Desenvolvedor</option>' : ''}
                        </select>
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 tracking-wider">Badges para Filtro</label>
                        ${buildTeacherBadgeSelector([], 'new-teacher')}
                    </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveNewTeacher()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Cadastrar</button>
                    </div>
                </div>
            `);
        }

        function saveNewTeacher() {
            if (!canManageTeachers()) {
                showToast("Apenas admins e DEV podem cadastrar professores.", "error");
                return;
            }

            const name = document.getElementById('new-teacher-name').value.trim();
            const email = document.getElementById('new-teacher-email').value.trim();
            const password = document.getElementById('new-teacher-password').value.trim();
            const role = document.getElementById('new-teacher-role').value;
            const badges = getSelectedTeacherBadges('new-teacher');

            if (!name) { showToast("Informe o nome do professor.", "error"); return; }
            if (!email) { showToast("Informe o e-mail.", "error"); return; }
            if (!email.includes('@')) { showToast("E-mail inválido.", "error"); return; }
            if (!password) { showToast("Informe a senha (4 dígitos).", "error"); return; }
            if (password.length !== 4 || isNaN(password)) { showToast("Senha deve conter exatamente 4 dígitos.", "error"); return; }
            if (!canAssignDeveloperRole(role)) { showToast("Apenas um DEV pode cadastrar outro DEV.", "error"); return; }

            // Verificar se e-mail já existe
            if (MOCK_TEACHERS.find(t => t.email === email)) {
                showToast("Este e-mail já está cadastrado.", "error");
                return;
            }

            const newTeacher = {
                email: email,
                name: name,
                password: password,
                role: role,
                badges: normalizeTeacherBadges(badges, role),
                themePreference: 'auto'
            };

            MOCK_TEACHERS.push(newTeacher);
            console.log(`👨‍🏫 NOVO PROFESSOR: ${name} (${email}, Cargo: ${role}, Badges: [${badges.join(', ')}])`);
            addHistory("Professor Cadastrado", `${name} (${email}) foi adicionado ao sistema como ${role}.`, 'creation', { id: MOCK_TEACHERS.length, name, email }, 'teacher');
            showToast("Professor cadastrado com sucesso!");
            saveAllData();
            closeModal();
            switchTab('teachers');
        }

        // --- AÇÃO AO CLICAR NO ALUNO NO RANKING ---
        function handleRankingClick(id) {
            const student = MOCK_STUDENTS.find(s => s.id === id);
            if (!student) return;
            if (MOCK_USER.roleType === 'viewer') return;
            const showBanAction = !student.banned || canManuallyUnbanStudents();
            const banActionLabel = student.banned ? 'Desbanir' : 'Banir';
            const banActionIcon = student.banned ? 'unlock' : 'ban';
            const banActionTone = student.banned
                ? 'hover:border-emerald-400 group-hover:text-emerald-500'
                : 'hover:border-red-400 group-hover:text-red-500';

            // Se for professor, abre direto o histórico
            if (MOCK_USER.roleType === 'teacher') {
                openStudentHistory(id);
            } else {
                // Se for admin ou dev, abre o modal de escolha
                openModal(`
                    <div class="text-center mb-6">
                        <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <i data-lucide="user" class="w-8 h-8"></i>
                        </div>
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">${student.name}</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${student.class} • Saldo: M$ ${student.balance}</p>
                    </div>
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <button onclick="openStudentHistory(${id})" class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-amber-400 transition group btn-bounce">
                            <i data-lucide="history" class="w-6 h-6 text-slate-400 group-hover:text-amber-500"></i>
                            <span class="text-[10px] font-bold uppercase text-slate-600">Ver Histórico</span>
                        </button>
                        <button onclick="openEditStudentModal(${id})" class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-400 transition group btn-bounce">
                            <i data-lucide="pencil" class="w-6 h-6 text-slate-400 group-hover:text-blue-500"></i>
                            <span class="text-[10px] font-bold uppercase text-slate-600">Editar Aluno</span>
                        </button>
                        ${showBanAction ? `
                            <button onclick="toggleBanStudent(${id})" class="col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 ${banActionTone} transition group btn-bounce">
                                <i data-lucide="${banActionIcon}" class="w-6 h-6 text-slate-400 ${student.banned ? 'group-hover:text-emerald-500' : 'group-hover:text-red-500'}"></i>
                                <span class="text-[10px] font-bold uppercase text-slate-600">${banActionLabel}</span>
                            </button>
                        ` : ''}
                    </div>
                    <button onclick="closeModal()" class="w-full py-3 bg-slate-100 text-slate-500 font-bold rounded-xl text-xs uppercase tracking-widest btn-bounce">Cancelar</button>
                `);
            }
        }

        function restoreNoticeSnapshot(noticeData) {
            if (!noticeData) return null;

            const restoredNotice = cloneHistoryData(noticeData);
            const existingIndex = MOCK_NOTICES.findIndex(n => n.id === restoredNotice.id);

            if (existingIndex > -1) {
                MOCK_NOTICES[existingIndex] = restoredNotice;
            } else {
                MOCK_NOTICES.unshift(restoredNotice);
            }

            noticesCounter = Math.max(noticesCounter, (restoredNotice.id || 0) + 1);
            return restoredNotice;
        }

        // --- REVERSÃO DE HISTÓRICO (SÓ DEV) ---
        function undoHistoryEntry(historyId) {
            if (MOCK_USER.roleType !== 'dev') return;
            
            const histIndex = MOCK_HISTORY.findIndex(h => h.id === historyId);
            const histItem = MOCK_HISTORY[histIndex];

            if (!histItem) return;

            let revertTitle = "Reversão";
            let revertDesc = `A ação \"${histItem.title}\" foi revertida.`;
            let successMessage = "Registro revertido com sucesso!";

            // ========== REVERTER AVISOS ==========
            if (histItem.noticeAction) {
                if (histItem.noticeAction === 'creation') {
                    const noticeId = histItem.noticeData?.id;
                    const noticeIndex = MOCK_NOTICES.findIndex(n => n.id === noticeId);

                    if (noticeIndex === -1) {
                        showToast("Este aviso já não existe para ser revertido.", "error");
                        return;
                    }

                    MOCK_NOTICES.splice(noticeIndex, 1);
                    revertTitle = "Criação de Aviso Revertida";
                    revertDesc = `O aviso \"${histItem.noticeData?.title || histItem.title}\" foi removido via reversão.`;
                    successMessage = "Criação do aviso revertida.";
                } else if (histItem.noticeAction === 'deletion') {
                    const restoredNotice = restoreNoticeSnapshot(histItem.noticeData);
                    if (!restoredNotice) {
                        showToast("Não foi possível restaurar este aviso.", "error");
                        return;
                    }

                    revertTitle = "Aviso Restaurado";
                    revertDesc = `O aviso \"${restoredNotice.title}\" foi restaurado.`;
                    successMessage = "Aviso restaurado com sucesso!";
                } else if (histItem.noticeAction === 'edit' || histItem.noticeAction === 'toggle') {
                    const restoredNotice = restoreNoticeSnapshot(histItem.previousNoticeData);
                    if (!restoredNotice) {
                        showToast("Este aviso não possui dados suficientes para reversão.", "error");
                        return;
                    }

                    revertTitle = histItem.noticeAction === 'toggle' ? "Estado do Aviso Revertido" : "Edição de Aviso Revertida";
                    revertDesc = `O aviso \"${restoredNotice.title}\" voltou ao estado anterior.`;
                    successMessage = "Alteração do aviso revertida com sucesso!";
                }

                MOCK_HISTORY.splice(histIndex, 1);
                addHistory(revertTitle, revertDesc, 'edit', histItem.noticeData?.id || histItem.previousNoticeData?.id, 'notice');
                showToast(successMessage);
                saveAllData();
                switchTab('history');
                return;
            }

            // ========== REVERTER DELETIONS ==========
            if (histItem.studentData) {
                const deletionType = histItem.deletionType || 'student';
                MOCK_HISTORY.splice(histIndex, 1);
                
                if (deletionType === 'teacher') {
                    // Restaurar professor
                    MOCK_TEACHERS.push(histItem.studentData);
                    addHistory("Restauração de Professor", `${histItem.studentData.name} foi restaurado.`, 'creation', histItem.studentData.id, 'teacher');
                    showToast("Professor restaurado com sucesso!");
                } else {
                    // Restaurar aluno
                    const exists = MOCK_STUDENTS.find(s => s.id === histItem.studentData.id);
                    if(exists) {
                        histItem.studentData.id = Math.max(...MOCK_STUDENTS.map(s => s.id), 0) + 1;
                    }
                    
                    MOCK_STUDENTS.push(histItem.studentData);
                    addHistory("Restauração", `Aluno ${histItem.studentData.name} foi restaurado.`, 'creation', histItem.studentData.id, 'student');
                    showToast("Aluno restaurado com sucesso!");
                }
                
                saveAllData();
                switchTab('history');
                return;
            }

            // ========== REVERTER CRÉDITOS E DÉBITOS ==========
            if (histItem.type === 'credit' || histItem.type === 'debit') {
                const student = MOCK_STUDENTS.find(s => s.id === histItem.studentId);
                if (!student) {
                    showToast("Aluno não encontrado para reverter transação.", "error");
                    return;
                }

                // Extrair valor da descrição (ex: "M$ 100" ou "M$ 50.50")
                const valueMatch = histItem.desc?.match(/M\\\$ ([0-9.]+)/);
                if (!valueMatch || !valueMatch[1]) {
                    showToast("Não foi possível extrair o valor da transação.", "error");
                    return;
                }

                const transactionValue = parseFloat(valueMatch[1]);
                if (isNaN(transactionValue)) {
                    showToast("Valor inválido para reverter.", "error");
                    return;
                }

                // Reverter a transação
                if (histItem.type === 'credit') {
                    student.balance -= transactionValue;
                    revertTitle = "Crédito Revertido";
                    revertDesc = `Crédito de M$ ${transactionValue} foi removido de ${student.name}.`;
                } else {
                    student.balance += transactionValue;
                    revertTitle = "Débito Revertido";
                    revertDesc = `Débito de M$ ${transactionValue} foi restaurado para ${student.name}.`;
                }

                MOCK_HISTORY.splice(histIndex, 1);
                addHistory(revertTitle, revertDesc, 'edit', histItem.studentId);
                showToast(successMessage);
                saveAllData();
                switchTab('history');
                return;
            }

            // ========== REVERTER BANIMENTOS ==========
            if (/banimento/i.test(histItem.title) || /desbanimento/i.test(histItem.title)) {
                const student = MOCK_STUDENTS.find(s => s.id === histItem.studentId);
                if (!student) {
                    showToast("Aluno não encontrado para reverter ban.", "error");
                    return;
                }

                const wasBanned = /banimento de aluno/i.test(histItem.title);
                
                if (wasBanned) {
                    // Era um banimento, então desbanir
                    student.banned = false;
                    revertTitle = "Banimento Revertido";
                    revertDesc = `O banimento de ${student.name} foi removido.`;
                } else {
                    // Era um desbanimento, então banir de volta
                    student.banned = true;
                    student.banCount = (Number(student.banCount) || 0);
                    revertTitle = "Desbanimento Revertido";
                    revertDesc = `${student.name} foi banido novamente.`;
                }

                MOCK_HISTORY.splice(histIndex, 1);
                addHistory(revertTitle, revertDesc, 'edit', histItem.studentId);
                showToast(successMessage);
                saveAllData();
                switchTab('history');
                return;
            }

            // ========== REVERTER EDIÇÕES DE ALUNO ==========
            if (histItem.type === 'edit' && /aluno editado|saldo ajustado/i.test(histItem.title)) {
                const student = MOCK_STUDENTS.find(s => s.id === histItem.studentId);
                if (!student) {
                    showToast("Aluno não encontrado para reverter edição.", "error");
                    return;
                }

                // Para "Saldo Ajustado", extrair os valores anterior e novo
                if (/saldo ajustado/i.test(histItem.title)) {
                    const balanceMatch = histItem.desc?.match(/M\\\$ ([0-9.]+).*M\\\$ ([0-9.]+)/);
                    if (balanceMatch && balanceMatch[1]) {
                        const previousBalance = parseFloat(balanceMatch[1]);
                        if (!isNaN(previousBalance)) {
                            student.balance = previousBalance;
                            revertTitle = "Ajuste de Saldo Revertido";
                            revertDesc = `Saldo de ${student.name} foi restaurado para M$ ${previousBalance}.`;
                        }
                    }
                } else {
                    // Para "Aluno Editado", apenas informar
                    revertTitle = "Edição de Aluno Revertida";
                    revertDesc = `Dados de ${student.name} foram restaurados.`;
                }

                MOCK_HISTORY.splice(histIndex, 1);
                addHistory(revertTitle, revertDesc, 'edit', histItem.studentId);
                showToast(successMessage);
                saveAllData();
                switchTab('history');
                return;
            }

            // ========== REVERTER CRIAÇÕES E EXCLUSÕES GENÉRICAS ==========
            if (histItem.type === 'creation' && !histItem.noticeAction) {
                // Criações de alunos ou professores
                MOCK_HISTORY.splice(histIndex, 1);
                addHistory("Criação Revertida", `A criação registrada em \"${histItem.title}\" foi desfeita.`, 'deletion', null);
                showToast(successMessage);
                saveAllData();
                switchTab('history');
                return;
            }

            showToast("Este registro não possui reversão automática configurada.", "warning");
        }

        function undoDelete(historyId) {
            undoHistoryEntry(historyId);
        }

        function deleteHistoryEntry(historyId) {
            if (MOCK_USER.roleType !== 'dev') return;
            
            const histIndex = MOCK_HISTORY.findIndex(h => h.id === historyId);
            if (histIndex > -1) {
                const entry = MOCK_HISTORY[histIndex];
                MOCK_HISTORY.splice(histIndex, 1);
                console.log(`🗑️ HISTÓRICO DELETADO: "${entry.title}" (ID: ${historyId}) removido pelo DEV`);
                showToast("Registro removido do histórico.", "success");
                saveAllData();
                switchTab('history');
            }
        }

        // --- MODAIS GERAIS ---
        function setModalBackdropHandler(handler = null) {
            window.modalBackdropHandler = typeof handler === 'function' ? handler : null;
        }

        function handleModalBackdropInteraction(event) {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            if (!modal || !content || modal.classList.contains('hidden')) return;

            if (content.contains(event.target)) {
                return;
            }

            if (typeof window.modalBackdropHandler === 'function') {
                window.modalBackdropHandler();
                return;
            }

            closeModal();
        }

        // Modal de confirmação reutilizável
        function showConfirmModal(message, title = 'Confirmação') {
            return new Promise((resolve) => {
                window.__confirmResolve = resolve;
                const content = `
                    <div class="p-4">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h3 class="font-black text-slate-800 text-lg">${escapeHtml(title)}</h3>
                                <p class="text-[12px] text-slate-500 mt-2">${escapeHtml(message)}</p>
                            </div>
                        </div>
                        <div class="mt-6 flex gap-3 justify-end">
                            <button type="button" onclick="window.__confirmResolve(false); closeModal();" class="py-3 px-4 bg-slate-100 text-slate-700 rounded-2xl">Cancelar</button>
                            <button type="button" onclick="window.__confirmResolve(true); closeModal();" class="py-3 px-4 bg-rose-600 text-white rounded-2xl">Confirmar</button>
                        </div>
                    </div>
                `;
                setModalBackdropHandler(() => { closeModal(); resolve(false); });
                openModal(content);
            });
        }

        function openModal(contentHtml) {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            const shell = modal.querySelector('.modal-scroll-shell');
            modal.classList.remove('modal-closing', 'opacity-0');
            content.classList.remove('modal-closing', 'scale-95');
            modal.style.animation = 'none';
            content.style.animation = 'none';
            void modal.offsetWidth;
            content.innerHTML = contentHtml;
            modal.classList.remove('hidden');
            if (shell) shell.scrollTop = 0;
            content.scrollTop = 0;
            content.onclick = function(event) {
                event.stopPropagation();
            };
            
            // Adiciona listener para fechar ao clicar fora (inclui a área do shell no mobile)
            modal.onclick = handleModalBackdropInteraction;
            
            setTimeout(() => { 
                modal.style.animation = '';
                content.style.animation = '';
                modal.classList.remove('opacity-0'); 
                content.classList.remove('scale-95'); 
            }, 10);
            initIcons();
            applyAutofillGuards(content);
            enhanceInteractiveElements(content);
        }

        function closeModal() {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            setModalBackdropHandler(null);
            modal.classList.add('modal-closing');
            content.classList.add('modal-closing');
            modal.classList.add('opacity-0'); 
            content.classList.add('scale-95');
            setTimeout(() => { 
                modal.classList.add('hidden');
                modal.classList.remove('modal-closing', 'opacity-0');
                content.classList.remove('modal-closing', 'scale-95');
                modal.onclick = null; // Remove o listener
                content.onclick = null;
            }, 360);
        }

        function showActiveNotices() {
            const activeNotices = MOCK_NOTICES.filter(n => n.active);
            if (activeNotices.length === 0) return;

            let noticesHtml = activeNotices.map(n => `
                <div class="p-4 rounded-2xl mb-3 shadow-sm border" style="background: linear-gradient(135deg, #fff7db 0%, #fffdf7 55%, #ffedd5 100%); border-color: #f5c97b; color: #3f2b0c;">
                    <p class="font-bold mb-1" style="color: #7c2d12;">${n.title}</p>
                    <p class="text-sm leading-relaxed" style="color: #3f3f46;">${n.message}</p>
                    <p class="text-[10px] mt-2 font-bold uppercase tracking-widest" style="color: #9a3412;">Por: ${n.authorName}</p>
                </div>
            `).join('');

            openModal(`
                <div class="text-center mb-4">
                    <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 border" style="background: #fef3c7; color: #b45309; border-color: #fcd34d;"><i data-lucide="bell" class="w-6 h-6"></i></div>
                    <h3 class="font-black text-lg uppercase tracking-tight" style="color: #92400e;">Avisos Importantes</h3>
                </div>
                <div class="max-h-64 overflow-y-auto no-scrollbar mb-6">
                    ${noticesHtml}
                </div>
                <button onclick="closeModal()" class="w-full py-3 bg-slate-900 hover:bg-slate-800 transition text-white font-bold rounded-xl btn-bounce">Entendi</button>
            `);
        }

        function confirmAction(title, message, onConfirm, onCancel = null, isDangerous = false) {
            const bgColor = isDangerous ? 'from-red-500 to-red-600' : 'from-slate-800 to-slate-900';
            const confirmButtonColor = isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800';
            
            openModal(`
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-gradient-to-br ${bgColor} text-white rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="${isDangerous ? 'alert-triangle' : 'help-circle'}" class="w-8 h-8"></i>
                    </div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">${title}</h3>
                    <p class="text-sm text-slate-600 mt-2">${message}</p>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeModal(); ${onCancel ? onCancel + '()' : ''}" class="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl btn-bounce uppercase text-xs">Cancelar</button>
                    <button onclick="closeModal(); ${onConfirm}();" class="${confirmButtonColor} flex-1 py-3 text-white font-bold rounded-xl btn-bounce uppercase text-xs transition">Confirmar</button>
                </div>
            `);
        }

        function openGlobalAddModal() {
            openModal(`
                <div class="text-center mb-6">
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Adicionar Novo</h3>
                    <p class="text-xs text-slate-500">Escolha o que deseja cadastrar</p>
                </div>
                <div class="grid ${canManageTeachers() ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-6">
                    <button onclick="openAddStudentModal()" class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-amber-400 transition group hover:scale-105 active:scale-95">
                        <i data-lucide="user" class="w-6 h-6 text-slate-400 group-hover:text-amber-500"></i>
                        <span class="text-[10px] font-bold uppercase text-slate-600">Aluno</span>
                    </button>
                    ${canManageTeachers() ? `
                        <button onclick="openAddTeacherModal()" class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:border-blue-400 transition group hover:scale-105 active:scale-95">
                            <i data-lucide="shield-check" class="w-6 h-6 text-slate-400 group-hover:text-blue-500"></i>
                            <span class="text-[10px] font-bold uppercase text-slate-600">Professor</span>
                        </button>
                    ` : ''}
                </div>
                <button onclick="closeModal()" class="w-full py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
            `);
        }

        function openAddStudentModal(defaultClass = "") {
            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Novo Aluno</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastrar no Sistema</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Nome Completo</label>
                            <input type="text" id="new-std-name" placeholder="Ex: João Silva" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Turma</label>
                            <select id="new-std-class" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                                ${FIXED_CLASSES.map(c => `<option value="${c}" ${c === defaultClass ? 'selected' : ''}>${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aluno AEE?</span>
                            <input type="checkbox" id="new-std-aee" class="w-5 h-5 accent-amber-500">
                        </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="${defaultClass ? `openClassDetails('${defaultClass}')` : 'closeModal()'}" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveNewStudent()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Cadastrar</button>
                    </div>
                </div>
            `);
        }

        function saveNewStudent() {
            const name = document.getElementById('new-std-name').value.trim();
            const className = document.getElementById('new-std-class').value;
            const aee = document.getElementById('new-std-aee').checked;

            if (!name) { showToast("Informe o nome do aluno.", "error"); return; }

            const newId = Math.max(...MOCK_STUDENTS.map(s => s.id), 0) + 1;
            const newStudent = {
                id: newId,
                name: name,
                class: className,
                balance: 0,
                aee: aee,
                weekCredits: 0,
                banned: false,
                banCount: 0,
                banRelatedToFairDate: ''
            };

            MOCK_STUDENTS.push(newStudent);
            addHistory("Novo Aluno", `${name} cadastrado no ${className}.`, 'creation', newStudent.id);
            showToast("Aluno cadastrado com sucesso!");
            console.log(`✓ NOVO ALUNO: ${name} (ID: ${newId}, Turma: ${className}, AEE: ${aee})`);
            saveAllData();
            openClassDetails(className);
            if (currentTabView === 'students') switchTab('students');
        }

        function openStudentImportModal() {
            if (!canImportStudents()) {
                showToast("Apenas admins e DEV podem importar alunos.", "error");
                return;
            }

            openModal(`
                <div class="mb-6">
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Importar Lista de Alunos</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Word, PDF, Excel ou TXT</p>
                </div>
                <div class="space-y-4 mb-8">
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                        <p class="text-[11px] text-blue-800 leading-relaxed font-medium">
                            Formatos aceitos: <strong>Excel (.xlsx, .xls)</strong>, <strong>Word (.docx)</strong>, <strong>PDF (.pdf)</strong> e <strong>Texto (.txt)</strong>.
                            Cada linha deve trazer pelo menos o nome do aluno. Exemplo: <strong>João Silva - 6º Ano A - AEE</strong>.
                        </p>
                    </div>
                    ${canAccessDeveloperTools() ? `
                    <div class="flex items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <div>
                            <p class="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Base Aprendida</p>
                            <p class="text-sm text-amber-900 font-semibold">${LEARNED_IMPORT_NAMES.length} nomes aprendidos disponíveis para ajudar na detecção.</p>
                        </div>
                        <button onclick="openLearnedImportNamesModal(true)" class="shrink-0 px-4 py-3 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest btn-bounce">Ver Base</button>
                    </div>
                    ` : ''}
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Turma padrão para linhas sem turma</label>
                        <select id="student-import-default-class" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                            <option value="">Manter somente as turmas encontradas no arquivo</option>
                            ${FIXED_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                            <i data-lucide="file-spreadsheet" class="w-5 h-5 mx-auto mb-2 text-green-600"></i>
                            <p class="text-[10px] font-bold uppercase text-slate-600">Excel</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                            <i data-lucide="file-text" class="w-5 h-5 mx-auto mb-2 text-blue-600"></i>
                            <p class="text-[10px] font-bold uppercase text-slate-600">Word</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                            <i data-lucide="file-search" class="w-5 h-5 mx-auto mb-2 text-red-600"></i>
                            <p class="text-[10px] font-bold uppercase text-slate-600">PDF</p>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                            <i data-lucide="file-type" class="w-5 h-5 mx-auto mb-2 text-amber-600"></i>
                            <p class="text-[10px] font-bold uppercase text-slate-600">TXT</p>
                        </div>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                    <button onclick="triggerStudentImport()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Escolher Arquivo</button>
                </div>
            `);
        }

        function triggerStudentImport() {
            if (!canImportStudents()) {
                showToast("Apenas admins e DEV podem importar alunos.", "error");
                return;
            }

            const fallbackClassElement = document.getElementById('student-import-default-class');
            const input = document.getElementById('student-import-file');
            window.studentImportDefaultClass = fallbackClassElement ? fallbackClassElement.value : '';
            input.value = '';
            console.log('[IMPORT] Abrindo seletor de arquivo de alunos', {
                fallbackClass: window.studentImportDefaultClass || '(sem turma padrão)'
            });
            input.click();
        }

        const COMMON_BRAZILIAN_GIVEN_NAMES = new Set([
            'abel','abigail','abner','abraao','adailton','adiel','adriana','adriel','agata','agatha','aila','ailton','alana','alane','alanis','alanna','alany','alanys','alessandra','alex','alexandre','alexia','alicia','aline','alinne','allyce','amanda','amara','amora','ana','anabela','anabelly','anaclara','analuiza','analice','anapaula','anderson','andre','andrea','andressa','ane','anne','anthony','antonella','antonio','ariel','arthur','ashiley','athos','augusto','ayla','barbara','beatriz','benicio','bento','bianca','brenda','breno','brisa','bruna','bruno','caetano','caio','calebe','caleb','camila','carla','carlos','catarina','cecila','cecilia','clarice','clara','clovis','caua','caua','dandara','daniel','daniela','davi','davina','debora','diego','diogo','dominique','dora','douglas','eduarda','eduardo','eloa','eloah','eloi','elisa','eliza','emanuel','emanuelle','enzo','erica','erick','ester','esther','evelin','evelyn','fabiana','fabricio','felipe','fernanda','fernando','filipa','franciele','gael','gabriel','gabriela','gilberto','giovana','giovanna','gisele','gustavo','hadassa','heitor','helena','heloa','heloisa','henrique','higor','ian','igor','igrid','igryd','ingrid','ingryd','ines','isabela','isabelly','isaque','isis','itallo','ivana','ivone','jaciara','jade','jailson','jamile','jana','janaina','janete','jhoan','joana','joaquim','joao','jordana','jorge','jose','josue','juan','julia','juliana','julio','kael', 'kaio', 'kaique','kailane','kaleb','kalebe','kalel','kalinny','kaliny','kalinne','kalliny','kallinny','kamila','karina','kaua','kauan','kawan','keila','kelly','keven','kevin','kiara','laiane','lais','lara','larissa','laura','lavinia','leandro','leonardo','leticia','lian','lidia','lis','lorena','lorenzo','luan','luana','lucas','luciana','lucio','luigi','luiza','maira','maite','malu','manuel','manuela','marcela','marcelo','marcos','margarida','maria','mariana','marielly','marilia','marlon','martina','matheus','mateus','melina','melissa','micaela','miguel','milena','mirian','moises','murilo','nadir','naila','natalia','nicolas','nina','noa','octavio','olivia','otavio','pablo','paola','patricia','paulo','pedro','pietra','priscila','rafael','rafaela','raiane','raissa','ramon','rebeca','regiane','renan','rhuan','richard','rita','ronan','samara','samir','samuel','sara','savio','selma','sergio','silas','sophia','stella','suelen','taiane','talita','tamires','tarcisio','thais','thalita','theo','thiago','tiago','valentina','vanessa','vera','vicente','victor','vitoria','vivian','wallace','wesley','willian','yago','yasmim','yasmin','yohana','yuri','ygrid','ygryd','zaira'
        ]);

        const COMMON_BRAZILIAN_SURNAMES = new Set([
            'aguiar','albuquerque','alcantara','alencar','alexandre','almeida','alves','amaral','andrade','angelim','anjos','araujo','arruda','assis','azevedo','bandeira','barbosa','barreto','barros','batista','bezerra','bispo','bittencourt','braga','brandao','brito','bueno','cabral','caetano','camargo','campelo','campos','candeias','cardoso','carmo','carneiro','carvalho','castelo','castro','cavalcanti','cerqueira','chagas','coelho','correa','costa','coutinho','cruz','cunha','dantas','dias','diniz','domingues','duarte','evangelista','fagundes','farias','felix','ferraz','ferreira','figueiredo','filho','fonseca','freire','furtado','galvao','garcia','gomes','gouveia','goncalves','guedes','guimaraes','henriques','lacerda','leal','leitao','lemos','lima','lins','lopes','macedo','machado','maciel','maia','marinho','marques','martins','mattos','medeiros','melo','menezes','mendes','mesquita','miranda','monte','monteiro','moraes','morais','moreira','moura','muniz','neves','nobre','nogueira','novaes','oliveira','pacheco','paiva','parente','passos','peixoto','pereira','pires','porto','queiroz','ramos','resende','reis','rezende','ribeiro','rocha','rosa','sa','sales','sampaio','santana','santiago','santos','serafim','silva','siqueira','soares','sousa','souza','tavares','teixeira','torres','trindade','vasconcelos','veloso','venancio','ventura','veras','viana','vieira'
        ]);

        const BRAZILIAN_NAME_PARTICLES = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);

        const COMMON_BRAZILIAN_COMPOUND_NAMES = new Set([
            'abner kaleb','ana beatriz','ana carolina','ana clara','ana laura','ana luiza','ana paula','ana sophia','arthur miguel','carlos eduardo','davi lucca','davi luiz','gabriel henrique','gabriel vitor','heloisa helena','isabela cristina','joao gabriel','joao guilherme','joao lucas','joao miguel','joao pedro','jose augusto','jose henrique','jose pedro','kallinny igryd','laura beatriz','luiz felipe','luiz gustavo','luiz henrique','luiz otavio','maria alice','maria clara','maria cecilia','maria eduarda','maria fernanda','maria flor','maria helena','maria julia','maria laura','maria luiza','maria sophia','pedro augusto','pedro henrique','pedro lucas','sarah victoria','vitoria regia'
        ]);

        const IMPORT_FORBIDDEN_NAME_TERMS = new Set([
            'aee','admin','aluno','ano','atendimento','aviso','bairro','banco','cadastro','celular','cep','classe','codigo','conta','configuracao','configuração','cpf','data','dev','direcao','direção','diretor','email','endereco','endereço','estado','ficha','fone','historico','histórico','idade','lista','logradouro','mae','mãe','matricula','matrícula','mensagem','nome','numero','número','pai','prof','profa','professor','professora','relacao','relação','responsavel','responsável','rg','rua','saldo','sala','serie','série','telefone','tel','turma','turno','whatsapp'
        ]);

        function normalizeImportKey(value) {
            return String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .trim();
        }

        function normalizeImportToken(value) {
            return normalizeImportKey(value).replace(/[^a-z]/g, '');
        }

        function normalizeLearnedImportValue(value, kind = 'given') {
            if (kind === 'compound') {
                return String(value || '')
                    .split(' ')
                    .map(part => normalizeImportToken(part))
                    .filter(Boolean)
                    .join(' ')
                    .trim();
            }

            return normalizeImportToken(value);
        }

        function getLearnedImportKindLabel(kind) {
            if (kind === 'compound') return 'Composto';
            if (kind === 'surname') return 'Sobrenome';
            return 'Nome';
        }

        function buildPreloadedLearnedImportEntry(entry) {
            const kind = entry && (entry.kind === 'compound' || entry.kind === 'surname') ? entry.kind : 'given';
            const normalized = normalizeLearnedImportValue(entry?.normalized || entry?.value || '', kind);
            if (!normalized) return null;

            return {
                id: entry?.id || `${kind}:${normalized}`,
                kind,
                value: kind === 'compound'
                    ? normalized.split(' ').map(formatImportedNamePiece).join(' ')
                    : formatImportedNamePiece(normalized),
                normalized,
                source: entry?.source || 'Base curada do app',
                addedAt: entry?.addedAt || '2026-03-22T00:00:00.000Z'
            };
        }

        function mergePreloadedLearnedImportNames(entries = []) {
            const normalizedEntries = Array.isArray(entries) ? [...entries] : [];
            const existingKeys = new Set();

            normalizedEntries.forEach(entry => {
                const kind = entry && (entry.kind === 'compound' || entry.kind === 'surname') ? entry.kind : 'given';
                const normalized = normalizeLearnedImportValue(entry?.normalized || entry?.value || '', kind);
                if (!normalized) return;
                existingKeys.add(`${kind}:${normalized}`);
            });

            PRELOADED_LEARNED_IMPORT_NAMES.forEach(entry => {
                const normalizedEntry = buildPreloadedLearnedImportEntry(entry);
                if (!normalizedEntry) return;
                const entryKey = `${normalizedEntry.kind}:${normalizedEntry.normalized}`;
                if (existingKeys.has(entryKey)) return;
                normalizedEntries.push(normalizedEntry);
                existingKeys.add(entryKey);
            });

            return normalizedEntries;
        }

        function syncLearnedImportNameCaches() {
            LEARNED_GIVEN_NAMES = new Set();
            LEARNED_SURNAME_NAMES = new Set();
            LEARNED_COMPOUND_NAMES = new Set();
            LEARNED_IMPORT_NAMES = mergePreloadedLearnedImportNames(Array.isArray(LEARNED_IMPORT_NAMES) ? LEARNED_IMPORT_NAMES : [])
                .map(entry => {
                    const kind = entry && (entry.kind === 'compound' || entry.kind === 'surname') ? entry.kind : 'given';
                    const normalized = normalizeLearnedImportValue(entry?.normalized || entry?.value || '', kind);
                    if (!normalized) return null;

                    const displayValue = kind === 'compound'
                        ? normalized.split(' ').map(formatImportedNamePiece).join(' ')
                        : formatImportedNamePiece(normalized);

                    const normalizedEntry = {
                        id: entry?.id || `${kind}:${normalized}`,
                        kind,
                        value: displayValue,
                        normalized,
                        source: entry?.source || 'Importação confirmada',
                        addedAt: entry?.addedAt || new Date().toISOString()
                    };

                    if (kind === 'compound') {
                        LEARNED_COMPOUND_NAMES.add(normalized);
                    } else if (kind === 'surname') {
                        LEARNED_SURNAME_NAMES.add(normalized);
                    } else {
                        LEARNED_GIVEN_NAMES.add(normalized);
                    }

                    return normalizedEntry;
                })
                .filter(Boolean)
                .sort((a, b) => a.value.localeCompare(b.value, 'pt-BR'));
        }

        function addLearnedImportName(kind, value, source = 'Importação confirmada') {
            const normalized = normalizeLearnedImportValue(value, kind);
            if (!normalized) return false;

            const exists = LEARNED_IMPORT_NAMES.some(entry => entry.kind === kind && entry.normalized === normalized);
            if (exists) return false;

            LEARNED_IMPORT_NAMES.push({
                id: `${kind}:${normalized}`,
                kind,
                value: kind === 'compound' ? normalized.split(' ').map(formatImportedNamePiece).join(' ') : formatImportedNamePiece(normalized),
                normalized,
                source,
                addedAt: new Date().toISOString()
            });
            syncLearnedImportNameCaches();
            return true;
        }

        function learnImportedNamePatterns(name, source = 'Importação confirmada') {
            const normalizedName = sanitizeImportedName(name);
            const candidate = scoreImportedNameCandidate(normalizedName);
            const words = candidate.significantWords.map(word => formatImportedNamePiece(word)).filter(Boolean);
            if (words.length < 2) return 0;

            let learnedCount = 0;
            const firstToken = normalizeImportToken(words[0]);
            if (firstToken && !COMMON_BRAZILIAN_GIVEN_NAMES.has(firstToken) && !COMMON_BRAZILIAN_SURNAMES.has(firstToken)) {
                learnedCount += addLearnedImportName('given', words[0], source) ? 1 : 0;
            }

            const shouldLearnSecondToken = words[1]
                && candidate.recognizedSurnames.length === 0
                && words.length <= 3;

            if (shouldLearnSecondToken) {
                const secondToken = normalizeImportToken(words[1]);
                if (secondToken && !COMMON_BRAZILIAN_GIVEN_NAMES.has(secondToken) && !COMMON_BRAZILIAN_SURNAMES.has(secondToken)) {
                    learnedCount += addLearnedImportName('given', words[1], source) ? 1 : 0;
                }

                learnedCount += addLearnedImportName('compound', `${words[0]} ${words[1]}`, source) ? 1 : 0;
            }

            const lastWord = words[words.length - 1];
            const lastToken = normalizeImportToken(lastWord);
            if (lastToken && !COMMON_BRAZILIAN_GIVEN_NAMES.has(lastToken) && !COMMON_BRAZILIAN_SURNAMES.has(lastToken) && !LEARNED_GIVEN_NAMES.has(lastToken)) {
                learnedCount += addLearnedImportName('surname', lastWord, source) ? 1 : 0;
            }

            return learnedCount;
        }

        function scanComplexStudentNamesIntoLearnedDatabase() {
            return (MOCK_STUDENTS || []).reduce((total, student) => {
                if (!student?.name) return total;
                return total + learnImportedNamePatterns(student.name, 'Varredura da base de alunos');
            }, 0);
        }

        function hydrateLearnedImportNameDatabase() {
            syncLearnedImportNameCaches();
            const learnedFromStudents = scanComplexStudentNamesIntoLearnedDatabase();
            if (learnedFromStudents > 0) {
                syncLearnedImportNameCaches();
            }
            return learnedFromStudents;
        }

        function getLearnedImportNamesByKind(kind) {
            return LEARNED_IMPORT_NAMES.filter(entry => entry.kind === kind);
        }

        function saveManualLearnedImportName() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode gerenciar a base aprendida.', 'error');
                return;
            }

            const kindElement = document.getElementById('learned-import-kind');
            const valueElement = document.getElementById('learned-import-value');
            if (!kindElement || !valueElement) return;

            const kind = kindElement.value;
            const value = sanitizeImportedName(valueElement.value);

            if (!value) {
                showToast('Informe um nome para adicionar à base aprendida.', 'error');
                return;
            }

            if (kind === 'compound' && value.split(' ').filter(Boolean).length < 2) {
                showToast('Nomes compostos precisam de pelo menos duas palavras.', 'warning');
                return;
            }

            const added = addLearnedImportName(kind, value, `Cadastro manual por ${MOCK_USER.name}`);
            if (!added) {
                showToast('Esse item já existe na base aprendida.', 'warning');
                return;
            }

            addHistory('Base de Nomes Aprendidos', `${MOCK_USER.name} adicionou manualmente ${value} à base aprendida.`, 'creation');
            saveAllData();
            showToast('Nome adicionado à base aprendida com sucesso.', 'success');
            openLearnedImportNamesModal(window.learnedImportNamesReturnToImport);
        }

        function resolveImportRecognitionSource(name, mode = 'auto') {
            const candidate = scoreImportedNameCandidate(name);
            const learnedGivenMatch = candidate.significantWords.some(word => LEARNED_GIVEN_NAMES.has(normalizeImportToken(word)));
            const learnedSurnameMatch = candidate.significantWords.some(word => LEARNED_SURNAME_NAMES.has(normalizeImportToken(word)));
            const firstPair = candidate.significantWords.length >= 2
                ? `${normalizeImportToken(candidate.significantWords[0])} ${normalizeImportToken(candidate.significantWords[1])}`
                : '';
            const learnedCompoundMatch = firstPair ? LEARNED_COMPOUND_NAMES.has(firstPair) : false;

            if (mode === 'manual') {
                return {
                    label: candidate.score >= 7 ? 'Revisão Manual Forte' : 'Revisão Manual',
                    tone: candidate.score >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700',
                    helper: candidate.score >= 7 ? 'Linha manual com nome plausível e turma válida.' : 'Entrada revisada manualmente pelo usuário.'
                };
            }

            if (learnedCompoundMatch || learnedGivenMatch || learnedSurnameMatch) {
                return {
                    label: learnedCompoundMatch ? 'Base Aprendida Composta' : learnedSurnameMatch ? 'Base Aprendida de Sobrenome' : 'Base Aprendida',
                    tone: 'bg-emerald-100 text-emerald-800',
                    helper: 'Detectado com apoio da base aprendida pelo sistema.'
                };
            }

            return {
                label: 'Base Fixa',
                tone: 'bg-blue-100 text-blue-800',
                helper: 'Detectado pela base principal de nomes do sistema.'
            };
        }

        function escapeRegex(value) {
            return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function parseImportedAee(value) {
            const normalized = normalizeImportKey(value);
            return normalized === 'sim'
                || normalized === 'true'
                || normalized === '1'
                || normalized.includes('aee')
                || normalized.includes('especial')
                || /\bpcd\b/.test(normalized)
                || /\btea\b/.test(normalized);
        }

        function resolveImportedClass(value, fallbackClass = '') {
            const normalizedValue = normalizeImportKey(value);
            if (!normalizedValue) return fallbackClass || '';

            const directMatch = FIXED_CLASSES.find(className => normalizeImportKey(className) === normalizedValue);
            if (directMatch) return directMatch;

            const flexibleMatch = FIXED_CLASSES.find(className => {
                const normalizedClass = normalizeImportKey(className);
                const compactClass = normalizedClass.replace(/[^a-z0-9]/g, '');
                const compactValue = normalizedValue.replace(/[^a-z0-9]/g, '');
                return normalizedValue.includes(normalizedClass) || normalizedClass.includes(normalizedValue) || compactValue.includes(compactClass) || compactClass.includes(compactValue);
            });

            return flexibleMatch || fallbackClass || '';
        }

        function findImportedClassInText(text) {
            const normalizedText = normalizeImportKey(text);
            return resolveImportedClass(normalizedText, '');
        }

        function createImportedStudent(name, className, aee = false) {
            return {
                name: String(name || '').trim(),
                class: className,
                aee: Boolean(aee),
                balance: 0,
                weekCredits: 0,
                banned: false,
                banCount: 0,
                banRelatedToFairDate: ''
            };
        }

        function hasPhoneLikePattern(value) {
            const text = String(value || '');
            const digits = text.replace(/\D/g, '');
            if (/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/.test(text)) return true;
            return digits.length >= 10 && digits.length <= 13 && /[()\-+.\s]/.test(text);
        }

        function stripPhoneLikeSegments(value) {
            return String(value || '')
                .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/g, ' ')
                .replace(/\b(?:tel|telefone|cel|celular|whatsapp|zap)\b\s*:?/ig, ' ');
        }

        function formatImportedNamePiece(piece) {
            const normalized = normalizeImportKey(piece);
            if (!normalized) return '';
            if (BRAZILIAN_NAME_PARTICLES.has(normalized)) return normalized;
            return normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }

        function segmentBrazilianNameToken(token) {
            const rawToken = String(token || '').trim();
            if (!rawToken || rawToken.includes(' ')) return null;

            const normalizedToken = normalizeImportToken(rawToken);
            if (normalizedToken.length < 7) return null;

            const dictionary = new Set([...COMMON_BRAZILIAN_GIVEN_NAMES, ...LEARNED_GIVEN_NAMES, ...COMMON_BRAZILIAN_SURNAMES, ...LEARNED_SURNAME_NAMES, ...BRAZILIAN_NAME_PARTICLES]);
            const search = (index, parts, namedParts = 0) => {
                if (index === normalizedToken.length) return namedParts >= 2 && parts.length <= 5 ? parts : null;
                if (parts.length >= 5) return null;

                const maxLength = Math.min(normalizedToken.length, index + 12);
                for (let end = maxLength; end >= index + 2; end--) {
                    const candidate = normalizedToken.slice(index, end);
                    const isKnown = dictionary.has(candidate);
                    const isParticle = BRAZILIAN_NAME_PARTICLES.has(candidate);
                    const previousPart = parts[parts.length - 1] || '';
                    const previousIsParticle = BRAZILIAN_NAME_PARTICLES.has(previousPart);
                    const canStart = parts.length === 0
                        ? (COMMON_BRAZILIAN_GIVEN_NAMES.has(candidate) || LEARNED_GIVEN_NAMES.has(candidate))
                        : isParticle
                            ? !previousIsParticle
                            : isKnown;

                    if (!canStart) continue;

                    const result = search(end, [...parts, candidate], namedParts + (isParticle ? 0 : 1));
                    if (result) return result;
                }

                return null;
            };

            const segmented = search(0, []);
            if (!segmented) return null;

            return segmented.map(formatImportedNamePiece).join(' ');
        }

        function normalizeImportedNameSpacing(value) {
            const tokens = String(value || '')
                .replace(/[._]+/g, ' ')
                .replace(/([a-zà-ÿ])([A-ZÀ-Ý])/g, '$1 $2')
                .replace(/([A-Za-zÀ-ÿ])(\d)/g, '$1 $2')
                .replace(/(\d)([A-Za-zÀ-ÿ])/g, '$1 $2')
                .split(/\s+/)
                .filter(Boolean)
                .map(token => segmentBrazilianNameToken(token) || token);

            return tokens.join(' ');
        }

        function normalizeImportedNameWords(value) {
            const words = String(value || '').split(' ').filter(Boolean);
            const significantWords = words.filter(word => !BRAZILIAN_NAME_PARTICLES.has(normalizeImportKey(word)));
            return { words, significantWords };
        }

        function isPlausibleNameWord(word) {
            const token = normalizeImportToken(word);
            if (!token || token.length < 3 || token.length > 15) return false;
            if (!/[aeiouy]/.test(token)) return false;
            if (IMPORT_FORBIDDEN_NAME_TERMS.has(normalizeImportKey(word))) return false;
            return true;
        }

        function hasKnownCompoundGivenName(words) {
            if (!Array.isArray(words) || words.length < 2) return false;
            const firstPair = `${normalizeImportToken(words[0])} ${normalizeImportToken(words[1])}`;
            return COMMON_BRAZILIAN_COMPOUND_NAMES.has(firstPair) || LEARNED_COMPOUND_NAMES.has(firstPair);
        }

        function scoreImportedNameCandidate(value) {
            const name = sanitizeImportedName(value);
            const { significantWords } = normalizeImportedNameWords(name);
            const digitCount = (name.match(/\d/g) || []).length;
            const recognizedGivenNames = significantWords.filter(word => {
                const token = normalizeImportToken(word);
                return COMMON_BRAZILIAN_GIVEN_NAMES.has(token) || LEARNED_GIVEN_NAMES.has(token);
            });
            const recognizedSurnames = significantWords.filter(word => {
                const token = normalizeImportToken(word);
                return COMMON_BRAZILIAN_SURNAMES.has(token) || LEARNED_SURNAME_NAMES.has(token);
            });
            const plausibleWords = significantWords.filter(isPlausibleNameWord);
            const hasCompoundGivenName = hasKnownCompoundGivenName(significantWords);
            let score = 0;

            if (significantWords.length >= 2) score += 1;
            if (recognizedGivenNames.length >= 1) score += 4;
            if (recognizedGivenNames.length >= 2) score += 1;
            if (recognizedSurnames.length >= 1) score += 2;
            if (recognizedSurnames.length >= 2) score += 1;
            if (hasCompoundGivenName) score += 3;
            if (significantWords.length >= 3) score += 1;
            if (significantWords.every(word => normalizeImportToken(word).length >= 2)) score += 1;
            if (plausibleWords.length >= 2) score += 2;
            if (plausibleWords.length === significantWords.length && significantWords.length >= 2) score += 2;
            if (recognizedGivenNames.length === 0 && recognizedSurnames.length === 0 && plausibleWords.length >= 2) score += 2;
            if (significantWords.length === 2 && plausibleWords.length === 2) score += 1;
            if (digitCount > 0) score -= Math.min(3, digitCount);
            if (significantWords.some(word => IMPORT_FORBIDDEN_NAME_TERMS.has(normalizeImportKey(word)))) score -= 6;
            if (significantWords.some(word => normalizeImportToken(word).length < 2)) score -= 2;

            return {
                name,
                score,
                significantWords,
                recognizedGivenNames,
                recognizedSurnames,
                hasCompoundGivenName
            };
        }

        function isLikelyBrazilianFullName(value) {
            const candidate = scoreImportedNameCandidate(value);
            const significantWords = candidate.significantWords;
            if (significantWords.length < 2 || significantWords.length > 8) return false;

            const recognizedGivenNames = candidate.recognizedGivenNames;
            const recognizedSurnames = candidate.recognizedSurnames;

            if (recognizedGivenNames.length >= 1 && (recognizedGivenNames.length + recognizedSurnames.length) >= 2) return true;
            if (candidate.hasCompoundGivenName && recognizedGivenNames.length >= 2) return true;

            const longWords = significantWords.filter(word => normalizeImportToken(word).length >= 3);
            return (longWords.length >= 2 && recognizedGivenNames.length >= 1) || candidate.score >= 7;
        }

        function sanitizeImportedName(value) {
            return normalizeImportedNameSpacing(stripPhoneLikeSegments(String(value || '')))
                .replace(/[|;,_./-]+/g, ' ')
                .replace(/\b(aee|sim|nao|não|true|false)\b/ig, ' ')
                .replace(/\b(?:tel|telefone|cel|celular|zap|whatsapp|numero|número|contato)\b/ig, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }

        function stripImportedStatusAnnotations(value) {
            return String(value || '')
                .replace(/\bREQUER\s+ATEN[ÇC][AÃ]O\s+M[ÉE]DICA\b/ig, ' ')
                .replace(/\bDISTOR[ÇC][AÃ]O\s+S[ÉE]RIE\s*\/\s*IDADE\b/ig, ' ')
                .replace(/\bFALTA\s+VIR\s+CONFIRMAR\s+A\s+MATR[ÍI]CULA\b/ig, ' ')
                .replace(/\bCANCELAD[AO]S?\b(?:\s*\d{1,2}\s*[A-Z]{2,3})?/ig, ' ')
                .replace(/\bPCD(?:\s+TEA)?\b/ig, ' ')
                .replace(/\bTEA\b/ig, ' ')
                .replace(/\bPL\b/ig, ' ')
                .replace(/\bN\b(?=\s|$)/ig, ' ')
                .replace(/\s{2,}/g, ' ')
                .trim();
        }
        function stripImportNoise(value) {
            return sanitizeImportedName(
                stripImportedStatusAnnotations(
                    String(value || '')
                        .replace(/\b(?:n[ºo°]?|num(?:ero)?|ordem|ord)\s*[:\-]?\s*\d+\b/ig, ' ')
                        .replace(/^\s*\d+\s*[.)\-:]*\s*/g, ' ')
                        .replace(/\b(?:matricula|matrícula|ra|registro|codigo|c[oó]digo|id)\s*[:\-#]*\s*[a-z0-9-]+\b/ig, ' ')
                        .replace(/\b(?:turno|manha|manhã|tarde|noite|integral)\b/ig, ' ')
                        .replace(/\b(?:nascimento|idade|sexo|responsavel|responsável|pai|mae|mãe)\b/ig, ' ')
                )
            );
        }

        function isImportDateOrPhoneLine(value) {
            const normalized = String(value || '')
                .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/g, ' ')
                .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, ' ')
                .replace(/\b\d{1,2}\s+\d{1,2}\s+\d{4}\b/g, ' ')
                .replace(/[()]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            return !normalized || !/[A-Za-zÀ-ÿ]/.test(normalized);
        }

        function isImportRosterHeaderLine(value) {
            const normalized = normalizeImportKey(value).replace(/\s+/g, ' ').trim();
            if (!normalized) return true;
            if (/^(turma|turno|integral|fone|n|no|n o|n nome dos alunos|nome dos alunos|data de nascimento|professor a|professora|professor)$/.test(normalized)) return true;
            if (/^ano letivo de \d{4}$/.test(normalized)) return true;
            if (/^\d+[.)]?$/.test(String(value || '').trim())) return true;
            return false;
        }

        function isLikelyTeacherNameLine(value, previousValue = '', nextValue = '') {
            const name = sanitizeImportedName(value);
            if (!name) return false;

            const previous = normalizeImportKey(previousValue).replace(/\s+/g, ' ').trim();
            const next = normalizeImportKey(nextValue).replace(/\s+/g, ' ').trim();
            const candidate = scoreImportedNameCandidate(name);

            if (candidate.significantWords.length === 0 || candidate.significantWords.length > 3) return false;
            if (previous.includes('nome dos alunos') && next.startsWith('professor')) return true;
            if (previous.startsWith('turno') && next.startsWith('professor')) return true;
            if (next.startsWith('professor')) return true;
            if (previous.startsWith('professor')) return true;

            return false;
        }

        function splitImportTextIntoParts(value) {
            return String(value || '')
                .split(/\t|;|\||\u2022|\s[-–—]\s|\s{2,}|,/)
                .map(part => stripImportNoise(part))
                .filter(Boolean);
        }

        function generateNameWindowCandidates(value) {
            const cleaned = stripImportNoise(value);
            const words = cleaned.split(' ').filter(Boolean);
            const candidates = new Set();

            if (words.length >= 2) {
                for (let size = 2; size <= Math.min(8, words.length); size++) {
                    for (let start = 0; start <= words.length - size; start++) {
                        const windowText = words.slice(start, start + size).join(' ');
                        if (windowText) candidates.add(windowText);
                    }
                }
            }

            return [...candidates];
        }

        function findBestStudentNameCandidate(value) {
            const rawValue = String(value || '');
            const direct = stripImportNoise(rawValue);
            const options = new Set([direct, ...splitImportTextIntoParts(rawValue), ...generateNameWindowCandidates(rawValue)]);
            let best = null;

            options.forEach(option => {
                const candidate = scoreImportedNameCandidate(option);
                const significantCount = candidate.significantWords.length;
                if (!candidate.name || significantCount < 2 || significantCount > 8) return;
                if (hasPhoneLikePattern(candidate.name) || hasPhoneLikePattern(rawValue)) return;
                if (isTeacherLikeLine(candidate.name)) return;
                if (candidate.significantWords.some(word => IMPORT_FORBIDDEN_NAME_TERMS.has(normalizeImportKey(word)))) return;

                const totalRecognized = candidate.recognizedGivenNames.length + candidate.recognizedSurnames.length;
                const weightedScore = candidate.score + totalRecognized * 2 + (significantCount === 2 ? 1 : 0);
                const current = {
                    ...candidate,
                    weightedScore,
                    totalRecognized
                };

                if (!best) {
                    best = current;
                    return;
                }

                if (current.weightedScore > best.weightedScore) {
                    best = current;
                    return;
                }

                if (current.weightedScore === best.weightedScore && current.name.length > best.name.length) {
                    best = current;
                }
            });

            if (!best) return null;
            if (best.weightedScore < 5) return null;
            return best;
        }

        function splitImportedRosterCandidates(value) {
            const raw = String(value || '')
                .replace(/\uF0FC/g, ' ')
                .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/g, ' ')
                .replace(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g, ' ')
                .replace(/\b\d{1,2}\s+\d{1,2}\s+\d{4}\b/g, ' ')
                .replace(/\b(?:PCD(?:\s+TEA)?|TEA|PL|N|REQUER\s+ATEN[ÇC][AÃ]O\s+M[ÉE]DICA|DISTOR[ÇC][AÃ]O\s+S[ÉE]RIE\s*\/\s*IDADE|CANCELAD[AO]S?(?:\s*\d{1,2}\s*[A-Z]{2,3})?|FALTA\s+VIR\s+CONFIRMAR\s+A\s+MATR[ÍI]CULA)\b(?=\s+[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/ig, '$&  ')
                .trim();

            if (!raw) return [];

            const numberedBlocks = raw
                .split(/(?=\b\d{1,2}\s*[.)]\s*[A-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ])/)
                .map(part => part.trim())
                .filter(Boolean);

            const blocks = numberedBlocks.length ? numberedBlocks : [raw];
            return blocks
                .map(block => stripImportNoise(block))
                .map(block => stripImportedStatusAnnotations(block))
                .map(block => block.replace(/^\s*\d+\s*[.)\-:]*\s*/g, '').replace(/\s{2,}/g, ' ').trim())
                .filter(Boolean);
        }

        function preprocessImportedStudentRows(rawRows, fallbackClass = '') {
            const preparedRows = [];
            const flatRows = [];

            rawRows.forEach(rawRow => {
                if (rawRow && typeof rawRow === 'object' && !Array.isArray(rawRow)) {
                    flatRows.push(rawRow);
                    return;
                }

                String(rawRow || '')
                    .split(/\r?\n/)
                    .map(part => part.replace(/\u00A0/g, ' ').trim())
                    .filter(Boolean)
                    .forEach(part => flatRows.push(part));
            });

            let inferredClass = fallbackClass || '';

            flatRows.forEach((entry, index) => {
                if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                    preparedRows.push({ type: 'object', raw: entry, inferredClass });
                    return;
                }

                const currentLine = String(entry || '').trim();
                if (!currentLine) return;

                const previousLine = typeof flatRows[index - 1] === 'string' ? flatRows[index - 1] : '';
                const nextLine = typeof flatRows[index + 1] === 'string' ? flatRows[index + 1] : '';
                const classHeader = detectClassHeaderLine(currentLine);
                if (classHeader) {
                    inferredClass = classHeader;
                    preparedRows.push({ type: 'class-header', raw: currentLine, className: classHeader });
                    return;
                }

                if (isImportRosterHeaderLine(currentLine)) return;
                if (isImportDateOrPhoneLine(currentLine)) return;
                if (isLikelyTeacherNameLine(currentLine, previousLine, nextLine)) return;

                const candidates = splitImportedRosterCandidates(currentLine);
                if (!candidates.length) {
                    preparedRows.push({ type: 'line', raw: currentLine, text: currentLine, inferredClass });
                    return;
                }

                candidates.forEach(candidate => {
                    if (isImportRosterHeaderLine(candidate) || isImportDateOrPhoneLine(candidate)) return;
                    preparedRows.push({
                        type: 'line',
                        raw: currentLine,
                        text: candidate,
                        inferredClass
                    });
                });
            });

            return preparedRows;
        }

        function isTeacherLikeLine(value) {
            const normalized = normalizeImportKey(value);
            return /\b(prof|profa|professor|professora|diretor|diretora|coordenador|coordenadora|secretario|secretaria|orientador|orientadora|docente|gestor|gestora)\b/.test(normalized);
        }

        function detectClassHeaderLine(value) {
            const resolvedClass = resolveImportedClass(value, '');
            if (!resolvedClass) return '';

            const residualText = sanitizeImportedName(
                String(value || '')
                    .replace(new RegExp(escapeRegex(resolvedClass), 'ig'), ' ')
                    .replace(/^\s*(turma|classe|sala|ano|serie|série)\s*[:\-]?\s*/i, ' ')
            );

            if (!residualText) return resolvedClass;
            if (residualText.length <= 4) return resolvedClass;
            if (/^(turma|classe|sala|ano|serie|série)$/i.test(normalizeImportKey(residualText))) return resolvedClass;

            return '';
        }

        function looksLikeStudentName(value) {
            const name = sanitizeImportedName(value);
            const normalized = normalizeImportKey(name);
            const candidate = scoreImportedNameCandidate(name);
            const bestCandidate = findBestStudentNameCandidate(value);

            if (bestCandidate && bestCandidate.weightedScore >= 6) return true;

            if (!name || name.length < 4) return false;
            if (!/[a-zA-ZÀ-ÿ]/.test(name)) return false;
            if (hasPhoneLikePattern(value) || hasPhoneLikePattern(name)) return false;
            if (/[@/\\]|https?:|www\./i.test(name)) return false;
            if (isTeacherLikeLine(name)) return false;
            if (/\b(rg|cpf|matricula|matrícula|responsavel|responsável|telefone|email|endereco|endereço|professor|diretor|admin|dev|saldo|historico|histórico|configuracao|configuração|lista|relacao|relação|turma|classe|aee)\b/i.test(normalized)) return false;

            const digitCount = (name.match(/\d/g) || []).length;
            if (digitCount > 2) return false;

            const significantWords = candidate.significantWords;
            if (significantWords.length < 2 || significantWords.length > 8) return false;
            if (significantWords.some(word => IMPORT_FORBIDDEN_NAME_TERMS.has(normalizeImportKey(word)))) return false;
            if (significantWords.some(word => normalizeImportToken(word).length < 2)) return false;

            return isLikelyBrazilianFullName(name) || candidate.score >= 6 || significantWords.filter(word => normalizeImportToken(word).length > 2).length >= 2;
        }

        function isManualImportNameReady(value) {
            const name = sanitizeImportedName(value);
            const normalized = normalizeImportKey(name);
            const candidate = scoreImportedNameCandidate(name);
            const bestCandidate = findBestStudentNameCandidate(value);

            if (bestCandidate && bestCandidate.weightedScore >= 5) return true;

            if (!name || name.length < 4) return false;
            if (!/[a-zA-ZÀ-ÿ]/.test(name)) return false;
            if (hasPhoneLikePattern(value) || hasPhoneLikePattern(name)) return false;
            if (/[@/\\]|https?:|www\./i.test(name)) return false;
            if (isTeacherLikeLine(name)) return false;
            if (candidate.significantWords.length < 2 || candidate.significantWords.length > 8) return false;
            if (candidate.significantWords.some(word => IMPORT_FORBIDDEN_NAME_TERMS.has(normalizeImportKey(word)))) return false;
            if (candidate.significantWords.some(word => normalizeImportToken(word).length < 2)) return false;
            if (/\b(rg|cpf|matricula|matrícula|responsavel|responsável|telefone|email|endereco|endereço|professor|diretor|admin|dev|saldo|historico|histórico|configuracao|configuração|lista|relacao|relação|turma|classe|aee)\b/i.test(normalized)) return false;

            if (looksLikeStudentName(name)) return true;

            const substantialWords = candidate.significantWords.filter(word => normalizeImportToken(word).length >= 3);
            return substantialWords.length >= 2;
        }

        function isImportEntryReadyForConfirmation(name, className) {
            const resolvedClass = resolveImportedClass(className, className);
            if (!FIXED_CLASSES.includes(resolvedClass)) return false;
            return isManualImportNameReady(name);
        }

        function buildRejectedImportEntry(raw, reason, inferredClass = '') {
            return {
                raw: String(raw || '').trim(),
                reason,
                inferredClass: resolveImportedClass(inferredClass, inferredClass)
            };
        }

        function buildManualImportCandidate(raw, fallbackClass = '') {
            const resolvedClass = resolveImportedClass(raw, fallbackClass || '');
            const extractedCandidate = findBestStudentNameCandidate(raw);
            const cleanedName = sanitizeImportedName(
                String(raw || '')
                    .replace(new RegExp(escapeRegex(resolvedClass || ''), 'ig'), ' ')
                    .replace(/^\s*(turma|classe|sala|ano|serie|série|aluno|nome)\s*[:\-]?\s*/i, ' ')
                    .replace(/^\s*[\d]+[.)\-:\s]+/, ' ')
            );
            const candidate = extractedCandidate || scoreImportedNameCandidate(cleanedName);
            const resolvedFallbackClass = resolveImportedClass(fallbackClass, fallbackClass);
            const selectedClass = resolvedClass || resolvedFallbackClass || '';
            const suggested = candidate.score >= 7;
            const confidence = candidate.score >= 10 ? 'alta' : candidate.score >= 7 ? 'média' : 'baixa';

            return {
                name: candidate.name || cleanedName,
                class: selectedClass,
                aee: parseImportedAee(raw),
                selected: suggested && FIXED_CLASSES.includes(selectedClass),
                suggested,
                confidence,
                score: candidate.score
            };
        }

        function normalizeImportedStudentRecord(rawRecord, fallbackClass = '') {
            const lowerCaseKeys = Object.keys(rawRecord || {}).reduce((acc, key) => {
                acc[normalizeImportKey(key)] = rawRecord[key];
                return acc;
            }, {});

            const explicitName = String(
                lowerCaseKeys['nome'] ||
                lowerCaseKeys['aluno'] ||
                lowerCaseKeys['estudante'] ||
                lowerCaseKeys['name'] ||
                ''
            );

            const fallbackNameField = Object.entries(lowerCaseKeys)
                .filter(([key, fieldValue]) => {
                    if (!String(fieldValue || '').trim()) return false;
                    return !/(turma|classe|sala|aee|especial|telefone|contato|email|endereco|endereço|matricula|matrícula|codigo|c[oó]digo|id|data|idade|sexo)/i.test(key);
                })
                .map(([, fieldValue]) => String(fieldValue || ''))
                .find(fieldValue => findBestStudentNameCandidate(fieldValue));

            const bestNameCandidate = findBestStudentNameCandidate(explicitName || fallbackNameField || Object.values(lowerCaseKeys).join(' | '));
            const name = bestNameCandidate ? bestNameCandidate.name : sanitizeImportedName(explicitName);

            const className = resolveImportedClass(String(
                lowerCaseKeys['turma'] ||
                lowerCaseKeys['classe'] ||
                lowerCaseKeys['sala'] ||
                lowerCaseKeys['class'] ||
                fallbackClass ||
                ''
            ).trim(), fallbackClass);

            const aee = parseImportedAee(
                lowerCaseKeys['aee'] ||
                lowerCaseKeys['atendimento especial'] ||
                lowerCaseKeys['especial'] ||
                lowerCaseKeys['atendimentoeducacionalespecializado'] ||
                explicitName ||
                fallbackNameField ||
                Object.values(lowerCaseKeys).join(' | ') ||
                ''
            );

            if (!name) return null;
            if (!looksLikeStudentName(name)) return null;
            if (className && !FIXED_CLASSES.includes(className)) return null;

            return createImportedStudent(name, className, aee);
        }

        function parseStudentLineFromText(line, fallbackClass = '', currentClass = '') {
            const rawLine = String(line || '');
            const hasAee = parseImportedAee(rawLine);
            const cleanedLine = stripImportedStatusAnnotations(rawLine)
                .replace(/(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9?\d{4})[-.\s]?\d{4}/g, ' ')
                .replace(/^\s*[\d]+[.)\-:\s]+/, '')
                .replace(/^[•\-–—\s]+/, '')
                .trim();

            if (!cleanedLine) return null;
            if (/^(nome|aluno|turma|classe|aee|lista|relacao|relação|matricula|matrícula|responsavel|responsável|telefone|email)/i.test(cleanedLine)) return null;
            if (isTeacherLikeLine(cleanedLine)) return null;

            const classHeader = detectClassHeaderLine(cleanedLine);
            if (classHeader) {
                return { type: 'class-header', className: classHeader };
            }

            let detectedClass = findImportedClassInText(cleanedLine) || currentClass || fallbackClass;
            let detectedName = cleanedLine;
            const bestCandidate = findBestStudentNameCandidate(cleanedLine);

            const separators = ['\t', ';', '|', ' - ', ' – ', ' — ', ','];
            for (const separator of separators) {
                if (!cleanedLine.includes(separator)) continue;
                const parts = cleanedLine.split(separator).map(part => part.trim()).filter(Boolean);
                if (parts.length === 0) continue;
                const explicitClass = parts.find(part => resolveImportedClass(part) || findImportedClassInText(part));
                if (explicitClass && !detectedClass) {
                    detectedClass = resolveImportedClass(explicitClass) || findImportedClassInText(explicitClass);
                }
                const namePart = parts
                    .filter(part => part !== explicitClass && !parseImportedAee(part))
                    .map(part => findBestStudentNameCandidate(part)?.name || stripImportNoise(part))
                    .find(Boolean);
                if (namePart) {
                    detectedName = namePart;
                    break;
                }
            }

            if (detectedClass) {
                detectedName = detectedName
                    .replace(new RegExp(escapeRegex(detectedClass), 'ig'), ' ')
                    .replace(/\bAEE\b/ig, ' ')
                    .replace(/\b(sim|nao|não|true|false)\b/ig, ' ')
                    .replace(/[;|,–—-]+/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
            }

            detectedName = bestCandidate?.name || sanitizeImportedName(detectedName);

            if (!detectedName) return null;
            if (isTeacherLikeLine(detectedName)) return null;
            if (!looksLikeStudentName(detectedName)) return null;
            if (detectedClass && !FIXED_CLASSES.includes(detectedClass)) return null;

            return createImportedStudent(detectedName, detectedClass, hasAee);
        }

        function analyzeImportedStudentRows(rawRows, fallbackClass = '') {
            const accepted = [];
            const rejected = [];
            let currentClass = fallbackClass || '';

            preprocessImportedStudentRows(rawRows, fallbackClass).forEach(entry => {
                if (entry && entry.type === 'class-header') {
                    currentClass = entry.className;
                    return;
                }

                if (entry && entry.type === 'object') {
                    const normalized = normalizeImportedStudentRecord(entry.raw, fallbackClass);
                    if (normalized) {
                        accepted.push(normalized);
                    } else {
                        rejected.push(buildRejectedImportEntry(JSON.stringify(entry.raw), 'Registro sem nome de aluno reconhecido ou turma compatível', currentClass || fallbackClass));
                    }
                    return;
                }

                const rawText = entry && entry.type === 'line' ? entry.text : entry;
                const parsed = parseStudentLineFromText(rawText, fallbackClass, entry.inferredClass || currentClass);

                if (parsed) {
                    accepted.push(parsed);
                } else if (String(rawText || '').trim()) {
                    rejected.push(buildRejectedImportEntry(rawText, 'Linha não reconhecida como aluno', entry.inferredClass || currentClass || fallbackClass));
                }
            });

            return { accepted, rejected };
        }

        function mergeImportedStudents(importedStudents) {
            const existingKeys = new Set(MOCK_STUDENTS.map(student => `${normalizeImportKey(student.name)}::${normalizeImportKey(student.class)}`));
            const seenImported = new Set();
            let nextId = Math.max(...MOCK_STUDENTS.map(student => student.id), 0) + 1;
            const added = [];
            const skipped = [];

            importedStudents.forEach(student => {
                const uniqueKey = `${normalizeImportKey(student.name)}::${normalizeImportKey(student.class)}`;
                if (existingKeys.has(uniqueKey) || seenImported.has(uniqueKey)) {
                    skipped.push(student);
                    return;
                }

                const completeStudent = {
                    id: nextId++,
                    name: student.name,
                    class: student.class,
                    balance: 0,
                    aee: Boolean(student.aee),
                    weekCredits: 0,
                    banned: false,
                    banCount: 0,
                    banRelatedToFairDate: ''
                };

                MOCK_STUDENTS.push(completeStudent);
                added.push(completeStudent);
                existingKeys.add(uniqueKey);
                seenImported.add(uniqueKey);
            });

            return { added, skipped };
        }

        function loadExternalScript(sources, label = 'dependência externa', isReady = () => false) {
            return new Promise((resolve, reject) => {
                const sourceList = Array.isArray(sources) ? sources : [sources];

                if (isReady()) {
                    console.log('[IMPORT] Dependência já disponível:', label);
                    resolve();
                    return;
                }

                const tryLoadSource = (index) => {
                    if (isReady()) {
                        console.log('[IMPORT] Dependência confirmada:', label);
                        resolve();
                        return;
                    }

                    if (index >= sourceList.length) {
                        reject(new Error(`Falha ao carregar ${label}. Verifique sua conexão ou bloqueio de CDN.`));
                        return;
                    }

                    const src = sourceList[index];
                    const existingScript = document.querySelector(`script[src="${src}"]`);
                    const handleFallback = (reason) => {
                        console.warn('[IMPORT] Falha ao carregar fonte da dependência', { label, src, reason });
                        tryLoadSource(index + 1);
                    };

                    if (existingScript) {
                        if (existingScript.dataset.loaded === 'true') {
                            console.log('[IMPORT] Script já marcado como carregado:', src);
                            resolve();
                            return;
                        }

                        setTimeout(() => {
                            if (isReady()) {
                                existingScript.dataset.loaded = 'true';
                                console.log('[IMPORT] Script existente confirmado após verificação:', src);
                                resolve();
                            } else {
                                handleFallback('script presente, mas global indisponível');
                            }
                        }, 120);
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = src;
                    script.async = true;
                    script.onload = () => {
                        if (isReady()) {
                            script.dataset.loaded = 'true';
                            console.log('[IMPORT] Script carregado dinamicamente:', src);
                            resolve();
                        } else {
                            handleFallback('script carregou, mas global não foi registrado');
                        }
                    };
                    script.onerror = () => handleFallback('erro de rede/CDN');
                    document.head.appendChild(script);
                };

                tryLoadSource(0);
            });
        }

        async function ensureStudentImportDependencies(extension) {
            console.log('[IMPORT] Verificando dependências para extensão:', extension);
            if ((extension === 'xlsx' || extension === 'xls') && typeof XLSX === 'undefined') {
                await loadExternalScript([
                    'vendor/xlsx.min.js',
                    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
                    'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js'
                ], 'biblioteca Excel', () => typeof XLSX !== 'undefined');
            }

            if (extension === 'docx' && typeof mammoth === 'undefined') {
                await loadExternalScript([
                    'vendor/mammoth.browser.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js',
                    'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js',
                    'https://unpkg.com/mammoth@1.8.0/mammoth.browser.min.js'
                ], 'biblioteca Word', () => typeof mammoth !== 'undefined');
            }

            if (extension === 'pdf' && typeof pdfjsLib === 'undefined') {
                await loadExternalScript([
                    'vendor/pdf.min.js',
                    'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
                    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
                ], 'biblioteca PDF', () => typeof pdfjsLib !== 'undefined');
            }

            if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
            }

            console.log('[IMPORT] Dependências prontas', {
                xlsx: typeof XLSX !== 'undefined',
                mammoth: typeof mammoth !== 'undefined',
                pdfjs: typeof pdfjsLib !== 'undefined'
            });
        }

        function extractStudentsFromExcelSheet(sheet, fallbackClass = '') {
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
            const analysis = analyzeImportedStudentRows(rows, fallbackClass);
            console.log('[IMPORT] Excel analisado', {
                rows: rows.length,
                accepted: analysis.accepted.length,
                rejected: analysis.rejected.length
            });
            return analysis;
        }

        async function extractStudentsFromWord(file, fallbackClass = '') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const lines = result.value.split(/\r?\n/);
            const analysis = analyzeImportedStudentRows(lines, fallbackClass);
            console.log('[IMPORT] Word analisado', {
                lines: lines.length,
                accepted: analysis.accepted.length,
                rejected: analysis.rejected.length
            });
            return analysis;
        }

        async function extractStudentsFromText(file, fallbackClass = '') {
            const text = await file.text();
            const lines = text.split(/\r?\n/);
            const analysis = analyzeImportedStudentRows(lines, fallbackClass);
            console.log('[IMPORT] TXT analisado', {
                lines: lines.length,
                accepted: analysis.accepted.length,
                rejected: analysis.rejected.length
            });
            return analysis;
        }

        async function extractStudentsFromPdf(file, fallbackClass = '') {
            const typedArray = new Uint8Array(await file.arrayBuffer());
            const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
            const lines = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                const page = await pdf.getPage(pageNumber);
                const textContent = await page.getTextContent();
                const lineBuckets = [];

                textContent.items
                    .filter(item => String(item.str || '').trim())
                    .forEach(item => {
                        const posY = Math.round(item.transform[5]);
                        const posX = item.transform[4];
                        let bucket = lineBuckets.find(entry => Math.abs(entry.y - posY) <= 2);

                        if (!bucket) {
                            bucket = { y: posY, items: [] };
                            lineBuckets.push(bucket);
                        }

                        bucket.items.push({ x: posX, text: String(item.str).trim() });
                    });

                lineBuckets
                    .sort((a, b) => b.y - a.y)
                    .forEach(bucket => {
                        const lineText = bucket.items
                            .sort((a, b) => a.x - b.x)
                            .map(entry => entry.text)
                            .join(' ')
                            .replace(/\s{2,}/g, ' ')
                            .trim();

                        if (lineText) {
                            lines.push(lineText);
                        }
                    });
            }

            const analysis = analyzeImportedStudentRows(lines, fallbackClass);
            console.log('[IMPORT] PDF analisado', {
                lines: lines.length,
                accepted: analysis.accepted.length,
                rejected: analysis.rejected.length
            });
            return analysis;
        }

        async function extractStudentsFromImportedFile(file, fallbackClass = '') {
            const extension = file.name.split('.').pop().toLowerCase();
            console.log('[IMPORT] Iniciando leitura do arquivo', {
                fileName: file.name,
                extension,
                size: file.size,
                fallbackClass: fallbackClass || '(sem turma padrão)'
            });
            await ensureStudentImportDependencies(extension);

            if (extension === 'xlsx' || extension === 'xls') {
                const arrayBuffer = await file.arrayBuffer();
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
                const preferredSheet = workbook.Sheets['Alunos'] || workbook.Sheets[workbook.SheetNames[0]];
                return extractStudentsFromExcelSheet(preferredSheet, fallbackClass);
            }

            if (extension === 'docx') {
                return extractStudentsFromWord(file, fallbackClass);
            }

            if (extension === 'pdf') {
                return extractStudentsFromPdf(file, fallbackClass);
            }

            if (extension === 'txt') {
                return extractStudentsFromText(file, fallbackClass);
            }

            throw new Error('Formato não suportado para importação de alunos. Use Excel, Word, PDF ou TXT.');
        }

        function openStudentImportPreview(result, fileName) {
            console.log('[IMPORT] Abrindo pré-visualização', {
                fileName,
                accepted: result.accepted.length,
                rejected: result.rejected.length
            });
            const fallbackClass = window.studentImportDefaultClass || '';
            window.pendingStudentImport = {
                fileName,
                currentStep: result.accepted.length > 0 ? 'accepted' : 'rejected',
                accepted: result.accepted.map((student, index) => ({
                    ...student,
                    previewId: typeof student.previewId === 'number' ? student.previewId : index,
                    selected: typeof student.selected === 'boolean' ? student.selected : Boolean(student.class),
                    name: sanitizeImportedName(student.name),
                    class: resolveImportedClass(student.class, student.class),
                    aee: Boolean(student.aee)
                })),
                rejected: result.rejected.map((item, index) => ({
                    ...item,
                    rejectedId: typeof item.rejectedId === 'number' ? item.rejectedId : index,
                    manual: item.manual || buildManualImportCandidate(item.raw, item.inferredClass || fallbackClass)
                }))
            };

            renderStudentImportPreview(true);
        }

        function setModalContent(contentHtml, resetScroll = false) {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            const shell = modal.querySelector('.modal-scroll-shell');
            content.innerHTML = contentHtml;
            if (resetScroll) {
                if (shell) shell.scrollTop = 0;
                content.scrollTop = 0;
            }
            initIcons();
            applyAutofillGuards(content);
            enhanceInteractiveElements(content);
        }

        function getStudentImportScrollState() {
            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            const shell = modal ? modal.querySelector('.modal-scroll-shell') : null;
            const stageList = content ? content.querySelector('.student-import-stage-list') : null;

            return {
                shellTop: shell ? shell.scrollTop : 0,
                contentTop: content ? content.scrollTop : 0,
                stageTop: stageList ? stageList.scrollTop : 0
            };
        }

        function restoreStudentImportScrollState(scrollState) {
            if (!scrollState) return;

            const modal = document.getElementById('global-modal');
            const content = document.getElementById('global-modal-content');
            const shell = modal ? modal.querySelector('.modal-scroll-shell') : null;
            const stageList = content ? content.querySelector('.student-import-stage-list') : null;

            requestAnimationFrame(() => {
                if (shell) shell.scrollTop = scrollState.shellTop || 0;
                if (content) content.scrollTop = scrollState.contentTop || 0;
                if (stageList) stageList.scrollTop = scrollState.stageTop || 0;
            });
        }

        function renderStudentImportPreview(resetScroll = false) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            setModalBackdropHandler(requestCancelStudentImport);
            const previousScrollState = resetScroll ? null : getStudentImportScrollState();
            const suggestedRejectedCount = pendingImport.rejected.filter(item => item.manual.suggested).length;
            const selectedRejectedSuggestions = pendingImport.rejected.filter(item => item.manual.suggested && item.manual.selected).length;
            const selectedAcceptedCount = pendingImport.accepted.filter(student => student.selected).length;
            const selectedRejectedCount = pendingImport.rejected.filter(item => item.manual.selected).length;
            const acceptedMissingClassCount = pendingImport.accepted.filter(student => !student.class).length;
            const totalAttentionCount = acceptedMissingClassCount + pendingImport.rejected.length;

            const currentStep = pendingImport.currentStep === 'rejected' ? 'rejected' : 'accepted';
            const previewRows = pendingImport.accepted.map(student => `
                ${(() => {
                    const source = resolveImportRecognitionSource(student.name, 'auto');
                    return `
                <div class="student-import-card student-import-card-surface p-3 space-y-3 ${student.selected ? '' : 'opacity-70'}">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap gap-2 mb-2">
                                <span class="student-import-pill">Detectado</span>
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${source.tone}">${source.label}</span>
                                ${!student.class ? '<span class="px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest">Turma pendente</span>' : ''}
                                ${student.class ? `<span class="student-import-pill">${student.class}</span>` : ''}
                                ${student.aee ? '<span class="student-import-pill">AEE</span>' : ''}
                            </div>
                            <p class="text-xs text-slate-500 font-semibold">${!student.class ? 'Nome detectado com sucesso, mas a turma não foi encontrada no arquivo. Escolha a turma para liberar a confirmação.' : `${source.helper} Ajuste apenas se necessário.`}</p>
                        </div>
                        <label class="flex items-center gap-2 shrink-0">
                            <input type="checkbox" ${student.selected ? 'checked' : ''} onchange="toggleStudentImportSelection(${student.previewId}, this.checked)" class="w-4 h-4 accent-amber-500">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-amber-700">Selecionar</span>
                        </label>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value="${student.name.replace(/"/g, '&quot;')}" oninput="updateAcceptedImportName(${student.previewId}, this.value)" placeholder="Nome do aluno" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-700">
                        <select onchange="updateAcceptedImportClass(${student.previewId}, this.value)" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-700">
                            <option value="">Selecionar turma</option>
                            ${FIXED_CLASSES.map(className => `<option value="${className}" ${student.class === className ? 'selected' : ''}>${className}</option>`).join('')}
                        </select>
                    </div>
                    <label class="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aluno AEE</span>
                        <input type="checkbox" ${student.aee ? 'checked' : ''} onchange="updateAcceptedImportAee(${student.previewId}, this.checked)" class="w-4 h-4 accent-amber-500">
                    </label>
                </div>
            `; })()}
            `).join('');

            const rejectedRows = pendingImport.rejected.map(item => `
                ${(() => {
                    const source = resolveImportRecognitionSource(item.manual.name, 'manual');
                    return `
                <div class="student-import-card student-import-card-surface p-3 space-y-3 ${item.manual.selected ? '' : 'opacity-80'}">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1 space-y-2">
                            <div class="flex flex-wrap gap-2">
                                <span class="student-import-pill">Revisão manual</span>
                                <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${source.tone}">${source.label}</span>
                                ${item.manual.suggested ? `<span class="student-import-pill">Sugestão ${item.manual.confidence}</span>` : ''}
                                ${item.inferredClass ? `<span class="student-import-pill">${item.inferredClass}</span>` : ''}
                            </div>
                            <div class="student-import-note">${item.raw}</div>
                            <p class="text-[10px] text-red-500 uppercase tracking-widest">${item.reason}</p>
                            <p class="text-xs text-slate-500 font-semibold">${source.helper}</p>
                        </div>
                        <label class="flex items-center gap-2 shrink-0">
                            <input type="checkbox" ${item.manual.selected ? 'checked' : ''} onchange="toggleRejectedImportSelection(${item.rejectedId}, this.checked)" class="w-4 h-4 accent-amber-500">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-amber-700">Selecionar</span>
                        </label>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input type="text" value="${item.manual.name.replace(/"/g, '&quot;')}" oninput="updateRejectedImportName(${item.rejectedId}, this.value)" placeholder="Nome do aluno" class="w-full p-3 bg-white border border-red-100 rounded-xl outline-none text-sm font-medium text-slate-700">
                        <select onchange="updateRejectedImportClass(${item.rejectedId}, this.value)" class="w-full p-3 bg-white border border-red-100 rounded-xl outline-none text-sm font-medium text-slate-700">
                            <option value="">Selecionar turma</option>
                            ${FIXED_CLASSES.map(className => `<option value="${className}" ${item.manual.class === className ? 'selected' : ''}>${className}</option>`).join('')}
                        </select>
                    </div>
                    <label class="flex items-center justify-between p-3 bg-white border border-red-100 rounded-xl">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aluno AEE</span>
                        <input type="checkbox" ${item.manual.aee ? 'checked' : ''} onchange="updateRejectedImportAee(${item.rejectedId}, this.checked)" class="w-4 h-4 accent-amber-500">
                    </label>
                </div>
            `; })()}
            `).join('');

            const acceptedStepClass = currentStep === 'accepted' ? 'student-import-step-active' : '';
            const rejectedStepClass = currentStep === 'rejected' ? 'student-import-step-active' : '';
            const acceptedHeader = pendingImport.accepted.length
                ? `
                    <div class="student-import-stage-toolbar">
                        <button onclick="toggleAllStudentImportSelections(event, true)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Marcar Todos</button>
                        <button onclick="toggleAllStudentImportSelections(event, false)" class="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest">Desmarcar</button>
                    </div>
                ` : '';
            const rejectedHeader = pendingImport.rejected.length
                ? `
                    <div class="student-import-stage-toolbar">
                        ${suggestedRejectedCount ? `<button onclick="selectSuggestedRejectedImports(event)" class="px-3 py-1.5 bg-amber-500 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-widest">Selecionar Sugeridos</button>` : ''}
                        <button onclick="toggleAllRejectedImportSelections(event, true)" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest">Marcar Todos</button>
                        <button onclick="toggleAllRejectedImportSelections(event, false)" class="px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-widest">Desmarcar</button>
                    </div>
                ` : '';
            const stageHeader = currentStep === 'accepted'
                ? `
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etapa 1 de ${pendingImport.rejected.length ? '2' : '1'}</p>
                        <h4 class="text-base font-black text-slate-800 uppercase tracking-tight mt-1">Detectados Automaticamente</h4>
                        <p class="text-sm text-slate-500 mt-1">Os nomes já entram prontos. Os selos mostram a origem da detecção e destacam qualquer turma pendente.</p>
                    </div>
                    ${acceptedHeader}
                `
                : `
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etapa 2 de 2</p>
                        <h4 class="text-base font-black text-slate-800 uppercase tracking-tight mt-1">Não Elegíveis</h4>
                        <p class="text-sm text-slate-500 mt-1">Aqui ficam só as linhas ambíguas. Os selos ajudam a entender por que cada recuperação foi sugerida.</p>
                        ${suggestedRejectedCount ? `<p class="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-2">${selectedRejectedSuggestions} de ${suggestedRejectedCount} sugestões automáticas marcadas</p>` : ''}
                    </div>
                    ${rejectedHeader}
                `;
            const stageList = currentStep === 'accepted'
                ? (previewRows || '<div class="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 font-bold">Nenhum aluno detectado automaticamente.</div>')
                : (rejectedRows || '<div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500 font-semibold">Nenhum item não elegível nesta importação.</div>');
            const footerActions = currentStep === 'accepted'
                ? `<button onclick="requestCancelStudentImport()" class="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest border border-slate-200">Cancelar</button>${pendingImport.rejected.length ? `<button onclick="goToRejectedImportStep(event)" class="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest border border-slate-200">${suggestedRejectedCount ? 'Revisar Sugestões' : 'Revisar Ignorados'}</button>` : ''}
                    <button onclick="confirmStudentImport()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Confirmar Importação</button>`
                : `<button onclick="requestCancelStudentImport()" class="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest border border-slate-200">Cancelar</button>${pendingImport.accepted.length ? `<button onclick="goToAcceptedImportStep(event)" class="flex-1 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest border border-slate-200">Voltar</button>` : ''}
                    <button onclick="confirmStudentImport()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Confirmar Importação</button>`;

            const contentHtml = `
                <div class="student-import-shell">
                    <section class="student-import-hero">
                        <div class="student-import-hero-head">
                            <div>
                                <p class="text-[10px] text-amber-700 font-bold uppercase tracking-[0.28em]">Importação Inteligente</p>
                                <h3 class="font-black text-slate-800 text-xl uppercase tracking-tight mt-2">Revise e confirme a lista</h3>
                                <p class="text-sm text-slate-500 mt-2 break-all">${pendingImport.fileName}</p>
                                <p class="text-xs text-slate-500 font-semibold mt-3">Confirme o que já está correto e use a etapa 2 apenas para os casos realmente ambíguos.</p>
                            </div>
                            <div class="student-import-toolbar">
                                <span class="student-import-pill">${currentStep === 'accepted' ? 'Etapa 1' : 'Etapa 2'}</span>
                                ${totalAttentionCount ? `<span class="student-import-pill">${totalAttentionCount} atenção</span>` : ''}
                                ${suggestedRejectedCount ? `<span class="student-import-pill">${selectedRejectedSuggestions}/${suggestedRejectedCount} sugestões</span>` : ''}
                                ${canAccessDeveloperTools() ? `<button type="button" onclick="openLearnedImportNamesModal(true)" class="student-import-pill border-0">Base ${LEARNED_IMPORT_NAMES.length}</button>` : ''}
                                <button type="button" onclick="requestCancelStudentImport()" class="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Cancelar importação">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                        </div>
                        <div class="student-import-summary">
                            <div class="student-import-metric bg-green-50 border-green-100">
                                <p class="text-[10px] text-green-600 font-bold uppercase tracking-widest">Detectados</p>
                                <p class="text-2xl font-black text-green-700 mt-2">${pendingImport.accepted.length}</p>
                                <p class="text-xs text-green-700/80 mt-1">${selectedAcceptedCount} marcados para entrar</p>
                            </div>
                            <div class="student-import-metric bg-red-50 border-red-100">
                                <p class="text-[10px] text-red-600 font-bold uppercase tracking-widest">Atenção</p>
                                <p class="text-2xl font-black text-red-700 mt-2">${totalAttentionCount}</p>
                                <p class="text-xs text-red-700/80 mt-1">${acceptedMissingClassCount} sem turma e ${pendingImport.rejected.length} ambíguos</p>
                            </div>
                            <div class="student-import-metric bg-blue-50 border-blue-100">
                                <p class="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Selecionados</p>
                                <p class="text-2xl font-black text-blue-700 mt-2">${selectedAcceptedCount + selectedRejectedCount}</p>
                                <p class="text-xs text-blue-700/80 mt-1">Prontos para confirmar</p>
                            </div>
                        </div>
                    </section>
                    <div class="student-import-stepper">
                        <button type="button" onclick="goToAcceptedImportStep(event)" class="student-import-step ${acceptedStepClass} ${pendingImport.accepted.length ? '' : 'opacity-60 cursor-not-allowed'}" ${pendingImport.accepted.length ? '' : 'disabled'}>
                            <span class="student-import-step-badge">1</span>
                            <div class="text-left">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etapa 1</p>
                                <p class="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">Detectados</p>
                                <p class="text-xs text-slate-500 mt-1">Lista pronta, revisão rápida e correção de turmas pendentes.</p>
                            </div>
                        </button>
                        <button type="button" onclick="goToRejectedImportStep(event)" class="student-import-step ${rejectedStepClass} ${pendingImport.rejected.length ? '' : 'opacity-60 cursor-not-allowed'}" ${pendingImport.rejected.length ? '' : 'disabled'}>
                            <span class="student-import-step-badge">2</span>
                            <div class="text-left">
                                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Etapa 2</p>
                                <p class="text-sm font-black text-slate-800 uppercase tracking-tight mt-1">Ambíguos</p>
                                <p class="text-xs text-slate-500 mt-1">Só o que precisa de conferência.</p>
                            </div>
                        </button>
                    </div>
                    <section class="student-import-stage">
                        <div class="student-import-stage-header">
                            ${stageHeader}
                        </div>
                        <div class="student-import-stage-list space-y-3">
                            ${stageList}
                        </div>
                    </section>
                    <div class="student-import-footer flex gap-3">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        ${footerActions}
                    </div>
                </div>
            `;

            const modal = document.getElementById('global-modal');
            if (modal.classList.contains('hidden')) {
                openModal(contentHtml);
                return;
            }

            setModalContent(contentHtml, resetScroll);
            restoreStudentImportScrollState(previousScrollState);
        }

        function goToAcceptedImportStep(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            pendingImport.currentStep = 'accepted';
            renderStudentImportPreview(true);
        }

        function goToRejectedImportStep(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport || !pendingImport.rejected.length) return;
            pendingImport.currentStep = 'rejected';
            renderStudentImportPreview(true);
        }

        function toggleStudentImportSelection(previewId, selected) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetStudent = pendingImport.accepted.find(student => student.previewId === previewId);
            if (targetStudent) {
                targetStudent.selected = selected;
                renderStudentImportPreview(false);
            }
        }

        function updateAcceptedImportName(previewId, value) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetStudent = pendingImport.accepted.find(student => student.previewId === previewId);
            if (targetStudent) targetStudent.name = value;
        }

        function updateAcceptedImportClass(previewId, value) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetStudent = pendingImport.accepted.find(student => student.previewId === previewId);
            if (targetStudent) {
                targetStudent.class = value;
                if (FIXED_CLASSES.includes(value)) targetStudent.selected = true;
            }
        }

        function updateAcceptedImportAee(previewId, checked) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetStudent = pendingImport.accepted.find(student => student.previewId === previewId);
            if (targetStudent) targetStudent.aee = checked;
        }

        function toggleRejectedImportSelection(rejectedId, selected) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetItem = pendingImport.rejected.find(item => item.rejectedId === rejectedId);
            if (targetItem) {
                targetItem.manual.selected = selected;
                renderStudentImportPreview(false);
            }
        }

        function updateRejectedImportName(rejectedId, value) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetItem = pendingImport.rejected.find(item => item.rejectedId === rejectedId);
            if (targetItem) targetItem.manual.name = value;
        }

        function updateRejectedImportClass(rejectedId, value) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetItem = pendingImport.rejected.find(item => item.rejectedId === rejectedId);
            if (targetItem) {
                targetItem.manual.class = value;
                if (FIXED_CLASSES.includes(value)) targetItem.manual.selected = true;
            }
        }

        function updateRejectedImportAee(rejectedId, checked) {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            const targetItem = pendingImport.rejected.find(item => item.rejectedId === rejectedId);
            if (targetItem) targetItem.manual.aee = checked;
        }

        function toggleAllStudentImportSelections(event, selected) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            pendingImport.accepted.forEach(student => {
                student.selected = selected;
            });
            renderStudentImportPreview(false);
        }

        function toggleAllRejectedImportSelections(event, selected) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;
            pendingImport.rejected.forEach(item => {
                item.manual.selected = selected;
                if (!item.manual.class) {
                    item.manual.class = window.studentImportDefaultClass || FIXED_CLASSES[0] || '';
                }
            });
            renderStudentImportPreview(false);
        }

        function selectSuggestedRejectedImports(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return;

            pendingImport.rejected.forEach(item => {
                if (!item.manual.suggested) return;
                if (!item.manual.class) {
                    item.manual.class = item.inferredClass || window.studentImportDefaultClass || FIXED_CLASSES[0] || '';
                }
                item.manual.selected = FIXED_CLASSES.includes(item.manual.class);
            });

            renderStudentImportPreview(false);
        }

        function collectManualEligibleStudents() {
            const pendingImport = window.pendingStudentImport;
            if (!pendingImport) return { valid: [], invalid: [] };

            const valid = [];
            const invalid = [];

            pendingImport.rejected.forEach(item => {
                if (!item.manual.selected) return;

                const normalizedName = sanitizeImportedName(item.manual.name);
                const resolvedClass = resolveImportedClass(item.manual.class, item.manual.class);

                if (!normalizedName || !isImportEntryReadyForConfirmation(normalizedName, resolvedClass)) {
                    invalid.push(item);
                    return;
                }

                valid.push(createImportedStudent(normalizedName, resolvedClass, item.manual.aee));
            });

            return { valid, invalid };
        }

        function resumeStudentImportPreview() {
            if (!window.pendingStudentImport) return;
            renderStudentImportPreview(true);
        }

        function closeImportRelatedModal() {
            if (window.learnedImportNamesReturnToImport && window.pendingStudentImport) {
                renderStudentImportPreview(true);
                return;
            }

            closeModal();
        }

        function executeCancelStudentImport() {
            const pendingImport = window.pendingStudentImport;
            window.pendingStudentImport = null;
            setModalBackdropHandler(null);
            if (pendingImport) {
                showToast(`Importação de ${pendingImport.fileName} cancelada.`, 'warning');
            }
        }

        function requestCancelStudentImport() {
            if (!window.pendingStudentImport) {
                closeModal();
                return;
            }

            setModalBackdropHandler(null);
            confirmAction(
                'Cancelar Importação',
                'Deseja realmente cancelar a importação? Todas as seleções e ajustes feitos na pré-visualização serão perdidos.',
                'executeCancelStudentImport',
                'resumeStudentImportPreview',
                true
            );
        }

        function confirmStudentImport() {
            if (!canImportStudents()) {
                showToast("Apenas admins e DEV podem importar alunos.", "error");
                return;
            }

            const pendingImport = window.pendingStudentImport;
            if (!pendingImport || !Array.isArray(pendingImport.accepted)) {
                showToast('Nenhuma importação pendente para confirmar.', 'error');
                return;
            }

            const invalidAcceptedStudents = [];
            const selectedStudents = pendingImport.accepted.reduce((accumulator, student) => {
                if (!student.selected) return accumulator;

                const normalizedName = sanitizeImportedName(student.name);
                const resolvedClass = resolveImportedClass(student.class, student.class);

                if (!normalizedName || !isImportEntryReadyForConfirmation(normalizedName, resolvedClass)) {
                    invalidAcceptedStudents.push(student);
                    return accumulator;
                }

                accumulator.push(createImportedStudent(normalizedName, resolvedClass, student.aee));
                return accumulator;
            }, []);
            const manualStudents = collectManualEligibleStudents();
            console.log('[IMPORT] Confirmando importação', {
                fileName: pendingImport.fileName,
                selected: selectedStudents.length,
                acceptedInvalid: invalidAcceptedStudents.length,
                manualSelected: manualStudents.valid.length,
                manualInvalid: manualStudents.invalid.length,
                accepted: pendingImport.accepted.length,
                rejected: pendingImport.rejected.length
            });

            if (invalidAcceptedStudents.length > 0) {
                showToast('Revise nome e turma dos alunos marcados na pré-visualização.', 'warning');
                return;
            }

            if (manualStudents.invalid.length > 0) {
                showToast('Revise nome e turma dos itens ignorados que foram marcados como elegíveis.', 'error');
                return;
            }

            if (selectedStudents.length === 0 && manualStudents.valid.length === 0) {
                showToast('Selecione ao menos um aluno na pré-visualização.', 'error');
                return;
            }

            const confirmedStudents = [...selectedStudents, ...manualStudents.valid];
            const learnedCount = confirmedStudents.reduce((total, student) => total + learnImportedNamePatterns(student.name, `Importação: ${pendingImport.fileName}`), 0);
            const { added, skipped } = mergeImportedStudents(confirmedStudents);

            if (added.length === 0) {
                showToast('Todos os alunos válidos da prévia já existem no sistema.', 'warning');
                return;
            }

            addHistory('Importação de Alunos', `${added.length} alunos foram importados do arquivo ${pendingImport.fileName}.${pendingImport.rejected.length ? ` ${pendingImport.rejected.length} linhas foram descartadas pelo filtro.` : ''}${skipped.length ? ` ${skipped.length} duplicados foram ignorados.` : ''}${learnedCount ? ` ${learnedCount} novos padrões de nome foram aprendidos.` : ''}`, 'creation');
            saveAllData();
            window.pendingStudentImport = null;
            closeModal();
            showToast(`${added.length} alunos importados com sucesso${skipped.length ? ` (${skipped.length} duplicados ignorados)` : ''}${learnedCount ? ` • ${learnedCount} nomes aprendidos` : ''}!`, 'success');
            if (currentTabView === 'students') switchTab('students');
        }

        async function importStudentListFile(event) {
            if (!canImportStudents()) {
                if (event?.target) event.target.value = '';
                window.studentImportDefaultClass = '';
                showToast("Apenas admins e DEV podem importar alunos.", "error");
                return;
            }

            const file = event.target.files[0];
            if (!file) {
                console.warn('[IMPORT] Seleção de arquivo cancelada pelo usuário');
                return;
            }

            const fallbackClass = window.studentImportDefaultClass || '';

            try {
                showToast(`Processando ${file.name}...`, 'success');
                console.log('[IMPORT] Arquivo selecionado', {
                    fileName: file.name,
                    type: file.type || '(sem mime)',
                    size: file.size
                });
                const importResult = await extractStudentsFromImportedFile(file, fallbackClass);

                if (importResult.accepted.length === 0) {
                    if (importResult.rejected.length > 0) {
                        console.warn('[IMPORT] Nenhum aluno aceito; exibindo rejeitados', {
                            rejected: importResult.rejected.length
                        });
                        openStudentImportPreview(importResult, file.name);
                    } else {
                        showToast('Nenhum aluno válido foi encontrado no arquivo.', 'error');
                    }
                    return;
                }

                openStudentImportPreview(importResult, file.name);
            } catch (error) {
                console.error('Erro ao importar lista de alunos:', error);
                showToast(error.message || 'Não foi possível importar a lista de alunos.', 'error');
            } finally {
                event.target.value = '';
                window.studentImportDefaultClass = '';
            }
        }

        function showLoginNotices() {
            openModal(`
                <div class="text-center mb-4">
                    <div class="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200"><i data-lucide="bell-ring" class="w-6 h-6"></i></div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Mural de Avisos</h3>
                </div>
                <div class="bg-gradient-to-br from-amber-50 via-white to-orange-50 border border-amber-200 p-4 rounded-2xl text-sm text-slate-800 space-y-3 mb-6 shadow-sm">
                    <p class="leading-relaxed"><strong class="text-amber-800">Direção:</strong> Boas-vindas ao painel Marimbondos Pay. Este sistema é uma ferramenta para gestão da feira escolar.</p>
                </div>
                <button onclick="closeModal()" class="w-full py-3 bg-slate-900 hover:bg-slate-800 transition text-white font-bold rounded-xl btn-bounce">Ciente</button>
            `);
        }

        // --- NOVAS FUNÇÕES DE CONFIGURAÇÃO, BACKUP E GESTÃO DE DADOS ---
        function exportBackup() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode exportar backups do sistema.', 'error');
                return;
            }

            const data = { settings: MOCK_SETTINGS, students: MOCK_STUDENTS, teachers: MOCK_TEACHERS, history: MOCK_HISTORY, studentHistoryArchive: MOCK_STUDENT_HISTORY_ARCHIVE, loginActivity: MOCK_LOGIN_ACTIVITY, notices: MOCK_NOTICES, storeItems: MOCK_STORE_ITEMS, learnedImportNames: LEARNED_IMPORT_NAMES };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `backup_marimbondos_${new Date().getTime()}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            console.log(`💾 BACKUP EXPORTADO: ${MOCK_STUDENTS.length} alunos, ${MOCK_TEACHERS.length} professores, ${MOCK_HISTORY.length} eventos histórico, ${MOCK_NOTICES.length} avisos`);
            showToast("Backup exportado com sucesso!", "success");
            addHistory("Backup do Sistema", "Ficheiro de backup gerado e transferido para o dispositivo.", 'creation');
        }

        function triggerImport() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode importar backups do sistema.', 'error');
                return;
            }

            document.getElementById('import-file').click();
        }

        function importBackup(event) {
            if (!canAccessDeveloperTools()) {
                if (event?.target) event.target.value = '';
                showToast('Apenas o DEV pode importar backups do sistema.', 'error');
                return;
            }

            const file = event.target.files[0];
            if(!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Verifica se o JSON é válido e é um objeto
                    if (data && typeof data === 'object') {
                        if(data.settings) MOCK_SETTINGS = mergeSettings(data.settings);
                        if(data.students) {
                            MOCK_STUDENTS = data.students;
                            normalizeAllStudents();
                        }
                        if(data.teachers) MOCK_TEACHERS = data.teachers;
                        if(data.history) MOCK_HISTORY = data.history.map(normalizeHistoryRecord).filter(Boolean);
                        MOCK_STUDENT_HISTORY_ARCHIVE = normalizeStudentHistoryArchive(data.studentHistoryArchive, MOCK_STUDENT_HISTORY_ARCHIVE);
                        MOCK_LOGIN_ACTIVITY = normalizeLoginActivityList(data.loginActivity || []);
                        if(data.notices) MOCK_NOTICES = data.notices;
                        if(data.storeItems) {
                            MOCK_STORE_ITEMS = normalizeAllStoreItems(data.storeItems);
                            storeItemCounter = Math.max(0, ...MOCK_STORE_ITEMS.map(item => item.id || 0)) + 1;
                        }
                        LEARNED_IMPORT_NAMES = Array.isArray(data.learnedImportNames) ? data.learnedImportNames : [];
                        syncLearnedImportNameCaches();
                        compactHistoryStorage();
                        
                        console.log(`📥 BACKUP IMPORTADO: ${MOCK_STUDENTS.length} alunos, ${MOCK_TEACHERS.length} professores, ${MOCK_HISTORY.length} eventos histórico, ${MOCK_NOTICES.length} avisos (arquivo: ${file.name})`);
                        showToast("Dados importados com sucesso!", "success");
                        addHistory("Restauração de Backup", "O sistema foi restaurado através de um ficheiro JSON.", 'edit');
                        switchTab('settings');
                    } else {
                        throw new Error("Formato de dados não reconhecido.");
                    }
                } catch(err) {
                    console.error("Erro ao importar ficheiro:", err);
                    showToast("Ficheiro inválido ou corrompido.", "error");
                } finally {
                    // Limpa o input para permitir importar o mesmo ficheiro novamente se necessário
                    event.target.value = '';
                }
            };
            reader.readAsText(file);
        }

        function exportExcel() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode exportar a base de dados.', 'error');
                return;
            }

            try {
                // Verificar se XLSX está carregado
                if (typeof XLSX === 'undefined') {
                    showToast("Biblioteca Excel não carregada. Por favor, recarregue a página.", "error");
                    console.error('XLSX library not loaded');
                    return;
                }
                
                console.log('Iniciando exportação Excel...');
                console.log('Estudantes:', MOCK_STUDENTS.length);
                console.log('Professores:', MOCK_TEACHERS.length);
                console.log('Avisos:', MOCK_NOTICES.length);
                console.log('Histórico:', MOCK_HISTORY.length);
                
                const studentsData = MOCK_STUDENTS.map(s => ({
                    'ID': s.id,
                    'Nome': s.name,
                    'Turma': s.class,
                    'Saldo (M$)': s.balance,
                    'AEE': s.aee,
                    'Créditos/Semana': s.weekCredits,
                    'Banido': s.banned ? 'Sim' : 'Não'
                }));

                const teachersData = MOCK_TEACHERS.map(t => ({
                    'Email': t.email,
                    'Nome': t.name,
                    'Cargo': t.role
                }));

                const noticesData = MOCK_NOTICES.map(n => ({
                    'ID': n.id,
                    'Título': n.title,
                    'Mensagem': n.message,
                    'Autor': n.authorName,
                    'Ativo': n.active ? 'Sim' : 'Não',
                    'Data': n.createdAt
                }));

                const settingsData = [{
                    'Chave': 'maxWeeklyCreditPerTeacher',
                    'Valor': MOCK_SETTINGS.maxWeeklyCreditPerTeacher
                }, {
                    'Chave': 'aeeWeeklyBonus',
                    'Valor': MOCK_SETTINGS.aeeWeeklyBonus
                }, {
                    'Chave': 'baseCreditPerStudent',
                    'Valor': MOCK_SETTINGS.baseCreditPerStudent
                }, {
                    'Chave': 'feiraDate',
                    'Valor': MOCK_SETTINGS.feiraDate
                }, {
                    'Chave': 'creditsFrozen',
                    'Valor': MOCK_SETTINGS.creditsFrozen ? 'Sim' : 'Não'
                }, {
                    'Chave': 'storeEnabledForUsers',
                    'Valor': MOCK_SETTINGS.storeEnabledForUsers ? 'Sim' : 'Não'
                }, {
                    'Chave': 'storeEnabledForDev',
                    'Valor': MOCK_SETTINGS.storeEnabledForDev ? 'Sim' : 'Não'
                }];

                const historyData = MOCK_HISTORY.map(h => ({
                    'ID': h.id || '',
                    'Título': h.title || '',
                    'Descrição': h.desc || '',
                    'Tipo': h.type || '',
                    'Autor': h.author || 'Sistema',
                    'Data': h.date || new Date().toLocaleDateString('pt-BR'),
                    'ID Aluno': h.studentId || '-'
                }));

                console.log('Dados preparados com sucesso');

                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(studentsData), "Alunos");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teachersData), "Professores");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(noticesData), "Avisos");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyData), "Histórico");
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(settingsData), "Configurações");

                console.log('Workbook criado com sucesso');

                const fileName = `database_marimbondos_${new Date().getTime()}.xlsx`;
                console.log('Iniciando download do arquivo:', fileName);
                XLSX.writeFile(wb, fileName);
                
                console.log('Arquivo enviado para download com sucesso');
                showToast("Base de dados exportada para Excel com sucesso!", "success");
                addHistory("Exportação Excel", "Database foi exportada em formato de planilha Excel.", 'creation');
            } catch(err) {
                console.error('Erro ao exportar Excel:', err);
                console.error('Stack:', err.stack);
                if (typeof XLSX === 'undefined') {
                    showToast("Biblioteca Excel não disponível. Recarregue a página e tente novamente.", "error");
                } else {
                    showToast("Erro ao exportar arquivo Excel: " + err.message, "error");
                }
            }
        }

        function importExcel() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode importar a base de dados.', 'error');
                return;
            }

            document.getElementById('import-excel-file').click();
        }

        function importExcelFile(event) {
            if (!canAccessDeveloperTools()) {
                if (event?.target) event.target.value = '';
                showToast('Apenas o DEV pode importar a base de dados.', 'error');
                return;
            }

            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Ler sheets
                    const studentsSheet = workbook.Sheets['Alunos'];
                    const teachersSheet = workbook.Sheets['Professores'];
                    const noticesSheet = workbook.Sheets['Avisos'];
                    const storeSheet = workbook.Sheets['Loja'];
                    const settingsSheet = workbook.Sheets['Configurações'];

                    // Importar Students se existir
                    if (studentsSheet) {
                        const students = XLSX.utils.sheet_to_json(studentsSheet).map(s => ({
                            id: s['ID'],
                            name: s['Nome'],
                            class: s['Turma'],
                            balance: Number(s['Saldo (M$)']) || 0,
                            aee: s['AEE'] || 'Não',
                            weekCredits: Number(s['Créditos/Semana']) || 0,
                            banned: s['Banido'] === 'Sim'
                        }));
                        MOCK_STUDENTS = students;
                        normalizeAllStudents();
                    }

                    // Importar Teachers se existir
                    if (teachersSheet) {
                        const teachers = XLSX.utils.sheet_to_json(teachersSheet).map(t => ({
                            email: t['Email'],
                            name: t['Nome'],
                            role: t['Cargo']
                        }));
                        MOCK_TEACHERS = teachers;
                    }

                    // Importar Notices se existir
                    if (noticesSheet) {
                        const notices = XLSX.utils.sheet_to_json(noticesSheet).map(n => ({
                            id: n['ID'],
                            title: n['Título'],
                            message: n['Mensagem'],
                            authorName: n['Autor'],
                            author: MOCK_USER.email, // Usar email do usuário atual
                            active: n['Ativo'] === 'Sim',
                            createdAt: n['Data']
                        }));
                        MOCK_NOTICES = notices;
                    }

                    if (storeSheet) {
                        MOCK_STORE_ITEMS = normalizeAllStoreItems(XLSX.utils.sheet_to_json(storeSheet).map(item => ({
                            id: item['ID'],
                            name: item['Nome'],
                            price: Number(item['Valor (M$)']) || 0,
                            quantity: Number(item['Quantidade']) || 0,
                            imageData: item['Imagem Base64'],
                            createdAt: item['Criado Em'],
                            updatedAt: item['Atualizado Em']
                        })));
                        storeItemCounter = Math.max(0, ...MOCK_STORE_ITEMS.map(item => item.id || 0)) + 1;
                    }

                    // Importar Settings se existir
                    if (settingsSheet) {
                        const settings = XLSX.utils.sheet_to_json(settingsSheet);
                        settings.forEach(s => {
                            if (s['Chave'] === 'maxWeeklyCreditPerTeacher') MOCK_SETTINGS.maxWeeklyCreditPerTeacher = Number(s['Valor']);
                            if (s['Chave'] === 'aeeWeeklyBonus') MOCK_SETTINGS.aeeWeeklyBonus = Number(s['Valor']);
                            if (s['Chave'] === 'baseCreditPerStudent') MOCK_SETTINGS.baseCreditPerStudent = Number(s['Valor']);
                            if (s['Chave'] === 'feiraDate') MOCK_SETTINGS.feiraDate = s['Valor'];
                            if (s['Chave'] === 'creditsFrozen') MOCK_SETTINGS.creditsFrozen = s['Valor'] === 'Sim';
                            if (s['Chave'] === 'storeEnabledForUsers') MOCK_SETTINGS.storeEnabledForUsers = s['Valor'] === 'Sim';
                            if (s['Chave'] === 'storeEnabledForDev') MOCK_SETTINGS.storeEnabledForDev = s['Valor'] === 'Sim';
                        });
                    }

                    showToast("Base de dados importada com sucesso!", "success");
                    addHistory("Importação Excel", "Database foi importada a partir de um ficheiro Excel.", 'edit');
                    switchTab('settings');
                } catch(err) {
                    console.error("Erro ao importar Excel:", err);
                    showToast("Ficheiro Excel inválido ou corrompido.", "error");
                } finally {
                    event.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }

        function promptClearHistory() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode limpar o histórico.', 'error');
                return;
            }

            confirmAction(
                "Limpar Histórico", 
                "Tem a certeza que deseja apagar TODO o histórico? Esta ação não pode ser desfeita.", 
                "executeClearHistory", 
                null, 
                true
            );
        }

        function executeClearHistory() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode limpar o histórico.', 'error');
                return;
            }

            MOCK_HISTORY = [];
            MOCK_STUDENT_HISTORY_ARCHIVE = {};
            MOCK_LOGIN_ACTIVITY = [];
            addHistory("Sistema", "O histórico completo foi limpo por um administrador.", 'deletion');
            saveAllData();
            showToast("Histórico apagado com sucesso.");
            if (currentTabView === 'settings') switchTab('settings');
        }

        function promptDeleteStudents() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode executar exclusões em massa.', 'error');
                return;
            }

            const cls = document.getElementById('danger-class-select').value;
            const msg = cls === 'all' ? "TODOS os alunos cadastrados" : `todos os alunos da turma ${cls}`;
            window.pendingDeleteClass = cls;
            confirmAction(
                "Apagar Alunos", 
                `ATENÇÃO: Tem a certeza que deseja apagar ${msg}? Esta ação é irreversível.`, 
                "executeDeleteStudents", 
                null, 
                true
            );
        }

        function executeDeleteStudents() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode executar exclusões em massa.', 'error');
                return;
            }

            const cls = window.pendingDeleteClass;
            if(cls === 'all') {
                MOCK_STUDENTS = [];
            } else {
                MOCK_STUDENTS = MOCK_STUDENTS.filter(s => s.class !== cls);
            }
            addHistory("Exclusão em Massa", `${cls === 'all' ? 'TODOS os alunos' : `alunos da turma ${cls}`} foram apagados do sistema.`, 'deletion');
            saveAllData();
            showToast("Alunos removidos com sucesso.");
            window.pendingDeleteClass = null;
            if (currentTabView === 'settings') switchTab('settings');
        }

        function promptFactoryReset() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode formatar o sistema.', 'error');
                return;
            }

            confirmAction(
                "Formatação Total", 
                "PERIGO EXTREMO: Isso apagará TODOS os alunos, professores e histórico (mantendo apenas o DEV). Tem a certeza absoluta?", 
                "executeFactoryReset", 
                null, 
                true
            );
        }

        function executeFactoryReset() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode formatar o sistema.', 'error');
                return;
            }

            MOCK_STUDENTS = [];
            MOCK_TEACHERS = MOCK_TEACHERS.filter(t => t.role.toLowerCase().includes('desenvolvedor') || t.role === 'dev');
            MOCK_HISTORY = [];
            MOCK_STUDENT_HISTORY_ARCHIVE = {};
            MOCK_LOGIN_ACTIVITY = [];
            MOCK_STORE_ITEMS = [];
            storeItemCounter = 1;
            addHistory("Reset de Fábrica", "Sistema totalmente redefinido. Apenas a conta DEV foi mantida.", 'deletion');
            saveAllData();
            showToast("Sistema formatado com sucesso.");
            if (currentTabView === 'settings') switchTab('settings');
        }

        // --- MINHA CONTA ---
        function openEditAccountModal() {
            const currentTeacher = getCurrentTeacherRecord();
            const allowBadgeEditing = MOCK_USER.roleType === 'dev';
            const accountBadges = getTeacherDisplayBadges(currentTeacher);

            openModal(`
                <div class="modal-form-shell">
                    <div class="mb-2">
                        <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Editar Dados Pessoais</h3>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atualize suas informações</p>
                    </div>
                    <div class="modal-form-body modal-scroll-region space-y-4">
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Nome Completo</label>
                        <input type="text" id="edit-account-name" value="${MOCK_USER.name}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">E-mail</label>
                        <input type="email" id="edit-account-email" value="${MOCK_USER.email}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700">
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-1 tracking-wider">Alterar Senha (4 Dígitos)</label>
                        <input type="password" id="edit-account-password" maxlength="4" inputmode="numeric" placeholder="Deixe em branco para manter" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false" data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-400 transition font-medium text-slate-700 text-center tracking-[0.3em]">
                    </div>
                    ${allowBadgeEditing ? `
                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 tracking-wider">Seus Badges</label>
                        ${buildTeacherBadgeSelector(accountBadges, 'account-teacher')}
                    </div>
                    ` : ''}
                    <div class="bg-blue-50 border border-blue-100 p-3 rounded-xl">
                        <p class="text-[10px] text-blue-600 font-bold">ℹ️ A senha deve conter 4 dígitos numéricos.</p>
                    </div>
                    </div>
                    <div class="flex gap-3 modal-form-actions">
                        <button onclick="closeModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">Cancelar</button>
                        <button onclick="saveAccountChanges()" class="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Salvar</button>
                    </div>
                </div>
            `);
        }

        function saveAccountChanges() {
            const newName = document.getElementById('edit-account-name').value.trim();
            const newEmail = document.getElementById('edit-account-email').value.trim();
            const newPassword = document.getElementById('edit-account-password').value;
            const newBadges = MOCK_USER.roleType === 'dev'
                ? getSelectedTeacherBadges('account-teacher')
                : null;

            if (!newName) { showToast("O nome não pode estar vazio.", "error"); return; }
            if (!newEmail) { showToast("O e-mail não pode estar vazio.", "error"); return; }
            if (!newEmail.includes('@')) { showToast("E-mail inválido.", "error"); return; }
            if (newPassword && (newPassword.length !== 4 || !/^\d+$/.test(newPassword))) { showToast("A senha deve conter exatamente 4 dígitos numéricos.", "error"); return; }

            // Se o e-mail mudou, verificar se já existe em outro usuário
            if (newEmail !== MOCK_USER.email) {
                const emailExists = MOCK_TEACHERS.find(t => t.email === newEmail && t.email !== MOCK_USER.email);
                if (emailExists) {
                    showToast("Este e-mail já está cadastrado.", "error");
                    return;
                }
            }

            const oldEmail = MOCK_USER.email;
            MOCK_USER.name = newName;
            MOCK_USER.email = newEmail;
            
            // Atualizar também em MOCK_TEACHERS
            const teacherIndex = MOCK_TEACHERS.findIndex(t => t.email === oldEmail);
            if (teacherIndex > -1) {
                MOCK_TEACHERS[teacherIndex].name = newName;
                MOCK_TEACHERS[teacherIndex].email = newEmail;
                if (Array.isArray(newBadges)) {
                    MOCK_TEACHERS[teacherIndex].badges = normalizeTeacherBadges(newBadges, MOCK_TEACHERS[teacherIndex].role);
                }
                if (newPassword) {
                    MOCK_TEACHERS[teacherIndex].password = newPassword;
                }
            }

            if (newPassword) {
                MOCK_USER.pin = newPassword;
                showToast("Dados e senha alterados com sucesso!", "success");
            } else {
                showToast("Dados alterados com sucesso!", "success");
            }

            // Atualizar nome na header
            document.getElementById('user-display-name').textContent = MOCK_USER.name;

            addHistory("Perfil Atualizado", "Dados da conta foram modificados.", 'edit');
            saveAllData();
            closeModal();
            switchTab('account');
        }

        function buildNavigation() {
            const navContainer = document.getElementById('nav-container');
            if (!navContainer) return;

            const userRole = getCurrentRoleType();
            const visibleTabs = getAvailableTabs(userRole);
            let html = '';
            visibleTabs.forEach(tab => {
                html += `
                    <button onclick="switchTab('${tab.id}')" id="tab-${tab.id}" class="flex-none sm:flex-1 min-w-[92px] sm:min-w-[110px] py-3 px-2 rounded-xl font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 border-2 border-transparent hover:border-amber-200 dark:hover:border-amber-500/30 active:scale-95 snap-center">
                        <i data-lucide="${tab.icon}" class="w-5 h-5 mb-1"></i> ${tab.label}
                    </button>
                `;
            });

            if (!html) {
                const fallbackTab = getFallbackTabId(userRole);
                html = `
                    <button onclick="switchTab('${fallbackTab}')" id="tab-${fallbackTab}" class="flex-none sm:flex-1 min-w-[92px] sm:min-w-[110px] py-3 px-2 rounded-xl font-bold text-[11px] transition-all flex flex-col items-center justify-center gap-1 text-slate-600 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 border-2 border-transparent hover:border-amber-200 dark:hover:border-amber-500/30 active:scale-95 snap-center">
                        <i data-lucide="layout-dashboard" class="w-5 h-5 mb-1"></i> Abrir Painel
                    </button>
                `;
            }

            navContainer.innerHTML = html;
            initIcons();
            enhanceInteractiveElements(navContainer);
        }

        function saveSettings() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode alterar as configurações do sistema.', 'error');
                return;
            }

            const maxCredit = parseFloat(document.getElementById('config-max-credit').value);
            const aeeBonus = parseFloat(document.getElementById('config-aee-bonus').value);
            const aeeCreditDay = parseInt(document.getElementById('config-aee-credit-day')?.value ?? 1);
            const feiraDate = document.getElementById('config-feira-date').value;
            const creditsFrozen = document.getElementById('config-freeze-credits').checked;
            const storeEnabledForUsers = document.getElementById('config-store-users').checked;
            const storeEnabledForDev = document.getElementById('config-store-dev').checked;

            if (isNaN(maxCredit) || maxCredit < 0) { showToast("Valor de limite semanal inválido.", "error"); return; }
            if (isNaN(aeeBonus) || aeeBonus < 0) { showToast("Valor de bônus AEE inválido.", "error"); return; }

            const oldSettings = { ...MOCK_SETTINGS };

            MOCK_SETTINGS.maxWeeklyCreditPerTeacher = maxCredit;
            MOCK_SETTINGS.aeeWeeklyBonus = aeeBonus;
            MOCK_SETTINGS.aeeCreditDay = aeeCreditDay;
            MOCK_SETTINGS.feiraDate = feiraDate;
            MOCK_SETTINGS.creditsFrozen = creditsFrozen;
            MOCK_SETTINGS.storeEnabledForUsers = storeEnabledForUsers;
            MOCK_SETTINGS.storeEnabledForDev = storeEnabledForDev;

            // Calcula próxima data de crédito AEE
            const today = new Date();
            let daysUntilNextCredit = aeeCreditDay - today.getDay();
            if (daysUntilNextCredit <= 0) daysUntilNextCredit += 7;
            const nextCreditDate = new Date(today);
            nextCreditDate.setDate(nextCreditDate.getDate() + daysUntilNextCredit);
            MOCK_SETTINGS.nextAEECreditDate = getLocalDateKey(nextCreditDate);

            if (oldSettings.feiraDate !== feiraDate) {
                localStorage.removeItem('marimbondos_last_fair_turnover_cycle');
            }

            console.log(`⚙️ CONFIGURAÇÕES ALTERADAS: Limite=${maxCredit}, BônusAEE=${aeeBonus}, DiaAEE=${aeeCreditDay}, NextAEE=${MOCK_SETTINGS.nextAEECreditDate}, Feira=${feiraDate}, Frozen=${creditsFrozen}, StorePub=${storeEnabledForUsers}, StoreDev=${storeEnabledForDev}`);
            addHistory("Configurações Alteradas", `As configurações do sistema foram atualizadas por ${MOCK_USER.name}.`, 'edit');
            saveAllData();
            applyLoginHolidayTheme(getCurrentThemeMode(), 'none');
            syncAndroidSeasonalAppIcon('none');
            if (appScreenReady && currentTabView) {
                refreshUI();
            }
            showToast("Configurações salvas com sucesso!", "success");
        }

        function refreshNextAEEDate() {
            const aeeCreditDay = parseInt(document.getElementById('config-aee-credit-day')?.value ?? MOCK_SETTINGS.aeeCreditDay ?? 1);
            const today = new Date();
            let daysUntilNextCredit = aeeCreditDay - today.getDay();
            if (daysUntilNextCredit <= 0) daysUntilNextCredit += 7;
            const nextCreditDate = new Date(today);
            nextCreditDate.setDate(nextCreditDate.getDate() + daysUntilNextCredit);
            MOCK_SETTINGS.nextAEECreditDate = getLocalDateKey(nextCreditDate);
            saveAllData();
            refreshUI();
            showToast(`Próximo crédito AEE: ${nextCreditDate.toLocaleDateString('pt-BR')}`, 'success');
        }

        function triggerAEEDistribution() {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode disparar o crédito AEE manualmente.', 'error');
                return;
            }

            if (MOCK_SETTINGS.aeeWeeklyBonus <= 0) {
                showToast('O bônus AEE está configurado como M$ 0. Configure um valor positivo primeiro.', 'warning');
                return;
            }

            if (!MOCK_STUDENTS.some(s => s.aee)) {
                showToast('Não há alunos com AEE cadastrados no sistema.', 'info');
                return;
            }

            const result = processAEEWeeklyCredits(true);
            if (result) {
                showToast('Créditos AEE distribuídos com sucesso para todos os alunos elegíveis!', 'success');
                saveAllData();
                if (appScreenReady && currentTabView) {
                    refreshUI();
                }
            } else {
                showToast('Não foi possível distribuir os créditos AEE neste momento.', 'warning');
            }
        }

        function saveCreditsFreezeSetting(checked) {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode alterar as configurações do sistema.', 'error');
                const freezeInput = document.getElementById('config-freeze-credits');
                if (freezeInput) freezeInput.checked = Boolean(MOCK_SETTINGS.creditsFrozen);
                return;
            }

            const normalizedChecked = Boolean(checked);
            if (MOCK_SETTINGS.creditsFrozen === normalizedChecked) {
                return;
            }

            MOCK_SETTINGS.creditsFrozen = normalizedChecked;
            addHistory(
                'Congelamento de Créditos',
                `${MOCK_USER.name} ${normalizedChecked ? 'ativou' : 'desativou'} o congelamento da distribuição de créditos.`,
                'edit'
            );
            saveAllData();
            showToast(`Congelamento de créditos ${normalizedChecked ? 'ativado' : 'desativado'} com sucesso!`, 'success');
        }

        function saveStoreVisibilitySetting(target, checked) {
            if (!canAccessDeveloperTools()) {
                showToast('Apenas o DEV pode alterar as configurações do sistema.', 'error');
                const targetInput = document.getElementById(target === 'dev' ? 'config-store-dev' : 'config-store-users');
                if (targetInput) {
                    targetInput.checked = target === 'dev'
                        ? Boolean(MOCK_SETTINGS.storeEnabledForDev)
                        : Boolean(MOCK_SETTINGS.storeEnabledForUsers);
                }
                return;
            }

            const normalizedChecked = Boolean(checked);
            const isDevTarget = target === 'dev';
            const settingsKey = isDevTarget ? 'storeEnabledForDev' : 'storeEnabledForUsers';

            if (Boolean(MOCK_SETTINGS[settingsKey]) === normalizedChecked) {
                return;
            }

            MOCK_SETTINGS[settingsKey] = normalizedChecked;
            addHistory(
                'Visibilidade da Loja',
                `${MOCK_USER.name} ${normalizedChecked ? 'ativou' : 'desativou'} a loja para ${isDevTarget ? 'a conta DEV' : 'professores e administradores'}.`,
                'edit'
            );
            saveAllData();
            if (appScreenReady) {
                buildNavigation();
                if (currentTabView && !canAccessTab(currentTabView)) {
                    switchTab(getFallbackTabId());
                } else if (currentTabView) {
                    refreshUI();
                }
            }
            showToast(`Loja ${normalizedChecked ? 'ativada' : 'desativada'} com sucesso!`, 'success');
        }

        function getAppVersion() {
            const metaVersion = document.querySelector('meta[name="app-version"]')?.getAttribute('content')?.trim();
            return metaVersion || '1.0.0';
        }

        function escapeRegExp(value) {
            return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function renderTabContent(container, content, tabId) {
            if (!container) return;

            const currentShell = container.querySelector('.tab-pane-shell');
            const transitionToken = `${tabId}-${Date.now()}`;
            container.dataset.tabTransitionToken = transitionToken;

            const commitNextContent = () => {
                if (container.dataset.tabTransitionToken !== transitionToken) return;

                container.innerHTML = `<div class="tab-pane-shell" data-tab-pane="${tabId}">${content}</div>`;
                const nextShell = container.querySelector('.tab-pane-shell');

                initIcons();
                restoreUIState(tabId);
                applyAutofillGuards(container);
                enhanceInteractiveElements(container);

                requestAnimationFrame(() => {
                    if (container.dataset.tabTransitionToken !== transitionToken || !nextShell) return;
                    nextShell.classList.add('is-visible');
                    if (tabId === 'settings') {
                        // carregar backups quando abrir Configurações
                        try { setTimeout(() => { if (typeof loadBackups === 'function') loadBackups(); }, 50); } catch (e) { console.warn(e); }
                    }
                });
            };

            if (!currentShell) {
                commitNextContent();
                return;
            }

            currentShell.classList.remove('is-visible');
            currentShell.classList.add('is-leaving');
            window.setTimeout(commitNextContent, 150);
        }

        function filterStoreSaleStudents(term = '') {
            const select = document.getElementById('store-sale-student');
            if (!select) return;

            const normalizedTerm = normalizeSearchText(term);
            const searchTokens = normalizedTerm.split(/\s+/).filter(Boolean);
            const currentValue = select.value;

            const filteredStudents = [...MOCK_STUDENTS]
                .map(student => {
                    const normalizedName = normalizeSearchText(student.name);
                    const normalizedClass = normalizeSearchText(student.class);
                    const searchable = `${normalizedName} ${normalizedClass} ${student.id} ${normalizeSearchText(formatMarimbondosValue(student.balance))}`;
                    const matches = searchTokens.every(token => searchable.includes(token));
                    let score = 0;

                    if (!searchTokens.length) {
                        score = 0;
                    } else if (matches) {
                        score += searchTokens.reduce((total, token) => {
                            if (normalizedName.startsWith(token)) return total + 12;
                            if (normalizedName.includes(token)) return total + 8;
                            if (normalizedClass.startsWith(token)) return total + 5;
                            if (normalizedClass.includes(token)) return total + 3;
                            return total + 1;
                        }, 0);
                    }

                    return { student, matches: !searchTokens.length || matches, score, normalizedName };
                })
                .filter(entry => entry.matches)
                .sort((a, b) => b.score - a.score || a.normalizedName.localeCompare(b.normalizedName, 'pt-BR'))
                .map(entry => entry.student);

            const optionsHtml = filteredStudents.map(student => `
                <option value="${student.id}">${escapeHtml(student.name)} • ${escapeHtml(student.class)} • Saldo M$ ${formatMarimbondosValue(student.balance)}</option>
            `).join('');

            select.innerHTML = `
                <option value="">Selecione um aluno</option>
                ${optionsHtml}
            `;

            if (filteredStudents.some(student => String(student.id) === currentValue)) {
                select.value = currentValue;
            }

            const emptyHint = document.getElementById('store-sale-student-empty');
            if (emptyHint) {
                emptyHint.classList.toggle('hidden', filteredStudents.length > 0 || !normalizedTerm);
            }

            const resultHint = document.getElementById('store-sale-student-count');
            if (resultHint) {
                resultHint.textContent = filteredStudents.length
                    ? `${filteredStudents.length} aluno(s) encontrado(s)`
                    : (normalizedTerm ? 'Nenhum aluno encontrado' : `${MOCK_STUDENTS.length} aluno(s) disponíveis`);
            }

            if (!currentValue && filteredStudents.length === 1) {
                select.value = String(filteredStudents[0].id);
            }

            refreshStoreSalePreview(Number(select.dataset.itemId || 0));
        }

        function switchTab(tabId) {
            const userRole = getCurrentRoleType();
            if (!canAccessTab(tabId, userRole)) {
                const fallbackTab = getFallbackTabId(userRole);
                if (fallbackTab && fallbackTab !== tabId) {
                    console.warn(`Aba ${tabId} indisponível para o perfil ${userRole}. Redirecionando para ${fallbackTab}.`);
                    switchTab(fallbackTab);
                    return;
                }

                renderTabCrashState(tabId, new Error('Nenhuma aba permitida encontrada para o perfil atual.'));
                return;
            }

            try {
                captureUIState(currentTabView);
                currentTabView = tabId;
                const container = document.getElementById('tab-content');
                if (!container) {
                    throw new Error('Área principal de conteúdo não encontrada.');
                }

                document.querySelectorAll('[id^="tab-"]').forEach(btn => {
                    btn.classList.remove('bg-amber-200', 'dark:bg-amber-500/30', 'text-amber-700', 'dark:text-amber-300', 'border-amber-400', 'dark:border-amber-500/50', 'shadow-md', 'font-bold');
                    btn.classList.add('text-slate-600', 'dark:text-slate-300', 'border-transparent');
                });
                const activeBtn = document.getElementById(`tab-${tabId}`);
                if(activeBtn) {
                    activeBtn.classList.add('bg-amber-200', 'dark:bg-amber-500/30', 'text-amber-700', 'dark:text-amber-300', 'border-amber-400', 'dark:border-amber-500/50', 'shadow-md', 'font-bold');
                    activeBtn.classList.remove('text-slate-600', 'dark:text-slate-300');
                    activeBtn.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
                }

                let content = '';
                switch(tabId) {
                case 'transactions':
                    const sortedStudents = [...MOCK_STUDENTS].sort((a,b) => a.name.localeCompare(b.name));
                    
                    const classFilters = ['Todos', ...FIXED_CLASSES].map(c => `
                        <button onclick="setTransactionClassFilter('${c}')" class="filter-chip whitespace-nowrap px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${transactionClassFilter === c ? 'bg-amber-500 text-slate-900 border-amber-500' : 'transaction-chip'}">
                            ${c}
                        </button>
                    `).join('');

                    const studentCheckboxes = sortedStudents.map(s => {
                        const teacherKey = getTeacherCreditKey();
                        const studentWeeklyCredit = getStudentWeeklyCredit(s, teacherKey);
                        const maxPerStudent = MOCK_SETTINGS.maxWeeklyCreditPerTeacher || 50;
                        const remainingCredit = maxPerStudent - studentWeeklyCredit;
                        const creditStatus = `${studentWeeklyCredit}/${maxPerStudent}`;
                        
                        return `
                        <label class="trans-student-label block relative mb-2" data-name="${s.name}" data-class="${s.class}" style="display: ${transactionClassFilter === 'Todos' || transactionClassFilter === s.class ? 'block' : 'none'}" onclick="event.stopPropagation(); this.querySelector('.trans-student-cb').checked = !this.querySelector('.trans-student-cb').checked;">
                            <input type="checkbox" value="${s.id}" class="trans-student-cb peer sr-only" ${s.banned ? 'disabled' : ''}>
                            <div class="transaction-student-card flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border hover:border-slate-500 ${s.banned ? 'opacity-50 cursor-not-allowed' : ''}">
                                <div class="w-5 h-5 border border-slate-500 rounded flex items-center justify-center peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors">
                                    <i data-lucide="check" class="w-3 h-3 text-slate-800 opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                                </div>
                                <div class="flex-1 flex justify-between items-center">
                                    <div>
                                        <p class="text-sm font-bold ${s.banned ? 'text-red-400 line-through' : 'transaction-light-text'}">${s.name}</p>
                                        <p class="text-[10px] transaction-section-title uppercase">${s.class} ${s.aee ? '<span class="text-blue-400 font-bold">• AEE</span>' : ''}</p>
                                        <p class="text-[9px] text-slate-500 mt-1">Créditos: <span class="font-bold ${remainingCredit <= 0 ? 'text-red-500' : 'text-emerald-600'}">${creditStatus}</span> ${remainingCredit > 0 ? `<span class="text-slate-400">(${remainingCredit} restante)</span>` : '<span class="text-red-500 font-bold">(Limite atingido)</span>'}</p>
                                    </div>
                                    <div class="flex flex-col items-end gap-1">
                                        <div class="font-bold text-amber-500 text-xs">M$ ${s.balance}</div>
                                        <div class="text-[9px] px-2 py-0.5 rounded-lg ${remainingCredit > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'} font-semibold">
                                            ${remainingCredit > 0 ? `${remainingCredit} M$ Livre` : 'Sem Limite'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </label>
                        `;
                    }).join('');

                    const hideCreditButton = MOCK_SETTINGS.creditsFrozen && !canDistributeCreditsWhileFrozen();

                    content = `
                        <div class="space-y-4">
                            <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Gestão de Transações</h3>
                            <div class="transaction-panel p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl">
                                <div class="space-y-4">
                                    <div>
                                        <div class="flex justify-between items-end mb-2">
                                            <label class="transaction-section-title text-[10px] font-bold uppercase">Filtrar por Turma</label>
                                            <button onclick="document.querySelectorAll('.trans-student-cb:not([disabled])').forEach(cb => { if(cb.closest('.trans-student-label').style.display !== 'none') cb.checked = true })" class="transaction-select-all-btn text-[10px] font-bold">Marcar Todos</button>
                                        </div>
                                        <div class="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
                                            ${classFilters}
                                        </div>
                                        <div class="relative mb-2">
                                            <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 transaction-section-title"></i>
                                            <input type="text" id="trans-search" onkeyup="filterTransactionStudents(this.value)" placeholder="Buscar nome..." class="transaction-search w-full rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-amber-500 transition-colors">
                                        </div>
                                        <div class="transaction-list max-h-56 overflow-y-auto p-1 rounded-xl no-scrollbar border">
                                            ${studentCheckboxes}
                                        </div>
                                    </div>
                                    <div class="mt-4 border-t border-slate-700/40 pt-4">
                                        <div class="mb-4">
                                            <label class="transaction-section-title block text-[10px] font-bold uppercase mb-2 tracking-wider">Valores Rápidos (M$)</label>
                                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <button onclick="document.getElementById('trans-value').value = 25" class="transaction-quick-btn py-2 rounded-lg font-bold transition btn-bounce">25</button>
                                                <button onclick="document.getElementById('trans-value').value = 50" class="transaction-quick-btn py-2 rounded-lg font-bold transition btn-bounce">50</button>
                                                <button onclick="document.getElementById('trans-value').value = 75" class="transaction-quick-btn py-2 rounded-lg font-bold transition btn-bounce">75</button>
                                                <button onclick="document.getElementById('trans-value').value = 100" class="transaction-quick-btn py-2 rounded-lg font-bold transition btn-bounce">100</button>
                                            </div>
                                        </div>
                                        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                                            <div class="flex-1">
                                                <input type="number" id="trans-value" placeholder="Outro valor..." class="transaction-value-input w-full p-3 rounded-xl outline-none text-xl font-black text-amber-400 text-center transition focus:border-amber-500">
                                            </div>
                                            <div class="w-full sm:flex-1 flex gap-2">
                                                ${hideCreditButton ? '' : `<button onclick="handleTransaction('credit')" class="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-xl flex items-center justify-center btn-bounce text-white shadow-lg"><i data-lucide="plus" class="w-6 h-6"></i></button>`}
                                                <button onclick="handleTransaction('debit')" class="flex-1 bg-red-500 hover:bg-red-600 py-3 rounded-xl flex items-center justify-center btn-bounce text-white shadow-lg"><i data-lucide="minus" class="w-6 h-6"></i></button>
                                            </div>
                                        </div>
                                        ${hideCreditButton ? '<p class="mt-3 text-[11px] font-bold text-amber-300">Créditos congelados: apenas o DEV pode creditar no momento.</p>' : ''}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    break;

                case 'store':
                    const cartItemCount = getStoreCartCount();
                    const cartTotal = getStoreCartTotal();
                    const lowStockCount = MOCK_STORE_ITEMS.filter(item => item.quantity <= 3).length;
                    const totalInventoryUnits = MOCK_STORE_ITEMS.reduce((total, item) => total + Number(item.quantity || 0), 0);
                    const storeItemsHtml = MOCK_STORE_ITEMS.map(item => {
                        const stockBadgeClass = item.quantity <= 3 ? 'store-stock-badge-low' : 'store-stock-badge-ok';
                        return `
                            <article class="store-item-card bg-white rounded-[1.75rem] border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-lg hover:-translate-y-1" data-search="${escapeHtml(`${item.name} ${formatMarimbondosValue(item.price)} ${item.quantity}`.toLowerCase())}">
                                <div class="store-photo-frame p-3">
                                    <div class="aspect-[4/3] rounded-[1.35rem] overflow-hidden bg-white/80">
                                        <img src="${item.imageData}" alt="${escapeHtml(item.name)}" class="w-full h-full object-cover">
                                    </div>
                                </div>
                                <div class="p-4 space-y-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Item da Loja</p>
                                            <h4 class="text-base font-black text-slate-800 uppercase tracking-tight break-words">${escapeHtml(item.name)}</h4>
                                        </div>
                                        <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${stockBadgeClass}">Estoque ${item.quantity}</span>
                                    </div>
                                    <div class="flex items-end justify-between gap-3">
                                        <div>
                                            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Valor</p>
                                            <p class="text-2xl font-black text-amber-600 leading-none">M$ ${formatMarimbondosValue(item.price)}</p>
                                        </div>
                                        <div class="text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            <p>Atualizado</p>
                                            <p class="text-slate-500 mt-1">${escapeHtml(item.updatedAt)}</p>
                                        </div>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openSellStoreItemModal(${item.id})" class="flex-1 py-3 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce flex items-center justify-center gap-2 shadow-lg">
                                            <i data-lucide="shopping-cart" class="w-4 h-4"></i> Adicionar
                                        </button>
                                        ${canManageStoreInventory() ? `
                                            <button onclick="openEditStoreItemModal(${item.id})" class="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce border border-slate-200 flex items-center justify-center gap-2">
                                                <i data-lucide="pencil" class="w-4 h-4"></i>
                                            </button>
                                            <button onclick="handleDeleteStoreItem(${item.id})" class="px-4 py-3 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce border border-red-100 flex items-center justify-center gap-2">
                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </article>
                        `;
                    }).join('');

                    content = `
                        <div class="space-y-4 store-tab-shell">
                            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div>
                                    <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Loja Escolar</h3>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gerencie estoque, vendas e débito automático dos alunos</p>
                                </div>
                                <div class="flex flex-col sm:flex-row gap-2">
                                    <button onclick="openStoreCartModal()" class="py-3 px-4 bg-amber-500 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce flex items-center justify-center gap-2 shadow-lg">
                                        <i data-lucide="shopping-cart" class="w-4 h-4"></i> Carrinho ${cartItemCount ? `(${cartItemCount})` : ''}
                                    </button>
                                    ${canManageStoreInventory() ? `
                                        <button onclick="openAddStoreItemModal()" class="py-3 px-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest btn-bounce flex items-center justify-center gap-2 shadow-lg">
                                            <i data-lucide="package-plus" class="w-4 h-4"></i> Novo Item
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                <div class="p-4 rounded-[1.5rem] bg-amber-50 border border-amber-100">
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-amber-500">Itens no Carrinho</p>
                                    <p class="text-2xl font-black text-amber-700 mt-1">${cartItemCount}</p>
                                </div>
                                <div class="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-200">
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Reservado</p>
                                    <p class="text-2xl font-black text-slate-800 mt-1">M$ ${formatMarimbondosValue(cartTotal)}</p>
                                </div>
                                <div class="p-4 rounded-[1.5rem] bg-emerald-50 border border-emerald-100">
                                    <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Estoque Total</p>
                                    <p class="text-2xl font-black text-emerald-700 mt-1">${totalInventoryUnits}</p>
                                </div>
                                <div class="p-4 rounded-[1.5rem] ${lowStockCount ? 'bg-rose-50 border border-rose-100' : 'bg-blue-50 border border-blue-100'}">
                                    <p class="text-[10px] font-bold uppercase tracking-widest ${lowStockCount ? 'text-rose-500' : 'text-blue-500'}">Estoque Baixo</p>
                                    <p class="text-2xl font-black ${lowStockCount ? 'text-rose-700' : 'text-blue-700'} mt-1">${lowStockCount}</p>
                                </div>
                            </div>
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <input type="text" id="store-search" oninput="filterStoreItems(this.value)" placeholder="Buscar item pelo nome, valor ou estoque..." class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 transition">
                            </div>
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
                                <p id="store-results-count" class="text-[10px] font-bold uppercase tracking-widest text-slate-400">${MOCK_STORE_ITEMS.length} de ${MOCK_STORE_ITEMS.length} ${MOCK_STORE_ITEMS.length === 1 ? 'item visível' : 'itens visíveis'}</p>
                                <div class="flex items-center gap-2">
                                    <button id="store-clear-search-btn" onclick="const storeSearchInput = document.getElementById('store-search'); if (storeSearchInput) { storeSearchInput.value = ''; filterStoreItems(''); storeSearchInput.focus(); }" class="hidden px-3 py-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-black uppercase text-[10px] tracking-widest btn-bounce">Limpar Busca</button>
                                    <button onclick="openStoreCartModal()" class="inline-flex items-center gap-2 py-2.5 px-3 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest btn-bounce shadow-lg">
                                        <i data-lucide="wallet" class="w-4 h-4"></i> Revisar Compra
                                    </button>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                ${storeItemsHtml}
                            </div>
                            <div id="store-empty-state" class="${MOCK_STORE_ITEMS.length ? 'hidden ' : ''}text-center py-12 px-6 bg-white rounded-[2rem] border border-dashed border-slate-200">
                                <div class="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                                    <i data-lucide="store" class="w-7 h-7"></i>
                                </div>
                                <h4 id="store-empty-title" class="text-base font-black text-slate-800 uppercase tracking-tight">Nenhum item disponível</h4>
                                <p id="store-empty-description" class="text-sm text-slate-500 mt-2">${canManageStoreInventory() ? 'Cadastre produtos com foto, valor e quantidade para começar a vender.' : 'Ainda não há produtos cadastrados na loja.'}</p>
                            </div>
                        </div>
                    `;
                    break;

                case 'students':
                    const canImportStudentLists = canImportStudents();
                    const classesHtml = FIXED_CLASSES.map(className => {
                        const studentsInClass = MOCK_STUDENTS.filter(s => s.class === className);
                        return `
                            <div class="student-class-card rounded-2xl border shadow-sm overflow-hidden mb-3" data-class="${className.toLowerCase()}" data-students="${escapeHtml(studentsInClass.map(s => s.name.toLowerCase()).join(' | '))}">
                                <button onclick="openClassDetails('${className}')" class="student-class-trigger w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                            <i data-lucide="graduation-cap" class="w-5 h-5"></i>
                                        </div>
                                        <div class="text-left">
                                            <h4 class="font-black text-slate-800 text-sm uppercase tracking-tight">${className}</h4>
                                            <p class="student-class-meta text-[10px] font-bold uppercase tracking-widest">${studentsInClass.length} ${studentsInClass.length === 1 ? 'Aluno' : 'Alunos'}</p>
                                        </div>
                                    </div>
                                    <div class="student-class-action flex items-center gap-2">
                                        <span class="text-[10px] font-bold uppercase">Ver Lista</span>
                                        <i data-lucide="external-link" class="w-4 h-4"></i>
                                    </div>
                                </button>
                            </div>
                        `;
                    }).join('');

                    content = `
                        <div class="space-y-4">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                <div>
                                    <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Alunos por Turma</h3>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastre ou importe listas completas</p>
                                </div>
                                <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    ${canImportStudentLists ? `
                                        <button onclick="openStudentImportModal()" class="text-[10px] font-bold bg-slate-100 text-slate-700 px-3 py-2 rounded-lg flex items-center justify-center gap-2 border border-slate-200 w-full sm:w-auto">
                                            <i data-lucide="file-up" class="w-3 h-3"></i> IMPORTAR LISTA
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <input type="text" id="students-search" oninput="filterStudentsDirectory(this.value)" placeholder="Buscar aluno ou turma..." class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 transition">
                            </div>
                            <div class="pb-8">
                                <div id="students-search-results" class="hidden"></div>
                                <div id="students-classes-container">
                                    ${classesHtml}
                                </div>
                                <div id="students-search-empty" class="hidden text-center py-10 opacity-60">
                                    <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                    <p class="text-[10px] font-bold uppercase tracking-widest">Nenhum aluno encontrado</p>
                                </div>
                            </div>
                        </div>
                    `;
                    break;

                case 'history':
                    const isAdminOrDev = MOCK_USER.roleType === 'admin' || MOCK_USER.roleType === 'dev';
                    const isDev = MOCK_USER.roleType === 'dev';
                    const isTeacher = MOCK_USER.roleType === 'teacher';

                    const filteredHistory = MOCK_HISTORY.filter(h => {
                        if (h.type === 'deletion') return isAdminOrDev;
                        if (isTeacher) {
                            return ['credit', 'debit', 'edit'].includes(h.type) && /(Crédito|Débito|Banimento|Desbanimento)/i.test(String(h.title || ''));
                        }
                        return true;
                    }).filter(h => shouldDisplayHistoryCard(h, 15));

                    const histHtml = filteredHistory.map(h => {
                        const visuals = getHistoryVisuals(h);
                        const descClass = visuals.badgeLabel === 'Aviso' ? 'history-desc history-desc-notice text-xs text-slate-700 mt-1 leading-relaxed' : 'history-desc text-xs text-slate-600 mt-1 leading-relaxed';
                        
                        return `
                            <div class="history-item p-4 rounded-2xl border-l-4 card-shadow mb-3 flex flex-col sm:flex-row justify-between items-start gap-3 transition-all hover:translate-x-1 ${visuals.borderClass} ${visuals.cardClass}">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <p class="history-date text-[10px] font-bold text-slate-400">${h.date}</p>
                                        <span class="history-badge ${visuals.badgeClass}">${visuals.badgeLabel}</span>
                                    </div>
                                    <p class="history-title font-black text-sm text-slate-800 uppercase tracking-tight">${visuals.title}</p>
                                    <div class="${descClass}">${h.desc}</div>
                                    <p class="history-author text-[9px] text-slate-400 mt-2 font-bold italic flex items-center gap-1">
                                        <i data-lucide="user" class="w-2.5 h-2.5"></i> Executado por: ${h.author}
                                    </p>
                                </div>
                                <div class="flex items-center gap-1 ml-0 sm:ml-4 w-full sm:w-auto justify-end flex-wrap">
                                    ${isDev ? `
                                        <button onclick="undoHistoryEntry(${h.id})" class="history-action-btn p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition btn-bounce flex items-center gap-1 border border-blue-100" title="Reverter este registro">
                                            <i data-lucide="undo-2" class="w-4 h-4"></i>
                                            <span class="text-[10px] font-bold uppercase">Reverter</span>
                                        </button>
                                        <button onclick="deleteHistoryEntry(${h.id})" class="history-action-btn history-delete-btn p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition btn-bounce flex items-center gap-1 border border-red-100" title="Deletar este registro">
                                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');
                    
                    content = `<div><h3 class="font-black text-slate-800 uppercase tracking-tighter mb-2 text-lg">Histórico de Atividades</h3><p class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">A aba mostra apenas os últimos 15 dias. O histórico individual do aluno continua completo.</p>${histHtml || '<div class="history-empty text-center py-20 opacity-40"><i data-lucide="clock" class="w-12 h-12 mx-auto mb-2"></i><p class="text-[10px] font-bold uppercase tracking-widest">Sem registos</p></div>'}</div>`;
                    break;

                case 'ranking':
                    const rankingFilters = ['Todos', ...FIXED_CLASSES].map(className => `
                        <button onclick="setRankingClassFilter('${className}')" class="whitespace-nowrap px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.14em] transition-all ${rankingClassFilter === className ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'}">
                            ${className}
                        </button>
                    `).join('');

                    const rankedStudents = MOCK_STUDENTS
                        .filter(s => !s.banned && (rankingClassFilter === 'Todos' || s.class === rankingClassFilter))
                        .sort((a, b) => b.balance - a.balance);

                    let rankingHtml = '';

                    if (rankedStudents.length === 0) {
                        rankingHtml = '<div class="text-center py-20 opacity-40"><i data-lucide="trophy" class="w-12 h-12 mx-auto mb-2 text-slate-300"></i><p class="text-[10px] font-bold uppercase tracking-widest">Nenhum aluno elegível</p></div>';
                    } else {
                        rankingHtml = rankedStudents.map((s, index) => {
                            let rankBadge = '';
                            let bgClass = 'bg-white';
                            let extraClass = '';
                            // Estilização especial para o Top 3
                            if (index === 0) {
                                rankBadge = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 flex items-center justify-center font-black shadow-lg border-2 border-yellow-200"><i data-lucide="trophy" class="w-5 h-5"></i></div>';
                                bgClass = 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300';
                                extraClass = 'shadow-md shadow-yellow-200';
                            } else if (index === 1) {
                                rankBadge = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900 flex items-center justify-center font-black shadow-md border-2 border-yellow-500">2</div>';
                                bgClass = 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300';
                                extraClass = 'shadow-md shadow-yellow-200';
                            } else if (index === 2) {
                                rankBadge = '<div class="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 flex items-center justify-center font-black shadow-md border-2 border-yellow-400">3</div>';
                                bgClass = 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300';
                                extraClass = 'shadow-md shadow-yellow-200';
                            } else {
                                rankBadge = `<div class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">${index + 1}</div>`;
                            }
                            // Força fundo correto no tema escuro
                            bgClass += ' ranking-card';
                            return `
                                <button onclick="handleRankingClick(${s.id})" class="w-full text-left flex items-center gap-4 p-4 rounded-2xl shadow-sm mb-3 transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer ${bgClass} ${extraClass}">
                                    <div class="shrink-0">
                                        ${rankBadge}
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-black text-slate-800 uppercase tracking-tight text-sm">${s.name}</p>
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${s.class}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Saldo</p>
                                        <p class="font-black text-amber-500 text-lg leading-none">M$ ${s.balance}</p>
                                    </div>
                                </button>
                            `;
                        }).join('');
                    }

                    content = `
                        <div class="space-y-4 animate-in">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Ranking Escolar</h3>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Os maiores acumuladores</p>
                                </div>
                                <div class="bg-amber-100 text-amber-600 p-3 rounded-2xl shadow-sm">
                                    <i data-lucide="trending-up" class="w-5 h-5"></i>
                                </div>
                            </div>
                            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                ${rankingFilters}
                            </div>
                            <div class="pb-8">
                                ${rankingHtml}
                            </div>
                        </div>
                    `;
                    break;

                case 'teachers':
                    const teachersHtml = MOCK_TEACHERS.map(t => {
                        let roleColor = 'bg-slate-100 text-slate-600 border-slate-200';
                        if (t.role.toLowerCase() === 'desenvolvedor' || t.role.toLowerCase() === 'dev') roleColor = 'bg-purple-100 text-purple-700 border-purple-200';
                        else if (t.role.toLowerCase() === 'admin' || t.role.toLowerCase().includes('diret')) roleColor = 'bg-amber-100 text-amber-700 border-amber-200';
                        else if (t.role.toLowerCase() === 'viewer') roleColor = 'bg-sky-100 text-sky-700 border-sky-200';
                        const canModifyThisTeacher = canEditTeacherRecord(t);
                        const canDeleteThisTeacher = canModifyTeacherRecord(t);
                        const teacherBadges = getTeacherDisplayBadges(t);
                        const presenceMeta = getTeacherPresenceMeta(t);
                        const roleBadgeMarkup = shouldShowTeacherRolePill(t.role)
                            ? `<span class="text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border ${roleColor}">${t.role}</span>`
                            : '';
                        const customBadgeMarkup = teacherBadges.filter(badgeKey => badgeKey !== getPrimaryTeacherBadgeKey(t.role)).map(badgeKey => {
                            const badgeMeta = getTeacherBadgeMeta(badgeKey);
                            if (!badgeMeta) return '';
                            return `<span class="text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest border ${badgeMeta.className}">${badgeMeta.label}</span>`;
                        }).join('');
                        
                        return `
                            <div class="teacher-directory-row bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3 transition hover:border-slate-300" data-search="${escapeHtml(normalizeSearchText(`${t.name} ${t.email} ${t.role} ${teacherBadges.join(' ')}`))}" data-badges="${escapeHtml(teacherBadges.join('|'))}" data-role-badge="${escapeHtml(getPrimaryTeacherBadgeKey(t.role))}">
                                <div class="teacher-directory-main">
                                    <div class="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center border border-slate-100">
                                        <i data-lucide="shield" class="w-5 h-5"></i>
                                    </div>
                                    <div class="flex-1">
                                        <p class="font-black text-slate-800 text-sm uppercase tracking-tight">${t.name}</p>
                                        <p class="text-[10px] text-slate-400 font-bold tracking-widest">${t.email}</p>
                                        <p class="text-[10px] font-bold tracking-widest mt-1 flex items-center gap-1 ${presenceMeta.className}">
                                            <i data-lucide="${presenceMeta.icon}" class="w-3 h-3"></i>
                                            ${presenceMeta.text}
                                        </p>
                                    </div>
                                </div>
                                <div class="teacher-directory-footer">
                                    <div class="teacher-directory-badges">
                                        ${roleBadgeMarkup}
                                        ${customBadgeMarkup}
                                    </div>
                                    ${canModifyThisTeacher ? `
                                        <div class="teacher-directory-actions">
                                            <button onclick="openEditTeacherModal('${t.email}')" class="directory-action-btn directory-action-btn-edit btn-bounce" title="Editar">
                                                <i data-lucide="pencil"></i> Editar
                                            </button>
                                            ${canDeleteThisTeacher ? `
                                            <button onclick="handleDeleteTeacher('${t.email}')" class="directory-action-btn directory-action-btn-delete btn-bounce" title="Excluir">
                                                <i data-lucide="trash-2"></i> Excluir
                                            </button>
                                            ` : ''}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    }).join('');

                    const teacherFilterChips = [
                        { key: 'all', label: 'Todos' },
                        { key: 'docente', label: 'Professor' },
                        { key: 'admin', label: 'Admin' },
                        { key: 'direcao', label: 'Direção' },
                        { key: 'pedagoga', label: 'Pedagoga' },
                        { key: 'articuladora', label: 'Articuladora' }
                    ].map(filter => `
                        <button onclick="setTeacherDirectoryBadgeFilter('${filter.key}')" class="whitespace-nowrap px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.14em] transition-all ${UI_STATE.teachers.badge === filter.key ? 'bg-amber-500 text-slate-900 border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'}">
                            ${filter.label}
                        </button>
                    `).join('');

                    content = `
                        <div class="space-y-4 animate-in">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Corpo Docente</h3>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestão de Professores e Administradores</p>
                                </div>
                            </div>
                            <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                ${teacherFilterChips}
                            </div>
                            <div class="relative">
                                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                                <input type="text" id="teachers-search" oninput="filterTeachersDirectory(this.value)" placeholder="Buscar professor, e-mail ou cargo..." class="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 transition">
                            </div>
                            <div class="pb-8">
                                ${teachersHtml || '<div class="text-center py-10 opacity-50"><p class="text-[10px] font-bold uppercase">Nenhum professor cadastrado</p></div>'}
                                <div id="teachers-search-empty" class="hidden text-center py-10 opacity-60">
                                    <i data-lucide="search-x" class="w-8 h-8 mx-auto mb-2 text-slate-300"></i>
                                    <p class="text-[10px] font-bold uppercase tracking-widest">Nenhum professor encontrado</p>
                                </div>
                            </div>
                        </div>
                    `;
                    break;

                case 'settings':
                    const currentRoleType = getCurrentRoleType();
                    const canManageSystemSettings = canAccessDeveloperTools();
                    const canViewSystemStats = currentRoleType === 'admin' || currentRoleType === 'dev';
                    const canViewLoginActivity = currentRoleType === 'admin' || currentRoleType === 'dev';
                    // Cálculos de Estatísticas
                    const totalStudents = MOCK_STUDENTS.length;
                    const totalTeachers = MOCK_TEACHERS.filter(t => t.role.toLowerCase().includes('professor')).length;
                    const totalAdmins = MOCK_TEACHERS.filter(teacher => {
                        const normalizedRole = String(teacher?.role || '').trim().toLowerCase();
                        const teacherBadges = new Set(getTeacherDisplayBadges(teacher));
                        return normalizedRole.includes('admin') || teacherBadges.has('admin');
                    }).length;
                    const totalCoordination = MOCK_TEACHERS.filter(teacher => {
                        const normalizedRole = String(teacher?.role || '').trim().toLowerCase();
                        const teacherBadges = new Set(getTeacherDisplayBadges(teacher));
                        return normalizedRole.includes('diret')
                            || normalizedRole.includes('pedagog')
                            || normalizedRole.includes('articul')
                            || teacherBadges.has('direcao')
                            || teacherBadges.has('pedagoga')
                            || teacherBadges.has('articuladora');
                    }).length;
                    const totalBannedStudents = getBannedStudents().length;
                    const posBalance = MOCK_STUDENTS.filter(s => s.balance > 0).length;
                    const negBalance = MOCK_STUDENTS.filter(s => s.balance < 0).length;
                    const zeroBalance = MOCK_STUDENTS.filter(s => s.balance === 0).length;
                    function buildSettingsLoginActivityHtml() {
                        const entries = Array.isArray(MOCK_LOGIN_ACTIVITY) ? MOCK_LOGIN_ACTIVITY : [];

                        // Mapear último login por e-mail
                        const lastByEmail = {};
                        entries.forEach(e => {
                            const email = String(e.teacherEmail || '').trim().toLowerCase();
                            if (!email) return;
                            const iso = String(e.loggedInAtIso || '').trim();
                            const existing = lastByEmail[email];
                            if (!existing || (iso && Date.parse(iso) > (Date.parse(existing.iso || '') || 0))) {
                                lastByEmail[email] = {
                                    name: e.teacherName || email,
                                    role: e.role || 'Professor',
                                    email,
                                    iso,
                                    loggedInAt: e.loggedInAt || (iso ? new Date(iso).toLocaleString('pt-BR') : 'agora')
                                };
                            }
                        });

                        // Completar com informações dos cadastros de professores (se houver últimos logins nos registros deles)
                        (Array.isArray(MOCK_TEACHERS) ? MOCK_TEACHERS : []).forEach(t => {
                            const email = normalizeEmailAddress(t.email || '').toLowerCase();
                            if (!email) return;
                            const iso = String(t.lastLoginAtIso || t.lastActiveAtIso || t.onlineSessionStartedAtIso || '').trim();
                            if (!iso) return;
                            const existing = lastByEmail[email];
                            if (!existing || Date.parse(iso) > (Date.parse(existing.iso || '') || 0)) {
                                lastByEmail[email] = {
                                    name: t.name || email,
                                    role: t.role || 'Professor',
                                    email,
                                    iso,
                                    loggedInAt: t.lastLoginAt || new Date(iso).toLocaleString('pt-BR')
                                };
                            }
                        });

                        // Agrupar por papel desejado: Professor, Admin, Dev
                        const groups = { Professor: [], Admin: [], Dev: [] };
                        Object.values(lastByEmail).forEach(item => {
                            const roleNorm = String(item.role || '').toLowerCase();
                            if (roleNorm.includes('dev') || roleNorm.includes('desenvolv')) {
                                groups.Dev.push(item);
                            } else if (roleNorm.includes('admin') || roleNorm.includes('diret') || roleNorm.includes('coord')) {
                                groups.Admin.push(item);
                            } else {
                                groups.Professor.push(item);
                            }
                        });

                        const renderList = (arr) => arr
                            .sort((a, b) => (Date.parse(b.iso || '') || 0) - (Date.parse(a.iso || '') || 0))
                            .map(entry => `
                                <div class="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                                    <div>
                                        <p class="text-sm font-black text-slate-800 uppercase tracking-tight">${escapeHtml(entry.name)}</p>
                                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">${escapeHtml(entry.role)} • ${escapeHtml(entry.email)}</p>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-[10px] font-black uppercase tracking-widest text-emerald-600">Entrou</p>
                                        <p class="text-xs font-bold text-slate-700">${escapeHtml(entry.loggedInAt)}</p>
                                    </div>
                                </div>
                            `).join('');

                        let html = '';
                        html += `<h5 class="font-bold text-slate-700 uppercase text-xs mb-2">Professores</h5>${renderList(groups.Professor) || '<div class="text-[10px] text-slate-400">Nenhum registro</div>'}`;
                        html += `<div class="mt-4"><h5 class="font-bold text-slate-700 uppercase text-xs mb-2">Administradores</h5>${renderList(groups.Admin) || '<div class="text-[10px] text-slate-400">Nenhum registro</div>'}</div>`;
                        html += `<div class="mt-4"><h5 class="font-bold text-slate-700 uppercase text-xs mb-2">DEV</h5>${renderList(groups.Dev) || '<div class="text-[10px] text-slate-400">Nenhum registro</div>'}</div>`;

                        return html;
                    }

                    const loginActivityHtml = buildSettingsLoginActivityHtml();

                    content = `
                        <div class="space-y-4">
                            <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Configurações e Aparência</h3>
                            
                            <!-- Estatísticas -->
                            ${canViewSystemStats ? `<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button onclick="navigateFromSettings('students')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-blue-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="users" class="w-3 h-3 text-blue-500"></i> Alunos</span>
                                    <span class="text-2xl font-black text-slate-800">${totalStudents}</span>
                                </button>
                                <button onclick="navigateFromSettings('teachers')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-purple-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="book-open" class="w-3 h-3 text-purple-500"></i> Professores</span>
                                    <span class="text-2xl font-black text-slate-800">${totalTeachers}</span>
                                </button>
                                <button onclick="navigateFromSettings('teachers')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-amber-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="shield-alert" class="w-3 h-3 text-amber-500"></i> Admin</span>
                                    <span class="text-2xl font-black text-amber-600">${totalAdmins}</span>
                                </button>
                                <button onclick="navigateFromSettings('teachers')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-rose-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="user-cog" class="w-3 h-3 text-rose-500"></i> Coordenação</span>
                                    <span class="text-2xl font-black text-rose-600">${totalCoordination}</span>
                                </button>
                                <button onclick="navigateFromSettings('banned')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-orange-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="ban" class="w-3 h-3 text-orange-500"></i> Banidos</span>
                                    <span class="text-2xl font-black text-orange-600">${totalBannedStudents}</span>
                                </button>
                                <button onclick="navigateFromSettings('positive-balance')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-green-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="trending-up" class="w-3 h-3 text-green-500"></i> Saldo +</span>
                                    <span class="text-2xl font-black text-green-600">${posBalance}</span>
                                </button>
                                <button onclick="navigateFromSettings('negative-balance')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-red-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="trending-down" class="w-3 h-3 text-red-500"></i> Saldo -</span>
                                    <span class="text-2xl font-black text-red-600">${negBalance}</span>
                                </button>
                                <button onclick="navigateFromSettings('zero-balance')" class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-left transition hover:border-slate-300 hover:shadow-md">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="minus" class="w-3 h-3 text-slate-400"></i> Saldo 0</span>
                                    <span class="text-2xl font-black text-slate-600">${zeroBalance}</span>
                                </button>
                            </div>` : ''}

                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i data-lucide="palette" class="w-4 h-4 text-indigo-500"></i> Aparência Pessoal
                                </h4>
                                <div class="space-y-3">
                                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-500 transition">
                                        <input type="radio" name="theme" value="auto" ${THEME_SETTINGS.current === 'auto' ? 'checked' : ''} onchange="setTheme('auto')" class="w-5 h-5 accent-indigo-500">
                                        <span class="flex-1 font-bold text-slate-700">Automático (segue o dispositivo)</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-500 transition">
                                        <input type="radio" name="theme" value="dark" ${THEME_SETTINGS.current === 'dark' ? 'checked' : ''} onchange="setTheme('dark')" class="w-5 h-5 accent-indigo-500">
                                        <i data-lucide="moon" class="w-5 h-5 text-indigo-600"></i>
                                        <span class="flex-1 font-bold text-slate-700">Tema Escuro</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:border-indigo-500 transition">
                                        <input type="radio" name="theme" value="light" ${THEME_SETTINGS.current === 'light' ? 'checked' : ''} onchange="setTheme('light')" class="w-5 h-5 accent-indigo-500">
                                        <i data-lucide="sun" class="w-5 h-5 text-yellow-500"></i>
                                        <span class="flex-1 font-bold text-slate-700">Tema Claro</span>
                                    </label>
                                </div>
                            </div>

                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i data-lucide="party-popper" class="w-4 h-4 text-amber-500"></i> Tema da Tela de Login
                                </h4>
                                <div class="space-y-3">
                                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <p class="text-sm font-bold text-slate-700 mb-1">Temas sazonais desativados</p>
                                        <p class="text-[10px] text-slate-500">Os temas por feriado foram removidos temporariamente da tela de login. Quando voltarmos a trabalhar nisso, esse bloco será refeito do zero.</p>
                                    </div>
                                </div>
                            </div>

                            ${canViewLoginActivity ? `
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <div class="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <i data-lucide="log-in" class="w-4 h-4 text-emerald-500"></i> Log de Login
                                        </h4>
                                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Apenas o último login registrado no app</p>
                                    </div>
                                    <span class="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">${MOCK_LOGIN_ACTIVITY.length ? '1 registro' : '0 registros'}</span>
                                </div>
                                <div class="space-y-3 max-h-[24rem] overflow-y-auto pr-1">
                                    ${loginActivityHtml || '<div class="text-center py-10 opacity-50"><p class="text-[10px] font-bold uppercase tracking-widest">Nenhum login registado ainda</p></div>'}
                                </div>
                            </div>
                            ` : ''}

                            ${canManageSystemSettings ? `
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 mt-4">
                                <div>
                                    <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <i data-lucide="sliders" class="w-4 h-4 text-amber-500"></i> Parâmetros Gerais
                                    </h4>
                                    
                                    <div class="space-y-4">
                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Congelar Distribuição de Créditos</label>
                                                <p class="text-[10px] text-slate-500">Impede que professores e administradores enviem créditos. Apenas o DEV poderá.</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="config-freeze-credits" onchange="saveCreditsFreezeSetting(this.checked)" class="sr-only peer" ${MOCK_SETTINGS.creditsFrozen ? 'checked' : ''}>
                                                <div class="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                                            </label>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Exibir Loja para Professores e Administradores</label>
                                                <p class="text-[10px] text-slate-500">Quando ativado, a aba Loja aparece para todos, exceto a conta DEV.</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="config-store-users" onchange="saveStoreVisibilitySetting('users', this.checked)" class="sr-only peer" ${MOCK_SETTINGS.storeEnabledForUsers ? 'checked' : ''}>
                                                <div class="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Exibir Loja para o DEV</label>
                                                <p class="text-[10px] text-slate-500">Controla se a aba Loja também ficará visível para a conta de desenvolvedor.</p>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="config-store-dev" onchange="saveStoreVisibilitySetting('dev', this.checked)" class="sr-only peer" ${MOCK_SETTINGS.storeEnabledForDev ? 'checked' : ''}>
                                                <div class="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-6 after:transition-all peer-checked:bg-purple-500"></div>
                                            </label>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Limite Semanal (Professores)</label>
                                                <p class="text-[10px] text-slate-500">Máximo de M$ que um professor pode distribuir por semana.</p>
                                            </div>
                                            <div class="flex items-center gap-2 shrink-0">
                                                <span class="text-sm font-bold text-amber-500">M$</span>
                                                <input type="number" id="config-max-credit" value="${MOCK_SETTINGS.maxWeeklyCreditPerTeacher}" class="w-24 p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 text-center">
                                            </div>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Bônus Semanal (Alunos AEE)</label>
                                                <p class="text-[10px] text-slate-500">Valor extra creditado automaticamente para alunos AEE.</p>
                                            </div>
                                            <div class="flex items-center gap-2 shrink-0">
                                                <span class="text-sm font-bold text-amber-500">M$</span>
                                                <input type="number" id="config-aee-bonus" value="${MOCK_SETTINGS.aeeWeeklyBonus}" class="w-24 p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 text-center">
                                            </div>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div>
                                                <label class="block text-sm font-bold text-blue-700">Dia do Crédito AEE</label>
                                                <p class="text-[10px] text-blue-600">Dia da semana para distribuição automática de créditos AEE</p>
                                            </div>
                                            <select id="config-aee-credit-day" value="${MOCK_SETTINGS.aeeCreditDay ?? 1}" class="p-2 bg-white border border-blue-200 rounded-xl outline-none focus:border-blue-400 font-bold text-slate-800 shrink-0">
                                                <option value="0">Domingo</option>
                                                <option value="1" selected>Segunda-feira</option>
                                                <option value="2">Terça-feira</option>
                                                <option value="3">Quarta-feira</option>
                                                <option value="4">Quinta-feira</option>
                                                <option value="5">Sexta-feira</option>
                                                <option value="6">Sábado</option>
                                            </select>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                            <div>
                                                <label class="block text-sm font-bold text-blue-700">Próximo Crédito AEE</label>
                                                <p class="text-[10px] text-blue-600">Data esperada da próxima distribuição automática</p>
                                            </div>
                                            <button onclick="refreshNextAEEDate()" class="p-2 bg-blue-500 text-white border border-blue-600 rounded-xl font-bold text-sm shrink-0 min-w-[120px] text-center hover:bg-blue-600 transition flex items-center justify-center gap-2">
                                                <i data-lucide="refresh-cw" class="w-4 h-4"></i> ${MOCK_SETTINGS.nextAEECreditDate ? parseLocalDate(MOCK_SETTINGS.nextAEECreditDate)?.toLocaleDateString('pt-BR') : 'Calcular...'}
                                            </button>
                                        </div>

                                        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                            <div>
                                                <label class="block text-sm font-bold text-emerald-700">Distribuir Créditos AEE Agora</label>
                                                <p class="text-[10px] text-emerald-600">Dispara manualmente a distribuição de créditos para alunos AEE</p>
                                            </div>
                                            <button onclick="triggerAEEDistribution()" class="px-4 py-2 bg-emerald-500 text-white border border-emerald-600 rounded-xl font-bold text-sm shrink-0 hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                                                <i data-lucide="send" class="w-4 h-4"></i> Distribuir Agora
                                            </button>
                                        </div>
                                            <div>
                                                <label class="block text-sm font-bold text-slate-700">Data da Feira Escolar</label>
                                                <p class="text-[10px] text-slate-500">Define o dia em que a lojinha será liberada para os alunos.</p>
                                            </div>
                                            <input type="date" id="config-feira-date" value="${MOCK_SETTINGS.feiraDate}" class="w-full md:w-auto p-2 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 shrink-0">
                                        </div>
                                    </div>
                                    
                                    <div class="mt-4 flex flex-col md:flex-row md:justify-end gap-2">
                                        <button onclick="saveSettings()" class="py-3 px-6 bg-slate-900 text-white font-bold rounded-xl btn-bounce flex items-center justify-center gap-2 shadow-lg">
                                            <i data-lucide="save" class="w-4 h-4"></i> Salvar Parâmetros
                                        </button>
                                        <button onclick="runFairDayTurnoverManually()" class="py-3 px-6 bg-amber-500 text-slate-950 font-bold rounded-xl btn-bounce flex items-center justify-center gap-2 shadow-lg">
                                            <i data-lucide="sparkles" class="w-4 h-4"></i> Disparar Feira
                                        </button>
                                        <button onclick="openFairHistoryModal()" class="py-3 px-6 bg-slate-100 text-slate-700 font-bold rounded-xl btn-bounce flex items-center justify-center gap-2 border border-slate-200">
                                            <i data-lucide="history" class="w-4 h-4"></i> Histórico da Feira
                                        </button>
                                    </div>
                                </div>
                            </div>

                            ${canManageSystemSettings ? `
                            <!-- Backups do Sistema -->
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <div class="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                            <i data-lucide="database" class="w-4 h-4 text-indigo-500"></i> Backups do Sistema
                                        </h4>
                                        <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Lista os 4 backups mais recentes e permite criar/excluir backups manuais</p>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <input id="backup-secret-input" placeholder="Segredo (opcional)" class="p-2 border border-slate-200 rounded-xl text-sm" />
                                        <button onclick="triggerManualBackup()" class="py-2 px-4 bg-emerald-500 text-white rounded-xl font-bold">Fazer backup agora</button>
                                    </div>
                                </div>

                                <div id="backups-list" class="space-y-3 max-h-48 overflow-y-auto pr-1">
                                    <div class="text-[10px] text-slate-500">Carregando backups...</div>
                                </div>
                            </div>
                            ` : ''}

                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <i data-lucide="brain" class="w-4 h-4 text-amber-500"></i> Base Aprendida de Nomes
                                        </h4>
                                        <p class="text-sm text-slate-600 font-medium">Veja os nomes que o sistema assimilou nas importações e apague os que não devem continuar influenciando a detecção.</p>
                                    </div>
                                    <div class="flex items-center gap-3 shrink-0">
                                        <div class="text-right">
                                            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Aprendido</p>
                                            <p class="text-2xl font-black text-slate-800">${LEARNED_IMPORT_NAMES.length}</p>
                                        </div>
                                        <button onclick="openLearnedImportNamesModal()" class="py-3 px-5 bg-slate-900 text-white font-bold rounded-xl btn-bounce flex items-center gap-2 shadow-lg uppercase text-xs tracking-widest">
                                            <i data-lucide="list-tree" class="w-4 h-4"></i> Gerenciar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Sistema e Backup -->
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mt-4">
                                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i data-lucide="database" class="w-4 h-4 text-blue-500"></i> Backup e Banco de Dados
                                </h4>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <button onclick="exportBackup()" class="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition btn-bounce">
                                        <i data-lucide="download-cloud" class="w-8 h-8 text-blue-500"></i>
                                        <span class="font-bold text-slate-700">Exportar JSON</span>
                                        <span class="text-[10px] text-slate-500 text-center">Guarda o estado atual num ficheiro JSON.</span>
                                    </button>

                                    <button onclick="triggerImport()" class="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition btn-bounce">
                                        <i data-lucide="upload-cloud" class="w-8 h-8 text-amber-500"></i>
                                        <span class="font-bold text-slate-700">Importar JSON</span>
                                        <span class="text-[10px] text-slate-500 text-center">Restaura dados a partir de um ficheiro JSON.</span>
                                    </button>

                                    <button onclick="exportExcel()" class="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-green-500 hover:bg-green-50 transition btn-bounce">
                                        <i data-lucide="file-spreadsheet" class="w-8 h-8 text-green-600"></i>
                                        <span class="font-bold text-slate-700">Exportar Excel</span>
                                        <span class="text-[10px] text-slate-500 text-center">Gera uma planilha com alunos, professores, avisos e histórico.</span>
                                    </button>

                                    <label class="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition btn-bounce cursor-pointer">
                                        <i data-lucide="file-input" class="w-8 h-8 text-purple-600"></i>
                                        <span class="font-bold text-slate-700">Importar Excel</span>
                                        <span class="text-[10px] text-slate-500 text-center">Lê cadastros e dados estruturados a partir de uma planilha.</span>
                                        <input type="file" id="excel-import-file" accept=".xlsx,.xls" class="hidden" onchange="importExcel(event)">
                                    </label>
                                </div>

                                <div class="space-y-3 mt-5">
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-red-100">
                                        <div>
                                            <p class="font-bold text-slate-800 text-sm">Apagar Histórico</p>
                                            <p class="text-[10px] text-slate-500">Apaga permanentemente todos os registos do histórico de atividades.</p>
                                        </div>
                                        <button onclick="promptClearHistory()" class="database-danger-soft-btn px-4 py-2 rounded-lg font-bold text-xs transition btn-bounce shrink-0">Apagar Histórico</button>
                                    </div>

                                    <!-- Apagar Alunos -->
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-red-100">
                                        <div>
                                            <p class="font-bold text-slate-800 text-sm">Apagar Alunos</p>
                                            <p class="text-[10px] text-slate-500">Selecione uma turma para apagar ou todos os alunos.</p>
                                        </div>
                                        <div class="flex gap-2 shrink-0">
                                            <select id="danger-class-select" class="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none">
                                                <option value="all">TODAS AS TURMAS</option>
                                                ${FIXED_CLASSES.map(c => `<option value="${c}">${c}</option>`).join('')}
                                            </select>
                                            <button onclick="promptDeleteStudents()" class="database-danger-solid-btn px-4 py-2 text-white rounded-lg font-bold text-xs transition btn-bounce shadow-md">Executar</button>
                                        </div>
                                    </div>

                                    <!-- Formatação Sistema -->
                                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-red-100 rounded-2xl border border-red-300">
                                        <div>
                                            <p class="font-black text-red-800 text-sm uppercase tracking-tight">Formatação Total</p>
                                            <p class="text-[10px] text-red-600">Apaga alunos, professores (exceto DEV) e histórico.</p>
                                        </div>
                                        <button onclick="promptFactoryReset()" class="px-4 py-2 bg-red-700 text-white rounded-lg font-black text-xs hover:bg-red-800 transition btn-bounce shadow-lg uppercase tracking-wider shrink-0 flex items-center gap-2">
                                            <i data-lucide="skull" class="w-4 h-4"></i> Formatar Sistema
                                        </button>
                                    </div>
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    `;
                    break;

                case 'notices':
                    // Calcular estatísticas de avisos
                    const canAdministerNoticeSection = canAdministerNotices();
                    
                    // Verificar avisos expirados e desativar automaticamente
                    const today = new Date().toISOString().split('T')[0];
                    MOCK_NOTICES.forEach(notice => {
                        if (notice.expiryDate && notice.expiryDate < today && notice.active) {
                            notice.active = false;
                        }
                    });
                    
                    const visibleNotices = MOCK_NOTICES.filter(n => canAdministerNoticeSection || n.active);
                    const totalNotices = visibleNotices.length;
                    const activeNotices = visibleNotices.filter(n => n.active).length;
                    const inactiveNotices = visibleNotices.filter(n => !n.active).length;

                    const noticesHtml = visibleNotices.map(notice => {
                        const canManage = canManageNotice(notice);
                        const canToggle = canAdministerNoticeSection;
                        const isExpired = notice.expiryDate && notice.expiryDate < today;
                        const expiryBadge = notice.expiryDate ? (isExpired 
                            ? `<span class="text-[9px] font-black px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase tracking-widest">Expirado</span>`
                            : `<span class="text-[9px] font-black px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 uppercase tracking-widest">Expira em ${notice.expiryDate}</span>`)
                            : '';
                        return `
                            <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3 transition hover:border-slate-300">
                                <div class="flex items-start justify-between mb-3">
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-2 flex-wrap">
                                            <h4 class="font-black text-slate-800 text-sm uppercase tracking-tight">${notice.title}</h4>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0" title="${notice.active ? 'Desativar' : 'Ativar'}">
                                                <input type="checkbox" class="sr-only peer" ${notice.active ? 'checked' : ''} onchange="toggleNoticeActive(${notice.id})" ${!canToggle ? 'disabled' : ''}>
                                                <div class="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                        </div>
                        <p class="text-xs text-slate-600 leading-relaxed mb-2">${notice.message}</p>
                        <div class="flex items-center gap-2 flex-wrap mb-2">
                            ${expiryBadge}
                        </div>
                        <p class="text-[9px] text-slate-400 flex items-center gap-1">
                            <i data-lucide="user" class="w-3 h-3"></i> ${notice.authorName} • ${notice.createdAt}
                        </p>
                    </div>
                    ${canManage ? `
                        <div class="flex items-center gap-2 shrink-0 ml-2">
                            <button onclick="openEditNoticeModal(${notice.id})" class="px-3 py-2 text-slate-500 hover:text-blue-500 transition btn-bounce rounded-xl border border-slate-200 hover:border-blue-200 flex items-center gap-2" title="Editar">
                                <i data-lucide="pencil" class="w-4 h-4"></i>
                                <span class="text-[10px] font-black uppercase tracking-widest">Editar</span>
                            </button>
                            <button onclick="handleDeleteNotice(${notice.id})" class="px-3 py-2 text-red-500 hover:text-red-700 transition btn-bounce rounded-xl border border-red-100 hover:border-red-200 bg-red-50/60 flex items-center gap-2" title="Excluir">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                <span class="text-[10px] font-black uppercase tracking-widest">Excluir</span>
                            </button>
                        </div>
                    ` : ''}
                    </div>
                `;
                    }).join('');

                    content = `
                        <div class="space-y-4 animate-in">
                            <div class="flex justify-between items-center mb-2">
                                <div>
                                    <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Avisos e Notificações</h3>
                                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Comunicações Importantes</p>
                                </div>
                                ${canAdministerNoticeSection ? `
                                    <button onclick="openCreateNoticeModal()" class="text-[10px] font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 btn-bounce hover:scale-105 active:scale-95">
                                        <i data-lucide="plus" class="w-3 h-3"></i> NOVO AVISO
                                    </button>
                                ` : ''}
                            </div>

                            <!-- Estatísticas de Avisos -->
                            <div class="grid grid-cols-3 gap-3">
                                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-slate-300 transition">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="bell" class="w-3 h-3 text-slate-500"></i> Total</span>
                                    <span class="text-2xl font-black text-slate-800">${totalNotices}</span>
                                </div>
                                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-green-300 transition">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="check-circle" class="w-3 h-3 text-green-500"></i> Ativos</span>
                                    <span class="text-2xl font-black text-green-600">${activeNotices}</span>
                                </div>
                                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center hover:border-red-300 transition">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><i data-lucide="x-circle" class="w-3 h-3 text-red-500"></i> Inativos</span>
                                    <span class="text-2xl font-black text-red-600">${inactiveNotices}</span>
                                </div>
                            </div>

                            <div class="pb-8">
                                ${noticesHtml || `<div class="text-center py-10 opacity-50"><p class="text-[10px] font-bold uppercase">${canAdministerNoticeSection ? 'Nenhum aviso cadastrado' : 'Nenhum aviso ativo'}</p></div>`}
                            </div>
                        </div>
                    `;
                    break;

                case 'account':
                    content = `
                        <div class="space-y-4">
                            <h3 class="font-black text-slate-800 uppercase tracking-tighter text-lg">Minha Conta</h3>
                            
                            <!-- Informações da Conta -->
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <div class="flex items-center justify-between mb-6">
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <i data-lucide="user" class="w-4 h-4 text-amber-500"></i> Informações Pessoais
                                        </h4>
                                    </div>
                                </div>
                                
                                <div class="space-y-4 mb-6">
                                    <div class="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                        <div>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome</p>
                                            <p class="text-sm font-black text-slate-800 mt-1">${MOCK_USER.name}</p>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                        <div>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">E-mail</p>
                                            <p class="text-sm font-black text-slate-800 mt-1">${MOCK_USER.email}</p>
                                        </div>
                                    </div>
                                    
                                    <div class="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                        <div>
                                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cargo</p>
                                            <p class="text-sm font-black text-slate-800 mt-1">${MOCK_USER.role}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <button onclick="openEditAccountModal()" class="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2">
                                    <i data-lucide="pencil" class="w-4 h-4"></i> Editar Dados Pessoais
                                </button>
                            </div>

                            <!-- Informações de Segurança -->
                            <div class="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <h4 class="text-xs font-bold text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <i data-lucide="lock" class="w-4 h-4 text-red-500"></i> Segurança
                                </h4>
                                
                                <div class="bg-slate-50 p-4 rounded-2xl mb-4">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Status da Senha</p>
                                    <div class="flex items-center gap-2">
                                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <p class="text-sm font-bold text-slate-700">Protegida</p>
                                    </div>
                                </div>
                                
                                <p class="text-[10px] text-slate-500 mb-4">Você pode alterar sua senha na seção de edição de dados pessoais.</p>
                                <button onclick="openEditAccountModal()" class="w-full py-3 bg-blue-50 text-blue-600 border border-blue-100 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest hover:bg-blue-100 transition flex items-center justify-center gap-2">
                                    <i data-lucide="key" class="w-4 h-4"></i> Alterar Senha
                                </button>
                            </div>
                        </div>
                    `;
                    break;

                default:
                    content = `<div class="py-20 text-center"><i data-lucide="construction" class="w-12 h-12 text-slate-300 mx-auto mb-4"></i><p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Módulo em Construção</p></div>`;
                }
                container.classList.add('tab-content-shell');
                renderTabContent(container, content, tabId);
            } catch (error) {
                console.error(`Falha ao renderizar a aba ${tabId}:`, error);
                renderTabCrashState(tabId, error);
            }
        }

        function showToast(msg, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const toneClass = type === 'success'
                ? 'bg-slate-900 border-green-500'
                : type === 'warning'
                    ? 'bg-amber-500 border-amber-700 text-slate-950'
                    : 'bg-red-500 border-red-800';
            toast.className = `interactive-surface pressable w-full md:max-w-sm p-4 rounded-2xl shadow-2xl text-white font-bold text-[11px] flex items-center gap-3 border-b-4 ${toneClass}`;
            toast.style.animation = 'toastSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both';
            toast.innerHTML = `<span>${msg}</span>`;
            container.appendChild(toast);
            setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3000);
        }

