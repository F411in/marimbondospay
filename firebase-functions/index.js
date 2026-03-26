const admin = require('firebase-admin');
const { onValueWritten } = require('firebase-functions/v2/database');

admin.initializeApp();

function normalizeHistory(rawHistory) {
  if (Array.isArray(rawHistory)) {
    return rawHistory.filter((entry) => entry && typeof entry === 'object');
  }

  if (rawHistory && typeof rawHistory === 'object') {
    return Object.keys(rawHistory)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => rawHistory[key])
      .filter((entry) => entry && typeof entry === 'object');
  }

  return [];
}

function buildStableKey(entry) {
  if (!entry || typeof entry !== 'object') {
    return '';
  }

  if (entry.id !== undefined && entry.id !== null && entry.id !== '') {
    return `id:${entry.id}`;
  }

  return [entry.title, entry.createdAtIso, entry.createdAt].filter(Boolean).join('|');
}

exports.notifyHistoryUpdate = onValueWritten('/marimbondos/shared/history/data', async (event) => {
  const beforeList = normalizeHistory(event.data.before.val());
  const afterList = normalizeHistory(event.data.after.val());

  if (!afterList.length) {
    return;
  }

  const latest = afterList[0];
  const latestKey = buildStableKey(latest);
  const previousKey = buildStableKey(beforeList[0]);

  if (!latestKey || latestKey === previousKey) {
    return;
  }

  const title = String(latest.title || 'Novo registro no histórico').trim();
  const body = String(latest.desc || latest.createdAt || 'Há uma atualização disponível no histórico.')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  await admin.messaging().send({
    topic: 'history-updates',
    notification: {
      title,
      body,
    },
    data: {
      title,
      body,
      stableKey: latestKey,
      historyId: String(latest.id || ''),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'history_updates',
        priority: 'high',
        defaultSound: true,
      },
    },
  });
});