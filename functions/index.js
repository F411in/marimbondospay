const admin = require('firebase-admin');
const { onValueWritten } = require('firebase-functions/v2/database');

admin.initializeApp();

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key])
      .filter(Boolean);
  }

  return [];
}

function entryKey(entry) {
  if (!entry || typeof entry !== 'object') return '';
  if (entry.id !== undefined && entry.id !== null) return `id:${entry.id}`;
  return [entry.studentId || 'global', entry.title || '', entry.createdAtIso || entry.createdAt || entry.date || ''].join('|');
}

function stripHtml(value) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

exports.notifyHistoryUpdates = onValueWritten('/marimbondos/shared/history/data', async (event) => {
  const beforeEntries = toArray(event.data.before.val());
  const afterEntries = toArray(event.data.after.val());
  if (!afterEntries.length) {
    return;
  }

  const beforeKeys = new Set(beforeEntries.map(entryKey).filter(Boolean));
  const newEntries = afterEntries.filter((entry) => {
    const key = entryKey(entry);
    return key && !beforeKeys.has(key);
  });

  if (!newEntries.length) {
    return;
  }

  await Promise.all(newEntries.slice(0, 3).map((entry) => {
    const stableKey = entryKey(entry);
    const title = String(entry.title || 'Novo registro no histórico').trim();
    const body = stripHtml(entry.desc || entry.createdAt || 'Há uma novidade no histórico.');

    return admin.messaging().send({
      topic: 'history-updates',
      notification: {
        title,
        body
      },
      data: {
        stableKey,
        title,
        body
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'history_updates'
        }
      }
    });
  }));
});