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
  /** @deprecated prefer sow_tools / sow_electrical / sow_shared_materials */
  sow_equipment?: string;
  sow_tools: string;
  sow_electrical: string;
  sow_shared_materials: string;
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
  sow_tools: string;
  sow_electrical: string;
  sow_shared_materials: string;
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

/** @deprecated Prefer material-specific qty presets. */
export const QUANTITY_PRESETS = [
  "ตามความเหมาะสม",
  "10 ใบ/เดือน",
  "20 ใบ/เดือน",
  "50 ใบ/เดือน",
] as const;

/** ถุงขยะ — ใบ / แพ็ค / ม้วนถุง ต่อเดือน */
export const TRASH_BAG_QTY_PRESETS = [
  "ตามความเหมาะสม",
  "10 ใบ/เดือน",
  "20 ใบ/เดือน",
  "50 ใบ/เดือน",
  "100 ใบ/เดือน",
  "1 แพ็ค/เดือน",
  "2 แพ็ค/เดือน",
] as const;

/** กระดาษชำระ — แพ็ค / ม้วน ต่อเดือน */
export const TOILET_PAPER_QTY_PRESETS = [
  "ตามความเหมาะสม",
  "1 แพ็ค/เดือน",
  "2 แพ็ค/เดือน",
  "4 แพ็ค/เดือน",
  "10 ม้วน/เดือน",
  "20 ม้วน/เดือน",
] as const;

/** น้ำยา / วัสดุอื่น — ขวด แกลลอน ลิตร กล่อง */
export const CHEMICAL_QTY_PRESETS = [
  "ตามความเหมาะสม",
  "1 ขวด/เดือน",
  "2 ขวด/เดือน",
  "1 แกลลอน/เดือน",
  "2 แกลลอน/เดือน",
  "1 กล่อง/เดือน",
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

export const CHEMICAL_SIZE_PRESETS = [
  "ขนาดมาตรฐาน",
  "ขวด 1 ลิตร",
  "แกลลอน 5 ลิตร",
] as const;

export type ConsumableKind = "trash_bags" | "toilet_paper" | "chemical";

export function getConsumableKind(
  item: Pick<ConsumableSpec, "id" | "name">
): ConsumableKind {
  const name = item.name.trim();
  if (item.id === "trash_bags" || name.includes("ถุงขยะ")) {
    return "trash_bags";
  }
  if (
    item.id === "toilet_paper" ||
    name.includes("กระดาษ") ||
    name.includes("ทิชชู่") ||
    name.includes("ทิชชู")
  ) {
    return "toilet_paper";
  }
  return "chemical";
}

export function qtyPresetsForKind(kind: ConsumableKind): readonly string[] {
  switch (kind) {
    case "trash_bags":
      return TRASH_BAG_QTY_PRESETS;
    case "toilet_paper":
      return TOILET_PAPER_QTY_PRESETS;
    default:
      return CHEMICAL_QTY_PRESETS;
  }
}

export function sizePresetsForKind(kind: ConsumableKind): readonly string[] {
  switch (kind) {
    case "trash_bags":
      return TRASH_BAG_SIZE_PRESETS;
    case "toilet_paper":
      return TOILET_PAPER_SIZE_PRESETS;
    default:
      return CHEMICAL_SIZE_PRESETS;
  }
}

/** หน่วยที่อนุญาตสำหรับจำนวนของแต่ละชนิดวัสดุ (ใช้กรอง preset เก่าที่ไม่เข้ากัน) */
export function isQtyCompatibleWithKind(
  quantity: string,
  kind: ConsumableKind
): boolean {
  const q = quantity.trim();
  if (!q || q === "ตามความเหมาะสม" || q === "กำหนดเอง") return true;
  if (/^\d+([.,]\d+)?$/.test(q)) return true;

  const allowed =
    kind === "trash_bags"
      ? /(ใบ|แพ็ค|ม้วน)/
      : kind === "toilet_paper"
        ? /(แพ็ค|ม้วน)/
        : /(ขวด|แกลลอน|ลิตร|กล่อง|กระป๋อง)/;

  if (!allowed.test(q)) return false;
  // ไม่ใช้ /วัน กับหัวข้อจำนวนต่อเดือนของวัสดุสิ้นเปลือง
  if (/\/\s*วัน/.test(q) || /ต่อวัน/.test(q)) return false;
  return true;
}

export function defaultQtyUnitForKind(kind: ConsumableKind): string {
  switch (kind) {
    case "trash_bags":
      return "ใบ/เดือน";
    case "toilet_paper":
      return "แพ็ค/เดือน";
    default:
      return "ขวด/เดือน";
  }
}

export function qtyMetaForKind(kind: ConsumableKind): {
  label: string;
  placeholder: string;
  hint: string;
  sizePlaceholder: string;
} {
  switch (kind) {
    case "trash_bags":
      return {
        label: "จำนวน (ต่อเดือน)",
        placeholder: "เช่น 20 ใบ/เดือน",
        hint: "หน่วยของถุงขยะ: ใบ/เดือน หรือ แพ็ค/เดือน",
        sizePlaceholder: "เช่น 30x40 นิ้ว หรือ 40x60 ซม.",
      };
    case "toilet_paper":
      return {
        label: "จำนวน (ต่อเดือน)",
        placeholder: "เช่น 2 แพ็ค/เดือน",
        hint: "หน่วยของกระดาษชำระ: แพ็ค/เดือน หรือ ม้วน/เดือน",
        sizePlaceholder: "เช่น ม้วนใหญ่",
      };
    default:
      return {
        label: "จำนวน (ต่อเดือน)",
        placeholder: "เช่น 2 ขวด/เดือน",
        hint: "หน่วยของน้ำยา/วัสดุ: ขวด แกลลอน ลิตร หรือ กล่อง ต่อเดือน",
        sizePlaceholder: "เช่น ขวด 1 ลิตร",
      };
  }
}

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
  const kind = getConsumableKind(item);
  if (!item.enabled) {
    return `ไม่รวม${name} (ผู้ว่าจ้างจัดหาเอง)`;
  }
  const variants = (item.variants || []).filter(
    (v) => v.size.trim() || v.quantity.trim()
  );
  if (variants.length > 0) {
    const details = variants
      .map((v) => {
        const parts: string[] = [];
        if (v.size.trim()) parts.push(`ขนาด ${v.size.trim()}`);
        if (v.quantity.trim()) {
          parts.push(`จำนวน ${formatQuantityPhrase(v.quantity.trim(), kind)}`);
        }
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
  if (item.quantity.trim()) {
    parts.push(`จำนวน ${formatQuantityPhrase(item.quantity.trim(), kind)}`);
  }
  return parts.join(" ");
}

/** If user typed a bare number, append the unit for that material kind. */
export function formatQuantityPhrase(
  quantity: string,
  kind: ConsumableKind = "chemical"
): string {
  if (/^\d+([.,]\d+)?$/.test(quantity)) {
    return `${quantity} ${defaultQtyUnitForKind(kind)}`;
  }
  return quantity;
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

export const EQUIPMENT_INCLUDED =
  "ค่าจ้างตามสัญญานี้รวมค่าแรงพนักงาน ค่าอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาดต่างๆ และอื่นๆ สำหรับใช้ในการทำความสะอาดแล้ว";

export const EQUIPMENT_EXCLUDED =
  "ค่าจ้างตามสัญญานี้เป็นค่าแรงพนักงาน ไม่รวมอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาด และวัสดุสิ้นเปลืองอื่นๆ";

/** เครื่องมือทั่วไป (ไม่อาศัยไฟฟ้า) — อ้างอิงมาตรฐานสัญญาแม่บ้าน */
export const DEFAULT_SOW_TOOLS = [
  "ไม้กวาดอ่อน / ไม้กวาด กทม. / ไม้กวาดหยากไย่ / ไม้กวาดขนไก่พลาสติก",
  "ที่ตักขยะ ถังน้ำ ขันน้ำ ถังซูเกอร์ ถังม็อบแบบมีที่บีบน้ำ",
  "ไม้ม็อบ + ผ้าม็อบ (ขาว/น้ำเงิน) ไม้ดันฝุ่น + ผ้าดันฝุ่น",
  "ไม้ปาดน้ำ ชุดเช็ดทำความสะอาดกระจก ฟ็อกกี้ (กระบอกฉีด)",
  "แปรงขัดห้องน้ำ ที่ปั๊มห้องน้ำ แปรงซักผ้า แปรงถูกพื้นด้ามยาว เกรียงแซะ",
  "สก๊อตไบร์ท + ฟองน้ำ ผ้าขนหนู / ผ้าไมโครไฟเบอร์ ผ้าเช็ดอเนกประสงค์",
  "ถุงมือยาง ถุงมือผ้า รองเท้าบู๊ท ป้ายเตือนพื้นเปียก",
  "บันไดพับ ฐานล้อเข็นขยะ + ถัง สายยางน้ำ รถเข็นแม่บ้าน (ถ้ามีในพื้นที่)",
].join("\n");

/** เครื่องใช้ไฟฟ้า — แยกหัวข้อชัดเจน */
export const DEFAULT_SOW_ELECTRICAL = [
  "เครื่องดูดฝุ่น",
  "เครื่องดูดน้ำ (กรณีพื้นเปียก / ล้างพื้น)",
  "เครื่องขัดพื้น 175 รอบ (ถ้าลักษณะงานต้องขัดพื้น)",
  "เครื่องขัดพื้นความเร็วสูง / 1,500 รอบ (ถ้าลักษณะงานต้องเงาพื้น)",
  "สายไฟต่อพ่วงมาตรฐาน พร้อมระบบตัดไฟรั่ว",
].join("\n");

/** วัสดุและน้ำยาที่ใช้ร่วมกันในการปฏิบัติงาน */
export const DEFAULT_SOW_SHARED_MATERIALS = [
  "น้ำยาอเนกประสงค์ (เช่น T-Pol) น้ำยาถูพื้นประจำวัน น้ำยาล้างห้องน้ำ / ฆ่าเชื้อดับกลิ่น",
  "น้ำยาเช็ดกระจก น้ำยาเช็ดเฟอร์นิเจอร์ / หนัง น้ำมันดักฝุ่น",
  "น้ำยาเคลือบเงาพื้น / แว็กซ์ และน้ำยาลอกแว็กซ์ (เมื่อมีงานเคลือบพื้น)",
  "แผ่นขัดพื้น (เช่น 3M ขาว / แดง / ดำ ขนาดตามเครื่อง) เมื่อใช้เครื่องขัด",
  "แอลกอฮอล์ทำความสะอาด สำลี / ผ้าเช็ดฆ่าเชื้อ ผงซักฟอก (ซักผ้าม็อบ/ผ้าเช็ด)",
  "หมายเหตุวัสดุสิ้นเปลืองประจำวัน (ถุงขยะ กระดาษชำระ ฯลฯ) ให้ดูข้อวัสดุสิ้นเปลืองในสัญญาและเอกสารแนบท้าย 1",
].join("\n");

export function normalizeSowFields(
  partial: Partial<ContractInputs> | null | undefined
): Pick<
  ContractInputs,
  "sow_scope" | "sow_tools" | "sow_electrical" | "sow_shared_materials"
> & { sow_equipment: string } {
  const legacy = (partial?.sow_equipment || "").trim();
  const tools = (partial?.sow_tools || "").trim() || legacy;
  return {
    sow_scope: (partial?.sow_scope || "").trim(),
    sow_tools: tools,
    sow_electrical: (partial?.sow_electrical || "").trim(),
    sow_shared_materials: (partial?.sow_shared_materials || "").trim(),
    sow_equipment: tools,
  };
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
    sow_tools: "",
    sow_electrical: "",
    sow_shared_materials: "",
    sow_equipment: "",
    contractor_authorized: "",
    contractor_position: "กรรมการผู้มีอำนาจ",
    witness_client: "",
    witness_contractor: "",
    ...rest,
    consumables: normalizeConsumables(consumables),
    staff_roles: normalizeStaffRoles(staff_roles, {
      staff_count,
      price_per_head,
    }),
  };
  const sow = normalizeSowFields(base);
  return {
    ...base,
    ...sow,
    contract_no: normalizeContractNo(base.contract_no, base.contract_date),
  };
}

export function buildSampleInputs(contractNo?: string): ContractInputs {
  const today = todayISO();
  const start = today;
  const months = 12;
  return emptyInputs({
    contract_no: contractNo || peekNextContractNo(),
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
      "ทำความสะอาดพื้นที่ส่วนกลาง ห้องน้ำ โถงทางเดิน และพื้นที่สำนักงานตามรอบที่ตกลง รวมทั้งพื้นที่เตรียมเครื่องดื่ม/ตู้เย็นตามที่ระบุในขอบเขตงาน",
    sow_tools: DEFAULT_SOW_TOOLS,
    sow_electrical: DEFAULT_SOW_ELECTRICAL,
    sow_shared_materials: DEFAULT_SOW_SHARED_MATERIALS,
    contractor_authorized: "ตัวอย่าง ผู้รับจ้าง",
    contractor_position: "ผู้จัดการ",
  });
}

/** @deprecated use buildSampleInputs() */
export const SAMPLE_INPUTS = buildSampleInputs("SC-2569-09-001");

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
  const sow = normalizeSowFields(inputs);

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
    sow_scope: sow.sow_scope,
    sow_equipment: sow.sow_equipment || "",
    sow_tools: sow.sow_tools,
    sow_electrical: sow.sow_electrical,
    sow_shared_materials: sow.sow_shared_materials,
    monthly_total_raw,
    total_contract_price_raw,
    vat_amount,
    total_with_vat,
    contractor_authorized: inputs.contractor_authorized.trim(),
    contractor_position:
      inputs.contractor_position.trim() ||
      inputs.client_position.trim() ||
      "กรรมการผู้มีอำนาจ",
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

export function parseContractSeq(
  value: string
): { year: number; month: number; seq: number } | null {
  const modern = /^SC-(\d{4})-(\d{2})-(\d+)$/.exec(value.trim());
  if (modern) {
    return {
      year: Number(modern[1]),
      month: Number(modern[2]),
      seq: Number(modern[3]),
    };
  }
  const legacy = /^SC-(\d{4})-(\d{1,3})$/.exec(value.trim());
  if (legacy) {
    return {
      year: Number(legacy[1]),
      month: currentYearMonth().month,
      seq: Number(legacy[2]),
    };
  }
  return null;
}

/** Highest sequence among saved contract numbers for a year/month (0 if none). */
export function maxSavedSeq(
  savedNos: readonly string[],
  year: number,
  month: number
): number {
  let max = 0;
  for (const raw of savedNos) {
    const parsed = parseContractSeq(raw);
    if (!parsed) continue;
    if (parsed.year === year && parsed.month === month) {
      max = Math.max(max, parsed.seq);
    }
  }
  return max;
}

/** Align local counter to saved contracts only (ignores burned draft numbers). */
export function reconcileSeqFromSaved(savedNos: readonly string[]): SeqState {
  const current = currentYearMonth();
  const seq = maxSavedSeq(savedNos, current.year, current.month);
  const next = { year: current.year, month: current.month, seq };
  writeSeqState(next);
  return next;
}

export type ContractRenumberPlan = {
  id: string;
  from: string;
  to: string;
};

/**
 * Plan contiguous SC-ปี-เดือน-ลำดับ starting at 001 for each year/month,
 * ordered by createdAt (oldest → 001).
 */
export function planContractRenumber(
  rows: ReadonlyArray<{
    id: string;
    createdAt: number;
    contract_no: string;
    contract_date: string;
  }>
): ContractRenumberPlan[] {
  const sorted = [...rows].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.id.localeCompare(b.id);
  });

  const counters = new Map<string, number>();
  const plan: ContractRenumberPlan[] = [];

  for (const row of sorted) {
    const year = yearFromDateISO(row.contract_date);
    const month = monthFromDateISO(row.contract_date);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const seq = (counters.get(key) ?? 0) + 1;
    counters.set(key, seq);
    const to = formatContractNo(year, month, seq);
    const from = row.contract_no.trim();
    if (from !== to) {
      plan.push({ id: row.id, from, to });
    }
  }

  return plan;
}

/**
 * Upgrade legacy SC-YYYY-NNN → SC-YYYY-MM-NNN using contract/create month.
 * Leaves modern numbers unchanged. Does not advance the sequence counter.
 */
export function normalizeContractNo(
  value: string,
  dateISO?: string
): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (isModernContractNo(trimmed)) return trimmed;
  const legacy = /^SC-(\d{4})-(\d{1,3})$/.exec(trimmed);
  if (legacy) {
    const year = Number(legacy[1]);
    const seq = Number(legacy[2]);
    const month = monthFromDateISO(dateISO);
    return formatContractNo(year, month, seq);
  }
  return trimmed;
}

/**
 * Preview next number from saved contracts only — does not consume a sequence.
 * Pass savedNos from the library so drafts never skip ahead of unrecorded numbers.
 */
export function peekNextContractNo(
  dateISO?: string,
  savedNos: readonly string[] = []
): string {
  const year = dateISO ? yearFromDateISO(dateISO) : currentYearMonth().year;
  const month = dateISO ? monthFromDateISO(dateISO) : currentYearMonth().month;
  const seq = maxSavedSeq(savedNos, year, month) + 1;
  return formatContractNo(year, month, seq);
}

/**
 * Commit the next sequence for a newly saved contract.
 * Call only when persisting — not when opening a draft or previewing.
 */
export function allocateContractNo(
  dateISO?: string,
  savedNos: readonly string[] = []
): string {
  const next = peekNextContractNo(dateISO, savedNos);
  const parsed = parseContractSeq(next);
  if (parsed) {
    writeSeqState({
      year: parsed.year,
      month: parsed.month,
      seq: parsed.seq,
    });
  }
  return next;
}

/** @deprecated use allocateContractNo(dateISO, savedNos) */
export function nextContractNo(existing?: string): string {
  const nos = existing ? [existing] : [];
  return allocateContractNo(undefined, nos);
}
