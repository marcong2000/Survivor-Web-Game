import type { CharacterDef, CharacterId } from "@survivor/shared";

/** Playable characters. MVP ships one; more unlock via achievements later. */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  wanderer: {
    id: "wanderer",
    name: "The Wanderer",
    description: "A balanced survivor. Starts with the Magic Bolt.",
    startStats: {
      maxHp: 100,
      attack: 1,
      moveSpeed: 200,
      pickupRadius: 70,
      xpGain: 1,
    },
    startWeaponId: "bolt",
    unlockCondition: null,
  },
};

export const DEFAULT_CHARACTER_ID: CharacterId = "wanderer";
