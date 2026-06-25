import type { WeaponId } from "@survivor/shared";
import { WEAPONS } from "./weapons.js";

// ---------------------------------------------------------------------------
// Rarity
// ---------------------------------------------------------------------------

export type Rarity = "normal" | "rare" | "epic" | "legendary";

export const RARITY_ORDER: Rarity[] = ["normal", "rare", "epic", "legendary"];

interface RarityDef {
  label: string;
  color: string;
  /** Multiplier applied to a stat boost's base magnitude. */
  statMultiplier: number;
  /** Levels granted by a weapon upgrade (or starting level for a new weapon). */
  weaponLevels: number;
}

export const RARITY: Record<Rarity, RarityDef> = {
  normal: { label: "Normal", color: "#b8c0b0", statMultiplier: 1, weaponLevels: 1 },
  rare: { label: "Rare", color: "#4aa3ff", statMultiplier: 1.6, weaponLevels: 2 },
  epic: { label: "Epic", color: "#b267e6", statMultiplier: 2.5, weaponLevels: 3 },
  legendary: { label: "Legendary", color: "#ffb347", statMultiplier: 4, weaponLevels: 5 },
};

/**
 * Probability weights per rarity, biased by luck. Normal stays fixed while the
 * higher tiers grow with luck, so more luck = better expected upgrades.
 */
export function rarityWeights(luck: number): Record<Rarity, number> {
  const l = Math.max(0, luck);
  return {
    normal: 100,
    rare: 22 + l * 6,
    epic: 7 + l * 3.5,
    legendary: 1.2 + l * 1.2,
  };
}

/**
 * Roll a rarity, considering only tiers up to `maxTier`. Stat boosts and normal
 * weapon upgrades cap at "epic"; Legendary is reserved for weapon evolutions.
 */
function rollRarity(luck: number, maxTier: Rarity = "epic"): Rarity {
  const weights = rarityWeights(luck);
  const tiers = RARITY_ORDER.slice(0, RARITY_ORDER.indexOf(maxTier) + 1);
  const total = tiers.reduce((sum, r) => sum + weights[r], 0);
  let roll = Math.random() * total;
  for (const r of tiers) {
    roll -= weights[r];
    if (roll < 0) return r;
  }
  return tiers[0];
}

// ---------------------------------------------------------------------------
// Stat boosts
// ---------------------------------------------------------------------------

export type StatBoost = "maxHp" | "moveSpeed" | "pickupRadius" | "attack" | "xpGain";

interface StatBoostDef {
  stat: StatBoost;
  name: string;
  displayLabel: string;
  /** Percentage boosts scale with the player's current value of the stat. */
  isPercent: boolean;
  /** Base magnitude (flat amount, or fraction for percent boosts). */
  base: number;
}

const STAT_BOOSTS: StatBoostDef[] = [
  { stat: "maxHp", name: "Vitality", displayLabel: "Max HP", isPercent: false, base: 20 },
  { stat: "moveSpeed", name: "Swiftness", displayLabel: "Move Speed", isPercent: true, base: 0.12 },
  { stat: "pickupRadius", name: "Magnet", displayLabel: "Pickup Radius", isPercent: false, base: 25 },
  { stat: "attack", name: "Might", displayLabel: "Attack", isPercent: true, base: 0.1 },
  { stat: "xpGain", name: "Wisdom", displayLabel: "XP Gain", isPercent: true, base: 0.15 },
];

/** The actual delta to apply for a stat boost at a given rarity. */
export function statBoostAmount(stat: StatBoost, rarity: Rarity, currentValue: number): number {
  const def = STAT_BOOSTS.find((b) => b.stat === stat);
  if (!def) return 0;
  const mult = RARITY[rarity].statMultiplier;
  return def.isPercent ? currentValue * def.base * mult : def.base * mult;
}

function statDescription(def: StatBoostDef, rarity: Rarity): string {
  const amt = def.base * RARITY[rarity].statMultiplier;
  return def.isPercent
    ? `+${Math.round(amt * 100)}% ${def.displayLabel}`
    : `+${Math.round(amt)} ${def.displayLabel}`;
}

// ---------------------------------------------------------------------------
// Upgrade options
// ---------------------------------------------------------------------------

/**
 * A single offered choice on the level-up screen. Either levels an owned
 * weapon, grants a new weapon, or boosts a player stat — each carrying a rolled
 * rarity that scales its strength.
 */
export type UpgradeOption =
  | { kind: "new-weapon"; id: string; rarity: Rarity; weaponId: WeaponId; name: string; description: string; toLevel: number }
  | { kind: "level-weapon"; id: string; rarity: Rarity; weaponId: WeaponId; name: string; description: string; toLevel: number }
  | { kind: "evolve-weapon"; id: string; rarity: Rarity; weaponId: WeaponId; name: string; description: string }
  | { kind: "stat"; id: string; rarity: Rarity; stat: StatBoost; name: string; description: string };

/** The distinct base choices available, before a rarity is rolled for each. */
type BaseChoice =
  | { kind: "new-weapon"; id: string; weaponId: WeaponId }
  | { kind: "level-weapon"; id: string; weaponId: WeaponId; level: number }
  | { kind: "evolve-weapon"; id: string; weaponId: WeaponId }
  | { kind: "stat"; id: string; def: StatBoostDef };

/** Fisher-Yates shuffle (non-mutating). */
function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildOption(choice: BaseChoice, luck: number): UpgradeOption {
  switch (choice.kind) {
    case "new-weapon": {
      const rarity = rollRarity(luck, "epic");
      const def = WEAPONS[choice.weaponId];
      const toLevel = Math.min(def.maxLevel, RARITY[rarity].weaponLevels);
      return {
        kind: "new-weapon",
        id: choice.id,
        rarity,
        weaponId: choice.weaponId,
        name: `New: ${def.name}`,
        description: toLevel > 1 ? `${def.description} (starts at Lv ${toLevel})` : def.description,
        toLevel,
      };
    }
    case "level-weapon": {
      const rarity = rollRarity(luck, "epic");
      const def = WEAPONS[choice.weaponId];
      const toLevel = Math.min(def.maxLevel, choice.level + RARITY[rarity].weaponLevels);
      return {
        kind: "level-weapon",
        id: choice.id,
        rarity,
        weaponId: choice.weaponId,
        name: `${def.name} → Lv ${toLevel}`,
        description: def.description,
        toLevel,
      };
    }
    case "evolve-weapon": {
      // Evolutions are always Legendary — the only source of that tier.
      const def = WEAPONS[choice.weaponId];
      const evo = def.evolution!;
      return {
        kind: "evolve-weapon",
        id: choice.id,
        rarity: "legendary",
        weaponId: choice.weaponId,
        name: `Evolve: ${evo.name}`,
        description: evo.description,
      };
    }
    case "stat": {
      const rarity = rollRarity(luck, "epic");
      return {
        kind: "stat",
        id: choice.id,
        rarity,
        stat: choice.def.stat,
        name: choice.def.name,
        description: statDescription(choice.def, rarity),
      };
    }
  }
}

/** Chance, per level-up, that an eligible Lv-10 weapon's evolution is offered. */
export const EVOLUTION_OFFER_CHANCE = 0.4;

/**
 * Build the pool of valid base choices for the current run state, pick up to
 * `count` distinct ones at random, and roll a (luck-weighted) rarity for each.
 *
 * A maxed (Lv 10), un-evolved weapon's Legendary evolution is only *offered*
 * with probability `evolutionChance`; otherwise it stays out of the pool that
 * level-up and the slots fill with normal upgrades.
 */
export function rollUpgrades(
  ownedWeapons: ReadonlyMap<WeaponId, number>,
  evolvedWeapons: ReadonlySet<WeaponId> = new Set(),
  luck = 0,
  count = 3,
  evolutionChance = EVOLUTION_OFFER_CHANCE,
): UpgradeOption[] {
  const normalPool: BaseChoice[] = [];
  const evolutionChoices: BaseChoice[] = [];

  for (const def of Object.values(WEAPONS)) {
    const level = ownedWeapons.get(def.id);
    if (level === undefined) {
      normalPool.push({ kind: "new-weapon", id: `new:${def.id}`, weaponId: def.id });
    } else if (level < def.maxLevel) {
      normalPool.push({ kind: "level-weapon", id: `lvl:${def.id}`, weaponId: def.id, level });
    } else if (def.evolution && !evolvedWeapons.has(def.id)) {
      evolutionChoices.push({ kind: "evolve-weapon", id: `evo:${def.id}`, weaponId: def.id });
    }
  }

  for (const def of STAT_BOOSTS) {
    normalPool.push({ kind: "stat", id: `stat:${def.stat}`, def });
  }

  // Each eligible evolution rolls independently against the offer chance.
  const offeredEvos = evolutionChoices.filter(() => Math.random() < evolutionChance).slice(0, count);
  const remaining = Math.max(0, count - offeredEvos.length);
  const offeredNormals = shuffle(normalPool).slice(0, remaining);

  return shuffle([...offeredEvos, ...offeredNormals]).map((choice) => buildOption(choice, luck));
}
