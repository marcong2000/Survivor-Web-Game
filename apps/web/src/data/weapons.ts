import type { WeaponDef, WeaponId, WeaponStats } from "@survivor/shared";

/**
 * Weapon catalogue (data-driven). For the MVP we ship two weapons so the
 * level-up roller has real choices. Evolution (level-10 behavioral change) is
 * scoped to Phase 2 and intentionally omitted here.
 */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bolt: {
    id: "bolt",
    name: "Magic Bolt",
    description: "Fires a fast bolt. Reliable single-target damage.",
    baseStats: { damage: 10, cooldown: 0.6, projectileSpeed: 480, range: 420, count: 1 },
    perLevelStats: { damage: 4, cooldown: -0.03, count: 0 },
    maxLevel: 10,
  },
  spread: {
    id: "spread",
    name: "Scatter Shards",
    description: "Looses a spread of shards. Great for crowds.",
    baseStats: { damage: 6, cooldown: 1.1, projectileSpeed: 360, range: 320, count: 3 },
    perLevelStats: { damage: 2, cooldown: -0.04, count: 0 },
    maxLevel: 10,
  },
};

/** Resolve the effective stats of a weapon at a given level (1-based). */
export function weaponStatsAtLevel(def: WeaponDef, level: number): WeaponStats {
  const steps = Math.max(0, Math.min(level, def.maxLevel) - 1);
  const s = def.perLevelStats;
  return {
    damage: def.baseStats.damage + (s.damage ?? 0) * steps,
    cooldown: Math.max(0.08, def.baseStats.cooldown + (s.cooldown ?? 0) * steps),
    projectileSpeed: def.baseStats.projectileSpeed + (s.projectileSpeed ?? 0) * steps,
    range: def.baseStats.range + (s.range ?? 0) * steps,
    count: def.baseStats.count + (s.count ?? 0) * steps,
  };
}
