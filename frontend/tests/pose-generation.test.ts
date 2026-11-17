import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { reactive } from "vue";
import { stringify } from "devalue";
import { usePoseGeneration } from "../composables/usePoseGeneration";
import { useDeviceGeneration } from "../composables/useDeviceGeneration";
import { preparePoseReference, type PoseRenderInput } from "../utils/poseReference";
import { readPoseRender, writePoseRender } from "../utils/poseRenderCache";
import catalog from "../data/wardrobe.json";
import type { Garment } from "../types/wardrobe";

vi.mock("../composables/useDeviceGeneration", () => ({useDeviceGeneration:vi.fn()}));
vi.mock("../utils/poseReference", async original => ({...await original<typeof import("../utils/poseReference")>(), preparePoseReference:vi.fn()}));
vi.mock("../utils/poseRenderCache", () => ({readPoseRender:vi.fn(),writePoseRender:vi.fn()}));
let device: ReturnType<typeof createDevice>;
function createDevice() { return reactive({ready:true,busy:false,supported:true,phase:"idle",detect:vi.fn().mockResolvedValue(undefined),prepare:vi.fn(),cancel:vi.fn(),renderTryOn:vi.fn()}); }
const input: PoseRenderInput = {heads:5,gender:"girl",pose:"relax",selected:[catalog.items.find(item => item.category === "tops") as Garment],palette:[],paletteColors:false};
const svg = () => document.createElementNS("http://www.w3.org/2000/svg","svg");
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks(); setActivePinia(createPinia());
  device=createDevice(); vi.mocked(useDeviceGeneration).mockReturnValue(device as never);
  vi.mocked(readPoseRender).mockResolvedValue(undefined); vi.mocked(writePoseRender).mockResolvedValue(undefined);
  vi.mocked(preparePoseReference).mockResolvedValue({reference:new Blob(),mask:new Blob(),bounds:{x:0,y:0,width:480,height:480}});
  vi.stubGlobal("URL",{createObjectURL:vi.fn().mockReturnValue("blob:rendered-clothing"),revokeObjectURL:vi.fn()});
});
afterEach(() => {vi.useRealTimers();vi.unstubAllGlobals();});

describe("automatic pose image generation", () => {
  it("keeps engine functions out of the SSR payload", () => {
    const pinia=createPinia(); setActivePinia(pinia); usePoseGeneration();
    expect(() => stringify(pinia.state.value)).not.toThrow();
  });
  it("shows only the latest requested pose when an old GPU job finishes late", async () => {
    const pending: ((image: Blob) => void)[]=[];
    device.renderTryOn.mockImplementation(() => {device.busy=true;return new Promise<Blob>(resolve=>pending.push(image=>{device.busy=false;resolve(image);}));});
    const store=usePoseGeneration(); await store.update(input,svg); await store.enable();
    await vi.advanceTimersByTimeAsync(500); expect(device.renderTryOn).toHaveBeenCalledTimes(1);
    await store.update({...input,pose:"t-pose"},svg);
    pending.shift()!(new Blob(["relax"])); await vi.advanceTimersByTimeAsync(500);
    expect(store.render).toBeNull(); expect(device.renderTryOn).toHaveBeenCalledTimes(2);
    pending.shift()!(new Blob(["t-pose"])); await vi.advanceTimersByTimeAsync(0);
    expect(store.render?.imageUrl).toBe("blob:rendered-clothing");
    expect(vi.mocked(writePoseRender).mock.calls.at(-1)![0].key).toContain("t-pose");
  });
  it("reuses a saved result without preparing or invoking the model", async () => {
    vi.mocked(readPoseRender).mockResolvedValue({key:"cached",image:new Blob(),bounds:{x:0,y:0,width:480,height:480},createdAt:1});
    const store=usePoseGeneration(); await store.update(input,svg); await store.enable(); await vi.advanceTimersByTimeAsync(500);
    expect(store.render?.imageUrl).toBe("blob:rendered-clothing");
    expect(device.prepare).not.toHaveBeenCalled(); expect(device.renderTryOn).not.toHaveBeenCalled();
    store.disable(); await store.update({...input,pose:"t-pose"},svg);
    expect(store.render).toBeNull();
  });
});
