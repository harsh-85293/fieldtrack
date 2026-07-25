import { openDB } from 'idb';

const DB_NAME = 'fieldtrack-offline';
const DB_VERSION = 1;

function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('locationQueue')) {
        db.createObjectStore('locationQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingVisits')) {
        db.createObjectStore('pendingVisits', { keyPath: 'idempotencyKey' });
      }
    },
  });
}

// ─── Location Point Queue ───

export async function queueLocationPoint(point) {
  const db = await getDB();
  const record = {
    id: point.id || crypto.randomUUID(),
    ...point,
    queuedAt: new Date().toISOString(),
  };
  await db.put('locationQueue', record);
  return record;
}

export async function getQueuedLocationPoints() {
  const db = await getDB();
  return db.getAll('locationQueue');
}

export async function clearQueuedLocationPoints() {
  const db = await getDB();
  await db.clear('locationQueue');
}

export async function getQueuedLocationCount() {
  const db = await getDB();
  return db.count('locationQueue');
}

// ─── Pending Visits ───

export async function queuePendingVisit(visit) {
  const db = await getDB();
  const record = {
    idempotencyKey: visit.idempotencyKey || crypto.randomUUID(),
    ...visit,
    queuedAt: new Date().toISOString(),
  };
  await db.put('pendingVisits', record);
  return record;
}

export async function getPendingVisits() {
  const db = await getDB();
  return db.getAll('pendingVisits');
}

export async function removePendingVisit(idempotencyKey) {
  const db = await getDB();
  await db.delete('pendingVisits', idempotencyKey);
}

export async function getPendingVisitCount() {
  const db = await getDB();
  return db.count('pendingVisits');
}
