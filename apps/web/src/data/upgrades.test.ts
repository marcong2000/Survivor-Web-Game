import { describe, expect, it } from "vitest";
import type { WeaponId } from "@survivor/shared";
import { rollUpgrades, statBoostDelta } from "./upgrades.js";

describe("rollUpgrades", () => {
  it("offers a 'new-weapon' option for weapons the player doesn't own", () => {
    const owned = new Map<WeaponId, number>(); // owns nothing
    const opts = rollUpgrades(owned, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("offers 'level-weapon' (not 'new-weapon') for an owned, non-maxed weapon", () => {
    const owned = new Map<WeaponId, number>([["bolt", 3]]);
    const opts = rollUpgrades(owned, 10);
    expect(opts.some((o) => o.kind === "new-weapon" && o.weaponId === "bolt")).toBe(false);
    expect(opts.some((o) => o.kind === "level-weapon" && o.weaponId === "bolt")).toBe(true);
  });

  it("never offers to level a maxed weapon", () => {
    const owned = new Map<WeaponId, number>([["bolt", 10]]);
    const opts = rollUpgrades(owned, 10);
    expect(opts.some((o) => o.kind === "level-weapon" && o.weaponId === "bolt")).toBe(false);
  });

  it("returns at most the requested number of choices", () => {
    const owned = new Map<WeaponId, number>();
    expect(rollUpgrades(owned, 3).length).toBeLessThanOrEqual(3);
  });
});

describe("statBoostDelta", () => {
  it("gives a flat bonus for maxHp", () => {
    expect(statBoostDelta("maxHp", 100)).toBe(20);
  });

  it("gives a percentage bonus for moveSpeed", () => {
    expect(statBoostDelta("moveSpeed", 200)).toBeCloseTo(24);
  });
});
