export const SHEET_ID =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHEET_ID) ||
  "1Os1IdvKUPhuzBS0o765T3W_vnllgr_x03lfgfta2Tow";

export const SHEET_NAME = "สัญญา";

export const SHEET_HEADERS = [
  "id",
  "contract_no",
  "contract_date",
  "client_name",
  "client_address",
  "client_authorized",
  "client_position",
  "start_date",
  "end_date",
  "contract_months",
  "notes",
  "createdAt",
  "updatedAt",
  "json",
] as const;

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?usp=sharing`;

export const DEFAULT_SHEETS_WEBAPP =
  "https://script.google.com/macros/s/AKfycbwtzgnN-uGm_oURzWCw82eD1ZnrtwN-H2is3zSX9Bwc_ePh3edlVResUEx-q-d/exec";

export const WEBAPP_STORAGE_KEY = "sanggan-clean-sheets-webapp";
export const TOKEN_STORAGE_KEY = "sanggan-clean-sheets-token";

export type SheetContract = {
  id: string;
  inputs: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  notes: string;
};

function coerceTimestamp(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 86_400_000) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber) && asNumber > 86_400_000) return asNumber;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 86_400_000) return parsed;
  }
  return fallback;
}

export function gvizUrl(sheetName?: string): string {
  const tqx = "out:json";
  const base = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=${encodeURIComponent(tqx)}&headers=1`;
  if (!sheetName) return base;
  return `${base}&sheet=${encodeURIComponent(sheetName)}`;
}

export function parseGvizText(text: string): Record<string, string>[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("อ่านชีตไม่สำเร็จ");
  }
  const parsed = JSON.parse(text.slice(start, end + 1)) as {
    status?: string;
    table?: {
      cols?: Array<{ id?: string; label?: string }>;
      rows?: Array<{ c?: Array<{ v?: unknown } | null> }>;
    };
  };
  if (parsed.status && parsed.status !== "ok") {
    throw new Error("ชีตยังไม่เปิดให้อ่าน");
  }
  const cols = (parsed.table?.cols || []).map(
    (col, index) => col.label?.trim() || col.id || `col${index}`
  );
  const records = (parsed.table?.rows || [])
    .map((row) => {
      const object: Record<string, string> = {};
      (row.c || []).forEach((cell, index) => {
        const key = cols[index];
        if (!key) return;
        object[key] = cell == null || cell.v == null ? "" : String(cell.v);
      });
      return object;
    })
    .filter((row) => Object.values(row).some((value) => value.trim() !== ""));

  if (records.length === 0) return records;
  const firstValues = Object.values(records[0] || {});
  const headerLike =
    firstValues.includes("id") &&
    (firstValues.includes("json") || firstValues.includes("contract_no"));
  if (!headerLike) return records;

  const keys = Object.keys(records[0] || {});
  const names = keys.map((key) => records[0]?.[key] || key);
  return records.slice(1).map((row) => {
    const object: Record<string, string> = {};
    keys.forEach((key, index) => {
      object[names[index] || key] = row[key] || "";
    });
    return object;
  });
}

export function rowToContract(row: Record<string, string>): SheetContract | null {
  const now = Date.now();
  const rawJson = row.json?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<SheetContract>;
      if (parsed && typeof parsed === "object") {
        const id =
          (typeof parsed.id === "string" && parsed.id) ||
          row.id ||
          "";
        if (!id) return null;
        const inputs =
          parsed.inputs && typeof parsed.inputs === "object"
            ? parsed.inputs
            : {};
        return {
          id,
          inputs,
          createdAt: coerceTimestamp(parsed.createdAt, coerceTimestamp(row.createdAt, now)),
          updatedAt: coerceTimestamp(parsed.updatedAt, coerceTimestamp(row.updatedAt, now)),
          notes: typeof parsed.notes === "string" ? parsed.notes : row.notes || "",
        };
      }
    } catch {
      // fall through to column mapping
    }
  }
  const id = (row.id || "").trim();
  if (!id || id === "id") return null;
  return {
    id,
    inputs: {
      contract_no: row.contract_no || "",
      contract_date: row.contract_date || "",
      client_name: row.client_name || "",
      client_address: row.client_address || "",
      client_authorized: row.client_authorized || "",
      client_position: row.client_position || "",
      start_date: row.start_date || "",
      end_date: row.end_date || "",
      contract_months: row.contract_months || "",
    },
    createdAt: coerceTimestamp(row.createdAt, now),
    updatedAt: coerceTimestamp(row.updatedAt, now),
    notes: row.notes || "",
  };
}

export function rowsToContracts(
  rows: Record<string, string>[]
): SheetContract[] {
  return rows
    .map(rowToContract)
    .filter((row): row is SheetContract => Boolean(row))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function normalizeSheetsWebAppUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/\/exec$/i.test(trimmed)) return trimmed;
  return `${trimmed}/exec`;
}

export function getSheetsWebAppUrl(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(WEBAPP_STORAGE_KEY)?.trim();
      if (stored) return normalizeSheetsWebAppUrl(stored);
    } catch {
      // ignore
    }
  }
  const fromEnv =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHEETS_WEBAPP) ||
    "";
  if (fromEnv.trim()) return normalizeSheetsWebAppUrl(fromEnv);
  return DEFAULT_SHEETS_WEBAPP;
}

export function setSheetsWebAppUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = normalizeSheetsWebAppUrl(url);
  if (!trimmed) {
    window.localStorage.removeItem(WEBAPP_STORAGE_KEY);
    window.dispatchEvent(new Event("skc-sheets-webapp"));
    return;
  }
  window.localStorage.setItem(WEBAPP_STORAGE_KEY, trimmed);
  window.dispatchEvent(new Event("skc-sheets-webapp"));
}

export function getSheetsWriteToken(): string {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY)?.trim();
      if (stored) return stored;
    } catch {
      // ignore
    }
  }
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHEETS_TOKEN) ||
    ""
  ).trim();
}

export function setSheetsWriteToken(token: string) {
  if (typeof window === "undefined") return;
  const trimmed = token.trim();
  if (!trimmed) {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } else {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, trimmed);
  }
  window.dispatchEvent(new Event("skc-sheets-webapp"));
}

export function hasSheetsWriter(): boolean {
  return Boolean(getSheetsWebAppUrl());
}
