import type { RigPoint, Side } from "~/utils/avatarRig";

/** Local sleeve/skin cross-section. Outward becomes upward in a T-pose. */
export function limbNormal(from: RigPoint, to: RigPoint, side: Side): RigPoint {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: side * (to.y - from.y) / length, y: -side * (to.x - from.x) / length };
}
export function offsetPoint(point: RigPoint, normal: RigPoint, distance: number): RigPoint {
  return { x: point.x + normal.x * distance, y: point.y + normal.y * distance };
}
