import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAvatar } from "../composables/useAvatar";
import { defaultAvatar, mannequinTypes, resolveAvatar } from "../data/avatarPresets";

beforeEach(() => setActivePinia(createPinia()));

describe("established character design", () => {
  it("switches the existing girl and boy without changing their design", () => {
    const avatar = useAvatar();
    expect(avatar.config).toEqual(defaultAvatar);
    for (const type of mannequinTypes) {
      avatar.setGender(type.id);
      expect(avatar.config).toEqual(type.config);
      expect(avatar.resolved()).toEqual(type.config);
    }
    avatar.setGender("invalid" as never);
    expect(avatar.config.gender).toBe("boy");
    avatar.reset();
    expect(avatar.config).toEqual(defaultAvatar);
  });

  it("keeps legacy customisation from changing the character's appearance", () => {
    const migrated = resolveAvatar({ gender: "boy", hair: "long", skin: "#EFCBBA", hairColor: "#ff0000", eye: "#123456", pose: "wave" });
    expect(migrated).toEqual(mannequinTypes.find((type) => type.id === "boy")!.config);
    expect(resolveAvatar({ preset: "boy" }).gender).toBe("boy");
    expect(resolveAvatar({ gender: "invalid" } as never)).toEqual(defaultAvatar);
  });
});
