"use client";

const STORAGE_KEY = "sanggan-clean-custom-presets";

export type PresetGroup = "work_days" | "work_hours" | "client_position";

type CustomPresets = Record<PresetGroup, string[]>;

const EMPTY: CustomPresets = {
  work_days: [],
  work_hours: [],
  client_position: [],
};

function readAll(): CustomPresets {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<CustomPresets>;
    return {
      work_days: Array.isArray(parsed.work_days)
        ? parsed.work_days.filter((x) => typeof x === "string" && x.trim())
        : [],
      work_hours: Array.isArray(parsed.work_hours)
        ? parsed.work_hours.filter((x) => typeof x === "string" && x.trim())
        : [],
      client_position: Array.isArray(parsed.client_position)
        ? parsed.client_position.filter((x) => typeof x === "string" && x.trim())
        : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeAll(next: CustomPresets) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota
  }
}

export function listCustomPresets(group: PresetGroup): string[] {
  return readAll()[group];
}

export function addCustomPreset(group: PresetGroup, value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return listCustomPresets(group);
  const all = readAll();
  const existing = all[group];
  if (existing.some((item) => item === trimmed)) return existing;
  const next = { ...all, [group]: [...existing, trimmed] };
  writeAll(next);
  return next[group];
}

export function removeCustomPreset(
  group: PresetGroup,
  value: string
): string[] {
  const all = readAll();
  const nextList = all[group].filter((item) => item !== value);
  writeAll({ ...all, [group]: nextList });
  return nextList;
}

export function mergePresets(
  builtins: readonly string[],
  customs: string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...builtins, ...customs]) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
