import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  deleteContract,
  emptySnapshot,
  parseImport,
  upsertContract,
  type LibrarySnapshot,
} from "@/lib/central-store";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "library.json");

type Listener = (snapshot: LibrarySnapshot) => void;

type Hub = {
  cache: LibrarySnapshot | null;
  listeners: Set<Listener>;
  queue: Promise<void>;
};

const globalHub = globalThis as typeof globalThis & { __skcLibraryHub?: Hub };

function hub(): Hub {
  if (!globalHub.__skcLibraryHub) {
    globalHub.__skcLibraryHub = {
      cache: null,
      listeners: new Set(),
      queue: Promise.resolve(),
    };
  }
  return globalHub.__skcLibraryHub;
}

function readFromDisk(): LibrarySnapshot {
  try {
    const raw = readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as LibrarySnapshot;
    if (!parsed || !Array.isArray(parsed.contracts)) return emptySnapshot();
    return {
      version: 1,
      updatedAt: Number(parsed.updatedAt) || 0,
      contracts: parseImport(parsed.contracts),
    };
  } catch {
    return emptySnapshot();
  }
}

function writeToDisk(snapshot: LibrarySnapshot) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), "utf8");
}

function emit(snapshot: LibrarySnapshot) {
  for (const listener of hub().listeners) listener(snapshot);
}

function withLock<T>(fn: () => T): Promise<T> {
  const state = hub();
  const run = state.queue.then(fn, fn);
  state.queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function readLibrary(): LibrarySnapshot {
  const state = hub();
  if (!state.cache) state.cache = readFromDisk();
  return state.cache;
}

export function subscribeLibrary(listener: Listener): () => void {
  hub().listeners.add(listener);
  return () => hub().listeners.delete(listener);
}

export function replaceLibrary(incoming: unknown): Promise<LibrarySnapshot> {
  return withLock(() => {
    const now = Date.now();
    const next: LibrarySnapshot = {
      version: 1,
      updatedAt: now,
      contracts: parseImport(incoming, now),
    };
    hub().cache = next;
    writeToDisk(next);
    emit(next);
    return next;
  });
}

export function saveContract(patch: unknown): Promise<LibrarySnapshot> {
  return withLock(() => {
    const next = upsertContract(readLibrary(), patch);
    hub().cache = next;
    writeToDisk(next);
    emit(next);
    return next;
  });
}

export function removeContract(id: string): Promise<LibrarySnapshot> {
  return withLock(() => {
    const next = deleteContract(readLibrary(), id);
    hub().cache = next;
    writeToDisk(next);
    emit(next);
    return next;
  });
}
