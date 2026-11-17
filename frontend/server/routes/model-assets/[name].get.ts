import { createError, defineEventHandler, getRouterParam, getHeader, setHeader, setResponseStatus, sendStream } from "h3";
import { Readable } from "node:stream";
import { DIFFUSION_MODELS, DIFFUSION_REVISION, diffusionModelFile, createReadStream } from "../../utils/diffusionModels";
import { modelRange } from "../../utils/modelRange";

export default defineEventHandler(async event=>{
  const name=getRouterParam(event,"name") || "";
  if(!Object.prototype.hasOwnProperty.call(DIFFUSION_MODELS,name)) throw createError({statusCode:404,statusMessage:"Unknown model"});
  if(getHeader(event,"sec-fetch-site")==="cross-site") throw createError({statusCode:403,statusMessage:"Same-origin models only"});
  const key=name as keyof typeof DIFFUSION_MODELS;
  const etag=`"${DIFFUSION_REVISION}-${name}"`;
  setHeader(event,"ETag",etag);
  setHeader(event,"Accept-Ranges","bytes");
  setHeader(event,"Cache-Control","public, max-age=31536000, immutable");
  if (getHeader(event,"if-none-match") === etag) {setResponseStatus(event,304);return null;}
  const range=modelRange(getHeader(event,"range"),DIFFUSION_MODELS[key].size);
  if(range === "invalid") {setHeader(event,"Content-Range",`bytes */${DIFFUSION_MODELS[key].size}`);throw createError({statusCode:416,statusMessage:"Invalid model range"});}
  // Read immutable model objects from private R2 through a server-side signed URL.
  // No bucket credentials, signed links or CORS setup are needed in the browser.
  const timeout=new AbortController(), deadline=setTimeout(()=>timeout.abort(),4000);
  try {
    const config=useRuntimeConfig(event);
    const remote=await fetch(`${config.apiBase}/api/storage/models/${DIFFUSION_REVISION}/${name}`,{signal:timeout.signal,headers:range?{Range:`bytes=${range.start}-${range.end}`}:{}});
    clearTimeout(deadline);
    const expected=range?range.end-range.start+1:DIFFUSION_MODELS[key].size;
    if(remote.ok && remote.body && Number(remote.headers.get("Content-Length"))===expected && remote.status===(range?206:200)) {
      setResponseStatus(event,remote.status);
      setHeader(event,"Content-Type","application/octet-stream");setHeader(event,"Content-Length",expected);
      if(range)setHeader(event,"Content-Range",`bytes ${range.start}-${range.end}/${DIFFUSION_MODELS[key].size}`);
      return sendStream(event,Readable.fromWeb(remote.body as Parameters<typeof Readable.fromWeb>[0]));
    }
    await remote.body?.cancel();
  } catch { /* R2 is optional; retain the resumable local model mirror. */ }
  finally {clearTimeout(deadline);}
  try {
    const path=await diffusionModelFile(key);
    setHeader(event,"Content-Type","application/octet-stream");
    setHeader(event,"Content-Length",range?range.end-range.start+1:DIFFUSION_MODELS[key].size);
    if(range) {setResponseStatus(event,206);setHeader(event,"Content-Range",`bytes ${range.start}-${range.end}/${DIFFUSION_MODELS[key].size}`);}
    return sendStream(event,createReadStream(path,range||undefined));
  } catch {throw createError({statusCode:503,statusMessage:"Model preparation failed; retry to resume"});}
});
