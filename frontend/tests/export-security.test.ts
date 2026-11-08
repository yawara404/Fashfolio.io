import { describe, expect, it, vi, afterEach } from "vitest";
import { localExportAsset, illustrationSize } from "../utils/exportAssets";
import { sameOriginRequest } from "../utils/requestOrigin";
import { useIllustrationExport } from "../composables/useIllustrationExport";

afterEach(() => vi.unstubAllGlobals());
describe("safe recovered image exports", () => {
  const origin="https://fashfolio.example";
  it("allows local artwork and rejects external, credentialed and executable URLs",()=>{
    expect(localExportAsset("/avatars/jito-girl-v1.png",origin)).toBe(origin+"/avatars/jito-girl-v1.png");
    expect(localExportAsset("blob:"+origin+"/generated",origin)).toContain("blob:");
    expect(localExportAsset("data:image/png;base64,test",origin)).toContain("data:image/png");
    for (const href of ["https://external.example/a.png","//external.example/a.png","http://127.0.0.1/private","javascript:alert(1)","data:text/html,test","https://user:secret@fashfolio.example/image.png","blob:https://external.example/test"])
      expect(()=>localExportAsset(href,origin)).toThrow();
  });
  it("keeps the actual avatar aspect ratio and bounds canvas allocation",()=>{
    expect(illustrationSize("0 0 480 720",1600)).toEqual({width:1600,height:2400});
    expect(illustrationSize("0 0 480 480",800)).toEqual({width:800,height:800});
    for(const width of [NaN,Infinity,0,100000]) expect(()=>illustrationSize("0 0 480 720",width)).toThrow();
    expect(()=>illustrationSize("0 0 0 720",1600)).toThrow();
  });
  it("fails explicitly without an avatar rather than downloading a blank image",async()=>{
    const exporter=useIllustrationExport();
    await exporter.exportPng(null);
    expect(exporter.error.value).toContain("準備できません");
    expect(exporter.exporting.value).toBe(false);
  });
  it("gives a local PNG fallback when clipboard image support is unavailable",async()=>{
    vi.stubGlobal("ClipboardItem",undefined);
    const exporter=useIllustrationExport();
    await exporter.copyPng(null);
    expect(exporter.error.value).toContain("PNGで保存");
    expect(exporter.exporting.value).toBe(false);
  });
});

describe("same-origin local API boundary",()=>{
  const request="https://fashfolio.example/api/prompts";
  it("allows app requests and local server-side clients",()=>{
    expect(sameOriginRequest(request,"https://fashfolio.example","same-origin")).toBe(true);
    expect(sameOriginRequest(request)).toBe(true);
  });
  it("rejects cross-site forms, sibling subdomains and opaque origins",()=>{
    for(const origin of ["https://evil.example","https://sub.fashfolio.example","null","invalid"])
      expect(sameOriginRequest(request,origin)).toBe(false);
    expect(sameOriginRequest(request,undefined,"cross-site")).toBe(false);
    expect(sameOriginRequest(request,undefined,"same-site")).toBe(false);
  });
});
