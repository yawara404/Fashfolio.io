import type { AvatarRig, RigPoint, Side } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import { artworkMesh, type ArtworkAnchor, type ArtworkPiece } from "~/utils/garmentMesh";
import { limbNormal, offsetPoint } from "~/utils/limbGeometry";
import { fitGarmentNeckline } from "~/utils/necklineFitting";

interface SleevePattern {
  shoulder: number;
  chest: number;
  underX: number;
  underY: number;
  neck: number;
}
export interface GeneratedPoseSleeve {
  shoulder: RigPoint;
  underarm: RigPoint;
  shoulderAnchors: ArtworkAnchor[];
  pieces: ArtworkPiece[];
}
const mix = (a: RigPoint, b: RigPoint, t: number): RigPoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Shared by the base T-shirt and every overlaid garment, avoiding doubled caps. */
export function generatePoseArmhole(rig: AvatarRig, side: Side, ease: number) {
  const arm = rig.arms[side === -1 ? "left" : "right"];
  const lift = Math.min(1, Math.abs(arm.mid.x - arm.root.x) / Math.max(1, arm.upper));
  const raised = Math.max(0, (lift - .3) / .7);
  const normal = limbNormal(arm.root, arm.mid, side);
  const shoulder = mix({ x: arm.root.x + side * 3, y: rig.torso.shoulderY }, offsetPoint(arm.root, normal, arm.rootW + ease * .65), raised);
  const underarm = mix({ x: side * (rig.torso.chestHalfW + 5), y: rig.torso.chestY },
    { x: side * (rig.torso.chestHalfW + 5), y: arm.root.y + arm.rootW + ease + 3 }, raised);
  return { raised, normal, shoulder, underarm };
}

/**
 * Build a new cloth surface for the current gesture from the garment's pattern.
 * The supported shoulder cap, dropped underarm and free sleeve edges share one
 * armhole. Original paint, collars and seams travel over this surface unchanged.
 */
export function generatePoseSleeve(rig: AvatarRig, item: Garment, side: Side, pattern: SleevePattern): GeneratedPoseSleeve {
  const arm = rig.arms[side === -1 ? "left" : "right"];
  const tee = item.kind === "tee", trench = item.kind === "trench";
  const knit = ["knit", "cardigan", "hoodie"].includes(item.kind);
  const outer = item.category === "outer", ease = outer ? 6 : 5;
  const softness = knit || tee ? 1 : outer ? .55 : .8;
  const { raised, normal, shoulder, underarm } = generatePoseArmhole(rig, side, ease);
  const lower = limbNormal(arm.mid, arm.end, side);
  const point = (x: number, y: number) => ({ x: side === -1 ? x : 240 - x, y });
  const anchors: ArtworkAnchor[] = [];
  const shoulderAnchors: ArtworkAnchor[] = [];
  const neck = fitGarmentNeckline(rig, item, pattern.neck).edge(side);
  for (const fraction of [.25, .5, .75]) {
    const source = mix(neck.source, point(75, pattern.shoulder), fraction);
    const target = mix(neck.target, shoulder, fraction);
    target.y -= Math.sin(fraction * Math.PI) * 2 * (1-raised);
    shoulderAnchors.push({ source, target });
  }

  const put = (source: RigPoint, target: RigPoint) => anchors.push({ source, target });
  const elbowOuter = offsetPoint(arm.mid, normal, arm.midW + ease);
  // The painted arm is a little fuller than the measured joint on its inner side; the extra ease keeps
  // the sleeve from exposing a thin sliver of skin beside the bodice.
  const elbowInner = offsetPoint(arm.mid, normal, -(arm.midW + ease + 3.2));
  if (tee) {
    const end = mix(arm.root, arm.mid, .45);
    const top = offsetPoint(end, normal, 19 - 5 * raised);
    const bottom = offsetPoint(end, normal, -(6 + 5 * raised));
    for (let i = 0; i <= 6; i++) {
      const f = i / 6;
      const topTarget = mix(shoulder, top, f), bottomTarget = mix(underarm, bottom, f);
      bottomTarget.y += Math.sin(f * Math.PI) * raised * softness * 2;
      put(mix(point(75, pattern.shoulder), point(38, 102), f), topTarget);
      put(mix(point(pattern.underX, pattern.underY), point(67, 124), f), bottomTarget);
    }
    return { shoulder, underarm, shoulderAnchors, pieces: artworkMesh(anchors) };
  }

  const sourceOuter = point(trench ? 51 : 48, pattern.chest), sourceInner = point(trench ? 86 : 87, pattern.chest);
  for (let i = 0; i <= 6; i++) {
    const f = i / 6;
    const top = mix(shoulder, elbowOuter, f), bottom = mix(underarm, elbowInner, f);
    const fullness = Math.sin(f * Math.PI) * (1 - raised) * softness * 1.4;
    top.x += normal.x * fullness; top.y += normal.y * fullness;
    top.y += Math.sin(f * Math.PI) * raised * .6;
    bottom.y += Math.sin(f * Math.PI) * raised * (2 + softness * 2);
    put(mix(point(75, pattern.shoulder), sourceOuter, f), top);
    put(mix(point(pattern.underX, pattern.underY), sourceInner, f), bottom);
  }
  const upperPieces = artworkMesh(anchors);
  anchors.length = 0;
  const cuff = trench ? 176 : knit ? 211 : 187;
  const cuffOuter = point(trench ? 51 : knit ? 49 : 52, cuff), cuffInner = point(trench ? 73 : knit ? 79 : 80, cuff);
  const reach = knit ? 3 : outer ? 2 : 1;
  const length = Math.hypot(arm.end.x - arm.mid.x, arm.end.y - arm.mid.y);
  const cuffCentre = { x: arm.end.x + (arm.end.x - arm.mid.x) / length * reach, y: arm.end.y + (arm.end.y - arm.mid.y) / length * reach };
  const cuffWidth = arm.endW + ease + (knit ? .8 : 0);
  const endOuter = offsetPoint(cuffCentre, lower, cuffWidth), endInner = offsetPoint(cuffCentre, lower, -cuffWidth);
  for (let i = 0; i <= 8; i++) {
    const f = i / 8, drop = Math.sin(f * Math.PI);
    const top = mix(elbowOuter, endOuter, f), bottom = mix(elbowInner, endInner, f);
    // Gravity changes the free lower edge, while the upper edge rests on the arm.
    top.y += drop * (raised * .7 + (1 - raised) * 1.5);
    bottom.y += drop * (raised * (2.5 + softness * 3) + (1 - raised) * 2.5);
    put(mix(sourceOuter, cuffOuter, f), top);
    put(mix(sourceInner, cuffInner, f), bottom);
  }
  return { shoulder, underarm, shoulderAnchors, pieces: [...upperPieces, ...artworkMesh(anchors)] };
}
