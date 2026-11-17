import { defineEventHandler } from "h3";
import { syncCachedModelsToR2 } from "../../../utils/diffusionModels";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const synced = await syncCachedModelsToR2(config.apiBase);
  return { synced };
});
