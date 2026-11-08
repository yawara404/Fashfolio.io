import { describe, expect, it } from "vitest";
import { characterGeometry, characterOutline, characterHeadRig } from "../utils/mannequinGeometry";

describe("hand drawn character anatomy", () => {
  it("keeps the whole skeleton in one canonical space across all three proportions", () => {
    for (const gender of ["girl", "boy"] as const) {
      const frames = [5, 6, 7].map((n) => characterGeometry(n, gender));
      for (const frame of frames) {
        const r = frame.rig;
        expect(r.torso).toEqual(frames[0]!.rig.torso);
        expect(r.arms).toEqual(frames[0]!.rig.arms);
        expect(r.legs).toEqual(frames[0]!.rig.legs);
        expect(r.groundY).toBe(380);
        expect(frame.origin + r.groundY / 100 * frame.unit * frame.sy).toBeCloseTo(654);
        for (const side of ["left", "right"] as const) {
          expect(r.arms[side].mid.y).toBeGreaterThan(r.torso.chestY);
          expect(r.arms[side].mid.y).toBeLessThan(r.torso.hipY);
          expect(r.arms[side].end.y).toBeGreaterThan(r.torso.crotchY);
          expect(r.legs[side].mid.y).toBeGreaterThan(r.torso.crotchY);
          expect(r.legs[side].mid.y).toBeLessThan(r.legs[side].end.y);
        }
      }
      expect(new Set(frames.map((f) => f.body)).size).toBe(3);
    }
  });
  it("draws an organic closed body with cubic curves and separates the uniformly scaled head", () => {
    for (const gender of ["girl", "boy"] as const) {
      const frame = characterGeometry(5, gender);
      const path = characterOutline(frame.rig);
      expect(path).toMatch(/^M.*Z$/);
      expect(path).not.toMatch(/[LHV]|NaN|Infinity|undefined/);
      const head = characterHeadRig(frame.rig);
      expect(head.head.crownY).toBe(0);
      expect(head.head.chinY).toBeCloseTo(100);
      expect(frame.head).not.toBe(frame.body);
    }
    expect(characterGeometry(Number.NaN, "girl").body).not.toContain("NaN");
  });
});
