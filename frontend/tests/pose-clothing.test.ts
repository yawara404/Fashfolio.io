import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import catalog from "../data/wardrobe.json";
import { characterGeometry } from "../utils/mannequinGeometry";
import { generatePoseSleeve } from "../utils/generatePoseClothing";
import { fitCatalogArtwork } from "../utils/catalogFitting";
import MannequinPreview from "../components/MannequinPreview.vue";
import type { ArtworkPiece } from "../utils/garmentMesh";
import type { Garment } from "../types/wardrobe";

const items = catalog.items as Garment[];
const project = (pieces: ArtworkPiece[], x: number, y: number) => {
  const piece = pieces.filter(piece=>!piece.layer||piece.layer === "body").find(piece => {
    const p = (piece.sourceTriangle||piece.clip).split(" ").map(Number);
    const cross = [0, 2, 4].map(i => { const j = (i + 2) % 6; return (p[j]! - p[i]!) * (y - p[i + 1]!) - (p[j + 1]! - p[i + 1]!) * (x - p[i]!); });
    return cross.every(v => v >= -.001) || cross.every(v => v <= .001);
  });
  expect(piece, `source landmark ${x},${y}`).toBeDefined();
  const [a, b, c, d, e, f] = piece!.transform.slice(7, -1).split(" ").map(Number);
  return { x: a! * x + c! * y + e!, y: b! * x + d! * y + f! };
};

describe("pose-specific clothing generation", () => {
  it("rests lifted shoulders above the arm instead of leaving a padded notch", () => {
    for (const heads of [5, 6, 7]) for (const gender of ["girl", "boy"] as const) {
      const rig = characterGeometry(heads, gender, "t-pose").rig;
      for (const item of items.filter(item => item.category === "tops" || item.category === "outer" && item.kind !== "cape")) {
        const knit = ["knit", "cardigan", "hoodie", "tee"].includes(item.kind), trench = item.kind === "trench";
        const sourceY = trench ? 45 : knit ? 57 : 59;
        const pieces = fitCatalogArtwork(rig, item);
        for (const side of [-1, 1] as const) {
          const arm = rig.arms[side === -1 ? "left" : "right"];
          const shoulder = project(pieces, side === -1 ? 75 : 165, sourceY);
          expect(shoulder.y, item.id).toBeLessThan(arm.root.y - 10);
          expect(shoulder.y, item.id).toBeGreaterThan(rig.torso.neckTopY - 1);
        }
      }
    }
  });

  it("lets free sleeve edges hang while the supported top follows the arm", () => {
    const rig = characterGeometry(5, "girl", "t-pose").rig;
    for (const id of ["ribbon-blouse", "short-blouson", "rib-knit", "trench"]) {
      const item = items.find(item => item.id === id)!;
      const trench = item.kind === "trench", knit = item.kind === "knit";
      const sleeve = generatePoseSleeve(rig, item, -1, { shoulder: trench ? 45 : knit ? 57 : 59, chest: trench ? 102 : 111, underX: trench ? 91 : knit ? 92 : 93, underY: trench ? 102 : 111, neck: trench ? 35 : 46 });
      const chest = trench ? 102 : 111, cuff = trench ? 176 : knit ? 211 : 187;
      const sourceInner = trench ? 86 : 87, cuffInner = trench ? 73 : knit ? 79 : 80;
      const a = project(sleeve.pieces, sourceInner, chest), b = project(sleeve.pieces, cuffInner, cuff);
      const middle = project(sleeve.pieces, (sourceInner + cuffInner) / 2, (chest + cuff) / 2);
      expect(middle.y, id).toBeGreaterThan((a.y + b.y) / 2 + 2);
      expect(sleeve.underarm.y, id).toBeLessThan(rig.torso.chestY);
    }
  });

  it("rebuilds the clothing when the gesture changes and keeps the original artwork", async () => {
    const outfit = items.filter(item => ["ribbon-blouse", "short-blouson", "pleated-skirt"].includes(item.id));
    const wrapper = mount(MannequinPreview, { props: { heads: 5, pose: "relax", selected: outfit, palette: [], dressed: true, guides: false, paletteColors: false } });
    const source = wrapper.find('[data-art-source="short-blouson"] image').attributes("href");
    const original = wrapper.find('[data-art-source="short-blouson"]').html();
    await wrapper.setProps({ pose: "t-pose" });
    const generated = wrapper.find('[data-art-source="short-blouson"]');
    expect(generated.attributes("data-pose-generated")).toBe("t-pose");
    expect(generated.html()).not.toBe(original);
    expect(generated.find('image').attributes("href")).toBe(source);
    expect(wrapper.find('image[data-artwork="head"]').attributes("href")).toBe("/avatars/jito-girl-v1.png");
    await wrapper.setProps({ pose: "relax" });
    expect(wrapper.find('[data-art-source="short-blouson"]').html()).toBe(original);
    wrapper.unmount();
  });

  it("also generates pose-specific sleeves for a locally created clothing image", async () => {
    const item = { ...items.find(item => item.id === "ribbon-blouse")!, id: "local-blouse", source: "local-diffusion" as const, imageUrl: "blob:local-clothing" };
    const wrapper = mount(MannequinPreview, { props: { heads: 5, pose: "relax", selected: [item], palette: [], dressed: true, guides: false, paletteColors: false } });
    const relaxed = wrapper.find('[data-art-source="local-blouse"]').html();
    await wrapper.setProps({ pose: "t-pose" });
    expect(wrapper.find('[data-art-source="local-blouse"]').attributes("data-pose-generated")).toBe("t-pose");
    expect(wrapper.find('[data-art-source="local-blouse"]').html()).not.toBe(relaxed);
    expect(wrapper.find('image[data-part="tops"]').attributes("href")).toBe(item.imageUrl);
    wrapper.unmount();
  });
});
