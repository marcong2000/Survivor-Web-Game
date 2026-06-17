import { describe, expect, it } from "vitest";
import { applyEvolution, WEAPONS, weaponStatsAtLevel } from "./weapons.js";

describe("weaponStatsAtLevel", () => {
  it("returns base stats at level 1", () => {
    const s = weaponStatsAtLevel(WEAPONS.bolt, 1);
    expect(s.damage).toBe(10);
    expect(s.pierce).toBe(1);
  });

  it("applies per-level deltas", () => {
    const s = weaponStatsAtLevel(WEAPONS.bolt, 3); // +4 damage per level over 1
    expect(s.damage).toBe(18);
    expect(s.cooldown).toBeCloseTo(0.54);
  });

  it("clamps to the weapon's max level", () => {
    const atMax = weaponStatsAtLevel(WEAPONS.bolt, 10);
    const beyond = weaponStatsAtLevel(WEAPONS.bolt, 99);
    expect(beyond.damage).toBe(atMax.damage);
  });
});

describe("applyEvolution", () => {
  it("applies multiplicative then additive transforms", () => {
    const lv10 = weaponStatsAtLevel(WEAPONS.bolt, 10);
    const evolved = applyEvolution(lv10, WEAPONS.bolt); // Bolt Storm: x2 dmg, +2 count
    expect(evolved.damage).toBeCloseTo(lv10.damage * 2);
    expect(evolved.count).toBe(lv10.count + 2);
  });

  it("grants extra pierce on the lance evolution", () => {
    const lv10 = weaponStatsAtLevel(WEAPONS.lance, 10);
    const evolved = applyEvolution(lv10, WEAPONS.lance); // Spear of Ruin: +20 pierce
    expect(evolved.pierce).toBe(lv10.pierce + 20);
  });

  it("returns input unchanged for weapons without an evolution", () => {
    const fake = { ...WEAPONS.bolt, evolution: undefined };
    const lv10 = weaponStatsAtLevel(fake, 10);
    expect(applyEvolution(lv10, fake)).toEqual(lv10);
  });
});

describe("weapon catalogue", () => {
  it("every weapon declares a behavior", () => {
    for (const def of Object.values(WEAPONS)) {
      expect(["projectile", "boomerang", "aura"]).toContain(def.behavior);
    }
  });

  it("the boomerang has a behavioral (ricochet) evolution", () => {
    expect(WEAPONS.boomerang.behavior).toBe("boomerang");
    expect(WEAPONS.boomerang.evolution?.ricochetBounces).toBe(5);
  });
});
