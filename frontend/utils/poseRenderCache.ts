import type { PoseRenderRecord } from "~/types/poseRender";
import { cloudStorageState, storageDigest, readCloudAsset, writeCloudAsset } from "~/utils/cloudStorage";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("fashfolio-pose-renders", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("renders", { keyPath: "key" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readPoseRender(key: string): Promise<PoseRenderRecord | undefined> {
  try {
    const db = await openDB();
    try {
      const cached = await new Promise<PoseRenderRecord | undefined>((resolve,reject)=>{ const request=db.transaction("renders").objectStore("renders").get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error); });
      if (cached) return cached;
    } finally { db.close(); }
  } catch { /* R2 can still supply an image when IndexedDB is unavailable. */ }
  if (!cloudStorageState.value.configured) return;
  try {
    const remote = await readCloudAsset(await storageDigest(key),true);
    if (!remote?.bounds) return;
    const record = {key,image:remote.image,bounds:remote.bounds,createdAt:Date.now()};
    await store(record,5).catch(()=>{});
    return record;
  } catch { return undefined; }
}
async function store(record: PoseRenderRecord, limit: number) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("renders", "readwrite"), store = tx.objectStore("renders");
      store.put(record);
      const request = store.getAll();
      request.onsuccess = () => { (request.result as PoseRenderRecord[]).sort((a,b) => b.createdAt - a.createdAt).slice(limit).forEach(item => store.delete(item.key)); };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function writePoseRender(record: PoseRenderRecord) {
  // Display never waits for the network. Keep 20 local results until R2 confirms
  // the backup; then only the five hot results need browser storage.
  await store(record,20);
  if (cloudStorageState.value.configured) void (async()=>{
    await writeCloudAsset(await storageDigest(record.key),record.image,record.bounds);
    await store(record,5);
  })().catch(()=>{});
}
