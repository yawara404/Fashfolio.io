import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useAvatar } from "../composables/useAvatar";
import { useWardrobe } from "../composables/useWardrobe";
import { studioPoses, resolveStudioPose } from "../data/studioPoses";
import { resolveAvatar } from "../data/avatarPresets";
import { artworkBodyY } from "../data/characterArtwork";
import { characterGeometry } from "../utils/mannequinGeometry";
import { posedBodyArtwork } from "../utils/posedBodyArtwork";
import MannequinPreview from "../components/MannequinPreview.vue";
import TryOnWardrobe from "../components/TryOnWardrobe.vue";
import catalog from "../data/wardrobe.json";
import type { Catalog } from "../types/wardrobe";

beforeEach(() => setActivePinia(createPinia()));

describe("extensible illustrated studio poses", () => {
  it("keeps a petite default body, the original face scale and the shared ground line", () => {
    for (const gender of ["girl", "boy"] as const) for (const pose of studioPoses) {
      const frame = characterGeometry(5, gender, pose.id);
      const hipWidthInHeads = frame.rig.torso.hipHalfW * 2 * frame.sx / 100;
      const thighWidthInHeads = frame.rig.legs.left.rootW * 2 * frame.sx / 100;
      expect(hipWidthInHeads).toBeLessThan(.95);
      expect(thighWidthInHeads).toBeLessThan(.47);
      expect(frame.head).toBe(`translate(240 42) scale(${612 / 5})`);
      expect(frame.ground).toBe(654);
    }
  });

  it("changes pose independently from the fixed character appearance and gender", () => {
    const avatar = useAvatar();
    const original = { ...avatar.config };
    avatar.setPose("t-pose");
    expect(avatar.config).toEqual({ ...original, pose: "t-pose" });
    avatar.setGender("boy");
    expect(avatar.config.pose).toBe("t-pose");
    expect(resolveAvatar(avatar.config).pose).toBe("t-pose");
    avatar.setPose("unknown");
    expect(avatar.config.pose).toBe("t-pose");
    expect(resolveStudioPose("unknown").id).toBe("relax");
    expect(resolveAvatar({ pose: "wave" }).pose).toBe("relax");
  });

  it("extends both arms horizontally without changing the torso, legs, or bone lengths", () => {
    for (const gender of ["girl", "boy"] as const) for (const heads of [5, 6, 7]) {
      const rest = characterGeometry(heads, gender), posed = characterGeometry(heads, gender, "t-pose");
      expect(posed.rig.torso).toEqual(rest.rig.torso);
      expect(posed.rig.legs).toEqual(rest.rig.legs);
      expect(posed.head).toBe(rest.head);
      for (const key of ["left", "right"] as const) {
        const arm = posed.rig.arms[key], hand = posed.rig.hands[key];
        expect(arm.mid.y).toBeCloseTo(arm.root.y);
        expect(arm.end.y).toBeCloseTo(arm.root.y);
        expect(hand.tip.y).toBeCloseTo(arm.root.y);
        expect(Math.hypot(arm.mid.x - arm.root.x, arm.mid.y - arm.root.y)).toBeCloseTo(rest.rig.arms[key].upper);
        expect(Math.hypot(arm.end.x - arm.mid.x, arm.end.y - arm.mid.y)).toBeCloseTo(rest.rig.arms[key].lower);
        const x = 240 + hand.tip.x * posed.unit * posed.sx / 100;
        expect(x).toBeGreaterThan(posed.stageX + 10);
        expect(x).toBeLessThan(posed.stageX + posed.stageWidth - 10);
      }
    }
  });

  it("reuses the original skin pixels with no inverted arm tiles", () => {
    const rest = characterGeometry(5, "girl").rig;
    expect(posedBodyArtwork(rest, rest)).toEqual([]);
    const arms = posedBodyArtwork(rest, characterGeometry(5, "girl", "t-pose").rig);
    expect(arms).toHaveLength(2);
    for (const arm of arms) for (const piece of arm.pieces) {
      const [a, b, c, d] = piece.transform.slice(7, -1).split(" ").map(Number);
      expect(a! * d! - b! * c!).toBeGreaterThan(0);
    }
    const wrapper = mount(MannequinPreview, { props: { heads: 5, pose: "t-pose", selected: [], palette: [], dressed: false, guides: false, paletteColors: false } });
    expect(wrapper.attributes("data-pose")).toBe("t-pose");
    expect(wrapper.find('image[data-artwork="body"]').attributes("href")).toBe("/avatars/jito-base-v1.png");
    expect(wrapper.findAll("[data-artwork-arm]")).toHaveLength(arms.flatMap(arm => arm.pieces).length);
    expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe("/avatars/jito-girl-v1.png");
    wrapper.unmount();
  });

  it("overlaps the original neck pixels across the head/body seam at every proportion", () => {
    for (let heads = 4; heads <= 10; heads += .25) {
      const frame = characterGeometry(heads, "girl");
      const headNeckBottom = 42 + frame.neckOverlap * frame.unit;
      const bodyNeckTop = frame.origin + artworkBodyY(290) / 100 * frame.unit * frame.sy;
      expect(headNeckBottom).toBeGreaterThan(bodyNeckTop + 1);
      // Stay above the fixed sailor collar in the portrait asset.
      expect(frame.neckOverlap).toBeLessThan(1.1);
    }
  });

  it("offers the pose registry as a clothing-library category and applies the selection", async () => {
    const wardrobe = useWardrobe(), avatar = useAvatar();
    wardrobe.catalog = catalog as Catalog;
    const selections = { ...wardrobe.selections };
    const wrapper = mount(TryOnWardrobe);
    await wrapper.get('button[aria-label="ポーズ"]').trigger("click");
    expect(avatar.browsingPoses).toBe(true);
    expect(wrapper.findAll(".pose-item")).toHaveLength(studioPoses.length);
    await wrapper.get('button[aria-label="Tポーズ"]').trigger("click");
    expect(avatar.pose.id).toBe("t-pose");
    expect(wardrobe.selections).toEqual(selections);
    await wrapper.get('input[type="search"]').setValue("ないポーズ");
    expect(wrapper.findAll(".pose-item")).toHaveLength(0);
    expect(wrapper.text()).toContain("条件に合うポーズがありません");
    wrapper.unmount();
  });

  it("saves the pose with the coordinate and opens old coordinates in the default pose", () => {
    const wardrobe = useWardrobe(), avatar = useAvatar();
    wardrobe.catalog = catalog as Catalog;
    wardrobe.selections = { tops: "ribbon-blouse" };
    avatar.setPose("t-pose");
    wardrobe.save();
    const saved = wardrobe.saved[0]!;
    expect(saved.pose).toBe("t-pose");
    avatar.setPose("relax");
    wardrobe.load(saved);
    expect(avatar.pose.id).toBe("t-pose");
    const legacy = { ...saved, pose: undefined };
    wardrobe.load(legacy);
    expect(avatar.pose.id).toBe("relax");
  });
});
