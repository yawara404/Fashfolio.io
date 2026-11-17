import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat, rename, unlink, open, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export const DIFFUSION_REVISION = "ace89b7d2cd849f9a73914cdbb8a3ea60c853dd1";
export const DIFFUSION_MODELS = {
  text: {path:"text_encoder/model.onnx",size:681393168},
  unet: {path:"unet/model.onnx",size:1733430199},
  vae: {path:"vae_decoder/model.onnx",size:99094314},
  encoder: {path:"vae_encoder/model.onnx",size:68430468},
} as const;
const pending = new Map<string,Promise<string>>();
async function fileSize(path:string) { try{return (await stat(path)).size;}catch{return 0;} }
async function acquire(path:string,size:number) {
  const lockPath=path+".lock";
  for(let attempt=0;attempt<4500;attempt++) {
    if(await fileSize(path)===size) return null;
    try {const handle=await open(lockPath,"wx");await handle.writeFile(String(process.pid));return {handle,lockPath};}
    catch(error) {
      if((error as NodeJS.ErrnoException).code!=="EEXIST") throw error;
      let stale=false;
      try {const pid=Number(await readFile(lockPath,"utf8"));if(pid>0){try{process.kill(pid,0);}catch(e){stale=(e as NodeJS.ErrnoException).code==="ESRCH";}}else stale=Date.now()-(await stat(lockPath)).mtimeMs>5000;}
      catch {continue;}
      if(stale) {await unlink(lockPath).catch(()=>{});continue;}
      await new Promise(resolve=>setTimeout(resolve,200));
    }
  }
  throw new Error("Model preparation is still running; retry shortly");
}
export function modelCacheDir() {
  return process.env.FASHFOLIO_MODEL_CACHE || resolve(process.cwd(), ".cache/diffusion-models");
}
export async function cachedModelPath(name: keyof typeof DIFFUSION_MODELS, directory = modelCacheDir()) {
  const model = DIFFUSION_MODELS[name];
  const path = join(directory, `${DIFFUSION_REVISION}-${name}.onnx`);
  return (await fileSize(path)) === model.size ? path : null;
}
const mirroredModels = new Set<string>();
const pendingMirrors = new Map<string, Promise<boolean>>();
export function mirrorModelToR2(
  apiBase: string,
  name: keyof typeof DIFFUSION_MODELS,
  directory = modelCacheDir(),
): Promise<boolean> {
  if (mirroredModels.has(name)) return Promise.resolve(true);
  const existing = pendingMirrors.get(name);
  if (existing) return existing;
  const task = (async () => {
    const filePath = await cachedModelPath(name, directory);
    if (!filePath) return false;
    const target = `${apiBase}/api/storage/models/${DIFFUSION_REVISION}/${name}`;
    try {
      let response = await fetch(target, { method: "POST", signal: AbortSignal.timeout(10000) });
      if (response.status === 422) {
        const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
        response = await fetch(target, {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: stream,
          duplex: "half",
        } as RequestInit & { duplex: "half" });
      }
      if (!response.ok) return false;
      mirroredModels.add(name);
      return true;
    } catch {
      return false;
    } finally {
      pendingMirrors.delete(name);
    }
  })();
  pendingMirrors.set(name, task);
  return task;
}
export async function syncCachedModelsToR2(apiBase: string, directory = modelCacheDir()) {
  const keys = Object.keys(DIFFUSION_MODELS) as Array<keyof typeof DIFFUSION_MODELS>;
  const cached: Array<keyof typeof DIFFUSION_MODELS> = [];
  for (const key of keys) {
    if (await cachedModelPath(key, directory)) cached.push(key);
  }
  const queued: string[] = [];
  for (const key of cached) {
    if (await mirrorModelToR2(apiBase, key, directory)) queued.push(key);
  }
  return queued;
}
export function diffusionModelFile(name:keyof typeof DIFFUSION_MODELS, directory=modelCacheDir()) {
  const model=DIFFUSION_MODELS[name], path=join(directory,`${DIFFUSION_REVISION}-${name}.onnx`);
  if(!pending.has(path)) {
    const job=(async()=>{
      await mkdir(directory,{recursive:true});
      if(await fileSize(path)===model.size) return path;
      const lease=await acquire(path,model.size);
      if(!lease) return path;
      try {
      const partial=path+".part";let offset=await fileSize(partial);
      if(offset>model.size) {await unlink(partial);offset=0;}
      if(offset<model.size) {
        const url=`https://huggingface.co/schmuell/sd-turbo-ort-web/resolve/${DIFFUSION_REVISION}/${model.path}`;
        const response=await fetch(url,offset ? {headers:{Range:`bytes=${offset}-`}} : undefined);
        if(!response.ok || !response.body) throw new Error(`Model download failed: ${response.status}`);
        if(offset && response.status!==206) offset=0;
        const length=Number(response.headers.get("content-length"));
        if(length && length!==model.size-offset) throw new Error("Unexpected model size");
        await pipeline(Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]),createWriteStream(partial,{flags:offset ? "a" : "w"}));
      }
      if(await fileSize(partial)!==model.size) throw new Error("Model download incomplete; retry to resume");
      await rename(partial,path);
      return path;
      } finally {await lease.handle.close();await unlink(lease.lockPath).catch(()=>{});}
    })().finally(()=>pending.delete(path));
    pending.set(path,job);
  }
  return pending.get(path)!;
}
export { createReadStream };
