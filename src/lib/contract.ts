import { bahtText, formatMoney, round2, todayISO, endDateFromStart } from "./thai";

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
  staff_count: string;
  work_days: string;
  work_hours: string;
  price_per_head: string;
  ot_rate: string;
  contractor_authorized: string;
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
  staff_count: number;
  work_days: string;
  work_hours: string;
  price_per_head: string;
  monthly_total: string;
  total_contract_price: string;
  total_price_text: string;
  ot_rate: string;
  monthly_total_raw: number;
  total_contract_price_raw: number;
  vat_amount: number;
  total_with_vat: number;
  contractor_authorized: string;
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

export function emptyInputs(partial: Partial<ContractInputs> = {}): ContractInputs {
  return {
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
    staff_count: "1",
    work_days: "จันทร์-อาทิตย์",
    work_hours: "08.00-17.00 น.",
    price_per_head: "",
    ot_rate: "109",
    contractor_authorized: "",
    witness_client: "",
    witness_contractor: "",
    ...partial,
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
    staff_count: "2",
    work_days: "จันทร์-อาทิตย์",
    work_hours: "08.00-17.00 น.",
    price_per_head: "15000",
    ot_rate: "109",
  });
}

/** @deprecated use buildSampleInputs() */
export const SAMPLE_INPUTS = buildSampleInputs("SC-2569-001");

export const EQUIPMENT_INCLUDED =
  "ค่าจ้างตามสัญญานี้รวมค่าแรงพนักงาน ค่าอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาดต่างๆ และอื่นๆ สำหรับใช้ในการทำความสะอาดแล้ว";

export const EQUIPMENT_EXCLUDED =
  "ค่าจ้างตามสัญญานี้เป็นค่าแรงพนักงาน ไม่รวมอุปกรณ์เครื่องมือเครื่องใช้น้ำยาทำความสะอาด ถุงขยะดำ กระดาษชำระ และวัสดุสิ้นเปลืองอื่นๆ";

function parseNumber(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

export function buildContractContext(inputs: ContractInputs): ContractContext {
  const staff_count = Math.max(0, Math.trunc(parseNumber(inputs.staff_count)));
  const price_per_head = round2(parseNumber(inputs.price_per_head));
  const months = Math.max(0, Math.trunc(parseNumber(inputs.contract_months)));

  const monthly_total_raw = round2(staff_count * price_per_head);
  const total_contract_price_raw = round2(monthly_total_raw * months);
  const vat_amount = round2(total_contract_price_raw * 0.07);
  const total_with_vat = round2(total_contract_price_raw + vat_amount);

  const equipment_clause = inputs.include_equipment
    ? EQUIPMENT_INCLUDED
    : EQUIPMENT_EXCLUDED;

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
    staff_count,
    work_days: inputs.work_days.trim() || "จันทร์-อาทิตย์",
    work_hours: inputs.work_hours.trim() || "08.00-17.00 น.",
    price_per_head: formatMoney(price_per_head),
    monthly_total: formatMoney(monthly_total_raw),
    total_contract_price: formatMoney(total_contract_price_raw),
    total_price_text: bahtText(total_contract_price_raw),
    ot_rate: inputs.ot_rate.trim() || "109",
    monthly_total_raw,
    total_contract_price_raw,
    vat_amount,
    total_with_vat,
    contractor_authorized: inputs.contractor_authorized.trim(),
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
  if (!inputs.staff_count.trim() || parseNumber(inputs.staff_count) <= 0) {
    missing.push("จำนวนพนักงาน");
  }
  if (!inputs.price_per_head.trim() || parseNumber(inputs.price_per_head) <= 0) {
    missing.push("ค่าจ้างต่อคน");
  }
  return missing;
}

function readSeq(year: number): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(CONTRACT_SEQ_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { year?: number; seq?: number };
    if (parsed.year === year && typeof parsed.seq === "number") return parsed.seq;
    return 0;
  } catch {
    return 0;
  }
}

function writeSeq(year: number, seq: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONTRACT_SEQ_KEY,
      JSON.stringify({ year, seq })
    );
  } catch {
    // ignore quota
  }
}

export function nextContractNo(existing?: string): string {
  const year = new Date().getFullYear() + 543;
  let seq = readSeq(year);
  const match = existing?.match(/^SC-(\d{4})-(\d+)$/);
  if (match && Number(match[1]) === year) {
    seq = Math.max(seq, Number(match[2]));
  }
  seq += 1;
  writeSeq(year, seq);
  return `SC-${year}-${String(seq).padStart(3, "0")}`;
}

export function peekNextContractNo(): string {
  const year = new Date().getFullYear() + 543;
  const seq = readSeq(year) + 1;
  return `SC-${year}-${String(seq).padStart(3, "0")}`;
}
