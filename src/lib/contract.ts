import { bahtText, formatMoney, round2, todayISO, endDateFromStart } from "./thai";

export type ConsumableSizeLine = {
  id: string;
  size: string;
  quantity: string;
};

export type ConsumableSpec = {
  id: string;
  name: string;
  enabled: boolean;
  size: string;
  quantity: string;
  /** Multiple sizes for one item (e.g. trash bags). */
  variants: ConsumableSizeLine[];
};

export type StaffRole = {
  id: string;
  title: string;
  count: string;
  price_per_head: string;
};

export type StaffRoleLine = {
  id: string;
  title: string;
  count: number;
  price_per_head: number;
  price_per_head_text: string;
  monthly: number;
  monthly_text: string;
};

export type ContractInputs = {
  contract_no: string;
  contract_date: string;
  client_name: string;
  client_address: string;
  client_authorized: string;
  client_position: string;
  start_date: string;
  end_date: string;
  contract_months: string;
  include_equipment: boolean;
  consumables: ConsumableSpec[];
  staff_roles: StaffRole[];
  /** @deprecated migrated into staff_roles */
  staff_count?: string;
  work_days: string;
  work_hours: string;
  /** @deprecated migrated into staff_roles */
  price_per_head?: string;
  ot_rate: string;
  holiday_rate: string;
  sow_scope: string;
  sow_equipment: string;
  contractor_authorized: string;
  contractor_position: string;
  witness_client: string;
  witness_contractor: string;
};

export type ContractContext = {
  contract_no: string;
  contract_date: string;
  client_name: string;
  client_address: string;
  client_authorized: string;
  client_position: string;
  start_date: string;
  end_date: string;
  contract_months: number;
  equipment_clause: string;
  consumables: ConsumableSpec[];
  consumable_lines: string[];
  staff_roles: StaffRoleLine[];
  staff_count: number;
  work_days: string;
  work_hours: string;
  price_per_head: string;
  monthly_total: string;
  total_contract_price: string;
  total_price_text: string;
  ot_rate: string;
  holiday_rate: string;
  sow_scope: string;
  sow_equipment: string;
  monthly_total_raw: number;
  total_contract_price_raw: number;
  vat_amount: number;
  total_with_vat: number;
  contractor_authorized: string;
  contractor_position: string;
  witness_client: string;
  witness_contractor: string;
  include_equipment: boolean;
};

export const STORAGE_KEY = "sanggan-clean-contract-draft";
export const CONTRACT_SEQ_KEY = "sanggan-clean-contract-seq";
export const ACTIVE_CONTRACT_ID_KEY = "sanggan-clean-active-contract-id";

export const WORK_DAY_PRESETS = [
  "จันทร์-อาทิตย์",
  "จันทร์-เสาร์",
  "จันทร์-ศุกร์",
] as const;

export const WORK_HOUR_PRESETS = [
  "08.00-17.00 น.",
  "08.00-16.00 น.",
  "07.00-16.00 น.",
  "09.00-18.00 น.",
] as const;

export const POSITION_PRESETS = [
  "กรรมการผู้มีอำนาจ",
  "กรรมการผู้จัดการ",
  "ผู้จัดการ",
  "เจ้าของกิจการ",
] as const;

export const STAFF_ROLE_PRESETS = [
  "พนักงานรักษาความสะอาด",
  "หัวหน้าพนักงาน",
  "พนักงานเป็นกะ",
  "พนักงานรายวัน",
] as const;

export const QUANTITY_PRESETS = [
  "ตามความเหมาะสม",
  "10 ใบ/เดือน",
  "20 ใบ/เดือน",
  "50 ใบ/เดือน",
  "1 แพ็ค/เดือน",
  "2 แพ็ค/เดือน",
  "1 ม้วน/วัน",
  "2 ม้วน/วัน",
] as const;

export const TRASH_BAG_SIZE_PRESETS = [
  "18x20 นิ้ว",
  "24x28 นิ้ว",
  "30x40 นิ้ว",
  "36x45 นิ้ว",
] as const;

export const TOILET_PAPER_SIZE_PRESETS = [
  "ม้วนเล็ก",
  "ม้วนใหญ่",
  "แพ็คมาตรฐาน",
] as const;

function createVariantId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `size_${crypto.randomUUID()}`;
  }
  return `size_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createConsumableVariant(
  partial: Partial<ConsumableSizeLine> = {}
): ConsumableSizeLine {
  return {
    id: partial.id || createVariantId(),
    size: partial.size ?? "",
    quantity: partial.quantity ?? "ตามความเหมาะสม",
  };
}

export function defaultConsumables(): ConsumableSpec[] {
  return [
    {
      id: "trash_bags",
      name: "ถุงขยะ",
      enabled: true,
      size: "",
      quantity: "",
      variants: [
        createConsumableVariant({
          id: "trash_default",
          size: "30x40 นิ้ว",
          quantity: "ตามความเหมาะสม",
        }),
      ],
    },
    {
      id: "toilet_paper",
      name: "กระดาษชำระ",
      enabled: true,
      size: "ม้วนใหญ่",
      quantity: "ตามความเหมาะสม",
      variants: [],
    },
  ];
}

function createConsumableId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `item_${crypto.randomUUID()}`;
  }
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createConsumable(
  partial: Partial<ConsumableSpec> = {}
): ConsumableSpec {
  const variants = Array.isArray(partial.variants)
    ? partial.variants.map((v) => createConsumableVariant(v))
    : [];
  // Trash bags always keep at least one size row.
  if (
    (partial.id === "trash_bags" || partial.name?.includes("ถุงขยะ")) &&
    variants.length === 0
  ) {
    variants.push(
      createConsumableVariant({
        size: partial.size || "30x40 นิ้ว",
        quantity: partial.quantity || "ตามความเหมาะสม",
      })
    );
  }
  return {
    id: partial.id || createConsumableId(),
    name: partial.name?.trim() || "วัสดุสิ้นเปลือง",
    enabled: partial.enabled ?? true,
    size: partial.size ?? "",
    quantity: partial.quantity ?? "ตามความเหมาะสม",
    variants,
  };
}

export function normalizeConsumables(
  items: ConsumableSpec[] | undefined | null
): ConsumableSpec[] {
  if (!Array.isArray(items) || items.length === 0) {
    return defaultConsumables();
  }
  return items.map((item) =>
    createConsumable({
      id: item?.id,
      name: item?.name,
      enabled: item?.enabled ?? true,
      size: item?.size ?? "",
      quantity: item?.quantity ?? "",
      variants: item?.variants,
    })
  );
}

export function formatConsumableLine(item: ConsumableSpec): string {
  const name = item.name.trim() || "วัสดุสิ้นเปลือง";
  if (!item.enabled) {
    return `ไม่รวม${name} (ผู้ว่าจ้างจัดหาเอง)`;
  }
  const variants = item.variants.filter((v) => v.size.trim() || v.quantity.trim());
  if (variants.length > 0) {
    const details = variants
      .map((v) => {
        const parts: string[] = [];
        if (v.size.trim()) parts.push(`ขนาด ${v.size.trim()}`);
        if (v.quantity.trim()) parts.push(`จำนวน ${v.quantity.trim()}`);
        return parts.join(" ");
      })
      .filter(Boolean)
      .join("; ");
    return details
      ? `ผู้รับจ้างจัดหา${name}: ${details}`
      : `ผู้รับจ้างจัดหา${name}`;
  }
  const parts = [`ผู้รับจ้างจัดหา${name}`];
  if (item.size.trim()) parts.push(`ขนาด ${item.size.trim()}`);
  if (item.quantity.trim()) parts.push(`จำนวน ${item.quantity.trim()}`);
  return parts.join(" ");
}

export function buildConsumableLines(items: ConsumableSpec[]): string[] {
  return normalizeConsumables(items).map(formatConsumableLine);
}

function createStaffRoleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `role_${crypto.randomUUID()}`;
  }
  return `role_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStaffRole(partial: Partial<StaffRole> = {}): StaffRole {
  return {
    id: partial.id || createStaffRoleId(),
    title: partial.title?.trim() || "พนักงานรักษาความสะอาด",
    count: partial.count ?? "1",
    price_per_head: partial.price_per_head ?? "",
  };
}

export function defaultStaffRoles(): StaffRole[] {
  return [
    createStaffRole({
      id: "cleaner",
      title: "พนักงานรักษาความสะอาด",
      count: "1",
      price_per_head: "",
    }),
  ];
}

export function normalizeStaffRoles(
  roles: StaffRole[] | undefined | null,
  legacy?: { staff_count?: string; price_per_head?: string }
): StaffRole[] {
  if (Array.isArray(roles) && roles.length > 0) {
    return roles.map((role) =>
      createStaffRole({
        id: role?.id,
        title: role?.title,
        count: role?.count,
        price_per_head: role?.price_per_head,
      })
    );
  }
  if (legacy?.staff_count || legacy?.price_per_head) {
    return [
      createStaffRole({
        id: "cleaner",
        title: "พนักงานรักษาความสะอาด",
        count: legacy.staff_count || "1",
        price_per_head: legacy.price_per_head || "",
      }),
    ];
  }
  return defaultStaffRoles();
}

function parseNumber(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function emptyInputs(partial: Partial<ContractInputs> = {}): ContractInputs {
  const { consumables, staff_roles, staff_count, price_per_head, ...rest } =
    partial;
  const base = {
    contract_no: "",
    contract_date: "",
    client_name: "",
    client_address: "",
    client_authorized: "",
    client_position: "กรรมการผู้มีอำนาจ",
    start_date: "",
    end_date: "",
    contract_months: "12",
    include_equipment: true,
    work_days: "จันทร์-อาทิตย์",
    work_hours: "08.00-17.00 น.",
    ot_rate: "109",
    holiday_rate: "800",
    sow_scope: "",
    sow_equipment: "",
    contractor_authorized: "",
    contractor_position: "ผู้มีอำนาจลงนาม",
    witness_client: "",
    witness_contractor: "",
    ...rest,
    consumables: normalizeConsumables(consumables),
    staff_roles: normalizeStaffRoles(staff_roles, {
      staff_count,
      price_per_head,
    }),
  };
  return {
    ...base,
    contract_no: normalizeContractNo(base.contract_no, base.contract_date),
  };
}

export function buildSampleInputs(contractNo?: string): ContractInputs {
  const today = todayISO();
  const start = today;
  const months = 12;
  return emptyInputs({
    contract_no: contractNo || nextContractNo(),
    contract_date: today,
    client_name: "บริษัท ตัวอย่าง พลาซ่า จำกัด",
    client_address:
      "88 ถนนพระรามที่ 4 แขวงสุริยวงศ์ เขตบางรัก กรุงเทพมหานคร 10500",
    client_authorized: "สมชาย ใจดี",
    client_position: "กรรมการผู้มีอำนาจ",
    start_date: start,
    end_date: endDateFromStart(start, months),
    contract_months: String(months),
    include_equipment: true,
    consumables: defaultConsumables(),
    staff_roles: [
      createStaffRole({
        id: "supervisor",
        title: "หัวหน้าพนักงาน",
        count: "1",
        price_per_head: "18000",
      }),
      createStaffRole({
        id: "cleaner",
        title: "พนักงานรักษาความสะอาด",
        count: "2",
        price_per_head: "15000",
      }),
    ],
    work_days: "จันทร์-อาทิตย์",
    work_hours: "08.00-17.00 น.",
    ot_rate: "109",
    holiday_rate: "800",
    sow_scope:
      "ทำความสะอาดพื้นที่ส่วนกลาง ห้องน้ำ โถงทางเดิน และพื้นที่สำนักงานตามรอบที่ตกลง",
    sow_equipment:
      "ไม้ถูพื้น ไม้กวาด ถังน้ำ น้ำยาทำความสะอาดพื้น น้ำยาถูพื้น ถุงมือ",
    contractor_authorized: "ตัวอย่าง ผู้รับจ้าง",
    contractor_position: "ผู้จัดการ",
  });
}

/** @deprecated use buildSampleInputs() */
export const SAMPLE_INPUTS = buildSampleInputs("SC-2569-09-001");

export const EQUIPMENT_INCLUDED =
  "ค่าจ้างตามสัญญานี้รวมค่าแรงพนักงาน ค่าอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาดต่างๆ และอื่นๆ สำหรับใช้ในการทำความสะอาดแล้ว";

export const EQUIPMENT_EXCLUDED =
  "ค่าจ้างตามสัญญานี้เป็นค่าแรงพนักงาน ไม่รวมอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาด และวัสดุสิ้นเปลืองอื่นๆ";

export function buildContractContext(inputs: ContractInputs): ContractContext {
  const staff_roles = normalizeStaffRoles(inputs.staff_roles, {
    staff_count: inputs.staff_count,
    price_per_head: inputs.price_per_head,
  }).map((role) => {
    const count = Math.max(0, Math.trunc(parseNumber(role.count)));
    const price = round2(parseNumber(role.price_per_head));
    const monthly = round2(count * price);
    return {
      id: role.id,
      title: role.title.trim() || "พนักงานรักษาความสะอาด",
      count,
      price_per_head: price,
      price_per_head_text: formatMoney(price),
      monthly,
      monthly_text: formatMoney(monthly),
    } satisfies StaffRoleLine;
  });

  const staff_count = staff_roles.reduce((sum, role) => sum + role.count, 0);
  const monthly_total_raw = round2(
    staff_roles.reduce((sum, role) => sum + role.monthly, 0)
  );
  const months = Math.max(0, Math.trunc(parseNumber(inputs.contract_months)));
  const total_contract_price_raw = round2(monthly_total_raw * months);
  const vat_amount = round2(total_contract_price_raw * 0.07);
  const total_with_vat = round2(total_contract_price_raw + vat_amount);

  const consumables = normalizeConsumables(inputs.consumables);
  const consumable_lines = buildConsumableLines(consumables);

  const equipment_clause = inputs.include_equipment
    ? EQUIPMENT_INCLUDED
    : EQUIPMENT_EXCLUDED;

  const primaryRate = staff_roles.find((role) => role.price_per_head > 0);

  return {
    contract_no: inputs.contract_no.trim(),
    contract_date: inputs.contract_date,
    client_name: inputs.client_name.trim(),
    client_address: inputs.client_address.trim(),
    client_authorized: inputs.client_authorized.trim(),
    client_position: inputs.client_position.trim() || "กรรมการผู้มีอำนาจ",
    start_date: inputs.start_date,
    end_date: inputs.end_date,
    contract_months: months,
    equipment_clause,
    consumables,
    consumable_lines,
    staff_roles,
    staff_count,
    work_days: inputs.work_days.trim() || "จันทร์-อาทิตย์",
    work_hours: inputs.work_hours.trim() || "08.00-17.00 น.",
    price_per_head: formatMoney(primaryRate?.price_per_head ?? 0),
    monthly_total: formatMoney(monthly_total_raw),
    total_contract_price: formatMoney(total_contract_price_raw),
    total_price_text: bahtText(total_contract_price_raw),
    ot_rate: inputs.ot_rate.trim() || "109",
    holiday_rate: inputs.holiday_rate.trim() || "800",
    sow_scope: inputs.sow_scope.trim(),
    sow_equipment: inputs.sow_equipment.trim(),
    monthly_total_raw,
    total_contract_price_raw,
    vat_amount,
    total_with_vat,
    contractor_authorized: inputs.contractor_authorized.trim(),
    contractor_position:
      inputs.contractor_position.trim() || "ผู้มีอำนาจลงนาม",
    witness_client: inputs.witness_client.trim(),
    witness_contractor: inputs.witness_contractor.trim(),
    include_equipment: inputs.include_equipment,
  };
}

export function missingRequiredFields(inputs: ContractInputs): string[] {
  const missing: string[] = [];
  if (!inputs.contract_no.trim()) missing.push("เลขที่สัญญา");
  if (!inputs.contract_date) missing.push("วันที่สัญญา");
  if (!inputs.client_name.trim()) missing.push("ชื่อผู้ว่าจ้าง");
  if (!inputs.client_address.trim()) missing.push("ที่อยู่ผู้ว่าจ้าง");
  if (!inputs.client_authorized.trim()) missing.push("ผู้มีอำนาจลงนาม");
  if (!inputs.start_date) missing.push("วันเริ่มสัญญา");
  if (!inputs.end_date) missing.push("วันสิ้นสุดสัญญา");
  if (
    inputs.start_date &&
    inputs.end_date &&
    inputs.end_date < inputs.start_date
  ) {
    missing.push("วันสิ้นสุดต้องไม่ก่อนวันเริ่ม");
  }
  const months = parseNumber(inputs.contract_months);
  if (!inputs.contract_months.trim() || months < 1) {
    missing.push("จำนวนเดือน");
  }
  const roles = normalizeStaffRoles(inputs.staff_roles, {
    staff_count: inputs.staff_count,
    price_per_head: inputs.price_per_head,
  });
  if (roles.length === 0) {
    missing.push("ตำแหน่งงาน");
  } else {
    const hasStaff = roles.some((role) => parseNumber(role.count) > 0);
    const hasRate = roles.some((role) => parseNumber(role.price_per_head) > 0);
    const missingTitle = roles.some((role) => !role.title.trim());
    if (!hasStaff) missing.push("จำนวนพนักงาน");
    if (!hasRate) missing.push("ค่าจ้างต่อคน");
    if (missingTitle) missing.push("ชื่อตำแหน่งงาน");
  }
  return missing;
}

type SeqState = { year: number; month: number; seq: number };

function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getFullYear() + 543,
    month: now.getMonth() + 1,
  };
}

function readSeqState(): SeqState {
  const current = currentYearMonth();
  if (typeof window === "undefined") {
    return { ...current, seq: 0 };
  }
  try {
    const raw = window.localStorage.getItem(CONTRACT_SEQ_KEY);
    if (!raw) return { ...current, seq: 0 };
    const parsed = JSON.parse(raw) as {
      year?: number;
      month?: number;
      seq?: number;
    };
    if (
      parsed.year === current.year &&
      parsed.month === current.month &&
      typeof parsed.seq === "number"
    ) {
      return {
        year: current.year,
        month: current.month,
        seq: parsed.seq,
      };
    }
    return { ...current, seq: 0 };
  } catch {
    return { ...current, seq: 0 };
  }
}

function writeSeqState(state: SeqState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONTRACT_SEQ_KEY, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}

function formatContractNo(year: number, month: number, seq: number): string {
  return `SC-${year}-${String(month).padStart(2, "0")}-${String(seq).padStart(3, "0")}`;
}

function monthFromDateISO(dateISO?: string): number {
  if (dateISO) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
    if (match) return Number(match[2]);
  }
  return currentYearMonth().month;
}

function yearFromDateISO(dateISO?: string): number {
  if (dateISO) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
    if (match) return Number(match[1]) + 543;
  }
  return currentYearMonth().year;
}

/** Modern format: SC-2569-09-001 */
export function isModernContractNo(value: string): boolean {
  return /^SC-\d{4}-\d{2}-\d{3}$/.test(value.trim());
}

function syncSeqFromContractNo(value: string) {
  const match = /^SC-(\d{4})-(\d{2})-(\d+)$/.exec(value.trim());
  if (!match) return;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const seq = Number(match[3]);
  const current = currentYearMonth();
  if (year !== current.year || month !== current.month) return;
  const state = readSeqState();
  if (seq > state.seq) {
    writeSeqState({ year, month, seq });
  }
}

/**
 * Upgrade legacy SC-YYYY-NNN → SC-YYYY-MM-NNN using contract/create month.
 * Leaves modern numbers unchanged.
 */
export function normalizeContractNo(
  value: string,
  dateISO?: string
): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isModernContractNo(trimmed)) {
    syncSeqFromContractNo(trimmed);
    return trimmed;
  }
  const legacy = /^SC-(\d{4})-(\d{1,3})$/.exec(trimmed);
  if (legacy) {
    const year = Number(legacy[1]);
    const seq = Number(legacy[2]);
    const month = monthFromDateISO(dateISO);
    const next = formatContractNo(year, month, seq);
    syncSeqFromContractNo(next);
    return next;
  }
  return trimmed;
}

export function nextContractNo(existing?: string): string {
  const state = readSeqState();
  let seq = state.seq;
  const match = existing?.match(/^SC-(\d{4})-(\d{2})-(\d+)$/);
  if (
    match &&
    Number(match[1]) === state.year &&
    Number(match[2]) === state.month
  ) {
    seq = Math.max(seq, Number(match[3]));
  }
  // Old SC-YYYY-NNN (no month) within the same Buddhist year.
  const legacy = existing?.match(/^SC-(\d{4})-(\d+)$/);
  if (legacy && Number(legacy[1]) === state.year && !match) {
    seq = Math.max(seq, Number(legacy[2]));
  }
  seq += 1;
  writeSeqState({ year: state.year, month: state.month, seq });
  return formatContractNo(state.year, state.month, seq);
}

export function peekNextContractNo(dateISO?: string): string {
  const state = readSeqState();
  const year = dateISO ? yearFromDateISO(dateISO) : state.year;
  const month = dateISO ? monthFromDateISO(dateISO) : state.month;
  const seq =
    year === state.year && month === state.month ? state.seq + 1 : 1;
  return formatContractNo(year, month, seq);
}

export function allocateContractNo(dateISO?: string): string {
  const current = currentYearMonth();
  const year = dateISO ? yearFromDateISO(dateISO) : current.year;
  const month = dateISO ? monthFromDateISO(dateISO) : current.month;
  if (year === current.year && month === current.month) {
    return nextContractNo();
  }
  // Different month/year than "now": start/continue from stored if matching, else 1.
  // For simplicity allocate from current month clock when creating fresh numbers.
  return nextContractNo();
}
