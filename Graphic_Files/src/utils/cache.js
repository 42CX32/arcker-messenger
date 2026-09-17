// cache.js - created by script
const DB_NAME = 'arcker_cache';
const STORE_NAME = 'messages';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheMessages(chatId, messages) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const msg of messages) {
    store.put({ ...msg, chatId });
  }
  await tx.done;
}

export async function getCachedMessages(chatId) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve) => {
    const result = [];
    const cursor = store.openCursor();
    cursor.onsuccess = (e) => {
      const cur = e.target.result;
      if (cur) {
        if (cur.value.chatId === chatId) result.push(cur.value);
        cur.continue();
      } else {
        resolve(result);
      }
    };
    cursor.onerror = () => resolve([]);
  });
}