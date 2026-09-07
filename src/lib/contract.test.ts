import assert from "node:assert/strict";
import { buildContractContext, emptyInputs, SAMPLE_INPUTS } from "./contract";
import {
  buildClaudeMcpPrompt,
  buildFlowAccountDocument,
} from "./flowaccount";
import {
  bahtText,
  endDateFromStart,
  formatThaiDate,
  monthsFromRange,
  num2wordsTh,
} from "./thai";

assert.equal(num2wordsTh(0), "ศูนย์");
assert.equal(num2wordsTh(1), "หนึ่ง");
assert.equal(num2wordsTh(10), "สิบ");
assert.equal(num2wordsTh(11), "สิบเอ็ด");
assert.equal(num2wordsTh(21), "ยี่สิบเอ็ด");
assert.equal(num2wordsTh(100), "หนึ่งร้อย");
assert.equal(num2wordsTh(101), "หนึ่งร้อยเอ็ด");
assert.equal(num2wordsTh(1000), "หนึ่งพัน");
assert.equal(bahtText(360000), "สามแสนหกหมื่นบาทถ้วน");

assert.equal(formatThaiDate("2026-09-07"), "7 กันยายน 2569");
assert.equal(endDateFromStart("2026-10-01", 12), "2027-09-30");
assert.equal(monthsFromRange("2026-10-01", "2027-09-30"), 12);

const ctx = buildContractContext(SAMPLE_INPUTS);
assert.equal(ctx.staff_count, 2);
assert.equal(ctx.monthly_total, "30,000.00");
assert.equal(ctx.total_contract_price, "360,000.00");
assert.equal(ctx.total_price_text, "สามแสนหกหมื่นบาทถ้วน");
assert.match(ctx.equipment_clause, /รวมค่าแรงพนักงาน ค่าอุปกรณ์/);

const excluded = buildContractContext(
  emptyInputs({ ...SAMPLE_INPUTS, include_equipment: false })
);
assert.match(excluded.equipment_clause, /ไม่รวมอุปกรณ์/);

const quote = buildFlowAccountDocument(ctx, "quotation");
assert.equal(quote.items[0].quantity, 12);
assert.equal(quote.subTotal, 360000);
assert.equal(quote.vatAmount, 25200);
assert.equal(quote.grandTotal, 385200);
assert.equal(quote.reference, "SC-2569-001");
assert.equal(quote.isVat, true);
assert.equal(quote.isVatInclusive, false);

const bill = buildFlowAccountDocument(ctx, "billing-note");
assert.equal(bill.items[0].quantity, 1);
assert.equal(bill.subTotal, 30000);
assert.equal(bill.vatAmount, 2100);

const prompt = buildClaudeMcpPrompt(ctx, "quotation");
assert.match(prompt, /ใบเสนอราคา/);
assert.match(prompt, /บริษัท ตัวอย่าง พลาซ่า จำกัด/);
assert.match(prompt, /360,000.00/);

console.log("contract helpers ok");
