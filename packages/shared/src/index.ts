/**
 * @survivor/shared
 *
 * Types shared between the game client (`apps/web`) and the Cloudflare Worker
 * (`apps/worker`). The save-data shape lives here so both sides agree on the
 * contract, and so the Worker can validate/persist exactly what the client
 * produces.
 */

export * from "./types.js";
export * from "./save.js";
