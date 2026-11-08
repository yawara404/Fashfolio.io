import type { Garment } from "~/types/wardrobe";
export interface LocalGarment { item: Garment; image: Blob; }
const DB_NAME = "fashfolio-local-wardrobe";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("garments", { keyPath: "item.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readLocalGarments(): Promise<LocalGarment[]> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction("garments", "readonly").objectStore("garments").getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}
export async function writeLocalGarment(record: LocalGarment) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("garments", "readwrite");
      const { imageUrl, ...metadata } = record.item;
      tx.objectStore("garments").put({ item: JSON.parse(JSON.stringify(metadata)), image: record.image });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error("保存を中止しました"));
    });
  } finally { db.close(); }
}
export async function deleteLocalGarment(id: string) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("garments", "readwrite");
      tx.objectStore("garments").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
