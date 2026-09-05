// IndexedDB is origin-specific. Use the SAME stable preview URL when retrying.
const DB_NAME = "destiny-voice-outbox-v1";
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("pending", { keyPath: "key" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function operation(mode, run) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("pending", mode);
      const request = run(tx.objectStore("pending"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error("Local save aborted"));
    });
  } finally { db.close(); }
}
export class VoiceRecordingOutbox {
  constructor(onStatus = () => {}) { this.onStatus = onStatus; this.saving = Promise.resolve(); this.closed = false; }
  save(id, file, blob) {
    const item = { key: `${id}/${file}`, id, file, blob, version: crypto.randomUUID(), updated: Date.now() };
    this.saving = this.saving.then(() => operation("readwrite", store => store.put(item)));
    this.saving.then(() => { this.onStatus("Saved on this device; syncing privately…"); this.flush(); }).catch(() => this.onStatus("Local autosave failed. Keep this tab open and download the ZIP."));
    // Recover queue after a quota/storage failure so later writes can retry.
    this.saving = this.saving.catch(() => {});
  }
  async flush() {
    if (this.busy || this.closed) return;
    this.busy = true;
    try {
      await this.saving;
      const pending = await operation("readonly", store => store.getAll());
      for (const item of pending) {
        if (this.closed) return;
        const response = await fetch(`/api/voice-recordings?id=${item.id}&file=${item.file}`, { method: "PUT", body: item.blob, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Upload deferred");
        // Never delete a newer snapshot that arrived while this upload ran.
        const db = await database();
        await new Promise((resolve, reject) => {
          const tx = db.transaction("pending", "readwrite"), store = tx.objectStore("pending");
          const get = store.get(item.key);
          get.onsuccess = () => { if (get.result?.version === item.version) store.delete(item.key); };
          tx.oncomplete = resolve; tx.onerror = reject;
        }).finally(() => db.close());
      }
      this.onStatus("Recording chunks synced to private storage.");
    } catch { this.onStatus("Upload pending. Reopen this same URL on this device to retry."); }
    finally { this.busy = false; }
  }
  start() { this.flush(); this.timer = setInterval(() => this.flush(), 10000); }
  close() { this.closed = true; clearInterval(this.timer); }
}
