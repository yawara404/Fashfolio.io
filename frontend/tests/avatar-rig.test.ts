import { describe, expect, it } from "vitest";
import {
  buildRig,
  clampHeads,
  HEAD_MAX,
  HEAD_MIN,
  POSES,
  rigBoxes,
  STAGE_HEIGHT,
  STAGE_WIDTH,
} from "../utils/avatarRig";

const HEADS = [4, 4.5, 5, 5.5, 6, 7, 7.5, 8, 9, 10];

describe("avatar rig proportions", () => {
  it("clamps the head count into the supported range", () => {
    expect(clampHeads(1)).toBe(HEAD_MIN);
    expect(clampHeads(99)).toBe(HEAD_MAX);
    expect(clampHeads(Number.NaN)).toBe(5);
    expect(clampHeads(6.24)).toBe(6.2);
  });

  it("keeps the feet on the same ground line for every head count", () => {
    const grounds = HEADS.map((heads) => buildRig({ heads }).groundY);
    for (const ground of grounds) {
      expect(ground).toBeCloseTo(grounds[0]!, 5);
      expect(ground).toBeLessThanOrEqual(STAGE_HEIGHT);
    }
  });

  it("orders every joint from head to toe without inversions", () => {
    for (const heads of HEADS) {
      const rig = buildRig({ heads });
      const { head, torso } = rig;
      expect(head.crownY).toBeLessThan(head.chinY);
      expect(head.chinY).toBeLessThan(torso.shoulderY);
      expect(torso.shoulderY).toBeLessThan(torso.chestY);
      expect(torso.chestY).toBeLessThan(torso.waistY);
      expect(torso.waistY).toBeLessThan(torso.crotchY);
      for (const key of ["left", "right"] as const) {
        const leg = rig.legs[key];
        const foot = rig.feet[key];
        expect(leg.root.y).toBeLessThan(leg.mid.y);
        expect(leg.mid.y).toBeLessThan(leg.end.y);
        expect(leg.end.y).toBeLessThan(foot.groundY);
        expect(foot.groundY).toBeCloseTo(rig.groundY, 5);
      }
    }
  });

  it("grows the head exactly one unit and splits the body over the rest", () => {
    for (const heads of HEADS) {
      const rig = buildRig({ heads });
      const { segments } = rig;
      expect(segments.head).toBeCloseTo(rig.unit, 5);
      const total =
        segments.head +
        segments.neck +
        segments.torso +
        segments.thigh +
        segments.shin +
        segments.foot;
      expect(total / rig.unit).toBeCloseTo(heads, 4);
      /* 旧実装のバグ（スネだけが伸びる）が起きていないことの確認 */
      const shinRatio = segments.shin / segments.thigh;
      expect(shinRatio).toBeGreaterThan(0.6);
      expect(shinRatio).toBeLessThan(1.15);
      const torsoRatio = segments.torso / segments.thigh;
      expect(torsoRatio).toBeGreaterThan(0.75);
      expect(torsoRatio).toBeLessThan(1.6);
    }
  });

  it("shrinks the head in px as the head count grows", () => {
    const small = buildRig({ heads: 5 }).unit;
    const tall = buildRig({ heads: 9 }).unit;
    expect(tall).toBeLessThan(small);
    expect(small / tall).toBeCloseTo(9 / 5, 1);
  });

  it("keeps the whole figure inside the stage for every pose", () => {
    for (const pose of POSES) {
      for (const heads of HEADS) {
        const rig = buildRig({ heads, pose: pose.id });
        const boxes = rigBoxes(rig);
        const points = [
          ...Object.values(rig.arms).flatMap((arm) => [
            arm.root,
            arm.mid,
            arm.end,
          ]),
          ...Object.values(rig.hands).map((hand) => hand.tip),
          ...Object.values(rig.legs).flatMap((leg) => [
            leg.root,
            leg.mid,
            leg.end,
          ]),
          ...Object.values(rig.feet).map((foot) => foot.toe),
        ];
        for (const point of points) {
          expect(point.x).toBeGreaterThan(-40);
          expect(point.x).toBeLessThan(STAGE_WIDTH + 40);
          expect(point.y).toBeGreaterThan(-6);
          expect(point.y).toBeLessThan(STAGE_HEIGHT + 6);
        }
        expect(boxes.head.width).toBeGreaterThan(0);
        expect(Number.isFinite(rig.unit)).toBe(true);
      }
    }
  });

  it("never produces NaN coordinates for any body type", () => {
    for (const body of ["soft", "slim", "round"] as const) {
      for (const heads of HEADS) {
        const rig = buildRig({ heads, body });
        const serialized = JSON.stringify(rig);
        expect(serialized).not.toMatch(/NaN|Infinity|null/);
      }
    }
  });
});
