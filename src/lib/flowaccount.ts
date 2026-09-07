import type { ContractContext } from "./contract";
import { formatThaiDate } from "./thai";

export const FLOWACCOUNT_MCP_URL = "https://mcp.flowaccount.com/mcp";
export const FLOWACCOUNT_CLAUDE_GUIDE =
  "https://flowaccount.com/help-center/category/ai-connector-mcp/flowaccount-connector-in-claude";

export type FlowAccountDocType = "quotation" | "billing-note";

export const DOC_TYPE_LABEL: Record<FlowAccountDocType, string> = {
  quotation: "ใบเสนอราคาทั้งสัญญา",
  "billing-note": "ใบวางบิลรายเดือน",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function extractZip(address: string): string {
  const match = address.match(/(\d{5})\s*$/);
  return match ? match[1] : "";
}

function addDaysISO(isoDate: string, days: number): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export type FlowAccountSimpleDocument = {
  contactName: string;
  contactAddress: string;
  contactTaxId: string;
  contactBranch: string;
  contactPerson: string;
  contactEmail: string;
  contactNumber: string;
  contactZipCode: string;
  contactGroup: number;
  publishedOn: string;
  creditType: number;
  creditDays: number;
  dueDate: string;
  salesName: string;
  projectName: string;
  reference: string;
  isVatInclusive: boolean;
  useReceiptDeduction: boolean;
  subTotal: number;
  discountPercentage: number;
  discountAmount: number;
  totalAfterDiscount: number;
  isVat: boolean;
  vatAmount: number;
  grandTotal: number;
  remarks: string;
  internalNotes: string;
  showSignatureOrStamp: boolean;
  documentStructureType: "SimpleDocument";
  items: Array<{
    type: number;
    name: string;
    description: string;
    quantity: number;
    unitName: string;
    pricePerUnit: number;
    total: number;
  }>;
};

export function buildFlowAccountDocument(
  ctx: ContractContext,
  docType: FlowAccountDocType
): FlowAccountSimpleDocument {
  const isQuote = docType === "quotation";
  const quantity = isQuote ? Math.max(ctx.contract_months, 1) : 1;
  const unitName = isQuote ? "เดือน" : "เดือน";
  const pricePerUnit = round2(ctx.monthly_total_raw);
  const subTotal = round2(quantity * pricePerUnit);
  const vatAmount = round2(subTotal * 0.07);
  const publishedOn = ctx.contract_date || ctx.start_date;
  const dueDate = addDaysISO(publishedOn, 30);

  const period = `${formatThaiDate(ctx.start_date) || ctx.start_date} ถึง ${
    formatThaiDate(ctx.end_date) || ctx.end_date
  }`;

  const itemName = "บริการทำความสะอาด";
  const itemDescription = isQuote
    ? `ตามสัญญาเลขที่ ${ctx.contract_no} ระยะเวลา ${ctx.contract_months} เดือน (${period}) พนักงาน ${ctx.staff_count} คน วัน ${ctx.work_days} เวลา ${ctx.work_hours}`
    : `ค่าบริการประจำเดือน ตามสัญญาเลขที่ ${ctx.contract_no} พนักงาน ${ctx.staff_count} คน วัน ${ctx.work_days} เวลา ${ctx.work_hours}`;

  return {
    contactName: ctx.client_name,
    contactAddress: ctx.client_address,
    contactTaxId: ctx.client_tax_id,
    contactBranch: ctx.client_branch || "สำนักงานใหญ่",
    contactPerson: ctx.client_authorized,
    contactEmail: ctx.client_email,
    contactNumber: ctx.client_phone,
    contactZipCode: extractZip(ctx.client_address),
    contactGroup: 1,
    publishedOn,
    creditType: 1,
    creditDays: 30,
    dueDate,
    salesName: "สั่งการ คลีน",
    projectName: ctx.client_name,
    reference: ctx.contract_no,
    isVatInclusive: false,
    useReceiptDeduction: false,
    subTotal,
    discountPercentage: 0,
    discountAmount: 0,
    totalAfterDiscount: subTotal,
    isVat: true,
    vatAmount,
    grandTotal: round2(subTotal + vatAmount),
    remarks: `${ctx.equipment_clause} ราคายังไม่รวมภาษีมูลค่าเพิ่ม ตามสัญญาข้อ 5 วางบิล/ชำระภายในวันที่ 30 ของทุกเดือน`,
    internalNotes: `สร้างจากสัญญาบริการทำความสะอาด ${ctx.contract_no}`,
    showSignatureOrStamp: true,
    documentStructureType: "SimpleDocument",
    items: [
      {
        type: 1,
        name: itemName,
        description: itemDescription,
        quantity,
        unitName,
        pricePerUnit,
        total: subTotal,
      },
    ],
  };
}

export function buildClaudeMcpPrompt(
  ctx: ContractContext,
  docType: FlowAccountDocType
): string {
  const doc = buildFlowAccountDocument(ctx, docType);
  const kind = docType === "quotation" ? "ใบเสนอราคา" : "ใบวางบิล / ใบแจ้งหนี้";
  const item = doc.items[0];

  return [
    `สร้าง${kind} ใหม่ใน FlowAccount ตามข้อมูลนี้ (อย่าแก้ไขหรือลบเอกสารที่มีอยู่)`,
    "",
    "ลูกค้า / ผู้ติดต่อ",
    `- ชื่อ: ${doc.contactName || "(ยังไม่มีชื่อ)"}`,
    `- ที่อยู่: ${doc.contactAddress || "-"}`,
    `- สาขา: ${doc.contactBranch}`,
    `- เลขประจำตัวผู้เสียภาษี: ${doc.contactTaxId || "(ถ้ามีในระบบให้ใช้ของลูกค้านี้)"}`,
    `- ผู้ติดต่อ: ${doc.contactPerson || "-"}`,
    `- อีเมล: ${doc.contactEmail || "-"}`,
    `- โทร: ${doc.contactNumber || "-"}`,
    "",
    "เอกสาร",
    `- ประเภท: ${kind}`,
    `- วันที่เอกสาร: ${doc.publishedOn || "วันนี้"}`,
    `- เครดิต: ${doc.creditDays} วัน (ครบกำหนด ${doc.dueDate || "อีก 30 วัน"})`,
    `- เลขที่อ้างอิง / สัญญา: ${doc.reference || "-"}`,
    `- โปรเจกต์: ${doc.projectName || "-"}`,
    "",
    "รายการ (ราคาต่อหน่วยยังไม่รวม VAT)",
    `- ${item.name} จำนวน ${item.quantity} ${item.unitName} ราคา ${item.pricePerUnit.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท รวม ${item.total.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท`,
    `- รายละเอียดรายการ: ${item.description}`,
    `- คำนวณ VAT 7% แยกต่างหาก รวมทั้งสิ้น ${doc.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} บาท`,
    "",
    "หมายเหตุท้ายเอกสาร",
    doc.remarks,
    "",
    "เมื่อสร้างเสร็จ ให้ตอบกลับด้วยเลขที่เอกสาร สถานะ และลิงก์เปิดใน FlowAccount ถ้ามี",
  ].join("\n");
}

export function flowAccountEndpoint(docType: FlowAccountDocType): string {
  return docType === "quotation" ? "/quotations" : "/billing-notes";
}
