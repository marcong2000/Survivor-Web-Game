import { describe, expect, it } from "vitest";
import type { WeaponId } from "@survivor/shared";
import { rarityWeights, rollUpgrades, statBoostAmount } from "./upgrades.js";

describe("rollUpgrades", () => {
  it("offers a 'new-weapon' option for weapons the player doesn't own", () => {
    const owned = new Map<WeaponId, number>(); // owns nothing
    const opts = rollUpgrades(owned, 0, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("offers 'level-weapon' (not 'new-weapon') for an owned, non-maxed weapon", () => {
    const owned = new Map<WeaponId, number>([["bolt", 3]]);
    const opts = rollUpgrades(owned, 0, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(false);
    expect(opts.some((o) => o.kind === "level-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("never offers to level a maxed weapon", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const opts = rollUpgrades(owned, 0, 10);
    expect(opts.some((o) => o.kind === "level-weapon" && o.weaponId === "bolt")).toBe(false);
  });

  it("returns at most the requested number of choices", () => {
    const owned = new Map<WeaponId, number>();
    expect(rollUpgrades(owned, 0, 3).length).toBeLessThanOrEqual(3);
  });

  it("tags every option with a valid rarity", () => {
    const owned = new Map<WeaponId, number>([["bolt", 1]]);
    const opts = rollUpgrades(owned, 5, 10);
    for (const o of opts) {
      expect(["normal", "rare", "epic", "legendary"]).toContain(o.rarity);
    }
  });

  it("never levels a weapon past its max even at high rarity", () => {
    const owned = new Map<WeaponId, number>([["bolt", 9]]);
    const opts = rollUpgrades(owned, 100, 10);
    for (const o of opts) {
      if (o.kind === "level-weapon" && o.weaponId === "bolt") {
        expect(o.toLevel).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("rarityWeights (luck)", () => {
  it("increases higher-tier weights as luck rises", () => {
    const low = rarityWeights(0);
    const high = rarityWeights(10);
    expect(high.rare).toBeGreaterThan(low.rare);
    expect(high.epic).toBeGreaterThan(low.epic);
    expect(high.legendary).toBeGreaterThan(low.legendary);
    // Normal stays fixed, so its probability share shrinks as luck grows.
    expect(high.normal).toBe(low.normal);
  });
});

describe("statBoostAmount", () => {
  it("gives the base flat bonus for maxHp at normal rarity", () => {
    expect(statBoostAmount("maxHp", "normal", 100)).toBe(20);
  });

  it("scales the bonus up with rarity", () => {
    expect(statBoostAmount("maxHp", "legendary", 100)).toBe(80); // 20 * 4
  });

  it("computes percentage boosts against the current value", () => {
    expect(statBoostAmount("moveSpeed", "normal", 200)).toBeCloseTo(24); // 200 * 0.12
    expect(statBoostAmount("xpGain", "normal", 1)).toBeCloseTo(0.15); // Wisdom: +15%
  });
});
