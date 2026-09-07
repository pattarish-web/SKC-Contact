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

export const WEBAPP_STORAGE_KEY = "sanggan-clean-sheets-webapp";

export type SheetContract = {
  id: string;
  inputs: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  notes: string;
};

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
        return {
          id,
          inputs:
            parsed.inputs && typeof parsed.inputs === "object"
              ? parsed.inputs
              : {},
          createdAt: Number(parsed.createdAt) || Number(row.createdAt) || Date.now(),
          updatedAt: Number(parsed.updatedAt) || Number(row.updatedAt) || Date.now(),
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
    createdAt: Number(row.createdAt) || Date.now(),
    updatedAt: Number(row.updatedAt) || Date.now(),
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

export function getSheetsWebAppUrl(): string {
  const fromEnv =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SHEETS_WEBAPP) ||
    "";
  if (fromEnv.trim()) return fromEnv.trim();
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(WEBAPP_STORAGE_KEY)?.trim() || "";
  } catch {
    return "";
  }
}

export function setSheetsWebAppUrl(url: string) {
  if (typeof window === "undefined") return;
  const trimmed = url.trim();
  if (!trimmed) {
    window.localStorage.removeItem(WEBAPP_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(WEBAPP_STORAGE_KEY, trimmed);
  window.dispatchEvent(new Event("skc-sheets-webapp"));
}

export function hasSheetsWriter(): boolean {
  return Boolean(getSheetsWebAppUrl());
}
