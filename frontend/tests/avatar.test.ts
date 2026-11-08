import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAvatar } from "../composables/useAvatar";
import { defaultAvatar, resolveAvatar } from "../data/avatarPresets";
beforeEach(() => setActivePinia(createPinia()));

describe("neutral mannequin state", () => {
  it("switches between the two neutral mannequins and resets", () => {
    const avatar = useAvatar();
    expect(avatar.config).toEqual(defaultAvatar);
    for (const gender of ["boy", "girl"] as const) {
      avatar.setGender(gender);
      expect(avatar.config.gender).toBe(gender);
      expect(avatar.config.skin).toBe("#FFFFFF");
      expect(avatar.config.hairColor).toBe("#E2E4EE");
      expect(avatar.config.eye).toBe("#353140");
      expect(avatar.config.eyeShape).toBe("jito");
      expect(avatar.config.mouthShape).toBe("smile");
      expect(avatar.config.blush).toBe("hatch");
      expect(avatar.config.pose).toBe("relax");
    }
    avatar.setGender("invalid" as never);
    expect(avatar.config.gender).toBe("girl");
    avatar.setGender("boy");
    avatar.reset();
    expect(avatar.config).toEqual(defaultAvatar);
  });
  it("migrates old colourful avatar preferences to the neutral design", () => {
    const migrated = resolveAvatar({ gender: "boy", hair: "long", skin: "#EFCBBA", hairColor: "#ff0000", eye: "#123456", pose: "wave" });
    expect(migrated.gender).toBe("boy");
    expect(migrated.hair).toBe("short");
    expect(migrated.skin).toBe("#FFFFFF");
    expect(migrated.hairColor).toBe("#E2E4EE");
    expect(migrated.pose).toBe("relax");
    expect(resolveAvatar({ preset: "boy" }).gender).toBe("boy");
  });
});
