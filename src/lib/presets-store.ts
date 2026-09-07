"use client";

const STORAGE_KEY = "sanggan-clean-custom-presets";

export type PresetGroup =
  | "work_days"
  | "work_hours"
  | "client_position"
  | "contractor_signatory"
  | "trash_bag_size"
  | "toilet_paper_size"
  | "chemical_size"
  | "trash_bag_qty"
  | "toilet_paper_qty"
  | "chemical_qty";

type CustomPresets = Record<PresetGroup, string[]>;

const EMPTY: CustomPresets = {
  work_days: [],
  work_hours: [],
  client_position: [],
  contractor_signatory: [],
  trash_bag_size: [],
  toilet_paper_size: [],
  chemical_size: [],
  trash_bag_qty: [],
  toilet_paper_qty: [],
  chemical_qty: [],
};

function asList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string" && Boolean(x.trim()))
    : [];
}

function readAll(): CustomPresets {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<CustomPresets>;
    return {
      work_days: asList(parsed.work_days),
      work_hours: asList(parsed.work_hours),
      client_position: asList(parsed.client_position),
      contractor_signatory: asList(parsed.contractor_signatory),
      trash_bag_size: asList(parsed.trash_bag_size),
      toilet_paper_size: asList(parsed.toilet_paper_size),
      chemical_size: asList(parsed.chemical_size),
      trash_bag_qty: asList(parsed.trash_bag_qty),
      toilet_paper_qty: asList(parsed.toilet_paper_qty),
      chemical_qty: asList(parsed.chemical_qty),
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
