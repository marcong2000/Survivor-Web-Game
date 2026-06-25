import { describe, expect, it } from "vitest";
import type { WeaponId } from "@survivor/shared";
import { EVOLUTION_OFFER_CHANCE, rarityWeights, rollUpgrades, statBoostAmount } from "./upgrades.js";

const NONE = new Set<WeaponId>();

describe("rollUpgrades", () => {
  it("offers a 'new-weapon' option for weapons the player doesn't own", () => {
    const owned = new Map<WeaponId, number>(); // owns nothing
    const opts = rollUpgrades(owned, NONE, 0, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("offers 'level-weapon' (not 'new-weapon') for an owned, non-maxed weapon", () => {
    const owned = new Map<WeaponId, number>([["bolt", 3]]);
    const opts = rollUpgrades(owned, NONE, 0, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(false);
    expect(opts.some((o) => o.kind === "level-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("returns at most the requested number of choices", () => {
    const owned = new Map<WeaponId, number>();
    expect(rollUpgrades(owned, NONE, 0, 3).length).toBeLessThanOrEqual(3);
  });

  it("tags every option with a valid rarity", () => {
    const owned = new Map<WeaponId, number>([["bolt", 1]]);
    const opts = rollUpgrades(owned, NONE, 5, 10);
    for (const o of opts) {
      expect(["normal", "rare", "epic", "legendary"]).toContain(o.rarity);
    }
  });

  it("offers a Legendary 'evolve-weapon' option for a maxed, un-evolved weapon when it procs", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const opts = rollUpgrades(owned, NONE, 0, 10, 1); // force the offer
    const evo = opts.find((o) => o.kind === "evolve-weapon" && o.weaponId === "bolt");
    expect(evo).toBeDefined();
    expect(evo?.rarity).toBe("legendary");
  });

  it("does not offer the evolution when the offer chance does not proc", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const opts = rollUpgrades(owned, NONE, 0, 10, 0); // never offer
    expect(opts.some((o) => o.kind === "evolve-weapon")).toBe(false);
  });

  it("offers the evolution at roughly the configured probability", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const trials = 4000;
    const chance = 0.4;
    let offered = 0;
    for (let i = 0; i < trials; i++) {
      if (rollUpgrades(owned, NONE, 0, 3, chance).some((o) => o.kind === "evolve-weapon")) offered++;
    }
    const rate = offered / trials;
    expect(rate).toBeGreaterThan(chance - 0.06);
    expect(rate).toBeLessThan(chance + 0.06);
  });

  it("defaults the evolution offer chance to 40%", () => {
    expect(EVOLUTION_OFFER_CHANCE).toBe(0.4);
  });

  it("does not offer evolution once the weapon is already evolved", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const evolved = new Set<WeaponId>(["bolt"]);
    const opts = rollUpgrades(owned, evolved, 0, 10, 1); // even forced, it's excluded
    expect(opts.some((o) => o.kind === "evolve-weapon" && o.weaponId === "bolt")).toBe(false);
  });

  it("never assigns Legendary to a stat boost or a normal weapon upgrade, even at high luck", () => {
    const owned = new Map<WeaponId, number>([["bolt", 2]]); // sub-max so it can level
    for (let i = 0; i < 300; i++) {
      for (const o of rollUpgrades(owned, NONE, 100, 10)) {
        if (o.kind === "stat" || o.kind === "level-weapon" || o.kind === "new-weapon") {
          expect(o.rarity).not.toBe("legendary");
        }
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
    expect(high.normal).toBe(low.normal); // normal fixed; its share shrinks
  });
});

describe("statBoostAmount", () => {
  it("gives the base flat bonus for maxHp at normal rarity", () => {
    expect(statBoostAmount("maxHp", "normal", 100)).toBe(20);
  });

  it("scales the bonus up with rarity", () => {
    expect(statBoostAmount("maxHp", "epic", 100)).toBe(50); // 20 * 2.5
  });

  it("computes percentage boosts against the current value", () => {
    expect(statBoostAmount("moveSpeed", "normal", 200)).toBeCloseTo(24); // 200 * 0.12
    expect(statBoostAmount("xpGain", "normal", 1)).toBeCloseTo(0.15); // Wisdom: +15%
  });
});
