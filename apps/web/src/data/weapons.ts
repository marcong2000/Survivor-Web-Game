import type { WeaponDef, WeaponId, WeaponStats } from "@survivor/shared";

/**
 * Weapon catalogue (data-driven). Phase 2 adds depth: multiple behaviors
 * (straight projectiles, a returning boomerang, a persistent aura), a `pierce`
 * stat, and level-10 evolutions — including a *behavioral* one (the boomerang's
 * ricochet) as the reference for non-stat evolutions.
 */
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bolt: {
    id: "bolt",
    name: "Magic Bolt",
    description: "Fires a fast bolt. Reliable single-target damage.",
    behavior: "projectile",
    baseStats: { damage: 10, cooldown: 0.6, projectileSpeed: 480, range: 420, count: 1, pierce: 1 },
    perLevelStats: { damage: 4, cooldown: -0.03 },
    maxLevel: 10,
    evolution: {
      name: "Bolt Storm",
      description: "Unleashes a storm — fires 3 bolts at once, each hitting twice as hard.",
      mult: { damage: 2, cooldown: 0.7 },
      add: { count: 2 },
    },
  },
  spread: {
    id: "spread",
    name: "Scatter Shards",
    description: "Looses a spread of shards. Great for crowds.",
    behavior: "projectile",
    baseStats: { damage: 6, cooldown: 1.1, projectileSpeed: 360, range: 320, count: 3, pierce: 1 },
    perLevelStats: { damage: 2, cooldown: -0.04 },
    maxLevel: 10,
    evolution: {
      name: "Shard Nova",
      description: "Erupts in a nova — +4 shards, +50% damage, and a much faster cadence.",
      mult: { damage: 1.5, cooldown: 0.6 },
      add: { count: 4 },
    },
  },
  lance: {
    id: "lance",
    name: "Piercing Lance",
    description: "A heavy lance that punches through several enemies in a line.",
    behavior: "projectile",
    baseStats: { damage: 18, cooldown: 1.3, projectileSpeed: 540, range: 560, count: 1, pierce: 3 },
    perLevelStats: { damage: 6, cooldown: -0.05, pierce: 0 },
    maxLevel: 10,
    evolution: {
      name: "Spear of Ruin",
      description: "Impales everything — massive damage and pierces an entire crowd.",
      mult: { damage: 2.2 },
      add: { pierce: 20 },
    },
  },
  boomerang: {
    id: "boomerang",
    name: "Boomerang",
    description: "Flies out, then arcs back to you — hitting enemies both ways.",
    behavior: "boomerang",
    baseStats: { damage: 12, cooldown: 1.4, projectileSpeed: 380, range: 360, count: 1, pierce: 99 },
    perLevelStats: { damage: 4, cooldown: -0.04, range: 12 },
    maxLevel: 10,
    evolution: {
      name: "Ricochet",
      description: "No longer returns — instead bounces between up to 3 nearby enemies.",
      mult: { damage: 1.4 },
      ricochetBounces: 3,
    },
  },
  orbit: {
    id: "orbit",
    name: "Orbiting Wards",
    description: "Wards that perpetually circle you, damaging whatever they touch.",
    behavior: "orbit",
    // count starts at 2 and rises only at levels 3/5/7/9; damage grows each level.
    baseStats: { damage: 9, cooldown: 0.25, projectileSpeed: 2.6, range: 95, count: 2, pierce: 0 },
    perLevelStats: { damage: 3, range: 3 },
    countThresholds: [3, 5, 7, 9],
    maxLevel: 10,
    evolution: {
      name: "Astral Halo",
      description: "A blazing halo — +2 wards, a wider orbit, and nearly double damage.",
      mult: { damage: 1.9, range: 1.3 },
      add: { count: 2 },
    },
  },
  aura: {
    id: "aura",
    name: "Pulse Aura",
    description: "A field of force around you that pulses, damaging nearby enemies.",
    behavior: "aura",
    baseStats: { damage: 5, cooldown: 0.7, projectileSpeed: 0, range: 110, count: 1, pierce: 0 },
    perLevelStats: { damage: 2, range: 10, cooldown: -0.02 },
    maxLevel: 10,
    evolution: {
      name: "Nova Field",
      description: "A roaring field — far larger radius, faster pulses, and double damage.",
      mult: { damage: 2, cooldown: 0.7, range: 1.6 },
    },
  },
};

/** Resolve the effective stats of a weapon at a given level (1-based). */
export function weaponStatsAtLevel(def: WeaponDef, level: number): WeaponStats {
  const clamped = Math.min(level, def.maxLevel);
  const steps = Math.max(0, clamped - 1);
  const s = def.perLevelStats;
  const thresholdCount = def.countThresholds?.filter((t) => clamped >= t).length ?? 0;
  return {
    damage: def.baseStats.damage + (s.damage ?? 0) * steps,
    cooldown: Math.max(0.08, def.baseStats.cooldown + (s.cooldown ?? 0) * steps),
    projectileSpeed: def.baseStats.projectileSpeed + (s.projectileSpeed ?? 0) * steps,
    range: def.baseStats.range + (s.range ?? 0) * steps,
    count: def.baseStats.count + (s.count ?? 0) * steps + thresholdCount,
    pierce: def.baseStats.pierce + (s.pierce ?? 0) * steps,
  };
}

/** Apply a weapon's evolution transform (multiplicative then additive). */
export function applyEvolution(stats: WeaponStats, def: WeaponDef): WeaponStats {
  const evo = def.evolution;
  if (!evo) return stats;
  const mult = evo.mult ?? {};
  const add = evo.add ?? {};
  return {
    damage: stats.damage * (mult.damage ?? 1) + (add.damage ?? 0),
    cooldown: Math.max(0.08, stats.cooldown * (mult.cooldown ?? 1) + (add.cooldown ?? 0)),
    projectileSpeed: stats.projectileSpeed * (mult.projectileSpeed ?? 1) + (add.projectileSpeed ?? 0),
    range: stats.range * (mult.range ?? 1) + (add.range ?? 0),
    count: stats.count * (mult.count ?? 1) + (add.count ?? 0),
    pierce: stats.pierce * (mult.pierce ?? 1) + (add.pierce ?? 0),
  };
}
