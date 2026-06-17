import { openDB, type IDBPDatabase } from "idb";
import {
  createDefaultSave,
  migrateSave,
  type SaveData,
} from "@survivor/shared";

const DB_NAME = "survivor-game";
const DB_VERSION = 1;
const STORE = "saves";
const KEY = "player";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

/** Load the local save, creating + persisting a default one if none exists. */
export async function loadSave(): Promise<SaveData> {
  try {
    const db = await getDb();
    const raw = (await db.get(STORE, KEY)) as Partial<SaveData> | undefined;
    if (!raw) {
      const fresh = createDefaultSave();
      await db.put(STORE, fresh, KEY);
      return fresh;
    }
    return migrateSave(raw);
  } catch (err) {
    // IndexedDB can be unavailable (private mode, etc.) — fall back to memory.
    console.warn("Failed to load save; using in-memory default.", err);
    return createDefaultSave();
  }
}

/** Persist the save locally. Stamps `updatedAt` for later last-write-wins sync. */
export async function writeSave(save: SaveData): Promise<void> {
  const stamped = { ...save, updatedAt: Date.now() };
  try {
    const db = await getDb();
    await db.put(STORE, stamped, KEY);
  } catch (err) {
    console.warn("Failed to persist save.", err);
  }
}
