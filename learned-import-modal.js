function openLearnedImportNamesModal(returnToImport = false) {
    if (!canAccessDeveloperTools()) {
        showToast('Apenas o DEV pode gerenciar a base aprendida.', 'error');
        return;
    }

    window.learnedImportNamesReturnToImport = returnToImport && Boolean(window.pendingStudentImport);
    setModalBackdropHandler(closeImportRelatedModal);
    const learnedGiven = getLearnedImportNamesByKind('given');
    const learnedSurnames = getLearnedImportNamesByKind('surname');
    const learnedCompounds = getLearnedImportNamesByKind('compound');
    const entries = [...learnedGiven, ...learnedSurnames, ...learnedCompounds];

    const rows = entries.length
        ? entries.map(entry => `
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest">${getLearnedImportKindLabel(entry.kind)}</span>
                        <span class="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold uppercase tracking-widest">${entry.source}</span>
                    </div>
                    <p class="text-base font-black text-slate-800 break-words">${entry.value}</p>
                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Aprendido em ${new Date(entry.addedAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onclick="removeLearnedImportName('${entry.kind}', '${entry.normalized}')" class="shrink-0 px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black uppercase text-[10px] tracking-widest btn-bounce">Apagar</button>
            </div>
        `).join('')
        : '<div class="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500 font-semibold">Nenhum nome foi aprendido ainda. A base cresce quando você confirma importações válidas.</div>';

    const contentHtml = `
        <div class="space-y-5">
            <div class="flex items-start justify-between gap-4">
                <div>
                    <h3 class="font-black text-slate-800 text-lg uppercase tracking-tight">Nomes Aprendidos</h3>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gerencie o que o sistema assimilou nas importações</p>
                </div>
                <div class="flex flex-wrap gap-2 justify-end items-start">
                    <span class="student-import-pill">${learnedGiven.length} nomes</span>
                    <span class="student-import-pill">${learnedSurnames.length} sobrenomes</span>
                    <span class="student-import-pill">${learnedCompounds.length} compostos</span>
                    <button type="button" onclick="closeImportRelatedModal()" class="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center btn-bounce" aria-label="Fechar modal de importação">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <p class="text-[10px] text-blue-600 font-bold uppercase tracking-widest">Nomes Simples</p>
                    <p class="text-2xl font-black text-blue-700 mt-2">${learnedGiven.length}</p>
                </div>
                <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                    <p class="text-[10px] text-emerald-700 font-bold uppercase tracking-widest">Sobrenomes</p>
                    <p class="text-2xl font-black text-emerald-700 mt-2">${learnedSurnames.length}</p>
                </div>
                <div class="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p class="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Nomes Compostos</p>
                    <p class="text-2xl font-black text-amber-700 mt-2">${learnedCompounds.length}</p>
                </div>
            </div>
            <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div>
                    <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Adicionar Manualmente</p>
                    <p class="text-sm text-slate-500 font-medium mt-1">Use isso para reforçar nomes ou sobrenomes que aparecem com frequência e ainda não estão sendo reconhecidos.</p>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)_auto] gap-3">
                    <select id="learned-import-kind" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-700">
                        <option value="given">Nome</option>
                        <option value="surname">Sobrenome</option>
                        <option value="compound">Nome composto</option>
                    </select>
                    <input type="text" id="learned-import-value" placeholder="Ex: Kallinny ou Igryd de Souza" class="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm font-medium text-slate-700">
                    <button onclick="saveManualLearnedImportName()" class="px-5 py-3 rounded-xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest btn-bounce">Adicionar</button>
                </div>
            </div>
            <div class="space-y-3 max-h-[50vh] overflow-y-auto pr-1">${rows}</div>
            <div class="flex gap-3">
                <button onclick="closeImportRelatedModal()" class="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest">${window.learnedImportNamesReturnToImport ? 'Voltar à Importação' : 'Fechar'}</button>
                ${entries.length ? '<button onclick="clearLearnedImportNames()" class="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl btn-bounce uppercase text-xs tracking-widest shadow-xl">Apagar Tudo</button>' : ''}
            </div>
        </div>
    `;

    const modal = document.getElementById('global-modal');
    if (modal && !modal.classList.contains('hidden')) {
        setModalContent(contentHtml, true);
        return;
    }

    openModal(contentHtml);
}

function removeLearnedImportName(kind, normalized) {
    if (!canAccessDeveloperTools()) {
        showToast('Apenas o DEV pode gerenciar a base aprendida.', 'error');
        return;
    }

    const nextEntries = LEARNED_IMPORT_NAMES.filter(entry => !(entry.kind === kind && entry.normalized === normalized));
    if (nextEntries.length === LEARNED_IMPORT_NAMES.length) return;

    LEARNED_IMPORT_NAMES = nextEntries;
    syncLearnedImportNameCaches();
    saveAllData();
    showToast('Nome aprendido removido com sucesso.', 'success');
    openLearnedImportNamesModal(window.learnedImportNamesReturnToImport);
}

function clearLearnedImportNames() {
    if (!canAccessDeveloperTools()) {
        showToast('Apenas o DEV pode gerenciar a base aprendida.', 'error');
        return;
    }

    if (!LEARNED_IMPORT_NAMES.length) return;
    if (!confirm('Deseja apagar todos os nomes aprendidos pelo sistema?')) return;

    LEARNED_IMPORT_NAMES = [];
    syncLearnedImportNameCaches();
    addHistory('Base de Nomes Aprendidos', `${MOCK_USER.name} limpou a base de nomes aprendidos.`, 'edit');
    saveAllData();
    showToast('Base de nomes aprendidos limpa com sucesso.', 'success');
    openLearnedImportNamesModal(window.learnedImportNamesReturnToImport);
}