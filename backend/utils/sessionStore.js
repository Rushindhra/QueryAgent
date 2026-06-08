/**
 * sessionStore.js
 * Keeps parsed table data and query history in memory keyed by sessionId.
 * In production, swap this out for Redis or a database.
 */

const store = new Map();

function getSession(id) {
  return store.get(id) || null;
}

function setSession(id, data) {
  store.set(id, { ...data, updatedAt: new Date().toISOString() });
}

function appendHistory(id, entry) {
  const session = store.get(id);
  if (!session) return;
  session.history = session.history || [];
  session.history.unshift({ ...entry, timestamp: new Date().toISOString() });
  // keep last 50 entries
  if (session.history.length > 50) session.history = session.history.slice(0, 50);
  store.set(id, session);
}

function getHistory(id) {
  const session = store.get(id);
  return session?.history || [];
}

function deleteSession(id) {
  store.delete(id);
}

module.exports = { getSession, setSession, appendHistory, getHistory, deleteSession };
