import { afterEach, describe, expect, it, vi } from "vitest";
import { chunkedModel, fileModel } from "../utils/modelCache";
import { webcrypto } from "node:crypto";

function memoryCache() {
  const values=new Map<string,Response>();
  return { values, match:vi.fn(async(key:string)=>values.get(key)?.clone()), put:vi.fn(async(key:string,response:Response)=>{values.set(key,response.clone());}) };
}
afterEach(()=>vi.unstubAllGlobals());
describe("large diffusion model cache",()=>{
  it("stores model bytes in OPFS and reloads them without another request",async()=>{
    let stored=new Uint8Array(0);
    const access={getSize:()=>stored.length,read:(data:Uint8Array,{at}:{at:number})=>{const slice=stored.subarray(at,at+data.length);data.set(slice);return slice.length;},
      write:(data:Uint8Array,{at}:{at:number})=>{if(at+data.length>stored.length){const grown=new Uint8Array(at+data.length);grown.set(stored);stored=grown;}stored.set(data,at);return data.length;},
      truncate:(length:number)=>{stored=stored.slice(0,length);},flush:vi.fn(),close:vi.fn()};
    const directory={getFileHandle:vi.fn().mockResolvedValue({createSyncAccessHandle:vi.fn().mockResolvedValue(access)})};
    vi.stubGlobal("navigator",{storage:{getDirectory:vi.fn().mockResolvedValue({getDirectoryHandle:vi.fn().mockResolvedValue(directory)})}});
    vi.stubGlobal("crypto",webcrypto);
    const fetch=vi.fn().mockResolvedValue(new Response(Uint8Array.from([1,2,3,4])));vi.stubGlobal("fetch",fetch);
    const first=await fileModel("https://model.test/file",4,undefined,vi.fn(),vi.fn());
    const second=await fileModel("https://model.test/file",4,undefined,vi.fn(),vi.fn());
    expect([...new Uint8Array(first!)]).toEqual([1,2,3,4]);expect(second).toEqual(first);
    expect(fetch).toHaveBeenCalledOnce();expect(access.close).toHaveBeenCalledTimes(2);
  });
  it("stores bounded entries and reads the complete model without another download",async()=>{
    const cache=memoryCache(), source=Uint8Array.from([1,2,3,4,5,6,7,8,9,10]);
    const fetch=vi.fn().mockResolvedValue(new Response(source));vi.stubGlobal("fetch",fetch);
    const result=await chunkedModel("https://model.test/weights",10,cache as never,vi.fn(),vi.fn(),4);
    expect([...new Uint8Array(result)]).toEqual([...source]);
    const chunks=[...cache.values.entries()].filter(([key])=>key.includes("chunk="));
    expect(chunks).toHaveLength(3);
    for(const [,response] of chunks) expect((await response.clone().arrayBuffer()).byteLength).toBeLessThanOrEqual(4);
    const cached=await chunkedModel("https://model.test/weights",10,cache as never,vi.fn(),vi.fn(),4);
    expect([...new Uint8Array(cached)]).toEqual([...source]); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("resumes an interrupted download from a complete cached chunk",async()=>{
    const cache=memoryCache(), url="https://model.test/resume";
    await cache.put(`${url}?fashfolio-chunk=0`,new Response(Uint8Array.from([1,2,3,4])));
    await cache.put(`${url}?fashfolio-manifest=1`,new Response(JSON.stringify({size:8,parts:1})));
    const fetch=vi.fn().mockResolvedValue(new Response(Uint8Array.from([5,6,7,8]),{status:206}));vi.stubGlobal("fetch",fetch);
    const result=await chunkedModel(url,8,cache as never,vi.fn(),vi.fn(),4);
    expect(fetch).toHaveBeenCalledWith(url,{headers:{Range:"bytes=4-"}});
    expect([...new Uint8Array(result)]).toEqual([1,2,3,4,5,6,7,8]);
  });
  it("continues generation when model caching is unavailable",async()=>{
    const cache=memoryCache(), warn=vi.fn();cache.put.mockRejectedValue(new Error("quota"));
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(Uint8Array.from([1,2,3,4]))));
    const result=await chunkedModel("https://model.test/no-cache",4,cache as never,vi.fn(),warn,2);
    expect([...new Uint8Array(result)]).toEqual([1,2,3,4]);expect(warn).toHaveBeenCalledOnce();
  });
});
