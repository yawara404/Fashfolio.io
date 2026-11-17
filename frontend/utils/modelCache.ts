const CHUNK = 64 * 1024 * 1024;
export const MODEL_DIRECTORY = "fashfolio-diffusion-models-v1";
type Progress = (received: number, total: number, saving?: boolean) => void;
interface ModelFileAccess { getSize():number; read(data:Uint8Array,options:{at:number}):number; write(data:Uint8Array,options:{at:number}):number; truncate(size:number):void; flush():void; close():void }

/** Try ordered download sources (shared R2 proxy first, origin host second); `url` stays the stable cache key. */
async function openSource(url:string,sources:string[]|undefined,received:number):Promise<Response> {
  let failure:unknown=new Error("モデルを取得できません。");
  for(const source of sources?.length ? sources : [url]) {
    try {
      const response=await fetch(source,received ? {headers:{Range:`bytes=${received}-`}} : undefined);
      if(response.ok && response.body) return response;
      failure=new Error(`モデルを取得できません（HTTP ${response.status}）。`);
    } catch(error) {failure=error;}
  }
  throw failure;
}

/** OPFS avoids Cache API's large-model storage failures on Chromium. */
export async function fileModel(url:string,size:number,cache:Cache|undefined,progress:Progress,warning:()=>void,sources?:string[]):Promise<ArrayBuffer|undefined> {
  let access:ModelFileAccess;
  try {
    const root=await navigator.storage.getDirectory(), directory=await root.getDirectoryHandle(MODEL_DIRECTORY,{create:true});
    const hash=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(url)));
    const name=[...hash].map(value=>value.toString(16).padStart(2,"0")).join("")+".onnx";
    const handle=await directory.getFileHandle(name,{create:true}) as FileSystemFileHandle & {createSyncAccessHandle?:()=>Promise<ModelFileAccess>};
    if (!handle.createSyncAccessHandle) return undefined;
    access=await handle.createSyncAccessHandle();
  } catch { return undefined; }
  const bytes=new Uint8Array(size);
  let received=0;
  const write=(data:Uint8Array,offset:number) => { let i=0; while(i<data.length) { const n=access.write(data.subarray(i),{at:offset+i}); if (!n) throw new Error("モデルを保存できません。"); i+=n; } };
  try {
    if (access.getSize()>size) access.truncate(0);
    const stored=access.getSize();
    while(received<stored) { const n=access.read(bytes.subarray(received,Math.min(stored,received+CHUNK)),{at:received}); if(!n) throw new Error("保存したモデルを読み込めません。");received+=n;progress(received,size); }
    // Migrate any successful bounded Cache entries without downloading again.
    if (!received && cache) {
      const manifest=await cache.match(`${url}?fashfolio-manifest=1`);
      const meta=manifest ? await manifest.json() as {size:number;parts:number} : null;
      if (meta?.size===size) for(let i=0;i<meta.parts;i++) {
        const part=await cache.match(`${url}?fashfolio-chunk=${i}`); if(!part) break;
        const data=new Uint8Array(await part.arrayBuffer()); if(data.length!==Math.min(CHUNK,size-received)) break;
        write(data,received);bytes.set(data,received);received+=data.length;access.flush();progress(received,size);
      }
    }
    if (received<size) {
      const response=await openSource(url,sources,received);
      if(received && response.status!==206) {received=0;access.truncate(0);}
      const reader=response.body!.getReader();let flushed=received;
      try { while(true) {
        const {done,value}=await reader.read();if(done) break;
        if(received+value.length>size) throw new Error("モデルのサイズが一致しません。");
        write(value,received);bytes.set(value,received);received+=value.length;
        if(received-flushed>=CHUNK) {access.flush();flushed=received;}
        progress(received,size);
      }} finally {reader.releaseLock();}
    }
    access.flush();
    if(received!==size) throw new Error("モデルの取得が途中で終わりました。再試行すると続きから取得します。");
    if(cache) {
      const keys=await cache.keys();
      await Promise.all(keys.filter(key=>key.url.startsWith(url+"?fashfolio-")).map(key=>cache.delete(key)));
    }
    return bytes.buffer;
  } catch(error) {
    if(error instanceof DOMException && error.name==="QuotaExceededError") {warning();return undefined;}
    throw error;
  } finally {access.close();}
}
export async function clearModelFiles() {
  try {const root=await navigator.storage.getDirectory();await root.removeEntry(MODEL_DIRECTORY,{recursive:true});}
  catch(error) {if(!(error instanceof DOMException && error.name==="NotFoundError")) throw error;}
}

/** Large ArrayBuffer Responses fail in some browsers; persist bounded chunks. */
export async function chunkedModel(url: string, size: number, cache: Cache | undefined, progress: Progress, warning: () => void, chunkSize = CHUNK, sources?: string[]): Promise<ArrayBuffer> {
  const part = (i: number) => `${url}?fashfolio-chunk=${i}`;
  const manifestKey = `${url}?fashfolio-manifest=1`;
  const bytes = new Uint8Array(size);
  let received = 0, committed = 0, count = 0;
  try {
    const response = await cache?.match(manifestKey);
    const manifest = response ? await response.json() as {size:number;parts:number} : null;
    if (manifest?.size === size && Number.isInteger(manifest.parts) && manifest.parts <= Math.ceil(size / chunkSize)) {
      for (let i=0;i<manifest.parts;i++) {
        const value = await cache!.match(part(i));
        if (!value) break;
        const data = new Uint8Array(await value.arrayBuffer());
        if (data.length !== Math.min(chunkSize,size-received)) break;
        bytes.set(data,received); received += data.length; count++;
        progress(received,size);
      }
      committed = received;
      if (received === size) return bytes.buffer;
    }
  } catch { received=0; committed=0; count=0; }
  const response = await openSource(url, sources, received);
  if (received && response.status !== 206) { received=0; committed=0; count=0; }
  const reader = response.body!.getReader();
  async function commit(end: number) {
    if (!cache) return;
    try {
      progress(end,size,true);
      await cache.put(part(count),new Response(bytes.slice(committed,end),{headers:{"Content-Type":"application/octet-stream"}}));
      count++; committed=end;
      await cache.put(manifestKey,new Response(JSON.stringify({size,parts:count}),{headers:{"Content-Type":"application/json"}}));
    } catch { cache=undefined; warning(); }
  }
  try {
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      if (received+value.length>size) throw new Error("モデルのサイズが一致しません。");
      bytes.set(value,received); received+=value.length; progress(received,size);
      while (cache && received-committed>=chunkSize) await commit(committed+chunkSize);
    }
    if (received!==size) throw new Error("モデルの取得が途中で終わりました。再試行すると保存済みの続きから取得します。");
    if (committed<received) await commit(received);
    return bytes.buffer;
  } finally { reader.releaseLock(); }
}
