import type { StudioPoseId } from "~/types/avatar";
import type { LimbAngles, LimbKey } from "~/utils/avatarRig";

export interface StudioPose {
  id: StudioPoseId;
  name: string;
  en: string;
  caption: string;
  generationPrompt: string;
  /** Null retains the measured joints of the original illustration. */
  arms: Record<LimbKey, LimbAngles> | null;
}

/** Supported illustrated poses. The picker and rig both read this registry. */
export const studioPoses: readonly StudioPose[] = [
  { id: "relax", name: "自然立ち", en: "RELAXED", caption: "腕を下ろした、いつもの立ち姿", generationPrompt: "relaxed arms down", arms: null },
  { id: "t-pose", name: "Tポーズ", en: "T-POSE", caption: "両腕を水平に広げて、袖やシルエットを確認", generationPrompt: "arms extended horizontally in T pose", arms: { left: { root: 90, mid: 90 }, right: { root: 90, mid: 90 } } },
];

export function resolveStudioPose(id?: string): StudioPose {
  return studioPoses.find(pose => pose.id === id) ?? studioPoses[0]!;
}
