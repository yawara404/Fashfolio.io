import type { AvatarRig, RigPoint, Side } from "~/utils/avatarRig";
import type { Garment } from "~/types/wardrobe";
import type { ArtworkAnchor } from "~/utils/garmentMesh";

/** Fit the drawn collar separately from the yoke, so it wraps the neck rather
 * than inheriting the much longer neck-to-chest stretch of a blouse. */
export function fitGarmentNeckline(rig: AvatarRig, item: Garment, sourceY: number) {
  const t = rig.torso;
  const highNeck = item.kind === "knit";
  const trench = item.kind === "trench";
  const lapel = ["trench", "blazer", "blouson"].includes(item.kind);
  const sailor = item.kind === "sailor";
  const aspect = rig.detailScaleY || 1;
  const scale = sailor ? .98 : .9;
  const anchorY = trench ? 35 : sailor ? 46 : 47;
  const lift = sailor ? Math.max(0, ...(["left", "right"] as const).map(k => {
    const arm = rig.arms[k], r = Math.min(1, Math.abs(arm.mid.x - arm.root.x) / Math.max(1, arm.upper));
    const raised = Math.max(0, (r - .3) / .7);
    const dy = arm.mid.y - arm.root.y, dx = (arm.mid.x - arm.root.x) * arm.side, len = Math.hypot(dx, dy) || 1;
    const sy = t.shoulderY * (1 - raised) + (arm.root.y - dx / len * (arm.rootW + 5 * .65)) * raised;
    return t.shoulderY - sy;
  })) * .8 : 0;
  const baseNeckY = sailor ? t.shoulderY - 7 - lift : t.shoulderY - 5;
  const map = (sx: number, sy: number): RigPoint => ({
    x: (sx - 120) * scale,
    y: baseNeckY + (sy - anchorY) * scale * aspect,
  });
  const neckHalfX = trench ? 20 : 21;
  const edge = (side: Side): ArtworkAnchor => ({
    source: { x: 120 + side * neckHalfX, y: highNeck ? 45 : sourceY },
    target: highNeck
      ? { x: side * (t.neckHalfW + 4.5), y: t.shoulderY - 4 }
      : map(120 + side * neckHalfX, sourceY),
  });
  const anchors: ArtworkAnchor[] = [edge(-1), edge(1)];
  if (highNeck) {
    // Follow the original curved collar seam and its ribs with a short,
    // slightly flared tube. A shallow opening leaves the neck visible above it.
    for (const f of [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1]) {
      const curve = 1 - f * f;
      for (const row of [0, .5, 1]) {
        const top = t.neckTopY + 5 + .8 * curve;
        const bottom = t.shoulderY + 1 + 4 * curve;
        const source: RigPoint = { x: 120 + 18 * f, y: 30 + (25 + 6.5 * curve) * row };
        const target: RigPoint = { x: f * (t.neckHalfW + 1.3 + 2.2 * row), y: top + (bottom - top) * row };
        anchors.push({ source, target });
      }
    }
    anchors.push({ source: { x: 120, y: 76 }, target: { x: 0, y: t.shoulderY + 19 } });
  } else if (lapel) {
    const apexY = trench ? 114 : 126, tipY = trench ? 108 : 113;
    for (const side of [-1, 1] as const) {
      anchors.push(
        { source: { x: 120 + side * 11, y: 80 }, target: map(120 + side * 11, 80) },
        { source: { x: 120 + side * 3, y: tipY }, target: map(120 + side * 3, tipY) },
      );
    }
    anchors.push(
      { source: { x: 120, y: 65 }, target: map(120, 65) },
      { source: { x: 120, y: 95 }, target: map(120, 95) },
      { source: { x: 120, y: apexY }, target: map(120, apexY) },
    );
  } else {
    anchors.push(
      { source: { x: 120, y: sourceY + 11 }, target: map(120, sourceY + 11) },
      { source: { x: 120, y: 65 }, target: map(120, 65) },
      { source: { x: 120, y: 76 }, target: { x: 0, y: t.shoulderY + 19 } },
    );
  }
  return { edge, anchors };
}
