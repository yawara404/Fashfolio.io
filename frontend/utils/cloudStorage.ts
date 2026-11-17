import { ref } from "vue";
import { readLocalGarments, writeLocalGarment, type LocalGarment } from "~/utils/localWardrobe";
import type { Garment, SavedOutfit } from "~/types/wardrobe";
import type { StudioCanvasSnapshot } from "~/types/canvas";
import type { PoseRenderBounds } from "~/types/poseRender";

const VAULT_STORAGE = "fashfolio.r2.vault.v1";
const DRAFT_STORAGE = "fashfolio.draft.v1", SAVED_STORAGE = "fashfolio.outfits.v2", CANVAS_STORAGE = "fashfolio-tryon-canvas-v1";
interface CloudGarment { item: Garment; asset: string }
interface Workspace {
  version: 1; updatedAt: string; draft: Partial<SavedOutfit> | null;
  saved: SavedOutfit[]; canvas: StudioCanvasSnapshot | null; garments: CloudGarment[];
}
export const cloudStorageState = ref<{configured:boolean; phase:"local"|"checking"|"syncing"|"synced"|"error"; message:string}>({configured:false,phase:"local",message:"このブラウザに保存"});
export const cloudCanvasRevision = ref(0);
let hydration: Promise<LocalGarment[]> | undefined;
let hydrating = false, timer: ReturnType<typeof setTimeout> | undefined, writing = false, dirty = false;
let onlineListenerBound = false;
let remoteGarments: CloudGarment[] = [];
let remoteReady = false, remoteDocument: Workspace | undefined;
const deletedGarments = new Set<string>();
const uploaded = new Set<string>(), pendingUploads = new Map<string, Promise<void>>();
let retries = 0;

export function resetCloudStorageForTests() {
  clearTimeout(timer);
  timer = undefined;
  hydration = undefined;
  hydrating = false;
  writing = false;
  dirty = false;
  remoteGarments = [];
  remoteReady = false;
  remoteDocument = undefined;
  deletedGarments.clear();
  uploaded.clear();
  pendingUploads.clear();
  retries = 0;
  cloudCanvasRevision.value = 0;
  cloudStorageState.value = { configured: false, phase: "local", message: "このブラウザに保存" };
}

function vault() {
  let value = localStorage.getItem(VAULT_STORAGE);
  if (!value || !/^[a-f0-9]{64}$/.test(value)) {
    value = [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,"0")).join("");
    localStorage.setItem(VAULT_STORAGE,value);
  }
  return value;
}
function failure() {
  cloudStorageState.value.phase = "error";
  cloudStorageState.value.message = "R2に未同期 · このブラウザのデータは保持しています";
}
async function cloudFetch(path: string, init: RequestInit = {}, timeout = 12000) {
  const headers = new Headers(init.headers); headers.set("X-Fashfolio-Vault",vault());
  const response = await fetch(`/api/storage/${path}`, {...init, headers, signal:AbortSignal.timeout(timeout)});
  if (response.status !== 404 && !response.ok) throw new Error("Cloud storage unavailable");
  return response;
}
export async function storageDigest(value: string | Blob) {
  const data = typeof value === "string" ? new TextEncoder().encode(value) : await value.arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256",data))].map(n=>n.toString(16).padStart(2,"0")).join("");
}
export async function readCloudAsset(digest: string, cache = false) {
  if (!cloudStorageState.value.configured) return;
  const response = await cloudFetch(`assets/${digest}${cache ? '?cache=true' : ''}`);
  if (response.status === 404) return;
  if (response.headers.get("Content-Type")?.split(";")[0] !== "image/png") throw new Error("Invalid cloud image");
  const image = await response.blob();
  if (image.size > 8*1024*1024) throw new Error("Cloud image too large");
  const bounds = response.headers.get("X-Fashfolio-Bounds");
  let parsed: PoseRenderBounds | undefined;
  if (bounds) {
    parsed = JSON.parse(bounds);
    if (!parsed || ![parsed.x,parsed.y,parsed.width,parsed.height].every(Number.isFinite) || parsed.width <= 0 || parsed.height <= 0) throw new Error("Invalid cloud pose");
  }
  return {image,bounds:parsed};
}
export async function writeCloudAsset(digest: string, image: Blob, bounds?: PoseRenderBounds) {
  if (!cloudStorageState.value.configured) return false;
  const key = `${bounds ? 'pose' : 'garment'}:${digest}`;
  if (uploaded.has(key)) return true;
  let pending = pendingUploads.get(key);
  if (!pending) {
    pending = (async () => {
      const response = await cloudFetch(`assets/${digest}${bounds ? '?cache=true' : ''}`, {method:"PUT",headers:{"Content-Type":"image/png",...(bounds ? {"X-Fashfolio-Bounds":JSON.stringify(bounds)} : {})},body:image});
      if (!response.ok) throw new Error("Cloud upload failed");
      uploaded.add(key);
    })().finally(()=>pendingUploads.delete(key));
    pendingUploads.set(key,pending);
  }
  await pending;
  return true;
}
function readJSON<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
function validWorkspace(data: unknown): data is Workspace {
  const value = data as Partial<Workspace> | null;
  return !!value && value.version === 1 && Array.isArray(value.saved) && Array.isArray(value.garments) && value.garments.length <= 100;
}
function metadata(item: Garment): Garment {
  const {imageUrl,paint,...record} = item;
  return record;
}
async function readRemoteDocument() {
  const response = await cloudFetch("workspace",{},5000);
  if (response.status === 404) { remoteReady = true; return; }
  const data: unknown = await response.json();
  if (!validWorkspace(data)) throw new Error("Invalid cloud workspace");
  remoteDocument = data;
  remoteGarments = data.garments.filter(record=>record?.item?.source === "local-diffusion" && /^local-[\w-]{1,100}$/.test(record.item.id) && /^[a-f0-9]{64}$/.test(record.asset));
  remoteReady = true;
  return data;
}
export function hydrateCloudWorkspace(): Promise<LocalGarment[]> {
  if (hydration) return hydration;
  hydration = (async () => {
    if (typeof window === "undefined") return [];
    hydrating = true; cloudStorageState.value.phase = "checking";
    cloudStorageState.value.message = "保存先を確認中…";
    let failed = false;
    let needsSync = false;
    let hasRemote = false;
    try {
      const status = await fetch("/api/storage/status",{signal:AbortSignal.timeout(2500)});
      if (!status.ok) throw new Error("Cloud status unavailable");
      const info = await status.json() as {configured:boolean};
      cloudStorageState.value.configured = info.configured === true;
      if (!info.configured) {
        cloudStorageState.value.phase = "local";
        cloudStorageState.value.message = "このブラウザに保存 · R2未設定";
        return [];
      }
      const data = await readRemoteDocument();
      const local = await readLocalGarments().catch(()=>[]);
      if (!data) {
        needsSync = Boolean(local.length || localStorage.getItem(DRAFT_STORAGE) || localStorage.getItem(SAVED_STORAGE) || localStorage.getItem(CANVAS_STORAGE));
        return [];
      }
      hasRemote = true;
      for (const [key,value] of [[DRAFT_STORAGE,data.draft],[SAVED_STORAGE,data.saved],[CANVAS_STORAGE,data.canvas]] as const) {
        const existing = localStorage.getItem(key);
        if (value && !existing) {
          localStorage.setItem(key,JSON.stringify(value));
          if (key === CANVAS_STORAGE) cloudCanvasRevision.value += 1;
        } else if (existing && existing !== JSON.stringify(value ?? null)) {
          needsSync = true;
        }
      }
      const missing = remoteGarments.filter(record=>!local.some(saved=>saved.item.id === record.item.id));
      if (local.some(saved=>!remoteGarments.some(record=>record.item.id === saved.item.id))) needsSync = true;
      for (const record of remoteGarments) uploaded.add(`garment:${record.asset}`);
      const restored: LocalGarment[] = [];
      // Bound parallel downloads; existing browser images never need a second download.
      for (let offset=0;offset<missing.length;offset+=4) await Promise.all(missing.slice(offset,offset+4).map(async record=>{
        try {
          const asset = await readCloudAsset(record.asset); if (!asset) return;
          const saved = {item:metadata(record.item),image:asset.image};
          await writeLocalGarment(saved).catch(()=>{}); restored.push(saved);
        } catch { /* A missing image never blocks the built-in wardrobe. */ }
      }));
      return restored;
    } catch {
      failed = true;
      if (cloudStorageState.value.configured) failure();
      else { cloudStorageState.value.phase = "local"; cloudStorageState.value.message = "このブラウザに保存"; }
      return [];
    } finally {
      hydrating = false;
      if (cloudStorageState.value.configured && !failed) {
        if (needsSync) scheduleCloudSync();
        else {
          cloudStorageState.value.phase = "synced";
          cloudStorageState.value.message = hasRemote ? "R2にバックアップ済み" : "R2接続済み";
        }
      }
      if (typeof window !== "undefined" && !onlineListenerBound) {
        onlineListenerBound = true;
        window.addEventListener("online",()=>{ retries=0; if (cloudStorageState.value.configured) scheduleCloudSync(); });
      }
    }
  })();
  return hydration;
}
export function scheduleCloudSync() {
  if (hydrating || !cloudStorageState.value.configured) return;
  dirty = true; cloudStorageState.value.phase = "syncing"; cloudStorageState.value.message = "R2に保存中…";
  clearTimeout(timer); timer = setTimeout(()=>void flushCloudWorkspace(),1800);
}
export function markCloudGarmentDeleted(id: string) { deletedGarments.add(id); scheduleCloudSync(); }
function workspaceBody(doc: Omit<Workspace, "updatedAt">) {
  return JSON.stringify({ version: doc.version, draft: doc.draft, saved: doc.saved, canvas: doc.canvas, garments: doc.garments });
}
export async function flushCloudWorkspace() {
  clearTimeout(timer);
  if (writing || !cloudStorageState.value.configured || hydrating) return;
  writing = true; dirty = false;
  cloudStorageState.value.phase = "syncing"; cloudStorageState.value.message = "R2に保存中…";
  let failed = false;
  try {
    if (!remoteReady) await readRemoteDocument();
    const local = await readLocalGarments();
    if (local.length > 100) throw new Error("Too many cloud garments");
    const localIds = new Set(local.map(record=>record.item.id));
    const garments: CloudGarment[] = remoteGarments.filter(record=>!deletedGarments.has(record.item.id) && !localIds.has(record.item.id));
    for (const record of local) {
      const asset = await storageDigest(record.image);
      await writeCloudAsset(asset,record.image);
      garments.push({item:metadata(record.item),asset});
    }
    if (garments.length > 100) throw new Error("Too many cloud garments");
    const draft = readJSON(DRAFT_STORAGE,remoteDocument?.draft || null);
    const saved = readJSON(SAVED_STORAGE,remoteDocument?.saved || []);
    const canvas = readJSON(CANVAS_STORAGE,remoteDocument?.canvas || null);
    const hasContent = Boolean(draft || saved.length || canvas || garments.length || deletedGarments.size);
    if (!remoteDocument && !hasContent) {
      retries = 0;
      cloudStorageState.value.phase = "synced"; cloudStorageState.value.message = "R2接続済み";
      return;
    }
    if (remoteDocument && !deletedGarments.size && workspaceBody({ version: 1, draft, saved, canvas, garments }) === workspaceBody({ version: 1, draft: remoteDocument.draft, saved: remoteDocument.saved, canvas: remoteDocument.canvas, garments: remoteGarments })) {
      retries = 0;
      cloudStorageState.value.phase = "synced"; cloudStorageState.value.message = "R2にバックアップ済み";
      return;
    }
    const document: Workspace = {version:1,updatedAt:new Date().toISOString(),draft,saved,canvas,garments};
    const response = await cloudFetch("workspace",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(document)});
    if (!response.ok) throw new Error("Cloud save failed");
    // Only delete blobs after the new manifest has committed successfully.
    const retained = new Set(garments.map(record=>record.asset));
    for (const previous of remoteGarments) if (!retained.has(previous.asset)) {
      await cloudFetch(`assets/${previous.asset}`,{method:"DELETE"}).catch(()=>{});
      uploaded.delete(`garment:${previous.asset}`);
    }
    remoteGarments = garments; remoteDocument = document; deletedGarments.clear(); retries = 0;
    cloudStorageState.value.phase = "synced"; cloudStorageState.value.message = "R2にバックアップ済み";
  } catch {
    failed = true; failure(); dirty = true;
    if (++retries <= 3) timer = setTimeout(()=>void flushCloudWorkspace(),retries*15000);
  } finally {
    writing = false;
    if (dirty && !failed) scheduleCloudSync();
  }
}
