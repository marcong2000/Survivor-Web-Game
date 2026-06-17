import { describe, expect, it } from "vitest";
import {
  createDefaultSave,
  mergeSaves,
  migrateSave,
  SAVE_VERSION,
} from "@survivor/shared";

describe("createDefaultSave", () => {
  it("starts a guest with one rune point and the default character", () => {
    const save = createDefaultSave(1000);
    expect(save.version).toBe(SAVE_VERSION);
    expect(save.runePointsTotal).toBe(1);
    expect(save.unlockedCharacters).toContain("wanderer");
    expect(save.settings.aimMode).toBe("assisted");
  });
});

describe("migrateSave", () => {
  it("fills missing fields from defaults and bumps version", () => {
    const migrated = migrateSave({ gold: 50, version: 0 });
    expect(migrated.gold).toBe(50);
    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.settings.aimMode).toBe("assisted");
    expect(migrated.runeAllocation.melee).toBe(0);
  });

  it("returns a default save for null input", () => {
    expect(migrateSave(null).gold).toBe(0);
  });
});

describe("mergeSaves", () => {
  it("keeps the more recently updated save (last-write-wins)", () => {
    const older = { ...createDefaultSave(1000), gold: 10 };
    const newer = { ...createDefaultSave(2000), gold: 99 };
    expect(mergeSaves(older, newer).gold).toBe(99);
    expect(mergeSaves(newer, older).gold).toBe(99);
  });
});
