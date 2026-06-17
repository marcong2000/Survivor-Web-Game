import type { MapDef, MapId } from "@survivor/shared";

/** Maps. MVP ships one; Normal mode gains the full set of four in Phase 4. */
export const MAPS: Record<MapId, MapDef> = {
  meadow: {
    id: "meadow",
    name: "Whispering Meadow",
    theme: "grassland",
    bossSpawnTime: 120,
    baseSpawnRate: 1.5,
  },
};

export const DEFAULT_MAP_ID: MapId = "meadow";
