import type { WeaponId } from "@survivor/shared";
import { WEAPONS } from "./weapons.js";

/**
 * A single offered choice on the level-up screen. Either levels an owned
 * weapon, grants a new weapon, or boosts a player stat.
 */
export type UpgradeOption =
  | { kind: "new-weapon"; id: string; weaponId: WeaponId; name: string; description: string }
  | { kind: "level-weapon"; id: string; weaponId: WeaponId; name: string; description: string; toLevel: number }
  | { kind: "stat"; id: string; stat: StatBoost; name: string; description: string };

export type StatBoost = "maxHp" | "moveSpeed" | "pickupRadius" | "attack";

interface StatBoostDef {
  stat: StatBoost;
  name: string;
  description: string;
  apply: (amount: number) => number; // returns the additive/multiplicative delta
}

const STAT_BOOSTS: StatBoostDef[] = [
  { stat: "maxHp", name: "Vitality", description: "+20 Max HP", apply: () => 20 },
  { stat: "moveSpeed", name: "Swiftness", description: "+12% Move Speed", apply: (v) => v * 0.12 },
  { stat: "pickupRadius", name: "Magnet", description: "+25 Pickup Radius", apply: () => 25 },
  { stat: "attack", name: "Might", description: "+10% Attack", apply: (v) => v * 0.1 },
];

export function statBoostDelta(stat: StatBoost, currentValue: number): number {
  const def = STAT_BOOSTS.find((b) => b.stat === stat);
  return def ? def.apply(currentValue) : 0;
}

/** Fisher-Yates shuffle (non-mutating). */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build a pool of valid upgrades for the current run state and return up to
 * `count` distinct random choices.
 */
export function rollUpgrades(
  ownedWeapons: ReadonlyMap<WeaponId, number>,
  count = 3,
): UpgradeOption[] {
  const pool: UpgradeOption[] = [];

  for (const def of Object.values(WEAPONS)) {
    const level = ownedWeapons.get(def.id);
    if (level === undefined) {
      pool.push({
        kind: "new-weapon",
        id: `new:${def.id}`,
        weaponId: def.id,
        name: `New: ${def.name}`,
        description: def.description,
      });
    } else if (level < def.maxLevel) {
      pool.push({
        kind: "level-weapon",
        id: `lvl:${def.id}`,
        weaponId: def.id,
        name: `${def.name} → Lv ${level + 1}`,
        description: def.description,
        toLevel: level + 1,
      });
    }
  }

  for (const b of STAT_BOOSTS) {
    pool.push({ kind: "stat", id: `stat:${b.stat}`, stat: b.stat, name: b.name, description: b.description });
  }

  return shuffle(pool).slice(0, count);
}
